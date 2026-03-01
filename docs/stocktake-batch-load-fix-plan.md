# Stock Take: Batch Selection Load Fix – Plan

## Problem

After **Save** (with batch selection, including "No Batch" only), reopening the document and clicking **Post** shows:

> "Batch selection is mandatory for item 11100001. Please click 'Select Batch' and assign quantities (or confirm 'No Batch')."

Batch data **is** stored on save (e.g. in `ordMemo3` for "No Batch" only), but on **load** it is not recognized, so `hasBatchBreakdown` stays `false` and Post validation fails.

---

## Root Cause

### 1. Save behaviour (current)

- **With batch numbers:** `ordMemo1 = "specific"`, `ordMemo2 = "batchNo:qty,..."`, `ordMemo3` for No Batch qty if any.
- **With "No Batch" only:** We only set `ordMemo3 = countedQty`. We do **not** set `ordMemo1 = "specific"` (that is only set when `batchesWithBatchNo.length > 0`).
- **Result in DB:** Lines like `ordMemo1: ""`, `ordMemo2: ""`, `ordMemo3: "30"`, `docBatchNo: ""`.

### 2. Load behaviour (current)

In the **useEffect** that builds `stockTakeItems` from `cartData` (when opening existing doc, ~lines 1764–1881):

- **isNewFormat** = `ordMemo1 === "specific" && ordMemo2` → **false** for ordMemo3-only lines.
- **isOldFormat** = multiple lines per item or `docBatchNo` → **false** (one line per item, no batch no).
- **firstItem.docBatchNo** → **false** (empty).
- So we fall into the **else** ("No batch") and set:
  - `hasBatchBreakdown = false`
  - `batchBreakdown = null`

So items that were saved with "No Batch" only are loaded **without** a batch breakdown.

### 3. Post behaviour

- Post uses **in-memory** `stockTakeItems` and calls `prepareCartDataFromConfirmedItems()`.
- Mandatory validation requires `hasBatchBreakdown && batchBreakdown?.length > 0` for every item with `countedQty > 0`.
- For ordMemo3-only items, `hasBatchBreakdown` is false → validation fails and toast appears.

---

## Plan Overview

| # | Area | Action | Purpose |
|---|------|--------|--------|
| 1 | **Load (useEffect)** | Treat "ordMemo3 only" as completed batch (No Batch) | Fix Post for existing and future saves that use ordMemo3-only. |
| 2 | **Reconstruct (optional)** | Return batchState when only ordMemo3 is set | Consistent batchState on cart so any code using it sees "No Batch". |
| 3 | **Save (optional)** | Set ordMemo1 when only No Batch is stored | Consistent "specific" format for new saves; load can rely on one format. |

---

## Detailed Plan

### Phase 1: Load path (required)

**File:** `src/pages/take/addTake.jsx`  
**Location:** useEffect that builds `stockTakeItems` from `cartData` (~1764–1881), inside the **else** branch that currently sets "No batch".

**Change:**

- When `getConfigValue("BATCH_NO") === "Yes"` and we are in the final **else** branch (no `isNewFormat`, no `isOldFormat`, no `docBatchNo`):
  - If `firstItem.ordMemo3` is a positive number (or `firstItem.docQty` > 0 and we use that as fallback), treat as **"batch selection completed with No Batch only"**:
    - Set `hasBatchBreakdown = true`.
    - Set `batchBreakdown = [{ batchNo: "", countedQty: parseFloat(firstItem.ordMemo3) || parseFloat(firstItem.docQty) || 0, availableQty: parseFloat(firstItem.docTtlqty) || 0, expDate: null }]`.
- Keep `totalCountedQty` and `totalSystemQty` as already computed in that else block (from docQty / docTtlqty).

**Result:** Existing documents (ordMemo1/ordMemo2 empty, ordMemo3 = qty) load with a valid batch breakdown, so Post validation passes without any DB or save format change.

**Edge cases:**

- If `ordMemo3` is missing or invalid, use `firstItem.docQty` for `countedQty` so the row still has a single "No Batch" entry and passes validation.

---

### Phase 2: Reconstruct path (optional, recommended)

**File:** `src/pages/take/addTake.jsx`  
**Location:** `reconstructBatchState` (~2157–2289).

**Change:**

- After the check `ordMemo1 === "specific" && cartItem.ordMemo2`, add a **new branch** (before the `docBatchNo` fallback):
  - If `getConfigValue("BATCH_NO") === "Yes"` and `(Number(cartItem.ordMemo3) || 0) > 0` and we did not already return (e.g. ordMemo1 not "specific" or ordMemo2 empty):
    - Return a batchState object with:
      - `batchDetails: [{ batchNo: "", countedQty: Number(cartItem.ordMemo3) || cartItem.docQty, availableQty: cartItem.docTtlqty || 0, expDate: null }]`
      - Plus the same shape as other returns (batchNo, expDate, batchTransferQty, noBatchTransferQty, totalTransferQty).

**Result:** When details are fetched, cart lines with only ordMemo3 get `batchState` set. The load useEffect can then rely on `firstItem.batchState.batchDetails` for these lines if we also consider "ordMemo3-only" as isNewFormat or add an explicit branch that uses batchState when it has a single No Batch entry. Phase 1 already fixes the symptom without relying on reconstruct; Phase 2 makes reconstruction consistent so batchState is never missing for batch-enabled lines with ordMemo3.

---

### Phase 3: Save path (optional, for consistency)

**File:** `src/pages/take/addTake.jsx`  
**Location:** `prepareCartDataFromConfirmedItems` (~1215–1271), inside the block that handles `item.batchBreakdown && item.batchBreakdown.length > 0`.

**Change:**

- When `batchesWithBatchNo.length === 0` but `noBatchItem && (noBatchItem.countedQty || 0) > 0`:
  - Set `ordMemoFields.ordMemo1 = "specific"` (and leave `ordMemo2 = ""`).
  - Keep setting `ordMemoFields.ordMemo3 = (noBatchItem.countedQty || 0).toString()` as today.

**Result:** New saves with "No Batch" only will have ordMemo1 = "specific". Reconstruct and load can then treat them like other "specific" lines (reconstructBatchState would need to handle ordMemo1 === "specific" && !ordMemo2 && ordMemo3 and return a No-Batch-only batchState). Phase 1 still ensures backward compatibility for data already saved without ordMemo1.

---

## Implementation Order

1. **Phase 1 (Load)** – Do first. Fixes the reported issue for all existing data and current save format.
2. **Phase 2 (Reconstruct)** – Do second so cart items always have batchState when ordMemo3 is present; keeps behaviour consistent for any code that reads batchState.
3. **Phase 3 (Save)** – Optional; do if we want a single consistent save format for "No Batch" only (ordMemo1 = "specific"). If Phase 3 is done, ensure reconstructBatchState treats ordMemo1 === "specific" && !ordMemo2 && ordMemo3 as No-Batch-only and returns the same shape as in Phase 2.

---

## Testing

- **Existing doc (ordMemo1/ordMemo2 empty, ordMemo3 = qty):** Open doc → go to Step 2 → Post without changing anything. Should succeed; no mandatory batch toast.
- **New save with "No Batch" only:** Select item → Enter qty → Select Batch → choose only "No Batch" → Confirm → Save. Reopen → Post. Should succeed.
- **New save with batch numbers + No Batch:** Same flow with mixed batches. Save → Reopen → Post. Should succeed.
- **New save with batch numbers only:** Same flow. Save → Reopen → Post. Should succeed.

---

## Summary

| Phase | Scope | Required? |
|-------|--------|-----------|
| 1 – Load | Recognize ordMemo3-only as valid batch (No Batch) in useEffect | **Yes** – fixes Post for current data |
| 2 – Reconstruct | Return batchState for ordMemo3-only in reconstructBatchState | Recommended |
| 3 – Save | Set ordMemo1 = "specific" when only No Batch is stored | Optional – format consistency |
