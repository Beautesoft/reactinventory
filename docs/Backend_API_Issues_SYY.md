# Backend API checks — all clients

Run these against **each client** (and each live site) before go-live. Fill the placeholders from that client’s `config.js` / login site.

| Placeholder | Meaning | Where it comes from |
|---|---|---|
| `{LB_BASE}` | LoopBack API | `API_BASE_URL` (ends with `/lb/api`) |
| `{INV_BASE}` | Inventory API | `API_LOGIN_URL` (Inventory / `WebInventoryAPI_ForReact`) |
| `{SITE}` | Site / store code | Login site (`userDetails.siteCode`). Repeat for **every** live site. |
| `{USER}` | Inventory user code | A real user that should see menus (e.g. login username) |

Do **not** treat 404 or 500 as “no data”. Empty data must still be **HTTP 200** with an empty array / `result: []`.

---

## 1. Titles — print / report header

```
GET {LB_BASE}/Titles?filter[where][productLicense]={SITE}
```

Used by print preview and reports (`productLicense` = store / site code).

| Check | Pass |
|---|---|
| HTTP status | **200** (404 is a fail) |
| Body | JSON **array** |
| Empty site / no row | `[]` is OK |
| Row present | At least `companyHeader1` (company name on print) |
| Coverage | Repeat for **every live `{SITE}`** the client uses |

---

## 2. GetInvitems — item list for stock screens

```
GET {INV_BASE}/api/GetInvitems?Site={SITE}
```

Used to load items on GRN, GTO, GTI, RTN, ADJ, SUM, Stock Take, PR, PO, Stock Balance, Dashboard.

| Check | Pass |
|---|---|
| HTTP status | **200** (500 is a fail) |
| Body shape | `{ "result": [ ... ] }` |
| No items | `{ "result": [] }` |
| Item fields (when present) | `itemcode`, `itemdesc`, `Uom`, `item_Price`, `Cost` |
| Coverage | Repeat for **every live `{SITE}`** |

Example item:

```json
{
  "result": [
    {
      "itemcode": "",
      "itemdesc": "",
      "Uom": "",
      "item_Price": 0,
      "Cost": 0
    }
  ]
}
```

---

## 3. getInventoryAuth — menu list

```
GET {INV_BASE}/api/getInventoryAuth?userCode={USER}
```

Login and Settings → User Authorization load menus from this. Missing codes = missing sidebar items.

| Check | Pass |
|---|---|
| HTTP status | **200** |
| Body | `{ "result": [ { "Code", "Name", "Active" } ] }` |
| `Active` | `"Y"` or `"N"` |
| Completeness | `result` includes **all required codes** in the table below (name text can vary) |

### Required form codes

Return **all of these**. Name may be `… List` / `itemmaster` / etc.; the app matches **Code** first, then Name starts-with.

| Code | Menu (app) | Typical API `Name` |
|---|---|---|
| F10001 | Goods Receive Note | Goods Receive Note List |
| F10002 | Goods Transfer Out | Goods Transfer Out List |
| F10003 | Goods Transfer In | Goods Transfer In List |
| F10004 | Goods Return Note | Goods Return List |
| F10005 | Stock Adjustment | Stock Adjustment List |
| F10009 | Stock Balance | Stock Balance |
| F10010 | Stock Usage Memo | Stock Usage Memo List |
| F10011 | Stock Movement Report | Stock Movement - Detail |
| F10012 | Purchase Requisition | Purchase Requisition |
| F10014 | Stock Balance Report | Stock Balance Report |
| F10015 | Stock Take | Stock Take |
| F10016 | Item Master | itemmaster |
| F10017 | Replenishment Report | Replenishment Report |

Not shown in User Authorization (do not need to toggle in Settings): F10006, F10007, F10008, F10013.

---

## 4. postInventoryAuth — save / toggle menus

```
GET {INV_BASE}/api/postInventoryAuth?UserCode={USER}&ReportCode={CODE}&Active=Y
GET {INV_BASE}/api/postInventoryAuth?UserCode={USER}&ReportCode={CODE}&Active=N
```

| Check | Pass |
|---|---|
| HTTP status | **200** |
| Body | `success` = `"1"` |
| Codes | Works for **every required code**, including **F10017** (Replenishment Report) |
| Persist | After toggle, `getInventoryAuth` shows the new `Active` |

---

## Sign-off

Client: _______________  
Sites checked: _______________  
Date: _______________

- [ ] 1. Titles 200 for every live site (`companyHeader1` when a row exists)
- [ ] 2. GetInvitems 200 for every live site (`result` array, never 500)
- [ ] 3. getInventoryAuth returns all required codes (F10001–F10005, F10009–F10012, F10014–F10017)
- [ ] 4. postInventoryAuth can toggle those codes, including F10017
