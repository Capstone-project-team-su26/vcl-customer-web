/* =========================================================
   purchasePayments.js — khoản thu của một yêu cầu mua hộ, đọc từ
   GET /api/purchase-requests/{id}/payments (PurchasePaymentService.GetPaymentHistoryAsync).

   Chuỗi trạng thái THẬT theo backend (VCL_BLL):
     1. Sale lập báo giá  → báo giá PENDING_CUSTOMER_CONFIRMATION, yêu cầu QUOTED.
     2. Khách confirm-and-pay (PurchasePaymentService.ConfirmQuotationAndPayAsync):
          - tạo MỘT khoản PREPAYMENT trạng thái PENDING (có orderCode + checkoutUrl),
          - báo giá → ACCEPTED, yêu cầu → WAITING_PAYMENT.
        confirm-and-pay chỉ chạy khi báo giá còn PENDING_CUSTOMER_CONFIRMATION → gọi lại
        lần hai bị 400. Khoản đang chờ phải MỞ LẠI link cũ, không tạo khoản mới.
     3. Tiền vào (webhook SePay / payOS / Admin duyệt tay, PurchasePaymentEffects.ApplyPaidAsync):
          khoản → PAID, yêu cầu → PAID ("Đã trả trước, chờ đặt mua") rồi PURCHASING …
     4. Giá mua thực vượt giá báo: đơn mua NCC AWAITING_CUSTOMER → khách đồng ý →
        khoản PRICE_DIFFERENCE PENDING (đơn mua AWAITING_CUSTOMER_PAYMENT). Trạng thái
        YÊU CẦU không đổi (vẫn PAID / PURCHASING …).

   Không có "yêu cầu ACCEPTED" ở backend (ACCEPTED là trạng thái BÁO GIÁ); FE vẫn nhận
   mã đó cho dữ liệu cũ, coi như WAITING_PAYMENT.

   Khoản trả trước bị huỷ (Admin từ chối đối soát → CANCELLED) thì backend KHÔNG có API
   nào cho khách tạo lại (báo giá đã ACCEPTED, confirm-and-pay từ chối) — màn hình chỉ
   được báo khách liên hệ CSKH, không tự gọi confirm-and-pay.

   Hàm thuần, không gọi API, không đụng window.
   ========================================================= */

export const PURCHASE_PAYMENT_TYPES = Object.freeze({
  prepayment: "PREPAYMENT",
  priceDifference: "PRICE_DIFFERENCE",
  /* Đời cũ */
  legacyDeposit: "DEPOSIT",
  legacyFull: "FULL_PAYMENT",
  legacyFinal: "FINAL_PAYMENT",
});

/** Khoản đầu của cả yêu cầu (mới hoặc cũ) — PurchasePaymentTypes.IsFirstInstalment. */
const FIRST_INSTALMENT_TYPES = new Set([
  PURCHASE_PAYMENT_TYPES.prepayment,
  PURCHASE_PAYMENT_TYPES.legacyDeposit,
  PURCHASE_PAYMENT_TYPES.legacyFull,
]);

/** Khách bấm trả tiếp được (còn link). */
const PAYABLE_STATUSES = new Set(["PENDING", "AWAITING_PAYMENT"]);

/** Tiền đã báo chuyển, chờ VCL đối soát — không cho trả lần hai. */
const VERIFYING_STATUSES = new Set(["PENDING_RECONCILIATION", "PROCESSING"]);

/** Khoản không còn hiệu lực — backend không có API tạo lại cho khách. */
const DEAD_STATUSES = new Set(["CANCELLED", "CANCELED", "FAILED", "EXPIRED"]);

/** Yêu cầu đã qua bước trả trước (PurchasePaymentEffects.BeyondPrepaid + PAID). */
const PREPAID_REQUEST_STATUSES = new Set([
  "PAID",
  "DEPOSIT_PAID",
  "PURCHASING",
  "PURCHASED",
  "SELLER_SHIPPED",
  "ARRIVED_ORIGIN_WAREHOUSE",
  "WAITING_STORED",
  "STORED",
  "WAITING_FINAL_PAYMENT",
  "COMPLETED",
]);

const STOPPED_REQUEST_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "REJECTED",
  "QUOTATION_REJECTED",
]);

const upper = (value) => String(value ?? "").trim().toUpperCase();
const text = (value) => String(value ?? "").trim();

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toTimestamp = (value) => {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : 0;
};

/** Một dòng PurchasePaymentHistoryItemDto → dạng FE dùng. Loại trống = FULL_PAYMENT (đời cũ). */
export const normalizePurchasePayment = (payment = {}) => ({
  paymentId: text(payment.paymentId ?? payment.id),
  orderCode: text(payment.orderCode),
  paymentType: upper(payment.paymentType) || PURCHASE_PAYMENT_TYPES.legacyFull,
  purchaseOrderId: text(payment.purchaseOrderId) || null,
  amount: toNumber(payment.amount),
  paymentMethod: upper(payment.paymentMethod),
  status: upper(payment.status),
  checkoutUrl: text(payment.checkoutUrl),
  transactionCode: text(payment.transactionCode),
  createdAt: payment.createdAt || null,
  paidAt: payment.paidAt || null,
});

/**
 * PurchasePaymentHistoryResponseDto → object FE dùng (giữ nguyên các trường tổng,
 * payments luôn là mảng đã chuẩn hoá). Nhận cả mảng trần cho backend đời cũ.
 */
export const normalizePurchasePaymentHistory = (data) => {
  const body = Array.isArray(data) ? { payments: data } : data && typeof data === "object" ? data : {};
  const payments = Array.isArray(body.payments) ? body.payments.map(normalizePurchasePayment) : [];

  return {
    ...body,
    requestStatus: upper(body.requestStatus),
    totalBillAmount: toNumber(body.totalBillAmount),
    totalPaid: toNumber(body.totalPaid),
    outstanding: toNumber(body.outstanding),
    depositAmount: toNumber(body.depositAmount),
    payments,
  };
};

export const isPurchaseRefund = (payment) => upper(payment?.paymentType).startsWith("REFUND");

export const isFirstInstalment = (payment) =>
  FIRST_INSTALMENT_TYPES.has(upper(payment?.paymentType) || PURCHASE_PAYMENT_TYPES.legacyFull);

export const isPayableStatus = (status) => PAYABLE_STATUSES.has(upper(status));
export const isVerifyingStatus = (status) => VERIFYING_STATUSES.has(upper(status));

/** Khoản thu (không phải hoàn) còn chờ khách: trả tiếp được hoặc đang chờ đối soát. Mới nhất trước. */
export const findOpenPurchasePayments = (payments) =>
  (Array.isArray(payments) ? payments : [])
    .filter(
      (payment) =>
        !isPurchaseRefund(payment) &&
        (isPayableStatus(payment?.status) || isVerifyingStatus(payment?.status)),
    )
    .sort((a, b) => toTimestamp(b?.createdAt) - toTimestamp(a?.createdAt));

/** Khoản PHẢI TRẢ của một loại: dùng cho nhãn ở "Cần thanh toán". */
export const getPurchasePaymentLabel = (paymentType) =>
  ({
    [PURCHASE_PAYMENT_TYPES.prepayment]: "Trả trước đơn mua hộ",
    [PURCHASE_PAYMENT_TYPES.priceDifference]: "Phần chênh giá mua",
    [PURCHASE_PAYMENT_TYPES.legacyDeposit]: "Tiền cọc đơn mua hộ",
    [PURCHASE_PAYMENT_TYPES.legacyFull]: "Thanh toán đơn mua hộ",
    [PURCHASE_PAYMENT_TYPES.legacyFinal]: "Đợt cuối đơn mua hộ",
  })[upper(paymentType)] || "Khoản chờ thanh toán";

/**
 * Khối trả trước trên màn báo giá hiển thị gì.
 *
 * @param {{ requestStatus?: string, quotationStatus?: string, hasQuotation?: boolean,
 *   payments?: object[]|null, paymentsError?: boolean }} input
 *   payments: null = chưa tải xong (hoặc không cần tải).
 * @returns {{ view: "quote"|"loading"|"awaitingPayment"|"verifying"|"reissueNeeded"|"paid"|"unknown"|"none",
 *   payment: object|null, amount: number|null }}
 *   - quote          : báo giá chờ khách xác nhận → thanh "Chọn cách xác nhận" (confirm-and-pay)
 *   - loading        : đã chấp nhận, đang tải khoản thu
 *   - awaitingPayment: có khoản trả trước PENDING → "Tiếp tục thanh toán" mở lại đúng link đó
 *   - verifying      : khách đã báo chuyển, VCL đang đối soát
 *   - reissueNeeded  : đã chấp nhận nhưng khoản trả trước đã huỷ / không còn → liên hệ CSKH
 *   - paid           : đã trả trước
 *   - unknown        : đã chấp nhận nhưng không tải được khoản thu → cho tải lại
 *   - none           : không có gì để trả (chưa báo giá, đã huỷ…)
 */
export const resolvePrepayState = ({
  requestStatus,
  quotationStatus,
  hasQuotation = false,
  payments = null,
  paymentsError = false,
} = {}) => {
  const request = upper(requestStatus);
  const quote = upper(quotationStatus);
  const result = (view, payment = null) => ({
    view,
    payment,
    amount: payment ? toNumber(payment.amount) : null,
  });

  if (STOPPED_REQUEST_STATUSES.has(request) || quote === "REJECTED") return result("none");

  const firstInstalments = (Array.isArray(payments) ? payments : [])
    .filter((payment) => !isPurchaseRefund(payment) && isFirstInstalment(payment))
    .sort((a, b) => toTimestamp(b?.createdAt) - toTimestamp(a?.createdAt));

  const paid = firstInstalments.find((payment) => upper(payment.status) === "PAID");
  if (paid) return result("paid", paid);

  /* Báo giá còn chờ khách: confirm-and-pay hợp lệ, giữ thanh xác nhận như cũ. */
  const quotePending =
    hasQuotation &&
    (quote === "PENDING_CUSTOMER_CONFIRMATION" || (request === "QUOTED" && quote !== "ACCEPTED"));
  if (quotePending) return result("quote");

  const accepted =
    quote === "ACCEPTED" || request === "WAITING_PAYMENT" || request === "ACCEPTED";

  if (PREPAID_REQUEST_STATUSES.has(request)) {
    /* Đã qua bước trả trước mà không thấy dòng PAID (Admin ghi tay đời cũ, hoặc chưa tải). */
    return result("paid");
  }

  if (!accepted) return result("none");

  if (payments === null) return result(paymentsError ? "unknown" : "loading");

  const payable = firstInstalments.find((payment) => isPayableStatus(payment.status));
  if (payable) return result("awaitingPayment", payable);

  const verifying = firstInstalments.find((payment) => isVerifyingStatus(payment.status));
  if (verifying) return result("verifying", verifying);

  const dead = firstInstalments.find((payment) => DEAD_STATUSES.has(upper(payment.status)));
  return result("reissueNeeded", dead || null);
};

/**
 * Dòng "Cần thanh toán" của mua hộ.
 *
 * Nguồn: dòng PAYMENT_DUE kind=PURCHASE của GET /api/customers/me/dashboard (backend gom
 * MỌI khoản thu mua hộ chưa trả: trả trước + chênh giá, CustomerDashboardService.
 * BuildPaymentActionAsync) → mỗi yêu cầu đọc thêm GET /purchase-requests/{id}/payments để
 * có link + mã giao dịch của đúng khoản đang chờ. Không đọc được lịch sử thì vẫn hiện dòng
 * theo số của bảng việc (không có nút trả, chỉ có lối vào đơn).
 *
 * @param {Array<{ id: string, code: string, status: string, statusText: string, amount: number,
 *   updatedAt?: string }>} dueItems
 * @param {Map<string, { payments: object[] }|null>} historyByRequestId
 */
export const buildPurchaseDueRows = (dueItems, historyByRequestId = new Map()) => {
  const items = Array.isArray(dueItems) ? dueItems : [];
  const rows = [];
  const seen = new Set();

  for (const item of items) {
    const requestId = text(item?.id);
    if (!requestId || seen.has(requestId)) continue;
    seen.add(requestId);

    const history = historyByRequestId.get(requestId);

    if (history && Array.isArray(history.payments)) {
      for (const payment of findOpenPurchasePayments(history.payments)) {
        rows.push({
          key: `${requestId}:${payment.paymentId || payment.orderCode}`,
          requestId,
          code: text(item.code) || text(history.purchaseCode),
          paymentType: payment.paymentType,
          label: getPurchasePaymentLabel(payment.paymentType),
          amount: toNumber(payment.amount),
          verifying: isVerifyingStatus(payment.status),
          createdAt: payment.createdAt,
          payment,
        });
      }
      continue;
    }

    items
      .filter((other) => text(other?.id) === requestId)
      .forEach((other, index) => {
        rows.push({
          key: `${requestId}:dashboard:${index}`,
          requestId,
          code: text(other.code),
          paymentType: "",
          label: text(other.statusText) || "Khoản chờ thanh toán",
          amount: toNumber(other.amount),
          verifying: isVerifyingStatus(other.status),
          createdAt: other.updatedAt || null,
          payment: null,
        });
      });
  }

  return rows;
};
