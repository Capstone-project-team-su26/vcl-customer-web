"use client";

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  LeftOutlined,
  TransactionOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();

  // ================= STATE USER INFO =================
  const [userInfo, setUserInfo] = useState({
    id: "",
    fullName: "",
    email: ""
  });

  // Hàm lấy thông tin user đồng bộ chính xác với API
  const fetchUserInfo = () => {
    try {
      const userStr = sessionStorage.getItem("user");
  
      if (userStr) {
        const user = JSON.parse(userStr);
  
        return {
          // Khớp chính xác với trường "userId" và "fullName" từ API payload của bạn
          id: user.userId || user.id || user.customerId || "",
          fullName: user.fullName || user.name || user.userName || "Khách hàng",
          email: user.email || sessionStorage.getItem("email") || "Chưa có email",
        };
      }
  
      // fallback cứu cánh nếu hệ thống lưu lẻ field
      return {
        id: sessionStorage.getItem("id") || sessionStorage.getItem("customerId") || "",
        fullName: sessionStorage.getItem("fullName") || "Khách hàng",
        email: sessionStorage.getItem("email") || "",
      };
    } catch (error) {
      console.error("Lỗi lấy thông tin tại Sidebar:", error);
      return { id: "", fullName: "Khách hàng", email: "" };
    }
  };

  // useEffect tự động đồng bộ dữ liệu ngay lập tức sau khi đăng nhập thành công chuyển trang
  useEffect(() => {
    const data = fetchUserInfo();
    setUserInfo(data);
  }, [navigate]);

  const { id, fullName, email } = userInfo;
  
  const avatarLetter =
    fullName?.trim()?.charAt(0)?.toUpperCase() || "U";

  // ================= SUBMENU =================
  const [openSubMenus, setOpenSubMenus] = useState({
    khoHang: false,
    lichSu: false,
  });

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar-container">
      {/* ================= TOP ================= */}
      <div className="sidebar-fixed-top">
        {/* HEADER */}
        <div className="sidebar-header">
          <div className="logo-box">
            <span className="logo-subtitle">KHÁCH HÀNG</span>
            <h1 className="logo-main-text">VCL-CUSTOMER</h1>
          </div>

          <button className="collapse-btn">
            <LeftOutlined style={{ fontSize: "12px" }} />
          </button>
        </div>

        {/* PROFILE CARD */}
        <div className="profile-card">
          <div className="avatar-wrapper">
            <div className="avatar-circle">
              {avatarLetter}
            </div>
            <span className="status-dot-online"></span>
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
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            {/* Hiển thị ID khách hàng lấy từ API */}
            <div className="profile-id" style={{ fontSize: "11px", color: "#8c8c8c", wordBreak: "break-all" }}>
              {id ? `ID: ${id}` : (email || "Chưa có mã ID")}
            </div>

            <div className="profile-progress-label">
              <span>HỒ SƠ</span>
              <span>100%</span>
            </div>

            <div className="profile-progress-bar">
              <div
                className="progress-fill"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= MENU ================= */}
      <div className="sidebar-scrollable-menu">
        <div className="menu-section-label">QUẢN LÝ</div>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <AppstoreOutlined className="menu-icon" />
          <span className="menu-text">Bảng điều khiển</span>
        </NavLink>

        <NavLink
          to="/create-order"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <PlusCircleOutlined className="menu-icon" />
          <span className="menu-text">Tạo đơn hàng</span>
        </NavLink>

        <NavLink
          to="/processing-orders"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <UnorderedListOutlined className="menu-icon" />
          <span className="menu-text">Đơn đang xử lý</span>
        </NavLink>

        <NavLink
          to="/receive-goods"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <DownloadOutlined className="menu-icon" />
          <span className="menu-text">Nhận hàng</span>
        </NavLink>

        <NavLink
          to="/payment"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
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
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <InboxOutlined className="menu-icon" />
          <span className="menu-text">Kiện chờ nhận</span>
        </NavLink>

        {/* Kho hàng */}
        <div className="menu-item-dropdown">
          <div
            className={`menu-item ${
              openSubMenus.khoHang
                ? "submenu-parent-open"
                : ""
            }`}
            onClick={() => toggleSubMenu("khoHang")}
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
          </div>

          {openSubMenus.khoHang && (
            <div className="submenu-list">
              <NavLink
                to="/warehouse/inventory"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive ? "active-sub" : ""
                  }`
                }
              >
                Tồn kho tổng
              </NavLink>

              <NavLink
                to="/warehouse/export"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive ? "active-sub" : ""
                  }`
                }
              >
                Xuất kho
              </NavLink>
            </div>
          )}
        </div>

        {/* ================= LỊCH SỬ ================= */}
        <div className="menu-section-label">
          TRA CỨU & LỊCH SỬ
        </div>

        <div className="menu-item-dropdown">
          <div
            className={`menu-item ${
              openSubMenus.lichSu
                ? "submenu-parent-open"
                : ""
            }`}
            onClick={() => toggleSubMenu("lichSu")}
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
          </div>

          {openSubMenus.lichSu && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/history/buy-on-behalf"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive ? "active-sub" : ""
                  }`
                }
              >
                Mua hộ
              </NavLink>

              <NavLink
                to="/history/consignment"
                className={({ isActive }) =>
                  `submenu-item ${
                    isActive ? "active-sub" : ""
                  }`
                }
              >
                Ký gửi
              </NavLink>
            </div>
          )}
        </div>

        {/* ================= TÀI CHÍNH ================= */}
        <div className="menu-section-label">
          TÀI CHÍNH
        </div>

        <NavLink
          to="/financial/transaction-history"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <TransactionOutlined className="menu-icon" />
          <span className="menu-text">
            Lịch sử giao dịch
          </span>
        </NavLink>

        {/* ================= CÀI ĐẶT ================= */}
        <div className="menu-section-label">
          CÀI ĐẶT
        </div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <SettingOutlined className="menu-icon" />
          <span className="menu-text">
            Cấu hình tài khoản
          </span>
        </NavLink>

        <NavLink
          to="/settings/services-policy"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <FileTextOutlined className="menu-icon" />
          <span className="menu-text">
            Chính sách dịch vụ
          </span>
        </NavLink>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="sidebar-fixed-bottom">
        <button
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