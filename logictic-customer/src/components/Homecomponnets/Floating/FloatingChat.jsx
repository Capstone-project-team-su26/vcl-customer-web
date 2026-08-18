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
import { extractOrderIntentApi } from "../../../api/OrderApi/aiOrderIntentApi";
import {
  getConsignmentsApi,
  getConsignmentRoutesApi,
  getConsignmentShippingOptionsApi,
} from "../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../api/PurchaseAPI/purchaseRequestApi";
import { getRestrictedItemListApi } from "../../../api/RestrictedItem/restrictedItemApi";
import {
  getServicePricings,
  getDepositRate,
} from "../../../api/ServiceApi/pricingRuleService";
import AuthNotify from "../../../utils/AuthNotify";

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

const fetchAllApiContextData = async () => {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

  try {
    const promises = [
      getConsignmentRoutesApi().catch(() => null),
      getConsignmentShippingOptionsApi().catch(() => null),
      getRestrictedItemListApi().catch(() => null),
      getServicePricings().catch(() => null),
      getDepositRate().catch(() => null),
    ];

    if (token) {
      promises.push(getConsignmentsApi(1, 10).catch(() => null));
      promises.push(getPurchaseRequestsApi(1, 10).catch(() => null));
    }

    const results = await Promise.allSettled(promises);

    const routesRes = results[0]?.status === "fulfilled" ? results[0].value : null;
    const shippingOptsRes = results[1]?.status === "fulfilled" ? results[1].value : null;
    const restrictedItemsRes = results[2]?.status === "fulfilled" ? results[2].value : null;
    const servicePricingsRes = results[3]?.status === "fulfilled" ? results[3].value : null;
    const depositRateRes = results[4]?.status === "fulfilled" ? results[4].value : null;
    const consignRes = token && results[5]?.status === "fulfilled" ? results[5].value : null;
    const purchaseRes = token && results[6]?.status === "fulfilled" ? results[6].value : null;

    let apiContextText = "";

    // 1. KHO BÃI & TUYẾN ĐƯỜNG TỪ API
    if (routesRes || shippingOptsRes) {
      apiContextText += "\n--- DỮ LIỆU KHO BÃI & TUYẾN ĐƯỜNG THỰC TẾ TỪ API ---\n";
      if (Array.isArray(routesRes)) {
        routesRes.forEach((r) => {
          apiContextText += `- Tuyến vận chuyển: ${r.routeName || r.name || r.id} (${r.description || ""})\n`;
        });
      }
      if (Array.isArray(shippingOptsRes)) {
        shippingOptsRes.forEach((opt) => {
          apiContextText += `- Tùy chọn giao hàng: ${opt.name || opt.shippingOptionName} - Mô tả: ${opt.description || ""}\n`;
        });
      }
    }

    // 2. BẢNG GIÁ & TỶ GIÁ TỪ API
    if (servicePricingsRes || depositRateRes) {
      apiContextText += "\n--- DỮ LIỆU BẢNG GIÁ CƯỚC VẬN CHUYỂN & TỶ GIÁ THỰC TẾ TỪ API ---\n";
      if (depositRateRes) {
        const rateVal = depositRateRes.value ?? depositRateRes;
        apiContextText += `- Tỷ lệ cọc quy định mua hộ: ${rateVal}%\n`;
      }
      if (Array.isArray(servicePricingsRes)) {
        servicePricingsRes.slice(0, 8).forEach((p) => {
          const name = p.name || p.serviceName || "Gói dịch vụ";
          const price = p.price || p.unitPrice || p.rate || "Xem chi tiết";
          apiContextText += `- ${name}: Đơn giá ${price} (Áp dụng từ ${p.minWeight || 0}kg)\n`;
        });
      }
    }

    // 3. DANH MỤC HÀNG CẤM TỪ API
    if (Array.isArray(restrictedItemsRes) && restrictedItemsRes.length > 0) {
      apiContextText += "\n--- DANH MỤC HÀNG CẤM KÝ GỬI THỰC TẾ TỪ API ---\n";
      restrictedItemsRes.slice(0, 15).forEach((item, idx) => {
        const name = item.name || item.itemName || item.title || item;
        apiContextText += `${idx + 1}. ${name}\n`;
      });
    }

    // 4. DỮ LIỆU ĐƠN HÀNG THỰC TẾ KHÁCH HÀNG (KHI ĐÃ ĐĂNG NHẬP)
    if (token) {
      const extractArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (Array.isArray(val.items)) return val.items;
        if (Array.isArray(val.consignments)) return val.consignments;
        if (Array.isArray(val.purchaseRequests)) return val.purchaseRequests;
        if (Array.isArray(val.data?.items)) return val.data.items;
        if (Array.isArray(val.data)) return val.data;
        return [];
      };

      const consignList = extractArray(consignRes);
      const purchaseList = extractArray(purchaseRes);

      const formatVnd = (num) => {
        const n = Number(num);
        if (!Number.isFinite(n) || n <= 0) return "Chưa có cước/báo giá";
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
      };

      apiContextText += "\n--- DỮ LIỆU ĐƠN HÀNG THỰC TẾ CỦA KHÁCH HÀNG TỪ API ---\n";

      // Ký gửi
      apiContextText += `1. ĐƠN KÝ GỬI (Tổng số: ${consignList.length} đơn):\n`;
      if (consignList.length === 0) {
        apiContextText += "   - Chưa có đơn ký gửi nào.\n";
      } else {
        const paidCount = consignList.filter(
          (i) => i.isPaid === true || i.paymentStatus === "PAID" || i.paymentStatus === 1 || String(i.paymentStatus).toUpperCase() === "PAID"
        ).length;
        apiContextText += `   - Trạng thái thanh toán: ${paidCount} đơn đã thanh toán, ${consignList.length - paidCount} đơn chưa thanh toán.\n`;
        apiContextText += "   - Chi tiết các đơn ký gửi:\n";

        consignList.slice(0, 8).forEach((item, idx) => {
          const code = item.orderCode || item.code || item.consignmentCode || item.id || `KG-${idx + 1}`;
          const name = item.productName || item.notes || "Hàng ký gửi";
          const tracking = item.chinaTrackingCode || item.trackingCode || "N/A";
          const status = item.statusName || item.status || "Đang xử lý";
          const isPaid = item.isPaid || item.paymentStatus === "PAID" || item.paymentStatus === 1 ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN";
          const fee = item.totalFee || item.totalShippingFee || item.totalAmount || item.declaredValueCny;

          apiContextText += `     + Mã [${code}]: ${name} (Tracking TQ: ${tracking}), Trạng thái: ${status}, Thanh toán: ${isPaid} (${formatVnd(fee)})\n`;
        });
      }

      // Mua hộ
      apiContextText += `2. ĐƠN MUA HỘ (Tổng số: ${purchaseList.length} đơn):\n`;
      if (purchaseList.length === 0) {
        apiContextText += "   - Chưa có đơn mua hộ nào.\n";
      } else {
        const paidCount = purchaseList.filter(
          (i) => i.isPaid === true || i.paymentStatus === "PAID" || i.paymentStatus === "DEPOSITED" || i.paymentStatus === 1
        ).length;
        apiContextText += `   - Trạng thái thanh toán: ${paidCount} đơn đã cọc/thanh toán, ${purchaseList.length - paidCount} đơn chưa thanh toán/chờ báo giá.\n`;
        apiContextText += "   - Chi tiết các đơn mua hộ:\n";

        purchaseList.slice(0, 8).forEach((item, idx) => {
          const code = item.orderCode || item.code || item.purchaseRequestCode || item.id || `MH-${idx + 1}`;
          const name = item.productName || item.title || "Hàng mua hộ";
          const qty = item.quantity || 1;
          const status = item.statusName || item.status || "Mới tạo";
          const isPaid = item.paymentStatusName || item.paymentStatus || (item.isPaid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN");
          const price = item.totalAmount || item.totalPriceVnd || item.depositAmount;

          apiContextText += `     + Mã [${code}]: ${name} (SL: ${qty}), Trạng thái: ${status}, Thanh toán: ${isPaid} (${formatVnd(price)})\n`;
        });
      }
    }

    return apiContextText;
  } catch (err) {
    console.warn("Lỗi đồng bộ dữ liệu API cho AI context:", err);
    return "";
  }
};

const buildDynamicSystemInstruction = (apiContextData = "") => {
  const token = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  const userStr = sessionStorage.getItem("user") || localStorage.getItem("user");

  let authContext = `
TRẠNG THÁI KHÁCH HÀNG: Chưa đăng nhập (Khách vãng lai).
QUY TẮC PHẢN HỒI:
1. Người dùng CHƯA ĐĂNG NHẬP VẪN ĐƯỢC CHAT HỎI ĐÁP BÌNH THƯỜNG tất cả thông tin công khai (địa chỉ kho, cước phí, danh mục hàng cấm, quy trình ký gửi/mua hộ...). Trả lời nhiệt tình, chính xác.
2. NẾU người dùng yêu cầu tạo đơn Ký gửi hoặc Mua hộ cụ thể, hãy tư vấn quy trình VÀ nhắc người dùng ĐĂNG NHẬP TÀI KHOẢN để chính thức khởi tạo đơn hàng.`;

  if (token || userStr) {
    try {
      const u = userStr ? JSON.parse(userStr) : {};
      const fullName = u.fullName || u.name || sessionStorage.getItem("fullName") || "Khách hàng";
      const phone = u.phone || sessionStorage.getItem("phone") || "Chưa cập nhật";
      const email = u.email || sessionStorage.getItem("email") || "Chưa cập nhật";
      const id = u.userId || u.id || u.customerId || "N/A";

      authContext = `
TRẠNG THÁI KHÁCH HÀNG: ĐÃ ĐĂNG NHẬP & XÁC THỰC THÀNH CÔNG (Token JWT khả dụng)
- Mã Khách hàng (ID): ${id}
- Họ và tên: ${fullName}
- Số điện thoại: ${phone}
- Email: ${email}
CHỈ ĐỊNH PHẢN HỒI: Xưng hô thân thiện bằng tên khách hàng (ví dụ: 'Chào anh/chị ${fullName}...'). Trả lời chính xác từ dữ liệu API bên dưới.`;
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
    } catch { }
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

const requestCodexReply = async ({
  messages,
  signal,
  apiContextData = "",
  retryCount = 0,
}) => {
  const apiMessages = buildCodexMessages(messages, apiContextData);

  if (apiMessages.length <= 1) {
    throw new Error("Không có nội dung để gửi đến trợ lý AI.");
  }

  const customerToken =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    "";

  const activeApiKey =
    AI_CONFIG.apiKey || "sk-bUiazPpchR5Bx8yFpk6MKfKNcE5KrGurGBdQ2kDud0KLPous";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${activeApiKey}`,
  };

  if (customerToken) {
    headers["X-Customer-Token"] = customerToken;
    headers["X-Access-Token"] = customerToken;
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
      return requestCodexReply({ messages, signal, retryCount: retryCount + 1 });
    }

    if (lowerMsg.includes("invalid token")) {
      throw new Error("Khóa kết nối AI bị từ chối. Vui lòng kiểm tra VITE_CODEX_API_KEY.");
    }

    if (lowerMsg.includes("concurrency limit") || lowerMsg.includes("retry later")) {
      throw new Error("Hệ thống AI đang quá tải lượt hỏi cùng lúc. Vui lòng thử lại sau 2 giây.");
    }

    throw new Error(rawErrMsg || `Lỗi kết nối AI (${codexResponse.status})`);
  }

  const reply = codexData?.choices?.[0]?.message?.content;
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
  const [apiContextData, setApiContextData] = useState("");
  const apiContextRef = useRef("");

  const [messages, setMessages] = useState(loadPersistedMessages);

  useEffect(() => {
    apiContextRef.current = apiContextData;
  }, [apiContextData]);

  useEffect(() => {
    if (!isOpen) return;

    fetchAllApiContextData()
      .then((ctx) => {
        setApiContextData(ctx);
        apiContextRef.current = ctx;
      })
      .catch((err) => console.warn("Lỗi đồng bộ dữ liệu API:", err));
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
      const reply = await requestCodexReply({
        messages: nextMessages,
        signal: controller.signal,
        apiContextData: apiContextRef.current || apiContextData,
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