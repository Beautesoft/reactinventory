/**
 * PR workflow via UI — outlet Post, HQ Approve (FEFO lines default at outlet).
 */
import { waitForAppReady, waitForListContent } from "./screenshots.js";
import {
  selectComboboxByLabel,
  pickComboboxOption,
  searchAndAddItem,
  clickSaveOrPost,
  makeE2eRef,
  resolveItemCode,
  confirmFirstRealBatch,
} from "./stockDoc.js";

/** Pick a non-HQ supplier on PR "Request To". */
export async function selectExternalPrSupplier(page, preferredLabel) {
  const section = page
    .locator("div.space-y-2")
    .filter({ hasText: /Request To/i })
    .first();
  await section.getByRole("combobox").click();

  const preferred = String(
    preferredLabel || process.env.E2E_PR_EXTERNAL_SUPPLIER || ""
  )
    .trim()
    .replace(/^['"]+|['"]+$/g, "");

  if (preferred) {
    await pickComboboxOption(page, preferred);
    return preferred;
  }

  const options = page.getByRole("option");
  await options.first().waitFor({ state: "visible", timeout: 20_000 });
  const texts = await options.allTextContents();
  const idx = texts.findIndex((t) => {
    const l = t.trim().toLowerCase();
    if (!l) return false;
    if (l === "hq" || /hq\s*warehouse/i.test(l)) return false;
    if (/\(hq\)/i.test(l)) return false;
    return true;
  });
  if (idx < 0) {
    throw new Error(
      `No non-HQ supplier in Request To. Options: ${texts.map((t) => t.trim()).join(" | ")}`
    );
  }
  await options.nth(idx).click();
  return texts[idx].trim();
}

export async function postPurchaseRequisitionAtOutlet(
  page,
  { itemCode, itemCodes, qty, ref, externalSupplier = false, supplierLabel } = {}
) {
  const e2eRef = ref || makeE2eRef();
  const codes = itemCodes?.length
    ? itemCodes
    : itemCode
      ? [itemCode]
      : [];

  if (!codes.length) {
    throw new Error("postPurchaseRequisitionAtOutlet: provide itemCode or itemCodes");
  }

  await page.goto("/purchase-requisition/add");
  await page
    .getByRole("heading", { name: /Add Purchase Requisition/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForAppReady(page);

  await page.getByPlaceholder("Enter reference").fill(e2eRef);
  await page.getByPlaceholder("Enter remarks").fill("E2E_TEST batch-fefo");

  if (externalSupplier) {
    await selectExternalPrSupplier(page, supplierLabel);
    await page.waitForTimeout(1200);
  } else {
    const requestTo = page
      .locator("div.space-y-2")
      .filter({ hasText: /Request To/i })
      .getByRole("combobox");
    if (await requestTo.count()) {
      const current = (await requestTo.innerText().catch(() => "")).trim();
      if (!/HQ/i.test(current)) {
        await selectComboboxByLabel(page, "Request To", "HQ");
      }
    }
  }

  const lineQty = String(qty ?? 1);
  const resolvedCodes = [];
  for (const code of codes) {
    const resolved = await resolveItemCodeIfPresent(page, code);
    if (resolved) {
      resolvedCodes.push(resolved);
      await searchAndAddItem(page, { itemCode: resolved, qty: lineQty, price: null });
    }
  }
  if (!resolvedCodes.length) {
    throw new Error(`No PR line items found in picker for: ${codes.join(", ")}`);
  }

  await clickSaveOrPost(page, "post", {
    listPath: "/purchase-requisition",
    successRe:
      /Purchase Requisition posted successfully|Posted successfully|Created successfully/i,
    errorRe: /Error posting|Failed to (post|create|update)/i,
  });

  return { ref: e2eRef, itemCodes: resolvedCodes };
}

/** Returns item code if row exists in current picker; does not fall back to another item. */
export async function resolveItemCodeIfPresent(page, preferredCode) {
  const searchBox = page.getByPlaceholder("Search items...");
  await searchBox.waitFor({ state: "visible", timeout: 45_000 });
  await searchBox.fill("");
  await searchBox.fill(preferredCode);
  await page.waitForTimeout(1600);
  const itemRow = page
    .locator("table")
    .first()
    .locator("tbody tr")
    .filter({ hasText: preferredCode })
    .first();
  if (!(await itemRow.isVisible().catch(() => false))) {
    return null;
  }
  return preferredCode;
}

export async function openPostedPrForApproval(page, ref, reqNo) {
  if (reqNo) {
    await page.goto(
      `/purchase-requisition/details/${encodeURIComponent(reqNo)}?status=7&approval=1`
    );
    await waitForAppReady(page);
    await page
      .getByRole("heading", {
        name: /Approve Purchase Requisition|View Posted Purchase Requisition/i,
      })
      .waitFor({ state: "visible", timeout: 45_000 });
    return;
  }

  await page.goto("/purchase-requisition?mainTab=approval&approvalTab=posted");
  await page
    .getByRole("heading", { name: /Purchase Requisition/i })
    .waitFor({ state: "visible", timeout: 45_000 });
  await waitForListContent(page);

  const search = page.getByPlaceholder(/Search by PR no, Ref no/i).first();
  await search.fill(ref);
  await page.waitForTimeout(2500);

  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  await row.locator("td").first().click();
  await page.waitForURL(/\/purchase-requisition\/details\//, { timeout: 45_000 });
  await waitForAppReady(page);
  await page
    .getByRole("heading", {
      name: /Approve Purchase Requisition|View Posted Purchase Requisition/i,
    })
    .waitFor({ state: "visible", timeout: 45_000 });
}

/**
 * On HQ approval, switch one FEFO line to a specific batch (first real batch, qty 1).
 */
export async function selectSpecificBatchOnPrLine(page, itemCode) {
  const row = page.locator("table tbody tr").filter({ hasText: itemCode }).first();
  await row.waitFor({ state: "visible", timeout: 30_000 });
  const btn = row.getByRole("button", { name: /Select Batch|Edit Batch/i });
  await btn.waitFor({ state: "visible", timeout: 20_000 });
  await btn.click();

  const dialog = page.getByRole("dialog").filter({
    hasText: /Select Specific Batches|Edit Batch Selection/i,
  });
  await dialog.waitFor({ state: "visible", timeout: 30_000 });
  await confirmFirstRealBatch(page, dialog);

  await row.getByText(/^Specific$/i).waitFor({ state: "visible", timeout: 15_000 });
}

export async function approvePrFromApprovalScreen(page) {
  const approveBtn = page.getByRole("button", { name: /^Approve PR$/i });
  await approveBtn.scrollIntoViewIfNeeded();
  await approveBtn.click();

  await page
    .getByRole("button", { name: /^Processing\.\.\.$/i })
    .waitFor({ state: "visible", timeout: 5_000 })
    .catch(() => {});
  await page
    .getByRole("button", { name: /^Processing\.\.\.$/i })
    .waitFor({ state: "hidden", timeout: 120_000 })
    .catch(() => {});

  const validationBox = page.locator(".bg-red-50").filter({ hasText: /Validation Errors/i });
  if (await validationBox.isVisible().catch(() => false)) {
    const msg = await validationBox.innerText().catch(() => "");
    throw new Error(`PR approval blocked: ${msg}`);
  }

  const confirmDialog = page.getByRole("dialog").filter({
    hasText: /Confirm PR Approval/i,
  });
  await confirmDialog.waitFor({ state: "visible", timeout: 60_000 });
  await confirmDialog.getByRole("button", { name: /^Confirm Approval$/i }).click();

  const errorDialog = page.getByRole("alertdialog").filter({
    hasText: /Validation Errors/i,
  });
  const successToast = page
    .getByText(/approved|transfer|GRN|stock updated|completed successfully/i)
    .first();
  const successDialog = page.getByRole("dialog").filter({
    hasText: /approval|transfer created|GTI|GRN/i,
  });

  const outcome = await Promise.race([
    successToast.waitFor({ state: "visible", timeout: 180_000 }).then(() => "toast"),
    successDialog.waitFor({ state: "visible", timeout: 180_000 }).then(() => "dialog"),
    errorDialog.waitFor({ state: "visible", timeout: 180_000 }).then(() => "validation"),
    page
      .waitForURL(/\/purchase-requisition(\?|$)/, { timeout: 180_000 })
      .then(() => "navigated"),
  ]);

  if (outcome === "validation") {
    const msg = await errorDialog.innerText().catch(() => "");
    throw new Error(`PR approval validation failed: ${msg}`);
  }

  await page
    .getByRole("button", { name: /^Processing\.\.\.$|^Approving\.\.\.$/i })
    .waitFor({ state: "hidden", timeout: 180_000 })
    .catch(() => {});
}
