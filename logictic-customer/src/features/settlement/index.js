// Module "settlement" sở hữu bước tất toán cuối của khách: danh sách đơn đã về kho Việt Nam
// còn nợ tiền, xem trước tất toán theo cân đo VN, phí lưu kho, và lối trả đợt cuối.
// Việc phát hành đợt cuối thuộc về Sale nên ra ngoài module này chỉ là quyền xem và trả tiền.
// Đã nối API thật: /api/orders/awaiting-settlement, /api/orders/{id}/settlement-preview.

// Trang gắn thẳng vào route dashboard.
export { default as SettlementList } from "./pages/SettlementList/SettlementList";

// Khối nhúng vào màn Theo dõi đơn.
export { default as SettlementPreviewCard } from "./components/SettlementPreviewCard/SettlementPreviewCard";
export { default as StorageFeeCard } from "./components/StorageFeeCard/StorageFeeCard";

// Service export cả object mặc định lẫn hàm rời.
export { default as settlementApi } from "./api/settlementApi";
export * from "./api/settlementApi";
