import React from "react";
import { PRODUCTS } from "../data/homeData";

export default function ProductsSection() {
  return (
    <section className="home-section">
      <span className="section-label">SẢN PHẨM</span>
      <h2 className="section-title">Nhận đa dạng sản phẩm qua Mua hộ & Ký gửi</h2>
      <div className="products-scroll">
        {[...PRODUCTS, ...PRODUCTS].map((p, idx) => (
          <div key={`${p.title}-${idx}`} className="product-card">
            <div className="product-card-img" style={{ background: p.bg }}>
              {p.emoji}
            </div>
            <div className="product-card-title">{p.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
