import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, PrinterIcon, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import TableSpinner from "./tabelSpinner";
import { useNavigate } from "react-router-dom";
import { useGrn } from "@/context/grnContext";
import { useGto } from "@/context/gtoContext";
import apiService from "@/services/apiService";
import { toast } from "sonner";

function GoodsReceiveTable({ data, isLoading, type = "grn", onSort }) {
  const navigate = useNavigate();
  const { setDefaultdata: setGrnDefault } = useGrn();
  const { setDefaultdata: setGtoDefault } = useGto();

  // Get user details from localStorage
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const showTotalAmount = userDetails?.isSettingViewPrice === "True";

  // Use ref for caching supplier details
  const supplierCache = useRef(new Map());
  const [supplierDetails, setSupplierDetails] = useState({});
  const [stockTakeDetails, setStockTakeDetails] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  useEffect(() => {
    if ((type === "grn" || type === "rtn") && data?.length > 0) {
      const fetchSupplierNames = async () => {
        const uniqueSupplyNos = [...new Set(data.map((item) => item.supplyNo))];
        const uncachedSuppliers = uniqueSupplyNos.filter(
          (code) => code && !supplierCache.current.has(code)
        );

        if (uncachedSuppliers.length > 0) {
          try {
            const res = await apiService.get(
              `ItemSupplies?filter={"where":{"splyCode":{"inq":${JSON.stringify(
                uncachedSuppliers
              )}}}}`
            );

            res.forEach((supplier) => {
              supplierCache.current.set(supplier.splyCode, supplier.supplydesc);
            });

            setSupplierDetails((prev) => ({
              ...prev,
              ...Object.fromEntries(
                res.map((supplier) => [supplier.splyCode, supplier.supplydesc])
              ),
            }));
          } catch (err) {
            console.error("Error fetching supplier details:", err);
            toast.error("Failed to fetch supplier details");
          }
        }

        const cachedDetails = {};
        uniqueSupplyNos.forEach((code) => {
          if (supplierCache.current.has(code)) {
            cachedDetails[code] = supplierCache.current.get(code);
          }
        });
        setSupplierDetails((prev) => ({ ...prev, ...cachedDetails }));
      };

      fetchSupplierNames();
    }
  }, [data, type]);

  // Fetch stock take details for tke type
  useEffect(() => {
    if (type === "tke" && data?.length > 0) {
      const fetchStockTakeDetails = async () => {
        try {
          const docNos = data.map(item => item.docNo);
          const promises = docNos.map(async (docNo) => {
            try {
              const response = await apiService.get(
                `StkMovdocDtls?filter=${encodeURIComponent(JSON.stringify({where: {docNo: docNo}}))}`
              );
              
              const stockCount = response.length;
              const totalSystemQty = response.reduce((sum, item) => sum + (parseFloat(item.systemQty) || 0), 0);
              const totalCountedQty = response.reduce((sum, item) => sum + (parseFloat(item.trnQty) || 0), 0);
              const variance = totalCountedQty - totalSystemQty;
              
              return {
                docNo,
                stockCount,
                totalSystemQty,
                totalCountedQty,
                variance
              };
            } catch (error) {
              console.error(`Error fetching details for ${docNo}:`, error);
              return {
                docNo,
                stockCount: 0,
                totalSystemQty: 0,
                totalCountedQty: 0,
                variance: 0
              };
            }
          });
          
          const results = await Promise.all(promises);
          const detailsMap = {};
          results.forEach(result => {
            detailsMap[result.docNo] = result;
          });
          
          setStockTakeDetails(detailsMap);
        } catch (error) {
          console.error("Error fetching stock take details:", error);
        }
      };
      
      fetchStockTakeDetails();
    }
  }, [data, type]);

  const dateConvert = (date) => {
    if (!date) return "-";
    console.log(date)
    
    if (type === "gtoOwn") {
      // For gto type, date is already in DD/MM/YYYY format
      return date;
    }
    
    // For other types, convert the date to DD/MM/YYYY
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDetails = (item) => {
    const status = item.docStatus === 7 ? "7" : "0";
    console.log(type)
    const basePath = 
      type === "grn" ? "goods-receive-note" 
      : type === "gto" ? "goods-transfer-out"
      : type === "gti" ? "goods-transfer-in"
      : type === "rtn" ? "goods-return-note"
      : type === "adj" ? "stock-adjustment" 
      : type === "sum" ? "stock-usage-memo"
      : type === "tke" ? "stock-take"
      : "goods-transfer-in";

    navigate(`/${basePath}/details/${item.docNo}?status=${status}`, {
      state: { item },
    });
    console.log(basePath)
  };

  const printNote = (item) => {
    console.log(item,'item')
    const basePath = 
      type === "grn" ? "goods-receive-note" 
      : type === "gto" ? "goods-transfer-out"
      : type === "gti" ? "goods-transfer-in"
      : type === "rtn" ? "goods-return-note"
      : type === "adj" ? "stock-adjustment" 
      : type === "sum" ? "stock-usage-memo"
      : type === "tke" ? "stock-take"
      : "goods-receive-note";
    navigate(`/${basePath}/print/${item.docNo}`, { state: { item } });
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    
    // Call parent's onSort with the new sort configuration
    if (onSort) {
      onSort(key, direction);
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1" />;
    }
    return sortConfig.direction === 'ascending' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === 'docDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortConfig.key === 'supplyNo' && (type === 'grn' || type === 'rtn')) {
        aValue = supplierDetails[aValue] || aValue;
        bValue = supplierDetails[bValue] || bValue;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig, supplierDetails, type]);

  const tableHeaders = {
    grn: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Invoice Date" },
      { key: "docRef1", label: "Ref Number" },
      { key: "supplyNo", label: "Supplier" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
    rtn: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Return Date" },
      { key: "docRef1", label: "Ref Number" },
      { key: "supplyNo", label: "Supplier" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
    gto: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Doc Date" },
      { key: "docRef1", label: "Ref Number 1" },
      { key: "docRef2", label: "Ref Number 2" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
    gti: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Doc Date" },
      { key: "docRef1", label: "Ref Number 1" },
      { key: "docRef2", label: "Ref Number 2" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
    gtoOwn: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Doc Date" },
      { key: "docRef1", label: "Ref Number 1" },
      { key: "docRef2", label: "Ref Number 2" },
      { key: "docRemark", label: "Remarks" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
    ],
    gtiOwn: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Doc Date" },
      { key: "docRef1", label: "Ref Number 1" },
      { key: "docRef2", label: "Ref Number 2" },
      { key: "docRemark", label: "Remarks" },
      { key: "docQty", label: "Total Quantity" },
      ...(showTotalAmount ? [{ key: "docAmt", label: "Total Amount" }] : []),
    ],
    tke: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Date" },
      { key: "stockCount", label: "No of Stock" },
      { key: "docQty", label: "Total Quantity Counted" },
      { key: "variance", label: "Variance" },
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
  };

  const headers = tableHeaders[type] || tableHeaders.grn;

  return (
    <div className="overflow-x-auto w-full h-full p-1 rounded-lg shadow-md">
      <Table>
        <TableHeader className="bg-gray-100 p-2">
          <TableRow>
            {headers.map((header) => {
              // Determine alignment based on header key and type
              let alignmentClass = "text-left";
              if (type === "tke") {
                if (header.key === "docNo") alignmentClass = "text-left";
                else if (header.key === "docDate") alignmentClass = "text-center";
                else if (header.key === "stockCount") alignmentClass = "text-center";
                else if (header.key === "docQty") alignmentClass = "text-right";
                else if (header.key === "variance") alignmentClass = "text-right";
                else if (header.key === "docStatus") alignmentClass = "text-center";
                else if (header.key === "print") alignmentClass = "text-center";
              }
              
              return (
                <TableHead
                  key={header.key}
                  className={`${header.key === "docNo" ? "w-[100px]" : ""} ${
                    header.key !== "print" ? "cursor-pointer hover:bg-gray-200" : ""
                  } ${alignmentClass}`}
                  onClick={() => header.key !== "print" && handleSort(header.key)}
                >
                  <div className={`flex items-center ${
                    alignmentClass === "text-center" ? "justify-center" : 
                    alignmentClass === "text-right" ? "justify-end" : "justify-start"
                  }`}>
                    {header.label}
                    {header.key !== "print" && getSortIcon(header.key)}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody className="p-5">
          {isLoading ? (
            <TableSpinner colSpan={headers.length} message="Loading data..." />
          ) : sortedData.length > 0 ? (
            sortedData.map((item, index) => {
              const stockDetails = stockTakeDetails[item.docNo] || {};
              
              return (
                <TableRow key={index}>
                  {type === "gtoOwn" ? (
                    <>
                      <TableCell>{item.docNo}</TableCell>
                      <TableCell>{dateConvert(item.docDate)}</TableCell>
                      <TableCell>{item.docRef1 || "-"}</TableCell>
                      <TableCell>{item.docRef2 || "-"}</TableCell>
                      <TableCell>{item.docRemark || "-"}</TableCell>
                      <TableCell>{item.docQty || 0}</TableCell>
                      {showTotalAmount && <TableCell>{item.docAmt || 0}</TableCell>}
                    </>
                  ) : type === "tke" ? (
                    <>
                      <TableCell
                        onClick={() => handleDetails(item)}
                        className="cursor-pointer text-gray-600 hover:text-black underline text-left"
                      >
                        {item.docNo}
                      </TableCell>
                      <TableCell className="text-center">
                        {dateConvert(item.docDate)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {stockDetails.stockCount || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {stockDetails.totalCountedQty || item.docQty || 0}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        (stockDetails.variance || 0) > 0 
                          ? 'text-green-600' 
                          : (stockDetails.variance || 0) < 0 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                      }`}>
                        {(stockDetails.variance || 0) > 0 ? '+' : ''}{(stockDetails.variance || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-center font-semibold ${
                          item.docStatus === 2
                            ? "text-green-600"
                            : item.docStatus === 1
                            ? "text-blue-600"
                            : item.docStatus === 3
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {item.docStatus === 2 ? "Approved" 
                         : item.docStatus === 1 ? "Submitted" 
                         : item.docStatus === 3 ? "Rejected" 
                         : "Saved"}
                      </TableCell>
                      <TableCell className="text-center">
                        <PrinterIcon
                          onClick={() => printNote(item)}
                          className="icon-print cursor-pointer mx-auto"
                          aria-label="Print"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell
                        onClick={() => handleDetails(item)}
                        className="cursor-pointer text-gray-600 hover:text-black underline"
                      >
                        {item.docNo}
                      </TableCell>
                      <TableCell>{dateConvert(item.docDate)}</TableCell>
                      <TableCell>{item.docRef1 || "-"}</TableCell>
                      <TableCell>
                        {(type === "grn" || type === "rtn")
                          ? supplierDetails[item.supplyNo] || item.supplyNo || "-"
                          : item.docRef2 || "-"}
                      </TableCell>
                      <TableCell>{item.docQty}</TableCell>
                      {showTotalAmount && <TableCell>{item.docAmt}</TableCell>}
                      <TableCell
                        className={
                          item.docStatus === 7
                            ? "text-green-600 font-semibold"
                            : "text-yellow-600 font-semibold"
                        }
                      >
                        {item.docStatus === 7 ? "Posted" : "Open"}
                      </TableCell>
                      <TableCell className="text-left flex pr-4">
                        <PrinterIcon
                          onClick={() => printNote(item)}
                          className="icon-print cursor-pointer"
                          aria-label="Print"
                        />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center py-43 text-gray-500"
              >
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-10 h-10 text-gray-400" />
                  <span>No data available</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default GoodsReceiveTable;
