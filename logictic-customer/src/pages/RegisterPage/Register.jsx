import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";

import { registerApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import BackToHomeButton from "../../components/BackToHomeButton";
import registerLogo from "../../assets/anhlogocap2.jpeg";

import "./Register.css";

const COUNTRY_LIST = [
  { code: "VN", value: "Vietnam", label: "Việt Nam" },
  { code: "US", value: "United States", label: "Hoa Kỳ" },
  { code: "SG", value: "Singapore", label: "Singapore" },
  { code: "JP", value: "Japan", label: "Nhật Bản" },
  { code: "KR", value: "South Korea", label: "Hàn Quốc" },
  { code: "CN", value: "China", label: "Trung Quốc" },
  { code: "TH", value: "Thailand", label: "Thái Lan" },
  { code: "MY", value: "Malaysia", label: "Malaysia" },
  { code: "AU", value: "Australia", label: "Úc" },
  { code: "DE", value: "Germany", label: "Đức" },
  { code: "FR", value: "France", label: "Pháp" },
  { code: "GB", value: "United Kingdom", label: "Vương quốc Anh" },
];

const INITIAL_FORM = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  country: "Vietnam",
  address: "",
};

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const clearFieldError = (fieldName) => {
    if (!errors[fieldName]) return;

    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: "",
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      const onlyNumbers = value.replace(/\D/g, "");

      const maxLength =
        formData.country === "Vietnam" ? 10 : 15;

      if (onlyNumbers.length > maxLength) return;

      setFormData((currentData) => ({
        ...currentData,
        phone: onlyNumbers,
      }));

      clearFieldError("phone");
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    clearFieldError(name);
  };

  const handleCountryChange = (event) => {
    const selectedCountry = event.target.value;

    setFormData((currentData) => ({
      ...currentData,
      country: selectedCountry,
      phone: "",
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      country: "",
      phone: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const address = formData.address.trim();
    const phone = formData.phone.trim();

    if (!fullName) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (fullName.length < 2) {
      newErrors.fullName =
        "Họ và tên phải có ít nhất 2 ký tự.";
    }

    if (!email) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        newErrors.email =
          "Địa chỉ email không đúng định dạng.";
      }
    }

    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Mật khẩu phải chứa ít nhất 8 ký tự.";
    }

    if (!formData.country) {
      newErrors.country = "Vui lòng chọn quốc gia.";
    }

    if (!phone) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (
      formData.country === "Vietnam" &&
      phone.length !== 10
    ) {
      newErrors.phone =
        "Số điện thoại Việt Nam phải có đúng 10 chữ số.";
    } else if (
      formData.country !== "Vietnam" &&
      (phone.length < 8 || phone.length > 15)
    ) {
      newErrors.phone =
        "Số điện thoại phải có từ 8 đến 15 chữ số.";
    }

    if (!address) {
      newErrors.address = "Vui lòng nhập địa chỉ.";
    } else if (address.length < 5) {
      newErrors.address =
        "Địa chỉ phải có ít nhất 5 ký tự.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      AuthNotify.warning(
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra lại các trường được đánh dấu."
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !validateForm()) return;

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      country: formData.country,
      address: formData.address.trim(),
    };

    try {
      setLoading(true);

      await registerApi(payload);

      AuthNotify.success(
        "Đăng ký thành công",
        "Tài khoản của bạn đã được tạo. Vui lòng xác thực mã OTP."
      );

      setTimeout(() => {
        navigate("/verify-otp", {
          state: {
            email: payload.email,
          },
        });
      }, 1200);
    } catch (error) {
      console.error("Lỗi đăng ký:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        "Đăng ký không thành công. Vui lòng thử lại.";

      AuthNotify.error(
        "Đăng ký thất bại",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    AuthNotify.warning(
      "Thông báo",
      "Chức năng đăng ký bằng Google đang được phát triển."
    );
  };

  return (
    <main className="register-page">
      {/* Bên trái */}
      <section
        className="register-banner"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=85&w=1600&auto=format&fit=crop')",
        }}
      >
        <div className="register-banner-overlay" />
        <div className="register-banner-pattern" />

        <BackToHomeButton variant="banner" />

        <button
          type="button"
          className="register-brand"
          onClick={() => navigate("/")}
          aria-label="Trở về trang chủ"
        >
          <span className="register-brand-frame">
            <img
              src={registerLogo}
              alt="Việt Nam Logistic"
              draggable="false"
            />
          </span>
        </button>

        <div className="register-banner-content">
          <span className="register-banner-eyebrow">
            VIỆT NAM LOGISTIC
          </span>

          <h1 className="register-banner-title">
            Bắt đầu hành trình vận chuyển thông minh.
          </h1>

          <p className="register-banner-description">
            Tạo tài khoản để quản lý đơn hàng, theo dõi vận
            chuyển theo thời gian thực và kết nối với hệ
            thống logistics toàn diện.
          </p>

          <div className="register-benefit-list">
            <div className="register-benefit-item">
              <span>✓</span>
              Theo dõi đơn hàng mọi lúc, mọi nơi
            </div>

            <div className="register-benefit-item">
              <span>✓</span>
              Quản lý thông tin vận chuyển tập trung
            </div>

            <div className="register-benefit-item">
              <span>✓</span>
              Nhận thông báo trạng thái nhanh chóng
            </div>
          </div>
        </div>

        <div className="register-banner-stats">
          <div className="register-stat-item">
            <strong>2.4M+</strong>
            <span>Đơn hàng đã theo dõi</span>
          </div>

          <div className="register-stat-divider" />

          <div className="register-stat-item">
            <strong>99.9%</strong>
            <span>Độ ổn định hệ thống</span>
          </div>

          <div className="register-stat-divider" />

          <div className="register-stat-item">
            <strong>24/7</strong>
            <span>Hỗ trợ khách hàng</span>
          </div>
        </div>
      </section>

      <BackToHomeButton variant="mobile" />

      {/* Bên phải */}
      <section className="register-form-side">
        <div className="register-decoration register-decoration-one" />
        <div className="register-decoration register-decoration-two" />

        <div className="register-card-wrapper">
          <div className="register-card">
            <button
              type="button"
              className="register-mobile-logo"
              onClick={() => navigate("/")}
              aria-label="Trở về trang chủ"
            >
              <span className="register-mobile-logo-frame">
                <img
                  src={registerLogo}
                  alt="Việt Nam Logistic"
                  draggable="false"
                />
              </span>
            </button>

            <div className="register-form-header">
              <span className="register-form-eyebrow">
                TẠO TÀI KHOẢN MỚI
              </span>

              <h2 className="register-form-title">
                Đăng ký tài khoản
              </h2>

              <p className="register-form-subtitle">
                Hoàn tất thông tin bên dưới để sử dụng hệ
                thống quản lý logistics.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="register-form"
              noValidate
            >
              {/* Họ tên */}
              <div className="register-field">
                <label
                  htmlFor="register-full-name"
                  className="register-label"
                >
                  Họ và tên
                  <span className="register-required">*</span>
                </label>

                <div
                  className={`register-input-wrapper ${
                    errors.fullName
                      ? "register-input-error"
                      : ""
                  }`}
                >
                  <span className="register-input-icon">
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
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>

                  <input
                    id="register-full-name"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên"
                    className="register-input"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>

                {errors.fullName && (
                  <div className="register-error-message">
                    <span>!</span>
                    {errors.fullName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="register-field">
                <label
                  htmlFor="register-email"
                  className="register-label"
                >
                  Địa chỉ email
                  <span className="register-required">*</span>
                </label>

                <div
                  className={`register-input-wrapper ${
                    errors.email
                      ? "register-input-error"
                      : ""
                  }`}
                >
                  <span className="register-input-icon">
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
                    id="register-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Nhập địa chỉ email"
                    className="register-input"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                {errors.email && (
                  <div className="register-error-message">
                    <span>!</span>
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Mật khẩu */}
              <div className="register-field">
                <label
                  htmlFor="register-password"
                  className="register-label"
                >
                  Mật khẩu
                  <span className="register-required">*</span>
                </label>

                <div
                  className={`register-input-wrapper register-password-wrapper ${
                    errors.password
                      ? "register-input-error"
                      : ""
                  }`}
                >
                  <span className="register-input-icon">
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
                    id="register-password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu tối thiểu 8 ký tự"
                    className="register-input"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (currentValue) => !currentValue
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
                  <div className="register-error-message">
                    <span>!</span>
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Điện thoại và quốc gia */}
              <div className="register-field-row">
                <div className="register-field">
                  <label
                    htmlFor="register-phone"
                    className="register-label"
                  >
                    Số điện thoại
                    <span className="register-required">
                      *
                    </span>
                  </label>

                  <div
                    className={`register-input-wrapper ${
                      errors.phone
                        ? "register-input-error"
                        : ""
                    }`}
                  >
                    <span className="register-input-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>

                    <input
                      id="register-phone"
                      type="tel"
                      inputMode="numeric"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder={
                        formData.country === "Vietnam"
                          ? "Ví dụ: 0987654321"
                          : "Từ 8 đến 15 chữ số"
                      }
                      className="register-input"
                      autoComplete="tel"
                      disabled={loading}
                    />
                  </div>

                  {errors.phone && (
                    <div className="register-error-message">
                      <span>!</span>
                      {errors.phone}
                    </div>
                  )}
                </div>

                <div className="register-field">
                  <label
                    htmlFor="register-country"
                    className="register-label"
                  >
                    Quốc gia
                    <span className="register-required">
                      *
                    </span>
                  </label>

                  <div
                    className={`register-input-wrapper register-select-wrapper ${
                      errors.country
                        ? "register-input-error"
                        : ""
                    }`}
                  >
                    <span className="register-input-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="19"
                        height="19"
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
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                    </span>

                    <select
                      id="register-country"
                      name="country"
                      value={formData.country}
                      onChange={handleCountryChange}
                      className="register-input register-select"
                      disabled={loading}
                    >
                      {COUNTRY_LIST.map((country) => (
                        <option
                          key={country.code}
                          value={country.value}
                        >
                          {country.label}
                        </option>
                      ))}
                    </select>

                    <span className="register-select-arrow">
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
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </div>

                  {errors.country && (
                    <div className="register-error-message">
                      <span>!</span>
                      {errors.country}
                    </div>
                  )}
                </div>
              </div>

              {/* Địa chỉ */}
              <div className="register-field">
                <label
                  htmlFor="register-address"
                  className="register-label"
                >
                  Địa chỉ
                  <span className="register-required">*</span>
                </label>

                <div
                  className={`register-input-wrapper ${
                    errors.address
                      ? "register-input-error"
                      : ""
                  }`}
                >
                  <span className="register-input-icon">
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
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                      <circle
                        cx="12"
                        cy="10"
                        r="3"
                      />
                    </svg>
                  </span>

                  <input
                    id="register-address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Nhập địa chỉ nhận hàng"
                    className="register-input"
                    autoComplete="street-address"
                    disabled={loading}
                  />
                </div>

                {errors.address && (
                  <div className="register-error-message">
                    <span>!</span>
                    {errors.address}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="register-submit-button"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={21}
                      thickness={4}
                      sx={{ color: "#ffffff" }}
                    />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>

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

              <div className="register-divider">
                Hoặc đăng ký với
              </div>

              <button
                type="button"
                className="register-google-button"
                onClick={handleGoogleRegister}
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

                <span>Đăng ký bằng Google</span>
              </button>
            </form>

            <div className="register-login-box">
              <span>Bạn đã có tài khoản?</span>

              <button
                type="button"
                onClick={() => navigate("/login")}
              >
                Đăng nhập ngay
              </button>
            </div>

            <div className="register-footer-links">
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