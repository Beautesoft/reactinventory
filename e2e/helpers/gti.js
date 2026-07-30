/**
 * GTI helpers — create/post at receiving outlet (e.g. HQ).
 * With AUTO_POST=Yes on GTO, inbound may already be applied; creating a small GTI
 * is still useful for filled manual screenshots. Use qty 1 carefully.
 */
import {
  selectComboboxByLabel,
  searchAndAddItem,
  ensureExistingBatchOnCart,
  clickSaveOrPost,
  makeE2eRef,
} from "./stockDoc.js";
import { waitForAppReady, waitForListContent } from "./screenshots.js";

/**
 * Prefer posting an existing Open GTI; otherwise create + post a small inbound.
 */
export async function ensurePostedGtiAndCapture(page, { itemCode, fromOutlet, qty = "1" }) {
  await page.goto("/goods-transfer-in");
  await page.getByRole("heading", { name: /Goods Transfer In/i }).waitFor({ state: "visible", timeout: 45_000 });
  await waitForListContent(page);

  // Try Open tab for an existing inbound to post
  const openTab = page.getByRole("button", { name: /^Open$/i });
  if (await openTab.count()) {
    await openTab.click();
    await page.waitForTimeout(1000);
    await waitForListContent(page);
  }

  const openRow = page
    .locator("table tbody tr")
    .filter({ hasNotText: /No data available/i })
    .first();

  if (await openRow.count()) {
    const link = openRow.locator("a").first();
    if (await link.count()) await link.click();
    else await openRow.click();
    await waitForAppReady(page);
    await page.getByRole("heading", { name: /Goods Transfer In|Update|View/i }).waitFor({ state: "visible", timeout: 45_000 });
    // Capture filled open form before post
    await page.waitForTimeout(800);
    return { mode: "existing-open", ref: null };
  }

  // Create new GTI
  await page.goto("/goods-transfer-in/add");
  await page.getByRole("heading", { name: /Add Goods Transfer In/i }).waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);

  const ref = makeE2eRef();
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  await selectComboboxByLabel(page, "From Store", fromOutlet);
  await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
  await page.waitForTimeout(1200);
  await searchAndAddItem(page, { itemCode, qty, price: null });
  await ensureExistingBatchOnCart(page);

  return { mode: "created", ref };
}

export async function postGtiFromForm(page) {
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-transfer-in",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  await waitForListContent(page);
}
