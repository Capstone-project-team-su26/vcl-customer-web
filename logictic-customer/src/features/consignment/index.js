// Module "consignment" sở hữu toàn bộ nghiệp vụ ký gửi: tạo đơn, tra cứu danh sách,
// xem chi tiết/báo giá và các hàm gọi API ký gửi. Nhiều feature khác (dashboard, chat,
// warehouse, purchase, history) đang phụ thuộc vào lớp API này, nên gom về một cửa ngõ
// để đường dẫn nội bộ còn tự do thay đổi mà không phải sửa chỗ import bên ngoài.

// Các trang gắn trực tiếp vào route, đặt tên theo tên thư mục để tra cứu ở router cho nhanh.
// Riêng ConsignmentListCheck bên trong khai báo component trùng tên "ConsignmentList",
// nên phải xuất theo tên thư mục để không đụng tên với trang ConsignmentList thật.
export { default as ConsignmentOrder } from "./pages/ConsignmentOrder/ConsignmentOrder";
export { default as ConsignmentList } from "./pages/ConsignmentList/ConsignmentList";
export { default as ConsignmentListCheck } from "./pages/ConsignmentListCheck/ConsignmentListCheck";
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
