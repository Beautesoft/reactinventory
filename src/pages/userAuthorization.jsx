import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Users, Shield, RefreshCw, UserPlus, Save } from "lucide-react";
import { toast } from "sonner";
import apiService1 from "@/services/apiService1";
import { formatCurrentDate } from "@/utils/utils";

const UserAuthorization = () => {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Authorization data from API
  const [userAuthorizations, setUserAuthorizations] = useState([]);

  // Get current logged-in user details
  const getCurrentUser = () => {
    try {
      const userDetails = localStorage.getItem("userDetails");
      return userDetails ? JSON.parse(userDetails) : null;
    } catch (error) {
      console.error("Error parsing user details:", error);
      return null;
    }
  };

  // Fetch user list
  useEffect(() => {
    fetchUserList();
  }, []);

  const fetchUserList = async () => {
    setLoading(true);
    try {
      const response = await apiService1.get("api/User?siteCode=NIL");
      if (response && response.success === "1" && response.result) {
        setUserList(response.result);
      } else {
        setUserList([]);
      }
    } catch (error) {
      console.error("Error fetching user list:", error);
      toast.error("Failed to fetch user list");
      // Mock data for demonstration
      setUserList([
        { itemCode: "U001", itemDesc: "John Doe" },
        { itemCode: "U002", itemDesc: "Jane Smith" },
        { itemCode: "U003", itemDesc: "Mike Johnson" },
        { itemCode: "U004", itemDesc: "Sarah Wilson" },
        { itemCode: "U005", itemDesc: "David Brown" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user authorizations
  const fetchUserAuthorizations = async (userCode) => {
    try {
      const response = await apiService1.get(`api/getInventoryAuth?userCode=${userCode}`);
      if (response && response.result) {
        // Transform DataTable response to array format
        const authData = Array.isArray(response.result) ? response.result : [];
        setUserAuthorizations(authData);
        return authData; // Return the data for localStorage update
      } else {
        setUserAuthorizations([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching user authorizations:", error);
      toast.error("Failed to fetch user authorizations");
      // Mock data for demonstration
      const mockData = [
        { Code: "F10001", Name: "Goods Receive Note List", Active: "Y" },
        { Code: "F10002", Name: "Goods Transfer Out List", Active: "N" },
        { Code: "F10003", Name: "Goods Transfer In List", Active: "Y" },
        { Code: "F10004", Name: "Goods Return List", Active: "N" },
        { Code: "F10005", Name: "Stock Adjustment List", Active: "Y" },
        { Code: "F10006", Name: "Purchase Order List", Active: "N" },
        { Code: "F10007", Name: "Approved PO List", Active: "Y" },
        { Code: "F10008", Name: "Purchase Order Approval", Active: "N" },
        { Code: "F10009", Name: "Stock Balance", Active: "Y" },
        { Code: "F10010", Name: "Stock Usage Memo List", Active: "N" },
        { Code: "F10011", Name: "Stock Movement - Detail", Active: "Y" },
      ];
      setUserAuthorizations(mockData);
      return mockData;
    }
  };

  // Handle user selection
  const handleUserSelect = (userCode) => {
    const user = userList.find(u => u.itemCode === userCode);
    setSelectedUser(user);
    fetchUserAuthorizations(userCode);
  };

  // Save individual authorization
  const saveAuthorization = async (userCode, reportCode, active) => {
    try {
      const response = await apiService1.get(`api/postInventoryAuth?UserCode=${userCode}&ReportCode=${reportCode}&Active=${active}`);
      if (response && response.success === "1") {
        return true;
      } else {
        throw new Error("Failed to save authorization");
      }
    } catch (error) {
      console.error("Error saving authorization:", error);
      throw error;
    }
  };

  // Handle authorization toggle with real-time saving
  const handleAuthorizationToggle = async (code, checked) => {
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }

    const active = checked ? "Y" : "N";
    
    // Update local state immediately for UI responsiveness
    setUserAuthorizations(prev => 
      prev.map(auth => 
        auth.Code === code ? { ...auth, Active: active } : auth
      )
    );
    
    // Save to API
    try {
      await saveAuthorization(selectedUser.itemCode, code, active);
      toast.success("Authorization updated successfully");
    } catch (error) {
      toast.error("Failed to update authorization");
      // Revert local state on error
      setUserAuthorizations(prev => 
        prev.map(auth => 
          auth.Code === code ? { ...auth, Active: checked ? "N" : "Y" } : auth
        )
      );
    }
  };

  // Refresh user list and current authorizations
  const refreshUserList = async () => {
    setLoading(true);
    try {
      await fetchUserList();
      
      // Get current logged-in user
      const currentUser = getCurrentUser();
      
      if (currentUser) {
        // Fetch current logged-in user's authorizations and update localStorage
        const response = await apiService1.get(`api/getInventoryAuth?userCode=${currentUser.usercode||currentUser.username}`);
        if (response && response.result) {
          const authData = Array.isArray(response.result) ? response.result : [];
          localStorage.setItem("userAuthorizations", JSON.stringify(authData));
          toast.success("User list and current user authorizations refreshed successfully.");
        }
      } else {
        toast.success("User list refreshed successfully.");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Authorization</h1>
          <p className="text-gray-600 mt-2">Manage user access to system forms and features</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={refreshUserList}
            disabled={loading}
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Selection Panel - Top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Selection
          </CardTitle>
          <CardDescription>
            Select a user to manage their authorizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <Select onValueChange={handleUserSelect} value={selectedUser?.itemCode || ""}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {userList.map((user) => (
                  <SelectItem key={user.itemCode} value={user.itemCode}>
                    {user.itemDesc} ({user.itemCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected User Info */}
          {selectedUser && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{selectedUser.itemDesc}</h3>
                  <p className="text-sm text-blue-700">{selectedUser.itemCode}</p>
                  {/* Show indicator if this is the current logged-in user */}
                  {getCurrentUser()?.usercode === selectedUser.itemCode && (
                    <p className="text-xs text-blue-600 mt-1">(Current User)</p>
                  )}
                </div>
                <Badge variant="outline" className="text-blue-600">Selected</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorization Management Panel - Below User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Form Authorizations
          </CardTitle>
          <CardDescription>
            {selectedUser 
              ? `Manage authorizations for ${selectedUser.itemDesc} (${selectedUser.itemCode})`
              : "Select a user to manage their authorizations"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-4">
              {/* Selected User Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedUser.itemDesc}</h3>
                    <p className="text-sm text-gray-600">
                      User Code: {selectedUser.itemCode}
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </div>

              <Separator />

              {/* Authorization Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Access</TableHead>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead>Form Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAuthorizations.map((auth) => (
                      <TableRow key={auth.Code}>
                        <TableCell>
                          <Checkbox
                          className={'cursor-pointer'}
                            checked={auth.Active === "Y"}
                            onCheckedChange={(checked) => handleAuthorizationToggle(auth.Code, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {auth.Code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{auth.Name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Access Summary
                    </p>
                    <p className="text-sm text-blue-700">
                      {userAuthorizations.filter(auth => auth.Active === "Y").length} of {userAuthorizations.length} forms authorized
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-900">
                      Last Updated
                    </p>
                    <p className="text-sm text-blue-700">
                      {formatCurrentDate()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No User Selected
              </h3>
              <p className="text-gray-600">
                Select a user from the dropdown to manage their form authorizations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Commented Out
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common authorization management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <UserPlus className="h-6 w-6 mb-2" />
              <span className="font-medium">Add New User</span>
              <span className="text-sm text-gray-600">Create new staff account</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Shield className="h-6 w-6 mb-2" />
              <span className="font-medium">Bulk Authorization</span>
              <span className="text-sm text-gray-600">Apply to multiple users</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center">
              <Save className="h-6 w-6 mb-2" />
              <span className="font-medium">Export Settings</span>
              <span className="text-sm text-gray-600">Download authorization report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      */}
    </div>
  );
};

export default UserAuthorization;