import { test, expect } from "@playwright/test";
import { loginAsTestUser, expectStillAuthenticated } from "../helpers/auth.js";

/**
 * Smoke: login once, then open every main menu route.
 * Goal: catch blank pages, route crashes, auth redirects.
 * Does NOT create/post documents (that stays in the UAT checklist).
 */
const MENU_ROUTES = [
  { name: "Dashboard", path: "/dashboard", heading: /Welcome back/i },
  { name: "Goods Receive Note", path: "/goods-receive-note", heading: /Goods Receive Note/i },
  { name: "Goods Transfer Out", path: "/goods-transfer-out", heading: /Goods Transfer Out|Verify Records/i },
  { name: "Goods Transfer In", path: "/goods-transfer-in", heading: /Goods Transfer In|Verify Records/i },
  { name: "Goods Return Note", path: "/goods-return-note", heading: /Goods Return Note/i },
  { name: "Stock Adjustment", path: "/stock-adjustment", heading: /Stock Adjustment/i },
  { name: "Stock Usage Memo", path: "/stock-usage-memo", heading: /Stock Usage Memo/i },
  { name: "Stock Balance Live", path: "/stock-balance-live", heading: /Stock Balance/i },
  { name: "Purchase Requisition", path: "/purchase-requisition", heading: /Purchase Requisition/i },
  { name: "Stock Take", path: "/stock-take", heading: /Stock Take/i },
  { name: "Item Master", path: "/item-master", heading: /Item Master/i },
  { name: "Stock Balance Report", path: "/stock-balance", heading: /Stock Balance Report/i },
  { name: "Stock Movement Report", path: "/stock-movement", heading: /Stock Movement/i },
  { name: "Replenishment Report", path: "/replenishment-report", heading: /Replenishment Report/i },
  { name: "Purchase Order", path: "/purchase-order", heading: /Purchase Order/i },
  { name: "Settings", path: "/settings", heading: /User Authorization/i, optional: true },
];

test.describe("Smoke — menus load", () => {
  test("login, open all menus, then logout", async ({ page }) => {
    test.setTimeout(5 * 60_000);

    await loginAsTestUser(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

    const failures = [];

    for (const route of MENU_ROUTES) {
      await test.step(`Open ${route.name}`, async () => {
        await page.goto(route.path);

        try {
          await expectStillAuthenticated(page);
        } catch (err) {
          failures.push(`${route.name}: ${err.message}`);
          return;
        }

        const heading = page.getByRole("heading", { name: route.heading });

        if (route.optional) {
          const visible = await heading.first().isVisible().catch(() => false);
          if (!visible) {
            test.info().annotations.push({
              type: "note",
              description: `${route.name}: heading not found (may be disabled for this user). URL loaded without login redirect.`,
            });
          }
        } else {
          try {
            await expect(heading.first()).toBeVisible({ timeout: 30_000 });
          } catch {
            failures.push(`${route.name}: expected heading ${route.heading} not visible at ${route.path}`);
            return;
          }
        }

        if (!route.optional) {
          const bodyText = await page.locator("body").innerText();
          if (bodyText.length < 20) {
            failures.push(`${route.name}: page body looks empty`);
          }
        }
      });
    }

    expect(failures, failures.join("\n")).toEqual([]);

    // Logout
    await page.goto("/dashboard");
    const logoutControl = page.getByText(/^Logout$/i);
    await logoutControl.first().click();
    await page.waitForURL(/\/login/, { timeout: 20_000 });
    await expect(page.getByLabel("Username")).toBeVisible();
  });
});
