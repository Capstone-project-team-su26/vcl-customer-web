import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";

import { loginApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import BackToHomeButton from "../../components/BackToHomeButton";
import loginLogo from "../../assets/anhlogocap2.jpeg";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const rememberedEmail =
    localStorage.getItem("rememberedEmail") || "";

  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    Boolean(rememberedEmail)
  );
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    let valid = true;
    const emailValue = email.trim();

    if (!emailValue) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(emailValue)) {
        newErrors.email = "Địa chỉ email không hợp lệ.";
        valid = false;
      }
    }

    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password =
        "Mật khẩu phải chứa ít nhất 6 ký tự.";
      valid = false;
    }

    setErrors(newErrors);

    if (!valid) {
      AuthNotify.warning(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại các trường được đánh dấu."
      );
    }

    return valid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const emailValue = email.trim();
      const userData = await loginApi(
        emailValue,
        password
      );

      if (userData && typeof userData === "object") {
        sessionStorage.setItem(
          "user",
          JSON.stringify(userData)
        );

        sessionStorage.setItem("email", emailValue);
      }

      if (rememberMe) {
        localStorage.setItem(
          "rememberedEmail",
          emailValue
        );
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      AuthNotify.success(
        "Đăng nhập thành công",
        "Chào mừng bạn quay trở lại!"
      );

      setTimeout(() => {
        navigate("/customer/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Email hoặc mật khẩu không chính xác.";

      AuthNotify.error(
        "Đăng nhập thất bại",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (errors.email) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: "",
      }));
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    if (errors.password) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        password: "",
      }));
    }
  };

  const handleGoogleLogin = () => {
    AuthNotify.warning(
      "Thông báo",
      "Chức năng đăng nhập bằng Google đang được phát triển."
    );
  };

  return (
    <main className="login-container">
      {/* ================= BANNER BÊN TRÁI ================= */}
      <section
        className="login-banner"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1600&auto=format&fit=crop')",
        }}
      >
        <div className="banner-overlay" />
        <div className="banner-pattern" />

        <BackToHomeButton variant="banner" />

        {/* Logo trên desktop */}
        <button
          type="button"
          className="logo-wrapper"
          onClick={() => navigate("/")}
          aria-label="Trở về trang chủ"
        >
          <span className="brand-logo-box">
            <img
              src={loginLogo}
              alt="Việt Nam Logistic"
              className="brand-logo-image"
              draggable="false"
            />
          </span>
        </button>

        <div className="banner-content">
          <span className="banner-eyebrow">
            VIỆT NAM LOGISTIC
          </span>

          <h1 className="banner-title">
            Vận hành chuỗi cung ứng thông minh.
          </h1>

          <p className="banner-description">
            Theo dõi đơn hàng theo thời gian thực, tối ưu
            quá trình vận chuyển và quản lý mọi hành trình
            trên một nền tảng duy nhất.
          </p>

          <div className="banner-feature-list">
            <div className="banner-feature-item">
              <span>✓</span>
              Theo dõi đơn hàng nhanh chóng
            </div>

            <div className="banner-feature-item">
              <span>✓</span>
              Quản lý vận chuyển tập trung
            </div>

            <div className="banner-feature-item">
              <span>✓</span>
              Hỗ trợ khách hàng chuyên nghiệp
            </div>
          </div>
        </div>

        <div className="banner-stats">
          <div className="stat-item">
            <div className="stat-number">2.4M+</div>
            <div className="stat-label">
              Đơn hàng đã theo dõi
            </div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-number">99.9%</div>
            <div className="stat-label">
              Độ ổn định hệ thống
            </div>
          </div>

          <div className="stat-divider" />

          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">
              Hỗ trợ khách hàng
            </div>
          </div>
        </div>
      </section>

      {/* Nút về trang chủ trên mobile */}
      <BackToHomeButton variant="mobile" />

      {/* ================= FORM BÊN PHẢI ================= */}
      <section className="login-form-side">
        <div className="form-decoration decoration-one" />
        <div className="form-decoration decoration-two" />

        <div className="form-card-glow-wrapper">
          <div className="form-inner-card">
            {/* Logo trên tablet và mobile */}
            <button
              type="button"
              className="mobile-login-logo"
              onClick={() => navigate("/")}
              aria-label="Trở về trang chủ"
            >
              <span className="mobile-login-logo-box">
                <img
                  src={loginLogo}
                  alt="Việt Nam Logistic"
                  draggable="false"
                />
              </span>
            </button>

            <div className="form-header">
              <span className="form-eyebrow">
                CHÀO MỪNG TRỞ LẠI
              </span>

              <h2 className="form-title">
                Đăng nhập tài khoản
              </h2>

              <p className="form-subtitle">
                Nhập thông tin tài khoản để truy cập hệ
                thống quản lý logistics.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="auth-form"
              noValidate
            >
              {/* Email */}
              <div className="input-group">
                <label
                  htmlFor="login-email"
                  className="input-label"
                >
                  Địa chỉ email
                </label>

                <div
                  className={`input-wrapper ${
                    errors.email
                      ? "input-error-border"
                      : ""
                  }`}
                >
                  <span className="input-icon-left">
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
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="Nhập địa chỉ email"
                    className="form-input"
                    value={email}
                    onChange={handleEmailChange}
                    autoComplete="email"
                    disabled={loading}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email
                        ? "login-email-error"
                        : undefined
                    }
                  />
                </div>

                {errors.email && (
                  <div
                    id="login-email-error"
                    className="error-text-message"
                  >
                    <span className="error-icon">!</span>
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Mật khẩu */}
              <div className="input-group">
                <div className="password-options-row">
                  <label
                    htmlFor="login-password"
                    className="input-label"
                  >
                    Mật khẩu
                  </label>

                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() =>
                      navigate("/forgot-password")
                    }
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div
                  className={`input-wrapper input-wrapper-password ${
                    errors.password
                      ? "input-error-border"
                      : ""
                  }`}
                >
                  <span className="input-icon-left">
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
                        ry="2"
                      />

                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>

                  <input
                    id="login-password"
                    name="password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Nhập mật khẩu"
                    className="form-input"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="current-password"
                    disabled={loading}
                    aria-invalid={Boolean(
                      errors.password
                    )}
                    aria-describedby={
                      errors.password
                        ? "login-password-error"
                        : undefined
                    }
                  />

                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Ẩn mật khẩu"
                        : "Hiện mật khẩu"
                    }
                  >
                    {showPassword ? (
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
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />

                        <line
                          x1="2"
                          x2="22"
                          y1="2"
                          y2="22"
                        />
                      </svg>
                    ) : (
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
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />

                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {errors.password && (
                  <div
                    id="login-password-error"
                    className="error-text-message"
                  >
                    <span className="error-icon">!</span>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Ghi nhớ tài khoản */}
              <div className="remember-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />

                  <span className="custom-checkbox">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </span>

                  <span>Ghi nhớ tài khoản</span>
                </label>
              </div>

              {/* Nút đăng nhập */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="mui-animated-btn"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={21}
                      thickness={4}
                      sx={{ color: "#ffffff" }}
                    />

                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng nhập</span>

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

              <div className="divider">
                Hoặc tiếp tục với
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="google-btn"
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />

                  <path
                    fill="#4285F4"
                    d="M46.5 24c0-1.55-.15-3.24-.47-4.75H24v9h12.75c-.53 2.87-2.13 5.31-4.57 6.95l7.1 5.51C43.43 36.57 46.5 30.95 46.5 24z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.98-6.19z"
                  />

                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.1-5.51C30.68 38.09 27.99 39 24 39c-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>

                <span>Đăng nhập bằng Google</span>
              </button>
            </form>

            <div className="request-access-box">
              <span>Bạn chưa có tài khoản?</span>

              <button
                type="button"
                className="request-link"
                onClick={() => navigate("/register")}
              >
                Đăng ký ngay
              </button>
            </div>

            <div className="form-footer-links">
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