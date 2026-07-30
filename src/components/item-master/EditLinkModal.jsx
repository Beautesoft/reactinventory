import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";

export function EditLinkModal({ open, onOpenChange, link, onSuccess }) {
  const [linkDesc, setLinkDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && link) {
      setLinkDesc(link.linkDesc || "");
    }
  }, [open, link]);

  const handleSave = async () => {
    if (!link?.itmId) {
      toast.error("Cannot update — link not saved yet");
      return;
    }
    setLoading(true);
    try {
      await itemMasterApi.updateItemLink(link.itmId, {
        linkDesc: linkDesc.trim(),
        linkCode: link.linkCode,
      });
      toast.success("Link updated");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to update link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Link — {link?.linkCode}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label>Description</Label>
          <Input value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} className="mt-1.5" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditLinkModal;
