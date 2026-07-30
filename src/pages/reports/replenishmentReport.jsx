import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Filter, RefreshCw } from "lucide-react";
import moment from "moment";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import itemMasterApi from "@/services/itemMasterApi";
import { toast } from "sonner";
import { buildFilterQuery } from "@/utils/utils";
import ReportResults from "@/components/ReportResults";
import * as XLSX from "xlsx";

const toArray = (response) => {
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

/**
 * Phase 1 Replenishment Report
 * - Threshold: Stocks.reorderActive + Stocks.reorderMinqty
 * - On-hand: ItemStocklists.onhandQty per site
 * - Row shown when reorderActive && reorderMinqty > 0 && siteOnHand <= reorderMinqty
 */
const ReplenishmentReport = () => {
  const [filters, setFilters] = useState({
    departments: [],
    brands: [],
    ranges: [],
    site: [],
    showInactive: false,
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [titles, setTitles] = useState(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        await Promise.all([
          loadMasterData(abortController.signal),
          getTitles(abortController.signal),
        ]);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error loading replenishment report lookups:", error);
        }
      }
    };

    loadData();
    return () => abortController.abort();
  }, []);

  const getTitles = async (signal) => {
    try {
      const filter = {
        where: {
          productLicense:
            JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL",
        },
      };
      const query = buildFilterQuery(filter);
      const response = await apiService.get(`/Titles${query}`, { signal });
      setTitles(response?.[0] || null);
    } catch (err) {
      if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
        console.error("Error fetching titles:", err);
      }
    }
  };

  const loadMasterData = async (signal) => {
    try {
      const siteCode =
        JSON.parse(localStorage.getItem("userDetails"))?.siteCode || "NIL";

      const sitesResponse = await apiService.get("ItemSitelists", { signal });
      setSites(Array.isArray(sitesResponse) ? sitesResponse : []);

      const [brandResponse, rangeResponse, deptResponse] = await Promise.all([
        apiService1.get(`/api/Brand?siteCode=${siteCode}`, { signal }),
        apiService1.get(`/api/Range?siteCode=${siteCode}&brandCode=NIL`, { signal }),
        apiService1.get(`/api/department?siteCode=${siteCode}`, { signal }),
      ]);

      setBrands(
        toArray(brandResponse)
          .map((item) => ({
            value: item.brandCode || item.itmCode || "",
            label: item.brandName || item.itmDesc || "",
          }))
          .filter((item) => item.value && item.label)
      );

      setRanges(
        toArray(rangeResponse)
          .map((item) => ({
            value: item.rangeCode || item.itmCode || "",
            label: item.rangeName || item.itmDesc || "",
          }))
          .filter((item) => item.value && item.label)
      );

      setDepartments(
        toArray(deptResponse)
          .map((item) => ({
            value: item.departmentCode || item.itmCode || "",
            label: item.departmentName || item.itmDesc || "",
          }))
          .filter((item) => item.value && item.label)
      );
    } catch (err) {
      if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
        console.error("Error loading master data:", err);
        toast.error("Failed to load report filters");
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const matchesOptionalFilters = (stock) => {
    const deptValues = filters.departments.map((d) => String(d.value));
    const brandValues = filters.brands.map((b) => String(b.value));
    const rangeValues = filters.ranges.map((r) => String(r.value));

    if (deptValues.length > 0 && !deptValues.includes(String(stock.itemDept ?? ""))) {
      return false;
    }
    if (brandValues.length > 0 && !brandValues.includes(String(stock.itemBrand ?? ""))) {
      return false;
    }
    if (rangeValues.length > 0 && !rangeValues.includes(String(stock.itemRange ?? ""))) {
      return false;
    }
    if (!filters.showInactive && stock.itemIsactive === false) {
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!Array.isArray(filters.site) || filters.site.length === 0) {
      toast.error("Please select at least one site to generate the report");
      return;
    }

    setLoading(true);
    try {
      const selectedSiteCodes = filters.site.map((s) => s.value);
      const siteLabelByCode = Object.fromEntries(
        filters.site.map((s) => [s.value, s.label])
      );

      const [reorderStocks, siteStocklists] = await Promise.all([
        itemMasterApi.getReorderActiveStocks(),
        itemMasterApi.getItemStocklistsBySites(selectedSiteCodes),
      ]);

      const stockByCode = new Map();
      for (const stock of reorderStocks || []) {
        if (!stock?.itemCode) continue;
        if (!matchesOptionalFilters(stock)) continue;
        const minQty = Number(stock.reorderMinqty);
        if (!Number.isFinite(minQty) || minQty <= 0) continue;
        stockByCode.set(String(stock.itemCode), stock);
      }

      const rows = [];
      for (const sl of siteStocklists || []) {
        const siteCode = sl.itemsiteCode;
        if (!selectedSiteCodes.includes(siteCode)) continue;
        if (sl.itemstocklistStatus === false) continue;

        const stock = stockByCode.get(String(sl.itemCode || ""));
        if (!stock) continue;

        const onHand = Number(sl.onhandQty) || 0;
        const reorderMin = Number(stock.reorderMinqty) || 0;
        if (onHand > reorderMin) continue;

        const shortfall = Math.max(0, reorderMin - onHand);
        rows.push({
          Outlet: siteLabelByCode[siteCode] || siteCode,
          SiteCode: siteCode,
          ItemCode: stock.itemCode,
          ItemName: stock.itemName || stock.itemDesc || "",
          Dept: stock.itemDept || "",
          Brand: stock.itemBrand || "",
          Ranges: stock.itemRange || "",
          UOM: stock.itemUom || "",
          OnHand: onHand,
          ReorderMin: reorderMin,
          Shortfall: shortfall,
          SuggestedQty: shortfall,
          Supplier: stock.itemSupp || "",
          Active: stock.itemIsactive !== false ? "Yes" : "No",
          Status: onHand <= 0 ? "Critical" : "Low",
        });
      }

      rows.sort((a, b) => {
        const siteCmp = String(a.Outlet).localeCompare(String(b.Outlet));
        if (siteCmp !== 0) return siteCmp;
        return String(a.ItemCode).localeCompare(String(b.ItemCode));
      });

      setReportData(rows);
      setHasGeneratedReport(true);
      if (rows.length === 0) {
        toast.info("No items below reorder level for the selected sites");
      } else {
        toast.success(`Report generated with ${rows.length} item(s)`);
      }
    } catch (error) {
      console.error("Error generating replenishment report:", error);
      toast.error("Failed to generate replenishment report");
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
      site: [],
      showInactive: false,
    });
    setReportData([]);
    setHasGeneratedReport(false);
  };

  const columns = [
    { key: "Outlet", header: "Site", align: "left" },
    { key: "ItemCode", header: "Item Code", align: "left" },
    { key: "ItemName", header: "Item Name", align: "left" },
    { key: "Dept", header: "Dept", align: "left" },
    { key: "Brand", header: "Brand", align: "left" },
    { key: "Ranges", header: "Range", align: "left" },
    { key: "UOM", header: "UOM", align: "left" },
    {
      key: "OnHand",
      header: "On Hand",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString(),
    },
    {
      key: "ReorderMin",
      header: "Reorder Min",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString(),
    },
    {
      key: "SuggestedQty",
      header: "Suggested Qty",
      align: "right",
      type: "number",
      render: (value) => Number(value).toLocaleString(),
    },
    { key: "Supplier", header: "Supplier", align: "left" },
    { key: "Status", header: "Status", align: "left" },
  ];

  const companyInfo = {
    companyName:
      titles?.companyHeader1 || "VITAZEN BEAUTY SDN. BHD. 201001020225 (903987-A)",
    address: titles?.companyHeader2 || "No.38A-1 Jalan PJU 5/11",
    city:
      titles?.companyHeader3 ||
      "Dataran Sunway Kota Damansara, 47810 Petaling Jaya",
    phone: titles?.companyHeader4 || "Tel: 018-360 7691, 03-6143 6491",
  };

  const handleCustomExport = async (format, data, exportColumns, company, reportTitle) => {
    const fileName = `${reportTitle.replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .split("T")[0]}`;

    if (format !== "excel") {
      throw new Error(`Export format ${format} not implemented`);
    }

    const workbook = XLSX.utils.book_new();
    const headerData = [
      [company.companyName],
      [company.address],
      [company.city],
      [company.phone],
      [""],
      ["Report Title:", reportTitle],
      ["Execution Time:", moment().format("DD/MM/YYYY HH:mm:ss")],
      [
        "Sites:",
        Array.isArray(filters.site) && filters.site.length > 0
          ? filters.site.map((s) => s.label).join(", ")
          : "ALL",
      ],
      [""],
    ];

    const tableHeaders = [exportColumns.map((col) => col.header)];
    const itemsData = [];
    const groupedData = {};

    data.forEach((item) => {
      const outlet = item.Outlet || "Unknown";
      if (!groupedData[outlet]) groupedData[outlet] = [];
      groupedData[outlet].push(item);
    });

    Object.keys(groupedData).forEach((outlet) => {
      const outletData = groupedData[outlet];
      itemsData.push([outlet, "", "", "", "", "", "", "", "", "", "", ""]);

      outletData.forEach((item) => {
        itemsData.push([
          "",
          item.ItemCode || "",
          item.ItemName || "",
          item.Dept || "",
          item.Brand || "",
          item.Ranges || "",
          item.UOM || "",
          Number(item.OnHand || 0),
          Number(item.ReorderMin || 0),
          Number(item.SuggestedQty || 0),
          item.Supplier || "",
          item.Status || "",
        ]);
      });

      const outletSuggested = outletData.reduce(
        (sum, item) => sum + Number(item.SuggestedQty || 0),
        0
      );
      itemsData.push([
        `${outlet} Total :`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        outletSuggested,
        "",
        "",
      ]);
      itemsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
    });

    const grandSuggested = data.reduce(
      (sum, item) => sum + Number(item.SuggestedQty || 0),
      0
    );

    const excelData = [
      ...headerData,
      ...tableHeaders,
      ...itemsData,
      [""],
      ["Total", "", "", "", "", "", "", "", "", grandSuggested, "", ""],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Replenishment");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Replenishment Report</h1>
          <p className="text-gray-600 mt-2">
            Items with Re-Order Level enabled where site on-hand is at or below reorder minimum
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Separator />

      <Card className="print-content">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="site">Site *</Label>
              <MultiSelect
                options={sites.map((site) => ({
                  value: site.itemsiteCode,
                  label: site.itemsiteDesc,
                }))}
                selected={filters.site}
                onChange={(value) => handleFilterChange("site", value)}
                placeholder="Select sites..."
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

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showInactive"
                checked={filters.showInactive}
                onCheckedChange={(checked) =>
                  handleFilterChange("showInactive", !!checked)
                }
              />
              <Label htmlFor="showInactive">Show Inactive Items</Label>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleSubmit} disabled={loading} className="px-8 py-2">
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

      {hasGeneratedReport && (
        <ReportResults
          title="Replenishment Report Results"
          data={reportData}
          columns={columns}
          companyInfo={companyInfo}
          reportTitle="Replenishment Report"
          executionTime={moment().format("DD/MM/YYYY HH:mm:ss")}
          outlet={
            Array.isArray(filters.site) && filters.site.length > 0
              ? filters.site.map((s) => s.label).join(", ")
              : "ALL"
          }
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
              <p>
                Rule: reorderActive = true, reorderMinqty &gt; 0, site on-hand &le;
                reorder min
              </p>
              <p>
                Selected Sites:{" "}
                {Array.isArray(filters.site) && filters.site.length > 0
                  ? filters.site.map((s) => s.label).join(", ")
                  : "ALL"}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default ReplenishmentReport;
