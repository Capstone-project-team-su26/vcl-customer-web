// Module "receiving" sở hữu phía khách của phiếu tiếp nhận kho (WRN-): khối phiếu nhúng vào
// màn hình đơn, bản dựng chứng từ để in, và service gọi API phiếu (API thật).
// Phiếu do hệ thống sinh ra chứ khách không tạo, nên ra ngoài chỉ là quyền xem.
//
// Trang "Nhận hàng" (/receive-goods) cũ đã bị xoá: nó dựng trên GET /api/delivery-requests
// (backend chỉ cho nhân viên) + dữ liệu mẫu. Việc nhận hàng của khách nay nằm ở màn
// Theo dõi đơn (/tracking/:orderId): đặt giao, phiếu giao, "Đã nhận hàng".

// Khối phiếu dùng lại ở màn hình đơn ký gửi và lịch sử thanh toán.
export { default as ReceivingNoteCard } from "./components/ReceivingNoteCard/ReceivingNoteCard";

// Bản dựng chứng từ tách riêng để in được; `getReceivingStatusMeta` đi kèm vì nơi
// nào hiển thị phiếu cũng cần dịch trạng thái BE ra nhãn tiếng Việt giống hệt nhau.
export {
  default as ReceivingNoteDocument,
  getReceivingStatusMeta,
} from "./components/ReceivingNoteDocument/ReceivingNoteDocument";

// Service export cả object mặc định lẫn hàm rời.
export { default as receivingNoteApi } from "./api/receivingNoteApi";
export * from "./api/receivingNoteApi";
