import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StockBalanceTable from "@/components/stockBalanceTable";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import {
  buildCountObject,
  buildCountQuery,
  buildFilterObject,
  buildFilterQuery,
} from "@/utils/utils";
import Pagination from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, FileText } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function StockBalance() {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  // Local state
  const [stockData, setStockData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    where: {
      sitecode: userDetails?.siteCode,
    },
    like: null,
    skip: 0,
    limit: 10,
    order: "stockCode ASC",
  });
  const [activeTab, setActiveTab] = useState("both");
  const [initialLoading, setInitialLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });
  
  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  // Loading states for search and filter operations
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 1000);

  // Handle search loading state
  useEffect(() => {
    if (searchValue !== debouncedSearchValue) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchValue, debouncedSearchValue]);

  // Handle filter loading state
  useEffect(() => {
    if (activeTab) {
      setIsFiltering(true);
      // Simulate a brief loading state for filter changes
      const timer = setTimeout(() => {
        setIsFiltering(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Separate memo for filtering, sorting and pagination to avoid API calls
  const sortedAndPaginatedData = useMemo(() => {
    let filteredData = [...stockData];

    // Apply department filter
    if (activeTab === "retail") {
      filteredData = filteredData.filter(item => item.Department === "RETAIL PRODUCT");
    } else if (activeTab === "salon") {
      filteredData = filteredData.filter(item => item.Department === "SALON PRODUCT");
    }

    // Apply search filter
    if (debouncedSearchValue) {
      filteredData = filteredData.filter(item =>
        item.stockCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.stockName?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.BrandCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.Brand?.toLowerCase().includes(debouncedSearchValue.toLowerCase())
      );
    }

    // Apply sorting if specified
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Define which fields should be treated as numbers
        const numericFields = ['quantity', 'onHoldQty', 'ReqQty', 'StockQty'];
        
        // Handle numeric fields
        if (numericFields.includes(sortConfig.key)) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else {
          // Handle string fields
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          } else {
            // Convert to strings for comparison
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
          }
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    const startIndex = pagination.skip;
    const endIndex = startIndex + pagination.limit;
    return filteredData.slice(startIndex, endIndex);
  }, [stockData, activeTab, debouncedSearchValue, sortConfig.key, sortConfig.direction, pagination.skip, pagination.limit]);

  // Memo for filtered data length (for pagination)
  const filteredDataLength = useMemo(() => {
    let filteredData = [...stockData];

    // Apply department filter
    if (activeTab === "retail") {
      filteredData = filteredData.filter(item => item.Department === "RETAIL PRODUCT");
    } else if (activeTab === "salon") {
      filteredData = filteredData.filter(item => item.Department === "SALON PRODUCT");
    }

    // Apply search filter
    if (debouncedSearchValue) {
      filteredData = filteredData.filter(item =>
        item.stockCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.stockName?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.BrandCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.Brand?.toLowerCase().includes(debouncedSearchValue.toLowerCase())
      );
    }

    return filteredData.length;
  }, [stockData, activeTab, debouncedSearchValue]);

  const getStockBalance = async () => {
    setIsLoading(true);

    try {
      // Build department filter
      const whereClause = { ...pagination.where };
      if (activeTab === "retail") {
        whereClause.department = "RETAIL PRODUCT";
      } else if (activeTab === "salon") {
        whereClause.department = "SALON PRODUCT";
      }
      // For "both", don't add department filter

      const filterObj = {
        ...pagination,
        where: whereClause,
      };

      const filter = buildFilterObject(filterObj);
      const countFilter = buildCountObject(filterObj);
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const countQuery = `?where=${encodeURIComponent(
        JSON.stringify(countFilter.where)
      )}`;

      // Use the inventory API similar to addGrn.jsx
      const dataQuery = `?Site=${userDetails.siteCode}`;
      
      const [dataResponse] = await Promise.all([
        apiService1.get(`api/GetInvitems${dataQuery}`),
      ]);
      
      let stockItems = dataResponse?.result || dataResponse || [];

      // Store the raw data without any filtering - filtering will be done locally
      setStockData(stockItems);
      setTotalCount(stockItems.length);
    } catch (err) {
      console.error("Error fetching stock balance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getBatchDetails = async (item) => {
    setBatchLoading(true);
    try {
      console.log(`🔄 Fetching batch details for item: ${item.stockCode}`);
      
      // Call ItemBatches API to get all batches for this item in the current store
      const filter = {
        where: {
          and: [
            { itemCode: item.stockCode },
            { siteCode: userDetails?.siteCode },
            // { qty: { gt: 0 } } // Only show batches with available quantity
          ]
        },
        order: "expDate ASC" // Sort by expiry date first, then batch number
      };

      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`ItemBatches${query}`);
      
      console.log(`📦 Found ${response?.length || 0} batch records for ${item.stockCode}`);
      
      if (response && response.length > 0) {
        const batchInfo = response.map(batch => ({
          batchNo: batch.batchNo || "No Batch",
          uom: batch.uom || item.uomDescription || "N/A",
          qty: Number(batch.qty) || 0,
          batchCost: Number(batch.batchCost) || 0,
          expDate: batch.expDate,
          formattedExpDate: batch.expDate ? 
            new Date(batch.expDate).toLocaleDateString() : 
            "N/A",
          siteCode: batch.siteCode
        }));

        // Sort by expiry date (FEFO) - earliest expiry first
        batchInfo.sort((a, b) => {
          if (!a.expDate && !b.expDate) return 0;
          if (!a.expDate) return 1; // No expiry goes to end
          if (!b.expDate) return -1; // No expiry goes to end
          return new Date(a.expDate) - new Date(b.expDate);
        });

        setBatchData(batchInfo);
      } else {
        // No batch records found
        setBatchData([]);
        console.log(`⚠️ No batch records found for item ${item.stockCode} in store ${userDetails?.siteCode}`);
      }
    } catch (error) {
      console.error("Error fetching batch details:", error);
      setBatchData([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchClick = (item) => {
    setSelectedItem(item);
    setShowBatchModal(true);
    getBatchDetails(item);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await getStockBalance();
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    initialize();
  }, []); // Run only once on mount

  // Remove this useEffect - search and tab changes should be handled locally
  // useEffect(() => {
  //   if (!initialLoading) {
  //     getStockBalance();
  //   }
  // }, [
  //   debouncedSearchValue,
  //   activeTab
  // ]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    setPagination((prev) => ({
      ...prev,
      skip: 0, // Reset to first page
    }));
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setPagination((prev) => ({
      ...prev,
      skip: 0, // Reset to first page
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      skip: (newPage - 1) * prev.limit,
    }));
  };

  const handleSort = (key, direction) => {
    // Map frontend sort keys to API field names if needed
    const sortKeyMap = {
      'stockCode': 'stockCode',
      'stockName': 'stockName', 
      'Brand': 'Brand',
      'onHoldQty': 'onHoldQty',
      'poQty': 'ReqQty',  // Maps to API field ReqQty
      'quantity': 'quantity'  // Bal Qty maps to quantity field
    };
    
    const actualKey = sortKeyMap[key] || key;
    
    // Set the sort configuration
    setSortConfig({ key: actualKey, direction });
    
    // Reset to first page when sorting
    setPagination((prev) => ({
      ...prev,
      skip: 0,
    }));
  };

  return (
    <>
      <div className="h-screen w-full mt-6 light">
        <div className="ml-2 mb-7">
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Balance
          </h1>
          {isLoading && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading data...</span>
            </div>
          )}
        </div>

          <Tabs
            value={activeTab}
            className="w-full"
            onValueChange={(value) => {
              handleTabChange(value);
            }}
          >
            <div className="flex items-center justify-between space-x-2 mb-6">
              <div className="flex gap-4 items-center w-[60%]">
                <div className="w-[280px] relative">
                  <Input
                    placeholder="Search by Stock Code, Stock Name, Brand..."
                    value={searchValue}
                    onChange={(e) => handleSearch(e)}
                    className="pl-10"
                  />
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  )}
                </div>
              </div>

              <TabsList className="w-[25%] bg-gray-200 h-[38px] relative">
                <TabsTrigger className="cursor-pointer" value="both">
                  Both
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="retail">
                  Retail
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="salon">
                  Salon
                </TabsTrigger>
                {isFiltering && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                )}
              </TabsList>
            </div>

            <TabsContent value="both">
              <StockBalanceTable 
                data={sortedAndPaginatedData} 
                isLoading={isLoading} 
                onSort={handleSort}
                onBatchClick={handleBatchClick}
                sortConfig={sortConfig}
                pagination={pagination}
              />
            </TabsContent>
            <TabsContent value="retail">
              <StockBalanceTable 
                data={sortedAndPaginatedData} 
                isLoading={isLoading} 
                onSort={handleSort}
                onBatchClick={handleBatchClick}
                sortConfig={sortConfig}
                pagination={pagination}
              />
            </TabsContent>
            <TabsContent value="salon">
              <StockBalanceTable 
                data={sortedAndPaginatedData} 
                isLoading={isLoading} 
                onSort={handleSort}
                onBatchClick={handleBatchClick}
                sortConfig={sortConfig}
                pagination={pagination}
              />
            </TabsContent>
          </Tabs>

        <Pagination
          currentPage={Math.ceil(pagination.skip / pagination.limit) + 1}
          totalPages={Math.ceil(filteredDataLength / pagination.limit)}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Batch Details Modal */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="!max-w-[900px] !w-[95vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Batch Details</span>
              <Badge variant="outline" className="text-sm">
                {selectedItem?.stockCode}
              </Badge>
            </DialogTitle>
            <div className="text-sm text-gray-600 mt-1">
              {selectedItem?.stockName} - Store: {userDetails?.siteCode}
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            {batchLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading batch details...</span>
              </div>
            ) : batchData.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-12 h-12 text-gray-300" />
                  <p className="text-lg font-medium">No batch records found</p>
                  <p className="text-sm">This item has no batch records in the current store.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Batch Summary</h3>
                      <p className="text-sm text-blue-700">
                        Total Batches: {batchData.length} | 
                        Total Quantity: {batchData.reduce((sum, batch) => sum + batch.qty, 0)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      FEFO Sorted
                    </Badge>
                  </div>
                </div>

                {/* Batch Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">#</TableHead>
                        <TableHead className="font-semibold">Batch No</TableHead>
                        <TableHead className="font-semibold">UOM</TableHead>
                        <TableHead className="font-semibold text-right">Quantity</TableHead>
                        <TableHead className="font-semibold text-right">Batch Cost</TableHead>
                        <TableHead className="font-semibold">Expiry Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchData.map((batch, index) => {
                        const isExpired = batch.expDate && new Date(batch.expDate) < new Date();
                        const isExpiringSoon = batch.expDate && 
                          new Date(batch.expDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                          !isExpired;
                        
                        return (
                          <TableRow key={index} className={isExpired ? "bg-red-50" : isExpiringSoon ? "bg-yellow-50" : ""}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {batch.batchNo === "No Batch" ? (
                                <Badge variant="outline" className="text-gray-600">No Batch</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100">{batch.batchNo}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{batch.uom}</TableCell>
                            <TableCell className="text-right font-medium">{batch.qty.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{batch.batchCost.toFixed(2)}</TableCell>
                            <TableCell>
                              {batch.formattedExpDate}
                              {isExpired && (
                                <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                              )}
                              {isExpiringSoon && !isExpired && (
                                <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-700">Expiring Soon</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {batch.qty > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>
                              ) : (
                                <Badge variant="destructive">Out of Stock</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StockBalance;