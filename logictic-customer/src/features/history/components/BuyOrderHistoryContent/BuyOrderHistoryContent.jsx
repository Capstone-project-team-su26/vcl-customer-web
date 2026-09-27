import BuyOrderHistoryList from "@features/history/pages/BuyOrderHistoryList/BuyOrderHistoryList";

/**
 * Phần "Mua hộ" của Thanh toán → Lịch sử giao dịch. Mặc định LUÔN là "Tất cả" (không lọc
 * trạng thái, không lọc ngày), mới nhất trên cùng — trước đây khoá sẵn "Hoàn thành" nên
 * khách chỉ thấy vài đơn, phải "Xóa bộ lọc" mới thấy đủ.
 *
 * `highlightRequestId`: yêu cầu vừa thanh toán (khách từ trang thanh toán về) — nhảy tới
 * đúng trang, tô + cuộn tới; danh sách vẫn là "Tất cả".
 */
export default function BuyOrderHistoryContent({ highlightRequestId } = {}) {
  return <BuyOrderHistoryList highlightRequestId={highlightRequestId} />;
}
