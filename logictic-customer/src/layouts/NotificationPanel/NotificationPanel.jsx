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

import {
  getNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
} from "../../api/Notification/notificationApi";
import { formatVietnamDateTime } from "../../utils/timeUtc";

import "./NotificationPanel.css";

/* =========================================================
   HELPERS & UTILITIES
   ========================================================= */

const isCanceled = (err) =>
  err?.code === "ERR_CANCELED" ||
  err?.name === "CanceledError" ||
  err?.name === "AbortError";

/**
 * Trích xuất danh sách mảng từ nhiều format trả về của backend
 */
const extractNotificationsList = (response) => {
  if (!response) return [];
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

/**
 * Trích xuất mã đơn hàng từ nội dung hoặc tiêu đề (ví dụ PUR-..., VCL-...)
 */
const extractCodeFromText = (text) => {
  if (!text) return "";
  const matchWithLabel = String(text).match(/\((?:Mã|Mã đơn|Code):\s*([A-Z0-9_-]+)\)/i);
  if (matchWithLabel?.[1]) return matchWithLabel[1];

  const matchDirect = String(text).match(/\b(PUR-[A-Z0-9-]+|VCL-[A-Z0-9-]+|KG-[A-Z0-9-]+|MH-[A-Z0-9-]+)\b/i);
  return matchDirect ? matchDirect[1] : "";
};

/**
 * Format thời gian tương đối
 */
const formatRelative = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

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

/**
 * Suy đoán URL chuyển hướng từ dữ liệu thông báo đến đúng màn hình trong hệ thống
 */
const resolveNavigationUrl = (item, extractedCode, normalizedType, source) => {
  // 1. Nếu backend có trả về link / actionUrl / navigateTo cụ thể
  if (item.navigateTo) return item.navigateTo;
  if (item.actionUrl) return item.actionUrl;
  if (item.url) return item.url;
  if (item.link) return item.link;

  const title = String(item.title || "").toLowerCase();
  const desc = String(item.content || item.message || item.description || "").toLowerCase();
  const fullText = `${title} ${desc}`;
  const code = extractedCode || "";
  const relatedId =
    item.relatedId ||
    item.referenceId ||
    item.orderId ||
    item.purchaseRequestId ||
    item.id;

  // 2. Thông báo Hàng nhập kho / Phiếu nhập kho
  if (fullText.includes("phiếu nhập kho") || fullText.includes("nhập kho")) {
    return "/warehouse/receipts";
  }

  // 3. Thông báo Báo giá (Quotation)
  if (normalizedType === "quotation" || fullText.includes("báo giá")) {
    if (source === "buy" || fullText.includes("mua hộ") || code.startsWith("PUR-")) {
      return relatedId
        ? `/check-orders/buy-on-behalf/${relatedId}`
        : "/check-orders/buy-on-behalf";
    }
    return relatedId ? `/quotations/${relatedId}` : "/check-orders";
  }

  // 4. Thông báo Thanh toán / Đặt cọc (Payment)
  if (
    normalizedType === "payment" ||
    fullText.includes("thanh toán") ||
    fullText.includes("đặt cọc")
  ) {
    if (source === "buy" || fullText.includes("mua hộ") || code.startsWith("PUR-")) {
      return relatedId
        ? `/history/buy-on-behalf/${relatedId}/payments`
        : "/history/buy-on-behalf";
    }
    return relatedId
      ? `/orders/${relatedId}/payments/history`
      : "/history/consignment";
  }

  // 5. Thông báo Ký gửi (Consignment)
  if (
    source === "consignment" ||
    normalizedType === "consignment" ||
    fullText.includes("ký gửi") ||
    code.startsWith("VCL-") ||
    code.startsWith("KG-")
  ) {
    // Nếu là yêu cầu vừa được duyệt hoặc đang xử lý
    if (
      fullText.includes("đã được duyệt") ||
      fullText.includes("chờ xử lý") ||
      fullText.includes("đang xử lý")
    ) {
      return "/processing-orders";
    }
    return "/history/consignment";
  }

  // 6. Thông báo Mua hộ (Purchase Request / Buy On Behalf)
  if (
    source === "buy" ||
    normalizedType === "order" ||
    fullText.includes("mua hộ") ||
    fullText.includes("đặt hàng") ||
    code.startsWith("PUR-") ||
    code.startsWith("MH-")
  ) {
    // Nếu là đơn mua hộ vừa được đặt hàng hoặc đang chờ duyệt
    if (
      fullText.includes("đã được đặt hàng") ||
      fullText.includes("chờ duyệt") ||
      fullText.includes("đang xử lý")
    ) {
      return "/processing-orders/purchase-requests";
    }
    return "/history/buy-on-behalf";
  }

  // 7. Mặc định
  return "/customer/dashboard";
};

/**
 * Chuẩn hóa kiểu thông báo (type) để hiển thị icon và tag phù hợp
 */
const normalizeNotificationType = (item) => {
  const rawType = String(
    item.type ||
      item.notificationType ||
      item.category ||
      item.relatedType ||
      ""
  ).toUpperCase();

  const title = String(item.title || "").toLowerCase();
  const desc = String(item.content || item.message || item.description || "").toLowerCase();

  if (
    rawType.includes("QUOTATION") ||
    rawType.includes("QUOTE") ||
    title.includes("báo giá") ||
    desc.includes("báo giá")
  ) {
    return "quotation";
  }

  if (
    rawType.includes("PAYMENT") ||
    rawType.includes("DEPOSIT") ||
    rawType.includes("PAID") ||
    title.includes("thanh toán") ||
    title.includes("đặt cọc") ||
    desc.includes("thanh toán") ||
    desc.includes("đặt cọc")
  ) {
    return "payment";
  }

  if (
    rawType.includes("SHIPPING") ||
    rawType.includes("WAREHOUSE") ||
    title.includes("nhập kho") ||
    title.includes("xuất kho") ||
    title.includes("vận chuyển") ||
    desc.includes("nhập kho") ||
    desc.includes("vận chuyển")
  ) {
    return "shipping";
  }

  if (
    rawType.includes("CONSIGNMENT") ||
    title.includes("ký gửi") ||
    desc.includes("ký gửi")
  ) {
    return "consignment";
  }

  if (
    rawType.includes("ALERT") ||
    rawType.includes("CANCEL") ||
    rawType.includes("REJECT") ||
    title.includes("hủy") ||
    title.includes("từ chối") ||
    desc.includes("bị hủy")
  ) {
    return "alert";
  }

  return "order";
};

/**
 * Xác định nguồn (Mua hộ hay Ký gửi)
 */
const resolveNotificationSource = (item, code, type) => {
  const text = `${item.title || ""} ${item.content || item.message || ""}`.toLowerCase();
  if (code.startsWith("VCL-") || code.startsWith("KG-") || text.includes("ký gửi") || type === "consignment") {
    return "consignment";
  }
  if (code.startsWith("PUR-") || code.startsWith("MH-") || text.includes("mua hộ") || text.includes("đặt hàng")) {
    return "buy";
  }
  return type === "consignment" ? "consignment" : "buy";
};

/**
 * Phân tích đối tượng thông báo từ API thành format chuẩn UI
 */
const mapApiNotification = (item, index) => {
  const id = item.id || item.notificationId || item._id || `notif-${index}`;
  const isRead = Boolean(
    item.isRead ??
      item.read ??
      item.is_read ??
      (String(item.status || "").toUpperCase() === "READ")
  );

  const createdAt =
    item.createdAt ||
    item.createdDate ||
    item.timestamp ||
    item.createdTime ||
    null;

  const contentText = item.content || item.message || item.description || item.body || "";
  const code = item.code || extractCodeFromText(contentText) || extractCodeFromText(item.title);
  const type = normalizeNotificationType(item);
  const source = resolveNotificationSource(item, code, type);

  return {
    id,
    title: item.title || item.notificationTitle || "Thông báo hệ thống",
    description: contentText,
    isRead,
    createdAt,
    time: formatRelative(createdAt),
    type,
    source,
    code,
    navigateTo: resolveNavigationUrl(item, code, type, source),
    raw: item,
  };
};

/* =========================================================
   TYPE CONFIG & TABS
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
  { key: "order", label: "Mua hộ" },
  { key: "consignment", label: "Ký gửi" },
  { key: "quotation", label: "Báo giá" },
  { key: "payment", label: "Thanh toán" },
];

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

const NotificationPanel = ({
  open,
  onClose,
  anchorRef,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [panelStyle, setPanelStyle] = useState({});

  /* ---- Tính toán số lượng chưa đọc ---- */
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  /* Đồng bộ số thông báo chưa đọc ra ngoài component cha (MainLayout) */
  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  /* ---- Định vị panel dưới nút chuông ---- */
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

  /* ---- Đóng khi click ngoài ---- */
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 60);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, anchorRef]);

  /* ---- Đóng khi nhấn phím Escape ---- */
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /* ---- Gọi API lấy danh sách thông báo thật ---- */
  const fetchNotifications = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");

      const response = await getNotificationsApi(
        { pageNumber: 1, pageSize: 50, unreadOnly: false },
        { signal }
      );

      const items = extractNotificationsList(response);
      const mapped = items.map(mapApiNotification);

      setNotifications(mapped);

      // Đồng bộ unreadCount trực tiếp từ response của API (nếu có) hoặc tính từ items
      const serverUnreadCount =
        typeof response?.unreadCount === "number"
          ? response.unreadCount
          : typeof response?.data?.unreadCount === "number"
          ? response.data.unreadCount
          : mapped.filter((n) => !n.isRead).length;

      onUnreadCountChange?.(serverUnreadCount);
    } catch (err) {
      if (!isCanceled(err)) {
        console.error("Lỗi lấy danh sách thông báo từ API:", err);
        setError("Không thể tải thông báo. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  /* Fetch lần đầu khi mount và định kỳ mỗi 60s để cập nhật badge số thông báo */
  useEffect(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);

    const intervalId = window.setInterval(() => {
      fetchNotifications();
    }, 60 * 1000);

    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifications]);

  /* Fetch lại khi mở panel */
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    return () => controller.abort();
  }, [open, fetchNotifications]);

  /* ---- Đánh dấu 1 thông báo là đã đọc ---- */
  const handleMarkItem = useCallback(
    async (notif) => {
      // Cập nhật UI ngay lập tức (Optimistic Update)
      if (!notif.isRead) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notif.id ? { ...item, isRead: true } : item
          )
        );

        try {
          await markNotificationAsReadApi(notif.id);
        } catch (err) {
          console.error("Lỗi khi đánh dấu thông báo đã đọc:", err);
        }
      }
    },
    []
  );

  /* ---- Đánh dấu tất cả thông báo là đã đọc ---- */
  const handleMarkAll = useCallback(async () => {
    // Cập nhật UI ngay lập tức
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isRead: true }))
    );
    onUnreadCountChange?.(0);

    try {
      await markAllNotificationsAsReadApi();
    } catch (err) {
      console.error("Lỗi khi đánh dấu tất cả thông báo đã đọc:", err);
    }
  }, [onUnreadCountChange]);

  /* ---- Nút Refresh ---- */
  const handleRefresh = useCallback(() => {
    const controller = new AbortController();
    fetchNotifications(controller.signal);
  }, [fetchNotifications]);

  /* ---- Danh sách thông báo sau khi lọc theo Tab ---- */
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter((n) => !n.isRead);
    if (activeTab === "order")
      return notifications.filter((n) => n.source === "buy" || n.type === "order");
    if (activeTab === "consignment")
      return notifications.filter((n) => n.source === "consignment" || n.type === "consignment");
    return notifications.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  /* ---- Đếm số lượng thông báo cho từng Tab ---- */
  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach((tab) => {
      if (tab.key === "all") counts[tab.key] = notifications.length;
      else if (tab.key === "unread")
        counts[tab.key] = notifications.filter((n) => !n.isRead).length;
      else if (tab.key === "order")
        counts[tab.key] = notifications.filter((n) => n.source === "buy" || n.type === "order").length;
      else if (tab.key === "consignment")
        counts[tab.key] = notifications.filter((n) => n.source === "consignment" || n.type === "consignment").length;
      else
        counts[tab.key] = notifications.filter(
          (n) => n.type === tab.key
        ).length;
    });
    return counts;
  }, [notifications]);

  // Đếm theo nguồn để hiển thị chip Mua hộ & Ký gửi
  const buyCount = useMemo(
    () => notifications.filter((n) => n.source === "buy").length,
    [notifications]
  );
  const consignCount = useMemo(
    () => notifications.filter((n) => n.source === "consignment").length,
    [notifications]
  );

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
            title="Làm mới thông báo"
          >
            <AutorenewIcon
              fontSize="small"
              style={{
                animation: loading ? "notifSpin 0.8s linear infinite" : "none",
              }}
            />
          </button>

          <button
            type="button"
            className={`notif-mark-all-btn ${unreadCount > 0 ? "is-active" : "is-disabled"}`}
            onClick={unreadCount > 0 ? handleMarkAll : undefined}
            disabled={unreadCount === 0 || loading}
            title="Đánh dấu tất cả thông báo là đã đọc"
          >
            <DoneAllIcon style={{ fontSize: 13, marginRight: 4 }} />
            <span>{unreadCount > 0 ? "Đọc tất cả" : "Đã đọc hết"}</span>
          </button>

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
          Mua hộ: {buyCount}
        </span>
        <span className="notif-source-chip consign">
          <Inventory2OutlinedIcon style={{ fontSize: 12 }} />
          Ký gửi: {consignCount}
        </span>
      </div>

      {/* ===== FILTER TABS ===== */}
      <div className="notif-filter-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`notif-tab-btn${
              activeTab === tab.key ? " is-active" : ""
            }`}
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
            <button type="button" onClick={handleRefresh}>
              Thử lại
            </button>
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

        {!loading &&
          filteredNotifications.map((notif) => {
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
                    {notif.time && (
                      <span className="notif-item-time">{notif.time}</span>
                    )}
                    <span className="notif-item-type-tag">{config.label}</span>
                    {notif.code && (
                      <span
                        className={`notif-item-code ${
                          notif.source === "consignment" ? "consign" : ""
                        }`}
                      >
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
          onClick={() => {
            onClose();
            navigate("/history/buy-on-behalf");
          }}
        >
          <ShoppingBagOutlinedIcon style={{ fontSize: 14 }} />
          <span>Mua hộ</span>
          <ArrowForwardIcon style={{ fontSize: 13 }} />
        </button>

        <button
          type="button"
          className="notif-view-all-btn consign"
          onClick={() => {
            onClose();
            navigate("/history/consignment");
          }}
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
