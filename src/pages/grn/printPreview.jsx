import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SAMPLE_DATA = {
  docNo: "WGRNMCHQ110012",
  docDate: "2024-03-05",
  docRef1: "WPOMC01110003",
  docRef2: "GR2024001",
  createUser: "Support",
  docStatus: 7,
  docQty: 4,
  docAmt: 666528,
  docRemk1: "Sample Remarks for testing",
  items: [
    {
      itemcode: "131000030000",
      itemdesc: "BWL Joint Comfort",
      docQty: 1,
      docPrice: 213150,
      docAmt: 213150,
    },
    {
      itemcode: "131000030000",
      itemdesc: "BWL Joint Comfort",
      docQty: 1,
      docPrice: 213150,
      docAmt: 213150,
    },
    {
      itemcode: "131000040000",
      itemdesc: "Pro-Vitamin C Cream",
      docQty: 1,
      docPrice: 7788,
      docAmt: 7788,
    },
    {
      itemcode: "131000050000",
      itemdesc: "Lipoaminocel 500ml",
      docQty: 1,
      docPrice: 110616,
      docAmt: -110616,
    },
    // Add more items for pagination testing
    ...Array(20)
      .fill(null)
      .map((_, i) => ({
        itemcode: `13100${String(i + 6).padStart(4, "0")}0000`,
        itemdesc: `Test Product ${i + 1}`,
        docQty: Math.floor(Math.random() * 10) + 1,
        docPrice: Math.floor(Math.random() * 10000),
        docAmt: Math.floor(Math.random() * 100000),
      })),
  ],
};

const ITEMS_PER_PAGE = 20;
const ZOOM_OPTIONS = [
  { value: "auto", label: "Auto Width" },
  { value: "page", label: "Page Width" },
  { value: "50", label: "50%" },
  { value: "75", label: "75%" },
  { value: "100", label: "100%" },
  { value: "125", label: "125%" },
  { value: "150", label: "150%" },
  { value: "200", label: "200%" },
];

function PrintPreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const List = location.state?.item || SAMPLE_DATA;

  const [data, setData] = useState(SAMPLE_DATA);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState("100");
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    if (data?.items) {
      const filtered = data.items.filter((item) =>
        Object.values(item).some((val) =>
          val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, data]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const currentItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleZoomChange = (value) => {
    setZoom(value);
    const content = document.querySelector(".print-content");
    if (value === "auto") {
      content.style.width = "100%";
    } else if (value === "page") {
      content.style.width = "210mm"; // A4 width
    } else {
      content.style.transform = `scale(${parseInt(value) / 100})`;
      content.style.transformOrigin = "top center";
    }
  };

  const handleExport = (format) => {
    console.log(`Exporting as ${format}`, data);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="print:hidden mb-6">
        {/* Top Controls in single row */}
        <div className="flex items-center justify-between border-b pb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[200px]"
            />

            <Select value={zoom} onValueChange={handleZoomChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Zoom" />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="word">Word</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border-l pl-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div
        id="printable-content"
        className="print-content max-w-4xl mx-auto p-4 border rounded-lg"
      >
        <div className="text-center mb-6">
          <h2 className="font-bold">Beautesoft Salon</h2>
          <p className="text-sm">BLK 111 Toa Payoh Central</p>
          <p className="text-sm">#01-101 S310101</p>
        </div>

        <div className="bg-gray-100 py-1 px-2 mb-4">
          <h3 className="font-bold">GRN</h3>
        </div>

        <div className="grid grid-cols-2 text-sm mb-4">
          <div>
            <p>
              <span className="w-32 inline-block">GRN No.</span>: {data?.docNo}
            </p>
            <p>
              <span className="w-32 inline-block">PO1 Reference</span>:{" "}
              {data?.docRef1 || "-"}
            </p>
            <p>
              <span className="w-32 inline-block">GR1 Reference</span>:{" "}
              {data?.docRef2 || "-"}
            </p>
            <p>
              <span className="w-32 inline-block">Staff Name</span>:{" "}
              {data?.createUser || "Support"}
            </p>
          </div>
          <div>
            <p>
              <span className="w-32 inline-block">Print Date</span>:{" "}
              {new Date().toLocaleDateString()}
            </p>
            <p>
              <span className="w-32 inline-block">Print Time</span>:{" "}
              {new Date().toLocaleTimeString()}
            </p>
            <p>
              <span className="w-32 inline-block">GRN Date</span>:{" "}
              {new Date(data?.docDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-y">
              <th className="py-1 text-left">No</th>
              <th className="py-1 text-left">ITEM CODE</th>
              <th className="py-1 text-left">ITEM DESCRIPTION</th>
              <th className="py-1 text-right">QTY</th>
              <th className="py-1 text-right">UNIT PRICE</th>
              <th className="py-1 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-1">
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </td>
                <td className="py-1">{item.itemcode}</td>
                <td className="py-1">{item.itemdesc}</td>
                <td className="py-1 text-right">{item.docQty}</td>
                <td className="py-1 text-right">{item.docPrice}</td>
                <td className="py-1 text-right">{item.docAmt}</td>
              </tr>
            ))}

            {/* Page Total - show on all pages */}
            <tr className="border-t font-medium">
              <td colSpan={3} className="py-1 text-right">
                Page Total:
              </td>
              <td className="py-1 text-right">
                {currentItems.reduce(
                  (sum, item) => sum + (item.docQty || 0),
                  0
                )}
              </td>
              <td></td>
              <td className="py-1 text-right">
                {currentItems.reduce(
                  (sum, item) => sum + (item.docAmt || 0),
                  0
                )}
              </td>
            </tr>

            {/* Grand Total - show only on last page */}
            {currentPage === totalPages && (
              <tr className="border-t border-double border-black font-bold">
                <td colSpan={3} className="py-1 text-right">
                  Grand Total:
                </td>
                <td className="py-1 text-right">{data?.docQty || 0}</td>
                <td></td>
                <td className="py-1 text-right">{data?.docAmt || 0}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Show remarks only on last page */}
        {currentPage === totalPages && (
          <div className="mt-4">
            <p className="text-sm">
              <strong>Remark 1:</strong> {data?.docRemk1 || "-"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintPreview;
