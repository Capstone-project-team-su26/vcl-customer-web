import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Button,
  CircularProgress,
} from "@mui/material";

import {
  verifyOtpApi,
  resendOtpApi,
} from "../../api/Auth/authService";

import AuthNotify from "../../utils/AuthNotify";
import BackToHomeButton from "../../components/BackToHomeButton";
import verifyOtpLogo from "../../assets/anhlogocap2.jpeg";

import "./VerifyOtp.css";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email =
    location.state?.email ||
    sessionStorage.getItem("verifyEmail") ||
    "";

  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] =
    useState(false);

  const [countdown, setCountdown] = useState(60);

  /*
   * Lưu email vào sessionStorage để khi người dùng
   * tải lại trang vẫn giữ được email cần xác thực.
   */
  useEffect(() => {
    if (email) {
      sessionStorage.setItem("verifyEmail", email);
    }
  }, [email]);

  /*
   * Nếu không có email thì không cho truy cập trực tiếp
   * vào màn hình xác thực OTP.
   */
  useEffect(() => {
    if (!email) {
      AuthNotify.error(
        "Không tìm thấy email",
        "Vui lòng đăng ký lại để nhận mã xác thực."
      );

      navigate("/register", {
        replace: true,
      });
    }
  }, [email, navigate]);

  /*
   * Bộ đếm thời gian gửi lại mã OTP.
   */
  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((currentValue) =>
        Math.max(currentValue - 1, 0)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  const validateOtp = () => {
    if (!otpValue) {
      setOtpError("Vui lòng nhập mã OTP.");
      return false;
    }

    if (!/^\d{6}$/.test(otpValue)) {
      setOtpError(
        "Mã OTP phải gồm đúng 6 chữ số."
      );
      return false;
    }

    setOtpError("");
    return true;
  };

  const handleOtpChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtpValue(value);

    if (otpError) {
      setOtpError("");
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (loading || !validateOtp()) {
      if (!loading) {
        AuthNotify.warning(
          "Thông tin chưa hợp lệ",
          "Vui lòng kiểm tra lại mã OTP."
        );
      }

      return;
    }

    try {
      setLoading(true);

      const response = await verifyOtpApi(
        email,
        otpValue
      );

      sessionStorage.removeItem("verifyEmail");

      AuthNotify.success(
        "Xác thực thành công",
        response?.message ||
          "Tài khoản của bạn đã được xác thực."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      console.error("Lỗi xác thực OTP:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Mã OTP không chính xác hoặc đã hết hạn.";

      setOtpError(errorMessage);

      AuthNotify.error(
        "Xác thực thất bại",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (
      resendLoading ||
      countdown > 0 ||
      !email
    ) {
      return;
    }

    try {
      setResendLoading(true);

      const response = await resendOtpApi(email);

      setOtpValue("");
      setOtpError("");
      setCountdown(60);

      AuthNotify.success(
        "Đã gửi lại mã OTP",
        response?.message ||
          "Mã OTP mới đã được gửi tới email của bạn."
      );
    } catch (error) {
      console.error("Lỗi gửi lại OTP:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Không thể gửi lại mã OTP. Vui lòng thử lại.";

      AuthNotify.error(
        "Gửi lại mã thất bại",
        errorMessage
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <main className="verify-otp-page">
      {/* ================= BANNER BÊN TRÁI ================= */}
      <section
        className="verify-otp-banner"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1600&auto=format&fit=crop')",
        }}
      >
        <div className="verify-otp-banner-overlay" />
        <div className="verify-otp-banner-pattern" />

        <BackToHomeButton variant="banner" />

        <button
          type="button"
          className="verify-otp-brand"
          onClick={() => navigate("/")}
          aria-label="Trở về trang chủ"
        >
          <span className="verify-otp-brand-frame">
            <img
              src={verifyOtpLogo}
              alt="Việt Nam Logistic"
              draggable="false"
            />
          </span>
        </button>

        <div className="verify-otp-banner-content">
          <span className="verify-otp-banner-eyebrow">
            XÁC THỰC TÀI KHOẢN
          </span>

          <h1 className="verify-otp-banner-title">
            Hoàn tất đăng ký chỉ trong một bước.
          </h1>

          <p className="verify-otp-banner-description">
            Nhập mã OTP gồm 6 chữ số đã được gửi đến
            email của bạn để kích hoạt tài khoản và bắt
            đầu sử dụng hệ thống.
          </p>

          <div className="verify-otp-feature-list">
            <div className="verify-otp-feature-item">
              <span>✓</span>
              Xác thực tài khoản an toàn
            </div>

            <div className="verify-otp-feature-item">
              <span>✓</span>
              Mã OTP gồm đúng 6 chữ số
            </div>

            <div className="verify-otp-feature-item">
              <span>✓</span>
              Kích hoạt tài khoản nhanh chóng
            </div>
          </div>
        </div>

        <div className="verify-otp-security-box">
          <span className="verify-otp-security-icon">
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>

          <span>
            Không cung cấp mã OTP cho bất kỳ ai,
            kể cả nhân viên hỗ trợ.
          </span>
        </div>
      </section>

      <BackToHomeButton variant="mobile" />

      {/* ================= KHU VỰC FORM ================= */}
      <section className="verify-otp-form-side">
        <div className="verify-otp-decoration verify-otp-decoration-one" />
        <div className="verify-otp-decoration verify-otp-decoration-two" />

        <div className="verify-otp-card-wrapper">
          <div className="verify-otp-card">
            {/* Logo mobile */}
            <button
              type="button"
              className="verify-otp-mobile-logo"
              onClick={() => navigate("/")}
              aria-label="Trở về trang chủ"
            >
              <span className="verify-otp-mobile-logo-frame">
                <img
                  src={verifyOtpLogo}
                  alt="Việt Nam Logistic"
                  draggable="false"
                />
              </span>
            </button>

            <div className="verify-otp-main-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="29"
                height="29"
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
            </div>

            <div className="verify-otp-header">
              <span className="verify-otp-eyebrow">
                BẢO MẬT TÀI KHOẢN
              </span>

              <h2 className="verify-otp-title">
                Xác thực tài khoản
              </h2>

              <p className="verify-otp-subtitle">
                Mã xác thực gồm 6 chữ số đã được gửi
                tới địa chỉ email:
              </p>

              <div
                className="verify-otp-email"
                title={email}
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
                  <rect
                    width="20"
                    height="16"
                    x="2"
                    y="4"
                    rx="2"
                  />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>

                <span>{email}</span>
              </div>
            </div>

            <form
              onSubmit={handleVerifyOtp}
              className="verify-otp-form"
              noValidate
            >
              <div className="verify-otp-field">
                <label
                  htmlFor="verify-otp-code"
                  className="verify-otp-label"
                >
                  Mã xác thực OTP
                  <span className="verify-otp-required">
                    *
                  </span>
                </label>

                <div
                  className={`verify-otp-input-wrapper ${
                    otpError
                      ? "verify-otp-input-error"
                      : ""
                  }`}
                >
                  <span className="verify-otp-input-icon">
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
                        width="18"
                        height="11"
                        x="3"
                        y="11"
                        rx="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>

                  <input
                    id="verify-otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Nhập 6 chữ số"
                    className="verify-otp-input"
                    value={otpValue}
                    onChange={handleOtpChange}
                    disabled={loading}
                    aria-invalid={Boolean(otpError)}
                    aria-describedby={
                      otpError
                        ? "verify-otp-error"
                        : undefined
                    }
                  />

                  <span className="verify-otp-input-count">
                    {otpValue.length}/6
                  </span>
                </div>

                {otpError && (
                  <div
                    id="verify-otp-error"
                    className="verify-otp-error-text"
                    role="alert"
                  >
                    <span>!</span>
                    {otpError}
                  </div>
                )}
              </div>

              <div className="verify-otp-resend-wrapper">
                {countdown > 0 ? (
                  <span className="verify-otp-countdown">
                    Có thể gửi lại mã sau{" "}
                    <strong>{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="verify-otp-resend-button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <>
                        <CircularProgress
                          size={15}
                          thickness={4}
                          sx={{ color: "#1976b9" }}
                        />
                        <span>Đang gửi lại...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12a9 9 0 0 1-15.17 6.55L3 16" />
                          <path d="M3 21v-5h5" />
                          <path d="M3 12A9 9 0 0 1 18.17 5.45L21 8" />
                          <path d="M21 3v5h-5" />
                        </svg>

                        <span>Gửi lại mã OTP</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="verify-otp-submit"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={21}
                      thickness={4}
                      sx={{ color: "#ffffff" }}
                    />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Xác thực tài khoản</span>

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
                className="verify-otp-back-button"
                onClick={() => navigate("/register")}
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

                <span>Quay lại trang đăng ký</span>
              </button>
            </form>

            <div className="verify-otp-footer">
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

        <div className="verify-otp-status">
          <span className="verify-otp-status-dot" />
          Hệ thống đang hoạt động bình thường
        </div>
      </section>
    </main>
  );
}