/**
 * Package content line pricing — ported from legacy Itemdataentry.
 */

export function calcLineTotals(qty, unitPrice, lineDiscount = 0) {
  const q = Number(qty) || 0;
  const price = Number(unitPrice) || 0;
  const disc = Number(lineDiscount) || 0;
  const total = q * price;
  const unitDisc = q > 0 ? disc / q : 0;
  const pPrice = price - unitDisc;
  const totalAmount = total - disc;
  return {
    qty: q,
    U_Price: price,
    Total: total,
    Unit_Disc: unitDisc,
    P_Price: pPrice,
    Total_Amount: totalAmount,
  };
}

export function buildPackageContentRow({
  itemCode,
  description,
  qty,
  unitPrice,
  lineDiscount = 0,
  uom,
  packageDiv,
  id = null,
}) {
  const totals = calcLineTotals(qty, unitPrice, lineDiscount);
  return {
    id,
    Item_Code: itemCode,
    Description: description,
    Qty: totals.qty,
    U_Price: totals.U_Price,
    Total: totals.Total,
    Unit_Disc: totals.Unit_Disc,
    P_Price: totals.P_Price,
    Total_Amount: totals.Total_Amount,
    UOM: uom || "",
    package_div: packageDiv ?? null,
    Active: "Yes",
  };
}

export function upsertPackageContentRow(rows, row) {
  const idx = rows.findIndex((r) => r.Item_Code === row.Item_Code);
  if (idx >= 0) {
    const next = [...rows];
    next[idx] = { ...next[idx], ...row, id: next[idx].id };
    return next;
  }
  return [...rows, row];
}

export function recalcPackageTotals(rows) {
  let contentTotal = 0;
  let packageTotal = 0;
  for (const x of rows) {
    contentTotal += Number(x.Total) || 0;
    packageTotal += Number(x.Total_Amount) || 0;
  }
  return {
    content_total: Number(contentTotal.toFixed(2)),
    package_total: Number(packageTotal.toFixed(2)),
  };
}

export function applyEvenlyAverageDiscount(rows, discountAmount) {
  const discount = Number(discountAmount) || 0;
  if (!rows.length || discount <= 0) return rows;

  const totalPackageAmount = rows.reduce((sum, x) => sum + (Number(x.Total) || 0), 0);
  if (totalPackageAmount <= 0) return rows;

  const discountPercentage = discount / totalPackageAmount;
  return rows.map((x) => {
    const discountForPackage = (Number(x.Total) || 0) * discountPercentage;
    const tempTp = ((Number(x.Total) || 0) - discountForPackage).toFixed(4);
    const tempDis = (discountForPackage / (Number(x.Qty) || 1)).toFixed(4);
    const newPrice = (Number(x.U_Price) - Number(tempDis)).toFixed(4);
    return {
      ...x,
      Unit_Disc: Number(tempDis),
      P_Price: Number(newPrice),
      Total_Amount: Number(tempTp),
    };
  });
}

export function buildPackageDtlPayload(row, packageCode, siteCode, lineNo, serviceOptions = {}) {
  const code =
    row.Item_Code?.length > 10 ? row.Item_Code : `${row.Item_Code}0000`;
  return {
    code,
    description: row.Description,
    cost: null,
    price: Number(row.P_Price),
    discount: Number(row.Unit_Disc),
    packageCode,
    qty: Number(row.Qty),
    uom: row.UOM,
    itemDiv: row.package_div,
    packageBarcode: null,
    discPercent: null,
    unitPrice: Number(row.U_Price),
    ttlUprice: Math.round(Number(row.Total_Amount)),
    siteCode,
    lineNo,
    serviceExpireActive: serviceOptions.serviceExpireActive ?? false,
    serviceExpireMonth: serviceOptions.serviceExpireMonth ?? null,
    treatmentLimitActive: serviceOptions.treatmentLimitActive ?? false,
    treatmentLimitCount: serviceOptions.treatmentLimitCount ?? null,
    limitserviceFlexionly: serviceOptions.limitserviceFlexionly ?? false,
    isactive: true,
  };
}
