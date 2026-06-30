import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";

import {
  BRAND,
  COMMITMENTS,
} from "../data/homeData";

import "./CommitmentsSection.css";

export default function CommitmentsSection() {
  const navigate = useNavigate();

  return (
    <section
      className="commitments-section"
      aria-labelledby="commitments-title"
    >
      <div
        className="commitments-decoration commitments-decoration--one"
        aria-hidden="true"
      />

      <div
        className="commitments-decoration commitments-decoration--two"
        aria-hidden="true"
      />

      <div className="commitments-container">
        <header className="commitments-header">
          <span className="commitments-label">
            <span className="commitments-label-dot" />
            CAM KẾT CỦA {BRAND.name}
          </span>

          <h2
            id="commitments-title"
            className="commitments-title"
          >
            Xây dựng dịch vụ mua hộ và ký gửi
            <strong>
              bằng sự tử tế, minh bạch và bền vững
            </strong>
          </h2>

          <p className="commitments-description">
            {BRAND.fullName} luôn đặt quyền lợi khách hàng,
            sự an toàn của hàng hóa và tính minh bạch trong
            vận hành làm nền tảng phát triển lâu dài.
          </p>
        </header>

        <div className="commitments-grid">
          {COMMITMENTS.map((item, index) => (
            <article
              key={item.title}
              className="commitments-card"
            >
              <span className="commitments-card-number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="commitments-icon">
                <span aria-hidden="true">
                  {item.icon}
                </span>
              </div>

              <div className="commitments-card-content">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>

              <div className="commitments-card-footer">
                <span className="commitments-check">
                  ✓
                </span>

                <span>Cam kết đồng hành lâu dài</span>
              </div>

              <span className="commitments-card-line" />
            </article>
          ))}
        </div>

        <div className="commitments-bottom">
          <div className="commitments-bottom-content">
            <span className="commitments-bottom-eyebrow">
              GIÁ TRỊ CỐT LÕI
            </span>

            <h3>
              Mỗi đơn hàng là một cam kết của{" "}
              {BRAND.name}
            </h3>

            <p>
              Chúng tôi không chỉ vận chuyển hàng hóa mà còn
              đồng hành cùng khách hàng trong toàn bộ hành
              trình mua hộ, ký gửi và giao nhận quốc tế.
            </p>
          </div>

          <button
            type="button"
            className="commitments-about-button"
            onClick={() => navigate("/about")}
          >
            <span>Về chúng tôi</span>
            <ArrowRightOutlined />
          </button>
        </div>
      </div>
    </section>
  );
}