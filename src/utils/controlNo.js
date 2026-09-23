import apiService from "@/services/apiService";

/**
 * Claim-then-use allocation for document running numbers.
 *
 * THE BUG THIS FIXES
 * ------------------
 * Every screen used to read the counter, create the document, and only then ask
 * the server to advance the counter:
 *
 *     getDocNo()              -> read counter N            (for display)
 *     postStockHdr("create")  -> INSERT document with N
 *     addNewControlNumber()   -> write N+1
 *
 * Two things made that unsafe:
 *
 * 1. The write happened AFTER the document existed, so a failure left a posted
 *    document whose number was never claimed - the next document then reused it.
 * 2. The write was never verified. The legacy endpoint answers HTTP 200 even
 *    when it matches no row:
 *
 *        POST ControlNos/updatecontrol {controldescription, sitecode, controlnumber}
 *        -> 200 {"result":{"count":0}}    <-- nothing was updated
 *        -> 200 {"result":{"count":1}}    <-- one row updated
 *
 *    The old guard was `if (!response) throw`, and {result:{count:0}} is truthy,
 *    so a total failure was indistinguishable from success. (Confirmed against
 *    the live API: a non-matching description returns 200 with count 0.)
 *
 * THE FIX
 * -------
 * Claim BEFORE creating the document, and verify that the claim won:
 *
 *     claimControlNumber()    -> compare-and-swap N -> N+1, verified
 *     postStockHdr("create")  -> INSERT document with the claimed N
 *
 * The compare-and-swap uses LoopBack's generic updateAll, whose filter is
 * honoured (verified live; a caller without a filter is rejected outright):
 *
 *     POST ControlNos/update?[where][controlId]=359&[where][controlNo]=110011
 *     body {"controlNo":"110012"}
 *     -> {"count":1}   you won, you own 110011
 *     -> {"count":0}   someone else took it - re-read and retry
 *
 * If the claim fails, the caller aborts before writing anything, so a duplicate
 * document number cannot be produced. A failed insert afterwards burns a number
 * (a harmless gap) - which is always preferable to two documents sharing one.
 *
 * NOTE: this still cannot replace a UNIQUE constraint on the document-number
 * column in the database; that is the final backstop.
 */

const TAG = "[controlNo]";
const log = (...args) => console.log(TAG, ...args);
const warn = (...args) => console.warn(TAG, ...args);

/** Join prefix + site + running number into a document number. */
export const buildDocNo = (prefix, siteCode, controlNo) =>
  `${prefix ?? ""}${siteCode ?? ""}${controlNo ?? ""}`;

/** Increment a running number preserving its width: "0012" -> "0013". */
export const incrementControlNo = (current) => {
  const digits = String(current ?? "").trim().replace(/\D/g, "");
  if (!digits) return "1";
  return String(Number(digits) + 1).padStart(digits.length, "0");
};

const readControlRow = async (controlDescription, siteCode) => {
  const filter = { where: { and: [{ controlDescription }, { siteCode }] } };
  const rows = await apiService.get(
    `ControlNos?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );
  return Array.isArray(rows) ? rows : [];
};

// LoopBack generic updateAll, used as a compare-and-swap. Returns the number of
// rows matched, or null when the endpoint does not report a count.
const casIncrement = async (row, controlDescription, siteCode, current, next) => {
  const where =
    row.controlId !== undefined && row.controlId !== null
      ? `[where][controlId]=${encodeURIComponent(row.controlId)}` +
        `&[where][controlNo]=${encodeURIComponent(current)}`
      : `[where][controlDescription]=${encodeURIComponent(controlDescription)}` +
        `&[where][siteCode]=${encodeURIComponent(siteCode)}` +
        `&[where][controlNo]=${encodeURIComponent(current)}`;

  const res = await apiService.post(`ControlNos/update?${where}`, {
    controlNo: next,
  });
  const count = typeof res?.count === "number" ? res.count : null;
  log(`CAS ${controlDescription}/${siteCode}: ${current} -> ${next}`, res);
  return count;
};

// Legacy endpoint. Its count means "rows matched", which is 1 whenever the row
// exists - it is NOT a compare-and-swap, so a lost race is not detectable here.
// It is kept only as a fallback and is always verified by reading back.
const legacyIncrement = async (controlDescription, siteCode, next) => {
  const res = await apiService.post("ControlNos/updatecontrol", {
    controldescription: controlDescription,
    sitecode: siteCode,
    controlnumber: next,
  });
  log(`updatecontrol ${controlDescription}/${siteCode} -> ${next}`, res);
  const count = res?.result?.count;
  return typeof count === "number" ? count : null;
};

let casUnavailable = false;

/**
 * Claim the next running number for a document type.
 *
 * Returns the number the caller may use: the counter is left at N+1 so the next
 * document gets a different one. Throws if no number could be claimed - callers
 * must let it throw, BEFORE creating the document.
 *
 * @param {object} options
 * @param {string} options.controlDescription e.g. "Goods Receive Note"
 * @param {string} options.siteCode           userDetails.siteCode
 * @param {number} [options.maxAttempts=4]
 */
export const claimControlNumber = async ({
  controlDescription,
  siteCode,
  maxAttempts = 4,
}) => {
  if (!controlDescription) {
    throw new Error("claimControlNumber: controlDescription is required");
  }
  if (!siteCode) {
    throw new Error(
      "claimControlNumber: siteCode is missing (is userDetails loaded?)"
    );
  }

  let lastReason = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rows = await readControlRow(controlDescription, siteCode);

    if (rows.length === 0) {
      throw new Error(
        `No ControlNos row for "${controlDescription}" at site ${siteCode}`
      );
    }

    // Duplicated control rows exist in the field - Mirage MA02 has two rows for
    // every document type. Posting must NOT be blocked by that, so pick the
    // lowest controlId deterministically and always claim that same row.
    // (The old blind `updatecontrol` wrote to every matching row, so a sibling
    // row may drift out of step; it is simply no longer used here.)
    let row = rows[0];
    if (rows.length > 1) {
      row = [...rows].sort(
        (a, b) => Number(a.controlId ?? 0) - Number(b.controlId ?? 0)
      )[0];
      warn(
        `${rows.length} ControlNos rows for "${controlDescription}" at site ${siteCode}; ` +
          `claiming controlId ${row.controlId}. Duplicate rows should be cleaned up.`
      );
    }
    const current = String(row.controlNo ?? "").trim();
    const next = incrementControlNo(current);
    const docNo = buildDocNo(row.controlPrefix, row.siteCode, current);

    log(
      `attempt ${attempt}/${maxAttempts}: ${controlDescription}/${siteCode} ` +
        `counter=${current} -> ${next}, docNo=${docNo}`
    );

    let count = null;
    let strategy = "conditional-update";

    if (!casUnavailable) {
      try {
        count = await casIncrement(row, controlDescription, siteCode, current, next);
      } catch (err) {
        casUnavailable = true;
        warn(
          `conditional update unavailable (${err?.message}) - ` +
            `falling back to ControlNos/updatecontrol`
        );
      }
    }

    if (casUnavailable) {
      strategy = "updatecontrol";
      count = await legacyIncrement(controlDescription, siteCode, next);

      // "1" only means the row exists, so confirm the value actually moved.
      if (count === 1) {
        const verify = await readControlRow(controlDescription, siteCode);
        const after = String(verify?.[0]?.controlNo ?? "").trim();
        if (after !== next) {
          warn(
            `updatecontrol reported success but counter is "${after}", expected "${next}"`
          );
          count = null;
        }
      }
    }

    if (count === 1) {
      log(`CLAIMED ${docNo} via ${strategy} (counter is now ${next})`);
      return {
        docNo,
        controlPrefix: row.controlPrefix,
        controlNo: current,
        nextControlNo: next,
        attempts: attempt,
        strategy,
      };
    }

    if (count === 0) {
      lastReason = `${current} was taken by someone else`;
      warn(`${lastReason} - re-reading and retrying`);
      continue;
    }

    lastReason = `unexpected counter API response (count=${count})`;
    warn(lastReason);
  }

  throw new Error(
    `Could not reserve a "${controlDescription}" number after ${maxAttempts} attempts (${lastReason})`
  );
};

export default claimControlNumber;
