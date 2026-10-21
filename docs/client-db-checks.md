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

## Sign-off

Client: _______________  
Date: _______________

- [ ] 1. Batch number columns hold 20 characters, and memo / `itemBatch` columns hold the joined values
