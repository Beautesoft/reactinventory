import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useAuth from "@/hooks/useAuth";
import {
  authenticateFromUrlToken,
  clearStoredAuth,
  getInboundAuthContext,
  stripInboundAuthParamsFromUrl,
} from "@/auth/urlTokenAuth";

/**
 * Verifies inbound `?token=` (any route, typically `/`) via /userlist before routing.
 */
export default function UrlTokenAuthBootstrap({ children }) {
  const navigate = useNavigate();
  const { loginSuccess, setState } = useAuth();
  const verifyStartedRef = useRef(false);

  useEffect(() => {
    const { token: urlToken, redirectPath, pathname } = getInboundAuthContext();
    if (!urlToken || verifyStartedRef.current) {
      return;
    }
    verifyStartedRef.current = true;

    let cancelled = false;

    const run = async () => {
      clearStoredAuth();
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: true,
        token: null,
      }));

      try {
        await authenticateFromUrlToken(urlToken, loginSuccess);
        if (cancelled) return;

        stripInboundAuthParamsFromUrl();

        if (redirectPath) {
          navigate(redirectPath, { replace: true });
          return;
        }

        if (pathname === "/login") {
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("URL token authentication failed:", error);
        clearStoredAuth();
        stripInboundAuthParamsFromUrl();
        toast.error(
          error?.message || "Could not verify your access link. Please sign in."
        );
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
          token: null,
        }));
        navigate("/login", { replace: true });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [loginSuccess, navigate, setState]);

  return children;
}
