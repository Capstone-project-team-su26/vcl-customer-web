// Module "dashboard" sở hữu màn hình tổng quan sau khi khách đăng nhập: thẻ số liệu,
// nhóm thao tác nhanh và danh sách đơn gần đây (dữ liệu lấy từ consignment + purchase).
// Barrel này là cửa duy nhất ra ngoài, nhờ đó khi cấu trúc thư mục bên trong đổi
// thì router và các feature khác không phải sửa đường dẫn import theo.

export { default as Dashboard } from "./pages/Dashboard/Dashboard";
