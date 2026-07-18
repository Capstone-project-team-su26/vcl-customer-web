import axiosInstance from "../axios";

const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";
const ACTIVE_STATUS = "ACTIVE";

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

const getResponseData = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

const getErrorMessage = (error, fallbackMessage) => {
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

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

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

/* =========================================================
   PRICING RULE HELPERS
   ========================================================= */

const extractPricingRules = (data) => {
  const candidates = [
    data,
    data?.items,
    data?.pricingRules,
    data?.rules,
    data?.data,
    data?.data?.items,
    data?.data?.pricingRules,
    data?.data?.rules,
  ];

  return candidates.find(Array.isArray) || [];
};

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

const extractServicePricings = (data) => {
  const candidates = [
    data,
    data?.items,
    data?.servicePricings,
    data?.servicePricing,
    data?.services,
    data?.data,
    data?.data?.items,
    data?.data?.servicePricings,
    data?.data?.servicePricing,
    data?.data?.services,
  ];

  return candidates.find(Array.isArray) || [];
};

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

    try {
      const normalizedRuleCodes = Array.isArray(ruleCodes)
        ? ruleCodes.map(normalizeCode).filter(Boolean)
        : [];

      console.info("[Pricing Rule API] GET /api/pricing-rules", {
        params,
        onlyActive,
        ruleCodes: normalizedRuleCodes,
      });

      const response = await axiosInstance.get("/api/pricing-rules", {
        signal,
        params,
        headers: {
          Accept: "*/*",
        },
      });

      const responseData = getResponseData(response);

      const pricingRules = extractPricingRules(responseData).map(
        normalizePricingRule,
      );

      const filteredRules = pricingRules.filter((rule) => {
        const matchesStatus =
          !onlyActive || !rule.status || rule.status === ACTIVE_STATUS;

        const matchesRuleCode =
          normalizedRuleCodes.length === 0 ||
          normalizedRuleCodes.includes(rule.ruleCode);

        return matchesStatus && matchesRuleCode;
      });

      console.info("[Pricing Rule API] Danh sách quy tắc:", filteredRules);

      return filteredRules;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/pricing-rules]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(error, "Không thể tải danh sách quy tắc tính phí."),
      );
    }
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

    try {
      const pricingRules = await pricingRuleService.getPricingRules({
        signal,
        params,
        onlyActive: true,
        ruleCodes: [VOLUMETRIC_DIVISOR_CODE],
      });

      const rule = pricingRules.find(
        (item) => item.ruleCode === VOLUMETRIC_DIVISOR_CODE,
      );

      if (!rule) {
        throw new Error(
          "Không tìm thấy VOLUMETRIC_DIVISOR đang ACTIVE.",
        );
      }

      const divisor = Number(rule.value);

      if (!Number.isFinite(divisor) || divisor <= 0) {
        throw new Error(
          "Giá trị VOLUMETRIC_DIVISOR phải lớn hơn 0.",
        );
      }

      const normalizedRule = {
        ...rule,
        ruleCode: VOLUMETRIC_DIVISOR_CODE,
        value: divisor,
      };

      console.info(
        "[Pricing Rule API] VOLUMETRIC_DIVISOR:",
        normalizedRule,
      );

      return normalizedRule;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/pricing-rules → VOLUMETRIC_DIVISOR]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(error, "Không thể lấy hệ số quy đổi thể tích."),
      );
    }
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

    try {
      console.info("[Service Pricing API] GET /api/service-pricings", {
        params,
        onlyActive,
      });

      const response = await axiosInstance.get("/api/service-pricings", {
        signal,
        params,
        headers: {
          Accept: "*/*",
        },
      });

      const responseData = getResponseData(response);

      const servicePricings = extractServicePricings(responseData).map(
        normalizeServicePricing,
      );

      const filteredPricings = onlyActive
        ? servicePricings.filter(
            (item) => !item.status || item.status === ACTIVE_STATUS,
          )
        : servicePricings;

      console.info(
        "[Service Pricing API] Danh sách bảng giá:",
        filteredPricings,
      );

      return filteredPricings;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/service-pricings]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(error, "Không thể tải bảng giá dịch vụ."),
      );
    }
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

    try {
      console.info(
        `[Service Pricing API] GET /api/service-pricings/${id}`,
      );

      const response = await axiosInstance.get(
        `/api/service-pricings/${encodeURIComponent(id)}`,
        {
          signal,
          headers: {
            Accept: "*/*",
          },
        },
      );

      const responseData = getResponseData(response);

      if (!responseData) {
        throw new Error(
          "Không tìm thấy thông tin bảng giá dịch vụ.",
        );
      }

      return normalizeServicePricing(responseData);
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        `[GET /api/service-pricings/${id}]`,
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(error, "Không thể tải chi tiết bảng giá dịch vụ."),
      );
    }
  },
};

export const {
  getPricingRules,
  getVolumetricDivisorRule,
  getServicePricings,
  getServicePricingById,
} = pricingRuleService;

export default pricingRuleService;