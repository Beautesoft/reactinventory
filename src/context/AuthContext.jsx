import { createContext, useContext, useEffect, useState } from "react";
import { deleteCookie, getCookie, setCookie } from "@/utils/utils";
import { toast } from "sonner";
import apiService from "@/services/apiService";
import { Toaster } from "@/components/ui/sonner";
// Create the context
export const AuthContext = createContext(null);

// Custom hook for using auth context
// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    salon: [],
    loginDetails: null,
  });
  // const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = getCookie("token");
        const userDetails = localStorage.getItem("userDetails");

        console.log("🔐 Auth Init - Token:", !!token, "UserDetails:", !!userDetails);

        if (token && userDetails) {
          // Both token and user details exist - user is authenticated
          console.log("✅ User authenticated");
          setState((prev) => ({
            ...prev,
            isAuthenticated: true,
            token,
            isLoading: false,
          }));
        } else if (token && !userDetails) {
          // Token exists but no user details - clear token and redirect to login
          console.log("⚠️ Token exists but no user details - clearing token");
          deleteCookie("token");
          setState((prev) => ({
            ...prev,
            isAuthenticated: false,
            token: null,
            isLoading: false,
          }));
        } else {
          // No token - user is not authenticated
          console.log("❌ No authentication found");
          setState((prev) => ({
            ...prev,
            isAuthenticated: false,
            token: null,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error("🚨 Auth initialization error:", error);
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          token: null,
          isLoading: false,
        }));
      }
    };

    // Small delay to ensure localStorage is available
    const timer = setTimeout(initializeAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  // const login = async (credentials) => {
  //   try {
  //     setState((prev) => ({ ...prev, isLoading: true }));

  //     console.log("login", credentials);
  //     // Your API call here
  //     const response = await apiService.login("/login", credentials);
  //     console.log(response, "response");
  //     setState({
  //       user: { token },
  //       isAuthenticated: true,
  //       isLoading: false,
  //       salon: response.data.sites,
  //     });

  //     toast.success("Login successful!");
  //   } catch (error) {
  //     toast.error(error.message || "Login failed");
  //     setState((prev) => ({
  //       ...prev,
  //       isLoading: false,
  //     }));
  //     throw error;
  //   }
  // };

  // const loginSuccess = async (data) => {
  //   try {
  //     setState((prev) => ({
  //       ...prev,
  //       isAuthenticated: true,
  //       loginDetails: data,
  //       token: data.token,
  //     }));

  //     const userDetails = {
  //       emp_code: data.emp_code??'',
  //       username: data.username,
  //       token: data.token,
  //       siteCode: data.branch,
  //       siteName: data.salon,
  //       role: data.role,
  //       // backendauthorization: data.backendauthorization,
  //     };

  //     // Set local storage items
  //     // localStorage.setItem("userId", data.emp_code);
  //     // localStorage.setItem("username", data.username);
  //     localStorage.setItem("userDetails", JSON.stringify(userDetails));

  //     // Set cookie
  //     setCookie("token", data.token);

  //     return true; // Resolve with true on success
  //   } catch (error) {
  //     console.error("Login success error:", error);
  //     return false; // Resolve with false on error
  //   }
  // };

  const loginSuccess = async (data) => {
    try {
      // Generate a simple token from user data
      const generatedToken = btoa(
        `${data.username}:${data.siteCode}:${Date.now()}`
      );

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        loginDetails: data,
        token: generatedToken,
      }));

      const userDetails = {
        // username: data.username,
        token: generatedToken,
        ...data,
        // siteCode: data.siteCode,
        // siteName: data.siteName,
      };

      // Store in localStorage
      localStorage.setItem("userDetails", JSON.stringify(userDetails));

      // Set cookie
      setCookie("token", generatedToken);

      return true;
    } catch (error) {
      console.error("Login success error:", error);
      return false;
    }
  };
  const logout = () => {
    try {
      deleteCookie("token");
      // localStorage.removeItem("userId");
      localStorage.removeItem("userDetails");
      localStorage.removeItem("userAuthorizations"); // Clear user authorizations
      window.location.href = "/login"; // Redirect to login page

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        salon: null,
      });

      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error during logout");
      console.error("Logout error:", error);
    }
  };

  const value = {
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    salon: state.salon,
    setState,
    setToken: (token) => setState({ ...state, token }),
    logout,
    loginSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
