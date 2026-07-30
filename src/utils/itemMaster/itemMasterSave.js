import itemMasterApi from "@/services/itemMasterApi";
import { getItemcode, getUsageServiceCode } from "@/utils/itemMaster/itemCodeHelpers";
import {
  buildPackageDtlPayload,
  recalcPackageTotals,
} from "@/utils/itemMaster/packagePricing";
import { getItemTypeIdId } from "@/utils/itemMaster/stockTypeFilters";

export function resolveLookupIds(form, { deptOptions, classOptions, divisionOptions, rangeOptions, brandOptions, filteredStockTypeOptions }) {
  const dept = deptOptions.find((d) => String(d.value) === String(form.dept));
  const cls = classOptions.find((c) => String(c.value) === String(form.stockclass));
  const div = divisionOptions.find((d) => String(d.value) === String(form.stockdivision));
  const rng = rangeOptions.find((r) => String(r.value) === String(form.range));
  const brand = brandOptions.find((b) => String(b.value) === String(form.brand));
  const typeRec = filteredStockTypeOptions.find((t) => t.value === form.stocktype);
  return {
    itemDeptIdId: dept?.id ?? null,
    itemClassIdId: cls?.id ?? null,
    itemDivIdId: div?.id ?? null,
    itemRangeIdId: rng?.id ?? null,
    itemTypeIdId: typeRec?.id ?? getItemTypeIdId(form.stocktype),
  };
}

export function buildEffectiveItemPrice({
  stockprice,
  stockdivision,
  stocktype,
  voucherValue,
  prepaidSellAmt,
  prepaidValue,
  packageContent,
}) {
  const price = Number(stockprice) || 0;
  const div = String(stockdivision);
  if (price > 0) return price;
  if (div === "4") return Number(voucherValue) || 0;
  if (div === "5") return Number(prepaidSellAmt) || Number(prepaidValue) || 0;
  if (div === "3" && stocktype === "PACKAGE") {
    const { package_total } = recalcPackageTotals(packageContent || []);
    return package_total;
  }
  return price;
}

export function buildStockPayload(ctx) {
  const {
    form,
    isEdit,
    itemCode,
    controlNo,
    brandOptions,
    uoms,
    uomOptions,
    voucherValue,
    voucherValueIsAmount,
    voucherValidPeriod,
    isVoucherValidDate,
    voucherValidUntilDate,
    prepaidValue,
    prepaidSellAmt,
    prepaidValidPeriod,
    prepaidMemberCardAccess,
    packageHdr,
    packageContent,
    flexiPoints,
    serviceExpireActive,
    serviceExpireMonth,
    treatmentLimitActive,
    treatmentLimitCount,
    limitserviceFlexionly,
    lookupIds,
    userDetails,
    now,
  } = ctx;

  const code = isEdit ? itemCode : controlNo;
  const itemPrice = buildEffectiveItemPrice({
    stockprice: form.stockprice,
    stockdivision: form.stockdivision,
    stocktype: form.stocktype,
    voucherValue,
    prepaidSellAmt,
    prepaidValue,
    packageContent,
  });

  const isPackage = form.stocktype === "PACKAGE";
  const fromDate = isPackage && packageHdr?.fromDate
    ? `${packageHdr.fromDate} 00:00:00.000`
    : form.vilidityFromDate
    ? `${form.vilidityFromDate} 00:00:00.000`
    : null;
  const toDate = isPackage && packageHdr?.toDate
    ? `${packageHdr.toDate} 23:59:59.999`
    : form.vilidityToDate
    ? `${form.vilidityToDate} 23:59:59.999`
    : null;

  return {
    itemCode: code,
    itemDiv: form.stockdivision,
    itemDept: form.dept,
    itemBrand: brandOptions.find((o) => o.value === form.brand)?.itmCode ?? form.brand,
    itemClass: form.stockclass,
    itemRange: form.range,
    itemType: form.stocktype,
    itemName: form.stockname.trim(),
    itemDesc: form.item_desc?.trim() || form.stockname.trim(),
    itemBarcode: form.ItemBarCode || code + "0000",
    itemPrice,
    itemPriceFloor: Number(form.floorprice) || null,
    itemPriceCeiling: Number(form.priceceiling) || null,
    onhandCst: form.cost !== "" && form.cost != null ? Number(form.cost) : null,
    costPrice: form.cost !== "" && form.cost != null ? Number(form.cost) : 0,
    itemIsactive: form.item_active,
    rptCode: form.rptcode || null,
    disclimit: form.disclimit ? Number(form.disclimit) : null,
    itemDate: now(),
    itemTime: now(),
    itemModdate: now(),
    itemModtime: now(),
    itemCreateuser: userDetails?.username || "SYSTEM",
    itemSupp: form.supply_itemsval || null,
    itemFoc: form.customer_replan,
    itemUom: (uoms[0]?.itemUom || uomOptions[0]?.value) || null,
    vilidityFromDate: fromDate,
    vilidityToDate: toDate,
    itmDuration: form.duration ? Number(form.duration) : null,
    printdesc: form.membershipPoint || null,
    autocustdisc: form.auto_cust_disc,
    disctypeamount: form.percent !== false,
    isHaveTax: form.tax,
    isAllowFoc: form.allow_foc,
    commissionable: form.commissionable,
    reminderActive: form.redeem_item,
    reorderActive: form.reoreder_level,
    reorderMinqty: form.reoreder_level && form.min_qty ? Number(form.min_qty) : null,
    custReplenishDays: form.customer_replan && form.Replenishment ? Number(form.Replenishment) : null,
    custAdvanceDays: form.customer_replan && form.Remind_advance ? Number(form.Remind_advance) : null,
    salescomm: form.Sales_commission || null,
    workcomm: form.work_commission || null,
    salescommpoints: form.sales_point ? Number(form.sales_point) : null,
    workcommpoints: form.work_point ? Number(form.work_point) : null,
    t1TaxCode: form.taxone || null,
    t2TaxCode: form.taxtwo || null,
    accountCodeTd: form.account_no || null,
    voucherValue: form.stockdivision === "4" ? Number(voucherValue) : null,
    voucherValueIsAmount: Boolean(voucherValueIsAmount),
    voucherValidPeriod: form.stockdivision === "4" ? voucherValidPeriod : null,
    voucherValidUntilDate: form.stockdivision === "4" && isVoucherValidDate ? voucherValidUntilDate : null,
    voucherIsvalidUntilDate: form.stockdivision === "4" ? Boolean(isVoucherValidDate) : false,
    prepaidValue: form.stockdivision === "5" ? Number(prepaidValue) : null,
    prepaidSellAmt: form.stockdivision === "5" ? Number(prepaidSellAmt) : null,
    prepaidValidPeriod: form.stockdivision === "5" ? prepaidValidPeriod : null,
    membercardnoaccess: form.stockdivision === "5" ? prepaidMemberCardAccess : null,
    flexiPoints: flexiPoints ? Number(flexiPoints) : 0,
    serviceExpireActive: Boolean(serviceExpireActive),
    serviceExpireMonth: serviceExpireActive && serviceExpireMonth ? Number(serviceExpireMonth) : null,
    treatmentLimitActive: Boolean(treatmentLimitActive),
    treatmentLimitCount: treatmentLimitActive && treatmentLimitCount ? Number(treatmentLimitCount) : null,
    limitserviceFlexionly: Boolean(limitserviceFlexionly),
    itemHavechild: false,
    valueApplytochild: false,
    havePackageDisc: false,
    mixbrand: false,
    serviceCostPercent: false,
    isGst: false,
    isOpenPrepaid: form.stockdivision === "5" ? form.open_prepaid : false,
    ...lookupIds,
  };
}

export async function savePackageData({
  packageCode,
  packageHdr,
  packageContent,
  stockName,
  siteCode,
  serviceOptions,
  isEdit,
  originalPackageDtlIds = [],
}) {
  if (!["2", "3"].includes(String(serviceOptions.stockdivision))) return;
  if (formStocktypeNotPackage(serviceOptions.stocktype)) return;

  const { content_total, package_total } = recalcPackageTotals(packageContent);
  const hdrPayload = {
    code: packageCode,
    description: stockName,
    price: package_total,
    discount: packageHdr.discAmount || 0,
    dateCreated: new Date(),
    timeCreated: new Date(),
    userName: null,
    packageBarcode: packageCode,
    unitPrice: content_total,
    fromDate: packageHdr.fromDate || null,
    toDate: packageHdr.toDate || null,
    fromTime: packageHdr.fromTime || null,
    toTime: packageHdr.toTime || null,
    siteCode,
    manualDisc: packageHdr.discMethod === "Manual",
    istdt: Boolean(packageHdr.apptTdt),
    apptlimit: packageHdr.apptLimit ? Number(packageHdr.apptLimit) : null,
  };

  if (isEdit) {
    try {
      await itemMasterApi.updatePackageHdrs(packageCode, hdrPayload);
    } catch {
      await itemMasterApi.createPackageHdrs(hdrPayload);
    }
  } else {
    await itemMasterApi.createPackageHdrs(hdrPayload);
  }

  const svcOpts = {
    serviceExpireActive: serviceOptions.serviceExpireActive,
    serviceExpireMonth: serviceOptions.serviceExpireMonth,
    treatmentLimitActive: serviceOptions.treatmentLimitActive,
    treatmentLimitCount: serviceOptions.treatmentLimitCount,
    limitserviceFlexionly: serviceOptions.limitserviceFlexionly,
  };

  const newRows = [];
  const currentIds = new Set();

  for (let i = 0; i < packageContent.length; i++) {
    const row = packageContent[i];
    const payload = buildPackageDtlPayload(row, packageCode, siteCode, i + 1, svcOpts);
    if (row.id) {
      currentIds.add(row.id);
      await itemMasterApi.updatePackageDtl(row.id, payload);
    } else {
      newRows.push(payload);
    }
  }

  if (newRows.length > 0) {
    await itemMasterApi.createPackageDtls(newRows);
  }

  for (const oldId of originalPackageDtlIds) {
    if (!currentIds.has(oldId)) {
      await itemMasterApi.deletePackageDtl(oldId).catch(() => {});
    }
  }
}

function formStocktypeNotPackage(stocktype) {
  return stocktype !== "PACKAGE";
}

export async function saveUsageLevelsDiff({
  serviceCode,
  stockName,
  usageItems,
  originalUsage = [],
}) {
  const svcCode = getUsageServiceCode(serviceCode);
  const origById = new Map((originalUsage || []).filter((u) => u.id).map((u) => [u.id, u]));
  const currentIds = new Set();

  for (const u of usageItems) {
    const payload = {
      serviceCode: svcCode,
      itemCode: getItemcode(u.itemCode),
      qty: u.qty,
      uom: u.uom,
      serviceDesc: stockName,
      itemDesc: u.itemName,
      isactive: true,
    };
    if (u.id) {
      currentIds.add(u.id);
      await itemMasterApi.updateUsagelevel(u.id, payload);
    } else {
      await itemMasterApi.createUsagelevels(payload);
    }
  }

  for (const orig of originalUsage) {
    if (orig.id && !currentIds.has(orig.id)) {
      const stillInList = usageItems.some(
        (u) => u.itemCode === orig.itemCode && u.id === orig.id
      );
      if (!stillInList) {
        await itemMasterApi.deleteUsagelevel(orig.id).catch(() => {});
      }
    }
  }
}

export async function saveItemContents(itemCode, contentRows, originalRows = []) {
  for (const row of contentRows) {
    if (row._deleted && row.id) {
      await itemMasterApi.deleteItemContent(row.id).catch(() => {});
      continue;
    }
    if (row._deleted) continue;

    const payload = {
      itemCode,
      contentLineNo: row.contentLineNo,
      contentDetail1: row.contentDetail1,
      contentDetail2: row.contentDetail2,
      isActive: row.isActive !== false,
    };

    if (row.id) {
      await itemMasterApi.updateItemContent(row.id, payload);
    } else {
      await itemMasterApi.createItemContent({
        itemcode: itemCode,
        content_line_no: row.contentLineNo,
        content_detail_1: row.contentDetail1,
        Content_detail_2: row.contentDetail2,
      });
    }
  }
}

export async function saveFlexiServices(itemCode, flexiServices, originalFlexi = []) {
  const currentCodes = new Set(flexiServices.map((s) => s.itemSrvcode));

  for (const s of flexiServices) {
    const payload = {
      itemCode,
      itemSrvcode: s.itemSrvcode,
      itemSrvdesc: s.itemSrvdesc,
      itemSrvIdId: s.itemSrvIdId,
      itmIsactive: s.itmIsactive !== false,
    };
    if (s.itmId) {
      await itemMasterApi.updateItemFlexiservice(s.itmId, payload);
    } else {
      await itemMasterApi.saveItemFlexiservices([payload]);
    }
  }

  for (const orig of originalFlexi) {
    if (orig.itmId && !currentCodes.has(orig.itemSrvcode)) {
      await itemMasterApi.deleteItemFlexiservice(orig.itmId).catch(() => {});
    }
  }
}

export async function savePrepaidConditionsDiff(itemCode, conditions, original = []) {
  const currentIds = new Set();
  for (const p of conditions) {
    const payload = {
      itemCode,
      type: p.type,
      condition1: p.condition1,
      condition2: p.condition2,
      price: p.price,
      isactive: true,
    };
    if (p.id) {
      currentIds.add(p.id);
      await itemMasterApi.updatePrepaidOpenCondition(p.id, payload);
    } else {
      await itemMasterApi.createPrepaidOpenConditions(payload);
    }
  }
  for (const orig of original) {
    if (orig.id && !currentIds.has(orig.id)) {
      await itemMasterApi.deletePrepaidOpenCondition(orig.id).catch(() => {});
    }
  }
}

export async function saveVoucherCondition(itemCode, voucherData) {
  const payload = {
    itemCode,
    voucherValue: Number(voucherData.voucherValue) || 0,
    voucherValueIsAmount: Boolean(voucherData.voucherValueIsAmount),
    voucherValidPeriod: voucherData.voucherValidPeriod,
    voucherValidUntilDate: voucherData.voucherValidUntilDate,
    voucherIsvalidUntilDate: Boolean(voucherData.isVoucherValidDate),
  };
  try {
    await itemMasterApi.updateVoucherConditions(itemCode, payload);
  } catch {
    await itemMasterApi.createVoucherConditions(payload);
  }
}
