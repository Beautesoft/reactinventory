import React, { useEffect, useState } from "react";
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

export function AddLinkModal({
  open,
  onOpenChange,
  linkDesc = "",
  existingCodes = [],
  onSuccess,
}) {
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setLinkCode("");
  }, [open]);

  const handleSave = async () => {
    const code = linkCode.trim();
    const desc = (linkDesc || "").trim();
    if (!code) {
      toast.error("Link Code is required");
      return;
    }
    if (!desc) {
      toast.error("Stock Name is required before adding a link");
      return;
    }
    if (existingCodes.some((c) => String(c).toLowerCase() === code.toLowerCase())) {
      toast.error("Link Code already added");
      return;
    }

    setLoading(true);
    try {
      const allLinks = await itemMasterApi.getItemLinks().catch(() => []);
      const taken = (allLinks || []).some(
        (l) => String(l.linkCode || "").toLowerCase() === code.toLowerCase()
      );
      if (taken) {
        toast.error("Please check code is already present");
        return;
      }
      onSuccess?.({ linkCode: code, linkDesc: desc });
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div>
            <Label>Link Code</Label>
            <Input
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>
              Link Description <span className="text-red-500">*</span>
            </Label>
            <Input value={linkDesc} disabled className="mt-1.5 bg-gray-100" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddLinkModal;
