import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, History } from "lucide-react";
import itemMasterApi from "@/services/itemMasterApi";

function getDivisionPriceLabel(divisionLabel) {
  if (divisionLabel == null || divisionLabel === "") return "Item price";
  const u = String(divisionLabel).toUpperCase();
  if (u === "3" || u.includes("SERVICE")) return "Service price";
  if (u === "4" || u.includes("VOUCHER")) return "Voucher price";
  if (u === "5" || u.includes("PREPAID")) return "Prepaid price";
  return "Item price";
}

export function CostHistoryTimelineModal({ open, onOpenChange, itemCode, itemName, divisionLabel }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const labelForNoUom = getDivisionPriceLabel(divisionLabel);

  useEffect(() => {
    if (open && itemCode) {
      setLoading(true);
      setLogs([]);
      itemMasterApi
        .getItemCostHistory(itemCode)
        .then((res) => {
          const list = Array.isArray(res) ? res : [];
          setLogs(list);
        })
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [open, itemCode]);

  const formatDate = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString("en-GB", { hour12: false }); // HH:mm:ss
    return `${day}/${month}/${year}, ${time}`;
  };

  const formatNum = (val) => {
    if (val == null || val === "") return "-";
    const n = Number(val);
    return isNaN(n) ? val : n.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Cost Change History
            {itemCode && (
              <span className="text-sm font-normal text-gray-600">
                — {itemCode}
                {itemName ? ` (${itemName})` : ""}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <History className="w-12 h-12 text-gray-300 mb-2" />
              <p className="font-medium">No cost history for this item</p>
              <p className="text-sm">Cost changes will appear here after create or edit.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date/Time</TableHead>
                    <TableHead className="font-semibold">UOM</TableHead>
                    <TableHead className="font-semibold text-right">Cost</TableHead>
                    <TableHead className="font-semibold text-right">Price</TableHead>
                    <TableHead className="font-semibold text-right">Min Margin %</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={log.id ?? idx}>
                      <TableCell className="text-sm">{formatDate(log.effectiveAt)}</TableCell>
                      <TableCell>{log.itemUom ? log.itemUom : labelForNoUom}</TableCell>
                      <TableCell className="text-right font-medium">{formatNum(log.itemCost)}</TableCell>
                      <TableCell className="text-right">{formatNum(log.itemPrice)}</TableCell>
                      <TableCell className="text-right">{formatNum(log.minMargin)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            log.changeType === "CREATE"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.changeType ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{log.createdBy ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
