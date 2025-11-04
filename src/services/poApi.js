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

  // Create PO header
  async createPOHeader(header) {
    try {
      // Get control number first
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const siteCode = userDetails?.siteCode;
      const filter = {
        where: {
          and: [
            { controlDescription: "PO" },
            { siteCode: siteCode }
          ]
        }
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const controlResponse = await apiService.get(`ControlNos${query}`);
      
      if (controlResponse && controlResponse.length > 0) {
        const control = controlResponse[0];
        header.poNo = `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
      }
      
      // Save header
      const response = await apiService.post("pos", [header]);
      return response;
    } catch (error) {
      console.error("Error creating PO header:", error);
      throw error;
    }
  },

  // Create PO line items
  async createPOLineItems(items) {
    try {
      if (items.length === 0) return;
      
      // Get control number for line items
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const siteCode = userDetails?.siteCode;
      const filter = {
        where: {
          and: [
            { controlDescription: "PO" },
            { siteCode: siteCode }
          ]
        }
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const controlResponse = await apiService.get(`ControlNos${query}`);
      
      if (controlResponse && controlResponse.length > 0) {
        const control = controlResponse[0];
        const poNo = `${control.controlPrefix}${control.siteCode}${control.controlNo}`;
        const runningNo = control.controlNo;
        
        // Update all items with the same poNo
        items.forEach(item => {
          item.poNo = poNo;
          item.RunningNo = runningNo;
        });
      }
      
      // Save line items
      const response = await apiService.post("podetails", items);
      
      // Update control number
      if (controlResponse && controlResponse.length > 0) {
        const control = controlResponse[0];
        const controlNo = control.controlNo;
        const newControlNo = (parseInt(controlNo) + 1).toString().padStart(6, '0');
        
        await apiService.post("ControlNos/updatecontrol", {
          controldescription: "PO",
          sitecode: siteCode,
          controlnumber: newControlNo
        });
      }
      
      return response;
    } catch (error) {
      console.error("Error creating PO line items:", error);
      throw error;
    }
  },

  // Create complete PO (header + line items)
  async createPO(header, items) {
    try {
      // Create header first
      const headerResponse = await this.createPOHeader(header);
      
      // Create line items
      if (items && items.length > 0) {
        await this.createPOLineItems(items);
      }
      
      return headerResponse;
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

  // Update multiple line items (for editing existing PO)
  async updatePOLineItems(items) {
    try {
      for (const item of items) {
        if (item.poId && item.poId !== "") {
          // Update existing item
          await apiService.post(`podetails/update?[where][poId]=${item.poId}`, item);
        } else {
          // Create new item
          await apiService.post("podetails", item);
        }
      }
    } catch (error) {
      console.error("Error updating PO line items:", error);
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

