import { getOrderStatusLabel } from "@features/consignment/constants/orderStatus";

/* Mã event của /timeline (api-ky-gui-1.md, "Theo dõi lịch sử đơn"). */
const EVENT_LABELS = Object.freeze({
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
});

/**
 * Nhãn một dòng lịch sử. Mã lạ (luồng sau thêm event mới) thì lấy nhãn trạng thái
 * đích; không có nữa thì hiện nguyên mã để không mất thông tin.
 */
export const getTimelineEventLabel = (entry) => {
  const code = String(entry?.event || "").trim().toUpperCase();

  if (EVENT_LABELS[code]) {
    return EVENT_LABELS[code];
  }

  if (entry?.toStatus && entry.toStatus !== entry.fromStatus) {
    return `Chuyển sang: ${getOrderStatusLabel(entry.toStatus)}`;
  }

  return code || "Cập nhật đơn";
};
