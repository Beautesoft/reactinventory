import { useEffect } from "react";
import { getCookie } from "../utils/utils";
import useAuth from "@/hooks/useAuth";

export const AuthInitializer = ({ children }) => {
  const { setState } = useAuth();

  useEffect(() => {
    const initAuth = () => {
      const token = getCookie("token");
      if (token) {
        setState((prev) => ({
          ...prev,
          user: { token },
          isAuthenticated: true,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    initAuth();
  }, [setState]);

  return children;
};