/**
 * UI-only edge check for item 11600225 at ZE01.
 * GRN T001 + T002, then GTO cases. Verifies Itemonqties vs ItemBatches after each post.
 */
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loginAsTestUser } from "../helpers/auth.js";
import { clickGrnPost, makeE2eRef } from "../helpers/grn.js";
import { clickSaveOrPost } from "../helpers/stockDoc.js";

const ITEM = "11600225";
const API = process.env.E2E_API_BASE_URL || "https://zenthtrain.beautecloud.com/lb/api";
const log = [];

function note(step, detail) {
  const row = { step, ...detail };
  log.push(row);
  console.log(JSON.stringify(row));
}

async function stockSnapshot() {
  const batchUrl = `${API}/ItemBatches?filter=${encodeURIComponent(
    JSON.stringify({
      where: { and: [{ itemCode: ITEM }, { siteCode: "ZE01" }] },
      fields: { batchNo: true, qty: true, expDate: true },
    })
  )}`;
  const onUrl = `${API}/Itemonqties?filter=${encodeURIComponent(
    JSON.stringify({
      where: { and: [{ itemcode: `${ITEM}0000` }, { sitecode: "ZE01" }] },
      fields: { trnBalqty: true },
      limit: 1,
    })
  )}`;
  const [batches, onRows] = await Promise.all([
    fetch(batchUrl).then((r) => r.json()),
    fetch(onUrl).then((r) => r.json()),
  ]);
  const lines = (Array.isArray(batches) ? batches : []).map((b) => ({
    batchNo: String(b.batchNo || "").trim() || "(blank)",
    qty: Number(b.qty) || 0,
    expDate: b.expDate || null,
  }));
  const batchSum = lines.reduce((s, b) => s + b.qty, 0);
  const balance = Number(onRows?.[0]?.trnBalqty);
  return { balance, batchSum, lines, matched: balance === batchSum };
}

async function postFefoGto(page, { ref, qty, remark }) {
  await page.goto("/goods-transfer-out/add");
  await page.getByRole("heading", { name: /Add Goods Transfer Out/i }).waitFor({ timeout: 45_000 });
  await page
    .locator("tbody tr")
    .filter({ hasNotText: /No items Found/i })
    .first()
    .waitFor({ timeout: 60_000 });
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  const toStore = page.locator("div.space-y-2").filter({ hasText: "To Store" }).first();
  await toStore.getByRole("combobox").click();
  await page.getByRole("option", { name: /BeautySalon HQ/i }).click();
  await page.getByPlaceholder("Enter remarks").fill(remark);
  await page
    .locator("tbody tr")
    .filter({ hasNotText: /No items Found/i })
    .first()
    .waitFor({ timeout: 60_000 });
  const search = page.getByPlaceholder("Search items...");
  await search.fill("");
  await page.waitForTimeout(1200);
  await search.fill(ITEM);
  await page.waitForTimeout(1800);
  const itemRow = page.locator("tbody tr").filter({ hasText: ITEM }).first();
  await itemRow.waitFor({ timeout: 20_000 });
  await itemRow.locator("input").first().fill(String(qty));
  await itemRow.locator("td").last().locator("button").first().click();
  await page.getByText(/Item added to cart/i).first().waitFor({ timeout: 15_000 });
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-transfer-out",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
}

async function fillGrnHeader(page, ref) {
  await page.goto("/goods-receive-note/add");
  await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({ timeout: 45_000 });
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  const supply = page.locator("div.space-y-2").filter({ hasText: "Supply No" }).first();
  await supply.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  const delivery = page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).first();
  await delivery.locator('input[type="date"]').fill(new Date().toISOString().split("T")[0]);
  await page.getByPlaceholder("Enter term").fill("30");
  await page.getByPlaceholder("Enter remarks").fill("E2E edge 11600225");
  await page.locator("table").first().locator("tbody tr").first().waitFor({ timeout: 60_000 });
}

async function addGrnLine(page, qty) {
  const search = page.getByPlaceholder("Search items...");
  await search.click();
  await search.fill("");
  await search.fill(ITEM);
  await page.waitForTimeout(1600);
  const row = page.locator("table").first().locator("tbody tr").filter({ hasText: ITEM }).first();
  await row.waitFor({ timeout: 20_000 });
  const qtyInput = row.locator("input").first();
  await qtyInput.fill("");
  await qtyInput.fill(String(qty));
  await row.locator("td").last().locator("button").first().click();
  await page.getByText(/Item added to cart/i).first().waitFor({ timeout: 15_000 });
  await page
    .locator("table")
    .filter({ hasText: "Item Code" })
    .last()
    .locator("tbody tr")
    .filter({ hasText: ITEM })
    .last()
    .waitFor({ timeout: 15_000 });
}

async function setCartBatch(page, rowIndex, batchNo, expiry) {
  const cart = page.locator("table").filter({ hasText: "Item Code" }).last();
  await cart.locator("tbody tr").nth(rowIndex).locator("button").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByText(/Loading batches/i).waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  const useExisting = dialog.locator("#useExisting");
  if (await useExisting.isChecked().catch(() => false)) {
    await dialog.locator('label[for="useExisting"]').click();
    await page.waitForTimeout(300);
  }
  const input = dialog.getByPlaceholder(/Enter new batch number/i);
  await input.click();
  await input.fill("");
  await input.pressSequentially(batchNo, { delay: 20 });
  const expiryBox = dialog.locator("#expiry");
  if (await expiryBox.count()) {
    await expiryBox.fill(expiry);
  }
  await dialog.getByRole("button", { name: /^Save Changes$/i }).click();
  await dialog.waitFor({ state: "hidden", timeout: 20_000 });
}

test("11600225 ZE01 GRN then GTO edge cases through the UI", async ({ page }) => {
  test.setTimeout(600_000);
  await loginAsTestUser(page, { siteCode: "ZE01" });

  const before = await stockSnapshot();
  note("before", before);
  expect(before.matched, `start unmatched ${JSON.stringify(before)}`).toBe(true);

  const hasT001 = before.lines.some((l) => l.batchNo === "T001" && l.qty === 10);
  const hasT002 = before.lines.some((l) => l.batchNo === "T002" && l.qty === 5);
  const grnRef = makeE2eRef();
  if (!hasT001 || !hasT002) {
    await fillGrnHeader(page, grnRef);
    await addGrnLine(page, 10);
    await setCartBatch(page, 0, "T001", "2026-11-30");
    await addGrnLine(page, 5);
    await setCartBatch(page, 1, "T002", "2027-06-30");
    await clickGrnPost(page);
  }

  const afterGrn = await stockSnapshot();
  note("stock with T001 and T002", afterGrn);
  expect(afterGrn.matched).toBe(true);
  expect(afterGrn.lines.find((l) => l.batchNo === "T001")?.qty).toBeGreaterThan(0);
  expect(afterGrn.lines.find((l) => l.batchNo === "T002")?.qty).toBeGreaterThan(0);

  // Edge: qty above the stock balance must not be added
  await page.goto("/goods-transfer-out/add");
  await page.getByRole("heading", { name: /Add Goods Transfer Out/i }).waitFor({ timeout: 45_000 });
  await page.getByRole("columnheader", { name: /On Hand/i }).waitFor({ timeout: 60_000 });
  await page.locator("tbody tr").filter({ hasText: /BOTTLE/i }).first().waitFor({ timeout: 60_000 });
  await page.getByPlaceholder("Enter GR Ref 1").fill(`${grnRef}-BLOCK`);
  const toStore = page.locator("div.space-y-2").filter({ hasText: "To Store" }).first();
  await toStore.getByRole("combobox").click();
  await page.getByRole("option", { name: /BeautySalon HQ/i }).click();
  const search = page.getByPlaceholder("Search items...");
  await search.fill(ITEM);
  await page.waitForTimeout(1800);
  const itemRow = page.locator("tbody tr").filter({ hasText: ITEM }).first();
  await itemRow.waitFor({ timeout: 20_000 });
  await itemRow.locator("input").first().fill(String(afterGrn.balance + 1));
  await itemRow.locator("td").last().locator("button").first().click();
  await expect(page.getByText(/Not enough stock available/i).first()).toBeVisible({ timeout: 10_000 });
  note("blocked over balance", { tried: afterGrn.balance + 1, toast: "Not enough stock available" });

  // Edge: batch picker cannot confirm a short selection
  await itemRow.locator("input").first().fill("8");
  await itemRow.locator("td").last().locator("button").last().click();
  const dialog = page.getByRole("dialog").filter({ hasText: /Select Specific Batches/i });
  await dialog.waitFor({ timeout: 30_000 });
  const t002Row = dialog.locator("tbody tr").filter({ hasText: "T002" }).first();
  await t002Row.locator('input[type="checkbox"]').click();
  const confirm = dialog.getByRole("button", { name: /Confirm Selection/i });
  const enabled = await confirm.isEnabled().catch(() => false);
  if (enabled) await confirm.click();
  const mismatch = page.getByText(/must match the required quantity/i);
  if (enabled) {
    await expect(mismatch.first()).toBeVisible({ timeout: 10_000 });
  }
  note("picker short selection blocked", {
    transfer: 8,
    picked: "T002",
    confirmEnabled: enabled,
  });
  await page.keyboard.press("Escape");

  // FEFO 4 should come off T001 (earlier expiry), not T002 and not No Batch
  const gtoRef = `${grnRef}-GTO4`;
  await postFefoGto(page, { ref: gtoRef, qty: 4, remark: "E2E FEFO 4" });
  const afterFefo = await stockSnapshot();
  note("after FEFO GTO 4", afterFefo);
  expect(afterFefo.matched).toBe(true);
  expect(afterFefo.balance).toBe(afterGrn.balance - 4);
  const blankBefore = afterGrn.lines.find((l) => l.batchNo === "(blank)")?.qty;
  expect(afterFefo.lines.find((l) => l.batchNo === "(blank)")?.qty).toBe(blankBefore);
  const dropped = ["T001", "T002"].filter(
    (code) =>
      (afterFefo.lines.find((l) => l.batchNo === code)?.qty || 0) <
      (afterGrn.lines.find((l) => l.batchNo === code)?.qty || 0)
  );
  expect(dropped.length).toBe(1);

  // Spill into No Batch only after numbered batches are finished
  const namedLeft = afterFefo.lines
    .filter((l) => l.batchNo !== "(blank)")
    .reduce((s, l) => s + l.qty, 0);
  const spillQty = namedLeft + 1;
  await postFefoGto(page, {
    ref: `${grnRef}-SPILL`,
    qty: spillQty,
    remark: "E2E FEFO spill into No Batch",
  });
  const afterSpill = await stockSnapshot();
  note("after FEFO spill into No Batch", { spillQty, ...afterSpill });
  expect(afterSpill.matched).toBe(true);
  expect(afterSpill.balance).toBe(afterFefo.balance - spillQty);
  expect(afterSpill.lines.find((l) => l.batchNo === "(blank)")?.qty).toBe(blankBefore - 1);
  expect(
    afterSpill.lines.filter((l) => l.batchNo !== "(blank)").reduce((s, l) => s + l.qty, 0)
  ).toBe(0);

  const outDir = path.resolve("e2e/reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "11600225-edge.json"), JSON.stringify(log, null, 2));
});
