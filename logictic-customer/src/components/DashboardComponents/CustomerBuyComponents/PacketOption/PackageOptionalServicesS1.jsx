import React, { useEffect, useMemo, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  GiftOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { Checkbox, Modal, Tooltip } from "antd";

import pricingRuleService from "../../../../api/ServiceApi/pricingRuleService";
import AuthNotify from "../../../../utils/AuthNotify";
import "./PackageOptionalServicesS1.css";


const ACTIVE_STATUS = "ACTIVE";
const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";


const HIDDEN_RULE_CODES = new Set([
  "DOMESTIC_FEE",
]);


const HIDDEN_RULE_IDS = new Set([
  "0385131b-214c-49b8-9de2-116d62f27111",
]);

const normalizeRuleId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


const STATUS_LABELS = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Ngừng áp dụng",
  PENDING: "Chờ áp dụng",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hiệu lực",
  DISABLED: "Tạm ngưng",
  DRAFT: "Bản nháp",
  DELETED: "Đã xóa",
};

const CALCULATION_TYPE_LABELS = {
  FIXED: "Phí cố định",
  PERCENTAGE: "Tính theo phần trăm",
  PER_UNIT: "Tính theo đơn vị",
  RANGE: "Tính theo khoảng",
  FORMULA: "Tính theo công thức",
};

const RULE_CODE_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm",
};

const RULE_TYPE_LABELS = {
  WOOD_BOX: "Thùng gỗ",
  DOMESTIC_FEE: "Vận chuyển nội địa",
  INSPECTION: "Kiểm hàng",
  INSURANCE: "Bảo hiểm hàng hóa",
  PACKING: "Đóng gói hàng hóa",
};

const CONDITION_TYPE_LABELS = {
  REQUIRES_INSPECTION: "Áp dụng khi yêu cầu kiểm hàng",
  MIN_DECLARED_VALUE: "Giá trị khai báo tối thiểu",
  MAX_DECLARED_VALUE: "Giá trị khai báo tối đa",
  REQUIRES_INSURANCE: "Áp dụng khi yêu cầu bảo hiểm",
};

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
  packageConfigurationByPackageId: {},
  selectedPackageConfigurations: [],
  woodCrateBaseFee: 0,
  woodCrateConfigurationFee: 0,
  woodCrateTotalFee: 0,
};

const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const isHiddenRule = (rule) => {
  const ruleCode = normalizeCode(rule?.ruleCode);
  const ruleType = normalizeCode(rule?.ruleType);
  const ruleId = normalizeRuleId(rule?.id || rule?.pricingRuleId);

  return (
    HIDDEN_RULE_CODES.has(ruleCode) ||
    HIDDEN_RULE_CODES.has(ruleType) ||
    HIDDEN_RULE_IDS.has(ruleId)
  );
};

const sanitizeSelectedRuleCodes = (value) => {
  return Array.from(
    new Set(
      normalizeStringArray(value)
        .map(normalizeCode)
        .filter(Boolean)
        .filter((ruleCode) => !HIDDEN_RULE_CODES.has(ruleCode)),
    ),
  );
};

const sanitizeSelectedPricingRuleIds = (
  value,
  hiddenRuleIds = [],
) => {
  const blockedIds = new Set([
    ...Array.from(HIDDEN_RULE_IDS),
    ...normalizeStringArray(hiddenRuleIds).map(normalizeRuleId),
  ]);

  return Array.from(
    new Set(
      normalizeStringArray(value)
        .map(normalizeRuleId)
        .filter(Boolean)
        .filter((ruleId) => !blockedIds.has(ruleId)),
    ),
  );
};

const areStringArraysEqual = (first = [], second = []) => {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
    (value, index) => value === second[index],
  );
};

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
    .filter((rule) => rule.id || rule.ruleCode)
    .filter(
      (rule) =>
        rule.ruleCode !== VOLUMETRIC_DIVISOR_CODE &&
        rule.ruleType !== VOLUMETRIC_DIVISOR_CODE,
    );
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


  const unitMatch = value.match(
    /^(?:VND|VNĐ|₫|Đ)\s*\/\s*(.+)$/i,
  );

  if (!unitMatch?.[1]) {
    return "";
  }

  return `/${unitMatch[1].trim()}`;
};

const getStatusLabel = (status) => {
  const normalizedStatus = normalizeCode(status);

  return (
    STATUS_LABELS[normalizedStatus] ||
    "Chưa xác định"
  );
};

const getStatusClassName = (status) => {
  const normalizedStatus = normalizeCode(status);

  return normalizedStatus
    ? normalizedStatus.toLowerCase().replaceAll("_", "-")
    : "unknown";
};

const getCalculationTypeLabel = (calculationType) => {
  const normalizedType = normalizeCode(calculationType);

  return (
    CALCULATION_TYPE_LABELS[normalizedType] ||
    "Cách tính theo chính sách"
  );
};

const getRuleDisplayName = (rule) => {
  const code = normalizeCode(rule?.ruleCode);

  return (
    String(rule?.ruleName || "").trim() ||
    RULE_CODE_LABELS[code] ||
    "Dịch vụ bổ sung"
  );
};

const getRuleCodeLabel = (rule) => {
  const code = normalizeCode(rule?.ruleCode);

  return (
    RULE_CODE_LABELS[code] ||
    getRuleDisplayName(rule)
  );
};

const getRuleTypeLabel = (rule) => {
  const type = normalizeCode(rule?.ruleType);

  return (
    RULE_TYPE_LABELS[type] ||
    "Dịch vụ"
  );
};

const getConditionTypeLabel = (conditionType) => {
  const normalizedCondition = normalizeCode(conditionType);

  return (
    CONDITION_TYPE_LABELS[normalizedCondition] ||
    "Điều kiện theo chính sách dịch vụ"
  );
};

const formatRuleDescription = (description) => {
  const value = String(description || "").trim();

  if (!value) {
    return "Hệ thống chưa cung cấp mô tả cho dịch vụ này.";
  }

  return value
    .replace(/declared\s*value/gi, "giá trị khai báo")
    .replace(/\b(\d+)\s*k\b/gi, (_, amount) => {
      const numericAmount = Number(amount) * 1000;
      return formatMoney(numericAmount);
    })
    .replace(/\b(\d+)\s*tr\b/gi, "$1 triệu đồng");
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

  return unit
    ? `${formatNumber(value)}${unit}`
    : formatNumber(value);
};

const formatRuleInformation = (rule) => {
  const parts = [];
  const conditionCode = normalizeCode(rule?.conditionType);
  const conditionUnit = formatConditionUnit(rule?.conditionType);
  const conditionNumber = toFiniteNumberOrNull(rule?.conditionValue);

  parts.push(formatRuleDescription(rule?.description));

  if (conditionUnit) {
    parts.push(
      `Đơn vị tính: ${String(rule.conditionType).trim()}.`,
    );
  } else if (conditionCode === "REQUIRES_INSPECTION") {
    parts.push("Áp dụng khi đơn hàng có yêu cầu kiểm hàng.");
  } else if (conditionCode === "MIN_DECLARED_VALUE") {
    parts.push(
      conditionNumber === null
        ? "Áp dụng từ mức giá trị khai báo tối thiểu theo chính sách."
        : `Áp dụng từ giá trị khai báo ${formatMoney(conditionNumber)}.`,
    );
  } else if (conditionCode === "MAX_DECLARED_VALUE") {
    parts.push(
      conditionNumber === null
        ? "Áp dụng đến mức giá trị khai báo tối đa theo chính sách."
        : `Áp dụng đến giá trị khai báo ${formatMoney(conditionNumber)}.`,
    );
  } else if (rule?.conditionType) {
    parts.push(
      `Điều kiện áp dụng: ${getConditionTypeLabel(rule.conditionType)}.`,
    );

    if (rule?.conditionValue) {
      parts.push(
        conditionNumber === null
          ? `Giá trị điều kiện: ${rule.conditionValue}.`
          : `Giá trị điều kiện: ${formatMoney(conditionNumber)}.`,
      );
    }
  }

  if (rule?.minAmount !== null) {
    parts.push(`Phí tối thiểu: ${formatMoney(rule.minAmount)}.`);
  }

  if (rule?.maxAmount !== null) {
    parts.push(`Phí tối đa: ${formatMoney(rule.maxAmount)}.`);
  }

  return parts.filter(Boolean).join(" ");
};

const getRuleIcon = (rule) => {
  const code = normalizeCode(rule?.ruleCode);
  const type = normalizeCode(rule?.ruleType);

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

const isRuleSelectable = (rule) =>
  normalizeCode(rule?.status) === ACTIVE_STATUS;

const getInitialSelectedCodes = (value, rules) => {
  const selectedCodes = new Set();

  const codeCandidates = [
    value?.selectedRuleCodes,
    value?.selectedPricingRuleCodes,
    value?.pricingRuleCodes,
  ];

  codeCandidates.forEach((candidate) => {
    sanitizeSelectedRuleCodes(candidate).forEach((code) => {
      selectedCodes.add(code);
    });
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


const PACKAGE_CONFIGURATION_LABELS = {
  SMALL: {
    name: "Thùng cỡ nhỏ",
    size: "CỠ NHỎ",
  },
  MEDIUM: {
    name: "Thùng cỡ vừa",
    size: "CỠ VỪA",
  },
  LARGE: {
    name: "Thùng cỡ lớn",
    size: "CỠ LỚN",
  },
  CUSTOM: {
    name: "Thùng tùy chỉnh",
    size: "TÙY CHỈNH",
  },
};

const normalizePackageConfiguration = (configuration = {}) => {
  const id = String(
    configuration?.id ||
      configuration?.packageConfigurationId ||
      "",
  ).trim();

  return {
    ...configuration,
    id,
    packageConfigurationId: id,
    configCode: normalizeCode(
      configuration?.configCode ||
        configuration?.code,
    ),
    configName: String(
      configuration?.configName ||
        configuration?.name ||
        "Cấu hình thùng",
    ).trim(),
    length:
      toFiniteNumberOrNull(configuration?.length) ?? 0,
    width:
      toFiniteNumberOrNull(configuration?.width) ?? 0,
    height:
      toFiniteNumberOrNull(configuration?.height) ?? 0,
    maxWeight:
      toFiniteNumberOrNull(
        configuration?.maxWeight,
      ) ?? 0,
    packageFee:
      toFiniteNumberOrNull(
        configuration?.packageFee,
      ) ?? 0,
    estimatedFee:
      toFiniteNumberOrNull(
        configuration?.estimatedFee,
      ),
    status: normalizeCode(
      configuration?.status,
    ),
  };
};

const normalizePackageConfigurationsFromApi = (
  result,
) => {
  const candidates = [
    result,
    result?.items,
    result?.packageConfigurations,
    result?.configurations,
    result?.data,
    result?.data?.items,
    result?.data?.packageConfigurations,
    result?.data?.configurations,
  ];

  const rawConfigurations =
    candidates.find(Array.isArray) || [];

  return rawConfigurations
    .filter(
      (configuration) =>
        configuration &&
        typeof configuration === "object",
    )
    .map(normalizePackageConfiguration)
    .filter(
      (configuration) =>
        configuration.id &&
        (
          !configuration.status ||
          configuration.status === ACTIVE_STATUS
        ),
    );
};

const normalizePackageConfigurationMap = (
  value,
) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([packageId, configurationId]) => [
        String(packageId || "").trim(),
        String(configurationId || "").trim(),
      ])
      .filter(
        ([packageId, configurationId]) =>
          packageId && configurationId,
      ),
  );
};

const areConfigurationMapsEqual = (
  first,
  second,
) => {
  const firstMap =
    normalizePackageConfigurationMap(first);
  const secondMap =
    normalizePackageConfigurationMap(second);

  const firstKeys =
    Object.keys(firstMap).sort();
  const secondKeys =
    Object.keys(secondMap).sort();

  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  return firstKeys.every(
    (key, index) =>
      key === secondKeys[index] &&
      firstMap[key] === secondMap[key],
  );
};

const getPackageId = (
  packageItem,
  index,
) =>
  String(
    packageItem?.id ||
      packageItem?.packageId ||
      `package-${index + 1}`,
  ).trim();

const getPackageDisplayName = (
  packageItem,
  index,
) =>
  String(
    packageItem?.productName ||
      packageItem?.name ||
      `Kiện hàng ${index + 1}`,
  ).trim();

const getPackageMeasurements = (
  packageItem = {},
) => ({
  length:
    toFiniteNumberOrNull(
      packageItem?.length,
    ) ?? 0,
  width:
    toFiniteNumberOrNull(
      packageItem?.width,
    ) ?? 0,
  height:
    toFiniteNumberOrNull(
      packageItem?.height,
    ) ?? 0,
  weight:
    toFiniteNumberOrNull(
      packageItem?.weight,
    ) ?? 0,
});

const hasCompletePackageDimensions = (
  packageItem,
) => {
  const {
    length,
    width,
    height,
    weight,
  } = getPackageMeasurements(
    packageItem,
  );

  return (
    weight > 0 &&
    length > 0 &&
    width > 0 &&
    height > 0
  );
};

const formatPackageMeasurements = (
  packageItem,
) => {
  const {
    length,
    width,
    height,
    weight,
  } = getPackageMeasurements(
    packageItem,
  );

  if (
    weight <= 0 ||
    length <= 0 ||
    width <= 0 ||
    height <= 0
  ) {
    return "Chưa nhập đủ cân nặng, dài × rộng × cao";
  }

  return `${formatNumber(
    length,
  )} × ${formatNumber(
    width,
  )} × ${formatNumber(
    height,
  )} cm • ${formatNumber(
    weight,
  )} kg`;
};

const getConfigurationDisplay = (
  configuration = {},
) => {
  const configCode = normalizeCode(
    configuration?.configCode,
  );

  const translated =
    PACKAGE_CONFIGURATION_LABELS[configCode];

  return {
    name:
      translated?.name ||
      configuration?.configName ||
      "Cấu hình thùng",
    size:
      translated?.size ||
      configCode.replaceAll("_", " "),
  };
};

const getConfigurationFee = (
  configuration,
) =>
  toFiniteNumberOrNull(
    configuration?.estimatedFee,
  ) ??
  toFiniteNumberOrNull(
    configuration?.packageFee,
  ) ??
  0;

const isCustomConfiguration = (
  configuration,
) =>
  normalizeCode(
    configuration?.configCode,
  ) === "CUSTOM";

const canPackageFitConfiguration = (
  packageItem,
  configuration,
) => {
  if (
    !hasCompletePackageDimensions(
      packageItem,
    )
  ) {
    return false;
  }

  if (
    isCustomConfiguration(
      configuration,
    )
  ) {
    return true;
  }

  const packageMeasurements =
    getPackageMeasurements(packageItem);

  const packageDimensions = [
    packageMeasurements.length,
    packageMeasurements.width,
    packageMeasurements.height,
  ].sort((first, second) => second - first);

  const configurationDimensions = [
    Number(configuration?.length) || 0,
    Number(configuration?.width) || 0,
    Number(configuration?.height) || 0,
  ].sort((first, second) => second - first);

  const dimensionsFit =
    packageDimensions.every(
      (dimension, index) =>
        dimension <=
        configurationDimensions[index],
    );

  const maxWeight =
    Number(configuration?.maxWeight) || 0;

  const weightFits =
    packageMeasurements.weight <= 0 ||
    maxWeight <= 0 ||
    packageMeasurements.weight <= maxWeight;

  return dimensionsFit && weightFits;
};

const calculateWoodCratePricing = ({
  packages,
  configurations,
  configurationMap,
  baseFeePerPackage,
  enabled,
}) => {
  if (!enabled) {
    return {
      baseFee: 0,
      configurationFee: 0,
      totalFee: 0,
      rows: [],
    };
  }

  const configurationById = new Map(
    configurations.map(
      (configuration) => [
        configuration.id,
        configuration,
      ],
    ),
  );

  const rows = packages.map(
    (packageItem, index) => {
      const packageId =
        getPackageId(
          packageItem,
          index,
        );

      const configurationId =
        String(
          configurationMap?.[packageId] ||
            "",
        ).trim();

      const configuration =
        configurationById.get(
          configurationId,
        ) || null;

      const hasSelectedConfiguration =
        Boolean(configuration);

      /*
       * Ngay khi chọn dịch vụ WOOD_CRATE,
       * phí đóng gói mặc định được áp dụng
       * cho toàn bộ kiện hàng.
       */
      const baseFee =
        Number(baseFeePerPackage) || 0;

      const configurationFee =
        hasSelectedConfiguration
          ? getConfigurationFee(
              configuration,
            )
          : 0;

      return {
        packageId,
        configuration,
        hasSelectedConfiguration,
        baseFee,
        configurationFee,
        totalFee:
          baseFee +
          configurationFee,
      };
    },
  );

  return {
    baseFee: rows.reduce(
      (total, row) =>
        total + row.baseFee,
      0,
    ),
    configurationFee: rows.reduce(
      (total, row) =>
        total + row.configurationFee,
      0,
    ),
    totalFee: rows.reduce(
      (total, row) =>
        total + row.totalFee,
      0,
    ),
    rows,
  };
};

const WoodCrateConfigurationPanel = ({
  packages,
  configurations,
  loading,
  error,
  configurationMap,
  baseFeePerPackage,
  woodCrateSelected,
  onSelect,
}) => {
  const normalizedPackages =
    Array.isArray(packages)
      ? packages
      : [];

  const selectedPricing =
    calculateWoodCratePricing({
      packages: normalizedPackages,
      configurations,
      configurationMap,
      baseFeePerPackage,
      enabled:
        Boolean(woodCrateSelected),
    });

  const selectedCount =
    selectedPricing.rows.filter(
      (row) =>
        row.hasSelectedConfiguration,
    ).length;

  const allConfigurationsSelected =
    normalizedPackages.length > 0 &&
    selectedCount ===
      normalizedPackages.length;

  return (
    <section
      className="wood-crate-configuration-panel"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="wood-crate-configuration-panel__header">
        <div>
          <span>CHỌN KÍCH THƯỚC THÙNG</span>
          <strong>
            Phí đóng thùng và giá thùng
          </strong>
          <p>
            Dịch vụ đóng thùng gỗ có phí mặc định theo
            từng kiện. Sau khi chọn dịch vụ, hãy chọn
            kích thước thùng phù hợp cho tất cả kiện.
          </p>

          <span
            className={[
              "wood-crate-auto-service-badge",
              allConfigurationsSelected
                ? "is-enabled"
                : "is-waiting",
            ].join(" ")}
          >
            {allConfigurationsSelected ? (
              <CheckOutlined />
            ) : (
              <InfoCircleOutlined />
            )}

            {allConfigurationsSelected
              ? `Đã chọn đủ ${selectedCount}/${normalizedPackages.length} kiện`
              : `Đã chọn ${selectedCount}/${normalizedPackages.length} kiện`}
          </span>
        </div>

        <div className="wood-crate-configuration-panel__base-fee">
          <small>Phí đóng thùng</small>
          <strong>
            {formatMoney(
              baseFeePerPackage,
            )}
          </strong>
          <span>/ kiện</span>
        </div>
      </div>

      {loading ? (
        <div className="wood-crate-configuration-panel__state">
          <LoadingOutlined spin />
          Đang tải kích thước thùng...
        </div>
      ) : error ? (
        <div className="wood-crate-configuration-panel__state is-error">
          <InfoCircleOutlined />
          {error}
        </div>
      ) : normalizedPackages.length === 0 ? (
        <div className="wood-crate-configuration-panel__state is-warning">
          <InfoCircleOutlined />
          Chưa có kiện hàng để chọn kích thước thùng.
        </div>
      ) : (
        <div className="wood-crate-package-list">
          {normalizedPackages.map(
            (packageItem, packageIndex) => {
              const packageId =
                getPackageId(
                  packageItem,
                  packageIndex,
                );

              const selectedConfigurationId =
                String(
                  configurationMap?.[
                    packageId
                  ] || "",
                ).trim();

              const dimensionsComplete =
                hasCompletePackageDimensions(
                  packageItem,
                );

              return (
                <article
                  key={packageId}
                  className={[
                    "wood-crate-package-card",
                    !dimensionsComplete &&
                      "is-dimension-missing",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="wood-crate-package-card__heading">
                    <div>
                      <span>
                        Kiện {packageIndex + 1}
                      </span>
                      <strong>
                        {getPackageDisplayName(
                          packageItem,
                          packageIndex,
                        )}
                      </strong>
                      <small>
                        {formatPackageMeasurements(
                          packageItem,
                        )}
                      </small>
                    </div>

                    {!dimensionsComplete && (
                      <span className="wood-crate-package-card__required">
                        Chưa đủ kích thước
                      </span>
                    )}
                  </div>

                  {!dimensionsComplete ? (
                    <div className="wood-crate-dimension-warning">
                      <InfoCircleOutlined />
                      <div>
                        <strong>
                          Chưa thể chọn kích thước thùng
                        </strong>
                        <span>
                          Vui lòng nhập đầy đủ cân nặng, chiều dài, chiều rộng và chiều cao lớn hơn 0.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="wood-crate-configuration-grid">
                      {configurations.map(
                        (configuration) => {
                          const selected =
                            selectedConfigurationId ===
                            configuration.id;

                          const fits =
                            canPackageFitConfiguration(
                              packageItem,
                              configuration,
                            );

                          const {
                            name,
                            size,
                          } =
                            getConfigurationDisplay(
                              configuration,
                            );

                          const configurationFee =
                            getConfigurationFee(
                              configuration,
                            );

                          const totalFee =
                            (Number(
                              baseFeePerPackage,
                            ) || 0) +
                            configurationFee;

                          return (
                            <button
                              key={
                                configuration.id
                              }
                              type="button"
                              disabled={!fits}
                              className={[
                                "wood-crate-configuration-option",
                                selected &&
                                  "is-selected",
                                !fits &&
                                  "is-not-fit",
                                isCustomConfiguration(
                                  configuration,
                                ) &&
                                  "is-custom",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() =>
                                onSelect(
                                  packageItem,
                                  packageIndex,
                                  configuration,
                                )
                              }
                            >
                              <span className="wood-crate-configuration-option__top">
                                <strong>
                                  {name}
                                </strong>
                                <b>{size}</b>
                              </span>

                              <span className="wood-crate-configuration-option__dimension">
                                {isCustomConfiguration(
                                  configuration,
                                )
                                  ? "Theo kích thước thực tế"
                                  : `${formatNumber(
                                      configuration.length,
                                    )} × ${formatNumber(
                                      configuration.width,
                                    )} × ${formatNumber(
                                      configuration.height,
                                    )} cm`}
                              </span>

                              <span className="wood-crate-configuration-option__weight">
                                Tối đa{" "}
                                {formatNumber(
                                  configuration.maxWeight,
                                )}{" "}
                                kg
                              </span>

                              {!fits && (
                                <span className="wood-crate-configuration-option__not-fit">
                                  Không phù hợp
                                </span>
                              )}

                              <span className="wood-crate-configuration-option__price">
                                <small>
                                  <span>
                                    Phí đóng gói
                                  </span>
                                  <b>
                                    {formatMoney(
                                      baseFeePerPackage,
                                    )}
                                  </b>
                                </small>

                                <small>
                                  <span>
                                    Giá thùng
                                  </span>
                                  <b>
                                    {formatMoney(
                                      configurationFee,
                                    )}
                                  </b>
                                </small>

                                <strong>
                                  <span>
                                    Tổng mỗi kiện
                                  </span>
                                  <b>
                                    {formatMoney(
                                      totalFee,
                                    )}
                                  </b>
                                </strong>
                              </span>

                              {selected && (
                                <span className="wood-crate-configuration-option__selected">
                                  <CheckOutlined />
                                  Đã chọn
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}

      <div
        className={[
          "wood-crate-price-summary",
          allConfigurationsSelected
            ? "is-complete"
            : "is-incomplete",
        ].join(" ")}
      >
        <div className="wood-crate-price-summary__selected-count">
          <span>
            Kiện đã chọn thùng
          </span>

          <strong>
            {selectedCount}/
            {normalizedPackages.length}
          </strong>
        </div>

        <div>
          <span>
            Phí đóng gói thùng gỗ
          </span>
          <strong>
            {formatMoney(
              selectedPricing.baseFee,
            )}
          </strong>
        </div>

        <div>
          <span>
            Giá kích thước thùng đã chọn
          </span>
          <strong>
            {formatMoney(
              selectedPricing.configurationFee,
            )}
          </strong>
        </div>

        <div className="wood-crate-price-summary__total">
          <span>Tổng phí đóng thùng gỗ</span>
          <strong>
            {formatMoney(
              selectedPricing.totalFee,
            )}
          </strong>
        </div>
      </div>
    </section>
  );
};

export default function PackageOptionalServices({
  value = EMPTY_PACKAGE_SERVICES,
  packages = [],
  disabled = false,
  onChange,

  triggerTitle = "Dịch vụ bổ sung cho đơn ký gửi",
  triggerDescription = "",

  modalEyebrow = "DỊCH VỤ BỔ SUNG",
  modalTitle = "Lựa chọn dịch vụ cho đơn ký gửi",
  modalDescription =
    "Danh sách được cập nhật trực tiếp từ bảng giá hệ thống. Khi có dịch vụ mới, giao diện sẽ tự động hiển thị thêm.",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pricingRules, setPricingRules] = useState([]);
  const [hiddenPricingRuleIds, setHiddenPricingRuleIds] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");
  const [draftSelectedCodes, setDraftSelectedCodes] = useState([]);

  const [
    packageConfigurations,
    setPackageConfigurations,
  ] = useState([]);

  const [
    packageConfigurationLoading,
    setPackageConfigurationLoading,
  ] = useState(true);

  const [
    packageConfigurationError,
    setPackageConfigurationError,
  ] = useState("");

  const [
    draftPackageConfigurationByPackageId,
    setDraftPackageConfigurationByPackageId,
  ] = useState({});

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

        const hiddenRules = normalizedRules.filter(isHiddenRule);
        const visibleRules = normalizedRules.filter(
          (rule) => !isHiddenRule(rule),
        );

        setHiddenPricingRuleIds(
          hiddenRules
            .map((rule) => normalizeRuleId(rule.id))
            .filter(Boolean),
        );

        setPricingRules(visibleRules);
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

  useEffect(() => {
    const controller =
      new AbortController();

    const fetchPackageConfigurations =
      async () => {
        try {
          setPackageConfigurationLoading(
            true,
          );
          setPackageConfigurationError("");

          if (
            typeof pricingRuleService
              .getPackageConfigurations !==
            "function"
          ) {
            throw new Error(
              "pricingRuleService chưa có getPackageConfigurations().",
            );
          }

          const result =
            await pricingRuleService.getPackageConfigurations(
              {
                signal:
                  controller.signal,
                onlyActive: true,
              },
            );

          if (
            controller.signal.aborted
          ) {
            return;
          }

          setPackageConfigurations(
            normalizePackageConfigurationsFromApi(
              result,
            ),
          );
        } catch (error) {
          if (
            controller.signal.aborted ||
            isCanceledRequest(error)
          ) {
            return;
          }

          console.error(
            "[PackageOptionalServices] Lỗi tải /api/package-configurations:",
            error,
          );

          setPackageConfigurations([]);
          setPackageConfigurationError(
            error?.message ||
              "Không thể tải danh sách kích thước thùng.",
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setPackageConfigurationLoading(
              false,
            );
          }
        }
      };

    fetchPackageConfigurations();

    return () =>
      controller.abort();
  }, []);

  const selectedCodes = useMemo(
    () => getInitialSelectedCodes(value, pricingRules),
    [pricingRules, value],
  );


  useEffect(() => {
    const currentRuleCodes = normalizeStringArray(
      value?.selectedRuleCodes ??
        value?.selectedPricingRuleCodes ??
        value?.pricingRuleCodes,
    ).map(normalizeCode);

    const currentPricingRuleIds = normalizeStringArray(
      value?.selectedPricingRuleIds ??
        value?.pricingRuleIds,
    ).map(normalizeRuleId);

    const sanitizedRuleCodes =
      sanitizeSelectedRuleCodes(currentRuleCodes);

    const sanitizedPricingRuleIds =
      sanitizeSelectedPricingRuleIds(
        currentPricingRuleIds,
        hiddenPricingRuleIds,
      );

    const hasHiddenRuleCode =
      !areStringArraysEqual(
        currentRuleCodes,
        sanitizedRuleCodes,
      );

    const hasHiddenRuleId =
      !areStringArraysEqual(
        currentPricingRuleIds,
        sanitizedPricingRuleIds,
      );

    if (!hasHiddenRuleCode && !hasHiddenRuleId) {
      return;
    }

    onChange?.({
      ...value,
      selectedRuleCodes: sanitizedRuleCodes,
      selectedPricingRuleIds: sanitizedPricingRuleIds,
    });
  }, [
    hiddenPricingRuleIds,
    onChange,
    value,
  ]);

  useEffect(() => {
    if (isOpen) {
      setDraftSelectedCodes(selectedCodes);
      setDraftPackageConfigurationByPackageId(
        normalizePackageConfigurationMap(
          value?.packageConfigurationByPackageId,
        ),
      );
    }
  }, [
    isOpen,
    selectedCodes,
    value?.packageConfigurationByPackageId,
  ]);

  const selectedRules = useMemo(() => {
    const selectedSet = new Set(selectedCodes);
    return pricingRules.filter((rule) => selectedSet.has(rule.ruleCode));
  }, [pricingRules, selectedCodes]);

  const selectedDraftRules = useMemo(() => {
    const selectedSet = new Set(draftSelectedCodes);
    return pricingRules.filter((rule) => selectedSet.has(rule.ruleCode));
  }, [draftSelectedCodes, pricingRules]);

  const woodCrateRule = useMemo(
    () =>
      pricingRules.find(
        (rule) =>
          rule.ruleCode ===
          "WOOD_CRATE",
      ) || null,
    [pricingRules],
  );

  const isDraftWoodCrateSelected =
    draftSelectedCodes.includes(
      "WOOD_CRATE",
    );

  const normalizedPackages = useMemo(
    () =>
      Array.isArray(packages)
        ? packages
        : [],
    [packages],
  );

  const incompleteWoodCratePackages =
    useMemo(
      () =>
        normalizedPackages
          .map(
            (packageItem, index) => ({
              packageItem,
              index,
            }),
          )
          .filter(
            ({ packageItem }) =>
              !hasCompletePackageDimensions(
                packageItem,
              ),
          ),
      [normalizedPackages],
    );

  const allPackagesReadyForWoodCrate =
    normalizedPackages.length > 0 &&
    incompleteWoodCratePackages.length === 0;

  const woodCrateBaseFeePerPackage =
    toFiniteNumberOrNull(
      woodCrateRule?.value,
    ) ?? 0;

  const draftWoodCratePricing =
    useMemo(
      () =>
        calculateWoodCratePricing({
          packages:
            normalizedPackages,
          configurations:
            packageConfigurations,
          configurationMap:
            draftPackageConfigurationByPackageId,
          baseFeePerPackage:
            woodCrateBaseFeePerPackage,
          enabled:
            isDraftWoodCrateSelected,
        }),
      [
        normalizedPackages,
        packageConfigurations,
        draftPackageConfigurationByPackageId,
        woodCrateBaseFeePerPackage,
        isDraftWoodCrateSelected,
      ],
    );

  const hasChanges = useMemo(
    () =>
      !areCodeArraysEqual(
        selectedCodes,
        draftSelectedCodes,
      ) ||
      !areConfigurationMapsEqual(
        value?.packageConfigurationByPackageId,
        draftPackageConfigurationByPackageId,
      ),
    [
      draftPackageConfigurationByPackageId,
      draftSelectedCodes,
      selectedCodes,
      value?.packageConfigurationByPackageId,
    ],
  );

  const handleOpen = () => {
    if (disabled) {
      return;
    }

    setDraftSelectedCodes(selectedCodes);
    setDraftPackageConfigurationByPackageId(
      normalizePackageConfigurationMap(
        value?.packageConfigurationByPackageId,
      ),
    );
    setIsOpen(true);
  };

  const handleToggle = (rule) => {
    if (
      disabled ||
      isHiddenRule(rule) ||
      !isRuleSelectable(rule) ||
      rule.isRequired
    ) {
      return;
    }

    const isCurrentlySelected =
      draftSelectedCodes.includes(
        rule.ruleCode,
      );

    if (
      rule.ruleCode === "WOOD_CRATE" &&
      !isCurrentlySelected
    ) {
      if (
        normalizedPackages.length === 0
      ) {
        AuthNotify.warning(
          "Chưa có kiện hàng",
          "Vui lòng thêm ít nhất một kiện hàng trước khi chọn đóng thùng gỗ.",
        );
        return;
      }

      if (
        !allPackagesReadyForWoodCrate
      ) {
        const packageNames =
          incompleteWoodCratePackages
            .map(
              ({
                packageItem,
                index,
              }) =>
                getPackageDisplayName(
                  packageItem,
                  index,
                ),
            )
            .join(", ");

        AuthNotify.warning(
          "Chưa đủ thông tin kiện hàng",
          `Vui lòng nhập cân nặng, chiều dài, chiều rộng và chiều cao lớn hơn 0 cho: ${packageNames}.`,
        );
        return;
      }
    }

    if (
      rule.ruleCode === "WOOD_CRATE" &&
      isCurrentlySelected
    ) {
      setDraftPackageConfigurationByPackageId(
        {},
      );
    }

    setDraftSelectedCodes((currentCodes) => {
      const nextCodes =
        new Set(currentCodes);

      if (
        nextCodes.has(rule.ruleCode)
      ) {
        nextCodes.delete(
          rule.ruleCode,
        );
      } else {
        nextCodes.add(
          rule.ruleCode,
        );
      }

      return Array.from(nextCodes);
    });
  };

  const handleSelectPackageConfiguration = (
    packageItem,
    packageIndex,
    configuration,
  ) => {
    if (
      disabled ||
      !isDraftWoodCrateSelected
    ) {
      return;
    }

    if (
      !hasCompletePackageDimensions(
        packageItem,
      )
    ) {
      AuthNotify.warning(
        "Chưa đủ kích thước kiện",
        "Vui lòng nhập đầy đủ cân nặng, chiều dài, chiều rộng và chiều cao trước khi chọn kích thước thùng.",
      );
      return;
    }

    if (
      !canPackageFitConfiguration(
        packageItem,
        configuration,
      )
    ) {
      AuthNotify.warning(
        "Kích thước thùng không phù hợp",
        "Loại thùng này không đáp ứng kích thước hoặc trọng lượng của kiện hàng.",
      );
      return;
    }

    const packageId =
      getPackageId(
        packageItem,
        packageIndex,
      );

    setDraftPackageConfigurationByPackageId(
      (currentMap) => ({
        ...currentMap,
        [packageId]:
          configuration.id,
      }),
    );

    const configurationFee =
      getConfigurationFee(
        configuration,
      );

    const selectedTotal =
      woodCrateBaseFeePerPackage +
      configurationFee;

    AuthNotify.success(
      "Đã chọn kích thước thùng",
      `${getPackageDisplayName(
        packageItem,
        packageIndex,
      )}: ${getConfigurationDisplay(
        configuration,
      ).name}. Phí đóng gói ${formatMoney(
        woodCrateBaseFeePerPackage,
      )} + giá thùng ${formatMoney(
        configurationFee,
      )} = ${formatMoney(
        selectedTotal,
      )}.`,
    );
  };

  const handleClose = () => {
    setDraftSelectedCodes(selectedCodes);
    setDraftPackageConfigurationByPackageId(
      normalizePackageConfigurationMap(
        value?.packageConfigurationByPackageId,
      ),
    );
    setIsOpen(false);
  };

  const handleSave = () => {
    if (disabled) {
      return;
    }

    const selectedSet = new Set(
      sanitizeSelectedRuleCodes(draftSelectedCodes),
    );

    const requiresWoodenCrate =
      selectedSet.has(
        "WOOD_CRATE",
      );

    const normalizedPackages =
      Array.isArray(packages)
        ? packages
        : [];

    if (requiresWoodenCrate) {
      if (
        normalizedPackages.length === 0
      ) {
        AuthNotify.warning(
          "Chưa có kiện hàng",
          "Vui lòng thêm ít nhất một kiện hàng trước khi chọn đóng thùng gỗ.",
        );
        return;
      }

      const incompletePackages =
        normalizedPackages
          .map(
            (packageItem, index) => ({
              packageItem,
              index,
            }),
          )
          .filter(
            ({ packageItem }) =>
              !hasCompletePackageDimensions(
                packageItem,
              ),
          );

      if (
        incompletePackages.length > 0
      ) {
        AuthNotify.warning(
          "Chưa nhập đủ kích thước",
          `Vui lòng nhập cân nặng, dài, rộng và cao cho: ${incompletePackages
            .map(
              ({ packageItem, index }) =>
                getPackageDisplayName(
                  packageItem,
                  index,
                ),
            )
            .join(", ")}.`,
        );
        return;
      }

      const missingConfigurationPackages =
        normalizedPackages
          .map(
            (packageItem, index) => ({
              packageItem,
              index,
              packageId:
                getPackageId(
                  packageItem,
                  index,
                ),
            }),
          )
          .filter(
            ({ packageId }) =>
              !String(
                draftPackageConfigurationByPackageId[
                  packageId
                ] || "",
              ).trim(),
          );

      if (
        missingConfigurationPackages.length > 0
      ) {
        AuthNotify.warning(
          "Chưa chọn kích thước thùng",
          `Vui lòng chọn loại thùng cho: ${missingConfigurationPackages
            .map(
              ({ packageItem, index }) =>
                getPackageDisplayName(
                  packageItem,
                  index,
                ),
            )
            .join(", ")}.`,
        );
        return;
      }

      const configurationById =
        new Map(
          packageConfigurations.map(
            (configuration) => [
              configuration.id,
              configuration,
            ],
          ),
        );

      const invalidPackages =
        normalizedPackages
          .map(
            (packageItem, index) => {
              const packageId =
                getPackageId(
                  packageItem,
                  index,
                );

              const configuration =
                configurationById.get(
                  draftPackageConfigurationByPackageId[
                    packageId
                  ],
                );

              return {
                packageItem,
                index,
                configuration,
              };
            },
          )
          .filter(
            ({
              packageItem,
              configuration,
            }) =>
              !configuration ||
              !canPackageFitConfiguration(
                packageItem,
                configuration,
              ),
          );

      if (
        invalidPackages.length > 0
      ) {
        AuthNotify.warning(
          "Cấu hình thùng không còn phù hợp",
          `Vui lòng chọn lại kích thước thùng cho: ${invalidPackages
            .map(
              ({ packageItem, index }) =>
                getPackageDisplayName(
                  packageItem,
                  index,
                ),
            )
            .join(", ")}.`,
        );
        return;
      }
    }

    const activeSelectedRules = pricingRules.filter(
      (rule) =>
        !isHiddenRule(rule) &&
        selectedSet.has(rule.ruleCode) &&
        isRuleSelectable(rule),
    );

    const selectedRuleCodes =
      sanitizeSelectedRuleCodes(
        activeSelectedRules.map(
          (rule) => rule.ruleCode,
        ),
      );

    const selectedPricingRuleIds =
      sanitizeSelectedPricingRuleIds(
        activeSelectedRules.map(
          (rule) => rule.id,
        ),
        hiddenPricingRuleIds,
      );

    const selectedConfigurationMap =
      requiresWoodenCrate
        ? normalizePackageConfigurationMap(
            draftPackageConfigurationByPackageId,
          )
        : {};

    const configurationById =
      new Map(
        packageConfigurations.map(
          (configuration) => [
            configuration.id,
            configuration,
          ],
        ),
      );

    const selectedPackageConfigurations =
      requiresWoodenCrate
        ? normalizedPackages.map(
            (packageItem, index) => {
              const packageId =
                getPackageId(
                  packageItem,
                  index,
                );

              const packageConfigurationId =
                selectedConfigurationMap[
                  packageId
                ];

              const configuration =
                configurationById.get(
                  packageConfigurationId,
                );

              return {
                packageId,
                packageConfigurationId,
                configCode:
                  configuration?.configCode ||
                  "",
                configName:
                  getConfigurationDisplay(
                    configuration,
                  ).name,
                packageFee:
                  getConfigurationFee(
                    configuration,
                  ),
                woodCrateBaseFee:
                  woodCrateBaseFeePerPackage,
                totalFee:
                  woodCrateBaseFeePerPackage +
                  getConfigurationFee(
                    configuration,
                  ),
              };
            },
          )
        : [];

    const finalWoodCratePricing =
      calculateWoodCratePricing({
        packages:
          normalizedPackages,
        configurations:
          packageConfigurations,
        configurationMap:
          selectedConfigurationMap,
        baseFeePerPackage:
          woodCrateBaseFeePerPackage,
        enabled:
          requiresWoodenCrate,
      });

    const nextValue = {
      ...value,

      /*
       * Đóng thùng gỗ là một hình thức đóng gói.
       */
      requiresPacking:
        selectedRuleCodes.some(
          (code) =>
            code.includes(
              "PACKING",
            ),
        ) ||
        requiresWoodenCrate,

      requiresWoodenCrate,

      requiresInsurance:
        activeSelectedRules.some(
          (rule) =>
            rule.ruleCode.includes(
              "INSURANCE",
            ) ||
            rule.ruleType.includes(
              "INSURANCE",
            ),
        ),

      requiresInspection:
        activeSelectedRules.some(
          (rule) =>
            rule.ruleCode.includes(
              "INSPECTION",
            ) ||
            rule.ruleType.includes(
              "INSPECTION",
            ),
        ),

      selectedRuleCodes,
      selectedPricingRuleIds,

      packageConfigurationByPackageId:
        selectedConfigurationMap,

      selectedPackageConfigurations,

      woodCrateBaseFeePerPackage,

      woodCrateBaseFee:
        finalWoodCratePricing.baseFee,

      woodCrateConfigurationFee:
        finalWoodCratePricing.configurationFee,

      woodCrateTotalFee:
        finalWoodCratePricing.totalFee,

      woodCrateCompleted:
        requiresWoodenCrate &&
        normalizedPackages.length > 0 &&
        selectedPackageConfigurations.length ===
          normalizedPackages.length,
    };

    try {
      console.info(
        "[PackageOptionalServices] Giá trị dịch vụ trả về component cha:",
        {
          selectedRuleCodes,
          selectedPricingRuleIds,
          packageConfigurationByPackageId:
            nextValue.packageConfigurationByPackageId,
          woodCrateBaseFeePerPackage:
            nextValue.woodCrateBaseFeePerPackage,
          woodCrateBaseFee:
            nextValue.woodCrateBaseFee,
          woodCrateConfigurationFee:
            nextValue.woodCrateConfigurationFee,
          woodCrateTotalFee:
            nextValue.woodCrateTotalFee,
          woodCrateCompleted:
            nextValue.woodCrateCompleted,
        },
      );

      onChange?.(nextValue);
      setIsOpen(false);

      if (activeSelectedRules.length > 0) {
        AuthNotify.success(
          "Đã lưu dịch vụ bổ sung",
          `Đã chọn: ${activeSelectedRules
            .map(getRuleDisplayName)
            .join(", ")}.`,
        );
      } else {
        AuthNotify.success(
          "Đã cập nhật dịch vụ",
          "Đơn ký gửi không chọn dịch vụ bổ sung.",
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
            <strong>{triggerTitle}</strong>

            <Tooltip
              placement="top"
              title="Danh sách dịch vụ được tải trực tiếp từ hệ thống và tự động cập nhật khi bảng giá thay đổi."
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

          {selectedRules.length > 0 ? (
            <span className="package-services-trigger__chips">
              {selectedRules.map((rule) => (
                <span key={rule.id || rule.ruleCode}>
                  <CheckOutlined />
                  {getRuleDisplayName(rule)}

                  {rule.ruleCode ===
                    "WOOD_CRATE" &&
                    Number(
                      value?.woodCrateTotalFee,
                    ) > 0 && (
                      <b className="package-services-trigger__wood-price">
                        {formatMoney(
                          value.woodCrateTotalFee,
                        )}
                      </b>
                    )}
                </span>
              ))}
            </span>
          ) : (
            <span className="package-services-trigger__description">
              {pricingLoading
                ? "Đang tải dữ liệu bảng giá..."
                : triggerDescription ||
                  `${pricingRules.length} dịch vụ đang có trên hệ thống.`}
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
        width={1040}
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
              {modalEyebrow}
            </span>
            <h2>{modalTitle}</h2>
            <p>{modalDescription}</p>
          </div>
        </div>

        <div className="package-services-modal__notice">
          {pricingLoading ? <LoadingOutlined spin /> : <InfoCircleOutlined />}
          <span>
            {pricingLoading
              ? "Đang tải danh sách dịch vụ..."
              : pricingError
                ? pricingError
                : `Đang hiển thị ${pricingRules.length} dịch vụ. Hệ số quy đổi thể tích không hiển thị trong danh sách lựa chọn.`}
          </span>
        </div>

        <div className="package-services-modal__list">
          {pricingLoading ? (
            <div className="package-services-modal__api-state">
              <LoadingOutlined spin />
              <strong>Đang tải danh sách dịch vụ</strong>
              <span>Vui lòng chờ trong giây lát.</span>
            </div>
          ) : pricingError ? (
            <div className="package-services-modal__api-state is-error">
              <InfoCircleOutlined />
              <strong>Không tải được danh sách dịch vụ</strong>
              <span>{pricingError}</span>
            </div>
          ) : pricingRules.length === 0 ? (
            <div className="package-services-modal__api-state">
              <InfoCircleOutlined />
              <strong>Chưa có dịch vụ bổ sung</strong>
              <span>Hệ thống hiện chưa có dịch vụ phù hợp để lựa chọn.</span>
            </div>
          ) : (
            pricingRules.map((rule, ruleIndex) => {
              const Icon = getRuleIcon(rule);
              const checked = draftSelectedCodes.includes(rule.ruleCode);
              const selectable = isRuleSelectable(rule);
              const woodCrateMeasurementMissing =
                rule.ruleCode ===
                  "WOOD_CRATE" &&
                !checked &&
                !allPackagesReadyForWoodCrate;

              const itemDisabled =
                disabled ||
                !selectable ||
                rule.isRequired ||
                woodCrateMeasurementMissing;

              return (
                <React.Fragment
                  key={
                    rule.id ||
                    rule.ruleCode ||
                    ruleIndex
                  }
                >
                <div
                  role="checkbox"
                  tabIndex={itemDisabled ? -1 : 0}
                  aria-checked={checked}
                  aria-disabled={itemDisabled}
                  style={{ "--service-index": ruleIndex }}
                  className={[
                    "package-services-modal__item",
                    checked && "package-services-modal__item--selected",
                    itemDisabled && "package-services-modal__item--disabled",
                    woodCrateMeasurementMissing &&
                      "package-services-modal__item--measurement-required",
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
                      <strong>{getRuleDisplayName(rule)}</strong>

                      <Tooltip placement="top" title={formatRuleInformation(rule)}>
                        <InfoCircleOutlined
                          aria-label={`Thông tin ${getRuleDisplayName(rule)}`}
                          className="package-services-modal__info-icon"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        />
                      </Tooltip>
                    </span>

                    <span className="package-services-modal__rule-meta">
                      <b title={rule.ruleCode || undefined}>
                        {getRuleCodeLabel(rule)}
                      </b>

                      <i title={rule.ruleType || undefined}>
                        {getRuleTypeLabel(rule)}
                      </i>

                      <em
                        className={`status-${getStatusClassName(rule.status)}`}
                      >
                        {getStatusLabel(rule.status)}
                      </em>
                    </span>

                    <span className="package-services-modal__description">
                      {formatRuleDescription(rule.description)}
                    </span>

                    {woodCrateMeasurementMissing && (
                      <span className="package-services-modal__measurement-warning">
                        <InfoCircleOutlined />
                        Nhập đủ cân nặng, dài, rộng và cao
                        cho tất cả kiện trước khi chọn.
                      </span>
                    )}
                  </span>

                  <span className="package-services-modal__fee">
                    <small>
                      {rule.ruleCode === "WOOD_CRATE"
                        ? "Phí đóng gói mặc định / kiện"
                        : getCalculationTypeLabel(
                            rule.calculationType,
                          )}
                    </small>

                    <strong>
                      {formatRuleFee(rule)}
                    </strong>

                    {rule.ruleCode ===
                      "WOOD_CRATE" &&
                      checked && (
                        <em className="package-services-modal__wood-total">
                          Phí đóng gói{" "}
                          {formatMoney(
                            draftWoodCratePricing.baseFee,
                          )}
                          {draftWoodCratePricing.configurationFee >
                            0 && (
                            <>
                              {" + "}giá thùng{" "}
                              {formatMoney(
                                draftWoodCratePricing.configurationFee,
                              )}
                            </>
                          )}
                          {" = "}
                          {formatMoney(
                            draftWoodCratePricing.totalFee,
                          )}
                        </em>
                      )}
                  </span>
                </div>

                {rule.ruleCode ===
                  "WOOD_CRATE" &&
                  checked && (
                    <WoodCrateConfigurationPanel
                      packages={packages}
                      configurations={
                        packageConfigurations
                      }
                      loading={
                        packageConfigurationLoading
                      }
                      error={
                        packageConfigurationError
                      }
                      configurationMap={
                        draftPackageConfigurationByPackageId
                      }
                      baseFeePerPackage={
                        woodCrateBaseFeePerPackage
                      }
                      woodCrateSelected={
                        checked
                      }
                      onSelect={
                        handleSelectPackageConfiguration
                      }
                    />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        <div className="package-services-modal__summary">
          <div className="package-services-modal__summary-count">
            <span>Dịch vụ đã chọn</span>
            <strong>{selectedDraftRules.length}</strong>
          </div>
          <p>
            {selectedDraftRules.length > 0
              ? selectedDraftRules
                  .map(getRuleDisplayName)
                  .join(", ")
              : "Chưa chọn dịch vụ bổ sung"}
          </p>

          {draftWoodCratePricing.totalFee > 0 && (
            <div className="package-services-modal__wood-summary">
              <span>
                Tổng phí đóng thùng gỗ
              </span>

              <strong>
                {formatMoney(
                  draftWoodCratePricing.totalFee,
                )}
              </strong>
            </div>
          )}
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