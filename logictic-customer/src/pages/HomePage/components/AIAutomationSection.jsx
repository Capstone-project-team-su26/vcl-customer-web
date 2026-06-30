import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";

import aiImg from "../../../assets/ai.jpeg";
import { BRAND, AI_FEATURES } from "../data/homeData";

import "./AIAutomationSection.css";

const SERVICE_BADGES = [
  "Mua hộ quốc tế",
  "Ký gửi hàng hóa",
  "Theo dõi thời gian thực",
  "Báo giá minh bạch",
];

export default function AIAutomationSection() {
  const navigate = useNavigate();

  return (
    <section
      className="ai-automation-section"
      aria-labelledby="ai-automation-title"
    >
      <div
        className="ai-automation-decoration ai-automation-decoration--one"
        aria-hidden="true"
      />

      <div
        className="ai-automation-decoration ai-automation-decoration--two"
        aria-hidden="true"
      />

      <div className="ai-automation-container">
        <div className="ai-automation-grid">
          {/* Nội dung bên trái */}
          <div className="ai-automation-content">
            <span className="ai-automation-label">
              <span className="ai-automation-label-dot" />
              CÔNG NGHỆ LOGISTICS
            </span>

            <h2
              id="ai-automation-title"
              className="ai-automation-title"
            >
              Hệ thống quản lý
              <strong>{BRAND.name}</strong>
            </h2>

            <p className="ai-automation-description">
              Quản lý toàn bộ quá trình mua hộ, ký gửi,
              vận chuyển và theo dõi đơn hàng trên một nền
              tảng duy nhất. Dữ liệu được cập nhật liên tục,
              rõ ràng và dễ sử dụng.
            </p>

            <div
              className="ai-automation-badges"
              aria-label="Các dịch vụ nổi bật"
            >
              {SERVICE_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="ai-automation-badge"
                >
                  <span className="ai-automation-badge-icon">
                    ✓
                  </span>

                  {badge}
                </span>
              ))}
            </div>

            <div className="ai-automation-actions">
              <button
                type="button"
                className="ai-automation-primary-button"
                onClick={() => navigate("/register")}
              >
                <span>Đăng ký tài khoản</span>
                <ArrowRightOutlined />
              </button>

              <button
                type="button"
                className="ai-automation-secondary-button"
                onClick={() => navigate("/tracking")}
              >
                Theo dõi đơn hàng
              </button>
            </div>

            <div className="ai-automation-features">
              {AI_FEATURES.map((feature, index) => (
                <article
                  key={`${feature.title}-${index}`}
                  className="ai-automation-feature-card"
                >
                  <span className="ai-automation-feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="ai-automation-feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Hình ảnh bên phải */}
          <div className="ai-automation-visual">
            <div
              className="ai-automation-ring ai-automation-ring--outer"
              aria-hidden="true"
            />

            <div
              className="ai-automation-ring ai-automation-ring--inner"
              aria-hidden="true"
            />

            <div className="ai-automation-image-card">
              <img
                src={aiImg}
                alt={`Hệ thống quản lý logistics ${BRAND.name}`}
                className="ai-automation-image"
                loading="lazy"
              />

              <div
                className="ai-automation-image-overlay"
                aria-hidden="true"
              />

              <div className="ai-automation-image-brand">
                <span className="ai-automation-image-logo">
                  VL
                </span>

                <span>
                  <strong>VIỆT NAM</strong>
                  <small>LOGISTIC</small>
                </span>
              </div>

              <div className="ai-automation-image-status">
                <span className="ai-automation-status-dot" />

                <span>
                  <strong>Hệ thống đang hoạt động</strong>
                  <small>Cập nhật dữ liệu theo thời gian thực</small>
                </span>
              </div>
            </div>

            <div className="ai-automation-floating-card ai-automation-floating-card--orders">
              <span className="ai-automation-floating-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>

              <span>
                <strong>2.4M+</strong>
                <small>Đơn hàng đã quản lý</small>
              </span>
            </div>

            <div className="ai-automation-floating-card ai-automation-floating-card--tracking">
              <span className="ai-automation-floating-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 6v6l4 2" />
                  <path d="M16 2h6v6" />
                  <path d="m22 2-6 6" />
                </svg>
              </span>

              <span>
                <strong>24/7</strong>
                <small>Theo dõi hành trình</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}