/* =========================================================
   aiOrderIntentApi.js — BẢN MOCK (UI-only build)

   Tầng HTTP thật đã bị gỡ; file này chỉ dựng lại dữ liệu mẫu để màn hình
   chạy được mà KHÔNG phải sửa một dòng nào trong component.

   Cắm API thật trở lại: thay thân hàm extractOrderIntentApi bên dưới bằng
   `axiosInstance.post("/api/ai/customer/extract-order-intent", payload)` và
   giữ nguyên `return response?.data ? response.data : response;` —
   chữ ký hàm và hình dạng trả về ở đây đã bám đúng bản gốc.
   ========================================================= */

import {
  delay,
  deepClone,
  makeOrderCode,
  newUuid,
  normalizeText,
  nowIso,
} from "@/mocks/mockUtils";

import consignments, { MOCK_CUSTOMER } from "@/mocks/data/consignments";
import purchaseRequests from "@/mocks/data/purchaseRequests";
import catalog from "@/mocks/data/catalog";

/* =========================================================
   DANH MỤC THAM CHIẾU
   ========================================================= */

const routes = catalog?.consignmentRoutes || [];
const shippingOptions = catalog?.shippingOptions || [];
const restrictedItems = catalog?.restrictedItems || [];

/*
 * AI Agent thật trả về mã tuyến theo quy ước riêng ("CN-VN-ROAD"), không
 * trùng code trong danh mục ("CHINA_VIETNAM"). Bảng này giữ đúng cầu nối đó
 * để giá trị mặc định của tham số preferredShippingRoute vẫn tra ra tuyến.
 */
const ROUTE_CODE_ALIASES = {
  "CN-VN-ROAD": "CHINA_VIETNAM",
  "CN-VN-LAOCAI": "CHINA_VIETNAM_LAOCAI",
  "CN-VN-MONGCAI": "CHINA_VIETNAM_MONGCAI",
  "CN-VN-SEA": "CHINA_VIETNAM_SEA",
  "KR-VN-AIR": "KOREA_VIETNAM",
};

/* Từ khoá quyết định loại đơn. Mua hộ và ký gửi dùng hai form khác nhau. */
const PURCHASE_KEYWORDS = [
  "mua ho",
  "mua giup",
  "dat mua",
  "dat hang ho",
  "order ho",
  "order giup",
  "san pham tren",
  "taobao",
  "1688",
  "tmall",
  "pinduoduo",
  "alibaba",
  "link san pham",
];

const CONSIGNMENT_KEYWORDS = [
  "ky gui",
  "gui hang",
  "gui kien",
  "kien hang",
  "van chuyen ho",
  "hang da mua",
  "ma van don noi dia",
  "kho quang chau",
  "kho trung quoc",
  "nhap kho",
];

/* Từ khoá dịch vụ bổ sung — khách hay nói bằng lời thay vì tick chọn. */
const SERVICE_KEYWORDS = {
  requiresInspection: ["kiem hang", "kiem tra hang", "check hang", "soi hang"],
  requiresPacking: ["dong goi", "boc lot", "quan mang"],
  requiresWoodenCrate: ["thung go", "dong thung", "de vo", "gom su", "thuy tinh"],
  requiresInsurance: ["bao hiem", "hang gia tri cao", "den bu"],
};

/* Từ khoá gợi ý hàng cấm, tra ngược về danh mục restricted-items. */
const RESTRICTED_KEYWORDS = {
  BATTERY_LITHIUM: ["pin", "ac quy", "sac du phong", "pin lithium"],
  FLAMMABLE_LIQUID: ["xang", "con", "dung moi", "nuoc hoa"],
  COMPRESSED_GAS: ["binh gas", "khi nen", "binh oxy", "binh cuu hoa"],
  EXPLOSIVE: ["phao", "thuoc no", "kip no"],
  WEAPON: ["sung", "dao gam", "roi dien", "cong cu ho tro"],
  NARCOTICS: ["ma tuy", "chat kich thich"],
  COUNTERFEIT_GOODS: ["hang nhai", "hang gia", "fake", "rep 1:1"],
};

/* =========================================================
   HELPER
   ========================================================= */

const includesAny = (haystack, keywords = []) =>
  keywords.some((keyword) => haystack.includes(keyword));

/**
 * Băm chuỗi thành số dương.
 *
 * Cùng một câu hỏi phải luôn cho ra cùng một bản nháp, nếu không người dùng
 * gõ lại y hệt câu cũ lại thấy đơn hàng khác — trông như AI đoán bừa.
 */
const hashOf = (value) => {
  const text = String(value || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 2147483647;
  }

  return hash;
};

/** customerId lấy từ phiên đăng nhập, giữ nguyên logic dò khoá của bản gốc. */
const resolveCustomerId = () => {
  const userStr =
    sessionStorage.getItem("user") || localStorage.getItem("user");

  if (!userStr) {
    return undefined;
  }

  try {
    const user = JSON.parse(userStr);

    return user.userId || user.id || user.customerId;
  } catch {
    /* ignore JSON parse error */
    return undefined;
  }
};

/** Tra tuyến theo mã AI, mã danh mục hoặc tên tuyến; luôn có tuyến mặc định. */
const resolveRoute = (preferredShippingRoute, normalizedMessage) => {
  const raw = String(preferredShippingRoute || "").trim().toUpperCase();

  const aliased = ROUTE_CODE_ALIASES[raw] || raw;

  const byCode = routes.find(
    (route) =>
      String(route.code).toUpperCase() === aliased ||
      String(route.value).toUpperCase() === aliased ||
      String(route.id).toUpperCase() === aliased
  );

  if (byCode) {
    return byCode;
  }

  /* Không có mã hợp lệ thì đoán theo cửa khẩu khách nhắc trong câu hỏi. */
  if (normalizedMessage.includes("lao cai")) {
    return routes.find((route) => route.code === "CHINA_VIETNAM_LAOCAI") || routes[0];
  }

  if (normalizedMessage.includes("mong cai")) {
    return routes.find((route) => route.code === "CHINA_VIETNAM_MONGCAI") || routes[0];
  }

  if (normalizedMessage.includes("duong bien") || normalizedMessage.includes("tau bien")) {
    return routes.find((route) => route.code === "CHINA_VIETNAM_SEA") || routes[0];
  }

  return routes.find((route) => route.code === "CHINA_VIETNAM") || routes[0] || null;
};

/** Hình thức vận chuyển suy ra từ mức độ gấp mà khách mô tả. */
const resolveShippingOption = (normalizedMessage, route) => {
  const pickByCode = (code) =>
    shippingOptions.find((option) => option.code === code);

  if (includesAny(normalizedMessage, ["gap", "hoa toc", "nhanh nhat", "urgent"])) {
    return pickByCode("EXPRESS") || shippingOptions[0] || null;
  }

  /*
   * Tuyến biển bắt buộc đi hình thức biển: để lệch thì bản nháp nói tuyến
   * Thâm Quyến - Hải Phòng mà thời gian dự kiến lại là 4 - 6 ngày đường bộ.
   */
  if (
    route?.code === "CHINA_VIETNAM_SEA" ||
    includesAny(normalizedMessage, ["duong bien", "tau bien", "container"])
  ) {
    return pickByCode("SEA") || shippingOptions[0] || null;
  }

  if (includesAny(normalizedMessage, ["re nhat", "tiet kiem", "khong gap"])) {
    return pickByCode("ECONOMY") || shippingOptions[0] || null;
  }

  return pickByCode("STANDARD") || shippingOptions[0] || null;
};

/**
 * Chọn đơn mẫu để dựng bản nháp.
 *
 * Ưu tiên đơn có tên hàng khớp từ khoá khách gõ, để bản nháp trông đúng là
 * "AI đọc được câu của khách"; không khớp thì bốc tất định theo hash.
 */
const pickSourceOrder = (pool, normalizedMessage) => {
  if (!pool.length) {
    return null;
  }

  const matched = pool.find((order) =>
    (order.items || []).some((item) => {
      const productName = normalizeText(item.productName);

      /* Chỉ so những từ đủ dài, tránh "va", "cho" khớp bừa mọi thứ. */
      return productName
        .split(/\s+/)
        .filter((word) => word.length >= 4)
        .some((word) => normalizedMessage.includes(word));
    })
  );

  return matched || pool[hashOf(normalizedMessage) % pool.length];
};

/** Dịch vụ bổ sung khách nhắc tới trong câu hỏi. */
const detectOptionalServices = (normalizedMessage, sourceOrder) => ({
  requiresInspection:
    includesAny(normalizedMessage, SERVICE_KEYWORDS.requiresInspection) ||
    Boolean(sourceOrder?.requiresInspection),
  requiresPacking:
    includesAny(normalizedMessage, SERVICE_KEYWORDS.requiresPacking) ||
    Boolean(sourceOrder?.requiresPacking),
  requiresWoodenCrate:
    includesAny(normalizedMessage, SERVICE_KEYWORDS.requiresWoodenCrate) ||
    Boolean(sourceOrder?.requiresWoodenCrate),
  requiresInsurance:
    includesAny(normalizedMessage, SERVICE_KEYWORDS.requiresInsurance) ||
    Boolean(sourceOrder?.requiresInsurance),
});

/** Cảnh báo hàng cấm — chatbot phải chặn trước khi khách mất công tạo đơn. */
const detectRestrictedWarnings = (normalizedMessage) => {
  const matchedCodes = Object.entries(RESTRICTED_KEYWORDS)
    .filter(([, keywords]) => includesAny(normalizedMessage, keywords))
    .map(([code]) => code);

  return restrictedItems
    .filter((item) => matchedCodes.includes(item.code))
    .map((item) => ({
      code: item.code,
      name: item.restrictedItemName,
      category: item.category,
      description: item.description,
    }));
};

/** Loại đơn khách đang muốn tạo. */
const detectOrderType = (normalizedMessage, originalMessage) => {
  const hasLink = /https?:\/\//i.test(String(originalMessage || ""));

  const purchaseScore =
    (includesAny(normalizedMessage, PURCHASE_KEYWORDS) ? 1 : 0) + (hasLink ? 1 : 0);

  const consignmentScore = includesAny(normalizedMessage, CONSIGNMENT_KEYWORDS) ? 1 : 0;

  if (purchaseScore > consignmentScore) {
    return { orderType: "PURCHASE_REQUEST", score: purchaseScore };
  }

  if (consignmentScore > 0) {
    return { orderType: "CONSIGNMENT", score: consignmentScore };
  }

  return { orderType: "UNKNOWN", score: 0 };
};

const ORDER_TYPE_LABELS = {
  CONSIGNMENT: "Ký gửi hàng hoá",
  PURCHASE_REQUEST: "Mua hộ hàng quốc tế",
  UNKNOWN: "Chưa xác định",
};

const CREATE_URLS = {
  CONSIGNMENT: "/consignment/create",
  PURCHASE_REQUEST: "/purchase-request/create",
  UNKNOWN: null,
};

/* Số tiền ước tính của bản nháp ký gửi: chỉ cần giá trị khai báo là đủ. */
const sumBy = (rows, getValue) =>
  rows.reduce((total, row) => total + (Number(getValue(row)) || 0), 0);

/* =========================================================
   API MOCK
   ========================================================= */

/**
 * Trích xuất ý định tạo đơn hàng (Ký gửi hoặc Mua hộ) bằng AI Agent — BẢN MOCK.
 *
 * Endpoint gốc: POST /api/ai/customer/extract-order-intent
 * Bản gốc trả về `response.data` (đã bóc envelope của axios), nên mock cũng
 * trả thẳng object dữ liệu — KHÔNG bọc thêm một lớp `{ data }` nào nữa.
 *
 * Object trả về vừa có `intent` lồng trong, vừa trải phẳng các field ra ngoài:
 * chỗ gọi có thể đọc `result.orderType` hay `result.intent.orderType` đều ra
 * cùng giá trị, khỏi phải sửa component khi cắm lại API thật.
 *
 * @param {string} message câu khách vừa nhắn cho trợ lý
 * @param {string} [preferredShippingRoute] mã tuyến ưu tiên, mặc định CN-VN-ROAD
 * @returns {Promise<object>}
 */
export const extractOrderIntentApi = async (
  message,
  preferredShippingRoute = "CN-VN-ROAD"
) => {
  try {
    const customerId = resolveCustomerId();

    const originalMessage = String(message || "").trim();
    const normalizedMessage = normalizeText(originalMessage);

    /* Vẫn chờ một nhịp để trạng thái "đang soạn..." của chatbot kịp hiện. */
    await delay();

    const { orderType, score } = detectOrderType(
      normalizedMessage,
      originalMessage
    );

    const route = resolveRoute(preferredShippingRoute, normalizedMessage);
    const shippingOption = resolveShippingOption(normalizedMessage, route);

    const pool =
      orderType === "PURCHASE_REQUEST" ? purchaseRequests : consignments;

    const sourceOrder =
      orderType === "UNKNOWN" ? null : pickSourceOrder(pool, normalizedMessage);

    /* Tối đa 3 dòng hàng: bản nháp chỉ để khách xem trước rồi bấm tạo đơn. */
    const items = deepClone((sourceOrder?.items || []).slice(0, 3));

    const optionalServices = detectOptionalServices(
      normalizedMessage,
      sourceOrder
    );

    const restrictedWarnings = detectRestrictedWarnings(normalizedMessage);

    const totalQuantity = sumBy(items, (item) => item.quantity);

    const totalWeight =
      orderType === "CONSIGNMENT"
        ? Math.round(sumBy(items, (item) => item.weight) * 100) / 100
        : null;

    /*
     * Mua hộ ước tính theo tiền hàng (số lượng × đơn giá), ký gửi ước tính
     * theo giá trị khai báo — đúng hai cách tính của hai loại đơn.
     */
    const estimatedTotalAmount =
      orderType === "PURCHASE_REQUEST"
        ? sumBy(items, (item) => (item.unitPrice || 0) * (item.quantity || 0))
        : sumBy(items, (item) => item.declaredValue);

    /* Field còn thiếu để chatbot biết phải hỏi tiếp điều gì. */
    const missingFields = [
      !sourceOrder?.receiverName && "receiverName",
      !sourceOrder?.receiverPhone && "receiverPhone",
      !sourceOrder?.receiverAddress && "receiverAddress",
      items.length === 0 && "items",
    ].filter(Boolean);

    const hasIntent = orderType !== "UNKNOWN" && items.length > 0;

    /* Độ tin cậy: có từ khoá rõ + bóc được hàng thì cao, mơ hồ thì thấp. */
    const confidence = hasIntent
      ? Math.min(0.95, 0.68 + score * 0.12 + (missingFields.length ? 0 : 0.08))
      : 0.31;

    const orderCodePrefix =
      orderType === "PURCHASE_REQUEST" ? "PUR" : "VCL";

    const suggestedReply = hasIntent
      ? `Em đã bóc tách được yêu cầu ${ORDER_TYPE_LABELS[orderType].toLowerCase()} với ${items.length} dòng hàng, đi tuyến ${route?.routeName || "Trung Quốc → Việt Nam"} (${shippingOption?.name || "Tiêu chuẩn"}). Anh/chị kiểm tra lại bản nháp rồi bấm "Tạo đơn" giúp em nhé.`
      : "Em chưa rõ anh/chị muốn ký gửi hàng đã mua hay nhờ bên em mua hộ. Anh/chị mô tả thêm tên hàng, số lượng hoặc gửi link sản phẩm giúp em nhé.";

    const followUpQuestions = hasIntent
      ? [
          "Anh/chị xác nhận thông tin người nhận đã đúng chưa?",
          "Có cần thêm dịch vụ kiểm hàng hoặc đóng thùng gỗ không?",
        ]
      : [
          "Anh/chị muốn ký gửi hàng có sẵn hay nhờ mua hộ?",
          "Anh/chị gửi giúp em tên hàng và số lượng dự kiến?",
        ];

    const intent = {
      intentId: newUuid(),

      orderType,
      /* Alias: vài chỗ đọc intentType thay vì orderType. */
      intentType: orderType,
      orderTypeName: ORDER_TYPE_LABELS[orderType],

      hasIntent,
      isSupported: orderType !== "UNKNOWN",
      confidence: Math.round(confidence * 100) / 100,
      confidencePercent: Math.round(confidence * 100),
      language: "vi",

      /* Câu gốc của khách, giữ cả tên rút gọn lẫn tên đầy đủ. */
      message: originalMessage,
      originalMessage,
      rawMessage: originalMessage,

      customerId: customerId || MOCK_CUSTOMER.customerId,
      customer: { ...MOCK_CUSTOMER },
      customerName: MOCK_CUSTOMER.fullName,

      preferredShippingRoute,
      routeId: route?.id || null,
      routeCode: route?.code || null,
      routeName: route?.routeName || null,
      route: route ? deepClone(route) : null,

      shippingOptionId: shippingOption?.id || null,
      shippingOptionCode: shippingOption?.code || null,
      shippingOptionName: shippingOption?.name || null,
      shippingOption: shippingOption ? deepClone(shippingOption) : null,

      estimatedDays:
        shippingOption?.estimatedDays || route?.estimatedDays || null,

      receiverName: sourceOrder?.receiverName || null,
      receiverPhone: sourceOrder?.receiverPhone || null,
      receiverAddress: sourceOrder?.receiverAddress || null,
      receiver: sourceOrder
        ? {
            receiverName: sourceOrder.receiverName,
            receiverPhone: sourceOrder.receiverPhone,
            receiverAddress: sourceOrder.receiverAddress,
          }
        : null,

      items,
      itemCount: items.length,
      totalQuantity,
      totalWeight,
      estimatedTotalAmount,
      /* Alias tiền tệ: bảng tổng của form nháp đọc theo tên này. */
      estimatedTotalCost: estimatedTotalAmount,
      currency: "VND",

      ...optionalServices,
      optionalServices,

      destinationHandling:
        sourceOrder?.defaultDestinationHandling || "DIRECT_DELIVERY",

      note: sourceOrder?.note || sourceOrder?.generalNote || "",

      /* Mã đơn gợi ý theo đúng format backend, để khách nhìn thấy quen mắt. */
      suggestedOrderCode: hasIntent
        ? makeOrderCode(orderCodePrefix, new Date())
        : null,

      createUrl: CREATE_URLS[orderType],
      redirectUrl: CREATE_URLS[orderType],

      missingFields,
      needsMoreInfo: missingFields.length > 0 || !hasIntent,

      restrictedWarnings,
      warnings: restrictedWarnings.map(
        (item) => `${item.name} thuộc nhóm ${item.category}, bên em không nhận vận chuyển.`
      ),
      hasRestrictedItem: restrictedWarnings.length > 0,

      suggestedReply,
      followUpQuestions,

      extractedAt: nowIso(),
      createdAt: nowIso(),
    };

    return {
      /*
       * Trải phẳng trước, khoá của envelope ghi đè sau: `message` ở tầng
       * ngoài là câu trả lời của trợ lý (chatbot render thẳng field này),
       * còn câu gốc của khách vẫn đọc được ở originalMessage / rawMessage.
       */
      ...intent,

      success: true,
      statusCode: 200,
      message: suggestedReply,

      /* Cùng một object ở ba tên gọi, phòng chỗ gọi đọc theo tên nào. */
      intent,
      data: intent,
      result: intent,
    };
  } catch (error) {
    console.error("Lỗi bóc tách ý định tạo đơn hàng bằng AI:", error);
    throw error;
  }
};
