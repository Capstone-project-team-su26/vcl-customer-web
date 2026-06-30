import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckOutlined,
} from "@ant-design/icons";

import { BRAND, SERVICES } from "../data/homeData";
import "./ServicesSection.css";

export default function ServicesSection() {
  const navigate = useNavigate();

  const [activeServiceKey, setActiveServiceKey] = useState(
    SERVICES?.[0]?.key || ""
  );

  if (!Array.isArray(SERVICES) || SERVICES.length === 0) {
    return null;
  }

  const current =
    SERVICES.find(
      (service) => service.key === activeServiceKey
    ) || SERVICES[0];

  const handleViewService = () => {
    const serviceRoutes = {
      "mua-ho": "/dich-vu/mua-ho",
      "ky-gui": "/dich-vu/ky-gui",
    };

    navigate(
      serviceRoutes[current.key] || "/dich-vu"
    );
  };

  const getVisualTitle = () => {
    if (current.key === "mua-ho") {
      return "Mua hàng quốc tế dễ dàng";
    }

    if (current.key === "ky-gui") {
      return "Gom nhiều kiện hàng, tối ưu vận chuyển";
    }

    return current.title;
  };

  const getVisualDescription = () => {
    if (current.key === "mua-ho") {
      return `${BRAND.name} hỗ trợ tìm nguồn hàng, thanh toán và vận chuyển hàng hóa quốc tế an toàn về Việt Nam.`;
    }

    if (current.key === "ky-gui") {
      return `Gửi hàng về kho quốc tế, kiểm đếm, gom nhiều kiện thành một lô và theo dõi hành trình vận chuyển trực tuyến.`;
    }

    return current.desc;
  };

  return (
    <section
      className="services-section"
      aria-labelledby="services-section-title"
    >
      <div className="services-section__container">
        <header className="services-section__header">
          <span className="services-section__label">
            DỊCH VỤ CỐT LÕI
          </span>

          <h2
            id="services-section-title"
            className="services-section__title"
          >
            Dịch vụ của
            <strong>{BRAND.name}</strong>
          </h2>
        </header>

        <div
          className="services-section__tabs"
          role="tablist"
          aria-label="Chọn dịch vụ"
        >
          {SERVICES.map((service, index) => {
            const isActive =
              current.key === service.key;

            return (
              <button
                key={service.key}
                id={`service-tab-${service.key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`service-panel-${service.key}`}
                tabIndex={isActive ? 0 : -1}
                className={`services-section__tab ${
                  isActive ? "is-active" : ""
                }`}
                onClick={() =>
                  setActiveServiceKey(service.key)
                }
              >
                <span className="services-section__tab-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span>{service.tab}</span>
              </button>
            );
          })}
        </div>

        <div
          key={current.key}
          id={`service-panel-${current.key}`}
          className="services-section__content"
          role="tabpanel"
          aria-labelledby={`service-tab-${current.key}`}
        >
          <div className="services-section__information">
            <span className="services-section__number">
              {current.num}
            </span>

            <h3>{current.title}</h3>

            <p className="services-section__description">
              {current.desc}
            </p>

            <ul className="services-section__features">
              {current.features.map((feature) => (
                <li key={feature}>
                  <span aria-hidden="true">
                    <CheckOutlined />
                  </span>

                  <p>{feature}</p>
                </li>
              ))}
            </ul>

            <div
              className="services-section__countries"
              aria-label="Các thị trường hỗ trợ"
            >
              {current.countries.map((country) => (
                <span key={country}>
                  {country}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="services-section__button"
              onClick={handleViewService}
            >
              <span>
                {current.key === "mua-ho"
                  ? "Xem chi tiết mua hộ"
                  : "Xem chi tiết ký gửi"}
              </span>

              <ArrowRightOutlined />
            </button>
          </div>

          <div className="services-section__visual">
            <span
              className="services-section__emoji"
              aria-hidden="true"
            >
              {current.emoji}
            </span>

            <span className="services-section__visual-label">
              {BRAND.name}
            </span>

            <strong>{getVisualTitle()}</strong>

            <p>{getVisualDescription()}</p>
          </div>
        </div>
      </div>
    </section>
  );
}