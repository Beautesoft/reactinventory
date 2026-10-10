import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "../helpers/auth.js";
import { requireBatchNoUser } from "../helpers/batchUser.js";
import { getWorkflowEnv, makeE2eRef } from "../helpers/stockDoc.js";
import { postSum } from "../helpers/outboundFefo.js";
import { postGrnWithNewBatch } from "../helpers/grn.js";
import {
  fetchStkMovdocHeader,
  fetchStkMovdocLines,
  snapshotOnHand,
  snapshotBatches,
  summarizeDocLines,
  parseOrdMemo2Pairs,
} from "../helpers/loopbackRead.js";
import { recordUatRow, writeUatReport } from "../helpers/uatReport.js";

/**
 * One line, qty 3, FEFO consumes earliest batch first then the next (ordMemo2 has 2+ pairs).
 */
test.describe("Batch split — SUM FEFO multi-batch", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      process.env.E2E_RUN_MATRIX_UAT !== "1",
      "Set E2E_RUN_MATRIX_UAT=1 in e2e/.env"
    );
    await loginAsTestUser(page);
    await requireBatchNoUser(page, test);
  });

  test.afterAll(() => {
    if (process.env.E2E_RUN_MATRIX_UAT !== "1") return;
    const written = writeUatReport();
    console.log(`UAT report ${written.mdPath} (${written.count} rows)`);
  });

  test("GRN second batch then SUM qty 3 splits ordMemo2", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60_000);
    const cfg = getWorkflowEnv();
    const item = cfg.itemCode2 || "11600012";
    const outlet = process.env.E2E_SITE_CODE || "ZE01";
    const hq = "ZEHQ";
    const useQty = 3;

    const secondBatch = `E2E${String(Date.now()).slice(-5)}`;
    const grn = await postGrnWithNewBatch(page, {
      cfg,
      itemCode: item,
      qty: 2,
      batchNo: secondBatch,
      ref: makeE2eRef(),
    });
    testInfo.annotations.push({
      type: "setup",
      description: `GRN ${grn.docNo} batch ${grn.batchNo}`,
    });

    const ref = makeE2eRef();
    const before = await snapshotOnHand([item], [outlet, hq]);
    const batchesBefore = await snapshotBatches([item], [outlet, hq]);

    const docNo = await postSum(page, {
      itemCode: item,
      ref,
      mode: "fefo",
      qty: String(useQty),
      remark: "E2E_TEST fefo split",
    });

    const hdr = await fetchStkMovdocHeader(docNo);
    const lines = await fetchStkMovdocLines(docNo);
    const after = await snapshotOnHand([item], [outlet, hq]);
    const batchesAfter = await snapshotBatches([item], [outlet, hq]);

    const line =
      lines.find((l) => String(l.itemcode || "").includes(item)) || lines[0];
    const pairs = parseOrdMemo2Pairs(line?.ordMemo2);
    const realBatches = pairs.filter((p) => !/^NOBATCH$/i.test(p.batch));

    expect(String(hdr?.docStatus)).toMatch(/^7$/);
    expect(Number(line?.docQty)).toBe(useQty);
    expect(realBatches.length, "need 2+ real batches in ordMemo2").toBeGreaterThanOrEqual(2);
    expect(pairs.reduce((s, p) => s + p.qty, 0)).toBe(useQty);

    const outletDelta = after[outlet][item].trnBalqty - before[outlet][item].trnBalqty;
    const hqDelta = after[hq][item].trnBalqty - before[hq][item].trnBalqty;
    expect(outletDelta).toBe(-useQty);
    expect(hqDelta).toBe(0);

    for (const { batch, qty } of pairs) {
      if (/^NOBATCH$/i.test(batch)) continue;
      const bBefore = batchQty(batchesBefore, outlet, item, batch);
      const bAfter = batchQty(batchesAfter, outlet, item, batch);
      if (bBefore != null && bAfter != null) {
        expect(bAfter - bBefore, `batch ${batch}`).toBe(-qty);
      }
    }

    const note = `memo2=${line.ordMemo2}; outlet ${outletDelta}; batches=${realBatches
      .map((p) => `${p.batch}:${p.qty}`)
      .join("+")}`;
    recordUatRow({
      caseId: "6-sum-fefo-split",
      menu: "SUM",
      ref,
      docNo,
      docStatus: hdr?.docStatus,
      movCode: hdr?.movCode,
      lines: summarizeDocLines(lines),
      stockBefore: before,
      stockAfter: after,
      batchesBefore,
      batchesAfter,
      note,
    });
    testInfo.annotations.push({ type: "doc", description: `${docNo} ${note}` });
  });
});

function batchQty(snap, site, item, batchNo) {
  const rows = snap?.[site]?.[item] || [];
  const row = rows.find((r) => String(r.batchNo || "") === batchNo);
  return row ? Number(row.qty) : null;
}
