import { createContext, useState } from "react";
import { deleteCookie, getCookie, setCookie } from "@/utils/utils";
import { toast } from "sonner";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
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

function readAuthStateFromStorage() {
  try {
    const token = getCookie("token");
    const userDetails = localStorage.getItem("userDetails");

    if (token && userDetails) {
      return {
        user: null,
        token,
        isAuthenticated: true,
        isLoading: false,
        salon: [],
        loginDetails: null,
      };
    }

    if (token && !userDetails) {
      deleteCookie("token");
      apiService.setToken(null);
      apiService1.setToken(null);
    }

    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      salon: [],
      loginDetails: null,
    };
  } catch (error) {
    console.error("Auth initialization error:", error);
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      salon: [],
      loginDetails: null,
    };
  }
}

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState(readAuthStateFromStorage);

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
      const token =
        data.token ||
        btoa(`${data.username}:${data.siteCode}:${Date.now()}`);

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        loginDetails: data,
        token,
      }));

      const userDetails = {
        token,
        ...data,
      };

      localStorage.setItem("userDetails", JSON.stringify(userDetails));
      setCookie("token", token);
      apiService.setToken(token);

      return true;
    } catch (error) {
      console.error("Login success error:", error);
      return false;
    }
  };
  const logout = () => {
    try {
      deleteCookie("token");
      localStorage.removeItem("userDetails");
      localStorage.removeItem("userAuthorizations");
      apiService.setToken(null);
      apiService1.setToken(null);
      // Full navigation only — avoid setState/navigate here (causes login flash + double load)
      window.location.replace("/login");
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
