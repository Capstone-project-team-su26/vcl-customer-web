import React from "react";
import {
  WalletOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  SyncOutlined,
  BellOutlined,
} from "@ant-design/icons";

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Bảng điều khiển</h2>
        <p>Chào mừng bạn trở lại hệ thống VCL — quản lý đơn Mua hộ & Ký gửi.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card money">
          <div className="stat-icon"><WalletOutlined /></div>
          <div className="stat-info">
            <span className="stat-label">Số dư tài khoản</span>
            <h3>0đ</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue"><ShoppingCartOutlined /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng đơn mua hộ</span>
            <h3>0 đơn</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange"><InboxOutlined /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng đơn ký gửi</span>
            <h3>0 đơn</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple"><SyncOutlined /></div>
          <div className="stat-info">
            <span className="stat-label">Đơn đang xử lý</span>
            <h3>0 đơn</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <div className="content-box main-chart">
          <h4>Thống kê đơn Mua hộ & Ký gửi</h4>
          <div className="empty-chart-placeholder">
            <p>Chưa có dữ liệu thống kê trong tháng này</p>
          </div>
        </div>

        <div className="content-box notifications-box">
          <h4><BellOutlined /> Thông báo mới nhất</h4>
          <ul className="notification-list">
            <li className="noti-item unread">
              <span className="noti-tag">Hệ thống</span>
              <div className="noti-body">
                <p className="noti-text">Chào mừng bạn gia nhập hệ thống VCL Logistics!</p>
                <span className="noti-time">Vừa xong</span>
              </div>
            </li>
            <li className="noti-item">
              <span className="noti-tag chính-sách">Mua hộ</span>
              <div className="noti-body">
                <p className="noti-text">Cập nhật bảng giá dịch vụ Mua hộ mới nhất trên hệ thống VCL.</p>
                <span className="noti-time">1 ngày trước</span>
              </div>
            </li>
            <li className="noti-item">
              <span className="noti-tag chính-sách">Ký gửi</span>
              <div className="noti-body">
                <p className="noti-text">Hướng dẫn quy trình ký gửi hàng về kho VCL đã được cập nhật.</p>
                <span className="noti-time">3 ngày trước</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}