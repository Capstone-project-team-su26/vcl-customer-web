import axiosInstance from "../axios";

// 1. API tạo mới lô hàng
export const createConsignmentApi = async (payload) => {
  try {
    const response = await axiosInstance.post(
      "/api/orders/consignments",
      payload
    );

    return response.data;
  } catch (error) {
    console.error(
      "Lỗi tạo lô hàng:",
      error.response?.data || error.message
    );

    throw error;
  }
};

// 2. API lấy danh sách lô hàng
export const getConsignmentsApi = async (
  pageNumber = 1,
  pageSize = 5,
  signal
) => {
  try {
    const config = {
      params: {
        pageNumber,
        pageSize,
      },
      headers: {
        Accept: "text/plain",
      },
    };

    if (
      signal &&
      typeof signal.addEventListener === "function"
    ) {
      config.signal = signal;
    }

    const response = await axiosInstance.get(
      "/api/orders/consignments",
      config
    );

    return response.data;
  } catch (error) {
    if (error.code !== "ERR_CANCELED") {
      console.error(
        "Lỗi lấy danh sách lô hàng:",
        error.response?.data || error.message
      );
    }

    throw error;
  }
};

// 3. API lấy chi tiết lô hàng theo orderId
export const getConsignmentDetailApi = async (
  orderId,
  signal
) => {
  try {
    if (!orderId) {
      throw new Error("Order ID không hợp lệ.");
    }

    const config = {
      headers: {
        Accept: "text/plain",
      },
    };

    if (
      signal &&
      typeof signal.addEventListener === "function"
    ) {
      config.signal = signal;
    }

    const response = await axiosInstance.get(
      `/api/orders/consignments/${encodeURIComponent(
        orderId
      )}`,
      config
    );

    return response.data;
  } catch (error) {
    if (error.code !== "ERR_CANCELED") {
      console.error(
        "Lỗi lấy chi tiết lô hàng:",
        error.response?.data || error.message
      );
    }

    throw error;
  }
};