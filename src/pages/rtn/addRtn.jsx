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
  Info,
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
  getConfigValue,
  normalizeExpDate,
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
import apiService1 from "@/services/apiService1";

// NEW: Batch Selection Dialog for RTN
const BatchSelectionDialog = memo(({
  showBatchDialog,
  setShowBatchDialog,
  batchBreakdown,
  transferQty,
  totalBatchQty,
  noBatchQty,
  scenarioMessage,
  onBatchSelectionSubmit,
  itemcode,
  itemdesc
}) => {
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [batchQuantities, setBatchQuantities] = useState({});
  const [noBatchSelected, setNoBatchSelected] = useState(false);
  const [noBatchQuantity, setNoBatchQuantity] = useState(0);

  // Reset dialog state when dialog closes
  useEffect(() => {
    if (!showBatchDialog) {
      setSelectedBatches([]);
      setBatchQuantities({});
      setNoBatchSelected(false);
      setNoBatchQuantity(0);
    }
  }, [showBatchDialog]);

  // Calculate total selected quantity (including No Batch)
  const totalSelectedQty = selectedBatches.reduce((sum, batch) => sum + (batchQuantities[batch.batchNo] || 0), 0) + (noBatchSelected ? noBatchQuantity : 0);
  const remainingQty = transferQty - totalSelectedQty;

  const handleBatchSelection = (batch, isSelected) => {
    if (isSelected) {
      setSelectedBatches(prev => [...prev, batch]);
      setBatchQuantities(prev => ({ ...prev, [batch.batchNo]: Math.min(batch.availableQty, remainingQty) }));
    } else {
      setSelectedBatches(prev => prev.filter(b => b.batchNo !== batch.batchNo));
      setBatchQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[batch.batchNo];
        return newQuantities;
      });
    }
  };

  const handleQuantityChange = (batchNo, quantity) => {
    const batch = batchBreakdown.find(b => b.batchNo === batchNo);
    const maxQty = Math.min(batch.availableQty, remainingQty + (batchQuantities[batchNo] || 0));
    const validQty = Math.max(0, Math.min(quantity, maxQty));
    
    setBatchQuantities(prev => ({ ...prev, [batchNo]: validQty }));
  };

  const handleNoBatchSelection = (isSelected) => {
    setNoBatchSelected(isSelected);
    if (!isSelected) {
      setNoBatchQuantity(0);
    } else {
      // Set initial quantity to remaining quantity or available No Batch quantity
      const noBatchItem = batchBreakdown.find(b => b.batchNo === "");
      const maxNoBatchQty = noBatchItem ? Math.min(noBatchItem.availableQty, remainingQty) : 0;
      setNoBatchQuantity(Math.min(maxNoBatchQty, remainingQty));
    }
  };

  const handleNoBatchQuantityChange = (quantity) => {
    const noBatchItem = batchBreakdown.find(b => b.batchNo === "");
    const maxQty = noBatchItem ? Math.min(noBatchItem.availableQty, remainingQty + noBatchQuantity) : 0;
    const validQty = Math.max(0, Math.min(quantity, maxQty));
    setNoBatchQuantity(validQty);
  };

  const handleSubmit = () => {
    if (totalSelectedQty === 0) {
      toast.error("Please select at least one batch or No Batch option");
      return;
    }

    // Validate that selected quantity matches the required transfer quantity
    if (totalSelectedQty !== transferQty) {
      toast.error(`Selected quantity (${totalSelectedQty}) must match the required quantity (${transferQty}). Please adjust your selection.`);
      return;
    }

    // Create combined batch data
    const combinedBatchData = {
      batchNo: selectedBatches.map(b => b.batchNo).join(', '),
      expDate: selectedBatches.map(b => b.expDate).filter(Boolean).join(', '),
      availableQty: selectedBatches.reduce((sum, batch) => sum + (batchQuantities[batch.batchNo] || 0), 0),
      noBatchQty: noBatchSelected ? noBatchQuantity : 0,
      selectedBatches: selectedBatches.map(batch => ({
        batchNo: batch.batchNo,
        expDate: batch.expDate,
        quantity: batchQuantities[batch.batchNo]
      }))
    };

    onBatchSelectionSubmit(combinedBatchData);
  };

  return (
    <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Select Specific Batches for Return</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Choose specific batches to return for item: <strong>{itemcode}</strong> - {itemdesc}
          </div>
        </DialogHeader>

        {/* Transfer Summary */}
        {scenarioMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Return Summary</p>
                <p className="text-xs mt-1">{scenarioMessage}</p>
                <div className="mt-2 text-xs space-y-1">
                  <p><strong>Return Qty:</strong> {transferQty}</p>
                  <p><strong>Batch Qty:</strong> {totalBatchQty}</p>
                  <p><strong>"No Batch" Qty:</strong> {noBatchQty}</p>
                  <p><strong>Selected Qty:</strong> {totalSelectedQty} / {transferQty}</p>
                  {remainingQty > 0 && (
                    <p className="text-orange-600"><strong>Remaining:</strong> {remainingQty}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Batches Table */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Available Batches</Label>
            {batchBreakdown.length > 0 ? (
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Select</th>
                      <th className="text-left p-2 font-medium">Batch No</th>
                      <th className="text-right p-2 font-medium">Available Qty</th>
                      <th className="text-center p-2 font-medium">Select Qty</th>
                      <th className="text-left p-2 font-medium">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchBreakdown.map((batch, index) => {
                      const isSelected = selectedBatches.some(b => b.batchNo === batch.batchNo);
                      const selectedQty = batchQuantities[batch.batchNo] || 0;
                      const maxSelectableQty = Math.min(batch.availableQty, remainingQty + selectedQty);
                      
                      return (
                        <tr key={index} className={`border-t hover:bg-gray-50 ${
                          batch.batchNo === "" ? 'bg-gray-50' : ''
                        }`}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={batch.batchNo === "" ? noBatchSelected : isSelected}
                              onChange={(e) => {
                                if (batch.batchNo === "") {
                                  handleNoBatchSelection(e.target.checked);
                                } else {
                                  handleBatchSelection(batch, e.target.checked);
                                }
                              }}
                              disabled={batch.batchNo !== "" && !isSelected && maxSelectableQty <= 0}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="p-2 font-medium">
                            {batch.batchNo === "" ? "No Batch" : batch.batchNo}
                            {batch.batchNo === "" && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                Balance
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <span className={batch.batchNo === "" ? 'text-gray-600' : ''}>
                              {batch.availableQty}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {batch.batchNo === "" ? (
                              noBatchSelected ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max={Math.min(batch.availableQty, remainingQty + noBatchQuantity)}
                                  value={noBatchQuantity}
                                  onChange={(e) => handleNoBatchQuantityChange(Number(e.target.value))}
                                  className="w-20 text-center"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )
                            ) : (
                              isSelected ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxSelectableQty}
                                  value={selectedQty}
                                  onChange={(e) => handleQuantityChange(batch.batchNo, Number(e.target.value))}
                                  className="w-20 text-center"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )
                            )}
                          </td>
                          <td className="p-2 text-xs">
                            {batch.batchNo === "" ? "N/A" : (batch.expDate ? format_Date(batch.expDate) : "No Expiry")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No valid batches available for selection</p>
                <p className="text-sm mt-1">This item only has 'No Batch' quantities available</p>
              </div>
            )}
          </div>

          {/* Selection Summary */}
          {selectedBatches.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Selected Batches</p>
                  <div className="mt-2 space-y-1">
                    {selectedBatches.map(batch => (
                      <p key={batch.batchNo} className="text-xs">
                        <strong>{batch.batchNo}:</strong> {batchQuantities[batch.batchNo] || 0} qty
                      </p>
                    ))}
                    {noBatchSelected && (
                      <p key="no-batch" className="text-xs text-orange-600">
                        <strong>No Batch:</strong> {noBatchQuantity} qty
                      </p>
                    )}
                    <p className="text-xs font-medium">
                      <strong>Total Selected:</strong> {totalSelectedQty} / {transferQty}
                    </p>
                    {remainingQty > 0 && (
                      <p className="text-xs text-red-600">
                        <strong>Remaining:</strong> {remainingQty} (not selected)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Return Mode Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Multi-Batch Selection Mode</p>
                <p className="text-xs mt-1">
                  Select multiple batches to reach your return quantity. You can select different quantities from each batch.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={totalSelectedQty === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Confirm Selection ({totalSelectedQty}/{transferQty})
            {remainingQty > 0 && ` (${remainingQty} remaining)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

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

    // Reset states when dialog closes
    useEffect(() => {
      if (!showEditDialog) {
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
        
        // Check if quantity exceeds available stock for returns
        if (editData?.docQty && editData?.originalQty && Number(editData.docQty) > Number(editData.originalQty)) {
          errors.push(`Cannot return ${Number(editData.docQty)}. Only ${Number(editData.originalQty)} available in stock.`);
        }
        
        // Only validate price if price viewing is enabled
        if (userDetails?.isSettingViewPrice === "True" && (!editData?.docPrice || editData.docPrice <= 0)) {
          errors.push("Price must be greater than 0");
        }
      }

      // Batch number and expiry date validation removed - handled by separate batch selection modal

      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

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
                  max={editData?.originalQty || 999999}
                  value={editData?.docQty || ""}
                  onChange={(e) => onEditCart(e, "docQty")}
                  className="w-full"
                  disabled={urlStatus == 7 || (editData?.transferType === 'specific' && editData?.batchDetails)}
                />
                {editData?.originalQty && (
                  <p className="text-xs text-gray-500">
                    Maximum return quantity: {editData.originalQty}
                  </p>
                )}
              </div>
              {userDetails?.isSettingViewPrice === "True" && (
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
              )}
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

function AddRtn({ docData }) {
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
  const [originalStockList, setOriginalStockList] = useState([]);
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "VGRN",
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

  // Add sorting state for ItemTable
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // NEW: Batch Selection Dialog State Variables
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchBreakdown, setBatchBreakdown] = useState([]);
  const [transferQty, setTransferQty] = useState(0);
  const [totalBatchQty, setTotalBatchQty] = useState(0);
  const [noBatchQty, setNoBatchQty] = useState(0);
  const [scenarioMessage, setScenarioMessage] = useState("");
  const [itemBatchLoading, setItemBatchLoading] = useState({});

  // Add apply filters function
  // const handleApplyFilters = () => {
  //   setItemFilter((prev) => ({
  //     ...prev,
  //     whereArray: {
  //       ...prev.whereArray,
  //       brand: tempFilters.brand.map((item) => item.label) || [],
  //       range: tempFilters.range.map((item) => item.label) || [],
  //     },
  //     skip: 0,
  //   }));
  //   // getStockDetails();
  // };
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
              movCode: "VGRN",
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
          await getDocNo();
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
      const codeDesc = "Goods Return Note";
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
        controldescription: "Goods Return Note",
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

  // Helper function to reconstruct batch state from stored database fields
  const reconstructBatchState = async (cartItem, sourceStore) => {
    if (cartItem.ordMemo1 === "specific" && cartItem.ordMemo2) {
      try {
        // Parse batch breakdown from ordMemo2
        const batchParts = cartItem.ordMemo2.split(',');
        const expDateParts = cartItem.ordMemo4 ? cartItem.ordMemo4.split(',') : [];
        
        const batchBreakdown = batchParts.map((batch, index) => {
          const [batchNo, quantity] = batch.split(':');
          
          // Try to get expiry date from ordMemo4 if available
          let expDate = null;
          if (expDateParts[index]) {
            // Split by ':' and take everything except the last part as date (handles ISO dates with colons)
            const parts = expDateParts[index].split(':');
            if (parts.length > 1) {
              // Last part is quantity, everything before is the date
              const expDateStr = parts.slice(0, -1).join(':');
              // Handle null, empty string, or invalid dates
              if (expDateStr && expDateStr !== "null" && expDateStr !== "" && expDateStr !== "undefined") {
                expDate = expDateStr;
              }
            }
          }
          
          return { 
            batchNo, 
            quantity: Number(quantity),
            expDate: expDate
          };
        });
        
        // Fetch ItemBatches data to get fresh expiry dates (as fallback if ordMemo4 not available)
        const itemBatchesFilter = {
          where: {
            and: [
              { itemCode: cartItem.itemcode },
              { siteCode: sourceStore },
              { uom: cartItem.docUom },
              { or: batchBreakdown.map(b => ({ batchNo: b.batchNo })) }
            ]
          }
        };
        
        const itemBatchesResponse = await apiService.get(
          `ItemBatches?filter=${encodeURIComponent(JSON.stringify(itemBatchesFilter))}`
        ).catch(() => []); // Return empty array on error
        
        // Map batch data with expiry dates (prefer ordMemo4, fallback to API)
        const enrichedBatchDetails = batchBreakdown.map(batch => {
          const apiBatch = itemBatchesResponse.find(api => api.batchNo === batch.batchNo);
          return {
            batchNo: batch.batchNo,
            quantity: batch.quantity,
            expDate: batch.expDate || apiBatch?.expDate || null, // Use ordMemo4 first, then API
            batchCost: apiBatch?.batchCost || 0
          };
        });
        
        // Reconstruct the selectedBatches state
        const selectedBatches = {
          batchNo: enrichedBatchDetails.map(b => b.batchNo).join(', '), // Reconstruct from individual batches
          expDate: enrichedBatchDetails.map(b => b.expDate).filter(Boolean).join(', '),
          batchTransferQty: enrichedBatchDetails.reduce((sum, b) => sum + b.quantity, 0),
          noBatchTransferQty: Number(cartItem.ordMemo3) || 0,
          totalTransferQty: Number(cartItem.recTtl),
          transferType: 'specific',
          batchDetails: enrichedBatchDetails
        };
        
        return selectedBatches;
      } catch (error) {
        console.error("Error reconstructing batch state:", error);
        return null;
      }
    }
    
    return null; // FEFO transfer
  };

  const getStockHdrDetails = async (filter) => {
    try {
      const response = await apiService.get(
        `StkMovdocDtls${buildFilterQuery(filter ?? filter)}`
      );
      
      // Reconstruct batch state for each item
      const reconstructedItems = await Promise.all(
        response.map(async (item) => {
          const batchState = await reconstructBatchState(item, stockHdrs.fstoreNo);
          if (batchState) {
            return {
              ...item,
              transferType: 'specific',
              batchDetails: {
                batchNo: batchState.batchNo,
                expDate: batchState.expDate,
                batchTransferQty: batchState.batchTransferQty,
                noBatchTransferQty: batchState.noBatchTransferQty,
                totalTransferQty: batchState.totalTransferQty,
                individualBatches: batchState.batchDetails
              }
            };
          }
          return {
            ...item,
            transferType: 'fefo',
            batchDetails: null
          };
        })
      );
      
      setCartItems(reconstructedItems);
      setCartData(reconstructedItems);
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

  // const handleSearch = (e) => {
  //   const searchValue = e.target.value.trim();
  //   console.log(searchValue, "searchValue");
  //   setLoading(true); // Set loading to true

  //   setSearchValue(searchValue); // Update the search value state

  //   setItemFilter((prev) => ({
  //     ...prev,
  //     like: {
  //       ...prev.like,
  //       stockCode: searchValue,
  //       itemUom: searchValue,
  //       stockName: searchValue,
  //       // range: searchValue,
  //       // brand: searchValue,
  //       brandCode: searchValue,
  //     },
  //     skip: 0,
  //   }));
  //   // updateLike(searchValue); // Update the like filter with the search value
  //   // updatePagination({ skip: 0 }); // Reset pagination to the first page
  // };

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

    // Batch and Expiry Date Validation removed - handled by separate batch selection modal

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationDialog(true);
      return false;
    }

    return true;
  };

  // const handleDateChange = (e, type) => {
  //   if (type === "postDate") {
  //     let postDate = moment(e.target.value).valueOf();
  //     let docDate = moment(stockHdrs.docDate).valueOf();
  //     if (docDate > postDate) {
  //       showError("Delivery date should be greater than doc date");
  //       return;
  //     }
  //   }
  //   setStockHdrs((prev) => ({
  //     ...prev,
  //     [type]: e.target.value,
  //   }));
  // };

  const handleDateChange = (e, type) => {
    // const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // if (type === "deliveryDate") {
    //   let deliveryDate = moment.tz(e.target.value, tz).valueOf();
    //   let docDate = moment.tz(stockHdrs.docDate, tz).valueOf();
    //   if (deliveryDate > docDate) {
    //     showError(
    //       "Delivery Date should be less than or equal to Doc Create Date"
    //     );
    //     return;
    //   }
    //   console.log(deliveryDate, docDate, "date");
    // }
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
      if (!updatedEditData.docQty) {
        toast.error("Quantity is required");
        return;
      }
      
      // Check if quantity exceeds available stock for returns
      if (updatedEditData.docQty && updatedEditData.originalQty && Number(updatedEditData.docQty) > Number(updatedEditData.originalQty)) {
        toast.error(`Cannot return ${Number(updatedEditData.docQty)}. Only ${Number(updatedEditData.originalQty)} available in stock.`);
        return;
      }
      
      // Only validate price if price viewing is enabled
      if (userDetails?.isSettingViewPrice === "True" && !updatedEditData.docPrice) {
        toast.error("Price is required");
        return;
      }

      console.log(updatedEditData, "updatedEditData");

      const updatedItem = {
        ...updatedEditData,
        docQty: Number(updatedEditData.docQty),
        docPrice: userDetails?.isSettingViewPrice === "True" ? Number(updatedEditData.docPrice) : updatedEditData.docPrice,
        docAmt: userDetails?.isSettingViewPrice === "True" 
          ? Number(updatedEditData.docQty) * Number(updatedEditData.docPrice)
          : updatedEditData.docAmt,
      };

      setCartData((prev) =>
        prev.map((item, index) => (index === editingIndex ? updatedItem : item))
      );

      setShowEditDialog(false);
      setEditData(null);
      setEditingIndex(null);
      toast.success("Item updated successfully");
    },
    [editingIndex, userDetails?.isSettingViewPrice]
  );

  const editPopup = (item, index) => {
    setIsBatchEdit(false);
    
    // Handle expiry date - format properly for HTML date input
    let expiryDate = "";
    if (item.docExpdate) {
      try {
        // Handle ISO date format (e.g., "2025-10-22T00:00:00.000Z")
        if (item.docExpdate.includes('T') || item.docExpdate.includes('Z')) {
          // Convert ISO date to YYYY-MM-DD format for HTML date input
          const date = new Date(item.docExpdate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString().split('T')[0];
          }
        } 
        // Handle DD/MM/YYYY format (e.g., "25/08/2025 7:43:32 PM")
        else if (item.docExpdate.includes('/')) {
          const parts = item.docExpdate.split(' ')[0].split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            expiryDate = `${year}-${month}-${day}`;
          }
        }
        // If it's already in YYYY-MM-DD format, extract just the date part
        else if (item.docExpdate.includes('-')) {
          // Extract just the date part (YYYY-MM-DD) from YYYY-MM-DD HH:MM:SS
          expiryDate = item.docExpdate.split(' ')[0];
        }
        // Handle other date formats by trying to parse them
        else {
          const date = new Date(item.docExpdate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString().split('T')[0];
          }
        }
      } catch (error) {
        console.error("Error parsing expiry date:", error);
        expiryDate = "";
      }
    }
    
    console.log("Original docExpdate:", item.docExpdate);
    console.log("Processed expiryDate:", expiryDate);
    
    // Use current stock quantity from stockList (Select Items data)
    const currentStockItem = stockList.find(
      stockItem => stockItem.stockCode === item.itemcode && stockItem.uom === item.docUom
    );
    
    const currentAvailableQty = Number(currentStockItem?.quantity || 0);

    setEditData({
      ...item,
      docQty: Number(item.docQty) || 0,
      originalQty: currentAvailableQty, // Use current stock quantity for validation
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
        i === index ? { 
          ...stockItem, 
          Qty: 0,
          selectedBatches: null // Clear batch selection when added to cart
        } : stockItem
      )
    );
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



    const amount = Number(item.Qty) * Number(item.Price);

    // Check if specific batches are selected
    const hasSpecificBatches = item.selectedBatches && item.selectedBatches.transferType === 'specific';

    // Prepare batch data for storage in database fields (for future use)
    let recQtyFields = { recQty1: 0, recQty2: 0, recQty3: 0, recQty4: 0, recQty5: 0 };
    let ordMemoFields = { ordMemo1: "fefo", ordMemo2: "", ordMemo3: "0", ordMemo4: "" };
    let docBatchNo = null; // Will be set based on batch selection
    let docExpdate = "";

    // If specific batches are selected, update memo fields and set batch number
    if (hasSpecificBatches) {
      // For specific batches, set the primary batch number (first batch or combined)
      docBatchNo = item.selectedBatches.batchNo || "";
      
      ordMemoFields = {
        ordMemo1: "specific",
        ordMemo2: item.selectedBatches.batchDetails.map(b => `${b.batchNo}:${b.quantity}`).join(','),
        ordMemo3: item.selectedBatches.noBatchTransferQty.toString(),
        ordMemo4: item.selectedBatches.batchDetails.map(b => `${b.expDate}:${b.quantity}`).join(',')
      };
    }

    const newCartItem = {
      id: cartData.length + 1,
      // docId: cartData.length + 1,
      docAmt: amount,
      docNo: stockHdrs?.docNo || "",
      movCode: "VGRN",
      movType: "VGRN",
      docLineno: cartData.length + 1,
      docDate: stockHdrs.docDate,
      createDate: stockHdrs.docDate,
      itemcode: item.stockCode,
      itemdesc: item.stockName,
      docQty: Number(item.Qty),
      docFocqty: 0,
      docTtlqty: Number(item.Qty),
      docPrice: Number(item.Price),
      docPdisc: 0,
      docDisc: 0,
      // Store batch quantities in recQty fields
      ...recQtyFields,
      recTtl: Number(item.Qty),
      postedQty: 0,
      cancelQty: 0,
      createUser: userDetails?.username || "SYSTEM",
      createDate: stockHdrs.docDate,
      docUom: item.uom || "",
      // Batch and expiry will be handled in edit mode, not here
      docExpdate: "",
      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: item.range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: item?.itemRemark || null,
      // itemprice: 0,
      itemprice: Number(item.Cost) || 0,

      // Batch number will be handled in edit mode, not here
      docBatchNo: docBatchNo,
      docMdisc: 0,
      // Store transfer type and batch details in memo fields
      ...ordMemoFields,
      // Keep existing transferType and batchDetails for runtime use
      transferType: hasSpecificBatches ? 'specific' : 'fefo',
      batchDetails: hasSpecificBatches ? {
        batchNo: item.selectedBatches.batchNo,
        expDate: item.selectedBatches.expDate,
        batchTransferQty: item.selectedBatches.batchTransferQty,
        noBatchTransferQty: item.selectedBatches.noBatchTransferQty,
        totalTransferQty: item.selectedBatches.totalTransferQty,
        individualBatches: item.selectedBatches.batchDetails
      } : null,
    };
    // console.log(item.itemUom,cartData[0].docUom)

    const existingItemIndex = cartData.findIndex(
      (cartItem) =>
        cartItem.itemcode === item.stockCode && cartItem.docUom === item.uom
    );

    // Debug logging
    console.log("🔍 Duplicate check:", {
      newItem: { itemcode: item.stockCode, docUom: item.uom },
      existingItems: cartData.map(c => ({ itemcode: c.itemcode, docUom: c.docUom })),
      existingItemIndex
    });

    if (existingItemIndex !== -1) {
      toast.error("This item is already in the cart");
      return;
    }

    addItemToCart(newCartItem, index);
  };
  // Helper function to pre-calculate FEFO batch selection
  const calculateFefoBatches = async (item) => {
    if (item?.transferType !== "fefo" || getConfigValue('BATCH_NO') !== "Yes") {
      return item;
    }

    try {
      // Find all available batches in source store
      const allBatchesFilter = {
        where: {
          and: [
            { itemCode: item.itemcode },
            { siteCode: userDetails.siteCode }, // Source store for returns
            { uom: item.docUom },
            { qty: { gt: 0 } } // Only batches with available quantity
          ]
        }
      };

      const allBatches = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(allBatchesFilter))}`
      );

      if (allBatches && allBatches.length > 0) {
        // Separate specific batches from "No Batch" records
        const specificBatches = allBatches.filter(batch => 
          batch.batchNo && batch.batchNo.trim() !== ""
        );

        // Sort specific batches by expiry date (FEFO)
        const sortedBatches = specificBatches.sort((a, b) => 
          new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31')
        );

        let remainingQty = Number(item.docQty);
        const fefoBatches = [];

        // Calculate which batches will be used for FEFO transfer
        for (const batch of sortedBatches) {
          if (remainingQty <= 0) break;
          
          const batchQty = Math.min(remainingQty, Number(batch.qty));
          fefoBatches.push({
            batchNo: batch.batchNo,
            quantity: batchQty,
            expDate: batch.expDate,
            batchCost: batch.batchCost
          });

          remainingQty -= batchQty;
        }

        // If still need more quantity, take from "No Batch" records
        if (remainingQty > 0) {
          const noBatchRecords = allBatches.filter(batch => 
            !batch.batchNo || batch.batchNo.trim() === ""
          );

          for (const noBatch of noBatchRecords) {
            if (remainingQty <= 0) break;
            
            const batchQty = Math.min(remainingQty, Number(noBatch.qty));
            fefoBatches.push({
              batchNo: "", // Empty string for "No Batch"
              quantity: batchQty,
              expDate: noBatch.expDate,
              batchCost: noBatch.batchCost
            });

            remainingQty -= batchQty;
          }
        }

        // Update the item with FEFO batch details
        return {
          ...item,
          fefoBatches: fefoBatches
        };
      }
    } catch (error) {
      console.error("Error calculating FEFO batches:", error);
    }

    return item;
  };

  // Helper function to create Stktrnbatches records
  const createStktrnbatchesRecords = async (stktrnsRecords, processedDetails, type) => {
    if (getConfigValue('BATCH_NO') !== "Yes") {
      return; // Skip if batch functionality is disabled
    }

    try {
      for (let i = 0; i < stktrnsRecords.length; i++) {
        const stktrnRecord = stktrnsRecords[i];
        
        if (!stktrnRecord.id) {
          console.warn(`No Stktrns ID found for item ${stktrnRecord.itemcode}, skipping Stktrnbatches creation`);
          continue;
        }

        // Find matching item by itemcode and uom only (groupedDetails contains all batches for the item)
        const trimmedItemCode = stktrnRecord.itemcode.replace(/0000$/, "");
        
        const processedItem = processedDetails.find(
          (item) =>
            item.itemcode === trimmedItemCode &&
            item.docUom === stktrnRecord.itemUom
        );

        if (!processedItem) {
          console.warn(`No matching processed item found for ${stktrnRecord.itemcode} (${stktrnRecord.itemUom}), skipping Stktrnbatches creation`);
          continue;
        }

        let batchDetails = [];

        // Use groupedDetails (passed as processedDetails parameter) which contains all consolidated batches
        // This contains both specific batches and FEFO batches after grouping
        if (processedItem?.batchDetails?.individualBatches?.length > 0) {
          batchDetails = processedItem.batchDetails.individualBatches;
        }
        // Fallback: Check fefoBatches if individualBatches not available
        else if (processedItem?.fefoBatches?.length > 0) {
          batchDetails = processedItem.fefoBatches;
        }

        // Create Stktrnbatches records for each batch
        for (const batch of batchDetails) {
          const stktrnbatchesPayload = {
            batchNo: batch.batchNo || "No Batch", // Use "No Batch" string for Stktrnbatches API
            stkTrnId: stktrnRecord.id,
            batchQty: -batch.quantity // Negative for returns (reducing stock)
          };

          try {
            await apiService.post("Stktrnbatches", stktrnbatchesPayload);
            console.log(`✅ Created Stktrnbatches for ${type}: ${batch.batchNo || "No Batch"} - ${batch.quantity} qty`);
          } catch (error) {
            console.error(`❌ Error creating Stktrnbatches for ${batch.batchNo || "No Batch"}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in createStktrnbatchesRecords:", error);
    }
  };

  // Helper function to group cart items by itemcode+uom and combine multiple batches
  const groupCartItemsByItem = (cartItems) => {
    const grouped = new Map();

    cartItems.forEach((item) => {
      // Group by itemcode+uom only (transferType preserved in item object for batch selection logic)
      const transferType = (item.transferType || "fefo").toLowerCase();
      const key = `${item.itemcode}-${item.docUom}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          ...item,
          transferType: transferType, // Preserve normalized transferType
          docQty: Number(item.docQty) || 0,
          docAmt: Number(item.docAmt) || 0,
          batchDetails: item.batchDetails || { individualBatches: [] },
          fefoBatches: item.fefoBatches || [],
          // Preserve selectedBatches and transferType if present
          selectedBatches: item.selectedBatches,
          docLinenos: [item.docLineno], // Track all line numbers for audit
        });
      } else {
        const existing = grouped.get(key);
        existing.docQty += Number(item.docQty) || 0;
        existing.docAmt += Number(item.docAmt) || 0;
        existing.docLinenos.push(item.docLineno); // Track line numbers
        
        // Merge batch details if present
        if (item.batchDetails?.individualBatches?.length) {
          if (!existing.batchDetails) existing.batchDetails = { individualBatches: [] };
          existing.batchDetails.individualBatches.push(...item.batchDetails.individualBatches);
        }
        
        // Merge FEFO batches if present
        if (item.fefoBatches?.length) {
          if (!existing.fefoBatches) existing.fefoBatches = [];
          existing.fefoBatches.push(...item.fefoBatches);
        }
      }

      const g = grouped.get(key);

      // Capture batch info if present
      if (getConfigValue('BATCH_NO') === "Yes") {
        // Handle fefoBatches (from FEFO calculation) - convert to individualBatches
        if (item.fefoBatches?.length > 0) {
          if (!g.batchDetails) g.batchDetails = { individualBatches: [] };
          item.fefoBatches.forEach((batch) => {
            g.batchDetails.individualBatches.push({
              batchNo: batch.batchNo,
              quantity: Number(batch.quantity) || 0,
              expDate: batch.expDate,
              batchCost: batch.batchCost || item.itemprice,
            });
          });
        }
        // Handle simple docBatchNo (only if no structured batch info exists)
        else if (item.docBatchNo && !item.batchDetails?.individualBatches?.length) {
          if (!g.batchDetails) g.batchDetails = { individualBatches: [] };
          g.batchDetails.individualBatches.push({
            batchNo: item.docBatchNo,
            quantity: Number(item.docQty) || 0,
            expDate: item.docExpdate,
            batchCost: item.itemprice,
          });
        }
      }
    });

    // Consolidate duplicate batch numbers and sync totals
    return Array.from(grouped.values()).map((g) => {
      // Consolidate individualBatches if present
      if (getConfigValue('BATCH_NO') === "Yes" && g.batchDetails?.individualBatches?.length) {
        const consolidated = new Map();
        g.batchDetails.individualBatches.forEach((b) => {
          const k = b.batchNo || "No Batch";
          const prev = consolidated.get(k);
          if (prev) {
            prev.quantity += Number(b.quantity) || 0;
            if (!prev.expDate && b.expDate) prev.expDate = b.expDate;
          } else {
            consolidated.set(k, {
              batchNo: b.batchNo,
              quantity: Number(b.quantity) || 0,
              expDate: b.expDate,
              batchCost: b.batchCost,
            });
          }
        });
        g.batchDetails.individualBatches = Array.from(consolidated.values());
      }

      // Consolidate FEFO batches if present
      if (getConfigValue('BATCH_NO') === "Yes" && g.fefoBatches?.length) {
        const consolidated = new Map();
        g.fefoBatches.forEach((b) => {
          const k = b.batchNo || "No Batch";
          const prev = consolidated.get(k);
          if (prev) {
            prev.quantity += Number(b.quantity) || 0;
            if (!prev.expDate && b.expDate) prev.expDate = b.expDate;
          } else {
            consolidated.set(k, {
              batchNo: b.batchNo,
              quantity: Number(b.quantity) || 0,
              expDate: b.expDate,
              batchCost: b.batchCost,
            });
          }
        });
        g.fefoBatches = Array.from(consolidated.values());
      }

      g.docTtlqty = g.docQty; // Sync totals
      return g;
    });
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
      trnType: "VGRN",
      trnDbQty: null,
      trnCrQty: null,
      trnQty: Number(item.docQty) * -1, // Use aggregated docQty, then multiply by -1 for returns
      trnBalqty: Number(item.docQty) * -1, // Use aggregated docQty
      trnBalcst: item.docAmt * -1,
      trnAmt: item.docAmt * -1,
      trnCost: item.docAmt * -1,
      trnRef: null,
      hqUpdate: false,
      lineNo: item.docLineno,
      itemUom: item.docUom,
      movType: "VGRN",
      // Only set itemBatch if batch functionality is enabled
      itemBatch: getConfigValue('BATCH_NO') === "Yes" ? 
        (() => {
          // First check for grouped batch details (from groupCartItemsByItem)
          // This contains both specific batches and FEFO batches after grouping
          if (item?.batchDetails?.individualBatches?.length > 0) {
            return item.batchDetails.individualBatches.map(batch => batch.batchNo || "No Batch").join(',');
          }
          // Fallback: Check based on transfer type
          if (item?.transferType === "specific" && item?.batchDetails?.individualBatches?.length > 0) {
            return item.batchDetails.individualBatches.map(batch => batch.batchNo).join(',');
          }
          if (item?.transferType === "fefo" && item?.fefoBatches?.length > 0) {
            return item.fefoBatches.map(batch => batch.batchNo || "No Batch").join(',');
          }
          return item?.docBatchNo || null;
        })() : null,
      itemBatchCost: item.itemprice,
      stockIn: null,
      transPackageLineNo: null,
      // Only set docExpdate if batch functionality is enabled and we have a valid date
              docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? item.docExpdate : null,
      useExistingBatch: item.useExistingBatch,
      // docExpdate: process.env.REACT_APP_EXPIRY_DATE === "Yes"
      //   ? item.docExpdate
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
        if (!validateForm(stockHdrs, cartData, supplierInfo, type)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }

        const docNo = urlDocNo || stockHdrs.docNo;
        const details = cartData;
        
        // Calculate new totals based on updated details for posted docs
        const newTotals = calculateTotals(details);
        
        // Create header data - for posted docs, only allow editing ref, remarks, term, supplier, and delivery date
        const headerData = {
          docNo: stockHdrs.docNo,
          movCode: stockHdrs.movCode, // Keep original
          movType: stockHdrs.movType, // Keep original
          storeNo: stockHdrs.storeNo, // Keep original
          supplyNo: stockHdrs.supplyNo, // ALLOW EDITING - Supplier can be changed
          docRef1: stockHdrs.docRef1, // ALLOW EDITING
          docRef2: stockHdrs.docRef2, // ALLOW EDITING
          docLines: stockHdrs.docLines, // Keep original
          docDate: stockHdrs.docDate, // Keep original
          recExpect: stockHdrs.deliveryDate, // ALLOW EDITING - Delivery date can be changed
          postDate: stockHdrs.postDate, // Keep original post date
          docStatus: "7", // Keep as posted
          docTerm: stockHdrs.docTerm, // ALLOW EDITING
          docQty: newTotals.totalQty, // ✅ RECALCULATE - Update with new total quantity
          docAmt: newTotals.totalAmt, // ✅ RECALCULATE - Update with new total amount
          docAttn: supplierInfo.Attn, // ALLOW EDITING - Supplier attention can be changed
          docRemk1: stockHdrs.docRemk1, // ALLOW EDITING
          staffNo: stockHdrs.staffNo, // Keep original
          bname: supplierInfo.Attn, // ALLOW EDITING - Supplier name can be changed
          baddr1: supplierInfo.line1, // ALLOW EDITING - Supplier address can be changed
          baddr2: supplierInfo.line2, // ALLOW EDITING - Supplier address can be changed
          baddr3: supplierInfo.line3, // ALLOW EDITING - Supplier address can be changed
          bpostcode: supplierInfo.pcode, // ALLOW EDITING - Supplier postcode can be changed
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
        navigate("/goods-return-note?tab=all");
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
        movCode: "VGRN",
        movType: "VGRN",
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
        
        // Pre-calculate FEFO batches for all items
        const processedDetails = await Promise.all(
          details.map(async (item) => await calculateFefoBatches(item))
        );
        
        // Group cart items by itemcode+uom to combine multiple batches (AFTER FEFO calculation)
        const groupedDetails = groupCartItemsByItem(processedDetails);
        console.log("Grouped details:", groupedDetails);

        // Create STKTRN records - one per unique item (not per batch)
        // Batch details are tracked in Stktrnbatches table
        const stktrns = groupedDetails.map((item) =>
          createTransactionObject(item, docNo, userDetails.siteCode)
        );

        console.log(stktrns, "stktrns");

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

          const stktrnsResponse = await apiService.post("Stktrns", stktrns);
          
          // Update stktrns records with response IDs
          if (stktrnsResponse && Array.isArray(stktrnsResponse)) {
            stktrns.forEach((record, index) => {
              if (stktrnsResponse[index] && stktrnsResponse[index].id) {
                record.id = stktrnsResponse[index].id;
              }
            });
          }

          // Create Stktrnbatches records for each batch (AFTER Stktrns are posted)
          // Pass the grouped details which contains the consolidated batch information
          await createStktrnbatchesRecords(stktrns, groupedDetails, "return");

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

          // 10) Update ItemBatches quantity - use processedDetails (original line items) for correct batch updates
          for (const cartItem of processedDetails) {
            const trimmedItemCode = cartItem.itemcode.replace(/0000$/, "");
            
            // Find corresponding stktrn for this item
            const stktrn = stktrns.find(s => 
              s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
              s.itemUom === cartItem.docUom
            );
            
            if (!stktrn) {
              console.warn(`No matching stktrn found for ${trimmedItemCode} (${cartItem.docUom})`);
              continue;
            }

            if (getConfigValue('BATCH_SNO') === "Yes") {
              const params = new URLSearchParams({
                docNo: stktrn.trnDocno,
                itemCode: stktrn.itemcode,
                uom: stktrn.itemUom,
                itemsiteCode: stktrn.storeNo,
                Qty: stktrn.trnQty,
                ExpDate: stktrn?.docExpdate ? stktrn?.docExpdate : null,
                formName: "GRNReturn",
                batchCost: Number(stktrn.itemBatchCost),
              });

              const payload = {
                itemCode: stktrn.itemcode?.replace(/0000$/, ""),
                siteCode: stktrn.storeNo,
                batchSNo: stktrn.itemBatch,
                DocNo: stktrn.trnDocno,
                DocOutNo: "",
                uom: stktrn.itemUom,
                availability: true,
                expDate: stktrn.docExpdate
                  ? new Date(stktrn.docExpdate).toISOString()
                  : null,
                batchCost: Number(stktrn.itemBatchCost) || 0,
              };

              try {
                await apiService1.get(
                  `api/postItemBatchSno?${params.toString()}`
                );
              } catch (err) {
                const errorLog = {
                  trnDocNo: stktrn.trnDocno,
                  itemCode: stktrn.itemcode,
                  loginUser: userDetails.username,
                  siteCode: userDetails.siteCode,
                  logMsg: `api/postItemBatchSno error: ${err.message}`,
                  createdDate: new Date().toISOString().split("T")[0],
                };
              }
            }

            let batchUpdate;

            if (getConfigValue('BATCH_NO') === "Yes") {
              if (cartItem.transferType === 'specific' && cartItem.batchDetails?.individualBatches?.length) {
                // Specific batch selection - process each batch from this exact line item
                console.log(`🔄 Processing specific batch return for ${trimmedItemCode}`);
                
                for (const batchDetail of cartItem.batchDetails.individualBatches) {
                  if (batchDetail.quantity > 0) {
                    batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: userDetails.siteCode,
                      uom: cartItem.docUom,
                      qty: -batchDetail.quantity, // Negative for return
                      batchcost: 0,
                      batchno: batchDetail.batchNo,
                    };

                    await apiService
                      .post("ItemBatches/updateqty", batchUpdate)
                      .catch(async (err) => {
                        const errorLog = {
                          trnDocNo: docNo,
                          itemCode: stktrn.itemcode,
                          loginUser: userDetails.username,
                          siteCode: userDetails.siteCode,
                          logMsg: `ItemBatches/updateqty specific batch error: ${err.message}`,
                          createdDate: new Date().toISOString().split("T")[0],
                        };
                      });
                  }
                }
                
                // Process "No Batch" quantity if any
                if (cartItem.batchDetails.noBatchTransferQty > 0) {
                  batchUpdate = {
                    itemcode: trimmedItemCode,
                    sitecode: userDetails.siteCode,
                    uom: cartItem.docUom,
                    qty: -cartItem.batchDetails.noBatchTransferQty,
                    batchcost: 0,
                    batchno: "",
                  };

                  await apiService
                    .post("ItemBatches/updateqty", batchUpdate)
                    .catch(async (err) => {
                      const errorLog = {
                        trnDocNo: docNo,
                        itemCode: stktrn.itemcode,
                        loginUser: userDetails.username,
                        siteCode: userDetails.siteCode,
                        logMsg: `ItemBatches/updateqty no batch error: ${err.message}`,
                        createdDate: new Date().toISOString().split("T")[0],
                      };
                    });
                }
              } else if (cartItem.fefoBatches?.length) {
                // FEFO return - process batches from this exact line item
                console.log(`🔄 Processing FEFO batch return for ${trimmedItemCode}`);
                
                for (const fefoBatch of cartItem.fefoBatches) {
                  batchUpdate = {
                    itemcode: trimmedItemCode,
                    sitecode: userDetails.siteCode,
                    uom: cartItem.docUom,
                    qty: -fefoBatch.quantity, // Negative for return
                    batchcost: 0,
                    batchno: fefoBatch.batchNo || "",
                  };

                  await apiService
                    .post("ItemBatches/updateqty", batchUpdate)
                    .catch(async (err) => {
                      const errorLog = {
                        trnDocNo: docNo,
                        itemCode: stktrn.itemcode,
                        loginUser: userDetails.username,
                        siteCode: userDetails.siteCode,
                        logMsg: `ItemBatches/updateqty FEFO error: ${err.message}`,
                        createdDate: new Date().toISOString().split("T")[0],
                      };
                    });
                }
              }
            } else {
              batchUpdate = {
                itemcode: trimmedItemCode,
                sitecode: userDetails.siteCode,
                uom: cartItem.docUom,
                qty: Number(cartItem.docQty),
                batchcost: 0,
              };

              await apiService
                .post("ItemBatches/updateqty", batchUpdate)
                .catch(async (err) => {
                  const errorLog = {
                    trnDocNo: docNo,
                    itemCode: stktrn.itemcode,
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
      navigate("/goods-return-note?tab=all");
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
    console.log(newPage, "newPage");
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

  // NEW: Batch selection for RTN with modal
  const handleRowBatchSelection = async (item, index) => {
    if (getConfigValue('BATCH_NO') !== "Yes") {
      toast.error("Batch functionality is not enabled");
      return;
    }

    if (getConfigValue('ManualBatchSelection') !== true) {
      toast.error("Manual batch selection is disabled");
      return;
    }

    // Always check if quantity is entered and valid
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity first");
      return;
    }

    // Set loading state for this specific item
    setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: true }));
    try {
      // Fetch ItemBatches for this item from the current store (source)
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode },
            { siteCode: userDetails.siteCode }, // Current store (source)
            { uom: item.uom }
          ]
        }
      };

      const response = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
      );

      if (!response || response.length === 0) {
        toast.error("No batch information found for this item");
        return;
      }

      // Check if there are actual batches with batch numbers available
      const actualBatches = response.filter(batch => 
        batch.batchNo && batch.batchNo.trim() !== "" && Number(batch.qty) > 0
      );

      if (actualBatches.length === 0) {
        toast.error("No batches with batch numbers available for this item. Only 'No Batch' items exist.");
        return;
      }

      // Process batch data for the modal
      const batchBreakdown = response.map(batch => ({
        batchNo: batch.batchNo || "",
        availableQty: Number(batch.qty) || 0,
        expDate: batch.expDate || null,
        batchCost: Number(batch.batchCost) || 0
      }));

      // Calculate totals
      const totalBatchQty = batchBreakdown.filter(b => b.batchNo !== "").reduce((sum, b) => sum + b.availableQty, 0);
      const noBatchQty = batchBreakdown.find(b => b.batchNo === "")?.availableQty || 0;
      const transferQty = Number(item.Qty);

      // Create scenario message
      let scenarioMessage = "";
      if (totalBatchQty >= transferQty) {
        scenarioMessage = `Sufficient batch quantities available. You can select specific batches to return ${transferQty} units.`;
      } else if (totalBatchQty + noBatchQty >= transferQty) {
        scenarioMessage = `Batch quantities (${totalBatchQty}) are insufficient. You'll need to include ${transferQty - totalBatchQty} units from "No Batch" items.`;
      } else {
        scenarioMessage = `Insufficient total quantities available. Total available: ${totalBatchQty + noBatchQty}, Required: ${transferQty}.`;
      }

      // Set modal data
      setBatchBreakdown(batchBreakdown);
      setTransferQty(transferQty);
      setTotalBatchQty(totalBatchQty);
      setNoBatchQty(noBatchQty);
      setScenarioMessage(scenarioMessage);
      setEditData(item); // Store the item for later use
      setShowBatchDialog(true);
      
    } catch (error) {
      console.error("Error fetching batch information:", error);
      toast.error("Failed to fetch batch information");
    } finally {
      setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: false }));
    }
  };

  // NEW: Handle batch selection submit for RTN
  const handleBatchSelectionSubmit = (selectedBatchData) => {
    if (!selectedBatchData) return;

    // For RTN, batch selection only stores the selection, doesn't add to cart
    // User must still click + icon to add to cart
    const returnQty = Number(editData?.Qty || 0);
    
    // Handle multiple batch selection
    if (selectedBatchData.selectedBatches && selectedBatchData.selectedBatches.length > 0) {
      // Multiple batches selected
      const batchDetails = selectedBatchData.selectedBatches.map(batch => ({
        batchNo: batch.batchNo,
        expDate: batch.expDate,
        quantity: batch.quantity
      }));
      
      const totalBatchQty = batchDetails.reduce((sum, b) => sum + b.quantity, 0);
      const noBatchReturnQty = selectedBatchData.noBatchQty || Math.max(0, returnQty - totalBatchQty);

      // Update the stock item to show that specific batches are selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === editData.stockCode 
            ? { 
                ...stockItem, 
                selectedBatches: {
                  batchNo: selectedBatchData.batchNo, // Combined batch numbers
                  expDate: selectedBatchData.expDate, // Combined expiry dates
                  batchTransferQty: totalBatchQty,
                  noBatchTransferQty: noBatchReturnQty,
                  totalTransferQty: returnQty,
                  transferType: 'specific',
                  batchDetails: batchDetails
                }
              }
            : stockItem
        )
      );

      toast.success(`Specific batch selection saved for ${editData.stockCode}. Click + to add to cart.`);
    } else {
      // No specific batches selected, use FEFO
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === editData.stockCode 
            ? { 
                ...stockItem, 
                selectedBatches: {
                  transferType: 'fefo',
                  batchDetails: null
                }
              }
            : stockItem
        )
      );

      toast.success(`FEFO return mode selected for ${editData.stockCode}. Click + to add to cart.`);
    }

    setShowBatchDialog(false);
  };

  // NEW: Handle removing batch selection
  const handleRemoveBatchSelection = (index, item) => {
    setStockList((prev) =>
      prev.map((stockItem, i) =>
        i === index 
          ? { 
              ...stockItem, 
              selectedBatches: null // Remove batch selection
            }
          : stockItem
      )
    );
    toast.success("Batch selection removed");
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
            // 1. Get the ORIGINAL Stktrns record (what was posted before)
            const originalStktrnFilter = {
              where: {
                and: [
                  { trnDocno: docNo },
                  { storeNo: userDetails.siteCode },
                  { itemcode: item.itemcode + "0000" }
                ]
              }
            };

            const originalStktrn = await apiService.get(
              `Stktrns?filter=${encodeURIComponent(JSON.stringify(originalStktrnFilter))}`
            );

            // 2. Get CURRENT balance from ItemOnQties
            const currentBalanceFilter = {
              where: {
                and: [
                  { itemcode: item.itemcode + "0000" },
                  { uom: item.docUom },
                  { sitecode: userDetails.siteCode }
                ]
              }
            };
            
            console.log(`🔍 ItemOnQties filter:`, currentBalanceFilter);

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
                "storeNo": userDetails.siteCode,
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
                storeNo: userDetails.siteCode,
                tstoreNo: null,
                fstoreNo: null,
                trnDocno: docNo,
                trnType: "RTN",
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
                movType: "RTN",
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
            
            if (getConfigValue('BATCH_NO') === "Yes") {
              // WITH BATCH NUMBERS: Find and update specific batch record
              console.log(`Processing ItemBatch update with BATCH_NO=Yes for ${item.itemcode}`);
              
              // Include expiry date in filter to ensure batches with same batch number but different expiry dates are treated separately
              const normalizedExpDate = normalizeExpDate(item.docExpdate);
              const specificBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: userDetails.siteCode },
                    { uom: item.docUom },
                    { batchNo: item.docBatchNo || "" },
                    ...(normalizedExpDate ? { expDate: normalizedExpDate } : {}), // Include expiry date if available
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
                    { siteCode: userDetails.siteCode },
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

  // NEW: Transfer Preview Modal for RTN
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const showTransferPreview = (item) => {
    // Debug: Log batch details structure
    console.log('🔍 Preview item batch details:', {
      batchDetails: item.batchDetails,
      individualBatches: item.batchDetails?.individualBatches,
      hasExpDate: item.batchDetails?.individualBatches?.map(b => ({ batchNo: b.batchNo, expDate: b.expDate }))
    });
    setPreviewItem(item);
    setShowPreviewModal(true);
  };

  // Transfer Preview Modal Component
  const TransferPreviewModal = memo(({ showPreviewModal, setShowPreviewModal, previewItem }) => {
    if (!previewItem) return null;

    return (
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Return Details Preview</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Item: {previewItem.itemcode} - {previewItem.itemdesc}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Return Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Return Summary</p>
                  <div className="mt-2 text-xs space-y-1">
                    <p><strong>Total Return Qty:</strong> {previewItem.docQty}</p>
                    <p><strong>Return Type:</strong> Specific Batches</p>
                    <p><strong>From Store:</strong> {stockHdrs.fstoreNo}</p>
                    <p><strong>To Store:</strong> {stockHdrs.tstoreNo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Details */}
            {previewItem.batchDetails && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Batch Breakdown</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium">Batch No</th>
                        <th className="text-right p-2 font-medium">Quantity</th>
                        <th className="text-left p-2 font-medium">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItem.batchDetails.individualBatches?.map((batch, index) => {
                        // Try multiple sources for expiry date
                        const expDate = batch.expDate || batch.expiryDate || null;
                        return (
                          <tr key={index} className="border-t">
                            <td className="p-2 font-medium">{batch.batchNo}</td>
                            <td className="p-2 text-right">{batch.quantity}</td>
                            <td className="p-2 text-xs">
                              {expDate ? format_Date(expDate) : "No Expiry"}
                            </td>
                          </tr>
                        );
                      })}
                      {previewItem.batchDetails.noBatchTransferQty > 0 && (
                        <tr className="border-t bg-gray-50">
                          <td className="p-2 font-medium text-gray-600">No Batch</td>
                          <td className="p-2 text-right text-gray-600">{previewItem.batchDetails.noBatchTransferQty}</td>
                          <td className="p-2 text-xs text-gray-600">N/A</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Return Flow Info */}
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Return Flow</p>
                  <p className="text-xs mt-1">
                    Items will be returned from {stockHdrs.fstoreNo} to {stockHdrs.tstoreNo} using the selected batch quantities.
                    {previewItem.batchDetails?.noBatchTransferQty > 0 && 
                      ` Balance ${previewItem.batchDetails.noBatchTransferQty} will be taken from "No Batch" items.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });

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
                ? "View Goods Return Note"
                : urlStatus == 0
                ? "Update Goods Return Note"
                : "Add Goods Return Note"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/goods-return-note?tab=all")}
                disabled={saveLoading || postLoading}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  (stockHdrs.docStatus === 7 
                   ) ||
                  saveLoading
                }
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
                disabled={
                  (stockHdrs.docStatus === 7 &&
                    userDetails?.isSettingPostedChangePrice !== "True") ||
                  postLoading
                }
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
                    <Label>RTN Ref 1</Label>
                    <Input
                      placeholder="Enter RTN Ref 1"
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
                      value={stockHdrs.deliveryDate}
                      onChange={(e) => handleDateChange(e, "deliveryDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RTN Ref 2</Label>
                    <Input
                      disabled={urlStatus == 7}
                      placeholder="Enter RTN Ref 2"
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

                      {/* Existing checkboxes */}
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
                      showBatchColumns={true}
                      // Add sorting functionality
                      enableSorting={true}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                      // NEW: Batch selection for RTN with modal
                      onBatchSelection={(index, item) => handleRowBatchSelection(item, index)}
                      onRemoveBatchSelection={handleRemoveBatchSelection}
                      isBatchLoading={false} // Global loading not needed
                      itemBatchLoading={itemBatchLoading} // Pass per-item loading state
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
                <TableHeader className="bg-slate-100">
                  <TableRow className="border-b border-slate-200">
                    {urlStatus != 7 ||
                    (urlStatus == 7 &&
                      userDetails?.isSettingPostedChangePrice === "True") ? (
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
                    {/* NEW: Transfer Type column instead of batch columns */}
                    <TableHead>Transfer Type</TableHead>
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
                          {urlStatus != 7 ||
                          (urlStatus == 7 &&
                            userDetails?.isSettingPostedChangePrice === "True") ? (
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
                          {/* NEW: Transfer Type column instead of batch columns */}
                          <TableCell>
                            {item.transferType === 'specific' ? (
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  Specific Batches
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => showTransferPreview(item)}
                                  className="h-6 px-2 text-xs"
                                >
                                  Preview
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                FEFO
                              </Badge>
                            )}
                          </TableCell>
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
                        {userDetails?.isSettingViewPrice === "True" && <TableCell />}

                        {userDetails?.isSettingViewPrice === "True" && (
                          <TableCell className="font-semibold text-slate-700">
                            {calculateTotals(cartData).totalAmt.toFixed(2)}
                          </TableCell>
                        )}
                        {/* NEW: Transfer Type column instead of batch columns */}
                        <TableCell />
                        <TableCell />
                        {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                          <TableCell />
                        ) : null}
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
            <AlertDialogAction onClick={() => setShowValidationDialog(false)} className="cursor-pointer">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BatchSelectionDialog
        showBatchDialog={showBatchDialog}
        setShowBatchDialog={setShowBatchDialog}
        batchBreakdown={batchBreakdown}
        transferQty={transferQty}
        totalBatchQty={totalBatchQty}
        noBatchQty={noBatchQty}
        scenarioMessage={scenarioMessage}
        onBatchSelectionSubmit={handleBatchSelectionSubmit}
        itemcode={editData?.stockCode}
        itemdesc={editData?.stockName}
      />
      <TransferPreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewItem={previewItem}
      />
    </>
  );
}

export default AddRtn;
