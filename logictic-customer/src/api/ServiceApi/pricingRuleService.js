import axiosInstance from "../axios";

const VOLUMETRIC_DIVISOR_CODE =
  "VOLUMETRIC_DIVISOR";

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

const getResponseData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const getErrorMessage = (
  error,
  fallbackMessage
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
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
   PRICING RULE HELPERS
   ========================================================= */

const extractPricingRules = (data) => {
  const candidates = [
    data,
    data?.items,
    data?.pricingRules,
    data?.data,
    data?.data?.items,
    data?.data?.pricingRules,
  ];

  return (
    candidates.find(Array.isArray) || []
  );
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

  return (
    candidates.find(Array.isArray) || []
  );
};

const normalizeCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizeServicePricing = (item) => {
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

    servicePricingId:
      item?.servicePricingId ||
      item?.id ||
      "",

    serviceCode:
      item?.serviceCode ||
      item?.code ||
      "",

    serviceName:
      item?.serviceName ||
      item?.name ||
      "Dịch vụ",

    description:
      item?.description ||
      item?.note ||
      "",

    status:
      normalizeCode(
        item?.status || "ACTIVE"
      ),

    price: Number.isFinite(numericPrice)
      ? numericPrice
      : 0,

    currency:
      item?.currency ||
      item?.currencyCode ||
      "VND",

    unit:
      item?.unit ||
      item?.unitName ||
      "",
  };
};

/* =========================================================
   SERVICE
   ========================================================= */

const pricingRuleService = {
  /**
   * GET /api/pricing-rules
   *
   * Lấy hệ số quy đổi thể tích đang ACTIVE.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object
   * }} options
   *
   * @returns {Promise<object>}
   */
  getVolumetricDivisorRule: async (
    options = {}
  ) => {
    const {
      signal,
      params = {},
    } = options;

    try {
      console.info(
        "[Pricing Rule API] GET /api/pricing-rules",
        {
          targetRuleCode:
            VOLUMETRIC_DIVISOR_CODE,
          params,
        }
      );

      const response =
        await axiosInstance.get(
          "/api/pricing-rules",
          {
            signal,
            params,
            headers: {
              Accept: "*/*",
            },
          }
        );

      const responseData =
        getResponseData(response);

      const pricingRules =
        extractPricingRules(responseData);

      const rule = pricingRules.find(
        (item) =>
          normalizeCode(item?.ruleCode) ===
            VOLUMETRIC_DIVISOR_CODE &&
          normalizeCode(item?.status) ===
            "ACTIVE"
      );

      if (!rule) {
        throw new Error(
          "Không tìm thấy VOLUMETRIC_DIVISOR đang ACTIVE."
        );
      }

      const divisor = Number(
        rule?.value
      );

      if (
        !Number.isFinite(divisor) ||
        divisor <= 0
      ) {
        throw new Error(
          "Giá trị VOLUMETRIC_DIVISOR phải lớn hơn 0."
        );
      }

      const normalizedRule = {
        ...rule,
        ruleCode:
          VOLUMETRIC_DIVISOR_CODE,
        value: divisor,
      };

      console.info(
        "[Pricing Rule API] VOLUMETRIC_DIVISOR:",
        normalizedRule
      );

      return normalizedRule;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/pricing-rules → VOLUMETRIC_DIVISOR]",
        error?.response?.data || error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể lấy hệ số quy đổi thể tích."
        )
      );
    }
  },

  /**
   * GET /api/service-pricings
   *
   * Lấy danh sách bảng giá dịch vụ.
   *
   * Token đăng nhập sẽ được axiosInstance tự động
   * thêm vào Authorization header.
   *
   * @param {{
   *   signal?: AbortSignal,
   *   params?: object,
   *   onlyActive?: boolean
   * }} options
   *
   * @returns {Promise<Array>}
   */
  getServicePricings: async (
    options = {}
  ) => {
    const {
      signal,
      params = {},
      onlyActive = false,
    } = options;

    try {
      console.info(
        "[Service Pricing API] GET /api/service-pricings",
        {
          params,
          onlyActive,
        }
      );

      const response =
        await axiosInstance.get(
          "/api/service-pricings",
          {
            signal,
            params,
            headers: {
              Accept: "*/*",
            },
          }
        );

      const responseData =
        getResponseData(response);

      const servicePricings =
        extractServicePricings(
          responseData
        ).map(normalizeServicePricing);

      const filteredPricings =
        onlyActive
          ? servicePricings.filter(
              (item) =>
                !item.status ||
                item.status === "ACTIVE"
            )
          : servicePricings;

      console.info(
        "[Service Pricing API] Danh sách bảng giá:",
        filteredPricings
      );

      return filteredPricings;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        "[GET /api/service-pricings]",
        error?.response?.data || error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể tải bảng giá dịch vụ."
        )
      );
    }
  },

  /**
   * Lấy chi tiết một bảng giá theo ID.
   *
   * GET /api/service-pricings/{id}
   *
   * @param {string} servicePricingId
   * @param {{ signal?: AbortSignal }} options
   *
   * @returns {Promise<object>}
   */
  getServicePricingById: async (
    servicePricingId,
    options = {}
  ) => {
    const id = String(
      servicePricingId || ""
    ).trim();

    if (!id) {
      throw new Error(
        "Service Pricing ID không hợp lệ."
      );
    }

    const {
      signal,
    } = options;

    try {
      const response =
        await axiosInstance.get(
          `/api/service-pricings/${encodeURIComponent(
            id
          )}`,
          {
            signal,
            headers: {
              Accept: "*/*",
            },
          }
        );

      const responseData =
        getResponseData(response);

      if (!responseData) {
        throw new Error(
          "Không tìm thấy thông tin bảng giá dịch vụ."
        );
      }

      return normalizeServicePricing(
        responseData
      );
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      console.error(
        `[GET /api/service-pricings/${id}]`,
        error?.response?.data || error
      );

      throw new Error(
        getErrorMessage(
          error,
          "Không thể tải chi tiết bảng giá dịch vụ."
        )
      );
    }
  },
};

export const {
  getVolumetricDivisorRule,
  getServicePricings,
  getServicePricingById,
} = pricingRuleService;

export default pricingRuleService;