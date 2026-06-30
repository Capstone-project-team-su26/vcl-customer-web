import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";

import { forgotPasswordApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import BackToHomeButton from "../../components/BackToHomeButton";
import forgotPasswordLogo from "../../assets/anhlogocap2.jpeg";

import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    const emailValue = email.trim();

    if (!emailValue) {
      setError("Vui lòng nhập địa chỉ email.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailValue)) {
      setError("Địa chỉ email không đúng định dạng.");
      return false;
    }

    setError("");
    return true;
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !validateEmail()) {
      if (!loading) {
        AuthNotify.warning(
          "Thông tin chưa hợp lệ",
          "Vui lòng kiểm tra lại địa chỉ email."
        );
      }

      return;
    }

    const emailValue = email.trim();

    try {
      setLoading(true);
      setError("");

      const response = await forgotPasswordApi(emailValue);

      AuthNotify.success(
        "Đã gửi mã xác thực",
        response?.message ||
          "Mã xác thực đã được gửi tới địa chỉ email của bạn."
      );

      setTimeout(() => {
        navigate("/otp-forgot", {
          state: {
            email: emailValue,
          },
        });
      }, 1000);
    } catch (requestError) {
      console.error("Lỗi gửi mã xác thực:", requestError);

      const errorMessage =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.title ||
        "Không thể gửi mã xác thực. Vui lòng thử lại.";

      AuthNotify.error(
        "Gửi mã thất bại",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-password-page">
      {/* ================= BANNER BÊN TRÁI ================= */}
      <section
        className="forgot-banner"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1600&auto=format&fit=crop')",
        }}
      >
        <div className="forgot-banner-overlay" />
        <div className="forgot-banner-pattern" />

        <BackToHomeButton variant="banner" />

        <button
          type="button"
          className="forgot-brand"
          onClick={() => navigate("/")}
          aria-label="Trở về trang chủ"
        >
          <span className="forgot-brand-frame">
            <img
              src={forgotPasswordLogo}
              alt="Việt Nam Logistic"
              draggable="false"
            />
          </span>
        </button>

        <div className="forgot-banner-content">
          <span className="forgot-banner-eyebrow">
            KHÔI PHỤC TÀI KHOẢN
          </span>

          <h1 className="forgot-banner-title">
            Lấy lại quyền truy cập tài khoản của bạn.
          </h1>

          <p className="forgot-banner-description">
            Nhập địa chỉ email đã đăng ký. Hệ thống sẽ gửi
            mã xác thực để bạn có thể đặt lại mật khẩu một
            cách an toàn.
          </p>

          <div className="forgot-banner-features">
            <div className="forgot-banner-feature">
              <span>✓</span>
              Xác thực tài khoản qua email
            </div>

            <div className="forgot-banner-feature">
              <span>✓</span>
              Đặt lại mật khẩu nhanh chóng
            </div>

            <div className="forgot-banner-feature">
              <span>✓</span>
              Bảo mật thông tin tài khoản
            </div>
          </div>
        </div>

        <div className="forgot-security-box">
          <span className="forgot-security-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                width="18"
                height="11"
                x="3"
                y="11"
                rx="2"
              />

              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>

          <span>
            Thông tin khôi phục tài khoản của bạn được bảo
            vệ an toàn.
          </span>
        </div>
      </section>

      {/* Nút về trang chủ trên mobile */}
      <BackToHomeButton variant="mobile" />

      {/* ================= FORM BÊN PHẢI ================= */}
      <section className="forgot-form-side">
        <div className="forgot-decoration forgot-decoration-one" />
        <div className="forgot-decoration forgot-decoration-two" />

        <div className="forgot-card-wrapper">
          <div className="forgot-card">
            {/* Logo mobile */}
            <button
              type="button"
              className="forgot-mobile-logo"
              onClick={() => navigate("/")}
              aria-label="Trở về trang chủ"
            >
              <span className="forgot-mobile-logo-frame">
                <img
                  src={forgotPasswordLogo}
                  alt="Việt Nam Logistic"
                  draggable="false"
                />
              </span>
            </button>

            <div className="forgot-icon-box">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  width="20"
                  height="16"
                  x="2"
                  y="4"
                  rx="2"
                />

                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>

            <div className="forgot-form-header">
              <span className="forgot-form-eyebrow">
                KHÔI PHỤC MẬT KHẨU
              </span>

              <h2 className="forgot-form-title">
                Quên mật khẩu?
              </h2>

              <p className="forgot-form-subtitle">
                Nhập email đã đăng ký để nhận mã xác thực
                đặt lại mật khẩu.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="forgot-form"
              noValidate
            >
              <div className="forgot-field">
                <label
                  htmlFor="forgot-email"
                  className="forgot-label"
                >
                  Địa chỉ email
                </label>

                <div
                  className={`forgot-input-wrapper ${
                    error ? "forgot-input-error" : ""
                  }`}
                >
                  <span className="forgot-input-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        width="20"
                        height="16"
                        x="2"
                        y="4"
                        rx="2"
                      />

                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>

                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Nhập địa chỉ email"
                    className="forgot-input"
                    autoComplete="email"
                    disabled={loading}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error
                        ? "forgot-email-error"
                        : undefined
                    }
                  />
                </div>

                {error && (
                  <div
                    id="forgot-email-error"
                    className="forgot-error-message"
                    role="alert"
                  >
                    <span>!</span>
                    {error}
                  </div>
                )}
              </div>

              <div className="forgot-info-box">
                <span className="forgot-info-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />

                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </span>

                <p>
                  Mã xác thực sẽ được gửi đến email đã đăng
                  ký với tài khoản của bạn.
                </p>
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="forgot-submit-button"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={21}
                      thickness={4}
                      sx={{ color: "#ffffff" }}
                    />

                    <span>Đang gửi mã...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi mã xác thực</span>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>

              <button
                type="button"
                className="forgot-back-link"
                onClick={() => navigate("/login")}
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>

                <span>Quay lại trang đăng nhập</span>
              </button>
            </form>

            <div className="forgot-footer-links">
              <button
                type="button"
                onClick={() => navigate("/support")}
              >
                Hỗ trợ
              </button>

              <span>•</span>

              <button
                type="button"
                onClick={() => navigate("/privacy")}
              >
                Chính sách bảo mật
              </button>

              <span>•</span>

              <button
                type="button"
                onClick={() => navigate("/terms")}
              >
                Điều khoản
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}