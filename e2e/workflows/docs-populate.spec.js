import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import {
  captureManualShot,
  expandSidebarGroups,
  waitForAppReady,
  waitForListContent,
} from "../helpers/screenshots.js";
import { openGrnPrintByRef } from "../helpers/grn.js";
import {
  getWorkflowEnv,
  makeE2eRef,
  todayISO,
  selectComboboxByLabel,
  searchAndAddItem,
  ensureNewBatchOnCart,
  ensureExistingBatchOnCart,
  clickSaveOrPost,
} from "../helpers/stockDoc.js";

/**
 * Posts sample docs across main menus and captures filled screenshots for the user manual.
 * Login outlet = E2E_OUTLET (e.g. DRAGON HEALTH).
 * GTO / GTI destination = E2E_TO_OUTLET / E2E_HQ_OUTLET (DRAGON HEALTH HQ).
 * Clean up via DB after (Remarks / Ref contain E2E).
 */
test.describe("Docs — populate menus + screenshots", () => {
  test("post GRN/ADJ/SUM/RTN/GTO/PR and capture filled screens", async ({ page }) => {
    test.setTimeout(20 * 60_000);
    const cfg = getWorkflowEnv();
    let prRef = "";
    let grnRef = "";

    // --- Login + shell shots ---
    await page.goto("/login");
    await page.getByLabel("Username").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Loading outlets...").waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
    await captureManualShot(page, "01-login.png", { waitReady: false });

    await loginAsTestUser(page);
    await expandSidebarGroups(page);
    await waitForAppReady(page);
    await captureManualShot(page, "02-dashboard-layout.png");
    await captureManualShot(page, "03-sidebar-expanded.png");
    await captureManualShot(page, "04-dashboard.png");

    // ========== GRN (receive stock first) ==========
    {
      grnRef = makeE2eRef();
      const receiveQty = String(Math.max(Number(cfg.qty) || 1, 5));
      await page.goto("/goods-receive-note/add");
      await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({ state: "visible" });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter GR Ref 1").fill(grnRef);
      await selectComboboxByLabel(page, "Supply No", cfg.supplier || null);
      await page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).locator('input[type="date"]').fill(todayISO());
      await page.getByPlaceholder("Enter term").fill(cfg.term);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: receiveQty });
      await ensureNewBatchOnCart(page, cfg.batchNo);
      await page.getByText("Selected Items").scrollIntoViewIfNeeded().catch(() => {});
      await captureManualShot(page, "06-form-grn.png");
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-receive-note",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await waitForListContent(page);
      // Prefer searching to the E2E row so the list isn't empty-looking mid-filter
      const search = page.getByPlaceholder(/Search by Doc no/i);
      if (await search.count()) {
        await search.fill(grnRef);
        await page.waitForTimeout(1200);
      }
      await captureManualShot(page, "05-list-grn.png", { waitList: true });

      await openGrnPrintByRef(page, grnRef);
      await waitForAppReady(page);
      await page.waitForTimeout(1000);
      await captureManualShot(page, "16-print-grn.png");
      await page.goto("/goods-receive-note");
      await waitForListContent(page);
    }

    // ========== ADJ (+) ==========
    {
      const ref = makeE2eRef();
      await page.goto("/stock-adjustment/add");
      await page.getByRole("heading", { name: /Add Stock Adjustment/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter Ref 1").fill(ref);
      await page.getByPlaceholder("Enter remark").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureNewBatchOnCart(page, cfg.batchNo);
      await captureManualShot(page, "17-form-adj.png");
      await clickSaveOrPost(page, "post", {
        listPath: "/stock-adjustment",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
    }

    // ========== SUM ==========
    {
      const ref = makeE2eRef();
      await page.goto("/stock-usage-memo/add");
      await page.getByRole("heading", { name: /Add Stock Usage Memo|Stock Usage/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter Ref 1").fill(ref);
      await page.getByPlaceholder("Enter remark").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await captureManualShot(page, "18-form-sum.png");
      await clickSaveOrPost(page, "post", {
        listPath: "/stock-usage-memo",
        successRe: /Posted successfully|Stock Usage Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
    }

    // ========== RTN ==========
    {
      const ref = makeE2eRef();
      await page.goto("/goods-return-note/add");
      await page.getByRole("heading", { name: /Add Goods Return Note/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter RTN Ref 1").fill(ref);
      await selectComboboxByLabel(page, "Supply No", cfg.supplier || null);
      const delivery = page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).locator('input[type="date"]');
      if (await delivery.count()) await delivery.fill(todayISO());
      const term = page.getByPlaceholder("Enter term");
      if (await term.count()) await term.fill(cfg.term);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await captureManualShot(page, "19-form-rtn.png");
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-return-note",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
    }

    // ========== GTO → HQ ==========
    {
      const ref = makeE2eRef();
      await page.goto("/goods-transfer-out/add");
      await page.getByRole("heading", { name: /Add Goods Transfer Out/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
      await selectComboboxByLabel(page, "To Store", cfg.toOutlet);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await page.waitForTimeout(1000);
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await captureManualShot(page, "07-form-gto.png");
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-transfer-out",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
    }

    // ========== PR (create + post so list has rows) ==========
    {
      prRef = makeE2eRef();
      try {
        await page.goto("/purchase-requisition/add");
        await page.getByRole("heading", { name: /Add Purchase Requisition/i }).waitFor({ state: "visible", timeout: 45_000 });
        await waitForAppReady(page);
        await page.getByPlaceholder("Enter reference").fill(prRef);
        await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
        const requestTo = page.locator("div.space-y-2").filter({ hasText: /Request To/i }).getByRole("combobox");
        if (await requestTo.count()) {
          const current = (await requestTo.innerText().catch(() => "")).trim();
          if (!/HQ/i.test(current)) {
            await selectComboboxByLabel(page, "Request To", "HQ");
          }
        }
        await searchAndAddItem(page, { ...cfg, qty: "1", price: null });
        await captureManualShot(page, "21-form-pr.png");
        await clickSaveOrPost(page, "post", {
          listPath: "/purchase-requisition",
          successRe: /Purchase Requisition posted successfully|Posted successfully|Created successfully/i,
          errorRe: /Error posting|Failed to (post|create|update)/i,
        });
      } catch (err) {
        console.warn("PR post soft-fail (continuing docs):", err.message);
        await captureManualShot(page, "21-form-pr.png").catch(() => {});
        await page.goto("/purchase-requisition");
      }
      await waitForListContent(page);
      const prSearch = page.getByPlaceholder(/Search by PR no/i);
      if (await prSearch.count() && prRef) {
        await prSearch.fill(prRef);
        await page.waitForTimeout(800);
        await page.getByText(/^Loading data\.\.\.$/i).waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
        await page.waitForTimeout(1200);
      }
      await captureManualShot(page, "10-pr-list.png", { waitList: true, settleMs: 800 });
    }

    // ========== Stock Take ==========
    await page.goto("/stock-take/add");
    await page.getByRole("heading", { name: /Add Stock Take/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForAppReady(page);
    await page.getByPlaceholder("Search items...").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await captureManualShot(page, "08-form-stock-take.png");

    // ========== Stock Balance live ==========
    await page.goto("/stock-balance-live");
    await page.getByRole("heading", { name: /Stock Balance/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForListContent(page);
    await captureManualShot(page, "09-stock-balance-live.png", { waitList: true });

    // ========== Item Master ==========
    await page.goto("/item-master");
    await page.getByRole("heading", { name: /Item Master/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForListContent(page);
    await captureManualShot(page, "12-item-master-list.png", { waitList: true });
    const firstItem = page
      .locator("table tbody tr")
      .filter({ hasNotText: /No data available/i })
      .first();
    if (await firstItem.count()) {
      await firstItem.click();
      await page.getByText(/^Loading\.\.\.$/).waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
      await page
        .getByRole("heading", { name: /Item Master|Edit Item|Update Item|View Item/i })
        .waitFor({ state: "visible", timeout: 45_000 })
        .catch(() => {});
      await waitForAppReady(page);
      await page.waitForTimeout(1000);
      await captureManualShot(page, "13-item-master-form.png");
    } else {
      await page.goto("/item-master/add");
      await page.getByRole("heading", { name: /New Item Master/i }).waitFor({ state: "visible", timeout: 30_000 });
      await waitForAppReady(page);
      await captureManualShot(page, "13-item-master-form.png");
    }

    // ========== Stock Balance Report — select site + Generate ==========
    await page.goto("/stock-balance");
    await page.getByRole("heading", { name: /Stock Balance Report/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForAppReady(page);
    const siteBox = page.getByPlaceholder("Select sites...");
    await siteBox.click();
    await page.waitForTimeout(400);
    const outletLabel = process.env.E2E_OUTLET || "DRAGON HEALTH";
    const outletOpt = page
      .getByRole("option")
      .filter({ hasText: new RegExp(`^${outletLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
      .first();
    const outletFuzzy = page.getByRole("option").filter({ hasText: /DRAGON HEALTH(?!\s*HQ)/i }).first();
    if (await outletOpt.count()) {
      await outletOpt.click();
    } else if (await outletFuzzy.count()) {
      await outletFuzzy.click();
    } else {
      await page.getByRole("option").first().click();
    }
    // Close MultiSelect dropdown (Escape alone may not unmount cmdk overlay)
    await page.getByRole("heading", { name: /Stock Balance Report/i }).click({ force: true });
    await page.getByRole("option").first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /^Generate Report$/i }).click({ force: true });
    await page.getByText(/Generating Report/i).waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
    await page
      .getByText(/Stock Balance Report Results|No data|Outlet/i)
      .first()
      .waitFor({ state: "visible", timeout: 90_000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
    await captureManualShot(page, "14-report-stock-balance.png");

    // ========== Settings — select a user ==========
    await page.goto("/settings");
    if (!page.url().includes("/login")) {
      await page.getByRole("heading", { name: /User Authorization/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      const userSelect = page.locator("div.space-y-2").filter({ hasText: /Select User/i }).getByRole("combobox");
      await userSelect.click();
      const nickOpt = page.getByRole("option").filter({ hasText: process.env.E2E_USERNAME || "nick" }).first();
      if (await nickOpt.count()) {
        await nickOpt.click();
      } else {
        await page.getByRole("option").first().click();
      }
      await page.getByText(/No User Selected/i).waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(800);
      await captureManualShot(page, "15-settings.png");
    }

    // ========== HQ: GTI list + PR approval view ==========
    try {
      await logoutTestUser(page);
      await loginAsTestUser(page, { outlet: cfg.hqOutlet });
      await expandSidebarGroups(page);

      await page.goto("/goods-transfer-in");
      await page.getByRole("heading", { name: /Goods Transfer In/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForListContent(page);
      await captureManualShot(page, "20-list-gti.png", { waitList: true });

      await page.goto("/purchase-requisition");
      await page.getByRole("heading", { name: /Purchase Requisition/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForListContent(page);
      if (prRef) {
        const hqPrSearch = page.getByPlaceholder(/Search by PR no/i);
        if (await hqPrSearch.count()) {
          await hqPrSearch.fill(prRef);
          await page.waitForTimeout(1200);
        }
      }
      const prRow = page
        .locator("table tbody tr")
        .filter({ hasText: prRef || /Posted/i })
        .first();
      if (await prRow.count()) {
        const link = prRow.locator("a, td").first();
        await link.click();
        await waitForAppReady(page);
        await page
          .getByRole("heading", { name: /Purchase Requisition|Approve|View Posted/i })
          .waitFor({ state: "visible", timeout: 45_000 })
          .catch(() => {});
        await page.waitForTimeout(1000);
        await captureManualShot(page, "11-pr-approval.png");
      } else {
        await captureManualShot(page, "11-pr-approval.png", { waitList: true });
      }
    } catch (err) {
      console.warn("HQ login/GTI/PR approval soft-fail:", err.message);
      await page.goto("/goods-transfer-in").catch(() => {});
      await captureManualShot(page, "20-list-gti.png").catch(() => {});
      await page.goto("/purchase-requisition").catch(() => {});
      await captureManualShot(page, "11-pr-approval.png").catch(() => {});
    }

    expect(true).toBeTruthy();
    console.log(`Docs populate OK — grn=${grnRef} pr=${prRef} (DB cleanup after review)`);
  });
});
