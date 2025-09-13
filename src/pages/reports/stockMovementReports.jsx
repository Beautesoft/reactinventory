import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, RefreshCw } from "lucide-react";
import moment from "moment";
import apiService from "@/services/apiService";
import { toast } from "sonner";
import apiService1 from "@/services/apiService1";
import { buildFilterQuery } from "@/utils/utils";
import ReportResults from "@/components/ReportResults";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { formatCurrentDate } from "@/utils/utils";

const StockMovementReports = () => {
  const [filters, setFilters] = useState({
    fromDate: "2025-08-01",
    toDate: "2025-08-29",
    site: "",
    departments: [],
    brands: [],
    ranges: [],
    fromItem: "ALL",
    toItem: "ALL",
    movementType: "all",
    movementCodes: [],
    suppliers: []
  });

  // Check if current date is in the future and adjust if needed
  useEffect(() => {
    // Use the exact working dates from ASP.NET
    // ASP.NET shows data for August 2025, so let's use that
    const workingFromDate = "2025-08-01"; // August 1, 2025
    const workingToDate = "2025-08-29";   // August 29, 2025
    
    setFilters(prev => ({
      ...prev,
      fromDate: workingFromDate,
      toDate: workingToDate
    }));
  }, []);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [sites, setSites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [items, setItems] = useState([]);
  const [movementCodes, setMovementCodes] = useState([]);
  const [titles, setTitles] = useState([]);

  // Movement type options
  const movementTypeOptions = [
    { value: "all", label: "All" },
    { value: "in", label: "In" },
    { value: "out", label: "Out" },
  ];

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        await Promise.all([
          loadMasterData(abortController.signal),
          getTitles(abortController.signal)
        ]);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error loading data:', error);
        }
      }
    };
    
    loadData();
    
    return () => {
      abortController.abort();
    };
  }, []);

  const getTitles = async (signal) => {
    try {
      const filter = {
        where: {
          productLicense: JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL"
        }
      };
      
      const query = buildFilterQuery(filter);
      const response = await apiService.get(`/Titles${query}`, { signal });
      setTitles(response[0]);
      console.log("Titles data:", response);
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
        console.error("Error fetching titles:", err);
        toast.error("Failed to fetch titles");
      }
    }
  };

  const loadMasterData = async (signal) => {
    try {
      // Load sites
      const sitesResponse = await apiService.get("ItemSitelists", { signal });
      setSites(sitesResponse || []);

      // Load suppliers
      const supplierResponse = await apiService1.get("/api/Supplier?siteCode=NIL", { signal });
      const supplierOp = (supplierResponse?.result || supplierResponse || []).map((item) => ({
        value: item.supplierCode || item.splyCode || '',
        label: item.supplierName || item.supplydesc || '',
      })).filter(item => item.value && item.label);
      setSuppliers(supplierOp);

      // Load departments
      const deptResponse = await apiService1.get("/api/department?siteCode=NIL", { signal });
      const deptOptions = (deptResponse?.result || deptResponse || []).map((item) => ({
        value: item.departmentCode || item.itmCode || '',
        label: item.departmentName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setDepartments(deptOptions);

      // Load brands
      const brandResponse = await apiService1.get("/api/Brand?siteCode=NIL", { signal });
      const brandOp = (brandResponse?.result || brandResponse || []).map((item) => ({
        value: item.brandCode || item.itmCode || '',
        label: item.brandName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setBrands(brandOp);

      // Load ranges
      const rangeResponse = await apiService1.get("/api/Range?siteCode=NIL&brandCode=NIL", { signal });
      const rangeOp = (rangeResponse?.result || []).map((item) => ({
        value: item.rangeCode,
        label: item.rangeName,
      }));
      setRanges(rangeOp);

      // Load items
      const itemResponse = await apiService1.get("/api/StockList?siteCode=NIL", { signal });
      const itemsOp = (itemResponse?.result || itemResponse || []).map((item) => ({
        value: item.itemCode || item.stockCode || '',
        label: item.itemName || item.stockName || '',
      })).filter(item => item.value && item.label);
      setItems(itemsOp);

      // Load movement codes
      const movementCodeResponse = await apiService1.get("/api/MovementCode?siteCode=NIL", { signal });
      const movementCodeOp = (movementCodeResponse?.result || movementCodeResponse || []).map((item) => ({
        value: item.movementCode || item.departmentCode || '',
        label: item.movementName || item.departmentName || '',
      })).filter(item => item.value && item.label);
      setMovementCodes(movementCodeOp);

      console.log("Master data loaded successfully");
    } catch (error) {
      if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
        console.error("Error loading master data:", error);
        toast.error("Failed to load master data");
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    if (!filters.fromDate) {
      toast.error("From Date is mandatory");
      return;
    }

    if (!filters.toDate) {
      toast.error("To Date is mandatory");
      return;
    }

    if (filters.fromDate > filters.toDate) {
      toast.error("From Date cannot be greater than To Date");
      return;
    }

    // Site is NOT mandatory - ASP.NET automatically includes all sites if none selected
    // We'll handle this in the payload building

    setLoading(true);
    try {
      // Build the request payload exactly as the ASP.NET code expects
      const requestPayload = {
        fromDate: moment(filters.fromDate).format("DD/MM/YYYY"), // ASP.NET expects DD/MM/YYYY format
        toDate: moment(filters.toDate).format("DD/MM/YYYY"), // ASP.NET expects DD/MM/YYYY format
        Site: filters.site || "", // Site can be empty - ASP.NET will include all sites
        Dept: filters.departments.length > 0 ? filters.departments.map(dept => dept.value).join(',') : "",
        Brand: filters.brands.length > 0 ? filters.brands.map(brand => brand.value).join(',') : "",
        fromItem: filters.fromItem === "ALL" ? "Select" : filters.fromItem, // ASP.NET uses "Select" as default
        toItem: filters.toItem === "ALL" ? "Select" : filters.toItem,   // ASP.NET uses "Select" as default
        Range: filters.ranges.length > 0 ? filters.ranges.map(range => range.value).join(',') : "",
        MovementCode: filters.movementCodes.length > 0 ? filters.movementCodes.map(code => code.value).join(',') : "",
        MovementType: filters.movementType === "all" ? "all" : filters.movementType, // ASP.NET uses "all"
        Supplier: filters.suppliers.length > 0 ? filters.suppliers.map(supplier => supplier.value).join(',') : ""
      };

      const response = await apiService1.post("/api/webBI_StockMovementDetail", requestPayload);

      if (response && response.success === "1") {
        if (response.result && Array.isArray(response.result) && response.result.length > 0) {
          setReportData(response.result);
          setHasGeneratedReport(true);
          toast.success(`Report generated with ${response.result.length} items`);
        } else {
          setReportData([]);
          setHasGeneratedReport(true);
          toast.info(response.error || "No items found for the selected criteria");
        }
      } else if (response && response.error) {
        setReportData([]);
        setHasGeneratedReport(true);
        toast.error(response.error);
      } else {
        setReportData([]);
        setHasGeneratedReport(true);
        toast.warning("Received unexpected response format from server");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
      setReportData([]);
      setHasGeneratedReport(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      fromDate: "2025-08-01",
      toDate: "2025-08-29",
      site: "",
      departments: [],
      brands: [],
      ranges: [],
      fromItem: "ALL",
      toItem: "ALL",
      movementType: "all",
      movementCodes: [],
      suppliers: []
    });
    setReportData([]);
    setHasGeneratedReport(false);
  };

  // Define columns for Stock Movement report
  const columns = [
    {
      key: "ItemCode",
      header: "Item Code",
      align: "left",
      type: "text"
    },
    {
      key: "ItemName", 
      header: "Item Name",
      align: "left",
      type: "text"
    },
    {
      key: "ItemUOM",
      header: "UOM",
      align: "center",
      type: "text"
    },
    {
      key: "ItemRange",
      header: "Range",
      align: "left",
      type: "text"
    },
    {
      key: "TranDate",
      header: "Transaction Date",
      align: "center",
      type: "date",
      render: (value) => moment(value).format("DD/MM/YYYY")
    },
    {
      key: "PosDate",
      header: "Post Date",
      align: "center", 
      type: "date",
      render: (value) => moment(value).format("DD/MM/YYYY")
    },
    {
      key: "TranNo",
      header: "Transaction No",
      align: "left",
      type: "text"
    },
    {
      key: "TranType",
      header: "Transaction Type",
      align: "center",
      type: "text"
    },
    {
      key: "Customer",
      header: "Customer",
      align: "left",
      type: "text"
    },
    {
      key: "FromStore",
      header: "From Store",
      align: "left",
      type: "text"
    },
    {
      key: "ToStore",
      header: "To Store", 
      align: "left",
      type: "text"
    },
    {
      key: "TranQty",
      header: "Transaction Qty",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString()
    },
    {
      key: "TranQtySA",
      header: "SA Qty",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString()
    },
    {
      key: "TranAmt",
      header: "Transaction Amount",
      align: "right",
      type: "number",
      render: (value) => Number(value).toFixed(2)
    },
    {
      key: "Balance",
      header: "Balance",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString()
    },
    {
      key: "Outlet",
      header: "Outlet",
      align: "left",
      type: "text"
    },
    {
      key: "Supplier",
      header: "Supplier",
      align: "left",
      type: "text"
    }
  ];

  // Company information
  const companyInfo = {
    companyName: titles?.companyHeader1 || "VITAZEN BEAUTY SDN. BHD. 201001020225 (903987-A)",
    address: titles?.companyHeader2 || "No.38A-1 Jalan PJU 5/11",
    city: titles?.companyHeader3 || "Dataran Sunway Kota Damansara, 47810 Petaling Jaya",
    phone: titles?.companyHeader4 || "Tel: 018-360 7691, 03-6143 6491"
  };

  // Custom export function for ReportResults component
  const handleCustomExport = async (format, data, columns, companyInfo, reportTitle) => {
    const fileName = `Stock_Movement_Report_${new Date().toISOString().split("T")[0]}`;

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
          ["Execution Time:", moment().format("DD/MM/YYYY HH:mm:ss")],
          ["From Date:", filters.fromDate ? moment(filters.fromDate).format("DD/MM/YYYY") : "-"],
          ["To Date:", filters.toDate ? moment(filters.toDate).format("DD/MM/YYYY") : "-"],
          ["Site:", filters.site || "ALL"],
          [""]
        ];

        // Group data by item for export
        const groupedData = {};
        data.forEach(item => {
          const itemCode = item.ItemCode || 'Unknown';
          if (!groupedData[itemCode]) {
            groupedData[itemCode] = {
              itemInfo: {
                ItemCode: item.ItemCode,
                ItemName: item.ItemName,
                ItemUOM: item.ItemUOM,
                ItemRange: item.ItemRange
              },
              transactions: []
            };
          }
          groupedData[itemCode].transactions.push(item);
        });

        // Add table headers
        const tableHeaders = [
          ["Item", "Post Date", "Trans Date", "Type", "Trans No", "From Store", "To Store", "Trans Qty", "Trans Amt", "Bal Qty"]
        ];

        // Add data rows with item grouping
        const itemsData = [];
        Object.entries(groupedData).forEach(([itemCode, itemData]) => {
          // Add item header row
          itemsData.push([
            `${itemData.itemInfo.ItemCode} ${itemData.itemInfo.ItemName} ${itemData.itemInfo.ItemUOM} ${itemData.itemInfo.ItemRange}`,
            "", "", "", "", "", "", "", "", ""
          ]);
          
          // Add transaction rows
          itemData.transactions.forEach(trans => {
            itemsData.push([
              "",
              moment(trans.PosDate).format("DD/MM/YYYY"),
              moment(trans.TranDate).format("DD/MM/YYYY"),
              trans.TranType,
              trans.TranNo,
              trans.FromStore || "",
              trans.ToStore || "",
              Number(trans.TranQty).toLocaleString(),
              Number(trans.TranAmt).toFixed(2),
              Number(trans.Balance).toLocaleString()
            ]);
          });
          
          // Add transaction type subtotals
          const typeTotals = {};
          itemData.transactions.forEach(trans => {
            const type = trans.TranType || 'Unknown';
            if (!typeTotals[type]) {
              typeTotals[type] = { qty: 0, amount: 0 };
            }
            typeTotals[type].qty += Number(trans.TranQty || 0);
            typeTotals[type].amount += Number(trans.TranAmt || 0);
          });
          
          Object.entries(typeTotals).forEach(([type, totals]) => {
            itemsData.push([
              `Total ${type === 'SA' ? 'Sales (SA)' : type}`,
              "", "", "", "", "", "",
              totals.qty.toLocaleString(),
              totals.amount.toFixed(2),
              ""
            ]);
          });
          
          // Add empty row for spacing
          itemsData.push(["", "", "", "", "", "", "", "", "", ""]);
        });

        // Add grand totals row
        const grandTotals = data.reduce((totals, item) => {
          totals.qty += Number(item.TranQty || 0);
          totals.amount += Number(item.TranAmt || 0);
          return totals;
        }, { qty: 0, amount: 0 });

        const totalsRow = [
          "Total", "", "", "", "", "", "",
          grandTotals.qty.toLocaleString(),
          grandTotals.amount.toFixed(2),
          ""
        ];

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
            orientation: "landscape", // Use landscape for wide tables
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
                th, td { border: 1px solid black; padding: 5px; font-size: 10px; }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movement - Detail</h1>
          <p className="text-gray-600 mt-2">Track detailed stock movement transactions with comprehensive filtering options</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Filters */}
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date *</Label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate">To Date *</Label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Single Select Filters */}
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Select value={filters.site} onValueChange={(value) => handleFilterChange("site", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site (optional - all sites included if none selected)" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.itemsiteCode} value={site.itemsiteCode}>
                      {site.itemsiteDesc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movementType">Movement Type</Label>
              <Select value={filters.movementType} onValueChange={(value) => handleFilterChange("movementType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  {movementTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromItem">From Item</Label>
              <Select value={filters.fromItem} onValueChange={(value) => handleFilterChange("fromItem", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select from item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toItem">To Item</Label>
              <Select value={filters.toItem} onValueChange={(value) => handleFilterChange("toItem", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select to item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Multiselect Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="movementCodes">Movement Code</Label>
              <MultiSelect
                options={movementCodes}
                selected={filters.movementCodes}
                onChange={(value) => handleFilterChange("movementCodes", value)}
                placeholder="Select movement codes..."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suppliers">Supplier</Label>
                             <MultiSelect
                 options={suppliers}
                 selected={filters.suppliers}
                 onChange={(value) => handleFilterChange("suppliers", value)}
                 placeholder="Select suppliers..."
                 className="w-full"
               />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departments">Department</Label>
              <MultiSelect
                options={departments}
                selected={filters.departments}
                onChange={(value) => handleFilterChange("departments", value)}
                placeholder="Select departments..."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brands">Brand</Label>
              <MultiSelect
                options={brands}
                selected={filters.brands}
                onChange={(value) => handleFilterChange("brands", value)}
                placeholder="Select brands..."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ranges">Range</Label>
              <MultiSelect
                options={ranges}
                selected={filters.ranges}
                onChange={(value) => handleFilterChange("ranges", value)}
                placeholder="Select ranges..."
                className="w-full"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !filters.fromDate || !filters.toDate}
              className="px-8 py-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results - Using ReportResults Component */}
      {hasGeneratedReport && (
        <ReportResults
          title="Stock Movement Report Results"
          data={reportData}
          columns={columns}
          companyInfo={companyInfo}
          reportTitle="Stock Movement - Detail"
          executionTime={moment().format("DD/MM/YYYY HH:mm:ss")}
          outlet={filters.site ? sites.find(s => s.itemsiteCode === filters.site)?.itemsiteDesc : "ALL"}
          onExport={handleCustomExport}
          showSearch={true}
          showPagination={true}
          showPrint={true}
          showExport={true}
          showZoom={true}
          showDetailedInfo={true}
          groupByOutlet={false}
          showOutletGrouping={false}
          groupByItem={true}
          showItemGrouping={true}
          reportDetails={{
            fromDate: filters.fromDate ? moment(filters.fromDate).format("DD/MM/YYYY") : "-",
            toDate: filters.toDate ? moment(filters.toDate).format("DD/MM/YYYY") : "-",
            site: filters.site || "ALL",
            department: filters.departments.length > 0 ? filters.departments.map(dept => dept.label).join(", ") : "ALL",
            brand: filters.brands.length > 0 ? filters.brands.map(brand => brand.label).join(", ") : "ALL",
            fromItem: filters.fromItem || "ALL",
            toItem: filters.toItem || "ALL",
            range: filters.ranges.length > 0 ? filters.ranges.map(range => range.label).join(", ") : "ALL",
            movementType: filters.movementType === "all" ? "All" : filters.movementType || "ALL",
            movementCode: filters.movementCodes.length > 0 ? filters.movementCodes.map(code => code.label).join(", ") : "ALL",
            supplier: filters.suppliers.length > 0 ? filters.suppliers.map(supplier => supplier.label).join(", ") : "ALL"
          }}
        />
      )}
    </div>
  );
};

export default StockMovementReports;
