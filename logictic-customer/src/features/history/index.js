// Module "history" sở hữu phần tra cứu lịch sử giao dịch đã hoàn tất của khách:
// lịch sử đơn mua hộ, lịch sử đơn ký gửi và màn hình tab gộp hai loại đó.
// Dữ liệu đều đọc lại từ lớp API của purchase/consignment nên module này không có
// thư mục api riêng. Gom về một cửa ngõ để router chỉ phụ thuộc tên trang,
// còn cấu trúc thư mục bên trong vẫn tự do thay đổi.

// Các trang gắn trực tiếp vào route, đặt tên theo tên component để tra cứu ở router cho nhanh.
// Hai trang danh sách nhận prop defaultStatus nên vừa dùng làm route độc lập,
// vừa nhúng lại được bên trong tab lịch sử giao dịch.
export { default as BuyOrderHistoryList } from "./pages/BuyOrderHistoryList/BuyOrderHistoryList";
export { default as ConsignmentHistoryList } from "./pages/ConsignmentHistoryList/ConsignmentHistoryList";
export { default as TransactionHistoryTabs } from "./pages/TransactionHistoryTabs/TransactionHistoryTabs";

// BuyOrderHistoryContent và ConsignmentHistoryContent cố tình không xuất ra ngoài:
// chúng chỉ là lớp bọc mỏng khoá sẵn defaultStatus="COMPLETED" cho đúng một trang
// TransactionHistoryTabs, không phải hợp đồng dùng chung.
