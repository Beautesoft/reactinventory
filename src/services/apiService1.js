import axios from "axios";

// Cookie Helpers
const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift() || null;
  return null;
};

const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// API Service Class
export class ApiService1 {
  constructor() {
    // const baseURL = import.meta.env.DEV
    //   ? ''
    //   : window.APP_CONFIG?.API_BASE_URL || '';
    const baseURL = window.APP_CONFIG?.API_LOGIN_URL || "";

    this.instance = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });



    this.token = getCookie("token");
    if (this.token) {
      this.setToken(this.token);
    }

    this.instance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `token ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.log(error, "error");

        if (error.response?.status === 401) {
          this.setToken(null);
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token) {
    this.token = token;
    if (token) {
      setCookie("token", token);
      this.instance.defaults.headers.common.Authorization = `token ${token}`;
    } else {
      removeCookie("token");
      delete this.instance.defaults.headers.common.Authorization;
    }
  }

  async get(url, config) {
    console.log(config, "config");
    return this.instance.get(url, config);
  }

  async post(url, data, config) {
    return this.instance.post(url, data, config);
  }

  async put(url, data, config) {
    return this.instance.put(url, data, config);
  }

  async patch(url, data, config) {
    return this.instance.patch(url, data, config);
  }

  async delete(url, config) {
    return this.instance.delete(url, config);
  }

//   async login(url, data, config = {}) {
//     // Create a new instance without auth headers for login
//     // const baseURL = window.APP_CONFIG?.API_LOGIN_URL || '';


//     try {
//       const response = await loginInstance.post(url, data, config);
//       console.log(response, "response");
//       // If login successful, set the token for future requests
//       // if (response.data?.data?.token) {
//       //   this.setToken(response.data.data.token);
//       // }
//       return response.data;
//     } catch (error) {
//       throw error;
//     }
//   }
}

// Create a SINGLE instance (Singleton)
const apiService1 = new ApiService1();

export default apiService1;
