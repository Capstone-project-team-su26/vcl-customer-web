import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";
import { BRAND, AUDIENCE } from "../data/homeData";

export default function AudienceSection() {
  const navigate = useNavigate();

  return (
    <section className="home-section audience-section">
      <span className="section-label">ĐỐI TƯỢNG</span>
      <h2 className="section-title">
        Dù bạn mua hộ hay ký gửi — VCL đều có giải pháp phù hợp
      </h2>
      <div className="audience-targets">
        {AUDIENCE.map((a) => (
          <div key={a.title} className="audience-card">
            <div className="audience-icon">{a.icon}</div>
            <h3>{a.title}</h3>
          </div>
        ))}
      </div>
      <div className="solution-banner">
        <h3>{BRAND.fullName} Ở ĐÂY ĐỂ XÓA BỎ NỖI LO CỦA BẠN</h3>
        <div className="solution-sub">MUA HỘ · KÝ GỬI</div>
        <p style={{ fontSize: 18, margin: "0 0 24px", opacity: 0.85 }}>
          Lo trọn quy trình Mua hộ và Ký gửi cho bạn
        </p>
        <button
          type="button"
          className="register-cta-btn"
          onClick={() => navigate("/register")}
        >
          Đăng ký ngay <ArrowRightOutlined />
        </button>
      </div>
    </section>
  );
}
