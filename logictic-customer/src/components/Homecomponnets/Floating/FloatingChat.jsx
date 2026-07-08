import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  CloseOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons";

import {
  BRAND,
} from "../../../utils/data/homeData";

import "./FloatingChat.css";

/* =========================================================
   GEMINI CONFIG
   ========================================================= */

const GEMINI_PROXY_URL = "../../../utils/data/gemini";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 12;

const SYSTEM_INSTRUCTION = `
Bạn là trợ lý AI chăm sóc khách hàng của hệ thống logistics ${BRAND.name}.

Nhiệm vụ hỗ trợ:
- Tư vấn dịch vụ mua hộ hàng hóa quốc tế.
- Tư vấn dịch vụ ký gửi hàng hóa.
- Hướng dẫn khách hàng tạo đơn hàng.
- Hướng dẫn theo dõi đơn hàng.
- Giải thích quy trình vận chuyển quốc tế.
- Giải thích chung về kho quốc tế và kho Việt Nam.
- Hướng dẫn khách liên hệ nhân viên khi cần hỗ trợ chuyên sâu.

Quy tắc:
- Luôn trả lời bằng tiếng Việt.
- Trả lời lịch sự, thân thiện và dễ hiểu.
- Ưu tiên câu trả lời ngắn gọn nhưng đầy đủ.
- Không tự tạo mã đơn hàng, mã vận đơn hoặc trạng thái đơn hàng.
- Không tự đưa ra giá cước nếu không có dữ liệu chính thức.
- Không yêu cầu khách cung cấp mật khẩu, mã OTP hoặc thông tin thẻ ngân hàng.
- Khi cần kiểm tra đơn hàng cụ thể, hướng dẫn khách đăng nhập hoặc liên hệ nhân viên hỗ trợ.
- Khi người dùng hỏi ngoài phạm vi logistics, hãy trả lời ngắn gọn và điều hướng về dịch vụ của ${BRAND.name}.
`.trim();

/* =========================================================
   QUICK MESSAGES
   ========================================================= */

const QUICK_MESSAGES = [
  {
    id: "buy",
    label: "Tư vấn mua hộ",
    message:
      "Hãy tư vấn cho tôi quy trình mua hộ hàng từ website nước ngoài.",
  },
  {
    id: "consignment",
    label: "Tư vấn ký gửi",
    message:
      "Hãy tư vấn cho tôi quy trình ký gửi hàng hóa về Việt Nam.",
  },
  {
    id: "tracking",
    label: "Theo dõi đơn hàng",
    message:
      "Hướng dẫn tôi cách theo dõi trạng thái và hành trình đơn hàng.",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

const createUniqueId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const createChatMessage = ({
  sender,
  text,
  status = "success",
  skipApi = false,
}) => ({
  id: createUniqueId(),
  sender,
  text,
  status,
  skipApi,
});

const createInitialMessage = () =>
  createChatMessage({
    sender: "bot",
    text: `Xin chào! Tôi là trợ lý AI của ${BRAND.name}. Tôi có thể hỗ trợ bạn về mua hộ, ký gửi và theo dõi đơn hàng.`,
    skipApi: true,
  });

const parseJsonResponse = (responseText) => {
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
};

const getServerErrorMessage = ({
  status,
  responseData,
  responseText,
}) => {
  const serverMessage = String(
    responseData?.message ||
      responseData?.error?.message ||
      responseData?.error ||
      responseText ||
      ""
  ).trim();

  if (status === 400) {
    return serverMessage || "Nội dung gửi lên không hợp lệ.";
  }

  if (status === 401 || status === 403) {
    return serverMessage || "Máy chủ chưa được cấp quyền dùng Gemini.";
  }

  if (status === 404) {
    return "Không tìm thấy API /api/gemini. Hãy kiểm tra file api/gemini.js đã đặt đúng thư mục chưa.";
  }

  if (status === 429) {
    return serverMessage || "Gemini đã vượt giới hạn sử dụng. Vui lòng thử lại sau.";
  }

  if (status >= 500) {
    return serverMessage || "Máy chủ AI đang gặp sự cố. Vui lòng thử lại sau.";
  }

  return serverMessage || `Máy chủ phản hồi lỗi ${status}.`;
};

const buildGeminiContents = (messages) =>
  messages
    .filter(
      (item) =>
        !item.skipApi &&
        item.status !== "error" &&
        item.text?.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.sender === "bot" ? "model" : "user",
      parts: [
        {
          text: item.text.trim(),
        },
      ],
    }));

/* =========================================================
   GEMINI REQUEST
   ========================================================= */

const requestGeminiReply = async ({
  messages,
  signal,
}) => {
  const contents = buildGeminiContents(messages);

  if (!contents.length) {
    throw new Error("Không có nội dung để gửi đến trợ lý AI.");
  }

  const response = await fetch(GEMINI_PROXY_URL, {
    method: "POST",

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents,
    }),

    signal,
  });

  const responseText = await response.text();
  const responseData = parseJsonResponse(responseText);

  if (!response.ok) {
    console.error("AI proxy error:", {
      status: response.status,
      responseData,
      responseText,
    });

    throw new Error(
      getServerErrorMessage({
        status: response.status,
        responseData,
        responseText,
      })
    );
  }

  const reply = String(responseData?.reply || "").trim();

  if (!reply) {
    console.error("AI proxy không trả về reply:", responseData);

    throw new Error("Trợ lý AI không trả về nội dung hợp lệ.");
  }

  return reply;
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function FloatingChat() {
  const navigate = useNavigate();

  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  const requestControllerRef = useRef(null);
  const messagesRef = useRef([]);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState([
    createInitialMessage(),
  ]);

  /* =======================================================
     KEEP LATEST MESSAGES IN REF
     ======================================================= */

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* =======================================================
     AUTO SCROLL
     ======================================================= */

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, isOpen]);

  /* =======================================================
     AUTO FOCUS
     ======================================================= */

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  /* =======================================================
     CLEAN REQUEST
     ======================================================= */

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    []
  );

  /* =======================================================
     ADD BOT MESSAGE
     ======================================================= */

  const addBotMessage = ({
    text,
    status = "success",
  }) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createChatMessage({
        sender: "bot",
        text,
        status,
      }),
    ]);
  };

  /* =======================================================
     SEND MESSAGE
     ======================================================= */

  const sendMessage = async (messageText) => {
    const normalizedMessage = String(messageText || "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);

    if (!normalizedMessage || isTyping) {
      return;
    }

    const userMessage = createChatMessage({
      sender: "user",
      text: normalizedMessage,
    });

    const nextMessages = [
      ...messagesRef.current,
      userMessage,
    ];

    setMessages(nextMessages);
    setMessage("");
    setIsTyping(true);

    requestControllerRef.current?.abort();

    const controller = new AbortController();

    requestControllerRef.current = controller;

    try {
      const reply = await requestGeminiReply({
        messages: nextMessages,
        signal: controller.signal,
      });

      addBotMessage({
        text: reply,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      addBotMessage({
        text:
          error?.message ||
          "Không thể kết nối với trợ lý AI. Vui lòng thử lại.",
        status: "error",
      });
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsTyping(false);
      }
    }
  };

  /* =======================================================
     HANDLERS
     ======================================================= */

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(message);
  };

  const handleQuickMessage = (quickMessage) => {
    sendMessage(quickMessage.message);
  };

  const handleResetConversation = () => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    setIsTyping(false);
    setMessage("");

    setMessages([
      createChatMessage({
        sender: "bot",
        text: `Cuộc trò chuyện đã được làm mới. Tôi có thể tiếp tục hỗ trợ bạn về các dịch vụ của ${BRAND.name}.`,
        skipApi: true,
      }),
    ]);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleToggleChat = () => {
    setIsOpen((current) => !current);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="floating-ai-chat">
      {isOpen && (
        <section
          className="floating-ai-chat__window"
          aria-label={`Trợ lý AI ${BRAND.name}`}
        >
          <header className="floating-ai-chat__header">
            <div className="floating-ai-chat__bot">
              <span className="floating-ai-chat__bot-avatar">
                <RobotOutlined />
              </span>

              <div className="floating-ai-chat__bot-info">
                <strong>
                  Trợ lý AI {BRAND.name}
                </strong>

                <span>
                  <i />
                  {isTyping ? "Đang trả lời..." : "Đang trực tuyến"}
                </span>
              </div>
            </div>

            <div className="floating-ai-chat__header-actions">
              <button
                type="button"
                className="floating-ai-chat__reset"
                disabled={isTyping}
                onClick={handleResetConversation}
                aria-label="Làm mới cuộc trò chuyện"
              >
                <ReloadOutlined />
                <span>Làm mới</span>
              </button>

              <button
                type="button"
                className="floating-ai-chat__close"
                onClick={handleCloseChat}
                aria-label="Đóng cửa sổ trò chuyện"
              >
                <CloseOutlined />
              </button>
            </div>
          </header>

          <div className="floating-ai-chat__body">
            <div
              ref={messageListRef}
              className="floating-ai-chat__messages"
              aria-live="polite"
            >
              {messages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={[
                    "floating-ai-chat__message",
                    `floating-ai-chat__message--${chatMessage.sender}`,
                    chatMessage.status === "error" &&
                      "floating-ai-chat__message--error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {chatMessage.sender === "bot" && (
                    <span className="floating-ai-chat__message-avatar">
                      <RobotOutlined />
                    </span>
                  )}

                  <p>{chatMessage.text}</p>
                </div>
              ))}

              {isTyping && (
                <div className="floating-ai-chat__message floating-ai-chat__message--bot">
                  <span className="floating-ai-chat__message-avatar">
                    <RobotOutlined />
                  </span>

                  <div className="floating-ai-chat__typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            <div className="floating-ai-chat__quick-actions">
              {QUICK_MESSAGES.map((quickMessage) => (
                <button
                  key={quickMessage.id}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleQuickMessage(quickMessage)}
                >
                  {quickMessage.label}
                </button>
              ))}
            </div>

            <div className="floating-ai-chat__links">
              <button
                type="button"
                onClick={() => navigate("/tracking")}
              >
                Theo dõi đơn
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
              >
                Đăng ký tài khoản
              </button>

              <a
                href={`tel:${String(BRAND.hotline || "").replace(
                  /[^+\d]/g,
                  ""
                )}`}
              >
                Gọi tư vấn
              </a>
            </div>
          </div>

          <form
            className="floating-ai-chat__form"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              value={message}
              disabled={isTyping}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                isTyping
                  ? "Trợ lý AI đang trả lời..."
                  : "Nhập nội dung cần hỗ trợ..."
              }
              maxLength={MAX_MESSAGE_LENGTH}
              autoComplete="off"
              aria-label="Nội dung tin nhắn"
            />

            <button
              type="submit"
              disabled={!message.trim() || isTyping}
              aria-label="Gửi tin nhắn"
            >
              <SendOutlined />
            </button>
          </form>

          <footer className="floating-ai-chat__footer">
            <CustomerServiceOutlined />

            <span>
              Hỗ trợ trực tuyến bằng Việt Nam Logictic AI
            </span>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={[
          "floating-ai-chat__launcher",
          isOpen && "is-open",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleToggleChat}
        aria-label={
          isOpen
            ? "Đóng trợ lý trực tuyến"
            : `Mở trợ lý AI ${BRAND.name}`
        }
        aria-expanded={isOpen}
      >
        <span className="floating-ai-chat__launcher-ring" />

        <span className="floating-ai-chat__launcher-icon">
          {isOpen ? <CloseOutlined /> : <MessageOutlined />}
        </span>

        {!isOpen && (
          <>
            <span className="floating-ai-chat__online-dot" />

            <span className="floating-ai-chat__tooltip">
              Xin chào! Bạn cần hỗ trợ?
            </span>
          </>
        )}
      </button>
    </div>
  );
}