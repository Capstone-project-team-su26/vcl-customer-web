import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CustomerServiceOutlined,
} from "@ant-design/icons";

import brandLogo from "../../../assets/anhlogocap2.jpeg";
import { BRAND } from "../data/homeData";

import "./CTASection.css";

const CTA_BENEFITS = [
  "Báo giá minh bạch",
  "Tư vấn theo từng loại hàng",
  "Theo dõi đơn hàng trực tuyến",
];

export default function CTASection() {
  const navigate = useNavigate();

  const handleRequestQuote = () => {
    navigate("/bao-gia");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <section
      className="logistic-cta-section"
      aria-labelledby="logistic-cta-title"
    >
      <div
        className="logistic-cta-pattern"
        aria-hidden="true"
      />

      <div
        className="logistic-cta-circle logistic-cta-circle--one"
        aria-hidden="true"
      />

      <div
        className="logistic-cta-circle logistic-cta-circle--two"
        aria-hidden="true"
      />

      <div className="logistic-cta-container">
        <div className="logistic-cta-content">
          <button
            type="button"
            className="logistic-cta-logo"
            onClick={() => navigate("/")}
            aria-label={`Về trang chủ ${BRAND.fullName}`}
          >
            <span className="logistic-cta-logo-frame">
              <img
                src={brandLogo}
                alt={`Logo ${BRAND.fullName}`}
                draggable="false"
              />
            </span>
          </button>

          <span className="logistic-cta-eyebrow">
            <span className="logistic-cta-eyebrow-dot" />
            {BRAND.tagline}
          </span>

          <h2
            id="logistic-cta-title"
            className="logistic-cta-title"
          >
            Gửi ngay yêu cầu,
            <strong>{BRAND.name} sẽ đồng hành cùng bạn</strong>
          </h2>

          <p className="logistic-cta-description">
            Nhận tư vấn giải pháp mua hộ hoặc ký gửi phù hợp
            với từng loại hàng hóa, ngân sách và tiến độ vận
            chuyển của bạn.
          </p>

          <div className="logistic-cta-benefits">
            {CTA_BENEFITS.map((benefit) => (
              <span
                key={benefit}
                className="logistic-cta-benefit"
              >
                <CheckCircleFilled />
                {benefit}
              </span>
            ))}
          </div>

          <div className="logistic-cta-actions">
            <button
              type="button"
              className="logistic-cta-primary-button"
              onClick={handleRequestQuote}
            >
              <span>Đăng ký nhận báo giá</span>
              <ArrowRightOutlined />
            </button>

            <button
              type="button"
              className="logistic-cta-secondary-button"
              onClick={handleRegister}
            >
              <span>Đăng ký tài khoản hệ thống</span>
              <ArrowRightOutlined />
            </button>
          </div>

          <div className="logistic-cta-support">
            <span className="logistic-cta-support-icon">
              <CustomerServiceOutlined />
            </span>

            <span>
              <small>Hỗ trợ tư vấn</small>
              <strong>{BRAND.hotline}</strong>
            </span>
          </div>
        </div>

        <div
          className="logistic-cta-visual"
          aria-hidden="true"
        >
          <div className="logistic-cta-orbit logistic-cta-orbit--outer" />
          <div className="logistic-cta-orbit logistic-cta-orbit--inner" />

          <div className="logistic-cta-main-card">
            <span className="logistic-cta-main-card-icon">
              📦
            </span>

            <span className="logistic-cta-main-card-label">
              GIẢI PHÁP LOGISTICS
            </span>

            <strong>Mua hộ và ký gửi quốc tế</strong>

            <p>
              Quản lý đơn hàng, kiện hàng và hành trình vận
              chuyển trên cùng một hệ thống.
            </p>

            <div className="logistic-cta-main-card-status">
              <span />
              Hệ thống đang hoạt động
            </div>
          </div>

          <div className="logistic-cta-floating-card logistic-cta-floating-card--quote">
            <span>💰</span>

            <div>
              <strong>Báo giá rõ ràng</strong>
              <small>Không phát sinh phí ẩn</small>
            </div>
          </div>

          <div className="logistic-cta-floating-card logistic-cta-floating-card--tracking">
            <span>🌐</span>

            <div>
              <strong>Theo dõi 24/7</strong>
              <small>Cập nhật theo thời gian thực</small>
            </div>
          </div>

          <div className="logistic-cta-floating-card logistic-cta-floating-card--warehouse">
            <span>🏭</span>

            <div>
              <strong>Kho quốc tế</strong>
              <small>Tiếp nhận và gom kiện</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}