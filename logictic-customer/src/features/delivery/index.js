// Module "delivery" sở hữu chặng Việt Nam → tay khách: chọn giao ngay / gửi kho từng kiện,
// khách tự đặt giao, theo dõi phiếu giao, trả phí giao lại và bước "Đã nhận hàng".
// Module không có trang riêng — các khối ở đây được nhúng vào màn Theo dõi đơn
// (/tracking/:orderId) và chi tiết đơn ký gửi.
// Tất cả đều đã nối API thật (DeliveryRequestController, VnArrivalController, OrderController).

// Khối tóm tắt chặng giao (chi tiết đơn, lịch sử thanh toán) — dẫn sang màn Theo dõi đơn.
export { default as DeliveryTrackingCard } from "./components/DeliveryTrackingCard/DeliveryTrackingCard";

// Chọn hướng xử lý từng kiện khi hàng về VN.
export { default as ParcelHandlingCard } from "./components/ParcelHandlingCard/ParcelHandlingCard";

// Đặt giao, danh sách phiếu giao, phí giao lại, xác nhận đã nhận hàng.
export { default as OrderDeliveryCard } from "./components/OrderDeliveryCard/OrderDeliveryCard";

// Service: mỗi file export cả object mặc định lẫn hàm rời.
export { default as deliveryRequestApi } from "./api/deliveryRequestApi";
export * from "./api/deliveryRequestApi";

export { default as deliveryTrackingApi } from "./api/deliveryTrackingApi";
export * from "./api/deliveryTrackingApi";

export { default as destinationHandlingApi } from "./api/destinationHandlingApi";
export * from "./api/destinationHandlingApi";
