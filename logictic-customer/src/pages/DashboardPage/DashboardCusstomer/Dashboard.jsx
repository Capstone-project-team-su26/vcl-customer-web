import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  WalletOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  SyncOutlined,
  BellOutlined,
  PlusCircleOutlined,
  SendOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  RiseOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import "./Dashboard.css";

const DASHBOARD_STATS = [
  {
    id: "balance",
    label: "Số dư tài khoản",
    value: "0đ",
    note: "Sẵn sàng sử dụng",
    icon: WalletOutlined,
    theme: "green",
  },
  {
    id: "purchase",
    label: "Tổng đơn mua hộ",
    value: "0 đơn",
    note: "Trong tháng này",
    icon: ShoppingCartOutlined,
    theme: "blue",
  },
  {
    id: "consignment",
    label: "Tổng đơn ký gửi",
    value: "0 đơn",
    note: "Trong tháng này",
    icon: InboxOutlined,
    theme: "orange",
  },
  {
    id: "processing",
    label: "Đơn đang xử lý",
    value: "0 đơn",
    note: "Đang vận chuyển",
    icon: SyncOutlined,
    theme: "purple",
  },
];

const MONTHLY_CHART = [
  {
    month: "T1",
    purchase: 22,
    consignment: 14,
  },
  {
    month: "T2",
    purchase: 34,
    consignment: 24,
  },
  {
    month: "T3",
    purchase: 43,
    consignment: 31,
  },
  {
    month: "T4",
    purchase: 38,
    consignment: 27,
  },
  {
    month: "T5",
    purchase: 54,
    consignment: 42,
  },
  {
    month: "T6",
    purchase: 47,
    consignment: 35,
  },
  {
    month: "T7",
    purchase: 62,
    consignment: 49,
  },
];

const QUICK_ACTIONS = [
  {
    id: "create-purchase",
    title: "Tạo đơn mua hộ",
    description:
      "Tạo yêu cầu mua hàng từ Nhật, Hàn Quốc và các quốc gia hỗ trợ.",
    icon: PlusCircleOutlined,
    route: "/create-order",
    theme: "blue",
  },
  {
    id: "create-consignment",
    title: "Tạo đơn ký gửi",
    description:
      "Khai báo hàng hóa đã mua và gửi về kho quốc tế.",
    icon: SendOutlined,
    route: "/create-order/consignment",
    theme: "orange",
  },
  {
    id: "processing-orders",
    title: "Theo dõi đơn hàng",
    description:
      "Kiểm tra trạng thái xử lý và hành trình vận chuyển.",
    icon: UnorderedListOutlined,
    route: "/processing-orders",
    theme: "purple",
  },
  {
    id: "service-policy",
    title: "Chính sách dịch vụ",
    description:
      "Xem bảng giá, cách tính cân và quy định vận chuyển.",
    icon: FileTextOutlined,
    route: "/settings/chinh-sach-dich-vu",
    theme: "green",
  },
];

const RECENT_ORDERS = [
  {
    id: "VCL-DEMO-001",
    service: "Mua hộ",
    route: "Nhật Bản → Việt Nam",
    value: "0đ",
    status: "Chờ tạo đơn",
    statusType: "waiting",
  },
  {
    id: "VCL-DEMO-002",
    service: "Ký gửi",
    route: "Hàn Quốc → Việt Nam",
    value: "0đ",
    status: "Chưa có dữ liệu",
    statusType: "empty",
  },
];

const NOTIFICATIONS = [
  {
    id: 1,
    category: "Hệ thống",
    title:
      "Chào mừng bạn gia nhập hệ thống Việt Nam Logictic!",
    time: "Vừa xong",
    unread: true,
    type: "system",
  },
  {
    id: 2,
    category: "Mua hộ",
    title:
      "Bảng giá dịch vụ mua hộ mới nhất đã được cập nhật.",
    time: "1 ngày trước",
    unread: false,
    type: "purchase",
  },
  {
    id: 3,
    category: "Ký gửi",
    title:
      "Quy trình ký gửi hàng về kho quốc tế đã được cập nhật.",
    time: "3 ngày trước",
    unread: false,
    type: "consignment",
  },
];

const getSessionUserName = () => {
  try {
    const storedUser = sessionStorage.getItem("user");

    if (storedUser) {
      const user = JSON.parse(storedUser);

      return (
        user.fullName ||
        user.name ||
        user.userName ||
        "Khách hàng"
      );
    }

    return (
      sessionStorage.getItem("fullName") ||
      "Khách hàng"
    );
  } catch {
    return "Khách hàng";
  }
};

export default function Dashboard() {
  const navigate = useNavigate();

  const userName = useMemo(
    () => getSessionUserName(),
    []
  );

  const currentDate = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }, []);

  const handleNavigate = (route) => {
    navigate(route);
  };

  return (
    <main className="customer-dashboard">
      <section className="customer-dashboard__welcome">
        <div className="customer-dashboard__welcome-decoration customer-dashboard__welcome-decoration--one" />
        <div className="customer-dashboard__welcome-decoration customer-dashboard__welcome-decoration--two" />

        <div className="customer-dashboard__welcome-content">
          <div className="customer-dashboard__welcome-date">
            <CalendarOutlined />
            <span>{currentDate}</span>
          </div>

          <h1>
            Xin chào, <span>{userName}</span>
          </h1>

          <p>
            Theo dõi đơn hàng, quản lý giao dịch và sử
            dụng các dịch vụ logistics quốc tế tại một
            nơi.
          </p>

          <div className="customer-dashboard__welcome-actions">
            <button
              type="button"
              className="customer-dashboard__primary-button"
              onClick={() =>
                handleNavigate("/create-order")
              }
            >
              <PlusCircleOutlined />
              Tạo đơn mua hộ
            </button>

            <button
              type="button"
              className="customer-dashboard__secondary-button"
              onClick={() =>
                handleNavigate(
                  "/create-order/consignment"
                )
              }
            >
              <SendOutlined />
              Tạo đơn ký gửi
            </button>
          </div>
        </div>

        <div
          className="customer-dashboard__welcome-visual"
          aria-hidden="true"
        >
          <div className="customer-dashboard__welcome-globe">
            <span />
            <span />
            <span />
          </div>

          <div className="customer-dashboard__welcome-package">
            <div className="customer-dashboard__welcome-package-top" />
            <div className="customer-dashboard__welcome-package-front">
              VN
            </div>
            <div className="customer-dashboard__welcome-package-side" />
          </div>

          <div className="customer-dashboard__welcome-plane">
            ✈
          </div>
        </div>
      </section>

      <section
        className="customer-dashboard__stats"
        aria-label="Thống kê tài khoản"
      >
        {DASHBOARD_STATS.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.id}
              className={`customer-dashboard__stat-card customer-dashboard__stat-card--${stat.theme}`}
            >
              <div
                className={`customer-dashboard__stat-icon customer-dashboard__stat-icon--${stat.theme}`}
              >
                <Icon />
              </div>

              <div className="customer-dashboard__stat-content">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>

                <small>
                  <RiseOutlined />
                  {stat.note}
                </small>
              </div>

              <span className="customer-dashboard__stat-pattern" />
            </article>
          );
        })}
      </section>

      <section className="customer-dashboard__quick-section">
        <div className="customer-dashboard__section-heading">
          <div>
            <span>TRUY CẬP NHANH</span>
            <h2>Bắt đầu thao tác</h2>
          </div>

          <p>
            Các chức năng thường xuyên sử dụng trong hệ
            thống.
          </p>
        </div>

        <div className="customer-dashboard__quick-grid">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                type="button"
                className={`customer-dashboard__quick-card customer-dashboard__quick-card--${action.theme}`}
                onClick={() =>
                  handleNavigate(action.route)
                }
              >
                <span
                  className={`customer-dashboard__quick-icon customer-dashboard__quick-icon--${action.theme}`}
                >
                  <Icon />
                </span>

                <span className="customer-dashboard__quick-content">
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>

                <ArrowRightOutlined className="customer-dashboard__quick-arrow" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="customer-dashboard__main-grid">
        <article className="customer-dashboard__panel customer-dashboard__chart-panel">
          <div className="customer-dashboard__panel-header">
            <div>
              <span>THỐNG KÊ ĐƠN HÀNG</span>
              <h2>Mua hộ và ký gửi</h2>
            </div>

            <div className="customer-dashboard__chart-legend">
              <span>
                <i className="customer-dashboard__legend-dot customer-dashboard__legend-dot--purchase" />
                Mua hộ
              </span>

              <span>
                <i className="customer-dashboard__legend-dot customer-dashboard__legend-dot--consignment" />
                Ký gửi
              </span>
            </div>
          </div>

          <div className="customer-dashboard__chart-summary">
            <div>
              <span>Tổng đơn tháng này</span>
              <strong>0 đơn</strong>
            </div>

            <span className="customer-dashboard__chart-change">
              Chưa có biến động
            </span>
          </div>

          <div className="customer-dashboard__chart">
            <div className="customer-dashboard__chart-lines">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="customer-dashboard__chart-columns">
              {MONTHLY_CHART.map((item) => (
                <div
                  key={item.month}
                  className="customer-dashboard__chart-column"
                >
                  <div className="customer-dashboard__chart-bars">
                    <span
                      className="customer-dashboard__chart-bar customer-dashboard__chart-bar--purchase"
                      style={{
                        height: `${item.purchase}%`,
                      }}
                    />

                    <span
                      className="customer-dashboard__chart-bar customer-dashboard__chart-bar--consignment"
                      style={{
                        height: `${item.consignment}%`,
                      }}
                    />
                  </div>

                  <small>{item.month}</small>
                </div>
              ))}
            </div>

            <div className="customer-dashboard__chart-empty">
              <span>
                Biểu đồ minh họa
              </span>
            </div>
          </div>
        </article>

        <article className="customer-dashboard__panel customer-dashboard__notification-panel">
          <div className="customer-dashboard__panel-header">
            <div>
              <span>TRUNG TÂM THÔNG BÁO</span>
              <h2>
                <BellOutlined />
                Thông báo mới nhất
              </h2>
            </div>

            <button
              type="button"
              className="customer-dashboard__text-button"
            >
              Xem tất cả
            </button>
          </div>

          <div className="customer-dashboard__notification-list">
            {NOTIFICATIONS.map((notification) => (
              <article
                key={notification.id}
                className={`customer-dashboard__notification ${
                  notification.unread
                    ? "is-unread"
                    : ""
                }`}
              >
                <span
                  className={`customer-dashboard__notification-icon customer-dashboard__notification-icon--${notification.type}`}
                >
                  {notification.type === "system" ? (
                    <SafetyCertificateOutlined />
                  ) : notification.type ===
                    "purchase" ? (
                    <ShoppingCartOutlined />
                  ) : (
                    <InboxOutlined />
                  )}
                </span>

                <div className="customer-dashboard__notification-body">
                  <div className="customer-dashboard__notification-meta">
                    <span>{notification.category}</span>

                    {notification.unread && (
                      <i>NEW</i>
                    )}
                  </div>

                  <p>{notification.title}</p>

                  <small>
                    <ClockCircleOutlined />
                    {notification.time}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="customer-dashboard__panel customer-dashboard__orders-panel">
        <div className="customer-dashboard__panel-header">
          <div>
            <span>HOẠT ĐỘNG GẦN ĐÂY</span>
            <h2>Đơn hàng mới nhất</h2>
          </div>

          <button
            type="button"
            className="customer-dashboard__text-button"
            onClick={() =>
              handleNavigate("/processing-orders")
            }
          >
            Xem danh sách
            <ArrowRightOutlined />
          </button>
        </div>

        <div className="customer-dashboard__orders-table-wrapper">
          <table className="customer-dashboard__orders-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Dịch vụ</th>
                <th>Tuyến vận chuyển</th>
                <th>Giá trị</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {RECENT_ORDERS.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                  </td>

                  <td>{order.service}</td>
                  <td>{order.route}</td>
                  <td>{order.value}</td>

                  <td>
                    <span
                      className={`customer-dashboard__order-status customer-dashboard__order-status--${order.statusType}`}
                    >
                      {order.statusType ===
                        "waiting" && (
                        <ClockCircleOutlined />
                      )}

                      {order.statusType ===
                        "empty" && (
                        <CheckCircleFilled />
                      )}

                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customer-dashboard__orders-empty-note">
          Dữ liệu trên là nội dung minh họa. Khi có đơn
          hàng, thông tin thực tế sẽ hiển thị tại đây.
        </div>
      </section>
    </main>
  );
}