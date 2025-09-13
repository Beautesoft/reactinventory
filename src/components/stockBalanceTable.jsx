import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TableSpinner from "@/components/tabelSpinner";
import { FileText, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

const StockBalanceTable = ({ 
  data, 
  isLoading, 
  onSort, 
  onBatchClick,
  sortConfig = { key: null, direction: "ascending" },
  pagination = { skip: 0, limit: 10 }
}) => {
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    onSort(key, direction);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const getStatusBadge = (item) => {
    // Calculate total quantity for status determination
    // Using API field names: quantity, StockQty, ReqQty, etc.
    const balQty = item.quantity || item.StockQty || 0;
    const onHoldQty = item.onHoldQty || 0; // This might not be in the API, keeping for compatibility
    const poQty = item.poQty || item.ReqQty || 0; // Map ReqQty to PO Qty
    const totalQty = balQty + onHoldQty + poQty;
    
    if (totalQty > 0) {
      return <Badge variant="success" className="bg-green-100 text-green-800">In Stock</Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-100 text-red-800">Out of Stock</Badge>;
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow className="border-b border-slate-200">
            <TableHead className="font-semibold text-slate-700">No</TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("stockCode")}
            >
              <div className="flex items-center gap-2">
                Stock Code
                {getSortIcon("stockCode")}
              </div>
            </TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("stockName")}
            >
              <div className="flex items-center gap-2">
                Stock Name
                {getSortIcon("stockName")}
              </div>
            </TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("Brand")}
            >
              <div className="flex items-center gap-2">
                Brand
                {getSortIcon("Brand")}
              </div>
            </TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("onHoldQty")}
            >
              <div className="flex items-center gap-2">
                On Hold Qty
                {getSortIcon("onHoldQty")}
              </div>
            </TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("poQty")}
            >
              <div className="flex items-center gap-2">
                PO Qty
                {getSortIcon("poQty")}
              </div>
            </TableHead>
            <TableHead 
              className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200"
              onClick={() => handleSort("quantity")}
            >
              <div className="flex items-center gap-2">
                Bal Qty
                {getSortIcon("quantity")}
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSpinner colSpan={9} />
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10">
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <FileText size={40} />
                  <p>No stock data found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              // Calculate the actual row number considering pagination
              const rowNumber = pagination.skip + index + 1;
              
              return (
                <TableRow
                  key={index}
                  className="hover:bg-slate-100/50 transition-colors duration-150 border-b border-slate-200"
                >
                  <TableCell className="font-medium">
                    {rowNumber}
                  </TableCell>
                <TableCell className="font-medium text-blue-600">
                  {item.stockCode}
                </TableCell>
                <TableCell>{item.stockName}</TableCell>
                <TableCell>{item.Brand}</TableCell>
                <TableCell className="text-center">
                  {item.onholdqty || 0}
                </TableCell>
                <TableCell className="text-center">
                  {item.poqty || item.ReqQty || 0}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {item.quantity || item.StockQty || 0}
                </TableCell>
                <TableCell>
                  {getStatusBadge(item)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBatchClick(item)}
                    className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 font-bold text-lg w-10 h-10 rounded-lg border-2 border-blue-300 hover:border-blue-500"
                    title="View Batch Details"
                  >
                    B
                  </Button>
                </TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StockBalanceTable;
