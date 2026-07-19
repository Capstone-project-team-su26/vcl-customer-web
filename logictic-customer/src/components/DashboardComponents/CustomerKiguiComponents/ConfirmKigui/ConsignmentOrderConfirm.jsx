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

const SERVICE_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  WOOD_BOX: "Đóng thùng gỗ",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  INSPECTION: "Kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Bảo hiểm hàng hóa 3%",
  INSURANCE: "Bảo hiểm hàng hóa",
  PACKING: "Đóng gói hàng hóa",
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

const formatCodeLabel = (value) => {
  const normalizedCode = normalizeCode(value);

  if (!normalizedCode) {
    return "Dịch vụ bổ sung";
  }

  return normalizedCode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) => character.toUpperCase());
};

const getServiceLabel = (code) => {
  const normalizedCode = normalizeCode(code);

  return (
    SERVICE_LABELS[normalizedCode] ||
    formatCodeLabel(normalizedCode)
  );
};

const getServiceClassName = (code) => {
  const normalizedCode = normalizeCode(code);

  if (
    normalizedCode.includes("WOOD") ||
    normalizedCode.includes("CRATE")
  ) {
    return "is-wood";
  }

  if (normalizedCode.includes("INSPECTION")) {
    return "is-inspection";
  }

  if (normalizedCode.includes("INSURANCE")) {
    return "is-insurance";
  }

  if (normalizedCode.includes("DOMESTIC")) {
    return "is-domestic";
  }

  if (normalizedCode.includes("PACKING")) {
    return "is-packing";
  }

  return "is-other";
};

const getOptionLabel = (options, value) =>
  options.find(
    (option) =>
      String(option.value) === String(value),
  )?.label ||
  value ||
  "Chưa có thông tin";

const formatVnd = (value) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return `${new Intl.NumberFormat("vi-VN").format(number)} ₫`;
};

const formatNumber = (
  value,
  maximumFractionDigits = 2,
) => {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(number);
};

const calculatePackageVolume = (pkg) => {
  const length = Number(pkg?.length);
  const width = Number(pkg?.width);
  const height = Number(pkg?.height);

  if (
    !Number.isFinite(length) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    length <= 0 ||
    width <= 0 ||
    height <= 0
  ) {
    return 0;
  }

  return length * width * height;
};

const getLoadingProgress = (message = "") => {
  const normalizedMessage =
    String(message).toLowerCase();

  const uploadMatch =
    normalizedMessage.match(/(\d+)\s*\/\s*(\d+)/);

  if (
    normalizedMessage.includes("upload") ||
    normalizedMessage.includes("tải ảnh")
  ) {
    const currentPackage = Number(
      uploadMatch?.[1] || 1,
    );

    const totalPackages = Math.max(
      Number(uploadMatch?.[2] || 1),
      1,
    );

    return Math.min(
      78,
      Math.max(
        20,
        Math.round(
          20 +
            (currentPackage / totalPackages) *
              58,
        ),
      ),
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

function SummaryItem({
  label,
  value,
  fullWidth = false,
  tone = "",
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "";

  return (
    <div
      className={[
        "consignment-confirm-summary-item",
        fullWidth && "is-full-width",
        tone && `is-${tone}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>

      <strong>
        {hasValue
          ? value
          : "Chưa có thông tin"}
      </strong>
    </div>
  );
}

function ServiceTag({ code }) {
  return (
    <span
      className={[
        "consignment-confirm-service-tag",
        getServiceClassName(code),
      ].join(" ")}
    >
      <span className="consignment-confirm-service-dot" />

      <span>{getServiceLabel(code)}</span>
    </span>
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
  const [activeImage, setActiveImage] =
    useState("");

  const loadingProgress = useMemo(
    () => getLoadingProgress(submitMessage),
    [submitMessage],
  );

  const loadingStage = useMemo(
    () => getLoadingStage(loadingProgress),
    [loadingProgress],
  );

  useEffect(() => {
    if (!isSubmitting) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    setActiveImage("");
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isSubmitting]);

  const totals = useMemo(
    () =>
      packages.reduce(
        (result, pkg) => ({
          quantity:
            result.quantity +
            Number(pkg.quantity || 0),

          weight:
            result.weight +
            Number(pkg.weight || 0),

          declaredValue:
            result.declaredValue +
            Number(pkg.declaredValue || 0),

          volume:
            result.volume +
            calculatePackageVolume(pkg),

          images:
            result.images +
            (Array.isArray(pkg.images)
              ? pkg.images.length
              : 0),
        }),
        {
          quantity: 0,
          weight: 0,
          declaredValue: 0,
          volume: 0,
          images: 0,
        },
      ),
    [packages],
  );

  const routeLabel = getOptionLabel(
    routeOptions,
    form.route,
  );

  const shippingLabel = getOptionLabel(
    shippingOptions,
    form.shippingOption,
  );

  const selectedServices = useMemo(() => {
    const selectedRuleCodes = Array.isArray(
      form?.optionalServices
        ?.selectedRuleCodes,
    )
      ? form.optionalServices.selectedRuleCodes
      : [];

    const normalizedCodes = selectedRuleCodes
      .map(normalizeCode)
      .filter(Boolean);

    return Array.from(new Set(normalizedCodes));
  }, [form?.optionalServices?.selectedRuleCodes]);

  const inspectionRequested =
    Boolean(form?.inspectPackage) ||
    Boolean(
      form?.optionalServices
        ?.requiresInspection,
    );

  return (
    <div className="consignment-confirm-page">
      <div className="consignment-confirm-shell">
        <div className="consignment-confirm-topbar">
          <button
            type="button"
            className="consignment-confirm-back"
            disabled={isSubmitting}
            onClick={onBack}
          >
            <LeftOutlined />
            QUAY LẠI CHỈNH SỬA
          </button>

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
            <span className="consignment-confirm-hero-eyebrow">
              XÁC NHẬN ĐƠN KÝ GỬI
            </span>

            <h1>
              Kiểm tra lại toàn bộ thông tin
              trước khi tạo đơn
            </h1>

            <p>
              Hãy kiểm tra người nhận, tuyến vận
              chuyển, dịch vụ bổ sung và thông tin
              từng kiện. Sau khi xác nhận, hệ thống
              sẽ tải ảnh và gửi yêu cầu tạo đơn.
            </p>
          </div>

          <div className="consignment-confirm-hero-stats">
            <div>
              <span>Số kiện</span>
              <strong>{packages.length}</strong>
            </div>

            <div>
              <span>Dịch vụ</span>
              <strong>
                {selectedServices.length}
              </strong>
            </div>
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <EnvironmentOutlined />
            </span>

            <div>
              <h2>Thông tin giao nhận</h2>
              <p>
                Tuyến vận chuyển và thông tin người
                nhận cuối cùng.
              </p>
            </div>
          </div>

          <div className="consignment-confirm-summary-grid">
            <SummaryItem
              label="Tuyến hàng"
              value={routeLabel}
              tone="route"
            />

            <SummaryItem
              label="Hình thức vận chuyển"
              value={shippingLabel}
              tone="shipping"
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
                inspectionRequested
                  ? "Có yêu cầu kiểm hàng"
                  : "Không yêu cầu kiểm hàng"
              }
              tone={
                inspectionRequested
                  ? "success"
                  : "neutral"
              }
            />

            <SummaryItem
              label="Số dịch vụ bổ sung"
              value={`${selectedServices.length} dịch vụ`}
              tone="service"
            />
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <SafetyCertificateOutlined />
            </span>

            <div>
              <h2>Dịch vụ bổ sung</h2>
              <p>
                Các dịch vụ được áp dụng cho toàn bộ
                đơn ký gửi.
              </p>
            </div>
          </div>

          {selectedServices.length > 0 ? (
            <div className="consignment-confirm-service-list">
              {selectedServices.map((code) => (
                <ServiceTag
                  key={code}
                  code={code}
                />
              ))}
            </div>
          ) : (
            <div className="consignment-confirm-empty-service">
              Không sử dụng dịch vụ bổ sung.
            </div>
          )}
        </div>

        <div className="consignment-confirm-totals">
          <div className="consignment-confirm-total-card is-package">
            <span>Tổng số kiện</span>
            <strong>{packages.length}</strong>
          </div>

          <div className="consignment-confirm-total-card is-quantity">
            <span>Tổng số lượng sản phẩm</span>
            <strong>
              {formatNumber(totals.quantity)}
            </strong>
          </div>

          <div className="consignment-confirm-total-card is-weight">
            <span>Tổng cân nặng</span>
            <strong>
              {formatNumber(totals.weight)} kg
            </strong>
          </div>

          <div className="consignment-confirm-total-card is-volume">
            <span>Tổng thể tích</span>
            <strong>
              {formatNumber(totals.volume)} cm³
            </strong>
          </div>

          <div className="consignment-confirm-total-card is-value">
            <span>Tổng giá trị khai báo</span>
            <strong>
              {formatVnd(totals.declaredValue)}
            </strong>
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <ShoppingOutlined />
            </span>

            <div>
              <h2>Danh sách kiện hàng</h2>
              <p>
                Chi tiết sản phẩm, kích thước, giá trị
                khai báo và hình ảnh từng kiện.
              </p>
            </div>
          </div>

          <div className="consignment-confirm-package-list">
            {packages.map((pkg, index) => {
              const packageVolume =
                calculatePackageVolume(pkg);

              const images = Array.isArray(
                pkg.images,
              )
                ? pkg.images
                : [];

              return (
                <article
                  key={pkg.id}
                  className="consignment-confirm-package"
                >
                  <div className="consignment-confirm-package-header">
                    <div>
                      <h3>
                        <span className="consignment-confirm-package-number">
                          {index + 1}
                        </span>

                        Kiện hàng thứ {index + 1}
                      </h3>

                      <p>
                        {pkg.productName ||
                          "Chưa có tên sản phẩm"}
                      </p>
                    </div>

                    <div className="consignment-confirm-package-value">
                      <span>Giá trị khai báo</span>
                      <strong>
                        {formatVnd(
                          pkg.declaredValue,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="consignment-confirm-package-body">
                    <div className="consignment-confirm-package-grid">
                      <div className="consignment-confirm-package-field is-wide">
                        <span>Tên sản phẩm</span>
                        <strong>
                          {pkg.productName ||
                            "Chưa có thông tin"}
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field is-wide">
                        <span>Loại hàng hóa</span>
                        <strong>
                          {getOptionLabel(
                            productTypeOptions,
                            pkg.productType,
                          )}
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field">
                        <span>Số lượng</span>
                        <strong>
                          {formatNumber(
                            pkg.quantity,
                          )}
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field">
                        <span>Cân nặng</span>
                        <strong>
                          {formatNumber(pkg.weight)} kg
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field">
                        <span>Kích thước</span>
                        <strong>
                          {formatNumber(pkg.length)} ×{" "}
                          {formatNumber(pkg.width)} ×{" "}
                          {formatNumber(pkg.height)} cm
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field">
                        <span>Thể tích</span>
                        <strong>
                          {formatNumber(
                            packageVolume,
                          )}{" "}
                          cm³
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field is-wide">
                        <span>
                          Mã vận đơn nội địa
                        </span>

                        <strong>
                          {pkg.trackingCode?.trim() ||
                            "Chưa có mã vận đơn"}
                        </strong>
                      </div>

                      <div className="consignment-confirm-package-field">
                        <span>Số ảnh</span>
                        <strong>
                          {images.length} ảnh
                        </strong>
                      </div>
                    </div>

                    {images.length > 0 ? (
                      <div className="consignment-confirm-images">
                        {images.map(
                          (image, imageIndex) => (
                            <button
                              key={image.id}
                              type="button"
                              className="consignment-confirm-image-button"
                              onClick={() =>
                                setActiveImage(
                                  image.previewUrl,
                                )
                              }
                            >
                              <img
                                src={
                                  image.previewUrl
                                }
                                alt={`Kiện ${
                                  index + 1
                                } - ảnh ${
                                  imageIndex + 1
                                }`}
                              />

                              <span className="consignment-confirm-image-index">
                                Ảnh {imageIndex + 1}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="consignment-confirm-empty-images">
                        Chưa có hình ảnh cho kiện này.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="consignment-confirm-section">
          <div className="consignment-confirm-section-title">
            <span>
              <InfoCircleOutlined />
            </span>

            <div>
              <h2>Ghi chú chung</h2>
              <p>
                Thông tin bổ sung được gửi kèm yêu cầu
                ký gửi.
              </p>
            </div>
          </div>

          <p className="consignment-confirm-note">
            {form.note?.trim() ||
              "Không có ghi chú."}
          </p>
        </div>

        <div className="consignment-confirm-warning">
          <SafetyCertificateOutlined />

          <span>
            Sau khi xác nhận, hệ thống sẽ tải ảnh và
            gửi yêu cầu tạo đơn. Vui lòng không đóng,
            quay lại hoặc tải lại trang trong lúc xử
            lý.
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
                <strong>
                  {loadingProgress}%
                </strong>
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
                      isCompleted &&
                        "is-completed",
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
                Dữ liệu đang được xử lý an toàn. Vui
                lòng không đóng, quay lại hoặc tải lại
                trang.
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
            aria-label="Đóng ảnh phóng to"
            onClick={() => setActiveImage("")}
          >
            <CloseOutlined />
          </button>

          <img
            src={activeImage}
            alt="Ảnh sản phẩm phóng to"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
}
