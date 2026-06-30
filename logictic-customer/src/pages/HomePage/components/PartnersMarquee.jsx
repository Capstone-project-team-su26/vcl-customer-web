import React from "react";
import { PARTNERS } from "../data/homeData";

import "./PartnersMarquee.css";

const MARQUEE_ROWS = [
  {
    offset: 0,
    direction: "left",
    duration: "32s",
  },
  {
    offset: 3,
    direction: "right",
    duration: "38s",
  },
  {
    offset: 6,
    direction: "left",
    duration: "35s",
  },
  {
    offset: 8,
    direction: "right",
    duration: "41s",
  },
];

function rotatePartners(items, offset) {
  if (!items.length) {
    return [];
  }

  const normalizedOffset = offset % items.length;

  return [
    ...items.slice(normalizedOffset),
    ...items.slice(0, normalizedOffset),
  ];
}

function PartnerGroup({ partners, hidden = false }) {
  return (
    <div
      className="partners-marquee__group"
      aria-hidden={hidden ? "true" : undefined}
    >
      {partners.map((partner, index) => (
        <div
          key={`${partner}-${hidden ? "clone" : "main"}-${index}`}
          className="partners-marquee__logo"
        >
          <span className="partners-marquee__logo-symbol">
            {partner.charAt(0).toUpperCase()}
          </span>

          <span className="partners-marquee__logo-name">
            {partner}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PartnersMarquee() {
  if (!PARTNERS?.length) {
    return null;
  }

  return (
    <section
      className="partners-marquee-section"
      aria-labelledby="partners-marquee-title"
    >
      <div
        className="partners-marquee-section__decoration partners-marquee-section__decoration--one"
        aria-hidden="true"
      />

      <div
        className="partners-marquee-section__decoration partners-marquee-section__decoration--two"
        aria-hidden="true"
      />

      <div className="partners-marquee-section__container">
        <header className="partners-marquee-section__header">
          <span className="partners-marquee-section__label">
            <span />
            ĐỐI TÁC TOÀN CẦU
          </span>

          <h2
            id="partners-marquee-title"
            className="partners-marquee-section__title"
          >
            Mạng lưới đối tác
            <strong>thương mại quốc tế</strong>
          </h2>

          <p className="partners-marquee-section__description">
            Kết nối các nền tảng mua sắm và thương mại điện tử
            hàng đầu, giúp quá trình mua hộ và ký gửi trở nên
            thuận tiện hơn.
          </p>
        </header>
      </div>

      <div className="partners-marquee">
        <div
          className="partners-marquee__fade partners-marquee__fade--left"
          aria-hidden="true"
        />

        <div
          className="partners-marquee__fade partners-marquee__fade--right"
          aria-hidden="true"
        />

        {MARQUEE_ROWS.map((row, rowIndex) => {
          const partners = rotatePartners(
            PARTNERS,
            row.offset
          );

          return (
            <div
              key={`partner-row-${rowIndex}`}
              className={`partners-marquee__row partners-marquee__row--${row.direction}`}
            >
              <div
                className="partners-marquee__track"
                style={{
                  "--partners-duration": row.duration,
                }}
              >
                <PartnerGroup partners={partners} />

                <PartnerGroup
                  partners={partners}
                  hidden
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}