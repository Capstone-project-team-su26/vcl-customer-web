/* =========================================================
   OrderList.helpers.js — quy đổi đơn ký gửi + yêu cầu mua hộ về MỘT dòng danh sách.

   Trước đây khách phải nhớ đơn của mình nằm ở menu nào ("Đơn đang xử lý", "Kiện chờ
   báo giá", "Theo dõi đơn hàng", hay "Lịch sử mua hàng") mới tìm ra. Giờ mỗi loại đơn
   có đúng MỘT danh sách (ký gửi / mua hộ, cùng một component), nên chỗ này chịu trách
   nhiệm:

   - xếp mọi mã trạng thái (19 mã đơn ký gửi + mã yêu cầu mua hộ) vào 7 giai đoạn khách
     hiểu được;
   - nói thẳng VIỆC KHÁCH CẦN LÀM trên từng dòng, kèm tab nên mở khi bấm vào.

   Không gọi API: dữ liệu do trang truyền vào.
   ========================================================= */

/* Import sâu: chỉ cần bảng trạng thái, barrel consignment kéo theo cả các trang (CSS). */
import {
  getOrderStatusLabel,
  normalizeOrderStatus,
} from "@features/consignment/constants/orderStatus";
import { formatVnd } from "@shared/utils/formatNumber";
import { apiToTimestamp } from "@shared/utils/timeUtc";
import { ORDER_KINDS, ORDER_TABS } from "@features/orders/constants/orderPaths";

/* ---------------------------------------------------------- *
 * Chip giai đoạn                                              *
 * ---------------------------------------------------------- */

export const ORDER_STAGES = Object.freeze({
  all: "tat-ca",
  awaitingQuotation: "cho-bao-gia",
  awaitingPayment: "cho-thanh-toan",
  processing: "dang-xu-ly",
  shipping: "dang-van-chuyen",
  delivered: "da-giao",
  completed: "hoan-tat",
  cancelled: "da-huy",
});

export const ORDER_STAGE_CHIPS = Object.freeze([
  { value: ORDER_STAGES.all, label: "Tất cả" },
  { value: ORDER_STAGES.awaitingQuotation, label: "Chờ báo giá" },
  { value: ORDER_STAGES.awaitingPayment, label: "Chờ thanh toán" },
  { value: ORDER_STAGES.processing, label: "Đang xử lý" },
  { value: ORDER_STAGES.shipping, label: "Đang vận chuyển" },
  { value: ORDER_STAGES.delivered, label: "Đã giao" },
  { value: ORDER_STAGES.completed, label: "Hoàn tất" },
  { value: ORDER_STAGES.cancelled, label: "Đã huỷ" },
]);

const STAGE_VALUES = ORDER_STAGE_CHIPS.map((chip) => chip.value);

/** Giá trị lạ trên URL (gõ tay, link cũ) → về "tất cả" thay vì danh sách trống. */
export const normalizeStage = (value) =>
  STAGE_VALUES.includes(value) ? value : ORDER_STAGES.all;

/* ---------------------------------------------------------- *
 * Mã trạng thái → giai đoạn                                   *
 * ---------------------------------------------------------- */

/* 19 mã đích của đơn ký gửi (constants/orderStatus.js). */
const CONSIGNMENT_STAGE_BY_STATUS = {
  PENDING_REVIEW: ORDER_STAGES.awaitingQuotation,
  NEED_MORE_INFO: ORDER_STAGES.awaitingQuotation,
  QUOTATION_SENT: ORDER_STAGES.awaitingQuotation,

  WAITING_DEPOSIT: ORDER_STAGES.awaitingPayment,
  WAITING_PAYMENT: ORDER_STAGES.awaitingPayment,

  DEPOSIT_PAID: ORDER_STAGES.processing,
  APPROVED: ORDER_STAGES.processing,
  CHECKED_IN: ORDER_STAGES.processing,
  ARRIVED_DESTINATION: ORDER_STAGES.processing,
  STORED_AT_VN: ORDER_STAGES.processing,
  PAID: ORDER_STAGES.processing,

  IN_TRANSIT: ORDER_STAGES.shipping,
  ARRIVED_VN: ORDER_STAGES.shipping,
  DELIVERING: ORDER_STAGES.shipping,

  DELIVERED: ORDER_STAGES.delivered,
  COMPLETED: ORDER_STAGES.completed,

  REJECTED: ORDER_STAGES.cancelled,
  QUOTATION_REJECTED: ORDER_STAGES.cancelled,
  CANCELLED: ORDER_STAGES.cancelled,
};

/* Yêu cầu mua hộ có máy trạng thái riêng, không dùng bảng của đơn ký gửi. */
const PURCHASE_STAGE_BY_STATUS = {
  PENDING_REVIEW: ORDER_STAGES.awaitingQuotation,
  QUOTED: ORDER_STAGES.awaitingQuotation,
  QUOTATION_SENT: ORDER_STAGES.awaitingQuotation,
  PENDING_CUSTOMER_CONFIRMATION: ORDER_STAGES.awaitingQuotation,

  ACCEPTED: ORDER_STAGES.awaitingPayment,

  APPROVED: ORDER_STAGES.processing,
  PROCESSING: ORDER_STAGES.processing,
  PAID: ORDER_STAGES.processing,

  COMPLETED: ORDER_STAGES.completed,

  REJECTED: ORDER_STAGES.cancelled,
  CANCELLED: ORDER_STAGES.cancelled,
  CANCELED: ORDER_STAGES.cancelled,
};

const PURCHASE_STATUS_LABELS = {
  PENDING_REVIEW: "Chờ duyệt",
  QUOTED: "Đã báo giá",
  QUOTATION_SENT: "Đã gửi báo giá",
  PENDING_CUSTOMER_CONFIRMATION: "Chờ bạn xác nhận",
  ACCEPTED: "Đã chấp nhận báo giá",
  APPROVED: "Đã duyệt",
  PROCESSING: "Đang xử lý",
  PAID: "Đã thanh toán",
  COMPLETED: "Hoàn tất",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã huỷ",
  CANCELED: "Đã huỷ",
};

const upper = (value) => String(value ?? "").trim().toUpperCase();

/* ---------------------------------------------------------- *
 * Việc khách cần làm                                          *
 * ---------------------------------------------------------- */

/** `tone`: action = khách phải bấm; wait = VCL đang làm; done = đơn đã xong/dừng. */
const todo = (tone, text, tab) => ({ tone, text, tab });

/**
 * @param {string} status mã trạng thái đơn ký gửi (đã chuẩn hoá)
 * @param {number|null} dueAmount số tiền đợt cuối Sale đã phát hành (nếu có)
 */
const resolveConsignmentTodo = (status, dueAmount) => {
  /* Có khoản đã phát hành thì đó là việc gấp nhất, bất kể trạng thái đơn đang là gì. */
  if (Number(dueAmount) > 0) {
    return todo("action", `Cần thanh toán ${formatVnd(dueAmount)}`, ORDER_TABS.payment);
  }

  switch (status) {
    case "QUOTATION_SENT":
      return todo("action", "Cần xác nhận báo giá", ORDER_TABS.quotation);
    case "NEED_MORE_INFO":
      return todo("action", "Cần bổ sung thông tin hàng hoá", ORDER_TABS.parcels);
    case "WAITING_DEPOSIT":
      return todo("action", "Cần đặt cọc", ORDER_TABS.payment);
    case "WAITING_PAYMENT":
      return todo("action", "Cần thanh toán đợt cuối", ORDER_TABS.payment);
    case "ARRIVED_DESTINATION":
    case "STORED_AT_VN":
      return todo("action", "Chọn cách nhận hàng cho từng kiện", ORDER_TABS.parcels);
    case "DELIVERED":
      return todo("action", "Xác nhận đã nhận hàng", ORDER_TABS.journey);

    case "PENDING_REVIEW":
      return todo("wait", "VCL đang kiểm đơn và lên báo giá", ORDER_TABS.quotation);
    case "DEPOSIT_PAID":
    case "APPROVED":
      return todo("wait", "Chờ hàng của bạn tới kho nguồn", ORDER_TABS.journey);
    case "CHECKED_IN":
      return todo("wait", "Hàng đã vào kho nguồn, chờ lên chuyến", ORDER_TABS.journey);
    case "IN_TRANSIT":
    case "ARRIVED_VN":
      return todo("wait", "Hàng đang trên đường về", ORDER_TABS.journey);
    case "PAID":
      return todo("wait", "Đã tất toán, chờ xếp lịch giao", ORDER_TABS.journey);
    case "DELIVERING":
      return todo("wait", "Đang giao tới bạn", ORDER_TABS.journey);

    case "COMPLETED":
      return todo("done", "Đơn đã hoàn tất", ORDER_TABS.payment);
    case "CANCELLED":
    case "REJECTED":
    case "QUOTATION_REJECTED":
      return todo("done", "Đơn đã dừng", ORDER_TABS.quotation);

    default:
      return todo("wait", "VCL đang xử lý đơn", ORDER_TABS.journey);
  }
};

const resolvePurchaseTodo = (status) => {
  switch (status) {
    case "QUOTED":
    case "QUOTATION_SENT":
      return todo("action", "Cần xác nhận báo giá", "quotation");
    case "PENDING_CUSTOMER_CONFIRMATION":
      return todo("action", "Cần xác nhận thông tin đơn", "detail");
    case "ACCEPTED":
      return todo("action", "Cần thanh toán", "quotation");
    case "PENDING_REVIEW":
      return todo("wait", "VCL đang kiểm và lên báo giá", "detail");
    case "COMPLETED":
      return todo("done", "Đơn đã hoàn tất", "detail");
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return todo("done", "Đơn đã dừng", "detail");
    default:
      return todo("wait", "VCL đang mua và gom hàng", "detail");
  }
};

/* ---------------------------------------------------------- *
 * Quy đổi bản ghi API → dòng danh sách                        *
 * ---------------------------------------------------------- */

/**
 * @param {object} item bản ghi của GET /api/orders/consignments
 * @param {Map<string, object>} dueByOrderId đơn chờ tất toán (GET /api/orders/awaiting-settlement)
 */
export const toConsignmentRow = (item, dueByOrderId) => {
  const status = normalizeOrderStatus(item?.status) || "";
  const orderId = item?.orderId || item?.id || "";
  const due = dueByOrderId.get(String(orderId))?.pendingPaymentAmount ?? null;

  return {
    key: `consignment:${orderId}`,
    kind: ORDER_KINDS.consignment,
    id: orderId,
    code: item?.consignmentCode || item?.orderCode || "Chưa được cấp mã",
    statusCode: status,
    statusLabel: getOrderStatusLabel(status),
    stage: CONSIGNMENT_STAGE_BY_STATUS[status] || ORDER_STAGES.processing,
    route: item?.route || "",
    receiverName: item?.receiverName || "",
    createdAt: item?.createdAtUtc || item?.createdAt || null,
    createdAtTs: apiToTimestamp(item?.createdAtUtc || item?.createdAt) || 0,
    todo: resolveConsignmentTodo(status, due),
  };
};

/** @param {object} item bản ghi yêu cầu mua hộ (hiện còn đọc dữ liệu mẫu) */
export const toPurchaseRow = (item) => {
  const status = upper(item?.status);
  const requestId = item?.purchaseRequestId || item?.id || "";

  return {
    key: `purchase:${requestId}`,
    kind: ORDER_KINDS.purchase,
    id: requestId,
    code: item?.purchaseCode || "Chưa được cấp mã",
    statusCode: status,
    statusLabel: PURCHASE_STATUS_LABELS[status] || status || "—",
    stage: PURCHASE_STAGE_BY_STATUS[status] || ORDER_STAGES.processing,
    route: item?.route || "",
    receiverName: item?.receiverName || "",
    createdAt: item?.createdAt || null,
    createdAtTs: apiToTimestamp(item?.createdAt) || 0,
    itemCount: Number(item?.itemCount) || (item?.items?.length ?? 0),
    todo: resolvePurchaseTodo(status),
  };
};

/* ---------------------------------------------------------- *
 * Lọc                                                          *
 * ---------------------------------------------------------- */

export const filterRows = (rows, { stage, search }) => {
  const keyword = String(search ?? "").trim().toUpperCase();

  return rows.filter((row) => {
    if (stage !== ORDER_STAGES.all && row.stage !== stage) return false;
    if (keyword && !String(row.code).toUpperCase().includes(keyword)) return false;

    return true;
  });
};

/** Đơn mới lên đầu; đơn thiếu ngày tạo xuống cuối thay vì nhảy lung tung. */
export const sortByNewest = (rows) =>
  [...rows].sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0));

/** Đếm số dòng theo từng chip giai đoạn, để chip hiện số ngay cạnh nhãn. */
export const countByStage = (rows) => {
  const counts = { [ORDER_STAGES.all]: rows.length };

  for (const row of rows) {
    counts[row.stage] = (counts[row.stage] || 0) + 1;
  }

  return counts;
};
