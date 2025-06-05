import React, { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "./ui/table";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus, FileText } from "lucide-react";
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
  onPageChange

}) {
  // const [currentPage, setCurrentPage] = useState(1);
  // const totalPages = Math.ceil(data.length / itemsPerPage);
  
  // Calculate the items to show on current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    onPageChange(newPage);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border shadow-sm hover:shadow-md transition-shadow duration-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">Item Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Link Code</TableHead>
              <TableHead>Bar Code</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>On Hand Qty</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Expiry date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={14} message="Loading..." />
            ) : currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <FileText size={40} />
                    <p>No items Found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (

              currentItems.filter(ite=>ite.isActive==='True').map((item, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <TableCell>{item.stockCode || "-"}</TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal break-words">
                    {item.stockName || "-"}
                  </TableCell>
                  <TableCell>{item.uomDescription || "-"}</TableCell>
                  <TableCell>{item.Brand || "-"}</TableCell>
                  <TableCell>{item.linkCode || "-"}</TableCell>
                  <TableCell>{item.barCode || "-"}</TableCell>
                  <TableCell>{item.Range || "-"}</TableCell>
                  <TableCell>{item.quantity || "0"}</TableCell>
                  <TableCell className="text-start">
                    <Input
                      type="number"
                      className="w-20"
                      value={item.Qty}
                      onChange={(e) => onQtyChange(e, startIndex + index)}
                      min="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20"
                      value={item.Price}
                      onChange={(e) => onPriceChange(e, startIndex + index)}
                      min="0"
                    />
                  </TableCell>
                  <TableCell>{item.Cost || "0"}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="w-35"
                      value={item.expiryDate}
                      onChange={(e) => onExpiryDateChange(e, startIndex + index)}
                      min="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAddToCart(startIndex + index, item)}
                      className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
