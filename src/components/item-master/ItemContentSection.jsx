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
import { Pencil, Trash2 } from "lucide-react";

export function ItemContentSection({
  contentRows = [],
  onContentRowsChange,
}) {
  const [detail1, setDetail1] = useState("");
  const [detail2, setDetail2] = useState("");
  const [editId, setEditId] = useState(null);
  const [editLineNo, setEditLineNo] = useState(null);

  const resetForm = () => {
    setDetail1("");
    setDetail2("");
    setEditId(null);
    setEditLineNo(null);
  };

  const saveRow = () => {
    if (!detail1.trim() || !detail2.trim()) return;
    if (editId != null) {
      onContentRowsChange?.(
        contentRows.map((r) =>
          r.id === editId
            ? {
                ...r,
                contentDetail1: detail1.trim(),
                contentDetail2: detail2.trim(),
              }
            : r
        )
      );
    } else {
      const lineNo =
        contentRows.length > 0
          ? Math.max(...contentRows.map((r) => r.contentLineNo || 0)) + 1
          : 1;
      onContentRowsChange?.([
        ...contentRows,
        {
          id: null,
          contentLineNo: lineNo,
          contentDetail1: detail1.trim(),
          contentDetail2: detail2.trim(),
          isActive: true,
        },
      ]);
    }
    resetForm();
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setEditLineNo(row.contentLineNo);
    setDetail1(row.contentDetail1 || "");
    setDetail2(row.contentDetail2 || "");
  };

  const removeRow = (row) => {
    if (row.id) {
      onContentRowsChange?.(
        contentRows.map((r) =>
          r.id === row.id ? { ...r, _deleted: true } : r
        )
      );
    } else {
      onContentRowsChange?.(
        contentRows.filter((r) => r.contentLineNo !== row.contentLineNo)
      );
    }
  };

  const toggleActive = (row) => {
    onContentRowsChange?.(
      contentRows.map((r) =>
        r.id === row.id || r.contentLineNo === row.contentLineNo
          ? { ...r, isActive: !r.isActive }
          : r
      )
    );
  };

  const visibleRows = contentRows.filter((r) => !r._deleted);

  return (
    <div className="space-y-4 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 md:items-end">
        <div>
          <Label className="text-xs text-gray-500 uppercase">Content Detail 1</Label>
          <Input
            className="mt-1.5"
            value={detail1}
            onChange={(e) => setDetail1(e.target.value)}
            placeholder="Enter content detail 1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 uppercase">Content Detail 2</Label>
          <Input
            className="mt-1.5"
            value={detail2}
            onChange={(e) => setDetail2(e.target.value)}
            placeholder="Enter content detail 2"
          />
        </div>
        <Button type="button" className="h-9 w-full md:w-auto" onClick={saveRow}>
          {editId != null ? "Update" : "Add"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Detail 1</TableHead>
              <TableHead>Detail 2</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                  No content lines
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow key={row.id ?? `line-${row.contentLineNo}`}>
                  <TableCell>{row.contentLineNo}</TableCell>
                  <TableCell>{row.contentDetail1}</TableCell>
                  <TableCell>{row.contentDetail2}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={row.isActive !== false}
                      onCheckedChange={() => toggleActive(row)}
                    />
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(row)}>
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

export default ItemContentSection;
