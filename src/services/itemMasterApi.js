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
  /** Stocks with Re-Order Level enabled (threshold source for replenishment report). */
  async getReorderActiveStocks() {
    const filter = buildFilter(
      { reorderActive: true },
      0,
      20000,
      "itemCode ASC"
    );
    const res = await apiService.get(`Stocks${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  /** Site stock rows for one or more sites (on-hand source for replenishment report). */
  async getItemStocklistsBySites(siteCodes = []) {
    const codes = (siteCodes || []).filter(Boolean);
    if (codes.length === 0) return [];
    const where =
      codes.length === 1
        ? { itemsiteCode: codes[0] }
        : { itemsiteCode: { inq: codes } };
    const filter = buildFilter(where, 0, 50000);
    const res = await apiService.get(`ItemStocklists${queryString(filter)}`);
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
  async getAllItemUomprices() {
    const res = await apiService.get("ItemUomprices");
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
    return apiService.post("Usagelevels", Array.isArray(payload) ? payload : [payload]);
  },
  async updateUsagelevel(id, payload) {
    const filter = { where: { id } };
    return apiService.post(
      `Usagelevels/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },
  async deleteUsagelevel(id) {
    return apiService.delete(`Usagelevels/${id}`);
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
  async updateVoucherConditions(itemCode, payload) {
    const filter = { where: { itemCode } };
    return apiService.post(
      `VoucherConditions/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
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
  async updatePrepaidOpenCondition(id, payload) {
    const filter = { where: { id } };
    return apiService.post(
      `PrepaidOpenConditions/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },
  async deletePrepaidOpenCondition(id) {
    return apiService.delete(`PrepaidOpenConditions/${id}`);
  },

  // Package
  async getPackageItemDetails() {
    const res = await apiService.get("PackageItemDetails");
    return Array.isArray(res) ? res : [];
  },
  async getPackageHdrs(packageCode) {
    const filter = packageCode ? { where: { code: packageCode } } : {};
    const res = await apiService.get(
      `PackageHdrs${packageCode ? queryString(filter) : ""}`
    );
    return Array.isArray(res) ? res : [];
  },
  async getPackageDtls(packageCode) {
    const filter = { where: { packageCode } };
    const res = await apiService.get(`PackageDtls${queryString(filter)}`);
    return Array.isArray(res) ? res : [];
  },
  async createPackageHdrs(payload) {
    return apiService.post("PackageHdrs", payload);
  },
  async updatePackageHdrs(packageCode, payload) {
    const filter = { where: { code: packageCode } };
    return apiService.post(
      `PackageHdrs/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },
  async createPackageDtls(items) {
    return apiService.post("PackageDtls", items);
  },
  async updatePackageDtl(id, payload) {
    const filter = { where: { id } };
    return apiService.post(
      `PackageDtls/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },
  async deletePackageDtl(id) {
    return apiService.delete(`PackageDtls/${id}`);
  },

  // ItemFlexiservices
  async getItemFlexiservices(itemCode) {
    const filter = itemCode ? { where: { itemCode } } : {};
    const res = await apiService.get(
      `ItemFlexiservices${itemCode ? queryString(filter) : ""}`
    );
    return Array.isArray(res) ? res : [];
  },
  async saveItemFlexiservices(items) {
    return apiService.post("ItemFlexiservices", items);
  },
  async updateItemFlexiservice(itmId, payload) {
    const filter = { where: { itmId } };
    return apiService.post(
      `ItemFlexiservices/update?where=${encodeURIComponent(JSON.stringify(filter.where))}`,
      payload
    );
  },
  async deleteItemFlexiservice(itmId) {
    return apiService.delete(`ItemFlexiservices/${itmId}`);
  },

  // Voucher batches (edit voucher items) — BE API when configured
  async getLoadVoucherBatches() {
    const beBase =
      (typeof window !== "undefined" && window.APP_CONFIG?.API_BE_BASE_URL) || "";
    const url = beBase
      ? `${beBase.replace(/\/$/, "")}/loadvoucher`
      : "loadvoucher";
    return apiService.get(url);
  },
  async checkVoucherNumbers(voucherNumbers) {
    const beBase =
      (typeof window !== "undefined" && window.APP_CONFIG?.API_BE_BASE_URL) || "";
    const path = `vouchercheck/?voucher_number=${encodeURIComponent(voucherNumbers)}&status=sale`;
    const url = beBase ? `${beBase.replace(/\/$/, "")}/${path}` : path;
    return apiService.get(url);
  },
  async createLoadVoucher(payload) {
    const beBase =
      (typeof window !== "undefined" && window.APP_CONFIG?.API_BE_BASE_URL) || "";
    const url = beBase
      ? `${beBase.replace(/\/$/, "")}/loadvoucher/`
      : "loadvoucher/";
    return apiService.post(url, payload);
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
