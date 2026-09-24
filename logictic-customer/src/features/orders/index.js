// Module "orders" sở hữu khu vực "Đơn hàng của tôi" — trục chính của web khách sau khi
// đăng nhập:
// - /create-order/:tab  — một trang tạo đơn, chuyển đổi Ký gửi / Mua hộ;
// - /orders             — MỘT danh sách cho mọi đơn, lọc bằng chip trên URL;
// - /orders/:orderId/:tab — MỘT trang chi tiết đơn chia 5 tab.
//
// Module không sở hữu nghiệp vụ nào: form tạo đơn thuộc consignment / purchase, nội dung
// từng tab lắp lại component của consignment, payment, delivery, settlement, incidents,
// receiving và tracking. Việc của nó là điều hướng và bố cục.

export { default as CreateOrder } from "./pages/CreateOrder/CreateOrder";
export { default as OrderList } from "./pages/OrderList/OrderList";
export { default as OrderDetail } from "./pages/OrderDetail/OrderDetail";

// Bảng đường dẫn cấp feature (bản sao của src/app/router/paths.js) — mọi feature khác
// dẫn khách sang khu đơn hàng qua đây thay vì viết chuỗi URL.
export * from "./constants/orderPaths";
