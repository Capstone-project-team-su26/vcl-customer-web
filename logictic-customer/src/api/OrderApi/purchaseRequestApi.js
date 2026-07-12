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

    if (!normalizeText(item?.productLink)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập liên kết sản phẩm.`
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

    if (quantity > 2147483647) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng vượt quá giới hạn cho phép.`
      );
    }
  });
};

const buildPurchaseRequestPayload = (
  payload
) => {
  return {
    route: normalizeText(payload.route),

    receiverName: normalizeText(
      payload.receiverName
    ),

    receiverPhone: normalizeText(
      payload.receiverPhone
    ),

    receiverAddress: normalizeText(
      payload.receiverAddress
    ),

    requiresInspection: Boolean(
      payload.requiresInspection
    ),

    requiresQuantityCheck: Boolean(
      payload.requiresQuantityCheck
    ),

    generalNote: normalizeText(
      payload.generalNote
    ),

    items: payload.items.map((item) => ({
      productLink: normalizeText(
        item.productLink
      ),

      sourceWebsite: normalizeText(
        item.sourceWebsite
      ),

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

      imageUrl: normalizeText(
        item.imageUrl
      ),
    })),
  };
};

/* =========================================================
   PURCHASE REQUEST APIs
   ========================================================= */

/**
 * Tạo yêu cầu mua hộ.
 *
 * POST /api/purchase-requests
 */
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

/**
 * Lấy danh sách yêu cầu mua hộ.
 *
 * GET /api/purchase-requests
 */
export const getPurchaseRequestsApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/purchase-requests",
      {
        signal: getSignal(options),

        headers: {
          Accept: "*/*",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách yêu cầu mua hộ:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/**
 * Lấy chi tiết yêu cầu mua hộ.
 *
 * GET /api/purchase-requests/{purchaseRequestId}
 */
export const getPurchaseRequestDetailApi =
  async (
    purchaseRequestId,
    options = {}
  ) => {
    const id = validateId(
      purchaseRequestId,
      "Không tìm thấy mã yêu cầu mua hộ."
    );

    try {
      const response =
        await axiosInstance.get(
          `/api/purchase-requests/${encodeURIComponent(
            id
          )}`,
          {
            signal: getSignal(options),

            headers: {
              Accept: "*/*",
            },
          }
        );

      return response.data;
    } catch (error) {
      if (!isCanceledRequest(error)) {
        console.error(
          "Lỗi lấy chi tiết yêu cầu mua hộ:",
          error?.response?.data ||
            error?.message
        );
      }

      throw error;
    }
  };

/* =========================================================
   QUOTATION APIs
   ========================================================= */

/**
 * Khách hàng từ chối báo giá ký gửi.
 *
 * PUT /api/quotations/{quotationId}/reject
 *
 * Lưu ý:
 * - API nhận quotationId.
 * - Không truyền orderId.
 * - Token được axiosInstance tự gắn qua interceptor.
 */
export const rejectQuotationApi = async (
  quotationId,
  options = {}
) => {
  const id = validateId(
    quotationId,
    "Không tìm thấy mã báo giá để từ chối."
  );

  try {
    const response = await axiosInstance.put(
      `/api/quotations/${encodeURIComponent(
        id
      )}/reject`,
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
        "Lỗi từ chối báo giá:",
        getApiErrorMessage(
          error,
          "Không thể từ chối báo giá."
        )
      );
    }

    throw error;
  }
};

/**
 * Khách hàng chấp nhận báo giá tạm tính.
 *
 * PUT /api/quotations/{quotationId}/accept
 *
 * Lưu ý:
 * - API nhận quotationId.
 * - Không truyền orderId.
 * - API này chỉ xác nhận báo giá,
 *   chưa tạo giao dịch thanh toán.
 */
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
 * Khách hàng xác nhận báo giá ký gửi
 * và tạo giao dịch thanh toán PayOS.
 *
 * PUT /api/quotations/{quotationId}/confirm-and-pay
 *
 * Request body:
 * {
 *   returnUrl: string,
 *   cancelUrl: string
 * }
 *
 * API trả về thông tin/link thanh toán cho frontend.
 */
export const confirmAndPayQuotationApi =
  async (
    quotationId,
    payload,
    options = {}
  ) => {
    const id = validateId(
      quotationId,
      "Không tìm thấy mã báo giá để thanh toán."
    );

    if (
      !payload ||
      typeof payload !== "object"
    ) {
      throw new Error(
        "Dữ liệu tạo thanh toán không hợp lệ."
      );
    }

    const requestPayload = {
      returnUrl: validateAbsoluteUrl(
        payload.returnUrl,
        "đường dẫn quay lại sau thanh toán"
      ),

      cancelUrl: validateAbsoluteUrl(
        payload.cancelUrl,
        "đường dẫn khi hủy thanh toán"
      ),
    };

    try {
      const response =
        await axiosInstance.put(
          `/api/quotations/${encodeURIComponent(
            id
          )}/confirm-and-pay`,
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
          "Lỗi xác nhận và tạo thanh toán:",
          getApiErrorMessage(
            error,
            "Không thể tạo giao dịch thanh toán."
          )
        );
      }

      throw error;
    }
  };

/**
 * Lấy URL thanh toán từ các kiểu response thường gặp.
 *
 * Hỗ trợ:
 * - response.checkoutUrl
 * - response.paymentUrl
 * - response.data.checkoutUrl
 * - response.data.paymentUrl
 */
export const getPaymentCheckoutUrl = (
  apiResult
) => {
  const url =
    apiResult?.checkoutUrl ||
    apiResult?.paymentUrl ||
    apiResult?.payUrl ||
    apiResult?.data?.checkoutUrl ||
    apiResult?.data?.paymentUrl ||
    apiResult?.data?.payUrl ||
    "";

  return normalizeText(url);
};

export default createPurchaseRequestApi;