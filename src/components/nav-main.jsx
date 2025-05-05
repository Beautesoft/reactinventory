import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

export function NavMain({ items }) {
  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Mainmenu</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) =>
          item.items?.length ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem className="w-full">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="w-full  mb-2 hover:bg-gray-300/60 dark:hover:bg-gray-700/60 font-medium"
                    tooltip={item.title}
                  >
                    {item.icon && (
                      <div className=" min-w-[24px] ">
                        <item.icon className="text-blue-600 h-6 w-6" />
                      </div>
                    )}{" "}
                    <span className=" font-medium text-gray-700 dark:text-gray-200 text-[15px]">
                      {item.title}
                    </span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-gray-500" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          className="w-full mb-1  py-4 hover:bg-gray-100 dark:hover:bg-gray-700/40 font-medium"
                          size="lg"
                          asChild
                        >
                          <Link to={subItem.url}>
                            <span className="text-gray-600 dark:text-gray-300 text-[15px]">
                              {subItem.title}
                            </span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem className="w-full" key={item.title}>
              <SidebarMenuButton
                className="w-full mb-2 hover:bg-gray-300/60 dark:hover:bg-gray-700/60 font-medium"
                asChild
                tooltip={item.title}
                onClick={item.onClick}
              >
                <Link to={item.url}>
                  {item.icon && (
                    <div className="min-w-[24px]">
                      <item.icon className="text-blue-600 h-5 w-5" />
                    </div>
                  )}{" "}
                  <span className="text-g</span>ray-700 dark:text-gray-200">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
