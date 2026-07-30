import React, {
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
  DownloadOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusCircleOutlined,
  SettingOutlined,
  TransactionOutlined,
  UnorderedListOutlined,
  UpOutlined,
} from "@ant-design/icons";

import { getUserProfileApi } from "../../api/Auth/authService";
import logoImage from "../../assets/anhlogocap2.jpeg";

import "./Sidebar.css";

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

const getSubMenuStateByPath = (pathname) => ({
  lichSu: pathname.startsWith("/history/"),
  khoHang: pathname.startsWith("/warehouse/"),
  donDangXuLy:
    pathname === "/processing-orders" ||
    pathname.startsWith("/processing-orders/"),
  kienChoBaoGia:
    pathname === "/check-orders" ||
    pathname.startsWith("/check-orders/"),
});

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const [userInfo, setUserInfo] = useState(
    parseSessionUser
  );

  const [openSubMenus, setOpenSubMenus] = useState(
    () => getSubMenuStateByPath(pathname)
  );

  const processingPurchaseActive =
    pathname ===
      "/processing-orders/purchase-requests" ||
    pathname.startsWith(
      "/processing-orders/purchase-requests/"
    );

  const processingConsignmentActive =
    pathname === "/processing-orders" ||
    (pathname.startsWith("/processing-orders/") &&
      !processingPurchaseActive);

  const quotationPurchaseActive =
    pathname === "/check-orders/buy-on-behalf" ||
    pathname.startsWith(
      "/check-orders/buy-on-behalf/"
    );

  const quotationConsignmentActive =
    pathname === "/check-orders" ||
    (pathname.startsWith("/check-orders/") &&
      !quotationPurchaseActive);

  const historyPurchaseActive =
    pathname === "/history/buy-on-behalf" ||
    pathname.startsWith(
      "/history/buy-on-behalf/"
    );

  const historyConsignmentActive =
    pathname === "/history/consignment" ||
    pathname.startsWith(
      "/history/consignment/"
    );

  const warehouseInventoryActive =
    pathname === "/warehouse/inventory" ||
    pathname.startsWith("/warehouse/inventory/");

  const warehouseExportActive =
    pathname === "/warehouse/export" ||
    pathname.startsWith("/warehouse/export/");

  const warehouseCustomsActive =
    pathname === "/warehouse/customs" ||
    pathname.startsWith("/warehouse/customs/");

  const warehouseReceiptsActive =
    pathname === "/warehouse/receipts" ||
    pathname.startsWith("/warehouse/receipts/");

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus((previousState) => ({
      ...previousState,
      [menuKey]: !previousState[menuKey],
    }));
  };

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

  // Khi truy cập trực tiếp bằng URL hoặc chuyển route,
  // tự mở đúng nhóm submenu đang chứa trang hiện tại.
  useEffect(() => {
    const activeSubMenus =
      getSubMenuStateByPath(pathname);

    setOpenSubMenus((previousState) => ({
      ...previousState,
      ...(activeSubMenus.lichSu
        ? { lichSu: true }
        : {}),
      ...(activeSubMenus.khoHang
        ? { khoHang: true }
        : {}),
      ...(activeSubMenus.donDangXuLy
        ? { donDangXuLy: true }
        : {}),
      ...(activeSubMenus.kienChoBaoGia
        ? { kienChoBaoGia: true }
        : {}),
    }));
  }, [pathname]);

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
    localStorage.clear();

    navigate("/login", {
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
            to="/customer/dashboard"
            className="sidebar-brand-logo"
            aria-label="Về trang chủ Việt Nam Logictic"
            title="Việt Nam Logictic"
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

      <div className="sidebar-scrollable-menu">
        <div className="menu-section-label">
          QUẢN LÝ
        </div>

        <NavLink
          to="/customer/dashboard"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <AppstoreOutlined className="menu-icon" />
          <span className="menu-text">
            Bảng điều khiển
          </span>
        </NavLink>

        <NavLink
          to="/create-order"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <PlusCircleOutlined className="menu-icon" />
          <span className="menu-text">
            Tạo đơn hàng
          </span>
        </NavLink>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.donDangXuLy
                ? "submenu-parent-open"
                : ""
            } ${
              processingPurchaseActive ||
              processingConsignmentActive
                ? "submenu-parent-active"
                : ""
            }`}
            onClick={() =>
              toggleSubMenu("donDangXuLy")
            }
            aria-expanded={
              openSubMenus.donDangXuLy
            }
          >
            <UnorderedListOutlined className="menu-icon" />
            <span className="menu-text">
              Đơn đang xử lý
            </span>

            {openSubMenus.donDangXuLy ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.donDangXuLy && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/processing-orders/purchase-requests"
                className={`submenu-item ${
                  processingPurchaseActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Xử lý mua hộ
              </NavLink>

              <NavLink
                to="/processing-orders"
                end
                className={`submenu-item ${
                  processingConsignmentActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Xử lý ký gửi
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.kienChoBaoGia
                ? "submenu-parent-open"
                : ""
            } ${
              quotationPurchaseActive ||
              quotationConsignmentActive
                ? "submenu-parent-active"
                : ""
            }`}
            onClick={() =>
              toggleSubMenu("kienChoBaoGia")
            }
            aria-expanded={
              openSubMenus.kienChoBaoGia
            }
          >
            <InboxOutlined className="menu-icon" />
            <span className="menu-text">
              Kiện chờ báo giá
            </span>

            {openSubMenus.kienChoBaoGia ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.kienChoBaoGia && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/check-orders/buy-on-behalf"
                className={`submenu-item ${
                  quotationPurchaseActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Báo giá mua hộ
              </NavLink>

              <NavLink
                to="/check-orders"
                end
                className={`submenu-item ${
                  quotationConsignmentActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Báo giá ký gửi
              </NavLink>
            </div>
          )}
        </div>

        <NavLink
          to="/receive-goods"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <DownloadOutlined className="menu-icon" />
          <span className="menu-text">Nhận hàng</span>
        </NavLink>

        <NavLink
          to="/payment"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <CreditCardOutlined className="menu-icon" />
          <span className="menu-text">
            Thanh toán vận chuyển
          </span>
        </NavLink>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.khoHang
                ? "submenu-parent-open"
                : ""
            } ${
              warehouseInventoryActive ||
              warehouseExportActive ||
              warehouseCustomsActive ||
              warehouseReceiptsActive
                ? "submenu-parent-active"
                : ""
            }`}
            onClick={() =>
              toggleSubMenu("khoHang")
            }
            aria-expanded={openSubMenus.khoHang}
          >
            <HomeOutlined className="menu-icon" />
            <span className="menu-text">
              Theo dõi kho hàng
            </span>

            {openSubMenus.khoHang ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.khoHang && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/warehouse/inventory"
                className={`submenu-item ${
                  warehouseInventoryActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Tồn kho & nhập kho
              </NavLink>

              <NavLink
                to="/warehouse/export"
                className={`submenu-item ${
                  warehouseExportActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Xuất kho
              </NavLink>

              <NavLink
                to="/warehouse/customs"
                className={
                  "submenu-item " +
                  (warehouseCustomsActive
                    ? "active-sub"
                    : "")
                }
              >
                Thông quan
              </NavLink>

              <NavLink
                to="/warehouse/receipts"
                className={
                  "submenu-item " +
                  (warehouseReceiptsActive
                    ? "active-sub"
                    : "")
                }
              >
                Phiếu nhập kho
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-section-label">
          TIN NHẮN
        </div>

        <NavLink
          to="/customer-service-chat"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <CustomerServiceOutlined className="menu-icon" />
          <span className="menu-text">
            Trò chuyện với CSKH
          </span>
        </NavLink>

        <div className="menu-section-label">
          TRA CỨU &amp; LỊCH SỬ
        </div>

        <div className="menu-item-dropdown">
          <button
            type="button"
            className={`menu-item menu-item-button ${
              openSubMenus.lichSu
                ? "submenu-parent-open"
                : ""
            } ${
              historyPurchaseActive ||
              historyConsignmentActive
                ? "submenu-parent-active"
                : ""
            }`}
            onClick={() => toggleSubMenu("lichSu")}
            aria-expanded={openSubMenus.lichSu}
          >
            <HistoryOutlined className="menu-icon" />
            <span className="menu-text">
              Lịch sử mua hàng
            </span>

            {openSubMenus.lichSu ? (
              <UpOutlined className="arrow-icon" />
            ) : (
              <DownOutlined className="arrow-icon" />
            )}
          </button>

          {openSubMenus.lichSu && (
            <div className="submenu-list timeline-style">
              <NavLink
                to="/history/buy-on-behalf"
                className={`submenu-item ${
                  historyPurchaseActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Mua hộ
              </NavLink>

              <NavLink
                to="/history/consignment"
                className={`submenu-item ${
                  historyConsignmentActive
                    ? "active-sub"
                    : ""
                }`}
              >
                Ký gửi
              </NavLink>
            </div>
          )}
        </div>

        <div className="menu-section-label">
          TÀI CHÍNH
        </div>

        <NavLink
          to="/transaction-history"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <TransactionOutlined className="menu-icon" />
          <span className="menu-text">
            Lịch sử giao dịch
          </span>
        </NavLink>

        <div className="menu-section-label">
          CÀI ĐẶT
        </div>

        <NavLink
          to="/settings/profile-config"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <SettingOutlined className="menu-icon" />
          <span className="menu-text">
            Cấu hình tài khoản
          </span>
        </NavLink>

        <NavLink
          to="/settings/chinh-sach-dich-vu"
          className={({ isActive }) =>
            `menu-item ${isActive ? "active" : ""}`
          }
        >
          <FileTextOutlined className="menu-icon" />
          <span className="menu-text">
            Chính sách dịch vụ
          </span>
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
