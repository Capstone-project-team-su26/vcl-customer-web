/* =========================================================
   purchaseOrderApi.js — ĐƠN MUA NHÀ CUNG CẤP, phía KHÁCH. API thật.

   Khách chỉ có hai việc với đơn mua:
     1. Khi giá mua thực vượt giá đã báo quá ngưỡng (mặc định 5%), đơn mua dừng ở
        AWAITING_CUSTOMER — khách xem phần chênh rồi ĐỒNG Ý hoặc TỪ CHỐI.
        Đồng ý xong đơn sang AWAITING_CUSTOMER_PAYMENT, khách trả phần chênh.
     2. Theo dõi tiến độ nhà cung cấp: ORDERED → SUPPLIER_CONFIRMED → SUPPLIER_SHIPPED.

   Mọi thao tác còn lại (lập đơn, duyệt ngân sách, đặt NCC) là việc của nhân viên —
   backend tự chặn theo vai trò, FE không bày nút.

   TIỀN HOÀN (chỉ đọc): GET /api/purchase-requests/{id}/refunds → tổng đã trả / đã hoàn /
   đang chờ hoàn + từng khoản, từng dòng, công thức. Backend mới — hiện CHỈ có trên env test;
   production trả 404 → hàm trả null và màn hình ẩn khối.
   ========================================================= */
import httpClient from "@shared/api/httpClient";
import { labelOf, metaOf } from "@shared/utils/statusLabel";

const trimText = (value) => String(value ?? "").trim();

const getSignal = (options = {}) => options?.signal || undefined;

const unwrapData = (body) =>
  body && typeof body === "object" && "data" in body ? body.data : body;

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Trạng thái đơn mua, kèm câu giải thích cho khách (không dùng từ nội bộ). */
export const SUPPLIER_ORDER_STEPS = Object.freeze({
  AWAITING_CUSTOMER: {
    label: "Chờ bạn duyệt phần chênh giá",
    tone: "warning",
    hint: "Giá mua thực cao hơn giá đã báo. Bạn xem phần chênh rồi quyết định.",
  },
  AWAITING_CUSTOMER_PAYMENT: {
    label: "Chờ bạn trả phần chênh",
    tone: "warning",
    hint: "Bạn đã đồng ý phần chênh; trả xong thì VCL đặt hàng ngay.",
  },
  PENDING_APPROVAL: {
    label: "VCL đang duyệt ngân sách",
    tone: "processing",
    hint: "Đơn mua đang chờ duyệt nội bộ trước khi đặt nhà cung cấp.",
  },
  APPROVED: {
    label: "Sắp đặt hàng",
    tone: "processing",
    hint: "Ngân sách đã duyệt, nhân viên đang đặt hàng nhà cung cấp.",
  },
  ORDERED: {
    label: "Đã đặt nhà cung cấp",
    tone: "processing",
    hint: "Đang chờ người bán xác nhận đơn.",
  },
  SUPPLIER_CONFIRMED: {
    label: "Người bán đã xác nhận",
    tone: "processing",
    hint: "Người bán đang chuẩn bị hàng.",
  },
  SUPPLIER_SHIPPED: {
    label: "Người bán đã gửi hàng",
    tone: "success",
    hint: "Hàng đang trên đường về kho VCL ở nước ngoài.",
  },
  REJECTED: { label: "Đơn mua bị từ chối", tone: "default", hint: "Nhân viên sẽ lập lại đơn khác." },
  CANCELLED: { label: "Đã huỷ", tone: "default", hint: "" },
  DRAFT: { label: "Đang soạn", tone: "default", hint: "Nhân viên đang chuẩn bị đơn mua." },
});

export const getSupplierOrderStep = (status) =>
  metaOf(SUPPLIER_ORDER_STEPS, status, { tone: "default", hint: "" }, { generic: "Đang xử lý" });

/** Các mốc hiện trên dòng thời gian, đúng thứ tự thật. */
export const SUPPLIER_TIMELINE = Object.freeze([
  { status: "ORDERED", label: "Đặt hàng", at: "orderedAt" },
  { status: "SUPPLIER_CONFIRMED", label: "Người bán xác nhận", at: "supplierConfirmedAt" },
  { status: "SUPPLIER_SHIPPED", label: "Người bán gửi hàng", at: "supplierShippedAt" },
]);

const normalizeOrder = (order = {}) => ({
  ...order,
  totalAmount: toNumber(order.totalAmount),
  quotedGoodsAmount: toNumber(order.quotedGoodsAmount),
  priceDifferenceAmount: toNumber(order.priceDifferenceAmount),
  priceToleranceRate: toNumber(order.priceToleranceRate),
  /*
   * Tiền công ty trả LẠI khách: giá mua thực thấp hơn giá đã báo, hoặc đơn bị huỷ
   * sau khi đã đặt NCC. Khách đã trả trước 100% nên đây là tiền của khách.
   */
  refundAmount: toNumber(order.refundAmount),
  cancelFeeAmount: toNumber(order.cancelFeeAmount),
  /* Backend mới: MỌI khoản hoàn của đơn + tổng; backend cũ không có → rỗng / 0. */
  refunds: toArray(order.refunds).map((refund) => normalizeRefund(refund)),
  totalRefundAmount: toNumber(order.totalRefundAmount),
  items: toArray(order.items).map((item) => ({
    ...item,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    quotedUnitPrice: item.quotedUnitPrice == null ? null : toNumber(item.quotedUnitPrice),
    lineTotal: toNumber(item.lineTotal),
  })),
  step: getSupplierOrderStep(order.status),
});

/*
 * Câu giải thích cho KHÁCH vì sao có khoản hoàn — đọc đúng mã của backend
 * (PurchasePaymentTypes / PurchaseRefundReasons / PurchaseRefundStatuses), viết bằng lời của
 * khách, không dùng từ nội bộ ("NCC", "PO"...). Mã lạ KHÔNG in mã thô: ra câu chung trung tính
 * ("Hoàn tiền"…) — không đoán lý do cụ thể để khỏi giải thích sai một khoản tiền.
 */

/** Loại KHOẢN hoàn (`refundType`). */
export const REFUND_REASON_TEXT = Object.freeze({
  REFUND_PRICE_DIFF: "Giá mua thực tế thấp hơn giá đã báo",
  REFUND_CANCEL: "Đơn mua bị huỷ",
  REFUND_UNFULFILLED: "Người bán hết hàng hoặc giao thiếu",
});

/** Lý do từng DÒNG hoàn (`reasonCode`). */
export const REFUND_LINE_REASON_TEXT = Object.freeze({
  PRICE_DIFF: "Chênh giá: người bán bán rẻ hơn giá đã báo",
  UNFULFILLED: "Người bán hết hàng / không mua đủ số lượng bạn đặt",
  SUPPLIER_SHORT: "Người bán giao thiếu",
  CANCEL_CUSTOMER: "Bạn huỷ đơn sau khi VCL đã đặt hàng",
  CANCEL_SUPPLIER: "Người bán huỷ đơn / hết hàng sau khi VCL đã đặt",
  PRICE_DIFF_RETURN: "Trả lại phần chênh giá bạn đã trả (đơn huỷ trước khi đặt hàng)",
});

/** Trạng thái khoản hoàn — không dùng "đã thanh toán" để khỏi hiểu ngược là bạn trả tiền. */
export const REFUND_STATUS_TEXT = Object.freeze({
  PENDING: { label: "Đang chờ chuyển", tone: "processing" },
  REFUNDED: { label: "Đã chuyển cho bạn", tone: "success" },
  CANCELLED: { label: "Không còn hiệu lực", tone: "default" },
});

const upperCode = (value) => trimText(value).toUpperCase();

export const getRefundReasonText = (refundType) =>
  labelOf(REFUND_REASON_TEXT, upperCode(refundType), { generic: "Hoàn tiền", empty: "Hoàn tiền" });

export const getRefundLineReasonText = (reasonCode) =>
  labelOf(REFUND_LINE_REASON_TEXT, upperCode(reasonCode), { generic: "Lý do khác" });

export const getRefundStatusText = (status) =>
  metaOf(REFUND_STATUS_TEXT, upperCode(status), { tone: "default" });

/* Chỉ ép kiểu số — KHÔNG cộng trừ gì: mọi con số và câu công thức là thứ backend đã chốt. */
const normalizeRefundLine = (line = {}) => ({
  ...line,
  reasonCode: upperCode(line.reasonCode),
  reasonText: getRefundLineReasonText(line.reasonCode),
  quantity: toNumber(line.quantity),
  unitPrice: toNumber(line.unitPrice),
  goodsAmount: toNumber(line.goodsAmount),
  priceDifferenceAmount: toNumber(line.priceDifferenceAmount),
  serviceFeeAmount: toNumber(line.serviceFeeAmount),
  vatAmount: toNumber(line.vatAmount),
  importTaxAdjustment: toNumber(line.importTaxAdjustment),
  importTaxInRefund: Boolean(line.importTaxInRefund),
  cancelFeeAmount: toNumber(line.cancelFeeAmount),
  amount: toNumber(line.amount),
  formula: trimText(line.formula),
});

const normalizeRefund = (refund = {}) => ({
  ...refund,
  refundType: upperCode(refund.refundType),
  reasonText: getRefundReasonText(refund.refundType),
  status: upperCode(refund.status),
  statusText: getRefundStatusText(refund.status),
  amount: toNumber(refund.amount),
  goodsAmount: toNumber(refund.goodsAmount),
  priceDifferenceAmount: toNumber(refund.priceDifferenceAmount),
  serviceFeeAmount: toNumber(refund.serviceFeeAmount),
  vatAmount: toNumber(refund.vatAmount),
  importTaxAdjustment: toNumber(refund.importTaxAdjustment),
  cancelFeeAmount: toNumber(refund.cancelFeeAmount),
  isLegacy: Boolean(refund.isLegacy),
  lines: toArray(refund.lines).map(normalizeRefundLine),
});

/**
 * Tiền hoàn của một yêu cầu mua hộ (khách chỉ xem được yêu cầu của mình — backend chặn 403).
 *
 * @returns {Promise<null | { totalCollected, totalRefunded, totalPendingRefund, refundableRemaining, refunds: any[] }>}
 *   null khi máy chủ chưa có API này (404) — màn hình ẩn khối thay vì báo lỗi.
 */
export const getPurchaseRefundsApi = async (purchaseRequestId, options = {}) => {
  const id = trimText(purchaseRequestId);

  if (!id) return null;

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}/refunds`,
      { signal: getSignal(options) }
    );
    const data = unwrapData(response.data) || {};

    return {
      ...data,
      totalCollected: toNumber(data.totalCollected),
      totalRefunded: toNumber(data.totalRefunded),
      totalPendingRefund: toNumber(data.totalPendingRefund),
      refundableRemaining: toNumber(data.refundableRemaining),
      refunds: toArray(data.refunds).map(normalizeRefund),
    };
  } catch (error) {
    if (error?.code === "ERR_CANCELED") throw error;

    /* Bản backend chưa có sổ hoàn (production hiện tại) — coi như không có gì để hiện. */
    if (error?.response?.status === 404) return null;

    throw error;
  }
};

/** Đơn mua của một yêu cầu — backend chỉ trả đơn thuộc khách đang đăng nhập. */
export const getSupplierOrdersApi = async (purchaseRequestId, options = {}) => {
  const id = trimText(purchaseRequestId);

  if (!id) return [];

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}/purchase-orders`,
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data)).map(normalizeOrder);
  } catch (error) {
    if (error?.code === "ERR_CANCELED") throw error;

    /* Bản backend chưa có luồng mua hộ chuẩn trả 404 — coi như chưa có đơn mua nào. */
    if (error?.response?.status === 404) return [];

    throw error;
  }
};

/**
 * Khách quyết định với phần chênh giá.
 *
 * @param {string} purchaseOrderId
 * @param {{ accept: boolean, reason?: string, paymentMethod?: string, returnUrl?: string,
 *   cancelUrl?: string }} payload
 *   returnUrl/cancelUrl: nơi trang thanh toán phần chênh trả khách về (xem
 *   buildPaymentReturnUrls); backend gắn thêm `orderCode` + `status`.
 */
export const decideSupplierOrderApi = async (purchaseOrderId, payload = {}) => {
  const id = trimText(purchaseOrderId);

  if (!id) {
    throw new Error("Thiếu mã đơn mua.");
  }

  const accept = Boolean(payload?.accept);

  if (!accept && !trimText(payload?.reason)) {
    throw new Error("Vui lòng nhập lý do từ chối phần chênh giá.");
  }

  const body = {
    accept,
    ...(trimText(payload?.reason) ? { reason: trimText(payload.reason) } : {}),
    /* Đồng ý thì backend tạo luôn lần thu phần chênh — mặc định quét QR SePay. */
    ...(accept ? { paymentMethod: trimText(payload?.paymentMethod).toUpperCase() || "SEPAY" } : {}),
    ...(trimText(payload?.returnUrl) ? { returnUrl: trimText(payload.returnUrl) } : {}),
    ...(trimText(payload?.cancelUrl) ? { cancelUrl: trimText(payload.cancelUrl) } : {}),
  };

  const response = await httpClient.post(
    `/api/purchase-orders/${encodeURIComponent(id)}/customer-decision`,
    body
  );

  return unwrapData(response.data);
};

export default { getSupplierOrdersApi, decideSupplierOrderApi, getPurchaseRefundsApi };
