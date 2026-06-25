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
} from "@ant-design/icons";

const Header = () => {
  const [showService, setShowService] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate(); // 2. Khởi tạo hàm điều hướng

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
          <button className="quote-btn">
            <FileTextOutlined className="action-icon" /> Báo giá
          </button>
  
          <div className="action-link">
            <SearchOutlined className="action-icon" />
            <span>Tra cứu</span>
          </div>
  
          {/* FIX 1: Chuyển thẻ <a> thành thẻ <span/div> có sự kiện onClick để navigate sang trang Login */}
          <div 
            className="action-link" 
            style={{ cursor: "pointer" }} 
            onClick={() => navigate("/login")}
          >
            <LoginOutlined className="action-icon" /> Đăng nhập
          </div>
  
          {/* FIX 2: Thêm sự kiện onClick trực tiếp vào button Đăng ký để navigate sang trang Register */}
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