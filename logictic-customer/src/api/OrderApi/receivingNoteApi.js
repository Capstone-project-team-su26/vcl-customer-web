import axiosInstance from "../axios";

/**
 * Phiếu tiếp nhận kho của đơn ký gửi — phần khách được xem.
 *
 * Phiếu do hệ thống tự sinh khi đơn thu được tiền, không phải thứ khách tạo. Khách xem để biết
 * kho đã nhận hàng chưa và số kho đếm được có khớp với những gì mình khai không.
 *
 * BE chỉ trả phiếu của đơn thuộc chính người đang đăng nhập; hỏi đơn người khác sẽ bị 403.
 */

/** Không có phiếu là chuyện bình thường (chưa thanh toán, hoặc đơn mua hộ) → trả null. */
export async function getMyReceivingNoteApi(orderId, options = {}) {
  if (!orderId) return null;

  try {
    const response = await axiosInstance.get(
      `/api/warehouse-receiving-notes/my-order/${encodeURIComponent(orderId)}`,
      { signal: options.signal },
    );
    return response?.data?.data ?? null;
  } catch (error) {
    if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
      throw error;
    }
    // Đơn chưa có phiếu, hoặc khách không có quyền: màn hình chỉ việc ẩn khối này đi,
    // không nên bắn lỗi đỏ vào mặt khách vì đây không phải thao tác họ vừa làm.
    return null;
  }
}

export default { getMyReceivingNoteApi };
