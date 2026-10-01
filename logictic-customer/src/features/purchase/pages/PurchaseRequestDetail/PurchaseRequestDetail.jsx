import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Button as AntButton, Result, Spin, Tabs, Tag } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CompassOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined,
  ShopOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SecurityIcon from "@mui/icons-material/Security";
import AllInboxIcon from "@mui/icons-material/AllInbox";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVnd } from "@shared/utils/formatNumber";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import {
  CONSIGNMENT_TYPE_LABELS,
  displayCode,
  /* Tuyến "CN-VN" → "Trung Quốc → Việt Nam"; không in mã nước thô. */
  getRouteLabel,
} from "@shared/utils/statusLabel";
import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "@shared/utils/timeUtc";

import {
  getPurchaseRequestDetailApi,
  getPurchaseRequestHistoryApi,
  getPurchaseRequestPaymentHistoryApi,
} from "@features/purchase/api/purchaseRequestApi";
import { getSupplierOrdersApi } from "@features/purchase/api/purchaseOrderApi";
import { resolvePurchaseProgress } from "@features/purchase/constants/purchaseStages";
/* Loại hàng hoá lấy danh mục thật để nhãn khớp với dữ liệu đơn trả về từ server. */
import { getProductTypesApi } from "@features/consignment/api/consignmentApi";
import SupplierOrderPanel from "@features/purchase/components/SupplierOrderPanel/SupplierOrderPanel";
import PurchaseRefundPanel from "@features/purchase/components/PurchaseRefundPanel/PurchaseRefundPanel";
import PurchaseMoneyCard from "@features/purchase/components/PurchaseMoneyCard/PurchaseMoneyCard";
import PurchaseShipmentsCard from "@features/purchase/components/PurchaseShipmentsCard/PurchaseShipmentsCard";
import PurchaseHistoryCard from "@features/purchase/components/PurchaseHistoryCard/PurchaseHistoryCard";
/* Import sâu vào tracking / settlement / orders: barrel của chúng kéo theo các trang (CSS toàn cục),
   ở đây chỉ cần API, thanh chặng và bảng đường dẫn — cùng cách OrderDetail đang làm (ARCHITECTURE mục 4). */
import { getOrderTrackingApi } from "@features/tracking/api/orderTrackingApi";
import TrackingStageBar from "@features/tracking/components/TrackingStageBar/TrackingStageBar";
import { getAwaitingSettlementApi } from "@features/settlement/api/settlementApi";
import {
  ORDER_TABS,
  PURCHASE_ORDERS_PATH,
  purchaseRequestQuotationPath,
  purchaseWarehouseOrderPath,
} from "@features/orders/constants/orderPaths";

import "./PurchaseRequestDetail.css";

/* ================= HELPERS ================= */

const CUSTOMER_SERVICE_CHAT_PATH = "/customer-service-chat";

/** Tab của trang (query `?tab=`) — tải lại / chia sẻ link vẫn mở đúng chỗ khách đang xem. */
const DETAIL_TABS = Object.freeze({
  progress: "tien-do",
  money: "thanh-toan",
  products: "san-pham",
  info: "thong-tin",
});

const TAB_QUERY_KEY = "tab";

/** Tra hành trình tối đa ngần này đơn kho một lượt — yêu cầu mua hộ hiếm khi tách nhiều hơn. */
const MAX_TRACKED_WAREHOUSE_ORDERS = 8;

const safeText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const getShippingOptionLabel = (value) => {
  const normalized = normalizeStatus(value);

  if (
    normalized === "STANDARD" ||
    normalized.includes("TIEU_CHUAN")
  ) {
    return "Tiêu chuẩn";
  }

  if (
    normalized === "EXPRESS" ||
    normalized.includes("HOA_TOC")
  ) {
    return "Hỏa tốc";
  }

  if (
    normalized === "ECONOMY" ||
    normalized.includes("TIET_KIEM")
  ) {
    return "Tiết kiệm";
  }

  /* Mã khác (vd. "AIR") → nhãn tiếng Việt; không bao giờ in mã thô. */
  if (!normalized) return "Chưa cập nhật";
  return displayCode(value, CONSIGNMENT_TYPE_LABELS, { generic: "Hình thức vận chuyển khác" });
};

const normalizeApiTimeToUtc = (value) =>
  apiToUtcIso(value, {
    apiTimeMode: "utc",
  });

const formatDateTime = (dateString) => {
  const utcIso = normalizeApiTimeToUtc(dateString);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatDateTimeUtcTitle = (dateString) => {
  const utcIso = normalizeApiTimeToUtc(dateString);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};

const formatNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? new Intl.NumberFormat("vi-VN").format(number)
    : "0";
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getProductTypeItems = (result) => {
  const responseData = result?.data ?? result;
  const payload = responseData?.data ?? responseData;

  if (Array.isArray(payload)) {
    return payload;
  }

  const items =
    payload?.items ||
    payload?.productTypes ||
    payload?.results ||
    [];

  return Array.isArray(items) ? items : [];
};

const getProductTypeId = (productType) =>
  String(
    productType?.productTypeId ??
      productType?.id ??
      productType?.code ??
      productType?.value ??
      "",
  ).trim();

const getProductTypeName = (productType) =>
  safeText(
    productType?.productTypeName ??
      productType?.name ??
      productType?.label ??
      productType?.description,
    getProductTypeId(productType) || "Chưa cập nhật",
  );

const getItemProductTypeKey = (item) =>
  String(
    item?.productTypeId ??
      item?.productType?.productTypeId ??
      item?.productType?.id ??
      item?.productType?.value ??
      item?.productTypeCode ??
      (typeof item?.productType === "string" ? item.productType : "") ??
      "",
  ).trim();

const getItemProductTypeLabel = (
  item,
  productTypeNameMap,
) => {
  const key = getItemProductTypeKey(item);

  if (key && productTypeNameMap?.has(key)) {
    return productTypeNameMap.get(key);
  }

  if (
    item?.productType &&
    typeof item.productType === "object"
  ) {
    const directName = safeText(
      item.productType?.productTypeName ??
        item.productType?.name ??
        item.productType?.label ??
        item.productType?.categoryName,
      "",
    );

    if (directName) {
      return directName;
    }
  }

  if (
    typeof item?.productType === "string" &&
    item.productType.trim()
  ) {
    const str = item.productType.trim();
    if (productTypeNameMap?.has(str)) {
      return productTypeNameMap.get(str);
    }
    return str;
  }

  return safeText(
    item?.productTypeName ||
      item?.productTypeCategoryName ||
      item?.categoryName ||
      (key && !key.includes("-") ? key : ""),
    "Chưa cập nhật",
  );
};

const normalizeImageUrl = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  return String(
    value?.url ??
      value?.imageUrl ??
      value?.fileUrl ??
      value?.previewUrl ??
      "",
  ).trim();
};

const getItemImageUrls = (item) => {
  const candidates = [
    ...(Array.isArray(item?.imageUrls)
      ? item.imageUrls
      : []),
    ...(Array.isArray(item?.images)
      ? item.images
      : []),
    item?.imageUrl,
    item?.image,
  ];

  return Array.from(
    new Set(
      candidates
        .map(normalizeImageUrl)
        .filter(Boolean),
    ),
  );
};

const truncateMiddle = (
  value,
  maxLength = 76,
) => {
  const text = String(value || "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  const sideLength = Math.floor(
    (maxLength - 3) / 2,
  );

  return `${text.slice(0, sideLength)}...${text.slice(
    -sideLength,
  )}`;
};

const getCompactLinkData = (value) => {
  const fullUrl = String(value || "").trim();

  if (!fullUrl) {
    return {
      fullUrl: "",
      domain: "Không có website",
      path: "Không có link sản phẩm",
    };
  }

  try {
    const url = new URL(fullUrl);
    const domain = url.hostname.replace(/^www\./, "");

    let decodedPath = url.pathname || "/";

    try {
      decodedPath = decodeURIComponent(decodedPath);
    } catch {
      // Giữ nguyên pathname nếu URL có chuỗi mã hóa không hợp lệ.
    }

    const compactPath = decodedPath === "/"
      ? "Trang sản phẩm"
      : truncateMiddle(decodedPath, 82);

    return {
      fullUrl,
      domain,
      path: compactPath,
    };
  } catch {
    return {
      fullUrl,
      domain: "Liên kết sản phẩm",
      path: truncateMiddle(fullUrl, 82),
    };
  }
};

const getBooleanLabel = (value) =>
  value ? "Có" : "Không";

const openExternalLink = (url) => {
  const link = String(url || "").trim();

  if (!link) {
    return;
  }

  window.open(
    link,
    "_blank",
    "noopener,noreferrer",
  );
};


const TONE_TAG_COLOR = {
  current: "blue",
  warning: "orange",
  stopped: "red",
  done: "green",
};

/**
 * Đơn kho của từng đơn mua NCC: id/mã/trạng thái từ DTO (WarehouseOrderId / Code / Status); backend
 * đời cũ chưa trả id thì khớp dòng chờ tất toán theo mã `{mã yêu cầu}-{n}` (như SupplierOrderPanel).
 */
const resolveWarehouseRefs = (supplierOrders, settlements) =>
  (Array.isArray(supplierOrders) ? supplierOrders : [])
    .filter((order) => normalizeStatus(order?.status) !== "CANCELLED")
    .map((order) => {
      const expectedCode =
        order?.purchaseCode && order?.sequenceNo ? `${order.purchaseCode}-${order.sequenceNo}` : "";
      const settlement = settlements.find((item) =>
        order?.warehouseOrderId
          ? String(item?.orderId) === String(order.warehouseOrderId)
          : expectedCode && String(item?.orderCode || "").toUpperCase() === expectedCode.toUpperCase(),
      );
      const orderId = String(order?.warehouseOrderId || settlement?.orderId || "");

      if (!orderId && !order?.warehouseOrderCode) return null;

      return {
        orderId,
        orderCode: order?.warehouseOrderCode || settlement?.orderCode || expectedCode,
        status: normalizeStatus(order?.warehouseOrderStatus || settlement?.status),
        dueAmount: toNumber(settlement?.pendingPaymentAmount),
        supplierOrderCode: order?.purchaseOrderCode || "",
        supplierName: order?.supplierName || "",
      };
    })
    .filter(Boolean);

/**
 * Nạp MỌI thứ trang cần trong một lượt. Chỉ chi tiết yêu cầu là bắt buộc; phần còn lại hỏng thì
 * khối tương ứng tự báo "chưa tải được" hoặc ẩn — không làm cả trang trắng.
 */
const loadPurchaseOverview = async (requestId, signal) => {
  const [detailResult, paymentsResult, supplierResult, historyResult, settlementResult] =
    await Promise.allSettled([
      getPurchaseRequestDetailApi(requestId, { signal }),
      getPurchaseRequestPaymentHistoryApi(requestId, { signal }),
      getSupplierOrdersApi(requestId, { signal }),
      getPurchaseRequestHistoryApi(requestId, { signal }),
      getAwaitingSettlementApi({ signal }),
    ]);

  if (detailResult.status === "rejected") {
    throw detailResult.reason;
  }

  const detail = detailResult.value;

  if (!detail || typeof detail !== "object") {
    throw new Error("API không trả về dữ liệu chi tiết yêu cầu mua hộ.");
  }

  const supplierOrders = supplierResult.status === "fulfilled" ? supplierResult.value : [];
  const settlements =
    settlementResult.status === "fulfilled" && Array.isArray(settlementResult.value)
      ? settlementResult.value
      : [];

  const refs = resolveWarehouseRefs(supplierOrders, settlements);
  const trackable = refs.filter((ref) => ref.orderId).slice(0, MAX_TRACKED_WAREHOUSE_ORDERS);

  const trackingResults = await Promise.allSettled(
    trackable.map((ref) => getOrderTrackingApi(ref.orderId, { signal })),
  );

  const trackingById = new Map(
    trackable.map((ref, index) => [
      ref.orderId,
      trackingResults[index].status === "fulfilled" ? trackingResults[index].value : null,
    ]),
  );

  const warehouseOrders = refs.map((ref) => {
    const tracking = ref.orderId ? trackingById.get(ref.orderId) || null : null;

    return {
      ...ref,
      tracking,
      status: ref.status || normalizeStatus(tracking?.orderStatus),
    };
  });

  return {
    detail,
    paymentHistory: paymentsResult.status === "fulfilled" ? paymentsResult.value : null,
    paymentsError: paymentsResult.status === "rejected" && !isCanceledError(paymentsResult.reason),
    supplierOrders,
    supplierError: supplierResult.status === "rejected" && !isCanceledError(supplierResult.reason),
    history: historyResult.status === "fulfilled" ? historyResult.value : [],
    historyError: historyResult.status === "rejected" && !isCanceledError(historyResult.reason),
    warehouseOrders,
  };
};

/* ================= COMPONENT ================= */

/**
 * CHI TIẾT YÊU CẦU MUA HỘ — cùng khuôn với chi tiết đơn ký gửi (OrderDetail): thanh điều hướng,
 * khung tiêu đề có thanh tiến độ + trạng thái + "bước tiếp theo", rồi các tab.
 *
 *   - Tiến độ         : đơn mua nhà cung cấp (duyệt / trả phần chênh), đơn vận chuyển PUR-…-n kèm
 *                       hành trình, lịch sử đơn.
 *   - Tiền & thanh toán: báo giá tách phần trả trước / phần thu ở VN, các khoản đã trả, tiền hoàn.
 *   - Sản phẩm        : từng dòng sản phẩm, ảnh, link.
 *   - Thông tin đơn   : khách hàng, người nhận, dịch vụ bổ sung, ghi chú.
 *
 * Thanh tiến độ 9 bậc dựng ở purchaseStages.resolvePurchaseProgress từ trạng thái thật của yêu cầu,
 * đơn mua NCC và hành trình đơn kho — không tự đặt thêm trạng thái nào.
 */
const PurchaseRequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const stateSummary =
    location.state?.purchaseRequest ||
    location.state?.orderSummary ||
    null;

  /*
   * Route hiện tại là `/orders/mua-ho/:requestId` (khai ở app/router/paths.js). Hai tên cũ
   * `purchaseRequestId` / `id` giữ lại cho đường dẫn cũ còn nằm trong lịch sử trình duyệt —
   * thiếu `requestId` thì màn dừng ngay ở nhánh "không tìm thấy mã" mà chưa kịp gọi API.
   */
  const requestId =
    params.requestId ||
    params.purchaseRequestId ||
    params.id ||
    stateSummary?.purchaseRequestId ||
    "";

  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${requestId}|${refreshKey}`;
  const [overview, setOverview] = useState({ key: null, data: null, error: null });
  const [activeGallery, setActiveGallery] = useState(null);
  const [productTypesState, setProductTypesState] = useState({ loaded: false, items: [] });

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  /* Chỉ đặt state trong callback của promise — đặt thẳng trong thân effect là thừa một lượt render. */
  useEffect(() => {
    if (!requestId) return undefined;

    const controller = new AbortController();

    loadPurchaseOverview(requestId, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setOverview({ key: requestKey, data, error: null });
        }
      },
      (error) => {
        if (controller.signal.aborted || isCanceledError(error)) return;

        console.error("Lỗi lấy chi tiết yêu cầu mua hộ:", error);

        const message = getApiErrorMessage(error, "Không thể tải chi tiết yêu cầu mua hộ.");
        setOverview((current) => ({ key: requestKey, data: current.data, error: { status: error?.response?.status, message } }));

        AuthNotify.error("Không tải được chi tiết", message);
      },
    );

    return () => controller.abort();
  }, [requestId, requestKey]);

  useEffect(() => {
    const controller = new AbortController();

    getProductTypesApi({ signal: controller.signal }).then(
      (result) => setProductTypesState({ loaded: true, items: getProductTypeItems(result) }),
      (error) => {
        if (isCanceledError(error)) return;
        console.error("Lỗi lấy danh mục loại sản phẩm:", error);
        setProductTypesState({ loaded: true, items: [] });
      },
    );

    return () => controller.abort();
  }, []);

  const productTypeNameMap = useMemo(() => {
    const map = new Map();
    (productTypesState.items || []).forEach((pt) => {
      const name = getProductTypeName(pt);
      const id = getProductTypeId(pt);
      if (id) map.set(id, name);
      if (pt?.productTypeId) map.set(String(pt.productTypeId).trim(), name);
      if (pt?.id) map.set(String(pt.id).trim(), name);
      if (pt?.code) map.set(String(pt.code).trim(), name);
      if (pt?.value) map.set(String(pt.value).trim(), name);
    });
    return map;
  }, [productTypesState.items]);

  const data = overview.data;
  const purchaseRequest = data?.detail || stateSummary || null;

  const rawItems = purchaseRequest?.items;
  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);

  const totalQuantity = useMemo(() => {
    const apiTotal = Number(purchaseRequest?.totalQuantity);

    if (Number.isFinite(apiTotal) && apiTotal > 0) return apiTotal;

    return items.reduce((total, item) => total + (Number(item?.quantity) || 0), 0);
  }, [items, purchaseRequest?.totalQuantity]);

  const progress = useMemo(
    () =>
      resolvePurchaseProgress({
        status: purchaseRequest?.status,
        statusDisplayName: purchaseRequest?.statusDisplayName,
        reason: purchaseRequest?.reason,
        quotation: purchaseRequest?.quotation || null,
        paymentHistory: data?.paymentHistory || null,
        paymentsError: Boolean(data?.paymentsError),
        supplierOrders: data?.supplierOrders || [],
        warehouseOrders: data?.warehouseOrders || [],
        history: data?.history || [],
      }),
    [purchaseRequest, data],
  );

  const serviceOptions = useMemo(
    () => [
      {
        key: "packing",
        label: "Đóng gói lại",
        description: "Gia cố và đóng gói lại sản phẩm trước khi vận chuyển.",
        enabled: Boolean(purchaseRequest?.requiresPacking),
        icon: <Inventory2Icon />,
      },
      {
        key: "wooden-crate",
        label: "Đóng thùng gỗ",
        description: "Bảo vệ kiện hàng bằng thùng gỗ theo yêu cầu.",
        enabled: Boolean(purchaseRequest?.requiresWoodenCrate),
        icon: <AllInboxIcon />,
      },
      {
        key: "insurance",
        label: "Bảo hiểm hàng hóa",
        description: "Áp dụng chính sách bảo hiểm cho đơn mua hộ.",
        enabled: Boolean(purchaseRequest?.requiresInsurance),
        icon: <SecurityIcon />,
      },
    ],
    [
      purchaseRequest?.requiresInsurance,
      purchaseRequest?.requiresPacking,
      purchaseRequest?.requiresWoodenCrate,
    ],
  );

  useEffect(() => {
    if (!activeGallery) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveGallery(null);
      }

      if (event.key === "ArrowLeft") {
        setActiveGallery((current) => {
          if (!current?.images?.length) {
            return current;
          }

          return {
            ...current,
            index: (current.index - 1 + current.images.length) % current.images.length,
          };
        });
      }

      if (event.key === "ArrowRight") {
        setActiveGallery((current) => {
          if (!current?.images?.length) {
            return current;
          }

          return {
            ...current,
            index: (current.index + 1) % current.images.length,
          };
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGallery]);

  const handleCopy = async (value, label = "Nội dung") => {
    const text = String(value || "").trim();

    if (!text) {
      AuthNotify.warning("Không thể sao chép", `${label} đang trống.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      AuthNotify.success("Đã sao chép", `${label} đã được sao chép.`);
    } catch {
      AuthNotify.error("Sao chép thất bại", "Trình duyệt không cho phép sao chép tự động.");
    }
  };

  const handleOpenGallery = (images, index, alt) => {
    if (!Array.isArray(images) || !images.length) {
      return;
    }

    setActiveGallery({ images, index, alt });
  };

  const rawTab = searchParams.get(TAB_QUERY_KEY) || "";
  const activeTab = Object.values(DETAIL_TABS).includes(rawTab) ? rawTab : DETAIL_TABS.progress;

  const changeTab = (key) => {
    const next = new URLSearchParams(searchParams);

    if (key === DETAIL_TABS.progress) next.delete(TAB_QUERY_KEY);
    else next.set(TAB_QUERY_KEY, key);

    setSearchParams(next, { replace: true });
  };

  const openWarehouseOrder = (orderId, tab = "journey") =>
    navigate(
      purchaseWarehouseOrderPath(
        orderId,
        tab === "payment" ? ORDER_TABS.payment : ORDER_TABS.journey,
        requestId,
      ),
    );

  const runAction = (action) => {
    if (!action) return;

    switch (action.kind) {
      case "quotation":
        navigate(purchaseRequestQuotationPath(requestId));
        break;
      case "settlement":
        if (action.orderId) openWarehouseOrder(action.orderId, "payment");
        break;
      case "tracking":
        if (action.orderId) openWarehouseOrder(action.orderId, "journey");
        break;
      case "supplierOrders":
        changeTab(DETAIL_TABS.progress);
        window.requestAnimationFrame(() =>
          document
            .getElementById("purchase-supplier-orders")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
        break;
      case "chat":
        navigate(CUSTOMER_SERVICE_CHAT_PATH);
        break;
      default:
        break;
    }
  };

  const firstLoad = overview.key === null && !purchaseRequest;
  const reloading = overview.key !== requestKey && !firstLoad;

  if (!requestId) {
    return (
      <Result
        status="404"
        title="Không tìm thấy yêu cầu mua hộ"
        subTitle="Đường dẫn thiếu mã yêu cầu."
        extra={
          <AntButton type="primary" onClick={() => navigate(PURCHASE_ORDERS_PATH)}>
            Về danh sách đơn mua hộ
          </AntButton>
        }
      />
    );
  }

  if (firstLoad) {
    return (
      <div className="purchase-detail__loading">
        <Spin size="large" />
        <span>Đang tải chi tiết yêu cầu mua hộ...</span>
      </div>
    );
  }

  if (overview.error && !data) {
    const { status, message } = overview.error;

    return (
      <Result
        status={status === 403 ? "403" : status === 404 ? "404" : "warning"}
        title={status === 403 ? "Bạn không xem được yêu cầu này" : "Không tải được yêu cầu mua hộ"}
        subTitle={message}
        extra={[
          <AntButton key="back" onClick={() => navigate(PURCHASE_ORDERS_PATH)}>
            Về danh sách đơn mua hộ
          </AntButton>,
          <AntButton key="retry" type="primary" icon={<ReloadOutlined />} onClick={refresh}>
            Tải lại
          </AntButton>,
        ]}
      />
    );
  }

  if (!purchaseRequest) {
    return null;
  }

  const quotation = purchaseRequest.quotation || null;
  const paymentHistory = data?.paymentHistory || null;
  const warehouseOrders = data?.warehouseOrders || [];
  const history = data?.history || [];
  const createdAt = purchaseRequest.createdAtUtc || purchaseRequest.createdAt;
  const updatedAt = purchaseRequest.statusUpdatedAt;
  const routeLabel = getRouteLabel(purchaseRequest.route);
  const pendingRefund = toNumber(paymentHistory?.totalPendingRefund);
  const toneTagColor = TONE_TAG_COLOR[progress.tone] || "blue";

  const heroFacts = [
    {
      key: "total",
      label: "Tổng dự kiến",
      value: quotation ? formatVnd(quotation.totalAmount) : "Chưa báo giá",
      muted: !quotation,
    },
    {
      key: "paid",
      label: "Đã trả",
      value: paymentHistory ? formatVnd(paymentHistory.totalPaid) : "—",
      tone: "is-paid",
    },
    {
      key: "due",
      label: "Còn phải trả trước",
      value: paymentHistory ? formatVnd(paymentHistory.outstanding) : "—",
      tone: toNumber(paymentHistory?.outstanding) > 0 ? "is-due" : "",
    },
    {
      key: "items",
      label: "Sản phẩm",
      value: `${formatNumber(items.length)} dòng · ${formatNumber(totalQuantity)} món`,
    },
    {
      key: "created",
      label: "Ngày tạo",
      value: formatDateTime(createdAt),
      title: formatDateTimeUtcTitle(createdAt),
    },
  ];

  const tabItems = [
    { key: DETAIL_TABS.progress, icon: <CompassOutlined />, label: "Tiến độ" },
    { key: DETAIL_TABS.money, icon: <WalletOutlined />, label: "Tiền & thanh toán" },
    { key: DETAIL_TABS.products, icon: <InboxOutlined />, label: `Sản phẩm (${items.length})` },
    { key: DETAIL_TABS.info, icon: <FileTextOutlined />, label: "Thông tin đơn" },
  ];

  /*
   * Chưa trả trước (hoặc dừng trước bước đặt hàng) và chưa có đơn mua / đơn vận chuyển nào: hai thẻ
   * đó chỉ là khung rỗng — ẩn đi cho lịch sử lên đầu. Có dữ liệu thì luôn hiện, kể cả khi đã huỷ.
   */
  const supplierOrders = data?.supplierOrders || [];
  const legacyShipments = Array.isArray(purchaseRequest.shipments) ? purchaseRequest.shipments : [];
  const hasFulfillmentData =
    supplierOrders.length > 0 || warehouseOrders.length > 0 || legacyShipments.length > 0;
  const showFulfillment =
    hasFulfillmentData || (progress.stepIndex >= 3 && progress.tone !== "stopped");
  const showShipments =
    warehouseOrders.length > 0 || legacyShipments.length > 0 || (progress.stepIndex >= 3 && progress.tone !== "stopped");

  const renderProgressTab = () => (
    <>
      {showFulfillment ? (
        <SectionCard
          id="purchase-supplier-orders"
          icon={<ShopOutlined />}
          title="Đơn mua nhà cung cấp"
          subtitle="VCL đặt hàng theo từng người bán. Giá mua thực cao hơn giá đã báo thì bạn duyệt phần chênh ở đây."
          tone={progress.action?.kind === "supplierOrders" ? "warning" : "default"}
        >
          <SupplierOrderPanel
            purchaseRequestId={requestId}
            refreshKey={refreshKey}
            onChanged={refresh}
            showWarehouseOrder={false}
          />
        </SectionCard>
      ) : null}

      {/* Trước khi đặt hàng, việc chính của khách là tiền: đưa thẳng báo giá lên tab đầu. */}
      {!showFulfillment && quotation && progress.tone !== "stopped" ? (
        <PurchaseMoneyCard
          quotation={quotation}
          paymentHistory={paymentHistory}
          paymentsError={Boolean(data?.paymentsError)}
          onOpenQuotation={() => navigate(purchaseRequestQuotationPath(requestId))}
          onRetry={refresh}
        />
      ) : null}

      {showShipments ? (
        <PurchaseShipmentsCard
          warehouseOrders={warehouseOrders}
          legacyShipments={legacyShipments}
          legacyOrderCode={purchaseRequest.orderCode}
          onOpen={openWarehouseOrder}
        />
      ) : null}

      <PurchaseHistoryCard
        entries={history}
        error={Boolean(data?.historyError)}
        createdAt={createdAt}
        onRetry={refresh}
        onOpenImages={handleOpenGallery}
      />
    </>
  );

  const renderMoneyTab = () => (
    <>
      <PurchaseMoneyCard
        quotation={quotation}
        paymentHistory={paymentHistory}
        paymentsError={Boolean(data?.paymentsError)}
        stopped={progress.tone === "stopped"}
        onOpenQuotation={() => navigate(purchaseRequestQuotationPath(requestId))}
        onRetry={refresh}
      />

      {/* Tự ẩn khi chưa có khoản hoàn hoặc máy chủ chưa hỗ trợ. */}
      <PurchaseRefundPanel key={`refund-${refreshKey}`} purchaseRequestId={requestId} />
    </>
  );

  const renderProductsTab = () => (
    <section className="purchase-detail-products-section">
      <div className="purchase-detail-section-header">
        <div>
          <h2>Danh sách sản phẩm mua hộ</h2>
          <p>Link, website nguồn, loại sản phẩm, số lượng, thuộc tính, ghi chú và ảnh tham khảo.</p>
        </div>

        <span>
          {formatNumber(items.length)} dòng · {formatNumber(totalQuantity)} món
        </span>
      </div>

      {items.length === 0 ? (
        <div className="purchase-detail-empty-items">Chưa có sản phẩm trong yêu cầu này.</div>
      ) : (
        <div className="purchase-detail-product-list">
          {items.map((item, index) => (
            <ProductItemCard
              key={item.itemId || index}
              item={item}
              index={index}
              onCopy={handleCopy}
              onOpenGallery={handleOpenGallery}
              productTypeNameMap={productTypeNameMap}
              productTypesLoading={!productTypesState.loaded}
            />
          ))}
        </div>
      )}
    </section>
  );

  const renderInfoTab = () => (
    <section className="purchase-detail-info-grid">
      <div className="purchase-detail-panel">
        <div className="purchase-detail-panel-title">
          <PersonIcon />
          <h2>Thông tin khách hàng</h2>
        </div>

        <div className="purchase-detail-info-list">
          <InfoRow label="Khách hàng" value={purchaseRequest.customerName} />
          <InfoRow label="Người tạo yêu cầu" value={purchaseRequest.createdByName} />
          <InfoRow label="Mã yêu cầu" value={purchaseRequest.purchaseCode} copyable onCopy={handleCopy} />
        </div>
      </div>

      <div className="purchase-detail-panel">
        <div className="purchase-detail-panel-title">
          <LocalShippingIcon />
          <h2>Thông tin nhận hàng</h2>
        </div>

        <div className="purchase-detail-info-list">
          <InfoRow label="Người nhận" value={purchaseRequest.receiverName} />
          <InfoRow label="Số điện thoại" value={purchaseRequest.receiverPhone} copyable onCopy={handleCopy} />
          <InfoRow label="Địa chỉ" value={purchaseRequest.receiverAddress} />
          <InfoRow label="Tuyến hàng" value={routeLabel} accent />
          <InfoRow label="Vận chuyển" value={getShippingOptionLabel(purchaseRequest.shippingOption)} />
          {purchaseRequest.warehouseName ? (
            <InfoRow label="Kho nhận ở nước ngoài" value={purchaseRequest.warehouseName} />
          ) : null}
        </div>
      </div>

      <div className="purchase-detail-panel purchase-detail-services-panel">
        <div className="purchase-detail-panel-title">
          <SecurityIcon />
          <h2>Dịch vụ bổ sung</h2>
        </div>

        <div className="purchase-detail-services-grid">
          {serviceOptions.map(({ key, ...service }) => (
            <ServiceCard key={key} {...service} />
          ))}
        </div>
      </div>

      <div className="purchase-detail-panel">
        <div className="purchase-detail-panel-title">
          <ReceiptLongIcon />
          <h2>Ghi chú & xử lý</h2>
        </div>

        <div className="purchase-detail-info-list">
          <InfoRow label="Trạng thái yêu cầu" value={progress.requestStatusLabel} accent />
          <InfoRow label="Cập nhật lúc" value={updatedAt ? formatDateTime(updatedAt) : "-"} />
          <InfoRow label="Lý do / ghi chú của VCL" value={safeText(purchaseRequest.reason, "Không có")} />
        </div>

        <div className="purchase-detail-note-box purchase-detail-note-box--spaced">
          <span>Ghi chú chung của bạn</span>
          <p>
            {purchaseRequest.generalNote?.trim()
              ? purchaseRequest.generalNote
              : "Không có ghi chú chung."}
          </p>
        </div>

        {purchaseRequest.receiptPdfUrl ? (
          <a
            className="purchase-detail-receipt-link"
            href={purchaseRequest.receiptPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileTextOutlined /> Phiếu nhập kho (PDF)
          </a>
        ) : null}
      </div>
    </section>
  );

  const renderTab = () => {
    switch (activeTab) {
      case DETAIL_TABS.money:
        return renderMoneyTab();
      case DETAIL_TABS.products:
        return renderProductsTab();
      case DETAIL_TABS.info:
        return renderInfoTab();
      default:
        return renderProgressTab();
    }
  };

  return (
    <div className="purchase-detail">
      <div className="purchase-detail__nav">
        <AntButton icon={<ArrowLeftOutlined />} onClick={() => navigate(PURCHASE_ORDERS_PATH)}>
          Đơn mua hộ
        </AntButton>

        <AntButton icon={<ReloadOutlined />} loading={reloading} onClick={refresh}>
          Tải lại
        </AntButton>
      </div>

      <section className={`purchase-detail__hero is-${progress.tone}`}>
        <div className="purchase-detail__hero-top">
          <div className="purchase-detail__hero-copy">
            <span className="purchase-detail__eyebrow">Đơn mua hộ</span>
            <h1>
              {safeText(purchaseRequest.purchaseCode, "Yêu cầu mua hộ")}
              <Tooltip title="Sao chép mã yêu cầu">
                <button
                  type="button"
                  className="purchase-detail__copy"
                  onClick={() => handleCopy(purchaseRequest.purchaseCode, "Mã yêu cầu")}
                  aria-label="Sao chép mã yêu cầu"
                >
                  <ContentCopyIcon />
                </button>
              </Tooltip>
            </h1>
            <p>
              {[
                routeLabel || "Tuyến chưa cập nhật",
                getShippingOptionLabel(purchaseRequest.shippingOption),
                purchaseRequest.warehouseName ? `Kho nhận: ${purchaseRequest.warehouseName}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="purchase-detail__hero-tags">
            <Tag color={toneTagColor}>{progress.statusLabel}</Tag>
            {progress.split ? <Tag color="purple">Tách nhiều đơn mua</Tag> : null}
            {pendingRefund > 0 ? <Tag color="gold">Đang hoàn {formatVnd(pendingRefund)}</Tag> : null}
          </div>
        </div>

        <TrackingStageBar
          steps={progress.steps}
          currentIndex={progress.stepIndex}
          tone={progress.tone}
          nowText={progress.headline}
        />

        {progress.hint || progress.action ? (
          <div
            className={`purchase-detail__next ${
              progress.tone === "warning" || progress.tone === "stopped" ? "is-warning" : ""
            } ${progress.action && progress.action.kind !== "tracking" && progress.action.kind !== "chat" ? "is-action" : ""}`}
          >
            <div className="purchase-detail__next-copy">
              <span className="purchase-detail__next-label">
                {progress.tone === "done" || progress.tone === "stopped" ? "Ghi chú" : "Bước tiếp theo"}
              </span>
              <p>{progress.hint}</p>
            </div>

            {progress.action ? (
              <AntButton
                type={["quotation", "settlement", "supplierOrders"].includes(progress.action.kind) ? "primary" : "default"}
                onClick={() => runAction(progress.action)}
              >
                {progress.action.label}
                <ArrowRightOutlined />
              </AntButton>
            ) : null}
          </div>
        ) : null}

        <dl className="purchase-detail__facts">
          {heroFacts.map((fact) => (
            <div key={fact.key} className={`${fact.tone || ""} ${fact.muted ? "is-muted" : ""}`}>
              <dt>{fact.label}</dt>
              <dd title={fact.title || undefined}>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {updatedAt ? (
          <p className="purchase-detail__updated">Cập nhật trạng thái lúc {formatDateTime(updatedAt)}</p>
        ) : null}
      </section>

      <Tabs
        className="purchase-detail__tabs"
        activeKey={activeTab}
        items={tabItems.map((item) => ({
          key: item.key,
          label: (
            <span className="purchase-detail__tab-label">
              {item.icon}
              {item.label}
            </span>
          ),
        }))}
        onChange={changeTab}
      />

      <div className="purchase-detail__panel">{renderTab()}</div>

      {activeGallery && (
        <ImageLightbox
          gallery={activeGallery}
          onClose={() => setActiveGallery(null)}
          onPrevious={() =>
            setActiveGallery((current) => ({
              ...current,
              index: (current.index - 1 + current.images.length) % current.images.length,
            }))
          }
          onNext={() =>
            setActiveGallery((current) => ({
              ...current,
              index: (current.index + 1) % current.images.length,
            }))
          }
        />
      )}
    </div>
  );
};

/* ================= CHILD COMPONENTS ================= */

const InfoRow = ({
  label,
  value,
  copyable = false,
  onCopy,
  loading = false,
  accent = false,
}) => {
  const displayValue = safeText(value);

  return (
    <div
      className={`purchase-detail-info-row ${
        loading ? "is-loading" : ""
      } ${accent ? "is-accent" : ""}`}
    >
      <span>{label}</span>

      <div>
        <strong>
          {loading && (
            <CircularProgress
              size={14}
              thickness={5}
            />
          )}

          {displayValue}
        </strong>

        {copyable &&
          !loading &&
          displayValue !== "-" && (
            <button
              type="button"
              onClick={() =>
                onCopy?.(displayValue, label)
              }
              className="purchase-detail-mini-copy"
              aria-label={`Sao chép ${label}`}
            >
              <ContentCopyIcon />
            </button>
          )}
      </div>
    </div>
  );
};

const ServiceCard = ({
  label,
  description,
  enabled,
  icon,
}) => (
  <article
    className={`purchase-detail-service-card ${
      enabled ? "is-enabled" : "is-disabled"
    }`}
  >
    <span className="purchase-detail-service-icon">
      {icon}
    </span>

    <div>
      <small>{label}</small>
      <strong>
        {getBooleanLabel(enabled)}
      </strong>
      <p>{description}</p>
    </div>

    <span className="purchase-detail-service-state">
      {enabled ? "Đã chọn" : "Không chọn"}
    </span>
  </article>
);

const ProductItemCard = ({
  item,
  index,
  onCopy,
  onOpenGallery,
  productTypeNameMap,
  productTypesLoading,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  const productLink = String(
    item?.productLink || "",
  ).trim();

  const imageUrls = useMemo(
    () => getItemImageUrls(item),
    [item],
  );

  const imageAlt =
    item?.productName ||
    `Sản phẩm ${index + 1}`;

  const productTypeLabel =
    getItemProductTypeLabel(
      item,
      productTypeNameMap,
    );

  const compactLink = getCompactLinkData(
    productLink,
  );

  /* Danh sách ảnh ngắn lại (tải lại dữ liệu) thì quay về ảnh đầu — tính khi render, không cần effect. */
  const imageIndexShown =
    selectedImageIndex < imageUrls.length ? selectedImageIndex : 0;

  const activeImageUrl =
    imageUrls[imageIndexShown] ||
    imageUrls[0] ||
    "";


  return (
    <article className="purchase-detail-product-card">
      <div className="purchase-detail-product-gallery">
        <div className="purchase-detail-product-image-wrap">
          {activeImageUrl ? (
            <button
              type="button"
              className="purchase-detail-product-image-button"
              onClick={() =>
                onOpenGallery?.(
                  imageUrls,
                  imageIndexShown,
                  imageAlt,
                )
              }
              aria-label={`Xem ảnh ${imageAlt}`}
            >
              <img
                src={activeImageUrl}
                alt={imageAlt}
                className="purchase-detail-product-image"
                loading="lazy"
              />

              <span className="purchase-detail-image-view-hint">
                <PhotoLibraryIcon />
                Xem ảnh lớn
              </span>

              <span className="purchase-detail-product-image-count">
                {imageIndexShown + 1}/
                {imageUrls.length}
              </span>
            </button>
          ) : (
            <div className="purchase-detail-image-placeholder">
              <PhotoLibraryIcon />
              <span>Không có ảnh sản phẩm</span>
            </div>
          )}
        </div>

        {imageUrls.length > 1 && (
          <div className="purchase-detail-image-thumbnails">
            {imageUrls.map((imageUrl, imageIndex) => (
              <button
                type="button"
                key={`${imageUrl}-${imageIndex}`}
                className={
                  imageIndex === imageIndexShown
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setSelectedImageIndex(imageIndex)
                }
                aria-label={`Chọn ảnh ${
                  imageIndex + 1
                } của ${imageAlt}`}
              >
                <img
                  src={imageUrl}
                  alt={`${imageAlt} ${
                    imageIndex + 1
                  }`}
                  loading="lazy"
                />
                <span>{imageIndex + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="purchase-detail-product-content">
        <div className="purchase-detail-product-header">
          <div>
            <span className="purchase-detail-product-index">
              Sản phẩm thứ {index + 1}
            </span>

            <h3>
              {safeText(
                item?.productName,
                `Sản phẩm ${index + 1}`,
              )}
            </h3>
          </div>

          <span className="purchase-detail-product-quantity">
            SL: {formatNumber(item?.quantity)}
          </span>
        </div>

        <div className="purchase-detail-product-meta-grid">
          <InfoRow
            label="Website nguồn"
            value={item?.sourceWebsite}
          />

          <InfoRow
            label="Loại sản phẩm"
            value={
              productTypesLoading &&
              !item?.productType
                ? "Đang tải tên loại sản phẩm..."
                : productTypeLabel
            }
            loading={
              productTypesLoading &&
              !item?.productType
            }
            accent
          />

          <InfoRow
            label="Thuộc tính"
            value={item?.attributes}
          />

          <InfoRow
            label="Ghi chú"
            value={
              item?.note?.trim()
                ? item.note
                : "Không có ghi chú"
            }
          />
        </div>

        <div className="purchase-detail-product-link-box">
          <div className="purchase-detail-product-link-label">
            <span>Link sản phẩm</span>
            {productLink && (
              <small title={productLink}>
                Đã rút gọn để dễ xem
              </small>
            )}
          </div>

          <div className="purchase-detail-product-link-row">
            <a
              href={productLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={productLink || undefined}
              onClick={(event) => {
                if (!productLink) {
                  event.preventDefault();
                }
              }}
            >
              <span className="purchase-detail-link-domain">
                {compactLink.domain}
              </span>

              <span className="purchase-detail-link-path">
                {compactLink.path}
              </span>
            </a>

            {productLink && (
              <div className="purchase-detail-link-actions">
                <Tooltip title="Sao chép link đầy đủ">
                  <button
                    type="button"
                    aria-label="Sao chép link sản phẩm"
                    onClick={() =>
                      onCopy?.(
                        productLink,
                        "Link sản phẩm",
                      )
                    }
                  >
                    <ContentCopyIcon />
                  </button>
                </Tooltip>

                <Tooltip title="Mở sản phẩm ở tab mới">
                  <button
                    type="button"
                    aria-label="Mở link sản phẩm"
                    onClick={() =>
                      openExternalLink(productLink)
                    }
                  >
                    <OpenInNewIcon />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const ImageLightbox = ({
  gallery,
  onClose,
  onPrevious,
  onNext,
}) => {
  const images = Array.isArray(gallery?.images)
    ? gallery.images
    : [];
  const index = Number(gallery?.index) || 0;
  const currentImage = images[index];
  const hasMultipleImages = images.length > 1;

  if (!currentImage) {
    return null;
  }

  return (
    <div
      className="purchase-detail-image-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh sản phẩm"
    >
      <div
        className="purchase-detail-image-lightbox-card"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="purchase-detail-image-lightbox-close"
          onClick={onClose}
          aria-label="Đóng ảnh"
        >
          <CloseIcon />
        </button>

        {hasMultipleImages && (
          <button
            type="button"
            className="purchase-detail-image-lightbox-nav is-previous"
            onClick={onPrevious}
            aria-label="Ảnh trước"
          >
            <ChevronLeftIcon />
          </button>
        )}

        <img
          src={currentImage}
          alt={`${gallery?.alt || "Ảnh sản phẩm"} ${
            index + 1
          }`}
        />

        {hasMultipleImages && (
          <button
            type="button"
            className="purchase-detail-image-lightbox-nav is-next"
            onClick={onNext}
            aria-label="Ảnh tiếp theo"
          >
            <ChevronRightIcon />
          </button>
        )}

        <div className="purchase-detail-image-lightbox-caption">
          <strong>
            {gallery?.alt || "Ảnh sản phẩm"}
          </strong>
          <span>
            Ảnh {index + 1}/{images.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestDetail;
