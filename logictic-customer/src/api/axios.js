import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  "https://api-vcl.purintech.id.vn";

console.log("API BASE URL:", API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/+$/, ""),
  timeout: 30000,
  headers: {
    Accept: "text/plain, application/json",
    "Content-Type": "application/json",
  },
});

/* ================= REQUEST INTERCEPTOR ================= */

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");

    const requestUrl = config.url?.toLowerCase() || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    // Không gửi token cũ khi đăng nhập
    if (token && !isLoginRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    console.log("====== API REQUEST ======");
    console.log("METHOD:", config.method?.toUpperCase());
    console.log(
      "URL:",
      `${config.baseURL || ""}${config.url || ""}`
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */

axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    console.error("API ERROR:", {
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
      message: error?.message,
    });

    const status = error?.response?.status;
    const requestUrl =
      error?.config?.url?.toLowerCase() || "";

    const isLoginRequest =
      requestUrl.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("accessToken");

      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;