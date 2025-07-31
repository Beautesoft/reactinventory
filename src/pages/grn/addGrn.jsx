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
// import moment from "moment";
import moment from "moment-timezone";
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
  }) => {
    const [batchOptions, setBatchOptions] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isExpiryReadOnly, setIsExpiryReadOnly] = useState(false);
    const [newBatchNo, setNewBatchNo] = useState("");
    const [useExistingBatch, setUseExistingBatch] = useState(true);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);

    // Reset states when dialog closes
    useEffect(() => {
      if (!showEditDialog) {
        setSelectedBatch(null);
        setNewBatchNo("");
        setUseExistingBatch(true);
        setIsExpiryReadOnly(false);
        setBatchOptions([]);
        setValidationErrors([]);
      }
    }, [showEditDialog]);

    useEffect(() => {
      if (showEditDialog && editData?.itemcode) {
        setIsLoadingBatches(true);
        // Call getBatches when dialog opens
        const filter = {
          where: {
            itemCode: editData.itemcode,
            siteCode: JSON.parse(localStorage.getItem("userDetails"))?.siteCode,
            uom: editData.docUom,
          },
        };

        apiService
          .get(`ItemBatches${buildFilterQuery(filter)}`)
          .then((batches) => {
            // Filter out items with empty or null batchNo
            const validBatches = batches.filter(
              (item) => item.batchNo && item.batchNo.trim() !== ""
            );

            // Remove duplicates based on batchNo
            const uniqueBatches = validBatches.reduce((acc, current) => {
              const exists = acc.find(
                (item) => item.batchNo === current.batchNo
              );
              if (!exists) acc.push(current);
              return acc;
            }, []);

            const formattedOptions = uniqueBatches.map((item) => ({
              value: item.batchNo,
              label: item.batchNo,
              expDate: item.expDate,
            }));

            setBatchOptions(formattedOptions);

            // If there's an existing batch number, try to find and select it
            if (editData.docBatchNo) {
              const existingBatch = formattedOptions.find(
                (opt) => opt.value === editData.docBatchNo
              );
              if (existingBatch) {
                setSelectedBatch(existingBatch);
                setUseExistingBatch(true);
                // Only make expiry readonly if there's a valid expiry date
                setIsExpiryReadOnly(!!existingBatch.expDate);
              } else {
                setNewBatchNo(editData.docBatchNo);
                setUseExistingBatch(false);
                setIsExpiryReadOnly(false);
              }
            }
          })
          .catch((error) => {
            console.error("Error fetching batches:", error);
            setBatchOptions([]);
          })
          .finally(() => {
            setIsLoadingBatches(false);
          });
      }
    }, [showEditDialog]);

    const handleExistingBatchChange = (value) => {
      const selected = batchOptions.find((opt) => opt.value === value);
      setSelectedBatch(selected);
      setNewBatchNo("");
      setUseExistingBatch(true);

      if (selected && selected.expDate) {
        // If batch exists in options and has expiry date, set it and make readonly
        const formattedDate = selected.expDate.split("T")[0]; // Convert to yyyy-MM-dd format
        onEditCart({ target: { value: formattedDate } }, "docExpdate");
        editData.docExpdate = formattedDate;
        setIsExpiryReadOnly(true);
      } else {
        // If batch doesn't exist or has no expiry date, allow manual entry
        setIsExpiryReadOnly(false);
      }

      onEditCart({ target: { value } }, "docBatchNo");
    };

    const handleNewBatchChange = (e) => {
      const value = e.target.value;
      // Limit to 20 characters
      if (value.length <= 20) {
        setNewBatchNo(value);
        setSelectedBatch(null);
        setUseExistingBatch(false);
        setIsExpiryReadOnly(false);
        onEditCart({ target: { value } }, "docBatchNo");
      }
    };

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

      // Validate batch number only if batch functionality is enabled
      if (window?.APP_CONFIG?.BATCH_NO === "Yes") {
        if (useExistingBatch && !selectedBatch?.value) {
          errors.push("Please select an existing batch");
        } else if (!useExistingBatch && !newBatchNo.trim()) {
          errors.push("Please enter a new batch number");
        }

        // Validate expiry date only if batch functionality is enabled
        if (!editData?.docExpdate) {
          errors.push("Expiry date is required");
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      const updatedEditData = {
        ...editData,
        useExistingBatch,
        docBatchNo: useExistingBatch ? selectedBatch?.value : newBatchNo,
      };

      onSubmit(updatedEditData);
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
              Modify item details
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            {/* Always show Batch No, Expiry Date, and Remarks */}
            {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="batchNo">Batch No</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useExisting"
                        checked={useExistingBatch}
                        onCheckedChange={(checked) => {
                          setUseExistingBatch(checked);
                          if (checked) {
                            setNewBatchNo("");
                          } else {
                            setSelectedBatch(null);
                            onEditCart({ target: { value: "" } }, "docBatchNo");
                          }
                        }}
                      />
                      <label htmlFor="useExisting" className="text-sm">
                        Use Existing Batch
                      </label>
                    </div>
                    {useExistingBatch ? (
                      <div className="relative">
                        <Select
                          value={selectedBatch?.value || ""}
                          onValueChange={handleExistingBatchChange}
                          disabled={isLoadingBatches}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isLoadingBatches
                                  ? "Loading batches..."
                                  : "Select existing batch"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingBatches ? (
                              <div className="flex items-center justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : batchOptions.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No existing batches found
                              </div>
                            ) : (
                              batchOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Input
                        value={newBatchNo}
                        onChange={handleNewBatchChange}
                        placeholder="Enter new batch number"
                        className="w-full"
                        maxLength={20}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={editData?.docExpdate || ""}
                    onChange={(e) => onEditCart(e, "docExpdate")}
                    className="w-full"
                    readOnly={isExpiryReadOnly}
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
            <Button onClick={handleSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

function AddGrn({ docData }) {
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
  console.log(window?.APP_CONFIG?.BATCH_SNO, "bnoooo");
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
  const [originalStockList, setOriginalStockList] = useState([]);
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const [batchOptions, setBatchOptions] = useState([]);
  const [batches, setBatches] = useState([]);

  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "GRN",
    splyCode: "",
    docNo: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
  });

  const [itemFilter, setItemFilter] = useState({
    // where: {
    //   movCode: "GRN",
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
    // docDate: new Date().toISOString(),
    docLines: "",
    docStatus: 0,
    supplyNo: "",
    docRef1: "",
    docRef2: "",
    docTerm: "",
    storeNo: userDetails?.siteCode,
    docRemk1: "",
    postDate: "",
    deliveryDate: "",
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

  // Add these state declarations near other states
  const [filters, setFilters] = useState({
    brand: [],
    range: [],
    department: ["RETAIL PRODUCT", "SALON PRODUCT"],
  });

  // Add apply filters function
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

  // Add this function to help with debugging
  const logFilterState = () => {
    console.log("Current Filters:", {
      brand: filters.brand,
      range: filters.range,
      department: filters.department,
    });
    console.log("Original List Length:", originalStockList.length);
    console.log("Filtered List Length:", stockList.length);
  };

  // Update the filter handlers to include logging
  const handleBrandChange = (selected) => {
    setFilters((prev) => ({
      ...prev,
      brand: selected,
    }));
  };

  const handleRangeChange = (selected) => {
    setFilters((prev) => ({
      ...prev,
      range: selected,
    }));
  };

  const handleDepartmentChange = (department) => {
    setLoading(true);

    // Update filters state
    const newFilters = {
      ...filters,
      department: filters.department.includes(department)
        ? filters.department.filter((d) => d !== department)
        : [...filters.department, department],
    };
    setFilters(newFilters);

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    console.log(newFilters, "fil0");

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
      console.log(item, "item");

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
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    setLoading(false);
  };

  // Add this effect to help with debugging
  // useEffect(() => {
  //   if (originalStockList.length > 0) {
  //     console.log("Sample Item Structure:", originalStockList[0]);
  //   }
  // }, [originalStockList]);

  // Add this near other state declarations
  const [searchTimer, setSearchTimer] = useState(null);

  const handleSearch = (e) => {
    const searchValue = e.target.value.trim().toLowerCase();

    console.log(searchValue, "sv");

    // Clear any existing timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      console.log(searchValue, "sv0");

      setOriginalStockList(stockList);
    }

    if (!searchValue) {
      // If search is empty, restore original data
      console.log(searchValue, "sv1");

      setStockList(originalStockList);
      setLoading(false);

      return;
    }

    setLoading(true);

    // Set new timer
    const timer = setTimeout(() => {
      const filteredList = originalStockList.filter((item) => {
        console.log(searchValue, "sv2");

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

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setPageLoading(true);

      try {
        if (urlDocNo) {
          // If editing existing document
          const filter = {
            where: {
              movCode: "GRN",
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
          await getSupplyList(stockHdrs.supplyNo);
          setPageLoading(false);
          setInitial(false);
        } else {
          // If creating new document
          // await getDocNo();
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
        // docDate: data.docDate,

        docStatus: data.docStatus,
        supplyNo: data.supplyNo,
        docRef1: data.docRef1,
        docRef2: data.docRef2,
        docTerm: data.docTerm,
        storeNo: data.storeNo,
        docRemk1: data.docRemk1,
        deliveryDate: moment(data.recExpect).format("YYYY-MM-DD"),
        postDate: data.postDate,
        docLines: data.docLines,
        // postDate: data.postDate
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

  const getBatches = async (filter) => {
    try {
      const [batches] = await Promise.all([
        apiService.get(`ItemBatches${buildFilterQuery(filter)}`),
      ]);

      // Filter out items with empty or null batchNo
      const validBatches = batches.filter(
        (item) => item.batchNo && item.batchNo.trim() !== ""
      );

      // Remove duplicates based on batchNo
      const uniqueBatches = validBatches.reduce((acc, current) => {
        const exists = acc.find((item) => item.batchNo === current.batchNo);
        if (!exists) acc.push(current);
        return acc;
      }, []);

      setBatches(uniqueBatches);

      const formattedOptions = uniqueBatches.map((item) => ({
        value: item.batchNo,
        label: item.expDate,
      }));

      setBatchOptions(formattedOptions);
    } catch (error) {
      console.error("Error fetching batch options:", error);
    }
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
          // Price: Number(item?.item_Price),
          // Price: item?.Price,

          docAmt: null,
        }));
        console.log(updatedRes, "updatedRes");
        console.log(count, "count");

        setStockList(updatedRes);
        setOriginalStockList(updatedRes);
        setItemTotal(count);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error fetching stock details:", err);
        toast.error("Failed to fetch stock details");
      });
  };

  const getSupplyList = async (supplycode) => {
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

      if (!urlDocNo) {
        console.log("ddd1");
        setStockHdrs((prev) => ({
          ...prev,
          supplyNo: supplycode ? supplycode : supplyOption[0]?.value || null,
        }));
      }
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
      const codeDesc = "Goods Receive Note";
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
        controldescription: "Goods Receive Note",
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
      setLoading(false);
    } catch (err) {
      console.error("Error fetching stock header details:", err);
    }
  };

  const postStockDetails = async (cart) => {
    try {
      console.log(cart, "cart");

      // First, find items to be deleted
      const itemsToDelete = cartItems.filter(
        (cartItem) => !cart.some((item) => item.docId === cartItem.docId)
      );

      // Group items by operation type
      const itemsToUpdate = cart.filter((item) => item.docId);
      const itemsToCreate = cart.filter((item) => !item.docId);
      console.log(itemsToDelete, "itemsToDelete");

      // Execute deletions first (in parallel)
      if (itemsToDelete.length > 0) {
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
    supplier = supplierInfo,
    type = "save"
  ) => {
    const errors = [];

    // Document Header Validations
    if (!hdrs.docNo) errors.push("Document number is required");
    if (!hdrs.docDate) errors.push("Document date is required");
    if (!hdrs.supplyNo) errors.push("Supply number is required");
    if (!hdrs.docTerm) errors.push("Document term is required");
    if (!hdrs.deliveryDate) errors.push("Delivery date is required");

    // Cart Validation
    if (cart.length === 0) errors.push("Cart shouldn't be empty");

    // Batch and Expiry Date Validation - Only for post and when batch functionality is enabled
    if (type === "post" && window?.APP_CONFIG?.BATCH_NO === "Yes") {
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

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationDialog(true);
      return false;
    }

    return true;
  };

  // const handleDateChange = (e, type) => {
  //   const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  //   if (type === "deliveryDate") {
  //     let deliveryDate = moment.tz(e.target.value, tz).valueOf();
  //     let docDate = moment.tz(stockHdrs.docDate, tz).valueOf();
  //     if (docDate > deliveryDate) {
  //       showError("DeliveryDate date should be greater than doc date");
  //       return;
  //     }
  //     console.log(deliveryDate, docDate, "date");
  //   }
  //   setStockHdrs((prev) => ({
  //     ...prev,
  //     [type]: e.target.value,
  //   }));
  // };
  const handleDateChange = (e, type) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (type === "deliveryDate") {
      let deliveryDate = moment.tz(e.target.value, tz).valueOf();
      let docDate = moment.tz(stockHdrs.docDate, tz).valueOf();
      if (deliveryDate > docDate) {
        showError(
          "Delivery Date should be less than or equal to Doc Create Date"
        );
        return;
      }
      console.log(deliveryDate, docDate, "date");
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

  const handleEditSubmit = useCallback(
    (updatedEditData) => {
      if (!updatedEditData.docQty || !updatedEditData.docPrice) {
        toast.error("Quantity and Price are required");
        return;
      }

      console.log(updatedEditData, "updatedEditData");

      const updatedItem = {
        ...updatedEditData,
        docQty: Number(updatedEditData.docQty),
        docPrice: Number(updatedEditData.docPrice),
        docAmt:
          Number(updatedEditData.docQty) * Number(updatedEditData.docPrice),
      };

      setCartData((prev) =>
        prev.map((item, index) => (index === editingIndex ? updatedItem : item))
      );

      setShowEditDialog(false);
      setEditData(null);
      setEditingIndex(null);
      toast.success("Item updated successfully");
    },
    [editingIndex]
  );

  const editPopup = (item, index) => {
    setIsBatchEdit(false);
    setEditData({
      ...item,
      docQty: Number(item.docQty) || 0,
      docPrice: Number(item.docPrice) || 0,
      docExpdate: item.docExpdate || "",
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

  const addToCart = (index, item) => {
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const amount = Number(item.Qty) * Number(item.Price);

    const newCartItem = {
      id: cartData.length + 1,
      // docId: cartData.length + 1,
      docAmt: amount,
      docNo: stockHdrs?.docNo || "",
      movCode: "GRN",
      movType: "GRN",
      docLineno: cartData.length + 1,
      docDate: stockHdrs.docDate,
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
      createDate: stockHdrs.docDate,
      docUom: item.uom || "",
      docExpdate: item.expiryDate || "",
      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: item.range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: item?.itemRemark || null,
      itemprice: 0,
      docBatchNo: null,
    };
    // console.log(item.itemUom,cartData[0].docUom)

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

  const createTransactionObject = (item, docNo, storeNo) => {
    console.log(item, "trafr object");
    const today = new Date();
    const timeStr =
      ("0" + today.getHours()).slice(-2) +
      ("0" + today.getMinutes()).slice(-2) +
      ("0" + today.getSeconds()).slice(-2);

    return {
      id: null,
      trnPost: today.toISOString().split("T")[0],
      trnDate: stockHdrs.docDate,
      postTime: timeStr,
      aperiod: null,
      itemcode: item.itemcode + "0000",
      storeNo: storeNo,
      tstoreNo: null,
      fstoreNo: null,
      trnDocno: docNo,
      trnType: "GRN",
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
      movType: "GRN",
      itemBatch: item.docBatchNo,
      itemBatchCost: item.docPrice,
      stockIn: null,
      transPackageLineNo: null,
      docExpdate: item.docExpdate,
      useExistingBatch: item.useExistingBatch,
      // docExpdate: process.env.REACT_APP_EXPIRY_DATE === "Yes"
      //   ? item.docExpdate
      //     ? new Date(item.docExpdate).toISOString().split('T')[0] + " 00:00:00"
      //     : null
      //   : null
    };
  };

  const onSubmit = async (e, type) => {
    e?.preventDefault();

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
          docNo,
          id: index + 1, // Use sequential index + 1 for new items
        }));
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlData);

        // Move validation here after docNo is set
        if (!validateForm(hdr, details, supplierInfo, type)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }
      } else {
        // Use existing docNo for updates and posts
        docNo = urlDocNo || stockHdrs.docNo;

        // Validate for updates and posts
        if (!validateForm(stockHdrs, cartData, supplierInfo, type)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }
      }

      // Create data object using hdr instead of stockHdrs
      let data = {
        docNo: hdr.docNo,
        movCode: "GRN",
        movType: "GRN",
        storeNo: hdr.storeNo,
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
        createDate:
          type === "post" && urlDocNo
            ? hdr.createDate
            : new Date().toISOString(),
      };

      // Handle header operations based on type and urlDocNo
      if (type === "save" && !urlDocNo) {
        await postStockHdr(data, "create");
        addNewControlNumber(controlData);
      } else if (type === "save" && urlDocNo) {
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

        let batchId;
        const stktrns = details.map((item) =>
          createTransactionObject(item, docNo, userDetails.siteCode)
        );
        // 6) Loop through each line to fetch ItemOnQties and update trnBal* fields in Details
        const itemRequests = stktrns.map((d) => {
          const filter = {
            where: {
              and: [
                { itemcode: d.itemcode },
                { uom: d.itemUom },
                { sitecode: userDetails.siteCode },
              ],
            },
          };

          const url = `Itemonqties?filter=${encodeURIComponent(
            JSON.stringify(filter)
          )}`;
          return apiService
            .get(url)
            .then((resp) => ({ resp, d }))
            .catch((error) => ({ error, d }));
        });

        const results = await Promise.all(itemRequests);

        for (const { resp, d, error } of results) {
          if (error) {
            const errorLog = {
              trnDocNo: docNo,
              loginUser: userDetails.username,
              siteCode: userDetails.siteCode,
              logMsg: `Itemonqties API failed for ${d.itemcode}: ${error.message}`,
              createdDate: new Date().toISOString().split("T")[0],
            };
            // await apiService.post("Inventorylogs", errorLog);
            continue;
          }

          if (resp.length) {
            const on = resp[0];
            d.trnBalqty = (
              Number(d.trnBalqty || 0) + Number(on.trnBalqty || 0)
            ).toString();
            d.trnBalcst = (
              Number(d.trnBalcst || 0) + Number(on.trnBalcst || 0)
            ).toString();
            // d.itemBatchCost = (on.batchCost || 0).toString();
            d.itemBatchCost = (d.itemBatchCost || 0).toString();
          } else {
            const errorLog = {
              trnDocNo: docNo,
              loginUser: userDetails.username,
              siteCode: userDetails.siteCode,
              logMsg: `No data found in Itemonqties for ${d.itemcode}`,
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

          // const data=

          await apiService.post("Stktrns", stktrns);

          // 9) Per-item log and (optional) BatchSNO GET
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
            // Optionally call Sequoia batchSNO
            // if (process.env.REACT_APP_BATCH_SNO === "Yes") {
            //   const url = `${process.env.REACT_APP_SEQUOIA_URI}api/postItemBatchSno?docNo=${docNo}&itemCode=${d.itemcode}&uom=${d.itemUom}&itemsiteCode=${userDetails.siteCode}&Qty=${d.trnQty}&ExpDate=${d.docExpdate}`;
            //   await fetch(url); // Fire-and-forget
            // }
            // await apiService.post("Inventorylogs", insertLog);
          }

          // 10) Update ItemBatches quantity
          for (const d of stktrns) {
            // const batchUpdate = {
            //   itemcode: d.itemcode, // Add 0000 suffix for inventory
            //   sitecode: userDetails.siteCode,
            //   uom: d.itemUom,
            //   qty: Number(d.trnQty),
            //   batchcost: Number(d.trnCost),
            //   batchNo:d.itemBatch
            // };

            if (window?.APP_CONFIG?.BATCH_SNO === "Yes") {
              const params = new URLSearchParams({
                docNo: d.trnDocno,
                itemCode: d.itemcode,
                uom: d.itemUom,
                itemsiteCode: d.storeNo,
                Qty: d.trnQty,
                ExpDate: d?.docExpdate ? d?.docExpdate : null,
                // batchNo:d.itemBatch,
                // batchSNo: d.itemBatch,
                // itemsiteCode: userDetails.siteCode,
                batchCost: Number(d.trnCost),

                // Make sure it's in correct format (e.g., "yyyy-MM-dd")
              });

              const payload = {
                itemCode: d.itemcode?.replace(/0000$/, ""), // Remove 0000 suffix if present
                siteCode: d.storeNo,
                batchSNo: d.itemBatch, // or d.batchSNo if that's the correct field
                DocNo: d.trnDocno,
                DocOutNo: "", // Set this if you have an outbound doc number, else leave as empty string
                uom: d.itemUom,
                availability: true, // or set based on your logic
                expDate: d.docExpdate
                  ? new Date(d.docExpdate).toISOString()
                  : null,
                batchCost: Number(d.trnCost) || 0,
              };

              try {
                await apiService1.get(
                  `api/postItemBatchSno?${params.toString()}`
                );
                // await apiService.post(`ItemBatchSnos`, payload);
              } catch (err) {
                const errorLog = {
                  trnDocNo: d.trnDocno,
                  itemCode: d.itemcode,
                  loginUser: userDetails.username,
                  siteCode: userDetails.siteCode,
                  logMsg: `api/postItemBatchSno error: ${err.message}`,
                  createdDate: new Date().toISOString().split("T")[0],
                };
                // Optionally log the error
                // await apiService.post("Inventorylogs", errorLog);
              }
            }

            const trimmedItemCode = d.itemcode.replace(/0000$/, "");
            let batchUpdate;

            const batchFilter = {
              itemCode: trimmedItemCode,
              siteCode: userDetails.siteCode,
              uom: d.itemUom,
              batchNo: d.itemBatch,
            };
            // const fil={
            //   where:
            //   {
            //     itemCode: trimmedItemCode,
            //     siteCode: userDetails.siteCode,
            //     uom: d.itemUom,
            //     batchNo: d.itemBatch

            //   }

            // }

            const fil = {
              where: {
                and: [
                  { itemCode: trimmedItemCode },
                  { siteCode: userDetails.siteCode },
                  { uom: d.itemUom },
                  { batchNo: d.itemBatch },
                ],
              },
            };

            if (window?.APP_CONFIG?.BATCH_NO === "Yes") {
              if (d.useExistingBatch) {
                // For existing batches, first get the current batch data
                // await apiService.get(`ItemBatches?filter=${encodeURIComponent(JSON.stringify(fil))}`)
                //   .then((res) => {
                //     const batchData = res[0];
                //     if (batchData) {
                //       batchUpdate = {
                //         itemCode: batchData.itemCode || trimmedItemCode,
                //         siteCode: batchData.siteCode,
                //         uom: batchData.uom,
                //         qty: Number(batchData.qty) + Number(d.trnQty),
                //         batchCost: Number(batchData.batchCost) + Number(d.trnCost),
                //         batchNo: batchData.batchNo,
                //         expDate: d?.docExpdate ? d?.docExpdate : batchData.expDate
                //       };
                //     }
                //   })
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

                                  batchUpdate = {
                    itemcode: trimmedItemCode,
                    sitecode: userDetails.siteCode,
                    uom: d.itemUom,
                    qty: Number(d.trnQty),
                    batchcost: Number(d.trnCost),
                    ...(window?.APP_CONFIG?.BATCH_NO === "Yes" && {
                      batchno: d.itemBatch,
                    }),
                    // expDate: d?.docExpdate ? d?.docExpdate : null
                  };

                await apiService
                  .post("ItemBatches/updateqty", batchUpdate)
                  // .post(`ItemBatches/update?where=${encodeURIComponent(JSON.stringify(batchFilter))}`, batchUpdate)
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
              } else {
                // For new batches, create a new batch record
                batchUpdate = {
                  itemCode: trimmedItemCode,
                  siteCode: userDetails.siteCode,
                  uom: d.itemUom,
                  qty: Number(d.trnQty),
                  batchCost: Number(d.trnCost),
                  batchNo: d.itemBatch,
                  expDate: d?.docExpdate ? d?.docExpdate : null,
                };

                await apiService
                  .post(`ItemBatches`, batchUpdate)
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
              }
            }
            else{
              batchUpdate = {
                itemcode: trimmedItemCode,
                sitecode: userDetails.siteCode,
                uom: d.itemUom,
                qty: Number(d.trnQty),
                batchcost: Number(d.trnCost),

                // expDate: d?.docExpdate ? d?.docExpdate : null
              };

            await apiService
              .post("ItemBatches/updateqty", batchUpdate)
              // .post(`ItemBatches/update?where=${encodeURIComponent(JSON.stringify(batchFilter))}`, batchUpdate)
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
      }

      toast.success(
        type === "post"
          ? "Posted successfully"
          : urlDocNo
          ? "Updated successfully"
          : "Created successfully"
      );
      navigate("/goods-receive-note?tab=all");
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
    // console.log(newPage, "newPage");
    // const newLimit = itemFilter.limit;
    // const newSkip = (newPage - 1) * newLimit;
    // setItemFilter({
    //   ...itemFilter,
    //   skip: newSkip,
    // });

    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
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
              {urlStatus == 7
                ? "View Goods Receive Note"
                : urlStatus == 0
                ? "Update Goods Receive Note"
                : "Add Goods Receive Note"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/goods-receive-note?tab=all")}
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

          {/* Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <Label>GR Ref 1</Label>
                    <Input
                      placeholder="Enter GR Ref 1"
                      disabled={urlStatus == 7}
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

                {/* Second Column */}
                <div className="space-y-4">
                  <div className="space-y-2 w-full">
                    <Label>
                      Supply No<span className="text-red-500">*</span>
                    </Label>
                    <Select
                      disabled={urlStatus == 7}
                      value={stockHdrs.supplyNo}
                      onValueChange={(value) =>
                        setStockHdrs((prev) => ({ ...prev, supplyNo: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Delivery Date<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      disabled={urlStatus == 7}
                      type="date"
                      // value={stockHdrs.postDate}
                      value={stockHdrs.deliveryDate}
                      onChange={(e) => handleDateChange(e, "deliveryDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GR Ref 2</Label>
                    <Input
                      disabled={urlStatus == 7}
                      placeholder="Enter GR Ref 2"
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

                {/* Third Column */}
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
                      Term<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      disabled={urlStatus == 7}
                      placeholder="Enter term"
                      value={stockHdrs.docTerm}
                      onChange={(e) =>
                        setStockHdrs((prev) => ({
                          ...prev,
                          docTerm: e.target.value,
                        }))
                      }
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
              </div>

              {/* Additional Row for Created By and Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label>
                    Created By<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={userDetails.username}
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
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs
            defaultValue={activeTab}
            className="w-full"
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="detail">Details</TabsTrigger>
              <TabsTrigger value="supplier">Supplier Info</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="space-y-4">
              {urlStatus != 7 && (
                <Card className={"p-0 gap-0"}>
                  <CardTitle className={"ml-4 pt-4 text-xl"}>
                    Select Items{" "}
                  </CardTitle>
                  <CardContent className="p-4 ">
                    {/* Search and Filter Section */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 max-w-[430px]">
                        <Input
                          placeholder="Search items..."
                          onChange={handleSearch}
                        />
                      </div>

                      <div className="flex-1 mt-2">
                        <MultiSelect
                          options={brandOption}
                          selected={filters.brand}
                          onChange={handleBrandChange}
                          placeholder="Filter by brand..."
                        />
                      </div>

                      <div className="flex-1 mt-2">
                        <MultiSelect
                          options={rangeOptions}
                          selected={filters.range}
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
                          checked={filters.department.includes(
                            "RETAIL PRODUCT"
                          )}
                          onCheckedChange={() =>
                            handleDepartmentChange("RETAIL PRODUCT")
                          }
                        />
                        <label htmlFor="retail" className="text-sm">
                          Retail Product
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="salon"
                          className="w-5 h-5"
                          checked={filters.department.includes("SALON PRODUCT")}
                          onCheckedChange={() =>
                            handleDepartmentChange("SALON PRODUCT")
                          }
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
                      onExpiryDateChange={(e, index) =>
                        handleCalc(e, index, "expiryDate")
                      }
                      onAddToCart={(index, item) => addToCart(index, item)}
                      currentPage={pagination.page}
                      itemsPerPage={6}
                      totalPages={Math.ceil(itemTotal / pagination.limit)}
                      onPageChange={handlePageChange}
                      showBatchColumns={window?.APP_CONFIG?.BATCH_NO === "Yes"}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="supplier" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  {/* Attention To */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Attn To</Label>
                      <Input
                        value={supplierInfo.Attn}
                        onChange={(e) => handleSupplierChange(e, "Attn")}
                        placeholder="Enter attention to"
                      />
                    </div>
                  </div>

                  {/* Address and Ship To Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-4">
                      <Label>Address</Label>
                      <div className="space-y-2">
                        <Input
                          value={supplierInfo.line1}
                          onChange={(e) => handleSupplierChange(e, "line1")}
                          placeholder="Address Line 1"
                        />
                        <Input
                          value={supplierInfo.line2}
                          onChange={(e) => handleSupplierChange(e, "line2")}
                          placeholder="Address Line 2"
                        />
                        <Input
                          value={supplierInfo.line3}
                          onChange={(e) => handleSupplierChange(e, "line3")}
                          placeholder="Address Line 3"
                        />
                        <Input
                          value={supplierInfo.pcode}
                          onChange={(e) => handleSupplierChange(e, "pcode")}
                          placeholder="Post Code"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Ship To Address</Label>
                      <div className="space-y-2">
                        <Input
                          value={supplierInfo.sline1}
                          onChange={(e) => handleSupplierChange(e, "sline1")}
                          placeholder="Ship To Address Line 1"
                        />
                        <Input
                          value={supplierInfo.sline2}
                          onChange={(e) => handleSupplierChange(e, "sline2")}
                          placeholder="Ship To Address Line 2"
                        />
                        <Input
                          value={supplierInfo.sline3}
                          onChange={(e) => handleSupplierChange(e, "sline3")}
                          placeholder="Ship To Address Line 3"
                        />
                        <Input
                          value={supplierInfo.spcode}
                          onChange={(e) => handleSupplierChange(e, "spcode")}
                          placeholder="Ship To Post Code"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Move the Add Item Details button to the top right above the table */}
          {cartData.length > 0 && (
            <div className="flex justify-end my-5">
              {selectedRows.length > 0 && (
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
                {urlStatus != 7 && (
                  <TableHeader className="bg-slate-100">
                    <TableRow className="border-b border-slate-200">
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
                      {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                        <>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Batch No</TableHead>
                        </>
                      )}
                      <TableHead>Remarks</TableHead>
                      {urlStatus != 7 && <TableHead>Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                )}
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
                          {urlStatus != 7 && (
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
                          )}
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
                          {window?.APP_CONFIG?.BATCH_NO === "Yes" && (
                            <>
                              <TableCell>{format_Date(item.docExpdate)}</TableCell>
                              <TableCell>{item?.docBatchNo ?? "-"}</TableCell>
                            </>
                          )}
                          <TableCell>{item.itemRemark ?? "-"}</TableCell>

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
                      {/* Totals Row */}
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
                        <TableCell />
                        <TableCell className="font-semibold text-slate-700">
                          {calculateTotals(cartData).totalAmt.toFixed(2)}
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
        onSubmit={isBatchEdit ? handleBatchEditSubmit : handleEditSubmit}
        isBatchEdit={isBatchEdit}
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

export default AddGrn;
