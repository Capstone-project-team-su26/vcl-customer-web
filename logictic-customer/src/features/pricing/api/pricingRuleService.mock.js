/* =========================================================
   ⚠ BẢN SAO MOCK TẠM THỜI — KHÔNG NỐI API THẬT VÀO FILE NÀY.

   File này là bản sao NGUYÊN VĂN bản mock của pricingRuleService.js (chụp trước khi
   pricingRuleService.js được nối API thật ở đợt A), chỉ dành cho các màn NGOÀI đợt A
   để chúng không trộn dữ liệu thật với dữ liệu mẫu.

   - Không làm theo hướng dẫn "CẮM / NỐI API THẬT" trong comment bên dưới:
     làm vậy là tạo ra module API thật thứ hai. API thật chỉ nằm ở pricingRuleService.js.
   - Khi các màn đang import file này tới đợt của mình, đổi import của chúng
     về pricingRuleService.js; không còn ai import thì XOÁ file này (và mục của nó trong
     tools/api-contract.json).
   ========================================================= */

/* =========================================================
   pricingRuleService (MOCK — bản build UI-only)

   Tầng HTTP thật đã được gỡ; toàn bộ dữ liệu bảng giá / quy tắc tính phí /
   cấu hình thùng / phụ phí lấy thẳng từ fixture @/mocks/data/catalog để các
   màn hình "Chính sách dịch vụ", modal "Dịch vụ bổ sung", báo giá ký gửi và
   hộp thoại đặt cọc vẫn render đúng như khi có backend.

   CẮM API THẬT TRỞ LẠI:
   - Bỏ import từ @/mocks, import lại axiosInstance từ @shared/api/httpClient.
   - Gọi lại đúng các endpoint cũ, giữ nguyên phần normalize bên dưới:
       GET  /api/pricing-rules            → getPricingRules / getVolumetricDivisorRule
       GET  /api/service-pricings         → getServicePricings
       GET  /api/service-pricings/{id}    → getServicePricingById
       GET  /api/package-configurations   → getPackageConfigurations
       POST /api/package-configurations/suggest → suggestPackageConfiguration
       GET  /api/pricing-rules            → getAdditionalServiceFees / getDepositRate
         (một danh mục phí duy nhất; không còn /api/additional-service-fees)
   - Bọc kết quả bằng getResponseData(response) rồi mới normalize như cũ.

   Giữ NGUYÊN tên export, thứ tự tham số và kiểu trả về (mảng/object đã
   chuẩn hóa, KHÔNG phải response axios) — component không được sửa một dòng.
   ========================================================= */

import { delay, deepClone } from "@/mocks/mockUtils";

import {
  pricingRules as pricingRuleFixtures,
  servicePricings as servicePricingFixtures,
  packageConfigurations as packageConfigurationFixtures,
} from "@/mocks/data/catalog";

const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";
const DEPOSIT_RATE_CODE = "DEPOSIT_RATE";

/*
 * Giá trị dự phòng CHỈ dùng khi danh mục pricingRules thiếu rule tương ứng
 * (kèm console.warn). Nguồn thật luôn là rule trong catalog / API.
 */
const FALLBACK_DEPOSIT_PERCENT = 30;
const FALLBACK_VOLUMETRIC_DIVISOR = 6000;
const ACTIVE_STATUS = "ACTIVE";

/* =========================================================
   COMMON HELPERS
   ========================================================= */

const normalizeCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  return ["true", "1", "yes", "active"].includes(normalizedValue);
};

/*
 * Bản thật đẩy `params` xuống query string và để backend lọc.
 * Mock lọc tại chỗ theo đúng những khoá mà backend cũ hiểu; khoá lạ được bỏ
 * qua thay vì trả mảng rỗng, vì lọc nhầm là màn hình trắng chứ không phải lỗi.
 */
const FILTERABLE_CODE_FIELDS = [
  "status",
  "ruleCode",
  "ruleType",
  "calculationType",
  "serviceCode",
  "serviceType",
  "originCountry",
  "destinationCountry",
  "configCode",
  "feeCode",
];

const matchesParams = (item, params = {}) => {
  if (!params || typeof params !== "object") {
    return true;
  }

  return FILTERABLE_CODE_FIELDS.every((field) => {
    const expected = params[field];

    if (expected === null || expected === undefined || expected === "") {
      return true;
    }

    return normalizeCode(item?.[field]) === normalizeCode(expected);
  });
};

/* =========================================================
   PRICING RULE HELPERS
   ========================================================= */

const normalizePricingRule = (item = {}) => {
  const normalizedValue = toFiniteNumberOrNull(item?.value);
  const normalizedMinAmount = toFiniteNumberOrNull(item?.minAmount);
  const normalizedMaxAmount = toFiniteNumberOrNull(item?.maxAmount);

  return {
    ...item,

    id: String(item?.id || item?.pricingRuleId || "").trim(),

    servicePricingId: String(item?.servicePricingId || "").trim() || null,

    ruleName: String(
      item?.ruleName || item?.name || item?.displayName || "Quy tắc tính phí",
    ).trim(),

    ruleCode: normalizeCode(item?.ruleCode || item?.code),

    ruleType: normalizeCode(item?.ruleType || item?.type),

    conditionType:
      item?.conditionType === null || item?.conditionType === undefined
        ? null
        : String(item.conditionType).trim(),

    conditionValue:
      item?.conditionValue === null || item?.conditionValue === undefined
        ? null
        : String(item.conditionValue).trim(),

    calculationType: normalizeCode(
      item?.calculationType || item?.calculationMethod,
    ),

    value: normalizedValue,
    minAmount: normalizedMinAmount,
    maxAmount: normalizedMaxAmount,

    isRequired: normalizeBoolean(item?.isRequired),

    status: normalizeCode(item?.status || ACTIVE_STATUS),

    description: String(item?.description || item?.note || "").trim(),

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
};

/* =========================================================
   SERVICE PRICING HELPERS
   ========================================================= */

const normalizeServicePricing = (item = {}) => {
  const rawPrice =
    item?.price ??
    item?.amount ??
    item?.servicePrice ??
    item?.unitPrice ??
    item?.value ??
    0;

  const numericPrice = Number(rawPrice);

  return {
    ...item,

    id: String(item?.id || item?.servicePricingId || "").trim(),

    servicePricingId: String(
      item?.servicePricingId || item?.id || "",
    ).trim(),

    serviceCode: String(item?.serviceCode || item?.code || "").trim(),

    serviceName: String(
      item?.serviceName || item?.name || "Dịch vụ",
    ).trim(),

    description: String(item?.description || item?.note || "").trim(),

    serviceType: normalizeCode(item?.serviceType),

    originCountry: normalizeCode(item?.originCountry),

    destinationCountry: normalizeCode(item?.destinationCountry),

    status: normalizeCode(item?.status || ACTIVE_STATUS),

    price: Number.isFinite(numericPrice) ? numericPrice : 0,

    currency: String(item?.currency || item?.currencyCode || "VND")
      .trim()
      .toUpperCase(),

    unit: String(item?.unit || item?.unitName || "").trim(),

    unitType: String(item?.unitType || item?.conditionType || "").trim(),
  };
};

/* =========================================================
   PACKAGE CONFIGURATION HELPERS
   ========================================================= */

const normalizePackageConfiguration = (item = {}) => {
  return {
    ...item,

    id: String(
      item?.id ||
        item?.packageConfigurationId ||
        item?.configurationId ||
        "",
    ).trim(),

    packageConfigurationId: String(
      item?.packageConfigurationId ||
        item?.id ||
        item?.configurationId ||
        "",
    ).trim(),

    configCode: normalizeCode(
      item?.configCode ||
        item?.code,
    ),

    configName: String(
      item?.configName ||
        item?.name ||
        item?.displayName ||
        "Cấu hình đóng gói",
    ).trim(),

    length: toFiniteNumberOrNull(item?.length) ?? 0,
    width: toFiniteNumberOrNull(item?.width) ?? 0,
    height: toFiniteNumberOrNull(item?.height) ?? 0,

    maxWeight:
      toFiniteNumberOrNull(
        item?.maxWeight ??
          item?.maximumWeight,
      ) ?? 0,

    packageFee:
      toFiniteNumberOrNull(
        item?.packageFee ??
          item?.fee ??
          item?.price,
      ) ?? 0,

    status: normalizeCode(
      item?.status ||
        ACTIVE_STATUS,
    ),
  };
};

const normalizePositiveMeasurement = (
  value,
  fieldLabel,
) => {
  const numericValue = Number(value);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    throw new Error(
      `${fieldLabel} phải là số lớn hơn 0.`,
    );
  }

  return numericValue;
};

const normalizePackageSuggestionPayload = (
  payload = {},
) => {
  return {
    length: normalizePositiveMeasurement(
      payload.length,
      "Chiều dài",
    ),
    width: normalizePositiveMeasurement(
      payload.width,
      "Chiều rộng",
    ),
    height: normalizePositiveMeasurement(
      payload.height,
      "Chiều cao",
    ),
    weight: normalizePositiveMeasurement(
      payload.weight,
      "Trọng lượng",
    ),
  };
};

/**
 * Chọn thùng nhỏ nhất chứa được kiện: so ba chiều đã sắp giảm dần để
 * kiện có thể xoay ngang, và maxWeight phải đủ tải.
 *
 * Kích thước trong catalog là LÒNG thùng (phần chứa được hàng), phần nẹp gỗ
 * bọc ngoài đã nằm trong packageFee — nên so thẳng, không cộng thêm dung sai.
 * Cộng dư mỗi chiều vài cm sẽ đẩy kiện 40×30×30 (đúng bằng lòng thùng SMALL)
 * lên cỡ vừa, khách nhìn thấy hệ thống gợi ý thừa hẳn một cỡ.
 */
const findFittingConfiguration = (requestPayload) => {
  const requiredDimensions = [
    requestPayload.length,
    requestPayload.width,
    requestPayload.height,
  ].sort((first, second) => second - first);

  const candidates = packageConfigurationFixtures
    .filter(
      (configuration) =>
        normalizeCode(configuration?.status) === ACTIVE_STATUS &&
        normalizeCode(configuration?.configCode) !== "CUSTOM",
    )
    .filter((configuration) => {
      const availableDimensions = [
        Number(configuration.length) || 0,
        Number(configuration.width) || 0,
        Number(configuration.height) || 0,
      ].sort((first, second) => second - first);

      const fitsDimensions = requiredDimensions.every(
        (required, index) => availableDimensions[index] >= required,
      );

      const fitsWeight =
        Number(configuration.maxWeight) >= requestPayload.weight;

      return fitsDimensions && fitsWeight;
    })
    .sort((first, second) => {
      const firstVolume =
        (Number(first.length) || 0) *
        (Number(first.width) || 0) *
        (Number(first.height) || 0);

      const secondVolume =
        (Number(second.length) || 0) *
        (Number(second.width) || 0) *
        (Number(second.height) || 0);

      return firstVolume - secondVolume;
    });

  if (candidates.length) {
    return candidates[0];
  }

  /*
   * Không thùng tiêu chuẩn nào chứa nổi thì trả cấu hình CUSTOM — giao diện
   * nhận diện configCode "CUSTOM" và tự tính phí theo thể tích thực tế.
   */
  return (
    packageConfigurationFixtures.find(
      (configuration) =>
        normalizeCode(configuration?.configCode) === "CUSTOM",
    ) || null
  );
};

/* =========================================================
   ADDITIONAL SERVICE FEE HELPERS
   ========================================================= */

/*
 * Chuyển một pricing rule về hình dạng "phụ phí dịch vụ" cũ
 * ({ id, feeName, feeCode, calculationType, value, unit, isActive, ... })
 * để getAdditionalServiceFees / getDepositRate giữ nguyên kiểu trả về dù
 * nguồn dữ liệu đã gộp vào pricingRules.
 */
const normalizeAdditionalServiceFee = (item = {}) => {
  const status = normalizeCode(item?.status || ACTIVE_STATUS);

  return {
    ...item,

    id: String(
      item?.id ||
        item?.pricingRuleId ||
        item?.additionalServiceFeeId ||
        "",
    ).trim(),

    feeName: String(
      item?.feeName ||
        item?.ruleName ||
        item?.name ||
        "Phụ phí",
    ).trim(),

    feeCode: normalizeCode(
      item?.feeCode ||
        item?.ruleCode ||
        item?.code,
    ),

    calculationType: normalizeCode(
      item?.calculationType,
    ),

    value:
      toFiniteNumberOrNull(item?.value) ?? 0,

    unit: String(
      item?.unit || item?.conditionType || "",
    ).trim(),

    isActive:
      item?.isActive === undefined
        ? status === ACTIVE_STATUS
        : normalizeBoolean(item?.isActive),

    description: String(
      item?.description ||
        item?.note ||
        "",
    ).trim(),

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
};

/* =========================================================
   SERVICE
   ========================================================= */

const pricingRuleService = {
  /**
   * GET /api/pricing-rules
   *
   * Lấy danh sách quy tắc tính phí.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object,
   *   onlyActive?: boolean,
   *   ruleCodes?: string[]
   * }} options
   *
   * @returns {Promise<Array>}
   */
  getPricingRules: async (options = {}) => {
    const {
      signal,
      params = {},
      onlyActive = false,
      ruleCodes = [],
    } = options;

    await delay(220, { signal });

    const normalizedRuleCodes = Array.isArray(ruleCodes)
      ? ruleCodes.map(normalizeCode).filter(Boolean)
      : [];

    const pricingRules = deepClone(pricingRuleFixtures)
      .filter((rule) => matchesParams(rule, params))
      .map(normalizePricingRule);

    return pricingRules.filter((rule) => {
      const matchesStatus =
        !onlyActive || !rule.status || rule.status === ACTIVE_STATUS;

      const matchesRuleCode =
        normalizedRuleCodes.length === 0 ||
        normalizedRuleCodes.includes(rule.ruleCode);

      return matchesStatus && matchesRuleCode;
    });
  },

  /**
   * GET /api/pricing-rules
   *
   * Lấy riêng hệ số quy đổi thể tích đang ACTIVE.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object
   * }} options
   *
   * @returns {Promise<object>}
   */
  getVolumetricDivisorRule: async (options = {}) => {
    const { signal, params = {} } = options;

    const pricingRules = await pricingRuleService.getPricingRules({
      signal,
      params,
      onlyActive: true,
      ruleCodes: [VOLUMETRIC_DIVISOR_CODE],
    });

    const rule = pricingRules.find(
      (item) => item.ruleCode === VOLUMETRIC_DIVISOR_CODE,
    );

    const divisor = Number(rule?.value);

    if (!rule || !Number.isFinite(divisor) || divisor <= 0) {
      console.warn(
        `[pricingRuleService] Thiếu rule VOLUMETRIC_DIVISOR hợp lệ trong pricingRules, dùng mặc định ${FALLBACK_VOLUMETRIC_DIVISOR}.`,
      );

      return normalizePricingRule({
        ...(rule || {}),
        ruleName: rule?.ruleName || "Hệ số quy đổi thể tích",
        ruleCode: VOLUMETRIC_DIVISOR_CODE,
        ruleType: rule?.ruleType || VOLUMETRIC_DIVISOR_CODE,
        calculationType: rule?.calculationType || "FORMULA",
        status: ACTIVE_STATUS,
        value: FALLBACK_VOLUMETRIC_DIVISOR,
        isFallback: true,
      });
    }

    return {
      ...rule,
      ruleCode: VOLUMETRIC_DIVISOR_CODE,
      value: divisor,
    };
  },

  /**
   * GET /api/service-pricings
   *
   * Lấy danh sách bảng giá dịch vụ.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object,
   *   onlyActive?: boolean
   * }} options
   *
   * @returns {Promise<Array>}
   */
  getServicePricings: async (options = {}) => {
    const {
      signal,
      params = {},
      onlyActive = false,
    } = options;

    await delay(240, { signal });

    const servicePricings = deepClone(servicePricingFixtures)
      .filter((item) => matchesParams(item, params))
      .map(normalizeServicePricing);

    return onlyActive
      ? servicePricings.filter(
          (item) => !item.status || item.status === ACTIVE_STATUS,
        )
      : servicePricings;
  },

  /**
   * GET /api/service-pricings/{id}
   *
   * Lấy chi tiết một bảng giá theo ID.
   *
   * @param {string} servicePricingId
   * @param {{ signal?: AbortSignal }} options
   *
   * @returns {Promise<object>}
   */
  getServicePricingById: async (
    servicePricingId,
    options = {},
  ) => {
    const id = String(servicePricingId || "").trim();

    if (!id) {
      throw new Error("Service Pricing ID không hợp lệ.");
    }

    const { signal } = options;

    await delay(200, { signal });

    const key = id.toLowerCase();

    const found = servicePricingFixtures.find(
      (item) =>
        String(item?.id || "").toLowerCase() === key ||
        String(item?.servicePricingId || "").toLowerCase() === key,
    );

    if (!found) {
      throw new Error(
        "Không tìm thấy thông tin bảng giá dịch vụ.",
      );
    }

    return normalizeServicePricing(deepClone(found));
  },

  /**
   * GET /api/package-configurations
   *
   * Lấy danh sách cấu hình đóng gói/thùng đang có trên hệ thống.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object,
   *   onlyActive?: boolean
   * }} options
   *
   * @returns {Promise<Array>}
   */
  getPackageConfigurations: async (options = {}) => {
    const {
      signal,
      params = {},
      onlyActive = true,
    } = options;

    await delay(220, { signal });

    const configurations = deepClone(packageConfigurationFixtures)
      .filter((item) => matchesParams(item, params))
      .map(normalizePackageConfiguration)
      .filter(
        (item) =>
          item.id ||
          item.configCode,
      );

    return onlyActive
      ? configurations.filter(
          (item) =>
            !item.status ||
            item.status === ACTIVE_STATUS,
        )
      : configurations;
  },

  /**
   * POST /api/package-configurations/suggest
   *
   * Gợi ý cấu hình thùng phù hợp theo kích thước và trọng lượng kiện.
   *
   * @param {{
   *   length: number|string,
   *   width: number|string,
   *   height: number|string,
   *   weight: number|string
   * }} payload
   *
   * @param {{
   *   signal?: AbortSignal
   * }} options
   *
   * @returns {Promise<object>}
   */
  suggestPackageConfiguration: async (
    payload,
    options = {},
  ) => {
    const requestPayload =
      normalizePackageSuggestionPayload(payload);

    const { signal } = options;

    await delay(320, { signal });

    const suggestedConfiguration =
      findFittingConfiguration(requestPayload);

    if (!suggestedConfiguration) {
      throw new Error(
        "API gợi ý không trả về cấu hình đóng gói hợp lệ.",
      );
    }

    const isCustom =
      normalizeCode(suggestedConfiguration.configCode) === "CUSTOM";

    const suggestionMessage = isCustom
      ? "Kiện vượt mọi thùng tiêu chuẩn nên hệ thống đề xuất đóng thùng tùy chỉnh, phí tính theo thể tích thực tế."
      : `Kiện ${requestPayload.length}×${requestPayload.width}×${requestPayload.height} cm, ${requestPayload.weight} kg vừa với ${suggestedConfiguration.configName}.`;

    /*
     * rawResponse giữ nguyên "hình dạng" body mà backend trả về để phần
     * debug/console của component đọc được như cũ.
     */
    const rawResponse = {
      ...deepClone(suggestedConfiguration),
      message: suggestionMessage,
    };

    return {
      ...normalizePackageConfiguration(
        deepClone(suggestedConfiguration),
      ),

      suggestionMessage,

      rawResponse,
    };
  },

  /**
   * GET /api/pricing-rules
   *
   * Lấy danh sách phụ phí dịch vụ — đọc từ danh mục pricingRules duy nhất,
   * trả về hình dạng phụ phí cũ (feeCode/feeName/unit/isActive).
   *
   * @param {{
   *   signal?: AbortSignal,
   *   activeOnly?: boolean
   * }} options
   *
   * @returns {Promise<Array>}
   */
  getAdditionalServiceFees: async (
    options = {},
  ) => {
    const {
      signal,
      activeOnly = false,
    } = options;

    await delay(200, { signal });

    /*
     * Một danh mục phí duy nhất: phụ phí đọc thẳng từ pricingRules rồi đổi về
     * hình dạng phụ phí cũ. activeOnly loại rule không ACTIVE, đúng như khi
     * backend lọc sẵn.
     */
    const fees = deepClone(pricingRuleFixtures)
      .map(normalizePricingRule)
      .map(normalizeAdditionalServiceFee)
      .filter((fee) => !activeOnly || fee.isActive);

    return fees;
  },

  /**
   * Lấy tỷ lệ đặt cọc đơn ký gửi từ rule DEPOSIT_RATE trong pricingRules.
   * Thiếu/sai rule → trả mặc định 30% kèm console.warn (không ném lỗi).
   *
   * @param {{
   *   signal?: AbortSignal,
   *   activeOnly?: boolean
   * }} options
   *
   * @returns {Promise<object>}
   */
  getDepositRate: async (
    options = {},
  ) => {
    const {
      signal,
      activeOnly = true,
    } = options;

    const fees = await pricingRuleService
      .getAdditionalServiceFees({
        signal,
        activeOnly,
      });

    const depositRate = fees.find(
      (fee) => fee.feeCode === DEPOSIT_RATE_CODE,
    );

    /*
     * Đọc giá trị THÔ của rule: bước chuẩn hóa phụ phí đổi value null thành 0,
     * mà null/rỗng phải coi là thiếu cấu hình (fallback 30% + warn), không phải 0%.
     */
    const rawDepositRule = depositRate
      ? pricingRuleFixtures.find(
          (rule) =>
            String(rule?.id ?? "").trim() === depositRate.id ||
            normalizeCode(rule?.ruleCode) === DEPOSIT_RATE_CODE,
        )
      : null;

    const value = toFiniteNumberOrNull(
      rawDepositRule ? rawDepositRule.value : depositRate?.value,
    );

    if (
      !depositRate ||
      value === null ||
      value < 0 ||
      value > 100
    ) {
      console.warn(
        `[pricingRuleService] Thiếu rule DEPOSIT_RATE hợp lệ trong pricingRules, dùng mặc định ${FALLBACK_DEPOSIT_PERCENT}%.`,
      );

      return normalizeAdditionalServiceFee({
        ...(depositRate || {}),
        ruleName: depositRate?.feeName || "Tỷ lệ đặt cọc đơn ký gửi",
        ruleCode: DEPOSIT_RATE_CODE,
        calculationType: "PERCENTAGE",
        value: FALLBACK_DEPOSIT_PERCENT,
        unit: "%",
        isActive: true,
        isFallback: true,
      });
    }

    return {
      ...depositRate,
      value,
    };
  },

};

export const {
  getPricingRules,
  getVolumetricDivisorRule,
  getServicePricings,
  getServicePricingById,
  getPackageConfigurations,
  suggestPackageConfiguration,
  getAdditionalServiceFees,
  getDepositRate,
} = pricingRuleService;

export default pricingRuleService;
