import axios from "axios";
import { deleteCookie } from "@/utils/utils";
import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";
import { establishUserSession } from "@/auth/loginSession";

const URL_TOKEN_PARAM = "token";
const URL_REDIRECT_PARAM = "redirect";
const URL_MODULE_PARAM = "module";
const INBOUND_AUTH_STRIP_PARAMS = [
  URL_TOKEN_PARAM,
  URL_REDIRECT_PARAM,
  URL_MODULE_PARAM,
];
const USERLIST_ENDPOINT = "api/userlist";

export function sanitizeInternalRedirectPath(raw) {
  if (!raw?.trim()) return null;

  let path = raw.trim();
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path.startsWith("//") || path.includes("://")) {
    return null;
  }

  if (path === "/login") {
    return "/dashboard";
  }

  return path;
}

export function getInboundRedirectPath() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(URL_REDIRECT_PARAM) || params.get(URL_MODULE_PARAM);
  return sanitizeInternalRedirectPath(raw);
}

export function getUrlAuthToken() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get(URL_TOKEN_PARAM);
  return token?.trim() ? token.trim() : null;
}

/** Query-driven auth context from external apps (root `/?token=...` supported). */
export function getInboundAuthContext() {
  return {
    token: getUrlAuthToken(),
    redirectPath: getInboundRedirectPath(),
    pathname:
      typeof window !== "undefined" ? window.location.pathname : "/",
  };
}

export function stripInboundAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;

  INBOUND_AUTH_STRIP_PARAMS.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  if (!changed) return;

  const next =
    url.pathname + (url.search ? url.search : "") + (url.hash || "");
  window.history.replaceState({}, "", next);
}

/** @deprecated Use stripInboundAuthParamsFromUrl */
export function stripTokenFromUrl() {
  stripInboundAuthParamsFromUrl();
}

export function clearStoredAuth() {
  deleteCookie("token");
  localStorage.removeItem("userDetails");
  localStorage.removeItem("userAuthorizations");
  apiService.setToken(null);
  apiService1.setToken(null);
}

export async function fetchUserListWithToken(token) {
  const baseURL = window.APP_CONFIG?.API_BE_BASE_URL || "";
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${token}`,
    },
  });

  try {
    const response = await client.get(USERLIST_ENDPOINT);
    return response.data;
  } catch (error) {
    const apiMessage =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.response?.data;
    const message =
      typeof apiMessage === "string"
        ? apiMessage
        : error?.message || "Invalid or expired access token";
    throw new Error(message);
  }
}

export async function authenticateFromUrlToken(token, loginSuccess) {
  const response = await fetchUserListWithToken(token);

  return establishUserSession({
    loginSuccess,
    response,
    token,
  });
}
