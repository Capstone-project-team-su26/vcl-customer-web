/* =========================================================
   openCheckout — mở link thanh toán của một khoản thu (tất toán, phí lưu kho, phí
   giao lại, chênh giá mua hộ) theo đúng cách màn thanh toán cọc đang làm.

   - payOS (link tuyệt đối): chuyển thẳng trang như QuotationDetail / Lịch sử thanh
     toán (window.location.assign) — payOS tự đưa khách về returnUrl.
   - SePay (trang QR của server, /api/payments/sepay/checkout/...): mở TAB MỚI, link gắn
     `?returnUrl=&cancelUrl=` = "Thanh toán → Lịch sử giao dịch" `?loai=` (mua-ho cho khoản
     của yêu cầu mua hộ và của đơn kho PUR-…-n, ky-gui cho đơn ký gửi); trả xong / bấm Huỷ trang QR đưa tab
     đó về URL này kèm `orderCode` + `status`.
   Link luôn đi qua resolveCheckoutUrl để link SePay tương đối được ghép base URL API.

   `pending` (tuỳ chọn): khoản đang trả thuộc đơn nào — ghi lại TRƯỚC khi mở. URL trả về
   chỉ có mã giao dịch; bản ghi cho Lịch sử giao dịch biết mã đó là khoản gì của đơn nào
   để "Xem đơn" / trả lại về đúng chỗ. Xem pendingPaymentReturn.js.
   ========================================================= */

import {
  isSepayCheckoutUrl,
  resolveCheckoutUrl,
} from "@features/payment/api/orderPaymentApi";
import {
  paymentReturnKindOf,
  savePendingPayment,
  withPaymentReturnUrls,
} from "@features/payment/utils/pendingPaymentReturn";

/**
 * @param {string} url
 * @param {Parameters<typeof savePendingPayment>[0]} [pending]
 * @returns {boolean} false nếu link không hợp lệ (nơi gọi báo lỗi).
 */
export const openCheckout = (url, pending) => {
  const checkoutUrl = resolveCheckoutUrl(url);

  if (!checkoutUrl) return false;

  /* Không biết khoản của đâu thì để trang QR dùng URL trả về mặc định của backend. */
  const resolved = pending
    ? withPaymentReturnUrls(checkoutUrl, paymentReturnKindOf(pending))
    : checkoutUrl;

  if (pending) {
    savePendingPayment({ ...pending, checkoutUrl: resolved });
  }

  if (isSepayCheckoutUrl(resolved)) {
    globalThis.window?.open(resolved, "_blank", "noopener");
  } else {
    globalThis.window?.location.assign(resolved);
  }

  return true;
};

export default openCheckout;
