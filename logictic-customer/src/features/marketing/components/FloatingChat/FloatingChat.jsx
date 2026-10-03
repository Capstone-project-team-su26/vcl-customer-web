import { useEffect, useRef, useState } from "react";
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

import { BRAND } from "@shared/constants/homeData";
import { AI_CONFIG } from "@shared/config/aiConfig";
/*
 * Ngữ cảnh AI = DỮ LIỆU THẬT (bảng giá GET /api/service-pricings chọn dòng như trang
 * "Chính sách dịch vụ", hệ số DIM, phụ phí, tuyến, hàng cấm + đơn của chính khách khi đã
 * đăng nhập). Không còn đọc pricingRuleService.getServicePricings (fixture mock) hay
 * kịch bản @/mocks/aiAssistant có giá mẫu.
 */
import {
  buildOfflineReply,
  loadFloatingChatContext,
  PRICE_SECTION_TITLE,
  PRICE_UNAVAILABLE_TITLE,
  SERVICE_POLICY_PAGE_NAME,
} from "./floatingChatContext";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";

import "./FloatingChat.css";

/* =========================================================
   CODEX AI CONFIG
   ========================================================= */

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 4;

const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý AI Chăm sóc Khách hàng chuyên nghiệp của hệ thống logistics ${BRAND.name}.

THÔNG TIN CÔNG KHAI (Không cần đăng nhập):
- Trụ sở chính & Kho Việt Nam: ${BRAND.address} (Hotline: ${BRAND.hotline}, Email: ${BRAND.email})
- Tuyến vận chuyển, bảng giá, phụ phí, hàng cấm: CHỈ lấy từ phần "DỮ LIỆU THẬT TỪ HỆ THỐNG" bên dưới.
- Dịch vụ công khai:
  - Mua hộ hàng quốc tế: Taobao, 1688, Tmall, Mercari, Rakuten, Amazon... Thanh toán chuyển khoản VNĐ.
  - Ký gửi hàng hóa: Cấp địa chỉ kho quốc tế, gom kiện tự động, quy trình 6 bước (Tạo đơn -> Nhập kho QT -> Lưu kho -> Thông quan -> Xuất kho -> Về VN).
  - Tra cứu mã vận đơn công khai: Khách hàng có thể tra cứu mã vận đơn trực tiếp tại màn /order-lookup.

QUY TẮC PHẠM VI (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT - SCOPE):
1. BẠN CHỈ ĐƯỢC PHÉP TRẢ LỜI CÁC CÂU HỎI TRONG PHẠM VI NGHIỆP VỤ CỦA ${BRAND.name}:
   - Ký gửi hàng hóa, mua hộ hàng quốc tế (Trung Quốc, Nhật Bản, Hàn Quốc, Mỹ...).
   - Bảng giá cước vận chuyển, tỷ giá ngoại tệ, đặt cọc, thanh toán.
   - Tra cứu trạng thái đơn hàng, tiến trình vận chuyển, mã vận đơn (tracking).
   - Địa chỉ và thông tin kho bãi (Việt Nam và kho quốc tế).
   - Danh mục hàng cấm vận chuyển, hàng hạn chế ký gửi.
   - Hướng dẫn tạo đơn, đăng ký, đăng nhập và sử dụng website.
2. TUYỆT ĐỐI TỪ CHỐI MỌI CÂU HỎI NGOÀI PHẠM VI DỰ ÁN:
   - Các câu hỏi đố vui, mẹo vặt, chuyện phiếm.
   - Các câu hỏi kiến thức đời sống, khoa học, động vật học (ví dụ: "con gà có mấy chân", "mèo thích ăn gì"...).
   - Toán học, lịch sử, địa lý, thời tiết, giải trí, lập trình, chính trị...
   - Khi gặp câu hỏi ngoài phạm vi, TUYỆT ĐỐI KHÔNG TRẢ LỜI nội dung đó, mà PHẢI TỪ CHỐI LỊCH SỰ và hướng người dùng về các dịch vụ logistics của công ty.
   - Mẫu từ chối: "Dạ, tôi là trợ lý AI chuyên trách về dịch vụ Logistics và Mua hộ của ${BRAND.name}. Tôi chỉ có thể hỗ trợ các thông tin liên quan đến vận chuyển, ký gửi, mua hộ và đơn hàng. Quý khách cần hỗ trợ gì về dịch vụ vận chuyển không ạ?"

QUY TẮC PHẢN HỒI:
- Trả lời cực kỳ ngắn gọn, súc tích (1-3 câu ngắn, dưới 100 từ).
- Luôn bằng tiếng Việt lịch sự, thân thiện và chính xác.
- Khi người dùng hỏi thông tin công khai (địa chỉ kho, hàng cấm, quy trình ký gửi/mua hộ), cung cấp câu trả lời ngay lập tức.

QUY TẮC VỀ GIÁ (BẮT BUỘC):
- Phần "${PRICE_SECTION_TITLE}" là bảng giá CHÍNH THỨC đang áp dụng của ${BRAND.name}, cùng nội dung trang "${SERVICE_POLICY_PAGE_NAME}". Chỉ báo giá đúng các dòng trong đó, giữ nguyên con số và đơn vị (ví dụ "80.000 đ/kg").
- TUYỆT ĐỐI KHÔNG tự đặt ra, ước đoán, làm tròn hay lấy giá từ nguồn khác (kiến thức chung, website khác, các câu trả lời trước trong hội thoại — có thể đã cũ). Tuyến / dịch vụ / mức cân không có trong bảng: nói hiện chưa có bảng giá cho trường hợp đó và mời khách liên hệ CSKH.
- Dòng "Liên hệ" nghĩa là chưa niêm yết giá: mời khách liên hệ CSKH. Dòng "Sắp áp dụng" chỉ có hiệu lực từ ngày ghi kèm.
- Khi khách cho cân nặng / kích thước, chỉ tạm tính theo đúng đơn giá + cách tính trong bảng, nói rõ là tạm tính, chưa gồm phụ phí và thuế; giá cuối theo báo giá của kho.
- Nếu ngữ cảnh có mục "${PRICE_UNAVAILABLE_TITLE}": trả lời rằng hiện chưa lấy được bảng giá hiện hành, mời khách xem trang "${SERVICE_POLICY_PAGE_NAME}" hoặc liên hệ CSKH (hotline ${BRAND.hotline}); KHÔNG nêu bất kỳ con số giá nào.
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

const isLogisticsKeyword = (text) => {
  const lower = String(text || "").toLowerCase();
  const keywords = [
    "logistic", "logistics", "ký gửi", "ky gui", "mua hộ", "mua ho",
    "tạo đơn", "tao don", "vận chuyển", "van chuyen", "đơn hàng", "don hang",
    "gửi hàng", "gui hang", "order", "tracking", "nhập kho", "xuất kho",
    "taobao", "1688", "tmall", "rakuten", "mercari", "amazon", "vận đơn",
    "giao hàng", "giao hang"
  ];
  return keywords.some((kw) => lower.includes(kw));
};

const createChatMessage = ({
  sender,
  text,
  status = "success",
  skipApi = false,
  intentData = null,
  requireLogin = false,
}) => ({
  id: createUniqueId(),
  sender,
  text,
  status,
  skipApi,
  intentData,
  requireLogin,
});

const buildDynamicSystemInstruction = (apiContextData = "") => {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");

  let authContext = `
TRẠNG THÁI KHÁCH HÀNG: Chưa đăng nhập (Khách vãng lai).
QUY TẮC PHẢN HỒI:
1. Người dùng CHƯA ĐĂNG NHẬP VẪN ĐƯỢC CHAT HỎI ĐÁP BÌNH THƯỜNG tất cả thông tin công khai (địa chỉ kho, cước phí, danh mục hàng cấm, quy trình ký gửi/mua hộ...). Trả lời nhiệt tình, chính xác.
2. NẾU người dùng hỏi về số lượng đơn hàng hoặc tra cứu đơn hàng cá nhân của họ ("hiện tại đơn hàng kí gửi bao nhiêu", "tôi có bao nhiêu đơn..."): BẮT BUỘC trả lời rằng do khách chưa đăng nhập nên hệ thống chưa thể kiểm tra đơn hàng cá nhân, và hướng dẫn khách đăng nhập tài khoản để xem chính xác. Tuyệt đối không được bịa ra số đơn hàng.
3. NẾU người dùng yêu cầu tạo đơn Ký gửi hoặc Mua hộ cụ thể, hãy tư vấn quy trình VÀ nhắc người dùng ĐĂNG NHẬP TÀI KHOẢN để chính thức khởi tạo đơn hàng.`;

  /* Chỉ coi là đã đăng nhập khi có accessToken — đơn hàng trong ngữ cảnh cũng chỉ tải khi có token. */
  if (token) {
    try {
      const u = userStr ? JSON.parse(userStr) : {};
      const fullName = u.fullName || u.name || sessionStorage.getItem("fullName") || "Khách hàng";
      const phone = u.phone || sessionStorage.getItem("phone") || "Chưa cập nhật";
      const email = u.email || sessionStorage.getItem("email") || "Chưa cập nhật";
      const id = u.userId || u.id || u.customerId || "Chưa có";

      authContext = `
TRẠNG THÁI KHÁCH HÀNG: ĐÃ ĐĂNG NHẬP & XÁC THỰC THÀNH CÔNG (Token JWT khả dụng)
- Mã Khách hàng (ID): ${id}
- Họ và tên: ${fullName}
- Số điện thoại: ${phone}
- Email: ${email}
CHỈ ĐỊNH PHẢN HỒI:
- Xưng hô thân thiện bằng tên khách hàng (ví dụ: 'Chào anh/chị ${fullName}...').
- Khi khách hỏi về số lượng đơn hàng hoặc đơn hàng hiện tại (ví dụ: "hiện tại đơn hàng kí gửi bao nhiêu", "tôi có mấy đơn ký gửi..."), BẮT BUỘC trả lời chính xác số lượng đơn từ mục "ĐƠN HÀNG THẬT CỦA CHÍNH KHÁCH ĐANG ĐĂNG NHẬP" bên dưới. Nếu dữ liệu ghi 0 đơn hoặc chưa có đơn, phải nói rõ là hiện tại chưa có đơn ký gửi nào; nếu ghi "KHÔNG TẢI ĐƯỢC" hoặc không có mục đó, nói hệ thống chưa lấy được đơn và mời khách xem mục Đơn hàng. Tuyệt đối không bịa đặt số đơn hay tự lấy số liệu mẫu.`;
    } catch {
      authContext = "\nTRẠNG THÁI KHÁCH HÀNG: Đã đăng nhập hệ thống (Token JWT khả dụng).";
    }
  }

  return `${SYSTEM_INSTRUCTION.trim()}\n${authContext}\n${apiContextData}`.trim();
};

const createInitialMessage = () => {
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");
  let fullName = "";
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      fullName = u.fullName || u.name || sessionStorage.getItem("fullName") || "";
    } catch {
      /* user hỏng JSON: chào không kèm tên. */
    }
  }

  const welcomeText = fullName
    ? `Xin chào **${fullName}**! Tôi là trợ lý AI của ${BRAND.name}. Tôi có thể hỗ trợ bạn về tra cứu đơn hàng, cước phí, kho bãi và bảng giá hôm nay.`
    : `Xin chào! Tôi là trợ lý AI của ${BRAND.name}. Tôi có thể hỗ trợ bạn về mua hộ, ký gửi và theo dõi đơn hàng.`;

  return createChatMessage({
    sender: "bot",
    text: welcomeText,
    skipApi: true,
  });
};

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

const buildCodexMessages = (messages, apiContextData = "") => {
  const dynamicSystemPrompt = buildDynamicSystemInstruction(apiContextData);
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
    { role: "system", content: dynamicSystemPrompt },
    ...filtered,
  ];
};

/* =========================================================
   CODEX AI REQUEST (Direct Call)
   ========================================================= */

const lastUserText = (messages = []) =>
  [...messages].reverse().find((item) => item?.sender === "user")?.text || "";

const requestCodexReply = async ({
  messages,
  signal,
  chatContext = null,
  retryCount = 0,
}) => {
  const apiMessages = buildCodexMessages(messages, chatContext?.text || "");

  if (apiMessages.length <= 1) {
    throw new Error("Không có nội dung để gửi đến trợ lý AI.");
  }

  const customerToken =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";

  // Khoá chỉ đến từ biến môi trường — không còn fallback nhúng trong source.
  const activeApiKey = AI_CONFIG.apiKey;

  const isExternalProvider =
    /openrouter\.ai|openai\.com|anthropic\.com|groq\.com/i.test(AI_CONFIG.endpoint || "");

  /*
   * Chưa cấu hình AI (không endpoint, hoặc gọi thẳng provider mà thiếu key): trả lời dự
   * phòng từ DỮ LIỆU THẬT đã tải (hỏi giá → in đúng bảng giá thật / báo không lấy được),
   * không còn rơi về kịch bản mẫu có giá giả.
   */
  if (!AI_CONFIG.endpoint || (isExternalProvider && !activeApiKey)) {
    return buildOfflineReply(lastUserText(messages), chatContext);
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (activeApiKey) {
    headers.Authorization = `Bearer ${activeApiKey}`;
  }

  // Chỉ đính kèm token người dùng khi gọi backend/proxy nội bộ.
  // Các dịch vụ public như OpenRouter sẽ từ chối qua CORS preflight (Access-Control-Allow-Headers).
  if (customerToken && !isExternalProvider) {
    headers["X-Customer-Token"] = customerToken;
    headers["X-Access-Token"] = customerToken;
  }

  if (AI_CONFIG.endpoint.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "";
    headers["X-Title"] = "Vietnam Logistic Assistant";
  }

  const codexResponse = await fetch(AI_CONFIG.endpoint, {
    method: "POST",
    headers,
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
    const lowerMsg = rawErrMsg.toLowerCase();

    // Nếu bị giới hạn Concurrency (quá nhiều request song song), tự động chờ 1.2s rồi gửi lại 1 lần
    if (
      (lowerMsg.includes("concurrency limit") ||
        lowerMsg.includes("retry later") ||
        lowerMsg.includes("rate limit") ||
        codexResponse.status === 429) &&
      retryCount < 2
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return requestCodexReply({ messages, signal, chatContext, retryCount: retryCount + 1 });
    }

    if (lowerMsg.includes("invalid token") || lowerMsg.includes("api key")) {
      throw new Error("Khóa kết nối AI bị từ chối hoặc chưa được cấu hình trên server.");
    }

    if (lowerMsg.includes("concurrency limit") || lowerMsg.includes("retry later")) {
      throw new Error("Hệ thống AI đang quá tải lượt hỏi cùng lúc. Vui lòng thử lại sau 2 giây.");
    }

    throw new Error(rawErrMsg || `Lỗi kết nối AI (${codexResponse.status})`);
  }

  const reply =
    codexData?.reply ||
    codexData?.choices?.[0]?.message?.content ||
    codexData?.content;
  if (!reply) {
    throw new Error("AI không trả về phản hồi hợp lệ.");
  }

  return reply;
};

const CHAT_STORAGE_KEY = "vcl_ai_chat_history_v1";

const loadPersistedMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  return [createInitialMessage()];
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

  const [messages, setMessages] = useState(loadPersistedMessages);

  /*
   * Tải lười: mở khung chat thì nạp sẵn ngữ cảnh dữ liệu thật (cache 5 phút trong
   * floatingChatContext); gửi tin vẫn await lại cùng promise nên tin đầu tiên luôn có
   * bảng giá thật, kể cả khi khách gõ nhanh hơn lúc tải xong.
   */
  useEffect(() => {
    if (!isOpen) return;

    loadFloatingChatContext().catch(() => {
      /* Không bao giờ reject; phòng hờ để không có unhandled rejection. */
    });
  }, [isOpen]);

  /* =======================================================
     KEEP LATEST MESSAGES IN REF & SAVE TO LOCALSTORAGE
     ======================================================= */

  useEffect(() => {
    messagesRef.current = messages;
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-30)));
      }
    } catch {
      // ignore storage error
    }
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
    intentData = null,
    requireLogin = false,
  }) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      createChatMessage({
        sender: "bot",
        text,
        status,
        intentData,
        requireLogin,
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
      const chatContext = await loadFloatingChatContext();

      if (controller.signal.aborted) {
        return;
      }

      const reply = await requestCodexReply({
        messages: nextMessages,
        signal: controller.signal,
        chatContext,
      });

      const isLoggedIn = Boolean(
        localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken")
      );

      const isLogisticsTopic = isLogisticsKeyword(normalizedMessage);

      addBotMessage({
        text: reply,
        intentData: null,
        requireLogin: !isLoggedIn && isLogisticsTopic,
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

    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore storage error
    }

    const resetMsg = [
      createChatMessage({
        sender: "bot",
        text: `Cuộc trò chuyện đã được làm mới. Tôi có thể tiếp tục hỗ trợ bạn về các dịch vụ của ${BRAND.name}.`,
        skipApi: true,
      }),
    ];

    setMessages(resetMsg);

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

                    {chatMessage.sender === "bot" && chatMessage.requireLogin && (
                      <div className="floating-ai-inline-login">
                        <div className="inline-login-header">
                          <span>🔒 Yêu cầu Đăng Nhập Tài Khoản</span>
                        </div>
                        <p className="inline-login-text">
                          Để sử dụng đầy đủ dịch vụ <strong>Logistics, Ký gửi, Mua hộ & Tra cứu lộ trình</strong>, vui lòng đăng nhập tài khoản.
                        </p>
                        <button
                          type="button"
                          className="inline-login-action-btn"
                          onClick={() => {
                            AuthNotify.warning(
                              "Yêu cầu đăng nhập",
                              "Vui lòng đăng nhập để sử dụng dịch vụ Logistics!"
                            );
                            navigate("/login");
                            setIsOpen(false);
                          }}
                        >
                          🔑 Đăng Nhập Ngay
                        </button>
                      </div>
                    )}
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