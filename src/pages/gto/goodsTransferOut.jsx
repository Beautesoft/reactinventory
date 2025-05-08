import React, {useEffect, useState } from "react";
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
// import apiService, { buildFilterQuery } from "@/utils/utils";
import { useGrn } from "@/context/grnContext";
import apiService from "@/services/apiService";
import { buildCountQuery, buildFilterQuery } from "@/utils/utils";
import Pagination from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";

function GoodsTransferOut() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const debouncedSearchValue = useDebounce(searchValue, 1000); // Debounce the search value
  const {
    goodsData,
    pagination,
    totalCount,
    setGoodsData,
    updatePagination,
    setTotalCount,
    updateWhere,
    updateLike,
    setDefaultdata,
    emptyGoodsData,
  } = useGrn();

  useEffect(() => {
    console.log("pagination", pagination);
    // setDefaultdata()
    setIsLoading(true);
    getNoteTable();
  }, [
    debouncedSearchValue,
    pagination.where.docStatus,
    currentPage,
    // pagination.limit,
  ]);

  const getNoteTable = () => {
    emptyGoodsData(); // Clear previous data
    const query = buildFilterQuery(pagination);
    const countQuery = buildCountQuery(pagination);
    console.log(query, "query");
    console.log(countQuery, "countQuery");
    Promise.all([
      apiService.get(`StkMovdocHdrs${query}`), // Fetch the data
      apiService.get(`StkMovdocHdrs/count${countQuery}`), // Fetch the count
    ])
      .then(([dataResponse, countResponse]) => {
        setIsLoading(false); // Set loading to false
        setGoodsData(dataResponse); // Set the data
        setTotalCount(countResponse); // Set the total count
      })
      .catch((err) => {
        setIsLoading(false); // Set loading to false
        setIsError(true); // Set error state to true
        console.error("Error fetching data:", err);
      });
  };

  const handleTabChange = (value) => {
    console.log(value, "value");
    // setIsLoading(true); // Set loading to true
    // setDefaultdata();

    if (value === "Open") {
      updateWhere({ docStatus: 0 }); // Incorrect, will overwrite `where`
      updatePagination({ skip: 0 }); // Reset pagination to the first page
    } else if (value === "Posted") {
      updateWhere({ docStatus: 7 }); // Incorrect, will overwrite `where`
      updatePagination({ skip: 0 }); // Reset pagination to the first page
    } else {
      updateWhere({ docStatus: null }); // Incorrect, will overwrite `where`
      updatePagination({ skip: 0 }); // Reset pagination to the first page
    }
  };

  const handlePageChange = (newPage) => {
    console.log(newPage, "newPage");
    // setIsLoading(true); // Set loading to true
    const newLimit = pagination.limit; // Keep the limit same
    const newSkip = (newPage - 1) * newLimit; // Calculate the new skip value
    updatePagination({ skip: newSkip }); // Update the pagination state
    setCurrentPage(newPage); // Update the current page state
  };

  const handleSearch = (e) => {
    const searchValue = e.target.value.trim();
    console.log(searchValue, "searchValue");
    setIsLoading(true); // Set loading to true

    setSearchValue(searchValue); // Update the search value state
    updateLike(searchValue); // Update the like filter with the search value
    updatePagination({ skip: 0 }); // Reset pagination to the first page
  };

  const handleRoute = () => {
    console.log("Create New clicked");
    navigate("/goods-receive-note/add/"); // Navigate to the add page
    // Add your routing logic here
  }

  return (
    <div className="h-screen w-full mt-8 light">
      <Tabs defaultValue="all" className="w-full   ">
        <div className="flex items-center justify-between space-x-2 mb-6">
          <div className="w-[30%] relative">
            <Input
              placeholder="Search"
              onChange={(e) => {
                handleSearch(e);
              }}
              className="w-full pl-10" // Add padding to the left for the icon
            />
            <button
              onClick={() => console.log("Search icon clicked")} // Replace with your desired function
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Search className="w-5 h-5" /> {/* Lucide-react Search icon */}
            </button>
          </div>
          <TabsList
            onClick={(e) => handleTabChange(e.target.innerText)}
            className={"w-[25%] bg-gray-200 h-[38px]  mr-70 "}
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
          <Button onClick={()=>{handleRoute()}} className="bg-blue-950 text-white hover:bg-blue-700  cursor-pointer">
            + Create New
          </Button>
        </div>

        <TabsContent value="all">
          <GoodsReceiveTable data={goodsData} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="open">
          {" "}
          <GoodsReceiveTable data={goodsData} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="posted">
          {" "}
          <GoodsReceiveTable data={goodsData} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <Pagination
        currentPage={Math.ceil(pagination.skip / pagination.limit) + 1} // Round up the current page
        totalPages={Math.ceil(totalCount / pagination.limit)} // Round up the total pages
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default GoodsTransferOut;
