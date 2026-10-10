import moment from "moment-timezone";
import apiService from "./apiService";
import { claimControlNumber } from "@/utils/controlNo";
import { isVoidDocStatus } from "@/utils/utils";
import {
  buildGrnHeaderFromPR,
  buildGrnLineDetailsFromPR,
  calculateTransferTotals,
} from "@/utils/prGrnBuild";

const isPrLinkedGrnHeader = (header) => {
  const remk1 = String(header?.docRemk1 || "");
  return remk1.includes("Created from PR:") && String(header?.movCode || "") === "GRN";
};

export async function findPrLinkedGrnByReqNo(reqNo) {
  if (!reqNo) return null;

  const filter = {
    where: {
      and: [{ movCode: "GRN" }, { docRef1: reqNo }],
    },
    order: "docNo DESC",
  };
  const rows = await apiService.get(
    `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );
  const linked = (Array.isArray(rows) ? rows : []).filter(
    (h) => isPrLinkedGrnHeader(h) && !isVoidDocStatus(h.docStatus)
  );
  return linked[0] || null;
}

async function claimGrnDocNo(siteCode) {
  const site = String(siteCode || "").trim();
  if (!site) {
    throw new Error("Destination site code is required to create GRN from PR");
  }

  try {
    return await claimControlNumber({
      controlDescription: "Goods Receive Note",
      siteCode: site,
    });
  } catch (err) {
    if (!/No ControlNos row/.test(err?.message || "")) throw err;

    await apiService.post("ControlNos", [
      {
        controlDescription: "Goods Receive Note",
        siteCode: site,
        controlPrefix: "WGRN",
        controlNo: "110001",
        controldate: moment().format("YYYY-MM-DD"),
        macCode: null,
      },
    ]);
    return await claimControlNumber({
      controlDescription: "Goods Receive Note",
      siteCode: site,
    });
  }
}

async function saveGrnDocument(header, details) {
  const hdr = { ...header, docLines: details.length };
  await apiService.post("StkMovdocHdrs", hdr);
  if (details.length > 0) {
    await apiService.post("StkMovdocDtls", details);
  }
  return { header: hdr, details };
}

/**
 * Open GRN at the requesting outlet (no stock movement until outlet posts GRN).
 */
export async function createGrnFromPR(prData, lineItems) {
  const storeNo = prData.itemsiteCode;
  if (!storeNo) {
    throw new Error("Requesting site code is required to create GRN from PR");
  }

  const { transferLineItems, totals } = calculateTransferTotals(lineItems);
  if (transferLineItems.length === 0) {
    return {
      success: true,
      docNo: null,
      header: null,
      details: [],
      mode: "grn",
      message: "Purchase Requisition approved with no items to receive",
    };
  }

  const existing = await findPrLinkedGrnByReqNo(prData.reqNo);
  if (existing?.docNo) {
    return {
      success: true,
      docNo: existing.docNo,
      header: existing,
      details: [],
      mode: "grn",
      message: `GRN ${existing.docNo} already linked to PR ${prData.reqNo}`,
    };
  }

  const claim = await claimGrnDocNo(storeNo);
  const docNo = claim.docNo;

  const details = buildGrnLineDetailsFromPR(prData, lineItems, docNo);
  const header = buildGrnHeaderFromPR(prData, {
    docNo,
    storeNo,
    docRef1: prData.reqNo,
    docRef2: prData.reqRef || "",
    docRemk1: `Created from PR: ${prData.reqNo}`,
    docStatus: "0",
    postDate: "",
    totals,
  });

  await saveGrnDocument(header, details);

  return {
    success: true,
    docNo,
    header,
    details,
    mode: "grn",
    message:
      `PR approved: GRN ${docNo} created at ${storeNo}. ` +
      `The outlet can post the GRN when goods arrive (outlet stock only; HQ is not deducted).`,
  };
}

export async function processPrApprovalGrn(prData, lineItems) {
  return createGrnFromPR(prData, lineItems);
}

export async function tryCompleteApprovedPrGrn(reqNo) {
  const grn = await findPrLinkedGrnByReqNo(reqNo);
  if (!grn) {
    return { done: false };
  }

  return {
    done: true,
    result: {
      success: true,
      docNo: grn.docNo,
      mode: "grn",
      hqDispatched: false,
      message: `GRN ${grn.docNo} already linked to this PR`,
    },
  };
}
