import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";
import { AddDeptModal } from "@/components/item-master/AddDeptModal";
import { AddBrandModal } from "@/components/item-master/AddBrandModal";
import { AddClassModal } from "@/components/item-master/AddClassModal";
import { AddRangeModal } from "@/components/item-master/AddRangeModal";
import { AddUomModal } from "@/components/item-master/AddUomModal";

const now = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
};

function ItemMasterForm() {
  const { itemCode } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(itemCode);
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const siteCode = userDetails?.siteCode || "";

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const [divisionOptions, setDivisionOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [rangeOptions, setRangeOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [linkOptions, setLinkOptions] = useState([]);
  const [supplyOptions, setSupplyOptions] = useState([]);
  const [taxType1Options, setTaxType1Options] = useState([]);
  const [taxType2Options, setTaxType2Options] = useState([]);
  const [salesCommOptions, setSalesCommOptions] = useState([]);
  const [workCommOptions, setWorkCommOptions] = useState([]);

  const [form, setForm] = useState({
    stockdivision: "",
    dept: "",
    brand: "",
    stockclass: "",
    range: "",
    stocktype: "SINGLE",
    stockname: "",
    item_desc: "",
    ItemBarCode: "",
    stockprice: "",
    floorprice: "",
    priceceiling: "",
    item_active: true,
    rptcode: "",
    disclimit: "",
    supply_itemsval: "",
    vilidityFromDate: "",
    vilidityToDate: "",
    duration: "",
    membershipPoint: "",
    percent: true,
    auto_cust_disc: true,
    tax: false,
    allow_foc: false,
    commissionable: false,
    redeem_item: false,
    reoreder_level: false,
    min_qty: "",
    customer_replan: false,
    Replenishment: "",
    Remind_advance: "",
    Sales_commission: "",
    work_commission: "",
    sales_point: "",
    work_point: "",
    taxone: "",
    taxtwo: "",
    account_no: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addRangeOpen, setAddRangeOpen] = useState(false);
  const [addUomOpen, setAddUomOpen] = useState(false);

  const [sectionOpen, setSectionOpen] = useState({
    general: true,
    commission: false,
    uom: true,
    stkBalance: false,
    linkCode: false,
    stockListing: true,
    itemUsage: false,
    voucher: false,
    prepaid: false,
    accountCode: false,
    taxCode: false,
  });

  const [uoms, setUoms] = useState([]);
  const [sites, setSites] = useState([]);
  const [originalStocklists, setOriginalStocklists] = useState([]);
  const [controlNo, setControlNo] = useState("");
  const [updateId, setUpdateId] = useState(null);

  // Link Code State (per-item links)
  const [linkList, setLinkList] = useState([]);
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [newLinkCode, setNewLinkCode] = useState("");
  const [newLinkDesc, setNewLinkDesc] = useState("");

  // Item Usage State
  const [usageItems, setUsageItems] = useState([]);
  const [usageSearch, setUsageSearch] = useState("");
  const [usageSearchResults, setUsageSearchResults] = useState([]);

  // Voucher State
  const [voucherValidPeriod, setVoucherValidPeriod] = useState("");
  const [voucherValue, setVoucherValue] = useState("");
  const [voucherValueIsAmount, setVoucherValueIsAmount] = useState(true);
  const [voucherValidUntilDate, setVoucherValidUntilDate] = useState("");
  const [isVoucherValidDate, setIsVoucherValidDate] = useState(false);
  const [voucherValidPeriodOptions, setVoucherValidPeriodOptions] = useState([]);

  // Prepaid State
  const [prepaidValidPeriod, setPrepaidValidPeriod] = useState("");
  const [prepaidInclusiveType, setPrepaidInclusiveType] = useState("");
  const [prepaidExclusiveType, setPrepaidExclusiveType] = useState("");
  const [prepaidValue, setPrepaidValue] = useState("");
  const [prepaidSellAmt, setPrepaidSellAmt] = useState("");
  const [prepaidConditions, setPrepaidConditions] = useState([]);
  const [prepaidMemberCardAccess, setPrepaidMemberCardAccess] = useState(false);
  const [prepaidAll, setPrepaidAll] = useState(false);
  const [prepaidValidPeriodOptions, setPrepaidValidPeriodOptions] = useState([]);
  const [prepaidInclusiveOptions, setPrepaidInclusiveOptions] = useState([]);
  const [prepaidExclusiveOptions, setPrepaidExclusiveOptions] = useState([]);
  const [prepaidInclusiveValue, setPrepaidInclusiveValue] = useState("");
  const [prepaidExclusiveValue, setPrepaidExclusiveValue] = useState("");

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
  };

  const loadLookups = useCallback(async () => {
    try {
      const [divs, depts, brands, classes, ranges, types, uom, sitesRes, links, supplies, tax1, tax2, commGroups, voucherValidPeriods] =
        await Promise.all([
          itemMasterApi.getItemDivs(),
          itemMasterApi.getItemDepts(),
          itemMasterApi.getItemBrands(),
          itemMasterApi.getItemClasses(),
          itemMasterApi.getItemRanges(),
          itemMasterApi.getItemTypes(),
          itemMasterApi.getItemUom(),
          itemMasterApi.getItemSitelists(),
          itemMasterApi.getItemLinks(),
          itemMasterApi.getItemSupplies().catch(() => []),
          itemMasterApi.getTaxType1Codes().catch(() => []),
          itemMasterApi.getTaxType2Codes().catch(() => []),
          itemMasterApi.getCommGroupHdrs().catch(() => []),
          itemMasterApi.getVoucherValidPeriods().catch(() => []),
        ]);

      setDivisionOptions(
        (divs || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc }))
      );
      setDeptOptions(
        (depts || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc }))
      );
      setBrandOptions(
        (brands || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc }))
      );
      setClassOptions(
        (classes || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc }))
      );
      setRangeOptions(
        (ranges || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc }))
      );
      setTypeOptions(
        (types || []).map((x) => ({ value: x.itemType || x.itmCode, label: x.itemType || x.itmDesc }))
      );
      setUomOptions(
        (uom || []).filter((x) => x.uomIsactive).map((x) => ({ value: x.uomCode, label: x.uomDesc }))
      );
      setSiteOptions(
        (sitesRes || []).map((x) => ({
          value: x.itemsiteCode || x.siteCode,
          label: x.itemsiteDesc || x.siteDesc || x.itemsiteCode || x.siteCode,
          isActive: x.itemsiteIsactive !== false,
        }))
      );
      setLinkOptions(
        (links || []).map((x) => ({ value: x.linkCode, label: `${x.linkCode} - ${x.linkDesc || ""}` }))
      );
      setSupplyOptions(
        (supplies || []).map((x) => ({ value: String(x.splyCode ?? x.suppCode ?? ""), label: x.supplydesc ?? x.suppDesc ?? String(x.splyCode ?? x.suppCode ?? "") }))
      );
      setTaxType1Options(
        (tax1 || []).map((x) => ({ value: String(x.taxCode ?? x.itmCode ?? ""), label: x.taxDesc ?? x.itmDesc ?? String(x.taxCode ?? x.itmCode ?? "") }))
      );
      setTaxType2Options(
        (tax2 || []).map((x) => ({ value: String(x.taxCode ?? x.itmCode ?? ""), label: x.taxDesc ?? x.itmDesc ?? String(x.taxCode ?? x.itmCode ?? "") }))
      );
      const sales = (commGroups || []).filter((x) => (x.type || "").toLowerCase() === "sales");
      const work = (commGroups || []).filter((x) => (x.type || "").toLowerCase() === "work");
      setSalesCommOptions(sales.map((x) => ({ value: String(x.code ?? ""), label: x.description ?? String(x.code ?? "") })));
      setWorkCommOptions(work.map((x) => ({ value: String(x.code ?? ""), label: x.description ?? String(x.code ?? "") })));
      
      const vPeriods = (voucherValidPeriods || []).map((x) => ({
        value: String(x.code ?? x.periodCode ?? x.VoucherValidDesc ?? x.VoucherValidCode ?? ""),
        label: x.description ?? x.periodDesc ?? x.VoucherValidDesc ?? String(x.code ?? x.periodCode ?? x.VoucherValidCode ?? ""),
      }));
      setVoucherValidPeriodOptions(vPeriods);
      setPrepaidValidPeriodOptions(vPeriods);
    } catch (err) {
      console.error("Load lookups error:", err);
      toast.error("Failed to load options");
    }
  }, []);

  const refreshDept = useCallback(async () => {
    const depts = await itemMasterApi.getItemDepts();
    setDeptOptions((depts || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc })));
  }, []);
  const refreshBrand = useCallback(async () => {
    const brands = await itemMasterApi.getItemBrands();
    setBrandOptions((brands || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc })));
  }, []);
  const refreshClass = useCallback(async () => {
    const classes = await itemMasterApi.getItemClasses();
    setClassOptions((classes || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc })));
  }, []);
  const refreshRange = useCallback(async () => {
    const ranges = await itemMasterApi.getItemRanges();
    setRangeOptions((ranges || []).map((x) => ({ value: String(x.itmCode), label: x.itmDesc })));
  }, []);

  const loadForEdit = useCallback(async () => {
    if (!itemCode) return;
    setInitLoading(true);
    try {
      const stocks = await itemMasterApi.getStocks({ limit: 5000 });
      const stock = (stocks || []).find((s) => s.itemCode === itemCode);
      if (!stock) {
        toast.error("Item not found");
        navigate("/item-master");
        return;
      }

      setUpdateId(stock.itemNo);
      setControlNo(stock.itemCode);
      const fromDate = stock.vilidityFromDate ? (typeof stock.vilidityFromDate === "string" ? stock.vilidityFromDate.slice(0, 10) : null) : "";
      const toDate = stock.vilidityToDate ? (typeof stock.vilidityToDate === "string" ? stock.vilidityToDate.slice(0, 10) : null) : "";
      setForm({
        stockdivision: String(stock.itemDiv ?? ""),
        dept: String(stock.itemDept ?? ""),
        brand: String(stock.itemBrand ?? ""),
        stockclass: String(stock.itemClass ?? ""),
        range: String(stock.itemRange ?? ""),
        stocktype: stock.itemType || "SINGLE",
        stockname: stock.itemName || "",
        item_desc: stock.itemDesc || "",
        ItemBarCode: stock.itemBarcode || "",
        stockprice: stock.itemPrice ?? "",
        floorprice: stock.itemPriceFloor ?? "",
        priceceiling: stock.itemPriceCeiling ?? "",
        item_active: stock.itemIsactive !== false,
        rptcode: stock.rptCode || "",
        disclimit: stock.disclimit ?? "",
        supply_itemsval: String(stock.itemSupp ?? ""),
        vilidityFromDate: fromDate,
        vilidityToDate: toDate,
        duration: stock.itmDuration ?? "",
        membershipPoint: stock.printdesc ?? "",
        percent: true,
        auto_cust_disc: stock.autocustdisc !== false,
        tax: stock.isHaveTax === true,
        allow_foc: stock.isAllowFoc === true,
        commissionable: stock.commissionable === true,
        redeem_item: stock.reminderActive === true,
        reoreder_level: stock.reorderActive === true,
        min_qty: stock.reorderMinqty ?? "",
        customer_replan: stock.custReplenishDays != null && stock.custReplenishDays > 0,
        Replenishment: stock.custReplenishDays ?? "",
        Remind_advance: stock.custAdvanceDays ?? "",
        Sales_commission: String(stock.salescomm ?? ""),
        work_commission: String(stock.workcomm ?? ""),
        sales_point: stock.salescommpoints ?? "",
        work_point: stock.workcommpoints ?? "",
        taxone: String(stock.t1TaxCode ?? ""),
        taxtwo: String(stock.t2TaxCode ?? ""),
        account_no: String(stock.accountCodeTd ?? ""),
      });

      const [uomPrices, stocklists, usageLevels, voucherConds, prepaidConds, itemLinks] = await Promise.all([
        itemMasterApi.getItemUomprices(itemCode),
        itemMasterApi.getItemStocklists(itemCode),
        itemMasterApi.getUsageLevels(itemCode).catch(() => []),
        itemMasterApi.getVoucherConditions(itemCode).catch(() => []),
        itemMasterApi.getPrepaidOpenConditions(itemCode).catch(() => []),
        itemMasterApi.getItemLinksByItem(itemCode).catch(() => []),
      ]);

      setUoms(
        (uomPrices || []).map((u) => ({
          id: u.id,
          itemUom: u.itemUom,
          uomDesc: u.uomDesc,
          uomUnit: u.uomUnit ?? 1,
          itemUom2: u.itemUom2,
          uom2Desc: u.uom2Desc,
          itemPrice: u.itemPrice ?? 0,
          itemCost: u.itemCost ?? 0,
          minMargin: u.minMargin ?? 0,
        }))
      );

      setSites(
        (stocklists || []).map((s) => ({
          itemstocklistId: s.itemstocklistId,
          itemsiteCode: s.itemsiteCode,
          itemsiteIsactive: s.itemstocklistStatus !== false,
        }))
      );
      setOriginalStocklists(stocklists || []);

      // Usage Levels
      setUsageItems(
        (usageLevels || []).map((x) => ({
          itemCode: x.itemCode,
          itemName: x.itemDesc || x.serviceDesc,
          qty: x.qty,
          uom: x.uom,
        }))
      );

      // Voucher
      setVoucherValue(stock.voucherValue ?? "");
      setVoucherValueIsAmount(stock.voucherValueIsAmount !== false);
      setVoucherValidPeriod(stock.voucherValidPeriod ?? "");
      const vDate = stock.voucherValidUntilDate ? (typeof stock.voucherValidUntilDate === "string" ? stock.voucherValidUntilDate.slice(0, 10) : null) : "";
      setVoucherValidUntilDate(vDate);
      setIsVoucherValidDate(!!vDate);

      // Prepaid
      setPrepaidValue(stock.prepaidValue ?? "");
      setPrepaidSellAmt(stock.prepaidSellAmt ?? "");
      setPrepaidValidPeriod(stock.prepaidValidPeriod ?? "");
      setPrepaidMemberCardAccess(stock.membercardnoaccess === true);
      setPrepaidConditions(
        (prepaidConds || []).map((p) => ({
          type: p.pItemtype ?? p.type,
          condition1: p.conditiontype1 ?? p.condition1,
          condition2: p.conditiontype2 ?? p.condition2,
          price: p.amount ?? p.rate ?? p.price,
        }))
      );
      setLinkList(
        (itemLinks || []).map((l) => ({
          itmId: l.itmId,
          linkCode: l.linkCode,
          linkDesc: l.linkDesc,
          rptCodeStatus: l.rptCodeStatus === true,
        }))
      );
    } catch (err) {
      console.error("Load edit error:", err);
      toast.error("Failed to load item");
      navigate("/item-master");
    } finally {
      setInitLoading(false);
    }
  }, [itemCode, navigate]);

  const loadControlNo = useCallback(async () => {
    if (isEdit || !form.stockdivision || !form.dept) return;
    try {
      const ctrl = await itemMasterApi.getControlNo(siteCode);
      if (ctrl) {
        const prefix = `${form.stockdivision}${form.dept}`;
        const stocks = await itemMasterApi.getStocks({ limit: 5000 });
        const matching = (stocks || []).filter(
          (s) => s.itemCode && String(s.itemCode).startsWith(prefix)
        );
        let nextNo = "1";
        if (matching.length > 0) {
          const last = matching[matching.length - 1].itemCode;
          const suffix = last.slice(String(prefix).length) || "0";
          nextNo = String(parseInt(suffix, 10) + 1);
        }
        if (prefix.length + nextNo.length > 8) {
          nextNo = nextNo.slice(-(8 - prefix.length));
        }
        setControlNo(prefix + nextNo);
      }
    } catch (e) {
      console.warn("Control no load failed:", e);
    }
  }, [form.stockdivision, form.dept, isEdit, siteCode]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (isEdit) loadForEdit();
    else setInitLoading(false);
  }, [isEdit, loadForEdit]);

  useEffect(() => {
    loadControlNo();
  }, [loadControlNo]);

  useEffect(() => {
    if (prepaidInclusiveType === "Product Only") {
      setPrepaidInclusiveOptions(brandOptions);
    } else if (prepaidInclusiveType === "Service Only") {
      setPrepaidInclusiveOptions(deptOptions);
    } else if (prepaidInclusiveType === "All") {
      setPrepaidInclusiveOptions([{ value: "All", label: "All" }]);
    } else {
      setPrepaidInclusiveOptions([]);
    }
  }, [prepaidInclusiveType, brandOptions, deptOptions]);

  useEffect(() => {
    if (prepaidExclusiveType === "Product Only") {
      setPrepaidExclusiveOptions(brandOptions);
    } else if (prepaidExclusiveType === "Service Only") {
      setPrepaidExclusiveOptions(deptOptions);
    } else {
      setPrepaidExclusiveOptions([]);
    }
  }, [prepaidExclusiveType, brandOptions, deptOptions]);

  const addUom = () => {
    setAddUomOpen(true);
  };

  const handleUomSuccess = (newUom) => {
    setUoms((prev) => [...prev, newUom]);
  };

  const removeUom = (idx) => {
    if (idx !== uoms.length - 1) {
      toast.error("Cannot Delete this UOM. You can delete the last entered UOM only.");
      return;
    }
    setUoms((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateUom = (idx, field, value) => {
    setUoms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "itemPrice" || field === "itemCost") {
        const price = Number(field === "itemPrice" ? value : next[idx].itemPrice) || 0;
        const cost = Number(field === "itemCost" ? value : next[idx].itemCost) || 0;
        // Cost must be > 0 and < Price
        if (price > 0 && cost > 0 && cost < price) {
          next[idx].minMargin = (((price - cost) / price) * 100).toFixed(2);
        } else {
          next[idx].minMargin = "0";
        }
        return next;
      }
      return next;
    });
  };

  const toggleSite = (code) => {
    setSites((prev) => {
      const exists = prev.find((s) => s.itemsiteCode === code);
      if (exists) {
        return prev.filter((s) => s.itemsiteCode !== code);
      }
      return [...prev, { itemsiteCode: code, itemsiteIsactive: true }];
    });
  };

  const handleSelectAllSites = (checked) => {
    if (checked) {
      setSites(
        siteOptions.map((s) => ({ itemsiteCode: s.value, itemsiteIsactive: true }))
      );
    } else {
      setSites([]);
    }
  };

  const addLink = () => {
    if (!newLinkCode?.trim() || !newLinkDesc?.trim()) {
      toast.error("Link Code and Description are required");
      return;
    }
    if (linkList.some((l) => l.linkCode === newLinkCode.trim())) {
      toast.error("Link Code already added");
      return;
    }
    setLinkList((prev) => [
      ...prev,
      { linkCode: newLinkCode.trim(), linkDesc: newLinkDesc.trim(), rptCodeStatus: false },
    ]);
    setNewLinkCode("");
    setNewLinkDesc("");
    setAddLinkOpen(false);
  };

  const toggleLinkRptCode = (linkCode) => {
    setLinkList((prev) => {
      const next = prev.map((l) => ({ ...l, rptCodeStatus: l.linkCode === linkCode ? !l.rptCodeStatus : false }));
      const rpt = next.find((l) => l.rptCodeStatus);
      setField("rptcode", rpt ? rpt.linkCode : "");
      return next;
    });
  };

  const removeLink = (idx) => {
    const link = linkList[idx];
    setLinkList((prev) => prev.filter((_, i) => i !== idx));
    if (form.rptcode === link?.linkCode) setField("rptcode", "");
  };

  const searchUsageItems = async (term) => {
    setUsageSearch(term);
    if (!term || term.length < 2) {
      setUsageSearchResults([]);
      return;
    }
    try {
      const res = await itemMasterApi.getStocks({ limit: 100 });
      const list = (res || []).filter(
        (s) =>
          (s.itemName || "").toLowerCase().includes(term.toLowerCase()) ||
          (s.itemCode || "").toLowerCase().includes(term.toLowerCase())
      );
      setUsageSearchResults(list.slice(0, 15));
    } catch (e) {
      console.error(e);
      setUsageSearchResults([]);
    }
  };

  const addUsageItem = (item) => {
    if (usageItems.some((x) => x.itemCode === item.itemCode)) {
      toast.error("Item already added");
      return;
    }
    setUsageItems((prev) => [
      ...prev,
      {
        itemCode: item.itemCode,
        itemName: item.itemName || item.itemDesc,
        qty: 1,
        uom: item.itemUom || uomOptions[0]?.value || "",
      },
    ]);
    setUsageSearch("");
    setUsageSearchResults([]);
  };

  const removeUsageItem = (idx) => {
    setUsageItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addPrepaidCondition = (type, cond1, cond2, price) => {
    setPrepaidConditions(prev => [...prev, { type, condition1: cond1, condition2: cond2, price: Number(price) }]);
  };

  const removePrepaidCondition = (idx) => {
    setPrepaidConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!form.stockdivision) {
      toast.error("Division is required");
      return false;
    }
    if (!form.dept) {
      toast.error("Department is required");
      return false;
    }
    if (!form.brand) {
      toast.error("Brand is required");
      return false;
    }
    if (!form.stockclass) {
      toast.error("Class is required");
      return false;
    }
    if (!form.range) {
      toast.error("Range is required");
      return false;
    }
    if (!form.stockname?.trim()) {
      toast.error("Stock Name is required");
      return false;
    }
    if (form.stockname.trim().length > 40) {
      toast.error("Name must be less than or equal to 40 characters");
      return false;
    }
    if (!form.item_desc?.trim()) {
      toast.error("Description is required");
      return false;
    }
    if (form.item_desc.trim().length > 60) {
      toast.error("Description must be less than or equal to 60 characters");
      return false;
    }
    const div = form.stockdivision;
    if (!["3", "4", "5"].includes(div) && !form.supply_itemsval) {
      toast.error("Supplier Code is required for this division");
      return false;
    }
    if (form.commissionable) {
      if (!form.Sales_commission) {
        toast.error("Sales Commission Group is required when Commissionable");
        return false;
      }
      if (!form.work_commission) {
        toast.error("Work Commission Group is required when Commissionable");
        return false;
      }
      if (form.sales_point === "" || form.sales_point == null) {
        toast.error("Sales Points is required when Commissionable");
        return false;
      }
      if (form.work_point === "" || form.work_point == null) {
        toast.error("Work Points is required when Commissionable");
        return false;
      }
    }
    if (form.tax) {
      if (!form.taxone) {
        toast.error("Tax Type 1 is required when Tax is checked");
        return false;
      }
      if (!form.taxtwo) {
        toast.error("Tax Type 2 is required when Tax is checked");
        return false;
      }
    }
    const price = Number(form.stockprice);
    const floor = Number(form.floorprice);
    if (floor > 0 && price > 0 && floor > price) {
      toast.error("Floor price must be less than or equal to price");
      return false;
    }
    const showUom = ["1", "2", ""].includes(form.stockdivision);
    if (showUom && uoms.length === 0) {
      toast.error("At least one UOM is required");
      return false;
    }
    for (let i = 0; i < uoms.length; i++) {
      const u = uoms[i];
      const price = Number(u.itemPrice) || 0;
      const cost = Number(u.itemCost) || 0;
      if (price > 0 && (cost <= 0 || cost >= price)) {
        toast.error(`UOM ${i + 1} (${u.uomDesc || u.itemUom}): Cost must be greater than 0 and less than Price`);
        return false;
      }
    }
    if (sites.length === 0 && !isEdit) {
      toast.error("Select at least one site");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const dt = now();
      const itemPrice = Number(form.stockprice) || 0;
      const fromDate = form.vilidityFromDate ? `${form.vilidityFromDate} 00:00:00.000` : null;
      const toDate = form.vilidityToDate ? `${form.vilidityToDate} 23:59:59.999` : null;
      const payload = {
        itemCode: isEdit ? itemCode : controlNo,
        itemDiv: form.stockdivision,
        itemDept: form.dept,
        itemBrand: form.brand,
        itemClass: form.stockclass,
        itemRange: form.range,
        itemType: form.stocktype,
        itemName: form.stockname.trim(),
        itemDesc: form.item_desc?.trim() || form.stockname.trim(),
        itemBarcode: form.ItemBarCode || controlNo + "0000",
        itemPrice,
        itemPriceFloor: Number(form.floorprice) || null,
        itemPriceCeiling: Number(form.priceceiling) || null,
        itemIsactive: form.item_active,
        rptCode: form.rptcode || null,
        disclimit: form.disclimit ? Number(form.disclimit) : null,
        itemDate: dt,
        itemTime: dt,
        itemModdate: dt,
        itemModtime: dt,
        itemCreateuser: userDetails?.username || "SYSTEM",
        itemSupp: form.supply_itemsval || null,
        itemFoc: form.customer_replan,
        itemUom: (uoms[0]?.itemUom || uomOptions[0]?.value) || null,
        vilidityFromDate: fromDate,
        vilidityToDate: toDate,
        itmDuration: form.duration ? Number(form.duration) : null,
        printdesc: form.membershipPoint || null,
        autocustdisc: form.auto_cust_disc,
        isHaveTax: form.tax,
        isAllowFoc: form.allow_foc,
        commissionable: form.commissionable,
        reminderActive: form.redeem_item,
        reorderActive: form.reoreder_level,
        reorderMinqty: form.reoreder_level && form.min_qty ? Number(form.min_qty) : null,
        custReplenishDays: form.customer_replan && form.Replenishment ? Number(form.Replenishment) : null,
        custAdvanceDays: form.customer_replan && form.Remind_advance ? Number(form.Remind_advance) : null,
        salescomm: form.Sales_commission || null,
        workcomm: form.work_commission || null,
        salescommpoints: form.sales_point ? Number(form.sales_point) : null,
        workcommpoints: form.work_point ? Number(form.work_point) : null,
        t1TaxCode: form.taxone || null,
        t2TaxCode: form.taxtwo || null,
        accountCodeTd: form.account_no || null,
        voucherValue: form.stockdivision === "4" ? Number(voucherValue) : null,
        voucherValueIsAmount: form.stockdivision === "4" ? voucherValueIsAmount : null,
        voucherValidPeriod: form.stockdivision === "4" ? voucherValidPeriod : null,
        voucherValidUntilDate: form.stockdivision === "4" && isVoucherValidDate ? voucherValidUntilDate : null,
        prepaidValue: form.stockdivision === "5" ? Number(prepaidValue) : null,
        prepaidSellAmt: form.stockdivision === "5" ? Number(prepaidSellAmt) : null,
        prepaidValidPeriod: form.stockdivision === "5" ? prepaidValidPeriod : null,
        membercardnoaccess: form.stockdivision === "5" ? prepaidMemberCardAccess : null,
      };

      if (isEdit) {
        await itemMasterApi.updateStock(itemCode, payload);

        // Usage Levels
        if (usageItems.length > 0) {
           for (const u of usageItems) {
             await itemMasterApi.createUsagelevels({
               serviceCode: itemCode,
               itemCode: u.itemCode,
               qty: u.qty,
               uom: u.uom,
               serviceDesc: form.stockname,
               itemDesc: u.itemName,
               isactive: true
             });
           }
        }

        // Prepaid Conditions
        if (form.stockdivision === "5" && prepaidConditions.length > 0) {
           for (const p of prepaidConditions) {
             await itemMasterApi.createPrepaidOpenConditions({
               itemCode: itemCode,
               type: p.type,
               condition1: p.condition1,
               condition2: p.condition2,
               price: p.price,
               isactive: true
             });
           }
        }

        // ItemLinks - create new, update rptCodeStatus for existing
        for (const l of linkList) {
          if (l.itmId) {
            await itemMasterApi.updateItemLink(l.itmId, { rptCodeStatus: l.rptCodeStatus });
          } else {
            await itemMasterApi.createItemLinks({
              linkCode: l.linkCode,
              itemCode: itemCode,
              linkDesc: l.linkDesc,
              linkFactor: 0,
              linkType: "",
              itmIsactive: form.item_active,
              rptCodeStatus: l.rptCodeStatus,
            });
          }
        }

        const showUomSection = ["1", "2", ""].includes(form.stockdivision);
        if (showUomSection) {
        for (let i = 0; i < uoms.length; i++) {
          const u = uoms[i];
          if (u.id) {
            await itemMasterApi.updateItemUomprice(u.id, {
              itemPrice: Number(u.itemPrice),
              itemCost: Number(u.itemCost),
              minMargin: Number(u.minMargin),
            });
          } else {
            await itemMasterApi.createItemUomprices({
              itemCode,
              itemUom: u.itemUom,
              uomDesc: u.uomDesc,
              uomUnit: u.uomUnit,
              itemUom2: u.itemUom2,
              uom2Desc: u.uom2Desc,
              itemPrice: Number(u.itemPrice),
              itemCost: Number(u.itemCost),
              minMargin: Number(u.minMargin),
              isactive: true,
            });
          }
        }
        }

        const currentSiteCodes = new Set(sites.map((s) => s.itemsiteCode));
        for (const orig of originalStocklists) {
          if (!currentSiteCodes.has(orig.itemsiteCode) && orig.itemstocklistId) {
            await itemMasterApi.updateItemStocklist(orig.itemstocklistId, {
              itemstocklistStatus: false,
            });
          }
        }
        for (const s of sites) {
          if (s.itemstocklistId) {
            await itemMasterApi.updateItemStocklist(s.itemstocklistId, {
              itemstocklistStatus: s.itemsiteIsactive,
            });
          } else {
            await itemMasterApi.createItemStocklists([{
              itemCode,
              itemsiteCode: s.itemsiteCode,
              onhandQty: 0,
              itemstocklistMinqty: 0,
              itemstocklistMaxqty: 0,
              onhandCst: 0,
              itemstocklistStatus: s.itemsiteIsactive,
              itemstocklistUser: userDetails?.username || "SYSTEM",
              itemstocklistDatetime: new Date(),
            }]);
          }
        }

        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append("Stock_PIC", imageFile);
            formData.append("item_code", itemCode);
            await itemMasterApi.uploadStockImage(formData);
          } catch (imgErr) {
            console.warn("Image upload failed:", imgErr);
            toast.warning("Item updated but image upload failed");
          }
        }

        toast.success("Item updated successfully");
      } else {
        await itemMasterApi.createStock(payload);

        const newStockLists = sites.map((s) => ({
          itemCode: controlNo,
          itemsiteCode: s.itemsiteCode,
          onhandQty: 0,
          itemstocklistMinqty: 0,
          itemstocklistMaxqty: 0,
          onhandCst: 0,
          itemstocklistStatus: s.itemsiteIsactive,
          itemstocklistUser: userDetails?.username || "SYSTEM",
          itemstocklistDatetime: new Date(),
        }));
        if (newStockLists.length > 0) {
          await itemMasterApi.createItemStocklists(newStockLists);
        }

        const showUomSectionCreate = ["1", "2", ""].includes(form.stockdivision);
        if (showUomSectionCreate) {
        for (const u of uoms) {
          await itemMasterApi.createItemUomprices({
            itemCode: controlNo,
            itemUom: u.itemUom,
            uomDesc: u.uomDesc,
            uomUnit: u.uomUnit,
            itemUom2: u.itemUom2,
            uom2Desc: u.uom2Desc,
            itemPrice: Number(u.itemPrice),
            itemCost: Number(u.itemCost),
            minMargin: Number(u.minMargin),
            isactive: true,
          });
        }
        }

        if (["1", "2", ""].includes(form.stockdivision)) {
          const primaryUom = uoms[0]?.itemUom || uomOptions[0]?.value;
          for (const s of sites) {
            await itemMasterApi.createItemBatches({
              itemCode: controlNo,
              siteCode: s.itemsiteCode,
              batchNo: "",
              uom: primaryUom || "",
              qty: 0,
              expDate: new Date(),
              isActive: true,
            });
          }
        }

        for (const l of linkList) {
          await itemMasterApi.createItemLinks({
            linkCode: l.linkCode,
            itemCode: controlNo,
            linkDesc: l.linkDesc,
            linkFactor: 0,
            linkType: "",
            itmIsactive: form.item_active,
            rptCodeStatus: l.rptCodeStatus,
          });
        }

        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append("Stock_PIC", imageFile);
            formData.append("item_code", controlNo);
            await itemMasterApi.uploadStockImage(formData);
          } catch (imgErr) {
            console.warn("Image upload failed:", imgErr);
            toast.warning("Item saved but image upload failed");
          }
        }

        // Usage Levels
        if (usageItems.length > 0) {
           for (const u of usageItems) {
             await itemMasterApi.createUsagelevels({
               serviceCode: controlNo,
               itemCode: u.itemCode,
               qty: u.qty,
               uom: u.uom,
               serviceDesc: form.stockname,
               itemDesc: u.itemName,
               isactive: true
             });
           }
        }

        // Prepaid Conditions
        if (form.stockdivision === "5" && prepaidConditions.length > 0) {
           for (const p of prepaidConditions) {
             await itemMasterApi.createPrepaidOpenConditions({
               itemCode: controlNo,
               type: p.type,
               condition1: p.condition1,
               condition2: p.condition2,
               price: p.price,
               isactive: true
             });
           }
        }

        toast.success("Item created successfully");
      }
      navigate("/item-master");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        <span className="text-gray-600 ml-4 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 px-4 max-w-[1400px] mx-auto pb-20">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/item-master")}
            className="h-9 w-9 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEdit ? "Edit Item Master" : "New Item Master"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? `Update details for item ${itemCode}` : "Create a new inventory item"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/item-master")} className="bg-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-950 hover:bg-blue-900 min-w-[100px]"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update Item" : "Create Item"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Collapsible open={sectionOpen.general} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, general: v }))} className="border rounded-lg shadow-sm bg-white">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">General Information</CardTitle>
                {sectionOpen.general ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Stock Code</Label>
                  <Input value={isEdit ? itemCode : controlNo} disabled className="mt-1.5 bg-gray-50 font-mono" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Division <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.stockdivision}
                    onValueChange={(v) => setField("stockdivision", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select Division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionOptions.map((o, idx) => (
                        <SelectItem key={`div-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Department <span className="text-red-500">*</span></Label>
                    <Select value={form.dept} onValueChange={(v) => setField("dept", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {deptOptions.map((o, idx) => (
                          <SelectItem key={`dept-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setAddDeptOpen(true)} title="Add Department">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Brand <span className="text-red-500">*</span></Label>
                    <Select value={form.brand} onValueChange={(v) => setField("brand", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandOptions.map((o, idx) => (
                          <SelectItem key={`brand-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setAddBrandOpen(true)} title="Add Brand">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Class <span className="text-red-500">*</span></Label>
                    <Select value={form.stockclass} onValueChange={(v) => setField("stockclass", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classOptions.map((o, idx) => (
                          <SelectItem key={`class-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setAddClassOpen(true)} title="Add Class">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Range <span className="text-red-500">*</span></Label>
                    <Select value={form.range} onValueChange={(v) => setField("range", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Range" />
                      </SelectTrigger>
                      <SelectContent>
                        {rangeOptions.map((o, idx) => (
                          <SelectItem key={`range-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setAddRangeOpen(true)} disabled={!form.brand} title="Add Range">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Type</Label>
                  <Select value={form.stocktype} onValueChange={(v) => setField("stocktype", v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">SINGLE</SelectItem>
                      <SelectItem value="PACKAGE">PACKAGE</SelectItem>
                      <SelectItem value="COMPOUND">COMPOUND</SelectItem>
                      {typeOptions.map((o, idx) => (
                        <SelectItem key={`type-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase">Stock Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.stockname}
                    onChange={(e) => setField("stockname", e.target.value)}
                    placeholder="Stock Name"
                    className="mt-1.5"
                    maxLength={40}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase">Description <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.item_desc}
                    onChange={(e) => setField("item_desc", e.target.value)}
                    placeholder="Description"
                    className="mt-1.5"
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Barcode</Label>
                  <Input
                    value={form.ItemBarCode}
                    onChange={(e) => setField("ItemBarCode", e.target.value)}
                    placeholder="Barcode"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Price</Label>
                  <Input
                    type="number"
                    value={form.stockprice}
                    onChange={(e) => setField("stockprice", e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Floor Price</Label>
                  <Input
                    type="number"
                    value={form.floorprice}
                    onChange={(e) => setField("floorprice", e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Price Ceiling</Label>
                  <Input
                    type="number"
                    value={form.priceceiling}
                    onChange={(e) => setField("priceceiling", e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Discount Limit</Label>
                  <Input
                    type="number"
                    value={form.disclimit}
                    onChange={(e) => setField("disclimit", e.target.value)}
                    placeholder="0"
                    className="mt-1.5"
                  />
                </div>
                {!["3", "4", "5"].includes(form.stockdivision) && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase">Supplier Code <span className="text-red-500">*</span></Label>
                    <Select value={form.supply_itemsval || "__none__"} onValueChange={(v) => setField("supply_itemsval", v === "__none__" ? "" : v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {supplyOptions.map((o, idx) => (
                          <SelectItem key={`supply-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="lg:col-span-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase">Picture</Label>
                  <div className="mt-1.5 flex items-center gap-4 p-2 border rounded-md bg-gray-50/50">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setImageFile(f || null);
                        setImagePreview(f ? URL.createObjectURL(f) : null);
                      }}
                      className="max-w-[250px] bg-white"
                    />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded object-cover border bg-white" />
                    ) : (
                      <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center text-gray-400 bg-white">
                        <span className="text-xs">No Img</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">From Date</Label>
                  <Input
                    type="date"
                    value={form.vilidityFromDate}
                    onChange={(e) => setField("vilidityFromDate", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">To Date</Label>
                  <Input
                    type="date"
                    value={form.vilidityToDate}
                    onChange={(e) => setField("vilidityToDate", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                    placeholder="0"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Membership Point Redeem</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.membershipPoint}
                    onChange={(e) => setField("membershipPoint", e.target.value)}
                    placeholder="0"
                    className="mt-1.5"
                  />
                </div>
                <div className="col-span-full flex flex-wrap gap-6 pt-4 border-t mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="active" checked={form.item_active} onCheckedChange={(v) => setField("item_active", !!v)} />
                    <Label htmlFor="active" className="cursor-pointer">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="percent" checked={form.percent} onCheckedChange={(v) => setField("percent", !!v)} />
                    <Label htmlFor="percent" className="cursor-pointer">Percent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="auto_cust_disc" checked={form.auto_cust_disc} onCheckedChange={(v) => setField("auto_cust_disc", !!v)} />
                    <Label htmlFor="auto_cust_disc" className="cursor-pointer">Auto Cust Disc</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tax" checked={form.tax} onCheckedChange={(v) => setField("tax", !!v)} />
                    <Label htmlFor="tax" className="cursor-pointer">Tax</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="allow_foc" checked={form.allow_foc} onCheckedChange={(v) => setField("allow_foc", !!v)} />
                    <Label htmlFor="allow_foc" className="cursor-pointer">Allow FOC</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="commissionable" checked={form.commissionable} onCheckedChange={(v) => setField("commissionable", !!v)} />
                    <Label htmlFor="commissionable" className="cursor-pointer">Commissionable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="redeem_item" checked={form.redeem_item} onCheckedChange={(v) => setField("redeem_item", !!v)} />
                    <Label htmlFor="redeem_item" className="cursor-pointer">Redeem Item</Label>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {form.commissionable && (
          <Collapsible open={sectionOpen.commission} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, commission: v }))} className="border rounded-lg shadow-sm">
            <Card className="border-0 shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                  <CardTitle className="text-base font-semibold">Commission Settings</CardTitle>
                  {sectionOpen.commission ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase">Sales Commission Group</Label>
                    <Select value={form.Sales_commission || "__none__"} onValueChange={(v) => setField("Sales_commission", v === "__none__" ? "" : v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {salesCommOptions.map((o, idx) => (
                          <SelectItem key={`salescomm-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase">Sales Points</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.sales_point}
                      onChange={(e) => setField("sales_point", e.target.value)}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase">Work Commission Group</Label>
                    <Select value={form.work_commission || "__none__"} onValueChange={(v) => setField("work_commission", v === "__none__" ? "" : v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {workCommOptions.map((o, idx) => (
                          <SelectItem key={`workcomm-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase">Work Points</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.work_point}
                      onChange={(e) => setField("work_point", e.target.value)}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {["1", "2", ""].includes(form.stockdivision) && (
        <Collapsible open={sectionOpen.uom} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, uom: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">UOM</CardTitle>
                {sectionOpen.uom ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-0">
                <div className="p-4 space-y-6">
                  {/* Table 1: Conversion Logic */}
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead className="w-[50px] text-center">No</TableHead>
                          <TableHead>UOMC Code</TableHead>
                          <TableHead>UOMC Description</TableHead>
                          <TableHead className="w-[40px] text-center">=</TableHead>
                          <TableHead>UOM Unit</TableHead>
                          <TableHead>UOM Code</TableHead>
                          <TableHead>UOM Description</TableHead>
                          <TableHead className="w-[60px] text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uoms.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-4 text-gray-500">No UOMs defined</TableCell>
                          </TableRow>
                        ) : (
                          uoms.map((u, idx) => (
                            <TableRow key={`conv-${idx}`}>
                              <TableCell className="text-center text-xs text-gray-500">{idx + 1}</TableCell>
                              <TableCell>{u.itemUom}</TableCell>
                              <TableCell>{u.uomDesc}</TableCell>
                              <TableCell className="text-center text-gray-400">=</TableCell>
                              <TableCell>{u.uomUnit}</TableCell>
                              <TableCell>{u.itemUom2}</TableCell>
                              <TableCell>{u.uom2Desc}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full"
                                  onClick={() => removeUom(idx)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <Button variant="outline" className="w-full border-dashed" onClick={addUom}>
                    <Plus className="w-4 h-4 mr-2" /> Add Row
                  </Button>

                  {/* Table 2: Pricing */}
                  {uoms.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50/50">
                          <TableRow>
                            <TableHead className="w-[50px] text-center">No</TableHead>
                            <TableHead>UOMC Desc</TableHead>
                            <TableHead className="w-[150px]">Price</TableHead>
                            <TableHead className="w-[150px]">Cost</TableHead>
                            <TableHead className="w-[120px]">Min Margin %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uoms.map((u, idx) => (
                            <TableRow key={`price-${idx}`}>
                              <TableCell className="text-center text-xs text-gray-500">{idx + 1}</TableCell>
                              <TableCell>{u.uomDesc}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={u.itemPrice}
                                  onChange={(e) => {
                                    const newPrice = Number(e.target.value) || 0;
                                    const cost = Number(u.itemCost) || 0;
                                    if (cost > 0 && newPrice > 0 && cost >= newPrice) {
                                      toast.error("Cost must be less than Price");
                                      return;
                                    }
                                    updateUom(idx, "itemPrice", e.target.value);
                                  }}
                                  placeholder="Enter Price"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={u.itemCost}
                                  onChange={(e) => {
                                    const newCost = Number(e.target.value) || 0;
                                    const price = Number(u.itemPrice) || 0;
                                    if (price > 0 && newCost >= price) {
                                      toast.error("Cost must be less than Price");
                                      return;
                                    }
                                    updateUom(idx, "itemCost", e.target.value);
                                  }}
                                  placeholder="Enter Cost"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={u.minMargin}
                                  readOnly
                                  placeholder="Auto"
                                  className="h-8 bg-gray-50"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        {["1", "2", ""].includes(form.stockdivision) && (
        <Collapsible open={sectionOpen.stkBalance} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, stkBalance: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Stk.Balance</CardTitle>
                {sectionOpen.stkBalance ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                <div className="flex flex-col gap-2 p-4 border rounded-md bg-gray-50/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="reoreder_level" checked={form.reoreder_level} onCheckedChange={(v) => setField("reoreder_level", !!v)} />
                    <Label htmlFor="reoreder_level" className="font-semibold cursor-pointer">Re-Order Level</Label>
                  </div>
                  {form.reoreder_level && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs text-gray-500 uppercase">Min Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.min_qty}
                        onChange={(e) => setField("min_qty", e.target.value)}
                        placeholder="0"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>
                <div className="lg:col-span-3 flex flex-col gap-2 p-4 border rounded-md bg-gray-50/30">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="customer_replan" checked={form.customer_replan} onCheckedChange={(v) => setField("customer_replan", !!v)} />
                    <Label htmlFor="customer_replan" className="font-semibold cursor-pointer">Customer Replenishment</Label>
                  </div>
                  {form.customer_replan && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <Label className="text-xs text-gray-500 uppercase">Replenishment (Days)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.Replenishment}
                          onChange={(e) => setField("Replenishment", e.target.value)}
                          placeholder="0"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 uppercase">Remind Advance (Days)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.Remind_advance}
                          onChange={(e) => setField("Remind_advance", e.target.value)}
                          placeholder="0"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        {form.stockdivision !== "5" && (
        <Collapsible open={sectionOpen.linkCode} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, linkCode: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Link Codes</CardTitle>
                {sectionOpen.linkCode ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-end bg-gray-50/30 p-4 rounded-md border">
                  <div className="flex-1 w-full">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Link Code</Label>
                    <Input value={newLinkCode} onChange={(e) => setNewLinkCode(e.target.value)} placeholder="Enter Code" className="mt-1.5" />
                  </div>
                  <div className="flex-[2] w-full">
                    <Label className="text-xs font-medium text-gray-500 uppercase">Description</Label>
                    <Input value={newLinkDesc} onChange={(e) => setNewLinkDesc(e.target.value)} placeholder="Enter Description" className="mt-1.5" />
                  </div>
                  <Button type="button" onClick={addLink} className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Add Link
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead>Link Code</TableHead>
                        <TableHead>Link Description</TableHead>
                        <TableHead className="w-[100px] text-center">Rpt Code</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">No link codes added</TableCell>
                        </TableRow>
                      ) : (
                        linkList.map((l, idx) => (
                          <TableRow key={`${l.linkCode}-${idx}`}>
                            <TableCell className="font-medium">{l.linkCode}</TableCell>
                            <TableCell>{l.linkDesc}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.rptCodeStatus}
                                onCheckedChange={() => toggleLinkRptCode(l.linkCode)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => removeLink(idx)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        <Collapsible open={sectionOpen.stockListing} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, stockListing: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Stock Listing</CardTitle>
                {sectionOpen.stockListing ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-6">
                {!isEdit ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-4 border-b">
                      <Checkbox
                        id="select-all-sites"
                        checked={sites.length === siteOptions.length && siteOptions.length > 0}
                        onCheckedChange={(v) => handleSelectAllSites(!!v)}
                      />
                      <Label htmlFor="select-all-sites" className="cursor-pointer font-bold text-gray-700">Select All Sites</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {siteOptions.map((s) => {
                      const selected = sites.some((x) => x.itemsiteCode === s.value);
                      return (
                        <div key={s.value} className={`flex items-center space-x-3 p-3 rounded border transition-colors ${selected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
                          <Checkbox
                            id={`site-${s.value}`}
                            checked={selected}
                            onCheckedChange={() => toggleSite(s.value)}
                          />
                          <Label htmlFor={`site-${s.value}`} className="cursor-pointer flex-1">
                            {s.label}
                          </Label>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {siteOptions.map((s) => {
                      const existing = sites.find((x) => x.itemsiteCode === s.value);
                      const isSelected = !!existing;
                      return (
                        <div key={s.value} className={`flex items-center justify-between p-3 rounded border transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/50'}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`site-edit-${s.value}`}
                              checked={isSelected}
                              onCheckedChange={() => {
                                if (isSelected) {
                                  setSites((prev) => prev.filter((x) => x.itemsiteCode !== s.value));
                                } else {
                                  setSites((prev) => [...prev, { itemsiteCode: s.value, itemsiteIsactive: true }]);
                                }
                              }}
                            />
                            <Label htmlFor={`site-edit-${s.value}`} className="cursor-pointer font-medium">
                              {s.label}
                            </Label>
                          </div>
                          {isSelected && (
                            <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded border">
                              <Checkbox
                                id={`site-active-${s.value}`}
                                checked={existing?.itemsiteIsactive !== false}
                                onCheckedChange={(v) => {
                                  setSites((prev) =>
                                    prev.map((x) =>
                                      x.itemsiteCode === s.value ? { ...x, itemsiteIsactive: !!v } : x
                                    )
                                  );
                                }}
                              />
                              <Label htmlFor={`site-active-${s.value}`} className="text-xs cursor-pointer text-gray-500 uppercase font-bold">Active</Label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {["3", ""].includes(form.stockdivision) && (
        <Collapsible open={sectionOpen.itemUsage} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, itemUsage: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Item Usage</CardTitle>
                {sectionOpen.itemUsage ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-6">
                <div className="mb-6 relative">
                  <Label className="text-xs font-medium text-gray-500 uppercase">Search Item to Add</Label>
                  <div className="relative mt-1.5">
                    <Input
                      value={usageSearch}
                      onChange={(e) => searchUsageItems(e.target.value)}
                      placeholder="Type item name or code..."
                      className="pl-9"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                  </div>
                  {usageSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                      {usageSearchResults.map((item) => (
                        <div
                          key={item.itemCode}
                          className="p-2.5 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                          onClick={() => addUsageItem(item)}
                        >
                          <span className="font-semibold text-gray-700">{item.itemCode}</span>
                          <span className="mx-2 text-gray-400">|</span>
                          <span className="text-gray-600">{item.itemName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[120px]">Qty</TableHead>
                        <TableHead className="w-[100px]">UOM</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">No usage items added</TableCell>
                        </TableRow>
                      ) : (
                        usageItems.map((u, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{u.itemCode}</TableCell>
                            <TableCell>{u.itemName}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={u.qty}
                                onChange={(e) => {
                                  const next = [...usageItems];
                                  next[idx].qty = Number(e.target.value);
                                  setUsageItems(next);
                                }}
                                className="w-24 h-8"
                              />
                            </TableCell>
                            <TableCell>{u.uom}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => removeUsageItem(idx)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        {["4", ""].includes(form.stockdivision) && (
          <Collapsible open={sectionOpen.voucher} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, voucher: v }))} className="border rounded-lg shadow-sm">
            <Card className="border-0 shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                  <CardTitle className="text-base font-semibold">Voucher Details</CardTitle>
                  {sectionOpen.voucher ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center gap-4 p-4 border rounded-md bg-gray-50/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="validityDate" checked={isVoucherValidDate} onCheckedChange={(v) => setIsVoucherValidDate(!!v)} />
                      <Label htmlFor="validityDate" className="cursor-pointer font-medium">Set Validity Date</Label>
                    </div>
                    {isVoucherValidDate && (
                      <Input type="date" value={voucherValidUntilDate} onChange={(e) => setVoucherValidUntilDate(e.target.value)} className="w-auto" />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase">Validity Period</Label>
                      <Select value={voucherValidPeriod} onValueChange={setVoucherValidPeriod}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                          {voucherValidPeriodOptions.map((o, idx) => (
                            <SelectItem key={`voucher-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase">Value</Label>
                      <div className="flex gap-4 mt-1.5">
                        <Input type="number" value={voucherValue} onChange={(e) => setVoucherValue(e.target.value)} placeholder="0.00" className="flex-1" />
                        <div className="flex items-center gap-4 bg-gray-100 px-3 rounded-md border">
                          <div className="flex items-center space-x-2">
                            <input type="radio" id="amount" name="voucherType" checked={voucherValueIsAmount} onChange={() => setVoucherValueIsAmount(true)} className="accent-blue-600" />
                            <Label htmlFor="amount" className="cursor-pointer">Amount</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="radio" id="percent" name="voucherType" checked={!voucherValueIsAmount} onChange={() => setVoucherValueIsAmount(false)} className="accent-blue-600" />
                            <Label htmlFor="percent" className="cursor-pointer">Percent</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {["5", ""].includes(form.stockdivision) && (
          <Collapsible open={sectionOpen.prepaid} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, prepaid: v }))} className="border rounded-lg shadow-sm">
            <Card className="border-0 shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                  <CardTitle className="text-base font-semibold">Prepaid Configuration</CardTitle>
                  {sectionOpen.prepaid ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase">Valid Period</Label>
                      <Select value={prepaidValidPeriod} onValueChange={setPrepaidValidPeriod}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                          {prepaidValidPeriodOptions.map((o, idx) => (
                            <SelectItem key={`prepaid-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="cardAccess" checked={prepaidMemberCardAccess} onCheckedChange={(v) => setPrepaidMemberCardAccess(!!v)} />
                        <Label htmlFor="cardAccess" className="cursor-pointer font-medium">Member Card No Accessible</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inclusive Section */}
                    <div className="border rounded-md p-4 bg-green-50/30 border-green-100">
                      <h4 className="font-semibold mb-4 text-green-800 flex items-center"><Plus className="w-4 h-4 mr-2" /> Add Inclusive Condition</h4>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-green-700 uppercase">Type</Label>
                          <Select value={prepaidInclusiveType} onValueChange={setPrepaidInclusiveType}>
                            <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Product Only">Product Only</SelectItem>
                              <SelectItem value="Service Only">Service Only</SelectItem>
                              <SelectItem value="All">All</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex items-center space-x-2 pt-8">
                            <Checkbox id="prepaidAll" checked={prepaidAll} onCheckedChange={(v) => setPrepaidAll(!!v)} />
                            <Label htmlFor="prepaidAll">All</Label>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-green-700 uppercase">Item/Group</Label>
                            <Select
                              value={prepaidAll ? "All" : prepaidInclusiveValue}
                              onValueChange={setPrepaidInclusiveValue}
                              disabled={prepaidAll}
                            >
                              <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select Item" /></SelectTrigger>
                              <SelectContent>
                                {prepaidInclusiveOptions.map((o, idx) => (
                                  <SelectItem key={`pi-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-green-700 uppercase">Price</Label>
                          <Input type="number" value={prepaidValue} onChange={(e) => setPrepaidValue(e.target.value)} className="mt-1 bg-white" placeholder="0.00" />
                        </div>
                        <Button 
                          type="button" 
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => addPrepaidCondition("Inclusive", prepaidInclusiveType, prepaidAll ? "All" : prepaidInclusiveValue, prepaidValue)}
                        >
                          Add Inclusive
                        </Button>
                      </div>
                    </div>

                    {/* Exclusive Section */}
                    <div className="border rounded-md p-4 bg-red-50/30 border-red-100">
                      <h4 className="font-semibold mb-4 text-red-800 flex items-center"><Trash2 className="w-4 h-4 mr-2" /> Add Exclusive Condition</h4>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-red-700 uppercase">Type</Label>
                          <Select value={prepaidExclusiveType} onValueChange={setPrepaidExclusiveType}>
                            <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Product Only">Product Only</SelectItem>
                              <SelectItem value="Service Only">Service Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-red-700 uppercase">Item/Group</Label>
                          <Select value={prepaidExclusiveValue} onValueChange={setPrepaidExclusiveValue}>
                            <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select Item" /></SelectTrigger>
                            <SelectContent>
                              {prepaidExclusiveOptions.map((o, idx) => (
                                <SelectItem key={`pe-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="invisible">
                           <Label>Spacer</Label>
                           <Input className="mt-1" />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive"
                          className="w-full"
                          onClick={() => addPrepaidCondition("Exclusive", prepaidExclusiveType, prepaidExclusiveValue, prepaidValue)}
                        >
                          Add Exclusive
                        </Button>
                      </div>
                    </div>
                  </div>
                    
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Condition 1</TableHead>
                          <TableHead>Condition 2</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prepaidConditions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">No conditions added</TableCell>
                          </TableRow>
                        ) : (
                          prepaidConditions.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{p.type}</TableCell>
                              <TableCell>{p.condition1}</TableCell>
                              <TableCell>{p.condition2}</TableCell>
                              <TableCell>{p.price}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => removePrepaidCondition(idx)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase">Prepaid Value</Label>
                      <Input type="number" value={prepaidValue} disabled className="mt-1.5 bg-gray-50" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase">Prepaid Amount</Label>
                      <Input type="number" value={prepaidSellAmt} onChange={(e) => setPrepaidSellAmt(e.target.value)} className="mt-1.5" placeholder="0.00" />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <Collapsible open={sectionOpen.accountCode} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, accountCode: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Account Code</CardTitle>
                {sectionOpen.accountCode ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-6">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">Account Code</Label>
                  <Input
                    value={form.account_no}
                    onChange={(e) => setField("account_no", e.target.value)}
                    placeholder="Enter GL Account Code"
                    type="text"
                    className="mt-1.5 max-w-md"
                  />
                  <p className="text-xs text-gray-400 mt-1">Link this item to a specific general ledger account.</p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {form.tax && (
        <Collapsible open={sectionOpen.taxCode} onOpenChange={(v) => setSectionOpen((s) => ({ ...s, taxCode: v }))} className="border rounded-lg shadow-sm">
          <Card className="border-0 shadow-none">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors rounded-t-lg py-3">
                <CardTitle className="text-base font-semibold">Tax Code</CardTitle>
                {sectionOpen.taxCode ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">1st Tax Code <span className="text-red-500">*</span></Label>
                  <Select value={form.taxone || "__none__"} onValueChange={(v) => setField("taxone", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select Tax Type 1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {taxType1Options.map((o, idx) => (
                        <SelectItem key={`tax1-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase">2nd Tax Code <span className="text-red-500">*</span></Label>
                  <Select value={form.taxtwo || "__none__"} onValueChange={(v) => setField("taxtwo", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select Tax Type 2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {taxType2Options.map((o, idx) => (
                        <SelectItem key={`tax2-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        <div className="flex justify-end gap-4 pt-6 border-t mt-8">
          <Button variant="outline" onClick={() => navigate("/item-master")} className="bg-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-950 hover:bg-blue-900 min-w-[120px]"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update Item" : "Create Item"}
          </Button>
        </div>

        <AddDeptModal open={addDeptOpen} onOpenChange={setAddDeptOpen} onSuccess={refreshDept} />
        <AddBrandModal open={addBrandOpen} onOpenChange={setAddBrandOpen} onSuccess={refreshBrand} />
        <AddClassModal open={addClassOpen} onOpenChange={setAddClassOpen} onSuccess={refreshClass} />
        <AddRangeModal open={addRangeOpen} onOpenChange={setAddRangeOpen} onSuccess={refreshRange} brand={form.brand} dept={form.dept} />
        <AddUomModal open={addUomOpen} onOpenChange={setAddUomOpen} onSuccess={handleUomSuccess} existingUoms={uoms} />
      </div>
    </div>
  );
}

export default ItemMasterForm;
