/* =========================================================
   destinationHandlingApi — khách chọn hướng TỪNG KIỆN khi hàng về VN (API THẬT).

   Bám VnArrivalController (tài liệu hàng về VN mục B):
   - getParcelHandlingApi    -> GET /api/orders/consignments/{orderId}/destination-handling
   - updateParcelHandlingApi -> PUT /api/orders/consignments/{orderId}/destination-handling
                                { items: [{ parcelId, handling }] }
   Cả hai → { message, data: [{ parcelId, packageCode, packageStatus, handling,
                                 canChange, lockedReason }] }

   - Chọn được từ lúc tạo đơn tới khi kiện vào phiếu nhập kho VN hoặc yêu cầu giao
     (canChange=false, lockedReason nói lý do). Kiện đã giao / đã huỷ cũng khoá.
   - Một đơn chia được: kiện này gửi kho, kiện kia giao ngay.
   - Khách khác → 403; handling lạ → 400.

   Lựa chọn MẶC ĐỊNH của cả đơn lúc tạo đơn vẫn do DestinationHandlingChoice (consignment)
   gửi trong payload tạo đơn — file này chỉ lo phần chỉnh từng kiện sau đó.
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PARCEL_HANDLING = Object.freeze({
  DIRECT_DELIVERY: "DIRECT_DELIVERY",
  STORE_AT_VN: "STORE_AT_VN",
});

export const PARCEL_HANDLING_LABELS = Object.freeze({
  DIRECT_DELIVERY: "Giao ngay",
  STORE_AT_VN: "Gửi kho Việt Nam",
});

/** lockedReason mà server ghi khi kiện đã nằm trong một yêu cầu giao còn hiệu lực. */
export const LOCKED_BY_DELIVERY_REASON = "Kiện đã nằm trong yêu cầu giao hàng.";

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

const requireOrderId = (orderId) => {
  const id = String(orderId ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error("Không xác định được đơn hàng.");
  }

  return id;
};

const toRows = (data) =>
  (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    handling: String(row?.handling ?? "").toUpperCase() || PARCEL_HANDLING.DIRECT_DELIVERY,
    canChange: Boolean(row?.canChange),
  }));

/** Hướng xử lý hiện tại của từng kiện. */
export const getParcelHandlingApi = async (orderId, options = {}) => {
  const id = requireOrderId(orderId);

  try {
    const response = await httpClient.get(
      `/api/orders/consignments/${encodeURIComponent(id)}/destination-handling`,
      { signal: getSignal(options) },
    );

    return toRows(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy hướng xử lý kiện:", error);

    throw error;
  }
};

/**
 * Lưu lựa chọn cho các kiện đã đổi.
 *
 * @param {string} orderId
 * @param {Array<{ parcelId: string, handling: string }>} items
 * @returns {Promise<{ rows: object[], message?: string }>}
 */
export const updateParcelHandlingApi = async (orderId, items = [], options = {}) => {
  const id = requireOrderId(orderId);

  const payloadItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      parcelId: String(item?.parcelId ?? "").trim(),
      handling: String(item?.handling ?? "").trim().toUpperCase(),
    }))
    .filter(
      (item) =>
        UUID_PATTERN.test(item.parcelId) &&
        Object.values(PARCEL_HANDLING).includes(item.handling),
    );

  if (payloadItems.length === 0) {
    throw new Error("Chưa có kiện nào được đổi hướng xử lý.");
  }

  try {
    const response = await httpClient.put(
      `/api/orders/consignments/${encodeURIComponent(id)}/destination-handling`,
      { items: payloadItems },
      { signal: getSignal(options) },
    );

    return {
      rows: toRows(unwrapData(response.data)),
      message: response.data?.message,
    };
  } catch (error) {
    logApiError("Lỗi cập nhật hướng xử lý kiện:", error);

    throw error;
  }
};

export default {
  getParcelHandlingApi,
  updateParcelHandlingApi,
};
