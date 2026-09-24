// Module "payment" sở hữu phần tiền bạc của đơn: hai trang lịch sử thanh toán
// (ký gửi và mua hộ), các hộp thoại xác nhận/hủy báo giá dùng chung cho luồng
// chốt đơn, và service gọi API lịch sử thanh toán.
// Barrel này là cửa duy nhất ra ngoài, nhờ đó router cùng các module consignment
// và purchase chỉ phụ thuộc vào tên trang/tên component, còn cấu trúc thư mục
// bên trong vẫn tự do thay đổi mà không kéo theo sửa import khắp dự án.

// PaymentCenter là trang /payment (2 tab: cần thanh toán · lịch sử giao dịch).
// OrderPaymentHistory không còn route riêng: nó là tab "Thanh toán" của một đơn
// (/orders/:orderId/thanh-toan) nên nhận prop `embedded`.
// BuyOrderPaymentHistory (lịch sử thanh toán một yêu cầu mua hộ) đã xoá — các URL cũ
// /history/.../payments và /purchase-requests/:id/payments* nay chuyển về tab lịch sử.
export { default as PaymentCenter } from "./pages/PaymentCenter/PaymentCenter";
export { default as OrderPaymentHistory } from "./pages/OrderPaymentHistory/OrderPaymentHistory";

// Hai hộp thoại này không thuộc riêng trang nào: consignment và purchase cùng mở
// chúng ở bước chốt báo giá, nên phải nằm trong mặt tiền công khai của module.
export { default as QuotationCancelDialog } from "./components/QuotationCancelDialog/QuotationCancelDialog";
export { default as QuotationPaymentConfirmDialog } from "./components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog";

// Hộp thoại xác nhận còn kèm hằng PAYMENT_METHODS, nơi gọi phải so sánh phương
// thức trả về nên giữ luôn đường import cho hằng này thay vì trỏ sâu vào file.
export * from "./components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog";

// Service export cả object mặc định lẫn từng hàm rời, giữ đủ hai đường import để
// nơi gọi chọn kiểu nào cũng được mà không phải trỏ sâu vào file trong module.
export { default as orderPaymentApi } from "./api/orderPaymentApi";
export * from "./api/orderPaymentApi";

// Mở link thanh toán (payOS chuyển trang, SePay mở tab mới + ghép base URL cho link tương đối)
// — dùng chung cho tất toán, phí lưu kho, phí giao lại.
export * from "./utils/openCheckout";
