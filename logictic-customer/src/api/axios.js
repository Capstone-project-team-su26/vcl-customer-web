import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  headers: {
    "Accept": "text/plain, application/json",
    "Content-Type": "application/json"
  }
});

console.log("API URL:", import.meta.env.VITE_API_URL);

/* ================= REQUEST INTERCEPTOR ================= */

axiosInstance.interceptors.request.use((config) => {

  const token =
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  console.log("====== API REQUEST ======");
  console.log("URL:", config.baseURL + config.url);
  console.log("TOKEN:", token);

  return config;

});

/* ================= RESPONSE INTERCEPTOR ================= */

axiosInstance.interceptors.response.use(

  (response) => response,

  (error) => {

    console.error("API ERROR:", error?.response || error);

    const status = error?.response?.status;
    const requestUrl = error?.config?.url;

    /* nếu token hết hạn */

    if (status === 401 && !requestUrl?.includes("login")) {

      sessionStorage.clear();
      localStorage.clear();

      window.location.href = "/login";

    }

    return Promise.reject(error);

  }

);

export default axiosInstance;