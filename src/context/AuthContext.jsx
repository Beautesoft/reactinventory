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
    console.log("useEffect called");
    const initializeAuth = () => {
      const token = getCookie("token");
      // const savedSalon = localStorage.getItem("selectedSalon");

      if (token) {
        setState((prev) => ({
          ...prev,
          // user: { token },
          isAuthenticated: true,
          salon: "",
          token,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    initializeAuth();
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
      const generatedToken = btoa(`${data.username}:${data.siteCode}:${Date.now()}`);
  
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        loginDetails: data,
        token: generatedToken,
      }));
  
      const userDetails = {
        username: data.username,
        token: generatedToken,
        siteCode: data.siteCode,
        siteName: data.siteName,
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
