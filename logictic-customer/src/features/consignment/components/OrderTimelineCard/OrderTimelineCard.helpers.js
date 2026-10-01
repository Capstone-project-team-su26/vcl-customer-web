import { getOrderStatusLabel } from "@features/consignment/constants/orderStatus";
import { labelOf } from "@shared/utils/statusLabel";

/* Mã event của /timeline (api-ky-gui-1.md, "Theo dõi lịch sử đơn") — đủ bộ
   OrderStatusHistory.EventCode của backend (tools/status-codes.json › orderHistoryEvent). */
export const ORDER_HISTORY_EVENT_LABELS = Object.freeze({
  QUOTATION_SENT: "Đã gửi báo giá",
  QUOTATION_SUBMITTED_FOR_PRICE_APPROVAL: "Báo giá đang được duyệt giá",
  QUOTATION_PRICE_APPROVED: "Báo giá đã được duyệt giá",
  QUOTATION_PRICE_REJECTED: "Báo giá cần lập lại",
  QUOTATION_REJECTED: "Bạn đã từ chối báo giá",
  QUOTATION_ACCEPTED: "Bạn đã xác nhận báo giá",
  PAYMENT_CONFIRMED_DEPOSIT: "Đã nhận tiền cọc",
  PAYMENT_RECEIVED_UNALLOCATED: "Đã nhận tiền, đang đối soát",
  RECEIVING_NOTE_CREATED: "Đã lập phiếu nhập kho",
  RECEIVING_NOTE_APPROVED_TO_RECEIVE: "Phiếu nhập kho đã được duyệt",
  RECEIVING_NOTE_REJECTED: "Phiếu nhập kho bị từ chối",
  RECEIVING_NOTE_COUNTED: "Kho đã kiểm đếm hàng",
  RECEIVING_COUNT_APPROVED: "Kho đã chốt nhận hàng",
  RECEIVING_COUNT_REJECTED: "Kết quả kiểm đếm bị từ chối",
  ORDER_CANCELLED_BY_CUSTOMER: "Bạn đã huỷ đơn",
  RECEIVING_DISCREPANCY_ACCEPTED: "Đã chấp nhận chênh lệch khi kiểm đếm",
  ORDER_REJECTED: "Đơn bị từ chối",
  ORDER_NEED_MORE_INFO: "VCL cần bạn bổ sung thông tin",
  ORDER_DELIVERED: "Đã giao hàng",
  ORDER_COMPLETED_BY_CUSTOMER: "Bạn đã xác nhận hoàn tất đơn",
  ORDER_AUTO_COMPLETED: "Đơn tự động hoàn tất",
  PAYMENT_CONFIRMED_FINAL_PAYMENT: "Đã nhận tiền tất toán",
  PAYMENT_CONFIRMED_FULL_PAYMENT: "Đã nhận tiền thanh toán",
  PAYMENT_CONFIRMED_STORAGE_FEE: "Đã nhận phí lưu kho",
  PAYMENT_CONFIRMED_REDELIVERY_FEE: "Đã nhận phí giao lại",
  PAYMENT_CONFIRMED_UNKNOWN: "Đã nhận một khoản thanh toán",
  PURCHASE_ORDER_PLACED: "VCL đã đặt hàng với người bán",
  PURCHASE_ORDER_CANCELLED: "Đơn đặt hàng với người bán đã huỷ",
});

/** Nhãn một mã sự kiện lịch sử đơn — mã lạ ra nhãn an toàn, không in mã thô. */
export const getOrderHistoryEventLabel = (code) =>
  labelOf(ORDER_HISTORY_EVENT_LABELS, code, { generic: "Cập nhật đơn", empty: "Cập nhật đơn" });

/**
 * Nhãn một dòng lịch sử. Mã lạ (luồng sau thêm event mới) thì lấy nhãn trạng thái
 * đích; không có nữa thì nhãn an toàn từ bảng chung (KHÔNG in mã thô).
 */
export const getTimelineEventLabel = (entry) => {
  const code = String(entry?.event || "").trim().toUpperCase();

  if (ORDER_HISTORY_EVENT_LABELS[code]) {
    return ORDER_HISTORY_EVENT_LABELS[code];
  }

  if (entry?.toStatus && entry.toStatus !== entry.fromStatus) {
    return `Chuyển sang: ${getOrderStatusLabel(entry.toStatus)}`;
  }

  return getOrderHistoryEventLabel(code);
};
