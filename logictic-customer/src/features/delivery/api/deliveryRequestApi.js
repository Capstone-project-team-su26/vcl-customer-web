/* =========================================================
   deliveryRequestApi — yêu cầu giao hàng chặng cuối (API THẬT).

   Bám DeliveryRequestController / DeliveryRequestService của VCL_API
   (tài liệu hàng về VN mục D2–D4):

   - createDeliveryRequestApi  -> POST /api/delivery-requests
       { orderId, parcelIds, receiverName, receiverPhone, addressDetail, province,
         district, ward, scheduledDate, note }
       → 201 { message, data: DeliveryRequestDto }
       Khách chỉ đặt cho đơn của mình (403), đơn phải đã tất toán (400), kiện phải sẵn
       sàng giao: STORED, hoặc RECEIVED_AT_DESTINATION + DIRECT_DELIVERY, không vướng
       sự cố mở, chưa nằm trong phiếu giao khác. Khách KHÔNG gửi redeliveryFee (403 —
       phí giao lại do Sale báo).
   - getDeliveryRequestByIdApi -> GET /api/delivery-requests/{id}
       → { message, data: DeliveryRequestDto } — có redeliveryFee,
       redeliveryFeePaymentStatus, redeliveryFeeCheckoutUrl, returnedAt, proofAt...

   ĐÃ BỎ getDeliveryRequestsApi (GET /api/delivery-requests): backend chỉ cho nhân viên
   (dữ liệu gồm SĐT, địa chỉ của mọi khách), khách gọi → 403. Khách xem phiếu giao của
   đơn mình qua GET /api/orders/{orderId}/delivery-tracking (deliveryTrackingApi).
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trạng thái phiếu giao (DeliveryRequestService) — server đã trả sẵn statusText. */
export const DELIVERY_REQUEST_STATUS_LABELS = Object.freeze({
  DELIVERY_PENDING: "Chờ quản lý kho duyệt",
  DELIVERY_APPROVED: "Đã duyệt, kho đang gom hàng",
  DELIVERY_REJECTED: "Bị từ chối",
  DELIVERY_DISPATCHED: "Đã giao cho đơn vị vận chuyển",
  DELIVERY_RETURNED: "Hàng hoàn về kho",
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

const requiredText = (value, message, maxLength) => {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(message);
  }

  if (maxLength && text.length > maxLength) {
    throw new Error(`${message.replace(/^Vui lòng nhập /, "")} quá dài (tối đa ${maxLength} ký tự).`);
  }

  return text;
};

/**
 * Khách tự đặt giao cho các kiện sẵn sàng của đơn mình.
 *
 * @param {{ orderId: string, parcelIds?: string[], receiverName: string, receiverPhone: string,
 *           addressDetail: string, province: string, district: string, ward: string,
 *           scheduledDate?: string|null, note?: string }} payload
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>} DeliveryRequestDto kèm `message`
 */
export const createDeliveryRequestApi = async (payload = {}, options = {}) => {
  const orderId = String(payload.orderId ?? "").trim();

  if (!UUID_PATTERN.test(orderId)) {
    throw new Error("Không xác định được đơn hàng cần giao.");
  }

  const parcelIds = Array.isArray(payload.parcelIds)
    ? payload.parcelIds.map((id) => String(id).trim()).filter((id) => UUID_PATTERN.test(id))
    : [];

  /* Validate theo đúng [Required]/[MaxLength] của CreateDeliveryRequestDto. */
  const body = {
    orderId,
    parcelIds: parcelIds.length > 0 ? parcelIds : null,
    receiverName: requiredText(payload.receiverName, "Vui lòng nhập tên người nhận.", 150),
    receiverPhone: requiredText(payload.receiverPhone, "Vui lòng nhập số điện thoại người nhận.", 30),
    addressDetail: requiredText(payload.addressDetail, "Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường).", 300),
    province: requiredText(payload.province, "Vui lòng nhập tỉnh/thành phố.", 100),
    district: requiredText(payload.district, "Vui lòng nhập quận/huyện.", 100),
    ward: requiredText(payload.ward, "Vui lòng nhập phường/xã.", 100),
    scheduledDate: payload.scheduledDate || null,
    note: String(payload.note ?? "").trim().slice(0, 500) || null,
  };

  try {
    const response = await httpClient.post("/api/delivery-requests", body, {
      signal: getSignal(options),
    });

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi lập yêu cầu giao hàng:", error);

    throw error;
  }
};

/**
 * Chi tiết một phiếu giao — dùng để lấy phí giao lại + link trả phí của phiếu giao lại.
 *
 * @param {string} deliveryRequestId
 * @param {{ signal?: AbortSignal }} [options]
 */
export const getDeliveryRequestByIdApi = async (deliveryRequestId, options = {}) => {
  const id = String(deliveryRequestId ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error("Thiếu mã yêu cầu giao hàng.");
  }

  try {
    const response = await httpClient.get(
      `/api/delivery-requests/${encodeURIComponent(id)}`,
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return { ...data, parcels: Array.isArray(data.parcels) ? data.parcels : [] };
  } catch (error) {
    logApiError("Lỗi lấy chi tiết yêu cầu giao hàng:", error);

    throw error;
  }
};

export default {
  createDeliveryRequestApi,
  getDeliveryRequestByIdApi,
};
