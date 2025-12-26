import apiService from "./apiService";
import moment from "moment-timezone";

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
      
      // Convert empty strings to null before sending
      const convertedItems = convertEmptyStringsToNull(items);
      
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
      // Get control number first (before creating anything)
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
      const controlResponse = await apiService.get(`ControlNos${query}`);
      
      let reqNo;
      let runningNo;
      let controlNo;
      
      if (controlResponse && controlResponse.length > 0) {
        const control = controlResponse[0];
        reqNo = `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
        runningNo = control.controlNo;
        controlNo = control.controlNo;
      } else {
        // If no control number found, create a new one
        console.log("No control number found, creating new one...");
        reqNo = await this.createControlNumber(codeDesc, siteCode);
        runningNo = "000001";
        controlNo = "000001";
      }
      
      // Set header reqNo
      header.reqNo = reqNo;
      
      // Increment control number BEFORE creating documents
      const newControlNo = (parseInt(controlNo) + 1).toString().padStart(6, '0');
      await apiService.post("ControlNos/updatecontrol", {
        controldescription: codeDesc,
        sitecode: siteCode,
        controlnumber: newControlNo
      });
      
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
      // Convert empty strings to null before sending
      const convertedItem = convertEmptyStringsToNull(item);
      await apiService.post(`reqdetails/update?[where][reqId]=${reqId}`, convertedItem);
    } catch (error) {
      console.error("Error updating PR line item:", error);
      throw error;
    }
  },

  // Update multiple line items (for editing existing PR)
  async updatePRLineItems(items) {
    try {
      for (const item of items) {
        // Convert empty strings to null before sending
        const convertedItem = convertEmptyStringsToNull(item);
        
        if (item.reqId && item.reqId !== "") {
          // Update existing item
          await apiService.post(`reqdetails/update?[where][reqId]=${item.reqId}`, convertedItem);
        } else {
          // Create new item
          await apiService.post("reqdetails", convertedItem);
        }
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

  // Approve PR with modified quantities
  async approvePRWithQuantities(reqNo, lineItems, createTransfer = false) {
    try {
      // 1. Update PR header status to "Approved"
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, {
        reqStatus: "Approved"
      });

      // 2. Update each line item with approved quantities
      for (const item of lineItems) {
        if (item.reqId && item.reqId !== "") {
          await apiService.post(`reqdetails/update?[where][reqId]=${item.reqId}`, {
            reqAppqty: item.reqAppqty || item.reqdQty, // Use approved qty or default to requested qty
            reqdQty: item.reqdQty // Keep original requested qty
          });
        }
      }

      // 3. If createTransfer is true, call createGoodsTransferFromPR
      let transferResult = null;
      if (createTransfer) {
        const prData = await this.getPR(reqNo);
        transferResult = await this.createGoodsTransferFromPR(prData, lineItems);
      }

      return { 
        success: true,
        docNo: transferResult?.docNo || null,
        message: transferResult?.message || "Purchase Requisition approved successfully"
      };
    } catch (error) {
      console.error("Error approving PR with quantities:", error);
      throw error;
    }
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

  // Validate HQ stock availability for approved quantities
  async validateHQStockForApproval(lineItems, hqSiteCode = null) {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const effectiveHQ = hqSiteCode || userDetails?.HQSiteCode || "HQ";
      const validationErrors = [];
      for (const item of lineItems) {
        const approvedQty = parseFloat(item.reqAppqty || item.reqdQty || 0);
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

  // Create goods transfer from approved PR (creates OPEN GTO document)
  async createGoodsTransferFromPR(prData, lineItems) {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const hqSiteCode = userDetails?.HQSiteCode || userDetails?.siteCode || "HQ";
      const requestingSiteCode = prData.itemsiteCode;
      
      // 1. Get GTO document number
      const docNo = await this.getNextTransferNumber("GTO");
      if (!docNo) {
        throw new Error("Failed to generate GTO document number");
      }

      // 2. Calculate totals
      const totals = lineItems.reduce(
        (acc, item) => ({
          totalQty: acc.totalQty + Number(item.reqAppqty || item.reqdQty || 0),
          totalFoc: acc.totalFoc + Number(item.reqdFocqty || 0),
          totalDisc: acc.totalDisc + Number(item.reqdDiscamt || 0),
          totalAmt: acc.totalAmt + Number(item.reqdAmt || 0),
        }),
        { totalQty: 0, totalFoc: 0, totalDisc: 0, totalAmt: 0 }
      );
      
      // Format totals to 2 decimal places
      totals.totalDisc = parseFloat(totals.totalDisc.toFixed(2));
      totals.totalAmt = parseFloat(totals.totalAmt.toFixed(2));

      // 3. Create GTO header (StkMovdocHdrs) - Status 0 (Open)
      const gtoHeader = {
        docNo: docNo,
        movCode: "TFRT",
        movType: "TFR",
        storeNo: hqSiteCode, // Current store (HQ)
        fstoreNo: hqSiteCode, // From store (HQ)
        tstoreNo: requestingSiteCode, // To store (requesting site)
        docRef1: prData.reqNo, // Link to PR
        docRef2: prData.reqRef || "",
        docLines: lineItems.length,
        docDate: moment().format("YYYY-MM-DD"),
        postDate: "", // Empty for Open documents
        docStatus: "0", // Open status (not posted)
        docQty: totals.totalQty,
        docAmt: totals.totalAmt, // Already formatted to 2 decimal places
        docAttn: prData.reqAttn || "",
        docRemk1: `Created from PR: ${prData.reqNo}`,
        staffNo: userDetails?.usercode || userDetails?.username || "SYSTEM",
        bname: prData.reqBname || "",
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

      // 4. Create GTO line items (StkMovdocDtls)
      const gtoDetails = lineItems.map((item, index) => {
        const approvedQty = parseFloat(item.reqAppqty || item.reqdQty || 0);
        const focQty = parseFloat(item.reqdFocqty || 0);
        const totalQty = approvedQty + focQty;
        const price = parseFloat(parseFloat(item.reqdItemprice || item.reqdPrice || 0).toFixed(2));
        const discPer = parseFloat(parseFloat(item.reqdDiscper || 0).toFixed(2));
        
        // Recalculate discount amount and amount from base values to ensure precision
        // This prevents floating point precision errors (e.g., 37.599998474121094)
        // Format to exactly 2 decimal places using toFixed(2) and parseFloat
        const discAmt = parseFloat(((approvedQty * price * discPer) / 100).toFixed(2));
        const amount = parseFloat(((approvedQty * price) - discAmt).toFixed(2));
        
        // Parse batch information from PR fields
        // itemRemark1 format: "fefo-UOM" or "specific-UOM" (e.g., "fefo-PCS", "specific-BOTTLE")
        const itemRemark1Raw = item.itemRemark1 || item.ordMemo1 || "fefo";
        let transferType = "fefo";
        let extractedUOM = null;
        
        // Parse the new format: "transferType-UOM" or fallback to old format
        if (itemRemark1Raw.includes("-")) {
          const parts = itemRemark1Raw.split("-");
          transferType = parts[0].toLowerCase(); // Extract "fefo" or "specific"
          extractedUOM = parts.slice(1).join("-"); // Extract UOM (handles multi-part UOM like "PCS-EXTRA")
        } else {
          // Backward compatibility: old format without UOM
          transferType = itemRemark1Raw.toLowerCase();
        }
        
        // Use UOM from itemRemark1 if available, otherwise use docUom
        const docUom = extractedUOM || item.docUom || "PCS";
        
        const batchBreakdownStr = item.itemRemark2 || item.ordMemo2 || "";

        // Extract "No Batch" quantity from itemRemark2 using NOBATCH pattern (ONLY source)
        const noBatchMatch = batchBreakdownStr.match(/NOBATCH:(\d+)/i);
        const noBatchQty = noBatchMatch ? String(noBatchMatch[1]) : "0";

        // Clean batchBreakdownStr - remove NOBATCH entries for ordMemo2 storage
        // This matches addGto.jsx pattern where ordMemo2 only contains batch breakdown
        // without NOBATCH entries (which are stored separately in ordMemo3)
        const cleanBatchBreakdownStr = batchBreakdownStr
          .split(',')
          .filter(pair => {
            const trimmed = pair.trim();
            return trimmed && !trimmed.toUpperCase().startsWith("NOBATCH:");
          })
          .join(',');

        // Prefer ordMemo4 (ISO format) over docExpdate (YYYY-MM-DD format)
        // ordMemo4 is the source of truth for expiry dates in ISO format (matching GTO)
        const ordMemo4Source = item.ordMemo4 || "";
        const docExpdateSource = item.docExpdate || "";
        
        // Parse batch breakdown for recQty fields and build ordMemo4
        let recQtyFields = { recQty1: 0, recQty2: 0, recQty3: 0, recQty4: 0, recQty5: 0 };
        let ordMemo4Str = ""; // Initialize ordMemo4 string (will store ISO format)
        
        // Helper function to convert date to ISO format (handles both ISO and YYYY-MM-DD)
        const convertDateToISO = (dateStr) => {
          if (!dateStr || dateStr.trim() === "") return "";
          
          try {
            // If already in ISO format, return as-is
            if (dateStr.includes("T") || dateStr.includes("Z")) {
              return dateStr;
            }
            
            // Try to parse with moment and convert to ISO
            const parsedDate = moment(dateStr);
            if (parsedDate.isValid()) {
              return parsedDate.toISOString();
            }
            
            // If moment fails, try to extract date part and convert
            const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const dateOnly = dateMatch[1];
              const parsed = moment(dateOnly);
              if (parsed.isValid()) {
                return parsed.toISOString();
              }
            }
            
            // Fallback to original string
            return dateStr;
          } catch (e) {
            // Fallback to original string if conversion fails
            return dateStr;
          }
        };

        if (cleanBatchBreakdownStr && transferType === "specific") {
          const batchPairs = cleanBatchBreakdownStr.split(",").filter(Boolean);
          
          // Use ordMemo4 if available (ISO format), otherwise use docExpdate (YYYY-MM-DD)
          const expDateSource = ordMemo4Source || docExpdateSource;
          const expDatePairs = expDateSource ? expDateSource.split(",").filter(Boolean) : [];
          
          // Build ordMemo4 in format: expDate:qty,expDate:qty,... (ISO format matching addGto.jsx pattern)
          const ordMemo4Parts = batchPairs.map((pair, idx) => {
            const [batchNo, qty] = pair.split(":");
            const qtyNum = parseFloat(qty) || 0;
            
            // Match expiry date by position (assuming same order as batch pairs)
            let expDate = "";
            if (expDatePairs[idx]) {
              // Parse expDate:qty format, extract just the date part
              const expDatePair = expDatePairs[idx];
              const lastColonIndex = expDatePair.lastIndexOf(":");
              if (lastColonIndex > 0) {
                const rawDate = expDatePair.substring(0, lastColonIndex).trim();
                // Convert to ISO format (handles both ISO and YYYY-MM-DD input)
                expDate = convertDateToISO(rawDate);
              } else {
                // If no colon, treat entire string as date and convert to ISO
                expDate = convertDateToISO(expDatePair.trim());
              }
            }
            
            // Store recQty fields for first 4 batches
            if (idx < 4) {
              recQtyFields[`recQty${idx + 1}`] = qtyNum;
            }
            
            // Build ordMemo4 part: expDate:qty (with ISO format date)
            return `${expDate}:${qtyNum}`;
          });
          
          ordMemo4Str = ordMemo4Parts.join(",");
          
          // Store "No Batch" quantity in recQty5
          recQtyFields.recQty5 = parseFloat(noBatchQty) || 0;
        } else {
          // For FEFO or no batch info, use ordMemo4 directly if it exists (ISO format)
          // Otherwise convert docExpdate to ISO format
          if (ordMemo4Source) {
            // Already in ISO format, use directly
            ordMemo4Str = ordMemo4Source;
          } else if (docExpdateSource) {
            // Convert YYYY-MM-DD format to ISO format
            try {
              const formattedParts = docExpdateSource.split(",").map(part => {
                const lastColonIndex = part.lastIndexOf(":");
                if (lastColonIndex > 0) {
                  const datePart = part.substring(0, lastColonIndex).trim();
                  const qtyPart = part.substring(lastColonIndex + 1);
                  const isoDate = convertDateToISO(datePart);
                  return `${isoDate}:${qtyPart}`;
                }
                // If no colon, try to convert the whole part as a date
                return convertDateToISO(part.trim());
              });
              ordMemo4Str = formattedParts.join(",");
            } catch (e) {
              ordMemo4Str = docExpdateSource; // Fallback to original
            }
          } else {
            ordMemo4Str = "";
          }
        }

        // docExpdate should be empty string - dates are stored in ordMemo4
        // This matches the pattern used in GTO, GTI, RTN, and ADJ modules
        // For specific batches: dates in ordMemo4 format "date:qty,date:qty"
        // For FEFO: dates will be fetched from ItemBatches API when needed
        // SQL Server expects docExpdate to be either empty or a single date, not "date:qty,date:qty" format

        // Format all amount fields to exactly 2 decimal places before posting
        // Use parseFloat(value.toFixed(2)) to ensure exactly 2 decimal places
        // This prevents floating point precision errors when posting to database
        const formattedPrice = parseFloat(price.toFixed(2));
        const formattedDiscPer = parseFloat(discPer.toFixed(2));
        const formattedDiscAmt = parseFloat(discAmt.toFixed(2));
        const formattedAmount = parseFloat(amount.toFixed(2));

        return {
          docNo: docNo,
          movCode: "TFRT",
          movType: "TFR",
          docLineno: index + 1,
          docDate: moment().format("YYYY-MM-DD"),
          createDate: moment().format("YYYY-MM-DD"),
          itemcode: item.reqdItemcode,
          itemdesc: item.reqdItemdesc,
          docQty: approvedQty,
          docFocqty: focQty,
          docTtlqty: totalQty,
          docPrice: formattedPrice,
          docPdisc: formattedDiscPer,
          docDisc: formattedDiscAmt,
          docAmt: formattedAmount,
          ...recQtyFields,
          recTtl: totalQty,
          postedQty: 0,
          cancelQty: 0,
          createUser: userDetails?.username || "SYSTEM",
          docUom: docUom, // Use UOM from itemRemark1 or fallback to docUom
          docExpdate: "", // Always empty - matches pattern in GTO, GTI, RTN, ADJ
          docBatchNo: item.docBatchNo || "",
          itmBrand: item.brandcode || "",
          itmRange: "",
          itmBrandDesc: item.brandname || "",
          itmRangeDesc: "",
          DOCUOMDesc: item.DOCUOMDesc || "",
          itemRemark: item.itemRemark || "",
          docMdisc: 0,
          itemprice: formattedPrice,
          // Store batch transfer information in ordMemo fields
          ordMemo1: transferType,
          ordMemo2: cleanBatchBreakdownStr, // Clean batch breakdown WITHOUT NOBATCH entries
          ordMemo3: noBatchQty, // "No Batch" quantity as string (extracted from itemRemark2)
          ordMemo4: ordMemo4Str, // Expiry dates in format: expDate:qty,expDate:qty,... (same as addGto.jsx)
        };
      });

      // 5. Save GTO header and details
      await apiService.post("StkMovdocHdrs", gtoHeader);
      if (gtoDetails.length > 0) {
        await apiService.post("StkMovdocDtls", gtoDetails);
      }

      console.log(`✅ Created Open GTO document: ${docNo} with ${gtoDetails.length} items`);

      return {
        success: true,
        docNo: docNo,
        message: `GTO document ${docNo} created successfully (Open status)`
      };
    } catch (error) {
      console.error("Error creating goods transfer from PR:", error);
      throw error;
    }
  },

  // Get next transfer number
  async getNextTransferNumber(transferType) {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      // Use HQ site code for GTO creation from PR approval
      const siteCode = userDetails?.HQSiteCode || userDetails?.siteCode;
      
      // Map transfer types to control descriptions
      const controlDescriptionMap = {
        "GTO": "Transfer To Other Store",
        "GTI": "Transfer From Other Store",
        "TFRT": "Transfer To Other Store",
        "TFRF": "Transfer From Other Store"
      };
      
      const controlDescription = controlDescriptionMap[transferType] || transferType;
      
      const filter = { 
        where: { 
          controlDescription: controlDescription,
          siteCode: siteCode
        } 
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`ControlNos${query}`);
      
      if (response && response.length > 0) {
        const control = response[0];
        const docNo = `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
        
        // Increment control number
        const newControlNo = (parseInt(control.controlNo, 10) + 1).toString().padStart(6, '0');
        await apiService.post("ControlNos/updatecontrol", {
          controldescription: controlDescription,
          sitecode: siteCode,
          controlnumber: newControlNo
        });
        
        return docNo;
      }
      
      // If no control number found, create one
      console.log(`No control number found for ${controlDescription} at ${siteCode}, creating new one...`);
      const prefix = transferType === "GTI" || transferType === "TFRF" ? "GTI" : "GTO";
      const newControlData = {
        controlDescription: controlDescription,
        siteCode: siteCode,
        controlPrefix: prefix,
        controlNo: "000001",
        controldate: moment().format("YYYY-MM-DD"),
        macCode: null,
      };
      
      const createResponse = await apiService.post("ControlNos", [newControlData]);
      const docNo = `${newControlData.controlPrefix}${newControlData.siteCode}${newControlData.controlNo}`;
      
      // Increment it immediately since we're using it
      await apiService.post("ControlNos/updatecontrol", {
        controldescription: controlDescription,
        sitecode: siteCode,
        controlnumber: "000002"
      });
      
      return docNo;
    } catch (error) {
      console.error("Error getting next transfer number:", error);
      throw error;
    }
  }
};

export default prApi;

