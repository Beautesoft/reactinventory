import { test, expect } from "@playwright/test";
import { loginAsTestUser, logoutTestUser } from "../helpers/auth.js";
import { requireBatchNoUser } from "../helpers/batchUser.js";
import { getWorkflowEnv, makeE2eRef } from "../helpers/stockDoc.js";
import {
  fetchReqByRef,
  fetchGrnHeaderByPrRef,
  fetchStkMovdocLines,
} from "../helpers/loopbackRead.js";
import {
  postPurchaseRequisitionAtOutlet,
  openPostedPrForApproval,
  approvePrFromApprovalScreen,
} from "../helpers/pr.js";

/**
 * Non-HQ PR → HQ approve → open GRN at requesting outlet (no HQ stock move until outlet posts).
 */
test.describe("PR external supplier → GRN on approve", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_PR_EXTERNAL_GRN !== "1",
      "Set E2E_RUN_PR_EXTERNAL_GRN=1 in e2e/.env"
    );
    await loginAsTestUser(page);
    const flags = await requireBatchNoUser(page, test);
    testInfo.annotations.push({
      type: "user-flags",
      description: `batchNo=${flags.batchNo}`,
    });
  });

  test("outlet PR (non-HQ) → HQ approve → GRN at ZE01", async ({ page }, testInfo) => {
    test.setTimeout(12 * 60_000);
    const cfg = getWorkflowEnv();
    const hqOutlet = String(process.env.E2E_HQ_OUTLET || "ZEHQ").trim();
    const siteCode = String(process.env.E2E_SITE_CODE || "ZE01").trim();

    const ref = makeE2eRef();
    const { itemCodes } = await postPurchaseRequisitionAtOutlet(page, {
      itemCodes: [cfg.itemCode],
      qty: 1,
      ref,
      externalSupplier: true,
    });
    expect(itemCodes.length).toBeGreaterThanOrEqual(1);

    let req = await fetchReqByRef(ref);
    expect(req?.reqNo).toBeTruthy();
    expect(String(req.reqStatus)).toMatch(/Posted/i);
    const outletSite = String(req.itemsiteCode || siteCode).trim();
    testInfo.annotations.push({
      type: "pr",
      description: `${req.reqNo} @ ${outletSite}`,
    });

    await logoutTestUser(page);
    await loginAsTestUser(page, { outlet: hqOutlet, siteCode: "ZEHQ" });
    await requireBatchNoUser(page, test);

    await openPostedPrForApproval(page, ref, req.reqNo);
    await approvePrFromApprovalScreen(page);

    await expect
      .poll(async () => (await fetchReqByRef(ref))?.reqStatus, {
        timeout: 120_000,
      })
      .toMatch(/Approved/i);

    req = await fetchReqByRef(ref);
    const grnHdr = await fetchGrnHeaderByPrRef(req.reqNo);
    expect(grnHdr?.docNo, "GRN header linked to PR").toBeTruthy();
    expect(String(grnHdr.movCode || "").toUpperCase()).toBe("GRN");
    expect(String(grnHdr.storeNo || "").trim()).toBe(outletSite);
    expect(String(grnHdr.docRef1 || "").trim()).toBe(String(req.reqNo).trim());
    expect(String(grnHdr.docRemk1 || "")).toMatch(/Created from PR/i);
    expect(String(grnHdr.docStatus)).toMatch(/^0$|open/i);

    const lines = await fetchStkMovdocLines(grnHdr.docNo);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const wantCode = itemCodes[0].replace(/0000$/, "");
    const hasItem = lines.some((l) =>
      String(l.itemcode || "").replace(/0000$/, "").includes(wantCode)
    );
    expect(hasItem).toBeTruthy();

    testInfo.annotations.push({
      type: "doc",
      description: `PR ${req.reqNo} → GRN ${grnHdr.docNo} (open)`,
    });
  });
});
