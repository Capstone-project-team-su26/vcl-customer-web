/* =========================================================
   orderPaymentApi — ĐÃ NỐI API THẬT (đợt B: báo giá và cọc ký gửi)

   Bám OrderPaymentController / ConsignmentPaymentService của VCL_API:
   - getOrderPaymentsApi        -> GET /api/orders/{orderId}/payments
       { message, data: { orderId, consignmentCode, orderStatus, totalBillAmount,
         totalPaid, remaining, payments[{ paymentId, invoiceId, installmentType,
         amount, paymentMethod, paymentStatus, orderCode, transactionCode,
         checkoutUrl, paidAt }] } }
   - getOrderPaymentHistoryApi  -> GET /api/orders/{orderId}/payments/history
       { message, data: { ..., customer{}, quotation{}, payments[{ ..., status,
         createdAt, paidAt, failureReason }] } } — status đã chuẩn hoá
         PENDING | SUCCESS | FAILED | CANCELED, mã khác (PENDING_RECONCILIATION,
         RECEIVED_UNALLOCATED...) giữ nguyên.
   - Hai hàm *ListApi gọi hàm gốc rồi rút mảng ra khỏi kết quả.
   - getOrderStorageFeeApi      -> GET /api/orders/{orderId}/storage-fee (hàng về VN D1)
   - resolveCheckoutUrl / findPayablePayment: chọn khoản đang chờ trả (FINAL_PAYMENT,
     STORAGE_FEE, REDELIVERY_FEE) và ghép base URL cho link SePay tương đối.
   403 { message } khi không phải chủ đơn, 404 { message } khi không có đơn.

   Giữ NGUYÊN tên export, thứ tự tham số và kiểu trả về (object ĐÃ bóc envelope).
   Không màn mua hộ nào import file này.
   ========================================================= */

import httpClient, {
  API_BASE_URL,
  isCanceledRequest,
} from "@shared/api/httpClient";

/* =========================================================
   KHOẢN THU (installmentType) — bám ConsignmentPaymentService
   DEPOSIT (cọc) · FINAL_PAYMENT (tất toán, Sale phát hành theo cân đo VN) ·
   STORAGE_FEE (phí lưu kho, kho chốt lúc xuất) · REDELIVERY_FEE (phí giao lại,
   Sale báo khi giao lại sau lần giao thất bại).
   ========================================================= */

export const PAYMENT_INSTALLMENT_TYPES = Object.freeze({
  DEPOSIT: "DEPOSIT",
  FINAL_PAYMENT: "FINAL_PAYMENT",
  STORAGE_FEE: "STORAGE_FEE",
  REDELIVERY_FEE: "REDELIVERY_FEE",
});

export const PAYMENT_INSTALLMENT_LABELS = Object.freeze({
  DEPOSIT: "Tiền cọc",
  FINAL_PAYMENT: "Tất toán",
  STORAGE_FEE: "Phí lưu kho",
  REDELIVERY_FEE: "Phí giao lại",
});

/**
 * checkoutUrl của payOS là link tuyệt đối; của SePay là đường dẫn TƯƠNG ĐỐI
 * (/api/payments/sepay/checkout/{orderCode}) — phải ghép base URL API, nếu không
 * trình duyệt mở nhầm vào domain của web khách. Chỉ nhận http/https.
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export const resolveCheckoutUrl = (url) => {
  const raw = String(url ?? "").trim();

  if (!raw) return null;

  try {
    const parsed = new URL(raw, `${API_BASE_URL}/`);

    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

/** Link SePay (trang QR của server) mở tab mới; payOS chuyển thẳng như màn cọc. */
export const isSepayCheckoutUrl = (url) =>
  /\/api\/payments\/sepay\//i.test(String(url ?? ""));

/**
 * Khoản đang chờ khách trả (PENDING + còn link) của một loại, mới nhất trước.
 * PENDING_RECONCILIATION (chuyển khoản chờ Admin) không tính là trả tiếp được.
 *
 * @param {Array<object>} payments
 * @param {string} installmentType
 */
export const findPayablePayment = (payments, installmentType) =>
  (Array.isArray(payments) ? payments : [])
    .filter(
      (payment) =>
        String(payment?.installmentType ?? "").toUpperCase() === installmentType &&
        String(payment?.paymentStatus ?? payment?.status ?? "").toUpperCase() === "PENDING" &&
        resolveCheckoutUrl(payment?.checkoutUrl),
    )
    .map((payment) => ({ ...payment, checkoutUrl: resolveCheckoutUrl(payment.checkoutUrl) }))
    .pop() || null;

const getSignal = (options = {}) =>
  typeof options?.addEventListener === "function" ? options : options?.signal;

const unwrapData = (body) =>
  body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;

const logApiError = (label, error) => {
  if (!isCanceledRequest(error)) {
    console.error(label, error?.response?.data || error?.message);
  }
};

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

/*
 * Giữ nguyên helper của bản thật: nơi gọi có thể tự truyền kết quả vào
 * getOrderPaymentListApi, và thứ tự candidate quyết định mảng nào được lấy.
 * Backend không trả field `items` nên nhánh `result.payments` luôn là nhánh
 * trúng đầu tiên.
 */
const findArrayFromResult = (result) => {
  const candidates = [
    result,
    result?.items,
    result?.results,
    result?.payments,
    result?.histories,
    result?.paymentHistories,

    result?.data,
    result?.data?.items,
    result?.data?.results,
    result?.data?.payments,
    result?.data?.histories,
    result?.data?.paymentHistories,
  ];

  return (
    candidates.find(
      Array.isArray,
    ) || []
  );
};

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

const normalizeOrderId = (orderId) => {
  const normalizedOrderId =
    String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error(
      "Không tìm thấy mã đơn hàng.",
    );
  }

  return normalizedOrderId;
};

/* =========================================================
   GET /api/orders/{orderId}/payments
   ========================================================= */

/**
 * Danh sách giao dịch thanh toán của đơn (envelope gọn hơn màn history).
 *
 * Mỗi giao dịch có thêm alias `status` = `paymentStatus` để đọc chung với màn history.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 * @returns {Promise<object>}
 */
export const getOrderPaymentsApi =
  async (
    orderId,
    options = {},
  ) => {
    const normalizedOrderId =
      normalizeOrderId(orderId);

    try {
      const response = await httpClient.get(
        `/api/orders/${encodeURIComponent(normalizedOrderId)}/payments`,
        { signal: getSignal(options) },
      );

      const data = unwrapData(response.data) || {};
      const payments = (Array.isArray(data.payments) ? data.payments : []).map(
        (payment) => ({
          ...payment,
          status: payment?.status ?? payment?.paymentStatus ?? null,
        }),
      );

      return {
        ...data,
        orderCode: data.orderCode ?? data.consignmentCode ?? null,
        currency: data.currency ?? "VND",
        payments,
        totalCount: payments.length,
      };
    } catch (error) {
      logApiError("Lỗi lấy danh sách thanh toán của đơn:", error);

      throw error;
    }
  };

/**
 * Chỉ lấy mảng giao dịch, bỏ phần tổng tiền.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 * @returns {Promise<Array<object>>}
 */
export const getOrderPaymentListApi =
  async (
    orderId,
    options = {},
  ) => {
    const result =
      await getOrderPaymentsApi(
        orderId,
        options,
      );

    return findArrayFromResult(
      result,
    );
  };

/* =========================================================
   GET /api/orders/{orderId}/payments/history
   ========================================================= */

/**
 * Toàn bộ dữ liệu màn "Lịch sử thanh toán".
 *
 * Object trả về phải đủ những field mà OrderPaymentHistory đọc thẳng:
 * consignmentCode, orderStatus, totalBillAmount, totalPaid, remaining,
 * quotation { quoteType, status, totalAmount }, customer { fullName,
 * email, phone } và payments[] { paymentId, orderCode, installmentType,
 * amount, status, paymentMethod, createdAt, paidAt, failureReason,
 * checkoutUrl }. Thiếu một field là một khối trên màn hình trống.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal, params?: object, headers?: object } | AbortSignal} [options]
 * @returns {Promise<object>}
 */
export const getOrderPaymentHistoryApi =
  async (
    orderId,
    options = {},
  ) => {
    const normalizedOrderId =
      normalizeOrderId(orderId);

    try {
      const response = await httpClient.get(
        `/api/orders/${encodeURIComponent(normalizedOrderId)}/payments/history`,
        { signal: getSignal(options) },
      );

      const data = unwrapData(response.data);

      if (!data || typeof data !== "object") {
        return data;
      }

      return {
        ...data,
        payments: Array.isArray(data.payments) ? data.payments : [],
      };
    } catch (error) {
      logApiError("Lỗi lấy lịch sử thanh toán của đơn:", error);

      throw error;
    }
  };

/**
 * Chỉ lấy mảng giao dịch trong lịch sử thanh toán.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 * @returns {Promise<Array<object>>}
 */
export const getOrderPaymentHistoryListApi =
  async (
    orderId,
    options = {},
  ) => {
    const result =
      await getOrderPaymentHistoryApi(
        orderId,
        options,
      );

    return findArrayFromResult(
      result,
    );
  };

/* =========================================================
   GET /api/orders/{orderId}/storage-fee
   ========================================================= */

/**
 * Phí lưu kho tại kho VN của đơn (chỉ đọc — số tiền chỉ vào hoá đơn khi Sale
 * phát hành tất toán hoặc kho chốt lúc xuất).
 * → { message, data: { orderId, orderCode, freeDays, graceDays, unitPrice, currency,
 *     totalAmount, note, parcels[{ packageCode, storedAt, releasedAt, storedDays,
 *     chargeableDays, amount, legs[] }] } }
 *
 * Khoản STORAGE_FEE do KHO chốt (POST .../payments/storage-fee chỉ cho nhân viên);
 * khách trả qua checkoutUrl của khoản đó trong getOrderPaymentsApi.
 */
export const getOrderStorageFeeApi =
  async (
    orderId,
    options = {},
  ) => {
    const normalizedOrderId =
      normalizeOrderId(orderId);

    try {
      const response = await httpClient.get(
        `/api/orders/${encodeURIComponent(normalizedOrderId)}/storage-fee`,
        { signal: getSignal(options) },
      );

      const data = unwrapData(response.data) || {};

      return {
        ...data,
        parcels: Array.isArray(data.parcels) ? data.parcels : [],
      };
    } catch (error) {
      logApiError("Lỗi lấy phí lưu kho của đơn:", error);

      throw error;
    }
  };

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const orderPaymentApi = {
  getOrderPaymentsApi,
  getOrderPaymentListApi,
  getOrderPaymentHistoryApi,
  getOrderPaymentHistoryListApi,
  getOrderStorageFeeApi,
  resolveCheckoutUrl,
  findPayablePayment,
};

export default orderPaymentApi;
