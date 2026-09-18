/* =========================================================
   CONSTANTS
   =========================================================

   Tách khỏi ConsignmentListCheck.jsx để dữ liệu tĩnh nằm
   một chỗ, không lẫn với logic render của trang.
   ========================================================= */

import { ORDER_STATUS } from "@features/consignment/constants/orderStatus";

export const DEFAULT_PAGE_SIZE = 10;


/**
 * Mã trạng thái "đã gửi báo giá" của đơn — lấy từ module trạng thái dùng chung.
 * Giữ tên export cũ; mã cũ/biến thể của đơn được chuẩn hóa bằng
 * normalizeOrderStatus trước khi so sánh (xem isQuotationSentStatus).
 */
export const QUOTATION_SENT_STATUS_KEYWORDS = Object.freeze([
  ORDER_STATUS.QUOTATION_SENT,
]);
