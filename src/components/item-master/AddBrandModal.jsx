import React, { useState, useEffect } from "react";
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

export function AddBrandModal({ open, onOpenChange, onSuccess }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDesc("");
      itemMasterApi.getItemBrands().then((res) => {
        const list = Array.isArray(res) ? res : [];
        const last = list[list.length - 1];
        const nextCode = last ? String(Number(last.itmCode) + 1) : "1";
        setCode(nextCode);
      }).catch(() => setCode("1"));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!desc?.trim()) {
      toast.error("Description is required");
      return;
    }
    setLoading(true);
    try {
      await itemMasterApi.createItemBrand({
        itmCode: code,
        itmDesc: desc.trim(),
        itmStatus: true,
      });
      toast.success("Brand added");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Brand</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Code</Label>
            <Input value={code} disabled className="mt-1" />
          </div>
          <div>
            <Label>Description *</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter description"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
