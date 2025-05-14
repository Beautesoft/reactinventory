import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, PrinterIcon } from "lucide-react";
import TableSpinner from "./tabelSpinner";
import { useNavigate } from "react-router-dom";
import { useGrn } from "@/context/grnContext";
import { useGto } from "@/context/gtoContext";
import apiService from "@/services/apiService";
import { toast } from "sonner";

function GoodsReceiveTable({ data, isLoading, type = "grn" }) {
  const navigate = useNavigate();
  const { setDefaultdata: setGrnDefault } = useGrn();
  const { setDefaultdata: setGtoDefault } = useGto();

  // Use ref for caching supplier details
  const supplierCache = useRef(new Map());
  const [supplierDetails, setSupplierDetails] = useState({});

  useEffect(() => {
    if (type === "grn" && data?.length > 0) {
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

            // Update cache with new supplier details
            res.forEach((supplier) => {
              supplierCache.current.set(supplier.splyCode, supplier.supplydesc);
            });

            // Update state with all supplier details
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

        // Add cached suppliers to state
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

  const dateConvert = (date) => {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const handleDetails = (item) => {
    const status = item.docStatus === 7 ? "7" : "0";
    const basePath =
      type === "grn" ? "goods-receive-note" : "goods-transfer-out";

    navigate(`/${basePath}/details/${item.docNo}?status=${status}`, {
      state: { item },
    });
  };

  const printNote = (item) => {
    const basePath =
      type === "grn" ? "goods-receive-note" : "goods-transfer-out";
    navigate(`/${basePath}/print/${item.docNo}`, { state: { item } });
  };

  const tableHeaders = {
    grn: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Invoice Date" },
      { key: "docRef1", label: "Ref Number" },
      { key: "supplyNo", label: "Supplier" },
      { key: "docAmt", label: "Total Quantity" },
      { key: "docStatus", label: "Status" },
      { key: "print", label: "Print" },
    ],
    gto: [
      { key: "docNo", label: "Doc Number" },
      { key: "docDate", label: "Doc Date" },
      { key: "docRef1", label: "Ref Number 1" },
      { key: "docRef2", label: "Ref Number 2" },
      { key: "docAmt", label: "Total Quantity" },
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
            {headers.map((header) => (
              <TableHead
                key={header.key}
                className={header.key === "docNo" ? "w-[100px]" : ""}
              >
                {header.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="p-5">
          {isLoading ? (
            <TableSpinner colSpan={headers.length} message="Loading data..." />
          ) : data.length > 0 ? (
            data.map((item, index) => (
              <TableRow key={index}>
                <TableCell
                  onClick={() => handleDetails(item)}
                  className="cursor-pointer text-gray-600 hover:text-black underline"
                >
                  {item.docNo}
                </TableCell>
                <TableCell>{dateConvert(item.docDate)}</TableCell>
                <TableCell>{item.docRef1 || "-"}</TableCell>
                <TableCell>
                  {type === "grn"
                    ? supplierDetails[item.supplyNo] || item.supplyNo || "-"
                    : item.docRef2 || "-"}
                </TableCell>
                <TableCell>{item.docAmt}</TableCell>
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
              </TableRow>
            ))
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
