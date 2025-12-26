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
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import ItemTable from "@/components/itemTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableSpinner from "@/components/tabelSpinner";
import apiService1 from "@/services/apiService1";

// Batch Selection Dialog for Stock Usage Memo
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

    // Validate that selected quantity matches the required usage quantity
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
        quantity: batchQuantities[batch.batchNo],
        batchCost: batch.batchCost || 0
      }))
    };

    onBatchSelectionSubmit(combinedBatchData);
  };

  return (
    <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Select Specific Batches for Usage</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Choose specific batches to use for item: <strong>{itemcode}</strong> - {itemdesc}
          </div>
        </DialogHeader>

        {/* Usage Summary */}
        {scenarioMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Usage Summary</p>
                <p className="text-xs mt-1">{scenarioMessage}</p>
                <div className="mt-2 text-xs space-y-1">
                  <p><strong>Usage Qty:</strong> {transferQty}</p>
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

          {/* Usage Mode Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Multi-Batch Selection Mode</p>
                <p className="text-xs mt-1">
                  Select multiple batches to reach your usage quantity. You can select different quantities from each batch.
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
                  value={editData?.docQty || ""}
                  onChange={(e) => onEditCart(e, "docQty")}
                  className="w-full"
                  disabled={urlStatus == 7 || (editData?.transferType === 'specific' && editData?.batchDetails)}
                />
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

function AddSum({ docData }) {
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
  const [itemTotal, setItemTotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [supplyOptions, setSupplyOptions] = useState([]);
  const [stockList, setStockList] = useState([]);
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  const [editData, setEditData] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isBatchEdit, setIsBatchEdit] = useState(false);

  const [filter, setFilter] = useState({
    movCode: "SUM",
    splyCode: "",
    docNo: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
  });

  const [itemFilter, setItemFilter] = useState({
    // where: {
    //   movCode: "ADJ",
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
    createUser: userDetails?.username,
  });
  const [cartData, setCartData] = useState([]);
  const [originalStockList, setOriginalStockList] = useState([]);
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
  const [filters, setFilters] = useState({
    brand: [],
    range: [],
    department: ["RETAIL PRODUCT", "SALON PRODUCT"],
  });

  // Add these state declarations near other states
  const [searchTimer, setSearchTimer] = useState(null);

  // Batch selection state
  const [itemBatchLoading, setItemBatchLoading] = useState({});
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchBreakdown, setBatchBreakdown] = useState([]);
  const [transferQty, setTransferQty] = useState(0);
  const [totalBatchQty, setTotalBatchQty] = useState(0);
  const [noBatchQty, setNoBatchQty] = useState(0);
  const [scenarioMessage, setScenarioMessage] = useState("");
  const [currentBatchItem, setCurrentBatchItem] = useState(null);

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

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
              movCode: "SUM",
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
          // If creating new document - docNo will be generated on save/post
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
        supplyNo: data.supplyNo,
        docRef1: data.docRef1,
        docRef2: data.docRef2,
        docTerm: data.docTerm,
        storeNo: data.storeNo,
        docRemk1: data.docRemk1,
        postDate: moment(data.postDate).format("YYYY-MM-DD"),
      }));
      // setSupplierInfo({
      //   Attn: data?.docAttn,
      //   line1: data?.baddr1,
      //   line2: data?.baddr2,
      //   line3: data?.baddr3,
      //   pcode: data?.bpostcode,
      //   sline1: data?.daddr1,
      //   sline2: data?.daddr2,
      //   sline3: data?.daddr3,
      //   spcode: data?.dpostcode,
      // });

      console.log("Stock header data updated");
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

  // const getStockDetails = async () => {
  //   const filter = buildFilterObject(itemFilter);
  //   const countFilter = buildCountObject(itemFilter);
  //   console.log(countFilter, "filial");
  //   // const query = `?${qs.stringify({ filter }, { encode: false })}`;
  //   const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
  //   const countQuery = `?where=${encodeURIComponent(
  //     JSON.stringify(countFilter.where)
  //   )}`;

  //   Promise.all([
  //     apiService.get(`PackageItemDetails${query}`),
  //     apiService.get(`PackageItemDetails/count${countQuery}`),
  //   ])
  //     .then(([stockDetails, count]) => {
  //       setLoading(false);
  //       const updatedRes = stockDetails.map((item) => ({
  //         ...item,
  //         stockCode: item.stockCode || item.stock_code,
  //         stockName: item.stockName || item.stock_name,
  //         uomDescription: item.itemUom || item.uom_description,
  //         Brand: item.brand || item.brand_code,
  //         Range: item.range || item.range_code,
  //         linkCode: item.linkCode || item.link_code,
  //         barCode: item.brandCode || item.bar_code,
  //         quantity: item.quantity || item.on_hand_qty,
  //         Qty: 0,
  //         Price: Number(item?.item_Price || item?.price || 0),
  //         Cost: Number(item?.item_Price || item?.price || 0),
  //         expiryDate: null,
  //         docAmt: null,
  //         isActive: "True", // Add this field for itemTable filtering
  //       }));
  //       console.log(updatedRes, "updatedRes");
  //       console.log(count, "count");

  //       setStockList(updatedRes);
  //       setOriginalStockList(updatedRes);
  //       setItemTotal(count.count);
  //     })
  //     .catch((err) => {
  //       setLoading(false);
  //       console.error("Error fetching stock details:", err);
  //       toast({
  //         variant: "destructive",
  //         title: "Error",
  //         description: "Failed to fetch stock details",
  //       });
  //     });
  // };


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
      const codeDesc = "Stock Usage Memo";
      const siteCode = userDetails?.siteCode;
      const res = await apiService.get(
        `ControlNos?filter={"where":{"and":[{"controlDescription":"${codeDesc}"},{"siteCode":"${siteCode}"}]}}`
      );

      if (!res?.[0]) return null;

      const docNo = res[0].controlPrefix + res[0].siteCode + res[0].controlNo;

      const controlDataObj = {
        docNo: docNo,
        RunningNo: res[0].controlNo,
      };

      return { docNo, controlData: controlDataObj };
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

  const addNewControlNumber = async (controlData) => {
    try {
      const controlNo = controlData.RunningNo;
      const newControlNo = (parseInt(controlNo, 10) + 1).toString();

      const controlNosUpdate = {
        controldescription: "Stock Usage Memo",
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

  const postStockDetails = async (cart = cartData) => {
    try {
      // First, find items to be deleted
      const itemsToDelete = cartItems.filter(
        (cartItem) => !cart.some((item) => item.docId === cartItem.docId)
      );

      // Group items by operation type
      const itemsToUpdate = cart.filter((item) => item.docId);
      const itemsToCreate = cart.filter((item) => !item.docId);

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
    } else if (type === "updateStatus") {
      try {
        let docNo = data.docNo;
        const res = await apiService.post(
          `StkMovdocHdrs/update?[where][docNo]=${docNo}`,
          data
        );
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

  const validateForm = () => {
    const errors = [];

    // Document Header Validations
    // docNo will be generated on save/post, so no validation needed here

    if (!stockHdrs.docDate) {
      errors.push("Document date is required");
    }

    if (!stockHdrs.supplyNo) {
      errors.push("Supply number is required");
    }

    // Cart Validation
    if (cartData.length === 0) {
      errors.push("Cart shouldn't be empty");
    }

    // Supplier Info Validations
    // if (!supplierInfo.Attn) {
    //   errors.push("Attention To is required");
    // }

    // if (!supplierInfo.line1) {
    //   errors.push("Address is required");
    // }

    // if (!supplierInfo.sline1) {
    //   errors.push("Shipping address is required");
    // }

    // if (!supplierInfo.spcode) {
    //   errors.push("Shipping postal code is required");
    // }

    // if (!supplierInfo.pcode) {
    //   errors.push("Postal code is required");
    // }

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

  const handleEditSubmit = useCallback(
    (updatedEditData) => {
      if (!updatedEditData.docQty) {
        toast.error("Quantity is required");
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
    console.log(newCartItem, "newCartItem");

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

  // Batch selection handlers
  const handleRowBatchSelection = async (item, index) => {
    if (getConfigValue("BATCH_NO") !== "Yes") {
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
    setItemBatchLoading((prev) => ({ ...prev, [item.stockCode]: true }));
    try {
      // Fetch ItemBatches for this item from the current store
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode },
            { siteCode: userDetails.siteCode },
            { uom: item.itemUom || item.uomDescription || item.uom },
          ],
        },
      };

      const response = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
      );

      if (!response || response.length === 0) {
        toast.error("No batch information found for this item");
        return;
      }

      // Check if there are any batches with actual batch numbers (not empty strings)
      const actualBatches = response.filter(
        (batch) =>
          batch.batchNo && batch.batchNo.trim() !== "" && Number(batch.qty) > 0
      );

      if (actualBatches.length === 0) {
        toast.error(
          "No batches with batch numbers available for this item. Only 'No Batch' items exist."
        );
        return;
      }

      // Process batch data
      const batches = response.map((batch) => ({
        batchNo: batch.batchNo || "",
        availableQty: Number(batch.qty) || 0,
        expDate: batch.expDate,
        batchCost: batch.batchCost,
      }));

      // Sort by expiry date (FEFO) - actual batches first, then "No Batch"
      const sortedActualBatches = actualBatches
        .map((batch) => ({
          batchNo: batch.batchNo,
          availableQty: Number(batch.qty) || 0,
          expDate: batch.expDate,
          batchCost: batch.batchCost,
        }))
        .sort((a, b) => {
          if (!a.expDate && !b.expDate) return 0;
          if (!a.expDate) return 1;
          if (!b.expDate) return -1;
          return new Date(a.expDate) - new Date(b.expDate);
        });

      const noBatchItems = response
        .filter(
          (b) => (!b.batchNo || b.batchNo.trim() === "") && Number(b.qty) > 0
        )
        .map((batch) => ({
          batchNo: "",
          availableQty: Number(batch.qty) || 0,
          expDate: null,
          batchCost: batch.batchCost,
        }));

      const sortedBatches = [...sortedActualBatches, ...noBatchItems];

      // Calculate totals
      const totalBatchQty = sortedActualBatches.reduce(
        (sum, b) => sum + b.availableQty,
        0
      );
      const noBatchQty = noBatchItems.reduce(
        (sum, b) => sum + b.availableQty,
        0
      );
      const usageQty = Number(item.Qty);

      // Generate scenario message
      let scenarioMessage = "";
      if (usageQty <= totalBatchQty) {
        scenarioMessage = `Usage can be completed using available batches. ${usageQty} from batches, 0 from "No Batch".`;
      } else {
        const remainingQty = usageQty - totalBatchQty;
        scenarioMessage = `Usage requires ${totalBatchQty} from batches and ${remainingQty} from "No Batch" items.`;
      }

      // Store current item for batch selection
      setCurrentBatchItem({ ...item, index });
      setTransferQty(usageQty);
      setTotalBatchQty(totalBatchQty);
      setNoBatchQty(noBatchQty);
      setScenarioMessage(scenarioMessage);
      setBatchBreakdown(sortedBatches);
      setShowBatchDialog(true);
    } catch (error) {
      console.error("Error fetching batch information:", error);
      toast.error("Failed to fetch batch information");
    } finally {
      // Clear loading state for this specific item
      setItemBatchLoading((prev) => ({ ...prev, [item.stockCode]: false }));
    }
  };

  const handleBatchSelectionSubmit = (selectedBatchData) => {
    if (!selectedBatchData || !currentBatchItem) return;

    const usageQty = Number(currentBatchItem.Qty || 0);

    // Handle multiple batch selection
    if (
      selectedBatchData.selectedBatches &&
      selectedBatchData.selectedBatches.length > 0
    ) {
      // Multiple batches selected
      const batchDetails = selectedBatchData.selectedBatches.map((batch) => ({
        batchNo: batch.batchNo,
        expDate: batch.expDate,
        quantity: batch.quantity,
        batchCost: batch.batchCost || 0
      }));

      const totalBatchQty = batchDetails.reduce(
        (sum, b) => sum + b.quantity,
        0
      );
      const noBatchTransferQty =
        selectedBatchData.noBatchQty ||
        Math.max(0, usageQty - totalBatchQty);

      // Update the stock item to show that specific batches are selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === currentBatchItem.stockCode
            ? {
                ...stockItem,
                selectedBatches: {
                  batchNo: selectedBatchData.batchNo, // Combined batch numbers
                  expDate: selectedBatchData.expDate, // Combined expiry dates
                  batchTransferQty: totalBatchQty,
                  noBatchTransferQty: noBatchTransferQty,
                  totalTransferQty: usageQty,
                  transferType: "specific", // Mark as specific batch transfer
                  batchDetails: batchDetails, // Store individual batch details
                },
              }
            : stockItem
        )
      );

      toast.success("Batch selection saved. Click + to add to cart.");
    } else if (selectedBatchData.noBatchQty > 0) {
      // Only No Batch selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === currentBatchItem.stockCode
            ? {
                ...stockItem,
                selectedBatches: {
                  batchNo: "",
                  expDate: "",
                  batchTransferQty: 0,
                  noBatchTransferQty: selectedBatchData.noBatchQty,
                  totalTransferQty: usageQty,
                  transferType: "specific",
                  batchDetails: [],
                },
              }
            : stockItem
        )
      );

      toast.success("No Batch selection saved. Click + to add to cart.");
    }

    setShowBatchDialog(false);
    setCurrentBatchItem(null);
  };

  const handleRemoveBatchSelection = (index, item) => {
    setStockList((prev) =>
      prev.map((stockItem, i) =>
        i === index
          ? {
              ...stockItem,
              selectedBatches: null, // Remove batch selection
            }
          : stockItem
      )
    );
    toast.success("Batch selection removed");
  };

  // Show usage preview for specific batch items
  const showUsagePreview = (item) => {
    console.log('🔍 Preview item batch details:', {
      batchDetails: item.batchDetails,
      individualBatches: item.batchDetails?.individualBatches,
      hasExpDate: item.batchDetails?.individualBatches?.map(b => ({ batchNo: b.batchNo, expDate: b.expDate }))
    });
    setPreviewItem(item);
    setShowPreviewModal(true);
  };

  const addToCart = (index, item) => {
    console.log(item, "item");
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const amount = Number(item.Qty) * Number(item.Price);

    const hasSpecificBatches = item.selectedBatches && item.selectedBatches.transferType === 'specific';

    // Prepare batch data for storage in database fields (ordMemo fields)
    let ordMemoFields = { ordMemo1: "fefo", ordMemo2: "", ordMemo3: "0", ordMemo4: "" };
    let docBatchNo = null; // Will be set based on batch selection

    // If specific batches are selected, update memo fields and set batch number
    if (hasSpecificBatches) {
      // For specific batches, set the primary batch number (first batch or combined)
      docBatchNo = item.selectedBatches.batchNo || "";
      
      ordMemoFields = {
        ordMemo1: "specific",
        ordMemo2: item.selectedBatches.batchDetails.map(b => `${b.batchNo}:${b.quantity}`).join(','),
        ordMemo3: item.selectedBatches.noBatchTransferQty.toString(),
        ordMemo4: item.selectedBatches.batchDetails.map(b => `${b.expDate || ''}:${b.quantity}`).join(',')
      };
    }

    const newCartItem = {
      id: index + 1,
      docAmt: amount,
      docNo: stockHdrs.docNo,
      movCode: "SUM",
      movType: "SUM",
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
      docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? (item.expiryDate || "") : "",
      itmBrand: item.BrandCode,
      itmRange: item.RangeCode,
      itmBrandDesc: item.Brand,
      itmRangeDesc: item.Range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: "",
      docMdisc: 0,
      recTtl: 0,
      // Store batch number
      docBatchNo: docBatchNo,
      // Store transfer type and batch details in memo fields
      ...ordMemoFields,
      // Preserve batch selection data for runtime use
      transferType: hasSpecificBatches ? 'specific' : 'fefo',
      batchDetails: hasSpecificBatches ? {
        batchNo: item.selectedBatches.batchNo,
        expDate: item.selectedBatches.expDate,
        batchTransferQty: item.selectedBatches.batchTransferQty,
        noBatchTransferQty: item.selectedBatches.noBatchTransferQty,
        totalTransferQty: item.selectedBatches.totalTransferQty,
        individualBatches: item.selectedBatches.batchDetails
      } : null,
      selectedBatches: item.selectedBatches
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

  const groupCartItemsByItem = (cartItems) => {
    const grouped = new Map();
    
    for (const item of cartItems) {
      const key = `${item.itemcode}|${item.docUom}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key);
        existing.docQty = Number(existing.docQty) + Number(item.docQty);
        existing.docAmt = Number(existing.docAmt) + Number(item.docAmt);
        
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
      } else {
        grouped.set(key, { 
          ...item,
          batchDetails: item.batchDetails || { individualBatches: [] },
          fefoBatches: item.fefoBatches || [],
          selectedBatches: item.selectedBatches,
          transferType: item.transferType
        });
      }
    }
    
    // Consolidate duplicate batch numbers and regenerate ordMemo fields
    return Array.from(grouped.values()).map((g) => {
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
              batchCost: b.batchCost
            });
          }
        });
        g.batchDetails.individualBatches = Array.from(consolidated.values());
        
        // Regenerate ordMemo fields based on consolidated batch details
        if (g.transferType === 'specific' && g.batchDetails.individualBatches.length > 0) {
          // Calculate noBatchTransferQty from consolidated batches
          const noBatchQty = g.batchDetails.individualBatches
            .filter(b => !b.batchNo || b.batchNo === "No Batch")
            .reduce((sum, b) => sum + Number(b.quantity), 0);
          
          const batchQty = g.batchDetails.individualBatches
            .filter(b => b.batchNo && b.batchNo !== "No Batch")
            .reduce((sum, b) => sum + Number(b.quantity), 0);
          
          g.ordMemo1 = "specific";
          g.ordMemo2 = g.batchDetails.individualBatches
            .filter(b => b.batchNo && b.batchNo !== "No Batch")
            .map(b => `${b.batchNo}:${b.quantity}`)
            .join(',');
          g.ordMemo3 = noBatchQty.toString();
          g.ordMemo4 = g.batchDetails.individualBatches
            .filter(b => b.batchNo && b.batchNo !== "No Batch")
            .map(b => `${b.expDate || ''}:${b.quantity}`)
            .join(',');
          
          // Update docBatchNo with first batch or combined batches
          const batchNos = g.batchDetails.individualBatches
            .filter(b => b.batchNo && b.batchNo !== "No Batch")
            .map(b => b.batchNo);
          g.docBatchNo = batchNos.join(',');
        } else {
          // FEFO mode
          g.ordMemo1 = "fefo";
          g.ordMemo2 = "";
          g.ordMemo3 = "0";
          g.ordMemo4 = "";
        }
      }
      
      // Consolidate fefoBatches if present (merge duplicate batch numbers)
      if (getConfigValue('BATCH_NO') === "Yes" && g.fefoBatches?.length > 0) {
        const consolidatedFefo = new Map();
        g.fefoBatches.forEach((b) => {
          const k = b.batchNo || "No Batch";
          const prev = consolidatedFefo.get(k);
          if (prev) {
            prev.quantity += Number(b.quantity) || 0;
            if (!prev.expDate && b.expDate) prev.expDate = b.expDate;
            if (!prev.batchCost && b.batchCost) prev.batchCost = b.batchCost;
          } else {
            consolidatedFefo.set(k, {
              batchNo: b.batchNo,
              quantity: Number(b.quantity) || 0,
              expDate: b.expDate,
              batchCost: b.batchCost
            });
          }
        });
        g.fefoBatches = Array.from(consolidatedFefo.values());
      }
      
      if (!g.batchDetails?.individualBatches?.length) {
        // No batch details, default to FEFO
        g.ordMemo1 = g.ordMemo1 || "fefo";
        g.ordMemo2 = g.ordMemo2 || "";
        g.ordMemo3 = g.ordMemo3 || "0";
        g.ordMemo4 = g.ordMemo4 || "";
      }
      return g;
    });
  };

  // Helper function to pre-calculate FEFO batch selection
  const calculateFefoBatches = async (item) => {
    if (getConfigValue('BATCH_NO') !== "Yes") {
      return item;
    }

    // Skip FEFO if manual batch selection exists
    if (item.selectedBatches?.transferType === 'specific' || item.batchDetails?.individualBatches?.length > 0) {
      return item;
    }

    try {
      // Find all available batches in current store
      const allBatchesFilter = {
        where: {
          and: [
            { itemCode: item.itemcode },
            { siteCode: userDetails.siteCode },
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

        // Sort specific batches by expiry date (FEFO) - Oldest first
        const sortedBatches = specificBatches.sort((a, b) => 
          new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31')
        );

        // Get "No Batch" records
        const noBatchRecords = allBatches.filter(batch => 
          !batch.batchNo || batch.batchNo.trim() === ""
        );

        let remainingQty = Number(item.docQty);
        const fefoBatches = [];

        // 1. Use specific batches first (FEFO)
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

        // 2. If still need more quantity, take from "No Batch" records (Last Resort)
        if (remainingQty > 0) {
          for (const noBatch of noBatchRecords) {
            if (remainingQty <= 0) break;
            
            const batchQty = Math.min(remainingQty, Number(noBatch.qty));
            fefoBatches.push({
              batchNo: "No Batch", // Use "No Batch" string for consistency
              quantity: batchQty,
              expDate: noBatch.expDate,
              batchCost: noBatch.batchCost
            });

            remainingQty -= batchQty;
          }
        }

        // 3. If STILL need more quantity (Overselling), assign remaining to "No Batch"
        if (remainingQty > 0) {
           fefoBatches.push({
              batchNo: "No Batch",
              quantity: remainingQty,
              expDate: null,
              batchCost: item.docPrice
            });
        }

        // Update the item with FEFO batch details
        return {
          ...item,
          fefoBatches: fefoBatches
        };
      } else {
        // No batches found at all, assign everything to "No Batch"
        return {
          ...item,
          fefoBatches: [{
            batchNo: "No Batch",
            quantity: Number(item.docQty),
            expDate: null,
            batchCost: item.docPrice
          }]
        };
      }
    } catch (error) {
      console.error("Error calculating FEFO batches:", error);
      // Fallback to No Batch on error
      return {
          ...item,
          fefoBatches: [{
            batchNo: "No Batch",
            quantity: Number(item.docQty),
            expDate: null,
            batchCost: item.docPrice
          }]
        };
    }
  };

  const createTransactionObject = (item, docNo, storeNo) => {
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
      trnType: "SUM",
      // For Usage: Output (Credit)
      trnDbQty: null,
      trnCrQty: Math.abs(Number(item.docQty)),
      trnQty: -Math.abs(Number(item.docQty)), // Always negative for usage
      trnBalqty: 0, // Will be updated from backend/ItemOnQties logic if implemented there, or simply recorded as is
      trnBalcst: 0, 
      trnAmt: item.docAmt,
      trnCost: item.docAmt,
      trnRef: null,
      hqUpdate: false,
      lineNo: item.docLineno,
      itemUom: item.docUom,
      movType: "SUM",
      itemBatch: getConfigValue('BATCH_NO') === "Yes" ? 
        (() => {
          const allBatches = [];
          // Add individualBatches if present (from specific batch selection)
          if (item?.batchDetails?.individualBatches?.length > 0) {
            allBatches.push(...item.batchDetails.individualBatches.map(b => b.batchNo || "No Batch"));
          }
          // Also add fefoBatches if present (from FEFO calculation)
          if (item?.fefoBatches?.length > 0) {
            allBatches.push(...item.fefoBatches.map(b => b.batchNo || "No Batch"));
          }
          // Remove duplicates and join (in case same batch appears in both)
          return allBatches.length > 0 ? [...new Set(allBatches)].join(',') : "No Batch";
        })()
        : "No Batch",
      itemBatchCost: item.docPrice,
      stockIn: null,
      transPackageLineNo: null,
      docExpdate: null,
      useExistingBatch: false,
    };
  };

  const createStktrnbatchesRecords = async (stktrnsRecords, type) => {
    if (getConfigValue('BATCH_NO') !== "Yes") {
      return;
    }

    try {
      for (let i = 0; i < stktrnsRecords.length; i++) {
        const stktrnRecord = stktrnsRecords[i];
        
        if (!stktrnRecord.id) continue;

        // Collect ALL batches - both specific batches AND FEFO batches
        // This ensures that when a grouped stktrn has both individualBatches and fefoBatches,
        // both sets of batches get their Stktrnbatches records
        let batchDetails = [];
        
        // Add specific batches if present (from line items with manual batch selection)
        if (stktrnRecord.batchDetails?.individualBatches?.length > 0) {
          batchDetails.push(...stktrnRecord.batchDetails.individualBatches);
        }
        
        // Also add FEFO batches if present (from line items with FEFO mode)
        // Don't use else-if - process both when both exist!
        if (stktrnRecord.fefoBatches && stktrnRecord.fefoBatches.length > 0) {
          batchDetails.push(...stktrnRecord.fefoBatches);
        }
        
        // If no batches found, fallback to No Batch
        if (batchDetails.length === 0) {
          batchDetails = [{
            batchNo: "No Batch",
            quantity: Math.abs(stktrnRecord.trnQty)
          }];
        }

        for (const batch of batchDetails) {
          const stktrnbatchesPayload = {
            batchNo: batch.batchNo,
            stkTrnId: stktrnRecord.id,
            batchQty: -Math.abs(batch.quantity) // Ensure negative for Usage/Reduction
          };

          try {
            await apiService.post("Stktrnbatches", stktrnbatchesPayload);
            console.log(`✅ Created Stktrnbatches for ${type}: ${batch.batchNo} - ${stktrnbatchesPayload.batchQty}`);
          } catch (error) {
            console.error(`❌ Error creating Stktrnbatches:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in createStktrnbatchesRecords:", error);
    }
  };

  const onSubmit = async (e, type) => {
    e?.preventDefault();
    console.log(stockHdrs, "stockHdrs");
    console.log(cartData, "cartData");

    if (!validateForm()) {
      console.log("Form is invalid, fix the errors and resubmit.");
      return;
    }

    try {
      let docNo;
      let hdr = stockHdrs;
      let details = cartData;
      let controlDataToUse = controlData;

      // Get new docNo for both new creations and direct posts
      if ((type === "save" || type === "post") && !urlDocNo) {
        const result = await getDocNo();
        if (!result) {
          toast.error("Failed to generate document number");
          return;
        }
        docNo = result.docNo;
        controlDataToUse = result.controlData;
        
        // Update header state
        hdr = { ...stockHdrs, docNo };
        
        // Update details with docNo
        details = cartData.map((item) => ({
          ...item,
          docNo,
        }));
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlDataToUse);
      } else {
        // Use existing docNo for updates and posts
        docNo = urlDocNo || stockHdrs.docNo;
      }

      const totalCart = calculateTotals(details);

      let data = {
        docNo: docNo,
        movCode: "SUM",
        movType: "SUM",
        storeNo: hdr.storeNo,
        supplyNo: hdr.supplyNo,
        docRef1: hdr.docRef1,
        docRef2: hdr.docRef2,
        docLines: urlDocNo ? hdr.docLines : details.length,
        docDate: hdr.docDate,
        postDate: type === "post" ? new Date().toISOString() : hdr.postDate,
        docStatus: type === "post" ? 7 : hdr.docStatus,
        docTerm: hdr.docTerm,
        docQty: totalCart.totalQty,
        docAmt: totalCart.totalAmt,
        docRemk1: hdr.docRemk1,
        createUser: hdr.createUser,
        createDate: type === "post" && urlDocNo ? hdr.createDate : new Date().toISOString(),
        staffNo: userDetails.usercode,
      };

      if (stockHdrs?.poId) data.poId = stockHdrs?.poId;

      let message;

      // Handle header operations based on type and urlDocNo
      if (type === "save" && !urlDocNo) {
        await postStockHdr(data, "create");
        await postStockDetails(details);
        await addNewControlNumber(controlDataToUse);
        message = "Stock Usage Memo created successfully";
      } else if (type === "save" && urlDocNo) {
        await postStockHdr(data, "update");
        await postStockDetails(details);
        message = "Stock Usage Memo updated successfully";
      } else if (type === "post") {
        // For direct post without saving, create header first if needed
        if (!urlDocNo) {
          await postStockHdr(data, "create");
          await addNewControlNumber(controlDataToUse);
        } else {
          await postStockHdr(data, "updateStatus");
        }
        await postStockDetails(details);

        // Create Stock Transactions (STKTRN)
        try {
          // 1. Calculate FEFO Batches for each original line item (BEFORE grouping to preserve line-level batches)
          const processedDetails = await Promise.all(
            details.map(async (item) => await calculateFefoBatches(item))
          );
          
          // 2. Group Items (after FEFO calculation to preserve line-level batch details)
          const groupedDetails = groupCartItemsByItem(processedDetails);

          // 3. Create STKTRN objects (now including FEFO data and batch details)
          const stktrns = groupedDetails.map((item) => {
            const trnObj = createTransactionObject(item, docNo, userDetails.siteCode);
            // Attach batch details (manual selection) and FEFO batches to the STKTRN object for use in createStktrnbatchesRecords
            trnObj.batchDetails = item.batchDetails; // Manual batch selection
            trnObj.fefoBatches = item.fefoBatches; // FEFO calculated batches
            return trnObj;
          });

          // Check if Stktrns already exist
          const chkFilter = {
            where: {
              and: [{ trnDocno: docNo }, { storeNo: userDetails.siteCode }],
            },
          };
          const stkResp = await apiService.get(
            `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
          );

          if (stkResp.length === 0) {
            // Post Stktrns
            const stktrnsResponse = await apiService.post("Stktrns", stktrns);
            
            // Update IDs
            if (stktrnsResponse && Array.isArray(stktrnsResponse)) {
              stktrns.forEach((record, index) => {
                if (stktrnsResponse[index]?.id) {
                  record.id = stktrnsResponse[index].id;
                }
              });
            }

            // Create Batch Records
            await createStktrnbatchesRecords(stktrns, "usage");
            
            // Update ItemBatches quantities - use processedDetails (original line items) for correct batch updates
            if (getConfigValue('BATCH_NO') === "Yes") {
              for (const cartItem of processedDetails) {
                const trimmedItemCode = cartItem.itemcode.replace(/0000$/, "");
                
                if (cartItem.transferType === 'specific' && cartItem.batchDetails?.individualBatches?.length) {
                  // Specific batch selection - process each batch from this exact line item
                  console.log(`🔄 Processing specific batch usage for ${trimmedItemCode}`);
                  
                  for (const batchDetail of cartItem.batchDetails.individualBatches) {
                    const batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: userDetails.siteCode,
                      uom: cartItem.docUom,
                      qty: -batchDetail.quantity, // Negative for usage (reduction)
                      batchcost: 0,
                      batchno: batchDetail.batchNo || "",
                    };

                    await apiService
                      .post("ItemBatches/updateqty", batchUpdate)
                      .catch(async (err) => {
                        const errorLog = {
                          trnDocNo: docNo,
                          itemCode: cartItem.itemcode,
                          loginUser: userDetails.username,
                          siteCode: userDetails.siteCode,
                          logMsg: `ItemBatches/updateqty specific batch error: ${err.message}`,
                          createdDate: new Date().toISOString().split("T")[0],
                        };
                        console.error(`❌ Error updating ItemBatches for ${batchDetail.batchNo}:`, err);
                      });
                  }
                  
                  // Handle "No Batch" quantity if any
                  if (cartItem.batchDetails.noBatchTransferQty > 0) {
                    const batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: userDetails.siteCode,
                      uom: cartItem.docUom,
                      qty: -cartItem.batchDetails.noBatchTransferQty, // Negative for usage
                      batchcost: 0,
                    };

                    await apiService
                      .post("ItemBatches/updateqty", batchUpdate)
                      .catch(async (err) => {
                        const errorLog = {
                          trnDocNo: docNo,
                          itemCode: cartItem.itemcode,
                          loginUser: userDetails.username,
                          siteCode: userDetails.siteCode,
                          logMsg: `ItemBatches/updateqty no batch error: ${err.message}`,
                          createdDate: new Date().toISOString().split("T")[0],
                        };
                        console.error(`❌ Error updating ItemBatches for No Batch:`, err);
                      });
                  }
                } else if (cartItem.fefoBatches?.length) {
                  // FEFO batch usage - process batches from this exact line item
                  console.log(`🔄 Processing FEFO batch usage for ${trimmedItemCode}`);
                  
                  for (const fefoBatch of cartItem.fefoBatches) {
                    const batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: userDetails.siteCode,
                      uom: cartItem.docUom,
                      qty: -fefoBatch.quantity, // Negative for usage (reduction)
                      batchcost: 0,
                      batchno: fefoBatch.batchNo === "No Batch" ? "" : (fefoBatch.batchNo || ""),
                    };

                    await apiService
                      .post("ItemBatches/updateqty", batchUpdate)
                      .catch(async (err) => {
                        const errorLog = {
                          trnDocNo: docNo,
                          itemCode: cartItem.itemcode,
                          loginUser: userDetails.username,
                          siteCode: userDetails.siteCode,
                          logMsg: `ItemBatches/updateqty FEFO error: ${err.message}`,
                          createdDate: new Date().toISOString().split("T")[0],
                        };
                        console.error(`❌ Error updating ItemBatches for ${fefoBatch.batchNo}:`, err);
                      });
                  }
                }
              }
            } else {
              // No batch functionality - update "No Batch" records
              for (const cartItem of processedDetails) {
                const trimmedItemCode = cartItem.itemcode.replace(/0000$/, "");
                
                const batchUpdate = {
                  itemcode: trimmedItemCode,
                  sitecode: userDetails.siteCode,
                  uom: cartItem.docUom,
                  qty: -Number(cartItem.docQty), // Negative for usage
                  batchcost: 0,
                };

                await apiService
                  .post("ItemBatches/updateqty", batchUpdate)
                  .catch(async (err) => {
                    const errorLog = {
                      trnDocNo: docNo,
                      itemCode: cartItem.itemcode,
                      loginUser: userDetails.username,
                      siteCode: userDetails.siteCode,
                      logMsg: `ItemBatches/updateqty ${err.message}`,
                      createdDate: new Date().toISOString().split("T")[0],
                    };
                    console.error(`❌ Error updating ItemBatches:`, err);
                  });
              }
            }
          }
        } catch (err) {
          console.error("Error creating stock transactions:", err);
          toast.error("Error creating stock transactions");
          return;
        }

        message = "Stock Usage Posted successfully";
      }

      toast.success(message);
      navigate("/stock-usage-memo?tab=all"); // Navigate back to list
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit form");
    }
  };

  const handlePageChange = (newPage) => {
    console.log(newPage, "newPage");
    setPagination((prev) => ({
      ...prev,
      page: newPage,
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
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">
              {urlStatus == 7
                ? "View Stock Usage Memo"
                : urlStatus == 0
                ? "Update Stock Usage Memo"
                : "Add Stock Usage Memo"}
            </h1>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/stock-usage-memo?tab=all")}
              >
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  onSubmit(e, "save");
                }}
                disabled={stockHdrs.docStatus === 7}
                className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
              >
                Save
              </Button>
              <Button
                variant="secondary"
                onClick={(e) => {
                  onSubmit(e, "post");
                }}
                className="cursor-pointer hover:bg-gray-200 transition-colors duration-150"
                disabled={(stockHdrs.docStatus === 7 && userDetails?.isSettingPostedChangePrice !== "True")}
              >
                Post
              </Button>
            </div>
          </div>

          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Stock Usage Memo</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* First Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Doc NO<span className="text-red-500">*</span>
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
                    <Label>Ref1</Label>
                    <Input
                      placeholder="Enter Ref 1"
                      disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
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
                    <Label>Ref2</Label>
                    <Input
                      disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                      placeholder="Enter Ref 2"
                      value={stockHdrs.docRef2}
                      onChange={(e) =>
                        setStockHdrs((prev) => ({
                          ...prev,
                          docRef2: e.target.value,
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

                {/* Third Column */}
                <div className="space-y-4">
                  <div className="space-y-2 w-full">
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
                    <Label>Remark</Label>
                    <Input
                      placeholder="Enter remark"
                      disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
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
            defaultValue={activeTab}
            className="w-full"
            onValueChange={setActiveTab}
          >
            {/* <TabsList className="grid w-full grid-cols-1 lg:w-[200px]">
              <TabsTrigger value="detail">Details</TabsTrigger>
            </TabsList> */}

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
                          checked={filters.department.includes(
                            "SALON PRODUCT"
                          )}
                          onCheckedChange={() =>
                            handleDepartmentChange("SALON PRODUCT")
                          }
                        />
                        <label htmlFor="salon" className="text-sm">
                          Salon Product
                        </label>
                      </div>
                    </div>

                    {/* Items Table using ItemTable component */}
                    <ItemTable
                      data={stockList}
                      loading={loading}
                      onQtyChange={(e, index) => handleCalc(e, index, "Qty")}
                      onPriceChange={(e, index) => handleCalc(e, index, "Price")}
                      onExpiryDateChange={(e, index) => handleCalc(e, index, "expiryDate")}
                      onAddToCart={(index, item) => addToCart(index, item)}
                      currentPage={pagination.page}
                      itemsPerPage={pagination.limit}
                      totalPages={Math.ceil(itemTotal / pagination.limit)}
                      onPageChange={handlePageChange}
                      emptyMessage="No items Found"
                      showBatchColumns={getConfigValue('BATCH_NO') === "Yes"}
                      qtyLabel="Usage Qty"
                      priceLabel="Usage Price"
                      costLabel="Usage Cost"
                      onBatchSelection={(index, item) => handleRowBatchSelection(item, index)}
                      onRemoveBatchSelection={handleRemoveBatchSelection}
                      isBatchLoading={false}
                      itemBatchLoading={itemBatchLoading}
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
                      {userDetails?.isSettingViewPrice === "True" && (
                        <TableHead>Price</TableHead>
                      )}
                      {userDetails?.isSettingViewPrice === "True" && (
                        <TableHead className="font-semibold text-slate-700">
                          Amount
                        </TableHead>
                      )}
                    {getConfigValue('BATCH_NO') === "Yes" && (
                      <TableHead>Usage Type</TableHead>
                    )}
                    <TableHead>Remarks</TableHead>
                    {urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? (
                      <TableHead>Action</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableSpinner colSpan={
                      5 + // Base columns: NO, Item Code, Description, UOM, Quantity
                      (userDetails?.isSettingViewPrice === "True" ? 2 : 0) + // Price, Amount
                      (getConfigValue('BATCH_NO') === "Yes" ? 1 : 0) + // Usage Type
                      1 + // Remarks
                      (urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? 1 : 0) // Action
                    } />
                  ) : cartData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={
                        5 + // Base columns: NO, Item Code, Description, UOM, Quantity
                        (userDetails?.isSettingViewPrice === "True" ? 2 : 0) + // Price, Amount
                        (getConfigValue('BATCH_NO') === "Yes" ? 1 : 0) + // Usage Type
                        1 + // Remarks
                        (urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? 1 : 0) // Action
                      } className="text-center py-10">
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
                          {userDetails?.isSettingViewPrice === "True" && (
                            <TableCell>{item.docPrice}</TableCell>
                          )}
                          
                          {userDetails?.isSettingViewPrice === "True" && (
                            <TableCell className="font-semibold text-slate-700">
                              {item.docAmt}
                            </TableCell>
                          )}
                          {getConfigValue('BATCH_NO') === "Yes" && (
                            <TableCell>
                              {item.transferType === 'specific' ? (
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className="text-xs">
                                    Specific Batches
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => showUsagePreview(item)}
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
                          )}
                          <TableCell>{item.itemRemark}</TableCell>

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
                        {getConfigValue('BATCH_NO') === "Yes" && <TableCell />}
                        <TableCell colSpan={1 + (urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True") ? 1 : 0)} />
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
        isBatchEdit={false}
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
        itemcode={currentBatchItem?.stockCode}
        itemdesc={currentBatchItem?.stockName}
      />
      {/* Usage Preview Modal */}
      {previewItem && (
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Usage Details Preview</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Item: {previewItem.itemcode} - {previewItem.itemdesc}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Usage Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Usage Summary</p>
                    <div className="mt-2 text-xs space-y-1">
                      <p><strong>Total Usage Qty:</strong> {previewItem.docQty}</p>
                      <p><strong>Usage Type:</strong> Specific Batches</p>
                      <p><strong>Store:</strong> {stockHdrs.storeNo || userDetails?.siteCode}</p>
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
                              <td className="p-2 font-medium">{batch.batchNo || "No Batch"}</td>
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

              {/* Usage Flow Info */}
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Usage Flow</p>
                    <p className="text-xs mt-1">
                      Items will be used from {stockHdrs.storeNo || userDetails?.siteCode} using the selected batch quantities.
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
      )}
    </>
  );
}

export default AddSum;
