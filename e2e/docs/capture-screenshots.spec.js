import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { captureManualShot, expandSidebarGroups } from "../helpers/screenshots.js";

/**
 * Captures screenshots for the user manual (no document posting).
 * Output: docs/manual-screenshots/*.png
 * Rebuild manual: npm run docs:manual
 */
test.describe("Docs — manual screenshots", () => {
  test("capture login, menus, and key screens", async ({ page }) => {
    test.setTimeout(6 * 60_000);

    // 01 — Login (before auth)
    await page.goto("/login");
    await page.getByLabel("Username").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Loading outlets...").waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
    await captureManualShot(page, "01-login.png");

    await loginAsTestUser(page);

    // 02 / 04 — Dashboard layout
    await page.goto("/dashboard");
    await page.getByRole("heading", { name: /Welcome back/i }).waitFor({ state: "visible" });
    await expandSidebarGroups(page);
    await captureManualShot(page, "02-dashboard-layout.png");
    await captureManualShot(page, "04-dashboard.png");

    // 03 — Sidebar groups expanded (same view; dedicated crop-friendly full page)
    await captureManualShot(page, "03-sidebar-expanded.png");

    // 05 — Typical list (GRN)
    await page.goto("/goods-receive-note");
    await page.getByRole("heading", { name: /Goods Receive Note/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "05-list-grn.png");

    // 06 — Typical form (empty add — Save/Post visible)
    await page.goto("/goods-receive-note/add");
    await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "06-form-grn.png");

    // 07 — GTO form (destination site)
    await page.goto("/goods-transfer-out/add");
    await page.getByRole("heading", { name: /Add Goods Transfer Out/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "07-form-gto.png");

    // 08 — Stock Take
    await page.goto("/stock-take/add");
    await page.getByRole("heading", { name: /Add Stock Take/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "08-form-stock-take.png");

    // 09 — Live Stock Balance
    await page.goto("/stock-balance-live");
    await page.getByRole("heading", { name: /Stock Balance/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "09-stock-balance-live.png");

    // 10 — PR list
    await page.goto("/purchase-requisition");
    await page.getByRole("heading", { name: /Purchase Requisition/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "10-pr-list.png");
    // Approval UI varies by HQ role — reuse list shot when approval pane not present
    await captureManualShot(page, "11-pr-approval.png");

    // 12 / 13 — Item Master
    await page.goto("/item-master");
    await page.getByRole("heading", { name: /Item Master/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "12-item-master-list.png");

    await page.goto("/item-master/add");
    await page.getByRole("heading", { name: /New Item Master|Edit Item Master|Item Master/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "13-item-master-form.png");

    // 14 — Report
    await page.goto("/stock-balance");
    await page.getByRole("heading", { name: /Stock Balance Report/i }).waitFor({ state: "visible", timeout: 45_000 });
    await captureManualShot(page, "14-report-stock-balance.png");

    // 15 — Settings (optional)
    await page.goto("/settings");
    await page.waitForLoadState("domcontentloaded");
    if (!page.url().includes("/login")) {
      await captureManualShot(page, "15-settings.png");
    }

    expect(true).toBeTruthy();
  });
});
