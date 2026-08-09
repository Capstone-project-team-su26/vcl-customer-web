import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import AuthNotify from "../../../../../utils/AuthNotify";

import {
  getConsignmentDetailApi,
  getProductTypesApi,
  cancelConsignmentApi,
} from "../../../../../api/OrderApi/consignmentApi";
import { getConsignmentStatusesApi } from "../../../../../api/OrderApi/consignmentStatusApi";
import pricingRuleService from "../../../../../api/ServiceApi/pricingRuleService";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../../utils/timeUtc";

import ConsignmentListDetailUI from "../../../../../components/DashboardComponents/CustomerKiguiComponents/ConsigmentListUI/ConsignmentListDetailUI";

/* =========================================================
   LOẠI SẢN PHẨM
   ========================================================= */

const normalizeProductType = (productType) =>
  String(productType || "")
    .trim()
    .toLowerCase();

const normalizeProductTypeOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.productTypes,
    apiResult?.data?.items,
    apiResult?.data?.productTypes,
  ];

  const rawProductTypes = candidates.find(Array.isArray) || [];

  return rawProductTypes
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = String(item).trim();

        return {
          value,
          label: value,
        };
      }

      const value = String(
        item?.value ||
          item?.code ||
          item?.productType ||
          item?.productTypeCode ||
          item?.productTypeId ||
          item?.id ||
          "",
      ).trim();

      const label = String(
        item?.label ||
          item?.name ||
          item?.displayName ||
          item?.productTypeName ||
          item?.description ||
          value,
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter((option) => option.value && option.label);
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};


/* =========================================================
   CẤU HÌNH THÙNG GỖ
   ========================================================= */

const normalizePackageConfigurationId = (value) =>
  String(value || "").trim().toLowerCase();

const normalizePackageConfigurationFromApi = (configuration = {}) => {
  const id = String(
    configuration?.id ||
      configuration?.packageConfigurationId ||
      configuration?.configurationId ||
      "",
  ).trim();

  return {
    ...configuration,
    id,
    packageConfigurationId: id,
    configCode: String(
      configuration?.configCode ||
        configuration?.code ||
        "",
    )
      .trim()
      .toUpperCase(),
    configName: String(
      configuration?.configName ||
        configuration?.name ||
        configuration?.displayName ||
        "Cấu hình đóng gói",
    ).trim(),
    length: toFiniteNumberOrNull(configuration?.length) ?? 0,
    width: toFiniteNumberOrNull(configuration?.width) ?? 0,
    height: toFiniteNumberOrNull(configuration?.height) ?? 0,
    maxWeight:
      toFiniteNumberOrNull(
        configuration?.maxWeight ??
          configuration?.maximumWeight,
      ) ?? 0,
    packageFee:
      toFiniteNumberOrNull(
        configuration?.packageFee ??
          configuration?.fee ??
          configuration?.price,
      ) ?? 0,
    estimatedFee: toFiniteNumberOrNull(
      configuration?.estimatedFee,
    ),
    status: normalizeStatus(
      configuration?.status || "ACTIVE",
    ),
  };
};

const normalizePackageConfigurationList = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.packageConfigurations,
    apiResult?.configurations,
    apiResult?.data?.items,
    apiResult?.data?.packageConfigurations,
    apiResult?.data?.configurations,
  ];

  const rawConfigurations =
    candidates.find(Array.isArray) || [];

  return rawConfigurations
    .filter(
      (item) =>
        item &&
        typeof item === "object",
    )
    .map(normalizePackageConfigurationFromApi)
    .filter((item) => item.id);
};

const getItemPackageConfigurationId = (item = {}) =>
  String(
    item?.packageConfigurationId ||
      item?.configurationId ||
      item?.packageConfigId ||
      item?.packageConfiguration?.id ||
      item?.packageConfiguration
        ?.packageConfigurationId ||
      item?.configuration?.id ||
      item?.packageConfig?.id ||
      "",
  ).trim();

const normalizeItemReferenceUrls = (item = {}) => {
  const urls = [];

  const addUrl = (value) => {
    const url = String(value || "").trim();

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };

  [
    item?.referenceUrls,
    item?.imageUrls,
    item?.images,
  ].forEach((candidate) => {
    if (!Array.isArray(candidate)) {
      return;
    }

    candidate.forEach((entry) => {
      addUrl(
        typeof entry === "string"
          ? entry
          : entry?.url ||
              entry?.imageUrl ||
              entry?.fileUrl ||
              entry?.path,
      );
    });
  });

  addUrl(item?.referenceUrl);
  addUrl(item?.imageUrl);

  return urls;
};


/* =========================================================
   DỊCH VỤ BỔ SUNG / PRICING RULE
   ========================================================= */

const normalizePricingRuleId = (value) =>
  String(value || "").trim().toLowerCase();

const normalizePricingRuleIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
};

const normalizePricingRuleCode = (value) =>
  String(value || "")
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
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
};

const normalizePricingRuleFromApi = (rule = {}) => {
  const id = String(
    rule?.id || rule?.pricingRuleId || "",
  ).trim();

  return {
    ...rule,
    id,
    pricingRuleId: String(
      rule?.pricingRuleId || id,
    ).trim(),
    ruleName: String(
      rule?.ruleName ||
        rule?.name ||
        rule?.displayName ||
        rule?.ruleCode ||
        "Dịch vụ bổ sung",
    ).trim(),
    ruleCode: normalizePricingRuleCode(
      rule?.ruleCode || rule?.code,
    ),
    ruleType: normalizePricingRuleCode(
      rule?.ruleType || rule?.type,
    ),
    calculationType: normalizePricingRuleCode(
      rule?.calculationType ||
        rule?.calculationMethod,
    ),
    conditionType:
      rule?.conditionType === null ||
      rule?.conditionType === undefined
        ? null
        : String(rule.conditionType).trim(),
    conditionValue:
      rule?.conditionValue === null ||
      rule?.conditionValue === undefined
        ? null
        : String(rule.conditionValue).trim(),
    value: toFiniteNumberOrNull(rule?.value),
    minAmount: toFiniteNumberOrNull(
      rule?.minAmount,
    ),
    maxAmount: toFiniteNumberOrNull(
      rule?.maxAmount,
    ),
    appliedAmount:
      toFiniteNumberOrNull(
        rule?.appliedAmount ??
          rule?.feeAmount ??
          rule?.calculatedAmount ??
          rule?.actualAmount,
      ),
    isRequired: Boolean(rule?.isRequired),
    status: normalizePricingRuleCode(
      rule?.status || "ACTIVE",
    ),
    description: String(
      rule?.description || rule?.note || "",
    ).trim(),
  };
};

const normalizePricingRuleOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.pricingRules,
    apiResult?.rules,
    apiResult?.data?.items,
    apiResult?.data?.pricingRules,
    apiResult?.data?.rules,
  ];

  const rawRules = candidates.find(Array.isArray) || [];

  return rawRules
    .filter(
      (rule) =>
        rule &&
        typeof rule === "object" &&
        !Array.isArray(rule),
    )
    .map(normalizePricingRuleFromApi)
    .filter((rule) => rule.id || rule.ruleCode);
};

const HIDDEN_ADDITIONAL_SERVICE_CODES = new Set([
  "VOLUMETRIC_DIVISOR",
  "VAT",
  "IMPORT_TAX",
  "DOMESTIC_FEE",
]);

const WOOD_CRATE_RULE_CODE = "WOOD_CRATE";
const VAT_RULE_CODE = "VAT";
const IMPORT_TAX_RULE_CODE = "IMPORT_TAX";
const DEFAULT_WOOD_CRATE_ORDER_FEE = 35000;

const isWoodCratePricingRule = (rule) => {
  const searchableValue = [
    rule?.ruleCode,
    rule?.ruleType,
    rule?.ruleName,
  ]
    .map(normalizePricingRuleCode)
    .join(" ");

  return (
    searchableValue.includes("WOOD_CRATE") ||
    searchableValue.includes("WOOD_BOX") ||
    searchableValue.includes("THUNG_GO")
  );
};

const getPackageConfigurationFee = (configuration, item = {}) => {
  if (!configuration) {
    return 0;
  }

  // 1. Ưu tiên 1: Lấy số tiền đã được API Backend tính sẵn nếu có
  const estimatedFee = toFiniteNumberOrNull(
    configuration?.estimatedFee ??
      configuration?.calculatedFee ??
      configuration?.feeAmount,
  );

  if (estimatedFee !== null) {
    return estimatedFee;
  }

  // 2. Lấy đơn giá đóng gói động từ API của cấu hình thùng
  const baseFee = toFiniteNumberOrNull(
    configuration?.packageFee ??
      configuration?.fee ??
      configuration?.price,
  ) ?? 0;

  const configCode = String(
    configuration?.configCode || configuration?.code || "",
  )
    .trim()
    .toUpperCase();

  // 3. Nếu là thùng CUSTOM và API chưa trả về estimatedFee:
  if (configCode === "CUSTOM") {
    // Lấy kích thước chuẩn từ API cấu hình nếu có (chiều dài/rộng/cao < 9999)
    const configLength = toFiniteNumberOrNull(configuration?.length);
    const configWidth = toFiniteNumberOrNull(configuration?.width);
    const configHeight = toFiniteNumberOrNull(configuration?.height);

    const hasConfigDimensions =
      configLength &&
      configWidth &&
      configHeight &&
      configLength < 9999 &&
      configWidth < 9999 &&
      configHeight < 9999;

    // Đơn vị khối lượng/thể tích chuẩn từ API (nếu có, không thì mặc định 1.000 cm³)
    const configVolume = hasConfigDimensions
      ? configLength * configWidth * configHeight
      : 1000;

    const itemLength = toFiniteNumberOrNull(item?.length) ?? 0;
    const itemWidth = toFiniteNumberOrNull(item?.width) ?? 0;
    const itemHeight = toFiniteNumberOrNull(item?.height) ?? 0;
    const itemVolume =
      toFiniteNumberOrNull(item?.totalVolume) ?? (itemLength * itemWidth * itemHeight);

    const volumeUnits =
      itemVolume > 0 && configVolume > 0 ? itemVolume / configVolume : 0;

    if (volumeUnits > 0 && baseFee > 0) {
      return volumeUnits * baseFee;
    }
  }

  return baseFee;
};

const formatPercent = (value) => {
  const number = toFiniteNumberOrNull(value);

  if (number === null) {
    return null;
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(number)}%`;
};

const formatNumberWithDots = (value) => {
  const number = toFiniteNumberOrNull(value);

  if (number === null) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(number);
};

const formatCbm = (volumeInCm3) => {
  const number = toFiniteNumberOrNull(volumeInCm3);

  if (number === null || number <= 0) {
    return "0";
  }

  const cbm = number / 1000000;

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(cbm);
};

const formatPricingRuleUnit = (conditionType) => {
  const rawValue = String(
    conditionType || "",
  ).trim();

  if (!rawValue) {
    return "";
  }

  const unitMatch = rawValue.match(
    /^(?:VND|VNĐ|₫|Đ)\s*\/\s*(.+)$/i,
  );

  if (!unitMatch?.[1]) {
    return "";
  }

  const normalizedUnit =
    normalizePricingRuleCode(unitMatch[1]);

  const translatedUnit = {
    PACKAGE: "kiện",
    KIEN: "kiện",
    ORDER: "đơn",
    DON: "đơn",
    ITEM: "sản phẩm",
    PRODUCT: "sản phẩm",
    SAN_PHAM: "sản phẩm",
    KG: "kg",
    CBM: "m³",
    M3: "m³",
  }[normalizedUnit];

  return translatedUnit || unitMatch[1].trim();
};

const formatPricingRuleFee = (rule) => {
  if (!rule || rule?.isMissing) {
    return "Chưa xác định mức phí";
  }

  const calculationType =
    normalizePricingRuleCode(
      rule?.calculationType,
    );

  const value = toFiniteNumberOrNull(
    rule?.value,
  );

  /*
   * WOOD_CRATE là phí dịch vụ tính một lần cho toàn bộ đơn.
   * Không dùng conditionType VND/kiện để nhân theo số kiện.
   */
  if (isWoodCratePricingRule(rule)) {
    const orderFee =
      value ?? DEFAULT_WOOD_CRATE_ORDER_FEE;

    return `${formatMoney(orderFee)} / đơn`;
  }

  if (Number.isFinite(rule.appliedAmount)) {
    return formatMoney(rule.appliedAmount);
  }

  const unit = formatPricingRuleUnit(
    rule?.conditionType,
  );

  if (value === null) {
    return "Theo báo giá hệ thống";
  }

  if (calculationType === "PERCENTAGE") {
    return formatPercent(value) || "Theo tỷ lệ hệ thống";
  }

  if (calculationType === "FIXED") {
    return `${formatMoney(value)}${
      unit ? ` / ${unit}` : ""
    }`;
  }

  return `${new Intl.NumberFormat(
    "vi-VN",
    {
      maximumFractionDigits: 4,
    },
  ).format(value)}${
    unit ? ` / ${unit}` : ""
  }`;
};

const formatPricingRuleFeeDetail = (rule) => {
  if (!rule || rule?.isMissing) {
    return "Không tìm thấy quy tắc tương ứng trong bảng giá.";
  }

  const parts = [];
  const conditionType =
    normalizePricingRuleCode(
      rule?.conditionType,
    );

  const conditionValue =
    toFiniteNumberOrNull(
      rule?.conditionValue,
    );

  if (
    conditionType ===
      "MIN_DECLARED_VALUE" &&
    conditionValue !== null
  ) {
    parts.push(
      `Áp dụng từ giá trị khai báo ${formatMoney(
        conditionValue,
      )}`,
    );
  }

  if (
    conditionType ===
      "MAX_DECLARED_VALUE" &&
    conditionValue !== null
  ) {
    parts.push(
      `Áp dụng đến giá trị khai báo ${formatMoney(
        conditionValue,
      )}`,
    );
  }

  if (
    rule?.minAmount !== null &&
    rule?.minAmount !== undefined
  ) {
    parts.push(
      `Tối thiểu ${formatMoney(
        rule.minAmount,
      )}`,
    );
  }

  if (
    rule?.maxAmount !== null &&
    rule?.maxAmount !== undefined
  ) {
    parts.push(
      `Tối đa ${formatMoney(
        rule.maxAmount,
      )}`,
    );
  }

  return parts.join(" • ");
};

const getPricingRuleObjectsFromConsignment = (
  consignment,
) => {
  const candidates = [
    consignment?.pricingRules,
    consignment?.selectedPricingRules,
    consignment?.additionalServices,
    consignment?.optionalServices
      ?.pricingRules,
    consignment?.optionalServices
      ?.selectedPricingRules,
  ];

  return candidates
    .filter(Array.isArray)
    .flat()
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item),
    );
};

const getPricingRuleIdsFromConsignment = (
  consignment,
) =>
  normalizePricingRuleIds([
    ...normalizeStringArray(
      consignment?.pricingRuleIds,
    ),
    ...normalizeStringArray(
      consignment?.selectedPricingRuleIds,
    ),
    ...normalizeStringArray(
      consignment?.optionalServices
        ?.selectedPricingRuleIds,
    ),
    ...getPricingRuleObjectsFromConsignment(
      consignment,
    )
      .map(
        (rule) =>
          rule?.id ||
          rule?.pricingRuleId,
      )
      .filter(Boolean),
  ]);

const getPricingRuleCodesFromConsignment = (
  consignment,
) =>
  Array.from(
    new Set(
      [
        ...normalizeStringArray(
          consignment?.pricingRuleCodes,
        ),
        ...normalizeStringArray(
          consignment?.selectedRuleCodes,
        ),
        ...normalizeStringArray(
          consignment?.optionalServices
            ?.selectedRuleCodes,
        ),
        ...getPricingRuleObjectsFromConsignment(
          consignment,
        )
          .map(
            (rule) =>
              rule?.ruleCode ||
              rule?.code ||
              rule?.ruleType,
          )
          .filter(Boolean),
      ]
        .map(normalizePricingRuleCode)
        .filter(Boolean),
    ),
  );

const formatPricingRuleCode = (value) => {
  const code = String(value || "").trim();

  if (!code) {
    return "Dịch vụ bổ sung";
  }

  return code
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (character) =>
      character.toUpperCase(),
    );
};

const PRICING_RULE_VI_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  WOOD_BOX: "Đóng thùng gỗ",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  INSPECTION: "Kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm 3%",
  INSURANCE: "Bảo hiểm hàng hóa",
  PACKING: "Đóng gói hàng hóa",
};

const getPricingRuleDisplayName = (rule) => {
  const ruleCode = String(
    rule?.ruleCode || "",
  )
    .trim()
    .toUpperCase();

  return (
    PRICING_RULE_VI_LABELS[ruleCode] ||
    String(
      rule?.ruleName ||
        rule?.name ||
        rule?.displayName ||
        "",
    ).trim() ||
    formatPricingRuleCode(ruleCode)
  );
};

const getPricingRuleColorClass = (rule) => {
  const searchableValue = [
    rule?.ruleCode,
    rule?.ruleType,
    rule?.ruleName,
    rule?.name,
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase(),
    )
    .join(" ");

  if (
    searchableValue.includes("WOOD") ||
    searchableValue.includes("THÙNG GỖ")
  ) {
    return "service-wood-crate";
  }

  if (
    searchableValue.includes("INSPECTION") ||
    searchableValue.includes("KIỂM HÀNG")
  ) {
    return "service-inspection";
  }

  if (
    searchableValue.includes("INSURANCE") ||
    searchableValue.includes("BẢO HIỂM")
  ) {
    return "service-insurance";
  }

  if (
    searchableValue.includes("DOMESTIC") ||
    searchableValue.includes("NỘI ĐỊA")
  ) {
    return "service-domestic";
  }

  if (
    searchableValue.includes("PACKING") ||
    searchableValue.includes("ĐÓNG GÓI")
  ) {
    return "service-packing";
  }

  return "service-other";
};

const escapeRegExp = (value) =>
  String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

/**
 * Dịch các mã dịch vụ được backend nối vào note.
 *
 * Ví dụ:
 * "Yêu cầu đóng gói: WOOD_CRATE"
 * -> "Yêu cầu đóng gói: Đóng thùng gỗ"
 */
const translateConsignmentNote = (
  note,
  pricingRules = [],
) => {
  const originalNote = String(note || "").trim();

  if (!originalNote) {
    return "Không có ghi chú";
  }

  const ruleNameMap = new Map(
    Object.entries(PRICING_RULE_VI_LABELS),
  );

  pricingRules.forEach((rule) => {
    const ruleCode = String(
      rule?.ruleCode || "",
    )
      .trim()
      .toUpperCase();

    if (!ruleCode) {
      return;
    }

    ruleNameMap.set(
      ruleCode,
      getPricingRuleDisplayName(rule),
    );
  });

  let translatedNote = originalNote;

  Array.from(ruleNameMap.entries())
    .sort(
      ([firstCode], [secondCode]) =>
        secondCode.length - firstCode.length,
    )
    .forEach(([ruleCode, ruleName]) => {
      translatedNote = translatedNote.replace(
        new RegExp(
          `\\b${escapeRegExp(ruleCode)}\\b`,
          "gi",
        ),
        ruleName,
      );
    });

  return translatedNote
    .replace(
      /Dịch vụ khác\s*:/gi,
      "Dịch vụ bổ sung:",
    )
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/* =========================================================
   QUY TẮC HỆ SỐ QUY ĐỔI THỂ TÍCH
   ========================================================= */

const normalizeVolumetricDivisorRule = (rule) => {
  if (
    !rule ||
    normalizeStatus(rule.ruleCode) !== "VOLUMETRIC_DIVISOR" ||
    normalizeStatus(rule.status) !== "ACTIVE"
  ) {
    return null;
  }

  const value = toFiniteNumberOrNull(rule.value);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return {
    ...rule,
    ruleCode: "VOLUMETRIC_DIVISOR",
    value,
  };
};

/* =========================================================
   TRẠNG THÁI ĐƠN HÀNG
   ========================================================= */

const QUOTATION_STATUS_LABELS = {
  DRAFT: "BẢN NHÁP",
  PENDING: "CHỜ XÁC NHẬN",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  EXPIRED: "HẾT HẠN",
};

const QUOTE_TYPE_LABELS = {
  ESTIMATE: "BÁO GIÁ TẠM TÍNH",
  FINAL: "BÁO GIÁ CHÍNH THỨC",
};


const ORDER_STATUS_LABELS = {
  DRAFT: "BẢN NHÁP",
  PENDING: "ĐANG CHỜ",
  PENDING_REVIEW: "CHỜ DUYỆT",
  QUOTATION_SENT: "ĐÃ GỬI BÁO GIÁ",
  WAITING_QUOTATION: "CHỜ BÁO GIÁ",
  PENDING_QUOTATION: "CHỜ BÁO GIÁ",
  WAITING_DEPOSIT: "CHỜ ĐẶT CỌC",
  PENDING_PAYMENT: "CHỜ THANH TOÁN",
  WAITING_PAYMENT: "CHỜ THANH TOÁN",
  PAID: "ĐÃ THANH TOÁN",
  PAYMENT_COMPLETED: "ĐÃ THANH TOÁN",
  CONFIRMED: "ĐÃ XÁC NHẬN",
  PROCESSING: "ĐANG XỬ LÝ",
  RECEIVED: "ĐÃ TIẾP NHẬN",
  WAREHOUSE_RECEIVED: "ĐÃ NHẬP KHO",
  IN_TRANSIT: "ĐANG VẬN CHUYỂN",
  SHIPPING: "ĐANG VẬN CHUYỂN",
  DELIVERING: "ĐANG GIAO HÀNG",
  DELIVERED: "ĐÃ GIAO HÀNG",
  COMPLETED: "HOÀN THÀNH",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  CANCELLED: "ĐÃ HỦY",
  CANCELED: "ĐÃ HỦY",
  EXPIRED: "ĐÃ HẾT HẠN",
};

/* =========================================================
   HÀM XỬ LÝ
   ========================================================= */

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus.replaceAll("_", " ").replaceAll("-", " ");
};

const normalizeStatusOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.statuses,
    apiResult?.data?.items,
    apiResult?.data?.statuses,
  ];

  const rawStatuses = candidates.find(Array.isArray) || [];

  return rawStatuses
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = normalizeStatus(item);

        return {
          value,
          label: formatStatusCode(value),
        };
      }

      const value = normalizeStatus(
        item?.value ||
          item?.code ||
          item?.status ||
          item?.statusCode ||
          item?.id,
      );

      const label = String(
        item?.label ||
          item?.name ||
          item?.displayName ||
          item?.statusName ||
          item?.description ||
          formatStatusCode(value),
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter((option) => option.value && option.label);
};

const getQuotationStatusLabel = (status) => {
  const normalizedStatus = normalizeStatus(status);

  return QUOTATION_STATUS_LABELS[normalizedStatus] || normalizedStatus || "-";
};

const getQuoteTypeLabel = (type) => {
  const normalizedType = normalizeStatus(type);

  return QUOTE_TYPE_LABELS[normalizedType] || normalizedType || "-";
};

const getConsignmentTypeLabel = (type) => {
  const normalizedType = normalizeStatus(type);

  if (normalizedType === "EXPRESS") {
    return "HỎA TỐC";
  }

  if (normalizedType === "STANDARD") {
    return "TIÊU CHUẨN";
  }

  return type || "-";
};

const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

const DIM_DECIMAL_PLACES = 4;
const MIN_DIM_WEIGHT = 0.0001;
const DIM_ROUNDING_EPSILON = 1e-12;

const roundDimWeightUp = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  const multiplier = 10 ** DIM_DECIMAL_PLACES;

  /*
   * Làm tròn LÊN đến 4 chữ số thập phân.
   *
   * Ví dụ:
   * 0.00001  -> 0.0001
   * 0.00101  -> 0.0011
   * 0.01111  -> 0.0112
   * 1.23101  -> 1.2311
   * 1.23450  -> 1.2345
   */
  const roundedValue =
    Math.ceil((number - DIM_ROUNDING_EPSILON) * multiplier) / multiplier;

  return Math.max(roundedValue, MIN_DIM_WEIGHT);
};

const calculateDimWeight = (length, width, height, volumetricDivisor) => {
  const lengthValue = Number(length);
  const widthValue = Number(width);
  const heightValue = Number(height);
  const divisorValue = Number(volumetricDivisor);

  if (
    !Number.isFinite(lengthValue) ||
    !Number.isFinite(widthValue) ||
    !Number.isFinite(heightValue) ||
    !Number.isFinite(divisorValue) ||
    lengthValue <= 0 ||
    widthValue <= 0 ||
    heightValue <= 0 ||
    divisorValue <= 0
  ) {
    return null;
  }

  /*
   * DIM = (Dài × Rộng × Cao)
   *       / Hệ số DIM
   */
  const rawDimWeight = (lengthValue * widthValue * heightValue) / divisorValue;

  return roundDimWeightUp(rawDimWeight);
};

const formatDimWeight = (value) => {
  const roundedValue = roundDimWeightUp(value);

  if (roundedValue === null) {
    return "-";
  }

  /*
   * Quy tắc hiển thị:
   * - DIM nhỏ hơn 1 kg: luôn hiển thị đủ 4 chữ số thập phân.
   *   Ví dụ: 0.0001 -> 0,0001; 0.5 -> 0,5000.
   * - DIM từ 1 kg trở lên: bỏ các số 0 thập phân không cần thiết.
   *   Ví dụ: 1.1 -> 1,1; 12 -> 12; 12.3456 -> 12,3456.
   */
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: roundedValue < 1 ? DIM_DECIMAL_PLACES : 0,
    maximumFractionDigits: DIM_DECIMAL_PLACES,
  }).format(roundedValue);
};

/**
 * Định dạng trọng lượng theo kiểu Việt Nam.
 *
 * Ví dụ:
 * 0.5  => 0,5
 * 1    => 1
 * 1.25 => 1,25
 */
const formatWeight = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(number);
};

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-06-26T08:17:13.1382779
 * - 2026-06-26T08:17:13Z
 * - 2026-06-26T08:17:13+07:00
 *
 * Output luôn là UTC ISO chuẩn:
 * - 2026-06-26T08:17:13.138Z
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

/**
 * Gắn field UTC vào dữ liệu chi tiết để toàn màn hình dùng thống nhất.
 */
const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  const quotation = item.quotation
    ? {
        ...item.quotation,
        createdAtUtc: normalizeApiTimeToUtc(item.quotation.createdAt),
        updatedAtUtc: normalizeApiTimeToUtc(item.quotation.updatedAt),
        expiredAtUtc: normalizeApiTimeToUtc(item.quotation.expiredAt),
      }
    : item.quotation;

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(item.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(item.updatedAt),
    cancelledAtUtc: normalizeApiTimeToUtc(item.cancelledAt),
    quotation,
  };
};

/**
 * Hiển thị theo giờ Việt Nam, nhưng dữ liệu nguồn luôn convert từ UTC.
 */
const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

/**
 * Dùng cho title/tooltip để kiểm tra UTC gốc.
 */
const formatDateTimeUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
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

const getDisplayCode = (consignment) => {
  const code =
    consignment?.consignmentCode ||
    consignment?.trackingCode ||
    consignment?.waybillCode ||
    consignment?.shipmentCode;

  return String(code || "").trim() || "Chưa được cấp mã";
};

const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");

  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Không thể sao chép mã vận đơn.");
  }
};

const getApiErrorMessage = (error, fallbackMessage = "Đã xảy ra lỗi.") => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
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

const ConsignmentListDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  /*
   * Có thể nhận dữ liệu tóm tắt từ trang danh sách.
   * Component vẫn gọi API để lấy đầy đủ customer,
   * items và quotation.
   */
  const summaryData = location.state?.consignment || null;

  const [consignment, setConsignment] = useState(null);

  const [copiedConsignmentCode, setCopiedConsignmentCode] = useState("");

  const copyResetTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [statusOptions, setStatusOptions] = useState([]);

  const [productTypeOptions, setProductTypeOptions] = useState([]);

  const [pricingRuleOptions, setPricingRuleOptions] = useState([]);

  const [pricingRuleError, setPricingRuleError] = useState("");

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

  const [volumetricDivisorRule, setVolumetricDivisorRule] = useState(null);

  const [volumetricRuleError, setVolumetricRuleError] = useState("");

  const [volumetricRuleLoading, setVolumetricRuleLoading] = useState(true);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [cancelReason, setCancelReason] = useState("");

  const [cancelReasonError, setCancelReasonError] = useState("");

  const [isCancelling, setIsCancelling] = useState(false);

  const [fullTextPreview, setFullTextPreview] = useState({
    open: false,
    title: "",
    content: "",
  });

  /* =======================================================
     LẤY RIÊNG HỆ SỐ QUY ĐỔI THỂ TÍCH
     ======================================================= */

  const fetchVolumetricDivisorRule = useCallback(async (signal) => {
    try {
      setVolumetricRuleLoading(true);
      setVolumetricRuleError("");

      console.info(
        "[Consignment Detail] GET /api/pricing-rules → VOLUMETRIC_DIVISOR",
      );

      const result = await pricingRuleService.getVolumetricDivisorRule({
        signal,
      });

      const normalizedRule = normalizeVolumetricDivisorRule(result);

      if (!normalizedRule) {
        throw new Error(
          "Không tìm thấy quy tắc VOLUMETRIC_DIVISOR đang ACTIVE hoặc value không hợp lệ.",
        );
      }

      setVolumetricDivisorRule(normalizedRule);

      console.info(
        "[Consignment Detail] VOLUMETRIC_DIVISOR đang áp dụng:",
        normalizedRule,
      );
    } catch (error) {
      if (
        axios.isCancel(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      console.error("[Consignment Detail] Lỗi tải VOLUMETRIC_DIVISOR:", error);

      setVolumetricDivisorRule(null);
      setVolumetricRuleError(
        getApiErrorMessage(
          error,
          "Không thể tải hệ số quy đổi thể tích từ API.",
        ),
      );
    } finally {
      if (!signal?.aborted) {
        setVolumetricRuleLoading(false);
      }
    }
  }, []);

  /* =======================================================
     LẤY CHI TIẾT KÝ GỬI
     ======================================================= */

  const fetchConsignmentDetail = useCallback(
    async (signal) => {
      if (!orderId) {
        setErrorMessage("Không tìm thấy mã đơn hàng.");

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        setPackageConfigurationLoading(true);
        setPackageConfigurationError("");

        const [
          detailResult,
          statusesResult,
          productTypesResult,
          pricingRulesResult,
          packageConfigurationsResult,
        ] = await Promise.allSettled([
          getConsignmentDetailApi(orderId, {
            signal,
          }),
          getConsignmentStatusesApi({
            signal,
          }),
          getProductTypesApi({
            signal,
          }),
          pricingRuleService.getPricingRules({
            signal,
            onlyActive: false,
          }),
          pricingRuleService.getPackageConfigurations({
            signal,
            onlyActive: false,
          }),
        ]);

        if (detailResult.status === "rejected") {
          throw detailResult.reason;
        }

        const detailResponse = detailResult.value;

        const responseData =
          detailResponse?.data?.data ??
          detailResponse?.data ??
          detailResponse;

        if (!responseData) {
          throw new Error(
            "API không trả về dữ liệu chi tiết lô hàng.",
          );
        }

        /*
         * Dữ liệu từ trang danh sách chỉ có một số field tóm tắt.
         * Ghép với API chi tiết để không làm mất pricingRuleIds/itemNames.
         */
        const preferNonEmptyArray = (
          primary,
          fallback,
        ) =>
          Array.isArray(primary) &&
          primary.length > 0
            ? primary
            : Array.isArray(fallback)
              ? fallback
              : [];

        const mergedResponseData = {
          ...(summaryData &&
          typeof summaryData === "object"
            ? summaryData
            : {}),
          ...responseData,
          pricingRuleIds:
            preferNonEmptyArray(
              responseData?.pricingRuleIds,
              summaryData?.pricingRuleIds,
            ),
          selectedPricingRuleIds:
            preferNonEmptyArray(
              responseData
                ?.selectedPricingRuleIds,
              summaryData
                ?.selectedPricingRuleIds,
            ),
          selectedRuleCodes:
            preferNonEmptyArray(
              responseData
                ?.selectedRuleCodes,
              summaryData
                ?.selectedRuleCodes,
            ),
          pricingRuleCodes:
            preferNonEmptyArray(
              responseData
                ?.pricingRuleCodes,
              summaryData
                ?.pricingRuleCodes,
            ),
          pricingRules:
            preferNonEmptyArray(
              responseData?.pricingRules,
              summaryData?.pricingRules,
            ),
          selectedPricingRules:
            preferNonEmptyArray(
              responseData
                ?.selectedPricingRules,
              summaryData
                ?.selectedPricingRules,
            ),
          additionalServices:
            preferNonEmptyArray(
              responseData
                ?.additionalServices,
              summaryData
                ?.additionalServices,
            ),
          optionalServices:
            responseData?.optionalServices &&
            typeof responseData
              .optionalServices ===
              "object"
              ? {
                  ...(summaryData
                    ?.optionalServices ||
                    {}),
                  ...responseData
                    .optionalServices,
                }
              : summaryData
                  ?.optionalServices ||
                {},
          itemNames:
            preferNonEmptyArray(
              responseData?.itemNames,
              summaryData?.itemNames,
            ),
        };

        setConsignment(
          normalizeConsignmentTime(
            mergedResponseData,
          ),
        );

        if (statusesResult.status === "fulfilled") {
          setStatusOptions(normalizeStatusOptions(statusesResult.value));
        } else if (
          !axios.isCancel(statusesResult.reason) &&
          statusesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách trạng thái:",
            statusesResult.reason,
          );
        }

        if (productTypesResult.status === "fulfilled") {
          setProductTypeOptions(
            normalizeProductTypeOptions(productTypesResult.value),
          );
        } else if (
          !axios.isCancel(productTypesResult.reason) &&
          productTypesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách loại sản phẩm:",
            productTypesResult.reason,
          );
        }


        if (pricingRulesResult.status === "fulfilled") {
          const normalizedPricingRules =
            normalizePricingRuleOptions(
              pricingRulesResult.value,
            );

          setPricingRuleOptions(normalizedPricingRules);
          setPricingRuleError("");

          console.info(
            "[Consignment Detail] Pricing rules dùng để hiển thị tên dịch vụ:",
            normalizedPricingRules,
          );
        } else if (
          !axios.isCancel(pricingRulesResult.reason) &&
          pricingRulesResult.reason?.code !== "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách dịch vụ bổ sung:",
            pricingRulesResult.reason,
          );

          setPricingRuleOptions([]);
          setPricingRuleError(
            getApiErrorMessage(
              pricingRulesResult.reason,
              "Không thể tải tên dịch vụ bổ sung.",
            ),
          );
        }

        if (
          packageConfigurationsResult.status ===
          "fulfilled"
        ) {
          const normalizedConfigurations =
            normalizePackageConfigurationList(
              packageConfigurationsResult.value,
            );

          setPackageConfigurations(
            normalizedConfigurations,
          );
          setPackageConfigurationError("");

          console.info(
            "[Consignment Detail] Cấu hình thùng từ API:",
            normalizedConfigurations,
          );
        } else if (
          !axios.isCancel(
            packageConfigurationsResult.reason,
          ) &&
          packageConfigurationsResult.reason?.code !==
            "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy cấu hình thùng:",
            packageConfigurationsResult.reason,
          );

          setPackageConfigurations([]);
          setPackageConfigurationError(
            getApiErrorMessage(
              packageConfigurationsResult.reason,
              "Không thể tải cấu hình thùng.",
            ),
          );
        }
      } catch (error) {
        if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
          return;
        }

        console.error("Lỗi khi lấy chi tiết ký gửi:", error);

        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.title ||
          error?.message ||
          "Không thể tải chi tiết lô hàng.";

        setErrorMessage(apiMessage);

        /*
         * Nếu API lỗi, dùng dữ liệu tóm tắt
         * từ trang danh sách làm dự phòng.
         */
        if (summaryData) {
          setConsignment(normalizeConsignmentTime(summaryData));
        } else {
          setConsignment(null);
        }

        AuthNotify.error("Không tải được dữ liệu", apiMessage);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setPackageConfigurationLoading(false);
        }
      }
    },
    [orderId, summaryData],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchConsignmentDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchConsignmentDetail]);

  useEffect(() => {
    const controller = new AbortController();

    fetchVolumetricDivisorRule(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchVolumetricDivisorRule]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );

  const handleReload = () => {
    const detailController = new AbortController();
    const pricingController = new AbortController();

    fetchConsignmentDetail(detailController.signal);
    fetchVolumetricDivisorRule(pricingController.signal);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCopyConsignmentCode = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const consignmentCode = getDisplayCode(consignment);

    if (!consignmentCode || consignmentCode === "Chưa được cấp mã") {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Đơn ký gửi chưa được cấp mã vận đơn để sao chép.",
      );
      return;
    }

    try {
      await copyTextToClipboard(consignmentCode);

      setCopiedConsignmentCode(consignmentCode);

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${consignmentCode}.`,
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedConsignmentCode("");
      }, 1800);
    } catch (error) {
      console.error("Không thể sao chép mã vận đơn:", error);

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại.",
      );
    }
  };

  const handleOpenCancelModal = () => {
    if (!consignment || !orderId) {
      AuthNotify.error(
        "Không thể hủy đơn",
        "Không tìm thấy thông tin đơn hàng để hủy.",
      );
      return;
    }

    if (normalizeStatus(consignment.status) === "CANCELLED") {
      AuthNotify.warning(
        "Đơn đã được hủy",
        "Đơn ký gửi này đã được hủy trước đó.",
      );
      return;
    }

    setCancelReason("");
    setCancelReasonError("");
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) {
      return;
    }

    setIsCancelModalOpen(false);
    setCancelReason("");
    setCancelReasonError("");
  };

  const handleCancelConsignment = async () => {
    const reason = cancelReason.trim();

    if (!reason) {
      const validationMessage = "Vui lòng nhập lý do hủy đơn.";

      setCancelReasonError(validationMessage);

      AuthNotify.warning("Thiếu lý do hủy", validationMessage);

      return;
    }

    if (reason.length < 5) {
      const validationMessage = "Lý do hủy phải có ít nhất 5 ký tự.";

      setCancelReasonError(validationMessage);

      AuthNotify.warning("Lý do chưa hợp lệ", validationMessage);

      return;
    }

    try {
      setIsCancelling(true);
      setCancelReasonError("");

      await cancelConsignmentApi(orderId, reason);

      setIsCancelModalOpen(false);
      setCancelReason("");

      AuthNotify.success(
        "Hủy đơn thành công",
        "Đơn ký gửi đã được hủy và chuyển vào lịch sử.",
      );

      navigate("/history/consignment", {
        replace: true,
        state: {
          refresh: true,
          cancelledOrderId: orderId,
        },
      });

      const refreshController = new AbortController();

      await fetchConsignmentDetail(refreshController.signal);
    } catch (error) {
      if (
        axios.isCancel(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      const responseStatus = error?.response?.status;

      const apiMessage = getApiErrorMessage(error, "Không thể hủy đơn ký gửi.");

      setCancelReasonError(apiMessage);

      if (responseStatus === 401) {
        sessionStorage.removeItem("accessToken");
        localStorage.removeItem("accessToken");

        AuthNotify.error(
          "Phiên đăng nhập hết hạn",
          "Vui lòng đăng nhập lại để tiếp tục.",
        );

        navigate("/login");
        return;
      }

      AuthNotify.error("Hủy đơn thất bại", apiMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [
          normalizeStatus(option.value),
          option.label,
        ]),
      ),
    [statusOptions],
  );

  const getStatusLabel = useCallback(
    (status) => {
      const normalizedStatus = normalizeStatus(status);

      return (
        statusLabelMap.get(normalizedStatus) ||
        ORDER_STATUS_LABELS[normalizedStatus] ||
        formatStatusCode(normalizedStatus) ||
        "-"
      );
    },
    [statusLabelMap],
  );

  const productTypeLabelMap = useMemo(
    () =>
      new Map(
        productTypeOptions.map((option) => [
          normalizeProductType(option.value),
          option.label,
        ]),
      ),
    [productTypeOptions],
  );

  const getProductTypeLabel = useCallback(
    (productType) => {
      const normalizedProductType = normalizeProductType(productType);

      if (!normalizedProductType) {
        return "-";
      }

      return (
        productTypeLabelMap.get(normalizedProductType) ||
        String(productType).trim()
      );
    },
    [productTypeLabelMap],
  );

  const pricingRuleMap = useMemo(
    () =>
      new Map(
        pricingRuleOptions.map((rule) => [
          normalizePricingRuleId(rule.id),
          rule,
        ]),
      ),
    [pricingRuleOptions],
  );

  const pricingRuleCodeMap = useMemo(
    () =>
      new Map(
        pricingRuleOptions
          .filter((rule) => rule.ruleCode)
          .map((rule) => [
            normalizePricingRuleCode(
              rule.ruleCode,
            ),
            rule,
          ]),
      ),
    [pricingRuleOptions],
  );

  const selectedPricingRules = useMemo(() => {
    const selectedRuleMap = new Map();

    const appendRule = (
      rawRule,
      fallback = {},
    ) => {
      const normalizedRule =
        normalizePricingRuleFromApi({
          ...fallback,
          ...(rawRule || {}),
        });

      const ruleCode =
        normalizePricingRuleCode(
          normalizedRule.ruleCode ||
            normalizedRule.ruleType,
        );

      if (
        ruleCode &&
        HIDDEN_ADDITIONAL_SERVICE_CODES.has(
          ruleCode,
        )
      ) {
        return;
      }

      const pricingRuleId = String(
        normalizedRule.id ||
          normalizedRule.pricingRuleId ||
          fallback?.pricingRuleId ||
          "",
      ).trim();

      const key =
        ruleCode ||
        normalizePricingRuleId(
          pricingRuleId,
        );

      if (!key) {
        return;
      }

      const nextRule = {
        ...normalizedRule,
        id:
          normalizedRule.id ||
          pricingRuleId,
        pricingRuleId:
          pricingRuleId ||
          normalizedRule.id ||
          ruleCode,
        ruleCode,
        isMissing: Boolean(
          fallback?.isMissing,
        ),
      };

      nextRule.feeLabel =
        formatPricingRuleFee(nextRule);

      nextRule.feeDetail =
        formatPricingRuleFeeDetail(
          nextRule,
        );

      selectedRuleMap.set(key, {
        ...(selectedRuleMap.get(key) ||
          {}),
        ...nextRule,
      });
    };

    getPricingRuleObjectsFromConsignment(
      consignment,
    ).forEach((rawRule) => {
      const rawId = String(
        rawRule?.id ||
          rawRule?.pricingRuleId ||
          "",
      ).trim();

      const rawCode =
        normalizePricingRuleCode(
          rawRule?.ruleCode ||
            rawRule?.code ||
            rawRule?.ruleType,
        );

      const matchedRule =
        (rawId &&
          pricingRuleMap.get(
            normalizePricingRuleId(
              rawId,
            ),
          )) ||
        (rawCode &&
          pricingRuleCodeMap.get(
            rawCode,
          )) ||
        null;

      appendRule({
        ...(matchedRule || {}),
        ...rawRule,
      });
    });

    getPricingRuleIdsFromConsignment(
      consignment,
    ).forEach((pricingRuleId) => {
      const normalizedSelectedId =
        normalizePricingRuleId(
          pricingRuleId,
        );

      const alreadyAdded =
        Array.from(
          selectedRuleMap.values(),
        ).some(
          (rule) =>
            normalizePricingRuleId(
              rule?.id ||
                rule?.pricingRuleId,
            ) === normalizedSelectedId,
        );

      if (alreadyAdded) {
        return;
      }

      const matchedRule =
        pricingRuleMap.get(
          normalizedSelectedId,
        );

      if (matchedRule) {
        appendRule(matchedRule, {
          pricingRuleId,
        });

        return;
      }

      appendRule(
        {
          id: pricingRuleId,
          pricingRuleId,
          ruleName:
            "Dịch vụ chưa xác định",
        },
        {
          pricingRuleId,
          isMissing: true,
        },
      );
    });

    getPricingRuleCodesFromConsignment(
      consignment,
    ).forEach((ruleCode) => {
      const matchedRule =
        pricingRuleCodeMap.get(
          ruleCode,
        );

      appendRule(
        matchedRule || {
          ruleCode,
          ruleName:
            PRICING_RULE_VI_LABELS[
              ruleCode
            ] ||
            formatPricingRuleCode(
              ruleCode,
            ),
        },
        {
          isMissing: !matchedRule,
        },
      );
    });

    const appendLegacyRule = (
      ruleCode,
      enabled,
    ) => {
      if (!enabled) {
        return;
      }

      const matchedRule =
        pricingRuleCodeMap.get(
          ruleCode,
        ) ||
        pricingRuleOptions.find(
          (rule) =>
            normalizePricingRuleCode(
              rule.ruleType,
            ) === ruleCode ||
            normalizePricingRuleCode(
              rule.ruleCode,
            ).includes(ruleCode),
        );

      appendRule(
        matchedRule || {
          ruleCode,
          ruleName:
            PRICING_RULE_VI_LABELS[
              ruleCode
            ] ||
            formatPricingRuleCode(
              ruleCode,
            ),
        },
        {
          isMissing: !matchedRule,
        },
      );
    };

    appendLegacyRule(
      "WOOD_CRATE",
      Boolean(
        consignment?.requiresWoodenCrate ||
          consignment
            ?.optionalServices
            ?.requiresWoodenCrate,
      ),
    );

    appendLegacyRule(
      "SUR_INSPECTION",
      Boolean(
        consignment?.requiresInspection ||
          consignment
            ?.optionalServices
            ?.requiresInspection,
      ),
    );

    if (
      consignment?.requiresInsurance ||
      consignment?.optionalServices
        ?.requiresInsurance
    ) {
      const insuranceRule =
        pricingRuleOptions.find(
          (rule) =>
            normalizePricingRuleCode(
              rule.ruleCode,
            ).includes(
              "INSURANCE",
            ) ||
            normalizePricingRuleCode(
              rule.ruleType,
            ).includes(
              "INSURANCE",
            ),
        );

      appendRule(
        insuranceRule || {
          ruleCode: "INSURANCE",
          ruleName:
            PRICING_RULE_VI_LABELS
              .INSURANCE,
        },
        {
          isMissing: !insuranceRule,
        },
      );
    }

    return Array.from(
      selectedRuleMap.values(),
    ).sort((first, second) =>
      getPricingRuleDisplayName(
        first,
      ).localeCompare(
        getPricingRuleDisplayName(
          second,
        ),
        "vi",
      ),
    );
  }, [
    consignment,
    pricingRuleCodeMap,
    pricingRuleMap,
    pricingRuleOptions,
  ]);

  const packageConfigurationMap = useMemo(
    () =>
      new Map(
        packageConfigurations.map(
          (configuration) => [
            normalizePackageConfigurationId(
              configuration.id,
            ),
            configuration,
          ],
        ),
      ),
    [packageConfigurations],
  );

  const hasWoodCrateService = useMemo(
    () =>
      Boolean(
        consignment?.requiresWoodenCrate,
      ) ||
      selectedPricingRules.some((rule) => {
        const searchableValue = [
          rule?.ruleCode,
          rule?.ruleType,
          rule?.ruleName,
        ]
          .map((value) =>
            String(value || "")
              .trim()
              .toUpperCase(),
          )
          .join(" ");

        return (
          searchableValue.includes("WOOD_CRATE") ||
          searchableValue.includes("WOOD_BOX") ||
          searchableValue.includes("THÙNG GỖ")
        );
      }),
    [
      consignment?.requiresWoodenCrate,
      selectedPricingRules,
    ],
  );

  const translatedConsignmentNote = useMemo(
    () =>
      translateConsignmentNote(
        consignment?.note,
        pricingRuleOptions,
      ),
    [consignment?.note, pricingRuleOptions],
  );

  const volumetricDivisor = useMemo(
    () => toFiniteNumberOrNull(volumetricDivisorRule?.value),
    [volumetricDivisorRule],
  );

  const getRecordProductType = useCallback((record) => {
    const productType = record?.productType;

    if (productType && typeof productType === "object") {
      return (
        productType.value ||
        productType.code ||
        productType.productTypeCode ||
        productType.productTypeId ||
        productType.id ||
        productType.name ||
        productType.productTypeName ||
        ""
      );
    }

    return (
      productType ||
      record?.productTypeCode ||
      record?.productTypeId ||
      record?.productTypeName ||
      ""
    );
  }, []);

  const handleOpenFullText = useCallback((title, content) => {
    const normalizedContent = String(content ?? "").trim();

    if (!normalizedContent || normalizedContent === "-") {
      return;
    }

    setFullTextPreview({
      open: true,
      title,
      content: normalizedContent,
    });
  }, []);

  const handleCloseFullText = useCallback(() => {
    setFullTextPreview({
      open: false,
      title: "",
      content: "",
    });
  }, []);

  /* =======================================================
     DỮ LIỆU TRUYỀN CHO FILE UI
     ======================================================= */

  const displayCode = getDisplayCode(consignment);
  const statusClass = getStatusClassName(consignment?.status);
  const isAlreadyCancelled =
    normalizeStatus(consignment?.status) === "CANCELLED";

  const quotationStatusClass = getStatusClassName(
    consignment?.quotation?.status,
  );

  const items = useMemo(() => {
    const detailItems = Array.isArray(
      consignment?.items,
    )
      ? consignment.items
      : [];

    return detailItems.map((item, index) => {
      const packageConfigurationId =
        getItemPackageConfigurationId(item);

      /*
       * API chi tiết đã trả object packageConfiguration đầy đủ.
       * Ưu tiên dùng object này để hiển thị ngay, không cần đoán.
       */
      const embeddedPackageConfiguration =
        item?.packageConfiguration &&
        typeof item.packageConfiguration === "object" &&
        !Array.isArray(item.packageConfiguration)
          ? normalizePackageConfigurationFromApi(
              item.packageConfiguration,
            )
          : null;

      /*
       * Chỉ fallback sang GET /api/package-configurations
       * khi API chi tiết chưa trả object cấu hình.
       */
      const matchedPackageConfiguration =
        !embeddedPackageConfiguration &&
        packageConfigurationId
          ? packageConfigurationMap.get(
              normalizePackageConfigurationId(
                packageConfigurationId,
              ),
            ) || null
          : null;

      const packageConfiguration =
        embeddedPackageConfiguration ||
        matchedPackageConfiguration ||
        null;

      const referenceUrls =
        normalizeItemReferenceUrls(item);

      return {
        ...item,
        id:
          item?.id ||
          item?.itemId ||
          item?.orderItemId ||
          `consignment-item-${index + 1}`,
        referenceUrl:
          referenceUrls[0] ||
          item?.referenceUrl ||
          "",
        referenceUrls,
        packageConfigurationId,
        packageConfiguration,
        packageConfigurationStatus:
          packageConfiguration
            ? "RESOLVED"
            : packageConfigurationId
              ? "NOT_FOUND"
              : hasWoodCrateService
                ? "MISSING_CONFIGURATION"
                : "NOT_USED",
      };
    });
  }, [
    consignment?.items,
    packageConfigurationMap,
    hasWoodCrateService,
  ]);

  const woodCrateFeeSummary = useMemo(() => {
    if (!hasWoodCrateService) {
      return {
        enabled: false,
        orderFee: 0,
        configurationFee: 0,
        totalFee: 0,
        configuredPackageCount: 0,
        packageCount: items.length,
      };
    }

    const woodRule =
      pricingRuleCodeMap.get(
        WOOD_CRATE_RULE_CODE,
      ) ||
      pricingRuleOptions.find(
        isWoodCratePricingRule,
      ) ||
      null;

    const orderFee =
      toFiniteNumberOrNull(woodRule?.value) ??
      DEFAULT_WOOD_CRATE_ORDER_FEE;

    const configuredItems = items.filter(
      (item) => item?.packageConfiguration,
    );

    const configurationFee = configuredItems.reduce(
      (total, item) =>
        total +
        getPackageConfigurationFee(
          item.packageConfiguration,
          item,
        ),
      0,
    );

    return {
      enabled: true,
      orderFee,
      configurationFee,
      totalFee: orderFee + configurationFee,
      configuredPackageCount:
        configuredItems.length,
      packageCount: items.length,
      rule: woodRule,
    };
  }, [
    hasWoodCrateService,
    items,
    pricingRuleCodeMap,
    pricingRuleOptions,
  ]);

  const taxRuleInfo = useMemo(() => {
    const vatRule =
      pricingRuleCodeMap.get(VAT_RULE_CODE) ||
      pricingRuleOptions.find(
        (rule) =>
          normalizePricingRuleCode(
            rule?.ruleCode,
          ) === VAT_RULE_CODE,
      ) ||
      null;

    const importTaxRule =
      pricingRuleCodeMap.get(
        IMPORT_TAX_RULE_CODE,
      ) ||
      pricingRuleOptions.find(
        (rule) =>
          normalizePricingRuleCode(
            rule?.ruleCode,
          ) === IMPORT_TAX_RULE_CODE,
      ) ||
      null;

    return {
      vatPercent: formatPercent(
        vatRule?.value,
      ),
      vatDescription:
        vatRule?.description || "",
      vatConditionType:
        vatRule?.conditionType || null,
      importTaxPercent: formatPercent(
        importTaxRule?.value,
      ),
      importTaxDescription:
        importTaxRule?.description || "",
      importTaxConditionType:
        importTaxRule?.conditionType || null,
    };
  }, [
    pricingRuleCodeMap,
    pricingRuleOptions,
  ]);

  const displaySelectedPricingRules =
    useMemo(
      () =>
        selectedPricingRules.map((rule) => {
          if (!isWoodCratePricingRule(rule)) {
            return rule;
          }

          return {
            ...rule,
            feeLabel: formatMoney(
              woodCrateFeeSummary.totalFee,
            ),
            feeDetail: [
              `${formatMoney(
                woodCrateFeeSummary.orderFee,
              )} phí dịch vụ / toàn đơn`,
              `${formatMoney(
                woodCrateFeeSummary.configurationFee,
              )} tổng phí cấu hình thùng`,
              `${woodCrateFeeSummary.configuredPackageCount}/${woodCrateFeeSummary.packageCount} kiện đã có cấu hình`,
            ].join(" • "),
            orderFee:
              woodCrateFeeSummary.orderFee,
            configurationFee:
              woodCrateFeeSummary.configurationFee,
            totalFee:
              woodCrateFeeSummary.totalFee,
          };
        }),
      [
        selectedPricingRules,
        woodCrateFeeSummary,
      ],
    );

  const customer = consignment?.customer || {};
  const quotation = consignment?.quotation || null;
  const totalPackageCount = items.length;

  const calculatedTotalDimWeight = volumetricDivisor
    ? items.reduce((total, item) => {
        const dimWeight = calculateDimWeight(
          item.length,
          item.width,
          item.height,
          volumetricDivisor,
        );

        return total + (dimWeight ?? 0);
      }, 0)
    : null;

  const apiVolumetricWeight = toFiniteNumberOrNull(
    consignment?.volumetricWeight ?? quotation?.volumetricWeight,
  );

  const totalDimWeight = Number.isFinite(calculatedTotalDimWeight)
    ? calculatedTotalDimWeight
    : apiVolumetricWeight;

  const summaryCards = consignment
    ? [
        {
          label: "Loại vận chuyển",
          value: getConsignmentTypeLabel(consignment.consignmentType),
        },
        {
          label: "Tuyến vận chuyển",
          value: consignment.route || "-",
        },
        {
          label: "Tổng trọng lượng kiện hàng",
          value: formatWeight(consignment.totalWeight),
          suffix: "kg",
        },
        {
          label: "Tổng thể tích kiện hàng",
          value: formatNumberWithDots(consignment.totalVolume),
          suffix:
            toFiniteNumberOrNull(consignment.totalVolume) > 0
              ? `cm³ (≈ ${formatCbm(consignment.totalVolume)} m³)`
              : "cm³",
        },
        {
          label: "Tổng số kiện hàng",
          value: totalPackageCount,
          suffix: "kiện",
        },

      ]
    : [];

  return (
    <ConsignmentListDetailUI
      loading={loading}
      consignment={consignment}
      customer={customer}
      quotation={quotation}
      items={items}
      errorMessage={errorMessage}
      hasSummaryData={Boolean(summaryData)}
      volumetricRuleLoading={volumetricRuleLoading}
      volumetricRuleError={volumetricRuleError}
      displayCode={displayCode}
      copiedConsignmentCode={copiedConsignmentCode}
      statusClass={statusClass}
      statusLabel={getStatusLabel(consignment?.status)}
      quotationStatusClass={quotationStatusClass}
      quotationStatusLabel={getQuotationStatusLabel(quotation?.status)}
      quoteTypeLabel={getQuoteTypeLabel(quotation?.quoteType)}
      consignmentTypeLabel={getConsignmentTypeLabel(
        consignment?.consignmentType,
      )}
      summaryCards={summaryCards}
      selectedPricingRules={displaySelectedPricingRules}
      pricingRuleError={pricingRuleError}
      woodCrateFeeSummary={woodCrateFeeSummary}
      taxRuleInfo={taxRuleInfo}
      packageConfigurationLoading={
        packageConfigurationLoading
      }
      packageConfigurationError={
        packageConfigurationError
      }
      hasWoodCrateService={
        hasWoodCrateService
      }
      translatedConsignmentNote={translatedConsignmentNote}
      volumetricDivisor={volumetricDivisor}
      fullTextPreview={fullTextPreview}
      cancelReason={cancelReason}
      cancelReasonError={cancelReasonError}
      isCancelModalOpen={isCancelModalOpen}
      isCancelling={isCancelling}
      isAlreadyCancelled={isAlreadyCancelled}
      onBack={handleBack}
      onReload={handleReload}
      onCopyConsignmentCode={handleCopyConsignmentCode}
      onOpenFullText={handleOpenFullText}
      onCloseFullText={handleCloseFullText}
      onOpenCancelModal={handleOpenCancelModal}
      onCloseCancelModal={handleCloseCancelModal}
      onConfirmCancel={handleCancelConsignment}
      onCancelReasonChange={(value) => {
        setCancelReason(value);

        if (cancelReasonError) {
          setCancelReasonError("");
        }
      }}
      getPackageConfigurationFee={getPackageConfigurationFee}
      getProductTypeLabel={getProductTypeLabel}
      getRecordProductType={getRecordProductType}
      getRuleDisplayName={getPricingRuleDisplayName}
      getRuleColorClass={getPricingRuleColorClass}
      calculateDimWeight={calculateDimWeight}
      formatDimWeight={formatDimWeight}
      formatWeight={formatWeight}
      formatMoney={formatMoney}
      formatDateTime={formatDateTime}
      formatDateTimeTitle={formatDateTimeUtcTitle}
    />
  );
};

export default ConsignmentListDetail;
