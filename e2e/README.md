# E2E testing (UI paths)

Tests drive the **same buttons** users click (login → forms → **Save** / **Post**). After posting, batch/FEFO workflows can **read back** document lines from LoopBack (GET only).

## Setup

1. Copy `e2e/.env.example` → `e2e/.env`
2. Set `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_OUTLET`, `E2E_ITEM_CODE`
3. Use a login user with **`batchNo=Yes`** (and **`autoPost=Yes`** for one-way PR → GTI auto-post). Flags come from the login API, not only `public/config.js`.

Optional:

| Variable | Purpose |
|----------|---------|
| `E2E_TO_OUTLET` | GTO destination (post-all, GTO FEFO test) |
| `E2E_HQ_OUTLET` | HQ outlet for PR approval test |
| `E2E_API_BASE_URL` | LoopBack read-back (default: zenthtrain) |
| `E2E_OUTBOUND_BATCH_MODE` | `specific` (default) or `fefo` for post-all outbound docs |
| `E2E_RUN_BATCH_FEFO` | `1` = run `batch-fefo-post.spec.js` |
| `E2E_SKIP_WEBSERVER` | `1` if dev server already on port 3000 |

## Commands

```bash
# Smoke — menus only, no posting
npm run test:e2e:smoke

# UAT post chain (GRN, ADJ, SUM, RTN, GTO, PR outlet post)
npm run test:e2e:post

# FEFO memo + PR approve → GTI (creates real docs)
# Add E2E_RUN_BATCH_FEFO=1 to e2e/.env first
npm run test:e2e:batch-fefo

# FEFO on all outbound steps in post-all
# E2E_OUTBOUND_BATCH_MODE=fefo npm run test:e2e:post
```

## What each suite covers

| Suite | Fixes verified |
|-------|----------------|
| `post-all.spec.js` | Document post flows; optional FEFO outbound via env |
| `batch-fefo-post.spec.js` | FEFO **ordMemo2** write-back (SUM, GTO); PR **approve order** + GTI FEFO memos |
| `smoke/menus.spec.js` | Routes load |

## After a run

Posted docs use refs `E2E-<timestamp>` and remark `E2E_TEST`. Clean up on train via your DB cleanup scripts (`npm run docs:e2e-cleanup` etc.).

## Read-back checks

`e2e/helpers/loopbackRead.js` loads `StkMovdocDtls` and asserts FEFO lines have `ordMemo2` like `BATCH:qty` without changing `ordMemo1` to `specific`.
