import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightOutlined } from "@ant-design/icons";
import "./HeroCarousel.css";

import imgMuaHo from "../../assets/hero.png";
import imgKyGui from "../../assets/hero.png";

const AUTOPLAY_MS = 5000;

const slideData = [
  {
    id: "mua-ho",
    eyebrow: "Dịch vụ Mua hộ",
    title: "Mua hàng hộ",
    highlight: "quốc tế dễ dàng",
    desc: "VCL thay bạn mua hàng từ các website nước ngoài, báo giá trọn gói minh bạch và vận chuyển về Việt Nam.",
    btnText: "Gửi yêu cầu báo giá",
    path: "/register",
    image: imgMuaHo,
    theme: "warm",
    gradient: "linear-gradient(135deg, #fff9f0 0%, #fde8c8 45%, #f5d4a0 100%)",
    accent: "#e28a16",
  },
  {
    id: "ky-gui",
    eyebrow: "Dịch vụ Ký gửi",
    title: "Ký gửi hàng hóa",
    highlight: "tại kho VCL",
    desc: "Bạn tự mua hàng và gửi về kho VCL tại nước ngoài. Hệ thống hỗ trợ gom lô và vận chuyển an toàn về Việt Nam.",
    btnText: "Tìm hiểu thêm",
    path: "/register",
    image: imgKyGui,
    theme: "cream",
    gradient: "linear-gradient(135deg, #fffdf8 0%, #f7efe3 50%, #edd9c4 100%)",
    accent: "#c47d2a",
  },
];

export default function HeroCarousel() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slideData.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="hero-vcl">
      {slideData.map((s, i) => (
        <div
          key={s.id}
          className={`hero-vcl__bg ${i === current ? "is-active" : ""}`}
          style={{ background: s.gradient }}
        />
      ))}

      <div className="hero-vcl__glow" aria-hidden />

      <div className="hero-vcl__inner">
        <div className="hero-vcl__stage">
          {slideData.map((s, i) => {
            const isActive = i === current;
            return (
              <div
                key={s.id}
                className={`hero-vcl__slide ${isActive ? "is-active" : ""} hero-vcl__slide--${s.theme}`}
                aria-hidden={!isActive}
              >
                <div className="hero-vcl__content">
                  <span className={`hero-vcl__eyebrow ${isActive ? "anim-in" : ""}`}>
                    {s.eyebrow}
                  </span>
                  <h1 className={`hero-vcl__title ${isActive ? "anim-in" : ""}`}>
                    {s.title}
                    <em style={{ color: s.accent }}>{s.highlight}</em>
                  </h1>
                  <p className={`hero-vcl__desc ${isActive ? "anim-in" : ""}`}>
                    {s.desc}
                  </p>
                  <button
                    type="button"
                    className={`hero-vcl__cta ${isActive ? "anim-in" : ""}`}
                    style={{ background: s.accent }}
                    onClick={() => navigate(s.path)}
                  >
                    {s.btnText}
                    <ArrowRightOutlined />
                  </button>
                </div>

                <div className={`hero-vcl__visual ${isActive ? "anim-in" : ""}`}>
                  <div className="hero-vcl__visual-ring" style={{ borderColor: `${s.accent}33` }} />
                  <div className="hero-vcl__visual-ring hero-vcl__visual-ring--2" style={{ borderColor: `${s.accent}22` }} />
                  <div className="hero-vcl__img-wrap">
                    <img src={s.image} alt={s.eyebrow} className="hero-vcl__img" />
                  </div>
                  <span className="hero-vcl__badge" style={{ background: s.accent }}>
                    VCL
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chỉ báo tự động — không cần bấm */}
        <div className="hero-vcl__dots" aria-hidden>
          {slideData.map((s, i) => (
            <span
              key={s.id}
              className={`hero-vcl__dot ${i === current ? "is-active" : ""}`}
              style={{ "--dot-accent": slideData[current].accent }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
