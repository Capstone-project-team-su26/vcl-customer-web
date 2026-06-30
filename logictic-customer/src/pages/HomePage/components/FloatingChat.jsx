import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloseOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { BRAND } from "../data/homeData";
import "./FloatingChat.css";

const QUICK_MESSAGES = [
  {
    id: "buy",
    label: "Tư vấn mua hộ",
    reply:
      "Bạn có thể gửi đường dẫn sản phẩm, số lượng và quốc gia cần mua. Đội ngũ tư vấn sẽ hỗ trợ báo giá chi tiết.",
  },
  {
    id: "consignment",
    label: "Tư vấn ký gửi",
    reply:
      "Dịch vụ ký gửi hỗ trợ nhận hàng tại kho quốc tế, kiểm đếm, gom kiện và vận chuyển an toàn về Việt Nam.",
  },
  {
    id: "tracking",
    label: "Theo dõi đơn hàng",
    reply:
      "Bạn có thể mở trang theo dõi đơn hàng để kiểm tra trạng thái và hành trình vận chuyển.",
  },
];

export default function FloatingChat() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: `Xin chào! Tôi là trợ lý trực tuyến của ${BRAND.name}. Bạn cần hỗ trợ về mua hộ, ký gửi hay theo dõi đơn hàng?`,
    },
  ]);

  const addBotReply = (reply) => {
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          sender: "bot",
          text: reply,
        },
      ]);

      setIsTyping(false);
    }, 500);
  };

  const handleQuickMessage = (quickMessage) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        sender: "user",
        text: quickMessage.label,
      },
    ]);

    addBotReply(quickMessage.reply);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        sender: "user",
        text: trimmedMessage,
      },
    ]);

    setMessage("");

    addBotReply(
      "Cảm ơn bạn đã gửi thông tin. Nhân viên tư vấn sẽ tiếp nhận và hỗ trợ bạn trong thời gian sớm nhất."
    );
  };

  return (
    <div className="floating-ai-chat">
      {isOpen && (
        <section
          className="floating-ai-chat__window"
          aria-label={`Trợ lý trực tuyến ${BRAND.name}`}
        >
          <header className="floating-ai-chat__header">
            <div className="floating-ai-chat__bot">
              <span className="floating-ai-chat__bot-avatar">
                <RobotOutlined />
              </span>

              <div>
                <strong>Trợ lý {BRAND.name}</strong>

                <span>
                  <i />
                  Đang trực tuyến
                </span>
              </div>
            </div>

            <button
              type="button"
              className="floating-ai-chat__close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ trò chuyện"
            >
              <CloseOutlined />
            </button>
          </header>

          <div className="floating-ai-chat__body">
            <div className="floating-ai-chat__messages">
              {messages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`floating-ai-chat__message floating-ai-chat__message--${chatMessage.sender}`}
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
                  onClick={() =>
                    handleQuickMessage(quickMessage)
                  }
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
                href={`tel:${BRAND.hotline.replace(
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
              type="text"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Nhập nội dung cần hỗ trợ..."
              maxLength={500}
              aria-label="Nội dung tin nhắn"
            />

            <button
              type="submit"
              disabled={!message.trim()}
              aria-label="Gửi tin nhắn"
            >
              <SendOutlined />
            </button>
          </form>

          <footer className="floating-ai-chat__footer">
            <CustomerServiceOutlined />
            Hỗ trợ khách hàng trực tuyến
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`floating-ai-chat__launcher ${
          isOpen ? "is-open" : ""
        }`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={
          isOpen
            ? "Đóng trợ lý trực tuyến"
            : `Mở trợ lý trực tuyến ${BRAND.name}`
        }
        aria-expanded={isOpen}
      >
        <span className="floating-ai-chat__launcher-ring" />

        <span className="floating-ai-chat__launcher-icon">
          {isOpen ? (
            <CloseOutlined />
          ) : (
            <MessageOutlined />
          )}
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