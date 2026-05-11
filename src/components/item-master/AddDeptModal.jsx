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

const VALIDITY_OPTIONS = [
  { label: "1 Year", value: 1 },
  { label: "2 Year", value: 2 },
  { label: "3 Year", value: 3 },
  { label: "Unlimited", value: 4 },
];

function formatDateForApi(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day} 00:00:00.000`;
}

export function AddDeptModal({ open, onOpenChange, onSuccess }) {
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [validityPeriod, setValidityPeriod] = useState("");
  const [validityFrom, setValidityFrom] = useState("");
  const [validityTo, setValidityTo] = useState("");
  const [feSequence, setFeSequence] = useState("");
  const [allowCashSales, setAllowCashSales] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFirstTrial, setIsFirstTrial] = useState(false);
  const [isRetailProduct, setIsRetailProduct] = useState(false);
  const [isSalonProduct, setIsSalonProduct] = useState(false);
  const [isService, setIsService] = useState(false);
  const [isVoucher, setIsVoucher] = useState(false);
  const [isPrepaid, setIsPrepaid] = useState(false);
  const [isCompound, setIsCompound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDesc("");
      setValidityPeriod("");
      setFeSequence("");
      setAllowCashSales(false);
      setIsActive(true);
      setIsFirstTrial(false);
      setIsRetailProduct(false);
      setIsSalonProduct(false);
      setIsService(false);
      setIsVoucher(false);
      setIsPrepaid(false);
      setIsCompound(false);
      const today = new Date();
      setValidityFrom(today.toISOString().slice(0, 10));
      setValidityTo(today.toISOString().slice(0, 10));
      itemMasterApi.getItemDepts().then((res) => {
        const list = Array.isArray(res) ? res : [];
        const last = list[list.length - 1];
        const nextCode = last ? String(Number(last.itmCode) + 1) : "1";
        setCode(nextCode);
      }).catch(() => setCode("1"));
    }
  }, [open]);

  useEffect(() => {
    if (open && validityPeriod) {
      const today = new Date();
      const toDate = new Date(today);
      const v = Number(validityPeriod);
      if (v === 1) toDate.setFullYear(toDate.getFullYear() + 1);
      else if (v === 2) toDate.setFullYear(toDate.getFullYear() + 2);
      else if (v === 3) toDate.setFullYear(toDate.getFullYear() + 3);
      else if (v === 4) toDate.setFullYear(toDate.getFullYear() + 978);
      setValidityTo(toDate.toISOString().slice(0, 10));
    }
  }, [open, validityPeriod]);

  const handleSubmit = async () => {
    if (!desc?.trim()) {
      toast.error("Description is required");
      return;
    }
    setLoading(true);
    try {
      const fromDate = validityFrom ? formatDateForApi(validityFrom) : null;
      const toDate = validityTo ? formatDateForApi(validityTo) : null;
      const payload = {
        itmCode: code,
        itmDesc: desc.trim(),
        itmStatus: isActive,
        itmSeq: feSequence ? Number(feSequence) : null,
        allowcashsales: allowCashSales,
        itmShowonsales: false,
        isfirsttrial: isFirstTrial,
        isVoucher: isVoucher,
        isPrepaid: isPrepaid,
        isRetailproduct: isRetailProduct,
        isSalonproduct: isSalonProduct,
        isPackage: true,
        validityPeriod: validityPeriod ? Number(validityPeriod) : null,
        isService: isService,
        isCompound: true,
        deptPic: "string",
        vilidityFromDate: fromDate,
        vilidityToDate: toDate,
        vilidityFromTime: fromDate,
        vilidityToTime: toDate,
      };
      await itemMasterApi.createItemDept(payload);
      toast.success("Department added");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Department Code</Label>
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
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Validity Period</Label>
              <Select value={validityPeriod} onValueChange={setValidityPeriod}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Validity From</Label>
              <Input
                type="date"
                value={validityFrom}
                onChange={(e) => setValidityFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">Validity To</Label>
              <Input
                type="date"
                value={validityTo}
                onChange={(e) => setValidityTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase">FE Sequence No</Label>
              <Input
                type="number"
                value={feSequence}
                onChange={(e) => setFeSequence(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="flex items-center pt-8">
              <Checkbox id="allowCashSales" checked={allowCashSales} onCheckedChange={(v) => setAllowCashSales(!!v)} />
              <Label htmlFor="allowCashSales" className="ml-2 cursor-pointer">Allow Cash Sales</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
              <Label htmlFor="isActive" className="ml-2 cursor-pointer">The Department is currently active</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isFirstTrial" checked={isFirstTrial} onCheckedChange={(v) => setIsFirstTrial(!!v)} />
              <Label htmlFor="isFirstTrial" className="ml-2 cursor-pointer">This is First Trial</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isRetailProduct" checked={isRetailProduct} onCheckedChange={(v) => setIsRetailProduct(!!v)} />
              <Label htmlFor="isRetailProduct" className="ml-2 cursor-pointer">This is Retail Product</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isSalonProduct" checked={isSalonProduct} onCheckedChange={(v) => setIsSalonProduct(!!v)} />
              <Label htmlFor="isSalonProduct" className="ml-2 cursor-pointer">This is Salon Product</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isService" checked={isService} onCheckedChange={(v) => setIsService(!!v)} />
              <Label htmlFor="isService" className="ml-2 cursor-pointer">This is Service</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isVoucher" checked={isVoucher} onCheckedChange={(v) => setIsVoucher(!!v)} />
              <Label htmlFor="isVoucher" className="ml-2 cursor-pointer">This is Voucher</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isPrepaid" checked={isPrepaid} onCheckedChange={(v) => setIsPrepaid(!!v)} />
              <Label htmlFor="isPrepaid" className="ml-2 cursor-pointer">This is Prepaid</Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="isCompound" checked={isCompound} onCheckedChange={(v) => setIsCompound(!!v)} />
              <Label htmlFor="isCompound" className="ml-2 cursor-pointer">This is Compound</Label>
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
