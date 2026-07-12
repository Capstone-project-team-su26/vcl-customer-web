import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import "./ConsignmentOrderConfirm.css";

const getOptionLabel = (options, value) =>
  options.find((option) => String(option.value) === String(value))?.label ||
  value ||
  "Chưa có thông tin";

const formatVnd = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return `${new Intl.NumberFormat("vi-VN").format(number)} ₫`;
};

const formatNumber = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(number);
};


const getLoadingProgress = (message = "") => {
  const normalizedMessage = String(message).toLowerCase();
  const uploadMatch = normalizedMessage.match(
    /(\d+)\s*\/\s*(\d+)/
  );

  if (
    normalizedMessage.includes("upload") ||
    normalizedMessage.includes("tải ảnh")
  ) {
    const currentPackage = Number(uploadMatch?.[1] || 1);
    const totalPackages = Math.max(
      Number(uploadMatch?.[2] || 1),
      1
    );

    return Math.min(
      78,
      Math.max(
        20,
        Math.round(
          20 + (currentPackage / totalPackages) * 58
        )
      )
    );
  }

  if (
    normalizedMessage.includes("gửi yêu cầu") ||
    normalizedMessage.includes("gửi đơn")
  ) {
    return 92;
  }

  if (
    normalizedMessage.includes("hoàn tất") ||
    normalizedMessage.includes("thành công")
  ) {
    return 100;
  }

  return 12;
};

const getLoadingStage = (progress) => {
  if (progress >= 85) {
    return 3;
  }

  if (progress >= 20) {
    return 2;
  }

  return 1;
};

function SummaryItem({ label, value, fullWidth = false }) {
  return (
    <div
      className={[
        "consignment-confirm-summary-item",
        fullWidth && "is-full-width",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <strong>{value || "Chưa có thông tin"}</strong>
    </div>
  );
}

export default function ConsignmentOrderConfirm({
  form,
  packages,
  routeOptions,
  shippingOptions,
  productTypeOptions,
  isSubmitting,
  submitMessage,
  onBack,
  onConfirm,
}) {
  const [activeImage, setActiveImage] = useState("");

  const loadingProgress = useMemo(
    () => getLoadingProgress(submitMessage),
    [submitMessage]
  );

  const loadingStage = useMemo(
    () => getLoadingStage(loadingProgress),
    [loadingProgress]
  );

  useEffect(() => {
    if (!isSubmitting) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    setActiveImage("");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSubmitting]);

  const totals = useMemo(
    () =>
      packages.reduce(
        (result, pkg) => ({
          quantity: result.quantity + Number(pkg.quantity || 0),
          weight: result.weight + Number(pkg.weight || 0),
          declaredValue:
            result.declaredValue + Number(pkg.declaredValue || 0),
        }),
        {
          quantity: 0,
          weight: 0,
          declaredValue: 0,
        }
      ),
    [packages]
  );

  const routeLabel = getOptionLabel(routeOptions, form.route);
  const shippingLabel = getOptionLabel(
    shippingOptions,
    form.shippingOption
  );

  return (
    <div className="consignment-confirm-page">


      <div className="consignment-confirm-shell">
        <div className="consignment-confirm-topbar">
          {/* <button
            type="button"
            className="consignment-confirm-back"
            disabled={isSubmitting}
            onClick={onBack}
          >
            <LeftOutlined />
            QUAY LẠI CHỈNH SỬA
          </button> */}

          <div className="consignment-confirm-status">
            <CheckCircleOutlined />
            THÔNG TIN ĐÃ HỢP LỆ
          </div>
        </div>

        <div className="consignment-confirm-hero">
          <div className="consignment-confirm-hero-icon">
            <ShoppingOutlined />
          </div>

          <div className="consignment-confirm-hero-copy">
            <h1>Xác nhận thông tin đơn ký gửi</h1>
            <p>
              Vui lòng kiểm tra kỹ người nhận, tuyến vận chuyển và thông tin
              từng kiện hàng. Đơn chỉ được gửi lên hệ thống sau khi bạn bấm
              nút xác nhận tạo đơn ở cuối trang.
            </p>
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <EnvironmentOutlined />
            </span>
            <h2>Thông tin giao nhận</h2>
          </div>

          <div className="consignment-confirm-summary-grid">
            <SummaryItem label="Tuyến hàng" value={routeLabel} />
            <SummaryItem
              label="Hình thức vận chuyển"
              value={shippingLabel}
            />
            <SummaryItem
              label="Người nhận"
              value={form.receiverName}
            />
            <SummaryItem
              label="Số điện thoại"
              value={form.receiverPhone}
            />
            <SummaryItem
              label="Địa chỉ nhận hàng"
              value={form.selectedDeliveryAddress}
              fullWidth
            />
            <SummaryItem
              label="Yêu cầu kiểm hàng"
              value={
                form.inspectPackage
                  ? "Có — mở kiện và kiểm đếm tại kho"
                  : "Không yêu cầu kiểm hàng"
              }
              fullWidth
            />
          </div>
        </div>

        <div className="consignment-confirm-totals">
          <div className="consignment-confirm-total-card">
            <span>Tổng số kiện</span>
            <strong>{packages.length}</strong>
          </div>

          <div className="consignment-confirm-total-card">
            <span>Tổng cân nặng</span>
            <strong>{formatNumber(totals.weight)} kg</strong>
          </div>

          <div className="consignment-confirm-total-card">
            <span>Tổng giá trị khai báo</span>
            <strong>{formatVnd(totals.declaredValue)}</strong>
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <ShoppingOutlined />
            </span>
            <h2>Danh sách kiện hàng</h2>
          </div>

          <div className="consignment-confirm-package-list">
            {packages.map((pkg, index) => (
              <article
                key={pkg.id}
                className="consignment-confirm-package"
              >
                <div className="consignment-confirm-package-header">
                  <h3>
                    <span className="consignment-confirm-package-number">
                      {index + 1}
                    </span>
                    Kiện hàng thứ {index + 1}
                  </h3>

                  <div className="consignment-confirm-package-value">
                    {formatVnd(pkg.declaredValue)}
                  </div>
                </div>

                <div className="consignment-confirm-package-body">
                  <div className="consignment-confirm-package-grid">
                    <div className="consignment-confirm-package-field is-wide">
                      <span>Tên sản phẩm</span>
                      <strong>{pkg.productName}</strong>
                    </div>

                    <div className="consignment-confirm-package-field is-wide">
                      <span>Loại hàng hóa</span>
                      <strong>
                        {getOptionLabel(
                          productTypeOptions,
                          pkg.productType
                        )}
                      </strong>
                    </div>

                    <div className="consignment-confirm-package-field">
                      <span>Số lượng</span>
                      <strong>{formatNumber(pkg.quantity)}</strong>
                    </div>

                    <div className="consignment-confirm-package-field">
                      <span>Cân nặng</span>
                      <strong>{formatNumber(pkg.weight)} kg</strong>
                    </div>

                    <div className="consignment-confirm-package-field">
                      <span>Chiều dài</span>
                      <strong>{formatNumber(pkg.length)} cm</strong>
                    </div>

                    <div className="consignment-confirm-package-field">
                      <span>Chiều rộng</span>
                      <strong>{formatNumber(pkg.width)} cm</strong>
                    </div>

                    <div className="consignment-confirm-package-field">
                      <span>Chiều cao</span>
                      <strong>{formatNumber(pkg.height)} cm</strong>
                    </div>

                    <div className="consignment-confirm-package-field is-wide">
                      <span>Mã vận đơn nội địa</span>
                      <strong>
                        {pkg.trackingCode?.trim() || "Chưa có mã vận đơn"}
                      </strong>
                    </div>
                  </div>

                  <div className="consignment-confirm-images">
                    {pkg.images.map((image, imageIndex) => (
                      <button
                        key={image.id}
                        type="button"
                        className="consignment-confirm-image-button"
                        onClick={() => setActiveImage(image.previewUrl)}
                      >
                        <img
                          src={image.previewUrl}
                          alt={`Kiện ${index + 1} - ảnh ${imageIndex + 1}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <InfoCircleOutlined />
            </span>
            <h2>Ghi chú chung</h2>
          </div>

          <p className="consignment-confirm-note">{form.note}</p>
        </div>

        <div className="consignment-confirm-warning">
          <SafetyCertificateOutlined />
          <span>
            Sau khi xác nhận, hệ thống sẽ tải ảnh và gửi yêu cầu tạo đơn.
            Vui lòng không đóng hoặc tải lại trang trong lúc xử lý.
          </span>
        </div>

        <div className="consignment-confirm-actions">
          <button
            type="button"
            className="consignment-confirm-button is-secondary"
            disabled={isSubmitting}
            onClick={onBack}
          >
            <LeftOutlined />
            QUAY LẠI CHỈNH SỬA
          </button>

          <button
            type="button"
            className="consignment-confirm-button is-primary"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <>
                <LoadingOutlined spin />
                ĐANG TẠO ĐƠN...
              </>
            ) : (
              <>
                <CheckCircleOutlined />
                XÁC NHẬN TẠO ĐƠN
              </>
            )}
          </button>
        </div>
      </div>

      {isSubmitting && (
        <div
          className="consignment-confirm-loading-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consignment-loading-title"
          aria-describedby="consignment-loading-description"
        >
          <div className="consignment-confirm-loading-card">
            <div className="consignment-confirm-loading-header">
              <div
                className="consignment-confirm-loading-visual"
                aria-hidden="true"
              >
                <span className="consignment-confirm-loading-orbit" />
                <span className="consignment-confirm-loading-icon">
                  <LoadingOutlined spin />
                </span>
              </div>

              <div className="consignment-confirm-loading-copy">
                <span className="consignment-confirm-loading-eyebrow">
                  HỆ THỐNG ĐANG XỬ LÝ
                </span>

                <h3 id="consignment-loading-title">
                  Đang tạo đơn ký gửi
                </h3>

                <p id="consignment-loading-description">
                  {submitMessage ||
                    "Đang chuẩn bị dữ liệu đơn hàng..."}
                </p>
              </div>
            </div>

            <div className="consignment-confirm-loading-progress">
              <div className="consignment-confirm-loading-progress-info">
                <span>Tiến trình xử lý</span>
                <strong>{loadingProgress}%</strong>
              </div>

              <div
                className="consignment-confirm-loading-progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={loadingProgress}
              >
                <span
                  style={{
                    width: `${loadingProgress}%`,
                  }}
                />
              </div>
            </div>

            <div className="consignment-confirm-loading-steps">
              {[
                "Kiểm tra dữ liệu",
                "Tải ảnh kiện hàng",
                "Gửi yêu cầu tạo đơn",
              ].map((stepLabel, index) => {
                const stepNumber = index + 1;
                const isCompleted =
                  loadingStage > stepNumber;
                const isActive =
                  loadingStage === stepNumber;

                return (
                  <div
                    key={stepLabel}
                    className={[
                      "consignment-confirm-loading-step",
                      isCompleted && "is-completed",
                      isActive && "is-active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="consignment-confirm-loading-step-dot">
                      {isCompleted ? (
                        <CheckCircleOutlined />
                      ) : (
                        stepNumber
                      )}
                    </span>

                    <span>{stepLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="consignment-confirm-loading-safe-note">
              <SafetyCertificateOutlined />
              <span>
                Dữ liệu đang được xử lý an toàn. Vui lòng
                không đóng, quay lại hoặc tải lại trang.
              </span>
            </div>
          </div>
        </div>
      )}

      {activeImage && (
        <div
          className="consignment-confirm-lightbox"
          onClick={() => setActiveImage("")}
        >
          <button
            type="button"
            className="consignment-confirm-lightbox-close"
            onClick={() => setActiveImage("")}
          >
            <CloseOutlined />
          </button>

          <img
            src={activeImage}
            alt="Ảnh sản phẩm phóng to"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
