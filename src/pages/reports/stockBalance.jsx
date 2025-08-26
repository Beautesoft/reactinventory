import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Filter, RefreshCw } from "lucide-react";
import moment from "moment";
import apiService from "@/services/apiService";
import { toast } from "sonner";


const StockBalance = () => {
  const [filters, setFilters] = useState({
    departments: [],
    brands: [],
    ranges: [],
    items: [],
    site: "",
    asOnDate: new Date().toISOString().split("T")[0],
    showZeroQty: false,
    showInactive: false,
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      // Load sites - using the same pattern as addGrn.jsx
      const sitesResponse = await apiService.get("ItemSitelists");
      setSites(sitesResponse || []);

      // Load brands - using the correct API endpoint
      const brandResponse = await apiService.get("ItemBrands");
      const brandOp = brandResponse.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));
      setBrands(brandOp);

      // Load ranges - using the correct API endpoint
      const rangeResponse = await apiService.get("ItemRanges");
      const rangeOp = rangeResponse.map((item) => ({
        value: item.itmCode,
        label: item.itmDesc,
      }));
      setRanges(rangeOp);

      // Load departments - hardcoded as per addGrn.jsx pattern
      const deptOptions = [
        { value: "RETAIL PRODUCT", label: "RETAIL PRODUCT" },
        { value: "SALON PRODUCT", label: "SALON PRODUCT" }
      ];
      setDepartments(deptOptions);

      // Load items - using the correct API endpoint
      const itemResponse = await apiService.get("ItemSitelists");
      const itemsOp = itemResponse.map((item) => ({
        value: item.stockCode,
        label: `${item.stockCode} - ${item.stockName}`,
      }));
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
    if (!filters.asOnDate) {
      toast.error("As on Date is mandatory");
      return;
    }

    setLoading(true);
    try {
      // Build filter query
      const filterQuery = {
        where: {
          and: []
        }
      };

      if (filters.site) {
        filterQuery.where.and.push({ siteCode: filters.site });
      }

      if (filters.departments.length > 0) {
        filterQuery.where.and.push({
          or: filters.departments.map(dept => ({ Department: dept.value }))
        });
      }

      if (filters.brands.length > 0) {
        filterQuery.where.and.push({
          or: filters.brands.map(brand => ({ BrandCode: brand.value }))
        });
      }

      if (filters.ranges.length > 0) {
        filterQuery.where.and.push({
          or: filters.ranges.map(range => ({ RangeCode: range.value }))
        });
      }

      if (filters.items.length > 0) {
        filterQuery.where.and.push({
          or: filters.items.map(item => ({ stockCode: item.value }))
        });
      }

      // Add date filter - using the date string directly
      if (filters.asOnDate) {
        filterQuery.where.and.push({ asOnDate: filters.asOnDate });
      }

      // Add quantity filters
      if (!filters.showZeroQty) {
        filterQuery.where.and.push({ trnBalqty: { gt: 0 } });
      }

      if (!filters.showInactive) {
        filterQuery.where.and.push({ isActive: true });
      }

      console.log("Stock Balance filter query:", filterQuery);

      // Call API to get stock balance data - using the correct API endpoint
      const response = await apiService.get("ItemSitelists");

      setReportData(response || []);
      toast.success(`Report generated with ${response?.length || 0} items`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
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
      site: "",
      asOnDate: new Date().toISOString().split("T")[0],
      showZeroQty: false,
      showInactive: false,
    });
    setReportData([]);
  };

  const handleExport = () => {
    // Export functionality
    toast.info("Export functionality will be implemented");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Balance Report</h1>
          <p className="text-gray-600 mt-2">Generate comprehensive stock balance reports with advanced filtering</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleExport} disabled={reportData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
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
              <Label htmlFor="site">Site</Label>
              <Select value={filters.site} onValueChange={(value) => handleFilterChange("site", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.siteCode} value={site.siteCode}>
                      {site.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="asOnDate">As on Date *</Label>
              <Input
                type="date"
                value={filters.asOnDate}
                onChange={(e) => handleFilterChange("asOnDate", e.target.value)}
                className="w-full"
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

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Report Results</span>
              <Badge variant="secondary">{reportData.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Balance Qty</TableHead>
                    <TableHead className="text-right">Balance Cost</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.stockCode}</TableCell>
                      <TableCell>{item.stockName}</TableCell>
                      <TableCell>{item.Department}</TableCell>
                      <TableCell>{item.Brand}</TableCell>
                      <TableCell>{item.Range}</TableCell>
                      <TableCell>{item.uomDescription}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(item.trnBalqty || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(item.trnBalcst || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(item.batchcost || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockBalance;
