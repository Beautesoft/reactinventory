import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, History } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import TableSpinner from "./tabelSpinner";
import { useNavigate } from "react-router-dom";
import { CostHistoryTimelineModal } from "@/components/item-master/CostHistoryTimelineModal";

function ItemMasterTable({ data, isLoading, onSort }) {
  const navigate = useNavigate();
  const [costHistoryOpen, setCostHistoryOpen] = useState(false);
  const [costHistoryItemCode, setCostHistoryItemCode] = useState(null);
  const [costHistoryItemName, setCostHistoryItemName] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  const handleSort = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "ascending"
        ? "descending"
        : "ascending";
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortConfig.direction === "ascending" ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data || [];
    return [...(data || [])].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const headers = [
    { key: "itemCode", label: "Stock Code" },
    { key: "itemName", label: "Stock Name" },
    { key: "rptCode", label: "Link Code" },
    { key: "itemType", label: "Type" },
    { key: "itemDiv", label: "Division" },
    { key: "itemClass", label: "Class" },
    { key: "itemDept", label: "Dept" },
    { key: "itemIsactive", label: "Active" },
    { key: "itemBrand", label: "Brand" },
    { key: "itemRange", label: "Range" },
    { key: "actions", label: "", sortable: false },
  ];

  const handleRowClick = (item) => {
    navigate(`/item-master/edit/${item.itemCode}`);
  };

  return (
    <div className="overflow-x-auto w-full h-full p-1 rounded-lg shadow-md">
      <Table>
        <TableHeader className="bg-gray-100 p-2">
          <TableRow>
            {headers.map((header) => (
              <TableHead
                key={header.key}
                className={header.sortable === false ? "w-[50px] text-center" : "cursor-pointer hover:bg-gray-200 text-left"}
                onClick={header.sortable === false ? undefined : () => handleSort(header.key)}
              >
                <div className="flex items-center">
                  {header.label}
                  {header.sortable !== false && getSortIcon(header.key)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="p-5">
          {isLoading ? (
            <TableSpinner colSpan={headers.length} message="Loading items..." />
          ) : sortedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="text-center py-8 text-gray-500"
              >
                No items found
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((item, idx) => (
              <TableRow
                key={item.itemCode || idx}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleRowClick(item)}
              >
                <TableCell className="text-primary font-medium hover:underline">
                  {item.itemCode}
                </TableCell>
                <TableCell>{item.itemName || "-"}</TableCell>
                <TableCell>{item.rptCode || "-"}</TableCell>
                <TableCell>{item.itemType || "-"}</TableCell>
                <TableCell>{item.itemDiv ?? "-"}</TableCell>
                <TableCell>{item.itemClass ?? "-"}</TableCell>
                <TableCell>{item.itemDept ?? "-"}</TableCell>
                <TableCell>
                  {item.itemIsactive === true ? "True" : "False"}
                </TableCell>
                <TableCell>{item.itemBrand ?? "-"}</TableCell>
                <TableCell>{item.itemRange ?? "-"}</TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCostHistoryItemCode(item.itemCode);
                            setCostHistoryItemName(item.itemName);
                            setCostHistoryOpen(true);
                          }}
                        >
                          <History className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cost change history</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <CostHistoryTimelineModal
        open={costHistoryOpen}
        onOpenChange={setCostHistoryOpen}
        itemCode={costHistoryItemCode}
        itemName={costHistoryItemName}
      />
    </div>
  );
}

export default ItemMasterTable;
