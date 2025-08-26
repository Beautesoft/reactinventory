import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Filter, RefreshCw, TrendingUp } from "lucide-react";
import moment from "moment";
import apiService from "@/services/apiService";
import { toast } from "sonner";


const StockMovement = () => {
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0], // Default to 30 days ago
    toDate: new Date().toISOString().split("T")[0],
    site: "",
    movementType: "all",
    movementCodes: [],
    suppliers: [],
    departments: [],
    brands: [],
    ranges: [],
    fromItem: "",
    toItem: "",
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [sites, setSites] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [items, setItems] = useState([]);

  // Movement type options
  const movementTypeOptions = [
    { value: "all", label: "All" },
    { value: "in", label: "In" },
    { value: "out", label: "Out" },
  ];

  // Movement code options
  const movementCodeOptions = [
    { value: "VGRN", label: "VGRN - Vendor Goods Receive Note" },
    { value: "ADJ", label: "ADJ - Stock Adjustment" },
    { value: "SA", label: "SA - Stock Adjustment" },
    { value: "TFR", label: "TFR - Transfer" },
    { value: "RTN", label: "RTN - Return Note" },
    { value: "SUM", label: "SUM - Stock Usage Memo" },
    { value: "ST", label: "ST - Stock Take" },
  ];

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      // Load sites - using the same pattern as addGrn.jsx
      const sitesResponse = await apiService.get("ItemSitelists");
      setSites(sitesResponse || []);

      // Load suppliers - using the correct API endpoint
      const supplierResponse = await apiService.get("ItemSupplies");
      const supplierOp = supplierResponse
        .filter((item) => item.splyCode)
        .map((item) => ({
          value: item.splyCode,
          label: item.supplydesc,
        }));
      setSuppliers(supplierOp);

      // Load departments - hardcoded as per addGrn.jsx pattern
      const deptOptions = [
        { value: "RETAIL PRODUCT", label: "RETAIL PRODUCT" },
        { value: "SALON PRODUCT", label: "SALON PRODUCT" }
      ];
      setDepartments(deptOptions);

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
    if (!filters.fromDate || !filters.toDate) {
      toast.error("From Date and To Date are mandatory");
      return;
    }

    if (filters.fromDate > filters.toDate) {
      toast.error("From Date cannot be greater than To Date");
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

      // Date range filter - using the date strings directly
      if (filters.fromDate && filters.toDate) {
        filterQuery.where.and.push({
          and: [
            { trnDate: { gte: filters.fromDate } },
            { trnDate: { lte: filters.toDate } }
          ]
        });
      }

      if (filters.site) {
        filterQuery.where.and.push({ siteCode: filters.site });
      }

      if (filters.movementType !== "all") {
        if (filters.movementType === "in") {
          filterQuery.where.and.push({ trnType: { in: ["VGRN", "TFR", "RTN"] } });
        } else if (filters.movementType === "out") {
          filterQuery.where.and.push({ trnType: { in: ["TFR", "SUM", "ADJ"] } });
        }
      }

      if (filters.movementCodes.length > 0) {
        filterQuery.where.and.push({
          or: filters.movementCodes.map(code => ({ trnType: code.value }))
        });
      }

      if (filters.suppliers.length > 0) {
        filterQuery.where.and.push({
          or: filters.suppliers.map(supplier => ({ splyCode: supplier.value }))
        });
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

      if (filters.fromItem && filters.toItem) {
        filterQuery.where.and.push({
          and: [
            { stockCode: { gte: filters.fromItem } },
            { stockCode: { lte: filters.toItem } }
          ]
        });
      } else if (filters.fromItem) {
        filterQuery.where.and.push({ stockCode: { gte: filters.fromItem } });
      } else if (filters.toItem) {
        filterQuery.where.and.push({ stockCode: { lte: filters.toItem } });
      }

      console.log("Stock Movement filter query:", filterQuery);

      // Call API to get stock movement data - using the correct API endpoint
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
      fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
      toDate: new Date().toISOString().split("T")[0],
      site: "",
      movementType: "all",
      movementCodes: [],
      suppliers: [],
      departments: [],
      brands: [],
      ranges: [],
      fromItem: "",
      toItem: "",
    });
    setReportData([]);
  };

  const handleExport = () => {
    // Export functionality
    toast.info("Export functionality will be implemented");
  };

  const getMovementTypeColor = (trnType) => {
    const inTypes = ["VGRN", "TFR", "RTN"];
    const outTypes = ["SUM", "ADJ"];
    
    if (inTypes.includes(trnType)) return "bg-green-100 text-green-800";
    if (outTypes.includes(trnType)) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getMovementTypeLabel = (trnType) => {
    const inTypes = ["VGRN", "TFR", "RTN"];
    const outTypes = ["SUM", "ADJ"];
    
    if (inTypes.includes(trnType)) return "In";
    if (outTypes.includes(trnType)) return "Out";
    return "Other";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movement Report</h1>
                     <p className="text-gray-600 mt-2">Track detailed stock items with comprehensive filtering options</p>
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
            {/* Date Filters */}
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date *</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate">To Date *</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
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
                  <SelectValue placeholder="Select from item" />
                </SelectTrigger>
                <SelectContent>
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
                  <SelectValue placeholder="Select to item" />
                </SelectTrigger>
                <SelectContent>
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
                options={movementCodeOptions}
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
                    <TableHead>Date</TableHead>
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Document No</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((movement, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        {moment(movement.trnDate).format("DD/MM/YYYY")}
                      </TableCell>
                      <TableCell>
                        <Badge className={getMovementTypeColor(movement.trnType)}>
                          {getMovementTypeLabel(movement.trnType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{movement.trnDocno}</TableCell>
                      <TableCell className="font-mono">{movement.stockCode}</TableCell>
                      <TableCell>{movement.stockName}</TableCell>
                      <TableCell>{movement.uomDescription}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(movement.trnQty || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(movement.trnAmt || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{movement.siteName}</TableCell>
                      <TableCell>{movement.Department}</TableCell>
                      <TableCell>{movement.supplydesc}</TableCell>
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

export default StockMovement;
