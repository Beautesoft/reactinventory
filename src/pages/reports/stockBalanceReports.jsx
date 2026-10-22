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
import { buildFilterQuery, filterActiveItemSites } from "@/utils/utils";
import { displayItemCode } from "@/utils/itemMaster/itemCodeHelpers";
import ReportResults from "@/components/ReportResults";
import * as XLSX from "xlsx";

const norm = (value) => String(value || "").trim().toUpperCase();

const formatBatchExpiry = (expDate) => {
  if (!expDate) return "";
  const parsed = moment(expDate);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "";
};

/** Current on-hand batches for the selected sites. ItemBatches has no as-of history. */
const loadItemBatches = async (siteCodes) => {
  const pageSize = 500;
  const rows = [];
  let skip = 0;

  while (skip <= 20000) {
    const filter = {
      where: { siteCode: { inq: siteCodes } },
      fields: {
        itemCode: true,
        siteCode: true,
        batchNo: true,
        uom: true,
        qty: true,
        expDate: true,
      },
      limit: pageSize,
      skip,
      order: "itemCode ASC",
    };
    const page = await apiService.get(
      `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
    );
    const chunk = Array.isArray(page) ? page : [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    skip += pageSize;
  }

  return rows;
};

const attachBatchDetails = (rows, batchRows, showZeroQty) => {
  const byItemUom = new Map();
  const byItem = new Map();

  batchRows.forEach((batch) => {
    const qty = Number(batch.qty) || 0;
    if (!showZeroQty && qty === 0) return;

    const entry = {
      batchNo: String(batch.batchNo || "").trim() || "No Batch",
      expDateLabel: formatBatchExpiry(batch.expDate),
      qty,
    };
    const itemKey = `${norm(batch.siteCode)}|${norm(displayItemCode(batch.itemCode))}`;
    const uomKey = `${itemKey}|${norm(batch.uom)}`;
    if (!byItemUom.has(uomKey)) byItemUom.set(uomKey, []);
    byItemUom.get(uomKey).push(entry);
    if (!byItem.has(itemKey)) byItem.set(itemKey, []);
    byItem.get(itemKey).push(entry);
  });

  const sortBatches = (list) =>
    [...list].sort((a, b) => {
      if (!a.expDateLabel && !b.expDateLabel) return a.batchNo.localeCompare(b.batchNo);
      if (!a.expDateLabel) return 1;
      if (!b.expDateLabel) return -1;
      return (
        moment(a.expDateLabel, "DD/MM/YYYY").valueOf() -
        moment(b.expDateLabel, "DD/MM/YYYY").valueOf()
      );
    });

  return rows.map((row) => {
    const itemKey = `${norm(row.siteCode)}|${norm(displayItemCode(row.ItemCode))}`;
    const uomKey = `${itemKey}|${norm(row.UOM)}`;
    const batches = sortBatches(byItemUom.get(uomKey) || byItem.get(itemKey) || []);
    return {
      ...row,
      batches,
      batchText: batches
        .map((batch) => `${batch.batchNo} ${batch.expDateLabel} ${batch.qty}`)
        .join(" "),
    };
  });
};


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
    showBatchDetails: false,
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
      // Create filter object with where clause
      const filter = {
        where: {
          productLicense: JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL"
        }
      };
      
      // Build query string using the existing utility function
      const query = buildFilterQuery(filter);
      
      const response = await apiService.get(`/Titles${query}`, { signal });
      setTitles(response[0]);
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
        console.error("Error fetching titles:", err);
        toast.error("Failed to fetch titles");
      }
    }
  };

  const toArray = (response) => {
    if (Array.isArray(response?.result)) return response.result;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  };

  const loadMasterData = async (signal) => {
    try {
      const siteCode = JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL";

      // Load sites - using the same pattern as addGrn.jsx
      const sitesResponse = await apiService.get("ItemSitelists", { signal });
      setSites(filterActiveItemSites(sitesResponse));

      // Load brands - using the correct API endpoint from ASP.NET code
      const brandResponse = await apiService1.get(`/api/Brand?siteCode=${siteCode}`, { signal });
      const brandOp = toArray(brandResponse).map((item) => ({
        value: item.brandCode || item.itmCode || '',
        label: item.brandName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setBrands(brandOp);

      // Load ranges - using the correct API endpoint from ASP.NET code
      const rangeResponse = await apiService1.get(`/api/Range?siteCode=${siteCode}&brandCode=NIL`, { signal });
      const rangeOp = toArray(rangeResponse).map((item) => ({
        value: item.rangeCode || item.itmCode || '',
        label: item.rangeName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setRanges(rangeOp);

      // Load departments - using the correct API endpoint from ASP.NET code
      const deptResponse = await apiService1.get(`/api/department?siteCode=${siteCode}`, { signal });
      const deptOptions = toArray(deptResponse).map((item) => ({
        value: item.departmentCode || item.itmCode || '',
        label: item.departmentName || item.itmDesc || '',
      })).filter(item => item.value && item.label);
      setDepartments(deptOptions);

      // Load items - using the correct API endpoint from ASP.NET code
      const itemResponse = await apiService1.get(`/api/StockList?siteCode=${siteCode}`, { signal });
      const itemsOp = toArray(itemResponse).map((item) => ({
        value: item.itemCode || item.stockCode || '',
        label: item.itemName || item.stockName || '',
      })).filter(item => item.value && item.label);
      setItems(itemsOp);
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
      // Site code -> site name, so the report shows itemsiteDesc (same as Replenishment Report)
      const siteLabelByCode = Object.fromEntries(
        filters.site.map((site) => [site.value, site.label])
      );

      // Build the request payload exactly as the ASP.NET code expects
      const requestPayload = {
        toDate: moment(filters.asOnDate).format("DD/MM/YYYY"), // Convert to DD/MM/YYYY format as ASP.NET expects
        Site: Array.isArray(filters.site) && filters.site.length > 0 ? filters.site.map(site => site.value).join(',') : '',
        Dept: filters.departments.map(dept => dept.value).join(','),
        Brand: filters.brands.map(brand => brand.value).join(','),
        // From Item carries every selected item (comma separated), same as Dept/Brand/Range
        fromItem: filters.items.length > 0 ? filters.items.map(item => item.value).join(',') : '',
        // To Item is always left free - only From Item is sent, so there is no upper bound
        toItem: '',
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
          let processedData = response.result.map(item => ({
            ...item,
            siteCode: item.Outlet,
            // Show the outlet name (itemsite_desc) instead of the code (itemsite_code)
            Outlet: siteLabelByCode[item.Outlet] || item.Outlet,
            ItemCode: item.ItemCode || item.itemCode || item.itemcode || "",
            LinkCode: item.linkCode || item.LinkCode || '-',
            // Calculate TotalCost = Qty * Cost
            TotalCost: (Number(item.Qty || 0) * Number(item.Cost || 0)).toFixed(2),
            // Calculate TotalAmount = Qty * Price
            TotalAmount: (Number(item.Qty || 0) * Number(item.Price || 0)).toFixed(2)
          }));

          if (filters.showBatchDetails) {
            try {
              const siteCodes = filters.site.map((site) => site.value).filter(Boolean);
              const batchRows = await loadItemBatches(siteCodes);
              processedData = attachBatchDetails(
                processedData,
                batchRows,
                filters.showZeroQty
              );
            } catch (batchError) {
              console.error("Error loading batch details:", batchError);
              toast.error("Report generated, but batch details could not be loaded");
            }
          }
          
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
      showBatchDetails: false,
    });
    setReportData([]);
    setHasGeneratedReport(false);
  };

  // Column configuration for the report - updated headers as requested
  const columns = [
    { key: 'Outlet', header: 'Site', printHeader: 'Site', align: 'left', width: '7%' },
    { key: 'Dept', header: 'Dept', align: 'left', width: '8%' },
    { key: 'Brand', header: 'Brand', align: 'left', width: '8%' },
    { key: 'Ranges', header: 'Range', align: 'left', width: '7%' },
    { key: 'LinkCode', header: 'LinkCode', printHeader: 'Link', align: 'left', width: '7%' },
    { key: 'ItemCode', header: 'Item Code', printHeader: 'Code', align: 'left', width: '8%', render: (value) => displayItemCode(value) },
    { key: 'ItemName', header: 'Item Name', printHeader: 'Item', align: 'left', width: '16%' },
    { key: 'UOM', header: 'UOM', align: 'left', width: '6%' },
    { key: 'Qty', header: 'Qty', align: 'right', width: '6%', type: 'number', render: (value) => Number(value).toLocaleString() },
    { key: 'Cost', header: 'Cost Price', printHeader: 'Cost', align: 'right', width: '7%', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'TotalCost', header: 'Total Cost', printHeader: 'Total', align: 'right', width: '7%', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'Price', header: 'Selling Price', printHeader: 'Price', align: 'right', width: '6%', type: 'number', render: (value) => Number(value).toFixed(2) },
    { key: 'TotalAmount', header: 'Total Amount', printHeader: 'Amount', align: 'right', width: '7%', type: 'number', render: (value) => Number(value).toFixed(2) }
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
        
        const excelRow = (valuesByKey) =>
          columns.map((col) => (valuesByKey[col.key] !== undefined ? valuesByKey[col.key] : ""));

        // Add data with outlet grouping
        Object.keys(groupedData).forEach(outlet => {
          const outletData = groupedData[outlet];
          
          // Add outlet header row
          itemsData.push(excelRow({ Outlet: outlet }));
          
          // Add outlet items, with batch lines under each item when requested
          outletData.forEach(item => {
            itemsData.push(excelRow({
              Dept: item.Dept || "",
              Brand: item.Brand || "",
              Ranges: item.Ranges || "",
              LinkCode: item.LinkCode || "-",
              ItemCode: displayItemCode(item.ItemCode),
              ItemName: item.ItemName || "",
              UOM: item.UOM || "",
              Qty: Number(item.Qty || 0),
              Cost: Number(item.Cost || 0),
              TotalCost: Number(item.TotalCost || 0),
              Price: item.Price || "-",
              TotalAmount: item.TotalAmount || "-",
            }));

            (item.batches || []).forEach((batch) => {
              itemsData.push(excelRow({
                ItemName: [batch.batchNo, batch.expDateLabel].filter(Boolean).join("  "),
                Qty: batch.qty,
              }));
            });
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
          itemsData.push(excelRow({
            Outlet: `${outlet} Total :`,
            Qty: outletTotals.qty,
            Cost: outletTotals.cost,
            TotalCost: outletTotals.totalCost,
            Price: "-",
            TotalAmount: outletTotals.totalAmount,
          }));
          
          // Add empty row for spacing
          itemsData.push(excelRow({}));
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
        const totalsRow = excelRow({
          Outlet: "Total",
          Qty: grandTotals.qty,
          Cost: grandTotals.cost,
          TotalCost: grandTotals.totalCost,
          Price: "-",
          TotalAmount: grandTotals.totalAmount,
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showBatchDetails"
                checked={filters.showBatchDetails}
                onCheckedChange={(checked) => handleFilterChange("showBatchDetails", checked)}
              />
              <Label htmlFor="showBatchDetails">Show Batch Details</Label>
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
              {filters.showBatchDetails && (
                <p>
                  Batch lines show the current on-hand batch number, expiry, and quantity.
                  {filters.asOnDate !== moment().format("YYYY-MM-DD")
                    ? " They are not recalculated for a past As on Date."
                    : ""}
                </p>
              )}
            </div>
          }
        />
      )}
    </div>
  );
};

export default StockBalanceReports;
