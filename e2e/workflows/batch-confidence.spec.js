import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { requireBatchNoUser } from "../helpers/batchUser.js";
import {
  getWorkflowEnv,
  makeE2eRef,
} from "../helpers/stockDoc.js";
import { postGto, postAdj } from "../helpers/outboundFefo.js";
import {
  fetchStkMovdocHeader,
  fetchStkMovdocLines,
  snapshotOnHand,
  snapshotBatches,
  summarizeDocLines,
  expectFefoLinesHaveMemo2,
  expectSpecificLinesHaveMemo2,
} from "../helpers/loopbackRead.js";
import { recordUatRow, writeUatReport } from "../helpers/uatReport.js";

/**
 * Extra posts that the first matrix did not cover:
 * GTO of 11600012, negative ADJ, and two more FEFO ADJ memos.
 * Also checks ItemBatches qty for the batch named in ordMemo2.
 */
test.describe("Batch confidence — GTO 11600012, negative ADJ, memo repeat", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_MATRIX_UAT !== "1",
      "Set E2E_RUN_MATRIX_UAT=1 in e2e/.env"
    );
    await loginAsTestUser(page);
    const flags = await requireBatchNoUser(page, test);
    testInfo.annotations.push({
      type: "user-flags",
      description: `batchNo=${flags.batchNo}`,
    });
  });

  test.afterAll(() => {
    if (process.env.E2E_RUN_MATRIX_UAT !== "1") return;
    const written = writeUatReport();
    console.log(`UAT report ${written.mdPath} (${written.count} rows)`);
  });

  test("GTO both modes, negative ADJ, two FEFO ADJ", async ({ page }, testInfo) => {
    test.setTimeout(18 * 60_000);
    const cfg = getWorkflowEnv();
    const item = cfg.itemCode2 || "11600012";
    const codes = [item];
    const sites = [process.env.E2E_SITE_CODE || "ZE01", "ZEHQ"];
    const toOutlet = cfg.toOutlet || cfg.hqOutlet;

    await postChecked(page, testInfo, {
      caseId: "5-gto-fefo",
      menu: "GTO",
      item,
      codes,
      sites,
      expectMove: { outlet: -1, hq: 1, batchOutlet: -1, batchHq: 1 },
      run: (ref) => postGto(page, { itemCode: item, ref, toOutlet, mode: "fefo" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });

    await postChecked(page, testInfo, {
      caseId: "5-gto-specific",
      menu: "GTO",
      item,
      codes,
      sites,
      expectMove: { outlet: -1, hq: 1, batchOutlet: -1, batchHq: 1 },
      run: (ref) => postGto(page, { itemCode: item, ref, toOutlet, mode: "specific" }),
      assert: (lines) => expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });
  });

  test("specific negative ADJ only", async ({ page }, testInfo) => {
    test.setTimeout(8 * 60_000);
    const cfg = getWorkflowEnv();
    const item = cfg.itemCode2 || "11600012";
    const codes = [item];
    const sites = [process.env.E2E_SITE_CODE || "ZE01", "ZEHQ"];
    await postChecked(page, testInfo, {
      caseId: "5-adj-specific-neg",
      menu: "ADJ",
      item,
      codes,
      sites,
      expectMove: { outlet: -1, hq: 0, batchOutlet: -1, batchHq: 0 },
      run: (ref) => postAdj(page, { itemCode: item, ref, mode: "specific", qty: "-1" }),
      assert: (lines) => expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });
  });

  test("negative ADJ memo and two FEFO repeats", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60_000);
    const cfg = getWorkflowEnv();
    const item = cfg.itemCode2 || "11600012";
    const codes = [item];
    const sites = [process.env.E2E_SITE_CODE || "ZE01", "ZEHQ"];

    await postChecked(page, testInfo, {
      caseId: "5-adj-fefo-neg-memo",
      menu: "ADJ",
      item,
      codes,
      sites,
      expectMove: { outlet: -1, hq: 0, batchOutlet: -1, batchHq: 0 },
      run: (ref) => postAdj(page, { itemCode: item, ref, mode: "fefo", qty: "-1" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });

    await postChecked(page, testInfo, {
      caseId: "5-adj-specific-neg",
      menu: "ADJ",
      item,
      codes,
      sites,
      expectMove: { outlet: -1, hq: 0, batchOutlet: -1, batchHq: 0 },
      run: (ref) => postAdj(page, { itemCode: item, ref, mode: "specific", qty: "-1" }),
      assert: (lines) => expectSpecificLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });

    await postChecked(page, testInfo, {
      caseId: "5-adj-fefo-repeat-1",
      menu: "ADJ",
      item,
      codes,
      sites,
      expectMove: { outlet: 1, hq: 0, batchOutlet: 1, batchHq: 0 },
      run: (ref) => postAdj(page, { itemCode: item, ref, mode: "fefo", qty: "1" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });

    await postChecked(page, testInfo, {
      caseId: "5-adj-fefo-repeat-2",
      menu: "ADJ",
      item,
      codes,
      sites,
      expectMove: { outlet: 1, hq: 0, batchOutlet: 1, batchHq: 0 },
      run: (ref) => postAdj(page, { itemCode: item, ref, mode: "fefo", qty: "1" }),
      assert: (lines) => expectFefoLinesHaveMemo2(lines, expect, { itemCodes: [item] }),
    });
  });
});

async function postChecked(
  page,
  testInfo,
  { caseId, menu, item, codes, sites, run, assert, expectMove }
) {
  const ref = makeE2eRef();
  const outlet = sites[0];
  const hq = sites[1];
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
    expect.soft(false, `${menu} ${caseId}: ${msg}`).toBeTruthy();
    return;
  }

  const hdr = await fetchStkMovdocHeader(docNo);
  const rawLines = await fetchStkMovdocLines(docNo);
  const after = await snapshotOnHand(codes, sites);
  const batchesAfter = await snapshotBatches(codes, sites);
  const line = rawLines.find((l) => String(l.itemcode || "").includes(item)) || rawLines[0];
  const batchNo = String(line?.ordMemo2 || "").split(":")[0];
  const outletOn = delta(before, after, outlet, item);
  const hqOn = delta(before, after, hq, item);
  const outletBatch = batchDelta(batchesBefore, batchesAfter, outlet, item, batchNo);
  const hqBatch = batchDelta(batchesBefore, batchesAfter, hq, item, batchNo);
  const note = [
    `onHand outlet ${outletOn} hq ${hqOn}`,
    batchNo ? `batch ${batchNo} outlet ${outletBatch} hq ${hqBatch}` : "no batch in memo2",
  ].join("; ");

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
    batchesAfter,
    note,
  });
  testInfo.annotations.push({ type: "doc", description: `${caseId} ${docNo} ${note}` });

  expect(String(hdr?.docStatus || ""), `${docNo} posted`).toMatch(/^7$/);
  if (assert) assert(rawLines);
  expect(outletOn, `${caseId} outlet on-hand`).toBe(expectMove.outlet);
  expect(hqOn, `${caseId} HQ on-hand`).toBe(expectMove.hq);
  expect(batchNo, `${caseId} ordMemo2 batch`).toBeTruthy();
  expect(outletBatch, `${caseId} outlet batch ${batchNo}`).toBe(expectMove.batchOutlet);
  expect(hqBatch, `${caseId} HQ batch ${batchNo}`).toBe(expectMove.batchHq);
  expect(String(line?.ordMemo4 || ""), `${caseId} ordMemo4`).toMatch(/\d{4}-\d{2}-\d{2}:-?\d+/);
}

function delta(before, after, site, item) {
  const a = before?.[site]?.[item]?.trnBalqty;
  const b = after?.[site]?.[item]?.trnBalqty;
  if (a == null || b == null) return null;
  return b - a;
}

function batchDelta(before, after, site, item, batchNo) {
  if (!batchNo) return null;
  const pick = (snap) => {
    const rows = snap?.[site]?.[item] || [];
    const row = rows.find((r) => String(r.batchNo || "") === batchNo);
    return row ? Number(row.qty) : null;
  };
  const a = pick(before);
  const b = pick(after);
  if (a == null || b == null) return null;
  return b - a;
}
