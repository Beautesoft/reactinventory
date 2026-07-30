/**
 * Stock Take E2E helpers (2-step: select items → enter qty → confirm → Post).
 * With BATCH_NO=No, batch dialog is not required.
 */
import { waitForAppReady, waitForListContent } from "./screenshots.js";

export async function postStockTakeForItem(page, { itemCode, remarks = "E2E_TEST", preferUom = "BOX" }) {
  await page.goto("/stock-take/add");
  await page.getByRole("heading", { name: /Add Stock Take/i }).waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);

  await page.getByPlaceholder("Enter remarks").fill(remarks);

  // Step 1 — search and select one UOM line
  const search = page.getByPlaceholder("Search items...");
  await search.fill("");
  await search.fill(itemCode);
  await page.waitForTimeout(1600);
  await page.getByText("No items Found").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});

  const table = page.locator("table").first();
  await table.waitFor({ state: "visible", timeout: 45_000 });

  let itemRow = table.locator("tbody tr").filter({ hasText: itemCode }).filter({ hasText: preferUom }).first();
  if (!(await itemRow.count())) {
    itemRow = table.locator("tbody tr").filter({ hasText: itemCode }).first();
  }
  await itemRow.waitFor({ state: "visible", timeout: 20_000 });

  // Checkbox is usually first cell
  const checkbox = itemRow.getByRole("checkbox").first();
  await checkbox.check();
  await page.getByRole("button", { name: /^Next$/i }).click();

  // Step 2 — enter counted qty (= on hand → zero variance) and confirm
  await page.getByText(/Step 2:\s*Enter Quantities/i).waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);

  const step2Row = page
    .locator("table")
    .filter({ hasText: /Qty Entry|Current On Hand/i })
    .locator("tbody tr")
    .filter({ hasText: itemCode })
    .first();
  await step2Row.waitFor({ state: "visible", timeout: 30_000 });

  const cells = step2Row.locator("td");
  // Columns: Item Code, Desc, UOM, Qty Entry, On Hand, Difference, Confirm, Remarks, Actions
  const onHandText = ((await cells.nth(4).innerText()) || "0").trim();
  const onHand = Math.max(0, Number(String(onHandText).replace(/,/g, "")) || 0);
  // Match on-hand for zero variance (safe for live stock).
  const counted = onHand;

  // QtyInput uses a text/spinbutton-style input (not always type=number)
  const qtyInput = step2Row.locator("td").nth(3).locator("input").first();
  await qtyInput.waitFor({ state: "visible", timeout: 15_000 });
  await qtyInput.click();
  await qtyInput.fill("");
  await qtyInput.fill(String(counted));
  await qtyInput.blur();
  await page.waitForTimeout(300);

  const confirm = step2Row.getByRole("checkbox").first();
  await confirm.check();

  const remarkInput = step2Row.getByPlaceholder("Remarks");
  if (await remarkInput.count()) await remarkInput.fill(remarks);

  return { counted, onHand };
}

export async function clickStockTakePost(page) {
  await page.getByRole("button", { name: /^Post$/i }).click();
  const success = page.getByText(/Stock Take posted successfully/i).first();
  const error = page.getByText(/Failed|Error|Validation Errors/i).first();
  const outcome = await Promise.race([
    success.waitFor({ state: "visible", timeout: 120_000 }).then(() => "success"),
    error.waitFor({ state: "visible", timeout: 120_000 }).then(() => "error"),
    page
      .waitForURL((url) => url.pathname.includes("/stock-take") && !url.pathname.includes("/add"), {
        timeout: 120_000,
        waitUntil: "commit",
      })
      .then(() => "navigated"),
  ]);
  if (outcome === "error") {
    throw new Error(`Stock Take post failed: ${(await error.innerText().catch(() => "")).trim()}`);
  }
  if (!page.url().includes("/stock-take") || page.url().includes("/add")) {
    await page.waitForURL((url) => /\/stock-take\/?$/.test(url.pathname.replace(/\/$/, "") + "/") || url.pathname.replace(/\/$/, "") === "/stock-take", {
      timeout: 30_000,
      waitUntil: "commit",
    }).catch(() => {});
  }
  await waitForListContent(page);
}
