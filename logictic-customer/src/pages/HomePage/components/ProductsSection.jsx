import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

import { PRODUCTS } from "../data/homeData";
import "./ProductsSection.css";

function rotateProducts(products, offset) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const safeOffset = offset % products.length;

  return [
    ...products.slice(safeOffset),
    ...products.slice(0, safeOffset),
  ];
}

function ProductCard({ product }) {
  return (
    <article
      className="products-showcase__card"
      style={{
        "--product-card-color":
          product.bg || "#e3f2fd",
      }}
    >
      <div className="products-showcase__card-visual">
        <span
          className="products-showcase__card-emoji"
          aria-hidden="true"
        >
          {product.emoji || "📦"}
        </span>

        <span className="products-showcase__card-status">
          <CheckCircleFilled />
          Có hỗ trợ
        </span>
      </div>

      <div className="products-showcase__card-content">
        <span className="products-showcase__card-label">
          NHÓM SẢN PHẨM
        </span>

        <h3>{product.title}</h3>

        <p>
          Hỗ trợ mua hộ, ký gửi và vận chuyển về Việt Nam.
        </p>
      </div>
    </article>
  );
}

function ProductMarqueeRow({
  products,
  direction = "normal",
  duration = "34s",
  rowId,
}) {
  return (
    <div className="products-showcase__marquee">
      <div
        className="products-showcase__track"
        style={{
          "--products-duration": duration,
          "--products-direction": direction,
        }}
      >
        <div className="products-showcase__group">
          {products.map((product, index) => (
            <ProductCard
              key={`${rowId}-first-${product.title}-${index}`}
              product={product}
            />
          ))}
        </div>

        <div
          className="products-showcase__group"
          aria-hidden="true"
        >
          {products.map((product, index) => (
            <ProductCard
              key={`${rowId}-second-${product.title}-${index}`}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsSection() {
  const navigate = useNavigate();

  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
    return null;
  }

  const firstRow = rotateProducts(PRODUCTS, 0);
  const secondRow = rotateProducts(PRODUCTS, 3);

  return (
    <section
      className="products-showcase"
      aria-labelledby="products-showcase-title"
    >
      <div
        className="products-showcase__decoration products-showcase__decoration--one"
        aria-hidden="true"
      />

      <div
        className="products-showcase__decoration products-showcase__decoration--two"
        aria-hidden="true"
      />

      <div className="products-showcase__header">
        <span className="products-showcase__label">
          <span className="products-showcase__label-dot" />
          SẢN PHẨM HỖ TRỢ
        </span>

        <h2
          id="products-showcase-title"
          className="products-showcase__title"
        >
          Nhận đa dạng sản phẩm
          <strong>qua mua hộ và ký gửi</strong>
        </h2>

        <p className="products-showcase__description">
          Việt Nam Logictic hỗ trợ nhiều nhóm hàng hóa từ
          thời trang, mỹ phẩm, đồ điện tử đến phụ tùng,
          sách và các sản phẩm sưu tầm quốc tế.
        </p>
      </div>

      <div className="products-showcase__rows">
        <ProductMarqueeRow
          rowId="products-row-one"
          products={firstRow}
          direction="normal"
          duration="36s"
        />

        <ProductMarqueeRow
          rowId="products-row-two"
          products={secondRow}
          direction="reverse"
          duration="40s"
        />
      </div>

      <div className="products-showcase__bottom">
        <div className="products-showcase__notice">
          <span className="products-showcase__notice-icon">
            📦
          </span>

          <div>
            <strong>Chưa thấy sản phẩm của bạn?</strong>

            <p>
              Gửi thông tin sản phẩm để được kiểm tra và tư
              vấn phương án vận chuyển phù hợp.
            </p>
          </div>
        </div>

        <div className="products-showcase__actions">
          <button
            type="button"
            className="products-showcase__secondary-button"
            onClick={() => navigate("/dich-vu")}
          >
            Xem dịch vụ
          </button>

          <button
            type="button"
            className="products-showcase__primary-button"
            onClick={() => navigate("/register")}
          >
            <span>Đăng ký tư vấn</span>
            <ArrowRightOutlined />
          </button>
        </div>
      </div>
    </section>
  );
}