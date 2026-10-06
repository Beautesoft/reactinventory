import React, { useEffect, useRef, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import blogo from "@/assets/beatesoftlogo1.png";
import bslogo from "@/assets/companylogo.png";

import { useNavigate } from "react-router-dom";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import VersionStamp from "@/components/VersionStamp";

function normalizeLoginSite(site) {
  return {
    id: site.id,
    itemsiteCode:
      site.itemsite_code ??
      site.itemsiteCode ??
      site.siteCode ??
      String(site.id ?? ""),
    itemsiteDesc:
      site.itemsite_desc ?? site.itemsiteDesc ?? site.siteDesc ?? "",
    itemsiteAddress:
      site.itemsite_address ??
      site.itemsiteAddress ??
      site.location_addr ??
      "",
    itemsiteCity: site.itemsite_city ?? site.itemsiteCity ?? "",
    itemsiteCountry:
      site.itemsite_country ?? site.itemsiteCountry ?? "",
    itemsiteState: site.itemsite_state ?? site.itemsiteState ?? "",
    itemsitePostcode:
      site.itemsite_postcode ?? site.itemsitePostcode ?? "",
    itemsitePhone1: site.itemsite_phone1 ?? site.itemsitePhone1 ?? "",
    locationName: site.location_name ?? site.locationName ?? "",
  };
}

function parseLoginResponse(response) {
  const root = response ?? {};
  const data = root.data ?? root;
  const sites = data.sites ?? root.sites ?? [];

  return {
    data,
    sites: Array.isArray(sites) ? sites : [],
    success: root.success ?? data.success,
    status: root.status,
    statusText: root.statusText ?? data.statusText,
    message: root.message,
    error: root.error,
  };
}

function isLoginSuccessful(response, parsed) {
  const { data, success, status, message, error } = parsed;

  if (success === "1") return true;
  if (success === "2" || success === "3" || success === "0") return false;

  if (status === 200 && error === false && data?.token) return true;
  if (message === "Login Successful" && data?.token) return true;

  return false;
}

function extractLoginPayload(response, parsed) {
  const data = parsed.data ?? {};
  const inventory = data.inventory ?? {};

  return {
    username: data.username ?? response.username ?? "",
    userCode: inventory.userCode ?? data.userCode ?? response.userCode ?? "",
    token: data.token ?? response.token ?? "",
    branch: data.branch ?? response.branch ?? "",
    role: data.role ?? response.role ?? "",
    salon: data.salon ?? response.salon ?? "",
    currency: data.currency ?? response.currency ?? "",
    sessionId: data.session_id ?? data.sessionId ?? "",
    isSettingEnabled:
      inventory.isSettingEnabled ?? response.isSettingEnabled,
    isSettingViewCost:
      inventory.isSettingViewCost ?? response.isSettingViewCost,
    isSettingViewPrice:
      inventory.isSettingViewPrice ?? response.isSettingViewPrice,
    isSettingPostedChangePrice:
      inventory.isSettingPostedChangePrice ??
      response.isSettingPostedChangePrice,
    batchNo: inventory.batchNo ?? response.batchNo,
    expiryDate: inventory.expiryDate ?? response.expiryDate,
    manualBatchSelection:
      inventory.manualBatchSelection ?? response.manualBatchSelection,
    batchSNo: inventory.batchSNo ?? response.batchSNo,
    defaultExpiryDays:
      inventory.defaultExpiryDays ?? response.defaultExpiryDays,
    autoPost: inventory.autoPost ?? response.autoPost,
    prUseDeliveryOrder:
      inventory.prUseDeliveryOrder ?? response.prUseDeliveryOrder,
    HQSiteCode: inventory.HQSiteCode ?? response.HQSiteCode,
  };
}

const Login = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [salonOptions, setSalonOptions] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [salon, setSalon] = useState(null);
  const [salonDetail, setSalonDetail] = useState([]);
  const [loginPhase, setLoginPhase] = useState("credentials");
  const isSubmittingRef = useRef(false);

  const fetchUserAuthorizations = async (userCode) => {
    try {
      const response = await apiService1.get(
        `api/getInventoryAuth?userCode=${userCode}`
      );
      if (response && response.result) {
        return Array.isArray(response.result) ? response.result : [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching user authorizations:", error);
      return [];
    }
  };

  const fetchActiveCurrency = async () => {
    try {
      const filter = {
        where: {
          currencyIsActive: true,
        },
      };
      const query = `?filter=${encodeURIComponent(JSON.stringify(filter))}`;
      const response = await apiService.get(`CurrencyTables${query}`);

      if (response && response.length > 0) {
        return {
          currencyCode: response[0].currencyCode,
          currencyName: response[0].currencyName,
          currencyRate: response[0].currencyRate,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching active currency:", error);
      return null;
    }
  };

  const resetOutletSelection = () => {
    setLoginPhase("credentials");
    setSalon(null);
    setSalonOptions([]);
    setSalonDetail([]);
    setSelectedSalon(null);
  };

  const applySitesFromResponse = (sites) => {
    const normalized = sites.map(normalizeLoginSite);
    setSalonDetail(normalized);
    setSalonOptions(
      normalized.map((site) => ({
        label: site.itemsiteDesc,
        value: site.id,
      }))
    );
    setLoginPhase("selectOutlet");

    if (normalized.length === 1) {
      setSelectedSalon(normalized[0]);
      setSalon(normalized[0].id);
    }
  };

  const completeLogin = async (response, parsed, outlet) => {
    const payload = extractLoginPayload(response, parsed);

    const [userAuthorizations, currencyData] = await Promise.all([
      fetchUserAuthorizations(username || payload.userCode),
      fetchActiveCurrency(),
    ]);

    const successData = {
      username: payload.username || username,
      usercode: payload.userCode,
      token: payload.token,
      role: payload.role,
      branch: payload.branch,
      sessionId: payload.sessionId,
      isSettingEnabled: payload.isSettingEnabled,
      isSettingViewCost: payload.isSettingViewCost,
      isSettingViewPrice: payload.isSettingViewPrice,
      isSettingPostedChangePrice: payload.isSettingPostedChangePrice,
      batchNo: payload.batchNo,
      expiryDate: payload.expiryDate,
      manualBatchSelection: payload.manualBatchSelection,
      batchSNo: payload.batchSNo,
      defaultExpiryDays: payload.defaultExpiryDays,
      autoPost: payload.autoPost,
      prUseDeliveryOrder: payload.prUseDeliveryOrder,
      HQSiteCode: payload.HQSiteCode,
      siteCode: outlet?.itemsiteCode ?? payload.branch ?? "",
      siteName: outlet?.itemsiteDesc ?? payload.salon ?? "",
      siteAddress: outlet?.itemsiteAddress ?? "",
      siteCity: outlet?.itemsiteCity ?? "",
      siteCountry: outlet?.itemsiteCountry ?? "",
      siteState: outlet?.itemsiteState ?? "",
      sitePostCode: outlet?.itemsitePostcode ?? "",
      sitePhone: outlet?.itemsitePhone1 ?? "",
      currencyCode: currencyData?.currencyCode || payload.currency || "$",
      currencyName: currencyData?.currencyName || payload.currency || "USD",
      currencyRate: currencyData?.currencyRate || 1,
    };

    localStorage.setItem(
      "userAuthorizations",
      JSON.stringify(userAuthorizations)
    );

    const success = await loginSuccess(successData);

    toast.success("Login successful!", {
      duration: 2000,
      onDismiss: () => {
        success && navigate("/dashboard", { replace: true });
      },
    });
  };

  const handleLoginError = (response, parsed) => {
    if (parsed.success === "2") {
      toast.error("User Name and Password does not match");
      return true;
    }
    if (parsed.success === "3") {
      toast.error("Outlet Access Denied");
      return true;
    }
    if (parsed.success === "0") {
      toast.error(parsed.error || response.error || "Login failed");
      return true;
    }
    if (parsed.error === true || (parsed.status && parsed.status !== 200)) {
      toast.error(parsed.message || "Login failed");
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (isSubmittingRef.current) return;

    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    const isOutletStep = loginPhase === "selectOutlet" && salon != null && salon !== 0;

    if (loginPhase === "selectOutlet" && !isOutletStep) {
      toast.error("Please select an outlet");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    const data = {
      username,
      password,
      salon: isOutletStep ? salon : 0,
      account_locked: 0,
      mobileAppointment: false,
    };

    try {
      const response = await apiService.login("api/login", data);
      const parsed = parseLoginResponse(response);

      if (!isOutletStep) {
        const hasSites = parsed.sites.length > 0;
        const isOkStatus =
          parsed.statusText === "ok" ||
          parsed.statusText === "OK" ||
          parsed.status === 200 ||
          parsed.message === "Login Successful";

        if (hasSites && isOkStatus) {
          applySitesFromResponse(parsed.sites);
          return;
        }

        if (handleLoginError(response, parsed)) {
          resetOutletSelection();
          return;
        }

        if (parsed.statusText && !isOkStatus) {
          toast.error("Login failed");
          resetOutletSelection();
          return;
        }

        toast.error("No outlets available for this user");
        resetOutletSelection();
        return;
      }

      if (isLoginSuccessful(response, parsed)) {
        await completeLogin(response, parsed, selectedSalon);
        return;
      }

      if (handleLoginError(response, parsed)) {
        return;
      }

      toast.error(parsed.message || parsed.error || "Login failed");
    } catch (error) {
      const message =
        error?.response?.data?.message ?? error.message ?? "Login failed";
      toast.error(message);
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loginPhase === "selectOutlet" && salon != null && salon !== 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon, loginPhase]);

  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="hidden lg:flex ml-[50px] items-center justify-center bg-white/50">
        <img
          className="w-[520px] h-[520px] object-contain drop-shadow-lg"
          src={blogo}
          alt="Logo"
        />
      </div>

      <div className="flex min-h-screen items-center justify-center px-8 pt-12 pb-16 bg-white/30 lg:border-l lg:border-slate-200/60">
        <div className="w-full max-w-lg space-y-8 rounded-2xl bg-white/90 px-8 py-10 shadow-lg shadow-slate-200/50 border border-slate-200/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="flex justify-center">
              <img src={bslogo} alt="logo" className="w-72 drop-shadow-md" />
            </div>
            <p className="mt-4 text-slate-500 text-sm font-medium">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                className="h-12"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  resetOutletSelection();
                }}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  className="h-12"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    resetOutletSelection();
                  }}
                  onKeyDown={(e) => handleKeypress(e)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {loginPhase === "selectOutlet" && salonOptions.length > 0 && (
              <div className="space-y-2 w-full">
                <Label>Select Outlet</Label>
                <Select
                  value={salon != null ? String(salon) : ""}
                  onValueChange={(value) => {
                    const id = Number(value);
                    setSalon(id);
                    const selectedOption = salonDetail.find(
                      (opt) => opt.id === id
                    );
                    if (selectedOption) {
                      setSelectedSalon(selectedOption);
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    style={{ height: "48px", minHeight: "48px" }}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select an outlet">
                      {
                        salonOptions.find((opt) => opt.value === salon)
                          ?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {salonOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg cursor-pointer transition-all hover:shadow-md"
              disabled={isLoading || loginPhase === "selectOutlet"}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loginPhase === "selectOutlet"
                    ? "Signing in..."
                    : "Logging in..."}
                </span>
              ) : loginPhase === "selectOutlet" ? (
                "Select an outlet to continue"
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <VersionStamp />
        </div>
      </div>
    </div>
  );
};

export default Login;
