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
 * và tạo giao dịch thanh toán.
 *
 * PUT /api/quotations/{quotationId}/confirm-and-pay
 *
 * Request body:
 * {
 *   returnUrl: string,
 *   cancelUrl: string,
 *   paymentMethod: string
 * }
 *
 * API trả về thông tin/link thanh toán cho frontend.
 */
export const confirmAndPayQuotationApi = async (
  quotationId,
  payload = {},
  options = {}
) => {
  const id = validateId(
    quotationId,
    "Không tìm thấy mã báo giá để thanh toán."
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

    // Backend chỉ nhận đúng giá trị này
    paymentMethod: "SEPAY",
  };

  try {
    const response = await axiosInstance.put(
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
        "Lỗi xác nhận thanh toán SePay:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          quotationId: id,
          payload: requestPayload,
        }
      );
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

export default createPurchaseRequestApi;