/* =========================================================
   purchaseRequestApi.js — YÊU CẦU MUA HỘ của khách. ĐÃ NỐI API THẬT.

   Trước đây file này là bản mock đọc fixture trong `src/mocks/data`; bản mock được giữ
   nguyên ở `purchaseRequestApi.mock.js` cho màn nào chưa nối xong.

   Endpoint thật (bám VCL_API):
     POST   /api/purchase-requests                              tạo yêu cầu
     GET    /api/purchase-requests?pageNumber&pageSize&status   danh sách của chính khách
     GET    /api/purchase-requests/{id}                         chi tiết (kèm items, quotation)
     GET    /api/purchase-requests/{id}/quotation               báo giá mới nhất
     PUT    /api/purchase-requests/{id}/quotation/reject        từ chối báo giá
     PUT    /api/purchase-requests/{id}/quotation/confirm-and-pay  chấp nhận + tạo thanh toán
     GET    /api/purchase-requests/{id}/payments                lịch sử thu tiền của yêu cầu
     GET    /api/payments/status/{orderCode}                    trạng thái một lần thu
     GET    /api/payments/sepay/checkout/{orderCode}            trang quét QR SePay

   GIỮ NGUYÊN BỀ MẶT của bản mock: tên export, thứ tự tham số, hình dạng trả về (đã bóc
   envelope { message, data }). Nhờ vậy 9 màn đang import file này không phải sửa dòng nào.

   Lỗi HTTP ném nguyên dạng axios để component đọc `error.response.data.message` như cũ.
   ========================================================= */
import httpClient from "@shared/api/httpClient";

/* =========================================================
   HELPER
========================================================= */

const getSignal = (options = {}) =>
  options?.signal || options?.controller?.signal || undefined;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const trimText = (value) => String(value ?? "").trim();

const createApiError = (status, message) => {
  const error = new Error(message);

  error.response = { status, data: { message } };

  return error;
};

const requireRequestId = (value) => {
  const id = trimText(value);

  if (!UUID_PATTERN.test(id)) {
    throw createApiError(404, "Không tìm thấy yêu cầu mua hộ.");
  }

  return id;
};

/** Bóc envelope { message, data } — backend luôn trả dạng này. */
const unwrapData = (body) =>
  body && typeof body === "object" && "data" in body ? body.data : body;

const toArray = (value) => (Array.isArray(value) ? value : []);

const logApiError = (label, error) => {
  if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return;

  console.error(label, error?.response?.data ?? error?.message ?? error);
};

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Trang dữ liệu chuẩn hoá về đúng hình dạng bản mock từng trả:
 * { items, totalCount, pageNumber, pageSize, totalPages }.
 */
const normalizePage = (payload, { pageNumber, pageSize }) => {
  const data = payload ?? {};
  const items = toArray(data.items ?? data.data ?? (Array.isArray(data) ? data : []));
  const totalCount = toNumber(data.totalCount ?? data.total ?? items.length);
  const size = toNumber(data.pageSize ?? pageSize) || pageSize || items.length || 1;

  return {
    items,
    totalCount,
    pageNumber: toNumber(data.pageNumber ?? pageNumber) || pageNumber || 1,
    pageSize: size,
    totalPages: toNumber(data.totalPages) || Math.max(1, Math.ceil(totalCount / size)),
  };
};

/* =========================================================
   TẠO YÊU CẦU
========================================================= */

export const createPurchaseRequestApi = async (payload, options = {}) => {
  try {
    const response = await httpClient.post("/api/purchase-requests", payload, {
      signal: getSignal(options),
    });

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi tạo yêu cầu mua hộ:", error);

    throw error;
  }
};

/* =========================================================
   ĐỌC
========================================================= */

/**
 * Danh sách yêu cầu mua hộ của chính khách đang đăng nhập.
 * Backend tự lọc theo tài khoản nên FE không gửi customerId.
 */
export const getPurchaseRequestsApi = async (pageNumber = 1, pageSize = 10, options = {}) => {
  const page = Math.max(1, toNumber(pageNumber) || 1);
  const size = Math.max(1, toNumber(pageSize) || 10);

  try {
    const response = await httpClient.get("/api/purchase-requests", {
      params: {
        pageNumber: page,
        pageSize: size,
        ...(trimText(options?.status) ? { status: trimText(options.status) } : {}),
        ...(trimText(options?.searchKeyword)
          ? { searchKeyword: trimText(options.searchKeyword) }
          : {}),
      },
      signal: getSignal(options),
    });

    return normalizePage(unwrapData(response.data), { pageNumber: page, pageSize: size });
  } catch (error) {
    logApiError("Lỗi lấy danh sách yêu cầu mua hộ:", error);

    throw error;
  }
};

export const getPurchaseRequestDetailApi = async (purchaseRequestId, options = {}) => {
  const id = requireRequestId(purchaseRequestId);

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi lấy chi tiết yêu cầu mua hộ:", error);

    throw error;
  }
};

/* Hai tên cũ vẫn được dùng ở vài màn — giữ lại để không phải sửa nơi gọi. */
export const getPurchaseRequestByIdApi = getPurchaseRequestDetailApi;
export const getPurchaseRequestById = getPurchaseRequestDetailApi;

/** Báo giá mới nhất của yêu cầu (gồm phần TRẢ TRƯỚC và phần TẠM TÍNH). */
export const getPurchaseRequestQuotationApi = async (purchaseRequestId, options = {}) => {
  const id = requireRequestId(purchaseRequestId);

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}/quotation`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi lấy báo giá mua hộ:", error);

    throw error;
  }
};

/* =========================================================
   KHÁCH QUYẾT ĐỊNH VỚI BÁO GIÁ
========================================================= */

export const rejectQuotationApi = async (
  quotationIdOrPurchaseRequestId,
  rejectionReason,
  options = {}
) => {
  const id = requireRequestId(quotationIdOrPurchaseRequestId);
  const reason = trimText(rejectionReason);

  if (!reason) {
    throw createApiError(400, "Vui lòng nhập lý do từ chối báo giá.");
  }

  try {
    const response = await httpClient.put(
      `/api/purchase-requests/${encodeURIComponent(id)}/quotation/reject`,
      { rejectionReason: reason },
      { signal: getSignal(options) }
    );

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi từ chối báo giá mua hộ:", error);

    throw error;
  }
};

/**
 * Khách chấp nhận báo giá và tạo lần thu tiền.
 *
 * Luồng chuẩn: khách trả 100% PHẦN TRẢ TRƯỚC (tiền hàng + phí mua + ship nội địa + VAT phí).
 * Cước quốc tế, VAT cước và thuế nhập khẩu KHÔNG nằm ở đây — thu lại ở Việt Nam theo cân
 * đo thật, nên đừng cộng `estimatedLaterAmount` vào số tiền hiển thị ở bước này.
 */
export const confirmAndPayQuotationApi = async (
  purchaseRequestIdOrQuotationId,
  payload = {},
  options = {}
) => {
  const id = requireRequestId(purchaseRequestIdOrQuotationId);
  const method = trimText(payload?.paymentMethod).toUpperCase() || "SEPAY";

  const body = { paymentMethod: method };

  if (payload?.returnUrl) body.returnUrl = String(payload.returnUrl);
  if (payload?.cancelUrl) body.cancelUrl = String(payload.cancelUrl);

  try {
    const response = await httpClient.put(
      `/api/purchase-requests/${encodeURIComponent(id)}/quotation/confirm-and-pay`,
      body,
      { signal: getSignal(options) }
    );

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi xác nhận báo giá mua hộ:", error);

    throw error;
  }
};

/* Tên cũ: một số màn gọi acceptQuotationApi rồi mới tạo thanh toán. Cùng một endpoint. */
export const acceptQuotationApi = confirmAndPayQuotationApi;

/* =========================================================
   THANH TOÁN
========================================================= */

export const getPaymentStatusApi = async (orderCode, options = {}) => {
  const code = trimText(orderCode);

  if (!code) {
    throw createApiError(400, "Thiếu mã thanh toán.");
  }

  try {
    const response = await httpClient.get(
      `/api/payments/status/${encodeURIComponent(code)}`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi lấy trạng thái thanh toán:", error);

    throw error;
  }
};

export const getSepayCheckoutApi = async (orderCode, options = {}) => {
  const code = trimText(orderCode);

  if (!code) {
    throw createApiError(400, "Thiếu mã thanh toán.");
  }

  try {
    const response = await httpClient.get(
      `/api/payments/sepay/checkout/${encodeURIComponent(code)}`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi lấy trang thanh toán SePay:", error);

    throw error;
  }
};

/** Đường dẫn trang quét QR — mở thẳng bằng thẻ <a>, không cần gọi API trước. */
export const getSepayCheckoutPageUrl = (orderCode) => {
  const code = trimText(orderCode);

  return code ? `/api/payments/sepay/checkout/${encodeURIComponent(code)}` : "";
};

/** Link thanh toán chung: ưu tiên link cổng trả về, không có thì rơi về trang SePay. */
export const getPaymentCheckoutUrl = (payment = {}) =>
  trimText(payment?.checkoutUrl) ||
  trimText(payment?.paymentUrl) ||
  getSepayCheckoutPageUrl(payment?.orderCode);

/** Lịch sử thu tiền của một yêu cầu: trả trước, chênh giá, đợt cuối ở VN. */
export const getPurchaseRequestPaymentHistoryApi = async (requestId, options = {}) => {
  const id = requireRequestId(requestId);

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}/payments`,
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy lịch sử thanh toán mua hộ:", error);

    throw error;
  }
};

export default createPurchaseRequestApi;
