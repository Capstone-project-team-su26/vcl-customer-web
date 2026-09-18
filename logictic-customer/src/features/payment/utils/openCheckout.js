/* =========================================================
   openCheckout — mở link thanh toán của một khoản thu (tất toán, phí lưu kho, phí
   giao lại) theo đúng cách màn thanh toán cọc đang làm.

   - payOS (link tuyệt đối): chuyển thẳng trang như QuotationDetail / Lịch sử thanh
     toán (window.location.assign) — payOS tự đưa khách về returnUrl.
   - SePay (trang QR của server, /api/payments/sepay/checkout/...): mở TAB MỚI, vì đó
     là trang tĩnh không tự quay về; khách quét QR xong quay lại tab này bấm "Tải lại".
   Link luôn đi qua resolveCheckoutUrl để link SePay tương đối được ghép base URL API.
   ========================================================= */

import {
  isSepayCheckoutUrl,
  resolveCheckoutUrl,
} from "@features/payment/api/orderPaymentApi";

/** @returns {boolean} false nếu link không hợp lệ (nơi gọi báo lỗi). */
export const openCheckout = (url) => {
  const resolved = resolveCheckoutUrl(url);

  if (!resolved) return false;

  if (isSepayCheckoutUrl(resolved)) {
    globalThis.window?.open(resolved, "_blank", "noopener");
  } else {
    globalThis.window?.location.assign(resolved);
  }

  return true;
};

export default openCheckout;
