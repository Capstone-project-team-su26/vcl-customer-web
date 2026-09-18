/**
 * Nguồn sự thật duy nhất cho mọi URL của ứng dụng.
 *
 * Component không viết chuỗi "/check-orders" thẳng vào <Link>/navigate() nữa —
 * đổi URL ở đây là đổi toàn bộ ứng dụng, và IDE tự tìm được mọi nơi đang dùng.
 *
 *   navigate(ROUTES.consignmentDetail(order.id))
 *   <NavLink to={ROUTES.checkOrders} />
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
 * Dashboard — khách đã đăng nhập (bọc trong MainLayout)               *
 * ------------------------------------------------------------------ */

export const DASHBOARD_ROUTES = {
  dashboard: "/customer/dashboard",

  /* Tạo đơn */
  createOrder: "/create-order",
  createConsignmentOrder: "/create-order/consignment",
  createBuyOrder: "/create-order/buy-orders",

  /* Đơn đang xử lý */
  processingOrders: "/processing-orders",
  purchaseRequests: "/processing-orders/purchase-requests",
  purchaseRequestDetail: (requestId = ":requestId") =>
    `/processing-orders/purchase-requests/${requestId}`,
  consignmentDetail: (orderId = ":orderId") => `/consignments/${orderId}`,

  /* Chờ báo giá */
  checkOrders: "/check-orders",
  buyForMeQuotations: "/check-orders/buy-on-behalf",
  buyForMeQuotationDetail: (requestId = ":requestId") =>
    `/check-orders/buy-on-behalf/${requestId}`,
  quotationDetail: (orderId = ":orderId") => `/quotations/${orderId}`,

  /* Kho — chỉ còn phần theo dõi kho của đơn MUA HỘ (ký gửi theo dõi ở "Theo dõi đơn hàng"). */
  warehouseCheckin: "/warehouse/checkin",
  warehouseInventory: "/warehouse/inventory",
  warehousePurchaseDetail: (id = ":id") => `/warehouse/purchase-detail/${id}`,
  warehouseCustoms: "/warehouse/customs",

  /* Theo dõi đơn ký gửi (hành trình, giữ hàng, tất toán, giao hàng, sự cố).
     Bản sao ở features/tracking/constants/trackingPaths.js — đổi ở đây thì đổi cả ở đó. */
  orderTracking: "/tracking",
  orderTrackingDetail: (orderId = ":orderId") => `/tracking/${orderId}`,

  /* Thanh toán vận chuyển (tất toán) */
  payment: "/payment",

  /* Lịch sử */
  consignmentHistory: "/history/consignment",
  buyOnBehalfHistory: "/history/buy-on-behalf",
  buyOrderHistory: "/history/buy-order",
  transactionHistory: "/transaction-history",
  orderPaymentHistory: (orderId = ":orderId") =>
    `/orders/${orderId}/payments/history`,
  buyOnBehalfPaymentHistory: (requestId = ":requestId") =>
    `/history/buy-on-behalf/${requestId}/payments`,
  buyOrderPaymentHistory: (requestId = ":requestId") =>
    `/history/buy-order/${requestId}/payments`,
  purchaseRequestPaymentHistory: (requestId = ":requestId") =>
    `/purchase-requests/${requestId}/payments/history`,
  purchaseRequestPayments: (requestId = ":requestId") =>
    `/purchase-requests/${requestId}/payments`,

  /* CSKH & cài đặt */
  customerServiceChat: "/customer-service-chat",
  profileConfig: "/settings/profile-config",
  servicePolicy: "/settings/chinh-sach-dich-vu",
};

export const ROUTES = { ...PUBLIC_ROUTES, ...DASHBOARD_ROUTES };

export default ROUTES;
