import React from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "../../../assets/hero.png";
import { BRAND } from "../data/homeData";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="cta-section">
      <img src={heroImg} alt={BRAND.name} style={{ height: 48, marginBottom: 24, objectFit: "contain" }} />
      <p style={{ fontSize: 13, fontWeight: 700, color: "#f5a623", letterSpacing: 2, margin: "0 0 12px" }}>
        {BRAND.tagline.toUpperCase()}
      </p>
      <h2>Gửi ngay yêu cầu, {BRAND.name} sẽ tư vấn giải pháp Mua hộ hoặc Ký gửi phù hợp</h2>
      <p>Tư vấn giải pháp phù hợp nhất với từng loại hàng và tiến độ của bạn.</p>
      <div className="cta-buttons">
        <button type="button" className="cta-btn-primary">Đăng ký nhận báo giá</button>
        <button
          type="button"
          className="cta-btn-outline"
          onClick={() => navigate("/register")}
        >
          Đăng ký tài khoản hệ thống
        </button>
      </div>
    </section>
  );
}
