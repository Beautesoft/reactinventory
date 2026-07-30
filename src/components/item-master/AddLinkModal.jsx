import React, { useState } from "react";
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

export function AddLinkModal({ open, onOpenChange, onSuccess }) {
  const [linkCode, setLinkCode] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!linkCode.trim() || !linkDesc.trim()) {
      toast.error("Link Code and Description are required");
      return;
    }
    setLoading(true);
    try {
      await itemMasterApi.createItemLinks({
        linkCode: linkCode.trim(),
        linkDesc: linkDesc.trim(),
        linkFactor: 0,
        linkType: "",
        itmIsactive: true,
        rptCodeStatus: false,
      });
      toast.success("Link code created");
      setLinkCode("");
      setLinkDesc("");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Link Code</Label>
            <Input value={linkCode} onChange={(e) => setLinkCode(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddLinkModal;
