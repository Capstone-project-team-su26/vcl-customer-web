import React from "react";
import { useNavigate } from "react-router-dom";

import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <main className="not-found-page">
      <div className="not-found-background" aria-hidden="true">
        <span className="not-found-glow glow-one" />
        <span className="not-found-glow glow-two" />
        <span className="not-found-grid" />
      </div>

      <section className="not-found-card">
        <div className="not-found-status">
          <span className="not-found-status-dot" />
          Trang không tồn tại
        </div>

        <div className="not-found-illustration" aria-hidden="true">
          <div className="not-found-package">
            <span className="package-top-line" />
            <span className="package-label">
              <span>?</span>
            </span>
          </div>

          <span className="not-found-orbit orbit-one" />
          <span className="not-found-orbit orbit-two" />
        </div>

        <div className="not-found-code">
          <span>4</span>
          <span className="not-found-zero">0</span>
          <span>4</span>
        </div>

        <h1 className="not-found-title">
          Không tìm thấy trang
        </h1>

        <p className="not-found-description">
          Trang bạn đang truy cập không tồn tại, đã được di chuyển
          hoặc đường dẫn có thể chưa chính xác.
        </p>

        <div className="not-found-actions">
          <button
            type="button"
            className="not-found-button secondary"
            onClick={handleGoBack}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M15 18l-6-6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Quay lại
          </button>

          <button
            type="button"
            className="not-found-button primary"
            onClick={handleGoHome}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M3 11.5 12 4l9 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Về trang chủ
          </button>
        </div>

        <div className="not-found-support">
          <span>Mã lỗi: 404</span>
          <span className="not-found-support-divider" />
          <span>Vui lòng kiểm tra lại đường dẫn</span>
        </div>
      </section>
    </main>
  );
};

export default NotFound;