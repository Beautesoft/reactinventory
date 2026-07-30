import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Hand, Loader2, Trash2 } from "lucide-react";
import {
  buildPackageContentRow,
  recalcPackageTotals,
  upsertPackageContentRow,
} from "@/utils/itemMaster/packagePricing";

export function PackageSection({
  deptOptions = [],
  packageItems = [],
  packageItemsLoading = false,
  packageContent = [],
  onPackageContentChange,
  packageHdr = {},
  onPackageHdrChange,
  serviceOptions = {},
}) {
  const [deptFilter, setDeptFilter] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({
    itemCode: "",
    description: "",
    uom: "",
    unitPrice: "",
    qty: "1",
    lineDiscount: "0",
    packageDiv: "",
  });

  const filteredItems = useMemo(() => {
    let list = packageItems;
    if (deptFilter) {
      list = list.filter(
        (x) =>
          String(x.department || "").toLowerCase() === deptFilter.toLowerCase() ||
          String(x.department || "").includes(deptFilter)
      );
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (x) =>
          String(x.stockCode || x.stockcode || "").toLowerCase().includes(s) ||
          String(x.stockName || x.stockname || "").toLowerCase().includes(s)
      );
    }
    return list.slice(0, 50);
  }, [packageItems, deptFilter, search]);

  const totals = recalcPackageTotals(packageContent);

  const setHdr = (key, value) => {
    onPackageHdrChange?.({ ...packageHdr, [key]: value });
  };

  const pickItem = (item) => {
    setDraft({
      itemCode: item.stockCode || item.stockcode || "",
      description: item.stockName || item.stockname || "",
      uom: item.itemUom || item.uom || "",
      unitPrice: String(item.item_Price ?? item.itemPrice ?? item.price ?? ""),
      qty: "1",
      lineDiscount: "0",
      packageDiv: item.division ?? item.itemDiv ?? "",
    });
  };

  const insertRow = () => {
    if (!draft.itemCode || !draft.description) return;
    const row = buildPackageContentRow({
      itemCode: draft.itemCode,
      description: draft.description,
      qty: draft.qty,
      unitPrice: draft.unitPrice,
      lineDiscount: draft.lineDiscount,
      uom: draft.uom,
      packageDiv: draft.packageDiv,
    });
    onPackageContentChange?.(upsertPackageContentRow(packageContent, row));
    setDraft({
      itemCode: "",
      description: "",
      uom: "",
      unitPrice: "",
      qty: "1",
      lineDiscount: "0",
      packageDiv: "",
    });
  };

  const removeRow = (code) => {
    onPackageContentChange?.(packageContent.filter((r) => r.Item_Code !== code));
  };

  const deptSelectOptions = useMemo(
    () =>
      deptOptions.map((d) => ({
        value: d.label || d.itmDesc || String(d.value),
        label: d.label || d.itmDesc || String(d.value),
      })),
    [deptOptions]
  );

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs text-gray-500 uppercase">From Date</Label>
          <Input
            type="date"
            className="mt-1.5"
            value={packageHdr.fromDate || ""}
            onChange={(e) => setHdr("fromDate", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">To Date</Label>
          <Input
            type="date"
            className="mt-1.5"
            value={packageHdr.toDate || ""}
            onChange={(e) => setHdr("toDate", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">From Time</Label>
          <Input
            type="time"
            className="mt-1.5"
            value={packageHdr.fromTime || ""}
            onChange={(e) => setHdr("fromTime", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">To Time</Label>
          <Input
            type="time"
            className="mt-1.5"
            value={packageHdr.toTime || ""}
            onChange={(e) => setHdr("toTime", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-4">
          <Checkbox
            id="appt-tdt"
            checked={!!packageHdr.apptTdt}
            onCheckedChange={(v) => setHdr("apptTdt", !!v)}
          />
          <Label htmlFor="appt-tdt" className="text-red-600 cursor-pointer">
            Appt TDT
          </Label>
          <Input
            type="number"
            className="w-24"
            disabled={!packageHdr.apptTdt}
            value={packageHdr.apptLimit ?? ""}
            onChange={(e) => setHdr("apptLimit", e.target.value)}
            placeholder="Min"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">Discount Method</Label>
          <div className="flex gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="disc_method"
                checked={packageHdr.discMethod !== "Manual"}
                onChange={() => setHdr("discMethod", "Evenly Average")}
              />
              Evenly Average
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="disc_method"
                checked={packageHdr.discMethod === "Manual"}
                onChange={() => setHdr("discMethod", "Manual")}
              />
              Manual
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500 uppercase">Package Item Department</Label>
          <Select value={deptFilter || "__all__"} onValueChange={(v) => setDeptFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="mt-1.5 w-full">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {deptSelectOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">Search Items</Label>
          <Input
            className="mt-1.5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name"
          />
        </div>
      </div>

      <div className="rounded-md border max-h-56 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50/50 sticky top-0">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {packageItemsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-400">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, idx) => (
                <TableRow key={`${item.stockCode || item.stockcode}-${idx}`}>
                  <TableCell className="font-mono text-xs">{item.stockCode || item.stockcode}</TableCell>
                  <TableCell>{item.stockName || item.stockname}</TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>{item.itemUom || item.uom}</TableCell>
                  <TableCell>{item.item_Price ?? item.itemPrice}</TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => pickItem(item)}>
                      <Hand className="w-4 h-4 text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 border rounded-md bg-gray-50/40">
        <div>
          <Label className="text-xs text-gray-500">Item Code</Label>
          <Input value={draft.itemCode} disabled className="mt-1 bg-white" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-500">Description</Label>
          <Input value={draft.description} disabled className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">UOM</Label>
          <Input value={draft.uom} disabled className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Price</Label>
          <Input
            type="number"
            value={draft.unitPrice}
            onChange={(e) => setDraft((d) => ({ ...d, unitPrice: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Qty</Label>
          <Input
            type="number"
            value={draft.qty}
            onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Discount</Label>
          <Input
            type="number"
            value={draft.lineDiscount}
            onChange={(e) => setDraft((d) => ({ ...d, lineDiscount: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 invisible select-none" aria-hidden="true">
            Action
          </Label>
          <Button type="button" className="mt-1 h-9 w-full" onClick={insertRow} disabled={!draft.itemCode}>
            Insert / Update
          </Button>
        </div>
      </div>

      <div className="flex gap-6 text-sm font-medium text-gray-700">
        <span>Content Total: {totals.content_total.toFixed(2)}</span>
        <span>Package Total: {totals.package_total.toFixed(2)}</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>U.Price</TableHead>
              <TableHead>Disc</TableHead>
              <TableHead>P.Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {packageContent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  No package content added
                </TableCell>
              </TableRow>
            ) : (
              packageContent.map((row) => (
                <TableRow key={row.Item_Code}>
                  <TableCell className="font-mono text-xs">{row.Item_Code}</TableCell>
                  <TableCell>{row.Description}</TableCell>
                  <TableCell>{row.Qty}</TableCell>
                  <TableCell>{Number(row.U_Price).toFixed(2)}</TableCell>
                  <TableCell>{Number(row.Unit_Disc).toFixed(4)}</TableCell>
                  <TableCell>{Number(row.P_Price).toFixed(4)}</TableCell>
                  <TableCell>{Number(row.Total_Amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="hover:text-red-600"
                      onClick={() => removeRow(row.Item_Code)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default PackageSection;
