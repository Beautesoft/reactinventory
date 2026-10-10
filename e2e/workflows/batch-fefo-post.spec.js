import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import { requireBatchNoUser } from "../helpers/batchUser.js";
import { waitForAppReady, waitForListContent } from "../helpers/screenshots.js";
import {
  getWorkflowEnv,
  makeE2eRef,
  searchAndAddItemFefo,
  clickSaveOrPost,
  resolveItemCode,
  getItemStockSnapshot,
} from "../helpers/stockDoc.js";
import {
  fetchStkMovdocLines,
  fetchReqByRef,
  fetchGtiHeaderByPrRef,
  expectFefoLinesHaveMemo2,
} from "../helpers/loopbackRead.js";
import {
  postPurchaseRequisitionAtOutlet,
  openPostedPrForApproval,
  approvePrFromApprovalScreen,
} from "../helpers/pr.js";

/**
 * UI posting for batch/FEFO fixes (memo write-back, PR approve → GTI).
 * Creates real documents tagged E2E_TEST — clean up on train after run.
 *
 * Requires e2e/.env + E2E_RUN_BATCH_FEFO=1 + login user with batchNo=Yes.
 */
test.describe("Batch FEFO — UI post + LoopBack read-back", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_BATCH_FEFO !== "1",
      "Set E2E_RUN_BATCH_FEFO=1 in e2e/.env to run batch/FEFO UI tests"
    );
    await loginAsTestUser(page);
    await requireBatchNoUser(page, test);
  });

  test("SUM — FEFO post then ordMemo2 on lines", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    const ref = makeE2eRef();

    await page.goto("/stock-usage-memo/add");
    await page
      .getByRole("heading", { name: /Add Stock Usage Memo|Stock Usage/i })
      .waitFor({ state: "visible", timeout: 45_000 });
    await waitForAppReady(page);
    cfg.itemCode = await resolveItemCode(page, cfg.itemCode);

    const snap = await getItemStockSnapshot(page, cfg.itemCode);
    expect(snap.onHand, "need stock for SUM FEFO post").toBeGreaterThanOrEqual(1);

    await page.getByPlaceholder("Enter Ref 1").fill(ref);
    await page.getByPlaceholder("Enter remark").fill("E2E_TEST FEFO");
    await searchAndAddItemFefo(page, { itemCode: cfg.itemCode, qty: "1" });

    await clickSaveOrPost(page, "post", {
      listPath: "/stock-usage-memo",
      successRe: /Posted successfully|Stock Usage Posted successfully|Created successfully/i,
      errorRe: /Failed to (post|create|update)/i,
    });

    const docNo = await findPostedDocNo(page, "/stock-usage-memo", ref);
    testInfo.annotations.push({ type: "doc", description: `SUM ${docNo} ref=${ref}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect);
  });

  test("GTO — FEFO post then ordMemo2 (optional destination)", async ({ page }, testInfo) => {
    test.skip(!process.env.E2E_TO_OUTLET, "Set E2E_TO_OUTLET for GTO FEFO test");
    test.setTimeout(8 * 60_000);

    const cfg = getWorkflowEnv();
    const ref = makeE2eRef();

    await page.goto("/goods-transfer-out/add");
    await page
      .getByRole("heading", { name: /Add Goods Transfer Out/i })
      .waitFor({ state: "visible", timeout: 45_000 });
    await waitForAppReady(page);
    cfg.itemCode = await resolveItemCode(page, cfg.itemCode);

    const snap = await getItemStockSnapshot(page, cfg.itemCode);
    expect(snap.onHand).toBeGreaterThanOrEqual(1);

    await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
    await page.locator("div.space-y-2").filter({ hasText: "To Store" }).getByRole("combobox").click();
    await page.getByRole("option").filter({ hasText: cfg.toOutlet }).first().click();
    await page.getByPlaceholder("Enter remarks").fill("E2E_TEST FEFO");
    await page.waitForTimeout(800);
    await searchAndAddItemFefo(page, { itemCode: cfg.itemCode, qty: "1" });

    await clickSaveOrPost(page, "post", {
      listPath: "/goods-transfer-out",
      successRe: /Posted successfully|Created successfully/i,
      errorRe: /Failed to (post|create|update)/i,
    });

    const docNo = await findPostedDocNo(page, "/goods-transfer-out", ref);
    testInfo.annotations.push({ type: "doc", description: `GTO ${docNo} ref=${ref}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect);
  });

  test("PR — outlet post, HQ approve, GTI FEFO memos", async ({ page }, testInfo) => {
    const hqOutlet = String(process.env.E2E_HQ_OUTLET || "").trim();
    test.skip(!hqOutlet, "Set E2E_HQ_OUTLET (HQ login outlet) for PR approve test");
    test.setTimeout(15 * 60_000);

    const cfg = getWorkflowEnv();
    await page.goto("/goods-receive-note/add");
    await waitForAppReady(page);
    cfg.itemCode = await resolveItemCode(page, cfg.itemCode);

    const { ref } = await postPurchaseRequisitionAtOutlet(page, {
      itemCode: cfg.itemCode,
      qty: 1,
      ref: makeE2eRef(),
    });

    let req = await fetchReqByRef(ref);
    expect(req?.reqNo, `PR not found for ref ${ref}`).toBeTruthy();
    expect(String(req.reqStatus)).toMatch(/Posted/i);

    await logoutTestUser(page);
    await loginAsTestUser(page, { outlet: hqOutlet });
    await requireBatchNoUser(page, test);

    await openPostedPrForApproval(page, ref, req.reqNo);
    await approvePrFromApprovalScreen(page);

    req = await fetchReqByRef(ref);
    expect(String(req?.reqStatus || "")).toMatch(/Approved/i);

    const gtiHdr = await fetchGtiHeaderByPrRef(req.reqNo);
    expect(gtiHdr?.docNo, `GTI for PR ${req.reqNo}`).toBeTruthy();
    testInfo.annotations.push({
      type: "doc",
      description: `PR ${req.reqNo} → GTI ${gtiHdr.docNo} ref=${ref}`,
    });

    const lines = await fetchStkMovdocLines(gtiHdr.docNo);
    expectFefoLinesHaveMemo2(lines, expect);
  });
});

async function findPostedDocNo(page, listPath, ref) {
  await page.goto(listPath);
  await waitForListContent(page);
  const search = page.getByPlaceholder(/Search by Doc no|Search by PR no/i);
  if (await search.count()) {
    await search.fill(ref);
    await page.waitForTimeout(2000);
  }
  const row = page.locator("table tbody tr").filter({ hasText: ref }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  const docCell = (await row.locator("td").first().innerText()).trim();
  if (!docCell) {
    throw new Error(`Could not read doc no from list row for ref ${ref}`);
  }
  return docCell.split(/\s/)[0];
}
