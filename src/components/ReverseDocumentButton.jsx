import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  previewReverseSet,
  reverseDocument,
} from "@/services/docReverseApi";

function isPostedHeader(header) {
  const status = header?.docStatus;
  if (header?.movCode === "TKE") {
    return status === 1 || status === "1" || status === 7 || status === "7";
  }
  return status === 7 || status === "7";
}

function ReverseDocumentButton({ header, listPath }) {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const isAdmin = userDetails?.isSettingEnabled === "Y";

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);

  // Hidden until void/reverse functionality is complete
  if (true) return null;

  if (!isAdmin || !header?.docNo || !isPostedHeader(header)) return null;

  const step = preview?.steps?.[0];
  const blocked = Boolean(preview?.issues?.length);
  const nothingToReverse = step?.kind === "header-only";

  const handlePreview = async () => {
    setPreviewing(true);
    setProgress(null);
    try {
      const result = await previewReverseSet([header]);
      setPreview(result);
      setConfirmText("");
      setPreviewOpen(true);
      if (result.issues.length) {
        toast.error(
          "On-hand would go negative. Reverse a later usage or transfer first."
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmReverse = async () => {
    if (confirmText.trim().toUpperCase() !== "REVERSE") return;
    setConfirmText("");
    setRunning(true);
    setProgress(null);
    try {
      const result = await reverseDocument(header, {
        onProgress: (entry) => setProgress(entry),
      });
      if (result.status === "error") {
        toast.error(result.detail || "Reverse failed");
        return;
      }
      if (result.status === "skipped") {
        toast.info(result.detail || "No stock movements to reverse");
        setPreviewOpen(false);
        setPreview(null);
        return;
      }
      toast.success(
        "Reversed. Header stays Posted. Stock movements were removed."
      );
      setPreviewOpen(false);
      setPreview(null);
      if (listPath) navigate(listPath);
    } catch (err) {
      toast.error(err?.message || "Reverse failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handlePreview}
        disabled={previewing || running}
        className="cursor-pointer"
      >
        {previewing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Undo2 className="h-4 w-4 mr-2" />
        )}
        Void/Revert
      </Button>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (running) return;
          setPreviewOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent
          className="flex flex-col gap-0 p-0 sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-hidden"
          onPointerDownOutside={(e) => {
            if (running) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (running) e.preventDefault();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <DialogTitle>Preview void/revert — {header.docNo}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Undo on-hand qty, then delete Stktrns. This document stays Posted
              and is not deleted.
            </p>
            {preview?.issues?.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 space-y-1">
                {preview.issues.map((msg, i) => (
                  <div key={i}>{msg}</div>
                ))}
              </div>
            )}
            {step && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{step.message}</p>
                {step.movements?.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Site</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead>Undo</TableHead>
                        <TableHead>On-hand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {step.movements.map((m, i) => (
                        <TableRow key={`${m.itemcode}-${i}`}>
                          <TableCell>{m.itemcode}</TableCell>
                          <TableCell>{m.storeNo}</TableCell>
                          <TableCell>{m.trnQty}</TableCell>
                          <TableCell>{m.undoQty}</TableCell>
                          <TableCell>
                            {m.onHandAfter != null
                              ? `${m.onHandBefore} → ${m.onHandAfter}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
            {running && progress && (
              <p className="text-sm text-gray-600">
                {progress.status}: {progress.detail}
              </p>
            )}
            {!blocked && !nothingToReverse && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Type REVERSE to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="REVERSE"
                  disabled={running}
                />
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={running}
            >
              Cancel
            </Button>
            <Button
              disabled={
                blocked ||
                nothingToReverse ||
                running ||
                confirmText.trim().toUpperCase() !== "REVERSE"
              }
              onClick={handleConfirmReverse}
            >
              {running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4 mr-2" />
              )}
              {running ? "Reverting…" : "Void/Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReverseDocumentButton;
