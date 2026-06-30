import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import { BRAND, WHY_CHOOSE } from "../data/homeData";
import "./WhyChooseSection.css";

export default function WhyChooseSection() {
  const navigate = useNavigate();

  if (
    !Array.isArray(WHY_CHOOSE) ||
    WHY_CHOOSE.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="why-choose-section"
      aria-labelledby="why-choose-title"
    >
      <div
        className="why-choose-section__decoration why-choose-section__decoration--one"
        aria-hidden="true"
      />

      <div
        className="why-choose-section__decoration why-choose-section__decoration--two"
        aria-hidden="true"
      />

      <div className="why-choose-section__container">
        <header className="why-choose-section__header">
          <span className="why-choose-section__eyebrow">
            <span className="why-choose-section__eyebrow-dot" />
            LÝ DO LỰA CHỌN
          </span>

          <h2
            id="why-choose-title"
            className="why-choose-section__title"
          >
            Tại sao nên chọn
            <strong>{BRAND.fullName}</strong>
          </h2>

          <p className="why-choose-section__description">
            {WHY_CHOOSE.length} lý do giúp{" "}
            {BRAND.fullName} trở thành đối tác đáng tin cậy
            trong dịch vụ mua hộ, ký gửi và vận chuyển hàng
            hóa quốc tế.
          </p>
        </header>

        <div className="why-choose-section__grid">
          {WHY_CHOOSE.map((item, index) => (
            <article
              key={item.title}
              className="why-choose-section__card"
              style={{
                "--why-card-delay": `${index * 90}ms`,
              }}
            >
              <span className="why-choose-section__card-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="why-choose-section__card-icon">
                {index === 0 ? (
                  <SafetyCertificateOutlined />
                ) : (
                  <CheckCircleFilled />
                )}
              </div>

              <div className="why-choose-section__card-content">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>

              <div className="why-choose-section__card-footer">
                <span>
                  <CheckCircleFilled />
                </span>

                <small>
                  Giải pháp được tối ưu theo từng nhu cầu
                </small>
              </div>

              <span className="why-choose-section__card-line" />
            </article>
          ))}
        </div>

        <div className="why-choose-section__bottom">
          <div className="why-choose-section__bottom-content">
            <span className="why-choose-section__bottom-icon">
              <SafetyCertificateOutlined />
            </span>

            <div>
              <span className="why-choose-section__bottom-label">
                ĐỒNG HÀNH CÙNG KHÁCH HÀNG
              </span>

              <h3>
                An tâm mua hộ và ký gửi cùng{" "}
                {BRAND.name}
              </h3>

              <p>
                Từ tiếp nhận yêu cầu, báo giá, nhận hàng tại
                kho đến vận chuyển về Việt Nam đều được theo
                dõi rõ ràng trên hệ thống.
              </p>
            </div>
          </div>

          <div className="why-choose-section__actions">
            <button
              type="button"
              className="why-choose-section__secondary-button"
              onClick={() => navigate("/about")}
            >
              Về chúng tôi
            </button>

            <button
              type="button"
              className="why-choose-section__primary-button"
              onClick={() => navigate("/register")}
            >
              <span>Đăng ký ngay</span>
              <ArrowRightOutlined />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}