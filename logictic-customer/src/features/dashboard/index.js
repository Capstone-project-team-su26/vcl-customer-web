// Module "dashboard" sở hữu màn hình đầu tiên khách thấy sau khi đăng nhập: bảng VIỆC
// CẦN LÀM (không phải bảng thống kê). Số liệu lấy từ một endpoint duy nhất
// /api/customers/me/dashboard, gộp sẵn cả ký gửi lẫn mua hộ ở backend.
// Barrel này là cửa duy nhất ra ngoài, nhờ đó khi cấu trúc thư mục bên trong đổi
// thì router và các feature khác không phải sửa đường dẫn import theo.

export { default as Dashboard } from "./pages/Dashboard/Dashboard";
