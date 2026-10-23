# ITEMONQTY and decimal stock usage

Confirmed on Zenth train, 22 Oct 2026, from `dbo.ITEMONQTY` and a posted usage of `0.2` on item `11600049` / site `ZEHQ`.

## What ITEMONQTY is

`dbo.ITEMONQTY` is a view, not a table the app writes. One row per `ITEM_BATCH` row. `TRN_BALQTY` and `TRN_BALCST` are the latest stock-ledger balance for that item, site, and UOM, copied onto every batch row. `BATCH_COST` is the only value taken from the batch. `ITEM_BATCH.QTY` is not in the view.

```sql
CREATE VIEW [dbo].[ITEMONQTY] AS
SELECT DISTINCT
  item_batch.id,
  item_batch.ITEM_CODE + '0000' AS ITEM_CODE,
  item_batch.SITE_CODE,
  item_batch.UOM,
  ISNULL(item_batch.BATCH_COST, 0) AS BATCH_COST,
  ISNULL(Stktrn.TRN_BALQTY, 0) AS TRN_BALQTY,
  ISNULL(Stktrn.TRN_BALCST, 0) AS TRN_BALCST
FROM item_batch
LEFT JOIN Stktrn
  ON Stktrn.ITEMCODE = item_batch.ITEM_CODE + '0000'
 AND Stktrn.Item_UOM = item_batch.UOM
 AND Stktrn.STORE_NO = item_batch.SITE_CODE
 AND Stktrn.ID = (
   SELECT TOP 1 id
   FROM Stktrn AS Stktrn1
   WHERE Stktrn1.STORE_NO = item_batch.SITE_CODE
     AND Stktrn1.ITEMCODE = item_batch.ITEM_CODE + '0000'
     AND Stktrn1.Item_UOM = item_batch.UOM
   ORDER BY TRN_POST DESC, POST_TIME DESC, id DESC
 )
WHERE item_batch.ITEM_CODE <> ''
```

The `TOP 1` was changed on 8 Feb 2022 (comment in the view, discussion with Yoonus). Before that it used `MAX(id)`. It now picks the newest post date, then the newest post time, then the highest id. The app writes `trnPost` as the day of the post (`YYYY-MM-DD`) and `postTime` as `HHmmss`.

Four batches for one item therefore show the same `TRN_BALQTY` four times. Do not add those rows together.

The ledger item code has `0000` on the end (`11600049` in `ITEM_BATCH`, `116000049000` in `Stktrn` / `ITEMONQTY`). The React post code appends that suffix in `createTransactionObject`.

## When the three totals match

Posted one after another, a new item stays aligned. Each post reads `ITEMONQTY.TRN_BALQTY` (0 when no ledger row exists yet), writes `Stktrn.TRN_BALQTY = that balance + this quantity`, and applies the same quantity to `ITEM_BATCH.QTY`. The view then shows the new balance on every batch row.

| Step | Post | Ledger balance | Batches | ITEMONQTY on every row |
|---|---|---:|---|---:|
| 1 | Receive 10 into B1 | 10 | B1 = 10 | 10 |
| 2 | Receive 4 into B2 | 14 | B1 = 10, B2 = 4 | 14 |
| 3 | Use 2 from B1 | 12 | B1 = 8, B2 = 4 | 12 |

Receipt quantity is positive (`addGrn.jsx`). Usage quantity is negative (`addSum.jsx`: `trnQty = -abs(docQty)`). Both use `trnBalqty = trnQty + balance from Itemonqties`.

An old item can already disagree. Item `11600001` at `ZEHQ` had batch quantities totalling 437 while every `ITEMONQTY` row showed 77, the latest ledger balance. Posting does not rebuild one side from the other. The screen On Hand Qty comes from batch quantities (`GetInvitems`), not from `ITEMONQTY`.

## Decimal usage

The usage screen allows `0.2` or `0.5` only when `allowDecimalQty` is true. That flag is true only for the UOM whose `ItemUomprices.itemUompriceSeq` is `1` (`src/utils/uomDecimalQty.js`). Other UOMs stay whole numbers.

Item `11600049` at `ZEHQ` is sequence 1. A usage of `0.2` posted, and batch `A01` was reduced. The chain held. The stored figures did not:

| Should be | Stored in `float(53)` |
|---|---|
| A01 quantity 4.8 | `4.80000019073486` |
| Site balance 16.8 | `16.7999992370605` |

`ITEM_BATCH.QTY`, `ITEM_BATCH.BATCH_COST`, `Stktrn.TRN_QTY`, `Stktrn.TRN_BALQTY`, and `Stktrn.TRN_BALCST` are `float(53)` on this database. Whole numbers stay exact. `0.2` does not. Cost columns already showed the same noise in 2023. Sending a rounded `0.2` from the browser does not fix it, because the column and `ItemBatches/updateqty` stay `float`.

Change those columns to `decimal(18,4)` (18 digits, 4 after the decimal point: `0.2000`, `4.8000`). The go-live check is `docs/client-db-checks.md`, section 2.
