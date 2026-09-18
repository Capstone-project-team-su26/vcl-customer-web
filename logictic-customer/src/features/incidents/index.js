// Module "incidents" sở hữu sự cố hàng hoá ở chặng Việt Nam và khiếu nại sau giao của khách:
// xem sự cố + ảnh hiện trạng, chọn cách xử lý, mở khiếu nại, gửi ảnh cho khiếu nại.
// Không có trang riêng — thẻ OrderIncidentsCard được nhúng vào màn Theo dõi đơn.
// Đã nối API thật: /api/parcel-incidents, /api/orders/consignments/{id}/complaints.

export { default as OrderIncidentsCard } from "./components/OrderIncidentsCard/OrderIncidentsCard";
export { default as IncidentDetailModal } from "./components/IncidentDetailModal/IncidentDetailModal";

export { default as parcelIncidentApi } from "./api/parcelIncidentApi";
export * from "./api/parcelIncidentApi";
