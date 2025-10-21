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
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import moment from "moment";
import TableSpinner from "@/components/tabelSpinner";
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
        if (
          userDetails?.isSettingViewPrice === "True" &&
          (!editData?.docPrice || editData.docPrice <= 0)
        ) {
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
              {urlStatus == 7 &&
              userDetails?.isSettingPostedChangePrice === "True"
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
                  disabled={
                    (urlStatus == 7 &&
                    userDetails?.isSettingPostedChangePrice === "True") ||
                    (editData?.transferType === 'specific' && editData?.batchDetails)
                  }
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

// NEW: Batch Selection Dialog for GTO
const BatchSelectionDialog = memo(
  ({
    showBatchDialog,
    setShowBatchDialog,
    batchBreakdown,
    transferQty,
    totalBatchQty,
    noBatchQty,
    scenarioMessage,
    onBatchSelectionSubmit,
    itemcode,
    itemdesc,
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
    const totalSelectedQty =
      selectedBatches.reduce(
        (sum, batch) => sum + (batchQuantities[batch.batchNo] || 0),
        0
      ) + (noBatchSelected ? noBatchQuantity : 0);
    const remainingQty = transferQty - totalSelectedQty;

    const handleBatchSelection = (batch, isSelected) => {
      if (isSelected) {
        setSelectedBatches((prev) => [...prev, batch]);
        setBatchQuantities((prev) => ({
          ...prev,
          [batch.batchNo]: Math.min(batch.availableQty, remainingQty),
        }));
      } else {
        setSelectedBatches((prev) =>
          prev.filter((b) => b.batchNo !== batch.batchNo)
        );
        setBatchQuantities((prev) => {
          const newQuantities = { ...prev };
          delete newQuantities[batch.batchNo];
          return newQuantities;
        });
      }
    };

    const handleQuantityChange = (batchNo, quantity) => {
      const batch = batchBreakdown.find((b) => b.batchNo === batchNo);
      const maxQty = Math.min(
        batch.availableQty,
        remainingQty + (batchQuantities[batchNo] || 0)
      );
      const validQty = Math.max(0, Math.min(quantity, maxQty));

      setBatchQuantities((prev) => ({ ...prev, [batchNo]: validQty }));
    };

    const handleNoBatchSelection = (isSelected) => {
      setNoBatchSelected(isSelected);
      if (!isSelected) {
        setNoBatchQuantity(0);
      } else {
        // Set initial quantity to remaining quantity or available No Batch quantity
        const noBatchItem = batchBreakdown.find((b) => b.batchNo === "");
        const maxNoBatchQty = noBatchItem
          ? Math.min(noBatchItem.availableQty, remainingQty)
          : 0;
        setNoBatchQuantity(Math.min(maxNoBatchQty, remainingQty));
      }
    };

    const handleNoBatchQuantityChange = (quantity) => {
      const noBatchItem = batchBreakdown.find((b) => b.batchNo === "");
      const maxQty = noBatchItem
        ? Math.min(noBatchItem.availableQty, remainingQty + noBatchQuantity)
        : 0;
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
        batchNo: selectedBatches.map((b) => b.batchNo).join(", "),
        expDate: selectedBatches
          .map((b) => b.expDate)
          .filter(Boolean)
          .join(", "),
        availableQty: selectedBatches.reduce(
          (sum, batch) => sum + (batchQuantities[batch.batchNo] || 0),
          0
        ),
        noBatchQty: noBatchSelected ? noBatchQuantity : 0,
        selectedBatches: selectedBatches.map((batch) => ({
          batchNo: batch.batchNo,
          expDate: batch.expDate,
          quantity: batchQuantities[batch.batchNo],
        })),
      };

      onBatchSelectionSubmit(combinedBatchData);
    };

    return (
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Select Specific Batches for Transfer</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Choose specific batches to transfer for item:{" "}
              <strong>{itemcode}</strong> - {itemdesc}
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
                    <p>
                      <strong>Transfer Qty:</strong> {transferQty}
                    </p>
                    <p>
                      <strong>Batch Qty:</strong> {totalBatchQty}
                    </p>
                    <p>
                      <strong>"No Batch" Qty:</strong> {noBatchQty}
                    </p>
                    <p>
                      <strong>Selected Qty:</strong> {totalSelectedQty} /{" "}
                      {transferQty}
                    </p>
                    {remainingQty > 0 && (
                      <p className="text-orange-600">
                        <strong>Remaining:</strong> {remainingQty}
                      </p>
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
                        <th className="text-right p-2 font-medium">
                          Available Qty
                        </th>
                        <th className="text-center p-2 font-medium">
                          Select Qty
                        </th>
                        <th className="text-left p-2 font-medium">
                          Expiry Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchBreakdown.map((batch, index) => {
                        const isSelected = selectedBatches.some(
                          (b) => b.batchNo === batch.batchNo
                        );
                        const selectedQty = batchQuantities[batch.batchNo] || 0;
                        const maxSelectableQty = Math.min(
                          batch.availableQty,
                          remainingQty + selectedQty
                        );

                        return (
                          <tr
                            key={index}
                            className={`border-t hover:bg-gray-50 ${
                              batch.batchNo === "" ? "bg-gray-50" : ""
                            }`}
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={
                                  batch.batchNo === ""
                                    ? noBatchSelected
                                    : isSelected
                                }
                                onChange={(e) => {
                                  if (batch.batchNo === "") {
                                    handleNoBatchSelection(e.target.checked);
                                  } else {
                                    handleBatchSelection(
                                      batch,
                                      e.target.checked
                                    );
                                  }
                                }}
                                disabled={
                                  batch.batchNo !== "" &&
                                  !isSelected &&
                                  maxSelectableQty <= 0
                                }
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="p-2 font-medium">
                              {batch.batchNo === ""
                                ? "No Batch"
                                : batch.batchNo}
                              {batch.batchNo === "" && (
                                <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                  Balance
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <span
                                className={
                                  batch.batchNo === "" ? "text-gray-600" : ""
                                }
                              >
                                {batch.availableQty}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              {batch.batchNo === "" ? (
                                noBatchSelected ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    max={Math.min(
                                      batch.availableQty,
                                      remainingQty + noBatchQuantity
                                    )}
                                    value={noBatchQuantity}
                                    onChange={(e) =>
                                      handleNoBatchQuantityChange(
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-20 text-center"
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )
                              ) : isSelected ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxSelectableQty}
                                  value={selectedQty}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      batch.batchNo,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-20 text-center"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-xs">
                              {batch.batchNo === ""
                                ? "N/A"
                                : batch.expDate
                                ? format_Date(batch.expDate)
                                : "No Expiry"}
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
                  <p className="text-sm mt-1">
                    This item only has 'No Batch' quantities available
                  </p>
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
                      {selectedBatches.map((batch) => (
                        <p key={batch.batchNo} className="text-xs">
                          <strong>{batch.batchNo}:</strong>{" "}
                          {batchQuantities[batch.batchNo] || 0} qty
                        </p>
                      ))}
                      {noBatchSelected && (
                        <p key="no-batch" className="text-xs text-orange-600">
                          <strong>No Batch:</strong> {noBatchQuantity} qty
                        </p>
                      )}
                      <p className="text-xs font-medium">
                        <strong>Total Selected:</strong> {totalSelectedQty} /{" "}
                        {transferQty}
                      </p>
                      {remainingQty > 0 && (
                        <p className="text-xs text-red-600">
                          <strong>Remaining:</strong> {remainingQty} (not
                          selected)
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
                    Select multiple batches to reach your transfer quantity. You
                    can select different quantities from each batch.
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

  // NEW: Batch management states for GTO
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchBreakdown, setBatchBreakdown] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [newBatchNo, setNewBatchNo] = useState("");
  const [useExistingBatch, setUseExistingBatch] = useState(true);
  const [transferSpecificBatch, setTransferSpecificBatch] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  // NEW: Per-item loading state for batch selection
  const [itemBatchLoading, setItemBatchLoading] = useState({});

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
            await Promise.all([getOptions()]);
          }

          await getStockHdrDetails(filter);
          await getStoreList();
        } else {
          await Promise.all([getStoreList(), getOptions()]);
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
      }
    };

    initializeData();
  }, []);

  // Separate effect to load stock details after page initialization
  useEffect(() => {
    if (!pageLoading && stockHdrs.fstoreNo) {
      getStockDetails();
    }
  }, [pageLoading, stockHdrs.fstoreNo]);

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

  // Helper function to reconstruct batch state from stored database fields
  const reconstructBatchState = async (cartItem, sourceStore) => {
    if (cartItem.ordMemo1 === "specific" && cartItem.ordMemo2) {
      try {
        // Parse batch breakdown from ordMemo2 with validation
        const batchBreakdown = cartItem.ordMemo2.split(",").map((batch) => {
          const [batchNo, quantity] = batch.split(":");
          const parsedQuantity = Number(quantity);
          
          // Validate batch data
          if (!batchNo || isNaN(parsedQuantity) || parsedQuantity <= 0) {
            console.warn(`Invalid batch data: ${batch}`, { batchNo, quantity: parsedQuantity });
            return null;
          }
          
          return { batchNo, quantity: parsedQuantity };
        }).filter(Boolean); // Remove invalid entries

        // Check if we have valid batch data
        if (batchBreakdown.length === 0) {
          console.warn("No valid batch data found in ordMemo2:", cartItem.ordMemo2);
          return null;
        }

        // Fetch ItemBatches data to get fresh expiry dates
        const itemBatchesFilter = {
          where: {
            and: [
              { itemCode: cartItem.itemcode },
              { siteCode: sourceStore },
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
          // Return empty array to continue with available data
          return [];
        });

        // Map batch data with fresh expiry dates from API
        const enrichedBatchDetails = batchBreakdown.map((batch) => {
          const apiBatch = itemBatchesResponse.find(
            (api) => api.batchNo === batch.batchNo
          );
          return {
            batchNo: batch.batchNo,
            quantity: batch.quantity,
            expDate: apiBatch?.expDate || null,
            batchCost: apiBatch?.batchCost || 0,
          };
        });

        // Reconstruct the selectedBatches state
        const selectedBatches = {
          batchNo: enrichedBatchDetails.map((b) => b.batchNo).join(", "), // Reconstruct from individual batches
          expDate: enrichedBatchDetails
            .map((b) => b.expDate)
            .filter(Boolean)
            .join(", "),
          batchTransferQty: enrichedBatchDetails.reduce(
            (sum, b) => sum + b.quantity,
            0
          ),
          noBatchTransferQty: Number(cartItem.ordMemo3) || 0,
          totalTransferQty: Number(cartItem.recTtl),
          transferType: "specific",
          batchDetails: enrichedBatchDetails,
        };

        return selectedBatches;
      } catch (error) {
        console.error("Error reconstructing batch state:", error);
        // Show user-friendly error message
        toast.error("Failed to load batch information. Item will be treated as FEFO transfer.");
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
          const batchState = await reconstructBatchState(
            item,
            stockHdrs.fstoreNo
          );
          if (batchState) {
            return {
              ...item,
              transferType: "specific",
              batchDetails: {
                batchNo: batchState.batchNo,
                expDate: batchState.expDate,
                batchTransferQty: batchState.batchTransferQty,
                noBatchTransferQty: batchState.noBatchTransferQty,
                totalTransferQty: batchState.totalTransferQty,
                individualBatches: batchState.batchDetails,
              },
            };
          }
          return {
            ...item,
            transferType: "fefo",
            batchDetails: null,
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
      docPrice:
        userDetails?.isSettingViewPrice === "True"
          ? Number(editData.docPrice)
          : editData.docPrice,
      docAmt:
        userDetails?.isSettingViewPrice === "True"
          ? Number(editData.docQty) * Number(editData.docPrice)
          : editData.docAmt,
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
    console.log(item, "item");

    // Handle expiry date - format properly for HTML date input
    let expiryDate = "";
    if (item.docExpdate) {
      try {
        // Handle ISO date format (e.g., "2025-10-22T00:00:00.000Z")
        if (item.docExpdate.includes("T") || item.docExpdate.includes("Z")) {
          // Convert ISO date to YYYY-MM-DD format for HTML date input
          const date = new Date(item.docExpdate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString().split("T")[0];
          }
        }
        // Handle DD/MM/YYYY format (e.g., "25/08/2025 7:43:32 PM")
        else if (item.docExpdate.includes("/")) {
          const parts = item.docExpdate.split(" ")[0].split("/");
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0");
            const month = parts[1].padStart(2, "0");
            const year = parts[2];
            expiryDate = `${year}-${month}-${day}`;
          }
        }
        // If it's already in YYYY-MM-DD format, extract just the date part
        else if (item.docExpdate.includes("-")) {
          // Extract just the date part (YYYY-MM-DD) from YYYY-MM-DD HH:MM:SS
          expiryDate = item.docExpdate.split(" ")[0];
        }
        // Handle other date formats by trying to parse them
        else {
          const date = new Date(item.docExpdate);
          if (!isNaN(date.getTime())) {
            expiryDate = date.toISOString().split("T")[0];
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
    if (dateStr.includes("T") || dateStr.includes("Z")) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    // Handle "30/09/2025 12:00:00 AM" format
    if (dateStr.includes("/")) {
      const [day, month, yearAndTime] = dateStr.split("/");
      const [year] = yearAndTime.split(" ");
      // Return in YYYY-MM-DD format
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // If it's already in YYYY-MM-DD format, return as is
    if (dateStr.includes("-")) {
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
    console.log(item, "item in add to cart");

    // Create cart item based on whether specific batches are selected
    const amount = Number(item.Qty) * Number(item.Price);
    const hasSpecificBatches =
      item.selectedBatches && item.selectedBatches.transferType === "specific";

    // Prepare batch data for storage in database fields
    let recQtyFields = {
      recQty1: 0,
      recQty2: 0,
      recQty3: 0,
      recQty4: 0,
      recQty5: 0,
    };
    let ordMemoFields = {
      ordMemo1: "fefo",
      ordMemo2: "",
      ordMemo3: "0",
      ordMemo4: "",
    };
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
      ordMemoFields.ordMemo2 = batchDetails
        .map((b) => `${b.batchNo}:${b.quantity}`)
        .join(",");
      ordMemoFields.ordMemo3 = noBatchTransferQty?.toString() || "0";
      ordMemoFields.ordMemo4 = batchDetails
        .map((b) => `${b.expDate}:${b.quantity}`)
        .join(",");
    }

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
      transferType: hasSpecificBatches ? "specific" : "fefo",
      batchDetails: hasSpecificBatches
        ? {
            batchNo: item.selectedBatches.batchNo,
            expDate: item.selectedBatches.expDate,
            batchTransferQty: item.selectedBatches.batchTransferQty,
            noBatchTransferQty: item.selectedBatches.noBatchTransferQty,
            totalTransferQty: item.selectedBatches.totalTransferQty,
            individualBatches: item.selectedBatches.batchDetails || [],
          }
        : null,
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
        const processedItem = processedDetails[i];
        
        if (!stktrnRecord.id) {
          console.warn(`No Stktrns ID found for item ${stktrnRecord.itemcode}, skipping Stktrnbatches creation`);
          continue;
        }

        let batchDetails = [];

        // Get batch details based on transfer type
        if (processedItem?.transferType === "specific" && processedItem?.batchDetails?.individualBatches?.length > 0) {
          // Specific batch transfer
          batchDetails = processedItem.batchDetails.individualBatches;
        } else if (processedItem?.transferType === "fefo" && processedItem?.fefoBatches?.length > 0) {
          // FEFO transfer
          batchDetails = processedItem.fefoBatches;
        }

        // Create Stktrnbatches records for each batch
        for (const batch of batchDetails) {
          const stktrnbatchesPayload = {
            batchNo: batch.batchNo || "No Batch", // Use "No Batch" string for Stktrnbatches API
            stkTrnId: stktrnRecord.id,
            batchQty: type === "source" ? -batch.quantity : batch.quantity // Negative for source, positive for destination
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
      trnPost: `${today.toISOString().split("T")[0]} ${timeStr.slice(0,2)}:${timeStr.slice(2,4)}:${timeStr.slice(4,6)}`,
      trnDate: item.docExpdate || null,
      trnNo: null,
      postTime: timeStr,
      aperiod: null,
      itemcode: item.itemcode + "0000",
      storeNo: storeNo,
      tstoreNo: tstoreNo,
      fstoreNo: fstoreNo,
      trnDocno: docNo,
      trnType: "TFRT",
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
        (item?.transferType === "specific" && item?.batchDetails?.individualBatches?.length > 0 ?
          item.batchDetails.individualBatches.map(batch => batch.batchNo).join(',') :
          item?.transferType === "fefo" && item?.fefoBatches?.length > 0 ?
            item.fefoBatches.map(batch => batch.batchNo || "No Batch").join(',') : // Actual FEFO batch numbers
            item?.docBatchNo || 
            null) : null,
      movType: "TFR",
      itemBatchCost: item.itemprice,
      stockIn: null,
      transPackageLineNo: null,
      // Only set docExpdate if batch functionality is enabled and we have a valid date
      docExpdate:
        getConfigValue('EXPIRY_DATE') === "Yes" ? item.docExpdate : null,
    };
  };

  const onSubmit = async (e, type) => {
    e?.preventDefault();

    // Debug: Log the values to understand what's happening
    console.log("🔍 onSubmit debug:", {
      docStatus: stockHdrs.docStatus,
      docStatusType: typeof stockHdrs.docStatus,
      isSettingPostedChangePrice: userDetails?.isSettingPostedChangePrice,
      isSettingPostedChangePriceType:
        typeof userDetails?.isSettingPostedChangePrice,
      userDetails: userDetails,
      type: type,
      urlStatus: urlStatus,
      urlStatusType: typeof urlStatus,
    });

    // NEW: Handle posted document editing - Check at the very beginning
    // Use both urlStatus and stockHdrs.docStatus for better detection
    const isPostedDocument =
      stockHdrs.docStatus === "7" ||
      stockHdrs.docStatus === 7 ||
      urlStatus === "7";

    if (
      isPostedDocument &&
      userDetails?.isSettingPostedChangePrice === "True"
    ) {
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
          createDate: stockHdrs.createDate, // Keep original
        };

        console.log("x1");
        // Update header
        await editPostedStockHdrs(headerData);

        // Update details
        await editPostedStockDetails(details);

        // Update Stktrns
        await editPostedStktrns(details, docNo);

        // Only update ItemBatches if quantities have changed
        const hasQuantityChanges = details.some((item) => {
          // Check if this item has a docId (existing item) and if quantities differ
          if (item.docId) {
            const originalItem = cartData.find(
              (original) => original.docId === item.docId
            );
            return (
              originalItem &&
              Number(originalItem.docQty) !== Number(item.docQty)
            );
          }
          return false; // New items don't need batch updates
        });

        if (hasQuantityChanges) {
          console.log("🔄 Quantities changed, updating ItemBatches...");
          await editPostedItemBatches(details);
        } else {
          console.log(
            "✅ No quantity changes detected, skipping ItemBatches update"
          );
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
        
        // Pre-calculate FEFO batches for all items
        const processedDetails = await Promise.all(
          details.map(async (item) => await calculateFefoBatches(item))
        );
        
        const stktrns = processedDetails.map((item) =>
          createTransactionObject(
            item,
            docNo,
            stockHdrs.fstoreNo, // storeNo (destination)
            stockHdrs.fstoreNo, // fstoreNo (source)
            stockHdrs.tstoreNo, // tstoreNo (again destination)
            -1 // positive qty
          )
        );

        const stktrns1 = processedDetails.map((item) =>
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
        if (getConfigValue('BATCH_SNO') === "Yes") {
          try {
            await apiService1.get(
              `api/SaveOutItemBatchSno?formName=GRNOut&docNo=${docNo}&siteCode=${stktrns[0].fstoreNo}&userCode=${userDetails.username}`
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

          // 6) Loop through each line to fetch ItemOnQties and update trnBal* fields in Details
        // SOURCE STORE: Always process regardless of AUTO_POST setting
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
            await createStktrnbatchesRecords(stktrns, processedDetails, "destination");

  

            // 10) Update ItemBatches quantity with separate "No Batch" handling
            for (const d of stktrns) {
              const trimmedItemCode = d.itemcode.replace(/0000$/, "");

              if (getConfigValue('BATCH_NO') === "Yes") {
                // Find the corresponding cart item to check if it's a specific batch transfer
                const cartItem = cartData.find(
                  (item) =>
                    item.itemcode === trimmedItemCode &&
                    item.docUom === d.itemUom
                );

                if (
                  cartItem &&
                  cartItem.transferType === "specific" &&
                  cartItem.batchDetails
                ) {
                  // This item has specific batch selection - handle source store only
                  console.log(
                    `🔄 Processing source specific batch transfer for ${trimmedItemCode}`
                  );
                  await handleSourceSpecificBatchTransfer(
                    d,
                    trimmedItemCode,
                    cartItem
                  );
                } else {
                  // Regular FEFO batch transfer - handle source store (stktrns loop)
                  await handleSourceFefoTransfer(
                    d,
                    trimmedItemCode,
                    cartItem?.docQty || d.trnQty
                  );
                }
              } else {
                // No batch functionality - update Itemonqties only
                const batchUpdate = {
                  itemcode: trimmedItemCode,
                  sitecode: d.storeNo,
                  uom: d.itemUom,
                  qty: Number(d.trnQty),
                  batchcost: 0,
                };

                await apiService
                  .post(`ItemBatches/updateqty`, batchUpdate)
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

          // 3. Email Notification
          if (getConfigValue("NOTIFICATION_MAIL_SEND") === "Yes") {
            const printList = await apiService.get(
              `Stkprintlists?filter={"where":{"docNo":"${docNo}"}}`
            );

            if (printList && printList.length > 0) {
              const emailData = {
                to: getConfigValue("NOTIFICATION_MAIL1"),
                cc: getConfigValue("NOTIFICATION_MAIL2"),
                subject: "NOTIFICATION FOR STOCK TRANSFER",
                body: generateEmailBody(printList[0], details),
              };

              await apiService.post("EmailService/send", emailData);
            }
          }

  

          if (getConfigValue('AUTO_POST') === "Yes") {
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
                `Itemonqties?filter=${encodeURIComponent(
                  JSON.stringify(filter)
                )}`
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
              await createStktrnbatchesRecords(stktrns1, processedDetails, "source");

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

                if (getConfigValue('BATCH_NO') === "Yes") {
                  // Find the corresponding cart item to check if it's a specific batch transfer
                  const cartItem = cartData.find(
                    (item) =>
                      item.itemcode === trimmedItemCode &&
                      item.docUom === d.itemUom
                  );

                  // Validate cart item exists
                  if (!cartItem) {
                    console.error(`❌ Cart item not found for ${trimmedItemCode} in AUTO_POST section`);
                    continue; // Skip this item
                  }

                  if (cartItem.transferType === "specific") {
                    // This item has specific batch selection - handle destination store only
                    console.log(
                      `🔄 Processing destination specific batch transfer for ${trimmedItemCode}`
                    );
                    
                    // Reconstruct batch details if missing (for AUTO_POST scenarios)
                    let cartItemWithBatchDetails = cartItem;
                    if (!cartItem.batchDetails && cartItem.ordMemo2) {
                      try {
                        // Parse batch breakdown from ordMemo2
                        const batchBreakdown = cartItem.ordMemo2.split(",").map((batch) => {
                          const [batchNo, quantity] = batch.split(":");
                          return { 
                            batchNo, 
                            quantity: Number(quantity),
                            expDate: null, // Will be fetched from API if needed
                            batchCost: 0
                          };
                        }).filter(b => b.batchNo && !isNaN(b.quantity));
                        
                        cartItemWithBatchDetails = {
                          ...cartItem,
                          batchDetails: batchBreakdown
                        };
                        console.log(`✅ Reconstructed batch details for ${trimmedItemCode}:`, batchBreakdown);
                      } catch (error) {
                        console.error(`❌ Failed to reconstruct batch details for ${trimmedItemCode}:`, error);
                        continue; // Skip this item
                      }
                    }
                    
                    if (cartItemWithBatchDetails.batchDetails) {
                      await handleDestinationSpecificBatchTransfer(
                        d,
                        trimmedItemCode,
                        cartItemWithBatchDetails
                      );
                    } else {
                      console.error(`❌ No batch details available for specific batch transfer: ${trimmedItemCode}`);
                    }
                } else {
                  // Regular FEFO batch transfer - handle destination store
                  // For FEFO, we need to handle each batch separately

                  // For AUTO_POST, we need to reconstruct the FEFO batches that were used in the source store
                  let fefoBatches = cartItem.fefoBatches;
                  if (!fefoBatches || fefoBatches.length === 0) {
                    try {
                      // For AUTO_POST, reconstruct FEFO batches from the transaction data
                      // The source store has already been updated, so we need to reverse-engineer what was transferred
                      console.log(`🔄 Reconstructing FEFO batches for AUTO_POST from transaction data: ${trimmedItemCode}`);
                      
                      // Get the original FEFO batches that were used in the source store
                      // We can reconstruct this from the stktrnbatches records or from the original calculation
                      
                      // Method 1: Try to get from processedDetails if available
                      const processedItem = processedDetails.find(item => 
                        item.itemcode === trimmedItemCode && item.docUom === d.itemUom
                      );
                      
                      if (processedItem && processedItem.fefoBatches) {
                        fefoBatches = processedItem.fefoBatches;
                        console.log(`✅ Found FEFO batches in processedDetails for ${trimmedItemCode}:`, fefoBatches);
                      } else {
                        // Method 2: Reconstruct from the total quantity - create a single batch entry
                        // This is a fallback when we can't determine the exact FEFO breakdown
                        console.log(`⚠️ Using fallback: treating ${d.trnQty} as single batch for ${trimmedItemCode}`);
                        fefoBatches = [{
                          batchNo: "FEFO_FALLBACK", // Special marker
                          quantity: Number(d.trnQty),
                          expDate: null,
                          batchCost: d.itemBatchCost || 0
                        }];
                      }
                    } catch (error) {
                      console.error(`❌ Failed to reconstruct FEFO batches for ${trimmedItemCode}:`, error);
                      // Fallback to single batch
                      fefoBatches = [{
                        batchNo: "FEFO_FALLBACK",
                        quantity: Number(d.trnQty),
                        expDate: null,
                        batchCost: d.itemBatchCost || 0
                      }];
                    }
                  }
                  
                  if (fefoBatches && fefoBatches.length > 0) {
                    // Handle FEFO batches for destination store - similar to handleSourceFefoTransfer pattern
                    console.log(`🔄 Processing ${fefoBatches.length} FEFO batches for destination store:`, fefoBatches);

                    for (const fefoBatch of fefoBatches) {
                      if (fefoBatch.batchNo === "" || fefoBatch.batchNo === "FEFO_FALLBACK") {
                        // Handle "No Batch" or FEFO fallback in destination store
                        const noBatchDestUpdate = {
                          itemcode: trimmedItemCode,
                          sitecode: stockHdrs.tstoreNo, // Destination store
                          uom: d.itemUom,
                          qty: fefoBatch.quantity, // Individual batch quantity
                          batchcost: 0,
                          // No batchNo key for "No Batch" or FEFO fallback
                        };

                        await apiService.post(`ItemBatches/updateqty`, noBatchDestUpdate).catch(async (err) => {
                          console.error(`Error updating destination "No Batch":`, err);
                        });

                        console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${fefoBatch.quantity} qty`);
                      } else {
                        // Handle specific batch in destination store
                        // First, check if the specific batch exists in destination store
                        const specificBatchFilter = {
                          where: {
                            and: [
                              { itemCode: trimmedItemCode },
                              { uom: d.itemUom },
                              { siteCode: stockHdrs.tstoreNo },
                              { batchNo: fefoBatch.batchNo }, // Filter by specific batch
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
                            siteCode: stockHdrs.tstoreNo, // Destination store
                            uom: d.itemUom,
                            qty: fefoBatch.quantity, // Individual batch quantity
                            batchCost: fefoBatch.batchCost || 0,
                            batchNo: fefoBatch.batchNo,
                            expDate: fefoBatch.expDate,
                          };

                          await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
                            console.error(`Error creating destination batch ${fefoBatch.batchNo}:`, err);
                          });

                          console.log(`✅ Created new batch ${fefoBatch.batchNo} in destination store ${stockHdrs.tstoreNo} with ${fefoBatch.quantity} qty`);
                        } else {
                          // Update existing batch in destination store
                          const batchUpdate = {
                            itemcode: trimmedItemCode,
                            sitecode: stockHdrs.tstoreNo, // Destination store
                            uom: d.itemUom,
                            qty: fefoBatch.quantity, // Individual batch quantity
                            batchcost: 0,
                            batchno: fefoBatch.batchNo,
                          };

                          await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
                            console.error(`Error updating destination batch ${fefoBatch.batchNo}:`, err);
                          });

                          console.log(`✅ Updated existing batch ${fefoBatch.batchNo} in destination store ${stockHdrs.tstoreNo} by ${fefoBatch.quantity} qty`);
                        }
                      }
                    }
                  } else {
                    // Fallback: treat as no-batch transfer
                    console.log(`🔄 No FEFO batches found, treating as no-batch transfer for ${trimmedItemCode}`);
                    
                    const noBatchDestUpdate = {
                      itemcode: trimmedItemCode,
                      sitecode: stockHdrs.tstoreNo, // Destination store
                      uom: d.itemUom,
                      qty: Number(d.trnQty), // Total quantity
                      batchcost: 0,
                      // No batchNo key for "No Batch"
                    };

                    await apiService.post(`ItemBatches/updateqty`, noBatchDestUpdate).catch(async (err) => {
                      console.error(`Error updating destination "No Batch":`, err);
                    });

                    console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${d.trnQty} qty`);
                  }
                }
                } else {
                  // No batch functionality - handle destination store
                  const batchUpdate = {
                    itemcode: trimmedItemCode,
                    sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
                    uom: d.itemUom,
                    qty: Number(d.trnQty), // Positive for destination
                    batchcost: 0,
                  };

                  await apiService
                    .post(`ItemBatches/updateqty`, batchUpdate)
                    .catch(async (err) => {
                      console.error(`Failed to update ItemBatches for ${trimmedItemCode}:`, err);
                      const errorLog = {
                        trnDocNo: docNo,
                        itemCode: d.itemcode,
                        loginUser: userDetails.username,
                        siteCode: userDetails.siteCode,
                        logMsg: `ItemBatches/updateqty ${err.message}`,
                        createdDate: new Date().toISOString().split("T")[0],
                      };
                      // Show user-friendly error message
                      toast.error(`Failed to update stock for item ${trimmedItemCode}. Please check inventory manually.`);
                    });
                }
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

          if (getConfigValue('BATCH_SNO') === "Yes") {
            try {
              await apiService1.get(
                `api/postOutItemBatchSno?formName=GRNOut&docNo=${docNo}&siteCode=${userDetails.siteCode}&userCode=${userDetails.username}`
              );
            } catch (err) {
                        const errorLog = {
                          trnDocNo: docNo,
                          loginUser: userDetails.username,
                          siteCode: userDetails.siteCode,
                logMsg: `api/postOutItemBatchSno error: ${err.message}`,
                          createdDate: new Date().toISOString().split("T")[0],
                        };
              // Optionally log the error
                        // await apiService.post("Inventorylogs", errorLog);
            }
          }

  

          // 11) Final header status update to 7 - Only after all operations are complete
          await apiService.post(
            `StkMovdocHdrs/update?[where][docNo]=${docNo}`,
            {
              docStatus: "7",
            }
          );

    
      }

      toast.success(
        type === "post"
          ? "Posted successfully"
          : urlDocNo
          ? "Updated successfully"
          : "Created successfully"
      );
      navigate("/goods-transfer-out?tab=all");
    } catch (err) {
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

      const res = await apiService.post(
        `StkMovdocHdrs/update?[where][docNo]=${data.docNo}`,
        data
      );
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
      const itemsToUpdate = details.filter(
        (item) => item.docId && item.docId !== "" && item.docId !== null
      );

      if (itemsToUpdate.length === 0) {
        console.log("No existing items to update");
        return true;
      }

      // Process each item for update
      await Promise.all(
        itemsToUpdate.map(async (item) => {
          try {
            // Update StkMovdocDtls - For posted docs, only allow editing price-related fields and remarks
            await apiService.post(
              `StkMovdocDtls/update?[where][docId]=${item.docId}`,
              {
                docPrice: item.docPrice, // ALLOW EDITING - This is the main field that can be changed
                docAmt: item.docAmt, // This will be recalculated based on new price
                itemRemark: item.itemRemark, // ALLOW EDITING - Remarks can be changed for posted docs
                // Keep all other fields as original values - they should not be changed for posted docs
              }
            );

            console.log(`Updated StkMovdocDtls for docId: ${item.docId}`);
          } catch (error) {
            console.error(
              `Failed to update Stktrns for docId ${item.docId}:`,
              error
            );
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
                  { itemcode: item.itemcode + "0000" },
                ],
              },
            };

            const originalStktrn = await apiService.get(
              `Stktrns?filter=${encodeURIComponent(
                JSON.stringify(originalStktrnFilter)
              )}`
            );

            // 2. Get CURRENT balance from ItemOnQties for source store
            const currentBalanceFilter = {
              where: {
                and: [
                  { itemcode: item.itemcode + "0000" },
                  { uom: item.docUom },
                  { sitecode: stockHdrs.fstoreNo }, // Source store
                ],
              },
            };

            console.log(
              `🔍 ItemOnQties filter for source store:`,
              currentBalanceFilter
            );

            let newBalQty, newBalCost, itemBatchCost;

            try {
              const url = `Itemonqties?filter=${encodeURIComponent(
                JSON.stringify(currentBalanceFilter)
              )}`;
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
                  newBalQty =
                    Number(currentBalance.trnBalqty) -
                    Number(original.trnQty) +
                    Number(item.docQty);
                  newBalCost =
                    Number(currentBalance.trnBalcst) -
                    Number(original.trnAmt) +
                    Number(item.docAmt);

                  console.log(`🔍 Balance calculation:`, {
                    currentQty: currentBalance.trnBalqty,
                    currentCost: currentBalance.trnBalcst,
                    originalQty: original.trnQty,
                    originalCost: original.trnAmt,
                    newQty: item.docQty,
                    newCost: item.docAmt,
                    newBalQty: newBalQty,
                    newBalCost: newBalCost,
                  });
                } else {
                  console.log(
                    `🔍 No original Stktrns found, using current balance + new values`
                  );
                  newBalQty =
                    Number(currentBalance.trnBalqty) + Number(item.docQty);
                  newBalCost =
                    Number(currentBalance.trnBalcst) + Number(item.docAmt);
                }

                itemBatchCost = (item.batchCost || item.docPrice).toString();
              } else {
                console.log(
                  `🔍 No ItemOnQties records found for item ${item.itemcode}`
                );
                // Fallback: use new values directly
                newBalQty = Number(item.docQty);
                newBalCost = Number(item.docAmt);
                itemBatchCost = item.batchCost;
              }
            } catch (error) {
              console.error(
                `Error fetching Itemonqties for ${item.itemcode}:`,
                error
              );
              // Fallback: use new values directly
              newBalQty = Number(item.docQty);
              newBalCost = Number(item.docAmt);
              itemBatchCost = item.batchCost;
            }

            if (originalStktrn && originalStktrn.length > 0) {
              console.log(
                `🔄 Found existing Stktrns for item ${item.itemcode}, updating...`
              );

              // Update existing Stktrns record with corrected balance calculations
              const stktrnsUpdate = {
                trnQty: item.docQty, // New quantity
                trnAmt: item.docAmt, // New amount
                trnCost: item.docAmt, // New cost
                trnBalqty: newBalQty, // ✅ Corrected balance quantity
                trnBalcst: newBalCost, // ✅ Corrected balance cost
              };

              const whereClause = {
                trnDocno: docNo,
                storeNo: stockHdrs.fstoreNo, // Source store
                itemcode: item.itemcode + "0000",
              };

              await apiService.post(
                `Stktrns/update?where=${encodeURIComponent(
                  JSON.stringify(whereClause)
                )}`,
                stktrnsUpdate
              );

              console.log(
                `Updated Stktrns for item: ${item.itemcode} with corrected balances`
              );
            } else {
              console.log(
                `🆕 No existing Stktrns found for item ${item.itemcode}, creating new...`
              );

              // Insert new Stktrns record if doesn't exist
              const today = new Date();
              const timeStr =
                ("0" + today.getHours()).slice(-2) +
                ("0" + today.getMinutes()).slice(-2) +
                ("0" + today.getSeconds()).slice(-2);

              const newStktrns = {
                id: null,
                trnPost: `${today.toISOString().split("T")[0]} ${timeStr.slice(0,2)}:${timeStr.slice(2,4)}:${timeStr.slice(4,6)}`,
                trnNo: null,
                trnDate: stockHdrs.docDate,
                postTime: timeStr,
                aperiod: null,
                itemcode: item.itemcode + "0000",
                storeNo: stockHdrs.fstoreNo, // Source store
                tstoreNo: stockHdrs.tstoreNo, // Destination store
                fstoreNo: stockHdrs.fstoreNo, // Source store
                trnDocno: docNo,
                trnType: "TFRT",
                trnDbQty: null,
                trnCrQty: null,
                trnQty: item.docQty,
                trnBalqty: newBalQty, // ✅ Corrected balance quantity
                trnBalcst: newBalCost, // ✅ Corrected balance cost
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
                docExpdate: item.docExpdate,
              };

              await apiService.post("Stktrns", newStktrns);
              console.log(
                `Inserted new Stktrns for item: ${item.itemcode} with corrected balances`
              );
            }

            // ItemBatches update will be handled separately in editPostedItemBatches function
          } catch (error) {
            console.error(
              `Failed to process Stktrns for item ${item.itemcode}:`,
              error
            );
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
              console.log(
                `Processing ItemBatch update with BATCH_NO=Yes for ${item.itemcode}`
              );

              const specificBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: stockHdrs.fstoreNo }, // Source store
                    { uom: item.docUom },
                    { batchNo: item.docBatchNo || "" },
                  ],
                },
              };

              try {
                const existingBatch = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(
                    JSON.stringify(specificBatchFilter)
                  )}`
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
                    batchCost: batchRecord.batchCost, // Keep original batch cost (static)
                  };

                  await apiService.patch(
                    `ItemBatches/${batchRecord.id}`,
                    batchUpdate
                  );
                  console.log(
                    `Updated ItemBatches for ${item.itemcode}, batch ${item.docBatchNo}: batchCost remains static at ${batchRecord.batchCost}`
                  );
                } else {
                  console.log(
                    `No existing batch found for item ${item.itemcode} with batch number ${item.docBatchNo}`
                  );
                }
              } catch (error) {
                console.error(
                  `Error updating ItemBatches for item ${item.itemcode}:`,
                  error
                );
                // Don't throw error here - batch cost update is not critical for the main operation
              }
            } else {
              // WITHOUT BATCH NUMBERS: Update single batch record
              console.log(
                `Processing ItemBatch update with BATCH_NO=No for ${item.itemcode}`
              );

              const singleBatchFilter = {
                where: {
                  and: [
                    { itemCode: trimmedItemCode },
                    { siteCode: stockHdrs.fstoreNo }, // Source store
                    { uom: item.docUom },
                  ],
                },
              };

              try {
                const existingBatch = await apiService.get(
                  `ItemBatches?filter=${encodeURIComponent(
                    JSON.stringify(singleBatchFilter)
                  )}`
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
                    batchCost: batchRecord.batchCost, // Keep original batch cost (static)
                  };

                  await apiService.patch(
                    `ItemBatches/${batchRecord.id}`,
                    batchUpdate
                  );
                  console.log(
                    `Updated ItemBatches for ${item.itemcode}: batchCost remains static at ${batchRecord.batchCost}`
                  );
                } else {
                  console.log(
                    `No existing batch found for item: ${item.itemcode}, skipping batch cost update`
                  );
                }
              } catch (error) {
                console.error(
                  `Error updating ItemBatches for item ${item.itemcode}:`,
                  error
                );
                // Don't throw error here - batch cost update is not critical for the main operation
              }
            }
          } catch (error) {
            console.error(
              `Failed to process ItemBatches for item ${item.itemcode}:`,
              error
            );
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

  // NEW: Batch management functions for GTO
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
      // Fetch ItemBatches for this item from the current store (source)
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode },
            { siteCode: stockHdrs.fstoreNo }, // Current store (source)
            { uom: item.uom },
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
      const transferQty = Number(item.Qty);

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
        scenarioMessage,
      });

      setBatchBreakdown(sortedBatches);
      setTransferSpecificBatch(true);
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
    if (!selectedBatchData) return;

    // For GTO, batch selection only stores the selection, doesn't add to cart
    // User must still click + icon to add to cart
    const transferQty = Number(editData?.Qty || 0);

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
      }));

      const totalBatchQty = batchDetails.reduce(
        (sum, b) => sum + b.quantity,
        0
      );
      const noBatchTransferQty =
        selectedBatchData.noBatchQty ||
        Math.max(0, transferQty - totalBatchQty);

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
                  transferType: "specific", // Mark as specific batch transfer
                  batchDetails: batchDetails, // Store individual batch details
                },
              }
            : stockItem
        )
      );

      const message =
        noBatchTransferQty > 0
          ? `Multiple batches selected: ${batchDetails
              .map((b) => `${b.batchNo}(${b.quantity})`)
              .join(
                ", "
              )}. Balance ${noBatchTransferQty} will be taken from "No Batch". Now click + icon to add to cart.`
          : `Multiple batches selected: ${batchDetails
              .map((b) => `${b.batchNo}(${b.quantity})`)
              .join(", ")}. Now click + icon to add to cart.`;

      toast.success(message);
    } else {
      // Single batch selection (backward compatibility)
      const batchTransferQty = Math.min(
        transferQty,
        selectedBatchData.availableQty
      );
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
                  transferType: "specific", // Mark as specific batch transfer
                  batchDetails: [
                    {
                      batchNo: selectedBatchData.batchNo,
                      expDate: selectedBatchData.expDate,
                      quantity: batchTransferQty,
                    },
                  ],
                },
              }
            : stockItem
        )
      );

      const message =
        noBatchTransferQty > 0
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
              selectedBatches: null, // Remove batch selection
            }
          : stockItem
      )
    );
    toast.success("Batch selection removed");
  };

  // Helper function to handle source store specific batch transfers only
  const handleSourceSpecificBatchTransfer = async (
    stktrnItem,
    trimmedItemCode,
    cartItem
  ) => {
    if (!cartItem || !cartItem.batchDetails) {
      console.error("❌ No batch details found for source specific batch transfer");
      return;
    }

    console.log(
      `🔄 Processing source specific batch transfer for ${trimmedItemCode}`,
      cartItem.batchDetails.individualBatches
    );

    // Check if this is a "No Batch only" transfer
    const hasIndividualBatches =
      cartItem.batchDetails.individualBatches &&
      cartItem.batchDetails.individualBatches.length > 0;
    const hasNoBatchQty = cartItem.batchDetails.noBatchTransferQty > 0;

    if (!hasIndividualBatches && hasNoBatchQty) {
      // This is a "No Batch only" transfer - handle source store
      console.log(
        `🔄 Processing source "No Batch only" transfer: ${cartItem.batchDetails.noBatchTransferQty} qty`
      );
      const batchUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stktrnItem.fstoreNo, // Source store
        uom: stktrnItem.itemUom,
        qty: -cartItem.batchDetails.noBatchTransferQty, // Negative for source
        batchcost: 0,
      };
      await apiService.post(`ItemBatches/updateqty`, batchUpdate);
      return;
    }

    // Process each individual batch separately for source store
    if (hasIndividualBatches) {
      for (const batchDetail of cartItem.batchDetails.individualBatches) {
        console.log(
          `🔄 Processing source individual batch: ${batchDetail.batchNo} with qty: ${batchDetail.quantity}`
        );

        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stktrnItem.fstoreNo, // Source store
          uom: stktrnItem.itemUom,
          qty: -batchDetail.quantity, // Negative for source
          batchcost: 0,
          batchno: batchDetail.batchNo,
        };

        await apiService.post(`ItemBatches/updateqty`, batchUpdate);
      }
    }
  };

  // Helper function to handle destination store specific batch transfers only
  const handleDestinationSpecificBatchTransfer = async (
    stktrnItem,
    trimmedItemCode,
    cartItem
  ) => {
    if (!cartItem || !cartItem.batchDetails) {
      console.error("❌ No batch details found for destination specific batch transfer");
      return;
    }

    console.log(
      `🔄 Processing destination specific batch transfer for ${trimmedItemCode}`,
      cartItem.batchDetails.individualBatches
    );

    // Check if this is a "No Batch only" transfer
    const hasIndividualBatches =
      cartItem.batchDetails.individualBatches &&
      cartItem.batchDetails.individualBatches.length > 0;
    const hasNoBatchQty = cartItem.batchDetails.noBatchTransferQty > 0;

    if (!hasIndividualBatches && hasNoBatchQty) {
      // This is a "No Batch only" transfer - handle destination store
      console.log(
        `🔄 Processing destination "No Batch only" transfer: ${cartItem.batchDetails.noBatchTransferQty} qty`
      );
      const batchUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stktrnItem.storeNo, // Destination store
        uom: stktrnItem.itemUom,
        qty: cartItem.batchDetails.noBatchTransferQty, // Positive for destination
        batchcost: 0,
      };
      await apiService.post(`ItemBatches/updateqty`, batchUpdate);
      return;
    }

    // Process each individual batch separately for destination store
    if (hasIndividualBatches) {
      for (const batchDetail of cartItem.batchDetails.individualBatches) {
        console.log(
          `🔄 Processing destination individual batch: ${batchDetail.batchNo} with qty: ${batchDetail.quantity}`
        );

        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stktrnItem.storeNo, // Destination store
          uom: stktrnItem.itemUom,
          qty: batchDetail.quantity, // Positive for destination
          batchcost: 0,
          batchno: batchDetail.batchNo,
        };

        await apiService.post(`ItemBatches/updateqty`, batchUpdate);
      }
    }
  };

  // Helper function to handle multi-batch transfers (creates separate records for each batch)
  const handleMultiBatchTransfer = async (
    stktrnItem,
    trimmedItemCode,
    docNo,
    userDetails,
    cartItem
  ) => {
    if (!cartItem || !cartItem.batchDetails) {
      // Fallback to single batch transfer - handle both destination and source
      await handleDestinationBatchTransfer(
        stktrnItem,
        trimmedItemCode,
        stktrnItem.trnQty
      );
      await handleSourceBatchTransfer(
        stktrnItem,
        trimmedItemCode,
        stktrnItem.trnQty
      );
      return;
    }

    console.log(
      `🔄 Processing multi-batch transfer for ${trimmedItemCode}`,
      cartItem.batchDetails.individualBatches
    );

    // Check if this is a "No Batch only" transfer
    const hasIndividualBatches =
      cartItem.batchDetails.individualBatches &&
      cartItem.batchDetails.individualBatches.length > 0;
    const hasNoBatchQty = cartItem.batchDetails.noBatchTransferQty > 0;

    if (!hasIndividualBatches && hasNoBatchQty) {
      // This is a "No Batch only" transfer - handle it directly
      console.log(
        `🔄 Processing "No Batch only" transfer: ${cartItem.batchDetails.noBatchTransferQty} qty`
      );
      await handleNoBatchTransfer(
        stktrnItem,
        trimmedItemCode,
        cartItem,
        docNo,
        userDetails
      );
      return;
    }

    // Process each individual batch separately
    if (hasIndividualBatches) {
      for (const batchDetail of cartItem.batchDetails.individualBatches) {
        console.log(
          `🔄 Processing individual batch: ${batchDetail.batchNo} with qty: ${batchDetail.quantity}`
        );

        const individualStktrnItem = {
          ...stktrnItem,
          itemBatch: batchDetail.batchNo, // Use individual batch number
          trnQty: batchDetail.quantity, // Use individual quantity
          trnCost:
            (Number(stktrnItem.trnCost) / Number(stktrnItem.trnQty)) *
            batchDetail.quantity, // Proportional cost
          itemBatchCost: stktrnItem.itemBatchCost, // Keep original batch cost per unit
          docExpdate: batchDetail.expDate, // Use individual expiry date
        };

        console.log(
          `📤 Transferring batch ${batchDetail.batchNo}: ${batchDetail.quantity} qty from ${stockHdrs.fstoreNo} to ${stockHdrs.tstoreNo}`
        );
        // Handle destination store for this individual batch
        await handleDestinationBatchTransfer(
          individualStktrnItem,
          trimmedItemCode,
          batchDetail.quantity
        );
        
        // Handle source store for this individual batch
        await handleSourceBatchTransfer(
          individualStktrnItem,
          trimmedItemCode,
          batchDetail.quantity
        );
      }
    }

    // Handle "No Batch" transfer if needed (for mixed transfers)
    if (hasNoBatchQty) {
      await handleNoBatchTransfer(
        stktrnItem,
        trimmedItemCode,
        cartItem,
        docNo,
        userDetails
      );
    }
  };

  // Consolidated function to handle both source and destination batch updates efficiently
  const handleConsolidatedBatchTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    const qty = transferQty || Number(stktrnItem.trnQty);
    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";
    
    // Prepare batch updates for both source and destination stores
    const sourceUpdates = [];
    const destinationUpdates = [];
    
    if (isNoBatchTransfer) {
      // Handle "No Batch" transfers
      // Source store update (reduce quantity)
      sourceUpdates.push({
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.fstoreNo,
        uom: stktrnItem.itemUom,
        qty: -qty, // Negative to reduce
        batchcost: 0,
        // No batchno for "No Batch"
      });
      
      // Destination store update (add quantity)
      destinationUpdates.push({
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.tstoreNo,
        uom: stktrnItem.itemUom,
        qty: qty, // Positive to add
        batchcost: 0,
        // No batchno for "No Batch"
      });
    } else {
      // Handle specific batch transfers
      // Source store update (reduce quantity)
      sourceUpdates.push({
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.fstoreNo,
        uom: stktrnItem.itemUom,
        qty: -qty, // Negative to reduce
        batchcost: 0,
        batchno: stktrnItem.itemBatch,
      });
      
      // Destination store update (add quantity)
      destinationUpdates.push({
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.tstoreNo,
        uom: stktrnItem.itemUom,
        qty: qty, // Positive to add
        batchcost: 0,
        batchno: stktrnItem.itemBatch,
      });
    }
    
    // Execute source store updates in batch
    for (const update of sourceUpdates) {
      await apiService.post(`ItemBatches/updateqty`, update).catch(async (err) => {
        console.error(`Error updating source store for ${trimmedItemCode}:`, err);
      });
    }
    
    // Execute destination store updates in batch
    for (const update of destinationUpdates) {
      await apiService.post(`ItemBatches/updateqty`, update).catch(async (err) => {
        console.error(`Error updating destination store for ${trimmedItemCode}:`, err);
      });
    }
    
    console.log(`✅ Consolidated batch transfer completed for ${trimmedItemCode}`);
  };

  // Helper function to handle destination store batch operations (TO store) - ADD quantity
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
      // Handle "No Batch" transfer to destination store
      const noBatchDestUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
        uom: stktrnItem.itemUom,
        qty: qty, // Use validated quantity
        batchcost: 0,
        // No batchNo key for "No Batch" transfers
      };

      await apiService
        .post(`ItemBatches/updateqty`, noBatchDestUpdate)
        .catch(async (err) => {
          console.error(`Error updating "No Batch" for ${trimmedItemCode}:`, err);
        });
        
      console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
    } else {
      // Handle specific batch transfer to destination store
      // First, check if the specific batch exists in destination store
      const specificBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.tstoreNo },
            { batchNo: stktrnItem.itemBatch }, // Filter by specific batch
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
          siteCode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchCost: Number(stktrnItem.itemBatchCost) || 0,
          batchNo: stktrnItem.itemBatch,
          expDate: stktrnItem?.docExpdate ? stktrnItem?.docExpdate : null,
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Created new batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} with ${qty} qty`);
      } else {
        // Update existing batch in destination store (tstoreNo)
        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchcost: 0,
          batchno: stktrnItem.itemBatch,
        };

        await apiService
          .post(`ItemBatches/updateqty`, batchUpdate)
          .catch(async (err) => {
            console.error(`Error updating batch for ${trimmedItemCode}:`, err);
          });

        console.log(`✅ Updated existing batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
      }
    }
  };

  // Helper function to handle destination store FEFO batch operations (TO store) - ADD quantity
  const handleDestinationFefoTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 Destination FEFO Transfer: ${transferQty || stktrnItem.trnQty} qty for ${trimmedItemCode}`);
    
    // Validate required parameters
    if (!stktrnItem || !trimmedItemCode) {
      console.error("❌ Missing required parameters for destination FEFO transfer");
      return;
    }

    const qty = transferQty || Number(stktrnItem.trnQty);
    if (qty <= 0) {
      console.error(`❌ Invalid transfer quantity: ${qty}`);
      return;
    }

    // For FEFO destination transfers, we need to handle multiple batches
    // This function will be called multiple times for each batch from the source FEFO transfer
    // Each call represents one batch being transferred to destination
    
    // Check if this is a "No Batch" transfer
    const isNoBatchTransfer = !stktrnItem.itemBatch || stktrnItem.itemBatch.trim() === "";
    
    if (isNoBatchTransfer) {
      // Handle "No Batch" transfer to destination store
      const noBatchDestUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
        uom: stktrnItem.itemUom,
        qty: qty, // Use validated quantity
        batchcost: 0,
        // No batchNo key for "No Batch" transfers
      };

      await apiService
        .post(`ItemBatches/updateqty`, noBatchDestUpdate)
        .catch(async (err) => {
          console.error(`Error updating "No Batch" for ${trimmedItemCode}:`, err);
        });
        
      console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
    } else {
      // Handle specific batch transfer to destination store
      // First, check if the specific batch exists in destination store
      const specificBatchFilter = {
        where: {
          and: [
            { itemCode: trimmedItemCode },
            { uom: stktrnItem.itemUom },
            { siteCode: stockHdrs.tstoreNo },
            { batchNo: stktrnItem.itemBatch }, // Filter by specific batch
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
          siteCode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
          batchCost: Number(stktrnItem.itemBatchCost) || 0,
          batchNo: stktrnItem.itemBatch,
          expDate: stktrnItem?.docExpdate ? stktrnItem?.docExpdate : null,
        };

        await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
          console.error(`Error creating batch for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Created new FEFO batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} with ${qty} qty`);
      } else {
        // Update existing batch in destination store (tstoreNo)
        const batchUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
          uom: stktrnItem.itemUom,
          qty: qty, // Use validated quantity
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

  // Helper function to handle GTO FEFO transfer when BATCH_NO = "Yes"
  const handleGtoFefoTransfer = async (stktrnItem, trimmedItemCode, transferQty = null) => {
    console.log(`🔄 GTO FEFO Transfer: ${transferQty} qty for ${trimmedItemCode}`);
    
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

        // Now handle destination store updates for each transfer detail
        for (const detail of transferDetails) {
          if (detail.batchNo === "") {
            // Handle "No Batch" in destination store
            const noBatchDestUpdate = {
              itemcode: trimmedItemCode,
              sitecode: stockHdrs.tstoreNo, // Destination store
              uom: stktrnItem.itemUom,
              qty: detail.qty,
              batchcost: 0,
              // No batchNo key for "No Batch"
            };

            await apiService.post(`ItemBatches/updateqty`, noBatchDestUpdate).catch(async (err) => {
              console.error(`Error updating destination "No Batch":`, err);
            });

            console.log(`✅ Updated destination "No Batch" by ${detail.qty} qty`);
          } else {
            // Handle specific batch in destination store
            const destBatchFilter = {
              where: {
                and: [
                  { itemCode: trimmedItemCode },
                  { uom: stktrnItem.itemUom },
                  { siteCode: stockHdrs.tstoreNo }, // Destination store
                  { batchNo: detail.batchNo },
                ],
              },
            };

            const destUrl = `ItemBatches?filter=${encodeURIComponent(JSON.stringify(destBatchFilter))}`;
            let destExistingBatch = await apiService
              .get(destUrl)
              .then((resp) => resp[0])
              .catch((error) => {
                console.error("Error fetching destination batch:", error);
                return null;
              });

            if (!destExistingBatch) {
              // Create new batch in destination store
              const batchCreate = {
                itemCode: trimmedItemCode,
                siteCode: stockHdrs.tstoreNo,
                uom: stktrnItem.itemUom,
                qty: detail.qty,
                batchCost: detail.batchCost,
                batchNo: detail.batchNo,
                expDate: detail.expDate,
              };

              await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
                console.error(`Error creating destination batch ${detail.batchNo}:`, err);
              });

              console.log(`✅ Created new batch ${detail.batchNo} in destination store`);
            } else {
              // Update existing batch in destination store
              const batchUpdate = {
                itemcode: trimmedItemCode,
                sitecode: stockHdrs.tstoreNo,
                uom: stktrnItem.itemUom,
                qty: detail.qty,
                batchcost: 0,
                batchno: detail.batchNo,
              };

              await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
                console.error(`Error updating destination batch ${detail.batchNo}:`, err);
              });

              console.log(`✅ Updated existing batch ${detail.batchNo} in destination store`);
            }
          }
        }

        if (remainingQty > 0) {
          console.warn(`⚠️ Could not fulfill complete transfer. Remaining qty: ${remainingQty}`);
        }
      } else {
        console.error(`❌ No batches found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
      }
    } catch (error) {
      console.error(`Error in GTO FEFO transfer: ${error.message}`);
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

        // Now handle destination store updates for each transfer detail
        // NOTE: Destination store updates are handled separately in the AUTO_POST section
        // This function only handles source store operations

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

        // Now add to destination store "No Batch"
        const noBatchDestUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.tstoreNo, // Destination store
          uom: stktrnItem.itemUom,
          qty: qty, // POSITIVE to add quantity
          batchcost: 0,
          // No batchNo key for "No Batch" transfers
        };

        await apiService.post(`ItemBatches/updateqty`, noBatchDestUpdate).catch(async (err) => {
          console.error(`Error updating destination "No Batch" for ${trimmedItemCode}:`, err);
        });

        console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
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

      const specificBatchUrl = `ItemBatches?filter=${encodeURIComponent(
        JSON.stringify(specificBatchFilter)
      )}`;
      let specificBatch = await apiService
        .get(specificBatchUrl)
        .then((resp) => resp[0])
        .catch((error) => {
          console.error("Error fetching specific source batch:", error);
          return null;
        });

      if (specificBatch) {
        // Validate available quantity
        const availableQty = Number(specificBatch.qty);
        if (availableQty < qty) {
          console.error(`❌ Insufficient batch quantity. Available: ${availableQty}, Required: ${qty}`);
          return;
        }

        // Reduce quantity in source store by the transfer amount
        const sourceUpdate = {
          itemcode: trimmedItemCode,
          sitecode: stockHdrs.fstoreNo,
          uom: stktrnItem.itemUom,
          qty: -qty, // NEGATIVE to reduce quantity
          batchcost: 0,
          batchno: stktrnItem.itemBatch,
        };

        await apiService
          .post(`ItemBatches/updateqty`, sourceUpdate)
          .catch(async (err) => {
            console.error(
              `Error reducing source batch for ${trimmedItemCode}:`,
              err
            );
          });

        console.log(
          `✅ Reduced source store ${stockHdrs.fstoreNo} batch ${
            stktrnItem.itemBatch
          } by ${qty} qty`
        );

        // Now handle destination store for the same batch
        // First, check if the specific batch exists in destination store
        const destBatchFilter = {
          where: {
            and: [
              { itemCode: trimmedItemCode },
              { uom: stktrnItem.itemUom },
              { siteCode: stockHdrs.tstoreNo },
              { batchNo: stktrnItem.itemBatch }, // Same batch number
            ],
          },
        };

        const destBatchUrl = `ItemBatches?filter=${encodeURIComponent(
          JSON.stringify(destBatchFilter)
        )}`;
        let existingDestBatch = await apiService
          .get(destBatchUrl)
          .then((resp) => resp[0])
          .catch((error) => {
            console.error("Error fetching destination batch:", error);
            return null;
          });

        if (!existingDestBatch) {
          // Create new batch record in destination store
          const batchCreate = {
            itemCode: trimmedItemCode,
            siteCode: stockHdrs.tstoreNo, // Destination store
            uom: stktrnItem.itemUom,
            qty: qty,
            batchCost: specificBatch.batchCost || 0,
            batchNo: stktrnItem.itemBatch,
            expDate: specificBatch.expDate,
          };

          await apiService.post(`ItemBatches`, batchCreate).catch(async (err) => {
            console.error(`Error creating destination batch ${stktrnItem.itemBatch}:`, err);
          });

          console.log(`✅ Created new batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} with ${qty} qty`);
        } else {
          // Update existing batch in destination store
          const batchUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.tstoreNo, // Destination store
            uom: stktrnItem.itemUom,
            qty: qty,
            batchcost: 0,
            batchno: stktrnItem.itemBatch,
          };

          await apiService.post(`ItemBatches/updateqty`, batchUpdate).catch(async (err) => {
            console.error(`Error updating destination batch ${stktrnItem.itemBatch}:`, err);
          });

          console.log(`✅ Updated existing batch ${stktrnItem.itemBatch} in destination store ${stockHdrs.tstoreNo} by ${qty} qty`);
        }
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
          // Validate available quantity for fallback
          const availableQty = Number(noBatchRecord.qty);
          if (availableQty < qty) {
            console.error(`❌ Insufficient "No Batch" quantity for fallback. Available: ${availableQty}, Required: ${qty}`);
            return;
          }

          // Fallback to "No Batch" record
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

          console.log(`✅ Reduced source store ${stockHdrs.fstoreNo} "No Batch" by ${qty} qty (fallback)`);

          // Also add to destination store "No Batch"
          const noBatchDestUpdate = {
            itemcode: trimmedItemCode,
            sitecode: stockHdrs.tstoreNo, // Destination store
            uom: stktrnItem.itemUom,
            qty: qty, // POSITIVE to add quantity
            batchcost: 0,
            // No batchNo key for "No Batch" transfers
          };

          await apiService.post(`ItemBatches/updateqty`, noBatchDestUpdate).catch(async (err) => {
            console.error(`Error updating destination "No Batch" for ${trimmedItemCode}:`, err);
          });

          console.log(`✅ Updated "No Batch" in destination store ${stockHdrs.tstoreNo} by ${qty} qty (fallback)`);
        } else {
          console.error(`❌ No batch records found for item ${trimmedItemCode} in source store ${stockHdrs.fstoreNo}`);
        }
      }
    }
  };

  // Helper function to handle separate "No Batch" transfers for GTO
  const handleNoBatchTransfer = async (
    stktrnItem,
    trimmedItemCode,
    cartItem,
    docNo,
    userDetails
  ) => {
    const noBatchQty =
      cartItem.batchDetails?.noBatchTransferQty ||
      cartItem.noBatchTransferQty ||
      0;
    if (noBatchQty <= 0) {
      console.log("No 'No Batch' transfer needed");
      return;
    }

    // 1. Handle destination store (where items are being transferred TO) - use tstoreNo for GTO
    let existingNoBatch;
    const destFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: stktrnItem.itemUom },
          { siteCode: stockHdrs.tstoreNo }, // Use tstoreNo (destination store) for GTO
          { batchNo: "" }, // "No Batch" record
        ],
      },
    };

    const destUrl = `ItemBatches?filter=${encodeURIComponent(
      JSON.stringify(destFilter)
    )}`;
    existingNoBatch = await apiService
      .get(destUrl)
      .then((resp) => resp[0])
      .catch((error) => {
        console.error("Error fetching destination 'No Batch':", error);
        return null;
      });

    if (!existingNoBatch) {
      // Create new "No Batch" record in destination store (tstoreNo)
      const noBatchCreate = {
        itemCode: trimmedItemCode,
        siteCode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
        uom: stktrnItem.itemUom,
        qty: noBatchQty,
        batchCost: Number(stktrnItem.itemBatchCost),
        batchNo: "", // Empty string for "No Batch"
        expDate: null,
      };

      await apiService.post(`ItemBatches`, noBatchCreate).catch(async (err) => {
        console.error(`Error creating 'No Batch' for ${trimmedItemCode}:`, err);
      });
    } else {
      // Update existing "No Batch" record in destination store (tstoreNo)
      const noBatchUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.tstoreNo, // Use tstoreNo (destination store) for GTO
        uom: stktrnItem.itemUom,
        qty: noBatchQty,
        batchcost: 0,
        batchno: "", // Empty string for "No Batch"
      };

      await apiService
        .post(`ItemBatches/updateqty`, noBatchUpdate)
        .catch(async (err) => {
          console.error(
            `Error updating 'No Batch' for ${trimmedItemCode}:`,
            err
          );
        });
    }

    // 2. Handle source store (where items are being transferred FROM) - REDUCE "No Batch" quantity
    const sourceNoBatchFilter = {
      where: {
        and: [
          { itemCode: trimmedItemCode },
          { uom: stktrnItem.itemUom },
          { siteCode: stockHdrs.fstoreNo }, // Source store (current store)
          { batchNo: "" }, // "No Batch" record
        ],
      },
    };

    const sourceNoBatchUrl = `ItemBatches?filter=${encodeURIComponent(
      JSON.stringify(sourceNoBatchFilter)
    )}`;
    let sourceNoBatch = await apiService
      .get(sourceNoBatchUrl)
      .then((resp) => resp[0])
      .catch((error) => {
        console.error("Error fetching source 'No Batch':", error);
        return null;
      });

    if (sourceNoBatch) {
      // Reduce "No Batch" quantity in source store
      const sourceNoBatchUpdate = {
        itemcode: trimmedItemCode,
        sitecode: stockHdrs.fstoreNo,
        uom: stktrnItem.itemUom,
        qty: -noBatchQty, // NEGATIVE to reduce quantity
        batchcost: 0,
        batchno: "", // Empty string for "No Batch"
      };

      await apiService
        .post(`ItemBatches/updateqty`, sourceNoBatchUpdate)
        .catch(async (err) => {
          console.error(
            `Error reducing source 'No Batch' for ${trimmedItemCode}:`,
            err
          );
        });

      console.log(
        `✅ Reduced source store ${stockHdrs.fstoreNo} 'No Batch' by ${noBatchQty} qty`
      );
    } else {
      console.warn(
        `⚠️ Source 'No Batch' not found in store ${stockHdrs.fstoreNo}`
      );
    }
  };

  // NEW: Transfer Preview Modal for GTO
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const showTransferPreview = (item) => {
    setPreviewItem(item);
    setShowPreviewModal(true);
  };

  // Transfer Preview Modal Component
  const TransferPreviewModal = memo(
    ({ showPreviewModal, setShowPreviewModal, previewItem }) => {
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
                      <p>
                        <strong>Total Transfer Qty:</strong>{" "}
                        {previewItem.docQty}
                      </p>
                      <p>
                        <strong>Transfer Type:</strong> Specific Batches
                      </p>
                      <p>
                        <strong>From Store:</strong> {stockHdrs.fstoreNo}
                      </p>
                      <p>
                        <strong>To Store:</strong> {stockHdrs.tstoreNo}
                      </p>
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
                          <th className="text-left p-2 font-medium">
                            Batch No
                          </th>
                          <th className="text-right p-2 font-medium">
                            Quantity
                          </th>
                          <th className="text-left p-2 font-medium">
                            Expiry Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewItem.batchDetails.individualBatches?.map(
                          (batch, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 font-medium">
                                {batch.batchNo}
                              </td>
                              <td className="p-2 text-right">
                                {batch.quantity}
                              </td>
                              <td className="p-2 text-xs">
                                {batch.expDate
                                  ? format_Date(batch.expDate)
                                  : "No Expiry"}
                              </td>
                            </tr>
                          )
                        )}
                        {previewItem.batchDetails.noBatchTransferQty > 0 && (
                          <tr className="border-t bg-gray-50">
                            <td className="p-2 font-medium text-gray-600">
                              No Batch
                            </td>
                            <td className="p-2 text-right text-gray-600">
                              {previewItem.batchDetails.noBatchTransferQty}
                            </td>
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
                      Items will be transferred from {stockHdrs.fstoreNo} to{" "}
                      {stockHdrs.tstoreNo} using the selected batch quantities.
                      {previewItem.batchDetails?.noBatchTransferQty > 0 &&
                        ` Balance ${previewItem.batchDetails.noBatchTransferQty} will be taken from "No Batch" items.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
  );

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
                      showBatchColumns={true}
                      enableSorting={true}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                      onBatchSelection={(index, item) =>
                        handleRowBatchSelection(item, index)
                      }
                      onRemoveBatchSelection={handleRemoveBatchSelection}
                      isBatchLoading={false} // Global loading not needed
                      itemBatchLoading={itemBatchLoading} // Pass per-item loading state
                    />
                    {/* </div> */}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
          {cartData.length > 0 && (
            <div className="flex justify-end my-5">
              {selectedRows.length > 0 &&
                (urlStatus != 7 ||
                  (urlStatus == 7 &&
                    userDetails?.isSettingPostedChangePrice === "True")) && (
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
                    <TableHead>Transfer Type</TableHead>
                    <TableHead>Remarks</TableHead>
                    {urlStatus != 7 ||
                    (urlStatus == 7 &&
                      userDetails?.isSettingPostedChangePrice === "True") ? (
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
                            userDetails?.isSettingPostedChangePrice ===
                              "True") ? (
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
                          <TableCell>
                            {item.transferType === "specific" ? (
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
                          {urlStatus != 7 ||
                          (urlStatus == 7 &&
                            userDetails?.isSettingPostedChangePrice ===
                              "True") ? (
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
                        {userDetails?.isSettingViewPrice === "True" && (
                          <TableCell />
                        )}

                        {userDetails?.isSettingViewPrice === "True" && (
                          <TableCell className="font-semibold text-slate-700">
                            {calculateTotals(cartData).totalAmt.toFixed(2)}
                          </TableCell>
                        )}
                        <TableCell />
                        <TableCell />
                        {urlStatus != 7 ||
                        (urlStatus == 7 &&
                          userDetails?.isSettingPostedChangePrice ===
                            "True") ? (
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
      <BatchSelectionDialog
        showBatchDialog={showBatchDialog}
        setShowBatchDialog={setShowBatchDialog}
        batchBreakdown={batchBreakdown}
        transferQty={editData?.transferQty || editData?.docQty || 0}
        totalBatchQty={batchBreakdown.reduce(
          (sum, b) => (b.batchNo !== "" ? sum + b.availableQty : sum),
          0
        )}
        noBatchQty={batchBreakdown.reduce(
          (sum, b) => (b.batchNo === "" ? sum + b.availableQty : sum),
          0
        )}
        scenarioMessage={editData?.scenarioMessage || ""}
        onBatchSelectionSubmit={handleBatchSelectionSubmit}
        itemcode={editData?.itemcode}
        itemdesc={editData?.itemdesc}
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

export default AddGto;
