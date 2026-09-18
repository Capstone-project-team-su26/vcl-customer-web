// Module "orders" sở hữu bước đầu của luồng đặt hàng: màn hình cho khách chọn
// giữa Mua hộ và Ký gửi trước khi rẽ sang module tương ứng. Việc tạo đơn chi tiết
// thuộc về "purchase" và "consignment", nên ở đây chỉ có đúng trang điều hướng.
// Gom về một cửa ngõ để router chỉ phụ thuộc vào tên trang, không phụ thuộc
// đường dẫn thư mục bên trong.
export { default as CreateOrder } from "./pages/CreateOrder/CreateOrder";
