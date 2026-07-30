# Undo posted test documents

Simple guide after automated / manual testing.  
Use this sheet to list what was posted, then undo it.

---

## How to spot a test document

Test documents are marked like this:

| Field | What to look for |
|--------|-------------------|
| Remarks | `E2E_TEST` |
| Ref / Reference | starts with `E2E-` (example: `E2E-1730000000000`) |
| Item No | usually the test item from `.env` (example: `12200002`) |

**How to find them in the app**

1. Open the list page (Goods Receive, Return, Transfer, etc.).
2. In the search box, type `E2E`.
3. Write down **Doc No**, **Ref**, **Item No**, and **Qty** in the table below.

---

## Test run details (fill this in)

| | |
|--|--|
| Date of test | ________________ |
| Tester name | ________________ |
| Outlet | ________________ (example: DRAGON HEALTH) |
| HQ outlet | ________________ (example: DRAGON HEALTH HQ) |
| Main Item No used | ________________ (example: `12200002`) |
| Batch No (if any) | ________________ (example: `E2E01`) |

---

## List of posted test documents

Fill one row per document you need to undo.

| # | Document type | Doc No | Ref (`E2E-…`) | Item No | Qty | Outlet / Store | Done? |
|---|---------------|--------|---------------|---------|-----|----------------|-------|
| 1 | Goods Receive (GRN) | | | | | | ☐ |
| 2 | Stock Adjustment (ADJ) | | | | | | ☐ |
| 3 | Stock Usage (SUM) | | | | | | ☐ |
| 4 | Goods Return (RTN) | | | | | | ☐ |
| 5 | Transfer Out (GTO) | | | | | | ☐ |
| 6 | Transfer In (GTI) | | | | | | ☐ |
| 7 | Stock Take | | | | | | ☐ |
| 8 | Purchase Requisition (PR) | | | | | | ☐ |
| 9 | Other | | | | | | ☐ |
| 10 | Other | | | | | | ☐ |

> Tip: If the list search shows the row, open it once and copy **Doc No** and **Item No** carefully.

---

## How to undo (pick one way)

The app has **no “Unpost” button**.  
Choose **A** (best for clean UAT) or **B** (keep a paper trail).

### A — Ask DB / backend to remove the test docs

Give this list to whoever cleans the database:

1. All rows above where Remarks = `E2E_TEST` or Ref starts with `E2E-`.
2. For each **Doc No**, remove the header, line items, and stock movement rows linked to that Doc No.
3. If a batch was created for testing (example batch `E2E01`), check that batch qty is correct after cleanup.
4. Open **Stock Balance Live** for the **Item No** and confirm the qty looks right again.

### B — Post an opposite document in the app

Also put Remarks = `E2E_TEST` and Ref = `E2E-…` so these are easy to find later.

| If you posted… | Post this to cancel the stock effect |
|----------------|--------------------------------------|
| Goods Receive (adds stock) | Goods Return for same **Item No** and **Qty** |
| Goods Return (removes stock) | Goods Receive for same **Item No** and **Qty** |
| Stock Usage (removes stock) | Goods Receive or Adjustment (+) for same **Item No** and **Qty** |
| Adjustment + (adds stock) | Adjustment − for same **Item No** and **Qty** |
| Adjustment − (removes stock) | Adjustment + for same **Item No** and **Qty** |
| Transfer Out from A → B | Transfer the same **Item No** / **Qty** back B → A (or clean both sides in DB) |
| Transfer In | Transfer out again, or clean in DB |
| Stock Take with **same** count as on hand | Usually nothing to undo for stock |
| Stock Take with different count | Also undo any auto Adjustment created by the take |
| Purchase Requisition | No stock change — remove in DB or leave; do not “unpost” in UI |

Write the undo Doc No here when done:

| Original Doc No | Undo Doc No | Item No | Qty | Date undone |
|-----------------|-------------|---------|-----|-------------|
| | | | | |
| | | | | |
| | | | | |

---

## Quick check after cleanup

| Check | OK? |
|-------|-----|
| Search `E2E` on each list — no unwanted Posted rows left (or only ones you chose to keep) | ☐ |
| Stock Balance Live for Item No ____________ looks correct | ☐ |
| No leftover test batch qty that should not be there | ☐ |

---

## Example (sample only — replace with your real numbers)

| Document type | Doc No | Ref | Item No | Qty | How undone |
|---------------|--------|-----|---------|-----|------------|
| Goods Receive | *(paste from list)* | `E2E-1730000000000` | `12200002` | 5 | DB remove **or** Return Doc No _______ |
| Goods Return | *(paste from list)* | `E2E-…` | `12200002` | 1 | DB remove **or** Receive Doc No _______ |

---

## Important

- Do **not** only change status from Posted back to Open. Stock will stay wrong.
- Always record **Doc No** and **Item No** before deleting or reversing.
- Prefer cleaning **UAT / train** only — never run this cleanup on live production without approval.
