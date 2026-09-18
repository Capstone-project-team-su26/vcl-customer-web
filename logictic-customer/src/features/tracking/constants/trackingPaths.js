/**
 * Đường dẫn màn theo dõi đơn — BẢN SAO của khoá `orderTracking` / `orderTrackingDetail`
 * trong src/app/router/paths.js.
 *
 * Vì sao chép lại: feature không được import ngược lên tầng app (ARCHITECTURE mục 1),
 * nhưng thẻ tóm tắt ở chi tiết đơn / lịch sử thanh toán / thông báo cần dẫn khách sang
 * đây. Đổi URL ở paths.js thì đổi luôn ở đây.
 */
export const ORDER_TRACKING_LIST_PATH = "/tracking";

export const orderTrackingDetailPath = (orderId) =>
  `/tracking/${encodeURIComponent(String(orderId ?? ""))}`;
