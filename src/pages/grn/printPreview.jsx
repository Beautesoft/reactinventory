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
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiService from "@/services/apiService";
import { buildFilterQuery } from "@/utils/utils";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { toast } from "sonner";

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
  const data = location.state?.item || SAMPLE_DATA;
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState("100");
  const [filteredItems, setFilteredItems] = useState([]);
  const [exportFormat, setExportFormat] = useState("");

  useEffect(() => {
    const filter = {
      where: {
        // movCode: data.movCode,
        docNo: data.docNo,
      },
    };

    getDocumentDetails(filter);
  }, [data.movCode, data.docNo]);

  useEffect(() => {
    if (items.length > 0) {
      const filtered = items.filter((item) =>
        Object.values(item).some((val) =>
          val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, items]);

  const getDocumentDetails = async (filter) => {
    try {
      // const response = await apiService.get(
      //   `StkMovdocDtls${buildFilterQuery(filter ?? filter)}`
      // );
      const response = await apiService.get(
        `Stkprintlists${buildFilterQuery(filter ?? filter)}`
      );
      setItems(response);
    } catch (err) {
      console.error("Error fetching document details:", err);
    }
  };

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
      content.style.width = "210mm";
    } else {
      content.style.transform = `scale(${parseInt(value) / 100})`;
      content.style.transformOrigin = "top center";
    }
  };

  const handleExport = async (format) => {
    const fileName = `${data?.docNo || "GRN"}_${
      new Date().toISOString().split("T")[0]
    }`;

    switch (format) {
      case "excel":
        const workbook = XLSX.utils.book_new();

        // Add header information
        const headerData = [
          ["Company:", userDetails?.siteName],
          ["Address:", userDetails?.siteAddress],
          ["City:", `${userDetails?.siteCity} ${userDetails?.sitePostCode}`],
          ["Phone:", userDetails?.sitePhone],
          [""],
          ["GRN No:", data?.docNo],
          ["PO1 Reference:", data?.docRef1 || "-"],
          ["GR1 Reference:", data?.docRef2 || "-"],
          ["Staff Name:", data?.createUser || "Support"],
          ["GRN Date:", new Date(data?.docDate).toLocaleDateString()],
          [""],
        ];

        // Convert items to Excel format
        const tableHeaders = [
          [
            "No",
            "Item Code",
            "Description",
            "Quantity",
            "Unit Price",
            "Amount",
            "Item Cost",
            "Total Cost"
          ],
        ];

        const itemsData = filteredItems.map((item, index) => [
          index + 1,
          item.itemcode,
          item.itemdesc,
          item.docQty,
          item.docPrice,
          item.docAmt,
        ]);

        // Add totals
        const totalQty = filteredItems.reduce(
          (sum, item) => sum + (item.docQty || 0),
          0
        );
        const totalAmt = filteredItems.reduce(
          (sum, item) => sum + (item.docAmt || 0),
          0
        );

        const totalsData = [["", "", "Grand Total", totalQty, "", totalAmt]];

        // Combine all data
        const excelData = [
          ...headerData,
          ...tableHeaders,
          ...itemsData,
          [""],
          ...totalsData,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths
        const columnWidths = [
          { wch: 5 }, // No
          { wch: 15 }, // Item Code
          { wch: 40 }, // Description
          { wch: 10 }, // Quantity
          { wch: 12 }, // Unit Price
          { wch: 12 }, // Amount
        ];
        worksheet["!cols"] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, "GRN Details");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        break;

      case "pdf":
        try {
          const printArea = document.querySelector("#printable-content");

          const canvas = await html2canvas(printArea, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            removeContainer: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
              const clonedElement =
                clonedDoc.querySelector("#printable-content");
              if (clonedElement) {
                // Apply any necessary style corrections to the clone
                clonedElement.style.width = "210mm";
                clonedElement.style.margin = "0";
                clonedElement.style.padding = "10mm";
              }
            },
          });

          const imgData = canvas.toDataURL("image/png", 1.0);

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${fileName}.pdf`);

          toast.success("PDF generated successfully");
        } catch (error) {
          console.error("PDF generation error:", error);
          toast.error("Failed to generate PDF");
        }
        break;

      case "word":
        // Create HTML content for Word
        const htmlContent = `
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 5px; }
                th { background-color: #f0f0f0; }
              </style>
            </head>
            <body>
              ${document.querySelector("#printable-content").innerHTML}
            </body>
          </html>
        `;

        const blob = new Blob([htmlContent], { type: "application/msword" });
        saveAs(blob, `${fileName}.doc`);
        break;

      default:
        console.error("Unsupported format:", format);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="print:hidden mb-6">
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

            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => setExportFormat(value)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="word">Word</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => handleExport(exportFormat)}
                disabled={!exportFormat}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

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

      <div
        id="printable-content"
        className="print-content max-w-4xl mx-auto p-4 border rounded-lg"
      >
        <div className="text-center mb-6">
          <h2 className="font-bold">{userDetails?.siteName}</h2>
          <p className="text-sm">{userDetails?.siteAddress}</p>
          <p className="text-sm">
            {userDetails?.siteCity} {userDetails?.sitePostCode}
          </p>
          <p className="text-sm">Tel: {userDetails?.sitePhone}</p>
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
            <p>
              <span className="w-32 inline-block">Remark 1</span>:{" "}
              {data?.docRemk1 || "-"}
            </p>
            <p>
              <span className="w-32 inline-block">Remark 2</span>:{" "}
              {data?.docRemk2 || "-"}
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
              {/* <th className="py-1 text-right">ITEM COST</th>
              <th className="py-1 text-right">TOTAL COST</th> */}

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
                {/* <td className="py-1 text-right">{(item.docQty * item.docAmt).toFixed(2)}</td> */}
                {/* <td className="py-1 text-right">{item.docPrice}</td>
                <td className="py-1 text-right">{(item.docQty * item.docPrice).toFixed(2)}</td> */}

              </tr>
            ))}

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
      </div>
    </div>
  );
}

export default PrintPreview;
