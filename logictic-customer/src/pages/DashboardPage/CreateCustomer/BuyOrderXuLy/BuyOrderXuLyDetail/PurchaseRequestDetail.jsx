import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SecurityIcon from "@mui/icons-material/Security";
import AllInboxIcon from "@mui/icons-material/AllInbox";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";

import AuthNotify from "../../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../../utils/timeUtc";

import { getPurchaseRequestDetailApi } from "../../../../../api/OrderApi/purchaseRequestApi";
import { getProductTypesApi } from "../../../../../api/OrderApi/consignmentApi";

import "./PurchaseRequestDetail.css";

/* ================= HELPERS ================= */

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const getApiErrorMessage = (
  error,
  fallbackMessage = "Đã xảy ra lỗi.",
) => {
  const responseData = error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData.trim();
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const safeText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const STATUS_LABELS = {
  PENDING_REVIEW: "Chờ duyệt",
  QUOTED: "Đã báo giá",
  QUOTATION_SENT: "Đã gửi báo giá",
  APPROVED: "Đã duyệt",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn tất",
};

const getStatusLabel = (status) => {
  const normalizedStatus = normalizeStatus(status);

  return (
    STATUS_LABELS[normalizedStatus] ||
    normalizedStatus
      .replaceAll("_", " ")
      .replaceAll("-", " ") ||
    "-"
  );
};

const getStatusClassName = (status) =>
  String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");

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

  return safeText(value, "Chưa cập nhật");
};

const normalizeApiTimeToUtc = (value) =>
  apiToUtcIso(value, {
    apiTimeMode: "utc",
  });

const normalizePurchaseRequestTime = (item) => {
  if (!item) {
    return item;
  }

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(item.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(item.updatedAt),
    submittedAtUtc: normalizeApiTimeToUtc(item.submittedAt),
    approvedAtUtc: normalizeApiTimeToUtc(item.approvedAt),
    rejectedAtUtc: normalizeApiTimeToUtc(item.rejectedAt),
    cancelledAtUtc: normalizeApiTimeToUtc(item.cancelledAt),
    items: Array.isArray(item.items)
      ? item.items.map((product) => ({
          ...product,
          createdAtUtc: normalizeApiTimeToUtc(
            product.createdAt,
          ),
          updatedAtUtc: normalizeApiTimeToUtc(
            product.updatedAt,
          ),
        }))
      : [],
  };
};

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

const formatCurrency = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const getDetailData = (result) =>
  result?.data?.data ??
  result?.data ??
  result ??
  null;

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
      "",
  ).trim();

const getItemProductTypeLabel = (
  item,
  productTypeNameMap,
) => {
  if (
    typeof item?.productType === "string" &&
    item.productType.trim()
  ) {
    return item.productType.trim();
  }

  if (
    item?.productType &&
    typeof item.productType === "object"
  ) {
    const directName = safeText(
      item.productType?.productTypeName ??
        item.productType?.name ??
        item.productType?.label,
      "",
    );

    if (directName) {
      return directName;
    }
  }

  const key = getItemProductTypeKey(item);

  return (
    productTypeNameMap?.get(key) ||
    safeText(
      item?.productTypeName || key,
      "Chưa cập nhật",
    )
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

const getBooleanClassName = (value) =>
  value ? "is-yes" : "is-no";

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

/* ================= COMPONENT ================= */

const PurchaseRequestDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const stateSummary =
    location.state?.purchaseRequest ||
    location.state?.orderSummary ||
    null;

  const requestId =
    params.purchaseRequestId ||
    params.id ||
    stateSummary?.purchaseRequestId ||
    "";

  const [purchaseRequest, setPurchaseRequest] =
    useState(() =>
      normalizePurchaseRequestTime(stateSummary),
    );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [activeGallery, setActiveGallery] =
    useState(null);
  const [productTypes, setProductTypes] =
    useState([]);
  const [productTypesLoading, setProductTypesLoading] =
    useState(false);

  const productTypeNameMap = useMemo(
    () =>
      new Map(
        productTypes
          .map((productType) => [
            getProductTypeId(productType),
            getProductTypeName(productType),
          ])
          .filter(([id]) => Boolean(id)),
      ),
    [productTypes],
  );

  const statusClass = useMemo(
    () =>
      getStatusClassName(
        purchaseRequest?.status,
      ),
    [purchaseRequest?.status],
  );

  const items = useMemo(
    () =>
      Array.isArray(purchaseRequest?.items)
        ? purchaseRequest.items
        : [],
    [purchaseRequest?.items],
  );

  const totalQuantity = useMemo(() => {
    const apiTotal = Number(
      purchaseRequest?.totalQuantity,
    );

    if (Number.isFinite(apiTotal)) {
      return apiTotal;
    }

    return items.reduce(
      (total, item) =>
        total + (Number(item?.quantity) || 0),
      0,
    );
  }, [items, purchaseRequest?.totalQuantity]);

  const totalImages = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + getItemImageUrls(item).length,
        0,
      ),
    [items],
  );

  const serviceOptions = useMemo(
    () => [
      {
        key: "packing",
        label: "Đóng gói lại",
        description:
          "Gia cố và đóng gói lại sản phẩm trước khi vận chuyển.",
        enabled: Boolean(
          purchaseRequest?.requiresPacking,
        ),
        icon: <Inventory2Icon />,
      },
      {
        key: "wooden-crate",
        label: "Đóng thùng gỗ",
        description:
          "Bảo vệ kiện hàng bằng thùng gỗ theo yêu cầu.",
        enabled: Boolean(
          purchaseRequest?.requiresWoodenCrate,
        ),
        icon: <AllInboxIcon />,
      },
      {
        key: "insurance",
        label: "Bảo hiểm hàng hóa",
        description:
          "Áp dụng chính sách bảo hiểm cho đơn mua hộ.",
        enabled: Boolean(
          purchaseRequest?.requiresInsurance,
        ),
        icon: <SecurityIcon />,
      },
    ],
    [
      purchaseRequest?.requiresInsurance,
      purchaseRequest?.requiresPacking,
      purchaseRequest?.requiresWoodenCrate,
    ],
  );

  const loadPurchaseRequestDetail =
    useCallback(
      async (signal) => {
        if (!requestId) {
          setErrorMessage(
            "Không tìm thấy mã yêu cầu mua hộ.",
          );
          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const result =
            await getPurchaseRequestDetailApi(
              requestId,
              { signal },
            );

          const detail = getDetailData(result);

          if (!detail) {
            throw new Error(
              "API không trả về dữ liệu chi tiết yêu cầu mua hộ.",
            );
          }

          setPurchaseRequest(
            normalizePurchaseRequestTime(detail),
          );
        } catch (error) {
          if (isCanceledRequest(error)) {
            return;
          }

          console.error(
            "Lỗi lấy chi tiết yêu cầu mua hộ:",
            error,
          );

          const message = getApiErrorMessage(
            error,
            "Không thể tải chi tiết yêu cầu mua hộ.",
          );

          setErrorMessage(message);
          AuthNotify.error(
            "Không tải được chi tiết",
            message,
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [requestId],
    );

  const loadProductTypes = useCallback(
    async (signal) => {
      try {
        setProductTypesLoading(true);

        const result = await getProductTypesApi({
          signal,
        });

        setProductTypes(
          getProductTypeItems(result),
        );
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        console.error(
          "Lỗi lấy danh mục loại sản phẩm:",
          error,
        );

        setProductTypes([]);
      } finally {
        if (!signal?.aborted) {
          setProductTypesLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    Promise.allSettled([
      loadPurchaseRequestDetail(
        controller.signal,
      ),
      loadProductTypes(controller.signal),
    ]);

    return () => controller.abort();
  }, [
    loadProductTypes,
    loadPurchaseRequestDetail,
  ]);

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
            index:
              (current.index - 1 +
                current.images.length) %
              current.images.length,
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
            index:
              (current.index + 1) %
              current.images.length,
          };
        });
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [activeGallery]);

  const handleRetryLoad = () => {
    const controller = new AbortController();

    Promise.allSettled([
      loadPurchaseRequestDetail(
        controller.signal,
      ),
      loadProductTypes(controller.signal),
    ]);
  };

  const handleCopy = async (
    value,
    label = "Nội dung",
  ) => {
    const text = String(value || "").trim();

    if (!text) {
      AuthNotify.warning(
        "Không thể sao chép",
        `${label} đang trống.`,
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      AuthNotify.success(
        "Đã sao chép",
        `${label} đã được sao chép.`,
      );
    } catch {
      AuthNotify.error(
        "Sao chép thất bại",
        "Trình duyệt không cho phép sao chép tự động.",
      );
    }
  };

  const handleOpenGallery = (
    images,
    index,
    alt,
  ) => {
    if (!Array.isArray(images) || !images.length) {
      return;
    }

    setActiveGallery({
      images,
      index,
      alt,
    });
  };

  if (loading && !purchaseRequest) {
    return (
      <div className="purchase-detail-page">
        <div className="purchase-detail-loading">
          <CircularProgress size={42} />
          <span>
            Đang tải chi tiết yêu cầu mua hộ...
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage && !purchaseRequest) {
    return (
      <div className="purchase-detail-page">
        <div className="purchase-detail-error-card">
          <div className="purchase-detail-error-icon">
            ⚠️
          </div>

          <h2>Không tải được dữ liệu</h2>
          <p>{errorMessage}</p>

          <div className="purchase-detail-error-actions">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              className="purchase-detail-back-button"
            >
              Quay lại
            </Button>

            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRetryLoad}
              className="purchase-detail-primary-button"
            >
              Tải lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseRequest) {
    return null;
  }

  const quotation = purchaseRequest.quotation;

  return (
    <div className="purchase-detail-page">
      <div className="purchase-detail-top-actions">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          className="purchase-detail-back-button"
        >
          Quay lại
        </Button>

        {loading && (
          <span className="purchase-detail-refreshing">
            <CircularProgress size={15} />
            Đang cập nhật dữ liệu...
          </span>
        )}
      </div>

      <section className="purchase-detail-hero">
        <div className="purchase-detail-hero-left">
          <div className="purchase-detail-hero-icon">
            <ShoppingCartIcon />
          </div>

          <div className="purchase-detail-hero-copy">
            <div className="purchase-detail-kicker">
              Chi tiết yêu cầu mua hộ
            </div>

            <h1>
              {safeText(
                purchaseRequest.purchaseCode,
                "Yêu cầu mua hộ",
              )}
            </h1>
          </div>
        </div>

        <div className="purchase-detail-hero-right">
          <span
            className={`purchase-detail-status purchase-detail-status-${statusClass}`}
          >
            {getStatusLabel(
              purchaseRequest.status,
            )}
          </span>

          <Tooltip title="Sao chép mã yêu cầu">
            <button
              type="button"
              className="purchase-detail-copy-icon-button"
              onClick={() =>
                handleCopy(
                  purchaseRequest.purchaseCode,
                  "Mã yêu cầu",
                )
              }
            >
              <ContentCopyIcon />
            </button>
          </Tooltip>
        </div>
      </section>

      <section className="purchase-detail-summary-grid">
        <SummaryCard
          label="Dòng sản phẩm"
          value={formatNumber(items.length)}
          description="Số mặt hàng trong yêu cầu"
          icon={<ShoppingCartIcon />}
        />

        <SummaryCard
          label="Tổng số lượng"
          value={formatNumber(totalQuantity)}
          description="Tổng sản phẩm khách cần mua"
          icon={<Inventory2Icon />}
        />

        <SummaryCard
          label="Ảnh sản phẩm"
          value={formatNumber(totalImages)}
          description="Tổng ảnh tham khảo đã gửi"
          icon={<PhotoLibraryIcon />}
        />

        <SummaryCard
          label="Phương thức"
          value={getShippingOptionLabel(
            purchaseRequest.shippingOption,
          )}
          description="Phương thức vận chuyển đã chọn"
          icon={<LocalShippingIcon />}
          compact
        />

        <SummaryCard
          label="Ngày tạo"
          value={formatDateTime(
            purchaseRequest.createdAtUtc ||
              purchaseRequest.createdAt,
          )}
          description="Thời điểm gửi yêu cầu"
          icon={<ReceiptLongIcon />}
          compact
          title={formatDateTimeUtcTitle(
            purchaseRequest.createdAtUtc ||
              purchaseRequest.createdAt,
          )}
        />
      </section>

      <section className="purchase-detail-info-grid">
        <div className="purchase-detail-panel">
          <div className="purchase-detail-panel-title">
            <PersonIcon />
            <h2>Thông tin khách hàng</h2>
          </div>

          <div className="purchase-detail-info-list">
            <InfoRow
              label="Khách hàng"
              value={purchaseRequest.customerName}
            />

            <InfoRow
              label="Người tạo yêu cầu"
              value={purchaseRequest.createdByName}
            />
          </div>
        </div>

        <div className="purchase-detail-panel">
          <div className="purchase-detail-panel-title">
            <LocalShippingIcon />
            <h2>Thông tin nhận hàng</h2>
          </div>

          <div className="purchase-detail-info-list">
            <InfoRow
              label="Người nhận"
              value={purchaseRequest.receiverName}
            />

            <InfoRow
              label="Số điện thoại"
              value={purchaseRequest.receiverPhone}
              copyable
              onCopy={handleCopy}
            />

            <InfoRow
              label="Địa chỉ"
              value={purchaseRequest.receiverAddress}
            />

            <InfoRow
              label="Tuyến hàng"
              value={purchaseRequest.route}
              accent
            />

            <InfoRow
              label="Vận chuyển"
              value={getShippingOptionLabel(
                purchaseRequest.shippingOption,
              )}
            />
          </div>
        </div>

        <div className="purchase-detail-panel purchase-detail-services-panel">
          <div className="purchase-detail-panel-title">
            <SecurityIcon />
            <h2>Dịch vụ bổ sung</h2>
          </div>

          <div className="purchase-detail-services-grid">
            {serviceOptions.map((service) => (
              <ServiceCard
                key={service.key}
                {...service}
              />
            ))}
          </div>
        </div>

        <div className="purchase-detail-panel">
          <div className="purchase-detail-panel-title">
            <ReceiptLongIcon />
            <h2>Trạng thái xử lý</h2>
          </div>

          <div className="purchase-detail-info-list">
            <InfoRow
              label="Trạng thái yêu cầu"
              value={getStatusLabel(
                purchaseRequest.status,
              )}
              accent
            />

            <InfoRow
              label="Báo giá"
              value={
                quotation
                  ? "Đã có báo giá"
                  : "Chưa có báo giá"
              }
            />

            {quotation?.totalEstimatedCost !==
              undefined && (
              <InfoRow
                label="Tổng báo giá"
                value={formatCurrency(
                  quotation.totalEstimatedCost,
                )}
              />
            )}

            <InfoRow
              label="Lý do xử lý"
              value={safeText(
                purchaseRequest.reason,
                "Không có lý do bổ sung",
              )}
            />
          </div>

          <div className="purchase-detail-note-box purchase-detail-note-box--spaced">
            <span>Ghi chú chung</span>
            <p>
              {purchaseRequest.generalNote?.trim()
                ? purchaseRequest.generalNote
                : "Không có ghi chú chung."}
            </p>
          </div>
        </div>
      </section>

      <section className="purchase-detail-products-section">
        <div className="purchase-detail-section-header">
          <div>
            <h2>Danh sách sản phẩm mua hộ</h2>

            <p>
              Hiển thị đầy đủ link, website nguồn,
              loại sản phẩm, số lượng, thuộc tính,
              ghi chú và toàn bộ ảnh tham khảo.
            </p>
          </div>

          <span>
            {formatNumber(items.length)} sản phẩm
          </span>
        </div>

        {items.length === 0 ? (
          <div className="purchase-detail-empty-items">
            Chưa có sản phẩm trong yêu cầu này.
          </div>
        ) : (
          <div className="purchase-detail-product-list">
            {items.map((item, index) => (
              <ProductItemCard
                key={item.itemId || index}
                item={item}
                index={index}
                onCopy={handleCopy}
                onOpenGallery={handleOpenGallery}
                productTypeNameMap={
                  productTypeNameMap
                }
                productTypesLoading={
                  productTypesLoading
                }
              />
            ))}
          </div>
        )}
      </section>

      {activeGallery && (
        <ImageLightbox
          gallery={activeGallery}
          onClose={() =>
            setActiveGallery(null)
          }
          onPrevious={() =>
            setActiveGallery((current) => ({
              ...current,
              index:
                (current.index - 1 +
                  current.images.length) %
                current.images.length,
            }))
          }
          onNext={() =>
            setActiveGallery((current) => ({
              ...current,
              index:
                (current.index + 1) %
                current.images.length,
            }))
          }
        />
      )}
    </div>
  );
};

/* ================= CHILD COMPONENTS ================= */

const SummaryCard = ({
  label,
  value,
  description,
  icon,
  compact = false,
  title = "",
}) => (
  <article
    className={`purchase-detail-summary-card ${
      compact ? "is-compact" : ""
    }`}
  >
    <span className="purchase-detail-summary-icon">
      {icon}
    </span>

    <div>
      <small>{label}</small>
      <strong title={title || undefined}>
        {value}
      </strong>
      <p>{description}</p>
    </div>
  </article>
);

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

  const activeImageUrl =
    imageUrls[selectedImageIndex] ||
    imageUrls[0] ||
    "";

  useEffect(() => {
    if (selectedImageIndex >= imageUrls.length) {
      setSelectedImageIndex(0);
    }
  }, [imageUrls.length, selectedImageIndex]);

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
                  selectedImageIndex,
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
                {selectedImageIndex + 1}/
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
                  imageIndex === selectedImageIndex
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
