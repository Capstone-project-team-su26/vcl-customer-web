import React, { useEffect, useMemo, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  GiftOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Checkbox, Modal, Tooltip } from "antd";

import AuthNotify from "../../../../utils/AuthNotify";
import "./PackageOptionalServices.css";

const SERVICE_OPTIONS = [
  {
    key: "requiresPacking",
    title: "Đóng gói hàng hóa",
    shortTitle: "Đóng gói",
    description:
      "Hỗ trợ đóng gói, chèn lót và gia cố hàng hóa trước khi vận chuyển.",
    information:
      "Phù hợp với hàng chưa được đóng chắc chắn, hàng dễ móp hoặc cần chèn lót thêm.",
    feeText: "Theo vật tư sử dụng",
    icon: GiftOutlined,
  },
  {
    key: "requiresWoodenCrate",
    title: "Đóng kiện gỗ",
    shortTitle: "Kiện gỗ",
    description: "Gia cố sản phẩm bằng khung hoặc thùng gỗ để hạn chế va đập.",
    information:
      "Thường áp dụng cho máy móc, thiết bị điện tử, hàng dễ vỡ hoặc hàng có giá trị cao.",
    feeText: "Theo kích thước kiện",
    icon: InboxOutlined,
  },
  {
    key: "requiresInsurance",
    title: "Bảo hiểm hàng hóa",
    shortTitle: "Bảo hiểm",
    description:
      "Bảo vệ giá trị hàng hóa trước rủi ro mất mát hoặc hư hỏng khi vận chuyển.",
    information:
      "Mức phí được xác định theo giá trị khai báo và chính sách bảo hiểm áp dụng.",
    feeText: "Theo giá trị khai báo",
    icon: SafetyCertificateOutlined,
  },
];

export const EMPTY_PACKAGE_SERVICES = {
  requiresPacking: false,
  requiresWoodenCrate: false,
  requiresInsurance: false,
};

const normalizeServiceValue = (value) => ({
  requiresPacking: Boolean(value?.requiresPacking),
  requiresWoodenCrate: Boolean(value?.requiresWoodenCrate),
  requiresInsurance: Boolean(value?.requiresInsurance),
});

const areServiceValuesEqual = (firstValue, secondValue) => {
  const first = normalizeServiceValue(firstValue);
  const second = normalizeServiceValue(secondValue);

  return SERVICE_OPTIONS.every(
    (service) => first[service.key] === second[service.key],
  );
};

export default function PackageOptionalServices({
  value = EMPTY_PACKAGE_SERVICES,
  disabled = false,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(() =>
    normalizeServiceValue(value),
  );

  useEffect(() => {
    if (isOpen) {
      setDraftValue(normalizeServiceValue(value));
    }
  }, [isOpen, value]);

  const selectedServices = useMemo(
    () => SERVICE_OPTIONS.filter((service) => Boolean(value?.[service.key])),
    [value],
  );

  const selectedDraftServices = useMemo(
    () =>
      SERVICE_OPTIONS.filter((service) => Boolean(draftValue?.[service.key])),
    [draftValue],
  );

  const hasChanges = useMemo(
    () => !areServiceValuesEqual(value, draftValue),
    [draftValue, value],
  );

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    setDraftValue(normalizeServiceValue(value));
    setIsOpen(true);
  };

  const handleToggle = (serviceKey) => {
    if (disabled) {
      return;
    }

    setDraftValue((previous) => ({
      ...previous,
      [serviceKey]: !previous[serviceKey],
    }));
  };

  const handleClose = () => {
    setDraftValue(normalizeServiceValue(value));
    setIsOpen(false);
  };

  const handleSave = () => {
    if (disabled) {
      return;
    }

    const normalizedValue = normalizeServiceValue(draftValue);
    const selectedNames = SERVICE_OPTIONS.filter((service) =>
      Boolean(normalizedValue[service.key]),
    ).map((service) => service.shortTitle);

    try {
      onChange?.(normalizedValue);
      setIsOpen(false);

      if (selectedNames.length > 0) {
        AuthNotify.success(
          "Đã lưu dịch vụ bổ sung",
          `Đã chọn: ${selectedNames.join(", ")}.`,
        );
      } else {
        AuthNotify.success(
          "Đã cập nhật dịch vụ",
          "Đơn ký gửi không sử dụng dịch vụ bổ sung.",
        );
      }
    } catch (error) {
      AuthNotify.error(
        "Không thể lưu dịch vụ",
        error?.message || "Đã xảy ra lỗi khi lưu lựa chọn dịch vụ.",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className={[
          "package-services-trigger",
          selectedServices.length > 0 && "package-services-trigger--active",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleOpen}
      >
        <span className="package-services-trigger__icon" aria-hidden="true">
          <GiftOutlined />
        </span>

        <span className="package-services-trigger__body">
          <span className="package-services-trigger__title-row">
            <strong>Dịch vụ bổ sung cho đơn ký gửi</strong>

            <Tooltip
              placement="top"
              title="Các dịch vụ này không bắt buộc và được áp dụng chung cho đơn ký gửi."
            >
              <InfoCircleOutlined
                aria-label="Thông tin dịch vụ bổ sung"
                className="package-services-trigger__info"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
            </Tooltip>
          </span>

          {selectedServices.length > 0 ? (
            <span className="package-services-trigger__chips">
              {selectedServices.map((service) => (
                <span key={service.key}>
                  <CheckOutlined />
                  {service.shortTitle}
                </span>
              ))}
            </span>
          ) : (
            <span className="package-services-trigger__description">
              Chọn đóng gói, đóng kiện gỗ hoặc bảo hiểm hàng hóa khi cần.
            </span>
          )}
        </span>

        <span
          className={[
            "package-services-trigger__status",
            selectedServices.length > 0 ? "is-active" : "is-optional",
          ].join(" ")}
        >
          <span className="package-services-trigger__status-dot" />

          {selectedServices.length > 0
            ? `${selectedServices.length} dịch vụ`
            : "Không bắt buộc"}
        </span>
      </button>

      <Modal
        open={isOpen}
        centered
        width={760}
        footer={null}
        closable={!disabled}
        maskClosable={!disabled}
        keyboard={!disabled}
        destroyOnHidden
        closeIcon={<CloseOutlined />}
        className="package-services-modal"
        onCancel={handleClose}
      >
        <div className="package-services-modal__header">
          <span
            className="package-services-modal__header-icon"
            aria-hidden="true"
          >
            <GiftOutlined />
          </span>

          <div className="package-services-modal__header-content">
            <span className="package-services-modal__eyebrow">
              Dịch vụ chung cho đơn
            </span>

            <h2>Lựa chọn dịch vụ bổ sung</h2>

            <p>
              Các dịch vụ dưới đây không bắt buộc và chỉ được tính phí khi bạn
              lựa chọn.
            </p>
          </div>
        </div>

        <div className="package-services-modal__notice">
          <InfoCircleOutlined />

          <span>
            Chi phí chính thức sẽ được nhân viên kiểm tra và xác nhận trong báo
            giá của đơn hàng.
          </span>
        </div>

        <div className="package-services-modal__list">
          {SERVICE_OPTIONS.map((service, serviceIndex) => {
            const Icon = service.icon;
            const isChecked = Boolean(draftValue[service.key]);

            return (
              <div
                key={service.key}
                role="checkbox"
                tabIndex={disabled ? -1 : 0}
                aria-checked={isChecked}
                style={{ "--service-index": serviceIndex }}
                className={[
                  "package-services-modal__item",
                  isChecked && "package-services-modal__item--selected",
                  disabled && "package-services-modal__item--disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleToggle(service.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleToggle(service.key);
                  }
                }}
              >
                <span className="package-services-modal__checkbox">
                  <Checkbox
                    checked={isChecked}
                    disabled={disabled}
                    tabIndex={-1}
                    style={{ pointerEvents: "none" }}
                  />
                </span>

                <span
                  className="package-services-modal__service-icon"
                  aria-hidden="true"
                >
                  <Icon />
                </span>

                <span className="package-services-modal__content">
                  <span className="package-services-modal__title-row">
                    <strong>{service.title}</strong>

                    <Tooltip placement="top" title={service.information}>
                      <InfoCircleOutlined
                        aria-label={`Thông tin ${service.title}`}
                        className="package-services-modal__info-icon"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      />
                    </Tooltip>
                  </span>

                  <span className="package-services-modal__description">
                    {service.description}
                  </span>
                </span>

                <span className="package-services-modal__fee">
                  <small>Phí dịch vụ</small>
                  <strong>{service.feeText}</strong>
                </span>
              </div>
            );
          })}
        </div>

        <div className="package-services-modal__summary">
          <div className="package-services-modal__summary-count">
            <span>Dịch vụ đã chọn</span>
            <strong>{selectedDraftServices.length}</strong>
          </div>

          <p>
            {selectedDraftServices.length > 0
              ? selectedDraftServices
                  .map((service) => service.shortTitle)
                  .join(", ")
              : "Chưa chọn dịch vụ bổ sung"}
          </p>
        </div>

        <div className="package-services-modal__footer">
          <button
            type="button"
            className="package-services-modal__cancel"
            disabled={disabled}
            onClick={handleClose}
          >
            <CloseOutlined />
            Hủy
          </button>

          <button
            type="button"
            className={[
              "package-services-modal__save",
              hasChanges && "has-changes",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled}
            onClick={handleSave}
          >
            <CheckOutlined />
            Lưu lựa chọn
          </button>
        </div>
      </Modal>
    </>
  );
}