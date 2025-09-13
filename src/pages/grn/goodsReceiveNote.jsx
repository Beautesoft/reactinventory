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

function GoodsReceiveNote() {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const { goodsData, isLoading, setLoading, setGoodsData, setError } = useGrn();

  // Local pagination state
  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    where: {
      docStatus: null,
      movCode: "GRN",
      storeNo: userDetails?.siteCode,
      supplyNo: null,
    },
    like: null,
    skip: 0,
    limit: 10,
    order: "docNo DESC",
  });
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

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
        await getNoteTable();
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
      getNoteTable();
    }
  }, [
    pagination.skip,
    pagination.where.docStatus,
    pagination.where.supplyNo,
    debouncedSearchValue,
    pagination.order
  ]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value) {
      setPagination((prev) => ({
        ...prev,
        like: {
          docNo: value,
          docDate: value,
          docRef1: value,
          supplyNo: value,
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

  const handleRoute = () => {
    console.log("Create New clicked");
    navigate("/goods-receive-note/add/"); // Navigate to the add page
  };

  const handleSort = (key, direction) => {
    setPagination((prev) => ({
      ...prev,
      order: `${key} ${direction === 'ascending' ? 'ASC' : 'DESC'}, docNo DESC`,
      skip: 0, // Reset to first page when sorting
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
              Goods Receive Note
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
                    placeholder="Search by Doc no, Ref no, Total qty"
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
                        supplyNo: value === "all" ? null : value,
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
                type="grn"
                supplierOptions={supplierOptions}
              />
            </TabsContent>
            <TabsContent value="open">
              <GoodsReceiveTable 
                data={goodsData} 
                isLoading={isLoading} 
                onSort={handleSort}
                type="grn"
                supplierOptions={supplierOptions}
              />
            </TabsContent>
            <TabsContent value="posted">
              <GoodsReceiveTable 
                data={goodsData} 
                isLoading={isLoading} 
                onSort={handleSort}
                type="grn"
                supplierOptions={supplierOptions}
              />
            </TabsContent>
          </Tabs>

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

export default GoodsReceiveNote;
