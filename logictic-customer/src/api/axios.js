// src/api/axios.js

import axios from "axios";
import { syncServerClock } from "../utils/timeUtc";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "https://api-vcl.zushin.io.vn";

console.log("API BASE URL:", API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: 30000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  },
});

/* ================= HELPER ================= */

export const isCanceledRequest = (error) => {
  return (
    axios.isCancel(error) ||
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError" ||
    error?.message === "canceled"
  );
};

/* ================= REQUEST INTERCEPTOR ================= */

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");

    const requestUrl = String(config.url || "").toLowerCase();
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (token && !isLoginRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    if (import.meta.env.DEV) {
      console.log("====== API REQUEST ======");
      console.log("METHOD:", config.method?.toUpperCase());
      console.log("URL:", `${config.baseURL || ""}${config.url || ""}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */

axiosInstance.interceptors.response.use(
  (response) => {
    const serverDate =
      response.headers?.date ||
      response.headers?.Date;

    if (serverDate) {
      syncServerClock(serverDate);
    }

    return response;
  },

  (error) => {
    if (isCanceledRequest(error)) {
      return Promise.reject(error);
    }

    console.error("API ERROR:", {
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
      message: error?.message,
    });

    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "").toLowerCase();
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("accessToken");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;