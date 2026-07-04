import axiosInstance from "../axios";

const getAbortSignal = (options) => {
  if (!options) {
    return null;
  }

  if (typeof options.addEventListener === "function") {
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

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

/**
 * Lấy danh sách trạng thái đơn ký gửi.
 *
 * GET /api/orders/consignments/statuses
 */
export const getConsignmentStatusesApi = async (
  options = {}
) => {
  try {
    const signal = getAbortSignal(options);

    const config = {
      headers: {
        Accept: "text/plain, application/json",
      },
    };

    if (signal) {
      config.signal = signal;
    }

    const response = await axiosInstance.get(
      "/api/orders/consignments/statuses",
      config
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách trạng thái đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};