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
  Edit,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import moment from "moment-timezone";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import { poApi } from "@/services/poApi";

import {
  buildCountObject,
  buildCountQuery,
  buildFilterObject,
  buildFilterQuery,
  format_Date,
  queryParamsGenerate,
  getConfigValue,
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
      totalQty: acc.totalQty + Number(item.podQty || 0),
      totalFoc: acc.totalFoc + Number(item.podFocqty || 0),
      totalDisc: acc.totalDisc + Number(item.podDiscamt || 0),
      totalAmt: acc.totalAmt + Number(item.podAmt || 0),
    }),
    { totalQty: 0, totalFoc: 0, totalDisc: 0, totalAmt: 0 }
  );
};

// Helper function to calculate default expiry date
const calculateDefaultExpiryDate = () => {
  const defaultDays = getConfigValue('DEFAULT_EXPIRY_DAYS') || 365;
  const currentDate = new Date();
  const expiryDate = new Date(currentDate);
  expiryDate.setDate(currentDate.getDate() + defaultDays);
  return expiryDate.toISOString().split("T")[0]; // Return in YYYY-MM-DD format
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
      if (showEditDialog && editData?.podItemcode) {
        setIsLoadingBatches(true);
        // Call getBatches when dialog opens
        const filter = {
          where: {
            itemCode: editData.podItemcode,
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
                // If existing batch has expiry date, make it read-only
                setIsExpiryReadOnly(!!existingBatch.expDate);
                // Update the useExistingBatch flag in editData
                onEditCart({ target: { value: true } }, "useExistingBatch");
              } else {
                setNewBatchNo(editData.docBatchNo);
                setUseExistingBatch(false);
                setIsExpiryReadOnly(false);
                // Update the useExistingBatch flag in editData
                onEditCart({ target: { value: false } }, "useExistingBatch");
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
      onEditCart({ target: { value: value } }, "docBatchNo");
      onEditCart({ target: { value: true } }, "useExistingBatch");

      // If existing batch has expiry date, make it read-only
      if (selected?.expDate) {
        setIsExpiryReadOnly(true);
        onEditCart({ target: { value: selected.expDate } }, "docExpdate");
      } else {
        setIsExpiryReadOnly(false);
      }
    };

    const handleNewBatchChange = (e) => {
      setNewBatchNo(e.target.value);
      setSelectedBatch(null);
      onEditCart(e, "docBatchNo");
      onEditCart({ target: { value: false } }, "useExistingBatch");
      setIsExpiryReadOnly(false);
    };

    const handleSubmit = () => {
      const errors = [];

      // Validate quantity
      if (!editData.podQty || editData.podQty <= 0) {
        errors.push("Quantity must be greater than 0");
      }

      // Validate price if user has permission
      if (userDetails?.isSettingViewPrice === "True") {
        if (!editData.podItemprice || editData.podItemprice <= 0) {
          errors.push("Price must be greater than 0");
        }
      }

      // Validate batch number if required
      if (getConfigValue('BATCH_NO') === "Yes") {
        if (!editData.docBatchNo || editData.docBatchNo.trim() === "") {
          errors.push("Batch number is required");
        }
      }

      // Validate expiry date if batch is required
      if (getConfigValue('BATCH_NO') === "Yes" && getConfigValue('EXPIRY_DATE') === "Yes") {
        if (!editData.docExpdate) {
          errors.push("Expiry date is required");
        }
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      setValidationErrors([]);
      onSubmit();
    };

    return (
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isBatchEdit ? "Batch Edit Items" : "Edit Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemcode">Item Code</Label>
                <Input
                  id="itemcode"
                  value={editData?.podItemcode || ""}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemdesc">Description</Label>
                <Input
                  id="itemdesc"
                  value={editData?.podItemdesc || ""}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uom">UOM</Label>
                <Input
                  id="uom"
                  value={editData?.docUom || ""}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  value={editData?.podQty || ""}
                  onChange={(e) => onEditCart(e, "podQty")}
                  min="0"
                  step="0.01"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              {userDetails?.isSettingViewPrice === "True" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                <Input
                    id="price"
                  type="number"
                    value={editData?.podItemprice || ""}
                    onChange={(e) => onEditCart(e, "podItemprice")}
                    min="0"
                    step="0.01"
                    disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="focqty">FOC Quantity</Label>
                <Input
                  id="focqty"
                  type="number"
                  value={editData?.podFocqty || ""}
                  onChange={(e) => onEditCart(e, "podFocqty")}
                  min="0"
                  step="0.01"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discper">Discount %</Label>
                <Input
                  id="discper"
                  type="number"
                  value={editData?.podDiscper || ""}
                  onChange={(e) => onEditCart(e, "podDiscper")}
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
            </div>

            {/* Batch Number and Expiry Date Section */}
            {getConfigValue('BATCH_NO') === "Yes" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="batchno">Batch Number</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useExistingBatch"
                      checked={useExistingBatch}
                      onCheckedChange={(checked) => {
                        setUseExistingBatch(checked);
                        onEditCart({ target: { value: checked } }, "useExistingBatch");
                        if (!checked) {
                          setSelectedBatch(null);
                          setNewBatchNo("");
                          onEditCart({ target: { value: "" } }, "docBatchNo");
                        }
                      }}
                      disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                    />
                    <Label htmlFor="useExistingBatch" className="text-sm">
                      Use existing batch
                    </Label>
                  </div>
                  {useExistingBatch ? (
                    <div className="space-y-2">
                      <Select
                        value={selectedBatch?.value || ""}
                        onValueChange={handleExistingBatchChange}
                        disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select existing batch" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingBatches ? (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Loading batches...
                            </div>
                          ) : batchOptions.length === 0 ? (
                            <div className="text-center py-2 text-gray-500">
                              No existing batches found
                            </div>
                          ) : (
                            batchOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
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
                      disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                    />
                  )}
              </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                    id="expiry"
                    type="date"
                    value={editData?.docExpdate || ""}
                    onChange={(e) => onEditCart(e, "docExpdate")}
                    className="w-full"
                    disabled={urlStatus == 7 || (useExistingBatch && selectedBatch?.expDate)}
                  />
                  {isExpiryReadOnly && (
                    <p className="text-xs text-blue-500">
                      Expiry date is auto-filled from existing batch
                    </p>
                  )}
                  {!useExistingBatch && (
                    <p className="text-xs text-gray-500">
                      Default expiry date is set to {getConfigValue('DEFAULT_EXPIRY_DAYS') || 365} days from today
                    </p>
                  )}
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
                disabled={
                  urlStatus == 7 &&
                  userDetails?.isSettingPostedChangePrice !== "True"
                }
                />
              </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="cursor-pointer">
                Cancel
              </Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

function AddPO() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const urlStatus = searchParams.get("status") || 0;

  // State management
  const [activeTab, setActiveTab] = useState("detail");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [itemTotal, setItemTotal] = useState(0);
  const [filteredItemTotal, setFilteredItemTotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 1000);
  const [supplyOptions, setSupplyOptions] = useState([]);
  const [stockList, setStockList] = useState([]);
  const [originalStockList, setOriginalStockList] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [batches, setBatches] = useState([]);

  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "PO",
    splyCode: "",
    docNo: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
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

  const [formData, setFormData] = useState({
    poNo: "",
    itemsiteCode: userDetails?.siteCode || "",
    suppCode: "",
    poRef: "",
    poUser: userDetails?.userName || "",
    poDate: moment().format("YYYY-MM-DD"),
    poStatus: "Open",
    poTtqty: 0,
    poTtfoc: 0,
    poTtdisc: 0,
    poTtamt: 0,
    poAttn: "",
    poRemk1: "",
    poRemk2: "",
    contactPerson: "",
    terms: "",
    expectedDeliveryDate: "",
    // Billing Address
    poBname: "",
    poBaddr1: "",
    poBaddr2: "",
    poBaddr3: "",
    poBpostcode: "",
    poBstate: "",
    poBcity: "",
    poBcountry: "",
    // Delivery Address
    poDaddr1: "",
    poDaddr2: "",
    poDaddr3: "",
    poDpostcode: "",
    poDstate: "",
    poDcity: "",
    poDcountry: "",
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

  // Add state for batch edit
  const [selectedRows, setSelectedRows] = useState([]);
  const [isBatchEdit, setIsBatchEdit] = useState(false);

  // Add sorting state for ItemTable
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Add search timer state
  const [searchTimer, setSearchTimer] = useState(null);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadPOData();
    } else {
      initializeData();
    }
  }, [id]);

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      const res = await apiService.get("ItemSupplies");
      const options = res
        .filter((item) => item.splyCode)
        .map((item) => ({
          label: item.supplydesc,
          value: item.splyCode,
        }));
      setSupplyOptions(options);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Initialize data for new PO
  const initializeData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadSuppliers(),
        generatePONumber(),
        getOptions(),
      ]);
    } catch (err) {
      console.error("Error initializing data:", err);
      toast.error("Error initializing data");
    } finally {
      setPageLoading(false);
    }
  };

  // Generate PO number
  const generatePONumber = async () => {
    try {
      const poNo = await poApi.getNextPONumber(userDetails?.siteCode);
        setFormData(prev => ({ ...prev, poNo }));
    } catch (err) {
      console.error("Error generating PO number:", err);
      toast.error("Error generating PO number");
    }
  };

  // Load PO data for editing
  const loadPOData = async () => {
    setPageLoading(true);
    try {
      const [po, items] = await Promise.all([
        poApi.getPO(id),
        poApi.getPOLineItems(id)
      ]);

      if (po) {
        setFormData({
          poNo: po.poNo,
          itemsiteCode: po.itemsiteCode,
          suppCode: po.suppCode,
          poRef: po.poRef,
          poUser: po.poUser,
          poDate: po.poDate,
          poStatus: po.poStatus,
          poTtqty: po.poTtqty,
          poTtfoc: po.poTtfoc,
          poTtdisc: po.poTtdisc,
          poTtamt: po.poTtamt,
          poAttn: po.poAttn,
          poRemk1: po.poRemk1,
          poRemk2: po.poRemk2,
          contactPerson: po.contactPerson,
          terms: po.terms,
          expectedDeliveryDate: po.expectedDeliveryDate || "",
          // Billing Address
          poBname: po.poBname,
          poBaddr1: po.poBaddr1,
          poBaddr2: po.poBaddr2,
          poBaddr3: po.poBaddr3,
          poBpostcode: po.poBpostcode,
          poBstate: po.poBstate,
          poBcity: po.poBcity,
          poBcountry: po.poBcountry,
          // Delivery Address
          poDaddr1: po.poDaddr1,
          poDaddr2: po.poDaddr2,
          poDaddr3: po.poDaddr3,
          poDpostcode: po.poDpostcode,
          poDstate: po.poDstate,
          poDcity: po.poDcity,
          poDcountry: po.poDcountry,
        });
      }

      if (items) {
        setCartData(items);
      }

      await Promise.all([
        loadSuppliers(),
        getOptions(),
      ]);
    } catch (err) {
      console.error("Error loading PO data:", err);
      toast.error("Error loading PO data");
    } finally {
      setPageLoading(false);
    }
  };

  // Get options for filters
  const getOptions = async () => {
    try {
      const [brands, ranges] = await Promise.all([
        apiService.get("ItemBrands"),
        apiService.get("ItemRanges")
      ]);

      const brandOptions = brands.map(brand => ({
        value: brand.brandCode,
        label: brand.brandName
      }));

      const rangeOptions = ranges.map(range => ({
        value: range.rangeCode,
        label: range.rangeName
      }));

      setBrandOption(brandOptions);
      setRangeOptions(rangeOptions);
    } catch (err) {
      console.error("Error loading options:", err);
    }
  };

  // Load items for selection
  const loadItems = async () => {
    setLoading(true);
    try {
      const siteCode = userDetails?.siteCode;
      const res = await apiService1.get(`api/GetInvitems?Site=${siteCode}`);
      
      if (res && res.length > 0) {
        const items = res.map(item => ({
          ...item,
          Qty: "",
          Price: item.costPrice || 0,
          Cost: item.costPrice || 0,
          docUom: item.itemUom,
          stockCode: item.itemcode,
          stockName: item.itemdesc,
          Brand: item.brandname,
          BrandCode: item.brandcode,
          Range: item.rangename,
          RangeCode: item.rangecode,
          Department: item.department,
          isActive: "True"
        }));

        setStockList(items);
        setOriginalStockList(items);
        setFilteredItemTotal(items.length);
      }
    } catch (err) {
      console.error("Error loading items:", err);
      toast.error("Error loading items");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
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
      setFilteredItemTotal(originalStockList.length);
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
    setFilteredItemTotal(filteredList.length);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    setLoading(false);
  };

  // Filter handlers
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
    setFilters((prev) => ({
      ...prev,
      department: prev.department.includes(department)
        ? prev.department.filter(d => d !== department)
        : [...prev.department, department]
    }));
    setLoading(false);
  };

  // Advanced search handler with timer (mirroring GRN)
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
      setFilteredItemTotal(originalStockList.length);
      setLoading(false);
      // Reset pagination to first page when clearing search
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }

    setLoading(true);

    // Set new timer
    const timer = setTimeout(() => {
      const filteredList = originalStockList.filter((item) => {
        return (
          item.stockCode?.toLowerCase().includes(searchValue) ||
          item.stockName?.toLowerCase().includes(searchValue) ||
          item.docUom?.toLowerCase().includes(searchValue) ||
          item.BrandCode?.toLowerCase().includes(searchValue) ||
          item.RangeCode?.toLowerCase().includes(searchValue)
        );
      });

      setStockList(filteredList);
      setFilteredItemTotal(filteredList.length);
      setLoading(false);
      // Reset pagination to first page when filtering
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500); // 500ms debounce

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

  // Update filtered count whenever stockList changes
  useEffect(() => {
    setFilteredItemTotal(stockList.length);
  }, [stockList]);

  // Add sorting function for ItemTable (mirroring GRN)
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
    // Reset pagination to first page when sorting
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Load items when component mounts
  useEffect(() => {
    loadItems();
  }, []);

  // Handle quantity change
  const handleQtyChange = (e, index) => {
    const newStockList = [...stockList];
    newStockList[index].Qty = e.target.value;
    setStockList(newStockList);
  };

  // Handle price change
  const handlePriceChange = (e, index) => {
    const newStockList = [...stockList];
    newStockList[index].Price = e.target.value;
    setStockList(newStockList);
  };

  // Add to cart
  const addToCart = (index, item) => {
    const qty = parseFloat(item.Qty) || 0;
    if (qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const price = parseFloat(item.Price) || 0;
    const discPer = 0; // Default discount
    const discAmt = (qty * price * discPer) / 100;
    const amount = (qty * price) - discAmt;

    const newItem = {
      poNo: formData.poNo,
      itemsiteCode: formData.itemsiteCode,
      status: "Active",
      podItemcode: item.stockCode,
      podItemdesc: item.stockName,
      podItemprice: price.toFixed(2),
      podQty: qty,
      poAppqty: 0,
      podFocqty: 0,
      podTtlqty: qty,
      podPrice: price.toFixed(2),
      podDiscper: discPer,
      podDiscamt: discAmt.toFixed(2),
      podAmt: amount.toFixed(2),
      podRecqty: 0,
      podCancelqty: 0,
      podOutqty: qty,
      brandcode: item.BrandCode,
      brandname: item.Brand,
      linenumber: cartData.length + 1,
      poststatus: "0",
      docUom: item.docUom,
      docBatchNo: "",
      docExpdate: "",
      itemRemark: "",
      useExistingBatch: true
    };

    setCartData(prev => [...prev, newItem]);
    
    // Reset quantity in stock list
    const newStockList = [...stockList];
    newStockList[index].Qty = "";
    setStockList(newStockList);

    toast.success("Item added to cart");
  };

  // Edit cart item
  const editCartItem = (index) => {
    const item = cartData[index];
    setEditData({
      ...item,
      editingIndex: index
    });
    setShowEditDialog(true);
  };

  // Handle edit cart changes
  const handleEditCart = (e, field) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Submit edit
  const handleEditSubmit = () => {
    if (editData.editingIndex !== null) {
      const newCartData = [...cartData];
      newCartData[editData.editingIndex] = { ...editData };
      setCartData(newCartData);
    }
    setShowEditDialog(false);
    setEditData(null);
  };

  // Remove from cart
  const removeFromCart = (index) => {
    setCartData(prev => prev.filter((_, i) => i !== index));
    toast.success("Item removed from cart");
  };

  // Calculate totals
  const totals = calculateTotals(cartData);

  // Update form data with totals
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      poTtqty: totals.totalQty,
      poTtfoc: totals.totalFoc,
      poTtdisc: totals.totalDisc,
      poTtamt: totals.totalAmt,
    }));
  }, [totals.totalQty, totals.totalFoc, totals.totalDisc, totals.totalAmt]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle supplier change
  const handleSupplierChange = (value) => {
    setFormData(prev => ({ ...prev, suppCode: value }));
    
    // Find supplier info
    const supplier = supplyOptions.find(s => s.value === value);
    if (supplier) {
      setSupplierInfo(prev => ({
        ...prev,
        Attn: supplier.label
      }));
    }
  };

  // Save PO
  const handleSave = async () => {
      if (cartData.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

    setSaveLoading(true);
    try {
      if (id) {
        // Update existing PO
        await poApi.updatePO(id, formData);
        
        // Update line items
        for (const item of cartData) {
          if (item.poId) {
            await poApi.updatePOLineItem(item.poId, item);
          } else {
            await poApi.createPO(formData, [item]);
          }
        }
        toast.success("Purchase Order updated successfully");
      } else {
        // Create new PO
        await poApi.createPO(formData, cartData);
        toast.success("Purchase Order created successfully");
      }

      navigate("/purchase-order");
    } catch (err) {
      console.error("Error saving PO:", err);
      toast.error("Error saving Purchase Order");
    } finally {
      setSaveLoading(false);
    }
  };

  // Post PO
  const handlePost = async () => {
    if (cartData.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setPostLoading(true);
    try {
      await poApi.postPO(formData.poNo);
      setFormData(prev => ({ ...prev, poStatus: "Posted" }));
      toast.success("Purchase Order posted successfully");
    } catch (err) {
      console.error("Error posting PO:", err);
      toast.error("Error posting Purchase Order");
    } finally {
      setPostLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredItemTotal / pagination.limit);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Batch edit functionality (mirroring GRN)
  const handleBatchEditClick = () => {
    setIsBatchEdit(true);
    setEditData({ 
      docBatchNo: "", 
      docExpdate: calculateDefaultExpiryDate(), 
      itemRemark: "" 
    });
    setShowEditDialog(true);
  };

  const handleBatchEditSubmit = (fields) => {
    setCartData((prev) =>
      prev.map((item, idx) => {
        if (!selectedRows.includes(idx)) return item;

        return { 
          ...item, 
          ...fields
        };
      })
    );
    setShowEditDialog(false);
    setIsBatchEdit(false);
    setSelectedRows([]);
    toast.success("Batch update successful!");
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        <span className="text-gray-600 ml-4 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {id ? "Edit Purchase Order" : "Add Purchase Order"}
        </h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
            onClick={() => navigate("/purchase-order")}
          >
            Cancel
          </Button>
          <Button
            disabled={saveLoading || cartData.length === 0}
            onClick={handleSave}
            className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
          >
            {saveLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              id ? "Update" : "Save"
            )}
          </Button>
          {formData.poStatus !== "Posted" && (
            <Button
              variant="secondary"
              onClick={handlePost}
              className="cursor-pointer hover:bg-gray-200 transition-colors duration-150"
              disabled={postLoading || cartData.length === 0}
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
          )}
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
                  PO No<span className="text-red-500">*</span>
                </Label>
                  <Input
                    value={formData.poNo}
                  disabled
                  className="bg-gray-50"
                  />
                </div>
              <div className="space-y-2">
                <Label>
                  PO Date<span className="text-red-500">*</span>
                </Label>
                  <Input
                    type="date"
                    value={formData.poDate}
                    onChange={(e) => handleInputChange("poDate", e.target.value)}
                  />
                </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={formData.poRef}
                  onChange={(e) => handleInputChange("poRef", e.target.value)}
                  placeholder="Enter reference"
                />
              </div>
            </div>

            {/* Second Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Supplier<span className="text-red-500">*</span>
                </Label>
                  <Select
                    value={formData.suppCode}
                  onValueChange={handleSupplierChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                    {supplyOptions.map((supplier) => (
                        <SelectItem key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                  <Input
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                  placeholder="Enter contact person"
                  />
                </div>
              <div className="space-y-2">
                <Label>Terms of Payment</Label>
                  <Input
                  value={formData.terms}
                  onChange={(e) => handleInputChange("terms", e.target.value)}
                  placeholder="Enter terms"
                  />
                </div>
            </div>

            {/* Third Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.poStatus} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Store Code</Label>
                  <Input
                  value={formData.itemsiteCode}
                  readOnly
                  className="bg-gray-50"
                  />
                </div>
              <div className="space-y-2">
                <Label>Created By</Label>
                <Input
                  value={formData.poUser}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Remarks 1</Label>
                <Input
                  value={formData.poRemk1}
                  onChange={(e) => handleInputChange("poRemk1", e.target.value)}
                placeholder="Enter remarks"
                />
              </div>
            <div className="space-y-2">
              <Label>Remarks 2</Label>
                <Input
                  value={formData.poRemk2}
                  onChange={(e) => handleInputChange("poRemk2", e.target.value)}
                placeholder="Enter remarks"
                />
            </div>
              </div>
            </CardContent>
          </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="detail">Details</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Info</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-6">
          {urlStatus != 7 && (
            <Card className={"p-0 gap-0"}>
              <CardTitle className={"ml-4 pt-4 text-xl"}>Select Items</CardTitle>
              <CardContent className="p-4">
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
                      checked={filters.department.includes("RETAIL PRODUCT")}
                      onCheckedChange={() => handleDepartmentChange("RETAIL PRODUCT")}
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
                      onCheckedChange={() => handleDepartmentChange("SALON PRODUCT")}
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
                  onQtyChange={handleQtyChange}
                  onPriceChange={handlePriceChange}
                  onAddToCart={addToCart}
                  currentPage={pagination.page}
                  itemsPerPage={pagination.limit}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  emptyMessage="No items found"
                  showBatchColumns={getConfigValue('BATCH_NO') === "Yes"}
                  qtyLabel="Qty"
                  priceLabel="Price"
                  costLabel="Cost"
                  showPrice={userDetails?.isSettingViewPrice === "True"}
                  showCost={userDetails?.isSettingViewCost === "True"}
                  enableSorting={true}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                />
              </CardContent>
            </Card>
          )}

        </TabsContent>

        <TabsContent value="supplier" className="space-y-6">
          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="poBname">Company Name</Label>
                <Input
                  id="poBname"
                  value={formData.poBname}
                  onChange={(e) => handleInputChange("poBname", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="poBaddr1">Address 1</Label>
                  <Input
                    id="poBaddr1"
                    value={formData.poBaddr1}
                    onChange={(e) => handleInputChange("poBaddr1", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="poBaddr2">Address 2</Label>
                  <Input
                    id="poBaddr2"
                    value={formData.poBaddr2}
                    onChange={(e) => handleInputChange("poBaddr2", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="poBcity">City</Label>
                  <Input
                    id="poBcity"
                    value={formData.poBcity}
                    onChange={(e) => handleInputChange("poBcity", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="poBstate">State</Label>
                  <Input
                    id="poBstate"
                    value={formData.poBstate}
                    onChange={(e) => handleInputChange("poBstate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="poBpostcode">Postcode</Label>
                  <Input
                    id="poBpostcode"
                    value={formData.poBpostcode}
                    onChange={(e) => handleInputChange("poBpostcode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="poBcountry">Country</Label>
                  <Input
                    id="poBcountry"
                    value={formData.poBcountry}
                    onChange={(e) => handleInputChange("poBcountry", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Delivery Address */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="poDaddr1">Address 1</Label>
                <Input
                  id="poDaddr1"
                  value={formData.poDaddr1}
                  onChange={(e) => handleInputChange("poDaddr1", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="poDaddr2">Address 2</Label>
                <Input
                  id="poDaddr2"
                  value={formData.poDaddr2}
                  onChange={(e) => handleInputChange("poDaddr2", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="poDcity">City</Label>
                <Input
                  id="poDcity"
                  value={formData.poDcity}
                  onChange={(e) => handleInputChange("poDcity", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="poDstate">State</Label>
                <Input
                  id="poDstate"
                  value={formData.poDstate}
                  onChange={(e) => handleInputChange("poDstate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="poDpostcode">Postcode</Label>
                <Input
                  id="poDpostcode"
                  value={formData.poDpostcode}
                  onChange={(e) => handleInputChange("poDpostcode", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="poDcountry">Country</Label>
                <Input
                  id="poDcountry"
                  value={formData.poDcountry}
                  onChange={(e) => handleInputChange("poDcountry", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Edit Button */}
      {cartData.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {selectedRows.length > 0 && (urlStatus != 7 || userDetails?.isSettingPostedChangePrice === "True") && (
              <Button
                variant="outline"
                onClick={handleBatchEditClick}
                disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Selected
              </Button>
            )}
            </div>
              </div>
      )}

      {/* Selected Items Table */}
      {cartData.length > 0 && (
        <div className="rounded-md border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Selected Items ({cartData.length})</h3>
          </div>
          <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                  {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                    <TableHead>
                      <input
                        type="checkbox"
                        className="w-5 h-5"
                        checked={selectedRows.length === cartData.length && cartData.length > 0}
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
                  <TableHead>No</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Description</TableHead>
                  <TableHead>UOM</TableHead>
                    <TableHead>Qty</TableHead>
                  {userDetails?.isSettingViewPrice === "True" && <TableHead>Price</TableHead>}
                  {userDetails?.isSettingViewPrice === "True" && <TableHead>Amount</TableHead>}
                  {getConfigValue('BATCH_NO') === "Yes" && <TableHead>Batch No</TableHead>}
                  {getConfigValue('EXPIRY_DATE') === "Yes" && <TableHead>Expiry Date</TableHead>}
                  <TableHead>Remarks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartData.map((item, index) => (
                    <TableRow key={index}>
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
                              setSelectedRows(selectedRows.filter((i) => i !== index));
                            }
                          }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.podItemcode}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal break-words">
                      {item.podItemdesc}
                    </TableCell>
                    <TableCell>{item.docUom}</TableCell>
                      <TableCell>{item.podQty}</TableCell>
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableCell>{item.podItemprice}</TableCell>
                    )}
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableCell>{item.podAmt}</TableCell>
                    )}
                    {getConfigValue('BATCH_NO') === "Yes" && (
                      <TableCell>{item.docBatchNo || "-"}</TableCell>
                    )}
                    {getConfigValue('EXPIRY_DATE') === "Yes" && (
                      <TableCell>{item.docExpdate || "-"}</TableCell>
                    )}
                    <TableCell>{item.itemRemark || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                          onClick={() => editCartItem(index)}
                          disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          onClick={() => removeFromCart(index)}
                          disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

        {/* Totals */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t mt-4">
              <div>
                <Label>Total Quantity</Label>
                <Input value={totals.totalQty} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Total FOC Quantity</Label>
                <Input value={totals.totalFoc} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Total Discount</Label>
                <Input value={totals.totalDisc} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input value={totals.totalAmt} readOnly className="bg-gray-50" />
              </div>
            </div>
        </div>
              </div>
            )}

      {/* Edit Dialog */}
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

      <Toaster />
    </div>
  );
}

export default AddPO;
