import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import { requireBatchNoUser } from "../helpers/batchUser.js";
import { waitForAppReady } from "../helpers/screenshots.js";
import {
  getWorkflowEnv,
  makeE2eRef,
  todayISO,
  selectComboboxByLabel,
  searchAndAddItem,
  ensureNewBatchOnCart,
  clickSaveOrPost,
  resolveItemCode,
} from "../helpers/stockDoc.js";
import { findPostedDocNoByRef, postSum, postGto, postRtn, postAdj, postGti } from "../helpers/outboundFefo.js";
import {
  fetchStkMovdocHeader,
  fetchStkMovdocLines,
  fetchReqByRef,
  fetchGtiHeaderByPrRef,
  fetchGrnHeaderByPrRef,
  snapshotOnHand,
  snapshotBatches,
  summarizeDocLines,
  expectFefoLinesHaveMemo2,
  expectSpecificLinesHaveMemo2,
} from "../helpers/loopbackRead.js";
import {
  postPurchaseRequisitionAtOutlet,
  openPostedPrForApproval,
  approvePrFromApprovalScreen,
  selectSpecificBatchOnPrLine,
} from "../helpers/pr.js";
import { clickGrnPost } from "../helpers/grn.js";
import { recordUatRow, writeUatReport } from "../helpers/uatReport.js";

/**
 * Top 4 batch cases across stock menus.
 * UI posts only. LoopBack GET records docs + on-hand before/after.
 * Report: e2e/reports/matrix-*.md
 */
const outletSite = () => String(process.env.E2E_SITE_CODE || "ZE01").trim();
const hqSite = "ZEHQ";

test.describe("Batch matrix — 4 cases, UI post, DB before/after", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_MATRIX_UAT !== "1",
      "Set E2E_RUN_MATRIX_UAT=1 in e2e/.env"
    );
    await loginAsTestUser(page);
    const flags = await requireBatchNoUser(page, test);
    testInfo.annotations.push({
      type: "user-flags",
      description: `batchNo=${flags.batchNo} expiryDate=${flags.expiryDate}`,
    });
  });

  test.afterAll(() => {
    if (process.env.E2E_RUN_MATRIX_UAT !== "1") return;
    const written = writeUatReport();
    console.log(`UAT report ${written.mdPath} (${written.count} rows)`);
  });

  test("Case 1 — FEFO on SUM, GTO, RTN, ADJ, GTI", async ({ page }, testInfo) => {
    test.setTimeout(20 * 60_000);
    const cfg = getWorkflowEnv();
    const itemA = await resolveOnPage(page, "/stock-usage-memo/add", cfg.itemCode);
    const itemB = cfg.itemCode2 || itemA;
    const sites = [outletSite(), hqSite];
    const codes = [itemA, itemB];

    await postMenu(page, testInfo, {
      caseId: "1-fefo",
      menu: "SUM",
      itemCode: itemA,
      codes,
      sites,
      run: (ref) => postSum(page, { itemCode: itemA, ref, mode: "fefo" }),
      listPath: "/stock-usage-memo",
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "1-fefo",
      menu: "GTO",
      itemCode: itemB,
      codes,
      sites,
      run: (ref) =>
        postGto(page, {
          itemCode: itemA,
          ref,
          toOutlet: cfg.toOutlet || cfg.hqOutlet,
          mode: "fefo",
        }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "1-fefo",
      menu: "RTN",
      itemCode: itemA,
      codes,
      sites,
      run: (ref) =>
        postRtn(page, { itemCode: itemA, ref, supplier: cfg.supplier || null, mode: "fefo" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "1-fefo",
      menu: "ADJ",
      itemCode: itemB,
      codes,
      sites,
      run: (ref) => postAdj(page, { itemCode: itemB, ref, mode: "fefo" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemB] }),
    });

    await postMenu(page, testInfo, {
      caseId: "1-fefo",
      menu: "GTI",
      itemCode: itemA,
      codes,
      sites,
      run: (ref) =>
        postGti(page, { itemCode: itemA, ref, fromOutlet: cfg.hqOutlet, mode: "fefo" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });
  });

  test("Case 2 — specific batch on SUM, GTO, RTN, ADJ, GTI, plus GRN receive", async ({
    page,
  }, testInfo) => {
    test.setTimeout(22 * 60_000);
    const cfg = getWorkflowEnv();
    const itemA = cfg.itemCode;
    const itemB = cfg.itemCode2 || itemA;
    const sites = [outletSite(), hqSite];
    const codes = [itemA, itemB];

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "SUM",
      codes,
      sites,
      run: (ref) => postSum(page, { itemCode: itemA, ref, mode: "specific" }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "GTO",
      codes,
      sites,
      run: (ref) =>
        postGto(page, {
          itemCode: itemA,
          ref,
          toOutlet: cfg.toOutlet || cfg.hqOutlet,
          mode: "specific",
        }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "RTN",
      codes,
      sites,
      run: (ref) =>
        postRtn(page, { itemCode: itemA, ref, supplier: cfg.supplier || null, mode: "specific" }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "ADJ",
      codes,
      sites,
      run: (ref) => postAdj(page, { itemCode: itemB, ref, mode: "specific" }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemB] }),
    });

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "GTI",
      codes,
      sites,
      run: (ref) =>
        postGti(page, { itemCode: itemA, ref, fromOutlet: cfg.hqOutlet, mode: "specific" }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemA] }),
    });

    await postMenu(page, testInfo, {
      caseId: "2-specific",
      menu: "GRN",
      codes,
      sites,
      note: "inbound new batch",
      run: (ref) => postGrnNewBatch(page, { cfg, itemCode: itemA, ref }),
      assert: (lines) => {
        expect(lines.length).toBeGreaterThanOrEqual(1);
      },
    });
  });

  test("Case 3 — PR two lines: FEFO + specific, HQ approve posts GTI", async ({
    page,
  }, testInfo) => {
    test.setTimeout(18 * 60_000);
    const cfg = getWorkflowEnv();
    const hqOutlet = String(process.env.E2E_HQ_OUTLET || "ZEHQ").trim();
    const itemA = cfg.itemCode;
    const itemB = cfg.itemCode2;
    expect(itemB, "E2E_ITEM_CODE_2 required").toBeTruthy();
    const codes = [itemA, itemB];
    const sites = [outletSite(), hqSite];

    const ref = makeE2eRef();
    const before = await snapshotOnHand(codes, sites);
    const batchesBefore = await snapshotBatches(codes, sites);

    await postPurchaseRequisitionAtOutlet(page, { itemCodes: codes, qty: 1, ref });
    let req = await fetchReqByRef(ref);
    expect(req?.reqNo).toBeTruthy();

    await logoutTestUser(page);
    await loginAsTestUser(page, { outlet: hqOutlet, siteCode: hqSite });
    await requireBatchNoUser(page, test);

    await openPostedPrForApproval(page, ref, req.reqNo);
    await selectSpecificBatchOnPrLine(page, itemB);
    await approvePrFromApprovalScreen(page);

    await expect
      .poll(async () => (await fetchReqByRef(ref))?.reqStatus, { timeout: 180_000 })
      .toMatch(/Approved/i);
    req = await fetchReqByRef(ref);

    const gtiHdr = await fetchGtiHeaderByPrRef(req.reqNo);
    expect(gtiHdr?.docNo).toBeTruthy();
    const lines = await fetchStkMovdocLines(gtiHdr.docNo);
    expectFefoLinesHaveMemo2(lines, expect, { minFefoLines: 1, itemCodes: [itemA] });
    expectSpecificLinesHaveMemo2(lines, expect, { minSpecificLines: 1, itemCodes: [itemB] });

    const after = await snapshotOnHand(codes, sites);
    recordUatRow({
      caseId: "3-pr-mixed",
      menu: "PR→GTI",
      ref,
      docNo: `${req.reqNo} → ${gtiHdr.docNo}`,
      docStatus: gtiHdr.docStatus,
      movCode: gtiHdr.movCode,
      lines: summarizeDocLines(lines),
      stockBefore: before,
      stockAfter: after,
      batchesBefore,
      batchesAfter: await snapshotBatches(codes, sites),
      note: `${itemA} FEFO, ${itemB} specific`,
    });
    testInfo.annotations.push({
      type: "doc",
      description: `PR ${req.reqNo} → GTI ${gtiHdr.docNo}`,
    });
  });

  test("Retry — specific ADJ only", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    const itemB = cfg.itemCode2 || cfg.itemCode;
    const codes = [cfg.itemCode, itemB];
    const sites = [outletSite(), hqSite];
    await postMenu(page, testInfo, {
      caseId: "2-specific-retry",
      menu: "ADJ",
      codes,
      sites,
      run: (ref) => postAdj(page, { itemCode: itemB, ref, mode: "specific" }),
      assert: (lines) =>
        expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [itemB] }),
    });
  });

  test("Case 4 — PR all specific, then external PR posted as GRN", async ({
    page,
  }, testInfo) => {
    test.setTimeout(22 * 60_000);
    const cfg = getWorkflowEnv();
    const hqOutlet = String(process.env.E2E_HQ_OUTLET || "ZEHQ").trim();
    const itemA = cfg.itemCode;
    const itemB = cfg.itemCode2 || itemA;
    const codes = [itemA, itemB];
    const sites = [outletSite(), hqSite];

    {
      const ref = makeE2eRef();
      const before = await snapshotOnHand(codes, sites);
      const batchesBefore = await snapshotBatches(codes, sites);
      await postPurchaseRequisitionAtOutlet(page, { itemCodes: codes, qty: 1, ref });
      let req = await fetchReqByRef(ref);
      expect(req?.reqNo).toBeTruthy();

      await logoutTestUser(page);
      await loginAsTestUser(page, { outlet: hqOutlet, siteCode: hqSite });
      await requireBatchNoUser(page, test);
      await openPostedPrForApproval(page, ref, req.reqNo);
      await selectSpecificBatchOnPrLine(page, itemA);
      await selectSpecificBatchOnPrLine(page, itemB);
      await approvePrFromApprovalScreen(page);

      await expect
        .poll(async () => (await fetchReqByRef(ref))?.reqStatus, { timeout: 180_000 })
        .toMatch(/Approved/i);
      req = await fetchReqByRef(ref);
      const gtiHdr = await fetchGtiHeaderByPrRef(req.reqNo);
      expect(gtiHdr?.docNo).toBeTruthy();
      const lines = await fetchStkMovdocLines(gtiHdr.docNo);
      expectSpecificLinesHaveMemo2(lines, expect, {
        minSpecificLines: 2,
        itemCodes: codes,
      });
      recordUatRow({
        caseId: "4-pr-all-specific",
        menu: "PR→GTI",
        ref,
        docNo: `${req.reqNo} → ${gtiHdr.docNo}`,
        docStatus: gtiHdr.docStatus,
        movCode: gtiHdr.movCode,
        lines: summarizeDocLines(lines),
        stockBefore: before,
        stockAfter: await snapshotOnHand(codes, sites),
        batchesBefore,
        batchesAfter: await snapshotBatches(codes, sites),
        note: "both lines specific",
      });
      testInfo.annotations.push({
        type: "doc",
        description: `all-specific PR ${req.reqNo} → GTI ${gtiHdr.docNo}`,
      });
    }

    await logoutTestUser(page);
    await loginAsTestUser(page);
    await requireBatchNoUser(page, test);

    {
      const ref = makeE2eRef();
      const before = await snapshotOnHand([itemA], sites);
      await postPurchaseRequisitionAtOutlet(page, {
        itemCodes: [itemA],
        qty: 1,
        ref,
        externalSupplier: true,
      });
      let req = await fetchReqByRef(ref);
      expect(req?.reqNo).toBeTruthy();

      await logoutTestUser(page);
      await loginAsTestUser(page, { outlet: hqOutlet, siteCode: hqSite });
      await requireBatchNoUser(page, test);
      await openPostedPrForApproval(page, ref, req.reqNo);
      await approvePrFromApprovalScreen(page);

      await expect
        .poll(async () => (await fetchReqByRef(ref))?.reqStatus, { timeout: 180_000 })
        .toMatch(/Approved/i);
      req = await fetchReqByRef(ref);
      const openGrn = await fetchGrnHeaderByPrRef(req.reqNo);
      expect(openGrn?.docNo).toBeTruthy();
      expect(String(openGrn.docStatus)).toMatch(/^0$|open/i);

      await logoutTestUser(page);
      await loginAsTestUser(page);
      await requireBatchNoUser(page, test);

      const batchNo = `${String(cfg.batchNo || "E2E").slice(0, 6)}${String(Date.now()).slice(-4)}`;
      await page.goto(`/goods-receive-note/details/${encodeURIComponent(openGrn.docNo)}`);
      await page
        .getByRole("heading", { name: /Goods Receive/i })
        .waitFor({ state: "visible", timeout: 45_000 });
      await page.waitForTimeout(1500);
      await ensureNewBatchOnCart(page, batchNo);
      await clickGrnPost(page);

      const posted = await fetchStkMovdocHeader(openGrn.docNo);
      expect(String(posted?.docStatus)).toMatch(/^7$|posted/i);
      const lines = await fetchStkMovdocLines(openGrn.docNo);
      const hqBefore = before[hqSite]?.[itemA.replace(/0000$/, "")]?.trnBalqty;
      const after = await snapshotOnHand([itemA], sites);
      const hqAfter = after[hqSite]?.[itemA.replace(/0000$/, "")]?.trnBalqty;
      recordUatRow({
        caseId: "4-pr-external-grn",
        menu: "PR→GRN",
        ref,
        docNo: `${req.reqNo} → ${openGrn.docNo}`,
        docStatus: posted?.docStatus,
        movCode: posted?.movCode,
        lines: summarizeDocLines(lines),
        stockBefore: before,
        stockAfter: after,
        note: `outlet posted GRN; HQ on-hand ${hqBefore} → ${hqAfter}`,
      });
      expect(hqAfter, "HQ on-hand should stay unchanged for external GRN").toBe(hqBefore);
      testInfo.annotations.push({
        type: "doc",
        description: `external PR ${req.reqNo} → posted GRN ${openGrn.docNo}`,
      });
    }
  });
});

async function resolveOnPage(page, path, itemCode) {
  await page.goto(path);
  await waitForAppReady(page);
  return resolveItemCode(page, itemCode);
}

async function postMenu(page, testInfo, { caseId, menu, codes, sites, run, assert, note }) {
  const ref = makeE2eRef();
  const before = await snapshotOnHand(codes, sites);
  const batchesBefore = await snapshotBatches(codes, sites);
  let docNo;
  try {
    docNo = await run(ref);
  } catch (err) {
    const msg = String(err?.message || err).split("\n")[0];
    recordUatRow({
      caseId,
      menu,
      ref,
      docNo: "",
      docStatus: "not posted",
      lines: [],
      stockBefore: before,
      stockAfter: before,
      note: msg,
    });
    expect.soft(false, `${menu}: ${msg}`).toBeTruthy();
    return;
  }
  const hdr = await fetchStkMovdocHeader(docNo);
  const rawLines = await fetchStkMovdocLines(docNo);
  expect(String(hdr?.docStatus || ""), `${menu} ${docNo} posted`).toMatch(/^7$|posted/i);
  let assertNote = note || "";
  if (assert) {
    try {
      assert(rawLines);
    } catch (err) {
      const msg = String(err?.message || err).split("\n")[0];
      assertNote = [assertNote, msg].filter(Boolean).join(" | ");
      expect.soft(false, `${menu} ${docNo}: ${msg}`).toBeTruthy();
    }
  }
  const after = await snapshotOnHand(codes, sites);
  recordUatRow({
    caseId,
    menu,
    ref,
    docNo,
    docStatus: hdr?.docStatus,
    movCode: hdr?.movCode,
    lines: summarizeDocLines(rawLines),
    stockBefore: before,
    stockAfter: after,
    batchesBefore,
    batchesAfter: await snapshotBatches(codes, sites),
    note: assertNote,
  });
  testInfo.annotations.push({ type: "doc", description: `${menu} ${docNo} ref ${ref}` });
}

async function postGrnNewBatch(page, { cfg, itemCode, ref }) {
  await page.goto("/goods-receive-note/add");
  await page.getByRole("heading", { name: /Add Goods Receive Note/i }).waitFor({ state: "visible" });
  await waitForAppReady(page);
  await page.getByPlaceholder("Enter GR Ref 1").fill(ref);
  await selectComboboxByLabel(page, "Supply No", cfg.supplier || null);
  await page
    .locator("div.space-y-2")
    .filter({ hasText: "Delivery Date" })
    .locator('input[type="date"]')
    .fill(todayISO());
  await page.getByPlaceholder("Enter term").fill(cfg.term || "30");
  await page.getByPlaceholder("Enter remarks").fill("E2E_TEST specific-receive");
  await searchAndAddItem(page, { itemCode, qty: "1", price: cfg.price || "1" });
  const batchNo = `${String(cfg.batchNo || "E2E").slice(0, 6)}${String(Date.now()).slice(-4)}`;
  await ensureNewBatchOnCart(page, batchNo);
  await clickSaveOrPost(page, "post", {
    listPath: "/goods-receive-note",
    successRe: /Posted successfully|Created successfully/i,
    errorRe: /Failed to (post|create|update)/i,
  });
  return findPostedDocNoByRef(page, "/goods-receive-note", ref);
}
