/**
 * Shared helpers for report pages (Stock Balance, Replenishment, etc.)
 */
import { waitForAppReady } from "./screenshots.js";

/** Pick a MultiSelect site option by outlet label (falls back to first option). */
export async function selectSiteByOutletLabel(page, outletLabel) {
  const siteBox = page.getByPlaceholder("Select sites...");
  await siteBox.click();
  await page.waitForTimeout(400);

  const escaped = outletLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactOpt = page
    .getByRole("option")
    .filter({ hasText: new RegExp(`^${escaped}$`, "i") })
    .first();
  const fuzzyOpt = page.getByRole("option").filter({ hasText: new RegExp(escaped, "i") }).first();

  if (await exactOpt.count()) {
    await exactOpt.click();
  } else if (await fuzzyOpt.count()) {
    await fuzzyOpt.click();
  } else {
    await page.getByRole("option").first().click();
  }

  // Close dropdown overlay
  await page.getByRole("heading").first().click({ force: true });
  await page.getByRole("option").first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

export async function clickGenerateReport(page) {
  await page.getByRole("button", { name: /^Generate Report$/i }).click({ force: true });
  await page.getByText(/Generating Report/i).waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
  await waitForAppReady(page, { timeout: 90_000 });
}
