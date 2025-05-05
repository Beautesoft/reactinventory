import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const buildFilterQuery = (pagination) => {
  const params = [];
  console.log(pagination, "pagination");
  if (pagination.where && typeof pagination.where === "object") {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.push(
          `filter[where][${encodeURIComponent(key)}]=${encodeURIComponent(
            value
          )}`
        );
        console.log(key, "key");
      }
    });
  }
  if (pagination.like && typeof pagination.like === "object") {
    Object.entries(pagination.like).forEach(([key,value],i) => {
      if (value !== null && value !== undefined && value !== "") {
      params.push(
          `filter[where][or][${i}][${encodeURIComponent(key)}][like]=${encodeURIComponent(
            `%${value}%`
          )}`
        );
        console.log(key, "key");
      }
    });
  }
  console.log(params, "params");

  if (pagination.skip !== null && pagination.skip !== undefined) {
    params.push(`filter[skip]=${encodeURIComponent(pagination.skip)}`);
  }

  if (pagination.limit !== null && pagination.limit !== undefined) {
    params.push(`filter[limit]=${encodeURIComponent(pagination.limit)}`);
  }

  if (
    pagination.order !== null &&
    pagination.order !== undefined &&
    pagination.order.toString().trim() !== ""
  ) {
    params.push(`filter[order]=${encodeURIComponent(pagination.order)}`);
  }
  console.log(params, "return");

  return params.length ? "?" + params.join("&") : "";
};

export const buildCountQuery = (pagination) => {
  const params = [];
  console.log(pagination, "pagination");
  if (pagination.where && typeof pagination.where === "object") {
    Object.entries(pagination.where).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.push(
          `[where][${encodeURIComponent(key)}]=${encodeURIComponent(
            value
          )}`
        );
        console.log(key, "key");
      }
    });
  }
  if (pagination.like && typeof pagination.like === "object") {
    Object.entries(pagination.like).forEach(([key,value],i) => {
      if (value !== null && value !== undefined && value !== "") {
      params.push(
          `[where][or][${i}][${encodeURIComponent(key)}][like]=${encodeURIComponent(
            `%${value}%`
          )}`
        );
        console.log(key, "key");
      }
    });
  }
  console.log(params, "params");

  // if (pagination.skip !== null && pagination.skip !== undefined) {
  //   params.push(`filter[skip]=${encodeURIComponent(pagination.skip)}`);
  // }

  // if (pagination.limit !== null && pagination.limit !== undefined) {
  //   params.push(`filter[limit]=${encodeURIComponent(pagination.limit)}`);
  // }

  // if (
  //   pagination.sortBy !== null &&
  //   pagination.sortBy !== undefined &&
  //   pagination.sortBy.toString().trim() !== ""
  // ) {
  //   params.push(`filter[sort]=${encodeURIComponent(pagination.sortBy)}`);
  // }
  // console.log(params, "return");

  return params.length ? "?" + params.join("&") : "";
};

// Example usage:
// const pagination = {
//   where: { docStatus: 0, movCode: "GRN" },
//   like: {
//     docNo: "",
//     docDate: "",
//     docRef1: "",
//     supplyNo: "",
//     docAmt: "",
//     docStatus: "",
//   },
//   skip: 0,
//   limit: 5,
//   sortBy: "",
// };

// console.log(buildFilterQuery(pagination));
// Output: "?filter[where][docStatus]=0&filter[where][movCode]=GRN&filter[skip]=0&filter[limit]=5"

// export const buildCountQuery = (filterObj) => {
//   const parts = [];

//   function recurse(obj, prefix = "") {
//     Object.entries(obj).forEach(([key, value]) => {
//       if (value === null || value === undefined || value === "") return;

//       const currentKey = prefix
//         ? `${prefix}[${encodeURIComponent(key)}]`
//         : encodeURIComponent(key);

//       if (typeof value === "object" && !Array.isArray(value)) {
//         recurse(value, currentKey);
//       } else {
//         parts.push(`${currentKey}=${encodeURIComponent(value)}`);
//       }
//     });
//   }

//   if (filterObj.where && typeof filterObj.where === "object") {
//     recurse(filterObj.where, "where");
//   }

//   return parts.length ? `?${parts.join("&")}` : "";
// };

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "-";
  }
};