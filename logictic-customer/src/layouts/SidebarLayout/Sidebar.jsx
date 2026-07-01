import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LogoutOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  DownloadOutlined,
  CreditCardOutlined,
  InboxOutlined,
  HomeOutlined,
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
  TransactionOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import { getUserProfileApi } from "../../api/Auth/authService";
import logoImage from "../../assets/anhlogocap2.jpeg";

import "./Sidebar.css";

const parseSessionUser = () => {
  try {
    const userStr = sessionStorage.getItem("user");

    if (userStr) {
      const user = JSON.parse(userStr);

      return {
        id:
          user.userId ||
          user.id ||
          user.customerId ||
          "",
        fullName:
          user.fullName ||
          user.name ||
          user.userName ||
          "Khách hàng",
        phone:
          user.phone ||
          sessionStorage.getItem("phone") ||
          "",
      };
    }

    return {
      id:
        sessionStorage.getItem("id") ||
        sessionStorage.getItem("customerId") ||
        "",
      fullName:
        sessionStorage.getItem("fullName") ||
        "Khách hàng",
      phone:
        sessionStorage.getItem("phone") ||
        "",
    };
  } catch (error) {
    console.error(
      "Lỗi đọc session tại Sidebar:",
      error
    );

    return {
      id: "",
      fullName: "Khách hàng",
      phone: "",
    };
  }
};

const syncSessionFromProfile = (profile) => {
  try {
    const userStr =
      sessionStorage.getItem("user");

    const currentUser = userStr
      ? JSON.parse(userStr)
      : {};

    const merged = {
      ...currentUser,
      ...profile,
    };

    sessionStorage.setItem(
      "user",
      JSON.stringify(merged)
    );

    if (profile.fullName) {
      sessionStorage.setItem(
        "fullName",
        profile.fullName
      );
    }

    if (profile.phone) {
      sessionStorage.setItem(
        "phone",
        profile.phone
      );
    }
  } catch (error) {
    console.error(
      "Lỗi đồng bộ session tại Sidebar:",
      error
    );
  }
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] =
    useState(parseSessionUser);

  const [loadingProfile, setLoadingProfile] =
    useState(false);

  const [openSubMenus, setOpenSubMenus] =
    useState({
      khoHang: false,
      lichSu: false,
    });

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus((previousState) => ({
      ...previousState,
      [menuKey]: !previousState[menuKey],
    }));
  };

  const loadProfile = useCallback(async () => {
    setUserInfo(parseSessionUser());

    try {
      setLoadingProfile(true);

      const profile =
        await getUserProfileApi();

      if (profile) {
        syncSessionFromProfile(profile);

        setUserInfo({
          id:
            profile.userId ||
            profile.id ||
            profile.customerId ||
            "",
          fullName:
            profile.fullName ||
            profile.name ||
            profile.userName ||
            "Khách hàng",
          phone: profile.phone || "",
        });
      }
    } catch (error) {
      console.error(
        "Lỗi lấy profile tại Sidebar:",
        error
      );
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [location.pathname, loadProfile]);

  const {
    id,
    fullName,
    phone,
  } = userInfo;

  const avatarLetter =
    fullName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";

  const phoneDisplay = loadingProfile
    ? "Đang tải..."
    : phone
      ? `SĐT: ${phone}`
      : id
        ? `ID: ${id}`
        : "Chưa có số điện thoại";

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar-container">
      <div className="sidebar-fixed-top">
      <div className="sidebar-customer-label">
  CUSTOMER
</div>
      <div className="sidebar-header">
  <NavLink
  
    className="sidebar-brand-logo"
    aria-label="Về trang chủ Việt Nam Logictic"
    title="Việt Nam Logictic"
  >
    <img
      src={logoImage}
      alt="Logo Việt Nam Logictic"
      className="sidebar-brand-logo__image"
      width="1000"
      height="400"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      draggable="false"
    />
  </NavLink>
</div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `profile-card ${
              isActive
                ? "profile-card-active"
                : ""
            }`
          }
          title="Xem và cập nhật hồ sơ"
        >
          <div className="avatar-wrapper">
            <div className="avatar-circle">
              {avatarLetter}
            </div>

            <span className="status-dot-online" />
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <span className="profile-name">
                {fullName}
              </span>

              <svg
                className="verified-badge"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div className="profile-id">
              {phoneDisplay}
            </div>

            <div className="profile-progress-label">
              <span>HỒ SƠ</span>
              <span>100%</span>
            </div>

            <div className="profile-progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>
        </NavLink>
      </div>

      <div className="sidebar-scrollable-menu">
        <div className="menu-section-label">
          QUẢN LÝ
        </div>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <AppstoreOutlined className="menu-icon" />

          <span className="menu-text">
            Bảng điều khiển
          </span>
        </NavLink>

        <NavLink
          to="/create-order"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <PlusCircleOutlined className="menu-icon" />

          <span className="menu-text">
            Tạo đơn hàng
          </span>
        </NavLink>

        <NavLink
          to="/processing-orders"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <UnorderedListOutlined className="menu-icon" />

          <span className="menu-text">
            Đơn đang xử lý
          </span>
        </NavLink>

        <NavLink
          to="/receive-goods"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <DownloadOutlined className="menu-icon" />

          <span className="menu-text">
            Nhận hàng
          </span>
        </NavLink>

        <NavLink
          to="/payment"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <CreditCardOutlined className="menu-icon" />

          <span className="menu-text">
            Thanh toán vận chuyển
          </span>
        </NavLink>

        <NavLink
          to="/waiting-packages"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <InboxOutlined className="menu-icon" />

          <span className="menu-text">
            Kiện chờ nhận
          </span>
        </NavLink>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.khoHang
                ? "submenu-parent-open"
                : ""
            }`}
            onClick={() =>
              toggleSubMenu("khoHang")
            }
            aria-expanded={openSubMenus.khoHang}
          >
            <HomeOutlined className="menu-icon" />

            <span className="menu-text">
              Theo dõi kho hàng
            </span>

            {openSubMenus.khoHang ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.khoHang && (
            <div className="submenu-list">
              <NavLink
                to="/warehouse/inventory"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive
                      ? "active-sub"
                      : ""
                  }`
                }
              >
                Tồn kho tổng
              </NavLink>

              <NavLink
                to="/warehouse/export"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive
                      ? "active-sub"
                      : ""
                  }`
                }
              >
                Xuất kho
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-section-label">
          TRA CỨU &amp; LỊCH SỬ
        </div>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.lichSu
                ? "submenu-parent-open"
                : ""
            }`}
            onClick={() =>
              toggleSubMenu("lichSu")
            }
            aria-expanded={openSubMenus.lichSu}
          >
            <HistoryOutlined className="menu-icon" />

            <span className="menu-text">
              Lịch sử mua hàng
            </span>

            {openSubMenus.lichSu ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.lichSu && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/history/buy-on-behalf"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive
                      ? "active-sub"
                      : ""
                  }`
                }
              >
                Mua hộ
              </NavLink>

              <NavLink
                to="/history/consignment"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive
                      ? "active-sub"
                      : ""
                  }`
                }
              >
                Ký gửi
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-section-label">
          TÀI CHÍNH
        </div>

        <NavLink
          to="/financial/transaction-history"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <TransactionOutlined className="menu-icon" />

          <span className="menu-text">
            Lịch sử giao dịch
          </span>
        </NavLink>

        <div className="menu-section-label">
          CÀI ĐẶT
        </div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <SettingOutlined className="menu-icon" />

          <span className="menu-text">
            Cấu hình tài khoản
          </span>
        </NavLink>

        <NavLink
          to="/settings/chinh-sach-dich-vu"
          className={({ isActive }) =>
            `menu-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <FileTextOutlined className="menu-icon" />

          <span className="menu-text">
            Chính sách dịch vụ
          </span>
        </NavLink>
      </div>

      <div className="sidebar-fixed-bottom">
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          <LogoutOutlined />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}