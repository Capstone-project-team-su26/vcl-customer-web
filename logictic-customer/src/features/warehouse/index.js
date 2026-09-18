// Module "warehouse" (phía khách) nay CHỈ còn phần theo dõi kho của đơn MUA HỘ (ngoài phạm vi
// đợt ghép API này, vẫn đọc dữ liệu mẫu qua purchaseRequestApi): nhập kho nước ngoài, thông quan
// & kho VN, chi tiết kho một yêu cầu mua hộ.
//
// Theo nghiệp vụ mới (source A) khách KHÔNG tự lập phiếu xuất kho và không xem tồn kho kho nguồn:
// các màn "Lưu kho", "Xuất kho", chi tiết ký gửi / lô / giao hàng / phiếu nhập kho chạy dữ liệu
// mẫu cùng inventoryApi, warehouseReleaseApi đã bị xoá. Đơn ký gửi theo dõi ở module "tracking"
// (/tracking, /tracking/:orderId).

export * from "./pages";

export { default as MuaHoDetail } from "./pages/MuaHoDetail/MuaHoDetail";

// Danh sách theo dõi mua hộ được hai trang kho lắp lại.
export { MuaHoTrackingList } from "./components/MuaHoTracking/MuaHoTrackingList";

// Bộ hiển thị + helper định dạng dùng xuyên suốt các trang kho (StatusPill, PageIntro,
// SummaryCard, formatTime...).
export * from "./components/shared/WarehouseSharedComponents";
