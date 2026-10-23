import apiService from "@/services/apiService";
import apiService1 from "@/services/apiService1";

export function normalizeLoginSite(site) {
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
    itemsiteCountry: site.itemsite_country ?? site.itemsiteCountry ?? "",
    itemsiteState: site.itemsite_state ?? site.itemsiteState ?? "",
    itemsitePostcode:
      site.itemsite_postcode ?? site.itemsitePostcode ?? "",
    itemsitePhone1: site.itemsite_phone1 ?? site.itemsitePhone1 ?? "",
    locationName: site.location_name ?? site.locationName ?? "",
  };
}

function getAuthSiteList(data, root) {
  const sites =
    data.sites ??
    data.switch_sites ??
    root.sites ??
    root.switch_sites ??
    [];
  return Array.isArray(sites) ? sites : [];
}

export function parseAuthApiResponse(response) {
  const root = response ?? {};
  const data = root.data ?? root;
  const sites = getAuthSiteList(data, root);

  return {
    data,
    sites,
    loginedSiteId:
      data.logined_siteid ??
      data.loginedSiteId ??
      root.logined_siteid ??
      root.loginedSiteId,
    siteCode:
      data.site_code ?? data.siteCode ?? root.site_code ?? root.siteCode ?? "",
    success: root.success ?? data.success,
    status: root.status,
    statusText: root.statusText ?? data.statusText,
    message: root.message,
    error: root.error,
  };
}

export function isAuthVerificationSuccessful(response, parsed) {
  const { data, success, status, message, error } = parsed;

  if (success === "1") return true;
  if (success === "2" || success === "3" || success === "0") return false;

  if (status === 200 && error === false && data?.token) return true;
  if (message === "Login Successful" && data?.token) return true;

  // userlist may return user profile without repeating token in body
  if (status === 200 && error === false && (data?.username || data?.userCode)) {
    return true;
  }
  if (error === false && (data?.username || data?.inventory?.userCode)) {
    return true;
  }

  return false;
}

export function extractLoginPayload(response, parsed) {
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
      inventory.prUseDeliveryOrder ??
      response.prUseDeliveryOrder ??
      "False",
    HQSiteCode:
      inventory.HQSiteCode ??
      data.controlsite ??
      response.controlsite ??
      response.HQSiteCode,
    siteCode:
      data.site_code ??
      data.siteCode ??
      response.site_code ??
      response.siteCode ??
      "",
    sitePhone: data.sitePhone ?? response.sitePhone ?? "",
  };
}

function pickRawAuthSite(sites, loginedSiteId, siteCode) {
  if (!sites.length) return null;

  if (loginedSiteId != null && loginedSiteId !== "") {
    const byId = sites.find((site) => String(site.id) === String(loginedSiteId));
    if (byId) return byId;
  }

  if (siteCode) {
    const byCode = sites.find((site) => {
      const code =
        site.itemsite_code ?? site.itemsiteCode ?? site.siteCode ?? "";
      return code === siteCode;
    });
    if (byCode) return byCode;
  }

  return sites[0];
}

export function outletFromAuthData(parsed, payload) {
  const data = parsed.data ?? {};

  if (data.site && (data.site.itemsiteCode || data.site.itemsite_code)) {
    return normalizeLoginSite(data.site);
  }

  if (data.outlet) {
    return normalizeLoginSite(data.outlet);
  }

  const sites = parsed.sites ?? [];
  const siteCode = parsed.siteCode || payload.siteCode || "";
  const rawSite = pickRawAuthSite(sites, parsed.loginedSiteId, siteCode);

  if (rawSite) {
    return normalizeLoginSite(rawSite);
  }

  const branchLabel = payload.branch || data.branch || "";
  const resolvedCode = siteCode || "";
  const siteName =
    payload.salon ||
    data.salon ||
    (branchLabel && branchLabel !== resolvedCode ? branchLabel : "");

  return {
    itemsiteCode: resolvedCode,
    itemsiteDesc: siteName,
    itemsiteAddress:
      data.siteAddress ?? data.site_address ?? data.location_addr ?? "",
    itemsiteCity: data.siteCity ?? data.site_city ?? "",
    itemsiteCountry: data.siteCountry ?? data.site_country ?? "",
    itemsiteState: data.siteState ?? data.site_state ?? "",
    itemsitePostcode:
      data.sitePostcode ?? data.site_postcode ?? data.sitePostCode ?? "",
    itemsitePhone1:
      payload.sitePhone ?? data.sitePhone ?? data.site_phone ?? "",
  };
}

export async function fetchUserAuthorizations(userCode) {
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
}

export async function fetchActiveCurrency() {
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
}

export function buildSessionUserDetails(
  payload,
  outlet,
  currencyData,
  tokenOverride,
  usernameFallback = ""
) {
  const token = tokenOverride || payload.token;
  const siteCode =
    outlet?.itemsiteCode || payload.siteCode || payload.branch || "";
  const siteName =
    outlet?.itemsiteDesc ||
    payload.salon ||
    (payload.branch && payload.branch !== siteCode ? payload.branch : "") ||
    "";

  return {
    username: payload.username || usernameFallback,
    usercode: payload.userCode,
    token,
    role: payload.role,
    branch: siteCode,
    sessionId: payload.sessionId,
    isSettingEnabled: payload.isSettingEnabled,
    isSettingViewCost: payload.isSettingViewCost,
    isSettingViewPrice: payload.isSettingViewPrice,
    isSettingPostedChangePrice: payload.isSettingPostedChangePrice,
    batchNo: payload.batchNo,
    expiryDate: payload.batchNo === "True" ? "True" : payload.expiryDate,
    manualBatchSelection: payload.manualBatchSelection,
    batchSNo: payload.batchSNo,
    defaultExpiryDays: payload.defaultExpiryDays,
    autoPost: payload.autoPost,
    prUseDeliveryOrder: payload.prUseDeliveryOrder,
    HQSiteCode: payload.HQSiteCode,
    siteCode,
    siteName,
    siteAddress: outlet?.itemsiteAddress ?? "",
    siteCity: outlet?.itemsiteCity ?? "",
    siteCountry: outlet?.itemsiteCountry ?? "",
    siteState: outlet?.itemsiteState ?? "",
    sitePostCode: outlet?.itemsitePostcode ?? "",
    sitePhone: outlet?.itemsitePhone1 || payload.sitePhone || "",
    currencyCode: currencyData?.currencyCode || payload.currency || "$",
    currencyName: currencyData?.currencyName || payload.currency || "USD",
    currencyRate: currencyData?.currencyRate || 1,
  };
}

export async function establishUserSession({
  loginSuccess,
  response,
  token,
  usernameFallback = "",
}) {
  const parsed = parseAuthApiResponse(response);

  if (!isAuthVerificationSuccessful(response, parsed)) {
    const message =
      parsed.message ||
      response?.error ||
      response?.message ||
      "Authentication failed";
    throw new Error(
      typeof message === "string" ? message : "Authentication failed"
    );
  }

  const payload = extractLoginPayload(response, parsed);
  const outlet = outletFromAuthData(parsed, payload);
  const inventoryAuthUserCode =
    usernameFallback || payload.username || payload.userCode;
  const sessionToken = token || payload.token;

  if (sessionToken) {
    apiService.setToken(sessionToken);
    apiService1.setToken(sessionToken);
  }

  const [userAuthorizations, currencyData] = await Promise.all([
    fetchUserAuthorizations(inventoryAuthUserCode),
    fetchActiveCurrency(),
  ]);

  const successData = buildSessionUserDetails(
    payload,
    outlet,
    currencyData,
    sessionToken,
    usernameFallback
  );

  localStorage.setItem(
    "userAuthorizations",
    JSON.stringify(userAuthorizations)
  );

  const success = await loginSuccess(successData);
  if (!success) {
    throw new Error("Failed to persist login session");
  }

  return successData;
}
