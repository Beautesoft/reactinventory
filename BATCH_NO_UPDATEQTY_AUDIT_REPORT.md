# BATCH_NO = "No" – ItemBatches/updateqty audit report

**Date:** 2025-03-02  
**Scope:** All menus that call `ItemBatches/updateqty` and branch on `BATCH_NO` when building the payload.  
**Issue:** For **source/reduction** flows, `qty` must be **negative**; some code paths were sending **positive** qty.

---

## Summary

| Menu | File | BATCH_NO=No path | Source/Reduction? | qty sign | Status |
|------|------|------------------|-------------------|----------|--------|
| **GTO** (Goods Transfer Out) | `src/pages/gto/addGto.jsx` | Source store update | Yes (source) | Was + → **Fixed to −** | ✅ Fixed |
| **RTN** (Return) | `src/pages/rtn/addRtn.jsx` | Return reduction at current store | Yes (reduction) | Was + → **Fixed to −** | ✅ Fixed |
| **GTI** (Goods Transfer In) | `src/pages/gti/addGti.jsx` | Destination store update | No (destination) | + (add) | ✅ OK |
| **SUM** (Usage/Consumption) | `src/pages/sum/addSum.jsx` | Usage reduction | Yes (reduction) | − | ✅ OK |
| **ADJ** (Adjustment) | `src/pages/adj/addAdj.jsx` | Non-batch update | Either (signed) | Uses `d.trnQty` (signed) | ✅ OK |
| **GRN** (Goods Receipt) | `src/pages/grn/addGrn.jsx` | Non-batch receipt | No (add) | + | ✅ OK |
| **Take** (Stock Take) | `src/pages/take/addTake.jsx` | Non-batch variance | Delta (signed) | Uses `stktrnRecord.trnQty` (variance) | ✅ OK |

---

## Details

### 1. GTO (Goods Transfer Out) – **FIXED**
- **Location:** `addGto.jsx` ~2633–2639 (source store loop when `BATCH_NO !== "Yes"`).
- **Issue:** Source store (e.g. IN02) was sent `qty: Number(cartItem.docQty)` (positive). For GTO source we reduce stock → API expects negative delta.
- **Change:** `qty: -Number(cartItem.docQty)`.

### 2. RTN (Return) – **FIXED**
- **Location:** `addRtn.jsx` ~2614–2625 (else branch when `BATCH_NO !== "Yes"`).
- **Issue:** Return reduces stock at `userDetails.siteCode` but payload had `qty: Number(cartItem.docQty)` (positive).
- **Change:** `qty: -Number(cartItem.docQty)`.

### 3. GTI (Goods Transfer In) – **OK**
- **Location:** `addGti.jsx` ~2666–2686 (BATCH_NO=No: update destination “No Batch”).
- **Context:** GTI receives into current store; `stktrn.storeNo` is destination. Adding stock → positive qty is correct. No change.

### 4. SUM (Usage) – **OK**
- **Location:** `addSum.jsx` ~2356–2365 (BATCH_NO=No: usage reduction).
- **Context:** Already uses `qty: -Number(cartItem.docQty)`. No change.

### 5. ADJ (Adjustment) – **OK**
- **Location:** `addAdj.jsx` ~2569–2575 in `updateItemBatchesForNonBatchItems`.
- **Context:** Uses `qty: Number(d.trnQty)`; `trnQty` is already signed (positive = increase, negative = decrease). No change.

### 6. GRN (Goods Receipt) – **OK**
- **Location:** `addGrn.jsx` – updateqty used for receipt into current store (add). Positive qty correct. No change.

### 7. Take (Stock Take) – **OK**
- **Location:** `addTake.jsx` ~3341–3350 (BATCH_NO=No: variance update).
- **Context:** Uses `qty: Number(stktrnRecord.trnQty)` where `trnQty` is the variance (signed). Correct. No change.

---

## Conclusion

- **Fixed:** GTO and RTN when `BATCH_NO = "No"` now send **negative** qty for source/reduction.
- **No change needed:** GTI, SUM, ADJ, GRN, Take – either destination/add (positive correct) or already using signed qty / negative for reduction.
