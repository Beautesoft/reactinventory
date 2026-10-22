/** Marker stored on StkMovdocDtls.ordMemo1 for a selected row with no count yet. */
export const STOCK_TAKE_PENDING = "pending";

/** Session key so a reload of /stock-take/add can reopen the document just created. */
export const STOCK_TAKE_RESUME_KEY = "stockTakeResumeDocNo";

export function isBlankCountedQty(qty) {
  return qty === "" || qty == null;
}

export function isPendingSavedLine(line) {
  return line?.ordMemo1 === STOCK_TAKE_PENDING;
}

/** Value for QtyInput. A real 0 stays visible. A blank count stays blank. */
export function displayCountedQty(qty) {
  if (isBlankCountedQty(qty)) return "";
  return String(qty);
}

/**
 * Quantity to show for a saved detail line.
 * Pending lines are stored as docQty 0 and must come back empty.
 */
export function countedQtyFromSavedLine(line) {
  if (!line || isPendingSavedLine(line)) return "";
  const qty = Number(line.docQty);
  return Number.isFinite(qty) ? qty : "";
}

/** Detail fields for a selected item the user has not counted yet. */
export function buildPendingDetailFields(item, existingItem) {
  const preservedSystemQty =
    existingItem &&
    existingItem.docTtlqty !== undefined &&
    existingItem.docTtlqty !== null
      ? Number(existingItem.docTtlqty)
      : Number(item?.onHandQty || item?.quantity || 0);

  return {
    docId: item?.docId || existingItem?.docId || null,
    docQty: 0,
    docAmt: 0,
    docTtlqty: preservedSystemQty,
    docBatchNo: "",
    docExpdate: "",
    ordMemo1: STOCK_TAKE_PENDING,
    ordMemo2: "",
    ordMemo3: "0",
    ordMemo4: "",
  };
}

/**
 * Sheet row for a saved line that is no longer in the live stock list.
 * Keeps the item on the count sheet after a reload.
 */
function batchBreakdownFromLine(line) {
  if (!line || isPendingSavedLine(line)) return null;
  if (line.batchState?.batchDetails?.length) {
    return line.batchState.batchDetails.map((batch) => ({
      batchNo: batch.batchNo || "",
      availableQty: batch.availableQty || 0,
      countedQty: batch.countedQty || 0,
      expDate: batch.expDate || null,
    }));
  }
  if (line.ordMemo1 === "specific" && line.ordMemo2) {
    const batches = line.ordMemo2
      .split(",")
      .filter(Boolean)
      .map((part) => {
        const splitAt = part.lastIndexOf(":");
        const batchNo = splitAt >= 0 ? part.slice(0, splitAt) : part;
        const countedQty = splitAt >= 0 ? Number(part.slice(splitAt + 1)) || 0 : 0;
        return {
          batchNo,
          availableQty: Number(line.docTtlqty) || 0,
          countedQty,
          expDate: null,
        };
      });
    const noBatchQty = Number(line.ordMemo3) || 0;
    if (noBatchQty > 0) {
      batches.push({
        batchNo: "",
        availableQty: Number(line.docTtlqty) || 0,
        countedQty: noBatchQty,
        expDate: null,
      });
    }
    return batches;
  }
  const noBatchQty = Number(line.ordMemo3) || 0;
  if (noBatchQty > 0) {
    return [
      {
        batchNo: "",
        availableQty: Number(line.docTtlqty) || 0,
        countedQty: noBatchQty,
        expDate: null,
      },
    ];
  }
  if (line.docBatchNo) {
    return [
      {
        batchNo: line.docBatchNo,
        availableQty: Number(line.docTtlqty) || 0,
        countedQty: Number(line.docQty) || 0,
        expDate: line.docExpdate || null,
      },
    ];
  }
  return null;
}

export function sheetRowFromDocumentLine(line) {
  const countedQty = countedQtyFromSavedLine(line);
  const onHandQty = Number(line?.docTtlqty) || 0;
  const blank = isBlankCountedQty(countedQty);
  const counted = Number(countedQty) || 0;
  const variance = blank ? null : onHandQty < 0 ? counted : counted - onHandQty;
  const batchBreakdown = batchBreakdownFromLine(line);

  return {
    stockCode: line?.itemcode || "",
    stockName: line?.itemdesc || "",
    uom: line?.docUom || "",
    itemUom: line?.docUom || "",
    uomDescription: line?.DOCUOMDesc || line?.docUom || "",
    quantity: onHandQty,
    Price: line?.docPrice || 0,
    brandCode: line?.itmBrand || "",
    brand: line?.itmBrandDesc || "",
    rangeCode: line?.itmRange || "",
    range: line?.itmRangeDesc || "",
    allowDecimalQty: line?.allowDecimalQty ?? false,
    onHandQty,
    countedQty,
    variance,
    batchBreakdown,
    hasBatchBreakdown: Boolean(batchBreakdown?.length),
    batchNo: blank ? "" : line?.docBatchNo || "",
    expiryDate: blank ? null : line?.docExpdate || null,
    remarks: line?.itemRemark || "",
    docId: line?.docId || null,
    isActive: "True",
  };
}
