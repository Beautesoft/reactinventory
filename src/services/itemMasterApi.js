import apiService from "./apiService";

/**
 * Item Master API - uses apiService (lb/api) for all endpoints.
 * No legacy Redux; direct apiService calls.
 */

const buildFilter = (where = {}, skip, limit, order) => {
  const filter = { where };
  if (skip != null) filter.skip = skip;
  if (limit != null) filter.limit = limit;
  if (order) filter.order = order;
  return filter;
};

const queryString = (filter) =>
  `?filter=${encodeURIComponent(JSON.stringify(filter))}`;

export const itemMasterApi = {
  // List stocks (item master records)
  async getStocks(filterOverrides = {}) {
    const filter = buildFilter(
      filterOverrides.where || {},
      filterOverrides.skip,
      filterOverrides.limit ?? 1000,
      filterOverrides.order || "itemCode ASC"
    );
    const res = await apiService.get(`Stocks${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },

  // Get single stock by itemCode (for edit page)
  async getStockByItemCode(itemCode) {
    const filter = { where: { itemCode }, limit: 1 };
    const res = await apiService.get(`Stocks${queryString(filter)}`);
    const list = Array.isArray(res) ? res : [];
    return list[0] ?? null;
  },

  // Count stocks
  async getStocksCount(where = {}) {
    const q = `?where=${encodeURIComponent(JSON.stringify(where))}`;
    const res = await apiService.get(`Stocks/count${q}`);
    return res?.count ?? 0;
  },

  // Lookups
  async getItemDivs() {
    const res = await apiService.get("ItemDivs");
    return Array.isArray(res) ? res : [];
  },
  async getItemClasses() {
    const res = await apiService.get("ItemClasses");
    return Array.isArray(res) ? res : [];
  },
  async createItemClass(payload) {
    return apiService.post("ItemClasses", payload);
  },
  async getItemDepts() {
    const res = await apiService.get("ItemDepts");
    return Array.isArray(res) ? res : [];
  },
  async createItemDept(payload) {
    return apiService.post("ItemDepts", payload);
  },
  async getItemBrands() {
    const res = await apiService.get("ItemBrands");
    return Array.isArray(res) ? res : [];
  },
  async createItemBrand(payload) {
    return apiService.post("ItemBrands", payload);
  },
  async getItemRanges() {
    const res = await apiService.get("ItemRanges");
    return Array.isArray(res) ? res : [];
  },
  async createItemRange(payload) {
    return apiService.post("ItemRanges", payload);
  },
  async getItemTypes() {
    const res = await apiService.get("ItemTypes");
    return Array.isArray(res) ? res : [];
  },
  async getItemUom() {
    const res = await apiService.get("ItemUoms");
    return Array.isArray(res) ? res : [];
  },
  async getItemSitelists() {
    const res = await apiService.get("ItemSitelists");
    return Array.isArray(res) ? res : [];
  },
  async getItemLinks() {
    const res = await apiService.get("ItemLinks");
    return Array.isArray(res) ? res : [];
  },
  async getItemLinksByItem(itemCode) {
    const filter = { where: { itemCode } };
    const res = await apiService.get(`ItemLinks${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async getItemSupplies() {
    const res = await apiService.get("ItemSupplies");
    return Array.isArray(res) ? res : [];
  },
  async getVoucherValidPeriods() {
    const res = await apiService.get("VoucherValidPeriods");
    return Array.isArray(res) ? res : [];
  },
  async getTaxType1Codes() {
    const res = await apiService.get("TaxType1TaxCodes");
    return Array.isArray(res) ? res : [];
  },
  async getTaxType2Codes() {
    const res = await apiService.get("TaxType2TaxCodes");
    return Array.isArray(res) ? res : [];
  },
  async getCommGroupHdrs() {
    const res = await apiService.get("CommGroupHdrs");
    return Array.isArray(res) ? res : [];
  },

  // Control number for Stock Code
  async getControlNo(siteCode) {
    const filter = {
      where: {
        controlDescription: "Stock Code",
        siteCode: siteCode,
      },
    };
    const q = queryString({ where: filter.where });
    const res = await apiService.get(`ControlNos${q}`);
    return res?.[0] || null;
  },

  // Create stock (NewStocks)
  async createStock(payload) {
    return apiService.post("Stocks", payload);
  },

  // Update stock
  async updateStock(itemCode, payload) {
    const filter = { where: { itemCode } };
    return apiService.post(
      `Stocks/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },

  // ItemStocklists
  async getItemStocklists(itemCode) {
    const filter = { where: { itemCode } };
    const res = await apiService.get(
      `ItemStocklists${queryString({ where: filter.where })}`
    );
    return Array.isArray(res) ? res : [];
  },
  async createItemStocklists(items) {
    return apiService.post("ItemStocklists", items);
  },
  async updateItemStocklist(itemstocklistId, payload) {
    const filter = { where: { itemstocklistId } };
    return apiService.post(
      `ItemStocklists/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },

  // ItemUomprices
  async getItemUomprices(itemCode) {
    const filter = { where: { itemCode } };
    const res = await apiService.get(
      `ItemUomprices${queryString({ where: filter.where })}`
    );
    return Array.isArray(res) ? res : [];
  },
  async createItemUomprices(items) {
    return apiService.post("ItemUomprices", items);
  },
  async updateItemUomprice(id, payload) {
    const filter = { where: { id } };
    return apiService.post(
      `ItemUomprices/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },

  // ItemCostHistory (LoopBack: Itemcosthistories)
  async getItemCostHistory(itemCode) {
    const filter = { where: { itemCode }, order: "effectiveAt DESC" };
    const res = await apiService.get(
      `Itemcosthistories${queryString(filter)}`
    );
    return Array.isArray(res) ? res : [];
  },
  async createItemCostHistory(payload) {
    return apiService.post("Itemcosthistories", payload);
  },

  // ItemBatches
  async getItemBatches(itemCode, opts = {}) {
    const where = { itemCode };
    if (opts.siteCode) where.siteCode = opts.siteCode;
    if (opts.uom) where.uom = opts.uom;
    const filter = { where, order: opts.order || "expDate ASC" };
    const res = await apiService.get(`ItemBatches${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async createItemBatches(items) {
    return apiService.post("ItemBatches", items);
  },

  // ItemLinks
  async createItemLinks(payload) {
    return apiService.post("ItemLinks", payload);
  },
  async updateItemLink(itmId, payload) {
    const filter = { where: { itmId } };
    return apiService.post(
      `ItemLinks/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },

  // Usagelevels
  async getUsageLevels(serviceCode) {
    const filter = { where: { serviceCode } };
    const res = await apiService.get(`Usagelevels${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async createUsagelevels(payload) {
    return apiService.post("Usagelevels", payload);
  },

  // Voucher Conditions
  async getVoucherConditions(itemCode) {
    const filter = { where: { itemCode } };
    const res = await apiService.get(`VoucherConditions${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async createVoucherConditions(payload) {
    return apiService.post("VoucherConditions", payload);
  },

  // Prepaid Open Conditions
  async getPrepaidOpenConditions(itemCode) {
    const filter = { where: { itemCode } };
    const res = await apiService.get(`PrepaidOpenConditions${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async createPrepaidOpenConditions(payload) {
    return apiService.post("PrepaidOpenConditions", payload);
  },

  // Item contents
  async getItemContents(itemCode) {
    const filter = { where: { itemCode } };
    const q = queryString({ where: filter.where });
    const res = await apiService.get(`itemcontents${q}`);
    return Array.isArray(res) ? res : [];
  },
  async createItemContent(payload) {
    return apiService.post("itemcontent", payload);
  },
  async updateItemContent(id, payload) {
    return apiService.post(`itemcontents/${id}/replace`, payload);
  },
  async deleteItemContent(id) {
    return apiService.delete(`itemcontent/${id}`);
  },

  // Stock image
  async getStockImage(itemNo) {
    return apiService.get(`stockimage/${itemNo}`);
  },
  async uploadStockImage(formData) {
    const beBase =
      (typeof window !== "undefined" && window.APP_CONFIG?.API_BE_BASE_URL) || "";
    const url = beBase
      ? `${beBase.replace(/\/$/, "")}/stockimageupload/`
      : "stockimageupload/";
    return apiService.post(url, formData, {
      headers: { "Content-Type": false },
    });
  },

  // Control number update
  async updateControlNo(controlId, controlNo) {
    const filter = { where: { controlId } };
    return apiService.post(
      `ControlNos/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      { controlNo }
    );
  },
};

export default itemMasterApi;
