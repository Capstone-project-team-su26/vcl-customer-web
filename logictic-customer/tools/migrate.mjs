/**
 * One-shot migration: logictic-customer -> vcl-customer-ui
 *
 * Copies every source file to its new home in the feature-based tree and
 * rewrites each import specifier to the new alias-based path.
 *
 *   node tools/migrate.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = "/Users/cuongsatsuon/vcl-customer-web/logictic-customer";
const DST_ROOT = "/Volumes/RCAdvisor/CUS354/vcl-customer-ui";

/* ------------------------------------------------------------------ *
 * Mapping: old path (relative to source root) -> new path (rel. dest) *
 * ------------------------------------------------------------------ */

const pair = (o, n) => [o, n];

/** Helper: "A/B/Name.jsx" + target dir -> both .jsx and .css pairs. */
const page = (oldDir, oldName, newDir, newName = oldName) => [
  pair(`src/${oldDir}/${oldName}.jsx`, `src/${newDir}/${newName}.jsx`),
  pair(`src/${oldDir}/${oldName}.css`, `src/${newDir}/${newName}.css`),
];

const MAP = [
  /* ---------------- entry & app shell ---------------- */
  pair("src/main.jsx", "src/main.jsx"),
  pair("src/App.jsx", "src/app/App.jsx"),
  pair("src/pages/NotFound.jsx", "src/app/pages/NotFound/NotFound.jsx"),
  pair("src/pages/NotFound.css", "src/app/pages/NotFound/NotFound.css"),

  /* ---------------- global styles ---------------- */
  pair("src/styles/fonts.css", "src/shared/styles/fonts.css"),
  pair("src/index.css", "src/shared/styles/legacy/index-legacy.css"),
  pair("src/App.css", "src/shared/styles/legacy/app-legacy.css"),

  /* ---------------- shared api ---------------- */
  pair("src/api/axios.js", "src/shared/api/httpClient.js"),
  pair("src/api/addressApi.js", "src/shared/api/addressApi.js"),
  pair("src/api/RestrictedItem/restrictedItemApi.js", "src/shared/api/restrictedItemApi.js"),
  pair("src/api/Upload/UploadImage.js", "src/shared/api/uploadImage.js"),

  /* ---------------- shared utils / config / hooks ---------------- */
  pair("src/config/aiConfig.js", "src/shared/config/aiConfig.js"),
  pair("src/hooks/usePendingQuotationCounts.js", "src/shared/hooks/usePendingQuotationCounts.js"),
  pair("src/utils/timeUtc.js", "src/shared/utils/timeUtc.js"),
  pair("src/utils/data/homeData.js", "src/shared/constants/homeData.js"),

  /* ---------------- shared components ---------------- */
  pair("src/utils/AuthNotify.jsx", "src/shared/components/AuthNotify/AuthNotify.jsx"),
  pair("src/utils/auth-notify.css", "src/shared/components/AuthNotify/AuthNotify.css"),
  pair("src/utils/LoadingPro/LogisticsLoading.jsx", "src/shared/components/LogisticsLoading/LogisticsLoading.jsx"),
  pair("src/utils/LoadingPro/LogisticsLoading.css", "src/shared/components/LogisticsLoading/LogisticsLoading.css"),
  pair("src/components/BackToHomeButton.jsx", "src/shared/components/BackToHomeButton/BackToHomeButton.jsx"),
  pair("src/components/BackToHomeButton.css", "src/shared/components/BackToHomeButton/BackToHomeButton.css"),
  pair(
    "src/components/DashboardComponents/CustomerKiguiComponents/ToltipLapelComponents/FieldLabelTooltip.jsx",
    "src/shared/components/FieldLabelTooltip/FieldLabelTooltip.jsx"
  ),
  pair(
    "src/components/DashboardComponents/CustomerKiguiComponents/ToltipLapelComponents/FieldLabelTooltip.css",
    "src/shared/components/FieldLabelTooltip/FieldLabelTooltip.css"
  ),

  /* ---------------- layouts ---------------- */
  pair("src/layouts/MainLayout.jsx", "src/layouts/MainLayout/MainLayout.jsx"),
  pair("src/layouts/MainLayout.css", "src/layouts/MainLayout/MainLayout.css"),
  pair("src/layouts/HeaderLayout/Headeer.jsx", "src/layouts/SiteHeader/SiteHeader.jsx"),
  pair("src/layouts/HeaderLayout/Header.css", "src/layouts/SiteHeader/SiteHeader.css"),
  ...page("layouts/HomeFooter", "HomeFooter", "layouts/HomeFooter"),
  pair("src/layouts/CarouselLayput/HeroCarousel.jsx", "src/layouts/HeroCarousel/HeroCarousel.jsx"),
  pair("src/layouts/CarouselLayput/HeroCarousel.css", "src/layouts/HeroCarousel/HeroCarousel.css"),
  ...page("layouts/NotificationPanel", "NotificationPanel", "layouts/NotificationPanel"),
  pair("src/layouts/SidebarLayout/Sidebar.jsx", "src/layouts/Sidebar/Sidebar.jsx"),
  pair("src/layouts/SidebarLayout/Sidebar.css", "src/layouts/Sidebar/Sidebar.css"),

  /* ================= FEATURE: auth ================= */
  pair("src/api/Auth/authService.js", "src/features/auth/api/authService.js"),
  ...page("pages/LoginPage", "Login", "features/auth/pages/Login"),
  ...page("pages/RegisterPage", "Register", "features/auth/pages/Register"),
  ...page("pages/OTPPage", "VerifyOtp", "features/auth/pages/VerifyOtp"),
  ...page("pages/ForgotPasswordPage", "ForgotPassword", "features/auth/pages/ForgotPassword"),
  ...page("pages/OTPForgotPage", "OTPForgot", "features/auth/pages/OTPForgot"),

  /* ================= FEATURE: marketing ================= */
  ...page("components/Homecomponnets/AIAutomation", "AIAutomationSection", "features/marketing/components/AIAutomationSection"),
  ...page("components/Homecomponnets/Audience", "AudienceSection", "features/marketing/components/AudienceSection"),
  ...page("components/Homecomponnets/Blog", "BlogSection", "features/marketing/components/BlogSection"),
  ...page("components/Homecomponnets/CTA", "CTASection", "features/marketing/components/CTASection"),
  ...page("components/Homecomponnets/Comitments", "CommitmentsSection", "features/marketing/components/CommitmentsSection"),
  ...page("components/Homecomponnets/Floating", "FloatingChat", "features/marketing/components/FloatingChat"),
  ...page("components/Homecomponnets/GlobalBrand", "GlobalBrandSection", "features/marketing/components/GlobalBrandSection"),
  ...page("components/Homecomponnets/Partners", "PartnersMarquee", "features/marketing/components/PartnersMarquee"),
  ...page("components/Homecomponnets/Product", "ProductsSection", "features/marketing/components/ProductsSection"),
  ...page("components/Homecomponnets/Service", "ServicesSection", "features/marketing/components/ServicesSection"),
  ...page("components/Homecomponnets/Stat", "StatsSection", "features/marketing/components/StatsSection"),
  ...page("components/Homecomponnets/Strips", "ServiceStrip", "features/marketing/components/ServiceStrip"),
  ...page("components/Homecomponnets/WhyChoose", "WhyChooseSection", "features/marketing/components/WhyChooseSection"),
  ...page("pages/HomePage", "Home", "features/marketing/pages/Home"),
  ...page("pages/Logistic", "LogisticsIntro", "features/marketing/pages/LogisticsIntro"),
  ...page("pages/HomePage/VeChungToi", "AboutUs", "features/marketing/pages/AboutUs"),
  ...page("pages/HomePage/LienHe", "Contact", "features/marketing/pages/Contact"),
  ...page("pages/HomePage/BaoGia", "QuotationPage", "features/marketing/pages/QuotationPage"),

  /* ================= FEATURE: services (public) ================= */
  ...page("pages/HomePage/DichVu/KiGui", "ConsignmentService", "features/services/pages/ConsignmentService"),
  ...page("pages/HomePage/DichVu/MuaHo", "BuyForMeService", "features/services/pages/BuyForMeService"),

  /* ================= FEATURE: pricing ================= */
  pair("src/api/ServiceApi/pricingRuleService.js", "src/features/pricing/api/pricingRuleService.js"),
  ...page("pages/HomePage/BangGia/BangGiaKiGui", "ConsignmentPricing", "features/pricing/pages/ConsignmentPricing"),
  ...page("pages/HomePage/BangGia/BangGiaMuaHo", "BuyForMePricing", "features/pricing/pages/BuyForMePricing"),
  ...page("pages/HomePage/BangGia/CongThucGia", "PricingCalculator", "features/pricing/pages/PricingCalculator"),
  ...page("pages/HomePage/BangGia/PhDichVu", "ServiceFeesPricing", "features/pricing/pages/ServiceFeesPricing"),
  ...page("pages/HomePage/BangGia/PhiVanChuyen", "InternationalShippingPricing", "features/pricing/pages/InternationalShippingPricing"),

  /* ================= FEATURE: policies ================= */
  ...page("pages/HomePage/ChinhSach/QuyDinhChung", "GeneralRulesPolicy", "features/policies/pages/GeneralRulesPolicy"),
  ...page("pages/HomePage/ChinhSach/VanChuyen", "ShippingPolicy", "features/policies/pages/ShippingPolicy"),
  ...page("pages/HomePage/ChinhSach/ThanhToan", "PaymentPolicy", "features/policies/pages/PaymentPolicy"),
  ...page("pages/HomePage/ChinhSach/HuyDonVaHoanTien", "CancellationRefundPolicy", "features/policies/pages/CancellationRefundPolicy"),
  ...page("pages/HomePage/ChinhSach/BaoHiemHang", "CargoInsurancePolicy", "features/policies/pages/CargoInsurancePolicy"),
  ...page("pages/HomePage/ChinhSach/MienTruTrachNhiem", "LiabilityDisclaimerPolicy", "features/policies/pages/LiabilityDisclaimerPolicy"),
  ...page("pages/HomePage/ChinhSach/BaoMat", "PrivacyPolicy", "features/policies/pages/PrivacyPolicy"),
  ...page("pages/HomePage/ChinhSach/DatHang", "OrderingPolicy", "features/policies/pages/OrderingPolicy"),

  /* ================= FEATURE: guides ================= */
  ...page("pages/HomePage/HuongDan/HDMuaHo", "BuyForMeGuide", "features/guides/pages/BuyForMeGuide"),
  ...page("pages/HomePage/HuongDan/HDKiGui", "ConsignmentGuide", "features/guides/pages/ConsignmentGuide"),
  ...page("pages/HomePage/HuongDan/TaoDonHang", "CreateOrderGuide", "features/guides/pages/CreateOrderGuide"),
  ...page("pages/HomePage/HuongDan/HDThanhToan", "PaymentGuide", "features/guides/pages/PaymentGuide"),
  ...page("pages/HomePage/HuongDan/HDCheckDon", "OrderTrackingGuide", "features/guides/pages/OrderTrackingGuide"),
  ...page("pages/HomePage/HuongDan/ReportOrder", "ComplaintGuide", "features/guides/pages/ComplaintGuide"),

  /* ================= FEATURE: blog ================= */
  ...page("pages/HomePage/BlogPage/News", "LogisticsNewsBlog", "features/blog/pages/LogisticsNewsBlog"),
  ...page("pages/HomePage/BlogPage/KinhNghiemOrder", "InternationalShoppingExperienceBlog", "features/blog/pages/InternationalShoppingExperienceBlog"),
  ...page("pages/HomePage/BlogPage/NhapHang", "ImportGuideBlog", "features/blog/pages/ImportGuideBlog"),
  ...page("pages/HomePage/BlogPage/KienThucVanChuyen", "ShippingKnowledgeBlog", "features/blog/pages/ShippingKnowledgeBlog"),
  ...page("pages/HomePage/BlogPage/UuDaiVaThongBao", "OffersAnnouncementsBlog", "features/blog/pages/OffersAnnouncementsBlog"),

  /* ================= FEATURE: tracking (public lookup) ================= */
  pair("src/api/ServiceApi/publicParcelTrackingApi.js", "src/features/tracking/api/publicParcelTrackingApi.js"),
  ...page("pages/HomePage/TraCuu", "OrderLookup", "features/tracking/pages/OrderLookup"),

  /* ================= FEATURE: dashboard ================= */
  ...page("pages/DashboardPage/DashboardCusstomer", "Dashboard", "features/dashboard/pages/Dashboard"),

  /* ================= FEATURE: orders (entry chooser) ================= */
  ...page("pages/DashboardPage/CreateCustomer", "CreateOrder", "features/orders/pages/CreateOrder"),

  /* ================= FEATURE: consignment ================= */
  pair("src/api/OrderApi/consignmentApi.js", "src/features/consignment/api/consignmentApi.js"),
  pair("src/api/OrderApi/consignmentStatusApi.js", "src/features/consignment/api/consignmentStatusApi.js"),
  pair("src/api/OrderApi/aiOrderIntentApi.js", "src/features/consignment/api/aiOrderIntentApi.js"),
  ...page("components/DashboardComponents/CustomerKiguiComponents/ConfirmKigui", "ConsignmentOrderConfirm", "features/consignment/components/ConsignmentOrderConfirm"),
  ...page("components/DashboardComponents/CustomerKiguiComponents/ConsigmentListUI", "ConsignmentListDetailUI", "features/consignment/components/ConsignmentListDetailUI"),
  ...page("components/DashboardComponents/CustomerKiguiComponents/DestinationHandling", "DestinationHandlingChoice", "features/consignment/components/DestinationHandlingChoice"),
  ...page("components/DashboardComponents/CustomerKiguiComponents/PackageOptionalServices", "PackageOptionalServices", "features/consignment/components/PackageOptionalServices"),
  ...page("pages/DashboardPage/CreateCustomer/KiGuiHang", "ConsignmentOrder", "features/consignment/pages/ConsignmentOrder"),
  ...page("pages/DashboardPage/CreateCustomer/OrderXuLy", "ConsignmentList", "features/consignment/pages/ConsignmentList"),
  ...page("pages/DashboardPage/CreateCustomer/OrderXuLy/OrderXylyDetail", "ConsignmentListDetail", "features/consignment/pages/ConsignmentListDetail"),
  ...page("pages/DashboardPage/CreateCustomer/CheckHang", "ConsignmentListCheck", "features/consignment/pages/ConsignmentListCheck"),
  ...page("pages/DashboardPage/CreateCustomer/CheckHang/CheckHangDetail", "QuotationDetail", "features/consignment/pages/QuotationDetail"),

  /* ================= FEATURE: purchase (mua ho) ================= */
  pair("src/api/PurchaseAPI/purchaseRequestApi.js", "src/features/purchase/api/purchaseRequestApi.js"),
  ...page("components/DashboardComponents/CustomerBuyComponents/ConfirmBuy", "ConsignmentBuyOrderConfirm", "features/purchase/components/ConsignmentBuyOrderConfirm"),
  ...page("components/DashboardComponents/CustomerBuyComponents/PacketOption", "PackageOptionalServicesS1", "features/purchase/components/PackageOptionalServicesS1"),
  ...page("pages/DashboardPage/CreateCustomer/BuyOrder", "ConsignmentBuyOrder", "features/purchase/pages/ConsignmentBuyOrder"),
  ...page("pages/DashboardPage/CreateCustomer/BuyOrderXuLy", "PurchaseRequestPendingList", "features/purchase/pages/PurchaseRequestPendingList"),
  ...page("pages/DashboardPage/CreateCustomer/BuyOrderXuLy/BuyOrderXuLyDetail", "PurchaseRequestDetail", "features/purchase/pages/PurchaseRequestDetail"),
  ...page("pages/DashboardPage/CreateCustomer/CheckHangMuaHo", "BuyForMeQuotationList", "features/purchase/pages/BuyForMeQuotationList"),
  ...page("pages/DashboardPage/CreateCustomer/CheckHangMuaHo/BuyForMeQuotationListDetail", "BuyForMeQuotationListDetail", "features/purchase/pages/BuyForMeQuotationListDetail"),

  /* ================= FEATURE: warehouse ================= */
  pair("src/api/Warehouse/inventoryApi.js", "src/features/warehouse/api/inventoryApi.js"),
  pair("src/api/Warehouse/warehouseReleaseApi.js", "src/features/warehouse/api/warehouseReleaseApi.js"),
  pair("src/pages/DashboardPage/WarehouseTracking/warehouseTrackingData.js", "src/features/warehouse/constants/warehouseTrackingData.js"),
  pair("src/pages/DashboardPage/WarehouseTracking/WarehouseTracking.css", "src/features/warehouse/styles/WarehouseTracking.css"),
  pair("src/pages/DashboardPage/WarehouseTracking/Shared/WarehouseSharedComponents.jsx", "src/features/warehouse/components/shared/WarehouseSharedComponents.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/Shared/WarehouseSummaryCards.jsx", "src/features/warehouse/components/shared/WarehouseSummaryCards.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/Shared/WarehouseTabs.jsx", "src/features/warehouse/components/shared/WarehouseTabs.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/Shared/WarehouseShared.css", "src/features/warehouse/components/shared/WarehouseShared.css"),
  pair("src/pages/DashboardPage/WarehouseTracking/KiGui/KiGuiTrackingCard.jsx", "src/features/warehouse/components/KiGuiTracking/KiGuiTrackingCard.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/KiGui/KiGuiTrackingList.jsx", "src/features/warehouse/components/KiGuiTracking/KiGuiTrackingList.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/MuaHo/MuaHoTrackingCard.jsx", "src/features/warehouse/components/MuaHoTracking/MuaHoTrackingCard.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/MuaHo/MuaHoTrackingList.jsx", "src/features/warehouse/components/MuaHoTracking/MuaHoTrackingList.jsx"),
  ...page("pages/DashboardPage/WarehouseTracking/CheckinNhapKho", "CheckinNhapKho", "features/warehouse/pages/CheckinNhapKho"),
  ...page("pages/DashboardPage/WarehouseTracking/LuuKhoKienHang", "LuuKhoKienHang", "features/warehouse/pages/LuuKhoKienHang"),
  ...page("pages/DashboardPage/WarehouseTracking/XuatKhoKienHang", "XuatKhoKienHang", "features/warehouse/pages/XuatKhoKienHang"),
  ...page("pages/DashboardPage/WarehouseTracking/ThongQuanVn", "ThongQuanVn", "features/warehouse/pages/ThongQuanVn"),
  ...page("pages/DashboardPage/WarehouseTracking/PhieuNhapKho", "WarehouseReceiptPage", "features/warehouse/pages/WarehouseReceiptPage"),
  ...page("pages/DashboardPage/WarehouseTracking/WarehouseShipmentDetail", "WarehouseShipmentDetail", "features/warehouse/pages/WarehouseShipmentDetail"),
  ...page("pages/DashboardPage/WarehouseTracking/KiGuiDetail", "KiGuiDetail", "features/warehouse/pages/KiGuiDetail"),
  ...page("pages/DashboardPage/WarehouseTracking/MuaHoDetail", "MuaHoDetail", "features/warehouse/pages/MuaHoDetail"),
  pair("src/pages/DashboardPage/WarehouseTracking/GiaoHang/GiaoHangDetail.jsx", "src/features/warehouse/pages/GiaoHangDetail/GiaoHangDetail.jsx"),
  pair("src/pages/DashboardPage/WarehouseTracking/GiaoHang/GiaoHang.css", "src/features/warehouse/pages/GiaoHangDetail/GiaoHangDetail.css"),
  pair("src/pages/DashboardPage/WarehouseTracking/WarehouseTrackingPages.jsx", "src/features/warehouse/pages/index.js"),

  /* ================= FEATURE: delivery ================= */
  pair("src/api/OrderApi/deliveryTrackingApi.js", "src/features/delivery/api/deliveryTrackingApi.js"),
  pair("src/api/OrderApi/deliveryRequestApi.js", "src/features/delivery/api/deliveryRequestApi.js"),
  ...page("components/DashboardComponents/DeliveryTrackingCard", "DeliveryTrackingCard", "features/delivery/components/DeliveryTrackingCard"),

  /* ================= FEATURE: receiving ================= */
  pair("src/api/OrderApi/receivingNoteApi.js", "src/features/receiving/api/receivingNoteApi.js"),
  ...page("components/DashboardComponents/ReceivingNoteCard", "ReceivingNoteCard", "features/receiving/components/ReceivingNoteCard"),
  ...page("components/DashboardComponents/ReceivingNoteCard", "ReceivingNoteDocument", "features/receiving/components/ReceivingNoteDocument"),
  ...page("pages/DashboardPage/ReceiveGoods", "ReceiveGoods", "features/receiving/pages/ReceiveGoods"),

  /* ================= FEATURE: payment ================= */
  pair("src/api/PaymentApi/orderPaymentApi.js", "src/features/payment/api/orderPaymentApi.js"),
  pair(
    "src/components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/CancelPayments/QuotationCancelDialog.jsx",
    "src/features/payment/components/QuotationCancelDialog/QuotationCancelDialog.jsx"
  ),
  pair(
    "src/components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/ConfirmPayments/QuotationPaymentConfirmDialog.jsx",
    "src/features/payment/components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog.jsx"
  ),
  ...page("pages/DashboardPage/HistoryPage/LichSuKiGui/OrderPaymentHisstory", "OrderPaymentHistory", "features/payment/pages/OrderPaymentHistory"),
  ...page("pages/DashboardPage/HistoryPage/LichSuMuaHo/BuyPaymentHistoryDetail", "BuyOrderPaymentHistory", "features/payment/pages/BuyOrderPaymentHistory"),

  /* ================= FEATURE: history ================= */
  ...page("components/DashboardComponents/HistoryComponents/HistoryTransBuy", "BuyOrderHistoryContent", "features/history/components/BuyOrderHistoryContent"),
  ...page("components/DashboardComponents/HistoryComponents/HistoryTransOrder", "ConsignmentHistoryContent", "features/history/components/ConsignmentHistoryContent"),
  ...page("pages/DashboardPage/HistoryPage/LichSuKiGui", "ConsignmentHistoryList", "features/history/pages/ConsignmentHistoryList"),
  ...page("pages/DashboardPage/HistoryPage/LichSuMuaHo", "BuyOrderHistoryList", "features/history/pages/BuyOrderHistoryList"),
  ...page("pages/DashboardPage/HistoryPage/HistoryGiaoDich", "TransactionHistoryTabs", "features/history/pages/TransactionHistoryTabs"),

  /* ================= FEATURE: settlement ================= */
  pair("src/api/OrderApi/settlementApi.js", "src/features/settlement/api/settlementApi.js"),
  ...page("pages/DashboardPage/SettlementPage", "SettlementList", "features/settlement/pages/SettlementList"),

  /* ================= FEATURE: chat ================= */
  pair("src/api/Conversation/conversationApi.js", "src/features/chat/api/conversationApi.js"),
  ...page("pages/DashboardPage/Chat", "CustomerServiceChat", "features/chat/pages/CustomerServiceChat"),

  /* ================= FEATURE: notifications ================= */
  pair("src/api/Notification/notificationApi.js", "src/features/notifications/api/notificationApi.js"),

  /* ================= FEATURE: profile ================= */
  ...page("pages/SettingsPage", "ProfileConfig", "features/profile/pages/ProfileConfig"),
  pair("src/pages/SettingsPage/ProfileView.jsx", "src/features/profile/components/ProfileView/ProfileView.jsx"),
  pair("src/pages/SettingsPage/ProfileEdit.jsx", "src/features/profile/components/ProfileEdit/ProfileEdit.jsx"),

  /* ================= FEATURE: service-policy (in-app) ================= */
  ...page("pages/DashboardPage/ServicePoli", "ServicePolicy", "features/service-policy/pages/ServicePolicy"),
  pair(
    "src/pages/DashboardPage/ServicePoli/ServicePoliDetail/ServicePolicyDetail.jsx",
    "src/features/service-policy/components/ServicePolicyDetail/ServicePolicyDetail.jsx"
  ),
];

/* Files intentionally not carried over. */
const DROPPED = new Set([
  "src/routes/AppRouter.jsx",              // replaced by src/app/router/*
  "src/layouts/FooterLayout/Footer.jsx",   // empty file
  "src/api/inventoryApi.js",               // re-export shim
  "src/api/notificationApi.js",            // re-export shim
  "src/api/warehouseReleaseApi.js",        // re-export shim
]);

/* Images kept from src/assets (the rest is an unrelated saved-webpage dump). */
const ASSETS = [
  "ai.jpeg",
  "air.png!sw800",
  "airplan.png",
  "anhlogocap1.png",
  "anhlogocap2.jpeg",
  "hero.png",
  "react.svg",
  "vite.svg",
];

/* ------------------------------------------------------------------ *
 * Engine                                                              *
 * ------------------------------------------------------------------ */

const oldToNew = new Map(MAP);

// Sanity: every source exists, every destination unique.
const problems = [];
const seenDst = new Map();
for (const [o, n] of MAP) {
  if (!fs.existsSync(path.join(SRC_ROOT, o))) problems.push(`MISSING SOURCE: ${o}`);
  if (seenDst.has(n)) problems.push(`DUPLICATE DEST: ${n} (${o} & ${seenDst.get(n)})`);
  seenDst.set(n, o);
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

// Every source file must be either mapped or explicitly dropped.
const walk = (dir, acc = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};
const allSource = walk(path.join(SRC_ROOT, "src"))
  .map((p) => path.relative(SRC_ROOT, p))
  .filter((p) => /\.(jsx?|css)$/.test(p) && !p.startsWith("src/assets/"));

const unaccounted = allSource.filter((p) => !oldToNew.has(p) && !DROPPED.has(p));
if (unaccounted.length) {
  console.error("UNACCOUNTED SOURCE FILES:\n" + unaccounted.join("\n"));
  process.exit(1);
}

/* ---- import rewriting ---- */

const ALIASES = [
  ["src/app/", "@app/"],
  ["src/shared/", "@shared/"],
  ["src/features/", "@features/"],
  ["src/layouts/", "@layouts/"],
  ["src/assets/", "@assets/"],
];

const toAlias = (newPath) => {
  for (const [prefix, alias] of ALIASES) {
    if (newPath.startsWith(prefix)) return alias + newPath.slice(prefix.length);
  }
  return "@/" + newPath.slice("src/".length);
};

const stripExt = (p) => p.replace(/\.(jsx|js)$/, ""); // keep .css explicit

const CANDIDATE_SUFFIXES = ["", ".js", ".jsx", ".css", "/index.js", "/index.jsx"];

const resolveOld = (fromOld, spec) => {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromOld), spec)
  );
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = base + suffix;
    if (oldToNew.has(candidate)) return candidate;
    if (DROPPED.has(candidate)) return { dropped: candidate };
  }
  // asset?
  if (base.startsWith("src/assets/") && fs.existsSync(path.join(SRC_ROOT, base))) {
    return { asset: base };
  }
  return null;
};

// Manual fixes for specifiers that are broken in the original source.
const BROKEN_FIXES = {
  "src/pages/HomePage/data/homeData": "src/utils/data/homeData.js",
};

const SPEC_RE = /(from\s*|import\s*|import\s*\(\s*)(["'])(\.[^"']*)\2/g;

/** `@import "../Shared/x.css"` inside a .css file. */
const CSS_IMPORT_RE = /(@import\s+)(["'])(\.[^"']*)\2/g;

const unresolved = [];
let rewrittenCount = 0;

const rewriteCss = (oldPath, newPath, code) =>
  code.replace(CSS_IMPORT_RE, (match, head, quote, spec) => {
    const target = resolveOld(oldPath, spec);
    if (!target || target.dropped || target.asset) {
      unresolved.push(`${oldPath}  ->  ${spec}  (css @import)`);
      return match;
    }
    let rel = path.posix.relative(
      path.posix.dirname(newPath),
      oldToNew.get(target)
    );
    if (!rel.startsWith(".")) rel = "./" + rel;
    rewrittenCount += 1;
    return `${head}${quote}${rel}${quote}`;
  });

const rewrite = (oldPath, newPath, code) =>
  code.replace(SPEC_RE, (match, head, quote, spec) => {
    const normalized = path.posix.normalize(
      path.posix.join(path.posix.dirname(oldPath), spec)
    );
    const fixed = BROKEN_FIXES[normalized];
    const target = fixed && oldToNew.has(fixed) ? fixed : resolveOld(oldPath, spec);

    if (!target) {
      unresolved.push(`${oldPath}  ->  ${spec}`);
      return match;
    }
    if (target.dropped) {
      unresolved.push(`${oldPath}  ->  ${spec}  (points at dropped ${target.dropped})`);
      return match;
    }

    let out;
    if (target.asset) {
      out = "@assets/" + target.asset.slice("src/assets/".length);
    } else {
      const dst = oldToNew.get(target);
      const sameDir = path.posix.dirname(dst) === path.posix.dirname(newPath);
      out = sameDir
        ? "./" + stripExt(path.posix.basename(dst))
        : stripExt(toAlias(dst));
    }

    rewrittenCount += 1;
    return `${head}${quote}${out}${quote}`;
  });

/* ---- run ---- */

let copied = 0;
for (const [oldPath, newPath] of MAP) {
  const src = path.join(SRC_ROOT, oldPath);
  const dst = path.join(DST_ROOT, newPath);
  fs.mkdirSync(path.dirname(dst), { recursive: true });

  if (/\.(jsx?|css)$/.test(oldPath)) {
    const code = fs.readFileSync(src, "utf8");
    fs.writeFileSync(
      dst,
      /\.css$/.test(oldPath)
        ? rewriteCss(oldPath, newPath, code)
        : rewrite(oldPath, newPath, code)
    );
  } else {
    fs.copyFileSync(src, dst);
  }
  copied += 1;
}

fs.mkdirSync(path.join(DST_ROOT, "src/assets"), { recursive: true });
for (const name of ASSETS) {
  const from = path.join(SRC_ROOT, "src/assets", name);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DST_ROOT, "src/assets", name));
}
fs.mkdirSync(path.join(DST_ROOT, "public"), { recursive: true });
for (const name of fs.readdirSync(path.join(SRC_ROOT, "public"))) {
  fs.copyFileSync(
    path.join(SRC_ROOT, "public", name),
    path.join(DST_ROOT, "public", name)
  );
}

console.log(`copied files      : ${copied}`);
console.log(`rewritten imports : ${rewrittenCount}`);
console.log(`assets            : ${ASSETS.length}`);
if (unresolved.length) {
  console.log(`\nUNRESOLVED (${unresolved.length}):`);
  console.log([...new Set(unresolved)].join("\n"));
} else {
  console.log("\nall relative imports resolved.");
}
