/**
 * Đơn của khách đang chờ tất toán.
 *
 * Dùng chung endpoint với hàng đợi của Sale — phía server tự lọc về đúng đơn của người đang
 * đăng nhập, nên khách và nhân viên luôn nhìn cùng một sự thật thay vì hai danh sách tự tính.
 */

import axiosInstance from "../axios";

const ENDPOINT = "/api/orders/awaiting-settlement";

const unwrap = (response) => {
  const body = response?.data;
  const data = body?.data ?? body;
  return Array.isArray(data?.items) ? data.items : [];
};

/**
 * @returns {Promise<Array>} đơn đã về kho VN, chưa tất toán xong
 */
export const getAwaitingSettlementApi = async (options = {}) => {
  const response = await axiosInstance.get(ENDPOINT, {
    signal: options?.signal,
  });

  return unwrap(response);
};

export default { getAwaitingSettlementApi };
