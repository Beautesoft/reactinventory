import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Calendar,
  Inbox,
  Search,
  Settings,
  ChevronDown,
  SquareTerminal,
  Bot,
  BookOpen,
  Settings2,
  LogOut,
  Shield,
} from "lucide-react";
import { FiHome, FiPackage } from "react-icons/fi";
import bslogo from "../assets/BsoftheaderLogo.png";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Link } from "react-router-dom";
import {
  FiClipboard,
  FiArrowRightCircle,
  FiArrowLeftCircle,
  FiRotateCw,
  FiEdit,
  FiFileText,
  FiBarChart2,
  FiTrendingUp,
  FiLayers,
  FiShoppingCart,
  FiShoppingBag,
} from "react-icons/fi";

import { NavMain } from "./nav-main";
import useAuth from "@/hooks/useAuth";
import { getUserAuthorizations, MENU_AUTH_MAPPING, hasUserAuthorization, hasUserAuthorizationByName } from "@/utils/utils";

const menu_items = [
  { title: "Dashboard", url: "/dashboard", icon: FiHome },
  { title: "Inventory", url: null, icon: FiPackage }, // collapsible
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { logout } = useAuth();
  const userDetails = JSON.parse(localStorage.getItem("userDetails"));

  // Check if user has authorization for a specific menu item
  const hasAuthorization = (menuTitle) => {
    const authCode = MENU_AUTH_MAPPING[menuTitle];
    if (!authCode) return true; // If no auth code mapped, allow access
    
    // First try exact code match
    if (hasUserAuthorization(authCode)) {
      return true;
    }
    
    // If no exact match, try "starts with" logic for names
    // This handles cases like "Stock Movement" matching "Stock Movement - Detail"
    return hasUserAuthorizationByName(menuTitle);
  };

  // Filter menu items based on user authorizations
  const getFilteredNavMain = () => {
    const userAuths = getUserAuthorizations();
    
    // If no authorizations found, show all menu items (fallback)
    if (!userAuths || userAuths.length === 0) {
      return [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: SquareTerminal,
          isActive: true,
        },
        {
          title: "Stock Control ",
          url: "#",
          icon: Bot,
          items: [
            {
              title: "Goods Receive Note",
              url: "/goods-receive-note",
              icon: FiClipboard,
            },
            {
              title: "Goods Transfer Out",
              url: "/goods-transfer-out",
              icon: FiArrowRightCircle,
            },
            {
              title: "Goods Transfer In",
              url: "/goods-transfer-in",
              icon: FiArrowLeftCircle,
            },
            {
              title: "Goods Return Note",
              url: "/goods-return-note",
              icon: FiRotateCw,
            },
            { title: "Stock Adjustment", 
              url: "/stock-adjustment", 
              icon: FiEdit },
            {
              title: "Stock Usage Memo",
              url: "/stock-usage-memo",
              icon: FiFileText,
            },
            {
              title: "Stock Balance",
              url: "/stock-balance-live",
              icon: FiLayers,
            },
            // Stock Take is always available for all users
            { title: "Stock Take", 
              url: "/stock-take", 
              icon: FiEdit },
          ],
        },
        ...(userDetails?.isSettingEnabled === "Y" ? [{
          title: "Settings",
          url: "/settings",
          icon: Settings2,
        }] : []),
        {
          title: "Logout",
          url: "#",
          icon: LogOut,
          onClick: () => {
            console.log("Logout clicked");
            logout();
          },
        },
      ];
    }

    // Filter stock control items based on authorizations
    const stockControlItems = [
      {
        title: "Goods Receive Note",
        url: "/goods-receive-note",
        icon: FiClipboard,
      },
      {
        title: "Goods Transfer Out",
        url: "/goods-transfer-out",
        icon: FiArrowRightCircle,
      },
      {
        title: "Goods Transfer In",
        url: "/goods-transfer-in",
        icon: FiArrowLeftCircle,
      },
      {
        title: "Goods Return Note",
        url: "/goods-return-note",
        icon: FiRotateCw,
      },
      { title: "Stock Adjustment", 
        url: "/stock-adjustment", 
        icon: FiEdit },
      {
        title: "Stock Usage Memo",
        url: "/stock-usage-memo",
        icon: FiFileText,
      },
      {
        title: "Stock Balance",
        url: "/stock-balance-live",
        icon: FiLayers,
      },
      {
        title: "Stock Balance Report",
        url: "/stock-balance",
        icon: FiBarChart2,
      },
      {
        title: "Stock Movement Report",
        url: "/stock-movement",
        icon: FiTrendingUp,
      },
      // Temporarily hidden - Purchase Order
      // {
      //   title: "Purchase Order",
      //   url: "/purchase-order",
      //   icon: FiShoppingCart,
      // },
      {
        title: "Purchase Requisition",
        url: "/purchase-requisition",
        icon: FiShoppingBag,
      },
    ].filter(item => hasAuthorization(item.title));

    // Stock Take is always available for all users
    const alwaysAvailableItems = [
      { title: "Stock Take", 
        url: "/stock-take", 
        icon: FiEdit }
    ];

    return [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: SquareTerminal,
        isActive: true,
      },
      // Show Stock Control if user has at least one authorization OR if Stock Take should be available
      ...((stockControlItems.length > 0 || alwaysAvailableItems.length > 0) ? [{
        title: "Stock Control ",
        url: "#",
        icon: Bot,
        items: [...stockControlItems, ...alwaysAvailableItems],
      }] : []),
      // Only show Settings if user has isSettingEnabled = "Y"
      ...(userDetails?.isSettingEnabled === "Y" ? [{
        title: "Settings",
        url: "/settings",
        icon: Settings2,
      }] : []),
      {
        title: "Logout",
        url: "#",
        icon: LogOut,
        onClick: () => {
          console.log("Logout clicked");
          logout();
        },
      },
    ];
  };

  const navMain = getFilteredNavMain();

  return (
    <Sidebar
      className="w-64 border-r border-gray-200"
      collapsible="icon"
      variant="floating"
      defaultValue="dashboard"
    >
      <SidebarContent className="relative h-full bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-950">
        {" "}
        <SidebarGroup>
          <SidebarGroupLabel className="text-3xl mb-16 mt-1 flex flex-col items-start space-x-2">
            <img
              src={bslogo}
              alt="Logo"
              className="w-40 ml-6 h-auto object-contain"
            />

            <p className="m-[10px]">Inventory</p>
          </SidebarGroupLabel>

          <SidebarGroupContent >
            <NavMain items={navMain} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
