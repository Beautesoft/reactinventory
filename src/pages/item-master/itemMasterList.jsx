import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import useDebounce from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import ItemMasterTable from "@/components/itemMasterTable";
import Pagination from "@/components/pagination";
import itemMasterApi from "@/services/itemMasterApi";
import { toast } from "sonner";

function ItemMasterList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
  });

  const debouncedSearch = useDebounce(searchValue, 500);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stocks, divs, classes, depts, brands, ranges] = await Promise.all([
        itemMasterApi.getStocks({ limit: 5000, order: "itemCode ASC" }),
        itemMasterApi.getItemDivs(),
        itemMasterApi.getItemClasses(),
        itemMasterApi.getItemDepts(),
        itemMasterApi.getItemBrands(),
        itemMasterApi.getItemRanges(),
      ]);

      let list = Array.isArray(stocks) ? stocks : [];

      const enrich = (item) => {
        const d = { ...item };
        const matchDiv = divs?.find((x) => Number(x.itmCode) === Number(item.itemDiv));
        if (matchDiv) d.itemDiv = matchDiv.itmDesc;
        const matchClass = classes?.find((x) => Number(x.itmCode) === Number(item.itemClass));
        if (matchClass) d.itemClass = matchClass.itmDesc;
        const matchDept = depts?.find((x) => Number(x.itmCode) === Number(item.itemDept));
        if (matchDept) d.itemDept = matchDept.itmDesc;
        const matchBrand = brands?.find((x) => Number(x.itmCode) === Number(item.itemBrand));
        if (matchBrand) d.itemBrand = matchBrand.itmDesc;
        const matchRange = ranges?.find((x) => Number(x.itmCode) === Number(item.itemRange));
        if (matchRange) d.itemRange = matchRange.itmDesc;
        return d;
      };

      list = list.map(enrich);

      if (debouncedSearch?.trim()) {
        const s = debouncedSearch.toLowerCase();
        list = list.filter(
          (i) =>
            (i.itemCode && String(i.itemCode).toLowerCase().includes(s)) ||
            (i.itemName && String(i.itemName).toLowerCase().includes(s)) ||
            (i.rptCode && String(i.rptCode).toLowerCase().includes(s)) ||
            (i.itemType && String(i.itemType).toLowerCase().includes(s)) ||
            (i.itemDiv && String(i.itemDiv).toLowerCase().includes(s)) ||
            (i.itemClass && String(i.itemClass).toLowerCase().includes(s)) ||
            (i.itemDept && String(i.itemDept).toLowerCase().includes(s)) ||
            (i.itemBrand && String(i.itemBrand).toLowerCase().includes(s)) ||
            (i.itemRange && String(i.itemRange).toLowerCase().includes(s)) ||
            (i.itemIsactive === true && "true".includes(s)) ||
            (i.itemIsactive === false && "false".includes(s))
        );
      }

      setItems(list);
    } catch (err) {
      console.error("Error loading items:", err);
      toast.error("Failed to load items");
      setItems([]);
    } finally {
      setIsLoading(false);
      setInitialLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const displayedItems = useMemo(() => {
    if (activeTab === "active") return items.filter((i) => i.itemIsactive === true);
    if (activeTab === "inactive") return items.filter((i) => i.itemIsactive === false);
    return items;
  }, [items, activeTab]);

  const handleSort = (key, direction) => {
    setItems((prev) => {
      const sorted = [...prev].sort((a, b) => {
        let av = a[key];
        let bv = b[key];
        if (av == null) av = "";
        if (bv == null) bv = "";
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return direction === "ascending" ? -1 : 1;
        if (av > bv) return direction === "ascending" ? 1 : -1;
        return 0;
      });
      return sorted;
    });
  };

  const totalPages = Math.max(1, Math.ceil(displayedItems.length / pagination.perPage));
  const paginatedItems = displayedItems.slice(
    (pagination.page - 1) * pagination.perPage,
    pagination.page * pagination.perPage
  );

  return (
    <>
      {initialLoading ? (
        <PageLoader />
      ) : (
        <div className="h-screen w-full mt-6 light">
          <div className="ml-2 mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Item Master</h1>
          </div>

          <Tabs
            value={activeTab}
            className="w-full"
            onValueChange={(v) => {
              setActiveTab(v);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
          >
            <div className="overflow-x-auto min-w-0 mb-6">
              <div className="flex items-center justify-between gap-4 min-w-max pr-2">
                <div className="flex gap-4 items-center min-w-0 flex-1">
                  <div className="w-[380px] min-w-[240px] flex-shrink-0 relative">
                    <Input
                      placeholder="Search by Stock Code, Name, Link Code..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="pl-10"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <TabsList className="flex-shrink-0 w-[25%] min-w-[200px] bg-gray-200 h-[38px]">
                  <TabsTrigger className="cursor-pointer" value="all">
                    All
                  </TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="active">
                    Active
                  </TabsTrigger>
                  <TabsTrigger className="cursor-pointer" value="inactive">
                    Inactive
                  </TabsTrigger>
                </TabsList>

                <Button
                  onClick={() => navigate("/item-master/add")}
                  className="flex-shrink-0 bg-blue-950 text-white hover:bg-blue-700 cursor-pointer"
                >
                  + Create New
                </Button>
              </div>
            </div>

            <TabsContent value="all">
              <ItemMasterTable
                data={paginatedItems}
                isLoading={isLoading}
                onSort={handleSort}
              />
            </TabsContent>
            <TabsContent value="active">
              <ItemMasterTable
                data={paginatedItems}
                isLoading={isLoading}
                onSort={handleSort}
              />
            </TabsContent>
            <TabsContent value="inactive">
              <ItemMasterTable
                data={paginatedItems}
                isLoading={isLoading}
                onSort={handleSort}
              />
            </TabsContent>
          </Tabs>

          <div className="py-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ItemMasterList;
