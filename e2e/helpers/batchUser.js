/**
 * Batch / FEFO E2E gates — batch flags come from login user, not only public/config.js.
 */

function isEnabledFlag(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "yes" || v === "true" || v === "y" || v === "1";
}

export async function getUserBatchFlags(page) {
  return page.evaluate(() => {
    try {
      const u = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const norm = (v) => String(v ?? "").trim();
      return {
        batchNo: norm(u.batchNo),
        expiryDate: norm(u.expiryDate),
        autoPost: norm(u.autoPost),
      };
    } catch {
      return { batchNo: "no", expiryDate: "no", autoPost: "no" };
    }
  });
}

export async function requireBatchNoUser(page, test) {
  const flags = await getUserBatchFlags(page);
  if (!isEnabledFlag(flags.batchNo)) {
    test.skip(
      true,
      `E2E user needs batchNo enabled on login (got "${flags.batchNo}"). Use a batch-enabled UAT account.`
    );
  }
  return flags;
}

export function outboundUsesFefo() {
  return String(process.env.E2E_OUTBOUND_BATCH_MODE || "specific")
    .trim()
    .toLowerCase() === "fefo";
}
