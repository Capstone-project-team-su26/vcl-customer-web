/**
 * Chặng hành trình của đơn ký gửi — phía khách (API theo dõi đơn).
 *
 * Bám `CustomerTrackingStages` + `ExportShipmentStatuses` của backend (VCL_BLL/Helpers/
 * ShipmentMilestones.cs) và bảng chặng ở tài liệu ghép API (xuất kho mục L, hàng về VN mục G).
 * Server đã trả sẵn `currentStageText` / `stageText` / `title` — màn hình ƯU TIÊN chữ server,
 * nhãn ở đây chỉ để dựng thanh chặng (cần đủ mọi bậc kể cả bậc chưa tới) và bộ lọc.
 */

export const TRACKING_STAGES = Object.freeze({
  NOT_RECEIVED: "NOT_RECEIVED",
  AT_ORIGIN_WAREHOUSE: "AT_ORIGIN_WAREHOUSE",
  PREPARING_EXPORT: "PREPARING_EXPORT",
  HANDED_OVER: "HANDED_OVER",
  DEPARTED: "DEPARTED",
  IN_TRANSIT: "IN_TRANSIT",
  DELAYED: "DELAYED",
  ON_HOLD: "ON_HOLD",
  CUSTOMS_CLEARED: "CUSTOMS_CLEARED",
  ARRIVED_VN: "ARRIVED_VN",
  ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
  RECEIVED_AT_VN: "RECEIVED_AT_VN",
  QUARANTINED: "QUARANTINED",
  STORED_AT_VN: "STORED_AT_VN",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  DELIVERED: "DELIVERED",
  DISPOSED: "DISPOSED",
});

export const TRACKING_STAGE_LABELS = Object.freeze({
  NOT_RECEIVED: "Kho chưa nhận hàng",
  AT_ORIGIN_WAREHOUSE: "Đang lưu tại kho nguồn, chờ xếp chuyến",
  PREPARING_EXPORT: "Đang chuẩn bị xuất kho",
  HANDED_OVER: "Hàng đã xuất kho",
  DEPARTED: "Hàng đã khởi hành",
  IN_TRANSIT: "Đang vận chuyển về Việt Nam",
  DELAYED: "Hàng bị chậm so với dự kiến",
  ON_HOLD: "Hàng đang tạm giữ để xử lý",
  CUSTOMS_CLEARED: "Đã thông quan",
  ARRIVED_VN: "Hàng đã về Việt Nam",
  ARRIVED_DESTINATION: "Hàng đã về kho Việt Nam",
  RECEIVED_AT_VN: "Kho Việt Nam đã nhận và kiểm hàng",
  QUARANTINED: "Hàng đang được xử lý sự cố",
  STORED_AT_VN: "Đang lưu tại kho Việt Nam",
  OUT_FOR_DELIVERY: "Đang giao hàng",
  DELIVERY_FAILED: "Giao hàng chưa thành công",
  DELIVERED: "Đã giao hàng",
  DISPOSED: "Đã huỷ theo xử lý sự cố",
});

/**
 * Các bậc của thanh chặng, gộp theo cách khách hiểu (không bày 13 bậc kỹ thuật).
 * `stages` là mọi mã server có thể trả rơi vào bậc đó — trễ / tạm giữ nằm chung
 * "Đang vận chuyển", cách ly nằm chung "Kho VN đã nhận", giao thất bại nằm chung
 * "Đang giao" — đúng như hàm Rank() của backend.
 */
export const TRACKING_STEPS = Object.freeze([
  { key: "ORIGIN", title: "Kho nguồn", stages: ["NOT_RECEIVED", "AT_ORIGIN_WAREHOUSE", "PREPARING_EXPORT"] },
  { key: "EXPORTED", title: "Đã xuất kho", stages: ["HANDED_OVER", "DEPARTED"] },
  { key: "TRANSIT", title: "Đang vận chuyển", stages: ["IN_TRANSIT", "DELAYED", "ON_HOLD", "CUSTOMS_CLEARED"] },
  { key: "ARRIVED", title: "Về Việt Nam", stages: ["ARRIVED_VN", "ARRIVED_DESTINATION"] },
  { key: "VN_WAREHOUSE", title: "Kho Việt Nam", stages: ["RECEIVED_AT_VN", "QUARANTINED", "STORED_AT_VN"] },
  { key: "DELIVERY", title: "Giao hàng", stages: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED"] },
  { key: "DONE", title: "Đã giao", stages: ["DELIVERED", "DISPOSED"] },
]);

/** Chặng mang tính cảnh báo — tô màu khác để khách chú ý. */
export const WARNING_STAGES = Object.freeze(["DELAYED", "ON_HOLD", "QUARANTINED", "DELIVERY_FAILED"]);

/** Chặng còn ở kho nguồn — lúc này giữ hàng còn có tác dụng. */
export const ORIGIN_STAGES = Object.freeze(["NOT_RECEIVED", "AT_ORIGIN_WAREHOUSE", "PREPARING_EXPORT"]);

/** Chặng đã về kho Việt Nam trở đi — lúc này mới có chọn hướng kiện thực tế, tất toán, giao. */
export const VN_STAGES = Object.freeze([
  "ARRIVED_DESTINATION",
  "RECEIVED_AT_VN",
  "QUARANTINED",
  "STORED_AT_VN",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "DISPOSED",
]);

/** Bộ lọc chặng ở danh sách (giá trị gửi lên `stage=` — nhiều giá trị ngăn bởi dấu phẩy). */
export const TRACKING_STAGE_FILTERS = Object.freeze([
  { value: "", label: "Tất cả chặng" },
  { value: "NOT_RECEIVED,AT_ORIGIN_WAREHOUSE,PREPARING_EXPORT", label: "Ở kho nguồn" },
  { value: "HANDED_OVER,DEPARTED,IN_TRANSIT,CUSTOMS_CLEARED,ARRIVED_VN", label: "Đang trên đường về" },
  { value: "DELAYED,ON_HOLD", label: "Trễ / tạm giữ" },
  { value: "ARRIVED_DESTINATION,RECEIVED_AT_VN,QUARANTINED,STORED_AT_VN", label: "Ở kho Việt Nam" },
  { value: "OUT_FOR_DELIVERY,DELIVERY_FAILED", label: "Đang giao" },
  { value: "DELIVERED,DISPOSED", label: "Đã giao" },
]);

/** Trạng thái KIỆN (`packageStatus`) — dùng khi server không kèm chữ. */
export const PACKAGE_STATUS_LABELS = Object.freeze({
  CREATED: "Chờ kho nhận",
  PENDING: "Chờ kho nhận",
  RECEIVED: "Kho nguồn đã nhận",
  CHECKED_IN: "Kho nguồn đã nhận",
  STORED: "Đang nằm trên kệ",
  PICKED: "Đã bốc sang khu xuất",
  IN_SHIPMENT: "Đã lên lô vận chuyển",
  HANDED_OVER: "Đã bàn giao vận chuyển",
  IN_TRANSIT: "Đang vận chuyển",
  ARRIVED_DESTINATION: "Đã về kho VN, chờ kiểm",
  RECEIVED_AT_DESTINATION: "Kho VN đã kiểm, ở khu nhận",
  QUARANTINED: "Đang cách ly xử lý sự cố",
  AWAITING_PICKUP: "Chờ hãng tới lấy",
  PICKING_UP: "Hãng đang tới lấy",
  PICKED_UP: "Hãng đã lấy hàng",
  OUT_FOR_DELIVERY: "Đang giao tới bạn",
  DELIVERY_FAILED: "Giao chưa thành công",
  RETURNING: "Đang hoàn về kho",
  RETURNED: "Đã hoàn về kho",
  DELIVERED: "Đã giao",
  DISPOSED: "Đã huỷ theo sự cố",
});

const normalizeCode = (value) => String(value ?? "").trim().toUpperCase();

/** Nhãn chặng: ưu tiên chữ server, rồi bảng trên, cuối cùng là mã. */
export const getTrackingStageLabel = (stage, serverText) =>
  String(serverText || "").trim() || TRACKING_STAGE_LABELS[normalizeCode(stage)] || normalizeCode(stage) || "—";

export const getPackageStatusLabel = (status, serverText) =>
  String(serverText || "").trim() || PACKAGE_STATUS_LABELS[normalizeCode(status)] || normalizeCode(status) || "—";

/** Vị trí bậc (0-based) của một chặng trên thanh chặng; -1 nếu mã lạ. */
export const getTrackingStepIndex = (stage) => {
  const code = normalizeCode(stage);

  return TRACKING_STEPS.findIndex((step) => step.stages.includes(code));
};

export const isWarningStage = (stage) => WARNING_STAGES.includes(normalizeCode(stage));

export const isOriginStage = (stage) => ORIGIN_STAGES.includes(normalizeCode(stage));

export const isVnStage = (stage) => VN_STAGES.includes(normalizeCode(stage));
