import {
  useMemo,
  useState,
} from "react";

import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LinkOutlined,
  LoadingOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

import "./ConsignmentBuyOrderConfirm.css";

const SERVICE_CODE_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  WOOD_BOX: "Đóng thùng gỗ",
  PACKING: "Đóng gói hàng hóa",
  CARTON_REPACK: "Phí đóng lại kiện carton",
  SUR_PACKING: "Phụ phí đóng gói",
  SUR_INSURANCE_3PERCENT: "Bảo hiểm hàng hóa",
  INSURANCE: "Bảo hiểm hàng hóa",
  VAT: "Thuế VAT",
  IMPORT_TAX: "Thuế nhập khẩu",
  TAX: "Thuế",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  LOCAL_FREIGHT_TEMP: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  INSPECTION: "Kiểm đếm hàng hóa",
};

const getOptionLabel = (options = [], value) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "Chưa cập nhật";
  }

  return (
    options.find(
      (option) =>
        String(option?.value ?? "") === normalizedValue,
    )?.label || normalizedValue
  );
};

const getDisplayText = (
  value,
  fallback = "Không có",
) => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const formatNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("vi-VN")
    : "0";
};

const formatMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
};

const getReceiverAddress = (form) =>
  getDisplayText(
    form?.selectedDeliveryAddress ||
    form?.receiverAddress ||
    form?.deliveryAddress ||
    form?.address,
    "Chưa cập nhật",
  );

const getProductTypeValue = (item) =>
  item?.productType ??
  item?.productTypeId ??
  item?.productTypeCode;

const getOptionalServices = (form) =>
  form?.optionalServices &&
  typeof form.optionalServices === "object"
    ? form.optionalServices
    : form || {};

const getImageUrlFromEntry = (entry) => {
  if (typeof entry === "string") {
    return entry.trim();
  }

  return String(
    entry?.previewUrl ||
    entry?.url ||
    entry?.imageUrl ||
    entry?.fileUrl ||
    entry?.secureUrl ||
    entry?.path ||
    "",
  ).trim();
};

const getImagePreviewUrls = (item) => {
  const candidates = [
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.imageUrls)
      ? item.imageUrls
      : []),
    item?.image,
    item?.imageUrl,
  ];

  return Array.from(
    new Set(
      candidates
        .map(getImageUrlFromEntry)
        .filter(Boolean),
    ),
  );
};

const getShortProductLink = (value) => {
  const fullLink = String(value || "").trim();

  if (!fullLink) {
    return "";
  }

  try {
    const url = new URL(fullLink);
    const host = url.hostname.replace(/^www\./, "");
    let rawPath = `${url.pathname}${url.search}`;
    let path = rawPath;

    try {
      path = decodeURIComponent(rawPath);
    } catch {
      path = rawPath;
    }

    if (!path || path === "/") {
      return host;
    }

    const compactPath =
      path.length > 50
        ? `${path.slice(0, 47)}...`
        : path;

    return `${host}${compactPath}`;
  } catch {
    let text = fullLink;
    try {
      text = decodeURIComponent(fullLink);
    } catch {
      text = fullLink;
    }

    return text.length > 60
      ? `${text.slice(0, 57)}...`
      : text;
  }
};

const getServiceLabel = (code) => {
  const normalizedCode = normalizeCode(code);

  if (SERVICE_CODE_LABELS[normalizedCode]) {
    return SERVICE_CODE_LABELS[normalizedCode];
  }

  return normalizedCode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) =>
      character.toUpperCase(),
    );
};

const getServiceMeta = (code) => {
  const normalized = normalizeCode(code);

  if (normalized.includes("WOOD")) {
    return {
      themeClass: "is-amber",
      icon: <CheckOutlined />,
      defaultDescription: "Đóng gói thùng gỗ gia cố chuyên dụng bảo vệ hàng hóa cồng kềnh/dễ vỡ.",
    };
  }

  if (normalized.includes("INSURANCE")) {
    return {
      themeClass: "is-violet",
      icon: <SafetyCertificateOutlined />,
      defaultDescription: "Đơn hàng có đăng ký gói bảo hiểm bảo vệ 100% giá trị.",
    };
  }

  if (normalized.includes("PACKING") || normalized.includes("CARTON") || normalized.includes("REPACK")) {
    return {
      themeClass: "is-emerald",
      icon: <CheckOutlined />,
      defaultDescription: "Bọc màng co và gia cố thùng carton tiêu chuẩn xuất khẩu.",
    };
  }

  if (normalized.includes("INSPECTION")) {
    return {
      themeClass: "is-sapphire",
      icon: <CheckOutlined />,
      defaultDescription: "Kiểm đếm chi tiết số lượng, phân loại thuộc tính và đính kèm ảnh đối soát.",
    };
  }

  return {
    themeClass: "is-sapphire",
    icon: <CheckOutlined />,
    defaultDescription: "Dịch vụ bổ sung theo chính sách mua hộ.",
  };
};

const ConfirmStatus = ({
  code,
  title,
  description,
  badgeText,
}) => {
  const meta = getServiceMeta(code);
  const displayDesc = description || meta.defaultDescription;

  return (
    <div className={`purchase-buy-confirm-service-card ${meta.themeClass}`}>
      <div className="service-card-left">
        <div className="service-icon-badge">
          {meta.icon}
        </div>
        <div className="service-card-info">
          <div className="service-card-title-row">
            <strong>{title}</strong>
            {badgeText && <span className="service-card-badge">{badgeText}</span>}
          </div>
          <p>{displayDesc}</p>
        </div>
      </div>
    </div>
  );
};

export default function ConsignmentBuyOrderConfirm({
  form,
  items = [],
  routeOptions = [],
  shippingOptions = [],
  productTypeOptions = [],
  isSubmitting = false,
  submitMessage = "",
  onBack,
  onConfirm,
}) {
  const [lightbox, setLightbox] = useState({
    images: [],
    index: 0,
    title: "",
  });

  const routeLabel = useMemo(
    () =>
      getOptionLabel(
        routeOptions,
        form?.route,
      ),
    [routeOptions, form?.route],
  );

  const shippingOptionLabel = useMemo(
    () =>
      getOptionLabel(
        shippingOptions,
        form?.shippingOption,
      ),
    [
      shippingOptions,
      form?.shippingOption,
    ],
  );

  const totalQuantity = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          (Number(item?.quantity) || 0),
        0,
      ),
    [items],
  );

  const totalImages = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          getImagePreviewUrls(item).length,
        0,
      ),
    [items],
  );

  const optionalServices =
    getOptionalServices(form);

  const selectedRuleCodes = useMemo(
    () =>
      normalizeStringArray(
        optionalServices?.selectedRuleCodes ??
        optionalServices?.selectedPricingRuleCodes ??
        optionalServices?.pricingRuleCodes,
      ),
    [optionalServices],
  );

  const requiresPacking = Boolean(
    optionalServices?.requiresPacking ??
    form?.requiresPacking,
  );

  const requiresWoodenCrate = Boolean(
    optionalServices?.requiresWoodenCrate ??
    form?.requiresWoodenCrate,
  );

  const requiresInsurance = Boolean(
    optionalServices?.requiresInsurance ??
    form?.requiresInsurance,
  );

  const woodCratePackageCount =
    Number(
      optionalServices?.woodCratePackageCount ??
      optionalServices?.woodCrateQuantity,
    ) ||
    (requiresWoodenCrate ? items.length : 0);

  const woodCrateTotalFee = Number(
    optionalServices?.woodCrateTotalFee,
  );

  const lightboxVisible =
    lightbox.images.length > 0;

  const currentLightboxImage =
    lightbox.images[lightbox.index] || "";

  const openLightbox = (
    images,
    index,
    title,
  ) => {
    if (!images.length) {
      return;
    }

    setLightbox({
      images,
      index,
      title,
    });
  };

  const closeLightbox = () => {
    setLightbox({
      images: [],
      index: 0,
      title: "",
    });
  };

  const showPreviousImage = (event) => {
    event.stopPropagation();

    setLightbox((current) => ({
      ...current,
      index:
        current.index <= 0
          ? current.images.length - 1
          : current.index - 1,
    }));
  };

  const showNextImage = (event) => {
    event.stopPropagation();

    setLightbox((current) => ({
      ...current,
      index:
        current.index >=
          current.images.length - 1
          ? 0
          : current.index + 1,
    }));
  };

  const handleConfirm = () => {
    if (
      isSubmitting ||
      typeof onConfirm !== "function"
    ) {
      return;
    }

    onConfirm();
  };

  return (
    <div className="purchase-buy-confirm-page">
      <div className="purchase-buy-confirm-shell">
        <section className="purchase-buy-confirm-hero">
          <div className="purchase-buy-confirm-hero-icon">
            <ShoppingCartOutlined />
          </div>

          <div className="purchase-buy-confirm-hero-content">
            <span>BƯỚC XÁC NHẬN CUỐI CÙNG</span>

            <h1>Xem lại yêu cầu mua hộ</h1>

            <p>
              Kiểm tra đầy đủ tuyến hàng, người nhận,
              dịch vụ, hình ảnh và thông tin từng sản
              phẩm trước khi gửi yêu cầu đến Việt Nam Logistics
            </p>
          </div>

          <div className="purchase-buy-confirm-ready-badge">
            <CheckCircleOutlined />
            Sẵn sàng gửi
          </div>
        </section>

        <section className="purchase-buy-confirm-summary-grid">
          <div className="summary-metric-card">
            <span>
              <EnvironmentOutlined />
            </span>

            <small>Tuyến vận chuyển</small>
            <strong>{routeLabel}</strong>
          </div>

          <div className="summary-metric-card">
            <span>
              <GlobalOutlined />
            </span>

            <small>Phương thức</small>
            <strong>{shippingOptionLabel}</strong>
          </div>

          <div className="summary-metric-card">
            <span>
              <ShoppingCartOutlined />
            </span>

            <small>Dòng sản phẩm</small>
            <strong>
              {formatNumber(items.length)} mặt hàng
            </strong>
          </div>

          <div className="summary-metric-card">
            <span>
              <CheckOutlined />
            </span>

            <small>Tổng số lượng</small>
            <strong>
              {formatNumber(totalQuantity)} sản phẩm
            </strong>
          </div>
        </section>

        <div className="purchase-buy-confirm-main-grid">
          <div className="purchase-buy-confirm-content-column">
            <section className="purchase-buy-confirm-card">
              <div className="purchase-buy-confirm-card-header">
                <span className="purchase-buy-confirm-card-icon">
                  <EnvironmentOutlined />
                </span>

                <div>
                  <h2>Thông tin nhận hàng</h2>
                  <p>
                    Thông tin người nhận tại Việt Nam.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-info-grid">
                <div className="purchase-buy-confirm-info-item">
                  <span className="purchase-buy-confirm-info-label">
                    <EnvironmentOutlined />
                    Người nhận
                  </span>

                  <strong>
                    {getDisplayText(
                      form?.receiverName,
                      "Chưa cập nhật",
                    )}
                  </strong>
                </div>

                <div className="purchase-buy-confirm-info-item">
                  <span className="purchase-buy-confirm-info-label">
                    <PhoneOutlined />
                    Số điện thoại
                  </span>

                  <strong>
                    {getDisplayText(
                      form?.receiverPhone,
                      "Chưa cập nhật",
                    )}
                  </strong>
                </div>

                <div className="purchase-buy-confirm-info-item">
                  <span className="purchase-buy-confirm-info-label">
                    <GlobalOutlined />
                    Phương thức vận chuyển
                  </span>

                  <strong>
                    {shippingOptionLabel}
                  </strong>
                </div>

                <div className="purchase-buy-confirm-info-item is-full-width">
                  <span className="purchase-buy-confirm-info-label">
                    <HomeOutlined />
                    Địa chỉ nhận hàng
                  </span>

                  <strong>
                    {getReceiverAddress(form)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="purchase-buy-confirm-card">
              <div className="purchase-buy-confirm-card-header">
                <span className="purchase-buy-confirm-card-icon is-orange">
                  <ShoppingCartOutlined />
                </span>

                <div>
                  <h2>Danh sách sản phẩm</h2>
                  <p>
                    {formatNumber(items.length)} mặt hàng,
                    tổng {formatNumber(totalQuantity)} sản
                    phẩm và {formatNumber(totalImages)} hình
                    ảnh.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-product-list">
                {items.map((item, index) => {
                  const imageUrls =
                    getImagePreviewUrls(item);

                  const productTypeLabel =
                    getOptionLabel(
                      productTypeOptions,
                      getProductTypeValue(item),
                    );

                  const fullProductLink =
                    String(
                      item?.productLink || "",
                    ).trim();

                  const shortProductLink =
                    getShortProductLink(
                      fullProductLink,
                    );

                  const productTitle =
                    getDisplayText(
                      item?.productName,
                      `Sản phẩm ${index + 1}`,
                    );

                  return (
                    <article
                      key={
                        item?.id ||
                        `${item?.productName}-${index}`
                      }
                      className="purchase-buy-confirm-product-card"
                    >
                      <div className="purchase-buy-confirm-product-topline">
                        <span className="purchase-buy-confirm-product-number">
                          {index + 1}
                        </span>

                        <div className="purchase-buy-confirm-product-heading">
                          <div>
                            <span>
                              Sản phẩm {index + 1}
                            </span>

                            <h3>{productTitle}</h3>
                          </div>

                          <strong className="purchase-buy-confirm-quantity">
                            SL:{" "}
                            {formatNumber(
                              item?.quantity,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        className={[
                          "purchase-buy-confirm-product-body",
                          imageUrls.length === 0 &&
                          "has-no-image",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div
                          className={[
                            "purchase-buy-confirm-product-gallery",
                            imageUrls.length === 1 &&
                            "is-single",
                            imageUrls.length === 2 &&
                            "is-double",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {imageUrls.length ? (
                            imageUrls.map(
                              (imageUrl, imageIndex) => (
                                <button
                                  key={`${imageUrl}-${imageIndex}`}
                                  type="button"
                                  className="purchase-buy-confirm-product-image"
                                  onClick={() =>
                                    openLightbox(
                                      imageUrls,
                                      imageIndex,
                                      productTitle,
                                    )
                                  }
                                  aria-label={`Xem ảnh ${imageIndex + 1
                                    } của ${productTitle}`}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`${productTitle} - ảnh ${imageIndex + 1
                                      }`}
                                  />

                                  <span className="purchase-buy-confirm-product-image-index">
                                    {imageIndex + 1}/
                                    {imageUrls.length}
                                  </span>
                                </button>
                              ),
                            )
                          ) : (
                            <div className="purchase-buy-confirm-product-image-empty">
                              <ShoppingCartOutlined />
                              <span>Chưa có ảnh</span>
                            </div>
                          )}
                        </div>

                        <div className="purchase-buy-confirm-product-content">
                          <div className="purchase-buy-confirm-product-tags">
                            <span title="Loại sản phẩm">
                              {productTypeLabel}
                            </span>

                            <span title="Website nguồn">
                              <GlobalOutlined />
                              {getDisplayText(
                                item?.sourceWebsite,
                                "Chưa có website",
                              )}
                            </span>

                            <span title="Số lượng ảnh">
                              {formatNumber(
                                imageUrls.length,
                              )}{" "}
                              ảnh
                            </span>
                          </div>

                          {(Boolean(item?.attributes?.trim()) || Boolean(item?.note?.trim())) && (
                            <div className="purchase-buy-confirm-product-details">
                              {Boolean(item?.attributes?.trim()) && (
                                <div className="product-detail-item">
                                  <span className="product-detail-label">Thuộc tính:</span>
                                  <strong className="product-detail-value">{item.attributes.trim()}</strong>
                                </div>
                              )}

                              {Boolean(item?.note?.trim()) && (
                                <div className="product-detail-item">
                                  <span className="product-detail-label">Ghi chú:</span>
                                  <strong className="product-detail-value">{item.note.trim()}</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {fullProductLink && (
                            <div className="purchase-buy-confirm-product-link-box">
                              <span className="purchase-buy-confirm-product-link-icon">
                                <LinkOutlined />
                              </span>

                              <span className="purchase-buy-confirm-product-link-content">
                                <small>
                                  Liên kết sản phẩm
                                </small>

                                <span
                                  className="purchase-buy-confirm-product-link-text"
                                  title={fullProductLink}
                                >
                                  {shortProductLink}
                                </span>
                              </span>

                              <a
                                href={fullProductLink}
                                target="_blank"
                                rel="noreferrer"
                                className="purchase-buy-confirm-product-link-action"
                                title="Mở liên kết sản phẩm"
                              >
                                Mở link
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="purchase-buy-confirm-side-column">
            <section className="purchase-buy-confirm-card">
              <div className="purchase-buy-confirm-card-header">
                <span className="purchase-buy-confirm-card-icon is-green">
                  <SafetyCertificateOutlined />
                </span>

                <div>
                  <h2>Dịch vụ & Tiện ích</h2>
                  <p>
                    Quy trình vận chuyển & các gói dịch vụ đính kèm.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-service-list">
                {(requiresPacking || requiresWoodenCrate || requiresInsurance || selectedRuleCodes.length > 0) ? (
                  <>
                    {requiresPacking && (
                      <ConfirmStatus
                        code="PACKING"
                        title="Đóng gói hàng hóa"
                        description="Hàng hóa được bọc màng co và xốp khí gia cố an toàn."
                      />
                    )}

                    {requiresWoodenCrate && (
                      <ConfirmStatus
                        code="WOOD_CRATE"
                        title="Đóng thùng gỗ"
                        badgeText={
                          Number.isFinite(woodCrateTotalFee) && woodCrateTotalFee > 0
                            ? `${formatNumber(woodCratePackageCount)} kiện • ${formatMoney(woodCrateTotalFee)}`
                            : `${formatNumber(woodCratePackageCount)} kiện`
                        }
                        description="Gia cố thùng gỗ chuyên dụng cho kiện hàng cồng kềnh/dễ vỡ."
                      />
                    )}

                    {requiresInsurance && (
                      <ConfirmStatus
                        code="INSURANCE"
                        title="Bảo hiểm hàng hóa"
                        description="Bảo hiểm an toàn 100% giá trị hàng hóa đối với mọi sự cố."
                      />
                    )}

                    {selectedRuleCodes
                      .filter(code => !["WOOD_CRATE", "WOOD_BOX", "PACKING", "SUR_INSURANCE_3PERCENT", "INSURANCE"].includes(code))
                      .map(ruleCode => (
                        <ConfirmStatus
                          key={ruleCode}
                          code={ruleCode}
                          title={getServiceLabel(ruleCode)}
                        />
                      ))}
                  </>
                ) : (
                  <div className="purchase-buy-confirm-service-card is-sapphire">
                    <div className="service-card-left">
                      <div className="service-icon-badge">
                        <CheckOutlined />
                      </div>
                      <div className="service-card-info">
                        <div className="service-card-title-row">
                          <strong>Vận chuyển tiêu chuẩn</strong>
                          <span className="service-card-badge">Tiêu chuẩn Việt Nam Logistics</span>
                        </div>
                        <p>Đơn hàng áp dụng quy trình vận chuyển & theo dõi hành trình tiêu chuẩn của Việt Nam Logistics.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {Boolean(form?.generalNote?.trim()) && (
              <section className="purchase-buy-confirm-card">
                <div className="purchase-buy-confirm-card-header">
                  <span className="purchase-buy-confirm-card-icon is-purple">
                    <FileTextOutlined />
                  </span>

                  <div>
                    <h2>Ghi chú chung</h2>
                    <p>
                      Nội dung áp dụng cho toàn bộ yêu cầu.
                    </p>
                  </div>
                </div>

                <div className="purchase-buy-confirm-note">
                  {form.generalNote.trim()}
                </div>
              </section>
            )}

            <section className="purchase-buy-confirm-notice">
              <InfoCircleOutlined />

              <div>
                <strong>Lưu ý trước khi gửi</strong>

                <p>
                  Sau khi xác nhận, hệ thống sẽ tải toàn
                  bộ hình ảnh và tạo yêu cầu mua hộ. Việt Nam Logistics
                  sẽ kiểm tra lại liên kết, thuộc tính,
                  số lượng và các dịch vụ đã chọn trước
                  khi báo giá.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <footer className="purchase-buy-confirm-actions">
          <div className="purchase-buy-confirm-actions__summary">
            <CheckCircleOutlined />

            <span>
              Đã kiểm tra{" "}
              <strong>
                {formatNumber(items.length)}
              </strong>{" "}
              mặt hàng và{" "}
              <strong>
                {formatNumber(totalImages)}
              </strong>{" "}
              ảnh
            </span>
          </div>

          <div className="purchase-buy-confirm-actions__buttons">
            <button
              type="button"
              className="purchase-buy-confirm-edit-button"
              disabled={isSubmitting}
              onClick={onBack}
            >
              <LeftOutlined />
              QUAY LẠI CHỈNH SỬA
            </button>

            <button
              type="button"
              className="purchase-buy-confirm-submit-button"
              disabled={isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? (
                <>
                  <LoadingOutlined spin />
                  ĐANG TẠO YÊU CẦU...
                </>
              ) : (
                <>
                  <CheckOutlined />
                  XÁC NHẬN TẠO YÊU CẦU
                </>
              )}
            </button>
          </div>
        </footer>
      </div>

      {lightboxVisible && (
        <div
          className="purchase-buy-confirm-lightbox"
          role="presentation"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="purchase-buy-confirm-lightbox-close"
            aria-label="Đóng ảnh"
            onClick={closeLightbox}
          >
            <CloseOutlined />
          </button>

          {lightbox.images.length > 1 && (
            <button
              type="button"
              className="purchase-buy-confirm-lightbox-nav is-previous"
              aria-label="Ảnh trước"
              onClick={showPreviousImage}
            >
              ‹
            </button>
          )}

          <div
            className="purchase-buy-confirm-lightbox-content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={currentLightboxImage}
              alt={lightbox.title}
            />

            <div className="purchase-buy-confirm-lightbox-caption">
              <strong>{lightbox.title}</strong>

              <span>
                Ảnh {lightbox.index + 1}/
                {lightbox.images.length}
              </span>
            </div>
          </div>

          {lightbox.images.length > 1 && (
            <button
              type="button"
              className="purchase-buy-confirm-lightbox-nav is-next"
              aria-label="Ảnh tiếp theo"
              onClick={showNextImage}
            >
              ›
            </button>
          )}
        </div>
      )}

      {isSubmitting && (
        <div
          className="purchase-buy-confirm-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="purchase-buy-confirm-loading-card">
            <div className="purchase-buy-confirm-loading-visual">
              <span className="purchase-buy-confirm-loading-ring" />
              <span className="purchase-buy-confirm-loading-ring is-secondary" />
              <ShoppingCartOutlined />
            </div>

            <span className="purchase-buy-confirm-loading-eyebrow">
              HỆ THỐNG VIỆT NAM LOGISTICS ĐANG XỬ LÝ
            </span>

            <h3>ĐANG TẠO YÊU CẦU MUA HỘ</h3>

            <p>
              {submitMessage ||
                "Đang chuẩn bị tạo yêu cầu..."}
            </p>

            <span className="purchase-buy-confirm-loading-bar">
              <i />
            </span>

            <div
              className="purchase-buy-confirm-loading-steps"
              aria-hidden="true"
            >
              <span>Kiểm tra dữ liệu</span>
              <span>Tải ảnh sản phẩm</span>
              <span>Tạo yêu cầu</span>
            </div>

            <small>
              Vui lòng không đóng hoặc tải lại trang.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
