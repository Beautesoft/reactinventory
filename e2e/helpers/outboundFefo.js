import { waitForAppReady, waitForListContent } from "./screenshots.js";
import {
  searchAndAddItemFefo,
  searchAndAddItem,
  searchAndAddItemSpecific,
  clickSaveOrPost,
  selectComboboxByLabel,
  prepareOutboundCartBatch,
} from "./stockDoc.js";

async function addOutboundLine(page, { itemCode, qty, price, mode = "fefo" }) {
  if (mode === "specific") {
    await searchAndAddItemSpecific(page, { itemCode, qty, price });
    return;
  }
  await searchAndAddItemFefo(page, { itemCode, qty, price });
  try {
    await prepareOutboundCartBatch(page);
  } catch {
    await searchAndAddItem(page, { itemCode, qty, price });
    await prepareOutboundCartBatch(page);
  }
}

export async function findPostedDocNoByRef(page, listPath, ref) {
  await page.goto(listPath);
  await waitForListContent(page);
  const search = page.getByPlaceholder(/Search by Doc no|Search by PR no/i);
  if (await search.count()) {
    await search.fill(ref);
    await page.waitForTimeout(2000);
  }
  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  const docCell = (await row.locator("td").first().innerText()).trim();
  if (!docCell) {
    throw new Error(`Could not read doc no from list row for ref ${ref}`);
  }
  return docCell.split(/\s/)[0];
}

/** Stock usage memo — FEFO post */
export async function postSumFefo(page, opts) {
  return postSum(page, { ...opts, mode: "fefo" });
}

/** Stock usage memo — mode: fefo | specific */
export async function postSum(page, { itemCode, ref, remark, mode = "fefo", qty = "1" }) {
  await page.goto("/stock-usage-memo/add");
  await page
    .getByRole("heading", { name: /Add Stock Usage Memo|Stock Usage/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter Ref 1").fill(ref);
  await page.getByPlaceholder("Enter remark").fill(remark || `E2E_TEST ${mode}`);
  await addOutboundLine(page, { itemCode, qty, mode });
  await clickSaveOrPost(page, "post", {
    listPath: "/stock-usage-memo",
    successRe: /Posted successfully|Stock Usage Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/stock-usage-memo", ref);
}

/** GTO — FEFO post */
export async function postGtoFefo(page, opts) {
  return postGto(page, { ...opts, mode: "fefo" });
}

/** GTO — mode: fefo | specific */
export async function postGto(page, { itemCode, ref, toOutlet, remark, mode = "fefo", qty = "1" }) {
  await page.goto("/goods-transfer-out/add");
  await page
    .getByRole("heading", { name: /Add Goods Transfer Out/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  await selectComboboxByLabel(page, "To Store", toOutlet);
  await page.getByPlaceholder("Enter remarks").fill(remark || `E2E_TEST ${mode}`);
  await page.waitForTimeout(800);
  await addOutboundLine(page, { itemCode, qty, mode });
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-transfer-out",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/goods-transfer-out", ref);
}

/** RTN — FEFO post */
export async function postRtnFefo(page, opts) {
  return postRtn(page, { ...opts, mode: "fefo" });
}

/** RTN — mode: fefo | specific */
export async function postRtn(page, { itemCode, ref, supplier, remark, mode = "fefo", qty = "1" }) {
  await page.goto("/goods-return-note/add");
  await page
    .getByRole("heading", { name: /Add Goods Return Note/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter RTN Ref 1").fill(ref);
  if (supplier) {
    await selectComboboxByLabel(page, "Supply No", supplier);
  }
  const delivery = page
    .locator("div.space-y-2")
    .filter({ hasText: "Delivery Date" })
    .locator('input[type="date"]');
  if (await delivery.count()) {
    await delivery.fill(new Date().toISOString().split("T")[0]);
  }
  await page.getByPlaceholder("Enter remarks").fill(remark || `E2E_TEST ${mode}`);
  await addOutboundLine(page, { itemCode, qty, mode });
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-return-note",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/goods-return-note", ref);
}

/** ADJ — positive qty FEFO post */
export async function postAdjFefo(page, opts) {
  return postAdj(page, { ...opts, mode: "fefo" });
}

/** ADJ — mode: fefo | specific */
export async function postAdj(page, { itemCode, ref, remark, mode = "fefo", qty = "1" }) {
  await page.goto("/stock-adjustment/add");
  await page
    .getByRole("heading", { name: /Add Stock Adjustment/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter Ref 1").fill(ref);
  await page.getByPlaceholder("Enter remark").fill(remark || `E2E_TEST ${mode}`);
  await addOutboundLine(page, { itemCode, qty, mode });
  await clickSaveOrPost(page, "post", {
    listPath: "/stock-adjustment",
    successRe: /Posted successfully|Stock Adjustment posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/stock-adjustment", ref);
}

/** GTI — inbound FEFO post (manual path) */
/**
 * Manual GTI with FEFO line. At an outlet, set From Store to HQ (or another source).
 * HQ users must also pick To Store (any outlet ≠ source); outlet users receive into login site.
 */
export async function postGtiFefo(page, opts) {
  return postGti(page, { ...opts, mode: "fefo" });
}

/** Manual GTI — mode: fefo | specific */
export async function postGti(page, { itemCode, ref, fromOutlet, toOutlet, remark, mode = "fefo", qty = "1" }) {
  const fromStore =
    String(
      fromOutlet ||
        process.env.E2E_HQ_OUTLET ||
        process.env.E2E_TO_OUTLET ||
        ""
    )
      .trim()
      .replace(/^['"]+|['"]+$/g, "");

  await page.goto("/goods-transfer-in/add");
  await page
    .getByRole("heading", { name: /Add Goods Transfer In/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  await selectComboboxByLabel(page, "From Store", fromStore);

  const siteCode = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("userDetails") || "{}").siteCode || "";
    } catch {
      return "";
    }
  });
  if (siteCode === "ZEHQ") {
    const toStore = String(toOutlet || process.env.E2E_OUTLET || "")
      .trim()
      .replace(/^['"]+|['"]+$/g, "");
    const toCombo = page
      .locator("div.space-y-2")
      .filter({ hasText: "To Store" })
      .first()
      .getByRole("combobox");
    const toLabel = ((await toCombo.innerText().catch(() => "")) || "").trim();
    if (/select to store/i.test(toLabel)) {
      if (toStore) {
        await selectComboboxByLabel(page, "To Store", toStore);
      } else {
        await toCombo.click();
        await page.getByRole("option").first().click();
      }
    }
  }

  await page
    .getByPlaceholder("Search items...")
    .waitFor({ state: "visible", timeout: 45_000 });
  await page.getByText(/Showing items from:/i).waitFor({ state: "visible", timeout: 15_000 });
  await page.getByPlaceholder("Enter remarks").fill(remark || `E2E_TEST ${mode}`);
  await page.waitForTimeout(800);
  await addOutboundLine(page, { itemCode, qty, mode });
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-transfer-in",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/goods-transfer-in", ref);
}
