/* =========================================================
   pendingPaymentReturn — khách quay về từ trang thanh toán (SePay / payOS).

   Hợp đồng với backend:
   - Mọi API tạo thanh toán nhận `returnUrl` / `cancelUrl` FE gửi (URL tuyệt đối, origin
     trong whitelist). FE luôn gửi `{origin}/payment/lich-su?loai=mua-ho|ky-gui`
     (buildPaymentReturnUrls) — "Thanh toán → Lịch sử giao dịch", nơi PaymentReturnBanner
     xử lý mọi trường hợp. Không hợp lệ / không gửi thì backend dùng URL cũ
     /history/buy-on-behalf (khoản của yêu cầu mua hộ) hoặc /history/consignment (khoản
     của đơn kho); router chuyển hai URL đó về Lịch sử giao dịch, GIỮ NGUYÊN query.
   - Backend GẮN vào URL trả về `?orderCode=<mã>&status=success` (trả xong) hoặc
     `&status=cancelled` (bấm Huỷ). payOS còn nối query riêng (code,id,cancel,status,
     orderCode) SAU query của ta → `URLSearchParams.get()` lấy cái đầu = của ta; status có
     thể là success|cancelled (của ta) hoặc PAID|CANCELLED (payOS), `cancel=true` cũng là huỷ.
   - Trang QR SePay của khoản do nhân viên phát hành (tất toán, phí lưu kho, phí giao lại…)
     nhận `?returnUrl=&cancelUrl=` trên chính link: FE gắn thêm lúc mở (withPaymentReturnUrls).

   Mã giao dịch và kết quả đọc từ URL (ƯU TIÊN). Nhưng URL không nói đơn nào / khoản gì,
   nên TRƯỚC khi mở trang thanh toán FE vẫn ghi lại khoản đang trả (orderCode, đơn nào,
   khoản gì, bao nhiêu) — bản ghi chỉ dùng khi orderCode khớp (hoặc URL không có orderCode)
   để PaymentReturnBanner:
     - status=success → hỏi GET /api/payments/status/{orderCode}:
         PAID            → báo đã nhận tiền, nút "Xem đơn" về đúng chi tiết đơn;
         PENDING         → "đang chờ ngân hàng xác nhận", tự hỏi lại (webhook SePay trễ);
         huỷ / thất bại  → quay lại đúng chi tiết đơn kèm thông báo;
     - status=cancelled → về đúng chỗ trả tiền của đơn; không có bản ghi khớp thì báo huỷ
       tại chỗ kèm mã giao dịch.

   Lưu ở localStorage (không phải sessionStorage): SePay của tất toán / phí lưu kho /
   phí giao lại / chênh giá mở ở TAB MỚI (noopener) — tab đó không thấy sessionStorage
   của tab cũ. Bản ghi hết hạn sau 1 giờ.

   Hàm thuần, không đụng window/storage ở top-level (tools/verify-api.mjs nạp qua SSR).
   ========================================================= */

import {
  parsePayOsReturn,
  readPendingConsignmentPayment,
} from "@features/payment/utils/consignmentPaymentReturn";
import {
  ORDER_KINDS,
  ORDER_TABS,
  PAYMENT_TABS,
  orderDetailPath,
  paymentTabPath,
  purchaseRequestDetailPath,
  purchaseRequestQuotationPath,
} from "@features/orders/constants/orderPaths";

export const PENDING_PAYMENT_KEY = "vcl_pending_payment";

/** `?giao-dich={orderCode}` trên tab Thanh toán của đơn: tô + cuộn tới giao dịch đó. */
export const PAYMENT_TRANSACTION_QUERY_KEY = "giao-dich";

/**
 * `?loai=mua-ho|ky-gui` trên /payment/lich-su: mở sẵn đúng phần Mua hộ / Ký gửi.
 * returnUrl/cancelUrl FE gửi có sẵn khoá này; hai URL trả về cũ của backend chuyển hướng
 * về đây cũng được gắn thêm.
 */
export const HISTORY_KIND_QUERY_KEY = "loai";

/** Query backend gắn vào returnUrl/cancelUrl: mã giao dịch + kết quả. */
export const PAYMENT_RETURN_ORDER_CODE_KEY = "orderCode";
export const PAYMENT_RETURN_STATUS_KEY = "status";

/** Giá trị `status` backend gắn (payOS có thể gắn thêm PAID / CANCELLED phía sau). */
export const PAYMENT_RETURN_STATUSES = Object.freeze({
  success: "success",
  cancelled: "cancelled",
});

const SUCCESS_RETURN_STATUSES = new Set(["SUCCESS", "PAID"]);
const CANCELLED_RETURN_STATUSES = new Set(["CANCELLED", "CANCELED"]);

/* Khoản chờ quá lâu (khách bỏ dở) thì bỏ, không hỏi lại mỗi lần mở Lịch sử giao dịch. */
export const PENDING_PAYMENT_TTL_MS = 60 * 60 * 1000;

/** Khoản thuộc về đâu — quyết định trang chi tiết để quay lại. */
export const PAYMENT_SUBJECTS = Object.freeze({
  /* Yêu cầu mua hộ: /orders/mua-ho/{requestId} */
  purchaseRequest: "PURCHASE_REQUEST",
  /* Đơn kho (ký gửi hoặc đơn kho của mua hộ): /orders/{orderId}/{tab} */
  order: "ORDER",
});

/** Loại khoản — chỉ để viết thông báo cho đúng và mở đúng tab khi phải trả lại. */
export const PAYMENT_PURPOSES = Object.freeze({
  purchasePrepay: "PURCHASE_PREPAY",
  purchasePriceDifference: "PURCHASE_PRICE_DIFFERENCE",
  deposit: "DEPOSIT",
  finalPayment: "FINAL_PAYMENT",
  storageFee: "STORAGE_FEE",
  redeliveryFee: "REDELIVERY_FEE",
  other: "OTHER",
});

const PURPOSE_LABELS = {
  [PAYMENT_PURPOSES.purchasePrepay]: "khoản trả trước",
  [PAYMENT_PURPOSES.purchasePriceDifference]: "phần chênh giá",
  [PAYMENT_PURPOSES.deposit]: "tiền cọc",
  [PAYMENT_PURPOSES.finalPayment]: "khoản tất toán",
  [PAYMENT_PURPOSES.storageFee]: "phí lưu kho",
  [PAYMENT_PURPOSES.redeliveryFee]: "phí giao lại",
  [PAYMENT_PURPOSES.other]: "khoản thanh toán",
};

/** installmentType của khoản thu đơn kho → loại khoản. */
export const purposeFromInstallmentType = (installmentType) => {
  const type = String(installmentType ?? "").trim().toUpperCase();

  return (
    {
      DEPOSIT: PAYMENT_PURPOSES.deposit,
      FINAL_PAYMENT: PAYMENT_PURPOSES.finalPayment,
      STORAGE_FEE: PAYMENT_PURPOSES.storageFee,
      REDELIVERY_FEE: PAYMENT_PURPOSES.redeliveryFee,
    }[type] || PAYMENT_PURPOSES.other
  );
};

export const getPaymentPurposeLabel = (purpose) =>
  PURPOSE_LABELS[purpose] || PURPOSE_LABELS[PAYMENT_PURPOSES.other];

const getLocalStorage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const normalizeOrderCode = (value) => {
  const text = String(value ?? "").trim();

  return /^\d+$/.test(text) && Number(text) > 0 ? text : "";
};

/**
 * Link SePay có mã thanh toán ngay trên đường dẫn: /api/payments/sepay/checkout/{orderCode}.
 * Link payOS thì không (payOS gắn orderCode vào query lúc trả khách về).
 */
export const extractOrderCodeFromCheckoutUrl = (url) => {
  const match = /\/api\/payments\/sepay\/checkout\/(\d+)/i.exec(String(url ?? ""));

  return match ? normalizeOrderCode(match[1]) : "";
};

/**
 * Ghi khoản sắp trả. Thiếu đơn đích thì không ghi (không biết quay về đâu).
 *
 * @param {{ subject: string, targetId: string, purpose?: string, orderCode?: string|number,
 *   checkoutUrl?: string, code?: string, amount?: number }} input
 * @returns {boolean}
 */
export const savePendingPayment = ({
  subject,
  targetId,
  purpose = PAYMENT_PURPOSES.other,
  orderCode,
  checkoutUrl,
  code,
  amount,
  createdAt = new Date().toISOString(),
} = {}) => {
  const id = String(targetId ?? "").trim();

  if (!id || !Object.values(PAYMENT_SUBJECTS).includes(subject)) {
    return false;
  }

  try {
    getLocalStorage()?.setItem(
      PENDING_PAYMENT_KEY,
      JSON.stringify({
        subject,
        targetId: id,
        purpose,
        /* Mã trên link SePay là chắc chắn nhất (đúng khoản sắp mở); payOS thì dùng mã
           nơi gọi truyền vào, hoặc lấy từ query payOS lúc khách quay về. */
        orderCode:
          extractOrderCodeFromCheckoutUrl(checkoutUrl) || normalizeOrderCode(orderCode),
        code: code ? String(code) : null,
        amount:
          amount === null || amount === undefined || amount === "" ||
          !Number.isFinite(Number(amount))
            ? null
            : Number(amount),
        createdAt,
      }),
    );

    return true;
  } catch {
    return false;
  }
};

export const clearPendingPayment = () => {
  try {
    getLocalStorage()?.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    /* Không xoá được thì thôi. */
  }
};

/** Đọc khoản đang chờ; hỏng hoặc quá hạn thì xoá và trả null. */
export const readPendingPayment = (now = Date.now()) => {
  let parsed;

  try {
    const raw = getLocalStorage()?.getItem(PENDING_PAYMENT_KEY);

    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!parsed) {
    return null;
  }

  const createdAt = Date.parse(parsed.createdAt);

  if (
    !parsed.targetId ||
    !Object.values(PAYMENT_SUBJECTS).includes(parsed.subject) ||
    (Number.isFinite(createdAt) && now - createdAt > PENDING_PAYMENT_TTL_MS)
  ) {
    clearPendingPayment();
    return null;
  }

  return { ...parsed, orderCode: normalizeOrderCode(parsed.orderCode) };
};

/**
 * Chi tiết đơn của khoản vừa trả.
 *   retry=false: xem đơn sau khi trả xong.
 *   retry=true : chỗ có nút trả tiền để trả lại (khoản trả trước mua hộ nằm ở màn báo
 *                giá, cọc ký gửi ở tab báo giá, các khoản khác ở tab thanh toán).
 */
export const getPendingPaymentOrderPath = (pending, { retry = false } = {}) => {
  if (!pending?.targetId) return "";

  if (pending.subject === PAYMENT_SUBJECTS.purchaseRequest) {
    return retry && pending.purpose === PAYMENT_PURPOSES.purchasePrepay
      ? purchaseRequestQuotationPath(pending.targetId)
      : purchaseRequestDetailPath(pending.targetId);
  }

  if (retry && pending.purpose === PAYMENT_PURPOSES.deposit) {
    return orderDetailPath(pending.targetId, ORDER_TABS.quotation);
  }

  const path = orderDetailPath(pending.targetId, ORDER_TABS.payment);

  return pending.orderCode
    ? `${path}?${PAYMENT_TRANSACTION_QUERY_KEY}=${encodeURIComponent(pending.orderCode)}`
    : path;
};

/** Sub-tab của Lịch sử giao dịch chứa đơn của khoản này. */
export const isPurchaseRequestPayment = (pending) =>
  pending?.subject === PAYMENT_SUBJECTS.purchaseRequest;

/** Phần của Lịch sử giao dịch ứng với khoản: yêu cầu mua hộ → mua-ho, đơn kho → ky-gui. */
export const paymentReturnKindOf = (subject) =>
  subject === PAYMENT_SUBJECTS.purchaseRequest ? ORDER_KINDS.purchase : ORDER_KINDS.consignment;

/**
 * returnUrl / cancelUrl gửi kèm MỌI lần tạo thanh toán: cùng về "Thanh toán → Lịch sử giao
 * dịch" `?loai=`; backend tự gắn `orderCode` + `status` (success / cancelled) để banner xử lý.
 *
 * @param {string} kind ORDER_KINDS.purchase (khoản của yêu cầu mua hộ) | ORDER_KINDS.consignment
 *   (khoản của đơn kho, kể cả đơn kho sinh từ mua hộ).
 * @param {string} [origin] mặc định window.location.origin.
 * @returns {{ returnUrl: string, cancelUrl: string }} chuỗi rỗng khi không biết origin (SSR).
 */
export const buildPaymentReturnUrls = (kind, origin = globalThis.window?.location?.origin) => {
  const base = String(origin ?? "").trim().replace(/\/+$/, "");

  if (!base) return { returnUrl: "", cancelUrl: "" };

  const loai = kind === ORDER_KINDS.purchase ? ORDER_KINDS.purchase : ORDER_KINDS.consignment;
  const url = `${base}${paymentTabPath(PAYMENT_TABS.history)}?${HISTORY_KIND_QUERY_KEY}=${loai}`;

  return { returnUrl: url, cancelUrl: url };
};

const SEPAY_CHECKOUT_PATTERN = /\/api\/payments\/sepay\/checkout\//i;

/**
 * Gắn `?returnUrl=&cancelUrl=` vào link trang QR SePay (/api/payments/sepay/checkout/{mã})
 * để trả xong / bấm Huỷ khách về Lịch sử giao dịch kèm mã giao dịch. Link đã có returnUrl
 * (backend dựng sẵn) hoặc không phải trang QR SePay (payOS: URL cố định lúc tạo) → giữ nguyên.
 *
 * @param {string} url link thanh toán (tuyệt đối hoặc tương đối).
 * @param {string} kind xem buildPaymentReturnUrls.
 */
export const withPaymentReturnUrls = (url, kind, origin) => {
  const text = String(url ?? "").trim();

  if (!text || !SEPAY_CHECKOUT_PATTERN.test(text)) return text;

  const hashIndex = text.indexOf("#");
  const beforeHash = hashIndex >= 0 ? text.slice(0, hashIndex) : text;
  const hash = hashIndex >= 0 ? text.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const existing = new URLSearchParams(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "");

  if (existing.has("returnUrl")) return text;

  const { returnUrl, cancelUrl } = buildPaymentReturnUrls(kind, origin);

  if (!returnUrl) return text;

  const extra = new URLSearchParams({ returnUrl, cancelUrl }).toString();
  const separator = queryIndex < 0 ? "?" : /[?&]$/.test(beforeHash) ? "" : "&";

  return `${beforeHash}${separator}${extra}${hash}`;
};

/**
 * Đọc `orderCode` + `status` backend gắn vào URL trả về (cái ĐẦU tiên — payOS nối query
 * của nó phía sau), kèm `cancel=true` của payOS.
 *
 * @param {string} search location.search
 * @returns {{ orderCode: string, status: ""|"success"|"cancelled", hasReturnParams: boolean }}
 */
export const parsePaymentReturnParams = (search = "") => {
  const params = new URLSearchParams(search);
  const rawStatus = String(params.get(PAYMENT_RETURN_STATUS_KEY) ?? "").trim().toUpperCase();
  const cancelFlag = String(params.get("cancel") ?? "").trim().toLowerCase() === "true";

  let status = "";

  if (cancelFlag || CANCELLED_RETURN_STATUSES.has(rawStatus)) {
    status = PAYMENT_RETURN_STATUSES.cancelled;
  } else if (SUCCESS_RETURN_STATUSES.has(rawStatus)) {
    status = PAYMENT_RETURN_STATUSES.success;
  }

  return {
    orderCode: normalizeOrderCode(params.get(PAYMENT_RETURN_ORDER_CODE_KEY)),
    status,
    hasReturnParams:
      params.has(PAYMENT_RETURN_ORDER_CODE_KEY) || params.has(PAYMENT_RETURN_STATUS_KEY),
  };
};

/**
 * Khách vừa quay về Lịch sử giao dịch: gom `orderCode`/`status` trên URL (ưu tiên), query
 * payOS, khoản đang chờ và `?loai=` thành một bối cảnh duy nhất cho trang dùng.
 *
 * @param {string} search location.search
 * @returns {{ pending: object|null, orderCode: string, status: ""|"success"|"cancelled",
 *   cancelled: boolean, hasPayOsParams: boolean, hasReturnParams: boolean,
 *   fromPaymentReturn: boolean, kind: string|null }}
 *   hasReturnParams: URL có query cần dọn (orderCode/status của ta hoặc query payOS).
 *   kind: ORDER_KINDS.purchase | ORDER_KINDS.consignment | null — phần nên mở sẵn.
 */
export const resolvePaymentReturn = (search = "", now = Date.now()) => {
  const payOs = parsePayOsReturn(search);
  const fromUrl = parsePaymentReturnParams(search);
  const params = new URLSearchParams(search);
  const kindParam = params.get(HISTORY_KIND_QUERY_KEY);
  const hasReturnParams = fromUrl.hasReturnParams || payOs.hasPayOsParams;

  /* Chỉ xử lý khi khách thật sự vừa từ trang thanh toán về: URL trả về có `?loai=` (FE gửi
     sẵn / router gắn cho URL cũ) hoặc `orderCode`/`status`/query payOS. Tự bấm vào tab thì
     không hiện banner, kể cả khi còn một khoản bỏ dở trong hạn. */
  const fromPaymentReturn = Boolean(kindParam) || hasReturnParams;

  let pending = fromPaymentReturn ? readPendingPayment(now) : null;

  /* Khoản cọc ký gửi ghi theo cách cũ (sessionStorage) trước bản này — vẫn đọc. */
  if (!pending && fromPaymentReturn) {
    const legacy = readPendingConsignmentPayment(now);

    pending = legacy?.orderId
      ? {
          subject: PAYMENT_SUBJECTS.order,
          targetId: String(legacy.orderId),
          purpose: PAYMENT_PURPOSES.deposit,
          orderCode: legacy.orderCode,
          code: legacy.consignmentCode ?? null,
          amount: legacy.amount ?? null,
          createdAt: legacy.createdAt,
        }
      : null;
  }

  /* Mã trên URL là chắc chắn nhất (backend gắn đúng giao dịch vừa xử lý). Bản ghi chỉ
     dùng để biết đơn đích / khoản gì: mã khác → bản ghi là của lần khác, bỏ qua nó.
     Bản ghi chưa biết mã (payOS mở từ link không kèm mã) thì nhận mã của URL. */
  const urlOrderCode = fromUrl.orderCode || payOs.orderCode;

  if (pending && urlOrderCode) {
    if (pending.orderCode && pending.orderCode !== urlOrderCode) {
      pending = null;
    } else if (!pending.orderCode) {
      pending = { ...pending, orderCode: urlOrderCode };
    }
  }

  const status =
    fromUrl.status ||
    (payOs.cancelled ? PAYMENT_RETURN_STATUSES.cancelled : "");

  let kind = null;

  if (pending) {
    kind = paymentReturnKindOf(pending.subject);
  } else if (kindParam === ORDER_KINDS.purchase || kindParam === ORDER_KINDS.consignment) {
    kind = kindParam;
  } else if (hasReturnParams) {
    kind = ORDER_KINDS.consignment;
  }

  return {
    pending,
    orderCode: urlOrderCode || pending?.orderCode || "",
    status,
    cancelled: status === PAYMENT_RETURN_STATUSES.cancelled,
    hasPayOsParams: payOs.hasPayOsParams,
    hasReturnParams,
    fromPaymentReturn,
    kind,
  };
};
