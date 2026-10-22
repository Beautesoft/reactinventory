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

function memoExpiryAt(ordMemo4, index) {
  if (!ordMemo4) return null;
  const part = String(ordMemo4).split(",")[index];
  if (!part) return null;
  const pieces = part.split(":");
  if (pieces.length < 2) return null;
  const expDate = pieces.slice(0, -1).join(":");
  if (!expDate || expDate === "null" || expDate === "undefined") return null;
  return expDate;
}

/** Batches keyed on the stock-take line. Pending lines have no count yet. */
export function stockTakePrintBatches(line) {
  if (!line || isPendingSavedLine(line)) return [];

  if (line.ordMemo1 === "specific" && line.ordMemo2) {
    const batches = String(line.ordMemo2)
      .split(",")
      .filter(Boolean)
      .map((part, index) => {
        const splitAt = part.lastIndexOf(":");
        const batchNo = splitAt >= 0 ? part.slice(0, splitAt) : part;
        const countedQty = splitAt >= 0 ? Number(part.slice(splitAt + 1)) : 0;
        return {
          batchNo,
          countedQty: Number.isFinite(countedQty) ? countedQty : 0,
          expDate: memoExpiryAt(line.ordMemo4, index),
        };
      });
    const noBatchQty = Number(line.ordMemo3) || 0;
    if (noBatchQty > 0) {
      batches.push({ batchNo: "", countedQty: noBatchQty, expDate: null });
    }
    return batches;
  }

  const noBatchQty = Number(line.ordMemo3) || 0;
  if (noBatchQty > 0 && !line.docBatchNo) {
    return [{ batchNo: "", countedQty: noBatchQty, expDate: null }];
  }

  if (line.docBatchNo) {
    return [
      {
        batchNo: line.docBatchNo,
        countedQty: Number(line.docQty) || 0,
        expDate: line.docExpdate || null,
      },
    ];
  }

  return [];
}

function pricesForLine(line, priceRows) {
  const code = String(line?.itemcode || "").replace(/0000$/, "");
  const uom = line?.docUom || "";
  const rows = Array.isArray(priceRows) ? priceRows : [];
  const match =
    rows.find((row) => row.itemCode === code && row.itemUom === uom) ||
    rows.find((row) => row.itemCode === code);
  const selling = Number(match?.itemPrice ?? match?.item_Price);
  const cost = Number(match?.itemCost ?? match?.item_cost);
  return {
    selling: Number.isFinite(selling) ? selling : Number(line?.docPrice) || 0,
    cost: Number.isFinite(cost) ? cost : 0,
  };
}

/**
 * One print row per batch. System quantity and variance stay on the first
 * row of the item. A pending line prints a blank count.
 */
export function expandStockTakePrintRows(lines, priceRows = []) {
  const rows = [];
  let itemNo = 0;

  for (const line of lines || []) {
    const pending = isPendingSavedLine(line);
    const systemQty = Number(line?.docTtlqty) || 0;
    const itemQty = Number(line?.docQty);
    const variance =
      pending || !Number.isFinite(itemQty) ? null : itemQty - systemQty;
    const prices = pricesForLine(line, priceRows);
    const batches = stockTakePrintBatches(line);
    const slices = batches.length
      ? batches
      : [
          {
            batchNo: pending ? "" : line?.docBatchNo || "",
            countedQty: pending ? null : Number.isFinite(itemQty) ? itemQty : 0,
            expDate: pending ? null : line?.docExpdate || null,
          },
        ];

    itemNo += 1;
    slices.forEach((batch, index) => {
      const first = index === 0;
      const counted = pending ? null : Number(batch.countedQty) || 0;
      rows.push({
        isStockTake: true,
        showItem: first,
        itemNo: first ? itemNo : "",
        itemcode: line?.itemcode || "",
        itemdesc: line?.itemdesc || "",
        batchselect: batch.batchNo || "-",
        expiry: batch.expDate || "",
        docQty: pending ? "" : counted,
        systemQty: first ? systemQty : "",
        variance: first ? variance : "",
        remarks: first ? line?.itemRemark || "" : "",
        docPrice: first ? prices.selling : "",
        itemCost: first ? prices.cost : "",
        countForTotal: pending ? 0 : counted,
      });
    });
  }

  return rows;
}
