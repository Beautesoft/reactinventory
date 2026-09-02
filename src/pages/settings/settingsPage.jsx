import React from "react";
import UserAuthorization from "@/pages/userAuthorization";
import { Shield } from "lucide-react";

function SettingsPage() {
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  const isAdmin = userDetails?.isSettingEnabled === "Y";

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 text-gray-700">
          <Shield className="h-5 w-5" />
          <p>Settings is only available for admin users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <UserAuthorization />
    </div>
  );
}

export default SettingsPage;
