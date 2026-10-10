import apiService from "./apiService";
import moment from "moment-timezone";
import { roundMoney } from "@/utils/uomDecimalQty";
import { claimControlNumber } from "@/utils/controlNo";
import { getConfigValue, isVoidDocStatus } from "@/utils/utils";
import {
  buildTransferHeader,
  buildTransferLineDetails,
  calculateTransferTotals,
} from "@/utils/prTransferBuild";
import {
  executePrTransferPost,
  executeDeliveryOrderOut,
  isHqDispatchDone,
} from "./prTransferPost";
import {
  processPrApprovalGrn,
  tryCompleteApprovedPrGrn,
} from "./prGrnFromPr";
import { isHqSupplier } from "@/utils/prGrnBuild";

const isPrLinkedGtiHeader = (header) => {
  const remk1 = String(header?.docRemk1 || "");
  return remk1.includes("Created from PR:") && !remk1.includes("via DO:");
};

/** Non-void PR-linked GTI for this req (latest docNo if several). */
async function findPrLinkedGtiByReqNo(reqNo) {
  if (!reqNo) return null;

  const filter = {
    where: {
      and: [{ movCode: "TFRF" }, { docRef1: reqNo }],
    },
    order: "docNo DESC",
  };
  const rows = await apiService.get(
    `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(filter))}`
  );
  const linked = (Array.isArray(rows) ? rows : []).filter(
    (h) => isPrLinkedGtiHeader(h) && !isVoidDocStatus(h.docStatus)
  );
  return linked[0] || null;
}

async function saveApprovedQuantitiesOnLines(lineItems) {
  for (const item of lineItems) {
    if (item.reqId && item.reqId !== "") {
      await apiService.post(`reqdetails/update?[where][reqId]=${item.reqId}`, {
        reqAppqty: getApprovedQty(item),
        reqdQty: item.reqdQty,
      });
    }
  }
}

async function markPrApproved(reqNo) {
  await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
    reqStatus: "Approved",
  });
}

function isGtiPosted(header) {
  return header?.docStatus === 7 || header?.docStatus === "7";
}

/** Idempotent success when PR was already approved and transfer work is complete. */
async function tryCompleteApprovedPrTransfer(reqNo, createTransfer) {
  if (!createTransfer) {
    return { done: false };
  }

  const gti = await findPrLinkedGtiByReqNo(reqNo);
  if (!gti) {
    return { done: false };
  }

  const useDeliveryOrder = getConfigValue("PR_USE_DELIVERY_ORDER");
  const autoPost = getConfigValue("AUTO_POST") === "Yes";

  if (useDeliveryOrder) {
    return {
      done: true,
      result: {
        success: true,
        docNo: gti.docNo,
        mode: "two-way",
        hqDispatched: false,
        message: `Transfer ${gti.docNo} already linked to this PR`,
      },
    };
  }

  if (autoPost && isGtiPosted(gti)) {
    return {
      done: true,
      result: {
        success: true,
        docNo: gti.docNo,
        mode: "one-way",
        hqDispatched: false,
        message: `Transfer ${gti.docNo} already completed for this PR`,
      },
    };
  }

  if (!autoPost) {
    return {
      done: true,
      result: {
        success: true,
        docNo: gti.docNo,
        mode: "one-way",
        hqDispatched: false,
        message: `Transfer ${gti.docNo} already created for this PR`,
      },
    };
  }

  return { done: false };
}

const BASE_URL = ""; // Will use the base URL from apiService

// Helper function to convert empty strings to null and fix date/time formats
const convertEmptyStringsToNull = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return obj === '' ? null : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertEmptyStringsToNull);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      // Fix date and time formatting for server
      if (key === 'reqDate' && value) {
        // Convert date to ISO format
        converted[key] = moment(value).format('YYYY-MM-DD');
      } else if (key === 'reqTime' && value) {
        // Convert time to full datetime format
        const today = moment().format('YYYY-MM-DD');
        const fullDateTime = `${today} ${value}`;
        converted[key] = moment(fullDateTime).toISOString();
      } else if (key === 'expectedDeliveryDate' && value) {
        // Convert expected delivery date to ISO format
        converted[key] = moment(value).format('YYYY-MM-DD');
      } else if (key === 'reqdDate' && value) {
        // Convert cart item date to ISO format
        converted[key] = moment(value).format('YYYY-MM-DD');
      } else if (key === 'reqdTime' && value) {
        // Convert cart item time to full datetime format
        const today = moment().format('YYYY-MM-DD');
        const fullDateTime = `${today} ${value}`;
        converted[key] = moment(fullDateTime).toISOString();
      } else if (key === 'docExpdate' && value) {
        // Convert expiry date to ISO format
        converted[key] = moment(value).format('YYYY-MM-DD');
      } else {
        converted[key] = convertEmptyStringsToNull(value);
      }
    }
    return converted;
  }
  
  return obj;
};

/**
 * Strip UI-only columns before posting reqdetails.
 * REQ_DETAIL has itemRemark1/itemRemark2 on every current client, and no
 * ordMemo1/ordMemo2 anywhere - so these two must be kept: itemRemark1 carries the
 * "fefo-<UOM>" transfer type + UOM, itemRemark2 the batch breakdown. Dropping them
 * is what made an approved PR produce a GTI line with a hard-coded "PCS" UOM.
 * Empty values are removed so a client whose table lacks one of these columns
 * (hairdreams / tnctrain have no itemRemark2) is not sent it needlessly.
 */
const sanitizeReqDetailPayload = (item) => {
  if (!item || typeof item !== "object") return item;
  const {
    batchDetails,
    transferType,
    useExistingBatch,
    allowDecimalQty,
    ...rest
  } = item;

  if (!rest.itemRemark1) delete rest.itemRemark1;
  if (!rest.itemRemark2) delete rest.itemRemark2;

  return rest;
};

const prepareReqDetailsForApi = (items) =>
  convertEmptyStringsToNull(
    (Array.isArray(items) ? items : [items]).map(sanitizeReqDetailPayload)
  );

// Resolve approved qty; treats explicit 0 as valid (unlike || fallback)
export const getApprovedQty = (item) => {
  if (item.reqAppqty != null && item.reqAppqty !== "") {
    return parseFloat(item.reqAppqty) || 0;
  }
  return parseFloat(item.reqdQty) || 0;
};

// DB/new lines often store 0 as "not set"; default to requested qty unless PR is already approved
export const resolveReqAppqtyForLoad = (item, reqStatus) => {
  const raw = item.reqAppqty;
  const hasValue = raw != null && raw !== "";

  if (reqStatus === "Approved") {
    return hasValue ? raw : item.reqdQty;
  }

  if (!hasValue || Number(raw) === 0) {
    return item.reqdQty;
  }

  return raw;
};

export const prApi = {
  // Fetch HQ batch breakdown for an item/uom
  async getHQItemBatches(itemCode, uom, hqSiteCode = null) {
    const userDetails = JSON.parse(localStorage.getItem("userDetails"));
    const site = hqSiteCode || userDetails?.HQSiteCode || "HQ";
    const filter = {
      where: {
        and: [
          { itemCode: itemCode },
          { siteCode: site },
          ...(uom ? [{ uom }] : []),
          { qty: { gt: 0 } },
        ],
      },
    };
    const res = await apiService.get(
      `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
    );
    return (res || []).map((b) => ({
      batchNo: b.batchNo || "",
      qty: Number(b.qty) || 0,
      expDate: b.expDate || null,
    }));
  },
  // Get next PR number
  async getNextPRNumber() {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const siteCode = userDetails?.siteCode;
      const codeDesc = "PO REQUISITE";
      
      const filter = { 
        where: { 
          controlDescription: codeDesc,
          siteCode: siteCode
        } 
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`ControlNos${query}`);
      
      if (response && response.length > 0) {
        const control = response[0];
        return `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
      }
      
      // If no control number found, create a new one
      console.log("No control number found, creating new one...");
      const newControlNumber = await this.createControlNumber(codeDesc, siteCode);
      return newControlNumber;
    } catch (error) {
      console.error("Error getting next PR number:", error);
      throw error;
    }
  },

  // Create new control number record
  async createControlNumber(controlDescription, siteCode) {
    try {
      const newControlData = {
        controlDescription: controlDescription,
        siteCode: siteCode,
        controlPrefix: "PR",
        controlNo: "000001",
        controldate: moment().format("YYYY-MM-DD"),
        macCode: null, // Empty string as per sample
      };
      
      const response = await apiService.post("ControlNos", [newControlData]);
      console.log("New control number created:", response);
      
      // Return the formatted control number
      return `${newControlData.controlPrefix}${newControlData.siteCode}${newControlData.controlNo}`;
    } catch (error) {
      console.error("Error creating control number:", error);
      throw error;
    }
  },

  // Create PR header
  async createPRHeader(header) {
    try {
      // Convert empty strings to null before sending
      const convertedHeader = convertEmptyStringsToNull(header);
      
      // Save header (reqNo should already be set in createPR)
      const response = await apiService.post("reqs", [convertedHeader]);
      return response;
    } catch (error) {
      console.error("Error creating PR header:", error);
      throw error;
    }
  },

  // Create PR line items
  async createPRLineItems(items, reqNo, runningNo) {
    try {
      if (items.length === 0) return;
      
      // Update all items with the reqNo from header
      items.forEach(item => {
        item.reqNo = reqNo;
        item.RunningNo = runningNo;
      });
      
      const convertedItems = prepareReqDetailsForApi(items);
      
      // Save line items
      const response = await apiService.post("reqdetails", convertedItems);
      return response;
    } catch (error) {
      console.error("Error creating PR line items:", error);
      throw error;
    }
  },


  // Create complete PR (header + line items)
  async createPR(header, items) {
    try {
      // ── Take the PR number BEFORE creating anything ─────────────────────
      // claimControlNumber reads and TAKES the number in one conditional step
      // and verifies the answer (count === 1). The previous code read the number,
      // then asked the server to bump the counter and never checked the reply -
      // so a silently-failed bump handed the same number out again.
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const siteCode = userDetails?.siteCode;
      const codeDesc = "PO REQUISITE";

      let claim;
      try {
        claim = await claimControlNumber({ controlDescription: codeDesc, siteCode });
      } catch (err) {
        // A genuinely missing row is handled by creating it once and then
        // claiming it properly. Anything else (including "could not reserve")
        // must abort, so no PR is ever created on a number we do not own.
        if (!/No ControlNos row/.test(err?.message || "")) throw err;

        console.log(
          `[controlNo] No "${codeDesc}" row for site ${siteCode} - creating it, then claiming`
        );
        await this.createControlNumber(codeDesc, siteCode);
        claim = await claimControlNumber({ controlDescription: codeDesc, siteCode });
      }

      const reqNo = claim.docNo;
      const runningNo = claim.controlNo;
      header.reqNo = reqNo;

      console.log(
        `[controlNo] PR claimed ${reqNo} ` +
          `(strategy=${claim.strategy}, attempt=${claim.attempts}, ` +
          `counter now ${claim.nextControlNo})`
      );
      
      // Create header
      const headerResponse = await this.createPRHeader(header);
      
      // Create line items with reqNo and runningNo
      if (items && items.length > 0) {
        await this.createPRLineItems(items, reqNo, runningNo);
      }
      
      // Return reqNo instead of headerResponse for consistency
      return { reqNo };
    } catch (error) {
      console.error("Error creating PR:", error);
      throw error;
    }
  },

  // Update PR
  async updatePR(reqNo, header) {
    try {
      // Convert empty strings to null before sending
      const convertedHeader = convertEmptyStringsToNull(header);
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, convertedHeader);
    } catch (error) {
      console.error("Error updating PR:", error);
      throw error;
    }
  },

  // Update line item (HQ approval)
  async updatePRLineItem(reqId, item) {
    try {
      const convertedItem = prepareReqDetailsForApi(item)[0];
      await apiService.post(`reqdetails/update?[where][reqId]=${reqId}`, convertedItem);
    } catch (error) {
      console.error("Error updating PR line item:", error);
      throw error;
    }
  },

  // Update multiple line items (for editing existing PR).
  // Pass originalItems (snapshot from load) so removed lines are deleted from reqdetails.
  async updatePRLineItems(items, originalItems = []) {
    try {
      const itemsToDelete = (Array.isArray(originalItems) ? originalItems : []).filter(
        (orig) =>
          orig.reqId != null &&
          orig.reqId !== "" &&
          !items.some((item) => item.reqId === orig.reqId)
      );

      if (itemsToDelete.length > 0) {
        await Promise.all(
          itemsToDelete.map((item) => this.deletePRLineItem(item.reqId))
        );
      }

      const itemsToUpdate = items.filter((item) => item.reqId != null && item.reqId !== "");
      const itemsToCreate = items.filter((item) => !item.reqId || item.reqId === "");

      for (const item of itemsToUpdate) {
        const convertedItem = prepareReqDetailsForApi(item)[0];
        await apiService.post(`reqdetails/update?[where][reqId]=${item.reqId}`, convertedItem);
      }

      if (itemsToCreate.length > 0) {
        const convertedItems = prepareReqDetailsForApi(itemsToCreate);
        await apiService.post("reqdetails", convertedItems);
      }
    } catch (error) {
      console.error("Error updating PR line items:", error);
      throw error;
    }
  },

  // Get PR list (all)
  async getPRList() {
    try {
      const response = await apiService.get("reqs");
      return response;
    } catch (error) {
      console.error("Error getting PR list:", error);
      throw error;
    }
  },

  // Get PR list for site
  async getPRListBySite(siteCode) {
    try {
      const filter = { where: { itemsiteCode: siteCode } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`reqs${query}`);
      return response;
    } catch (error) {
      console.error("Error getting PR list by site:", error);
      throw error;
    }
  },

  // Get pending PRs at HQ
  async getPendingPRsAtHQ() {
    try {
      const filter = {
        where: {
          and: [
            { reqStatus: "Posted" },
            { suppCode: "HQ" }
          ]
        }
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`reqs${query}`);
      return response;
    } catch (error) {
      console.error("Error getting pending PRs at HQ:", error);
      throw error;
    }
  },

  // Get PR details
  async getPR(reqNo) {
    try {
      const filter = { where: { reqNo } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`reqs${query}`);
      return response[0];
    } catch (error) {
      console.error("Error getting PR:", error);
      throw error;
    }
  },

  // Get PR line items
  async getPRLineItems(reqNo) {
    try {
      const filter = { where: { reqNo } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`reqdetails${query}`);
      return response;
    } catch (error) {
      console.error("Error getting PR line items:", error);
      throw error;
    }
  },

  // Delete line item
  async deletePRLineItem(reqId) {
    try {
      await apiService.delete(`reqdetails/${reqId}`);
    } catch (error) {
      console.error("Error deleting PR line item:", error);
      throw error;
    }
  },


  // Post PR (submit to HQ)
  async postPR(reqNo) {
    try {
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
        reqStatus: "Posted"
      });
    } catch (error) {
      console.error("Error posting PR:", error);
      throw error;
    }
  },

  // Approve PR (HQ)
  async approvePR(reqNo) {
    try {
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
        reqStatus: "Approved"
      });
    } catch (error) {
      console.error("Error approving PR:", error);
      throw error;
    }
  },

  // Reject PR (HQ)
  async rejectPR(reqNo) {
    try {
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
        reqStatus: "Rejected"
      });
    } catch (error) {
      console.error("Error rejecting PR:", error);
      throw error;
    }
  },

  // Check HQ stock availability
  async checkHQStock(itemCode, hqSiteCode) {
    try {
      const filter = {
        where: {
          and: [
            { storeNo: hqSiteCode },
            { itemcode: itemCode }
          ]
        },
        order: 'id DESC',
        limit: 1
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`Stktrns${query}`);
      return response[0] || null;
    } catch (error) {
      console.error("Error checking HQ stock:", error);
      throw error;
    }
  },

  // Batch check stock availability
  async batchCheckHQStock(itemCodes, hqSiteCode) {
    try {
      const stockMap = new Map();
      
      await Promise.all(
        itemCodes.map(async (itemCode) => {
          const stock = await this.checkHQStock(itemCode, hqSiteCode);
          if (stock) {
            stockMap.set(itemCode, stock);
          }
        })
      );
      
      return stockMap;
    } catch (error) {
      console.error("Error batch checking HQ stock:", error);
      throw error;
    }
  },

  // Approve PR with modified quantities (transfer + stock before PR status = Approved)
  async approvePRWithQuantities(reqNo, lineItems, createTransfer = false, options = {}) {
    const { dispatchImmediately = false, createGrn = false } = options;

    try {
      const prData = await this.getPR(reqNo);
      if (!prData) {
        throw new Error(`Purchase Requisition ${reqNo} not found`);
      }

      const alreadyApproved = prData.reqStatus === "Approved";

      if (alreadyApproved) {
        if (createTransfer) {
          const shortCircuit = await tryCompleteApprovedPrTransfer(reqNo, true);
          if (shortCircuit.done) {
            return shortCircuit.result;
          }
        } else if (createGrn) {
          const grnDone = await tryCompleteApprovedPrGrn(reqNo);
          if (grnDone.done) {
            return grnDone.result;
          }
        } else {
          return {
            success: true,
            docNo: null,
            mode: null,
            hqDispatched: false,
            message: "Purchase Requisition already approved",
          };
        }
      } else {
        await saveApprovedQuantitiesOnLines(lineItems);
      }

      let transferResult = null;
      let grnResult = null;
      let hqDispatched = false;

      if (createTransfer) {
        transferResult = await this.processPrApprovalTransfer(prData, lineItems);

        if (
          dispatchImmediately &&
          transferResult?.mode === "two-way" &&
          transferResult?.docNo &&
          transferResult?.header &&
          transferResult?.details?.length
        ) {
          const dispatchResult = await executeDeliveryOrderOut({
            docNo: transferResult.docNo,
            header: transferResult.header,
            details: transferResult.details,
          });
          hqDispatched = !dispatchResult.alreadyDone;
        }
      } else if (createGrn) {
        grnResult = await processPrApprovalGrn(prData, lineItems);
      }

      if (!alreadyApproved) {
        await markPrApproved(reqNo);
      }

      const docResult = transferResult || grnResult;

      return {
        success: true,
        docNo: docResult?.docNo || null,
        mode: docResult?.mode || null,
        hqDispatched,
        message:
          docResult?.message || "Purchase Requisition approved successfully",
      };
    } catch (error) {
      console.error("Error approving PR with quantities:", error);
      throw error;
    }
  },

  /** Open PR-linked GTIs from HQ awaiting Delivery Order Out (Two-Way flow). */
  async getPendingDispatchGtis(hqSiteCode = null, search = "") {
    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    const effectiveHQ =
      hqSiteCode || userDetails?.HQSiteCode || userDetails?.siteCode || "HQ";

    if (!getConfigValue("PR_USE_DELIVERY_ORDER")) {
      return [];
    }

    const hdrFilter = {
      where: {
        and: [
          { movCode: "TFRF" },
          { fstoreNo: effectiveHQ },
          { docStatus: 0 },
        ],
      },
      order: "docNo DESC",
    };

    const headers = await apiService.get(
      `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(hdrFilter))}`
    );

    const openPrGtis = (Array.isArray(headers) ? headers : []).filter(isPrLinkedGtiHeader);
    const pending = [];

    for (const hdr of openPrGtis) {
      const dispatched = await isHqDispatchDone(hdr.docNo, effectiveHQ);
      if (dispatched) continue;
      pending.push({
        ...hdr,
        prNo: hdr.docRef1 || "",
      });
    }

    const term = String(search || "").trim().toLowerCase();
    if (!term) return pending;

    return pending.filter(
      (row) =>
        String(row.docNo || "").toLowerCase().includes(term) ||
        String(row.docRef1 || "").toLowerCase().includes(term) ||
        String(row.tstoreNo || "").toLowerCase().includes(term)
    );
  },

  /** Map PR numbers to linked GTI dispatch status for HQ approved list. */
  async getPrGtiDispatchInfoByReqNos(reqNos = [], hqSiteCode = null) {
    const map = {};
    const list = Array.isArray(reqNos) ? reqNos.filter(Boolean) : [];

    if (!list.length || !getConfigValue("PR_USE_DELIVERY_ORDER")) {
      return map;
    }

    const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
    const effectiveHQ =
      hqSiteCode || userDetails?.HQSiteCode || userDetails?.siteCode || "HQ";

    const filter = {
      where: {
        and: [{ movCode: "TFRF" }, { docRef1: { inq: list } }],
      },
    };

    const gtis = await apiService.get(
      `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(filter))}`
    );
    const gtiRows = (Array.isArray(gtis) ? gtis : []).filter(isPrLinkedGtiHeader);

    for (const reqNo of list) {
      const gti = gtiRows.find((row) => row.docRef1 === reqNo);
      if (!gti) {
        map[reqNo] = { status: "none", gtiDocNo: null };
        continue;
      }

      if (gti.docStatus === 7 || gti.docStatus === "7") {
        map[reqNo] = { status: "complete", gtiDocNo: gti.docNo };
        continue;
      }

      const dispatched = await isHqDispatchDone(gti.docNo, gti.fstoreNo || effectiveHQ);
      map[reqNo] = {
        status: dispatched ? "dispatched" : "pending",
        gtiDocNo: gti.docNo,
      };
    }

    return map;
  },

  /** Load GTI header and line items by document number. */
  async getGtiWithDetails(docNo) {
    if (!docNo) {
      throw new Error("Transfer document number is required");
    }

    const hdrFilter = { where: { docNo } };
    const headers = await apiService.get(
      `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(hdrFilter))}`
    );
    const header = Array.isArray(headers) ? headers[0] : null;
    if (!header) {
      throw new Error(`Transfer ${docNo} not found`);
    }

    const dtlFilter = { where: { docNo } };
    const details = await apiService.get(
      `StkMovdocDtls?filter=${encodeURIComponent(JSON.stringify(dtlFilter))}`
    );

    return {
      header,
      details: Array.isArray(details) ? details : [],
    };
  },

  /** HQ Delivery Order Out by GTI doc number (no need to open full GTI form). */
  async executeDeliveryOrderOutByDocNo(docNo) {
    const { header, details } = await this.getGtiWithDetails(docNo);
    if (!details.length) {
      throw new Error("No items to dispatch");
    }
    if (!isPrLinkedGtiHeader(header)) {
      throw new Error("This transfer is not linked to a Purchase Requisition");
    }

    return executeDeliveryOrderOut({ docNo, header, details });
  },

  // Reject PR with reason
  async rejectPR(reqNo, reason = "") {
    try {
      // 1. Update PR status to "Rejected"
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
        reqStatus: "Rejected",
        reqRemk2: reason // Store rejection reason in remarks
      });

      return { success: true };
    } catch (error) {
      console.error("Error rejecting PR:", error);
      throw error;
    }
  },

  // Sum qty on open PR-linked GTIs where HQ has not yet clicked Delivery Order Out
  async getOpenGtiCommittedQuantities(hqSiteCode = null) {
    const userDetails = JSON.parse(localStorage.getItem("userDetails"));
    const effectiveHQ = hqSiteCode || userDetails?.HQSiteCode || "HQ";
    const committed = new Map();

    if (!getConfigValue("PR_USE_DELIVERY_ORDER")) {
      return committed;
    }

    const hdrFilter = {
      where: {
        and: [
          { movCode: "TFRF" },
          { fstoreNo: effectiveHQ },
          { docStatus: 0 },
        ],
      },
    };
    const headers = await apiService.get(
      `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(hdrFilter))}`
    );

    const openPrGtis = (Array.isArray(headers) ? headers : []).filter((h) => {
      const remk1 = String(h.docRemk1 || "");
      return remk1.includes("Created from PR:") && !remk1.includes("via DO:");
    });

    for (const hdr of openPrGtis) {
      const dispatched = await isHqDispatchDone(hdr.docNo, effectiveHQ);
      if (dispatched) continue;

      const dtlFilter = { where: { docNo: hdr.docNo } };
      const lines = await apiService.get(
        `StkMovdocDtls?filter=${encodeURIComponent(JSON.stringify(dtlFilter))}`
      );
      for (const line of Array.isArray(lines) ? lines : []) {
        const key = `${line.itemcode}|${line.docUom}`;
        committed.set(key, (committed.get(key) || 0) + Number(line.docQty || 0));
      }
    }

    return committed;
  },

  // Validate HQ stock availability for approved quantities
  async validateHQStockForApproval(lineItems, hqSiteCode = null) {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const effectiveHQ = hqSiteCode || userDetails?.HQSiteCode || "HQ";
      const validationErrors = [];
      const committedByItem = await this.getOpenGtiCommittedQuantities(effectiveHQ);

      for (const item of lineItems) {
        const approvedQty = getApprovedQty(item);
        if (approvedQty <= 0) continue;
        const uom = item.docUom;
        const batches = await this.getHQItemBatches(item.reqdItemcode, uom, effectiveHQ);

        // Build availability by batch ("" used for No Batch)
        const availByBatch = new Map();
        let totalAvailable = 0;
        for (const b of batches) {
          const key = (b.batchNo || "").trim();
          availByBatch.set(key, (availByBatch.get(key) || 0) + Number(b.qty || 0));
          totalAvailable += Number(b.qty || 0);
        }

        const committedKey = `${item.reqdItemcode}|${uom}`;
        const committedQty = committedByItem.get(committedKey) || 0;
        totalAvailable = Math.max(0, totalAvailable - committedQty);

        // Use itemRemark1/itemRemark2 for PR, fallback to ordMemo for backward compatibility
        // Parse itemRemark1 format: "fefo-UOM" or "specific-UOM"
        const itemRemark1Raw = item.itemRemark1 || item.ordMemo1 || "fefo";
        let transferMode = "fefo";
        if (itemRemark1Raw.includes("-")) {
          // Extract transfer type before the hyphen (e.g., "fefo" from "fefo-PCS")
          transferMode = itemRemark1Raw.split("-")[0].toLowerCase();
        } else {
          // Backward compatibility: old format without UOM
          transferMode = itemRemark1Raw.toLowerCase();
        }
        const batchBreakdownStr = item.itemRemark2 || item.ordMemo2 || "";
        const specificPairs = batchBreakdownStr
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .filter(pair => !pair.toUpperCase().startsWith("NOBATCH:")) // Exclude NOBATCH entries - handled separately
          .map(pair => {
            const [batchNo, qtyStr] = pair.split(':');
            // Map empty/null batchNo to empty string (NOBATCH items have "" in ItemBatches table)
            const normalizedBatchNo = (batchNo || "").trim();
            return { batchNo: normalizedBatchNo, qty: Number(qtyStr) || 0 };
          });
        // For NOBATCH parsing, check itemRemark2 first, then ordMemo3
        const noBatchMatch = batchBreakdownStr.match(/NOBATCH:(\d+)/);
        const noBatchQty = noBatchMatch ? Number(noBatchMatch[1]) : Number(item.ordMemo3 || 0);

        if (transferMode === 'specific' && (specificPairs.length > 0 || noBatchQty > 0)) {
          // Validate each requested batch against availability
          for (const req of specificPairs) {
            const available = availByBatch.get(req.batchNo) || 0;
            if (available < req.qty) {
              validationErrors.push({
                itemCode: item.reqdItemcode,
                itemDesc: item.reqdItemdesc,
                uom,
                errorType: 'BATCH_SHORTFALL',
                batchNo: req.batchNo || '(No Batch)',
                approvedQty: req.qty,
                availableQty: available,
                shortfall: req.qty - available,
              });
            }
          }
          // Validate No Batch qty (empty batchNo key)
          if (noBatchQty > 0) {
            const availableNoBatch = availByBatch.get("") || 0;
            if (availableNoBatch < noBatchQty) {
              validationErrors.push({
                itemCode: item.reqdItemcode,
                itemDesc: item.reqdItemdesc,
                uom,
                errorType: 'NO_BATCH_SHORTFALL',
                batchNo: '(No Batch)',
                approvedQty: noBatchQty,
                availableQty: availableNoBatch,
                shortfall: noBatchQty - availableNoBatch,
              });
            }
          }
        } else {
          // FEFO mode: ensure cumulative availability (respect FEFO ordering)
          const specificBatches = batches.filter(b => (b.batchNo || "").trim() !== "");
          specificBatches.sort((a, b) => {
            if (!a.expDate && !b.expDate) return 0;
            if (!a.expDate) return 1;
            if (!b.expDate) return -1;
            return new Date(a.expDate) - new Date(b.expDate);
          });
          let remaining = approvedQty;
          for (const b of specificBatches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, Number(b.qty || 0));
            remaining -= take;
          }
          if (remaining > 0) {
            // consume No Batch if available
            const noBatchAvail = availByBatch.get("") || 0;
            const takeNoBatch = Math.min(remaining, noBatchAvail);
            remaining -= takeNoBatch;
          }
          if (remaining > 0) {
            validationErrors.push({
              itemCode: item.reqdItemcode,
              itemDesc: item.reqdItemdesc,
              uom,
              errorType: 'INSUFFICIENT_STOCK_FEFO',
              approvedQty,
              availableQty: totalAvailable,
              shortfall: remaining,
            });
          }
        }
      }
      
      return validationErrors;
    } catch (error) {
      console.error("Error validating HQ stock:", error);
      throw error;
    }
  },

  async saveTransferDocument(header, details) {
    const hdr = { ...header, docLines: details.length };
    await apiService.post("StkMovdocHdrs", hdr);
    if (details.length > 0) {
      await apiService.post("StkMovdocDtls", details);
    }
    return { header: hdr, details };
  },

  // GTI at destination — Open for Two-Way, posted for One-Way (reuses existing PR-linked GTI)
  async createGoodsTransferFromPR(prData, lineItems, options = {}) {
    try {
      const requestingSiteCode = prData.itemsiteCode;
      const { openOnly = true } = options;

      if (!requestingSiteCode) {
        throw new Error("Requesting site code is required to create GTI");
      }

      const { transferLineItems, totals } = calculateTransferTotals(lineItems);
      if (transferLineItems.length === 0) {
        return {
          success: true,
          docNo: null,
          header: null,
          details: [],
          message: "Purchase Requisition approved with no items to transfer",
        };
      }

      const existingGti = await findPrLinkedGtiByReqNo(prData.reqNo);
      if (existingGti?.docNo) {
        const loaded = await this.getGtiWithDetails(existingGti.docNo);
        if (loaded.details.length > 0) {
          console.log(`Reusing GTI ${loaded.header.docNo} for PR ${prData.reqNo}`);
          return {
            success: true,
            docNo: loaded.header.docNo,
            header: loaded.header,
            details: loaded.details,
            message: `Transfer ${loaded.header.docNo} linked to PR ${prData.reqNo}`,
          };
        }

        const details = buildTransferLineDetails(
          prData,
          lineItems,
          existingGti.docNo,
          "TFRF",
          "TFR"
        );
        if (details.length > 0) {
          await apiService.post("StkMovdocDtls", details);
        }
        console.log(`Completed lines on existing GTI ${existingGti.docNo} for PR ${prData.reqNo}`);
        return {
          success: true,
          docNo: existingGti.docNo,
          header: loaded.header,
          details,
          message: `Transfer ${existingGti.docNo} linked to PR ${prData.reqNo}`,
        };
      }

      const docNo = await this.getNextTransferNumber("GTI", requestingSiteCode);
      const details = buildTransferLineDetails(prData, lineItems, docNo, "TFRF", "TFR");
      const header = buildTransferHeader(prData, {
        docNo,
        movCode: "TFRF",
        movType: "TFR",
        storeNo: requestingSiteCode,
        docRef1: prData.reqNo,
        docRef2: prData.reqRef || "",
        docRemk1: `Created from PR: ${prData.reqNo}`,
        docStatus: openOnly ? "0" : "7",
        postDate: openOnly ? "" : moment().format("YYYY-MM-DD"),
        totals,
      });

      await this.saveTransferDocument(header, details);
      console.log(`Created GTI ${docNo} from PR ${prData.reqNo}`);

      return {
        success: true,
        docNo,
        header,
        details,
        message: openOnly
          ? `Transfer ${docNo} created — awaiting receipt at destination`
          : `Transfer ${docNo} completed and stock updated`,
      };
    } catch (error) {
      console.error("Error creating goods transfer from PR:", error);
      throw error;
    }
  },

  async processPrApprovalTransfer(prData, lineItems) {
    const useDeliveryOrder = getConfigValue("PR_USE_DELIVERY_ORDER");

    if (useDeliveryOrder) {
      const gtiResult = await this.createGoodsTransferFromPR(prData, lineItems, {
        openOnly: true,
      });
      if (!gtiResult.docNo) {
        return { ...gtiResult, mode: "two-way" };
      }

      return {
        ...gtiResult,
        mode: "two-way",
        message:
          `PR approved: transfer ${gtiResult.docNo} created. ` +
          `Dispatch from HQ when ready; the store confirms receipt when goods arrive.`,
      };
    }

    const gtiResult = await this.createGoodsTransferFromPR(prData, lineItems, {
      openOnly: true,
    });
    if (!gtiResult.docNo) {
      return { ...gtiResult, mode: "one-way" };
    }

    if (getConfigValue("AUTO_POST") === "Yes") {
      await executePrTransferPost({
        docNo: gtiResult.docNo,
        header: gtiResult.header,
        details: gtiResult.details,
        mode: "full",
      });

      if (!isGtiPosted(gtiResult.header)) {
        const postDate = moment().format("YYYY-MM-DD");
        await apiService.post(
          `StkMovdocHdrs/update?[where][docNo]=${encodeURIComponent(gtiResult.docNo)}`,
          { docStatus: "7", postDate }
        );
        gtiResult.header.docStatus = "7";
        gtiResult.header.postDate = postDate;
      }

      return {
        ...gtiResult,
        mode: "one-way",
        message: `PR approved: transfer ${gtiResult.docNo} completed and stock updated`,
      };
    }

    return {
      ...gtiResult,
      mode: "one-way",
      message:
        `PR approved: transfer ${gtiResult.docNo} created — post from Goods Transfer In when ready`,
    };
  },

  // Get next transfer number
  // siteCodeOverride: when creating GTI from PR, pass requestingSiteCode so doc number is for destination site
  async getNextTransferNumber(transferType, siteCodeOverride = null) {
    const userDetails = JSON.parse(localStorage.getItem("userDetails"));
    const siteCode = siteCodeOverride ?? userDetails?.HQSiteCode ?? userDetails?.siteCode;

    // Map transfer types to control descriptions
    const controlDescriptionMap = {
      GTO: "Transfer To Other Store",
      GTI: "Transfer From Other Store",
      TFRT: "Transfer To Other Store",
      TFRF: "Transfer From Other Store",
      DO: "Delivery Order",
    };
    const controlDescription = controlDescriptionMap[transferType] || transferType;

    // ── Claim the number BEFORE it is used ────────────────────────────────
    let claim;
    try {
      claim = await claimControlNumber({ controlDescription, siteCode });
    } catch (err) {
      if (!/No ControlNos row/.test(err?.message || "")) throw err;

      const prefixMap = {
        GTI: "WGTI",
        TFRF: "WGTI",
        GTO: "WGTO",
        TFRT: "WGTO",
        DO: "WDO",
      };
      console.log(
        `[controlNo] No "${controlDescription}" row for site ${siteCode} - creating it`
      );
      await apiService.post("ControlNos", [
        {
          controlDescription,
          siteCode,
          controlPrefix: prefixMap[transferType] || "WDO",
          controlNo: "110001",
          controldate: moment().format("YYYY-MM-DD"),
          macCode: null,
        },
      ]);
      claim = await claimControlNumber({ controlDescription, siteCode });
    }

    console.log(
      `[controlNo] ${transferType} claimed ${claim.docNo} ` +
        `(strategy=${claim.strategy}, attempt=${claim.attempts}, ` +
        `counter now ${claim.nextControlNo})`
    );
    return claim.docNo;
  }
};

export { isHqSupplier };

export default prApi;

