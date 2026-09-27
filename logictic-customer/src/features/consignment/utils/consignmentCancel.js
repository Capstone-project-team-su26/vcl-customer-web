/**
 * Khách có được TỰ huỷ đơn ký gửi hay không — một hàm dùng chung cho mọi chỗ hiện nút "Hủy đơn".
 *
 * Bám đúng backend (PUT /api/orders/consignments/{orderId}/cancel →
 * OrderService.CancelConsignmentAsync, VCL_BLL/Services/OrderService.Workflow.cs):
 *   1. Đơn đã CANCELLED → từ chối.
 *   2. Mã trạng thái THÔ (không chuẩn hoá mã cũ) phải thuộc `CancellableStatuses`
 *      (VCL_BLL/Services/OrderService.cs) → ngoài danh sách thì từ chối.
 *   3. Có khoản thanh toán PAID với số tiền > 0 → từ chối ("liên hệ Sales").
 * Backend vẫn là chốt chặn cuối; hàm này chỉ để giao diện không mời khách bấm một nút chắc chắn lỗi.
 */
import { ORDER_STATUS, normalizeOrderStatus } from "../constants/orderStatus";

/** Bản sao `CancellableStatuses` của backend — so với mã THÔ viết hoa, giống backend. */
export const CUSTOMER_CANCELLABLE_ORDER_STATUSES = Object.freeze([
  "PENDING_REVIEW",
  "NEED_MORE_INFO",
  "APPROVED",
  "QUOTATION_SENT",
  "QUOTATION_REJECTED",
  "QUOTATION_CONFIRMED",
  "WAITING_DEPOSIT",
]);

/** Các trạng thái chỉ đạt được sau khi khách đã trả tiền (cọc hoặc tất toán). */
const POST_PAYMENT_ORDER_STATUSES = new Set([
  ORDER_STATUS.DEPOSIT_PAID,
  ORDER_STATUS.CHECKED_IN,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.ARRIVED_VN,
  ORDER_STATUS.ARRIVED_DESTINATION,
  ORDER_STATUS.WAITING_PAYMENT,
  ORDER_STATUS.PAID,
  ORDER_STATUS.STORED_AT_VN,
  ORDER_STATUS.DELIVERING,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
]);

/** Trang CSKH (DASHBOARD_ROUTES.customerServiceChat ở src/app/router/paths.js). */
export const CUSTOMER_SERVICE_CHAT_PATH = "/customer-service-chat";

/** Kết quả của getConsignmentCancelState. */
export const CONSIGNMENT_CANCEL_MODE = Object.freeze({
  /** Hiện nút "Hủy đơn". */
  allowed: "allowed",
  /** Đã trả tiền: không hiện nút, hiện dòng giải thích + lối sang CSKH. */
  paid: "paid",
  /** Không hiện gì (đã huỷ, bị từ chối, trạng thái lạ, hoặc đang chờ tải thanh toán). */
  hidden: "hidden",
});

const toRawStatus = (status) => String(status ?? "").trim().toUpperCase();

/** Mã trạng thái (thô) nằm trong danh sách backend cho khách tự huỷ. */
export const isCustomerCancellableStatus = (status) =>
  CUSTOMER_CANCELLABLE_ORDER_STATUSES.includes(toRawStatus(status));

/**
 * Có ít nhất một khoản đã thu tiền: PAID (trường `paymentStatus` của backend, hoặc `status`
 * — màn lịch sử chuẩn hoá thành SUCCESS) và số tiền > 0, cùng điều kiện với backend.
 */
export const hasConfirmedPayment = (payments) =>
  Array.isArray(payments) &&
  payments.some((payment) => {
    const status = toRawStatus(payment?.paymentStatus ?? payment?.status);
    return (status === "PAID" || status === "SUCCESS") && Number(payment?.amount) > 0;
  });

/**
 * @param {object} args
 * @param {string} args.status        Trạng thái đơn đúng như backend trả (chưa chuẩn hoá).
 * @param {Array<object>} [args.payments]  Danh sách GET /api/orders/{orderId}/payments (nếu đã tải).
 * @param {boolean} [args.paymentsLoading] Đang tải danh sách thanh toán → tạm ẩn để nút không nháy.
 * @returns {"allowed" | "paid" | "hidden"}
 */
export const getConsignmentCancelMode = ({
  status,
  payments,
  paymentsLoading = false,
} = {}) => {
  const normalized = normalizeOrderStatus(status);

  if (!normalized || normalized === ORDER_STATUS.CANCELLED) {
    return CONSIGNMENT_CANCEL_MODE.hidden;
  }

  if (hasConfirmedPayment(payments)) return CONSIGNMENT_CANCEL_MODE.paid;

  if (isCustomerCancellableStatus(status)) {
    return paymentsLoading
      ? CONSIGNMENT_CANCEL_MODE.hidden
      : CONSIGNMENT_CANCEL_MODE.allowed;
  }

  return POST_PAYMENT_ORDER_STATUSES.has(normalized)
    ? CONSIGNMENT_CANCEL_MODE.paid
    : CONSIGNMENT_CANCEL_MODE.hidden;
};
