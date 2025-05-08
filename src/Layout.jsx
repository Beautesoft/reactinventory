import React from "react";
import MySidebar from "./components/sidebarCus";
import { Route, Routes } from "react-router-dom";
import GoodsReceiveNote from "./pages/grn/goodsReceiveNote";
import DashBoard from "./pages/dashBoard";
import { AppSidebar } from "./components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { BreadcrumbNav } from "./components/breadCrumbs";
import { Toaster } from "sonner";
import { User,MapPin } from "lucide-react";

const Layout = ({ children }) => {
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));
  console.log("userDetails", userDetails);
  const userName = userDetails?.username || "User";
  const siteName = userDetails?.siteName || "Site Name";

  return (
    <>
      <Toaster richColors />
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between gap-3 py-3 px-3 bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200">
            <div className="flex items-center justify-start">
              <SidebarTrigger />
              <BreadcrumbNav />
            </div>
            <div className="flex items-center gap-12 justify-end">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h1 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {siteName}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  {userName}
                </h1>
                <User className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              </div>
            </div>
          </div>
          <main className="flex-1 px-2 overflow-auto bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/20 dark:from-gray-900 dark:to-gray-800">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;
