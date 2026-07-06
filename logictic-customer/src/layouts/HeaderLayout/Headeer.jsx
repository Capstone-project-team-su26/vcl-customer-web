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
  DollarOutlined,
  SafetyCertificateOutlined,
  ReadOutlined,
  BookOutlined,
} from "@ant-design/icons";

const services = [
  {
    label: "Dịch vụ mua hộ",
    description: "Đặt mua hàng quốc tế nhanh chóng",
    path: "/buy-for-me-service",
  },
  {
    label: "Ký gửi hàng hóa",
    description: "Vận chuyển hàng về Việt Nam an toàn",
    path: "/consignment-service",
  },
];

const pricingItems = [
  {
    label: "Bảng giá mua hộ",
    description: "Chi phí mua hộ hàng hóa quốc tế",
    path: "/bang-gia/mua-ho",
  },
  {
    label: "Bảng giá ký gửi",
    description: "Chi phí ký gửi và vận chuyển hàng hóa",
    path: "/bang-gia/ky-gui",
  },
  {
    label: "Phí vận chuyển quốc tế",
    description: "Tra cứu phí vận chuyển theo tuyến và cân nặng",
    path: "/bang-gia/van-chuyen-quoc-te",
  },
  {
    label: "Phí dịch vụ & phụ phí",
    description: "Thông tin các khoản phí phát sinh",
    path: "/bang-gia/phi-dich-vu",
  },
  {
    label: "Công cụ tính giá",
    description: "Ước tính nhanh chi phí đơn hàng",
    path: "/bang-gia/tinh-gia",
  },
];

const policyItems = [
  {
    label: "Quy định chung",
    description: "Các quy định áp dụng khi sử dụng dịch vụ",
    path: "/chinh-sach/quy-dinh-chung",
  },
  {
    label: "Chính sách Vận chuyển",
    description: "Quy định về tiếp nhận và vận chuyển hàng hóa",
    path: "/chinh-sach/van-chuyen",
  },
  {
    label: "Chính sách Thanh toán",
    description: "Phương thức, thời hạn và quy trình thanh toán",
    path: "/chinh-sach/thanh-toan",
  },
  {
    label: "Chính sách Hủy đơn & Hoàn tiền",
    description: "Điều kiện hủy đơn và xử lý hoàn tiền",
    path: "/chinh-sach/huy-don-hoan-tien",
  },
  {
    label: "Chính sách Bảo hiểm Hàng hóa",
    description: "Quyền lợi và phạm vi bảo hiểm hàng hóa",
    path: "/chinh-sach/bao-hiem-hang-hoa",
  },
  {
    label: "Chính sách Miễn trừ Trách nhiệm",
    description: "Các trường hợp được miễn trừ trách nhiệm",
    path: "/chinh-sach/mien-tru-trach-nhiem",
  },
  {
    label: "Chính sách Bảo mật",
    description: "Quy định thu thập và bảo vệ dữ liệu khách hàng",
    path: "/chinh-sach/bao-mat",
  },
  {
    label: "Chính sách Đặt hàng",
    description: "Quy trình và điều kiện tạo đơn hàng",
    path: "/chinh-sach/dat-hang",
  },
];

const guideItems = [
  {
    label: "Hướng dẫn mua hộ",
    description: "Các bước tạo yêu cầu mua hộ hàng hóa",
    path: "/huong-dan/mua-ho",
  },
  {
    label: "Hướng dẫn ký gửi",
    description: "Cách tạo yêu cầu ký gửi hàng hóa",
    path: "/huong-dan/ky-gui",
  },
  {
    label: "Hướng dẫn tạo đơn hàng",
    description: "Quy trình tạo và xác nhận đơn hàng",
    path: "/huong-dan/tao-don-hang",
  },
  {
    label: "Hướng dẫn thanh toán",
    description: "Cách thanh toán và xác nhận giao dịch",
    path: "/huong-dan/thanh-toan",
  },
  {
    label: "Hướng dẫn theo dõi đơn hàng",
    description: "Kiểm tra trạng thái và hành trình đơn hàng",
    path: "/huong-dan/theo-doi-don-hang",
  },
  {
    label: "Hướng dẫn khiếu nại",
    description: "Quy trình gửi và xử lý yêu cầu khiếu nại",
    path: "/huong-dan/khieu-nai",
  },
];

const blogItems = [
  {
    label: "Tin tức Logistics",
    description: "Thông tin mới nhất về thị trường logistics",
    path: "/blog/tin-tuc-logistics",
  },
  {
    label: "Kinh nghiệm mua hàng quốc tế",
    description: "Mẹo mua hàng an toàn và tiết kiệm",
    path: "/blog/kinh-nghiem-mua-hang",
  },
  {
    label: "Hướng dẫn nhập hàng",
    description: "Kiến thức nhập hàng dành cho cá nhân và doanh nghiệp",
    path: "/blog/huong-dan-nhap-hang",
  },
  {
    label: "Kiến thức vận chuyển",
    description: "Giải đáp các vấn đề về vận chuyển hàng hóa",
    path: "/blog/kien-thuc-van-chuyen",
  },
  {
    label: "Ưu đãi & Thông báo",
    description: "Chương trình ưu đãi và thông báo hệ thống",
    path: "/blog/uu-dai-thong-bao",
  },
];

const navItems = [
  {
    key: "about",
    label: "Về chúng tôi",
    path: "/gioi-thieu",
  },
  {
    key: "services",
    label: "Dịch vụ",
    path: "/dich-vu",
    title: "Dịch vụ của chúng tôi",
    subtitle: "Giải pháp mua hộ và vận chuyển tối ưu",
    items: services,
    icon: FileTextOutlined,
  },
  {
    key: "pricing",
    label: "Bảng giá",
    path: "/bang-gia",
    title: "Bảng giá dịch vụ",
    subtitle: "Thông tin chi phí rõ ràng và minh bạch",
    items: pricingItems,
    icon: DollarOutlined,
  },
  {
    key: "policy",
    label: "Chính sách",
    path: "/chinh-sach",
    title: "Chính sách & Quy định",
    subtitle: "Các điều khoản áp dụng khi sử dụng dịch vụ",
    items: policyItems,
    icon: SafetyCertificateOutlined,
  },
  {
    key: "guide",
    label: "Hướng dẫn",
    path: "/huong-dan",
    title: "Trung tâm hướng dẫn",
    subtitle: "Hướng dẫn sử dụng dịch vụ từng bước",
    items: guideItems,
    icon: BookOutlined,
  },
  {
    key: "blog",
    label: "Blog",
    path: "/blog",
    title: "Blog Logistics",
    subtitle: "Kiến thức, kinh nghiệm và tin tức hữu ích",
    items: blogItems,
    icon: ReadOutlined,
  },
  {
    key: "contact",
    label: "Liên hệ",
    path: "/lien-he",
  },
];

const Header = () => {
  const [openDesktopMenu, setOpenDesktopMenu] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(null);

  const desktopNavRef = useRef(null);
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

  const closeAllMenus = () => {
    setOpenDesktopMenu(null);
    setShowMobileMenu(false);
    setOpenMobileMenu(null);
  };

  const handleNavigate = (path) => {
    closeAllMenus();
    navigate(path);
  };

  const handleDesktopMenuToggle = (key) => {
    setOpenDesktopMenu((current) => (current === key ? null : key));
  };

  const handleMobileMenuToggle = () => {
    setShowMobileMenu((current) => !current);
    setOpenDesktopMenu(null);
    setOpenMobileMenu(null);
  };

  const handleMobileDropdownToggle = (key) => {
    setOpenMobileMenu((current) => (current === key ? null : key));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        desktopNavRef.current &&
        !desktopNavRef.current.contains(event.target)
      ) {
        setOpenDesktopMenu(null);
      }

      if (
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
        setOpenMobileMenu(null);
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
        setOpenMobileMenu(null);
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

        <nav
          ref={desktopNavRef}
          className="nav-menu"
          aria-label="Điều hướng chính"
        >
          {navItems.map((item) => {
            const hasDropdown = Array.isArray(item.items);
            const isOpen = openDesktopMenu === item.key;
            const ItemIcon = item.icon || FileTextOutlined;

            if (!hasDropdown) {
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`nav-item ${isActive(item.path) ? "active" : ""}`}
                  onClick={() => handleNavigate(item.path)}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  {item.label}
                </button>
              );
            }

            return (
              <div
                key={item.key}
                className={`menu-dropdown ${
                  isOpen || isActive(item.path) ? "active" : ""
                }`}
              >
                <button
                  type="button"
                  className="nav-item service-trigger"
                  onClick={() => handleDesktopMenuToggle(item.key)}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  <span>{item.label}</span>
                  <DownOutlined
                    className={`icon-down ${isOpen ? "rotate" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="service-dropdown" role="menu">
                    <div className="dropdown-header">
                      <span className="dropdown-label">{item.title}</span>
                      <span className="dropdown-description">
                        {item.subtitle}
                      </span>
                    </div>

                    <div className="service-list">
                      {item.items.map((subItem) => (
                        <button
                          type="button"
                          key={subItem.path}
                          className={`service-item ${
                            isActive(subItem.path) ? "active" : ""
                          }`}
                          onClick={() => handleNavigate(subItem.path)}
                          role="menuitem"
                        >
                          <span className="service-icon">
                            <ItemIcon />
                          </span>

                          <span className="service-content">
                            <strong>{subItem.label}</strong>
                            <small>{subItem.description}</small>
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
            );
          })}
        </nav>

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

        <button
          type="button"
          className={`mobile-menu-button ${showMobileMenu ? "is-open" : ""}`}
          onClick={handleMobileMenuToggle}
          aria-label={showMobileMenu ? "Đóng menu" : "Mở menu"}
          aria-expanded={showMobileMenu}
        >
          {showMobileMenu ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-inner">
            {navItems.map((item) => {
              const hasDropdown = Array.isArray(item.items);
              const isOpen = openMobileMenu === item.key;
              const ItemIcon = item.icon || FileTextOutlined;

              if (!hasDropdown) {
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`mobile-nav-item ${
                      isActive(item.path) ? "active" : ""
                    }`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span>{item.label}</span>
                    <RightOutlined />
                  </button>
                );
              }

              return (
                <div
                  key={item.key}
                  className={`mobile-service-block ${isOpen ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className={`mobile-nav-item mobile-service-trigger ${
                      isActive(item.path) ? "active" : ""
                    }`}
                    onClick={() => handleMobileDropdownToggle(item.key)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.label}</span>
                    <DownOutlined
                      className={`icon-down ${isOpen ? "rotate" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mobile-service-list">
                      {item.items.map((subItem) => (
                        <button
                          type="button"
                          key={subItem.path}
                          className={`mobile-service-item ${
                            isActive(subItem.path) ? "active" : ""
                          }`}
                          onClick={() => handleNavigate(subItem.path)}
                        >
                          <span className="mobile-service-icon">
                            <ItemIcon />
                          </span>

                          <span className="mobile-service-content">
                            <strong>{subItem.label}</strong>
                            <small>{subItem.description}</small>
                          </span>

                          <RightOutlined />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

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