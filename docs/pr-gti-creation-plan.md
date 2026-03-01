# PR Approval: Create GTI Instead of GTO – Implementation Plan

## 1. Overview

**Change:** When PR is approved at HQ (supplier = HQ), create a **GTI (Goods Transfer In)** at the destination store instead of a **GTO (Goods Transfer Out)** at HQ.

**Rationale:** Destination is where goods are received and verified. GTI at destination gives the receiving store ownership of the document and aligns with the physical flow.

---

## 2. AUTO_POST: On vs Off – Cases Explained

### 2.1 GTO (Current Design)

| AUTO_POST | Who Posts | Source (HQ) | Destination | Steps |
|-----------|-----------|-------------|-------------|-------|
| **On** (default) | HQ posts GTO | ✅ Reduced | ✅ Increased | 1 step |
| **Off** | HQ posts GTO | ✅ Reduced | ❌ Not updated | 2 steps: HQ posts GTO, then destination must post GTI (but no GTI is created – gap) |

### 2.2 GTI (New Design)

| AUTO_POST | Who Posts | Source (HQ) | Destination | Steps |
|-----------|-----------|-------------|-------------|-------|
| **On** (default) | Destination posts GTI | ✅ Reduced | ✅ Increased | 1 step |
| **Off** | Destination posts GTI | ❌ Not updated | ❌ Not updated | GTI posting block is skipped – **no stock movement** |

### 2.3 Important Note on GTI + AUTO_POST = Off

In the current GTI posting logic (`addGti.jsx`), the entire Stktrns/ItemBatches update block is inside `if (getConfigValue('AUTO_POST') === "Yes")`. When AUTO_POST = Off, GTI posting does **nothing** – no stock movement at all.

**Implication:** With GTI from PR, AUTO_POST = Off is effectively unsupported. The default is AUTO_POST = Yes, so this is acceptable for the typical use case.

---

## 3. Pre-Implementation Checklist

- [ ] ControlNos: Each destination site must have "Transfer From Other Store" (GTI) control. If missing, `getNextTransferNumber` will create it.
- [ ] Backend: StkMovdocHdrs/StkMovdocDtls accept movCode "TFRF" and storeNo = destination site.
- [ ] GTI list: Filters by `movCode: "TFRF"` and `storeNo: userDetails?.siteCode` – GTI with storeNo = requesting site will appear for destination users.

---

## 4. Implementation Steps

### 4.1 `src/services/prApi.js`

#### Step 1: Update `getNextTransferNumber(transferType, siteCodeOverride = null)`

- Add optional second parameter `siteCodeOverride`.
- When creating GTI from PR, pass `requestingSiteCode` so the doc number is for the destination site.
- Logic: `const siteCode = siteCodeOverride ?? (userDetails?.HQSiteCode || userDetails?.siteCode);`

#### Step 2: Refactor `createGoodsTransferFromPR` → Create GTI

**Header changes:**

| Field | Current (GTO) | New (GTI) |
|-------|---------------|-----------|
| movCode | "TFRT" | "TFRF" |
| storeNo | hqSiteCode | requestingSiteCode |
| fstoreNo | hqSiteCode | hqSiteCode |
| tstoreNo | requestingSiteCode | requestingSiteCode |

**Doc number:** Call `getNextTransferNumber("GTI", requestingSiteCode)`.

**Detail line changes:** Change `movCode` from "TFRT" to "TFRF" in each line item. All other fields stay the same.

**Return/log:** Update message and console.log to say "GTI" instead of "GTO".

### 4.2 `src/pages/pr/addPr.jsx`

#### Step 3: Update UI Text

| Location | Current | New |
|----------|---------|-----|
| Success toast (line ~2463) | "GTO document X created" | "GTI document X created" |
| Approval dialog note (line ~3542) | "create a GTO (Goods Transfer Out) from HQ to the requesting site" | "create a GTI (Goods Transfer In) at the requesting site for goods from HQ" |

---

## 5. Post-Implementation Verification

### 5.1 Test Cases

| # | Test | Expected |
|---|------|----------|
| 1 | PR approved at HQ, suppCode = "HQ" | GTI created; docNo = GTI + destination site code; movCode = TFRF |
| 2 | PR approved, suppCode ≠ "HQ" | No transfer document created |
| 3 | Destination user logs in, goes to GTI list | New GTI visible (storeNo = their site) |
| 4 | Destination posts GTI (AUTO_POST = Yes) | HQ stock reduced, destination stock increased |
| 5 | Batch data (specific/FEFO) | ordMemo1–4, docBatchNo, docExpdate preserved |
| 6 | docRef1 in GTI header | Equals PR number |
| 7 | Control number | GTI number increments per destination site |

### 5.2 Error Handling

- If `getNextTransferNumber("GTI", requestingSiteCode)` fails (e.g. no ControlNo, API error), ensure error is caught and surfaced to the user.
- If `requestingSiteCode` is missing/invalid, add validation before creating GTI.

### 5.3 Rollback

- Keep a copy of the original `createGoodsTransferFromPR` (GTO version) or use a feature flag to switch back if needed.

---

## 6. Summary of Changes

| File | Change |
|------|--------|
| `prApi.js` | `getNextTransferNumber`: add siteCodeOverride; `createGoodsTransferFromPR`: create GTI (movCode TFRF, storeNo = destination, docNo from destination) |
| `addPr.jsx` | Update success toast and approval dialog text (GTO → GTI) |

---

## 7. AUTO_POST Summary Table

| Document | AUTO_POST | Who Posts | Result |
|----------|-----------|-----------|--------|
| **GTO** (old) | On | HQ | Source ↓, Destination ↑ |
| **GTO** (old) | Off | HQ | Source ↓ only; destination needs GTI (not created) |
| **GTI** (new) | On | Destination | Source ↓, Destination ↑ |
| **GTI** (new) | Off | Destination | No stock movement (GTI block skipped) |

**Recommendation:** Use AUTO_POST = Yes (default) for PR → GTI flow.

---

## 8. Implementation Status

| Step | Status | Notes |
|------|--------|-------|
| getNextTransferNumber siteCodeOverride | ✅ Done | Added optional param for destination site |
| createGoodsTransferFromPR → GTI | ✅ Done | movCode TFRF, storeNo=destination |
| addPr.jsx UI text | ✅ Done | Toast and dialog updated |
| Linter | ✅ Pass | No errors |

### Files Modified
- `src/services/prApi.js`
- `src/pages/pr/addPr.jsx`
