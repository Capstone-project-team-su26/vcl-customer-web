import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../layouts/SidebarLayout/Sidebar"; // Component sidebar đã làm ở bước trước
import "./MainLayout.css";

export default function MainLayout() {
  return (
    <div className="main-layout-container">
      {/* Cố định Sidebar ở bên trái */}
      <Sidebar />
      
      {/* Vùng nội dung bên phải tự động thay đổi theo Router */}
      <main className="main-layout-content">
        <Outlet />
      </main>
    </div>
  );
}