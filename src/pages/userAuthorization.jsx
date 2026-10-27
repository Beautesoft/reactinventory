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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, UserPlus, Save, Search, Check } from "lucide-react";
import { toast } from "sonner";
import apiService1 from "@/services/apiService1";
import { resolveExpiryNotifyMonths } from "@/auth/loginSession";

function readStoredExpiryNotifyMonths() {
  try {
    const stored = JSON.parse(localStorage.getItem("userDetails") || "{}");
    return String(
      resolveExpiryNotifyMonths(
        stored.expirynotifymonths ?? stored.expiryNotifyMonths
      )
    );
  } catch {
    return String(resolveExpiryNotifyMonths(undefined));
  }
}

const UserAuthorization = () => {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [selectAllConfirm, setSelectAllConfirm] = useState(null);
  const [notifyMonths, setNotifyMonths] = useState(readStoredExpiryNotifyMonths);
  const [savedNotifyMonths, setSavedNotifyMonths] = useState(notifyMonths);
  const [savingNotify, setSavingNotify] = useState(false);
  const [notifyConfirmMonths, setNotifyConfirmMonths] = useState(null);

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
    }
  };

  // Filter function: show all forms except excluded (to be released later)
  const filterRequiredForms = (authData) => {
    const excludedFormCodes = ["F10006", "F10007", "F10013","F10008"];
    return authData.filter(auth => !excludedFormCodes.includes(auth.Code));
  };

  // Fetch user authorizations
  const fetchUserAuthorizations = async (userCode) => {
    try {
      const response = await apiService1.get(`api/getInventoryAuth?userCode=${userCode}`);
      if (response && response.result) {
        // Transform DataTable response to array format
        const authData = Array.isArray(response.result) ? response.result : [];
        // Filter to show only required forms
        const filteredData = filterRequiredForms(authData);
        setUserAuthorizations(filteredData);
        return filteredData; // Return the filtered data for localStorage update
      } else {
        setUserAuthorizations([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching user authorizations:", error);
      toast.error("Failed to fetch user authorizations");
      // Mock data for demonstration - Only showing required forms
      const mockData = [
        { Code: "F10001", Name: "Goods Receive Note List", Active: "Y" },
        { Code: "F10002", Name: "Goods Transfer Out List", Active: "N" },
        { Code: "F10003", Name: "Goods Transfer In List", Active: "Y" },
        { Code: "F10004", Name: "Goods Return List", Active: "N" },
        { Code: "F10009", Name: "Stock Balance", Active: "Y" },
        { Code: "F10011", Name: "Stock Movement - Detail", Active: "Y" },
        // Commented out other forms for now
        { Code: "F10005", Name: "Stock Adjustment List", Active: "Y" },
        // { Code: "F10006", Name: "Purchase Order List", Active: "N" },
        // { Code: "F10007", Name: "Approved PO List", Active: "Y" },
        // { Code: "F10008", Name: "Purchase Order Approval", Active: "N" },
        // { Code: "F10010", Name: "Stock Usage Memo List", Active: "N" },
      ];
      setUserAuthorizations(mockData);
      return mockData;
    }
  };

  const handleUserSelect = (userCode) => {
    const user = userList.find((u) => u.itemCode === userCode);
    if (!user) return;
    setSelectAllConfirm(null);
    setSelectedUser(user);
    fetchUserAuthorizations(userCode);
  };

  const searchText = userSearch.trim().toLowerCase();
  const filteredUsers = searchText
    ? userList.filter((user) => {
        const name = String(user.itemDesc || "").toLowerCase();
        const code = String(user.itemCode || "").toLowerCase();
        return name.includes(searchText) || code.includes(searchText);
      })
    : userList;

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

  const authorizedCount = userAuthorizations.filter((auth) => auth.Active === "Y").length;
  const totalAuthForms = userAuthorizations.length;
  const selectAllChecked =
    totalAuthForms > 0 && authorizedCount === totalAuthForms
      ? true
      : authorizedCount > 0
        ? "indeterminate"
        : false;

  const handleSelectAllToggle = (checked) => {
    if (!selectedUser || savingAll || selectAllConfirm) {
      if (!selectedUser) toast.error("Please select a user first");
      return;
    }

    const active = checked === true ? "Y" : "N";
    const count = userAuthorizations.filter((auth) => auth.Active !== active).length;
    if (count === 0) return;

    setSelectAllConfirm({
      active,
      userCode: selectedUser.itemCode,
      userName: selectedUser.itemDesc,
      count,
    });
  };

  // Check or clear every form for the selected user. Only rows that change are saved.
  const applySelectAll = async (pendingConfirm) => {
    if (!pendingConfirm || savingAll) return;
    if (!selectedUser || selectedUser.itemCode !== pendingConfirm.userCode) {
      toast.error("Select the user again before changing access");
      return;
    }

    const active = pendingConfirm.active;
    const previous = userAuthorizations;
    const pending = previous.filter((auth) => auth.Active !== active);
    if (pending.length === 0) return;

    setSavingAll(true);
    try {
      setUserAuthorizations((prev) => prev.map((auth) => ({ ...auth, Active: active })));

      const results = await Promise.allSettled(
        pending.map((auth) => saveAuthorization(selectedUser.itemCode, auth.Code, active))
      );
      const failed = new Set(
        pending
          .filter((_, index) => results[index].status === "rejected")
          .map((auth) => auth.Code)
      );

      if (failed.size > 0) {
        setUserAuthorizations((prev) =>
          prev.map((auth) => {
            if (!failed.has(auth.Code)) return auth;
            const prior = previous.find((item) => item.Code === auth.Code);
            return prior ? { ...auth, Active: prior.Active } : auth;
          })
        );
        toast.error(
          failed.size === pending.length
            ? "Failed to update authorizations"
            : `Failed to update ${failed.size} of ${pending.length} forms`
        );
      } else {
        const isCurrentUser = getCurrentUser()?.username === selectedUser.itemCode;
        toast.success(
          isCurrentUser
            ? "All authorizations updated. Please logout and login again for changes to take effect."
            : "All authorizations updated."
        );
      }
    } finally {
      setSavingAll(false);
    }
  };

  // Handle authorization toggle with real-time saving
  const handleAuthorizationToggle = async (code, checked) => {
    if (!selectedUser || savingAll) {
      if (!selectedUser) toast.error("Please select a user first");
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
      const isCurrentUser = getCurrentUser()?.username === selectedUser.itemCode;
      toast.success(
        isCurrentUser
          ? "Authorization updated successfully. Please logout and login again for changes to take effect."
          : "Authorization updated successfully."
      );
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

  const requestExpiryNotifyUpdate = (rawValue) => {
    const months = Number.parseInt(String(rawValue).trim(), 10);
    if (!Number.isFinite(months) || months <= 0) {
      toast.error("Enter a whole number of months greater than 0");
      setNotifyMonths(savedNotifyMonths);
      return;
    }

    const nextValue = String(months);
    setNotifyMonths(nextValue);
    if (nextValue === savedNotifyMonths) {
      toast.info("Expiry notify months is already " + nextValue);
      return;
    }

    setNotifyConfirmMonths(months);
  };

  const saveExpiryNotifyMonths = async (months) => {
    if (!Number.isFinite(months) || months <= 0 || savingNotify) return;

    const nextValue = String(months);
    setSavingNotify(true);
    try {
      const response = await apiService1.post("api/systemsetup/update/", {
        title: "expirynotifymonths",
        value_name: "expirynotifymonths",
        value_data: months,
      });
      if (
        response &&
        (response.success === "0" || response.success === 0 || response.error === true)
      ) {
        throw new Error(response.message || "Failed to update expiry notify months");
      }

      const stored = JSON.parse(localStorage.getItem("userDetails") || "{}");
      stored.expiryNotifyMonths = months;
      stored.expirynotifymonths = months;
      localStorage.setItem("userDetails", JSON.stringify(stored));
      setSavedNotifyMonths(nextValue);
      toast.success("Expiry notify months updated");
    } catch (error) {
      console.error("Error updating expiry notify months:", error);
      toast.error("Failed to update expiry notify months");
      setNotifyMonths(savedNotifyMonths);
    } finally {
      setSavingNotify(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Authorization</h1>
        <p className="text-gray-600 mt-2">Manage user access to system forms and features</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-sm font-semibold text-gray-900">Notify setting:</span>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>Anything expiring within</span>
          <Input
            id="expiry-notify-months"
            type="number"
            min={1}
            inputMode="numeric"
            aria-label="Months before expiry to notify"
            className="h-9 w-16 border-gray-200 bg-gray-50 text-center text-base font-semibold text-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={notifyMonths}
            disabled={savingNotify}
            onChange={(e) => setNotifyMonths(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                requestExpiryNotifyUpdate(e.currentTarget.value);
              }
            }}
          />
          <span>months</span>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => requestExpiryNotifyUpdate(notifyMonths)}
          disabled={savingNotify}
          className="cursor-pointer px-4"
        >
          Update
        </Button>
      </div>

      {/* User Selection Panel - Top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Selection
          </CardTitle>
          <CardDescription>
            Type a name or user code to search, then click a user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-search">Search user</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                id="user-search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Type to search by name or user code"
                className="pl-10"
                autoComplete="off"
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {filteredUsers.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No users match your search</p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUser?.itemCode === user.itemCode;
                  return (
                    <button
                      key={user.itemCode}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleUserSelect(user.itemCode)}
                      className={`flex w-full cursor-pointer items-center justify-between border-l-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        isSelected
                          ? "border-l-blue-600 bg-blue-50 font-medium text-blue-900"
                          : "border-l-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                        ) : null}
                        <span>{user.itemDesc}</span>
                        {getCurrentUser()?.username === user.itemCode ? (
                          <span className="text-xs font-normal text-blue-600">Current user</span>
                        ) : null}
                      </span>
                      <span className={`text-xs ${isSelected ? "text-blue-700" : "text-gray-500"}`}>
                        {user.itemCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
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
              {/* Authorization Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            aria-label="Toggle all access"
                            className="cursor-pointer"
                            checked={selectAllChecked}
                            disabled={savingAll || totalAuthForms === 0}
                            onCheckedChange={handleSelectAllToggle}
                          />
                          <span>Access</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead>Form Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userAuthorizations.map((auth) => (
                      <TableRow key={auth.Code}>
                        <TableCell>
                          <Checkbox
                            className="cursor-pointer"
                            checked={auth.Active === "Y"}
                            disabled={savingAll}
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
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Access Summary
                  </p>
                  <p className="text-sm text-blue-700">
                    {userAuthorizations.filter(auth => auth.Active === "Y").length} of {userAuthorizations.length} forms authorized
                  </p>
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
                Search and select a user above to manage their form authorizations
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

      <AlertDialog
        open={notifyConfirmMonths != null}
        onOpenChange={(open) => {
          if (!open && !savingNotify) setNotifyConfirmMonths(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update expiry notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything expiring within {notifyConfirmMonths} month
              {notifyConfirmMonths === 1 ? "" : "s"} will be included in the notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingNotify}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={savingNotify}
              onClick={(event) => {
                event.preventDefault();
                const months = notifyConfirmMonths;
                saveExpiryNotifyMonths(months).finally(() => setNotifyConfirmMonths(null));
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!selectAllConfirm}
        onOpenChange={(open) => {
          if (!open) setSelectAllConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectAllConfirm?.active === "Y" ? "Enable all access?" : "Disable all access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectAllConfirm?.active === "Y"
                ? `Turn on access for ${selectAllConfirm?.count} form${selectAllConfirm?.count === 1 ? "" : "s"} for ${selectAllConfirm?.userName}.`
                : `Turn off access for ${selectAllConfirm?.count} form${selectAllConfirm?.count === 1 ? "" : "s"} for ${selectAllConfirm?.userName}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const pending = selectAllConfirm;
                setSelectAllConfirm(null);
                applySelectAll(pending);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserAuthorization;