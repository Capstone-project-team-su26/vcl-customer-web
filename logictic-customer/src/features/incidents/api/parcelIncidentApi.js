/* =========================================================
   parcelIncidentApi — sự cố hàng hoá & khiếu nại phía khách (API THẬT).

   Bám ParcelIncidentsController / VnArrivalController (tài liệu hàng về VN mục E, F):
   - getParcelIncidentsApi       -> GET  /api/parcel-incidents?orderId=&status=&incidentType=&pageNumber=&pageSize=
                                    → { message, data: { items, totalCount, pageNumber, pageSize, totalPages } }
                                    Khách chỉ thấy sự cố của đơn mình.
   - getParcelIncidentDetailApi  -> GET  /api/parcel-incidents/{id} → { message, data: ParcelIncidentDto }
                                    (kèm attachments[] — ảnh hiện trạng)
   - respondParcelIncidentApi    -> POST /api/parcel-incidents/{id}/customer-response { choice, note }
                                    choice: ACCEPT · COMPENSATE · DISPOSE (COMPLAINT không được DISPOSE;
                                    WEIGHT_DEVIATION khách không chọn → 400).
   - createOrderComplaintApi     -> POST /api/orders/consignments/{orderId}/complaints { parcelIds, description }
                                    → 201 { message, data: ParcelIncidentDto[] } — mỗi kiện một khiếu nại.
                                    Chỉ khi đơn DELIVERED / CUSTOMER_CONFIRMED và trong 3 ngày sau giao.

   Ảnh INCIDENT_PHOTO cho khiếu nại của mình: shared/api/attachmentApi
   (entityType INCIDENT, entityId = id sự cố).
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const INCIDENT_STATUSES = Object.freeze({
  OPEN: "OPEN",
  CUSTOMER_RESPONDED: "CUSTOMER_RESPONDED",
  RESOLVED: "RESOLVED",
});

export const INCIDENT_STATUS_LABELS = Object.freeze({
  OPEN: "Chờ bạn chọn cách xử lý",
  CUSTOMER_RESPONDED: "Đã chọn, chờ quản lý kho quyết định",
  RESOLVED: "Đã xử lý xong",
});

export const INCIDENT_TYPE_LABELS = Object.freeze({
  DAMAGED: "Hàng hỏng",
  WRONG_ITEM: "Sai hàng",
  MISSING_ITEMS: "Thiếu hàng",
  WEIGHT_DEVIATION: "Cân lệch bất thường",
  COMPLAINT: "Khách khiếu nại",
});

export const INCIDENT_CHOICES = Object.freeze({
  ACCEPT: "ACCEPT",
  COMPENSATE: "COMPENSATE",
  DISPOSE: "DISPOSE",
});

export const INCIDENT_CHOICE_LABELS = Object.freeze({
  ACCEPT: "Nhận hàng như hiện trạng",
  COMPENSATE: "Yêu cầu bồi thường",
  DISPOSE: "Huỷ hàng (không tính cước, không giao)",
});

/** Kết quả quản lý kho quyết — cùng bộ mã với lựa chọn của khách. */
export const INCIDENT_RESOLUTION_LABELS = Object.freeze({
  ACCEPT: "Nhận hàng như hiện trạng",
  COMPENSATE: "Bồi thường",
  DISPOSE: "Huỷ hàng",
});

/** Loại COMPLAINT là hàng đã giao — không huỷ hàng được. */
export const getAllowedIncidentChoices = (incidentType) =>
  String(incidentType ?? "").toUpperCase() === "COMPLAINT"
    ? [INCIDENT_CHOICES.ACCEPT, INCIDENT_CHOICES.COMPENSATE]
    : [INCIDENT_CHOICES.ACCEPT, INCIDENT_CHOICES.COMPENSATE, INCIDENT_CHOICES.DISPOSE];

/** Số ngày được khiếu nại sau khi giao (Closing:ComplaintWindowDays, mặc định 3). */
export const COMPLAINT_WINDOW_DAYS = 3;

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

const requireGuid = (value, message) => {
  const id = String(value ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error(message);
  }

  return id;
};

const toIncident = (item) => ({
  ...item,
  attachments: Array.isArray(item?.attachments) ? item.attachments : [],
});

/**
 * @param {{ orderId?: string, status?: string, incidentType?: string, pageNumber?: number, pageSize?: number }} [query]
 * @param {{ signal?: AbortSignal }} [options]
 */
export const getParcelIncidentsApi = async (query = {}, options = {}) => {
  const params = {
    pageNumber: Number(query.pageNumber) > 0 ? Number(query.pageNumber) : 1,
    pageSize: Number(query.pageSize) > 0 ? Number(query.pageSize) : 50,
  };

  if (query.orderId) params.orderId = requireGuid(query.orderId, "Không xác định được đơn hàng.");
  if (query.status) params.status = String(query.status);
  if (query.incidentType) params.incidentType = String(query.incidentType);

  try {
    const response = await httpClient.get("/api/parcel-incidents", {
      params,
      signal: getSignal(options),
    });

    const data = unwrapData(response.data) || {};
    const items = (Array.isArray(data.items) ? data.items : []).map(toIncident);

    return {
      items,
      totalCount: Number(data.totalCount) || items.length,
      pageNumber: Number(data.pageNumber) || params.pageNumber,
      pageSize: Number(data.pageSize) || params.pageSize,
      totalPages: Number(data.totalPages) || 1,
    };
  } catch (error) {
    logApiError("Lỗi lấy danh sách sự cố:", error);

    throw error;
  }
};

export const getParcelIncidentDetailApi = async (incidentId, options = {}) => {
  const id = requireGuid(incidentId, "Không tìm thấy sự cố.");

  try {
    const response = await httpClient.get(
      `/api/parcel-incidents/${encodeURIComponent(id)}`,
      { signal: getSignal(options) },
    );

    return toIncident(unwrapData(response.data) || {});
  } catch (error) {
    logApiError("Lỗi lấy chi tiết sự cố:", error);

    throw error;
  }
};

/**
 * Khách chọn cách xử lý sự cố.
 *
 * @param {string} incidentId
 * @param {{ choice: string, note?: string, incidentType?: string }} payload
 */
export const respondParcelIncidentApi = async (
  incidentId,
  { choice, note, incidentType } = {},
  options = {},
) => {
  const id = requireGuid(incidentId, "Không tìm thấy sự cố.");
  const normalizedChoice = String(choice ?? "").trim().toUpperCase();

  if (!getAllowedIncidentChoices(incidentType).includes(normalizedChoice)) {
    throw new Error(
      String(incidentType ?? "").toUpperCase() === "COMPLAINT"
        ? "Hàng đã giao thì không chọn huỷ hàng được — chọn nhận hàng hoặc bồi thường."
        : "Vui lòng chọn cách xử lý.",
    );
  }

  try {
    const response = await httpClient.post(
      `/api/parcel-incidents/${encodeURIComponent(id)}/customer-response`,
      { choice: normalizedChoice, note: String(note ?? "").trim() || null },
      { signal: getSignal(options) },
    );

    return { ...toIncident(unwrapData(response.data) || {}), message: response.data?.message };
  } catch (error) {
    logApiError("Lỗi gửi lựa chọn xử lý sự cố:", error);

    throw error;
  }
};

/**
 * Khiếu nại sau khi nhận hàng.
 *
 * @param {string} orderId
 * @param {{ parcelIds?: string[], description: string }} payload
 * @returns {Promise<{ incidents: object[], message?: string }>}
 */
export const createOrderComplaintApi = async (
  orderId,
  { parcelIds, description } = {},
  options = {},
) => {
  const id = requireGuid(orderId, "Không xác định được đơn hàng.");
  const text = String(description ?? "").trim();

  if (!text) {
    throw new Error("Phải mô tả vấn đề khiếu nại.");
  }

  const ids = (Array.isArray(parcelIds) ? parcelIds : []).filter((value) =>
    UUID_PATTERN.test(String(value)),
  );

  try {
    const response = await httpClient.post(
      `/api/orders/consignments/${encodeURIComponent(id)}/complaints`,
      /* parcelIds rỗng = mọi kiện đã giao của đơn (server tự gom). */
      { parcelIds: ids.length > 0 ? ids : null, description: text },
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data);

    return {
      incidents: (Array.isArray(data) ? data : []).map(toIncident),
      message: response.data?.message,
    };
  } catch (error) {
    logApiError("Lỗi gửi khiếu nại:", error);

    throw error;
  }
};

export default {
  getParcelIncidentsApi,
  getParcelIncidentDetailApi,
  respondParcelIncidentApi,
  createOrderComplaintApi,
};
