/**
 * Legacy Listofitemtype rules from Item_Master/Itemdataentry.
 * Division 1,4,5 → SINGLE only
 * Division 2 → all except COURSE
 * Division 3 → all types from API
 */

export function normalizeItemTypeRecord(x) {
  const name = x.itmName || x.itemType || x.itmDesc || String(x.itmCode ?? "");
  return {
    value: name,
    label: name,
    id: x.itmId ?? x.id,
    itmName: name,
  };
}

export function filterStockTypesByDivision(stockdivision, itemTypes = []) {
  const div = Number(stockdivision) || 0;
  const list = (itemTypes || []).map(normalizeItemTypeRecord);

  if (div === 1 || div === 4 || div === 5) {
    return list.filter((t) => t.itmName === "SINGLE");
  }
  if (div === 2) {
    return list.filter((t) => t.itmName !== "COURSE");
  }
  if (div === 3) {
    return list;
  }
  return list;
}

export function getItemTypeIdId(stocktype) {
  if (stocktype === "SINGLE") return 3;
  if (stocktype === "PACKAGE") return 6;
  return 7;
}

export function isValidStockTypeForDivision(stockdivision, stocktype, itemTypes = []) {
  const allowed = filterStockTypesByDivision(stockdivision, itemTypes);
  return allowed.some((t) => t.value === stocktype);
}
