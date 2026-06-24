import { useState, useEffect, useRef } from "react";
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
        <div className="logo">
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
  
          <a href="#" className="action-link">
            <LoginOutlined className="action-icon" /> Đăng nhập
          </a>
  
          <button className="register-btn">
            <UserAddOutlined className="action-icon" /> Đăng ký
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;