import ConsignmentHistoryList from "@features/history/pages/ConsignmentHistoryList/ConsignmentHistoryList";

/**
 * Phần "Ký gửi" của Thanh toán → Lịch sử giao dịch. Mặc định LUÔN là "Tất cả" (không lọc
 * trạng thái, không lọc ngày), mới nhất trên cùng — trước đây khoá sẵn "Hoàn thành" nên
 * khách chỉ thấy đơn đã xong, phải bấm "Làm mới" (thực chất là xoá bộ lọc) mới thấy đủ.
 *
 * `highlightOrderId`: đơn vừa thanh toán (khách từ trang thanh toán về) — tô + cuộn tới
 * nếu đơn nằm trong trang đang xem; danh sách vẫn là "Tất cả".
 */
export default function ConsignmentHistoryContent({ highlightOrderId } = {}) {
  return <ConsignmentHistoryList highlightOrderId={highlightOrderId} />;
}
