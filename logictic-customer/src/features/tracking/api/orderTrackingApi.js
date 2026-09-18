/* =========================================================
   orderTrackingApi.js — khách theo dõi hành trình đơn ký gửi (API THẬT).

   Bám OrderController + ShipmentTrackingService / ExportHoldService của VCL_API
   (tài liệu xuất kho mục K, L; hàng về VN mục G):

   - getTrackedOrdersApi -> GET /api/orders/consignments/tracking
       ?stage=&search=&includeFinished=&pageNumber=&pageSize=
       → { message, data: { items: TrackedOrderDto[], totalCount, pageNumber, pageSize, totalPages } }
       Chỉ đơn ĐÃ có hàng ở kho; mặc định bỏ đơn đã giao xong (includeFinished=true để lấy cả).
       Tài liệu ghi includeArrived nhưng code nhận includeFinished (includeArrived là tên cũ) —
       theo CODE.
   - getOrderTrackingApi -> GET /api/orders/consignments/{orderId}/tracking
       → { message, data: OrderTrackingDto } — events sắp cũ → mới. Đơn người khác → 403.
   - setExportHoldApi    -> PUT /api/orders/consignments/{orderId}/export-hold { hold, reason }
       → { message, data: { orderId, consignmentCode, exportHold, exportHoldReason,
            exportHoldAt, parcelsAlreadyInApprovedRelease: string[] } }
       Bật mà thiếu lý do → 400.

   Khách KHÔNG gọi được API phiếu xuất kho / lô vận chuyển (403) — mọi thứ khách cần
   nằm trong hai API theo dõi ở trên, đã lọc sẵn (không lộ mã phiếu, ghi chú nội bộ).
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/* Lỗi dựng tại chỗ vẫn mang dáng lỗi axios để màn hình đọc chung một kiểu. */
const createApiError = (status, message) => {
  const error = new Error(message);
  error.response = { status, data: { message } };
  return error;
};

const requireOrderId = (orderId) => {
  const id = String(orderId ?? "").trim();

  /* Mã VCL-... hay id rác: server trả 400 ModelState khó hiểu, báo "không tìm thấy" luôn. */
  if (!UUID_PATTERN.test(id)) {
    throw createApiError(404, "Không tìm thấy đơn hàng cần theo dõi.");
  }

  return id;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toPositiveInt = (value, fallback) => {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : fallback;
};

/**
 * Danh sách đơn đang theo dõi của khách.
 *
 * @param {{ stage?: string, search?: string, includeFinished?: boolean, pageNumber?: number, pageSize?: number }} [query]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ items: object[], totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export const getTrackedOrdersApi = async (query = {}, options = {}) => {
  const pageNumber = toPositiveInt(query.pageNumber, 1);
  const pageSize = toPositiveInt(query.pageSize, 10);

  const params = { pageNumber, pageSize };

  const stage = String(query.stage ?? "").trim();
  if (stage) params.stage = stage;

  const search = String(query.search ?? "").trim();
  if (search) params.search = search;

  if (query.includeFinished) params.includeFinished = true;

  try {
    const response = await httpClient.get("/api/orders/consignments/tracking", {
      params,
      signal: getSignal(options),
    });

    const data = unwrapData(response.data) || {};
    const items = toArray(data.items).map((item) => ({
      ...item,
      shipmentCodes: toArray(item?.shipmentCodes),
    }));
    const totalCount = Number(data.totalCount) || items.length;

    return {
      items,
      totalCount,
      pageNumber: Number(data.pageNumber) || pageNumber,
      pageSize: Number(data.pageSize) || pageSize,
      totalPages:
        Number(data.totalPages) || Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  } catch (error) {
    logApiError("Lỗi lấy danh sách đơn đang theo dõi:", error);

    throw error;
  }
};

/**
 * Hành trình chi tiết của một đơn.
 *
 * @param {string} orderId GUID đơn
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>} OrderTrackingDto — parcels/shipments/events luôn là mảng
 */
export const getOrderTrackingApi = async (orderId, options = {}) => {
  const id = requireOrderId(orderId);

  try {
    const response = await httpClient.get(
      `/api/orders/consignments/${encodeURIComponent(id)}/tracking`,
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return {
      ...data,
      parcels: toArray(data.parcels),
      shipments: toArray(data.shipments).map((shipment) => ({
        ...shipment,
        packageCodes: toArray(shipment?.packageCodes),
      })),
      events: toArray(data.events),
    };
  } catch (error) {
    logApiError("Lỗi lấy hành trình đơn:", error);

    throw error;
  }
};

/**
 * Bật / tắt giữ hàng tại kho nguồn.
 *
 * Bật bắt buộc có lý do (chặn tại chỗ, server cũng trả 400 cùng ý).
 * `parcelsAlreadyInApprovedRelease` là kiện đã nằm trong phiếu xuất đã duyệt —
 * cờ giữ hàng KHÔNG dừng được các kiện này, màn hình phải báo cho khách.
 *
 * @param {string} orderId
 * @param {{ hold: boolean, reason?: string }} payload
 * @param {{ signal?: AbortSignal }} [options]
 */
export const setExportHoldApi = async (orderId, { hold, reason } = {}, options = {}) => {
  const id = requireOrderId(orderId);
  const enable = Boolean(hold);
  const normalizedReason = String(reason ?? "").trim();

  if (enable && !normalizedReason) {
    throw new Error(
      "Bật giữ hàng phải ghi lý do để kho biết vì sao hàng không lên chuyến.",
    );
  }

  try {
    const response = await httpClient.put(
      `/api/orders/consignments/${encodeURIComponent(id)}/export-hold`,
      enable ? { hold: true, reason: normalizedReason } : { hold: false },
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return {
      ...data,
      parcelsAlreadyInApprovedRelease: toArray(data.parcelsAlreadyInApprovedRelease),
      message: response.data?.message,
    };
  } catch (error) {
    logApiError("Lỗi bật/tắt giữ hàng:", error);

    throw error;
  }
};

const orderTrackingApi = {
  getTrackedOrdersApi,
  getOrderTrackingApi,
  setExportHoldApi,
};

export default orderTrackingApi;
