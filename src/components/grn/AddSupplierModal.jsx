import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsRight } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";

const todayInputDate = () => moment().format("YYYY-MM-DD");

const emptyForm = () => ({
  accountNumber: "",
  supplierName: "",
  supplierAttn: "",
  date: todayInputDate(),
  active: true,
  addr1: "",
  addr2: "",
  addr3: "",
  postcode: "",
  city: "",
  state: "",
  country: "",
  telNo: "",
  faxNo: "",
  maddr1: "",
  maddr2: "",
  maddr3: "",
  mpostcode: "",
  mcity: "",
  mstate: "",
  mcountry: "",
  terms: "0",
  commission: "0",
});

function Field({ label, required, children, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export function AddSupplierModal({ open, onOpenChange, onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [menuCode, setMenuCode] = useState("");
  const [controlId, setControlId] = useState(null);
  const [controlNo, setControlNo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!open) return;

    setForm(emptyForm());
    setMenuCode("");
    setControlId(null);
    setControlNo(null);

    const loadCode = async () => {
      setLoadingCode(true);
      try {
        const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
        const siteCode = userDetails?.siteCode;
        if (!siteCode) {
          toast.error("Site code not found");
          return;
        }
        const rec = await itemMasterApi.getSupplierControlNo(siteCode);
        if (!rec) {
          toast.error("Supplier Code control number not found for this site");
          return;
        }
        setMenuCode(`${rec.controlPrefix ?? ""}${rec.controlNo ?? ""}`);
        setControlId(rec.controlId);
        setControlNo(rec.controlNo);
      } catch (err) {
        toast.error(
          err?.response?.data?.error?.message || "Failed to load supplier code"
        );
      } finally {
        setLoadingCode(false);
      }
    };

    loadCode();
  }, [open]);

  const copyAddress = () => {
    setForm((prev) => ({
      ...prev,
      maddr1: prev.addr1,
      maddr2: prev.addr2,
      maddr3: prev.addr3,
      mpostcode: prev.postcode,
      mcity: prev.city,
      mstate: prev.state,
      mcountry: prev.country,
    }));
  };

  const handleSubmit = async () => {
    if (!menuCode || !form.supplierName?.trim() || !form.date) {
      toast.error("Please check required field");
      return;
    }
    if (controlId == null || controlNo == null) {
      toast.error("Supplier Code control number not found for this site");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        splyCode: menuCode,
        supplydesc: form.supplierName.trim(),
        splyDate: `${moment(form.date).format("YYYY-MM-DD")}T00:00:00.000Z`,
        splyAttn: form.supplierAttn || "",
        splyIc: "",
        splyType: "",
        splyAddr1: form.addr1 || "",
        splyAddr2: form.addr2 || "",
        splyAddr3: form.addr3 || "",
        splyPoscd: form.postcode || "",
        splyState: form.state || "",
        splyCity: form.city || "",
        splyCntry: form.country || "",
        splymaddr1: form.maddr1 || "",
        splymaddr2: form.maddr2 || "",
        splymaddr3: form.maddr3 || "",
        splymposcd: form.mpostcode || "",
        splymstate: form.mstate || "",
        splymcity: form.mcity || "",
        splymcntry: form.mcountry || "",
        splyTelno: form.telNo || "",
        splyFaxno: form.faxNo || "",
        splyRemk1: "",
        splyRemk2: "",
        splyRemk3: "",
        splyTerm: Number(form.terms) || 0,
        splyLimit: 0,
        splyBal: 0,
        splyactive: form.active,
        splyComm: Number(form.commission) || 0,
        firstName: "",
        netseq: 0,
        createUser: "",
        createDate: new Date(),
        accountNumber: form.accountNumber || "",
        numberOfOpenPOs: 0,
        numberOfTotalPOs: 0,
      };

      await itemMasterApi.createItemSupply(payload);
      await itemMasterApi.updateControlNo(controlId, Number(controlNo) + 1);

      toast.success("Supplier created");
      onSuccess?.({
        splyCode: menuCode,
        supplydesc: payload.supplydesc,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to create supplier"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-[1100px] w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>Create Supplier</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Code" required>
              <Input value={loadingCode ? "Loading..." : menuCode} disabled className="bg-gray-50" />
            </Field>
            <Field label="Account No">
              <Input
                value={form.accountNumber}
                onChange={(e) => setField("accountNumber", e.target.value)}
                placeholder="Enter account no"
              />
            </Field>
            <Field label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </Field>
            <Field label="Supplier Name" required>
              <Input
                value={form.supplierName}
                onChange={(e) => setField("supplierName", e.target.value)}
                placeholder="Enter Supplier Name"
              />
            </Field>
            <Field label="Supplier Attn.">
              <Input
                value={form.supplierAttn}
                onChange={(e) => setField("supplierAttn", e.target.value)}
                placeholder="Enter Supplier Attn."
              />
            </Field>
            <div className="flex items-end pb-2">
              <div className="flex items-center h-9">
                <Checkbox
                  id="supplier-active"
                  checked={form.active}
                  onCheckedChange={(v) => setField("active", !!v)}
                />
                <Label htmlFor="supplier-active" className="ml-2 cursor-pointer">
                  Supplier is currently active
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-3 items-start pt-2 border-t">
            <p className="text-sm font-medium pt-4">Address</p>
            <div className="hidden md:block" />
            <p className="text-sm font-medium pt-4">Mailing Address</p>

            <Field label="Address 1">
              <Input
                value={form.addr1}
                onChange={(e) => setField("addr1", e.target.value)}
                placeholder="Enter Address1"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Address 1">
              <Input
                value={form.maddr1}
                onChange={(e) => setField("maddr1", e.target.value)}
                placeholder="Enter Address1"
              />
            </Field>

            <Field label="Address 2">
              <Input
                value={form.addr2}
                onChange={(e) => setField("addr2", e.target.value)}
                placeholder="Enter Address2"
              />
            </Field>
            <div className="flex items-center justify-center self-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={copyAddress}
                title="Copy address to mailing address"
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
            <Field label="Address 2">
              <Input
                value={form.maddr2}
                onChange={(e) => setField("maddr2", e.target.value)}
                placeholder="Enter Address2"
              />
            </Field>

            <Field label="Address 3">
              <Input
                value={form.addr3}
                onChange={(e) => setField("addr3", e.target.value)}
                placeholder="Enter Address3"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Address 3">
              <Input
                value={form.maddr3}
                onChange={(e) => setField("maddr3", e.target.value)}
                placeholder="Enter Address3"
              />
            </Field>

            <Field label="Postcode">
              <Input
                value={form.postcode}
                onChange={(e) => setField("postcode", e.target.value)}
                placeholder="Enter postcode"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Postcode">
              <Input
                value={form.mpostcode}
                onChange={(e) => setField("mpostcode", e.target.value)}
                placeholder="Enter postcode"
              />
            </Field>

            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Enter city"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="City">
              <Input
                value={form.mcity}
                onChange={(e) => setField("mcity", e.target.value)}
                placeholder="Enter City"
              />
            </Field>

            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                placeholder="Enter State"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="State">
              <Input
                value={form.mstate}
                onChange={(e) => setField("mstate", e.target.value)}
                placeholder="Enter State"
              />
            </Field>

            <Field label="Country">
              <Input
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder="Enter Country"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Country">
              <Input
                value={form.mcountry}
                onChange={(e) => setField("mcountry", e.target.value)}
                placeholder="Enter Country"
              />
            </Field>

            <Field label="Telephone No.">
              <Input
                value={form.telNo}
                onChange={(e) => setField("telNo", e.target.value)}
                placeholder="Enter Telephone No"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Terms">
              <Input
                type="number"
                value={form.terms}
                onChange={(e) => setField("terms", e.target.value)}
                placeholder="Enter Terms"
              />
            </Field>

            <Field label="Fax No.">
              <Input
                value={form.faxNo}
                onChange={(e) => setField("faxNo", e.target.value)}
                placeholder="Enter Fax No"
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="Commission">
              <Input
                type="number"
                value={form.commission}
                onChange={(e) => setField("commission", e.target.value)}
                placeholder="Enter Commission"
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingCode || !menuCode}>
            {loading ? "Saving..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddSupplierModal;
