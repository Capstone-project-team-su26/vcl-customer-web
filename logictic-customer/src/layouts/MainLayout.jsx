import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../layouts/SidebarLayout/Sidebar"; 
import { HomeOutlined } from "@ant-design/icons";
import "./MainLayout.css";

export default function MainLayout() {
  const location = useLocation();

  // Hàm lấy tên trang làm Breadcrumb động
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("dashboard")) return "BÀNG ĐIỀU KHIỂN";
    if (path.includes("create-order")) return "TẠO ĐƠN HÀNG";
    if (path.includes("processing-orders")) return "ĐƠN ĐANG XỬ LÝ";
    if (path.includes("settings/profile-config")) return "CẤU HÌNH TÀI KHOẢN";
    if (path.includes("settings/chinh-sach-dich-vu")) return "CHÍNH SÁCH DỊCH VỤ";
    if (path.includes("check-orders")) return "KIỆN CHỜ BÁO GIÁ";
    if (path.includes("quotations")) return "CHI TIẾT BÁO GIÁ";
    return "HỆ THỐNG";
  };

  const balance = 0; 

  return (
    <div className="main-layout-container">
      {/* Cố định Sidebar ở bên trái */}
      <Sidebar />
      
      {/* Vùng nội dung bên phải (Khối hộp viền vàng của bạn) */}
      <main className="main-layout-content">
        
        {/* THANH HEADER ĐƯỢC CHÈN THÊM VÀO ĐỈNH KHỐI HỘP */}
        <header className="main-header-layout">
          <div className="header-breadcrumb">
            <HomeOutlined className="breadcrumb-home-icon" />
            <span className="breadcrumb-root">HOME</span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{getPageTitle()}</span>
          </div>

          <div className="header-balance-box">
            <span className="balance-label">SỐ DƯ KHẢ DỤNG:</span>
            <span className="balance-value">{balance.toLocaleString('vi-VN')} đ</span>
          </div>
        </header>

        {/* VÙNG CHỨA NỘI DUNG CON CHẠY DƯỚI HEADER */}
        <div className="page-sub-content">
          <Outlet />
        </div>

      </main>
    </div>
  );
}