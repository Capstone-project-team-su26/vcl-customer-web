// Module guides gom các trang hướng dẫn công khai cho khách: mua hộ, ký gửi, tạo đơn,
// thanh toán, theo dõi đơn và khiếu nại. Gom đầu mối tại đây để router chỉ phụ thuộc vào
// tên trang, không phụ thuộc đường dẫn file bên trong.
export { default as BuyForMeGuide } from "./pages/BuyForMeGuide/BuyForMeGuide";
export { default as ConsignmentGuide } from "./pages/ConsignmentGuide/ConsignmentGuide";
export { default as CreateOrderGuide } from "./pages/CreateOrderGuide/CreateOrderGuide";
export { default as PaymentGuide } from "./pages/PaymentGuide/PaymentGuide";
export { default as OrderTrackingGuide } from "./pages/OrderTrackingGuide/OrderTrackingGuide";
export { default as ComplaintGuide } from "./pages/ComplaintGuide/ComplaintGuide";
