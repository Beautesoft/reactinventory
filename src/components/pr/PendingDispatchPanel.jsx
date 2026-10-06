import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import TableSpinner from "@/components/tabelSpinner";
import Pagination from "@/components/pagination";
import { prApi } from "@/services/prApi";
import { toast } from "sonner";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function PendingDispatchPanel({ searchTerm = "", onCountChange }) {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmLines, setConfirmLines] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const pageSize = 10;

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prApi.getPendingDispatchGtis(null, searchTerm);
      setRows(data);
      onCountChange?.(data.length);
      setPage(1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load items ready to ship");
      setRows([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, onCountChange]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const openConfirm = async (row) => {
    setConfirmRow(row);
    setConfirmLoading(true);
    try {
      const { details } = await prApi.getGtiWithDetails(row.docNo);
      setConfirmLines(details);
    } catch (err) {
      toast.error(err.message || "Failed to load transfer items");
      setConfirmRow(null);
      setConfirmLines([]);
    } finally {
      setConfirmLoading(false);
    }
  };

  useEffect(() => {
    const autoDocNo = location.state?.confirmDispatchGti;
    if (!autoDocNo || rows.length === 0) return;

    const match = rows.find((row) => row.docNo === autoDocNo);
    if (match) {
      openConfirm(match);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, rows]);

  const handleDispatch = async () => {
    if (!confirmRow?.docNo) return;
    setDispatching(true);
    try {
      const result = await prApi.executeDeliveryOrderOutByDocNo(confirmRow.docNo);
      if (result.alreadyDone) {
        toast.info("Already dispatched from HQ");
      } else {
        toast.success("Dispatch confirmed — HQ inventory updated");
      }
      setConfirmRow(null);
      setConfirmLines([]);
      await loadRows();
    } catch (err) {
      toast.error(err.message || "Dispatch failed. Please try again.");
    } finally {
      setDispatching(false);
    }
  };

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Approved requests ready to ship from HQ. Review items and confirm
        dispatch when goods are ready to send.
      </p>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>PR Number</TableHead>
              <TableHead>Transfer No</TableHead>
              <TableHead>To Store</TableHead>
              <TableHead>Doc Date</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSpinner colSpan={6} message="Loading..." />
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Nothing waiting to ship
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.docNo}>
                  <TableCell className="font-medium">{row.docRef1 || row.prNo || "-"}</TableCell>
                  <TableCell>{row.docNo}</TableCell>
                  <TableCell>{row.tstoreNo || "-"}</TableCell>
                  <TableCell>{formatDate(row.docDate)}</TableCell>
                  <TableCell>{row.docQty ?? 0}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => openConfirm(row)}
                    >
                      Dispatch
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(rows.length / pageSize))}
        onPageChange={setPage}
      />

      <Dialog
        open={Boolean(confirmRow)}
        onOpenChange={(open) => {
          if (!open && !dispatching) {
            setConfirmRow(null);
            setConfirmLines([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm dispatch</DialogTitle>
          </DialogHeader>
          {confirmRow && (
            <div className="space-y-3 text-sm">
              <p>
                Ship items for PR{" "}
                <strong>{confirmRow.docRef1 || confirmRow.prNo}</strong> to{" "}
                <strong>{confirmRow.tstoreNo}</strong>?
              </p>
              <p className="text-xs text-gray-500">
                Transfer ref: {confirmRow.docNo}
              </p>
              {confirmLoading ? (
                <div className="flex items-center gap-2 py-4 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading items...
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Item</TableHead>
                        <TableHead className="w-16">Qty</TableHead>
                        <TableHead className="w-16">UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {confirmLines.map((line, idx) => (
                        <TableRow key={`${line.itemcode}-${idx}`}>
                          <TableCell>
                            <div className="font-medium">{line.itemcode}</div>
                            <div className="text-xs text-gray-500">{line.itemdesc}</div>
                          </TableCell>
                          <TableCell>{line.docQty}</TableCell>
                          <TableCell>{line.docUom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={dispatching}
              onClick={() => {
                setConfirmRow(null);
                setConfirmLines([]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              disabled={dispatching || confirmLoading || !confirmLines.length}
              onClick={handleDispatch}
            >
              {dispatching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                "Confirm Dispatch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
