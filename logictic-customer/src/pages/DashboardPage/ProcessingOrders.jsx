import React from "react";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";


export default function ProcessingOrders() {
  return (
    <div className="processing-orders-page">
      <div className="page-header">
        <h2>Đơn hàng đang xử lý</h2>
        <p>Theo dõi tiến độ kiểm duyệt, báo giá và mua hàng từ phía tổng đài.</p>
      </div>

      {/* Thanh công cụ Bộ lọc (Tabs & Search) */}
      <div className="table-toolbar">
        <div className="filter-tabs">
          <button className="tab-item active">Tất cả (0)</button>
          <button className="tab-item">Chờ báo giá</button>
          <button className="tab-item">Chờ đặt cọc</button>
          <button className="tab-item">Đang mua hàng</button>
        </div>

        <div className="search-box-wrapper">
          <div className="search-input-group">
            <SearchOutlined className="search-icon" />
            <input type="text" placeholder="Tìm theo mã đơn, link..." className="search-input" />
          </div>
          <button className="btn-refresh"><ReloadOutlined /></button>
        </div>
      </div>

      {/* Bảng danh sách đơn hàng */}
      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Thời Gian Tạo</th>
              <th>Kho Nhận</th>
              <th>Số Loại SP</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {/* Dữ liệu trống mẫu */}
            <tr>
              <td colSpan="7" className="empty-table-cell">
                <div className="empty-state">
                  <p>Không tìm thấy đơn hàng nào đang trong quá trình xử lý</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}