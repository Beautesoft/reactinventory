# Database checks — all clients

Run these on **each new client database** before go-live. Add later findings here as the next numbered check. Do not treat `scripts/db-schema-updates.sql` as proof a column is wide enough: that script only **adds** a column when the LoopBack name is missing (for example `StkMovdocDtls.docBatchNo`). It does not widen an existing legacy column such as `Stk_MovDoc_Dtl.DOC_BATCH_NO`.

SQL Server error 2628 (`String or binary data would be truncated… Truncated value: '…'`) means the write was rejected. **Truncated value** is the prefix that would have fit, so its length is the column width.

```sql
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE DATA_TYPE IN ('nvarchar', 'varchar', 'nchar', 'char')
  AND (
    COLUMN_NAME LIKE '%BATCH%'
    OR COLUMN_NAME LIKE '%MEMO%'
    OR COLUMN_NAME LIKE '%REMARK%'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
```

---

## 1. Batch number columns must hold 20 characters

GRN, PO, and PR batch inputs allow 20 characters (`maxLength={20}` in `src/pages/grn/addGrn.jsx`, `src/pages/po/addPo.jsx`, `src/pages/pr/addPr.jsx`).

On Zenth, `dbo.Stk_MovDoc_Dtl.DOC_BATCH_NO` was `nvarchar(10)`. Save of GRN `WGRNZE02110415` line `docId` 57328 sent `docBatchNo` `"DO-2609-015"` (11 characters) and returned 500. Truncated value was `'DO-2609-01'` (the first 10 characters). Widen that column to `nvarchar(20)`.

The same batch string is written again on post. A 20-character `DOC_BATCH_NO` is not enough if these are still shorter:

| What the app writes | Minimum |
|---|---|
| Single batch number (`DOC_BATCH_NO`, `ItemBatches.batchNo`, `Stktrnbatches.batchNo`) | `nvarchar(20)` |
| `ordMemo2` (`batchNo:qty`, several pairs) | wider than 20; the app script uses 500 |
| `ordMemo4` (expiry and qty, same pattern) | same as `ordMemo2` |
| `Stktrns.itemBatch` (comma-joined batch numbers) | `nvarchar(255)`, not 20 |
| `itemRemark` | at least 20 when users paste the batch or DO number there |

| Check | Pass |
|---|---|
| `DOC_BATCH_NO` | `nvarchar` / `varchar` length **≥ 20** |
| Other single batch-number columns from the query | length **≥ 20** |
| `ordMemo2`, `ordMemo4` | long enough for `batch:qty` lists (500 in the app script) |
| `itemBatch` | long enough for comma-joined batches (255 in the app script) |

---

## 2. Quantity and cost columns must be `decimal`, not `float`

Stock usage accepts a fractional quantity on the primary UOM (`ItemUomprices.itemUompriceSeq = 1`), for example `0.2` or `0.5`. Whole numbers are exact in `float`. Fractions are not.

On Zenth train, 22 Oct 2026, usage of `0.2` for item `11600049` at `ZEHQ` reduced batch `A01` from 5 to what should be 4.8. The column stored `4.80000019073486`. The ledger balance stored `16.7999992370605` instead of 16.8. `BATCH_COST` already had the same noise in 2023 (`731.400024414063` on batch id `611`). Rounding in the React app does not fix this: `ItemBatches/updateqty` adds the delta in `float`.

`decimal(18,4)` means 18 digits in total, 4 of them after the decimal point. `0.2` is stored as `0.2000`, `4.8` as `4.8000`.

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('ITEM_BATCH', 'Stktrn')
  AND COLUMN_NAME IN ('QTY', 'TRN_QTY', 'TRN_BALQTY', 'TRN_BALCST', 'BATCH_COST');
```

Zenth train result (all `float(53)`): `ITEM_BATCH.QTY`, `ITEM_BATCH.BATCH_COST`, `Stktrn.TRN_QTY`, `Stktrn.TRN_BALQTY`, `Stktrn.TRN_BALCST`.

Change the quantity columns first. Change the cost columns in the same pass if money must stay exact. `ITEMONQTY` is a view; it needs no alter. Round existing rows as part of the type change so `4.80000019073486` becomes `4.8000`.

How `ITEMONQTY` is built, and when a fractional usage is allowed, is in `docs/itemonqty-and-decimal-qty.md`.

| Check | Pass |
|---|---|
| `ITEM_BATCH.QTY`, `Stktrn.TRN_QTY`, `Stktrn.TRN_BALQTY` | `decimal` with scale **≥ 4** |
| `ITEM_BATCH.BATCH_COST`, `Stktrn.TRN_BALCST` | `decimal` with scale **≥ 2** (4 if changed with the quantity columns) |

---

## Sign-off

Client: _______________  
Date: _______________

- [ ] 1. Batch number columns hold 20 characters, and memo / `itemBatch` columns hold the joined values
- [ ] 2. Quantity columns are `decimal` with scale at least 4, not `float`
