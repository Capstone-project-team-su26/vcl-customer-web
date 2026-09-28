/* =========================================================
   orderType.js — phân biệt ĐƠN KÝ GỬI với ĐƠN KHO CỦA MUA HỘ.

   Khi VCL đặt nhà cung cấp cho một yêu cầu mua hộ, backend sinh một đơn kho
   (Order.OrderType = "PURCHASE", mã `{mã yêu cầu}-{n}`, ví dụ
   PUR-20260915083000-123456-1 — PurchaseOrderService: ConsignmentCode =
   $"{PurchaseCode}-{SequenceNo}"). Đơn kho này đi chung bảng Order với đơn ký gửi, nên
   các endpoint đơn kho (/api/orders/consignments, /api/orders/awaiting-settlement,
   /api/customers/me/dashboard) trả lẫn cả hai.

   Với khách, đơn kho PUR thuộc về yêu cầu mua hộ — không được hiện như "đơn ký gửi"
   khách tự tạo. Mọi chỗ cần tách hai loại đọc từ đây.
   ========================================================= */

export const CONSIGNMENT_ORDER_TYPE = "CONSIGNMENT";
export const PURCHASE_ORDER_TYPE = "PURCHASE";

const upper = (value) => String(value ?? "").trim().toUpperCase();

/* Mã yêu cầu mua hộ: PUR-{yyyyMMddHHmmss}-{6 số}; đơn kho thêm `-{n}` phía sau. */
const WAREHOUSE_CODE_PATTERN = /^(PUR-[^-]+-[^-]+)-(\d+)$/i;

const codeOf = (item) =>
  String(item?.consignmentCode || item?.orderCode || item?.code || "").trim();

/**
 * Bản ghi đơn kho này là đơn kho của mua hộ (không phải đơn ký gửi)?
 *
 * Ưu tiên `orderType` backend trả; bản ghi thiếu trường đó (endpoint đời cũ) thì dựa vào
 * `purchaseRequestId` hoặc tiền tố mã PUR- — đơn ký gửi luôn mang mã VCL-.
 */
export const isPurchaseWarehouseOrder = (item) => {
  if (!item || typeof item !== "object") return false;

  const orderType = upper(item.orderType);
  if (orderType) return orderType === PURCHASE_ORDER_TYPE;

  if (item.purchaseRequestId) return true;

  return codeOf(item).toUpperCase().startsWith("PUR-");
};

/** Chỉ giữ đơn ký gửi — dùng cho mọi danh sách / số đếm "Đơn ký gửi". */
export const onlyConsignmentOrders = (items) =>
  Array.isArray(items) ? items.filter((item) => !isPurchaseWarehouseOrder(item)) : [];

/**
 * Mã yêu cầu mua hộ của một đơn kho PUR (`PUR-…-123456-1` → `PUR-…-123456`).
 * Mã không đúng dạng đơn kho thì trả chuỗi rỗng — không đoán.
 */
export const purchaseCodeOfWarehouseOrder = (code) => {
  const match = String(code ?? "").trim().match(WAREHOUSE_CODE_PATTERN);

  return match ? match[1] : "";
};
