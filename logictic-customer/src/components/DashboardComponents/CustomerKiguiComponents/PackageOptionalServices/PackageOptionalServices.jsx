import React, { useEffect, useMemo, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  GiftOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { Checkbox, Modal, Tooltip } from "antd";

import pricingRuleService from "../../../../api/ServiceApi/pricingRuleService";
import AuthNotify from "../../../../utils/AuthNotify";
import "./PackageOptionalServices.css";

const ACTIVE_STATUS = "ACTIVE";
const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";

const LEGACY_RULE_KEYS = {
  WOOD_CRATE: "requiresWoodenCrate",
  SUR_INSURANCE_3PERCENT: "requiresInsurance",
  SUR_INSPECTION: "requiresInspection",
};

export const EMPTY_PACKAGE_SERVICES = {
  requiresPacking: false,
  requiresWoodenCrate: false,
  requiresInsurance: false,
  requiresInspection: false,
  selectedRuleCodes: [],
  selectedPricingRuleIds: [],
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeRule = (rule = {}) => ({
  ...rule,
  id: String(rule?.id || rule?.pricingRuleId || "").trim(),
  servicePricingId:
    String(rule?.servicePricingId || "").trim() || null,
  ruleName: String(rule?.ruleName || "").trim(),
  ruleCode: normalizeCode(rule?.ruleCode),
  ruleType: normalizeCode(rule?.ruleType),
  conditionType:
    rule?.conditionType === null || rule?.conditionType === undefined
      ? null
      : String(rule.conditionType).trim(),
  conditionValue:
    rule?.conditionValue === null || rule?.conditionValue === undefined
      ? null
      : String(rule.conditionValue).trim(),
  calculationType: normalizeCode(rule?.calculationType),
  value: toFiniteNumberOrNull(rule?.value),
  minAmount: toFiniteNumberOrNull(rule?.minAmount),
  maxAmount: toFiniteNumberOrNull(rule?.maxAmount),
  isRequired: Boolean(rule?.isRequired),
  status: normalizeCode(rule?.status),
  description: String(rule?.description || "").trim(),
});

const normalizeRulesFromApi = (result) => {
  const candidates = [
    result,
    result?.items,
    result?.pricingRules,
    result?.rules,
    result?.data,
    result?.data?.items,
    result?.data?.pricingRules,
    result?.data?.rules,
  ];

  const rawRules = candidates.find(Array.isArray) || [];

  return rawRules
    .filter((rule) => rule && typeof rule === "object")
    .map(normalizeRule)
    .filter((rule) => rule.id || rule.ruleCode);
};

const formatMoney = (value) => {
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

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(number);
};

const formatConditionUnit = (conditionType) => {
  const value = String(conditionType || "").trim();

  if (!value) {
    return "";
  }

  return value
    .replace(/^VND\s*\/\s*/i, "/")
    .replace(/^₫\s*\/\s*/i, "/");
};

const formatRuleFee = (rule) => {
  const calculationType = normalizeCode(rule?.calculationType);
  const value = toFiniteNumberOrNull(rule?.value);
  const unit = formatConditionUnit(rule?.conditionType);

  if (value === null) {
    return "Chưa có mức phí";
  }

  if (calculationType === "PERCENTAGE") {
    return `${formatNumber(value)}%`;
  }

  if (calculationType === "FIXED") {
    return `${formatMoney(value)}${unit}`;
  }

  return `${formatNumber(value)}${unit}`;
};

const formatRuleInformation = (rule) => {
  const parts = [];

  if (rule.description) {
    parts.push(rule.description);
  }

  if (rule.conditionType) {
    parts.push(`Điều kiện: ${rule.conditionType}.`);
  }

  if (rule.conditionValue) {
    const conditionNumber = toFiniteNumberOrNull(rule.conditionValue);
    parts.push(
      `Giá trị điều kiện: ${
        conditionNumber === null
          ? rule.conditionValue
          : formatMoney(conditionNumber)
      }.`,
    );
  }

  if (rule.minAmount !== null) {
    parts.push(`Phí tối thiểu: ${formatMoney(rule.minAmount)}.`);
  }

  if (rule.maxAmount !== null) {
    parts.push(`Phí tối đa: ${formatMoney(rule.maxAmount)}.`);
  }

  return parts.join(" ") || "API chưa cung cấp mô tả cho quy tắc này.";
};

const getRuleIcon = (rule) => {
  const code = normalizeCode(rule?.ruleCode);
  const type = normalizeCode(rule?.ruleType);

  if (code === VOLUMETRIC_DIVISOR_CODE) {
    return SettingOutlined;
  }

  if (code.includes("WOOD") || type.includes("WOOD")) {
    return InboxOutlined;
  }

  if (code.includes("INSURANCE") || type.includes("INSURANCE")) {
    return SafetyCertificateOutlined;
  }

  if (code.includes("DOMESTIC") || type.includes("DOMESTIC")) {
    return CarOutlined;
  }

  return GiftOutlined;
};

const isTechnicalRule = (rule) =>
  normalizeCode(rule?.ruleCode) === VOLUMETRIC_DIVISOR_CODE;

const isRuleSelectable = (rule) =>
  !isTechnicalRule(rule) && normalizeCode(rule?.status) === ACTIVE_STATUS;

const getInitialSelectedCodes = (value, rules) => {
  const selectedCodes = new Set();

  const codeCandidates = [
    value?.selectedRuleCodes,
    value?.selectedPricingRuleCodes,
    value?.pricingRuleCodes,
  ];

  codeCandidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.map(normalizeCode).filter(Boolean).forEach((code) => {
        selectedCodes.add(code);
      });
    }
  });

  Object.entries(LEGACY_RULE_KEYS).forEach(([ruleCode, legacyKey]) => {
    if (value?.[legacyKey]) {
      selectedCodes.add(ruleCode);
    }
  });

  rules.forEach((rule) => {
    if (rule.isRequired && isRuleSelectable(rule)) {
      selectedCodes.add(rule.ruleCode);
    }
  });

  return Array.from(selectedCodes);
};

const areCodeArraysEqual = (first = [], second = []) => {
  const firstSet = new Set(first.map(normalizeCode).filter(Boolean));
  const secondSet = new Set(second.map(normalizeCode).filter(Boolean));

  if (firstSet.size !== secondSet.size) {
    return false;
  }

  return Array.from(firstSet).every((code) => secondSet.has(code));
};

export default function PackageOptionalServices({
  value = EMPTY_PACKAGE_SERVICES,
  disabled = false,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pricingRules, setPricingRules] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [draftSelectedCodes, setDraftSelectedCodes] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPricingRules = async () => {
      try {
        setPricingLoading(true);
        setPricingError("");

        // Gọi đúng endpoint và lấy TOÀN BỘ dữ liệu thật từ API.
        // Không truyền ruleCodes, không dùng mảng dữ liệu mẫu.
        const result = await pricingRuleService.getPricingRules({
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const normalizedRules = normalizeRulesFromApi(result);
        setPricingRules(normalizedRules);
      } catch (error) {
        if (controller.signal.aborted || isCanceledRequest(error)) {
          return;
        }

        console.error(
          "[PackageOptionalServices] Lỗi tải /api/pricing-rules:",
          error,
        );

        setPricingRules([]);
        setPricingError(
          error?.message || "Không thể tải danh sách quy tắc tính phí.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setPricingLoading(false);
        }
      }
    };

    fetchPricingRules();

    return () => controller.abort();
  }, []);

  const selectedCodes = useMemo(
    () => getInitialSelectedCodes(value, pricingRules),
    [pricingRules, value],
  );

  useEffect(() => {
    if (isOpen) {
      setDraftSelectedCodes(selectedCodes);
    }
  }, [isOpen, selectedCodes]);

  const selectedRules = useMemo(() => {
    const selectedSet = new Set(selectedCodes);
    return pricingRules.filter((rule) => selectedSet.has(rule.ruleCode));
  }, [pricingRules, selectedCodes]);

  const selectedDraftRules = useMemo(() => {
    const selectedSet = new Set(draftSelectedCodes);
    return pricingRules.filter((rule) => selectedSet.has(rule.ruleCode));
  }, [draftSelectedCodes, pricingRules]);

  const hasChanges = useMemo(
    () => !areCodeArraysEqual(selectedCodes, draftSelectedCodes),
    [draftSelectedCodes, selectedCodes],
  );

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    setDraftSelectedCodes(selectedCodes);
    setIsOpen(true);
  };

  const handleToggle = (rule) => {
    if (disabled || !isRuleSelectable(rule) || rule.isRequired) {
      return;
    }

    setDraftSelectedCodes((currentCodes) => {
      const nextCodes = new Set(currentCodes);

      if (nextCodes.has(rule.ruleCode)) {
        nextCodes.delete(rule.ruleCode);
      } else {
        nextCodes.add(rule.ruleCode);
      }

      return Array.from(nextCodes);
    });
  };

  const handleClose = () => {
    setDraftSelectedCodes(selectedCodes);
    setIsOpen(false);
  };

  const handleSave = () => {
    if (disabled) {
      return;
    }

    const selectedSet = new Set(draftSelectedCodes);
    const activeSelectedRules = pricingRules.filter(
      (rule) => selectedSet.has(rule.ruleCode) && isRuleSelectable(rule),
    );

    const selectedRuleCodes = activeSelectedRules.map((rule) => rule.ruleCode);
    const selectedPricingRuleIds = activeSelectedRules
      .map((rule) => rule.id)
      .filter(Boolean);

    const nextValue = {
      ...value,
      requiresPacking: selectedRuleCodes.some((code) =>
        code.includes("PACKING"),
      ),
      requiresWoodenCrate: selectedRuleCodes.includes("WOOD_CRATE"),
      requiresInsurance: activeSelectedRules.some(
        (rule) =>
          rule.ruleCode.includes("INSURANCE") ||
          rule.ruleType.includes("INSURANCE"),
      ),
      requiresInspection: activeSelectedRules.some(
        (rule) =>
          rule.ruleCode.includes("INSPECTION") ||
          rule.ruleType.includes("INSPECTION"),
      ),
      selectedRuleCodes,
      selectedPricingRuleIds,
    };

    try {
      onChange?.(nextValue);
      setIsOpen(false);

      if (activeSelectedRules.length > 0) {
        AuthNotify.success(
          "Đã lưu dịch vụ bổ sung",
          `Đã chọn: ${activeSelectedRules
            .map((rule) => rule.ruleName || rule.ruleCode)
            .join(", ")}.`,
        );
      } else {
        AuthNotify.success(
          "Đã cập nhật dịch vụ",
          "Đơn ký gửi không chọn quy tắc dịch vụ bổ sung.",
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
          selectedRules.length > 0 && "package-services-trigger--active",
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
            <strong>Quy tắc và dịch vụ từ bảng giá</strong>

            <Tooltip
              placement="top"
              title="Danh sách được tải trực tiếp từ API /api/pricing-rules."
            >
              <InfoCircleOutlined
                aria-label="Thông tin bảng giá"
                className="package-services-trigger__info"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
            </Tooltip>
          </span>

          {selectedRules.length > 0 ? (
            <span className="package-services-trigger__chips">
              {selectedRules.map((rule) => (
                <span key={rule.id || rule.ruleCode}>
                  <CheckOutlined />
                  {rule.ruleName || rule.ruleCode}
                </span>
              ))}
            </span>
          ) : (
            <span className="package-services-trigger__description">
              {pricingLoading
                ? "Đang tải dữ liệu bảng giá..."
                : `${pricingRules.length} quy tắc được trả về từ API.`}
            </span>
          )}
        </span>

        <span
          className={[
            "package-services-trigger__status",
            selectedRules.length > 0 ? "is-active" : "is-optional",
          ].join(" ")}
        >
          <span className="package-services-trigger__status-dot" />
          {selectedRules.length > 0
            ? `${selectedRules.length} đã chọn`
            : "Không bắt buộc"}
        </span>
      </button>

      <Modal
        open={isOpen}
        centered
        width={800}
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
              DỮ LIỆU TRỰC TIẾP TỪ API
            </span>
            <h2>Danh sách quy tắc tính phí</h2>
            <p>
              Hiển thị toàn bộ dữ liệu trả về từ endpoint /api/pricing-rules,
              không sử dụng dữ liệu mẫu.
            </p>
          </div>
        </div>

        <div className="package-services-modal__notice">
          {pricingLoading ? <LoadingOutlined spin /> : <InfoCircleOutlined />}
          <span>
            {pricingLoading
              ? "Đang gọi GET /api/pricing-rules..."
              : pricingError
                ? pricingError
                : `API trả về ${pricingRules.length} quy tắc. Quy tắc hệ thống vẫn được hiển thị nhưng không cho chọn.`}
          </span>
        </div>

        <div className="package-services-modal__list">
          {pricingLoading ? (
            <div className="package-services-modal__api-state">
              <LoadingOutlined spin />
              <strong>Đang tải dữ liệu thật từ API</strong>
              <span>Không sử dụng dữ liệu dự phòng.</span>
            </div>
          ) : pricingError ? (
            <div className="package-services-modal__api-state is-error">
              <InfoCircleOutlined />
              <strong>Không tải được pricing rules</strong>
              <span>{pricingError}</span>
            </div>
          ) : pricingRules.length === 0 ? (
            <div className="package-services-modal__api-state">
              <InfoCircleOutlined />
              <strong>API không trả về quy tắc nào</strong>
              <span>Danh sách đang để trống, không chèn dữ liệu mẫu.</span>
            </div>
          ) : (
            pricingRules.map((rule, ruleIndex) => {
              const Icon = getRuleIcon(rule);
              const checked = draftSelectedCodes.includes(rule.ruleCode);
              const selectable = isRuleSelectable(rule);
              const itemDisabled = disabled || !selectable || rule.isRequired;

              return (
                <div
                  key={rule.id || rule.ruleCode || ruleIndex}
                  role="checkbox"
                  tabIndex={itemDisabled ? -1 : 0}
                  aria-checked={checked}
                  aria-disabled={itemDisabled}
                  style={{ "--service-index": ruleIndex }}
                  className={[
                    "package-services-modal__item",
                    checked && "package-services-modal__item--selected",
                    itemDisabled && "package-services-modal__item--disabled",
                    isTechnicalRule(rule) &&
                      "package-services-modal__item--technical",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleToggle(rule)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleToggle(rule);
                    }
                  }}
                >
                  <span className="package-services-modal__checkbox">
                    <Checkbox
                      checked={checked}
                      disabled={itemDisabled}
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
                      <strong>{rule.ruleName || rule.ruleCode || "Quy tắc"}</strong>

                      <Tooltip placement="top" title={formatRuleInformation(rule)}>
                        <InfoCircleOutlined
                          aria-label={`Thông tin ${rule.ruleName || rule.ruleCode}`}
                          className="package-services-modal__info-icon"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        />
                      </Tooltip>
                    </span>

                    <span className="package-services-modal__rule-meta">
                      <b>{rule.ruleCode || "KHÔNG CÓ MÃ"}</b>
                      <i>{rule.ruleType || "KHÔNG CÓ LOẠI"}</i>
                      <em className={`status-${rule.status.toLowerCase()}`}>
                        {rule.status || "CHƯA CÓ TRẠNG THÁI"}
                      </em>
                    </span>

                    <span className="package-services-modal__description">
                      {rule.description || "API chưa cung cấp mô tả."}
                    </span>
                  </span>

                  <span className="package-services-modal__fee">
                    <small>
                      {isTechnicalRule(rule)
                        ? "Quy tắc hệ thống"
                        : rule.calculationType || "Cách tính phí"}
                    </small>
                    <strong>{formatRuleFee(rule)}</strong>
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="package-services-modal__summary">
          <div className="package-services-modal__summary-count">
            <span>Quy tắc đã chọn</span>
            <strong>{selectedDraftRules.length}</strong>
          </div>
          <p>
            {selectedDraftRules.length > 0
              ? selectedDraftRules
                  .map((rule) => rule.ruleName || rule.ruleCode)
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
            disabled={disabled || pricingLoading || Boolean(pricingError)}
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
