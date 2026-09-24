/**
 * Nguồn sự thật duy nhất cho mọi URL của ứng dụng.
 *
 * Component không viết chuỗi "/orders" thẳng vào <Link>/navigate() nữa —
 * đổi URL ở đây là đổi toàn bộ ứng dụng, và IDE tự tìm được mọi nơi đang dùng.
 *
 *   navigate(ROUTES.orderDetail(order.id, ORDER_DETAIL_TABS.quotation))
 *   <NavLink to={ROUTES.orders} />
 */

/* ------------------------------------------------------------------ *
 * Public — khách chưa đăng nhập                                       *
 * ------------------------------------------------------------------ */

export const PUBLIC_ROUTES = {
  landing: "/",
  home: "/home",

  /* Tài khoản */
  login: "/login",
  register: "/register",
  verifyOtp: "/verify-otp",
  forgotPassword: "/forgot-password",
  otpForgot: "/otp-forgot",

  /* Dịch vụ */
  consignmentService: "/consignment-service",
  buyForMeService: "/buy-for-me-service",

  /* Bảng giá */
  buyForMePricing: "/buy-for-me-pricing",
  consignmentPricing: "/consignment-pricing",
  pricingCalculator: "/pricing-calculator",
  serviceFeesPricing: "/service-fees-pricing",
  internationalShippingPricing: "/international-shipping-pricing",

  /* Chính sách */
  generalRulesPolicy: "/general-rules-policy",
  shippingPolicy: "/shipping-policy",
  paymentPolicy: "/payment-policy",
  cancellationRefundPolicy: "/cancellation-refund-policy",
  cargoInsurancePolicy: "/cargo-insurance-policy",
  liabilityDisclaimerPolicy: "/liability-disclaimer-policy",
  privacyPolicy: "/privacy-policy",
  orderingPolicy: "/ordering-policy",

  /* Hướng dẫn */
  buyForMeGuide: "/buy-for-me-guide",
  consignmentGuide: "/consignment-guide",
  createOrderGuide: "/create-order-guide",
  paymentGuide: "/payment-guide",
  orderTrackingGuide: "/order-tracking-guide",
  complaintGuide: "/complaint-guide",

  /* Blog */
  logisticsNewsBlog: "/logistics-news-blog",
  internationalShoppingExperienceBlog: "/international-shopping-experience-blog",
  importGuideBlog: "/import-guide-blog",
  shippingKnowledgeBlog: "/shipping-knowledge-blog",
  offersAnnouncementsBlog: "/offers-announcements-blog",

  /* Khác */
  contactUs: "/contact-us",
  quotationPage: "/quotation-page",
  aboutUs: "/about-us",
  /* Tra cứu công khai theo mã đơn (GET /api/public/parcels/tracking). */
  orderLookup: "/order-lookup",
};

/* ------------------------------------------------------------------ *
 * Tab của trang chi tiết đơn ký gửi — nằm trên URL để chia sẻ link     *
 * và bấm Back được từng tab.                                          *
 * ------------------------------------------------------------------ */

export const ORDER_DETAIL_TABS = Object.freeze({
  /* Thanh chặng + dòng thời gian + giữ hàng tại kho nguồn. */
  journey: "hanh-trinh",
  /* Báo giá, chi phí, nút xác nhận / từ chối khi đơn còn chờ khách duyệt. */
  quotation: "bao-gia",
  /* Các khoản của đơn, xem trước tất toán, phí lưu kho, nút trả tiền. */
  payment: "thanh-toan",
  /* Dòng hàng, kiện, phiếu tiếp nhận kho, chọn giao ngay / gửi kho. */
  parcels: "kien-kho",
  /* Sự cố, khiếu nại, giấy tờ đính kèm. */
  incidents: "su-co",
});

export const ORDER_DETAIL_TAB_LIST = Object.freeze([
  ORDER_DETAIL_TABS.journey,
  ORDER_DETAIL_TABS.quotation,
  ORDER_DETAIL_TABS.payment,
  ORDER_DETAIL_TABS.parcels,
  ORDER_DETAIL_TABS.incidents,
]);

export const DEFAULT_ORDER_DETAIL_TAB = ORDER_DETAIL_TABS.journey;

/** Tab của trang Thanh toán. */
export const PAYMENT_TABS = Object.freeze({
  due: "can-thanh-toan",
  history: "lich-su",
});

export const PAYMENT_TAB_LIST = Object.freeze([
  PAYMENT_TABS.due,
  PAYMENT_TABS.history,
]);

export const DEFAULT_PAYMENT_TAB = PAYMENT_TABS.due;

/**
 * Hai loại đơn. Dùng chung cho cả mục menu ("Đơn ký gửi" / "Đơn mua hộ") lẫn nút chuyển
 * đổi trên trang Tạo đơn, để khách chỉ phải nhớ một bộ chữ trên URL.
 */
export const ORDER_KINDS = Object.freeze({
  consignment: "ky-gui",
  purchase: "mua-ho",
});

export const CREATE_ORDER_TABS = ORDER_KINDS;

export const CREATE_ORDER_TAB_LIST = Object.freeze([
  CREATE_ORDER_TABS.consignment,
  CREATE_ORDER_TABS.purchase,
]);

export const DEFAULT_CREATE_ORDER_TAB = CREATE_ORDER_TABS.consignment;

/* ------------------------------------------------------------------ *
 * Dashboard — khách đã đăng nhập (bọc trong MainLayout)               *
 *                                                                     *
 * Menu phẳng 8 mục, không nhóm gập: Bảng điều khiển · Tạo đơn ·        *
 * Đơn ký gửi · Đơn mua hộ · Thanh toán · Trò chuyện với CSKH ·         *
 * Cấu hình tài khoản · Chính sách dịch vụ.                             *
 *                                                                     *
 * Hai loại đơn có hai danh sách riêng nhưng DÙNG CHUNG một component,  *
 * và một đơn ký gửi = một URL (`/orders/:orderId/:tab`) thay cho       *
 * 5 trang rời trước đây.                                              *
 * ------------------------------------------------------------------ */

export const DASHBOARD_ROUTES = {
  /* Việc cần làm hôm nay. */
  dashboard: "/customer/dashboard",

  /* Tạo đơn — một trang, chuyển đổi Ký gửi / Mua hộ bằng tab trên URL. */
  createOrder: "/create-order",
  createOrderTab: (tab = ":tab") => `/create-order/${tab}`,

  /* Đơn hàng — hai mục menu, hai danh sách, một component. Loại đơn nằm trên đường dẫn
     vì nó là mục menu; giai đoạn và từ khoá lọc nằm trên query (?stage=&q=). */
  orders: "/orders",
  consignmentOrders: `/orders/${ORDER_KINDS.consignment}`,
  purchaseOrders: `/orders/${ORDER_KINDS.purchase}`,

  /* Chi tiết đơn KÝ GỬI — 5 tab. */
  orderDetailRoot: (orderId = ":orderId") => `/orders/${orderId}`,
  orderDetail: (orderId = ":orderId", tab = DEFAULT_ORDER_DETAIL_TAB) =>
    `/orders/${orderId}/${tab}`,

  /* Chi tiết đơn MUA HỘ — hai màn riêng, còn chạy dữ liệu mẫu. */
  purchaseRequestDetail: (requestId = ":requestId") =>
    `/orders/${ORDER_KINDS.purchase}/${requestId}`,
  purchaseRequestQuotation: (requestId = ":requestId") =>
    `/orders/${ORDER_KINDS.purchase}/${requestId}/bao-gia`,

  /* Thanh toán — 2 tab: cần thanh toán / lịch sử giao dịch. */
  payment: "/payment",
  paymentTab: (tab = ":tab") => `/payment/${tab}`,

  /* Hỗ trợ & tài khoản */
  customerServiceChat: "/customer-service-chat",
  profileConfig: "/settings/profile-config",
  servicePolicy: "/settings/chinh-sach-dich-vu",
};

/* ------------------------------------------------------------------ *
 * URL cũ — chỉ còn để chuyển hướng (Navigate replace)                 *
 *                                                                     *
 * Link trong email, thông báo đẩy và bookmark của khách vẫn trỏ về     *
 * đây, nên chúng không được chết. Không thêm mục mới vào bảng này.     *
 * ------------------------------------------------------------------ */

export const LEGACY_DASHBOARD_ROUTES = {
  /* Đơn đang xử lý / kiện chờ báo giá / theo dõi / lịch sử → /orders */
  processingOrders: "/processing-orders",
  purchaseRequests: "/processing-orders/purchase-requests",
  purchaseRequestDetail: "/processing-orders/purchase-requests/:requestId",
  checkOrders: "/check-orders",
  buyForMeQuotations: "/check-orders/buy-on-behalf",
  buyForMeQuotationDetail: "/check-orders/buy-on-behalf/:requestId",
  orderTracking: "/tracking",
  consignmentHistory: "/history/consignment",
  buyOnBehalfHistory: "/history/buy-on-behalf",
  buyOrderHistory: "/history/buy-order",

  /* 5 trang của MỘT đơn → 5 tab của /orders/:orderId */
  consignmentDetail: "/consignments/:orderId",
  quotationDetail: "/quotations/:orderId",
  orderTrackingDetail: "/tracking/:orderId",
  orderPaymentHistory: "/orders/:orderId/payments/history",

  /* Lịch sử thanh toán rời → tab "Lịch sử giao dịch" của /payment */
  transactionHistory: "/transaction-history",
  buyOnBehalfPaymentHistory: "/history/buy-on-behalf/:requestId/payments",
  buyOrderPaymentHistory: "/history/buy-order/:requestId/payments",
  purchaseRequestPayments: "/purchase-requests/:requestId/payments",
  purchaseRequestPaymentHistory: "/purchase-requests/:requestId/payments/history",

  /* Tạo đơn tách hai trang → một trang có nút chuyển đổi */
  createConsignmentOrder: "/create-order/consignment",
  createBuyOrder: "/create-order/buy-orders",

  /* Kho hàng mua hộ: khách không vận hành kho, thông tin kiện/kho nằm ở
     tab "kien-kho" của đơn. */
  warehouseCheckin: "/warehouse/checkin",
  warehouseInventory: "/warehouse/inventory",
  warehouseCustoms: "/warehouse/customs",
  warehousePurchaseDetail: "/warehouse/purchase-detail/:id",
};

export const ROUTES = { ...PUBLIC_ROUTES, ...DASHBOARD_ROUTES };

export default ROUTES;
