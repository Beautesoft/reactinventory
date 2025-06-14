import React, { useState, useEffect, use, memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import TableSpinner from "@/components/tabelSpinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Hand,
  Pencil,
  Trash2,
  Plus,
  Loader,
  Loader2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import moment from "moment";
import apiService from "@/services/apiService";
import {
  buildCountObject,
  buildCountQuery,
  buildFilterObject,
  buildFilterQuery,
  format_Date,
  queryParamsGenerate,
} from "@/utils/utils";
import { useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Pagination from "@/components/pagination";
import ItemTable from "@/components/itemTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import useDebounce from "@/hooks/useDebounce";
import { MultiSelect } from "@/components/ui/multi-select";
import apiService1 from "@/services/apiService1";

const calculateTotals = (cartData) => {
  return cartData.reduce(
    (acc, item) => ({
      totalQty: acc.totalQty + Number(item.docQty),
      totalAmt: acc.totalAmt + Number(item.docAmt),
    }),
    { totalQty: 0, totalAmt: 0 }
  );
};

const EditDialog = memo(
  ({ showEditDialog, setShowEditDialog, editData, onEditCart, onSubmit }) => (
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-describedby="edit-item-description"
      >
        <DialogHeader>
          <DialogTitle>Edit Item Details</DialogTitle>
          <div
            id="edit-item-description"
            className="text-sm text-muted-foreground"
          >
            Modify item details
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min="0"
              value={editData?.docQty || ""}
              onChange={(e) => onEditCart(e, "docQty")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              min="0"
              value={editData?.docPrice || ""}
              onChange={(e) => onEditCart(e, "docPrice")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={editData?.docExpdate || ""}
              onChange={(e) => onEditCart(e, "docExpdate")}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batchNo">Batch No</Label>
            <Input
              id="batchNo"
              value={editData?.docBatchNo || ""}
              onChange={(e) => onEditCart(e, "docBatchNo")}
              placeholder="Enter batchNo"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={editData?.itemRemark || ""}
              onChange={(e) => onEditCart(e, "itemRemark")}
              placeholder="Enter remarks"
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEditDialog(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
);

function AddGti({ docData }) {
  const { docNo } = useParams();
  const navigate = useNavigate();
  const urlDocNo = docNo || null;
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  console.log(urlDocNo, "urlDocNo");
  console.log(urlStatus, "urlStatus");

  // State management
  const statusOptions = [
    { value: 0, label: "Open" },
    { value: 7, label: "Posted" },
  ];

  const [activeTab, setActiveTab] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [itemTotal, setItemTotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 1000);
  const [supplyOptions, setSupplyOptions] = useState([]);
  const [stockList, setStockList] = useState([]);
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "GTI",
    splyCode: "",
    docNo: "",
  });

  const [itemFilter, setItemFilter] = useState({
    whereArray: {
      department: ["RETAIL PRODUCT", "SALON PRODUCT"],
      brand: [],
      range: [],
    },
    like: {
      stockCode: "",
      itemUom: "",
      stockName: "",
      brandCode: "",
    },
    splyCode: "",
    docNo: "",
    skip: 0,
    limit: 6,
  });

  const [dropDownFilter, setDropDownFilter] = useState({});
  const [stockHdrs, setStockHdrs] = useState({
    docNo: "",
    docDate: new Date().toISOString().split("T")[0],
    docStatus: 0,
    docRef1: "",
    docRef2: "",
    storeNo: userDetails?.siteCode,
    fstoreNo: "",
    tstoreNo: userDetails?.siteCode,
    docRemk1: "",
    createUser: userDetails?.username,
    movCode: "GTI",
    movType: "GTI",
  });
  const [cartData, setCartData] = useState([]);
  const [supplierInfo, setSupplierInfo] = useState({
    Attn: "",
    line1: "",
    line2: "",
    line3: "",
    sline1: "",
    sline2: "",
    sline3: "",
    pcode: "",
    spcode: "",
  });
  const [controlData, setControlData] = useState({
    docNo: "",
    RunningNo: "",
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [brandOption, setBrandOption] = useState([]);
  const [rangeOptions, setRangeOptions] = useState([]);
  const [initial, setInitial] = useState(true);

  const [tempFilters, setTempFilters] = useState({
    brand: [],
    range: [],
  });

  const [originalStockList, setOriginalStockList] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);

  const [storeOptions, setStoreOptions] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6
  });

  const handleApplyFilters = () => {
    setLoading(true);

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    // If no filters are active, restore original data
    if (!tempFilters.brand.length && !tempFilters.range.length && 
        itemFilter.whereArray.department.length === 2) {
      setStockList(originalStockList);
      setItemTotal(originalStockList.length);
      setLoading(false);
      return;
    }

    const filteredList = originalStockList.filter(item => {
      // Brand filter
      if (tempFilters.brand.length > 0) {
        const brandMatch = tempFilters.brand.some(brand => 
          brand.value === item.BrandCode || 
          brand.label === item.Brand
        );
        if (!brandMatch) return false;
      }

      // Range filter
      if (tempFilters.range.length > 0) {
        const rangeMatch = tempFilters.range.some(range => 
          range.value === item.RangeCode || 
          range.label === item.Range
        );
        if (!rangeMatch) return false;
      }

      // Department filter
      if (itemFilter.whereArray.department.length > 0) {
        const departmentMatch = itemFilter.whereArray.department.includes(item.Department);
        if (!departmentMatch) return false;
      }

      return true;
    });

    setStockList(filteredList);
    setItemTotal(filteredList.length);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setLoading(false);
  };

  const handleSearch = (e) => {
    const searchValue = e.target.value.trim().toLowerCase();
    
    // Clear any existing timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    if (!searchValue) {
      // If search is empty, restore original data
      setStockList(originalStockList);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Set new timer
    const timer = setTimeout(() => {
      const filteredList = originalStockList.filter((item) => {
        return (
          item.stockCode?.toLowerCase().includes(searchValue) ||
          item.stockName?.toLowerCase().includes(searchValue) ||
          item.uomDescription?.toLowerCase().includes(searchValue) ||
          item.brandCode?.toLowerCase().includes(searchValue) ||
          item.rangeCode?.toLowerCase().includes(searchValue)
        );
      });

      setStockList(filteredList);
      setLoading(false);
    }, 500);

    setSearchTimer(timer);
  };

  // Add cleanup effect for search timer
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // Add debug effect for original stock list
  useEffect(() => {
    if (originalStockList.length > 0) {
      console.log('Sample Item Structure:', originalStockList[0]);
    }
  }, [originalStockList]);

  useEffect(() => {
    const initializeData = async () => {
      setPageLoading(true);
      setLoading(true);

      try {
        if (urlDocNo) {
          const filter = {
            where: {
              movCode: "GTI",
              docNo: urlDocNo,
            },
          };
          
          await getStockHdr(filter);

          if (urlStatus != 7) {
            await Promise.all([
              getOptions(),
              getStockDetails()
            ]);
          }

          await getStockHdrDetails(filter);
          await getStoreList();
        } else {
          await Promise.all([
            getStoreList(),
            getStockDetails(),
            getOptions()
          ]);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load initial data",
        });
      } finally {
        setPageLoading(false);
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    console.log(itemFilter.whereArray, "wherearray");
    console.log(
      stockList.length > 0,
      itemFilter.whereArray.department.length >= 1,
      "koikkk"
    );
    console.log(initial);

    if (!initial) {
      setLoading(true);
      getStockDetails();
    }
  }, [
    itemFilter.skip,
    debouncedSearchValue,
    itemFilter.whereArray.department.length,
    itemFilter.whereArray.brand,
    itemFilter.whereArray.range,
  ]);

  const getStockHdr = async (filter) => {
    try {
      const response = await apiService.get(
        `StkMovdocHdrs${buildFilterQuery(filter)}`
      );
      const data = response[0];
      console.log(response, "data for stock header");
      setStockHdrs((prev) => ({
        ...prev,
        docNo: data.docNo,
        docDate: moment(data.docDate).format("YYYY-MM-DD"),
        docStatus: data.docStatus,
        // supplyNo: data.supplyNo,
        docRef1: data.docRef1,
        docRef2: data.docRef2,
        // docTerm: data.docTerm,
        storeNo: data.storeNo,
        tstoreNo: data.tstoreNo,
        fstoreNo: data?.fstoreNo,
        docRemk1: data.docRemk1,
        // postDate: moment(data.postDate).format("YYYY-MM-DD"),
      }));

      setSupplierInfo({
        Attn: data?.docAttn,
        line1: data?.baddr1,
        line2: data?.baddr2,
        line3: data?.baddr3,
        pcode: data?.bpostcode,
        sline1: data?.daddr1,
        sline2: data?.daddr2,
        sline3: data?.daddr3,
        spcode: data?.dpostcode,
      });
    } catch (error) {
      console.error("Error fetching stock header data:", error);
      showError("Failed to fetch stock header data.");
    }
  };

  const getOptions = async () => {
    try {
      setLoading(true);
      const [brands, ranges] = await Promise.all([
        apiService.get(`ItemBrands${buildFilterQuery(dropDownFilter)}`),
        apiService.get(`ItemRanges${buildCountQuery(dropDownFilter)}`),
      ]);

      const brandOp = brands.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));
      
      const rangeOp = ranges.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));

      setBrandOption(brandOp);
      setRangeOptions(rangeOp);
    } catch (error) {
      console.error("Error fetching options:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch options",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockDetails = async () => {
    try {
      setLoading(true);
      const query = `?Site=${userDetails?.siteCode}`;
      const res = await apiService1.get(`api/GetInvitems${query}`);
      
      const stockDetails = res.result;
      const count = res.result.length;
      
      const updatedRes = stockDetails.map((item) => ({
        ...item,
        Qty: 0,
        expiryDate: null,
        docAmt: null,
      }));

      setStockList(updatedRes);
      setOriginalStockList(updatedRes);
      setItemTotal(count);
    } catch (err) {
      console.error("Error fetching stock details:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch stock details",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocNo = async () => {
    try {
      const codeDesc = "Transfer From Other Store";
      const siteCode = userDetails?.siteCode;
      const res = await apiService.get(
        `ControlNos?filter={"where":{"and":[{"controlDescription":"${codeDesc}"},{"siteCode":"${siteCode}"}]}}`
      );

      if (!res?.[0]) return null;

      const docNo = res[0].controlPrefix + res[0].siteCode + res[0].controlNo;

      const controlData = {
        docNo: docNo,
        RunningNo: res[0].controlNo,
      };

      return { docNo, controlData };

      setStockHdrs((prev) => ({
        ...prev,
        docNo: docNo,
      }));

      setControlData(controlData);

      const docNoAdd = cartData.map((item) => ({
        ...item,
        docNo: docNo,
      }));
      setCartData(docNoAdd);
    } catch (err) {
      console.error("Error fetching doc number:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate document number",
      });
    }
  };

  const addNewControlNumber = async (controlData) => {
    try {
      const controlNo = controlData.RunningNo;
      const newControlNo = (parseInt(controlNo, 10) + 1).toString();

      const controlNosUpdate = {
        controldescription: "Transfer From Other Store",
        sitecode: userDetails.siteCode,
        controlnumber: newControlNo,
      };

      const response = await apiService.post(
        "ControlNos/updatecontrol",
        controlNosUpdate
      );

      if (!response) {
        throw new Error("Failed to update control number");
      }

      return response;
    } catch (error) {
      console.error("Error updating control number:", error);
      toast.error("Failed to update control number");
      throw error;
    }
  };

  const getStockHdrDetails = async (filter) => {
    try {
      const response = await apiService.get(
        `StkMovdocDtls${buildFilterQuery(filter ?? filter)}`
      );
      setCartItems(response);
      setCartData(response);
    } catch (err) {
      console.error("Error fetching stock header details:", err);
    }
  };

  const getStoreList = async () => {
    try {
      const res = await apiService.get("/ItemSitelists");
      const options = res
        .filter((store) => store.itemsiteCode)
        .map((store) => ({
          label: store.itemsiteDesc,
          value: store.itemsiteCode,
        }));
      setStoreOptions(options);
    } catch (err) {
      console.error("Error fetching stores:", err);
      toast.error("Failed to fetch store list");
    }
  };

  const postStockDetails = async (cart) => {
    try {
      const itemsToDelete = cartItems.filter(
        (cartItem) => !cart.some((item) => item.docId === cartItem.docId)
      );

      const itemsToUpdate = cart.filter((item) => item.docId);
      const itemsToCreate = cart.filter((item) => !item.docId);

      if (itemsToDelete > 0) {
        await Promise.all(
          itemsToDelete.map((item) =>
            apiService
              .delete(`StkMovdocDtls/${item.docId}`)
              .then(() => console.log(`Deleted item with docId: ${item.docId}`))
              .catch((error) => {
                console.error(`Failed to delete item ${item.docId}:`, error);
                throw error;
              })
          )
        );
      }

      if (itemsToUpdate.length > 0) {
        await Promise.all(
          itemsToUpdate.map((item) =>
            apiService
              .patch(`StkMovdocDtls/${item.docId}`, item)
              .then(() => console.log(`Updated item with docId: ${item.docId}`))
              .catch((error) => {
                console.error(`Failed to update item ${item.docId}:`, error);
                throw error;
              })
          )
        );
      }

      if (itemsToCreate.length > 0) {

        await Promise.all(
          
          itemsToCreate.map((item) =>
            apiService
              .post("StkMovdocDtls", item)
              .then(() => console.log("Created new item"))
              .catch((error) => {
                console.error("Failed to create item:", error);
                throw error;
              })
          )
        );
      }

      // toast.success("All items processed successfully");
      return true;
    } catch (error) {
      console.error("Error during stock details processing:", error);
      toast.error("Failed to process some items");
      throw error;
    }
  };

  const postStockHdr = async (data, type) => {
    console.log(data, "data stock h det post");
    if (type === "create") {
      try {
        const res = await apiService.post("StkMovdocHdrs", data);
        console.log(res, "post");
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        let docNo = data.docNo;
        const res = await apiService.post(
          `StkMovdocHdrs/update?[where][docNo]=${docNo}`,
          data
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCalc = (e, index, field) => {
    const value = e.target.value;
    setStockList((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "expiryDate" || field === "docBatchNo" ? value : Number(value),
              docAmt:
                field === "Qty" ? value * item.Price : item.Qty * item.Price,
            }
          : item
      )
    );
  };

  const showError = (message) => {
    toast.error(message, {
      duration: 3000,
      position: "top-right",
    });
  };

  const showSuccess = (message) => {
    toast.success(message, {
      duration: 3000,
      position: "top-right",
    });
  };

  const handleSupplierChange = (e, field) => {
    setSupplierInfo((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const validateForm = (
    hdrs = stockHdrs,
    cart = cartData,
    supplier = supplierInfo
  ) => {
    const errors = [];

    // Document Header Validations
    if (!hdrs.docNo) errors.push("Document number is required");
    if (!hdrs.docDate) errors.push("Document date is required");
    if (!hdrs.storeNo) errors.push("Store number is required");
    if (!hdrs.tstoreNo) errors.push("To store is required");
    if (!hdrs.fstoreNo) errors.push("From store is required");

    // Cart Validation
    if (cart.length === 0) errors.push("Cart shouldn't be empty");

    if (errors.length > 0) {
      toast.error(errors[0], { duration: 3000 });
      setValidationErrors(errors);
      setShowValidationDialog(true);
      return false;
    }

    return true;
  };

  const handleDateChange = (e, type) => {
    if (type === "postDate") {
      let postDate = moment(e.target.value).valueOf();
      let docDate = moment(stockHdrs.docDate).valueOf();
      if (docDate > postDate) {
        showError("Post date should be greater than doc date");
        return;
      }
    }
    setStockHdrs((prev) => ({
      ...prev,
      [type]: e.target.value,
    }));
  };

  const handleEditCart = useCallback((e, type) => {
    const value = e.target.value;
    setEditData((prev) => ({
      ...prev,
      [type]: value,
    }));
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (!editData.docQty || !editData.docPrice) {
      toast.error("Quantity and Price are required");
      return;
    }

    const updatedItem = {
      ...editData,
      docQty: Number(editData.docQty),
      docPrice: Number(editData.docPrice),
      docAmt: Number(editData.docQty) * Number(editData.docPrice),
    };

    setCartData((prev) =>
      prev.map((item, index) => (index === editingIndex ? updatedItem : item))
    );

    setShowEditDialog(false);
    setEditData(null);
    setEditingIndex(null);
    toast.success("Item updated successfully");
  }, [editData, editingIndex]);

  const editPopup = (item, index) => {
    setEditData({
      ...item,
      docQty: Number(item.docQty) || 0,
      docPrice: Number(item.docPrice) || 0,
      docExpdate: item.docExpdate || "",
      itemRemark: item.itemRemark || "",
      docBatchNo: item.docBatchNo || ""
    });
    setEditingIndex(index);
    setShowEditDialog(true);
  };

  const onDeleteCart = (item, index) => {
    setCartData((prev) => prev.filter((_, i) => i !== index));
    toast.success("Item removed from cart");
  };

  const addItemToCart = (newCartItem, index) => {
    setCartData((prev) => [...prev, newCartItem]);
    toast.success("Item added to cart");

    setStockList((prev) =>
      prev.map((stockItem, i) =>
        i === index ? { ...stockItem, Qty: 0 } : stockItem
      )
    );
  };

  const addToCart = (index, item) => {
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const amount = Number(item.Qty) * Number(item.Price);

    const newCartItem = {
      id: index + 1,
      docAmt: amount,
      docNo: stockHdrs.docNo,
      movCode: "GTI",
      movType: "GTI",
      docLineno: null,
      itemcode: item.stockCode,
      itemdesc: item.stockName,
      docQty: Number(item.Qty),
      docFocqty: 0,
      docTtlqty: Number(item.Qty),
      docPrice: Number(item.Price),
      docPdisc: 0,
      docDisc: 0,
      recQty1: 0,
      postedQty: 0,
      cancelQty: 0,
      createUser: userDetails?.username || "SYSTEM",
      docUom: item.uom,
      docExpdate: item.expiryDate || "",
      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: item.range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: "",
      docBatchNo: item.docBatchNo || null
    };

    console.log(item,cartData)

    const existingItemIndex = cartData.findIndex(
      (cartItem) =>
        cartItem.itemcode === item.stockCode && cartItem.docUom === item.uom
    );

    if (existingItemIndex !== -1) {
      setPendingCartItem({ newCartItem, index });
      setShowConfirmDialog(true);
      return;
    }

    addItemToCart(newCartItem, index);
  };

  const createTransactionObject = (item, docNo, storeNo) => {
    const today = new Date();
    const timeStr = ('0' + today.getHours()).substr(-2) + 
                   ('0' + today.getMinutes()).substr(-2) + 
                   ('0' + today.getSeconds()).substr(-2);

    return {
      id: null,
      trnPost: today.toISOString().split('T')[0],
      trnDate: stockHdrs.docDate,
      trnNo: null,
      postTime: timeStr,
      aperiod: null,
      itemcode: item.itemcode + "0000",
      storeNo: storeNo,
      tstoreNo: storeNo,
      fstoreNo: stockHdrs.fstoreNo,
      trnDocno: docNo,
      trnType: "TFR",
      trnDbQty: null,
      trnCrQty: null,
      trnQty: item.docQty,
      trnBalqty: item.docQty,
      trnBalcst: item.docAmt,
      trnAmt: item.docAmt,
      trnCost: item.docAmt,
      trnRef: null,
      hqUpdate: false,
      lineNo: item.docLineno,
      itemUom: item.docUom,
      itemBatch: item.docBatchNo || "",
      movType: "TFR",
      itemBatchCost: item.docPrice,
      stockIn: null,
      transPackageLineNo: null,
      docExpdate: item.docExpdate || null
    };
  };

  const generateEmailBody = (header, details) => {
    let body = "<html><body>";
    body += `<div><b><span>Transfer Num:</span></b> ${header.docNo}</div>`;
    body += `<div><b><span>Order from: </span></b> ${header.fromSite} <b><span style='margin-left:10px'>Created: </span></b> ${header.docDate}</div>`;
    body += `<div><b><span>Deliver to: </span></b> ${header.toSite} <b><span style='margin-left:10px'>Created by: </span></b> ${header.docAttn}</div>`;
    body += "<br/>STOCK ORDER<br/>";
    
    // Add table header
    body += "<table cellpadding='6' cellspacing='0' style='margin-top:10px;border: 1px solid #ccc;font-size: 9pt;font-family:Arial'>";
    body += "<tr>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>Product</th>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>SKU</th>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>Supplier Code</th>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Cost</th>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Qty</th>";
    body += "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Sub Total</th>";
    body += "</tr>";

    // Add rows
    let sumQty = 0;
    let sumAmount = 0;
    details.forEach(item => {
      body += "<tr>";
      body += `<td style='width:30%;border: 1px solid #ccc;text-align: left'>${item.itemdesc}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: left'>${item.itemcode}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: left'>${item.supplyDesc || ''}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: right'>${item.docPrice}</td>`;
      body += `<td style='width:10%;border: 1px solid #ccc;text-align: right'>${item.docQty}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: right'>${Number(item.docAmt).toFixed(2)}</td>`;
      body += "</tr>";
      sumQty += Number(item.docQty);
      sumAmount += Number(item.docAmt);
    });

    // Add total row
    body += "<tr>";
    body += "<td style='width:30%;border: 1px solid #ccc;text-align: left'></td>";
    body += "<td style='width:15%;border: 1px solid #ccc;text-align: left'></td>";
    body += "<td style='width:15%;border: 1px solid #ccc;text-align: left'></td>";
    body += "<td style='width:15%;border: 1px solid #ccc;text-align: right;font-weight:bold'>Total</td>";
    body += `<td style='width:10%;border: 1px solid #ccc;text-align: right;font-weight:bold'>${sumQty}</td>`;
    body += `<td style='width:15%;border: 1px solid #ccc;text-align: right;font-weight:bold'>${sumAmount.toFixed(2)}</td>`;
    body += "</tr>";

    body += "</table></body></html>";
    return body;
  };

  const processTransactions = async (transactions) => {
    try {
      // Log start of transaction
      await apiService.post("Inventorylogs", {
        trnDocNo: transactions[0].trnDocno,
        loginUser: userDetails.username,
        siteCode: transactions[0].storeNo,
        logMsg: "Post Started on " + new Date().toISOString(),
        createdDate: new Date().toISOString().split('T')[0]
      });

      // Process each transaction
      for (const transaction of transactions) {
        // Get current item quantities
        const response = await apiService.get(
          `Itemonqties?filter={"where":{"and":[{"itemcode":"${transaction.itemcode}"},{"uom":"${transaction.itemUom}"},{"sitecode":"${transaction.storeNo}"}]}}`
        );
        
        if (response && response.length > 0) {
          const currentQty = response[0];
          transaction.trnBalqty = (Number(transaction.trnBalqty) + Number(currentQty.trnBalqty)).toString();
          transaction.trnBalcst = (Number(transaction.trnBalcst) + Number(currentQty.trnBalcst)).toString();
          transaction.itemBatchCost = currentQty.batchCost.toString();
        }

        // Check if transaction already exists
        const existingTrn = await apiService.get(
          `Stktrns?filter={"where":{"and":[{"trnDocno":"${transaction.trnDocno}"},{"storeNo":"${transaction.storeNo}"}]}}`
        );

        if (!existingTrn || existingTrn.length === 0) {
          // Create new transaction
          await apiService1.post("Stktrns", transaction);

          // Log transaction creation
          await apiService.post("Inventorylogs", {
            trnDocNo: transaction.trnDocno,
            itemCode: transaction.itemcode,
            loginUser: userDetails.username,
            siteCode: transaction.storeNo,
            logMsg: `${transaction.itemcode} GTI on stktrn Table For ${transaction.storeNo}`,
            createdDate: new Date().toISOString().split('T')[0]
          });

          // Update item batch quantities
          await apiService.post("ItemBatches/updateqty", {
            itemcode: transaction.itemcode,
            sitecode: transaction.storeNo,
            uom: transaction.itemUom,
            qty: Number(transaction.trnQty),
            batchcost: Number(transaction.trnCost)
          });

          // Handle batch SNO if enabled
          if (window.APP_CONFIG.BATCH_SNO === "Yes") {
            await apiService1.get(
              `api/postGRNInToItemBatchSno?formName=GTI&docNo=${transaction.trnDocno}&fromsiteCode=${transaction.fstoreNo}&tositeCode=${userDetails.siteCode}&userCode=${userDetails.username}`
            );
          }
        }
      }

      // Send email notification if enabled
      if (window.APP_CONFIG.NOTIFICATION_MAIL_SEND === "Yes") {
        const printList = await apiService1.get(
          `Stkprintlists?filter={"where":{"docNo":"${transactions[0].trnDocno}"}}`
        );

        if (printList && printList.length > 0) {
          const emailBody = generateEmailBody(printList[0], printList);
          await apiService1.post("api/sendEmail", {
            to: window.config.NOTIFICATION_MAIL1,
            cc: window.config.NOTIFICATION_MAIL2,
            subject: "NOTIFICATION FOR STOCK TRANSFER",
            body: emailBody
          });
        }
      }

      return true;
    } catch (error) {
      console.error("Error processing transactions:", error);
      await apiService.post("Inventorylogs", {
        trnDocNo: transactions[0].trnDocno,
        loginUser: userDetails.username,
        siteCode: transactions[0].storeNo,
        logMsg: "Error processing transactions: " + error.message,
        createdDate: new Date().toISOString().split('T')[0]
      });
      throw error;
    }
  };

  const onSubmit = async (e, type) => {
    e?.preventDefault();
    console.log(stockHdrs)

    // Set loading state based on action type
    if (type === "save") {
      setSaveLoading(true);
    } else if (type === "post") {
      setPostLoading(true);
    }

    try {
      let docNo;
      let controlData;
      let hdr = stockHdrs;
      let details = cartData;

      // Get new docNo for both new creations and direct posts
      if ((type === "save" || type === "post") && !urlDocNo) {
        const result = await getDocNo();
        if (!result) return;
        docNo = result.docNo;
        controlData = result.controlData;

        // Update states with new docNo
        hdr = { ...stockHdrs, docNo }; // Create new hdr with docNo
        details = cartData.map((item, index) => ({
          ...item,
          docNo:result.docNo,
          id: urlDocNo ? item.id : index + 1, // Also update the id field to match
        }));
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlData);
        console.log(details,'details')

        // Move validation here after docNo is set
        if (!validateForm(hdr, details)) return;
      } else {
        // Use existing docNo for updates and posts
        docNo = urlDocNo || stockHdrs.docNo;

        // Validate for updates and posts
        if (!validateForm(stockHdrs, cartData)) return;
      }

      // Create data object using hdr instead of stockHdrs
      let data = {
        docNo: hdr.docNo,
        movCode: "GTI",
        movType: "GTI",
        storeNo: hdr.storeNo,
        fstoreNo: hdr.fstoreNo,
        tstoreNo: hdr.tstoreNo,
        supplyNo: hdr.supplyNo,
        docRef1: hdr.docRef1,
        docRef2: hdr.docRef2,
        docLines: urlDocNo ? hdr.docLines : cartData.length,
        docDate: hdr.docDate,
        recExpect: hdr.deliveryDate,
        postDate: type === "post" ? new Date().toISOString() : "",
        docStatus: hdr.docStatus, // Keep original status until final update
        docTerm: hdr.docTerm,
        docQty: calculateTotals(details).totalQty,
        docAmt: calculateTotals(details).totalAmt,
        docAttn: supplierInfo.Attn,
        docRemk1: hdr.docRemk1,
        staffNo: userDetails.usercode,
        bname: supplierInfo.Attn,
        baddr1: supplierInfo.line1,
        baddr2: supplierInfo.line2,
        baddr3: supplierInfo.line3,
        bpostcode: supplierInfo.pcode,
        daddr1: supplierInfo.sline1,
        daddr2: supplierInfo.sline2,
        daddr3: supplierInfo.sline3,
        dpostcode: supplierInfo.spcode,
        createUser: hdr.createUser,
        createDate: type === "post" && urlDocNo ? hdr.createDate : new Date().toISOString(),
      };

      // Handle header operations based on type and urlDocNo
      if (type === "save" && !urlDocNo) {
        await postStockHdr(data, "create");
        addNewControlNumber(controlData);
      } else if (type === "save" && urlDocNo) {
        console.log(data,'daaatt')
        await postStockHdr(data, "update");
      } else if (type === "post") {
        // For direct post without saving, create header first if needed
        if (!urlDocNo) {
          await postStockHdr(data, "create");
          addNewControlNumber(controlData);
        } else {
          await postStockHdr(data, "updateStatus");
        }
      }

      // Handle details operations
      await postStockDetails(details);

      // Rest of the posting logic remains the same
      if (type === "post") {
        // 5) Initial Inventory Log ("Post Started on ...")
        const inventoryLog = {
          trnDocNo: docNo,
          loginUser: userDetails.username,
          siteCode: userDetails.siteCode,
          logMsg: `Post Started on ${new Date().toISOString()}`,
          createdDate: new Date().toISOString().split("T")[0],
        };
        // await apiService.post("Inventorylogs", inventoryLog);

        let batchId
        const stktrns = details.map((item) =>
          createTransactionObject(item, docNo, userDetails.siteCode)
        );

        // 6) Loop through each line to fetch ItemOnQties and update trnBal* fields in Details
        for (let i = 0; i < stktrns.length; i++) {
          const d = stktrns[i];
          const filter = {
            where: {
              and: [
                { itemcode: d.itemcode }, // Add 0000 suffix for inventory
                { uom: d.itemUom },
                { sitecode: userDetails.siteCode },
              ],
            },
          };
          const resp = await apiService.get(
            `Itemonqties?filter=${encodeURIComponent(JSON.stringify(filter))}`
          );
          if (resp.length) {
            const on = resp[0];
            d.trnBalqty = (Number(d.trnBalqty) + on.trnBalqty).toString();
            d.trnBalcst = (Number(d.trnBalcst) + on.trnBalcst).toString();
            d.itemBatchCost = on.batchCost.toString();
          } else {
            // Log error if GET fails
            const errorLog = {
              trnDocNo: docNo,
              loginUser: userDetails.username,
              siteCode: userDetails.siteCode,
              logMsg: `Itemonqties Api Error for ${d.itemcode}`,
              createdDate: new Date().toISOString().split("T")[0],
            };
            // await apiService.post("Inventorylogs", errorLog);
          }
        }

        // 7) Check existing stktrns
        const chkFilter = {
          where: {
            and: [{ trnDocno: docNo }, { storeNo: userDetails.siteCode }],
          },
        };
        const stkResp = await apiService.get(
          `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
        );

        if (stkResp.length === 0) {
          // 8) Create and insert new Stktrns
          await apiService.post("Stktrns", stktrns);

          // 9) Per-item log
          for (const d of stktrns) {
            // Log stktrns insert
            const insertLog = {
              trnDocNo: docNo,
              itemCode: d.itemcode,
              loginUser: userDetails.username,
              siteCode: userDetails.siteCode,
              logMsg: `${d.itemcode} Inserted on stktrn Table`,
              createdDate: new Date().toISOString().split("T")[0],
            };
            // await apiService.post("Inventorylogs", insertLog);
          }

          // 10) Update ItemBatches quantity
          for (const d of stktrns) {
            const trimmedItemCode = d.itemcode.replace(/0000$/, '');

            const batchUpdate = {
              itemCode: trimmedItemCode,
              siteCode: userDetails.siteCode,
              uom: d.itemUom,
              qty: Number(d.trnQty),
              batchCost: Number(d.trnCost),
              batchNo: d.itemBatch,
              expDate: d.docExpdate
            };
            const batchFilter = {
              itemCode: trimmedItemCode,
              siteCode: userDetails.siteCode,
              uom: d.itemUom
            };
            
            await apiService
              .post(`ItemBatches/update?where=${encodeURIComponent(JSON.stringify(batchFilter))}`, batchUpdate)
              .catch(async (err) => {
                // Log qty update error
                const errorLog = {
                  trnDocNo: docNo,
                  itemCode: d.itemcode,
                  loginUser: userDetails.username,
                  siteCode: userDetails.siteCode,
                  logMsg: `ItemBatches/updateqty ${err.message}`,
                  createdDate: new Date().toISOString().split("T")[0],
                };
                // await apiService.post("Inventorylogs", errorLog);
              });
          }
        } else {
          // Existing stktrns → log
          const existsLog = {
            trnDocNo: docNo,
            loginUser: userDetails.username,
            siteCode: userDetails.siteCode,
            logMsg: "stktrn already exists",
            createdDate: new Date().toISOString().split("T")[0],
          };
          // await apiService.post("Inventorylogs", existsLog);
        }

        // 11) Final header status update to 7 - Only after all operations are complete
        await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${docNo}`, {
          docStatus: "7",
        });

        // 1. Auto-Post handling
        if (window?.APP_CONFIG?.AUTO_POST === "Yes") {
          const stktrns1 = details.map((item) =>
            createTransactionObject(item, docNo, formData.docToSite)
          );
          await processTransactions(stktrns1);
        }

        // 2. Batch SNO handling
        if (window?.APP_CONFIG?.BATCH_SNO === "Yes") {
          await apiService1.get(
            `api/SaveOutItemBatchSno?formName=GTI&docNo=${docNo}&siteCode=${userDetails.siteCode}&userCode=${userDetails.username}`
          );

          if (window?.APP_CONFIG?.AUTO_POST === "Yes") {
            for (const item of details) {
              await apiService1.get(
                `api/postToOutItemBatchSno?formName=GTI&docNo=${docNo}&itemCode=${item.itemcode}&Uom=${item.docUom}`
              );
            }
          }
        }

        // 3. Email Notification
        if (window.APP_CONFIG.NOTIFICATION_MAIL_SEND === "Yes") {
          const printList = await apiService.get(
            `Stkprintlists?filter={"where":{"docNo":"${docNo}"}}`
          );
          
          if (printList && printList.length > 0) {
            const emailData = {
              to: window.APP_CONFIG.NOTIFICATION_MAIL1,
              cc: window.APP_CONFIG.NOTIFICATION_MAIL2,
              subject: "NOTIFICATION FOR STOCK TRANSFER",
              body: generateEmailBody(printList[0], details)
            };
            
            await apiService.post("EmailService/send", emailData);
          }
        }
      }

      toast.success(
        type === "post"
          ? "Posted successfully"
          : urlDocNo
          ? "Updated successfully"
          : "Created successfully"
      );
      navigate("/goods-transfer-in?tab=all");
    } catch (err) {
      console.error("onSubmit error:", err);
      toast.error(
        type === "post"
          ? "Failed to post"
          : urlDocNo
          ? "Failed to update"
          : "Failed to create"
      );
    } finally {
      // Reset loading states
      setSaveLoading(false);
      setPostLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <>
      <Toaster richColors />
      {pageLoading ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          <span className="text-gray-600 ml-4 text-sm">Loading...</span>
        </div>
      ) : (
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              {urlStatus == 7
                ? "View Goods Transfer In"
                : urlStatus == 0
                ? "Update Goods Transfer In"
                : "Add Goods Transfer In"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/goods-transfer-in")}
              >
                Cancel
              </Button>
              <Button
                disabled={stockHdrs.docStatus === 7 || saveLoading}
                onClick={(e) => {
                  onSubmit(e, "save");
                }}
                className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
              >
                {saveLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={(e) => {
                  onSubmit(e, "post");
                }}
                className="cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                disabled={stockHdrs.docStatus === 7 || postLoading}
              >
                {postLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Doc No<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={stockHdrs.docNo}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      From Store<span className="text-red-500">*</span>
                    </Label>

                    <Select
                      value={stockHdrs.fstoreNo || ""} // Add fallback empty string
                      disabled={urlStatus == 7}
                      onValueChange={(value) =>
                        setStockHdrs((prev) => ({ ...prev, fstoreNo: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select From store">
                          {storeOptions.find(
                            (store) => store.value === stockHdrs.fstoreNo
                          )?.label || "Select From store"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions
                          .filter((store) => store.value !== stockHdrs.storeNo) // Filter out current store instead of selected store
                          .map((store) => (
                            <SelectItem key={store.value} value={store.value}>
                              {store.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                
                  </div>
                  <div className="space-y-2">
                    <Label>GR Ref 1</Label>
                    <Input
                      disabled={urlStatus == 7}
                      placeholder="Enter GR Ref 1"
                      value={stockHdrs.docRef1}
                      onChange={(e) =>
                        setStockHdrs((prev) => ({
                          ...prev,
                          docRef1: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Doc Date<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={stockHdrs.docDate}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      To Store<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={userDetails?.siteName}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GR Ref 2</Label>
                    <Input
                      placeholder="Enter GR Ref 2"
                      disabled={urlStatus == 7}
                      value={stockHdrs.docRef2}
                      onChange={(e) =>
                        setStockHdrs((prev) => ({
                          ...prev,
                          docRef2: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 w-full">
                    <Label>
                      Status<span className="text-red-500">*</span>
                    </Label>
                    <Select value={stockHdrs.docStatus} disabled>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Store code<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={userDetails?.siteName}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Created By<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={stockHdrs.createUser}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                <div className="space-y-2 w-[872px]">
                  <Label>Remarks</Label>
                  <Input
                    placeholder="Enter remarks"
                    disabled={urlStatus == 7}
                    value={stockHdrs.docRemk1}
                    onChange={(e) =>
                      setStockHdrs((prev) => ({
                        ...prev,
                        docRemk1: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="detail" className="w-full">
            <TabsList className="grid w-full grid-cols-1 lg:w-[200px]">
              <TabsTrigger value="detail">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="detail" className="space-y-4">
              {urlStatus != 7 && (
                <Card className={"p-0 gap-0"}>
                  <CardTitle className={"ml-4 pt-4 text-xl"}>
                    Select Items{" "}
                  </CardTitle>
                  <CardContent className="p-4 ">
                    <div className="flex items-center   gap-4 mb-6">
                      <div className="flex-1 max-w-[430px]">
                        <Input
                          placeholder="Search items..."
                          onChange={(e) => {
                            handleSearch(e);
                          }}
                        />
                      </div>

                      <div className="flex-1 mt-2">
                        <MultiSelect
                          options={brandOption}
                          selected={tempFilters.brand}
                          onChange={(selected) => {
                            setTempFilters((prev) => ({
                              ...prev,
                              brand: selected,
                            }));
                          }}
                          placeholder="Filter by brand..."
                        />
                      </div>

                      <div className="flex-1 mt-2">
                        <MultiSelect
                          options={rangeOptions}
                          selected={tempFilters.range}
                          onChange={(selected) => {
                            setTempFilters((prev) => ({
                              ...prev,
                              range: selected,
                            }));
                          }}
                          placeholder="Filter by range..."
                        />
                      </div>

                      <Button
                        variant="secondary"
                        onClick={handleApplyFilters}
                        className="whitespace-nowrap"
                      >
                        Apply Filters
                      </Button>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="retail"
                          className="w-5 h-5"
                          checked={itemFilter.whereArray.department.includes(
                            "RETAIL PRODUCT"
                          )}
                          onCheckedChange={(checked) => {
                            console.log(checked);
                            setItemFilter((prev) => ({
                              ...prev,
                              whereArray: {
                                ...prev.whereArray,
                                department: checked
                                  ? [
                                      ...prev.whereArray.department,
                                      "RETAIL PRODUCT",
                                    ]
                                  : prev.whereArray.department.filter(
                                      (d) => d !== "RETAIL PRODUCT"
                                    ),
                              },
                              skip: 0,
                            }));
                          }}
                        />
                        <label htmlFor="retail" className="text-sm">
                          Retail Product
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="salon"
                          className="w-5 h-5"
                          checked={itemFilter.whereArray.department.includes(
                            "SALON PRODUCT"
                          )}
                          onCheckedChange={(checked) => {
                            setItemFilter((prev) => ({
                              ...prev,
                              whereArray: {
                                ...prev.whereArray,
                                department: checked
                                  ? [
                                      ...prev.whereArray.department,
                                      "SALON PRODUCT",
                                    ]
                                  : prev.whereArray.department.filter(
                                      (d) => d !== "SALON PRODUCT"
                                    ),
                              },
                              skip: 0,
                            }));
                          }}
                        />
                        <label htmlFor="salon" className="text-sm">
                          Salon Product
                        </label>
                      </div>
                    </div>

                      <ItemTable
                        data={stockList}
                        loading={loading}
                        onQtyChange={(e, index) => handleCalc(e, index, "Qty")}
                        onPriceChange={(e, index) => handleCalc(e, index, "Price")}
                        onExpiryDateChange={(e, index) => handleCalc(e, index, "expiryDate")}
                        onAddToCart={(index, item) => addToCart(index, item)}
                        currentPage={pagination.page}
                        itemsPerPage={pagination.limit}
                        totalPages={Math.ceil(stockList.length / pagination.limit)}
                        onPageChange={handlePageChange}
                      />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {cartData.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50/50 shadow-sm hover:shadow-md transition-shadow duration-200 mb-15">
              <CardTitle className="text-xl px-2 py-3">
                Selected Items
              </CardTitle>
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700">
                      NO
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Item Code
                    </TableHead>
                    <TableHead>Item Description</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Amount
                    </TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Batch No</TableHead>
                    <TableHead>Remarks</TableHead>
                    {urlStatus != 7 && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSpinner colSpan={9} />
                  ) : cartData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <FileText size={40} />
                          <p>No items added</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {cartData.map((item, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-slate-100/50 transition-colors duration-150 border-b border-slate-200"
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>{item.itemcode}</TableCell>
                          <TableCell>{item.itemdesc}</TableCell>
                          <TableCell>{item.docUom}</TableCell>
                          <TableCell className="font-medium">
                            {item.docQty}
                          </TableCell>
                          <TableCell>{item.docPrice}</TableCell>
                          <TableCell className="font-semibold text-slate-700">
                            {item.docAmt}
                          </TableCell>
                          <TableCell>{format_Date(item.docExpdate)}</TableCell>
                          <TableCell>{item?.docBatchNo ?? '-'}</TableCell>
                          <TableCell>{item.itemRemark ?? '-'}</TableCell>
                          {urlStatus != 7 && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => editPopup(item, index)}
                                  className="cursor-pointer hover:bg-slate-200 hover:text-blue-600 transition-colors duration-150"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDeleteCart(item, index)}
                                  className="cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-medium">
                        <TableCell
                          colSpan={4}
                          className="text-right text-slate-700"
                        >
                          Totals:
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {calculateTotals(cartData).totalQty}
                        </TableCell>
                        <TableCell />
                        <TableCell className="font-semibold text-slate-700">
                          {calculateTotals(cartData).totalAmt.toFixed(2)}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
      <EditDialog
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        editData={editData}
        onEditCart={handleEditCart}
        onSubmit={handleEditSubmit}
      />
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Item</AlertDialogTitle>
            <AlertDialogDescription>
              This item already exists in the cart. Would you like to add it
              again?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCartItem) {
                  addItemToCart(
                    pendingCartItem.newCartItem,
                    pendingCartItem.index
                  );
                  setPendingCartItem(null);
                }
                setShowConfirmDialog(false);
              }}
            >
              Add Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validation Errors</AlertDialogTitle>
            <AlertDialogDescription>
              <ul className="list-disc pl-5">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AddGti;
