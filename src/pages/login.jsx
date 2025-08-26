import React, { use, useEffect, useState } from "react";
// import { useAuth } from "@/contexts/AuthContext";
import useAuth from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
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
import axios from "axios";


const Login = () => {
  let navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [salonOptions, setSalonOptions] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState({});
  const [salon, setSalon] = useState("");
  const [salonDetail, setSalonDetail] = useState(null);

  // Function to fetch user authorizations
  const fetchUserAuthorizations = async (userCode) => {
    try {
      const response = await apiService1.get(`api/getInventoryAuth?userCode=${userCode}`);
      if (response && response.result) {
        const authData = Array.isArray(response.result) ? response.result : [];
        return authData;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching user authorizations:", error);
      return [];
    }
  };

  useEffect(() => {
    console.log("salon", salon);
    // if (salon !== null) {
    //   handleSubmit();
    // }

    getSiteList();
  }, []);

  const getSiteList = async () => {
    try {
      const response = await axios.get(
        `${window.APP_CONFIG?.API_BASE_URL}/ItemSitelists`
      );

      setSalonDetail(response.data);
      const sites = response.data.map((item) => ({
        label: item.itemsiteDesc,
        value: item.itemsiteCode,
      }));
      setSalonOptions(sites);
    } catch (err) {
      toast.error(err.message || "sitesList failed");
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsLoading(true);

    if (!username || !password || !salon) {
      setIsLoading(false);
      toast.error("Please fill the fields");
      return;
    }

    const data = {
      userName: username,
      password: password,
      site: salon,
    };
    // const data = {
    //   salon: "1",
    //   username: "nick",
    //   password: "123123"
    // };

    try {
      const response = await apiService.login("api/webBI_Login", data);
      // const response = await apiService.login("login", data);

      // const sites = response.data.sites.map((item) => ({
      //   label: item.itemsite_desc,
      //   value: item.id,
      // }));

      console.log(response);
      console.log(selectedSalon, "sadet");

      if (response.success === "1") {
        // Fetch user authorizations
        const userAuthorizations = await fetchUserAuthorizations(username||response.userCode);
        
        const successData = {
          // emp_code: data.emp_code ?? "",
          username: username,
          usercode: response.userCode,
          isSettingEnabled: response.isSettingEnabled,
          isSettingViewCost: response.isSettingViewCost,
          isSettingViewPrice: response.isSettingViewPrice,
          isSettingPostedChangePrice: response.isSettingPostedChangePrice,
          // token: data.token,
          siteCode: selectedSalon.itemsiteCode,
          siteName: selectedSalon.itemsiteDesc,
          siteAddress: selectedSalon.itemsiteAddress,
          siteCity: selectedSalon.itemsiteCity,
          siteCountry: selectedSalon.itemsiteCountry,
          siteState: selectedSalon.itemsiteState,
          sitePostCode: selectedSalon.itemsitePostcode,
          sitePhone: selectedSalon.itemsitePhone1,
          // role: data.role,
        };

        // Store user authorizations in localStorage
        localStorage.setItem("userAuthorizations", JSON.stringify(userAuthorizations));

        // First update auth state
        const success = await loginSuccess(successData);
        // Then show toast
        // navigate("/dashboard");
        console.log("success", success);

        toast.success("Login successful!", {
          duration: 2000,
          onDismiss: () => {
            // Navigate after toast is shown
            success && navigate("/dashboard", { replace: true });
          },
        });
      } else if (response.success === "2") {
        toast.error("User Name and Password does not match");
        return;
      } else if (response.success === "3") {
        toast.error("Outlet Aecess Denied");
        return;
      } else if (response.success === "0") {
        toast.error(response.error);
      }
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeypress = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full">
      <div className="hidden lg:flex ml-[50px] items-center justify-content-center ">
        <img
          className="w-[520px] h-[520px] object-contain "
          src={blogo}
          alt="Logo"
        />
      </div>

      <div className="flex min-h-screen items-center justify-center p-8 -mt-60">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            {/* <div className="text-3xl font-bold">
              <img src={bslogo} alt="Logo" className="w-10 h-10" />
              <p className="text-[#4c8bf5]">Inventory</p>
            </div> */}
            <div className="flex justify-center mt-5">
              <img src={bslogo} alt="logo" className="w-72" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                className="h-12"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeypress(e)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {salonOptions && salonOptions.length > 0 && (
              <div className="space-y-2 w-full">
                <Label>Select Outlet</Label>
                <Select
                  placeholder="Select outlet"
                  value={salon}
                  onValueChange={(value) => {
                    setSalon(value);
                    const selectedOption = salonDetail.find(
                      (opt) => opt.itemsiteCode === value
                    );
                    if (selectedOption) {
                      setSelectedSalon(selectedOption);
                    }
                  }}
                >
                  <SelectTrigger
                    style={{ height: "48px", minHeight: "48px" }}
                    className="w-full"
                  >
                    <SelectValue placeholder="Select an outlet">
                      {salonOptions.find((opt) => opt.value === salon)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {salonOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg cursor-pointer" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
