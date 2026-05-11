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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";

export function AddRangeModal({ open, onOpenChange, onSuccess, brand, brandCodeForDept, brandOptions = [] }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDesc("");
      setSelectedBrand(brand || "");
      setIsActive(true);
      itemMasterApi.getItemRanges().then((res) => {
        const list = Array.isArray(res) ? res : [];
        const last = list[list.length - 1];
        const nextCode = last ? String(Number(last.itmCode) + 1) : "1";
        setCode(nextCode);
      }).catch(() => setCode("1"));
    }
  }, [open, brand]);

  const handleSubmit = async () => {
    if (!desc?.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!selectedBrand) {
      toast.error("Brand is required");
      return;
    }
    setLoading(true);
    try {
      const itmBrandCode = brandOptions.find((o) => o.value === selectedBrand)?.itmCode ?? selectedBrand;
      await itemMasterApi.createItemRange({
        itmCode: code,
        itmDesc: desc.trim(),
        itmStatus: isActive,
        itmDept: brandCodeForDept ?? null,
        itmBrand: itmBrandCode,
        isproduct: true,
        prepaidForProduct: false,
        prepaidForService: false,
        prepaidForAll: false,
        isservice: false,
        isvoucher: false,
        isprepaid: false,
        iscompound: false,
      });
      toast.success("Range added");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add range");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Range</DialogTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Brand <span className="text-red-500">*</span></Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brandOptions.map((o, idx) => (
                    <SelectItem key={`brand-${idx}-${o.value}`} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center pt-8">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
              <Label htmlFor="isActive" className="ml-2 cursor-pointer">Active</Label>
            </div>
          </div>
          {brandOptions.length === 0 && (
            <p className="text-sm text-amber-600">Select Brand in the form first, or load brands.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedBrand}>
            {loading ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
