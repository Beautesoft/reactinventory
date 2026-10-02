# Replenishment Report — Feasibility Analysis (UAT feedback, 4 items)

Report under review: [`src/pages/reports/replenishmentReport.jsx`](../src/pages/reports/replenishmentReport.jsx) (`/replenishment-report`)
Same rule is duplicated on the Dashboard Low Stock Alert: [`src/pages/dashBoard.jsx`](../src/pages/dashBoard.jsx) (`dashBoard.jsx:93-128`).

## Verdict summary

| # | Issue | Root cause | Feasible? | Scope |
|---|-------|-----------|-----------|-------|
| 1 | Dept / Brand / Range show **codes** (10001, 100015) instead of descriptions | Report prints raw `Stocks.itemDept/itemBrand/itemRange`; no lookup join | **Yes** | Frontend only |
| 2 | **UOM** column empty | `Stocks.itemUom` is null for this item; report never falls back to `ItemUomprices`/`ItemStocklists` | **Yes** | Frontend only |
| 3 | **On Hand = 0**, actual = 3 | Report reads `ItemStocklists.onhandQty`, which this app only ever *creates as 0* and never updates. Real balance lives in `Itemonqties` / `ItemBatches` | **Yes, but source must be swapped** | Frontend (+ optional backend view) |
| 4 | **Suggested Qty** duplicates Reorder Min | By definition `Suggested = max(0, ReorderMin − OnHand)`; with OnHand = 0 they are always equal. No "order-up-to" field exists in the schema | **Partly — needs a business rule** | Needs decision |

---

## 1. Dept / Brand / Range → show descriptions

**Confirmed root cause.** The row is built from the item-master record only:

```js
Dept:   stock.itemDept  || "",
Brand:  stock.itemBrand || "",
Ranges: stock.itemRange || "",
```

`Stocks.itemDept`/`itemBrand`/`itemRange` hold **codes**. The lookup tables exist and are already used for exactly this purpose in Item Master list ([`itemMasterList.jsx:44-54`](../src/pages/item-master/itemMasterList.jsx)):

- `itemDept` → `ItemDepts.itmCode` → `itmDesc`
- `itemBrand` → `ItemBrands.itmCode` → `itmDesc`
- `itemRange` → `ItemRanges.itmCode` → `itmDesc`

**Fix:** fetch `getItemDepts()`, `getItemBrands()`, `getItemRanges()` once with the other lookups (the report already calls them for its filter dropdowns via `/api/department`, `/api/Brand`, `/api/Range`), build code→description maps, and resolve at row-build time. Add a short in-memory cache per report run.

**Careful — filter consistency.** The optional filters currently compare *codes*:

```js
if (brandValues.length > 0 && !brandValues.includes(String(stock.itemBrand ?? ""))) return false;
```

and the dropdown option `value` is a code. If only the display is changed, filtering still works. If both display **and** filter are switched to descriptions, the mapping must be applied on both sides in the same run, or filters silently return nothing. Recommended: keep filtering on codes, display descriptions (also keeps the Excel export aligned).

**Effort:** ~1 hour. **Risk:** low. **Only** if `ItemDepts`/`ItemBrands`/`ItemRanges` rows exist for the site — otherwise the code is the honest fallback (keep `?? code`).

---

## 2. UOM column is empty

**Confirmed root cause.** The report writes `UOM: stock.itemUom || ""`. On the Item Master screen the same item shows `SET` under **Stk.Balance → UOM Code**, and that field is pre-filled as:

```js
setStkBalanceUomCode(normalizedUoms?.[0]?.itemUom ?? stock?.itemUom ?? "");
```

i.e. the real UOM comes from **`ItemUomprices`**, with `Stocks.itemUom` only a fallback ([`itemMasterForm.jsx:758`](../src/pages/item-master/itemMasterForm.jsx)). `Stocks.itemUom` is written at save time as `uoms[0]?.itemUom || uomOptions[0]?.value || null` ([`itemMasterSave.js:126`](../src/utils/itemMaster/itemMasterSave.js)) — null for items that never got a UOM price row (division 3/4/5 or SET-type items).

**Fix options, cheapest first:**

1. Fall back to `ItemUomprices` for the item (`getAllItemUomprices()` is already available and fetches in one call) → take the primary/first UOM.
2. Fall back to the UOM carried by the on-hand source once issue 3 is fixed (`Itemonqties.uom` / `ItemBatches.uom`) — this is *more* correct for a replenishment report, because you replenish in the UOM that is actually stocked.
3. Keep `stock.itemUom` as last resort; show `"—"` only when all are missing.

Option 2 is recommended and comes almost free with the fix for issue 3.

**Effort:** ~1 hour (folded into issue 3). **Risk:** low.

---

## 3. On Hand shows 0, actual is 3 — the real problem

**Confirmed root cause: wrong data source.** The report reads `ItemStocklists.onhandQty`:

```js
const [reorderStocks, siteStocklists] = await Promise.all([
  itemMasterApi.getReorderActiveStocks(),
  itemMasterApi.getItemStocklistsBySites(selectedSiteCodes),
]);
...
const onHand = Number(sl.onhandQty) || 0;
```

Evidence that `ItemStocklists.onhandQty` is **not the live balance** in this app:

| Table | Written by | Read by |
|---|---|---|
| `ItemStocklists.onhandQty` | `itemMasterForm.jsx:1394` and `1422` — **on item create/edit only, always `0`** | Replenishment report, Dashboard Low Stock |
| `Itemonqties` (`trnBalqty`, `trnBalcst`) | Every posting path: GRN `addGrn.jsx:2203`, ADJ `addAdj.jsx:3452`, SUM `addSum.jsx:2337`, RTN `addRtn.jsx:2442`, GTO/GTI, Take `addTake.jsx:3142` | Posting balance calc, `getOnHandQty()` in [`docReverseApi.js:87-115`](../src/services/docReverseApi.js) |
| `ItemBatches.qty` | `ItemBatches/updateqty` from every posting path (~77 call sites) | Batch modal, Stock Take |

No code path in `src/` ever **updates** `ItemStocklists.onhandQty`. It is initialised to `0` and then shown read-only in Item Master "Stk.Balance" — which is exactly the stale-0 the customer is seeing. `Itemonqties` is the table the legacy app and every new document flow maintains, and it is the source that already reads 3 on the Stock Balance screen.

**Recommended fix (frontend, no backend change):** keep the reorder source (`Stocks.reorderActive` + `reorderMinqty`) but replace the on-hand source:

- Fetch balances for the selected sites **and only the candidate items** (those with `reorderActive` + `reorderMinqty > 0`), e.g. `Itemonqties?filter={"where":{"and":[{"sitecode":{"inq":[...]}}]}}` then group by `itemcode`+`sitecode`, summing `trnBalqty` across UOM rows.
- Fallback chain for robustness: `Itemonqties` → sum of `ItemBatches.qty` for the item/site (needed when `BATCH_NO = Yes` and Itemonqties has no row, same fallback `getOnHandQty()` already implements).
- Keep `ItemStocklists` only for the "is this item active at this site" flag (`itemstocklistStatus`), which is what it is genuinely good for.
- Also fix the Dashboard Low Stock Alert in the same pass — it copies the identical stale rule.

**Volume/perf check:** current implementation fetches up to 20 000 stock rows + 50 000 stocklist rows and joins in the browser; that is already acceptable for a report. Adding balances for the candidate set only (typically dozens–hundreds of items) keeps it in the same range. If the client would rather not filter client-side, the clean long-term option is a server-side view/endpoint (e.g. `webInventory_Replenishment`) — see "Alternative" below.

**Known limitation to state in UAT:** `Itemonqties.trnBalqty` is per-item **per-UOM**. If the item is stocked in more than one UOM, the report sums them; if the business wants one row per UOM, the report must be changed to key by `itemcode + uom`. Also, negative balances (possible via ADJ) should be clamped at display level, not silently treated as 0 for the "Low/Critical" decision.

**Effort:** ~0.5–1 day including the balance fetch, fallback, UOM from balance, and Dashboard parity. **Risk:** medium — must verify against the live API that `Itemonqties` returns 3 for item 1220002 at `DRAGON HEALTH HQ - Train` before shipping; the whole report's meaning depends on this.

**Not feasible without more info:** if the backend's `ItemStocklists.onhandQty` *is* supposed to be the authoritative balance (i.e. the backend should be syncing it on every posting but has a bug), then the correct fix is on the backend, not in the report. That must be confirmed with SYY/the backend owner — one query on `ItemStocklists` vs `Itemonqties` for item 1220002 settles it. This is the single blocking question.

### Alternative (bigger, cleaner)
Implement `POST /api/webInventory_Replenishment` next to the existing `webInventory_StockBalance` ([`stockBalanceReports.jsx:188`](../src/pages/reports/stockBalanceReports.jsx)) returning Site, Item, descriptions, UOM, OnHand, ReorderMin, SuggestedQty already joined server-side. Removes 20k/50k-row client fetches, guarantees one definition of on-hand, and makes Dashboard/report consistent. Higher cost, needs backend slot.

---

## 4. Reorder Min vs Suggested Qty (why both say 10)

**This is not a bug — it is the current definition.** From the code:

```js
const shortfall = Math.max(0, reorderMin - onHand);   // = 10 - 0 = 10
SuggestedQty: shortfall,
```

`Reorder Min` is the **trigger** ("warn me when on-hand ≤ 10"). `Suggested Qty` is the **shortfall to get back to the trigger** — so with on-hand 0 it is arithmetically identical to Reorder Min. Note the value would still be 10 even with the correct on-hand of 3 (10 − 3 = 7 would be the shortfall; see below).

The intended distinction only exists if "suggested" means something else. Feasible definitions, in increasing usefulness:

| Option | Formula | Needs new data? |
|---|---|---|
| A. Shortfall (status quo) | `ReorderMin − OnHand` | No |
| B. Order-up-to / Max level | `Target − OnHand`, where Target = reorder max | **Yes** — a max/reorder-qty field |
| C. Cover-based | `ceil(avg daily usage × replenishment days) − OnHand` | Yes — usage history + days |
| D. Supplier pack rounding | `roundUp(shortfall, packSize)` | Yes — pack size |

**What the schema has today:** `Stocks.reorderActive`, `Stocks.reorderMinqty` only. There is **no** reorder-quantity/max-level column on `Stocks`, and `ItemStocklists.itemstocklistMinqty` / `itemstocklistMaxqty` exist but this app writes both as `0` and never reads them for replenishment. `Stocks.custReplenishDays` + `custAdvanceDays` exist (from the "Customer Replenishment" block in the screenshot) but are a customer-reminder feature, not a stock cover rule.

**So:**
- If the client accepts "Suggested = shortfall", then **document it** and rename the column (e.g. "Shortfall / Order Qty") or hide Reorder Min → the confusion disappears with zero code risk.
- If the client wants Suggested ≠ Reorder Min, a **new field is required first** (reorder max / order-up-to, or pack size), saved on Item Master alongside `Min_Qty`. That is a schema + Item Master form + save-payload change, then the report change. Feasible, but not a report-only fix — and it needs the client's written rule.

**Effort:** Option A relabel ~15 min. Option B/C/D: 1–3 days, gated on the business rule and the new column.

---

## Additional defects found while reviewing (cheap to fix in the same pass)

1. **"Outlet Total" row shows 0.00 for Suggested Qty.** `ReportResults` only sums its legacy keys (`Qty`, `Cost`, `TotalCost`, `TotalAmount`, `TranQty`/`TranAmt`). The replenishment columns (`OnHand`, `ReorderMin`, `SuggestedQty`) hit the `return "0"` branch in [`ReportResults.jsx:840-881`](../src/components/ReportResults.jsx). Should sum `SuggestedQty` (and probably `ReorderMin`) per outlet, with a grand total.
2. **Excel export hard-codes row width.** `replenishmentReport.jsx:336` pushes `[outlet, "", "", …]` with 12 empty cells, and the outlet-total/grand-total rows assume the same fixed layout. Any column add/remove silently misaligns the export.
3. **Status is misleading.** `Status: onHand <= 0 ? "Critical" : "Low"` — with the stale on-hand every row is "Critical". Once the balance is real, "Critical" should mean at/below zero **after** clamping, not "couldn't read a balance".
4. **`reorderActive: true` filter is type-fragile.** If the DB stores `1/0` rather than a boolean, LoopBack `{reorderActive: true}` silently returns nothing. Worth confirming (the screenshot produced rows, so it works today).
5. Filters match `stock.itemDept` etc. against option **codes** while the grid will show **descriptions** — keep both sides consistent (see §1).

---

## Recommended sequencing

1. **Confirm the on-hand source with backend** (one query: `ItemStocklists.onhandQty` vs `Itemonqties.trnBalqty` for item 1220002 / that site). Blocking for §3.
2. Ship §1 + §2 + §3 together (same code path) and mirror the fix into the Dashboard Low Stock Alert.
3. Fix the outlet-total row and the Excel row widths (defect 1 & 2).
4. Get the written rule for §4. If "shortfall" is accepted, relabel and close; otherwise scope the new reorder-max field.

**Not feasible as-is:** making Suggested Qty differ from Reorder Min without a new business rule and (usually) a new field — the report cannot invent a number the schema does not hold.
