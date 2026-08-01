import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutorenewIcon from "@mui/icons-material/Autorenew";

import { getPurchaseRequestsApi } from "../../api/PurchaseAPI/purchaseRequestApi";
import { getConsignmentsApi } from "../../api/OrderApi/consignmentApi";
import { formatVietnamDateTime } from "../../utils/timeUtc";

import "./NotificationPanel.css";

/* =========================================================
   HELPERS
   ========================================================= */

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  err?.name === "AbortError";

const extractArray = (response) => {
  const r = response?.data || response;
  if (Array.isArray(r?.items)) return r.items;
  if (Array.isArray(r)) return r;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const formatRelative = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatVietnamDateTime(dateString, { apiTimeMode: "utc", fallback: "" });
  } catch {
    return "";
  }
};

/* =========================================================
   MAP PURCHASE ORDER → NOTIFICATION
   ========================================================= */

const mapPurchaseToNotif = (order, index) => {
  const status = String(order.status || "").trim().toUpperCase();
  const code = order.purchaseCode || `MH-${index + 1}`;
  const requestId = order.purchaseRequestId || order.id;

  const base = {
    id: `buy-${requestId || index}`,
    source: "buy",
    requestId,
    code,
    createdAt: order.createdAt,
    isRead: false,
    time: formatRelative(order.createdAt),
  };

  switch (status) {
    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return {
        ...base,
        type: "quotation",
        title: "Báo giá chờ xác nhận",
        description: `Đơn mua hộ ${code} đã có báo giá. Vui lòng xem và xác nhận để thanh toán.`,
        navigateTo: `/check-orders/buy-on-behalf/${requestId}`,
      };

    case "WAITING_PAYMENT":
    case "UNPAID":
      return {
        ...base,
        type: "payment",
        title: "Chờ thanh toán (Mua hộ)",
        description: `Đơn ${code} đã xác nhận và đang chờ thanh toán.`,
        navigateTo: `/history/buy-on-behalf/${requestId}/payments`,
      };

    case "PENDING":
    case "PENDING_REVIEW":
    case "SUBMITTED":
      return {
        ...base,
        type: "order",
        title: "Đơn mua hộ chờ duyệt",
        description: `Yêu cầu ${code} đã ghi nhận và chờ nhân viên xử lý báo giá.`,
        navigateTo: `/check-orders/buy-on-behalf/${requestId}`,
      };

    case "PROCESSING":
    case "IN_PROGRESS":
    case "PURCHASING":
      return {
        ...base,
        type: "shipping",
        title: "Đang mua & vận chuyển",
        description: `Đơn ${code} đang trong quá trình mua hàng và vận chuyển.`,
        navigateTo: `/check-orders/buy-on-behalf/${requestId}`,
      };

    case "ACCEPTED":
    case "PAID":
    case "CONFIRMED":
    case "APPROVED":
      return {
        ...base,
        type: "payment",
        title: "Thanh toán thành công (Mua hộ)",
        description: `Đơn ${code} đã thanh toán thành công.`,
        navigateTo: `/history/buy-on-behalf/${requestId}/payments`,
        isRead: true,
      };

    case "COMPLETED":
      return {
        ...base,
        type: "order",
        title: "Đơn mua hộ hoàn thành",
        description: `Đơn ${code} đã hoàn thành. Cảm ơn bạn!`,
        navigateTo: `/history/buy-on-behalf`,
        isRead: true,
      };

    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "FAILED":
      return {
        ...base,
        type: "alert",
        title: "Đơn mua hộ bị hủy",
        description: `Đơn ${code} đã bị hủy hoặc từ chối. Liên hệ hỗ trợ nếu cần.`,
        navigateTo: `/check-orders/buy-on-behalf/${requestId}`,
        isRead: true,
      };

    default:
      return {
        ...base,
        type: "order",
        title: "Cập nhật đơn mua hộ",
        description: `Đơn ${code} vừa có thay đổi trạng thái.`,
        navigateTo: `/check-orders/buy-on-behalf/${requestId}`,
      };
  }
};

/* =========================================================
   MAP CONSIGNMENT ORDER → NOTIFICATION
   ========================================================= */

const mapConsignmentToNotif = (order, index) => {
  const status = String(order.status || order.orderStatus || "").trim().toUpperCase();
  const code =
    order.consignmentCode ||
    order.orderCode ||
    order.code ||
    `KG-${index + 1}`;
  const orderId = order.orderId || order.id || order.consignmentId;

  const base = {
    id: `consign-${orderId || index}`,
    source: "consignment",
    requestId: orderId,
    code,
    createdAt: order.createdAt,
    isRead: false,
    time: formatRelative(order.createdAt),
  };

  switch (status) {
    case "WAITING_DEPOSIT":
    case "PENDING_DEPOSIT":
      return {
        ...base,
        type: "payment",
        title: "Chờ đặt cọc (Ký gửi)",
        description: `Đơn ký gửi ${code} đang chờ đặt cọc.`,
        navigateTo: orderId ? `/history/consignment` : "/history/consignment",
      };

    case "WAITING_PAYMENT":
    case "UNPAID":
      return {
        ...base,
        type: "payment",
        title: "Chờ thanh toán (Ký gửi)",
        description: `Đơn ký gửi ${code} đã xác nhận và chờ thanh toán.`,
        navigateTo: "/history/consignment",
      };

    case "PENDING":
    case "PENDING_REVIEW":
    case "SUBMITTED":
    case "PENDING_CONFIRMATION":
      return {
        ...base,
        type: "consignment",
        title: "Đơn ký gửi chờ xử lý",
        description: `Đơn ký gửi ${code} đã ghi nhận và đang chờ xác nhận.`,
        navigateTo: orderId ? `/history/consignment` : "/history/consignment",
      };

    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return {
        ...base,
        type: "quotation",
        title: "Báo giá ký gửi chờ xác nhận",
        description: `Đơn ký gửi ${code} đã có báo giá. Vui lòng xem và xác nhận.`,
        navigateTo: orderId
          ? `/orders/${orderId}/payments/history`
          : "/history/consignment",
      };

    case "PROCESSING":
    case "IN_TRANSIT":
    case "IN_WAREHOUSE":
      return {
        ...base,
        type: "shipping",
        title: "Đang vận chuyển (Ký gửi)",
        description: `Đơn ký gửi ${code} đang được xử lý / vận chuyển.`,
        navigateTo: "/history/consignment",
      };

    case "PAID":
    case "CONFIRMED":
    case "APPROVED":
      return {
        ...base,
        type: "payment",
        title: "Thanh toán thành công (Ký gửi)",
        description: `Đơn ký gửi ${code} đã thanh toán thành công.`,
        navigateTo: "/history/consignment",
        isRead: true,
      };

    case "COMPLETED":
    case "DELIVERED":
      return {
        ...base,
        type: "consignment",
        title: "Đơn ký gửi hoàn thành",
        description: `Đơn ký gửi ${code} đã hoàn thành và giao hàng.`,
        navigateTo: "/history/consignment",
        isRead: true,
      };

    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
    case "FAILED":
      return {
        ...base,
        type: "alert",
        title: "Đơn ký gửi bị hủy",
        description: `Đơn ký gửi ${code} đã bị hủy hoặc từ chối.`,
        navigateTo: "/history/consignment",
        isRead: true,
      };

    default:
      return {
        ...base,
        type: "consignment",
        title: "Cập nhật đơn ký gửi",
        description: `Đơn ký gửi ${code} vừa có thay đổi trạng thái.`,
        navigateTo: "/history/consignment",
      };
  }
};

/* =========================================================
   TYPE CONFIG
   ========================================================= */

const TYPE_CONFIG = {
  order: {
    icon: <ShoppingBagOutlinedIcon fontSize="small" />,
    label: "Mua hộ",
    className: "type-order",
  },
  consignment: {
    icon: <Inventory2OutlinedIcon fontSize="small" />,
    label: "Ký gửi",
    className: "type-consignment",
  },
  quotation: {
    icon: <ReceiptLongOutlinedIcon fontSize="small" />,
    label: "Báo giá",
    className: "type-quotation",
  },
  payment: {
    icon: <PaymentOutlinedIcon fontSize="small" />,
    label: "Thanh toán",
    className: "type-payment",
  },
  shipping: {
    icon: <LocalShippingOutlinedIcon fontSize="small" />,
    label: "Vận chuyển",
    className: "type-shipping",
  },
  alert: {
    icon: <WarningAmberOutlinedIcon fontSize="small" />,
    label: "Cảnh báo",
    className: "type-alert",
  },
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "quotation", label: "Báo giá" },
  { key: "payment", label: "Thanh toán" },
  { key: "order", label: "Mua hộ" },
  { key: "consignment", label: "Ký gửi" },
];

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const NotificationPanel = ({ open, onClose, anchorRef, onUnreadCountChange }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const [rawBuyOrders, setRawBuyOrders] = useState([]);
  const [rawConsignments, setRawConsignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState(() => new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [panelStyle, setPanelStyle] = useState({});

  /* ---- Position below bell button ---- */
  useEffect(() => {
    if (!open || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = 420;
      const viewportWidth = window.innerWidth;
      let right = viewportWidth - rect.right;
      if (rect.right - panelWidth < 12) right = viewportWidth - panelWidth - 12;

      setPanelStyle({
        top: `${rect.bottom + 10}px`,
        right: `${Math.max(right, 12)}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  /* ---- Close on outside click ---- */
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 60);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, anchorRef]);

  /* ---- Close on Escape ---- */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ---- Fetch both APIs in parallel ---- */
  const fetchAll = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");

      const [buyResult, consignResult] = await Promise.allSettled([
        getPurchaseRequestsApi({ signal }),
        getConsignmentsApi({ signal }),
      ]);

      if (buyResult.status === "fulfilled") {
        const arr = extractArray(buyResult.value);
        setRawBuyOrders([...arr].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        ));
      }

      if (consignResult.status === "fulfilled") {
        const arr = extractArray(consignResult.value);
        setRawConsignments([...arr].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        ));
      }

      if (
        buyResult.status === "rejected" &&
        consignResult.status === "rejected" &&
        !isCanceled(buyResult.reason)
      ) {
        setError("Không thể tải thông báo. Vui lòng thử lại.");
      }
    } catch (err) {
      if (!isCanceled(err)) setError("Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Fetch on mount for badge count + re-fetch when panel opens */
  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchAll(controller.signal);
    return () => controller.abort();
  }, [open, fetchAll]);

  /* ---- Merge + sort all notifications ---- */
  const allNotifications = useMemo(() => {
    const buyNotifs = rawBuyOrders.map(mapPurchaseToNotif);
    const consignNotifs = rawConsignments.map(mapConsignmentToNotif);

    return [...buyNotifs, ...consignNotifs].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [rawBuyOrders, rawConsignments]);

  const withReadState = useMemo(
    () => allNotifications.map((n) => ({
      ...n,
      isRead: n.isRead || readIds.has(n.id),
    })),
    [allNotifications, readIds]
  );

  const unreadCount = useMemo(
    () => withReadState.filter((n) => !n.isRead).length,
    [withReadState]
  );

  /* Notify parent of unread count changes */
  useEffect(() => {
    onUnreadCountChange?.(withReadState.filter((n) => !n.isRead).length);
  }, [withReadState, onUnreadCountChange]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return withReadState;
    if (activeTab === "unread") return withReadState.filter((n) => !n.isRead);
    return withReadState.filter((n) => n.type === activeTab);
  }, [withReadState, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach((tab) => {
      if (tab.key === "all") counts[tab.key] = withReadState.length;
      else if (tab.key === "unread")
        counts[tab.key] = withReadState.filter((n) => !n.isRead).length;
      else counts[tab.key] = withReadState.filter((n) => n.type === tab.key).length;
    });
    return counts;
  }, [withReadState]);

  const handleMarkItem = useCallback((notif) => {
    setReadIds((prev) => new Set([...prev, notif.id]));
    if (notif.navigateTo) {
      onClose();
      navigate(notif.navigateTo);
    }
  }, [navigate, onClose]);

  const handleMarkAll = useCallback(() => {
    setReadIds(new Set(withReadState.map((n) => n.id)));
  }, [withReadState]);

  const handleRefresh = useCallback(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
  }, [fetchAll]);

  if (!open) return null;

  const panel = (
    <div
      ref={panelRef}
      className="notif-panel"
      style={panelStyle}
      role="dialog"
      aria-label="Bảng thông báo"
    >
      {/* ===== HEADER ===== */}
      <div className="notif-header">
        <div className="notif-header-left">
          <div className="notif-header-icon">
            <NotificationsOutlinedIcon fontSize="inherit" />
          </div>
          <div className="notif-header-titles">
            <h3>Thông báo</h3>
            <p>
              {loading
                ? "Đang tải..."
                : unreadCount > 0
                  ? `${unreadCount} thông báo chưa đọc`
                  : "Tất cả đã được đọc"}
            </p>
          </div>
        </div>

        <div className="notif-header-actions">
          <button
            type="button"
            className="notif-icon-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Làm mới"
          >
            <AutorenewIcon
              fontSize="small"
              style={{ animation: loading ? "notifSpin 0.8s linear infinite" : "none" }}
            />
          </button>

          {unreadCount > 0 && (
            <button type="button" className="notif-mark-all-btn" onClick={handleMarkAll}>
              <DoneAllIcon style={{ fontSize: 12, marginRight: 3 }} />
              Đọc tất cả
            </button>
          )}

          <button
            type="button"
            className="notif-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>
      </div>

      {/* ===== SOURCE BADGE ROW ===== */}
      <div className="notif-source-row">
        <span className="notif-source-chip buy">
          <ShoppingBagOutlinedIcon style={{ fontSize: 12 }} />
          Mua hộ: {rawBuyOrders.length}
        </span>
        <span className="notif-source-chip consign">
          <Inventory2OutlinedIcon style={{ fontSize: 12 }} />
          Ký gửi: {rawConsignments.length}
        </span>
      </div>

      {/* ===== FILTER TABS ===== */}
      <div className="notif-filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`notif-tab-btn${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {(tabCounts[tab.key] ?? 0) > 0 && (
              <span className="notif-tab-badge">{tabCounts[tab.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== LIST ===== */}
      <div className="notif-list">
        {error && !loading && (
          <div className="notif-error-banner">
            <span>{error}</span>
            <button type="button" onClick={handleRefresh}>Thử lại</button>
          </div>
        )}

        {loading && (
          <div className="notif-skeleton-list">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="notif-skeleton-item">
                <div className="notif-sk-icon" />
                <div className="notif-sk-body">
                  <div className="notif-sk-line wide" />
                  <div className="notif-sk-line" />
                  <div className="notif-sk-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredNotifications.length === 0 && (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <NotificationsOutlinedIcon fontSize="inherit" />
            </div>
            <h4>Không có thông báo</h4>
            <p>Chưa có thông báo nào phù hợp với bộ lọc này.</p>
          </div>
        )}

        {!loading && filteredNotifications.map((notif) => {
          const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.order;
          return (
            <div
              key={notif.id}
              className={`notif-item${notif.isRead ? "" : " is-unread"}`}
              onClick={() => handleMarkItem(notif)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleMarkItem(notif);
              }}
            >
              <div className={`notif-item-icon ${config.className}`}>
                {config.icon}
              </div>

              <div className="notif-item-body">
                <p className="notif-item-title">{notif.title}</p>
                <p className="notif-item-desc">{notif.description}</p>
                <div className="notif-item-meta">
                  {notif.time && <span className="notif-item-time">{notif.time}</span>}
                  <span className="notif-item-type-tag">{config.label}</span>
                  {notif.code && (
                    <span className={`notif-item-code ${notif.source === "consignment" ? "consign" : ""}`}>
                      {notif.code}
                    </span>
                  )}
                </div>
              </div>

              {!notif.isRead && <span className="notif-item-dot" />}
            </div>
          );
        })}
      </div>

      {/* ===== FOOTER ===== */}
      <div className="notif-footer">
        <button
          type="button"
          className="notif-view-all-btn buy"
          onClick={() => { onClose(); navigate("/history/buy-on-behalf"); }}
        >
          <ShoppingBagOutlinedIcon style={{ fontSize: 14 }} />
          <span>Mua hộ</span>
          <ArrowForwardIcon style={{ fontSize: 13 }} />
        </button>

        <button
          type="button"
          className="notif-view-all-btn consign"
          onClick={() => { onClose(); navigate("/history/consignment"); }}
        >
          <Inventory2OutlinedIcon style={{ fontSize: 14 }} />
          <span>Ký gửi</span>
          <ArrowForwardIcon style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};

export default NotificationPanel;
