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

# Screenshots for user manual → docs/manual-screenshots/
npm run docs:screenshots

# Create real GRN (Save → Post) + print screenshot
# Requires E2E_ITEM_CODE
npm run test:e2e:workflows

# Rebuild Word manual (embeds PNGs when present)
npm run docs:manual

# Everything
npm run test:e2e
```

## Recommended release / UAT flow

1. `npm run docs:screenshots` — capture menus/forms  
2. Set `E2E_ITEM_CODE` → `npm run test:e2e:workflows` — create GRN + print shot  
3. `npm run docs:manual` — refresh `docs/React_Inventory_User_Manual.docx`  
4. **DB cleanup** for docs with Remarks `E2E_TEST` / Ref `E2E-...`  
5. Optionally `npm run test:e2e:smoke` anytime for a quick health check  

## What each suite does

| Suite | Creates docs? | Screenshots? |
|-------|---------------|--------------|
| `e2e/smoke` | No | No |
| `e2e/docs` | No | Yes (manual pages) |
| `e2e/workflows` | Yes (GRN) | Updates list/form/print shots |

## Notes

- Playwright files are **not** included in `npm run build`.
- Missing PNGs show a placeholder in the Word doc until you capture them.
- GRN workflow tags: Remarks = `E2E_TEST`, GR Ref 1 = `E2E-<timestamp>`.
