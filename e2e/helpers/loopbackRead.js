/**
 * Read-only LoopBack checks after UI posting (train/UAT).
 * Set E2E_API_BASE_URL in e2e/.env (defaults to zenthtrain).
 */

const defaultApiBase = "https://zenthtrain.beautecloud.com/lb/api";

function apiBase() {
  const raw = String(process.env.E2E_API_BASE_URL || defaultApiBase).trim();
  return raw.replace(/\/$/, "");
}

async function lbGet(path) {
  const url = `${apiBase()}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`LoopBack GET ${url} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStkMovdocLines(docNo) {
  const filter = encodeURIComponent(JSON.stringify({ where: { docNo } }));
  const data = await lbGet(`StkMovdocDtls?filter=${filter}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchStkMovdocHeader(docNo) {
  const filter = encodeURIComponent(JSON.stringify({ where: { docNo } }));
  const data = await lbGet(`StkMovdocHdrs?filter=${filter}`);
  return Array.isArray(data) && data.length ? data[0] : null;
}

/** GTI created from PR links PR number in docRef1. */
/** Open GRN created from non-HQ PR approval (docRef1 = reqNo, movCode GRN). */
export async function fetchGrnHeaderByPrRef(prNo) {
  const filter = encodeURIComponent(
    JSON.stringify({
      where: {
        and: [{ movCode: "GRN" }, { docRef1: prNo }],
      },
      order: "docNo DESC",
      limit: 5,
    })
  );
  const data = await lbGet(`StkMovdocHdrs?filter=${filter}`);
  if (!Array.isArray(data) || !data.length) return null;
  return (
    data.find((h) =>
      String(h.docRemk1 || "").includes("Created from PR:")
    ) || data[0]
  );
}

export async function fetchGtiHeaderByPrRef(prNo) {
  const byRef = encodeURIComponent(
    JSON.stringify({ where: { docRef1: prNo }, limit: 5 })
  );
  let data = await lbGet(`StkMovdocHdrs?filter=${byRef}`);
  if (Array.isArray(data) && data.length) {
    return data.find((h) => String(h.movCode || "").includes("TFR")) || data[0];
  }
  const byRemk = encodeURIComponent(
    JSON.stringify({
      where: { docRemk1: { like: `%${prNo}%` } },
      limit: 5,
    })
  );
  data = await lbGet(`StkMovdocHdrs?filter=${byRemk}`);
  if (!Array.isArray(data) || !data.length) return null;
  return data.find((h) => String(h.movCode || "").includes("TFR")) || data[0];
}

export async function fetchReqByRef(reqRef) {
  const filter = encodeURIComponent(JSON.stringify({ where: { reqRef }, limit: 3 }));
  const data = await lbGet(`reqs?filter=${filter}`);
  return Array.isArray(data) && data.length ? data[0] : null;
}

function bareItem(code) {
  return String(code || "").replace(/0000$/, "").trim();
}

/** On-hand rows for item+site. Itemonqties stores padded item codes (e.g. 116000070000). */
export async function snapshotOnHand(itemCodes, siteCodes) {
  const out = {};
  for (const site of siteCodes) {
    out[site] = {};
    for (const code of itemCodes) {
      const bare = bareItem(code);
      const filter = encodeURIComponent(
        JSON.stringify({
          where: {
            and: [{ itemcode: { like: `${bare}%` } }, { sitecode: site }],
          },
          limit: 20,
        })
      );
      const rows = await lbGet(`Itemonqties?filter=${filter}`);
      const matching = (Array.isArray(rows) ? rows : []).filter((r) =>
        String(r.itemcode || "").startsWith(bare)
      );
      out[site][bare] = {
        trnBalqty: matching.length ? Number(matching[0].trnBalqty) : null,
        uom: matching[0]?.uom || null,
        ids: matching.map((r) => r.id),
      };
    }
  }
  return out;
}

export async function snapshotBatches(itemCodes, siteCodes) {
  const out = {};
  for (const site of siteCodes) {
    out[site] = {};
    for (const code of itemCodes) {
      const bare = bareItem(code);
      const filter = encodeURIComponent(
        JSON.stringify({
          where: { and: [{ itemCode: bare }, { siteCode: site }] },
          limit: 40,
        })
      );
      const rows = await lbGet(`ItemBatches?filter=${filter}`);
      out[site][bare] = (Array.isArray(rows) ? rows : []).map((r) => ({
        batchNo: r.batchNo || "",
        qty: Number(r.qty || 0),
        expDate: r.expDate || null,
        uom: r.uom || null,
      }));
    }
  }
  return out;
}

/** Parse ordMemo2 "B1:2,B2:1" or "NOBATCH:1" into { batch, qty } pairs. */
export function parseOrdMemo2Pairs(ordMemo2) {
  return String(ordMemo2 || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.lastIndexOf(":");
      if (idx < 0) return null;
      const batch = part.slice(0, idx).trim();
      const qty = Number(part.slice(idx + 1));
      if (!batch || Number.isNaN(qty)) return null;
      return { batch, qty };
    })
    .filter(Boolean);
}

export function summarizeDocLines(lines) {
  return (lines || []).map((l) => ({
    docLineno: l.docLineno,
    itemcode: l.itemcode,
    docQty: l.docQty,
    ordMemo1: l.ordMemo1 || "",
    ordMemo2: l.ordMemo2 || "",
    ordMemo4: l.ordMemo4 || "",
  }));
}

function isFefoOrdMemo1(ordMemo1) {
  const raw = String(ordMemo1 || "fefo").toLowerCase();
  if (raw.startsWith("specific")) return false;
  const type = raw.includes("-") ? raw.split("-")[0] : raw;
  return type !== "specific";
}

/**
 * Assert FEFO lines on a posted document have batch breakdown in ordMemo2.
 * @param {import('@playwright/test').expect} expect
 */
export function expectFefoLinesHaveMemo2(
  lines,
  expect,
  { minFefoLines = 1, itemCodes = null } = {}
) {
  let pool = (lines || []).filter((l) => isFefoOrdMemo1(l.ordMemo1));
  if (itemCodes?.length) {
    const want = new Set(itemCodes.map((c) => String(c).replace(/0000$/, "").trim()));
    pool = pool.filter((l) => {
      const code = String(l.itemcode || "").replace(/0000$/, "").trim();
      return want.has(code);
    });
  }
  const fefoLines = pool;
  expect(
    fefoLines.length,
    `expected at least ${minFefoLines} FEFO line(s), got ${fefoLines.length}`
  ).toBeGreaterThanOrEqual(minFefoLines);

  for (const line of fefoLines) {
    const memo2 = String(line.ordMemo2 || "").trim();
    const hasBatchPair =
      /[^:,]+:-?\d+/.test(memo2) || /NOBATCH:-?\d+/i.test(memo2);
    expect(
      hasBatchPair,
      `docLineno ${line.docLineno} ordMemo2 empty or invalid: "${memo2}"`
    ).toBeTruthy();
    expect(String(line.ordMemo1 || "").toLowerCase()).not.toMatch(/^specific/);
  }
}

export function expectSpecificLinesHaveMemo2(
  lines,
  expect,
  { minSpecificLines = 1, itemCodes = null } = {}
) {
  let pool = (lines || []).filter((l) =>
    String(l.ordMemo1 || "").toLowerCase().startsWith("specific")
  );
  if (itemCodes?.length) {
    const want = new Set(itemCodes.map((c) => bareItem(c)));
    pool = pool.filter((l) => want.has(bareItem(l.itemcode)));
  }
  expect(
    pool.length,
    `expected at least ${minSpecificLines} specific line(s), got ${pool.length}`
  ).toBeGreaterThanOrEqual(minSpecificLines);
  for (const line of pool) {
    const memo2 = String(line.ordMemo2 || "").trim();
    expect(
      /[^:,]+:-?\d+/.test(memo2),
      `specific docLineno ${line.docLineno} ordMemo2: "${memo2}"`
    ).toBeTruthy();
  }
}
