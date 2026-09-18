/* =========================================================
   authService.js — gọi API thật (đăng nhập, đăng ký, OTP, mật khẩu, hồ sơ).

   Giữ nguyên tên export, thứ tự tham số và hình dạng trả về của bản mock:
   mỗi hàm trả PHẦN THÂN đã bóc envelope, không trả object response của axios.
   Lỗi ném nguyên dạng axios để các trang auth đọc error.response.data.message.

   Hàm đăng nhập KHÔNG tự ghi token vào storage: Login.jsx lưu cả "user" lẫn
   "accessToken" vào sessionStorage + localStorage SAU KHI hàm resolve. Vì vậy
   chặn tài khoản không phải khách = ném lỗi, không token nào kịp được lưu.

   Endpoint (đối chiếu VCL_API AuthController + CustomerProfileController):
   - POST /api/Auth/login                 → { token, expiresAt, userId, fullName, role, region }
   - POST /api/Auth/google                → như trên
   - POST /api/Auth/customer/register     → { message }
   - POST /api/Auth/customer/verify-otp   → { message, customerId } (không trả token)
   - POST /api/Auth/customer/resend-otp   → { message }
   - POST /api/Auth/forgot-password       → { message }
   - POST /api/Auth/reset-password        → { message }
   - GET|PUT /api/customer/profile        → { message, data }
   ========================================================= */

import { AxiosError } from "axios";

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const INVALID_CREDENTIALS_MESSAGE = "Email hoặc mật khẩu không đúng.";

const NOT_CUSTOMER_MESSAGE =
  "Tài khoản này không dùng được cho ứng dụng khách hàng.";

const NETWORK_ERROR_MESSAGE =
  "Không kết nối được máy chủ. Vui lòng thử lại.";

const CUSTOMER_ROLE = "customer";

const readAccessToken = () => {
  for (const name of ["sessionStorage", "localStorage"]) {
    try {
      const value = globalThis[name]?.getItem("accessToken");

      if (value) {
        return value;
      }
    } catch {
      /* Storage bị chặn thì coi như chưa có token. */
    }
  }

  return null;
};

/** Token truyền tay (tham số cũ của hàm hồ sơ) được ưu tiên hơn token trong storage. */
const withToken = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

const unwrapData = (body) =>
  body && typeof body === "object" && "data" in body ? body.data : body;

const trimText = (value) => String(value ?? "").trim();

/** Bổ sung alias mà màn hình cũ đọc (accessToken, email) mà không đè field backend. */
const toAuthPayload = (body, extra = {}) => ({
  ...extra,
  ...body,
  accessToken: body?.accessToken ?? body?.token,
  tokenType: body?.tokenType ?? "Bearer",
});

/* Hồ sơ backend: id là mã KHÁCH HÀNG (không phải userId) — thêm alias customerId. */
const toProfile = (profile) =>
  profile && typeof profile === "object"
    ? { ...profile, customerId: profile.customerId ?? profile.id }
    : profile;

/* =========================================================
   LỖI
   ========================================================= */

/**
 * Không có response (mất mạng, timeout, CORS): mọi trang auth rơi về câu mặc định
 * của chính nó khi thiếu error.response.data.message — ở Login đó là "sai mật
 * khẩu", báo nhầm hoàn toàn. Gắn một response tối thiểu mang câu mất kết nối,
 * giữ nguyên phần còn lại của lỗi axios (code ERR_NETWORK / ECONNABORTED...).
 */
const withNetworkMessage = (error) => {
  if (
    error &&
    typeof error === "object" &&
    !error.response &&
    !isCanceledRequest(error)
  ) {
    error.response = {
      status: 0,
      statusText: "",
      data: { message: NETWORK_ERROR_MESSAGE },
      headers: {},
      config: error.config,
    };
  }

  return error;
};

/** Gọi API auth; lỗi mạng được gắn câu "Không kết nối được máy chủ" trước khi ném. */
const callAuthApi = async (request) => {
  try {
    return await request();
  } catch (error) {
    throw withNetworkMessage(error);
  }
};

/**
 * Backend cấp token cho MỌI role. App khách chỉ dành cho role Customer: nhân viên
 * đăng nhập vào đây sẽ thấy đơn của mọi khách như "đơn của tôi" (backend coi
 * staff là xem được tất cả). Ném 403 dạng axios để Login.jsx hiện message và
 * không lưu token.
 */
const ensureCustomerRole = (response) => {
  const role = trimText(response?.data?.role).toLowerCase();

  if (role === CUSTOMER_ROLE) {
    return;
  }

  throw new AxiosError(
    NOT_CUSTOMER_MESSAGE,
    AxiosError.ERR_BAD_REQUEST,
    response?.config,
    response?.request,
    {
      status: 403,
      statusText: "Forbidden",
      data: { message: NOT_CUSTOMER_MESSAGE },
      headers: {},
      config: response?.config,
      request: response?.request,
    }
  );
};

/* =========================================================
   ĐĂNG NHẬP — POST /api/Auth/login
   ========================================================= */

export const loginApi = async (email, password) => {
  const normalizedEmail = trimText(email);

  const response = await callAuthApi(async () => {
    try {
      return await httpClient.post("/api/Auth/login", {
        email: normalizedEmail,
        password,
      });
    } catch (error) {
      /* Backend gộp mọi lỗi đăng nhập thành 401 { message: "Invalid credentials" }. */
      if (error?.response?.status === 401) {
        const data = error.response.data;

        error.response.data = {
          ...(data && typeof data === "object" ? data : {}),
          message: INVALID_CREDENTIALS_MESSAGE,
        };
      }

      throw error;
    }
  });

  ensureCustomerRole(response);

  return toAuthPayload(response.data, { email: normalizedEmail });
};

/* =========================================================
   ĐĂNG KÝ — POST /api/Auth/customer/register
   ========================================================= */

export const registerApi = async (userData) => {
  const payload = {
    fullName: trimText(userData?.fullName),
    email: trimText(userData?.email),
    password: String(userData?.password ?? ""),
    phone: trimText(userData?.phone),
    country: trimText(userData?.country),
    address: trimText(userData?.address),
  };

  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/customer/register", payload)
  );

  return {
    success: true,
    email: payload.email,
    fullName: payload.fullName,
    requiresOtpVerification: true,
    ...response.data,
  };
};

/* =========================================================
   XÁC THỰC OTP ĐĂNG KÝ — POST /api/Auth/customer/verify-otp
   ========================================================= */

export const verifyOtpApi = async (email, otp) => {
  const normalizedEmail = trimText(email);

  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/customer/verify-otp", {
      email: normalizedEmail,
      otp: trimText(otp),
    })
  );

  return {
    success: true,
    email: normalizedEmail,
    ...response.data,
  };
};

/* =========================================================
   GỬI LẠI OTP — POST /api/Auth/customer/resend-otp
   ========================================================= */

export const resendOtpApi = async (email) => {
  const normalizedEmail = trimText(email);

  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/customer/resend-otp", {
      email: normalizedEmail,
    })
  );

  return {
    success: true,
    email: normalizedEmail,
    ...response.data,
  };
};

/* =========================================================
   QUÊN MẬT KHẨU — POST /api/Auth/forgot-password
   ========================================================= */

export const forgotPasswordApi = async (email) => {
  const normalizedEmail = trimText(email);

  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/forgot-password", {
      email: normalizedEmail,
    })
  );

  return {
    success: true,
    email: normalizedEmail,
    ...response.data,
  };
};

/* =========================================================
   ĐẶT LẠI MẬT KHẨU — POST /api/Auth/reset-password
   ========================================================= */

export const resetPasswordApi = async (email, otp, newPassword) => {
  const normalizedEmail = trimText(email);

  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/reset-password", {
      email: normalizedEmail,
      otp: trimText(otp),
      newPassword: String(newPassword ?? ""),
    })
  );

  return {
    success: true,
    email: normalizedEmail,
    ...response.data,
  };
};

/* =========================================================
   HỒ SƠ CÁ NHÂN — GET /api/customer/profile
   ========================================================= */

export const getUserProfileApi = async (token = readAccessToken()) => {
  const response = await callAuthApi(() =>
    httpClient.get("/api/customer/profile", withToken(token))
  );

  /* ProfileView/ProfileEdit/Sidebar đọc: fullName, email, phone, country, address, status. */
  return toProfile(unwrapData(response.data));
};

/* =========================================================
   CẬP NHẬT HỒ SƠ — PUT /api/customer/profile
   ========================================================= */

export const updateUserProfileApi = async (
  profileData,
  token = readAccessToken()
) => {
  const response = await callAuthApi(() =>
    httpClient.put(
      "/api/customer/profile",
      {
        fullName: trimText(profileData?.fullName),
        phone: trimText(profileData?.phone),
        country: trimText(profileData?.country),
        address: trimText(profileData?.address),
      },
      withToken(token)
    )
  );

  return toProfile(unwrapData(response.data));
};

/* =========================================================
   ĐĂNG NHẬP GOOGLE — POST /api/Auth/google
   ========================================================= */

export const googleLoginApi = async (idToken) => {
  const response = await callAuthApi(() =>
    httpClient.post("/api/Auth/google", {
      idToken: trimText(idToken),
    })
  );

  ensureCustomerRole(response);

  return toAuthPayload(response.data, { provider: "GOOGLE" });
};
