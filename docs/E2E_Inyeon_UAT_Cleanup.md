# Inyeon UAT — E2E posted documents & DB reverse guide

**Client:** Inyeon (`inyeon.beautecloud.com`)  
**Test date:** 07/08/2026  
**Tester / env:** Playwright UAT (`e2e/.env`, user `nick`)  
**Login outlet:** TRIPLE ONE  
**GTO destination (tests):** PARKWAY PARADE  

**How to find docs in the app:** open each list → search **`E2E`** or Remarks **`E2E_TEST`**.

**Important:** Item Master rows are **created**, not stock-posted. Stock documents below **did change on-hand qty**.

---

## 1. Stock movement item used for posting

| Item code | Description | UOM | Notes |
|-----------|-------------|-----|--------|
| `11100001` | 3 in 1 LED Face Mask | UNIT | Used by `post-all` workflow; pre-post on-hand was **3**, then **2**, closing **0** after last run |

Search **`E2E_TEST`** on document Remarks. Ref field = **`E2E-<timestamp>`**.

---

## 2. Posted stock documents (reverse these)

### Run A — full post chain (07/08/2026, ~first post-all run)

| # | Type | Ref (`E2E-…`) | Qty | Outlet | DB action |
|---|------|---------------|-----|--------|-----------|
| 1 | GRN | `E2E-1786040897962` | 5 | TRIPLE ONE | Remove hdr + lines + stktrn |
| 2 | ADJ (+) | `E2E-1786040904511` | 1 | TRIPLE ONE | Remove hdr + lines + stktrn |
| 3 | SUM | `E2E-1786040911093` | 1 | TRIPLE ONE | Remove hdr + lines + stktrn |
| 4 | RTN | `E2E-1786040917466` | 1 | TRIPLE ONE | Remove hdr + lines + stktrn |
| 5 | GTO | `E2E-1786040931014` | 1 | TRIPLE ONE → PARKWAY PARADE | Remove hdr + lines + stktrn (both sites if applicable) |
| 6 | PR | `E2E-1786040939371` | 1 | TRIPLE ONE | Remove hdr + lines (no stock if PR only) |

> Copy **Doc No** from the app list into the blank column below after verification.

| Type | Doc No (from app) | Ref | Item | Qty | Reversed? |
|------|-------------------|-----|------|-----|-----------|
| GRN | | E2E-1786040897962 | 11100001 | 5 | ☐ |
| ADJ | | E2E-1786040904511 | 11100001 | 1 | ☐ |
| SUM | | E2E-1786040911093 | 11100001 | 1 | ☐ |
| RTN | | E2E-1786040917466 | 11100001 | 1 | ☐ |
| GTO | | E2E-1786040931014 | 11100001 | 1 | ☐ |
| PR | | E2E-1786040939371 | 11100001 | 1 | ☐ |

### Run B — pre-post stock aware (GRN skipped, on-hand was 2)

| # | Type | Ref (`E2E-…`) | Qty | Notes |
|---|------|---------------|-----|--------|
| 1 | GRN | — | — | **Skipped** (on-hand already sufficient) |
| 2 | ADJ (+) | `E2E-1786075137549` | 1 | |
| 3 | SUM | `E2E-1786075146059` | 1 | |
| 4 | RTN | `E2E-1786075154390` | 1 | |
| 5 | GTO | `E2E-1786075163400` | 1 | To PARKWAY PARADE |
| 6 | PR | `E2E-1786075173693` | 1 | |

| Type | Doc No (from app) | Ref | Item | Qty | Reversed? |
|------|-------------------|-----|------|-----|-----------|
| ADJ | | E2E-1786075137549 | 11100001 | 1 | ☐ |
| SUM | | E2E-1786075146059 | 11100001 | 1 | ☐ |
| RTN | | E2E-1786075154390 | 11100001 | 1 | ☐ |
| GTO | | E2E-1786075163400 | 11100001 | 1 | ☐ |
| PR | | E2E-1786075173693 | 11100001 | 1 | ☐ |

**Estimated stock effect (Run B only):** opening **2** + ADJ **+1** − SUM/RTN/GTO **−3** = closing **0** on `11100001` @ TRIPLE ONE.

---

## 3. Item Master rows created (delete in DB — no stock post)

Search Item Master for name starting with **`E2E`** or **`E2E_TEST`**.

### Run 1 — one per division (`E2E_TEST …`)

| Division | Type | Stock code | Stock name pattern |
|----------|------|------------|-------------------|
| RETAIL PRODUCT | SINGLE | `11100131` | E2E_TEST RETAIL PRODUCT … |
| SALON PRODUCT | SINGLE | `21000035` | E2E_TEST SALON PRODUCT … |
| SERVICES | SINGLE | `31200025` | E2E_TEST SERVICES … |
| VOUCHER | SINGLE | `42300005` | E2E_TEST VOUCHER … |
| PREPAID | SINGLE | `51800003` | E2E_TEST PREPAID … |

### Run 2 — all division × type combinations

| Division | Type | Stock code | Stock name pattern |
|----------|------|------------|-------------------|
| RETAIL PRODUCT | SINGLE | `11100132` | E2E RETAIL SINGLE … |
| SALON PRODUCT | SINGLE | `21000036` | E2E SALON SINGLE … |
| SALON PRODUCT | PACKAGE | `21000037` | E2E SALON PACKAGE … |
| SERVICES | SINGLE | `31200026` | E2E SERVICES SINGLE … |
| SERVICES | PACKAGE | `31200027` | E2E SERVICES PACKAGE … |
| SERVICES | COURSE | `31200028` | E2E SERVICES COURSE … |
| VOUCHER | SINGLE | `42300006` | E2E VOUCHER SINGLE … |
| PREPAID | SINGLE | `51800004` | E2E PREPAID SINGLE … |

**Item Master DB cleanup (per code):** remove `Stocks` row + `ItemUomprices`, `ItemStocklists`, `ItemLinks`, and for PACKAGE types also `PackageHdrs` / `PackageDtls`. Voucher/Prepaid extra tables if created.

| Stock code | Division / type | Deleted? |
|------------|-----------------|----------|
| 11100131 | Retail SINGLE | ☐ |
| 11100132 | Retail SINGLE | ☐ |
| 21000035 | Salon SINGLE | ☐ |
| 21000036 | Salon SINGLE | ☐ |
| 21000037 | Salon PACKAGE | ☐ |
| 31200025 | Services SINGLE | ☐ |
| 31200026 | Services SINGLE | ☐ |
| 31200027 | Services PACKAGE | ☐ |
| 31200028 | Services COURSE | ☐ |
| 42300005 | Voucher SINGLE | ☐ |
| 42300006 | Voucher SINGLE | ☐ |
| 51800003 | Prepaid SINGLE | ☐ |
| 51800004 | Prepaid SINGLE | ☐ |

---

## 4. DB reverse checklist (stock documents)

For each **posted** doc (GRN / ADJ / SUM / RTN / GTO):

1. Find by **Ref** = `E2E-…` or Remarks = `E2E_TEST`.
2. Note **Doc No** and **Item code** (`11100001`).
3. Delete (or reverse per your standard process):
   - Stock header + detail lines
   - **`stktrn`** / stock movement rows for that Doc No
   - Batch rows if any were touched (Inyeon: `BATCH_NO = No`, usually N/A)
4. For **GTO**: check **both** TRIPLE ONE and PARKWAY PARADE item stock.
5. **PR** — usually no stock movement; remove header/lines only.

**Do not** only set status Open → Posted reversed; stock will stay wrong.

---

## 5. After cleanup verification

| Check | OK? |
|-------|-----|
| Search `E2E` on GRN / ADJ / SUM / RTN / GTO / PR lists — no unwanted Posted rows | ☐ |
| Search `E2E` on Item Master — test items removed or kept intentionally | ☐ |
| Stock Balance Live for `11100001` @ TRIPLE ONE — qty restored to expected | ☐ |
| Stock Balance Live for `11100001` @ PARKWAY PARADE (if GTO posted) | ☐ |

---

## 6. Quick SQL / filter hints (adjust table names to your schema)

```
-- Find stock docs by ref (example — adjust column names)
SELECT * FROM StockHdr WHERE DocRef1 LIKE 'E2E-%' OR Remarks LIKE '%E2E_TEST%';

-- Find item master test rows
SELECT * FROM Stocks WHERE StockName LIKE 'E2E%' OR StockName LIKE 'E2E_TEST%';

-- Item codes from this session
11100001, 11100131, 11100132, 21000035, 21000036, 21000037,
31200025, 31200026, 31200027, 31200028, 42300005, 42300006, 51800003, 51800004
```

---

## 7. Regenerate this doc

After future E2E runs, update refs in `scripts/generate-inyeon-cleanup-doc.mjs` and run:

```bash
npm run docs:e2e-cleanup
```

That writes `docs/E2E_Inyeon_UAT_Cleanup.docx`.
