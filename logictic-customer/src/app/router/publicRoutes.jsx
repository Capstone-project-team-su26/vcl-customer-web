/**
 * Các trang công khai — không cần đăng nhập, không dùng sidebar.
 *
 * Thứ tự import ở đây giữ nguyên thứ tự của bản gốc: nhiều file CSS trang
 * khai báo selector toàn cục (:root, body, *), nên thứ tự nạp quyết định
 * selector nào thắng. Đổi thứ tự = đổi giao diện.
 */
import { Route } from "react-router-dom";

import { PUBLIC_ROUTES as P } from "./paths";

/* Trang cơ bản */
import Home from "@features/marketing/pages/Home/Home";
import Login from "@features/auth/pages/Login/Login";
import Register from "@features/auth/pages/Register/Register";
import VerifyOtp from "@features/auth/pages/VerifyOtp/VerifyOtp";
import ForgotPassword from "@features/auth/pages/ForgotPassword/ForgotPassword";
import OTPForgot from "@features/auth/pages/OTPForgot/OTPForgot";
import LogisticsIntro from "@features/marketing/pages/LogisticsIntro/LogisticsIntro";

/* Dịch vụ ký gửi & mua hộ */
import ConsignmentService from "@features/services/pages/ConsignmentService/ConsignmentService";
import BuyForMeService from "@features/services/pages/BuyForMeService/BuyForMeService";

/* Bảng giá */
import BuyForMePricing from "@features/pricing/pages/BuyForMePricing/BuyForMePricing";
import ConsignmentPricing from "@features/pricing/pages/ConsignmentPricing/ConsignmentPricing";
import PricingCalculator from "@features/pricing/pages/PricingCalculator/PricingCalculator";
import ServiceFeesPricing from "@features/pricing/pages/ServiceFeesPricing/ServiceFeesPricing";
import InternationalShippingPricing from "@features/pricing/pages/InternationalShippingPricing/InternationalShippingPricing";

/* Chính sách */
import GeneralRulesPolicy from "@features/policies/pages/GeneralRulesPolicy/GeneralRulesPolicy";
import ShippingPolicy from "@features/policies/pages/ShippingPolicy/ShippingPolicy";
import PaymentPolicy from "@features/policies/pages/PaymentPolicy/PaymentPolicy";
import CancellationRefundPolicy from "@features/policies/pages/CancellationRefundPolicy/CancellationRefundPolicy";
import CargoInsurancePolicy from "@features/policies/pages/CargoInsurancePolicy/CargoInsurancePolicy";
import LiabilityDisclaimerPolicy from "@features/policies/pages/LiabilityDisclaimerPolicy/LiabilityDisclaimerPolicy";
import PrivacyPolicy from "@features/policies/pages/PrivacyPolicy/PrivacyPolicy";
import OrderingPolicy from "@features/policies/pages/OrderingPolicy/OrderingPolicy";

/* Hướng dẫn */
import BuyForMeGuide from "@features/guides/pages/BuyForMeGuide/BuyForMeGuide";
import ConsignmentGuide from "@features/guides/pages/ConsignmentGuide/ConsignmentGuide";
import CreateOrderGuide from "@features/guides/pages/CreateOrderGuide/CreateOrderGuide";
import PaymentGuide from "@features/guides/pages/PaymentGuide/PaymentGuide";
import OrderTrackingGuide from "@features/guides/pages/OrderTrackingGuide/OrderTrackingGuide";
import ComplaintGuide from "@features/guides/pages/ComplaintGuide/ComplaintGuide";

/* Blog */
import LogisticsNewsBlog from "@features/blog/pages/LogisticsNewsBlog/LogisticsNewsBlog";
import InternationalShoppingExperienceBlog from "@features/blog/pages/InternationalShoppingExperienceBlog/InternationalShoppingExperienceBlog";
import ImportGuideBlog from "@features/blog/pages/ImportGuideBlog/ImportGuideBlog";
import ShippingKnowledgeBlog from "@features/blog/pages/ShippingKnowledgeBlog/ShippingKnowledgeBlog";
import OffersAnnouncementsBlog from "@features/blog/pages/OffersAnnouncementsBlog/OffersAnnouncementsBlog";

/* Liên hệ, báo giá, về chúng tôi, tra cứu */
import ContactUs from "@features/marketing/pages/Contact/Contact";
import QuotationPage from "@features/marketing/pages/QuotationPage/QuotationPage";
import AboutUs from "@features/marketing/pages/AboutUs/AboutUs";
import OrderLookup from "@features/tracking/pages/OrderLookup/OrderLookup";

export const publicRoutes = (
  <>
    <Route path={P.landing} element={<LogisticsIntro />} />
    <Route path={P.home} element={<Home />} />

    <Route path={P.login} element={<Login />} />
    <Route path={P.register} element={<Register />} />
    <Route path={P.verifyOtp} element={<VerifyOtp />} />
    <Route path={P.forgotPassword} element={<ForgotPassword />} />
    <Route path={P.otpForgot} element={<OTPForgot />} />

    <Route path={P.consignmentService} element={<ConsignmentService />} />
    <Route path={P.buyForMeService} element={<BuyForMeService />} />

    <Route path={P.buyForMePricing} element={<BuyForMePricing />} />
    <Route path={P.consignmentPricing} element={<ConsignmentPricing />} />
    <Route path={P.pricingCalculator} element={<PricingCalculator />} />
    <Route path={P.serviceFeesPricing} element={<ServiceFeesPricing />} />
    <Route
      path={P.internationalShippingPricing}
      element={<InternationalShippingPricing />}
    />

    <Route path={P.generalRulesPolicy} element={<GeneralRulesPolicy />} />
    <Route path={P.shippingPolicy} element={<ShippingPolicy />} />
    <Route path={P.paymentPolicy} element={<PaymentPolicy />} />
    <Route
      path={P.cancellationRefundPolicy}
      element={<CancellationRefundPolicy />}
    />
    <Route path={P.cargoInsurancePolicy} element={<CargoInsurancePolicy />} />
    <Route
      path={P.liabilityDisclaimerPolicy}
      element={<LiabilityDisclaimerPolicy />}
    />
    <Route path={P.privacyPolicy} element={<PrivacyPolicy />} />
    <Route path={P.orderingPolicy} element={<OrderingPolicy />} />

    <Route path={P.buyForMeGuide} element={<BuyForMeGuide />} />
    <Route path={P.consignmentGuide} element={<ConsignmentGuide />} />
    <Route path={P.createOrderGuide} element={<CreateOrderGuide />} />
    <Route path={P.paymentGuide} element={<PaymentGuide />} />
    <Route path={P.orderTrackingGuide} element={<OrderTrackingGuide />} />
    <Route path={P.complaintGuide} element={<ComplaintGuide />} />

    <Route path={P.logisticsNewsBlog} element={<LogisticsNewsBlog />} />
    <Route
      path={P.internationalShoppingExperienceBlog}
      element={<InternationalShoppingExperienceBlog />}
    />
    <Route path={P.importGuideBlog} element={<ImportGuideBlog />} />
    <Route path={P.shippingKnowledgeBlog} element={<ShippingKnowledgeBlog />} />
    <Route
      path={P.offersAnnouncementsBlog}
      element={<OffersAnnouncementsBlog />}
    />

    <Route path={P.contactUs} element={<ContactUs />} />
    <Route path={P.quotationPage} element={<QuotationPage />} />
    <Route path={P.aboutUs} element={<AboutUs />} />
    <Route path={P.orderLookup} element={<OrderLookup />} />
  </>
);

export default publicRoutes;
