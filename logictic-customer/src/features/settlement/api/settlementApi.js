/* =========================================================
   settlementApi — tất toán phía khách (API THẬT).

   - getAwaitingSettlementApi -> GET /api/orders/awaiting-settlement
       → { message, data: { items: SettlementQueueItem[] } }
       Khách gọi được, server tự lọc chỉ đơn của chính mình (OrderService.Settlement:
       "đó chính là danh sách đơn chờ tôi tất toán bên màn khách"). Mỗi dòng có
       pendingPaymentAmount + pendingCheckoutUrl của đợt FINAL_PAYMENT Sale đã phát
       hành; null nghĩa là Sale chưa phát hành.
       Hàm trả MẢNG (đã bóc data.items) — giữ đúng hợp đồng bản mock cũ.
   - getSettlementPreviewApi  -> GET /api/orders/{orderId}/settlement-preview
       → { message, data: SettlementPreviewDto } (tài liệu hàng về VN mục C1)
       Chỉ đọc, gọi bao nhiêu lần cũng được. blockers[].code: PARCEL_NOT_INSPECTED,
       OPEN_INCIDENT, NO_INVOICE, NO_DEPOSIT, ALREADY_SETTLED.

   Khách KHÔNG phát hành đợt cuối (POST .../payments/final là việc của Sale); khách trả
   bằng checkoutUrl của khoản FINAL_PAYMENT đọc từ GET /api/orders/{id}/payments.
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mã vướng mắc của xem trước tất toán → câu giải thích cho khách. */
export const SETTLEMENT_BLOCKER_LABELS = Object.freeze({
  PARCEL_NOT_INSPECTED: "Còn kiện chưa về hoặc kho Việt Nam chưa cân đo xong.",
  OPEN_INCIDENT: "Còn sự cố hàng hoá chưa xử lý — vui lòng chọn cách xử lý ở mục Sự cố.",
  NO_INVOICE: "Đơn chưa chấp nhận báo giá.",
  NO_DEPOSIT: "Đơn chưa thanh toán tiền cọc.",
  ALREADY_SETTLED: "Đơn đã tất toán xong.",
});

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

/**
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array>} đơn đã về kho VN, chưa tất toán xong (mới về lên đầu)
 */
export const getAwaitingSettlementApi = async (options = {}) => {
  try {
    const response = await httpClient.get("/api/orders/awaiting-settlement", {
      signal: getSignal(options),
    });

    const data = unwrapData(response.data);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

    return items;
  } catch (error) {
    logApiError("Lỗi lấy danh sách đơn chờ tất toán:", error);

    throw error;
  }
};

/**
 * Xem trước tất toán theo cân đo tại kho VN.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal }} [options]
 */
export const getSettlementPreviewApi = async (orderId, options = {}) => {
  const id = String(orderId ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error("Không xác định được đơn hàng.");
  }

  try {
    const response = await httpClient.get(
      `/api/orders/${encodeURIComponent(id)}/settlement-preview`,
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return {
      ...data,
      blockers: Array.isArray(data.blockers) ? data.blockers : [],
      parcels: Array.isArray(data.parcels) ? data.parcels : [],
    };
  } catch (error) {
    logApiError("Lỗi lấy xem trước tất toán:", error);

    throw error;
  }
};

export default { getAwaitingSettlementApi, getSettlementPreviewApi };
