import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import itemMasterApi from "@/services/itemMasterApi";

export function AddUomModal({ open, onOpenChange, onSuccess, existingUoms = [] }) {
  const [loading, setLoading] = useState(false);
  const [uomOptions, setUomOptions] = useState([]);
  
  // Form State
  const [uomcDesc, setUomcDesc] = useState(""); // UOMC (The new unit being defined)
  const [uomUnit, setUomUnit] = useState("");   // Conversion Factor
  const [uomDesc, setUomDesc] = useState("");   // Base UOM (The unit it converts to)

  useEffect(() => {
    if (open) {
      loadOptions();
      // Reset form
      setUomcDesc("");
      setUomUnit("");
      
      // Default Base UOM logic from original code:
      // If existing UOMs exist, default Base UOM to the last added UOM's description
      if (existingUoms.length > 0) {
        const lastUom = existingUoms[existingUoms.length - 1];
        // The original code uses uomDesc for the base unit in subsequent entries? 
        // Let's check: uom_res = uomsde[uomsde.length - 1].uomDesc;
        // In original: uom_res is the Base UOM (UOM2).
        setUomDesc(lastUom.itemUom || ""); 
      } else {
        setUomDesc("");
      }
    }
  }, [open, existingUoms]);

  const loadOptions = async () => {
    try {
      const res = await itemMasterApi.getItemUom();
      const activeUoms = (res || []).filter((x) => x.uomIsactive);
      setUomOptions(
        activeUoms.map((x) => ({ value: x.uomCode, label: x.uomDesc }))
      );
    } catch (err) {
      console.error("Failed to load UOM options", err);
      toast.error("Failed to load UOM options");
    }
  };

  const handleSubmit = () => {
    if (!uomcDesc) {
      toast.error("UOMC Description is required");
      return;
    }
    if (!uomUnit || Number(uomUnit) <= 0) {
      toast.error("UOM Unit must be greater than 0");
      return;
    }
    if (!uomDesc) {
      toast.error("UOM Description is required");
      return;
    }

    // Logic from original:
    // If it's the first UOM, typically 1 Base = 1 Base.
    // If subsequent, e.g., 1 Box = 10 Pcs.

    const newUom = {
      itemUom: uomcDesc,      // UOMC Code/Desc
      uomDesc: uomcDesc,      // UOMC Desc
      uomUnit: Number(uomUnit),
      itemUom2: uomDesc,      // Base UOM Code
      uom2Desc: uomDesc,      // Base UOM Desc
      itemPrice: 0,
      itemCost: 0,
      minMargin: 0,
    };

    onSuccess(newUom);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>UOM</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Label className="mb-2 block">UOMC Description</Label>
              <Select value={uomcDesc} onValueChange={setUomcDesc}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {uomOptions.map((opt) => (
                    <SelectItem key={`uomc-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <Label className="mb-2 block">
                UOM Unit <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={uomUnit}
                onChange={(e) => setUomUnit(e.target.value)}
              />
            </div>

            <div className="col-span-1">
              <Label className="mb-2 block">UOM Description</Label>
              {existingUoms.length === 0 ? (
                 <Select value={uomDesc} onValueChange={setUomDesc}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select" />
                 </SelectTrigger>
                 <SelectContent>
                   {uomOptions.map((opt) => (
                     <SelectItem key={`uom-${opt.value}`} value={opt.value}>
                       {opt.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
              ) : (
                <Input value={uomDesc} disabled className="bg-gray-100" />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
