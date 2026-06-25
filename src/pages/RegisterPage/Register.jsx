import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { Button, CircularProgress } from "@mui/material";
import { registerApi } from "../../api/Auth/authService"; 
import AuthNotify from "../../utils/AuthNotify"; 
import "./Register.css";

const COUNTRY_LIST = [
  { code: "VN", name: "Vietnam" },
  { code: "US", name: "United States" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
];

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    country: "Vietnam", 
    address: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate(); 

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Nếu là trường số điện thoại, chặn ký tự không phải số và kiểm tra độ dài theo quốc gia
    if (name === "phone") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      const maxLength = formData.country === "Vietnam" ? 10 : 15;
      if (onlyNums.length > maxLength) return;
      
      setFormData((prev) => ({ ...prev, [name]: onlyNums }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    let valid = true;
    let newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
      valid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Định dạng email không hợp lệ.";
        valid = false;
      }
    }

    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
      valid = false;
    } else if (formData.password.length < 8) { 
      newErrors.password = "Mật khẩu phải chứa ít nhất 8 ký tự.";
      valid = false;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
      valid = false;
    } else {
      if (formData.country === "Vietnam" && formData.phone.length !== 10) {
        newErrors.phone = "Số điện thoại tại Việt Nam phải có đúng 10 chữ số.";
        valid = false;
      } else if (formData.phone.length < 8) {
        newErrors.phone = "Số điện thoại không hợp lệ (tối thiểu 8 số).";
        valid = false;
      }
    }

    if (!formData.country) {
      newErrors.country = "Vui lòng chọn quốc gia.";
      valid = false;
    }

    if (!formData.address.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ.";
      valid = false;
    }

    setErrors(newErrors);

    if (!valid) {
      AuthNotify.warning("Cảnh báo", "Vui lòng hoàn thiện đầy đủ các thông tin bắt buộc.");
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      await registerApi(formData);
      AuthNotify.success("Thành công", "Đăng ký tài khoản khách hàng hoàn tất!");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đăng ký không thành công. Vui lòng thử lại.";
      AuthNotify.error("Lỗi đăng ký", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    console.log("Đăng ký bằng Google");
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

      {/* ================= BÊN PHẢI: KHU VỰC BOX NỔI ĐĂNG KÝ ================= */}
      <div className="login-form-side">
        <div className="form-card-glow-wrapper">
          <div className="form-inner-card">
            
            <div className="form-header">
              <h2 className="form-title">Create Account</h2>
              <p className="form-subtitle">Get started with your logistics management dashboard</p>
            </div>

            <button type="button" onClick={handleGoogleRegister} className="google-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.75H24v9h12.75c-.53 2.87-2.13 5.31-4.57 6.95l7.1 5.51C43.43 36.57 46.5 30.95 46.5 24z"/>
                <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.1-5.51c-2.11 1.41-4.8 2.32-8.79 2.32-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign up with Google
            </button>

            <div className="divider">or register with email</div>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              
              {/* Full Name */}
              <div className="input-group">
                <label className="input-label">Full Name <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <div className={`input-wrapper ${errors.fullName ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Enter your full name"
                    className="form-input"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
                {errors.fullName && <div className="error-text-message">{errors.fullName}</div>}
              </div>

              {/* Email address */}
              <div className="input-group">
                <label className="input-label">Email address <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <div className={`input-wrapper ${errors.email ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    className="form-input"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <div className="error-text-message">{errors.email}</div>}
              </div>

              {/* Password */}
              <div className="input-group">
                <label className="input-label">Password <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <div className={`input-wrapper input-wrapper-password ${errors.password ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    className="form-input"
                    value={formData.password}
                    onChange={handleChange}
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

              {/* Phone & Country Dropdown */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                {/* Phone */}
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Phone <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                  <div className={`input-wrapper ${errors.phone ? "input-error-border" : ""}`}>
                    <div className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder={formData.country === "Vietnam" ? "+84 987567234" : "Max 15 digits"}
                      className="form-input"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  {errors.phone && <div className="error-text-message">{errors.phone}</div>}
                </div>

                {/* Country Dropdown */}
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Country <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                  <div className={`input-wrapper ${errors.country ? "input-error-border" : ""}`}>
                    <div className="input-icon-left">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    </div>
                    <select
                      name="country"
                      className="form-input"
                      style={{ paddingLeft: "2.5rem", appearance: "none", background: "transparent", cursor: "pointer" }}
                      value={formData.country}
                      onChange={(e) => {
                        handleChange(e);
                        // Reset lại ô số điện thoại khi đổi quốc gia để tránh lệch độ dài hợp lệ
                        setFormData((prev) => ({ ...prev, phone: "" }));
                      }}
                    >
                      {COUNTRY_LIST.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.country && <div className="error-text-message">{errors.country}</div>}
                </div>
              </div>

              {/* Address */}
              <div className="input-group">
                <label className="input-label">Address <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span></label>
                <div className={`input-wrapper ${errors.address ? "input-error-border" : ""}`}>
                  <div className="input-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 14.25-4.66"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <input
                    type="text"
                    name="address"
                    placeholder="123 Street, District 1..."
                    className="form-input"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
                {errors.address && <div className="error-text-message">{errors.address}</div>}
              </div>

              {/* Submit Button */}
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
                  marginTop: "1rem",
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
                    Sign Up
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </>
                )}
              </Button>
            </form>

            <div className="request-access-box">
              Already have an account?{" "}
              <span 
                className="request-link" 
                onClick={() => navigate("/login")}
                style={{ cursor: "pointer", fontWeight: "600" }}
              >
                Sign In
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

        <div className="system-status-bar">
          <span className="status-dot" />
          System Status: Operational
        </div>

      </div>
    </div>
  );
}