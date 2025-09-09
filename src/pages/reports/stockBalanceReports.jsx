import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, RefreshCw } from "lucide-react";
import moment from "moment";
import apiService from "@/services/apiService";
import { toast } from "sonner";
import apiService1, { ApiService1 } from "@/services/apiService1";
import { buildFilterQuery } from "@/utils/utils";
import ReportResults from "@/components/ReportResults";
import * as XLSX from "xlsx";


const StockBalanceReports = () => {
  

  const [filters, setFilters] = useState({
    departments: [],
    brands: [],
    ranges: [],
    items: [],
    site: [], // Ensure this is always an array
    asOnDate: new Date().toISOString().split("T")[0],
    showZeroQty: false,
    showInactive: false,
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [items, setItems] = useState([]);
  const [titles, setTitles] = useState([]); // Store titles data
  



  useEffect(() => {
    loadMasterData();
    getTitles();
  }, []);

  const getTitles = async () => {
    try {
      // Create filter object with where clause
      const filter = {
        where: {
          productLicense: JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL"
        }
      };
      
      // Build query string using the existing utility function
      const query = buildFilterQuery(filter);
      
      const response = await apiService.get(`/Titles${query}`);
      setTitles(response[0]);
    } catch (err) {
      console.error("Error fetching titles:", err);
      toast.error("Failed to fetch titles");
    }
  };

  const loadMasterData = async () => {
    try {
      // Load sites - using the same pattern as addGrn.jsx
      const sitesResponse = await apiService.get("ItemSitelists");
      setSites(sitesResponse || []);

      // Load brands - using the correct API endpoint from ASP.NET code
      const brandResponse = await apiService1.get("/api/Brand?siteCode=NIL");
      const brandOp = (brandResponse.result || []).map((item) => ({
        value: item.brandCode || item.itmCode || '',
        label: item.brandName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setBrands(brandOp);

      // Load ranges - using the correct API endpoint from ASP.NET code
      const rangeResponse = await apiService1.get("/api/Range?siteCode=NIL&brandCode=NIL");
      const rangeOp = (rangeResponse.result || []).map((item) => ({
        value: item.rangeCode || item.itmCode || '',
        label: item.rangeName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setRanges(rangeOp);

      // Load departments - using the correct API endpoint from ASP.NET code
      const deptResponse = await apiService1.get("/api/department?siteCode=NIL");
      const deptOptions = (deptResponse.result || []).map((item) => ({
        value: item.departmentCode || item.itmCode || '',
        label: item.departmentName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setDepartments(deptOptions);

      // Load items - using the correct API endpoint from ASP.NET code
      const itemResponse = await apiService1.get("/api/StockList?siteCode=NIL");
      const itemsOp = (itemResponse.result || []).map((item) => ({
        value: item.itemCode || item.stockCode || '',
        label: item.itemName || item.stockName || '',
      })).filter(item => item.value && item.label);
      setItems(itemsOp);
    } catch (error) {
      console.error("Error loading master data:", error);
      toast.error("Failed to load master data");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    // Validation checks - date and site are mandatory
    if (!filters.asOnDate) {
      toast.error("As On Date is mandatory");
      return;
    }
    
    if (!Array.isArray(filters.site) || filters.site.length === 0) {
      toast.error("Please select at least one site to generate the report");
      return;
    }

    setLoading(true);
    try {
      // Build the request payload exactly as the ASP.NET code expects
      const requestPayload = {
        toDate: moment(filters.asOnDate).format("DD/MM/YYYY"), // Convert to DD/MM/YYYY format as ASP.NET expects
        Site: Array.isArray(filters.site) && filters.site.length > 0 ? filters.site.map(site => site.value).join(',') : '',
        Dept: filters.departments.map(dept => dept.value).join(','),
        Brand: filters.brands.map(brand => brand.value).join(','),
        fromItem: filters.items.length > 0 ? filters.items[0]?.value || '' : '',
        toItem: filters.items.length > 1 ? filters.items[filters.items.length - 1]?.value || '' : filters.items[0]?.value || '',
        Range: filters.ranges.map(range => range.value).join(','),
        showInActive: filters.showInactive ? 'Y' : 'N',
        showZeroQty: filters.showZeroQty ? 'Y' : 'N'
      };

      // Call the correct API endpoint from ASP.NET code
      const response = await apiService1.post("/api/webInventory_StockBalance", requestPayload);

      // Handle the response structure - ASP.NET returns DataTable directly
      if (response && response.success === "1") {
        if (response.result && Array.isArray(response.result) && response.result.length > 0) {
          // Process the data to add calculated fields
          const processedData = response.result.map(item => ({
            ...item,
            // Calculate TotalCost = Qty * Cost
            TotalCost: (Number(item.Qty || 0) * Number(item.Cost || 0)).toFixed(2),
            // Calculate TotalAmount = Qty * Price
            TotalAmount: (Number(item.Qty || 0) * Number(item.Price || 0)).toFixed(2)
          }));
          
          setReportData(processedData);
          setHasGeneratedReport(true);
          toast.success(`Report generated with ${processedData.length} items`);
        } else {
          // Success but no data
          setReportData([]);
          setHasGeneratedReport(true);
          toast.info("No items found for the selected criteria");
        }
      } else if (response && response.error) {
        // API returned an error
        setReportData([]);
        setHasGeneratedReport(true);
        toast.error(response.error);
      } else if (!response || !Array.isArray(response)) {
        // Unexpected response format
        toast.warning("Received unexpected response format from server");
        setReportData([]);
        setHasGeneratedReport(true);
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
      departments: [],
      brands: [],
      ranges: [],
      items: [],
      site: [], // Ensure this is always an array
      asOnDate: new Date().toISOString().split("T")[0],
      showZeroQty: false,
      showInactive: false,
    });
    setReportData([]);
    setHasGeneratedReport(false);
  };

  // Column configuration for the report - updated headers as requested
  const columns = [
    { key: 'Outlet', header: 'Outlet', align: 'left' },
    { key: 'Dept', header: 'Description', align: 'left' },
    { key: 'Brand', header: 'Brand', align: 'left' },
    { key: 'Ranges', header: 'Range', align: 'left' },
    { key: 'ItemName', header: 'Item Name', align: 'left' },
    { key: 'UOM', header: 'UOM', align: 'left' },
    { key: 'Qty', header: 'Qty', align: 'right', type: 'number', render: (value) => Number(value).toLocaleString() },
    { key: 'Cost', header: 'Cost Price', align: 'right', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'TotalCost', header: 'Total Cost', align: 'right', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'Price', header: 'Selling Price', align: 'right', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'TotalAmount', header: 'Total Amount', align: 'right', type: 'number', render: (value) => Number(value).toFixed(2) }
  ];

  // Company information - use titles from API if available, fallback to default
  const companyInfo = {
    companyName: titles?.companyHeader1 || "VITAZEN BEAUTY SDN. BHD. 201001020225 (903987-A)",
    address: titles?.companyHeader2 || "No.38A-1 Jalan PJU 5/11",
    city: titles?.companyHeader3 || "Dataran Sunway Kota Damansara, 47810 Petaling Jaya",
    phone: titles?.companyHeader4 || "Tel: 018-360 7691, 03-6143 6491"
  };

  // Custom export function for ReportResults component
  const handleCustomExport = async (format, data, columns, companyInfo, reportTitle) => {
    const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}`;

    switch (format) {
      case "excel":
        // For now, we'll use a simple export since the complex outlet grouping is handled by ReportResults
        // This can be enhanced later if needed
        const workbook = XLSX.utils.book_new();
        
        // Add header information
        const headerData = [
          [companyInfo.companyName],
          [companyInfo.address],
          [companyInfo.city],
          [companyInfo.phone],
          [""],
          ["Report Title:", reportTitle],
          ["Execution Time:", moment().format("DD/MM/YYYY HH:mm:ss")],
          ["Sites:", Array.isArray(filters.site) && filters.site.length > 0 ? filters.site.map(s => s.label).join(', ') : "ALL"],
          [""]
        ];

        // Add table headers
        const tableHeaders = [columns.map(col => col.header)];

        // Add data rows - grouped by outlet with totals
        const itemsData = [];
        const groupedData = {};
        
        // Group data by outlet
        data.forEach(item => {
          const outlet = item.Outlet || 'Unknown';
          if (!groupedData[outlet]) {
            groupedData[outlet] = [];
          }
          groupedData[outlet].push(item);
        });
        
        // Add data with outlet grouping
        Object.keys(groupedData).forEach(outlet => {
          const outletData = groupedData[outlet];
          
          // Add outlet header row
          itemsData.push([outlet, "", "", "", "", "", "", "", "", "", ""]);
          
          // Add outlet items
          outletData.forEach(item => {
            itemsData.push([
              "", // Empty outlet column for items
              item.Dept || "",
              item.Brand || "",
              item.Ranges || "",
              item.ItemName || "",
              item.UOM || "",
              Number(item.Qty || 0),
              Number(item.Cost || 0),
              Number(item.TotalCost || 0),
              item.Price || "-",
              item.TotalAmount || "-"
            ]);
          });
          
          // Calculate outlet totals
          const outletTotals = outletData.reduce((totals, item) => {
            totals.qty += Number(item.Qty || 0);
            totals.cost += Number(item.Cost || 0);
            totals.totalCost += Number(item.TotalCost || 0);
            totals.totalAmount += Number(item.TotalAmount || 0);
            return totals;
          }, { qty: 0, cost: 0, totalCost: 0, totalAmount: 0 });
          
          // Add outlet total row
          itemsData.push([
            `${outlet} Total :`,
            "",
            "",
            "",
            "",
            "",
            outletTotals.qty,
            outletTotals.cost,
            outletTotals.totalCost,
            "-",
            outletTotals.totalAmount
          ]);
          
          // Add empty row for spacing
          itemsData.push(["", "", "", "", "", "", "", "", "", "", ""]);
        });

        // Calculate grand totals
        const grandTotals = data.reduce((totals, item) => {
          totals.qty += Number(item.Qty || 0);
          totals.cost += Number(item.Cost || 0);
          totals.totalCost += Number(item.TotalCost || 0);
          totals.totalAmount += Number(item.TotalAmount || 0);
          return totals;
        }, { qty: 0, cost: 0, totalCost: 0, totalAmount: 0 });
        
        // Add grand totals row
        const totalsRow = ["Total", "", "", "", "", "", grandTotals.qty, grandTotals.cost, grandTotals.totalCost, "-", grandTotals.totalAmount];

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

      default:
        throw new Error(`Export format ${format} not implemented`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
             <div className="flex items-center justify-between">
         <div>
           <h1 className="text-3xl font-bold text-gray-900">Stock Balance Report</h1>
           <p className="text-gray-600 mt-2">Generate comprehensive stock balance reports with detailed item information and export capabilities</p>
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
                    <Card className="print-content">
              <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Multiselect Filters */}
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

            <div className="space-y-2">
              <Label htmlFor="items">Item</Label>
                             <MultiSelect
                 options={items}
                 selected={filters.items}
                 onChange={(value) => handleFilterChange("items", value)}
                 placeholder="Select items..."
                 className="w-full"
               />
            </div>

            {/* Single Select Filters */}
            <div className="space-y-2">
              <Label htmlFor="site">Site *</Label>
              <MultiSelect
                options={sites.map((site) => ({
                  value: site.itemsiteCode,
                  label: site.itemsiteDesc
                }))}
                selected={filters.site}
                onChange={(value) => handleFilterChange("site", value)}
                placeholder="Select sites..."
                className="w-full"
              />
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="asOnDate">As on Date *</Label>
              <input
                type="date"
                value={filters.asOnDate}
                onChange={(e) => handleFilterChange("asOnDate", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkbox Filters */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showZeroQty"
                checked={filters.showZeroQty}
                onCheckedChange={(checked) => handleFilterChange("showZeroQty", checked)}
              />
              <Label htmlFor="showZeroQty">Show 0 Qty Items</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showInactive"
                checked={filters.showInactive}
                onCheckedChange={(checked) => handleFilterChange("showInactive", checked)}
              />
              <Label htmlFor="showInactive">Show Inactive Items</Label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !filters.asOnDate}
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
          title="Stock Balance Report Results"
          data={reportData}
          columns={columns}
          companyInfo={companyInfo}
          reportTitle="Stock Balance Report"
          executionTime={moment().format("DD/MM/YYYY HH:mm:ss")}
          outlet={Array.isArray(filters.site) && filters.site.length > 0 ? filters.site.map(s => s.label).join(', ') : "ALL"}
          onExport={handleCustomExport}
          showSearch={true}
          showPagination={false}
          showPrint={true}
          showExport={true}
          showZoom={true}
          groupByOutlet={true}
          showOutletGrouping={true}
          outletKey="Outlet"
          customFooter={
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Generated on {moment().format("DD/MM/YYYY HH:mm:ss")}</p>
              <p>As On Date: {moment(filters.asOnDate).format("DD/MM/YYYY")}</p>
              <p>Selected Sites: {Array.isArray(filters.site) && filters.site.length > 0 ? filters.site.map(s => s.label).join(', ') : "ALL"}</p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default StockBalanceReports;
