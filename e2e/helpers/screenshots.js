import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCREENSHOT_DIR = path.resolve(__dirname, "../../docs/manual-screenshots");

export function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

/** Wait until full-page "Loading..." spinner is gone (common list/form gate). */
export async function waitForAppReady(page, { timeout = 60_000 } = {}) {
  await page.waitForLoadState("domcontentloaded");
  const patterns = [/^Loading\.\.\.$/, /^Loading data\.\.\.$/i, /^Generating Report\.\.\.$/i];
  for (const re of patterns) {
    const el = page.getByText(re);
    if (await el.isVisible().catch(() => false)) {
      await el.waitFor({ state: "hidden", timeout }).catch(() => {});
    }
  }
  await page.waitForTimeout(300);
  for (const re of patterns) {
    const el = page.getByText(re);
    if (await el.isVisible().catch(() => false)) {
      await el.waitFor({ state: "hidden", timeout }).catch(() => {});
    }
  }
}

/**
 * Wait for a document list to finish loading (rows OR explicit empty state).
 */
export async function waitForListContent(page, { timeout = 60_000 } = {}) {
  await waitForAppReady(page, { timeout });
  await Promise.race([
    page
      .locator("table tbody tr")
      .filter({ hasNotText: /No data available|No items Found/i })
      .first()
      .waitFor({ state: "visible", timeout }),
    page.getByText(/No data available/i).waitFor({ state: "visible", timeout }),
  ]).catch(() => {});
}

/**
 * Full-page screenshot saved under docs/manual-screenshots/<fileName>
 */
export async function captureManualShot(page, fileName, options = {}) {
  ensureScreenshotDir();
  const target = path.join(SCREENSHOT_DIR, fileName);

  if (options.waitList) {
    await waitForListContent(page, { timeout: options.timeout ?? 60_000 });
  } else if (options.waitReady !== false) {
    await waitForAppReady(page, { timeout: options.timeout ?? 60_000 });
  } else {
    await page.waitForLoadState("domcontentloaded");
  }

  await page.waitForTimeout(options.settleMs ?? 500);
  await page.screenshot({
    path: target,
    fullPage: options.fullPage ?? true,
  });
  return target;
}

/**
 * Expand Stock Control + Reports in the sidebar for manual screenshots.
 */
export async function expandSidebarGroups(page) {
  const stockControl = page.getByText(/Stock Control/i).first();
  if (await stockControl.isVisible().catch(() => false)) {
    await stockControl.click();
    await page.waitForTimeout(400);
  }
  const reports = page.getByText(/^Reports$/i).first();
  if (await reports.isVisible().catch(() => false)) {
    await reports.click();
    await page.waitForTimeout(400);
  }
}
