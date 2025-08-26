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
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";

const calculateTotals = (cartData) => {
  return cartData.reduce(
    (acc, item) => ({
      totalQty: acc.totalQty + Number(item.docQty),
      totalAmt: acc.totalAmt + Number(item.docAmt),
      systemQty: acc.systemQty + Number(item.docTtlqty || 0),
      variance: acc.variance + ((Number(item.docQty) || 0) - (Number(item.docTtlqty) || 0)),
    }),
    { totalQty: 0, totalAmt: 0, systemQty: 0, variance: 0 }
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
                     {/* Price field removed as it's not displayed in the cart table */}
          {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="batchNo">Batch No</Label>
                <Input
                  id="batchNo"
                  value={editData?.docBatchNo || ""}
                  onChange={(e) => onEditCart(e, "docBatchNo")}
                  placeholder="Enter batch number"
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

function AddTake({ docData }) {
  const { docNo } = useParams();
  const navigate = useNavigate();
  const urlDocNo = docNo || null;
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  console.log(urlDocNo, "urlDocNo");
  console.log(urlStatus, "urlStatus");

  // State management - Stock Take workflow states
  const statusOptions = [
    { value: 0, label: "Saved" },
    { value: 1, label: "Submitted" },
    { value: 2, label: "Approved" },
    { value: 3, label: "Rejected" },
  ];

  const [activeTab, setActiveTab] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [itemTotal, setItemTotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 1000);
  const [supplyOptions, setSupplyOptions] = useState([]);
  const [stockList, setStockList] = useState([]);
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const [saveLoading, setSaveLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "TKE",
    splyCode: "",
    docNo: "",
  });

  const [itemFilter, setItemFilter] = useState({
    // where: {
    //   movCode: "TKE",
    // },
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

  const [dropDownFilter, setDropDownFilter] = useState({
    // like: {
    //   range: "",
    //   brand: "",
    // },
    // skip: 0,
    // limit: 6,
  });
  const [stockHdrs, setStockHdrs] = useState({
    docNo: "",
    docDate: new Date().toISOString().split("T")[0],
    docStatus: null,
    storeNo: userDetails?.siteCode,
    docRemk1: "",
    createUser: userDetails?.username,
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

  // Add new state for temporary filter values
  const [tempFilters, setTempFilters] = useState({
    brand: [],
    range: [],
  });

  // Add Stock Take specific state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Function to check if user can edit based on status and permissions
  const canEdit = () => {
    if (!stockHdrs.docNo) {
      return true; // New document - can edit
    }
    if (stockHdrs.docStatus === 0 || stockHdrs.docStatus === 3) {
      return true; // Saved or Rejected - all users with access can edit
    }
    if (stockHdrs.docStatus === 1) {
      return userDetails?.canApprove; // Submitted - only users with approval rights can edit
    }
    return false; // Approved - no one can edit
  };

  // Add sorting function
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

  // Enhanced handleCalc to include remarks
  const handleRemarksChange = (e, index) => {
    const value = e.target.value;
    setStockList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, remarks: value } : item))
    );
  };

  // Add apply filters function
  const handleApplyFilters = () => {
    setItemFilter((prev) => ({
      ...prev,
      whereArray: {
        ...prev.whereArray,
        brand: tempFilters.brand.map((item) => item.label) || [],
        range: tempFilters.range.map((item) => item.label) || [],
      },
      skip: 0,
    }));
    // getStockDetails();
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setPageLoading(true);

      try {
        if (urlDocNo) {
          // If editing existing document
          const filter = {
            where: {
              movCode: "TKE",
              docNo: urlDocNo,
            },
          };
          await getStockHdr(filter);
          console.log(urlStatus, urlStatus === 7);

          if (urlStatus != 7) {
            await getOptions();
            await getStockDetails();
          }

          await getStockHdrDetails(filter);
          await getSupplyList();
          setPageLoading(false);
          setInitial(false);
        } else {
          // If creating new document
          await getSupplyList();
          await getStockDetails();
          await getOptions();

          setPageLoading(false);
          setInitial(false);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load initial data",
        });
      } finally {
        // setLoading(false);
        setPageLoading(false);
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

    // if (stockList.length > 0 && itemFilter.whereArray.department.length >= 1) {
    //   setLoading(true);
    //   getStockDetails();
    // }
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
        storeNo: data.storeNo,
        docRemk1: data.docRemk1,
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

      console.log(supplierInfo, "ddd2");
    } catch (error) {
      console.error("Error fetching stock header data:", error);
      showError("Failed to fetch stock header data.");
    }
  };

  const getOptions = async () => {
    Promise.all([
      apiService.get(`ItemBrands${buildFilterQuery(dropDownFilter)}`),
      apiService.get(`ItemRanges${buildCountQuery(dropDownFilter)}`),
    ]).then(([brands, ranges]) => {
      console.log(brands);
      console.log(ranges);
      const brandOp = brands.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));
      // Remove duplicates from ranges based on itmCode
      const uniqueRanges = ranges.reduce((acc, current) => {
        const x = acc.find((item) => item.itmCode === current.itmCode);
        if (!x) {
          acc.push(current);
        }
        return acc;
      }, []);

      const rangeOp = uniqueRanges.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));

      setBrandOption(brandOp);
      setRangeOptions(rangeOp);
    });
  };

  const getStockDetails = async () => {
    // const filter = buildFilterObject(itemFilter);
    // const countFilter = buildCountObject(itemFilter);
    // console.log(countFilter, "filial");
    // // const query = `?${qs.stringify({ filter }, { encode: false })}`;
    // const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
    // const countQuery = `?where=${encodeURIComponent(
    //   JSON.stringify(countFilter.where)
    // )}`;
    // const filt={
    //   site:'MC01'
    // }
    //     const query = `?site=${encodeURIComponent(JSON.stringify(filt))}`;

    const query = `?Site=${userDetails.siteCode}`;

    // apiService.get(`PackageItemDetails${query}`),
    // apiService.get(`PackageItemDetails/count${countQuery}`),

    apiService1
      .get(`api/GetInvitems${query}`)
      // apiService1.get(`api/GetInvitems/count${countQuery}`),
      // apiService.get(`GetInvItems${query}`),

      .then((res) => {
        const stockDetails = res.result;
        const count = res.result.length;
        setLoading(false);
        const updatedRes = stockDetails.map((item) => ({
          ...item,
          Qty: 0,
          expiryDate: null,
          batchNo: "",
          remarks: "",
          // Price: Number(item?.item_Price),
          // Price: item?.Price,

          docAmt: null,
        }));
        console.log(updatedRes, "updatedRes");
        console.log(count, "count");

        setStockList(updatedRes);
        setItemTotal(count);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error fetching stock details:", err);
        toast.error("Failed to fetch stock details");
      });
  };

  const getSupplyList = async () => {
    try {
      const res = await apiService.get(
        `ItemSupplies${queryParamsGenerate(filter)}`
      );

      const supplyOption = res
        .filter((item) => item.splyCode)
        .map((item) => ({
          label: item.supplydesc,
          value: item.splyCode,
        }));

      setSupplyOptions(supplyOption);
    } catch (err) {
      console.error("Error fetching supply list:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch supply list",
      });
    }
  };

  const getDocNo = async () => {
    try {
      const codeDesc = "Stock Take";
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
      console.log("rescontrolData:", res);

      return { docNo, controlData };
    } catch (err) {
      console.error("Error fetching doc number:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate document number",
      });
      return null;
    }
  };

  // Function to get document number for Stock Adjustment
  const getAdjDocNo = async () => {
    try {
      const codeDesc = "Adjustment Stock";
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
    } catch (err) {
      console.error("Error fetching adjustment doc number:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate adjustment document number",
      });
      return null;
    }
  };

  const addNewControlNumber = async (controlData) => {
    try {
      const controlNo = controlData.RunningNo;
      const newControlNo = (parseInt(controlNo, 10) + 1).toString();

      const controlNosUpdate = {
        controldescription: "Stock Take",
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

  // Function to add new control number for Stock Adjustment
  const addNewAdjControlNumber = async (controlData) => {
    try {
      const controlNo = controlData.RunningNo;
      const newControlNo = (parseInt(controlNo, 10) + 1).toString();

      const controlNosUpdate = {
        controldescription: "Adjustment Stock",
        sitecode: userDetails.siteCode,
        controlnumber: newControlNo,
      };

      const response = await apiService.post(
        "ControlNos/updatecontrol",
        controlNosUpdate
      );

      if (!response) {
        throw new Error("Failed to update adjustment control number");
      }

      return response;
    } catch (error) {
      console.error("Error updating adjustment control number:", error);
      toast.error("Failed to update adjustment control number");
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
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stock header details:", err);
    }
  };

  const postStockDetails = async (cart) => {
    try {
      console.log("postStockDetails called with cartData:", cartData);
      console.log("Current stockHdrs.docNo:", stockHdrs.docNo);

      // First, find items to be deleted
      const itemsToDelete = cartItems.filter(
        (cartItem) => !cart.some((item) => item.docId === cartItem.docId)
      );

      // Group items by operation type
      const itemsToUpdate = cart.filter((item) => item.docId);
      const itemsToCreate = cart.filter((item) => !item.docId);

      // Execute deletions first (in parallel)
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

      // Execute updates (in parallel)
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

      // Execute creates (in parallel)
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
      throw error; // Re-throw to handle in calling function
    }
  };

  const postStockHdr = async (data, type) => {
    console.log(data, "data stock h det post");
    if (type === "create") {
      try {
        const res = await apiService.post("StkMovdocHdrs", data);
        console.log(res, "post");
        return res;
      } catch (err) {
        console.error(err);
        throw err;
      }
    } else {
      try {
        let docNo = data.docNo;
        const res = await apiService.post(
          `StkMovdocHdrs/update?[where][docNo]=${docNo}`,
          data
        );
        return res;
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
  };

  const createStockAdjustmentFromStockTake = async (stockTakeDocNo) => {
    try {
      console.log("Creating Stock Adjustment from Stock Take:", stockTakeDocNo);

      if (!stockTakeDocNo) {
        throw new Error("Stock Take document number is required");
      }

      // Step 1: Get Stock Take details to calculate variances
      const stockTakeDetailsResponse = await apiService.get(
        `StkMovdocDtls?filter=${encodeURIComponent(
          JSON.stringify({ where: { docNo: stockTakeDocNo } })
        )}`
      );

      if (!stockTakeDetailsResponse || stockTakeDetailsResponse.length === 0) {
        throw new Error("No stock take details found");
      }

      // Step 2: Calculate variances using docQty (counted) and docTtlqty (system)
      const adjustmentItems = stockTakeDetailsResponse
        .filter((item) => {
          const variance =
            (parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0);
          return Math.abs(variance) > 0; // Only include items with variance
        })
        .map((item) => {
          const variance =
            (parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0);
          return {
            ...item,
            docQty: Math.abs(variance), // Use absolute value for adjustment
            docAmt: Math.abs(variance) * (parseFloat(item.docPrice) || 0),
            trnQty: variance, // Keep signed variance for backend processing
            remarks: `Stock Take Variance - ${stockTakeDocNo}`,
            docBatchNo: item.docBatchNo || null,
            expiryDate: item.docExpdate || null,
            // Ensure all required fields are present
            itmBrand: item.itmBrand || item.brandCode || "",
            itmRange: item.itmRange || item.rangeCode || "",
            itmBrandDesc: item.itmBrandDesc || item.brand || "",
            itmRangeDesc: item.itmRangeDesc || item.range || "",
            docUom: item.docUom || item.itemUom || "",
            docPrice: item.docPrice || item.Price || 0,
            docTtlqty: item.docTtlqty || item.quantity || 0,
          };
        });

      if (adjustmentItems.length === 0) {
        console.log("No variances found, skipping adjustment creation");
        return null;
      }

      // Step 3: Generate new adjustment document number
      const adjDocResult = await getAdjDocNo();
      
      if (!adjDocResult) {
        throw new Error("Failed to generate adjustment document number");
      }

      const adjustmentDocNo = adjDocResult.docNo;
      const adjControlData = adjDocResult.controlData;

      // Step 4: Calculate totals
      const totalQty = adjustmentItems.reduce(
        (sum, item) => sum + Math.abs(parseFloat(item.trnQty) || 0),
        0
      );
      const totalAmt = adjustmentItems.reduce(
        (sum, item) => sum + (parseFloat(item.docAmt) || 0),
        0
      );

      // Step 5: Create Stock Adjustment header
      const adjustmentHeader = {
        docNo: adjustmentDocNo,
        movCode: "ADJ",
        movType: "ADJ",
        storeNo: stockHdrs.storeNo,
        supplyNo: stockHdrs.supplyNo || "",
        docRef1: stockTakeDocNo, // Reference to original Stock Take
        docRef2: "Auto-generated from Stock Take",
        docLines: adjustmentItems.length, // Set actual number of lines
        docDate: moment().format("YYYY-MM-DD"),
        postDate: moment().format("YYYY-MM-DD"),
        docStatus: 0, // Open status
        docTerm: stockHdrs.docTerm || "",
        docQty: totalQty,
        docAmt: totalAmt,
        docAttn: supplierInfo.Attn || "",
        docRemk1: `Auto-generated adjustment from Stock Take ${stockTakeDocNo}`,
        bname: supplierInfo.Attn || "",
        baddr1: supplierInfo.line1 || "",
        baddr2: supplierInfo.line2 || "",
        baddr3: supplierInfo.line3 || "",
        bpostcode: supplierInfo.pcode || "",
        daddr1: supplierInfo.sline1 || "",
        daddr2: supplierInfo.sline2 || "",
        daddr3: supplierInfo.sline3 || "",
        dpostcode: supplierInfo.spcode || "",
        createUser: userDetails?.username || "SYSTEM",
        createDate: new Date().toISOString(),
        staffNo: userDetails?.usercode || userDetails?.username || "SYSTEM",
        // Additional fields that might be required
        docPdisc: 0,
        docDisc: 0,
        docMdisc: 0,
        recQty1: 0,
        postedQty: 0,
        cancelQty: 0,
        recTtl: 0,
      };

      // Step 6: Create the adjustment header
      const headerResponse = await apiService.post(
        "StkMovdocHdrs",
        adjustmentHeader
      );
      console.log("Stock Adjustment header created:", headerResponse);

      // Step 7: Create adjustment details
      const adjustmentDetails = adjustmentItems.map((item, index) => ({
        id: index + 1,
        docAmt: item.docAmt,
        docNo: adjustmentDocNo,
        movCode: "ADJ",
        movType: "ADJ",
        docLineno: item.lineNo || null,
        itemcode: item.itemcode,
        itemdesc: item.itemdesc,
        docQty: Math.abs(item.trnQty), // Use absolute value for adjustment
        docFocqty: 0,
        docTtlqty: Math.abs(item.trnQty), // Use absolute value for adjustment
        docPrice: item.docPrice,
        docPdisc: 0,
        docDisc: 0,
        recQty1: 0,
        postedQty: 0,
        cancelQty: 0,
        createUser: userDetails?.username || "SYSTEM",
              docUom: item.docUom || "",
      docExpdate: window?.APP_CONFIG?.EXPIRY_DATE === "Yes" ? (item.docExpdate || "") : "",
      itmBrand: item.itmBrand || "",
        itmRange: item.itmRange || "",
        itmBrandDesc: item.itmBrandDesc || "",
        itmRangeDesc: item.itmRangeDesc || "",
        DOCUOMDesc: item.docUom || "",
        itemRemark: item.remarks || "",
        docMdisc: 0,
        recTtl: 0,
        docBatchNo: item.docBatchNo || null,
        // Additional fields for reference
        trnQty: item.trnQty, // Keep signed variance for backend processing
        systemQty: item.docTtlqty, // Use docTtlqty for system quantity
        stockTakeQty: item.docQty, // Use docQty for counted quantity
        createDate: null,
        // Additional fields that might be required by the system
        useExistingBatch: false, // Default to false for new adjustments
        itemBatch: item.docBatchNo || null, // Alternative field name for batch
      }));

      // Step 8: Insert adjustment details
      for (const detail of adjustmentDetails) {
        try {
          await apiService.post("StkMovdocDtls", detail);
        } catch (detailError) {
          console.error("Error inserting adjustment detail:", detailError);
          throw new Error(
            `Failed to insert adjustment detail for item ${detail.itemcode}: ${detailError.message}`
          );
        }
      }

      // Step 9: Update control number
      try {
        await addNewAdjControlNumber(adjControlData);
      } catch (controlError) {
        console.error("Error updating adjustment control number:", controlError);
        // Don't throw error for control number update failure as the main document is already created
        console.warn(
          "Control number update failed, but adjustment document was created successfully"
        );
      }

      console.log("Stock Adjustment created successfully:", adjustmentDocNo);
      return adjustmentDocNo;
    } catch (error) {
      console.error("Error creating Stock Adjustment:", error);
      throw error;
    }
  };

  // Function to update stock quantities and item batches when stock take is approved
  const updateStockQuantitiesAndBatches = async (stockTakeDocNo) => {
    try {
      console.log("Updating stock quantities and batches for Stock Take:", stockTakeDocNo);

      // Step 1: Get Stock Take details
      const stockTakeDetailsResponse = await apiService.get(
        `StkMovdocDtls?filter=${encodeURIComponent(
          JSON.stringify({ where: { docNo: stockTakeDocNo } })
        )}`
      );

      if (!stockTakeDetailsResponse || stockTakeDetailsResponse.length === 0) {
        throw new Error("No stock take details found");
      }

      // Step 2: Create Stktrns records for each item
      const stktrns = stockTakeDetailsResponse.map((item) => {
        const variance = (parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0);
        const trimmedItemCode = item.itemcode.replace(/0000$/, "");
        
        return {
          trnDocno: stockTakeDocNo,
          trnDate: moment().format("YYYY-MM-DD"),
          storeNo: stockHdrs.storeNo,
          itemcode: item.itemcode,
          itemUom: item.docUom || item.itemUom || "",
          trnQty: variance, // Use signed variance (positive for increase, negative for decrease)
          trnCost: (parseFloat(item.docPrice) || 0) * Math.abs(variance),
          trnBalqty: (parseFloat(item.docTtlqty) || 0) + variance, // Update balance
          trnBalcst: (parseFloat(item.docTtlqty) || 0) * (parseFloat(item.docPrice) || 0),
          trnType: "TKE", // Stock Take transaction type
          loginUser: userDetails?.username || "SYSTEM",
          siteCode: userDetails?.siteCode,
          itemBatch: item.docBatchNo || null,
          docExpdate: window?.APP_CONFIG?.EXPIRY_DATE === "Yes" ? (item.docExpdate || null) : null,
        };
      });

      // Step 3: Check if Stktrns already exist
      const chkFilter = {
        where: {
          and: [{ trnDocno: stockTakeDocNo }, { storeNo: stockHdrs.storeNo }],
        },
      };
      const stkResp = await apiService.get(
        `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
      );

      if (stkResp.length === 0) {
        // Step 4: Create new Stktrns records
        await apiService.post("Stktrns", stktrns);
        console.log("Stktrns records created successfully");

        // Step 5: Update ItemBatches quantities
        for (const d of stktrns) {
          const trimmedItemCode = d.itemcode.replace(/0000$/, "");

          if (window?.APP_CONFIG?.BATCH_NO === "Yes") {
            // With batch functionality enabled
            const batchUpdate = {
              itemcode: trimmedItemCode,
              sitecode: d.storeNo,
              uom: d.itemUom,
              qty: Number(d.trnQty), // Use signed variance
              batchcost: Number(d.trnCost),
              batchno: d.itemBatch || "",
            };

            try {
              await apiService.post("ItemBatches/updateqty", batchUpdate);
              console.log(`Updated ItemBatches for item ${trimmedItemCode} with batch ${d.itemBatch}`);
            } catch (err) {
              console.error(`Failed to update ItemBatches for item ${trimmedItemCode}:`, err);
              // Log error but don't fail the entire process
              const errorLog = {
                trnDocNo: stockTakeDocNo,
                itemCode: d.itemcode,
                loginUser: userDetails.username,
                siteCode: userDetails.siteCode,
                logMsg: `ItemBatches/updateqty error: ${err.message}`,
                createdDate: new Date().toISOString().split("T")[0],
              };
              // await apiService.post("Inventorylogs", errorLog);
            }
          } else {
            // Without batch functionality
            const batchUpdate = {
              itemcode: trimmedItemCode,
              sitecode: d.storeNo,
              uom: d.itemUom,
              qty: Number(d.trnQty), // Use signed variance
              batchcost: Number(d.trnCost),
            };

            try {
              await apiService.post("ItemBatches/updateqty", batchUpdate);
              console.log(`Updated ItemBatches for item ${trimmedItemCode} (no batch functionality)`);
            } catch (err) {
              console.error(`Failed to update ItemBatches for item ${trimmedItemCode}:`, err);
              // Log error but don't fail the entire process
              const errorLog = {
                trnDocNo: stockTakeDocNo,
                itemCode: d.itemcode,
                loginUser: userDetails.username,
                siteCode: userDetails.siteCode,
                logMsg: `ItemBatches/updateqty error: ${err.message}`,
                createdDate: new Date().toISOString().split("T")[0],
              };
              // await apiService.post("Inventorylogs", errorLog);
            }
          }
        }
      } else {
        console.log("Stktrns already exist for this document");
      }

      console.log("Stock quantities and batches updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating stock quantities and batches:", error);
      throw error;
    }
  };

     const handleCalc = (e, index, field) => {
     const value = e.target.value;
     setStockList((prev) =>
       prev.map((item, i) =>
         i === index
           ? {
               ...item,
               [field]:
                 field === "expiryDate" || field === "batchNo"
                   ? value
                   : Number(value),
               // docAmt calculation removed as it's not displayed
             }
           : item
       )
     );
   };

  const handleSearch = (e) => {
    const searchValue = e.target.value.trim();
    console.log(searchValue, "searchValue");
    setLoading(true); // Set loading to true

    setSearchValue(searchValue); // Update the search value state

    setItemFilter((prev) => ({
      ...prev,
      like: {
        ...prev.like,
        stockCode: searchValue,
        itemUom: searchValue,
        stockName: searchValue,
        // range: searchValue,
        // brand: searchValue,
        brandCode: searchValue,
      },
      skip: 0,
    }));
    // updateLike(searchValue); // Update the like filter with the search value
    // updatePagination({ skip: 0 }); // Reset pagination to the first page
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

  const validateForm = (hdrs = stockHdrs, cart = cartData, type = "save") => {
    const errors = [];

    // Document Header Validations
    // if (!stockHdrs.docNo) {
    //   errors.push("Document number is required");
    // }
    console.log(hdrs, "hdrs");

    if (!hdrs.docDate) {
      errors.push("Document date is required");
    }

    // Additional validation for submission
    if (type === "submit") {
      // Ensure all items have proper quantities
      cart.forEach((item, index) => {
        if (!item.docQty || item.docQty <= 0) {
          errors.push(
            `Quantity must be greater than 0 for item ${index + 1} (${
              item.itemcode
            })`
          );
        }
      });
    }

    // Cart Validation
    if (cart.length === 0) {
      errors.push("Cart shouldn't be empty");
    }

    // Batch and Expiry Date Validation - Only for submit and when batch functionality is enabled
    if (type === "submit" && window?.APP_CONFIG?.BATCH_NO === "Yes") {
      cart.forEach((item, index) => {
        if (!item.docBatchNo) {
          errors.push(
            `Batch number is required for item ${index + 1} (${item.itemcode})`
          );
        }
        if (!item.docExpdate) {
          errors.push(
            `Expiry date is required for item ${index + 1} (${item.itemcode})`
          );
        }
      });
    }

    // Show errors if any
    if (errors.length > 0) {
      // Show first error in toast
      toast.error(errors[0], {
        duration: 3000,
      });

      // Show all errors in an alert dialog
      setValidationErrors(errors);
      setShowValidationDialog(true);
      return false;
    }

    return true;
  };

  const handleDateChange = (e, type) => {
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
     if (!editData.docQty) {
       toast.error("Quantity is required");
       return;
     }
 
     const updatedItem = {
       ...editData,
       docQty: Number(editData.docQty),
       // Keep existing price and amount values
       docPrice: editData.docPrice || 0,
       docAmt: (Number(editData.docQty) * Number(editData.docPrice || 0)),
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
       docExpdate: window?.APP_CONFIG?.EXPIRY_DATE === "Yes" ? (item.docExpdate || "") : "",
       itemRemark: item.itemRemark || "",
       ...(window?.APP_CONFIG?.BATCH_NO === "Yes" && {
         docBatchNo: item.docBatchNo || "",
       }),
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
 
     // Amount calculation kept for backend processing but not displayed
     const amount = Number(item.Qty) * Number(item.Price);

         const newCartItem = {
       id: cartData.length + 1,
       // docAmt kept for backend processing but not displayed
       docAmt: amount,
       docNo: stockHdrs.docNo,
       movCode: "TKE",
       movType: "TKE",
       docLineno: null,
       itemcode: item.stockCode,
       itemdesc: item.stockName,
       docQty: Number(item.Qty), // Counted quantity
       docFocqty: 0,
       docTtlqty: Number(item.quantity), // System Quantity (what system shows)
       docPrice: Number(item.Price),
       docPdisc: 0,
       docDisc: 0,
       recQty1: 0,
       postedQty: 0,
       cancelQty: 0,
       createUser: userDetails?.username || "SYSTEM",
       docUom: item.uom || "",
       docExpdate: window?.APP_CONFIG?.EXPIRY_DATE === "Yes" ? (item.expiryDate || "") : "",
       itmBrand: item.brandCode,
       itmRange: item.rangeCode,
       itmBrandDesc: item.brand,
       itmRangeDesc: item.range || "",
       DOCUOMDesc: item.uomDescription,
       itemRemark: "",
       docMdisc: 0,
       recTtl: 0,
       ...(window?.APP_CONFIG?.BATCH_NO === "Yes" && {
         docBatchNo: item.batchNo || "",
       }),
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

  const onSubmit = async (e, type) => {
    e?.preventDefault();
    console.log(stockHdrs, "stockHdrs");
    console.log(cartData, "cartData");
    
    // Set loading states based on action type
    if (type === "save") {
      setSaveLoading(true);
    } else if (type === "submit") {
      setPostLoading(true);
    }
  
    try {
      let docNo;
      let controlData;
      let hdr = stockHdrs;
      let details = cartData;
  
      // Get new docNo for both new creations and direct submissions
      if ((type === "save" || type === "submit") && !urlDocNo) {
        const result = await getDocNo();
        console.log(result, "redd");
        if (!result) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }
        docNo = result.docNo;
        controlData = result.controlData;
  
        // Update states with new docNo
        hdr = { ...stockHdrs, docNo }; // Create new hdr with docNo
        details = cartData.map((item, index) => ({
          ...item,
          docNo,
          id: index + 1, // Use sequential index + 1 for new items
        }));
        console.log(details, "details");
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlData);
  
        // Move validation here after docNo is set
        if (!validateForm(hdr, details, type)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }
      } else {
        // Use existing docNo for updates and submissions
        docNo = urlDocNo || stockHdrs.docNo;
  
        // Validate for updates and submissions
        if (!validateForm(hdr, details, type)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }
      }
  
      console.log("Form is valid, proceeding with submission.");
      const totalCart = calculateTotals(details);
  
      let data = {
        docNo: hdr.docNo,
        movCode: "TKE",
        movType: "TKE",
        storeNo: hdr.storeNo,
        docLines: null,
        docDate: hdr.docDate,
        docStatus: type === "save" ? 0 : type === "submit" ? 1 : hdr.docStatus,
        docQty: totalCart.totalQty,
        docAmt: totalCart.totalAmt,
        docRemk1: hdr.docRemk1,
        createUser: hdr.createUser,
        postDate: type === "submit" ? new Date().toISOString() : "",
        createDate: urlDocNo ? hdr.createDate : new Date().toISOString(),
        staffNo: userDetails.usercode || userDetails.username,
      };
  
      if (hdr?.poId) data.poId = hdr?.poId;
  
      let message;
      console.log(type, urlDocNo, hdr?.docStatus);
  
      if (type === "save") {
        // Save functionality - can be used for both new and existing documents
        if (!urlDocNo) {
          // Creating new document
          await postStockHdr(data, "create");
          await postStockDetails(details);
          await addNewControlNumber(controlData);
          message = "Stock Take saved successfully";
        } else {
          // Updating existing document
          await postStockHdr(data, "update");
          await postStockDetails(details);
          message = "Stock Take updated successfully";
        }
      } else if (type === "submit") {
        // Submit for approval - status changes to 1 (Submitted)
        data.docStatus = 1;
        data.submitDate = new Date().toISOString();
        data.submittedBy = userDetails?.username;
  
        if (!urlDocNo) {
          // Direct submit without saving first - create header and details
          await postStockHdr(data, "create");
          await postStockDetails(details);
          await addNewControlNumber(controlData);
          message = "Stock Take submitted for approval successfully";
        } else {
          // Update existing document to submitted status
          await postStockHdr(data, "update");
          await postStockDetails(details);
          message = "Stock Take submitted for approval";
        }
      } else if (type === "approve") {
        // Approve stock take - status changes to 2 (Approved)
        data.docStatus = 2;
        data.approveDate = new Date().toISOString();
        data.approvedBy = userDetails?.username;
  
        // Step 1: Update Stock Take status to Approved
        const updateResponse = await postStockHdr(data, "update");
        await postStockDetails(details);
  
                 // Step 2: Check if update was successful (response should have count: 1)
         if (updateResponse && updateResponse.count === 1) {
           // Step 3: Update stock quantities and item batches
           try {
             await updateStockQuantitiesAndBatches(docNo);
             console.log("Stock quantities and batches updated successfully");
           } catch (stockUpdateError) {
             console.error("Error updating stock quantities:", stockUpdateError);
             // Log error but don't fail the approval process
             toast.warning("Stock Take approved but failed to update stock quantities");
           }

           // Step 4: Create Stock Adjustment document
           try {
             const adjustmentDocNo = await createStockAdjustmentFromStockTake(
               docNo
             );
             if (adjustmentDocNo) {
               message = `Stock Take approved and Stock Adjustment ${adjustmentDocNo} created successfully`;
               toast.success(
                 `Stock Adjustment ${adjustmentDocNo} created successfully`
               );
             } else {
               message =
                 "Stock Take approved (no variances found for adjustment)";
               toast.info("No variances found - no adjustment document needed");
             }
           } catch (adjustmentError) {
             console.error("Error creating adjustment:", adjustmentError);
             message =
               "Stock Take approved but failed to create adjustment document";
             toast.error(
               "Failed to create adjustment document: " + adjustmentError.message
             );
           }
         } else {
           throw new Error("Failed to update Stock Take status");
         }
      } else if (type === "reject") {
        // Reject stock take - status changes to 3 (Rejected)
        data.docStatus = 3;
        data.rejectDate = new Date().toISOString();
        data.rejectedBy = userDetails?.username;
        data.rejectReason = ""; // You might want to add a reject reason field
  
        await postStockHdr(data, "update");
        await postStockDetails(details);
  
        message = "Stock Take rejected";
      }
  
      toast.success(message);
  
      // Refresh the page data after status change
      if (urlDocNo) {
        navigate("/stock-take?tab=all");
      } else {
        navigate("/stock-take?tab=all");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to process Stock Take");
    } finally {
      // Always reset loading states
      setSaveLoading(false);
      setPostLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    console.log(newPage, "newPage");
    const newLimit = itemFilter.limit;
    const newSkip = (newPage - 1) * newLimit;
    setItemFilter({
      ...itemFilter,
      skip: newSkip,
    });
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
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              {!stockHdrs.docNo
                ? "Add Stock Take"
                : stockHdrs.docStatus === 0
                ? "Saved Stock Take"
                : stockHdrs.docStatus === 1
                ? "Review Stock Take"
                : stockHdrs.docStatus === 2
                ? "Approved Stock Take"
                : stockHdrs.docStatus === 3
                ? "Rejected Stock Take - Edit Required"
                : "Stock Take"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/stock-take?tab=all")}
              >
                Cancel
              </Button>
              {/* Save button - show when creating new or when status is Saved or Rejected */}
              {(!stockHdrs.docNo ||
                stockHdrs.docStatus === 0 ||
                stockHdrs.docStatus === 3) && (
                <Button
                  onClick={(e) => {
                    onSubmit(e, "save");
                  }}
                  disabled={saveLoading}
                  className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
                >
                  {saveLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              )}

              {/* Submit button - show when creating new or when status is Saved or Rejected */}
              {(!stockHdrs.docNo ||
                stockHdrs.docStatus === 0 ||
                stockHdrs.docStatus === 3) && (
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    onSubmit(e, "submit");
                  }}
                  disabled={postLoading}
                  className="cursor-pointer hover:bg-green-600 hover:text-white transition-colors duration-150"
                >
                  {postLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              )}

              {/* Approve button - only show when status is Submitted and user has approval rights */}
              {stockHdrs.docStatus === 1 && (
                <Button
                  variant="default"
                  onClick={(e) => {
                    onSubmit(e, "approve");
                  }}
                  className="cursor-pointer hover:bg-green-600 transition-colors duration-150"
                >
                  Approve
                </Button>
              )}

              {/* Reject button - only show when status is Submitted and user has approval rights */}
              {stockHdrs.docStatus === 1 && (
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    onSubmit(e, "reject");
                  }}
                  className="cursor-pointer hover:bg-red-700 transition-colors duration-150"
                >
                  Reject
                </Button>
              )}
            </div>
          </div>

          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Column */}
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
                      Store Code<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={userDetails.siteName}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* Second Column */}
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
                      Created By<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={stockHdrs.createUser}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs
            defaultValue="detail"
            className="w-full"
            // onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-1 lg:w-[200px]">
              <TabsTrigger value="detail">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="space-y-4">
              {(!stockHdrs.docNo ||
                stockHdrs.docStatus === 0 ||
                stockHdrs.docStatus === 3) && (
                <Card className={"p-0 gap-0"}>
                  <CardTitle className={"ml-4 pt-4 text-xl"}>
                    Select Items{" "}
                  </CardTitle>
                  <CardContent className="p-4 ">
                    {/* Search and Filter Section */}
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

                      {/* Existing checkboxes */}
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

                    {/* Items Table */}
                    <ItemTable
                      data={stockList}
                      loading={loading}
                      onQtyChange={(e, index) => handleCalc(e, index, "Qty")}
                      onPriceChange={(e, index) =>
                        handleCalc(e, index, "Price")
                      }
                      onAddToCart={addToCart}
                      currentPage={
                        Math.ceil(itemFilter.skip / itemFilter.limit) + 1
                      }
                      itemsPerPage={itemFilter.limit}
                      totalPages={Math.ceil(itemTotal / itemFilter.limit)}
                      onPageChange={handlePageChange}
                      emptyMessage="No items Found"
                      showBatchColumns={window?.APP_CONFIG?.BATCH_NO === "Yes"}
                      qtyLabel="Stock Take Qty"
                      priceLabel="Price"
                      costLabel="Cost"
                      // Stock Take specific props
                      enableSorting={true}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                      showVariance={true}
                      showRemarks={true}
                      onRemarksChange={handleRemarksChange}
                      canEdit={canEdit}
                      onBatchNoChange={(e, index) =>
                        handleCalc(e, index, "batchNo")
                      }
                      onExpiryDateChangeBatch={(e, index) =>
                        handleCalc(e, index, "expiryDate")
                      }
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
                     <TableHead>System Qty</TableHead>
                     <TableHead>Counted Qty</TableHead>
                     <TableHead className="font-semibold text-slate-700">
                       Variance
                     </TableHead>
                    {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                      <>
                        <TableHead>Batch No</TableHead>
                        <TableHead>Expiry Date</TableHead>
                      </>
                    )}
                    <TableHead>Remarks</TableHead>
                    {(!stockHdrs.docNo ||
                      stockHdrs.docStatus === 0 ||
                      stockHdrs.docStatus === 3) && (
                      <TableHead>Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                                     {loading ? (
                     <TableSpinner
                       colSpan={window?.APP_CONFIG?.BATCH_NO === "Yes" ? 10 : 8}
                     />
                   ) : cartData.length === 0 ? (
                     <TableRow>
                       <TableCell
                         colSpan={
                           window?.APP_CONFIG?.BATCH_NO === "Yes" ? 10 : 8
                         }
                         className="text-center py-10"
                       >
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
                             {item.docTtlqty || 0}
                           </TableCell>
                           <TableCell className="font-medium">
                             {item.docQty}
                           </TableCell>
                           <TableCell className={`font-semibold ${
                             ((parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0)) > 0 
                               ? 'text-green-600' 
                               : ((parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0)) < 0 
                                 ? 'text-red-600' 
                                 : 'text-slate-700'
                           }`}>
                             {((parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0)).toFixed(2)}
                           </TableCell>
                          {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                            <>
                              <TableCell>{item?.docBatchNo ?? "-"}</TableCell>
                              <TableCell>
                                {format_Date(item.docExpdate)}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{item.itemRemark}</TableCell>

                          {(!stockHdrs.docNo ||
                            stockHdrs.docStatus === 0 ||
                            stockHdrs.docStatus === 3) && (
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
                                             {/* Totals Row */}
                       <TableRow className="bg-slate-100 font-medium">
                         <TableCell
                           colSpan={3}
                           className="text-right text-slate-700"
                         >
                           Totals:
                         </TableCell>
                         <TableCell className="text-slate-700">
                           {cartData.reduce((sum, item) => sum + (parseFloat(item.docTtlqty) || 0), 0).toFixed(2)}
                         </TableCell>
                         <TableCell className="text-slate-700">
                           {cartData.reduce((sum, item) => sum + (parseFloat(item.docQty) || 0), 0).toFixed(2)}
                         </TableCell>
                         <TableCell className="font-semibold text-slate-700">
                           {cartData.reduce((sum, item) => {
                             const variance = (parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0);
                             return sum + variance;
                           }, 0).toFixed(2)}
                         </TableCell>
                         {window?.APP_CONFIG?.BATCH_NO === "Yes" ? (
                           <TableCell colSpan={4} />
                         ) : (
                           <TableCell colSpan={2} />
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

export default AddTake;
