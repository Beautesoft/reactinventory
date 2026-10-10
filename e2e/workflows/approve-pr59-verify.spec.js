/**
 * One-off: approve PRZE01000059 with specific R01:2 + NOBATCH:1, verify vs projection.
 * Run: npx playwright test e2e/workflows/approve-pr59-verify.spec.js
 */
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import {
  openPostedPrForApproval,
  approvePrFromApprovalScreen,
} from "../helpers/pr.js";
import { waitForAppReady } from "../helpers/screenshots.js";
import {
  fetchGtiHeaderByPrRef,
  fetchStkMovdocLines,
  snapshotBatches,
} from "../helpers/loopbackRead.js";

const PR_NO = "PRZE01000059";
const ITEM = "11600012";
const HQ = "ZEHQ";
const OUTLET = "ZE01";
const UNIT_COST = 62.4;
const DOC_AMT = 624;
const QTY = 3;

async function lbGet(path) {
  const base = (
    process.env.E2E_API_BASE_URL || "https://zenthtrain.beautecloud.com/lb/api"
  ).replace(/\/$/, "");
  const res = await fetch(`${base}/${path.replace(/^\//, "")}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function fetchStktrnsForDoc(docNo) {
  const filter = encodeURIComponent(JSON.stringify({ where: { trnDocno: docNo } }));
  const rows = await lbGet(`Stktrns?filter=${filter}`);
  return Array.isArray(rows) ? rows : [];
}

async function selectR01AndNoBatchOnPrLine(page, itemCode, r01Qty, noBatchQty) {
  const row = page.locator("table tbody tr").filter({ hasText: itemCode }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  const btn = row.getByRole("button", { name: /Select Batch|Edit Batch/i });
  await btn.click();

  const dialog = page.getByRole("dialog").filter({
    hasText: /Select Specific Batches|Edit Batch Selection/i,
  });
  await dialog.waitFor({ state: "visible", timeout: 30_000 });
  await dialog
    .getByText(/Loading batches/i)
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  const bodyRows = dialog.locator("table tbody tr");
  const count = await bodyRows.count();

  const pickRow = async (matchRe, qty) => {
    for (let i = 0; i < count; i++) {
      const label = ((await bodyRows.nth(i).innerText()) || "").replace(/\s+/g, " ");
      if (!matchRe.test(label)) continue;
      const cb = bodyRows.nth(i).locator('input[type="checkbox"]');
      if (!(await cb.count()) || (await cb.isDisabled().catch(() => true))) continue;
      await cb.click();
      const qtyBox = bodyRows.nth(i).locator('input:not([type="checkbox"])');
      if (await qtyBox.count()) {
        await qtyBox.first().fill(String(qty));
        await qtyBox.first().blur();
      }
      return true;
    }
    return false;
  };

  const gotR01 = await pickRow(/\bR01\b/i, r01Qty);
  expect(gotR01, "R01 batch row").toBe(true);
  const gotNb = await pickRow(/No Batch/i, noBatchQty);
  expect(gotNb, "No Batch row").toBe(true);

  const confirm = dialog.getByRole("button", { name: /Confirm Selection/i });
  await expect(confirm).toBeEnabled({ timeout: 15_000 });
  await confirm.click();
  await dialog.waitFor({ state: "hidden", timeout: 30_000 });
  await row.getByText(/^Specific$/i).waitFor({ state: "visible", timeout: 15_000 });
}

test.describe("PRZE01000059 approve + verify", () => {
  test("specific R01:2 NOBATCH:1 matches projection", async ({ page }) => {
    test.setTimeout(10 * 60_000);

    const hqOutlet =
      process.env.E2E_HQ_OUTLET ||
      process.env.E2E_OUTLET ||
      "BeautySalon HQ - Demo";

    const batchesBefore = await snapshotBatches([ITEM], [HQ, OUTLET]);

    await loginAsTestUser(page, { outlet: hqOutlet, siteCode: HQ });
    await openPostedPrForApproval(page, null, PR_NO);
    await waitForAppReady(page);

    await selectR01AndNoBatchOnPrLine(page, ITEM, 2, 1);
    await approvePrFromApprovalScreen(page);

    await expect
      .poll(
        async () => {
          const f = encodeURIComponent(JSON.stringify({ where: { reqNo: PR_NO } }));
          const rows = await lbGet(`reqs?filter=${f}`);
          return rows[0]?.reqStatus;
        },
        { timeout: 180_000 }
      )
      .toMatch(/Approved/i);

    const gtiHdr = await fetchGtiHeaderByPrRef(PR_NO);
    expect(gtiHdr?.docNo, "GTI created").toBeTruthy();
    expect(String(gtiHdr.docStatus)).toBe("7");
    expect(gtiHdr.fstoreNo).toBe(HQ);
    expect(gtiHdr.tstoreNo).toBe(OUTLET);

    const lines = await fetchStkMovdocLines(gtiHdr.docNo);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const line = lines.find((l) => String(l.itemcode).includes(ITEM));
    expect(line).toBeTruthy();
    expect(Number(line.docQty)).toBe(QTY);
    expect(Number(line.docAmt)).toBe(DOC_AMT);
    expect(String(line.ordMemo1 || "").toLowerCase()).toContain("specific");
    expect(line.ordMemo2 || "").toMatch(/R01\s*:\s*2/i);
    expect(String(line.ordMemo3 || "")).toBe("1");

    const stktrns = await fetchStktrnsForDoc(gtiHdr.docNo);
    expect(stktrns.length).toBe(2);
    const hqTrn = stktrns.find((s) => s.storeNo === HQ);
    const zeTrn = stktrns.find((s) => s.storeNo === OUTLET);
    expect(hqTrn).toBeTruthy();
    expect(zeTrn).toBeTruthy();
    expect(Number(hqTrn.trnQty)).toBe(-QTY);
    expect(Number(zeTrn.trnQty)).toBe(QTY);
    expect(Math.abs(Number(hqTrn.trnAmt))).toBe(DOC_AMT);
    expect(Math.abs(Number(zeTrn.trnAmt))).toBe(DOC_AMT);

    const batchLabel = (hqTrn.itemBatch || zeTrn.itemBatch || "").replace(/\s/g, "");
    expect(batchLabel).toMatch(/R01/i);
    expect(batchLabel.toLowerCase()).toMatch(/nobatch/i);

    const hqCost = Number(hqTrn.itemBatchCost);
    const zeCost = Number(zeTrn.itemBatchCost);
    expect(Math.abs(hqCost - UNIT_COST)).toBeLessThan(0.05);
    expect(Math.abs(zeCost - UNIT_COST)).toBeLessThan(0.05);

    const batchesAfter = await snapshotBatches([ITEM], [HQ, OUTLET]);
    const hqR01Before =
      batchesBefore[HQ][ITEM]?.find((b) => b.batchNo === "R01")?.qty ?? null;
    const hqNbBefore =
      batchesBefore[HQ][ITEM]?.find((b) => !b.batchNo)?.qty ?? null;
    const zeR01Before =
      batchesBefore[OUTLET][ITEM]?.find((b) => b.batchNo === "R01")?.qty ?? null;
    const zeNbBefore =
      batchesBefore[OUTLET][ITEM]?.find((b) => !b.batchNo)?.qty ?? null;

    const hqR01After = batchesAfter[HQ][ITEM]?.find((b) => b.batchNo === "R01")?.qty;
    const hqNbAfter = batchesAfter[HQ][ITEM]?.find((b) => !b.batchNo)?.qty;
    const zeR01After = batchesAfter[OUTLET][ITEM]?.find((b) => b.batchNo === "R01")?.qty;
    const zeNbAfter = batchesAfter[OUTLET][ITEM]?.find((b) => !b.batchNo)?.qty;

    if (hqR01Before != null) expect(hqR01After).toBe(hqR01Before - 2);
    if (hqNbBefore != null) expect(hqNbAfter).toBe(hqNbBefore - 1);
    if (zeR01Before != null) expect(zeR01After).toBe(zeR01Before + 2);
    if (zeNbBefore != null) expect(zeNbAfter).toBe(zeNbBefore + 1);

    console.log("VERIFY_OK", {
      pr: PR_NO,
      gti: gtiHdr.docNo,
      ordMemo2: line.ordMemo2,
      itemBatch: hqTrn.itemBatch,
      itemBatchCost: hqCost,
      batchesAfter: batchesAfter,
    });
  });
});
