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
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Inventory2Icon from "@mui/icons-material/Inventory2";

import AuthNotify from "../../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../../utils/timeUtc";

import {
  
  getPurchaseRequestDetailApi,
} from "../../../../../api/OrderApi/purchaseRequestApi";
import {getProductTypesApi} from "../../../../../api/OrderApi/consignmentApi"

import "./PurchaseRequestDetail.css";

/* ================= HELPERS ================= */

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  const responseData = error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

const getStatusLabel = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (normalizedStatus === "PENDING_REVIEW") {
    return "Chờ duyệt";
  }

  if (normalizedStatus === "QUOTED") {
    return "Đã báo giá";
  }

  if (normalizedStatus === "APPROVED") {
    return "Đã duyệt";
  }

  if (normalizedStatus === "REJECTED") {
    return "Từ chối";
  }

  if (normalizedStatus === "CANCELLED") {
    return "Đã hủy";
  }

  return (
    normalizedStatus
      .replaceAll("_", " ")
      .replaceAll("-", " ") || "-"
  );
};

const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

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
          createdAtUtc: normalizeApiTimeToUtc(product.createdAt),
          updatedAtUtc: normalizeApiTimeToUtc(product.updatedAt),
        }))
      : item.items,
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

const safeText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();

  return text || fallback;
};

const getDetailData = (result) => {
  return result?.data ?? result ?? null;
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

const getProductTypeId = (productType) => {
  return String(
    productType?.productTypeId ??
      productType?.id ??
      productType?.code ??
      productType?.value ??
      ""
  ).trim();
};

const getProductTypeName = (productType) => {
  return safeText(
    productType?.productTypeName ??
      productType?.name ??
      productType?.label ??
      productType?.description,
    getProductTypeId(productType) || "Chưa cập nhật"
  );
};

const getItemProductTypeKey = (item) => {
  return String(
    item?.productTypeId ??
      item?.productType?.productTypeId ??
      item?.productType?.id ??
      item?.productType?.value ??
      item?.productType ??
      item?.productTypeCode ??
      ""
  ).trim();
};

const getBooleanLabel = (value) => {
  return value ? "Có" : "Không";
};

const getBooleanClassName = (value) => {
  return value ? "is-yes" : "is-no";
};

const openExternalLink = (url) => {
  const link = String(url || "").trim();

  if (!link) {
    return;
  }

  window.open(
    link,
    "_blank",
    "noopener,noreferrer"
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

  const [
    purchaseRequest,
    setPurchaseRequest,
  ] = useState(() =>
    normalizePurchaseRequestTime(stateSummary)
  );

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [activeImage, setActiveImage] =
    useState(null);

  const [productTypes, setProductTypes] =
    useState([]);

  const [productTypesLoading, setProductTypesLoading] =
    useState(false);

  const productTypeNameMap = useMemo(() => {
    return new Map(
      productTypes
        .map((productType) => [
          getProductTypeId(productType),
          getProductTypeName(productType),
        ])
        .filter(([id]) => Boolean(id))
    );
  }, [productTypes]);

  const statusClass = useMemo(() => {
    return getStatusClassName(
      purchaseRequest?.status
    );
  }, [purchaseRequest?.status]);

  const items = useMemo(() => {
    return Array.isArray(purchaseRequest?.items)
      ? purchaseRequest.items
      : [];
  }, [purchaseRequest]);

  const loadPurchaseRequestDetail =
    useCallback(
      async (signal) => {
        if (!requestId) {
          setErrorMessage(
            "Không tìm thấy mã yêu cầu mua hộ."
          );
          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const result =
            await getPurchaseRequestDetailApi(
              requestId,
              {
                signal,
              }
            );

          const detail = getDetailData(result);

          if (!detail) {
            throw new Error(
              "API không trả về dữ liệu chi tiết yêu cầu mua hộ."
            );
          }

          setPurchaseRequest(
            normalizePurchaseRequestTime(detail)
          );
        } catch (error) {
          if (isCanceledRequest(error)) {
            return;
          }

          console.error(
            "Lỗi lấy chi tiết yêu cầu mua hộ:",
            error
          );

          const message =
            getApiErrorMessage(
              error,
              "Không thể tải chi tiết yêu cầu mua hộ."
            );

          setErrorMessage(message);

          AuthNotify.error(
            "Không tải được chi tiết",
            message
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [requestId]
    );

  const loadProductTypes = useCallback(
    async (signal) => {
      try {
        setProductTypesLoading(true);

        const result = await getProductTypesApi({
          signal,
        });

        const productTypeItems =
          getProductTypeItems(result);

        setProductTypes(productTypeItems);
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        console.error(
          "Lỗi lấy danh mục loại sản phẩm:",
          error
        );

        setProductTypes([]);

        AuthNotify.warning(
          "Không tải được loại sản phẩm",
          getApiErrorMessage(
            error,
            "Hệ thống sẽ tạm hiển thị mã loại sản phẩm."
          )
        );
      } finally {
        if (!signal?.aborted) {
          setProductTypesLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller =
      new AbortController();

    Promise.allSettled([
      loadPurchaseRequestDetail(
        controller.signal
      ),
      loadProductTypes(
        controller.signal
      ),
    ]);

    return () => {
      controller.abort();
    };
  }, [
    loadProductTypes,
    loadPurchaseRequestDetail,
  ]);

  useEffect(() => {
    if (!activeImage) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveImage(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [activeImage]);

  const handleRetryLoad = () => {
    const controller =
      new AbortController();

    Promise.allSettled([
      loadPurchaseRequestDetail(
        controller.signal
      ),
      loadProductTypes(
        controller.signal
      ),
    ]);
  };

  const handleCopy = async (
    value,
    label = "Nội dung"
  ) => {
    const text = String(value || "").trim();

    if (!text) {
      AuthNotify.warning(
        "Không thể sao chép",
        `${label} đang trống.`
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      AuthNotify.success(
        "Đã sao chép",
        `${label} đã được sao chép.`
      );
    } catch {
      AuthNotify.error(
        "Sao chép thất bại",
        "Trình duyệt không cho phép sao chép tự động."
      );
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenImage = (imageData) => {
    if (!imageData?.src) {
      return;
    }

    setActiveImage(imageData);
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
              onClick={handleBack}
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

  return (
    <div className="purchase-detail-page">
      <div className="purchase-detail-top-actions">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          className="purchase-detail-back-button"
        >
          Quay lại
        </Button>
      </div>

      <section className="purchase-detail-hero">
        <div className="purchase-detail-hero-left">
          <div className="purchase-detail-hero-icon">
            <ShoppingCartIcon />
          </div>

          <div>
            <div className="purchase-detail-kicker">
              Chi tiết yêu cầu mua hộ
            </div>

            <h1>
              {safeText(
                purchaseRequest.purchaseCode,
                "Yêu cầu mua hộ"
              )}
            </h1>

            <p>
              Mã yêu cầu:{" "}
              <strong>
                {safeText(
                  purchaseRequest.purchaseRequestId
                )}
              </strong>
            </p>
          </div>
        </div>

        <div className="purchase-detail-hero-right">
          <span
            className={`purchase-detail-status purchase-detail-status-${statusClass}`}
          >
            {getStatusLabel(
              purchaseRequest.status
            )}
          </span>

          <Tooltip title="Sao chép mã yêu cầu">
            <button
              type="button"
              className="purchase-detail-copy-icon-button"
              onClick={() =>
                handleCopy(
                  purchaseRequest.purchaseCode,
                  "Mã yêu cầu"
                )
              }
            >
              <ContentCopyIcon />
            </button>
          </Tooltip>
        </div>
      </section>

      <section className="purchase-detail-summary-grid">
        <div className="purchase-detail-summary-card">
          <span>Tổng sản phẩm</span>

          <strong>
            {items.length}
          </strong>

          <p>Số dòng sản phẩm trong yêu cầu</p>
        </div>

        <div className="purchase-detail-summary-card">
          <span>Tổng số lượng</span>

          <strong>
            {purchaseRequest.totalQuantity ?? 0}
          </strong>

          <p>Tổng số lượng khách cần mua</p>
        </div>

        <div className="purchase-detail-summary-card">
          <span>Ngày tạo</span>

          <strong
            className="date-text"
            title={formatDateTimeUtcTitle(
              purchaseRequest.createdAtUtc ||
                purchaseRequest.createdAt
            )}
          >
            {formatDateTime(
              purchaseRequest.createdAtUtc ||
                purchaseRequest.createdAt
            )}
          </strong>

          <p>Thời điểm gửi yêu cầu</p>
        </div>

        <div className="purchase-detail-summary-card">
          <span>Tuyến hàng</span>

          <strong className="route-text">
            {safeText(purchaseRequest.route)}
          </strong>

          <p>Tuyến vận chuyển đã chọn</p>
        </div>
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
              label="Người tạo"
              value={purchaseRequest.createdByName}
            />

            <InfoRow
              label="Customer ID"
              value={purchaseRequest.customerId}
              copyable
              onCopy={handleCopy}
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
          </div>
        </div>

        <div className="purchase-detail-panel">
          <div className="purchase-detail-panel-title">
            <FactCheckIcon />
            <h2>Dịch vụ kiểm tra</h2>
          </div>

          <div className="purchase-detail-check-grid">
            <div
              className={`purchase-detail-check-item ${getBooleanClassName(
                purchaseRequest.requiresInspection
              )}`}
            >
              <span>Kiểm hàng</span>

              <strong>
                {getBooleanLabel(
                  purchaseRequest.requiresInspection
                )}
              </strong>

              <small>
                Kiểm tra tình trạng sản phẩm khi về kho
              </small>
            </div>

            <div
              className={`purchase-detail-check-item ${getBooleanClassName(
                purchaseRequest.requiresQuantityCheck
              )}`}
            >
              <span>Kiểm số lượng</span>

              <strong>
                {getBooleanLabel(
                  purchaseRequest.requiresQuantityCheck
                )}
              </strong>

              <small>
                Đối chiếu số lượng sản phẩm thực nhận
              </small>
            </div>
          </div>
        </div>

        <div className="purchase-detail-panel">
          <div className="purchase-detail-panel-title">
            <Inventory2Icon />
            <h2>Ghi chú chung</h2>
          </div>

          <div className="purchase-detail-note-box">
            {purchaseRequest.generalNote?.trim()
              ? purchaseRequest.generalNote
              : "Không có ghi chú chung."}
          </div>
        </div>
      </section>

      <section className="purchase-detail-products-section">
        <div className="purchase-detail-section-header">
          <div>
            <h2>Danh sách sản phẩm mua hộ</h2>

            <p>
              Hiển thị đầy đủ link sản phẩm, website nguồn,
              phân loại, số lượng, ghi chú và ảnh tham khảo.
            </p>
          </div>

          <span>
            {items.length} sản phẩm
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
                onOpenImage={handleOpenImage}
                productTypeNameMap={productTypeNameMap}
                productTypesLoading={productTypesLoading}
              />
            ))}
          </div>
        )}
      </section>

      {activeImage && (
        <ImageLightbox
          image={activeImage}
          onClose={() => setActiveImage(null)}
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

const ProductItemCard = ({
  item,
  index,
  onCopy,
  onOpenImage,
  productTypeNameMap,
  productTypesLoading,
}) => {
  const productLink =
    String(item.productLink || "").trim();

  const imageAlt =
    item.productName ||
    `Sản phẩm ${index + 1}`;

  const productTypeKey =
    getItemProductTypeKey(item);

  const directProductTypeName =
    typeof item?.productType === "object"
      ? safeText(
          item.productType?.productTypeName ??
            item.productType?.name ??
            item.productType?.label,
          ""
        )
      : safeText(
          item?.productTypeName,
          ""
        );

  const productTypeLabel =
    directProductTypeName ||
    productTypeNameMap?.get(productTypeKey) ||
    safeText(productTypeKey, "Chưa cập nhật");

  return (
    <article className="purchase-detail-product-card">
      <div className="purchase-detail-product-image-wrap">
        {item.imageUrl ? (
          <button
            type="button"
            className="purchase-detail-product-image-button"
            onClick={() =>
              onOpenImage?.({
                src: item.imageUrl,
                alt: imageAlt,
              })
            }
            aria-label={`Xem ảnh ${imageAlt}`}
          >
            <img
              src={item.imageUrl}
              alt={imageAlt}
              className="purchase-detail-product-image"
            />

            <span className="purchase-detail-image-view-hint">
              Bấm để xem ảnh
            </span>
          </button>
        ) : (
          <div className="purchase-detail-image-placeholder">
            Không có ảnh
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
                item.productName,
                `Sản phẩm ${index + 1}`
              )}
            </h3>
          </div>

          <span className="purchase-detail-product-quantity">
            SL: {item.quantity ?? 0}
          </span>
        </div>

        <div className="purchase-detail-product-meta-grid">
          <InfoRow
            label="Website nguồn"
            value={item.sourceWebsite}
          />

          <InfoRow
            label="Loại sản phẩm"
            value={
              productTypesLoading
                ? "Đang tải tên loại sản phẩm..."
                : productTypeLabel
            }
            loading={productTypesLoading}
            accent
            copyable
            onCopy={onCopy}
          />

          <InfoRow
            label="Phân loại"
            value={item.attributes}
          />

          <InfoRow
            label="Ghi chú"
            value={
              item.note?.trim()
                ? item.note
                : "Không có ghi chú"
            }
          />
        </div>

        <div className="purchase-detail-product-link-box">
          <span>Link sản phẩm</span>

          <div>
            <a
              href={productLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (!productLink) {
                  event.preventDefault();
                }
              }}
            >
              {productLink || "Không có link sản phẩm"}
            </a>

            {productLink && (
              <>
                <button
                  type="button"
                  title="Sao chép link"
                  aria-label="Sao chép link sản phẩm"
                  onClick={() =>
                    onCopy?.(
                      productLink,
                      "Link sản phẩm"
                    )
                  }
                >
                  <ContentCopyIcon />
                </button>

                <button
                  type="button"
                  title="Mở link"
                  aria-label="Mở link sản phẩm"
                  onClick={() =>
                    openExternalLink(productLink)
                  }
                >
                  <OpenInNewIcon />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const ImageLightbox = ({
  image,
  onClose,
}) => {
  return (
    <div
      className="purchase-detail-image-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
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
          ×
        </button>

        <img
          src={image.src}
          alt={image.alt || "Ảnh sản phẩm"}
        />

        <div className="purchase-detail-image-lightbox-caption">
          {image.alt || "Ảnh sản phẩm"}
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestDetail;