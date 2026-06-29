import React from "react";
import { ArrowRightOutlined } from "@ant-design/icons";
import { BRAND, COMMITMENTS } from "../data/homeData";

export default function CommitmentsSection() {
  return (
    <section className="home-section home-section--gray">
      <div className="home-section-inner">
        <span className="section-label">CAM KẾT CỦA {BRAND.name}</span>
        <h2 className="section-title">
          Xây dựng dịch vụ Mua hộ & Ký gửi dựa trên sự tử tế, minh bạch và bền vững
        </h2>
        <div className="commitments-grid">
          {COMMITMENTS.map((item) => (
            <div key={item.title} className="commitment-card">
              <div className="commitment-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
        <button type="button" className="about-btn">
          Về chúng tôi <ArrowRightOutlined />
        </button>
      </div>
    </section>
  );
}
