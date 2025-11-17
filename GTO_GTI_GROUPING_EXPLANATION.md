# Why GTO/GTI Should NOT Use Grouping Logic

## Executive Summary

**GTO (Goods Transfer Out) and GTI (Goods Transfer In) should NOT apply the same grouping logic used in GRN, ADJ, and RTN** because they operate on **multiple stores** (source and destination) and require **separate STKTRN records per store** to maintain accurate inventory tracking across locations.

---

## Detailed Explanation with Examples

### 1. **Multi-Store Architecture**

#### GTO (Goods Transfer Out) Flow:
- **Source Store (fstoreNo)**: Stock is **reduced** (negative quantity)
- **Destination Store (tstoreNo)**: Stock is **increased** (positive quantity)

#### GTI (Goods Transfer In) Flow:
- **Source Store (fstoreNo)**: Stock is **reduced** (negative quantity)
- **Destination Store (tstoreNo)**: Stock is **increased** (positive quantity)

### 2. **Current Implementation (Correct)**

GTO/GTI create **separate STKTRN records** for each store:

```javascript
// GTO creates 2 STKTRN records per item:
// 1. Source store (fstoreNo) - negative qty
// 2. Destination store (tstoreNo) - positive qty
```

**Example: Transferring Item X (Batch C02=10, C03=10) from Store A to Store B**

#### Current Behavior (CORRECT):
```
STKTRN Records Created:

1. Source Store (Store A):
   - itemcode: "X0000"
   - storeNo: "STORE_A"
   - trnQty: -20 (negative - reducing stock)
   - itemBatch: "C02,C03"
   - trnType: "TFRT"

2. Destination Store (Store B):
   - itemcode: "X0000"
   - storeNo: "STORE_B"
   - trnQty: +20 (positive - increasing stock)
   - itemBatch: "C02,C03"
   - trnType: "TFRT"
```

#### If We Applied Grouping (WRONG):
```
STKTRN Records Created:

1. Source Store (Store A):
   - itemcode: "X0000"
   - storeNo: "STORE_A"
   - trnQty: -20 (correct)
   - itemBatch: "C02,C03"
   - trnType: "TFRT"

2. Destination Store (Store B):
   - itemcode: "X0000"
   - storeNo: "STORE_B"
   - trnQty: +20 (correct)
   - itemBatch: "C02,C03"
   - trnType: "TFRT"
```

**Wait, that looks correct!** But the problem is more subtle...

---

## The Real Problem: Per-Line Store Tracking

### Scenario: Multiple Items with Different Source/Destination Stores

**Example Document: GTO001**
- Line 1: Item X, Batch C02=10, Transfer from Store A → Store B
- Line 2: Item X, Batch C03=10, Transfer from Store A → Store C
- Line 3: Item Y, Batch D01=5, Transfer from Store A → Store B

#### Current Implementation (CORRECT):
```
STKTRN Records:

1. Item X, Store A (Source):
   - trnQty: -20 (C02=10 + C03=10)
   - itemBatch: "C02,C03"

2. Item X, Store B (Destination for Line 1):
   - trnQty: +10 (C02=10 only)
   - itemBatch: "C02"

3. Item X, Store C (Destination for Line 2):
   - trnQty: +10 (C03=10 only)
   - itemBatch: "C03"

4. Item Y, Store A (Source):
   - trnQty: -5
   - itemBatch: "D01"

5. Item Y, Store B (Destination):
   - trnQty: +5
   - itemBatch: "D01"
```

#### If We Applied Grouping (WRONG):
```
STKTRN Records:

1. Item X, Store A (Source):
   - trnQty: -20 ✅ (correct - all batches from same source)

2. Item X, Store B (Destination):
   - trnQty: +20 ❌ (WRONG! Should only be +10 for C02)
   - itemBatch: "C02,C03" ❌ (WRONG! Store B only receives C02)

3. Item X, Store C (Destination):
   - trnQty: +10 ✅ (correct for C03)
   - itemBatch: "C03" ✅ (correct)

4. Item Y, Store A (Source):
   - trnQty: -5 ✅ (correct)

5. Item Y, Store B (Destination):
   - trnQty: +5 ✅ (correct)
```

**Problem**: Grouping would incorrectly combine batches that go to **different destination stores**, causing:
- **Store B** would show +20 qty (should be +10)
- **Store B** would show batches C02+C03 (should only show C02)
- **Inventory balance errors** in both stores

---

## Technical Deep Dive

### Why GTO/GTI Code Structure is Different

#### GTO Code Structure:
```javascript
// GTO creates STKTRN for destination store
const stktrns = processedDetails.map((item) =>
  createTransactionObject(
    item,
    docNo,
    stockHdrs.fstoreNo, // storeNo (destination)
    stockHdrs.fstoreNo, // fstoreNo (source)
    stockHdrs.tstoreNo, // tstoreNo (destination)
    -1 // multiplier for source store
  )
);

// Then separately handles source store operations
await handleSourceBatchTransfer(...);
await handleDestinationBatchTransfer(...);
```

#### Key Functions in GTO/GTI:
1. **`handleSourceBatchTransfer`**: Updates source store (reduces stock)
2. **`handleDestinationBatchTransfer`**: Updates destination store (increases stock)
3. **`handleMultiBatchTransfer`**: Processes each batch individually for both stores

### Why Grouping Breaks This:

1. **Batch-to-Store Mapping**: Each batch may go to a **different destination store**
2. **Per-Line Store Assignment**: Each cart line has its own `tstoreNo` (destination)
3. **Individual Batch Processing**: Each batch must be processed separately for source and destination

### Example: Same Item, Different Destinations

**Cart Lines:**
```
Line 1: Item X, Batch C02=10, From Store A → Store B
Line 2: Item X, Batch C03=10, From Store A → Store C
```

**If We Group:**
- Grouped item would have: `docQty=20`, batches=[C02, C03]
- But we **don't know** which batch goes to which store!
- The grouping **loses the per-line destination store information**

**Current Code (Correct):**
- Line 1 creates STKTRN for Store B with C02
- Line 2 creates STKTRN for Store C with C03
- Each maintains its own destination store reference

---

## Comparison with GRN/ADJ/RTN

### Why Grouping Works for GRN/ADJ/RTN:

| Module | Stores | Grouping Safe? | Reason |
|--------|--------|----------------|--------|
| **GRN** | Single store | ✅ Yes | All items go to same store |
| **ADJ** | Single store | ✅ Yes | All adjustments in same store |
| **RTN** | Single store | ✅ Yes | All returns from same store |
| **GTO** | **Multiple stores** | ❌ **No** | Items go to different destination stores |
| **GTI** | **Multiple stores** | ❌ **No** | Items come from different source stores |

### Key Difference:

- **GRN/ADJ/RTN**: All operations happen in **one store** → grouping is safe
- **GTO/GTI**: Operations span **multiple stores** → grouping loses store-specific information

---

## Real-World Example: What Goes Wrong

### Scenario: Warehouse Transfer Document

**Document: GTO001**
- **From**: Main Warehouse (STORE_A)
- **To**: Branch Store 1 (STORE_B) and Branch Store 2 (STORE_C)

**Items:**
1. Product A, Batch A01=50 → Send to STORE_B
2. Product A, Batch A02=30 → Send to STORE_C
3. Product B, Batch B01=20 → Send to STORE_B

### Without Grouping (Current - CORRECT):

**STKTRN Records:**
```
1. STORE_A (Source): Product A, -80 qty (A01=50 + A02=30)
2. STORE_B (Dest): Product A, +50 qty (A01 only)
3. STORE_C (Dest): Product A, +30 qty (A02 only)
4. STORE_A (Source): Product B, -20 qty
5. STORE_B (Dest): Product B, +20 qty
```

**Result**: ✅ Correct inventory in all stores

### With Grouping (WRONG):

**STKTRN Records:**
```
1. STORE_A (Source): Product A, -80 qty ✅
2. STORE_B (Dest): Product A, +80 qty ❌ (Should be +50)
   - Batch A02 incorrectly assigned to STORE_B
3. STORE_C (Dest): Product A, +30 qty ✅ (But missing from grouped record)
4. STORE_A (Source): Product B, -20 qty ✅
5. STORE_B (Dest): Product B, +20 qty ✅
```

**Result**: ❌ 
- STORE_B shows +80 instead of +50 (overstated by 30)
- STORE_C may not receive the correct batch assignment
- Inventory balances are **incorrect**

---

## Code-Level Evidence

### GTO's Multi-Store Processing:

```javascript
// GTO processes each batch individually for source and destination
if (cartItem.batchDetails.individualBatches) {
  for (const batchDetail of cartItem.batchDetails.individualBatches) {
    // Source store processing
    await handleSourceBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
    
    // Destination store processing
    await handleDestinationBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
  }
}
```

**This code requires:**
- Individual batch processing
- Per-batch store assignment
- Separate source/destination operations

**Grouping would:**
- Combine batches that may go to different stores
- Lose the per-line destination store reference
- Break the `handleSourceBatchTransfer` / `handleDestinationBatchTransfer` logic

---

## Conclusion

### ✅ **DO Apply Grouping To:**
- **GRN**: Single store, all items go to same location
- **ADJ**: Single store, all adjustments in same location
- **RTN**: Single store, all returns from same location

### ❌ **DO NOT Apply Grouping To:**
- **GTO**: Multi-store, items go to different destination stores
- **GTI**: Multi-store, items come from different source stores

### Key Takeaway:

**Grouping works when all operations happen in one store. GTO/GTI operations span multiple stores, so grouping would incorrectly combine batches that belong to different stores, causing inventory balance errors.**

---

## Implementation Status

✅ **ADJ**: Grouping implemented with signed quantity support  
✅ **RTN**: Grouping implemented (after FEFO calculation)  
❌ **GTO**: Grouping NOT applied (multi-store logic preserved)  
❌ **GTI**: Grouping NOT applied (multi-store logic preserved)  

---

*Last Updated: Based on code analysis of GTO/GTI multi-store transfer logic*

