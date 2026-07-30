import React, { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";
import { parseVoucherNumbers } from "@/utils/itemMaster/voucherNumbers";

export function VoucherActivationSection({
  siteOptions = [],
  stockId,
  voucherBatches = [],
  onRefreshBatches,
}) {
  const [voucherSite, setVoucherSite] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchName, setBatchName] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [allowDiscount, setAllowDiscount] = useState(false);
  const [voucherNumbers, setVoucherNumbers] = useState("");
  const [duplicateVouchers, setDuplicateVouchers] = useState([]);
  const [newVouchers, setNewVouchers] = useState([]);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleValidate = async () => {
    if (!voucherNumbers.trim()) {
      toast.error("Enter voucher numbers to validate");
      return;
    }
    setValidating(true);
    try {
      const allNumbers = parseVoucherNumbers(voucherNumbers);
      if (allNumbers.length === 0) {
        toast.error("No valid voucher numbers found");
        return;
      }
      const res = await itemMasterApi.checkVoucherNumbers(allNumbers.join(","));
      const duplicates = (res?.vouchers || []).map((v) => ({
        voucherNumber: v.voucher_numbers ?? v.voucherNumber,
      }));
      const fresh = (res?.not_found_voucher_numbers || []).map((n) => ({
        voucherNumber: n,
      }));
      setDuplicateVouchers(duplicates);
      setNewVouchers(fresh);
      if (duplicates.length > 0) {
        toast.warning(`${duplicates.length} voucher(s) already exist in the system`);
      } else if (fresh.length > 0) {
        toast.success(`${fresh.length} voucher(s) ready to save`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Voucher validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (duplicateVouchers.length > 0) {
      toast.error(
        `${duplicateVouchers.length} vouchers were not saved because they already exist in the system`
      );
      return;
    }
    if (newVouchers.length === 0) {
      toast.error("Validate vouchers before saving");
      return;
    }
    if (!batchName.trim()) {
      toast.error("Batch name is required");
      return;
    }
    if (!voucherSite) {
      toast.error("Store code is required");
      return;
    }
    setSaving(true);
    try {
      await itemMasterApi.createLoadVoucher({
        voucher_batch_name: batchName.trim(),
        expiry_date: expiryDate || null,
        allow_discount: allowDiscount,
        site_code: voucherSite,
        voucher_number: newVouchers.map((v) => v.voucherNumber),
        amount: voucherAmount ? Number(voucherAmount) : null,
        stock_id: stockId,
      });
      toast.success("Voucher batch saved");
      setBatchName("");
      setExpiryDate("");
      setAllowDiscount(false);
      setDuplicateVouchers([]);
      setNewVouchers([]);
      setVoucherNumbers("");
      setVoucherAmount("");
      onRefreshBatches?.();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to save voucher batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase">Store Code</Label>
          <Select value={voucherSite} onValueChange={setVoucherSite}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {siteOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase">Expiry Date</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase">Batch Name</Label>
          <Input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter batch name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase">Voucher Amount</Label>
          <Input
            type="number"
            value={voucherAmount}
            onChange={(e) => setVoucherAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="allowDiscount"
          checked={allowDiscount}
          onCheckedChange={(v) => setAllowDiscount(!!v)}
        />
        <Label htmlFor="allowDiscount" className="cursor-pointer">
          Allow Discount
        </Label>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-500 uppercase">Voucher Numbers</Label>
        <p className="text-xs text-gray-400 mt-0.5">
          Comma-separated or ranges (e.g. V001-V010)
        </p>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <Input
            value={voucherNumbers}
            onChange={(e) => setVoucherNumbers(e.target.value)}
            placeholder="V001, V002-V010"
            className="flex-1 min-w-[200px]"
          />
          <Button type="button" variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? "Validating..." : "Validate Vouchers"}
          </Button>
        </div>
        {(duplicateVouchers.length > 0 || newVouchers.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {duplicateVouchers.map((v, i) => (
              <span key={`dup-${i}`} className="text-red-600 font-medium">
                {v.voucherNumber}
              </span>
            ))}
            {newVouchers.map((v, i) => (
              <span key={`new-${i}`} className="text-green-700 font-medium">
                {v.voucherNumber}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Voucher Batch"}
        </Button>
      </div>

      {voucherBatches.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Allow Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucherBatches.map((row, idx) => (
                <TableRow key={`${row.batch}-${idx}`}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{row.batch ?? row.voucher_batch_name}</TableCell>
                  <TableCell>{row.qty ?? row.quantity}</TableCell>
                  <TableCell>{row.voucher_value ?? row.amount}</TableCell>
                  <TableCell>{String(row.allowDiscount ?? row.allow_discount ?? false)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default VoucherActivationSection;
