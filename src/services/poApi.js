import apiService from "./apiService";

const BASE_URL = ""; // Will use the base URL from apiService

export const poApi = {
  // Get next PO number
  async getNextPONumber(siteCode) {
    try {
      const filter = {
        where: {
          and: [
            { controlDescription: "PO" },
            { siteCode: siteCode }
          ]
        }
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`ControlNos${query}`);
      if (response && response.length > 0) {
        const control = response[0];
        return `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
      }
      throw new Error("No control number found");
    } catch (error) {
      console.error("Error getting next PO number:", error);
      throw error;
    }
  },

  // Create PO
  async createPO(header, items) {
    try {
      // Save header
      await apiService.post("pos", [header]);
      
      // Save line items
      await apiService.post("podetails", items);
      
      // Update control number
      const controlNo = header.poNo.slice(-6);
      const newControlNo = (parseInt(controlNo) + 1).toString().padStart(6, '0');
      await apiService.post("ControlNos/updatecontrol", {
        controldescription: "PO",
        sitecode: header.itemsiteCode,
        controlnumber: newControlNo
      });
    } catch (error) {
      console.error("Error creating PO:", error);
      throw error;
    }
  },

  // Update PO
  async updatePO(poNo, header) {
    try {
      await apiService.post(`pos/update?[where][poNo]=${poNo}`, header);
    } catch (error) {
      console.error("Error updating PO:", error);
      throw error;
    }
  },

  // Update line item
  async updatePOLineItem(poId, item) {
    try {
      await apiService.post(`podetails/update?[where][poId]=${poId}`, item);
    } catch (error) {
      console.error("Error updating PO line item:", error);
      throw error;
    }
  },

  // Get PO list
  async getPOList(siteCode) {
    try {
      const filter = { where: { itemsiteCode: siteCode } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`pos${query}`);
      return response;
    } catch (error) {
      console.error("Error getting PO list:", error);
      throw error;
    }
  },

  // Get PO details
  async getPO(poNo) {
    try {
      const filter = { where: { poNo } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`pos${query}`);
      return response[0];
    } catch (error) {
      console.error("Error getting PO:", error);
      throw error;
    }
  },

  // Get PO line items
  async getPOLineItems(poNo) {
    try {
      const filter = { where: { poNo } };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`podetails${query}`);
      return response;
    } catch (error) {
      console.error("Error getting PO line items:", error);
      throw error;
    }
  },

  // Delete line item
  async deletePOLineItem(poId) {
    try {
      await apiService.delete(`podetails/${poId}`);
    } catch (error) {
      console.error("Error deleting PO line item:", error);
      throw error;
    }
  },

  // Post PO
  async postPO(poNo) {
    try {
      await apiService.post(`pos/update?[where][poNo]=${poNo}`, {
        poStatus: "Posted"
      });
    } catch (error) {
      console.error("Error posting PO:", error);
      throw error;
    }
  },

  // Approve PO
  async approvePO(poNo) {
    try {
      await apiService.post(`pos/update?[where][poNo]=${poNo}`, {
        poStatus: "Approved"
      });
    } catch (error) {
      console.error("Error approving PO:", error);
      throw error;
    }
  }
};

export default poApi;

