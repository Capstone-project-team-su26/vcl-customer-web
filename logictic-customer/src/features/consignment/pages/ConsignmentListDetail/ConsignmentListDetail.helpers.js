/*
 * Hàm thuần (pure) chuẩn hóa dữ liệu API và định dạng hiển thị.
 *
 * Không đụng tới state/props/hook nên tách khỏi component được:
 * component chỉ còn phần gọi API và dựng dữ liệu cho lớp UI.
 */

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "@shared/utils/timeUtc";

import {
  DIM_DECIMAL_PLACES,
  DIM_ROUNDING_EPSILON,
  MIN_DIM_WEIGHT,
  PRICING_RULE_VI_LABELS,
  QUOTATION_STATUS_LABELS,
  QUOTE_TYPE_LABELS,
} from "./ConsignmentListDetail.constants";

/* =========================================================
   LOẠI SẢN PHẨM
   ========================================================= */

export const normalizeProductType = (productType) =>
  String(productType || "")
    .trim()
    .toLowerCase();

export const normalizeProductTypeOptions = (apiResult) => {
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

export const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};


/* =========================================================
   CẤU HÌNH THÙNG GỖ
   ========================================================= */

export const normalizePackageConfigurationId = (value) =>
  String(value || "").trim().toLowerCase();

export const normalizePackageConfigurationFromApi = (configuration = {}) => {
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

export const normalizePackageConfigurationList = (apiResult) => {
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

export const getItemPackageConfigurationId = (item = {}) =>
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

export const normalizeItemReferenceUrls = (item = {}) => {
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

export const normalizePricingRuleId = (value) =>
  String(value || "").trim().toLowerCase();

export const normalizePricingRuleIds = (value) => {
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

export const normalizePricingRuleCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

export const normalizeStringArray = (value) => {
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

export const normalizePricingRuleFromApi = (rule = {}) => {
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

export const normalizePricingRuleOptions = (apiResult) => {
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

export const isWoodCratePricingRule = (rule) => {
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

export const getPackageConfigurationFee = (configuration, item = {}) => {
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

export const formatPercent = (value) => {
  const number = toFiniteNumberOrNull(value);

  if (number === null) {
    return null;
  }

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(number)}%`;
};

export const formatNumberWithDots = (value) => {
  const number = toFiniteNumberOrNull(value);

  if (number === null) {
    return "-";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(number);
};

export const formatCbm = (volumeInCm3) => {
  const number = toFiniteNumberOrNull(volumeInCm3);

  if (number === null || number <= 0) {
    return "0";
  }

  const cbm = number / 1000000;

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(cbm);
};

export const formatPricingRuleUnit = (conditionType) => {
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

export const formatPricingRuleFee = (rule) => {
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
   * WOOD_CRATE tính theo cỡ thùng của từng kiện (bảng cấu hình thùng trong
   * catalog), không còn mức cố định cho cả đơn.
   */
  if (isWoodCratePricingRule(rule)) {
    return value === null
      ? "Theo cỡ thùng từng kiện"
      : `${formatMoney(value)} / đơn`;
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

export const formatPricingRuleFeeDetail = (rule) => {
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

export const getPricingRuleObjectsFromConsignment = (
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

export const getPricingRuleIdsFromConsignment = (
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

export const getPricingRuleCodesFromConsignment = (
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

export const formatPricingRuleCode = (value) => {
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

export const getPricingRuleDisplayName = (rule) => {
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

export const getPricingRuleColorClass = (rule) => {
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

export const escapeRegExp = (value) =>
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
export const translateConsignmentNote = (
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

export const normalizeVolumetricDivisorRule = (rule) => {
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
   HÀM XỬ LÝ
   ========================================================= */

export const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

export const formatStatusCode = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus.replaceAll("_", " ").replaceAll("-", " ");
};

export const normalizeStatusOptions = (apiResult) => {
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

export const getQuotationStatusLabel = (status) => {
  const normalizedStatus = normalizeStatus(status);

  return QUOTATION_STATUS_LABELS[normalizedStatus] || normalizedStatus || "-";
};

export const getQuoteTypeLabel = (type) => {
  const normalizedType = normalizeStatus(type);

  return QUOTE_TYPE_LABELS[normalizedType] || normalizedType || "-";
};

export const getConsignmentTypeLabel = (type) => {
  const normalizedType = normalizeStatus(type);

  if (normalizedType === "EXPRESS") {
    return "HỎA TỐC";
  }

  if (normalizedType === "STANDARD") {
    return "TIÊU CHUẨN";
  }

  return type || "-";
};

export const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

export const roundDimWeightUp = (value) => {
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

export const calculateDimWeight = (length, width, height, volumetricDivisor) => {
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

export const formatDimWeight = (value) => {
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
export const formatWeight = (value) => {
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
export const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

/**
 * Gắn field UTC vào dữ liệu chi tiết để toàn màn hình dùng thống nhất.
 */
export const normalizeConsignmentTime = (item) => {
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
export const formatDateTime = (value) => {
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
export const formatDateTimeUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};

export const formatMoney = (value) => {
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

export const getDisplayCode = (consignment) => {
  const code =
    consignment?.consignmentCode ||
    consignment?.trackingCode ||
    consignment?.waybillCode ||
    consignment?.shipmentCode;

  return String(code || "").trim() || "Chưa được cấp mã";
};

export const getApiErrorMessage = (error, fallbackMessage = "Đã xảy ra lỗi.") => {
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
