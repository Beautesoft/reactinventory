import apiService from "./apiService";
import {
  getConfigValue,
  isVoidDocStatus,
  VOID_DOC_STATUS,
} from "@/utils/utils";

export const VOID_TRN_REF = "VOID";

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

export function isVoidStktrn(trn) {
  return String(trn?.trnRef || "").toUpperCase() === VOID_TRN_REF;
}

function negateNumber(value) {
  if (value == null || value === "") return value;
  const n = Number(value);
  return Number.isFinite(n) ? -n : value;
}

function hasVoidTwin(original, allTrns) {
  const targetQty = reverseQtyForStktrn(original.trnQty);
  return allTrns.some(
    (t) =>
      isVoidStktrn(t) &&
      t.itemcode === original.itemcode &&
      t.storeNo === original.storeNo &&
      t.itemUom === original.itemUom &&
      Number(t.trnQty) === targetQty
  );
}

function postTimeNow() {
  const today = new Date();
  return (
    ("0" + today.getHours()).slice(-2) +
    ("0" + today.getMinutes()).slice(-2) +
    ("0" + today.getSeconds()).slice(-2)
  );
}

function buildReverseStktrn(original, reverseQty, onHandAfter) {
  return {
    trnPost: new Date().toISOString().split("T")[0],
    trnDate: original.trnDate,
    trnNo: null,
    postTime: postTimeNow(),
    aperiod: original.aperiod ?? null,
    itemcode: original.itemcode,
    storeNo: original.storeNo,
    tstoreNo: original.tstoreNo,
    fstoreNo: original.fstoreNo,
    trnDocno: original.trnDocno,
    trnType: original.trnType,
    trnDbQty: negateNumber(original.trnDbQty),
    trnCrQty: negateNumber(original.trnCrQty),
    trnQty: reverseQty,
    trnBalqty: onHandAfter != null ? onHandAfter : reverseQty,
    trnBalcst: negateNumber(original.trnBalcst),
    trnAmt: negateNumber(original.trnAmt),
    trnCost: negateNumber(original.trnCost),
    trnRef: VOID_TRN_REF,
    hqUpdate: false,
    lineNo: original.lineNo,
    itemUom: original.itemUom,
    itemBatch: original.itemBatch ?? null,
    movType: original.movType,
    itemBatchCost: original.itemBatchCost,
    stockIn: original.stockIn ?? null,
    transPackageLineNo: original.transPackageLineNo ?? null,
    docExpdate: original.docExpdate ?? null,
  };
}

async function insertReverseStktrn(original, reverseQty) {
  const onHand = await getOnHandQty(
    original.itemcode,
    original.storeNo,
    original.itemUom
  );
  const onHandAfter =
    onHand == null ? null : Number(onHand) + Number(reverseQty);
  const payload = buildReverseStktrn(original, reverseQty, onHandAfter);
  const created = await apiService.post("Stktrns", [payload]);
  if (Array.isArray(created)) return created[0];
  return created;
}

async function insertReverseBatches(newStktrnId, original, batches) {
  if (!newStktrnId || !Array.isArray(batches) || batches.length === 0) return;
  for (const batch of batches) {
    const batchQty = reverseQtyForStktrn(original.trnQty, batch.batchQty);
    await apiService.post("Stktrnbatches", {
      batchNo: batch.batchNo || "No Batch",
      stkTrnId: newStktrnId,
      batchQty,
    });
  }
}

async function setHeaderVoid(docNo) {
  await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${docNo}`, {
    docStatus: VOID_DOC_STATUS,
  });
}

export async function loadDocReversePlan(header) {
  const allStktrns = await getStktrnsByDocNo(header.docNo);
  const originals = allStktrns.filter((t) => !isVoidStktrn(t));
  const lines = [];
  for (const trn of originals) {
    const batches = await getStktrnbatches(trn.id);
    lines.push({
      stktrn: trn,
      batches,
      alreadyReversed: hasVoidTwin(trn, allStktrns),
    });
  }
  return { header, stktrns: originals, allStktrns, lines };
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
    const pendingLines = lines.filter((l) => !l.alreadyReversed);
    if (!pendingLines.length) {
      steps.push({
        header,
        kind: "header-only",
        message: stktrns.length
          ? "Already reversed — header will be set to Void"
          : "No Stktrns — header will be set to Void",
        movements: [],
      });
      continue;
    }

    const movements = [];
    for (const { stktrn, batches } of pendingLines) {
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
      message: `${pendingLines.length} stock movement(s) to reverse`,
      movements,
    });
  }

  return { ordered, steps, issues };
}

export async function reverseDocument(header, { onProgress } = {}) {
  if (isVoidDocStatus(header?.docStatus)) {
    return { status: "skipped", detail: "Document is already Void" };
  }

  const plan = await loadDocReversePlan(header);
  const preview = await previewReverseSet([header]);
  if (preview.issues.length) {
    const detail = preview.issues.join("; ");
    onProgress?.({ docNo: header.docNo, status: "error", detail });
    return { status: "error", detail };
  }

  const pending = plan.lines.filter((l) => !l.alreadyReversed);

  for (const { stktrn, batches } of pending) {
    const reverseQty = reverseQtyForStktrn(stktrn.trnQty);
    onProgress?.({
      docNo: header.docNo,
      status: "running",
      detail: `Reversing ${trimItemCode(stktrn.itemcode)} @ ${stktrn.storeNo}`,
    });

    const created = await insertReverseStktrn(stktrn, reverseQty);
    const newId = created?.id;
    await insertReverseBatches(newId, stktrn, batches);
    await undoItemBatches(stktrn, batches);
  }

  await setHeaderVoid(header.docNo);

  onProgress?.({
    docNo: header.docNo,
    status: "ok",
    detail: `Voided. Reversed ${pending.length} movement(s). Status set to Void.`,
  });
  return {
    status: "ok",
    detail: `Voided. Reversed ${pending.length} movement(s). Document status is Void.`,
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
