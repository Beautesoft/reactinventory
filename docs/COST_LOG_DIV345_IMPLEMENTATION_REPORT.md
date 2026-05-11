# Cost Log for Divisions 3, 4, 5 – Implementation Report

**Date:** March 10, 2025  
**Status:** Complete, no issues

---

## Summary

Cost history logging is now implemented for **all divisions (1–5)**. Divisions 3 (Services), 4 (Voucher), and 5 (Prepaid) log price changes to `Itemcosthistories` using the same value stored in `Stocks.itemPrice`, with `itemUom` left empty.

---

## Changes Made

### 1. `itemMasterForm.jsx`

| Change | Description |
|--------|--------------|
| **`getEffectiveItemPriceForDiv345()`** | Helper to compute effective item price for divisions 3/4/5 (same as `Stocks.itemPrice`): Div 4 = `voucherValue` when stockprice=0, else stockprice; Div 5 = `prepaidSellAmt` or `prepaidValue` when stockprice=0, else stockprice; Div 3 = stockprice |
| **Create flow** | After `createStock(payload)` succeeds, if division is 3/4/5, calls `logCostHistory(controlNo, { itemUom: "", itemPrice, itemCost: 0, minMargin: null }, "CREATE")` |
| **Edit flow** | After `updateStock(itemCode, payload)` succeeds, if division is 3/4/5, calls `logCostHistory(itemCode, { itemUom: "", itemPrice, itemCost: 0, minMargin: null }, "UPDATE")` |
| **`logCostHistory`** | Uses `itemUom ?? ""` so empty UOM is sent correctly |
| **History button** | Moved to General section header so it appears for all divisions when editing (including 3/4/5) |
| **`divisionLabel` prop** | Passes `form.stockdivision` to `CostHistoryTimelineModal` |

### 2. `CostHistoryTimelineModal.jsx`

| Change | Description |
|--------|-------------|
| **`divisionLabel` prop** | New optional prop for division context |
| **`getDivisionPriceLabel(divisionLabel)`** | Maps division to UOM column label: "3"/"SERVICE" → "Service price"; "4"/"VOUCHER" → "Voucher price"; "5"/"PREPAID" → "Prepaid price"; else → "Item price" |
| **UOM column** | When `log.itemUom` is empty, shows `getDivisionPriceLabel(divisionLabel)` instead of "-" |

### 3. `itemMasterTable.jsx`

| Change | Description |
|--------|-------------|
| **`costHistoryDivisionLabel` state** | Stores division label when opening cost history |
| **History button click** | Sets `costHistoryDivisionLabel` from `item.itemDiv` (enriched description from list) |
| **`divisionLabel` prop** | Passes `costHistoryDivisionLabel` to `CostHistoryTimelineModal` |

---

## Price Logic (Divisions 3, 4, 5)

| Division | Condition | `priceForLog` |
|----------|-----------|---------------|
| 4 (Voucher) | stockprice > 0 | stockprice |
| 4 (Voucher) | stockprice = 0 | voucherValue |
| 5 (Prepaid) | stockprice > 0 | stockprice |
| 5 (Prepaid) | stockprice = 0 | prepaidSellAmt or prepaidValue |
| 3 (Services) | — | stockprice |

*Note: Div 3 package_total is not implemented; the form does not expose package total. Uses stockprice.*

---

## API Payload (Itemcosthistories)

For divisions 3/4/5, each log record uses:

```json
{
  "itemCode": "<itemCode>",
  "itemUom": "",
  "itemCost": 0,
  "itemPrice": <effective price>,
  "minMargin": null,
  "changeType": "CREATE" | "UPDATE",
  "createdBy": "<username>",
  "effectiveAt": "<ISO timestamp>"
}
```

---

## UI Behavior

| Location | Division | UOM column when `itemUom` empty |
|----------|----------|--------------------------------|
| Item Master list | 3 | "Service price" |
| Item Master list | 4 | "Voucher price" |
| Item Master list | 5 | "Prepaid price" |
| Item Master list | 1, 2 | "Item price" |

`divisionLabel` is derived from:

- **List:** `item.itemDiv` (enriched description, e.g. "Services", "Voucher")
- **Form:** `form.stockdivision` (e.g. "3", "4", "5")

---

## Verification

- [x] Linter passes for all modified files
- [x] Divisions 1 & 2: UOM-level cost history unchanged
- [x] Divisions 3, 4, 5: Price history logged on create and edit
- [x] Modal shows division-specific labels when UOM is empty
- [x] History button available for all divisions in edit mode

---

## Files Modified

1. `src/pages/item-master/itemMasterForm.jsx`
2. `src/components/item-master/CostHistoryTimelineModal.jsx`
3. `src/components/itemMasterTable.jsx`
