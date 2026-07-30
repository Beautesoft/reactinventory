/**
 * GRN form helpers for workflow / docs capture tests.
 * Creates documents tagged with GR Ref 1 = E2E-... for easier DB cleanup.
 */

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function stripQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
}

export function requireGrnEnv() {
  const itemCode = stripQuotes(process.env.E2E_ITEM_CODE);
  if (!itemCode) {
    throw new Error(
      "Set E2E_ITEM_CODE in e2e/.env to an item that can be received at this outlet."
    );
  }
  return {
    itemCode,
    supplier: stripQuotes(process.env.E2E_SUPPLIER),
    qty: stripQuotes(process.env.E2E_ITEM_QTY) || "1",
    price: stripQuotes(process.env.E2E_ITEM_PRICE) || "1",
    term: stripQuotes(process.env.E2E_TERM) || "30",
    batchNo:
      stripQuotes(process.env.E2E_BATCH_NO) ||
      shortBatchNo(),
  };
}

/** Batch No UI/DB is short — keep <= 10 chars (input maxLength is 20). */
const BATCH_MAX_LEN = 10;

function shortBatchNo() {
  // e.g. E2E8392 (7 chars) — unique enough per run
  return `E2E${Date.now().toString().slice(-4)}`.slice(0, BATCH_MAX_LEN);
}

/** Prefer unique short batch when env is empty or the shared default */
export function resolveBatchNo(configured) {
  const value = stripQuotes(configured);
  if (!value || value === "E2EBATCH001" || value === "E2E01") {
    return shortBatchNo();
  }
  return value.slice(0, BATCH_MAX_LEN);
}

export function makeE2eRef() {
  return `E2E-${Date.now()}`;
}

async function selectComboboxOption(page, sectionLabel, optionText) {
  const section = page.locator("div.space-y-2").filter({ hasText: sectionLabel }).first();
  await section.getByRole("combobox").click();
  if (optionText) {
    const opt = page.getByRole("option").filter({ hasText: optionText }).first();
    await opt.waitFor({ state: "visible", timeout: 15_000 });
    await opt.click();
  } else {
    const first = page.getByRole("option").first();
    await first.waitFor({ state: "visible", timeout: 15_000 });
    await first.click();
  }
}

/**
 * Fill GRN header + add one line. Leaves you on the add form with cart populated.
 */
export async function fillNewGrnForm(page, { itemCode, supplier, qty, price, term, batchNo, ref }) {
  await page.goto("/goods-receive-note/add");
  await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({
    state: "visible",
    timeout: 45_000,
  });

  // Header
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  await selectComboboxOption(page, "Supply No", supplier || null);

  const deliverySection = page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).first();
  await deliverySection.locator('input[type="date"]').fill(todayISO());

  await page.getByPlaceholder("Enter term").fill(term);
  await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");

  // Wait until stock list is loaded BEFORE searching.
  // Searching too early filters an empty originalStockList → permanent "No items Found".
  const itemsTable = page.locator("table").first();
  await itemsTable.waitFor({ state: "visible", timeout: 45_000 });
  await page
    .getByText("No items Found")
    .waitFor({ state: "hidden", timeout: 60_000 })
    .catch(() => {});
  await itemsTable.locator("tbody tr").filter({ hasNotText: /No items Found/i }).first().waitFor({
    state: "visible",
    timeout: 60_000,
  });

  // Search item (1s debounce in app)
  const searchBox = page.getByPlaceholder("Search items...");
  await searchBox.click();
  await searchBox.fill("");
  await searchBox.fill(itemCode);
  await page.waitForTimeout(1600);

  // Must be a real item row for this code (not the empty-state row)
  const itemRow = itemsTable
    .locator("tbody tr")
    .filter({ hasText: itemCode })
    .first();

  try {
    await itemRow.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    const empty = await page.getByText(/No items Found/i).isVisible().catch(() => false);
    throw new Error(
      empty
        ? `GRN item search returned "No items Found" for ${itemCode}. Wait for stock load or check E2E_ITEM_CODE / department filters.`
        : `GRN item row for ${itemCode} not visible after search.`
    );
  }

  // Qty column input (placeholder often "0")
  const qtyInput = itemRow.locator("input").first();
  await qtyInput.waitFor({ state: "visible", timeout: 10_000 });
  await qtyInput.click();
  await qtyInput.fill("");
  await qtyInput.fill(String(qty));

  // Price field may be visible depending on user settings
  const inputs = itemRow.locator("input");
  const inputCount = await inputs.count();
  if (inputCount >= 2 && price) {
    const priceInput = inputs.nth(1);
    const type = await priceInput.getAttribute("type");
    if (type !== "date") {
      await priceInput.fill(String(price));
    }
  }

  // Plus (add to cart) — last button in the row
  await itemRow.locator("button").last().click();
  await page.getByText(/Item added to cart/i).waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});

  // Selected Items cart should show the line
  await page.getByText("Selected Items").waitFor({ state: "visible", timeout: 10_000 });
  await page
    .locator("table")
    .filter({ hasText: "Item Code" })
    .last()
    .locator("tbody tr")
    .filter({ hasText: itemCode })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });

  // Batch sites show a warning until each cart line has a batch
  const batchWarning = page.getByText(/need batch numbers/i);
  if (await batchWarning.isVisible().catch(() => false)) {
    await fillCartLineBatch(page, batchNo);
  }
}

/**
 * Open cart edit dialog, create a NEW batch (not "Use Existing"), save, wait for close.
 * Matches GRN Edit Item Details UI when BATCH_NO is enabled.
 */
export async function fillCartLineBatch(page, batchNo) {
  const cartTable = page.locator("table").filter({ hasText: "Item Code" }).last();
  // Pencil is the first action button on the cart row
  await cartTable.locator("tbody tr").first().locator("button").first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await dialog.getByText(/Edit Item Details/i).waitFor({ state: "visible" });

  // Wait for existing-batch fetch to finish (default UI starts on "Use Existing")
  await dialog
    .getByText(/Loading batches/i)
    .waitFor({ state: "hidden", timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(400);

  // Default is "Use Existing Batch" checked — switch to new batch for E2E
  const useExisting = dialog.locator("#useExisting");
  if (await useExisting.count()) {
    const checked = await useExisting.isChecked().catch(() => false);
    if (checked) {
      // Click the associated label (Radix checkbox)
      await dialog.locator('label[for="useExisting"]').click();
      await page.waitForTimeout(300);
    }
  }

  const newBatchInput = dialog.getByPlaceholder(/Enter new batch number/i);
  await newBatchInput.waitFor({ state: "visible", timeout: 10_000 });
  await newBatchInput.click();
  await newBatchInput.fill("");
  // pressSequentially so React onChange updates editData.docBatchNo
  await newBatchInput.pressSequentially(String(batchNo).slice(0, BATCH_MAX_LEN), { delay: 20 });

  // Expiry is optional (app auto-fills when creating new batch), but set if empty
  const expiry = dialog.locator("#expiry");
  if (await expiry.count()) {
    const expVal = await expiry.inputValue();
    if (!expVal) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      await expiry.fill(d.toISOString().split("T")[0]);
    }
  }

  await dialog.getByRole("button", { name: /^Save Changes$/i }).click();

  // Either dialog closes (success) or a validation error stays visible
  const errorBox = dialog.locator(".bg-red-50");
  const outcome = await Promise.race([
    dialog.waitFor({ state: "hidden", timeout: 20_000 }).then(() => "closed"),
    errorBox.waitFor({ state: "visible", timeout: 20_000 }).then(() => "error"),
  ]);

  if (outcome === "error") {
    const msg = (await errorBox.innerText().catch(() => "")).trim();
    throw new Error(
      `GRN batch dialog validation failed: ${msg || "Please check batch fields"}`
    );
  }

  // Warning should clear once batch is set
  await page
    .getByText(/need batch numbers/i)
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => {});
}

function isGrnListPath(urlLike) {
  try {
    const u = typeof urlLike === "string" ? new URL(urlLike, "http://local") : urlLike;
    return u.pathname.replace(/\/$/, "") === "/goods-receive-note";
  } catch {
    return false;
  }
}

/**
 * After Save/Post: prefer toast/validation signals (SPA may not fire full page load).
 * Fail fast with a clear message instead of a blank URL timeout.
 */
async function awaitGrnSubmit(page, action) {
  const successRe =
    action === "post"
      ? /Posted successfully|Posted document updated successfully/i
      : /Created successfully|Updated successfully/i;
  const errorRe =
    action === "post"
      ? /Failed to post|Failed to update|Failed to create/i
      : /Failed to create|Failed to update|Failed to post/i;

  const successToast = page.getByText(successRe).first();
  const errorToast = page.getByText(errorRe).first();
  const validation = page.getByRole("alertdialog").filter({ hasText: /Validation Errors/i });

  const outcome = await Promise.race([
    successToast.waitFor({ state: "visible", timeout: 90_000 }).then(() => "success"),
    errorToast.waitFor({ state: "visible", timeout: 90_000 }).then(() => "error"),
    validation.waitFor({ state: "visible", timeout: 90_000 }).then(() => "validation"),
    page
      .waitForURL((url) => isGrnListPath(url), {
        timeout: 90_000,
        waitUntil: "commit",
      })
      .then(() => "navigated"),
  ]);

  if (outcome === "error") {
    const msg = (await errorToast.innerText().catch(() => "")).trim();
    throw new Error(`GRN ${action} failed: ${msg || "error toast shown"}`);
  }

  if (outcome === "validation") {
    const msg = (await validation.innerText().catch(() => "")).trim();
    throw new Error(`GRN ${action} blocked by validation:\n${msg}`);
  }

  // Toast success may fire slightly before React Router finishes
  if (!isGrnListPath(page.url())) {
    await page.waitForURL((url) => isGrnListPath(url), {
      timeout: 30_000,
      waitUntil: "commit",
    });
  }

  await page
    .getByRole("heading", { name: /^Goods Receive Note$/i })
    .waitFor({ state: "visible", timeout: 30_000 });
}

async function expectEnabled(locator) {
  const disabled = await locator.isDisabled().catch(() => false);
  if (disabled) {
    throw new Error("Expected action button to be enabled");
  }
}

export async function clickGrnSave(page) {
  // Do not click while Edit Item Details is still open
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});

  const saveBtn = page.getByRole("button", { name: /^Save$/i });
  await saveBtn.waitFor({ state: "visible", timeout: 15_000 });
  await expectEnabled(saveBtn);
  await saveBtn.click();
  await awaitGrnSubmit(page, "save");
}

export async function clickGrnPost(page) {
  await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});

  const postBtn = page.getByRole("button", { name: /^Post$/i });
  await postBtn.waitFor({ state: "visible", timeout: 15_000 });
  await expectEnabled(postBtn);
  await postBtn.click();
  await awaitGrnSubmit(page, "post");
}

export async function openGrnByRef(page, ref) {
  await page.goto("/goods-receive-note");
  await page.getByRole("heading", { name: /Goods Receive Note/i }).waitFor({ state: "visible" });

  const search = page.getByPlaceholder(/Search by Doc no/i);
  await search.fill(ref);
  await page.waitForTimeout(1500);

  // Click the matching row (not the print icon)
  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.locator("td").nth(0).click();
  await page.waitForURL(/\/goods-receive-note\/(details|edit)\//, {
    timeout: 30_000,
    waitUntil: "commit",
  });
}

export async function openGrnPrintByRef(page, ref) {
  await page.goto("/goods-receive-note");
  await page.getByRole("heading", { name: /Goods Receive Note/i }).waitFor({ state: "visible" });

  const search = page.getByPlaceholder(/Search by Doc no/i);
  await search.fill(ref);
  await page.waitForTimeout(1500);

  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.locator(".icon-print").click();
  await page.waitForURL(/\/goods-receive-note\/print\//, {
    timeout: 30_000,
    waitUntil: "commit",
  });
}
