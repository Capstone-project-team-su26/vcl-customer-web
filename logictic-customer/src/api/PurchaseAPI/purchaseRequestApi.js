import axiosInstance from "../axios";

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getSignal = (options = {}) => {
  return options?.signal;
};

const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const validateId = (
  value,
  errorMessage
) => {
  const id = normalizeText(value);

  if (!id) {
    throw new Error(errorMessage);
  }

  return id;
};

const validateAbsoluteUrl = (
  value,
  fieldLabel
) => {
  const url = normalizeText(value);

  if (!url) {
    throw new Error(
      `Vui lòng cung cấp ${fieldLabel}.`
    );
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      `${fieldLabel} phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.`
    );
  }

  return url;
};

const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  if (
    error?.message === "Network Error" ||
    error?.code === "ERR_NETWORK"
  ) {
    return "Lỗi kết nối máy chủ (Network Error). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
  }

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

/* =========================================================
   PURCHASE REQUEST HELPERS
   ========================================================= */

const MAX_INT_32 = 2147483647;

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
};

const normalizePricingRuleIds = (payload = {}) => {
  const optionalServices =
    payload?.optionalServices &&
    typeof payload.optionalServices === "object"
      ? payload.optionalServices
      : {};

  return normalizeStringArray(
    payload?.pricingRuleIds ??
      payload?.selectedPricingRuleIds ??
      optionalServices?.selectedPricingRuleIds ??
      optionalServices?.pricingRuleIds ??
      []
  );
};

const getOptionalServiceFlag = (
  payload,
  fieldName
) => {
  const optionalServices =
    payload?.optionalServices &&
    typeof payload.optionalServices === "object"
      ? payload.optionalServices
      : {};

  return Boolean(
    payload?.[fieldName] ??
      optionalServices?.[fieldName] ??
      false
  );
};

const getImageUrlFromEntry = (entry) => {
  if (typeof entry === "string") {
    return normalizeText(entry);
  }

  if (!entry || typeof entry !== "object") {
    return "";
  }

  return normalizeText(
    entry?.url ??
      entry?.imageUrl ??
      entry?.fileUrl ??
      entry?.secureUrl ??
      entry?.previewUrl ??
      entry?.referenceUrl ??
      ""
  );
};

const normalizeItemImageUrls = (item = {}) => {
  const candidates = [
    item?.imageUrls,
    item?.referenceUrls,
    item?.images,
    item?.uploadedImageUrls,
  ];

  const urls = candidates
    .filter(Array.isArray)
    .flatMap((candidate) =>
      candidate.map(getImageUrlFromEntry)
    );

  [
    item?.imageUrl,
    item?.referenceUrl,
    item?.uploadedImageUrl,
  ].forEach((candidate) => {
    const url = getImageUrlFromEntry(candidate);

    if (url) {
      urls.push(url);
    }
  });

  return Array.from(
    new Set(urls.filter(Boolean))
  );
};

const getSourceWebsite = (item = {}) => {
  const sourceWebsite = normalizeText(
    item?.sourceWebsite
  );

  if (sourceWebsite) {
    return sourceWebsite;
  }

  const productLink = normalizeText(
    item?.productLink
  );

  try {
    return new URL(productLink).hostname;
  } catch {
    return "";
  }
};

/* =========================================================
   PURCHASE REQUEST VALIDATION
   ========================================================= */

const validatePurchaseRequest = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Dữ liệu yêu cầu mua hộ không hợp lệ."
    );
  }

  if (!normalizeText(payload.route)) {
    throw new Error(
      "Vui lòng chọn tuyến vận chuyển."
    );
  }

  if (!normalizeText(payload.shippingOption)) {
    throw new Error(
      "Vui lòng chọn phương thức vận chuyển."
    );
  }

  if (!normalizeText(payload.receiverName)) {
    throw new Error(
      "Vui lòng nhập tên người nhận."
    );
  }

  if (!normalizeText(payload.receiverPhone)) {
    throw new Error(
      "Vui lòng nhập số điện thoại người nhận."
    );
  }

  if (!normalizeText(payload.receiverAddress)) {
    throw new Error(
      "Vui lòng nhập địa chỉ nhận hàng."
    );
  }

  if (
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    throw new Error(
      "Yêu cầu mua hộ phải có ít nhất một sản phẩm."
    );
  }

  payload.items.forEach((item, index) => {
    const productNumber = index + 1;
    const quantity = Number(item?.quantity);
    const productLink = normalizeText(
      item?.productLink
    );

    if (!productLink) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập liên kết sản phẩm.`
      );
    }

    validateAbsoluteUrl(
      productLink,
      `liên kết sản phẩm ${productNumber}`
    );

    if (!getSourceWebsite(item)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Không xác định được website nguồn.`
      );
    }

    if (!normalizeText(item?.productName)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập tên sản phẩm.`
      );
    }

    if (!normalizeText(item?.productType)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng chọn loại sản phẩm.`
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng phải là số nguyên lớn hơn 0.`
      );
    }

    if (quantity > MAX_INT_32) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng vượt quá giới hạn cho phép.`
      );
    }

    if (
      normalizeItemImageUrls(item).length === 0
    ) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng tải ít nhất một ảnh sản phẩm.`
      );
    }
  });
};

const buildPurchaseRequestPayload = (
  payload
) => {
  return {
    route: normalizeText(payload.route),

    shippingOption: normalizeText(
      payload.shippingOption
    ),

    receiverName: normalizeText(
      payload.receiverName
    ),

    receiverPhone: normalizeText(
      payload.receiverPhone
    ),

    receiverAddress: normalizeText(
      payload.receiverAddress
    ),

    pricingRuleIds:
      normalizePricingRuleIds(payload),

    requiresPacking:
      getOptionalServiceFlag(
        payload,
        "requiresPacking"
      ),

    requiresWoodenCrate:
      getOptionalServiceFlag(
        payload,
        "requiresWoodenCrate"
      ),

    requiresInsurance:
      getOptionalServiceFlag(
        payload,
        "requiresInsurance"
      ),

    generalNote: normalizeText(
      payload.generalNote ??
        payload.note
    ),

    items: payload.items.map((item) => ({
      productLink: normalizeText(
        item.productLink
      ),

      sourceWebsite:
        getSourceWebsite(item),

      productType: normalizeText(
        item.productType
      ),

      productName: normalizeText(
        item.productName
      ),

      quantity: Number(item.quantity),

      attributes: normalizeText(
        item.attributes
      ),

      note: normalizeText(item.note),

      imageUrls:
        normalizeItemImageUrls(item),
    })),
  };
};

/* =========================================================
   PURCHASE REQUEST APIs
   ========================================================= */


export const createPurchaseRequestApi = async (
  payload,
  options = {}
) => {
  validatePurchaseRequest(payload);

  const requestPayload =
    buildPurchaseRequestPayload(payload);

  try {
    const response = await axiosInstance.post(
      "/api/purchase-requests",
      requestPayload,
      {
        signal: getSignal(options),

        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi tạo yêu cầu mua hộ:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};


export const getPurchaseRequestsApi = async (
  pageNumber,
  pageSize,
  options = {}
) => {
  try {
    let opts = options;
    let params = {};

    if (typeof pageNumber === "object" && pageNumber !== null) {
      opts = pageNumber;
    } else {
      if (pageNumber !== undefined) params.pageNumber = pageNumber;
      if (pageSize !== undefined) params.pageSize = pageSize;
    }

    if (opts.params) {
      params = { ...params, ...opts.params };
    }

    const response = await axiosInstance.get(
      "/api/purchase-requests",
      {
        params,
        signal: getSignal(opts),
        headers: {
          Accept: "application/json, */*",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách yêu cầu mua hộ:",
        getApiErrorMessage(
          error,
          "Không thể lấy danh sách yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

/**
 * Lấy chi tiết một yêu cầu mua hộ theo ID.
 *
 * GET /api/purchase-requests/{purchaseRequestId}
 */
export const getPurchaseRequestDetailApi = async (
  purchaseRequestId,
  options = {}
) => {
  const id = validateId(
    purchaseRequestId,
    "Không tìm thấy mã yêu cầu mua hộ."
  );

  try {
    const response = await axiosInstance.get(
      `/api/purchase-requests/${encodeURIComponent(id)}`,
      {
        signal: getSignal(options),

        headers: {
          Accept: "application/json, */*",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết yêu cầu mua hộ:",
        getApiErrorMessage(
          error,
          "Không thể lấy chi tiết yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

// Aliases cho hàm lấy chi tiết yêu cầu mua hộ
export const getPurchaseRequestByIdApi = getPurchaseRequestDetailApi;
export const getPurchaseRequestById = getPurchaseRequestDetailApi;


export const rejectQuotationApi = async (
  quotationId,
  rejectionReason,
  options = {}
) => {
  const id = validateId(
    quotationId,
    "Không tìm thấy mã báo giá để từ chối."
  );

  const reason = normalizeText(
    typeof rejectionReason === "object"
      ? rejectionReason?.rejectionReason
      : rejectionReason
  );

  if (!reason) {
    throw new Error(
      "Vui lòng nhập lý do từ chối báo giá."
    );
  }

  const requestPayload = {
    rejectionReason: reason,
  };

  try {
    const response = await axiosInstance.put(
      `/api/quotations/${encodeURIComponent(
        id
      )}/reject`,
      requestPayload,
      {
        signal: getSignal(options),
        headers: {
          Accept:
            "text/plain, application/json",
          "Content-Type":
            "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi từ chối báo giá:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          quotationId: id,
          rejectionReason: reason,
        }
      );
    }

    throw error;
  }
};

export const acceptQuotationApi = async (
  quotationId,
  options = {}
) => {
  const id = validateId(
    quotationId,
    "Không tìm thấy mã báo giá để chấp nhận."
  );

  try {
    const response = await axiosInstance.put(
      `/api/quotations/${encodeURIComponent(
        id
      )}/accept`,
      null,
      {
        signal: getSignal(options),

        headers: {
          Accept:
            "text/plain, application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi chấp nhận báo giá:",
        getApiErrorMessage(
          error,
          "Không thể chấp nhận báo giá."
        )
      );
    }

    throw error;
  }
};

/**
 * Khách hàng xác nhận báo giá yêu cầu mua hộ
 * và tạo giao dịch thanh toán.
 *
 * PUT /api/purchase-requests/{purchaseRequestId}/quotation/confirm-and-pay
 *
 * Request body:
 * {
 *   returnUrl: string,
 *   cancelUrl: string,
 *   paymentMethod: string
 * }
 */
export const confirmAndPayQuotationApi = async (
  purchaseRequestIdOrQuotationId,
  payload = {},
  options = {}
) => {
  const id = validateId(
    purchaseRequestIdOrQuotationId,
    "Không tìm thấy mã yêu cầu mua hộ hoặc mã báo giá để thanh toán."
  );

  const requestPayload = {
    returnUrl: validateAbsoluteUrl(
      payload.returnUrl,
      "đường dẫn quay lại sau thanh toán"
    ),
    cancelUrl: validateAbsoluteUrl(
      payload.cancelUrl,
      "đường dẫn khi hủy thanh toán"
    ),
    paymentMethod: payload.paymentMethod || "SEPAY",
  };

  try {
    const response = await axiosInstance.put(
      `/api/purchase-requests/${encodeURIComponent(id)}/quotation/confirm-and-pay`,
      requestPayload,
      {
        signal: getSignal(options),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (error?.response?.status === 404 || error?.response?.status === 405) {
      try {
        const fallbackResponse = await axiosInstance.put(
          `/api/quotations/${encodeURIComponent(id)}/confirm-and-pay`,
          requestPayload,
          {
            signal: getSignal(options),
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
          }
        );
        return fallbackResponse.data;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }

    if (!isCanceledRequest(error)) {
      console.error("Lỗi xác nhận thanh toán mua hộ:", {
        status: error?.response?.status,
        response: error?.response?.data,
        id,
        payload: requestPayload,
      });
    }

    throw error;
  }
};

/**
 * Kiểm tra trạng thái thanh toán theo orderCode.
 *
 * GET /api/payments/status/{orderCode}
 *
 * Response thường gặp:
 * {
 *   orderCode: number,
 *   amount: number,
 *   status: string,
 *   paymentMethod: string
 * }
 */
export const getPaymentStatusApi = async (
  orderCode,
  options = {}
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch thanh toán."
  );

  try {
    const response = await axiosInstance.get(
      `/api/payments/status/${encodeURIComponent(
        code
      )}`,
      {
        signal: getSignal(options),

        headers: {
          Accept:
            "application/json, text/plain",
        },
      }
    );

    return (
      response?.data?.data ??
      response?.data ??
      null
    );
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi kiểm tra trạng thái thanh toán:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          orderCode: code,
        }
      );
    }

    throw error;
  }
};

/**
 * Lấy nội dung trang checkout SePay.
 *
 * GET /api/payments/sepay/checkout/{orderCode}
 *
 * Lưu ý:
 * - Endpoint trả về trang HTML hiển thị VietQR.
 * - Khi chỉ cần chuyển trang, dùng
 *   getSepayCheckoutPageUrl(orderCode).
 */
export const getSepayCheckoutApi = async (
  orderCode,
  options = {}
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch SePay."
  );

  try {
    const response = await axiosInstance.get(
      `/api/payments/sepay/checkout/${encodeURIComponent(
        code
      )}`,
      {
        signal: getSignal(options),

        responseType: "text",

        headers: {
          Accept:
            "text/html, application/xhtml+xml",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy trang checkout SePay:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          orderCode: code,
        }
      );
    }

    throw error;
  }
};

/**
 * Tạo URL tuyệt đối đến trang checkout SePay.
 */
export const getSepayCheckoutPageUrl = (
  orderCode
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch SePay."
  );

  const configuredApiBase =
    normalizeText(
      import.meta.env.VITE_API_BASE_URL
    );

  const fallbackApiBase =
    "https://api-vcl.zushin.io.vn";

  let apiOrigin =
    fallbackApiBase;

  try {
    apiOrigin = new URL(
      configuredApiBase ||
        fallbackApiBase,
      window.location.origin
    ).origin;
  } catch {
    apiOrigin =
      fallbackApiBase;
  }

  return new URL(
    `/api/payments/sepay/checkout/${encodeURIComponent(
      code
    )}`,
    `${apiOrigin}/`
  ).toString();
};

/**
 * Lấy URL thanh toán từ các kiểu response thường gặp.
 *
 * Hỗ trợ:
 * - response là chuỗi URL
 * - response.checkoutUrl
 * - response.paymentUrl
 * - response.data.checkoutUrl
 * - response.data.paymentUrl
 */
export const getPaymentCheckoutUrl = (
  apiResult
) => {
  if (
    typeof apiResult ===
    "string"
  ) {
    return normalizeText(
      apiResult
    );
  }

  if (
    typeof apiResult?.data ===
    "string"
  ) {
    return normalizeText(
      apiResult.data
    );
  }

  const url =
    apiResult?.checkoutUrl ||
    apiResult?.paymentUrl ||
    apiResult?.payUrl ||
    apiResult?.url ||
    apiResult?.data?.checkoutUrl ||
    apiResult?.data?.paymentUrl ||
    apiResult?.data?.payUrl ||
    apiResult?.data?.url ||
    apiResult?.data?.data?.checkoutUrl ||
    apiResult?.data?.data?.paymentUrl ||
    apiResult?.data?.data?.payUrl ||
    apiResult?.data?.data?.url ||
    "";

  return normalizeText(url);
};

/**
 * Lấy lịch sử thanh toán của một yêu cầu mua hộ.
 * GET /api/purchase-requests/{requestId}/payments
 */
export const getPurchaseRequestPaymentHistoryApi = async (
  requestId,
  options = {}
) => {
  if (!requestId) {
    throw new Error("Mã yêu cầu mua hộ (requestId) là bắt buộc.");
  }

  try {
    const response = await axiosInstance.get(
      `/api/purchase-requests/${requestId}/payments`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "application/json, */*",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        `Lỗi lấy lịch sử thanh toán yêu cầu mua hộ [${requestId}]:`,
        getApiErrorMessage(
          error,
          "Không thể lấy lịch sử thanh toán của yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

export default createPurchaseRequestApi;