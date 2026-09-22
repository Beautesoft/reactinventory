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
import { isPostedDocStatus, isVoidDocStatus } from "@/utils/utils";

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

  if (
    !isAdmin ||
    !header?.docNo ||
    isVoidDocStatus(header?.docStatus) ||
    !isPostedDocStatus(header?.docStatus, header?.movCode)
  ) {
    return null;
  }

  const step = preview?.steps?.[0];
  const blocked = Boolean(preview?.issues?.length);
  const headerOnly = step?.kind === "header-only";

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
    if (confirmText.trim().toUpperCase() !== "VOID") return;
    setConfirmText("");
    setRunning(true);
    setProgress(null);
    try {
      const result = await reverseDocument(header, {
        onProgress: (entry) => setProgress(entry),
      });
      if (result.status === "error") {
        toast.error(result.detail || "Void failed");
        return;
      }
      if (result.status === "skipped") {
        toast.info(result.detail || "Nothing to void");
        setPreviewOpen(false);
        setPreview(null);
        return;
      }
      toast.success(
        "Voided. Stock qty reversed, reverse Stktrn posted, status set to Void."
      );
      setPreviewOpen(false);
      setPreview(null);
      if (listPath) navigate(listPath);
    } catch (err) {
      toast.error(err?.message || "Void failed");
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
              Reverse ItemBatches qty, insert a reverse Stktrn (originals are
              kept), then set status to Void (4). Only posted stock movements
              for this document are reversed.
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
                        <TableRow key={`${m.itemcode}-${m.storeNo}-${i}`}>
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
            {!blocked && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Type VOID to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="VOID"
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
                running ||
                confirmText.trim().toUpperCase() !== "VOID"
              }
              onClick={handleConfirmReverse}
            >
              {running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4 mr-2" />
              )}
              {running ? "Voiding…" : "Void/Revert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReverseDocumentButton;
