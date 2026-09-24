/* =========================================================
   purchaseOrderApi.js — ĐƠN MUA NHÀ CUNG CẤP, phía KHÁCH. API thật.

   Khách chỉ có hai việc với đơn mua:
     1. Khi giá mua thực vượt giá đã báo quá ngưỡng (mặc định 5%), đơn mua dừng ở
        AWAITING_CUSTOMER — khách xem phần chênh rồi ĐỒNG Ý hoặc TỪ CHỐI.
        Đồng ý xong đơn sang AWAITING_CUSTOMER_PAYMENT, khách trả phần chênh.
     2. Theo dõi tiến độ nhà cung cấp: ORDERED → SUPPLIER_CONFIRMED → SUPPLIER_SHIPPED.

   Mọi thao tác còn lại (lập đơn, duyệt ngân sách, đặt NCC) là việc của nhân viên —
   backend tự chặn theo vai trò, FE không bày nút.
   ========================================================= */
import httpClient from "@shared/api/httpClient";

const trimText = (value) => String(value ?? "").trim();

const getSignal = (options = {}) => options?.signal || undefined;

const unwrapData = (body) =>
  body && typeof body === "object" && "data" in body ? body.data : body;

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Trạng thái đơn mua, kèm câu giải thích cho khách (không dùng từ nội bộ). */
export const SUPPLIER_ORDER_STEPS = Object.freeze({
  AWAITING_CUSTOMER: {
    label: "Chờ bạn duyệt phần chênh giá",
    tone: "warning",
    hint: "Giá mua thực cao hơn giá đã báo. Bạn xem phần chênh rồi quyết định.",
  },
  AWAITING_CUSTOMER_PAYMENT: {
    label: "Chờ bạn trả phần chênh",
    tone: "warning",
    hint: "Bạn đã đồng ý phần chênh; trả xong thì VCL đặt hàng ngay.",
  },
  PENDING_APPROVAL: {
    label: "VCL đang duyệt ngân sách",
    tone: "processing",
    hint: "Đơn mua đang chờ duyệt nội bộ trước khi đặt nhà cung cấp.",
  },
  APPROVED: {
    label: "Sắp đặt hàng",
    tone: "processing",
    hint: "Ngân sách đã duyệt, nhân viên đang đặt hàng nhà cung cấp.",
  },
  ORDERED: {
    label: "Đã đặt nhà cung cấp",
    tone: "processing",
    hint: "Đang chờ người bán xác nhận đơn.",
  },
  SUPPLIER_CONFIRMED: {
    label: "Người bán đã xác nhận",
    tone: "processing",
    hint: "Người bán đang chuẩn bị hàng.",
  },
  SUPPLIER_SHIPPED: {
    label: "Người bán đã gửi hàng",
    tone: "success",
    hint: "Hàng đang trên đường về kho VCL ở nước ngoài.",
  },
  REJECTED: { label: "Đơn mua bị từ chối", tone: "default", hint: "Nhân viên sẽ lập lại đơn khác." },
  CANCELLED: { label: "Đã huỷ", tone: "default", hint: "" },
  DRAFT: { label: "Đang soạn", tone: "default", hint: "Nhân viên đang chuẩn bị đơn mua." },
});

export const getSupplierOrderStep = (status) =>
  SUPPLIER_ORDER_STEPS[trimText(status).toUpperCase()] || {
    label: status || "—",
    tone: "default",
    hint: "",
  };

/** Các mốc hiện trên dòng thời gian, đúng thứ tự thật. */
export const SUPPLIER_TIMELINE = Object.freeze([
  { status: "ORDERED", label: "Đặt hàng", at: "orderedAt" },
  { status: "SUPPLIER_CONFIRMED", label: "Người bán xác nhận", at: "supplierConfirmedAt" },
  { status: "SUPPLIER_SHIPPED", label: "Người bán gửi hàng", at: "supplierShippedAt" },
]);

const normalizeOrder = (order = {}) => ({
  ...order,
  totalAmount: toNumber(order.totalAmount),
  quotedGoodsAmount: toNumber(order.quotedGoodsAmount),
  priceDifferenceAmount: toNumber(order.priceDifferenceAmount),
  priceToleranceRate: toNumber(order.priceToleranceRate),
  items: toArray(order.items).map((item) => ({
    ...item,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    quotedUnitPrice: item.quotedUnitPrice == null ? null : toNumber(item.quotedUnitPrice),
    lineTotal: toNumber(item.lineTotal),
  })),
  step: getSupplierOrderStep(order.status),
});

/** Đơn mua của một yêu cầu — backend chỉ trả đơn thuộc khách đang đăng nhập. */
export const getSupplierOrdersApi = async (purchaseRequestId, options = {}) => {
  const id = trimText(purchaseRequestId);

  if (!id) return [];

  try {
    const response = await httpClient.get(
      `/api/purchase-requests/${encodeURIComponent(id)}/purchase-orders`,
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data)).map(normalizeOrder);
  } catch (error) {
    if (error?.code === "ERR_CANCELED") throw error;

    /* Bản backend chưa có luồng mua hộ chuẩn trả 404 — coi như chưa có đơn mua nào. */
    if (error?.response?.status === 404) return [];

    throw error;
  }
};

/**
 * Khách quyết định với phần chênh giá.
 *
 * @param {string} purchaseOrderId
 * @param {{ accept: boolean, reason?: string, paymentMethod?: string, returnUrl?: string }} payload
 */
export const decideSupplierOrderApi = async (purchaseOrderId, payload = {}) => {
  const id = trimText(purchaseOrderId);

  if (!id) {
    throw new Error("Thiếu mã đơn mua.");
  }

  const accept = Boolean(payload?.accept);

  if (!accept && !trimText(payload?.reason)) {
    throw new Error("Vui lòng nhập lý do từ chối phần chênh giá.");
  }

  const body = {
    accept,
    ...(trimText(payload?.reason) ? { reason: trimText(payload.reason) } : {}),
    /* Đồng ý thì backend tạo luôn lần thu phần chênh — mặc định quét QR SePay. */
    ...(accept ? { paymentMethod: trimText(payload?.paymentMethod).toUpperCase() || "SEPAY" } : {}),
    ...(trimText(payload?.returnUrl) ? { returnUrl: trimText(payload.returnUrl) } : {}),
  };

  const response = await httpClient.post(
    `/api/purchase-orders/${encodeURIComponent(id)}/customer-decision`,
    body
  );

  return unwrapData(response.data);
};

export default { getSupplierOrdersApi, decideSupplierOrderApi };
