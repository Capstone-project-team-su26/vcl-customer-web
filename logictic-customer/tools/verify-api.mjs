/**
 * Kiểm tra OFFLINE các module api/ đã nối backend thật (spec tích hợp API ký gửi, đợt A).
 *
 * Quyết định đã chốt: không gọi production, không tạo dữ liệu thật. Script này:
 * Đợt B (báo giá + cọc ký gửi) thêm các kịch bản: lấy báo giá, từ chối, xác nhận và
 * tạo cọc (payOS / chuyển khoản tay), poll trạng thái thanh toán, tỷ lệ cọc, lịch sử
 * thanh toán và việc luồng mua hộ vẫn trỏ bản mock.
 *
 * - chặn http/https/net/tls/fetch của Node TRƯỚC khi nạp bất cứ module sản phẩm nào —
 *   lời gọi nào lọt ra mạng đều bị ghi lại và làm script FAIL;
 * - nạp module sản phẩm qua Vite SSR (alias @/ @shared/ @features/ chạy như trong app),
 *   với envDir rỗng để .env của máy dev không ghi đè base URL;
 * - thay adapter của mọi axios instance bằng adapter giả trả response mẫu bám code
 *   backend VCL_API (Design Notes của spec);
 * - mỗi dòng I/O matrix là một (hoặc vài) kịch bản PASS/FAIL, cộng các ca bổ sung
 *   của spec: fallback hệ số thể tích, progress upload, chặn ảnh trước khi gửi,
 *   lỗi mạng khi đăng nhập, dọn sessionStorage khi hết phiên, import màn ngoài đợt A.
 *
 *   node tools/verify-api.mjs     (hoặc npm run verify:api)
 *
 * Thoát mã 1 nếu có kịch bản FAIL hoặc có request ra mạng.
 */
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";

import { AxiosError, AxiosHeaders } from "axios";
import { createServer } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const requireFromRoot = createRequire(path.join(ROOT, "package.json"));

/* =========================================================
   0. CHẶN MẠNG — cài trước khi nạp bất cứ module sản phẩm nào
   ========================================================= */

const networkAttempts = [];

const describeTarget = (args) => {
  const [first] = args;

  if (typeof first === "string" || first instanceof URL) return String(first);
  if (first && typeof first === "object") {
    return `${first.protocol || ""}//${first.hostname || first.host || "?"}${first.path || ""}`;
  }
  return "?";
};

const blockNetwork = (label) =>
  function blocked(...args) {
    networkAttempts.push(`${label} ${describeTarget(args)}`);
    throw new Error(`verify-api: đã chặn truy cập mạng (${label})`);
  };

http.request = blockNetwork("http.request");
http.get = blockNetwork("http.get");
https.request = blockNetwork("https.request");
https.get = blockNetwork("https.get");
net.connect = blockNetwork("net.connect");
net.createConnection = blockNetwork("net.createConnection");
tls.connect = blockNetwork("tls.connect");
globalThis.fetch = async (...args) => {
  networkAttempts.push(`fetch ${describeTarget(args)}`);
  throw new Error("verify-api: đã chặn fetch()");
};

/*
 * Node ≥ 25 tự có localStorage/sessionStorage toàn cục (Web Storage thử nghiệm).
 * Gỡ chúng đi trước khi nạp module — không gọi getter, nên không in cảnh báo —
 * để phép kiểm "httpClient không đụng storage ở top-level" giống môi trường SSR thật.
 */
for (const name of ["localStorage", "sessionStorage"]) {
  if (Object.getOwnPropertyDescriptor(globalThis, name)?.configurable) {
    delete globalThis[name];
  }
}

/* =========================================================
   1. VITE SSR — .env của dev KHÔNG được nạp (envDir rỗng) để kiểm base URL mặc định
   ========================================================= */

const emptyEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), "vcl-verify-api-env-"));
delete process.env.VITE_API_BASE_URL;

const createSsrServer = () =>
  createServer({
    configFile: path.join(ROOT, "vite.config.js"),
    root: ROOT,
    envDir: emptyEnvDir,
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, ws: false },
  });

const server = await createSsrServer();
const load = (rel) => server.ssrLoadModule(rel);

/* Nạp khi CHƯA có window/localStorage giả: httpClient không được đụng tới chúng ở top-level. */
const hadWindowAtLoad = typeof globalThis.window !== "undefined";
const hadStorageAtLoad =
  typeof globalThis.localStorage !== "undefined" || typeof globalThis.sessionStorage !== "undefined";
let loadError = null;
let mods = {};

/* Các module mà màn ngoài đợt A phải dùng thay cho bản đã nối API thật. */
const MOCK_MODULES = {
  consignment: "/src/features/consignment/api/consignmentApi.mock.js",
  pricing: "/src/features/pricing/api/pricingRuleService.mock.js",
  upload: "/src/shared/api/uploadImage.mock.js",
  restricted: "/src/shared/api/restrictedItemApi.mock.js",
};

try {
  mods = {
    http: await load("/src/shared/api/httpClient.js"),
    auth: await load("/src/features/auth/api/authService.js"),
    consignment: await load("/src/features/consignment/api/consignmentApi.js"),
    status: await load("/src/features/consignment/api/consignmentStatusApi.js"),
    orderStatus: await load("/src/features/consignment/constants/orderStatus.js"),
    pricing: await load("/src/features/pricing/api/pricingRuleService.js"),
    upload: await load("/src/shared/api/uploadImage.js"),
    restricted: await load("/src/shared/api/restrictedItemApi.js"),
    receiving: await load("/src/features/receiving/api/receivingNoteApi.js"),
    notifications: await load("/src/features/notifications/api/notificationApi.js"),
    quotationHelpers: await load("/src/features/consignment/pages/QuotationDetail/QuotationDetail.helpers.js"),
    payment: await load("/src/features/payment/api/orderPaymentApi.js"),
    paymentUtils: await load("/src/features/payment/utils/consignmentPaymentReturn.js"),
    orderHelpers: await load("/src/features/consignment/pages/ConsignmentOrder/ConsignmentOrder.helpers.js"),
    time: await load("/src/shared/utils/timeUtc.js"),
    historyPage: await load("/src/features/history/pages/ConsignmentHistoryList/ConsignmentHistoryList.jsx"),
    mock: {
      consignment: await load(MOCK_MODULES.consignment),
      pricing: await load(MOCK_MODULES.pricing),
      upload: await load(MOCK_MODULES.upload),
      restricted: await load(MOCK_MODULES.restricted),
    },
  };
} catch (error) {
  loadError = error;
}

/*
 * Render SSR trang Lịch sử ký gửi NGAY BÂY GIỜ, trước khi cài window giả bên dưới:
 * antd/MUI dò `window` để quyết định chạy nhánh trình duyệt. renderToString không
 * chạy useEffect nên trang không gọi API nào.
 */
let historyRender = { html: "", error: null, logs: [] };

if (!loadError) {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => historyRender.logs.push(args.map(String).join(" "));
  console.warn = (...args) => historyRender.logs.push(args.map(String).join(" "));
  try {
    const React = requireFromRoot("react");
    const { renderToString } = requireFromRoot("react-dom/server");
    const { MemoryRouter } = await import(pathToFileURL(requireFromRoot.resolve("react-router-dom")).href);
    historyRender.html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/history/consignment"] },
        React.createElement(mods.historyPage.default)
      )
    );
  } catch (error) {
    historyRender.error = error;
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
}

/* =========================================================
   2. MÔI TRƯỜNG TRÌNH DUYỆT GIẢ (storage + window.location)
   ========================================================= */

class MemoryStorage {
  #map = new Map();
  get length() {
    return this.#map.size;
  }
  key(index) {
    return Array.from(this.#map.keys())[index] ?? null;
  }
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(key, value) {
    this.#map.set(key, String(value));
  }
  removeItem(key) {
    this.#map.delete(key);
  }
  clear() {
    this.#map.clear();
  }
}

const defineGlobal = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

defineGlobal("sessionStorage", new MemoryStorage());
defineGlobal("localStorage", new MemoryStorage());

const fakeLocation = {
  pathname: "/processing-orders",
  replaced: [],
  replace(url) {
    this.replaced.push(url);
  },
};
const dispatchedEvents = [];
defineGlobal("window", {
  location: fakeLocation,
  dispatchEvent(event) {
    dispatchedEvents.push(event?.type);
    return true;
  },
});

/* =========================================================
   3. ADAPTER AXIOS GIẢ
   ========================================================= */

const SERVER_DATE = "Thu, 17 Sep 2026 03:00:00 GMT";

let requests = [];
let routes = [];

const parseBody = (data) => {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const matchRoute = (req) =>
  routes.find(
    (route) =>
      route.method === req.method &&
      (route.url instanceof RegExp ? route.url.test(req.url) : route.url === req.url)
  );

const fakeAdapter = async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const req = {
    method: String(config.method || "get").toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    params: config.params ? { ...config.params } : undefined,
    rawData: config.data,
    body: parseBody(config.data),
    authorization: headers.get("Authorization") ?? null,
    timeout: config.timeout,
  };
  requests.push(req);

  const route = matchRoute(req);
  const reply = route
    ? route.reply(req, config)
    : { status: 599, data: { message: `verify-api: không có response mẫu cho ${req.method} ${req.url}` } };

  /* Lỗi không có response: mất mạng / timeout, đúng dạng adapter xhr của axios ném ra. */
  if (reply.networkError) {
    throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
  }
  if (reply.timeout) {
    throw new AxiosError(`timeout of ${config.timeout}ms exceeded`, AxiosError.ECONNABORTED, config, {});
  }

  /* Upload: phát sự kiện tiến độ như adapter xhr trước khi trả response. */
  if (Array.isArray(reply.uploadProgress) && typeof config.onUploadProgress === "function") {
    reply.uploadProgress.forEach((event) => config.onUploadProgress(event));
  }

  const response = {
    data: reply.data,
    status: reply.status,
    statusText: String(reply.status),
    headers: AxiosHeaders.from({ date: SERVER_DATE, ...(reply.headers || {}) }),
    config,
    request: {},
  };

  if (config.validateStatus ? config.validateStatus(response.status) : response.status < 300) {
    return response;
  }

  throw new AxiosError(
    `Request failed with status code ${response.status}`,
    response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    response.request,
    response
  );
};

const ok = (data, status = 200) => ({ status, data });
const fail = (status, data) => ({ status, data });

/* =========================================================
   4. KHUNG KIỂM TRA
   ========================================================= */

const results = [];
const problems = [];
let capturedLogs = [];

const silenceConsole = () => {
  const original = { error: console.error, warn: console.warn, info: console.info, log: console.log };
  capturedLogs = [];
  for (const level of ["error", "warn", "info"]) {
    console[level] = (...args) => capturedLogs.push(`[${level}] ${args.map(String).join(" ")}`);
  }
  return () => Object.assign(console, original);
};

const resetState = ({
  sessionToken = null,
  localToken = null,
  user = null,
  pathname = "/processing-orders",
  sessionExtra = {},
  localExtra = {},
} = {}) => {
  requests = [];
  routes = [];
  dispatchedEvents.length = 0;
  sessionStorage.clear();
  localStorage.clear();
  if (sessionToken) sessionStorage.setItem("accessToken", sessionToken);
  if (localToken) localStorage.setItem("accessToken", localToken);
  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
  }
  Object.entries(sessionExtra).forEach(([key, value]) => sessionStorage.setItem(key, value));
  Object.entries(localExtra).forEach(([key, value]) => localStorage.setItem(key, value));
  fakeLocation.pathname = pathname;
  fakeLocation.replaced = [];
};

const check = async (scenario, run) => {
  let detail;
  const restore = silenceConsole();
  try {
    detail = await run();
  } catch (error) {
    detail = `ném lỗi ngoài dự kiến: ${String(error?.message ?? error).split("\n")[0]}`;
  } finally {
    restore();
  }
  const passed = detail === true;
  results.push({ scenario, passed });
  console.log(`${passed ? "PASS" : "FAIL"}  ${scenario}${passed ? "" : ` — ${detail}`}`);
  if (!passed) {
    problems.push(`${scenario}: ${detail}`);
    capturedLogs.slice(0, 5).forEach((line) => console.log(`        ${line.slice(0, 300)}`));
  }
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const expectEqual = (label, got, want) =>
  same(got, want) ? true : `${label} = ${JSON.stringify(got)} (cần ${JSON.stringify(want)})`;

const expectTrue = (label, value) => (value ? true : `${label} không đúng`);

const all = (...checks) => checks.find((c) => c !== true) ?? true;

/** Chạy promise; trả { resolved, value } hoặc { resolved: false, error }. */
const rejection = async (promise) => {
  try {
    const value = await promise;
    return { resolved: true, value };
  } catch (error) {
    return { resolved: false, error };
  }
};

const onlyRequest = () => (requests.length === 1 ? requests[0] : null);

const storageKeys = (storage) =>
  Array.from({ length: storage.length }, (_, index) => storage.key(index)).sort();

/**
 * Bản sao ĐÚNG logic submit của Login.jsx (:84-100 lưu phiên khi resolve, :126-128 chọn
 * câu báo lỗi) — component không chạy được trong Node, nên lặp lại đúng các dòng đó
 * trên kết quả thật của loginApi / googleLoginApi.
 */
const simulateLoginScreen = async (callApi) => {
  try {
    const userData = await callApi();
    if (userData && typeof userData === "object") {
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
      const tokenVal = userData.token || userData.accessToken;
      if (tokenVal) {
        localStorage.setItem("accessToken", tokenVal);
        sessionStorage.setItem("accessToken", tokenVal);
      }
    }
    return { ok: true, userData };
  } catch (error) {
    return {
      ok: false,
      error,
      toast:
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Email hoặc mật khẩu không chính xác.",
    };
  }
};

const GUID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";
const PACKAGE_CONFIG_ID = "7d9e4a12-3b5c-4f60-8a71-9e2b3c4d5e6f";
const PRODUCT_TYPE_ID = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const INSPECTION_RULE_ID = "b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d6e";
const INSURANCE_RULE_ID = "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f";
const USER = { userId: "u-1", fullName: "Nguyễn Văn A" };

const LOGIN_RESPONSE = {
  token: "jwt.header.payload",
  expiresAt: "2026-09-18T10:00:00Z",
  userId: "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0",
  fullName: "Nguyễn Văn A",
  role: "Customer",
  region: "CN",
};

const NOT_CUSTOMER_MESSAGE = "Tài khoản này không dùng được cho ứng dụng khách hàng.";
const NETWORK_MESSAGE = "Không kết nối được máy chủ. Vui lòng thử lại.";

const buildItem = (overrides = {}) => ({
  productName: "Bình gốm",
  productType: PRODUCT_TYPE_ID,
  quantity: 2,
  weight: 2.5,
  width: 30,
  height: 30,
  length: 40,
  declaredValue: 1500000,
  referenceUrls: ["https://cdn.example.test/a.jpg"],
  domesticTrackingCode: "SF123456789",
  packageConfigurationId: PACKAGE_CONFIG_ID,
  ...overrides,
});

const buildOrderPayload = (overrides = {}) => ({
  route: "Trung quốc --> Việt Nam",
  shippingOption: "ROAD",
  receiverName: "Nguyễn Văn B",
  receiverPhone: "0900000000",
  receiverAddress: "12 Lê Lợi, Q1, TP.HCM",
  pricingRuleIds: [],
  requiresInspection: false,
  requiresPacking: false,
  requiresWoodenCrate: false,
  requiresInsurance: false,
  note: "Hàng dễ vỡ",
  items: [buildItem(), buildItem({ productName: "Ấm trà", quantity: 1 })],
  ...overrides,
});

const makeFile = (name, type, size = 3) => new File([new Uint8Array(size)], name, { type });

/* =========================================================
   5. KỊCH BẢN
   ========================================================= */

if (loadError) {
  problems.push(`KHÔNG NẠP ĐƯỢC MODULE: ${String(loadError.message).split("\n")[0]}`);
} else {
  const {
    http: httpMod,
    auth,
    consignment,
    status,
    orderStatus,
    pricing,
    upload,
    restricted,
    receiving,
    notifications,
    quotationHelpers,
    payment,
    paymentUtils,
    orderHelpers,
    time,
    mock,
  } = mods;
  const httpClient = httpMod.default;

  httpClient.defaults.adapter = fakeAdapter;
  upload.uploadAxios.defaults.adapter = fakeAdapter;

  /* ---------- Hạ tầng httpClient ---------- */

  await check("httpClient: nạp được qua Vite SSR khi chưa có window/storage", () =>
    all(
      expectEqual("window lúc nạp", hadWindowAtLoad, false),
      expectEqual("storage lúc nạp", hadStorageAtLoad, false),
      expectTrue("export default là axios instance", typeof httpClient?.get === "function")
    )
  );

  await check("httpClient: base URL mặc định https://vcl.henrytech.cloud, timeout 30 giây", () =>
    all(
      expectEqual("API_BASE_URL", httpMod.API_BASE_URL, "https://vcl.henrytech.cloud"),
      expectEqual("defaults.baseURL", httpClient.defaults.baseURL, "https://vcl.henrytech.cloud"),
      expectEqual("defaults.timeout", httpClient.defaults.timeout, 30000),
      expectEqual("uploadAxios.baseURL", upload.uploadAxios.defaults.baseURL, "https://vcl.henrytech.cloud"),
      expectTrue("uploadAxios timeout dài hơn 30 giây", upload.uploadAxios.defaults.timeout > 30000)
    )
  );

  await check("httpClient: export isCanceledRequest nhận diện lỗi huỷ của axios", () =>
    all(
      expectEqual("CanceledError", httpMod.isCanceledRequest({ name: "CanceledError", code: "ERR_CANCELED", __CANCEL__: true }), true),
      expectEqual("lỗi 400", httpMod.isCanceledRequest(new AxiosError("x", "ERR_BAD_REQUEST")), false)
    )
  );

  await check("Token: gắn Bearer đọc sessionStorage trước rồi localStorage", async () => {
    resetState({ sessionToken: "tok-session", localToken: "tok-local" });
    routes = [{ method: "GET", url: "/api/orders/consignments/statuses", reply: () => ok({ message: "ok", data: [] }) }];
    await status.getConsignmentStatusesApi();
    const first = requests[0]?.authorization;
    sessionStorage.removeItem("accessToken");
    await status.getConsignmentStatusesApi();
    const second = requests[1]?.authorization;
    localStorage.removeItem("accessToken");
    await status.getConsignmentStatusesApi();
    const third = requests[2]?.authorization;
    return all(
      expectEqual("khi có cả hai", first, "Bearer tok-session"),
      expectEqual("chỉ localStorage", second, "Bearer tok-local"),
      expectEqual("không có token", third, null)
    );
  });

  await check("Token: URL /api/Auth/* không gắn Authorization", async () => {
    resetState({ sessionToken: "tok-cu", localToken: "tok-cu" });
    routes = [{ method: "POST", url: "/api/Auth/login", reply: () => ok(LOGIN_RESPONSE) }];
    await auth.loginApi("khach@vcl.vn", "matkhau123");
    return expectEqual("Authorization của /api/Auth/login", onlyRequest()?.authorization, null);
  });

  await check("Giờ server: response thành công gọi syncServerClock theo header date (RFC 1123)", async () => {
    resetState();
    time.resetServerClockSync?.();
    routes = [{ method: "GET", url: "/api/orders/consignments/routes", reply: () => ok({ message: "ok", data: [] }) }];
    await consignment.getConsignmentRoutesApi();
    return expectTrue("lastServerSyncAt đã có giá trị", Boolean(time.getServerClockStatus().lastServerSyncAt));
  });

  /* ---------- I/O matrix: Đăng nhập ---------- */

  await check("Đăng nhập: POST /api/Auth/login role Customer → loginApi trả object có token; Login lưu user + accessToken", async () => {
    resetState({ pathname: "/login" });
    routes = [{ method: "POST", url: "/api/Auth/login", reply: () => ok(LOGIN_RESPONSE) }];
    const screen = await simulateLoginScreen(() => auth.loginApi(" khach@vcl.vn ", "matkhau123"));
    const req = onlyRequest();
    const result = screen.userData;
    return all(
      expectEqual("resolve", screen.ok, true),
      expectEqual("method/url", `${req?.method} ${req?.url}`, "POST /api/Auth/login"),
      expectEqual("body", req?.body, { email: "khach@vcl.vn", password: "matkhau123" }),
      expectEqual("token", result?.token, LOGIN_RESPONSE.token),
      expectEqual("accessToken", result?.accessToken, LOGIN_RESPONSE.token),
      expectEqual("userId/fullName/role", [result?.userId, result?.fullName, result?.role], [LOGIN_RESPONSE.userId, LOGIN_RESPONSE.fullName, "Customer"]),
      expectEqual("accessToken đã lưu", [sessionStorage.getItem("accessToken"), localStorage.getItem("accessToken")], [LOGIN_RESPONSE.token, LOGIN_RESPONSE.token]),
      expectTrue("user đã lưu", JSON.parse(localStorage.getItem("user") || "{}").userId === LOGIN_RESPONSE.userId)
    );
  });

  await check("Đăng nhập: 401 { message: \"Invalid credentials\" } → lỗi \"Email hoặc mật khẩu không đúng.\"", async () => {
    resetState({ sessionToken: "tok-cu", localToken: "tok-cu", user: USER, pathname: "/login" });
    routes = [{ method: "POST", url: "/api/Auth/login", reply: () => fail(401, { message: "Invalid credentials" }) }];
    const screen = await simulateLoginScreen(() => auth.loginApi("khach@vcl.vn", "sai"));
    return all(
      expectEqual("reject", screen.ok, false),
      expectEqual("status", screen.error?.response?.status, 401),
      expectEqual("câu Login hiện", screen.toast, "Email hoặc mật khẩu không đúng."),
      expectTrue("vẫn là lỗi axios", screen.error?.isAxiosError === true),
      expectEqual("token cũ không bị xoá (URL Auth)", sessionStorage.getItem("accessToken"), "tok-cu"),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  await check("Đăng nhập: lỗi mạng / timeout (không có response) → \"Không kết nối được máy chủ. Vui lòng thử lại.\", không báo sai mật khẩu", async () => {
    resetState({ pathname: "/login" });
    routes = [{ method: "POST", url: "/api/Auth/login", reply: () => ({ networkError: true }) }];
    const network = await simulateLoginScreen(() => auth.loginApi("khach@vcl.vn", "matkhau123"));
    routes = [{ method: "POST", url: "/api/Auth/login", reply: () => ({ timeout: true }) }];
    const timeout = await simulateLoginScreen(() => auth.loginApi("khach@vcl.vn", "matkhau123"));

    /* Cả 9 hàm auth đều bọc lỗi không có response; route mất mạng cho mọi URL / method. */
    routes = ["GET", "POST", "PUT"].map((method) => ({ method, url: /.*/, reply: () => ({ networkError: true }) }));
    const authCalls = [
      ["loginApi", "POST /api/Auth/login", () => auth.loginApi("khach@vcl.vn", "matkhau123")],
      ["googleLoginApi", "POST /api/Auth/google", () => auth.googleLoginApi("id-token")],
      ["registerApi", "POST /api/Auth/customer/register", () => auth.registerApi({ fullName: "A", email: "a@vcl.vn", password: "12345678", phone: "0900000000", country: "Vietnam", address: "HN" })],
      ["verifyOtpApi", "POST /api/Auth/customer/verify-otp", () => auth.verifyOtpApi("a@vcl.vn", "123456")],
      ["resendOtpApi", "POST /api/Auth/customer/resend-otp", () => auth.resendOtpApi("a@vcl.vn")],
      ["forgotPasswordApi", "POST /api/Auth/forgot-password", () => auth.forgotPasswordApi("a@vcl.vn")],
      ["resetPasswordApi", "POST /api/Auth/reset-password", () => auth.resetPasswordApi("a@vcl.vn", "654321", "matkhaumoi")],
      ["getUserProfileApi", "GET /api/customer/profile", () => auth.getUserProfileApi()],
      ["updateUserProfileApi", "PUT /api/customer/profile", () => auth.updateUserProfileApi({ fullName: "B" })],
    ];
    const perFunction = [];
    for (const [name, endpoint, call] of authCalls) {
      const before = requests.length;
      const { resolved, error } = await rejection(call());
      const req = requests[before];
      perFunction.push(
        all(
          expectEqual(`${name}: gọi đúng endpoint`, `${req?.method} ${req?.url}`, endpoint),
          expectEqual(`${name}: reject`, resolved, false),
          expectEqual(`${name}: response.data.message`, error?.response?.data?.message, NETWORK_MESSAGE),
          expectEqual(`${name}: code axios giữ nguyên`, error?.code, "ERR_NETWORK"),
          expectTrue(`${name}: vẫn là lỗi axios`, error?.isAxiosError === true)
        )
      );
    }

    return all(
      expectEqual("mất mạng: câu Login hiện", network.toast, NETWORK_MESSAGE),
      expectEqual("mất mạng: code axios giữ nguyên", network.error?.code, "ERR_NETWORK"),
      expectEqual("timeout: câu Login hiện", timeout.toast, NETWORK_MESSAGE),
      expectEqual("timeout: code axios giữ nguyên", timeout.error?.code, "ECONNABORTED"),
      ...perFunction,
      expectEqual("không lưu token", [sessionStorage.getItem("accessToken"), localStorage.getItem("accessToken")], [null, null]),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  /* ---------- I/O matrix: Không phải khách ---------- */

  await check("Không phải khách: login / Google trả role khác Customer → lỗi 403 kèm message, không lưu token nào", async () => {
    resetState({ pathname: "/login" });
    routes = [
      { method: "POST", url: "/api/Auth/login", reply: () => ok({ ...LOGIN_RESPONSE, role: "Sale" }) },
      { method: "POST", url: "/api/Auth/google", reply: () => ok({ ...LOGIN_RESPONSE, role: "Admin" }) },
    ];
    const staff = await simulateLoginScreen(() => auth.loginApi("sale@vcl.vn", "matkhau123"));
    const google = await simulateLoginScreen(() => auth.googleLoginApi("id-token"));
    const keys = [storageKeys(sessionStorage), storageKeys(localStorage)];
    return all(
      expectEqual("login reject", staff.ok, false),
      expectEqual("login status", staff.error?.response?.status, 403),
      expectEqual("login message", staff.toast, NOT_CUSTOMER_MESSAGE),
      expectTrue("login lỗi dạng axios", staff.error?.isAxiosError === true),
      expectEqual("Google reject", google.ok, false),
      expectEqual("Google status", google.error?.response?.status, 403),
      expectEqual("Google message", google.toast, NOT_CUSTOMER_MESSAGE),
      expectEqual("storage không có gì được lưu", keys, [[], []]),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  await check("Đăng nhập Google + đăng ký + OTP + mật khẩu: đúng endpoint và body backend", async () => {
    resetState();
    routes = [
      { method: "POST", url: "/api/Auth/google", reply: () => ok(LOGIN_RESPONSE) },
      { method: "POST", url: "/api/Auth/customer/register", reply: () => ok({ message: "OTP da duoc gui den email cua ban." }) },
      { method: "POST", url: "/api/Auth/customer/verify-otp", reply: () => ok({ message: "Dang ky tai khoan thanh cong.", customerId: GUID }) },
      { method: "POST", url: "/api/Auth/customer/resend-otp", reply: () => ok({ message: "OTP moi da duoc gui den email cua ban." }) },
      { method: "POST", url: "/api/Auth/forgot-password", reply: () => ok({ message: "Email đặt lại mật khẩu đã được gửi." }) },
      { method: "POST", url: "/api/Auth/reset-password", reply: () => ok({ message: "Mật khẩu đã được đặt lại thành công." }) },
    ];
    const google = await auth.googleLoginApi(" id-token ");
    const register = await auth.registerApi({ fullName: " A ", email: "a@vcl.vn", password: "12345678", phone: "0900000000", country: "Vietnam", address: "12 Lê Lợi", extra: "bỏ" });
    const verify = await auth.verifyOtpApi("a@vcl.vn", "123456");
    const resend = await auth.resendOtpApi("a@vcl.vn");
    const forgot = await auth.forgotPasswordApi("a@vcl.vn");
    const reset = await auth.resetPasswordApi("a@vcl.vn", "654321", "matkhaumoi");
    const bodies = requests.map((r) => [r.url, r.body, r.authorization]);
    return all(
      expectEqual("google", bodies[0], ["/api/Auth/google", { idToken: "id-token" }, null]),
      expectEqual("google token", [google?.token, google?.accessToken], [LOGIN_RESPONSE.token, LOGIN_RESPONSE.token]),
      expectEqual("register", bodies[1], ["/api/Auth/customer/register", { fullName: "A", email: "a@vcl.vn", password: "12345678", phone: "0900000000", country: "Vietnam", address: "12 Lê Lợi" }, null]),
      expectEqual("register message", register?.message, "OTP da duoc gui den email cua ban."),
      expectEqual("verify-otp", bodies[2], ["/api/Auth/customer/verify-otp", { email: "a@vcl.vn", otp: "123456" }, null]),
      expectEqual("verify-otp không trả token", [verify?.token, verify?.customerId], [undefined, GUID]),
      expectEqual("resend-otp", bodies[3], ["/api/Auth/customer/resend-otp", { email: "a@vcl.vn" }, null]),
      expectTrue("resend message", Boolean(resend?.message)),
      expectEqual("forgot-password", bodies[4], ["/api/Auth/forgot-password", { email: "a@vcl.vn" }, null]),
      expectTrue("forgot message", Boolean(forgot?.message)),
      expectEqual("reset-password", bodies[5], ["/api/Auth/reset-password", { email: "a@vcl.vn", otp: "654321", newPassword: "matkhaumoi" }, null]),
      expectTrue("reset message", Boolean(reset?.message))
    );
  });

  await check("Hồ sơ: GET/PUT /api/customer/profile bóc { message, data }", async () => {
    resetState({ localToken: "tok-local" });
    const profile = { id: GUID, customerCode: "KH001", fullName: "Nguyễn Văn A", email: "a@vcl.vn", phone: "0900000000", country: "Vietnam", address: "HN", customerType: "INDIVIDUAL", status: "ACTIVE" };
    routes = [
      { method: "GET", url: "/api/customer/profile", reply: () => ok({ message: "ok", data: profile }) },
      { method: "PUT", url: "/api/customer/profile", reply: (req) => ok({ message: "ok", data: { ...profile, ...req.body } }) },
    ];
    const got = await auth.getUserProfileApi();
    const updated = await auth.updateUserProfileApi({ fullName: " B ", phone: "0911111111", country: "China", address: "SG", email: "khong-gui@vcl.vn" });
    return all(
      expectEqual("GET fullName/email", [got?.fullName, got?.email, got?.customerId], ["Nguyễn Văn A", "a@vcl.vn", GUID]),
      expectEqual("GET token", requests[0]?.authorization, "Bearer tok-local"),
      expectEqual("PUT body", requests[1]?.body, { fullName: "B", phone: "0911111111", country: "China", address: "SG" }),
      expectEqual("PUT trả hồ sơ đã bóc", [updated?.fullName, updated?.phone, "data" in (updated || {})], ["B", "0911111111", false])
    );
  });

  /* ---------- I/O matrix: Token hết hạn / 401 nghiệp vụ ---------- */

  await check("Token hết hạn: API bất kỳ trả 401 body rỗng → dọn phiên như Sidebar logout (sessionStorage sạch), chuyển /login", async () => {
    resetState({
      sessionToken: "tok-het-han",
      localToken: "tok-het-han",
      user: USER,
      pathname: "/processing-orders",
      sessionExtra: { phone: "0900000000", fullName: "Nguyễn Văn A", email: "a@vcl.vn", sidebarProfileSynced: "true" },
      localExtra: { rememberedEmail: "a@vcl.vn" },
    });
    routes = [{ method: "GET", url: "/api/orders/consignments", reply: () => fail(401, "") }];
    const { resolved, error } = await rejection(consignment.getConsignmentsApi({ params: { pageNumber: 1, pageSize: 10 } }));
    return all(
      expectEqual("reject", resolved, false),
      expectEqual("status", error?.response?.status, 401),
      expectEqual("sessionStorage còn lại", storageKeys(sessionStorage), []),
      expectEqual("localStorage còn lại (chỉ giữ khoá không thuộc phiên)", storageKeys(localStorage), ["rememberedEmail"]),
      expectEqual("phát sự kiện storage cho header", dispatchedEvents, ["storage"]),
      expectEqual("window.location.replace", fakeLocation.replaced, ["/login"])
    );
  });

  await check("Token hết hạn: đang ở /login thì chỉ dọn phiên, không chuyển trang lần nữa", async () => {
    resetState({ localToken: "tok-het-han", user: USER, pathname: "/login" });
    routes = [{ method: "GET", url: "/api/customer/profile", reply: () => fail(401, "") }];
    await rejection(auth.getUserProfileApi());
    return all(
      expectEqual("accessToken", localStorage.getItem("accessToken"), null),
      expectEqual("window.location.replace", fakeLocation.replaced, [])
    );
  });

  await check("401 nghiệp vụ: GET /api/orders/consignments/{id} trả 401 { message } → không đăng xuất, lỗi mang message", async () => {
    resetState({ sessionToken: "tok-ok", localToken: "tok-ok", user: USER, sessionExtra: { phone: "0900000000" } });
    const message = "Bạn không có quyền xem yêu cầu ký gửi này.";
    routes = [{ method: "GET", url: `/api/orders/consignments/${GUID}`, reply: () => fail(401, { message }) }];
    const { resolved, error } = await rejection(consignment.getConsignmentDetailApi(GUID));
    return all(
      expectEqual("reject", resolved, false),
      expectEqual("status", error?.response?.status, 401),
      expectEqual("message hiện ra", orderHelpers.getApiErrorMessage(error), message),
      expectEqual("token giữ nguyên", [sessionStorage.getItem("accessToken"), localStorage.getItem("accessToken")], ["tok-ok", "tok-ok"]),
      expectEqual("phiên giữ nguyên", [localStorage.getItem("user"), sessionStorage.getItem("phone")], [JSON.stringify(USER), "0900000000"]),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  /* ---------- I/O matrix: Dữ liệu form ---------- */

  await check("Dữ liệu form: routes/shipping-options { message, data: string[] }, product-types { data: [{id,name}] } → dropdown có dữ liệu", async () => {
    resetState();
    routes = [
      { method: "GET", url: "/api/orders/consignments/routes", reply: () => ok({ message: "ok", data: ["Trung quốc --> Việt Nam"] }) },
      { method: "GET", url: "/api/orders/consignments/shipping-options", reply: () => ok({ message: "ok", data: ["EXPRESS", "ROAD"] }) },
      { method: "GET", url: "/api/product-types", reply: () => ok({ message: "ok", data: [{ id: PRODUCT_TYPE_ID, name: "Gốm sứ" }] }) },
    ];
    const signal = new AbortController().signal;
    const [routesResult, shippingResult, productTypesResult] = await Promise.all([
      consignment.getConsignmentRoutesApi({ signal }),
      consignment.getConsignmentShippingOptionsApi({ signal }),
      consignment.getProductTypesApi({ signal }),
    ]);
    const routeOptions = orderHelpers.normalizeOptionList(routesResult, ["routes"]);
    const shippingOptions = orderHelpers.normalizeShippingOptionList(shippingResult);
    const productTypeOptions = orderHelpers.normalizeOptionList(productTypesResult, ["productTypes"]);
    return all(
      expectEqual("routes trả mảng", routesResult, ["Trung quốc --> Việt Nam"]),
      expectEqual("route option", routeOptions, [{ value: "Trung quốc --> Việt Nam", label: "Trung quốc --> Việt Nam" }]),
      expectEqual("shipping values", shippingOptions.map((o) => o.value), ["EXPRESS", "ROAD"]),
      expectEqual("product type option (value = id)", productTypeOptions, [{ value: PRODUCT_TYPE_ID, label: "Gốm sứ" }]),
      expectEqual("không gắn token khi chưa đăng nhập", requests.map((r) => r.authorization), [null, null, null])
    );
  });

  await check("Dữ liệu form: dịch vụ theo kiện GET item-services?route&shippingOption → { data: [...] }; thiếu một trong hai thì không gửi tham số", async () => {
    resetState();
    const service = { pricingRuleId: INSPECTION_RULE_ID, code: "SUR_INSPECTION", name: "Phụ phí kiểm hàng", ruleType: "INSPECTION", calculationType: "FIXED", value: 10000, minAmount: null, maxAmount: null, description: null };
    routes = [{ method: "GET", url: "/api/orders/consignments/item-services", reply: () => ok({ message: "ok", data: [service, { code: "BROKEN" }] }) }];
    const signal = new AbortController().signal;
    const withRoute = await consignment.getConsignmentItemServicesApi({ route: "Trung quốc --> Việt Nam", shippingOption: "ROAD" }, { signal });
    const withoutOption = await consignment.getConsignmentItemServicesApi({ route: "Trung quốc --> Việt Nam" }, { signal });
    return all(
      expectEqual("params đủ", requests[0]?.params, { route: "Trung quốc --> Việt Nam", shippingOption: "ROAD" }),
      expectEqual("thiếu shippingOption → không gửi params", requests[1]?.params ?? {}, {}),
      expectEqual("bỏ dòng thiếu pricingRuleId", withRoute.map((s) => s.pricingRuleId), [INSPECTION_RULE_ID]),
      expectEqual("lần 2 cùng dữ liệu", withoutOption.length, 1)
    );
  });

  await check("Dữ liệu form: package-configurations mảng trần → getPackageConfigurations có id thật; pricing-rules gửi orderType=CONSIGNMENT", async () => {
    resetState();
    const configs = [
      { id: PACKAGE_CONFIG_ID, configCode: "SMALL", configName: "Thùng nhỏ", length: 40, width: 30, height: 30, maxWeight: 20, packageFee: 180000, status: "ACTIVE" },
    ];
    const rules = [
      { id: "11111111-2222-4333-8444-555555555555", ruleName: "Hệ số thể tích", ruleCode: "VOLUMETRIC_DIVISOR", ruleType: "SYSTEM_PARAMETER", calculationType: "FORMULA", value: 5000, status: "ACTIVE" },
      { id: "66666666-7777-4888-9999-aaaaaaaaaaaa", ruleName: "Đóng thùng gỗ", ruleCode: "WOOD_CRATE", ruleType: "PACKING", calculationType: "FIXED", value: 200000, status: "ACTIVE" },
    ];
    routes = [
      { method: "GET", url: "/api/package-configurations", reply: () => ok(configs) },
      { method: "GET", url: "/api/pricing-rules", reply: () => ok(rules) },
    ];
    const packageConfigurations = await pricing.getPackageConfigurations({ onlyActive: true });
    const pricingRules = await pricing.getPricingRules({ onlyActive: false });
    const divisor = await pricing.getVolumetricDivisorRule();
    const pricingRequests = requests.filter((r) => r.url === "/api/pricing-rules");
    return all(
      expectEqual("package config ids", packageConfigurations.map((c) => [c.id, c.packageConfigurationId, c.configCode]), [[PACKAGE_CONFIG_ID, PACKAGE_CONFIG_ID, "SMALL"]]),
      expectEqual("không dùng /options", requests.some((r) => String(r.url).includes("/options")), false),
      expectEqual("pricing rules", pricingRules.map((r) => r.ruleCode), ["VOLUMETRIC_DIVISOR", "WOOD_CRATE"]),
      expectEqual("params pricing-rules", pricingRequests.map((r) => r.params), [{ orderType: "CONSIGNMENT" }, { orderType: "CONSIGNMENT" }]),
      expectEqual("getVolumetricDivisorRule đọc rule thật", [divisor?.value, divisor?.isFallback], [5000, undefined])
    );
  });

  await check("Hệ số thể tích: thiếu rule VOLUMETRIC_DIVISOR hoặc value 0 → dùng 6000, isFallback, console.warn", async () => {
    resetState();
    let rules = [{ id: "66666666-7777-4888-9999-aaaaaaaaaaaa", ruleCode: "WOOD_CRATE", ruleType: "PACKING", calculationType: "FIXED", value: 200000, status: "ACTIVE" }];
    routes = [{ method: "GET", url: "/api/pricing-rules", reply: () => ok(rules) }];
    const missing = await pricing.getVolumetricDivisorRule();
    const warnsAfterMissing = capturedLogs.filter((l) => l.startsWith("[warn]") && l.includes("VOLUMETRIC_DIVISOR")).length;
    rules = [{ id: "11111111-2222-4333-8444-555555555555", ruleCode: "VOLUMETRIC_DIVISOR", ruleType: "SYSTEM_PARAMETER", calculationType: "FORMULA", value: 0, status: "ACTIVE" }];
    const zero = await pricing.getVolumetricDivisorRule();
    const warnsAfterZero = capturedLogs.filter((l) => l.startsWith("[warn]") && l.includes("VOLUMETRIC_DIVISOR")).length;
    return all(
      expectEqual("thiếu rule", [missing?.value, missing?.isFallback, missing?.ruleCode], [6000, true, "VOLUMETRIC_DIVISOR"]),
      expectEqual("warn khi thiếu rule", warnsAfterMissing, 1),
      expectEqual("value 0", [zero?.value, zero?.isFallback], [6000, true]),
      expectEqual("warn khi value 0", warnsAfterZero, 2)
    );
  });

  await check("Dữ liệu form: gợi ý thùng POST /api/package-configurations/suggest trả id cấu hình thật", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      {
        method: "POST",
        url: "/api/package-configurations/suggest",
        reply: () => ok({ id: PACKAGE_CONFIG_ID, configCode: "SMALL", configName: "Thùng nhỏ", length: 40, width: 30, height: 30, maxWeight: 20, packageFee: 180000, status: "ACTIVE", estimatedFee: 180000 }),
      },
    ];
    const suggestion = await pricing.suggestPackageConfiguration({ length: "40", width: 30, height: 30, weight: 2.5 });
    const req = onlyRequest();
    return all(
      expectEqual("body", req?.body, { length: 40, width: 30, height: 30, weight: 2.5 }),
      expectEqual("token", req?.authorization, "Bearer tok-local"),
      expectEqual("id gợi ý", [suggestion?.id, suggestion?.configCode], [PACKAGE_CONFIG_ID, "SMALL"]),
      expectTrue("suggestionMessage", Boolean(suggestion?.suggestionMessage))
    );
  });

  await check("Dữ liệu form: trạng thái đơn → mã chuẩn dùng nhãn orderStatus.js theo ORDER_STATUS_ORDER, mã lạ giữ nhãn backend và xếp cuối", async () => {
    resetState();
    /* Đúng danh sách OrderService.GetConsignmentStatuses() của backend production. */
    const backendStatuses = [
      ["PENDING_REVIEW", "Chờ duyệt"],
      ["QUOTATION_SENT", "Đã gửi báo giá"],
      ["APPROVED", "Đã duyệt"],
      ["QUOTATION_CONFIRMED", "Khách đã chốt báo giá"],
      ["DEPOSIT_PAID", "Đã đặt cọc"],
      ["CHECKED_IN", "Đã nhập kho"],
      ["WAREHOUSE_RECEIVED", "Đã lưu kho"],
      ["IN_TRANSIT", "Đang vận chuyển"],
      ["AT_DESTINATION_WAREHOUSE", "Đã lưu kho tại kho đích"],
      ["WAITING_FINAL_PAYMENT", "Chờ thanh toán cuối"],
      ["DELIVERED", "Đã giao tới khách"],
      ["CUSTOMER_CONFIRMED", "Khách đã xác nhận nhận hàng"],
      ["CANCELLED_FORFEITED", "Huỷ do quá hạn thanh toán, mất cọc"],
      ["REJECTED", "Đã từ chối"],
      ["QUOTATION_REJECTED", "Báo giá bị từ chối"],
      ["CANCELLED", "Đã hủy"],
      ["COMPLETED", "Hoàn tất"],
    ];
    routes = [
      {
        method: "GET",
        url: "/api/orders/consignments/statuses",
        reply: () => ok({ message: "ok", data: backendStatuses.map(([code, label]) => ({ code, label })) }),
      },
    ];
    const list = await status.getConsignmentStatusesApi(new AbortController().signal);
    const { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER, getOrderStatusLabel } = orderStatus;
    const standard = backendStatuses
      .map(([code]) => code)
      .filter((code) => code in ORDER_STATUS_LABELS)
      .sort((a, b) => ORDER_STATUS_ORDER.indexOf(a) - ORDER_STATUS_ORDER.indexOf(b));
    const unknown = backendStatuses.filter(([code]) => !(code in ORDER_STATUS_LABELS));
    const wanted = [
      ...standard.map((code) => [code, ORDER_STATUS_LABELS[code]]),
      ...unknown,
    ];
    return all(
      expectTrue("là mảng", Array.isArray(list)),
      expectEqual("[code, label] theo thứ tự", list.map((s) => [s.code, s.label]), wanted),
      expectEqual("alias value/status/name", list.slice(0, 1).map((s) => [s.value, s.status, s.statusCode, s.name, s.displayName, s.statusName]), [["PENDING_REVIEW", "PENDING_REVIEW", "PENDING_REVIEW", "Chờ duyệt", "Chờ duyệt", "Chờ duyệt"]]),
      expectEqual(
        "mã chuẩn: nhãn dropdown = nhãn chip",
        list.filter((s) => s.code in ORDER_STATUS_LABELS).every((s) => s.label === getOrderStatusLabel(s.code)),
        true
      ),
      expectEqual("APPROVED dùng nhãn app", list.find((s) => s.code === "APPROVED")?.label, "Đã xác nhận")
    );
  });

  await check("Dữ liệu form: hàng cấm GET /api/restricted-items (cần token) — chưa đăng nhập thì không gọi", async () => {
    resetState();
    const anonymous = await restricted.getRestrictedItemListApi();
    const anonymousRequests = requests.length;
    resetState({ localToken: "tok-local" });
    routes = [{ method: "GET", url: "/api/restricted-items", reply: () => ok([{ id: GUID, itemName: "Pin lithium", restrictionType: "BANNED" }]) }];
    const list = await restricted.getRestrictedItemListApi({ signal: new AbortController().signal });
    return all(
      expectEqual("chưa đăng nhập", [anonymous, anonymousRequests], [[], 0]),
      expectEqual("token", onlyRequest()?.authorization, "Bearer tok-local"),
      expectEqual("mảng", list.map((i) => i.itemName), ["Pin lithium"])
    );
  });

  await check("Dữ liệu form: sổ địa chỉ GET mảng trần / POST { message, data } / DELETE", async () => {
    resetState({ localToken: "tok-local" });
    const row = { id: GUID, customerId: "c-1", address: "12 Lê Lợi, Q1, TP.HCM", createdAt: "2026-09-17T01:00:00Z" };
    routes = [
      { method: "GET", url: "/api/delivery-addresses", reply: () => ok([row]) },
      { method: "POST", url: "/api/delivery-addresses", reply: (req) => ok({ message: "Thêm địa chỉ thành công.", data: { ...row, address: req.body.address } }) },
      { method: "DELETE", url: `/api/delivery-addresses/${GUID}`, reply: () => ok({ message: "Xóa địa chỉ thành công." }) },
    ];
    const list = await consignment.getDeliveryAddressesApi();
    const normalized = orderHelpers.normalizeDeliveryAddressList(list);
    const created = await consignment.createDeliveryAddressApi({ address: " 45 Nguyễn Trãi ", provinceCode: 1 });
    const removed = await consignment.deleteDeliveryAddressApi(GUID);
    return all(
      expectEqual("dropdown địa chỉ", normalized.map((a) => [a.apiId, a.address]), [[GUID, "12 Lê Lợi, Q1, TP.HCM"]]),
      expectEqual("POST body chỉ có address", requests[1]?.body, { address: "45 Nguyễn Trãi" }),
      expectEqual("POST bóc data", [created?.id, created?.address, created?.fullAddress], [GUID, "45 Nguyễn Trãi", "45 Nguyễn Trãi"]),
      expectEqual("DELETE", [requests[2]?.method, requests[2]?.url, removed?.success], ["DELETE", `/api/delivery-addresses/${GUID}`, true])
    );
  });

  /* ---------- I/O matrix: Tạo đơn ---------- */

  await check("Tạo đơn: upload ảnh thật POST /api/uploads/images, multipart field \"files\", trả mảng URL", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      {
        method: "POST",
        url: "/api/uploads/images",
        reply: (req) => ok({ message: "Upload 2 ảnh thành công.", urls: req.rawData.getAll("files").map((f) => `https://res.cloudinary.test/${f.name}`) }),
      },
    ];
    const fileA = makeFile("a.jpg", "image/jpeg");
    const fileB = makeFile("b.png", "image/png");
    const urls = await upload.uploadImages([fileA, fileB]);
    const single = await upload.uploadImage(makeFile("c.webp", "image/webp"));
    const req = requests[0];
    const imageUrl = orderHelpers.extractUploadedImageUrl(single);
    return all(
      expectEqual("method/url", `${req?.method} ${req?.url}`, "POST /api/uploads/images"),
      expectTrue("body là FormData", typeof req?.rawData?.getAll === "function"),
      expectEqual("field files", req?.rawData?.getAll?.("files")?.map((f) => f.name), ["a.jpg", "b.png"]),
      expectEqual("không có field file", req?.rawData?.getAll?.("file")?.length, 0),
      expectEqual("token", req?.authorization, "Bearer tok-local"),
      expectEqual("timeout riêng của upload", req?.timeout > 30000, true),
      expectEqual("mảng URL", urls, ["https://res.cloudinary.test/a.jpg", "https://res.cloudinary.test/b.png"]),
      expectEqual("uploadImage → URL đầu", imageUrl, "https://res.cloudinary.test/c.webp")
    );
  });

  await check("Tạo đơn: progress upload 50% → onUploadProgress nhận 50", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      {
        method: "POST",
        url: "/api/uploads/images",
        reply: () => ({ status: 200, data: { message: "ok", urls: ["https://res.cloudinary.test/a.jpg"] }, uploadProgress: [{ loaded: 512, total: 1024 }] }),
      },
    ];
    const seen = [];
    const urls = await upload.uploadImages([makeFile("a.jpg", "image/jpeg")], (percent) => seen.push(percent));
    return all(expectEqual("phần trăm", seen, [50]), expectEqual("URL", urls, ["https://res.cloudinary.test/a.jpg"]));
  });

  await check("Tạo đơn: ảnh > 5MB, ảnh HEIC hoặc > 10 ảnh bị chặn trước khi gửi (0 request)", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "POST", url: "/api/uploads/images", reply: () => ok({ message: "ok", urls: [] }) }];
    const big = await rejection(upload.uploadImages([makeFile("to.jpg", "image/jpeg", 5 * 1024 * 1024 + 1)]));
    const heic = await rejection(upload.uploadImage(makeFile("iphone.heic", "image/heic")));
    const tooMany = await rejection(upload.uploadImages(Array.from({ length: 11 }, (_, i) => makeFile(`${i}.png`, "image/png"))));
    const exactLimit = await rejection(upload.uploadImages([makeFile("vua.jpg", "image/jpeg", 5 * 1024 * 1024)]));
    return all(
      expectEqual("ảnh > 5MB reject", big.resolved, false),
      expectTrue("câu báo 5MB", /5MB/.test(String(big.error?.message))),
      expectEqual("HEIC reject", heic.resolved, false),
      expectTrue("câu báo JPG/PNG/WEBP", /JPG, PNG hoặc WEBP/.test(String(heic.error?.message))),
      expectEqual("11 ảnh reject", tooMany.resolved, false),
      expectTrue("câu báo tối đa 10", /tối đa 10/.test(String(tooMany.error?.message))),
      expectEqual("3 ca bị chặn không gửi request; ảnh đúng 5MB vẫn gửi", [requests.length, exactLimit.resolved], [1, true])
    );
  });

  await check("Tạo đơn: kiểm hàng POST /api/orders/consignments/validate-items { items }", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "POST", url: "/api/orders/consignments/validate-items", reply: () => ok({ message: "ok", data: { canCreate: true, results: [] } }) }];
    const result = await consignment.validateConsignmentItemsApi([buildItem()]);
    const req = onlyRequest();
    return all(
      expectEqual("số dòng", req?.body?.items?.length, 1),
      expectEqual("packageConfigurationId", req?.body?.items?.[0]?.packageConfigurationId, PACKAGE_CONFIG_ID),
      expectEqual("kết quả", [result?.isValid, result?.valid, result?.items?.length], [true, true, 1])
    );
  });

  await check("Tạo đơn: form hợp lệ → POST 201, dịch vụ đi theo kiện items[].services, không gửi trường cấp đơn đã bỏ; mọi dòng có packageConfigurationId; đơn PENDING_REVIEW có trong danh sách", async () => {
    resetState({ sessionToken: "tok-session", localToken: "tok-session" });
    const created = {
      orderId: GUID,
      consignmentCode: "VCL-20260917-0001",
      customerId: "c-1",
      userId: "u-1",
      status: "PENDING_REVIEW",
      consignmentType: "ROAD",
      route: "Trung quốc --> Việt Nam",
      requiresInspection: false,
      itemCount: 3,
      pricingRuleIds: [],
      quotation: { quotationId: GUID, status: "DRAFT", totalEstimatedCost: 2350000 },
      warnings: [],
    };
    const stored = [];
    routes = [
      {
        method: "POST",
        url: "/api/orders/consignments",
        reply: () => {
          stored.push({ orderId: GUID, consignmentCode: created.consignmentCode, orderType: "CONSIGNMENT", status: "PENDING_REVIEW", createdAt: "2026-09-17T02:00:00Z" });
          return ok({ message: "Tạo yêu cầu ký gửi thành công.", data: created }, 201);
        },
      },
      {
        method: "GET",
        url: "/api/orders/consignments",
        reply: (req) => ok({ message: "ok", data: { items: stored, totalCount: stored.length, pageNumber: req.params.pageNumber, pageSize: req.params.pageSize, totalPages: 1 } }),
      },
    ];
    /* Form cũ vẫn có thể còn các cờ cấp đơn (buildOrderPayload giữ lại) — phải bị lọc bỏ. */
    const result = await consignment.createConsignmentApi(
      buildOrderPayload({
        pricingRuleIds: [INSPECTION_RULE_ID],
        requiresInspection: true,
        items: [
          buildItem({ serviceIds: [INSPECTION_RULE_ID, INSURANCE_RULE_ID, INSPECTION_RULE_ID] }),
          buildItem({ productName: "Ấm trà", quantity: 1 }),
        ],
      })
    );
    const req = requests[0];
    /* Màn /processing-orders (ConsignmentList) tải danh sách bằng đúng kiểu gọi này. */
    const list = await consignment.getConsignmentsApi({ params: { pageNumber: 1, pageSize: 100 }, signal: new AbortController().signal });
    return all(
      expectEqual("method/url", `${req?.method} ${req?.url}`, "POST /api/orders/consignments"),
      expectEqual("token", req?.authorization, "Bearer tok-session"),
      expectEqual(
        "không gửi trường cấp đơn đã bỏ",
        ["pricingRuleIds", "requiresInspection", "requiresPacking", "requiresWoodenCrate", "requiresInsurance"].filter((k) => k in (req?.body || {})),
        []
      ),
      expectEqual(
        "services theo kiện (bỏ trùng; kiện không chọn gửi [])",
        req?.body?.items?.map((i) => i.services),
        [[{ pricingRuleId: INSPECTION_RULE_ID }, { pricingRuleId: INSURANCE_RULE_ID }], []]
      ),
      expectEqual("không lộ serviceIds nội bộ", req?.body?.items?.some((i) => "serviceIds" in i), false),
      expectEqual("packageConfigurationId từng dòng", req?.body?.items?.map((i) => i.packageConfigurationId), [PACKAGE_CONFIG_ID, PACKAGE_CONFIG_ID]),
      expectEqual("productType gửi id loại hàng", req?.body?.items?.[0]?.productType, PRODUCT_TYPE_ID),
      expectEqual("route gửi nguyên tên hiển thị", req?.body?.route, "Trung quốc --> Việt Nam"),
      expectEqual("referenceUrls là mảng", req?.body?.items?.[0]?.referenceUrls, ["https://cdn.example.test/a.jpg"]),
      expectEqual("trả đơn đã bóc", [result?.orderId, result?.status, result?.consignmentCode, result?.orderCode, "message" in (result || {})], [GUID, "PENDING_REVIEW", "VCL-20260917-0001", "VCL-20260917-0001", false]),
      expectEqual("đơn mới trong danh sách", list.items.map((i) => [i.orderId, i.status, i.orderCode]), [[GUID, "PENDING_REVIEW", "VCL-20260917-0001"]])
    );
  });

  await check("Tạo đơn: thiếu cấu hình thùng ở một dòng → báo lỗi tiếng Việt, không gọi mạng", async () => {
    resetState({ localToken: "tok-local" });
    const { resolved, error } = await rejection(
      consignment.createConsignmentApi(buildOrderPayload({ items: [buildItem(), buildItem({ packageConfigurationId: "" })] }))
    );
    return all(
      expectEqual("reject", resolved, false),
      expectTrue("message nhắc thùng gỗ ở kiện 2", /Kiện hàng 2: .*thùng gỗ/i.test(String(error?.message))),
      expectEqual("số request", requests.length, 0)
    );
  });

  await check("Tạo đơn: 400 { message } → toast hiện message, form giữ nguyên (không đăng xuất)", async () => {
    resetState({ localToken: "tok-local", user: USER });
    const message = "Không thể tạo ký gửi. Các mặt hàng sau thuộc danh mục cấm: Pin lithium";
    routes = [{ method: "POST", url: "/api/orders/consignments", reply: () => fail(400, { message }) }];
    const { resolved, error } = await rejection(consignment.createConsignmentApi(buildOrderPayload()));
    return all(
      expectEqual("reject", resolved, false),
      expectEqual("status", error?.response?.status, 400),
      expectEqual("message", orderHelpers.getApiErrorMessage(error, "fallback"), message),
      expectEqual("token giữ nguyên", localStorage.getItem("accessToken"), "tok-local"),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  await check("Tạo đơn: 400 ValidationProblemDetails → error.response.data (title/errors) nguyên vẹn cho toast", async () => {
    resetState({ localToken: "tok-local" });
    const problem = {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      title: "One or more validation errors occurred.",
      status: 400,
      errors: { "Items[0].Quantity": ["Số lượng phải lớn hơn 0."] },
    };
    routes = [{ method: "POST", url: "/api/orders/consignments", reply: () => fail(400, problem) }];
    const { resolved, error } = await rejection(consignment.createConsignmentApi(buildOrderPayload()));
    return all(
      expectEqual("reject", resolved, false),
      expectEqual("errors", error?.response?.data?.errors, problem.errors),
      expectEqual("toast đọc title", orderHelpers.getApiErrorMessage(error), problem.title),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  /* ---------- I/O matrix: Danh sách ---------- */

  const listPage = (items, totalCount, pageNumber, pageSize) => ({
    message: "Lấy danh sách yêu cầu ký gửi thành công.",
    data: { items, totalCount, pageNumber, pageSize, totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0 },
  });

  const listRow = {
    orderId: GUID,
    consignmentCode: "VCL-20260917-0001",
    orderType: "CONSIGNMENT",
    customerName: "Nguyễn Văn A",
    consignmentType: "ROAD",
    status: "PENDING_REVIEW",
    route: "Trung quốc --> Việt Nam",
    createdAt: "2026-09-17T02:00:00Z",
    itemNames: ["Bình gốm", "Ấm trà"],
  };

  await check("Danh sách: {pageNumber, pageSize, search, status, fromDate, toDate} → chỉ gửi pageNumber/pageSize/status/searchCode/orderType=CONSIGNMENT, trả đủ alias phân trang", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "GET", url: "/api/orders/consignments", reply: (req) => ok(listPage([listRow], 6, req.params.pageNumber, req.params.pageSize)) }];
    const result = await consignment.getConsignmentsApi({
      pageNumber: 2,
      pageSize: 5,
      search: " VCL-2026 ",
      status: "PENDING_REVIEW",
      fromDate: "2026-09-01",
      toDate: "2026-09-17",
    });
    const req = onlyRequest();
    return all(
      expectEqual("params", req?.params, { pageNumber: 2, pageSize: 5, status: "PENDING_REVIEW", searchCode: "VCL-2026", orderType: "CONSIGNMENT" }),
      expectEqual("khoá trả về", Object.keys(result || {}).sort(), ["items", "page", "pageNumber", "pageSize", "size", "total", "totalCount", "totalPages"]),
      expectEqual("giá trị phân trang", [result.total, result.totalCount, result.page, result.pageNumber, result.size, result.pageSize, result.totalPages], [6, 6, 2, 2, 5, 5, 2]),
      expectEqual("bản ghi có alias mã đơn", result.items.map((i) => [i.orderId, i.status, i.orderCode, i.trackingCode]), [[GUID, "PENDING_REVIEW", "VCL-20260917-0001", "VCL-20260917-0001"]])
    );
  });

  await check("Danh sách: mọi kiểu gọi đang có trong app chỉ gửi tham số backend nhận, luôn có orderType=CONSIGNMENT", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "GET", url: "/api/orders/consignments", reply: (req) => ok(listPage([], 0, req.params.pageNumber, req.params.pageSize)) }];
    const signal = new AbortController().signal;
    const allowed = ["pageNumber", "pageSize", "status", "searchCode", "orderType"];
    /* Dashboard / FloatingChat */
    const empty = await consignment.getConsignmentsApi(1, 30, { signal });
    /* ConsignmentHistoryList: (page, size, { signal, params: requestFilters }) */
    await consignment.getConsignmentsApi(3, 20, { signal, params: { search: "VCL-9", status: "CANCELLED", fromDate: "2026-09-01", toDate: undefined } });
    /* ConsignmentListCheck / usePendingQuotationCounts */
    await consignment.getConsignmentsApi({ params: { pageNumber: 1, pageSize: 100, status: "QUOTATION_SENT", orderType: "PURCHASE", fromDate: "2026-01-01" }, signal });
    /* ReceiveGoods kiểu cũ */
    await consignment.getConsignmentsApi({ pageNumber: 1, pageSize: 50, keyword: "VCL-7", status: "", toDate: "2026-09-17" });
    const params = requests.map((r) => r.params);
    return all(
      expectEqual("(1, 30, { signal })", params[0], { pageNumber: 1, pageSize: 30, orderType: "CONSIGNMENT" }),
      expectEqual("(page, size, { params })", params[1], { pageNumber: 3, pageSize: 20, status: "CANCELLED", searchCode: "VCL-9", orderType: "CONSIGNMENT" }),
      expectEqual("({ params })", params[2], { pageNumber: 1, pageSize: 100, status: "QUOTATION_SENT", orderType: "CONSIGNMENT" }),
      expectEqual("({ keyword, status rỗng })", params[3], { pageNumber: 1, pageSize: 50, searchCode: "VCL-7", orderType: "CONSIGNMENT" }),
      expectEqual("không lọt khoá lạ", params.flatMap((p) => Object.keys(p)).filter((k) => !allowed.includes(k)), []),
      expectEqual("danh sách rỗng giữ totalPages ≥ 1 như mock", [empty.items, empty.totalCount, empty.totalPages], [[], 0, 1])
    );
  });

  await check("Lịch sử ký gửi: mở /history/consignment → ô lọc ngày bị khoá, placeholder tìm theo mã VCL-", () => {
    if (historyRender.error) {
      return `render SSR lỗi: ${String(historyRender.error?.message ?? historyRender.error).split("\n")[0]}`;
    }
    const inputs = historyRender.html.match(/<input[^>]*>/g) || [];
    const dateInputs = inputs.filter((tag) => /date-range="(start|end)"/.test(tag));
    const searchInput = inputs.find((tag) => /placeholder="Tìm theo mã VCL-\.\.\."/.test(tag));
    return all(
      expectEqual("số ô ngày", dateInputs.length, 2),
      expectEqual("cả hai ô ngày disabled", dateInputs.every((tag) => /\sdisabled=""/.test(tag)), true),
      expectTrue("ô tìm kiếm có placeholder \"Tìm theo mã VCL-...\"", Boolean(searchInput)),
      expectEqual("ô tìm kiếm không bị khoá", /\sdisabled=""/.test(searchInput || ""), false),
      expectEqual("không còn hứa tìm theo sản phẩm/người nhận", /sản phẩm, người nhận/.test(historyRender.html), false),
      expectEqual("không có cảnh báo antd khi render", historyRender.logs.filter((l) => /Warning/.test(l)), [])
    );
  });

  await check("Chi tiết: GET /api/orders/consignments/{guid} bóc { message, data }; id không phải GUID → 404, không gọi mạng", async () => {
    resetState({ localToken: "tok-local" });
    const detail = { ...listRow, items: [{ id: GUID, productName: "Bình gốm", quantity: 2, referenceUrls: ["https://x/a.jpg"], packageConfigurationId: PACKAGE_CONFIG_ID }], quotation: null };
    routes = [{ method: "GET", url: `/api/orders/consignments/${GUID}`, reply: () => ok({ message: "ok", data: detail }) }];
    const result = await consignment.getConsignmentDetailApi(GUID, { signal: new AbortController().signal });
    const requestCount = requests.length;
    const { resolved, error } = await rejection(consignment.getConsignmentDetailApi("VCL-20260917-0001"));
    return all(
      expectEqual("đã bóc data", [result?.orderId, result?.items?.length, "message" in (result || {})], [GUID, 1, false]),
      expectEqual("alias mã đơn", result?.orderCode, "VCL-20260917-0001"),
      expectEqual("không phải GUID", [resolved, error?.response?.status, requests.length - requestCount], [false, 404, 0])
    );
  });

  /* ---------- I/O matrix: Huỷ đơn ---------- */

  await check("Huỷ đơn: cancelConsignmentApi(id, reason) → PUT body { cancelReason }; lý do rỗng → {}", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      {
        method: "PUT",
        url: `/api/orders/consignments/${GUID}/cancel`,
        reply: (req) =>
          ok({
            message: "Hủy yêu cầu ký gửi thành công.",
            status: "CANCELLED",
            consignmentCode: "VCL-20260917-0001",
            data: { orderId: GUID, status: "CANCELLED", cancelReason: req.body?.cancelReason ?? null, cancelledQuotations: 1, consignmentCode: "VCL-20260917-0001" },
          }),
      },
    ];
    const withReason = await consignment.cancelConsignmentApi(GUID, "  Khách đổi ý  ");
    const withoutReason = await consignment.cancelConsignmentApi(GUID, "");
    const undefinedReason = await consignment.cancelConsignmentApi(GUID);
    return all(
      expectEqual("PUT có lý do", [requests[0]?.method, requests[0]?.url, requests[0]?.body], ["PUT", `/api/orders/consignments/${GUID}/cancel`, { cancelReason: "Khách đổi ý" }]),
      expectEqual("PUT lý do rỗng gửi {}", [requests[1]?.rawData, requests[1]?.body], ["{}", {}]),
      expectEqual("PUT không truyền lý do gửi {}", requests[2]?.rawData, "{}"),
      expectEqual("kết quả", [withReason?.success, withReason?.status, withReason?.cancelReason, withReason?.orderCode], [true, "CANCELLED", "Khách đổi ý", "VCL-20260917-0001"]),
      expectEqual("lý do rỗng vẫn thành công", [withoutReason?.status, undefinedReason?.status], ["CANCELLED", "CANCELLED"])
    );
  });

  await check("Huỷ đơn: 400 (đã có khoản trả tiền) → hiện message, không đăng xuất", async () => {
    resetState({ localToken: "tok-local", user: USER });
    const message = "Không thể hủy yêu cầu ký gửi vì đơn đã có khoản thanh toán.";
    routes = [{ method: "PUT", url: `/api/orders/consignments/${GUID}/cancel`, reply: () => fail(400, { message }) }];
    const { resolved, error } = await rejection(consignment.cancelConsignmentApi(GUID, "Khách đổi ý"));
    return all(
      expectEqual("reject", resolved, false),
      expectEqual("status/message", [error?.response?.status, orderHelpers.getApiErrorMessage(error)], [400, message]),
      expectEqual("token giữ nguyên", localStorage.getItem("accessToken"), "tok-local"),
      expectEqual("không chuyển trang", fakeLocation.replaced, [])
    );
  });

  /* ---------- I/O matrix: Màn ngoài đợt A ---------- */

  /*
   * Code Map của spec: màn nào, dùng module nào. Mỗi file phải import bản *.mock.js và
   * KHÔNG còn import module đã nối API thật — kể cả gián tiếp qua barrel.
   */
  const OUT_OF_WAVE_SCREENS = {
    /* Đợt C: hai màn kho chỉ còn phần mua hộ (mock) — không được chạm module ký gửi thật.
       ReceiveGoods, WarehouseReceiptPage, WarehouseShipmentDetail, KiGuiDetail đã xoá
       (thay bằng màn Theo dõi đơn /tracking gọi API thật). */
    "src/features/warehouse/pages/ThongQuanVn/ThongQuanVn.jsx": [],
    "src/features/warehouse/pages/CheckinNhapKho/CheckinNhapKho.jsx": [],
    "src/features/marketing/components/FloatingChat/FloatingChat.jsx": ["consignment", "restricted", "pricing"],
    "src/features/chat/pages/CustomerServiceChat/CustomerServiceChat.constants.js": ["consignment"],
    "src/features/chat/pages/CustomerServiceChat/CustomerServiceChat.jsx": ["upload"],
    "src/features/purchase/pages/ConsignmentBuyOrder/ConsignmentBuyOrder.jsx": ["consignment"],
    "src/features/purchase/pages/ConsignmentBuyOrder/ConsignmentBuyOrder.helpers.js": ["upload"],
    "src/features/purchase/pages/PurchaseRequestDetail/PurchaseRequestDetail.jsx": ["consignment"],
    "src/features/purchase/components/PackageOptionalServicesS1/PackageOptionalServicesS1.jsx": ["pricing"],
    /* Đợt B: hộp thoại cọc dùng chung với mua hộ — mặc định phải là tỷ lệ cọc mock. */
    "src/features/payment/components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog.jsx": ["pricing"],
    /* Đợt B: màn báo giá mua hộ không được chạm vào module đã nối API thật. */
    "src/features/purchase/pages/BuyForMeQuotationListDetail/BuyForMeQuotationListDetail.jsx": [],
    "src/features/pricing/pages/InternationalShippingPricing/InternationalShippingPricing.jsx": ["pricing"],
    "src/features/pricing/pages/ConsignmentPricing/ConsignmentPricing.jsx": ["pricing"],
    "src/features/pricing/pages/PricingCalculator/PricingCalculator.jsx": ["pricing"],
    "src/features/marketing/pages/QuotationPage/QuotationPage.jsx": ["pricing"],
    "src/features/services/pages/ConsignmentService/ConsignmentService.jsx": ["pricing"],
  };

  const REAL_SPECIFIERS = {
    consignment: "@features/consignment/api/consignmentApi",
    pricing: "@features/pricing/api/pricingRuleService",
    upload: "@shared/api/uploadImage",
    restricted: "@shared/api/restrictedItemApi",
    /* Đợt B: orderPaymentApi đã nối API thật, chưa có bản mock nào. */
    payment: "@features/payment/api/orderPaymentApi",
  };

  /* Barrel nào re-export module nào (src/features/consignment/index.js, src/features/pricing/index.js). */
  const BARREL_EXPORTS = {
    "@features/consignment": new Set([...Object.keys(consignment), ...Object.keys(status)]),
    "@features/pricing": new Set(Object.keys(pricing).filter((name) => name !== "default").concat("pricingRuleService")),
    "@features/payment": new Set(Object.keys(payment).filter((name) => name !== "default").concat("orderPaymentApi")),
  };

  const readImports = (source) => {
    const found = [];
    const pattern = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
    let match;
    while ((match = pattern.exec(source))) {
      const clause = match[1];
      const named = (clause.match(/\{([\s\S]*?)\}/)?.[1] || "")
        .split(",")
        .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      found.push({ specifier: match[2], named });
    }
    return found;
  };

  await check("Màn ngoài đợt A: import trong Code Map chỉ trỏ *.mock.js (không import bản thật, không lấy hàm API qua barrel); barrel không re-export bản mock", () => {
    const issues = [];
    for (const [rel, kinds] of Object.entries(OUT_OF_WAVE_SCREENS)) {
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) {
        issues.push(`${rel}: không tồn tại`);
        continue;
      }
      const imports = readImports(fs.readFileSync(file, "utf8"));
      for (const { specifier, named } of imports) {
        const bare = specifier.replace(/\.js$/, "");
        if (Object.values(REAL_SPECIFIERS).includes(bare)) {
          issues.push(`${rel}: còn import bản thật "${specifier}"`);
        }
        const barrel = BARREL_EXPORTS[specifier];
        const leaked = barrel ? named.filter((name) => barrel.has(name)) : [];
        if (leaked.length) {
          issues.push(`${rel}: lấy ${leaked.join(", ")} qua barrel "${specifier}"`);
        }
      }
      for (const kind of kinds) {
        const want = `${REAL_SPECIFIERS[kind]}.mock`;
        if (!imports.some(({ specifier }) => specifier.replace(/\.js$/, "") === want)) {
          issues.push(`${rel}: thiếu import "${want}"`);
        }
      }
    }
    for (const barrelFile of ["src/features/consignment/index.js", "src/features/pricing/index.js"]) {
      if (/\.mock["']/.test(fs.readFileSync(path.join(ROOT, barrelFile), "utf8"))) {
        issues.push(`${barrelFile}: re-export bản mock`);
      }
    }
    return issues.length === 0 ? true : issues.join("; ");
  });

  await check("Màn ngoài đợt A: bản *.mock.js trả dữ liệu mẫu như trước, không gọi mạng", async () => {
    resetState({ localToken: "tok-local" });
    const attemptsBefore = networkAttempts.length;
    const list = await mock.consignment.getConsignmentsApi(1, 30);
    const productTypes = await mock.consignment.getProductTypesApi();
    const byCode = list.items[0]?.orderCode ? await mock.consignment.getConsignmentDetailApi(list.items[0].orderCode) : null;
    const purchaseRules = await mock.pricing.default.getPricingRules({ onlyActive: true });
    const divisor = await mock.pricing.getVolumetricDivisorRule();
    const restrictedItems = await mock.restricted.getRestrictedItemListApi();
    const urls = await mock.upload.uploadImages([makeFile("a.jpg", "image/jpeg"), makeFile("b.heic", "image/heic")]);
    return all(
      expectTrue("đơn mẫu", list.items.length > 0),
      expectTrue("loại hàng mẫu", productTypes.length > 0),
      expectEqual("tra theo mã VCL- vẫn ra đơn (Nhận hàng)", byCode?.orderCode, list.items[0]?.orderCode),
      expectTrue("quy tắc giá mẫu", purchaseRules.length > 0),
      expectEqual("hệ số thể tích mẫu", divisor?.value, 6000),
      expectTrue("hàng cấm mẫu", restrictedItems.length > 0),
      expectEqual("URL ảnh mẫu", urls.length, 2),
      expectEqual("không request qua axios", requests.length, 0),
      expectEqual("không request ra mạng", networkAttempts.length - attemptsBefore, 0)
    );
  });

  /* ---------- Đợt 2: phiếu nhập kho, lịch sử đơn, thông báo ---------- */

  await check("Phiếu nhập kho: GET my-order/{id} → bóc data; data null → null; 403 → null không đăng xuất; id không phải GUID → không gọi mạng", async () => {
    resetState({ localToken: "tok-local", user: USER });
    const detail = { id: GUID, receivingNoteCode: "WRN-15984094", status: "ACTIVE", warehouseName: "Kho Quảng Châu", receiptPdfUrl: "https://api-vcl.zushin.io.vn/api/public/receipts/abc123" };
    routes = [{ method: "GET", url: `/api/warehouse-receiving-notes/my-order/${GUID}`, reply: () => ok({ message: "ok", data: detail }) }];
    const note = await receiving.getMyReceivingNoteApi(GUID);
    const firstReq = onlyRequest();

    routes = [{ method: "GET", url: `/api/warehouse-receiving-notes/my-order/${GUID}`, reply: () => ok({ message: "Đơn hàng chưa có phiếu tiếp nhận kho.", data: null }) }];
    const none = await receiving.getMyReceivingNoteApi(GUID);

    routes = [{ method: "GET", url: `/api/warehouse-receiving-notes/my-order/${GUID}`, reply: () => fail(403, { message: "Bạn không có quyền." }) }];
    const forbidden = await receiving.getMyReceivingNoteApi(GUID);
    const countBeforeCode = requests.length;
    const byCode = await receiving.getMyReceivingNoteApi("VCL-20260917-0001");

    return all(
      expectEqual("method/url", `${firstReq?.method} ${firstReq?.url}`, `GET /api/warehouse-receiving-notes/my-order/${GUID}`),
      expectEqual("token", firstReq?.authorization, "Bearer tok-local"),
      expectEqual("phiếu", [note?.receivingNoteCode, note?.status], ["WRN-15984094", "ACTIVE"]),
      expectEqual("chưa có phiếu", none, null),
      expectEqual("403", forbidden, null),
      expectEqual("403 không xoá token", localStorage.getItem("accessToken"), "tok-local"),
      expectEqual("mã VCL- không gọi mạng", [byCode, requests.length], [null, countBeforeCode])
    );
  });

  await check("Link PDF phiếu: đổi host api-vcl.zushin.io.vn → base URL, giữ path; download=true; rỗng → null", async () => {
    const legacy = "https://api-vcl.zushin.io.vn/api/public/receipts/abc123";
    return all(
      expectEqual("xem", receiving.toPublicReceiptUrl(legacy), "https://vcl.henrytech.cloud/api/public/receipts/abc123"),
      expectEqual("tải", receiving.toPublicReceiptUrl(legacy, { download: true }), "https://vcl.henrytech.cloud/api/public/receipts/abc123?download=true"),
      expectEqual("đường dẫn tương đối", receiving.toPublicReceiptUrl("/api/public/receipts/xyz"), "https://vcl.henrytech.cloud/api/public/receipts/xyz"),
      expectEqual("rỗng", receiving.toPublicReceiptUrl(""), null)
    );
  });

  await check("Lịch sử đơn: GET /orders/consignments/{id}/timeline → mảng sự kiện; id không phải GUID → 404 tại chỗ", async () => {
    resetState({ localToken: "tok-local" });
    const entries = [{ event: "QUOTATION_SENT", fromStatus: "PENDING_REVIEW", toStatus: "QUOTATION_SENT", note: null, actorName: "Sale", at: "2026-09-17T08:00:00Z" }];
    routes = [{ method: "GET", url: `/api/orders/consignments/${GUID}/timeline`, reply: () => ok({ message: "ok", data: entries }) }];
    const result = await consignment.getConsignmentTimelineApi(GUID);
    const req = onlyRequest();
    const { resolved, error } = await rejection(consignment.getConsignmentTimelineApi("abc"));
    return all(
      expectEqual("url", req?.url, `/api/orders/consignments/${GUID}/timeline`),
      expectEqual("sự kiện", result.map((e) => e.event), ["QUOTATION_SENT"]),
      expectEqual("id sai", [resolved, error?.response?.status, requests.length], [false, 404, 1])
    );
  });

  await check("Thông báo: chưa đăng nhập → rỗng, không gọi mạng; có token → bóc data + unreadCount; đọc 1 / đọc hết đúng PUT; xoá bị chặn tại chỗ", async () => {
    resetState();
    const anonymous = await notifications.getNotificationsApi({ pageNumber: 1, pageSize: 50 });
    const anonymousRequests = requests.length;

    resetState({ localToken: "tok-local" });
    const item = { id: GUID, title: "Báo giá mới", content: "Đơn VCL-20260917-0001 đã có báo giá", isRead: false, createdAt: "2026-09-17T08:00:00Z" };
    routes = [
      { method: "GET", url: "/api/notifications", reply: () => ok({ success: true, message: "ok", data: { items: [item], totalCount: 1, pageNumber: 1, pageSize: 50, totalPages: 1 }, unreadCount: 3 }) },
      { method: "PUT", url: `/api/notifications/${GUID}/read`, reply: () => ok({ success: true, message: "ok" }) },
      { method: "PUT", url: "/api/notifications/read-all", reply: () => ok({ success: true, message: "ok" }) },
    ];
    const list = await notifications.getNotificationsApi({ pageNumber: 1, pageSize: 50, unreadOnly: false });
    await notifications.markNotificationAsReadApi(GUID);
    await notifications.markAllNotificationsAsReadApi();
    const countBeforeDelete = requests.length;
    const { resolved: deleted } = await rejection(notifications.deleteNotificationApi(GUID));

    return all(
      expectEqual("chưa đăng nhập", [anonymous.items.length, anonymous.unreadCount, anonymousRequests], [0, 0, 0]),
      expectEqual("params", requests[0]?.params, { pageNumber: 1, pageSize: 50, unreadOnly: false }),
      expectEqual("items phẳng + unreadCount server", [list.items.length, list.items[0]?.title, list.unreadCount], [1, "Báo giá mới", 3]),
      expectEqual("PUT", requests.slice(1).map((r) => `${r.method} ${r.url}`), [`PUT /api/notifications/${GUID}/read`, "PUT /api/notifications/read-all"]),
      expectEqual("xoá không gọi mạng", [deleted, requests.length], [false, countBeforeDelete])
    );
  });

  await check("Báo giá: nhóm additionalFees theo kiện (orderItemId/itemName), phí không gắn kiện vào \"Phí cả đơn\"; báo giá cũ không gắn kiện giữ một nhóm", async () => {
    const fees = [
      { feeType: "SURCHARGE", code: "SUR_INSPECTION", orderItemId: "item-1", itemName: "Bình gốm", amount: 10000, enabled: true },
      { feeType: "PACKING_FEE", code: "PACKING_FEE", orderItemId: "item-1", itemName: "Bình gốm", amount: 25000, enabled: true },
      { feeType: "PACKING_FEE", code: "PACKING_FEE", orderItemId: "item-2", itemName: "Áo khoác", amount: 15000, enabled: true },
      { feeType: "SURCHARGE", code: "SUR_OVERSIZE", amount: 50000, enabled: true },
    ];
    const items = quotationHelpers.getCostItems({ additionalFees: fees });
    const groups = quotationHelpers.groupCostItemsByPackage(items);
    const legacy = quotationHelpers.groupCostItemsByPackage(quotationHelpers.getCostItems({ additionalFees: [fees[3]] }));
    return all(
      expectEqual("tiêu đề nhóm", groups.map((g) => g.title), ["Kiện 1 · Bình gốm", "Kiện 2 · Áo khoác", "Phí cả đơn"]),
      expectEqual("tổng từng nhóm", groups.map((g) => g.subtotal), [35000, 15000, 50000]),
      expectEqual("báo giá cũ", [legacy.length, legacy[0]?.title, legacy[0]?.items.length], [1, null, 1])
    );
  });

  /* ---------- Đợt B: báo giá ---------- */

  const QUOTATION_ID = "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f";

  const quotationDetail = (overrides = {}) => ({
    quotationId: QUOTATION_ID,
    orderId: GUID,
    quoteType: "OFFICIAL",
    status: "PENDING",
    consignmentCode: "VCL-20260917-0001",
    totalWeight: 3.2,
    chargeableWeight: 4,
    estimatedFreightCharge: 1_200_000,
    domesticShippingFee: 100_000,
    serviceFee: 300_000,
    taxAndDuty: 50_000,
    vat: 30_000,
    importTax: 20_000,
    totalEstimatedCost: 1_650_000,
    priceApprovalStatus: "NOT_REQUIRED",
    overrideReason: null,
    acceptedAt: null,
    canCustomerAccept: true,
    createdAt: "2026-09-17T02:00:00Z",
    expiredAt: "2026-09-27T02:00:00Z",
    salesNote: "Giao giờ hành chính",
    warehouseId: PACKAGE_CONFIG_ID,
    additionalFees: [{ code: "WOOD_CRATE", label: "Đóng thùng gỗ", amount: 120_000, enabled: true }],
    parcels: [{ parcelId: PRODUCT_TYPE_ID, packageCode: "P1", actualWeight: 3.2, chargeableWeight: 4, shippingFee: 1_200_000 }],
    ...overrides,
  });

  await check("Báo giá: GET /api/orders/{id}/quotation bóc data, giữ canCustomerAccept (chính thức → true, tạm tính → false)", async () => {
    resetState({ localToken: "tok-local" });
    let payload = quotationDetail();
    routes = [
      {
        method: "GET",
        url: `/api/orders/${GUID}/quotation`,
        reply: () => ok({ message: "Lấy thông tin báo giá thành công.", data: payload }),
      },
    ];
    const official = await consignment.getOrderQuotationApi(GUID, { signal: new AbortController().signal });
    payload = quotationDetail({ quoteType: "ESTIMATE", status: "DRAFT", canCustomerAccept: false });
    const estimate = await consignment.getOrderQuotationApi(GUID);
    return all(
      expectEqual("GET đúng đường dẫn", [requests[0]?.method, requests[0]?.url], ["GET", `/api/orders/${GUID}/quotation`]),
      expectEqual("có token", requests[0]?.authorization, "Bearer tok-local"),
      expectEqual("đã bóc data", [official?.quotationId, official?.status, "message" in official], [QUOTATION_ID, "PENDING", false]),
      expectEqual("báo giá chính thức xác nhận được", official?.canCustomerAccept, true),
      expectEqual("giữ phụ phí và kiện", [official?.additionalFees?.length, official?.parcels?.length], [1, 1]),
      expectEqual("báo giá tạm tính chỉ để xem", [estimate?.status, estimate?.canCustomerAccept], ["DRAFT", false])
    );
  });

  await check("Báo giá: 404 (đơn chưa có báo giá) giữ nguyên status + message; id không phải GUID → 404 tại chỗ", async () => {
    resetState({ localToken: "tok-local" });
    const message = `Chưa có báo giá nào được tạo cho đơn hàng: ${GUID}`;
    routes = [{ method: "GET", url: `/api/orders/${GUID}/quotation`, reply: () => fail(404, { message }) }];
    const missing = await rejection(consignment.getOrderQuotationApi(GUID));
    const requestCount = requests.length;
    const badId = await rejection(consignment.getOrderQuotationApi("VCL-20260917-0001"));
    return all(
      expectEqual("404 + message", [missing.resolved, missing.error?.response?.status, orderHelpers.getApiErrorMessage(missing.error)], [false, 404, message]),
      expectEqual("không đăng xuất", fakeLocation.replaced, []),
      expectEqual("id không phải GUID: 404, không gọi mạng", [badId.resolved, badId.error?.response?.status, requests.length - requestCount], [false, 404, 0])
    );
  });

  await check("Từ chối báo giá: PUT /api/quotations/{id}/reject body { rejectionReason }; lý do rỗng bị chặn trước khi gọi mạng", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      {
        method: "PUT",
        url: `/api/quotations/${QUOTATION_ID}/reject`,
        reply: (req) =>
          ok({
            message: "Từ chối báo giá thành công.",
            status: "QUOTATION_REJECTED",
            rejectionReason: req.body?.rejectionReason ?? null,
            consignment: { orderId: GUID, status: "QUOTATION_REJECTED" },
          }),
      },
    ];
    const result = await consignment.rejectConsignmentQuotationApi(QUOTATION_ID, "  Giá cao quá  ");
    const requestCount = requests.length;
    const empty = await rejection(consignment.rejectConsignmentQuotationApi(QUOTATION_ID, "   "));
    return all(
      expectEqual("PUT + body", [requests[0]?.method, requests[0]?.url, requests[0]?.body], ["PUT", `/api/quotations/${QUOTATION_ID}/reject`, { rejectionReason: "Giá cao quá" }]),
      expectEqual("kết quả", [result?.status, result?.rejectionReason, result?.consignment?.status], ["QUOTATION_REJECTED", "Giá cao quá", "QUOTATION_REJECTED"]),
      expectEqual("lý do rỗng: ném lỗi, 0 request", [empty.resolved, requests.length - requestCount], [false, 0]),
      expectTrue("câu nhắc ghi lý do", /lý do/i.test(String(empty.error?.message)))
    );
  });

  const confirmRoute = (reply) => [
    { method: "PUT", url: `/api/quotations/${QUOTATION_ID}/confirm-and-pay`, reply },
  ];

  await check("Xác nhận + cọc (payOS): body { paymentMethod, returnUrl, cancelUrl } → bóc data, có checkoutUrl và orderCode", async () => {
    resetState({ localToken: "tok-local" });
    routes = confirmRoute(() =>
      ok({
        message: "Xác nhận báo giá và tạo thanh toán thành công.",
        data: {
          quotationId: QUOTATION_ID,
          quotationStatus: "ACCEPTED",
          orderId: GUID,
          orderStatus: "WAITING_DEPOSIT",
          consignmentCode: "VCL-20260917-0001",
          invoiceId: PACKAGE_CONFIG_ID,
          invoiceNo: "INV-20260917-1234",
          paymentId: PRODUCT_TYPE_ID,
          orderCode: 1726561234,
          amount: 825_000,
          installmentType: "DEPOSIT",
          totalBillAmount: 1_650_000,
          depositRate: 50,
          paymentMethod: "PAYOS",
          paymentStatus: "PENDING",
          checkoutUrl: "https://pay.payos.vn/web/abc123",
          paymentLinkId: "abc123",
        },
      })
    );
    const result = await consignment.confirmAndPayConsignmentQuotationApi(QUOTATION_ID, {
      paymentMethod: "payos",
      returnUrl: "https://logictic.site/history/consignment",
      cancelUrl: "https://logictic.site/history/consignment",
    });
    const requestCount = requests.length;
    const badMethod = await rejection(
      consignment.confirmAndPayConsignmentQuotationApi(QUOTATION_ID, { paymentMethod: "SEPAY" })
    );
    return all(
      expectEqual("PUT + body", [requests[0]?.method, requests[0]?.url, requests[0]?.body], [
        "PUT",
        `/api/quotations/${QUOTATION_ID}/confirm-and-pay`,
        { paymentMethod: "PAYOS", returnUrl: "https://logictic.site/history/consignment", cancelUrl: "https://logictic.site/history/consignment" },
      ]),
      expectEqual("đã bóc data", [result?.quotationStatus, result?.orderStatus, result?.amount, result?.depositRate, result?.totalBillAmount], ["ACCEPTED", "WAITING_DEPOSIT", 825_000, 50, 1_650_000]),
      expectEqual("link payOS + mã giao dịch", [result?.checkoutUrl, result?.orderCode, result?.paymentStatus], ["https://pay.payos.vn/web/abc123", 1726561234, "PENDING"]),
      expectEqual("SePay bị chặn ở FE, 0 request", [badMethod.resolved, requests.length - requestCount], [false, 0])
    );
  });

  await check("Xác nhận + cọc (chuyển khoản tay): checkoutUrl null, paymentStatus PENDING_RECONCILIATION; cọc 0% → PAID", async () => {
    resetState({ localToken: "tok-local" });
    routes = confirmRoute((req) =>
      ok({
        message: "Xác nhận báo giá và tạo thanh toán thành công.",
        data:
          req.body?.paymentMethod === "OFFLINE"
            ? {
                quotationId: QUOTATION_ID,
                quotationStatus: "ACCEPTED",
                orderId: GUID,
                orderStatus: "WAITING_DEPOSIT",
                consignmentCode: "VCL-20260917-0001",
                orderCode: 1726561235,
                amount: 825_000,
                totalBillAmount: 1_650_000,
                depositRate: 50,
                paymentMethod: "OFFLINE",
                paymentStatus: "PENDING_RECONCILIATION",
                checkoutUrl: null,
                paymentLinkId: null,
              }
            : {
                quotationId: QUOTATION_ID,
                quotationStatus: "ACCEPTED",
                orderId: GUID,
                orderStatus: "WAITING_DEPOSIT",
                consignmentCode: "VCL-20260917-0001",
                orderCode: 0,
                amount: 0,
                totalBillAmount: 1_650_000,
                depositRate: 0,
                paymentMethod: "PAYOS",
                paymentStatus: "PAID",
                checkoutUrl: null,
              },
      })
    );
    const offline = await consignment.confirmAndPayConsignmentQuotationApi(QUOTATION_ID, { paymentMethod: "OFFLINE" });
    const zeroDeposit = await consignment.confirmAndPayConsignmentQuotationApi(QUOTATION_ID, { paymentMethod: "PAYOS" });
    return all(
      expectEqual("body chỉ có paymentMethod khi không truyền URL", requests[0]?.body, { paymentMethod: "OFFLINE" }),
      expectEqual("chuyển khoản tay", [offline?.paymentStatus, offline?.checkoutUrl, offline?.amount], ["PENDING_RECONCILIATION", null, 825_000]),
      expectEqual("cọc 0%", [zeroDeposit?.paymentStatus, zeroDeposit?.orderCode, zeroDeposit?.amount], ["PAID", 0, 0])
    );
  });

  await check("Poll trạng thái cọc: PAID → paid (xoá khoản chờ), 404 → not_found, PENDING → còn chờ", async () => {
    resetState({ localToken: "tok-local" });
    const {
      savePendingConsignmentPayment,
      readPendingConsignmentPayment,
      clearPendingConsignmentPayment,
      pollConsignmentPaymentStatus,
      classifyPaymentStatus,
    } = paymentUtils;

    savePendingConsignmentPayment({
      orderCode: 1726561234,
      orderId: GUID,
      consignmentCode: "VCL-20260917-0001",
      amount: 825_000,
    });
    const pending = readPendingConsignmentPayment();

    let status = "PAID";
    routes = [
      {
        method: "GET",
        url: /^\/api\/payments\/status\//,
        reply: (req) =>
          req.url.endsWith("/1726561234")
            ? ok({ orderCode: 1726561234, amount: 825_000, status, paymentMethod: "PAYOS" })
            : fail(404, { message: "Không tìm thấy thông tin giao dịch." }),
      },
    ];

    const runPoll = (orderCode) =>
      new Promise((resolve) => {
        pollConsignmentPaymentStatus({
          orderCode,
          fetchStatus: consignment.getConsignmentPaymentStatusApi,
          onDone: resolve,
          intervalMs: 1,
          timeoutMs: 5,
          setTimer: (fn) => globalThis.setTimeout(fn, 0),
          clearTimer: (id) => globalThis.clearTimeout(id),
        });
      });

    const paid = await runPoll("1726561234");
    clearPendingConsignmentPayment();
    const missing = await runPoll("1726561999");
    status = "PENDING";
    const stillPending = await runPoll("1726561234");

    return all(
      expectEqual("khoản chờ lưu lại đủ field", [pending?.orderCode, pending?.consignmentCode, pending?.amount], ["1726561234", "VCL-20260917-0001", 825_000]),
      expectEqual("PAID → paid", [paid.outcome, paid.payment?.status], ["paid", "PAID"]),
      expectEqual("xoá khoản chờ", readPendingConsignmentPayment(), null),
      expectEqual("404 → not_found", missing.outcome, "not_found"),
      expectEqual("PENDING → hết giờ vẫn chờ", stillPending.outcome, "timeout"),
      expectEqual("phân loại trạng thái", [classifyPaymentStatus("SUCCESS"), classifyPaymentStatus("CANCELLED"), classifyPaymentStatus("PENDING_RECONCILIATION")], ["paid", "failed", "pending"])
    );
  });

  await check("payOS trả khách về: đọc orderCode / cancel từ query và bỏ các tham số payOS khỏi URL", () => {
    const { parsePayOsReturn, stripPayOsReturnParams } = paymentUtils;
    const paid = parsePayOsReturn("?code=00&id=abc&cancel=false&status=PAID&orderCode=1726561234");
    const cancelled = parsePayOsReturn("?code=00&id=abc&cancel=true&status=CANCELLED&orderCode=1726561234");
    return all(
      expectEqual("thanh toán xong", [paid.orderCode, paid.cancelled, paid.hasPayOsParams], ["1726561234", false, true]),
      expectEqual("khách huỷ", [cancelled.cancelled, cancelled.orderCode], [true, "1726561234"]),
      expectEqual("dọn query", stripPayOsReturnParams("?tab=1&code=00&id=abc&cancel=false&status=PAID&orderCode=1"), "?tab=1"),
      expectEqual("không còn query nào", stripPayOsReturnParams("?code=00&orderCode=1"), ""),
      expectEqual("mở trang không có query payOS", parsePayOsReturn("").hasPayOsParams, false)
    );
  });

  await check("Tỷ lệ cọc: DEPOSIT_RATE 30 → 30; thiếu cấu hình → 50 như backend", async () => {
    resetState({ localToken: "tok-local" });
    let fees = [
      { id: PACKAGE_CONFIG_ID, feeName: "Tỷ lệ đặt cọc", feeCode: "DEPOSIT_RATE", calculationType: "PERCENTAGE", value: 30, unit: "%", isActive: true },
      { id: PRODUCT_TYPE_ID, feeName: "Phí kiểm hàng", feeCode: "SUR_INSPECTION", calculationType: "FIXED", value: 20000, isActive: true },
    ];
    routes = [
      {
        method: "GET",
        url: "/api/additional-service-fees",
        reply: () => ok({ message: "Lấy danh sách cấu hình phí dịch vụ bổ sung thành công.", data: fees }),
      },
    ];
    const configured = await pricing.getDepositRate({ signal: new AbortController().signal });
    fees = [fees[1]];
    const fallback = await pricing.getDepositRate();
    return all(
      expectEqual("GET + query activeOnly", [requests[0]?.method, requests[0]?.url, requests[0]?.params], ["GET", "/api/additional-service-fees", { activeOnly: true }]),
      expectEqual("rule 30 → 30", [configured?.value, configured?.feeCode, configured?.calculationType, configured?.isFallback], [30, "DEPOSIT_RATE", "PERCENTAGE", undefined]),
      expectEqual("thiếu cấu hình → 50", [fallback?.value, fallback?.feeCode, fallback?.calculationType, fallback?.isActive, fallback?.isFallback], [50, "DEPOSIT_RATE", "PERCENTAGE", true, true])
    );
  });

  await check("Lịch sử thanh toán đơn: bóc data, giữ trạng thái backend; danh sách thanh toán có alias status", async () => {
    resetState({ localToken: "tok-local" });
    const history = {
      orderId: GUID,
      consignmentCode: "VCL-20260917-0001",
      orderStatus: "WAITING_DEPOSIT",
      totalBillAmount: 1_650_000,
      totalPaid: 0,
      remaining: 1_650_000,
      customer: { fullName: "Nguyễn Văn A", customerCode: "KH001", email: "a@example.com", phone: "0900000000" },
      quotation: { quotationId: QUOTATION_ID, quoteType: "OFFICIAL", status: "ACCEPTED", totalAmount: 1_650_000 },
      payments: [
        { paymentId: PRODUCT_TYPE_ID, installmentType: "DEPOSIT", amount: 825_000, paymentMethod: "OFFLINE", status: "PENDING_RECONCILIATION", orderCode: 1726561235, checkoutUrl: null, createdAt: "2026-09-17T03:00:00Z" },
      ],
    };
    routes = [
      { method: "GET", url: `/api/orders/${GUID}/payments/history`, reply: () => ok({ message: "Lấy lịch sử thanh toán của đơn thành công.", data: history }) },
      {
        method: "GET",
        url: `/api/orders/${GUID}/payments`,
        reply: () =>
          ok({
            message: "Lấy danh sách thanh toán của đơn thành công.",
            data: {
              orderId: GUID,
              consignmentCode: "VCL-20260917-0001",
              orderStatus: "WAITING_DEPOSIT",
              totalBillAmount: 1_650_000,
              totalPaid: 0,
              remaining: 1_650_000,
              payments: [{ paymentId: PRODUCT_TYPE_ID, installmentType: "DEPOSIT", amount: 825_000, paymentMethod: "PAYOS", paymentStatus: "PENDING", orderCode: 1726561234, checkoutUrl: "https://pay.payos.vn/web/abc123" }],
            },
          }),
      },
    ];
    const result = await payment.getOrderPaymentHistoryApi(GUID, { signal: new AbortController().signal });
    const list = await payment.getOrderPaymentsApi(GUID);
    const rows = await payment.getOrderPaymentHistoryListApi(GUID);
    return all(
      expectEqual("đã bóc data", ["message" in result, result?.consignmentCode, result?.totalBillAmount, result?.remaining], [false, "VCL-20260917-0001", 1_650_000, 1_650_000]),
      expectEqual("giữ khách + báo giá", [result?.customer?.fullName, result?.quotation?.status], ["Nguyễn Văn A", "ACCEPTED"]),
      expectEqual("giữ mã trạng thái backend", result?.payments?.[0]?.status, "PENDING_RECONCILIATION"),
      expectEqual("danh sách có alias status", [list?.payments?.[0]?.status, list?.totalCount, list?.currency], ["PENDING", 1, "VND"]),
      expectEqual("*ListApi rút mảng", rows?.length, 1)
    );
  });

  /* ---------- Đợt C: theo dõi đơn, giữ hàng, hàng về VN (offline, adapter giả) ---------- */

  const tracking = await load("/src/features/tracking/api/orderTrackingApi.js");
  const publicTracking = await load("/src/features/tracking/api/publicParcelTrackingApi.js");
  const handling = await load("/src/features/delivery/api/destinationHandlingApi.js");
  const deliveryReq = await load("/src/features/delivery/api/deliveryRequestApi.js");
  const deliveryTrack = await load("/src/features/delivery/api/deliveryTrackingApi.js");
  const settlement = await load("/src/features/settlement/api/settlementApi.js");
  const incidents = await load("/src/features/incidents/api/parcelIncidentApi.js");
  const attachments = await load("/src/shared/api/attachmentApi.js");
  attachments.attachmentUploadClient.defaults.adapter = fakeAdapter;
  const PARCEL_ID = "d5e6f7a8-b9c0-4d1e-8f2a-3b4c5d6e7f80";

  await check("Theo dõi đơn: GET /orders/consignments/tracking gửi stage/search/includeFinished; chi tiết luôn có mảng", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      { method: "GET", url: "/api/orders/consignments/tracking", reply: () => ok({ message: "ok", data: { items: [{ orderId: GUID, consignmentCode: "VCL-1", currentStage: "IN_TRANSIT", shipmentCodes: null }], totalCount: 1, pageNumber: 1, pageSize: 10, totalPages: 1 } }) },
      { method: "GET", url: `/api/orders/consignments/${GUID}/tracking`, reply: () => ok({ message: "ok", data: { orderId: GUID, currentStage: "DEPARTED", events: null } }) },
    ];
    const page = await tracking.getTrackedOrdersApi({ stage: "IN_TRANSIT,DELAYED", search: " VCL-1 ", includeFinished: true });
    const listReq = requests[0];
    const detail = await tracking.getOrderTrackingApi(GUID);
    const before = requests.length;
    const bad = await rejection(tracking.getOrderTrackingApi("VCL-1"));
    return all(
      expectEqual("params", listReq?.params, { pageNumber: 1, pageSize: 10, stage: "IN_TRANSIT,DELAYED", search: "VCL-1", includeFinished: true }),
      expectEqual("token", listReq?.authorization, "Bearer tok-local"),
      expectEqual("items", [page.items.length, page.items[0].shipmentCodes, page.totalCount], [1, [], 1]),
      expectEqual("mảng chi tiết", [detail.parcels, detail.shipments, detail.events], [[], [], []]),
      expectEqual("mã VCL- → 404 tại chỗ, không gọi mạng", [bad.resolved, bad.error?.response?.status, requests.length], [false, 404, before])
    );
  });

  await check("Giữ hàng: bật thiếu lý do chặn tại chỗ; bật có lý do gửi { hold, reason }; tắt gửi { hold:false }; trả parcelsAlreadyInApprovedRelease", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "PUT", url: `/api/orders/consignments/${GUID}/export-hold`, reply: (req) => ok({ message: req.body.hold ? "Đã bật giữ hàng." : "Đã tắt giữ hàng.", data: { exportHold: req.body.hold, parcelsAlreadyInApprovedRelease: req.body.hold ? ["PCL-1"] : null } }) }];
    const noReason = await rejection(tracking.setExportHoldApi(GUID, { hold: true, reason: "  " }));
    const countAfterNoReason = requests.length;
    const on = await tracking.setExportHoldApi(GUID, { hold: true, reason: " Gộp chuyến sau " });
    const off = await tracking.setExportHoldApi(GUID, { hold: false, reason: "bỏ qua" });
    return all(
      expectEqual("thiếu lý do", [noReason.resolved, countAfterNoReason], [false, 0]),
      expectEqual("body bật", requests[0]?.body, { hold: true, reason: "Gộp chuyến sau" }),
      expectEqual("body tắt", requests[1]?.body, { hold: false }),
      expectEqual("kết quả", [on.message, on.parcelsAlreadyInApprovedRelease, off.parcelsAlreadyInApprovedRelease], ["Đã bật giữ hàng.", ["PCL-1"], []])
    );
  });

  await check("Chọn hướng kiện: PUT chỉ gửi kiện đổi hợp lệ { items:[{ parcelId, handling }] }; rỗng → không gọi mạng", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "PUT", url: `/api/orders/consignments/${GUID}/destination-handling`, reply: (req) => ok({ message: "Đã cập nhật hướng xử lý kiện.", data: req.body.items.map((i) => ({ ...i, packageCode: "PCL-1", canChange: true })) }) }];
    const empty = await rejection(handling.updateParcelHandlingApi(GUID, [{ parcelId: "x", handling: "STORE_AT_VN" }]));
    const countAfterEmpty = requests.length;
    const saved = await handling.updateParcelHandlingApi(GUID, [{ parcelId: PARCEL_ID, handling: "store_at_vn" }, { parcelId: PARCEL_ID, handling: "FLY" }]);
    return all(
      expectEqual("rỗng", [empty.resolved, countAfterEmpty], [false, 0]),
      expectEqual("body", requests[0]?.body, { items: [{ parcelId: PARCEL_ID, handling: "STORE_AT_VN" }] }),
      expectEqual("kết quả", [saved.rows[0].handling, saved.message], ["STORE_AT_VN", "Đã cập nhật hướng xử lý kiện."])
    );
  });

  await check("Tất toán: awaiting-settlement → mảng items; settlement-preview bóc data, blockers/parcels luôn là mảng", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      { method: "GET", url: "/api/orders/awaiting-settlement", reply: () => ok({ message: "ok", data: { items: [{ orderId: GUID, pendingPaymentAmount: 160200, pendingCheckoutUrl: "/api/payments/sepay/checkout/123" }] } }) },
      { method: "GET", url: `/api/orders/${GUID}/settlement-preview`, reply: () => ok({ message: "ok", data: { canIssue: false, blockers: [{ code: "OPEN_INCIDENT" }], estimatedFinalAmount: 160200, parcels: null } }) },
    ];
    const rows = await settlement.getAwaitingSettlementApi();
    const preview = await settlement.getSettlementPreviewApi(GUID);
    return all(
      expectEqual("hàng đợi", [rows.length, rows[0].pendingPaymentAmount], [1, 160200]),
      expectEqual("preview", [preview.estimatedFinalAmount, preview.blockers[0].code, preview.parcels], [160200, "OPEN_INCIDENT", []])
    );
  });

  await check("Link thanh toán: SePay tương đối ghép base URL; chọn khoản FINAL_PAYMENT PENDING có link, bỏ PENDING_RECONCILIATION", async () => {
    const payments = [
      { installmentType: "FINAL_PAYMENT", paymentStatus: "PENDING_RECONCILIATION", checkoutUrl: null, amount: 1 },
      { installmentType: "FINAL_PAYMENT", paymentStatus: "PENDING", checkoutUrl: "/api/payments/sepay/checkout/99", amount: 160200 },
      { installmentType: "REDELIVERY_FEE", paymentStatus: "PAID", checkoutUrl: "https://pay.payos.vn/x", amount: 30000 },
    ];
    const due = payment.findPayablePayment(payments, "FINAL_PAYMENT");
    return all(
      expectEqual("khoản chờ trả", [due?.amount, due?.checkoutUrl], [160200, "https://vcl.henrytech.cloud/api/payments/sepay/checkout/99"]),
      expectEqual("SePay", payment.isSepayCheckoutUrl(due?.checkoutUrl), true),
      expectEqual("phí giao lại đã trả", payment.findPayablePayment(payments, "REDELIVERY_FEE"), null),
      expectEqual("javascript: bị chặn", payment.resolveCheckoutUrl("javascript:alert(1)"), null)
    );
  });

  await check("Đặt giao: POST /delivery-requests đúng DTO, không gửi redeliveryFee; thiếu phường/xã chặn tại chỗ", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "POST", url: "/api/delivery-requests", reply: (req) => ok({ message: "Lập yêu cầu giao hàng thành công.", data: { deliveryCode: "DLV-1", ...req.body } }, 201) }];
    const missing = await rejection(deliveryReq.createDeliveryRequestApi({ orderId: GUID, receiverName: "A", receiverPhone: "09", addressDetail: "1 Lê Lợi", province: "HCM", district: "Q1", ward: "" }));
    const created = await deliveryReq.createDeliveryRequestApi({ orderId: GUID, parcelIds: [PARCEL_ID, "rác"], receiverName: " A ", receiverPhone: "0900", addressDetail: "1 Lê Lợi", province: "HCM", district: "Q1", ward: "Bến Nghé", redeliveryFee: 50000 });
    return all(
      expectEqual("thiếu phường/xã", [missing.resolved, requests.length], [false, 1]),
      expectEqual("body", requests[0]?.body, { orderId: GUID, parcelIds: [PARCEL_ID], receiverName: "A", receiverPhone: "0900", addressDetail: "1 Lê Lợi", province: "HCM", district: "Q1", ward: "Bến Nghé", scheduledDate: null, note: null }),
      expectEqual("kết quả", [created.deliveryCode, created.message], ["DLV-1", "Lập yêu cầu giao hàng thành công."])
    );
  });

  await check("Đã nhận hàng: PUT customer-confirm; 401 có message là lỗi nghiệp vụ, không đăng xuất", async () => {
    resetState({ localToken: "tok-local" });
    routes = [{ method: "PUT", url: `/api/orders/consignments/${GUID}/customer-confirm`, reply: () => ok({ message: "Đã ghi nhận xác nhận nhận hàng của khách.", data: { status: "COMPLETED" } }) }];
    const done = await deliveryTrack.confirmOrderReceivedApi(GUID);
    routes = [{ method: "PUT", url: `/api/orders/consignments/${GUID}/customer-confirm`, reply: () => fail(401, { message: "Bạn không có quyền xác nhận đơn hàng này." }) }];
    const denied = await rejection(deliveryTrack.confirmOrderReceivedApi(GUID));
    return all(
      expectEqual("hoàn thành", [done.status, done.success], ["COMPLETED", true]),
      expectEqual("401 nghiệp vụ", [denied.resolved, localStorage.getItem("accessToken"), fakeLocation.replaced], [false, "tok-local", []])
    );
  });

  await check("Sự cố: COMPLAINT không cho DISPOSE (chặn tại chỗ); respond gửi { choice, note }; khiếu nại gửi { parcelIds, description }", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      { method: "POST", url: `/api/parcel-incidents/${GUID}/customer-response`, reply: (req) => ok({ message: "Đã ghi nhận lựa chọn của khách.", data: { id: GUID, customerChoice: req.body.choice } }) },
      { method: "POST", url: `/api/orders/consignments/${GUID}/complaints`, reply: (req) => ok({ message: "Đã ghi nhận khiếu nại.", data: [{ id: PARCEL_ID, incidentType: "COMPLAINT", body: req.body }] }, 201) },
    ];
    const dispose = await rejection(incidents.respondParcelIncidentApi(GUID, { choice: "DISPOSE", incidentType: "COMPLAINT" }));
    const answered = await incidents.respondParcelIncidentApi(GUID, { choice: "compensate", note: " vỡ ", incidentType: "DAMAGED" });
    const complaint = await incidents.createOrderComplaintApi(GUID, { parcelIds: [], description: " Hàng móp " });
    return all(
      expectEqual("DISPOSE bị chặn", [dispose.resolved, requests[0]?.url], [false, `/api/parcel-incidents/${GUID}/customer-response`]),
      expectEqual("body respond", requests[0]?.body, { choice: "COMPENSATE", note: "vỡ" }),
      expectEqual("kết quả respond", [answered.customerChoice, answered.attachments], ["COMPENSATE", []]),
      expectEqual("body khiếu nại", requests[1]?.body, { parcelIds: null, description: "Hàng móp" }),
      expectEqual("khiếu nại", [complaint.incidents.length, complaint.message], [1, "Đã ghi nhận khiếu nại."])
    );
  });

  await check("Giấy tờ: upload multipart (file/entityType/entityId/documentType), sai định dạng chặn tại chỗ; tải về kèm Authorization, lỗi Blob đọc ra message", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      { method: "POST", url: "/api/attachments", reply: () => ok({ message: "Tải giấy tờ lên thành công.", data: { id: PARCEL_ID, documentType: "PERMIT" } }) },
      { method: "GET", url: `/api/attachments/${PARCEL_ID}/download`, reply: () => ok(new Blob(["%PDF"], { type: "application/pdf" }), 200) },
      { method: "GET", url: `/api/attachments/${GUID}/download`, reply: () => fail(403, new Blob([JSON.stringify({ message: "Bạn chỉ xem được giấy tờ của đơn mình." })], { type: "application/json" })) },
    ];
    const badFile = await rejection(attachments.uploadAttachmentApi({ file: new File(["x"], "a.exe", { type: "application/x-msdownload" }), entityType: "ORDER", entityId: GUID, documentType: "PERMIT" }));
    const uploaded = await attachments.uploadAttachmentApi({ file: new File(["%PDF"], "giay-phep.pdf", { type: "application/pdf" }), entityType: "order", entityId: GUID, documentType: "permit" });
    const form = requests[0]?.rawData;
    const file = await attachments.downloadAttachmentApi({ id: PARCEL_ID, downloadUrl: `/api/attachments/${PARCEL_ID}/download` });
    const denied = await rejection(attachments.downloadAttachmentApi(GUID));
    return all(
      expectEqual("sai định dạng", [badFile.resolved, badFile.error?.message], [false, "Chỉ nhận file PDF, JPG, PNG hoặc WEBP."]),
      expectEqual("form", [form?.get?.("entityType"), form?.get?.("entityId"), form?.get?.("documentType"), form?.get?.("file")?.name], ["ORDER", GUID, "PERMIT", "giay-phep.pdf"]),
      expectEqual("token upload", requests[0]?.authorization, "Bearer tok-local"),
      expectEqual("kết quả upload", [uploaded.id, uploaded.message], [PARCEL_ID, "Tải giấy tờ lên thành công."]),
      expectEqual("tải về", [requests[1]?.authorization, file.blob instanceof Blob], ["Bearer tok-local", true]),
      expectEqual("lỗi Blob → message", denied.error?.response?.data?.message, "Bạn chỉ xem được giấy tờ của đơn mình.")
    );
  });

  await check("Tra cứu công khai: GET /public/parcels/tracking?code= → alias kiện cho trang; 404 → message server", async () => {
    resetState({});
    routes = [{ method: "GET", url: "/api/public/parcels/tracking", reply: (req) => (req.params?.code === "VCL-1" ? ok({ message: "ok", data: { consignmentCode: "VCL-1", status: "IN_TRANSIT", parcels: [{ packageCode: "PCL-1", packageStatus: "STORED", checkInTime: "2026-09-17T01:00:00Z" }] } }) : fail(404, { message: "Không tìm thấy đơn hàng với mã vận đơn: VCL-2" })) }];
    const found = await publicTracking.getPublicParcelTrackingApi(" vcl-1 ");
    const missing = await rejection(publicTracking.getPublicParcelTrackingApi("VCL-2"));
    return all(
      expectEqual("kiện", [found.parcels[0].parcelCode, found.parcels[0].status, found.parcels[0].updatedAt], ["PCL-1", "STORED", "2026-09-17T01:00:00Z"]),
      expectEqual("404", missing.error?.message, "Không tìm thấy đơn hàng với mã vận đơn: VCL-2")
    );
  });

  await check("Phí lưu kho: /storage-fee/estimate bóc data; /orders/{id}/storage-fee parcels luôn là mảng", async () => {
    resetState({ localToken: "tok-local" });
    routes = [
      { method: "GET", url: "/api/storage-fee/estimate", reply: () => ok({ message: "ok", data: { freeDays: 7, graceDays: 2, unitPrice: 8000, samples: [{ days: 10, amountPerParcel: 8000 }], note: "n" } }) },
      { method: "GET", url: `/api/orders/${GUID}/storage-fee`, reply: () => ok({ message: "ok", data: { totalAmount: 0, parcels: null } }) },
    ];
    const estimate = await consignment.getStorageFeeEstimateApi();
    const fee = await payment.getOrderStorageFeeApi(GUID);
    return all(
      expectEqual("estimate", [estimate.freeDays, estimate.samples.length, estimate.currency], [7, 1, "VND"]),
      expectEqual("fee", fee.parcels, [])
    );
  });

}

await server.close();

/* ---------- Base URL từ biến môi trường (server Vite riêng) ---------- */

if (!loadError) {
  process.env.VITE_API_BASE_URL = "https://api.example.test/";
  const envServer = await createSsrServer();
  await check("httpClient: VITE_API_BASE_URL ghi đè base URL và bị cắt \"/\" cuối", async () => {
    const envHttp = await envServer.ssrLoadModule("/src/shared/api/httpClient.js");
    return expectEqual("baseURL", envHttp.default.defaults.baseURL, "https://api.example.test");
  });
  await envServer.close();
  delete process.env.VITE_API_BASE_URL;
}

fs.rmSync(emptyEnvDir, { recursive: true, force: true });

/* =========================================================
   6. BÁO CÁO
   ========================================================= */

await check("Không có request nào ra mạng thật", () =>
  networkAttempts.length === 0 ? true : `bị chặn ${networkAttempts.length} lần: ${networkAttempts.slice(0, 3).join("; ")}`
);

const passed = results.filter((r) => r.passed).length;
console.log(`\nkịch bản đạt    : ${passed}/${results.length}`);
console.log(`request ra mạng  : ${networkAttempts.length}`);

if (problems.length) {
  console.log(`\n${problems.length} VẤN ĐỀ:`);
  problems.forEach((p) => console.log(`  ${p}`));
  process.exit(1);
}

console.log("\nMọi kịch bản I/O matrix đạt, không có request nào ra mạng.");
process.exit(0);
