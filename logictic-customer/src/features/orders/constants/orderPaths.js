/**
 * Đường dẫn khu vực "Đơn hàng" — BẢN SAO cấp feature của các khoá `consignmentOrders`,
 * `purchaseOrders`, `orderDetail`, `payment` trong src/app/router/paths.js.
 *
 * Vì sao phải chép: feature không được import ngược lên tầng app (ARCHITECTURE mục 1),
 * nhưng các thẻ nhúng trong chi tiết đơn, màn tất toán và bảng điều khiển đều cần dẫn
 * khách sang đúng tab. Đổi URL ở paths.js thì đổi luôn ở đây — và CHỈ ở đây: file
 * features/tracking/constants/trackingPaths.js nay chỉ xuất lại các hằng dưới đây.
 */

/** Gốc chung của khu đơn hàng; không có trang riêng, vào là chuyển sang danh sách ký gửi. */
export const ORDERS_ROOT_PATH = "/orders";

/** Hai loại đơn = hai mục menu riêng, dùng chung một component danh sách. */
export const ORDER_KINDS = Object.freeze({
  consignment: "ky-gui",
  purchase: "mua-ho",
});

export const CONSIGNMENT_ORDERS_PATH = `${ORDERS_ROOT_PATH}/${ORDER_KINDS.consignment}`;
export const PURCHASE_ORDERS_PATH = `${ORDERS_ROOT_PATH}/${ORDER_KINDS.purchase}`;

/** Danh sách của một loại đơn. */
export const orderKindListPath = (kind) =>
  kind === ORDER_KINDS.purchase ? PURCHASE_ORDERS_PATH : CONSIGNMENT_ORDERS_PATH;

/** Tab của trang chi tiết đơn ký gửi — giữ giống ORDER_DETAIL_TABS ở paths.js. */
export const ORDER_TABS = Object.freeze({
  journey: "hanh-trinh",
  quotation: "bao-gia",
  payment: "thanh-toan",
  parcels: "kien-kho",
  incidents: "su-co",
});

/** Tab của trang Thanh toán. */
export const PAYMENT_TABS = Object.freeze({
  due: "can-thanh-toan",
  history: "lich-su",
});

export const PAYMENT_PATH = "/payment";

export const CREATE_ORDER_PATH = "/create-order";

/** Loại đơn trên trang Tạo đơn — cùng bộ mã với ORDER_KINDS cho khách dễ nhớ URL. */
export const CREATE_ORDER_TABS = ORDER_KINDS;

const encodeId = (value) => encodeURIComponent(String(value ?? ""));

/** `/orders/{id}/{tab}` — mặc định mở tab hành trình. Chi tiết đơn KÝ GỬI. */
export const orderDetailPath = (orderId, tab = ORDER_TABS.journey) =>
  `${ORDERS_ROOT_PATH}/${encodeId(orderId)}/${tab}`;

/** `/orders/mua-ho/{id}` — chi tiết một yêu cầu mua hộ. */
export const purchaseRequestDetailPath = (requestId) =>
  `${PURCHASE_ORDERS_PATH}/${encodeId(requestId)}`;

/** `/orders/mua-ho/{id}/bao-gia` — báo giá của một yêu cầu mua hộ. */
export const purchaseRequestQuotationPath = (requestId) =>
  `${purchaseRequestDetailPath(requestId)}/bao-gia`;

/** `/payment/{tab}` — mặc định mở tab "Cần thanh toán". */
export const paymentTabPath = (tab = PAYMENT_TABS.due) => `${PAYMENT_PATH}/${tab}`;

/** `/create-order/{tab}` — mặc định mở form ký gửi. */
export const createOrderPath = (tab = CREATE_ORDER_TABS.consignment) =>
  `${CREATE_ORDER_PATH}/${tab}`;

/**
 * `/orders/{loại}?stage=&q=` — mở danh sách đã lọc sẵn (thẻ việc cần làm, thông báo).
 * Loại đơn nằm trên đường dẫn vì nó là mục menu; giai đoạn và từ khoá là query.
 */
export const orderListPath = ({ kind, stage, search } = {}) => {
  const query = new URLSearchParams();

  if (stage) query.set("stage", stage);
  if (search) query.set("q", search);

  const queryString = query.toString();
  const base = orderKindListPath(kind);

  return queryString ? `${base}?${queryString}` : base;
};
