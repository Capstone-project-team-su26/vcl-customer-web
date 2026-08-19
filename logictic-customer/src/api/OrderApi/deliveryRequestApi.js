import axiosInstance from "../axios";

/**
 * Helper đọc message lỗi từ phản hồi server
 */
const readErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/**
 * Lấy danh sách yêu cầu giao hàng (Delivery Requests)
 * Endpoint: GET /api/delivery-requests
 *
 * @param {Object} [params] - Bộ lọc & phân trang (page, pageSize, status, orderId, search, ...)
 * @param {Object} [options] - Cấu hình request bổ sung (signal, timeout, ...)
 * @returns {Promise<{ items: Array<Object>, totalCount: number }>}
 */
export const getDeliveryRequestsApi = async (params = {}, options = {}) => {
  try {
    const response = await axiosInstance.get("/api/delivery-requests", {
      params,
      signal: options.signal,
      timeout: options.timeout || 15000,
    });
    return response?.data?.data ?? response?.data ?? null;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw new Error(
      readErrorMessage(error, "Không thể lấy danh sách yêu cầu giao hàng.")
    );
  }
};

/**
 * Lấy chi tiết một yêu cầu giao hàng theo ID
 * Endpoint: GET /api/delivery-requests/{deliveryRequestId}
 *
 * @param {string} deliveryRequestId - ID của yêu cầu giao hàng
 * @param {Object} [options] - Cấu hình request bổ sung (signal, timeout, ...)
 * @returns {Promise<Object>}
 */
export const getDeliveryRequestByIdApi = async (
  deliveryRequestId,
  options = {}
) => {
  if (!deliveryRequestId)
    throw new Error("Thiếu mã yêu cầu giao hàng (deliveryRequestId).");

  try {
    const response = await axiosInstance.get(
      `/api/delivery-requests/${encodeURIComponent(deliveryRequestId)}`,
      {
        signal: options.signal,
        timeout: options.timeout || 15000,
      }
    );
    return response?.data?.data ?? response?.data ?? null;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    throw new Error(
      readErrorMessage(
        error,
        "Không thể lấy thông tin chi tiết yêu cầu giao hàng."
      )
    );
  }
};

export default {
  getDeliveryRequestsApi,
  getDeliveryRequestByIdApi,
};
