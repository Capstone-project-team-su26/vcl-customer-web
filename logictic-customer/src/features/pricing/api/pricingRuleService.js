/* =========================================================
   pricingRuleService — một phần đã nối API thật.

   ĐÃ NỐI API THẬT (đợt A — form tạo đơn ký gửi cần id thật):
       GET  /api/pricing-rules?orderType=CONSIGNMENT → getPricingRules
            (getVolumetricDivisorRule gọi nội bộ hàm này nên cũng là dữ liệu thật)
       GET  /api/package-configurations              → getPackageConfigurations
            (mảng trần; KHÔNG dùng /options vì thiếu id)
       POST /api/package-configurations/suggest      → suggestPackageConfiguration
            (gợi ý thùng tự chọn id cho từng kiện — id mock sẽ làm hỏng POST tạo đơn)

   VẪN LÀ MOCK (đọc fixture @/mocks/data/catalog):
       getServicePricings, getServicePricingById, getAdditionalServiceFees.

   ĐÃ NỐI API THẬT (đợt B): getDepositRate (GET /api/additional-service-fees).

   Màn ngoài đợt A (mua hộ, trang giá công khai) import bản sao
   pricingRuleService.mock.js: getPricingRules ở đây luôn lọc orderType=CONSIGNMENT
   nên không dùng được cho luồng mua hộ, và trang giá công khai giữ dữ liệu mẫu.

   Giữ NGUYÊN tên export, thứ tự tham số và kiểu trả về (mảng/object đã
   chuẩn hóa, KHÔNG phải response axios) — component không được sửa một dòng.
   ========================================================= */

import { delay, deepClone } from "@/mocks/mockUtils";

/* Hai fixture dưới đây chỉ phục vụ các hàm còn mock (bảng giá, phụ phí, tỷ lệ cọc). */
import {
  pricingRules as pricingRuleFixtures,
  servicePricings as servicePricingFixtures,
} from "@/mocks/data/catalog";
import httpClient from "@shared/api/httpClient";

const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";
const DEPOSIT_RATE_CODE = "DEPOSIT_RATE";

/*
 * Giá trị dự phòng CHỈ dùng khi danh mục pricingRules thiếu rule tương ứng
 * (kèm console.warn). Nguồn thật luôn là rule trong catalog / API.
 */
/* ConsignmentPaymentService.DefaultDepositRate khi chưa cấu hình DEPOSIT_RATE. */
const BACKEND_DEFAULT_DEPOSIT_PERCENT = 50;
const FALLBACK_VOLUMETRIC_DIVISOR = 6000;
const ACTIVE_STATUS = "ACTIVE";
const CONSIGNMENT_ORDER_TYPE = "CONSIGNMENT";

/* =========================================================
   COMMON HELPERS
   ========================================================= */

/** Bóc envelope { message, data } nếu có; backend các endpoint này trả mảng trần. */
const getResponseData = (response) => {
  const body = response?.data;

  return body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

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

    /*
     * Mặc định lọc CONSIGNMENT. Truyền orderType: null để KHÔNG lọc — luồng mua hộ cần thế:
     * rule WOOD_CRATE / CARTON_REPACK / bảo hiểm / kiểm hàng nằm ngoài nhóm PURCHASE
     * (orderType=PURCHASE chỉ trả 4 rule hệ thống: phí mua, VAT, thuế NK), nên lọc theo
     * PURCHASE thì khách không còn dịch vụ nào để chọn.
     */
    const requestedOrderType =
      params?.orderType === null ? null : params?.orderType || CONSIGNMENT_ORDER_TYPE;

    const response = await httpClient.get("/api/pricing-rules", {
      ...(requestedOrderType ? { params: { orderType: requestedOrderType } } : {}),
      signal,
    });

    const normalizedRuleCodes = Array.isArray(ruleCodes)
      ? ruleCodes.map(normalizeCode).filter(Boolean)
      : [];

    /* Backend chỉ hiểu orderType; các khoá lọc còn lại vẫn lọc tại chỗ như trước. */
    const pricingRules = toArray(getResponseData(response))
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

    const response = await httpClient.get(
      "/api/package-configurations",
      { signal },
    );

    const configurations = toArray(getResponseData(response))
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

    const response = await httpClient.post(
      "/api/package-configurations/suggest",
      requestPayload,
      { signal },
    );

    /* Không có thùng nào phù hợp (kể cả CUSTOM) thì backend trả body rỗng. */
    const body = getResponseData(response);

    const suggestedConfiguration =
      body && typeof body === "object" && !Array.isArray(body)
        ? body
        : null;

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
      ...suggestedConfiguration,
      message: suggestionMessage,
    };

    return {
      ...normalizePackageConfiguration(
        suggestedConfiguration,
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
  /**
   * Tỷ lệ cọc đơn ký gửi — ĐÃ NỐI API THẬT (đợt B).
   *
   * GET /api/additional-service-fees?activeOnly=true (AllowAnonymous)
   * → { message, data: AdditionalServiceFeeResponseDto[] }.
   *
   * Bám ConsignmentPaymentService.GetDepositRateAsync: lấy dòng đang hoạt động có
   * feeCode DEPOSIT_RATE (không phân biệt hoa thường), value là phần trăm, kẹp 0..100;
   * không có dòng nào thì backend dùng 50%, ở đây cũng trả 50 kèm isFallback.
   * Backend không xét calculationType nên kết quả luôn gắn PERCENTAGE.
   * Lỗi mạng / HTTP thì ném lỗi (hộp thoại cọc hiện "Thử lại").
   *
   * Chỉ là số ƯỚC TÍNH trước khi khách xác nhận; số tiền cọc thật lấy từ response
   * confirm-and-pay. Luồng mua hộ dùng pricingRuleService.mock.js.
   */
  getDepositRate: async (
    options = {},
  ) => {
    const { signal } = options;

    const response = await httpClient.get(
      "/api/additional-service-fees",
      {
        params: { activeOnly: true },
        signal,
      },
    );

    const fees = toArray(getResponseData(response));

    const depositFee = fees.find(
      (fee) =>
        normalizeBoolean(fee?.isActive ?? true) &&
        normalizeCode(fee?.feeCode) === DEPOSIT_RATE_CODE,
    );

    const rawValue = toFiniteNumberOrNull(depositFee?.value);

    if (!depositFee || rawValue === null) {
      console.warn(
        `[pricingRuleService] Backend chưa cấu hình DEPOSIT_RATE, dùng mặc định ${BACKEND_DEFAULT_DEPOSIT_PERCENT}% như backend.`,
      );

      return {
        id: depositFee?.id || "",
        feeName: depositFee?.feeName || "Tỷ lệ đặt cọc đơn ký gửi",
        feeCode: DEPOSIT_RATE_CODE,
        calculationType: "PERCENTAGE",
        value: BACKEND_DEFAULT_DEPOSIT_PERCENT,
        unit: "%",
        isActive: true,
        isFallback: true,
      };
    }

    return {
      ...depositFee,
      feeCode: DEPOSIT_RATE_CODE,
      rawCalculationType: depositFee.calculationType ?? null,
      calculationType: "PERCENTAGE",
      value: Math.min(Math.max(rawValue, 0), 100),
      unit: depositFee.unit || "%",
      isActive: true,
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
