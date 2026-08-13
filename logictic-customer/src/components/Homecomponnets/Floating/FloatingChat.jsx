import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Calculator,
  MapPin,
  Package,
  PhoneCall,
  RefreshCw,
  Search,
  SendHorizontal,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";

import { BRAND } from "../../../utils/data/homeData";
import { AI_CONFIG } from "../../../config/aiConfig";

import "./FloatingChat.css";

/* =========================================================
   CODEX AI CONFIG
   ========================================================= */

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 4;

const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý AI Chăm sóc Khách hàng chuyên nghiệp của hệ thống logistics ${BRAND.name}.

THÔNG TIN DỮ LIỆU CÔNG KHAI HỆ THỐNG (Không cần đăng nhập):
- Trụ sở chính & Kho Việt Nam: ${BRAND.address} (Hotline: ${BRAND.hotline}, Email: ${BRAND.email})
- Kho tiếp nhận Quốc tế: Kho Trung Quốc (Quảng Châu/Bằng Tường), Kho Nhật Bản, Kho Hàn Quốc, Kho Mỹ, Kho Indonesia, Kho Philippines.
- Danh mục HÀNG CẤM KÝ GỬI & VẬN CHUYỂN (/api/restricted-items):
  1. Chất nổ, chất dễ cháy, chất độc hại, bình khí nén.
  2. Vũ khí, đạn dược, công cụ hỗ trợ, chất ma túy, chất kích thích.
  3. Tiền mặt, kim loại quý, đá quý, tài liệu mật.
  4. Hàng giả, hàng nhái các thương hiệu được bảo hộ.
  5. Thực phẩm tươi sống, động vật sống, chất lỏng không nhãn mác.
- Dịch vụ công khai:
  - Mua hộ hàng quốc tế: Taobao, 1688, Tmall, Mercari, Rakuten, Amazon... Thanh toán chuyển khoản VNĐ.
  - Ký gửi hàng hóa: Cấp địa chỉ kho quốc tế, gom kiện tự động, quy trình 6 bước (Tạo đơn -> Nhập kho QT -> Lưu kho -> Thông quan -> Xuất kho -> Về VN).
  - Tra cứu mã vận đơn công khai: Khách hàng có thể tra cứu mã vận đơn trực tiếp tại màn /order-lookup.

QUY TẮC PHẢN HỒI:
- Trả lời cực kỳ ngắn gọn, súc tích (1-3 câu ngắn, dưới 100 từ).
- Luôn bằng tiếng Việt lịch sự, thân thiện và chính xác.
- Khi người dùng hỏi thông tin công khai (địa chỉ kho, hàng cấm, quy trình ký gửi/mua hộ), cung cấp câu trả lời ngay lập tức.
`.trim();

const renderFormattedMessage = (text) => {
  if (!text) return null;

  const cleanText = String(text).replace(/#{1,6}\s?/g, "");
  const lines = cleanText.split("\n");

  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lIdx} className="floating-ai-chat__spacer" />;
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    const parsedContent = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const bulletText = parsedContent.map((c) =>
        typeof c === "string" ? c.replace(/^[-*•]\s+/, "") : c
      );

      return (
        <div key={lIdx} className="floating-ai-chat__bullet-item">
          <span className="floating-ai-chat__bullet-icon">•</span>
          <span className="floating-ai-chat__bullet-text">{bulletText}</span>
        </div>
      );
    }

    return (
      <p key={lIdx} className="floating-ai-chat__paragraph">
        {parsedContent}
      </p>
    );
  });
};

/* =========================================================
   QUICK MESSAGES
   ========================================================= */

const QUICK_MESSAGES = [
  {
    id: "consignment",
    label: "Tư vấn ký gửi",
    icon: Package,
    message: "Hướng dẫn quy trình ký gửi hàng hóa về Việt Nam.",
  },
  {
    id: "buy",
    label: "Tư vấn mua hộ",
    icon: ShoppingCart,
    message: "Hướng dẫn quy trình mua hộ hàng từ website nước ngoài.",
  },
  {
    id: "restricted",
    label: "Hàng cấm ký gửi",
    icon: AlertTriangle,
    message: "Cho tôi biết danh mục các loại hàng hóa bị CẤM vận chuyển và ký gửi.",
  },
  {
    id: "warehouse",
    label: "Địa chỉ kho công khai",
    icon: MapPin,
    message: "Cho tôi biết địa chỉ các kho hàng của Việt Nam Logistic.",
  },
  {
    id: "cost",
    label: "Chi phí vận chuyển",
    icon: Calculator,
    message: "Cách tính cước phí dịch vụ mua hộ và ký gửi.",
  },
];

const INITIAL_BOT_MESSAGE = {
  id: "welcome-msg",
  sender: "bot",
  text: `Xin chào! Tôi là trợ lý AI của ${BRAND.name}. Tôi có thể giúp gì cho bạn hôm nay?`,
  time: "Vừa xong",
};

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
  if (!responseText || typeof responseText !== "string") {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
};

const buildCodexMessages = (messages) => {
  const filtered = messages
    .filter(
      (item) =>
        !item.skipApi &&
        item.status !== "error" &&
        item.text?.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.sender === "bot" ? "assistant" : "user",
      content: item.text.trim(),
    }));

  return [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...filtered,
  ];
};

/* =========================================================
   CODEX AI REQUEST (Direct Call)
   ========================================================= */

const requestCodexReply = async ({
  messages,
  signal,
}) => {
  const apiMessages = buildCodexMessages(messages);

  if (apiMessages.length <= 1) {
    throw new Error("Không có nội dung để gửi đến trợ lý AI.");
  }

  const activeApiKey = AI_CONFIG.apiKey || "sk-bUiazPpchR5Bx8yFpk6MKfKNcE5KrGurGBdQ2kDud0KLPous";

  const codexResponse = await fetch(AI_CONFIG.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeApiKey}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model || "gpt-5.4-mini",
      messages: apiMessages,
      temperature: AI_CONFIG.temperature || 0.3,
      max_tokens: AI_CONFIG.maxTokens || 300,
    }),
    signal,
  });

  const codexText = await codexResponse.text();
  const codexData = parseJsonResponse(codexText);

  if (!codexResponse.ok) {
    const rawErrMsg = codexData?.error?.message || "";
    if (rawErrMsg.toLowerCase().includes("invalid token")) {
      throw new Error("Khóa kết nối AI bị từ chối. Vui lòng kiểm tra VITE_CODEX_API_KEY trên môi trường Deploy.");
    }
    throw new Error(rawErrMsg || `Lỗi kết nối AI (${codexResponse.status})`);
  }

  const reply = codexData?.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error("AI không trả về phản hồi hợp lệ.");
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
      const reply = await requestCodexReply({
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
                <Bot size={20} />
              </span>

              <div className="floating-ai-chat__bot-info">
                <strong>
                  Trợ lý AI {BRAND.name} <Sparkles size={14} className="floating-ai-chat__header-sparkle" />
                </strong>

                <span>
                  <i />
                  {isTyping ? "Đang trả lời..." : "Đang trực tuyến 24/7"}
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
                <RefreshCw size={13} />
                <span>Làm mới</span>
              </button>

              <button
                type="button"
                className="floating-ai-chat__close"
                onClick={handleCloseChat}
                aria-label="Đóng cửa sổ trò chuyện"
              >
                <X size={18} />
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
                      <Bot size={16} />
                    </span>
                  )}

                  <div className="floating-ai-chat__bubble">
                    {renderFormattedMessage(chatMessage.text)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="floating-ai-chat__message floating-ai-chat__message--bot">
                  <span className="floating-ai-chat__message-avatar">
                    <Bot size={16} />
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
              {QUICK_MESSAGES.map((quickMessage) => {
                const QuickIcon = quickMessage.icon;
                return (
                  <button
                    key={quickMessage.id}
                    type="button"
                    disabled={isTyping}
                    onClick={() => handleQuickMessage(quickMessage)}
                  >
                    {QuickIcon && <QuickIcon size={12} className="floating-ai-chat__quick-icon" />}
                    <span>{quickMessage.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="floating-ai-chat__links">
              <button
                type="button"
                onClick={() => navigate("/order-lookup")}
              >
                <Search size={11} /> Theo dõi đơn
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
              >
                <UserPlus size={11} /> Đăng ký
              </button>

              <a
                href={`tel:${String(BRAND.hotline || "").replace(
                  /[^+\d]/g,
                  ""
                )}`}
              >
                <PhoneCall size={11} /> Gọi tư vấn
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
                  ? "Trợ lý AI đang suy nghĩ..."
                  : "Nhập câu hỏi cần tư vấn..."
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
              <SendHorizontal size={17} />
            </button>
          </form>

          <footer className="floating-ai-chat__footer">
            <ShieldCheck size={14} color="#16a34a" />

            <span>
              Bảo mật 100% bằng Trợ lý AI {BRAND.name}
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
          {isOpen ? <X size={24} /> : <Sparkles size={24} />}
        </span>

        {!isOpen && (
          <>
            <span className="floating-ai-chat__online-dot" />

            <span className="floating-ai-chat__tooltip">
              ✨ Trợ lý AI sẵn sàng hỗ trợ bạn!
            </span>
          </>
        )}
      </button>
    </div>
  );
}