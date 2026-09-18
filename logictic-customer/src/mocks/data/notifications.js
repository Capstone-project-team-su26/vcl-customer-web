/* =========================================================
   data/notifications.js

   Bộ dữ liệu THÔNG BÁO cho chuông thông báo (NotificationPanel).

   Shape của từng bản ghi bám sát đúng những field mà
   layouts/NotificationPanel/NotificationPanel.jsx thực sự đọc trong
   mapApiNotification():
   - id            -> key của item + tham số markNotificationAsReadApi
   - title         -> dòng tiêu đề
   - content       -> dòng mô tả (panel đọc content || message || description)
   - isRead        -> chấm xanh "chưa đọc" + badge số chưa đọc + tab "Chưa đọc"
   - createdAt     -> formatRelative() ra "5 phút trước", "2 ngày trước"
   - type          -> normalizeNotificationType() ra icon + nhãn loại
   - code          -> chip mã đơn ở cuối mỗi dòng
   - relatedId     -> resolveNavigationUrl() dựng link sang màn chi tiết

   LƯU Ý VỀ `type`: panel phân loại theo THỨ TỰ quotation -> payment ->
   shipping -> consignment -> alert -> order, và nó dò cả từ khoá trong
   title/content chứ không chỉ mã type. Vì vậy câu chữ ở đây được chọn có
   chủ đích: một thông báo muốn ra nhóm "alert" thì không được chứa chữ
   "ký gửi" trong title/content, nếu không nó rơi vào nhóm consignment trước.

   `createdAt` tính tương đối theo thời điểm chạy (isoDaysAgo) để chuông
   luôn hiện "vừa xong / x giờ trước" thay vì một mốc chết cứng năm 2026.

   relatedId dùng lại đúng seed của consignments.js / purchaseRequests.js
   (stableUuid cùng seed thì cùng GUID), nên thông báo trỏ về đúng đơn có
   thật trong fixture chứ không phải GUID mồ côi.
   ========================================================= */

import { isoDaysAgo, stableUuid } from "../mockUtils";

/* =========================================================
   THAM CHIẾU SANG ĐƠN CÓ THẬT
   ========================================================= */

/** GUID đơn ký gửi theo seed của data/consignments.js. */
const consignmentIdOf = (seed) =>
  stableUuid(`consignment-order-${seed}`);

/** GUID đơn mua hộ theo seed của data/purchaseRequests.js. */
const purchaseIdOf = (seed) =>
  stableUuid(`purchase-request-${seed}`);

/* =========================================================
   FACTORY
   ========================================================= */

/**
 * Dựng một bản ghi thông báo đúng envelope của backend cũ.
 *
 * @param {object} input
 * @param {string} input.seed khoá sinh GUID, cố định theo thứ tự trong list
 * @param {string} input.type mã loại thông báo phía backend
 * @param {string} input.title
 * @param {string} input.content
 * @param {string} [input.code] mã đơn liên quan (VCL-... / PUR-...)
 * @param {string|null} [input.relatedId] GUID đơn liên quan
 * @param {string} [input.relatedType] CONSIGNMENT | PURCHASE_REQUEST | SYSTEM
 * @param {boolean} [input.isRead]
 * @param {number} [input.daysAgo]
 * @param {number} [input.hoursAgo]
 * @returns {object}
 */
const createNotification = ({
  seed,
  type,
  title,
  content,
  code = "",
  relatedId = null,
  relatedType = "SYSTEM",
  isRead = false,
  daysAgo = 0,
  hoursAgo = 0,
}) => {
  const createdAt = isoDaysAgo(daysAgo, hoursAgo);

  return {
    id: stableUuid(`notification-${seed}`),
    /* Backend cũ trả cả hai tên khoá; panel đọc id trước, notificationId sau. */
    notificationId: stableUuid(`notification-${seed}`),

    title,
    content,
    /* Alias message: panel fallback content || message || description. */
    message: content,

    type,
    relatedType,
    relatedId,
    code,

    isRead,
    status: isRead ? "READ" : "UNREAD",
    readAt: isRead ? isoDaysAgo(daysAgo, Math.max(0, hoursAgo - 1)) : null,

    createdAt,
    updatedAt: createdAt,
  };
};

/* =========================================================
   DANH SÁCH THÔNG BÁO (mới nhất đứng đầu)
   ========================================================= */

/**
 * Nguồn dữ liệu thông báo dùng chung cả phiên.
 *
 * Mảng này bị MUTATE trực tiếp khi người dùng bấm "đã đọc" / "đọc tất cả"
 * / xoá, để lần fetch sau (panel tự gọi lại mỗi 60 giây) thấy đúng trạng
 * thái mới. Không persist qua reload — đúng như bản UI-only cần.
 *
 * @type {Array<object>}
 */
export const notifications = [
  createNotification({
    seed: "01",
    type: "QUOTATION_READY",
    relatedType: "CONSIGNMENT",
    title: "Báo giá đơn ký gửi đã sẵn sàng",
    content:
      "Đơn ký gửi (Mã: VCL-20260901021433-418209) đã có báo giá 4.850.000 ₫. Vui lòng xác nhận trong 48 giờ.",
    code: "VCL-20260901021433-418209",
    relatedId: consignmentIdOf("01"),
    isRead: false,
    hoursAgo: 0.2,
  }),

  createNotification({
    seed: "02",
    type: "PAYMENT_REQUIRED",
    relatedType: "PURCHASE_REQUEST",
    title: "Cần thanh toán đơn mua hộ",
    content:
      "Đơn mua hộ PUR-20260901072218-604318 cần thanh toán 3.276.000 ₫ trước 12:00 ngày 03/09/2026.",
    code: "PUR-20260901072218-604318",
    relatedId: purchaseIdOf("01"),
    isRead: false,
    hoursAgo: 0.7,
  }),

  createNotification({
    seed: "03",
    type: "ORDER_PLACED",
    relatedType: "PURCHASE_REQUEST",
    title: "Đơn mua hộ đã được đặt hàng",
    content:
      "Đơn PUR-20260831023944-118750 đã được đặt hàng tại shop Taobao, dự kiến về kho Quảng Châu sau 4 ngày.",
    code: "PUR-20260831023944-118750",
    relatedId: purchaseIdOf("02"),
    isRead: false,
    hoursAgo: 2,
  }),

  createNotification({
    seed: "04",
    type: "WAREHOUSE_RECEIPT",
    relatedType: "CONSIGNMENT",
    title: "Đã tạo phiếu nhập kho tại Quảng Châu",
    content:
      "2 kiện thuộc đơn ký gửi VCL-20260831084712-330715 đã nhập kho Quảng Châu, tổng khối lượng 18,6 kg.",
    code: "VCL-20260831084712-330715",
    relatedId: consignmentIdOf("02"),
    isRead: false,
    hoursAgo: 4,
  }),

  createNotification({
    seed: "05",
    type: "CONSIGNMENT_APPROVED",
    relatedType: "CONSIGNMENT",
    title: "Yêu cầu ký gửi đã được duyệt",
    content:
      "Đơn ký gửi VCL-20260830012258-905143 đã được duyệt và chuyển sang xử lý tại kho Quảng Châu.",
    code: "VCL-20260830012258-905143",
    relatedId: consignmentIdOf("03"),
    isRead: false,
    hoursAgo: 7,
  }),

  createNotification({
    seed: "06",
    type: "PAYMENT_RECEIVED",
    relatedType: "PURCHASE_REQUEST",
    title: "Đã nhận thanh toán",
    content:
      "Hệ thống ghi nhận thanh toán 5.120.000 ₫ cho đơn mua hộ PUR-20260830061407-472069.",
    code: "PUR-20260830061407-472069",
    relatedId: purchaseIdOf("03"),
    isRead: true,
    hoursAgo: 10,
  }),

  createNotification({
    seed: "07",
    type: "SHIPPING_UPDATE",
    relatedType: "CONSIGNMENT",
    title: "Hàng đang vận chuyển về Việt Nam",
    content:
      "Lô hàng ký gửi VCL-20260829090541-274860 đã rời kho Quảng Châu, dự kiến về Hà Nội trong 3 ngày.",
    code: "VCL-20260829090541-274860",
    relatedId: consignmentIdOf("04"),
    isRead: true,
    hoursAgo: 15,
  }),

  createNotification({
    seed: "08",
    type: "QUOTATION_UPDATED",
    relatedType: "PURCHASE_REQUEST",
    title: "Báo giá đơn mua hộ được cập nhật",
    content:
      "Báo giá đơn mua hộ PUR-20260829015236-935214 đã cập nhật phí dịch vụ, tổng tạm tính 7.940.000 ₫.",
    code: "PUR-20260829015236-935214",
    relatedId: purchaseIdOf("04"),
    isRead: false,
    hoursAgo: 21,
  }),

  createNotification({
    seed: "09",
    type: "ALERT_REJECTED",
    relatedType: "PURCHASE_REQUEST",
    title: "Yêu cầu bị từ chối",
    content:
      "Yêu cầu PUR-20260828080751-260487 bị từ chối do 2 link sản phẩm đã ngừng bán. Vui lòng tạo lại yêu cầu mới.",
    code: "PUR-20260828080751-260487",
    relatedId: purchaseIdOf("05"),
    isRead: true,
    daysAgo: 1,
    hoursAgo: 2,
  }),

  createNotification({
    seed: "10",
    type: "ORDER_COMPLETED",
    relatedType: "PURCHASE_REQUEST",
    title: "Đơn mua hộ đã hoàn tất",
    content:
      "Đơn PUR-20260827034429-517063 đã giao thành công cho chị Trần Thị Ngọc Ánh tại Cầu Giấy, Hà Nội.",
    code: "PUR-20260827034429-517063",
    relatedId: purchaseIdOf("06"),
    isRead: true,
    daysAgo: 1,
    hoursAgo: 6,
  }),

  createNotification({
    seed: "11",
    type: "CONSIGNMENT_DELIVERED",
    relatedType: "CONSIGNMENT",
    title: "Đơn ký gửi đã giao thành công",
    content:
      "Đơn VCL-20260828033609-661032 đã được giao cho anh Lê Minh Khoa, người nhận đã ký xác nhận.",
    code: "VCL-20260828033609-661032",
    relatedId: consignmentIdOf("05"),
    isRead: true,
    daysAgo: 1,
    hoursAgo: 11,
  }),

  createNotification({
    seed: "12",
    type: "PAYMENT_DUE",
    relatedType: "CONSIGNMENT",
    title: "Sắp đến hạn thanh toán",
    content:
      "Đơn ký gửi VCL-20260827041826-538471 còn 24 giờ để thanh toán 2.640.000 ₫ trước khi bị tạm giữ tại kho.",
    code: "VCL-20260827041826-538471",
    relatedId: consignmentIdOf("06"),
    isRead: false,
    daysAgo: 2,
  }),

  createNotification({
    seed: "13",
    type: "WAREHOUSE_RELEASE",
    relatedType: "PURCHASE_REQUEST",
    title: "Đã xuất kho Hà Nội",
    content:
      "Kiện hàng đơn mua hộ PUR-20260826091852-843926 đã xuất kho Hà Nội và bàn giao cho đối tác giao nhận.",
    code: "PUR-20260826091852-843926",
    relatedId: purchaseIdOf("07"),
    isRead: true,
    daysAgo: 2,
    hoursAgo: 7,
  }),

  createNotification({
    seed: "14",
    type: "QUOTATION_EXPIRING",
    relatedType: "CONSIGNMENT",
    title: "Báo giá sắp hết hạn",
    content:
      "Báo giá đơn ký gửi VCL-20260826075214-192730 sẽ hết hạn sau 12 giờ, quá hạn hệ thống sẽ báo giá lại.",
    code: "VCL-20260826075214-192730",
    relatedId: consignmentIdOf("07"),
    isRead: false,
    daysAgo: 3,
  }),

  createNotification({
    seed: "15",
    type: "ORDER_PROCESSING",
    relatedType: "PURCHASE_REQUEST",
    title: "Đơn mua hộ đang xử lý",
    content:
      "Đơn PUR-20260825053114-379145 đang được nhân viên đối soát giá với shop, sẽ có kết quả trong 24 giờ.",
    code: "PUR-20260825053114-379145",
    relatedId: purchaseIdOf("08"),
    isRead: true,
    daysAgo: 3,
    hoursAgo: 9,
  }),

  createNotification({
    seed: "16",
    type: "CONSIGNMENT_STATUS",
    relatedType: "CONSIGNMENT",
    title: "Cập nhật trạng thái đơn ký gửi",
    content:
      "Đơn VCL-20260825024105-847619 đã đóng kiện gỗ xong tại kho Quảng Châu, chờ ghép chuyến.",
    code: "VCL-20260825024105-847619",
    relatedId: consignmentIdOf("08"),
    isRead: true,
    daysAgo: 4,
  }),

  createNotification({
    seed: "17",
    type: "PAYMENT_REFUNDED",
    relatedType: "PURCHASE_REQUEST",
    title: "Hoàn tiền đặt cọc",
    content:
      "Đã hoàn 1.200.000 ₫ tiền đặt cọc đơn mua hộ PUR-20260824022640-701582 về ví khách hàng.",
    code: "PUR-20260824022640-701582",
    relatedId: purchaseIdOf("09"),
    isRead: true,
    daysAgo: 5,
  }),

  createNotification({
    seed: "18",
    type: "SHIPPING_ARRIVED",
    relatedType: "CONSIGNMENT",
    title: "Hàng đã về kho Hà Nội",
    content:
      "Lô ký gửi VCL-20260824100937-406358 đã về kho Hà Nội, sẵn sàng giao trong 48 giờ tới.",
    code: "VCL-20260824100937-406358",
    relatedId: consignmentIdOf("09"),
    isRead: true,
    daysAgo: 6,
  }),

  createNotification({
    seed: "19",
    type: "ALERT_WEIGHT_DIFF",
    relatedType: "CONSIGNMENT",
    title: "Cảnh báo chênh lệch khối lượng",
    content:
      "Kiện hàng VCL-20260822032744-713925 cân thực tế 32,4 kg, cao hơn khai báo 4,1 kg. Phụ phí sẽ cộng vào đơn.",
    code: "VCL-20260822032744-713925",
    relatedId: consignmentIdOf("10"),
    isRead: false,
    daysAgo: 8,
  }),

  createNotification({
    seed: "20",
    type: "PAYMENT_SUCCESS",
    relatedType: "CONSIGNMENT",
    title: "Thanh toán thành công",
    content:
      "Đơn ký gửi VCL-20260821061152-259084 đã thanh toán đủ 6.480.000 ₫, biên lai đã gửi qua email.",
    code: "VCL-20260821061152-259084",
    relatedId: consignmentIdOf("11"),
    isRead: true,
    daysAgo: 10,
  }),

  createNotification({
    seed: "21",
    type: "ORDER_PLACED",
    relatedType: "PURCHASE_REQUEST",
    title: "Đơn mua hộ đã được đặt hàng",
    content:
      "Đơn PUR-20260823074905-264730 đã đặt hàng thành công tại shop 1688, mã vận đơn nội địa SF1284470934120.",
    code: "PUR-20260823074905-264730",
    relatedId: purchaseIdOf("10"),
    isRead: true,
    daysAgo: 12,
  }),

  createNotification({
    seed: "22",
    type: "SYSTEM_ALERT",
    relatedType: "SYSTEM",
    title: "Lịch nghỉ lễ Quốc khánh của kho",
    content:
      "Kho Quảng Châu tạm ngưng nhận hàng từ 01/09 đến 03/09/2026. Các kiện gửi trong thời gian này sẽ xử lý từ 04/09.",
    code: "",
    relatedId: null,
    isRead: true,
    daysAgo: 15,
  }),
];

/* =========================================================
   TRUY VẤN
   ========================================================= */

/**
 * Tìm thông báo theo id (chấp nhận cả notificationId).
 *
 * @param {string|number} notificationId
 * @returns {object | undefined}
 */
export const findNotificationById = (notificationId) => {
  const id = String(notificationId ?? "").trim();

  if (!id) {
    return undefined;
  }

  return notifications.find(
    (item) =>
      String(item.id) === id || String(item.notificationId) === id
  );
};

/**
 * Số thông báo chưa đọc — panel dùng số này cho badge trên chuông.
 *
 * @returns {number}
 */
export const countUnreadNotifications = () =>
  notifications.filter((item) => !item.isRead).length;

export default notifications;
