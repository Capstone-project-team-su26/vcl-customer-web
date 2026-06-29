import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";
import { forgotPasswordApi } from "../../api/Auth/authService";
import AuthNotify from "../../utils/AuthNotify";
import "../RegisterPage/Register.css";
import "../LoginPage/Login.css";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Định dạng email không hợp lệ.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) {
      AuthNotify.warning("Cảnh báo", "Vui lòng kiểm tra lại email.");
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPasswordApi(email.trim());
      AuthNotify.success(
        "Đã gửi mã",
        res?.message || "Mã xác thực đã được gửi tới email của bạn."
      );
      setTimeout(() => {
        navigate("/otp-forgot", { state: { email: email.trim() } });
      }, 1000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Không thể gửi mã xác thực. Vui lòng thử lại.";
      AuthNotify.error("Gửi mã thất bại", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div
        className="login-banner"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200&auto=format&fit=crop')`,
        }}
      >
        <div className="banner-overlay" />
        <div className="logo-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <div className="logo-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <span className="logo-text">LogisticsPro</span>
        </div>
        <div className="banner-content">
          <h1 className="banner-title">Recover Your Account</h1>
          <p className="banner-description">
            Enter your registered email and we will send you a verification code to reset your password securely.
          </p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="form-card-glow-wrapper">
          <div className="form-inner-card forgot-card">
            <div className="form-header">
              <h2 className="form-title">Forgot Password</h2>
              <p className="form-subtitle">
                Nhập email đã đăng ký để nhận mã xác thực đặt lại mật khẩu
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className={`input-wrapper ${error ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input
                    type="email"
                    placeholder="name@logisticspro.com"
                    className="form-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                  />
                </div>
                {error && <div className="error-text-message">{error}</div>}
              </div>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="mui-animated-btn"
                sx={{
                  height: "46px",
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                  backgroundColor: "#2563eb",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  gap: "8px",
                  marginTop: "0.5rem",
                  "&:hover": { backgroundColor: "#1d4ed8" },
                }}
              >
                {loading ? (
                  <CircularProgress size={22} sx={{ color: "#ffffff" }} />
                ) : (
                  "Gửi mã xác thực"
                )}
              </Button>

              <button
                type="button"
                className="forgot-back-link"
                onClick={() => navigate("/login")}
              >
                Quay lại đăng nhập
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
