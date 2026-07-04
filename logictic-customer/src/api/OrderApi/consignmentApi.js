import axiosInstance from "../axios";

const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

/* ==================== CONSIGNMENT ==================== */

export const createConsignmentApi = async (payload) => {
  if (!payload) {
    throw new Error("Dữ liệu tạo đơn ký gửi không hợp lệ.");
  }

  try {
    const response = await axiosInstance.post(
      "/api/orders/consignments",
      payload,
      {
        headers: {
          Accept: "text/plain, application/json",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Lỗi tạo đơn ký gửi:",
      error?.response?.data || error?.message
    );

    throw error;
  }
};

export const getConsignmentsApi = async (
  pageNumber = 1,
  pageSize = 100,
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/orders/consignments",
      {
        params: {
          pageNumber,
          pageSize,
        },
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentDetailApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    const response = await axiosInstance.get(
      `/api/orders/consignments/${encodeURIComponent(id)}`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* ==================== DELIVERY ADDRESS ==================== */

export const getDeliveryAddressesApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/delivery-addresses",
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
        "Lỗi lấy danh sách địa chỉ:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const createDeliveryAddressApi = async (payload) => {
  const address = String(payload?.address || "").trim();

  if (!address) {
    throw new Error("Vui lòng nhập địa chỉ nhận hàng.");
  }

  try {
    const response = await axiosInstance.post(
      "/api/delivery-addresses",
      {
        address,
      },
      {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Lỗi tạo địa chỉ nhận hàng:",
      error?.response?.data || error?.message
    );

    throw error;
  }
};

export const deleteDeliveryAddressApi = async (
  deliveryAddressId,
  options = {}
) => {
  const id = String(deliveryAddressId || "").trim();

  if (!id) {
    throw new Error("ID địa chỉ nhận hàng không hợp lệ.");
  }

  try {
    const response = await axiosInstance.delete(
      `/api/delivery-addresses/${encodeURIComponent(id)}`,
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
        "Lỗi xóa địa chỉ nhận hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* ==================== QUOTATION ==================== */

export const getOrderQuotationApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    const response = await axiosInstance.get(
      `/api/orders/${encodeURIComponent(id)}/quotation`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy báo giá đơn hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* ==================== ORDER OPTIONS ==================== */

export const getConsignmentRoutesApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/orders/consignments/routes",
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách tuyến hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentShippingOptionsApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/orders/consignments/shipping-options",
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy hình thức vận chuyển:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getProductTypesApi = async (options = {}) => {
  try {
    const response = await axiosInstance.get(
      "/api/product-types",
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
        "Lỗi lấy danh sách loại sản phẩm:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};
export const cancelConsignmentApi = async (
  orderId,
  cancelReason,
  options = {}
) => {
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedReason = String(cancelReason || "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID không hợp lệ.");
  }

  if (!normalizedReason) {
    throw new Error("Vui lòng nhập lý do hủy đơn.");
  }

  try {
    const response = await axiosInstance.put(
      `/api/orders/consignments/${encodeURIComponent(
        normalizedOrderId
      )}/cancel`,
      {
        cancelReason: normalizedReason,
      },
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi hủy đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};