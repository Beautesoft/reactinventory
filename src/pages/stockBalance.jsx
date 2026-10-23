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
import { toast } from "sonner";
import { getConfigValue } from "@/utils/utils";

function toDateInputValue(expDate) {
  if (expDate == null || expDate === "") return "";
  const raw = String(expDate).trim();
  if (!raw || raw.startsWith("1900-01-01")) return "";
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1] === "1900-01-01" ? "" : match[1];
  const parsed = new Date(expDate);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() <= 1900) return "";
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

function localDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function batchLabel(batchNo) {
  return batchNo ? batchNo : "No Batch";
}

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
  const [savingBatchId, setSavingBatchId] = useState(null);
  const [renameConfirm, setRenameConfirm] = useState(null);

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
        item.Brand?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.linkCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.LinkCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase())
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
        item.Brand?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.linkCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
        item.LinkCode?.toLowerCase().includes(debouncedSearchValue.toLowerCase())
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
      
      let stockItems = Array.isArray(dataResponse?.result) ? dataResponse.result : [];

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
        const batchInfo = response.map((batch) => {
          const originalBatchNo = (batch.batchNo || "").trim();
          const expDateInput = toDateInputValue(batch.expDate);
          return {
            id: batch.id,
            itemCode: batch.itemCode,
            siteCode: batch.siteCode,
            batchNo: originalBatchNo,
            originalBatchNo,
            uom: batch.uom || item.uomDescription || "N/A",
            qty: Number(batch.qty) || 0,
            rawQty: batch.qty,
            batchCost: Number(batch.batchCost) || 0,
            rawBatchCost: batch.batchCost,
            expDateInput,
            originalExpDate: expDateInput,
          };
        });

        // Sort by expiry date (FEFO) - earliest expiry first
        batchInfo.sort((a, b) => {
          if (!a.expDateInput && !b.expDateInput) return 0;
          if (!a.expDateInput) return 1;
          if (!b.expDateInput) return -1;
          return a.expDateInput.localeCompare(b.expDateInput);
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
    setRenameConfirm(null);
    setSelectedItem(item);
    setShowBatchModal(true);
    getBatchDetails(item);
  };

  const updateBatchField = (id, field, value) => {
    setBatchData((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const applyBatchUpdate = async (batch, nextBatchNo, nextExpDate) => {
    setSavingBatchId(batch.id);
    try {
      await apiService.patch(`ItemBatches/${batch.id}`, {
        itemCode: batch.itemCode,
        siteCode: batch.siteCode,
        uom: batch.uom,
        qty: batch.rawQty,
        batchCost: batch.rawBatchCost,
        batchNo: nextBatchNo,
        expDate: nextExpDate,
      });
      const renamed = nextBatchNo !== batch.originalBatchNo;
      const expiryChanged = (nextExpDate || "") !== batch.originalExpDate;
      toast.success(
        renamed && expiryChanged
          ? "Batch number and expiry updated"
          : renamed
            ? "Batch number updated"
            : "Expiry date updated"
      );
      if (selectedItem) await getBatchDetails(selectedItem);
    } catch (error) {
      console.error("Error updating batch details:", error);
      toast.error("Failed to update the batch number and expiry.");
    } finally {
      setSavingBatchId(null);
      setRenameConfirm(null);
    }
  };

  const handleBatchUpdate = async (batch) => {
    const nextBatchNo = batch.batchNo.trim();
    const nextExpDate = batch.expDateInput || "";
    const originalBatchNo = batch.originalBatchNo.trim();
    const renamed = nextBatchNo !== originalBatchNo;
    const expiryChanged = nextExpDate !== batch.originalExpDate;

    if (!batch.id) {
      toast.error("This batch row cannot be updated.");
      return;
    }
    if (!renamed && !expiryChanged) return;
    if (!nextBatchNo && originalBatchNo) {
      toast.error("Enter a batch number.");
      return;
    }
    if (getConfigValue("EXPIRY_DATE") === "Yes" && !nextExpDate) {
      toast.error("Enter an expiry date.");
      return;
    }

    const duplicateInView = batchData.some((row) => {
      if (row.id === batch.id) return false;
      const other = row.batchNo.trim().toLowerCase();
      return nextBatchNo !== "" && other === nextBatchNo.toLowerCase();
    });
    if (duplicateInView) {
      toast.error(`Batch ${nextBatchNo} is already listed for this item.`);
      return;
    }

    if (nextBatchNo) {
      const filter = {
        where: {
          and: [
            { itemCode: batch.itemCode },
            { siteCode: batch.siteCode },
            { uom: batch.uom },
            { batchNo: nextBatchNo },
          ],
        },
      };
      try {
        const existing = await apiService.get(
          `ItemBatches?filter=${encodeURIComponent(JSON.stringify(filter))}`
        );
        const clash = (Array.isArray(existing) ? existing : []).some(
          (row) => row.id !== batch.id
        );
        if (clash) {
          toast.error(`Batch ${nextBatchNo} already exists for this item and UOM.`);
          return;
        }
      } catch (error) {
        console.error("Error checking existing batches:", error);
        toast.error("Could not check existing batches. Nothing was saved.");
        return;
      }
    }

    setRenameConfirm({
      id: batch.id,
      renamed,
      fromLabel: batchLabel(originalBatchNo),
      toLabel: batchLabel(nextBatchNo),
      batchNo: nextBatchNo,
      expDate: nextExpDate || null,
      toExpiry: nextExpDate,
    });
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
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          <span className="text-gray-600 ml-4 text-sm">Loading...</span>
        </div>
      ) : (
      <div className="h-screen w-full mt-6 light">
        <div className="ml-2 mb-7">
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Balance
          </h1>
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
      )}

      {/* Batch Details Modal */}
      <Dialog
        open={showBatchModal}
        onOpenChange={(open) => {
          setShowBatchModal(open);
          if (!open) setRenameConfirm(null);
        }}
      >
        <DialogContent
          className="!max-w-[1040px] !w-[95vw] max-h-[80vh] overflow-y-auto"
          onEscapeKeyDown={(event) => {
            if (renameConfirm) {
              event.preventDefault();
              if (savingBatchId == null) setRenameConfirm(null);
            }
          }}
        >
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
                        <TableHead className="font-semibold"> </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchData.map((batch, index) => {
                        const today = localDateString(new Date());
                        const soon = new Date();
                        soon.setDate(soon.getDate() + 30);
                        const soonDate = localDateString(soon);
                        const isExpired = batch.expDateInput && batch.expDateInput < today;
                        const isExpiringSoon =
                          batch.expDateInput &&
                          batch.expDateInput >= today &&
                          batch.expDateInput <= soonDate;
                        const dirty =
                          batch.batchNo.trim() !== batch.originalBatchNo ||
                          batch.expDateInput !== batch.originalExpDate;
                        const saving = savingBatchId === batch.id;

                        return (
                          <TableRow key={batch.id ?? index} className={isExpired ? "bg-red-50" : isExpiringSoon ? "bg-yellow-50" : ""}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              <Input
                                value={batch.batchNo}
                                aria-label={`Batch number ${index + 1}`}
                                placeholder="Batch number"
                                disabled={saving}
                                onChange={(e) =>
                                  updateBatchField(batch.id, "batchNo", e.target.value)
                                }
                                className="h-8 w-[140px]"
                              />
                            </TableCell>
                            <TableCell>{batch.uom}</TableCell>
                            <TableCell className="text-right font-medium">{batch.qty.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{batch.batchCost.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={batch.expDateInput}
                                  aria-label={`Expiry date ${index + 1}`}
                                  disabled={saving}
                                  onChange={(e) =>
                                    updateBatchField(batch.id, "expDateInput", e.target.value)
                                  }
                                  className="h-8 w-[150px]"
                                />
                                {isExpired && (
                                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                                )}
                                {isExpiringSoon && (
                                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Expiring Soon</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {batch.qty > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>
                              ) : (
                                <Badge variant="destructive">Out of Stock</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!dirty || saving || savingBatchId != null}
                                onClick={() => handleBatchUpdate(batch)}
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Update"
                                )}
                              </Button>
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
          {renameConfirm && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
              <div
                role="alertdialog"
                aria-labelledby="batch-update-title"
                className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg"
              >
                <h2 id="batch-update-title" className="text-lg font-semibold">
                  {renameConfirm.renamed
                    ? `Change batch ${renameConfirm.fromLabel} to ${renameConfirm.toLabel}?`
                    : `Update expiry for batch ${renameConfirm.fromLabel}?`}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {renameConfirm.renamed ? (
                    <>
                      Stock still on hand will use {renameConfirm.toLabel} from now on.
                      Documents already posted stay as {renameConfirm.fromLabel}. A
                      transfer or stock take that was saved but not posted may still say{" "}
                      {renameConfirm.fromLabel} and will no longer match this stock.
                    </>
                  ) : (
                    <>
                      Stock still on hand will use{" "}
                      {renameConfirm.toExpiry || "no expiry"} from now on. Documents
                      already posted keep the previous expiry.
                    </>
                  )}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingBatchId != null}
                    onClick={() => setRenameConfirm(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={savingBatchId != null}
                    onClick={() => {
                      const pending = renameConfirm;
                      const batch = batchData.find((row) => row.id === pending?.id);
                      if (batch && pending) {
                        applyBatchUpdate(batch, pending.batchNo, pending.expDate);
                      }
                    }}
                  >
                    {savingBatchId != null ? "Updating..." : "Update batch"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StockBalance;