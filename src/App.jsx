import { Toaster } from "sonner";
import { GrnProvider } from "./context/grnContext";
import { GtoProvider } from "@/context/gtoContext";
import { SidebarProvider } from "./components/ui/sidebar";
import { AuthProvider } from "./context/AuthContext";
import { Route, Routes } from "react-router-dom";
import { BrowserRouter as Router } from "react-router-dom";
import PublicRoute from "./router/PublicRoutes";
import PrivateRoute from "./router/ProtectedRoute";
import Layout from "./Layout";
import Login from "./pages/login";
import DashBoard from "./pages/dashBoard";
import GoodsReceiveNote from "./pages/grn/goodsReceiveNote";
import AddGrn from "./pages/grn/addGrn.jsx";
import PrintPreview from "./pages/grn/printPreview";
import GoodsTransferOut from "./pages/gto/goodsTransferOut";
import AddGto from "./pages/gto/addGto";
import Settings from "./pages/settings";
import AddGti from "./pages/gti/addGti";
import GoodsTransferIn from "./pages/gti/goodsTransferIn";
import GoodsReturnNote from "./pages/rtn/goodsReturnNote";
import AddRtn from "./pages/rtn/addRtn";
import AddAdj from "./pages/adj/addAdj";
import StockAdjustment from "./pages/adj/stockAdjustment";
import StockUsageMemo from "./pages/sum/stockUsageMemo";
import AddSum from "./pages/sum/addSum";
import AddTake from "./pages/take/addTake";
import StockTake from "./pages/take/stockTake";
import UserAuthorization from "./pages/userAuthorization";
import StockBalance from "./pages/reports/stockBalance";
import StockMovement from "./pages/reports/stockMovement";

function App() {
  return (
    <AuthProvider>
        <GrnProvider>
          <GtoProvider>
            <SidebarProvider>
              <Toaster richColors />
              <Router>
                <Routes>
                {/* Public Route */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    }
                  />
                
                {/* Protected Routes - Nested structure */}
                  <Route
                  path="/"
                    element={
                      <PrivateRoute>
                      <Layout />
                    </PrivateRoute>
                  }
                >
                  {/* Nested routes - these will render inside Layout via Outlet */}
                  <Route index element={<DashBoard />} />
                  <Route path="dashboard" element={<DashBoard />} />
                  
                  {/* Goods Receive Note Routes */}
                  <Route path="goods-receive-note" element={<GoodsReceiveNote />} />
                  <Route path="goods-receive-note/add" element={<AddGrn />} />
                  <Route path="goods-receive-note/details/:docNo" element={<AddGrn />} />
                  <Route path="goods-receive-note/edit/:docNo" element={<AddGrn />} />
                  <Route path="goods-receive-note/print/:docNo" element={<PrintPreview documentType="grn" />} />
                  
                  {/* Goods Transfer Out Routes */}
                  <Route path="goods-transfer-out" element={<GoodsTransferOut />} />
                  <Route path="goods-transfer-out/add" element={<AddGto />} />
                  <Route path="goods-transfer-out/details/:docNo" element={<AddGto />} />
                  <Route path="goods-transfer-out/edit/:docNo" element={<AddGto />} />
                  <Route path="goods-transfer-out/print/:docNo" element={<PrintPreview documentType="gto" />} />
                  
                  {/* Goods Transfer In Routes */}
                  <Route path="goods-transfer-in" element={<GoodsTransferIn />} />
                  <Route path="goods-transfer-in/add" element={<AddGti />} />
                  <Route path="goods-transfer-in/details/:docNo" element={<AddGti />} />
                  <Route path="goods-transfer-in/edit/:docNo" element={<AddGti />} />
                  <Route path="goods-transfer-in/print/:docNo" element={<PrintPreview documentType="gti" />} />
                  
                  {/* Goods Return Note Routes */}
                  <Route path="goods-return-note" element={<GoodsReturnNote />} />
                  <Route path="goods-return-note/details/:docNo" element={<AddRtn />} />
                  <Route path="goods-return-note/add" element={<AddRtn />} />
                  <Route path="goods-return-note/edit/:docNo" element={<AddRtn />} />
                  <Route path="goods-return-note/print/:docNo" element={<PrintPreview documentType="rtn" />} />
                  
                  {/* Stock Take Routes */}
                  <Route path="stock-take" element={<StockTake />} />
                  <Route path="stock-take/add" element={<AddTake />} />
                  <Route path="stock-take/details/:docNo" element={<AddTake />} />
                  <Route path="stock-take/edit/:docNo" element={<AddTake />} />
                  
                  {/* Stock Adjustment Routes */}
                  <Route path="stock-adjustment" element={<StockAdjustment />} />
                  <Route path="stock-adjustment/add" element={<AddAdj />} />
                  <Route path="stock-adjustment/details/:docNo" element={<AddAdj />} />
                  <Route path="stock-adjustment/edit/:docNo" element={<AddAdj />} />
                  <Route path="stock-adjustment/print/:docNo" element={<PrintPreview documentType="adj" />} />
                  
                  {/* Stock Usage Memo Routes */}
                  <Route path="stock-usage-memo" element={<StockUsageMemo />} />
                  <Route path="stock-usage-memo/add" element={<AddSum />} />
                  <Route path="stock-usage-memo/details/:docNo" element={<AddSum />} />
                  <Route path="stock-usage-memo/edit/:docNo" element={<AddSum />} />
                  <Route path="stock-usage-memo/print/:docNo" element={<PrintPreview documentType="sum" />} />
                  
                  {/* Report Routes */}
                  <Route path="stock-balance" element={<StockBalance />} />
                  <Route path="stock-movement" element={<StockMovement />} />
                  
                  {/* Other Routes */}
                  <Route path="purchase-order" element={<h1>Purchase Order</h1>} />
                  <Route path="sales-order" element={<h1>Sales Order</h1>} />
                  <Route path="stock-transfer" element={<h1>Stock Transfer</h1>} />
                  <Route path="settings" element={<UserAuthorization />} />
                </Route>
                </Routes>
              </Router>
            </SidebarProvider>
          </GtoProvider>
        </GrnProvider>
    </AuthProvider>
  );
}

export default App;
