import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const buildFilterQuery = (pagination) => {
  console.log(pagination, "pagina");
  const params = [];
  let andIndex = 0;

  // Handle regular where conditions
  if (pagination.where && typeof pagination.where === "object") {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.push(
          `filter[where][${encodeURIComponent(key)}]=${encodeURIComponent(
            value
          )}`
        );
      }
    });
  }

  // Handle whereArray conditions with AND
  if (pagination.whereArray && typeof pagination.whereArray === "object") {
    Object.entries(pagination.whereArray).forEach(([key, value]) => {
      console.log(key, value, "key");

      if (Array.isArray(value) && value.length > 0) {
        console.log(key, value, "key");
        if (key === "department") {
          let inqIndex = 0;

          if (value.length > 1) {
            value.forEach((item, index) => {
              params.push(
                `filter[where][${encodeURIComponent(
                  key
                )}][inq]=${encodeURIComponent(item)}`
              );
              inqIndex++;
            });
          } else {
            let val = value[0];

            params.push(
              `filter[where][${encodeURIComponent(key)}]=${encodeURIComponent(
                val
              )}`
            );
            // value.forEach((item, index) => {
            //   params.push(
            //     `filter[where][${key}][inq]=${encodeURIComponent(
            //       item
            //     )}`
            //   );
            // });
          }
          andIndex++;

          // Handle department with OR inside AND
          // value.forEach((item, index) => {
          //   params.push(
          //     `filter[where][and][${andIndex}][or][${index}][${key}]=${encodeURIComponent(
          //       item
          //     )}`
          //   );
          // });
        } else if (key === "brand" || key === "range") {
          let inqIndex = 0;

          console.log(key, "key1");
          if (value.length === 1) {
            console.log(key, value, "key");

            let val = value[0];
            params.push(`filter[where][${key}]=${encodeURIComponent(val)}`);
          } else {
            value.forEach((item, index) => {
              params.push(
                `filter[where][${key}][inq]=${encodeURIComponent(item)}`
              );
              inqIndex++;
            });
          }

          // Send full array as a JSON string for inq
          // params.push(
          //   `filter[where][and][${andIndex}][${key}][inq]=${encodeURIComponent(JSON.stringify(value))}`
          // );
          // params.push(
          //   `filter[where][${key}][inq]=${encodeURIComponent(
          //     value
          //   )}`
          // );
          andIndex++;
        } else {
          // Handle other arrays with AND
          value.forEach((item, index) => {
            params.push(
              `filter[where][and][${andIndex}][${key}]=${encodeURIComponent(
                item
              )}`
            );
          });
          andIndex++;
        }
      }
    });
  }

  // Handle like conditions
  if (pagination.like && typeof pagination.like === "object") {
    let orIndex = 0;
    Object.entries(pagination.like).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.push(
          `filter[where][or][${orIndex}][${encodeURIComponent(
            key
          )}][like]=${encodeURIComponent(`%${value}%`)}`
        );
      }
      orIndex++;
    });
    andIndex++;
  }

  // Handle pagination
  if (pagination.skip !== null && pagination.skip !== undefined) {
    params.push(`filter[skip]=${encodeURIComponent(pagination.skip)}`);
  }

  if (pagination.limit !== null && pagination.limit !== undefined) {
    params.push(`filter[limit]=${encodeURIComponent(pagination.limit)}`);
  }

  if (pagination.order?.toString().trim()) {
    params.push(`filter[order]=${encodeURIComponent(pagination.order)}`);
  }

  return params.length ? "?" + params.join("&") : "";
};

export const buildCountQuery = (pagination) => {
  const params = [];

  if (pagination.where && typeof pagination.where === "object") {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // Handle array values
          if (value.length > 0) {
            value.forEach((item, index) => {
              params.push(
                `[where][or][${index}][${encodeURIComponent(
                  key
                )}]=${encodeURIComponent(item)}`
              );
            });
          }
        } else {
          // Handle non-array values
          params.push(
            `[where][${encodeURIComponent(key)}]=${encodeURIComponent(value)}`
          );
        }
      }
    });
  }

  if (pagination.like && typeof pagination.like === "object") {
    Object.entries(pagination.like).forEach(([key, value], i) => {
      if (value !== null && value !== undefined && value !== "") {
        params.push(
          `[where][or][${i}][${encodeURIComponent(
            key
          )}][like]=${encodeURIComponent(`%${value}%`)}`
        );
      }
    });
  }

  return params.length ? "?" + params.join("&") : "";
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function buildFilterObject(pagination) {
  const filter = { where: { and: [] } };

  // Handle regular where conditions first
  if (pagination.where) {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        filter.where.and.push({ [key]: value });
      }
    });
  }

  // Handle whereArray with AND and inq
  if (pagination.whereArray) {
    Object.entries(pagination.whereArray).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // For department, brand, or range
        if (key === "department" || key === "brand" || key === "range") {
          if (value.length === 1) {
            filter.where.and.push({ [key]: value[0] });
          } else {
            filter.where.and.push({ [key]: { inq: value } });
          }
        } else {
          // For other arrays, keep the original AND behavior
          value.forEach((item) => {
            filter.where.and.push({ [key]: item });
          });
        }
      }
    });
  }

  // Handle like conditions for search
  if (pagination.like) {
    const orClauses = [];
    Object.entries(pagination.like).forEach(([key, value]) => {
      if (value) {
        orClauses.push({ [key]: { like: `%${value}%` } });
      }
    });
    if (orClauses.length > 0) {
      filter.where.and.push({ or: orClauses });
    }
  }

  // Handle pagination params
  if (pagination.skip !== undefined) {
    filter.skip = pagination.skip;
  }
  if (pagination.limit !== undefined) {
    filter.limit = pagination.limit;
  }
  if (pagination.order) {
    filter.order = pagination.order;
  }

  return filter;
}

export const buildCountObject = (pagination) => {
  const filter = { where: { and: [] } };

  // Handle regular where conditions first
  if (pagination.where) {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        filter.where.and.push({ [key]: value });
      }
    });
  }

  // Handle whereArray with AND and inq
  if (pagination.whereArray) {
    Object.entries(pagination.whereArray).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // For department, brand, or range
        if (key === "department" || key === "brand" || key === "range") {
          if (value.length === 1) {
            filter.where.and.push({ [key]: value[0] });
          } else {
            filter.where.and.push({ [key]: { inq: value } });
          }
        } else {
          // For other arrays, keep the original AND behavior
          value.forEach((item) => {
            filter.where.and.push({ [key]: item });
          });
        }
      }
    });
  }

  // Handle like conditions for search
  if (pagination.like) {
    const orClauses = [];
    Object.entries(pagination.like).forEach(([key, value]) => {
      if (value) {
        orClauses.push({ [key]: { like: `%${value}%` } });
      }
    });
    if (orClauses.length > 0) {
      filter.where.and.push({ or: orClauses });
    }
  }

  return filter;
};

// Set a cookie with a specified expiration date
export const setCookie = (name, value, days = "3") => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000); // Set expiration time
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`; // Store cookie with path set to root
};

// Get a cookie by name
export const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Delete a cookie by name
export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`; // Set expired date to delete cookie
};

export const queryParamsGenerate = (filter) => {
  let query = {
    where: {},
  };

  // Handle filter keys like where conditions
  Object.keys(filter).forEach((key) => {
    if (filter[key] !== "" && (filter[key] || filter[key] === 0)) {
      query.where[key] = filter[key];
    }
  });

  //  Handle special keys separately
  if (filter.skip && filter.page && filter.limit) {
    query.skip = filter.page * filter.limit;
  }
  if (filter.limit) {
    query.limit = filter.limit;
  }
  if (filter.order) {
    query.order = filter.order;
  }
  if (filter.fields) {
    query.fields = filter.fields;
  }

  // Check if 'where' is empty and there are no other filters (skip, limit, etc.)
  if (
    Object.keys(query.where).length === 0 &&
    !query.skip &&
    !query.limit &&
    !query.order &&
    !query.fields
  ) {
    return ""; // Return empty string if no filters are provided
  }

  let queryString = encodeURIComponent(JSON.stringify(query));
  return `?filter=${queryString}`;
};

export const stockHdrs = {
  docNo: "",
  docDate: "",
  docStatus: 0,
  supplyNo: "",
  docRef1: "",
  docRef2: "",
  docTerm: "",
  storeNo: "BeateSoft salon",
  docRemk1: "",
  postDate: "",
  createUser: "kk",
};

export const format_Date = (dateString) => {
  if (!dateString) return "-";

  try {
    let date;
    
    // Handle different date formats
    if (typeof dateString === 'string') {
      // Handle "21/11/2025 12:00:00 AM" format
      if (dateString.includes('/')) {
        const parts = dateString.split(' ')[0].split('/');
        if (parts.length === 3) {
          // Format: DD/MM/YYYY
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);
          date = new Date(year, month, day);
        }
      } else {
        // Handle ISO format or other standard formats
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return "-";

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "-";
  }
};

// Helper function to format current date in DD/MM/YYYY format
export const formatCurrentDate = () => {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, "0");
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// User Authorization Utilities
export const getUserAuthorizations = () => {
  try {
    const authData = localStorage.getItem("userAuthorizations");
    return authData ? JSON.parse(authData) : [];
  } catch (error) {
    console.error("Error parsing user authorizations:", error);
    return [];
  }
};

export const hasUserAuthorization = (authCode) => {
  const userAuths = getUserAuthorizations();
  const auth = userAuths.find(a => a.Code === authCode);
  return auth && auth.Active === "Y";
};

// Enhanced function to check authorization with "starts with" logic for names
export const hasUserAuthorizationByName = (authName) => {
  const userAuths = getUserAuthorizations();
  // Find authorization where the Name starts with the provided authName
  const auth = userAuths.find(a => a.Name && a.Name.startsWith(authName));
  return auth && auth.Active === "Y";
};

// Menu item to authorization code mapping
export const MENU_AUTH_MAPPING = {
  "Goods Receive Note": "F10001",
  "Goods Transfer Out": "F10002",
  "Goods Transfer In": "F10003",
  "Goods Return Note": "F10004",
  "Stock Adjustment": "F10005",
  "Stock Usage Memo": "F10010",
  "Stock Take": "F10011",
  "Stock Balance": "F10009",
  "Stock Movement": "F10011",
};

export const checkMenuAuthorization = (menuTitle) => {
  const authCode = MENU_AUTH_MAPPING[menuTitle];
  if (!authCode) return true; // If no auth code mapped, allow access
  return hasUserAuthorization(authCode);
};

// Function to get dynamic APP_CONFIG with user-specific overrides
export const getAppConfig = () => {
  // Get base config from window.APP_CONFIG
  const baseConfig = window.APP_CONFIG || {};
  
  // Get user details from localStorage
  const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
  
  // Create config with user-specific overrides for settings only
  const dynamicConfig = {
    ...baseConfig, // Keep all existing config (API URLs, etc.)
    // Override only the user-specific settings
    BATCH_NO: userDetails.batchNo === "True" ? "Yes" : "No",
    EXPIRY_DATE: userDetails.expiryDate === "True" ? "Yes" : "No", 
    AUTO_POST: userDetails.autoPost === "True" ? "Yes" : "No",
    DEFAULT_EXPIRY_DAYS: parseInt(userDetails.defaultExpiryDays) || baseConfig.DEFAULT_EXPIRY_DAYS || 365,
    ManualBatchSelection: userDetails.manualBatchSelection === "True",
    BATCH_SNO: userDetails.batchSNo === "True" ? "Yes" : "No",
  };
  
  return dynamicConfig;
};

// Helper function to get a specific config value with user override
export const getConfigValue = (key) => {
  const config = getAppConfig();
  return config[key];
};
