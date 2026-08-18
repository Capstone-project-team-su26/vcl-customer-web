import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import AuthNotify from "../../../utils/AuthNotify";
import { getConsignmentsApi } from "../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../api/PurchaseAPI/purchaseRequestApi";
import {
  apiToUtcIso,
  formatVietnamDateTime,
} from "../../../utils/timeUtc";

import "./Dashboard.css";

const API_PAGE_SIZE = 10;
const MAX_RECENT_ORDERS = 6;

const DASHBOARD_CACHE_KEY = "customer-dashboard-snapshot-v2";
const DASHBOARD_CACHE_TTL_MS = 60 * 1000;

let dashboardMemoryCache = null;
let dashboardInFlightRequest = null;

const QUICK_ACTIONS = [
  {
    id: "create-purchase",
    title: "Tạo đơn mua hộ",
    description:
      "Tạo yêu cầu mua hàng từ Nhật, Hàn Quốc và các quốc gia hỗ trợ.",
    icon: PlusCircleOutlined,
    route: "/create-order/buy-orders",
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

const TERMINAL_STATUS_KEYS = new Set([
  "COMPLETED",
  "DELIVERED",
  "DONE",
  "FINISHED",
  "CANCELLED",
  "CANCELED",
  "REJECTED",
  "FAILED",
  "REFUNDED",
]);

const STATUS_LABELS = {
  PENDING: "Chờ xử lý",
  PENDING_REVIEW: "Chờ duyệt",
  QUOTATION_SENT: "Đã gửi báo giá",
  QUOTED: "Đã báo giá",
  APPROVED: "Đã duyệt",
  PROCESSING: "Đang xử lý",
  IN_PROGRESS: "Đang xử lý",
  WAREHOUSE_RECEIVED: "Kho đã nhận",
  SHIPPING: "Đang vận chuyển",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
  REJECTED: "Từ chối",
};

const MONTH_LABELS = [
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "T10",
  "T11",
  "T12",
];

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError" ||
    error?.message === "canceled"
  );
};

const getApiErrorMessage = (
  error,
  fallbackMessage = "Không thể tải dữ liệu."
) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return (
    data?.message ||
    data?.title ||
    data?.error ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return (
    STATUS_LABELS[normalizedStatus] ||
    normalizedStatus.replaceAll("_", " ").replaceAll("-", " ")
  );
};

const getStatusType = (status) => {
  const statusKey = normalizeStatus(status);

  if (!statusKey) return "empty";

  if (TERMINAL_STATUS_KEYS.has(statusKey)) {
    if (statusKey.includes("CANCEL") || statusKey === "REJECTED") {
      return "cancelled";
    }

    return "done";
  }

  if (
    statusKey.includes("PENDING") ||
    statusKey.includes("WAIT") ||
    statusKey.includes("REVIEW")
  ) {
    return "waiting";
  }

  if (
    statusKey.includes("QUOT") ||
    statusKey.includes("PRICE")
  ) {
    return "quoted";
  }

  return "processing";
};

const isProcessingStatus = (status) => {
  const statusKey = normalizeStatus(status);

  if (!statusKey) return false;

  return !TERMINAL_STATUS_KEYS.has(statusKey);
};

const unwrapApiData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const findArrayFromResult = (result, extraKeys = []) => {
  const data = unwrapApiData(result);

  const candidates = [
    data,
    data?.items,
    data?.results,
    data?.orders,
    data?.data,
    data?.data?.items,
    data?.data?.results,
    data?.data?.orders,
    ...extraKeys.flatMap((key) => [
      data?.[key],
      data?.data?.[key],
    ]),
  ];

  return candidates.find(Array.isArray) || [];
};

const getStableItemId = (item, type, index = 0) => {
  const id =
    item?.orderId ||
    item?.purchaseRequestId ||
    item?.consignmentId ||
    item?.id ||
    item?.orderCode ||
    item?.purchaseCode ||
    item?.purchaseRequestCode ||
    item?.consignmentCode ||
    item?.trackingCode;

  if (id) {
    return `${type}-${String(id).trim()}`;
  }

  return [
    type,
    item?.createdAt,
    item?.updatedAt,
    item?.receiverPhone,
    item?.route,
    index,
  ]
    .map((value) => String(value ?? "").trim())
    .join("-");
};

const deduplicateItems = (items, type) => {
  const itemMap = new Map();

  items.forEach((item, index) => {
    const key = getStableItemId(item, type, index);

    if (!itemMap.has(key)) {
      itemMap.set(key, item);
    }
  });

  return Array.from(itemMap.values());
};

const extractSnapshot = (apiResult, type, extraKeys = []) => {
  const data = unwrapApiData(apiResult);
  const items = deduplicateItems(
    findArrayFromResult(apiResult, extraKeys),
    type
  );

  const totalCountCandidate =
    data?.totalCount ??
    data?.total ??
    data?.count ??
    data?.recordsTotal ??
    data?.pagination?.totalCount ??
    data?.data?.totalCount;

  const totalCount = Number(totalCountCandidate);

  return {
    items,
    totalCount:
      Number.isFinite(totalCount) && totalCount >= 0
        ? totalCount
        : items.length,
  };
};

/*
 * Dashboard chỉ lấy đúng một trang ký gửi.
 * Không tải toàn bộ totalPages bằng Promise.all.
 */
const fetchConsignmentSnapshot = async (signal) => {
  const response = await getConsignmentsApi(
    1,
    API_PAGE_SIZE,
    { signal }
  );

  return extractSnapshot(
    response,
    "consignment",
    ["consignments", "orders"]
  );
};

/*
 * API mua hộ hiện chỉ cần một request.
 */
const fetchPurchaseSnapshot = async (signal) => {
  const response = await getPurchaseRequestsApi({ signal });

  return extractSnapshot(
    response,
    "purchase",
    ["purchaseRequests", "orders"]
  );
};

const readDashboardCache = () => {
  const now = Date.now();

  if (
    dashboardMemoryCache &&
    now - dashboardMemoryCache.savedAt < DASHBOARD_CACHE_TTL_MS
  ) {
    return dashboardMemoryCache;
  }

  try {
    const rawCache = sessionStorage.getItem(
      DASHBOARD_CACHE_KEY
    );

    if (!rawCache) {
      return null;
    }

    const parsedCache = JSON.parse(rawCache);

    if (
      !parsedCache?.savedAt ||
      now - Number(parsedCache.savedAt) >=
        DASHBOARD_CACHE_TTL_MS
    ) {
      sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
      return null;
    }

    dashboardMemoryCache = parsedCache;
    return parsedCache;
  } catch {
    return null;
  }
};

const writeDashboardCache = (snapshot) => {
  const cacheValue = {
    ...snapshot,
    savedAt: Date.now(),
  };

  dashboardMemoryCache = cacheValue;

  try {
    sessionStorage.setItem(
      DASHBOARD_CACHE_KEY,
      JSON.stringify(cacheValue)
    );
  } catch {
    // Trình duyệt có thể chặn storage; dashboard vẫn hoạt động bình thường.
  }
};

const requestDashboardSnapshot = ({
  force = false,
} = {}) => {
  if (!force && dashboardInFlightRequest?.promise) {
    return dashboardInFlightRequest.promise;
  }

  if (force && dashboardInFlightRequest?.controller) {
    dashboardInFlightRequest.controller.abort();
  }

  const controller = new AbortController();

  const promise = Promise.allSettled([
    fetchPurchaseSnapshot(controller.signal),
    fetchConsignmentSnapshot(controller.signal),
  ])
    .then(([purchaseResult, consignmentResult]) => ({
      purchase:
        purchaseResult.status === "fulfilled"
          ? {
              ok: true,
              ...purchaseResult.value,
            }
          : {
              ok: false,
              error: purchaseResult.reason,
            },

      consignment:
        consignmentResult.status === "fulfilled"
          ? {
              ok: true,
              ...consignmentResult.value,
            }
          : {
              ok: false,
              error: consignmentResult.reason,
            },
    }))
    .finally(() => {
      if (
        dashboardInFlightRequest?.controller ===
        controller
      ) {
        dashboardInFlightRequest = null;
      }
    });

  dashboardInFlightRequest = {
    controller,
    promise,
  };

  return promise;
};

const formatMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "0đ";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const getItemTimeUtc = (item) => {
  return normalizeApiTimeToUtc(
    item?.createdAt ||
      item?.updatedAt ||
      item?.orderDate ||
      item?.submittedAt ||
      item?.lastMessageAt ||
      ""
  );
};

const getTimestamp = (item) => {
  const utcIso = getItemTimeUtc(item);

  if (!utcIso) return 0;

  const time = new Date(utcIso).getTime();

  return Number.isFinite(time) ? time : 0;
};

const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) return "-";

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const getCurrentMonthKey = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const getMonthKeyFromItem = (item) => {
  const utcIso = getItemTimeUtc(item);

  if (!utcIso) return "";

  return utcIso.slice(0, 7);
};

const countItemsInCurrentMonth = (items) => {
  const currentMonthKey = getCurrentMonthKey();

  return items.filter(
    (item) => getMonthKeyFromItem(item) === currentMonthKey
  ).length;
};

const getLastSevenMonths = () => {
  const now = new Date();
  const months = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - index,
        1
      )
    );

    const year = date.getUTCFullYear();
    const monthIndex = date.getUTCMonth();
    const month = String(monthIndex + 1).padStart(2, "0");

    months.push({
      key: `${year}-${month}`,
      label: MONTH_LABELS[monthIndex],
    });
  }

  return months;
};

const buildMonthlyChart = (purchaseRequests, consignments) => {
  const months = getLastSevenMonths();

  const rawData = months.map((month) => {
    const purchaseCount = purchaseRequests.filter(
      (item) => getMonthKeyFromItem(item) === month.key
    ).length;

    const consignmentCount = consignments.filter(
      (item) => getMonthKeyFromItem(item) === month.key
    ).length;

    return {
      month: month.label,
      purchaseCount,
      consignmentCount,
    };
  });

  const maxValue = Math.max(
    1,
    ...rawData.map((item) =>
      Math.max(item.purchaseCount, item.consignmentCount)
    )
  );

  return rawData.map((item) => ({
    ...item,
    purchase: Math.max(8, Math.round((item.purchaseCount / maxValue) * 100)),
    consignment: Math.max(
      8,
      Math.round((item.consignmentCount / maxValue) * 100)
    ),
  }));
};

const getPurchaseCode = (item) => {
  return (
    item?.purchaseCode ||
    item?.purchaseRequestCode ||
    item?.orderCode ||
    item?.code ||
    item?.purchaseRequestId ||
    "-"
  );
};

const getConsignmentCode = (item) => {
  return (
    item?.consignmentCode ||
    item?.trackingCode ||
    item?.orderCode ||
    item?.orderId ||
    "-"
  );
};

const getRouteLabel = (route) => {
  return String(route || "-").replaceAll("-", " → ");
};

const getOrderValue = (item) => {
  return (
    item?.totalEstimatedCost ||
    item?.totalCost ||
    item?.totalPrice ||
    item?.price ||
    item?.amount ||
    0
  );
};

const buildRecentOrders = (purchaseRequests, consignments) => {
  const purchaseOrders = purchaseRequests.map(
    (item, index) => ({
      key: getStableItemId(item, "purchase", index),
      id: String(getPurchaseCode(item)),
      service: "Mua hộ",
      route: getRouteLabel(item.route),
      value: formatMoney(getOrderValue(item)),
      status: formatStatusCode(item.status),
      statusType: getStatusType(item.status),
      createdAt: getItemTimeUtc(item),
      raw: item,
    })
  );

  const consignmentOrders = consignments.map(
    (item, index) => ({
      key: getStableItemId(
        item,
        "consignment",
        index
      ),
      id: String(getConsignmentCode(item)),
      service: "Ký gửi",
      route: getRouteLabel(item.route),
      value: formatMoney(getOrderValue(item)),
      status: formatStatusCode(item.status),
      statusType: getStatusType(item.status),
      createdAt: getItemTimeUtc(item),
      raw: item,
    })
  );

  const uniqueOrders = new Map();

  [...purchaseOrders, ...consignmentOrders].forEach(
    (order) => {
      if (!uniqueOrders.has(order.key)) {
        uniqueOrders.set(order.key, order);
      }
    }
  );

  return Array.from(uniqueOrders.values())
    .sort(
      (left, right) =>
        getTimestamp(right.raw) -
        getTimestamp(left.raw)
    )
    .slice(0, MAX_RECENT_ORDERS);
};

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

  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [consignments, setConsignments] = useState([]);

  const [purchaseTotalCount, setPurchaseTotalCount] =
    useState(0);
  const [
    consignmentTotalCount,
    setConsignmentTotalCount,
  ] = useState(0);

  const [isLoadingDashboard, setIsLoadingDashboard] =
    useState(true);
  const [dashboardError, setDashboardError] =
    useState("");

  const mountedRef = useRef(false);
  const requestSequenceRef = useRef(0);

  const userName = useMemo(
    () => getSessionUserName(),
    []
  );

  const currentDate = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }, []);

  const applyDashboardSnapshot = useCallback(
    (snapshot) => {
      const purchase = snapshot?.purchase;
      const consignment = snapshot?.consignment;

      if (purchase?.ok !== false) {
        setPurchaseRequests(
          Array.isArray(purchase?.items)
            ? purchase.items
            : []
        );

        setPurchaseTotalCount(
          Number(purchase?.totalCount) || 0
        );
      }

      if (consignment?.ok !== false) {
        setConsignments(
          Array.isArray(consignment?.items)
            ? consignment.items
            : []
        );

        setConsignmentTotalCount(
          Number(consignment?.totalCount) || 0
        );
      }
    },
    []
  );

  const loadDashboardData = useCallback(
    async ({
      showSuccess = false,
      force = false,
    } = {}) => {
      const requestSequence =
        requestSequenceRef.current + 1;

      requestSequenceRef.current =
        requestSequence;

      if (!force) {
        const cachedSnapshot =
          readDashboardCache();

        if (cachedSnapshot) {
          applyDashboardSnapshot(
            cachedSnapshot
          );

          setDashboardError("");
          setIsLoadingDashboard(false);
          return;
        }
      }

      try {
        setIsLoadingDashboard(true);
        setDashboardError("");

        const snapshot =
          await requestDashboardSnapshot({
            force,
          });

        if (
          !mountedRef.current ||
          requestSequence !==
            requestSequenceRef.current
        ) {
          return;
        }

        applyDashboardSnapshot(snapshot);

        const failedSources = [
          snapshot?.purchase?.ok === false
            ? "mua hộ"
            : "",
          snapshot?.consignment?.ok === false
            ? "ký gửi"
            : "",
        ].filter(Boolean);

        if (
          snapshot?.purchase?.ok &&
          snapshot?.consignment?.ok
        ) {
          writeDashboardCache(snapshot);
        }

        if (failedSources.length > 0) {
          const sourceErrors = [
            snapshot?.purchase?.ok === false
              ? snapshot.purchase.error
              : null,
            snapshot?.consignment?.ok === false
              ? snapshot.consignment.error
              : null,
          ].filter(
            (error) =>
              error &&
              !isCanceledRequest(error)
          );

          if (sourceErrors.length > 0) {
            const message = `Không thể tải dữ liệu ${failedSources.join(
              " và "
            )}.`;

            setDashboardError(message);
            AuthNotify.error(
              "Dashboard tải chưa đầy đủ",
              message
            );
          }
        } else if (showSuccess) {
          AuthNotify.success(
            "Đã cập nhật dashboard",
            "Dữ liệu đơn hàng mới nhất đã được tải lại."
          );
        }
      } catch (error) {
        if (
          isCanceledRequest(error) ||
          !mountedRef.current ||
          requestSequence !==
            requestSequenceRef.current
        ) {
          return;
        }

        const message = getApiErrorMessage(
          error,
          "Không thể tải dữ liệu dashboard."
        );

        setDashboardError(message);
        AuthNotify.error(
          "Không tải được dashboard",
          message
        );
      } finally {
        if (
          mountedRef.current &&
          requestSequence ===
            requestSequenceRef.current
        ) {
          setIsLoadingDashboard(false);
        }
      }
    },
    [applyDashboardSnapshot]
  );

  useEffect(() => {
    mountedRef.current = true;

    loadDashboardData();

    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
    };
  }, [loadDashboardData]);

  const handleRefreshDashboard = () => {
    sessionStorage.removeItem(
      DASHBOARD_CACHE_KEY
    );

    dashboardMemoryCache = null;

    loadDashboardData({
      showSuccess: true,
      force: true,
    });
  };

  const dashboardStats = useMemo(() => {
    const purchaseThisMonth = countItemsInCurrentMonth(purchaseRequests);
    const consignmentThisMonth = countItemsInCurrentMonth(consignments);

    const processingCount = [
      ...purchaseRequests,
      ...consignments,
    ].filter((item) => isProcessingStatus(item.status)).length;

    return [
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
        value: `${purchaseTotalCount} đơn`,
        note: `Tháng này: ${purchaseThisMonth} đơn`,
        icon: ShoppingCartOutlined,
        theme: "blue",
      },
      {
        id: "consignment",
        label: "Tổng đơn ký gửi",
        value: `${consignmentTotalCount} đơn`,
        note: `Tháng này: ${consignmentThisMonth} đơn`,
        icon: InboxOutlined,
        theme: "orange",
      },
      {
        id: "processing",
        label: "Đơn đang xử lý",
        value: `${processingCount} đơn`,
        note: "Đang theo dõi",
        icon: SyncOutlined,
        theme: "purple",
      },
    ];
  }, [
    purchaseRequests,
    consignments,
    purchaseTotalCount,
    consignmentTotalCount,
  ]);

  const monthlyChart = useMemo(
    () => buildMonthlyChart(purchaseRequests, consignments),
    [purchaseRequests, consignments]
  );

  const recentOrders = useMemo(
    () => buildRecentOrders(purchaseRequests, consignments),
    [purchaseRequests, consignments]
  );

  const totalOrdersThisMonth = useMemo(() => {
    return (
      countItemsInCurrentMonth(purchaseRequests) +
      countItemsInCurrentMonth(consignments)
    );
  }, [purchaseRequests, consignments]);

  const dashboardNotifications = useMemo(() => {
    const recentOrder = recentOrders[0];

    return [
      {
        id: "welcome",
        category: "Hệ thống",
        title: "Dashboard đã sẵn sàng đồng bộ dữ liệu đơn hàng của bạn.",
        time: "Vừa xong",
        unread: true,
        type: "system",
      },
      {
        id: "purchase",
        category: "Mua hộ",
        title: `Bạn đang có ${purchaseTotalCount} yêu cầu mua hộ trong hệ thống.`,
        time: "Đã đồng bộ",
        unread: false,
        type: "purchase",
      },
      {
        id: "latest",
        category: recentOrder?.service || "Ký gửi",
        title: recentOrder
          ? `Đơn mới nhất: ${recentOrder.id} - ${recentOrder.status}.`
          : "Chưa có đơn hàng gần đây để hiển thị.",
        time: recentOrder?.createdAt
          ? formatDateTime(recentOrder.createdAt)
          : "Chưa có dữ liệu",
        unread: false,
        type: recentOrder?.service === "Mua hộ" ? "purchase" : "consignment",
      },
    ];
  }, [purchaseTotalCount, recentOrders]);

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
            Theo dõi đơn hàng, quản lý giao dịch và sử dụng các dịch vụ
            logistics quốc tế tại một nơi.
          </p>

          <div className="customer-dashboard__welcome-actions">
            <button
              type="button"
              className="customer-dashboard__primary-button"
              onClick={() => handleNavigate("/create-order/buy-orders")}
            >
              <PlusCircleOutlined />
              Tạo đơn mua hộ
            </button>

            <button
              type="button"
              className="customer-dashboard__secondary-button"
              onClick={() => handleNavigate("/create-order/consignment")}
            >
              <SendOutlined />
              Tạo đơn ký gửi
            </button>

            <button
              type="button"
              className="customer-dashboard__ghost-button"
              onClick={handleRefreshDashboard}
              disabled={isLoadingDashboard}
            >
              <ReloadOutlined spin={isLoadingDashboard} />
              Làm mới
            </button>
          </div>
        </div>

        <div className="customer-dashboard__welcome-visual" aria-hidden="true">
          <div className="customer-dashboard__welcome-globe">
            <span />
            <span />
            <span />
          </div>

          <div className="customer-dashboard__welcome-package">
            <div className="customer-dashboard__welcome-package-top" />
            <div className="customer-dashboard__welcome-package-front">VN</div>
            <div className="customer-dashboard__welcome-package-side" />
          </div>

          <div className="customer-dashboard__welcome-plane">✈</div>
        </div>
      </section>

      {dashboardError && (
        <section className="customer-dashboard__alert">
          <WarningOutlined />
          <span>{dashboardError}</span>
          <button type="button" onClick={handleRefreshDashboard}>
            Thử lại
          </button>
        </section>
      )}

      <section
        className="customer-dashboard__stats"
        aria-label="Thống kê tài khoản"
      >
        {dashboardStats.map((stat) => {
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
                <strong>{isLoadingDashboard ? "..." : stat.value}</strong>

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

          <p>Các chức năng thường xuyên sử dụng trong hệ thống.</p>
        </div>

        <div className="customer-dashboard__quick-grid">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                type="button"
                className={`customer-dashboard__quick-card customer-dashboard__quick-card--${action.theme}`}
                onClick={() => handleNavigate(action.route)}
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
              <strong>{totalOrdersThisMonth} đơn</strong>
            </div>

            <span className="customer-dashboard__chart-change">
              {isLoadingDashboard
                ? "Đang đồng bộ"
                : `Dữ liệu ${API_PAGE_SIZE} đơn gần nhất`}
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
              {monthlyChart.map((item) => (
                <div key={item.month} className="customer-dashboard__chart-column">
                  <div className="customer-dashboard__chart-bars">
                    <span
                      className="customer-dashboard__chart-bar customer-dashboard__chart-bar--purchase"
                      title={`${item.purchaseCount} đơn mua hộ`}
                      style={{ height: `${item.purchase}%` }}
                    />

                    <span
                      className="customer-dashboard__chart-bar customer-dashboard__chart-bar--consignment"
                      title={`${item.consignmentCount} đơn ký gửi`}
                      style={{ height: `${item.consignment}%` }}
                    />
                  </div>

                  <small>{item.month}</small>
                </div>
              ))}
            </div>

            {purchaseRequests.length + consignments.length === 0 && (
              <div className="customer-dashboard__chart-empty">
                <span>Chưa có dữ liệu</span>
              </div>
            )}
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
              onClick={handleRefreshDashboard}
            >
              Làm mới
            </button>
          </div>

          <div className="customer-dashboard__notification-list">
            {dashboardNotifications.map((notification) => (
              <article
                key={notification.id}
                className={`customer-dashboard__notification ${
                  notification.unread ? "is-unread" : ""
                }`}
              >
                <span
                  className={`customer-dashboard__notification-icon customer-dashboard__notification-icon--${notification.type}`}
                >
                  {notification.type === "system" ? (
                    <SafetyCertificateOutlined />
                  ) : notification.type === "purchase" ? (
                    <ShoppingCartOutlined />
                  ) : (
                    <InboxOutlined />
                  )}
                </span>

                <div className="customer-dashboard__notification-body">
                  <div className="customer-dashboard__notification-meta">
                    <span>{notification.category}</span>

                    {notification.unread && <i>NEW</i>}
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
            onClick={() => handleNavigate("/processing-orders")}
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
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="customer-dashboard__table-empty">
                      Chưa có đơn hàng để hiển thị.
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.key}>
                    <td>
                      <strong>{order.id}</strong>
                    </td>

                    <td>{order.service}</td>
                    <td>{order.route}</td>
                    <td>{order.value}</td>
                    <td>{formatDateTime(order.createdAt)}</td>

                    <td>
                      <span
                        className={`customer-dashboard__order-status customer-dashboard__order-status--${order.statusType}`}
                      >
                        {order.statusType === "waiting" && <ClockCircleOutlined />}
                        {order.statusType === "done" && <CheckCircleFilled />}
                        {order.statusType === "empty" && <CheckCircleFilled />}
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="customer-dashboard__orders-empty-note">
          Dữ liệu được lấy từ API mua hộ và ký gửi của tài khoản hiện tại.
        </div>
      </section>
    </main>
  );
}
