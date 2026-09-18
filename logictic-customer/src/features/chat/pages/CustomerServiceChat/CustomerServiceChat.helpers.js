/*
 * Các hàm thuần dùng chung cho màn hình CSKH: chuẩn hoá dữ liệu API,
 * đọc thông tin người gửi và định dạng thời gian. Giữ ở đây để component
 * chỉ tập trung vào state và JSX, đồng thời dễ soi lại khi API đổi cấu trúc.
 */

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";

import {
  apiToUtcIso,
  getBrowserTimeInfo,
  getSyncedNowUtcIso,
} from "@shared/utils/timeUtc";

import {
  ACCEPTED_CHAT_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  RELATED_TYPE_LABELS,
  STATUS_LABELS,
} from "./CustomerServiceChat.constants";

export const normalizeDisplayCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
};

export const getRelatedTypeLabel = (value) => {
  const normalized = normalizeDisplayCode(value);
  const compact = normalized.replaceAll("_", "");

  return (
    RELATED_TYPE_LABELS[normalized] ||
    RELATED_TYPE_LABELS[compact] ||
    "Hỗ trợ chung"
  );
};

export const getStatusDisplayName = (value) => {
  const normalized = normalizeDisplayCode(value);

  if (!normalized) {
    return "";
  }

  return (
    STATUS_LABELS[normalized] ||
    normalized
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (character) => character.toUpperCase())
  );
};

export const createAttachmentItem = (file) => ({
  id:
    String(file?.uid || "").trim() ||
    `${file?.name || "image"}-${file?.size || 0}-${file?.lastModified || Date.now()}`,
  file,
  previewUrl: URL.createObjectURL(file),
  name: file?.name || "Ảnh đính kèm",
});

export const getAccessToken = () => {
  return (
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

export const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(normalizedPayload)
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getCurrentUserId = () => {
  const token = getAccessToken();
  const payload = decodeJwtPayload(token);

  return (
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] ||
    payload?.nameid ||
    payload?.sub ||
    payload?.userId ||
    ""
  );
};

export const unwrapApiData = (response) => {
  return response?.data ?? response;
};

export const normalizeConversationList = (response) => {
  const data = unwrapApiData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

export const normalizeConversationDetail = (response) => {
  const data = unwrapApiData(response);

  return data?.conversation || data;
};

export const normalizeMessages = (detail) => {
  if (Array.isArray(detail?.messages)) return detail.messages;
  if (Array.isArray(detail?.conversationMessages)) {
    return detail.conversationMessages;
  }
  if (Array.isArray(detail?.data?.messages)) return detail.data.messages;

  return [];
};

export const normalizeRelatedList = (response) => {
  const data = unwrapApiData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.purchaseRequests)) return data.purchaseRequests;
  if (Array.isArray(data?.consignments)) return data.consignments;

  return [];
};

export const getConversationId = (conversation) => {
  return (
    conversation?.id ||
    conversation?.conversationId ||
    conversation?.conversationID ||
    ""
  );
};

export const getMessageId = (message, index) => {
  return (
    message?.id ||
    message?.messageId ||
    message?.createdAt ||
    `${index}-${message?.content || message?.message || ""}`
  );
};

export const getMessageContent = (message) => {
  return message?.content || message?.message || message?.text || "";
};

export const isLikelyAttachmentUrl = (value) => {
  const text = String(value || "").trim();

  return (
    /^(https?:\/\/|blob:|data:image\/)/i.test(text) ||
    /^\/[^/\s]/.test(text) ||
    /(?:^|\/)(?:uploads?|images?|files?)\//i.test(text) ||
    /\.(?:png|jpe?g|webp|gif|bmp|svg|heic|heif|avif)(?:[?#].*)?$/i.test(text)
  );
};

export const collectAttachmentUrls = (value, output = [], depth = 0) => {
  if (value === null || value === undefined || depth > 7) {
    return output;
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return output;
    }

    if (
      (text.startsWith("[") && text.endsWith("]")) ||
      (text.startsWith("{") && text.endsWith("}"))
    ) {
      try {
        collectAttachmentUrls(JSON.parse(text), output, depth + 1);
        return output;
      } catch {
        // Chuỗi không phải JSON, tiếp tục kiểm tra như URL thông thường.
      }
    }

    if (isLikelyAttachmentUrl(text) && !output.includes(text)) {
      output.push(text);
    }

    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAttachmentUrls(item, output, depth + 1));
    return output;
  }

  if (typeof value === "object") {
    [
      "url",
      "imageUrl",
      "imageURL",
      "fileUrl",
      "fileURL",
      "attachmentUrl",
      "attachmentURL",
      "secureUrl",
      "secureURL",
      "secure_url",
      "path",
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        collectAttachmentUrls(value[key], output, depth + 1);
      }
    });

    [
      "urls",
      "imageUrls",
      "imageURLs",
      "fileUrls",
      "fileURLs",
      "attachmentUrls",
      "attachmentURLs",
      "attachments",
      "files",
      "images",
      "items",
      "results",
      "data",
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        collectAttachmentUrls(value[key], output, depth + 1);
      }
    });
  }

  return output;
};

export const getMessageAttachments = (message) => {
  return collectAttachmentUrls([
    message?.attachmentUrls,
    message?.attachmentURLs,
    message?.attachments,
    message?.images,
    message?.files,
    message?.attachmentUrl,
    message?.attachmentURL,
  ]);
};

export const getMessageAttachment = (message) => {
  return getMessageAttachments(message)[0] || "";
};

export const normalizeRoleKey = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
};

export const getRoleDisplayName = (role) => {
  const roleKey = normalizeRoleKey(role);

  if (!roleKey) return "";

  if (
    roleKey === "SALES" ||
    roleKey === "SALE" ||
    roleKey === "SALESSTAFF" ||
    roleKey.includes("SALE")
  ) {
    return "Nhân viên tư vấn";
  }

  if (roleKey === "CUSTOMER") return "Khách hàng";
  if (roleKey === "ADMIN" || roleKey === "ADMINISTRATOR") {
    return "Quản trị viên";
  }
  if (roleKey === "MANAGER") return "Quản lý";
  if (roleKey.includes("WAREHOUSE")) return "Nhân viên kho";
  if (roleKey.includes("STAFF")) return "Nhân viên";

  return role;
};

export const getMessageSenderRole = (message) => {
  return (
    message?.senderRole ||
    message?.role ||
    message?.createdByRole ||
    message?.userRole ||
    message?.sender?.role ||
    message?.createdByUser?.role ||
    ""
  );
};

export const getMessageSenderName = (message) => {
  const senderName =
    message?.senderName ||
    message?.senderFullName ||
    message?.createdByName ||
    message?.createdByFullName ||
    message?.userName ||
    message?.fullName ||
    message?.sender?.fullName ||
    message?.sender?.name ||
    message?.createdByUser?.fullName ||
    message?.createdByUser?.name ||
    "";

  if (senderName) {
    return senderName;
  }

  const roleLabel = getRoleDisplayName(getMessageSenderRole(message));

  if (roleLabel) {
    return roleLabel;
  }

  return "CSKH";
};

export const getMessageSenderId = (message) => {
  return (
    message?.senderId ||
    message?.createdBy ||
    message?.userId ||
    message?.sender?.id ||
    ""
  );
};

export const isMessageMine = (message, currentUserId) => {
  const senderRole = normalizeRoleKey(getMessageSenderRole(message));

  /*
   * Đây là màn hình chat phía Customer:
   * - Customer luôn nằm bên phải (is-mine).
   * - Sale/CSKH luôn nằm bên trái (is-other).
   *
   * Ưu tiên role trước vì một số API trả isMine/fromMe theo góc nhìn
   * của nhân viên Sale, khiến giao diện phía Customer bị đảo hai bên.
   */
  if (senderRole === "CUSTOMER" || senderRole === "CUSTOMERUSER") {
    return true;
  }

  if (
    senderRole === "SALE" ||
    senderRole === "SALES" ||
    senderRole === "SALESSTAFF" ||
    senderRole.includes("SALE") ||
    senderRole.includes("STAFF") ||
    senderRole === "ADMIN" ||
    senderRole === "ADMINISTRATOR" ||
    senderRole === "MANAGER" ||
    senderRole.includes("WAREHOUSE")
  ) {
    return false;
  }

  const senderId = String(getMessageSenderId(message) || "").trim();
  const normalizedCurrentUserId = String(currentUserId || "").trim();

  if (senderId && normalizedCurrentUserId) {
    return senderId === normalizedCurrentUserId;
  }

  if (typeof message?.isMine === "boolean") {
    return message.isMine;
  }

  if (typeof message?.fromMe === "boolean") {
    return message.fromMe;
  }

  return false;
};

export const getConversationTitle = (conversation) => {
  const explicitTitle =
    conversation?.title ||
    conversation?.customerName ||
    conversation?.customer?.fullName ||
    conversation?.customerFullName ||
    conversation?.createdByName ||
    "";

  if (explicitTitle) {
    return String(explicitTitle);
  }

  if (conversation?.relatedType) {
    return getRelatedTypeLabel(conversation.relatedType);
  }

  return "Cuộc trò chuyện hỗ trợ";
};

export const getStaffName = (conversation) => {
  return (
    conversation?.staffName ||
    conversation?.employeeName ||
    conversation?.salesStaffName ||
    conversation?.saleStaffName ||
    conversation?.supportStaffName ||
    conversation?.assignedStaffName ||
    conversation?.staff?.fullName ||
    conversation?.employee?.fullName ||
    conversation?.salesStaff?.fullName ||
    conversation?.supportStaff?.fullName ||
    conversation?.assignedStaff?.fullName ||
    conversation?.staff?.name ||
    conversation?.employee?.name ||
    conversation?.salesStaff?.name ||
    conversation?.supportStaff?.name ||
    ""
  );
};

export const getStaffDisplayName = (conversation) => {
  return getStaffName(conversation);
};

export const hasAssignedStaff = (conversation) => {
  return Boolean(getStaffName(conversation));
};

export const getConversationRelatedCode = (conversation) => {
  return (
    conversation?.relatedCode ||
    conversation?.orderCode ||
    conversation?.requestCode ||
    conversation?.consignmentCode ||
    conversation?.purchaseRequestCode ||
    conversation?.relatedId ||
    ""
  );
};

export const getConversationSubtitle = (conversation) => {
  const relatedType = conversation?.relatedType;
  const relatedCode = getConversationRelatedCode(conversation);

  if (relatedType) {
    const typeLabel = getRelatedTypeLabel(relatedType);

    if (relatedCode) {
      const displayCode = String(relatedCode);
      const shortCode =
        displayCode.length > 12
          ? `${displayCode.slice(0, 10)}…`
          : displayCode;

      return `${typeLabel} · ${shortCode}`;
    }

    return typeLabel;
  }

  return "Yêu cầu hỗ trợ chung";
};

export const getConversationLastMessage = (conversation) => {
  return (
    conversation?.lastMessage ||
    conversation?.latestMessage ||
    conversation?.message ||
    "Chưa có tin nhắn mới"
  );
};

export const getUnreadCount = (conversation) => {
  return Number(
    conversation?.unreadCount ||
      conversation?.unreadMessages ||
      conversation?.unread ||
      0
  );
};

export const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

export const getClientTimePayload = () => {
  const timeInfo = getBrowserTimeInfo();
  const nowUtc = getSyncedNowUtcIso();

  return {
    sentAtUtc: nowUtc,
    createdAtUtc: nowUtc,
    clientSentAtUtc: nowUtc,
    clientCreatedAtUtc: nowUtc,
    clientTimeZone: timeInfo.timeZone,
    clientUtcOffset: timeInfo.utcOffset,
    clientUtcOffsetMinutes: timeInfo.utcOffsetMinutes,
  };
};

export const normalizeMessageTime = (message) => {
  if (!message) {
    return message;
  }

  return {
    ...message,
    createdAtUtc: normalizeApiTimeToUtc(message.createdAt),
    sentAtUtc: normalizeApiTimeToUtc(message.sentAt),
    updatedAtUtc: normalizeApiTimeToUtc(message.updatedAt),
    readAtUtc: normalizeApiTimeToUtc(message.readAt),
  };
};

export const normalizeConversationTime = (conversation) => {
  if (!conversation) {
    return conversation;
  }

  return {
    ...conversation,
    createdAtUtc: normalizeApiTimeToUtc(conversation.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(conversation.updatedAt),
    lastMessageAtUtc: normalizeApiTimeToUtc(conversation.lastMessageAt),
    latestMessageAtUtc: normalizeApiTimeToUtc(conversation.latestMessageAt),
    lastReadAtUtc: normalizeApiTimeToUtc(conversation.lastReadAt),
  };
};

export const normalizeConversationDetailTime = (detail) => {
  if (!detail) {
    return detail;
  }

  const messages = normalizeMessages(detail).map(normalizeMessageTime);

  return {
    ...normalizeConversationTime(detail),
    messages,
    conversationMessages: messages,
  };
};

export const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) return "";

  const date = new Date(utcIso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${getPart("hour")}:${getPart("minute")} · ${getPart(
    "day"
  )}/${getPart("month")}`;
};

export const getCreatedTime = (item) => {
  return (
    item?.createdAtUtc ||
    item?.sentAtUtc ||
    item?.updatedAtUtc ||
    item?.lastMessageAtUtc ||
    item?.latestMessageAtUtc ||
    item?.createdAt ||
    item?.sentAt ||
    item?.updatedAt ||
    item?.lastMessageAt ||
    item?.latestMessageAt ||
    ""
  );
};

export const getRelatedItemId = (item, relatedType) => {
  if (!item) return "";

  if (relatedType === "PURCHASE_REQUEST") {
    return (
      item.purchaseRequestId ||
      item.purchaseRequestID ||
      item.requestId ||
      item.requestID ||
      item.orderId ||
      item.orderID ||
      item.id ||
      ""
    );
  }

  if (relatedType === "CONSIGNMENT") {
    return (
      item.consignmentId ||
      item.consignmentID ||
      item.orderId ||
      item.orderID ||
      item.requestId ||
      item.requestID ||
      item.id ||
      ""
    );
  }

  return item.id || "";
};

export const getRelatedItemCode = (item, relatedType) => {
  if (!item) return "";

  if (relatedType === "PURCHASE_REQUEST") {
    return (
      item.purchaseRequestCode ||
      item.requestCode ||
      item.orderCode ||
      item.code ||
      item.trackingCode ||
      ""
    );
  }

  if (relatedType === "CONSIGNMENT") {
    return (
      item.consignmentCode ||
      item.orderCode ||
      item.requestCode ||
      item.code ||
      item.trackingCode ||
      ""
    );
  }

  return item.code || "";
};

export const getRelatedItemName = (item, relatedType) => {
  if (!item) return "";

  if (relatedType === "PURCHASE_REQUEST") {
    return (
      item.productName ||
      item.name ||
      item.title ||
      item.receiverName ||
      ""
    );
  }

  if (relatedType === "CONSIGNMENT") {
    return (
      item.consignmentType ||
      item.name ||
      item.title ||
      item.receiverName ||
      ""
    );
  }

  return item.name || item.title || "";
};

export const getRelatedItemStatus = (item) => {
  return item?.status || item?.orderStatus || "";
};

export const getRelatedItemLabel = (item, relatedType) => {
  const id = getRelatedItemId(item, relatedType);
  const code = getRelatedItemCode(item, relatedType);
  const name = getRelatedItemName(item, relatedType);
  const status = getStatusDisplayName(getRelatedItemStatus(item));
  const typeLabel = getRelatedTypeLabel(relatedType);
  const shortId = id ? String(id).slice(0, 8) : "N/A";

  const parts = [
    typeLabel,
    code || `${shortId}...`,
    name,
    status,
  ].filter(Boolean);

  return parts.join(" - ");
};

export const getApiErrorText = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;

  return error?.message || fallback;
};

export const notifySuccess = (title, description) => {
  if (typeof AuthNotify?.success === "function") {
    AuthNotify.success(title, description);
  }
};

export const notifyError = (title, description) => {
  if (typeof AuthNotify?.error === "function") {
    AuthNotify.error(title, description);
  }
};

export const notifyWarning = (title, description) => {
  if (typeof AuthNotify?.warning === "function") {
    AuthNotify.warning(title, description);
    return;
  }

  if (typeof AuthNotify?.info === "function") {
    AuthNotify.info(title, description);
    return;
  }

  notifyError(title, description);
};

export const getMessageSignature = (message, index) => {
  return [
    getMessageId(message, index),
    getMessageSenderId(message),
    getMessageSenderRole(message),
    getMessageContent(message),
    getMessageAttachments(message).join("|"),
    getCreatedTime(message),
  ]
    .map((value) => String(value || ""))
    .join("::");
};

export const getMessagesSignature = (messageList = []) => {
  return messageList
    .map((message, index) => getMessageSignature(message, index))
    .join("||");
};

export const isImageUrl = (url) => {
  const text = String(url || "").toLowerCase();

  return (
    text.includes("image") ||
    /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?.*)?$/.test(text)
  );
};

export const extractUploadUrls = (response) => {
  return collectAttachmentUrls(unwrapApiData(response));
};

export const validateImageFile = (file) => {
  if (!file) {
    throw new Error("Không tìm thấy ảnh.");
  }

  const mimeType = String(file.type || "")
    .trim()
    .toLowerCase();

  const extensionIsAccepted = /\.(?:jpe?g|png|webp)$/i.test(
    String(file.name || ""),
  );

  if (
    !ACCEPTED_CHAT_IMAGE_TYPES.has(mimeType) &&
    !extensionIsAccepted
  ) {
    throw new Error("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Ảnh không được vượt quá ${MAX_IMAGE_SIZE_MB}MB.`);
  }
};
