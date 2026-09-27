// Module "history" sở hữu phần tra cứu lịch sử giao dịch của khách:
// lịch sử đơn mua hộ, lịch sử đơn ký gửi và màn hình tab gộp hai loại đó.
// Dữ liệu đều đọc lại từ lớp API của purchase/consignment nên module này không có
// thư mục api riêng. Gom về một cửa ngõ để router chỉ phụ thuộc tên trang,
// còn cấu trúc thư mục bên trong vẫn tự do thay đổi.

// TransactionHistoryTabs nay là nội dung tab "Lịch sử giao dịch" của /payment chứ không
// còn route riêng; hai trang danh sách bên dưới chỉ còn sống bên trong nó (mặc định
// "Tất cả", mới nhất trên cùng). /history/consignment và /history/buy-on-behalf (URL backend
// trả khách về sau thanh toán) chuyển hướng về đây kèm ?loai=; khi đó PaymentReturnBanner
// báo kết quả giao dịch vừa trả và hai danh sách tô đơn vừa trả.
export { default as BuyOrderHistoryList } from "./pages/BuyOrderHistoryList/BuyOrderHistoryList";
export { default as ConsignmentHistoryList } from "./pages/ConsignmentHistoryList/ConsignmentHistoryList";
export { default as TransactionHistoryTabs } from "./pages/TransactionHistoryTabs/TransactionHistoryTabs";

// BuyOrderHistoryContent và ConsignmentHistoryContent cố tình không xuất ra ngoài:
// chúng chỉ là lớp bọc mỏng (truyền đơn cần tô) cho đúng một trang
// TransactionHistoryTabs, không phải hợp đồng dùng chung.
