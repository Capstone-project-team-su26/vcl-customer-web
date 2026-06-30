import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../../assets/anhlogocap2.jpeg";

import {
  SearchOutlined,
  DownOutlined,
  RightOutlined,
  FileTextOutlined,
  LoginOutlined,
  UserAddOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const services = [
  {
    label: "Dịch vụ mua hộ",
    description: "Đặt mua hàng quốc tế nhanh chóng",
    path: "/dich-vu/mua-ho",
  },
  {
    label: "Ký gửi hàng hóa",
    description: "Vận chuyển hàng về Việt Nam an toàn",
    path: "/dich-vu/ky-gui",
  },
];

const navItems = [
  {
    label: "Về chúng tôi",
    path: "/gioi-thieu",
  },
  {
    label: "Bảng giá",
    path: "/bang-gia",
    hasArrow: true,
  },
  {
    label: "Chính sách",
    path: "/chinh-sach",
    hasArrow: true,
  },
  {
    label: "Hướng dẫn",
    path: "/huong-dan",
    hasArrow: true,
  },
  {
    label: "Blog",
    path: "/blog",
    hasArrow: true,
  },
  {
    label: "Liên hệ",
    path: "/lien-he",
  },
];

const Header = () => {
  const [showService, setShowService] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileService, setShowMobileService] = useState(false);

  const dropdownRef = useRef(null);
  const headerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const isServiceActive = location.pathname.startsWith("/dich-vu");

  const closeAllMenus = () => {
    setShowService(false);
    setShowMobileMenu(false);
    setShowMobileService(false);
  };

  const handleNavigate = (path) => {
    closeAllMenus();
    navigate(path);
  };

  const handleServiceToggle = () => {
    setShowService((current) => !current);
  };

  const handleMobileMenuToggle = () => {
    setShowMobileMenu((current) => !current);
    setShowService(false);
    setShowMobileService(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowService(false);
      }

      if (
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
        setShowMobileService(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1260) {
        setShowMobileMenu(false);
        setShowMobileService(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    closeAllMenus();
  }, [location.pathname]);

  return (
    <header className="header" ref={headerRef}>
      <div className="header-decoration header-decoration-blue" />
      <div className="header-decoration header-decoration-red" />

      <div className="header-container">
        {/* Logo */}
        <button
          type="button"
          className="logo-button"
          onClick={() => handleNavigate("/")}
          aria-label="Về trang chủ"
        >
          <span className="logo-frame">
            <img
              src={logo}
              alt="Việt Nam Logistic"
              className="logo-image"
              draggable="false"
            />
          </span>
        </button>

        {/* Menu desktop */}
        <nav className="nav-menu" aria-label="Điều hướng chính">
          <button
            type="button"
            className={`nav-item ${
              isActive(navItems[0].path) ? "active" : ""
            }`}
            onClick={() => handleNavigate(navItems[0].path)}
            aria-current={
              isActive(navItems[0].path) ? "page" : undefined
            }
          >
            {navItems[0].label}
          </button>

          {/* Dropdown dịch vụ */}
          <div
            ref={dropdownRef}
            className={`menu-dropdown ${
              showService || isServiceActive ? "active" : ""
            }`}
          >
            <button
              type="button"
              className="nav-item service-trigger"
              onClick={handleServiceToggle}
              aria-haspopup="menu"
              aria-expanded={showService}
            >
              <span>Dịch vụ</span>

              <DownOutlined
                className={`icon-down ${
                  showService ? "rotate" : ""
                }`}
              />
            </button>

            {showService && (
              <div className="service-dropdown" role="menu">
                <div className="dropdown-header">
                  <span className="dropdown-label">
                    Dịch vụ của chúng tôi
                  </span>

                  <span className="dropdown-description">
                    Giải pháp mua hộ và vận chuyển tối ưu
                  </span>
                </div>

                <div className="service-list">
                  {services.map((service) => (
                    <button
                      type="button"
                      key={service.path}
                      className={`service-item ${
                        isActive(service.path) ? "active" : ""
                      }`}
                      onClick={() =>
                        handleNavigate(service.path)
                      }
                      role="menuitem"
                    >
                      <span className="service-icon">
                        <FileTextOutlined />
                      </span>

                      <span className="service-content">
                        <strong>{service.label}</strong>
                        <small>{service.description}</small>
                      </span>

                      <span className="service-arrow">
                        <RightOutlined />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {navItems.slice(1).map((item) => (
            <button
              type="button"
              key={item.path}
              className={`nav-item ${
                isActive(item.path) ? "active" : ""
              }`}
              onClick={() => handleNavigate(item.path)}
              aria-current={
                isActive(item.path) ? "page" : undefined
              }
            >
              <span>{item.label}</span>

              {item.hasArrow && (
                <DownOutlined className="icon-down nav-static-arrow" />
              )}
            </button>
          ))}
        </nav>

        {/* Hành động desktop */}
        <div className="header-actions">
          <button
            type="button"
            className="quote-btn"
            onClick={() => handleNavigate("/bao-gia")}
          >
            <FileTextOutlined className="action-icon" />
            <span>Báo giá</span>
          </button>

          <button
            type="button"
            className="action-link"
            onClick={() => handleNavigate("/tra-cuu")}
          >
            <SearchOutlined className="action-icon" />
            <span>Tra cứu</span>
          </button>

          <button
            type="button"
            className="action-link"
            onClick={() => handleNavigate("/login")}
          >
            <LoginOutlined className="action-icon" />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            className="register-btn"
            onClick={() => handleNavigate("/register")}
          >
            <UserAddOutlined className="action-icon" />
            <span>Đăng ký</span>
          </button>
        </div>

        {/* Nút mở menu mobile */}
        <button
          type="button"
          className={`mobile-menu-button ${
            showMobileMenu ? "is-open" : ""
          }`}
          onClick={handleMobileMenuToggle}
          aria-label={
            showMobileMenu ? "Đóng menu" : "Mở menu"
          }
          aria-expanded={showMobileMenu}
        >
          {showMobileMenu ? (
            <CloseOutlined />
          ) : (
            <MenuOutlined />
          )}
        </button>
      </div>

      {/* Menu mobile */}
      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-inner">
            <button
              type="button"
              className={`mobile-nav-item ${
                isActive(navItems[0].path) ? "active" : ""
              }`}
              onClick={() =>
                handleNavigate(navItems[0].path)
              }
            >
              <span>{navItems[0].label}</span>
              <RightOutlined />
            </button>

            <div
              className={`mobile-service-block ${
                showMobileService ? "active" : ""
              }`}
            >
              <button
                type="button"
                className={`mobile-nav-item mobile-service-trigger ${
                  isServiceActive ? "active" : ""
                }`}
                onClick={() =>
                  setShowMobileService((current) => !current)
                }
                aria-expanded={showMobileService}
              >
                <span>Dịch vụ</span>

                <DownOutlined
                  className={`icon-down ${
                    showMobileService ? "rotate" : ""
                  }`}
                />
              </button>

              {showMobileService && (
                <div className="mobile-service-list">
                  {services.map((service) => (
                    <button
                      type="button"
                      key={service.path}
                      className={`mobile-service-item ${
                        isActive(service.path) ? "active" : ""
                      }`}
                      onClick={() =>
                        handleNavigate(service.path)
                      }
                    >
                      <span className="mobile-service-icon">
                        <FileTextOutlined />
                      </span>

                      <span className="mobile-service-content">
                        <strong>{service.label}</strong>
                        <small>{service.description}</small>
                      </span>

                      <RightOutlined />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {navItems.slice(1).map((item) => (
              <button
                type="button"
                key={item.path}
                className={`mobile-nav-item ${
                  isActive(item.path) ? "active" : ""
                }`}
                onClick={() => handleNavigate(item.path)}
              >
                <span>{item.label}</span>
                <RightOutlined />
              </button>
            ))}

            <div className="mobile-actions">
              <button
                type="button"
                className="mobile-secondary-btn"
                onClick={() => handleNavigate("/tra-cuu")}
              >
                <SearchOutlined />
                <span>Tra cứu</span>
              </button>

              <button
                type="button"
                className="mobile-secondary-btn"
                onClick={() => handleNavigate("/login")}
              >
                <LoginOutlined />
                <span>Đăng nhập</span>
              </button>

              <button
                type="button"
                className="mobile-quote-btn"
                onClick={() => handleNavigate("/bao-gia")}
              >
                <FileTextOutlined />
                <span>Báo giá</span>
              </button>

              <button
                type="button"
                className="mobile-register-btn"
                onClick={() => handleNavigate("/register")}
              >
                <UserAddOutlined />
                <span>Đăng ký</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;