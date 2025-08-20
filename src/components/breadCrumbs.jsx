import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react"; // Add this import

// Map routes to navigation structure
const routeConfig = {
  "/dashboard": {
    label: "Dashboard",
    parent: null,
  },
  "/goods-receive-note": {
    label: "Goods Receive Note",
    parent: "Stock Movement",
  },
  "/goods-receive-note/add": {
    label: "Add GRN",
    parent: "Goods Receive Note",
    parentPath: "/goods-receive-note",
  },
  "/goods-receive-note/details": {
    label: "GRN Details",
    parent: "Goods Receive Note",
    parentPath: "/goods-receive-note",
  },
  "/goods-receive-note/edit": {
    label: "Edit GRN",
    parent: "Goods Receive Note",
    parentPath: "/goods-receive-note",
  },
  "/goods-receive-note/print": {
    label: "Print GRN",
    parent: "Goods Receive Note",
    parentPath: "/goods-receive-note",
  },
  "/goods-transfer-out": {
    label: "Goods Transfer Out",
    parent: "Stock Movement",
  },
  "/goods-transfer-in": {
    label: "Goods Transfer In",
    parent: "Stock Movement",
  },
  "/goods-return-note": {
    label: "Goods Return Note",
    parent: "Stock Movement",
  },
  "/stock-adjustment": {
    label: "Stock Adjustment",
    parent: "Stock Movement",
  },
  "/stock-usage-memo": {
    label: "Stock Usage Memo",
    parent: "Stock Movement",
  },
};

export function BreadcrumbNav() {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const currentPath = location.pathname;
    const breadcrumbs = [];

    // Find matching route
    const matchingRoute = Object.entries(routeConfig).find(([path]) => {
      // Check if current path starts with the route path
      return currentPath.startsWith(path);
    });

    if (matchingRoute) {
      const [_, route] = matchingRoute;

      // Add Stock Movement if it's a parent
      if (route.parent === "Stock Movement") {
        breadcrumbs.push({
          path: "#",
          label: "Stock Movement",
          isLast: false,
        });
      }

      // Add parent route if exists
      if (route.parent === "Goods Receive Note") {
        breadcrumbs.push({
          path: route.parentPath,
          label: "Goods Receive Note",
          isLast: false,
        });
      }

      // Add current page
      breadcrumbs.push({
        path: currentPath,
        label: route.label,
        isLast: true,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Breadcrumb className=" p-3 rounded-lg ">
      <BreadcrumbList className="text-base">
        {breadcrumbs.map((breadcrumb, index) => (
          <BreadcrumbItem key={breadcrumb.path} className="font-medium">
            {!breadcrumb.isLast ? (
              <BreadcrumbLink
                as={Link}
                to={breadcrumb.path}
                className={`
                  hover:text-primary transition-colors
                  ${
                    breadcrumb.path === "#"
                      ? "cursor-default pointer-events-none text-gray-600 font-semibold"
                      : "text-gray-500 hover:text-primary/90 cursor-pointer"
                  }
                `}
              >
                {breadcrumb.label}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="font-semibold text-primary">
                {breadcrumb.label}
              </BreadcrumbPage>
            )}
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </BreadcrumbSeparator>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
