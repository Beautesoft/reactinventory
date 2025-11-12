import React, { useState, useEffect, memo, useCallback, useRef } from "react";
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
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import moment from "moment-timezone";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import { prApi } from "@/services/prApi";

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
      totalQty: acc.totalQty + Number(item.reqdQty || 0),
      totalFoc: acc.totalFoc + Number(item.reqdFocqty || 0),
      totalDisc: acc.totalDisc + Number(item.reqdDiscamt || 0),
      totalAmt: acc.totalAmt + Number(item.reqdAmt || 0),
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

// Batch Selection Dialog for PR (matching GTO style)
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
    approvalMode,
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
      if (showEditDialog && editData?.reqdItemcode) {
        setIsLoadingBatches(true);
        // Call getBatches when dialog opens
        const filter = {
          where: {
            itemCode: editData.reqdItemcode,
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

      // Check if editData exists
      if (!editData) {
        errors.push("No data to save");
        setValidationErrors(errors);
        return;
      }

      // Validate quantity
      if (!editData.reqdQty || editData.reqdQty <= 0) {
        errors.push("Quantity must be greater than 0");
      }

      // Validate price if user has permission
      if (userDetails?.isSettingViewPrice === "True") {
        if (!editData.reqdItemprice || editData.reqdItemprice <= 0) {
          errors.push("Price must be greater than 0");
        }
      }


      // Traditional batch validation (only if not using batch transfer mode)
      if (getConfigValue('BATCH_NO') === "Yes" && !userDetails?.manualBatchSelection) {
        if (!editData.docBatchNo || editData.docBatchNo.trim() === "") {
          errors.push("Batch number is required");
        }
        
        if (getConfigValue('EXPIRY_DATE') === "Yes" && !editData.docExpdate) {
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
            <div
              id="edit-item-description"
              className="text-sm text-muted-foreground"
            >
              {urlStatus == 7 &&
              !approvalMode &&
              userDetails?.isSettingPostedChangePrice === "True"
                ? "Only price can be modified for posted documents"
                : approvalMode && urlStatus == 7
                ? "Approval mode: All fields can be modified for posted documents"
                : "Modify item details"}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemcode">Item Code</Label>
                <Input
                  id="itemcode"
                  value={editData?.reqdItemcode || ""}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemdesc">Description</Label>
                <Input
                  id="itemdesc"
                  value={editData?.reqdItemdesc || ""}
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
                <Label htmlFor="qty">Requested Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  value={editData?.reqdQty || ""}
                  onChange={(e) => onEditCart(e, "reqdQty")}
                  min="0"
                  step="0.01"
                  disabled={(urlStatus == 7 && !isBatchEdit && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True") || (urlStatus == 7 && isBatchEdit && !approvalMode)}
                />
              </div>
              {userDetails?.isSettingViewPrice === "True" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                <Input
                    id="price"
                  type="number"
                    value={editData?.reqdItemprice || ""}
                    onChange={(e) => onEditCart(e, "reqdItemprice")}
                    min="0"
                    step="0.01"
                    disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="focqty">FOC Quantity</Label>
                <Input
                  id="focqty"
                  type="number"
                  value={editData?.reqdFocqty || ""}
                  onChange={(e) => onEditCart(e, "reqdFocqty")}
                  min="0"
                  step="0.01"
                  disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discper">Discount %</Label>
                <Input
                  id="discper"
                  type="number"
                  value={editData?.reqdDiscper || ""}
                  onChange={(e) => onEditCart(e, "reqdDiscper")}
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
                />
              </div>
              {/* Batch Transfer Mode Display (Read-only) */}
              {getConfigValue('BATCH_NO') === "Yes" && userDetails?.manualBatchSelection && (editData?.itemRemark1 || editData?.ordMemo1) && (
                <div className="space-y-2">
                  <Label>Batch Transfer Mode</Label>
                  <Input
                    value={(editData.itemRemark1 || editData.ordMemo1)?.startsWith("specific") ? "Specific Batches" : "FEFO (Auto-select)"}
                    disabled
                    className="bg-gray-50"
                  />
                  {(editData.itemRemark2 || editData.ordMemo2) && (
                    <p className="text-xs text-gray-500">
                      Selected batches: {editData.itemRemark2 || editData.ordMemo2}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Traditional Batch Number and Expiry Date Section (only when not using batch transfer mode) */}
            {getConfigValue('BATCH_NO') === "Yes" && !userDetails?.manualBatchSelection && (
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
                      disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
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
                        disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
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
                      disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
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
                    disabled={(urlStatus == 7 && !approvalMode) || (useExistingBatch && selectedBatch?.expDate)}
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
                  !approvalMode &&
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

function AddPR() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const urlStatus = searchParams.get("status") || 0;
  const approvalParam = searchParams.get("approval") === "1";

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
    movCode: "PR",
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

  // Check if user is HQ to set default supplier
  const isHQUser = userDetails?.siteCode?.includes('HQ');
  
  const [formData, setFormData] = useState({
    reqNo: "",
    itemsiteCode: userDetails?.siteCode || "",
    suppCode: isHQUser ? "" : "HQ", // Default to HQ for non-HQ users, empty for HQ users
    reqRef: "",
    reqUser: userDetails?.username || "",
    reqDate: moment().format("YYYY-MM-DD"),
    reqStatus: "Open",
    reqTtqty: 0,
    reqTtfoc: 0,
    reqTtdisc: 0,
    reqTtamt: 0,
    reqAttn: "",
    reqRemk1: "",
    reqRemk2: "",
    supplierName: isHQUser ? "" : "HQ Warehouse", // Default supplier name
    expectedDeliveryDate: "",
    // Billing Address
    reqBname: "",
    reqBaddr1: "",
    reqBaddr2: "",
    reqBaddr3: "",
    reqBpostcode: "",
    reqBstate: "",
    reqBcity: "",
    reqBcountry: "",
    // Delivery Address
    reqDaddr1: "",
    reqDaddr2: "",
    reqDaddr3: "",
    reqDpostcode: "",
    reqDstate: "",
    reqDcity: "",
    reqDcountry: "",
    // Additional fields from .NET backend
    reqCancelqty: 0,
    reqRecstatus: "",
    reqRecexpect: "",
    reqRecttl: 0,
    reqTime: moment().format("HH:mm:ss")
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

  // Add batch selection states
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchDialogData, setBatchDialogData] = useState(null);
  const [itemBatchLoading, setItemBatchLoading] = useState({});

  // Add preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Add approval state management
  const [approvalMode, setApprovalMode] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [stockValidationErrors, setStockValidationErrors] = useState([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [autoCreateTransfer, setAutoCreateTransfer] = useState(false);
  
  // Ref to track if we're loading PR data to prevent double supplier reload
  const isLoadingPRDataRef = useRef(false);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadPRData();
    } else {
      initializeData();
    }
  }, [id]);

  // Detect approval mode
  useEffect(() => {
    const isHQUser = userDetails?.siteCode?.includes('HQ');
    const isPostedStatus = formData.reqStatus === 'Posted';
    setApprovalMode(isHQUser && (isPostedStatus || approvalParam));
  }, [formData.reqStatus, userDetails, approvalParam]);

  // Reload suppliers when approval mode changes (for HQ users)
  // But skip if we're currently loading PR data (will be loaded after data is set)
  useEffect(() => {
    if (userDetails?.siteCode?.includes('HQ') && !isLoadingPRDataRef.current) {
      loadSuppliers();
    }
  }, [approvalMode]);

  // Ensure approvalLoading is reset when dialog opens
  useEffect(() => {
    if (showApprovalDialog) {
      // Always reset loading when dialog opens to ensure button is enabled
      setApprovalLoading(false);
    }
  }, [showApprovalDialog]);

  // Load suppliers and HQ options
  const loadSuppliers = async (overrideApprovalMode = null) => {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const isHQUser = userDetails?.siteCode?.includes('HQ');
      
      // Use override approval mode if provided, otherwise use state
      const currentApprovalMode = overrideApprovalMode !== null ? overrideApprovalMode : approvalMode;
      
      const res = await apiService.get("ItemSupplies");
      let options = res
        .filter((item) => item.splyCode)
        .map((item) => ({
          label: item.supplydesc,
          value: item.splyCode,
        }));
      
      // For HQ users in Purchase Requisition tab (not approval mode), exclude HQ Warehouse
      // For HQ users in approval mode, they can still see all suppliers including HQ (for viewing approved PRs)
      if (isHQUser && !currentApprovalMode) {
        // HQ user creating/editing PR - exclude HQ Warehouse option
        options = options.filter((item) => item.value !== "HQ");
      } else if (isHQUser && currentApprovalMode) {
        // HQ user in approval mode - show all suppliers including HQ (for viewing existing PRs)
        // Add HQ Warehouse option explicitly since it might not be in ItemSupplies
        const hqOption = { label: "HQ Warehouse", value: "HQ" };
        // Check if HQ already exists, if not add it
        const hasHQ = options.some(item => item.value === "HQ");
        if (!hasHQ) {
          options = [hqOption, ...options];
        }
      } else {
        // For non-HQ users, add HQ option
        const hqOption = { label: "HQ Warehouse", value: "HQ" };
        options = [hqOption, ...options];
      }
      console.log(options, "options", "approvalMode:", currentApprovalMode);
      setSupplyOptions(options);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };

  // Initialize data for new PR
  const initializeData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadSuppliers(),
        getOptions(),
      ]);
    } catch (err) {
      console.error("Error initializing data:", err);
      toast.error("Error initializing data");
    } finally {
      setPageLoading(false);
    }
  };


  // Load PR data for editing
  const loadPRData = async () => {
    setPageLoading(true);
    isLoadingPRDataRef.current = true; // Set flag to prevent double supplier reload
    try {
      const [pr, items] = await Promise.all([
        prApi.getPR(id),
        prApi.getPRLineItems(id)
      ]);

      // Determine approval mode based on PR data before loading suppliers
      const isHQUser = userDetails?.siteCode?.includes('HQ');
      const isPostedStatus = pr?.reqStatus === 'Posted';
      const currentApprovalMode = isHQUser && (isPostedStatus || approvalParam);

      // Load suppliers first with the correct approval mode
      // This ensures suppliers are ready when formData is set
      await Promise.all([
        loadSuppliers(currentApprovalMode), // Pass approval mode directly
        getOptions(),
      ]);
      
      // Set approval mode state after suppliers are loaded
      setApprovalMode(currentApprovalMode);

      // Now set formData - this will trigger approval mode useEffect but suppliers are already loaded
      if (pr) {
        setFormData({
          reqNo: pr.reqNo,
          itemsiteCode: pr.itemsiteCode,
          suppCode: pr.suppCode,
          reqRef: pr.reqRef,
          reqUser: pr.reqUser,
          reqDate: pr.reqDate ? moment(pr.reqDate).format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
          reqStatus: pr.reqStatus,
          reqTtqty: pr.reqTtqty,
          reqTtfoc: pr.reqTtfoc,
          reqTtdisc: pr.reqTtdisc,
          reqTtamt: pr.reqTtamt,
          reqAttn: pr.reqAttn,
          reqRemk1: pr.reqRemk1,
          reqRemk2: pr.reqRemk2,
          supplierName: pr.supplierName,
          // expectedDeliveryDate: pr.expectedDeliveryDate || "",
          // Billing Address
          reqBname: pr.reqBname,
          reqBaddr1: pr.reqBaddr1,
          reqBaddr2: pr.reqBaddr2,
          reqBaddr3: pr.reqBaddr3,
          reqBpostcode: pr.reqBpostcode,
          reqBstate: pr.reqBstate,
          reqBcity: pr.reqBcity,
          reqBcountry: pr.reqBcountry,
          // Delivery Address
          reqDaddr1: pr.reqDaddr1,
          reqDaddr2: pr.reqDaddr2,
          reqDaddr3: pr.reqDaddr3,
          reqDpostcode: pr.reqDpostcode,
          reqDstate: pr.reqDstate,
          reqDcity: pr.reqDcity,
          reqDcountry: pr.reqDcountry,
          // Additional fields from .NET backend
          reqCancelqty: pr.reqCancelqty || 0,
          reqRecstatus: pr.reqRecstatus || "",
          reqRecexpect: pr.reqRecexpect || "",
          reqRecttl: pr.reqRecttl || 0,
          reqTime: pr.reqTime ? (moment(pr.reqTime).isValid() ? moment(pr.reqTime).format("HH:mm:ss") : pr.reqTime) : moment().format("HH:mm:ss")
        });
      }

      if (items) {
        // Initialize reqAppqty if not set (for approval mode)
        const itemsWithApprovedQty = items.map(item => ({
          ...item,
          reqAppqty: item.reqAppqty !== undefined && item.reqAppqty !== null 
            ? item.reqAppqty 
            : item.reqdQty // Default to requested quantity if not set
        }));
        setCartData(itemsWithApprovedQty);
      }

      isLoadingPRDataRef.current = false; // Reset flag after everything is loaded
    } catch (err) {
      console.error("Error loading PR data:", err);
      toast.error("Error loading PR data");
      isLoadingPRDataRef.current = false; // Reset flag on error
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
      // const hqSiteCode = userDetails?.HQSiteCode;
      
      const query = `?Site=${siteCode}`;
      const response = await apiService1.get(`api/GetInvitems${query}`);
      const stockDetails = response.result;
      const count = response.result.length;
      
      console.log("Sample item from API:", stockDetails[0]);
      console.log("Total items:", count);
      
      const updatedRes = stockDetails.map((item) => ({
        ...item,
        Qty: 0,
        expiryDate: null,
        Price: Number(item?.Price) || Number(item?.Cost) || 0,
        docAmt: null,
        // Map the fields to match the expected structure
        stockCode: item.stockCode,
        stockName: item.stockName,
        Brand: item.Brand,
        BrandCode: item.BrandCode,
        Range: item.Range,
        RangeCode: item.RangeCode,
        Department: item.Department,
        docUom: item.uom,
        isActive: item.isActive || "True"
      }));

      console.log("Updated items with Price field:", updatedRes[0]);

      setStockList(updatedRes);
      setLoading(false)
      setOriginalStockList(updatedRes);
      setItemTotal(count);
      setFilteredItemTotal(count); // Initially, filtered count equals total count
    } catch (err) {
      setLoading(false);
      console.error("Error fetching stock details:", err);
      toast.error("Failed to fetch stock details");
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

  // Handle expiry date change
  const handleExpiryDateChange = (e, index) => {
    const newStockList = [...stockList];
    newStockList[index].expiryDate = e.target.value;
    setStockList(newStockList);
  };

  // Handle batch selection
  const handleBatchSelection = async (index, item) => {
    // Always check if quantity is entered and valid
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity first");
      return;
    }

    setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: true }));
    
    try {
      // Fetch available batches from HQ
      const hqSiteCode = userDetails?.HQSiteCode || 'ZEHQ';
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode },
            { siteCode: hqSiteCode },
            { uom: item.docUom },
            { qty: { gt: 0 } }
          ]
        }
      };
      
      const batches = await apiService.get(`ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`);
      
      if (!batches || batches.length === 0) {
        toast.error("No batch information found for this item");
        return;
      }

      // Check if there are any batches with actual batch numbers (not empty strings)
      const actualBatches = batches.filter(
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
      const processedBatches = batches.map((batch) => ({
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

      const noBatchItems = batches
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
      
      // Prepare batch data for dialog
      setBatchDialogData({
        item: item,
        index: index,
        batches: sortedBatches,
        transferQty: transferQty,
        totalBatchQty: totalBatchQty,
        noBatchQty: noBatchQty,
        scenarioMessage: scenarioMessage
      });
      setShowBatchDialog(true);
      
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error("Failed to fetch batch information");
    } finally {
      setItemBatchLoading(prev => ({ ...prev, [item.stockCode]: false }));
    }
  };

  // Handle batch selection submit
  const handleBatchSelectionSubmit = (combinedBatchData) => {
    if (!combinedBatchData || !batchDialogData) return;
    
    const transferQty = Number(batchDialogData.transferQty);

    // Handle multiple batch selection
    if (
      combinedBatchData.selectedBatches &&
      combinedBatchData.selectedBatches.length > 0
    ) {
      // Multiple batches selected
      const batchDetails = combinedBatchData.selectedBatches.map((batch) => ({
        batchNo: batch.batchNo,
        expDate: batch.expDate,
        quantity: batch.quantity,
      }));

      const totalBatchQty = batchDetails.reduce(
        (sum, b) => sum + b.quantity,
        0
      );
      const noBatchTransferQty =
        combinedBatchData.noBatchQty ||
        Math.max(0, transferQty - totalBatchQty);

      // Update the stock item to show that specific batches are selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === batchDialogData.item.stockCode
            ? {
                ...stockItem,
                selectedBatches: {
                  batchNo: combinedBatchData.batchNo, // Combined batch numbers
                  expDate: combinedBatchData.expDate, // Combined expiry dates
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
        combinedBatchData.availableQty
      );
      const noBatchTransferQty = Math.max(0, transferQty - batchTransferQty);

      // Update the stock item to show that specific batches are selected
      setStockList((prev) =>
        prev.map((stockItem) =>
          stockItem.stockCode === batchDialogData.item.stockCode
            ? {
                ...stockItem,
                selectedBatches: {
                  batchNo: combinedBatchData.batchNo,
                  expDate: combinedBatchData.expDate,
                  batchTransferQty: batchTransferQty,
                  noBatchTransferQty: noBatchTransferQty,
                  totalTransferQty: transferQty,
                  transferType: "specific", // Mark as specific batch transfer
                  batchDetails: [
                    {
                      batchNo: combinedBatchData.batchNo,
                      expDate: combinedBatchData.expDate,
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
          ? `Specific batch ${combinedBatchData.batchNo} selected: ${batchTransferQty} qty. Balance ${noBatchTransferQty} will be taken from "No Batch". Now click + icon to add to cart.`
          : `Specific batch ${combinedBatchData.batchNo} selected: ${batchTransferQty} qty. Now click + icon to add to cart.`;

      toast.success(message);
    }

    // Reset states
    setShowBatchDialog(false);
    setBatchDialogData(null);
  };

  // Add to cart
  const addToCart = (index, item) => {
    // Always check if quantity is entered and valid
    if (!item.Qty || item.Qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const qty = parseFloat(item.Qty) || 0;

    // Check if quantity exceeds on-hand quantity (if available)
    if (item.quantity && Number(item.Qty) > Number(item.quantity)) {
      toast.error("Not enough stock available");
      return;
    }

    // Validate batch selection if enabled
    if (getConfigValue('BATCH_NO') === "Yes" && item.selectedBatches) {
      if (item.selectedBatches.transferType === "specific") {
        const totalSelected = item.selectedBatches.batchDetails.reduce(
          (sum, b) => sum + b.quantity, 0
        ) + (item.selectedBatches.noBatchTransferQty || 0);
        
        if (totalSelected !== qty) {
          toast.error("Selected batch quantities must match item quantity");
          return;
        }
      }
    }

    const price = parseFloat(item.Price) || 0;
    const discPer = 0; // Default discount
    const discAmt = (qty * price * discPer) / 100;
    const amount = (qty * price) - discAmt;

    // Prepare batch data for storage in reqdetails fields
    // Store transfer type with UOM: "fefo-PCS", "specific-BOTTLE", etc.
    const uom = item.docUom || "";
    let itemRemark1 = `fefo${uom ? `-${uom}` : ""}`; // Default to fefo-UOM - Transfer type: fefo/specific
    let itemRemark2 = ""; // Batch breakdown: batchNo:qty,batchNo:qty (include NOBATCH if needed)
    let docBatchNoStorage = ""; // Just batch numbers: B01,B02
    let docExpdateStorage = ""; // Expiry dates: expDate:qty,expDate:qty

    if (item.selectedBatches) {
      // Set transfer type from selectedBatches if available, include UOM
      const transferType = item.selectedBatches.transferType || "fefo";
      itemRemark1 = `${transferType}${uom ? `-${uom}` : ""}`; // "fefo-UOM" or "specific-UOM"
      
      if (item.selectedBatches.transferType === "specific" && item.selectedBatches.batchDetails) {
        // Store batch details as "batchNo:qty,batchNo:qty" in itemRemark2
        const batchPairs = item.selectedBatches.batchDetails
          .map(b => `${b.batchNo}:${b.quantity}`)
          .join(",");
        
        // Add No Batch qty to itemRemark2 if exists
        if (item.selectedBatches.noBatchTransferQty > 0) {
          itemRemark2 = batchPairs + ",NOBATCH:" + item.selectedBatches.noBatchTransferQty;
        } else {
          itemRemark2 = batchPairs;
        }
        
        // Store just batch numbers in docBatchNo for compatibility: "B01,B02"
        docBatchNoStorage = item.selectedBatches.batchDetails
          .map(b => b.batchNo)
          .filter(Boolean)
          .join(",");
        
        // Store expiry dates in docExpdate: "expDate:qty,expDate:qty"
        docExpdateStorage = item.selectedBatches.batchDetails
          .map(b => `${b.expDate || ''}:${b.quantity}`)
          .join(",");
      }
    }

    const newItem = {
      reqNo: formData.reqNo,
      itemsiteCode: formData.itemsiteCode,
      status: "Active",
      reqdItemcode: item.stockCode,
      reqdItemdesc: item.stockName,
      reqdItemprice: price.toFixed(2),
      reqdQty: qty,
      reqAppqty: 0,
      reqdFocqty: 0,
      reqdTtlqty: qty,
      reqdPrice: price.toFixed(2),
      reqdDiscper: discPer,
      reqdDiscamt: discAmt.toFixed(2),
      reqdAmt: amount.toFixed(2),
      reqdRecqty: 0,
      reqdCancelqty: 0,
      reqdOutqty: qty,
      reqdDate: moment().format("YYYY-MM-DD"),
      reqdTime: moment().format("HH:mm:ss"),
      syncGuid: "D6358EAD-46E0-406A-8118-7F2DE6C6A4B2",
      syncClientindex: "",
      syncLstupd: "",
      syncClientindexstring: "",
      brandcode: item.BrandCode,
      brandname: item.Brand,
      linenumber: cartData.length + 1,
      poststatus: "0",
      reqId: "", // Will be set when saving
      RunningNo: "", // Will be set when saving
      docUom: item.docUom,
      docBatchNo: docBatchNoStorage || "",        // ✅ B01,B02
      docExpdate: docExpdateStorage || "",        // ✅ 2025-08-12:4,2025-09-15:6
      itemRemark: "",                             // Keep for user remarks
      itemRemark1: itemRemark1 || "",             // ✅ fefo-UOM or specific-UOM (e.g., "fefo-PCS", "specific-BOTTLE")
      itemRemark2: itemRemark2 || "",             // ✅ B01:5,B02:3,NOBATCH:2
      useExistingBatch: true,
      // ✅ ADD: Runtime fields for batch processing (NOT stored in DB)
      transferType: item.selectedBatches ? item.selectedBatches.transferType : "fefo",
      batchDetails: item.selectedBatches && item.selectedBatches.batchDetails
        ? {
            batchNo: item.selectedBatches.batchDetails
              .map(b => b.batchNo)
              .filter(Boolean)
              .join(", "),
            expDate: item.selectedBatches.batchDetails
              .map(b => b.expDate)
              .filter(Boolean)
              .join(", "),
            batchTransferQty: item.selectedBatches.batchDetails
              .reduce((sum, b) => sum + b.quantity, 0),
            noBatchTransferQty: item.selectedBatches.noBatchTransferQty || 0,
            totalTransferQty: item.selectedBatches.totalTransferQty,
            individualBatches: item.selectedBatches.batchDetails || [],
          }
        : null,
    };

    setCartData(prev => [...prev, newItem]);
    
    // Reset quantity and batch selection in stock list
    const newStockList = [...stockList];
    newStockList[index].Qty = "";
    newStockList[index].selectedBatches = null;
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
    const value = e.target.value;
    setEditData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Auto-calculate dependent fields when FOC, discount, or quantity changes
      if (field === 'reqdQty' || field === 'reqdFocqty' || field === 'reqdDiscper' || field === 'reqdItemprice') {
        const qty = parseFloat(updated.reqdQty || 0);
        const focQty = parseFloat(updated.reqdFocqty || 0);
        const price = parseFloat(updated.reqdItemprice || 0);
        const discPer = parseFloat(updated.reqdDiscper || 0);
        
        // Calculate total quantity (regular + FOC)
        const totalQty = qty + focQty;
        
        // Calculate discount amount (only on regular quantity)
        const discAmt = (qty * price * discPer) / 100;
        
        // Calculate final amount (regular quantity * price - discount)
        const finalAmt = (qty * price) - discAmt;
        
        updated.reqdTtlqty = totalQty;
        updated.reqdDiscamt = discAmt.toFixed(2);
        updated.reqdAmt = finalAmt.toFixed(2);
      }

      return updated;
    });
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
      reqTtqty: totals.totalQty,
      reqTtfoc: totals.totalFoc,
      reqTtdisc: parseFloat(parseFloat(totals.totalDisc || 0).toFixed(2)),
      reqTtamt: parseFloat(parseFloat(totals.totalAmt || 0).toFixed(2)),
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
      setFormData(prev => ({
        ...prev,
        supplierName: supplier.label
      }));
      setSupplierInfo(prev => ({
        ...prev,
        Attn: supplier.label
      }));
    }
  };

  // Save PR
  const handleSave = async () => {
    if (cartData.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setSaveLoading(true);
    try {
      if (id) {
        // Update existing PR
        await prApi.updatePR(id, formData);
        
        // Update line items using the new method
        await prApi.updatePRLineItems(cartData);
        toast.success("Purchase Requisition updated successfully");
      } else {
        // Create new PR (this will handle control number generation internally)
        const result = await prApi.createPR(formData, cartData);
        
        // Get the generated PR number for display
        setFormData(prev => ({ ...prev, reqNo: result.reqNo }));
        
        toast.success("Purchase Requisition created successfully");
      }

      navigate("/purchase-requisition");
    } catch (err) {
      console.error("Error saving PR:", err);
      toast.error("Error saving Purchase Requisition");
    } finally {
      setSaveLoading(false);
    }
  };

  // Post PR
  const handlePost = async () => {
    if (cartData.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setPostLoading(true);
    try {
      // Generate PR number if not exists (for new PRs)
      let reqNo = formData.reqNo;
      if (!reqNo) {
        reqNo = await prApi.getNextPRNumber();
        const updatedFormData = { ...formData, reqNo };
        setFormData(updatedFormData);
      }
      
      // If this is a new PR (no ID), save it first before posting
      if (!id) {
        // Update formData to have Posted status before creating
        const updatedFormData = { ...formData, reqStatus: "Posted" };
        
        // Create the PR with Posted status (this will handle control number update)
        const result = await prApi.createPR(updatedFormData, cartData);
        
        setFormData(prev => ({ ...prev, reqStatus: "Posted", reqNo: result.reqNo }));
      } else {
        // For existing PRs, just update the status
        await prApi.postPR(reqNo);
        setFormData(prev => ({ ...prev, reqStatus: "Posted" }));
      }
      
      toast.success("Purchase Requisition posted successfully");
      navigate("/purchase-requisition");
    } catch (err) {
      console.error("Error posting PR:", err);
      toast.error("Error posting Purchase Requisition");
    } finally {
      setPostLoading(false);
    }
  };

  // Handle PR approval
  const handleApprove = async () => {
    if (cartData.length === 0) {
      toast.error("No items to approve");
      return;
    }

    setApprovalLoading(true);
    try {
      // Clear previous validation errors
      setStockValidationErrors([]);

      // 1. Validate approved quantities
      const validationErrors = [];
      cartData.forEach((item, index) => {
        const approvedQty = parseFloat(item.reqAppqty || item.reqdQty);
        const requestedQty = parseFloat(item.reqdQty);
        
        if (approvedQty > requestedQty) {
          validationErrors.push(`Item ${item.reqdItemcode}: Approved quantity (${approvedQty}) cannot exceed requested quantity (${requestedQty})`);
        }
        if (approvedQty < 0) {
          validationErrors.push(`Item ${item.reqdItemcode}: Approved quantity cannot be negative`);
        }
        if (approvedQty === 0) {
          validationErrors.push(`Item ${item.reqdItemcode}: Approved quantity must be greater than 0`);
        }
      });

      if (validationErrors.length > 0) {
        setStockValidationErrors(validationErrors);
        setApprovalLoading(false);
        return;
      }

      // 2. Check HQ stock availability (only if supplier is HQ)
      if (formData.suppCode === "HQ") {
        const stockErrors = await prApi.validateHQStockForApproval(cartData);
        if (stockErrors.length > 0) {
          const errorMessages = stockErrors.map(error => {
            if (error.errorType === 'BATCH_SHORTFALL' || error.errorType === 'NO_BATCH_SHORTFALL') {
              return `${error.itemCode} (${error.itemDesc}): Batch ${error.batchNo} - Insufficient stock. Available: ${error.availableQty}, Required: ${error.approvedQty}, Shortfall: ${error.shortfall}`;
            } else {
              return `${error.itemCode} (${error.itemDesc}): Insufficient stock. Available: ${error.availableQty}, Required: ${error.approvedQty}, Shortfall: ${error.shortfall}`;
            }
          });
          setStockValidationErrors(errorMessages);
          setApprovalLoading(false);
          return;
        }
      }

      // 3. Reset loading and show confirmation dialog
      // Ensure loading is false before opening dialog so button is enabled
      setApprovalLoading(false);
      setShowApprovalDialog(true);
    } catch (err) {
      console.error("Error validating approval:", err);
      toast.error("Error validating approval: " + (err.message || "Unknown error"));
      setApprovalLoading(false);
    }
  };

  // Confirm approval with transfer option
  const handleConfirmApproval = async () => {
    setApprovalLoading(true);
    setShowApprovalDialog(false); // Close dialog immediately to prevent double clicks
    try {
      // Only create GTO if supplier is HQ, otherwise just approve
      const shouldCreateTransfer = formData.suppCode === "HQ";
      const result = await prApi.approvePRWithQuantities(formData.reqNo, cartData, shouldCreateTransfer);
      
      // Show appropriate success message based on whether GTO was created
      if (shouldCreateTransfer && result?.docNo) {
        toast.success(`Purchase Requisition approved and GTO document ${result.docNo} created successfully (Open status)`);
      } else {
        toast.success("Purchase Requisition approved successfully");
      }
      
      navigate("/purchase-requisition");
    } catch (err) { 
      console.error("Error approving PR:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error occurred";
      toast.error(`Error approving Purchase Requisition: ${errorMessage}`);
      // Re-open dialog on error so user can retry
      setShowApprovalDialog(true);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle PR rejection
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setApprovalLoading(true);
    try {
      await prApi.rejectPR(formData.reqNo, rejectionReason);
      toast.success("Purchase Requisition rejected successfully");
      setRejectDialogOpen(false);
      setRejectionReason("");
      navigate("/purchase-requisition");
    } catch (err) {
      console.error("Error rejecting PR:", err);
      toast.error("Error rejecting Purchase Requisition");
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle approved quantity change
  const handleApprovedQtyChange = (index, value) => {
    const newCartData = [...cartData];
    newCartData[index].reqAppqty = parseFloat(value) || 0;
    setCartData(newCartData);
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

  // Show transfer preview
  const showTransferPreview = (item) => {
    setPreviewItem(item);
    setShowPreviewModal(true);
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

  // Check if status is Posted or Approved (for view-only mode)
  const isViewOnlyStatus = formData.reqStatus === "Posted" || formData.reqStatus === "Approved";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {approvalMode 
            ? (formData.reqStatus === "Approved" 
                ? "View Approved Purchase Requisition" 
                : "Approve Purchase Requisition")
            : isViewOnlyStatus
            ? (formData.reqStatus === "Approved" 
                ? "View Approved Purchase Requisition" 
                : "View Posted Purchase Requisition")
            : (id ? "Edit Purchase Requisition" : "Add Purchase Requisition")}
        </h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 px-6"
            onClick={() => navigate("/purchase-requisition")}
          >
            Cancel
          </Button>
          
          {approvalMode ? (
            // Approval mode buttons - hide all except Cancel if status is Approved
            formData.reqStatus === "Approved" ? null : (
              <>
                <Button
                  disabled={saveLoading || cartData.length === 0}
                  onClick={handleSave}
                  className="cursor-pointer hover:bg-blue-600 transition-colors duration-150"
                >
                  {saveLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approvalLoading || cartData.length === 0}
                  className="cursor-pointer hover:bg-green-600 transition-colors duration-150"
                >
                  {approvalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Approve PR"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={approvalLoading}
                  className="cursor-pointer hover:bg-red-700 transition-colors duration-150"
                >
                  Reject PR
                </Button>
              </>
            )
          ) : (
            // Regular mode buttons - hide all except Cancel if status is Posted or Approved
            !isViewOnlyStatus && (
              <>
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
                {formData.reqStatus !== "Posted" && formData.reqStatus !== "Approved" && (
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
              </>
            )
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
                  PR No<span className="text-red-500">*</span>
                </Label>
                  <Input
                    value={formData.reqNo}
                  disabled
                  className="bg-gray-50"
                  />
                </div>
              <div className="space-y-2">
                <Label>
                  PR Date<span className="text-red-500">*</span>
                </Label>
                  <Input
                    type="date"
                    value={formData.reqDate}
                    onChange={(e) => handleInputChange("reqDate", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={formData.reqRef}
                  onChange={(e) => handleInputChange("reqRef", e.target.value)}
                  placeholder="Enter reference"
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
            </div>

            {/* Second Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Request To<span className="text-red-500">*</span>
                </Label>
                  <Select
                    value={formData.suppCode}
                  onValueChange={handleSupplierChange}
                  disabled={urlStatus == 7 && !approvalMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
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
              <Label>Store Code</Label>
                  <Input
                  value={formData.itemsiteCode}
                  readOnly
                  className="bg-gray-50"
                  />
                {/* <Label>Expected Delivery Date</Label>
                  <Input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleInputChange("expectedDeliveryDate", e.target.value)}
                  /> */}
                </div>
              <div className="space-y-2">
                <Label>Supplier Name</Label>
                  <Input
                  value={formData.supplierName}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Third Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.reqStatus} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attention To</Label>
                <Input
                    value={formData.reqAttn}
                    onChange={(e) => handleInputChange("reqAttn", e.target.value)}
                  placeholder="Enter attention to"
                  disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
              {/* <div className="space-y-2">
      
                </div> */}
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>
                Created By<span className="text-red-500">*</span>
              </Label>
              <Input
                value={userDetails?.username || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                  value={formData.reqRemk1}
                  onChange={(e) => handleInputChange("reqRemk1", e.target.value)}
                placeholder="Enter remarks"
                disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="detail">Details</TabsTrigger>
          <TabsTrigger value="address">Address Info</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-6">
          {urlStatus != 7 && !isViewOnlyStatus && (
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
                  onExpiryDateChange={(e, index) => handleExpiryDateChange(e, index)}
                  onAddToCart={addToCart}
                  onBatchSelection={urlStatus != 7 ? handleBatchSelection : null}
                  onRemoveBatchSelection={(index) => {
                    setStockList(prev => prev.map((item, idx) => 
                      idx === index ? { ...item, selectedBatches: null } : item
                    ));
                  }}
                  itemBatchLoading={itemBatchLoading}
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
                  canEdit={() => urlStatus != 7}
                  // Add sorting functionality
                  enableSorting={true}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                />
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="address" className="space-y-6">
          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reqBname">Company Name</Label>
                <Input
                  id="reqBname"
                  value={formData.reqBname}
                  onChange={(e) => handleInputChange("reqBname", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reqBaddr1">Address 1</Label>
                  <Input
                    id="reqBaddr1"
                    value={formData.reqBaddr1}
                    onChange={(e) => handleInputChange("reqBaddr1", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
                <div>
                  <Label htmlFor="reqBaddr2">Address 2</Label>
                  <Input
                    id="reqBaddr2"
                    value={formData.reqBaddr2}
                    onChange={(e) => handleInputChange("reqBaddr2", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
                <div>
                  <Label htmlFor="reqBcity">City</Label>
                  <Input
                    id="reqBcity"
                    value={formData.reqBcity}
                    onChange={(e) => handleInputChange("reqBcity", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
                <div>
                  <Label htmlFor="reqBstate">State</Label>
                  <Input
                    id="reqBstate"
                    value={formData.reqBstate}
                    onChange={(e) => handleInputChange("reqBstate", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
                <div>
                  <Label htmlFor="reqBpostcode">Postcode</Label>
                  <Input
                    id="reqBpostcode"
                    value={formData.reqBpostcode}
                    onChange={(e) => handleInputChange("reqBpostcode", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
                  />
                </div>
                <div>
                  <Label htmlFor="reqBcountry">Country</Label>
                  <Input
                    id="reqBcountry"
                    value={formData.reqBcountry}
                    onChange={(e) => handleInputChange("reqBcountry", e.target.value)}
                    disabled={urlStatus == 7 && !approvalMode}
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
                <Label htmlFor="reqDaddr1">Address 1</Label>
                <Input
                  id="reqDaddr1"
                  value={formData.reqDaddr1}
                  onChange={(e) => handleInputChange("reqDaddr1", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div>
                <Label htmlFor="reqDaddr2">Address 2</Label>
                <Input
                  id="reqDaddr2"
                  value={formData.reqDaddr2}
                  onChange={(e) => handleInputChange("reqDaddr2", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div>
                <Label htmlFor="reqDcity">City</Label>
                <Input
                  id="reqDcity"
                  value={formData.reqDcity}
                  onChange={(e) => handleInputChange("reqDcity", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div>
                <Label htmlFor="reqDstate">State</Label>
                <Input
                  id="reqDstate"
                  value={formData.reqDstate}
                  onChange={(e) => handleInputChange("reqDstate", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div>
                <Label htmlFor="reqDpostcode">Postcode</Label>
                <Input
                  id="reqDpostcode"
                  value={formData.reqDpostcode}
                  onChange={(e) => handleInputChange("reqDpostcode", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
              <div>
                <Label htmlFor="reqDcountry">Country</Label>
                <Input
                  id="reqDcountry"
                  value={formData.reqDcountry}
                  onChange={(e) => handleInputChange("reqDcountry", e.target.value)}
                  disabled={urlStatus == 7 && !approvalMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Edit Button */}
      {cartData.length > 0 && !isViewOnlyStatus && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {selectedRows.length > 0 && (urlStatus != 7 || approvalMode || userDetails?.isSettingPostedChangePrice === "True") && (
              <Button
                variant="outline"
                onClick={handleBatchEditClick}
                disabled={urlStatus == 7 && !approvalMode && userDetails?.isSettingPostedChangePrice !== "True"}
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
                  {(urlStatus != 7 || approvalMode || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True")) && !isViewOnlyStatus ? (
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
                  <TableHead>Requested Qty</TableHead>
                  <TableHead>FOC Qty</TableHead>
                  {approvalMode && <TableHead>Approved Qty</TableHead>}
                  {userDetails?.isSettingViewPrice === "True" && <TableHead>Price</TableHead>}
                  <TableHead>Discount %</TableHead>
                  <TableHead>Discount Amt</TableHead>
                  {userDetails?.isSettingViewPrice === "True" && <TableHead>Amount</TableHead>}
                  {getConfigValue('BATCH_NO') === "Yes" && <TableHead>Batch Mode</TableHead>}
                  {getConfigValue('BATCH_NO') === "Yes" && <TableHead>Batch No</TableHead>}
                  <TableHead>Remarks</TableHead>
                    {!isViewOnlyStatus && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartData.map((item, index) => (
                    <TableRow key={index}>
                    {(urlStatus != 7 || approvalMode || (urlStatus == 7 && userDetails?.isSettingPostedChangePrice === "True")) && !isViewOnlyStatus ? (
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
                      <TableCell>{item.reqdItemcode}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal break-words">
                      {item.reqdItemdesc}
                    </TableCell>
                    <TableCell>{item.docUom}</TableCell>
                      <TableCell>{parseFloat(item.reqdQty || 0).toFixed(2)}</TableCell>
                      <TableCell>{parseFloat(item.reqdFocqty || 0).toFixed(2)}</TableCell>
                    {approvalMode && (
                      <TableCell>
                        <Input
                          type="number"
                          value={parseFloat(item.reqAppqty || item.reqdQty || 0).toFixed(2)}
                          onChange={(e) => handleApprovedQtyChange(index, e.target.value)}
                          min="0"
                          max={item.reqdQty}
                          step="0.01"
                          className="w-20"
                        />
                      </TableCell>
                    )}
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableCell>{parseFloat(item.reqdItemprice || 0).toFixed(2)}</TableCell>
                    )}
                      <TableCell>{parseFloat(item.reqdDiscper || 0).toFixed(2)}%</TableCell>
                      <TableCell>{parseFloat(item.reqdDiscamt || 0).toFixed(2)}</TableCell>
                    {userDetails?.isSettingViewPrice === "True" && (
                      <TableCell>{parseFloat(item.reqdAmt || 0).toFixed(2)}</TableCell>
                    )}
                    {getConfigValue('BATCH_NO') === "Yes" && (
                      <TableCell>
                        {(item.itemRemark1 || item.ordMemo1)?.startsWith("specific") ? (
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-800">Specific</Badge>
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
                          <Badge className="bg-blue-100 text-blue-800">FEFO</Badge>
                        )}
                      </TableCell>
                    )}
                    {getConfigValue('BATCH_NO') === "Yes" && (
                      <TableCell>{item.docBatchNo || "-"}</TableCell>
                    )}
                    <TableCell>{item.itemRemark || "-"}</TableCell>
                      <TableCell>
                        {!isViewOnlyStatus && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                            onClick={() => editCartItem(index)}
                            disabled={urlStatus == 7 && !approvalMode}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                            onClick={() => removeFromCart(index)}
                            disabled={urlStatus == 7 && !approvalMode}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
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
                <Input value={parseFloat(totals.totalDisc || 0).toFixed(2)} readOnly className="bg-gray-50" />
              </div>
              <div>
                <Label>Total Amount</Label>
                <Input value={parseFloat(totals.totalAmt || 0).toFixed(2)} readOnly className="bg-gray-50" />
              </div>
            </div>
        </div>
              </div>
            )}

      {/* Stock Validation Errors */}
      {stockValidationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {stockValidationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      <Dialog 
        open={showApprovalDialog} 
        onOpenChange={(open) => {
          setShowApprovalDialog(open);
          // Reset loading state if dialog is closed without confirming
          if (!open && !approvalLoading) {
            setApprovalLoading(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm PR Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to approve this Purchase Requisition?</p>
            {formData.suppCode === "HQ" ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will automatically create a GTO (Goods Transfer Out) from HQ to the requesting site.
                  </p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Items to Transfer:</strong>
                  </p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside mt-1 space-y-1">
                    {cartData.map((item, idx) => (
                      <li key={idx}>
                        {item.reqdItemcode}: {item.reqAppqty || item.reqdQty} {item.docUom}
                        {(item.itemRemark1 || item.ordMemo1)?.startsWith("specific") && " (Specific Batches)"}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will approve the Purchase Requisition without creating a transfer document.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowApprovalDialog(false)}
              disabled={approvalLoading}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmApproval} 
              disabled={approvalLoading}
              className="bg-green-600 hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approvalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Confirm Approval"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Input
              id="rejectionReason"
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={approvalLoading}>
              {approvalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        approvalMode={approvalMode}
      />

      {/* Batch Selection Dialog */}
      <BatchSelectionDialog
        showBatchDialog={showBatchDialog}
        setShowBatchDialog={setShowBatchDialog}
        batchBreakdown={batchDialogData?.batches || []}
        transferQty={batchDialogData?.transferQty || 0}
        totalBatchQty={batchDialogData?.totalBatchQty || 0}
        noBatchQty={batchDialogData?.noBatchQty || 0}
        scenarioMessage={batchDialogData?.scenarioMessage || ""}
        onBatchSelectionSubmit={handleBatchSelectionSubmit}
        itemcode={batchDialogData?.item?.stockCode || ""}
        itemdesc={batchDialogData?.item?.stockName || ""}
      />

      {/* Transfer Preview Modal */}
      <TransferPreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewItem={previewItem}
        formData={formData}
      />

      <Toaster />
    </div>
  );
}

// Transfer Preview Modal Component
const TransferPreviewModal = memo(
  ({ showPreviewModal, setShowPreviewModal, previewItem, formData }) => {
    const [batchDetails, setBatchDetails] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [hasNoBatch, setHasNoBatch] = useState(false);
    const [noBatchQty, setNoBatchQty] = useState(0);

    // Also handle noBatchTransferQty from batchDetails if available
    const getNoBatchQty = () => {
      if (!previewItem) return 0;
      if (previewItem.batchDetails && previewItem.batchDetails.noBatchTransferQty) {
        return previewItem.batchDetails.noBatchTransferQty;
      }
      // Parse from itemRemark2
      const batchString = previewItem.itemRemark2 || previewItem.ordMemo2;
      if (!batchString) return 0;
      const batchPairs = batchString.split(",");
      const noBatchPair = batchPairs.find(pair => pair.includes("NOBATCH"));
      if (noBatchPair) {
        const [, qty] = noBatchPair.split(":");
        return Number(qty) || 0;
      }
      return 0;
    };

    // Parse batch details from itemRemark2
    const parseBatchDetails = () => {
      if (!previewItem) return [];
      
      // First, try to use batchDetails if available (runtime field)
      if (previewItem.batchDetails && previewItem.batchDetails.individualBatches) {
        return previewItem.batchDetails.individualBatches.map((batch) => ({
          batchNo: batch.batchNo || "",
          quantity: batch.quantity || 0,
          expDate: batch.expDate || null,
        }));
      }

      // If not available, parse from itemRemark2 and docExpdate
      if (!previewItem.itemRemark2 && !previewItem.ordMemo2) {
        return [];
      }

      const batchString = previewItem.itemRemark2 || previewItem.ordMemo2;
      const batchPairs = batchString.split(",");
      
      // Parse expiry dates from docExpdate if available
      // Format: "2025-11-01T00:00:00.000Z:2,2025-11-15T00:00:00.000Z:1"
      const expiryDates = [];
      if (previewItem.docExpdate) {
        const expiryPairs = previewItem.docExpdate.split(",");
        expiryPairs.forEach((pair) => {
          // Find the last colon (separates date from quantity)
          const lastColonIndex = pair.lastIndexOf(":");
          if (lastColonIndex > 0) {
            const expDateStr = pair.substring(0, lastColonIndex).trim();
            if (expDateStr) {
              try {
                const date = new Date(expDateStr);
                if (!isNaN(date.getTime())) {
                  expiryDates.push(date.toISOString());
                } else {
                  expiryDates.push(expDateStr);
                }
              } catch (e) {
                expiryDates.push(expDateStr);
              }
            }
          }
        });
      }
      
      // Map batch pairs with expiry dates by index/position
      // Note: expiry dates are stored in the same order as batches (excluding NOBATCH)
      let expiryIndex = 0;
      
      return batchPairs.map((pair) => {
        const [batchNo, quantity] = pair.split(":");
        const qty = Number(quantity) || 0;
        const isNoBatch = batchNo === "NOBATCH";
        
        // Only match expiry date for non-NOBATCH entries by index
        // NOBATCH entries don't have expiry dates, so skip them in the expiry array
        let expDate = null;
        if (!isNoBatch && expiryIndex < expiryDates.length) {
          expDate = expiryDates[expiryIndex];
          expiryIndex++; // Move to next expiry date for next batch
        }
        
        return {
          batchNo: isNoBatch ? "" : batchNo,
          quantity: qty,
          expDate: expDate,
        };
      });
    };

    // Fetch batch expiry dates from ItemBatches API and enrich the batch details
    const enrichBatchDetails = async (parsedBatches) => {
      if (!previewItem) return;
      
      try {
        setLoadingBatches(true);
        const userDetails = JSON.parse(localStorage.getItem("userDetails"));
        const hqSiteCode = userDetails?.HQSiteCode || "HQ";
        const itemCode = previewItem.reqdItemcode || previewItem.itemcode;
        const uom = previewItem.docUom;

        // Fetch batches from API
        const filter = {
          where: {
            and: [
              { itemCode: itemCode },
              { siteCode: hqSiteCode },
              ...(uom ? [{ uom }] : []),
              // { qty: { gt: 0 } },
            ],
          },
        };

        const batches = await apiService.get(
          `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
        );

        // Create a map of batchNo to expDate
        const batchExpDateMap = new Map();
        batches.forEach((batch) => {
          const batchNo = (batch.batchNo || "").trim();
          if (batchNo && batch.expDate) {
            batchExpDateMap.set(batchNo, batch.expDate);
          }
        });

        // Enrich parsed batches with expiry dates from API
        const enriched = parsedBatches.map((batch) => {
          if (batch.batchNo && !batch.expDate) {
            const expDate = batchExpDateMap.get(batch.batchNo.trim());
            if (expDate) {
              return { ...batch, expDate };
            }
          }
          return batch;
        });

        setBatchDetails(enriched);
        setHasNoBatch(enriched.some(b => !b.batchNo || b.batchNo === ""));
        setNoBatchQty(getNoBatchQty());
      } catch (err) {
        console.error("Error fetching batch expiry dates:", err);
        // If fetch fails, use parsed batches as is
        setBatchDetails(parsedBatches);
        setHasNoBatch(parsedBatches.some(b => !b.batchNo || b.batchNo === ""));
        setNoBatchQty(getNoBatchQty());
      } finally {
        setLoadingBatches(false);
      }
    };

    // Load batch details when modal opens or previewItem changes
    useEffect(() => {
      if (showPreviewModal && previewItem) {
        const parsed = parseBatchDetails();
        
        // Check if any batch is missing expiry date
        const needsFetch = parsed.some(b => b.batchNo && !b.expDate);
        
        if (needsFetch) {
          // Fetch expiry dates from API and enrich
          enrichBatchDetails(parsed);
        } else {
          // All batches have expiry dates, set state directly
          setBatchDetails(parsed);
          setHasNoBatch(parsed.some(b => !b.batchNo || b.batchNo === ""));
          setNoBatchQty(getNoBatchQty());
        }
      } else {
        // Reset state when modal closes or previewItem is null
        setBatchDetails([]);
        setHasNoBatch(false);
        setNoBatchQty(0);
        setLoadingBatches(false);
      }
    }, [showPreviewModal, previewItem]);

    // Early return after all hooks
    if (!previewItem) return null;

    return (
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Batch Transfer Details Preview</DialogTitle>
            <div className="text-sm text-muted-foreground">
              Item: {previewItem.reqdItemcode} - {previewItem.reqdItemdesc}
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
                      <strong>Total Requested Qty:</strong> {previewItem.reqdQty}
                    </p>
                    <p>
                      <strong>Transfer Type:</strong> Specific Batches
                    </p>
                    <p>
                      <strong>From:</strong> {formData.suppCode || "HQ"}
                    </p>
                    <p>
                      <strong>To:</strong> {formData.itemsiteCode}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Details */}
            {(batchDetails.length > 0 || loadingBatches) && (
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
                      {loadingBatches && batchDetails.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-muted-foreground">
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading expiry dates...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {batchDetails.map((batch, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 font-medium">
                                {batch.batchNo || "No Batch"}
                                {!batch.batchNo && (
                                  <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                    Balance
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right">{batch.quantity}</td>
                              <td className="p-2 text-xs">
                                {loadingBatches && !batch.expDate ? (
                                  <div className="flex items-center space-x-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Loading...</span>
                                  </div>
                                ) : (
                                  batch.expDate ? format_Date(batch.expDate) : "N/A"
                                )}
                              </td>
                            </tr>
                          ))}
                          {noBatchQty > 0 && !hasNoBatch && (
                            <tr className="border-t bg-gray-50">
                              <td className="p-2 font-medium text-gray-600">
                                No Batch
                                <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                  Balance
                                </span>
                              </td>
                              <td className="p-2 text-right text-gray-600">{noBatchQty}</td>
                              <td className="p-2 text-xs text-gray-600">N/A</td>
                            </tr>
                          )}
                        </>
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
                    Items will be transferred from {formData.suppCode || "HQ"} to {formData.itemsiteCode} using the selected batch quantities.
                    {(hasNoBatch || noBatchQty > 0) && " Some quantity will be taken from 'No Batch' items."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

TransferPreviewModal.displayName = "TransferPreviewModal";

export default AddPR;
