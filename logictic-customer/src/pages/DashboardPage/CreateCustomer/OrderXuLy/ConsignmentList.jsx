import React, { useEffect, useState } from "react";
import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import "./ConsignmentList.css";

// Kết hợp các Component của Ant Design và MUI
import { Input, DatePicker, Space } from "antd";
import { Button, CircularProgress, Pagination } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";

const { RangePicker } = DatePicker;

const ConsignmentList = () => {
  const [consignments, setConsignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Quản lý các tham số bộ lọc thực tế gửi lên API
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 2. Quản lý phân trang
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10,
    totalPages: 1,
    totalCount: 0,
  });

  // Hàm gọi API được thiết kế để nhận đầy đủ tham số tìm kiếm
  const fetchConsignments = async (page = 1, currentSearch = "", from = "", to = "") => {
    try {
      setLoading(true);
      // Truyền trực tiếp các tham số bộ lọc vào hàm gọi API của bạn
      const res = await getConsignmentsApi(page, pagination.pageSize, currentSearch, from, to);
      
      if (res && res.data) {
        setConsignments(res.data.items || []);
        setPagination({
          pageNumber: res.data.pageNumber,
          pageSize: res.data.pageSize,
          totalPages: res.data.totalPages,
          totalCount: res.data.totalCount,
        });
      }
    } catch (error) {
      console.error("Lỗi hệ thống khi lấy danh sách ký gửi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động tải dữ liệu khi chuyển trang hoặc khi bộ lọc thay đổi thực tế
  useEffect(() => {
    fetchConsignments(pagination.pageNumber, search, startDate, endDate);
  }, [pagination.pageNumber]);

  // Hành động xử lý khi click nút "BỘ LỌC"
  const handleFilterClick = () => {
    setPagination(prev => ({ ...prev, pageNumber: 1 })); // Reset về trang 1 khi lọc mới
    fetchConsignments(1, search, startDate, endDate);
  };

  // Hành động xử lý khi click nút "LÀM MỚI"
  const handleResetClick = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
    fetchConsignments(1, "", "", ""); // Gọi lại API mặc định trống
  };

  // Xử lý khi chọn khoảng ngày trên Antd RangePicker
  const handleDateRangeChange = (dates, dateStrings) => {
    if (dates) {
      setStartDate(dateStrings[0]); // định dạng YYYY-MM-DD
      setEndDate(dateStrings[1]);   // định dạng YYYY-MM-DD
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Sửa lỗi hiển thị thời gian từ chuỗi ISO dài của API sang đúng múi giờ thực tế VN
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    // Cắt tỉa bớt phần mili-giây quá dài nếu có để đối tượng Date không bị lỗi Invalid
    const cleanedDateStr = dateString.includes('.') ? dateString.split('.')[0] : dateString;
    const d = new Date(cleanedDateStr);
    
    if (isNaN(d.getTime())) return "-"; // Kiểm tra nếu ngày lỗi

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const getStatusLabel = (status) => {
    if (status === "PENDING_REVIEW") return "CHỜ XÁC NHẬN";
    return status;
  };

  const handleViewDetail = (orderId) => {
    alert(`Bấm sang xem chi tiết đơn hàng ID: ${orderId}`);
  };

  return (
    <div className="vcl-container">
      <div className="page-header">
        <h1 className="page-title">THEO DÕI VẬN CHUYỂN</h1>
        <p className="page-subtitle">Hệ thống tra cứu thông tin trạng thái lô hàng thời gian thực</p>
      </div>

      {/* Thanh công cụ tìm kiếm kết hợp Antd và MUI */}
      <div className="filter-section">
        <Space size="middle">
          <Input 
            placeholder="Tìm theo mã đơn, khách hàng..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280, height: 40, borderRadius: 8 }}
            allowClear
          />
          <RangePicker 
            placeholder={['Từ ngày', 'Đến ngày']}
            onChange={handleDateRangeChange}
            style={{ height: 40, borderRadius: 8 }}
          />
        </Space>

        <Button
          variant="contained"
          startIcon={<FilterAltIcon />}
          onClick={handleFilterClick}
          style={{ textTransform: "none", fontWeight: "600", height: "40px", borderRadius: "8px", marginLeft: "8px", backgroundColor: "#2563EB" }}
        >
          BỘ LỌC
        </Button>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<AutorenewIcon />}
          onClick={handleResetClick}
          style={{ textTransform: "none", fontWeight: "600", height: "40px", borderRadius: "8px", borderColor: "#E2E8F0" }}
        >
          LÀM MỚI
        </Button>
      </div>

      {/* Phần danh sách thẻ hiển thị dữ liệu */}
      {loading ? (
        <div className="vcl-loading-box">
          <CircularProgress size={35} />
          <div>Đang cập nhật trạng thái dữ liệu...</div>
        </div>
      ) : (
        <>
          <div className="card-list">
            {consignments.length === 0 ? (
              <div className="empty-container">Không tìm thấy đơn hàng ký gửi nào phù hợp</div>
            ) : (
              consignments.map((item) => (
                <div key={item.orderId} className="consignment-card">
                  <div className="card-header">
                    <div className="header-left">
                      <span className="order-code">
                        {item.consignmentCode || `KG-${item.orderId.substring(0, 7).toUpperCase()}`}
                      </span>
                      <span className="tag-type">
                        {item.consignmentType === "Express" ? "KÝ GỬI" : item.consignmentType}
                      </span>
                      <span className="tag-count">1 sản phẩm</span>
                      <span className="tag-status-header">{getStatusLabel(item.status)}</span>
                    </div>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => handleViewDetail(item.orderId)}
                      style={{ textTransform: "none", borderRadius: "20px", color: "#1E293B", borderColor: "#E2E8F0" }}
                    >
                      Xem chi tiết
                    </Button>
                  </div>

                  <div className="sub-header">
                    <span>1 kiện hàng</span>
                    <span style={{ marginLeft: "12px" }}>📅 Ngày tạo: {formatDate(item.createdAt)}</span>
                    <span className="price-total-header">TỔNG ĐƠN HÀNG: <b style={{ color: "#FF9800" }}>0 đ</b></span>
                  </div>

                  <div className="card-body">
                    <div className="body-left">
                      <div className="box-icon">📦</div>
                      <div className="product-info">
                        <div className="customer-name">{item.customerName}</div>
                        <div className="sku-tag">DH-{item.orderId.substring(0, 7).toUpperCase()}</div>
                        <div className="link-text">1 link</div>
                        <div className="qty-tag">Số lượng: 1</div>
                      </div>
                    </div>

                    <div className="body-right">
                      <span className="status-badge-center">{getStatusLabel(item.status)}</span>
                      <div className="total-web-text">TỔNG WEB: <b style={{ color: "#1E293B" }}>0 đ</b></div>
                      <div className="specs-text">(TL: {item.totalWeight} kg - TT: {item.totalVolume} cm³)</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Phân trang thế hệ mới dùng MUI Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
            <span style={{ fontSize: "14px", color: "#4B5563" }}>
              Hiển thị <b>{consignments.length}</b> trên tổng số <b>{pagination.totalCount}</b> mục
            </span>
            <Pagination 
              count={pagination.totalPages} 
              page={pagination.pageNumber} 
              onChange={(e, value) => setPagination(prev => ({ ...prev, pageNumber: value }))} 
              color="primary" 
              shape="rounded"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ConsignmentList;