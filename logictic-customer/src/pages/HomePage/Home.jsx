import React, { useEffect, useState } from "react";
import { ArrowUpOutlined } from "@ant-design/icons";

import Header from "../../layouts/HeaderLayout/Headeer";
import HeroCarousel from "../../layouts/CarouselLayput/HeroCarousel";
// import ServiceStrip from "./components/ServiceStrip";
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="home-page-wrapper">
      <Header />

      <main className="home-page-main">
        <HeroCarousel />

        {/* <ServiceStrip /> */}

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
      </main>

      <HomeFooter />

      <button
        type="button"
        className={`home-scroll-top ${
          showScrollTop ? "is-visible" : ""
        }`}
        onClick={handleScrollToTop}
        aria-label="Chuyển lên đầu trang"
        title="Lên đầu trang"
      >
        <span
          className="home-scroll-top__ring"
          aria-hidden="true"
        />

        <ArrowUpOutlined />
      </button>

      <FloatingChat />
    </div>
  );
}