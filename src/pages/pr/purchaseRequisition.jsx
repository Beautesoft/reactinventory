import React, { useEffect, useState } from "react";
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
import GoodsReceiveTable from "@/components/goodsReceiveTable";
import apiService from "@/services/apiService";
import {
  buildCountObject,
  buildCountQuery,
  buildFilterObject,
  buildFilterQuery,
} from "@/utils/utils";
import Pagination from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGrn } from "@/context/grnContext";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

function PurchaseRequisition() {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const { goodsData, isLoading, setLoading, setGoodsData, setError } = useGrn();
  
  // Check if user is HQ
  const isHQUser = userDetails?.siteCode?.includes('HQ');

  // Local pagination state
  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    where: {
      reqStatus: null,
      itemsiteCode: userDetails?.siteCode,
      suppCode: null,
    },
    like: null,
    skip: 0,
    limit: 10,
    order: "reqNo DESC",
  });
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [mainTab, setMainTab] = useState("pr"); // "pr" or "approval"
  const [approvalTab, setApprovalTab] = useState("posted"); // "posted", "approved", "rejected" for approval section

  const debouncedSearchValue = useDebounce(searchValue, 1000);

  const getPRTable = async () => {
    setLoading(true);

    try {
      const whereClause = { ...pagination.where };
      
      if (isHQUser && mainTab === 'approval') {
        // Approval tab: show PRs based on approvalTab status from all sites
        delete whereClause.itemsiteCode;
        if (approvalTab === 'posted') {
          whereClause.reqStatus = 'Posted';
        } else if (approvalTab === 'approved') {
          whereClause.reqStatus = 'Approved';
        } else if (approvalTab === 'rejected') {
          whereClause.reqStatus = 'Rejected';
        }
      } else if (isHQUser && mainTab === 'pr') {
        // PR tab: show only HQ's own PRs
        whereClause.itemsiteCode = userDetails?.siteCode;
      }
      // For non-HQ users, keep existing behavior (already filtered by site)
      
      const updatedPagination = { ...pagination, where: whereClause };
      const filter = buildFilterObject(updatedPagination);
      const countFilter = buildCountObject(updatedPagination);
      
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const countQuery = `?where=${encodeURIComponent(JSON.stringify(countFilter.where))}`;

      const [dataResponse, countResponse] = await Promise.all([
        apiService.get(`reqs${query}`),
        apiService.get(`reqs/count${countQuery}`),
      ]);

      setGoodsData(dataResponse);
      setTotalCount(countResponse.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierList = async () => {
    try {
      const res = await apiService.get("ItemSupplies");
      const options = res
        .filter((item) => item.splyCode)
        .map((item) => ({
          label: item.supplydesc,
          value: item.splyCode,
        }));
      setSupplierOptions(options);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
    }
  };  

  useEffect(() => {
    const initialize = async () => {
      try {
        await getSupplierList();
        await getPRTable();
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    initialize();
  }, []); // Run only once on mount

  useEffect(() => {
    if (!initialLoading) {
      getPRTable();
    }
  }, [
    pagination.skip,
    pagination.where.reqStatus,
    pagination.where.suppCode,
    pagination.where.itemsiteCode,
    debouncedSearchValue,
    pagination.order,
    activeTab,
    mainTab,
    approvalTab
  ]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value) {
      setPagination((prev) => ({
        ...prev,
        like: {
          reqNo: value,
          reqDate: value,
          reqRef: value,
          suppCode: value,
          reqTtamt: value,
          reqStatus: value,
        },
        skip: 0,
      }));
    } else {
      setPagination((prev) => ({
        ...prev,
        like: null,
        skip: 0,
      }));
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    
    const status = value === "open" ? "Open" : value === "posted" ? "Posted" : value === "approved" ? "Approved" : value === "rejected" ? "Rejected" : null;
    setPagination((prev) => ({
      ...prev,
      where: {
        ...prev.where,
        reqStatus: status,
        itemsiteCode: isHQUser ? userDetails?.siteCode : userDetails?.siteCode,
      },
      skip: 0,
    }));
  };

  const handleMainTabChange = (value) => {
    setMainTab(value);
    
    if (value === 'approval') {
      // Reset to show Posted PRs when switching to Approval tab
      setApprovalTab('posted');
      setPagination((prev) => ({
        ...prev,
        where: {
          ...prev.where,
          reqStatus: 'Posted',
          itemsiteCode: null,
        },
        skip: 0,
      }));
    } else {
      // Reset to "all" status when switching back to PR tab
      setActiveTab('all');
      setPagination((prev) => ({
        ...prev,
        where: {
          ...prev.where,
          reqStatus: null,
          itemsiteCode: userDetails?.siteCode,
        },
        skip: 0,
      }));
    }
  };

  const handleApprovalTabChange = (value) => {
    setApprovalTab(value);
    
    const status = value === "posted" ? "Posted" : value === "approved" ? "Approved" : value === "rejected" ? "Rejected" : "Posted";
    setPagination((prev) => ({
      ...prev,
      where: {
        ...prev.where,
        reqStatus: status,
        itemsiteCode: null,
      },
      skip: 0,
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      skip: (newPage - 1) * prev.limit,
    }));
  };

  const handleRoute = () => {
    console.log("Create New clicked");
    navigate("/purchase-requisition/add/"); // Navigate to the add page
  };

  const handleSort = (key, direction) => {
    setPagination((prev) => ({
      ...prev,
      order: `${key} ${direction === 'ascending' ? 'ASC' : 'DESC'}, reqNo DESC`,
      skip: 0, // Reset to first page when sorting
    }));
  };

  // Get tab label based on user role
  const getTabLabel = (tab) => {
    if (tab === 'posted' && userDetails?.siteCode === 'HQ') {
      return 'Pending Approvals';
    }
    return tab.charAt(0).toUpperCase() + tab.slice(1);
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
              Purchase Requisition
            </h1>
          </div>

          {isHQUser ? (
            // HQ User: Two main tabs structure
            <Tabs value={mainTab} onValueChange={handleMainTabChange} className="w-full">
              <TabsList className="w-[30%] bg-gray-200 h-[38px] mb-4">
                <TabsTrigger className="cursor-pointer" value="pr">
                  Purchase Requisition
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="approval">
                  Approval
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pr">
                {/* Nested tabs for PR status */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <div className="flex items-center justify-between space-x-2 mb-6">
                    <div className="flex gap-4 items-center w-[60%]">
                      <div className="w-[280px] relative">
                        <Input
                          placeholder="Search by PR no, Ref no, Total amount"
                          value={searchValue}
                          onChange={(e) => handleSearch(e)}
                          className="pl-10"
                        />
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                      </div>

                      <Select
                        onValueChange={(value) => {
                          setPagination((prev) => ({
                            ...prev,
                            where: {
                              ...prev.where,
                              suppCode: value === "all" ? null : value,
                            },
                            skip: 0,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Suppliers</SelectItem>
                          {supplierOptions.map((supplier) => (
                            <SelectItem key={supplier.value} value={supplier.value}>
                              {supplier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <TabsList className="w-[25%] bg-gray-200 h-[38px]">
                      <TabsTrigger className="cursor-pointer" value="all">All</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="open">Open</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="posted">Posted</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="approved">Approved</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="rejected">Rejected</TabsTrigger>
                    </TabsList>

                    <Button
                      onClick={handleRoute}
                      className="bg-blue-950 text-white hover:bg-blue-700 cursor-pointer"
                    >
                      + Create New
                    </Button>
                  </div>

                  <TabsContent value="all">
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                    />
                  </TabsContent>
                  <TabsContent value="open">
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                    />
                  </TabsContent>
                  <TabsContent value="posted">
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                    />
                  </TabsContent>
                  <TabsContent value="approved">
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                    />
                  </TabsContent>
                  <TabsContent value="rejected">
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="approval">
                {/* Approval tab content with nested tabs */}
                <Tabs value={approvalTab} onValueChange={handleApprovalTabChange} className="w-full">
                  <div className="flex items-center justify-between space-x-2 mb-6">
                    <div className="flex gap-4 items-center w-[60%]">
                      <div className="w-[280px] relative">
                        <Input
                          placeholder="Search by PR no, Ref no, Total amount"
                          value={searchValue}
                          onChange={(e) => handleSearch(e)}
                          className="pl-10"
                        />
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                      </div>

                      <Select
                        onValueChange={(value) => {
                          setPagination((prev) => ({
                            ...prev,
                            where: {
                              ...prev.where,
                              suppCode: value === "all" ? null : value,
                            },
                            skip: 0,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Filter by supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Suppliers</SelectItem>
                          {supplierOptions.map((supplier) => (
                            <SelectItem key={supplier.value} value={supplier.value}>
                              {supplier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <TabsList className="w-[35%] bg-gray-200 h-[38px]">
                      <TabsTrigger className="cursor-pointer" value="posted">Posted</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="approved">Approved by HQ</TabsTrigger>
                      <TabsTrigger className="cursor-pointer" value="rejected">Rejected by HQ</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="posted">
                    <div className="text-sm text-gray-600 mb-4">
                      Showing Posted PRs from all sites
                    </div>
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                      approvalContext={true}
                    />
                  </TabsContent>

                  <TabsContent value="approved">
                    <div className="text-sm text-gray-600 mb-4">
                      Showing Approved PRs by HQ from all sites
                    </div>
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                      approvalContext={true}
                    />
                  </TabsContent>

                  <TabsContent value="rejected">
                    <div className="text-sm text-gray-600 mb-4">
                      Showing Rejected PRs by HQ from all sites
                    </div>
                    <GoodsReceiveTable 
                      data={goodsData} 
                      isLoading={isLoading} 
                      onSort={handleSort}
                      type="pr"
                      supplierOptions={supplierOptions}
                      approvalContext={true}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          ) : (
            // Non-HQ User: Existing structure unchanged
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="flex items-center justify-between space-x-2 mb-6">
                <div className="flex gap-4 items-center w-[60%]">
                  <div className="w-[280px] relative">
                    <Input
                      placeholder="Search by PR no, Ref no, Total amount"
                      value={searchValue}
                      onChange={(e) => handleSearch(e)}
                      className="pl-10"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  </div>

                  <Select
                    onValueChange={(value) => {
                      setPagination((prev) => ({
                        ...prev,
                        where: {
                          ...prev.where,
                          suppCode: value === "all" ? null : value,
                        },
                        skip: 0,
                      }));
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {supplierOptions.map((supplier) => (
                        <SelectItem key={supplier.value} value={supplier.value}>
                          {supplier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <TabsList className="w-[25%] bg-gray-200 h-[38px]">
                  <TabsTrigger className="cursor-pointer" value="all">All</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="open">Open</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="posted">Posted</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="approved">Approved</TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <Button
                  onClick={handleRoute}
                  className="bg-blue-950 text-white hover:bg-blue-700 cursor-pointer"
                >
                  + Create New
                </Button>
              </div>

              <TabsContent value="all">
                <GoodsReceiveTable 
                  data={goodsData} 
                  isLoading={isLoading} 
                  onSort={handleSort}
                  type="pr"
                  supplierOptions={supplierOptions}
                />
              </TabsContent>
              <TabsContent value="open">
                <GoodsReceiveTable 
                  data={goodsData} 
                  isLoading={isLoading} 
                  onSort={handleSort}
                  type="pr"
                  supplierOptions={supplierOptions}
                />
              </TabsContent>
              <TabsContent value="posted">
                <GoodsReceiveTable 
                  data={goodsData} 
                  isLoading={isLoading} 
                  onSort={handleSort}
                  type="pr"
                  supplierOptions={supplierOptions}
                />
              </TabsContent>
              <TabsContent value="approved">
                <GoodsReceiveTable 
                  data={goodsData} 
                  isLoading={isLoading} 
                  onSort={handleSort}
                  type="pr"
                  supplierOptions={supplierOptions}
                />
              </TabsContent>
              <TabsContent value="rejected">
                <GoodsReceiveTable 
                  data={goodsData} 
                  isLoading={isLoading} 
                  onSort={handleSort}
                  type="pr"
                  supplierOptions={supplierOptions}
                />
              </TabsContent>
            </Tabs>
          )}

          <Pagination
            currentPage={Math.ceil(pagination.skip / pagination.limit) + 1}
            totalPages={Math.ceil(totalCount / pagination.limit)}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
}

export default PurchaseRequisition;

