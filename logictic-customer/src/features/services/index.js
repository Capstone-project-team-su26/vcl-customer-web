// Module "services" giữ các trang giới thiệu dịch vụ (mua hộ, ký gửi) cho khách xem trước khi đặt đơn.
// Gom về một cửa ngõ để router và các feature khác không phải trỏ sâu vào cây thư mục nội bộ.
export { default as BuyForMeService } from "./pages/BuyForMeService/BuyForMeService";
export { default as ConsignmentService } from "./pages/ConsignmentService/ConsignmentService";
