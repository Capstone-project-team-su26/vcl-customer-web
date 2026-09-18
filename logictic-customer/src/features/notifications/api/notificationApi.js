// src/features/notifications/api/notificationApi.js
//
// Thông báo trong app — API thật.
//   GET /api/notifications?pageNumber&pageSize&unreadOnly
//     → { success, message, data: { items: [{ id, title, content, isRead, createdAt }],
//         totalCount, pageNumber, pageSize, totalPages }, unreadCount }
//   PUT /api/notifications/{id}/read
//   PUT /api/notifications/read-all
// Backend KHÔNG có API xoá thông báo.
//
// NotificationPanel đọc envelope phẳng { items, unreadCount, ... } (như bản mock cũ),
// nên hàm danh sách bóc `data` ra rồi gắn unreadCount vào cùng tầng.

import httpClient, { hasAccessToken } from "@shared/api/httpClient";

/*
 * Panel gọi hai kiểu: getNotificationsApi(params, { signal }) và
 * markNotificationAsReadApi(id) (không truyền gì). Nhận cả signal truyền thẳng.
 */
const getRequestSignal = (options = {}) => {
  if (options && typeof options.addEventListener === "function") {
    return options;
  }
  return options?.signal;
};

const toPositiveInt = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

/**
 * Lấy danh sách thông báo của người đang đăng nhập, mới nhất trước.
 *
 * @param {{ pageNumber?: number, pageSize?: number, unreadOnly?: boolean }} [params]
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 * @returns {Promise<{ items: object[], totalCount: number, pageNumber: number,
 *   pageSize: number, totalPages: number, hasPreviousPage: boolean,
 *   hasNextPage: boolean, unreadCount: number }>}
 */
export const getNotificationsApi = async (params = {}, options = {}) => {
  const pageNumber = toPositiveInt(params?.pageNumber, 1);
  const pageSize = toPositiveInt(params?.pageSize, 20);

  /*
   * Panel nằm trong MainLayout và tự tải lại mỗi 60s. Chưa đăng nhập thì không gọi:
   * 401 body rỗng sẽ bị httpClient coi là hết phiên và đẩy về /login.
   */
  if (!hasAccessToken()) {
    return {
      items: [],
      totalCount: 0,
      pageNumber,
      pageSize,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
      unreadCount: 0,
    };
  }

  const response = await httpClient.get("/api/notifications", {
    params: {
      pageNumber,
      pageSize,
      unreadOnly: Boolean(params?.unreadOnly),
    },
    signal: getRequestSignal(options),
  });

  const body = response?.data || {};
  const page = body?.data && typeof body.data === "object" ? body.data : {};
  const items = Array.isArray(page.items) ? page.items : [];
  const totalPages = Number(page.totalPages) || 0;
  const currentPage = Number(page.pageNumber) || pageNumber;

  return {
    items,
    totalCount: Number(page.totalCount) || items.length,
    pageNumber: currentPage,
    pageSize: Number(page.pageSize) || pageSize,
    totalPages,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
    unreadCount:
      typeof body.unreadCount === "number"
        ? body.unreadCount
        : items.filter((item) => !item?.isRead).length,
  };
};

/**
 * Đánh dấu một thông báo đã đọc. PUT /api/notifications/{notificationId}/read
 *
 * @param {string} notificationId
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 */
export const markNotificationAsReadApi = async (notificationId, options = {}) => {
  const id = String(notificationId ?? "").trim();
  if (!id) {
    throw new Error("Không tìm thấy mã thông báo.");
  }

  const response = await httpClient.put(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    undefined,
    { signal: getRequestSignal(options) }
  );

  return {
    success: true,
    notificationId: id,
    isRead: true,
    message: response?.data?.message,
  };
};

/**
 * Đánh dấu tất cả thông báo đã đọc. PUT /api/notifications/read-all
 *
 * @param {{ signal?: AbortSignal } | AbortSignal} [options]
 */
export const markAllNotificationsAsReadApi = async (options = {}) => {
  const response = await httpClient.put(
    "/api/notifications/read-all",
    undefined,
    { signal: getRequestSignal(options) }
  );

  return {
    ...(response?.data || {}),
    success: true,
    unreadCount: 0,
  };
};

/**
 * Backend không có API xoá thông báo. Giữ export cho nơi import cũ, nhưng
 * từ chối ngay tại chỗ thay vì gọi một endpoint không tồn tại.
 */
export const deleteNotificationApi = async () => {
  const error = new Error("Hệ thống chưa hỗ trợ xoá thông báo.");
  error.response = {
    status: 405,
    data: { message: error.message },
  };
  throw error;
};

/* =========================================================
   ALIASES & DEFAULT EXPORT
   ========================================================= */

export const readNotificationApi = markNotificationAsReadApi;
export const readAllNotificationsApi = markAllNotificationsAsReadApi;

const notificationApi = {
  getNotificationsApi,
  markNotificationAsReadApi,
  readNotificationApi,
  markAllNotificationsAsReadApi,
  readAllNotificationsApi,
  deleteNotificationApi,
};

export default notificationApi;
