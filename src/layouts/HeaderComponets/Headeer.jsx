import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // 1. Import hook điều hướng
import "./Header.css";
import logo from "../../assets/hero.png";
import {
  SearchOutlined,
  DownOutlined,
  RightOutlined,
  FileTextOutlined,
  LoginOutlined,
  UserAddOutlined,
  GlobalOutlined, // Thêm icon quả địa cầu để làm nút chuyển ngôn ngữ
} from "@ant-design/icons";

const Header = () => {
  const [showService, setShowService] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate(); // 2. Khởi tạo hàm điều hướng

  // State theo dõi ngôn ngữ hiển thị trên nút bấm (VI hoặc EN)
  const [currentLang, setCurrentLang] = useState("VI");

  // =========================================================
  // HÀM TỰ ĐỘNG CHUYỂN NGÔN NGỮ TOÀN TRANG SỬ DỤNG GOOGLE SCRIPT
// =========================================================
// HÀM TỰ ĐỘNG CHUYỂN NGÔN NGỮ TOÀN TRANG (FIX HOÀN TOÀN)
// =========================================================
// =========================================================
// HÀM TỰ ĐỘNG CHUYỂN NGÔN NGỮ TOÀN TRANG (CÁCH DÙNG COOKIE)
// =========================================================
const toggleLanguage = () => {
  const nextLang = currentLang === "VI" ? "en" : "vi";
  
  // Tạo cookie định hướng ngôn ngữ cho Google Translate
  // Định dạng của Google: /ngôn_ngữ_gốc/ngôn_ngữ_đích (ví dụ: /vi/en hoặc /vi/vi)
  document.cookie = `googtrans=/vi/${nextLang}; path=/;`;
  document.cookie = `googtrans=/vi/${nextLang}; path=/; domain=${window.location.hostname};`;
  
  // Cập nhật State để hiển thị nút bấm
  setCurrentLang(nextLang === "en" ? "EN" : "VI");
  
  // Làm mới trang để Google Translate đọc Cookie và dịch ngay lập tức
  window.location.reload();
};

// Thêm useEffect này để giữ đúng chữ EN/VI trên nút bấm sau khi reload trang
useEffect(() => {
  const checkCookie = () => {
    const match = document.cookie.match(new RegExp('(^| )googtrans=([^;]+)'));
    if (match && match[2].includes('/en')) {
      setCurrentLang("EN");
    } else {
      setCurrentLang("VI");
    }
  };
  checkCookie();
}, []);

  // Logic đóng dropdown khi bấm ra ngoài vùng menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowService(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const services = [
    "Dịch vụ mua hộ",
    "Vận chuyển quốc tế",
    "Ký gửi kho bãi",
    "Thông quan hải quan",
    "Đấu giá",
    "Fulfillment",
  ];

  return (
    <header className="header">
      {/* Thẻ div ẩn làm điểm neo cho Google Translate */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>

      <div className="header-container">
        {/* 1. Logo bên trái */}
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src={logo} alt="Logo" />
        </div>
  
        {/* 2. Menu chính ở giữa */}
        <nav className="nav-menu">
          <a href="#" className="nav-item">Về chúng tôi</a>
  
          {/* Block bao bọc mục Dịch vụ */}
          <div
            className={`menu-dropdown ${showService ? "active" : ""}`}
            ref={dropdownRef}
            onClick={() => setShowService(!showService)}
          >
            <span className="nav-item">
              Dịch vụ 
              <DownOutlined className={`icon-down ${showService ? "rotate" : ""}`} />
            </span>
  
            {showService && (
              <div className="service-dropdown" onClick={(e) => e.stopPropagation()}>
                {services.map((item, index) => (
                  <div key={index} className="service-item">
                    <span>{item}</span>
                    <RightOutlined style={{ fontSize: "12px" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
  
          <a href="#" className="nav-item">
            Bảng giá <DownOutlined className="icon-down" />
          </a>
  
          <a href="#" className="nav-item">
            Chính sách <DownOutlined className="icon-down" />
          </a>
  
          <a href="#" className="nav-item">
            Hướng dẫn <DownOutlined className="icon-down" />
          </a>
  
          <a href="#" className="nav-item">
            Blog <DownOutlined className="icon-down" />
          </a>
  
          <a href="#" className="nav-item">Liên hệ</a>
        </nav>
  
        {/* 3. Cụm chức năng bên phải */}
        <div className="header-actions">
          
          {/* NÚT TỰ ĐỘNG ĐỔI TIẾNG ANH / TIẾNG VIỆT */}
          <div 
            className="action-link language-toggle-btn" 
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} 
            onClick={toggleLanguage}
          >
            <GlobalOutlined className="action-icon" />
            <span style={{ fontWeight: "bold" }}>{currentLang === "VI" ? "EN" : "VI"}</span>
          </div>

          <button className="quote-btn">
            <FileTextOutlined className="action-icon" /> Báo giá
          </button>
  
          <div className="action-link">
            <SearchOutlined className="action-icon" />
            <span>Tra cứu</span>
          </div>
  
          {/* Điều hướng sang trang Login */}
          <div 
            className="action-link" 
            style={{ cursor: "pointer" }} 
            onClick={() => navigate("/login")}
          >
            <LoginOutlined className="action-icon" /> Đăng nhập
          </div>
  
          {/* Điều hướng sang trang Register */}
          <button 
            className="register-btn" 
            onClick={() => navigate("/register")}
          >
            <UserAddOutlined className="action-icon" /> Đăng ký
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;