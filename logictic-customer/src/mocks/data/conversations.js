/* =========================================================
   data/conversations.js

   Bộ dữ liệu HỘI THOẠI CSKH (chat khách hàng <-> nhân viên tư vấn)
   cho bản build UI-only. Chỉ mock/conversationApi.js đọc file này.

   Shape bám theo đúng những gì màn CustomerServiceChat thực sự đọc
   (xem CustomerServiceChat.helpers.js — nơi khai báo mọi alias):
   - Danh sách trái: getConversationId(id), getConversationTitle(title),
     getConversationSubtitle(relatedType + relatedCode),
     getStaffDisplayName(staffName), getConversationLastMessage(lastMessage),
     getUnreadCount(unreadCount), getCreatedTime(createdAt).
   - Khung tin nhắn: getMessageId(id), getMessageContent(content),
     getMessageAttachments(attachmentUrl/attachmentUrls),
     getMessageSenderName(senderName), getMessageSenderRole(senderRole),
     getCreatedTime(createdAt).

   LƯU Ý QUAN TRỌNG VỀ SHAPE:
   helpers.unwrapApiData() làm `response?.data ?? response` và
   normalizeConversationDetail() làm `data?.conversation || data`.
   => Bản ghi hội thoại TUYỆT ĐỐI không được có field tên `data`
      hoặc `conversation`, nếu không màn hình sẽ đọc nhầm vào đó và
      hiển thị rỗng.

   isMessageMine() ưu tiên senderRole trước khi so senderId, nên mọi tin
   của khách phải để senderRole = "CUSTOMER" (bong bóng bên phải) và tin
   của CSKH để "SALES" (bong bóng bên trái). Bản UI-only không có JWT thật
   nên senderId không so khớp được — role là thứ duy nhất giữ đúng bố cục.

   relatedId được tra ngược từ fixture đơn hàng để trùng khớp tuyệt đối
   với option trong modal "Tạo cuộc trò chuyện" (dropdown lấy id từ
   getRelatedItemId của chính consignments/purchaseRequests).
   ========================================================= */

import { stableUuid } from "../mockUtils";

import {
  MOCK_CUSTOMER,
  findConsignmentByCode,
  findConsignmentById,
} from "./consignments";

import {
  findPurchaseRequestByCode,
  findPurchaseRequestById,
} from "./purchaseRequests";

/* =========================================================
   NGƯỜI THAM GIA
   ========================================================= */

/*
 * Khách đang đăng nhập — dùng lại hồ sơ chung của bản demo.
 * Kèm luôn phone/email để mock tạo hội thoại mới không phải import
 * MOCK_CUSTOMER lần nữa; createChatMessage chỉ đọc 3 field sender*.
 */
export const CHAT_CUSTOMER = Object.freeze({
  senderId: MOCK_CUSTOMER.customerId,
  senderName: MOCK_CUSTOMER.fullName,
  senderRole: "CUSTOMER",
  phone: MOCK_CUSTOMER.phone,
  email: MOCK_CUSTOMER.email,
});

/**
 * Nhân viên tư vấn (hư cấu hoàn toàn).
 *
 * senderRole để "SALES" vì isMessageMine() nhận diện chuỗi có "SALE"
 * là phía đối diện; đổi sang mã khác là hai bên bong bóng bị đảo.
 */
export const CHAT_STAFF = Object.freeze({
  khoi: Object.freeze({
    senderId: stableUuid("chat-staff-khoi"),
    senderName: "Trần Minh Khôi",
    senderRole: "SALES",
  }),
  tran: Object.freeze({
    senderId: stableUuid("chat-staff-tran"),
    senderName: "Lê Thị Bảo Trân",
    senderRole: "SALES",
  }),
  duy: Object.freeze({
    senderId: stableUuid("chat-staff-duy"),
    senderName: "Phạm Quốc Duy",
    senderRole: "SALES",
  }),
  yen: Object.freeze({
    senderId: stableUuid("chat-staff-yen"),
    senderName: "Nguyễn Hải Yến",
    senderRole: "SALES",
  }),
});

/* =========================================================
   ẢNH ĐÍNH KÈM
   ========================================================= */

/*
 * Ảnh chat là data-URI SVG chứ không phải link CDN.
 *
 * Lý do: bản UI-only không có server ảnh, link thật sẽ hỏng và ô đính kèm
 * hiện icon vỡ. helpers.isLikelyAttachmentUrl() chấp nhận tiền tố
 * "data:image/", còn isImageUrl() chỉ cần chuỗi có chứa "image" —
 * data:image/svg+xml thoả cả hai nên ảnh render bình thường.
 */
const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const chatPhoto = (caption, tone = "#2563eb", background = "#e0e7ff") => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">',
    `<rect width="480" height="320" fill="${background}"/>`,
    `<rect x="20" y="20" width="440" height="230" rx="18" fill="#ffffff" stroke="${tone}" stroke-width="3"/>`,
    `<path d="M60 210 L160 120 L230 190 L300 140 L420 210 Z" fill="${tone}" opacity="0.35"/>`,
    `<circle cx="130" cy="80" r="24" fill="${tone}" opacity="0.55"/>`,
    `<text x="240" y="292" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="600" fill="${tone}" text-anchor="middle">${escapeXml(
      caption
    )}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/* =========================================================
   TIỆN ÍCH DỰNG BẢN GHI
   ========================================================= */

const shiftIso = (baseIso, minutes = 0) =>
  new Date(new Date(baseIso).getTime() + minutes * 60 * 1000).toISOString();

/**
 * Tra ngược đơn hàng để lấy đúng khoá chính mà dropdown đang dùng.
 *
 * CONSIGNMENT -> orderId, PURCHASE_REQUEST -> purchaseRequestId,
 * QUOTATION -> quotationId của báo giá đính trên đơn ký gửi.
 * Fallback stableUuid() để fixture không vỡ nếu mã đơn bị đổi.
 */
const resolveRelated = (relatedType, relatedCode) => {
  if (!relatedType || !relatedCode) {
    return { relatedId: null, relatedCode: null };
  }

  if (relatedType === "CONSIGNMENT") {
    const order = findConsignmentByCode(relatedCode);

    return {
      relatedId: order?.orderId || stableUuid(`chat-related-${relatedCode}`),
      relatedCode: order?.consignmentCode || relatedCode,
    };
  }

  if (relatedType === "PURCHASE_REQUEST") {
    const request = findPurchaseRequestByCode(relatedCode);

    return {
      relatedId:
        request?.purchaseRequestId ||
        stableUuid(`chat-related-${relatedCode}`),
      relatedCode: request?.purchaseCode || relatedCode,
    };
  }

  if (relatedType === "QUOTATION") {
    const order = findConsignmentByCode(relatedCode);

    return {
      relatedId:
        order?.quotation?.quotationId ||
        stableUuid(`chat-related-quotation-${relatedCode}`),
      relatedCode: order?.quotation?.quotationCode || relatedCode,
    };
  }

  return {
    relatedId: stableUuid(`chat-related-${relatedCode}`),
    relatedCode,
  };
};

/**
 * Một tin nhắn trong hội thoại.
 *
 * @param {object} params
 * @returns {object}
 */
export const createChatMessage = ({
  seed,
  conversationId,
  sender,
  content = "",
  attachmentUrl = null,
  createdAt,
  isRead = true,
}) => {
  const messageId = stableUuid(`chat-message-${seed}`);

  return {
    id: messageId,
    messageId,
    conversationId,

    senderId: sender.senderId,
    senderName: sender.senderName,
    senderFullName: sender.senderName,
    senderRole: sender.senderRole,

    content,

    /* Giữ cả hai tên field: collectAttachmentUrls() đọc cả hai và tự lọc trùng. */
    attachmentUrl,
    attachmentUrls: attachmentUrl ? [attachmentUrl] : [],

    isRead,

    createdAt,
    sentAt: createdAt,
    updatedAt: createdAt,
    readAt: isRead ? createdAt : null,
  };
};

/**
 * Một hội thoại đầy đủ (bản ghi list + detail dùng chung).
 *
 * @param {object} params
 * @returns {object}
 */
const createConversation = ({
  seed,
  title,
  relatedType = null,
  relatedCode = null,
  staff = null,
  status = "PROCESSING",
  unreadCount = 0,
  createdAt,
  script = [],
}) => {
  const conversationId = stableUuid(`chat-conversation-${seed}`);
  const related = resolveRelated(relatedType, relatedCode);

  const messages = script.map((line, index) =>
    createChatMessage({
      seed: `${seed}-${String(index + 1).padStart(2, "0")}`,
      conversationId,
      sender: line.from === "customer" ? CHAT_CUSTOMER : staff || CHAT_STAFF.khoi,
      content: line.text || "",
      attachmentUrl: line.photo || null,
      createdAt: shiftIso(createdAt, line.at || 0),
      /* Tin chưa đọc luôn nằm ở cuối, khớp với unreadCount của hội thoại. */
      isRead: line.unread !== true,
    })
  );

  const lastMessage = messages.length
    ? messages[messages.length - 1]
    : null;

  const lastMessageAt = lastMessage ? lastMessage.createdAt : createdAt;

  const lastMessageText = lastMessage
    ? lastMessage.content ||
      (lastMessage.attachmentUrl ? "Đã gửi một hình ảnh" : "")
    : "";

  const lastReadMessage = [...messages]
    .reverse()
    .find((message) => message.isRead);

  return {
    id: conversationId,
    conversationId,

    title,
    status,

    relatedType,
    relatedId: related.relatedId,
    relatedCode: related.relatedCode,

    customerId: MOCK_CUSTOMER.customerId,
    customerName: MOCK_CUSTOMER.fullName,
    customerPhone: MOCK_CUSTOMER.phone,
    customerEmail: MOCK_CUSTOMER.email,

    staffId: staff?.senderId || null,
    staffName: staff?.senderName || "",
    staffRole: staff ? "Nhân viên tư vấn" : "",

    /* Hai tên field cho cùng một nội dung: helper đọc lastMessage trước. */
    lastMessage: lastMessageText,
    latestMessage: lastMessageText,

    unreadCount,
    unreadMessages: unreadCount,
    unread: unreadCount,

    messageCount: messages.length,

    createdAt,
    updatedAt: lastMessageAt,
    lastMessageAt,
    latestMessageAt: lastMessageAt,
    lastReadAt: lastReadMessage ? lastReadMessage.createdAt : createdAt,

    messages,
  };
};

/* =========================================================
   DỮ LIỆU MẪU
   ========================================================= */

/**
 * 14 hội thoại: đủ để danh sách bên trái phải cuộn, có cả hội thoại
 * gắn đơn ký gửi / mua hộ / báo giá lẫn hội thoại hỗ trợ chung, và có
 * hội thoại còn badge chưa đọc để kiểm thử nút "Đã đọc".
 *
 * @type {Array<object>}
 */
export const conversations = [
  createConversation({
    seed: "01",
    title: "Nhờ kiểm hàng trước khi đóng thùng",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260901021433-418209",
    staff: CHAT_STAFF.khoi,
    status: "PROCESSING",
    unreadCount: 2,
    createdAt: "2026-09-01T02:41:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Chào bạn, đơn ký gửi của mình có 2 con robot hút bụi, bên mình kiểm giúp xem thùng có bị móp không nhé.",
      },
      {
        at: 4,
        from: "staff",
        text: "Dạ chào chị Hà, đơn đã bật dịch vụ kiểm hàng nên kho Quảng Châu sẽ mở kiểm và chụp ảnh gửi chị ạ.",
      },
      {
        at: 9,
        from: "customer",
        text: "Nếu móp thì mình có được đổi không bạn?",
      },
      {
        at: 22,
        from: "staff",
        text: "Dạ nếu phát hiện móp bên em giữ hàng lại và báo shop đổi, chị không phải trả thêm cước nội địa lần đổi ạ.",
        unread: true,
      },
      {
        at: 24,
        from: "staff",
        text: "Ảnh kiểm hàng lô đầu tiên đây ạ, thùng còn nguyên seal.",
        photo: chatPhoto("Kiểm hàng kho Quảng Châu"),
        unread: true,
      },
    ],
  }),

  createConversation({
    seed: "02",
    title: "Xác nhận báo giá đơn mua hộ",
    relatedType: "PURCHASE_REQUEST",
    relatedCode: "PUR-20260901072218-604318",
    staff: CHAT_STAFF.tran,
    status: "PROCESSING",
    unreadCount: 1,
    createdAt: "2026-09-01T07:55:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Báo giá đơn hoodie với jogger sao cao hơn lúc mình khai vậy bạn?",
      },
      {
        at: 6,
        from: "staff",
        text: "Dạ shop vừa tăng giá 3% và tỷ giá tệ hôm nay là 3.640đ nên tổng nhích lên chị ạ. Phí dịch vụ vẫn giữ 5%.",
      },
      {
        at: 15,
        from: "customer",
        text: "Vậy mình chốt nhé, khi nào cần chuyển khoản?",
      },
      {
        at: 19,
        from: "staff",
        text: "Chị bấm Thanh toán trong màn chi tiết báo giá là được ạ, báo giá còn hiệu lực 5 ngày.",
        unread: true,
      },
    ],
  }),

  createConversation({
    seed: "03",
    title: "Hàng dễ vỡ, xin đóng thùng gỗ",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260831084712-330715",
    staff: CHAT_STAFF.duy,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-31T09:12:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Đơn 4 màn hình AOC bên mình muốn đóng thùng gỗ hết, phụ phí bao nhiêu ạ?",
      },
      {
        at: 7,
        from: "staff",
        text: "Dạ thùng gỗ tính 180.000đ/kiện, đơn của chị 2 kiện nên thêm 360.000đ ạ.",
      },
      {
        at: 12,
        from: "customer",
        text: "Ok bạn thêm giúp mình, mình chấp nhận phụ phí.",
      },
      {
        at: 18,
        from: "staff",
        text: "Dạ em đã cập nhật dịch vụ vào đơn và gửi lại báo giá mới cho chị rồi ạ.",
      },
    ],
  }),

  createConversation({
    seed: "04",
    title: "Muốn tăng số lượng ốp lưng",
    relatedType: "PURCHASE_REQUEST",
    relatedCode: "PUR-20260830061407-472069",
    staff: CHAT_STAFF.tran,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-30T06:40:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Cho mình tăng combo ốp lưng từ 20 lên 40 cái được không bạn?",
      },
      {
        at: 5,
        from: "staff",
        text: "Dạ được ạ, đơn chưa đặt cọc nên em sửa số lượng và tính lại báo giá cho chị.",
      },
      {
        at: 26,
        from: "staff",
        text: "Em cập nhật xong rồi ạ, tổng tiền hàng tăng thêm 1.240.000đ, cước dự kiến tăng 0,8kg.",
      },
      {
        at: 41,
        from: "customer",
        text: "Cảm ơn bạn nhiều nhé.",
      },
    ],
  }),

  createConversation({
    seed: "05",
    title: "Báo giá còn hạn bao lâu?",
    relatedType: "QUOTATION",
    relatedCode: "VCL-20260828033609-661032",
    staff: CHAT_STAFF.khoi,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-28T04:15:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Báo giá này mình để cuối tuần thanh toán có kịp không bạn?",
      },
      {
        at: 8,
        from: "staff",
        text: "Dạ báo giá hết hạn sau 7 ngày kể từ lúc gửi, chị thanh toán trước 04/09 là kịp ạ.",
      },
      {
        at: 13,
        from: "customer",
        text: "Quá hạn thì sao ạ?",
      },
      {
        at: 17,
        from: "staff",
        text: "Quá hạn em sẽ báo giá lại theo tỷ giá mới, đơn không bị huỷ chị nhé.",
      },
    ],
  }),

  createConversation({
    seed: "06",
    title: "Hỏi cách tính phí lưu kho",
    relatedType: null,
    relatedCode: null,
    staff: CHAT_STAFF.yen,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-27T02:20:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Hàng về kho Hà Nội mà mình chưa lấy ngay thì tính phí lưu kho thế nào ạ?",
      },
      {
        at: 11,
        from: "staff",
        text: "Dạ 7 ngày đầu miễn phí, từ ngày thứ 8 tính 3.000đ/kg/ngày, tối thiểu 20.000đ/ngày ạ.",
      },
      {
        at: 16,
        from: "customer",
        text: "Cảm ơn bạn, vậy mình sắp xếp lấy trong tuần.",
      },
    ],
  }),

  createConversation({
    seed: "07",
    title: "Đổi địa chỉ nhận hàng",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260829090541-274860",
    staff: CHAT_STAFF.duy,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-29T09:30:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Mình muốn đổi địa chỉ nhận sang 145 Nguyễn Văn Cừ, Long Biên, Hà Nội nhé.",
      },
      {
        at: 9,
        from: "staff",
        text: "Dạ đơn chưa xuất kho nên đổi được ạ. Chị cho em xin số điện thoại người nhận mới luôn.",
      },
      {
        at: 12,
        from: "customer",
        text: "0912 448 305, tên người nhận là Đỗ Quang Vinh bạn nhé.",
      },
      {
        at: 20,
        from: "staff",
        text: "Em đã cập nhật xong, cước nội địa vẫn giữ nguyên vì cùng nội thành ạ.",
      },
    ],
  }),

  createConversation({
    seed: "08",
    title: "Shop báo hết hàng một sản phẩm",
    relatedType: "PURCHASE_REQUEST",
    relatedCode: "PUR-20260829015236-935214",
    staff: CHAT_STAFF.tran,
    status: "PROCESSING",
    unreadCount: 3,
    createdAt: "2026-08-29T02:05:00Z",
    script: [
      {
        at: 0,
        from: "staff",
        text: "Dạ chị Hà ơi, shop báo mẫu kính râm gọng vàng hết hàng, còn gọng bạc thôi ạ.",
      },
      {
        at: 30,
        from: "customer",
        text: "Vậy bạn đổi giúp mình sang gọng bạc, giá có chênh không?",
      },
      {
        at: 44,
        from: "staff",
        text: "Dạ cùng giá chị nhé, em đặt luôn.",
        unread: true,
      },
      {
        at: 51,
        from: "staff",
        text: "Ảnh mẫu gọng bạc shop vừa gửi ạ.",
        photo: chatPhoto("Kính râm gọng bạc", "#0f766e", "#ccfbf1"),
        unread: true,
      },
      {
        at: 58,
        from: "staff",
        text: "Đơn đã đặt xong, dự kiến shop giao về kho trong 3 ngày ạ.",
        unread: true,
      },
    ],
  }),

  createConversation({
    seed: "09",
    title: "Đơn về kho Hà Nội chưa?",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260826075214-192730",
    staff: CHAT_STAFF.khoi,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-26T08:10:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Bạn check giúp mình đơn này đang ở đâu với ạ.",
      },
      {
        at: 6,
        from: "staff",
        text: "Dạ đơn đã qua cửa khẩu Hữu Nghị tối qua, dự kiến về kho Hà Nội chiều mai ạ.",
      },
      {
        at: 10,
        from: "customer",
        text: "Về kho thì bên mình báo mình luôn nhé.",
      },
      {
        at: 14,
        from: "staff",
        text: "Dạ vâng, kho quét mã là hệ thống bắn thông báo cho chị ngay ạ.",
      },
    ],
  }),

  createConversation({
    seed: "10",
    title: "Hướng dẫn thanh toán chuyển khoản",
    relatedType: null,
    relatedCode: null,
    staff: CHAT_STAFF.yen,
    status: "COMPLETED",
    unreadCount: 0,
    createdAt: "2026-08-24T03:25:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Mình chuyển khoản thì ghi nội dung thế nào để hệ thống tự khớp ạ?",
      },
      {
        at: 7,
        from: "staff",
        text: "Dạ chị ghi đúng mã đơn, ví dụ VCL-20260824100937-406358, hệ thống khớp tự động trong 5 phút ạ.",
      },
      {
        at: 15,
        from: "customer",
        text: "Mình chuyển rồi đây bạn, đây là biên lai.",
        photo: chatPhoto("Biên lai chuyển khoản", "#b45309", "#fef3c7"),
      },
      {
        at: 21,
        from: "staff",
        text: "Dạ em đã thấy tiền về và xác nhận thanh toán cho đơn của chị rồi ạ.",
      },
    ],
  }),

  createConversation({
    seed: "11",
    title: "Khiếu nại thiếu một sản phẩm",
    relatedType: "PURCHASE_REQUEST",
    relatedCode: "PUR-20260823074905-264730",
    staff: CHAT_STAFF.duy,
    status: "PROCESSING",
    unreadCount: 0,
    createdAt: "2026-08-23T08:40:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Mình nhận hàng nhưng thiếu 1 chiếc balo so với đơn ạ.",
      },
      {
        at: 3,
        from: "customer",
        text: "Ảnh mình chụp lúc mở kiện đây.",
        photo: chatPhoto("Ảnh mở kiện thiếu hàng", "#be123c", "#ffe4e6"),
      },
      {
        at: 25,
        from: "staff",
        text: "Dạ em đã mở phiếu khiếu nại và đối chiếu ảnh kho, kho xác nhận đóng thiếu 1 cái ạ.",
      },
      {
        at: 40,
        from: "staff",
        text: "Bên em gửi bù chiếc còn lại trong chuyến kế tiếp, chị không mất thêm cước ạ.",
      },
      {
        at: 47,
        from: "customer",
        text: "Vậy được rồi, cảm ơn bạn xử lý nhanh.",
      },
    ],
  }),

  createConversation({
    seed: "12",
    title: "Yêu cầu xuất hoá đơn VAT",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260812025831-620973",
    staff: CHAT_STAFF.yen,
    status: "COMPLETED",
    unreadCount: 0,
    createdAt: "2026-08-12T03:05:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Đơn này bên mình cần hoá đơn VAT, xuất theo công ty được không ạ?",
      },
      {
        at: 9,
        from: "staff",
        text: "Dạ được ạ, chị gửi em tên công ty, mã số thuế và địa chỉ đăng ký kinh doanh nhé.",
      },
      {
        at: 14,
        from: "customer",
        text: "Công ty TNHH Thương mại Hà An, MST 0109887766, 22 Trần Duy Hưng, Cầu Giấy, Hà Nội.",
      },
      {
        at: 33,
        from: "staff",
        text: "Dạ em đã xuất hoá đơn và gửi vào email thanhha.nguyen@vcl-demo.vn ạ.",
      },
    ],
  }),

  createConversation({
    seed: "13",
    title: "Tư vấn ký gửi lần đầu",
    relatedType: null,
    relatedCode: null,
    staff: CHAT_STAFF.khoi,
    status: "COMPLETED",
    unreadCount: 0,
    createdAt: "2026-07-30T04:10:00Z",
    script: [
      {
        at: 0,
        from: "customer",
        text: "Mình mới bắt đầu, ký gửi khác mua hộ chỗ nào bạn nhỉ?",
      },
      {
        at: 8,
        from: "staff",
        text: "Dạ mua hộ là bên em đặt và trả tiền hàng giúp chị; ký gửi là chị tự mua rồi ship về kho Quảng Châu, bên em chỉ vận chuyển về Việt Nam ạ.",
      },
      {
        at: 12,
        from: "customer",
        text: "Vậy ký gửi rẻ hơn đúng không?",
      },
      {
        at: 17,
        from: "staff",
        text: "Dạ đúng ạ, ký gửi không có phí dịch vụ mua hộ 5%, chỉ tính cước theo cân nặng quy đổi thôi.",
      },
      {
        at: 24,
        from: "customer",
        text: "Rõ rồi, cảm ơn bạn nhiều.",
      },
    ],
  }),

  createConversation({
    seed: "14",
    title: "Đã nhận hàng đầy đủ",
    relatedType: "CONSIGNMENT",
    relatedCode: "VCL-20260712105447-295805",
    staff: CHAT_STAFF.tran,
    status: "CLOSED",
    unreadCount: 0,
    createdAt: "2026-07-19T06:30:00Z",
    script: [
      {
        at: 0,
        from: "staff",
        text: "Dạ shipper báo đã giao xong đơn cho chị lúc 13h20 ạ, chị kiểm tra giúp em nhé.",
      },
      {
        at: 55,
        from: "customer",
        text: "Mình nhận đủ 3 kiện, hàng nguyên vẹn. Cảm ơn cả nhà.",
      },
      {
        at: 62,
        from: "staff",
        text: "Dạ em cảm ơn chị, mong được phục vụ chị lần sau ạ.",
      },
    ],
  }),
];

/* =========================================================
   TRUY VẤN TIỆN DỤNG
   ========================================================= */

const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

/**
 * Tìm hội thoại theo id.
 *
 * @param {string} conversationId
 * @returns {object | null}
 */
export const findConversationById = (conversationId) => {
  const key = normalizeKey(conversationId);

  if (!key) {
    return null;
  }

  return (
    conversations.find(
      (conversation) => normalizeKey(conversation.id) === key
    ) || null
  );
};

/**
 * Đổi relatedId (GUID lấy từ dropdown) ra mã đơn để hiển thị.
 *
 * getConversationSubtitle() ưu tiên relatedCode; thiếu nó thì phụ đề rơi
 * xuống relatedId và người dùng nhìn thấy một chuỗi GUID thay vì mã đơn.
 *
 * @param {string} relatedType
 * @param {string} relatedId
 * @returns {string}
 */
export const resolveRelatedCodeById = (relatedType, relatedId) => {
  const id = String(relatedId ?? "").trim();

  if (!id) {
    return "";
  }

  if (relatedType === "CONSIGNMENT") {
    return findConsignmentById(id)?.consignmentCode || id;
  }

  if (relatedType === "PURCHASE_REQUEST") {
    return findPurchaseRequestById(id)?.purchaseCode || id;
  }

  return id;
};

/**
 * Tìm hội thoại đang gắn với một đơn hàng cụ thể.
 *
 * @param {string} relatedType
 * @param {string} relatedId
 * @returns {object | null}
 */
export const findConversationByRelated = (relatedType, relatedId) => {
  const typeKey = normalizeKey(relatedType);
  const idKey = normalizeKey(relatedId);

  if (!typeKey || !idKey) {
    return null;
  }

  return (
    conversations.find(
      (conversation) =>
        normalizeKey(conversation.relatedType) === typeKey &&
        normalizeKey(conversation.relatedId) === idKey
    ) || null
  );
};

export default conversations;
