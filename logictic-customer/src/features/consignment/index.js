// Module "consignment" sở hữu toàn bộ nghiệp vụ ký gửi: tạo đơn, tra cứu danh sách,
// xem chi tiết/báo giá và các hàm gọi API ký gửi. Nhiều feature khác (dashboard, chat,
// warehouse, purchase, history) đang phụ thuộc vào lớp API này, nên gom về một cửa ngõ
// để đường dẫn nội bộ còn tự do thay đổi mà không phải sửa chỗ import bên ngoài.

// Ba màn còn lại của module. ConsignmentOrder là form tạo đơn (nhúng trong /create-order);
// ConsignmentListDetail và QuotationDetail không còn route riêng mà là hai TAB của trang
// chi tiết đơn /orders/:orderId, nên cả hai nhận prop `embedded`.
// Hai màn danh sách cũ (ConsignmentList "đơn đang xử lý", ConsignmentListCheck "kiện chờ
// báo giá") đã xoá — danh sách đơn duy nhất /orders thay cả hai.
export { default as ConsignmentOrder } from "./pages/ConsignmentOrder/ConsignmentOrder";
export { default as ConsignmentListDetail } from "./pages/ConsignmentListDetail/ConsignmentListDetail";
export { default as QuotationDetail } from "./pages/QuotationDetail/QuotationDetail";

// Hai widget nhập liệu dùng chung của form ký gửi. Chúng kèm theo hằng số mô tả
// nghiệp vụ (cách xử lý hàng ở kho đích, khung dịch vụ rỗng) mà nơi khác cần đọc để
// khởi tạo state, nên xuất cả default lẫn named.
export { default as DestinationHandlingChoice } from "./components/DestinationHandlingChoice/DestinationHandlingChoice";
export * from "./components/DestinationHandlingChoice/DestinationHandlingChoice";
export { default as PackageOptionalServices } from "./components/PackageOptionalServices/PackageOptionalServices";
export * from "./components/PackageOptionalServices/PackageOptionalServices";

// ConsignmentListDetailUI và ConsignmentOrderConfirm cố tình không xuất ra ngoài:
// đó chỉ là phần giao diện tách khỏi đúng một trang, không phải hợp đồng dùng chung.

// Toàn bộ hàm gọi API ký gửi đều là public, các module này không có default export.
export * from "./api/consignmentApi";
export * from "./api/consignmentStatusApi";
export * from "./api/aiOrderIntentApi";

// Trạng thái đơn ký gửi: 19 mã đích, nhãn tiếng Việt và hàm chuẩn hóa mã cũ.
// Nguồn duy nhất trong app — mọi màn và feature khác đọc nhãn/mã đơn từ đây.
export * from "./constants/orderStatus";
