import React from "react";
import { BRAND, COUNTRIES } from "../data/homeData";

export default function GlobalBrandSection() {
  return (
    <section className="home-section">
      <div className="global-brand-grid">
        <div className="global-brand-text">
          <span className="section-label">{BRAND.name} GLOBAL</span>
          <h2 className="section-title">Thương hiệu logistics xuyên biên giới</h2>
          <p className="section-desc">
            {BRAND.fullName} ra đời với sứ mệnh trở thành cầu nối thương mại toàn cầu, giúp khách hàng Việt Nam
            tiếp cận hàng hóa quốc tế thông qua hai dịch vụ cốt lõi: <strong>Mua hộ</strong> và <strong>Ký gửi</strong>.
          </p>
          <p className="section-desc" style={{ marginTop: 16 }}>
            VCL không ngừng phát triển hệ thống vận hành tự động, mở rộng mạng lưới kho quốc tế và tối ưu chuỗi
            cung ứng để kinh doanh xuyên biên giới trở nên đơn giản hơn, nhanh chóng hơn, tiết kiệm hơn.
          </p>
          <p className="tagline">{BRAND.tagline}</p>
          <div className="country-pills">
            {COUNTRIES.map((c) => (
              <span key={c} className="country-pill">{c}</span>
            ))}
          </div>
        </div>
        <div className="global-brand-visual">
          <div className="globe-decoration" />
          <div className="ceo-card">
            <div className="ceo-avatar">VCL</div>
            <div className="ceo-role">Hệ thống khách hàng</div>
            <div className="ceo-name">{BRAND.fullName}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
