/**
 * UI GTI: bring T001 and T002 from HQ back to ZE01, then compare balance and batches.
 */
import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { clickSaveOrPost } from "../helpers/stockDoc.js";

const ITEM = "11600225";
const API = process.env.E2E_API_BASE_URL || "https://zenthtrain.beautecloud.com/lb/api";

async function snapshot(site) {
  const batches = await fetch(
    `${API}/ItemBatches?filter=${encodeURIComponent(
      JSON.stringify({
        where: { and: [{ itemCode: ITEM }, { siteCode: site }] },
        fields: { batchNo: true, qty: true },
      })
    )}`
  ).then((r) => r.json());
  const on = await fetch(
    `${API}/Itemonqties?filter=${encodeURIComponent(
      JSON.stringify({
        where: { and: [{ itemcode: `${ITEM}0000` }, { sitecode: site }] },
        fields: { trnBalqty: true },
        limit: 1,
      })
    )}`
  ).then((r) => r.json());
  const lines = (Array.isArray(batches) ? batches : []).map((b) => ({
    batchNo: String(b.batchNo || "").trim() || "(blank)",
    qty: Number(b.qty) || 0,
  }));
  const batchSum = lines.reduce((s, b) => s + b.qty, 0);
  const balance = Number(on?.[0]?.trnBalqty);
  return { site, balance, batchSum, matched: balance === batchSum, lines };
}

async function pickNamedBatches(page, dialog, wanted) {
  for (const [batchNo, qty] of Object.entries(wanted)) {
    const row = dialog.locator("tbody tr").filter({ hasText: batchNo }).first();
    await row.waitFor({ timeout: 20_000 });
    const cb = row.locator('input[type="checkbox"]');
    if (!(await cb.isChecked().catch(() => false))) await cb.click();
    const box = row.locator('input:not([type="checkbox"])').first();
    await box.waitFor({ timeout: 5_000 });
    await box.click();
    await box.fill(String(qty));
    await box.blur();
  }
  const confirm = dialog.getByRole("button", { name: /Confirm Selection/i });
  await expect(confirm).toBeEnabled({ timeout: 8_000 });
  await confirm.click();
  await dialog.waitFor({ state: "hidden", timeout: 20_000 });
}

test("GTI T001 and T002 from HQ into ZE01", async ({ page }) => {
  test.setTimeout(300_000);
  const before = { ze01: await snapshot("ZE01"), zehq: await snapshot("ZEHQ") };
  console.log(JSON.stringify({ step: "before", ...before }));
  expect(before.ze01.matched).toBe(true);
  expect(before.zehq.matched).toBe(true);

  await loginAsTestUser(page, { siteCode: "ZE01" });
  await page.goto("/goods-transfer-in/add");
  await page.getByRole("heading", { name: /Add Goods Transfer In/i }).waitFor({ timeout: 45_000 });
  const fromStore = page.locator("div.space-y-2").filter({ hasText: "From Store" }).first().getByRole("combobox");
  await fromStore.click();
  await page.getByRole("option", { name: "BeautySalon HQ - Demo" }).click();
  await expect(fromStore).toContainText("HQ", { timeout: 15_000 });
  await page.getByPlaceholder("Search items...").waitFor({ timeout: 45_000 });
  await page.getByText(/Showing items from:.*HQ/i).waitFor({ timeout: 20_000 });
  await page
    .locator("tbody tr")
    .filter({ hasNotText: /No items Found/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await page.getByPlaceholder("Enter GR Ref 1").fill(`E2E-GTI-${Date.now()}`);
  await page.getByPlaceholder("Enter remarks").fill("E2E GTI T001 T002");

  const itemRow = page.locator("tbody tr").filter({ hasText: ITEM }).first();
  const nextPage = page.locator("button.ml-2").last();
  for (let i = 0; i < 60 && !(await itemRow.isVisible().catch(() => false)); i++) {
    await nextPage.click();
    await page.waitForTimeout(200);
  }
  await itemRow.waitFor({ timeout: 5_000 });
  await itemRow.locator("input").first().fill("15");
  await itemRow.locator("td").last().locator("button").last().click();

  const dialog = page.getByRole("dialog").filter({ hasText: /Select Specific Batches/i });
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.getByText(/Loading batches/i).waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  await pickNamedBatches(page, dialog, { T001: 10, T002: 5 });

  await itemRow.locator("td").last().locator("button").first().click();
  await page.getByText(/added to cart/i).first().waitFor({ timeout: 15_000 });
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-transfer-in",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });

  const after = { ze01: await snapshot("ZE01"), zehq: await snapshot("ZEHQ") };
  console.log(JSON.stringify({ step: "after GTI 15", ...after }));

  expect(after.ze01.matched).toBe(true);
  expect(after.zehq.matched).toBe(true);
  expect(after.ze01.balance).toBe(before.ze01.balance + 15);
  expect(after.zehq.balance).toBe(before.zehq.balance - 15);
  expect(after.ze01.lines.find((l) => l.batchNo === "T001")?.qty).toBe(10);
  expect(after.ze01.lines.find((l) => l.batchNo === "T002")?.qty).toBe(5);
  expect(after.zehq.lines.find((l) => l.batchNo === "T001")?.qty).toBe(0);
  expect(after.zehq.lines.find((l) => l.batchNo === "T002")?.qty).toBe(0);
});
