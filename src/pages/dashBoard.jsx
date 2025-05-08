import React from "react";
import { Card } from "@/components/ui/card";
import { CalendarDays, Package, ShoppingCart, TrendingUp } from "lucide-react";

function DashBoard() {
  const stats = [
    {
      title: "Total Stock Items",
      value: "2,345",
      icon: Package,
      trend: "+12.5%",
      color: "text-blue-600",
    },
    {
      title: "Pending Orders",
      value: "45",
      icon: ShoppingCart,
      trend: "+5.2%",
      color: "text-orange-600",
    },
    {
      title: "Monthly Transactions",
      value: "1,245",
      icon: TrendingUp,
      trend: "+8.1%",
      color: "text-green-600",
    },
    {
      title: "Recent Activities",
      value: "28",
      icon: CalendarDays,
      trend: "+3.1%",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your inventory today.
          </p>
        </div>
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
                      {stat.value}
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

      {/* Add more dashboard sections here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Stock Movements</h2>
          {/* Add your stock movement content here */}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Inventory Summary</h2>
          {/* Add your inventory summary content here */}
        </Card>
      </div>
    </div>
  );
}

export default DashBoard;
