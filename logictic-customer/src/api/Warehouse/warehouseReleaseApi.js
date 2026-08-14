// src/api/Warehouse/warehouseReleaseApi.js

import axiosInstance from "../axios";

/* =========================================================
   HELPERS & UTILITIES
   ========================================================= */

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getRequestSignal = (options = {}) => {
  if (options && typeof options.addEventListener === "function") {
    return options;
  }
  return options?.signal;
};

const getResponseData = (response) => {
  return response?.data ?? response;
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }
  if (typeof data?.message === "string") {
    return data.message;
  }
  if (typeof data?.error === "string") {
    return data.error;
  }
  if (typeof data?.title === "string") {
    return data.title;
  }
  return error?.message || fallbackMessage;
};

/* =========================================================
   API METHODS
   ========================================================= */

/**
 * Lấy danh sách yêu cầu xuất kho / phiếu xuất kho (Warehouse Release Orders - WRO)
 *
 * GET /api/warehouse-release-requests
 *
 * @param {Object} [options] - Tùy chọn cấu hình axios (signal, params, headers)
 * @returns {Promise<Object>} Danh sách phiếu xuất kho { message, data: { items } }
 */
export const getWarehouseReleaseRequestsApi = async (options = {}) => {
  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.get("/api/warehouse-release-requests", {
      signal,
      params: options?.params,
      headers: {
        Accept: "*/*",
        ...(options?.headers || {}),
      },
    });

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách yêu cầu xuất kho:",
        getApiErrorMessage(error, "Lấy danh sách yêu cầu xuất kho thất bại.")
      );
    }
    throw error;
  }
};

/**
 * Lấy chi tiết một yêu cầu xuất kho theo wroId
 *
 * GET /api/warehouse-release-requests/{wroId}
 *
 * @param {string} wroId - ID của yêu cầu xuất kho
 * @param {Object} [options] - Tùy chọn cấu hình axios
 * @returns {Promise<Object>} Chi tiết phiếu xuất kho { message, data }
 */
export const getWarehouseReleaseRequestDetailApi = async (wroId, options = {}) => {
  const id = String(wroId ?? "").trim();
  if (!id) {
    throw new Error("Không tìm thấy mã yêu cầu xuất kho (wroId).");
  }

  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.get(`/api/warehouse-release-requests/${id}`, {
      signal,
      headers: {
        Accept: "*/*",
        ...(options?.headers || {}),
      },
    });

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết yêu cầu xuất kho:",
        getApiErrorMessage(error, "Lấy chi tiết yêu cầu xuất kho thất bại.")
      );
    }
    throw error;
  }
};

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const warehouseReleaseApi = {
  getWarehouseReleaseRequestsApi,
  getWarehouseReleaseRequestDetailApi,
};

export default warehouseReleaseApi;
