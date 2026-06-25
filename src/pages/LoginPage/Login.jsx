import React, { useState } from 'react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Đăng nhập bằng Email:", { email, password, rememberMe });
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

        {/* Logo */}
        <div className="logo-wrapper">
          <div className="logo-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </div>
          <span className="logo-text">LogisticsPro</span>
        </div>

        {/* Slogan */}
        <div className="banner-content">
          <h1 className="banner-title">Global Supply Chain Intelligence.</h1>
          <p className="banner-description">
            Empowering operators with real-time visibility, predictive analytics, and seamless coordination across every mile of the journey.
          </p>
        </div>

        {/* Stats */}
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
        
        {/* CHIẾC BOX TRẮNG NỔI CHỨA FORM */}
        <div className="form-inner-card">
          
          <div className="form-header">
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Please enter your credentials to access your dashboard</p>
          </div>

  

          {/* FORM CHÍNH ĐĂNG NHẬP */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Input Email */}
            <div className="input-group">
              <label className="input-label">Email address</label>
              <div className="input-wrapper">
                <div className="input-icon-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@logisticspro.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="input-group">
              <div className="password-options-row">
                <label className="input-label">Password</label>
                <a href="#forgot" className="forgot-password-link">Forgot Password?</a>
              </div>
              <div className="input-wrapper input-wrapper-password">
                <div className="input-icon-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Remember Me */}
            <div>
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

            {/* Button Sign In */}
            <button type="submit" className="submit-btn">
              Sign In
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
                {/* ĐƯỜNG CHIA HOẶC (OR) */}
          <div className="divider">or sign in with email</div>
                    {/* NÚT ĐĂNG NHẬP GOOGLE VỚI ICON 4 MÀU CHUẨN GOOGLE */}
          <button type="button" onClick={handleGoogleLogin} className="google-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.55-.15-3.24-.47-4.75H24v9h12.75c-.53 2.87-2.13 5.31-4.57 6.95l7.1 5.51C43.43 36.57 46.5 30.95 46.5 24z"/>
              <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.1-5.51c-2.11 1.41-4.8 2.32-8.79 2.32-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>

      
          </form>

          {/* Bottom Links */}
          <div className="request-access-box">
            Don't have an account?{' '}
            <a href="#request" className="request-link">Request access</a>
          </div>

          <div className="form-footer-links">
            <a href="#support">Support</a>
            <span>•</span>
            <a href="#privacy">Privacy Policy</a>
            <span>•</span>
            <a href="#terms">Terms</a>
          </div>
        </div>

        {/* System Status */}
        <div className="system-status-bar">
          <span className="status-dot" />
          System Status: Operational
        </div>

      </div>
    </div>
  );
}