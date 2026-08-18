import axiosInstance from "../axios";

/**
 * Theo dõi chặng giao hàng cuối cùng của một đơn.
 *
 * Dùng endpoint riêng cho khách chứ không gọi `/api/delivery-requests`: danh sách đó trả phiếu
 * của mọi khách kèm tên, số điện thoại và địa chỉ nhà, nên BE chỉ mở cho nhân viên.
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
export const getOrderDeliveryTrackingApi = async (orderId) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.get(TRACKING_ENDPOINT(orderId), {
      timeout: 15000,
    });
    return readData(response);
  } catch (error) {
    throw new Error(
      readErrorMessage(error, "Không tải được tiến trình giao hàng của đơn này."),
    );
  }
};

/**
 * Hồ sơ hàng hoàn của đơn — kiện giao không thành công và đang quay về kho.
 *
 * BE tự kiểm quyền sở hữu nên khách chỉ đọc được đơn của mình. Đơn giao trót lọt thì trả về
 * danh sách rỗng, không phải lỗi.
 */
export const getOrderParcelReturnsApi = async (orderId) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.get(
      `/api/orders/${encodeURIComponent(orderId)}/parcel-returns`,
      { timeout: 15000 },
    );
    const data = readData(response);
    return Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    throw new Error(
      readErrorMessage(error, "Không tải được thông tin hàng hoàn của đơn này."),
    );
  }
};

/**
 * Khách xác nhận đã nhận đủ hàng — bước đóng vòng đời đơn.
 *
 * BE chỉ cho gọi khi hãng giao đã báo xong (đơn ở DELIVERED), và không nhận body: danh tính
 * khách lấy từ token. Không bấm thì sau thời gian ân hạn Operations Manager chốt thay.
 */
export const confirmOrderReceivedApi = async (orderId) => {
  if (!orderId) throw new Error("Thiếu mã đơn hàng.");

  try {
    const response = await axiosInstance.put(CONFIRM_ENDPOINT(orderId));
    return readData(response);
  } catch (error) {
    throw new Error(
      readErrorMessage(error, "Không gửi được xác nhận nhận hàng."),
    );
  }
};

export default {
  getOrderDeliveryTrackingApi,
  getOrderParcelReturnsApi,
  confirmOrderReceivedApi,
};
