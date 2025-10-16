import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CalendarDays, Package, ShoppingCart, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import { toast } from "sonner";
import { format_Date } from "@/utils/utils";

function DashBoard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalStockItems: 0,
    pendingOrders: 0,
    monthlyTransactions: 0,
    recentActivities: 0,
    lowStockItems: [],
    recentTransactions: [],
    stockBalance: [],
    stockItems: []
  });

  // Batch modal state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stock items
      const stockQuery = `?Site=${userDetails.siteCode}`;
      const stockResponse = await apiService1.get(`api/GetInvitems${stockQuery}`);
      const stockItems = stockResponse?.result || stockResponse || [];

      // Fetch recent stock transfers (last 30 days) from Stktrn
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentFilter = {
        where: {
          and: [
            { storeNo: userDetails.siteCode },
            { trnDate: { gte: thirtyDaysAgo.toISOString().split('T')[0] } }
          ]
        },
        order: ["trnPost DESC"],
        limit: 20
      };
      const recentResponse = await apiService.get(
        `Stktrns?filter=${encodeURIComponent(JSON.stringify(recentFilter))}`
      );

      // Fetch pending documents (documents with status != 7)
      const pendingFilter = {
        where: {
          and: [
            { storeNo: userDetails.siteCode },
            { docStatus: { neq: 7 } }
          ]
        }
      };
      const pendingResponse = await apiService.get(
        `StkMovdocHdrs?filter=${encodeURIComponent(JSON.stringify(pendingFilter))}`
      );

      // Calculate low stock items (quantity < 10)
      const lowStockItems = stockItems
        .filter(item => Number(item.quantity || 0) < 10 && Number(item.quantity || 0) > 0)
        .slice(0, 5)
        .map(item => ({
          stockCode: item.stockCode,
          stockName: item.stockName || "N/A",
          quantity: item.quantity,
          uomDescription: item.uomDescription
        }));

      // Calculate top stock items by value
      const topStockItems = stockItems
        .filter(item => Number(item.quantity || 0) > 0)
        .map(item => {
          // Use the same price calculation logic as in addGrn.jsx
          const price = Number(item?.item_Price) || Number(item?.Price) || Number(item?.Cost) || 0;
          const quantity = Number(item.quantity || 0);
          return {
            ...item,
            calculatedPrice: price,
            calculatedValue: quantity * price
          };
        })
        .sort((a, b) => b.calculatedValue - a.calculatedValue)
        .slice(0, 5)
        .map(item => ({
          stockCode: item.stockCode,
          stockName: item.stockName || "N/A",
          quantity: item.quantity,
          value: item.calculatedValue,
          uomDescription: item.uomDescription
        }));

      setDashboardData({
        totalStockItems: stockItems.length,
        pendingOrders: pendingResponse?.length || 0,
        monthlyTransactions: recentResponse?.length || 0,
        recentActivities: recentResponse?.length || 0,
        lowStockItems,
        recentTransactions: recentResponse?.slice(0, 5) || [],
        stockBalance: topStockItems,
        stockItems: stockItems
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = [
    {
      title: "Total Stock Items",
      value: dashboardData.totalStockItems.toLocaleString(),
      icon: Package,
      trend: "+12.5%",
      color: "text-blue-600",
      loading: loading
    },
    {
      title: "Pending Orders",
      value: dashboardData.pendingOrders.toString(),
      icon: ShoppingCart,
      trend: "+5.2%",
      color: "text-orange-600",
      loading: loading
    },
    {
      title: "Monthly Transactions",
      value: dashboardData.monthlyTransactions.toString(),
      icon: TrendingUp,
      trend: "+8.1%",
      color: "text-green-600",
      loading: loading
    },
    {
      title: "Recent Activities",
      value: dashboardData.recentActivities.toString(),
      icon: CalendarDays,
      trend: "+3.1%",
      color: "text-purple-600",
      loading: loading
    },
  ];


  const getTrnTypeColor = (trnType) => {
    switch (trnType) {
      case "GRN": return "text-green-600 bg-green-100";
      case "TFRF": return "text-blue-600 bg-blue-100";
      case "TFRT": return "text-purple-600 bg-purple-100";
      case "VGRN": return "text-orange-600 bg-orange-100";
      case "TKE": return "text-yellow-600 bg-yellow-100";
      case "ADJ": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getTrnTypeText = (trnType) => {
    switch (trnType) {
      case "GRN": return "Goods Receive";
      case "TFRF": return "Transfer In";
      case "TFRT": return "Transfer Out";
      case "VGRN": return "Return";
      case "TKE": return "Stock Take";
      case "ADJ": return "Adjustment";
      default: return trnType || "Unknown";
    }
  };

  // Batch details functions
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
          formattedExpDate: format_Date(batch.expDate),
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {userDetails?.username || "User"}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your inventory today.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">
                      {stat.loading ? "..." : stat.value}
                    </p>
                    <span className="ml-2 text-sm font-medium text-green-600">
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Dashboard sections with real data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Transfers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Stock Transfers</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : dashboardData.recentTransactions.length > 0 ? (
              dashboardData.recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{transaction.trnDocno}</p>
                    <p className="text-xs text-gray-500">{transaction.itemcode?.replace('0000', '')} - {format_Date(transaction.trnDate)}</p>
                    <p className="text-xs text-gray-400">Amount: ${transaction.trnAmt || 0}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrnTypeColor(transaction.trnType)}`}>
                      {getTrnTypeText(transaction.trnType)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Qty: {transaction.trnQty || 0}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">No recent stock transfers</div>
            )}
          </div>
        </Card>

           {/* Stock Balance Mini View */}
           <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Stock Balance Overview</h2>
          <Package className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : dashboardData.stockItems.length > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dashboardData.stockItems.length}</p>
                  <p className="text-xs text-blue-600">Total Items</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData.stockItems.filter(item => Number(item.quantity || 0) > 0).length}
                  </p>
                  <p className="text-xs text-green-600">In Stock</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {dashboardData.stockItems.filter(item => Number(item.quantity || 0) === 0).length}
                  </p>
                  <p className="text-xs text-orange-600">Out of Stock</p>
                </div>
              </div>

              {/* Top 5 Stock Items Table */}
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 font-medium">Stock Code</th>
                        <th className="text-left p-2 font-medium">Stock Name</th>
                        <th className="text-right p-2 font-medium">Qty</th>
                        <th className="text-right p-2 font-medium">Value</th>
                        <th className="text-center p-2 font-medium">Batches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.stockItems
                        .filter(item => Number(item.quantity || 0) > 0)
                        .sort((a, b) => (Number(b.quantity || 0) * Number(b.item_Price || 0)) - (Number(a.quantity || 0) * Number(a.item_Price || 0)))
                        .slice(0, 5)
                        .map((item, index) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td className="p-2 font-medium text-xs text-blue-600">{item.stockCode}</td>
                            <td className="p-2 text-xs text-gray-600 truncate max-w-[150px]" title={item.stockName || "N/A"}>
                              {item.stockName || "N/A"}
                            </td>
                            <td className="p-2 text-right text-xs">
                              {Number(item.quantity || 0).toLocaleString()} {item.uomDescription}
                            </td>
                            <td className="p-2 text-right text-xs font-medium text-green-600">
                              ${((Number(item.quantity || 0) * (Number(item?.item_Price) || Number(item?.Price) || Number(item?.Cost) || 0))).toLocaleString()}
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBatchClick(item)}
                                className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 font-bold text-lg w-10 h-10 rounded-lg border-2 border-blue-300 hover:border-blue-500"
                                title="View Batch Details"
                              >
                                B
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* View All Button */}
              <div className="text-center pt-3">
                <button 
                  onClick={() => window.location.href = '/stock-balance-live'}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Full Stock Balance →
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">No stock data available</div>
          )}
        </div>
        </Card>

  
      </div>

      {/* Top Stock Items by Value and Stock Balance Overview in same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stock Items by Value */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Stock Items by Value</h2>
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : dashboardData.stockBalance.length > 0 ? (
              dashboardData.stockBalance.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.stockCode}</p>
                    <p className="text-xs text-gray-600">{item.stockName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {item.quantity} {item.uomDescription}
                    </p>
                    <p className="text-xs text-gray-500">
                      Value: ${item.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">No stock data available</div>
            )}
          </div>
        </Card>

      {/* Low Stock Alert */}
      <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Low Stock Alert</h2>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : dashboardData.lowStockItems.length > 0 ? (
              dashboardData.lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <div>
                    <p className="font-medium text-sm">{item.stockCode}</p>
                    <p className="text-xs text-gray-600">{item.stockName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">{item.quantity} {item.uomDescription}</p>
                    <p className="text-xs text-gray-500">Low Stock</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p>All items are well stocked!</p>
              </div>
            )}
          </div>
        </Card>
     
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
    </div>
  );
}

export default DashBoard;
