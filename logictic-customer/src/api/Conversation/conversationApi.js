import axiosInstance from "../axios";

const VALID_RELATED_TYPES = [
  "CONSIGNMENT",
  "PURCHASE_REQUEST",
  "QUOTATION",
];

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

const normalizeNullableText = (value) => {
  const text = normalizeText(value);
  return text || null;
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

const validateRelatedType = (relatedType) => {
  const type = normalizeText(relatedType);

  if (!type) {
    return;
  }

  if (!VALID_RELATED_TYPES.includes(type)) {
    throw new Error(
      "Loại liên kết chỉ nhận: CONSIGNMENT, PURCHASE_REQUEST, QUOTATION."
    );
  }
};

const validateConversationPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu tạo cuộc trò chuyện không hợp lệ.");
  }

  validateRelatedType(payload.relatedType);

  if (!normalizeText(payload.message)) {
    throw new Error("Vui lòng nhập nội dung tin nhắn.");
  }

  if (normalizeText(payload.relatedType) && !normalizeText(payload.relatedId)) {
    throw new Error("Vui lòng cung cấp mã liên kết.");
  }
};

const buildConversationPayload = (payload) => {
  return {
    relatedType: normalizeNullableText(payload.relatedType),
    relatedId: normalizeNullableText(payload.relatedId),
    message: normalizeText(payload.message),
    attachmentUrl: normalizeNullableText(payload.attachmentUrl),
  };
};

const validateSendMessagePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu gửi tin nhắn không hợp lệ.");
  }

  if (!normalizeText(payload.content) && !normalizeText(payload.attachmentUrl)) {
    throw new Error("Vui lòng nhập nội dung hoặc đính kèm tệp.");
  }
};

const buildSendMessagePayload = (payload) => {
  return {
    content: normalizeText(payload.content),
    attachmentUrl: normalizeNullableText(payload.attachmentUrl),
  };
};

/**
 * Tạo cuộc trò chuyện.
 *
 * POST /api/conversations
 */
export const createConversationApi = async (payload, options = {}) => {
  validateConversationPayload(payload);

  const requestPayload = buildConversationPayload(payload);

  try {
    const response = await axiosInstance.post(
      "/api/conversations",
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
        "Lỗi tạo cuộc trò chuyện:",
        getApiErrorMessage(error, "Tạo cuộc trò chuyện thất bại.")
      );
    }

    throw error;
  }
};

/**
 * Lấy danh sách cuộc trò chuyện.
 *
 * GET /api/conversations
 */
export const getConversationsApi = async (options = {}) => {
  try {
    const response = await axiosInstance.get("/api/conversations", {
      signal: getSignal(options),
      headers: {
        Accept: "*/*",
      },
    });

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách cuộc trò chuyện:",
        getApiErrorMessage(error, "Lấy danh sách cuộc trò chuyện thất bại.")
      );
    }

    throw error;
  }
};

/**
 * Lấy chi tiết cuộc trò chuyện kèm tin nhắn.
 *
 * GET /api/conversations/{conversationId}
 */
export const getConversationDetailApi = async (
  conversationId,
  options = {}
) => {
  const id = normalizeText(conversationId);

  if (!id) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }

  try {
    const response = await axiosInstance.get(`/api/conversations/${id}`, {
      signal: getSignal(options),
      headers: {
        Accept: "*/*",
      },
    });

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết cuộc trò chuyện:",
        getApiErrorMessage(error, "Lấy chi tiết cuộc trò chuyện thất bại.")
      );
    }

    throw error;
  }
};

/**
 * Gửi tin nhắn vào cuộc trò chuyện.
 *
 * POST /api/conversations/{conversationId}/messages
 */
export const sendConversationMessageApi = async (
  conversationId,
  payload,
  options = {}
) => {
  const id = normalizeText(conversationId);

  if (!id) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }

  validateSendMessagePayload(payload);

  const requestPayload = buildSendMessagePayload(payload);

  try {
    const response = await axiosInstance.post(
      `/api/conversations/${id}/messages`,
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
        "Lỗi gửi tin nhắn:",
        getApiErrorMessage(error, "Gửi tin nhắn thất bại.")
      );
    }

    throw error;
  }
};

/**
 * Đánh dấu tin nhắn là đã đọc.
 *
 * PUT /api/conversations/{conversationId}/read
 */
export const markConversationAsReadApi = async (
  conversationId,
  options = {}
) => {
  const id = normalizeText(conversationId);

  if (!id) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }

  try {
    const response = await axiosInstance.put(
      `/api/conversations/${id}/read`,
      null,
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
        "Lỗi đánh dấu tin nhắn đã đọc:",
        getApiErrorMessage(error, "Đánh dấu tin nhắn đã đọc thất bại.")
      );
    }

    throw error;
  }
};

const conversationApi = {
  createConversationApi,
  getConversationsApi,
  getConversationDetailApi,
  sendConversationMessageApi,
  markConversationAsReadApi,
};

export default conversationApi;