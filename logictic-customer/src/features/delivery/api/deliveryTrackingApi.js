/* =========================================================
   deliveryTrackingApi — tiến trình giao + đóng đơn phía khách (API THẬT).

   - getOrderDeliveryTrackingApi -> GET /api/orders/{orderId}/delivery-tracking
       → { message, data: OrderDeliveryTrackingDto { orderId, orderCode, orderStatus,
           orderStatusText, isCustomerConfirmed, customerConfirmedAt, canConfirmReceipt,
           storageFeeAmount, storageFeeNote, deliveries[], parcels[] } }
       deliveries[]: { deliveryRequestId, deliveryCode, status, statusText, receiverName,
         fullAddress, carrierTrackingCode, scheduledDate, dispatchedAt, totalParcels }
       parcels[]: { packageCode, packageStatus, statusText, destinationHandling,
         handlingText, storedAt }
       Đơn của khách khác → 403.
   - confirmOrderReceivedApi     -> PUT /api/orders/consignments/{orderId}/customer-confirm
       → { message, data: OrderClosingResponseDto { orderId, consignmentCode, status,
           statusLabel, actedByName, actedAt, note } }
       Chỉ khi đơn DELIVERED. Không vướng gì → COMPLETED ngay; còn sự cố / khiếu nại /
       bồi thường / khoản thu treo → CUSTOMER_CONFIRMED, tự đóng khi gỡ xong.
       Không phải chủ đơn → 401 { message } (lỗi nghiệp vụ, httpClient KHÔNG đăng xuất).

   ĐÃ BỎ getOrderParcelReturnsApi (/api/orders/{id}/parcel-returns): luồng hàng hoàn mới
   đi qua phiếu giao (DELIVERY_RETURNED → giao lại), màn hình dùng nó đã bị xoá.
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

const requireOrderId = (orderId) => {
  const id = String(orderId ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error("Thiếu mã đơn hàng.");
  }

  return id;
};

/** Tiến trình giao hàng của đơn (object đã bóc envelope, mảng luôn là mảng). */
export const getOrderDeliveryTrackingApi = async (orderId, options = {}) => {
  const id = requireOrderId(orderId);

  try {
    const response = await httpClient.get(
      `/api/orders/${encodeURIComponent(id)}/delivery-tracking`,
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return {
      ...data,
      deliveries: Array.isArray(data.deliveries) ? data.deliveries : [],
      parcels: Array.isArray(data.parcels) ? data.parcels : [],
    };
  } catch (error) {
    logApiError("Lỗi lấy tiến trình giao hàng:", error);

    throw error;
  }
};

/** Khách bấm "Đã nhận hàng". */
export const confirmOrderReceivedApi = async (orderId, options = {}) => {
  const id = requireOrderId(orderId);

  try {
    const response = await httpClient.put(
      `/api/orders/consignments/${encodeURIComponent(id)}/customer-confirm`,
      null,
      { signal: getSignal(options) },
    );

    const data = unwrapData(response.data) || {};

    return {
      success: true,
      ...data,
      message: response.data?.message || "Đã ghi nhận xác nhận nhận hàng.",
    };
  } catch (error) {
    logApiError("Lỗi xác nhận đã nhận hàng:", error);

    throw error;
  }
};

export default {
  getOrderDeliveryTrackingApi,
  confirmOrderReceivedApi,
};
