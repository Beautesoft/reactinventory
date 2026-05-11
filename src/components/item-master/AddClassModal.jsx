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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";

export function AddClassModal({ open, onOpenChange, onSuccess }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDesc("");
      setIsActive(true);
      itemMasterApi.getItemClasses().then((res) => {
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
      await itemMasterApi.createItemClass({
        itmCode: code,
        itmDesc: desc.trim(),
        itmIsactive: isActive,
      });
      toast.success("Class added");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Class</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Code</Label>
              <Input value={code} disabled className="mt-1 bg-gray-50" />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Description <span className="text-red-500">*</span></Label>
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Enter description"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center pt-2 border-t">
            <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
            <Label htmlFor="isActive" className="ml-2 cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
