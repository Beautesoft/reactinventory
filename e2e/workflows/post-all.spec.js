import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { waitForAppReady, waitForListContent } from "../helpers/screenshots.js";
import {
  getWorkflowEnv,
  makeE2eRef,
  todayISO,
  selectComboboxByLabel,
  searchAndAddItem,
  ensureNewBatchOnCart,
  ensureExistingBatchOnCart,
  resolveItemCode,
  getItemStockSnapshot,
  readStockBalanceQty,
  computeGrnReceiveQty,
  formatStockNote,
  clickSaveOrPost,
} from "../helpers/stockDoc.js";

const OUTBOUND_QTY_TOTAL = 3; // SUM + RTN + GTO (1 each)
const ADJ_ADD_QTY = 1;

/**
 * UAT posting workflow — creates real Posted documents tagged E2E_TEST / E2E-<timestamp>.
 * Records pre/post on-hand stock before posting. Clean up via DB after the run.
 */
test.describe("UAT — post stock documents", () => {
  test("post GRN, ADJ, SUM, RTN, GTO, PR", async ({ page }, testInfo) => {
    test.setTimeout(20 * 60_000);

    const cfg = getWorkflowEnv();
    const postedRefs = [];
    const outlet = process.env.E2E_OUTLET || "";

    await loginAsTestUser(page);

    // Resolve item + capture pre-post stock from item picker grid
    await page.goto("/goods-receive-note/add");
    await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({ state: "visible" });
    await waitForAppReady(page);
    cfg.itemCode = await resolveItemCode(page, cfg.itemCode);

    const prePost = await getItemStockSnapshot(page, cfg.itemCode);
    const preNote = formatStockNote({ phase: "PRE-POST", outlet, snapshot: prePost });
    console.log(preNote);
    testInfo.annotations.push({ type: "stock", description: preNote });

    const grnQty = computeGrnReceiveQty(prePost.onHand, {
      outboundTotal: OUTBOUND_QTY_TOTAL,
      adjAdd: ADJ_ADD_QTY,
    });
    const expectedDelta = grnQty + ADJ_ADD_QTY - OUTBOUND_QTY_TOTAL;
    const expectedClosing = prePost.onHand + expectedDelta;
    const planNote = `plan: grnQty=${grnQty} (${grnQty === 0 ? "skip GRN" : "post GRN"}), adj=+${ADJ_ADD_QTY}, outbound=-${OUTBOUND_QTY_TOTAL}, expectedClosing=${expectedClosing}`;
    console.log(planNote);
    testInfo.annotations.push({ type: "stock", description: planNote });

    // GRN — only when opening stock is insufficient for outbound chain
    if (grnQty > 0) {
      const ref = makeE2eRef();
      await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
      await selectComboboxByLabel(page, "Supply No", cfg.supplier || null);
      await page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).locator('input[type="date"]').fill(todayISO());
      await page.getByPlaceholder("Enter term").fill(cfg.term);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: String(grnQty) });
      await ensureNewBatchOnCart(page, cfg.batchNo);
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-receive-note",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await expectPostedByRef(page, "/goods-receive-note", ref);
      postedRefs.push({ type: "GRN", ref, qty: grnQty });
    } else {
      testInfo.annotations.push({
        type: "stock",
        description: `GRN skipped — onHand ${prePost.onHand} already sufficient for ADJ + outbound`,
      });
    }

    // ADJ (+)
    {
      const ref = makeE2eRef();
      await page.goto("/stock-adjustment/add");
      await page.getByRole("heading", { name: /Add Stock Adjustment/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter Ref 1").fill(ref);
      await page.getByPlaceholder("Enter remark").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: String(ADJ_ADD_QTY) });
      await ensureNewBatchOnCart(page, cfg.batchNo);
      await clickSaveOrPost(page, "post", {
        listPath: "/stock-adjustment",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await expectPostedByRef(page, "/stock-adjustment", ref);
      postedRefs.push({ type: "ADJ", ref, qty: ADJ_ADD_QTY });
    }

    // SUM
    {
      const ref = makeE2eRef();
      await page.goto("/stock-usage-memo/add");
      await page.getByRole("heading", { name: /Add Stock Usage Memo|Stock Usage/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await assertOutboundStock(page, cfg.itemCode, 1, testInfo);
      await page.getByPlaceholder("Enter Ref 1").fill(ref);
      await page.getByPlaceholder("Enter remark").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await clickSaveOrPost(page, "post", {
        listPath: "/stock-usage-memo",
        successRe: /Posted successfully|Stock Usage Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await expectPostedByRef(page, "/stock-usage-memo", ref);
      postedRefs.push({ type: "SUM", ref, qty: 1 });
    }

    // RTN
    {
      const ref = makeE2eRef();
      await page.goto("/goods-return-note/add");
      await page.getByRole("heading", { name: /Add Goods Return Note/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await assertOutboundStock(page, cfg.itemCode, 1, testInfo);
      await page.getByPlaceholder("Enter RTN Ref 1").fill(ref);
      await selectComboboxByLabel(page, "Supply No", cfg.supplier || null);
      const delivery = page.locator("div.space-y-2").filter({ hasText: "Delivery Date" }).locator('input[type="date"]');
      if (await delivery.count()) await delivery.fill(todayISO());
      const term = page.getByPlaceholder("Enter term");
      if (await term.count()) await term.fill(cfg.term);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-return-note",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await expectPostedByRef(page, "/goods-return-note", ref);
      postedRefs.push({ type: "RTN", ref, qty: 1 });
    }

    // GTO
    if (cfg.toOutlet) {
      const ref = makeE2eRef();
      await page.goto("/goods-transfer-out/add");
      await page.getByRole("heading", { name: /Add Goods Transfer Out/i }).waitFor({ state: "visible", timeout: 45_000 });
      await waitForAppReady(page);
      await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
      await selectComboboxByLabel(page, "To Store", cfg.toOutlet);
      await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
      await page.waitForTimeout(1000);
      await assertOutboundStock(page, cfg.itemCode, 1, testInfo);
      await searchAndAddItem(page, { ...cfg, qty: "1" });
      await ensureExistingBatchOnCart(page);
      await clickSaveOrPost(page, "post", {
        listPath: "/goods-transfer-out",
        successRe: /Posted successfully|Created successfully/i,
        errorRe: /Failed to (post|create|update)/i,
      });
      await expectPostedByRef(page, "/goods-transfer-out", ref);
      postedRefs.push({ type: "GTO", ref, qty: 1 });
    } else {
      testInfo.annotations.push({
        type: "note",
        description: "GTO skipped — set E2E_TO_OUTLET in e2e/.env",
      });
    }

    // PR — soft-fail
    {
      const ref = makeE2eRef();
      try {
        await page.goto("/purchase-requisition/add");
        await page.getByRole("heading", { name: /Add Purchase Requisition/i }).waitFor({ state: "visible", timeout: 45_000 });
        await waitForAppReady(page);
        await page.getByPlaceholder("Enter reference").fill(ref);
        await page.getByPlaceholder("Enter remarks").fill("E2E_TEST");
        const requestTo = page.locator("div.space-y-2").filter({ hasText: /Request To/i }).getByRole("combobox");
        if (await requestTo.count()) {
          const current = (await requestTo.innerText().catch(() => "")).trim();
          if (!/HQ/i.test(current)) {
            await selectComboboxByLabel(page, "Request To", "HQ");
          }
        }
        await searchAndAddItem(page, { ...cfg, qty: "1", price: null });
        await clickSaveOrPost(page, "post", {
          listPath: "/purchase-requisition",
          successRe: /Purchase Requisition posted successfully|Posted successfully|Created successfully/i,
          errorRe: /Error posting|Failed to (post|create|update)/i,
        });
        postedRefs.push({ type: "PR", ref, qty: 1 });
      } catch (err) {
        testInfo.annotations.push({
          type: "note",
          description: `PR post soft-fail: ${err.message}`,
        });
      }
    }

    // Post-post stock from Stock Balance Live
    const postBalQty = await readStockBalanceQty(page, cfg.itemCode);
    const postNote = `[POST-POST] outlet=${outlet}, item=${cfg.itemCode}, balQty=${postBalQty}, preOnHand=${prePost.onHand}, expected=${expectedClosing}`;
    console.log(postNote);
    testInfo.annotations.push({ type: "stock", description: postNote });

    console.log(
      "Posted E2E documents:",
      postedRefs.map((d) => `${d.type}=${d.ref}(qty ${d.qty})`).join(", ")
    );
    expect(postedRefs.length).toBeGreaterThan(0);
  });
});

async function assertOutboundStock(page, itemCode, qty, testInfo) {
  const snap = await getItemStockSnapshot(page, itemCode);
  const note = formatStockNote({
    phase: "BEFORE-OUTBOUND",
    outlet: process.env.E2E_OUTLET,
    snapshot: snap,
    extra: `needQty=${qty}`,
  });
  console.log(note);
  testInfo.annotations.push({ type: "stock", description: note });
  expect(
    snap.onHand,
    `${itemCode} onHand ${snap.onHand} < ${qty} — insufficient for outbound post`
  ).toBeGreaterThanOrEqual(qty);
}

async function expectPostedByRef(page, listPath, ref) {
  await page.goto(listPath);
  await waitForListContent(page);
  const search = page.getByPlaceholder(/Search by Doc no|Search by PR no/i);
  if (await search.count()) {
    await search.fill(ref);
    await page.waitForTimeout(1500);
  }
  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText(/Posted/i)).toBeVisible({ timeout: 15_000 });
}
