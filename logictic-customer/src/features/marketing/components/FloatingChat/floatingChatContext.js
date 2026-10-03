/* =========================================================
   floatingChatContext.js — ngữ cảnh DỮ LIỆU THẬT cho trợ lý AI của khung chat nổi.

   Trước đây khung chat lấy bảng giá từ getServicePricings của pricingRuleService
   (vẫn đọc fixture @/mocks/data/catalog) và nhúng cứng danh mục hàng cấm / kho
   quốc tế trong prompt, nên AI có thể báo cho khách giá giả. Nay mọi số liệu đều
   đọc từ API thật:

   Công khai (khách vãng lai cũng gọi được, không gắn token thì backend vẫn trả 200):
     GET /api/service-pricings                       → bảng giá cước (getServicePricingsApi),
         chọn dòng đang / sắp áp dụng bằng buildCustomerPriceList — CÙNG cách và CÙNG
         định dạng ("80.000 đ/kg") với trang "Chính sách dịch vụ";
     GET /api/pricing-rules?orderType=CONSIGNMENT    → hệ số DIM + cân tối thiểu
         (getWeightPricingParams, như ghi chú cách tính trên trang đó);
     GET /api/orders/consignments/item-services      → phụ phí dịch vụ theo kiện;
     GET /api/additional-service-fees                → tỷ lệ cọc ký gửi (getDepositRate);
     GET /api/orders/consignments/routes | shipping-options → tuyến + phương án.
   Cần đăng nhập (chỉ gọi khi có accessToken; backend chỉ trả dữ liệu của chính khách):
     GET /api/restricted-items, GET /api/orders/consignments, GET /api/purchase-requests.

   Tải lười (khi mở khung chat / gửi tin đầu), cache trong phiên 5 phút. Phần riêng
   của khách cache theo token — đổi tài khoản là tải lại, không lộ đơn người trước.
   Lỗi tải KHÔNG bao giờ rơi về số mẫu: ngữ cảnh ghi rõ "không tải được" và buộc AI
   hướng khách sang trang "Chính sách dịch vụ" hoặc CSKH.
   ========================================================= */

import { BRAND } from "@shared/constants/homeData";
import { getServicePricingsApi } from "@features/pricing/api/servicePricingService";
import {
  buildCustomerPriceList,
  formatBoxRule,
  getServiceLabel,
  PRICE_STATUS,
} from "@features/service-policy/utils/servicePricingTable";
import {
  getDepositRate,
  getWeightPricingParams,
} from "@features/pricing/api/pricingRuleService";
import {
  getConsignmentItemServicesApi,
  getConsignmentRoutesApi,
  getConsignmentShippingOptionsApi,
  getConsignmentsApi,
} from "@features/consignment/api/consignmentApi";
import { getOrderStatusLabel } from "@features/consignment/constants/orderStatus";
import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";
import { getPurchaseStatusLabel } from "@features/purchase/constants/purchaseStages";
import { getRestrictedItemListApi } from "@shared/api/restrictedItemApi";
import { getPaymentStatusLabel, textOr } from "@shared/utils/statusLabel";

/* Cache trong phiên: dữ liệu tải đủ giữ 5 phút; lần tải có phần lỗi chỉ giữ 30 giây để thử lại sớm. */
export const CHAT_CONTEXT_TTL_MS = 5 * 60 * 1000;
export const CHAT_CONTEXT_RETRY_TTL_MS = 30 * 1000;

export const SERVICE_POLICY_PAGE_NAME = "Chính sách dịch vụ";

export const PRICE_SECTION_TITLE =
  "BẢNG GIÁ CƯỚC VẬN CHUYỂN CHÍNH THỨC HIỆN HÀNH (lấy trực tiếp từ hệ thống, trùng với trang \"Chính sách dịch vụ\")";

export const PRICE_UNAVAILABLE_TITLE =
  "BẢNG GIÁ CƯỚC VẬN CHUYỂN: HIỆN KHÔNG TẢI ĐƯỢC TỪ HỆ THỐNG";

const CSKH_CONTACT = `CSKH (hotline ${BRAND.hotline}, email ${BRAND.email})`;

/** Câu khách nhận được khi không có bảng giá thật — dùng chung cho prompt và trả lời dự phòng. */
export const PRICE_UNAVAILABLE_REPLY =
  `Hiện hệ thống chưa lấy được bảng giá cước hiện hành nên tôi chưa thể báo giá chính xác. ` +
  `Quý khách vui lòng xem trang "${SERVICE_POLICY_PAGE_NAME}" (sau khi đăng nhập) hoặc liên hệ ${CSKH_CONTACT} để được báo giá.`;

const ORDER_LIST_SIZE = 30;
const ORDER_LINES_LIMIT = 8;
const RESTRICTED_LINES_LIMIT = 30;

/* =========================================================
   HELPERS
   ========================================================= */

const readAccessToken = () => {
  for (const name of ["sessionStorage", "localStorage"]) {
    try {
      const token = globalThis[name]?.getItem("accessToken");
      if (token) return token;
    } catch {
      /* Storage bị chặn thì thử storage kế tiếp. */
    }
  }
  return "";
};

const settle = async (factory) => {
  try {
    return { ok: true, value: await factory() };
  } catch (error) {
    return { ok: false, error };
  }
};

const text = (value) => String(value ?? "").trim();

const formatNumber = (value, maximumFractionDigits = 2) =>
  Number(value).toLocaleString("vi-VN", { maximumFractionDigits });

const formatVndAmount = (value) => `${formatNumber(Math.round(Number(value)), 0)} đ`;

const formatTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(time));

/* "Trung quốc --> Việt Nam" (chuỗi backend trả) → "Trung quốc → Việt Nam". */
const formatRouteName = (route) => {
  const raw = typeof route === "string" ? route : route?.routeName || route?.name || route?.route;
  return text(raw).replace(/\s*-+>\s*/g, " → ");
};

const formatShippingOption = (option) => {
  const raw = typeof option === "string" ? option : option?.code || option?.name || option?.shippingOptionName;
  return getServiceLabel(raw);
};

const extractArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.consignments)) return value.consignments;
  if (Array.isArray(value.purchaseRequests)) return value.purchaseRequests;
  if (Array.isArray(value.data?.items)) return value.data.items;
  if (Array.isArray(value.data)) return value.data;
  return [];
};

const totalOf = (page, list) => {
  if (typeof page?.totalCount === "number") return page.totalCount;
  if (typeof page?.total === "number") return page.total;
  return list.length;
};

/* =========================================================
   BẢNG GIÁ — cùng nguồn + cùng logic chọn dòng với trang "Chính sách dịch vụ"
   ========================================================= */

/**
 * Dòng bảng giá cho AI, đúng thứ tự / nhãn / đơn giá mà trang "Chính sách dịch vụ" hiển thị.
 *
 * @param {Array} pricings Kết quả getServicePricingsApi (đã normalizeServicePricing).
 * @returns {{ lines: string[], currentCount: number, rows: Array }}
 */
export const buildPriceListLines = (pricings = [], { now = Date.now() } = {}) => {
  const { groups, rows, stats } = buildCustomerPriceList(pricings, { now });
  const lines = [];

  groups.forEach((group) => {
    lines.push(`${group.label}:`);

    group.rows.forEach((row) => {
      const { view } = row;
      const weight = view.weightLabel && view.weightLabel !== "—" ? ` · ${view.weightLabel}` : "";
      const status =
        view.status === PRICE_STATUS.UPCOMING
          ? `${view.statusLabel.toUpperCase()} từ ${view.effectiveLabel}, CHƯA áp dụng hôm nay`
          : `${view.statusLabel} từ ${view.effectiveLabel}`;

      lines.push(`- ${view.serviceLabel}${weight}: ${view.priceLabel} (${status})`);

      (Array.isArray(row.boxPricingRules) ? row.boxPricingRules : [])
        .filter((rule) => !rule?.status || String(rule.status).toUpperCase() === "ACTIVE")
        .map(formatBoxRule)
        .forEach((rule) => lines.push(`    + Phụ phí kèm theo: ${rule.name} ${rule.value}`));
    });
  });

  return { lines, currentCount: stats.total, rows };
};

const buildPriceSection = (pricesResult, weightResult, { now }) => {
  const priceList = pricesResult.ok
    ? buildPriceListLines(pricesResult.value, { now })
    : { lines: [], currentCount: 0 };

  if (!pricesResult.ok || priceList.currentCount === 0) {
    return {
      ok: false,
      lines: [],
      text: [
        `--- ${PRICE_UNAVAILABLE_TITLE} ---`,
        "KHÔNG có bảng giá thật trong ngữ cảnh này. Khi khách hỏi giá, cước, phí vận chuyển:",
        `- BẮT BUỘC trả lời đúng ý: "${PRICE_UNAVAILABLE_REPLY}"`,
        "- TUYỆT ĐỐI KHÔNG đưa ra bất kỳ con số giá / cước / phí nào, kể cả \"tham khảo\" hay \"khoảng\".",
      ].join("\n"),
    };
  }

  const formula = weightResult.ok
    ? `Cách tính: cân tính cước = max(cân thực, cân quy đổi thể tích D×R×C/${weightResult.value.volumetricDivisor}), tối thiểu ${formatNumber(weightResult.value.minimumWeight)} kg. Đơn giá chưa gồm phụ phí dịch vụ (đóng gói, kiểm hàng, bảo hiểm…) và thuế.`
    : "Cách tính: chưa tải được hệ số quy đổi thể tích và cân tối thiểu — KHÔNG tự tạm tính cước theo kích thước, chỉ báo đơn giá và mời khách xem trang \"Chính sách dịch vụ\".";

  return {
    ok: true,
    lines: priceList.lines,
    text: [`--- ${PRICE_SECTION_TITLE} ---`, ...priceList.lines, formula].join("\n"),
  };
};

/* =========================================================
   PHỤ PHÍ / CỌC / TUYẾN
   ========================================================= */

const formatItemService = (service) => {
  const { value } = formatBoxRule({
    ruleName: service?.name,
    value: service?.value,
    calculationType: service?.calculationType,
  });
  const bounds = [
    Number(service?.minAmount) > 0 ? `tối thiểu ${formatVndAmount(service.minAmount)}` : "",
    Number(service?.maxAmount) > 0 ? `tối đa ${formatVndAmount(service.maxAmount)}` : "",
  ].filter(Boolean);
  const description = text(service?.description);

  return `- ${text(service?.name) || "Dịch vụ theo kiện"}: ${value}${bounds.length ? ` (${bounds.join(", ")})` : ""}${description ? ` — ${description}` : ""}`;
};

const buildFeeSection = (itemServicesResult, depositResult) => {
  const lines = ["--- PHỤ PHÍ DỊCH VỤ THEO KIỆN & ĐẶT CỌC (dữ liệu thật) ---"];

  if (itemServicesResult.ok && itemServicesResult.value.length > 0) {
    itemServicesResult.value.forEach((service) => lines.push(formatItemService(service)));
  } else {
    lines.push("- Chưa tải được danh sách phụ phí dịch vụ theo kiện: KHÔNG tự nêu mức phụ phí, mời khách liên hệ CSKH.");
  }

  if (depositResult.ok && Number.isFinite(Number(depositResult.value?.value))) {
    lines.push(
      `- Tỷ lệ đặt cọc đơn ký gửi: ${formatNumber(depositResult.value.value)}% giá trị báo giá (số tiền cọc chính xác hiện khi khách xác nhận báo giá).`,
    );
  } else {
    lines.push("- Chưa tải được tỷ lệ đặt cọc: KHÔNG tự nêu tỷ lệ cọc.");
  }

  return lines.join("\n");
};

const buildRouteSection = (routesResult, optionsResult) => {
  const routes = routesResult.ok ? routesResult.value.map(formatRouteName).filter(Boolean) : [];
  const options = optionsResult.ok ? optionsResult.value.map(formatShippingOption).filter(Boolean) : [];

  if (routes.length === 0 && options.length === 0) {
    return "--- TUYẾN VẬN CHUYỂN ---\n- Chưa tải được danh sách tuyến: KHÔNG tự liệt kê tuyến / kho, mời khách liên hệ CSKH.";
  }

  return [
    "--- TUYẾN & PHƯƠNG ÁN VẬN CHUYỂN ĐANG NHẬN ĐƠN KÝ GỬI (dữ liệu thật) ---",
    routes.length ? `- Tuyến: ${routes.join("; ")}` : "- Tuyến: chưa tải được.",
    options.length ? `- Phương án: ${options.join(", ")}` : "- Phương án: chưa tải được.",
    "- Địa chỉ kho nhận hàng ở nước ngoài hiển thị khi khách tạo đơn; KHÔNG tự đặt ra địa chỉ kho.",
  ].join("\n");
};

/* =========================================================
   PHẦN RIÊNG CỦA KHÁCH ĐÃ ĐĂNG NHẬP
   ========================================================= */

const buildRestrictedSection = (restrictedResult, { isGuest = false } = {}) => {
  const items = restrictedResult.ok ? restrictedResult.value : [];

  if (!items.length) {
    return [
      "--- DANH MỤC HÀNG CẤM / HẠN CHẾ ---",
      isGuest
        ? "- Danh mục chi tiết chỉ xem được sau khi đăng nhập (API cần đăng nhập): chỉ nói chung"
        : "- Chưa tải được danh mục chi tiết từ hệ thống: chỉ nói chung rằng hàng cấm theo quy định pháp luật và hàng nguy hiểm không được nhận;",
      "  KHÔNG tự liệt kê danh mục chi tiết, mời khách đăng nhập để xem cảnh báo khi tạo đơn hoặc liên hệ CSKH.",
    ].join("\n");
  }

  const lines = ["--- DANH MỤC HÀNG CẤM / HẠN CHẾ KÝ GỬI (dữ liệu thật) ---"];
  items.slice(0, RESTRICTED_LINES_LIMIT).forEach((item, index) => {
    const name = text(
      typeof item === "string"
        ? item
        : item?.restrictedItemName ?? item?.itemName ?? item?.name ?? item?.title,
    );
    const note = typeof item === "object" ? text(item?.description ?? item?.reason) : "";
    if (name) lines.push(`${index + 1}. ${name}${note ? ` — ${note}` : ""}`);
  });
  return lines.join("\n");
};

const formatOrderAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? formatVndAmount(amount) : "chưa có cước / báo giá";
};

const buildConsignmentLines = (result) => {
  if (!result.ok) {
    return [
      "1. ĐƠN KÝ GỬI: KHÔNG TẢI ĐƯỢC từ hệ thống — KHÔNG đoán số đơn; mời khách xem mục Đơn hàng.",
    ];
  }

  const list = extractArray(result.value);
  const total = totalOf(result.value, list);
  const lines = [`1. ĐƠN KÝ GỬI (tổng số đơn thật của khách: ${total} đơn):`];

  if (total === 0 || list.length === 0) {
    lines.push("   - Khách CHƯA CÓ đơn ký gửi nào trên hệ thống.");
    return lines;
  }

  list.slice(0, ORDER_LINES_LIMIT).forEach((item, index) => {
    const code = item.orderCode || item.code || item.consignmentCode || `KG-${index + 1}`;
    const name = item.productName || item.notes || "Hàng ký gửi";
    const tracking = item.chinaTrackingCode || item.trackingCode || "chưa có";
    const status = item.status ? getOrderStatusLabel(item.status) : textOr(item.statusName, "Đang xử lý");
    const fee = item.totalFee || item.totalShippingFee || item.totalAmount;
    lines.push(`   + Mã [${code}]: ${name} (mã vận đơn: ${tracking}), trạng thái: ${status}, cước: ${formatOrderAmount(fee)}`);
  });

  return lines;
};

const buildPurchaseLines = (result) => {
  if (!result.ok) {
    return [
      "2. ĐƠN MUA HỘ: KHÔNG TẢI ĐƯỢC từ hệ thống — KHÔNG đoán số đơn; mời khách xem mục Đơn hàng.",
    ];
  }

  const list = extractArray(result.value);
  const total = totalOf(result.value, list);
  const lines = [`2. ĐƠN MUA HỘ (tổng số đơn thật của khách: ${total} đơn):`];

  if (total === 0 || list.length === 0) {
    lines.push("   - Khách CHƯA CÓ đơn mua hộ nào trên hệ thống.");
    return lines;
  }

  list.slice(0, ORDER_LINES_LIMIT).forEach((item, index) => {
    const code = item.orderCode || item.code || item.purchaseRequestCode || `MH-${index + 1}`;
    const name = item.productName || item.title || "Hàng mua hộ";
    /* Chỉ đưa nhãn tiếng Việt vào ngữ cảnh AI — mã thô sẽ bị AI nhắc lại nguyên văn cho khách. */
    const status = item.status
      ? getPurchaseStatusLabel(item.status, item.statusName)
      : textOr(item.statusName, "Mới tạo");
    const payment =
      typeof item.paymentStatus === "string" && item.paymentStatus
        ? getPaymentStatusLabel(item.paymentStatus, item.paymentStatusName)
        : textOr(item.paymentStatusName, "Chưa có thông tin thanh toán");
    const amount = item.totalAmount || item.totalPriceVnd || item.depositAmount;
    lines.push(`   + Mã [${code}]: ${name} (SL: ${item.quantity || 1}), trạng thái: ${status}, thanh toán: ${payment}, số tiền: ${formatOrderAmount(amount)}`);
  });

  return lines;
};

const loadCustomerSection = async () => {
  const [restricted, consignments, purchases] = await Promise.all([
    settle(() => getRestrictedItemListApi()),
    settle(() => getConsignmentsApi(1, ORDER_LIST_SIZE)),
    settle(() => getPurchaseRequestsApi(1, ORDER_LIST_SIZE)),
  ]);

  return {
    complete: restricted.ok && consignments.ok && purchases.ok,
    restrictedText: buildRestrictedSection(restricted),
    ordersText: [
      "--- ĐƠN HÀNG THẬT CỦA CHÍNH KHÁCH ĐANG ĐĂNG NHẬP (chỉ dùng để trả lời chính khách này) ---",
      ...buildConsignmentLines(consignments),
      ...buildPurchaseLines(purchases),
    ].join("\n"),
  };
};

/* =========================================================
   PHẦN CÔNG KHAI
   ========================================================= */

const loadPublicSection = async ({ now }) => {
  const [prices, weight, itemServices, deposit, routes, options] = await Promise.all([
    settle(() => getServicePricingsApi()),
    settle(() => getWeightPricingParams()),
    settle(() => getConsignmentItemServicesApi()),
    settle(() => getDepositRate()),
    settle(() => getConsignmentRoutesApi()),
    settle(() => getConsignmentShippingOptionsApi()),
  ]);

  const price = buildPriceSection(prices, weight, { now });

  return {
    complete: [prices, weight, itemServices, deposit, routes, options].every((r) => r.ok) && price.ok,
    pricesOk: price.ok,
    priceLines: price.lines,
    text: [
      price.text,
      buildFeeSection(itemServices, deposit),
      buildRouteSection(routes, options),
    ].join("\n\n"),
  };
};

/* =========================================================
   CACHE + API CỦA MODULE
   ========================================================= */

let publicCache = null; // { promise, expiresAt }
let customerCache = null; // { token, promise, expiresAt }

const remember = (entry, promise, isComplete, getNow) => {
  entry.promise = promise;
  entry.expiresAt = Infinity; // đang tải: mọi lời gọi dùng chung promise này
  promise.then(
    (value) => {
      entry.expiresAt = getNow() + (isComplete(value) ? CHAT_CONTEXT_TTL_MS : CHAT_CONTEXT_RETRY_TTL_MS);
    },
    () => {
      entry.expiresAt = 0; // lỗi ngoài dự kiến: lần sau tải lại ngay
    },
  );
  return entry;
};

/** Xoá cache (đăng xuất, test). */
export const resetFloatingChatContextCache = () => {
  publicCache = null;
  customerCache = null;
};

/**
 * Ngữ cảnh dữ liệu thật cho AI. Không bao giờ reject: phần nào lỗi thì ghi "không tải
 * được" kèm chỉ dẫn, không thay bằng số mẫu.
 *
 * @param {{ now?: number }} [options] `now` chỉ để test (mốc chọn dòng đang áp dụng + TTL).
 * @returns {Promise<{ text: string, pricesOk: boolean, priceLines: string[], isLoggedIn: boolean }>}
 */
export const loadFloatingChatContext = async ({ now } = {}) => {
  const getNow = () => (typeof now === "number" ? now : Date.now());
  const token = readAccessToken();

  if (!publicCache || publicCache.expiresAt <= getNow()) {
    publicCache = remember(
      {},
      loadPublicSection({ now: getNow() }),
      (value) => value.complete,
      getNow,
    );
  }

  if (!token) {
    customerCache = null;
  } else if (!customerCache || customerCache.token !== token || customerCache.expiresAt <= getNow()) {
    customerCache = remember({ token }, loadCustomerSection(), (value) => value.complete, getNow);
  }

  const [publicPart, customerPart] = await Promise.all([
    publicCache.promise.catch(() => ({
      text: buildPriceSection({ ok: false }, { ok: false }, { now: getNow() }).text,
      pricesOk: false,
      priceLines: [],
    })),
    token ? customerCache.promise.catch(() => null) : Promise.resolve(null),
  ]);

  const sections = [
    `=== DỮ LIỆU THẬT TỪ HỆ THỐNG ${BRAND.name} (lấy lúc ${formatTimestamp(getNow())}) ===`,
    publicPart.text,
    customerPart ? customerPart.restrictedText : buildRestrictedSection({ ok: false }, { isGuest: !token }),
  ];

  if (customerPart) sections.push(customerPart.ordersText);

  return {
    text: sections.join("\n\n"),
    pricesOk: publicPart.pricesOk,
    priceLines: publicPart.priceLines,
    isLoggedIn: Boolean(token),
  };
};

/* =========================================================
   TRẢ LỜI DỰ PHÒNG KHI CHƯA CẤU HÌNH AI (không có VITE_CODEX_ENDPOINT)
   ========================================================= */

const PRICE_KEYWORDS = ["gia", "cuoc", "phi", "bao nhieu", "chi phi", "tinh tien"];

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/**
 * Thay kịch bản mẫu (@/mocks/aiAssistant có giá giả 32.000 đ/kg…): hỏi giá thì in đúng
 * bảng giá thật; không có bảng giá thì báo không lấy được; câu khác thì mời liên hệ CSKH.
 */
export const buildOfflineReply = (question, context) => {
  const folded = fold(question);

  if (PRICE_KEYWORDS.some((keyword) => folded.includes(keyword))) {
    if (!context?.pricesOk || !context.priceLines?.length) {
      return PRICE_UNAVAILABLE_REPLY;
    }

    return [
      "Bảng giá cước chính thức hiện hành:",
      ...context.priceLines,
      `Chi tiết xem trang "${SERVICE_POLICY_PAGE_NAME}". Đơn giá chưa gồm phụ phí dịch vụ và thuế.`,
    ].join("\n");
  }

  return `Trợ lý AI tạm thời chưa sẵn sàng. Quý khách vui lòng liên hệ ${CSKH_CONTACT} để được hỗ trợ.`;
};
