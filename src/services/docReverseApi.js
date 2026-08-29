import apiService from "./apiService";
import { getConfigValue } from "@/utils/utils";

/** Reverse order: undo transfers/usage before receives. */
export const MOV_TYPE_META = [
  { value: "TFRT", label: "Goods Transfer Out", rank: 10 },
  { value: "TFRF", label: "Goods Transfer In", rank: 20 },
  { value: "VGRN", label: "Goods Return Note", rank: 30 },
  { value: "SUM", label: "Stock Usage Memo", rank: 40 },
  { value: "ADJ", label: "Stock Adjustment", rank: 50 },
  { value: "TKE", label: "Stock Take", rank: 60 },
  { value: "GRN", label: "Goods Receive Note", rank: 70 },
];

export const movTypeLabel = (code) =>
  MOV_TYPE_META.find((m) => m.value === code)?.label || code || "—";

export const movTypeRank = (code) =>
  MOV_TYPE_META.find((m) => m.value === code)?.rank ?? 99;

const filterQuery = (filter) =>
  `?filter=${encodeURIComponent(JSON.stringify(filter))}`;

const toList = (res) => (Array.isArray(res) ? res : []);

export const trimItemCode = (itemcode) =>
  String(itemcode || "").replace(/0000$/, "");

export const balanceKey = (itemcode, storeNo, uom) =>
  `${itemcode || ""}|${storeNo || ""}|${uom || ""}`;

export function sortHeadersForReverse(headers = []) {
  return [...headers].sort((a, b) => {
    const r = movTypeRank(a.movCode) - movTypeRank(b.movCode);
    if (r !== 0) return r;
    const da = new Date(b.postDate || b.docDate || 0).getTime();
    const db = new Date(a.postDate || a.docDate || 0).getTime();
    return da - db;
  });
}

export async function searchPostedHeaders({
  movCode,
  storeNo,
  docNo,
  dateFrom,
  dateTo,
  remarks,
  limit = 50,
} = {}) {
  const and = [{ or: [{ docStatus: 7 }, { docStatus: "7" }] }];
  if (movCode) and.push({ movCode });
  if (storeNo) and.push({ storeNo });
  if (docNo?.trim()) and.push({ docNo: { like: `%${docNo.trim()}%` } });
  if (remarks?.trim()) and.push({ docRemk1: { like: `%${remarks.trim()}%` } });
  if (dateFrom) and.push({ docDate: { gte: dateFrom } });
  if (dateTo) and.push({ docDate: { lte: `${dateTo}T23:59:59.000Z` } });

  const filter = {
    where: { and },
    order: "docDate DESC",
    limit,
  };
  const res = await apiService.get(`StkMovdocHdrs${filterQuery(filter)}`);
  return toList(res);
}

export async function getStktrnsByDocNo(docNo) {
  const filter = { where: { trnDocno: docNo } };
  const res = await apiService.get(`Stktrns${filterQuery(filter)}`);
  return toList(res);
}

export async function getStktrnbatches(stkTrnId) {
  if (stkTrnId == null) return [];
  const filter = { where: { stkTrnId } };
  const res = await apiService.get(`Stktrnbatches${filterQuery(filter)}`);
  return toList(res);
}

export async function getOnHandQty(itemcode, sitecode, uom) {
  const filter = {
    where: {
      and: [{ itemcode }, { sitecode }, { uom }],
    },
  };
  try {
    const res = await apiService.get(`Itemonqties${filterQuery(filter)}`);
    const row = toList(res)[0];
    if (row) return Number(row.trnBalqty ?? row.onhandQty ?? 0);
  } catch {
    /* try batches */
  }
  try {
    const batchFilter = {
      where: {
        and: [
          { itemCode: trimItemCode(itemcode) },
          { siteCode: sitecode },
          { uom },
        ],
      },
    };
    const res = await apiService.get(`ItemBatches${filterQuery(batchFilter)}`);
    return toList(res).reduce((sum, b) => sum + Number(b.qty ?? b.onhandQty ?? 0), 0);
  } catch {
    return null;
  }
}

function reverseQtyForStktrn(trnQty, batchQty) {
  const signed = Number(trnQty) || 0;
  const sign = signed === 0 ? 1 : Math.sign(signed);
  if (batchQty == null) return -signed;
  return -sign * Math.abs(Number(batchQty) || 0);
}

async function undoItemBatches(stktrn, batches) {
  const itemcode = trimItemCode(stktrn.itemcode);
  const sitecode = stktrn.storeNo;
  const uom = stktrn.itemUom;
  const useBatches =
    getConfigValue("BATCH_NO") === "Yes" && Array.isArray(batches) && batches.length > 0;

  if (useBatches) {
    for (const batch of batches) {
      const payload = {
        itemcode,
        sitecode,
        uom,
        qty: reverseQtyForStktrn(stktrn.trnQty, batch.batchQty),
        batchcost: 0,
        batchno: batch.batchNo || "No Batch",
      };
      await apiService.post("ItemBatches/updateqty", payload);
    }
    return;
  }

  await apiService.post("ItemBatches/updateqty", {
    itemcode,
    sitecode,
    uom,
    qty: reverseQtyForStktrn(stktrn.trnQty),
    batchcost: 0,
  });
}

async function deleteStktrnAndBatches(stktrn) {
  const batches = await getStktrnbatches(stktrn.id);
  for (const batch of batches) {
    const id = batch.id ?? batch.stkTrnBatchId;
    if (id == null) continue;
    await apiService.delete(`Stktrnbatches/${id}`);
  }
  if (stktrn.id != null) {
    await apiService.delete(`Stktrns/${stktrn.id}`);
  }
}

export async function loadDocReversePlan(header) {
  const stktrns = await getStktrnsByDocNo(header.docNo);
  const lines = [];
  for (const trn of stktrns) {
    const batches = await getStktrnbatches(trn.id);
    lines.push({ stktrn: trn, batches });
  }
  return { header, stktrns, lines };
}

/**
 * Simulate on-hand after applying -trnQty for each movement (same as updateqty reverse).
 * Returns blocking issues when on-hand would go below 0.
 */
export async function previewReverseSet(headers) {
  const ordered = sortHeadersForReverse(headers);
  const plans = [];
  for (const hdr of ordered) {
    plans.push(await loadDocReversePlan(hdr));
  }

  const onHandCache = new Map();
  const steps = [];
  const issues = [];

  for (const plan of plans) {
    const { header, stktrns, lines } = plan;
    if (!stktrns.length) {
      steps.push({
        header,
        kind: "header-only",
        message: "No Stktrns — stock will not change",
        movements: [],
      });
      continue;
    }

    const movements = [];
    for (const { stktrn, batches } of lines) {
      const key = balanceKey(stktrn.itemcode, stktrn.storeNo, stktrn.itemUom);
      if (!onHandCache.has(key)) {
        onHandCache.set(
          key,
          await getOnHandQty(stktrn.itemcode, stktrn.storeNo, stktrn.itemUom)
        );
      }
      const current = onHandCache.get(key);
      const delta = reverseQtyForStktrn(stktrn.trnQty);
      const after = current == null ? null : Number(current) + delta;
      if (after != null && after < -0.0001) {
        issues.push(
          `${header.docNo}: ${trimItemCode(stktrn.itemcode)} @ ${stktrn.storeNo} on-hand ${current} cannot apply ${delta}`
        );
      }
      if (after != null) onHandCache.set(key, after);
      movements.push({
        itemcode: trimItemCode(stktrn.itemcode),
        storeNo: stktrn.storeNo,
        uom: stktrn.itemUom,
        trnQty: Number(stktrn.trnQty),
        undoQty: delta,
        onHandBefore: current,
        onHandAfter: after,
        batches,
      });
    }

    steps.push({
      header,
      kind: "stock",
      message: `${stktrns.length} stock movement(s)`,
      movements,
    });
  }

  return { ordered, steps, issues };
}

export async function reverseDocument(header, { onProgress } = {}) {
  const plan = await loadDocReversePlan(header);
  if (!plan.stktrns.length) {
    onProgress?.({ docNo: header.docNo, status: "skipped", detail: "No Stktrns" });
    return { status: "skipped", detail: "No stock movement for this document" };
  }

  for (const { stktrn, batches } of plan.lines) {
    await undoItemBatches(stktrn, batches);
    await deleteStktrnAndBatches(stktrn);
  }

  onProgress?.({
    docNo: header.docNo,
    status: "ok",
    detail: `Reversed ${plan.stktrns.length} Stktrns; header left Posted`,
  });
  return {
    status: "ok",
    detail: `Reversed ${plan.stktrns.length} movement(s). Document stays Posted.`,
  };
}

export async function reverseDocuments(headers, { onProgress, shouldStop } = {}) {
  const ordered = sortHeadersForReverse(headers);
  const results = [];
  for (const hdr of ordered) {
    if (shouldStop?.()) break;
    try {
      const result = await reverseDocument(hdr, { onProgress });
      results.push({ header: hdr, ...result });
      if (result.status === "error") break;
    } catch (err) {
      const detail =
        err?.response?.data?.error?.message || err?.message || "Reverse failed";
      onProgress?.({ docNo: hdr.docNo, status: "error", detail });
      results.push({ header: hdr, status: "error", detail });
      break;
    }
  }
  return results;
}
