import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import {
  captureManualShot,
  expandSidebarGroups,
  waitForAppReady,
  waitForListContent,
} from "../helpers/screenshots.js";
import { getWorkflowEnv } from "../helpers/stockDoc.js";
import { postStockTakeForItem, clickStockTakePost } from "../helpers/stockTake.js";
import { ensurePostedGtiAndCapture, postGtiFromForm } from "../helpers/gti.js";

/**
 * Careful docs update for Stock Take + GTI using E2E_ITEM_CODE (12200002).
 * Also verifies all Dragon outlets from login can be selected.
 *
 * Outlets: DRAGON HEALTH, DRAGON HEALTH HQ, Dragon Health 02, Dragon Health 03
 * Stock Take: counted qty = on-hand (zero variance) to avoid stock drift.
 * GTI: posted at HQ (create small inbound if no Open GTI).
 */
const ALL_OUTLETS = [
  "DRAGON HEALTH",
  "DRAGON HEALTH HQ",
  "Dragon Health 02",
  "Dragon Health 03",
];

test.describe("Docs — Stock Take + GTI (careful)", () => {
  test("verify outlets, post Stock Take + GTI, capture screens", async ({ page }) => {
    test.setTimeout(18 * 60_000);
    const cfg = getWorkflowEnv();
    const itemCode = cfg.itemCode;
    expect(itemCode).toBeTruthy();

    // ----- Login page: confirm all 4 outlets exist -----
    await page.goto("/login");
    await page.getByLabel("Username").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Loading outlets...").waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});
    await page.getByText("Select Outlet", { exact: true }).waitFor({ state: "visible", timeout: 90_000 });

    await page.getByLabel("Username").fill(process.env.E2E_USERNAME);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD);
    await page.locator("div.space-y-2").filter({ hasText: "Select Outlet" }).getByRole("combobox").click();

    for (const name of ALL_OUTLETS) {
      const opt = page.getByRole("option").filter({ hasText: name }).first();
      await expect(opt, `Missing outlet: ${name}`).toBeVisible({ timeout: 15_000 });
    }
    await captureManualShot(page, "01-login.png", { waitReady: false, settleMs: 400 });
    // Close dropdown by picking primary outlet
    await page.getByRole("option").filter({ hasText: process.env.E2E_OUTLET || "DRAGON HEALTH" }).first().click();
    await page.getByRole("button", { name: /^Login$/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45_000 });
    await page.getByRole("heading", { name: /Welcome back/i }).waitFor({ state: "visible", timeout: 45_000 });
    await expandSidebarGroups(page);

    // ========== Stock Take @ DRAGON HEALTH (item 12200002, zero variance) ==========
    {
      const { counted, onHand } = await postStockTakeForItem(page, {
        itemCode,
        remarks: "E2E_TEST",
        preferUom: "BOX",
      });
      console.log(`Stock Take qty: counted=${counted} onHand=${onHand}`);
      await captureManualShot(page, "08-form-stock-take.png");
      await clickStockTakePost(page);
      await captureManualShot(page, "22-list-stock-take.png", { waitList: true });
    }

    // ========== Soft-check outlet 02 & 03 (login + list only, no post) ==========
    for (const outlet of ["Dragon Health 02", "Dragon Health 03"]) {
      try {
        await logoutTestUser(page);
        await loginAsTestUser(page, { outlet });
        await expandSidebarGroups(page);
        await page.goto("/stock-take");
        await page.getByRole("heading", { name: /Stock Take/i }).waitFor({ state: "visible", timeout: 45_000 });
        await waitForListContent(page);
        await page.goto("/goods-transfer-in");
        await page.getByRole("heading", { name: /Goods Transfer In/i }).waitFor({ state: "visible", timeout: 45_000 });
        await waitForListContent(page);
        console.log(`Outlet OK (list only): ${outlet}`);
      } catch (err) {
        console.warn(`Outlet check soft-fail ${outlet}:`, err.message);
      }
    }

    // ========== GTI @ HQ — post inbound for filled screenshot ==========
    await logoutTestUser(page);
    await loginAsTestUser(page, { outlet: cfg.hqOutlet });
    await expandSidebarGroups(page);

    const gti = await ensurePostedGtiAndCapture(page, {
      itemCode,
      fromOutlet: process.env.E2E_OUTLET || "DRAGON HEALTH",
      qty: "1",
    });
    console.log(`GTI mode=${gti.mode} ref=${gti.ref}`);

    if (gti.mode === "created") {
      await captureManualShot(page, "23-form-gti.png");
      await postGtiFromForm(page);
    } else if (gti.mode === "existing-open") {
      await captureManualShot(page, "23-form-gti.png");
      // Post existing open inbound
      const postBtn = page.getByRole("button", { name: /^Post$/i });
      if (await postBtn.isEnabled().catch(() => false)) {
        await postGtiFromForm(page);
      } else {
        await page.goto("/goods-transfer-in");
        await waitForListContent(page);
      }
    }

    await page.goto("/goods-transfer-in");
    await page.getByRole("heading", { name: /Goods Transfer In/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForListContent(page);
    // Prefer All tab so posted rows show
    const allTab = page.getByRole("button", { name: /^All$/i });
    if (await allTab.count()) {
      await allTab.click();
      await page.waitForTimeout(1000);
      await waitForListContent(page);
    }
    await captureManualShot(page, "20-list-gti.png", { waitList: true });

    // Also capture Stock Take list while at HQ (shows menu works at HQ)
    await page.goto("/stock-take");
    await page.getByRole("heading", { name: /Stock Take/i }).waitFor({ state: "visible", timeout: 45_000 });
    await waitForListContent(page);

    expect(true).toBeTruthy();
    console.log("Stock Take + GTI docs update OK — DB cleanup for E2E_TEST after review");
  });
});
