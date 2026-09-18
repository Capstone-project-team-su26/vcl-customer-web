// Module "chat" sở hữu kênh trao đổi giữa khách và CSKH: màn hình hội thoại
// (danh sách cuộc trò chuyện, khung tin nhắn, đính kèm ảnh) cùng service gọi API
// hội thoại. Cuộc trò chuyện gắn được với đơn ký gửi / mua hộ / báo giá, nên lớp
// API ở đây là phần các module khác dễ dùng lại nhất.
// Barrel này là cửa duy nhất ra ngoài, nhờ đó router và các feature khác chỉ phụ
// thuộc vào tên trang/tên hàm, còn cấu trúc thư mục bên trong vẫn tự do thay đổi.

// Trang gắn thẳng vào route trong khu vực dashboard, đặt đúng tên component để
// tra cứu ở router cho nhanh.
export { default as CustomerServiceChat } from "./pages/CustomerServiceChat/CustomerServiceChat";

// Service export cả object mặc định lẫn từng hàm rời, giữ đủ hai đường import để
// nơi gọi chọn kiểu nào cũng được mà không phải trỏ sâu vào file trong module.
export { default as conversationApi } from "./api/conversationApi";
export * from "./api/conversationApi";
