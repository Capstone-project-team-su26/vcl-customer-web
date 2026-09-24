/* =========================================================
   consignmentPaymentReturn — khoản cọc ký gửi đang chờ payOS báo về.

   Luồng (spec đợt B):
   1. QuotationDetail gọi confirm-and-pay (PAYOS) → lưu khoản đang chờ vào
      sessionStorage rồi chuyển khách sang checkoutUrl.
   2. payOS trả khách về /payment/lich-su?code=&id=&cancel=&status=&orderCode=
      (URL cũ /history/consignment vẫn sống, chuyển hướng sang đó và GIỮ NGUYÊN query).
   3. Tab "Lịch sử giao dịch" mở sẵn phần ký gửi; ConsignmentHistoryList đọc query +
      sessionStorage, poll GET /api/payments/status/{orderCode} mỗi 4 giây, tối đa 2 phút.

   Hàm thuần, không đụng window/storage ở top-level (tools/verify-api.mjs nạp qua SSR).
   ========================================================= */

export const PENDING_CONSIGNMENT_PAYMENT_KEY = "vcl_pending_consignment_payment";

export const PAYMENT_POLL_INTERVAL_MS = 4_000;
export const PAYMENT_POLL_TIMEOUT_MS = 120_000;

/* Khoản chờ quá lâu (khách bỏ dở) thì bỏ, không poll lại mỗi lần mở danh sách. */
export const PENDING_PAYMENT_MAX_AGE_MS = 60 * 60 * 1000;

/* Query payOS gắn vào returnUrl/cancelUrl. */
export const PAYOS_RETURN_QUERY_KEYS = ["code", "id", "cancel", "status", "orderCode"];

const getSessionStorage = () => {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
};

const normalizeOrderCode = (value) => {
  const text = String(value ?? "").trim();

  return /^\d+$/.test(text) && Number(text) > 0 ? text : "";
};

export const savePendingConsignmentPayment = ({
  orderCode,
  orderId,
  consignmentCode,
  amount,
  createdAt = new Date().toISOString(),
} = {}) => {
  const code = normalizeOrderCode(orderCode);

  if (!code) {
    return false;
  }

  try {
    getSessionStorage()?.setItem(
      PENDING_CONSIGNMENT_PAYMENT_KEY,
      JSON.stringify({
        orderCode: code,
        orderId: orderId ?? null,
        consignmentCode: consignmentCode ?? null,
        amount: amount ?? null,
        createdAt,
      }),
    );

    return true;
  } catch {
    return false;
  }
};

export const clearPendingConsignmentPayment = () => {
  try {
    getSessionStorage()?.removeItem(PENDING_CONSIGNMENT_PAYMENT_KEY);
  } catch {
    /* Không xoá được thì thôi. */
  }
};

/** Đọc khoản đang chờ; hỏng hoặc quá hạn thì xoá và trả null. */
export const readPendingConsignmentPayment = (now = Date.now()) => {
  let parsed;

  try {
    const raw = getSessionStorage()?.getItem(PENDING_CONSIGNMENT_PAYMENT_KEY);

    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    clearPendingConsignmentPayment();
    return null;
  }

  const orderCode = normalizeOrderCode(parsed.orderCode);
  const createdAt = Date.parse(parsed.createdAt);

  if (
    !orderCode ||
    (Number.isFinite(createdAt) && now - createdAt > PENDING_PAYMENT_MAX_AGE_MS)
  ) {
    clearPendingConsignmentPayment();
    return null;
  }

  return { ...parsed, orderCode };
};

/**
 * Đọc query payOS trả về. `cancelled` khi cancel=true hoặc status CANCELLED/CANCELED.
 *
 * @param {string} search location.search
 */
export const parsePayOsReturn = (search = "") => {
  const params = new URLSearchParams(search);
  const status = String(params.get("status") || "").trim().toUpperCase();
  const cancel = String(params.get("cancel") || "").trim().toLowerCase();

  return {
    orderCode: normalizeOrderCode(params.get("orderCode")),
    status,
    cancelled: cancel === "true" || status === "CANCELLED" || status === "CANCELED",
    hasPayOsParams: PAYOS_RETURN_QUERY_KEYS.some((key) => params.has(key)),
  };
};

/** Bỏ các khoá payOS khỏi query, giữ khoá khác. Trả chuỗi "?..." hoặc "". */
export const stripPayOsReturnParams = (search = "") => {
  const params = new URLSearchParams(search);

  PAYOS_RETURN_QUERY_KEYS.forEach((key) => params.delete(key));

  const text = params.toString();

  return text ? `?${text}` : "";
};

const PAID_STATUSES = new Set(["PAID", "SUCCESS"]);
const FAILED_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "EXPIRED"]);

/** Đổi status backend sang kết quả poll: paid | failed | pending. */
export const classifyPaymentStatus = (status) => {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (PAID_STATUSES.has(normalized)) return "paid";
  if (FAILED_STATUSES.has(normalized)) return "failed";

  return "pending";
};

/**
 * Poll trạng thái thanh toán cho tới khi PAID / thất bại / 404 / hết giờ.
 *
 * onDone nhận { outcome: "paid" | "failed" | "not_found" | "timeout", orderCode, payment }.
 * Lỗi khác 404 (mất mạng, 5xx) thì thử lại ở lượt sau.
 *
 * @returns {() => void} hàm dừng poll (gọi khi unmount).
 */
export const pollConsignmentPaymentStatus = ({
  orderCode,
  fetchStatus,
  onDone,
  intervalMs = PAYMENT_POLL_INTERVAL_MS,
  timeoutMs = PAYMENT_POLL_TIMEOUT_MS,
  now = () => Date.now(),
  setTimer = (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimer = (id) => globalThis.clearTimeout(id),
}) => {
  const startedAt = now();
  let stopped = false;
  let timerId = null;
  let controller = null;
  let lastPayment = null;

  const finish = (outcome, payment = lastPayment) => {
    if (stopped) return;
    stopped = true;
    onDone?.({ outcome, orderCode, payment });
  };

  const tick = async () => {
    timerId = null;
    if (stopped) return;

    controller = typeof AbortController === "function" ? new AbortController() : null;

    try {
      const payment = await fetchStatus(orderCode, { signal: controller?.signal });

      if (stopped) return;

      lastPayment = payment;

      const result = classifyPaymentStatus(payment?.status);

      if (result !== "pending") {
        finish(result, payment);
        return;
      }
    } catch (error) {
      if (stopped) return;

      if (error?.response?.status === 404) {
        finish("not_found", null);
        return;
      }
    }

    if (now() - startedAt + intervalMs > timeoutMs) {
      finish("timeout");
      return;
    }

    timerId = setTimer(tick, intervalMs);
  };

  tick();

  return () => {
    stopped = true;
    if (timerId !== null) clearTimer(timerId);
    controller?.abort?.();
  };
};
