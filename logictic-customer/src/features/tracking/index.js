// Module "tracking" sở hữu việc theo dõi hành trình đơn ký gửi:
// - trang tra cứu công khai theo mã đơn (không đăng nhập) — GET /api/public/parcels/tracking;
// - dữ liệu + khối giao diện hành trình của khách đã đăng nhập (GET /api/orders/consignments/tracking,
//   /{orderId}/tracking; giữ hàng tại kho nguồn; giấy phép hàng hạn chế). Từ đợt gộp IA,
//   các khối này được lắp vào tab "Hành trình" của trang chi tiết đơn (feature "orders").
// Barrel là cửa duy nhất ra ngoài cho router. Lưu ý: nó kéo theo các TRANG (có CSS), nên component
// nhúng vào trang của feature khác nên import sâu đúng file hằng số / component cần (thứ tự CSS).

// Trang gắn vào route: chỉ còn màn tra cứu công khai (/order-lookup).
// Danh sách + chi tiết theo dõi của khách đã nhập vào khu "Đơn hàng của tôi":
// danh sách nằm ở /orders, hành trình là tab /orders/:orderId/hanh-trinh.
export { default as OrderLookup } from "./pages/OrderLookup/OrderLookup";

// Khối dùng lại.
export { default as TrackingStageBar } from "./components/TrackingStageBar/TrackingStageBar";

// Hằng số chặng / trạng thái kiện và đường dẫn màn theo dõi.
export * from "./constants/trackingStages";
export * from "./constants/trackingPaths";

// Service export cả object mặc định lẫn hàm rời.
export { default as publicParcelTrackingApi } from "./api/publicParcelTrackingApi";
export * from "./api/publicParcelTrackingApi";
export { default as orderTrackingApi } from "./api/orderTrackingApi";
export * from "./api/orderTrackingApi";
