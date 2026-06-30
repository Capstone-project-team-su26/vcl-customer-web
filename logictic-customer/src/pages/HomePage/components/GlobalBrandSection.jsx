import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  GlobalOutlined,
} from "@ant-design/icons";

import brandLogo from "../../../assets/anhlogocap2.jpeg";
import { BRAND, COUNTRIES } from "../data/homeData";

import "./GlobalBrandSection.css";

const GLOBAL_FEATURES = [
  "Mạng lưới kho hàng quốc tế",
  "Quản lý vận chuyển tập trung",
  "Theo dõi trạng thái theo thời gian thực",
];

export default function GlobalBrandSection() {
  const navigate = useNavigate();

  return (
    <section
      className="global-brand-section"
      aria-labelledby="global-brand-title"
    >
      <div
        className="global-brand-section__decoration global-brand-section__decoration--one"
        aria-hidden="true"
      />

      <div
        className="global-brand-section__decoration global-brand-section__decoration--two"
        aria-hidden="true"
      />

      <div className="global-brand-section__container">
        <div className="global-brand-section__grid">
          {/* Nội dung bên trái */}
          <div className="global-brand-section__content">
            <span className="global-brand-section__label">
              <GlobalOutlined />
              <span>{BRAND.name} GLOBAL</span>
            </span>

            <h2
              id="global-brand-title"
              className="global-brand-section__title"
            >
              Thương hiệu logistics
              <strong>xuyên biên giới</strong>
            </h2>

            <p className="global-brand-section__description">
              {BRAND.fullName} ra đời với sứ mệnh trở thành
              cầu nối thương mại toàn cầu, giúp khách hàng
              Việt Nam tiếp cận nguồn hàng quốc tế thông qua
              hai dịch vụ cốt lõi:
              <b> mua hộ</b> và <b> ký gửi hàng hóa</b>.
            </p>

            <p className="global-brand-section__description">
              {BRAND.fullName} không ngừng phát triển hệ
              thống vận hành tự động, mở rộng mạng lưới kho
              quốc tế và tối ưu chuỗi cung ứng để hoạt động
              mua bán xuyên biên giới trở nên đơn giản, nhanh
              chóng và tiết kiệm hơn.
            </p>

            <div className="global-brand-section__features">
              {GLOBAL_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="global-brand-section__feature"
                >
                  <CheckCircleFilled />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <blockquote className="global-brand-section__tagline">
              <span>“</span>
              <p>{BRAND.tagline}</p>
            </blockquote>

            <div className="global-brand-section__countries">
              <span className="global-brand-section__countries-label">
                Mạng lưới hiện tại
              </span>

              <div className="global-brand-section__country-list">
                {COUNTRIES.map((country, index) => (
                  <span
                    key={country}
                    className="global-brand-section__country"
                  >
                    <i>{String(index + 1).padStart(2, "0")}</i>
                    {country}
                  </span>
                ))}
              </div>
            </div>

            <div className="global-brand-section__actions">
              <button
                type="button"
                className="global-brand-section__primary-button"
                onClick={() => navigate("/register")}
              >
                <span>Đăng ký tài khoản</span>
                <ArrowRightOutlined />
              </button>

              <button
                type="button"
                className="global-brand-section__secondary-button"
                onClick={() => navigate("/dich-vu")}
              >
                Khám phá dịch vụ
              </button>
            </div>
          </div>

          {/* Minh họa bên phải */}
          <div className="global-brand-section__visual">
            <div
              className="global-brand-section__orbit global-brand-section__orbit--outer"
              aria-hidden="true"
            />

            <div
              className="global-brand-section__orbit global-brand-section__orbit--middle"
              aria-hidden="true"
            />

            <div
              className="global-brand-section__orbit global-brand-section__orbit--inner"
              aria-hidden="true"
            />

            <div className="global-brand-section__globe">
              <div
                className="global-brand-section__globe-grid"
                aria-hidden="true"
              />

              <div className="global-brand-section__logo-card">
                <div className="global-brand-section__logo-frame">
                  <img
                    src={brandLogo}
                    alt={`Logo ${BRAND.fullName}`}
                    className="global-brand-section__logo-image"
                    draggable="false"
                  />
                </div>

                <span className="global-brand-section__system-label">
                  HỆ THỐNG KHÁCH HÀNG
                </span>

                <h3>{BRAND.fullName}</h3>

                <p>
                  Quản lý mua hộ, ký gửi và vận chuyển trên
                  một nền tảng duy nhất.
                </p>

                <div className="global-brand-section__online">
                  <span />
                  Hệ thống đang hoạt động
                </div>
              </div>
            </div>

            <div className="global-brand-section__location global-brand-section__location--japan">
              <span>JP</span>
              <div>
                <strong>Nhật Bản</strong>
                <small>Kho quốc tế</small>
              </div>
            </div>

            <div className="global-brand-section__location global-brand-section__location--korea">
              <span>KR</span>
              <div>
                <strong>Hàn Quốc</strong>
                <small>Kho quốc tế</small>
              </div>
            </div>

            <div className="global-brand-section__location global-brand-section__location--vietnam">
              <span>VN</span>
              <div>
                <strong>Việt Nam</strong>
                <small>Trung tâm vận hành</small>
              </div>
            </div>

            <div className="global-brand-section__stat-card">
              <span className="global-brand-section__stat-icon">
                <GlobalOutlined />
              </span>

              <div>
                <strong>{COUNTRIES.length}+</strong>
                <small>Thị trường kết nối</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}