import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";

import { BRAND, AUDIENCE } from "../data/homeData";
import "./AudienceSection.css";

export default function AudienceSection() {
  const navigate = useNavigate();

  return (
    <section
      className="audience-section"
      aria-labelledby="audience-section-title"
    >
      <div
        className="audience-decoration audience-decoration--one"
        aria-hidden="true"
      />

      <div
        className="audience-decoration audience-decoration--two"
        aria-hidden="true"
      />

      <div className="audience-container">
        {/* Header */}
        <div className="audience-header">
          <span className="audience-label">
            <span className="audience-label-dot" />
            ĐỐI TƯỢNG KHÁCH HÀNG
          </span>

          <h2
            id="audience-section-title"
            className="audience-title"
          >
            Dù bạn mua hộ hay ký gửi,
            <strong>
              {BRAND.fullName} đều có giải pháp phù hợp
            </strong>
          </h2>

          <p className="audience-description">
            Dịch vụ được thiết kế linh hoạt cho khách hàng cá
            nhân, chủ cửa hàng, hộ kinh doanh và doanh nghiệp
            có nhu cầu mua hàng hoặc vận chuyển quốc tế.
          </p>
        </div>

        {/* Danh sách đối tượng */}
        <div className="audience-grid">
          {AUDIENCE.map((audience, index) => (
            <article
              key={audience.title}
              className="audience-card"
            >
              <span className="audience-card-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="audience-icon">
                <span>{audience.icon}</span>
              </div>

              <h3>{audience.title}</h3>

              <p>
                Giải pháp mua hộ, ký gửi và vận chuyển được
                điều chỉnh phù hợp với nhu cầu sử dụng.
              </p>

              <span className="audience-card-line" />
            </article>
          ))}
        </div>

        {/* Banner CTA */}
        <div className="audience-solution-banner">
          <div className="audience-solution-pattern" />

          <div className="audience-solution-content">
            <span className="audience-solution-label">
              GIẢI PHÁP LOGISTICS TOÀN DIỆN
            </span>

            <h3>
              {BRAND.fullName} ở đây để
              <strong>xóa bỏ nỗi lo của bạn</strong>
            </h3>

            <div className="audience-solution-services">
              <span>
                <i>✓</i>
                Mua hộ quốc tế
              </span>

              <span>
                <i>✓</i>
                Ký gửi hàng hóa
              </span>

              <span>
                <i>✓</i>
                Theo dõi đơn hàng
              </span>
            </div>

            <p>
              Đồng hành từ khâu đặt hàng, tiếp nhận tại kho,
              gom kiện đến vận chuyển an toàn về Việt Nam.
            </p>

            <div className="audience-solution-actions">
              <button
                type="button"
                className="audience-primary-button"
                onClick={() => navigate("/register")}
              >
                <span>Đăng ký ngay</span>
                <ArrowRightOutlined />
              </button>

              <button
                type="button"
                className="audience-secondary-button"
                onClick={() => navigate("/dich-vu")}
              >
                Xem dịch vụ
              </button>
            </div>
          </div>

          <div
            className="audience-solution-visual"
            aria-hidden="true"
          >
            <div className="audience-solution-circle">
              <div className="audience-solution-circle-inner">
                <span className="audience-solution-logo">
                  VL
                </span>

                <span className="audience-solution-brand">
                  <strong>VIỆT NAM</strong>
                  <small>LOGICTIC</small>
                </span>
              </div>
            </div>

            <div className="audience-floating-card audience-floating-card--one">
              <span>📦</span>

              <div>
                <strong>Đơn hàng an toàn</strong>
                <small>Kiểm tra và theo dõi rõ ràng</small>
              </div>
            </div>

            <div className="audience-floating-card audience-floating-card--two">
              <span>🌏</span>

              <div>
                <strong>Kết nối quốc tế</strong>
                <small>Nhiều thị trường hàng đầu</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}