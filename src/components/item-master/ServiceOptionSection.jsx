import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

export function ServiceOptionSection({
  flexiPoints = "",
  onFlexiPointsChange,
  serviceExpireActive = false,
  onServiceExpireActiveChange,
  serviceExpireMonth = "",
  onServiceExpireMonthChange,
  treatmentLimitActive = false,
  onTreatmentLimitActiveChange,
  treatmentLimitCount = "",
  onTreatmentLimitCountChange,
  limitserviceFlexionly = false,
  onLimitserviceFlexionlyChange,
  flexiServices = [],
  onFlexiServicesChange,
  serviceSearchResults = [],
  onServiceSearch,
  serviceSearchLoading = false,
}) {
  const [search, setSearch] = useState("");

  const handleSearch = (v) => {
    setSearch(v);
    onServiceSearch?.(v);
  };

  const addService = (item) => {
    if (flexiServices.some((x) => x.itemSrvcode === item.itemCode)) return;
    onFlexiServicesChange?.([
      ...flexiServices,
      {
        itemSrvcode: item.itemCode,
        itemSrvdesc: item.itemName || item.itemDesc,
        itemSrvIdId: item.itemNo || item.id || null,
        itmIsactive: true,
      },
    ]);
    setSearch("");
    onServiceSearch?.("");
  };

  const removeService = (code) => {
    onFlexiServicesChange?.(flexiServices.filter((x) => x.itemSrvcode !== code));
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-xs text-gray-500 uppercase">Flexi Points</Label>
          <Input
            type="number"
            className="mt-1.5"
            value={flexiPoints}
            onChange={(e) => onFlexiPointsChange?.(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="svc-expire"
            checked={serviceExpireActive}
            onCheckedChange={(v) => onServiceExpireActiveChange?.(!!v)}
          />
          <Label htmlFor="svc-expire">Expiry Status</Label>
        </div>
        {serviceExpireActive && (
          <>
            <Input
              type="number"
              className="w-24"
              value={serviceExpireMonth}
              onChange={(e) => onServiceExpireMonthChange?.(e.target.value)}
            />
            <span className="text-sm text-gray-600">Month(s)</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="svc-limit"
            checked={treatmentLimitActive}
            onCheckedChange={(v) => onTreatmentLimitActiveChange?.(!!v)}
          />
          <Label htmlFor="svc-limit">Service Limit</Label>
        </div>
        {treatmentLimitActive && (
          <>
            <Input
              type="number"
              className="w-24"
              value={treatmentLimitCount}
              onChange={(e) => onTreatmentLimitCountChange?.(e.target.value)}
            />
            <span className="text-sm text-gray-600">Xs</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="flexi-only"
          checked={limitserviceFlexionly}
          onCheckedChange={(v) => onLimitserviceFlexionlyChange?.(!!v)}
        />
        <Label htmlFor="flexi-only">Limited Service-Flexi Only</Label>
      </div>

      {limitserviceFlexionly && (
        <div className="space-y-3">
          <Label className="text-xs text-gray-500 uppercase">Service Search</Label>
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search service by code or name"
          />
          {serviceSearchResults.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-auto">
              {serviceSearchResults.map((item) => (
                <div
                  key={item.itemCode}
                  className="p-2 hover:bg-gray-50 cursor-pointer text-sm flex justify-between items-center border-b last:border-0"
                  onClick={() => addService(item)}
                >
                  <span>
                    <span className="font-mono">{item.itemCode}</span> — {item.itemName}
                  </span>
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Service Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flexiServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-gray-400">
                  No flexi services linked
                </TableCell>
              </TableRow>
            ) : (
              flexiServices.map((s) => (
                <TableRow key={s.itemSrvcode}>
                  <TableCell className="font-mono">{s.itemSrvcode}</TableCell>
                  <TableCell>{s.itemSrvdesc}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(s.itemSrvcode)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
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

export default ServiceOptionSection;
