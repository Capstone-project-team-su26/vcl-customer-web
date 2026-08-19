import axiosInstance from "../axios";
import {
  getDeliveryRequestsApi,
  getDeliveryRequestByIdApi,
} from "./deliveryRequestApi";

/**
 * Theo dõi chặng giao hàng cuối cùng của một đơn.
 */
const TRACKING_ENDPOINT = (orderId) =>
  `/api/orders/${encodeURIComponent(orderId)}/delivery-tracking`;

const CONFIRM_ENDPOINT = (orderId) =>
  `/api/orders/consignments/${encodeURIComponent(orderId)}/customer-confirm`;

const readData = (response) => response?.data?.data ?? response?.data ?? null;

const readErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/** Tiến trình giao: phiếu giao, mã vận đơn, trạng thái từng kiện, phí lưu kho. */
export const getOrderDeliveryTrackingApi = async (orderId, options = {}) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.get(TRACKING_ENDPOINT(orderId), {
      signal: options.signal,
      timeout: options.timeout || 15000,
    });
    return readData(response);
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw new Error(
      readErrorMessage(error, "Không tải được tiến trình giao hàng của đơn này.")
    );
  }
};

/**
 * Hồ sơ hàng hoàn của đơn — kiện giao không thành công và đang quay về kho.
 */
export const getOrderParcelReturnsApi = async (orderId, options = {}) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.get(
      `/api/orders/${encodeURIComponent(orderId)}/parcel-returns`,
      {
        signal: options.signal,
        timeout: options.timeout || 15000,
      }
    );
    const data = readData(response);
    return Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw new Error(
      readErrorMessage(error, "Không tải được thông tin hàng hoàn của đơn này.")
    );
  }
};

/**
 * Khách xác nhận đã nhận đủ hàng — bước đóng vòng đời đơn.
 */
export const confirmOrderReceivedApi = async (orderId) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.put(CONFIRM_ENDPOINT(orderId));
    return readData(response);
  } catch (error) {
    throw new Error(
      readErrorMessage(error, "Không gửi được xác nhận nhận hàng.")
    );
  }
};

export { getDeliveryRequestsApi, getDeliveryRequestByIdApi };

export default {
  getDeliveryRequestsApi,
  getDeliveryRequestByIdApi,
  getOrderDeliveryTrackingApi,
  getOrderParcelReturnsApi,
  confirmOrderReceivedApi,
};

