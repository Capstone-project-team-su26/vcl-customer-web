import axiosInstance from "../axios";

const VOLUMETRIC_DIVISOR_CODE =
  "VOLUMETRIC_DIVISOR";

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

const normalizeCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const pricingRuleService = {
  /**
   * GET /api/pricing-rules
   *
   * API chỉ chịu trách nhiệm lấy hệ số DIM.
   * Số lượng sản phẩm được lấy từ item của đơn hàng
   * và nhân ở màn ConsignmentListDetail.
   *
   * @param {{ signal?: AbortSignal, params?: object }} options
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

      const divisor = Number(rule.value);

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
      if (
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
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
};

export default pricingRuleService;