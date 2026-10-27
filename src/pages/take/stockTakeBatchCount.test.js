import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConfirmedStockTakeBatches,
  reconcileStockTakePost,
  stockTakeCountedMemo,
  stockTakeSystemQty,
} from "./stockTakeBatchCount.js";

const reportedBatches = [
  { batchNo: "A04", availableQty: 0, countedQty: 0, expDate: "2025-11-01" },
  { batchNo: "E2E5745", availableQty: 1, countedQty: 3, expDate: "2027-07-27" },
  { batchNo: "A01", availableQty: 2, countedQty: 0, expDate: "2025-11-29" },
];

test("emptying A01 keeps the zero and drops a batch that was already empty", () => {
  const rows = buildConfirmedStockTakeBatches(reportedBatches, {
    availableQty: 97,
    countedQty: 97,
  });

  assert.deepEqual(
    rows.map((row) => [row.batchNo, row.countedQty, row.availableQty]),
    [
      ["E2E5745", 3, 1],
      ["A01", 0, 2],
      ["", 97, 97],
    ]
  );
  assert.equal(
    stockTakeCountedMemo(rows.filter((row) => row.batchNo)),
    "E2E5745:3,A01:0"
  );
  assert.equal(stockTakeSystemQty(100, rows), 100);
});

test("system quantity stays at the on-hand figure when a zero batch was dropped", () => {
  const partial = buildConfirmedStockTakeBatches(
    reportedBatches.filter((batch) => batch.batchNo !== "A01"),
    { availableQty: 97, countedQty: 97 }
  );
  assert.equal(stockTakeSystemQty(100, partial), 100);
});

test("emptying No Batch is stored as a zero count", () => {
  const rows = buildConfirmedStockTakeBatches(
    [{ batchNo: "E2E5745", availableQty: 1, countedQty: 98, expDate: null }],
    { availableQty: 97, countedQty: 0 }
  );
  const noBatch = rows.find((row) => row.batchNo === "");
  assert.equal(noBatch.countedQty, 0);
  assert.equal(noBatch.availableQty, 97);
});

test("a shelf counted as zero keeps every batch that still has stock", () => {
  const rows = buildConfirmedStockTakeBatches(
    [
      { batchNo: "A04", availableQty: 0, countedQty: 0 },
      { batchNo: "E2E5745", availableQty: 1, countedQty: 0 },
      { batchNo: "A01", availableQty: 2, countedQty: 0 },
    ],
    { availableQty: 97, countedQty: 0 }
  );
  assert.deepEqual(
    rows.map((row) => row.batchNo),
    ["E2E5745", "A01", ""]
  );
  assert.ok(rows.every((row) => row.countedQty === 0));
});

test("posting the reported count moves 2 off A01 and onto E2E5745", () => {
  const details = reconcileStockTakePost({
    countedNamed: [
      { batchNo: "E2E5745", countedQty: 3, expDate: "2027-07-27" },
    ],
    noBatchCounted: 97,
    liveBatches: [
      { batchNo: "A04", qty: 0, expDate: "2025-11-01" },
      { batchNo: "E2E5745", qty: 1, expDate: "2027-07-27" },
      { batchNo: "A01", qty: 2, expDate: "2025-11-29" },
      { batchNo: "", qty: 97, expDate: null },
    ],
    expiryTracking: true,
  });

  const byBatch = Object.fromEntries(
    details.map((row) => [row.batchNo || "none", row.variance])
  );
  assert.equal(byBatch.E2E5745, 2);
  assert.equal(byBatch.A01, -2);
  assert.equal(byBatch.none, 0);
  assert.equal(
    details.reduce((sum, row) => sum + row.variance, 0),
    0
  );
  assert.equal(byBatch.A04, undefined);
});

test("an explicit A01 zero is posted once", () => {
  const details = reconcileStockTakePost({
    countedNamed: [
      { batchNo: "E2E5745", countedQty: 3, expDate: "2027-07-27" },
      { batchNo: "A01", countedQty: 0, expDate: "2025-11-29" },
    ],
    noBatchCounted: 97,
    liveBatches: [
      { batchNo: "E2E5745", qty: 1, expDate: "2027-07-27" },
      { batchNo: "A01", qty: 2, expDate: "2025-11-29" },
      { batchNo: "", qty: 60, expDate: null },
      { batchNo: null, qty: 37, expDate: null },
    ],
    expiryTracking: true,
  });

  const a01 = details.filter((row) => row.batchNo === "A01");
  assert.equal(a01.length, 1);
  assert.equal(a01[0].variance, -2);
  const noBatch = details.find((row) => row.batchNo === "");
  assert.equal(noBatch.systemQty, 97);
  assert.equal(noBatch.variance, 0);
});

test("emptying No Batch posts the full reduction", () => {
  const details = reconcileStockTakePost({
    countedNamed: [{ batchNo: "E2E5745", countedQty: 98 }],
    noBatchCounted: 0,
    liveBatches: [
      { batchNo: "E2E5745", qty: 1 },
      { batchNo: "", qty: 97 },
    ],
    expiryTracking: false,
  });
  assert.equal(details.find((row) => row.batchNo === "E2E5745").variance, 97);
  assert.equal(details.find((row) => row.batchNo === "").variance, -97);
});

test("a zero item count clears every live batch", () => {
  const details = reconcileStockTakePost({
    countedNamed: [],
    noBatchCounted: 0,
    liveBatches: [
      { batchNo: "A01", qty: 2, expDate: "2025-11-29" },
      { batchNo: "E2E5745", qty: 1, expDate: "2027-07-27" },
      { batchNo: "", qty: 97 },
    ],
    expiryTracking: true,
  });
  assert.equal(
    details.reduce((sum, row) => sum + row.variance, 0),
    -100
  );
  assert.ok(details.every((row) => row.countedQty === 0));
});

test("a different expiry of a counted batch is cleared when it was not in the count", () => {
  const details = reconcileStockTakePost({
    countedNamed: [{ batchNo: "A01", countedQty: 2, expDate: "2025-11-29" }],
    noBatchCounted: 0,
    liveBatches: [
      { batchNo: "A01", qty: 2, expDate: "2025-11-29" },
      { batchNo: "A01", qty: 4, expDate: "2026-01-01" },
    ],
    expiryTracking: true,
  });
  const kept = details.find((row) => row.expDate === "2025-11-29");
  const other = details.find((row) => row.expDate === "2026-01-01");
  assert.equal(kept.variance, 0);
  assert.equal(other.variance, -4);
});

test("without an expiry on the count, sibling rows of that batch are left alone", () => {
  const details = reconcileStockTakePost({
    countedNamed: [{ batchNo: "A01", countedQty: 2, expDate: null }],
    noBatchCounted: 0,
    liveBatches: [
      { batchNo: "A01", qty: 2, expDate: "2025-11-29" },
      { batchNo: "A01", qty: 4, expDate: "2026-01-01" },
    ],
    expiryTracking: true,
  });
  assert.equal(details.length, 1);
  assert.equal(details[0].variance, 0);
});
