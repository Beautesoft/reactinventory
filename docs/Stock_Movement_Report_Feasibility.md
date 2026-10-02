# Stock Movement Report — Feasibility Analysis (UAT feedback, 4 items)

Report under review: [`src/pages/reports/stockMovementReports.jsx`](../src/pages/reports/stockMovementReports.jsx) (`/stock-movement`, auth F10011)
Header + grid are rendered by the shared component [`src/components/ReportResults.jsx`](../src/components/ReportResults.jsx).

UAT text reviewed (screenshot taken **07 Sep 2026**): default dates 01-08-2025 / 29-08-2025; header shows `As On Date: -`; item code shown as `122000180000` instead of `12200018`.

## Verdict summary

| # | Issue | Root cause | Feasible? | Scope |
|---|-------|-----------|-----------|-------|
| 1 | Default **From/To Date = 01-08-2025 / 29-08-2025** | Three hard-coded literals left over from ASP.NET screenshot comparison | **Yes** | Frontend only (~30 min) |
| 2 | Header shows **`As On Date: -`** instead of Start/End Date | `ReportResults` hard-codes an `As On Date` row; Stock Movement never passes `asOnDate` | **Yes** | Frontend only (~20 min) |
| 3 | **Item Code `122000180000`** should be the 8-digit `12200018` | `Stktrns.itemcode` = base code + literal `"0000"`; the grid prints the raw API value | **Yes**, display-only | Frontend only (~1 h) |
| 4 | Ability to pull a period **older than a year** ("defaulting User…more than one year ago") | Same stale default as #1 — the window is fixed to Aug 2025 | **Yes** (closed by #1); no client-side date-range limit exists today | Frontend only; backend confirmation only if a hard horizon is wanted |

**All four are frontend-only, no backend/API change required.** Total ≈ 0.5 day plus two live-API confirmations (see "Open questions").

---

## 1. Default From/To Date is a hard-coded leftover

**Confirmed root cause.** The dates are literal strings in **three** places, all in the same file:

```js
// stockMovementReports.jsx:22-24  — initial state
const [filters, setFilters] = useState({
  fromDate: "2025-08-01",
  toDate: "2025-08-29",
  ...

// stockMovementReports.jsx:36-48  — mount effect that re-applies the same constants
// Use the exact working dates from ASP.NET
// ASP.NET shows data for August 2025, so let's use that
const workingFromDate = "2025-08-01"; // August 1, 2025
const workingToDate = "2025-08-29";   // August 29, 2025

// stockMovementReports.jsx:258-274 — Reset button
setFilters({ fromDate: "2025-08-01", toDate: "2025-08-29", ... });
```

The comment at `:38-41` is the giveaway: these were copied from an ASP.NET screenshot during development. They were never made dynamic, so every user opening the report today lands on a window that is 13 months old, and **Reset** sends them straight back to it.

**Fix (frontend only).** One helper, used by all three call sites; `moment` is already imported in this file (`:10`):

```js
// src/utils/utils.js  (next to formatCurrentDate)
export const defaultMovementDateRange = () => {
  const lastMonth = moment().subtract(1, "month");           // local time (MYT)
  return {
    fromDate: lastMonth.clone().startOf("month").format("YYYY-MM-DD"),
    toDate: lastMonth.clone().endOf("month").format("YYYY-MM-DD"),
  };
};
```

Then: `useState({ ...defaultMovementDateRange(), ... })` at `:22`, the same call in `handleReset` at `:258`, and **delete** the mount effect at `:37-48` (it becomes a no-op that fights the state). Note the inputs are `<input type="date">` (`:615-631`) and the payload re-formats to `DD/MM/YYYY` for the API (`:214-215`), so the internal `YYYY-MM-DD` shape must be preserved — which the helper does.

**Why not `new Date().toISOString().split("T")[0]`** (the pattern used in [`stockBalanceReports.jsx:29`](../src/pages/reports/stockBalanceReports.jsx)): in UTC+8 that returns *yesterday* before 08:00 local. That latent bug exists in Stock Balance today; do not copy it here. `formatCurrentDate` ([`utils.js:417-423`](../src/utils/utils.js)) already uses local date parts — follow that convention.

**Effort:** ~30 min. **Risk:** low. No test asserts the current defaults: [`e2e/smoke/menus.spec.js:22`](../e2e/smoke/menus.spec.js) only checks the page heading, and [`docs/Inventory_UAT_Test_Checklist.md:428`](Inventory_UAT_Test_Checklist.md) only requires "From ≤ To".

**Behavioural note to state in UAT:** with a last-month default, a site with no movement in that month now opens to an empty report. That path is already handled (info toast at `:234-238`, empty table + same header block at `ReportResults.jsx:498-600`), but it is a visible change in first impression versus the Aug-2025 window that happened to contain data.

---

## 2. `As On Date` is irrelevant here — show Start Date / End Date

**Confirmed root cause.** `ReportResults` hard-codes the row inside its "detailed" header block:

```jsx
// ReportResults.jsx:743 (populated grid) and :535 (empty-report branch)
<p><span className="w-32 inline-block">As On Date:</span> {reportDetails.asOnDate || "-"}</p>
```

Stock Movement sets `showDetailedInfo={true}` ([`stockMovementReports.jsx:795`](../src/pages/reports/stockMovementReports.jsx)) but its `reportDetails` object (`:800-812`) passes `fromDate` and `toDate` — **no `asOnDate`** — hence the `-` in the screenshot. The two dates the user actually wants are already being handed to the component and simply never rendered.

**Scope check (verified by grep):** `showDetailedInfo` is set to `true` in exactly one place — Stock Movement. Stock Balance shows its `As On Date` through its own `customFooter` ([`stockBalanceReports.jsx:552-558`](../src/pages/reports/stockBalanceReports.jsx)), which is unaffected. So changing this block cannot regress another report.

**Fix (frontend only).** Replace the one row with two, in **both** branches so the no-data screen matches the populated one:

```jsx
<p><span className="w-32 inline-block">Start Date:</span> {reportDetails.fromDate || reportDetails.startDate || "-"}</p>
<p><span className="w-32 inline-block">End Date:</span> {reportDetails.toDate || reportDetails.endDate || "-"}</p>
```

Keeping `asOnDate` as a fallback (or leaving the row conditional) preserves the block for any future detailed report that genuinely has an as-on date. Cheap alignment: the Excel header built in [`stockMovementReports.jsx:413-414`](../src/pages/reports/stockMovementReports.jsx) already prints the same two dates but labels them `From Date:` / `To Date:` — change to `Start Date:` / `End Date:` if the wording should match the screen exactly.

**Layout:** the swap grows the left column from 5 to 6 lines, matching the right column (6 lines) — the two-column grid becomes balanced rather than lop-sided.

**Effort:** ~20 min. **Risk:** low. PDF/Word exports serialise the same DOM, so they inherit the change with no extra work.

---

## 3. Item Code should be the 8-digit base code (drop the `0000` suffix)

**Confirmed root cause — and it is a known, documented convention.** The movement rows come from `Stktrns`, where the item code is stored as **base code + literal `0000`**:

- [`docs/GRN_POST_TO_DB_TRANSACTION_SPEC.md:366`](GRN_POST_TO_DB_TRANSACTION_SPEC.md) and `:394` describe `itemcode` as the client appending a literal `"0000"`.
- Q1 at [`docs/GRN_POST_TO_DB_TRANSACTION_SPEC.md:692`](GRN_POST_TO_DB_TRANSACTION_SPEC.md) states it outright: *"The client appends it on write and strips it on read."*
- Write side, e.g. [`addGrn.jsx:2060`](../src/pages/grn/addGrn.jsx) `itemcode: item.itemcode + "0000"`, and the helper [`itemCodeHelpers.js:5`](../src/utils/itemMaster/itemCodeHelpers.js) `(String(code) + "0000").substring(0, 12)`.
- Read side: the strip is already implemented — as a shared helper `trimItemCode` in [`docReverseApi.js:32`](../src/services/docReverseApi.js) (`.replace(/0000$/, "")`) and inlined ~20 more times (e.g. [`addTake.jsx:2256`](../src/pages/take/addTake.jsx), [`addRtn.jsx:2564`](../src/pages/rtn/addRtn.jsx), [`addAdj.jsx:2450`](../src/pages/adj/addAdj.jsx)).

The Stock Movement grid is one of the read paths that never strips it. The value rendered is `itemInfo.ItemCode` at [`ReportResults.jsx:1001`](../src/components/ReportResults.jsx) — that is the `122000180000` the client sees.

**Why Replenishment looks right already:** it builds rows from `Stocks.itemCode` ([`replenishmentReport.jsx:240`](../src/pages/reports/replenishmentReport.jsx)), a table that holds the base code with no suffix — not because it applies any special formatting. So the inconsistency is a data-source artefact, and matching it here is purely a display transform.

**Fix (frontend only, display-only):**

1. Promote the helper to the utils layer so there is one definition, e.g. add to [`itemCodeHelpers.js`](../src/utils/itemMaster/itemCodeHelpers.js):
   ```js
   export const displayItemCode = (code) => String(code || "").replace(/0000$/, "");
   ```
   and have `docReverseApi.trimItemCode` delegate to it (no behaviour change).
2. Apply it at the four *display* sites:
   - [`ReportResults.jsx:1001`](../src/components/ReportResults.jsx) — grouped item header (the visible defect).
   - [`ReportResults.jsx:223`](../src/components/ReportResults.jsx) — `itemInfo.ItemCode`, or leave raw and trim only at render.
   - [`stockMovementReports.jsx:447`](../src/pages/reports/stockMovementReports.jsx) — Excel export item header row.
   - [`stockMovementReports.jsx:278-283`](../src/pages/reports/stockMovementReports.jsx) — add `render: displayItemCode` to the `ItemCode` column so the ungrouped path (used by `ReportResults.jsx:1150`) stays consistent.
3. **Do not touch:** the grouping/collapse keys (`ReportResults.jsx:214-235`), and the `From Item` / `To Item` filter values sent to the API (`stockMovementReports.jsx:219-220`) — those must stay in the stored form.

PDF (html2canvas of `#printable-content`) and Word (`innerHTML` of the same node) inherit the change automatically; only Excel rebuilds rows from data and needs its own edit.

**Risk:** low for display, but two things must be confirmed against the live API before shipping:

- **Exact suffix shape.** Sample one `webBI_StockMovementDetail` response. `122000180000` and `000000000012200180000` both reduce to the same 8 digits with the regex, so a single `.replace(/0000$/, "")` covers either — but confirm no legitimate 8-digit code itself ends in `0000` *after* the suffix is removed (stripping exactly one trailing occurrence, as the whole repo already assumes, is the safe reading).
- **Possibly a pre-existing filter bug — worth testing while you are in here.** The `From Item` / `To Item` dropdowns are populated from `/api/StockList` (`stockMovementReports.jsx:160-165`), whose `itemCode` is most likely the **base** code, while the movement rows carry the **suffixed** code. If the report's stored procedure compares the two literally, selecting a specific From/To Item returns nothing today. One manual test (filter by the item from the screenshot) settles it; if it fails, the fix is to append `0000` to the filter value, not to change the display.

**Search box:** filtering matches the raw row values with `includes` ([`ReportResults.jsx:169-179`](../src/components/ReportResults.jsx)), so typing `12200018` still matches `122000180000`. No change needed.

**Effort:** ~1 h including the helper extraction and the two verifications. **Risk:** low.

---

## 4. "Extracting from more than one year ago"

Read literally, the UAT sentence is the *rationale* for #1 — the fixed Aug-2025 default forces a user in Sep-2026 to report on a period more than a year old, which is why they ask for last month. **#1 closes this completely.**

If the client also means *"can a user query a period older than / longer than one year?"*, the answer today is **yes, nothing in the client blocks it**:

- The date inputs have no `min`/`max` ([`stockMovementReports.jsx:615-631`](../src/pages/reports/stockMovementReports.jsx)) — only required-ness and `From ≤ To` are validated (`:192-205`).
- The HTTP client sets no timeout ([`apiService1.js:29-34`](../src/services/apiService1.js)) — a wide range is bounded only by the server.
- A single-year range is sent as two `DD/MM/YYYY` strings (`:214-215`); the response size, not the client, is the constraint.

The real limits are therefore backend-side: query cost on `Stktrns` and how much history the database retains. **Needs backend confirmation (SYY) only if the client wants a guaranteed or enforced horizon.** If the concern is a slow long-range query, the proportionate client change is a soft warning above N days rather than a hard block (~30 min) — a hard cap would re-introduce exactly the complaint in the UAT note.

---

## Additional defects found while reviewing (cheap, same pass)

1. **Dead mount effect.** `stockMovementReports.jsx:37-48` re-sets state to the same constants the initialiser already used. It is pure noise once #1 lands — delete it rather than converting it to use the helper.
2. **"Reset" is the second half of the bug.** `handleReset` (`:258-274`) hard-codes the stale window too, so even after the initial default is fixed, a user who hits Reset is dropped back into Aug 2025. Fix both, or fix neither.
3. **`As On Date` also appears on the empty-report screen** (`ReportResults.jsx:535`). Fixing only the populated branch (`:743`) leaves the no-data view showing the field the client asked to remove.
4. **Same stale-date pattern in Stock Balance.** [`stockBalanceReports.jsx:29`](../src/pages/reports/stockBalanceReports.jsx) and `:241` default to `new Date().toISOString().split("T")[0]`, which is one day behind before 08:00 MYT. Out of scope for this ticket, but the same "reports default to a wrong/surprising date" class of defect — worth a follow-up.
5. **Excel export column count for Stock Movement** is hard-coded to 10 cells per row (`stockMovementReports.jsx:438-513`); if the Start/End Date labels are added to the export header block (`:405-417`), keep it in the header rows, not the table rows, so the widths stay aligned.

---

## Recommended sequencing

1. **#1 + #2 in one pass** — same file and same render region, both trivial, both immediately visible to the client. Remove the dead mount effect and fix Reset at the same time.
2. **Verify with one live API call** — sample `webBI_StockMovementDetail` for the screenshot's item to confirm the suffix shape, then land **#3** (helper extraction + four display sites) and re-test the Excel/PDF/Word exports.
3. **While testing #3**, test the `From Item` / `To Item` filter on that same item; if it returns nothing, that is the pre-existing suffix mismatch described in §3 and needs its own small fix.
4. **Only if the client wants an enforced history horizon**, raise the `Stktrns` retention / long-range performance question with the backend owner; otherwise close #4 as covered by #1.

## Open questions for the client

1. **"Last month" definition** — recommend the previous *calendar* month in local time (MYT): 01-08-2026 → 31-08-2026 when today is 07-09-2026. Confirm, or state the alternate rule (e.g. last 30 days).
2. **Empty first impression** — should the default stay "last month" even when that month has no movement for the user's sites, or fall back to a period that contains data? (Recommend: keep last month; the empty state is already explicit.)
3. **Exact labels** — the UAT note says *Start Date* / *End Date*; the Excel export currently says *From Date* / *To Date*. Confirm the wording to use on screen and in the export.
4. **Item code** — confirm the 8-digit base code is always the "real" item code for display (i.e. no legitimate code ends in `0000`) and that the `0000` suffix should never be shown on reports.
5. **History horizon** — is "more than one year" a complaint about the *default*, or a requirement to query/enforce a longer history? The former is already fixed by #1.
