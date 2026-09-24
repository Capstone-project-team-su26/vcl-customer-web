import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ShoppingOutlined } from "@ant-design/icons";

import ConsignmentOrder from "@features/consignment/pages/ConsignmentOrder/ConsignmentOrder";
import ConsignmentBuyOrder from "@features/purchase/pages/ConsignmentBuyOrder/ConsignmentBuyOrder";

import {
  CREATE_ORDER_TABS,
  createOrderPath,
} from "@features/orders/constants/orderPaths";

import "./CreateOrder.css";

const KyGuiIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="svc-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const SERVICES = [
  {
    id: CREATE_ORDER_TABS.consignment,
    title: "KÝ GỬI HÀNG HÓA",
    desc: "Bạn tự mua hàng và gửi về kho VCL tại nước ngoài để vận chuyển về Việt Nam.",
    icon: <KyGuiIcon />,
  },
  {
    id: CREATE_ORDER_TABS.purchase,
    title: "MUA HỘ HÀNG",
    desc: "VCL thay bạn mua hàng từ các website nước ngoài và vận chuyển về Việt Nam.",
    icon: <ShoppingOutlined className="svc-icon" />,
  },
];

const TAB_IDS = SERVICES.map((service) => service.id);

/**
 * Tạo đơn — MỘT trang, đổi giữa Ký gửi và Mua hộ ngay tại chỗ.
 *
 * Trước đây đây là màn chọn dịch vụ rồi mới rẽ sang một trong hai trang form, tức là
 * khách phải bấm thêm một nhịp chỉ để chọn, và đổi ý giữa chừng thì phải quay lui.
 * Giờ loại đơn nằm trên URL (`/create-order/ky-gui` | `/create-order/mua-ho`) nên vừa
 * chuyển tức thì, vừa gửi link thẳng tới đúng form được.
 */
export default function CreateOrder() {
  const navigate = useNavigate();
  const { tab } = useParams();

  /* Không có tab (vào thẳng /create-order) hoặc tab lạ → về form ký gửi. */
  if (!TAB_IDS.includes(tab)) {
    return <Navigate to={createOrderPath(CREATE_ORDER_TABS.consignment)} replace />;
  }

  return (
    <div className="create-order-container">
      <div className="create-order-switch" role="tablist" aria-label="Chọn loại đơn">
        {SERVICES.map((service) => (
          <button
            key={service.id}
            type="button"
            role="tab"
            aria-selected={tab === service.id}
            className={`create-order-switch__item ${
              tab === service.id ? "is-active" : ""
            }`}
            onClick={() => navigate(createOrderPath(service.id))}
          >
            <span className="svc-icon-wrapper">{service.icon}</span>

            <span className="create-order-switch__text">
              <strong>{service.title}</strong>
              <small>{service.desc}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="create-order-form">
        {tab === CREATE_ORDER_TABS.purchase ? (
          <ConsignmentBuyOrder />
        ) : (
          <ConsignmentOrder />
        )}
      </div>
    </div>
  );
}
