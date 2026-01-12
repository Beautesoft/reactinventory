import React, { useState, useEffect, use, memo, useCallback, useMemo } from "react";
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
  Package,
  Info,
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
  getConfigValue,
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

// Batch Selection Dialog Component for Stock Take
const StockTakeBatchSelectionDialog = memo(
  ({
    showBatchDialog,
    setShowBatchDialog,
    batchBreakdown,
    countedQty,
    totalBatchQty,
    noBatchQty,
    onBatchSelectionSubmit,
    itemcode,
    itemdesc,
  }) => {
    // Helper function to create unique batch key from batchNo and expDate
    const getBatchKey = (batch) => {
      return `${batch.batchNo || ''}_${batch.expDate || ''}`;
    };

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

    // Initialize with existing batch breakdown if available
    useEffect(() => {
      if (showBatchDialog && batchBreakdown && batchBreakdown.length > 0) {
        // Find batches with counted quantity > 0
        const batchesWithQty = batchBreakdown.filter((b) => (b.countedQty || 0) > 0);
        
        if (batchesWithQty.length > 0) {
          // Separate batches with batch numbers and "No Batch"
          const existingBatches = batchesWithQty.filter((b) => b.batchNo !== "");
          const existingNoBatch = batchesWithQty.find((b) => b.batchNo === "");
          
          if (existingBatches.length > 0) {
            // Map to ensure we have all required fields from batchBreakdown
            setSelectedBatches(existingBatches.map((b) => {
              return {
                batchNo: b.batchNo,
                expDate: b.expDate || null,
                availableQty: b.availableQty || 0,
              };
            }));
            const quantities = {};
            existingBatches.forEach((b) => {
              const batchKey = getBatchKey(b);
              quantities[batchKey] = b.countedQty || 0;
            });
            setBatchQuantities(quantities);
          }
          
          if (existingNoBatch) {
            setNoBatchSelected(true);
            setNoBatchQuantity(existingNoBatch.countedQty || 0);
          }
        }
      }
    }, [showBatchDialog, batchBreakdown]);

    // Calculate total selected quantity (including No Batch)
    const totalSelectedQty =
      selectedBatches.reduce(
        (sum, batch) => {
          const batchKey = getBatchKey(batch);
          return sum + (batchQuantities[batchKey] || 0);
        },
        0
      ) + (noBatchSelected ? noBatchQuantity : 0);
    const remainingQty = Math.abs(countedQty || 0) - totalSelectedQty;

    const handleBatchSelection = (batch, isSelected) => {
      const batchKey = getBatchKey(batch);
      
      if (isSelected) {
        setSelectedBatches((prev) => [...prev, batch]);
        // Auto-set counted quantity to available quantity when checkbox is checked
        // User can then adjust it if needed
        const initialQty = batch.availableQty || 0;
        setBatchQuantities((prev) => ({
          ...prev,
          [batchKey]: initialQty,
        }));
      } else {
        setSelectedBatches((prev) =>
          prev.filter((b) => getBatchKey(b) !== batchKey)
        );
        setBatchQuantities((prev) => {
          const newQuantities = { ...prev };
          delete newQuantities[batchKey];
          return newQuantities;
        });
      }
    };

    const handleQuantityChange = (batch, quantity) => {
      if (!batch) return;
      
      const batchKey = getBatchKey(batch);
      const qty = parseFloat(quantity) || 0;
      
      // Calculate current total selected quantity (excluding this batch)
      const currentTotal = selectedBatches.reduce(
        (sum, b) => {
          const key = getBatchKey(b);
          return sum + (key === batchKey ? 0 : (batchQuantities[key] || 0));
        },
        0
      ) + (noBatchSelected ? noBatchQuantity : 0);
      
      // Calculate remaining quantity available for this batch
      const remainingForThisBatch = Math.abs(countedQty || 0) - currentTotal;
      
      // Allow quantity between 0 and remaining, but can exceed available if counted more
      const currentQty = batchQuantities[batchKey] || 0;
      const validQty = Math.max(0, Math.min(qty, remainingForThisBatch + currentQty));
      setBatchQuantities((prev) => ({ ...prev, [batchKey]: validQty }));
    };

    const handleNoBatchSelection = (isSelected) => {
      setNoBatchSelected(isSelected);
      if (!isSelected) {
        setNoBatchQuantity(0);
      } else {
        // Auto-set counted quantity to available quantity when checkbox is checked
        // User can then adjust it if needed
        setNoBatchQuantity(noBatchQty || 0);
      }
    };

    const handleNoBatchQuantityChange = (quantity) => {
      const qty = parseFloat(quantity) || 0;
      
      // Calculate current total selected quantity (excluding current No Batch quantity)
      const currentTotal = selectedBatches.reduce(
        (sum, b) => {
          const batchKey = getBatchKey(b);
          return sum + (batchQuantities[batchKey] || 0);
        },
        0
      );
      
      // Calculate remaining quantity available for No Batch
      const remainingForNoBatch = Math.abs(countedQty || 0) - currentTotal;
      
      // Allow quantity between 0 and remaining
      const validQty = Math.max(0, Math.min(qty, remainingForNoBatch + noBatchQuantity));
      setNoBatchQuantity(validQty);
    };

    const handleSubmit = () => {
      if (!countedQty || countedQty === 0) {
        toast.error("Please enter counted quantity first");
        setShowBatchDialog(false);
        return;
      }

      if (totalSelectedQty === 0) {
        toast.error("Please select at least one batch or No Batch option");
        return;
      }

      // Validate that selected quantity matches the counted quantity
      if (Math.abs(totalSelectedQty - countedQty) > 0.01) { // Allow small floating point differences
        toast.error(`Selected quantity (${totalSelectedQty.toFixed(2)}) must match counted quantity (${countedQty.toFixed(2)}). Please adjust your selection.`);
        return;
      }

      // Filter out batches with 0 quantity
      const batchesWithQuantity = selectedBatches.filter(
        (batch) => {
          const batchKey = getBatchKey(batch);
          return (batchQuantities[batchKey] || 0) > 0;
        }
      );

      // Create batch breakdown data
      const batchBreakdownData = [
        ...batchesWithQuantity.map((batch) => {
          const batchKey = getBatchKey(batch);
          return {
            batchNo: batch.batchNo,
            availableQty: batch.availableQty || 0,
            countedQty: batchQuantities[batchKey] || 0,
            expDate: batch.expDate || null,
          };
        }),
        ...(noBatchSelected && noBatchQuantity > 0 ? [{
          batchNo: "",
          availableQty: noBatchQty || 0,
          countedQty: noBatchQuantity,
          expDate: null,
        }] : []),
      ];

      onBatchSelectionSubmit(batchBreakdownData);
      setShowBatchDialog(false);
    };

    return (
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Batches for Stock Take</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Distribute counted quantity across batches for item:{" "}
              <strong>{itemcode}</strong> - {itemdesc}
            </div>
          </DialogHeader>

          {/* Loading State */}
          {(!batchBreakdown || batchBreakdown.length === 0) && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin mr-2" />
              <span className="text-gray-600">Loading batches...</span>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Stock Take Summary</p>
                <div className="mt-2 text-xs space-y-1">
                  <p>
                    <strong>Counted Qty:</strong> {countedQty || 0}
                  </p>
                  <p>
                    <strong>Total Batch Qty:</strong> {totalBatchQty || 0}
                  </p>
                  <p>
                    <strong>"No Batch" Qty:</strong> {noBatchQty || 0}
                  </p>
                  <p>
                    <strong>Selected Qty:</strong> {totalSelectedQty.toFixed(2)} /{" "}
                    {countedQty || 0}
                  </p>
                  {remainingQty > 0.01 && (
                    <p className="text-orange-600">
                      <strong>Remaining:</strong> {remainingQty.toFixed(2)}
                    </p>
                  )}
                  {remainingQty < -0.01 && (
                    <p className="text-red-600">
                      <strong>Over by:</strong> {Math.abs(remainingQty).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Available Batches Table */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Available Batches</Label>
              {batchBreakdown && batchBreakdown.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Batch No</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                        <TableHead className="text-right">Counted Qty</TableHead>
                        <TableHead>Expiry Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Batches with batch numbers */}
                      {batchBreakdown
                        .filter((b) => b.batchNo !== "")
                        .map((batch, index) => {
                          const batchKey = getBatchKey(batch);
                          const isSelected = selectedBatches.some(
                            (b) => getBatchKey(b) === batchKey
                          );
                          const selectedQty = batchQuantities[batchKey] || 0;

                          return (
                            <TableRow key={batchKey}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    handleBatchSelection(batch, checked)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {batch.batchNo || "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                {batch.availableQty || 0}
                              </TableCell>
                              <TableCell>
                                {isSelected ? (
                                  <Input
                                    type="number"
                                    className="w-24 text-right"
                                    value={selectedQty}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        batch,
                                        e.target.value
                                      )
                                    }
                                    min="0"
                                    step="1"
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {batch.expDate
                                  ? format_Date(batch.expDate)
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      
                      {/* No Batch row - always show if noBatchQty exists */}
                      {noBatchQty !== undefined && (
                        <TableRow>
                          <TableCell>
                            <Checkbox
                              checked={noBatchSelected}
                              onCheckedChange={handleNoBatchSelection}
                            />
                          </TableCell>
                          <TableCell className="font-medium">No Batch</TableCell>
                          <TableCell className="text-right">
                            {noBatchQty || 0}
                          </TableCell>
                          <TableCell>
                            {noBatchSelected ? (
                              <Input
                                type="number"
                                className="w-24 text-right"
                                value={noBatchQuantity}
                                onChange={(e) =>
                                  handleNoBatchQuantityChange(e.target.value)
                                }
                                min="0"
                                step="1"
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>-</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No batches found for this item
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

StockTakeBatchSelectionDialog.displayName = "StockTakeBatchSelectionDialog";

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
          {getConfigValue('BATCH_NO') === "Yes" && (
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
    { value: 0, label: "Open" },
    { value: 1, label: "Posted" },
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
  const [originalStockList, setOriginalStockList] = useState([]); // Store unfiltered data
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

  // Workflow state management for 2-step process
  const [workflowStep, setWorkflowStep] = useState(1); // 1=view & select, 2=enter qty & confirm
  const [stockTakeItems, setStockTakeItems] = useState([]); // Items for Step 2
  const [selectedItems, setSelectedItems] = useState(new Set()); // Selected items in Step 1
  const [originalItemOrder, setOriginalItemOrder] = useState([]); // Preserve order
  
  // Batch selection state
  const [batchSelectionDialog, setBatchSelectionDialog] = useState({
    open: false,
    item: null,
    itemIndex: null,
    batches: [],
    loading: false,
  });

  // Function to check if user can edit based on status and permissions
  const canEdit = () => {
    if (!stockHdrs.docNo) {
      return true; // New document - can edit
    }
    if (stockHdrs.docStatus === 0) {
      return true; // Open - can edit
    }
    return false; // Posted - no one can edit
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

  // Handle item selection in Step 1
  const handleItemSelection = (stockCode, checked) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(stockCode);
      } else {
        newSet.delete(stockCode);
      }
      return newSet;
    });
  };

  // Handle select all items in Step 1 (selects all visible items in current filtered list)
  const handleSelectAll = (checked) => {
    if (checked) {
      const allCodes = stockList
        .filter((item) => item.isActive === "True")
        .map((item) => item.stockCode);
      // Add to existing selected items (don't replace, in case user selected items from different pages/filters)
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        allCodes.forEach((code) => newSet.add(code));
        return newSet;
      });
    } else {
      // Only unselect currently visible items
      const visibleCodes = stockList
        .filter((item) => item.isActive === "True")
        .map((item) => item.stockCode);
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        visibleCodes.forEach((code) => newSet.delete(code));
        return newSet;
      });
    }
  };

  // Handle transition from Step 1 to Step 2
  const handleNextToQuantityEntry = () => {
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to proceed");
      return;
    }

    // Filter originalStockList to only include selected items (not filtered stockList)
    // This ensures all selected items are included even if they're filtered out by search/filters
    const selectedStockList = originalStockList.filter(
      (item) => item.isActive === "True" && selectedItems.has(item.stockCode)
    );

    if (selectedStockList.length === 0) {
      toast.error("Selected items not found in current stock list");
      return;
    }

    // Preserve original item order
    setOriginalItemOrder([...selectedStockList]);

    // Reset pagination for Step 2
    setItemFilter((prev) => ({
      ...prev,
      skip: 0,
    }));

    // Convert selected items to stockTakeItems format
    const itemsForEntry = selectedStockList.map((item) => {
      // Check if this item exists in cartData (for editing existing documents)
      // Handle both new format (ONE entry per item with ordMemo) and old format (multiple entries per item)
      const existingItems = cartData.filter(
        (cartItem) => cartItem.itemcode === item.stockCode
      );

      if (!existingItems || existingItems.length === 0) {
        return {
          ...item,
          onHandQty: parseFloat(item.quantity) || 0,
          countedQty: 0,
          variance: 0,
          confirmUpdate: false,
          batchBreakdown: null,
          hasBatchBreakdown: false,
          batchNo: "",
          expiryDate: null,
          remarks: item.remarks || "",
        };
      }

      // Check if this is old format (multiple entries per item) or new format (one entry with ordMemo)
      const firstItem = existingItems[0];
      const isNewFormat = firstItem.ordMemo1 === "specific" && firstItem.ordMemo2;
      const isOldFormat = existingItems.length > 1 || (!isNewFormat && firstItem.docBatchNo);

      let batchBreakdown = null;
      let hasBatchBreakdown = false;
      let totalCountedQty = 0;
      let totalSystemQty = 0;

      if (isNewFormat && firstItem.batchState && firstItem.batchState.batchDetails) {
        // New format: batch breakdown stored in ordMemo fields (reconstructed in batchState)
        hasBatchBreakdown = true;
        batchBreakdown = firstItem.batchState.batchDetails.map((batch) => ({
          batchNo: batch.batchNo || "",
          availableQty: batch.availableQty || 0,
          countedQty: batch.countedQty || 0,
          expDate: batch.expDate || null,
        }));
        totalCountedQty = parseFloat(firstItem.docQty) || 0;
        totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
      } 
      else if (isOldFormat && existingItems.length > 1) {
        // Old format: multiple entries per item (backward compatibility)
        hasBatchBreakdown = true;
        batchBreakdown = existingItems.map((cartItem) => ({
          batchNo: cartItem.docBatchNo || "",
          availableQty: parseFloat(cartItem.docTtlqty) || 0,
          countedQty: parseFloat(cartItem.docQty) || 0,
          expDate: cartItem.docExpdate || null,
        }));
        totalCountedQty = existingItems.reduce(
          (sum, cartItem) => sum + (parseFloat(cartItem.docQty) || 0),
          0
        );
        totalSystemQty = existingItems.reduce(
          (sum, cartItem) => sum + (parseFloat(cartItem.docTtlqty) || 0),
          0
        );
      }
      // Single batch entry (backward compatibility)
      else if (firstItem.docBatchNo) {
        hasBatchBreakdown = true;
        batchBreakdown = [{
          batchNo: firstItem.docBatchNo || "",
          availableQty: parseFloat(firstItem.docTtlqty) || 0,
          countedQty: parseFloat(firstItem.docQty) || 0,
          expDate: firstItem.docExpdate || null,
        }];
        totalCountedQty = parseFloat(firstItem.docQty) || 0;
        totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
      }
      // No batch
      else {
        totalCountedQty = parseFloat(firstItem.docQty) || 0;
        totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
      }

      return {
        ...item,
        onHandQty: parseFloat(item.quantity) || 0,
        countedQty: totalCountedQty,
        variance: totalCountedQty - totalSystemQty,
        confirmUpdate: true,
        batchBreakdown: batchBreakdown,
        hasBatchBreakdown: hasBatchBreakdown,
        batchNo: firstItem.docBatchNo || "",
        expiryDate: firstItem.docExpdate || null,
        remarks: firstItem.itemRemark || item.remarks || "",
      };
    });

    setStockTakeItems(itemsForEntry);
    setLoading(false); // Ensure loading is false after setting items
    setWorkflowStep(2);
  };

  // Handle quantity change in Step 2
  const handleCountedQtyChange = (index, value) => {
    const newQty = parseFloat(value) || 0;
    setStockTakeItems((prev) => {
      const updated = [...prev];
      const onHandQty = parseFloat(updated[index].onHandQty) || 0;
      const oldQty = parseFloat(updated[index].countedQty) || 0;
      
      updated[index] = {
        ...updated[index],
        countedQty: newQty,
        variance: newQty - onHandQty,
      };
      
      // If quantity changed significantly, clear batch breakdown (user needs to re-select)
      if (getConfigValue("BATCH_NO") === "Yes" && Math.abs(newQty - oldQty) > 0.01) {
        const existingBatchTotal = updated[index].batchBreakdown?.reduce(
          (sum, b) => sum + (b.countedQty || 0),
          0
        ) || 0;
        
        // Clear batch breakdown if new quantity doesn't match existing batch total
        if (Math.abs(existingBatchTotal - newQty) > 0.01) {
          updated[index].batchBreakdown = undefined;
          updated[index].hasBatchBreakdown = false;
        }
      }
      
      return updated;
    });
  };

  // Handle confirmation checkbox in Step 2
  const handleConfirmCheckbox = (index, checked) => {
    setStockTakeItems((prev) => {
      const updated = [...prev];
      updated[index].confirmUpdate = checked;
      return updated;
    });
  };

  // Handle removal of item from Step 2
  const handleRemoveItem = (index) => {
    setStockTakeItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });
    toast.success("Item removed");
  };

  // Convert confirmed items to cartData format for saving
  const prepareCartDataFromConfirmedItems = () => {
    const confirmedItems = stockTakeItems.filter((item) => item.confirmUpdate);
    
    if (confirmedItems.length === 0) {
      toast.error("Please confirm at least one item to update");
      return null;
    }

    // Validate batch breakdown for items with batch functionality
    if (getConfigValue("BATCH_NO") === "Yes") {
      for (const item of confirmedItems) {
        if (item.countedQty > 0) {
          // If batch functionality is enabled and item has counted quantity
          // Check if batch breakdown is required
          const hasBatchBreakdown = item.hasBatchBreakdown && item.batchBreakdown && item.batchBreakdown.length > 0;
          
          if (hasBatchBreakdown) {
            const totalBatchQty = item.batchBreakdown.reduce(
              (sum, batch) => sum + (batch.countedQty || 0),
              0
            );
            
            // Allow small floating point differences (0.01)
            if (Math.abs(totalBatchQty - item.countedQty) > 0.01) {
              toast.error(
                `Batch breakdown total (${totalBatchQty.toFixed(2)}) does not match counted quantity (${item.countedQty.toFixed(2)}) for item ${item.stockCode}. Please adjust batch quantities.`
              );
              return null;
            }
          }
          // Note: If no batch breakdown exists, system will use single entry (backward compatibility)
        }
      }
    }

    const newCartData = [];
    let cartItemIndex = 1;

    confirmedItems.forEach((item) => {
      const baseItem = {
        docAmt: 0, // Will be calculated
        docNo: stockHdrs.docNo,
        movCode: "TKE",
        movType: "TKE",
        docLineno: null,
        itemcode: item.stockCode,
        itemdesc: item.stockName,
        docFocqty: 0,
        docPrice: Number(item.Price || 0),
        docPdisc: 0,
        docDisc: 0,
        recQty1: 0,
        postedQty: 0,
        cancelQty: 0,
        createUser: userDetails?.username || "SYSTEM",
        docUom: item.uom || "",
        itmBrand: item.brandCode,
        itmRange: item.rangeCode,
        itmBrandDesc: item.brand,
        itmRangeDesc: item.range || "",
        DOCUOMDesc: item.uomDescription,
        itemRemark: item.remarks || "",
        docMdisc: 0,
        recTtl: 0,
        // Initialize ordMemo fields for batch breakdown storage
        ordMemo1: "",
        ordMemo2: "",
        ordMemo3: "0",
        ordMemo4: "",
      };

      // Create ONE entry per item (following Stock Adjustment pattern)
      // Batch breakdown is stored in ordMemo fields, not as separate entries
      // This matches the pattern used in Stock Adjustment for consistency
      const totalAmount = Number(item.countedQty) * Number(item.Price || 0);
      
      // Calculate total system quantity from batch breakdown or use onHandQty
      // IMPORTANT: For existing items, preserve the original docTtlqty from saved document
      // This represents the system quantity at the time of stock take, not current quantity
      let totalSystemQty = Number(item.onHandQty || 0);
      if (item.batchBreakdown && item.batchBreakdown.length > 0) {
        totalSystemQty = item.batchBreakdown.reduce(
          (sum, batch) => sum + (Number(batch.availableQty) || 0),
          0
        );
      }

      // Check if this item already exists in cartData (for updating existing documents)
      // If it exists, preserve the docId so we update instead of create+delete
      const existingItem = cartData.find(
        (cartItem) => cartItem.itemcode === item.stockCode
      );
      const docId = existingItem?.docId || null; // Preserve docId if updating

      // If updating existing item, preserve original docTtlqty from saved document
      // This ensures the system quantity at time of stock take is preserved, not recalculated
      // Only recalculate for new items (when existingItem is null)
      if (existingItem && existingItem.docTtlqty !== undefined && existingItem.docTtlqty !== null) {
        totalSystemQty = Number(existingItem.docTtlqty);
      }

      // Prepare ordMemo fields for batch breakdown storage (similar to stock adjustment)
      let ordMemoFields = {
        ordMemo1: "",
        ordMemo2: "",
        ordMemo3: "0",
        ordMemo4: "",
      };
      
      let docBatchNo = ""; // Primary batch number for reference
      let docExpdate = ""; // Primary expiry date for reference

      // If batch breakdown exists, store in ordMemo fields
      if (getConfigValue("BATCH_NO") === "Yes" && item.batchBreakdown && item.batchBreakdown.length > 0) {
        // Separate batches with batch numbers and "No Batch"
        const batchesWithBatchNo = item.batchBreakdown.filter((b) => b.batchNo && b.batchNo !== "");
        const noBatchItem = item.batchBreakdown.find((b) => !b.batchNo || b.batchNo === "");

        if (batchesWithBatchNo.length > 0) {
          // Store batch breakdown: "batchNo:qty,batchNo:qty"
          ordMemoFields.ordMemo1 = "specific";
          ordMemoFields.ordMemo2 = batchesWithBatchNo
            .map((batch) => `${batch.batchNo}:${batch.countedQty || 0}`)
            .join(",");
          
          // Store expiry dates: "expDate:qty,expDate:qty" (if expiry tracking enabled)
          // Normalize dates to YYYY-MM-DD format to avoid truncation errors
          if (getConfigValue("EXPIRY_DATE") === "Yes") {
            ordMemoFields.ordMemo4 = batchesWithBatchNo
              .map((batch) => {
                // Normalize expiry date to YYYY-MM-DD format
                let normalizedExpDate = batch.expDate || "";
                if (normalizedExpDate) {
                  // Handle ISO date format (e.g., "2026-10-15T00:00:00.000Z")
                  if (normalizedExpDate.includes("T") || normalizedExpDate.includes("Z")) {
                    normalizedExpDate = new Date(normalizedExpDate).toISOString().split('T')[0];
                  } else if (normalizedExpDate.includes("/")) {
                    // Handle DD/MM/YYYY format
                    const parts = normalizedExpDate.split(" ")[0].split("/");
                    if (parts.length === 3) {
                      const day = parts[0].padStart(2, "0");
                      const month = parts[1].padStart(2, "0");
                      const year = parts[2];
                      normalizedExpDate = `${year}-${month}-${day}`;
                    }
                  } else if (!normalizedExpDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // If not already in YYYY-MM-DD format, try to parse it
                    const date = new Date(normalizedExpDate);
                    if (!isNaN(date.getTime())) {
                      normalizedExpDate = date.toISOString().split('T')[0];
                    }
                  }
                }
                return `${normalizedExpDate}:${batch.countedQty || 0}`;
              })
              .join(",");
          }

          // Set primary batch number (first batch or combined)
          docBatchNo = batchesWithBatchNo[0].batchNo || "";
          docExpdate = getConfigValue("EXPIRY_DATE") === "Yes" 
            ? (batchesWithBatchNo[0].expDate || "") 
            : "";
        }

        // Handle "No Batch" quantity
        if (noBatchItem && (noBatchItem.countedQty || 0) > 0) {
          ordMemoFields.ordMemo3 = (noBatchItem.countedQty || 0).toString();
        }
      } else if (getConfigValue("BATCH_NO") === "Yes" && item.batchNo) {
        // Single batch (backward compatibility)
        docBatchNo = item.batchNo || "";
        docExpdate = getConfigValue("EXPIRY_DATE") === "Yes" 
          ? (item.expiryDate || "") 
          : "";
        ordMemoFields.ordMemo1 = "specific";
        ordMemoFields.ordMemo2 = `${docBatchNo}:${item.countedQty || 0}`;
        if (getConfigValue("EXPIRY_DATE") === "Yes" && docExpdate) {
          // Normalize expiry date to YYYY-MM-DD format to avoid truncation errors
          let normalizedExpDate = docExpdate;
          if (normalizedExpDate.includes("T") || normalizedExpDate.includes("Z")) {
            normalizedExpDate = new Date(normalizedExpDate).toISOString().split('T')[0];
          } else if (normalizedExpDate.includes("/")) {
            const parts = normalizedExpDate.split(" ")[0].split("/");
            if (parts.length === 3) {
              const day = parts[0].padStart(2, "0");
              const month = parts[1].padStart(2, "0");
              const year = parts[2];
              normalizedExpDate = `${year}-${month}-${day}`;
            }
          }
          ordMemoFields.ordMemo4 = `${normalizedExpDate}:${item.countedQty || 0}`;
        }
      }

      // Create single entry for this item
      newCartData.push({
        ...baseItem,
        id: cartItemIndex++,
        docId: docId, // Preserve docId if updating existing item
        docAmt: totalAmount,
        docQty: Number(item.countedQty), // Total counted quantity (can change)
        docTtlqty: totalSystemQty, // Total system quantity (preserved from saved doc if updating)
        docBatchNo: docBatchNo, // Primary batch number (for reference/backward compatibility)
        docExpdate: docExpdate, // Primary expiry date (for reference/backward compatibility)
        // Store batch breakdown in ordMemo fields
        ordMemo1: ordMemoFields.ordMemo1,
        ordMemo2: ordMemoFields.ordMemo2,
        ordMemo3: ordMemoFields.ordMemo3,
        ordMemo4: ordMemoFields.ordMemo4,
      });
    });

    setCartData(newCartData);
    return newCartData;
  };

  // Handle going back to previous step
  const handleBackToPreviousStep = () => {
    if (workflowStep === 2) {
      setWorkflowStep(1);
    }
  };

  // Handle opening batch selection dialog
  const handleOpenBatchDialog = async (item, index) => {
    if (getConfigValue("BATCH_NO") !== "Yes") {
      toast.error("Batch functionality is not enabled");
      return;
    }

    if (!item.countedQty || item.countedQty === 0) {
      toast.error("Please enter counted quantity first");
      return;
    }

    setBatchSelectionDialog((prev) => ({
      ...prev,
      open: true,
      item: item,
      itemIndex: index,
      batches: [],
      loading: true,
    }));

    try {
      // Fetch ItemBatches for this item from the current store
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode || item.itemcode },
            { siteCode: userDetails.siteCode },
            { uom: item.uom || item.itemUom || item.uomDescription },
          ],
        },
      };

      const response = await apiService.get(
        `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
      );

      if (!response || response.length === 0) {
        toast.warning("No batch information found for this item. You can still proceed with 'No Batch' option.");
        setBatchSelectionDialog((prev) => ({
          ...prev,
          batches: [],
          totalBatchQty: 0,
          noBatchQty: 0,
          loading: false,
        }));
        return;
      }

      // Process batch data for the dialog
      // If item has existing batch breakdown, merge with fetched batches
      const existingBreakdown = item.batchBreakdown || [];
      
      // Group batches by batchNo AND expDate (composite key)
      // Only group entries that have the same batchNo AND expDate
      // All batchNo values (including "", "No Batch", or any string) are treated the same
      const batchMap = new Map();
      
      response.forEach((batch) => {
        // Keep batchNo as-is (treat all values including "", "No Batch", etc. as regular batchNo)
        const batchNo = batch.batchNo || "";
        
        // Normalize expDate: convert to ISO date string for comparison, or null
        const normalizedExpDate = batch.expDate 
          ? (new Date(batch.expDate).toISOString().split('T')[0]) 
          : null;
        
        // Create composite key: batchNo + expDate
        const compositeKey = `${batchNo}|${normalizedExpDate || 'null'}`;
        
        // Find existing counted quantity for this batch (match by batchNo and expDate)
        const existingBatch = existingBreakdown.find(
          (b) => {
            const existingBatchNo = b.batchNo || "";
            const existingExpDate = b.expDate 
              ? (new Date(b.expDate).toISOString().split('T')[0]) 
              : null;
            return existingBatchNo === batchNo && 
                   (existingExpDate === normalizedExpDate || (!existingExpDate && !normalizedExpDate));
          }
        );
        
        if (batchMap.has(compositeKey)) {
          // Sum quantities for existing batch (same batchNo AND expDate)
          const existing = batchMap.get(compositeKey);
          batchMap.set(compositeKey, {
            batchNo: batchNo,
            availableQty: existing.availableQty + (Number(batch.qty) || 0),
            expDate: batch.expDate || null,
            countedQty: existingBatch ? existingBatch.countedQty : existing.countedQty, // Preserve existing countedQty
          });
        } else {
          // Create new batch entry
          batchMap.set(compositeKey, {
            batchNo: batchNo,
            availableQty: Number(batch.qty) || 0,
            expDate: batch.expDate || null,
            countedQty: existingBatch ? existingBatch.countedQty : 0,
          });
        }
      });
      
      // Convert map to array
      const batchBreakdown = Array.from(batchMap.values());

      // Calculate totals
      // Total batch qty: all entries with non-empty batchNo
      const totalBatchQty = batchBreakdown
        .filter((b) => b.batchNo !== "")
        .reduce((sum, b) => sum + b.availableQty, 0);
      // No batch qty: sum all entries with empty batchNo ("")
      const noBatchQty = batchBreakdown
        .filter((b) => b.batchNo === "")
        .reduce((sum, b) => sum + b.availableQty, 0);

      setBatchSelectionDialog((prev) => ({
        ...prev,
        batches: batchBreakdown,
        totalBatchQty: totalBatchQty,
        noBatchQty: noBatchQty,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to fetch batch information");
      setBatchSelectionDialog((prev) => ({
        ...prev,
        open: false,
        loading: false,
      }));
    }
  };

  // Handle batch selection submit
  const handleBatchSelectionSubmit = (batchBreakdownData) => {
    const itemIndex = batchSelectionDialog.itemIndex;
    
    setStockTakeItems((prev) => {
      const updated = [...prev];
      if (updated[itemIndex]) {
        updated[itemIndex] = {
          ...updated[itemIndex],
          batchBreakdown: batchBreakdownData,
          hasBatchBreakdown: true,
        };
      }
      return updated;
    });

    toast.success("Batch selection saved");
  };

  // Enhanced handleCalc to include remarks
  const handleRemarksChange = (e, index) => {
    const value = e.target.value;
    setStockList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, remarks: value } : item))
    );
  };

  // Apply filters to stock list using useMemo
  const filteredStockList = useMemo(() => {
    if (!originalStockList || originalStockList.length === 0) {
      return [];
    }

    let filtered = [...originalStockList];

    // Department filter
    if (itemFilter.whereArray.department.length > 0) {
      filtered = filtered.filter((item) => {
        const itemDepartment = item.Department || item.department;
        return itemFilter.whereArray.department.includes(itemDepartment);
      });
    }

    // Brand filter
    if (itemFilter.whereArray.brand.length > 0) {
      filtered = filtered.filter((item) => {
        const itemBrand = item.Brand || item.brand;
        const itemBrandCode = item.BrandCode || item.brandCode;
        return itemFilter.whereArray.brand.some(
          (brand) => brand === itemBrand || brand === itemBrandCode
        );
      });
    }

    // Range filter
    if (itemFilter.whereArray.range.length > 0) {
      filtered = filtered.filter((item) => {
        const itemRange = item.Range || item.range;
        const itemRangeCode = item.RangeCode || item.rangeCode;
        return itemFilter.whereArray.range.some(
          (range) => range === itemRange || range === itemRangeCode
        );
      });
    }

    // Search filter
    if (debouncedSearchValue && debouncedSearchValue.trim()) {
      const searchLower = debouncedSearchValue.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const stockCode = (item.stockCode || item.itemcode || "").toLowerCase();
        const stockName = (item.stockName || item.itemdesc || "").toLowerCase();
        const brandCode = (item.brandCode || item.BrandCode || "").toLowerCase();
        const brand = (item.brand || item.Brand || "").toLowerCase();
        const range = (item.range || item.Range || "").toLowerCase();
        const rangeCode = (item.rangeCode || item.RangeCode || "").toLowerCase();
        const barCode = (item.barCode || item.barcode || "").toLowerCase();
        const linkCode = (item.linkCode || "").toLowerCase();
        const uom = (item.uom || item.itemUom || item.uomDescription || "").toLowerCase();
        
        return (
          stockCode.includes(searchLower) ||
          stockName.includes(searchLower) ||
          brandCode.includes(searchLower) ||
          brand.includes(searchLower) ||
          range.includes(searchLower) ||
          rangeCode.includes(searchLower) ||
          barCode.includes(searchLower) ||
          linkCode.includes(searchLower) ||
          uom.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [
    originalStockList,
    itemFilter.whereArray.department.length,
    itemFilter.whereArray.department.join(","),
    itemFilter.whereArray.brand.length,
    itemFilter.whereArray.brand.join(","),
    itemFilter.whereArray.range.length,
    itemFilter.whereArray.range.join(","),
    debouncedSearchValue,
  ]);

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
    // Reset workflow to Step 1 when filters change
    if (workflowStep > 1) {
      setWorkflowStep(1);
      setStockTakeItems([]);
      setSelectedItems(new Set());
    }
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

  // Effect to fetch stock details initially
  useEffect(() => {
    if (!initial) {
      setLoading(true);
      getStockDetails();
    }
  }, [initial]);

  // Effect to update stockList when filters change
  useEffect(() => {
    if (originalStockList.length > 0) {
      setStockList(filteredStockList);
      setItemTotal(filteredStockList.length);
      // Reset pagination when filters change (but not when initializing)
      if (!initial) {
        setItemFilter((prev) => ({
          ...prev,
          skip: 0,
        }));
      }
    }
  }, [filteredStockList, originalStockList.length, initial]);

  // Load existing document into Step 2 when editing
  useEffect(() => {
    if (
      urlDocNo &&
      cartData.length > 0 &&
      stockList.length > 0 &&
      stockHdrs.docStatus === 0 &&
      workflowStep === 1
    ) {
      // Set selected items from existing cartData
      const existingItemCodes = new Set(
        cartData.map((item) => item.itemcode)
      );
      setSelectedItems(existingItemCodes);

      // Filter stockList to only include selected items
      const selectedStockList = stockList.filter((item) =>
        existingItemCodes.has(item.stockCode)
      );

      // Convert selected items to stockTakeItems format with existing cartData
      // Handle both new format (ONE entry per item with ordMemo) and old format (multiple entries per item)
      const itemsForEntry = selectedStockList.map((item) => {
        // Find all entries for this item (for backward compatibility with old format)
        const existingItems = cartData.filter(
          (cartItem) => cartItem.itemcode === item.stockCode
        );

        if (!existingItems || existingItems.length === 0) {
          return {
            ...item,
            onHandQty: parseFloat(item.quantity) || 0,
            countedQty: 0,
            variance: 0,
            confirmUpdate: false,
            batchBreakdown: null,
            hasBatchBreakdown: false,
            batchNo: "",
            expiryDate: null,
            remarks: item.remarks || "",
          };
        }

        // Check if this is old format (multiple entries per item) or new format (one entry with ordMemo)
        const firstItem = existingItems[0];
        const isNewFormat = firstItem.ordMemo1 === "specific" && firstItem.ordMemo2;
        const isOldFormat = existingItems.length > 1 || (!isNewFormat && firstItem.docBatchNo);

        let batchBreakdown = null;
        let hasBatchBreakdown = false;
        let totalCountedQty = 0;
        let totalSystemQty = 0;

        if (isNewFormat && firstItem.batchState && firstItem.batchState.batchDetails) {
          // New format: batch breakdown stored in ordMemo fields (reconstructed in batchState)
          hasBatchBreakdown = true;
          batchBreakdown = firstItem.batchState.batchDetails.map((batch) => ({
            batchNo: batch.batchNo || "",
            availableQty: batch.availableQty || 0,
            countedQty: batch.countedQty || 0,
            expDate: batch.expDate || null,
          }));
          totalCountedQty = parseFloat(firstItem.docQty) || 0;
          totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
        } 
        else if (isOldFormat && existingItems.length > 1) {
          // Old format: multiple entries per item (backward compatibility)
          hasBatchBreakdown = true;
          batchBreakdown = existingItems.map((cartItem) => ({
            batchNo: cartItem.docBatchNo || "",
            availableQty: parseFloat(cartItem.docTtlqty) || 0,
            countedQty: parseFloat(cartItem.docQty) || 0,
            expDate: cartItem.docExpdate || null,
          }));
          totalCountedQty = existingItems.reduce(
            (sum, cartItem) => sum + (parseFloat(cartItem.docQty) || 0),
            0
          );
          totalSystemQty = existingItems.reduce(
            (sum, cartItem) => sum + (parseFloat(cartItem.docTtlqty) || 0),
            0
          );
        }
        // Single batch entry (backward compatibility)
        else if (firstItem.docBatchNo) {
          hasBatchBreakdown = true;
          batchBreakdown = [{
            batchNo: firstItem.docBatchNo || "",
            availableQty: parseFloat(firstItem.docTtlqty) || 0,
            countedQty: parseFloat(firstItem.docQty) || 0,
            expDate: firstItem.docExpdate || null,
          }];
          totalCountedQty = parseFloat(firstItem.docQty) || 0;
          totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
        }
        // No batch
        else {
          totalCountedQty = parseFloat(firstItem.docQty) || 0;
          totalSystemQty = parseFloat(firstItem.docTtlqty) || 0;
        }

        return {
          ...item,
          onHandQty: parseFloat(item.quantity) || 0,
          countedQty: totalCountedQty,
          variance: totalCountedQty - totalSystemQty,
          confirmUpdate: true,
          batchBreakdown: batchBreakdown,
          hasBatchBreakdown: hasBatchBreakdown,
          batchNo: firstItem.docBatchNo || "",
          expiryDate: firstItem.docExpdate || null,
          remarks: firstItem.itemRemark || item.remarks || "",
        };
      });

      setStockTakeItems(itemsForEntry);
      setWorkflowStep(2);
    }
  }, [urlDocNo, cartData, stockList, stockHdrs.docStatus, workflowStep]);

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
        const updatedRes = stockDetails.map((item) => ({
          ...item,
          Qty: 0,
          expiryDate: null,
          batchNo: "",
          remarks: "",
          docAmt: null,
        }));

        // Store original unfiltered data
        setOriginalStockList(updatedRes);
        setLoading(false);
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

  // Helper function to reconstruct batch state from stored ordMemo fields (similar to stock adjustment)
  const reconstructBatchState = async (cartItem) => {
    if (getConfigValue("BATCH_NO") !== "Yes") {
      return null;
    }

    // Check if batch breakdown is stored in ordMemo fields (new format)
    if (cartItem.ordMemo1 === "specific" && cartItem.ordMemo2) {
      try {
        // Parse batch breakdown from ordMemo2: "batchNo:qty,batchNo:qty"
        // Use INDEX-based matching for ordMemo4 (like stock adjustment) to handle batches with same quantity
        const batchParts = cartItem.ordMemo2.split(",");
        const expDateParts = cartItem.ordMemo4 ? cartItem.ordMemo4.split(",") : [];
        
        const batchBreakdown = batchParts.map((batch, index) => {
          const [batchNo, quantity] = batch.split(":");
          const parsedQuantity = Number(quantity);
          
          // Validate batch data
          if (!batchNo || isNaN(parsedQuantity) || parsedQuantity < 0) {
            console.warn(`Invalid batch data: ${batch}`, { batchNo, quantity: parsedQuantity });
            return null;
          }
          
          // Get expiry date from ordMemo4 by INDEX (not by quantity!)
          let expDate = null;
          if (expDateParts[index]) {
            // Split by ':' and take everything except the last part as date (handles ISO dates with colons)
            const parts = expDateParts[index].split(":");
            if (parts.length > 1) {
              // Last part is quantity, everything before is the date
              const expDateStr = parts.slice(0, -1).join(":");
              // Handle null, empty string, or invalid dates
              if (expDateStr && expDateStr !== "null" && expDateStr !== "" && expDateStr !== "undefined") {
                expDate = expDateStr;
              }
            }
          }
          
          return { batchNo, quantity: parsedQuantity, expDate };
        }).filter(Boolean); // Remove invalid entries

        // Fetch ItemBatches to get available quantities and expiry dates
        if (batchBreakdown.length > 0) {
          const itemBatchesFilter = {
            where: {
              and: [
                { itemCode: cartItem.itemcode.replace(/0000$/, "") },
                { siteCode: userDetails.siteCode },
                { uom: cartItem.docUom },
                { or: batchBreakdown.map((b) => ({ batchNo: b.batchNo })) },
              ],
            },
          };

          const itemBatchesResponse = await apiService.get(
            `ItemBatches?filter=${encodeURIComponent(
              JSON.stringify(itemBatchesFilter)
            )}`
          ).catch((error) => {
            console.error("Failed to fetch ItemBatches during reconstruction:", error);
            return [];
          });

          // Map batch data with available quantities and expiry dates
          const enrichedBatchDetails = batchBreakdown.map((batch) => {
            // Use expDate from batchBreakdown (already extracted by index)
            const normalizedBatchExpDate = normalizeExpDate(batch.expDate);
            
            // Match batch by batchNo AND expiry date (if expiry tracking is enabled)
            const matchingBatch = itemBatchesResponse.find((ib) => {
              if (ib.batchNo !== batch.batchNo) return false;
              if (getConfigValue("EXPIRY_DATE") === "Yes" && normalizedBatchExpDate) {
                const normalizedIbExpDate = normalizeExpDate(ib.expDate);
                return normalizedIbExpDate === normalizedBatchExpDate;
              }
              return true; // If expiry tracking is disabled, match by batchNo only
            });

            return {
              batchNo: batch.batchNo,
              countedQty: batch.quantity,
              availableQty: matchingBatch?.qty || 0,
              expDate: matchingBatch?.expDate || batch.expDate || null,
            };
          });

          // Handle no batch quantity from ordMemo3
          const noBatchQty = Number(cartItem.ordMemo3) || 0;
          if (noBatchQty > 0) {
            enrichedBatchDetails.push({
              batchNo: "",
              countedQty: noBatchQty,
              availableQty: 0, // Will be calculated from system qty
              expDate: null,
            });
          }

          return {
            batchNo: cartItem.docBatchNo || "",
            expDate: cartItem.docExpdate || null,
            batchTransferQty: batchBreakdown.reduce((sum, b) => sum + b.quantity, 0),
            noBatchTransferQty: noBatchQty,
            totalTransferQty: cartItem.docQty || 0,
            batchDetails: enrichedBatchDetails,
          };
        }
      } catch (error) {
        console.error("Error reconstructing batch state:", error);
        return null;
      }
    }
    
    // Fallback: Single batch from docBatchNo (backward compatibility)
    if (cartItem.docBatchNo) {
      return {
        batchNo: cartItem.docBatchNo,
        expDate: cartItem.docExpdate || null,
        batchTransferQty: cartItem.docQty || 0,
        noBatchTransferQty: 0,
        totalTransferQty: cartItem.docQty || 0,
        batchDetails: [{
          batchNo: cartItem.docBatchNo,
          countedQty: cartItem.docQty || 0,
          availableQty: cartItem.docTtlqty || 0,
          expDate: cartItem.docExpdate || null,
        }],
      };
    }

    return null;
  };

  const getStockHdrDetails = async (filter) => {
    try {
      const response = await apiService.get(
        `StkMovdocDtls${buildFilterQuery(filter ?? filter)}`
      );
      
      // Reconstruct batch state for each item (if batch functionality is enabled)
      const reconstructedItems = await Promise.all(
        response.map(async (item) => {
          const batchState = await reconstructBatchState(item);
          if (batchState) {
            return {
              ...item,
              batchState: batchState, // Store reconstructed batch state
            };
          }
          return item;
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
      docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? (item.docExpdate || "") : "",
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

  // Helper function to normalize expiry date for comparison
  const normalizeExpDate = (expDate) => {
    if (!expDate) return null;
    
    // Handle ISO date format (e.g., "2026-10-15T00:00:00.000Z")
    if (expDate.includes("T") || expDate.includes("Z")) {
      return new Date(expDate).toISOString().split('T')[0];
    }
    
    // If already in YYYY-MM-DD format, return as is
    if (expDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return expDate;
    }
    
    // Handle DD/MM/YYYY format
    if (expDate.includes("/")) {
      const parts = expDate.split(" ")[0].split("/");
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = parts[1].padStart(2, "0");
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    return expDate;
  };

  // Optimized function to update stock quantities and batches
  // Creates Stktrns for all items (audit trail), but only updates ItemBatches for batches with variance
  // Similar to Stock Adjustment pattern - groups by itemcode+uom, creates one Stktrns per item
  const updateStockQuantitiesAndBatches = async (stockTakeDocNo) => {
    try {
      console.log("Updating stock quantities and batches for Stock Take:", stockTakeDocNo);

      // Step 1: Get Stock Take details (ALL items, including those with 0 variance)
      const stockTakeDetailsResponse = await apiService.get(
        `StkMovdocDtls?filter=${encodeURIComponent(
          JSON.stringify({ where: { docNo: stockTakeDocNo } })
        )}`
      );

      if (!stockTakeDetailsResponse || stockTakeDetailsResponse.length === 0) {
        throw new Error("No stock take details found");
      }

      // Step 2: First, check if we have old format (multiple entries per item) or new format (one entry with ordMemo)
      // Group by itemcode to detect format
      const itemsByItemcode = new Map();
      stockTakeDetailsResponse.forEach((item) => {
        const trimmedItemCode = item.itemcode.replace(/0000$/, "");
        const key = `${trimmedItemCode}|${item.docUom || item.itemUom || ""}`;
        if (!itemsByItemcode.has(key)) {
          itemsByItemcode.set(key, []);
        }
        itemsByItemcode.get(key).push(item);
      });

      // Step 3: Reconstruct batch breakdown and group items
      const groupedItems = new Map();
      
      for (const [key, items] of itemsByItemcode.entries()) {
        // Check format: if multiple entries for same item, it's old format
        const isOldFormat = items.length > 1;
        const item = items[0]; // Use first item for item-level data
        const trimmedItemCode = item.itemcode.replace(/0000$/, "");
        
        // Reconstruct batch breakdown based on format
        let batchDetails = [];
        
        if (isOldFormat) {
          // OLD FORMAT: Each entry represents one batch
          // Process all entries for this item and create batch details from each
          for (const entry of items) {
            const variance = (parseFloat(entry.docQty) || 0) - (parseFloat(entry.docTtlqty) || 0);
            const hasVariance = Math.abs(variance) > 0.01;
            
            batchDetails.push({
              batchNo: entry.docBatchNo || "",
              expDate: entry.docExpdate || null,
              variance: variance,
              countedQty: parseFloat(entry.docQty) || 0,
              systemQty: parseFloat(entry.docTtlqty) || 0,
              hasVariance: hasVariance,
            });
          }
        }
        // Check if batch breakdown is stored in ordMemo fields (new format)
        else if (item.ordMemo1 === "specific" && item.ordMemo2) {
          // Parse batch breakdown from ordMemo2: "batchNo:qty,batchNo:qty"
          // Use INDEX-based matching for ordMemo4 (like stock adjustment) to handle batches with same quantity
          const batchParts = item.ordMemo2.split(",");
          const expDateParts = item.ordMemo4 ? item.ordMemo4.split(",") : [];
          
          const batchBreakdown = batchParts.map((batch, index) => {
            const [batchNo, quantity] = batch.split(":");
            const parsedQuantity = Number(quantity) || 0;
            
            if (!batchNo || isNaN(parsedQuantity)) {
              return null;
            }
            
            // Get expiry date from ordMemo4 by INDEX (not by quantity!)
            let expDate = null;
            if (expDateParts[index]) {
              // Split by ':' and take everything except the last part as date (handles ISO dates with colons)
              const parts = expDateParts[index].split(":");
              if (parts.length > 1) {
                // Last part is quantity, everything before is the date
                const expDateStr = parts.slice(0, -1).join(":");
                // Handle null, empty string, or invalid dates
                if (expDateStr && expDateStr !== "null" && expDateStr !== "" && expDateStr !== "undefined") {
                  expDate = expDateStr;
                }
              }
            }
            
            return { batchNo, countedQty: parsedQuantity, expDate };
          }).filter(Boolean);

          // Fetch ItemBatches to get system quantities for each batch
          if (batchBreakdown.length > 0 && getConfigValue("BATCH_NO") === "Yes") {
            try {
              const batchNos = batchBreakdown.map((b) => b.batchNo).filter(Boolean);
              if (batchNos.length > 0) {
                const itemBatchesFilter = {
                  where: {
                    and: [
                      { itemCode: trimmedItemCode },
                      { siteCode: userDetails.siteCode },
                      { uom: item.docUom || item.itemUom || "" },
                      { or: batchNos.map((bn) => ({ batchNo: bn })) },
                    ],
                  },
                };

                const itemBatchesResponse = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(
                    JSON.stringify(itemBatchesFilter)
                  )}`
                ).catch(() => []);

                // Create batch details with fetched system quantities
                batchDetails = batchBreakdown.map((batch) => {
                  // Use expDate from batchBreakdown (already extracted by index)
                  const normalizedBatchExpDate = normalizeExpDate(batch.expDate);
                  
                  console.log(`🔍 Matching batch ${batch.batchNo}:`, {
                    batchNo: batch.batchNo,
                    countedQty: batch.countedQty,
                    batchExpDate: batch.expDate,
                    normalizedBatchExpDate: normalizedBatchExpDate,
                    itemBatchesCount: itemBatchesResponse.length,
                    availableBatches: itemBatchesResponse.filter(ib => ib.batchNo === batch.batchNo).map(ib => ({
                      batchNo: ib.batchNo,
                      qty: ib.qty,
                      expDate: ib.expDate
                    }))
                  });
                  
                  // Match batch by batchNo AND expiry date (if expiry tracking is enabled)
                  const matchingBatch = itemBatchesResponse.find((ib) => {
                    if (ib.batchNo !== batch.batchNo) return false;
                    if (getConfigValue("EXPIRY_DATE") === "Yes" && normalizedBatchExpDate) {
                      const normalizedIbExpDate = normalizeExpDate(ib.expDate);
                      const matches = normalizedIbExpDate === normalizedBatchExpDate;
                      console.log(`🔍 Expiry date match for ${batch.batchNo}:`, {
                        batchExpDate: normalizedBatchExpDate,
                        ibExpDate: normalizedIbExpDate,
                        matches: matches
                      });
                      return matches;
                    }
                    return true; // If expiry tracking is disabled, match by batchNo only
                  });
                  
                  const systemQty = matchingBatch?.qty || 0;
                  const variance = batch.countedQty - systemQty;
                  const hasVariance = Math.abs(variance) > 0.01;

                  console.log(`🔍 Batch match result for ${batch.batchNo}:`, {
                    matched: !!matchingBatch,
                    matchingBatchQty: matchingBatch?.qty,
                    matchingBatchExpDate: matchingBatch?.expDate,
                    systemQty: systemQty,
                    variance: variance,
                    hasVariance: hasVariance
                  });

                  return {
                    batchNo: batch.batchNo || "",
                    expDate: matchingBatch?.expDate || batch.expDate || null,
                    variance: variance,
                    countedQty: batch.countedQty,
                    systemQty: systemQty,
                    hasVariance: hasVariance,
                  };
                });
              }
            } catch (error) {
              console.error(`Error fetching ItemBatches for ${trimmedItemCode}:`, error);
              // Fallback: use docTtlqty proportionally or as total
              const totalSystemQty = parseFloat(item.docTtlqty) || 0;
              batchDetails = batchBreakdown.map((batch) => {
                const variance = batch.countedQty;
                const hasVariance = Math.abs(variance) > 0.01;
                // Distribute system qty proportionally (simplified approach)
                const systemQty = batchBreakdown.length > 0 
                  ? totalSystemQty / batchBreakdown.length 
                  : 0;

                return {
                  batchNo: batch.batchNo || "",
                  expDate: batch.expDate || item.docExpdate || null,
                  variance: variance,
                  countedQty: batch.countedQty,
                  systemQty: systemQty,
                  hasVariance: hasVariance,
                };
              });
            }

            // Handle "No Batch" quantity from ordMemo3
            const noBatchQty = Number(item.ordMemo3) || 0;
            if (noBatchQty > 0) {
              // Fetch existing "No Batch" entries to get actual systemQty
              try {
                const noBatchFilter = {
                  where: {
                    and: [
                      { itemCode: trimmedItemCode },
                      { siteCode: userDetails.siteCode },
                      { uom: item.docUom || item.itemUom || "" },
                      { batchNo: "" }, // Empty batchNo for "No Batch"
                    ],
                  },
                };

                const noBatchResponse = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(JSON.stringify(noBatchFilter))}`
                ).catch(() => []);

                // Sum all "No Batch" entries (there might be multiple)
                const noBatchSystemQty = noBatchResponse.reduce((sum, batch) => sum + (Number(batch.qty) || 0), 0);
                const variance = noBatchQty - noBatchSystemQty;
                const hasVariance = Math.abs(variance) > 0.01;
                
                console.log(`🔍 Adding "No Batch" to batchDetails:`, {
                  countedQty: noBatchQty,
                  systemQty: noBatchSystemQty,
                  variance: variance,
                  hasVariance: hasVariance,
                  existingEntries: noBatchResponse.length,
                  existingEntriesDetails: noBatchResponse
                });
                
                batchDetails.push({
                  batchNo: "",
                  expDate: null,
                  variance: variance,
                  countedQty: noBatchQty,
                  systemQty: noBatchSystemQty,
                  hasVariance: hasVariance,
                });
              } catch (error) {
                console.error(`Error fetching "No Batch" ItemBatches for ${trimmedItemCode}:`, error);
                // Fallback: assume no existing "No Batch" entries
                const variance = noBatchQty;
                batchDetails.push({
                  batchNo: "",
                  expDate: null,
                  variance: variance,
                  countedQty: noBatchQty,
                  systemQty: 0,
                  hasVariance: Math.abs(variance) > 0.01,
                });
              }
            }
          } else {
            // No batches to fetch - create basic batch details
            batchDetails = batchBreakdown.map((batch) => {
              const variance = batch.countedQty;
              const hasVariance = Math.abs(variance) > 0.01;

              return {
                batchNo: batch.batchNo || "",
                expDate: expiryMap.get(batch.countedQty) || item.docExpdate || null,
                variance: variance,
                countedQty: batch.countedQty,
                systemQty: 0,
                hasVariance: hasVariance,
              };
            });
          }
        } 
        // Fallback: Single batch from docBatchNo (backward compatibility or no batch breakdown)
        else {
          const variance = (parseFloat(item.docQty) || 0) - (parseFloat(item.docTtlqty) || 0);
          const hasVariance = Math.abs(variance) > 0.01;
          
          batchDetails = [{
            batchNo: item.docBatchNo || "",
            expDate: item.docExpdate || null,
            variance: variance,
            countedQty: parseFloat(item.docQty) || 0,
            systemQty: parseFloat(item.docTtlqty) || 0,
            hasVariance: hasVariance,
          }];
        }

        // Add to grouped items (key is already calculated)
        if (!groupedItems.has(key)) {
          groupedItems.set(key, {
            itemcode: item.itemcode,
            trimmedItemCode: trimmedItemCode,
            itemUom: item.docUom || item.itemUom || "",
            itemPrice: parseFloat(item.docPrice) || 0,
            batches: [],
            totalVariance: 0,
            totalCountedQty: 0,
            totalSystemQty: 0,
            hasAnyVariance: false,
          });
        }
        
        const group = groupedItems.get(key);
        
        // Add all batch details for this item
        console.log(`🔍 Adding batches to group for item ${trimmedItemCode}:`, {
          batchCount: batchDetails.length,
          batches: batchDetails.map(b => ({
            batchNo: b.batchNo || "(empty - No Batch)",
            countedQty: b.countedQty,
            systemQty: b.systemQty,
            variance: b.variance,
            hasVariance: b.hasVariance
          }))
        });
        
        batchDetails.forEach((batch) => {
          group.batches.push(batch);
          
          // Accumulate totals
          group.totalVariance = (group.totalVariance || 0) + batch.variance;
          group.totalCountedQty = (group.totalCountedQty || 0) + batch.countedQty;
          group.totalSystemQty = (group.totalSystemQty || 0) + batch.systemQty;
          
          // Mark if any batch has variance
          if (batch.hasVariance) {
            group.hasAnyVariance = true;
          }
        });
        
        console.log(`🔍 Group totals for item ${trimmedItemCode}:`, {
          totalVariance: group.totalVariance,
          totalCountedQty: group.totalCountedQty,
          totalSystemQty: group.totalSystemQty,
          hasAnyVariance: group.hasAnyVariance,
          batchCount: group.batches.length
        });
      }

      // Step 3: Check if Stktrns already exist for this document
      const chkFilter = {
        where: {
          and: [{ trnDocno: stockTakeDocNo }, { storeNo: stockHdrs.storeNo }],
        },
      };
      const stkResp = await apiService.get(
        `Stktrns?filter=${encodeURIComponent(JSON.stringify(chkFilter))}`
      );

      if (stkResp.length === 0) {
        // Step 4: Create Stktrns records - ONE per item (including 0 variance items for audit trail)
        const today = new Date();
        const timeStr =
          ("0" + today.getHours()).slice(-2) +
          ("0" + today.getMinutes()).slice(-2) +
          ("0" + today.getSeconds()).slice(-2);
        
        const stktrnsRecords = Array.from(groupedItems.values()).map((group) => {
          // Build comma-separated batch list for itemBatch field (summary)
          const batchNumbers = group.batches.map((batch) => {
            return batch.batchNo === "" ? "Unbatched" : batch.batchNo;
          });
          const itemBatchSummary = batchNumbers.join(",");
          
          // Calculate balance quantities based on current stock
          const totalVariance = group.totalVariance || 0;
          const totalAmt = group.itemPrice * Math.abs(totalVariance);
          
          return {
            id: null,
            trnPost: today.toISOString().split("T")[0],
            trnNo: null,
            trnDate: moment().format("YYYY-MM-DD"),
            postTime: timeStr,
            aperiod: null,
            itemcode: group.itemcode + "0000", // Match stock adjustment format
            storeNo: stockHdrs.storeNo,
            tstoreNo: null,
            fstoreNo: null,
            trnDocno: stockTakeDocNo,
            trnType: "TKE",
            trnDbQty: null,
            trnCrQty: null,
            trnQty: totalVariance, // Can be 0 for items with no variance
            // Balance will be calculated from ItemOnQties in Step 5 below
            trnBalqty: group.totalSystemQty + totalVariance, // Initial value, will be updated
            trnBalcst: group.totalSystemQty * group.itemPrice, // Initial value, will be updated
            trnAmt: totalAmt,
            trnCost: totalAmt,
            trnRef: null,
            hqUpdate: false, // ✅ REQUIRED FIELD - Fixed missing hqUpdate
            lineNo: null,
            itemUom: group.itemUom,
            movType: "TKE",
            itemBatch: getConfigValue("BATCH_NO") === "Yes" ? itemBatchSummary : null,
            itemBatchCost: group.itemPrice || 0,
            stockIn: null,
            transPackageLineNo: null,
            docExpdate: null, // No single expiry - handled in Stktrnbatches
            loginUser: userDetails?.username || "SYSTEM",
            siteCode: userDetails?.siteCode,
          };
        });

        // Step 5: Fetch ItemOnQties to calculate correct balance quantities
        const itemRequests = stktrnsRecords.map((d) => {
          const filter = {
            where: {
              and: [
                { itemcode: d.itemcode },
                { uom: d.itemUom },
                { sitecode: stockHdrs.storeNo },
              ],
            },
          };
          const url = `Itemonqties?filter=${encodeURIComponent(JSON.stringify(filter))}`;
          return apiService
            .get(url)
            .then((resp) => ({ resp, d }))
            .catch((error) => ({ error, d }));
        });

        const itemResults = await Promise.all(itemRequests);

        // Update balance quantities based on current stock
        for (const { resp, d, error } of itemResults) {
          if (error) {
            console.error(`Itemonqties API failed for ${d.itemcode}:`, error);
            continue;
          }

          if (resp && resp.length > 0) {
            const on = resp[0];
            // For stock take: add variance to current balance
            d.trnBalqty = (Number(on.trnBalqty || 0) + Number(d.trnQty || 0)).toString();
            d.trnBalcst = (Number(on.trnBalcst || 0) + Number(d.trnAmt || 0)).toString();
            d.itemBatchCost = (on.batchCost || d.itemBatchCost || 0).toString();
            console.log(`✅ Updated balances for ${d.itemcode}:`, {
              trnBalqty: d.trnBalqty,
              trnBalcst: d.trnBalcst
            });
          } else {
            // No existing stock - use variance as new balance
            d.trnBalqty = (Number(d.trnQty || 0)).toString();
            d.trnBalcst = (Number(d.trnAmt || 0)).toString();
            console.log(`⚠️ No existing stock for ${d.itemcode}, using variance as balance`);
          }
        }

        // Step 6: Create Stktrns records and get IDs
        let stktrnsResponse;
        try {
          stktrnsResponse = await apiService.post("Stktrns", stktrnsRecords);
          console.log("Stktrns records created successfully (including 0 variance items for audit trail)");
        } catch (err) {
          console.error("Error creating Stktrns records:", err);
          throw err;
        }
        
        // Map response IDs to records
        // Handle both array response and single object response
        // Match by itemcode+uom for reliability (in case API returns in different order)
        const stktrnsWithIds = stktrnsRecords.map((record) => {
          let id = null;
          
          if (stktrnsResponse) {
            if (Array.isArray(stktrnsResponse)) {
              // Array response - match by itemcode and uom for reliability
              const matchingResponse = stktrnsResponse.find(
                (resp) => resp.itemcode === record.itemcode && resp.itemUom === record.itemUom
              );
              if (matchingResponse && matchingResponse.id) {
                id = matchingResponse.id;
              } else {
                // Fallback to index matching if itemcode match fails
                const index = stktrnsRecords.findIndex(
                  (r) => r.itemcode === record.itemcode && r.itemUom === record.itemUom
                );
                if (stktrnsResponse[index] && stktrnsResponse[index].id) {
                  id = stktrnsResponse[index].id;
                }
              }
            } else if (stktrnsResponse.id && stktrnsResponse.itemcode === record.itemcode && stktrnsResponse.itemUom === record.itemUom) {
              // Single object response - match by itemcode and uom
              id = stktrnsResponse.id;
            }
          }
          
          return {
            ...record,
            id: id,
          };
        });

        // Step 7: Create Stktrnbatches records and update ItemBatches
        // Process each item group
        if (getConfigValue("BATCH_NO") === "Yes") {
          for (let i = 0; i < stktrnsWithIds.length; i++) {
            const stktrnRecord = stktrnsWithIds[i];
            const group = Array.from(groupedItems.values())[i];
            
            if (!stktrnRecord.id) {
              console.warn(
                `No Stktrns ID found for item ${stktrnRecord.itemcode}, skipping batch processing`
              );
              continue;
            }

            // Process each batch within this item
            for (const batch of group.batches) {
              // Debug logging for batch processing
              console.log(`🔍 Processing batch for Item ${group.trimmedItemCode}:`, {
                batchNo: batch.batchNo || "(empty - No Batch)",
                countedQty: batch.countedQty,
                systemQty: batch.systemQty,
                variance: batch.variance,
                hasVariance: batch.hasVariance,
                expDate: batch.expDate
              });

              // 6a. Create Stktrnbatches record for ALL batches (including 0 variance for audit trail)
              const batchNoForStktrnbatches = batch.batchNo || "No Batch"; // Use "No Batch" for empty (like stock adjustment)
              const stktrnbatchesPayload = {
                batchNo: batchNoForStktrnbatches,
                stkTrnId: stktrnRecord.id,
                batchQty: batch.variance || 0, // Can be 0 for audit trail
              };

              try {
                await apiService.post("Stktrnbatches", stktrnbatchesPayload);
                console.log(
                  `✅ Created Stktrnbatches for batch ${batchNoForStktrnbatches} - variance: ${batch.variance || 0} ${batch.hasVariance ? "(has variance)" : "(audit trail only)"}`
                );
              } catch (error) {
                console.error(`❌ Error creating Stktrnbatches for batch ${batchNoForStktrnbatches}:`, error);
                // Continue processing other batches even if one fails
              }

              // 6b. Update ItemBatches - ONLY for batches with variance
              // Skip ItemBatches update if no variance (to avoid unnecessary updates)
              const shouldUpdate = batch.hasVariance && Math.abs(batch.variance) >= 0.01;
              console.log(`🔍 ItemBatches update check for batch ${batchNoForStktrnbatches}:`, {
                hasVariance: batch.hasVariance,
                variance: batch.variance,
                absVariance: Math.abs(batch.variance),
                shouldUpdate: shouldUpdate
              });

              if (!shouldUpdate) {
                console.log(
                  `⏭️ Skipping ItemBatches update for batch ${batchNoForStktrnbatches} - no variance (variance: ${batch.variance}, hasVariance: ${batch.hasVariance})`
                );
                continue; // Skip ItemBatches update, but Stktrnbatches already created above
              }

              console.log(`✅ Processing ItemBatches update for batch ${batchNoForStktrnbatches} with variance ${batch.variance}`);

              // Normalize expiry date for matching
              const normalizedExpDate = normalizeExpDate(batch.expDate);

              // Check if this specific batch exists in ItemBatches
              const batchCheckFilter = {
                where: {
                  and: [
                    { itemCode: group.trimmedItemCode },
                    { siteCode: userDetails.siteCode },
                    { uom: group.itemUom },
                    { batchNo: batch.batchNo || "" },
                    ...(normalizedExpDate ? [{ expDate: normalizedExpDate }] : []),
                  ],
                },
              };

              try {
                const existingBatch = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(JSON.stringify(batchCheckFilter))}`
                );

                if (existingBatch && existingBatch.length > 0) {
                  // Update existing batch - use variance (can be positive or negative)
                  const batchUpdate = {
                    itemcode: group.trimmedItemCode, // lowercase for update
                    sitecode: userDetails.siteCode,
                    uom: group.itemUom,
                    qty: Number(batch.variance), // Signed variance (positive = increase, negative = decrease)
                    batchcost: 0, // Set to 0 for updates, cost is managed separately
                    batchno: batch.batchNo || "",
                    ...(normalizedExpDate && getConfigValue('EXPIRY_DATE') === "Yes" 
                      ? { expDate: normalizedExpDate } 
                      : {}),
                  };

                  console.log(`🔍 ItemBatches update payload for batch ${batch.batchNo || "No Batch"}:`, batchUpdate);
                  
                  await apiService
                    .post("ItemBatches/updateqty", batchUpdate)
                    .then(() => {
                      console.log(
                        `✅ Updated ItemBatches for item ${group.trimmedItemCode}, batch ${batch.batchNo || "No Batch"} with variance ${batch.variance}`
                      );
                    })
                    .catch((err) => {
                      console.error(
                        `❌ Failed to update ItemBatches for item ${group.trimmedItemCode}, batch ${batch.batchNo || "No Batch"}:`,
                        err
                      );
                      throw err; // Re-throw to be caught by outer try-catch
                    });
                } else {
                  // Batch doesn't exist - create new batch entry
                  const newBatch = {
                    itemCode: group.trimmedItemCode, // camelCase for create
                    siteCode: userDetails.siteCode,
                    uom: group.itemUom,
                    qty: Number(batch.countedQty), // Use counted quantity as new batch qty
                    batchCost: Number(group.itemPrice * batch.countedQty),
                    batchNo: batch.batchNo || "",
                    ...(normalizedExpDate && getConfigValue('EXPIRY_DATE') === "Yes" 
                      ? { expDate: normalizedExpDate } 
                      : {}),
                  };

                  console.log(`🔍 ItemBatches create payload for batch ${batch.batchNo || "No Batch"}:`, newBatch);

                  await apiService
                    .post("ItemBatches", newBatch)
                    .then(() => {
                      console.log(
                        `✅ Created new ItemBatches entry for item ${group.trimmedItemCode}, batch ${batch.batchNo || "No Batch"}`
                      );
                    })
                    .catch((err) => {
                      console.error(
                        `❌ Failed to create ItemBatches for item ${group.trimmedItemCode}, batch ${batch.batchNo || "No Batch"}:`,
                        err
                      );
                      throw err; // Re-throw to be caught by outer try-catch
                    });
                }
              } catch (err) {
                console.error(
                  `Failed to update/create ItemBatches for item ${group.trimmedItemCode}, batch ${batch.batchNo || "No Batch"}:`,
                  err
                );
                // Log error but continue with other batches
              }
            }
          }
        }

        // Step 8: Handle non-batch items (when BATCH_NO is disabled)
        if (getConfigValue('BATCH_NO') !== "Yes") {
          for (const stktrnRecord of stktrnsWithIds) {
            const group = Array.from(groupedItems.values()).find(
              (g) => g.itemcode === stktrnRecord.itemcode
            );
            
            if (group && group.hasAnyVariance) {
              // Only update ItemBatches if there's variance
              const batchUpdate = {
                itemcode: group.trimmedItemCode,
                sitecode: userDetails.siteCode,
                uom: group.itemUom,
                qty: Number(stktrnRecord.trnQty),
                batchcost: 0,
              };

              try {
                await apiService.post("ItemBatches/updateqty", batchUpdate);
                console.log(`Updated ItemBatches (no batch) for item ${group.trimmedItemCode}`);
              } catch (err) {
                console.error(`Failed to update ItemBatches for item ${group.trimmedItemCode}:`, err);
              }
            } else if (group) {
              console.log(`Skipping ItemBatches update for item ${group.trimmedItemCode} - no variance (audit trail only)`);
            }
          }
        }
      } else {
        console.log("Stktrns already exist for this document - skipping to avoid duplicates");
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
    const value = e.target.value;
    setSearchValue(value); // Update the search value state
    
    // Reset workflow to Step 1 when search changes
    if (workflowStep > 1) {
      setWorkflowStep(1);
      setStockTakeItems([]);
      setSelectedItems(new Set());
    }
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

    // Batch and Expiry Date Validation - Removed for Stock Take
    // Stock Take is a counting/verification process, not a receiving process
    // Batch and expiry date are not required for stock take operations
    // The system will use existing batch/expiry information from inventory if needed

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
       docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? (item.docExpdate || "") : "",
       itemRemark: item.itemRemark || "",
       ...(getConfigValue('BATCH_NO') === "Yes" && {
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
       docExpdate: getConfigValue('EXPIRY_DATE') === "Yes" ? (item.expiryDate || "") : "",
       itmBrand: item.brandCode,
       itmRange: item.rangeCode,
       itmBrandDesc: item.brand,
       itmRangeDesc: item.range || "",
       DOCUOMDesc: item.uomDescription,
       itemRemark: "",
       docMdisc: 0,
       recTtl: 0,
       ...(getConfigValue('BATCH_NO') === "Yes" && {
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
    
    // If in Step 2, prepare cartData from confirmed items
    let preparedCartData = null;
    if (workflowStep === 2) {
      preparedCartData = prepareCartDataFromConfirmedItems();
      if (!preparedCartData) {
        return; // Validation failed
      }
    }
    
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
      // Use prepared cartData if available (from Step 2), otherwise use existing cartData
      let details = preparedCartData || cartData;
  
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
        // Map details to include docNo (use preparedCartData if available)
        details = details.map((item, index) => ({
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
        docStatus: type === "save" ? 0 : type === "submit" ? 1 : (hdr.docStatus || 0),
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
        // Save functionality - status stays as Open (0)
        data.docStatus = 0;
        
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
        // Post - status changes to Posted (1)
        data.docStatus = 1;
        data.postDate = new Date().toISOString();
        data.postedBy = userDetails?.username;
  
        if (!urlDocNo) {
          // Direct post without saving first - create header and details
          await postStockHdr(data, "create");
          await postStockDetails(details);
          await addNewControlNumber(controlData);
          
          // Update stock quantities when posted
          try {
            await updateStockQuantitiesAndBatches(docNo);
            console.log("Stock quantities and batches updated successfully");
          } catch (stockUpdateError) {
            console.error("Error updating stock quantities:", stockUpdateError);
            toast.warning("Stock Take posted but failed to update stock quantities");
          }

          // Create Stock Adjustment document when posted
          try {
            const adjustmentDocNo = await createStockAdjustmentFromStockTake(docNo);
            if (adjustmentDocNo) {
              message = `Stock Take posted and Stock Adjustment ${adjustmentDocNo} created successfully`;
              toast.success(`Stock Adjustment ${adjustmentDocNo} created successfully`);
            } else {
              message = "Stock Take posted (no variances found for adjustment)";
              toast.info("No variances found - no adjustment document needed");
            }
          } catch (adjustmentError) {
            console.error("Error creating adjustment:", adjustmentError);
            message = "Stock Take posted but failed to create adjustment document";
            toast.error("Failed to create adjustment document: " + adjustmentError.message);
          }
        } else {
          // Update existing document to posted status
          const updateResponse = await postStockHdr(data, "update");
          await postStockDetails(details);
          
          // Check if update was successful
          if (updateResponse && updateResponse.count === 1) {
            // Update stock quantities when posted
            try {
              await updateStockQuantitiesAndBatches(docNo);
              console.log("Stock quantities and batches updated successfully");
            } catch (stockUpdateError) {
              console.error("Error updating stock quantities:", stockUpdateError);
              toast.warning("Stock Take posted but failed to update stock quantities");
            }

            // Create Stock Adjustment document when posted
            try {
              const adjustmentDocNo = await createStockAdjustmentFromStockTake(docNo);
              if (adjustmentDocNo) {
                message = `Stock Take posted and Stock Adjustment ${adjustmentDocNo} created successfully`;
                toast.success(`Stock Adjustment ${adjustmentDocNo} created successfully`);
              } else {
                message = "Stock Take posted (no variances found for adjustment)";
                toast.info("No variances found - no adjustment document needed");
              }
            } catch (adjustmentError) {
              console.error("Error creating adjustment:", adjustmentError);
              message = "Stock Take posted but failed to create adjustment document";
              toast.error("Failed to create adjustment document: " + adjustmentError.message);
            }
          } else {
            throw new Error("Failed to update Stock Take status");
          }
        }
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
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {!stockHdrs.docNo
                  ? "Add Stock Take"
                  : stockHdrs.docStatus === 0
                  ? "Open Stock Take"
                  : stockHdrs.docStatus === 1
                  ? "Posted Stock Take"
                  : "Stock Take"}
              </h1>
              {/* Progress Indicator */}
              {(!stockHdrs.docNo || stockHdrs.docStatus === 0) && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`h-2 w-24 rounded ${
                      workflowStep >= 1 ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`h-2 w-24 rounded ${
                      workflowStep >= 2 ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm text-gray-600 ml-2">
                    Step {workflowStep} of 2
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
                onClick={() => navigateTo("/stock-take?tab=all")}
                disabled={saveLoading || postLoading}
              >
                Cancel
              </Button>
              
              {/* Save and Post buttons - show only in Step 2 when creating new or when status is Open */}
              {workflowStep === 2 &&
                (!stockHdrs.docNo || stockHdrs.docStatus === 0) && (
                  <>
                    <Button
                      onClick={(e) => {
                        onSubmit(e, "save");
                      }}
                      disabled={
                        saveLoading ||
                        postLoading ||
                        stockTakeItems.filter(
                          (item) => item.confirmUpdate
                        ).length === 0
                      }
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
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        onSubmit(e, "submit");
                      }}
                      disabled={
                        saveLoading ||
                        postLoading ||
                        stockTakeItems.filter(
                          (item) => item.confirmUpdate
                        ).length === 0
                      }
                      className="cursor-pointer hover:bg-green-600 hover:text-white transition-colors duration-150"
                    >
                      {postLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        "Post"
                      )}
                    </Button>
                  </>
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
              {(!stockHdrs.docNo || stockHdrs.docStatus === 0) && (
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
                          value={searchValue}
                          onChange={handleSearch}
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
                            // Reset workflow to Step 1 when department filter changes
                            if (workflowStep > 1) {
                              setWorkflowStep(1);
                              setStockTakeItems([]);
                              setSelectedItems(new Set());
                            }
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
                            // Reset workflow to Step 1 when department filter changes
                            if (workflowStep > 1) {
                              setWorkflowStep(1);
                              setStockTakeItems([]);
                              setSelectedItems(new Set());
                            }
                          }}
                        />
                        <label htmlFor="salon" className="text-sm">
                          Salon Product
                        </label>
                      </div>
                    </div>

                    {/* Step 1: View Items (Read-Only) */}
                    {workflowStep === 1 && (
                      <>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Step 1: View Stock Items
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Select items for stock take
                            </p>
                          </div>
                          <div className="text-sm text-gray-600">
                            Selected: {selectedItems.size} / {stockList.filter(item => item.isActive === "True").length}
                          </div>
                        </div>
                        <div className="rounded-md border shadow-sm">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={
                                      stockList.filter(item => item.isActive === "True").length > 0 &&
                                      stockList.filter(item => item.isActive === "True").every(item => selectedItems.has(item.stockCode))
                                    }
                                    onCheckedChange={handleSelectAll}
                                  />
                                </TableHead>
                                <TableHead
                                  className={`font-semibold ${
                                    true ? "cursor-pointer hover:bg-gray-100" : ""
                                  }`}
                                  onClick={() => handleSort("stockCode")}
                                >
                                  Item Code{" "}
                                  {sortConfig?.key === "stockCode" ? (
                                    sortConfig.direction === "asc" ? "↑" : "↓"
                                  ) : (
                                    "↕"
                                  )}
                                </TableHead>
                                <TableHead
                                  className={
                                    true ? "cursor-pointer hover:bg-gray-100" : ""
                                  }
                                  onClick={() => handleSort("stockName")}
                                >
                                  Description{" "}
                                  {sortConfig?.key === "stockName" ? (
                                    sortConfig.direction === "asc" ? "↑" : "↓"
                                  ) : (
                                    "↕"
                                  )}
                                </TableHead>
                                <TableHead>UOM</TableHead>
                                <TableHead
                                  className={
                                    true ? "cursor-pointer hover:bg-gray-100" : ""
                                  }
                                  onClick={() => handleSort("Brand")}
                                >
                                  Brand{" "}
                                  {sortConfig?.key === "Brand" ? (
                                    sortConfig.direction === "asc" ? "↑" : "↓"
                                  ) : (
                                    "↕"
                                  )}
                                </TableHead>
                                <TableHead>Link Code</TableHead>
                                <TableHead>Bar Code</TableHead>
                                <TableHead
                                  className={
                                    true ? "cursor-pointer hover:bg-gray-100" : ""
                                  }
                                  onClick={() => handleSort("Range")}
                                >
                                  Range{" "}
                                  {sortConfig?.key === "Range" ? (
                                    sortConfig.direction === "asc" ? "↑" : "↓"
                                  ) : (
                                    "↕"
                                  )}
                                </TableHead>
                                <TableHead>On Hand Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loading ? (
                                <TableSpinner colSpan={9} message="Loading..." />
                              ) : stockList.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={9} className="text-center py-10">
                                    <div className="flex flex-col items-center gap-2 text-gray-500">
                                      <FileText size={40} />
                                      <p>No items Found</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                stockList
                                  .filter((ite) => ite.isActive === "True")
                                  .slice(
                                    itemFilter.skip,
                                    itemFilter.skip + itemFilter.limit
                                  )
                                  .map((item, index) => (
                                    <TableRow
                                      key={index}
                                      className="hover:bg-gray-50 transition-colors duration-150"
                                    >
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedItems.has(item.stockCode)}
                                          onCheckedChange={(checked) =>
                                            handleItemSelection(item.stockCode, checked)
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {item.stockCode || "-"}
                                      </TableCell>
                                      <TableCell className="max-w-[200px] whitespace-normal break-words">
                                        {item.stockName || "-"}
                                      </TableCell>
                                      <TableCell>
                                        {item.uomDescription || item.itemUom || "-"}
                                      </TableCell>
                                      <TableCell>{item.Brand || item.brand || "-"}</TableCell>
                                      <TableCell>{item.linkCode || "-"}</TableCell>
                                      <TableCell>
                                        {item.barCode || item.brandCode || "-"}
                                      </TableCell>
                                      <TableCell>{item.Range || item.range || "-"}</TableCell>
                                      <TableCell className="font-medium">
                                        {item.quantity || 0}
                                      </TableCell>
                                    </TableRow>
                                  ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <Pagination
                          currentPage={
                            Math.ceil(itemFilter.skip / itemFilter.limit) + 1
                          }
                          totalPages={Math.ceil(itemTotal / itemFilter.limit)}
                          onPageChange={handlePageChange}
                        />
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={handleNextToQuantityEntry}
                            disabled={selectedItems.size === 0 || loading || saveLoading || postLoading}
                            className="bg-blue-950 text-white hover:bg-blue-700"
                          >
                            Next
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Step 2: Enter Quantities */}
                    {workflowStep === 2 && (
                      <>
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            Step 2: Enter Quantities
                          </h3>
                          <div className="text-sm text-gray-600">
                            Confirmed:{" "}
                            {
                              stockTakeItems.filter((item) => item.confirmUpdate)
                                .length
                            }{" "}
                            / {stockTakeItems.length}
                          </div>
                        </div>
                        <div className="rounded-md border shadow-sm">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>Item Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>UOM</TableHead>
                                <TableHead className="font-semibold">
                                  Qty Entry
                                </TableHead>
                                <TableHead>Current On Hand Qty</TableHead>
                                <TableHead className="font-semibold">
                                  Difference
                                </TableHead>
                                {getConfigValue("BATCH_NO") === "Yes" && (
                                  <TableHead>Batch</TableHead>
                                )}
                                <TableHead>Confirm Update</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loading ? (
                                <TableSpinner colSpan={getConfigValue("BATCH_NO") === "Yes" ? 10 : 9} message="Loading..." />
                              ) : stockTakeItems.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={getConfigValue("BATCH_NO") === "Yes" ? 10 : 9}
                                    className="text-center py-10"
                                  >
                                    <div className="flex flex-col items-center gap-2 text-gray-500">
                                      <FileText size={40} />
                                      <p>No items selected. Please go back and select items.</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                stockTakeItems
                                  .slice(
                                    itemFilter.skip,
                                    itemFilter.skip + itemFilter.limit
                                  )
                                  .map((item, index) => {
                                    // Calculate actual index in the full stockTakeItems array
                                    const actualIndex = itemFilter.skip + index;
                                    const variance = item.variance || 0;
                                    const varianceStyle =
                                      variance > 0
                                        ? "text-green-600"
                                        : variance < 0
                                        ? "text-red-600"
                                        : "text-gray-600";
                                    return (
                                      <TableRow
                                        key={`${item.stockCode}-${actualIndex}`}
                                        className={
                                          variance !== 0
                                            ? "bg-yellow-50"
                                            : "hover:bg-gray-50"
                                        }
                                      >
                                        <TableCell className="font-medium">
                                          {item.stockCode || "-"}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] whitespace-normal break-words">
                                          {item.stockName || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {item.uomDescription ||
                                            item.itemUom ||
                                            "-"}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            className="w-20 text-right"
                                            value={item.countedQty || ""}
                                            onChange={(e) =>
                                              handleCountedQtyChange(
                                                actualIndex,
                                                e.target.value
                                              )
                                            }
                                            min="0"
                                            placeholder="0"
                                            disabled={!canEdit()}
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {item.onHandQty || 0}
                                        </TableCell>
                                        <TableCell
                                          className={`font-semibold ${varianceStyle}`}
                                        >
                                          {variance > 0 ? "+" : ""}
                                          {variance.toFixed(2)}
                                        </TableCell>
                                        {getConfigValue("BATCH_NO") === "Yes" && (
                                          <TableCell>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleOpenBatchDialog(item, actualIndex)}
                                              disabled={!canEdit() || !item.countedQty || item.countedQty === 0}
                                              className="w-full"
                                            >
                                              <Package className="w-4 h-4 mr-1" />
                                              {item.hasBatchBreakdown ? "Edit Batch" : "Select Batch"}
                                            </Button>
                                            {item.hasBatchBreakdown && item.batchBreakdown && (
                                              <div className="text-xs text-gray-600 mt-1">
                                                {item.batchBreakdown.filter(b => (b.countedQty || 0) > 0).length} batch(es)
                                              </div>
                                            )}
                                          </TableCell>
                                        )}
                                        <TableCell>
                                          <Checkbox
                                            checked={item.confirmUpdate || false}
                                            onCheckedChange={(checked) =>
                                              handleConfirmCheckbox(
                                                actualIndex,
                                                checked
                                              )
                                            }
                                            disabled={!canEdit()}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            className="w-32"
                                            value={item.remarks || ""}
                                            onChange={(e) => {
                                              setStockTakeItems((prev) => {
                                                const updated = [...prev];
                                                updated[actualIndex] = {
                                                  ...updated[actualIndex],
                                                  remarks: e.target.value,
                                                };
                                                return updated;
                                              });
                                            }}
                                            placeholder="Remarks"
                                            disabled={!canEdit()}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItem(actualIndex)}
                                            disabled={!canEdit()}
                                            className="cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                                            title="Remove item"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <Pagination
                          currentPage={
                            Math.ceil(itemFilter.skip / itemFilter.limit) + 1
                          }
                          totalPages={Math.ceil(
                            stockTakeItems.length / itemFilter.limit
                          )}
                          onPageChange={handlePageChange}
                        />
                        <div className="flex justify-end mt-4">
                          <Button
                            variant="outline"
                            onClick={handleBackToPreviousStep}
                            disabled={saveLoading || postLoading}
                          >
                            Back
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Old Selected Items table - only show when not in new workflow (for backward compatibility) */}
          {cartData.length > 0 && workflowStep !== 2 && (
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
                    {getConfigValue('BATCH_NO') === "Yes" && (
                      <>
                        <TableHead>Batch No</TableHead>
                        <TableHead>Expiry Date</TableHead>
                      </>
                    )}
                    <TableHead>Remarks</TableHead>
                    {(!stockHdrs.docNo || stockHdrs.docStatus === 0) && (
                      <TableHead>Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                                     {loading ? (
                     <TableSpinner
                       colSpan={getConfigValue('BATCH_NO') === "Yes" ? 10 : 8}
                     />
                   ) : cartData.length === 0 ? (
                     <TableRow>
                       <TableCell
                         colSpan={
                           getConfigValue('BATCH_NO') === "Yes" ? 10 : 8
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
                          {getConfigValue('BATCH_NO') === "Yes" && (
                            <>
                              <TableCell>{item?.docBatchNo ?? "-"}</TableCell>
                              <TableCell>
                                {format_Date(item.docExpdate)}
                              </TableCell>
                            </>
                          )}
                          <TableCell>{item.itemRemark}</TableCell>

                          {(!stockHdrs.docNo || stockHdrs.docStatus === 0) && (
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
                         {getConfigValue('BATCH_NO') === "Yes" ? (
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
            <AlertDialogAction onClick={() => setShowValidationDialog(false)} className="cursor-pointer">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Batch Selection Dialog */}
      {getConfigValue("BATCH_NO") === "Yes" && (
        <StockTakeBatchSelectionDialog
          showBatchDialog={batchSelectionDialog.open}
          setShowBatchDialog={(open) =>
            setBatchSelectionDialog((prev) => ({ ...prev, open }))
          }
          batchBreakdown={batchSelectionDialog.batches}
          countedQty={batchSelectionDialog.item?.countedQty || 0}
          totalBatchQty={batchSelectionDialog.totalBatchQty || 0}
          noBatchQty={batchSelectionDialog.noBatchQty || 0}
          onBatchSelectionSubmit={handleBatchSelectionSubmit}
          itemcode={batchSelectionDialog.item?.stockCode || ""}
          itemdesc={batchSelectionDialog.item?.stockName || ""}
        />
      )}
    </>
  );
}

export default AddTake;
