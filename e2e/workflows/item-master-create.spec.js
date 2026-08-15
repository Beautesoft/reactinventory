import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { E2E_ITEM_SCENARIOS, createItemForScenario } from "../helpers/itemMaster.js";

/**
 * Creates Item Master items for each division × allowed Type:
 * - Retail / Voucher / Prepaid → SINGLE
 * - Salon → SINGLE, PACKAGE
 * - Services → SINGLE, PACKAGE, COURSE
 */
test.describe("UAT — Item Master create per division & type", () => {
  test("create items for all division type combinations", async ({ page }, testInfo) => {
    test.setTimeout(25 * 60_000);

    await loginAsTestUser(page);

    const created = [];
    const expectedCount = E2E_ITEM_SCENARIOS.reduce((n, s) => n + s.types.length, 0);

    for (const scenario of E2E_ITEM_SCENARIOS) {
      for (const stockType of scenario.types) {
        await test.step(`Create ${scenario.division} — ${stockType}`, async () => {
          const result = await createItemForScenario(page, scenario, stockType, testInfo);
          created.push(result);

          await page.goto("/item-master");
          await page.getByRole("heading", { name: /Item Master/i }).waitFor({ state: "visible" });
          const search = page.getByPlaceholder(/Search by Stock Code/i);
          if (await search.count()) {
            await search.fill(result.stockCode);
            await page.waitForTimeout(1500);
          }
          const row = page.locator("table tbody tr").filter({ hasText: result.stockCode }).first();
          await expect(row).toBeVisible({ timeout: 30_000 });
          await expect(row.getByText(stockType, { exact: true })).toBeVisible({ timeout: 10_000 });
        });
      }
    }

    console.log(
      "Created Item Master rows:",
      created.map((c) => `${c.division}/${c.stockType}=${c.stockCode}`).join(", ")
    );
    expect(created.length).toBe(expectedCount);
  });
});
