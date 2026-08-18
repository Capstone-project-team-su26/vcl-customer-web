// src/api/Notification/notificationApi.js

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
 * Lấy danh sách thông báo (Phân trang và lọc chưa đọc)
 *
 * GET /api/notifications?pageNumber=1&pageSize=20&unreadOnly=false
 *
 * @param {Object} params - Tham số truy vấn
 * @param {number} [params.pageNumber=1] - Số trang hiện tại
 * @param {number} [params.pageSize=20] - Số lượng mục trên mỗi trang
 * @param {boolean} [params.unreadOnly=false] - Chỉ lấy thông báo chưa đọc
 * @param {Object} [options] - Tùy chọn cấu hình axios (signal, headers, v.v.)
 * @returns {Promise<Object>} Dữ liệu trả về từ API (items, totalCount, pageNumber, pageSize, v.v.)
 */
export const getNotificationsApi = async (params = {}, options = {}) => {
  const {
    pageNumber = 1,
    pageSize = 10,
    unreadOnly = false,
    ...restParams
  } = params;

  const queryParams = {
    pageNumber: Number(pageNumber) || 1,
    pageSize: Number(pageSize) || 10,
    unreadOnly: Boolean(unreadOnly),
    ...restParams,
  };

  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.get("/api/notifications", {
      params: queryParams,
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
        "Lỗi lấy danh sách thông báo:",
        getApiErrorMessage(error, "Lấy danh sách thông báo thất bại.")
      );
    }
    throw error;
  }
};

/**
 * Đánh dấu một thông báo là đã đọc
 *
 * PUT /api/notifications/{notificationId}/read (hoặc PATCH /api/notifications/{notificationId}/read)
 *
 * @param {string|number} notificationId - ID thông báo
 * @param {Object} [options] - Tùy chọn cấu hình axios
 */
export const markNotificationAsReadApi = async (notificationId, options = {}) => {
  const id = String(notificationId ?? "").trim();
  if (!id) {
    throw new Error("Không tìm thấy mã thông báo.");
  }

  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.put(
      `/api/notifications/${id}/read`,
      null,
      {
        signal,
        headers: {
          Accept: "*/*",
          ...(options?.headers || {}),
        },
      }
    );

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi đánh dấu đã đọc thông báo:",
        getApiErrorMessage(error, "Đánh dấu đã đọc thông báo thất bại.")
      );
    }
    throw error;
  }
};

/**
 * Đánh dấu tất cả thông báo là đã đọc
 *
 * PUT /api/notifications/read-all
 *
 * @param {Object} [options] - Tùy chọn cấu hình axios
 */
export const markAllNotificationsAsReadApi = async (options = {}) => {
  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.put(
      "/api/notifications/read-all",
      null,
      {
        signal,
        headers: {
          Accept: "*/*",
          ...(options?.headers || {}),
        },
      }
    );

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi đánh dấu tất cả thông báo đã đọc:",
        getApiErrorMessage(error, "Đánh dấu tất cả thông báo đã đọc thất bại.")
      );
    }
    throw error;
  }
};

/**
 * Xóa một thông báo
 *
 * DELETE /api/notifications/{notificationId}
 *
 * @param {string|number} notificationId - ID thông báo
 * @param {Object} [options] - Tùy chọn cấu hình axios
 */
export const deleteNotificationApi = async (notificationId, options = {}) => {
  const id = String(notificationId ?? "").trim();
  if (!id) {
    throw new Error("Không tìm thấy mã thông báo.");
  }

  const signal = getRequestSignal(options);

  try {
    const response = await axiosInstance.delete(`/api/notifications/${id}`, {
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
        "Lỗi xóa thông báo:",
        getApiErrorMessage(error, "Xóa thông báo thất bại.")
      );
    }
    throw error;
  }
};

/* =========================================================
   ALIASES & CONVENIENCE EXPORTS
   ========================================================= */

export const readNotificationApi = markNotificationAsReadApi;
export const readAllNotificationsApi = markAllNotificationsAsReadApi;

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const notificationApi = {
  getNotificationsApi,
  markNotificationAsReadApi,
  readNotificationApi,
  markAllNotificationsAsReadApi,
  readAllNotificationsApi,
  deleteNotificationApi,
};

export default notificationApi;

