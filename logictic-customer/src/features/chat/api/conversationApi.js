/* =========================================================
   conversationApi.js — CHAT CSKH của khách. ĐÃ NỐI API THẬT.

   Trước đây file này là mock đọc "@/mocks/data/conversations"; bản mock giữ nguyên ở
   conversationApi.mock.js (không màn nào import).

   Endpoint thật (VCL_API ConversationController, [Authorize]):
     POST /api/conversations                          tạo hội thoại (role Customer)
          body { relatedType?, relatedId?, message (1..2000), attachmentUrl? (≤ 500) }
          → 201 ConversationDto
     GET  /api/conversations                          → ConversationDto[] (KHÔNG kèm messages)
     GET  /api/conversations/{id}                     → ConversationDto kèm messages[]
     POST /api/conversations/{id}/messages            body { content (1..2000), attachmentUrl? }
          → MessageDto
     PUT  /api/conversations/{id}/read                → { message }

   ConversationDto: { id, customerId, customerName, customerCode, salesId, salesName,
     relatedType, relatedId, relatedCode, status ("OPEN" | "CLOSED"), createdAt, updatedAt,
     unreadCount, messages[] }.
   MessageDto: { id, conversationId, senderId, senderRole ("Customer" | "Sale"), content,
     attachmentUrl, isRead, createdAt }.

   GIỮ NGUYÊN BỀ MẶT của bản mock (5 hàm, cùng tham số, trả phần thân đã bóc — không phải
   response axios; danh sách là MẢNG TRẦN, chi tiết là object có `messages`, không có khoá
   `data`/`conversation` ở cấp ngoài) để CustomerServiceChat.jsx không phải sửa.

   Chuẩn hoá thêm cho màn chat (backend không có các field này):
   - title / staffName / lastMessage / lastMessageAt cho danh sách bên trái;
   - senderName của tin Sale = salesName;
   - backend bắt buộc content ≥ 1 ký tự kể cả tin chỉ có ảnh: gửi câu
     "Đã gửi một hình ảnh" (cùng quy ước với app nhân viên), khi đọc về thì ẩn câu đó
     nếu tin có ảnh để bong bóng chỉ hiện ảnh như trước.
   - 400 ModelState (ValidationProblemDetails) → gắn data.message = câu lỗi đầu tiên.
   ========================================================= */

import httpClient, { hasAccessToken, isCanceledRequest } from "@shared/api/httpClient";

const VALID_RELATED_TYPES = ["CONSIGNMENT", "PURCHASE_REQUEST", "QUOTATION"];

const MAX_CONTENT_LENGTH = 2000;
const MAX_ATTACHMENT_URL_LENGTH = 500;

/* Nội dung thay thế cho tin chỉ có ảnh — trùng câu app nhân viên đang gửi. */
const IMAGE_ONLY_MESSAGE_CONTENT = "Đã gửi một hình ảnh";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getSignal = (options = {}) => {
  if (options && typeof options.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const normalizeText = (value) => String(value ?? "").trim();

const normalizeNullableText = (value) => {
  const text = normalizeText(value);
  return text || null;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

/** Lỗi dựng tại chỗ mang cùng hình dạng lỗi axios để màn đọc error.response.data.message. */
const createApiError = (status, message) => {
  const error = new Error(message);

  error.response = { status, data: { message } };

  return error;
};

const requireConversationId = (conversationId) => {
  const id = normalizeText(conversationId);

  if (!id) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }

  /* Backend route {conversationId} là Guid: chuỗi khác sẽ bị 400 ModelState khó hiểu. */
  if (!UUID_PATTERN.test(id)) {
    throw createApiError(404, "Không tìm thấy cuộc trò chuyện.");
  }

  return id;
};

/**
 * 400 ModelState của ASP.NET trả { title, errors: { Field: [msg] } } (hoặc dictionary trần):
 * không có `message` nên màn chỉ hiện "One or more validation errors occurred.".
 * Gắn câu lỗi đầu tiên vào data.message, giữ nguyên phần còn lại.
 */
const attachValidationMessage = (error) => {
  const data = error?.response?.data;

  if (!data || typeof data !== "object" || typeof data.message === "string") {
    return error;
  }

  const errorSource =
    data.errors && typeof data.errors === "object" ? data.errors : data;

  const firstMessage = Object.values(errorSource)
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .find((value) => typeof value === "string" && value.trim());

  if (firstMessage) {
    data.message = firstMessage;
  }

  return error;
};

const logApiError = (label, error) => {
  if (isCanceledRequest(error)) {
    return;
  }

  console.error(label, error?.response?.data ?? error?.message ?? error);
};

/* =========================================================
   VALIDATE + PAYLOAD (khớp DataAnnotations của DTO backend)
   ========================================================= */

const validateContentLength = (text) => {
  if (text.length > MAX_CONTENT_LENGTH) {
    throw new Error(
      `Nội dung tin nhắn không được vượt quá ${MAX_CONTENT_LENGTH} ký tự.`
    );
  }
};

const validateAttachmentUrl = (attachmentUrl) => {
  if (attachmentUrl && attachmentUrl.length > MAX_ATTACHMENT_URL_LENGTH) {
    throw new Error("Đường dẫn ảnh đính kèm quá dài (tối đa 500 ký tự).");
  }
};

const validateConversationPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu tạo cuộc trò chuyện không hợp lệ.");
  }

  const relatedType = normalizeText(payload.relatedType).toUpperCase();

  if (relatedType && !VALID_RELATED_TYPES.includes(relatedType)) {
    throw new Error(
      "Loại liên kết chỉ nhận: CONSIGNMENT, PURCHASE_REQUEST, QUOTATION."
    );
  }

  const message = normalizeText(payload.message);

  if (!message) {
    throw new Error("Vui lòng nhập nội dung tin nhắn.");
  }

  validateContentLength(message);
  validateAttachmentUrl(normalizeText(payload.attachmentUrl));

  const relatedId = normalizeText(payload.relatedId);

  if (relatedType && !relatedId) {
    throw new Error("Vui lòng cung cấp mã liên kết.");
  }

  if (relatedId && !UUID_PATTERN.test(relatedId)) {
    throw new Error("Mã liên kết không hợp lệ, vui lòng chọn lại từ danh sách.");
  }
};

const buildConversationPayload = (payload) => {
  const relatedType = normalizeText(payload.relatedType).toUpperCase() || null;

  return {
    relatedType,
    relatedId: relatedType ? normalizeNullableText(payload.relatedId) : null,
    message: normalizeText(payload.message),
    attachmentUrl: normalizeNullableText(payload.attachmentUrl),
  };
};

const validateSendMessagePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu gửi tin nhắn không hợp lệ.");
  }

  const content = normalizeText(payload.content);
  const attachmentUrl = normalizeText(payload.attachmentUrl);

  if (!content && !attachmentUrl) {
    throw new Error("Vui lòng nhập nội dung hoặc đính kèm tệp.");
  }

  validateContentLength(content);
  validateAttachmentUrl(attachmentUrl);
};

const buildSendMessagePayload = (payload) => {
  const attachmentUrl = normalizeNullableText(payload.attachmentUrl);

  return {
    content:
      normalizeText(payload.content) ||
      (attachmentUrl ? IMAGE_ONLY_MESSAGE_CONTENT : ""),
    attachmentUrl,
  };
};

/* =========================================================
   CHUẨN HOÁ RESPONSE CHO MÀN CHAT
   ========================================================= */

const RELATED_TYPE_TITLES = {
  CONSIGNMENT: "Yêu cầu ký gửi",
  PURCHASE_REQUEST: "Yêu cầu mua hộ",
  QUOTATION: "Báo giá",
};

const buildConversationTitle = (conversation) => {
  const relatedType = normalizeText(conversation?.relatedType).toUpperCase();
  const typeTitle = RELATED_TYPE_TITLES[relatedType];
  const relatedCode = normalizeText(conversation?.relatedCode);

  if (typeTitle) {
    return relatedCode ? `${typeTitle} ${relatedCode}` : typeTitle;
  }

  return "Yêu cầu hỗ trợ chung";
};

/** Danh sách không kèm tin nhắn nên tóm tắt theo tình trạng thay cho "tin cuối". */
const buildListSummary = (conversation) => {
  const unreadCount = Number(conversation?.unreadCount) || 0;

  if (unreadCount > 0) {
    return `${unreadCount} tin nhắn mới từ CSKH`;
  }

  if (normalizeText(conversation?.status).toUpperCase() === "CLOSED") {
    return "Cuộc trò chuyện đã đóng";
  }

  return normalizeText(conversation?.salesName)
    ? "Nhân viên tư vấn đang hỗ trợ"
    : "Đang chờ CSKH tiếp nhận";
};

const isSaleMessage = (message) =>
  normalizeText(message?.senderRole).toUpperCase() !== "CUSTOMER";

const normalizeMessage = (message, conversation) => {
  if (!message || typeof message !== "object") {
    return message;
  }

  const attachmentUrl = normalizeNullableText(message.attachmentUrl);
  const content = normalizeText(message.content);
  const salesName = normalizeText(conversation?.salesName);

  return {
    ...message,
    messageId: message.messageId ?? message.id,
    attachmentUrl,
    /* Câu thay thế của tin chỉ có ảnh: ẩn đi để bong bóng chỉ hiện ảnh. */
    content:
      attachmentUrl && content === IMAGE_ONLY_MESSAGE_CONTENT ? "" : message.content,
    ...(isSaleMessage(message) && salesName && !message.senderName
      ? { senderName: salesName }
      : {}),
  };
};

const summarizeMessage = (message) =>
  normalizeText(message?.content) ||
  (message?.attachmentUrl ? IMAGE_ONLY_MESSAGE_CONTENT : "");

const normalizeConversation = (conversation) => {
  if (!conversation || typeof conversation !== "object") {
    return conversation;
  }

  const messages = toArray(conversation.messages).map((message) =>
    normalizeMessage(message, conversation)
  );
  const lastMessage = messages[messages.length - 1] || null;
  const lastMessageAt =
    lastMessage?.createdAt || conversation.updatedAt || conversation.createdAt;
  const summary = lastMessage
    ? summarizeMessage(lastMessage)
    : buildListSummary(conversation);
  const staffName = normalizeNullableText(conversation.salesName);

  return {
    ...conversation,
    conversationId: conversation.conversationId ?? conversation.id,
    title: conversation.title || buildConversationTitle(conversation),
    staffId: conversation.salesId ?? null,
    staffName,
    staffRole: staffName ? "Nhân viên tư vấn" : null,
    lastMessage: summary,
    latestMessage: summary,
    lastMessageAt,
    latestMessageAt: lastMessageAt,
    unreadCount: Number(conversation.unreadCount) || 0,
    messages,
  };
};

/** Danh sách không có messages ở backend — bỏ luôn khoá để khỏi hiểu nhầm là rỗng. */
const toListItem = (conversation) => {
  const item = normalizeConversation(conversation);

  if (item && typeof item === "object") {
    delete item.messages;
  }

  return item;
};

/* =========================================================
   API
   ========================================================= */

/**
 * Tạo cuộc trò chuyện.
 *
 * POST /api/conversations
 */
export const createConversationApi = async (payload, options = {}) => {
  validateConversationPayload(payload);

  try {
    const response = await httpClient.post(
      "/api/conversations",
      buildConversationPayload(payload),
      { signal: getSignal(options) }
    );

    /* Nơi gọi đọc data?.id để mở hội thoại vừa tạo. */
    return normalizeConversation(response.data);
  } catch (error) {
    logApiError("Lỗi tạo cuộc trò chuyện:", error);

    throw attachValidationMessage(error);
  }
};

/**
 * Lấy danh sách cuộc trò chuyện của khách đang đăng nhập (mới cập nhật trước).
 *
 * GET /api/conversations
 */
export const getConversationsApi = async (options = {}) => {
  /* Chưa đăng nhập thì không gọi: 401 body rỗng bị httpClient coi là hết phiên. */
  if (!hasAccessToken()) {
    return [];
  }

  try {
    const response = await httpClient.get("/api/conversations", {
      signal: getSignal(options),
    });

    const body = response.data;
    const list = Array.isArray(body) ? body : toArray(body?.data ?? body?.items);

    return list.map(toListItem);
  } catch (error) {
    logApiError("Lỗi lấy danh sách cuộc trò chuyện:", error);

    throw attachValidationMessage(error);
  }
};

/**
 * Lấy chi tiết cuộc trò chuyện kèm tin nhắn.
 *
 * GET /api/conversations/{conversationId}
 */
export const getConversationDetailApi = async (conversationId, options = {}) => {
  const id = requireConversationId(conversationId);

  try {
    const response = await httpClient.get(
      `/api/conversations/${encodeURIComponent(id)}`,
      { signal: getSignal(options) }
    );

    return normalizeConversation(response.data);
  } catch (error) {
    logApiError("Lỗi lấy chi tiết cuộc trò chuyện:", error);

    throw attachValidationMessage(error);
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
  const id = requireConversationId(conversationId);

  validateSendMessagePayload(payload);

  try {
    const response = await httpClient.post(
      `/api/conversations/${encodeURIComponent(id)}/messages`,
      buildSendMessagePayload(payload),
      { signal: getSignal(options) }
    );

    return normalizeMessage(response.data, null);
  } catch (error) {
    logApiError("Lỗi gửi tin nhắn:", error);

    throw attachValidationMessage(error);
  }
};

/**
 * Đánh dấu đã đọc tin nhắn của CSKH trong cuộc trò chuyện.
 *
 * PUT /api/conversations/{conversationId}/read
 */
export const markConversationAsReadApi = async (conversationId, options = {}) => {
  const id = requireConversationId(conversationId);

  try {
    const response = await httpClient.put(
      `/api/conversations/${encodeURIComponent(id)}/read`,
      undefined,
      { signal: getSignal(options) }
    );

    return {
      success: true,
      conversationId: id,
      unreadCount: 0,
      message: response.data?.message || "Đã đánh dấu đọc tin nhắn.",
    };
  } catch (error) {
    logApiError("Lỗi đánh dấu tin nhắn đã đọc:", error);

    throw attachValidationMessage(error);
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
