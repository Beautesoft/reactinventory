import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";

test("stock balance report shows item code and batch lines", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsTestUser(page, { siteCode: "ZE01" });
  await page.goto("/stock-balance");
  await page.getByRole("heading", { name: /Stock Balance Report/i }).waitFor({ state: "visible" });

  await page.getByLabel("Show Batch Details").click();
  await page.getByPlaceholder("Select sites...").click();
  await page.getByRole("option", { name: /Kota Damansara/i }).click();
  await page.getByRole("heading", { name: /Stock Balance Report/i }).click({ force: true });
  await page.getByRole("option").first().waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});

  await page.getByRole("button", { name: /^Generate Report$/i }).click();
  await expect(page.getByRole("columnheader", { name: "Item Code" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("11600003", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/NCT1\s+31\/03\/2028/)).toBeVisible();
  await expect(page.getByText(/NCT2\s+31\/08\/2028/)).toBeVisible();

  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 794, height: 1400 });
  const fit = await page.evaluate(() => {
    const table = document.querySelector("#printable-content table.print-table");
    const headers = [...table.querySelectorAll("th")].map((th) => th.innerText.replace(/\s+/g, " ").trim());
    const last = table.querySelector("th:last-child").getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();
    const dateCell = [...table.querySelectorAll("td")].find((td) => td.textContent.includes("31/03/2028"));
    return {
      headers,
      overflow: table.scrollWidth - table.clientWidth,
      lastInside: last.right <= tableBox.right + 1,
      dateText: dateCell ? dateCell.textContent.replace(/\s+/g, " ").trim() : "",
      dateNowrap: dateCell ? getComputedStyle(dateCell).whiteSpace : "",
    };
  });
  expect(fit.overflow).toBeLessThanOrEqual(1);
  expect(fit.lastInside).toBe(true);
  expect(fit.headers[fit.headers.length - 1]).toBe("Amount");
  expect(fit.headers).toContain("Price");
  expect(fit.dateText).toContain("NCT1 31/03/2028");
  expect(fit.dateNowrap).toBe("nowrap");
  await page.screenshot({ path: "tmp-sbr-print.png", fullPage: true });
});
