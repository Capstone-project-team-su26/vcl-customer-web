/* =========================================================
   consignmentApi.js — đơn ký gửi của khách.

   ĐÃ NỐI API THẬT (đợt A — đăng nhập và đơn ký gửi, bám code VCL_API):
   - Dữ liệu form: getConsignmentRoutesApi, getConsignmentShippingOptionsApi,
     getProductTypesApi.
   - Kiểm hàng / tạo đơn: validateConsignmentItemsApi, createConsignmentApi
     (payload dựng qua buildCreateConsignmentRequest — ép đóng thùng gỗ).
   - Xem / huỷ: getConsignmentsApi, getConsignmentDetailApi, cancelConsignmentApi.
   - Sổ địa chỉ nhận: getDeliveryAddressesApi, createDeliveryAddressApi,
     deleteDeliveryAddressApi.

   ĐÃ NỐI API THẬT (đợt B — báo giá và cọc): getOrderQuotationApi,
     rejectConsignmentQuotationApi, confirmAndPayConsignmentQuotationApi,
     getConsignmentPaymentStatusApi.

   ĐÃ NỐI API THẬT (đợt C — hàng về VN): getStorageFeeEstimateApi
     (GET /api/storage-fee/estimate).

   VẪN LÀ MOCK: updateConsignmentStatusApi — thao tác của Sale, app khách không gọi.

   Màn ngoài đợt A (mua hộ, kho của khách, Nhận hàng, chat, trang giá) KHÔNG
   import file này mà import bản sao consignmentApi.mock.js, để không trộn dữ
   liệu thật với dữ liệu mẫu.

   Giữ nguyên tên export, thứ tự tham số và SHAPE trả về của bản mock: mọi hàm
   trả phần thân đã bóc envelope { message, data }, không trả response axios.
   Lỗi HTTP ném nguyên dạng axios (error.response.data) để component đọc
   message / title / errors như cũ.
   ========================================================= */

/* Các import mock dưới đây CHỈ phục vụ updateConsignmentStatusApi (thao tác của
   Sale, không thuộc app khách) — không hàm đã nối API thật nào đọc fixture. */
import {
  findConsignmentById,
  findConsignmentByCode,
} from "@/mocks/data/consignments";
import { delay, nowIso } from "@/mocks/mockUtils";
import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INT32_MAX = 2147483647;

const getRequiredText = (value, label) => {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw new Error(`Vui lòng nhập ${label}.`);
  }

  return normalizedValue;
};

const getPositiveNumber = (
  value,
  label,
  itemIndex
) => {
  const number = Number(value);

  const itemPrefix =
    Number.isInteger(itemIndex)
      ? `Kiện hàng ${itemIndex + 1}: `
      : "";

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    throw new Error(
      `${itemPrefix}${label} phải lớn hơn 0.`
    );
  }

  return number;
};

const normalizeNullableText = (value) => {
  const normalizedValue = String(
    value ?? ""
  ).trim();

  return normalizedValue || null;
};


/**
 * Nguyện vọng của khách khi hàng về tới kho VN.
 *
 * BE chỉ chấp nhận hai giá trị; thứ gì khác được hiểu là "khách chưa chọn" và lúc hàng về
 * kho sẽ mặc định giao ngay. Gửi null thay vì đoán bừa để kho biết mà hỏi lại khách.
 *
 * @param {unknown} value
 * @returns {"DIRECT_DELIVERY" | "STORE_AT_VN" | null}
 */
const normalizeDestinationHandling = (
  value
) => {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  return normalized ===
    "DIRECT_DELIVERY" ||
    normalized === "STORE_AT_VN"
    ? normalized
    : null;
};

const normalizeNullableGuid = (
  value,
  label,
  itemIndex
) => {
  const normalizedValue =
    normalizeNullableText(value);

  if (!normalizedValue) {
    return null;
  }

  if (!UUID_PATTERN.test(normalizedValue)) {
    const prefix =
      Number.isInteger(itemIndex)
        ? `Kiện hàng ${itemIndex + 1}: `
        : "";

    throw new Error(
      `${prefix}${label} không đúng định dạng GUID.`
    );
  }

  return normalizedValue;
};

/**
 * referenceUrls phải luôn là string[].
 *
 * Chấp nhận:
 * - ["url1", "url2"]
 * - JSON string: '["url1","url2"]'
 * - Chuỗi cũ: "url1,url2" để tương thích dữ liệu cũ
 *
 * Output luôn là mảng URL đã loại trùng.
 */
const normalizeReferenceUrls = (
  value,
  itemIndex
) => {
  let rawUrls = value;

  if (typeof rawUrls === "string") {
    const text = rawUrls.trim();

    if (!text) {
      rawUrls = [];
    } else if (
      text.startsWith("[") &&
      text.endsWith("]")
    ) {
      try {
        rawUrls = JSON.parse(text);
      } catch {
        throw new Error(
          `Kiện hàng ${itemIndex + 1}: referenceUrls không phải JSON hợp lệ.`
        );
      }
    } else {
      /*
       * Chỉ tách dấu phẩy khi phía sau bắt đầu bằng URL/path mới,
       * tránh tách nhầm dấu phẩy nằm trong query string.
       */
      rawUrls = text.split(
        /,\s*(?=(?:https?:\/\/|\/))|[\r\n]+/
      );
    }
  }

  if (!Array.isArray(rawUrls)) {
    throw new Error(
      `Kiện hàng ${itemIndex + 1}: referenceUrls phải là một mảng đường dẫn ảnh.`
    );
  }

  const uniqueUrls = Array.from(
    new Set(
      rawUrls
        .map((url) =>
          String(url ?? "").trim()
        )
        .filter(Boolean)
    )
  );

  if (!uniqueUrls.length) {
    throw new Error(
      `Kiện hàng ${itemIndex + 1}: Vui lòng tải ít nhất một ảnh sản phẩm.`
    );
  }

  return uniqueUrls;
};

/**
 * Chuẩn hóa danh sách Pricing Rule ID:
 * - Chấp nhận mảng rỗng.
 * - Kiểm tra UUID.
 * - Xóa ID trùng.
 */
const normalizePricingRuleIds = (
  value,
  label = "pricingRuleIds"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `${label} phải là một mảng UUID.`
    );
  }

  const uniqueIds = new Set();

  value.forEach((rawId, index) => {
    const id = String(rawId ?? "").trim();

    if (!id) {
      return;
    }

    if (!UUID_PATTERN.test(id)) {
      throw new Error(
        `${label}[${index}] không đúng định dạng UUID.`
      );
    }

    uniqueIds.add(id);
  });

  return Array.from(uniqueIds);
};

const normalizeConsignmentItem = (
  item,
  index
) => {
  const quantity = Number(item?.quantity);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    quantity > INT32_MAX
  ) {
    throw new Error(
      `Kiện hàng ${index + 1}: Số lượng phải là số nguyên từ 1 đến ${INT32_MAX}.`
    );
  }

  const referenceUrls =
    normalizeReferenceUrls(
      item?.referenceUrls,
      index
    );

  const packageConfigurationId =
    normalizeNullableGuid(
      item?.packageConfigurationId,
      "packageConfigurationId",
      index
    );

  /*
   * Đóng thùng gỗ là bắt buộc ở backend: mỗi dòng — mỗi kiện — phải có cấu hình
   * thùng, thiếu là 400. Chặn ngay tại bước dựng payload để báo lỗi tiếng Việt
   * đúng kiện và không gửi POST tạo đơn chắc chắn hỏng. (Màn tạo đơn upload ảnh
   * TRƯỚC rồi mới gọi hàm này, nên chặn ở đây không tiết kiệm được lượt upload.)
   */
  if (!packageConfigurationId) {
    throw new Error(
      `Kiện hàng ${index + 1}: Vui lòng chọn cấu hình thùng gỗ.`
    );
  }

  return {
    productName: getRequiredText(
      item?.productName,
      `tên sản phẩm của kiện ${index + 1}`
    ),
    productType: getRequiredText(
      item?.productType,
      `loại sản phẩm của kiện ${index + 1}`
    ),
    quantity,
    weight: getPositiveNumber(
      item?.weight,
      "Cân nặng",
      index
    ),
    width: getPositiveNumber(
      item?.width,
      "Chiều rộng",
      index
    ),
    height: getPositiveNumber(
      item?.height,
      "Chiều cao",
      index
    ),
    length: getPositiveNumber(
      item?.length,
      "Chiều dài",
      index
    ),
    declaredValue: getPositiveNumber(
      item?.declaredValue,
      "Giá trị khai báo",
      index
    ),

    /*
     * Giữ đúng kiểu string[].
     * Không String(referenceUrls), không join(",").
     */
    referenceUrls,

    domesticTrackingCode:
      normalizeNullableText(
        item?.domesticTrackingCode
      ),

    /* Luôn gửi: đơn khách tạo bắt buộc đóng thùng gỗ cho từng kiện. */
    packageConfigurationId,

    /*
     * Dịch vụ đi theo từng kiện: [{ pricingRuleId }] lấy từ
     * GET /api/orders/consignments/item-services. Backend tính phí riêng cho kiện này.
     */
    services: normalizePricingRuleIds(
      item?.serviceIds ??
        (Array.isArray(item?.services)
          ? item.services.map(
              (service) =>
                service?.pricingRuleId ?? service
            )
          : []),
      `Kiện hàng ${index + 1}: dịch vụ`
    ).map((pricingRuleId) => ({ pricingRuleId })),
  };
};

/**
 * Chuẩn hóa request đúng DTO:
 * POST /api/orders/consignments
 */
export const buildCreateConsignmentRequest = (
  payload = {}
) => {
  if (
    !Array.isArray(payload?.items) ||
    payload.items.length === 0
  ) {
    throw new Error(
      "Đơn ký gửi phải có ít nhất một kiện hàng."
    );
  }

  /*
   * Không gửi pricingRuleIds / requiresInspection / requiresPacking /
   * requiresWoodenCrate / requiresInsurance ở cấp đơn: backend đã bỏ và lặng lẽ
   * bỏ qua, khiến khách tưởng đã chọn dịch vụ mà không bị tính phí. Dịch vụ đi
   * theo từng kiện (items[].services), thùng gỗ theo items[].packageConfigurationId.
   */
  return {
    defaultDestinationHandling:
      normalizeDestinationHandling(
        payload?.defaultDestinationHandling
      ),
    route: getRequiredText(
      payload?.route,
      "tuyến hàng"
    ),
    shippingOption: getRequiredText(
      payload?.shippingOption,
      "hình thức vận chuyển"
    ),
    receiverName: getRequiredText(
      payload?.receiverName,
      "tên người nhận"
    ),
    receiverPhone: getRequiredText(
      payload?.receiverPhone,
      "số điện thoại người nhận"
    ),
    receiverAddress: getRequiredText(
      payload?.receiverAddress,
      "địa chỉ người nhận"
    ),

    note: String(
      payload?.note ?? ""
    ).trim(),

    items: payload.items.map(
      (item, index) =>
        normalizeConsignmentItem(
          item,
          index
        )
    ),
  };
};

/* =========================================================
   LỖI GIẢ LẬP (phần mock + chặn tại chỗ)
   ========================================================= */

/**
 * Lỗi "server trả 4xx" giả lập.
 *
 * Các trang đọc thông báo lỗi bằng error.response.data trước, error.message sau
 * (getApiErrorMessage / getApiErrorText). Thiếu response.data là toast chỉ hiện
 * được câu fallback chung chung.
 *
 * @param {number} status
 * @param {string} message
 * @returns {Error}
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
   TIỆN ÍCH GỌI API THẬT
   ========================================================= */

const CONSIGNMENT_ORDER_TYPE = "CONSIGNMENT";

const DEFAULT_PAGE_SIZE = 10;

/** Bóc một lớp envelope { message, data }; body không có khoá data thì trả nguyên. */
const unwrapData = (body) =>
  body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;

const toArray = (value) => (Array.isArray(value) ? value : []);

const logApiError = (label, error) => {
  if (!isCanceledRequest(error)) {
    console.error(label, error?.response?.data || error?.message);
  }
};

/**
 * Bản ghi đơn từ backend + alias mà bảng danh sách của bản mock vẫn đọc
 * (orderCode / trackingCode chính là mã VCL-...). Không đè field backend.
 */
const toConsignmentRecord = (dto) => {
  if (!dto || typeof dto !== "object") {
    return dto;
  }

  const code = dto.consignmentCode ?? null;

  return {
    ...dto,
    orderCode: dto.orderCode ?? code,
    trackingCode: dto.trackingCode ?? code,
  };
};

/* Bộ lọc danh sách mà component đôi khi đặt thẳng ở options thay vì options.params. */
const TOP_LEVEL_LIST_FILTERS = [
  "status",
  "search",
  "keyword",
  "q",
  "searchCode",
];

/* Thứ tự ưu tiên khi nhiều khoá từ khoá cùng có giá trị. */
const SEARCH_KEYS = ["searchCode", "search", "keyword", "q"];

const isEmptyParam = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "");

const toStatusParam = (value) => {
  const text = Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean).join(",")
    : String(value ?? "").trim();

  return text || null;
};

/**
 * Chuẩn hoá mọi kiểu gọi getConsignmentsApi về query mà backend thật sự bind:
 * GET /api/orders/consignments?pageNumber&pageSize&status&searchCode&orderType.
 *
 * Backend BỎ QUA mọi tham số khác (fromDate, toDate...) và searchCode chỉ khớp
 * mã ký gửi VCL-, nên không gửi chúng: gửi đi mà không có tác dụng thì khách
 * tưởng đã lọc. Từ khoá search / keyword / q được đổi sang searchCode.
 *
 * Kiểu gọi đang có trong app:
 * - getConsignmentsApi(1, 30)
 * - getConsignmentsApi(page, size, { signal, params: { search, status, fromDate, toDate } })
 * - getConsignmentsApi({ params: { pageNumber, pageSize, status }, signal })
 * - getConsignmentsApi({ pageNumber, pageSize, keyword, status })
 */
const resolveConsignmentListRequest = (
  pageNumberOrOptions,
  pageSize,
  options
) => {
  let opts = options || {};
  let page = 1;
  let size = DEFAULT_PAGE_SIZE;
  let filters = {};

  if (
    typeof pageNumberOrOptions === "number" ||
    typeof pageNumberOrOptions === "string"
  ) {
    page = Number(pageNumberOrOptions) || 1;
    size = Number(pageSize) || DEFAULT_PAGE_SIZE;
    filters = { ...(opts.params || {}) };
  } else if (
    typeof pageNumberOrOptions === "object" &&
    pageNumberOrOptions !== null
  ) {
    opts = pageNumberOrOptions;
    const extraParams = opts.params || {};

    page = Number(extraParams.pageNumber || opts.pageNumber) || 1;
    size =
      Number(extraParams.pageSize || opts.pageSize) || DEFAULT_PAGE_SIZE;

    filters = {
      ...Object.fromEntries(
        TOP_LEVEL_LIST_FILTERS.filter((key) => key in opts).map((key) => [
          key,
          opts[key],
        ])
      ),
      ...extraParams,
    };
  }

  const searchKey = SEARCH_KEYS.find((key) => !isEmptyParam(filters[key]));
  const searchCode = searchKey ? String(filters[searchKey]).trim() : "";
  const status = toStatusParam(filters.status);

  return {
    params: {
      pageNumber: page,
      pageSize: size,
      ...(status ? { status } : {}),
      ...(searchCode ? { searchCode } : {}),
      /* Luôn lọc đơn ký gửi, không thì đơn mua hộ (PUR-) lẫn vào. */
      orderType: CONSIGNMENT_ORDER_TYPE,
    },
    signal: getSignal(opts),
  };
};

/**
 * Backend: { items, totalCount, pageNumber, pageSize, totalPages }.
 * Trả đúng shape paginate() của bản mock (cả tên rút gọn lẫn tên API).
 */
const toConsignmentPage = (pageData, requestedPage, requestedSize) => {
  const data =
    pageData && typeof pageData === "object" && !Array.isArray(pageData)
      ? pageData
      : { items: toArray(pageData) };

  const items = toArray(data.items).map(toConsignmentRecord);

  const totalCount = Number.isFinite(Number(data.totalCount))
    ? Number(data.totalCount)
    : items.length;

  const pageNumber = Number(data.pageNumber) || requestedPage;
  const size = Number(data.pageSize) || requestedSize;

  const totalPages = Math.max(
    1,
    Number(data.totalPages) || Math.ceil(totalCount / size) || 1
  );

  return {
    items,
    total: totalCount,
    page: pageNumber,
    size,
    totalPages,

    totalCount,
    pageNumber,
    pageSize: size,
  };
};

/**
 * Sổ địa chỉ backend chỉ có { id, customerId, address, createdAt }.
 * Thêm alias id/fullAddress mà màn tạo đơn (normalizeDeliveryAddress) đọc.
 */
const toDeliveryAddress = (item) => {
  if (!item || typeof item !== "object") {
    return item;
  }

  const id = item.id ?? item.deliveryAddressId ?? item.addressId ?? null;
  const address = String(item.address ?? item.fullAddress ?? "").trim();

  return {
    ...item,
    id,
    deliveryAddressId: item.deliveryAddressId ?? id,
    addressId: item.addressId ?? id,
    address,
    fullAddress: item.fullAddress ?? address,
    receiverAddress: item.receiverAddress ?? address,
    isDefault: Boolean(item.isDefault),
  };
};

/* =========================================================
   CONSIGNMENT
   ========================================================= */

/**
 * POST /api/orders/consignments → 201 { message, data: CreateConsignmentResponse }.
 * Lỗi: 400 { message } hoặc ValidationProblemDetails { errors }, 409 { message }.
 */
export const createConsignmentApi = async (
  payload,
  options = {}
) => {
  /* Lỗi dữ liệu form ném ra TRƯỚC khi gọi mạng, kèm câu tiếng Việt. */
  const requestPayload =
    buildCreateConsignmentRequest(payload);

  try {
    const response = await httpClient.post(
      "/api/orders/consignments",
      requestPayload,
      { signal: getSignal(options) }
    );

    return toConsignmentRecord(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi tạo đơn ký gửi:", error);

    throw error;
  }
};

/**
 * GET /api/orders/consignments → { message, data: { items, totalCount, pageNumber, pageSize, totalPages } }.
 * Khách chỉ thấy đơn của mình; từ khoá tìm kiếm đi qua searchCode (mã VCL-).
 */
export const getConsignmentsApi = async (
  pageNumberOrOptions = {},
  pageSize,
  options = {}
) => {
  const { params, signal } = resolveConsignmentListRequest(
    pageNumberOrOptions,
    pageSize,
    options
  );

  try {
    const response = await httpClient.get(
      "/api/orders/consignments",
      { params, signal }
    );

    return toConsignmentPage(
      unwrapData(response.data),
      params.pageNumber,
      params.pageSize
    );
  } catch (error) {
    logApiError("Lỗi lấy danh sách đơn ký gửi:", error);

    throw error;
  }
};

/**
 * GET /api/orders/consignments/{orderId} → { message, data }.
 * Backend chỉ nhận GUID; không phải chủ đơn thì 401 { message } (không đăng xuất).
 */
export const getConsignmentDetailApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  /* Mã đơn / id không phải GUID: backend sẽ trả 400 ModelState khó hiểu, báo "không tìm thấy" luôn. */
  if (!UUID_PATTERN.test(id)) {
    throw createApiError(
      404,
      "Không tìm thấy đơn ký gửi."
    );
  }

  try {
    const response = await httpClient.get(
      `/api/orders/consignments/${encodeURIComponent(id)}`,
      { signal: getSignal(options) }
    );

    return toConsignmentRecord(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy chi tiết đơn ký gửi:", error);

    throw error;
  }
};

/* =========================================================
   DELIVERY ADDRESS
   ========================================================= */

/** GET /api/delivery-addresses → mảng trần DeliveryAddressResponse. */
export const getDeliveryAddressesApi = async (
  options = {}
) => {
  try {
    const response = await httpClient.get(
      "/api/delivery-addresses",
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data)).map(toDeliveryAddress);
  } catch (error) {
    logApiError("Lỗi lấy danh sách địa chỉ:", error);

    throw error;
  }
};

/** POST /api/delivery-addresses { address } → { message, data }. */
export const createDeliveryAddressApi = async (payload) => {
  const address = String(payload?.address || "").trim();

  if (!address) {
    throw new Error("Vui lòng nhập địa chỉ nhận hàng.");
  }

  try {
    const response = await httpClient.post(
      "/api/delivery-addresses",
      { address }
    );

    /*
     * Giữ lại field form gửi lên (tỉnh/huyện/xã): màn tạo đơn dựng lại địa chỉ
     * vừa lưu từ chính kết quả này khi bước tải lại danh sách lỗi.
     */
    return {
      ...payload,
      ...toDeliveryAddress(unwrapData(response.data)),
    };
  } catch (error) {
    logApiError("Lỗi tạo địa chỉ nhận hàng:", error);

    throw error;
  }
};

/** DELETE /api/delivery-addresses/{id} → { message }. */
export const deleteDeliveryAddressApi = async (
  deliveryAddressId,
  options = {}
) => {
  const id = String(deliveryAddressId || "").trim();

  if (!id) {
    throw new Error("ID địa chỉ nhận hàng không hợp lệ.");
  }

  try {
    const response = await httpClient.delete(
      `/api/delivery-addresses/${encodeURIComponent(id)}`,
      { signal: getSignal(options) }
    );

    return {
      success: true,
      deliveryAddressId: id,
      message: "Đã xóa địa chỉ nhận hàng.",
      ...(response.data && typeof response.data === "object"
        ? response.data
        : {}),
    };
  } catch (error) {
    logApiError("Lỗi xóa địa chỉ nhận hàng:", error);

    throw error;
  }
};

/* =========================================================
   BÁO GIÁ + CỌC — ĐÃ NỐI API THẬT (đợt B, bám QuotationController /
   ConsignmentPaymentService / PurchasePaymentController của VCL_API)
   ========================================================= */

/**
 * GET /api/orders/{orderId}/quotation → { message, data: QuotationDetailResponse }.
 *
 * Trả thẳng `data` (quotationId, quoteType, status, canCustomerAccept, các khoản phí,
 * additionalFees[], parcels[]...). Backend chỉ trả báo giá khách được thấy:
 * DRAFT (tạm tính), PENDING (chính thức chờ khách), ACCEPTED, REJECTED.
 * 404 { message } khi đơn chưa có báo giá; 403 { message } khi không phải chủ đơn.
 */
export const getOrderQuotationApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  /* Mã đơn / id không phải GUID: backend trả 400 ModelState, báo "không tìm thấy" luôn. */
  if (!UUID_PATTERN.test(id)) {
    throw createApiError(
      404,
      "Không tìm thấy đơn hàng cần xem báo giá."
    );
  }

  try {
    const response = await httpClient.get(
      `/api/orders/${encodeURIComponent(id)}/quotation`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi lấy báo giá đơn hàng:", error);

    throw error;
  }
};

const requireQuotationId = (quotationId) => {
  const id = String(quotationId || "").trim();

  if (!id) {
    throw new Error("Không tìm thấy mã định danh báo giá.");
  }

  return id;
};

/**
 * PUT /api/quotations/{quotationId}/reject { rejectionReason } (bắt buộc)
 * → { message, status: "QUOTATION_REJECTED", rejectionReason, consignment }.
 * Lý do rỗng bị chặn tại chỗ, không gọi mạng (backend cũng trả 400).
 */
export const rejectConsignmentQuotationApi = async (
  quotationId,
  rejectionReason,
  options = {}
) => {
  const id = requireQuotationId(quotationId);
  const reason = String(rejectionReason ?? "").trim();

  if (!reason) {
    throw new Error("Vui lòng ghi lý do từ chối báo giá.");
  }

  try {
    const response = await httpClient.put(
      `/api/quotations/${encodeURIComponent(id)}/reject`,
      { rejectionReason: reason },
      { signal: getSignal(options) }
    );

    const body =
      response.data && typeof response.data === "object"
        ? response.data
        : {};

    return {
      ...body,
      quotationId: id,
      rejectionReason: body.rejectionReason ?? reason,
    };
  } catch (error) {
    logApiError("Lỗi từ chối báo giá:", error);

    throw error;
  }
};

/* Khách chỉ được chọn payOS hoặc chuyển khoản tay (SePay production chưa có khoá webhook). */
export const CONSIGNMENT_PAYMENT_METHODS = Object.freeze({
  PAYOS: "PAYOS",
  OFFLINE: "OFFLINE",
});

/**
 * PUT /api/quotations/{quotationId}/confirm-and-pay { paymentMethod, returnUrl, cancelUrl }
 * → { message, data: ConfirmQuotationPaymentResponse } — hàm trả `data`.
 *
 * - PAYOS: data.checkoutUrl là link payOS; payOS quay về /history/consignment
 *   (backend tự chọn domain, bỏ qua returnUrl/cancelUrl ngoài việc dò localhost).
 * - OFFLINE: checkoutUrl null, paymentStatus PENDING_RECONCILIATION (chờ Admin đối soát).
 * - Tỷ lệ cọc 0%: amount 0, orderCode 0, paymentStatus PAID.
 * Số tiền (amount, depositRate, totalBillAmount) luôn lấy từ đây, FE không tự tính.
 */
export const confirmAndPayConsignmentQuotationApi = async (
  quotationId,
  { paymentMethod, returnUrl, cancelUrl } = {},
  options = {}
) => {
  const id = requireQuotationId(quotationId);
  const method = String(paymentMethod || "").trim().toUpperCase();

  if (!Object.values(CONSIGNMENT_PAYMENT_METHODS).includes(method)) {
    throw new Error("Phương thức thanh toán không hợp lệ.");
  }

  const body = { paymentMethod: method };

  if (returnUrl) body.returnUrl = String(returnUrl);
  if (cancelUrl) body.cancelUrl = String(cancelUrl);

  try {
    const response = await httpClient.put(
      `/api/quotations/${encodeURIComponent(id)}/confirm-and-pay`,
      body,
      { signal: getSignal(options) }
    );

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi xác nhận báo giá và tạo thanh toán cọc:", error);

    throw error;
  }
};

/**
 * GET /api/payments/status/{orderCode} (không cần đăng nhập)
 * → { orderCode, amount, status, paymentMethod } (không bọc envelope).
 * 404 { message } khi không có giao dịch.
 */
export const getConsignmentPaymentStatusApi = async (
  orderCode,
  options = {}
) => {
  const code = String(orderCode ?? "").trim();

  if (!/^\d+$/.test(code)) {
    throw createApiError(404, "Không tìm thấy thông tin giao dịch.");
  }

  try {
    const response = await httpClient.get(
      `/api/payments/status/${code}`,
      { signal: getSignal(options) }
    );

    return unwrapData(response.data);
  } catch (error) {
    logApiError("Lỗi kiểm tra trạng thái thanh toán:", error);

    throw error;
  }
};

/* =========================================================
   PHÍ LƯU KHO — ĐÃ NỐI API THẬT
   ========================================================= */

/**
 * GET /api/storage-fee/estimate → { message, data: StorageFeeEstimateDto }
 * { freeDays, graceDays, totalFreeDays, unitPrice, currency,
 *   samples: [{ days, chargeableDays, amountPerParcel }], note }.
 *
 * Bảng phí lưu kho kho VN để khách cân nhắc trước khi tick "gửi lại kho". Chưa gắn với
 * đơn nào (chỉ cần đăng nhập) nên gọi được ngay lúc tạo đơn. Số này cùng chỗ tính với
 * hoá đơn thật — khách thấy sao thì trả vậy.
 */
export const getStorageFeeEstimateApi = async (
  options = {}
) => {
  try {
    const response = await httpClient.get(
      "/api/storage-fee/estimate",
      { signal: getSignal(options) }
    );

    const data = unwrapData(response.data) || {};

    return {
      ...data,
      currency: data.currency || "VND",
      samples: Array.isArray(data.samples) ? data.samples : [],
    };
  } catch (error) {
    logApiError("Lỗi lấy bảng phí lưu kho:", error);

    throw error;
  }
};

/* =========================================================
   DỮ LIỆU FORM — không cần đăng nhập
   ========================================================= */

/**
 * GET /api/orders/consignments/routes → { message, data: string[] }.
 * Backend trả TÊN HIỂN THỊ ("Trung quốc --> Việt Nam"), gửi lại nguyên chuỗi
 * đó khi tạo đơn — backend tự chuẩn hoá về mã tuyến.
 */
export const getConsignmentRoutesApi = async (
  options = {}
) => {
  try {
    const response = await httpClient.get(
      "/api/orders/consignments/routes",
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy danh sách tuyến hàng:", error);

    throw error;
  }
};

/** GET /api/orders/consignments/shipping-options → { message, data: string[] }. */
export const getConsignmentShippingOptionsApi = async (
  options = {}
) => {
  try {
    const response = await httpClient.get(
      "/api/orders/consignments/shipping-options",
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy hình thức vận chuyển:", error);

    throw error;
  }
};

/**
 * GET /api/orders/consignments/item-services?route=&shippingOption=
 * → { message, data: [{ pricingRuleId, code, name, ruleType, calculationType,
 *     value, minAmount, maxAmount, description }] }.
 * Dịch vụ khách chọn cho từng kiện (kiểm hàng, bảo hiểm, đóng lại carton...).
 * Backend chỉ lọc theo phương án khi có đủ cả route và shippingOption.
 */
export const getConsignmentItemServicesApi = async (
  { route, shippingOption } = {},
  options = {}
) => {
  const params =
    route && shippingOption
      ? { route, shippingOption }
      : undefined;

  try {
    const response = await httpClient.get(
      "/api/orders/consignments/item-services",
      { params, signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data)).filter(
      (service) => service?.pricingRuleId
    );
  } catch (error) {
    logApiError("Lỗi lấy dịch vụ theo kiện:", error);

    throw error;
  }
};

/**
 * GET /api/orders/consignments/{orderId}/timeline
 * → { message, data: [{ event, fromStatus, toStatus, note, actorName, at }] } (cũ → mới).
 * Khách chỉ xem đơn của mình (403 với đơn người khác).
 */
export const getConsignmentTimelineApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw createApiError(404, "Không tìm thấy đơn ký gửi.");
  }

  try {
    const response = await httpClient.get(
      `/api/orders/consignments/${encodeURIComponent(id)}/timeline`,
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy lịch sử đơn:", error);

    throw error;
  }
};

/**
 * GET /api/product-types → { message, data: [{ id, name }] }.
 * Màn tạo đơn lấy id làm value, nên productType gửi đi là id loại hàng.
 */
export const getProductTypesApi = async (options = {}) => {
  try {
    const response = await httpClient.get(
      "/api/product-types",
      { signal: getSignal(options) }
    );

    return toArray(unwrapData(response.data));
  } catch (error) {
    logApiError("Lỗi lấy danh sách loại sản phẩm:", error);

    throw error;
  }
};

/**
 * PUT /api/orders/consignments/{orderId}/cancel — backend bắt buộc có body.
 * Có lý do thì gửi { cancelReason }, không có thì gửi {}.
 * → { message, status, consignmentCode, data: CancelConsignmentResponse }.
 * 400 { message } khi đơn đã có khoản thanh toán PAID.
 */
export const cancelConsignmentApi = async (
  orderId,
  cancelReason,
  options = {}
) => {
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedReason = String(cancelReason ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    const response = await httpClient.put(
      `/api/orders/consignments/${encodeURIComponent(normalizedOrderId)}/cancel`,
      normalizedReason ? { cancelReason: normalizedReason } : {},
      { signal: getSignal(options) }
    );

    const body =
      response.data && typeof response.data === "object"
        ? response.data
        : {};
    const result = unwrapData(body) || {};

    return {
      success: true,
      ...result,
      orderId: result.orderId ?? normalizedOrderId,
      orderCode: result.consignmentCode ?? body.consignmentCode ?? null,
      consignmentCode: result.consignmentCode ?? body.consignmentCode ?? null,
      status: result.status ?? body.status ?? "CANCELLED",
      cancelReason: result.cancelReason ?? (normalizedReason || null),
      message: body.message ?? "Đơn ký gửi đã được hủy.",
    };
  } catch (error) {
    logApiError("Lỗi hủy đơn ký gửi:", error);

    throw error;
  }
};

/* =========================================================
   VALIDATE CONSIGNMENT ITEMS
   ========================================================= */

export const validateConsignmentItemsApi = async (
  items,
  options = {}
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      "Danh sách sản phẩm kiểm tra không hợp lệ."
    );
  }

  const normalizedItems = items.map((item, index) => {
    const productName = String(
      item?.productName || ""
    ).trim();

    const productType = String(
      item?.productType || ""
    ).trim();

    const quantity = Number(item?.quantity);
    const weight = Number(item?.weight);
    const width = Number(item?.width);
    const height = Number(item?.height);
    const length = Number(item?.length);
    const declaredValue = Number(
      item?.declaredValue
    );

    const referenceUrls =
      normalizeReferenceUrls(
        item?.referenceUrls ??
          (
            item?.referenceUrl
              ? [item.referenceUrl]
              : []
          ),
        index
      );

    const referenceUrl =
      referenceUrls[0] || "";

    const domesticTrackingCode = String(
      item?.domesticTrackingCode || ""
    ).trim();

    if (!productName) {
      throw new Error(
        `Sản phẩm ${index + 1}: Tên sản phẩm không hợp lệ.`
      );
    }

    if (!productType) {
      throw new Error(
        `Sản phẩm ${index + 1}: Loại sản phẩm không hợp lệ.`
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Sản phẩm ${index + 1}: Số lượng phải là số nguyên lớn hơn 0.`
      );
    }

    if (
      quantity > 2147483647
    ) {
      throw new Error(
        `Sản phẩm ${index + 1}: Số lượng vượt quá giới hạn cho phép.`
      );
    }

    const positiveNumberFields = [
      {
        value: weight,
        label: "Cân nặng",
      },
      {
        value: width,
        label: "Chiều rộng",
      },
      {
        value: height,
        label: "Chiều cao",
      },
      {
        value: length,
        label: "Chiều dài",
      },
      {
        value: declaredValue,
        label: "Giá trị kiện hàng",
      },
    ];

    positiveNumberFields.forEach(
      ({ value, label }) => {
        if (
          !Number.isFinite(value) ||
          value <= 0
        ) {
          throw new Error(
            `Sản phẩm ${index + 1}: ${label} phải lớn hơn 0.`
          );
        }
      }
    );

    if (!referenceUrl) {
      throw new Error(
        `Sản phẩm ${index + 1}: Ảnh sản phẩm không hợp lệ.`
      );
    }

    return {
      productName,
      productType,
      quantity,
      weight,
      width,
      height,
      length,
      declaredValue,

      /*
       * referenceUrl giữ để tương thích API validate cũ.
       * referenceUrls là schema mới của API tạo đơn.
       */
      referenceUrl,
      referenceUrls,

      domesticTrackingCode:
        domesticTrackingCode || null,

      packageConfigurationId:
        normalizeNullableGuid(
          item?.packageConfigurationId,
          "packageConfigurationId",
          index
        ),
    };
  });

  try {
    /* POST /api/orders/consignments/validate-items → { message, data: { canCreate, results } }. */
    const response = await httpClient.post(
      "/api/orders/consignments/validate-items",
      { items: normalizedItems },
      { signal: getSignal(options) }
    );

    const result = unwrapData(response.data) || {};
    const results = toArray(result.results);
    const canCreate = result.canCreate !== false;

    /*
     * Hàng cấm không bị ném lỗi ở đây: POST tạo đơn sẽ trả 400 kèm tên mặt
     * hàng cấm, component hiện nguyên câu đó. Hàng hạn chế chỉ là cảnh báo.
     */
    return {
      isValid: canCreate,
      valid: canCreate,
      canCreate,
      errors: results.filter(
        (item) => String(item?.level || "").toUpperCase() === "BANNED"
      ),
      messages: results
        .map((item) => item?.reason || item?.matchedItem)
        .filter(Boolean),
      results,
      items: normalizedItems,
    };
  } catch (error) {
    logApiError("Lỗi kiểm tra thông tin kiện hàng:", error);

    throw error;
  }
};

/* =========================================================
   ĐỔI TRẠNG THÁI ĐƠN — VẪN LÀ MOCK (thao tác của Sale, không thuộc app khách)
   ========================================================= */

export const updateConsignmentStatusApi = async (
  orderId,
  status,
  rejectionReason = "",
  options = {}
) => {
  const normalizedOrderId = String(
    orderId || ""
  ).trim();

  const normalizedStatus = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  const normalizedRejectionReason = String(
    rejectionReason || ""
  ).trim();

  if (!normalizedOrderId) {
    throw new Error(
      "Không tìm thấy mã đơn hàng."
    );
  }

  if (!normalizedStatus) {
    throw new Error(
      "Vui lòng chọn trạng thái đơn hàng."
    );
  }

  if (
    normalizedStatus === "REJECTED" &&
    !normalizedRejectionReason
  ) {
    throw new Error(
      "Vui lòng nhập lý do từ chối."
    );
  }

  try {
    /* API THẬT: axiosInstance.put(`/api/orders/consignments/${id}/status`, { status, rejectionReason }, { signal }) */
    await delay(340, getSignal(options));

    const consignment =
      findConsignmentById(normalizedOrderId) ||
      findConsignmentByCode(normalizedOrderId);

    if (!consignment) {
      throw createApiError(
        404,
        "Không tìm thấy đơn ký gửi cần cập nhật."
      );
    }

    const updatedAt = nowIso();

    consignment.status = normalizedStatus;
    consignment.updatedAt = updatedAt;
    consignment.statusUpdatedAt = updatedAt;
    consignment.rejectionReason =
      normalizedStatus === "REJECTED"
        ? normalizedRejectionReason
        : null;

    return {
      success: true,
      orderId: consignment.orderId,
      orderCode: consignment.orderCode,
      status: consignment.status,
      rejectionReason:
        normalizedStatus === "REJECTED"
          ? normalizedRejectionReason
          : "",
      updatedAt,
      message: "Đã cập nhật trạng thái đơn ký gửi.",
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi cập nhật trạng thái đơn ký gửi:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};
