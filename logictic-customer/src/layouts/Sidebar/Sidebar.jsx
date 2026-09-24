import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AppstoreOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusCircleOutlined,
  SettingOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

import { getUserProfileApi } from "@features/auth/api/authService";
import { usePendingQuotationCounts } from "@shared/hooks/usePendingQuotationCounts";
import logoImage from "@assets/anhlogocap2.jpeg";

import "./Sidebar.css";

/**
 * Nhãn số việc đang chờ khách xử lý trên menu.
 * Bằng 0 thì không vẽ gì — menu sạch hơn là gắn số 0 vô nghĩa lên mọi mục.
 */
const MenuBadge = ({ count, label }) => {
  if (!count || count <= 0) return null;

  return (
    <span
      className="menu-badge"
      aria-label={`${count} ${label}`}
      title={`${count} ${label}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

const SIDEBAR_PROFILE_SYNC_KEY = "sidebarProfileSynced";

const parseSessionUser = () => {
  try {
    const userString = sessionStorage.getItem("user");

    if (userString) {
      const user = JSON.parse(userString);

      return {
        id:
          user.userId ||
          user.id ||
          user.customerId ||
          "",
        fullName:
          user.fullName ||
          user.name ||
          user.userName ||
          "Khách hàng",
        phone:
          user.phone ||
          sessionStorage.getItem("phone") ||
          "",
      };
    }

    return {
      id:
        sessionStorage.getItem("id") ||
        sessionStorage.getItem("customerId") ||
        "",
      fullName:
        sessionStorage.getItem("fullName") ||
        "Khách hàng",
      phone: sessionStorage.getItem("phone") || "",
    };
  } catch (error) {
    console.error("Lỗi đọc session tại Sidebar:", error);

    return {
      id: "",
      fullName: "Khách hàng",
      phone: "",
    };
  }
};

const syncSessionFromProfile = (profile) => {
  try {
    const userString = sessionStorage.getItem("user");
    const currentUser = userString
      ? JSON.parse(userString)
      : {};

    const mergedUser = {
      ...currentUser,
      ...profile,
    };

    sessionStorage.setItem(
      "user",
      JSON.stringify(mergedUser)
    );

    if (profile.fullName) {
      sessionStorage.setItem(
        "fullName",
        profile.fullName
      );
    }

    if (profile.phone) {
      sessionStorage.setItem(
        "phone",
        profile.phone
      );
    }
  } catch (error) {
    console.error(
      "Lỗi đồng bộ session tại Sidebar:",
      error
    );
  }
};

/* Menu phẳng: mỗi mục là một dòng, không nhóm gập. Mục nào có URL con (chi tiết đơn,
   tab thanh toán, tab tạo đơn) thì tự nhận diện bằng tiền tố đường dẫn. */
const startsWith = (pathname, prefix) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const [userInfo, setUserInfo] = useState(
    parseSessionUser
  );

  // Số đơn đang chờ khách xác nhận báo giá, hiện lên menu để khách biết mà bấm vào.
  const pendingQuotations = usePendingQuotationCounts();

  /* Đơn mua hộ nằm dưới /orders/mua-ho/...; mọi URL /orders còn lại là đơn ký gửi
     (danh sách /orders/ky-gui và chi tiết /orders/:orderId/:tab). */
  const purchaseOrdersActive = startsWith(pathname, "/orders/mua-ho");
  const consignmentOrdersActive =
    !purchaseOrdersActive && startsWith(pathname, "/orders");
  const createOrderActive = startsWith(pathname, "/create-order");
  const paymentActive = startsWith(pathname, "/payment");

  const loadProfileOnce = useCallback(async () => {
    // Hiển thị dữ liệu session ngay lập tức, không hiện loading
    // mỗi khi người dùng chuyển menu.
    setUserInfo(parseSessionUser());

    const profileAlreadySynced =
      sessionStorage.getItem(
        SIDEBAR_PROFILE_SYNC_KEY
      ) === "true";

    if (profileAlreadySynced) {
      return;
    }

    try {
      const profile = await getUserProfileApi();

      if (!profile) {
        return;
      }

      syncSessionFromProfile(profile);

      setUserInfo({
        id:
          profile.userId ||
          profile.id ||
          profile.customerId ||
          "",
        fullName:
          profile.fullName ||
          profile.name ||
          profile.userName ||
          "Khách hàng",
        phone: profile.phone || "",
      });

      sessionStorage.setItem(
        SIDEBAR_PROFILE_SYNC_KEY,
        "true"
      );
    } catch (error) {
      console.error(
        "Lỗi lấy profile tại Sidebar:",
        error
      );
    }
  }, []);

  // Chỉ tải hồ sơ một lần khi Sidebar được khởi tạo.
  // Không phụ thuộc pathname nên chuyển menu sẽ không gọi lại API.
  useEffect(() => {
    loadProfileOnce();
  }, [loadProfileOnce]);

  const { id, fullName, phone } = userInfo;

  const avatarLetter =
    fullName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";

  const phoneDisplay = phone
    ? `SĐT: ${phone}`
    : id
      ? `ID: ${id}`
      : "Chưa có số điện thoại";

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    navigate("/", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar-container">
      <div className="sidebar-fixed-top">
        <div className="sidebar-customer-label">
          CUSTOMER
        </div>

        <div className="sidebar-header">
          <NavLink
            to="/"
            className="sidebar-brand-logo"
            aria-label="Về trang chủ Việt Nam Logictic"
            title="Về trang chủ Việt Nam Logictic"
          >
            <img
              src={logoImage}
              alt="Logo Việt Nam Logictic"
              className="sidebar-brand-logo__image"
              width="1000"
              height="400"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable="false"
            />
          </NavLink>
        </div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `profile-card ${
              isActive
                ? "profile-card-active"
                : ""
            }`
          }
          title="Xem và cập nhật hồ sơ"
        >
          <div className="avatar-wrapper">
            <div className="avatar-circle">
              {avatarLetter}
            </div>

            <span className="status-dot-online" />
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <span className="profile-name">
                {fullName}
              </span>

              <svg
                className="verified-badge"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            <div className="profile-id">
              {phoneDisplay}
            </div>
          </div>
        </NavLink>
      </div>

      {/* Menu phẳng, mỗi việc một dòng — không còn nhóm gập để khách phải bấm hai nhịp
          mới thấy trang mình cần. Ký gửi và mua hộ tách hai mục nhưng dùng chung một
          component danh sách, chỉ khác loại đơn đã khoá sẵn. */}
      <div className="sidebar-scrollable-menu">
        <div className="menu-section-label">QUẢN LÝ</div>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <AppstoreOutlined className="menu-icon" />
          <span className="menu-text">Bảng điều khiển</span>
        </NavLink>

        <NavLink
          to="/create-order"
          className={() => `menu-item ${createOrderActive ? "active" : ""}`}
        >
          <PlusCircleOutlined className="menu-icon" />
          <span className="menu-text">Tạo đơn</span>
        </NavLink>

        <NavLink
          to="/orders/ky-gui"
          className={() => `menu-item ${consignmentOrdersActive ? "active" : ""}`}
        >
          <InboxOutlined className="menu-icon" />
          <span className="menu-text">Đơn ký gửi</span>

          <MenuBadge
            count={pendingQuotations.consignment}
            label="đơn ký gửi chờ bạn xác nhận báo giá"
          />
        </NavLink>

        <NavLink
          to="/orders/mua-ho"
          className={() => `menu-item ${purchaseOrdersActive ? "active" : ""}`}
        >
          <ShoppingOutlined className="menu-icon" />
          <span className="menu-text">Đơn mua hộ</span>

          <MenuBadge
            count={pendingQuotations.purchase}
            label="đơn mua hộ chờ bạn xác nhận báo giá"
          />
        </NavLink>

        <NavLink
          to="/payment"
          className={() => `menu-item ${paymentActive ? "active" : ""}`}
        >
          <CreditCardOutlined className="menu-icon" />
          <span className="menu-text">Thanh toán</span>
        </NavLink>

        <div className="menu-section-label">HỖ TRỢ &amp; TÀI KHOẢN</div>

        <NavLink
          to="/customer-service-chat"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <CustomerServiceOutlined className="menu-icon" />
          <span className="menu-text">Trò chuyện với CSKH</span>
        </NavLink>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <SettingOutlined className="menu-icon" />
          <span className="menu-text">Cấu hình tài khoản</span>
        </NavLink>

        <NavLink
          to="/settings/chinh-sach-dich-vu"
          className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}
        >
          <FileTextOutlined className="menu-icon" />
          <span className="menu-text">Chính sách dịch vụ</span>
        </NavLink>
      </div>

      <div className="sidebar-fixed-bottom">
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          <LogoutOutlined />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
