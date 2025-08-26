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
import { buildFilterQuery, format_Date, formatCurrentDate } from "@/utils/utils";
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

// Document type configurations
const DOCUMENT_CONFIGS = {
  'grn': {
    title: 'Goods Receive Note Print',
    docType: 'GRN',
    fields: {
      docNo: 'GRN No.',
      docDate: 'GRN Date',
      docRef1: 'PO1 Reference',
      docRef2: 'GR1 Reference',
      supplier: 'Supplier',
      remarks: ['Remark 1', 'Remark 2']
    }
  },
  'gto': {
    title: 'Goods Transfer Out Print',
    docType: 'GTO',
    fields: {
      docNo: 'TFR No.',
      docDate: 'TFR Date',
      fromStore: 'From Store',
      toStore: 'To Store',
      remarks: ['Remark 1', 'Remark 2']
    }
  },
  'gti': {
    title: 'Goods Transfer In Print', 
    docType: 'GTI',
    fields: {
      docNo: 'TFR No.',
      docDate: 'TFR Date',
      fromStore: 'From Store',
      toStore: 'To Store',
      remarks: ['Remark 1', 'Remark 2']
    }
  },
  'rtn': {
    title: 'Goods Return Note Print',
    docType: 'RTN',
    fields: {
      docNo: 'RTN No.',
      docDate: 'RTN Date',
      docRef1: 'PO1 Reference',
      docRef2: 'GR1 Reference',
      supplier: 'Supplier',
      remarks: ['Remark 1', 'Remark 2']
    }
  },
  'adj': {
    title: 'Stock Adjustment Print',
    docType: 'ADJ',
    fields: {
      docNo: 'Adjustment Stock No.',
      docDate: 'Adjustment Stock Date',
      remarks: ['Remark 1', 'Remark 2']
    }
  },
  'sum': {
    title: 'Stock Usage Memo Print',
    docType: 'SUM',
    fields: {
      docNo: 'Adjustment Stock No.',
      docDate: 'Adjustment Stock Date',
      remarks: ['Remark 1', 'Remark 2']
    }
  }
};

function PrintPreview({ 
  documentType = 'grn',
  data,
  customFields,
  customTitle,
  showSupplier = true,
  showStoreInfo = true,
  customHeaders = [],
  customFooter = null
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const documentData = data || location.state?.item || SAMPLE_DATA;
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  console.log(documentData,'sss')

  // Get document configuration
  const config = DOCUMENT_CONFIGS[documentType] || DOCUMENT_CONFIGS['grn'];
  const finalTitle = customTitle || config.title;
  const finalFields = { ...config.fields, ...customFields };

  // Mode detection based on userDetails flags
  const isAdminMode = userDetails?.isSettingViewCost === "True" || userDetails?.isSettingViewPrice === "True";
  // const isAdminMode = true;

  const currentMode = isAdminMode ? 'admin' : 'user';

  // Column configurations for different modes
  const columnConfigs = {
    user: {
      headers: ['No', 'Item Code', 'Item Description', 'Qty'],
      keys: ['no', 'itemcode', 'itemdesc', 'docQty'],
      widths: [8, 18, 55, 15],
      alignments: ['left', 'left', 'left', 'right'],
      colSpan: 3
    },
    admin: {
      headers: ['No', 'Item Code', 'Item Description', 'Qty', 'Unit Price', 'Amount', ' Cost', 'Total Cost'],
      keys: ['no', 'itemcode', 'itemdesc', 'docQty', 'docPrice', 'docAmt', 'itemprice', 'totalCost'],
      widths: [8, 15, 35, 10, 15, 15, 15, 15],
      alignments: ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right'],
      colSpan: 3
    }
  };

  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState("100");
  const [filteredItems, setFilteredItems] = useState([]);
  const [exportFormat, setExportFormat] = useState("");
  const [selectedMode, setSelectedMode] = useState(isAdminMode ? 'admin' : 'user'); // Default to admin if user has admin permissions
  const [storeOptions, setStoreOptions] = useState([]); // Store store options
  const [titles, setTitles] = useState([]); // Store titles data

  // Update current mode based on selection and permissions
  const effectiveMode = isAdminMode ? selectedMode : 'user';
  const currentColumnConfig = columnConfigs[effectiveMode];

  useEffect(() => {
    const filter = {
      where: {
        docNo: documentData.docNo,
      },
    };

    getDocumentDetails(filter);
  }, [documentData.docNo]);

  useEffect(() => {
    getStoreList();
    getTitles();
  }, []);

  // Update selected mode when admin permissions change
  useEffect(() => {
    if (isAdminMode && selectedMode === 'user') {
      setSelectedMode('admin');
    }
  }, [isAdminMode, selectedMode]);

  // Debug mode detection
  useEffect(() => {
    console.log('PrintPreview Mode Detection:', {
      userDetails,
      isSettingViewCost: userDetails?.isSettingViewCost,
      isSettingViewPrice: userDetails?.isSettingViewPrice,
      isAdminMode,
      selectedMode,
      effectiveMode,
      columnConfig: currentColumnConfig,
      headers: currentColumnConfig.headers,
      colSpan: currentColumnConfig.colSpan,
      headerCount: currentColumnConfig.headers.length,
      expectedColSpan: effectiveMode === 'admin' ? 4 : 4
    });
  }, [userDetails, isAdminMode, selectedMode, effectiveMode, currentColumnConfig]);

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
      const response = await apiService.get(
        `StkMovdocDtls${buildFilterQuery(filter ?? filter)}`
      );
      setItems(response);
    } catch (err) {
      console.error("Error fetching document details:", err);
    }
  };

  const getStoreList = async () => {
    try {
      const res = await apiService.get("/ItemSitelists");
      const options = res
        .filter((store) => store.itemsiteCode)
        .map((store) => ({
          label: store.itemsiteDesc,
          value: store.itemsiteCode,
        }));
      setStoreOptions(options);
    } catch (err) {
      console.error("Error fetching stores:", err);
      toast.error("Failed to fetch store list");
    }
  };

  const getStoreName = (storeCode) => {
    if (!storeCode) return "-";
    const store = storeOptions.find(option => option.value === storeCode);
    return store ? store.label : storeCode;
  };

  const getTitles = async () => {
    try {
      // Create filter object with where clause
      const filter = {
        where: {
          productLicense: documentData?.storeNo || userDetails?.siteCode
          
        }
      };
      
      // Build query string using the existing utility function
      const query = buildFilterQuery(filter);
      
      const response = await apiService.get(`/Titles${query}`);
      setTitles(response[0]);
      console.log("Titles data:", response);
    } catch (err) {
      console.error("Error fetching titles:", err);
      toast.error("Failed to fetch titles");
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

  // Dynamic field rendering based on document type
  const renderDocumentFields = (config, data) => {
    const fields = config.fields;
    
    return (
      <div className="grid grid-cols-2 text-sm mb-4">
        <div>
          <p><span className="w-32 inline-block ">{fields.docNo}</span>: {data?.docNo}</p>
          <p><span className="w-32 inline-block">{fields.docDate}</span>: {format_Date(data?.docDate)}</p>
          
          {/* Conditional fields based on document type */}
          {fields.docRef1 && (
            <p><span className="w-32 inline-block">{fields.docRef1}</span>: {data?.docRef1 || "-"}</p>
          )}
          {fields.docRef2 && (
            <p><span className="w-32 inline-block">{fields.docRef2}</span>: {data?.docRef2 || "-"}</p>
          )}
          {fields.supplier && showSupplier && (
            <p><span className="w-32 inline-block">{fields.supplier}</span>: {data?.supplyNo || "-"}</p>
          )}
          {fields.fromStore && showStoreInfo && (
            <p><span className="w-32 inline-block">{fields.fromStore}</span>: {getStoreName(data?.fstoreNo)}</p>
          )}
          {fields.toStore && showStoreInfo && (
            <p><span className="w-32 inline-block">{fields.toStore}</span>: {getStoreName(data?.tstoreNo)}</p>
          )}
          
          {/* Remarks */}
          {fields.remarks?.map((remark, index) => (
            <p key={index}>
              <span className="w-32 inline-block">{remark}</span>: {data?.[`docRemk${index + 1}`] || "-"}
            </p>
          ))}
        </div>
        <div>
          <p><span className="w-32 inline-block">Print Date</span>: {formatCurrentDate()}</p>
          <p><span className="w-32 inline-block">Print Time</span>: {new Date().toLocaleTimeString()}</p>
          <p><span className="w-32 inline-block">Staff Name</span>: {data?.createUser || data?.docAttn || "Support"}</p>
          <p><span className="w-32 inline-block">Store</span>: {getStoreName(data?.storeNo) || "-"}</p>
        </div>
      </div>
    );
  };

  // Dynamic export headers based on document type
  const getExportHeaders = (config) => {
    const baseHeaders = [
      titles ? [titles.companyHeader1] : ["Company:", userDetails?.siteName],
      titles ? [titles.companyHeader2] : ["Address:", userDetails?.siteAddress],
      titles ? [titles.companyHeader3] : ["City:", `${userDetails?.siteCity} ${userDetails?.sitePostCode}`],
      titles ? [titles.companyHeader4] : ["Phone:", userDetails?.sitePhone],
      [""],
      [`${config.docType} No:`, documentData?.docNo],
    ];
    
    // Add document-specific headers
    if (config.fields.docRef1) {
      baseHeaders.push([config.fields.docRef1, documentData?.docRef1 || "-"]);
    }
    if (config.fields.docRef2) {
      baseHeaders.push([config.fields.docRef2, documentData?.docRef2 || "-"]);
    }
    if (config.fields.supplier && showSupplier) {
      baseHeaders.push([config.fields.supplier, documentData?.supplyNo || "-"]);
    }
         if (config.fields.fromStore && showStoreInfo) {
       baseHeaders.push([config.fields.fromStore, getStoreName(documentData?.fstoreNo)]);
     }
     if (config.fields.toStore && showStoreInfo) {
       baseHeaders.push([config.fields.toStore, getStoreName(documentData?.tstoreNo)]);
     }
    
    baseHeaders.push(
      ["Staff Name:", documentData?.docAttn || documentData?.createUser || "Support"],
      [`${config.docType} Date:`, format_Date(documentData?.docDate)],
      ["Store:", getStoreName(documentData?.storeNo) || "-"],
      [""]
    );
    
    return baseHeaders;
  };

  const handleExport = async (format) => {
    const fileName = `${documentData?.docNo || config.docType}_${
      new Date().toISOString().split("T")[0]
    }`;

    switch (format) {
      case "excel":
        const workbook = XLSX.utils.book_new();

        // Add header information
        const headerData = getExportHeaders(config);



        // Convert items to Excel format
        const tableHeaders = [
          currentColumnConfig.headers
        ];

                 const itemsData = filteredItems.map((item, index) => {
           const row = [
             index + 1,
             item.itemcode,
             item.itemdesc,
             item.docQty,
           ];
           
           if (effectiveMode === 'admin') {
             row.push(
               item.docPrice,
               item.docAmt,
                              (item.itemprice || 0).toFixed(1),
                              ((item.docQty * item.itemprice) || 0).toFixed(1)
             );
           }
           
           return row;
         });

        // Add totals
        const totalQty = filteredItems.reduce(
          (sum, item) => sum + (item.docQty || 0),
          0
        );
        const totalAmt = filteredItems.reduce(
          (sum, item) => sum + (item.docAmt || 0),
          0
        );

                 const totalsRow = ["", "", "Grand Total", totalQty];
         if (effectiveMode === 'admin') {
           totalsRow.push("", totalAmt, "", "");
         }
        const totalsData = [totalsRow];

        // Add signature section for GRN and GTO
        const signatureData = [];
        if (documentType === 'grn' || documentType === 'gto') {
          signatureData.push(
            [""],
            ["Authorised Signature:"],
            ["Sender:"],
            ["Delivery Man:"],
            ["Receiver:"],
            ["Remarks:"]
          );
        }

        // Combine all data
        const excelData = [
          ...headerData,
          ...tableHeaders,
          ...itemsData,
          [""],
          ...totalsData,
          ...signatureData,
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths based on current mode
        const columnWidths = currentColumnConfig.widths.map(width => ({ wch: width }));
        worksheet["!cols"] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, `${config.docType} Details`);
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
             {/* Mode Selector - At the very top */}
        {isAdminMode && (
          <div className=" flex justify-start">
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User Print Preview</SelectItem>
                <SelectItem value="admin">Admin Print Preview</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
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
        className="print-content max-w-6xl mx-auto p-6 border rounded-lg"
      >
        <div className="text-center mb-6">
          {titles ? (
            <>
              <h2 className="font-bold">{titles.companyHeader1}</h2>
              <p className="text-sm">{titles.companyHeader2}</p>
              <p className="text-sm">{titles.companyHeader3}</p>
              <p className="text-sm">{titles.companyHeader4}</p>
            </>
          ) : (
            <>
              <h2 className="font-bold">{userDetails?.siteName}</h2>
              <p className="text-sm">{userDetails?.siteAddress}</p>
              <p className="text-sm">
                {userDetails?.siteCity} {userDetails?.sitePostCode}
              </p>
              <p className="text-sm">Tel: {userDetails?.sitePhone}</p>
            </>
          )}
        </div>



        <div className="bg-gray-100 py-2 px-4 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">{finalTitle}</h3>
          </div>
        </div>

        {/* Dynamic document fields */}
        {renderDocumentFields({ ...config, fields: finalFields }, documentData)}

        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-y bg-gray-50">
              {currentColumnConfig.headers.map((header, index) => (
                <th 
                  key={index} 
                  className={`py-3 px-4 text-${currentColumnConfig.alignments[index]} font-semibold`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
                         {currentItems.map((item, index) => (
               <tr key={index} className="border-b hover:bg-gray-50">
                 <td className="py-3 px-4">
                   {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                 </td>
                 <td className="py-3 px-4 font-medium">{item.itemcode}</td>
                 <td className="py-3 px-4">{item.itemdesc}</td>
                 <td className="py-3 px-4 text-right font-medium">{item.docQty}</td>
                 {effectiveMode === 'admin' && (
                   <>
                     <td className="py-3 px-4 text-right">{item.docPrice || "-"}</td>
                     <td className="py-3 px-4 text-right font-medium">{item.docAmt || "-"}</td>
                                          <td className="py-3 px-4 text-right">{(item.itemprice || 0).toFixed(2)}</td>
                     <td className="py-3 px-4 text-right font-medium">{((item.docQty * item.itemprice) || 0).toFixed(2)}</td>
                   </>
                 )}
               </tr>
             ))}

            {/* Page Total Row */}
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
              <td colSpan={currentColumnConfig.colSpan} className="py-3 px-4 text-right font-bold">
                Page Total:
              </td>
              <td className="py-3 px-4 text-right font-bold text-blue-600">
                {currentItems.reduce(
                  (sum, item) => sum + (item.docQty || 0),
                  0
                )}
              </td>
              {effectiveMode === 'admin' && (
                <>
                  <td className="py-3 px-4 text-right">-</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">
                    {currentItems.reduce(
                      (sum, item) => sum + (item.docAmt || 0),
                      0
                    ).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">-</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">
                    {currentItems.reduce(
                      (sum, item) => sum + ((item.docQty * item.itemprice) || 0),
                      0
                    ).toFixed(2)}
                  </td>
                </>
              )}
            </tr>

            {/* Grand Total Row - Only show on last page */}
            {currentPage === totalPages && (
              <tr className="border-t-4 border-double border-black bg-blue-50 font-bold text-lg">
                <td colSpan={currentColumnConfig.colSpan} className="py-4 px-4 text-right">
                  Grand Total:
                </td>
                <td className="py-4 px-4 text-right text-blue-800">
                  {filteredItems.reduce(
                    (sum, item) => sum + (item.docQty || 0),
                    0
                  )}
                </td>
                {effectiveMode === 'admin' && (
                  <>
                    <td className="py-4 px-4 text-right">-</td>
                    <td className="py-4 px-4 text-right text-blue-800">
                      {filteredItems.reduce(
                        (sum, item) => sum + (item.docAmt || 0),
                        0
                      ).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right">-</td>
                    <td className="py-4 px-4 text-right text-blue-800">
                      {filteredItems.reduce(
                        (sum, item) => sum + ((item.docQty * item.itemprice) || 0),
                        0
                      ).toFixed(2)}
                    </td>
                  </>
                )}
              </tr>
            )}
          </tbody>
        </table>

        {/* Custom footer if provided */}
        {customFooter && (
          <div className="mt-4">
            {customFooter}
          </div>
        )}

        {/* Signature Section for GRN and GTO */}
        {(documentType === 'grn' || documentType === 'gto') && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Authorised Signature:</p>
              <p className="font-semibold text-sm">Sender:</p>
              <p className="font-semibold text-sm">Delivery Man:</p>
              <p className="font-semibold text-sm">Receiver:</p>
              <p className="font-semibold text-sm">Remarks:</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintPreview;
