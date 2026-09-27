/**
 * BẢNG VIỆC CẦN LÀM CỦA KHÁCH — API THẬT.
 *
 * GET /api/customers/me/dashboard → { message, data }
 *
 * Một lời gọi thay cho ba bốn lời gọi danh sách mà màn hình phải tự cộng. Backend biết
 * customerId từ token, màn hình không gửi id nào — khách không thể xem bảng của người khác
 * bằng cách sửa tham số.
 *
 * Vì sao không tính ở đây nữa: mỗi con số cần đọc ba bốn bảng (đơn, báo giá, hoá đơn,
 * khoản thu, kiện). Bản cũ kéo 100 đơn về trình duyệt rồi đếm, và vẫn đếm sai một thẻ —
 * nó tìm đơn ở trạng thái "DELIVERED", trạng thái mà hệ thống không bao giờ ghi vào đơn
 * (việc giao nằm ở phiếu giao và ở trạng thái từng kiện), nên thẻ đó luôn bằng 0.
 */

import httpClient from "@shared/api/httpClient";

/* Backend gói { message, data }; vài endpoint đời cũ trả thẳng object nên phải chịu cả hai. */
const unwrapData = (body) =>
  body && typeof body === "object" && "data" in body ? body.data : body;

/** Năm việc backend trả về, đúng thứ tự hiển thị. */
export const ACTION_KEYS = Object.freeze({
  quotationConfirm: "QUOTATION_CONFIRM",
  paymentDue: "PAYMENT_DUE",
  purchasePriceDecision: "PURCHASE_PRICE_DECISION",
  deliveryConfirm: "DELIVERY_CONFIRM",
  refundIncoming: "REFUND_INCOMING",
});

/** Dòng ví dụ thuộc luồng nào — quyết định bấm vào thì mở trang nào. */
export const ITEM_KINDS = Object.freeze({
  consignment: "CONSIGNMENT",
  purchase: "PURCHASE",
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value) => String(value ?? "").trim();

const normalizeItem = (item = {}) => ({
  kind: toText(item.kind).toUpperCase(),
  id: toText(item.id),
  code: toText(item.code),
  status: toText(item.status),
  statusText: toText(item.statusText),
  amount: toNumber(item.amount),
  dueAt: item.dueAt || null,
  updatedAt: item.updatedAt || null,
});

const normalizeAction = (action = {}) => ({
  key: toText(action.key).toUpperCase(),
  count: toNumber(action.count),
  amount: toNumber(action.amount),
  consignmentCount: toNumber(action.consignmentCount),
  purchaseCount: toNumber(action.purchaseCount),
  earliestDueAt: action.earliestDueAt || null,
  items: Array.isArray(action.items) ? action.items.map(normalizeItem) : [],
});

const EMPTY_PROGRESS = Object.freeze({
  waitingStaff: 0,
  waitingGoods: 0,
  atOriginWarehouse: 0,
  inTransit: 0,
  atVietnamWarehouse: 0,
  outForDelivery: 0,
  total: 0,
});

const normalizeProgress = (progress = {}) =>
  Object.fromEntries(
    Object.keys(EMPTY_PROGRESS).map((key) => [key, toNumber(progress[key])]),
  );

export const getCustomerDashboardApi = async ({ signal } = {}) => {
  const response = await httpClient.get("/api/customers/me/dashboard", { signal });
  const body = unwrapData(response?.data) ?? {};

  return {
    actions: Array.isArray(body.actions) ? body.actions.map(normalizeAction) : [],
    inProgress: normalizeProgress(body.inProgress),
    /* Số liệu vẽ biểu đồ — giữ nguyên hình dạng backend trả, component tự đọc. */
    stats: {
      monthlySpend: Array.isArray(body.stats?.monthlySpend)
        ? body.stats.monthlySpend.map((row) => ({
            month: toText(row?.month),
            paid: toNumber(row?.paid),
            paymentCount: toNumber(row?.paymentCount),
          }))
        : [],
      totalFreight: toNumber(body.stats?.totalFreight),
      totalServiceFee: toNumber(body.stats?.totalServiceFee),
      totalTax: toNumber(body.stats?.totalTax),
      quotedOrderCount: toNumber(body.stats?.quotedOrderCount),
    },
    totalAmountDue: toNumber(body.totalAmountDue),
    totalRefundIncoming: toNumber(body.totalRefundIncoming),
    generatedAt: body.generatedAt || null,
  };
};

export default { getCustomerDashboardApi, ACTION_KEYS, ITEM_KINDS };
