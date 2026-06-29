import React, { useState } from "react";
import { ArrowRightOutlined } from "@ant-design/icons";
import { BRAND, SERVICES } from "../data/homeData";

export default function ServicesSection() {
  const [activeTab, setActiveTab] = useState(0);
  const current = SERVICES[activeTab];

  return (
    <section className="home-section home-section--cream">
      <div className="home-section-inner">
        <span className="section-label">DỊCH VỤ</span>
        <h2 className="section-title">Dịch vụ của {BRAND.name}</h2>
        <div className="services-tabs">
          {SERVICES.map((svc, idx) => (
            <button
              key={svc.key}
              type="button"
              className={`services-tab ${activeTab === idx ? "active" : ""}`}
              onClick={() => setActiveTab(idx)}
            >
              {svc.tab}
            </button>
          ))}
        </div>
        <div className="service-showcase-card">
          <div>
            <div className="service-num">{current.num}</div>
            <h3>{current.title}</h3>
            <p className="service-desc">{current.desc}</p>
            <ul className="service-features">
              {current.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <span className="service-link">
              Xem chi tiết báo giá <ArrowRightOutlined />
            </span>
            <div className="service-countries">
              {current.countries.map((c) => (
                <span key={c} className="service-country-tag">{c}</span>
              ))}
            </div>
          </div>
          <div className="service-visual">
            <span style={{ fontSize: 80 }}>{current.emoji}</span>
            <span className="service-visual-label">{BRAND.name}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
