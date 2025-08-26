import React, { useState, useEffect, memo, useCallback } from "react";
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
import apiService1 from "@/services/apiService1";
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
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import ItemTable from "@/components/itemTable";

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
  ({
    showEditDialog,
    setShowEditDialog,
    editData,
    onEditCart,
    onSubmit,
    isBatchEdit,
    urlStatus,
    userDetails,
  }) => {
    const [validationErrors, setValidationErrors] = useState([]);
    const [newBatchNo, setNewBatchNo] = useState("");
    console.log(editData,"editData")

    // Reset states when dialog closes
    useEffect(() => {
      if (!showEditDialog) {
        // setSelectedBatch(null);
        // setNewBatchNo("");
        // setUseExistingBatch(true);
        // setIsExpiryReadOnly(false);
        // setBatchOptions([]);
        setValidationErrors([]);
      }
    }, [showEditDialog]);

    const handleSubmit = () => {
      const errors = [];

      // Only validate quantity and price if not batch editing
      if (!isBatchEdit) {
        if (!editData?.docQty || editData.docQty <= 0) {
          errors.push("Quantity must be greater than 0");
        }
        if (!editData?.docPrice || editData.docPrice <= 0) {
          errors.push("Price must be greater than 0");
        }
      }

      // Validate batch number
      // if (useExistingBatch && !selectedBatch?.value) {
      //   errors.push("Please select an existing batch");
      // } else if (!useExistingBatch && !newBatchNo.trim()) {
      //   errors.push("Please enter a new batch number");
      // }
      // Validate expiry date only if batch functionality is enabled
      if (window?.APP_CONFIG?.BATCH_NO === "Yes" && !editData?.docExpdate) {
        errors.push("Expiry date is required");
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      // const updatedEditData = {
      //   ...editData,
      //   docBatchNo:newBatchNo
      // };

      // onSubmit(updatedEditData);
      onSubmit(editData);
    };

    return (
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent
          className="sm:max-w-[425px]"
          aria-describedby="edit-item-description"
        >
          <DialogHeader>
            <DialogTitle>
              {isBatchEdit ? "Edit Selected Item Details" : "Edit Item Details"}
            </DialogTitle>
            <div
              id="edit-item-description"
              className="text-sm text-muted-foreground"
            >
              {urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True" 
                ? "Only price can be modified for posted documents" 
                : "Modify item details"}
            </div>
          </DialogHeader>
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <ul className="list-disc pl-5 text-sm text-red-600">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {/* Show Quantity and Price only for individual edit (not batch edit) */}
          {!isBatchEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={editData?.docQty || ""}
                  onChange={(e) => onEditCart(e, "docQty")}
                  className="w-full"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={editData?.docPrice || ""}
                  isBatchEdit
                  onChange={(e) => onEditCart(e, "docPrice")}
                  className="w-full"
                />
              </div>
            </>
          )}
          {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={editData?.docExpdate || ""}
                  onChange={(e) => onEditCart(e, "docExpdate")}
                  className="w-full"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True"}
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
                  maxLength={20}
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True"}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={editData?.itemRemark || ""}
              onChange={(e) => onEditCart(e, "itemRemark")}
              placeholder="Enter remarks"
              className="w-full"
              disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);


function AddGto({ docData }) {
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
    movCode: "TFRT",
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
    fstoreNo: userDetails?.siteCode,
    tstoreNo: "",
    docRemk1: "",
    createUser: userDetails?.username,
    movCode: "TFRT",
    movType: "TFR",
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

  const [storeOptions, setStoreOptions] = useState([]);

  const [originalStockList, setOriginalStockList] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);

  // Add sorting state for ItemTable
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
  });

  const [filters, setFilters] = useState({
    brand: [],
    range: [],
    department: ["RETAIL PRODUCT", "SALON PRODUCT"],
  });

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleApplyFilters = () => {
    setLoading(true);

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    // If no filters are active, restore original data
    if (
      !filters.brand.length &&
      !filters.range.length &&
      filters.department.length === 2
    ) {
      setStockList(originalStockList);
      setItemTotal(originalStockList.length);
      setLoading(false);
      return;
    }

    const filteredList = originalStockList.filter((item) => {
      // Brand filter
      if (filters.brand.length > 0) {
        const brandMatch = filters.brand.some(
          (brand) =>
            brand.value === item.BrandCode || brand.label === item.Brand
        );
        if (!brandMatch) return false;
      }

      // Range filter
      if (filters.range.length > 0) {
        const rangeMatch = filters.range.some(
          (range) =>
            range.value === item.RangeCode || range.label === item.Range
        );
        if (!rangeMatch) return false;
      }

      // Department filter
      if (filters.department.length > 0) {
        const departmentMatch = filters.department.includes(item.Department);
        if (!departmentMatch) return false;
      }

      return true;
    });

    setStockList(filteredList);
    setItemTotal(filteredList.length);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    setLoading(false);
  };

  useEffect(() => {
    const initializeData = async () => {
      setPageLoading(true);
      setLoading(true);

      try {
        if (urlDocNo) {
          const filter = {
            where: {
              movCode: "TFRT",
              docNo: urlDocNo,
            },
          };

          await getStockHdr(filter);

          if (urlStatus != 7) {
            await Promise.all([getOptions(), getStockDetails()]);
          }

          await getStockHdrDetails(filter);
          await getStoreList();
        } else {
          await Promise.all([getStoreList(), getStockDetails(), getOptions()]);
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
        fstoreNo: data?.fstoreNo || userDetails?.siteCode,
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

  // Add sorting function for ItemTable
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedList = [...stockList].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setStockList(sortedList);
  };

  // const getSupplyList = async (supplycode) => {
  //   try {
  //     const res = await apiService.get(
  //       `ItemSupplies${queryParamsGenerate(filter)}`
  //     );

  //     const supplyOption = res
  //       .filter((item) => item.splyCode)
  //       .map((item) => ({
  //         label: item.supplydesc,
  //         value: item.splyCode,
  //       }));

  //     setSupplyOptions(supplyOption);

  //     if (!urlDocNo) {
  //       setStockHdrs((prev) => ({
  //         ...prev,
  //         supplyNo: supplycode ? supplycode : supplyOption[0]?.value || null,
  //       }));
  //     }
  //   } catch (err) {
  //     console.error("Error fetching supply list:", err);
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Failed to fetch supply list",
  //     });
  //   }
  // };

  const getDocNo = async () => {
    try {
      const codeDesc = "Transfer To Other Store";
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
        docNo,
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
        controldescription: "Transfer To Other Store",
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
              [field]: field === "expiryDate" ? value : Number(value),
              docAmt:
                field === "Qty" ? value * item.Price : item.Qty * item.Price,
            }
          : item
      )
    );
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
    }, 500); // Reduced to 500ms for better responsiveness

    setSearchTimer(timer);
  };

  // Add cleanup on component unmount
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  // Update the filter handlers
  const handleBrandChange = (selected) => {
    setTempFilters((prev) => ({
      ...prev,
      brand: selected,
    }));
  };

  const handleRangeChange = (selected) => {
    setTempFilters((prev) => ({
      ...prev,
      range: selected,
    }));
  };

  const handleDepartmentChange = (department) => {
    setLoading(true);

    // Update filters state
    const newFilters = {
      ...tempFilters,
      department: tempFilters.department.includes(department)
        ? tempFilters.department.filter((d) => d !== department)
        : [...tempFilters.department, department],
    };
    setTempFilters(newFilters);

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    // If no filters are active, restore original data
    if (
      !newFilters.brand.length &&
      !newFilters.range.length &&
      newFilters.department.length === 2
    ) {
      setStockList(originalStockList);
      setItemTotal(originalStockList.length);
      setLoading(false);
      return;
    }

    // Apply filters immediately
    const filteredList = originalStockList.filter((item) => {
      // Brand filter
      if (newFilters.brand.length > 0) {
        const brandMatch = newFilters.brand.some(
          (brand) =>
            brand.value === item.BrandCode || brand.label === item.Brand
        );
        if (!brandMatch) return false;
      }

      // Range filter
      if (newFilters.range.length > 0) {
        const rangeMatch = newFilters.range.some(
          (range) =>
            range.value === item.RangeCode || range.label === item.Range
        );
        if (!rangeMatch) return false;
      }

      // Department filter
      if (newFilters.department.length > 0) {
        const departmentMatch = newFilters.department.includes(item.Department);
        if (!departmentMatch) return false;
      }

      return true;
    });

    setStockList(filteredList);
    setItemTotal(filteredList.length);
    itemFilter.skip = 0; // Reset to first page
    setLoading(false);
  };

  // Add this effect to help with debugging
  useEffect(() => {
    if (originalStockList.length > 0) {
      console.log("Sample Item Structure:", originalStockList[0]);
    }
  }, [originalStockList]);

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

  const validateForm = (hdrs = stockHdrs, cart = cartData, options = {}) => {
    const errors = [];
    console.log("dd");

    // Document Header Validations
    if (!options.skipDocNoCheck && !hdrs.docNo)
      errors.push("Document number is required");
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
    setIsBatchEdit(false);
    console.log(item,"item")

    // Handle expiry date - format properly for HTML date input
    let expiryDate = "";
    if (item.docExpdate) {
      // Handle ISO date format (e.g., "2025-10-22T00:00:00.000Z")
      if (item.docExpdate.includes('T') || item.docExpdate.includes('Z')) {
        // Convert ISO date to YYYY-MM-DD format for HTML date input
        const date = new Date(item.docExpdate);
        if (!isNaN(date.getTime())) {
          expiryDate = date.toISOString().split('T')[0];
        }
      } 
      // Handle DD/MM/YYYY format
      else if (item.docExpdate.includes('/')) {
        const parts = item.docExpdate.split(' ')[0].split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          expiryDate = `${year}-${month}-${day}`;
        }
      }
      // If it's already in YYYY-MM-DD format, use as is
      else if (item.docExpdate.includes('-')) {
        expiryDate = item.docExpdate;
      }
    }

    setEditData({
      ...item,
      docQty: Number(item.docQty) || 0,
      docPrice: Number(item.docPrice) || 0,
      docExpdate: expiryDate,
      itemRemark: item.itemRemark || "",
      docBatchNo: item.docBatchNo || "",
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
  // Parse various date formats to "YYYY-MM-DD"
  const parseBatchExpiry = (dateStr) => {
    if (!dateStr) return "";
    
    // Handle ISO date format (e.g., "2025-10-22T00:00:00.000Z")
    if (dateStr.includes('T') || dateStr.includes('Z')) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Handle "30/09/2025 12:00:00 AM" format
    if (dateStr.includes('/')) {
      const [day, month, yearAndTime] = dateStr.split("/");
      const [year] = yearAndTime.split(" ");
      // Return in YYYY-MM-DD format
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // If it's already in YYYY-MM-DD format, return as is
    if (dateStr.includes('-')) {
      return dateStr;
    }
    
    return "";
  };

  const addToCart = (index, item) => {
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Check if quantity exceeds on-hand quantity
    if (Number(item.Qty) > Number(item.quantity)) {
      toast.error("Not enough stock available");
      return;
    }
    console.log(item, "item in add to cart");

    const amount = Number(item.Qty) * Number(item.Price);

    const newCartItem = {
      id: index + 1,
      docAmt: amount,
      docNo: stockHdrs.docNo,
      movCode: "TFRT",
      movType: "TFR",
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
      // docExpdate: item.expiryDate || "",
      docExpdate: parseBatchExpiry(item.batchexpirydate),

      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: item.range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: "",
      // docBatchNo: item.docBatchNo || null
      docBatchNo: item.batchno || null,
      docMdisc: 0,
      recTtl: 0,
      itemprice: Number(item.batchcost) || Number(item.Price) || 0,
    };

    const existingItemIndex = cartData.findIndex(
      (cartItem) =>
        cartItem.itemcode === item.stockCode && cartItem.docUom === item.itemUom
    );

    if (existingItemIndex !== -1) {
      setPendingCartItem({ newCartItem, index });
      setShowConfirmDialog(true);
      return;
    }

    addItemToCart(newCartItem, index);
  };

  const createTransactionObject = (
    item,
    docNo,
    storeNo,
    fstoreNo,
    tstoreNo,
    multiplier = 1
  ) => {
    const today = new Date();
    const timeStr =
      ("0" + today.getHours()).slice(-2) +
      ("0" + today.getMinutes()).slice(-2) +
      ("0" + today.getSeconds()).slice(-2);

    const qty = Number(item.docQty) * multiplier;
    const amt = Number(item.docAmt) * multiplier;
    const cost = Number(item.docAmt) * multiplier;

    return {
      id: null,
      trnPost: today.toISOString().split("T")[0],
      trnDate: item.docExpdate || null,
      trnNo: null,
      postTime: timeStr,
      aperiod: null,
      itemcode: item.itemcode + "0000",
      storeNo: storeNo,
      tstoreNo: tstoreNo,
      fstoreNo: fstoreNo,
      trnDocno: docNo,
      trnType: "TFR",
      trnDbQty: null,
      trnCrQty: null,
      trnQty: qty,
      trnBalqty: qty,
      trnBalcst: amt,
      trnAmt: amt,
      trnCost: cost,
      trnRef: null,
      hqUpdate: false,
      lineNo: item.docLineno,
      itemUom: item.docUom,
      itemBatch: item.docBatchNo || "",
      movType: "TFR",
      itemBatchCost: item.batchCost,
      stockIn: null,
      transPackageLineNo: null,
      docExpdate: item.docExpdate || null,
    };
  };

  const onSubmit = async (e, type) => {
    e?.preventDefault();

    // Debug: Log the values to understand what's happening
    console.log("🔍 onSubmit debug:", {
      docStatus: stockHdrs.docStatus,
      docStatusType: typeof stockHdrs.docStatus,
      isSettingPostedChangePrice: userDetails?.isSettingPostedChangePrice,
      isSettingPostedChangePriceType: typeof userDetails?.isSettingPostedChangePrice,
      userDetails: userDetails,
      type: type,
      urlStatus: urlStatus,
      urlStatusType: typeof urlStatus
    });

    // NEW: Handle posted document editing - Check at the very beginning
    // Use both urlStatus and stockHdrs.docStatus for better detection
    const isPostedDocument = (stockHdrs.docStatus === "7" || stockHdrs.docStatus === 7) || urlStatus === "7";
    
    if (isPostedDocument && userDetails?.isSettingPostedChangePrice === "True") {
      console.log("✅ Taking EDIT POSTED DOCUMENT path");
      
      // Set loading state
      if (type === "save") {
        setSaveLoading(true);
      } else if (type === "post") {
        setPostLoading(true);
      }

      try {
        // Validate
        if (!validateForm(stockHdrs, cartData, { skipDocNoCheck: true })) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }

        const docNo = urlDocNo || stockHdrs.docNo;
        const details = cartData;
        
        // Create header data - for posted docs, only allow editing ref, remarks, and store references
        const headerData = {
          docNo: stockHdrs.docNo,
          movCode: stockHdrs.movCode, // Keep original
          movType: stockHdrs.movType, // Keep original
          storeNo: stockHdrs.storeNo, // Keep original
          fstoreNo: stockHdrs.fstoreNo, // ALLOW EDITING - From store can be changed
          tstoreNo: stockHdrs.tstoreNo, // ALLOW EDITING - To store can be changed
          docRef1: stockHdrs.docRef1, // ALLOW EDITING
          docRef2: stockHdrs.docRef2, // ALLOW EDITING
          docLines: stockHdrs.docLines, // Keep original
          docDate: stockHdrs.docDate, // Keep original
          postDate: stockHdrs.postDate, // Keep original post date
          docStatus: "7", // Keep as posted
          docQty: stockHdrs.docQty, // Keep original - don't recalculate for posted docs
          docAmt: stockHdrs.docAmt, // Keep original - don't recalculate for posted docs
          docAttn: supplierInfo.Attn, // ALLOW EDITING - Attention can be changed
          docRemk1: stockHdrs.docRemk1, // ALLOW EDITING
          staffNo: stockHdrs.staffNo, // Keep original
          bname: supplierInfo.Attn, // ALLOW EDITING - Name can be changed
          baddr1: supplierInfo.line1, // ALLOW EDITING - Address can be changed
          baddr2: supplierInfo.line2, // ALLOW EDITING - Address can be changed
          baddr3: supplierInfo.line3, // ALLOW EDITING - Address can be changed
          bpostcode: supplierInfo.pcode, // ALLOW EDITING - Postcode can be changed
          daddr1: supplierInfo.sline1, // ALLOW EDITING - Ship to address can be changed
          daddr2: supplierInfo.sline2, // ALLOW EDITING - Ship to address can be changed
          daddr3: supplierInfo.sline3, // ALLOW EDITING - Ship to address can be changed
          dpostcode: supplierInfo.spcode, // ALLOW EDITING - Ship to postcode can be changed
          createUser: stockHdrs.createUser, // Keep original
          createDate: stockHdrs.createDate // Keep original
        };

        console.log('x1')
        // Update header
        await editPostedStockHdrs(headerData);
        
        // Update details
        await editPostedStockDetails(details);
        
        // Update Stktrns
        await editPostedStktrns(details, docNo);
        
        // Only update ItemBatches if quantities have changed
        const hasQuantityChanges = details.some(item => {
          // Check if this item has a docId (existing item) and if quantities differ
          if (item.docId) {
            const originalItem = cartData.find(original => original.docId === item.docId);
            return originalItem && Number(originalItem.docQty) !== Number(item.docQty);
          }
          return false; // New items don't need batch updates
        });
        
        if (hasQuantityChanges) {
          console.log("🔄 Quantities changed, updating ItemBatches...");
          await editPostedItemBatches(details);
        } else {
          console.log("✅ No quantity changes detected, skipping ItemBatches update");
        }

        toast.success("Posted document updated successfully");
        navigate("/goods-transfer-out?tab=all");
        return; // Exit early, don't continue with normal flow

      } catch (error) {
        console.error("Error updating posted document:", error);
        toast.error("Failed to update posted document");
        return;
      } finally {
        setSaveLoading(false);
        setPostLoading(false);
      }
    }

    // EXISTING CODE CONTINUES UNCHANGED FROM HERE...
    console.log("🔄 Taking REGULAR DOCUMENT path");
    
    if (!validateForm(stockHdrs, cartData, { skipDocNoCheck: true })) return;

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

        // Increment control number immediately after getting docNo
        await addNewControlNumber(controlData);

        // Update states with new docNo
        hdr = { ...stockHdrs, docNo }; // Create new hdr with docNo
        details = cartData.map((item, index) => ({
          ...item,
          docNo,
          id: urlDocNo ? item.id : index + 1, // Also update the id field to match
        }));
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlData);
        console.log("dd1");

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
        movCode: "TFRT",
        movType: "TFR",
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
        staffNo: userDetails.usercode,

        createDate:
          type === "post" && urlDocNo
            ? hdr.createDate
            : new Date().toISOString(),
      };

      // Handle header operations based on type and urlDocNo
      if (type === "save" && !urlDocNo) {
        await postStockHdr(data, "create");
        // addNewControlNumber(controlData);
      } else if (type === "save" && urlDocNo) {
        await postStockHdr(data, "update");
      } else if (type === "post") {
        // For direct post without saving, create header first if needed
        if (!urlDocNo) {
          await postStockHdr(data, "create");
          // addNewControlNumber(controlData);
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

        let batchId;
        const stktrns = details.map((item) =>
          createTransactionObject(
            item,
            docNo,
            stockHdrs.fstoreNo, // storeNo (destination)
            stockHdrs.fstoreNo, // fstoreNo (source)
            stockHdrs.tstoreNo, // tstoreNo (again destination)
            -1 // positive qty
          )
        );

        const stktrns1 = details.map((item) =>
          createTransactionObject(
            item,
            docNo,
            stockHdrs.tstoreNo, // storeNo (source)
            stockHdrs.fstoreNo, // fstoreNo (source)
            stockHdrs.tstoreNo, // tstoreNo (destination)
            1 // negative qty
          )
        );
        console.log(stktrns, "stktrns");
        console.log(stktrns1, "stktrns1");

        // 2. Batch SNO handling
        if (window?.APP_CONFIG?.BATCH_SNO === "Yes") {
          await apiService1.get(
            `api/SaveOutItemBatchSno?formName=GRNOut&docNo=${docNo}&siteCode=${stktrns[0].fstoreNo}&userCode=${userDetails.username}`
          );
        }

        // 6) Loop through each line to fetch ItemOnQties and update trnBal* fields in Details
        for (let i = 0; i < stktrns.length; i++) {
          const d = stktrns[i];
          const filter = {
            where: {
              and: [
                { itemcode: d.itemcode }, // Add 0000 suffix for inventory
                { uom: d.itemUom },
                { sitecode: d.storeNo },
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
            and: [{ trnDocno: docNo }, { storeNo: stktrns[0].storeNo }],
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
            const trimmedItemCode = d.itemcode.replace(/0000$/, "");

            // const batchUpdate = {
            //   itemCode: trimmedItemCode,
            //   sitecode:  d.storeNo,
            //   uom: d.itemUom,
            //   qty: Number(d.trnQty),
            //   batchCost: Number(d.trnCost),
            //   batchNo: d.itemBatch,
            //   expDate: d.docExpdate
            // };

            if (window?.APP_CONFIG?.BATCH_NO === "Yes") {
              const batchUpdate = {
                itemcode: trimmedItemCode,
                sitecode: d.storeNo,
                uom: d.itemUom,
                qty: Number(d.trnQty),
                batchcost: Number(d.trnCost),
                batchno: d.itemBatch,
                // expDate: d.docExpdate
              };
              const batchFilter = {
                itemCode: trimmedItemCode,
                siteCode: userDetails.siteCode,
                uom: d.itemUom,
              };

              await apiService
                .post(`ItemBatches/updateqty`, batchUpdate)
                .then((res) => {})
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

              // await apiService
              //   .post(`ItemBatches/update?where=${encodeURIComponent(JSON.stringify(batchFilter))}`, batchUpdate)
              //   .catch(async (err) => {
              //     // Log qty update error
              //     const errorLog = {
              //       trnDocNo: docNo,
              //       itemCode: d.itemcode,
              //       loginUser: userDetails.username,
              //       siteCode: userDetails.siteCode,
              //       logMsg: `ItemBatches/updateqty ${err.message}`,
              //       createdDate: new Date().toISOString().split("T")[0],
              //     };
              //     // await apiService.post("Inventorylogs", errorLog);
              //   });
            } else {
              const batchUpdate = {
                itemcode: trimmedItemCode,
                sitecode: d.storeNo,
                uom: d.itemUom,
                qty: Number(d.trnQty),
                batchcost: Number(d.trnCost),
              };

              await apiService
                .post(`ItemBatches/updateqty`, batchUpdate)
                .then((res) => {})
                .catch(async (err) => {
                  const errorLog = {
                    trnDocNo: docNo,
                    itemCode: d.itemcode,
                    loginUser: userDetails.username,
                    siteCode: userDetails.siteCode,
                    logMsg: `ItemBatches/updateqty ${err.message}`,
                    createdDate: new Date().toISOString().split("T")[0],
                  };
                });
              }
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
    

        if (window?.APP_CONFIG?.BATCH_SNO === "Yes") {
          await apiService1.get(
            `api/postOutItemBatchSno?formName=GRNOut&docNo=${docNo}&siteCode=${userDetails.siteCode}&userCode=${userDetails.username}`
          );
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
              body: generateEmailBody(printList[0], details),
            };

            await apiService.post("EmailService/send", emailData);
          }
        }

        // 11) Final header status update to 7 - Only after all operations are complete
        await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${docNo}`, {
          docStatus: "7",
        });

        if (window?.APP_CONFIG?.AUTO_POST === "Yes") {
          for (let i = 0; i < stktrns1.length; i++) {
            const d = stktrns1[i];
            const filter = {
              where: {
                and: [
                  { itemcode: d.itemcode }, // Add 0000 suffix for inventory
                  { uom: d.itemUom },
                  { sitecode: d.storeNo },
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
          const chkFilter1 = {
            where: {
              and: [{ trnDocno: docNo }, { storeNo: stktrns1[0].storeNo }],
            },
          };
          const stkResp1 = await apiService.get(
            `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter1))}`
          );

          if (stkResp1.length === 0) {
            // 8) Create and insert new Stktrns
            await apiService.post("Stktrns", stktrns1);

            // 9) Per-item log
            for (const d of stktrns1) {
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
            for (const d of stktrns1) {
              const trimmedItemCode = d.itemcode.replace(/0000$/, "");

              if (window?.APP_CONFIG?.BATCH_NO !== "Yes") {
                const batchUpdate = {
                  itemcode: trimmedItemCode,
                  sitecode: d.storeNo,
                  uom: d.itemUom,
                  qty: Number(d.trnQty),
                  batchcost: Number(d.trnCost),
                  // batchno: d.itemBatch,
                  // expDate: d.docExpdate
                };
                const batchFilter = {
                  itemCode: trimmedItemCode,
                  siteCode: d.storeNo,
                  uom: d.itemUom,
                };

                await apiService
                  .post(`ItemBatches/updateqty`, batchUpdate)
                  .then((res) => {})
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
              else {
                let existingBatch;

                const filter = {
                  where: {
                    and: [
                      { itemCode: d.trimmedItemCode },
                      { uom: d.itemUom },
                      { siteCode: d.storeNo },
                      { batchNo: d.itemBatch },
                    ],
                  },
                };

                const url = `ItemBatches?filter=${encodeURIComponent(
                  JSON.stringify(filter)
                )}`;
                existingBatch = await apiService
                  .get(url)
                  .then((resp) => resp[0])
                  .catch((error) => {
                    console.error("Error fetching batch:", error);
                    return null;
                  });

                if (!existingBatch) {
                  // For new batches, create a new batch record
                 const  batchCreate = {
                    itemCode: trimmedItemCode,
                    siteCode: d.storeNo,
                    uom: d.itemUom,
                    qty: Number(d.trnQty),
                    batchCost: Number(d.trnCost),
                    batchNo: d.itemBatch,
                    expDate: d?.docExpdate ? d?.docExpdate : null,
                  };

                  await apiService
                    .post(`ItemBatches`, batchCreate)
                    .catch(async (err) => {
                      const errorLog = {
                        trnDocNo: docNo,
                        itemCode: d.itemcode,
                        loginUser: userDetails.username,
                        siteCode: userDetails.siteCode,
                        logMsg: `ItemBatches/create error: ${err.message}`,
                        createdDate: new Date().toISOString().split("T")[0],
                      };
                    });
                } else {
                  // const batchUpdate = {
                  //   itemCode: trimmedItemCode,
                  //   siteCode:d.storeNo,
                  //   uom: d.itemUom,
                  //   qty: Number(d.trnQty),
                  //   batchCost: Number(d.trnCost),
                  //   batchNo: d.itemBatch,
                  //   expDate: d.docExpdate
                  // };
                  const batchUpdate = {
                    itemcode: trimmedItemCode,
                    sitecode: d.storeNo,
                    uom: d.itemUom,
                    qty: Number(d.trnQty),
                    batchcost: Number(d.trnCost),
                    batchno: d.itemBatch,
                    // expDate: d.docExpdate
                  };
                  const batchFilter = {
                    itemCode: trimmedItemCode,
                    siteCode: d.storeNo,
                    uom: d.itemUom,
                  };

                  await apiService
                    .post(`ItemBatches/updateqty`, batchUpdate)
                    .then((res) => {})
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

                // await apiService
                //   .post(`ItemBatches/update?where=${encodeURIComponent(JSON.stringify(batchFilter))}`, batchUpdate)
                //   // .post(`ItemBatches/updateqty`, batchUpdate)

                //   .catch(async (err) => {
                //     // Log qty update error
                //     const errorLog = {
                //       trnDocNo: docNo,
                //       itemCode: d.itemcode,
                //       loginUser: userDetails.username,
                //       siteCode: d.storeNo,
                //       logMsg: `ItemBatches/updateqty ${err.message}`,
                //       createdDate: new Date().toISOString().split("T")[0],
                //     };
                //     // await apiService.post("Inventorylogs", errorLog);
                //   });
              } 
              // else {
              //   const batchUpdate = {
              //     itemcode: trimmedItemCode,
              //     sitecode: d.storeNo,
              //     uom: d.itemUom,
              //     qty: Number(d.trnQty),
              //     batchcost: Number(d.trnCost),
              //   };

              //   await apiService
              //     .post(`ItemBatches/updateqty`, batchUpdate)
              //     .then((res) => {})
              //     .catch(async (err) => {
              //       const errorLog = {
              //         trnDocNo: docNo,
              //         itemCode: d.itemcode,
              //         loginUser: userDetails.username,
              //         siteCode: userDetails.siteCode,
              //         logMsg: `ItemBatches/updateqty ${err.message}`,
              //         createdDate: new Date().toISOString().split("T")[0],
              //       };
              //     });
              // }
            }
          } else {
            // Existing stktrns → log
            const existsLog = {
              trnDocNo: docNo,
              loginUser: userDetails.username,
              siteCode: d.storeNo,
              logMsg: "stktrn already exists",
              createdDate: new Date().toISOString().split("T")[0],
            };
            // await apiService.post("Inventorylogs", existsLog);
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
      navigate("/goods-transfer-out?tab=all");
      }     
    catch (err) {
      console.error("onSubmit error:", err);
      toast.error(
        type === "post"
          ? "Failed to post note"
          : urlDocNo
          ? "Failed to update note"
          : "Failed to create note"
      );
    } finally {
      // Reset loading states
      setSaveLoading(false);
      setPostLoading(false);
    }
  };



  const navigateTo = (path) => {
    navigate(path);
  };

  // 1. Add state at the top of the component
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBatchEdit, setIsBatchEdit] = useState(false);

  // 2. Add handleBatchEditClick and handleBatchEditSubmit
  const handleBatchEditClick = () => {
    setIsBatchEdit(true);
    setEditData({ docBatchNo: "", docExpdate: "", itemRemark: "" });
    setShowEditDialog(true);
  };

  // Place this in the main AddGrn component, after other handler functions and before return
  const handleBatchEditSubmit = (fields) => {
    setCartData((prev) =>
      prev.map((item, idx) =>
        selectedRows.includes(idx) ? { ...item, ...fields } : item
      )
    );
    setShowEditDialog(false);
    setIsBatchEdit(false);
    setSelectedRows([]);
    toast.success("Batch update successful!");
  };

  const generateEmailBody = (header, details) => {
    let body = "<html><body>";
    body += `<div><b><span>Transfer Num:</span></b> ${header.docNo}</div>`;
    body += `<div><b><span>Order from: </span></b> ${header.fromSite} <b><span style='margin-left:10px'>Created: </span></b> ${header.docDate}</div>`;
    body += `<div><b><span>Deliver to: </span></b> ${header.toSite} <b><span style='margin-left:10px'>Created by: </span></b> ${header.docAttn}</div>`;
    body += "<br/>STOCK ORDER<br/>";

    // Add table header
    body +=
      "<table cellpadding='6' cellspacing='0' style='margin-top:10px;border: 1px solid #ccc;font-size: 9pt;font-family:Arial'>";
    body += "<tr>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>Product</th>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>SKU</th>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: left'>Supplier Code</th>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Cost</th>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Qty</th>";
    body +=
      "<th style='background-color: #B8DBFD;border: 1px solid #ccc;text-align: right'>Sub Total</th>";
    body += "</tr>";

    // Add rows
    let sumQty = 0;
    let sumAmount = 0;
    details.forEach((item) => {
      body += "<tr>";
      body += `<td style='width:30%;border: 1px solid #ccc;text-align: left'>${item.itemdesc}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: left'>${item.itemcode}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: left'>${
        item.supplyDesc || ""
      }</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: right'>${item.docPrice}</td>`;
      body += `<td style='width:10%;border: 1px solid #ccc;text-align: right'>${item.docQty}</td>`;
      body += `<td style='width:15%;border: 1px solid #ccc;text-align: right'>${Number(
        item.docAmt
      ).toFixed(2)}</td>`;
      body += "</tr>";
      sumQty += Number(item.docQty);
      sumAmount += Number(item.docAmt);
    });

    // Add total row
    body += "<tr>";
    body +=
      "<td style='width:30%;border: 1px solid #ccc;text-align: left'></td>";
    body +=
      "<td style='width:15%;border: 1px solid #ccc;text-align: left'></td>";
    body +=
      "<td style='width:15%;border: 1px solid #ccc;text-align: left'></td>";
    body +=
      "<td style='width:15%;border: 1px solid #ccc;text-align: right;font-weight:bold'>Total</td>";
    body += `<td style='width:10%;border: 1px solid #ccc;text-align: right;font-weight:bold'>${sumQty}</td>`;
    body += `<td style='width:15%;border: 1px solid #ccc;text-align: right;font-weight:bold'>${sumAmount.toFixed(
      2
    )}</td>`;
    body += "</tr>";

    body += "</table></body></html>";
    return body;
  };

  // Edit Posted Document Functions - START
  const editPostedStockHdrs = async (data) => {
    try {
      console.log("Editing posted stock header:", data);
      
      const res = await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${data.docNo}`, data);
      console.log("Posted stock header updated successfully");
      return res;
    } catch (error) {
      console.error("Error updating posted stock header:", error);
      throw error;
    }
  };

  const editPostedStockDetails = async (details) => {
    try {
      console.log("Editing posted stock details:", details);

      // Filter items that have docId (existing items)
      const itemsToUpdate = details.filter((item) => item.docId && item.docId !== "" && item.docId !== null);
      
      if (itemsToUpdate.length === 0) {
        console.log("No existing items to update");
        return true;
      }

      // Process each item for update
      await Promise.all(
        itemsToUpdate.map(async (item) => {
          try {
            // Update StkMovdocDtls - For posted docs, only allow editing price-related fields and remarks
            await apiService.post(`StkMovdocDtls/update?[where][docId]=${item.docId}`, {
              docPrice: item.docPrice, // ALLOW EDITING - This is the main field that can be changed
              docAmt: item.docAmt, // This will be recalculated based on new price
              itemRemark: item.itemRemark, // ALLOW EDITING - Remarks can be changed for posted docs
              // Keep all other fields as original values - they should not be changed for posted docs
            });
            
            console.log(`Updated StkMovdocDtls for docId: ${item.docId}`);
          } catch (error) {
            console.error(`Failed to update Stktrns for docId ${item.docId}:`, error);
            throw error;
          }
        })
      );

      return true;
    } catch (error) {
      console.error("Error during posted stock details editing:", error);
      toast.error("Failed to update some posted document details");
      throw error;
    }
  };

  const editPostedStktrns = async (details, docNo) => {
    try {
      console.log("Editing posted Stktrns data:", details);

      await Promise.all(
        details.map(async (item) => {
          try {
            // 1. Get the ORIGINAL Stktrns record (what was posted before) - for source store
            const originalStktrnFilter = {
              where: {
                and: [
                  { trnDocno: docNo },
                  { storeNo: stockHdrs.fstoreNo }, // Source store
                  { itemcode: item.itemcode + "0000" }
                ]
              }
            };

            const originalStktrn = await apiService.get(
              `Stktrns?filter=${encodeURIComponent(JSON.stringify(originalStktrnFilter))}`
            );

            // 2. Get CURRENT balance from ItemOnQties for source store
            const currentBalanceFilter = {
              where: {
                and: [
                  { itemcode: item.itemcode + "0000" },
                  { uom: item.docUom },
                  { sitecode: stockHdrs.fstoreNo } // Source store
                ]
              }
            };
            
            console.log(`🔍 ItemOnQties filter for source store:`, currentBalanceFilter);

            let newBalQty, newBalCost, itemBatchCost;

            try {
              const url = `Itemonqties?filter=${encodeURIComponent(JSON.stringify(currentBalanceFilter))}`;
              console.log(`🔍 ItemOnQties URL:`, url);
              
              const resp = await apiService.get(url);
              console.log(`🔍 ItemOnQties response:`, resp);
              
              if (resp && resp.length > 0) {
                const currentBalance = resp[0];
                console.log(`🔍 Current balance found:`, currentBalance);
                
                if (originalStktrn && originalStktrn.length > 0) {
                  const original = originalStktrn[0];
                  console.log(`🔍 Original Stktrns found:`, original);
                  
                  // 3. Calculate NEW balance: Current - Original + New
                  // This is the key difference from regular posting!
                  newBalQty = Number(currentBalance.trnBalqty) - Number(original.trnQty) + Number(item.docQty);
                  newBalCost = Number(currentBalance.trnBalcst) - Number(original.trnAmt) + Number(item.docAmt);
                  
                  console.log(`🔍 Balance calculation:`, {
                    currentQty: currentBalance.trnBalqty,
                    currentCost: currentBalance.trnBalcst,
                    originalQty: original.trnQty,
                    originalCost: original.trnAmt,
                    newQty: item.docQty,
                    newCost: item.docAmt,
                    newBalQty: newBalQty,
                    newBalCost: newBalCost
                  });
                } else {
                  console.log(`🔍 No original Stktrns found, using current balance + new values`);
                  newBalQty = Number(currentBalance.trnBalqty) + Number(item.docQty);
                  newBalCost = Number(currentBalance.trnBalcst) + Number(item.docAmt);
                }
                
                itemBatchCost = (item.batchCost || item.docPrice).toString();
              } else {
                console.log(`🔍 No ItemOnQties records found for item ${item.itemcode}`);
                // Fallback: use new values directly
                newBalQty = Number(item.docQty);
                newBalCost = Number(item.docAmt);
                itemBatchCost = item.batchCost;
              }
            } catch (error) {
              console.error(`Error fetching Itemonqties for ${item.itemcode}:`, error);
              // Fallback: use new values directly
              newBalQty = Number(item.docQty);
              newBalCost = Number(item.docAmt);
              itemBatchCost = item.batchCost;
            }

            if (originalStktrn && originalStktrn.length > 0) {
              console.log(`🔄 Found existing Stktrns for item ${item.itemcode}, updating...`);
              
              // Update existing Stktrns record with corrected balance calculations
              const stktrnsUpdate = {
                trnQty: item.docQty,           // New quantity
                trnAmt: item.docAmt,           // New amount
                trnCost: item.docAmt,          // New cost
                trnBalqty: newBalQty,         // ✅ Corrected balance quantity
                trnBalcst: newBalCost          // ✅ Corrected balance cost
              };

              const whereClause = {
                "trnDocno": docNo,
                "storeNo": stockHdrs.fstoreNo, // Source store
                "itemcode": item.itemcode + "0000"
              };

              await apiService.post(
                `Stktrns/update?where=${encodeURIComponent(JSON.stringify(whereClause))}`,
                stktrnsUpdate
              );

              console.log(`Updated Stktrns for item: ${item.itemcode} with corrected balances`);
            } else {
              console.log(`🆕 No existing Stktrns found for item ${item.itemcode}, creating new...`);
              
              // Insert new Stktrns record if doesn't exist
              const today = new Date();
              const timeStr = ("0" + today.getHours()).slice(-2) +
                             ("0" + today.getMinutes()).slice(-2) +
                             ("0" + today.getSeconds()).slice(-2);

              const newStktrns = {
                id: null,
                trnPost: today.toISOString().split("T")[0],
                trnNo: null,
                trnDate: stockHdrs.docDate,
                postTime: timeStr,
                aperiod: null,
                itemcode: item.itemcode + "0000",
                storeNo: stockHdrs.fstoreNo, // Source store
                tstoreNo: stockHdrs.tstoreNo, // Destination store
                fstoreNo: stockHdrs.fstoreNo, // Source store
                trnDocno: docNo,
                trnType: "TFR",
                trnDbQty: null,
                trnCrQty: null,
                trnQty: item.docQty,
                trnBalqty: newBalQty,         // ✅ Corrected balance quantity
                trnBalcst: newBalCost,        // ✅ Corrected balance cost
                trnAmt: item.docAmt,
                trnCost: item.docAmt,
                trnRef: null,
                hqUpdate: false,
                lineNo: item.docLineno,
                itemUom: item.docUom,
                movType: "TFR",
                itemBatch: item.docBatchNo,
                itemBatchCost: itemBatchCost,
                stockIn: null,
                transPackageLineNo: null,
                docExpdate: item.docExpdate
              };

              await apiService.post("Stktrns", newStktrns);
              console.log(`Inserted new Stktrns for item: ${item.itemcode} with corrected balances`);
            }

            // ItemBatches update will be handled separately in editPostedItemBatches function

          } catch (error) {
            console.error(`Failed to process Stktrns for item ${item.itemcode}:`, error);
            throw error;
          }
        })
      );

      return true;
    } catch (error) {
      console.error("Error during posted Stktrns editing:", error);
      toast.error("Failed to update stock transaction records");
      throw error;
    }
  };

  const editPostedItemBatches = async (details) => {
    try {
      console.log("Editing posted ItemBatches data:", details);

      await Promise.all(
        details.map(async (item) => {
          try {
            // Update ItemBatches - batchCost is static, no weighted average needed
            const trimmedItemCode = item.itemcode.replace(/0000$/, "");
            
            if (window?.APP_CONFIG?.BATCH_NO === "Yes") {
              // WITH BATCH NUMBERS: Find and update specific batch record
              console.log(`Processing ItemBatch update with BATCH_NO=Yes for ${item.itemcode}`);
              
              const specificBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: stockHdrs.fstoreNo }, // Source store
                    { uom: item.docUom },
                    { batchNo: item.docBatchNo || "" }
                  ]
                }
              };
              
              try {
                const existingBatch = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(JSON.stringify(specificBatchFilter))}`
                );
                
                if (existingBatch && existingBatch.length > 0) {
                  const batchRecord = existingBatch[0];
                  
                  // Update the existing batch record - batchCost remains static
                  const batchUpdate = {
                    itemCode: batchRecord.itemCode,
                    siteCode: batchRecord.siteCode,
                    batchNo: batchRecord.batchNo,
                    uom: batchRecord.uom,
                    qty: batchRecord.qty, // Keep original total quantity
                    expDate: batchRecord.expDate, // Keep original expiry date
                    batchCost: batchRecord.batchCost // Keep original batch cost (static)
                  };
                  
                  await apiService.patch(`ItemBatches/${batchRecord.id}`, batchUpdate);
                  console.log(`Updated ItemBatches for ${item.itemcode}, batch ${item.docBatchNo}: batchCost remains static at ${batchRecord.batchCost}`);
                } else {
                  console.log(`No existing batch found for item ${item.itemcode} with batch number ${item.docBatchNo}`);
                }
              } catch (error) {
                console.error(`Error updating ItemBatches for item ${item.itemcode}:`, error);
                // Don't throw error here - batch cost update is not critical for the main operation
              }
              
            } else {
              // WITHOUT BATCH NUMBERS: Update single batch record
              console.log(`Processing ItemBatch update with BATCH_NO=No for ${item.itemcode}`);
              
              const singleBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: stockHdrs.fstoreNo }, // Source store
                    { uom: item.docUom }
                  ]
                }
              };
              
              try {
                const existingBatch = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(JSON.stringify(singleBatchFilter))}`
                );
                
                if (existingBatch && existingBatch.length > 0) {
                  const batchRecord = existingBatch[0];
                  
                  // Update the batch record - batchCost remains static
                  const batchUpdate = {
                    itemCode: batchRecord.itemCode,
                    siteCode: batchRecord.siteCode,
                    batchNo: batchRecord.batchNo,
                    uom: batchRecord.uom,
                    qty: batchRecord.qty, // Keep original total quantity
                    expDate: batchRecord.expDate, // Keep original expiry date
                    batchCost: batchRecord.batchCost // Keep original batch cost (static)
                  };
                  
                  await apiService.patch(`ItemBatches/${batchRecord.id}`, batchUpdate);
                  console.log(`Updated ItemBatches for ${item.itemcode}: batchCost remains static at ${batchRecord.batchCost}`);
                } else {
                  console.log(`No existing batch found for item: ${item.itemcode}, skipping batch cost update`);
                }
              } catch (error) {
                console.error(`Error updating ItemBatches for item ${item.itemcode}:`, error);
                // Don't throw error here - batch cost update is not critical for the main operation
              }
            }
          } catch (error) {
            console.error(`Failed to process ItemBatches for item ${item.itemcode}:`, error);
            // Don't throw error here - batch cost update is not critical for the main operation
          }
        })
      );

      return true;
    } catch (error) {
      console.error("Error during posted ItemBatches editing:", error);
      toast.error("Failed to update some ItemBatches records");
      throw error;
    }
  };

  // Edit Posted Document Functions - END

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
                ? "View Goods Transfer Out"
                : urlStatus == 0
                ? "Update Goods Transfer Out"
                : "Add Goods Transfer Out"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/goods-transfer-out")}
              >
                Cancel
              </Button>
              <Button
                disabled={(stockHdrs.docStatus === 7 ) || saveLoading}
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
                disabled={(stockHdrs.docStatus === 7 && userDetails?.isSettingPostedChangePrice !== "True") || postLoading}
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
                    <Input
                      value={userDetails?.siteName}
                      disabled={true}
                      className="bg-gray-50"
                    />
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
                    <Select
                      value={stockHdrs.tstoreNo || ""}
                      disabled={urlStatus == 7 || urlDocNo}
                      onValueChange={(value) =>
                        setStockHdrs((prev) => ({ ...prev, tstoreNo: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select To store">
                          {storeOptions.find(
                            (store) => store.value === stockHdrs.tstoreNo
                          )?.label || "Select To store"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions
                          .filter((store) => store.value !== stockHdrs.storeNo)
                          .map((store) => (
                            <SelectItem key={store.value} value={store.value}>
                              {store.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
                          onChange={handleBrandChange}
                          placeholder="Filter by brand..."
                        />
                      </div>

                      <div className="flex-1 mt-2">
                        <MultiSelect
                          options={rangeOptions}
                          selected={tempFilters.range}
                          onChange={handleRangeChange}
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
                            handleDepartmentChange("RETAIL PRODUCT");
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
                            handleDepartmentChange("SALON PRODUCT");
                          }}
                        />
                        <label htmlFor="salon" className="text-sm">
                          Salon Product
                        </label>
                      </div>
                    </div>

                    {/* <div className="rounded-md border shadow-sm hover:shadow-md transition-shadow duration-200"> */}
                    <ItemTable
                      data={stockList}
                      loading={loading}
                      onQtyChange={(e, index) => handleCalc(e, index, "Qty")}
                      onPriceChange={(e, index) =>
                        handleCalc(e, index, "Price")
                      }
                      onExpiryDateChange={(e, index) =>
                        handleCalc(e, index, "expiryDate")
                      }
                      onAddToCart={(index, item) => addToCart(index, item)}
                      currentPage={pagination.page}
                      itemsPerPage={6}
                      totalPages={Math.ceil(itemTotal / pagination.limit)}
                      onPageChange={handlePageChange}
                      showBatchColumns={window?.APP_CONFIG?.BATCH_NO === "Yes"}
                      enableSorting={true}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                    />
                    {/* </div> */}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
          {cartData.length > 0 && (
            <div className="flex justify-end my-5">
              {selectedRows.length > 0 && (urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True")) && (
                <Button
                  onClick={handleBatchEditClick}
                  className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
                >
                  Update Selected
                </Button>
              )}
            </div>
          )}

          {cartData.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50/50 shadow-sm hover:shadow-md transition-shadow duration-200 mb-15">
              <CardTitle className="text-xl px-2 py-3">
                Selected Items
              </CardTitle>
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow className="border-b border-slate-200">
                    {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                      <TableHead>
                        <input
                          type="checkbox"
                          className="w-5 h-5"
                          checked={
                            selectedRows.length === cartData.length &&
                            cartData.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows(cartData.map((_, idx) => idx));
                            } else {
                              setSelectedRows([]);
                            }
                          }}
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="font-semibold text-slate-700">
                      NO
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700">
                      Item Code
                    </TableHead>
                                          <TableHead>Item Description</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Quantity</TableHead>
                                          {userDetails?.isSettingViewPrice === "True" && (
                      <TableHead>Price</TableHead>
                    )}
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableHead className="font-semibold text-slate-700">
                        Amount
                      </TableHead>
                    )}
                    {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                      <>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Batch No</TableHead>
                      </>
                    )}
                    <TableHead>Remarks</TableHead>
                    {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                      <TableHead>Action</TableHead>
                    ) : null}
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
                          {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                            <TableCell>
                              <input
                                type="checkbox"
                                className="w-5 h-5"
                                checked={selectedRows.includes(index)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRows([...selectedRows, index]);
                                  } else {
                                    setSelectedRows(
                                      selectedRows.filter((i) => i !== index)
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>{item.itemcode}</TableCell>
                          <TableCell>{item.itemdesc}</TableCell>
                          <TableCell>{item.docUom}</TableCell>
                          <TableCell className="font-medium">
                            {item.docQty}
                          </TableCell>
                          {userDetails?.isSettingViewPrice === "True" && (
                            <TableCell>{item.docPrice}</TableCell>
                          )}

                          {userDetails?.isSettingViewPrice === "True" && (
                            <TableCell className="font-semibold text-slate-700">
                              {item.docAmt}
                            </TableCell>
                          )}
                          {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                            <>
                              <TableCell>{format_Date(item.docExpdate)}</TableCell>
                              <TableCell>{item?.docBatchNo ?? "-"}</TableCell>
                            </>
                          )}
                          <TableCell>{item.itemRemark ?? "-"}</TableCell>
                          {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
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
                                {/* Delete button only for non-posted documents */}
                                {urlStatus != 7 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDeleteCart(item, index)}
                                    className="cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-medium">
                        <TableCell
                          colSpan={5}
                          className="text-right text-slate-700"
                        >
                          Totals:
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {calculateTotals(cartData).totalQty}
                        </TableCell>
                        {userDetails?.isSettingViewPrice === "True" && <TableCell />}

                        {userDetails?.isSettingViewPrice === "True" && (
                          <TableCell className="font-semibold text-slate-700">
                            {calculateTotals(cartData).totalAmt.toFixed(2)}
                          </TableCell>
                        )}
                        {window?.APP_CONFIG?.BATCH_NO === "Yes" ? (
                          <TableCell colSpan={2 + (userDetails?.isSettingViewPrice === "True" ? 1 : 0)} />
                        ) : (
                          <TableCell colSpan={2 + (userDetails?.isSettingViewPrice === "True" ? 1 : 0)} />
                        )}
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
        onSubmit={isBatchEdit ? handleBatchEditSubmit : handleEditSubmit}
        isBatchEdit={isBatchEdit}
        urlStatus={urlStatus}
        userDetails={userDetails}
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

export default AddGto;
