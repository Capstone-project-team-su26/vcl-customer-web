import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";
import aiImg from "../../../assets/ai.jpeg";
import { BRAND, AI_FEATURES } from "../data/homeData";

export default function AIAutomationSection() {
  const navigate = useNavigate();

  return (
    <section className="home-section home-section--dark">
      <div className="home-section-inner">
        <div className="ai-grid">
          <div>
            <span className="section-label">CÔNG NGHỆ</span>
            <h2 className="section-title">HỆ THỐNG QUẢN LÝ {BRAND.name}</h2>
            <div className="ai-badges">
              {["Mua hộ", "Ký gửi", "Theo dõi realtime", "Báo giá minh bạch"].map((b) => (
                <span key={b} className="ai-badge">{b}</span>
              ))}
            </div>
            <button
              type="button"
              className="register-cta-btn"
              onClick={() => navigate("/register")}
            >
              Đăng ký ngay <ArrowRightOutlined />
            </button>
            <div className="ai-features-grid">
              {AI_FEATURES.map((f) => (
                <div key={f.title} className="ai-feature-card">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="ai-visual">
            <img src={aiImg} alt={`Hệ thống quản lý ${BRAND.name}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
