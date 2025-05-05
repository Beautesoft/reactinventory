import { Toaster } from "sonner";
import { AuthInitializer } from "./router/authInitializer";
import { GrnProvider } from "./context/grnContext";
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
import AddGrn from "./pages/grn/addGrn";
import PrintPreview from "./pages/grn/printPreview";

function App() {
  return (
    <AuthProvider>
      <AuthInitializer>
        <GrnProvider>
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
                        </Routes>
                      </Layout>{" "}
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Router>
          </SidebarProvider>
        </GrnProvider>
      </AuthInitializer>
    </AuthProvider>
  );
}
export default App;
