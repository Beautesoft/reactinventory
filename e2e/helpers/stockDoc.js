/**
 * Shared helpers for stock documents (GRN-like forms) used by workflows / docs capture.
 */
import { resolveBatchNo } from "./grn.js";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function makeE2eRef() {
  return `E2E-${Date.now()}`;
}

export function getWorkflowEnv() {
  const itemCode = String(process.env.E2E_ITEM_CODE || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
  if (!itemCode) {
    throw new Error("Set E2E_ITEM_CODE in e2e/.env");
  }
  return {
    itemCode,
    supplier: String(process.env.E2E_SUPPLIER || "").trim().replace(/^['"]+|['"]+$/g, ""),
    qty: String(process.env.E2E_ITEM_QTY || "1").trim(),
    price: String(process.env.E2E_ITEM_PRICE || "1").trim(),
    term: String(process.env.E2E_TERM || "30").trim(),
    batchNo: resolveBatchNo(process.env.E2E_BATCH_NO),
    toOutlet: String(process.env.E2E_TO_OUTLET || "").trim().replace(/^['"]+|['"]+$/g, ""),
    hqOutlet: String(process.env.E2E_HQ_OUTLET || process.env.E2E_TO_OUTLET || "").trim().replace(/^['"]+|['"]+$/g, ""),
  };
}

export async function selectComboboxByLabel(page, sectionLabel, optionText) {
  const section = page.locator("div.space-y-2").filter({ hasText: sectionLabel }).first();
  await section.getByRole("combobox").click();
  if (optionText) {
    await page.getByRole("option").filter({ hasText: optionText }).first().click();
  } else {
    await page.getByRole("option").first().click();
  }
}

export async function waitForStockRows(page) {
  const itemsTable = page.locator("table").first();
  await itemsTable.waitFor({ state: "visible", timeout: 45_000 });
  await page.getByText("No items Found").waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
  await itemsTable
    .locator("tbody tr")
    .filter({ hasNotText: /No items Found/i })
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  return itemsTable;
}

export async function resolveItemCode(page, preferredCode) {
  const searchBox = page.getByPlaceholder("Search items...");
  await searchBox.fill("");
  const applyBtn = page.getByRole("button", { name: /^Apply Filters$/i });
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click();
    await page.waitForTimeout(2000);
  }

  if (preferredCode) {
    await searchBox.fill("");
    await searchBox.fill(preferredCode);
    await page.waitForTimeout(1600);
    const preferredRow = page
      .locator("table")
      .first()
      .locator("tbody tr")
      .filter({ hasText: preferredCode })
      .first();
    if (await preferredRow.isVisible().catch(() => false)) {
      return preferredCode;
    }
  }

  await searchBox.fill("");
  await page.waitForTimeout(2000);
  const itemsTable = await waitForStockRows(page);
  const firstRow = itemsTable.locator("tbody tr").filter({ hasNotText: /No items Found/i }).first();
  const code = (await firstRow.locator("td").first().innerText()).trim();
  if (!code) {
    throw new Error("No items available for E2E posting at this outlet. Set E2E_ITEM_CODE in e2e/.env.");
  }
  if (preferredCode && code !== preferredCode) {
    console.log(`E2E item fallback: ${preferredCode} not found, using ${code}`);
  }
  return code;
}

/**
 * Read item row from stock document item picker.
 * Columns: Item Code, Description, UOM, Brand, Link Code, Bar Code, Range, On Hand Qty, Qty, Price, Action
 */
export async function getItemStockSnapshot(page, itemCode) {
  const searchBox = page.getByPlaceholder("Search items...");
  await searchBox.waitFor({ state: "visible", timeout: 45_000 });
  await searchBox.fill("");
  await searchBox.fill(itemCode);
  await page.waitForTimeout(1600);

  const itemsTable = page.locator("table").first();
  const itemRow = itemsTable.locator("tbody tr").filter({ hasText: itemCode }).first();
  await itemRow.waitFor({ state: "visible", timeout: 20_000 });

  const cells = itemRow.locator("td");
  const description = ((await cells.nth(1).innerText()) || "").trim();
  const uom = ((await cells.nth(2).innerText()) || "").trim();
  const onHandText = ((await cells.nth(7).innerText()) || "0").trim();
  const onHand = Math.max(0, Number(String(onHandText).replace(/,/g, "")) || 0);

  return { itemCode, description, uom, onHand };
}

/** Read Bal Qty from Stock Balance Live for the current site. */
export async function readStockBalanceQty(page, itemCode) {
  await page.goto("/stock-balance-live");
  await page.getByRole("heading", { name: /Stock Balance/i }).waitFor({ state: "visible", timeout: 45_000 });
  await page.getByPlaceholder(/Search by Stock Code/i).fill(itemCode);
  await page.waitForTimeout(2500);

  const row = page.locator("table tbody tr").filter({ hasText: itemCode }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  const cells = row.locator("td");
  const balText = ((await cells.nth(6).innerText()) || "0").trim();
  return Math.max(0, Number(String(balText).replace(/,/g, "")) || 0);
}

/**
 * GRN qty needed so ADJ (+1) then three outbound (-1 each) can succeed.
 * Returns 0 when opening on-hand is already sufficient (skip GRN).
 */
export function computeGrnReceiveQty(openingOnHand, { outboundTotal = 3, adjAdd = 1 } = {}) {
  const stockAfterAdj = openingOnHand + adjAdd;
  const shortfall = outboundTotal - stockAfterAdj;
  return Math.max(0, shortfall);
}

export function formatStockNote({ phase, outlet, snapshot, extra = "" }) {
  const base = `[${phase}] outlet=${outlet || "?"}, item=${snapshot.itemCode}, onHand=${snapshot.onHand} ${snapshot.uom || ""}, desc=${snapshot.description || ""}`;
  return extra ? `${base}, ${extra}` : base;
}

export async function searchAndAddItem(page, { itemCode, qty, price }) {
  const searchBox = page.getByPlaceholder("Search items...");
  await searchBox.fill("");
  await searchBox.fill(itemCode);
  await page.waitForTimeout(1600);

  const itemsTable = page.locator("table").first();
  const itemRow = itemsTable.locator("tbody tr").filter({ hasText: itemCode }).first();
  await itemRow.waitFor({ state: "visible", timeout: 20_000 });

  const qtyInput = itemRow.locator("input").first();
  await qtyInput.fill("");
  await qtyInput.fill(String(qty));

  const inputs = itemRow.locator("input");
  if ((await inputs.count()) >= 2 && price) {
    const priceInput = inputs.nth(1);
    if ((await priceInput.getAttribute("type")) !== "date") {
      await priceInput.fill(String(price));
    }
  }

  await itemRow.locator("button").last().click();
  await page.getByText(/Item added to cart|added to cart/i).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  await page.getByText("Selected Items").waitFor({ state: "visible", timeout: 10_000 });
}

/** New batch (inbound / receive / +ADJ) */
export async function ensureNewBatchOnCart(page, batchNo) {
  const warning = page.getByText(/need batch numbers/i);
  if (!(await warning.isVisible().catch(() => false))) return;

  const cartTable = page.locator("table").filter({ hasText: "Item Code" }).last();
  await cartTable.locator("tbody tr").first().locator("button").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await dialog.getByText(/Loading batches/i).waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});

  const useExisting = dialog.locator("#useExisting");
  if (await useExisting.isChecked().catch(() => false)) {
    await dialog.locator('label[for="useExisting"]').click();
    await page.waitForTimeout(300);
  }

  const newBatch = dialog.getByPlaceholder(/Enter new batch number/i);
  await newBatch.waitFor({ state: "visible", timeout: 10_000 });
  await newBatch.click();
  await newBatch.fill("");
  await newBatch.pressSequentially(String(batchNo).slice(0, 10), { delay: 15 });

  await dialog.getByRole("button", { name: /^Save Changes$/i }).click();
  await dialog.waitFor({ state: "hidden", timeout: 20_000 });
}

/** Existing batch (outbound / return / usage) */
export async function ensureExistingBatchOnCart(page) {
  const warning = page.getByText(/need batch numbers/i);
  if (!(await warning.isVisible().catch(() => false))) return;

  const cartTable = page.locator("table").filter({ hasText: "Item Code" }).last();
  await cartTable.locator("tbody tr").first().locator("button").first().click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await dialog.getByText(/Loading batches/i).waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});

  const useExisting = dialog.locator("#useExisting");
  if (!(await useExisting.isChecked().catch(() => true))) {
    await dialog.locator('label[for="useExisting"]').click();
    await page.waitForTimeout(300);
  }

  const batchTrigger = dialog.getByRole("combobox").filter({ hasText: /Select existing batch|Select/i }).or(
    dialog.locator('[role="combobox"]').first()
  );
  await batchTrigger.click();
  const opt = page.getByRole("option").first();
  await opt.waitFor({ state: "visible", timeout: 15_000 });
  await opt.click();

  await dialog.getByRole("button", { name: /^Save Changes$/i }).click();
  await dialog.waitFor({ state: "hidden", timeout: 20_000 });
}

export async function clickSaveOrPost(page, action, { listPath, successRe, errorRe }) {
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
  const btn = page.getByRole("button", { name: action === "post" ? /^Post$/i : /^Save$/i });
  await btn.click();

  const successToast = page.getByText(successRe).first();
  const errorToast = page.getByText(errorRe).first();
  const validation = page.getByRole("alertdialog").filter({ hasText: /Validation Errors/i });

  const outcome = await Promise.race([
    successToast.waitFor({ state: "visible", timeout: 90_000 }).then(() => "success"),
    errorToast.waitFor({ state: "visible", timeout: 90_000 }).then(() => "error"),
    validation.waitFor({ state: "visible", timeout: 90_000 }).then(() => "validation"),
    page
      .waitForURL((url) => url.pathname.replace(/\/$/, "") === listPath.replace(/\/$/, ""), {
        timeout: 90_000,
        waitUntil: "commit",
      })
      .then(() => "navigated"),
  ]);

  if (outcome === "error") {
    throw new Error(`${action} failed: ${(await errorToast.innerText().catch(() => "")).trim()}`);
  }
  if (outcome === "validation") {
    throw new Error(`${action} validation: ${(await validation.innerText().catch(() => "")).trim()}`);
  }

  if (!page.url().includes(listPath) || page.url().includes("/add")) {
    await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === listPath.replace(/\/$/, ""), {
      timeout: 30_000,
      waitUntil: "commit",
    });
  }
}

export { todayISO };
