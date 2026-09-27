/**
 * Bảng tra của bảng điều khiển khách.
 *
 * Trước đây file này còn giữ danh mục "việc cần làm" (nhãn từng thẻ, thứ tự ưu tiên,
 * cách tính hạn, đường dẫn từng dòng). Khối việc cần làm đã gỡ khỏi bảng điều khiển
 * theo yêu cầu, nên phần tra cứu của nó gỡ theo — để lại mã không ai gọi thì lần sau
 * đọc sẽ tưởng màn hình vẫn đang dùng.
 *
 * Backend VẪN trả `actions[]` trong /api/customers/me/dashboard, không đụng tới. Khi nào
 * cần dựng lại danh sách việc thì lấy phần đã gỡ từ lịch sử, không phải viết mới.
 */

/** Sáu chặng hàng đang chạy — khách không phải làm gì, chỉ để biết đơn không nằm im. */
export const PROGRESS_STAGES = Object.freeze([
  { key: "waitingStaff", label: "Chờ nhân viên xử lý" },
  { key: "waitingGoods", label: "Chờ hàng về kho nguồn" },
  { key: "atOriginWarehouse", label: "Đã ở kho nguồn" },
  { key: "inTransit", label: "Đang về Việt Nam" },
  { key: "atVietnamWarehouse", label: "Đã về kho Việt Nam" },
  { key: "outForDelivery", label: "Đang giao tới bạn" },
]);
