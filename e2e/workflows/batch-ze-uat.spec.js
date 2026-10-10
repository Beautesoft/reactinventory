import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import { requireBatchNoUser, getUserBatchFlags } from "../helpers/batchUser.js";
import { waitForAppReady } from "../helpers/screenshots.js";
import { getWorkflowEnv, makeE2eRef, resolveItemCode, getItemStockSnapshot } from "../helpers/stockDoc.js";
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
import {
  postSumFefo,
  postGtoFefo,
  postRtnFefo,
  postAdjFefo,
  postGtiFefo,
} from "../helpers/outboundFefo.js";

/**
 * ZE train UAT — batchNo + expiry (login flags), FEFO memo write-back, full PR flow.
 * Items: 11600007 + 11600012 @ ZE01 / ZEHQ. Creates real docs (E2E_TEST).
 */
test.describe.configure({ mode: "serial" });

test.describe("ZE — batch / expiry UAT (UI post + read-back)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_ZE_UAT !== "1",
      "Set E2E_RUN_ZE_UAT=1 in e2e/.env"
    );
    await loginAsTestUser(page);
    const flags = await requireBatchNoUser(page, test);
    testInfo.annotations.push({
      type: "user-flags",
      description: `batchNo=${flags.batchNo} expiryDate=${flags.expiryDate} autoPost=${flags.autoPost}`,
    });
  });

  test("PR — two FEFO lines (11600007 + 11600012), HQ approve, GTI memos", async ({
    page,
  }, testInfo) => {
    test.setTimeout(18 * 60_000);
    const cfg = getWorkflowEnv();
    const hqOutlet = String(process.env.E2E_HQ_OUTLET || "ZEHQ").trim();
    const itemCodes = [cfg.itemCode, cfg.itemCode2].filter(Boolean);
    expect(itemCodes.length).toBeGreaterThanOrEqual(2);

    const ref = makeE2eRef();
    const { itemCodes: postedItems } = await postPurchaseRequisitionAtOutlet(page, {
      itemCodes,
      qty: 1,
      ref,
    });
    expect(postedItems.length).toBeGreaterThanOrEqual(1);
    testInfo.annotations.push({
      type: "pr-lines",
      description: `PR items posted: ${postedItems.join(", ")}`,
    });

    let req = await fetchReqByRef(ref);
    expect(req?.reqNo).toBeTruthy();
    expect(String(req.reqStatus)).toMatch(/Posted/i);

    await logoutTestUser(page);
    await loginAsTestUser(page, { outlet: hqOutlet, siteCode: "ZEHQ" });
    await requireBatchNoUser(page, test);

    await openPostedPrForApproval(page, ref, req.reqNo);
    await approvePrFromApprovalScreen(page);

    await expect
      .poll(async () => (await fetchReqByRef(ref))?.reqStatus, {
        timeout: 180_000,
      })
      .toMatch(/Approved/i);
    req = await fetchReqByRef(ref);

    const gtiHdr = await fetchGtiHeaderByPrRef(req.reqNo);
    expect(gtiHdr?.docNo).toBeTruthy();
    expect(String(gtiHdr.docStatus)).toMatch(/^7$|posted/i);
    testInfo.annotations.push({
      type: "doc",
      description: `PR ${req.reqNo} → GTI ${gtiHdr.docNo}`,
    });

    const lines = await fetchStkMovdocLines(gtiHdr.docNo);
    expectFefoLinesHaveMemo2(lines, expect, {
      minFefoLines: postedItems.length,
      itemCodes: postedItems,
    });
  });

  test("SUM — FEFO ordMemo2 (11600007)", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    await page.goto("/stock-usage-memo/add");
    await waitForAppReady(page);
    const itemCode = await resolveItemCode(page, cfg.itemCode);
    const snap = await getItemStockSnapshot(page, itemCode);
    expect(snap.onHand).toBeGreaterThanOrEqual(1);

    const ref = makeE2eRef();
    const docNo = await postSumFefo(page, { itemCode, ref });
    testInfo.annotations.push({ type: "doc", description: `SUM ${docNo}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemCode] });
  });

  test("GTO — FEFO ordMemo2 (11600012 → ZEHQ)", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    const toOutlet = cfg.toOutlet || "ZEHQ";
    const itemCode = cfg.itemCode2 || cfg.itemCode;

    await page.goto("/goods-transfer-out/add");
    await waitForAppReady(page);
    const resolved = await resolveItemCode(page, itemCode);
    const snap = await getItemStockSnapshot(page, resolved);
    expect(snap.onHand).toBeGreaterThanOrEqual(1);

    const ref = makeE2eRef();
    const docNo = await postGtoFefo(page, {
      itemCode: resolved,
      ref,
      toOutlet,
    });
    testInfo.annotations.push({ type: "doc", description: `GTO ${docNo}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [resolved] });
  });

  test("RTN — FEFO ordMemo2 (11600007)", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    await page.goto("/goods-return-note/add");
    await waitForAppReady(page);
    const itemCode = await resolveItemCode(page, cfg.itemCode);
    const snap = await getItemStockSnapshot(page, itemCode);
    expect(snap.onHand).toBeGreaterThanOrEqual(1);

    const ref = makeE2eRef();
    const docNo = await postRtnFefo(page, {
      itemCode,
      ref,
      supplier: cfg.supplier || null,
    });
    testInfo.annotations.push({ type: "doc", description: `RTN ${docNo}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemCode] });
  });

  test("ADJ — FEFO ordMemo2 (11600012)", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    const itemCode = cfg.itemCode2 || cfg.itemCode;

    await page.goto("/stock-adjustment/add");
    await waitForAppReady(page);
    await resolveItemCode(page, itemCode);

    const ref = makeE2eRef();
    const docNo = await postAdjFefo(page, { itemCode, ref });
    testInfo.annotations.push({ type: "doc", description: `ADJ ${docNo}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemCode] });
  });

  test("GTI — manual FEFO post (HQ → ZE01, 11600007)", async ({ page }, testInfo) => {
    test.setTimeout(10 * 60_000);
    const cfg = getWorkflowEnv();

    const ref = makeE2eRef();
    const docNo = await postGtiFefo(page, {
      itemCode: cfg.itemCode,
      ref,
      fromOutlet: cfg.hqOutlet,
    });
    testInfo.annotations.push({ type: "doc", description: `GTI ${docNo}` });

    const lines = await fetchStkMovdocLines(docNo);
    expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [cfg.itemCode] });
  });
});
