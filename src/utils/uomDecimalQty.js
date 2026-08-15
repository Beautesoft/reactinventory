import itemMasterApi from "@/services/itemMasterApi";

const PRICE_STEP = "0.01";

export function getItemCodeFromLine(item) {
  return (
    item?.stockCode ||
    item?.itemcode ||
    item?.itemCode ||
    item?.reqdItemcode ||
    item?.podItemcode ||
    ""
  );
}

export function getUomFromLine(item) {
  return (
    item?.uom ||
    item?.docUom ||
    item?.itemUom ||
    item?.uomDescription ||
    ""
  );
}

export function getStockLineKey(item) {
  return `${getItemCodeFromLine(item)}|${getUomFromLine(item)}`;
}

export function findStockLineIndex(items = [], item) {
  const key = getStockLineKey(item);
  return items.findIndex((row) => getStockLineKey(row) === key);
}

export function matchesCartStockLine(cartLine, stockLine) {
  const cartCode = cartLine?.itemcode || cartLine?.stockCode || "";
  const cartUom =
    cartLine?.docUom || cartLine?.uom || cartLine?.itemUom || "";
  return (
    cartCode === getItemCodeFromLine(stockLine) &&
    cartUom === getUomFromLine(stockLine)
  );
}

export function matchesStockLine(row, reference) {
  if (!row || !reference) return false;
  return getStockLineKey(row) === getStockLineKey(reference);
}

export function buildDecimalQtyLookup(uomPriceRows = []) {
  const lookup = new Map();

  for (const row of uomPriceRows) {
    if (row.isactive === false) continue;

    const itemCode = row.itemCode ?? row.item_code;
    const itemUom = row.itemUom ?? row.item_uom;
    const seq = row.itemUompriceSeq ?? row.item_uomprice_seq;

    if (!itemCode || !itemUom) continue;

    lookup.set(`${itemCode}|${itemUom}`, Number(seq) === 1);
  }

  return lookup;
}

let cachedLookup = null;
let lookupPromise = null;

export async function getDecimalQtyLookup(forceRefresh = false) {
  if (!forceRefresh && cachedLookup) {
    return cachedLookup;
  }

  if (!forceRefresh && lookupPromise) {
    return lookupPromise;
  }

  lookupPromise = itemMasterApi
    .getAllItemUomprices()
    .then((rows) => {
      cachedLookup = buildDecimalQtyLookup(rows);
      lookupPromise = null;
      return cachedLookup;
    })
    .catch((err) => {
      lookupPromise = null;
      throw err;
    });

  return lookupPromise;
}

export function resolveAllowDecimalQty(item, lookup) {
  const itemCode = getItemCodeFromLine(item);
  const itemUom = getUomFromLine(item);
  if (!itemCode || !itemUom) return false;
  return lookup.get(`${itemCode}|${itemUom}`) ?? false;
}

export async function enrichStockItemsWithDecimalFlag(items = []) {
  try {
    const lookup = await getDecimalQtyLookup();
    return items.map((item) => ({
      ...item,
      allowDecimalQty: resolveAllowDecimalQty(item, lookup),
    }));
  } catch (err) {
    console.error("Failed to load ItemUomprices for decimal qty lookup:", err);
    return items.map((item) => ({
      ...item,
      allowDecimalQty: false,
    }));
  }
}

export function getQtyStepForItem(item) {
  return item?.allowDecimalQty ? "any" : "1";
}

export function getQtyPlaceholderForItem() {
  return "0";
}

export function formatQtyInputValue(value) {
  if (value === 0 || value === null || value === undefined) {
    return "";
  }
  return String(value);
}

/**
 * Filters qty input while typing. Returns null when the change should be rejected
 * (e.g. pasted decimal on integer-only UOM).
 */
export function sanitizeQtyInputValue(raw, item, options = {}) {
  const { allowNegative = false } = options;
  const allowDecimal = item?.allowDecimalQty === true;

  if (raw === "" || raw === null || raw === undefined) {
    return "";
  }

  const str = String(raw).replace(/,/g, ".");

  if (!allowDecimal) {
    if (/[.]/.test(str)) {
      return null;
    }

    if (allowNegative) {
      const negative = str.startsWith("-");
      const digits = str.replace(/[^\d]/g, "");
      if (negative) {
        return digits.length > 0 ? `-${digits}` : "-";
      }
      return digits;
    }

    return str.replace(/[^\d]/g, "");
  }

  let negative = false;
  let body = str;
  if (allowNegative && body.startsWith("-")) {
    negative = true;
    body = body.slice(1);
  }

  body = body.replace(/[^0-9.]/g, "");
  const dotIndex = body.indexOf(".");
  if (dotIndex !== -1) {
    body =
      body.slice(0, dotIndex + 1) +
      body.slice(dotIndex + 1).replace(/\./g, "");
  }

  if (!/^(\d+\.?\d*|\.\d*)$/.test(body)) {
    return null;
  }

  return negative ? `-${body}` : body;
}

export function shouldBlockQtyKey(event, item, options = {}) {
  if (item?.allowDecimalQty) {
    return false;
  }

  const { allowNegative = false } = options;
  const { key, ctrlKey, metaKey, altKey } = event;

  if (ctrlKey || metaKey || altKey) {
    return false;
  }

  if (key.length > 1) {
    return false;
  }

  if (/^\d$/.test(key)) {
    return false;
  }

  if (allowNegative && key === "-") {
    const el = event.currentTarget;
    const current = el.value ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    if (start === 0 && !current.startsWith("-")) {
      return false;
    }

    if (start === 0 && end === current.length) {
      return false;
    }

    return true;
  }

  return true;
}

export function parseQtyNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function isEmptyOrInvalidQty(value, { allowZero = false } = {}) {
  if (value === "" || value === null || value === undefined || value === "-") {
    return true;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return true;
  }
  return allowZero ? false : n <= 0;
}

export function coerceStockListFieldValue(field, value) {
  if (
    field === "expiryDate" ||
    field === "batchNo" ||
    field === "docBatchNo" ||
    field === "remarks"
  ) {
    return value;
  }
  if (field === "Qty") {
    return value;
  }
  if (value === "") {
    return "";
  }
  return Number(value);
}

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return parseFloat(n.toFixed(2));
}

const MONEY_LINE_KEYS = [
  "docPrice",
  "docAmt",
  "docDisc",
  "docPdisc",
  "itemprice",
  "podPrice",
  "podAmt",
  "podItemprice",
  "podDiscamt",
  "reqdPrice",
  "reqdAmt",
  "reqdItemprice",
  "reqdDiscamt",
];

export function roundStockLineMoney(item) {
  if (!item || typeof item !== "object") return item;
  const next = { ...item };
  for (const key of MONEY_LINE_KEYS) {
    if (next[key] != null && next[key] !== "") {
      next[key] = roundMoney(next[key]);
    }
  }
  return next;
}

export function calcDocAmtFromQtyPrice(qty, price) {
  return roundMoney(parseQtyNumber(qty) * (Number(price) || 0));
}

export function isQtyInputInvalid(value, item, options = {}) {
  if (value === "" || value === null || value === undefined) {
    return false;
  }
  return !isValidQtyForItem(value, item, options);
}

export function getPriceStep() {
  return PRICE_STEP;
}

export function isValidQtyForItem(value, item, options = {}) {
  const { allowNegative = false } = options;
  const allowDecimal = item?.allowDecimalQty === true;

  if (value === "" || value === null || value === undefined) {
    return false;
  }

  if (value === "-" && allowNegative) {
    return true;
  }

  const str = String(value);

  if (allowDecimal && /^-?(\d+\.?\d*|\.\d*)$/.test(str)) {
    return true;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return false;
  }

  if (!allowNegative && n < 0) {
    return false;
  }

  if (!allowDecimal && !Number.isInteger(n)) {
    return false;
  }

  return true;
}

export function qtyValidationMessageForItem(item) {
  const uom = getUomFromLine(item);
  if (item?.allowDecimalQty) {
    return "Please enter a valid quantity";
  }
  return uom
    ? `Quantity must be a whole number for UOM ${uom}`
    : "Quantity must be a whole number";
}

export function validateQtyForItemOrToast(value, item, options = {}) {
  const { toast } = options;
  if (isValidQtyForItem(value, item, options)) {
    return true;
  }
  const message = qtyValidationMessageForItem(item);
  if (toast) {
    toast.error(message);
  }
  return false;
}
