import React from "react";
import { PARTNERS } from "../data/homeData";

export default function PartnersMarquee() {
  return (
    <section>
      <div className="home-section" style={{ paddingBottom: 0 }}>
        <span className="section-label">ĐỐI TÁC</span>
        <h2 className="section-title">Mạng lưới đối tác</h2>
      </div>
      <div className="partners-marquee">
        <div className="partners-track">
          {[...PARTNERS, ...PARTNERS].map((p, idx) => (
            <span key={`${p}-${idx}`} className="partner-logo">{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
