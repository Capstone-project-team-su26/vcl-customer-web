import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import "./CreateOrder.css";

const KyGuiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="svc-icon icon-orange" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

export default function CreateOrder() {
  const navigate = useNavigate();

  const services = [
    {
      id: "mua-ho",
      title: "MUA HỘ HÀNG",
      desc: "VCL thay bạn mua hàng từ các website nước ngoài và vận chuyển về Việt Nam.",
      icon: <ShoppingOutlined className="svc-icon icon-green" />,
      path: "/create-order/buy-on-behalf",
    },
    {
      id: "ky-gui",
      title: "KÝ GỬI HÀNG HÓA",
      desc: "Bạn tự mua hàng và gửi về kho VCL tại nước ngoài để vận chuyển về Việt Nam.",
      icon: <KyGuiIcon />,
      path: "/create-order/consignment",
    },
  ];

  return (
    <div className="create-order-container">
      <div className="create-order-header">
        <h2 className="main-title">TẠO ĐƠN HÀNG MỚI</h2>
        <p className="subtitle">Chọn dịch vụ Mua hộ hoặc Ký gửi để bắt đầu</p>
      </div>

      <div className="services-grid services-grid--two">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="service-card card-active"
            onClick={() => navigate(svc.path)}
          >
            <div className="svc-icon-wrapper">{svc.icon}</div>
            <div className="svc-content">
              <h3 className="svc-title">{svc.title}</h3>
              <p className="svc-desc">{svc.desc}</p>
            </div>
            <div className="svc-footer">
              <button type="button" className="btn-action btn-next">
                TIẾP TỤC <ArrowRightOutlined className="arrow-next" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
