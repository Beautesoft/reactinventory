import moment from "moment-timezone";
import apiService from "./apiService";
import {
  getConfigValue,
  normalizeExpDate,
  formatOrdMemo4Pair,
} from "@/utils/utils";
import { roundMoney } from "@/utils/uomDecimalQty";
import {
  applyItemBatchCostFromItemOnQty,
  applyRunningBalanceFromItemOnQty,
  buildStktrnItemBatchLabel,
  resolveDestinationBatchUnitCost,
  roundBatchUnitCost,
  weightedInventoryUnitCostFromTransferItem,
} from "@/utils/itemOnQtyBalance";
import { pickItemBatch } from "@/utils/itemBatchMatch";

const trimItemCode = (itemcode) => String(itemcode || "").replace(/0000$/, "");

const parseTransferType = (ordMemo1) => {
  const raw = String(ordMemo1 || "fefo").toLowerCase();
  if (raw.startsWith("specific")) return "specific";
  if (raw.includes("-")) return raw.split("-")[0];
  return raw === "specific" ? "specific" : "fefo";
};

const parseSpecificBatchDetails = (detail) => {
  const batchStr = detail.ordMemo2 || "";
  if (!batchStr.trim()) return null;

  const expParts = detail.ordMemo4 ? detail.ordMemo4.split(",").filter(Boolean) : [];
  const pairs = batchStr
    .split(",")
    .map((s) => s.trim())
    .filter((p) => p && !p.toUpperCase().startsWith("NOBATCH:"));

  const individualBatches = pairs.map((pair, idx) => {
    const colon = pair.indexOf(":");
    const batchNo = colon >= 0 ? pair.slice(0, colon).trim() : pair.trim();
    const qty = colon >= 0 ? Number(pair.slice(colon + 1)) || 0 : 0;

    let expDate = null;
    if (expParts[idx]) {
      const ep = expParts[idx];
      const lastColon = ep.lastIndexOf(":");
      if (lastColon > 0) {
        const datePart = ep.slice(0, lastColon).trim();
        if (datePart && datePart !== "null" && datePart !== "undefined") {
          expDate = datePart;
        }
      }
    }

    return {
      batchNo,
      quantity: qty,
      expDate,
      batchCost: 0,
    };
  });

  const noBatchMatch = batchStr.match(/NOBATCH:(\d+)/i);
  const noBatchTransferQty = noBatchMatch
    ? Number(noBatchMatch[1])
    : Number(detail.ordMemo3 || 0);

  return { individualBatches, noBatchTransferQty };
};

export const detailLineToProcessedItem = (detail) => {
  const transferType = parseTransferType(detail.ordMemo1);
  const item = {
    itemcode: trimItemCode(detail.itemcode),
    docUom: detail.docUom,
    docQty: Number(detail.docQty) || 0,
    docAmt: Number(detail.docAmt) || 0,
    docLineno: detail.docLineno,
    itemprice: detail.itemprice || detail.docPrice,
    transferType,
    batchDetails: null,
    fefoBatches: [],
  };

  if (transferType === "specific") {
    const parsed = parseSpecificBatchDetails(detail);
    if (parsed?.individualBatches?.length) {
      item.batchDetails = {
        individualBatches: parsed.individualBatches,
        noBatchTransferQty: parsed.noBatchTransferQty || 0,
      };
    }
  }

  return item;
};

export const calculateFefoBatchesForItem = async (item, hqSite) => {
  if (item.transferType !== "fefo" || getConfigValue("BATCH_NO") !== "Yes") {
    return item;
  }

  const filter = {
    where: {
      and: [
        { itemCode: item.itemcode },
        { siteCode: hqSite },
        { uom: item.docUom },
        { qty: { gt: 0 } },
      ],
    },
  };

  const allBatches = await apiService.get(
    `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );

  if (!Array.isArray(allBatches) || !allBatches.length) {
    return item;
  }

  const specificBatches = allBatches.filter(
    (b) => b.batchNo && String(b.batchNo).trim() !== ""
  );
  specificBatches.sort(
    (a, b) =>
      new Date(a.expDate || "9999-12-31") - new Date(b.expDate || "9999-12-31")
  );

  let remaining = Number(item.docQty);
  const fefoBatches = [];

  for (const batch of specificBatches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(batch.qty));
    fefoBatches.push({
      batchNo: batch.batchNo,
      quantity: take,
      expDate: batch.expDate,
      batchCost: roundBatchUnitCost(batch.batchCost ?? 0),
    });
    remaining -= take;
  }

  if (remaining > 0) {
    const noBatchRecords = allBatches.filter(
      (b) => !b.batchNo || String(b.batchNo).trim() === ""
    );
    for (const nb of noBatchRecords) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(nb.qty));
      fefoBatches.push({
        batchNo: "",
        quantity: take,
        expDate: nb.expDate,
        batchCost: roundBatchUnitCost(nb.batchCost ?? 0),
      });
      remaining -= take;
    }
  }

  return { ...item, fefoBatches };
};

export const groupTransferDetailsByItem = (cartItems) => {
  const grouped = new Map();

  cartItems.forEach((item) => {
    const transferType = (item.transferType || "fefo").toLowerCase();
    const key = `${item.itemcode}-${item.docUom}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...item,
        transferType,
        docQty: Number(item.docQty) || 0,
        docAmt: roundMoney(item.docAmt),
        batchDetails: item.batchDetails || { individualBatches: [] },
        fefoBatches: item.fefoBatches || [],
      });
    } else {
      const existing = grouped.get(key);
      existing.docQty += Number(item.docQty) || 0;
      existing.docAmt = roundMoney(existing.docAmt + (Number(item.docAmt) || 0));
      if (item.batchDetails?.individualBatches?.length) {
        if (!existing.batchDetails) existing.batchDetails = { individualBatches: [] };
        existing.batchDetails.individualBatches.push(
          ...item.batchDetails.individualBatches
        );
        existing.batchDetails.noBatchTransferQty =
          (existing.batchDetails.noBatchTransferQty || 0) +
          (item.batchDetails.noBatchTransferQty || 0);
      }
      if (item.fefoBatches?.length) {
        existing.fefoBatches.push(...item.fefoBatches);
      }
    }

    const g = grouped.get(key);
    if (item.fefoBatches?.length > 0) {
      if (!g.batchDetails) g.batchDetails = { individualBatches: [] };
      item.fefoBatches.forEach((batch) => {
        g.batchDetails.individualBatches.push({
          batchNo: batch.batchNo,
          quantity: Number(batch.quantity) || 0,
          expDate: batch.expDate,
          batchCost: roundBatchUnitCost(batch.batchCost ?? 0),
        });
      });
    }
  });

  return Array.from(grouped.values()).map((g) => {
    if (g.batchDetails?.individualBatches?.length) {
      const consolidated = new Map();
      g.batchDetails.individualBatches.forEach((b) => {
        const k = `${b.batchNo || ""}|${normalizeExpDate(b.expDate) || ""}`;
        const prev = consolidated.get(k);
        if (prev) {
          prev.quantity += Number(b.quantity) || 0;
          if (!prev.expDate && b.expDate) prev.expDate = b.expDate;
        } else {
          consolidated.set(k, { ...b, quantity: Number(b.quantity) || 0 });
        }
      });
      g.batchDetails.individualBatches = Array.from(consolidated.values());
    }
    if (g.fefoBatches?.length) {
      const consolidated = new Map();
      g.fefoBatches.forEach((b) => {
        const k = `${b.batchNo || ""}|${normalizeExpDate(b.expDate) || ""}`;
        const prev = consolidated.get(k);
        if (prev) {
          prev.quantity += Number(b.quantity) || 0;
        } else {
          consolidated.set(k, { ...b, quantity: Number(b.quantity) || 0 });
        }
      });
      g.fefoBatches = Array.from(consolidated.values());
    }
    return g;
  });
};

/** Map source-site ItemBatches.batchCost onto specific/FEFO lines (unit cost, not PR line price). */
export async function enrichTransferBatchCostsFromSource(item, sourceSite) {
  if (getConfigValue("BATCH_NO") !== "Yes" || !sourceSite) return item;

  const filter = {
    where: {
      and: [
        { itemCode: item.itemcode },
        { siteCode: sourceSite },
        { uom: item.docUom },
      ],
    },
  };
  const allBatches = await apiService
    .get(`ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`)
    .catch(() => []);

  if (!Array.isArray(allBatches) || !allBatches.length) return item;

  const unitCostForBatchNo = (batchNo) => {
    const key = String(batchNo ?? "").trim();
    if (!key) {
      const nb = allBatches.find(
        (b) => !b.batchNo || String(b.batchNo).trim() === ""
      );
      return nb != null ? roundBatchUnitCost(nb.batchCost ?? 0) : 0;
    }
    const row = allBatches.find((b) => String(b.batchNo).trim() === key);
    return row != null ? roundBatchUnitCost(row.batchCost ?? 0) : 0;
  };

  const sourceNoBatchUnitCost = unitCostForBatchNo("");
  const next = { ...item, sourceNoBatchUnitCost, hqNoBatchUnitCost: sourceNoBatchUnitCost };

  if (next.batchDetails?.individualBatches?.length) {
    next.batchDetails = {
      ...next.batchDetails,
      individualBatches: next.batchDetails.individualBatches.map((b) => ({
        ...b,
        batchCost: unitCostForBatchNo(b.batchNo),
      })),
    };
  }
  if (next.fefoBatches?.length) {
    next.fefoBatches = next.fefoBatches.map((b) => ({
      ...b,
      batchCost: unitCostForBatchNo(b.batchNo),
    }));
  }
  return next;
}

const createTransactionObject = (
  item,
  docNo,
  storeNo,
  fstoreNo,
  tstoreNo,
  multiplier,
  docDate
) => {
  const today = new Date();
  const timeStr =
    ("0" + today.getHours()).slice(-2) +
    ("0" + today.getMinutes()).slice(-2) +
    ("0" + today.getSeconds()).slice(-2);

  const qty = Number(item.docQty) * multiplier;
  const amt = Number(item.docAmt) * multiplier;

  const itemBatch =
    getConfigValue("BATCH_NO") === "Yes"
      ? buildStktrnItemBatchLabel(item)
      : item.docBatchNo || null;

  const inventoryUnitCost = weightedInventoryUnitCostFromTransferItem(item);

  return {
    id: null,
    trnPost: moment().format("YYYY-MM-DD"),
    trnDate: docDate,
    trnNo: null,
    postTime: timeStr,
    aperiod: null,
    itemcode: item.itemcode + "0000",
    storeNo,
    tstoreNo,
    fstoreNo,
    trnDocno: docNo,
    trnType: "TFRF",
    trnDbQty: null,
    trnCrQty: null,
    trnQty: qty,
    trnBalqty: qty,
    trnBalcst: amt,
    trnAmt: amt,
    trnCost: amt,
    trnRef: null,
    hqUpdate: false,
    lineNo: item.docLineno,
    itemUom: item.docUom,
    itemBatch,
    movType: "TFR",
    itemBatchCost: inventoryUnitCost,
    stockIn: null,
    transPackageLineNo: null,
    docExpdate:
      getConfigValue("EXPIRY_DATE") === "Yes" ? item.docExpdate || null : null,
    fefoBatches: Array.isArray(item.fefoBatches) ? item.fefoBatches : null,
  };
};

const enrichStktrnsWithBalances = async (stktrns) => {
  for (const d of stktrns) {
    const filter = {
      where: {
        and: [{ itemcode: d.itemcode }, { uom: d.itemUom }, { sitecode: d.storeNo }],
      },
    };
    const resp = await apiService.get(
      `Itemonqties?filter=${encodeURIComponent(JSON.stringify(filter))}`
    );
    if (resp.length) {
      const on = resp[0];
      applyRunningBalanceFromItemOnQty(d, on);
      applyItemBatchCostFromItemOnQty(d, on);
    }
  }
};

const postStktrnsIfNotExists = async (stktrns, docNo, storeNo) => {
  const chkFilter = {
    where: { and: [{ trnDocno: docNo }, { storeNo }] },
  };
  const stkResp = await apiService.get(
    `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
  );
  if (stkResp.length > 0) return { inserted: false, records: stkResp };
  const response = await apiService.post("Stktrns", stktrns);
  if (response && Array.isArray(response)) {
    stktrns.forEach((record, index) => {
      if (response[index]?.id) record.id = response[index].id;
    });
  }
  return { inserted: true, records: stktrns };
};

const createStktrnbatchesRecords = async (stktrnsRecords, groupedDetails, type) => {
  for (const stktrnRecord of stktrnsRecords) {
    if (!stktrnRecord.id) continue;

    const trimmedItemCode = trimItemCode(stktrnRecord.itemcode);
    const processedItem = groupedDetails.find(
      (item) =>
        item.itemcode === trimmedItemCode && item.docUom === stktrnRecord.itemUom
    );
    if (!processedItem) continue;

    let batchDetails = [];
    if (processedItem.batchDetails?.individualBatches?.length) {
      batchDetails = processedItem.batchDetails.individualBatches;
    } else if (processedItem.fefoBatches?.length) {
      batchDetails = processedItem.fefoBatches;
    }

    for (const batch of batchDetails) {
      const trnQty = Number(stktrnRecord.trnQty ?? 0);
      const trnSign =
        trnQty === 0 ? (type === "source" ? -1 : 1) : Math.sign(trnQty);
      const absoluteBatchQty = Math.abs(Number(batch.quantity) || 0);

      await apiService.post("Stktrnbatches", {
        batchNo: batch.batchNo || "No Batch",
        stkTrnId: stktrnRecord.id,
        batchQty: trnSign * absoluteBatchQty,
      });
    }

    const noBatchQty = Number(processedItem.batchDetails?.noBatchTransferQty) || 0;
    if (noBatchQty > 0) {
      const trnQty = Number(stktrnRecord.trnQty ?? 0);
      const trnSign =
        trnQty === 0 ? (type === "source" ? -1 : 1) : Math.sign(trnQty);
      await apiService.post("Stktrnbatches", {
        batchNo: "No Batch",
        stkTrnId: stktrnRecord.id,
        batchQty: trnSign * noBatchQty,
      });
    }
  }
};

async function applyDestinationBatchTransfer(
  stktrnItem,
  trimmedItemCode,
  transferQty,
  destSite
) {
  const qty = transferQty || Number(stktrnItem.trnQty);
  if (qty <= 0) return;

  const isNoBatch =
    !stktrnItem.itemBatch || String(stktrnItem.itemBatch).trim() === "";

  if (isNoBatch) {
    const noBatchFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: stktrnItem.itemUom },
          { siteCode: destSite },
          { or: [{ batchNo: "" }, { batchNo: null }] },
        ],
      },
    };
    const existing = await apiService
      .get(`ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`)
      .then((r) => r[0])
      .catch(() => null);

    if (!existing) {
      const noBatchUnitCost = resolveDestinationBatchUnitCost(stktrnItem);
      await apiService.post("ItemBatches", {
        itemCode: trimmedItemCode,
        siteCode: destSite,
        uom: stktrnItem.itemUom,
        qty,
        // Old: batchCost: 0
        batchCost: noBatchUnitCost,
        batchNo: "",
      });
    } else {
      await apiService.post("ItemBatches/updateqty", {
        itemcode: trimmedItemCode,
        sitecode: destSite,
        uom: stktrnItem.itemUom,
        qty,
        batchcost: 0,
      });
    }
    return;
  }

  const normalizedExpDate = normalizeExpDate(stktrnItem.docExpdate);
  const specificBatchFilter = {
    where: {
      and: [
        { itemCode: trimmedItemCode },
        { uom: stktrnItem.itemUom },
        { siteCode: destSite },
        { batchNo: stktrnItem.itemBatch },
      ],
    },
  };

  const existingBatch = await apiService
    .get(
      `ItemBatches?filter=${encodeURIComponent(JSON.stringify(specificBatchFilter))}`
    )
    .then((r) =>
      pickItemBatch(r, {
        batchNo: stktrnItem.itemBatch,
        expDate: normalizedExpDate,
      })
    )
    .catch(() => null);

  if (!existingBatch) {
    const unitCost = resolveDestinationBatchUnitCost(stktrnItem);
    const payload = {
      itemCode: trimmedItemCode,
      siteCode: destSite,
      uom: stktrnItem.itemUom,
      qty,
      // Old: batchCost: Number(stktrnItem.itemBatchCost) || 0 (often 0 after ITEMONQTY enrich)
      batchCost: unitCost,
      batchNo: stktrnItem.itemBatch,
    };
    if (getConfigValue("EXPIRY_DATE") === "Yes" && normalizedExpDate) {
      payload.expDate = normalizedExpDate;
    }
    await apiService.post("ItemBatches", payload);
  } else {
    await apiService.post("ItemBatches/updateqty", {
      itemcode: trimmedItemCode,
      sitecode: destSite,
      uom: stktrnItem.itemUom,
      qty,
      batchcost: 0,
      batchno: stktrnItem.itemBatch,
    });
  }
}

async function applySourceBatchTransfer(
  stktrnItem,
  trimmedItemCode,
  transferQty,
  hqSite
) {
  const qty = transferQty || Number(stktrnItem.trnQty);
  if (qty <= 0) return;

  const isNoBatch =
    !stktrnItem.itemBatch || String(stktrnItem.itemBatch).trim() === "";

  if (isNoBatch) {
    await apiService.post("ItemBatches/updateqty", {
      itemcode: trimmedItemCode,
      sitecode: hqSite,
      uom: stktrnItem.itemUom,
      qty: -qty,
      batchcost: 0,
    });
    return;
  }

  await apiService.post("ItemBatches/updateqty", {
    itemcode: trimmedItemCode,
    sitecode: hqSite,
    uom: stktrnItem.itemUom,
    qty: -qty,
    batchcost: 0,
    batchno: stktrnItem.itemBatch,
  });
}

/** Build ordMemo2/4 (and recQty) from resolved FEFO batches — display/audit only; ordMemo1 stays fefo. */
export function buildFefoMemoFieldsFromBatches(fefoBatches) {
  if (!Array.isArray(fefoBatches) || !fefoBatches.length) {
    return null;
  }

  const withBatch = [];
  let noBatchQty = 0;

  for (const b of fefoBatches) {
    const signed = Number(b.quantity) || 0;
    if (signed === 0) continue;
    // Negative adjustments store a signed quantity. The memo records how much of the batch moved.
    const qty = Math.abs(signed);
    const batchNo = String(b.batchNo ?? "").trim();
    if (!batchNo) {
      noBatchQty += qty;
      continue;
    }
    withBatch.push({ batchNo, qty, expDate: b.expDate });
  }

  if (!withBatch.length && noBatchQty <= 0) {
    return null;
  }

  const ordMemo2Parts = withBatch.map((b) => `${b.batchNo}:${b.qty}`);
  if (noBatchQty > 0) {
    ordMemo2Parts.push(`NOBATCH:${noBatchQty}`);
  }

  const ordMemo4Parts = withBatch
    .map((b) => formatOrdMemo4Pair(b.expDate, b.qty))
    .filter(Boolean);

  const recQtyFields = {
    recQty1: 0,
    recQty2: 0,
    recQty3: 0,
    recQty4: 0,
    recQty5: noBatchQty,
  };
  withBatch.forEach((b, idx) => {
    if (idx < 4) {
      recQtyFields[`recQty${idx + 1}`] = b.qty;
    }
  });

  return {
    ordMemo2: ordMemo2Parts.join(","),
    ordMemo3: String(noBatchQty),
    ordMemo4: ordMemo4Parts.join(","),
    docBatchNo: withBatch.length === 1 ? withBatch[0].batchNo : "",
    ...recQtyFields,
  };
}

async function applySourceFefoFromResolvedBatches(
  trimmedItemCode,
  fefoBatches,
  hqSite,
  docUom
) {
  for (const fb of fefoBatches) {
    const take = Number(fb.quantity) || 0;
    if (take <= 0) continue;
    const batchNo = String(fb.batchNo ?? "").trim();
    if (!batchNo) {
      await apiService.post("ItemBatches/updateqty", {
        itemcode: trimmedItemCode,
        sitecode: hqSite,
        uom: docUom,
        qty: -take,
        batchcost: 0,
      });
      continue;
    }
    await apiService.post("ItemBatches/updateqty", {
      itemcode: trimmedItemCode,
      sitecode: hqSite,
      uom: docUom,
      qty: -take,
      batchcost: 0,
      batchno: batchNo,
    });
  }
}

async function applySourceFefoTransfer(
  stktrnItem,
  trimmedItemCode,
  transferQty,
  hqSite
) {
  const qty = transferQty || Number(stktrnItem.trnQty);
  const filter = {
    where: {
      and: [
        { itemCode: trimmedItemCode },
        { siteCode: hqSite },
        { uom: stktrnItem.itemUom },
        { qty: { gt: 0 } },
      ],
    },
  };
  const allBatches = await apiService.get(
    `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );
  if (!allBatches?.length) return;

  const specificBatches = allBatches
    .filter((b) => b.batchNo && String(b.batchNo).trim() !== "")
    .sort(
      (a, b) =>
        new Date(a.expDate || "9999-12-31") - new Date(b.expDate || "9999-12-31")
    );

  let remaining = qty;
  for (const batch of specificBatches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(batch.qty));
    await apiService.post("ItemBatches/updateqty", {
      itemcode: trimmedItemCode,
      sitecode: hqSite,
      uom: stktrnItem.itemUom,
      qty: -take,
      batchcost: 0,
      batchno: batch.batchNo,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    await apiService.post("ItemBatches/updateqty", {
      itemcode: trimmedItemCode,
      sitecode: hqSite,
      uom: stktrnItem.itemUom,
      qty: -remaining,
      batchcost: 0,
    });
  }
}

async function applyDestinationFefoTransfer(
  stktrnItem,
  trimmedItemCode,
  destSite
) {
  const fefoBatches = stktrnItem.fefoBatches || [];
  for (const fb of fefoBatches) {
    const destBatchNo = fb.batchNo || "";
    const destQty = Number(fb.quantity || 0);
    if (destQty <= 0) continue;

    const individualStktrn = {
      ...stktrnItem,
      itemBatch: destBatchNo,
      trnQty: destQty,
      docExpdate: fb.expDate,
      transferBatchUnitCost: roundBatchUnitCost(fb.batchCost ?? 0),
    };
    await applyDestinationBatchTransfer(
      individualStktrn,
      trimmedItemCode,
      destQty,
      destSite
    );
  }
}

async function applyItemBatchesForCartItem(cartItem, stktrnsDest, stktrnsSrc, hqSite, destSite) {
  const trimmedItemCode = cartItem.itemcode;
  const destStktrn = stktrnsDest.find(
    (s) =>
      trimItemCode(s.itemcode) === trimmedItemCode && s.itemUom === cartItem.docUom
  );
  const srcStktrn = stktrnsSrc.find(
    (s) =>
      trimItemCode(s.itemcode) === trimmedItemCode && s.itemUom === cartItem.docUom
  );
  if (!destStktrn && !srcStktrn) return;

  if (
    cartItem.transferType === "specific" &&
    cartItem.batchDetails?.individualBatches?.length
  ) {
    for (const batchDetail of cartItem.batchDetails.individualBatches) {
      const base = destStktrn || srcStktrn;
      const individual = {
        ...base,
        itemBatch: batchDetail.batchNo,
        trnQty: batchDetail.quantity,
        docExpdate: batchDetail.expDate,
        transferBatchUnitCost: roundBatchUnitCost(batchDetail.batchCost ?? 0),
      };
      if (srcStktrn) {
        await applySourceBatchTransfer(
          individual,
          trimmedItemCode,
          batchDetail.quantity,
          hqSite
        );
      }
      if (destStktrn) {
        await applyDestinationBatchTransfer(
          individual,
          trimmedItemCode,
          batchDetail.quantity,
          destSite
        );
      }
    }
    const noBatchQty = cartItem.batchDetails.noBatchTransferQty || 0;
    if (noBatchQty > 0) {
      const noBatchItem = {
        ...destStktrn,
        itemBatch: "",
        docExpdate: null,
        transferBatchUnitCost: roundBatchUnitCost(
          cartItem.sourceNoBatchUnitCost ?? cartItem.hqNoBatchUnitCost ?? 0
        ),
      };
      if (srcStktrn) {
        await applySourceBatchTransfer(noBatchItem, trimmedItemCode, noBatchQty, hqSite);
      }
      if (destStktrn) {
        await applyDestinationBatchTransfer(
          noBatchItem,
          trimmedItemCode,
          noBatchQty,
          destSite
        );
      }
    }
  } else if (cartItem.fefoBatches?.length) {
    if (srcStktrn) {
      await applySourceFefoFromResolvedBatches(
        trimmedItemCode,
        cartItem.fefoBatches,
        hqSite,
        cartItem.docUom
      );
    }
    if (destStktrn) {
      await applyDestinationFefoTransfer(
        { ...destStktrn, fefoBatches: cartItem.fefoBatches },
        trimmedItemCode,
        destSite
      );
    }
  }
}

const lineItemCodeKey = (itemcode) =>
  String(itemcode || "").replace(/0000$/, "").trim();

const isFefoTransferLine = (detail) => {
  const raw = String(detail?.ordMemo1 || "fefo").toLowerCase();
  if (raw.startsWith("specific")) return false;
  const type = raw.includes("-") ? raw.split("-")[0] : raw;
  return type !== "specific";
};

const isFefoDocumentLine = (detail) => {
  const transferType = String(detail?.transferType || "").toLowerCase();
  if (transferType === "specific") return false;
  if (transferType === "fefo") return true;
  return isFefoTransferLine(detail);
};

/**
 * After successful batch post, persist resolved FEFO batches on document lines (audit/UI).
 * Does not change ordMemo1 or affect stock.
 * @param {'hq-only'|'destination-only'|'full'} mode
 */
export async function persistFefoMemosOnDocumentLines({
  docNo,
  details,
  processedLines,
  mode,
  stockMovementApplied,
}) {
  if (!stockMovementApplied || mode === "hq-only") return;
  if (getConfigValue("BATCH_NO") !== "Yes" || !docNo || !details?.length) return;

  const processedByLineno = new Map(
    (processedLines || []).map((p) => [Number(p.docLineno), p])
  );

  let dbLines = details;
  if (details.some((d) => d.docId == null)) {
    const filter = { where: { docNo } };
    const fetched = await apiService.get(
      `StkMovdocDtls?filter=${encodeURIComponent(JSON.stringify(filter))}`
    );
    if (Array.isArray(fetched) && fetched.length) {
      dbLines = fetched;
    }
  }

  const dbByLineno = new Map(dbLines.map((d) => [Number(d.docLineno), d]));

  for (const detail of details) {
    if (!isFefoDocumentLine(detail)) continue;

    const lineno = Number(detail.docLineno);
    const processed =
      processedByLineno.get(lineno) ||
      processedLines?.find(
        (p) =>
          lineItemCodeKey(p.itemcode) === lineItemCodeKey(detail.itemcode) &&
          p.docUom === detail.docUom &&
          Number(p.docLineno) === lineno
      );

    const fefoBatches = processed?.fefoBatches;
    const memoFields = buildFefoMemoFieldsFromBatches(fefoBatches);
    if (!memoFields?.ordMemo2) continue;

    const dbRow = dbByLineno.get(lineno);
    const docId = detail.docId ?? dbRow?.docId;
    if (!docId) {
      console.warn(
        `FEFO memo write-back skipped: no docId for ${docNo} line ${lineno}`
      );
      continue;
    }

    try {
      await apiService.post(`StkMovdocDtls/update?[where][docId]=${docId}`, memoFields);
    } catch (err) {
      console.error(`Failed FEFO memo write-back for docId ${docId}:`, err);
    }
  }
}

/**
 * Post PR-linked GTI stock with batch/expiry (mirrors GTI screen post).
 * @param {'hq-only'|'destination-only'|'full'} mode
 */
export async function executeBatchPrTransferPost({ docNo, header, details, mode }) {
  if (!details?.length) return;

  const hqSite = header.fstoreNo;
  const destSite = header.tstoreNo;
  const docDate = header.docDate || moment().format("YYYY-MM-DD");

  const processed = await Promise.all(
    details.map(async (d) => {
      const base = detailLineToProcessedItem(d);
      const withFefo = await calculateFefoBatchesForItem(base, hqSite);
      return enrichTransferBatchCostsFromSource(withFefo, hqSite);
    })
  );
  const groupedDetails = await Promise.all(
    groupTransferDetailsByItem(processed).map((g) =>
      enrichTransferBatchCostsFromSource(g, hqSite)
    )
  );

  const postDest = mode === "destination-only" || mode === "full";
  const postHq = mode === "hq-only" || mode === "full";

  let destStktrns = [];
  let hqStktrns = [];

  if (postDest) {
    destStktrns = groupedDetails.map((item) =>
      createTransactionObject(item, docNo, destSite, hqSite, destSite, 1, docDate)
    );
    await enrichStktrnsWithBalances(destStktrns);
  }

  if (postHq) {
    hqStktrns = groupedDetails.map((item) =>
      createTransactionObject(item, docNo, hqSite, hqSite, destSite, -1, docDate)
    );
    await enrichStktrnsWithBalances(hqStktrns);
  }

  let destInserted = false;
  let hqInserted = false;

  if (postDest && destStktrns.length) {
    const r = await postStktrnsIfNotExists(destStktrns, docNo, destSite);
    destInserted = r.inserted;
    destStktrns = r.records;
  }
  if (postHq && hqStktrns.length) {
    const r = await postStktrnsIfNotExists(hqStktrns, docNo, hqSite);
    hqInserted = r.inserted;
    hqStktrns = r.records;
  }

  if (destInserted && destStktrns.length) {
    await createStktrnbatchesRecords(destStktrns, groupedDetails, "destination");
  }
  if (hqInserted && hqStktrns.length) {
    await createStktrnbatchesRecords(hqStktrns, groupedDetails, "source");
  }

  const stockMovementApplied = destInserted || hqInserted;

  if (stockMovementApplied) {
    for (const cartItem of groupedDetails) {
      await applyItemBatchesForCartItem(
        cartItem,
        destInserted ? destStktrns : [],
        hqInserted ? hqStktrns : [],
        hqSite,
        destSite
      );
    }
  }

  let shouldWriteFefoMemos = stockMovementApplied;
  if (!shouldWriteFefoMemos && mode !== "hq-only") {
    const stkFilter = { where: { trnDocno: docNo } };
    const existingStktrns = await apiService.get(
      `Stktrns?filter=${encodeURIComponent(JSON.stringify(stkFilter))}`
    );
    if (Array.isArray(existingStktrns) && existingStktrns.length) {
      const hasDest = existingStktrns.some((s) => s.storeNo === destSite);
      const hasHq = existingStktrns.some((s) => s.storeNo === hqSite);
      if (mode === "full" && hasDest && hasHq) {
        shouldWriteFefoMemos = true;
      } else if (mode === "destination-only" && hasDest) {
        shouldWriteFefoMemos = true;
      }
    }
  }

  if (shouldWriteFefoMemos) {
    await persistFefoMemosOnDocumentLines({
      docNo,
      details,
      processedLines: processed,
      mode,
      stockMovementApplied: true,
    });
  }
}
