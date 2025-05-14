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
import { buildCountQuery, buildFilterQuery } from "@/utils/utils";
import Pagination from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGto } from "@/context/gtoContext";

function GoodsTransferOut() {
  const navigate = useNavigate();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  const { goodsData, isLoading, setLoading, setGoodsData, setError } = useGto();

  const [searchValue, setSearchValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    where: {
      docStatus: null,
      movCode: "GTO",
      storeNo: userDetails?.siteCode,
    },
    like: null,
    skip: 0,
    limit: 10,
    order: "docDate DESC",
  });

  const debouncedSearchValue = useDebounce(searchValue, 1000);

  const getNoteTable = async () => {
    setLoading(true);
    try {
      const query = buildFilterQuery(pagination);
      const countQuery = buildCountQuery(pagination);

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

  useEffect(() => {
    getNoteTable();
  }, [pagination, debouncedSearchValue]);

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
    setPagination((prev) => ({
      ...prev,
      where: {
        ...prev.where,
        docStatus: value === "Open" ? 0 : value === "Posted" ? 7 : null,
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
    navigate("/goods-transfer-out/add/");
  };

  return (
    <div className="h-screen w-full mt-6 light">
      <div className="ml-2 mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Goods Transfer Out</h1>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between space-x-2 mb-6">
          <div className="w-[30%] relative">
            <Input
              placeholder="Search by DocNo, Ref, Supplier, Total Qty, DocDate "
              onChange={(e) => {
                handleSearch(e);
              }}
              className="w-full pl-10"
            />
            <button
              onClick={() => console.log("Search icon clicked")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          <TabsList
            onClick={(e) => handleTabChange(e.target.innerText)}
            className={"w-[25%] bg-gray-200 h-[38px] mr-70"}
          >
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
            onClick={() => {
              handleRoute();
            }}
            className="bg-blue-950 text-white hover:bg-blue-700 cursor-pointer"
          >
            + Create New
          </Button>
        </div>

        <TabsContent value="all">
        <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gto" />        </TabsContent>
        <TabsContent value="open">
        <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gto" />        </TabsContent>
        <TabsContent value="posted">
        <GoodsReceiveTable data={goodsData} isLoading={isLoading} type="gto" />        </TabsContent>
      </Tabs>

      <Pagination
        currentPage={Math.ceil(pagination.skip / pagination.limit) + 1}
        totalPages={Math.ceil(totalCount / pagination.limit)}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default GoodsTransferOut;
