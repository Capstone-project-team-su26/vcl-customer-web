import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfigProvider,
  Empty,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Tooltip,
  Upload,
} from "antd";

import {
  CheckCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  MessageFilled,
  DeleteOutlined,
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
} from "@features/chat/api/conversationApi";

import { uploadImages } from "@shared/api/uploadImage.mock";

import {
  INITIAL_CREATE_FORM,
  INITIAL_MESSAGE_FORM,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_MB,
  MESSAGE_POLL_INTERVAL_MS,
  RELATED_TYPE_LABELS,
  RELATED_TYPE_LOADERS,
  RELATED_TYPE_OPTIONS,
} from "./CustomerServiceChat.constants";

import {
  createAttachmentItem,
  extractUploadUrls,
  formatDateTime,
  getApiErrorText,
  getClientTimePayload,
  getConversationId,
  getConversationLastMessage,
  getConversationSubtitle,
  getConversationTitle,
  getCreatedTime,
  getCurrentUserId,
  getMessageAttachment,
  getMessageAttachments,
  getMessageContent,
  getMessageId,
  getMessageSenderName,
  getMessagesSignature,
  getRelatedItemId,
  getRelatedItemLabel,
  getStaffDisplayName,
  getUnreadCount,
  hasAssignedStaff,
  isImageUrl,
  isMessageMine,
  normalizeApiTimeToUtc,
  normalizeConversationDetail,
  normalizeConversationDetailTime,
  normalizeConversationList,
  normalizeConversationTime,
  normalizeMessages,
  normalizeRelatedList,
  notifyError,
  notifySuccess,
  notifyWarning,
  unwrapApiData,
  validateImageFile,
} from "./CustomerServiceChat.helpers";

import "./CustomerServiceChat.css";

export default function CustomerServiceChat() {
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  const detailAbortRef = useRef(null);
  const detailRequestVersionRef = useRef(0);
  const selectedConversationIdRef = useRef("");
  const messageAreaRef = useRef(null);
  const copyTimerRef = useRef(null);

  const messagesSignatureRef = useRef("");
  const isSilentRefreshingRef = useRef(false);

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [messageForm, setMessageForm] = useState(INITIAL_MESSAGE_FORM);

  const [createAttachments, setCreateAttachments] = useState([]);
  const [messageAttachments, setMessageAttachments] = useState([]);
  const [relatedOptions, setRelatedOptions] = useState([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingRelatedOptions, setIsLoadingRelatedOptions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const hasConversation = conversations.length > 0;
  const hasSelectedConversation = Boolean(selectedConversationId);

  const selectedConversationTitle = selectedConversation
    ? getConversationTitle(selectedConversation)
    : "Chọn cuộc trò chuyện";

  const isCreateFormValid = useMemo(() => {
    const relatedType = String(createForm.relatedType || "").trim();
    const relatedId = String(createForm.relatedId || "").trim();
    const message = String(createForm.message || "").trim();

    return Boolean(
      message &&
        (!relatedType || relatedId) &&
        !isLoadingRelatedOptions
    );
  }, [
    createForm.message,
    createForm.relatedId,
    createForm.relatedType,
    isLoadingRelatedOptions,
  ]);

  const createFormHint = useMemo(() => {
    const relatedType = String(createForm.relatedType || "").trim();
    const relatedId = String(createForm.relatedId || "").trim();
    const message = String(createForm.message || "").trim();

    if (!message) {
      return "Nhập nội dung cần hỗ trợ để tiếp tục";
    }

    if (relatedType && !relatedId) {
      return "Chọn đơn hàng cần hỗ trợ để tiếp tục";
    }

    if (isLoadingRelatedOptions) {
      return "Đang tải danh sách đơn hàng";
    }

    return "Đã đủ thông tin để tạo yêu cầu";
  }, [
    createForm.message,
    createForm.relatedId,
    createForm.relatedType,
    isLoadingRelatedOptions,
  ]);

  const scrollMessagesToBottom = (behavior = "smooth") => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const messageArea = messageAreaRef.current;

        if (!messageArea) {
          return;
        }

        const top = Math.max(
          0,
          messageArea.scrollHeight - messageArea.clientHeight
        );

        if (typeof messageArea.scrollTo === "function") {
          messageArea.scrollTo({ top, behavior });
          return;
        }

        messageArea.scrollTop = top;
      });
    });
  };

  const copyTextToClipboard = async (value) => {
    const text = String(value || "").trim();

    if (!text) {
      return false;
    }

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    return copied;
  };

  const handleCopyMessage = async (message, index) => {
    const content = getMessageContent(message);
    const attachmentUrls = getMessageAttachments(message);
    const valueToCopy = [content, ...attachmentUrls]
      .filter(Boolean)
      .join("\n");
    const messageId = String(getMessageId(message, index));

    try {
      const copied = await copyTextToClipboard(valueToCopy);

      if (!copied) {
        throw new Error("Không thể sao chép nội dung.");
      }

      setCopiedMessageId(messageId);
      notifySuccess("Đã sao chép", "Nội dung tin nhắn đã được sao chép.");

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedMessageId("");
      }, 1600);
    } catch (error) {
      notifyError(
        "Sao chép thất bại",
        error?.message || "Không thể sao chép nội dung tin nhắn."
      );
    }
  };

  const revokeAttachmentPreviews = (attachments = []) => {
    attachments.forEach((attachment) => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });
  };

  const clearCreateAttachments = () => {
    setCreateAttachments((current) => {
      revokeAttachmentPreviews(current);
      return [];
    });
  };

  const clearMessageAttachments = () => {
    setMessageAttachments((current) => {
      revokeAttachmentPreviews(current);
      return [];
    });
  };

  const removeCreateAttachment = (attachmentId) => {
    setCreateAttachments((current) => {
      const removed = current.find((item) => item.id === attachmentId);

      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const removeMessageAttachment = (attachmentId) => {
    setMessageAttachments((current) => {
      const removed = current.find((item) => item.id === attachmentId);

      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const uploadSelectedImages = async (attachments = []) => {
    if (!attachments.length) {
      return [];
    }

    const files = attachments
      .map((attachment) => attachment?.file)
      .filter(Boolean);

    if (!files.length) {
      return [];
    }

    const uploadResponse = await uploadImages(
      files,
      undefined,
      { showNotification: false },
    );

    const uploadedUrls = extractUploadUrls(uploadResponse);

    if (uploadedUrls.length < files.length) {
      throw new Error(
        `API chỉ trả về ${uploadedUrls.length}/${files.length} URL ảnh. Vui lòng kiểm tra response upload.`,
      );
    }

    return uploadedUrls.slice(0, files.length);
  };

  const updateConversationSummary = (
    conversationId,
    detail,
    messageList = []
  ) => {
    if (!conversationId) {
      return;
    }

    const latestMessage =
      messageList.length > 0
        ? messageList[messageList.length - 1]
        : null;

    const summary =
      detail && typeof detail === "object"
        ? { ...detail }
        : {};

    delete summary.messages;
    delete summary.conversationMessages;
    delete summary.data;

    const latestContent = latestMessage
      ? getMessageContent(latestMessage) ||
        (getMessageAttachment(latestMessage) ? "Đã gửi một hình ảnh" : "")
      : "";

    const latestTime = latestMessage
      ? getCreatedTime(latestMessage)
      : getCreatedTime(detail);

    setConversations((current) =>
      current.map((conversation) => {
        if (getConversationId(conversation) !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          ...summary,
          ...(latestContent
            ? {
                lastMessage: latestContent,
                latestMessage: latestContent,
              }
            : {}),
          ...(latestTime
            ? {
                lastMessageAt: latestTime,
                latestMessageAt: latestTime,
                lastMessageAtUtc: normalizeApiTimeToUtc(latestTime),
                latestMessageAtUtc: normalizeApiTimeToUtc(latestTime),
              }
            : {}),
          unreadCount: 0,
          unreadMessages: 0,
          unread: 0,
        };
      })
    );
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

      const activeConversationId =
        selectedConversationIdRef.current || selectedConversationId;

      if (!activeConversationId && list.length > 0) {
        const firstConversation = list[0];
        const firstId = getConversationId(firstConversation);

        if (firstId) {
          selectedConversationIdRef.current = firstId;
          setSelectedConversation(firstConversation);
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
    const requestVersion = ++detailRequestVersionRef.current;

    detailAbortRef.current = controller;

    setIsLoadingDetail(true);
    setErrorMessage("");

    try {
      const response = await getConversationDetailApi(conversationId, {
        signal: controller.signal,
      });

      if (
        controller.signal.aborted ||
        requestVersion !== detailRequestVersionRef.current ||
        conversationId !== selectedConversationIdRef.current
      ) {
        return;
      }

      const detail = normalizeConversationDetailTime(
        normalizeConversationDetail(response)
      );
      const messageList = normalizeMessages(detail);

      setSelectedConversation(detail);
      setMessages(messageList);
      messagesSignatureRef.current = getMessagesSignature(messageList);
      updateConversationSummary(conversationId, detail, messageList);

      try {
        await markConversationAsReadApi(conversationId);
        updateConversationSummary(conversationId, detail, messageList);
      } catch {
        // Không chặn UI nếu đánh dấu đã đọc lỗi.
      }
    } catch (error) {
      if (
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      if (requestVersion !== detailRequestVersionRef.current) {
        return;
      }

      setErrorMessage(
        getApiErrorText(error, "Không thể tải chi tiết cuộc trò chuyện.")
      );
    } finally {
      if (
        detailAbortRef.current === controller &&
        requestVersion === detailRequestVersionRef.current
      ) {
        setIsLoadingDetail(false);
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
      const detailResponse = await getConversationDetailApi(conversationId);

      if (conversationId !== selectedConversationIdRef.current) {
        return;
      }

      const detail = normalizeConversationDetailTime(
        normalizeConversationDetail(detailResponse)
      );
      const messageList = normalizeMessages(detail);
      const nextSignature = getMessagesSignature(messageList);
      const hasChanged = nextSignature !== messagesSignatureRef.current;

      setSelectedConversation(detail);
      updateConversationSummary(conversationId, detail, messageList);

      if (hasChanged || options.forceUpdate) {
        setMessages(messageList);
        messagesSignatureRef.current = nextSignature;

        scrollMessagesToBottom(
          options.forceScroll ? "smooth" : "auto"
        );

        try {
          await markConversationAsReadApi(conversationId);
          updateConversationSummary(conversationId, detail, messageList);
        } catch {
          // Không chặn UI nếu đánh dấu đã đọc lỗi.
        }
      }
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

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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
    clearCreateAttachments();
    setIsCreateOpen(true);
  };

  const handleCloseCreateModal = () => {
    if (isCreating) {
      return;
    }

    setIsCreateOpen(false);
    setRelatedOptions([]);
    setCreateForm(INITIAL_CREATE_FORM);
    clearCreateAttachments();
  };

  const handleSelectConversation = (conversation) => {
    const id = getConversationId(conversation);

    if (!id || id === selectedConversationIdRef.current) {
      return;
    }

    detailAbortRef.current?.abort();
    detailRequestVersionRef.current += 1;
    selectedConversationIdRef.current = id;
    messagesSignatureRef.current = "";

    setErrorMessage("");
    setSelectedConversation(normalizeConversationTime(conversation));
    setMessages([]);
    setMessageForm(INITIAL_MESSAGE_FORM);
    clearMessageAttachments();
    setIsLoadingDetail(true);
    setSelectedConversationId(id);

    setConversations((current) =>
      current.map((item) =>
        getConversationId(item) === id
          ? {
              ...item,
              unreadCount: 0,
              unreadMessages: 0,
              unread: 0,
            }
          : item
      )
    );
  };

  const handleMessageChange = (event) => {
    const { name, value } = event.target;

    setMessageForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const appendImageAttachment = ({
    file,
    setAttachments,
    title,
  }) => {
    if (!file) {
      return false;
    }

    try {
      validateImageFile(file);

      setAttachments((current) => {
        const attachmentId =
          String(file?.uid || "").trim() ||
          `${file?.name || "image"}-${file?.size || 0}-${file?.lastModified || 0}`;

        const isDuplicate = current.some(
          (item) =>
            item.id === attachmentId ||
            (
              item.file?.name === file.name &&
              item.file?.size === file.size &&
              item.file?.lastModified === file.lastModified
            ),
        );

        if (isDuplicate) {
          return current;
        }

        if (current.length >= MAX_IMAGE_COUNT) {
          window.queueMicrotask(() => {
            notifyWarning(
              "Đã đạt giới hạn ảnh",
              `Chỉ được đính kèm tối đa ${MAX_IMAGE_COUNT} ảnh.`,
            );
          });

          return current;
        }

        const nextAttachments = [
          ...current,
          createAttachmentItem(file),
        ];

        window.queueMicrotask(() => {
          notifySuccess(
            "Đã chọn ảnh",
            `Đã chọn ${nextAttachments.length}/${MAX_IMAGE_COUNT} ảnh.`,
          );
        });

        return nextAttachments;
      });

      setErrorMessage("");
    } catch (error) {
      const errorText = error?.message || "Không thể chọn ảnh.";

      setErrorMessage(errorText);
      notifyError(title, errorText);
    }

    return false;
  };

  const handlePickCreateImage = (file) => {
    return appendImageAttachment({
      file,
      setAttachments: setCreateAttachments,
      title: "Không thể chọn ảnh yêu cầu",
    });
  };

  const handlePickMessageImage = (file) => {
    return appendImageAttachment({
      file,
      setAttachments: setMessageAttachments,
      title: "Không thể chọn ảnh tin nhắn",
    });
  };

  const updateCreateField = (name, value) => {
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

  const handleMessagePressEnter = (event) => {
    if (event.shiftKey || event.nativeEvent?.isComposing) {
      return;
    }

    event.preventDefault();

    if (
      !isSending &&
      (messageForm.content.trim() || messageAttachments.length > 0)
    ) {
      handleSendMessage(event);
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
      const attachmentUrls = await uploadSelectedImages(createAttachments);
      const timePayload = getClientTimePayload();

      const requestPayload = {
        relatedType: relatedType || null,
        relatedId: relatedType ? relatedId : null,
        message,
        attachmentUrl: attachmentUrls[0] || null,
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

      let remainingImageError = "";

      /*
       * API hội thoại cũ chỉ nhận một attachmentUrl.
       * Ảnh đầu tiên đi cùng tin nhắn tạo hội thoại; các ảnh còn lại
       * được gửi thành từng tin nhắn ảnh để đảm bảo không bị mất ảnh.
       */
      if (!conversationId && attachmentUrls.length > 1) {
        remainingImageError =
          "API tạo hội thoại không trả về conversationId nên các ảnh bổ sung chưa thể gửi.";
      }

      if (conversationId && attachmentUrls.length > 1) {
        try {
          for (const attachmentUrl of attachmentUrls.slice(1)) {
            const extraTimePayload = getClientTimePayload();

            await sendConversationMessageApi(String(conversationId), {
              content: "",
              attachmentUrl,
              sentAtUtc: extraTimePayload.sentAtUtc,
              clientSentAtUtc: extraTimePayload.clientSentAtUtc,
              clientTimeZone: extraTimePayload.clientTimeZone,
              clientUtcOffset: extraTimePayload.clientUtcOffset,
              clientUtcOffsetMinutes:
                extraTimePayload.clientUtcOffsetMinutes,
            });
          }
        } catch (error) {
          remainingImageError = getApiErrorText(
            error,
            "Một số ảnh bổ sung chưa gửi được.",
          );
        }
      }

      setCreateForm(INITIAL_CREATE_FORM);
      clearCreateAttachments();
      setRelatedOptions([]);
      setIsCreateOpen(false);

      notifySuccess(
        "Tạo cuộc trò chuyện thành công",
        attachmentUrls.length
          ? `Đã gửi kèm ${attachmentUrls.length} ảnh.`
          : "Bạn có thể bắt đầu trao đổi với CSKH.",
      );

      if (remainingImageError) {
        notifyWarning("Ảnh gửi chưa đầy đủ", remainingImageError);
      }

      await loadConversations();

      if (conversationId) {
        const nextConversationId = String(conversationId);

        detailAbortRef.current?.abort();
        detailRequestVersionRef.current += 1;
        selectedConversationIdRef.current = nextConversationId;
        messagesSignatureRef.current = "";
        setSelectedConversation(null);
        setMessages([]);
        setSelectedConversationId(nextConversationId);
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

    if (!content && messageAttachments.length === 0) {
      const errorText = "Vui lòng nhập nội dung hoặc chọn ít nhất một ảnh.";

      setErrorMessage(errorText);
      notifyWarning("Chưa có nội dung gửi", errorText);
      return;
    }

    setIsSending(true);
    setErrorMessage("");

    try {
      const attachmentUrls = await uploadSelectedImages(messageAttachments);
      const messageItems = attachmentUrls.length
        ? attachmentUrls
        : [null];

      for (let index = 0; index < messageItems.length; index += 1) {
        const attachmentUrl = messageItems[index];
        const timePayload = getClientTimePayload();

        await sendConversationMessageApi(selectedConversationId, {
          content: index === 0 ? content : "",
          attachmentUrl,
          sentAtUtc: timePayload.sentAtUtc,
          clientSentAtUtc: timePayload.clientSentAtUtc,
          clientTimeZone: timePayload.clientTimeZone,
          clientUtcOffset: timePayload.clientUtcOffset,
          clientUtcOffsetMinutes: timePayload.clientUtcOffsetMinutes,
        });
      }

      setMessageForm(INITIAL_MESSAGE_FORM);
      clearMessageAttachments();

      notifySuccess(
        "Gửi tin nhắn thành công",
        attachmentUrls.length
          ? `Đã gửi nội dung cùng ${attachmentUrls.length} ảnh.`
          : "Tin nhắn đã được gửi đến CSKH.",
      );

      await refreshConversationSilently(selectedConversationId, {
        forceUpdate: true,
        forceScroll: true,
      });
    } catch (error) {
      const errorText = getApiErrorText(error, "Không thể gửi tin nhắn.");

      setErrorMessage(errorText);
      notifyError("Gửi tin nhắn thất bại", errorText);
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

      setConversations((current) =>
        current.map((conversation) =>
          getConversationId(conversation) === selectedConversationId
            ? {
                ...conversation,
                unreadCount: 0,
                unreadMessages: 0,
                unread: 0,
              }
            : conversation
        )
      );
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          colorSuccess: "#16a34a",
          colorError: "#d34f4f",
          colorText: "#1e293b",
          colorTextSecondary: "#64748b",
          borderRadius: 12,
          controlHeight: 44,
          fontFamily:
            'Inter, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
        components: {
          Button: {
            fontWeight: 800,
            primaryShadow: "0 12px 26px rgba(37, 99, 235, 0.24)",
          },
          Input: {
            activeBorderColor: "#2563eb",
            hoverBorderColor: "#93c5fd",
          },
          Select: {
            activeBorderColor: "#2563eb",
            hoverBorderColor: "#93c5fd",
            optionSelectedBg: "#eff6ff",
          },
          Modal: {
            borderRadiusLG: 24,
          },
        },
      }}
    >
      <div className="cskh-chat-page">
        <div className="cskh-chat-bg cskh-chat-bg--one" />
        <div className="cskh-chat-bg cskh-chat-bg--two" />

        <section className="cskh-chat-shell">
          <aside className="cskh-chat-sidebar">
            <div className="cskh-chat-sidebar__header">
              <div>
                <p className="cskh-chat-eyebrow">CHĂM SÓC KHÁCH HÀNG</p>
                <h2>Trung tâm hỗ trợ</h2>
                <span>Trao đổi trực tiếp và theo dõi phản hồi từ CSKH.</span>
              </div>

              <Tooltip title="Làm mới dữ liệu">
                <Button
                  type="text"
                  shape="circle"
                  className="cskh-icon-button"
                  icon={<ReloadOutlined spin={isLoadingList || isLoadingDetail} />}
                  onClick={handleRefresh}
                  disabled={isLoadingList || isLoadingDetail}
                  aria-label="Làm mới danh sách trò chuyện"
                />
              </Tooltip>
            </div>

            <Button
              type="primary"
              className="cskh-create-button"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
              block
            >
              Tạo cuộc trò chuyện
            </Button>

            {errorMessage && !isCreateOpen && (
              <Alert
                className="cskh-alert"
                type="error"
                showIcon
                closable
                message={errorMessage}
                onClose={() => setErrorMessage("")}
              />
            )}

            <div
              className="cskh-conversation-list"
              tabIndex={0}
              role="region"
              aria-label="Danh sách cuộc trò chuyện"
            >
              {isLoadingList && (
                <div className="cskh-state-box">
                  <Spin size="small" />
                  <span>Đang tải danh sách...</span>
                </div>
              )}

              {!isLoadingList && !hasConversation && (
                <Empty
                  className="cskh-empty cskh-empty--sidebar"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      Chưa có cuộc trò chuyện.
                      <br />
                      Hãy tạo yêu cầu hỗ trợ mới.
                    </span>
                  }
                />
              )}

              {!isLoadingList &&
                conversations.map((conversation) => {
                  const id = getConversationId(conversation);
                  const unreadCount = getUnreadCount(conversation);
                  const isActive = id === selectedConversationId;
                  const staffName = getStaffDisplayName(conversation);

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
                      aria-busy={isActive && isLoadingDetail}
                    >
                      <Avatar
                        size={44}
                        className="cskh-conversation-avatar"
                        icon={<MessageFilled />}
                      />

                      <span className="cskh-conversation-main">
                        <span className="cskh-conversation-top">
                          <strong>{getConversationTitle(conversation)}</strong>
                          <em>{formatDateTime(getCreatedTime(conversation))}</em>
                        </span>

                        <span className="cskh-conversation-subtitle">
                          {getConversationSubtitle(conversation)}
                        </span>

                        {staffName && (
                          <span className="cskh-staff-line">
                            <MessageFilled />
                            {staffName}
                          </span>
                        )}

                        <span className="cskh-conversation-message">
                          {getConversationLastMessage(conversation)}
                        </span>
                      </span>

                      {unreadCount > 0 && (
                        <Badge
                          count={unreadCount}
                          overflowCount={99}
                          className="cskh-unread-badge"
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          </aside>

          <main
            className={[
              "cskh-chat-main",
              hasSelectedConversation ? "has-conversation" : "is-empty",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!hasSelectedConversation && (
              <div className="cskh-welcome-panel">
                <div className="cskh-welcome-icon">
                  <MessageOutlined />
                </div>

                <span className="cskh-welcome-kicker">HỖ TRỢ TRỰC TUYẾN</span>
                <h1>Chúng tôi luôn sẵn sàng hỗ trợ</h1>

                <p>
                  Chọn một cuộc trò chuyện bên trái hoặc tạo yêu cầu mới để
                  bắt đầu trao đổi với đội ngũ chăm sóc khách hàng.
                </p>

                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  className="cskh-welcome-button"
                  onClick={handleOpenCreateModal}
                >
                  Tạo cuộc trò chuyện
                </Button>
              </div>
            )}

            {hasSelectedConversation && (
              <>
                <header className="cskh-chat-main__header">
                  <div className="cskh-chat-title">
                    <Avatar
                      size={46}
                      className="cskh-chat-title__avatar"
                      icon={<MessageFilled />}
                    />

                    <div className="cskh-chat-title__content">
                      <h1>{selectedConversationTitle}</h1>

                      <div
  className="cskh-chat-title__status"
  style={{
    display: "flex",
    alignItems: "center",
    marginTop: 6,
  }}
>
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 14px",
      borderRadius: 999,
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#166534",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: "nowrap",
      boxShadow: "0 2px 8px rgba(34,197,94,.08)",
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#22c55e",
        boxShadow: "0 0 0 4px rgba(34,197,94,.18)",
        animation: "onlinePulse 1.8s infinite",
      }}
    />
    {hasAssignedStaff(selectedConversation)
      ? `Nhân viên: ${getStaffDisplayName(selectedConversation)}`
      : "Đang hỗ trợ trực tuyến"}
  </div>
</div>
                    </div>
                  </div>

                  <Tooltip title="Đánh dấu cuộc trò chuyện đã đọc">
                    <Button
                      type="default"
                      className="cskh-read-button"
                      icon={<CheckCircleOutlined />}
                      onClick={handleMarkRead}
                    >
                      <span className="cskh-read-button__label">Đã đọc</span>
                    </Button>
                  </Tooltip>
                </header>

                <section
                  ref={messageAreaRef}
                  className="cskh-message-area"
                  tabIndex={0}
                  role="log"
                  aria-live="polite"
                  aria-label="Nội dung cuộc trò chuyện"
                >
                  {isLoadingDetail && (
                    <div className="cskh-loading-overlay">
                      <Spin />
                      <span>Đang tải tin nhắn...</span>
                    </div>
                  )}

                  {!isLoadingDetail && messages.length === 0 && (
                    <div className="cskh-empty cskh-empty--messages">
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span>
                            Chưa có tin nhắn.
                            <br />
                            Hãy gửi nội dung đầu tiên để bắt đầu trao đổi.
                          </span>
                        }
                      />
                    </div>
                  )}

                  {!isLoadingDetail &&
                    messages.map((item, index) => {
                      const mine = isMessageMine(item, currentUserId);
                      const content = getMessageContent(item);
                      const attachmentUrls = getMessageAttachments(item);
                      const messageId = String(getMessageId(item, index));
                      const isCopied = copiedMessageId === messageId;

                      return (
                        <div
                          key={messageId}
                          className={[
                            "cskh-message-row",
                            mine ? "is-mine" : "is-other",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {!mine && (
                            <Avatar
                              size={34}
                              className="cskh-message-avatar"
                              icon={<MessageFilled />}
                            />
                          )}

                          <div className="cskh-message-group">
                            <div className="cskh-message-bubble">
                              <div className="cskh-message-meta">
                                <div className="cskh-message-meta__identity">
                                  <strong>
                                    {mine
                                      ? "Khách hàng"
                                      : getMessageSenderName(item)}
                                  </strong>
                                  <span>{formatDateTime(getCreatedTime(item))}</span>
                                </div>

                                {(content || attachmentUrls.length > 0) && (
                                  <Tooltip
                                    title={
                                      isCopied
                                        ? "Đã sao chép"
                                        : "Sao chép nội dung"
                                    }
                                  >
                                    <Button
                                      type="text"
                                      shape="circle"
                                      size="small"
                                      className={[
                                        "cskh-message-copy-button",
                                        isCopied && "is-copied",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      icon={
                                        isCopied ? (
                                          <CheckCircleOutlined />
                                        ) : (
                                          <CopyOutlined />
                                        )
                                      }
                                      onClick={() =>
                                        handleCopyMessage(item, index)
                                      }
                                      aria-label="Sao chép tin nhắn"
                                    />
                                  </Tooltip>
                                )}
                              </div>

                              {content && <p>{content}</p>}

                              {attachmentUrls.length > 0 && (
                                <div
                                  className={[
                                    "cskh-attachment-grid",
                                    attachmentUrls.length === 1 &&
                                      "has-single-image",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {attachmentUrls.map((attachmentUrl, imageIndex) => (
                                    <a
                                      key={`${attachmentUrl}-${imageIndex}`}
                                      className="cskh-attachment-preview"
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {isImageUrl(attachmentUrl) ? (
                                        <img
                                          src={attachmentUrl}
                                          alt={`Ảnh đính kèm ${imageIndex + 1}`}
                                          onLoad={() =>
                                            scrollMessagesToBottom("auto")
                                          }
                                        />
                                      ) : (
                                        <span>
                                          <PaperClipOutlined />
                                          Xem tệp đính kèm
                                        </span>
                                      )}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  <div className="cskh-messages-end" aria-hidden="true" />
                </section>

                <form className="cskh-send-form" onSubmit={handleSendMessage}>
                  {messageAttachments.length > 0 && (
                    <div className="cskh-selected-images">
                      <div className="cskh-selected-images__header">
                        <strong>
                          Ảnh đã chọn ({messageAttachments.length}/{MAX_IMAGE_COUNT})
                        </strong>

                        <Button
                          type="text"
                          size="small"
                          danger
                          onClick={clearMessageAttachments}
                          disabled={isSending}
                        >
                          Xóa tất cả
                        </Button>
                      </div>

                      <div className="cskh-selected-images__grid">
                        {messageAttachments.map((attachment, index) => (
                          <div
                            key={attachment.id}
                            className="cskh-selected-image-card"
                          >
                            <img
                              src={attachment.previewUrl}
                              alt={`Ảnh chuẩn bị gửi ${index + 1}`}
                            />

                            <Tooltip title="Xóa ảnh">
                              <Button
                                type="text"
                                shape="circle"
                                danger
                                className="cskh-selected-image-card__remove"
                                icon={<DeleteOutlined />}
                                onClick={() =>
                                  removeMessageAttachment(attachment.id)
                                }
                                disabled={isSending}
                              />
                            </Tooltip>

                            <span title={attachment.name}>
                              {attachment.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="cskh-message-input-row">
                    <Tooltip title="Đính kèm ảnh">
                      <Upload
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        maxCount={MAX_IMAGE_COUNT}
                        showUploadList={false}
                        beforeUpload={handlePickMessageImage}
                        disabled={
                          isSending ||
                          messageAttachments.length >= MAX_IMAGE_COUNT
                        }
                      >
                        <Button
                          type="text"
                          shape="circle"
                          className="cskh-upload-button"
                          icon={<PictureOutlined />}
                          disabled={
                            isSending ||
                            messageAttachments.length >= MAX_IMAGE_COUNT
                          }
                          aria-label={`Chọn ảnh, tối đa ${MAX_IMAGE_COUNT} ảnh`}
                        />
                      </Upload>
                    </Tooltip>

                    <Input.TextArea
                      name="content"
                      value={messageForm.content}
                      onChange={handleMessageChange}
                      onPressEnter={handleMessagePressEnter}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      maxLength={2000}
                      placeholder="Nhập tin nhắn... (Enter để gửi, Shift + Enter để xuống dòng)"
                      disabled={isSending}
                      className="cskh-message-input"
                    />

                    <Button
                      htmlType="submit"
                      type="primary"
                      className="cskh-send-button"
                      icon={<SendOutlined />}
                      loading={isSending}
                      disabled={
                        isSending ||
                        (
                          !messageForm.content.trim() &&
                          messageAttachments.length === 0
                        )
                      }
                    >
                      <span>Gửi</span>
                    </Button>
                  </div>
                </form>
              </>
            )}
          </main>
        </section>

        <Modal
          open={isCreateOpen}
          centered
          width={590}
          className="cskh-create-modal"
          wrapClassName="cskh-create-modal-wrap"
          title={null}
          footer={null}
          closeIcon={null}
          maskClosable={!isCreating}
          keyboard={!isCreating}
          onCancel={handleCloseCreateModal}
          destroyOnClose={false}
        >
          <form
            className="cskh-create-modal__form"
            onSubmit={handleCreateConversation}
          >
            <div className="cskh-create-modal__header">
              <div className="cskh-create-modal__header-icon">
                <MessageFilled />
              </div>

              <div>
                <span>HỖ TRỢ KHÁCH HÀNG</span>
                <h2>Tạo yêu cầu hỗ trợ</h2>
                <p>
                  Chọn đơn hàng liên quan và mô tả rõ nội dung để nhân viên
                  hỗ trợ bạn nhanh hơn.
                </p>
              </div>

              <Tooltip title="Đóng">
                <Button
                  type="text"
                  shape="circle"
                  className="cskh-create-modal__close"
                  icon={<CloseOutlined />}
                  onClick={handleCloseCreateModal}
                  disabled={isCreating}
                  aria-label="Đóng cửa sổ"
                />
              </Tooltip>
            </div>

            <div className="cskh-create-modal__body">
              {errorMessage && (
                <Alert
                  type="error"
                  showIcon
                  closable
                  message={errorMessage}
                  onClose={() => setErrorMessage("")}
                />
              )}

              <div className="cskh-form-field">
                <label htmlFor="cskh-related-type">
                  Liên kết với loại yêu cầu
                  <span className="cskh-form-field__optional">Tùy chọn</span>
                </label>

                <Select
                  id="cskh-related-type"
                  value={createForm.relatedType}
                  onChange={(value) => updateCreateField("relatedType", value)}
                  options={RELATED_TYPE_OPTIONS}
                  disabled={isCreating}
                  placeholder="Chọn loại yêu cầu"
                  className="cskh-form-control"
                />

                <small>
                  Có thể chọn “Không liên kết” khi cần hỗ trợ chung.
                </small>
              </div>

              <div className="cskh-form-field">
                <label htmlFor="cskh-related-id">
                  Đơn hàng cần hỗ trợ
                  {createForm.relatedType && <b>*</b>}
                </label>

                <Select
                  id="cskh-related-id"
                  showSearch
                  allowClear
                  value={createForm.relatedId || undefined}
                  onChange={(value) =>
                    updateCreateField("relatedId", value || "")
                  }
                  options={relatedOptions.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  optionFilterProp="label"
                  loading={isLoadingRelatedOptions}
                  disabled={
                    isCreating ||
                    !createForm.relatedType ||
                    isLoadingRelatedOptions ||
                    relatedOptions.length === 0
                  }
                  placeholder={
                    isLoadingRelatedOptions
                      ? "Đang tải danh sách..."
                      : createForm.relatedType
                        ? "Chọn yêu cầu cần hỗ trợ"
                        : "Chọn loại yêu cầu trước"
                  }
                  notFoundContent={
                    isLoadingRelatedOptions ? (
                      <div className="cskh-select-loading">
                        <Spin size="small" />
                        <span>Đang tải...</span>
                      </div>
                    ) : (
                      "Không tìm thấy dữ liệu"
                    )
                  }
                  className="cskh-form-control"
                />

                <small>Chọn đúng đơn hàng để nhân viên tra cứu nhanh hơn.</small>
              </div>

              <div className="cskh-form-field">
                <label htmlFor="cskh-create-message">
                  Nội dung cần hỗ trợ <b>*</b>
                  <span className="cskh-form-field__counter">
                    {createForm.message.length}/1000
                  </span>
                </label>

                <Input.TextArea
                  id="cskh-create-message"
                  value={createForm.message}
                  onChange={(event) =>
                    updateCreateField("message", event.target.value)
                  }
                  autoSize={{ minRows: 5, maxRows: 8 }}
                  maxLength={1000}
                  disabled={isCreating}
                  placeholder="Ví dụ: Tôi muốn kiểm tra tình trạng báo giá hoặc cần hỗ trợ cập nhật thông tin đơn hàng..."
                  className="cskh-create-textarea"
                />
              </div>

              <div className="cskh-create-upload">
                <div>
                  <strong>Ảnh đính kèm</strong>
                  <span>
                    PNG, JPG hoặc WEBP, tối đa {MAX_IMAGE_COUNT} ảnh,
                    mỗi ảnh không quá {MAX_IMAGE_SIZE_MB}MB.
                  </span>
                </div>

                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  maxCount={MAX_IMAGE_COUNT}
                  showUploadList={false}
                  beforeUpload={handlePickCreateImage}
                  disabled={
                    isCreating ||
                    createAttachments.length >= MAX_IMAGE_COUNT
                  }
                >
                  <Button
                    type="default"
                    icon={<PictureOutlined />}
                    disabled={
                      isCreating ||
                      createAttachments.length >= MAX_IMAGE_COUNT
                    }
                  >
                    {createAttachments.length >= MAX_IMAGE_COUNT
                      ? "Đã đủ 3 ảnh"
                      : "Chọn ảnh"}
                  </Button>
                </Upload>
              </div>

              {createAttachments.length > 0 && (
                <div className="cskh-selected-images cskh-selected-images--modal">
                  <div className="cskh-selected-images__header">
                    <strong>
                      Ảnh đã chọn ({createAttachments.length}/{MAX_IMAGE_COUNT})
                    </strong>

                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={clearCreateAttachments}
                      disabled={isCreating}
                    >
                      Xóa tất cả
                    </Button>
                  </div>

                  <div className="cskh-selected-images__grid">
                    {createAttachments.map((attachment, index) => (
                      <div
                        key={attachment.id}
                        className="cskh-selected-image-card"
                      >
                        <img
                          src={attachment.previewUrl}
                          alt={`Ảnh yêu cầu hỗ trợ ${index + 1}`}
                        />

                        <Tooltip title="Xóa ảnh">
                          <Button
                            type="text"
                            shape="circle"
                            danger
                            className="cskh-selected-image-card__remove"
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              removeCreateAttachment(attachment.id)
                            }
                            disabled={isCreating}
                          />
                        </Tooltip>

                        <span title={attachment.name}>
                          {attachment.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="cskh-create-modal__footer">
              <div
                className={[
                  "cskh-create-modal__footer-status",
                  isCreateFormValid && "is-ready",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isCreateFormValid && <CheckCircleOutlined />}
                <span>{createFormHint}</span>
              </div>

              <Button
                type="default"
                onClick={handleCloseCreateModal}
                disabled={isCreating}
              >
                Hủy
              </Button>

              <Button
                htmlType="submit"
                type="primary"
                icon={<PlusOutlined />}
                loading={isCreating}
                disabled={!isCreateFormValid || isCreating}
                className={[
                  "cskh-create-modal__submit",
                  isCreateFormValid && !isCreating && "is-ready",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isCreating ? "Đang tạo..." : "Tạo cuộc trò chuyện"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ConfigProvider>
  );
}
