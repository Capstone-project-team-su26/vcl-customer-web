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
   PACKAGE CONFIGURATION HELPERS
   ========================================================= */

const extractPackageConfigurations = (data) => {
  const candidates = [
    data,
    data?.items,
    data?.packageConfigurations,
    data?.configurations,
    data?.packages,
    data?.data,
    data?.data?.items,
    data?.data?.packageConfigurations,
    data?.data?.configurations,
    data?.data?.packages,
  ];

  return candidates.find(Array.isArray) || [];
};

const extractSuggestedPackageConfiguration = (data) => {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return (
      data.find(
        (item) =>
          item &&
          typeof item === "object" &&
          !Array.isArray(item),
      ) || null
    );
  }

  const candidates = [
    data?.suggestedConfiguration,
    data?.suggestion,
    data?.packageConfiguration,
    data?.configuration,
    data?.recommendedConfiguration,
    data?.recommendedPackage,
    data?.result,
    data?.item,
    data?.data?.suggestedConfiguration,
    data?.data?.suggestion,
    data?.data?.packageConfiguration,
    data?.data?.configuration,
    data?.data?.recommendedConfiguration,
    data?.data?.recommendedPackage,
    data?.data?.result,
    data?.data?.item,
    data,
  ];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (
          item.id ||
          item.packageConfigurationId ||
          item.configCode ||
          item.configName
        ),
    ) || null
  );
};

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

const extractAdditionalServiceFees = (data) => {
  const candidates = [
    data,
    data?.items,
    data?.fees,
    data?.additionalServiceFees,
    data?.data,
    data?.data?.items,
    data?.data?.fees,
    data?.data?.additionalServiceFees,
  ];

  return candidates.find(Array.isArray) || [];
};

const normalizeAdditionalServiceFee = (item = {}) => {
  return {
    ...item,

    id: String(
      item?.id ||
        item?.additionalServiceFeeId ||
        "",
    ).trim(),

    feeName: String(
      item?.feeName ||
        item?.name ||
        "Phụ phí",
    ).trim(),

    feeCode: normalizeCode(
      item?.feeCode ||
        item?.code,
    ),

    calculationType: normalizeCode(
      item?.calculationType,
    ),

    value:
      toFiniteNumberOrNull(item?.value) ?? 0,

    unit: String(
      item?.unit || "",
    ).trim(),

    isActive: normalizeBoolean(
      item?.isActive,
    ),

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

    try {
      console.info(
        "[Package Configuration API] GET /api/package-configurations",
        {
          params,
          onlyActive,
        },
      );

      const response = await axiosInstance.get(
        "/api/package-configurations",
        {
          signal,
          params,
          headers: {
            Accept: "*/*",
          },
        },
      );

      const responseData = getResponseData(response);

      const configurations =
        extractPackageConfigurations(responseData)
          .map(normalizePackageConfiguration)
          .filter(
            (item) =>
              item.id ||
              item.configCode,
          );

      const filteredConfigurations = onlyActive
        ? configurations.filter(
            (item) =>
              !item.status ||
              item.status === ACTIVE_STATUS,
          )
        : configurations;

      console.info(
        "[Package Configuration API] Danh sách cấu hình:",
        filteredConfigurations,
      );

      return filteredConfigurations;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/package-configurations]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể tải danh sách cấu hình đóng gói.",
        ),
      );
    }
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

    try {
      console.info(
        "[Package Configuration API] POST /api/package-configurations/suggest",
        requestPayload,
      );

      const response = await axiosInstance.post(
        "/api/package-configurations/suggest",
        requestPayload,
        {
          signal,
          headers: {
            Accept: "*/*",
            "Content-Type": "application/json",
          },
        },
      );

      const responseData = getResponseData(response);

      const suggestedConfiguration =
        extractSuggestedPackageConfiguration(
          responseData,
        );

      if (!suggestedConfiguration) {
        console.error(
          "[POST /api/package-configurations/suggest] Response không hợp lệ:",
          responseData,
        );

        throw new Error(
          "API gợi ý không trả về cấu hình đóng gói hợp lệ.",
        );
      }

      const normalizedSuggestion = {
        ...normalizePackageConfiguration(
          suggestedConfiguration,
        ),

        suggestionMessage: String(
          responseData?.message ||
            responseData?.reason ||
            responseData?.description ||
            "",
        ).trim(),

        rawResponse: responseData,
      };

      console.info(
        "[Package Configuration API] Cấu hình được gợi ý:",
        normalizedSuggestion,
      );

      return normalizedSuggestion;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[POST /api/package-configurations/suggest]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể gợi ý cấu hình đóng gói phù hợp.",
        ),
      );
    }
  },

  /**
   * GET /api/additional-service-fees
   *
   * Lấy danh sách phụ phí dịch vụ.
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

    try {
      console.info(
        "[Additional Service Fee API] GET /api/additional-service-fees",
        {
          activeOnly,
        },
      );

      const response = await axiosInstance.get(
        "/api/additional-service-fees",
        {
          signal,
          params: {
            activeOnly,
          },
          headers: {
            Accept: "*/*",
          },
        },
      );

      const responseData = getResponseData(response);

      const fees = extractAdditionalServiceFees(
        responseData,
      ).map(normalizeAdditionalServiceFee);

      console.info(
        "[Additional Service Fee API] Danh sách phụ phí:",
        fees,
      );

      return fees;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/additional-service-fees]",
        error?.response?.data || error,
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể tải danh sách phụ phí dịch vụ.",
        ),
      );
    }
  },

  /**
   * Lấy tỷ lệ đặt cọc đơn ký gửi từ feeCode DEPOSIT_RATE.
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
      (fee) => fee.feeCode === "DEPOSIT_RATE",
    );

    if (!depositRate) {
      throw new Error(
        "Không tìm thấy tỷ lệ cọc đơn ký gửi.",
      );
    }

    const value = Number(depositRate.value);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100
    ) {
      throw new Error(
        "Tỷ lệ cọc không hợp lệ.",
      );
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