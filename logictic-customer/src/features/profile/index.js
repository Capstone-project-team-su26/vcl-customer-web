// Module "profile" sở hữu màn hình hồ sơ khách hàng sau khi đăng nhập: khối xem
// thông tin cá nhân và form chỉnh sửa (kèm chọn tỉnh/huyện/xã). Module không có
// lớp api riêng — dữ liệu profile đọc/ghi qua authService của feature "auth", nên
// bên ngoài cần gọi API hồ sơ thì import từ "@features/auth", không phải từ đây.
// Barrel này là cửa duy nhất ra ngoài, nhờ đó router và các feature khác chỉ phụ
// thuộc vào tên trang/tên component, còn cấu trúc thư mục bên trong vẫn tự do đổi.

// Trang gắn thẳng vào route dashboard, đặt đúng tên component để tra cứu ở router cho nhanh.
export { default as ProfileConfig } from "./pages/ProfileConfig/ProfileConfig";

// Hai khối hồ sơ là hàng public chứ không phải phần ruột của ProfileConfig: mỗi khối
// nhận hợp đồng props riêng (ProfileView chỉ cần profile + loading, ProfileEdit tự gọi
// API cập nhật rồi báo ngược qua onUpdated), nên màn hình khác vẫn lắp lại được.
// Lưu ý khi tái sử dụng: cả hai không tự import CSS, toàn bộ class nằm trong
// ProfileConfig.css — nơi dùng phải kéo theo file style đó thì giao diện mới đúng.
export { default as ProfileView } from "./components/ProfileView/ProfileView";
export { default as ProfileEdit } from "./components/ProfileEdit/ProfileEdit";
