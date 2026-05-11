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

export function AddBrandModal({ open, onOpenChange, onSuccess }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showRetail, setShowRetail] = useState(false);
  const [showPrepaid, setShowPrepaid] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDesc("");
      setIsActive(true);
      setShowRetail(false);
      setShowPrepaid(false);
      setShowVoucher(false);
      itemMasterApi.getItemBrands().then((res) => {
        const list = Array.isArray(res) ? res : [];
        const last = list[list.length - 1];
        const nextCode = last ? String(Number(last.itmCode) + 1) : "100001";
        setCode(nextCode);
      }).catch(() => setCode("100001"));
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
        itmStatus: isActive,
        voucherBrand: showVoucher,
        voucherForSales: showVoucher,
        retailProductBrand: showRetail,
        prepaidBrand: showPrepaid,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
              <Label htmlFor="isActive" className="ml-2 cursor-pointer">Brand is Currently Active</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="showRetail" checked={showRetail} onCheckedChange={(v) => setShowRetail(!!v)} />
              <Label htmlFor="showRetail" className="ml-2 cursor-pointer">Show on Retail</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="showPrepaid" checked={showPrepaid} onCheckedChange={(v) => setShowPrepaid(!!v)} />
              <Label htmlFor="showPrepaid" className="ml-2 cursor-pointer">Show on Prepaid</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="showVoucher" checked={showVoucher} onCheckedChange={(v) => setShowVoucher(!!v)} />
              <Label htmlFor="showVoucher" className="ml-2 cursor-pointer">Show on Voucher</Label>
            </div>
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
