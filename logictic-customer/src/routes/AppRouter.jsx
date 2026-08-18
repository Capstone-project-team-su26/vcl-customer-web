import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/HomePage/Home";
import Login from "../pages/LoginPage/Login";
import Register from "../pages/RegisterPage/Register";
import VerifyOtp from "../pages/OTPPage/VerifyOtp";
import ForgotPassword from "../pages/ForgotPasswordPage/ForgotPassword";
import OTPForgot from "../pages/OTPForgotPage/OTPForgot";
import NotFound from "../pages/NotFound";
import LogisticsIntro from "../pages/Logistic/LogisticsIntro";

//Trang chủ chứa các dịch vụ

//Dịch vụ KiGui và Mua hộ
import ConsignmentService from "../pages/HomePage/DichVu/KiGui/ConsignmentService";
import BuyForMeService from "../pages/HomePage/DichVu/MuaHo/BuyForMeService";

//Bang giá
import BuyForMePricing from "../pages/HomePage/BangGia/BangGiaMuaHo/BuyForMePricing";
import ConsignmentPricing from "../pages/HomePage/BangGia/BangGiaKiGui/ConsignmentPricing";
import PricingCalculator from "../pages/HomePage/BangGia/CongThucGia/PricingCalculator";
import ServiceFeesPricing from "../pages/HomePage/BangGia/PhDichVu/ServiceFeesPricing";
import InternationalShippingPricing from "../pages/HomePage/BangGia/PhiVanChuyen/InternationalShippingPricing";

// chính sách
import GeneralRulesPolicy from "../pages/HomePage/ChinhSach/QuyDinhChung/GeneralRulesPolicy";
import ShippingPolicy from "../pages/HomePage/ChinhSach/VanChuyen/ShippingPolicy";
import PaymentPolicy from "../pages/HomePage/ChinhSach/ThanhToan/PaymentPolicy";
import CancellationRefundPolicy from "../pages/HomePage/ChinhSach/HuyDonVaHoanTien/CancellationRefundPolicy";
import CargoInsurancePolicy from "../pages/HomePage/ChinhSach/BaoHiemHang/CargoInsurancePolicy";
import LiabilityDisclaimerPolicy from "../pages/HomePage/ChinhSach/MienTruTrachNhiem/LiabilityDisclaimerPolicy";
import PrivacyPolicy from "../pages/HomePage/ChinhSach/BaoMat/PrivacyPolicy";
import OrderingPolicy from "../pages/HomePage/ChinhSach/DatHang/OrderingPolicy";

//Hướng dân 
import BuyForMeGuide from "../pages/HomePage/HuongDan/HDMuaHo/BuyForMeGuide";
import ConsignmentGuide from "../pages/HomePage/HuongDan/HDKiGui/ConsignmentGuide";
import CreateOrderGuide from "../pages/HomePage/HuongDan/TaoDonHang/CreateOrderGuide";
import PaymentGuide from "../pages/HomePage/HuongDan/HDThanhToan/PaymentGuide";
import OrderTrackingGuide from "../pages/HomePage/HuongDan/HDCheckDon/OrderTrackingGuide";
import ComplaintGuide from "../pages/HomePage/HuongDan/ReportOrder/ComplaintGuide";

//Blog
import LogisticsNewsBlog from "../pages/HomePage/BlogPage/News/LogisticsNewsBlog";
import InternationalShoppingExperienceBlog from "../pages/HomePage/BlogPage/KinhNghiemOrder/InternationalShoppingExperienceBlog";
import ImportGuideBlog from "../pages/HomePage/BlogPage/NhapHang/ImportGuideBlog";
import ShippingKnowledgeBlog from "../pages/HomePage/BlogPage/KienThucVanChuyen/ShippingKnowledgeBlog";
import OffersAnnouncementsBlog from "../pages/HomePage/BlogPage/UuDaiVaThongBao/OffersAnnouncementsBlog";

//Liên hệ & báo giá, về chúng tôi, tra cứu
import ContactUs from "../pages/HomePage/LienHe/Contact";
import QuotationPage from "../pages/HomePage/BaoGia/QuotationPage";
import AboutUs from "../pages/HomePage/VeChungToi/AboutUs";
import OrderLookup from "../pages/HomePage/TraCuu/OrderLookup";

//Layput chính sau khi dăng nhập
import MainLayout from "../layouts/MainLayout"; // Bạn nhớ chỉnh lại đường dẫn file cho đúng cấu trúc folder của bạn nhé
import Dashboard from "../pages/DashboardPage/DashboardCusstomer/Dashboard";
import CreateOrder from "../pages/DashboardPage/CreateCustomer/CreateOrder";
import ConsigmentOrder from "../pages/DashboardPage/CreateCustomer/KiGuiHang/ConsignmentOrder";
import ConsignmentList from "../pages/DashboardPage/CreateCustomer/OrderXuLy/ConsignmentList"; // Import
import ProfileConfig from "../pages/SettingsPage/ProfileConfig";
import ConsignmentListDetail from "../pages/DashboardPage/CreateCustomer/OrderXuLy/OrderXylyDetail/ConsignmentListDetail"; // Import
import ServicePolicy from "../pages/DashboardPage/ServicePoli/ServicePolicy";
import ConsignmentListCheck from "../pages/DashboardPage/CreateCustomer/CheckHang/ConsignmentListCheck"; // Import
import QuotationDetail from "../pages/DashboardPage/CreateCustomer/CheckHang/CheckHangDetail/QuotationDetail"; // Import
import ConsignmentBuyOrder from "../pages/DashboardPage/CreateCustomer/BuyOrder/ConsignmentBuyOrder"; // Import
import PurchaseRequestPendingList from "../pages/DashboardPage/CreateCustomer/BuyOrderXuLy/PurchaseRequestPendingList"; // Import
import PurchaseRequestDetail from "../pages/DashboardPage/CreateCustomer/BuyOrderXuLy/BuyOrderXuLyDetail/PurchaseRequestDetail"; // Import
import CustomerServiceChat from "../pages/DashboardPage/Chat/CustomerServiceChat"; // Import
import BuyForMeQuotationList from "../pages/DashboardPage/CreateCustomer/CheckHangMuaHo/BuyForMeQuotationList"
import BuyForMeQuotationListDetail from "../pages/DashboardPage/CreateCustomer/CheckHangMuaHo/BuyForMeQuotationListDetail/BuyForMeQuotationListDetail"
import ConsignmentHistoryList from "../pages/DashboardPage/HistoryPage/LichSuKiGui/ConsignmentHistoryList"
import BuyOrderHistoryList from "../pages/DashboardPage/HistoryPage/LichSuMuaHo/BuyOrderHistoryList"
import BuyOrderPaymentHistory from "../pages/DashboardPage/HistoryPage/LichSuMuaHo/BuyPaymentHistoryDetail/BuyOrderPaymentHistory"
import OrderPaymentHistory from "../pages/DashboardPage/HistoryPage/LichSuKiGui/OrderPaymentHisstory/OrderPaymentHistory"
import SettlementList from "../pages/DashboardPage/SettlementPage/SettlementList"
import TransactionHistoryTabs from "../pages/DashboardPage/HistoryPage/HistoryGiaoDich/TransactionHistoryTabs"
import { CheckinNhapKho } from "../pages/DashboardPage/WarehouseTracking/CheckinNhapKho/CheckinNhapKho";
import { LuuKhoKienHang } from "../pages/DashboardPage/WarehouseTracking/LuuKhoKienHang/LuuKhoKienHang";
import { XuatKhoKienHang } from "../pages/DashboardPage/WarehouseTracking/XuatKhoKienHang/XuatKhoKienHang";
import { ThongQuanVn } from "../pages/DashboardPage/WarehouseTracking/ThongQuanVn/ThongQuanVn";
import { WarehouseShipmentDetail } from "../pages/DashboardPage/WarehouseTracking/WarehouseShipmentDetail/WarehouseShipmentDetail";
import { WarehouseReceiptPage } from "../pages/DashboardPage/WarehouseTracking/PhieuNhapKho/WarehouseReceiptPage";
import { KiGuiDetail } from "../pages/DashboardPage/WarehouseTracking/KiGuiDetail/KiGuiDetail";
import { MuaHoDetail } from "../pages/DashboardPage/WarehouseTracking/MuaHoDetail/MuaHoDetail";
import { GiaoHangDetail } from "../pages/DashboardPage/WarehouseTracking/GiaoHang/GiaoHangDetail";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= CÁC ROUTE CƠ BẢN (KHÔNG DÙNG SIDEBAR) ================= */}
        <Route path="/" element={<LogisticsIntro />} />

        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-forgot" element={<OTPForgot />} />
        <Route path="/consignment-service" element={<ConsignmentService />} />
        <Route path="/buy-for-me-service" element={<BuyForMeService />} />
        <Route path="/buy-for-me-pricing" element={<BuyForMePricing />} />
        <Route path="/consignment-pricing" element={<ConsignmentPricing />} />
        <Route path="/pricing-calculator" element={<PricingCalculator />} />
        <Route path="/service-fees-pricing" element={<ServiceFeesPricing />} />
        <Route
          path="/international-shipping-pricing"
          element={<InternationalShippingPricing />}
        />
        <Route path="/general-rules-policy" element={<GeneralRulesPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
        <Route path="/payment-policy" element={<PaymentPolicy />} />
        <Route
          path="/cancellation-refund-policy"
          element={<CancellationRefundPolicy />}
        />
        <Route
          path="/cargo-insurance-policy"
          element={<CargoInsurancePolicy />}
        />
        <Route
          path="/liability-disclaimer-policy"
          element={<LiabilityDisclaimerPolicy />}
        />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/ordering-policy" element={<OrderingPolicy />} />

        <Route path="/buy-for-me-guide" element={<BuyForMeGuide />} />
        <Route path="/consignment-guide" element={<ConsignmentGuide />} />
        <Route path="/create-order-guide" element={<CreateOrderGuide />} />
        <Route path="/payment-guide" element={<PaymentGuide />} />
        <Route path="/order-tracking-guide" element={<OrderTrackingGuide />} />
        <Route path="/complaint-guide" element={<ComplaintGuide />} />

        <Route path="/logistics-news-blog" element={<LogisticsNewsBlog />} />
        <Route
          path="/international-shopping-experience-blog"
          element={<InternationalShoppingExperienceBlog />}
        />
        <Route path="/import-guide-blog" element={<ImportGuideBlog />} />
        <Route
          path="/shipping-knowledge-blog"
          element={<ShippingKnowledgeBlog />}
        />
        <Route
          path="/offers-announcements-blog"
          element={<OffersAnnouncementsBlog />}
        />

        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/quotation-page" element={<QuotationPage />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/order-lookup" element={<OrderLookup />} />

        {/* ================= CÁC ROUTE KHÁCH HÀNG (SỬ DỤNG CHUNG SIDEBAR LAYOUT) ================= */}

        <Route element={<MainLayout />}>
          {/* Định nghĩa các URL con tương ứng với thẻ <NavLink to="..." /> ở Sidebar */}
          <Route path="/customer/dashboard" element={<Dashboard />} />

          <Route path="/create-order" element={<CreateOrder />} />
          <Route
            path="/create-order/consignment"
            element={<ConsigmentOrder />}
          />

          <Route path="/processing-orders" element={<ConsignmentList />} />
          <Route path="/settings/profile-config" element={<ProfileConfig />} />
          <Route
            path="/consignments/:orderId"
            element={<ConsignmentListDetail />}
          />
          <Route
            path="/settings/chinh-sach-dich-vu"
            element={<ServicePolicy />}
          />
          <Route path="/check-orders" element={<ConsignmentListCheck />} />
          <Route path="/quotations/:orderId" element={<QuotationDetail />} />
          <Route
            path="/create-order/buy-orders"
            element={<ConsignmentBuyOrder />}

          />
          <Route
            path="/processing-orders/purchase-requests"
            element={<PurchaseRequestPendingList />} />

          <Route
            path="/processing-orders/purchase-requests/:requestId"
            element={<PurchaseRequestDetail />}
          />
          <Route path="/customer-service-chat" element={<CustomerServiceChat />} />
          <Route
            path="/check-orders/buy-on-behalf"
            element={<BuyForMeQuotationList />}
          />
          <Route
            path="/check-orders/buy-on-behalf/:requestId"
            element={<BuyForMeQuotationListDetail />}
          />
          <Route
            path="/history/consignment"
            element={<ConsignmentHistoryList />}
          />
          <Route
            path="/history/buy-on-behalf"
            element={<BuyOrderHistoryList />}
          />
          <Route
            path="/history/buy-order"
            element={<BuyOrderHistoryList />}
          />
          {/* Mục "Thanh toán vận chuyển" trên menu trỏ vào đây. */}
          <Route
            path="/payment"
            element={<SettlementList />}
          />
          <Route
            path="/orders/:orderId/payments/history"
            element={<OrderPaymentHistory />}
          />
          <Route
            path="/history/buy-on-behalf/:requestId/payments"
            element={<BuyOrderPaymentHistory />}
          />
          <Route
            path="/history/buy-order/:requestId/payments"
            element={<BuyOrderPaymentHistory />}
          />
          <Route
            path="/purchase-requests/:requestId/payments/history"
            element={<BuyOrderPaymentHistory />}
          />
          <Route
            path="/purchase-requests/:requestId/payments"
            element={<BuyOrderPaymentHistory />}
          />
          <Route
            path="/transaction-history"
            element={<TransactionHistoryTabs />}
          />
          <Route
            path="/warehouse/checkin"
            element={<CheckinNhapKho />}
          />
          <Route
            path="/warehouse/inventory"
            element={<CheckinNhapKho />}
          />
          <Route
            path="/warehouse/inventory/:shipmentId"
            element={<WarehouseShipmentDetail />}
          />
          <Route
            path="/warehouse/consignment-detail/:id"
            element={<KiGuiDetail />}
          />
          <Route
            path="/warehouse/purchase-detail/:id"
            element={<MuaHoDetail />}
          />
          <Route
            path="/warehouse/storage"
            element={<LuuKhoKienHang />}
          />
          <Route
            path="/warehouse/export"
            element={<XuatKhoKienHang />}
          />
          <Route
            path="/warehouse/customs"
            element={<ThongQuanVn />}
          />
          <Route
            path="/warehouse/receipts"
            element={<WarehouseReceiptPage />}
          />
          <Route
            path="/warehouse/receipts/:receiptId"
            element={<WarehouseReceiptPage />}
          />
          <Route
            path="/warehouse/delivery/:orderId"
            element={<GiaoHangDetail />}
          />



        </Route>

        {/* ================= ROUTE 404 ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
