// Module "service-policy" sở hữu màn hình chính sách dịch vụ dành cho khách đã đăng nhập:
// bảng giá vận chuyển đang áp dụng và cửa sổ chi tiết của từng bảng giá.
// Module chỉ đọc dữ liệu từ lớp API của "pricing" nên không có thư mục api riêng.
// Barrel này là cửa duy nhất ra ngoài, nhờ đó khi cấu trúc thư mục bên trong đổi
// thì router và các feature khác không phải sửa đường dẫn import theo.

// Trang gắn trực tiếp vào route dashboard, đặt đúng tên component để tra cứu ở router cho nhanh.
export { default as ServicePolicy } from "./pages/ServicePolicy/ServicePolicy";

// Cửa sổ chi tiết bảng giá được tách ra khỏi trang và tự gọi API lấy dữ liệu đầy đủ,
// nên vẫn là một khối dùng lại được ở nơi khác chứ không phải phần giao diện riêng của trang.
export { default as ServicePolicyDetail } from "./components/ServicePolicyDetail/ServicePolicyDetail";
