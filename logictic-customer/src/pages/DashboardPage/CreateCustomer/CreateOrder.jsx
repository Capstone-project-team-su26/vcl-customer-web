import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingOutlined,
  HistoryOutlined,
  SwapOutlined,
  PropertySafetyOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import "./CreateOrder.css";

export default function CreateOrder() {
  const navigate = useNavigate();

  // Mảng danh sách dịch vụ để render động cho sạch code
  const services = [
    {
      id: "mua-ho",
      title: "MUA HỘ HÀNG",
      desc: "VCL thay bạn mua hàng từ các website nước ngoài và vận chuyển về Việt Nam.",
      icon: <ShoppingOutlined className="svc-icon icon-green" />,
      status: "active",
      path: "/create-order/buy-on-behalf", // Đường dẫn trang con khi click
    },
    {
      id: "ky-gui",
      title: "KÝ GỬI HÀNG HÓA",
      desc: "Bạn tự mua hàng và gửi về kho VCL tại nước ngoài để vận chuyển về Việt Nam.",
      icon:     <svg xmlns="http://www.w3.org/2000/svg" className="svc-icon icon-orange"  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
      status: "active",
      path: "/create-order/consignment",
    },
    {
      id: "chuyen-tien",
      title: "CHUYỂN TIỀN / ĐỔI TIỀN",
      desc: "Dịch vụ chuyển nhận tiền ngoại tệ với tỷ giá cạnh tranh.",
      icon: <SwapOutlined className="svc-icon icon-purple" />,
      status: "coming-soon",
    },
    {
      id: "dau-gia",
      title: "ĐẤU GIÁ HỘ",
      desc: "Hỗ trợ đấu giá trên các nền tảng Đấu giá. Vui lòng liên hệ nhân viên để được tư vấn.",
      icon: <PropertySafetyOutlined className="svc-icon icon-blue" />,
      status: "coming-soon",
    },
  ];

  const handleServiceClick = (svc) => {
    if (svc.status === "active" && svc.path) {
      navigate(svc.path);
    }
  };

  return (
    <div className="create-order-container">
      <div className="create-order-header">
        <h2 className="main-title">TẠO ĐƠN HÀNG MỚI</h2>
        <p className="subtitle">Chọn loại dịch vụ bạn muốn sử dụng để bắt đầu</p>
      </div>

      <div className="services-grid">
        {services.map((svc) => {
          const isActive = svc.status === "active";

          return (
            <div
              key={svc.id}
              className={`service-card ${isActive ? "card-active" : "card-disabled"}`}
              onClick={() => handleServiceClick(svc)}
            >
              {/* Badge Sắp ra mắt */}
              {!isActive && <div className="coming-soon-badge">SẮP RA MẮT</div>}

              {/* Khu vực Icon đầu ô */}
              <div className="svc-icon-wrapper">{svc.icon}</div>

              {/* Nội dung text */}
              <div className="svc-content">
                <h3 className="svc-title">{svc.title}</h3>
                <p className="svc-desc">{svc.desc}</p>
              </div>

              {/* Nút hành động ở dưới cùng */}
              <div className="svc-footer">
                {isActive ? (
                  <button className="btn-action btn-next">
                    TIẾP TỤC <ArrowRightOutlined className="arrow-next" />
                  </button>
                ) : (
                  <button className="btn-action btn-consult" onClick={(e) => e.stopPropagation()}>
                    LIÊN HỆ TƯ VẤN
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}