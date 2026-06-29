"use client";

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LogoutOutlined,
  AppstoreOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
  LeftOutlined,
  SettingOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import "./Sidebar.css";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState({
    id: "",
    fullName: "",
    email: "",
  });

  const fetchUserInfo = () => {
    try {
      const userStr = sessionStorage.getItem("user");

      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          id: user.userId || user.id || user.customerId || "",
          fullName: user.fullName || user.name || user.userName || "Khách hàng",
          email: user.email || sessionStorage.getItem("email") || "Chưa có email",
        };
      }

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

  useEffect(() => {
    setUserInfo(fetchUserInfo());
  }, [location.pathname]);

  const { id, fullName, email } = userInfo;
  const avatarLetter = fullName?.trim()?.charAt(0)?.toUpperCase() || "U";

  const [openLichSu, setOpenLichSu] = useState(false);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar-container">
      <div className="sidebar-fixed-top">
        <div className="sidebar-header">
          <div className="logo-box">
            <span className="logo-subtitle">KHÁCH HÀNG</span>
            <h1 className="logo-main-text">VCL</h1>
          </div>
          <button type="button" className="collapse-btn">
            <LeftOutlined style={{ fontSize: "12px" }} />
          </button>
        </div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `profile-card ${isActive ? "profile-card-active" : ""}`
          }
          title="Xem và cập nhật hồ sơ"
        >
          <div className="avatar-wrapper">
            <div className="avatar-circle">{avatarLetter}</div>
            <span className="status-dot-online" />
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <span className="profile-name">{fullName}</span>
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
            <span className="profile-name">{email}</span>
            <div className="profile-id" style={{ fontSize: "11px", color: "#8c8c8c", wordBreak: "break-all" }}>
              {id ? `ID: ${id}` : (email || "Chưa có mã ID")}
             
            </div>

            <div className="profile-progress-label">
              <span>HỒ SƠ</span>
              <span>100%</span>
            </div>

            <div className="profile-progress-bar">
              <div className="progress-fill" style={{ width: "100%" }} />
            </div>
          </div>
        </NavLink>
      </div>

      <div className="sidebar-scrollable-menu">
        <div className="menu-section-label">QUẢN LÝ</div>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <AppstoreOutlined className="menu-icon" />
          <span className="menu-text">Bảng điều khiển</span>
        </NavLink>

        <NavLink
          to="/create-order"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <PlusCircleOutlined className="menu-icon" />
          <span className="menu-text">Tạo đơn hàng</span>
        </NavLink>

        <NavLink
          to="/processing-orders"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <UnorderedListOutlined className="menu-icon" />
          <span className="menu-text">Đơn đang xử lý</span>
        </NavLink>

        <div className="menu-section-label">DỊCH VỤ</div>

        <NavLink
          to="/create-order"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <PlusCircleOutlined className="menu-icon" />
          <span className="menu-text">Mua hộ</span>
        </NavLink>

        <NavLink
          to="/create-order/consignment"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <UnorderedListOutlined className="menu-icon" />
          <span className="menu-text">Ký gửi</span>
        </NavLink>

        <div className="menu-section-label">TRA CỨU & LỊCH SỬ</div>

        <div className="menu-item-dropdown">
          <div
            className={`menu-item ${openLichSu ? "submenu-parent-open" : ""}`}
            onClick={() => setOpenLichSu(!openLichSu)}
          >
            <HistoryOutlined className="menu-icon" />
            <span className="menu-text">Lịch sử đơn hàng</span>
            {openLichSu ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </div>

          {openLichSu && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/history/buy-on-behalf"
                className={({ isActive }) => `submenu-item ${isActive ? "active-sub" : ""}`}
              >
                Mua hộ
              </NavLink>
              <NavLink
                to="/history/consignment"
                className={({ isActive }) => `submenu-item ${isActive ? "active-sub" : ""}`}
              >
                Ký gửi
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-section-label">CÀI ĐẶT</div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <SettingOutlined className="menu-icon" />
          <span className="menu-text">Cấu hình tài khoản</span>
        </NavLink>

        <NavLink
          to="/settings/services-policy"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <FileTextOutlined className="menu-icon" />
          <span className="menu-text">Chính sách dịch vụ</span>
        </NavLink>
      </div>

      <div className="sidebar-fixed-bottom">
        <button type="button" className="logout-button" onClick={handleLogout}>
          <LogoutOutlined />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
