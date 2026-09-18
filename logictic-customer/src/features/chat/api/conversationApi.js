/*
 * MOCK cho bản build UI-only: tầng HTTP thật đã bị gỡ, file này trả dữ liệu
 * mẫu từ "@/mocks/data/conversations" thay vì gọi server. Component màn
 * CustomerServiceChat KHÔNG được sửa, nên mọi tên export, thứ tự tham số và
 * hình dạng dữ liệu trả về ở đây phải y hệt bản gọi API thật:
 * cả 5 hàm đều trả phần thân response (tương đương `response.data` cũ),
 * không phải object axios.
 *
 * CẮM LẠI API THẬT: import lại axiosInstance từ "@shared/api/httpClient",
 * thay thân mỗi hàm bằng đúng lời gọi ghi ở JSDoc phía trên nó
 * (POST /api/conversations, GET /api/conversations,
 *  GET /api/conversations/{id}, POST /api/conversations/{id}/messages,
 *  PUT /api/conversations/{id}/read) rồi `return response.data`.
 * Phần validate payload bên dưới giữ nguyên được vì nó thuần logic.
 */

import { deepClone, delay, newUuid, nowIso } from "@/mocks/mockUtils";

import {
  CHAT_CUSTOMER,
  CHAT_STAFF,
  conversations,
  createChatMessage,
  findConversationById,
  resolveRelatedCodeById,
} from "@/mocks/data/conversations";

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

/* =========================================================
   KHO DỮ LIỆU TRONG BỘ NHỚ
   ========================================================= */

/*
 * Fixture là mảng dùng chung của cả phiên làm việc: mọi thao tác ghi
 * (tạo hội thoại, gửi tin, đánh dấu đã đọc) sửa thẳng vào đây để lần
 * fetch kế tiếp — kể cả nhịp poll 2,5s của màn chat — nhìn thấy ngay.
 * Dữ liệu không sống qua F5, đúng như mô tả của bản UI-only.
 */
const store = conversations;

/**
 * Lỗi "không tìm thấy" mang cùng hình dạng lỗi axios 404.
 *
 * helpers.getApiErrorText() đọc error.response.data.message trước tiên,
 * thiếu nhánh này màn hình chỉ hiện được message kỹ thuật của Error.
 */
const createNotFoundError = (message) => {
  const error = new Error(message);

  error.response = {
    status: 404,
    data: {
      message,
    },
  };

  return error;
};

const requireConversation = (conversationId) => {
  const conversation = findConversationById(conversationId);

  if (!conversation) {
    throw createNotFoundError("Không tìm thấy cuộc trò chuyện.");
  }

  return conversation;
};

/*
 * Tiêu đề hội thoại mới lấy từ chính câu hỏi đầu tiên, cắt gọn cho vừa
 * một dòng ở danh sách bên trái (getConversationTitle đọc field title).
 */
const buildConversationTitle = (message) => {
  const text = normalizeText(message).replace(/\s+/g, " ");

  if (!text) {
    return "Yêu cầu hỗ trợ mới";
  }

  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
};

/** Tóm tắt nội dung tin cuối cho danh sách bên trái. */
const summarizeMessage = (message) => {
  return (
    normalizeText(message?.content) ||
    (message?.attachmentUrl ? "Đã gửi một hình ảnh" : "")
  );
};

/** Đồng bộ lại các field tóm tắt sau mỗi lần ghi. */
const refreshConversationSummary = (conversation) => {
  const messages = conversation.messages || [];
  const lastMessage = messages[messages.length - 1] || null;
  const lastMessageAt = lastMessage
    ? lastMessage.createdAt
    : conversation.createdAt;
  const summary = summarizeMessage(lastMessage);

  conversation.lastMessage = summary;
  conversation.latestMessage = summary;
  conversation.messageCount = messages.length;
  conversation.lastMessageAt = lastMessageAt;
  conversation.latestMessageAt = lastMessageAt;
  conversation.updatedAt = lastMessageAt;

  return conversation;
};

/*
 * Danh sách hội thoại của API thật không kèm mảng messages —
 * chỉ màn chi tiết mới trả. Bỏ đúng field đó để mock không "rộng rãi"
 * hơn backend, tránh việc UI vô tình dựa vào dữ liệu không có thật.
 */
const toListItem = (conversation) => {
  const item = deepClone(conversation);

  delete item.messages;

  return item;
};

/** Mới nhất lên đầu, đúng thứ tự người dùng mong đợi ở khung chat. */
const sortByRecency = (list) => {
  return [...list].sort((left, right) => {
    const leftTime = new Date(
      left.lastMessageAt || left.createdAt || 0
    ).getTime();
    const rightTime = new Date(
      right.lastMessageAt || right.createdAt || 0
    ).getTime();

    return rightTime - leftTime;
  });
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
    await delay(320, getSignal(options));

    const createdAt = nowIso();
    const conversationId = newUuid();

    /* Hội thoại mới luôn được gán cho một nhân viên tư vấn để header
       hiện chip "Nhân viên: ..." thay vì chỉ "Đang hỗ trợ trực tuyến". */
    const staff = CHAT_STAFF.khoi;

    const firstMessage = createChatMessage({
      seed: `runtime-${conversationId}`,
      conversationId,
      sender: CHAT_CUSTOMER,
      content: requestPayload.message,
      attachmentUrl: requestPayload.attachmentUrl,
      createdAt,
    });

    /* Ghi đè id sinh từ seed bằng GUID runtime cho giống backend. */
    firstMessage.id = newUuid();
    firstMessage.messageId = firstMessage.id;

    const conversation = {
      id: conversationId,
      conversationId,

      title: buildConversationTitle(requestPayload.message),
      status: "PENDING",

      relatedType: requestPayload.relatedType,
      relatedId: requestPayload.relatedId,
      relatedCode: resolveRelatedCodeById(
        requestPayload.relatedType,
        requestPayload.relatedId
      ),

      customerId: CHAT_CUSTOMER.senderId,
      customerName: CHAT_CUSTOMER.senderName,
      customerPhone: CHAT_CUSTOMER.phone,
      customerEmail: CHAT_CUSTOMER.email,

      staffId: staff.senderId,
      staffName: staff.senderName,
      staffRole: "Nhân viên tư vấn",

      lastMessage: summarizeMessage(firstMessage),
      latestMessage: summarizeMessage(firstMessage),

      unreadCount: 0,
      unreadMessages: 0,
      unread: 0,

      messageCount: 1,

      createdAt,
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      latestMessageAt: createdAt,
      lastReadAt: createdAt,

      messages: [firstMessage],
    };

    store.unshift(conversation);

    /* Trả nguyên bản ghi vừa tạo: nơi gọi đọc data?.id để mở hội thoại. */
    return deepClone(conversation);
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
    await delay(260, getSignal(options));

    /* Backend trả thẳng một mảng; helpers.normalizeConversationList()
       nhận đúng dạng này ở nhánh Array.isArray đầu tiên. */
    return sortByRecency(store).map(toListItem);
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
    /* Màn chat abort request cũ mỗi lần đổi hội thoại, nên delay phải
       nhận signal — nếu không toast lỗi đỏ sẽ nháy mỗi lần bấm chuyển. */
    await delay(240, getSignal(options));

    const conversation = requireConversation(id);

    return deepClone(conversation);
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
    await delay(300, getSignal(options));

    const conversation = requireConversation(id);
    const createdAt = nowIso();

    const message = createChatMessage({
      seed: `runtime-${id}-${conversation.messages.length + 1}`,
      conversationId: conversation.id,
      sender: CHAT_CUSTOMER,
      content: requestPayload.content,
      attachmentUrl: requestPayload.attachmentUrl,
      createdAt,
    });

    message.id = newUuid();
    message.messageId = message.id;

    conversation.messages.push(message);

    refreshConversationSummary(conversation);

    /* Khách vừa gửi thì coi như đã đọc hết phần trước đó. */
    conversation.unreadCount = 0;
    conversation.unreadMessages = 0;
    conversation.unread = 0;
    conversation.lastReadAt = createdAt;

    return deepClone(message);
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
    await delay(180, getSignal(options));

    const conversation = requireConversation(id);
    const readAt = nowIso();

    (conversation.messages || []).forEach((message) => {
      message.isRead = true;
      message.readAt = message.readAt || readAt;
    });

    conversation.unreadCount = 0;
    conversation.unreadMessages = 0;
    conversation.unread = 0;
    conversation.lastReadAt = readAt;

    return {
      success: true,
      conversationId: conversation.id,
      unreadCount: 0,
      readAt,
      message: "Đã đánh dấu cuộc trò chuyện là đã đọc.",
    };
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
