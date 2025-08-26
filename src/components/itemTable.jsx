import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./ui/table";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, FileText, Loader2 } from "lucide-react";
// import { TableSpinner } from "./ui/table-spinner";
import Pagination from "./pagination";
import TableSpinner from "./tabelSpinner";

function ItemTable({
  data,
  loading,
  onQtyChange,
  onPriceChange,
  onExpiryDateChange,
  onAddToCart,
  currentPage,
  itemsPerPage,
  totalPages,
  onPageChange,
  onHandQty,
  emptyMessage, // <-- Add this prop
  showBatchColumns = false,
  qtyLabel = "Qty",
  priceLabel = "Price",
  costLabel = "Cost",
  // New props for Stock Take features
  enableSorting = false,
  onSort = null,
  sortConfig = null,
  showVariance = false,
  showRemarks = false,
  onRemarksChange = null,
  canEdit = () => true,
  onBatchNoChange = null,
  onExpiryDateChangeBatch = null,
  allowNegativeQty = false, // New prop to allow negative quantities
}) {
  // Get user details from localStorage
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const showPrice = (userDetails?.isSettingViewPrice === "True");
  const showCost = (userDetails?.isSettingViewCost === "True");
  const showPriceAndCost = showPrice || showCost;
  // const [currentPage, setCurrentPage] = useState(1);
  // const totalPages = Math.ceil(data.length / itemsPerPage);

  // Calculate the items to show on current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    onPageChange(newPage);
  };

  // Handle sorting
  const handleSort = (key) => {
    if (enableSorting && onSort) {
      onSort(key);
    }
  };

  // Calculate variance for Stock Take
  const calculateVariance = (item) => {
    if (!showVariance) return null;
    const stockTakeQty = parseFloat(item.Qty) || 0;
    const onHandQty = parseFloat(item.quantity) || 0;
    return stockTakeQty - onHandQty;
  };

  // Get variance styling
  const getVarianceStyle = (variance) => {
    if (variance === null) return "";
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "text-gray-600";
  };

  // Get row styling for variance
  const getRowStyle = (item) => {
    if (!showVariance) return "hover:bg-gray-50 transition-colors duration-150";
    const variance = calculateVariance(item);
    return `hover:bg-gray-50 transition-colors duration-150 ${
      variance !== 0 ? "bg-yellow-50" : ""
    }`;
  };

  // Get input styling for variance
  const getInputStyle = (item) => {
    if (!showVariance) return "";
    const variance = calculateVariance(item);
    return `${
      !canEdit() ? "bg-gray-100" : ""
    } ${
      variance !== 0 ? "border-yellow-400 bg-yellow-50" : ""
    }`;
  };

  // Calculate column span for different modes
  const getColSpan = () => {
    let span = 12; // Base columns
    if (showBatchColumns) span += 2;
    if (showVariance) span += 1;
    if (showRemarks) span += 1;
    if (showPrice) span += 1; // Price column
    if (showCost) span += 1; // Cost column
    return span;
  };

   const format_Date = (dateString) => {
    if (!dateString) return "-";
  
    try {
      let date;
      
      // Handle different date formats
      if (typeof dateString === 'string') {
        // Handle "21/11/2025 12:00:00 AM" format
        if (dateString.includes('/')) {
          const parts = dateString.split(' ')[0].split('/');
          if (parts.length === 3) {
            // Format: DD/MM/YYYY
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          }
        } else {
          // Handle ISO format or other standard formats
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
  
      if (isNaN(date.getTime())) return "-";
  
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
  
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return "-";
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border shadow-sm hover:shadow-md transition-shadow duration-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead 
                className={`font-semibold ${enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}`}
                onClick={() => handleSort("stockCode")}
              >
                Item Code{" "}
                {enableSorting && (
                  sortConfig?.key === "stockCode" ? 
                    (sortConfig.direction === "asc" ? "↑" : "↓") : 
                    "↕"
                )}
              </TableHead>
              <TableHead 
                className={enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}
                onClick={() => handleSort("stockName")}
              >
                Description{" "}
                {enableSorting && (
                  sortConfig?.key === "stockName" ? 
                    (sortConfig.direction === "asc" ? "↑" : "↓") : 
                    "↕"
                )}
              </TableHead>
              <TableHead>UOM</TableHead>
              <TableHead 
                className={enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}
                onClick={() => handleSort("Brand")}
              >
                Brand{" "}
                {enableSorting && (
                  sortConfig?.key === "Brand" ? 
                    (sortConfig.direction === "asc" ? "↑" : "↓") : 
                    "↕"
                )}
              </TableHead>
              <TableHead>Link Code</TableHead>
              <TableHead>Bar Code</TableHead>
              <TableHead 
                className={enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}
                onClick={() => handleSort("Range")}
              >
                Range{" "}
                {enableSorting && (
                  sortConfig?.key === "Range" ? 
                    (sortConfig.direction === "asc" ? "↑" : "↓") : 
                    "↕"
                )}
              </TableHead>
              <TableHead 
                className={enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}
                onClick={() => handleSort("quantity")}
              >
                On Hand Qty{" "}
                {enableSorting && (
                  sortConfig?.key === "quantity" ? 
                    (sortConfig.direction === "asc" ? "↑" : "↓") : 
                    "↕"
                )}
              </TableHead>
              {showBatchColumns && <TableHead>Batch No</TableHead>}
              {window?.APP_CONFIG?.EXPIRY_DATE === "Yes" && <TableHead>Batch Expiry</TableHead>}
              <TableHead className="font-semibold">{qtyLabel}</TableHead>
              {showVariance && (
                <TableHead 
                  className={enableSorting ? "cursor-pointer hover:bg-gray-100" : ""}
                  onClick={() => handleSort("variance")}
                >
                  Variance{" "}
                  {enableSorting && (
                    sortConfig?.key === "variance" ? 
                      (sortConfig.direction === "asc" ? "↑" : "↓") : 
                      "↕"
                  )}
                </TableHead>
              )}
              {showRemarks && <TableHead>Remarks</TableHead>}
              {showPrice && <TableHead>{priceLabel}</TableHead>}
              {showCost && <TableHead>{costLabel}</TableHead>}
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={getColSpan()} message="Loading..." />
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={getColSpan()} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <FileText size={40} />
                    <p>{emptyMessage || "No items Found"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentItems
                .filter((ite) => ite.isActive === "True")
                .map((item, index) => {
                  const variance = calculateVariance(item);
                  
                  return (
                    <TableRow
                      key={index}
                      className={getRowStyle(item)}
                    >
                      <TableCell className="font-medium">
                        {item.stockCode || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal break-words">
                        {item.stockName || "-"}
                      </TableCell>
                      <TableCell>{item.uomDescription || item.itemUom || "-"}</TableCell>
                      <TableCell>{item.Brand || item.brand || "-"}</TableCell>
                      <TableCell>{item.linkCode || "-"}</TableCell>
                      <TableCell>{item.barCode || item.brandCode || "-"}</TableCell>
                      <TableCell>{item.Range || item.range || "-"}</TableCell>
                      <TableCell className="text-left  font-medium">
                        {item.quantity || "0"}
                      </TableCell>
                      {showBatchColumns && (
                        <TableCell>
                          {item.batchno || "-"}
                        </TableCell>
                      )}
                      {window?.APP_CONFIG?.EXPIRY_DATE === "Yes" && (
                        <TableCell>
                          {format_Date(item.batchexpirydate) || "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-start">
                        <Input
                          type="number"
                          className={`w-20 text-right ${getInputStyle(item)}`}
                          value={item.Qty}
                          onChange={(e) => onQtyChange(e, startIndex + index)}
                          min={allowNegativeQty ? undefined : "0"}
                          // Remove max restriction to allow unlimited positive quantities
                          // step="0.01"
                          disabled={!canEdit()}
                          placeholder="0"
                        />
                      </TableCell>
                      {showVariance && (
                        <TableCell
                          className={`text-right font-medium ${getVarianceStyle(variance)}`}
                        >
                          {variance > 0 ? "+" : ""}
                          {variance}
                        </TableCell>
                      )}
                      {showRemarks && (
                        <TableCell>
                          <Input
                            className="w-32"
                            value={item.remarks || ""}
                            onChange={(e) => onRemarksChange && onRemarksChange(e, startIndex + index)}
                            placeholder="Add remarks"
                            disabled={!canEdit()}
                          />
                        </TableCell>
                      )}
                      {showPrice && (
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            value={item.Price}
                            onChange={(e) => onPriceChange(e, startIndex + index)}
                            min="0"
                          />
                        </TableCell>
                      )}
                      {showCost && <TableCell>{ item.batchcost||item.Cost|| "0"}</TableCell>}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAddToCart(startIndex + index, item)}
                          className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                          disabled={!canEdit()}
                        >
                          <Plus className="h-4 w-4" />
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
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default ItemTable;
