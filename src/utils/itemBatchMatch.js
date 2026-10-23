function expiryDay(expDate) {
  if (expDate == null || expDate === "") return "";
  const raw = String(expDate).trim();
  if (!raw || raw === "null" || raw === "undefined" || raw.startsWith("1900-01-01")) {
    return "";
  }
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

/** One batch number has one expiry. Prefer the row whose date matches; otherwise the existing row. */
export function pickItemBatch(rows, { batchNo, expDate } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const wanted = (batchNo || "").trim();
  const sameNumber = list.filter((row) => (row.batchNo || "").trim() === wanted);
  if (sameNumber.length === 0) return null;
  const preferred = expiryDay(expDate);
  if (preferred) {
    const match = sameNumber.find((row) => expiryDay(row.expDate) === preferred);
    if (match) return match;
  }
  return sameNumber[0];
}

export function storedExpiryDay(row) {
  return expiryDay(row?.expDate);
}
