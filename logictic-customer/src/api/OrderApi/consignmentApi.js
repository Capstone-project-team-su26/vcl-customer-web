import axiosInstance from "../axios";

/* =========================================================
   HELPER
   ========================================================= */

/**
 * Hỗ trợ truyền AbortSignal theo hai cách:
 *
 * getApi(signal)
 * getApi({ signal })
 */
const getAbortSignal = (options) => {
  if (!options) {
    return null;
  }

  if (
    typeof options.addEventListener === "function"
  ) {
    return options;
  }

  if (
    options.signal &&
    typeof options.signal.addEventListener === "function"
  ) {
    return options.signal;
  }

  return null;
};

/**
 * Kiểm tra request có bị hủy hay không.
 */
const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

/**
 * Lấy nội dung lỗi từ API.
 */
const getApiErrorMessage = (
  error,
  fallbackMessage = "Đã xảy ra lỗi."
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  if (
    typeof responseData?.message === "string" &&
    responseData.message.trim()
  ) {
    return responseData.message;
  }

  if (
    typeof responseData?.title === "string" &&
    responseData.title.trim()
  ) {
    return responseData.title;
  }

  if (
    typeof responseData?.error === "string" &&
    responseData.error.trim()
  ) {
    return responseData.error;
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
};

/* =========================================================
   1. API TẠO MỚI ĐƠN KÝ GỬI
   ========================================================= */

export const createConsignmentApi = async (
  payload
) => {
  try {
    if (!payload) {
      throw new Error(
        "Dữ liệu tạo đơn ký gửi không hợp lệ."
      );
    }

    const response =
      await axiosInstance.post(
        "/api/orders/consignments",
        payload,
        {
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
    console.error(
      "Lỗi tạo đơn ký gửi:",
      error?.response?.data ||
        error?.message
    );

    throw error;
  }
};

/* =========================================================
   2. API LẤY DANH SÁCH ĐƠN KÝ GỬI
   ========================================================= */

export const getConsignmentsApi = async (
  pageNumber = 1,
  pageSize = 100,
  options = {}
) => {
  try {
    const signal =
      getAbortSignal(options);

    const config = {
      params: {
        pageNumber,
        pageSize,
      },

      headers: {
        Accept:
          "text/plain, application/json",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response =
      await axiosInstance.get(
        "/api/orders/consignments",
        config
      );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách đơn ký gửi:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   3. API LẤY CHI TIẾT ĐƠN KÝ GỬI
   ========================================================= */

export const getConsignmentDetailApi = async (
  orderId,
  options = {}
) => {
  try {
    const normalizedOrderId = String(
      orderId || ""
    ).trim();

    if (!normalizedOrderId) {
      throw new Error(
        "Order ID không hợp lệ."
      );
    }

    const signal =
      getAbortSignal(options);

    const config = {
      headers: {
        Accept:
          "text/plain, application/json",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response =
      await axiosInstance.get(
        `/api/orders/consignments/${encodeURIComponent(
          normalizedOrderId
        )}`,
        config
      );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết đơn ký gửi:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   4. API LẤY DANH SÁCH ĐỊA CHỈ NHẬN HÀNG
   ========================================================= */

export const getDeliveryAddressesApi = async (
  options = {}
) => {
  try {
    const signal =
      getAbortSignal(options);

    const config = {
      headers: {
        Accept: "*/*",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response =
      await axiosInstance.get(
        "/api/delivery-addresses",
        config
      );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách địa chỉ nhận hàng:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   5. API TẠO ĐỊA CHỈ NHẬN HÀNG
   ========================================================= */

/**
 * Payload mẫu:
 *
 * {
 *   receiverName: "Phong",
 *   receiverPhone: "0833183077",
 *   address: "Hẻm 32",
 *   isDefault: true
 * }
 */
export const createDeliveryAddressApi = async (
  payload
) => {
  try {
    if (!payload) {
      throw new Error(
        "Dữ liệu địa chỉ nhận hàng không hợp lệ."
      );
    }

    const receiverName = String(
      payload.receiverName || ""
    ).trim();

    const receiverPhone = String(
      payload.receiverPhone || ""
    )
      .replace(/\D/g, "")
      .slice(0, 10);

    const address = String(
      payload.address || ""
    ).trim();

    const isDefault = Boolean(
      payload.isDefault
    );

    if (!receiverName) {
      throw new Error(
        "Vui lòng nhập tên người nhận."
      );
    }

    if (receiverName.length < 2) {
      throw new Error(
        "Tên người nhận phải có ít nhất 2 ký tự."
      );
    }

    if (!receiverPhone) {
      throw new Error(
        "Vui lòng nhập số điện thoại người nhận."
      );
    }

    if (
      !/^0\d{9}$/.test(receiverPhone)
    ) {
      throw new Error(
        "Số điện thoại phải có 10 số và bắt đầu bằng số 0."
      );
    }

    if (!address) {
      throw new Error(
        "Vui lòng nhập địa chỉ nhận hàng."
      );
    }

    const requestPayload = {
      receiverName,
      receiverPhone,
      address,
      isDefault,
    };

    const response =
      await axiosInstance.post(
        "/api/delivery-addresses",
        requestPayload,
        {
          headers: {
            Accept: "*/*",
            "Content-Type":
              "application/json",
          },
        }
      );

    return response.data;
  } catch (error) {
    const errorMessage =
      getApiErrorMessage(
        error,
        "Không thể tạo địa chỉ nhận hàng."
      );

    console.error(
      "Lỗi tạo địa chỉ nhận hàng:",
      error?.response?.data ||
        errorMessage
    );

    if (error?.response) {
      throw error;
    }

    throw new Error(errorMessage);
  }
};
/* =========================================================
   6. API XÓA ĐỊA CHỈ NHẬN HÀNG
   DELETE /api/delivery-addresses/{id}
   ========================================================= */

   export const deleteDeliveryAddressApi = async (
    deliveryAddressId,
    options = {}
  ) => {
    try {
      const normalizedId = String(
        deliveryAddressId || ""
      ).trim();
  
      if (!normalizedId) {
        throw new Error(
          "ID địa chỉ nhận hàng không hợp lệ."
        );
      }
  
      const signal =
        typeof options?.addEventListener === "function"
          ? options
          : options?.signal;
  
      const config = {
        headers: {
          Accept: "*/*",
        },
      };
  
      if (signal) {
        config.signal = signal;
      }
  
      const response =
        await axiosInstance.delete(
          `/api/delivery-addresses/${encodeURIComponent(
            normalizedId
          )}`,
          config
        );
  
      return response.data;
    } catch (error) {
      if (
        error?.code !== "ERR_CANCELED" &&
        error?.name !== "AbortError"
      ) {
        console.error(
          "Lỗi xóa địa chỉ nhận hàng:",
          error?.response?.data ||
            error?.message
        );
      }
  
      throw error;
    }
  };
  /* =========================================================
   API LẤY BÁO GIÁ CỦA ĐƠN HÀNG
   GET /api/orders/{orderId}/quotation
   ========================================================= */

export const getOrderQuotationApi = async (
  orderId,
  options = {}
) => {
  try {
    const normalizedOrderId = String(
      orderId || ""
    ).trim();

    if (!normalizedOrderId) {
      throw new Error(
        "Order ID không hợp lệ."
      );
    }

    const signal =
      typeof options?.addEventListener ===
      "function"
        ? options
        : options?.signal;

    const config = {
      headers: {
        Accept: "text/plain",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response =
      await axiosInstance.get(
        `/api/orders/${encodeURIComponent(
          normalizedOrderId
        )}/quotation`,
        config
      );

    return response.data;
  } catch (error) {
    const isCanceled =
      error?.code === "ERR_CANCELED" ||
      error?.name === "CanceledError" ||
      error?.name === "AbortError";

    if (!isCanceled) {
      console.error(
        "Lỗi lấy báo giá đơn hàng:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};