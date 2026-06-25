import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { Button, CircularProgress } from "@mui/material"; // Thư viện MUI
import { loginApi } from "../../api/Auth/authService"; 
import AuthNotify from "../../utils/AuthNotify"; 
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false); 
  
  // State quản lý thông báo lỗi hiển thị dưới input
  const [errors, setErrors] = useState({ email: "", password: "" });

  const navigate = useNavigate(); 

  const validateForm = () => {
    let valid = true;
    let newErrors = { email: "", password: "" };

    // Validate Email
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Định dạng email không hợp lệ.";
        valid = false;
      }
    }

    // Validate Password
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
      valid = false;
    } else if (password.length < 3) {
      newErrors.password = "Mật khẩu phải chứa ít nhất 6 ký tự.";
      valid = false;
    }

    setErrors(newErrors);

    if (!valid) {
      AuthNotify.warning("Cảnh báo", "Vui lòng kiểm tra lại thông tin nhập liệu.");
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const userData = await loginApi(email, password);
      console.log("DỮ LIỆU THỰC TẾ TỪ API TRẢ VỀ:", userData);
      
      // Kiểm tra userData hợp lệ và không phải undefined
      if (userData && typeof userData === 'object') {
        sessionStorage.setItem("user", JSON.stringify(userData));
        sessionStorage.setItem("email", email);
      }
      
      AuthNotify.success("Đăng nhập thành công", "Chào mừng bạn quay trở lại!");
      
      setTimeout(() => {
        navigate("/customer/dashboard"); 
      }, 1000);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Email hoặc mật khẩu không chính xác.";
      AuthNotify.error("Đăng nhập thất bại", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log("Đăng nhập bằng Google");
  };

  return (
    <div className="login-container">
      {/* ================= BÊN TRÁI: BANNER THƯƠNG HIỆU ================= */}
      <div 
        className="login-banner"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200&auto=format&fit=crop')` }}
      >
        <div className="banner-overlay" />

        <div className="logo-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <div className="logo-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <span className="logo-text">LogisticsPro</span>
        </div>

        <div className="banner-content">
          <h1 className="banner-title">Global Supply Chain Intelligence.</h1>
          <p className="banner-description">
            Empowering operators with real-time visibility, predictive analytics, and seamless coordination across every mile of the journey.
          </p>
        </div>

        <div className="banner-stats">
          <div>
            <div className="stat-number">2.4M</div>
            <div className="stat-label">Shipments Tracked</div>
          </div>
          <div>
            <div className="stat-number">99.9%</div>
            <div className="stat-label">Uptime Reliability</div>
          </div>
        </div>
      </div>

      {/* ================= BÊN PHẢI: KHU VỰC BOX NỔI ĐĂNG NHẬP ================= */}
      <div className="login-form-side">
        <div className="form-card-glow-wrapper">
          <div className="form-inner-card">
            
            <div className="form-header">
              <h2 className="form-title">Welcome Back</h2>
              <p className="form-subtitle">Please enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {/* Input Email */}
              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className={`input-wrapper ${errors.email ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input
                    type="email"
                    placeholder="name@logisticspro.com"
                    className="form-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if(errors.email) setErrors({...errors, email: ""});
                    }}
                  />
                </div>
                {errors.email && <div className="error-text-message">{errors.email}</div>}
              </div>

              {/* Input Password */}
              <div className="input-group">
                <div className="password-options-row">
                  <label className="input-label">Password</label>
                  <span onClick={() => navigate("/forgot-password")} className="forgot-password-link" style={{ cursor: "pointer" }}>Forgot Password?</span>
                </div>
                <div className={`input-wrapper input-wrapper-password ${errors.password ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="form-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if(errors.password) setErrors({...errors, password: ""});
                    }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {errors.password && <div className="error-text-message">{errors.password}</div>}
              </div>

              {/* Remember Me */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember Me
                </label>
              </div>

              {/* Nút Đăng nhập */}
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
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": {
                    backgroundColor: "#1d4ed8",
                    boxShadow: "0 6px 16px rgba(37, 99, 235, 0.4)",
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={22} sx={{ color: "#ffffff" }} />
                ) : (
                  <>
                    Sign In
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </>
                )}
              </Button>

              <div className="divider">or sign in with email</div>

              <button type="button" onClick={handleGoogleLogin} className="google-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6 l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.75H24v9h12.75c-.53 2.87-2.13 5.31-4.57 6.95l7.1 5.51C43.43 36.57 46.5 30.95 46.5 24z"/>
                  <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.1-5.51c-2.11 1.41-4.8 2.32-8.79 2.32-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </button>
            </form>

            <div className="request-access-box">
              Don't have an account?{" "}
              <span 
                className="request-link" 
                onClick={() => navigate("/register")}
                style={{ cursor: "pointer", fontWeight: "600" }}
              >
                Register
              </span>
            </div>

            <div className="form-footer-links">
              <span onClick={() => navigate("/support")} style={{ cursor: "pointer" }}>Support</span>
              <span>•</span>
              <span onClick={() => navigate("/privacy")} style={{ cursor: "pointer" }}>Privacy Policy</span>
              <span>•</span>
              <span onClick={() => navigate("/terms")} style={{ cursor: "pointer" }}>Terms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}