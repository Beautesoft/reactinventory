# Cost Log Feature – Legacy CRM Implementation Guide

This document describes how to implement the **Cost Change History** (Cost Log) feature from the React Inventory Item Master into the CRM legacy codebase. The feature tracks and displays cost/price changes for items with full audit trail.

---

## 1. Feature Overview

### 1.1 What It Does

- **Logs** every cost/price change when an item is created or updated (UOM prices section)
- **Records** item UOM, cost, price, min margin %, change type (CREATE/UPDATE), user, and timestamp
- **Displays** a timeline view of all cost changes for an item

### 1.2 User Experience

- **View History**: On Item Master list and Edit Item form, a History icon button opens a modal showing cost change history.
- **Automatic Logging**: On create/update of item UOM prices, a log entry is created automatically.
- **No extra user action**: Logging is transparent; users only see the history when they click the icon.

---

## 2. Backend Requirements

### 2.1 API Endpoint

The legacy backend must expose an **ItemCostHistory** (or equivalent) resource. The React Inventory app uses LoopBack with these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `Itemcosthistories?filter={"where":{"itemCode":"..."},"order":"effectiveAt DESC"}` | Fetch history for an item |
| `POST` | `Itemcosthistories` | Create a new history record |

### 2.2 Data Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number/string | Auto | Primary key |
| `itemCode` | string | Yes | Stock/item code |
| `itemUom` | string | Yes | UOM code |
| `itemCost` | number | Yes | Cost value |
| `itemPrice` | number | Yes | Price value |
| `minMargin` | number | No | Min margin % (nullable) |
| `changeType` | string | Yes | `"CREATE"` or `"UPDATE"` |
| `createdBy` | string | Yes | Username (e.g. from Redux `tokenDetails`) |
| `effectiveAt` | string (ISO) | Yes | Timestamp (e.g. `new Date().toISOString()`) |

### 2.3 Backend Implementation Options

If the legacy backend does not have this table:

1. **Create new table** `Itemcosthistories` (or equivalent) with the above columns.
2. **Add API** to create and query records (e.g. via REST or existing Redux Backend actions).
3. **Alternative**: Store in an existing audit table if the schema supports it.

---

## 3. Frontend Implementation

### 3.1 API Service Layer

Add or extend the API layer to support cost history:

```javascript
// Example: Add to Redux Backend actions or a dedicated API service

// Get cost history for an item
GET Itemcosthistories?filter={"where":{"itemCode":"<itemCode>"},"order":"effectiveAt DESC"}

// Create cost history record
POST Itemcosthistories
Body: {
  itemCode: string,
  itemUom: string,
  itemCost: number,
  itemPrice: number,
  minMargin: number | null,
  changeType: "CREATE" | "UPDATE",
  createdBy: string,
  effectiveAt: string  // ISO date
}
```

### 3.2 Logging Function

Create a helper that is called whenever UOM prices are saved:

```javascript
// logCostHistory(itemCode, data, changeType)
// data: { itemUom, itemPrice, itemCost, minMargin }

const round2 = (n) =>
  n != null && n !== "" && !isNaN(Number(n)) ? Math.round(Number(n) * 100) / 100 : n;

async function logCostHistory(code, data, changeType) {
  try {
    const itemPrice = round2(Number(data.itemPrice) || 0) ?? 0;
    const itemCost = round2(Number(data.itemCost) || 0) ?? 0;
    const minMargin =
      data.minMargin != null && data.minMargin !== "" && !isNaN(Number(data.minMargin))
        ? round2(Number(data.minMargin))
        : null;

    await createItemCostHistory({
      itemCode: code,
      itemUom: data.itemUom,
      itemCost,
      itemPrice,
      minMargin,
      changeType,
      createdBy: userDetails?.username || "SYSTEM",  // from Redux tokenDetails
      effectiveAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Cost history log failed:", err);
    toast.warning("Item saved but cost history was not recorded");
  }
}
```

### 3.3 Integration Points in Legacy Code

| Module | Action | When to Call |

|--------|--------|--------------|
| **ItemDataEntry** | `logCostHistory(controlNo, payload, "CREATE")` | After each `createItemUomprices` (or equivalent) |
| **EditItem** | `logCostHistory(itemCode, payload, "UPDATE")` | After each `updateItemUomprice` |
| **EditItem** | `logCostHistory(itemCode, payload, "CREATE")` | After each `createItemUomprices` for new UOMs |

### 3.4 Payload Construction

When saving UOM prices:

```javascript
// For each UOM row being saved:
const costHistoryPayload = {
  itemUom: u.itemUom ?? u.item_uom,
  itemPrice: round2(Number(u.itemPrice ?? u.item_price) || 0) ?? 0,
  itemCost: round2(Number(u.itemCost ?? u.item_cost) || 0) ?? 0,
  minMargin: /* computed or from u.minMargin */
};

// If updating existing UOM:
await updateItemUomprice(u.id, { itemPrice, itemCost, minMargin });
await logCostHistory(itemCode, costHistoryPayload, "UPDATE");

// If creating new UOM:
await createItemUomprices({ itemCode, itemUom, ... });
await logCostHistory(itemCode, costHistoryPayload, "CREATE");
```

**Min margin auto-calculation** (if not provided):

```javascript
if (itemPrice > 0 && itemCost > 0 && itemCost < itemPrice) {
  minMargin = round2(((itemPrice - itemCost) / itemPrice) * 100);
}
```

### 3.5 Cost History Modal Component

A modal component that:

1. Accepts `open`, `onOpenChange`, `itemCode`, `itemName` as props
2. Fetches history when opened: `GET Itemcosthistories?filter={"where":{"itemCode":"..."},"order":"effectiveAt DESC"}`
3. Displays a table with columns: Date/Time, UOM, Cost, Price, Min Margin %, Type, By

**Table columns** (from React Inventory):

| Column | Source | Format |
|--------|--------|--------|
| Date/Time | `effectiveAt` | `DD/MM/YYYY, HH:mm:ss` |
| UOM | `itemUom` | As-is |
| Cost | `itemCost` | 2 decimals |
| Price | `itemPrice` | 2 decimals |
| Min Margin % | `minMargin` | 2 decimals |
| Type | `changeType` | Badge (CREATE=green, UPDATE=blue) |
| By | `createdBy` | As-is |

**Empty state**: "No cost history for this item. Cost changes will appear here after create or edit."

### 3.6 UI Integration Points

| Location | UI Element | Behavior |
|----------|------------|----------|
| **Item Master (List)** | History icon button in actions column | Opens cost history modal for that row's item |
| **Edit Item** | History icon next to UOM section header | Opens cost history modal for current item |

**Icon**: Use a History/clock icon (e.g. `History` from lucide-react or equivalent). Tooltip: "Cost change history".

---

## 4. Step-by-Step Implementation Checklist

### Phase 1: Backend

- [ ] Create `Itemcosthistories` table (or equivalent) with required columns
- [ ] Expose GET endpoint for list by `itemCode`, ordered by `effectiveAt DESC`
- [ ] Expose POST endpoint for create
- [ ] Verify auth and permissions

### Phase 2: API Layer

- [ ] Add `getItemCostHistory(itemCode)` to Redux Backend or API service
- [ ] Add `createItemCostHistory(payload)` to Redux Backend or API service
- [ ] Add `logCostHistory(code, data, changeType)` helper

### Phase 3: Create Item (ItemDataEntry)

- [ ] Locate where `createItemUomprices` (or equivalent) is called
- [ ] After each successful create, call `logCostHistory(controlNo, costHistoryPayload, "CREATE")`
- [ ] Ensure `costHistoryPayload` includes `itemUom`, `itemPrice`, `itemCost`, `minMargin`

### Phase 4: Edit Item (EditItem)

- [ ] Locate where `updateItemUomprice` is called
- [ ] After each successful update, call `logCostHistory(itemCode, costHistoryPayload, "UPDATE")`
- [ ] Locate where `createItemUomprices` is called for new UOMs
- [ ] After each successful create, call `logCostHistory(itemCode, costHistoryPayload, "CREATE")`

### Phase 5: Cost History Modal

- [ ] Create `CostHistoryTimelineModal` (or equivalent) component
- [ ] Implement fetch on open, table display, loading/empty states
- [ ] Add to Item Master list table (actions column)
- [ ] Add to Edit Item form (UOM section header)

### Phase 6: Testing

- [ ] Create new item with UOM prices → verify history records
- [ ] Edit item UOM prices → verify UPDATE records
- [ ] Open cost history modal from list and edit form
- [ ] Verify date format, user, and values

---

## 5. Reference: React Inventory Implementation

| File | Purpose |
|------|---------|
| `src/components/item-master/CostHistoryTimelineModal.jsx` | Modal UI |
| `src/services/itemMasterApi.js` | `getItemCostHistory`, `createItemCostHistory` |
| `src/pages/item-master/itemMasterForm.jsx` | `logCostHistory`, integration in save flow |
| `src/components/itemMasterTable.jsx` | History button in list |

---

## 6. Legacy-Specific Considerations

### 6.1 Redux vs Direct API

- If legacy uses Redux Backend actions: add `createItemCostHistory` and `getItemCostHistory` actions.
- If legacy uses direct API calls: add the same logic to the existing API service layer.

### 6.2 User Details

- Legacy may use `tokenDetails` from Redux; use `tokenDetails?.username` or equivalent for `createdBy`.

### 6.3 Component Style

- Legacy may use `NormalModal`, `NormalTable`, etc. Adapt the modal UI to match existing components.
- The logic (fetch, display, format) remains the same regardless of UI library.

### 6.4 Division Filter

- In React Inventory, cost logging is only for divisions `["1", "2", ""]` (UOM section). If legacy has similar logic, apply the same filter when deciding whether to log.

---

## 7. Summary

| Item | Description |
|------|-------------|
| **Backend** | Create `Itemcosthistories` table and GET/POST endpoints |
| **Logging** | Call `logCostHistory` after every create/update of item UOM prices |
| **View** | Add History modal with table of cost changes |
| **UI** | History icon on Item Master list and Edit Item form |
| **Error handling** | Non-blocking: toast warning if log fails; item save still succeeds |

---

*Document version: 1.0 | Based on React Inventory Item Master implementation*
