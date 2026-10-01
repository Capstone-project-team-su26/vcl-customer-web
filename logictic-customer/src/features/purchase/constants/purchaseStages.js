/**
 * TIẾN ĐỘ ĐƠN MUA HỘ phía khách — 9 bậc khách hiểu được, dựng từ trạng thái THẬT của backend.
 *
 * Nguồn trạng thái (VCL_BLL):
 *   - Yêu cầu mua hộ: PurchaseRequestService.StatusDisplayNames + PurchaseFlow (PurchasePaymentEffects,
 *     PurchaseRequestProgress). Luồng chuẩn hiện nay: PENDING_REVIEW → QUOTED → WAITING_PAYMENT → PAID
 *     → PURCHASING → COMPLETED (hoặc REJECTED / QUOTATION_REJECTED / CANCELLED). Các mã PURCHASED,
 *     SELLER_SHIPPED, ARRIVED_ORIGIN_WAREHOUSE, WAITING_STORED, STORED, WAITING_FINAL_PAYMENT, DEPOSIT_PAID
 *     là của luồng đời cũ — vẫn nhận để đơn cũ không vỡ thanh tiến độ.
 *   - Đơn mua nhà cung cấp: PurchaseOrderStatuses (DRAFT … ORDERED → SUPPLIER_CONFIRMED → SUPPLIER_SHIPPED).
 *   - Đơn kho PUR-…-n (sinh khi đặt NCC): chặng hành trình `currentStage` (trackingStages.js) và
 *     trạng thái đơn kho (orderStatus.js).
 *
 * Luồng chuẩn giữ yêu cầu ở PURCHASING suốt từ lúc đặt NCC tới khi mọi đơn kho đóng, nên các bậc
 * 5–8 KHÔNG đọc được từ trạng thái yêu cầu — phải suy từ đơn mua NCC và đơn kho. Yêu cầu tách nhiều
 * đơn mua thì lấy phần CHẬM NHẤT (giống backend tính `currentStage` theo kiện chậm nhất).
 *
 * File thuần: không gọi API, không đụng window — tools/verify-api.mjs nạp thẳng để kiểm bảng ánh xạ.
 */

import {
  getTrackingStageLabel,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";
import {
  PURCHASE_PAYMENT_TYPES,
  resolvePrepayState,
} from "@features/purchase/utils/purchasePayments";
import { labelOf } from "@shared/utils/statusLabel";

const upper = (value) => String(value ?? "").trim().toUpperCase();

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatVnd = (value) => `${Math.round(toNumber(value)).toLocaleString("vi-VN")}đ`;

/* =========================================================
   CÁC BẬC
   ========================================================= */

export const PURCHASE_STEP_KEYS = Object.freeze({
  request: "REQUEST",
  quote: "QUOTE",
  prepay: "PREPAY",
  order: "ORDER",
  supplier: "SUPPLIER",
  transit: "TRANSIT",
  vnWarehouse: "VN_WAREHOUSE",
  settle: "SETTLE",
  done: "DONE",
});

export const PURCHASE_STEPS = Object.freeze([
  { key: PURCHASE_STEP_KEYS.request, title: "Gửi yêu cầu" },
  { key: PURCHASE_STEP_KEYS.quote, title: "Sale báo giá" },
  { key: PURCHASE_STEP_KEYS.prepay, title: "Thanh toán trước" },
  { key: PURCHASE_STEP_KEYS.order, title: "VCL đặt hàng NCC" },
  { key: PURCHASE_STEP_KEYS.supplier, title: "NCC giao về kho quốc tế" },
  { key: PURCHASE_STEP_KEYS.transit, title: "Nhập kho & vận chuyển quốc tế" },
  { key: PURCHASE_STEP_KEYS.vnWarehouse, title: "Về kho Việt Nam" },
  { key: PURCHASE_STEP_KEYS.settle, title: "Tất toán & giao hàng" },
  { key: PURCHASE_STEP_KEYS.done, title: "Hoàn tất" },
]);

const STEP = Object.freeze(
  Object.fromEntries(PURCHASE_STEPS.map((step, index) => [step.key, index])),
);

/* =========================================================
   TRẠNG THÁI YÊU CẦU → NHÃN + BẬC
   ========================================================= */

/** Nhãn khách đọc — lời của khách, không dùng mã / từ nội bộ. Mã lạ: xem getPurchaseStatusLabel. */
export const PURCHASE_REQUEST_STATUS_LABELS = Object.freeze({
  NEW: "Mới gửi yêu cầu",
  PENDING_REVIEW: "Chờ VCL xem yêu cầu",
  IN_REVIEW: "VCL đang xem yêu cầu",
  NEED_MORE_INFO: "Cần bạn bổ sung thông tin",
  REJECTED: "Yêu cầu bị từ chối",
  QUOTED: "Đã có báo giá, chờ bạn xác nhận",
  QUOTATION_REJECTED: "Bạn đã từ chối báo giá",
  WAITING_PAYMENT: "Chờ bạn thanh toán trước",
  ACCEPTED: "Chờ bạn thanh toán trước",
  PAID: "Đã trả trước, chờ VCL đặt hàng",
  DEPOSIT_PAID: "Đã đặt cọc, chờ VCL đặt hàng",
  PURCHASING: "VCL đang mua hàng",
  PURCHASED: "VCL đã đặt hàng với người bán",
  SELLER_SHIPPED: "Người bán đã gửi hàng",
  ARRIVED_ORIGIN_WAREHOUSE: "Hàng đã về kho quốc tế",
  WAITING_STORED: "Kho quốc tế đang nhập hàng",
  STORED: "Đã nhập kho quốc tế",
  WAITING_FINAL_PAYMENT: "Chờ bạn thanh toán đợt cuối",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
  CANCELED: "Đã huỷ",
});

/** Bậc của từng trạng thái yêu cầu khi CHƯA xét đơn mua / đơn kho. */
export const PURCHASE_REQUEST_STATUS_STEP = Object.freeze({
  NEW: STEP.REQUEST,
  NEED_MORE_INFO: STEP.REQUEST,
  PENDING_REVIEW: STEP.QUOTE,
  IN_REVIEW: STEP.QUOTE,
  REJECTED: STEP.QUOTE,
  QUOTATION_REJECTED: STEP.QUOTE,
  QUOTED: STEP.PREPAY,
  WAITING_PAYMENT: STEP.PREPAY,
  ACCEPTED: STEP.PREPAY,
  PAID: STEP.ORDER,
  DEPOSIT_PAID: STEP.ORDER,
  PURCHASING: STEP.ORDER,
  PURCHASED: STEP.SUPPLIER,
  SELLER_SHIPPED: STEP.SUPPLIER,
  ARRIVED_ORIGIN_WAREHOUSE: STEP.TRANSIT,
  WAITING_STORED: STEP.TRANSIT,
  STORED: STEP.TRANSIT,
  WAITING_FINAL_PAYMENT: STEP.SETTLE,
  COMPLETED: STEP.DONE,
});

const CANCELLED_STATUSES = new Set(["CANCELLED", "CANCELED"]);

/** Yêu cầu đang ở giai đoạn mua / vận chuyển — bậc thật suy từ đơn mua NCC và đơn kho. */
const FULFILLMENT_STATUSES = new Set([
  "PAID",
  "DEPOSIT_PAID",
  "PURCHASING",
  "PURCHASED",
  "SELLER_SHIPPED",
  "ARRIVED_ORIGIN_WAREHOUSE",
  "WAITING_STORED",
  "STORED",
  "WAITING_FINAL_PAYMENT",
]);

/**
 * Nhãn trạng thái yêu cầu cho khách: bảng trên → chữ server (`statusDisplayName`) → câu chung.
 * KHÔNG BAO GIỜ trả mã thô kiểu "PURCHASING".
 */
export const getPurchaseStatusLabel = (status, serverText) =>
  /* Chữ server chỉ dùng khi là chữ người đọc (server có lúc trả lại chính mã / chữ tiếng Anh). */
  labelOf(PURCHASE_REQUEST_STATUS_LABELS, upper(status), {
    fallback: serverText,
    generic: "Đang xử lý",
  });

/* =========================================================
   ĐƠN MUA NCC + ĐƠN KHO → BẬC
   ========================================================= */

/** Đơn mua còn hiệu lực (Admin từ chối thì nhân viên lập đơn khác; huỷ thì thôi). */
const INACTIVE_SUPPLIER_STATUSES = new Set(["CANCELLED", "REJECTED"]);

/** Đơn mua đã đặt NCC — từ đây hàng hoá của đơn đã thành đơn kho. */
const PLACED_SUPPLIER_STATUSES = new Set(["ORDERED", "SUPPLIER_CONFIRMED", "SUPPLIER_SHIPPED"]);

/** Đơn mua đang chờ KHÁCH (duyệt phần chênh / trả phần chênh). */
const CUSTOMER_SUPPLIER_STATUSES = new Set(["AWAITING_CUSTOMER", "AWAITING_CUSTOMER_PAYMENT"]);

/** Chặng hành trình (currentStage) → bậc mua hộ. Mã lạ → không suy. */
export const TRACKING_STAGE_TO_PURCHASE_STEP = Object.freeze({
  NOT_RECEIVED: STEP.SUPPLIER,
  AT_ORIGIN_WAREHOUSE: STEP.TRANSIT,
  PREPARING_EXPORT: STEP.TRANSIT,
  HANDED_OVER: STEP.TRANSIT,
  DEPARTED: STEP.TRANSIT,
  IN_TRANSIT: STEP.TRANSIT,
  DELAYED: STEP.TRANSIT,
  ON_HOLD: STEP.TRANSIT,
  CUSTOMS_CLEARED: STEP.TRANSIT,
  ARRIVED_VN: STEP.TRANSIT,
  ARRIVED_DESTINATION: STEP.VN_WAREHOUSE,
  RECEIVED_AT_VN: STEP.VN_WAREHOUSE,
  QUARANTINED: STEP.VN_WAREHOUSE,
  STORED_AT_VN: STEP.SETTLE,
  OUT_FOR_DELIVERY: STEP.SETTLE,
  DELIVERY_FAILED: STEP.SETTLE,
  DELIVERED: STEP.DONE,
  DISPOSED: STEP.DONE,
});

/** Trạng thái ĐƠN KHO (orderStatus.js + mã backend còn dùng) → bậc mua hộ. */
export const WAREHOUSE_ORDER_STATUS_TO_PURCHASE_STEP = Object.freeze({
  APPROVED: STEP.SUPPLIER,
  DEPOSIT_PAID: STEP.SUPPLIER,
  CHECKED_IN: STEP.TRANSIT,
  WAREHOUSE_RECEIVED: STEP.TRANSIT,
  IN_TRANSIT: STEP.TRANSIT,
  ARRIVED_VN: STEP.TRANSIT,
  ARRIVED_DESTINATION: STEP.VN_WAREHOUSE,
  WAITING_PAYMENT: STEP.SETTLE,
  PAID: STEP.SETTLE,
  STORED_AT_VN: STEP.SETTLE,
  DELIVERING: STEP.SETTLE,
  DELIVERED: STEP.DONE,
  CUSTOMER_CONFIRMED: STEP.DONE,
  COMPLETED: STEP.DONE,
});

/** Đơn kho đang chờ khách tất toán. */
const SETTLEMENT_ORDER_STATUSES = new Set(["WAITING_PAYMENT", "WAITING_FINAL_PAYMENT"]);

/**
 * Một "phần" của yêu cầu = một đơn mua NCC còn hiệu lực (kèm đơn kho của nó nếu đã đặt).
 *
 * @param {object} supplierOrder PurchaseOrderResponseDto (đã chuẩn hoá bởi purchaseOrderApi)
 * @param {Map<string, object>} warehouseById id đơn kho → { orderId, orderCode, status, tracking, dueAmount }
 */
const describeUnit = (supplierOrder, warehouseById) => {
  const poStatus = upper(supplierOrder?.status);
  const warehouseId = String(supplierOrder?.warehouseOrderId || "");
  const warehouse = warehouseId ? warehouseById.get(warehouseId) || null : null;
  const orderStatus = upper(warehouse?.status || supplierOrder?.warehouseOrderStatus);
  const stage = upper(warehouse?.tracking?.currentStage);

  let step = STEP.ORDER;
  let warning = false;

  if (CUSTOMER_SUPPLIER_STATUSES.has(poStatus)) warning = true;

  if (PLACED_SUPPLIER_STATUSES.has(poStatus) || warehouseId || orderStatus) {
    step = STEP.SUPPLIER;

    const byStage = TRACKING_STAGE_TO_PURCHASE_STEP[stage];
    const byOrder = WAREHOUSE_ORDER_STATUS_TO_PURCHASE_STEP[orderStatus];
    step = Math.max(step, byStage ?? step, byOrder ?? step);

    if (stage && isWarningStage(stage)) warning = true;
  }

  return {
    supplierOrder,
    warehouse,
    poStatus,
    orderStatus,
    stage,
    step,
    warning,
    dueAmount: toNumber(warehouse?.dueAmount),
    needsSettlement:
      toNumber(warehouse?.dueAmount) > 0 || SETTLEMENT_ORDER_STATUSES.has(orderStatus),
  };
};

/* =========================================================
   HUỶ: dừng ở bậc nào
   ========================================================= */

/**
 * Yêu cầu đã huỷ dừng ở bậc nào: lấy trạng thái NGAY TRƯỚC khi huỷ trong nhật ký
 * (GET /purchase-requests/{id}/history, mới nhất trước); thiếu nhật ký thì suy từ dữ liệu còn lại.
 */
const resolveCancelledStep = ({ history, units, hasPrepaid, hasQuotation }) => {
  const entries = Array.isArray(history) ? history : [];
  const cancelEntry = entries.find((entry) => CANCELLED_STATUSES.has(upper(entry?.toStatus)));
  const from = upper(cancelEntry?.fromStatus);

  if (from && PURCHASE_REQUEST_STATUS_STEP[from] !== undefined) {
    const base = PURCHASE_REQUEST_STATUS_STEP[from];
    const deepest = units.reduce((max, unit) => Math.max(max, unit.step), base);
    return FULFILLMENT_STATUSES.has(from) ? deepest : base;
  }

  if (units.length) return units.reduce((max, unit) => Math.max(max, unit.step), STEP.ORDER);
  if (hasPrepaid) return STEP.ORDER;
  if (hasQuotation) return STEP.PREPAY;
  return STEP.QUOTE;
};

/* =========================================================
   TỔNG HỢP
   ========================================================= */

/**
 * @typedef {{ kind: "quotation"|"supplierOrders"|"settlement"|"tracking"|"chat",
 *   label: string, orderId?: string }} PurchaseAction
 *
 * @typedef {{
 *   steps: typeof PURCHASE_STEPS, stepIndex: number,
 *   tone: "current"|"warning"|"stopped"|"done",
 *   statusCode: string, statusLabel: string, requestStatusLabel: string, headline: string, hint: string,
 *   action: PurchaseAction|null, split: boolean, unitCount: number, placedCount: number,
 * }} PurchaseProgress
 */

/**
 * Tiến độ của MỘT yêu cầu mua hộ.
 *
 * @param {{
 *   status?: string, statusDisplayName?: string, reason?: string,
 *   quotation?: object|null,          PurchaseQuotationResponseDto (có trong chi tiết yêu cầu)
 *   paymentHistory?: object|null,     GET /purchase-requests/{id}/payments đã chuẩn hoá; null = chưa có
 *   paymentsError?: boolean,
 *   supplierOrders?: object[],        GET /purchase-requests/{id}/purchase-orders
 *   warehouseOrders?: object[],       [{ orderId, orderCode, status, tracking, dueAmount }]
 *   history?: object[],               GET /purchase-requests/{id}/history (mới nhất trước)
 * }} input
 * @returns {PurchaseProgress}
 */
export const resolvePurchaseProgress = ({
  status,
  statusDisplayName,
  reason,
  quotation = null,
  paymentHistory = null,
  paymentsError = false,
  supplierOrders = [],
  warehouseOrders = [],
  history = [],
} = {}) => {
  const code = upper(status);
  const statusLabel = getPurchaseStatusLabel(code, statusDisplayName);
  const reasonText = String(reason ?? "").trim();

  const warehouseById = new Map(
    (Array.isArray(warehouseOrders) ? warehouseOrders : [])
      .filter((item) => item?.orderId)
      .map((item) => [String(item.orderId), item]),
  );

  const units = (Array.isArray(supplierOrders) ? supplierOrders : [])
    .filter((order) => !INACTIVE_SUPPLIER_STATUSES.has(upper(order?.status)))
    .map((order) => describeUnit(order, warehouseById));

  const placedCount = units.filter((unit) => unit.step >= STEP.SUPPLIER).length;

  const payments = Array.isArray(paymentHistory?.payments) ? paymentHistory.payments : null;
  const hasPrepaid = Boolean(
    payments?.some(
      (payment) =>
        upper(payment?.status) === "PAID" &&
        [PURCHASE_PAYMENT_TYPES.prepayment, PURCHASE_PAYMENT_TYPES.legacyDeposit, PURCHASE_PAYMENT_TYPES.legacyFull].includes(
          upper(payment?.paymentType),
        ),
    ),
  );
  const pendingRefund = toNumber(paymentHistory?.totalPendingRefund);
  const refunded = toNumber(paymentHistory?.totalRefunded);

  const result = (stepIndex, tone, headline, hint = "", action = null, extra = {}) => ({
    steps: PURCHASE_STEPS,
    stepIndex,
    tone,
    statusCode: code,
    /* Nhãn trạng thái của YÊU CẦU (đúng mã backend) — trang "Thông tin đơn" dùng. */
    requestStatusLabel: statusLabel,
    /* Nhãn thẻ trên đầu trang — giai đoạn mua / vận chuyển thì theo tiến độ thật (extra ghi đè). */
    statusLabel,
    headline,
    hint,
    action,
    split: false,
    unitCount: units.length,
    placedCount,
    ...extra,
  });

  const refundHint = () => {
    if (pendingRefund > 0) return `VCL đang hoàn ${formatVnd(pendingRefund)} cho bạn — xem mục Tiền & thanh toán.`;
    if (refunded > 0) return `VCL đã hoàn ${formatVnd(refunded)} cho bạn.`;
    return "";
  };

  /* ---------- Dừng hẳn ---------- */

  if (CANCELLED_STATUSES.has(code)) {
    const stepIndex = resolveCancelledStep({
      history,
      units,
      hasPrepaid,
      hasQuotation: Boolean(quotation),
    });

    return result(
      stepIndex,
      "stopped",
      "Đơn mua hộ đã huỷ",
      [reasonText ? `Lý do: ${reasonText}.` : "", refundHint() || (hasPrepaid ? "Khoản hoàn (nếu có) sẽ hiện ở mục Tiền & thanh toán." : "")]
        .filter(Boolean)
        .join(" "),
      { kind: "chat", label: "Liên hệ CSKH" },
    );
  }

  if (code === "REJECTED") {
    return result(
      STEP.QUOTE,
      "stopped",
      "VCL đã từ chối yêu cầu mua hộ này",
      reasonText ? `Lý do: ${reasonText}. Bạn có thể tạo yêu cầu mới hoặc hỏi CSKH.` : "Bạn có thể tạo yêu cầu mới hoặc hỏi CSKH để biết thêm.",
      { kind: "chat", label: "Liên hệ CSKH" },
    );
  }

  if (code === "QUOTATION_REJECTED") {
    return result(
      STEP.QUOTE,
      "stopped",
      "Bạn đã từ chối báo giá",
      "VCL không đặt hàng với báo giá này. Cần báo giá lại thì nhắn CSKH.",
      { kind: "chat", label: "Liên hệ CSKH" },
    );
  }

  /* ---------- Trước khi trả trước ---------- */

  if (code === "NEED_MORE_INFO") {
    return result(
      STEP.REQUEST,
      "warning",
      "VCL cần bạn bổ sung thông tin",
      reasonText ? `Cần bổ sung: ${reasonText}` : "Nhắn CSKH để bổ sung thông tin còn thiếu, VCL sẽ báo giá ngay sau đó.",
      { kind: "chat", label: "Nhắn CSKH bổ sung" },
    );
  }

  if (code === "NEW" || code === "PENDING_REVIEW" || code === "IN_REVIEW") {
    return result(
      PURCHASE_REQUEST_STATUS_STEP[code],
      "current",
      code === "IN_REVIEW" ? "Sale đang xem yêu cầu và lập báo giá" : "VCL đã nhận yêu cầu, đang chuẩn bị báo giá",
      "Bạn chưa cần làm gì. Có báo giá VCL sẽ thông báo cho bạn.",
    );
  }

  if (code === "QUOTED" || code === "WAITING_PAYMENT" || code === "ACCEPTED") {
    const prepay = resolvePrepayState({
      requestStatus: code,
      quotationStatus: quotation?.status,
      hasQuotation: Boolean(quotation),
      payments,
      paymentsError,
    });
    const amount = toNumber(quotation?.prepayAmount || quotation?.depositAmount) || prepay.amount || 0;
    const amountText = amount > 0 ? ` ${formatVnd(amount)}` : "";

    switch (prepay.view) {
      case "quote":
        return result(
          STEP.PREPAY,
          "current",
          "Báo giá đã sẵn sàng, chờ bạn xác nhận",
          `Bạn cần xem báo giá và thanh toán trước${amountText} để VCL đặt hàng.`,
          { kind: "quotation", label: "Xem báo giá & thanh toán" },
        );
      case "verifying":
        return result(
          STEP.PREPAY,
          "current",
          "VCL đang đối soát khoản bạn đã chuyển",
          "Bạn chưa cần làm gì. Đối soát xong VCL sẽ đặt hàng ngay.",
        );
      case "reissueNeeded":
        return result(
          STEP.PREPAY,
          "warning",
          "Khoản thanh toán trước không còn hiệu lực",
          "Liên hệ CSKH để VCL mở lại khoản thanh toán cho bạn.",
          { kind: "chat", label: "Liên hệ CSKH" },
        );
      case "paid":
        return result(STEP.ORDER, "current", "Đã nhận tiền trả trước, VCL đang đặt hàng", "Bạn chưa cần làm gì.");
      default:
        return result(
          STEP.PREPAY,
          "current",
          "Chờ bạn thanh toán trước",
          `Bạn cần thanh toán trước${amountText} để VCL đặt hàng với người bán.`,
          { kind: "quotation", label: "Tiếp tục thanh toán" },
        );
    }
  }

  if (code === "COMPLETED") {
    return result(STEP.DONE, "done", "Đơn mua hộ đã hoàn tất", refundHint() || "Cảm ơn bạn đã dùng dịch vụ mua hộ của VCL.");
  }

  /* ---------- Đang mua / đang vận chuyển ---------- */

  const baseStep = PURCHASE_REQUEST_STATUS_STEP[code];

  if (!FULFILLMENT_STATUSES.has(code) && baseStep === undefined) {
    /* Mã lạ backend thêm sau: không đoán bậc, chỉ nói thật là đang xử lý. */
    return result(0, "current", statusLabel, "VCL sẽ thông báo khi đơn có bước mới.");
  }

  const awaitingCustomer = units.find((unit) => CUSTOMER_SUPPLIER_STATUSES.has(unit.poStatus));
  const settlementUnit = units.find((unit) => unit.needsSettlement && unit.warehouse?.orderId);

  if (!units.length) {
    const step = Math.max(baseStep ?? STEP.ORDER, STEP.ORDER);
    const headline =
      step === STEP.ORDER ? "VCL đang đặt hàng với người bán" : statusLabel;

    return result(
      step,
      "current",
      headline,
      step === STEP.SETTLE
        ? "Bạn cần thanh toán đợt cuối để VCL giao hàng."
        : "Bạn chưa cần làm gì. Đặt hàng xong bạn sẽ thấy đơn mua và mã theo dõi ở mục Tiến độ.",
    );
  }

  /* Phần chậm nhất quyết định bậc; bậc cũ (đời cũ) không được kéo lùi. */
  const slowest = units.reduce((min, unit) => Math.min(min, unit.step), STEP.DONE);
  const fastest = units.reduce((max, unit) => Math.max(max, unit.step), STEP.ORDER);
  const stepIndex = Math.max(slowest, Math.min(baseStep ?? STEP.ORDER, STEP.SETTLE));
  const split = units.length > 1 && slowest !== fastest;
  const warningUnit = units.find((unit) => unit.warning);

  /* PURCHASING đứng yên suốt lúc hàng đi — thẻ trạng thái nói giai đoạn thật để khách khỏi hiểu lầm. */
  const STAGE_TAGS = {
    [STEP.ORDER]: "VCL đang đặt hàng",
    [STEP.SUPPLIER]: "Người bán đang giao hàng",
    [STEP.TRANSIT]: "Đang vận chuyển quốc tế",
    [STEP.VN_WAREHOUSE]: "Hàng đã về kho Việt Nam",
    [STEP.SETTLE]: "Đang giao hàng",
    [STEP.DONE]: "Đã giao hàng",
  };
  const extra = { split, statusLabel: STAGE_TAGS[stepIndex] || statusLabel };

  if (awaitingCustomer) {
    const payment = awaitingCustomer.poStatus === "AWAITING_CUSTOMER_PAYMENT";
    const diff = toNumber(awaitingCustomer.supplierOrder?.priceDifferenceAmount);

    return result(
      stepIndex,
      "warning",
      payment ? "Chờ bạn trả phần chênh giá" : "Giá mua thực cao hơn giá đã báo",
      payment
        ? `Bạn cần trả phần chênh${diff > 0 ? ` ${formatVnd(diff)}` : ""} để VCL đặt hàng.`
        : `Bạn cần xem phần chênh${diff > 0 ? ` ${formatVnd(diff)}` : ""} và chọn đồng ý hoặc từ chối.`,
      { kind: "supplierOrders", label: payment ? "Trả phần chênh giá" : "Xem phần chênh giá" },
      { ...extra, statusLabel: payment ? "Chờ bạn trả phần chênh" : "Chờ bạn duyệt phần chênh" },
    );
  }

  if (settlementUnit) {
    const due = settlementUnit.dueAmount;
    const orderCode = String(settlementUnit.warehouse.orderCode || "").trim();
    return result(
      /* Tách chuyến: phần khác còn trên đường thì thanh tiến độ vẫn theo phần chậm nhất. */
      split ? stepIndex : Math.max(stepIndex, STEP.SETTLE),
      "current",
      split ? "Một phần hàng đã về kho Việt Nam, chờ bạn tất toán" : "Hàng đã về kho Việt Nam, chờ bạn tất toán",
      `Bạn cần tất toán${due > 0 ? ` ${formatVnd(due)}` : ""}${orderCode ? ` cho đơn ${orderCode}` : ""} để VCL giao hàng.`,
      { kind: "settlement", label: "Thanh toán tất toán", orderId: settlementUnit.warehouse.orderId },
      { ...extra, statusLabel: "Chờ bạn tất toán" },
    );
  }

  const tracked = units.find((unit) => unit.step === slowest && unit.warehouse?.orderId);
  const trackAction = tracked
    ? { kind: "tracking", label: "Xem hành trình", orderId: tracked.warehouse.orderId }
    : null;
  const splitNote = split ? " Đơn tách nhiều đơn mua — thanh tiến độ theo phần chậm nhất." : "";

  if (warningUnit && warningUnit.stage) {
    return result(
      stepIndex,
      "warning",
      getTrackingStageLabel(warningUnit.stage, warningUnit.warehouse?.tracking?.currentStageText),
      `VCL đang xử lý và sẽ báo bạn khi hàng đi tiếp.${splitNote}`,
      warningUnit.warehouse?.orderId
        ? { kind: "tracking", label: "Xem hành trình", orderId: warningUnit.warehouse.orderId }
        : null,
      { ...extra, statusLabel: getTrackingStageLabel(warningUnit.stage, warningUnit.warehouse?.tracking?.currentStageText) },
    );
  }

  const HEADLINES = {
    [STEP.ORDER]: "VCL đang đặt hàng với người bán",
    [STEP.SUPPLIER]: "Người bán đang chuẩn bị và gửi hàng về kho quốc tế",
    [STEP.TRANSIT]: "Hàng đang ở kho quốc tế / trên đường về Việt Nam",
    [STEP.VN_WAREHOUSE]: "Hàng đã về kho Việt Nam, đang kiểm và cân đo",
    [STEP.SETTLE]: "Đang giao hàng tới bạn",
    [STEP.DONE]: "Đã giao hàng, VCL đang chốt đơn",
  };

  const HINTS = {
    [STEP.ORDER]: "Bạn chưa cần làm gì. Đặt hàng xong bạn sẽ thấy mã đơn mua và tiến độ người bán.",
    [STEP.SUPPLIER]: "Bạn chưa cần làm gì. Hàng tới kho quốc tế sẽ được nhập kho và xếp chuyến.",
    [STEP.TRANSIT]: "Bạn chưa cần làm gì. Hàng về kho Việt Nam VCL sẽ báo số tiền tất toán.",
    [STEP.VN_WAREHOUSE]: "Cân đo xong VCL sẽ báo số tiền tất toán để giao hàng.",
    [STEP.SETTLE]: "Theo dõi mã vận đơn giao hàng ở trang hành trình.",
    [STEP.DONE]: "Bạn chưa cần làm gì.",
  };

  /* Tách nhiều đơn mua, một phần đã đặt: nói rõ đã đặt mấy đơn thay vì "đặt hàng xong bạn sẽ thấy…". */
  const hint =
    stepIndex === STEP.ORDER && placedCount > 0
      ? `Bạn chưa cần làm gì. VCL đã đặt ${placedCount}/${units.length} đơn mua với người bán, phần còn lại đang được duyệt và đặt hàng.`
      : `${HINTS[stepIndex] || ""}${splitNote}`.trim();

  return result(
    stepIndex,
    "current",
    HEADLINES[stepIndex] || statusLabel,
    hint,
    stepIndex >= STEP.TRANSIT ? trackAction : null,
    extra,
  );
};
