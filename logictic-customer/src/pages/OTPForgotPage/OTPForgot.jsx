import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";
import { forgotPasswordApi, resetPasswordApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import "../OTPPage/VerifyOtp.css";
import "./OTPForgot.css";

export default function OTPForgot() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem("forgotEmail") || "";

  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errors, setErrors] = useState({ otp: "", password: "", confirm: "" });

  useEffect(() => {
    if (email) {
      sessionStorage.setItem("forgotEmail", email);
    }
  }, [email]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!email) {
      AuthNotify.error("Lỗi hệ thống", "Không tìm thấy email. Vui lòng thử lại từ đầu.");
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  const validateForm = () => {
    const nextErrors = { otp: "", password: "", confirm: "" };
    let valid = true;

    if (!otpValue || otpValue.length < 6) {
      nextErrors.otp = "Vui lòng nhập mã OTP gồm 6 chữ số.";
      valid = false;
    }
    if (!newPassword || newPassword.length < 6) {
      nextErrors.password = "Mật khẩu mới phải có ít nhất 6 ký tự.";
      valid = false;
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirm = "Mật khẩu xác nhận không khớp.";
      valid = false;
    }

    setErrors(nextErrors);
    return valid;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      AuthNotify.warning("Cảnh báo", "Vui lòng kiểm tra lại thông tin.");
      return;
    }

    try {
      setLoading(true);
      const res = await resetPasswordApi(email, otpValue, newPassword);
      sessionStorage.removeItem("forgotEmail");
      AuthNotify.success(
        "Thành công",
        res?.message || "Đặt lại mật khẩu thành công!"
      );
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Mã OTP không đúng hoặc đã hết hạn.";
      AuthNotify.error("Đặt lại mật khẩu thất bại", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      await forgotPasswordApi(email);
      AuthNotify.success("Đã gửi lại", "Mã OTP mới đã được gửi tới email của bạn.");
      setCountdown(60);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gửi lại mã thất bại. Vui lòng thử lại.";
      AuthNotify.error("Lỗi hệ thống", msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-screen-container">
      <div
        className="otp-screen-banner"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200&auto=format&fit=crop')`,
        }}
      >
        <div className="otp-banner-overlay" />
        <div className="otp-logo-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <div className="otp-logo-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <span className="otp-logo-text">VCL</span>
        </div>
        <div className="otp-banner-content">
          <h1 className="otp-banner-title">Reset Your Password</h1>
          <p className="otp-banner-description">
            Enter the verification code sent to your email and choose a new password.
          </p>
        </div>
      </div>

      <div className="otp-form-side">
        <div className="otp-card-glow-wrapper">
          <div className="otp-inner-card">
            <div className="otp-form-header">
              <h2 className="otp-form-title">Đặt lại mật khẩu</h2>
              <p className="otp-form-subtitle">Mã xác thực đã được gửi tới email:</p>
              <div className="otp-display-email">{email}</div>
            </div>

            <form onSubmit={handleResetPassword} className="otp-auth-form" noValidate>
              <div className="otp-input-group">
                <label className="otp-input-label">
                  Mã OTP <span className="otp-required-star">*</span>
                </label>
                <div className={`otp-input-wrapper ${errors.otp ? "otp-input-error" : ""}`}>
                  <div className="otp-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    className="otp-form-input input-code-style"
                    value={otpValue}
                    onChange={(e) => {
                      setOtpValue(e.target.value.replace(/[^0-9]/g, ""));
                      if (errors.otp) setErrors({ ...errors, otp: "" });
                    }}
                  />
                </div>
                {errors.otp && <div className="otp-error-text">{errors.otp}</div>}
              </div>

              <div className="otp-resend-wrapper">
                {countdown > 0 ? (
                  <span className="countdown-text">
                    Gửi lại mã sau <b>{countdown}s</b>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="resend-action-btn"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <CircularProgress size={14} sx={{ color: "#2563eb" }} />
                    ) : (
                      "Gửi lại mã OTP"
                    )}
                  </button>
                )}
              </div>

              <div className="otp-input-group">
                <label className="otp-input-label">
                  Mật khẩu mới <span className="otp-required-star">*</span>
                </label>
                <div className={`otp-input-wrapper otp-password-wrapper ${errors.password ? "otp-input-error" : ""}`}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu mới"
                    className="otp-form-input"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: "" });
                    }}
                  />
                  <button
                    type="button"
                    className="otp-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                {errors.password && <div className="otp-error-text">{errors.password}</div>}
              </div>

              <div className="otp-input-group">
                <label className="otp-input-label">
                  Xác nhận mật khẩu <span className="otp-required-star">*</span>
                </label>
                <div className={`otp-input-wrapper ${errors.confirm ? "otp-input-error" : ""}`}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu mới"
                    className="otp-form-input"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirm) setErrors({ ...errors, confirm: "" });
                    }}
                  />
                </div>
                {errors.confirm && <div className="otp-error-text">{errors.confirm}</div>}
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  height: "46px",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                  backgroundColor: "#10b981",
                  gap: "8px",
                  marginTop: "0.5rem",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                  "&:hover": { backgroundColor: "#059669" },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} sx={{ color: "#ffffff" }} />
                ) : (
                  "Đặt lại mật khẩu"
                )}
              </Button>

              <button
                type="button"
                className="otp-back-btn"
                onClick={() => navigate("/forgot-password")}
              >
                Quay lại nhập email
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
