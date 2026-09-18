/* =========================================================
   purchaseRequestApi.js — BẢN MOCK cho build UI-only.

   Tầng HTTP thật (axiosInstance + @shared/api/httpClient) đã bị gỡ khỏi dự án,
   nên module này đọc dữ liệu mẫu trong src/mocks/data thay vì gọi server.
   Tên hàm, thứ tự tham số, alias và SHAPE trả về giữ y hệt bản gọi API thật
   để KHÔNG component nào phải sửa một dòng.

   Cắm API thật trở lại: mỗi hàm đều có một dòng comment
   "API THẬT: axiosInstance...." ngay trước phần dựng dữ liệu — thay đúng chỗ đó
   bằng lời gọi axios rồi giữ nguyên `return response.data;` như chú thích.

   Phần validate payload (validatePurchaseRequest / buildPurchaseRequestPayload)
   được giữ nguyên bản gốc: màn tạo yêu cầu mua hộ dựa vào đúng những câu lỗi
   tiếng Việt này để hiện toast, bỏ đi là mất luôn phần kiểm tra đầu vào.
   ========================================================= */

import {
  deepClone,
  delay,
  makeOrderCode,
  newUuid,
  nextId,
  normalizeStatus,
  normalizeText as normalizeSearchText,
  nowIso,
  paginate,
} from "@/mocks/mockUtils";

import purchaseRequestStore, {
  findPurchaseRequestByCode,
  findPurchaseRequestById,
} from "@/mocks/data/purchaseRequests";

import consignmentStore, {
  MOCK_CUSTOMER,
} from "@/mocks/data/consignments";

import catalog from "@/mocks/data/catalog";

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

/*
 * Component truyền signal theo hai kiểu: { signal } hoặc AbortSignal trần,
 * nên helper phải nhận cả hai thì delay() mới hủy đúng lúc rời trang.
 */
const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const validateId = (
  value,
  errorMessage
) => {
  const id = normalizeText(value);

  if (!id) {
    throw new Error(errorMessage);
  }

  return id;
};

const validateAbsoluteUrl = (
  value,
  fieldLabel
) => {
  const url = normalizeText(value);

  if (!url) {
    throw new Error(
      `Vui lòng cung cấp ${fieldLabel}.`
    );
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      `${fieldLabel} phải là URL hợp lệ bắt đầu bằng http:// hoặc https://.`
    );
  }

  return url;
};

const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  if (
    error?.message === "Network Error" ||
    error?.code === "ERR_NETWORK"
  ) {
    return "Lỗi kết nối máy chủ (Network Error). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
  }

  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

/*
 * Lỗi mang đúng "chữ ký" của axios: nhiều màn đọc error.response.status
 * (404/405) và error.response.data để hiện thông báo.
 */
const createApiError = (status, message) => {
  const error = new Error(message);

  error.response = {
    status,
    data: message,
  };

  return error;
};

/* =========================================================
   PURCHASE REQUEST HELPERS
   ========================================================= */

const MAX_INT_32 = 2147483647;

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeText(item))
        .filter(Boolean)
    )
  );
};

const normalizePricingRuleIds = (payload = {}) => {
  const optionalServices =
    payload?.optionalServices &&
    typeof payload.optionalServices === "object"
      ? payload.optionalServices
      : {};

  return normalizeStringArray(
    payload?.pricingRuleIds ??
      payload?.selectedPricingRuleIds ??
      optionalServices?.selectedPricingRuleIds ??
      optionalServices?.pricingRuleIds ??
      []
  );
};

const getOptionalServiceFlag = (
  payload,
  fieldName
) => {
  const optionalServices =
    payload?.optionalServices &&
    typeof payload.optionalServices === "object"
      ? payload.optionalServices
      : {};

  return Boolean(
    payload?.[fieldName] ??
      optionalServices?.[fieldName] ??
      false
  );
};

const getImageUrlFromEntry = (entry) => {
  if (typeof entry === "string") {
    return normalizeText(entry);
  }

  if (!entry || typeof entry !== "object") {
    return "";
  }

  return normalizeText(
    entry?.url ??
      entry?.imageUrl ??
      entry?.fileUrl ??
      entry?.secureUrl ??
      entry?.previewUrl ??
      entry?.referenceUrl ??
      ""
  );
};

const normalizeItemImageUrls = (item = {}) => {
  const candidates = [
    item?.imageUrls,
    item?.referenceUrls,
    item?.images,
    item?.uploadedImageUrls,
  ];

  const urls = candidates
    .filter(Array.isArray)
    .flatMap((candidate) =>
      candidate.map(getImageUrlFromEntry)
    );

  [
    item?.imageUrl,
    item?.referenceUrl,
    item?.uploadedImageUrl,
  ].forEach((candidate) => {
    const url = getImageUrlFromEntry(candidate);

    if (url) {
      urls.push(url);
    }
  });

  return Array.from(
    new Set(urls.filter(Boolean))
  );
};

const getSourceWebsite = (item = {}) => {
  const sourceWebsite = normalizeText(
    item?.sourceWebsite
  );

  if (sourceWebsite) {
    return sourceWebsite;
  }

  const productLink = normalizeText(
    item?.productLink
  );

  try {
    return new URL(productLink).hostname;
  } catch {
    return "";
  }
};

/* =========================================================
   PURCHASE REQUEST VALIDATION
   ========================================================= */

const validatePurchaseRequest = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Dữ liệu yêu cầu mua hộ không hợp lệ."
    );
  }

  if (!normalizeText(payload.route)) {
    throw new Error(
      "Vui lòng chọn tuyến vận chuyển."
    );
  }

  if (!normalizeText(payload.shippingOption)) {
    throw new Error(
      "Vui lòng chọn phương thức vận chuyển."
    );
  }

  if (!normalizeText(payload.receiverName)) {
    throw new Error(
      "Vui lòng nhập tên người nhận."
    );
  }

  if (!normalizeText(payload.receiverPhone)) {
    throw new Error(
      "Vui lòng nhập số điện thoại người nhận."
    );
  }

  if (!normalizeText(payload.receiverAddress)) {
    throw new Error(
      "Vui lòng nhập địa chỉ nhận hàng."
    );
  }

  if (
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    throw new Error(
      "Yêu cầu mua hộ phải có ít nhất một sản phẩm."
    );
  }

  payload.items.forEach((item, index) => {
    const productNumber = index + 1;
    const quantity = Number(item?.quantity);
    const productLink = normalizeText(
      item?.productLink
    );

    if (!productLink) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập liên kết sản phẩm.`
      );
    }

    validateAbsoluteUrl(
      productLink,
      `liên kết sản phẩm ${productNumber}`
    );

    if (!getSourceWebsite(item)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Không xác định được website nguồn.`
      );
    }

    if (!normalizeText(item?.productName)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập tên sản phẩm.`
      );
    }

    if (!normalizeText(item?.productType)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng chọn loại sản phẩm.`
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng phải là số nguyên lớn hơn 0.`
      );
    }

    if (quantity > MAX_INT_32) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng vượt quá giới hạn cho phép.`
      );
    }

    if (
      normalizeItemImageUrls(item).length === 0
    ) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng tải ít nhất một ảnh sản phẩm.`
      );
    }
  });
};

const buildPurchaseRequestPayload = (
  payload
) => {
  return {
    route: normalizeText(payload.route),

    shippingOption: normalizeText(
      payload.shippingOption
    ),

    receiverName: normalizeText(
      payload.receiverName
    ),

    receiverPhone: normalizeText(
      payload.receiverPhone
    ),

    receiverAddress: normalizeText(
      payload.receiverAddress
    ),

    pricingRuleIds:
      normalizePricingRuleIds(payload),

    requiresPacking:
      getOptionalServiceFlag(
        payload,
        "requiresPacking"
      ),

    requiresWoodenCrate:
      getOptionalServiceFlag(
        payload,
        "requiresWoodenCrate"
      ),

    requiresInsurance:
      getOptionalServiceFlag(
        payload,
        "requiresInsurance"
      ),

    generalNote: normalizeText(
      payload.generalNote ??
        payload.note
    ),

    items: payload.items.map((item) => ({
      productLink: normalizeText(
        item.productLink
      ),

      sourceWebsite:
        getSourceWebsite(item),

      productType: normalizeText(
        item.productType
      ),

      productName: normalizeText(
        item.productName
      ),

      quantity: Number(item.quantity),

      attributes: normalizeText(
        item.attributes
      ),

      note: normalizeText(item.note),

      imageUrls:
        normalizeItemImageUrls(item),
    })),
  };
};

/* =========================================================
   TRA CỨU TRONG FIXTURE
   ========================================================= */

const normalizeKey = (value) =>
  String(value ?? "").trim().toLowerCase();

/**
 * Dò một yêu cầu mua hộ theo MỌI mã mà component có trong tay.
 *
 * BuyForMeQuotationListDetail khi từ chối báo giá truyền quotationId, nhưng lúc
 * thiếu quotation nó lại fallback sang requestId; ReceiveGoods thì tra thẳng
 * bằng mã đơn khách gõ tay. Chỉ dò theo một khoá là hụt các nhánh còn lại.
 */
const findPurchaseRequestByAnyKey = (value) => {
  const key = normalizeKey(value);

  if (!key) {
    return null;
  }

  return (
    findPurchaseRequestById(value) ||
    findPurchaseRequestByCode(value) ||
    purchaseRequestStore.find(
      (request) =>
        normalizeKey(request?.quotationId) === key ||
        normalizeKey(request?.quotation?.quotationId) === key ||
        normalizeKey(request?.quotation?.quotationCode) === key
    ) ||
    null
  );
};

/**
 * Báo giá ký gửi: QuotationDetail của module consignment dùng chung ba hàm
 * accept / reject / confirm-and-pay bên này, nên khi không tìm thấy trong dữ
 * liệu mua hộ thì phải dò tiếp sang đơn ký gửi trước khi báo lỗi.
 */
const findConsignmentByQuotationKey = (value) => {
  const key = normalizeKey(value);

  if (!key) {
    return null;
  }

  return (
    consignmentStore.find(
      (order) =>
        normalizeKey(order?.quotation?.quotationId) === key ||
        normalizeKey(order?.quotation?.quotationCode) === key ||
        normalizeKey(order?.orderId) === key ||
        normalizeKey(order?.orderCode) === key
    ) || null
  );
};

/* =========================================================
   LỌC / SẮP XẾP DANH SÁCH
   ========================================================= */

const sortByNewest = (rows) =>
  [...rows].sort(
    (left, right) =>
      new Date(right?.createdAt || 0).getTime() -
      new Date(left?.createdAt || 0).getTime()
  );

const buildSearchHaystack = (request) =>
  normalizeSearchText(
    [
      request?.purchaseCode,
      request?.orderCode,
      request?.receiverName,
      request?.receiverPhone,
      request?.receiverAddress,
      request?.customerName,
      request?.generalNote,
      request?.route,
      ...(Array.isArray(request?.items)
        ? request.items.map((item) => item?.productName)
        : []),
    ]
      .filter(Boolean)
      .join(" ")
  );

const getKnownStatuses = () =>
  new Set(
    purchaseRequestStore.map((request) =>
      normalizeStatus(request?.status)
    )
  );

const filterPurchaseRequests = (rows, filters = {}) => {
  const requestedStatuses = (
    Array.isArray(filters?.status)
      ? filters.status
      : String(filters?.status ?? "").split(",")
  )
    .map(normalizeStatus)
    .filter(Boolean);

  /*
   * ReceiveGoods lọc theo tiến trình GIAO HÀNG (DELIVERY_DISPATCHED,
   * DELIVERED...) — yêu cầu mua hộ không mang những mã đó. API thật bỏ qua
   * tham số này, nên ở đây mã lạ cũng phải bị bỏ qua; lọc thật sẽ cho ra danh
   * sách rỗng và khách tưởng mất đơn.
   */
  const knownStatuses = getKnownStatuses();

  const wantedStatuses = requestedStatuses.filter((status) =>
    knownStatuses.has(status)
  );

  const keyword = normalizeSearchText(
    filters?.keyword ?? filters?.search ?? filters?.q ?? ""
  );

  return rows.filter((request) => {
    if (
      wantedStatuses.length > 0 &&
      !wantedStatuses.includes(normalizeStatus(request?.status))
    ) {
      return false;
    }

    if (
      keyword &&
      !buildSearchHaystack(request).includes(keyword)
    ) {
      return false;
    }

    return true;
  });
};

/* =========================================================
   DỰNG BẢN GHI MỚI
   ========================================================= */

/* Loại sản phẩm form gửi lên có thể là mã, tên hoặc id — tra lại cả ba. */
const findProductType = (value) => {
  const key = normalizeSearchText(value);

  if (!key) {
    return null;
  }

  return (
    (catalog?.productTypes || []).find(
      (type) =>
        normalizeSearchText(type?.productTypeCode) === key ||
        normalizeSearchText(type?.productTypeName) === key ||
        normalizeSearchText(type?.productTypeId) === key
    ) || null
  );
};

/**
 * Đổi payload đã chuẩn hoá thành một bản ghi CÙNG SHAPE với fixture.
 *
 * Ngay sau khi tạo, người dùng bị đẩy sang màn "yêu cầu chờ duyệt"; bản ghi
 * thiếu field nào là dòng đầu bảng trống field đó.
 */
const buildCreatedPurchaseRequest = (requestPayload) => {
  const createdAt = nowIso();

  const purchaseRequestId = newUuid();

  const purchaseCode = makeOrderCode("PUR", createdAt);

  const items = requestPayload.items.map((item) => {
    const itemId = newUuid();

    const productType = findProductType(item.productType);

    return {
      id: itemId,
      itemId,
      purchaseRequestItemId: itemId,

      productLink: item.productLink,
      sourceWebsite: item.sourceWebsite,

      productName: item.productName,

      productType:
        productType?.productTypeName || item.productType,
      productTypeCode: productType?.productTypeCode || null,
      productTypeName:
        productType?.productTypeName || item.productType,
      productTypeId: productType?.productTypeId || null,

      quantity: item.quantity,
      /* Khách chưa khai giá lúc gửi yêu cầu; giá chốt nằm bên báo giá. */
      unitPrice: 0,

      attributes: item.attributes,
      note: item.note,

      imageUrls: item.imageUrls,
      imageUrl: item.imageUrls[0] || "",
      referenceUrls: item.imageUrls,
    };
  });

  const totalQuantity = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  return {
    purchaseRequestId,
    id: purchaseRequestId,
    purchaseCode,
    orderCode: purchaseCode,
    orderType: "PURCHASE_REQUEST",

    status: "PENDING_REVIEW",

    route: requestPayload.route,
    shippingOption: requestPayload.shippingOption,

    receiverName: requestPayload.receiverName,
    receiverPhone: requestPayload.receiverPhone,
    receiverAddress: requestPayload.receiverAddress,
    /* Giống fixture: ReceiveGoods đọc fullAddress chứ không đọc receiverAddress. */
    fullAddress: requestPayload.receiverAddress,

    customerId: MOCK_CUSTOMER.customerId,
    customerName: MOCK_CUSTOMER.fullName,
    customerPhone: MOCK_CUSTOMER.phone,
    customerEmail: MOCK_CUSTOMER.email,
    createdByName: MOCK_CUSTOMER.fullName,

    requiresPacking: requestPayload.requiresPacking,
    requiresWoodenCrate: requestPayload.requiresWoodenCrate,
    requiresInsurance: requestPayload.requiresInsurance,

    optionalServices: {
      requiresPacking: requestPayload.requiresPacking,
      requiresWoodenCrate: requestPayload.requiresWoodenCrate,
      requiresInsurance: requestPayload.requiresInsurance,
    },

    pricingRuleIds: requestPayload.pricingRuleIds,

    generalNote: requestPayload.generalNote,
    note: requestPayload.generalNote,
    reason: "",

    itemCount: items.length,
    totalQuantity,
    items,

    quotation: null,
    quotationId: null,

    createdAt,
    updatedAt: createdAt,
    submittedAt: createdAt,
    statusUpdatedAt: createdAt,
    quotationCreatedAt: null,

    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
  };
};

/* =========================================================
   LỊCH SỬ THANH TOÁN (dựng tại chỗ)
   ========================================================= */

/*
 * Không có fixture riêng cho payment, nên lịch sử được suy ra từ báo giá:
 * tiền hàng trả trước 100%, phần dịch vụ đặt cọc 50% — đúng cách
 * BuyForMeQuotationListDetail đang tính số tiền cọc trên màn chi tiết.
 */
const SERVICE_DEPOSIT_RATE = 0.5;

const paymentHistoryStore = new Map();

const toNumber = (value) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getQuotationTotals = (request) => {
  const quotation = request?.quotation;

  const productsSubtotal = toNumber(quotation?.productsSubtotal);

  const totalBillAmount =
    toNumber(quotation?.totalAmount) ||
    toNumber(quotation?.totalEstimatedCost);

  const servicesSubtotal = Math.max(
    totalBillAmount - productsSubtotal,
    0
  );

  const depositAmount =
    productsSubtotal +
    Math.round(servicesSubtotal * SERVICE_DEPOSIT_RATE);

  return {
    productsSubtotal,
    servicesSubtotal,
    totalBillAmount,
    depositAmount,
  };
};

/**
 * Link "Thanh toán" / "Hóa đơn" trong bảng lịch sử mở ở tab mới.
 *
 * Bản UI-only không có cổng SePay nên link trỏ về chính màn chi tiết mua hộ,
 * tránh đẩy khách sang một domain chết. Cắm API thật thì đổi lại thành
 * getSepayCheckoutPageUrl(orderCode).
 */
const buildMockCheckoutUrl = (purchaseRequestId, orderCode) => {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  if (!origin) {
    return "";
  }

  return `${origin}/check-orders/buy-on-behalf/${encodeURIComponent(
    purchaseRequestId
  )}?orderCode=${encodeURIComponent(orderCode)}`;
};

const createPaymentRecord = ({
  request,
  paymentType,
  amount,
  status,
  createdAt,
  paidAt = null,
  paymentMethod = "SEPAY",
}) => {
  const orderCode = makeOrderCode("PAY", createdAt);

  return {
    paymentId: nextId("payment"),
    orderCode,
    /* Mã tham chiếu ngân hàng chỉ có khi tiền đã về. */
    transactionCode:
      status === "PAID"
        ? `FT${String(orderCode).replace(/\D/g, "").slice(-12)}`
        : "",

    purchaseRequestId: request.purchaseRequestId,
    purchaseCode: request.purchaseCode,

    paymentType,
    paymentMethod,
    amount,
    status,

    createdAt,
    paidAt,

    checkoutUrl: buildMockCheckoutUrl(
      request.purchaseRequestId,
      orderCode
    ),
  };
};

/**
 * Sinh lịch sử thanh toán lần đầu cho một yêu cầu, rồi nhớ lại trong phiên.
 *
 * Phải nhớ vì confirmAndPayQuotationApi có ghi thêm giao dịch mới — sinh lại
 * mỗi lần gọi là giao dịch vừa tạo biến mất khi màn hình tải lại.
 */
const getPaymentsForRequest = (request) => {
  const key = normalizeKey(request?.purchaseRequestId);

  if (paymentHistoryStore.has(key)) {
    return paymentHistoryStore.get(key);
  }

  const totals = getQuotationTotals(request);

  const status = normalizeStatus(request?.status);

  const paidAt =
    request?.statusUpdatedAt ||
    request?.updatedAt ||
    request?.createdAt;

  const createdAt =
    request?.quotation?.createdAt ||
    request?.updatedAt ||
    request?.createdAt;

  const payments = [];

  if (totals.totalBillAmount > 0) {
    const remainingAmount = Math.max(
      totals.totalBillAmount - totals.depositAmount,
      0
    );

    if (
      status === "PAID" ||
      status === "PROCESSING" ||
      status === "COMPLETED"
    ) {
      payments.push(
        createPaymentRecord({
          request,
          paymentType: "DEPOSIT",
          amount: totals.depositAmount,
          status: "PAID",
          createdAt,
          paidAt,
        })
      );

      if (remainingAmount > 0) {
        payments.push(
          createPaymentRecord({
            request,
            paymentType: "REMAINING",
            amount: remainingAmount,
            /* Đơn đã hoàn tất thì phần còn lại cũng đã thu xong. */
            status: status === "COMPLETED" ? "PAID" : "PENDING",
            createdAt: paidAt,
            paidAt: status === "COMPLETED" ? paidAt : null,
          })
        );
      }
    } else if (status === "APPROVED") {
      payments.push(
        createPaymentRecord({
          request,
          paymentType: "DEPOSIT",
          amount: totals.depositAmount,
          status: "PENDING",
          createdAt,
        })
      );
    }
  }

  paymentHistoryStore.set(key, payments);

  return payments;
};

const buildPaymentHistory = (request) => {
  const totals = getQuotationTotals(request);

  const payments = getPaymentsForRequest(request);

  const totalPaid = payments
    .filter(
      (payment) => normalizeStatus(payment.status) === "PAID"
    )
    .reduce((total, payment) => total + toNumber(payment.amount), 0);

  return {
    purchaseRequestId: request.purchaseRequestId,
    purchaseCode: request.purchaseCode,
    requestStatus: request.status,

    totalBillAmount: totals.totalBillAmount,
    totalPaid,
    outstanding: Math.max(totals.totalBillAmount - totalPaid, 0),

    productsSubtotal: totals.productsSubtotal,
    servicesSubtotal: totals.servicesSubtotal,
    depositAmount: totals.depositAmount,
    depositDescription:
      "Đặt cọc gồm 100% tiền hàng và 50% phí dịch vụ; phần còn lại thanh toán trước khi xuất kho Việt Nam.",

    payments: deepClone(payments),
  };
};

/* =========================================================
   PURCHASE REQUEST APIs
   ========================================================= */


export const createPurchaseRequestApi = async (
  payload,
  options = {}
) => {
  validatePurchaseRequest(payload);

  const requestPayload =
    buildPurchaseRequestPayload(payload);

  try {
    /* API THẬT: axiosInstance.post("/api/purchase-requests", requestPayload, { signal }) */
    await delay(420, getSignal(options));

    const created = buildCreatedPurchaseRequest(requestPayload);

    /* Thêm lên đầu: danh sách sắp xếp mới nhất trước, khách phải thấy ngay. */
    purchaseRequestStore.unshift(created);

    return {
      success: true,
      message: "Yêu cầu mua hộ đã được tiếp nhận.",
      purchaseRequestId: created.purchaseRequestId,
      purchaseCode: created.purchaseCode,
      status: created.status,
      createdAt: created.createdAt,
      data: deepClone(created),
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi tạo yêu cầu mua hộ:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};


export const getPurchaseRequestsApi = async (
  pageNumber,
  pageSize,
  options = {}
) => {
  try {
    let opts = options;
    let params = {};

    if (typeof pageNumber === "object" && pageNumber !== null) {
      opts = pageNumber;
    } else {
      if (pageNumber !== undefined) params.pageNumber = pageNumber;
      if (pageSize !== undefined) params.pageSize = pageSize;
    }

    if (opts.params) {
      params = { ...params, ...opts.params };
    }

    /* API THẬT: axiosInstance.get("/api/purchase-requests", { params, signal }) */
    await delay(260, getSignal(opts));

    /*
     * Bộ lọc có thể nằm trong params (usePendingQuotationCounts) hoặc đặt
     * thẳng trên đối tượng options (ReceiveGoods truyền
     * { pageNumber, pageSize, keyword, status } làm tham số đầu tiên).
     */
    const filters = {
      ...(typeof opts === "object" && opts !== null ? opts : {}),
      ...params,
    };

    const filtered = filterPurchaseRequests(
      sortByNewest(purchaseRequestStore),
      filters
    );

    /*
     * Dashboard và ô chọn đơn trong chat gọi hàm này KHÔNG kèm số trang, và
     * đọc luôn toàn bộ items để tính thống kê. Mặc định 10 dòng như backend cũ
     * sẽ cắt mất nửa dữ liệu, nên khi không ai chỉ định thì trả trang rộng.
     */
    const resolvedPageSize =
      Number(params.pageSize ?? filters.pageSize) || 100;

    const pageData = paginate(filtered, {
      page: Number(params.pageNumber ?? filters.pageNumber) || 1,
      size: resolvedPageSize,
    });

    return {
      ...pageData,
      items: deepClone(pageData.items),
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách yêu cầu mua hộ:",
        getApiErrorMessage(
          error,
          "Không thể lấy danh sách yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

/**
 * Lấy chi tiết một yêu cầu mua hộ theo ID.
 *
 * GET /api/purchase-requests/{purchaseRequestId}
 */
export const getPurchaseRequestDetailApi = async (
  purchaseRequestId,
  options = {}
) => {
  const id = validateId(
    purchaseRequestId,
    "Không tìm thấy mã yêu cầu mua hộ."
  );

  try {
    /* API THẬT: axiosInstance.get(`/api/purchase-requests/${id}`, { signal }) */
    await delay(280, getSignal(options));

    /*
     * ReceiveGoods cho khách gõ thẳng mã đơn để tra cứu, nên phải dò cả
     * purchaseCode. Không tìm thấy thì PHẢI ném lỗi 404: màn tra cứu bắt lỗi
     * này để thử tiếp sang đơn ký gửi.
     */
    const request =
      findPurchaseRequestById(id) ||
      findPurchaseRequestByCode(id);

    if (!request) {
      throw createApiError(
        404,
        "Không tìm thấy yêu cầu mua hộ."
      );
    }

    return deepClone(request);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết yêu cầu mua hộ:",
        getApiErrorMessage(
          error,
          "Không thể lấy chi tiết yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

// Aliases cho hàm lấy chi tiết yêu cầu mua hộ
export const getPurchaseRequestByIdApi = getPurchaseRequestDetailApi;
export const getPurchaseRequestById = getPurchaseRequestDetailApi;


export const rejectQuotationApi = async (
  quotationIdOrPurchaseRequestId,
  rejectionReason,
  options = {}
) => {
  const id = validateId(
    quotationIdOrPurchaseRequestId,
    "Không tìm thấy mã báo giá để từ chối."
  );

  const reason = normalizeText(
    typeof rejectionReason === "object"
      ? rejectionReason?.rejectionReason
      : rejectionReason
  );

  if (!reason) {
    throw new Error(
      "Vui lòng nhập lý do từ chối báo giá."
    );
  }

  try {
    /* API THẬT: axiosInstance.put(`/api/quotations/${id}/reject`, { rejectionReason }, { signal }) */
    await delay(380, getSignal(options));

    const rejectedAt = nowIso();

    const request = findPurchaseRequestByAnyKey(id);

    if (request) {
      /*
       * Sửa thẳng trên fixture: màn chi tiết gọi lại fetchDetail ngay sau khi
       * từ chối, không cập nhật là khu nút "Chấp nhận / Thanh toán" vẫn còn.
       */
      request.status = "REJECTED";
      request.reason = reason;
      request.rejectedAt = rejectedAt;
      request.updatedAt = rejectedAt;
      request.statusUpdatedAt = rejectedAt;

      if (request.quotation) {
        request.quotation.status = "REJECTED";
        request.quotation.rejectionReason = reason;
        request.quotation.updatedAt = rejectedAt;
      }

      /*
       * Xoá lịch sử đã sinh: báo giá vừa bị từ chối thì phiếu cọc "chờ thu"
       * kèm nút "Thanh toán ngay" phải biến mất, nếu không khách vẫn bấm
       * thanh toán được cho một báo giá đã huỷ.
       */
      paymentHistoryStore.delete(
        normalizeKey(request.purchaseRequestId)
      );

      return {
        success: true,
        message: "Báo giá đã được từ chối trên hệ thống.",
        quotationId:
          request.quotation?.quotationId || request.quotationId || id,
        purchaseRequestId: request.purchaseRequestId,
        purchaseCode: request.purchaseCode,
        status: "REJECTED",
        rejectionReason: reason,
        rejectedAt,
      };
    }

    /* Cùng ba hàm này phục vụ báo giá ký gửi, nên dò tiếp bên đơn ký gửi. */
    const consignment = findConsignmentByQuotationKey(id);

    if (consignment?.quotation) {
      consignment.quotation.status = "REJECTED";
      consignment.quotation.rejectionReason = reason;
      consignment.quotation.updatedAt = rejectedAt;
      consignment.updatedAt = rejectedAt;
      consignment.statusUpdatedAt = rejectedAt;

      return {
        success: true,
        message: "Báo giá đã được từ chối trên hệ thống.",
        quotationId: consignment.quotation.quotationId,
        orderId: consignment.orderId,
        orderCode: consignment.orderCode,
        status: "REJECTED",
        rejectionReason: reason,
        rejectedAt,
      };
    }

    throw createApiError(
      404,
      "Không tìm thấy báo giá cần từ chối."
    );
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi từ chối báo giá:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          quotationId: id,
          rejectionReason: reason,
        }
      );
    }

    throw error;
  }
};

export const acceptQuotationApi = async (
  quotationIdOrPurchaseRequestId,
  options = {}
) => {
  const id = validateId(
    quotationIdOrPurchaseRequestId,
    "Không tìm thấy mã báo giá để chấp nhận."
  );

  try {
    /* API THẬT: axiosInstance.put(`/api/quotations/${id}/accept`, null, { signal }) */
    await delay(380, getSignal(options));

    const approvedAt = nowIso();

    const request = findPurchaseRequestByAnyKey(id);

    if (request) {
      request.status = "APPROVED";
      request.approvedAt = approvedAt;
      request.updatedAt = approvedAt;
      request.statusUpdatedAt = approvedAt;

      if (request.quotation) {
        request.quotation.status = "APPROVED";
        request.quotation.updatedAt = approvedAt;
      }

      /* Chấp nhận offline sẽ phát sinh phiếu chờ thu tiền cọc. */
      paymentHistoryStore.delete(
        normalizeKey(request.purchaseRequestId)
      );

      return {
        success: true,
        message: "Báo giá tạm tính đã được chấp nhận.",
        quotationId:
          request.quotation?.quotationId || request.quotationId || id,
        purchaseRequestId: request.purchaseRequestId,
        purchaseCode: request.purchaseCode,
        status: "APPROVED",
        approvedAt,
      };
    }

    const consignment = findConsignmentByQuotationKey(id);

    if (consignment?.quotation) {
      /* Báo giá ký gửi dùng mã ACCEPTED, không phải APPROVED. */
      consignment.quotation.status = "ACCEPTED";
      consignment.quotation.updatedAt = approvedAt;
      consignment.updatedAt = approvedAt;
      consignment.statusUpdatedAt = approvedAt;

      return {
        success: true,
        message: "Báo giá tạm tính đã được chấp nhận.",
        quotationId: consignment.quotation.quotationId,
        orderId: consignment.orderId,
        orderCode: consignment.orderCode,
        status: "ACCEPTED",
        approvedAt,
      };
    }

    throw createApiError(
      404,
      "Không tìm thấy báo giá cần chấp nhận."
    );
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi chấp nhận báo giá:",
        getApiErrorMessage(
          error,
          "Không thể chấp nhận báo giá."
        )
      );
    }

    throw error;
  }
};

/**
 * Khách hàng xác nhận báo giá yêu cầu mua hộ
 * và tạo giao dịch thanh toán.
 *
 * PUT /api/purchase-requests/{purchaseRequestId}/quotation/confirm-and-pay
 *
 * Request body:
 * {
 *   returnUrl: string,
 *   cancelUrl: string,
 *   paymentMethod: string
 * }
 */
export const confirmAndPayQuotationApi = async (
  purchaseRequestIdOrQuotationId,
  payload = {},
  options = {}
) => {
  const id = validateId(
    purchaseRequestIdOrQuotationId,
    "Không tìm thấy mã yêu cầu mua hộ hoặc mã báo giá để thanh toán."
  );

  const requestPayload = {
    returnUrl: validateAbsoluteUrl(
      payload.returnUrl,
      "đường dẫn quay lại sau thanh toán"
    ),
    cancelUrl: validateAbsoluteUrl(
      payload.cancelUrl,
      "đường dẫn khi hủy thanh toán"
    ),
    paymentMethod: payload.paymentMethod || "SEPAY",
  };

  try {
    /* API THẬT: axiosInstance.put(`/api/purchase-requests/${id}/quotation/confirm-and-pay`, requestPayload, { signal }) */
    await delay(460, getSignal(options));

    const paidAt = nowIso();

    /*
     * checkoutUrl = returnUrl của chính app.
     *
     * Bản UI-only không có cổng SePay; hai màn gọi hàm này đều chuyển trang
     * ngay sang checkoutUrl (một màn còn ném lỗi nếu thiếu), nên trả về
     * returnUrl để khách quay lại đúng màn chi tiết với trạng thái thành công
     * thay vì rơi ra một domain chết. Cắm API thật thì lấy checkoutUrl trong
     * response của backend.
     */
    const checkoutUrl = requestPayload.returnUrl;

    const request = findPurchaseRequestByAnyKey(id);

    if (request) {
      const totals = getQuotationTotals(request);

      request.status = "PAID";
      request.updatedAt = paidAt;
      request.statusUpdatedAt = paidAt;

      if (request.quotation) {
        request.quotation.status = "PAID";
        request.quotation.updatedAt = paidAt;
      }

      /*
       * DỰNG LẠI lịch sử theo trạng thái mới, KHÔNG push thêm một dòng.
       *
       * Push thêm sẽ nhân đôi phiếu cọc: khách chưa mở màn lịch sử lần nào
       * thì getPaymentsForRequest mới sinh dữ liệu ở đây, và lúc đó nó đã
       * thấy status = PAID nên tự đẻ sẵn một phiếu cọc "đã thu". Cộng với
       * phiếu vừa tạo là "Đã thanh toán" vượt cả tổng tiền báo giá và thanh
       * tiến độ đứng ở 100% ngay khi mới đặt cọc. Dựng lại còn giúp bấm
       * thanh toán hai lần vẫn ra đúng một phiếu cọc.
       */
      paymentHistoryStore.delete(
        normalizeKey(request.purchaseRequestId)
      );

      const payments = getPaymentsForRequest(request);

      let payment = payments.find(
        (item) => normalizeStatus(item.paymentType) === "DEPOSIT"
      );

      /* Yêu cầu chưa có báo giá thì không sinh được phiếu nào — tạo tay. */
      if (!payment) {
        payment = createPaymentRecord({
          request,
          paymentType: "DEPOSIT",
          amount: totals.depositAmount,
          status: "PAID",
          createdAt: paidAt,
          paidAt,
        });

        payments.push(payment);
      }

      payment.paymentMethod = requestPayload.paymentMethod;

      return {
        success: true,
        message: "Đã khởi tạo giao dịch thanh toán.",
        checkoutUrl,
        paymentUrl: checkoutUrl,
        orderCode: payment.orderCode,
        amount: payment.amount,
        status: "PENDING",
        paymentMethod: requestPayload.paymentMethod,
        purchaseRequestId: request.purchaseRequestId,
        purchaseCode: request.purchaseCode,
        quotationId:
          request.quotation?.quotationId || request.quotationId || id,
        returnUrl: requestPayload.returnUrl,
        cancelUrl: requestPayload.cancelUrl,
        createdAt: paidAt,
      };
    }

    const consignment = findConsignmentByQuotationKey(id);

    if (consignment?.quotation) {
      consignment.quotation.status = "PAID";
      consignment.quotation.updatedAt = paidAt;
      consignment.updatedAt = paidAt;
      consignment.statusUpdatedAt = paidAt;

      const orderCode = makeOrderCode("PAY", paidAt);

      return {
        success: true,
        message: "Đã khởi tạo giao dịch thanh toán.",
        checkoutUrl,
        paymentUrl: checkoutUrl,
        orderCode,
        amount:
          toNumber(consignment.quotation.totalEstimatedCost) ||
          toNumber(consignment.quotation.totalAmount),
        status: "PENDING",
        paymentMethod: requestPayload.paymentMethod,
        orderId: consignment.orderId,
        quotationId: consignment.quotation.quotationId,
        returnUrl: requestPayload.returnUrl,
        cancelUrl: requestPayload.cancelUrl,
        createdAt: paidAt,
      };
    }

    throw createApiError(
      404,
      "Không tìm thấy báo giá cần thanh toán."
    );
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error("Lỗi xác nhận thanh toán mua hộ:", {
        status: error?.response?.status,
        response: error?.response?.data,
        id,
        payload: requestPayload,
      });
    }

    throw error;
  }
};

/**
 * Kiểm tra trạng thái thanh toán theo orderCode.
 *
 * GET /api/payments/status/{orderCode}
 *
 * Response thường gặp:
 * {
 *   orderCode: number,
 *   amount: number,
 *   status: string,
 *   paymentMethod: string
 * }
 */
export const getPaymentStatusApi = async (
  orderCode,
  options = {}
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch thanh toán."
  );

  try {
    /* API THẬT: axiosInstance.get(`/api/payments/status/${code}`, { signal }) */
    await delay(240, getSignal(options));

    const payment = findPaymentByOrderCode(code);

    if (!payment) {
      throw createApiError(
        404,
        "Không tìm thấy giao dịch thanh toán."
      );
    }

    return deepClone(payment);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi kiểm tra trạng thái thanh toán:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          orderCode: code,
        }
      );
    }

    throw error;
  }
};

/**
 * Lấy nội dung trang checkout SePay.
 *
 * GET /api/payments/sepay/checkout/{orderCode}
 *
 * Lưu ý:
 * - Endpoint trả về trang HTML hiển thị VietQR.
 * - Khi chỉ cần chuyển trang, dùng
 *   getSepayCheckoutPageUrl(orderCode).
 */
export const getSepayCheckoutApi = async (
  orderCode,
  options = {}
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch SePay."
  );

  try {
    /* API THẬT: axiosInstance.get(`/api/payments/sepay/checkout/${code}`, { responseType: "text", signal }) */
    await delay(300, getSignal(options));

    const payment = findPaymentByOrderCode(code);

    const amount = toNumber(payment?.amount);

    /* Endpoint thật trả HTML thô, nên mock cũng phải trả chuỗi HTML. */
    return [
      "<!doctype html>",
      '<html lang="vi"><head><meta charset="utf-8">',
      "<title>Thanh toán VietQR - VCL</title></head>",
      '<body style="font-family:system-ui;text-align:center;padding:40px">',
      "<h1>Quét VietQR để thanh toán</h1>",
      `<p>Mã giao dịch: <strong>${code}</strong></p>`,
      `<p>Số tiền: <strong>${amount.toLocaleString("vi-VN")} VND</strong></p>`,
      "<p>Trang thanh toán mô phỏng cho bản dựng UI-only.</p>",
      "</body></html>",
    ].join("");
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy trang checkout SePay:",
        {
          status:
            error?.response?.status,
          response:
            error?.response?.data,
          orderCode: code,
        }
      );
    }

    throw error;
  }
};

/**
 * Tạo URL tuyệt đối đến trang checkout SePay.
 */
export const getSepayCheckoutPageUrl = (
  orderCode
) => {
  const code = validateId(
    orderCode,
    "Không tìm thấy mã giao dịch SePay."
  );

  const configuredApiBase =
    normalizeText(
      import.meta.env.VITE_API_BASE_URL
    );

  const fallbackApiBase =
    "https://api-vcl.zushin.io.vn";

  let apiOrigin;

  try {
    apiOrigin = new URL(
      configuredApiBase ||
        fallbackApiBase,
      window.location.origin
    ).origin;
  } catch {
    apiOrigin =
      fallbackApiBase;
  }

  return new URL(
    `/api/payments/sepay/checkout/${encodeURIComponent(
      code
    )}`,
    `${apiOrigin}/`
  ).toString();
};

/**
 * Lấy URL thanh toán từ các kiểu response thường gặp.
 *
 * Hỗ trợ:
 * - response là chuỗi URL
 * - response.checkoutUrl
 * - response.paymentUrl
 * - response.data.checkoutUrl
 * - response.data.paymentUrl
 */
export const getPaymentCheckoutUrl = (
  apiResult
) => {
  if (
    typeof apiResult ===
    "string"
  ) {
    return normalizeText(
      apiResult
    );
  }

  if (
    typeof apiResult?.data ===
    "string"
  ) {
    return normalizeText(
      apiResult.data
    );
  }

  const url =
    apiResult?.checkoutUrl ||
    apiResult?.paymentUrl ||
    apiResult?.payUrl ||
    apiResult?.url ||
    apiResult?.data?.checkoutUrl ||
    apiResult?.data?.paymentUrl ||
    apiResult?.data?.payUrl ||
    apiResult?.data?.url ||
    apiResult?.data?.data?.checkoutUrl ||
    apiResult?.data?.data?.paymentUrl ||
    apiResult?.data?.data?.payUrl ||
    apiResult?.data?.data?.url ||
    "";

  return normalizeText(url);
};

/**
 * Lấy lịch sử thanh toán của một yêu cầu mua hộ.
 * GET /api/purchase-requests/{requestId}/payments
 */
export const getPurchaseRequestPaymentHistoryApi = async (
  requestId,
  options = {}
) => {
  if (!requestId) {
    throw new Error("Mã yêu cầu mua hộ (requestId) là bắt buộc.");
  }

  try {
    /* API THẬT: axiosInstance.get(`/api/purchase-requests/${requestId}/payments`, { signal }) */
    await delay(300, getSignal(options));

    const request =
      findPurchaseRequestById(requestId) ||
      findPurchaseRequestByCode(requestId);

    if (!request) {
      throw createApiError(
        404,
        "Không tìm thấy yêu cầu mua hộ cần xem lịch sử thanh toán."
      );
    }

    return buildPaymentHistory(request);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        `Lỗi lấy lịch sử thanh toán yêu cầu mua hộ [${requestId}]:`,
        getApiErrorMessage(
          error,
          "Không thể lấy lịch sử thanh toán của yêu cầu mua hộ."
        )
      );
    }

    throw error;
  }
};

/*
 * Dò giao dịch theo orderCode trong toàn bộ lịch sử đã sinh.
 * Đặt cuối file vì phải chờ purchaseRequestStore và paymentHistoryStore.
 */
function findPaymentByOrderCode(orderCode) {
  const key = normalizeKey(orderCode);

  if (!key) {
    return null;
  }

  /* Sinh trước lịch sử cho mọi yêu cầu, nếu không map còn rỗng ở lần gọi đầu. */
  purchaseRequestStore.forEach((request) => {
    getPaymentsForRequest(request);
  });

  for (const payments of paymentHistoryStore.values()) {
    const found = payments.find(
      (payment) => normalizeKey(payment.orderCode) === key
    );

    if (found) {
      return found;
    }
  }

  return null;
}

export default createPurchaseRequestApi;
