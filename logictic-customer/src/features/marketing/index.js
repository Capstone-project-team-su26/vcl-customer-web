// Marketing sở hữu toàn bộ mặt tiền công khai của website: các trang giới thiệu,
// báo giá, liên hệ và những khối nội dung dựng nên trang chủ.
// Gom về một đầu mối để router và các feature khác không phải trỏ sâu vào cấu trúc bên trong.

// Các trang gắn trực tiếp vào route công khai.
export { default as AboutUs } from "./pages/AboutUs/AboutUs";
export { default as Contact } from "./pages/Contact/Contact";
export { default as Home } from "./pages/Home/Home";
export { default as LogisticsIntro } from "./pages/LogisticsIntro/LogisticsIntro";
export { default as QuotationPage } from "./pages/QuotationPage/QuotationPage";

// Các khối nội dung dùng để lắp ráp trang chủ, tách riêng nên vẫn có thể tái sử dụng ở trang khác.
export { default as AIAutomationSection } from "./components/AIAutomationSection/AIAutomationSection";
export { default as AudienceSection } from "./components/AudienceSection/AudienceSection";
export { default as BlogSection } from "./components/BlogSection/BlogSection";
export { default as CTASection } from "./components/CTASection/CTASection";
export { default as CommitmentsSection } from "./components/CommitmentsSection/CommitmentsSection";
export { default as FloatingChat } from "./components/FloatingChat/FloatingChat";
export { default as GlobalBrandSection } from "./components/GlobalBrandSection/GlobalBrandSection";
export { default as PartnersMarquee } from "./components/PartnersMarquee/PartnersMarquee";
export { default as ProductsSection } from "./components/ProductsSection/ProductsSection";
export { default as ServiceStrip } from "./components/ServiceStrip/ServiceStrip";
export { default as ServicesSection } from "./components/ServicesSection/ServicesSection";
export { default as StatsSection } from "./components/StatsSection/StatsSection";
export { default as WhyChooseSection } from "./components/WhyChooseSection/WhyChooseSection";
