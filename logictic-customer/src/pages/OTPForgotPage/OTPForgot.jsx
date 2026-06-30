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
  forgotPasswordApi,
  resetPasswordApi,
} from "../../api/Auth/authService";

import AuthNotify from "../../utils/AuthNotify";
import BackToHomeButton from "../../components/BackToHomeButton";
import otpForgotLogo from "../../assets/anhlogocap2.jpeg";

import "./OTPForgot.css";

const INITIAL_ERRORS = {
  otp: "",
  password: "",
  confirmPassword: "",
};

export default function OTPForgot() {
  const navigate = useNavigate();
  const location = useLocation();

  const email =
    location.state?.email ||
    sessionStorage.getItem("forgotEmail") ||
    "";

  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] =
    useState(false);

  const [countdown, setCountdown] = useState(60);
  const [errors, setErrors] =
    useState(INITIAL_ERRORS);

  useEffect(() => {
    if (email) {
      sessionStorage.setItem(
        "forgotEmail",
        email
      );
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      AuthNotify.error(
        "Không tìm thấy email",
        "Vui lòng thực hiện lại quá trình quên mật khẩu."
      );

      navigate("/forgot-password", {
        replace: true,
      });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((currentCountdown) =>
        Math.max(currentCountdown - 1, 0)
      );
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [countdown]);

  const clearError = (fieldName) => {
    if (!errors[fieldName]) {
      return;
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {
      otp: "",
      password: "",
      confirmPassword: "",
    };

    const otpRegex = /^\d{6}$/;

    if (!otpValue) {
      nextErrors.otp =
        "Vui lòng nhập mã OTP.";
    } else if (!otpRegex.test(otpValue)) {
      nextErrors.otp =
        "Mã OTP phải gồm đúng 6 chữ số.";
    }

    if (!newPassword) {
      nextErrors.password =
        "Vui lòng nhập mật khẩu mới.";
    } else if (newPassword.length < 8) {
      nextErrors.password =
        "Mật khẩu mới phải có ít nhất 8 ký tự.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword =
        "Vui lòng nhập lại mật khẩu mới.";
    } else if (
      newPassword !== confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp.";
    }

    setErrors(nextErrors);

    const valid = !Object.values(
      nextErrors
    ).some(Boolean);

    if (!valid) {
      AuthNotify.warning(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại các trường được đánh dấu."
      );
    }

    return valid;
  };

  const handleOtpChange = (event) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtpValue(value);
    clearError("otp");
  };

  const handleNewPasswordChange = (
    event
  ) => {
    setNewPassword(event.target.value);
    clearError("password");

    if (errors.confirmPassword) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        confirmPassword: "",
      }));
    }
  };

  const handleConfirmPasswordChange = (
    event
  ) => {
    setConfirmPassword(event.target.value);
    clearError("confirmPassword");
  };

  const handleResetPassword = async (
    event
  ) => {
    event.preventDefault();

    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await resetPasswordApi(
          email,
          otpValue,
          newPassword
        );

      sessionStorage.removeItem(
        "forgotEmail"
      );

      AuthNotify.success(
        "Đặt lại mật khẩu thành công",
        response?.message ||
          "Bạn có thể đăng nhập bằng mật khẩu mới."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      console.error(
        "Lỗi đặt lại mật khẩu:",
        error
      );

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Mã OTP không chính xác hoặc đã hết hạn.";

      AuthNotify.error(
        "Đặt lại mật khẩu thất bại",
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

      const response =
        await forgotPasswordApi(email);

      setOtpValue("");
      clearError("otp");
      setCountdown(60);

      AuthNotify.success(
        "Đã gửi lại mã OTP",
        response?.message ||
          "Mã OTP mới đã được gửi tới email của bạn."
      );
    } catch (error) {
      console.error(
        "Lỗi gửi lại mã OTP:",
        error
      );

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
    <main className="otp-forgot-page">
      {/* ================= BANNER TRÁI ================= */}
      <section
        className="otp-forgot-banner"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1600&auto=format&fit=crop')",
        }}
      >
        <div className="otp-forgot-overlay" />
        <div className="otp-forgot-pattern" />

        <BackToHomeButton variant="banner" />

        <button
          type="button"
          className="otp-forgot-brand"
          onClick={() => navigate("/")}
          aria-label="Trở về trang chủ"
        >
          <span className="otp-forgot-brand-frame">
            <img
              src={otpForgotLogo}
              alt="Việt Nam Logistic"
              draggable="false"
            />
          </span>
        </button>

        <div className="otp-forgot-banner-content">
          <span className="otp-forgot-banner-eyebrow">
            BẢO MẬT TÀI KHOẢN
          </span>

          <h1 className="otp-forgot-banner-title">
            Đặt lại mật khẩu an toàn.
          </h1>

          <p className="otp-forgot-banner-description">
            Nhập mã OTP đã được gửi tới email
            của bạn và tạo mật khẩu mới để tiếp
            tục sử dụng tài khoản.
          </p>

          <div className="otp-forgot-feature-list">
            <div className="otp-forgot-feature-item">
              <span>✓</span>
              Mã xác thực gồm 6 chữ số
            </div>

            <div className="otp-forgot-feature-item">
              <span>✓</span>
              Mật khẩu mới được bảo vệ an toàn
            </div>

            <div className="otp-forgot-feature-item">
              <span>✓</span>
              Khôi phục tài khoản nhanh chóng
            </div>
          </div>
        </div>

        <div className="otp-forgot-security-box">
          <span className="otp-forgot-security-icon">
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
            Không chia sẻ mã OTP với bất kỳ ai,
            kể cả nhân viên hỗ trợ.
          </span>
        </div>
      </section>

      <BackToHomeButton variant="mobile" />

      {/* ================= FORM PHẢI ================= */}
      <section className="otp-forgot-form-side">
        <div className="otp-forgot-decoration otp-forgot-decoration-one" />
        <div className="otp-forgot-decoration otp-forgot-decoration-two" />

        <div className="otp-forgot-card-wrapper">
          <div className="otp-forgot-card">
            {/* Logo mobile */}
            <button
              type="button"
              className="otp-forgot-mobile-logo"
              onClick={() => navigate("/")}
              aria-label="Trở về trang chủ"
            >
              <span className="otp-forgot-mobile-logo-frame">
                <img
                  src={otpForgotLogo}
                  alt="Việt Nam Logistic"
                  draggable="false"
                />
              </span>
            </button>

            <div className="otp-forgot-main-icon">
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
                  width="18"
                  height="11"
                  x="3"
                  y="11"
                  rx="2"
                />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <div className="otp-forgot-header">
              <span className="otp-forgot-eyebrow">
                XÁC THỰC TÀI KHOẢN
              </span>

              <h2 className="otp-forgot-title">
                Đặt lại mật khẩu
              </h2>

              <p className="otp-forgot-subtitle">
                Mã xác thực đã được gửi tới địa
                chỉ email:
              </p>

              <div
                className="otp-forgot-email"
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
              onSubmit={handleResetPassword}
              className="otp-forgot-form"
              noValidate
            >
              {/* OTP */}
              <div className="otp-forgot-field">
                <label
                  htmlFor="otp-code"
                  className="otp-forgot-label"
                >
                  Mã OTP
                  <span className="otp-forgot-required">
                    *
                  </span>
                </label>

                <div
                  className={`otp-forgot-input-wrapper otp-forgot-code-wrapper ${
                    errors.otp
                      ? "otp-forgot-input-error"
                      : ""
                  }`}
                >
                  <span className="otp-forgot-input-icon">
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
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpValue}
                    onChange={handleOtpChange}
                    placeholder="Nhập 6 chữ số"
                    className="otp-forgot-input otp-forgot-code-input"
                    disabled={loading}
                    aria-invalid={Boolean(
                      errors.otp
                    )}
                  />

                  <span className="otp-forgot-code-count">
                    {otpValue.length}/6
                  </span>
                </div>

                {errors.otp && (
                  <div className="otp-forgot-error">
                    <span>!</span>
                    {errors.otp}
                  </div>
                )}
              </div>

              {/* Gửi lại OTP */}
              <div className="otp-forgot-resend">
                {countdown > 0 ? (
                  <span className="otp-forgot-countdown">
                    Có thể gửi lại mã sau{" "}
                    <strong>{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="otp-forgot-resend-button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <>
                        <CircularProgress
                          size={15}
                          thickness={4}
                          sx={{
                            color: "#1976b9",
                          }}
                        />
                        Đang gửi lại...
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

                        Gửi lại mã OTP
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Mật khẩu mới */}
              <div className="otp-forgot-field">
                <label
                  htmlFor="new-password"
                  className="otp-forgot-label"
                >
                  Mật khẩu mới
                  <span className="otp-forgot-required">
                    *
                  </span>
                </label>

                <div
                  className={`otp-forgot-input-wrapper otp-forgot-password-wrapper ${
                    errors.password
                      ? "otp-forgot-input-error"
                      : ""
                  }`}
                >
                  <span className="otp-forgot-input-icon">
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
                    id="new-password"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={
                      handleNewPasswordChange
                    }
                    placeholder="Tối thiểu 8 ký tự"
                    className="otp-forgot-input"
                    autoComplete="new-password"
                    disabled={loading}
                    aria-invalid={Boolean(
                      errors.password
                    )}
                  />

                  <button
                    type="button"
                    className="otp-forgot-password-toggle"
                    onClick={() =>
                      setShowNewPassword(
                        (currentValue) =>
                          !currentValue
                      )
                    }
                    aria-label={
                      showNewPassword
                        ? "Ẩn mật khẩu mới"
                        : "Hiện mật khẩu mới"
                    }
                  >
                    {showNewPassword
                      ? "Ẩn"
                      : "Hiện"}
                  </button>
                </div>

                {errors.password && (
                  <div className="otp-forgot-error">
                    <span>!</span>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Xác nhận mật khẩu */}
              <div className="otp-forgot-field">
                <label
                  htmlFor="confirm-password"
                  className="otp-forgot-label"
                >
                  Xác nhận mật khẩu
                  <span className="otp-forgot-required">
                    *
                  </span>
                </label>

                <div
                  className={`otp-forgot-input-wrapper otp-forgot-password-wrapper ${
                    errors.confirmPassword
                      ? "otp-forgot-input-error"
                      : ""
                  }`}
                >
                  <span className="otp-forgot-input-icon">
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
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={
                      handleConfirmPasswordChange
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    className="otp-forgot-input"
                    autoComplete="new-password"
                    disabled={loading}
                    aria-invalid={Boolean(
                      errors.confirmPassword
                    )}
                  />

                  <button
                    type="button"
                    className="otp-forgot-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (currentValue) =>
                          !currentValue
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiện mật khẩu xác nhận"
                    }
                  >
                    {showConfirmPassword
                      ? "Ẩn"
                      : "Hiện"}
                  </button>
                </div>

                {errors.confirmPassword && (
                  <div className="otp-forgot-error">
                    <span>!</span>
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="otp-forgot-submit"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={21}
                      thickness={4}
                      sx={{
                        color: "#ffffff",
                      }}
                    />

                    <span>
                      Đang đặt lại mật khẩu...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Đặt lại mật khẩu
                    </span>

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
                className="otp-forgot-back-button"
                onClick={() =>
                  navigate("/forgot-password")
                }
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

                <span>Quay lại nhập email</span>
              </button>
            </form>

            <div className="otp-forgot-footer">
              <button
                type="button"
                onClick={() =>
                  navigate("/support")
                }
              >
                Hỗ trợ
              </button>

              <span>•</span>

              <button
                type="button"
                onClick={() =>
                  navigate("/privacy")
                }
              >
                Chính sách bảo mật
              </button>

              <span>•</span>

              <button
                type="button"
                onClick={() =>
                  navigate("/terms")
                }
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