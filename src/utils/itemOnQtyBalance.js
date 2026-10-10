import { roundMoney } from "@/utils/uomDecimalQty";

/**
 * ITEMONQTY (SQL view dbo.ITEMONQTY): one row per ITEM_BATCH.id joined to the latest
 * Stktrn running balance for item + site + UOM. trnBalqty / trnBalcst are site totals
 * (repeated on every row); batchCost is that batch row's unit cost only.
 * API rows are typically ordered by id, so resp[0].batchCost is often the lowest-id
 * batch (frequently no-batch / 0). Do not use for destination ItemBatches create
 * (use resolveDestinationBatchUnitCost). Stktrns enrich: line itemBatchCost first, else resp[0].batchCost (same as GRN).
 */

/** Per-unit batch / item cost for Stktrns.itemBatchCost and ItemBatches.batchCost (2 dp). */
export function roundBatchUnitCost(value) {
  return roundMoney(value);
}

/**
 * Apply site running balance from any matching Itemonqties row (all rows share trnBal*).
 * @param {object} stktrnLine - Stktrn payload being built
 * @param {object} onHandRow - single row from Itemonqties GET
 */
export function applyRunningBalanceFromItemOnQty(stktrnLine, onHandRow) {
  if (!onHandRow || !stktrnLine) return;
  stktrnLine.trnBalqty = (
    Number(stktrnLine.trnBalqty) + Number(onHandRow.trnBalqty ?? 0)
  ).toString();
  stktrnLine.trnBalcst = (
    Number(stktrnLine.trnBalcst) + Number(onHandRow.trnBalcst ?? 0)
  ).toString();
}

/**
 * Stktrns enrich Item_Batch_Cost — same rule as GRN/SUM post:
 * document line cost first, then Itemonqties[0].batchCost if line is empty/zero.
 * @param {object} stktrnLine - should already have itemBatchCost from line itemprice when built
 * @param {object} onHandRow - typically resp[0] from Itemonqties GET
 */
export function applyItemBatchCostFromItemOnQty(stktrnLine, onHandRow) {
  if (!onHandRow || !stktrnLine) return;
  const lineOrView =
    stktrnLine.itemBatchCost || onHandRow.batchCost || 0;
  stktrnLine.itemBatchCost = String(roundBatchUnitCost(lineOrView));
  // Old (always view): stktrnLine.itemBatchCost = String(roundBatchUnitCost(onHandRow.batchCost ?? 0));
}

/**
 * Unit cost for POST ItemBatches on destination: source batch meta / transfer hint, not doc line price.
 * @param {object} stktrnItem
 * @param {{ batchCost?: number }} [batchMeta] - fefoBatches[] or batchDetails line
 */
export function resolveDestinationBatchUnitCost(stktrnItem, batchMeta = null) {
  if (batchMeta != null && batchMeta.batchCost != null && batchMeta.batchCost !== "") {
    return roundBatchUnitCost(batchMeta.batchCost);
  }
  const fromTransfer = Number(stktrnItem?.transferBatchUnitCost);
  if (Number.isFinite(fromTransfer)) return roundBatchUnitCost(fromTransfer);
  const fromLine = Number(stktrnItem?.itemBatchCost);
  if (Number.isFinite(fromLine)) return roundBatchUnitCost(fromLine);
  return 0;
}

/** Stktrn Item_Batch: named batches plus "No Batch" when noBatchTransferQty > 0. */
export function buildStktrnItemBatchLabel(transferItem) {
  const labels = [];
  if (transferItem?.batchDetails?.individualBatches?.length) {
    for (const b of transferItem.batchDetails.individualBatches) {
      if (Number(b.quantity) > 0) {
        labels.push(b.batchNo?.trim() ? b.batchNo.trim() : "No Batch");
      }
    }
    const noBatchQty = Number(transferItem.batchDetails.noBatchTransferQty) || 0;
    if (noBatchQty > 0 && !labels.includes("No Batch")) {
      labels.push("No Batch");
    }
  } else if (transferItem?.fefoBatches?.length) {
    for (const b of transferItem.fefoBatches) {
      if (Number(b.quantity) > 0) {
        labels.push(b.batchNo?.trim() ? b.batchNo.trim() : "No Batch");
      }
    }
  }
  if (!labels.length && transferItem?.docBatchNo) return transferItem.docBatchNo;
  return labels.length ? labels.join(",") : null;
}

/** Per-unit inventory cost for Stktrns (qty-weighted source batch costs, not document line price). */
export function weightedInventoryUnitCostFromTransferItem(transferItem) {
  const noBatchUnit =
    Number(transferItem?.sourceNoBatchUnitCost) ||
    Number(transferItem?.hqNoBatchUnitCost) ||
    0;
  const segments = [];
  if (transferItem?.batchDetails?.individualBatches?.length) {
    for (const b of transferItem.batchDetails.individualBatches) {
      const q = Number(b.quantity) || 0;
      if (q > 0) segments.push({ qty: q, cost: Number(b.batchCost) || 0 });
    }
    const nb = Number(transferItem.batchDetails.noBatchTransferQty) || 0;
    if (nb > 0) segments.push({ qty: nb, cost: noBatchUnit });
  } else if (transferItem?.fefoBatches?.length) {
    for (const b of transferItem.fefoBatches) {
      const q = Number(b.quantity) || 0;
      if (q > 0) segments.push({ qty: q, cost: Number(b.batchCost) || 0 });
    }
  }
  let totalQty = 0;
  let weightedSum = 0;
  for (const s of segments) {
    totalQty += s.qty;
    weightedSum += s.qty * s.cost;
  }
  if (totalQty <= 0) return 0;
  return roundBatchUnitCost(weightedSum / totalQty);
}
