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
} from "react-icons/fi";

import { NavMain } from "./nav-main";
import useAuth from "@/hooks/useAuth";

const menu_items = [
  { title: "Dashboard", url: "/dashboard", icon: FiHome },
  { title: "Inventory", url: null, icon: FiPackage }, // collapsible
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { logout } = useAuth();

  const navMain = [
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
        { title: "Stock Take", 
          url: "/stock-take", 
          icon: FiEdit },
          
        { title: "Stock Adjustment", 
          url: "/stock-adjustment", 
          icon: FiEdit },
        {
          title: "Stock Usage Memo",
          url: "/stock-usage-memo",
          icon: FiFileText,
        },
      ],
    },

    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
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

          <SidebarGroupContent>
            <NavMain items={navMain} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
