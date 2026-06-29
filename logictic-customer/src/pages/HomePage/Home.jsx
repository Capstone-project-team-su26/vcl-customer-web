import React from "react";
import Header from "../../layouts/HeaderLayout/Headeer";
import HeroCarousel from "../../layouts/CarouselLayput/HeroCarousel";
import ServiceStrip from "./components/ServiceStrip";
import GlobalBrandSection from "./components/GlobalBrandSection";
import CommitmentsSection from "./components/CommitmentsSection";
import ServicesSection from "./components/ServicesSection";
import ProductsSection from "./components/ProductsSection";
import AIAutomationSection from "./components/AIAutomationSection";
import WhyChooseSection from "./components/WhyChooseSection";
import StatsSection from "./components/StatsSection";
import AudienceSection from "./components/AudienceSection";
import PartnersMarquee from "./components/PartnersMarquee";
import BlogSection from "./components/BlogSection";
import CTASection from "./components/CTASection";
import HomeFooter from "./components/HomeFooter";
import FloatingChat from "./components/FloatingChat";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-page-wrapper">
      <Header />
      <HeroCarousel />
      <ServiceStrip />
      <GlobalBrandSection />
      <CommitmentsSection />
      <ServicesSection />
      <ProductsSection />
      <AIAutomationSection />
      <WhyChooseSection />
      <StatsSection />
      <AudienceSection />
      <PartnersMarquee />
      <BlogSection />
      <CTASection />
      <HomeFooter />
      <FloatingChat />
    </div>
  );
}
