/** Legacy getItemcode / usage serviceCode helpers */

export function getItemcode(code) {
  if (!code) return code;
  return (String(code) + "0000").substring(0, 12);
}

export function getUsageServiceCode(controlNo) {
  if (!controlNo) return controlNo;
  return `${controlNo}0000`;
}

/**
 * Display form of an item code.
 * `Stktrns.itemcode` stores the base code plus a literal "0000" suffix (see
 * docs/GRN_POST_TO_DB_TRANSACTION_SPEC.md, Q1: appended on write, stripped on
 * read). Reports must show the base code, matching Replenishment Report which
 * reads the unsuffixed `Stocks.itemCode`. Strips one trailing occurrence.
 */
export const displayItemCode = (code) => String(code || "").replace(/0000$/, "");
