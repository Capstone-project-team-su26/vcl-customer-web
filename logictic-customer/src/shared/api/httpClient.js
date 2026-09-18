/* =========================================================
   httpClient.js — axios instance dùng chung cho mọi module api/ đã nối backend.

   Hợp đồng (README mục "Cắm API thật trở lại" + spec tích hợp API ký gửi đợt A):
   - baseURL đọc VITE_API_BASE_URL (cắt "/" thừa ở cuối), mặc định production
     https://vcl.henrytech.cloud; timeout 30 giây.
   - Request: gắn Authorization: Bearer <accessToken> (sessionStorage trước rồi
     localStorage). URL /api/Auth/* thì KHÔNG gắn (đăng nhập lại khi còn token
     cũ sẽ bị backend từ chối).
   - Response thành công: đồng bộ lệch giờ bằng header `date` (syncServerClock).
   - Response lỗi: lỗi huỷ ném lại, không log. 401 có body rỗng (JWT bị từ chối,
     không phải request Auth) là hết phiên: dọn phiên y như nút "Đăng xuất" của
     Sidebar rồi về /login. 401 có { message } là lỗi nghiệp vụ (ví dụ không
     phải chủ đơn): chỉ ném lỗi, KHÔNG đăng xuất.
   - Lỗi luôn ném nguyên dạng axios để component đọc error.response.data.

   Không đụng window / storage ở top-level: tools/verify-*.mjs nạp file này qua
   Vite SSR (Node), nơi hai thứ đó không tồn tại.
   ========================================================= */

import axios from "axios";

import { isCancel } from "@shared/api/requestCancel";
import { syncServerClock } from "@shared/utils/timeUtc";

export const DEFAULT_API_BASE_URL = "https://vcl.henrytech.cloud";

export const DEFAULT_TIMEOUT_MS = 30_000;

const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";
const LOGIN_PATH = "/login";

export const API_BASE_URL = (
  String(import.meta.env.VITE_API_BASE_URL ?? "").trim() ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

/** Nhận diện lỗi huỷ request (AbortController / CanceledError của axios). */
export const isCanceledRequest = (error) => isCancel(error);

/* =========================================================
   STORAGE — mọi truy cập đều lười và bọc try/catch
   ========================================================= */

const getStorage = (name) => {
  try {
    return globalThis[name] ?? null;
  } catch {
    /* Trình duyệt chặn storage (chế độ riêng tư, iframe sandbox). */
    return null;
  }
};

const readToken = () => {
  for (const name of ["sessionStorage", "localStorage"]) {
    try {
      const value = getStorage(name)?.getItem(ACCESS_TOKEN_KEY);

      if (value) {
        return value;
      }
    } catch {
      /* Đọc không được thì thử storage kế tiếp. */
    }
  }

  return null;
};

/** Có token đăng nhập trong sessionStorage/localStorage không (không gọi mạng). */
export const hasAccessToken = () => Boolean(readToken());

/**
 * Dọn phiên giống hệt handleLogout của Sidebar: xoá SẠCH sessionStorage (token,
 * user, cả phone / fullName / cờ sidebarProfileSynced của tài khoản trước) và
 * xoá accessToken + user ở localStorage. Chỉ xoá accessToken/user ở session thì
 * tài khoản đăng nhập sau sẽ thấy SĐT của tài khoản trước trên Sidebar.
 */
const clearSession = () => {
  try {
    getStorage("sessionStorage")?.clear();
  } catch {
    /* Không xoá được cũng không được chặn luồng ném lỗi. */
  }

  try {
    const storage = getStorage("localStorage");

    storage?.removeItem(ACCESS_TOKEN_KEY);
    storage?.removeItem(USER_KEY);
  } catch {
    /* Như trên. */
  }

  try {
    /* Sidebar/SiteHeader nghe sự kiện này để cập nhật trạng thái đăng nhập. */
    if (typeof globalThis.Event === "function") {
      globalThis.window?.dispatchEvent?.(new globalThis.Event("storage"));
    }
  } catch {
    /* Môi trường không có Event (Node) thì bỏ qua. */
  }
};

const redirectToLogin = () => {
  const location = globalThis.window?.location;

  if (!location || location.pathname === LOGIN_PATH) {
    return;
  }

  location.replace(LOGIN_PATH);
};

/* =========================================================
   QUY TẮC
   ========================================================= */

const isAuthUrl = (url) => /\/api\/auth\//i.test(String(url ?? ""));

const setHeader = (headers, name, value) => {
  if (typeof headers?.set === "function") {
    headers.set(name, value);
  } else if (headers) {
    headers[name] = value;
  }
};

const deleteHeader = (headers, name) => {
  if (typeof headers?.delete === "function") {
    headers.delete(name);
  } else if (headers) {
    delete headers[name];
  }
};

const readHeader = (headers, name) => {
  if (typeof headers?.get === "function") {
    return headers.get(name);
  }

  return headers?.[name] ?? headers?.[name.toLowerCase()];
};

const attachToken = (config) => {
  if (isAuthUrl(config?.url)) {
    deleteHeader(config.headers, "Authorization");
    return config;
  }

  /* Hàm nào đã tự truyền token (tham số cũ của authService) thì giữ nguyên. */
  if (readHeader(config.headers, "Authorization")) {
    return config;
  }

  const token = readToken();

  if (token) {
    setHeader(config.headers, "Authorization", `Bearer ${token}`);
  }

  return config;
};

const syncClockFromResponse = (response) => {
  const rawDate = readHeader(response?.headers, "date");

  /*
   * Header date dạng RFC 1123 ("Thu, 17 Sep 2026 03:00:00 GMT"); bộ chuẩn hoá chuỗi
   * của timeUtc không đọc được dạng này, nên đổi sang Date trước khi đồng bộ.
   */
  const serverDate = rawDate ? new Date(rawDate) : null;

  if (serverDate && !Number.isNaN(serverDate.getTime())) {
    syncServerClock(serverDate);
  }

  return response;
};

/**
 * 401 do JWT bị từ chối trả body rỗng; 401 do nghiệp vụ trả { message }.
 * Chỉ trường hợp đầu mới là "phiên hết hạn".
 */
export const isSessionExpiredError = (error) => {
  const status = error?.response?.status;
  const url = String(error?.config?.url ?? "");

  return (
    status === 401 &&
    !isAuthUrl(url) &&
    !error.response?.data?.message
  );
};

const handleResponseError = (error) => {
  if (isCanceledRequest(error)) {
    return Promise.reject(error);
  }

  console.error(
    "[httpClient]",
    String(error?.config?.method || "").toUpperCase(),
    error?.config?.url,
    error?.response?.status ?? error?.code,
    error?.response?.data ?? error?.message,
  );

  if (isSessionExpiredError(error)) {
    clearSession();
    redirectToLogin();
  }

  return Promise.reject(error);
};

/* =========================================================
   INSTANCE
   ========================================================= */

/**
 * Tạo một axios instance có đủ interceptor chung. uploadImage.js dùng hàm này để
 * có instance riêng timeout dài mà vẫn cùng quy tắc token / 401.
 *
 * @param {import("axios").CreateAxiosDefaults} [config]
 */
export const createHttpClient = (config = {}) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT_MS,
    ...config,
    headers: {
      Accept: "application/json, text/plain, */*",
      ...(config.headers || {}),
    },
  });

  instance.interceptors.request.use(attachToken);
  instance.interceptors.response.use(syncClockFromResponse, handleResponseError);

  return instance;
};

const httpClient = createHttpClient();

export default httpClient;
