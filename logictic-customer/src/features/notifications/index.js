// Module "notifications" sở hữu toàn bộ nghiệp vụ thông báo của khách: lấy danh sách
// (phân trang, lọc chưa đọc), đánh dấu đã đọc từng cái hoặc tất cả, và xóa thông báo.
// Hiện module mới chỉ có tầng api — chuông thông báo trên header và trang danh sách
// đều gọi qua đây, nên barrel này là cửa duy nhất ra ngoài: sau này thêm pages/
// hay components/ thì nơi gọi vẫn giữ nguyên import.

// Service export cả object mặc định lẫn hàm rời, giữ đủ hai đường import để nơi gọi
// chọn kiểu nào cũng được mà không phải trỏ sâu vào file trong module.
export { default as notificationApi } from "./api/notificationApi";
export * from "./api/notificationApi";
