import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  HomeOutlined,
} from "@ant-design/icons";
import { Badge, Tooltip } from "antd";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";

import { PURCHASE_REQUEST_QUERY_KEY } from "@features/orders/constants/orderPaths";
import Sidebar from "@layouts/Sidebar/Sidebar";
import NotificationPanel from "@layouts/NotificationPanel/NotificationPanel";
import "./MainLayout.css";

/* Tiêu đề thanh header theo trang. Khớp theo TIỀN TỐ đường dẫn nên phải xếp mục cụ thể
   trước mục tổng quát (/orders/... trước /orders). `match` là chuỗi (chứa trong đường dẫn)
   hoặc RegExp; `query` (tuỳ chọn) bắt buộc URL có khoá query đó. */
const PAGE_META = [
  {
    match: "/customer/dashboard",
    title: "BẢNG ĐIỀU KHIỂN",
    subtitle: "Tổng quan đơn hàng và chi tiêu của bạn.",
  },
  {
    match: "/create-order/mua-ho",
    title: "TẠO ĐƠN MUA HỘ",
    subtitle: "Tạo yêu cầu mua hàng từ các website nước ngoài.",
  },
  {
    match: "/create-order",
    title: "TẠO ĐƠN KÝ GỬI",
    subtitle: "Khai báo hàng hóa và gửi về kho VCL.",
  },
  {
    match: /^\/orders\/mua-ho\/[^/]+\/bao-gia/,
    title: "BÁO GIÁ ĐƠN MUA HỘ",
    subtitle: "Báo giá chi tiết và khoản trả trước của yêu cầu mua hộ.",
  },
  {
    match: /^\/orders\/mua-ho\/[^/]+/,
    title: "CHI TIẾT ĐƠN MUA HỘ",
    subtitle: "Sản phẩm, thông tin nhận hàng và trạng thái xử lý của yêu cầu mua hộ.",
  },
  {
    match: "/orders/mua-ho",
    title: "ĐƠN MUA HỘ",
    subtitle: "Yêu cầu VCL mua hàng hộ và vận chuyển về Việt Nam.",
  },
  {
    match: "/orders/ky-gui",
    title: "ĐƠN KÝ GỬI",
    subtitle: "Hàng bạn tự mua và gửi về kho VCL, lọc theo việc bạn cần làm.",
  },
  {
    /* Đơn kho của yêu cầu mua hộ (PUR-…-n) mở bằng trang chi tiết đơn, kèm `?yc=` —
       cùng cách Sidebar tô mục "Đơn mua hộ". */
    match: "/orders/",
    query: PURCHASE_REQUEST_QUERY_KEY,
    title: "CHI TIẾT ĐƠN MUA HỘ",
    subtitle: "Hành trình, thanh toán và kiện & kho của đơn hàng VCL mua hộ bạn.",
  },
  {
    match: "/orders/",
    title: "CHI TIẾT ĐƠN KÝ GỬI",
    subtitle:
      "Hành trình, báo giá, thanh toán, kiện & kho và sự cố của đơn — tất cả trong một trang.",
  },
  {
    match: "/payment",
    title: "THANH TOÁN",
    subtitle: "Khoản đang chờ bạn trả và lịch sử giao dịch.",
  },
  {
    match: "/customer-service-chat",
    title: "HỖ TRỢ KHÁCH HÀNG",
    subtitle: "Trò chuyện trực tiếp với nhân viên VCL.",
  },
  {
    match: "/settings/profile-config",
    title: "CẤU HÌNH TÀI KHOẢN",
    subtitle: "Quản lý thông tin và thiết lập tài khoản.",
  },
  {
    match: "/settings/chinh-sach-dich-vu",
    title: "CHÍNH SÁCH DỊCH VỤ",
    subtitle: "Bảng giá vận chuyển và phí dịch vụ VCL đang áp dụng.",
  },
];

const matchesPageMeta = (item, pathname, searchParams) => {
  const pathMatches =
    item.match instanceof RegExp
      ? item.match.test(pathname)
      : pathname.includes(item.match);

  return pathMatches && (!item.query || searchParams.has(item.query));
};

const getPageMeta = (pathname, search = "") => {
  const searchParams = new URLSearchParams(search);

  return PAGE_META.find((item) =>
    matchesPageMeta(item, pathname, searchParams)
  ) || {
    title: "HỆ THỐNG VIETNAM LOGISTICS",
    subtitle:
      "Quản lý đơn hàng và dịch vụ vận chuyển.",
  };
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

export default function MainLayout() {
  const location = useLocation();

  const [currentTime, setCurrentTime] =
    useState(() => new Date());

  const [notifOpen, setNotifOpen] = useState(false);
  const handleOpenNotif = useCallback(() => setNotifOpen((v) => !v), []);
  const handleCloseNotif = useCallback(() => setNotifOpen(false), []);
  const bellRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const handleUnreadCountChange = useCallback((count) => setUnreadCount(count), []);

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
        location.pathname,
        location.search
      ),
    [location.pathname, location.search]
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
              {/* Chữ HOME là lối quay về Bảng điều khiển từ mọi trang. */}
              <Link
                to="/customer/dashboard"
                className="breadcrumb-home-link"
                title="Về Bảng điều khiển"
              >
                <span className="breadcrumb-home-box">
                  <HomeOutlined />
                </span>

                <span className="breadcrumb-root">
                  HOME
                </span>
              </Link>

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
            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <Tooltip title="Thông báo" placement="bottom">
                <button
                  ref={bellRef}
                  type="button"
                  className="header-bell-btn"
                  aria-label="Thông báo"
                  aria-expanded={notifOpen}
                  onClick={handleOpenNotif}
                >
                  <Badge
                    count={unreadCount > 99 ? "99+" : unreadCount}
                    showZero={false}
                    size="small"
                    style={{ backgroundColor: "#ea580c" }}
                  >
                    <NotificationsOutlinedIcon fontSize="medium" />
                  </Badge>
                </button>
              </Tooltip>

              <NotificationPanel
                open={notifOpen}
                onClose={handleCloseNotif}
                anchorRef={bellRef}
                onUnreadCountChange={handleUnreadCountChange}
              />
            </div>

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
          </div>
        </header>

        <div className="page-sub-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
