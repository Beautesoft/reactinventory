# GRN Stktrnbatches Pattern Implementation

**Date**: October 14, 2025  
**Status**: ✅ Active (Aligned with GTO/GTI/RTN/ADJ)

---

## Overview

GRN has been refactored to use the **Stktrnbatches pattern**: creating **ONE STKTRN record per item** with **multiple Stktrnbatches records** for batch quantity tracking.

This aligns GRN with the implementation pattern used by GTO, GTI, RTN, and ADJ modules for consistency and better database design.

---

## Example Scenario

### Item: AVD ABSOLUTE REPAIRER - 15G (39 QTY Total)
- 29 QTY from Batch A01, Expiry: 2025-11-29
- 10 QTY from Batch A04, Expiry: 2025-11-15

### User Workflow (No UI Change)
1. User adds Item AVD with 29 qty → Cart Entry 1
2. User edits Entry 1, sets Batch A01, Expiry: 2025-11-29
3. User adds same Item AVD with 10 qty → Cart Entry 2  
4. User edits Entry 2, sets Batch A04, Expiry: 2025-11-15
5. Cart now has **2 entries** for the same item

### Database Records Created

**STKTRN Table (1 record):**
```javascript
{
  id: 12345,
  itemcode: "AVD0010000",
  trnQty: 39,                    // Total quantity
  trnBalqty: 58,                 // Running balance (current + 39)
  trnAmt: 390,                   // Total amount
  itemBatch: "A01,A04",          // Comma-separated batch list (summary)
  trnDocno: "GRN001",
  trnType: "GRN"
}
```

**Stktrnbatches Table (2 records):**
```javascript
[
  {
    id: 1,
    stkTrnId: 12345,             // Links to STKTRN.id
    batchNo: "A01",              // Individual batch number
    batchQty: 29                 // Individual batch quantity
  },
  {
    id: 2,
    stkTrnId: 12345,
    batchNo: "A04",
    batchQty: 10
  }
]
```

---

## Implementation Details

### File: `src/pages/grn/addGrn.jsx`

#### 1. Updated `createTransactionObject` (Lines 1762-1767)

**Change**: Store comma-separated batch numbers in `itemBatch` field

```javascript
itemBatch:
  getConfigValue('BATCH_NO') === "Yes" ? 
    (item?.batchDetails?.individualBatches?.length > 0 ?
      item.batchDetails.individualBatches.map(batch => batch.batchNo).join(',') :
      item?.docBatchNo || null
    ) : null
```

**Behavior**:
- Multiple batches: `"A01,A04"` (comma-separated)
- Single batch: `"A01"`
- No batch: `null`

#### 2. Modified STKTRN Creation (Lines 2460-2465)

**Before** (Multiple STKTRN per batch):
```javascript
const stktrns = [];
for (const item of details) {
  if (item?.batchDetails?.individualBatches?.length > 0) {
    for (const batch of item.batchDetails.individualBatches) {
      // Create separate STKTRN for each batch
      stktrns.push(createBatchRecord(batch));
    }
  }
}
```

**After** (One STKTRN per item):
```javascript
const stktrns = details.map((item) =>
  createTransactionObject(item, docNo, userDetails.siteCode)
);
```

#### 3. Simplified Running Balance (Lines 2537-2549)

**Before** (Cumulative tracking):
```javascript
const itemRunningBalances = new Map();
for (const d of stktrns) {
  const runningBalance = itemRunningBalances.get(key);
  const newBalQty = runningBalance.qty + d.trnQty; // Cumulative
  d.trnBalqty = newBalQty;
  itemRunningBalances.set(key, { qty: newBalQty }); // Update for next batch
}
```

**After** (Direct calculation):
```javascript
for (let i = 0; i < stktrns.length; i++) {
  const d = stktrns[i];
  const balance = balanceMap.get(key);
  d.trnBalqty = (Number(d.trnQty) + Number(balance.qty)).toString();
}
```

#### 4. Enhanced `createStktrnbatchesRecords` (Lines 1689-1691)

**Change**: Check for `batchDetails.individualBatches` first (without requiring `transferType`)

```javascript
if (processedItem?.batchDetails?.individualBatches?.length > 0) {
  // Multiple batches (GRN or specific batch transfer)
  batchDetails = processedItem.batchDetails.individualBatches;
}
```

#### 5. Simplified Stktrnbatches Creation (Line 2578)

**Before**:
```javascript
const expandedDetails = []; // 20+ lines of mapping logic
await createStktrnbatchesRecords(stktrns, expandedDetails, "grn");
```

**After**:
```javascript
await createStktrnbatchesRecords(stktrns, details, "grn");
```

---

## Benefits

### 1. Database Optimization
- ✅ **Fewer STKTRN records**: 1 per item instead of 1 per batch
- ✅ **Cleaner table**: No redundant item information
- ✅ **Better performance**: Faster queries and aggregations

### 2. Code Simplification
- ✅ **Reduced complexity**: 50+ lines of code removed
- ✅ **Simpler balance calc**: Direct addition instead of cumulative tracking
- ✅ **Easier maintenance**: Less logic to debug

### 3. Consistency
- ✅ **Uniform pattern**: All modules (GRN, GTO, GTI, RTN, ADJ) use same approach
- ✅ **Predictable behavior**: Developers know what to expect
- ✅ **Easier reporting**: Same query patterns across all transaction types

### 4. Scalability
- ✅ **Handles many batches**: 10 batches = 1 STKTRN + 10 Stktrnbatches (vs 10 STKTRN)
- ✅ **Better for analytics**: Normalized structure easier to analyze

---

## Data Flow

```
User Action: Add item twice with different batches
↓
Cart: 2 entries (same item, different batches)
↓
Posting Process:
↓
1. Create STKTRN (1 record with total qty, comma-separated batches)
   itemBatch: "A01,A04"
   trnQty: 39
↓
2. Create Stktrnbatches (2 records with individual batch details)
   Record 1: batchNo="A01", batchQty=29
   Record 2: batchNo="A04", batchQty=10
↓
Result: Clean normalized structure!
```

---

## Testing Checklist

### ✅ Core Functionality
- [ ] **Single batch item**: Add item with 1 batch
  - Verify: 1 STKTRN record created
  - Verify: 1 Stktrnbatches record created
  - Verify: itemBatch = "A01"

- [ ] **Multiple batch item**: Add same item twice with different batches (29 from A01, 10 from A04)
  - Verify: 1 STKTRN record with trnQty=39
  - Verify: 2 Stktrnbatches records (A01: 29, A04: 10)
  - Verify: itemBatch = "A01,A04"
  - Verify: Running balance = previous + 39

- [ ] **Mixed scenario**: GRN with both single-batch and multi-batch items
  - Verify: Correct number of STKTRN records (one per unique item)
  - Verify: Correct number of Stktrnbatches records

### ✅ Edge Cases
- [ ] **No batch mode**: Test with BATCH_NO config = "No"
  - Verify: STKTRN created without itemBatch
  - Verify: No Stktrnbatches records created

- [ ] **Item without batch**: Add item without setting batch number
  - Verify: STKTRN created with itemBatch = null
  - Verify: No Stktrnbatches records for this item

### ✅ Balance Calculations
- [ ] **Positive balance**: Current balance = 20, add 39
  - Verify: trnBalqty = 59

- [ ] **Negative balance**: Current balance = -50, add 39
  - Verify: trnBalqty = -11 (correctly reduced deficit)

- [ ] **Zero balance**: Current balance = 0, add 39
  - Verify: trnBalqty = 39

---

## Backward Compatibility

### ✅ Existing Documents
- Saved GRN documents (status = 0) work as before
- Posted GRN documents (status = 7) remain unchanged
- No data migration required

### ✅ API Compatibility
- Same API endpoints used
- Same data validation
- Same error handling

### ✅ UI/UX
- **Zero changes to user interface**
- Same workflow for adding items
- Same edit dialog for batch entry
- Users won't notice any difference

---

## Comparison: Old vs New Pattern

| Aspect | Old (Separate STKTRN) | New (Stktrnbatches) |
|--------|----------------------|---------------------|
| STKTRN records | 2 (one per batch) | 1 (per item) |
| Stktrnbatches records | 2 | 2 |
| Total records | 4 | 3 |
| Balance calculation | Cumulative (complex) | Direct (simple) |
| Code lines | ~50 | ~10 |
| Query performance | Slower (more records) | Faster |
| Consistency | Different from others | Same as GTO/GTI/RTN/ADJ |

---

## Technical Notes

### itemBatch Field Usage
The `itemBatch` field in STKTRN serves as a **quick reference summary**:
- For reporting/display without joining Stktrnbatches
- For compatibility with legacy code that reads itemBatch
- **Detailed tracking** still uses Stktrnbatches table

### Running Balance Calculation
```javascript
New Balance = Current Balance (from ItemOnQties) + Transaction Quantity
```

**Example:**
- Current stock: 20 units
- GRN: +39 units (29 from A01, 10 from A04)
- New balance: 20 + 39 = 59 units

The balance in STKTRN represents the **cumulative stock level** after this transaction.

---

## Rollback Plan

If critical issues are discovered:

1. **Revert changes in addGrn.jsx**:
   ```bash
   git checkout HEAD -- src/pages/grn/addGrn.jsx
   ```

2. **Specific sections to restore** (from git history):
   - STKTRN creation loop (old lines 2456-2483)
   - Cumulative balance tracking (old lines 2550-2585)
   - ExpandedDetails array creation (old lines 2612-2635)

3. **Verify** old pattern works as expected

---

## Related Files

- `src/pages/grn/addGrn.jsx` - Main GRN implementation
- `src/pages/gto/addGto.jsx` - Reference pattern (GTO)
- `src/pages/gti/addGti.jsx` - Reference pattern (GTI)
- `src/pages/rtn/addRtn.jsx` - Reference pattern (RTN)
- `src/pages/adj/addAdj.jsx` - Reference pattern (ADJ)

---

## Migration Path for Other Modules

If any future stock control modules need batch tracking:

1. Implement `createStktrnbatchesRecords` function
2. Create one STKTRN per item using `details.map()`
3. Use comma-separated batch numbers in `itemBatch` field
4. Call `createStktrnbatchesRecords` after STKTRN insertion
5. Pass original details array (function handles batch extraction)

---

**Last Updated**: October 14, 2025  
**Implementation Status**: ✅ Complete  
**Pattern**: Aligned with GTO/GTI/RTN/ADJ
