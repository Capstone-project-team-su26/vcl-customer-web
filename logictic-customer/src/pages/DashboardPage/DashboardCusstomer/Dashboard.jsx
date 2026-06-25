import React from "react";
import { 
  WalletOutlined, 
  ShoppingCartOutlined, 
  SyncOutlined, 
  BellOutlined 
} from "@ant-design/icons";


export default function Dashboard() {
  return (
    <div className="dashboard-page">
      {/* Tiêu đề trang */}
      <div className="page-header">
        <h2>Bảng điều khiển</h2>
        <p>Chào mừng bạn trở lại, hệ thống ghi nhận trạng thái tài khoản ổn định.</p>
      </div>

      {/* Hộp Thống Kê Số Liệu Quick Stats */}
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
          <div className="stat-icon orange"><SyncOutlined /></div>
          <div className="stat-info">
            <span className="stat-label">Đơn đang xử lý</span>
            <h3>0 đơn</h3>
          </div>
        </div>
      </div>

      {/* Nội dung chính: Chia 2 cột */}
      <div className="dashboard-content-grid">
        {/* Cột trái: Biểu đồ trống hoặc Lịch sử trạng thái */}
        <div className="content-box main-chart">
          <h4>Thống kê sản lượng đơn hàng</h4>
          <div className="empty-chart-placeholder">
            <p>Chưa có dữ liệu thống kê trong tháng này</p>
          </div>
        </div>

        {/* Cột phải: Bảng thông báo tin tức */}
        <div className="content-box notifications-box">
          <h4><BellOutlined /> Thông báo mới nhất</h4>
          <ul className="notification-list">
            <li className="noti-item unread">
              <span className="noti-tag">Hệ thống</span>
              <div className="noti-body">
                <p className="noti-text">Chào mừng bạn gia nhập hệ thống Logistics TIXIMAX!</p>
                <span className="noti-time">Vừa xong</span>
              </div>
            </li>
            <li className="noti-item">
              <span className="noti-tag chính-sách">Chính sách</span>
              <div className="noti-body">
                <p className="noti-text">Cập nhật bảng giá vận chuyển quốc tế tuyến chính ngạch mới nhất.</p>
                <span className="noti-time">1 ngày trước</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}