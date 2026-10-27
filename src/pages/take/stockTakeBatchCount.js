/** Quantity tolerance used when a stock-take count is compared with on-hand. */
export const STOCK_TAKE_QTY_EPS = 0.01;

export function stockTakeQty(value) {
  const qty = Number(value);
  return Number.isFinite(qty) ? qty : 0;
}

export function stockTakeQtyIsZero(value) {
  return Math.abs(stockTakeQty(value)) <= STOCK_TAKE_QTY_EPS;
}

function expiryDay(expDate) {
  if (expDate == null || expDate === "") return "";
  const raw = String(expDate).trim();
  if (!raw || raw === "null" || raw === "undefined" || raw.startsWith("1900-01-01")) {
    return "";
  }
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

/**
 * A count of 0 on a batch that still has stock must be saved.
 * A batch that already has no stock and was counted as 0 is noise.
 */
export function shouldKeepStockTakeBatch(availableQty, countedQty) {
  return !stockTakeQtyIsZero(availableQty) || !stockTakeQtyIsZero(countedQty);
}

/**
 * Rows to store after the batch dialog is confirmed.
 * Unchecked batches are passed in with countedQty 0.
 */
export function buildConfirmedStockTakeBatches(namedBatches, noBatch) {
  const rows = [];
  for (const batch of namedBatches || []) {
    const availableQty = stockTakeQty(batch.availableQty);
    const countedQty = stockTakeQty(batch.countedQty);
    if (!shouldKeepStockTakeBatch(availableQty, countedQty)) continue;
    rows.push({
      batchNo: batch.batchNo || "",
      availableQty,
      countedQty,
      expDate: batch.expDate || null,
    });
  }
  if (
    noBatch &&
    shouldKeepStockTakeBatch(noBatch.availableQty, noBatch.countedQty)
  ) {
    rows.push({
      batchNo: "",
      availableQty: stockTakeQty(noBatch.availableQty),
      countedQty: stockTakeQty(noBatch.countedQty),
      expDate: null,
    });
  }
  return rows;
}

/**
 * System quantity for a new line. Never smaller than the on-hand figure
 * the user saw, and never smaller than the batches being posted.
 */
export function stockTakeSystemQty(onHandQty, batches) {
  const onHand = stockTakeQty(onHandQty);
  if (!batches?.length) return onHand;
  const fromBatches = batches.reduce(
    (sum, batch) => sum + stockTakeQty(batch.availableQty),
    0
  );
  return Math.max(onHand, fromBatches);
}

export function stockTakeCountedMemo(namedBatches) {
  return (namedBatches || [])
    .map((batch) => `${batch.batchNo}:${stockTakeQty(batch.countedQty)}`)
    .join(",");
}

function findLiveMatch(liveRows, batch, expiryTracking) {
  const wantedNo = batch.batchNo || "";
  const wantedExp = expiryDay(batch.expDate);
  const sameNumber = liveRows.filter(
    (row) => !row.used && (row.batchNo || "") === wantedNo
  );
  if (expiryTracking && wantedExp) {
    const dated = sameNumber.find((row) => expiryDay(row.expDate) === wantedExp);
    if (dated) return dated;
  }
  return sameNumber[0] || null;
}

function memoCoversLiveRow(liveRow, countedNamed, expiryTracking) {
  const sameNumber = (countedNamed || []).filter(
    (batch) => (batch.batchNo || "") === (liveRow.batchNo || "")
  );
  if (sameNumber.length === 0) return false;
  if (!expiryTracking) return true;
  const liveExp = expiryDay(liveRow.expDate);
  if (!liveExp) return true;
  const dated = sameNumber.filter((batch) => expiryDay(batch.expDate));
  if (dated.length === 0) return true;
  return dated.some((batch) => expiryDay(batch.expDate) === liveExp);
}

/**
 * Batch deltas for posting.
 * A named batch that still has stock but is missing from the confirmed count
 * is treated as counted 0. No Batch is one pool, not one row per blank batch.
 */
export function reconcileStockTakePost({
  countedNamed = [],
  noBatchCounted = 0,
  liveBatches = [],
  expiryTracking = false,
} = {}) {
  const namedLive = [];
  let noBatchSystem = 0;
  for (const row of liveBatches || []) {
    const batchNo = row.batchNo || "";
    const qty = stockTakeQty(row.qty ?? row.availableQty);
    if (!batchNo) {
      noBatchSystem += qty;
      continue;
    }
    namedLive.push({
      batchNo,
      qty,
      expDate: row.expDate || null,
      used: false,
    });
  }

  const details = [];
  for (const batch of countedNamed || []) {
    const match = findLiveMatch(namedLive, batch, expiryTracking);
    if (match) match.used = true;
    const systemQty = match ? match.qty : 0;
    const countedQty = stockTakeQty(batch.countedQty);
    const variance = countedQty - systemQty;
    details.push({
      batchNo: batch.batchNo || "",
      expDate: (match && match.expDate) || batch.expDate || null,
      countedQty,
      systemQty,
      variance,
      hasVariance: !stockTakeQtyIsZero(variance),
    });
  }

  for (const row of namedLive) {
    if (row.used || stockTakeQtyIsZero(row.qty)) continue;
    if (memoCoversLiveRow(row, countedNamed, expiryTracking)) continue;
    details.push({
      batchNo: row.batchNo,
      expDate: row.expDate || null,
      countedQty: 0,
      systemQty: row.qty,
      variance: 0 - row.qty,
      hasVariance: true,
    });
  }

  const countedNoBatch = stockTakeQty(noBatchCounted);
  if (!stockTakeQtyIsZero(countedNoBatch) || !stockTakeQtyIsZero(noBatchSystem)) {
    const variance = countedNoBatch - noBatchSystem;
    details.push({
      batchNo: "",
      expDate: null,
      countedQty: countedNoBatch,
      systemQty: noBatchSystem,
      variance,
      hasVariance: !stockTakeQtyIsZero(variance),
    });
  }

  return details;
}
