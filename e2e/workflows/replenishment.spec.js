import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { waitForAppReady } from "../helpers/screenshots.js";
import { selectSiteByOutletLabel, clickGenerateReport } from "../helpers/report.js";

/**
 * Replenishment Report — validation + generate (read-only, no documents posted).
 */
test.describe("UAT — Replenishment Report", () => {
  test("requires site, then generates report for login outlet", async ({ page }) => {
    test.setTimeout(5 * 60_000);

    const outlet = process.env.E2E_OUTLET;
    if (!outlet) {
      throw new Error("Set E2E_OUTLET in e2e/.env");
    }

    await loginAsTestUser(page);
    await page.goto("/replenishment-report");
    await page.getByRole("heading", { name: /Replenishment Report/i }).waitFor({ state: "visible" });
    await waitForAppReady(page);

    // Generate without site → validation toast
    await page.getByRole("button", { name: /^Generate Report$/i }).click();
    await expect(page.getByText(/Please select at least one site/i).first()).toBeVisible({ timeout: 10_000 });

    // Select current outlet site and generate
    await selectSiteByOutletLabel(page, outlet);
    await clickGenerateReport(page);

    // Results panel or empty-state toast
    const results = page.getByText(/Replenishment Report Results/i);
    const emptyToast = page.getByText(/No items below reorder level/i).first();
    const successToast = page.getByText(/Report generated with \d+ item/i).first();

    await Promise.race([
      results.waitFor({ state: "visible", timeout: 90_000 }),
      emptyToast.waitFor({ state: "visible", timeout: 90_000 }),
      successToast.waitFor({ state: "visible", timeout: 90_000 }),
    ]);

    const hasResults = await results.isVisible().catch(() => false);
    if (hasResults) {
      await expect(page.getByText(/Selected Sites:/i)).toBeVisible();
    }
  });
});
