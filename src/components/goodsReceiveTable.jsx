import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, PrinterIcon } from "lucide-react";
import TableSpinner from "./tabelSpinner";
import { useNavigate } from "react-router-dom";

function GoodsReceiveTable({ data, isLoading }) {
  const navigate = useNavigate();
  const dateConvert = (date) => {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const handleDetails = (item) => {
    const status = item.docStatus === 7 ? "7" : "0";
    navigate(`/goods-receive-note/details/${item.docNo}?status=${status}`, {
      state: { item },
    });
  };

  const printNote = (item) => {
    navigate(`/goods-receive-note/print/${item.docNo}`, { state: { item } });
  };

  return (
    <div className="overflow-x-auto w-full h-full p-1 rounded-lg shadow-md">
      <Table className="">
        <TableHeader className={"bg-gray-100 p-2"}>
          <TableRow>
            <TableHead className="w-[100px]">Doc Number</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Ref Number</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Total Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Print</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="p-5">
          {isLoading ? (
            <TableSpinner colSpan={7} message="Loading data..." />
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
                <TableCell>{item.supplyNo}</TableCell>
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
                <TableCell className="text-left flex justify-end pr-4 ">
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
                colSpan={7}
                className="text-center py-43 text-gray-500"
              >
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-10 h-10 text-gray-400" />{" "}
                  {/* Lucide-react icon */}
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
