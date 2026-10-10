import moment from "moment-timezone";
import apiService from "./apiService";
import { getConfigValue } from "@/utils/utils";
import { executeBatchPrTransferPost } from "./gtiBatchTransferEngine";
import {
  applyItemBatchCostFromItemOnQty,
  applyRunningBalanceFromItemOnQty,
  roundBatchUnitCost,
} from "@/utils/itemOnQtyBalance";

const trimItemCode = (itemcode) => String(itemcode || "").replace(/0000$/, "");

const groupDetailsByItemUom = (details) => {
  const map = new Map();
  for (const item of details) {
    const key = `${item.itemcode}|${item.docUom}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.docQty = Number(existing.docQty) + Number(item.docQty);
      existing.docAmt = Number(existing.docAmt) + Number(item.docAmt);
    } else {
      map.set(key, { ...item });
    }
  }
  return Array.from(map.values());
};

const createStktrnRecord = (item, docNo, storeNo, fstoreNo, tstoreNo, multiplier, docDate, trnType) => {
  const today = new Date();
  const timeStr =
    ("0" + today.getHours()).slice(-2) +
    ("0" + today.getMinutes()).slice(-2) +
    ("0" + today.getSeconds()).slice(-2);

  const qty = Number(item.docQty) * multiplier;
  const amt = Number(item.docAmt) * multiplier;

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
    trnType,
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
    itemBatch: null,
    movType: "TFR",
    itemBatchCost: roundBatchUnitCost(item.itemprice),
    stockIn: null,
    transPackageLineNo: null,
    docExpdate: null,
    fefoBatches: null,
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
    where: {
      and: [{ trnDocno: docNo }, { storeNo }],
    },
  };
  const stkResp = await apiService.get(
    `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
  );
  if (stkResp.length > 0) {
    return false;
  }
  await apiService.post("Stktrns", stktrns);
  return true;
};

const postNoBatchQtyChange = async (item, siteCode, qtyDelta) => {
  const trimmedItemCode = trimItemCode(item.itemcode);

  if (qtyDelta > 0) {
    const noBatchFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: item.docUom },
          { siteCode },
          { or: [{ batchNo: "" }, { batchNo: null }] },
        ],
      },
    };
    const existingNoBatch = await apiService
      .get(`ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`)
      .then((resp) => resp[0])
      .catch(() => null);

    if (!existingNoBatch) {
      await apiService.post("ItemBatches", {
        itemCode: trimmedItemCode,
        siteCode,
        uom: item.docUom,
        qty: qtyDelta,
        batchCost: 0,
        batchNo: "",
      });
      return;
    }
  }

  await apiService.post("ItemBatches/updateqty", {
    itemcode: trimmedItemCode,
    sitecode: siteCode,
    uom: item.docUom,
    qty: qtyDelta,
    batchcost: 0,
  });
};

/** True when the GTI header was created from a PR. */
export function isGtiCreatedFromPr(gtiHeader) {
  return String(gtiHeader?.docRemk1 || "").includes("Created from PR:");
}

/** True when HQ stktrns already exist for this GTI (Delivery Order Out completed). */
export async function isHqDispatchDone(docNo, hqSiteCode) {
  if (!docNo || !hqSiteCode) return false;

  const chkFilter = {
    where: {
      and: [{ trnDocno: docNo }, { storeNo: hqSiteCode }],
    },
  };
  const stkResp = await apiService.get(
    `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
  );
  return Array.isArray(stkResp) && stkResp.length > 0;
}

/** Legacy: separate DO document with HQ already deducted. */
async function getLegacyDoDispatchInfo(gtiHeader) {
  const doDocNo = gtiHeader?.docRef1?.trim?.();
  if (!doDocNo) return { hqDispatchDone: false, skipHqOnPost: false, legacyDoDocNo: null };

  const filter = {
    where: {
      and: [{ docNo: doDocNo }, { movCode: "DO" }],
    },
  };
  const rows = await apiService.get(
    `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );
  const doHeader = rows?.[0];
  if (!doHeader) return { hqDispatchDone: false, skipHqOnPost: false, legacyDoDocNo: null };

  const isOpenTransit =
    (doHeader.docStatus === 0 || doHeader.docStatus === "0") &&
    Boolean(doHeader.postDate);

  return {
    hqDispatchDone: isOpenTransit,
    skipHqOnPost: isOpenTransit,
    legacyDoDocNo: doDocNo,
  };
}

/**
 * Resolve PR-linked GTI dispatch state for Two-Way (prUseDeliveryOrder) flow.
 * skipHqOnPost=true → outlet GTI post updates destination only.
 * skipHqOnPost=false → outlet GTI post updates both HQ and destination (HQ forgot DO Out).
 */
export async function getPrLinkedGtiDispatchInfo(gtiHeader) {
  if (!isGtiCreatedFromPr(gtiHeader)) {
    return { isPrDoGti: false, hqDispatchDone: false, skipHqOnPost: false, legacyDoDocNo: null };
  }

  const remk1 = String(gtiHeader.docRemk1 || "");

  if (remk1.includes("via DO:")) {
    const legacy = await getLegacyDoDispatchInfo(gtiHeader);
    return {
      isPrDoGti: true,
      hqDispatchDone: legacy.hqDispatchDone,
      skipHqOnPost: legacy.skipHqOnPost,
      legacyDoDocNo: legacy.legacyDoDocNo,
    };
  }

  if (!getConfigValue("PR_USE_DELIVERY_ORDER")) {
    return { isPrDoGti: false, hqDispatchDone: false, skipHqOnPost: false, legacyDoDocNo: null };
  }

  const hqSite = gtiHeader.fstoreNo;
  const hqDispatchDone = await isHqDispatchDone(gtiHeader.docNo, hqSite);

  return {
    isPrDoGti: true,
    hqDispatchDone,
    skipHqOnPost: hqDispatchDone,
    legacyDoDocNo: null,
  };
}

/** @deprecated Use getPrLinkedGtiDispatchInfo — kept for legacy DO-linked GTIs. */
export async function isGtiLinkedToOpenDo(gtiHeader) {
  const info = await getPrLinkedGtiDispatchInfo(gtiHeader);
  return {
    linked: info.skipHqOnPost,
    doDocNo: info.legacyDoDocNo,
    doHeader: null,
  };
}

/** @deprecated Legacy separate-DO flow only. */
export async function closeDeliveryOrder(doDocNo) {
  if (!doDocNo) return;
  await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${encodeURIComponent(doDocNo)}`, {
    docStatus: "7",
  });
}

/**
 * Post PR transfer stock movements using the same sequential APIs as GTI/GTO.
 * @param {'hq-only'|'destination-only'|'full'} mode
 */
export async function executePrTransferPost({ docNo, header, details, mode }) {
  if (!details?.length) {
    return;
  }

  if (getConfigValue("BATCH_NO") === "Yes") {
    await executeBatchPrTransferPost({ docNo, header, details, mode });
    return;
  }

  const groupedDetails = groupDetailsByItemUom(details);
  const docDate = header.docDate || moment().format("YYYY-MM-DD");
  const trnType = header.movCode === "DO" ? "DO" : header.movCode || "TFRF";
  const hqSite = header.fstoreNo;
  const destSite = header.tstoreNo;

  if (mode === "hq-only" || mode === "full") {
    const hqStktrns = groupedDetails.map((item) =>
      createStktrnRecord(item, docNo, hqSite, hqSite, destSite, -1, docDate, trnType)
    );
    await enrichStktrnsWithBalances(hqStktrns);
    const inserted = await postStktrnsIfNotExists(hqStktrns, docNo, hqSite);
    if (inserted) {
      for (const item of groupedDetails) {
        await postNoBatchQtyChange(item, hqSite, -Number(item.docQty));
      }
    }
  }

  if (mode === "destination-only" || mode === "full") {
    const destStktrns = groupedDetails.map((item) =>
      createStktrnRecord(item, docNo, destSite, hqSite, destSite, 1, docDate, trnType)
    );
    await enrichStktrnsWithBalances(destStktrns);
    const inserted = await postStktrnsIfNotExists(destStktrns, docNo, destSite);
    if (inserted) {
      for (const item of groupedDetails) {
        await postNoBatchQtyChange(item, destSite, Number(item.docQty));
      }
    }
  }
}

/** HQ manual "Delivery Order Out" — deduct HQ stock only, GTI stays Open. */
export async function executeDeliveryOrderOut({ docNo, header, details }) {
  const alreadyDone = await isHqDispatchDone(docNo, header.fstoreNo);
  if (alreadyDone) {
    return { alreadyDone: true };
  }

  await executePrTransferPost({ docNo, header, details, mode: "hq-only" });
  return { alreadyDone: false };
}
