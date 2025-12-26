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
import { Badge } from "@/components/ui/badge";

const calculateTotals = (cartData) => {
  return cartData.reduce(
    (acc, item) => ({
      totalQty: acc.totalQty + Number(item.docQty || 0),
      totalFoc: acc.totalFoc + Number(item.docFocqty || 0),
      totalDisc: acc.totalDisc + Number(item.docDisc || 0),
      totalAmt: acc.totalAmt + Number(item.docAmt || 0),
    }),
    { totalQty: 0, totalFoc: 0, totalDisc: 0, totalAmt: 0 }
  );
};

// Batch Selection Dialog Component
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
          <DialogTitle>Select Specific Batches for Transfer</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Choose specific batches to transfer for item: <strong>{itemcode}</strong> - {itemdesc}
          </div>
        </DialogHeader>

        {/* Transfer Summary */}
        {scenarioMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Transfer Summary</p>
                <p className="text-xs mt-1">{scenarioMessage}</p>
                <div className="mt-2 text-xs space-y-1">
                  <p><strong>Transfer Qty:</strong> {transferQty}</p>
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

          {/* Transfer Mode Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Multi-Batch Selection Mode</p>
                <p className="text-xs mt-1">
                  Select multiple batches to reach your transfer quantity. You can select different quantities from each batch.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBatchDialog(false)} className="cursor-pointer">
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
        
        // Check if quantity exceeds available stock for transfers
        if (editData?.docQty && editData?.originalQty && Number(editData.docQty) > Number(editData.originalQty)) {
          errors.push(`Cannot transfer ${Number(editData.docQty)}. Only ${Number(editData.originalQty)} available in stock.`);
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
              <div className="space-y-2">
                <Label htmlFor="focqty">FOC Quantity</Label>
                <Input
                  id="focqty"
                  type="number"
                  min="0"
                  value={editData?.docFocqty || ""}
                  onChange={(e) => onEditCart(e, "docFocqty")}
                  className="w-full"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discper">Discount %</Label>
                <Input
                  id="discper"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editData?.docPdisc || ""}
                  onChange={(e) => onEditCart(e, "docPdisc")}
                  className="w-full"
                  disabled={urlStatus == 7 && userDetails?.isSettingPostedChangePrice !== "True"}
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
    movCode: "TFRF",
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
    movCode: "TFRF",
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

  const [originalStockList, setOriginalStockList] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);

  // Add sorting state for ItemTable
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [storeOptions, setStoreOptions] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
  });

  // NEW: Per-item loading state for batch selection
  const [itemBatchLoading, setItemBatchLoading] = useState({});
  
  // NEW: Transfer preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  const handleApplyFilters = () => {
    setLoading(true);

    // Store original data if not already stored
    if (!originalStockList.length && stockList.length) {
      setOriginalStockList(stockList);
    }

    // If no filters are active, restore original data
    if (
      !tempFilters.brand.length &&
      !tempFilters.range.length &&
      itemFilter.whereArray.department.length === 2
    ) {
      setStockList(originalStockList);
      setItemTotal(originalStockList.length);
      setLoading(false);
      return;
    }

    const filteredList = originalStockList.filter((item) => {
      // Brand filter
      if (tempFilters.brand.length > 0) {
        const brandMatch = tempFilters.brand.some(
          (brand) =>
            brand.value === item.BrandCode || brand.label === item.Brand
        );
        if (!brandMatch) return false;
      }

      // Range filter
      if (tempFilters.range.length > 0) {
        const rangeMatch = tempFilters.range.some(
          (range) =>
            range.value === item.RangeCode || range.label === item.Range
        );
        if (!rangeMatch) return false;
      }

      // Department filter
      if (itemFilter.whereArray.department.length > 0) {
        const departmentMatch = itemFilter.whereArray.department.includes(
          item.Department
        );
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
      console.log("Sample Item Structure:", originalStockList[0]);
    }
  }, [originalStockList]);

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

  useEffect(() => {
    const initializeData = async () => {
      setPageLoading(true);
      setLoading(true);

      try {
        if (urlDocNo) {
          const filter = {
            where: {
              // movCode: "TFRF",
              docNo: urlDocNo,
            },
          };

          await getStockHdr(filter);

          if (urlStatus != 7) {
            await Promise.all([
              getOptions(),
              // getStockDetails()
            ]);
          }

          await getStockHdrDetails(filter);
          await getStoreList();
        } else {
          await Promise.all([
            getStoreList(),
            // getStockDetails(),
            getOptions(),
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
    if (stockHdrs.fstoreNo) {
      getStockDetails();
    } else {
      setStockList([]);
      setItemTotal(0);
    }
  }, [stockHdrs.fstoreNo]);

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
        docNo: data?.docNo,
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
    if (!stockHdrs.fstoreNo) return;

    try {
      setLoading(true);
      // const query = `?Site=${userDetails?.siteCode}`;
      const query = `?Site=${stockHdrs.fstoreNo}`;
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
                console.log(`✅ Parsed expDate from ordMemo4 for batch ${batchNo}:`, expDate);
              } else {
                console.log(`⚠️ Invalid expDate from ordMemo4 for batch ${batchNo}:`, expDateStr);
              }
            }
          } else {
            console.log(`⚠️ No expDatePart found at index ${index} for batch ${batchNo}`);
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
          const finalExpDate = batch.expDate || apiBatch?.expDate || null;
          console.log(`🔍 Enriching batch ${batch.batchNo}:`, {
            ordMemo4ExpDate: batch.expDate,
            apiExpDate: apiBatch?.expDate,
            finalExpDate: finalExpDate
          });
          return {
            batchNo: batch.batchNo,
            quantity: batch.quantity,
            expDate: finalExpDate, // Use ordMemo4 first, then API
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
    console.log(cart, "cart in postStockDetails");
    try {
      const itemsToDelete = cartItems.filter(
        (cartItem) => !cart.some((item) => item.docId === cartItem.docId)
      );

      const itemsToUpdate = cart.filter((item) => item.docId);
      const itemsToCreate = cart.filter((item) => !item.docId);

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
      console.log(itemsToCreate, "cart in itemsToCreate");

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
              [field]:
                field === "expiryDate" || field === "docBatchNo"
                  ? value
                  : Number(value),
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

  // const handleDateChange = (e, type) => {
  //   if (type === "postDate") {
  //     let postDate = moment(e.target.value).valueOf();
  //     let docDate = moment(stockHdrs.docDate).valueOf();
  //     if (docDate > postDate) {
  //       showError("Post date should be greater than doc date");
  //       return;
  //     }
  //   }
  //   setStockHdrs((prev) => ({
  //     ...prev,
  //     [type]: e.target.value,
  //   }));
  // };

  const handleEditCart = useCallback((e, type) => {
    const value = e.target.value;
    setEditData((prev) => {
      const updated = {
        ...prev,
        [type]: value,
      };

      // Auto-calculate dependent fields when FOC, discount, or quantity changes
      if (type === 'docQty' || type === 'docFocqty' || type === 'docPdisc' || type === 'docPrice') {
        const qty = parseFloat(updated.docQty || 0);
        const focQty = parseFloat(updated.docFocqty || 0);
        const price = parseFloat(updated.docPrice || 0);
        const discPer = parseFloat(updated.docPdisc || 0);
        
        // Calculate total quantity (regular + FOC)
        const totalQty = qty + focQty;
        
        // Calculate discount amount (only on regular quantity)
        const discAmt = (qty * price * discPer) / 100;
        
        // Calculate final amount (regular quantity * price - discount)
        const finalAmt = (qty * price) - discAmt;
        
        updated.docTtlqty = totalQty;
        updated.docDisc = discAmt;
        updated.docAmt = finalAmt;
      }

      return updated;
    });
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (!editData.docQty) {
      toast.error("Quantity is required");
      return;
    }
    
    // Only validate price if price viewing is enabled
    if (userDetails?.isSettingViewPrice === "True" && !editData.docPrice) {
      toast.error("Price is required");
      return;
    }

    const updatedItem = {
      ...editData,
      docQty: Number(editData.docQty),
      docPrice: userDetails?.isSettingViewPrice === "True" ? Number(editData.docPrice) : editData.docPrice,
      docAmt: userDetails?.isSettingViewPrice === "True" ? Number(editData.docQty) * Number(editData.docPrice) : editData.docAmt,
    };

    setCartData((prev) =>
      prev.map((item, index) => (index === editingIndex ? updatedItem : item))
    );

    setShowEditDialog(false);
    setEditData(null);
    setEditingIndex(null);
    toast.success("Item updated successfully");
  }, [editData, editingIndex, userDetails?.isSettingViewPrice]);

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
    // Always check if quantity is entered and valid
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Check if quantity exceeds on-hand quantity
    if (Number(item.Qty) > Number(item.quantity)) {
      toast.error("Not enough stock available");
      return;
    }

    // Check if source store is selected
    if (!stockHdrs.fstoreNo) {
      toast.error("Please select a source store first");
      return;
    }

    // Check if destination store is selected
    if (!stockHdrs.tstoreNo) {
      toast.error("Please select a destination store first");
      return;
    }

    // Check if destination store is different from source store
    if (stockHdrs.fstoreNo === stockHdrs.tstoreNo) {
      toast.error("Source and destination stores must be different");
      return;
    }

    // Check if item is already in cart
    const existingItemIndex = cartData.findIndex(
      (cartItem) =>
        cartItem.itemcode === item.stockCode && cartItem.docUom === item.uom
    );

    // if (existingItemIndex !== -1) {
    //   toast.error("This item is already in the cart");
    //   return;
    // }

    // Create cart item based on whether specific batches are selected
    const amount = Number(item.Qty) * Number(item.Price);
    const hasSpecificBatches = item.selectedBatches && item.selectedBatches.transferType === 'specific';

    // Prepare batch data for storage in database fields
    let recQtyFields = { recQty1: 0, recQty2: 0, recQty3: 0, recQty4: 0, recQty5: 0 };
    let ordMemoFields = { ordMemo1: "fefo", ordMemo2: "", ordMemo3: "0", ordMemo4: "" };
    let docBatchNo = null; // Don't store multiple batch numbers in docBatchNo
    let docExpdate = "";

    if (hasSpecificBatches && item.selectedBatches.batchDetails) {
      const { batchDetails, noBatchTransferQty } = item.selectedBatches;
      
      // Store individual batch quantities in recQty fields (up to 5 batches)
      batchDetails.forEach((batch, index) => {
        if (index < 5) {
          recQtyFields[`recQty${index + 1}`] = batch.quantity;
        }
      });
      
      // Store "No Batch" quantity in recQty5
      recQtyFields.recQty5 = noBatchTransferQty || 0;
      
      // Don't store multiple batch numbers in docBatchNo - use null instead
      // All batch information is stored in ordMemo fields
      docBatchNo = null;
      // docExpdate remains empty - will be fetched fresh from ItemBatches API
      
      // Store transfer type and batch breakdown in memo fields
      ordMemoFields.ordMemo1 = "specific";
      ordMemoFields.ordMemo2 = batchDetails.map(b => `${b.batchNo}:${b.quantity}`).join(',');
      ordMemoFields.ordMemo3 = noBatchTransferQty?.toString() || "0";
      ordMemoFields.ordMemo4 = batchDetails.map(b => `${b.expDate}:${b.quantity}`).join(',');
    }

    const newCartItem = {
      id: index + 1,
      docAmt: amount,
      docNo: stockHdrs.docNo,
      movCode: "TFRF",
      movType: "TFR",
      docLineno: cartData.length + 1,
      docDate: stockHdrs.docDate,
      createDate: stockHdrs.docDate,
      itemcode: item.stockCode,
      itemdesc: item.stockName,
      docQty: Number(item.Qty),
      docFocqty: 0,
      docTtlqty: Number(item.Qty) + 0, // Will be updated when FOC is added
      docPrice: Number(item.Price),
      docPdisc: 0,
      docDisc: 0,
      // Store batch quantities in recQty fields
      ...recQtyFields,
      recTtl: Number(item.Qty),
      postedQty: 0,
      cancelQty: 0,
      createUser: userDetails?.username || "SYSTEM",
      docUom: item.uom,
      // Store batch info in database fields
      docExpdate: docExpdate,
      docBatchNo: docBatchNo,
      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: item.range || "",
      DOCUOMDesc: item.uomDescription,
      itemRemark: "",
      docMdisc: 0,
      itemprice: Number(item.Cost) || 0,
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
        individualBatches: item.selectedBatches.batchDetails || []
      } : null
    };

    addItemToCart(newCartItem, index);
    
    // Show appropriate success message
    if (hasSpecificBatches) {
      const { batchTransferQty, noBatchTransferQty } = item.selectedBatches;
      const message = noBatchTransferQty > 0 
        ? `Item added to cart with specific batch ${item.selectedBatches.batchNo}: ${batchTransferQty} qty. Balance ${noBatchTransferQty} will be taken from "No Batch" items.`
        : `Item added to cart with specific batch ${item.selectedBatches.batchNo}: ${batchTransferQty} qty.`;
      toast.success(message);
    } else {
      toast.success("Item added to cart using FEFO (First Expired, First Out) by expiry date");
    }
  };

  // const createTransactionObject = (item, docNo, storeNo) => {
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
            { siteCode: stockHdrs.fstoreNo }, // Source store
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
          const trnQty = Number(stktrnRecord.trnQty ?? 0);
          const trnSign =
            trnQty === 0
              ? type === "source"
                ? -1
                : 1
              : Math.sign(trnQty);
          const absoluteBatchQty = Math.abs(Number(batch.quantity) || 0);

          const stktrnbatchesPayload = {
            batchNo: batch.batchNo || "No Batch", // Use "No Batch" string for Stktrnbatches API
            stkTrnId: stktrnRecord.id,
            batchQty: trnSign * absoluteBatchQty
          };

          try {
            await apiService.post("Stktrnbatches", stktrnbatchesPayload);
            console.log(`✅ Created Stktrnbatches for ${type}: ${batch.batchNo || "No Batch"} - ${stktrnbatchesPayload.batchQty} qty`);
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

    // Use aggregated docQty (after grouping)
    const qty = Number(item.docQty) * multiplier;
    const amt = Number(item.docAmt) * multiplier;
    const cost = Number(item.docAmt) * multiplier;

    return {
      id: null,
      trnPost: today.toISOString().split("T")[0],
      trnDate: stockHdrs.docDate,
      trnNo: null,
      postTime: timeStr,
      aperiod: null,
      itemcode: item.itemcode + "0000",
      storeNo: storeNo,
      tstoreNo: tstoreNo,
      fstoreNo: fstoreNo,
      trnDocno: docNo,
      trnType: "TFRF",
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
      movType: "TFR",
      itemBatchCost: item.itemprice,
      stockIn: null,
      transPackageLineNo: null,
      // Only set docExpdate if batch functionality is enabled and we have a valid date
              docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? item.docExpdate : null,
      // Carry FEFO batches forward so destination handler can upsert per-batch
      fefoBatches: Array.isArray(item?.fefoBatches) ? item.fefoBatches : null,
    };
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

  // const processTransactions = async (transactions) => {
  //   try {
  //     // Log start of transaction
  //     await apiService.post("Inventorylogs", {
  //       trnDocNo: transactions[0].trnDocno,
  //       loginUser: userDetails.username,
  //       siteCode: transactions[0].storeNo,
  //       logMsg: "Post Started on " + new Date().toISOString(),
  //       createdDate: new Date().toISOString().split('T')[0]
  //     });

  //     // Process each transaction
  //     for (const transaction of transactions) {
  //       // Get current item quantities
  //       const response = await apiService.get(
  //         `Itemonqties?filter={"where":{"and":[{"itemcode":"${transaction.itemcode}"},{"uom":"${transaction.itemUom}"},{"sitecode":"${transaction.storeNo}"}]}}`
  //       );

  //       if (response && response.length > 0) {
  //         const currentQty = response[0];
  //         transaction.trnBalqty = (Number(transaction.trnBalqty) + Number(currentQty.trnBalqty)).toString();
  //         transaction.trnBalcst = (Number(transaction.trnBalcst) + Number(currentQty.trnBalcst)).toString();
  //         transaction.itemBatchCost = currentQty.batchCost.toString();
  //       }

  //       // Check if transaction already exists
  //       const existingTrn = await apiService.get(
  //         `Stktrns?filter={"where":{"and":[{"trnDocno":"${transaction.trnDocno}"},{"storeNo":"${transaction.storeNo}"}]}}`
  //       );

  //       if (!existingTrn || existingTrn.length === 0) {
  //         // Create new transaction
  //         await apiService1.post("Stktrns", transaction);

  //         // Log transaction creation
  //         await apiService.post("Inventorylogs", {
  //           trnDocNo: transaction.trnDocno,
  //           itemCode: transaction.itemcode,
  //           loginUser: userDetails.username,
  //           siteCode: transaction.storeNo,
  //           logMsg: `${transaction.itemcode} TFRF on stktrn Table For ${transaction.storeNo}`,
  //           createdDate: new Date().toISOString().split('T')[0]
  //         });

  //         // Update item batch quantities
  //         await apiService.post("ItemBatches/updateqty", {
  //           itemcode: transaction.itemcode,
  //           sitecode: transaction.storeNo,
  //           uom: transaction.itemUom,
  //           qty: Number(transaction.trnQty),
  //           batchcost: Number(transaction.trnCost)
  //         });

  //         // Handle batch SNO if enabled
  //         if (window.APP_CONFIG.BATCH_SNO === "Yes") {
  //           await apiService1.get(
  //             `api/postGRNInToItemBatchSno?formName=GRNIn&docNo=${transaction.trnDocno}&fromsiteCode=${transaction.fstoreNo}&tositeCode=${userDetails.siteCode}&userCode=${userDetails.username}`
  //           );
  //         }
  //       }
  //     }

  //     // Send email notification if enabled
  //     if (window.APP_CONFIG.NOTIFICATION_MAIL_SEND === "Yes") {
  //       const printList = await apiService1.get(
  //         `Stkprintlists?filter={"where":{"docNo":"${transactions[0].trnDocno}"}}`
  //       );

  //       if (printList && printList.length > 0) {
  //         const emailBody = generateEmailBody(printList[0], printList);
  //         await apiService1.post("api/sendEmail", {
  //           to: window.config.NOTIFICATION_MAIL1,
  //           cc: window.config.NOTIFICATION_MAIL2,
  //           subject: "NOTIFICATION FOR STOCK TRANSFER",
  //           body: emailBody
  //         });
  //       }
  //     }

  //     return true;
  //   } catch (error) {
  //     console.error("Error processing transactions:", error);
  //     await apiService.post("Inventorylogs", {
  //       trnDocNo: transactions[0].trnDocno,
  //       loginUser: userDetails.username,
  //       siteCode: transactions[0].storeNo,
  //       logMsg: "Error processing transactions: " + error.message,
  //       createdDate: new Date().toISOString().split('T')[0]
  //     });
  //     throw error;
  //   }
  // };

  const onSubmit = async (e, type) => {
    e?.preventDefault();
    console.log(stockHdrs);

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
        if (!validateForm(stockHdrs, cartData)) {
          setSaveLoading(false);
          setPostLoading(false);
          return;
        }

        const docNo = urlDocNo || stockHdrs.docNo;
        const details = cartData;
        
        // Calculate new totals based on updated details for posted docs
        const newTotals = calculateTotals(details);
        
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
          docQty: newTotals.totalQty, // ✅ RECALCULATE - Update with new total quantity
          docAmt: newTotals.totalAmt, // ✅ RECALCULATE - Update with new total amount
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
        navigate("/goods-transfer-in?tab=all");
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
          docNo: result.docNo,
          id: urlDocNo ? item.id : index + 1, // Also update the id field to match
        }));
        setStockHdrs(hdr);
        setCartData(details);
        setControlData(controlData);
        console.log(details, "details");

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
        movCode: "TFRF",
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
        console.log(data, "daaatt");
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

        // Create STKTRN records for destination store - one per unique item (not per batch)
        // Batch details are tracked in Stktrnbatches table
        const stktrns = groupedDetails.map((item) =>
          createTransactionObject(
            item,
            docNo,
            stockHdrs.tstoreNo, // storeNo (destination)
            stockHdrs.fstoreNo, // fstoreNo (source)
            stockHdrs.tstoreNo, // tstoreNo (again destination)
            1 // positive qty
          )
        );

        // Create STKTRN records for source store - one per unique item (not per batch)
        const stktrns1 = groupedDetails.map((item) =>
          createTransactionObject(
            item,
            docNo,
            stockHdrs.fstoreNo, // storeNo (source)
            stockHdrs.fstoreNo, // fstoreNo (source)
            stockHdrs.tstoreNo, // tstoreNo (destination)
            -1 // negative qty
          )
        );
        console.log(stktrns, "stktrns");
        console.log(stktrns1, "stktrns1");

        // 2. Batch SNO handling
        if (getConfigValue('BATCH_SNO') === "Yes") {
          try {
            await apiService1.get(
              `api/SaveOutItemBatchSno?formName=GRNIn&docNo=${docNo}&siteCode=${stktrns[0].fstoreNo}&userCode=${userDetails.username}`
            );
          } catch (err) {
            const errorLog = {
              trnDocNo: docNo,
              loginUser: userDetails.username,
              siteCode: userDetails.siteCode,
              logMsg: `api/SaveOutItemBatchSno error: ${err.message}`,
              createdDate: new Date().toISOString().split("T")[0],
            };
            // Optionally log the error
            // await apiService.post("Inventorylogs", errorLog);
          }
        }

        if (getConfigValue('AUTO_POST') === "Yes") {
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
            const stktrnsResponse = await apiService.post("Stktrns", stktrns);
            
            // Update stktrns records with response IDs
            if (stktrnsResponse && Array.isArray(stktrnsResponse)) {
              stktrns.forEach((record, index) => {
                if (stktrnsResponse[index] && stktrnsResponse[index].id) {
                  record.id = stktrnsResponse[index].id;
                }
              });
            }

            // Create Stktrnbatches records for destination (immediately after stktrns posting)
            // Pass the grouped details which contains the consolidated batch information
            await createStktrnbatchesRecords(stktrns, groupedDetails, "destination");

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

            // 10) Update ItemBatches quantity - use processedDetails (original line items) for correct batch updates
            for (const cartItem of processedDetails) {
              const trimmedItemCode = cartItem.itemcode.replace(/0000$/, "");

              if (getConfigValue('BATCH_NO') === "Yes") {
                if (cartItem.transferType === 'specific' && cartItem.batchDetails?.individualBatches?.length) {
                  // Specific batch selection - process each batch from this exact line item
                  console.log(`🔄 Processing destination specific batch transfer for ${trimmedItemCode}`);
                  
                  for (const batchDetail of cartItem.batchDetails.individualBatches) {
                    // Find corresponding stktrn for this item (destination store)
                    const stktrn = stktrns.find(s => 
                      s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                      s.itemUom === cartItem.docUom
                    );
                    
                    if (stktrn) {
                      const individualStktrnItem = {
                        ...stktrn,
                        itemBatch: batchDetail.batchNo,
                        trnQty: batchDetail.quantity,
                        trnCost: (Number(stktrn.trnCost) / Number(stktrn.trnQty)) * batchDetail.quantity,
                        itemBatchCost: stktrn.itemBatchCost,
                        docExpdate: batchDetail.expDate
                      };
                      
                      await handleDestinationBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
                    }
                  }
                  
                  // Handle "No Batch" transfer if needed
                  if (cartItem.batchDetails.noBatchTransferQty > 0) {
                    const stktrn = stktrns.find(s => 
                      s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                      s.itemUom === cartItem.docUom
                    );
                    
                    if (stktrn) {
                      const noBatchStktrnItem = {
                        ...stktrn,
                        itemBatch: "",
                        trnQty: cartItem.batchDetails.noBatchTransferQty,
                        trnCost: (Number(stktrn.trnCost) / Number(stktrn.trnQty)) * cartItem.batchDetails.noBatchTransferQty,
                        itemBatchCost: stktrn.itemBatchCost,
                        docExpdate: null
                      };
                      
                      await handleDestinationBatchTransfer(noBatchStktrnItem, trimmedItemCode, cartItem.batchDetails.noBatchTransferQty);
                    }
                  }
                } else if (cartItem.fefoBatches?.length) {
                  // FEFO batch transfer - process batches from this exact line item
                  console.log(`🔄 Processing destination FEFO transfer for ${trimmedItemCode}`);
                  
                  // Find corresponding stktrn for this item (destination store)
                  const stktrn = stktrns.find(s => 
                    s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                    s.itemUom === cartItem.docUom
                  );
                  
                  if (stktrn) {
                    await handleDestinationFefoTransfer(
                      { ...stktrn, fefoBatches: cartItem.fefoBatches },
                      trimmedItemCode,
                      cartItem.docQty
                    );
                  }
                }
              } else {
                // No batch functionality - handle destination store "No Batch" with existence check
                // Find corresponding stktrn for this item
                const stktrn = stktrns.find(s => 
                  s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                  s.itemUom === cartItem.docUom
                );
                
                if (stktrn) {
                  const noBatchFilter = {
                    where: {
                      and: [
                        { itemCode: trimmedItemCode },
                        { uom: cartItem.docUom },
                        { siteCode: stktrn.storeNo },
                        { batchNo: "" },
                      ],
                    },
                  };

                  const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(
                    JSON.stringify(noBatchFilter)
                  )}`;
                  let existingNoBatch = await apiService
                    .get(noBatchUrl)
                    .then((resp) => resp[0])
                    .catch((error) => {
                      console.error("Error fetching destination 'No Batch':", error);
                      return null;
                    });

                  if (!existingNoBatch) {
                    const batchCreate = {
                      itemCode: trimmedItemCode,
                      siteCode: stktrn.storeNo,
                      uom: cartItem.docUom,
                      qty: Number(cartItem.docQty),
                      batchCost: 0,
                      batchNo: "",
                    };

                    await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
                      console.error(`Error creating 'No Batch' for ${trimmedItemCode}:`, err);
                    });
                  } else {
                    const batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: stktrn.storeNo,
                      uom: cartItem.docUom,
                      qty: Number(cartItem.docQty),
                      batchcost: 0,
                    };

                    await apiService
                      .post(`ItemBatches/updateqty`, batchUpdate)
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
              }
            }
            
            // Existing stktrns → log
            // const existsLog = {
            //   trnDocNo: docNo,
            //   loginUser: userDetails.username,
            //   siteCode: userDetails.siteCode,
            //   logMsg: "stktrn already exists",
            //   createdDate: new Date().toISOString().split("T")[0],
            // };
            // await apiService.post("Inventorylogs", existsLog);
          }

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
            const stktrns1Response = await apiService.post("Stktrns", stktrns1);
            
            // Update stktrns1 records with response IDs
            if (stktrns1Response && Array.isArray(stktrns1Response)) {
              stktrns1.forEach((record, index) => {
                if (stktrns1Response[index] && stktrns1Response[index].id) {
                  record.id = stktrns1Response[index].id;
                }
              });
            }

            // Create Stktrnbatches records for source (immediately after stktrns1 posting)
            // Pass the grouped details which contains the consolidated batch information
            await createStktrnbatchesRecords(stktrns1, groupedDetails, "source");

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

            // 10) Update ItemBatches quantity - handle source store operations only
            // Use processedDetails (original line items) for correct batch updates
            for (const cartItem of processedDetails) {
              const trimmedItemCode = cartItem.itemcode.replace(/0000$/, "");

              if (getConfigValue('BATCH_NO') === "Yes") {
                if (cartItem.transferType === 'specific' && cartItem.batchDetails?.individualBatches?.length) {
                  // Specific batch selection - process each batch from this exact line item
                  console.log(`🔄 Processing source specific batch transfer for ${trimmedItemCode}`);
                  
                  for (const batchDetail of cartItem.batchDetails.individualBatches) {
                    // Find corresponding stktrn for this item (source store)
                    const stktrn = stktrns1.find(s => 
                      s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                      s.itemUom === cartItem.docUom
                    );
                    
                    if (stktrn) {
                      const individualStktrnItem = {
                        ...stktrn,
                        itemBatch: batchDetail.batchNo,
                        trnQty: batchDetail.quantity,
                        trnCost: (Number(stktrn.trnCost) / Number(stktrn.trnQty)) * batchDetail.quantity,
                        itemBatchCost: stktrn.itemBatchCost,
                        docExpdate: batchDetail.expDate
                      };
                      
                      await handleSourceBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
                    }
                  }
                  
                  // Handle "No Batch" transfer if needed
                  if (cartItem.batchDetails.noBatchTransferQty > 0) {
                    const stktrn = stktrns1.find(s => 
                      s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                      s.itemUom === cartItem.docUom
                    );
                    
                    if (stktrn) {
                      const noBatchStktrnItem = {
                        ...stktrn,
                        itemBatch: "",
                        trnQty: cartItem.batchDetails.noBatchTransferQty,
                        trnCost: (Number(stktrn.trnCost) / Number(stktrn.trnQty)) * cartItem.batchDetails.noBatchTransferQty,
                        itemBatchCost: stktrn.itemBatchCost,
                        docExpdate: null
                      };
                      
                      await handleSourceBatchTransfer(noBatchStktrnItem, trimmedItemCode, cartItem.batchDetails.noBatchTransferQty);
                    }
                  }
                } else if (cartItem.fefoBatches?.length) {
                  // FEFO batch transfer - process batches from this exact line item
                  console.log(`🔄 Processing source FEFO transfer for ${trimmedItemCode}`);
                  
                  // Find corresponding stktrn for this item (source store)
                  const stktrn = stktrns1.find(s => 
                    s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                    s.itemUom === cartItem.docUom
                  );
                  
                  if (stktrn) {
                    await handleSourceFefoTransfer(stktrn, trimmedItemCode, cartItem.docQty);
                  }
                }
              } else {
                // No batch functionality - try FEFO from existing batches first, then "No Batch"
                console.log(`🔄 BATCH_NO=No: Trying FEFO from existing batches for ${trimmedItemCode}`);
                
                // Find corresponding stktrn for this item
                const stktrn = stktrns1.find(s => 
                  s.itemcode.replace(/0000$/, "") === trimmedItemCode && 
                  s.itemUom === cartItem.docUom
                );
                
                if (stktrn) {
                  // First, try to find existing batches for FEFO
                  const existingBatchesFilter = {
                    where: {
                      and: [
                        { itemCode: trimmedItemCode },
                        { siteCode: stockHdrs.fstoreNo },
                        { uom: cartItem.docUom },
                        { qty: { gt: 0 } }
                      ]
                    }
                  };

                  try {
                    const existingBatches = await apiService.get(
                      `ItemBatches?filter=${encodeURIComponent(JSON.stringify(existingBatchesFilter))}`
                    );

                    if (existingBatches && existingBatches.length > 0) {
                      const sortedBatches = existingBatches.sort((a, b) => 
                        new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31')
                      );

                      let remainingQty = Number(cartItem.docQty);
                      
                      for (const batch of sortedBatches) {
                        if (remainingQty <= 0) break;
                        
                        const batchQty = Math.min(remainingQty, Number(batch.qty));
                        
                        const batchUpdate = {
                          itemcode: trimmedItemCode,
                          sitecode: stockHdrs.fstoreNo,
                          uom: cartItem.docUom,
                          qty: -batchQty,
                          batchcost: 0,
                          batchno: batch.batchNo,
                        };

                        await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
                          console.error(`Error reducing FEFO batch ${batch.batchNo}:`, err);
                        });

                        remainingQty -= batchQty;
                        console.log(`✅ Reduced FEFO batch ${batch.batchNo} by ${batchQty} qty`);
                      }
                    } else {
                      // No existing batches, use "No Batch" approach
                      const batchUpdate = {
                        itemcode: trimmedItemCode,
                        sitecode: stockHdrs.fstoreNo,
                        uom: cartItem.docUom,
                        qty: -Number(cartItem.docQty),
                        batchcost: 0,
                      };

                      await apiService
                        .post(`ItemBatches/updateqty`, batchUpdate)
                        .catch(async (err) => {
                          const errorLog = {
                            trnDocNo: docNo,
                            itemCode: stktrn.itemcode,
                            loginUser: userDetails.username,
                            siteCode: stockHdrs.fstoreNo,
                            logMsg: `ItemBatches/updateqty source store ${err.message}`,
                            createdDate: new Date().toISOString().split("T")[0],
                          };
                        });
                    }
                  } catch (error) {
                    console.error(`Error fetching existing batches for FEFO: ${error.message}`);
                    // Fallback to "No Batch" approach
                    const batchUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: stockHdrs.fstoreNo,
                      uom: cartItem.docUom,
                      qty: -Number(cartItem.docQty),
                      batchcost: 0,
                    };

                    await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
                      console.error(`Error with fallback "No Batch" update:`, err);
                    });
                  }
                }
              }
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
        
        // 11) Final header status update to 7 - Only after all operations are complete
        await apiService.post(`StkMovdocHdrs/update?[where][docNo]=${docNo}`, {
          docStatus: "7",
        });

        // 1. Auto-Post handling
        // if (getConfigValue('AUTO_POST') === "Yes") {
        //   const stktrns1 = details.map((item) =>
        //     createTransactionObject(item, docNo, formData.docToSite)
        //   );
        //   await processTransactions(stktrns1);
        // }

        // if (getConfigValue('AUTO_POST') === "Yes") {
        //   for (const item of details) {
        //     await apiService1.get(
        //       `api/postToOutItemBatchSno?formName=GTI&docNo=${docNo}&itemCode=${item.itemcode}&Uom=${item.docUom}`
        //     );
        //   }
        // }

        // 3. Email Notification
        // if (window.APP_CONFIG.NOTIFICATION_MAIL_SEND === "Yes") {
        //   const printList = await apiService.get(
        //     `Stkprintlists?filter={"where":{"docNo":"${docNo}"}}`
        //   );

        //   if (printList && printList.length > 0) {
        //     const emailData = {
        //       to: window.APP_CONFIG.NOTIFICATION_MAIL1,
        //       cc: window.APP_CONFIG.NOTIFICATION_MAIL2,
        //       subject: "NOTIFICATION FOR STOCK TRANSFER",
        //       body: generateEmailBody(printList[0], details)
        //     };

        //     await apiService.post("EmailService/send", emailData);
        //   }
        // }
        // }
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
  
  // Batch selection state
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchBreakdown, setBatchBreakdown] = useState([]);
  // const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  // NEW: Per-item loading state for batch selection
  // const [itemBatchLoading, setItemBatchLoading] = useState({});

  // 2. Add handleBatchEditClick and handleBatchEditSubmit
  const handleBatchEditClick = () => {
    setIsBatchEdit(true);
    setEditData({ docBatchNo: "", docExpdate: "", itemRemark: "" });
    setShowEditDialog(true);
  };



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

    // Check if source store is selected
    if (!stockHdrs.fstoreNo) {
      toast.error("Please select a source store first");
      return;
    }

    // Check if destination store is selected
    if (!stockHdrs.tstoreNo) {
      toast.error("Please select a destination store first");
      return;
    }

    // Check if destination store is different from source store
    if (stockHdrs.fstoreNo === stockHdrs.tstoreNo) {
      toast.error("Source and destination stores must be different");
      return;
    }

    // Set loading state for this specific item
    setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: true }));
    try {
      // Determine if this is a cart item or stock item
      const isCartItem = item.hasOwnProperty('docQty');
      const itemCode = isCartItem ? item.itemcode : item.stockCode;
      const itemUom = isCartItem ? item.docUom : item.uom;
      const transferQty = isCartItem ? Number(item.docQty) : Number(item.Qty);

      // Fetch ItemBatches for this item from the source store
      const filter = {
        where: {
          and: [
            { itemCode: itemCode },
            { siteCode: stockHdrs.fstoreNo }, // Source store
            { uom: itemUom }
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

      // Check if there are any batches with actual batch numbers (not empty strings)
      const actualBatches = response.filter(batch => 
        batch.batchNo && batch.batchNo.trim() !== "" && Number(batch.qty) > 0
      );

      if (actualBatches.length === 0) {
        toast.error("No batches with batch numbers available for this item. Only 'No Batch' items exist.");
        return;
      }

      // Process batch data
      const batches = response.map(batch => ({
        batchNo: batch.batchNo || "",
        availableQty: Number(batch.qty) || 0,
        expDate: batch.expDate,
        batchCost: batch.batchCost
      }));

      // Sort by expiry date (FEFO) - actual batches first, then "No Batch"
      const sortedActualBatches = actualBatches.map(batch => ({
        batchNo: batch.batchNo,
        availableQty: Number(batch.qty) || 0,
        expDate: batch.expDate,
        batchCost: batch.batchCost
      })).sort((a, b) => {
        if (!a.expDate && !b.expDate) return 0;
        if (!a.expDate) return 1;
        if (!b.expDate) return -1;
        return new Date(a.expDate) - new Date(b.expDate);
      });
      
      const noBatchItems = response.filter(b => 
        (!b.batchNo || b.batchNo.trim() === "") && Number(b.qty) > 0
      ).map(batch => ({
        batchNo: "",
        availableQty: Number(batch.qty) || 0,
        expDate: null,
        batchCost: batch.batchCost
      }));
      
      const sortedBatches = [...sortedActualBatches, ...noBatchItems];

      // Calculate totals
      const totalBatchQty = sortedActualBatches.reduce((sum, b) => sum + b.availableQty, 0);
      const noBatchQty = noBatchItems.reduce((sum, b) => sum + b.availableQty, 0);

      // Generate scenario message
      let scenarioMessage = "";
      if (transferQty <= totalBatchQty) {
        scenarioMessage = `Transfer can be completed using available batches. ${transferQty} from batches, 0 from "No Batch".`;
      } else {
        const remainingQty = transferQty - totalBatchQty;
        scenarioMessage = `Transfer requires ${totalBatchQty} from batches and ${remainingQty} from "No Batch" items.`;
      }

      // Set edit data for batch selection
      setEditData({
        ...item,
        transferQty,
        totalBatchQty,
        noBatchQty,
        scenarioMessage
      });
      
      setBatchBreakdown(sortedBatches);
      setShowBatchDialog(true);

    } catch (error) {
      console.error("Error fetching batch information:", error);
      toast.error("Failed to fetch batch information");
    } finally {
      // Clear loading state for this specific item
      setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: false }));
    }
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

        const handleBatchSelectionSubmit = (selectedBatchData) => {
    if (!selectedBatchData) return;

    // For GTI, batch selection only stores the selection, doesn't add to cart
    // User must still click + icon to add to cart
    const transferQty = Number(editData?.Qty || 0);
    
    // Handle multiple batch selection
    if (selectedBatchData.selectedBatches && selectedBatchData.selectedBatches.length > 0) {
      // Multiple batches selected
      const batchDetails = selectedBatchData.selectedBatches.map(batch => ({
        batchNo: batch.batchNo,
        expDate: batch.expDate,
        quantity: batch.quantity
      }));
      
      const totalBatchQty = batchDetails.reduce((sum, b) => sum + b.quantity, 0);
      const noBatchTransferQty = selectedBatchData.noBatchQty || Math.max(0, transferQty - totalBatchQty);

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
                  noBatchTransferQty: noBatchTransferQty,
                  totalTransferQty: transferQty,
                  transferType: 'specific', // Mark as specific batch transfer
                  batchDetails: batchDetails // Store individual batch details
                }
              }
            : stockItem
        )
      );

      const message = noBatchTransferQty > 0 
        ? `Multiple batches selected: ${batchDetails.map(b => `${b.batchNo}(${b.quantity})`).join(', ')}. Balance ${noBatchTransferQty} will be taken from "No Batch". Now click + icon to add to cart.`
        : `Multiple batches selected: ${batchDetails.map(b => `${b.batchNo}(${b.quantity})`).join(', ')}. Now click + icon to add to cart.`;

      toast.success(message);
    } else {
      // Single batch selection (backward compatibility)
      const batchTransferQty = Math.min(transferQty, selectedBatchData.availableQty);
      const noBatchTransferQty = Math.max(0, transferQty - batchTransferQty);

      // Update the stock item to show that specific batches are selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === editData.stockCode 
            ? { 
                ...stockItem, 
                selectedBatches: {
                  batchNo: selectedBatchData.batchNo,
                  expDate: selectedBatchData.expDate,
                  batchTransferQty: batchTransferQty,
                  noBatchTransferQty: noBatchTransferQty,
                  totalTransferQty: transferQty,
                  transferType: 'specific', // Mark as specific batch transfer
                  batchDetails: [{
                    batchNo: selectedBatchData.batchNo,
                    expDate: selectedBatchData.expDate,
                    quantity: batchTransferQty
                  }]
                }
              }
            : stockItem
        )
      );

      const message = noBatchTransferQty > 0 
        ? `Specific batch ${selectedBatchData.batchNo} selected: ${batchTransferQty} qty. Balance ${noBatchTransferQty} will be taken from "No Batch". Now click + icon to add to cart.`
        : `Specific batch ${selectedBatchData.batchNo} selected: ${batchTransferQty} qty. Now click + icon to add to cart.`;

      toast.success(message);
    }

    // Reset states
    setShowBatchDialog(false);
    setEditData(null);
    setEditingIndex(null);
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

  // Helper function to handle destination store FEFO batch operations (TO store) - ADD quantity
  const handleDestinationFefoTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 Destination FEFO Transfer: ${transferQty || stktrnItem.trnQty} qty for ${trimmedItemCode}`);
    // Validate required parameters
    if (!stktrnItem || !trimmedItemCode) {
      console.error("❌ Missing required parameters for destination FEFO transfer");
      return;
    }

    // If FEFO batches are precomputed, iterate and upsert per batch
    if (Array.isArray(stktrnItem.fefoBatches) && stktrnItem.fefoBatches.length > 0) {
      for (const fb of stktrnItem.fefoBatches) {
        const destBatchNo = fb.batchNo || "";
        const destQty = Number(fb.quantity || 0);
        if (destQty <= 0) continue;

        // Include expiry date in filter to ensure batches with same batch number but different expiry dates are treated separately
        const normalizedExpDate = normalizeExpDate(fb.expDate || stktrnItem?.docExpdate);
        const filter = {
          where: {
            and: [
              { itemCode: trimmedItemCode },
              { uom: stktrnItem.itemUom },
              { siteCode: stockHdrs.tstoreNo },
              { batchNo: destBatchNo },
              ...(normalizedExpDate ? { expDate: normalizedExpDate } : {}), // Include expiry date if available
            ],
          },
        };

        const url = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`;
        const existing = await apiService
          .get(url)
          .then((resp) => resp[0])
          .catch((error) => {
            console.error("Error fetching destination batch:", error);
            return null;
          });

        if (!existing) {
          const createPayload = {
            itemCode: trimmedItemCode,
            siteCode: stockHdrs.tstoreNo,
            uom: stktrnItem.itemUom,
            qty: destQty,
            batchCost: Number(stktrnItem.itemBatchCost) || 0,
            batchNo: destBatchNo,
            expDate: normalizedExpDate, // Use normalized expiry date
          };
          await apiService.post(`ItemBatches`, createPayload).catch((err) => {
            console.error(`Error creating batch for ${trimmedItemCode}:`, err);
          });
          console.log(`✅ Created FEFO batch ${destBatchNo || "(No Batch)"} in destination store ${stockHdrs.tstoreNo} with ${destQty} qty`);
        } else {
          const updatePayload = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.tstoreNo,
            uom: stktrnItem.itemUom,
            qty: destQty,
            batchcost: 0,
            batchno: destBatchNo,
          };
          await apiService.post(`ItemBatches/updateqty`, updatePayload).catch((err) => {
            console.error(`Error updating batch for ${trimmedItemCode}:`, err);
          });
          console.log(`✅ Updated FEFO batch ${destBatchNo || "(No Batch)"} in destination store ${stockHdrs.tstoreNo} by ${destQty} qty`);
        }
      }
      return;
    }

    // Fallback to previous behavior when no fefoBatches supplied
    const qty = transferQty || Number(stktrnItem.trnQty);
    if (qty <= 0) {
      console.error(`❌ Invalid transfer quantity: ${qty}`);
      return;
    }

    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";

    if (isNoBatchTransfer) {
      const noBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.tstoreNo },
            { batchNo: "" },
          ],
        },
      };

      const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`;
      let existingNoBatch = await apiService
        .get(noBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching destination 'No Batch':", error);
          return null;
        });

      if (!existingNoBatch) {
        const batchCreate = {
          itemCode: trimmedItemCode,
          siteCode: stockHdrs.tstoreNo,
          uom: stktrnItem.itemUom,
          qty: qty,
          batchCost: 0,
          batchNo: "",
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating 'No Batch' for ${trimmedItemCode}:`, err);
        });
      } else {
        const noBatchDestUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.tstoreNo,
          uom: stktrnItem.itemUom,
          qty: qty,
          batchcost: 0,
        };

        await apiService
          .post(`ItemBatches/updateqty`, noBatchDestUpdate)
          .catch(async (err) => {
            console.error(`Error updating "No Batch" for ${trimmedItemCode}:`, err);
          });
      }
    } else {
      // Include expiry date in filter to ensure batches with same batch number but different expiry dates are treated separately
      const normalizedExpDate = normalizeExpDate(stktrnItem?.docExpdate);
      const specificBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.tstoreNo },
            { batchNo: stktrnItem.itemBatch },
            ...(normalizedExpDate ? { expDate: normalizedExpDate } : {}), // Include expiry date if available
          ],
        },
      };

      const specificBatchUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(specificBatchFilter))}`;
      let existingBatch = await apiService
        .get(specificBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching destination batch:", error);
          return null;
        });

      if (!existingBatch) {
        const batchCreate = {
          itemCode: trimmedItemCode,
          siteCode: stockHdrs.tstoreNo,
          uom: stktrnItem.itemUom,
          qty: qty,
          batchCost: Number(stktrnItem.itemBatchCost) || 0,
          batchNo: stktrnItem.itemBatch,
          expDate: normalizedExpDate, // Use normalized expiry date
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Created new FEFO batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} with ${qty} qty`);
      } else {
        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTI
          uom: stktrnItem.itemUom,
          qty: qty,
          batchcost: 0,
          batchno: stktrnItem.itemBatch,
        };

        await apiService
          .post(`ItemBatches/updateqty`, batchUpdate)
          .catch(async (err) => {
            console.error(`Error updating batch for ${trimmedItemCode}:`, err);
          });

        console.log(`✅ Updated existing FEFO batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
      }
    }
  };

  // Helper function to handle source store FEFO batch operations (FROM store) - REDUCE quantity
  // This function also coordinates with destination store to ensure proper batch transfer
  const handleSourceFefoTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 Source FEFO Transfer: ${transferQty || stktrnItem.trnQty} qty for ${trimmedItemCode}`);
    
    // Validate required parameters
    if (!stktrnItem || !trimmedItemCode) {
      console.error("❌ Missing required parameters for source FEFO transfer");
      return;
    }

    const qty = transferQty || Number(stktrnItem.trnQty);
    if (qty <= 0) {
      console.error(`❌ Invalid transfer quantity: ${qty}`);
      return;
    }

    // Find all available batches in source store (including "No Batch")
    const allBatchesFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { siteCode: stockHdrs.fstoreNo }, // Source store
          { uom: stktrnItem.itemUom },
          { qty: { gt: 0 } } // Only batches with available quantity
        ]
      }
    };

    try {
      const allBatches = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(allBatchesFilter))}`
      );

      if (allBatches && allBatches.length > 0) {
        // Separate specific batches from "No Batch" records
        const specificBatches = allBatches.filter(batch => 
          batch.batchNo && batch.batchNo.trim() !== ""
        );
        const noBatchRecords = allBatches.filter(batch => 
          !batch.batchNo || batch.batchNo.trim() === ""
        );

        // Sort specific batches by expiry date (FEFO)
        const sortedBatches = specificBatches.sort((a, b) => 
          new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31')
        );

        let remainingQty = qty;
        const transferDetails = []; // Track what we're transferring

        // First, try to fulfill from specific batches (FEFO)
        for (const batch of sortedBatches) {
          if (remainingQty <= 0) break;
          
          const batchQty = Math.min(remainingQty, Number(batch.qty));
          
          // Reduce source batch
          const sourceUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.fstoreNo,
            uom: stktrnItem.itemUom,
            qty: -batchQty, // Negative to reduce quantity
            batchcost: 0,
            batchno: batch.batchNo,
          };

          await apiService.post(`ItemBatches/updateqty`, sourceUpdate).catch(async (err) => {
            console.error(`Error reducing FEFO batch ${batch.batchNo}:`, err);
          });

          // Add to transfer details for destination store
          transferDetails.push({
            batchNo: batch.batchNo,
            qty: batchQty,
            expDate: batch.expDate,
            batchCost: batch.batchCost
          });

          remainingQty -= batchQty;
          console.log(`✅ Reduced FEFO batch ${batch.batchNo} by ${batchQty} qty`);
        }

        // If still need more quantity, take from "No Batch" records
        if (remainingQty > 0 && noBatchRecords.length > 0) {
          const noBatchRecord = noBatchRecords[0]; // Take first "No Batch" record
          const noBatchQty = Math.min(remainingQty, Number(noBatchRecord.qty));
          
          // Reduce source "No Batch"
          const noBatchSourceUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.fstoreNo,
            uom: stktrnItem.itemUom,
            qty: -noBatchQty, // Negative to reduce quantity
            batchcost: 0,
            // No batchno key for "No Batch" records
          };

          await apiService.post(`ItemBatches/updateqty`, noBatchSourceUpdate).catch(async (err) => {
            console.error(`Error reducing "No Batch":`, err);
          });

          // Add to transfer details for destination store
          transferDetails.push({
            batchNo: "", // "No Batch"
            qty: noBatchQty,
            expDate: null,
            batchCost: noBatchRecord.batchCost
          });

          remainingQty -= noBatchQty;
          console.log(`✅ Reduced "No Batch" by ${noBatchQty} qty`);
        }

        // Source FEFO transfer completed - destination store will be handled separately
        console.log(`✅ Source FEFO transfer completed for ${trimmedItemCode}: ${transferDetails.length} batches processed`);

        if (remainingQty > 0) {
          console.warn(`⚠️ Could not fulfill complete source transfer. Remaining qty: ${remainingQty}`);
        }
      } else {
        console.error(`❌ No batches found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
      }
    } catch (error) {
      console.error(`Error in source FEFO transfer: ${error.message}`);
    }
  };

  // Helper function to handle GTI FEFO transfer when BATCH_NO = "Yes" (DEPRECATED - use separate functions)
  const handleGtiFefoTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 GTI FEFO Transfer: ${transferQty} qty for ${trimmedItemCode}`);
    
    // Find all available batches in source store (including "No Batch")
    const allBatchesFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { siteCode: stockHdrs.fstoreNo }, // Source store
          { uom: stktrnItem.itemUom },
          { qty: { gt: 0 } } // Only batches with available quantity
        ]
      }
    };

    try {
      const allBatches = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(allBatchesFilter))}`
      );

      if (allBatches && allBatches.length > 0) {
        // Separate specific batches from "No Batch" records
        const specificBatches = allBatches.filter(batch => 
          batch.batchNo && batch.batchNo.trim() !== ""
        );
        const noBatchRecords = allBatches.filter(batch => 
          !batch.batchNo || batch.batchNo.trim() === ""
        );

        // Sort specific batches by expiry date (FEFO)
        const sortedBatches = specificBatches.sort((a, b) => 
          new Date(a.expDate || '9999-12-31') - new Date(b.expDate || '9999-12-31')
        );

        let remainingQty = transferQty || Number(stktrnItem.trnQty);
        const transferDetails = []; // Track what we're transferring

        // First, try to fulfill from specific batches (FEFO)
        for (const batch of sortedBatches) {
          if (remainingQty <= 0) break;
          
          const batchQty = Math.min(remainingQty, Number(batch.qty));
          
          // Reduce source batch
          const sourceUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.fstoreNo,
            uom: stktrnItem.itemUom,
            qty: -batchQty, // Negative to reduce quantity
            batchcost: 0,
            batchno: batch.batchNo,
          };

          await apiService.post(`ItemBatches/updateqty`, sourceUpdate).catch(async (err) => {
            console.error(`Error reducing FEFO batch ${batch.batchNo}:`, err);
          });

          // Add to transfer details
          transferDetails.push({
            batchNo: batch.batchNo,
            qty: batchQty,
            expDate: batch.expDate,
            batchCost: batch.batchCost
          });

          remainingQty -= batchQty;
          console.log(`✅ Reduced FEFO batch ${batch.batchNo} by ${batchQty} qty`);
        }

        // If still need more quantity, take from "No Batch" records
        if (remainingQty > 0 && noBatchRecords.length > 0) {
          const noBatchRecord = noBatchRecords[0]; // Take first "No Batch" record
          const noBatchQty = Math.min(remainingQty, Number(noBatchRecord.qty));
          
          // Reduce source "No Batch"
          const noBatchSourceUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.fstoreNo,
            uom: stktrnItem.itemUom,
            qty: -noBatchQty, // Negative to reduce quantity
            batchcost: 0,
            // No batchno key for "No Batch" records
          };

          await apiService.post(`ItemBatches/updateqty`, noBatchSourceUpdate).catch(async (err) => {
            console.error(`Error reducing "No Batch":`, err);
          });

          // Add to transfer details
          transferDetails.push({
            batchNo: "", // "No Batch"
            qty: noBatchQty,
            expDate: null,
            batchCost: noBatchRecord.batchCost
          });

          remainingQty -= noBatchQty;
          console.log(`✅ Reduced "No Batch" by ${noBatchQty} qty`);
        }

        // GTI FEFO transfer completed - destination store will be handled separately
        console.log(`✅ GTI FEFO transfer completed for ${trimmedItemCode}: ${transferDetails.length} batches processed`);

        if (remainingQty > 0) {
          console.warn(`⚠️ Could not fulfill complete transfer. Remaining qty: ${remainingQty}`);
        }
      } else {
        console.error(`❌ No batches found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
      }
    } catch (error) {
      console.error(`Error in GTI FEFO transfer: ${error.message}`);
    }
  };

  // Helper function to handle multi-batch transfers (creates separate records for each batch)
  const handleMultiBatchTransfer = async (stktrnItem, trimmedItemCode, docNo, userDetails, cartItem) => {
    if (!cartItem || !cartItem.batchDetails || !cartItem.batchDetails.individualBatches) {
      // Fallback to single batch transfer - handle both destination and source
      await handleDestinationBatchTransfer(stktrnItem, trimmedItemCode, stktrnItem.trnQty);
      await handleSourceBatchTransfer(stktrnItem, trimmedItemCode, stktrnItem.trnQty);
      return;
    }

    console.log(`🔄 Processing multi-batch transfer for ${trimmedItemCode}`, cartItem.batchDetails.individualBatches);

    // Process each individual batch separately
    for (const batchDetail of cartItem.batchDetails.individualBatches) {
      console.log(`🔄 Processing individual batch: ${batchDetail.batchNo} with qty: ${batchDetail.quantity}`);
      
      const individualStktrnItem = {
        ...stktrnItem,
        itemBatch: batchDetail.batchNo, // Use individual batch number
        trnQty: batchDetail.quantity,   // Use individual quantity
        trnCost: (Number(stktrnItem.trnCost) / Number(stktrnItem.trnQty)) * batchDetail.quantity, // Proportional cost
        itemBatchCost: stktrnItem.itemBatchCost, // Keep original batch cost per unit
        docExpdate: batchDetail.expDate // Use individual expiry date
      };

      console.log(`📤 Transferring batch ${batchDetail.batchNo}: ${batchDetail.quantity} qty from ${stockHdrs.fstoreNo} to ${stktrnItem.storeNo}`);
      // Handle destination store for this individual batch
      await handleDestinationBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
      
      // Handle source store for this individual batch
      await handleSourceBatchTransfer(individualStktrnItem, trimmedItemCode, batchDetail.quantity);
    }

    // Handle "No Batch" transfer if needed
    if (cartItem.batchDetails.noBatchTransferQty > 0) {
      await handleNoBatchTransfer(stktrnItem, trimmedItemCode, cartItem, docNo, userDetails);
    }
  };

  // Helper function to handle destination store batch operations (TO store)
  const handleDestinationBatchTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 Destination Batch Transfer: ${transferQty || stktrnItem.trnQty} qty for ${trimmedItemCode}`);
    
    // Validate required parameters
    if (!stktrnItem || !trimmedItemCode) {
      console.error("❌ Missing required parameters for destination batch transfer");
      return;
    }

    const qty = transferQty || Number(stktrnItem.trnQty);
    if (qty <= 0) {
      console.error(`❌ Invalid transfer quantity: ${qty}`);
      return;
    }

    // Check if this is a "No Batch" transfer
    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";
    
    if (isNoBatchTransfer) {
      // Handle "No Batch" transfer to destination store with existence check
      const noBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stktrnItem.storeNo },
            { batchNo: "" }, // "No Batch" record
          ],
        },
      };

      const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(
        JSON.stringify(noBatchFilter)
      )}`;
      let existingNoBatch = await apiService
        .get(noBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching destination 'No Batch':", error);
          return null;
        });

      if (!existingNoBatch) {
        // Create new "No Batch" record in destination store
        const batchCreate = {
          itemCode: trimmedItemCode,
          siteCode: stktrnItem.storeNo,
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchCost: 0,
          batchNo: "",
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating 'No Batch' for ${trimmedItemCode}:`, err);
        });
      } else {
        const noBatchDestUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stktrnItem.storeNo, // Destination store
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchcost: 0,
        };

        await apiService
          .post(`ItemBatches/updateqty`, noBatchDestUpdate)
          .catch(async (err) => {
            console.error(`Error updating "No Batch" for ${trimmedItemCode}:`, err);
          });
      }
    } else {
      // Handle specific batch transfer to destination store
      // First, check if the specific batch exists in destination store
      // Include expiry date in filter to ensure batches with same batch number but different expiry dates are treated separately
      const normalizedExpDate = normalizeExpDate(stktrnItem?.docExpdate);
      const specificBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stktrnItem.storeNo },
            { batchNo: stktrnItem.itemBatch }, // Filter by specific batch
            ...(normalizedExpDate ? { expDate: normalizedExpDate } : {}), // Include expiry date if available
          ],
        },
      };

      const specificBatchUrl = `ItemBatches?filter=${encodeURIComponent(
        JSON.stringify(specificBatchFilter)
      )}`;
      let existingBatch = await apiService
        .get(specificBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching destination batch:", error);
          return null;
        });

      if (!existingBatch) {
        // Create new batch record in destination store
        const batchCreate = {
          itemCode: trimmedItemCode,
          siteCode: stktrnItem.storeNo,
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchCost: Number(stktrnItem.itemBatchCost) || 0,
          batchNo: stktrnItem.itemBatch,
          expDate: normalizedExpDate, // Use normalized expiry date
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Created new batch ${stktrnItem.itemBatch} in destination store ${stktrnItem.storeNo} with ${qty} qty`);
      } else {
        // Update existing batch in destination store
        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stktrnItem.storeNo,
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchcost: 0,
          batchno: stktrnItem.itemBatch,
        };

        await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
          console.error(`Error updating batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Updated existing batch ${stktrnItem.itemBatch} in destination store ${stktrnItem.storeNo} by ${qty} qty`);
      }
    }
  };

  // Helper function to handle source store batch operations (FROM store) - REDUCE quantity
  const handleSourceBatchTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 Source Batch Transfer: ${transferQty || stktrnItem.trnQty} qty for ${trimmedItemCode}`);
    
    // Validate required parameters
    if (!stktrnItem || !trimmedItemCode) {
      console.error("❌ Missing required parameters for source batch transfer");
      return;
    }

    const qty = transferQty || Number(stktrnItem.trnQty);
    if (qty <= 0) {
      console.error(`❌ Invalid transfer quantity: ${qty}`);
      return;
    }

    // Check if this is a "No Batch" transfer
    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";
    
    if (isNoBatchTransfer) {
      // Handle "No Batch" transfer from source store
      const noBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.fstoreNo },
            { or: [{ batchNo: "" }, { batchNo: null }] }, // "No Batch" records
          ],
        },
      };

      const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`;
      let noBatchRecord = await apiService
        .get(noBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching 'No Batch' record:", error);
          return null;
        });

      if (noBatchRecord) {
        // Validate available quantity
        const availableQty = Number(noBatchRecord.qty);
        if (availableQty < qty) {
          console.error(`❌ Insufficient "No Batch" quantity. Available: ${availableQty}, Required: ${qty}`);
          return;
        }

        // Reduce "No Batch" quantity in source store
        const noBatchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.fstoreNo,
          uom: stktrnItem.itemUom,
          qty: -qty, // NEGATIVE to reduce quantity
          batchcost: 0,
          // No batchno key for "No Batch" records
        };

        await apiService.post(`ItemBatches/updateqty`, noBatchUpdate).catch(async (err) => {
          console.error(`Error reducing "No Batch" for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Reduced source store ${stockHdrs.fstoreNo} "No Batch" by ${qty} qty`);
      } else {
        console.error(`❌ No "No Batch" records found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
      }
    } else {
      // Handle specific batch transfer from source store
      // First, check if the specific batch exists in source store
      const specificBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.fstoreNo },
            { batchNo: stktrnItem.itemBatch }, // Filter by specific batch
          ],
        },
      };

    const sourceUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(specificBatchFilter))}`;
    let sourceBatch = await apiService
      .get(sourceUrl)
      .then((resp) => resp[0])
      .catch((error) => {
        console.error("Error fetching source batch:", error);
        return null;
      });

    // Check if this is a "No Batch" transfer
    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";
    
    if (isNoBatchTransfer) {
      // Handle "No Batch" transfer from source store
      const noBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.fstoreNo },
            { or: [{ batchNo: "" }, { batchNo: null }] }, // "No Batch" records
          ],
        },
      };

      const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`;
      let noBatchRecord = await apiService
        .get(noBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching 'No Batch' record:", error);
          return null;
        });

      if (noBatchRecord) {
        // Reduce "No Batch" quantity in source store
        const noBatchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.fstoreNo,
          uom: stktrnItem.itemUom,
          qty: -(transferQty || Number(stktrnItem.trnQty)), // NEGATIVE to reduce quantity
          batchcost: 0,
          // No batchno key for "No Batch" records
        };

        await apiService.post(`ItemBatches/updateqty`, noBatchUpdate).catch(async (err) => {
          console.error(`Error reducing "No Batch" for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Reduced source store ${stockHdrs.fstoreNo} "No Batch" by ${transferQty || stktrnItem.trnQty} qty`);
      } else {
        console.error(`❌ No "No Batch" records found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
      }
    } else {
      // Handle specific batch transfer from source store
      if (sourceBatch) {
        // Reduce quantity in source store by the transfer amount
        const sourceUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.fstoreNo,
          uom: stktrnItem.itemUom,
          qty: -(transferQty || Number(stktrnItem.trnQty)), // NEGATIVE to reduce quantity
          batchcost: 0,
          batchno: stktrnItem.itemBatch,
        };

        await apiService.post(`ItemBatches/updateqty`, sourceUpdate).catch(async (err) => {
          console.error(`Error reducing source batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Reduced source store ${stockHdrs.fstoreNo} batch ${stktrnItem.itemBatch} by ${transferQty || stktrnItem.trnQty} qty`);
      } else {
        // EDGE CASE: Specific batch not found, try "No Batch" fallback
        console.warn(`⚠️ Source batch ${stktrnItem.itemBatch} not found in store ${stockHdrs.fstoreNo}, trying "No Batch" fallback`);
        
        const noBatchFilter = {
          where: {
            and: [
              { itemCode: trimmedItemCode },
              { uom: stktrnItem.itemUom },
              { siteCode: stockHdrs.fstoreNo },
              { or: [{ batchNo: "" }, { batchNo: null }] }, // "No Batch" records
            ],
          },
        };

        const noBatchUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`;
        let noBatchRecord = await apiService
          .get(noBatchUrl)
          .then((resp) => resp[0])
          .catch((error) => {
            console.error("Error fetching 'No Batch' record:", error);
            return null;
          });

        if (noBatchRecord) {
          // Fallback to "No Batch" record
          const noBatchUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.fstoreNo,
            uom: stktrnItem.itemUom,
            qty: -(transferQty || Number(stktrnItem.trnQty)), // NEGATIVE to reduce quantity
            batchcost: 0,
            // No batchno key for "No Batch" records
          };

          await apiService.post(`ItemBatches/updateqty`, noBatchUpdate).catch(async (err) => {
            console.error(`Error reducing "No Batch" for ${trimmedItemCode}:`, err);
          });

          console.log(`✅ Reduced source store ${stockHdrs.fstoreNo} "No Batch" by ${transferQty || stktrnItem.trnQty} qty (fallback)`);
        } else {
          console.error(`❌ No batch records found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
        }
      }
    }
  };
  }
  // Helper function to handle separate "No Batch" transfers
  const handleNoBatchTransfer = async (stktrnItem, trimmedItemCode, cartItem, docNo, userDetails) => {
    if (!cartItem.noBatchTransferQty || cartItem.noBatchTransferQty <= 0) {
      return; // No "No Batch" quantity to transfer
    }

    console.log(`🔄 Processing "No Batch" transfer: ${cartItem.noBatchTransferQty} qty for ${trimmedItemCode}`);

    // Find or create "No Batch" record in destination store
    const noBatchFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: stktrnItem.itemUom },
          { siteCode: stktrnItem.storeNo },
          { or: [{ batchNo: "" }, { batchNo: null }] }, // "No Batch" records
        ],
      },
    };

    const url = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`;
    let existingNoBatch = await apiService
      .get(url)
      .then((resp) => resp[0])
      .catch((error) => {
        console.error("Error fetching 'No Batch' record:", error);
        return null;
      });

    if (!existingNoBatch) {
      // Create new "No Batch" record in destination store
      const noBatchCreate = {
        itemCode: trimmedItemCode,
        siteCode: stktrnItem.storeNo,
        uom: stktrnItem.itemUom,
        qty: cartItem.noBatchTransferQty,
        batchCost: Number(stktrnItem.itemBatchCost), // Use same cost as main transfer
        batchNo: "", // Empty string for "No Batch"
        expDate: null, // No expiry for "No Batch"
      };

      await apiService.post(`ItemBatches`, noBatchCreate).catch(async (err) => {
        console.error(`Error creating 'No Batch' record for ${trimmedItemCode}:`, err);
      });
    } else {
      // Update existing "No Batch" record in destination store
      const noBatchUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stktrnItem.storeNo,
        uom: stktrnItem.itemUom,
        qty: cartItem.noBatchTransferQty,
        batchcost: 0,
        // No batchNo key for "No Batch" transfers
      };

      await apiService.post(`ItemBatches/updateqty`, noBatchUpdate).catch(async (err) => {
        console.error(`Error updating 'No Batch' record for ${trimmedItemCode}:`, err);
      });
    }

    // Also update source store "No Batch" record (reduce quantity)
    const sourceNoBatchFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: stktrnItem.itemUom },
          { siteCode: stockHdrs.fstoreNo }, // Source store
          { or: [{ batchNo: "" }, { batchNo: null }] },
        ],
      },
    };

    const sourceUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(sourceNoBatchFilter))}`;
    let sourceNoBatch = await apiService
      .get(sourceUrl)
      .then((resp) => resp[0])
      .catch((error) => {
        console.error("Error fetching source 'No Batch' record:", error);
        return null;
      });

    if (sourceNoBatch) {
      // Reduce quantity in source store
      const sourceUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.fstoreNo,
        uom: stktrnItem.itemUom,
        qty: -cartItem.noBatchTransferQty, // Negative to reduce
        batchcost: 0,
        // No batchNo key for "No Batch" transfers
      };

      await apiService.post(`ItemBatches/updateqty`, sourceUpdate).catch(async (err) => {
        console.error(`Error updating source 'No Batch' record for ${trimmedItemCode}:`, err);
      });
    }
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
            // 1. Get the ORIGINAL Stktrns record (what was posted before) - for destination store
            const originalStktrnFilter = {
              where: {
                and: [
                  { trnDocno: docNo },
                  { storeNo: stockHdrs.tstoreNo }, // Destination store
                  { itemcode: item.itemcode + "0000" }
                ]
              }
            };

            const originalStktrn = await apiService.get(
              `Stktrns?filter=${encodeURIComponent(JSON.stringify(originalStktrnFilter))}`
            );

            // 2. Get CURRENT balance from ItemOnQties for destination store
            const currentBalanceFilter = {
              where: {
                and: [
                  { itemcode: item.itemcode + "0000" },
                  { uom: item.docUom },
                  { sitecode: stockHdrs.tstoreNo } // Destination store
                ]
              }
            };
            
            console.log(`🔍 ItemOnQties filter for destination store:`, currentBalanceFilter);

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
                "storeNo": stockHdrs.tstoreNo, // Destination store
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
                storeNo: stockHdrs.tstoreNo, // Destination store
                tstoreNo: stockHdrs.tstoreNo, // Destination store
                fstoreNo: stockHdrs.fstoreNo, // Source store
                trnDocno: docNo,
                trnType: "TFRF",
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
            
            if (getConfigValue('BATCH_NO') === "Yes") {
              // WITH BATCH NUMBERS: Find and update specific batch record
              console.log(`Processing ItemBatch update with BATCH_NO=Yes for ${item.itemcode}`);
              
              const specificBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: stockHdrs.tstoreNo }, // Destination store
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
                    { siteCode: stockHdrs.tstoreNo }, // Destination store
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

  const handleEditCartItem = (index) => {
    setEditData(cartData[index]);
    setEditingIndex(index);
    setShowEditDialog(true);
  };

  const handleBatchSelectionFromEdit = (cartItem) => {
    // Set the edit data for batch selection
    setEditData(cartItem);
    setEditingIndex(editingIndex);
    // Open batch selection dialog
    setShowBatchDialog(true);
  };

  // NEW: Function to show transfer preview
  const showTransferPreview = (item) => {
    // Debug: Log batch details structure
    console.log('🔍 Preview item batch details:', {
      itemcode: item.itemcode,
      transferType: item.transferType,
      batchDetails: item.batchDetails,
      individualBatches: item.batchDetails?.individualBatches,
      individualBatchesWithExpDate: item.batchDetails?.individualBatches?.map(b => ({ 
        batchNo: b.batchNo, 
        quantity: b.quantity,
        expDate: b.expDate,
        expDateType: typeof b.expDate,
        hasExpDate: !!b.expDate
      })),
      ordMemo4: item.ordMemo4,
      ordMemo2: item.ordMemo2
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
            <DialogTitle>Transfer Details Preview</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Item: {previewItem.itemcode} - {previewItem.itemdesc}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transfer Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Transfer Summary</p>
                  <div className="mt-2 text-xs space-y-1">
                    <p><strong>Total Transfer Qty:</strong> {previewItem.docQty}</p>
                    <p><strong>Transfer Type:</strong> Specific Batches</p>
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

            {/* Transfer Flow Info */}
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Transfer Flow</p>
                  <p className="text-xs mt-1">
                    Items will be transferred from {stockHdrs.fstoreNo} to {stockHdrs.tstoreNo} using the selected batch quantities.
                    {previewItem.batchDetails?.noBatchTransferQty > 0 && 
                      ` Balance ${previewItem.batchDetails.noBatchTransferQty} will be taken from "No Batch" items.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)} className="cursor-pointer">
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

                    <Select
                      value={stockHdrs.fstoreNo || ""} // Add fallback empty string
                      disabled={urlStatus == 7 || urlDocNo || cartData.length > 0} // Disable if viewing/editing existing doc or items in cart
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
                      disabled={true} // Always disabled for GTI
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
              {urlStatus != 7 && !stockHdrs.fstoreNo && (
                <Card className={"p-0 gap-0"}>
                  <CardContent className="p-4">
                    <div className="text-center py-8 text-gray-500">
                      <p>Please select "From Store" to view and select items</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {urlStatus != 7 && stockHdrs.fstoreNo && (
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
                      enableSorting={true}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                      // NEW: Batch selection for GTI
                      onBatchSelection={(index, item) => handleRowBatchSelection(item, index)}
                      onRemoveBatchSelection={handleRemoveBatchSelection}
                      isBatchLoading={false} // Global loading not needed
                      itemBatchLoading={itemBatchLoading} // Pass per-item loading state
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
          {/* Move the Add Item Details button to the top right above the table */}
          {cartData.length > 0 && (
            <div className="flex justify-end my-5 space-x-2">
              {selectedRows.length > 0 && (urlStatus != 7 || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True")) && (
                <>

                  <Button
                    onClick={handleBatchEditClick}
                    className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
                  >
                    Update Selected
                  </Button>
                </>
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
                    <TableHead>FOC Qty</TableHead>
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableHead>Price</TableHead>
                    )}
                    <TableHead>Discount %</TableHead>
                    <TableHead>Discount Amt</TableHead>
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
                          <TableCell>{item.docFocqty || 0}</TableCell>
                          {userDetails?.isSettingViewPrice === "True" && (
                            <TableCell>{item.docPrice}</TableCell>
                          )}
                          <TableCell>{item.docPdisc || 0}%</TableCell>
                          <TableCell>{item.docDisc || 0}</TableCell>
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
          onSubmit={handleEditSubmit}
          isBatchEdit={isBatchEdit}
          urlStatus={urlStatus}
          userDetails={userDetails}
        />
              <BatchSelectionDialog
          showBatchDialog={showBatchDialog}
          setShowBatchDialog={setShowBatchDialog}
          batchBreakdown={batchBreakdown}
          transferQty={editData?.transferQty || editData?.Qty || 0}
          totalBatchQty={batchBreakdown.reduce((sum, b) => b.batchNo !== "" ? sum + b.availableQty : sum, 0)}
          noBatchQty={batchBreakdown.reduce((sum, b) => b.batchNo === "" ? sum + b.availableQty : sum, 0)}
          scenarioMessage={editData?.scenarioMessage || ""}
          onBatchSelectionSubmit={handleBatchSelectionSubmit}
          itemcode={editData?.stockCode || editData?.itemcode}
          itemdesc={editData?.stockName || editData?.itemdesc}
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
      <TransferPreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewItem={previewItem}
      />
    </>
  );
}

export default AddGti;
