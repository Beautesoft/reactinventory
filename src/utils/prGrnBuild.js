import moment from "moment-timezone";
import {
  buildTransferLineDetails,
  calculateTransferTotals,
} from "@/utils/prTransferBuild";

/** Supplier is HQ warehouse (code or display label). */
export function isHqSupplier(suppCode) {
  const s = String(suppCode ?? "").trim();
  if (!s) return false;
  if (s === "HQ") return true;
  return /\(HQ\)/i.test(s) || /\bHQ\b/i.test(s);
}

export function buildGrnHeaderFromPR(prData, options) {
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const {
    docNo,
    storeNo,
    docRef1,
    docRef2 = "",
    docRemk1,
    docStatus = "0",
    postDate = "",
    totals,
  } = options;

  const delivery =
    prData.expectedDeliveryDate ||
    prData.reqDate ||
    moment().format("YYYY-MM-DD");

  return {
    docNo,
    movCode: "GRN",
    movType: "GRN",
    storeNo,
    supplyNo: prData.suppCode || "",
    docRef1,
    docRef2: docRef2 || prData.reqRef || "",
    docDate: moment().format("YYYY-MM-DD"),
    postDate,
    docStatus,
    docQty: totals.totalQty,
    docAmt: totals.totalAmt,
    docAttn: prData.reqAttn || "",
    docRemk1,
    docTerm: prData.reqTerm || "",
    recExpect: moment(delivery).isValid()
      ? moment(delivery).format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD"),
    staffNo: userDetails?.usercode || userDetails?.username || "SYSTEM",
    bname: prData.reqBname || prData.supplierName || "",
    baddr1: prData.reqBaddr1 || "",
    baddr2: prData.reqBaddr2 || "",
    baddr3: prData.reqBaddr3 || "",
    bpostcode: prData.reqBpostcode || "",
    daddr1: prData.reqDaddr1 || "",
    daddr2: prData.reqDaddr2 || "",
    daddr3: prData.reqDaddr3 || "",
    dpostcode: prData.reqDpostcode || "",
    createUser: userDetails?.username || "SYSTEM",
    createDate: new Date().toISOString(),
  };
}

export function buildGrnLineDetailsFromPR(prData, lineItems, docNo) {
  return buildTransferLineDetails(prData, lineItems, docNo, "GRN", "GRN");
}

export { calculateTransferTotals };
