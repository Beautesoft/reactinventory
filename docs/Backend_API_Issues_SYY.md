# Backend API issues — SE01 / SYY

Please fix these three APIs.

---

## 1. Titles — 404

`GET https://syy.beautecloud.com/lb/api/Titles?filter[where][productLicense]=SE01`

Need **200** + a row for site `SE01` (at least `companyHeader1`). Empty array is OK. **404 is not OK.**

Used for print and reports.

---

## 2. GetInvitems — 500

`GET http://103.253.15.75:9619/WebInventoryAPI_ForReact/api/GetInvitems?Site=SE01`

Need **200**:

```json
{ "result": [ { "itemcode": "", "itemdesc": "", "Uom": "", "item_Price": 0, "Cost": 0 } ] }
```

No items → `"result": []`. Do not return 500.

Used to load items on GRN and other stock screens.

---

## 3. getInventoryAuth — menus incomplete

`GET http://103.253.15.75:9619/WebInventoryAPI_ForReact/api/getInventoryAuth?userCode=nick`

SYY currently returns **only 8** forms. Please return **all of these** (same as the full list) **plus Replenishment Report**.

1. Goods Receive Note List  
2. Goods Transfer Out List  
3. Goods Transfer In List  
4. Goods Return List  
5. Stock Adjustment List  
6. Stock Balance  
7. Stock Usage Memo List  
8. Stock Movement - Detail  
9. Purchase Requisition  
10. Stock Balance Report  
11. Stock Take  
12. itemmaster  
13. **Replenishment Report** ← add this (name only)

Also allow save/toggle for **Replenishment Report** on `postInventoryAuth`.
