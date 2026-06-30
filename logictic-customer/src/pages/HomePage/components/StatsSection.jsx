import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import { BRAND, STATS } from "../data/homeData";
import "./StatsSection.css";

const STAT_ICONS = [
  <AppstoreOutlined />,
  <GlobalOutlined />,
  <TeamOutlined />,
  <EnvironmentOutlined />,
];

function parseStatValue(value = "0") {
  const normalizedValue = String(value);
  const numericValue = Number(
    normalizedValue.replace(/[^\d]/g, "")
  );

  const suffix = normalizedValue
    .replace(/[\d.,\s]/g, "")
    .trim();

  return {
    number: Number.isFinite(numericValue)
      ? numericValue
      : 0,
    suffix,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function AnimatedStatNumber({
  value,
  shouldAnimate,
  duration = 1300,
}) {
  const { number, suffix } = useMemo(
    () => parseStatValue(value),
    [value]
  );

  const [displayValue, setDisplayValue] = useState(
    shouldAnimate ? 0 : number
  );

  useEffect(() => {
    if (!shouldAnimate) {
      return undefined;
    }

    let animationFrameId;
    let startTime;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      );

      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(number * easedProgress)
      );

      if (progress < 1) {
        animationFrameId =
          window.requestAnimationFrame(animate);
      }
    };

    animationFrameId =
      window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [duration, number, shouldAnimate]);

  return (
    <>
      {formatNumber(displayValue)}
      {suffix}
    </>
  );
}

export default function StatsSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return undefined;
    }

    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window)
    ) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.22,
      }
    );

    observer.observe(sectionElement);

    return () => observer.disconnect();
  }, []);

  if (!Array.isArray(STATS) || STATS.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="statistics-section"
      aria-labelledby="statistics-section-title"
    >
      <div
        className="statistics-section__decoration statistics-section__decoration--one"
        aria-hidden="true"
      />

      <div
        className="statistics-section__decoration statistics-section__decoration--two"
        aria-hidden="true"
      />

      <div className="statistics-section__container">
        <header className="statistics-section__header">
          <span className="statistics-section__eyebrow">
            <span className="statistics-section__eyebrow-dot" />
            THÀNH TỰU NỔI BẬT
          </span>

          <h2
            id="statistics-section-title"
            className="statistics-section__title"
          >
            Những con số tạo nên
            <strong>hành trình của chúng tôi</strong>
          </h2>

          <p className="statistics-section__description">
            {BRAND.fullName} từng bước hoàn thiện hệ thống
            mua hộ, ký gửi và vận chuyển quốc tế nhằm mang
            lại trải nghiệm minh bạch, an toàn và thuận tiện
            cho khách hàng.
          </p>
        </header>

        <div className="statistics-section__grid">
          {STATS.map((stat, index) => (
            <article
              key={`${stat.label}-${index}`}
              className="statistics-section__card"
              style={{
                "--statistics-delay": `${index * 90}ms`,
              }}
            >
              <span className="statistics-section__card-index">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="statistics-section__icon">
                {STAT_ICONS[index] || <GlobalOutlined />}
              </div>

              <div
                className="statistics-section__number"
                aria-label={`${stat.num} ${stat.label}`}
              >
                <AnimatedStatNumber
                  value={stat.num}
                  shouldAnimate={isVisible}
                  duration={1300 + index * 120}
                />
              </div>

              <h3 className="statistics-section__card-title">
                {stat.label}
              </h3>

              <p className="statistics-section__card-description">
                {index === 0 &&
                  "Tập trung phát triển các giải pháp mua hộ và ký gửi chuyên sâu."}

                {index === 1 &&
                  "Mạng lưới tiếp nhận hàng tại nhiều thị trường quốc tế."}

                {index === 2 &&
                  "Được khách hàng cá nhân và doanh nghiệp tin tưởng sử dụng."}

                {index === 3 &&
                  "Kết nối các thị trường mua sắm và vận chuyển trọng điểm."}
              </p>

              <span className="statistics-section__card-line" />
            </article>
          ))}
        </div>

        <div className="statistics-section__bottom">
          <div className="statistics-section__bottom-icon">
            ✓
          </div>

          <div className="statistics-section__bottom-content">
            <strong>
              Không ngừng cải thiện chất lượng dịch vụ
            </strong>

            <p>
              Mỗi con số là một dấu mốc trong quá trình xây
              dựng hệ thống logistics xuyên biên giới minh
              bạch và đáng tin cậy.
            </p>
          </div>

          <div className="statistics-section__status">
            <span />
            Đang tiếp tục phát triển
          </div>
        </div>
      </div>
    </section>
  );
}