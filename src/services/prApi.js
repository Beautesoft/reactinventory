import apiService from "./apiService";

const BASE_URL = ""; // Will use the base URL from apiService

export const prApi = {
  // Get next PR number
  async getNextPRNumber() {
    try {
      const filter = { where: { controlDescription: "PO REQUISITE" } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`ControlNos${query}`);
      if (response && response.length > 0) {
        const control = response[0];
        return `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
      }
      throw new Error("No control number found");
    } catch (error) {
      console.error("Error getting next PR number:", error);
      throw error;
    }
  },

  // Create PR
  async createPR(header, items) {
    try {
      // Save header
      await apiService.post("reqs", [header]);
      
      // Save line items
      await apiService.post("reqdetails", items);
      
      // Update control number
      const controlNo = header.reqNo.slice(-6);
      const newControlNo = (parseInt(controlNo) + 1).toString().padStart(6, '0');
      await apiService.post("ControlNos/updatecontrol", {
        controldescription: "PO REQUISITE",
        controlnumber: newControlNo
      });
    } catch (error) {
      console.error("Error creating PR:", error);
      throw error;
    }
  },

  // Update PR
  async updatePR(reqNo, header) {
    try {
      await apiService.post(`reqs/update?[where][reqNo]=${reqNo}`, header);
    } catch (error) {
      console.error("Error updating PR:", error);
      throw error;
    }
  },

  // Update line item (HQ approval)
  async updatePRLineItem(reqId, item) {
    try {
      await apiService.post(`reqdetails/update?[where][reqId]=${reqId}`, item);
    } catch (error) {
      console.error("Error updating PR line item:", error);
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
  }
};

export default prApi;

