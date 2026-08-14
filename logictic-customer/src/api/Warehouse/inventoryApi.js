// src/api/Warehouse/inventoryApi.js

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
 * Lấy danh sách tồn kho / kiện hàng đang lưu kho
 *
 * GET /api/inventories
 *
 * @param {Object} [options] - Tùy chọn cấu hình axios (signal, headers, v.v.)
 * @returns {Promise<Object>} Danh sách tồn kho { message, items }
 */
export const getInventoriesApi = async (options = {}) => {
  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.get("/api/inventories", {
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
        "Lỗi lấy danh sách tồn kho:",
        getApiErrorMessage(error, "Lấy danh sách tồn kho thất bại.")
      );
    }
    throw error;
  }
};

/**
 * Lấy chi tiết một kiện hàng trong kho theo parcelId
 *
 * GET /api/parcels/{parcelId}
 *
 * @param {string} parcelId - ID của kiện hàng
 * @param {Object} [options] - Tùy chọn cấu hình axios
 * @returns {Promise<Object>} Chi tiết kiện hàng (cân đo thực tế, kích thước, hình ảnh, vị trí kho)
 */
export const getParcelDetailApi = async (parcelId, options = {}) => {
  const id = String(parcelId ?? "").trim();
  if (!id) {
    throw new Error("Không tìm thấy mã kiện hàng (parcelId).");
  }

  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.get(`/api/parcels/${id}`, {
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
        "Lỗi lấy chi tiết kiện hàng:",
        getApiErrorMessage(error, "Lấy chi tiết kiện hàng thất bại.")
      );
    }
    throw error;
  }
};

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const inventoryApi = {
  getInventoriesApi,
  getParcelDetailApi,
};

export default inventoryApi;
