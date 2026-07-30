import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  HomeOutlined,
} from "@ant-design/icons";

import Sidebar from "../layouts/SidebarLayout/Sidebar";
import "./MainLayout.css";

const PAGE_META = [
  {
    match: "/create-order/buy-orders",
    title: "TẠO ĐƠN HÀNG MUA HỘ",
    subtitle:
      "Tạo yêu cầu mua hàng từ các website nước ngoài.",
  },
  {
    match: "/create-order/consignment",
    title: "TẠO ĐƠN HÀNG KÝ GỬI",
    subtitle:
      "Khai báo hàng hóa và gửi về kho VCL.",
  },
  {
    match: "/processing-orders",
    title: "ĐƠN ĐANG XỬ LÝ",
    subtitle:
      "Theo dõi tiến độ xử lý và vận chuyển đơn hàng.",
  },
  {
    match: "/check-orders",
    title: "KIỆN CHỜ BÁO GIÁ",
    subtitle:
      "Kiểm tra các kiện hàng đang chờ xác nhận chi phí.",
  },
  {
    match: "/quotations",
    title: "CHI TIẾT BÁO GIÁ",
    subtitle:
      "Xem chi tiết chi phí và xác nhận báo giá.",
  },
  {
    match: "/warehouse",
    title: "THEO DÕI KHO HÀNG",
    subtitle:
      "Theo dõi nhập kho, thông quan và xuất kho quốc tế.",
  },
  {
    match: "/settings/profile-config",
    title: "CẤU HÌNH TÀI KHOẢN",
    subtitle:
      "Quản lý thông tin và thiết lập tài khoản.",
  },
  {
    match:
      "/settings/chinh-sach-dich-vu",
    title: "CHÍNH SÁCH DỊCH VỤ",
    subtitle:
      "Thông tin điều khoản và chính sách sử dụng.",
  },
  {
    match: "/create-order",
    title: "TẠO ĐƠN HÀNG",
    subtitle:
      "Lựa chọn dịch vụ phù hợp để bắt đầu.",
  },
  {
    match: "/dashboard",
    title: "BẢNG ĐIỀU KHIỂN",
    subtitle:
      "Tổng quan hoạt động và tình trạng đơn hàng.",
  },
  

];

const getPageMeta = (pathname) =>
  PAGE_META.find((item) =>
    pathname.includes(item.match)
  ) || {
    title: "HỆ THỐNG VIETNAM LOGISTICS",
    subtitle:
      "Quản lý đơn hàng và dịch vụ vận chuyển.",
  };

const getTimeTheme = (date) => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return {
      key: "morning",
      greeting: "Chào buổi sáng",
      label: "Buổi sáng",
    };
  }

  if (hour >= 11 && hour < 17) {
    return {
      key: "day",
      greeting: "Chào buổi trưa",
      label: "Ban ngày",
    };
  }

  if (hour >= 17 && hour < 19) {
    return {
      key: "sunset",
      greeting: "Chào buổi chiều",
      label: "Hoàng hôn",
    };
  }

  return {
    key: "night",
    greeting: "Chào buổi tối",
    label: "Ban đêm",
  };
};

const TimeSceneIcon = ({ type }) => {
  if (type === "night") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20.2 15.1A8.35 8.35 0 0 1 8.9 3.8a8.5 8.5 0 1 0 11.3 11.3Z"
          fill="currentColor"
        />
        <path
          d="M17.5 3.5v2M16.5 4.5h2M20 8v1.5M19.25 8.75h1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "sunset") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 17a7 7 0 0 1 14 0"
          fill="currentColor"
        />
        <path
          d="M3 19h18M5 22h14M12 3v3M4.2 9.2l2.1 2.1M19.8 9.2l-2.1 2.1M2 15h3M19 15h3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4.5"
        fill="currentColor"
      />
      <path
        d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

const WalletIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h10A2.5 2.5 0 0 1 19 6.5v11A2.5 2.5 0 0 1 16.5 20h-10A2.5 2.5 0 0 1 4 17.5v-11Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M15 10h5v5h-5a2.5 2.5 0 1 1 0-5Z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle
      cx="15.5"
      cy="12.5"
      r="0.8"
      fill="currentColor"
    />
  </svg>
);

export default function MainLayout() {
  const location = useLocation();

  const [currentTime, setCurrentTime] =
    useState(() => new Date());

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setCurrentTime(new Date());
      }, 60 * 1000);

    return () =>
      window.clearInterval(intervalId);
  }, []);

  const pageMeta = useMemo(
    () =>
      getPageMeta(
        location.pathname
      ),
    [location.pathname]
  );

  const timeTheme = useMemo(
    () => getTimeTheme(currentTime),
    [currentTime]
  );

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat(
        "vi-VN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ).format(currentTime),
    [currentTime]
  );

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(
        "vi-VN",
        {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }
      ).format(currentTime),
    [currentTime]
  );

  const balance = 0;

  return (
    <div className="main-layout-container">
      <Sidebar />

      <main className="main-layout-content">
        <header
          className={[
            "main-header-layout",
            `main-header-layout--${timeTheme.key}`,
          ].join(" ")}
        >
          <div className="main-header-glow" />

          <div className="main-header-left">
            <div className="header-breadcrumb">
              <span className="breadcrumb-home-box">
                <HomeOutlined />
              </span>

              <span className="breadcrumb-root">
                HOME
              </span>

              <span className="breadcrumb-separator">
                /
              </span>

              <span className="breadcrumb-current">
                {pageMeta.title}
              </span>
            </div>

            <div className="header-page-copy">
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>
          </div>

          <div className="main-header-actions">
            <div
              className={[
                "time-scene-card",
                `time-scene-card--${timeTheme.key}`,
              ].join(" ")}
            >
              <div className="time-scene-icon">
                <TimeSceneIcon
                  type={timeTheme.key}
                />
              </div>

              <div className="time-scene-copy">
                <span>
                  {timeTheme.greeting}
                </span>

                <div className="time-scene-main">
                  <strong>
                    {formattedTime}
                  </strong>

                  <small>
                    {timeTheme.label}
                  </small>
                </div>

                <em>
                  {formattedDate}
                </em>
              </div>

              <span className="time-scene-status-dot" />
            </div>

            {/* <div className="header-balance-box">
              <div className="header-balance-icon">
                <WalletIcon />
              </div>

              <div className="header-balance-copy">
                <span>
                  SỐ DƯ KHẢ DỤNG
                </span>

                <strong>
                  {balance.toLocaleString(
                    "vi-VN"
                  )}
                  <small>đ</small>
                </strong>
              </div>
            </div> */}
          </div>
        </header>

        <div className="page-sub-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
