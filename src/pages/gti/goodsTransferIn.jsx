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
import { useGto } from "@/context/gtoContext";
import { toast } from "sonner";
import apiService1 from "@/services/apiService1";

function GoodsTransferIn() {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const { goodsData, isLoading, setLoading, setGoodsData, setError } = useGto();

  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showOwnRecords, setShowOwnRecords] = useState(false);
  const [ownGoodsData, setOwnGoodsData] = useState([]);
  const [filteredOwnData, setFilteredOwnData] = useState([]);
  const [ownLoading, setOwnLoading] = useState(false);
  const [pagination, setPagination] = useState({
    where: {
      docStatus: null,
      movCode: "GTI",
      storeNo: userDetails?.siteCode,
    },
    like: null,
    skip: 0,
    limit: 10,
    order: "docDate DESC",
  });
  const [ownPagination, setOwnPagination] = useState({
    page: 1,
    limit: 10
  });
  const [ownTotalCount, setOwnTotalCount] = useState(0);

  const debouncedSearchValue = useDebounce(searchValue, 1000);

  const getNoteTable = async () => {
    setLoading(true);
    try {
      const filter = buildFilterObject(pagination);
      const countFilter = buildCountObject(pagination);
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const countQuery = `?where=${encodeURIComponent(
        JSON.stringify(countFilter.where)
      )}`;

      const [dataResponse, countResponse] = await Promise.all([
        apiService.get(`StkMovdocHdrs${query}`),
        apiService.get(`StkMovdocHdrs/count${countQuery}`),
      ]);

      setGoodsData(dataResponse);
      setTotalCount(countResponse.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnRecords = async () => {
    setOwnLoading(true);
    try {
      const response = await apiService1.get(`/api/GetStkInOwn?Site=${userDetails?.siteCode}`);
      if (response && response.result) {
        setOwnGoodsData(response.result);
        setFilteredOwnData(response.result);
        setOwnTotalCount(response.result.length);
      }
    } catch (err) {
      setError(err.message);
      toast.error("Failed to fetch own records");
    } finally {
      setOwnLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await getNoteTable();
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      getNoteTable();
    }
  }, [
    pagination.skip,
    pagination.where.docStatus,
    debouncedSearchValue,
  ]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    if (showOwnRecords) {
      // Filter own records
      if (value) {
        const filtered = ownGoodsData.filter(item => 
          item.docNo?.toLowerCase().includes(value.toLowerCase()) ||
          item.docDate?.toLowerCase().includes(value.toLowerCase()) ||
          item.docRef1?.toLowerCase().includes(value.toLowerCase()) ||
          item.docRef2?.toLowerCase().includes(value.toLowerCase()) ||
          item.docRemark?.toLowerCase().includes(value.toLowerCase()) ||
          item.docQty?.toString().includes(value) ||
          item.docAmt?.toString().includes(value)
        );
        setFilteredOwnData(filtered);
      } else {
        setFilteredOwnData(ownGoodsData);
      }
    } else {
      // Original GTI search logic
      if (value) {
        setPagination((prev) => ({
          ...prev,
          like: {
            docNo: value,
            docDate: value,
            docRef1: value,
            docAmt: value,
            docStatus: value,
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
    }
  };

  const handleTabChange = (value) => {
    const status = value === "open" ? 0 : value === "posted" ? 7 : null;
    setActiveTab(value);
    setPagination((prev) => ({
      ...prev,
      where: {
        ...prev.where,
        docStatus: status,
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

  const handleOwnPageChange = (newPage) => {
    setOwnPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleRoute = () => {
    console.log("Create New clicked");
    navigate("/goods-transfer-in/add/");
  };

  const handleVerifyRecords = () => {
    setShowOwnRecords(!showOwnRecords);
    if (!showOwnRecords) {
      fetchOwnRecords();
    }
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
              {showOwnRecords ? "Verify Records" : "Goods Transfer In"}
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
              <div className="w-[300px] relative">
                <Input
                  placeholder="Search by Doc no, Ref no, Total qty"
                  value={searchValue}
                  onChange={(e) => handleSearch(e)}
                  className="pl-10"
                />
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>

              {!showOwnRecords && (
                <TabsList className="w-[25%] bg-gray-200 h-[38px] mr-40">
                  <TabsTrigger className="cursor-pointer" value="all">
                    All
                  </TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="open">
                    Open
                  </TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="posted">
                    Posted
                  </TabsTrigger>
                </TabsList>
              )}

              <div className="flex items-center gap-2">
                {showOwnRecords ? (
                  <Button
                    onClick={handleVerifyRecords}
                    variant="outline"
                    className="bg-gray-100"
                  >
                    Back to GTI
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleVerifyRecords}
                      variant="outline"
                    >
                      Verify Records
                    </Button>
                    <Button
                      onClick={handleRoute}
                      className="bg-blue-950 text-white hover:bg-blue-700"
                    >
                      + Create New
                    </Button>
                  </>
                )}
              </div>
            </div>

            {showOwnRecords ? (
              <>
                <GoodsReceiveTable 
                  data={filteredOwnData.slice(
                    (ownPagination.page - 1) * ownPagination.limit,
                    ownPagination.page * ownPagination.limit
                  )} 
                  isLoading={ownLoading} 
                  type="gtiOwn" 
                />
                <Pagination
                  currentPage={ownPagination.page}
                  totalPages={Math.ceil(filteredOwnData.length / ownPagination.limit)}
                  onPageChange={handleOwnPageChange}
                />
              </>
            ) : (
              <>
                <TabsContent value="all">
                  <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gti" />
                </TabsContent>
                <TabsContent value="open">
                  <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gti" />
                </TabsContent>
                <TabsContent value="posted">
                  <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gti" />
                </TabsContent>
                <Pagination
                  currentPage={Math.ceil(pagination.skip / pagination.limit) + 1}
                  totalPages={Math.ceil(totalCount / pagination.limit)}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </Tabs>
        </div>
      )}
    </>
  );
}

export default GoodsTransferIn;
