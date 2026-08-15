# Playwright E2E — smoke, workflows, manual screenshots

## Setup (once)

1. `npm install`
2. `npx playwright install chromium`
3. Copy env:

```bash
copy e2e\.env.example e2e\.env
```

4. Edit `e2e/.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `E2E_BASE_URL` | Yes | `http://localhost:3000` (matches Vite port) |
| `E2E_USERNAME` / `E2E_PASSWORD` / `E2E_OUTLET` | Yes | UAT login |
| `E2E_ITEM_CODE` | For GRN workflow only | Item to receive |
| `E2E_SUPPLIER` | Optional | Supplier label substring; else first supplier |
| `E2E_ITEM_QTY` / `E2E_ITEM_PRICE` / `E2E_TERM` | Optional | Defaults 1 / 1 / 30 |
| `E2E_BATCH_NO` | If batch enabled | Batch for cart line |
| `E2E_SKIP_WEBSERVER=1` | Optional | App already running |

Use **UAT / train** only. After create/post tests, run your **DB cleanup**.

## Commands

```bash
# Fast: menus open only (no documents created)
npm run test:e2e:smoke

# UAT: smoke + post all stock docs + replenishment report (recommended)
npm run test:e2e:uat

# Posting only (GRN, ADJ, SUM, RTN, GTO, PR)
npm run test:e2e:post

# View HTML report after any run
npm run test:e2e:report

# Screenshots for user manual → docs/manual-screenshots/
npm run docs:screenshots

# Legacy GRN-only workflow
npm run test:e2e:workflows

# Rebuild Word manual (embeds PNGs when present)
npm run docs:manual

# Everything (includes doc capture specs if present)
npm run test:e2e
```

## Recommended UAT flow (Inyeon / any client)

1. Set `e2e/.env`: `E2E_OUTLET`, `E2E_TO_OUTLET` (different store for GTO), `E2E_ITEM_CODE`
2. `npm run test:e2e:uat` — smoke + posting + replenishment report
3. `npm run test:e2e:report` — open pass/fail HTML report
4. **DB cleanup** — see `docs/E2E_Inyeon_UAT_Cleanup.md` (or run `npm run docs:e2e-cleanup` for Word)

## What each suite does

| Suite | Creates docs? | Screenshots? |
|-------|---------------|--------------|
| `e2e/smoke` | No | No |
| `e2e/workflows/post-all` | Yes (GRN/ADJ/SUM/RTN/GTO/PR) | No — logs **pre/post on-hand** in report annotations |
| `e2e/workflows/item-master-create` | Yes (8 items: all division × type combos) | No — names tagged `E2E` |
| `e2e/workflows/replenishment` | No | No |
| `e2e/workflows/replenishment` | No | No |
| `e2e/docs` | No | Yes (manual pages) |
| `e2e/workflows/docs-populate` | Yes + screenshots | Yes |
| `e2e/workflows/docs-stocktake-gti` | Yes (skipped unless `E2E_RUN_STOCKTAKE_GTI=1`) | Yes |

## Notes

- Playwright files are **not** included in `npm run build`.
- Missing PNGs show a placeholder in the Word doc until you capture them.
- GRN workflow tags: Remarks = `E2E_TEST`, GR Ref 1 = `E2E-<timestamp>`.
