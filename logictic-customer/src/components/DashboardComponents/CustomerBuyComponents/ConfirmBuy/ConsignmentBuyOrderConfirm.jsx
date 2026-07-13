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

const getOptionLabel = (
  options,
  value
) => {
  const normalizedValue =
    String(value ?? "").trim();

  if (!normalizedValue) {
    return "Chưa cập nhật";
  }

  return (
    options.find(
      (option) =>
        String(option.value) ===
        normalizedValue
    )?.label ||
    normalizedValue
  );
};

const getImagePreviewUrl = (
  item
) => {
  return (
    item?.image?.previewUrl ||
    item?.image?.url ||
    item?.imageUrl ||
    ""
  );
};

const getDisplayText = (
  value,
  fallback = "Không có"
) => {
  const text =
    String(value ?? "").trim();

  return text || fallback;
};

const formatNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("vi-VN")
    : "0";
};

const getReceiverAddress = (form) =>
  getDisplayText(
    form?.selectedDeliveryAddress ||
      form?.receiverAddress ||
      form?.deliveryAddress ||
      form?.address,
    "Chưa cập nhật"
  );

const getProductTypeValue = (item) =>
  item?.productType ??
  item?.productTypeId ??
  item?.productTypeCode;

const ConfirmStatus = ({
  enabled,
  enabledText,
  disabledText,
}) => (
  <span
    className={[
      "purchase-buy-confirm-status",
      enabled
        ? "is-enabled"
        : "is-disabled",
    ].join(" ")}
  >
    {enabled ? (
      <CheckCircleOutlined />
    ) : (
      <CloseOutlined />
    )}

    {enabled
      ? enabledText
      : disabledText}
  </span>
);

export default function ConsignmentBuyOrderConfirm({
  form,
  items = [],
  routeOptions = [],
  productTypeOptions = [],
  isSubmitting = false,
  submitMessage = "",
  onBack,
  onConfirm,
}) {
  const [
    previewImage,
    setPreviewImage,
  ] = useState("");

  const routeLabel =
    useMemo(
      () =>
        getOptionLabel(
          routeOptions,
          form?.route
        ),
      [
        routeOptions,
        form?.route,
      ]
    );

  const totalQuantity =
    useMemo(
      () =>
        items.reduce(
          (total, item) =>
            total +
            (Number(
              item?.quantity
            ) || 0),
          0
        ),
      [items]
    );

  const handleConfirm = () => {
    if (
      isSubmitting ||
      typeof onConfirm !==
        "function"
    ) {
      return;
    }

    onConfirm();
  };

  return (
    <div className="purchase-buy-confirm-page">
      <div className="purchase-buy-confirm-shell">
        {/* <button
          type="button"
          className="purchase-buy-confirm-back"
          disabled={isSubmitting}
          onClick={onBack}
        >
          <LeftOutlined />
          QUAY LẠI CHỈNH SỬA
        </button> */}

        <section className="purchase-buy-confirm-hero">
          <div className="purchase-buy-confirm-hero-icon">
            <ShoppingCartOutlined />
          </div>

          <div className="purchase-buy-confirm-hero-content">
            <span>
              BƯỚC XÁC NHẬN CUỐI CÙNG
            </span>

            <h1>
              Xem lại yêu cầu mua hộ
            </h1>

            <p>
              Kiểm tra kỹ thông tin người nhận,
              tùy chọn dịch vụ và sản phẩm trước
              khi gửi yêu cầu đến VCL.
            </p>
          </div>

          <div className="purchase-buy-confirm-ready-badge">
            <CheckCircleOutlined />
            Sẵn sàng gửi
          </div>
        </section>

        <section className="purchase-buy-confirm-summary-grid">
          <article>
            <span>
              <EnvironmentOutlined />
            </span>

            <small>
              Tuyến vận chuyển
            </small>

            <strong>
              {routeLabel}
            </strong>
          </article>

          <article>
            <span>
              <ShoppingCartOutlined />
            </span>

            <small>
              Dòng sản phẩm
            </small>

            <strong>
              {formatNumber(items.length)} mặt hàng
            </strong>
          </article>

          <article>
            <span>
              <CheckOutlined />
            </span>

            <small>
              Tổng số lượng
            </small>

            <strong>
              {formatNumber(totalQuantity)} sản phẩm
            </strong>
          </article>
        </section>

        <div className="purchase-buy-confirm-main-grid">
          <div className="purchase-buy-confirm-content-column">
            <section className="purchase-buy-confirm-card">
              <div className="purchase-buy-confirm-card-header">
                <span className="purchase-buy-confirm-card-icon">
                  <EnvironmentOutlined />
                </span>

                <div>
                  <h2>
                    Thông tin nhận hàng
                  </h2>

                  <p>
                    Người nhận và địa chỉ giao hàng
                    tại Việt Nam.
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
                      "Chưa cập nhật"
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
                      "Chưa cập nhật"
                    )}
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
                  <h2>
                    Danh sách sản phẩm
                  </h2>

                  <p>
                    Có {formatNumber(items.length)} mặt hàng
                    trong yêu cầu mua hộ.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-product-list">
                {items.map(
                  (item, index) => {
                    const imageUrl =
                      getImagePreviewUrl(
                        item
                      );

                    const productTypeLabel =
                      getOptionLabel(
                        productTypeOptions,
                        getProductTypeValue(item)
                      );

                    return (
                      <article
                        key={
                          item?.id ||
                          `${item?.productName}-${index}`
                        }
                        className="purchase-buy-confirm-product-card"
                      >
                        <div className="purchase-buy-confirm-product-number">
                          {index + 1}
                        </div>

                        <button
                          type="button"
                          className="purchase-buy-confirm-product-image"
                          disabled={
                            !imageUrl
                          }
                          onClick={() =>
                            imageUrl &&
                            setPreviewImage(
                              imageUrl
                            )
                          }
                          aria-label={
                            imageUrl
                              ? `Xem ảnh ${getDisplayText(
                                  item?.productName,
                                  `sản phẩm ${index + 1}`
                                )}`
                              : "Sản phẩm chưa có ảnh"
                          }
                        >
                          {imageUrl ? (
                            <img
                              src={
                                imageUrl
                              }
                              alt={
                                item?.productName ||
                                `Sản phẩm ${index + 1}`
                              }
                            />
                          ) : (
                            <ShoppingCartOutlined />
                          )}
                        </button>

                        <div className="purchase-buy-confirm-product-content">
                          <div className="purchase-buy-confirm-product-heading">
                            <div>
                              <span>
                                Sản phẩm {index + 1}
                              </span>

                              <h3>
                                {getDisplayText(
                                  item?.productName,
                                  "Chưa cập nhật tên"
                                )}
                              </h3>
                            </div>

                            <strong className="purchase-buy-confirm-quantity">
                              SL:{" "}
                              {formatNumber(item?.quantity)}
                            </strong>
                          </div>

                          <div className="purchase-buy-confirm-product-tags">
                            <span title="Loại sản phẩm">
                              {productTypeLabel}
                            </span>

                            <span title="Website nguồn">
                              <GlobalOutlined />
                              {getDisplayText(
                                item?.sourceWebsite,
                                "Chưa có website"
                              )}
                            </span>
                          </div>

                          <dl className="purchase-buy-confirm-product-details">
                            <div>
                              <dt>
                                Thuộc tính
                              </dt>

                              <dd>
                                {getDisplayText(
                                  item?.attributes
                                )}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Ghi chú
                              </dt>

                              <dd>
                                {getDisplayText(
                                  item?.note
                                )}
                              </dd>
                            </div>
                          </dl>

                          {item?.productLink && (
                            <a
                              href={
                                item.productLink
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="purchase-buy-confirm-product-link"
                            >
                              <LinkOutlined />
                              Mở liên kết sản phẩm
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}
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
                  <h2>
                    Tùy chọn dịch vụ
                  </h2>

                  <p>
                    Các yêu cầu kiểm tra đã chọn.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-service-list">
                <div>
                  <span>
                    Kiểm hàng
                  </span>

                  <ConfirmStatus
                    enabled={Boolean(
                      form?.requiresInspection
                    )}
                    enabledText="Có kiểm hàng"
                    disabledText="Không kiểm hàng"
                  />
                </div>

                <div>
                  <span>
                    Kiểm đếm số lượng
                  </span>

                  <ConfirmStatus
                    enabled={Boolean(
                      form?.requiresQuantityCheck
                    )}
                    enabledText="Có kiểm đếm"
                    disabledText="Không kiểm đếm"
                  />
                </div>
              </div>
            </section>

            <section className="purchase-buy-confirm-card">
              <div className="purchase-buy-confirm-card-header">
                <span className="purchase-buy-confirm-card-icon is-purple">
                  <FileTextOutlined />
                </span>

                <div>
                  <h2>
                    Ghi chú chung
                  </h2>

                  <p>
                    Nội dung bổ sung cho toàn bộ yêu cầu.
                  </p>
                </div>
              </div>

              <div className="purchase-buy-confirm-note">
                {getDisplayText(
                  form?.generalNote,
                  "Không có ghi chú chung."
                )}
              </div>
            </section>

            <section className="purchase-buy-confirm-notice">
              <InfoCircleOutlined />

              <div>
                <strong>
                  Lưu ý trước khi gửi
                </strong>

                <p>
                  Sau khi xác nhận, hệ thống sẽ
                  tải ảnh sản phẩm lên và tạo yêu
                  cầu mua hộ. VCL sẽ kiểm tra lại
                  liên kết, thuộc tính và số lượng
                  trước khi báo giá.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <footer className="purchase-buy-confirm-actions">
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
        </footer>
      </div>

      {previewImage && (
        <div
          className="purchase-buy-confirm-lightbox"
          role="presentation"
          onClick={() =>
            setPreviewImage("")
          }
        >
          <button
            type="button"
            aria-label="Đóng ảnh"
            onClick={() =>
              setPreviewImage("")
            }
          >
            <CloseOutlined />
          </button>

          <img
            src={previewImage}
            alt="Xem trước sản phẩm"
            onClick={(event) =>
              event.stopPropagation()
            }
          />

          <span>
            Bấm vào vùng tối để đóng
          </span>
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
              HỆ THỐNG VCL ĐANG XỬ LÝ
            </span>

            <h3>
              ĐANG TẠO YÊU CẦU MUA HỘ
            </h3>

            <p>
              {submitMessage ||
                "Đang chuẩn bị tạo yêu cầu..."}
            </p>

            <span className="purchase-buy-confirm-loading-bar">
              <i />
            </span>

            <div className="purchase-buy-confirm-loading-steps" aria-hidden="true">
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