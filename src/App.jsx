import { Toaster } from "sonner";
import { AuthInitializer } from "./router/authInitializer";
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

function App() {
  return (
    <AuthProvider>
      <AuthInitializer>
        <GrnProvider>
          <GtoProvider>
            <SidebarProvider>
              <Toaster richColors />
              <Router>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<DashBoard />} />
                            <Route path="/dashboard" element={<DashBoard />} />
                            <Route
                              path="/goods-receive-note"
                              element={<GoodsReceiveNote />}
                            />
                            <Route
                              path="/goods-receive-note/add"
                              element={<AddGrn />}
                            />
                            <Route
                              path="/goods-receive-note/details/:docNo"
                              element={<AddGrn />}
                            />
                            <Route
                              path="/goods-receive-note/edit/:docNo"
                              element={<AddGrn />}
                            />
                            <Route
                              path="/goods-receive-note/print/:docNo"
                              element={<PrintPreview />}
                            />
                            <Route
                              path="/goods-transfer-out"
                              element={<GoodsTransferOut />}
                            />
                            <Route
                              path="/goods-transfer-out/add"
                              element={<AddGto />}
                            />
                            <Route
                              path="/goods-transfer-out/details/:docNo"
                              element={<AddGto />}
                            />
                            <Route
                              path="/goods-transfer-out/edit/:docNo"
                              element={<AddGto />}
                            />
                            <Route
                              path="/goods-transfer-out/print/:docNo"
                              element={<PrintPreview />}
                            />
                            <Route
                              path="/goods-transfer-in"
                              element={<GoodsTransferIn />}
                            />
                            <Route
                              path="/goods-transfer-in/add"
                              element={<AddGti />}
                            />
                            <Route
                              path="/goods-transfer-in/details/:docNo"
                              element={<AddGti />}
                            />
                            <Route
                              path="/goods-transfer-in/edit/:docNo"
                              element={<AddGti />}
                            />
                            <Route
                              path="/goods-transfer-in/print/:docNo"
                              element={<PrintPreview />}
                            />

                            <Route
                              path="/goods-return-note/"
                              element={<GoodsReturnNote />}
                            />
                            <Route
                              path="/goods-return-note/details/:docNo"
                              element={<AddRtn />}
                            />

                            <Route
                              path="/goods-return-note/add"
                              element={<AddRtn />}
                            />
                            <Route
                              path="/goods-return-note/edit/:docNo"
                              element={<AddRtn />}
                            />
                            <Route
                              path="/goods-return-note/print/:docNo"
                              element={<PrintPreview />}
                            />

                            <Route
                              path="/stock-adjustment"
                              element={<GoodsReturnNote />}
                            />
                            <Route
                              path="/stock-adjustment/add"
                              element={<AddRtn />}
                            />

                            <Route
                              path="/stock-adjustment/details/:docNo"
                              element={<AddGti />}
                            />
                            <Route
                              path="/stock-adjustment/edit/:docNo"
                              element={<AddRtn />}
                            />
                            <Route
                              path="/stock-adjustment/print/:docNo"
                              element={<PrintPreview />}
                            />

                            <Route
                              path="/stock-usage-memo"
                              element={<GoodsReturnNote />}
                            />

                            <Route
                              path="/stock-usage-memo/add"
                              element={<AddRtn />}
                            />

                            <Route
                              path="/stock-usage-memo/details/:docNo"
                              element={<AddGti />}
                            />
                            <Route
                              path="/stock-usage-memo/edit/:docNo"
                              element={<AddRtn />}
                            />
                            <Route
                              path="/stock-usage-memo/print/:docNo"
                              element={<PrintPreview />}
                            />

                            <Route
                              path="/purchase-order"
                              element={<h1>Purchase Order</h1>}
                            />
                            <Route
                              path="/sales-order"
                              element={<h1>Sales Order</h1>}
                            />
                            <Route
                              path="/stock-transfer"
                              element={<h1>Stock Transfer</h1>}
                            />
                            <Route path="/settings" element={<Settings />} />
                          </Routes>
                        </Layout>{" "}
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </Router>
            </SidebarProvider>
          </GtoProvider>
        </GrnProvider>
      </AuthInitializer>
    </AuthProvider>
  );
}
export default App;
