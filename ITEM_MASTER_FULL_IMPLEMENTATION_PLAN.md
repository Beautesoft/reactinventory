# Item Master Form – Full Implementation Plan

## Overview
Complete parity with CRM ItemDataEntry form: 10 collapsible sections, Add New modals for Department/Brand/Class/Range, and strict mandatory field validation.

---

## Section 1: General (Collapsible)

### Mandatory Fields (*)
| Field | Validation |
|-------|------------|
| Stock Division | Required |
| Department | Required |
| Brand | Required |
| Stock Name | Required, max 40 chars |
| Stock Type | Required |
| Class | Required |
| Range | Required |
| Description | Required, max 60 chars |
| Supplier Code | Required when division NOT in [3,4,5] |

### All Fields (in order)
1. **Stock Division** * – Select
2. **Department** * – Select + **Add New** button (opens modal)
3. **Brand** * – Select + **Add New** button (opens modal)
4. **Picture** – File upload
5. **Stock Name** * – Input, max 40
6. **Stock Type** * – Select (SINGLE, PACKAGE, COMPOUND + ItemTypes)
7. **Supplier Code** * – Select (hidden when division 3,4,5)
8. **Price** – Input (hidden when division not in 1,2,3,4,5,null)
9. **Floor Price** – Input (hidden when division not 3,null)
10. **Item Barcode** – Input (hidden when division 4,5)
11. **Discount Limit** – Input (hidden when division 4,5)
12. **From Date** – Date (hidden when stocktype PACKAGE)
13. **To Date** – Date (hidden when stocktype PACKAGE)
14. **Control No** – Read-only (Stock Code)
15. **Class** * – Select + **Add New** button (opens modal)
16. **Range** * – Select + **Add New** button (opens modal)
17. **Image preview** – Display uploaded/loaded image
18. **Description** * – Input, max 60
19. **Duration (Minutes)** – Input
20. **Membership Point Redeem** – Input (hidden when division 4,5)
21. **Cost** – Input (hidden when division 4,5)
22. **Percent** – Checkbox
23. **Auto Cust Disc** – Checkbox (hidden when division 4,5)
24. **Open Prepaid** – Checkbox (division 5 only)
25. **Tax** – Checkbox
26. **Item allow FOC** – Checkbox
27. **Active** – Checkbox
28. **Commissionable** – Checkbox
29. **Redeem Item** – Checkbox

### Add New Modals Required
- **Department** – Modal with form → `POST ItemDepts` → refresh deptOptions
- **Brand** – Modal with form → `POST ItemBrands` → refresh brandOptions
- **Class** – Modal with form → `POST ItemClasses` → refresh classOptions
- **Range** – Modal with form → `POST ItemRanges` → refresh rangeOptions

### APIs for Add New (Payload Structures)

**Department** – POST ItemDepts
```js
{ itmCode, itmDesc, itmStatus, itmSeq, allowcashsales, itmShowonsales, isfirsttrial,
  isVoucher, isPrepaid, isRetailproduct, isSalonproduct, isPackage, validityPeriod,
  isService, isCompound, vilidityFromDate, vilidityToDate, ... }
```
*Simplified: itmCode (auto), itmDesc*, itmStatus, validityPeriod*

**Brand** – POST ItemBrands
```js
{ itmCode, itmDesc, itmStatus, voucherBrand, voucherForSales, retailProductBrand, prepaidBrand }
```
*Simplified: itmCode (auto), itmDesc*, itmStatus*

**Class** – POST ItemClasses
```js
{ itmCode, itmDesc, itmIsactive }
```

**Range** – POST ItemRanges
```js
{ itmCode, itmDesc, itmStatus, itmDept, itmBrand, isproduct, prepaidForProduct, ... }
```
*Requires brand selected; itmDept = dept, itmBrand = brand*

---

## Section 2: Commission (Collapsible, shown when Commissionable)

### Mandatory Fields (when Commissionable)
| Field | Validation |
|-------|------------|
| Sales Commission Group | Required |
| Work Commission Group | Required |
| Sales Points | Required |
| Work Points | Required |

### All Fields
1. Sales Commission Group * – Select (CommGroupHdrs type=Sales)
2. Work Commission Group * – Select (CommGroupHdrs type=Work)
3. Sales Points * – Input
4. Work Points * – Input

---

## Section 3: PACKAGE (Collapsible, shown when Stock Type = PACKAGE)
*Complex section – package header, content table, discount method. Defer to Phase 2 if needed.*

---

## Section 4: UOM (Collapsible)

### Structure
- **Table 1**: UOM Conversion (No, UOMC Code, UOMC Desc, =, UOM Unit, UOM Code, UOM Desc, Action)
- **Add Row** button – opens Add UOM modal (or inline add)
- **Table 2**: Price/Cost (No, UOMC Desc, Price, Cost, Min Margin %)

### Mandatory
- At least one UOM row required

### Add UOM Modal
- UOMC (from), UOM (to), Unit – creates new ItemUomprices with itemCode=empty for global UOM, or adds to existing uomsde

---

## Section 5: Stk.Balance (Collapsible)

### Fields
1. Site Code – Select
2. UOM Code – Select
3. Refresh button
4. Table: No, Qty (or balance display)
5. **Re-Order Level** – Checkbox
6. **Min Qty** – Input (when Re-Order Level)
7. **Customer Replenishment** – Checkbox
8. **Replenishment (Days)** – Input (when Customer Replenishment)
9. **Remind Advance (Days)** – Input (when Customer Replenishment)

### Visibility
- Shown when division 1, 2, or null

---

## Section 6: Link Code (Collapsible)

### Structure
- **Table**: Link Code, Link Description, Rpt Code (checkbox), Action (Edit)
- **Add Row** button – opens Add Link modal

### Fields per row
- linkCode, linkDesc, rptCodeStatus (checkbox)
- Edit opens Edit Link modal

### Visibility
- Hidden when division 5

### APIs
- ItemLinks list, create, update
- Add Link modal: create new link
- Edit Link modal: update link

---

## Section 7: Stock Listing (Collapsible)

### Structure
- **Table**: Store Code, Store Description, All (checkbox)
- Select All checkbox per site
- Site code, Site desc, Active checkbox per row

### Fields
- Same as current Sites card – site selection with active toggle

---

## Section 8: Item Usage (Collapsible)

### Structure
- Show X Entries dropdown
- Search input
- Show Salon / Show Retail checkboxes
- **Table**: Description, Item Code, Barcode, Action (Add)
- Pagination
- Add item usage: adds selected item to itemusage list

### Visibility
- Shown when division 3 or null

### APIs
- Itemusagelists, NewItemusagelists
- Search stocks with salon/retail filter

---

## Section 9: Voucher (Collapsible)

### Fields
1. Validity Period – Checkbox
2. Valid until Date – Date (when Validity Period checkbox)
3. Validity Period – Select (VoucherValidPeriods)
4. Value – Input
5. Amount / Percent – Radio

### Visibility
- Shown when division 4 or null

### APIs
- VoucherConditions, VoucherValidPeriods

---

## Section 10: Prepaid (Collapsible)

### Fields
1. Valid Period – Select
2. Member Card No Accessible – Checkbox
3. Inclusive Type – Select (Product Only, Service Only, All)
4. All – Checkbox
5. Prepaid Inclusive – Select (when not All)
6. Exclusive Type – Select
7. Prepaid Exclusive – Select
8. Price – Input
9. Amount$ / Percent – Radio
10. Add button (Inclusive)
11. Add button (Exclusive)
12. **Table**: Type, Condition Type 1, Condition Type 2, Amount, Rate, Active, Action

### Visibility
- Shown when division 5 or null

### APIs
- PrepaidOpenConditions, PrepaidOpenConditions create

---

## Section 11: Account Code (Collapsible)

### Fields
1. Account Code – Input (number)

---

## Section 12: Tax Code (Collapsible, shown when Tax checkbox)

### Mandatory Fields
| Field | Validation |
|-------|------------|
| 1st Tax Code | Required |
| 2nd Tax Code | Required |

---

## Implementation Phases

### Phase 1: Structure + General + Mandatory
1. Add Collapsible wrapper for all 10 sections
2. Implement General section with all fields
3. Add "Add New" buttons + modals for Dept, Brand, Class, Range
4. Add APIs: createItemDept, createItemBrand, createItemClass, createItemRange
5. Add mandatory validation (all * fields)

### Phase 2: Commission, UOM, Stk.Balance, Link Code, Stock Listing
1. Commission section (conditional)
2. UOM section with conversion table + Add UOM modal
3. Stk.Balance section
4. Link Code section with table + Add/Edit Link modals
5. Stock Listing section (already partially done)

### Phase 3: Item Usage, Voucher, Prepaid, Account Code, Tax Code
1. Item Usage section with search + add
2. Voucher section
3. Prepaid section
4. Account Code section
5. Tax Code section (conditional)

### Phase 4: PACKAGE Section (if required)
- Package header, content table, discount method

---

## API Endpoints to Add

| Endpoint | Method | Purpose |
|----------|--------|---------|
| ItemDepts | POST | Create department |
| ItemBrands | POST | Create brand |
| ItemClasses | POST | Create class |
| ItemRanges | POST | Create range |
| ItemUomprices | POST | Add UOM (itemCode empty for global) |
| ItemLinks | POST | Add link |
| ItemLinks | PATCH | Update link |
| Itemusagelists | POST | Add item usage |
| VoucherConditions | POST | Add voucher condition |
| PrepaidOpenConditions | POST | Add prepaid condition |

---

## Validation Rules Summary

1. **Before submit**: All mandatory fields must be filled
2. **Division-specific**: Hide fields based on division (1,2,3,4,5)
3. **Stock type-specific**: Hide From/To Date when PACKAGE
4. **Commissionable**: When true, Commission section mandatory (Sales/Work Commission Group, Sales/Work Points)
5. **Tax**: When true, Tax Code section mandatory (1st and 2nd Tax Code)
6. **Floor price** ≤ Price
7. **Cost** ≤ Price
8. **UOM**: At least one row, Cost < Price per row
9. **Sites**: At least one site selected (Add mode)
10. **Supplier**: Required when division NOT in [3,4,5]

## Division Visibility Matrix

| Division | Supplier | Floor Price | Barcode/DiscLimit | From/To Date | Membership Point | Cost | Percent/AutoCustDisc | Open Prepaid | UOM | Stk.Balance | Link Code | Item Usage | Voucher | Prepaid |
|----------|----------|-------------|-------------------|--------------|------------------|------|----------------------|--------------|-----|-------------|-----------|------------|---------|---------|
| 1 | Yes | Yes | Yes | Yes | Yes | Yes | Yes | - | Yes | Yes | Yes | Yes | - | - |
| 2 | Yes | - | Yes | Yes | Yes | - | Yes | - | Yes | Yes | Yes | Yes | - | - |
| 3 | No | Yes | Yes | Yes | - | Yes | - | - | Yes | Yes | Yes | Yes | - | - |
| 4 | No | - | No | Yes | - | - | - | - | - | - | Yes | - | Yes | - |
| 5 | No | - | No | Yes | - | - | - | Yes | - | - | No | - | - | Yes |
| null | Yes | Yes | Yes | Yes | Yes | Yes | Yes | - | Yes | Yes | Yes | Yes | Yes | Yes |

---

## File Structure

```
src/
  pages/item-master/
    itemMasterForm.jsx          # Main form (refactor with collapsibles)
  components/item-master/
    AddDeptModal.jsx            # Department Add New
    AddBrandModal.jsx            # Brand Add New
    AddClassModal.jsx            # Class Add New
    AddRangeModal.jsx            # Range Add New
    AddUomModal.jsx              # UOM Add Row
    AddLinkModal.jsx             # Link Add Row
    EditLinkModal.jsx            # Link Edit
  services/
    itemMasterApi.js             # Add create methods
```
