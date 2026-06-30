import React, {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ArrowUpOutlined } from "@ant-design/icons";

import Header from "../../layouts/HeaderLayout/Headeer";
import HeroCarousel from "../../layouts/CarouselLayput/HeroCarousel";

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

import { BRAND } from "./data/homeData";

import "./Home.css";

const PACKAGE_PARTICLES = Array.from({
  length: 18,
});

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const enteredFromIntro =
    location.state?.fromIntro === true;

  const [showScrollTop, setShowScrollTop] =
    useState(false);

  const [
    showPackageAnimation,
    setShowPackageAnimation,
  ] = useState(enteredFromIntro);

  const [homeIsRevealed, setHomeIsRevealed] =
    useState(!enteredFromIntro);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    if (!enteredFromIntro) {
      setHomeIsRevealed(true);
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    /*
      Sau khi nắp thùng mở,
      bắt đầu cho trang Home xuất hiện.
    */
    const revealHomeTimer = window.setTimeout(
      () => {
        setHomeIsRevealed(true);
      },
      1450
    );

    /*
      Kết thúc toàn bộ hiệu ứng mở thùng.
    */
    const removePackageTimer = window.setTimeout(
      () => {
        setShowPackageAnimation(false);

        document.body.style.overflow =
          previousOverflow;

        /*
          Xóa state fromIntro để reload hoặc quay lại
          Home không chạy hiệu ứng lần nữa.
        */
        navigate(location.pathname, {
          replace: true,
          state: {},
        });
      },
      3000
    );

    return () => {
      window.clearTimeout(revealHomeTimer);
      window.clearTimeout(removePackageTimer);

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    enteredFromIntro,
    location.pathname,
    navigate,
  ]);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`home-page-wrapper ${
        homeIsRevealed
          ? "home-page-wrapper--package-revealed"
          : "home-page-wrapper--package-hidden"
      }`}
    >
      {showPackageAnimation && (
        <div
          className="home-package-intro"
          role="status"
          aria-label="Đang mở kiện hàng"
        >
          <div
            className="home-package-intro__space"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>

          <div
            className="home-package-intro__particles"
            aria-hidden="true"
          >
            {PACKAGE_PARTICLES.map(
              (_, index) => (
                <i
                  key={index}
                  style={{
                    "--package-particle-angle": `${
                      index * 20
                    }deg`,
                    "--package-particle-delay": `${
                      (index % 6) * 0.05
                    }s`,
                    "--package-particle-distance": `${
                      100 + (index % 4) * 25
                    }px`,
                  }}
                />
              )
            )}
          </div>

          <div className="home-package-intro__stage">
            <div
              className="home-package-intro__floor"
              aria-hidden="true"
            />

            <div
              className="home-package-intro__shadow"
              aria-hidden="true"
            />

            <div className="home-package-intro__box">
              <div className="home-package-intro__light">
                <span />
              </div>

              <div className="home-package-intro__brand">
                <div className="home-package-intro__brand-mark">
                  VN
                </div>

                <div className="home-package-intro__brand-content">
                  <small>
                    KIỆN HÀNG ĐÃ VỀ ĐẾN
                  </small>

                  <strong>{BRAND.name}</strong>

                  <span>
                    Mua hộ · Ký gửi · Vận chuyển
                    quốc tế
                  </span>
                </div>
              </div>

              <div className="home-package-intro__box-body">
                <div className="home-package-intro__box-inside" />

                <div className="home-package-intro__flap home-package-intro__flap--back">
                  <span>GLOBAL</span>
                </div>

                <div className="home-package-intro__flap home-package-intro__flap--left" />

                <div className="home-package-intro__flap home-package-intro__flap--right" />

                <div className="home-package-intro__flap home-package-intro__flap--front">
                  <span>
                    FRAGILE
                  </span>
                </div>

                <div className="home-package-intro__box-front">
                  <span className="home-package-intro__tape" />

                  <div className="home-package-intro__shipping-label">
                    <small>DESTINATION</small>
                    <strong>VIỆT NAM</strong>
                    <span>
                      INTERNATIONAL LOGISTICS
                    </span>
                  </div>

                  <div className="home-package-intro__barcode">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="home-package-intro__box-left" />

                <div className="home-package-intro__box-right" />
              </div>
            </div>

            <div className="home-package-intro__status">
              <span className="home-package-intro__status-dot" />

              <div>
                <strong>Đang mở kiện hàng</strong>
                <small>
                  Chuẩn bị trải nghiệm dịch vụ
                  logistics
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      <Header />

      <main className="home-page-main">
        <HeroCarousel />
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