import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CheckCircleOutlined,
  CloseOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  InboxOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";

import {
  createConversationApi,
  getConversationDetailApi,
  getConversationsApi,
  markConversationAsReadApi,
  sendConversationMessageApi,
} from "../../../api/Conversation/conversationApi";

import AuthNotify from "../../../utils/AuthNotify";

import { getConsignmentsApi } from "../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../api/OrderApi/purchaseRequestApi";
import { uploadImage } from "../../../api/Upload/UploadImage";

import {
  apiToUtcIso,
  getBrowserTimeInfo,
  getSyncedNowUtcIso,
} from "../../../utils/timeUtc";

import "./CustomerServiceChat.css";

const RELATED_TYPE_OPTIONS = [
  {
    value: "",
    label: "Không liên kết",
  },
  {
    value: "PURCHASE_REQUEST",
    label: "Yêu cầu mua hộ",
  },
  {
    value: "CONSIGNMENT",
    label: "Yêu cầu ký gửi",
  },
];

const RELATED_TYPE_LABELS = {
  PURCHASE_REQUEST: "Yêu cầu mua hộ",
  CONSIGNMENT: "Yêu cầu ký gửi",
};

const RELATED_TYPE_LOADERS = {
  PURCHASE_REQUEST: getPurchaseRequestsApi,
  CONSIGNMENT: getConsignmentsApi,
};

const INITIAL_CREATE_FORM = {
  relatedType: "",
  relatedId: "",
  message: "",
};

const INITIAL_MESSAGE_FORM = {
  content: "",
};

const EMPTY_ATTACHMENT = {
  file: null,
  previewUrl: "",
  name: "",
};

const MAX_IMAGE_SIZE_MB = 6;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const MESSAGE_POLL_INTERVAL_MS = 2500;

const getAccessToken = () => {
  return (
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

const decodeJwtPayload = (token) => {
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

const getCurrentUserId = () => {
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

const unwrapApiData = (response) => {
  return response?.data ?? response;
};

const normalizeConversationList = (response) => {
  const data = unwrapApiData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.conversations)) return data.conversations;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const normalizeConversationDetail = (response) => {
  const data = unwrapApiData(response);

  return data?.conversation || data;
};

const normalizeMessages = (detail) => {
  if (Array.isArray(detail?.messages)) return detail.messages;
  if (Array.isArray(detail?.conversationMessages)) {
    return detail.conversationMessages;
  }
  if (Array.isArray(detail?.data?.messages)) return detail.data.messages;

  return [];
};

const normalizeRelatedList = (response) => {
  const data = unwrapApiData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.purchaseRequests)) return data.purchaseRequests;
  if (Array.isArray(data?.consignments)) return data.consignments;

  return [];
};

const getConversationId = (conversation) => {
  return (
    conversation?.id ||
    conversation?.conversationId ||
    conversation?.conversationID ||
    ""
  );
};

const getMessageId = (message, index) => {
  return (
    message?.id ||
    message?.messageId ||
    message?.createdAt ||
    `${index}-${message?.content || message?.message || ""}`
  );
};

const getMessageContent = (message) => {
  return message?.content || message?.message || message?.text || "";
};

const getMessageAttachment = (message) => {
  return message?.attachmentUrl || message?.attachmentURL || "";
};

const normalizeRoleKey = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
};

const getRoleDisplayName = (role) => {
  const roleKey = normalizeRoleKey(role);

  if (!roleKey) return "";

  if (
    roleKey === "SALES" ||
    roleKey === "SALE" ||
    roleKey === "SALESSTAFF" ||
    roleKey.includes("SALE")
  ) {
    return "Sale";
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

const getMessageSenderRole = (message) => {
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

const getMessageSenderName = (message) => {
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

const getMessageSenderId = (message) => {
  return (
    message?.senderId ||
    message?.createdBy ||
    message?.userId ||
    message?.sender?.id ||
    ""
  );
};

const isMessageMine = (message, currentUserId) => {
  if (typeof message?.isMine === "boolean") return message.isMine;
  if (typeof message?.fromMe === "boolean") return message.fromMe;

  const senderId = getMessageSenderId(message);

  if (senderId && currentUserId) {
    return senderId === currentUserId;
  }

  const role = String(getMessageSenderRole(message)).toLowerCase();

  return role === "customer";
};

const getConversationTitle = (conversation) => {
  return (
    conversation?.title ||
    conversation?.customerName ||
    conversation?.customer?.fullName ||
    conversation?.relatedType ||
    "Cuộc trò chuyện"
  );
};

const getStaffName = (conversation) => {
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

const getStaffDisplayName = (conversation) => {
  return getStaffName(conversation);
};

const hasAssignedStaff = (conversation) => {
  return Boolean(getStaffName(conversation));
};

const getConversationSubtitle = (conversation) => {
  const relatedType = conversation?.relatedType;
  const relatedId = conversation?.relatedId;

  if (relatedType && relatedId) {
    return `${relatedType} • ${String(relatedId).slice(0, 8)}...`;
  }

  if (conversation?.lastMessage) {
    return conversation.lastMessage;
  }

  return "Trao đổi với CSKH";
};

const getConversationLastMessage = (conversation) => {
  return (
    conversation?.lastMessage ||
    conversation?.latestMessage ||
    conversation?.message ||
    "Chưa có tin nhắn mới"
  );
};

const getUnreadCount = (conversation) => {
  return Number(
    conversation?.unreadCount ||
      conversation?.unreadMessages ||
      conversation?.unread ||
      0
  );
};

const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const getClientTimePayload = () => {
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

const normalizeMessageTime = (message) => {
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

const normalizeConversationTime = (conversation) => {
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

const normalizeConversationDetailTime = (detail) => {
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

const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) return "";

  const date = new Date(utcIso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

const getCreatedTime = (item) => {
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

const getRelatedItemId = (item, relatedType) => {
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

const getRelatedItemCode = (item, relatedType) => {
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

const getRelatedItemName = (item, relatedType) => {
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

const getRelatedItemStatus = (item) => {
  return item?.status || item?.orderStatus || "";
};

const getRelatedItemLabel = (item, relatedType) => {
  const id = getRelatedItemId(item, relatedType);
  const code = getRelatedItemCode(item, relatedType);
  const name = getRelatedItemName(item, relatedType);
  const status = getRelatedItemStatus(item);
  const typeLabel = RELATED_TYPE_LABELS[relatedType] || "Liên kết";
  const shortId = id ? String(id).slice(0, 8) : "N/A";

  const parts = [
    typeLabel,
    code || `${shortId}...`,
    name,
    status,
  ].filter(Boolean);

  return parts.join(" - ");
};

const getApiErrorText = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;

  return error?.message || fallback;
};

const notifySuccess = (title, description) => {
  if (typeof AuthNotify?.success === "function") {
    AuthNotify.success(title, description);
  }
};

const notifyError = (title, description) => {
  if (typeof AuthNotify?.error === "function") {
    AuthNotify.error(title, description);
  }
};

const getMessageSignature = (message, index) => {
  return [
    getMessageId(message, index),
    getMessageSenderId(message),
    getMessageSenderRole(message),
    getMessageContent(message),
    getMessageAttachment(message),
    getCreatedTime(message),
  ]
    .map((value) => String(value || ""))
    .join("::");
};

const getMessagesSignature = (messageList = []) => {
  return messageList
    .map((message, index) => getMessageSignature(message, index))
    .join("||");
};

const isImageUrl = (url) => {
  const text = String(url || "").toLowerCase();

  return (
    text.includes("image") ||
    /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?.*)?$/.test(text)
  );
};

const extractUploadUrl = (response) => {
  const data = unwrapApiData(response);

  if (typeof data === "string") {
    return data;
  }

  return (
    data?.url ||
    data?.imageUrl ||
    data?.fileUrl ||
    data?.attachmentUrl ||
    data?.secure_url ||
    data?.data?.url ||
    data?.data?.imageUrl ||
    data?.data?.fileUrl ||
    data?.data?.attachmentUrl ||
    ""
  );
};

const validateImageFile = (file) => {
  if (!file) {
    throw new Error("Không tìm thấy ảnh.");
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error("Chỉ được chọn file ảnh.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Ảnh không được vượt quá ${MAX_IMAGE_SIZE_MB}MB.`);
  }
};

export default function CustomerServiceChat() {
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const detailAbortRef = useRef(null);
  const messagesEndRef = useRef(null);
  const sendImageInputRef = useRef(null);
  const createImageInputRef = useRef(null);

  const messagesSignatureRef = useRef("");
  const isSilentRefreshingRef = useRef(false);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [messageForm, setMessageForm] = useState(INITIAL_MESSAGE_FORM);

  const [createAttachment, setCreateAttachment] = useState(EMPTY_ATTACHMENT);
  const [messageAttachment, setMessageAttachment] = useState(EMPTY_ATTACHMENT);
  const [relatedOptions, setRelatedOptions] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingRelatedOptions, setIsLoadingRelatedOptions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasConversation = conversations.length > 0;
  const hasSelectedConversation = Boolean(selectedConversationId);

  const selectedConversationTitle = selectedConversation
    ? getConversationTitle(selectedConversation)
    : "Chọn cuộc trò chuyện";

  const scrollMessagesToBottom = (behavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior,
        block: "end",
      });
    });
  };

  const clearCreateAttachment = () => {
    if (createAttachment.previewUrl) {
      URL.revokeObjectURL(createAttachment.previewUrl);
    }

    setCreateAttachment(EMPTY_ATTACHMENT);
  };

  const clearMessageAttachment = () => {
    if (messageAttachment.previewUrl) {
      URL.revokeObjectURL(messageAttachment.previewUrl);
    }

    setMessageAttachment(EMPTY_ATTACHMENT);
  };

  const uploadSelectedImage = async (attachment) => {
    if (!attachment?.file) {
      return null;
    }

    const uploadResponse = await uploadImage(attachment.file);
    const uploadedUrl = extractUploadUrl(uploadResponse);

    if (!uploadedUrl) {
      throw new Error("Upload ảnh thành công nhưng không nhận được URL ảnh.");
    }

    return uploadedUrl;
  };

  const loadConversations = async () => {
    setIsLoadingList(true);
    setErrorMessage("");

    try {
      const response = await getConversationsApi();
      const list = normalizeConversationList(response).map(
        normalizeConversationTime
      );

      setConversations(list);

      if (!selectedConversationId && list.length > 0) {
        const firstId = getConversationId(list[0]);

        if (firstId) {
          setSelectedConversationId(firstId);
        }
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorText(error, "Không thể tải danh sách cuộc trò chuyện.")
      );
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadConversationDetail = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    detailAbortRef.current?.abort();

    const controller = new AbortController();

    detailAbortRef.current = controller;

    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await getConversationDetailApi(conversationId, {
        signal: controller.signal,
      });

      const detail = normalizeConversationDetailTime(
        normalizeConversationDetail(response)
      );
      const messageList = normalizeMessages(detail);

      setSelectedConversation(detail);
      setMessages(messageList);
      messagesSignatureRef.current = getMessagesSignature(messageList);

      try {
        await markConversationAsReadApi(conversationId);
      } catch {
        // Không chặn UI nếu mark read lỗi.
      }

      await loadConversations();
    } catch (error) {
      if (
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      setErrorMessage(
        getApiErrorText(error, "Không thể tải chi tiết cuộc trò chuyện.")
      );
    } finally {
      setIsLoadingDetail(false);

      if (detailAbortRef.current === controller) {
        detailAbortRef.current = null;
      }
    }
  };

  const refreshConversationSilently = async (
    conversationId,
    options = {}
  ) => {
    if (!conversationId || isSilentRefreshingRef.current) {
      return;
    }

    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    isSilentRefreshingRef.current = true;

    try {
      const [detailResponse, listResponse] = await Promise.all([
        getConversationDetailApi(conversationId),
        getConversationsApi(),
      ]);

      const detail = normalizeConversationDetailTime(
        normalizeConversationDetail(detailResponse)
      );
      const messageList = normalizeMessages(detail);
      const nextSignature = getMessagesSignature(messageList);
      const hasChanged = nextSignature !== messagesSignatureRef.current;

      setSelectedConversation(detail);

      if (hasChanged || options.forceUpdate) {
        setMessages(messageList);
        messagesSignatureRef.current = nextSignature;

        scrollMessagesToBottom(options.forceScroll ? "smooth" : "auto");

        try {
          await markConversationAsReadApi(conversationId);
        } catch {
          // Không chặn UI nếu mark read lỗi.
        }
      }

      const list = normalizeConversationList(listResponse).map(
        normalizeConversationTime
      );
      setConversations(list);
    } catch (error) {
      console.debug(
        "Silent chat refresh failed:",
        error?.response?.data || error?.message
      );
    } finally {
      isSilentRefreshingRef.current = false;
    }
  };

  const loadRelatedOptions = async (relatedType) => {
    const type = String(relatedType || "").trim();

    setRelatedOptions([]);

    if (!type) {
      return;
    }

    const loader = RELATED_TYPE_LOADERS[type];

    if (!loader) {
      setErrorMessage("Loại liên kết không hợp lệ.");
      return;
    }

    setIsLoadingRelatedOptions(true);
    setErrorMessage("");

    try {
      const response = await loader();
      const list = normalizeRelatedList(response);

      const options = list
        .map((item) => {
          const id = getRelatedItemId(item, type);

          if (!id) {
            return null;
          }

          return {
            value: String(id),
            label: getRelatedItemLabel(item, type),
            raw: item,
          };
        })
        .filter(Boolean);

      setRelatedOptions(options);

      if (options.length === 0) {
        setErrorMessage(
          `Không tìm thấy dữ liệu ${
            RELATED_TYPE_LABELS[type] || "liên kết"
          }.`
        );
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorText(error, "Không thể tải danh sách mã liên kết.")
      );
    } finally {
      setIsLoadingRelatedOptions(false);
    }
  };

  useEffect(() => {
    loadConversations();

    return () => {
      detailAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      loadConversationDetail(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  useEffect(() => {
    loadRelatedOptions(createForm.relatedType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.relatedType]);

  useEffect(() => {
    if (!isLoadingDetail) {
      scrollMessagesToBottom("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, selectedConversationId, isLoadingDetail]);

  useEffect(() => {
    if (!selectedConversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshConversationSilently(selectedConversationId);
    }, MESSAGE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId]);

  const handleOpenCreateModal = () => {
    setErrorMessage("");
    setRelatedOptions([]);
    setCreateForm(INITIAL_CREATE_FORM);
    clearCreateAttachment();
    setIsCreateOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateOpen(false);
    setRelatedOptions([]);
    setCreateForm(INITIAL_CREATE_FORM);
    clearCreateAttachment();
  };

  const handleSelectConversation = (conversation) => {
    const id = getConversationId(conversation);

    if (!id || id === selectedConversationId) {
      return;
    }

    setSelectedConversationId(id);
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((current) => {
      if (name === "relatedType") {
        return {
          ...current,
          relatedType: value,
          relatedId: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const handleMessageChange = (event) => {
    const { name, value } = event.target;

    setMessageForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePickCreateImage = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      validateImageFile(file);
      clearCreateAttachment();

      setCreateAttachment({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    } catch (error) {
      setErrorMessage(error?.message || "Không thể chọn ảnh.");
    }
  };

  const handlePickMessageImage = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      validateImageFile(file);
      clearMessageAttachment();

      setMessageAttachment({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    } catch (error) {
      setErrorMessage(error?.message || "Không thể chọn ảnh.");
    }
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage("");

    const relatedType = String(createForm.relatedType || "").trim();
    const relatedId = String(createForm.relatedId || "").trim();
    const message = String(createForm.message || "").trim();

    if (!message) {
      const errorText = "Vui lòng nhập nội dung cần hỗ trợ.";

      setErrorMessage(errorText);
      notifyError("Tạo cuộc trò chuyện thất bại", errorText);
      setIsCreating(false);
      return;
    }

    if (relatedType && !relatedId) {
      const errorText = "Vui lòng chọn mã liên kết từ danh sách.";

      setErrorMessage(errorText);
      notifyError("Tạo cuộc trò chuyện thất bại", errorText);
      setIsCreating(false);
      return;
    }

    try {
      const attachmentUrl = await uploadSelectedImage(createAttachment);
      const timePayload = getClientTimePayload();

      const requestPayload = {
        relatedType: relatedType || null,
        relatedId: relatedType ? relatedId : null,
        message,
        attachmentUrl,
        createdAtUtc: timePayload.createdAtUtc,
        clientCreatedAtUtc: timePayload.clientCreatedAtUtc,
        clientTimeZone: timePayload.clientTimeZone,
        clientUtcOffset: timePayload.clientUtcOffset,
        clientUtcOffsetMinutes: timePayload.clientUtcOffsetMinutes,
      };

      const response = await createConversationApi(requestPayload);
      const data = unwrapApiData(response);

      const conversationId =
        data?.id ||
        data?.conversationId ||
        data?.conversation?.id ||
        data?.conversation?.conversationId;

      setCreateForm(INITIAL_CREATE_FORM);
      clearCreateAttachment();
      setRelatedOptions([]);
      setIsCreateOpen(false);

      notifySuccess(
        "Tạo cuộc trò chuyện thành công",
        "Bạn có thể bắt đầu trao đổi với CSKH."
      );

      await loadConversations();

      if (conversationId) {
        setSelectedConversationId(conversationId);
      }
    } catch (error) {
      console.error("CREATE CONVERSATION ERROR:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

      const errorText = getApiErrorText(
        error,
        "Không thể tạo cuộc trò chuyện."
      );

      setErrorMessage(errorText);

      notifyError(
        "Tạo cuộc trò chuyện thất bại",
        errorText
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedConversationId || isSending) {
      return;
    }

    const content = messageForm.content.trim();

    if (!content && !messageAttachment.file) {
      setErrorMessage("Vui lòng nhập nội dung hoặc chọn ảnh.");
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const attachmentUrl = await uploadSelectedImage(messageAttachment);
      const timePayload = getClientTimePayload();

      await sendConversationMessageApi(selectedConversationId, {
        content,
        attachmentUrl,
        sentAtUtc: timePayload.sentAtUtc,
        clientSentAtUtc: timePayload.clientSentAtUtc,
        clientTimeZone: timePayload.clientTimeZone,
        clientUtcOffset: timePayload.clientUtcOffset,
        clientUtcOffsetMinutes: timePayload.clientUtcOffsetMinutes,
      });

      setMessageForm(INITIAL_MESSAGE_FORM);
      clearMessageAttachment();

      await refreshConversationSilently(selectedConversationId, {
        forceUpdate: true,
        forceScroll: true,
      });
    } catch (error) {
      setErrorMessage(getApiErrorText(error, "Không thể gửi tin nhắn."));
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkRead = async () => {
    if (!selectedConversationId) {
      return;
    }

    try {
      await markConversationAsReadApi(selectedConversationId);
      await loadConversations();
    } catch (error) {
      setErrorMessage(getApiErrorText(error, "Không thể đánh dấu đã đọc."));
    }
  };

  const handleRefresh = async () => {
    await loadConversations();

    if (selectedConversationId) {
      await loadConversationDetail(selectedConversationId);
    }
  };

  return (
    <div className="cskh-chat-page">
      <div className="cskh-chat-bg cskh-chat-bg--one" />
      <div className="cskh-chat-bg cskh-chat-bg--two" />

      <section className="cskh-chat-shell">
        <aside className="cskh-chat-sidebar">
          <div className="cskh-chat-sidebar__header">
            <div>
              <p className="cskh-chat-eyebrow">Customer Service</p>
              <h2>Tin nhắn CSKH</h2>
              <span>Trao đổi trực tiếp với nhân viên hỗ trợ.</span>
            </div>

            <button
              type="button"
              className="cskh-icon-button"
              onClick={handleRefresh}
              disabled={isLoadingList || isLoadingDetail}
              title="Làm mới"
            >
              <ReloadOutlined />
            </button>
          </div>

          <button
            type="button"
            className="cskh-create-button"
            onClick={handleOpenCreateModal}
          >
            <PlusOutlined />
            <span>Tạo cuộc trò chuyện</span>
          </button>

          {errorMessage && <div className="cskh-alert">{errorMessage}</div>}

          <div className="cskh-conversation-list">
            {isLoadingList && (
              <div className="cskh-state-box">
                <span className="cskh-spinner" />
                Đang tải danh sách...
              </div>
            )}

            {!isLoadingList && !hasConversation && (
              <div className="cskh-empty">
                <InboxOutlined />
                <strong>Chưa có cuộc trò chuyện</strong>
                <span>Hãy tạo cuộc trò chuyện mới để được hỗ trợ.</span>
              </div>
            )}

            {!isLoadingList &&
              conversations.map((conversation) => {
                const id = getConversationId(conversation);
                const unreadCount = getUnreadCount(conversation);
                const isActive = id === selectedConversationId;

                return (
                  <button
                    key={id}
                    type="button"
                    className={[
                      "cskh-conversation-item",
                      isActive && "is-active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <span className="cskh-conversation-avatar">
                      <CustomerServiceOutlined />
                    </span>

                    <span className="cskh-conversation-main">
                      <span className="cskh-conversation-top">
                        <strong>{getConversationTitle(conversation)}</strong>
                        <em>{formatDateTime(getCreatedTime(conversation))}</em>
                      </span>

                      <span className="cskh-conversation-subtitle">
                        {getConversationSubtitle(conversation)}
                      </span>

                      {hasAssignedStaff(conversation) && (
                        <span className="cskh-staff-line has-staff">
                          <CustomerServiceOutlined />
                          {getStaffDisplayName(conversation)}
                        </span>
                      )}

                      <span className="cskh-conversation-message">
                        {getConversationLastMessage(conversation)}
                      </span>
                    </span>

                    {unreadCount > 0 && (
                      <span className="cskh-unread-badge">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </aside>

        <main className="cskh-chat-main">
          {!hasSelectedConversation && (
            <div className="cskh-welcome-panel">
              <div className="cskh-welcome-icon">
                <MessageOutlined />
              </div>

              <h1>Trò chuyện với CSKH</h1>

              <p>
                Chọn một cuộc trò chuyện ở bên trái hoặc tạo cuộc trò chuyện
                mới để bắt đầu trao đổi.
              </p>

              <button
                type="button"
                className="cskh-primary-button"
                onClick={handleOpenCreateModal}
              >
                <PlusOutlined />
                Tạo cuộc trò chuyện
              </button>
            </div>
          )}

          {hasSelectedConversation && (
            <>
              <header className="cskh-chat-main__header">
                <div className="cskh-chat-title">
                  <span className="cskh-chat-title__avatar">
                    <CustomerServiceOutlined />
                  </span>

                  <div>
                    <h1>{selectedConversationTitle}</h1>

                    <p>
                      <i />
                      {hasAssignedStaff(selectedConversation)
                        ? `Nhân viên phụ trách: ${getStaffDisplayName(
                            selectedConversation
                          )}`
                        : "Đang hỗ trợ trực tuyến"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="cskh-read-button"
                  onClick={handleMarkRead}
                >
                  <CheckCircleOutlined />
                  Đã đọc
                </button>
              </header>

              <section className="cskh-message-area">
                {isLoadingDetail && (
                  <div className="cskh-loading-overlay">
                    <span className="cskh-spinner" />
                    Đang tải tin nhắn...
                  </div>
                )}

                {!isLoadingDetail && messages.length === 0 && (
                  <div className="cskh-empty cskh-empty--messages">
                    <CommentOutlined />
                    <strong>Chưa có tin nhắn</strong>
                    <span>
                      Hãy gửi tin nhắn đầu tiên trong cuộc trò chuyện này.
                    </span>
                  </div>
                )}

                {!isLoadingDetail &&
                  messages.map((item, index) => {
                    const mine = isMessageMine(item, currentUserId);
                    const content = getMessageContent(item);
                    const attachmentUrl = getMessageAttachment(item);

                    return (
                      <div
                        key={getMessageId(item, index)}
                        className={[
                          "cskh-message-row",
                          mine ? "is-mine" : "is-other",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {!mine && (
                          <span className="cskh-message-avatar">
                            <CustomerServiceOutlined />
                          </span>
                        )}

                        <div className="cskh-message-bubble">
                          <div className="cskh-message-meta">
                            <strong>
                              {mine ? "Bạn" : getMessageSenderName(item)}
                            </strong>

                            <span>{formatDateTime(getCreatedTime(item))}</span>
                          </div>

                          {content && <p>{content}</p>}

                          {attachmentUrl && (
                            <a
                              className="cskh-attachment-preview"
                              href={attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {isImageUrl(attachmentUrl) ? (
                                <img
                                  src={attachmentUrl}
                                  alt="Ảnh đính kèm"
                                />
                              ) : (
                                <span>
                                  <PaperClipOutlined />
                                  Xem tệp đính kèm
                                </span>
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                <div ref={messagesEndRef} />
              </section>

              <form
                className="cskh-send-form"
                onSubmit={handleSendMessage}
              >
                {messageAttachment.previewUrl && (
                  <div className="cskh-selected-image">
                    <img
                      src={messageAttachment.previewUrl}
                      alt="Ảnh chuẩn bị gửi"
                    />

                    <div>
                      <strong>{messageAttachment.name}</strong>
                      <span>Ảnh sẽ được upload khi bấm gửi.</span>
                    </div>

                    <button
                      type="button"
                      onClick={clearMessageAttachment}
                      disabled={isSending}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                )}

                <div className="cskh-message-input-row">
                  <input
                    ref={sendImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePickMessageImage}
                    className="cskh-hidden-file"
                  />

                  <button
                    type="button"
                    className="cskh-upload-button"
                    onClick={() => sendImageInputRef.current?.click()}
                    disabled={isSending}
                    title="Chọn ảnh"
                  >
                    <PictureOutlined />
                  </button>

                  <input
                    name="content"
                    value={messageForm.content}
                    onChange={handleMessageChange}
                    placeholder="Nhập tin nhắn..."
                    disabled={isSending}
                  />

                  <button
                    type="submit"
                    className="cskh-send-button"
                    disabled={
                      isSending ||
                      (!messageForm.content.trim() && !messageAttachment.file)
                    }
                  >
                    {isSending ? (
                      <span className="cskh-spinner cskh-spinner--light" />
                    ) : (
                      <SendOutlined />
                    )}

                    <span>Gửi</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </section>

      {isCreateOpen && (
        <div className="cskh-modal-backdrop">
          <section className="cskh-modal">
            <header className="cskh-modal__header">
              <div>
                <p className="cskh-chat-eyebrow">New conversation</p>
                <h3>Tạo cuộc trò chuyện</h3>
              </div>

              <button
                type="button"
                className="cskh-icon-button"
                onClick={handleCloseCreateModal}
                disabled={isCreating}
              >
                <CloseOutlined />
              </button>
            </header>

            <form
              className="cskh-create-form"
              onSubmit={handleCreateConversation}
            >
              <label>
                Loại liên kết
                <select
                  name="relatedType"
                  value={createForm.relatedType}
                  onChange={handleCreateChange}
                  disabled={isCreating}
                >
                  {RELATED_TYPE_OPTIONS.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Mã liên kết
                <select
                  name="relatedId"
                  value={createForm.relatedId}
                  onChange={handleCreateChange}
                  disabled={
                    isCreating ||
                    !createForm.relatedType ||
                    isLoadingRelatedOptions ||
                    relatedOptions.length === 0
                  }
                >
                  <option value="">
                    {isLoadingRelatedOptions
                      ? "Đang tải mã liên kết..."
                      : createForm.relatedType
                        ? "Chọn mã liên kết"
                        : "Không cần chọn mã liên kết"}
                  </option>

                  {relatedOptions.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nội dung cần hỗ trợ
                <textarea
                  name="message"
                  value={createForm.message}
                  onChange={handleCreateChange}
                  placeholder="Ví dụ: Tôi muốn hỏi thêm về yêu cầu mua hộ này..."
                  rows={4}
                  disabled={isCreating}
                />
              </label>

              <div className="cskh-create-image-box">
                <input
                  ref={createImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePickCreateImage}
                  className="cskh-hidden-file"
                />

                <button
                  type="button"
                  className="cskh-create-image-button"
                  onClick={() => createImageInputRef.current?.click()}
                  disabled={isCreating}
                >
                  <PictureOutlined />
                  Chọn ảnh từ thư viện
                </button>

                {createAttachment.previewUrl && (
                  <div className="cskh-selected-image cskh-selected-image--modal">
                    <img
                      src={createAttachment.previewUrl}
                      alt="Ảnh đính kèm"
                    />

                    <div>
                      <strong>{createAttachment.name}</strong>
                      <span>Ảnh sẽ được upload khi tạo trò chuyện.</span>
                    </div>

                    <button
                      type="button"
                      onClick={clearCreateAttachment}
                      disabled={isCreating}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                )}
              </div>

              <div className="cskh-modal__actions">
                <button
                  type="button"
                  className="cskh-secondary-button"
                  onClick={handleCloseCreateModal}
                  disabled={isCreating}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="cskh-primary-button"
                  disabled={
                    isCreating ||
                    isLoadingRelatedOptions ||
                    !createForm.message.trim() ||
                    (createForm.relatedType && !createForm.relatedId)
                  }
                >
                  {isCreating ? (
                    <span className="cskh-spinner cskh-spinner--light" />
                  ) : (
                    <PlusOutlined />
                  )}

                  Tạo trò chuyện
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}