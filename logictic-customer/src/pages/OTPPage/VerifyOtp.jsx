import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; 
import { Button, CircularProgress } from "@mui/material";
import { verifyOtpApi, resendOtpApi } from "../../api/Auth/authService"; 
import AuthNotify from "../../utils/AuthNotify"; 
import "./VerifyOtp.css"; 

export default function VerifyOtp() {
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false); 
  const [countdown, setCountdown] = useState(60); 

  const navigate = useNavigate();
  const location = useLocation();

  // Nhận email được đính kèm từ màn hình Register chuyển sang
  const email = location.state?.email || "";

  // Bộ đếm ngược tự động kích hoạt để chặn spam click gửi lại liên tục
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Bảo vệ Router: Nếu reload trang hoặc cố tình vào thẳng /verify-otp mà ko có email -> đẩy về register
  useEffect(() => {
    if (!email) {
      AuthNotify.error("Lỗi hệ thống", "Không tìm thấy thông tin email xác thực. Vui lòng đăng ký lại.");
      navigate("/register");
    }
  }, [email, navigate]);

  // Xử lý nút bấm Xác thực tài khoản
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otpValue || otpValue.length < 6) {
      AuthNotify.warning("Cảnh báo", "Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.");
      return;
    }

    try {
      setLoading(true);
      await verifyOtpApi(email, otpValue);
      AuthNotify.success("Thành công", "Xác thực tài khoản thành công!");
      
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.";
      AuthNotify.error("Lỗi xác thực", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý nút bấm Gửi lại mã OTP
  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
      await resendOtpApi(email);
      AuthNotify.success("Thành công", "Mã OTP mới đã được gửi lại vào hòm thư!");
      setCountdown(60); // Đặt lại bộ đếm thời gian chờ 60 giây
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Gửi lại OTP thất bại. Vui lòng thử lại sau.";
      AuthNotify.error("Lỗi hệ thống", errorMsg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="otp-screen-container">
      
      {/* ================= BÊN TRÁI: BANNER THƯƠNG HIỆU ================= */}
      <div 
        className="otp-screen-banner"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200&auto=format&fit=crop')` }}
      >
        <div className="otp-banner-overlay" />
        <div className="otp-logo-wrapper" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <div className="otp-logo-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <span className="otp-logo-text">VCL</span>
        </div>
        <div className="otp-banner-content">
          <h1 className="otp-banner-title">Global Supply Chain Intelligence.</h1>
          <p className="otp-banner-description">
            Empowering operators with real-time visibility, predictive analytics, and seamless coordination across every mile of the journey.
          </p>
        </div>
      </div>

      {/* ================= BÊN PHẢI: KHU VỰC NHẬP MÃ OTP (CHỈ NHẬP OTP) ================= */}
      <div className="otp-form-side">
        <div className="otp-card-glow-wrapper">
          <div className="otp-inner-card">
            
            <div className="otp-form-header">
              <h2 className="otp-form-title">Security Verification</h2>
              <p className="otp-form-subtitle">
                We have sent a 6-digit validation code to your registered email:
              </p>
              {/* Hiển thị tĩnh email ở đây, chữ đậm nổi bật */}
              <div className="otp-display-email">{email}</div>
            </div>

            <form onSubmit={handleVerifyOtp} className="otp-auth-form" noValidate>
              
              {/* Ô Nhập Mã OTP duy nhất */}
              <div className="otp-input-group">
                <label className="otp-input-label">One-Time Password (OTP) <span className="otp-required-star">*</span></label>
                <div className="otp-input-wrapper">
                  <div className="otp-icon-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    className="otp-form-input input-code-style"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              </div>

              {/* Hàng xử lý Gửi lại mã code ngay dưới input */}
              <div className="otp-resend-wrapper">
                {countdown > 0 ? (
                  <span className="countdown-text">
                    Resend code in <b>{countdown}s</b>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="resend-action-btn"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                  >
                    {resendLoading ? <CircularProgress size={14} sx={{ color: "#2563eb" }} /> : "Resend Code"}
                  </button>
                )}
              </div>

              {/* Nút bấm Xác nhận */}
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
                  "&:hover": { 
                    backgroundColor: "#059669",
                    boxShadow: "0 6px 16px rgba(16, 185, 129, 0.4)",
                  }
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#ffffff" }} /> : "Verify Account"}
              </Button>

              <button 
                type="button" 
                className="otp-back-btn" 
                onClick={() => navigate("/register")}
              >
                Back to Sign Up
              </button>
            </form>

            <div className="otp-form-footer">
              <span onClick={() => navigate("/support")}>Support</span>
              <span>•</span>
              <span onClick={() => navigate("/privacy")}>Privacy Policy</span>
            </div>
          </div>
        </div>

        <div className="otp-status-bar">
          <span className="otp-status-dot" />
          System Status: Operational
        </div>
      </div>
    </div>
  );
}