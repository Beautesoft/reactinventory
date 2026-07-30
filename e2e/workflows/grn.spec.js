import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { captureManualShot } from "../helpers/screenshots.js";
import {
  requireGrnEnv,
  makeE2eRef,
  resolveBatchNo,
  fillNewGrnForm,
  clickGrnSave,
  clickGrnPost,
  openGrnByRef,
  openGrnPrintByRef,
} from "../helpers/grn.js";

/**
 * Creates a real GRN (Save → Post) for UAT automation.
 * Tags document with GR Ref 1 = E2E-<timestamp> and Remarks = E2E_TEST.
 * Clean up via your DB process after the run.
 *
 * Also captures print preview screenshot for the user manual.
 *
 * Requires E2E_ITEM_CODE in e2e/.env
 */
test.describe("Workflow — GRN create / save / post", () => {
  test("create GRN, save open, post, capture print", async ({ page }) => {
    test.setTimeout(8 * 60_000);

    const cfg = requireGrnEnv();
    const ref = makeE2eRef();
    cfg.batchNo = resolveBatchNo(cfg.batchNo);

    await loginAsTestUser(page);

    await fillNewGrnForm(page, { ...cfg, ref });
    await captureManualShot(page, "06-form-grn.png");

    // Save as Open
    await clickGrnSave(page);
    await expect(page.getByRole("heading", { name: /Goods Receive Note/i })).toBeVisible();

    // Search by E2E ref
    const search = page.getByPlaceholder(/Search by Doc no/i);
    await search.fill(ref);
    await page.waitForTimeout(1500);
    const openRow = page.locator("table tbody tr").filter({ hasText: ref }).first();
    await expect(openRow).toBeVisible({ timeout: 30_000 });
    await expect(openRow.getByText(/Open/i)).toBeVisible();

    // Open and Post
    await openGrnByRef(page, ref);
    await expect(page.getByRole("heading", { name: /Update Goods Receive Note|View Goods Receive Note/i })).toBeVisible();
    await clickGrnPost(page);

    await search.fill(ref);
    await page.waitForTimeout(1500);
    const postedRow = page.locator("table tbody tr").filter({ hasText: ref }).first();
    await expect(postedRow).toBeVisible({ timeout: 30_000 });
    await expect(postedRow.getByText(/Posted/i)).toBeVisible();

    // Print preview for manual
    await openGrnPrintByRef(page, ref);
    await page.waitForTimeout(1500);
    await captureManualShot(page, "16-print-grn.png");

    // Refresh list shot with real data
    await page.goto("/goods-receive-note");
    await page.getByRole("heading", { name: /Goods Receive Note/i }).waitFor({ state: "visible" });
    await captureManualShot(page, "05-list-grn.png");

    console.log(`GRN workflow OK — ref=${ref} (DB cleanup after testing)`);
  });
});
