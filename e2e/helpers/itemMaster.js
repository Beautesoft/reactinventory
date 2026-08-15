/**
 * Playwright helpers for Item Master create (UAT).
 */
import { expect } from "@playwright/test";

/** Division + allowed stock types (legacy Listofitemtype rules). */
export const E2E_ITEM_SCENARIOS = [
  { division: "RETAIL PRODUCT", types: ["SINGLE"], needsUom: true },
  { division: "SALON PRODUCT", types: ["SINGLE", "PACKAGE"], needsUom: true },
  { division: "SERVICES", types: ["SINGLE", "PACKAGE", "COURSE"], needsUom: false },
  { division: "VOUCHER", types: ["SINGLE"], needsVoucher: true },
  { division: "PREPAID", types: ["SINGLE"], needsPrepaid: true },
];

const FIELD_PLACEHOLDERS = {
  Division: /Select Division/i,
  Department: /Select Department/i,
  Brand: /Select Brand/i,
  Class: /Select Class/i,
  Range: /Select Range/i,
};

function comboboxForField(page, labelText) {
  const pattern = FIELD_PLACEHOLDERS[labelText];
  if (pattern) {
    return page.getByRole("combobox").filter({ hasText: pattern }).first();
  }
  return fieldByLabel(page, labelText).getByRole("combobox").first();
}

function fieldByLabel(page, labelText) {
  const label = page.locator("label").filter({ hasText: new RegExp(`^${labelText}`, "i") }).first();
  return label.locator("xpath=ancestor::div[1]");
}

function typeCombobox(page) {
  return fieldByLabel(page, "Type").getByRole("combobox");
}

export async function selectItemMasterField(page, labelText, optionText) {
  await comboboxForField(page, labelText).click();
  const opt = page.getByRole("option").filter({ hasText: optionText }).first();
  await opt.waitFor({ state: "visible", timeout: 15_000 });
  await opt.click();
  await page.waitForTimeout(400);
}

export async function selectFirstItemMasterOption(page, labelText) {
  await comboboxForField(page, labelText).click();
  const opt = page.getByRole("option").first();
  await opt.waitFor({ state: "visible", timeout: 15_000 });
  const text = (await opt.innerText()).trim();
  await opt.click();
  await page.waitForTimeout(500);
  return text;
}

/** Select stock type (SINGLE / PACKAGE / COURSE). */
export async function selectStockType(page, stockType) {
  await typeCombobox(page).click();
  await page.getByRole("option", { name: stockType, exact: true }).click();
  await page.waitForTimeout(600);
}

/** Assert Type dropdown shows exactly the expected options for this division. */
export async function expectStockTypeOptions(page, expectedTypes) {
  await typeCombobox(page).click();
  for (const t of expectedTypes) {
    await expect(page.getByRole("option", { name: t, exact: true })).toBeVisible();
  }
  const options = page.getByRole("option");
  await expect(options).toHaveCount(expectedTypes.length);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

export async function readStockCodePreview(page) {
  const input = fieldByLabel(page, "Stock Code").locator("input").first();
  await expect(input).not.toHaveValue("", { timeout: 30_000 });
  return (await input.inputValue()).trim();
}

export async function addPrimaryUom(page, { price = "10", cost = "5" } = {}) {
  const uomCard = page
    .locator(".border.rounded-lg")
    .filter({ has: page.locator(".text-base.font-semibold", { hasText: /^UOM$/i }) })
    .first();
  await uomCard.scrollIntoViewIfNeeded();
  await uomCard.getByRole("button", { name: /Add Row/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });

  const uomcSelect = dialog.locator("div").filter({ hasText: /^UOMC Description/i }).getByRole("combobox").first();
  await uomcSelect.click();
  const unitOpt = page.getByRole("option").filter({ hasText: /^UNIT$/i }).first();
  if (await unitOpt.count()) {
    await unitOpt.click();
  } else {
    await page.getByRole("option").first().click();
  }

  await dialog.getByRole("spinbutton").fill("1");

  const uomDescSelect = dialog.locator("div").filter({ hasText: /^UOM Description/i }).getByRole("combobox").first();
  await uomDescSelect.click();
  const baseOpt = page.getByRole("option").filter({ hasText: /^UNIT$/i }).first();
  if (await baseOpt.count()) {
    await baseOpt.click();
  } else {
    await page.getByRole("option").first().click();
  }

  await dialog.getByRole("button", { name: /^Submit$/i }).click();
  await dialog.waitFor({ state: "hidden", timeout: 15_000 });

  const priceInput = page.getByPlaceholder("Enter Price").first();
  await priceInput.waitFor({ state: "visible", timeout: 10_000 });
  await priceInput.fill(price);
  const costInput = page.getByPlaceholder("Enter Cost").first();
  await costInput.fill(cost);
}

async function expandCollapsibleSection(page, title) {
  const card = page
    .locator(".border.rounded-lg")
    .filter({ has: page.locator(".text-base.font-semibold", { hasText: new RegExp(`^${title}$`, "i") }) })
    .first();
  await card.scrollIntoViewIfNeeded();
  const trigger = card.locator(".cursor-pointer").first();
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(400);
  }
}

export async function fillPackageSection(page) {
  await expandCollapsibleSection(page, "Package");
  const pkgCard = page
    .locator(".border.rounded-lg")
    .filter({ has: page.locator(".text-base.font-semibold", { hasText: /^Package$/i }) })
    .first();

  await pkgCard.getByText(/^Loading/i).waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const firstPick = pkgCard.locator("table tbody tr").filter({ hasNotText: /No items found/i }).first();
  await firstPick.waitFor({ state: "visible", timeout: 60_000 });
  await firstPick.getByRole("button").click();

  await pkgCard.getByRole("button", { name: /Insert \/ Update/i }).click();
  await expect(pkgCard.getByText(/No package content added/i)).toBeHidden({ timeout: 10_000 });
}

export async function fillVoucherSection(page) {
  await expandCollapsibleSection(page, "Voucher Details");

  const valueInput = fieldByLabel(page, "Value").locator('input[type="number"]').first();
  if (await valueInput.count()) {
    await valueInput.fill("10");
  }

  const periodField = fieldByLabel(page, "Validity Period");
  if (await periodField.getByRole("combobox").count()) {
    await periodField.getByRole("combobox").click();
    await page.getByRole("option").first().click();
  }
}

export async function fillPrepaidSection(page) {
  await expandCollapsibleSection(page, "Prepaid Configuration");

  const periodField = fieldByLabel(page, "Valid Period");
  if (await periodField.getByRole("combobox").count()) {
    await periodField.getByRole("combobox").click();
    await page.getByRole("option").first().click();
  }

  const sellAmt = page.getByPlaceholder("0.00").last();
  await sellAmt.fill("10");
}

export async function fillServicePricing(page) {
  const priceField = fieldByLabel(page, "Price").locator('input[type="number"]').first();
  if (await priceField.count()) {
    await priceField.fill("10");
  }
  const costField = fieldByLabel(page, "Cost").locator('input[type="number"]').first();
  if (await costField.count()) {
    await costField.fill("5");
  }
}

export async function ensureCurrentOutletSiteSelected(page, outletLabel) {
  if (!outletLabel) return;
  const siteCheckbox = page.locator(`label[for^="site-"]`).filter({ hasText: new RegExp(outletLabel, "i") }).first();
  if (await siteCheckbox.count()) {
    const id = await siteCheckbox.getAttribute("for");
    if (id) {
      const cb = page.locator(`#${id}`);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.check();
      }
    }
  }
}

/**
 * Create one Item Master row for division + stock type.
 * Returns { stockCode, stockName, division, stockType }.
 */
export async function createItemForScenario(page, scenario, stockType, testInfo) {
  const ts = Date.now();
  const shortDiv = scenario.division.replace(/\s+/g, " ").split(" ")[0];
  const stockName = `E2E ${shortDiv} ${stockType} ${ts}`.slice(0, 40);

  await page.goto("/item-master/add");
  await page.getByRole("heading", { name: /New Item Master/i }).waitFor({ state: "visible", timeout: 45_000 });
  await page.getByText(/^Loading\.\.\.$/i).waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});

  await selectItemMasterField(page, "Division", scenario.division);
  await expectStockTypeOptions(page, scenario.types);

  await selectFirstItemMasterOption(page, "Department");
  await page.waitForTimeout(800);
  await selectFirstItemMasterOption(page, "Brand");
  await selectFirstItemMasterOption(page, "Class");
  await selectFirstItemMasterOption(page, "Range");

  if (stockType !== "SINGLE") {
    await selectStockType(page, stockType);
  }

  const stockCode = await readStockCodePreview(page);

  await page.getByPlaceholder("Stock Name").fill(stockName);
  await page.getByPlaceholder("Description").fill(stockName);

  if (stockType === "PACKAGE") {
    await fillPackageSection(page);
  }

  if (scenario.needsUom) {
    await addPrimaryUom(page);
  } else if (scenario.needsVoucher) {
    await fillVoucherSection(page);
  } else if (scenario.needsPrepaid) {
    await fillPrepaidSection(page);
  } else {
    await fillServicePricing(page);
  }

  await ensureCurrentOutletSiteSelected(page, process.env.E2E_OUTLET || "");

  await page.getByRole("button", { name: /^Create Item$/i }).first().click();

  await expect(page.getByText(/Item created successfully/i).first()).toBeVisible({ timeout: 90_000 });
  await page.waitForURL(/\/item-master\/?$/, { timeout: 30_000 }).catch(() => {});

  const note = `[ITEM-CREATE] division=${scenario.division}, type=${stockType}, code=${stockCode}, name=${stockName}`;
  console.log(note);
  testInfo.annotations.push({ type: "item", description: note });

  return { stockCode, stockName, division: scenario.division, stockType };
}

/** @deprecated use createItemForScenario */
export const E2E_DIVISIONS = E2E_ITEM_SCENARIOS.map((s) => ({
  label: s.division,
  needsUom: s.needsUom,
  needsVoucher: s.needsVoucher,
  needsPrepaid: s.needsPrepaid,
}));

export async function createItemForDivision(page, divisionConfig, testInfo) {
  const scenario = E2E_ITEM_SCENARIOS.find((s) => s.division === divisionConfig.label) || {
    division: divisionConfig.label,
    types: ["SINGLE"],
    needsUom: divisionConfig.needsUom,
    needsVoucher: divisionConfig.needsVoucher,
    needsPrepaid: divisionConfig.needsPrepaid,
  };
  return createItemForScenario(page, scenario, "SINGLE", testInfo);
}
