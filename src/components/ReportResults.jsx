import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { formatCurrentDate } from "@/utils/utils";
import moment from "moment";

// Print-specific CSS styles
const printStyles = `
  @media print {
    .print-content {
      max-width: none !important;
      padding: 5mm !important;
      margin: 0 !important;
      border: none !important;
    }
    
    .print-table {
      font-size: 10px !important;
      line-height: 1.2 !important;
    }
    
    .print-table th,
    .print-table td {
      padding: 4px 6px !important;
      border: 1px solid #ccc !important;
    }
    
    .print-table th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
    
    .print-header {
      margin-bottom: 15px !important;
    }
    
    .print-header h2 {
      font-size: 16px !important;
      margin: 4px 0 !important;
    }
    
    .print-header p {
      font-size: 11px !important;
      margin: 2px 0 !important;
    }
    
    .print-title {
      font-size: 14px !important;
      margin: 8px 0 !important;
    }
    
    .print-fields {
      font-size: 10px !important;
      margin: 8px 0 !important;
    }
    
    .print-fields p {
      margin: 3px 0 !important;
    }
    
    /* Hide non-essential elements in print */
    .print:hidden {
      display: none !important;
    }
    
    /* Page break optimization */
    .print-table tr {
      page-break-inside: avoid !important;
    }
    
    /* Optimize table row spacing for print */
    .print-row {
      height: auto !important;
      min-height: 0 !important;
    }
    
    .print-cell {
      padding: 3px 4px !important;
      height: auto !important;
      min-height: 0 !important;
      line-height: 1.3 !important;
    }
    
    /* Reduce margins and padding for print */
    .print-table th {
      padding: 3px 4px !important;
      height: auto !important;
      min-height: 0 !important;
    }
    
    /* Ensure consistent spacing */
    * {
      box-sizing: border-box !important;
    }
  }
`;

const ITEMS_PER_PAGE = 10;
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

const ReportResults = ({
  title = "Report Results",
  data = [],
  columns = [],
  companyInfo = {},
  reportTitle = "Report",
  executionTime = null,
  outlet = null,
  onExport,
  customFooter = null,
  showSearch = true,
  showPagination = true,
  showPrint = true,
  showExport = true,
  showZoom = true,
  // Additional fields for detailed reports
  reportDetails = {},
  showDetailedInfo = false,
  // New props for outlet grouping
  groupByOutlet = false,
  outletKey = 'Outlet',
  // New prop to control outlet grouping display
  showOutletGrouping = false,
  // New props for Stock Movement item grouping
  groupByItem = false,
  showItemGrouping = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState([]);
  const [exportFormat, setExportFormat] = useState("");
  const [zoom, setZoom] = useState("100");
  const [collapsedOutlets, setCollapsedOutlets] = useState(new Set());
  const [collapsedItems, setCollapsedItems] = useState(new Set());

  // Add print styles to document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Filter data based on search term
  useEffect(() => {
    if (data.length > 0) {
      const filtered = data.filter((item) =>
        Object.values(item).some((val) =>
          val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
      setCurrentPage(1); // Reset to first page when filtering
    }
  }, [searchTerm, data]);

  // Reset current page when switching between grouping modes
  useEffect(() => {
    setCurrentPage(1);
  }, [groupByOutlet, groupByItem]);

  // Group data by outlet if needed
  const groupDataByOutlet = (data) => {
    if (!groupByOutlet) return null;
    
    const grouped = {};
    data.forEach(item => {
      // Handle different outlet key names for different reports
      let outletKeyName = outletKey;
      if (outletKey === 'Outlet' && !item[outletKey]) {
        // For Stock Movement, try alternative outlet keys
        outletKeyName = item.siteName || item.fromStore || 'Unknown';
      }
      
      const outlet = item[outletKeyName] || 'Unknown';
      if (!grouped[outlet]) {
        grouped[outlet] = [];
      }
      grouped[outlet].push(item);
    });
    return grouped;
  };

  // Group data by item for Stock Movement report
  const groupDataByItem = (data) => {
    if (!groupByItem) return null;
    
    const grouped = {};
    data.forEach(item => {
      const itemCode = item.ItemCode || 'Unknown';
      const outlet = item.Outlet || 'Unknown';
      
      // Create unique key combining ItemCode and Outlet
      const uniqueKey = `${itemCode}_${outlet}`;
      
      if (!grouped[uniqueKey]) {
        grouped[uniqueKey] = {
          itemInfo: {
            ItemCode: item.ItemCode,
            ItemName: item.ItemName,
            ItemUOM: item.ItemUOM,
            ItemRange: item.ItemRange,
            Outlet: item.Outlet  // Include outlet in item info
          },
          transactions: []
        };
      }
      grouped[uniqueKey].transactions.push(item);
    });
    return grouped;
  };

  // Calculate outlet totals - make it dynamic for different column structures
  const calculateOutletTotals = (outletData) => {
    return outletData.reduce((totals, item) => {
      // Handle different column structures for different reports
      if (columns.some(col => col.key === 'Qty') && columns.some(col => col.key === 'Cost')) {
        // Stock Balance report structure - updated for new data structure
        totals.qty += Number(item.Qty || 0);
        totals.cost += Number(item.Cost || 0);
        totals.totalCost += Number(item.TotalCost || 0);
        totals.totalAmount += Number(item.TotalAmount || 0);
      } else if (columns.some(col => col.key === 'TranQty') && columns.some(col => col.key === 'TranAmt')) {
        // Stock Movement report structure - use TranQty and TranAmt
        totals.qty += Number(item.TranQty || 0);
        totals.value += Number(item.TranAmt || 0);
      } else if (columns.some(col => col.key === 'trnQty') && columns.some(col => col.key === 'trnAmt')) {
        // Alternative Stock Movement report structure
        totals.qty += Number(item.trnQty || 0);
        totals.value += Number(item.trnAmt || 0);
      }
      return totals;
    }, { qty: 0, cost: 0, totalCost: 0, totalAmount: 0, value: 0 });
  };

  // Calculate item totals by transaction type
  const calculateItemTypeTotals = (transactions) => {
    const typeTotals = {};
    transactions.forEach(trans => {
      const type = trans.TranType || 'Unknown';
      if (!typeTotals[type]) {
        typeTotals[type] = { qty: 0, amount: 0 };
      }
      typeTotals[type].qty += Number(trans.TranQty || 0);
      typeTotals[type].amount += Number(trans.TranAmt || 0);
    });
    return typeTotals;
  };

  // Calculate grand totals - make it dynamic for different column structures
  const calculateGrandTotals = (data) => {
    return data.reduce((totals, item) => {
      // Handle different column structures for different reports
      if (columns.some(col => col.key === 'Qty') && columns.some(col => col.key === 'Cost')) {
        // Stock Balance report structure - updated for new data structure
        totals.qty += Number(item.Qty || 0);
        totals.cost += Number(item.Cost || 0);
        totals.totalCost += Number(item.TotalCost || 0);
        totals.totalAmount += Number(item.TotalAmount || 0);
      } else if (columns.some(col => col.key === 'TranQty') && columns.some(col => col.key === 'TranAmt')) {
        // Stock Movement report structure - use TranQty and TranAmt
        totals.qty += Number(item.TranQty || 0);
        totals.value += Number(item.TranAmt || 0);
      } else if (columns.some(col => col.key === 'trnQty') && columns.some(col => col.key === 'trnAmt')) {
        // Alternative Stock Movement report structure
        totals.qty += Number(item.trnQty || 0);
        totals.value += Number(item.trnAmt || 0);
      }
      return totals;
    }, { qty: 0, cost: 0, totalCost: 0, totalAmount: 0, value: 0 });
  };

  // Toggle outlet collapse state
  const toggleOutlet = (outlet) => {
    setCollapsedOutlets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outlet)) {
        newSet.delete(outlet);
      } else {
        newSet.add(outlet);
      }
      return newSet;
    });
  };

  // Toggle item collapse state
  const toggleItem = (itemCode) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemCode)) {
        newSet.delete(itemCode);
      } else {
        newSet.add(itemCode);
      }
      return newSet;
    });
  };

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const currentItems = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Apply zoom changes when zoom value changes
  useEffect(() => {
    const content = document.querySelector("#printable-content");
    if (content) {
      if (zoom === "auto") {
        content.style.width = "100%";
        content.style.transform = "none";
      } else if (zoom === "page") {
        content.style.width = "210mm";
        content.style.transform = "none";
      } else {
        content.style.width = "100%";
        content.style.transform = `scale(${parseInt(zoom) / 100})`;
        content.style.transformOrigin = "top center";
      }
    }
  }, [zoom]);

  const handlePrint = () => {
    window.print();
  };

  const handleZoomChange = (value) => {
    setZoom(value);
  };

  const handleExport = async (format) => {
    if (!onExport) {
      toast.error("Export functionality not implemented for this report");
      return;
    }

    try {
      await onExport(format, filteredData, columns, companyInfo, reportTitle);
      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const getDefaultExportFunction = async (format) => {
    const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}`;

    switch (format) {
      case "excel":
        const workbook = XLSX.utils.book_new();
        
        // Add header information
        const headerData = [
          [companyInfo.companyName || "Company Name"],
          [companyInfo.address || "Address"],
          [companyInfo.city || "City"],
          [companyInfo.phone || "Phone"],
          [""],
          ["Report Title:", reportTitle],
          ["Execution Time:", executionTime || formatCurrentDate()],
          ["Outlet:", outlet || "All"],
          [""]
        ];

        // Add table headers
        const tableHeaders = [columns.map(col => col.header)];

        // Add data rows
        const itemsData = filteredData.map((item, index) => {
          return columns.map(col => item[col.key] || "");
        });

        // Add totals row
        const totalsRow = columns.map((col, index) => {
          if (col.type === 'number') {
            // Handle different column structures for different reports
            if (col.key === 'Qty' || col.key === 'TranQty' || col.key === 'trnQty') {
              // Quantity columns
              const sum = filteredData.reduce((acc, item) => acc + (Number(item[col.key]) || 0), 0);
              return index === 0 ? "Total:" : sum.toLocaleString();
            } else if (col.key === 'Cost' || col.key === 'TranAmt' || col.key === 'trnAmt' || col.key === 'TotalCost' || col.key === 'TotalAmount') {
              // Value/Amount columns
              const sum = filteredData.reduce((acc, item) => acc + (Number(item[col.key]) || 0), 0);
              return index === 0 ? "Total:" : sum.toFixed(2);
            } else {
              // Other numeric columns
              const sum = filteredData.reduce((acc, item) => acc + (Number(item[col.key]) || 0), 0);
              return index === 0 ? "Total:" : sum.toFixed(2);
            }
          }
          return index === 0 ? "Total:" : "";
        });

        // Combine all data
        const excelData = [
          ...headerData,
          ...tableHeaders,
          ...itemsData,
          [""],
          totalsRow
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle);
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
              const clonedElement = clonedDoc.querySelector("#printable-content");
              if (clonedElement) {
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
        } catch (error) {
          console.error("PDF generation error:", error);
          toast.error("Failed to generate PDF");
        }
        break;

      case "word":
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary">0 items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Printable Content - Always show when report is generated */}
          <div
            id="printable-content"
            className="print-content max-w-none mx-auto p-6 border rounded-lg"
          >
            {/* Company Header */}
            <div className="text-center mb-6 print-header">
              <h2 className="font-bold text-lg">{companyInfo.companyName || "Company Name"}</h2>
              <p className="text-sm">{companyInfo.address || "Address"}</p>
              <p className="text-sm">{companyInfo.city || "City"}</p>
              <p className="text-sm">Tel: {companyInfo.phone || "Phone"}</p>
            </div>

            {/* Report Title Section */}
            <div className="bg-gray-100 py-2 px-4 mb-6 print-title">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">{reportTitle}</h3>
              </div>
            </div>

            {/* Report Info */}
            <div className="print-fields mb-6">
              {showDetailedInfo ? (
                // Detailed report info for Stock Movement
                <div className="grid grid-cols-2 gap-8 text-sm">
                                  <div>
                  <p><span className="w-32 inline-block">Execution Time:</span> {executionTime || formatCurrentDate()}</p>
                  <p><span className="w-32 inline-block">As On Date:</span> {reportDetails.asOnDate || "-"}</p>
                  <p><span className="w-32 inline-block">Site:</span> {reportDetails.site || "-"}</p>
                  <p><span className="w-32 inline-block">Department:</span> {reportDetails.department || "-"}</p>
                  <p><span className="w-32 inline-block">Brand:</span> {reportDetails.brand || "-"}</p>
                </div>
                  <div>
                    <p><span className="w-32 inline-block">From Item:</span> {reportDetails.fromItem || "-"}</p>
                    <p><span className="w-32 inline-block">To Item:</span> {reportDetails.toItem || "-"}</p>
                    <p><span className="w-32 inline-block">Range:</span> {reportDetails.range || "-"}</p>
                    <p><span className="w-32 inline-block">Movement Type:</span> {reportDetails.movementType || "-"}</p>
                    <p><span className="w-32 inline-block">Movement Code:</span> {reportDetails.movementCode || "-"}</p>
                    <p><span className="w-32 inline-block">Supplier:</span> {reportDetails.supplier || "-"}</p>
                  </div>
                </div>
              ) : (
                // Simple report info for basic reports
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p><span className="w-32 inline-block">Execution Time:</span> {executionTime || formatCurrentDate()}</p>
                    {outlet && (
                      <p><span className="w-32 inline-block">Outlet:</span> {outlet}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Table - Always show structure when report is generated */}
            <table className="w-full text-sm border-collapse mb-6 print-table">
              <thead>
                <tr className="border-y bg-gray-50">
                  {columns.map((column, index) => (
                    <th 
                      key={index} 
                      className={`py-3 px-4 text-${column.align || 'left'} font-semibold`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td colSpan={columns.length} className="py-8 px-4 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Page Info */}
            <div className="text-center text-sm text-gray-600 mt-4">
              Page 1 of 1
            </div>

            {/* Custom Footer */}
            {customFooter && (
              <div className="mt-6">
                {customFooter}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">{filteredData.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="print:hidden mb-4 flex items-center justify-between gap-4">
          {showSearch && (
            <Input
              placeholder="Search in report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-[300px]"
            />
          )}

          {/* Zoom Control */}
          {showZoom && (
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
          )}

          <div className="flex items-center gap-2">
            {showPagination && (
              <div className="flex items-center gap-1 border rounded-md px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[80px] text-center">
                  {currentPage} / {
                    groupByItem && showItemGrouping ? 
                      Math.ceil((groupDataByItem(filteredData) ? Object.keys(groupDataByItem(filteredData)).length : 0) / ITEMS_PER_PAGE) :
                      totalPages
                  }
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const maxPage = groupByItem && showItemGrouping ? 
                      Math.ceil((groupDataByItem(filteredData) ? Object.keys(groupDataByItem(filteredData)).length : 0) / ITEMS_PER_PAGE) :
                      totalPages;
                    setCurrentPage((p) => Math.min(maxPage, p + 1));
                  }}
                  disabled={currentPage === (
                    groupByItem && showItemGrouping ? 
                      Math.ceil((groupDataByItem(filteredData) ? Object.keys(groupDataByItem(filteredData)).length : 0) / ITEMS_PER_PAGE) :
                      totalPages
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {showExport && (
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
            )}

            {showPrint && (
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="overflow-auto border rounded-lg">
          <div
            id="printable-content"
            className="print-content mx-auto p-6 transition-all duration-200"
            style={{
              transformOrigin: 'top center',
              width: zoom === 'page' ? '210mm' : '100%',
              minWidth: zoom === 'page' ? '210mm' : 'auto'
            }}
          >
          {/* Company Header */}
          <div className="text-center mb-6 print-header">
            <h2 className="font-bold text-lg">{companyInfo.companyName || "Company Name"}</h2>
            <p className="text-sm">{companyInfo.address || "Address"}</p>
            <p className="text-sm">{companyInfo.city || "City"}</p>
            <p className="text-sm">Tel: {companyInfo.phone || "Phone"}</p>
          </div>

          {/* Report Title Section */}
          <div className="bg-gray-100 py-2 px-4 mb-6 print-title">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{reportTitle}</h3>
            </div>
          </div>

          {/* Report Info */}
          <div className="print-fields mb-6">
            {showDetailedInfo ? (
              // Detailed report info for Stock Movement
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p><span className="w-32 inline-block">Execution Time:</span> {executionTime || formatCurrentDate()}</p>
                  <p><span className="w-32 inline-block">As On Date:</span> {reportDetails.asOnDate || "-"}</p>
                  <p><span className="w-32 inline-block">Site:</span> {reportDetails.site || outlet || "-"}</p>
                  <p><span className="w-32 inline-block">Department:</span> {reportDetails.department || "-"}</p>
                  <p><span className="w-32 inline-block">Brand:</span> {reportDetails.brand || "-"}</p>
                </div>
                <div>
                  <p><span className="w-32 inline-block">From Item:</span> {reportDetails.fromItem || "-"}</p>
                  <p><span className="w-32 inline-block">To Item:</span> {reportDetails.toItem || "-"}</p>
                  <p><span className="w-32 inline-block">Range:</span> {reportDetails.range || "-"}</p>
                  <p><span className="w-32 inline-block">Movement Type:</span> {reportDetails.movementType || "-"}</p>
                  <p><span className="w-32 inline-block">Movement Code:</span> {reportDetails.movementCode || "-"}</p>
                  <p><span className="w-32 inline-block">Supplier:</span> {reportDetails.supplier || "-"}</p>
                </div>
              </div>
            ) : (
              // Simple report info for basic reports
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p><span className="w-32 inline-block">Execution Time:</span> {executionTime || formatCurrentDate()}</p>
                  {outlet && (
                    <p><span className="w-32 inline-block">Outlet:</span> {outlet}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Data Table */}
          {groupByOutlet && showOutletGrouping ? (
            // Outlet Grouped Table with Collapsible Sections
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6 print-table">
                <thead>
                  <tr className="border-y bg-gray-50">
                    {columns.map((column, index) => (
                      <th 
                        key={index} 
                        className={`py-3 px-4 text-${column.align || 'left'} font-semibold`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupedData = groupDataByOutlet(filteredData);
                    const outlets = Object.keys(groupedData || {});
                    
                    return outlets.map(outlet => {
                      const outletData = groupedData[outlet];
                      const outletTotals = calculateOutletTotals(outletData);
                      const isCollapsed = collapsedOutlets.has(outlet);
                      
                      return (
                        <React.Fragment key={outlet}>
                          {/* Outlet Header Row */}
                          <tr className="bg-gray-50 font-semibold print-row">
                            <td className="py-3 px-4 print-cell">
                              <button
                                onClick={() => toggleOutlet(outlet)}
                                className="flex items-center gap-2 text-left font-semibold hover:text-blue-600 transition-colors"
                              >
                                {isCollapsed ? (
                                  <ChevronRightIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                {outlet}
                              </button>
                            </td>
                            <td colSpan={columns.length - 1}></td>
                          </tr>
                          
                          {/* Outlet Items (hidden if collapsed) */}
                          {!isCollapsed && outletData.map((item, index) => (
                            <tr key={`${outlet}-${index}`} className="border-b hover:bg-gray-50 print-row">
                              {columns.map((column, colIndex) => (
                                <td 
                                  key={colIndex} 
                                  className={`py-3 px-3 print-cell text-${column.align || 'left'}`}
                                >
                                  {colIndex === 0 ? "" : (column.render ? column.render(item[column.key], item) : item[column.key])}
                                </td>
                              ))}
                            </tr>
                          ))}
                          
                          {/* Outlet Total Row */}
                          {!isCollapsed && (
                            <tr className="bg-blue-50 font-semibold print-row">
                              <td className="py-3 px-4 font-semibold print-cell">{outlet} Total :</td>
                              <td colSpan={columns.length - 5} className="print-cell"></td>
                              <td className="py-3 px-4 text-right font-semibold print-cell">
                                {(() => {
                                  // Handle different column structures for different reports
                                  if (columns.some(col => col.key === 'Qty')) {
                                    // Stock Balance report - show quantity total
                                    return outletTotals.qty.toLocaleString();
                                  } else if (columns.some(col => col.key === 'TranQty' || col.key === 'trnQty')) {
                                    // Stock Movement report - show transaction quantity total
                                    return outletTotals.qty.toLocaleString();
                                  }
                                  return "0";
                                })()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold print-cell">
                                {(() => {
                                  // Handle different column structures for different reports
                                  if (columns.some(col => col.key === 'TotalCost')) {
                                    // Stock Balance report - show total cost
                                    return outletTotals.totalCost.toFixed(2);
                                  } else if (columns.some(col => col.key === 'Cost')) {
                                    // Stock Balance report - show cost total
                                    return outletTotals.cost.toFixed(2);
                                  } else if (columns.some(col => col.key === 'TranAmt' || col.key === 'trnAmt')) {
                                    // Stock Movement report - show transaction amount total
                                    return outletTotals.value.toFixed(2);
                                  }
                                  return "0.00";
                                })()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold print-cell">
                                {(() => {
                                  // Handle different column structures for different reports
                                  if (columns.some(col => col.key === 'TotalAmount')) {
                                    // Stock Balance report - show total amount
                                    return outletTotals.totalAmount.toFixed(2);
                                  }
                                  return "0.00";
                                })()}
                              </td>
                            </tr>
                          )}
                          
                          {/* Empty row for spacing */}
                          <tr>
                            <td colSpan={columns.length} className="h-2"></td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-blue-100 font-bold text-lg border-t-2 print-row">
                    <td className="py-3 px-4 font-bold print-cell">Total</td>
                    <td colSpan={columns.length - 5} className="print-cell"></td>
                    <td className="py-3 px-4 text-right font-bold print-cell">
                      {(() => {
                        const grandTotals = calculateGrandTotals(filteredData);
                        // Handle different column structures for different reports
                        if (columns.some(col => col.key === 'Qty')) {
                          // Stock Balance report - show quantity total
                          return grandTotals.qty.toLocaleString();
                        } else if (columns.some(col => col.key === 'TranQty' || col.key === 'trnQty')) {
                          // Stock Movement report - show transaction quantity total
                          return grandTotals.qty.toLocaleString();
                        }
                        return "0";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold print-cell">
                      {(() => {
                        const grandTotals = calculateGrandTotals(filteredData);
                        // Handle different column structures for different reports
                        if (columns.some(col => col.key === 'TotalCost')) {
                          // Stock Balance report - show total cost
                          return grandTotals.totalCost.toFixed(2);
                        } else if (columns.some(col => col.key === 'Cost')) {
                          // Stock Balance report - show cost total
                          return grandTotals.cost.toFixed(2);
                        } else if (columns.some(col => col.key === 'TranAmt' || col.key === 'trnAmt')) {
                          // Stock Movement report - show transaction amount total
                          return grandTotals.value.toFixed(2);
                        }
                        return "0.00";
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold print-cell">
                      {(() => {
                        const grandTotals = calculateGrandTotals(filteredData);
                        // Handle different column structures for different reports
                        if (columns.some(col => col.key === 'TotalAmount')) {
                          // Stock Balance report - show total amount
                          return grandTotals.totalAmount.toFixed(2);
                        }
                        return "0.00";
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : groupByItem && showItemGrouping ? (
            // Item Grouped Table for Stock Movement (matching ASP.NET UI exactly)
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mb-6 print-table">
                <thead>
                  <tr className="border-y bg-gray-50">
                    <th className="py-3 px-4 text-left font-semibold">Item</th>
                    <th className="py-3 px-4 text-center font-semibold">Post Date</th>
                    <th className="py-3 px-4 text-center font-semibold">Trans Date</th>
                    <th className="py-3 px-4 text-center font-semibold">Type</th>
                    <th className="py-3 px-4 text-left font-semibold">Trans No</th>
                    <th className="py-3 px-4 text-left font-semibold">From Store</th>
                    <th className="py-3 px-4 text-left font-semibold">To Store</th>
                    <th className="py-3 px-4 text-right font-semibold">Trans Qty</th>
                    <th className="py-3 px-4 text-right font-semibold">Trans Amt</th>
                    <th className="py-3 px-4 text-right font-semibold">Bal Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupedData = groupDataByItem(filteredData);
                    const items = Object.keys(groupedData || {});
                    
                    // Pagination for item groups
                    const totalItemPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                    const currentItemPage = Math.min(currentPage, totalItemPages);
                    const startIndex = (currentItemPage - 1) * ITEMS_PER_PAGE;
                    const endIndex = startIndex + ITEMS_PER_PAGE;
                    const currentItems = items.slice(startIndex, endIndex);
                    
                    return currentItems.map(itemCode => {
                      const itemData = groupedData[itemCode];
                      const { itemInfo, transactions } = itemData;
                      const isCollapsed = collapsedItems.has(itemCode);
                      const typeTotals = calculateItemTypeTotals(transactions);
                      
                      return (
                        <React.Fragment key={itemCode}>
                          {/* Item Header Row */}
                          <tr className="bg-gray-50 font-semibold print-row">
                            <td className="py-3 px-4 print-cell" colSpan="10">
                              <button
                                onClick={() => toggleItem(itemCode)}
                                className="flex items-center gap-2 text-left font-semibold hover:text-blue-600 transition-colors"
                              >
                                {isCollapsed ? (
                                  <ChevronRightIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <span className="font-bold">{itemInfo.ItemCode}</span>
                                <span className="text-gray-600">{itemInfo.ItemName}</span>
                                <span className="text-gray-500">{itemInfo.ItemUOM}</span>
                                <span className="text-gray-500">{itemInfo.ItemRange}</span>
                                {itemInfo.Outlet && itemInfo.Outlet !== 'Unknown' && (
                                  <span className="text-blue-600 font-medium">[{itemInfo.Outlet}]</span>
                                )}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Item Transactions (hidden if collapsed) */}
                          {!isCollapsed && transactions.map((trans, index) => (
                            <tr key={`${itemCode}-${index}`} className="border-b hover:bg-gray-50 print-row">
                              <td className="py-3 px-3 print-cell"></td>
                              <td className="py-3 px-3 print-cell text-center">
                                {moment(trans.PosDate).format("DD/MM/YYYY")}
                              </td>
                              <td className="py-3 px-3 print-cell text-center">
                                {moment(trans.TranDate).format("DD/MM/YYYY")}
                              </td>
                              <td className="py-3 px-3 print-cell text-center font-semibold">
                                {trans.TranType}
                              </td>
                              <td className="py-3 px-3 print-cell">
                                {trans.TranNo}
                              </td>
                              <td className="py-3 px-3 print-cell">
                                {trans.FromStore || ""}
                              </td>
                              <td className="py-3 px-3 print-cell">
                                {trans.ToStore || ""}
                              </td>
                              <td className="py-3 px-3 print-cell text-right">
                                {Number(trans.TranQty).toLocaleString()}
                              </td>
                              <td className="py-3 px-3 print-cell text-right">
                                {Number(trans.TranAmt).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 print-cell text-right">
                                {Number(trans.Balance).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Transaction Type Subtotals (hidden if collapsed) */}
                          {!isCollapsed && Object.entries(typeTotals).map(([type, totals]) => (
                            <tr key={`${itemCode}-${type}-total`} className="bg-blue-50 font-semibold print-row">
                              <td className="py-3 px-4 print-cell" colSpan="7">
                                Total {type === 'SA' ? 'Sales (SA)' : type}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold print-cell">
                                {totals.qty.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold print-cell">
                                {totals.amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 print-cell"></td>
                            </tr>
                          ))}
                          
                          {/* Empty row for spacing */}
                          <tr>
                            <td colSpan="10" className="h-2"></td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-blue-100 font-bold text-lg border-t-2 print-row">
                    <td className="py-3 px-4 font-bold print-cell" colSpan="7">Total</td>
                    <td className="py-3 px-4 text-right font-bold print-cell">
                      {(() => {
                        const grandTotals = calculateGrandTotals(filteredData);
                        return grandTotals.qty.toLocaleString();
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold print-cell">
                      {(() => {
                        const grandTotals = calculateGrandTotals(filteredData);
                        return grandTotals.value.toFixed(2);
                      })()}
                    </td>
                    <td className="py-3 px-4 print-cell"></td>
                  </tr>
                </tbody>
              </table>
              
              {/* Pagination for Item Groups */}
              {(() => {
                const groupedData = groupDataByItem(filteredData);
                const uniqueKeys = Object.keys(groupedData || {});
                const totalItemPages = Math.ceil(uniqueKeys.length / ITEMS_PER_PAGE);
                
                if (totalItemPages > 1) {
                  return (
                    <div className="flex items-center justify-center gap-1 border rounded-md px-2 py-1 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm min-w-[80px] text-center">
                        {currentPage} / {totalItemPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalItemPages, p + 1))
                        }
                        disabled={currentPage === totalItemPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            // Regular Table (existing functionality)
            <table className="w-full text-sm border-collapse mb-6 print-table" style={{ minWidth: zoom === 'page' ? '210mm' : 'auto' }}>
              <thead>
                <tr className="border-y bg-gray-50">
                  {columns.map((column, index) => (
                    <th 
                      key={index} 
                      className={`py-3 px-4 text-${column.align || 'left'} font-semibold`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 print-row">
                    {columns.map((column, colIndex) => (
                      <td 
                        key={colIndex} 
                        className={`py-3 px-3 print-cell text-${column.align || 'left'}`}
                      >
                        {column.render ? column.render(item[column.key], item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                  <td className="py-3 px-4 font-bold">Total:</td>
                  {columns.slice(1).map((column, index) => (
                    <td key={index} className={`py-3 px-4 text-${column.align || 'left'}`}>
                      {column.type === 'number' ? (
                        <span className="font-bold">
                          {(() => {
                            // Handle different column structures for different reports
                            if (column.key === 'Qty' || column.key === 'TranQty' || column.key === 'trnQty') {
                              // Quantity columns
                              return filteredData.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0).toLocaleString();
                            } else if (column.key === 'Cost' || column.key === 'TranAmt' || column.key === 'trnAmt' || column.key === 'TotalCost' || column.key === 'TotalAmount') {
                              // Value/Amount columns
                              return filteredData.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0).toFixed(2);
                            } else {
                              // Other numeric columns
                              return filteredData.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0).toFixed(2);
                            }
                          })()}
                        </span>
                      ) : (
                        index === columns.length - 2 ? "Total" : ""
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {/* Page Info */}
          <div className="text-center text-sm text-gray-600 mt-4">
            {groupByItem && showItemGrouping ? (
              (() => {
                const groupedData = groupDataByItem(filteredData);
                const items = Object.keys(groupedData || {});
                const totalItemPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                return `Page ${currentPage} of ${totalItemPages}`;
              })()
            ) : (
              `Page ${currentPage} of ${totalPages}`
            )}
          </div>

          {/* Custom Footer */}
          {customFooter && (
            <div className="mt-6">
              {customFooter}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
};

export default ReportResults;
