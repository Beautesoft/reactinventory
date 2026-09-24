# GRN Save & Post Lifecycle — Single-Payload API Specification

**For:** the backend developer implementing the endpoint
**Goal:** replace the frontend's save and post logic with **one backend API, called with one payload**, so that the browser no longer writes to the database.
**Scope of this revision:** Goods Receive Note (GRN). The payload is designed so the other document types (GTO, GTI, RTN, ADJ, SUM, Stock Take) can be added as new `movCode` values later without changing the shape.
**Written against:** `src/pages/grn/addGrn.jsx` (save+post block `onSubmit`, L2506-2973), `src/pages/grn/goodsReceiveNote.jsx` (list), `src/utils/controlNo.js`

---



## 0. What is being asked, in one paragraph

Today the browser performs a save or a post by firing **8-12 separate REST calls** at LoopBack tables in sequence: claim a control number, insert the header, insert/patch/delete lines, read on-hand balances, insert stock movements, insert batch splits, adjust item batches, then flip the document status. There is no transaction, so a failure anywhere in the middle leaves partial data, and a retry can create a **second** document. The change: the browser sends **the whole document once** to a new endpoint, and that endpoint performs the entire operation inside **one database transaction**. The payload is the same for save and post — one field (`operation`) decides which.

---



## 1. The GRN lifecycle

```
                       ┌──────────────────────────────────────────────┐
   user opens form     │  NEW                                         │
   (mode=create)  ───► │  no docNo yet, no DB row                     │
                       └───────────────┬──────────────────────────────┘
                                       │
                        SAVE ──────────┤────────── POST
                        (draft)        │           (one shot)
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │  DRAFT  docStatus = 0        │
                       │  header + lines exist        │
                       │  NO stock movement           │
                       └───────────────┬──────────────┘
                                       │
                     re-open form      │  SAVE (update draft)
                     (mode=edit,       │  POST (post the draft)
                      status=0) ───────┤
                                       ▼
                       ┌──────────────────────────────┐
                       │  POSTED  docStatus = 7       │
                       │  header + lines + Stktrns +  │2
                       │  Stktrnbatches + ItemBatches │
                       │  + Itemonqties updated       │
                       └───────────────┬──────────────┘
                                       │
                       AMEND (privileged, price/remark only)
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │  VOID  docStatus = 4         │
                       │  negated ledger rows only    │
                       └──────────────────────────────┘
```



### 1.1 The four operations


| `operation` | From state   | To state     | Writes                                                       | Editable after?     |
| ----------- | ------------ | ------------ | ------------------------------------------------------------ | ------------------- |
| `SAVE`      | NEW or DRAFT | DRAFT (`0`)  | `StkMovdocHdrs`, `StkMovdocDtls` **only**                    | yes, freely         |
| `POST`      | NEW or DRAFT | POSTED (`7`) | all six tables, in one transaction                           | no (except `AMEND`) |
| `AMEND`     | POSTED       | POSTED (`7`) | price/remark deltas + recomputed balances                    | —                   |
| `VOID`      | POSTED       | VOID (`4`)   | negated `Stktrns` + negated batches + `ItemBatches` reversal | terminal            |


**Key rule:** `SAVE` **never touches stock**. `POST` is the only operation that moves inventory. Today this distinction accidentally holds, because all the stock code sits inside the `if (type === "post")` block — but it is not enforced anywhere, and a save over a posted document silently blanks `postDate`.

### 1.2 How the current UI drives these operations


| UI entry point                 | Route                                      | `onSubmit` call       | Today's result                                                                         |
| ------------------------------ | ------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------- |
| New document → **Save**        | `/goods-receive-note/add`                  | `onSubmit(e, "save")` | claim number, insert header (`docStatus` as-is), insert lines                          |
| New document → **Post**        | `/goods-receive-note/add`                  | `onSubmit(e, "post")` | claim number, insert header, insert lines, insert movements + batches, set status `7`  |
| Draft → **Save**               | `/goods-receive-note/add?docNo=X&status=0` | `onSubmit(e, "save")` | update header, patch/delete/insert lines                                               |
| Draft → **Post**               | `/goods-receive-note/add?docNo=X&status=0` | `onSubmit(e, "post")` | update header (`updateStatus`), sync lines, insert movements + batches, set status `7` |
| Posted → **Save** (privileged) | `...&status=7`                             | `onSubmit(e, "save")` | posted-edit path: 29-field header overwrite, line PATCH, `Stktrns` overwrite           |
| Posted → **Post** (privileged) | `...&status=7`                             | `onSubmit(e, "post")` | same posted-edit path                                                                  |


The `status` query parameter (`addGrn.jsx` L507) and `stockHdrs.docStatus` are both checked to decide which path runs (L2524-2527). **This branching is what moves to the backend** — the client sends `operation` and the current `docStatus`, and the server decides.

### 1.3 Validation is identical for save and post

Worth knowing, because it is not obvious in the UI: `validateForm(hdr, details, supplierInfo, type)` (L1479-1535) runs for **both** save and post, and `type` only affects the error text — the rule set is the same:


| Rule                                                                                                              | Source     |
| ----------------------------------------------------------------------------------------------------------------- | ---------- |
| `docNo` required                                                                                                  | L1488      |
| `docDate` required                                                                                                | L1489      |
| `supplyNo` required                                                                                               | L1490      |
| at least one line                                                                                                 | L1494      |
| when `BATCH_NO = Yes`: every line must have a batch number (`docBatchNo` **or** `batchDetails.individualBatches`) | L1497-1511 |
| when `EXPIRY_DATE = Yes`: every line must have an expiry date                                                     | L1514-1524 |


There is **no** check that quantities are positive, that price is non-negative, or that batch quantities sum to the line quantity. Those must be added server-side (§8).

---



## 2. The single payload

One request shape serves all four operations. `operation` selects the behaviour; everything else is the document as the user sees it.

### 2.1 Endpoint

```
POST /api/StockDocuments/Execute
```

A single route is deliberate: it keeps the client contract stable as GTO/GTI/RTN/ADJ/SUM/TKE are added, and it matches how the screens are already structured (same hook, same state, same payload). If the backend prefers four routes, the payload stays identical — only the URL changes.

### 2.2 Request

```jsonc
{
  // ── command ──────────────────────────────────────────────────────────
  "operation": "POST",            // required: "SAVE" | "POST" | "AMEND" | "VOID"
  "movCode": "GRN",               // required: enum, release 1 = ["GRN"]
  "userCode": "USER01",           // required: session identity, drives authorisation + audit
  "sessionSite": "MA02",          // required: server must verify this matches the token
  "expectedStatus": 0,            // optional: optimistic concurrency (see §9)

  // ── document identity ────────────────────────────────────────────────
  "docNo": null,                  // null/absent = allocate new; present = operate on existing
                                  // for AMEND/VOID this is required

  // ── header ───────────────────────────────────────────────────────────
  "header": {
    "storeNo": "MA02",            // required, must equal sessionSite for GRN
    "docDate": "2025-05-14",      // required, yyyy-MM-dd
    "recExpect": "2025-05-20",    // expected receipt date (UI field is named deliveryDate)
    "supplyNo": "SUP001",         // required for GRN
    "docTerm": "",
    "docRef1": "",
    "docRef2": "",
    "docRemk1": "",
    "docAttn": "",
    "staffNo": "USER01",
    "bname": "",                  // bill-to block
    "baddr1": "", "baddr2": "", "baddr3": "", "bpostcode": "",
    "daddr1": "", "daddr2": "", "daddr3": "", "dpostcode": ""
  },

  // ── lines ────────────────────────────────────────────────────────────
  "lines": [
    {
      "lineNo": 1,                // required, unique within the document
      "itemcode": "ITEM0001",     // required
      "itemdesc": "…",
      "docUom": "PCS",            // required
      "docQty": 10,               // required, must be > 0
      "docPrice": 12.50,          // required, must be >= 0
      "itemprice": 11.00,         // unit cost used for batch cost
      "itemRemark": null,
      "docExpdate": "2026-01-31", // required when EXPIRY_DATE = Yes
      "useExistingBatch": false,  // keep the stored batch cost (see §6.5)
      "batches": [                // required when BATCH_NO = Yes; omit otherwise
        { "batchNo": "B001",     "batchQty": 4, "expDate": "2026-01-31", "batchCost": 11.00 },
        { "batchNo": "No Batch", "batchQty": 6, "expDate": "2026-06-30", "batchCost": 11.00 }
      ]
    }
  ],

  // ── operation-specific (only where relevant) ─────────────────────────
  "amend": null,                  // AMEND only: { "reason": "…", "lines": [ { "lineNo": 1, "docPrice": 13.00, "itemRemark": "…" } ] }
  "void":  null                   // VOID only:  { "reason": "…" }
}
```

**Payload rules**

1. `operation` and `movCode` are mandatory; the server rejects any `movCode` it has no rules for.
2. `docNo = null` + `operation = "POST"` means *insert and post in one transaction* — this is the normal "new document, press Post" path and **must** be supported.
3. `Σ line.batches[].batchQty` must equal `line.docQty` when `BATCH_NO = Yes`.
4. Duplicate `itemcode + docUom` across lines is **allowed** — the server groups them (§6.1). The client stops doing this grouping.
5. The server ignores/rejects every column it owns. Removed from the payload versus today: `id`, `docId`, `docStatus`, `movType`, `docLines`, `docQty`, `docAmt`, `docTtlqty`, `docFocqty`, `postedQty`, `cancelQty`, `recQty1`, `ordMemo1..4`, `batchDetails`, `selectedBatches`, `createUser`, `createDate`, `recTtl`. See §5 for the full ownership table.
6. `lineNo` is the client's stable line identity within the request. The server returns its assigned `docId` per line so the client can map them back after a save (§10.3).



### 2.3 Response

```jsonc
{
  "success": true,
  "operation": "POST",
  "docNo": "GRNMA0200112",        // the definitive number (may differ from the requested one)
  "docStatus": 7,
  "alreadyProcessed": false,      // true on an idempotent replay (§7.1)
  "header": { "docQty": 10, "docAmt": 125.00, "docLines": 2, "postDate": "2025-05-14T09:12:03Z" },
  "lines": [
    { "lineNo": 1, "docId": 4471, "itemcode": "ITEM0001", "docQty": 10, "docAmt": 125.00,
      "onhandAfter": 42,
      "batches": [ { "batchNo": "B001", "batchQty": 4, "expDate": "2026-01-31" } ] }
  ],
  "warnings": []                  // non-fatal, e.g. "batch cost left unchanged (useExistingBatch)"
}
```

On any failure: `success: false`, a stable `code`, a human `message`, optional `details[]`, and **nothing committed** — in particular **no** `docNo` for a failed create.

---



## 3. Current save lifecycle, step by step

This is what the endpoint must reproduce. Captured from `addGrn.jsx`.

### 3.1 New document → Save (`urlDocNo` absent, `type = "save"`)


| #   | Call                                                                                           | Purpose                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `GET ControlNos?filter=…controlDescription="Goods Receive Note", siteCode=<site>`              | read the counter to display the next number                                                                     |
| 2   | `POST ControlNos/update?[where][controlId]=…&[where][controlNo]=…` body `{controlNo:"<next>"}` | **claim** the number (compare-and-swap; expects `{count:1}`); fallback `POST ControlNos/updatecontrol` + verify |
| 3   | `POST StkMovdocHdrs` body = `data` (header)                                                    | insert header, `docStatus` = `0`                                                                                |
| 4   | `POST StkMovdocDtls` (one per line, in parallel)                                               | insert lines                                                                                                    |


Nothing else. No `Stktrns`, no batches, no `Itemonqties`, no status change.

**Send-only-once problem:** the claim (step 2) happens *before* the header insert (step 3). If step 3 or 4 fails, the number is burned and the user sees "Failed to create" while the counter has already advanced. There is no rollback and no release.

### 3.2 Draft → Save (existing `docNo`, `status ≠ 7`)


| #   | Call                                                                         | Purpose                                 |
| --- | ---------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `POST StkMovdocHdrs/update?[where][docNo]=<docNo>` body = full header `data` | overwrite the header (no counter claim) |
| 2   | `DELETE StkMovdocDtls/{docId}` — lines removed from the cart                 | delete removed lines                    |
| 3   | `PATCH StkMovdocDtls/{docId}` — lines the user edited                        | update lines                            |
| 4   | `POST StkMovdocDtls` — new lines (no `docId`)                                | insert lines                            |


Order is delete → patch → insert, and the three groups are **not** atomic: the deletes run first, so a failure in the patch or insert phase leaves the document with lines missing. Also note the whole loaded row is PATCHed back, including client-only properties (`batchDetails`, `selectedBatches`) and, on newly inserted lines, a client-supplied `id: index + 1`.

### 3.3 Posted document → Save (privileged)

Runs a completely different code path (`isPostedDocument && userDetails.isSettingPostedChangePrice === "True"`, L2529-2634): 29-field header overwrite with `docStatus:"7"` hard-coded, then per line `POST StkMovdocDtls/update?[where][docId]=…` with only `{docPrice, docAmt, itemRemark}`, then a `Stktrns` overwrite that writes **its own** `trnBalqty`**/**`trnBalcst`, then an `ItemBatches` PATCH that re-writes the values it just read. This becomes `operation = "AMEND"`.

### 3.4 What Save must do server-side

1. Authenticate, resolve `userCode`, verify `sessionSite` matches the token.
2. Validate the payload (§1.3 rules, plus the new stock rules in §8).
3. Group duplicate `itemcode + docUom` lines and recompute `docLines`, `docQty`, `docAmt`.
4. If `docNo` is null: **allocate the number inside the transaction** (§8.1), then insert the header with `docStatus = 0`.
5. If `docNo` is present: lock the header row, reject if `docStatus = 7` or `4` (unless `AMEND`), update the header **without** touching `postDate`, `createUser`, `createDate`, `docStatus`.
6. Reconcile lines to match the request exactly: delete the lines no longer present, update the rest, insert the new ones — all inside the transaction.
7. **Touch nothing in** `Stktrns`**,** `Stktrnbatches`**,** `ItemBatches`**,** `Itemonqties`**.**
8. Commit; return `docNo`, `docStatus`, per-line `docId`.

---



## 4. Current post lifecycle, step by step



### 4.1 Post a NEW GRN (`type = "post"`, no `docNo`)


| #   | Call                                                                      | Purpose                                        |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| 1-3 | counter read + claim                                                      | as §3.1                                        |
| 4   | `POST StkMovdocHdrs`                                                      | insert header (`docStatus` = `0`, **not** `7`) |
| 5   | `POST StkMovdocDtls`                                                      | insert lines                                   |
| 6   | `GET Itemonqties?filter={itemcode, uom, sitecode}` — one per item         | read the pre-transaction balance               |
| 7   | `GET Stktrns?filter={trnDocno, storeNo}`                                  | duplicate guard                                |
| 8   | `POST Stktrns` (array)                                                    | insert movements                               |
| 9   | `POST Stktrnbatches` (one per batch)                                      | insert batch split                             |
| 10  | `POST ItemBatches/updateqty` or `POST ItemBatches`                        | apply batch quantities                         |
| 11  | `POST StkMovdocHdrs/update?[where][docNo]=<docNo>` body `{docStatus:"7"}` | mark posted                                    |




### 4.2 Post an existing draft

Identical, except steps 1-3 are skipped and step 4 becomes `POST StkMovdocHdrs/update?[where][docNo]=…` with the full header (the value of `docStatus` in that body is the one loaded from the DB, so the status is **not** advanced by this call).

### 4.3 Why this must become one transaction


| Defect                                                                                | Consequence                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header is written at step 4; anything failing at steps 5-10 throws to the outer catch | document exists with lines but **no stock movement**, `docStatus` stays `0`; the UI just says "Failed to post"                                              |
| The retry has no `docNo` (the form never kept one)                                    | a **second** document is created — the half-written first one remains                                                                                       |
| Step 7's guard is per `docNo + storeNo`, not per line                                 | if **any** `Stktrns` row exists, steps 8-10 are all skipped — yet step 11 still runs, so the document reports Posted while `ItemBatches` was never adjusted |
| `ItemBatches` errors are caught and only `console.error`-ed                           | batch quantities silently wrong; the user sees "Posted successfully"                                                                                        |
| `GET Itemonqties` failure falls back to balance `0`                                   | `trnBalqty` written as if opening stock were zero                                                                                                           |
| The final status call is unconditional and outside the guard                          | a partially-written document is marked Posted                                                                                                               |




### 4.4 What Post must do server-side

Everything in §3.4, then continue **in the same transaction**:


| #   | Action                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 9   | For each grouped item, in deterministic order (`itemcode`, `docUom`): `SELECT … FOR UPDATE` the `Itemonqties` row (create if absent) |
| 10  | Compute `trnBalqty = onhand.trnBalqty + trnQty`, `trnBalcst = onhand.trnBalcst + trnAmt`, resolve `itemBatchCost`, `INSERT Stktrns`  |
| 11  | `INSERT Stktrnbatches` per batch of each movement (sum must equal the parent `trnQty`)                                               |
| 12  | Upsert `ItemBatches` per batch — quantity changes, cost per §6.5                                                                     |
| 13  | `UPDATE Itemonqties` (or recompute the projection from `Stktrns`)                                                                    |
| 14  | `UPDATE StkMovdocHdrs SET docStatus = 7, postDate = <now>` — **last write**                                                          |
| 15  | `COMMIT`                                                                                                                             |


**The rule that matters most:** `docStatus = 7` is set **inside** the transaction as the final step. Never write the document first and patch the status afterwards.

---



## 5. Field ownership

**C** = client-provided (keep sending) · **S** = server-computed (client stops sending) · **R** = server overwrites/ignores whatever the client sends · **?** = decision needed (§13)

### 5.1 `StkMovdocHdrs`


| Field                                                             | Src | Note                                                                |
| ----------------------------------------------------------------- | --- | ------------------------------------------------------------------- |
| `docNo`                                                           | S   | allocated in-transaction from `ControlNos`; must be `UNIQUE`        |
| `movCode`                                                         | C   | validated against the allowed enum                                  |
| `movType`                                                         | S   | currently a duplicate of `movCode` (?)                              |
| `storeNo`                                                         | C   | must equal `sessionSite`                                            |
| `supplyNo`                                                        | C   | required for GRN                                                    |
| `docRef1`, `docRef2`, `docRemk1`, `docTerm`, `docAttn`, `staffNo` | C   |                                                                     |
| `docDate`                                                         | C   |                                                                     |
| `recExpect`                                                       | C   | UI calls it `deliveryDate`                                          |
| `bname`, `baddr1..3`, `bpostcode`, `daddr1..3`, `dpostcode`       | C   | address blocks                                                      |
| `docLines`                                                        | S   | count of lines **after grouping**                                   |
| `docQty`                                                          | S   | `Σ line.docQty`                                                     |
| `docAmt`                                                          | S   | `Σ round2(line.docQty × line.docPrice)` — round per line, then sum  |
| `docStatus`                                                       | S   | `0` on save, `7` on post; **never accepted from the body**          |
| `postDate`                                                        | S   | server clock, set only by `POST`; never blanked by `SAVE`           |
| `createUser`, `createDate`                                        | S   | from session + server clock; immutable after insert                 |
| `postedBy`                                                        | S   | if the column is to be used — currently only Stock Take sets it (?) |




### 5.2 `StkMovdocDtls`


| Field                                                                                         | Src | Note                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` / `docId`                                                                                | R   | **rejected** if sent. Today the client injects `id: index + 1` on insert — a primary-key collision risk                                                                                                                         |
| `docNo`, `movCode`, `movType`, `docDate`, `createUser`, `createDate`                          | S   | copied from the header                                                                                                                                                                                                          |
| `docLineno`                                                                                   | S   | server-assigned after grouping (?)                                                                                                                                                                                              |
| `itemcode`                                                                                    | C   | see the `"0000"` suffix question (§13 Q1)                                                                                                                                                                                       |
| `itemdesc`                                                                                    | C   | denormalised; decide whether to re-read from `Invitems` (?)                                                                                                                                                                     |
| `docQty`                                                                                      | C   | must be > 0                                                                                                                                                                                                                     |
| `docPrice`                                                                                    | C   | must be >= 0                                                                                                                                                                                                                    |
| `itemprice`                                                                                   | C   | unit cost, used for new-batch cost                                                                                                                                                                                              |
| `docUom`                                                                                      | C   |                                                                                                                                                                                                                                 |
| `docExpdate`                                                                                  | C   | required when `EXPIRY_DATE = Yes`                                                                                                                                                                                               |
| `docBatchNo`                                                                                  | C   | only meaningful for the "use existing batch" path; the split lives in `lines[].batches`                                                                                                                                         |
| `useExistingBatch`                                                                            | C   | drives the batch-cost branch (§6.5)                                                                                                                                                                                             |
| `itemRemark`                                                                                  | C   |                                                                                                                                                                                                                                 |
| `docAmt`                                                                                      | S   | `round2(docQty × docPrice)`                                                                                                                                                                                                     |
| `docTtlqty`                                                                                   | S   | `docQty + docFocqty` today; confirm                                                                                                                                                                                             |
| `docFocqty`, `docPdisc`, `docMdisc`, `docDisc`, `recQty1`, `recTtl`, `postedQty`, `cancelQty` | S   | the UI collects none of these and writes `0` — confirm which belong to the PR/PO receipt flow (?)                                                                                                                               |
| `itmBrand`, `itmRange`, `itmBrandDesc`, `itmRangeDesc`, `DOCUOMDesc`, `allowDecimalQty`       | ?   | display/rounding metadata denormalised onto every line today; **recommended to drop from the write** and read at display time                                                                                                   |
| `ordMemo1..4`                                                                                 | S   | batch breakdown stored as text (`ordMemo1="specific"`, `ordMemo2="B001:4,NB:6"`, `ordMemo4="2026-01-31:4"`). Can be dropped if `Stktrnbatches` is authoritative; must be built by the server if legacy reports read it (§13 Q3) |




### 5.3 `Stktrns` — one row per **grouped** `itemcode + docUom` (not per batch)


| Field                                                                       | Src | Note                                                                             |
| --------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------- |
| `id`                                                                        | S   | client currently backfills it from the array response — that coupling disappears |
| `trnDocno`, `trnType`, `movType`, `trnDate`, `storeNo`, `itemUom`, `lineNo` | S   | from the header/line                                                             |
| `trnPost`, `postTime`                                                       | S   | server clock (`postTime` is redundant next to `postDate`) (?)                    |
| `aperiod`                                                                   | S   | always `null` today — must it be derived? (?)                                    |
| `itemcode`                                                                  | ?   | client appends a literal `"0000"` (§13 Q1)                                       |
| `fstoreNo`, `tstoreNo`                                                      | S   | `null` for GRN                                                                   |
| `trnQty`                                                                    | S   | **signed**; GRN is always positive                                               |
| `trnDbQty`, `trnCrQty`                                                      | ?   | always `null` for GRN; only ADJ populates them                                   |
| `trnBalqty`                                                                 | S   | `onhand.trnBalqty + trnQty` — **computed under row lock, server-side**           |
| `trnBalcst`                                                                 | S   | `onhand.trnBalcst + trnAmt`                                                      |
| `trnAmt`, `trnCost`                                                         | S   | currently identical for GRN                                                      |
| `itemBatchCost`                                                             | S   | §6.5                                                                             |
| `itemBatch`                                                                 | S   | comma-joined batch numbers                                                       |
| `trnRef`                                                                    | S   | `null`; `"VOID"` on reversal rows                                                |
| `hqUpdate`, `stockIn`, `transPackageLineNo`                                 | ?   | always `false` / `null` today                                                    |
| `docExpdate`                                                                | S   | only when `EXPIRY_DATE = Yes`                                                    |
| `useExistingBatch`                                                          | C/? | carried onto the ledger row today                                                |




### 5.4 `Stktrnbatches`


| Field      | Src | Note                                                                                                                                                   |
| ---------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stkTrnId` | S   | FK to `Stktrns.id`; the client currently loses this whenever the `Stktrns` response is not an index-aligned array, and then silently skips every batch |
| `batchNo`  | C   | `"No Batch"` for non-batch items                                                                                                                       |
| `batchQty` | C   | positive for GRN; **Σ must equal the parent** `Stktrns.trnQty`                                                                                         |




### 5.5 `ItemBatches` / `Itemonqties`

Two different write shapes exist today — the backend must standardise:

```
Existing batch, quantity only, cost frozen:      POST ItemBatches/updateqty
{ "itemcode":"ITEM0001", "sitecode":"MA02", "uom":"PCS",
  "qty":4, "batchcost":0, "batchno":"B001", "expDate":"2026-01-31" }
                          ↑ lowercase keys, and a literal batchcost of 0

New batch:                                       POST ItemBatches
{ "itemCode":"ITEM0001", "siteCode":"MA02", "uom":"PCS",
  "qty":4, "batchCost":11.00, "batchNo":"B001", "expDate":"2026-01-31" }
                          ↑ camelCase keys
```

`Itemonqties` is the per `itemcode + sitecode + uom` projection the client reads for balances. **No client flow ever writes it** — every screen reads it and assumes the backend maintains it. Decide whether it is a maintained table or a view over `Stktrns` (§13 Q9).

---



## 6. Transaction internals



### 6.1 Grouping

Group `lines` by `itemcode + docUom`. `docQty` and `docAmt` are summed per group; batches with the same `batchNo` are consolidated (quantities added, first non-empty `expDate` kept). One `Stktrns` row per group. This currently happens in the browser (`groupCartItemsByItem`, L1811-1870) and must move to the server.

### 6.2 Stock movement

`trnQty = Σ grouped docQty` (signed positive for GRN). `trnAmt = trnCost = Σ grouped docAmt`.

### 6.3 Running balance — the core fix

```
SELECT … FOR UPDATE on Itemonqties(itemcode, sitecode, uom)   -- create the row if absent
trnBalqty   = onhand.trnBalqty + trnQty
trnBalcst   = onhand.trnBalcst + trnAmt
itemBatchCost = line.itemprice (new batch) | stored batchCost (existing batch)
INSERT Stktrns …
UPDATE Itemonqties …
```

Process items in a deterministic order (sort by `itemcode`, `docUom`) to avoid deadlocks between concurrent posts.

Today this is `d.trnBalqty = (Number(d.trnQty) + Number(balance.qty)).toString()` (L2876) where `balance.qty` came from a **stale** read taken before the insert, and a read failure is silently treated as balance `0`.

### 6.4 Row locking and deadlocks

Lock in this order, consistently: `StkMovdocHdrs` (by `docNo`) → `Itemonqties` (by `itemcode, sitecode, uom`, sorted ascending). Never lock `Itemonqties` before the header.

### 6.5 Batch cost rule — deliberate, must be preserved

If the batch **already exists**: change the quantity only; **keep** the stored `batchCost` and `expDate`. The client enforces this by sending `batchcost: 0`. If the batch is **new**: insert with `batchCost = line.itemprice` and the line's `expDate`.

Express this as an explicit rule, not as a side effect of which endpoint is called:

```
if useExistingBatch == true or batch exists:
    ItemBatches.qty += batchQty        # cost and expiry untouched
else:
    INSERT ItemBatches(batchCost = line.itemprice, expDate = line.docExpdate, qty = batchQty)
```

---



## 7. Idempotency and repeat submissions



### 7.1 Post

- `UNIQUE (docNo)` on `StkMovdocHdrs`; `UNIQUE (trnDocno, storeNo, itemcode, itemUom, trnType)` on `Stktrns`.
- Already `docStatus = 7` → return **200** with the stored result and `alreadyProcessed: true`. Do **not** re-write, do **not** 500.
- `docStatus = 4` → reject `DOC_VOID`.
- A `docNo` already owned by a **different** document → `409 DOCNO_TAKEN` plus a fresh number in the body.
- Net effect: a retry after a network timeout is safe and produces exactly one document.



### 7.2 Save

- `SAVE` on a `docNo` that is already Posted → `409 ALREADY_POSTED` (today the client silently proceeds and can blank `postDate`).
- `SAVE` is naturally idempotent because it replaces the line set rather than appending.



### 7.3 The guard that must **not** be reproduced

The current check is `GET Stktrns?filter={trnDocno, storeNo}` — "if any row exists, skip every write". It is document-scoped, so a single pre-existing row suppresses the batch and `ItemBatches` work for **all** lines, and the status is still set to `7`. Replace it with the `docStatus`-based idempotency above.

---



## 8. Validation to implement server-side

Existing UI rules (§1.3) **plus** these, none of which exist today:

### 8.1 Document number

- Source: `ControlNos` where `controlDescription = 'Goods Receive Note'` and `siteCode = <storeNo>`.
- `docNo = controlPrefix + siteCode + controlNo`, counter width preserved (`"0012" → "0013"`).
- **Known data issue:** some sites carry **duplicate** `ControlNos` **rows per document type** (Mirage MA02 has two). The client works around this by always claiming the lowest `controlId` (`controlNo.js` L148-162). Clean the duplicates and add `UNIQUE (controlDescription, siteCode)`.
- Add `UNIQUE` on the document-number column — the existing client comment explicitly asks for it as the final backstop.



### 8.2 Store / site

- `storeNo` must equal `sessionSite`. `fstoreNo` / `tstoreNo` must be `null` for GRN.



### 8.3 Lines

- `docQty > 0` — reject `0` and negative. (Not checked today.)
- `docPrice >= 0`. (Not checked today.)
- `docAmt = round2(docQty × docPrice)`; header `docAmt = Σ` of the rounded line amounts.
- Decimal quantities only when the item's `allowDecimalQty` is set; otherwise reject non-integers.
- Duplicate `itemcode + docUom` lines are valid and must be grouped.



### 8.4 Batches and expiry

- `BATCH_NO = Yes`: every line needs ≥1 batch and `Σ batchQty = docQty` (tolerance 0.0001). (The sum check does **not** exist today.)
- `EXPIRY_DATE = Yes`: `expDate` required; if absent, default to `docDate + DEFAULT_EXPIRY_DAYS` (client default 365).
- `batchQty > 0`. Empty `batchNo` → store as `"No Batch"`.



### 8.5 Status machine (per `movCode`, not global)

```
NEW      --SAVE--> DRAFT(0)
NEW      --POST--> POSTED(7)
DRAFT(0) --SAVE--> DRAFT(0)
DRAFT(0) --POST--> POSTED(7)
POSTED(7)--AMEND-> POSTED(7)      (privileged; price/remark only)
POSTED(7)--VOID--> VOID(4)
VOID(4)  --*-----> rejected (terminal; create a new document)
```

GRN/GTO/GTI/RTN/ADJ/SUM use `7` for posted. **Stock Take uses** `1` (plus `2`/`3` for approved/rejected) — `isPostedDocStatus` and `docStatusLabel` in `src/utils/utils.js` L509-529.

---



## 9. Concurrency


| Race                              | Today                                                                                            | Required                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Two users post from the same site | client-side compare-and-swap on `ControlNos` only; the loser silently changes `docNo` mid-flight | server allocates under row lock; `UNIQUE(docNo)` as backstop           |
| Two documents move the same item  | both read `Itemonqties` before either inserts → last write wins, `trnBalqty` is wrong            | `SELECT … FOR UPDATE` on the `Itemonqties` key; deterministic ordering |
| Double-click / retry              | React `postLoading` state only                                                                   | idempotency by `docNo` (§7.1)                                          |
| Two users edit the same draft     | none                                                                                             | `expectedStatus` in the payload → `409 CONCURRENT_UPDATE` on mismatch  |


---



## 10. Client-side changes required



### 10.1 What the client does today vs after


|                            | Today                                   | After                  |
| -------------------------- | --------------------------------------- | ---------------------- |
| Save (new)                 | 4 calls                                 | 1 call                 |
| Save (draft)               | 1 + 3 line calls (delete/patch/insert)  | 1 call                 |
| Post (new)                 | up to 12 calls across 5 tables          | 1 call                 |
| Post (draft)               | 11 calls                                | 1 call                 |
| Totals, grouping, balances | computed in the browser                 | server                 |
| Control number             | claimed by the browser                  | server                 |
| Batch cost rule            | inferred from which endpoint was called | server rule            |
| Error handling             | per-call, inconsistent                  | one `code` per failure |




### 10.2 Code to delete, not port

`addGrn.jsx` — the grouping helper `groupCartItemsByItem` (L1811), the balance loop (L2871-2881), the duplicate guard (L2883-2943), `createStktrnbatchesRecords`, `updateItemBatchesForMultipleBatches`, and `addNewControlNumber` (L1215). `src/utils/controlNo.js` stays until the **last** `movCode` is migrated, because the other six documents still use it.

### 10.3 What the client must keep doing

- Own the form state and the cart.
- Map the response `lines[].docId` back onto its own rows after a save (so a subsequent save can report which lines are new — or the server can key on `lineNo` instead; §13 Q13).
- Keep `docNo` from the response so a retry resends the **same** `docNo` — this is what makes retries safe.



### 10.4 Rollout

Build the endpoint behind a feature flag (e.g. `SAVE_POST_VIA_API = Yes|No`) so a site can revert to the browser flow without a rebuild. Preserve the UI contract: `docNo`, `docStatus` and the list refresh must not change for the user.

---



## 11. Error contract


| HTTP | `code`               | When                                                     | UI behaviour                                            |
| ---- | -------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 400  | `VALIDATION_FAILED`  | bad shape, missing required, qty ≤ 0, batch sum mismatch | show `message` against `details[].lineNo`               |
| 401  | `UNAUTHENTICATED`    | no/invalid token                                         | redirect to login                                       |
| 403  | `NOT_AUTHORISED`     | lacks the GRN right, or wrong site                       | toast                                                   |
| 404  | `DOC_NOT_FOUND`      | `docNo` supplied but absent                              | toast + reload list                                     |
| 409  | `ALREADY_POSTED`     | post/save replay of a posted document                    | treat as success, refresh                               |
| 409  | `DOC_VOID`           | operating on a voided document                           | toast                                                   |
| 409  | `DOCNO_TAKEN`        | requested number belongs to another document             | offer retry with the returned number                    |
| 409  | `CONCURRENT_UPDATE`  | `expectedStatus` mismatch or lock conflict               | offer retry                                             |
| 422  | `INSUFFICIENT_STOCK` | outbound `movCode`s only — listed for completeness       | —                                                       |
| 500  | `INTERNAL`           | unexpected                                               | toast "Failed to post"; **the document must not exist** |


Shape: `{ success: false, code, message, details?: [{ lineNo, field, reason }] }`. The client needs a stable `code` — it currently inspects almost nothing structured.

---



## 12. Acceptance tests


| #   | Scenario                                           | Expected                                                                                                    |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | New GRN → **Save**                                 | header `docStatus=0`, lines written; **zero** rows in `Stktrns`/`Stktrnbatches`; `Itemonqties` unchanged    |
| 2   | Draft → **Save** after editing                     | line set matches the request exactly; removed lines deleted; `postDate`/`createUser`/`createDate` unchanged |
| 3   | Save, then save again with no changes              | no duplicates; same `docNo`                                                                                 |
| 4   | Draft → **Post**                                   | movements written, `docStatus=7`, balances correct                                                          |
| 5   | New → **Post** in one call                         | one document; insert-and-post in a single transaction                                                       |
| 6   | 2 lines, same `itemcode + docUom`                  | **one** `Stktrns` with summed qty, `itemBatch` = joined batch numbers                                       |
| 7   | `BATCH_NO=Yes`, 3 batches on one line              | 1 `Stktrns`, 3 `Stktrnbatches` summing to the line qty, `ItemBatches` per batch                             |
| 8   | Existing batch, `useExistingBatch=true`            | quantity moves; stored `batchCost` and `expDate` **unchanged**                                              |
| 9   | Post the same `docNo` twice                        | second call → 200 `alreadyProcessed`, zero new rows, balances unchanged                                     |
| 10  | Fail at `ItemBatches` (step 12)                    | **no** header, no lines, no movements — full rollback                                                       |
| 11  | Fail at status update (step 14)                    | full rollback; retry yields exactly one document                                                            |
| 12  | `Itemonqties` read fails mid-post                  | post fails loudly; must **not** write a zero-based balance                                                  |
| 13  | Two concurrent posts, same item                    | `trnBalqty` sequential and correct; no lost update                                                          |
| 14  | Two concurrent posts, same site                    | distinct `docNo`s; `UNIQUE` never violated                                                                  |
| 15  | `docQty = 0` / negative / price negative           | 400 `VALIDATION_FAILED`                                                                                     |
| 16  | Σ batch qty ≠ line qty                             | 400 `VALIDATION_FAILED` with `lineNo`                                                                       |
| 17  | `storeNo` ≠ session site                           | 403                                                                                                         |
| 18  | Client sends `id` / `docId` / `docStatus`          | 400 (rejected, not silently ignored)                                                                        |
| 19  | Save a **posted** document                         | 409 `ALREADY_POSTED`                                                                                        |
| 20  | `expectedStatus=0` but the document is already `7` | 409 `CONCURRENT_UPDATE`                                                                                     |


---



## 13. Open questions for the backend team


| #   | Question                                                                                      | Why it matters                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Is the `"0000"` suffix on `itemcode` real (`ITEM0001` stored vs `ITEM00010000` in `Stktrns`)? | The client appends it on write and strips it on read. Centralise server-side, or fix before migration.                                                                                           |
| Q2  | Are `movType` (header), `trnType` and `movType` (ledger) all needed?                          | Three copies of `"GRN"` are written.                                                                                                                                                             |
| Q3  | Can `ordMemo1..4` be dropped now that `Stktrnbatches` exists?                                 | If legacy reports read `ordMemo2`, the server must build that string.                                                                                                                            |
| Q4  | Which `ItemBatches` write shape is canonical — lowercase `updateqty` or camelCase insert?     | The client uses both, with different key casing.                                                                                                                                                 |
| Q5  | Are `trnDbQty`/`trnCrQty` required for GRN?                                                   | Always `null` today; only ADJ populates them.                                                                                                                                                    |
| Q6  | What is `aperiod`, and must it be derived?                                                    | Always `null`.                                                                                                                                                                                   |
| Q7  | What does `hqUpdate` mean for a GRN?                                                          | Always `false`.                                                                                                                                                                                  |
| Q8  | Do `recQty1`, `recTtl`, `postedQty`, `cancelQty` belong to the PR/PO receipt flow?            | Written as `0` today.                                                                                                                                                                            |
| Q9  | Is `Itemonqties` a maintained table or a view over `Stktrns`?                                 | Decides whether §4.4 step 13 is an upsert or disappears.                                                                                                                                         |
| Q10 | Is `postTime` still needed alongside `postDate`?                                              | Redundant today.                                                                                                                                                                                 |
| Q11 | Serialise posts per site — advisory locks or optimistic versioning?                           | Affects §9.                                                                                                                                                                                      |
| Q12 | Does this payload shape work for the other six `movCode`s?                                    | GTO/GTI need `fstoreNo`/`tstoreNo` **pairs** (two movements per line); ADJ/SUM need negative quantities and a stock check; Stock Take needs counted-vs-onhand variance. Confirm before freezing. |
| Q13 | Should saved lines be identified by `lineNo` or by a server-issued `docId`?                   | Decides whether the client must round-trip `docId` after a save.                                                                                                                                 |
| Q14 | Should `SAVE` support deleting lines, or is the line set always a full replacement?           | Today the client does delete→patch→insert; a full replace is simpler and safer.                                                                                                                  |


---



## 14. Glossary


| Term                              | Meaning                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GRN                               | Goods Receive Note — stock-receiving document (`movCode = "GRN"`)                                                                                                                                                              |
| Draft / Open                      | `docStatus = 0` — header and lines exist, no stock movement                                                                                                                                                                    |
| Posted                            | `docStatus = 7` — movements written and balances updated                                                                                                                                                                       |
| Void                              | `docStatus = 4` — reversed; terminal                                                                                                                                                                                           |
| `StkMovdocHdrs` / `StkMovdocDtls` | document header / document lines                                                                                                                                                                                               |
| `Stktrns`                         | the stock movement ledger (signed quantities + running balance)                                                                                                                                                                |
| `Stktrnbatches`                   | per-batch split of a movement                                                                                                                                                                                                  |
| `ItemBatches`                     | current quantity and cost per item + site + uom + batch                                                                                                                                                                        |
| `Itemonqties`                     | current quantity and cost per item + site + uom (batch-agnostic)                                                                                                                                                               |
| `ControlNos`                      | the document-number counters, per description + site                                                                                                                                                                           |
| Grouping                          | collapsing several lines with the same `itemcode + docUom` into one movement                                                                                                                                                   |
| GTO / GTI                         | Goods Transfer Out (`TFRT`) / Goods Transfer In (`TFRF`) — later revisions                                                                                                                                                     |
| RTN / ADJ / SUM / TKE             | Goods Return (`VGRN`) / Stock Adjustment (`ADJ`) / Stock Usage Memo (`SUM`) / Stock Take (`TKE`)                                                                                                                               |
| IWT / IR                          | **not used anywhere in this application or its documentation** — they appear in neither the code, the user manual, nor the schema the client touches. If they are legacy-backend concepts, they are out of scope for this API. |


---



## Appendix A — How the other six postings differ (context only, not yet specified)

Audited at the same time as this document, so the backend can size the generic design. **Nothing here is part of the GRN release.**


| Doc        | `movCode` / `trnType` | header `movType` | Posted status      | `trnQty` sign                                        | `trnDbQty`/`trnCrQty`                                 | Line batching                                                       | Balance seed                |
| ---------- | --------------------- | ---------------- | ------------------ | ---------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- | --------------------------- |
| GRN        | `GRN`                 | `GRN`            | `7`                | `+`                                                  | always `null`                                         | `Stktrnbatches` + `ItemBatches` (grouped)                           | `onhand.trnBalqty + trnQty` |
| RTN        | `VGRN`                | `VGRN`           | `7`                | **always** `-`                                       | always `null`                                         | `Stktrnbatches` only; `ItemBatches/updateqty` inline, **no create** | `onhand + (−docQty)`        |
| ADJ        | `ADJ`                 | `ADJ`            | `7`                | `+` increase / `−` decrease                          | **the only flow that uses them** (`Math.abs(docQty)`) | `Stktrnbatches` + `ItemBatches` (create + updateqty)                | `onhand.trnBalqty + trnQty` |
| SUM        | `SUM`                 | `SUM`            | `7`                | **always** `-`                                       | always `null`                                         | `Stktrnbatches` + `ItemBatches/updateqty`, **no create**            | `onhand.trnBalqty + trnQty` |
| GTO        | `TFRT`                | `TFR`            | `7`                | per source/destination leg                           | `null`                                                | gated on `AUTO_POST`                                                | `onhand + trnQty`           |
| GTI        | `TFRF`                | `TFR`            | `7`                | per source/destination leg                           | `null`                                                | gated on `AUTO_POST`                                                | `onhand + trnQty`           |
| Stock Take | `TKE`                 | `TKE`            | `1` (also `2`/`3`) | signed **variance** (`counted − system`), may be `0` | `null`                                                | `Stktrnbatches` + `ItemBatches` (create + updateqty)                | `systemQty + variance`      |


Points that affect the generic design:

1. **The same defects exist in every flow** — client-computed balances, header-before-movement ordering, `console.error`-only batch failures, and a document-scoped duplicate guard that suppresses the writes yet still marks the document posted. This is a shared fix, not a GRN-specific one.
2. **Status is not uniform.** GRN/GTO/GTI/RTN/ADJ/SUM use `7`; Stock Take uses `1`. The state machine must be per-`movCode`.
3. `movCode` **is not always the screen name.** RTN writes `VGRN` — and its posted-edit path inconsistently writes `RTN` for a replacement `Stktrns` row.
4. **Zero-variance rows exist.** Stock Take writes a `Stktrns` row (and a `Stktrnbatches` row) for items with no variance, so a row-existence-based guard mis-classifies those documents permanently.
5. **Two flows call external services.** RTN and GTO/GTI call a separate system (`apiService1`, `postItemBatchSno` / `SaveOutItemBatchSno`) when `BATCH_SNO = Yes`. Decide whether that belongs inside the transaction, after commit, or in an outbox — it must not fail silently.
6. `Itemonqties` **is never written by any client flow.** Every screen reads it and assumes the backend maintains it.
7. **GTO and GTI are asymmetric.** GTO always decrements the source and only touches the destination when `AUTO_POST = Yes`; GTI gates **both** sides on `AUTO_POST`, so with it off, stock never moves at all — yet both still set `docStatus = 7`.



### Appendix A.1 — API contract facts the backend must respect

1. **Batch-insert response shape.** `POST Stktrns` is sent as an **array** and the client backfills `Stktrnbatches.stkTrnId` from the response **by array index**. If the response is not an index-aligned array, every `Stktrnbatches` insert is skipped silently in all six flows. The new endpoint removes this coupling — it must generate ids server-side.
2. `batchno` **must be omitted, not** `null`**, for "No Batch" rows.** `ItemBatches/updateqty` answers `400 Value is not a string` when `batchno` is present but not a string (the GTI code comments this explicitly).
3. **Two casing conventions for one table.** `ItemBatches` insert uses `itemCode`/`siteCode`/`batchNo`/`batchCost`; `updateqty` uses `itemcode`/`sitecode`/`batchno`/`batchcost` with a literal `batchcost: 0`. Standardise internally.
4. `updateqty` **is an additive delta, not an absolute value** — it is **not idempotent**, and re-running it double-applies stock. This alone justifies moving batch writes inside the transaction.
5. **Debit/credit columns are effectively unused.** Sign lives in `trnQty`/`trnAmt`/`trnCost`/`trnBalqty`/`trnBalcst`.



### Appendix A.2 — Defects that must not be reproduced server-side


| Where                                | Defect                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GTO `addGto.jsx` L3022, L4002, L4177 | `...(cond ? [{ expdate }] : [])` spread into an **object** literal yields a key `"0"` and **no** `expdate` — the expiry is silently dropped from those batch payloads |
| GTI `addGti.jsx` L2090               | the runtime-only `fefoBatches` array is serialised **inside** the `POST Stktrns` payload                                                                              |
| GTO / GTI                            | with `AUTO_POST ≠ Yes`, GTI writes **no stock movement at all** — yet still sets `docStatus = 7`                                                                      |
| GTI                                  | destination is posted **before** source; a destination failure means the source is never decremented                                                                  |
| TKE `addTake.jsx` L2980              | `expiryMap` referenced outside its scope — a `ReferenceError` on that path                                                                                            |
| TKE                                  | `ItemBatches` **read** failures are swallowed as `[]`, read as "system qty = 0" → the whole counted quantity is booked as a variance                                  |
| All flows                            | `data.postDate = ""` on save paths, so saving over a posted document blanks `postDate`                                                                                |
| GRN                                  | client injects `id: index + 1` into `StkMovdocDtls` inserts, and PATCHes client-only properties (`batchDetails`, `selectedBatches`) back onto loaded rows             |


---

*Revision 2 — restructured around the save/post lifecycle and the single-payload contract, at the client's request. Revision 1 specified the post transaction only. Header/rollback/validation details from revision 1 are preserved in §4-§9.*