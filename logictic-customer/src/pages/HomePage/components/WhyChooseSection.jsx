import React from "react";
import { BRAND, WHY_CHOOSE } from "../data/homeData";

export default function WhyChooseSection() {
  return (
    <section className="home-section">
      <span className="section-label">LÝ DO</span>
      <h2 className="section-title">Tại sao nên chọn {BRAND.fullName}</h2>
      <p className="section-desc">
        {WHY_CHOOSE.length} lý do khiến VCL trở thành đối tác uy tín cho dịch vụ Mua hộ và Ký gửi.
      </p>
      <div className="why-grid">
        {WHY_CHOOSE.map((item, idx) => (
          <div key={item.title} className="why-card">
            <div className="why-card-num">0{idx + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
