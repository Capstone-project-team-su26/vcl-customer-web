import React from "react";
import { STATS } from "../data/homeData";

export default function StatsSection() {
  return (
    <section className="home-section home-section--gray">
      <div className="home-section-inner">
        <span className="section-label">THÀNH TỰU</span>
        <h2 className="section-title">Thành tựu của chúng tôi</h2>
        <div className="stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-number">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
