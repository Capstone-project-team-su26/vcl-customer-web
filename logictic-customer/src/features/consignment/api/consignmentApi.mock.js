/* =========================================================
   ⚠ BẢN SAO MOCK TẠM THỜI — KHÔNG NỐI API THẬT VÀO FILE NÀY.

   File này là bản sao NGUYÊN VĂN bản mock của consignmentApi.js (chụp trước khi
   consignmentApi.js được nối API thật ở đợt A), chỉ dành cho các màn NGOÀI đợt A
   để chúng không trộn dữ liệu thật với dữ liệu mẫu.

   - Không làm theo hướng dẫn "CẮM / NỐI API THẬT" trong comment bên dưới:
     làm vậy là tạo ra module API thật thứ hai. API thật chỉ nằm ở consignmentApi.js.
   - Khi các màn đang import file này tới đợt của mình, đổi import của chúng
     về consignmentApi.js; không còn ai import thì XOÁ file này (và mục của nó trong
     tools/api-contract.json).
   ========================================================= */

/* =========================================================
   consignmentApi.js — BẢN MOCK cho build UI-only.

   Tầng HTTP thật (axiosInstance + @shared/api/httpClient) đã bị gỡ khỏi dự án,
   nên module này đọc dữ liệu mẫu từ src/mocks/data thay vì gọi server. Toàn bộ
   tên hàm, thứ tự tham số và SHAPE trả về được giữ y hệt bản gọi API thật để
   không một component nào phải sửa.

   Cắm API thật trở lại:
   - Bỏ import từ "@/mocks/*", import lại axiosInstance.
   - Trong mỗi hàm, thay khối đọc fixture bằng đúng lời gọi axios ghi ở comment
     "API THẬT:" ngay phía trên, rồi return response.data như cũ.
   - Các hàm chuẩn hoá payload (buildCreateConsignmentRequest,
     normalizeConsignmentItem, validateConsignmentItemsApi...) là logic thuần,
     KHÔNG đụng tới mạng — giữ nguyên, dùng lại được ngay.
   ========================================================= */

import catalog from "@/mocks/data/catalog";
import {
  consignments as consignmentStore,
  findConsignmentById,
  findConsignmentByCode,
  MOCK_CUSTOMER,
} from "@/mocks/data/consignments";
import {
  deepClone,
  delay,
  makeOrderCode,
  newUuid,
  normalizeText,
  nowIso,
  paginate,
} from "@/mocks/mockUtils";

const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";


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

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return [
    "true",
    "1",
    "yes",
    "on",
  ].includes(
    String(value ?? "")
      .trim()
      .toLowerCase()
  );
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
  index,
  options = {}
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

  const requiresWoodenCrate =
    Boolean(options?.requiresWoodenCrate);

  const packageConfigurationId =
    normalizeNullableGuid(
      item?.packageConfigurationId,
      "packageConfigurationId",
      index
    );

  if (
    requiresWoodenCrate &&
    !packageConfigurationId
  ) {
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

    /*
     * Không chọn đóng thùng gỗ thì loại dữ liệu cũ,
     * tránh gửi nhầm cấu hình còn sót trong state.
     */
    packageConfigurationId:
      requiresWoodenCrate
        ? packageConfigurationId
        : null,
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

  const requiresInspection =
    normalizeBoolean(
      payload?.requiresInspection
    );

  const requiresPacking =
    normalizeBoolean(
      payload?.requiresPacking
    );

  const requiresWoodenCrate =
    normalizeBoolean(
      payload?.requiresWoodenCrate
    );

  const requiresInsurance =
    normalizeBoolean(
      payload?.requiresInsurance
    );

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

    pricingRuleIds: normalizePricingRuleIds(
      payload?.pricingRuleIds,
      "pricingRuleIds"
    ),

    requiresInspection,
    requiresPacking,
    requiresWoodenCrate,
    requiresInsurance,

    note: String(
      payload?.note ?? ""
    ).trim(),

    items: payload.items.map(
      (item, index) =>
        normalizeConsignmentItem(
          item,
          index,
          {
            requiresWoodenCrate,
          }
        )
    ),
  };
};

/* =========================================================
   TIỆN ÍCH RIÊNG CỦA TẦNG MOCK
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

const upperCase = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

/* Ngày dạng YYYY-MM-DD theo UTC, để so với fromDate/toDate của bộ lọc lịch sử. */
const toUtcDateOnly = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

/*
 * Hệ số quy đổi thể tích đọc từ rule VOLUMETRIC_DIVISOR của danh mục
 * pricingRules. Thiếu rule thì dùng mặc định 6000 và cảnh báo.
 */
const FALLBACK_VOLUMETRIC_DIVISOR = 6000;

const resolveVolumetricDivisor = () => {
  const raw = catalog?.findPricingRuleByCode?.("VOLUMETRIC_DIVISOR")?.value;
  const value =
    raw === null || raw === undefined || String(raw).trim() === ""
      ? NaN
      : Number(raw);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  console.warn(
    `[consignmentApi] Thiếu rule VOLUMETRIC_DIVISOR trong pricingRules, dùng mặc định ${FALLBACK_VOLUMETRIC_DIVISOR}.`
  );

  return FALLBACK_VOLUMETRIC_DIVISOR;
};


const round = (value, digits = 4) => {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
};

const findRouteByValue = (value) => {
  const key = upperCase(value);

  return (
    (catalog?.consignmentRoutes || []).find(
      (route) =>
        upperCase(route.code) === key ||
        upperCase(route.value) === key ||
        upperCase(route.name) === key ||
        upperCase(route.id) === key
    ) || null
  );
};

const findProductTypeByValue = (value) => {
  const key = upperCase(value);

  return (
    (catalog?.productTypes || []).find(
      (type) =>
        upperCase(type.productTypeCode) === key ||
        upperCase(type.code) === key ||
        upperCase(type.value) === key ||
        upperCase(type.productTypeName) === key ||
        upperCase(type.name) === key
    ) || null
  );
};

/**
 * Chuỗi dùng để dò từ khoá tìm kiếm của một đơn.
 *
 * Gom đúng những cột đang hiển thị trên bảng danh sách: khách gõ mã vận đơn,
 * tên người nhận hay tên hàng đều phải ra kết quả.
 */
const buildSearchHaystack = (consignment) =>
  normalizeText(
    [
      consignment?.orderCode,
      consignment?.consignmentCode,
      consignment?.trackingCode,
      consignment?.receiverName,
      consignment?.receiverPhone,
      consignment?.receiverAddress,
      consignment?.route,
      consignment?.status,
      consignment?.note,
      ...(Array.isArray(consignment?.itemNames)
        ? consignment.itemNames
        : []),
    ]
      .filter(Boolean)
      .join(" ")
  );

/**
 * Bộ lọc chung của danh sách ký gửi.
 *
 * Component gửi filter theo hai kiểu: bọc trong options.params (ConsignmentList,
 * lịch sử ký gửi) hoặc để thẳng ở options (ReceiveGoods). Nhận cả hai để không
 * màn nào bị bỏ lọc rồi hiện nhầm đơn của tab khác.
 */
const filterConsignments = (rows, filters = {}) => {
  const wantedStatuses = (
    Array.isArray(filters.status)
      ? filters.status
      : String(filters.status ?? "").split(",")
  )
    .map(upperCase)
    .filter(Boolean);

  const keyword = normalizeText(
    filters.search ?? filters.keyword ?? filters.q ?? ""
  );

  const fromDate = String(filters.fromDate ?? "").trim();
  const toDate = String(filters.toDate ?? "").trim();

  return rows.filter((consignment) => {
    if (
      wantedStatuses.length > 0 &&
      !wantedStatuses.includes(upperCase(consignment.status))
    ) {
      return false;
    }

    if (
      keyword &&
      !buildSearchHaystack(consignment).includes(keyword)
    ) {
      return false;
    }

    if (fromDate || toDate) {
      const createdDate = toUtcDateOnly(consignment.createdAt);

      if (!createdDate) {
        return false;
      }

      if (fromDate && createdDate < fromDate) {
        return false;
      }

      if (toDate && createdDate > toDate) {
        return false;
      }
    }

    return true;
  });
};

/* Đơn mới nhất lên đầu, đúng thứ tự khách thấy trên mọi bảng danh sách. */
const sortByNewest = (rows) =>
  [...rows].sort(
    (left, right) =>
      new Date(right?.createdAt || 0).getTime() -
      new Date(left?.createdAt || 0).getTime()
  );

/**
 * Dựng một bản ghi ký gửi mới từ payload đã chuẩn hoá của form tạo đơn.
 *
 * Shape phải trùng bản ghi trong fixture: khách bấm "Tạo đơn" xong là điều
 * hướng thẳng sang danh sách chờ duyệt, thiếu field nào thì dòng vừa tạo hiện
 * trống ngay bên cạnh mấy dòng đầy đủ.
 */
const buildConsignmentRecord = (requestPayload) => {
  const createdAt = nowIso();

  const orderId = newUuid();
  const code = makeOrderCode("VCL", createdAt);

  const route = findRouteByValue(requestPayload.route);

  const items = requestPayload.items.map((item) => {
    const itemId = newUuid();

    const productType = findProductTypeByValue(item.productType);

    const packageConfiguration = item.packageConfigurationId
      ? catalog?.findPackageConfigurationById?.(
          item.packageConfigurationId
        ) || null
      : null;

    return {
      id: itemId,
      itemId,
      orderItemId: itemId,

      productName: item.productName,

      productType:
        productType?.productTypeName || item.productType,
      productTypeCode:
        productType?.productTypeCode || item.productType,
      productTypeName:
        productType?.productTypeName || item.productType,
      productTypeId: productType?.productTypeId || null,

      quantity: item.quantity,
      weight: item.weight,
      length: item.length,
      width: item.width,
      height: item.height,
      declaredValue: item.declaredValue,

      referenceUrls: item.referenceUrls,
      referenceUrl: item.referenceUrls[0],
      imageUrls: item.referenceUrls,

      domesticTrackingCode: item.domesticTrackingCode,

      packageConfigurationId: item.packageConfigurationId,
      packageConfiguration,

      note: "",
    };
  });

  const totalWeight = round(
    items.reduce(
      (total, item) => total + item.weight * item.quantity,
      0
    ),
    2
  );

  const totalVolume = items.reduce(
    (total, item) =>
      total +
      item.length * item.width * item.height * item.quantity,
    0
  );

  /* Đọc hệ số tại thời điểm tính, không chốt lúc import module. */
  const volumetricWeight = round(totalVolume / resolveVolumetricDivisor());

  const chargeableWeight = round(
    Math.max(totalWeight, volumetricWeight)
  );

  const declaredValue = items.reduce(
    (total, item) => total + item.declaredValue,
    0
  );

  const destinationHandling =
    requestPayload.defaultDestinationHandling || "DIRECT_DELIVERY";

  return {
    orderId,
    orderCode: code,
    consignmentCode: code,
    trackingCode: code,
    orderType: "CONSIGNMENT",

    /* Đơn vừa tạo luôn nằm ở hàng chờ duyệt của nhân viên kinh doanh. */
    status: "PENDING_REVIEW",
    consignmentType: requestPayload.shippingOption,
    shippingOption: requestPayload.shippingOption,

    route: route?.name || requestPayload.route,
    routeCode: route?.code || requestPayload.route,

    receiverName: requestPayload.receiverName,
    receiverPhone: requestPayload.receiverPhone,
    receiverAddress: requestPayload.receiverAddress,

    customer: { ...MOCK_CUSTOMER },
    customerName: MOCK_CUSTOMER.fullName,
    customerPhone: MOCK_CUSTOMER.phone,
    customerEmail: MOCK_CUSTOMER.email,

    requiresInspection: requestPayload.requiresInspection,
    requiresPacking: requestPayload.requiresPacking,
    requiresWoodenCrate: requestPayload.requiresWoodenCrate,
    requiresInsurance: requestPayload.requiresInsurance,

    optionalServices: {
      requiresInspection: requestPayload.requiresInspection,
      requiresPacking: requestPayload.requiresPacking,
      requiresWoodenCrate: requestPayload.requiresWoodenCrate,
      requiresInsurance: requestPayload.requiresInsurance,
      selectedPricingRuleIds: [...requestPayload.pricingRuleIds],
      selectedRuleCodes: requestPayload.pricingRuleIds
        .map(
          (ruleId) =>
            catalog?.findPricingRuleById?.(ruleId)?.ruleCode || null
        )
        .filter(Boolean),
    },

    pricingRuleIds: [...requestPayload.pricingRuleIds],
    pricingRuleCodes: requestPayload.pricingRuleIds
      .map(
        (ruleId) =>
          catalog?.findPricingRuleById?.(ruleId)?.ruleCode || null
      )
      .filter(Boolean),

    defaultDestinationHandling: destinationHandling,
    defaultDestinationHandlingText:
      destinationHandling === "STORE_AT_VN"
        ? "Gửi lại kho Việt Nam chờ ghép đơn"
        : "Giao thẳng tới địa chỉ người nhận",

    note: requestPayload.note,

    totalWeight,
    totalVolume,
    volumetricWeight,
    chargeableWeight,
    declaredValue,

    itemCount: items.length,
    itemNames: items.map((item) => item.productName),
    items,

    /* Chưa có báo giá: nhân viên kinh doanh duyệt xong mới lên giá. */
    quotation: null,

    createdAt,
    updatedAt: createdAt,
    statusUpdatedAt: createdAt,
    quotationCreatedAt: null,

    cancelledAt: null,
    cancelReason: null,
    rejectionReason: null,
  };
};

/* =========================================================
   ĐỊA CHỈ NHẬN HÀNG
   =========================================================

   Sổ địa chỉ là dữ liệu của riêng màn tạo đơn, không dùng chung với feature
   nào khác nên để ngay trong module thay vì thêm file dưới src/mocks/data.
   Địa chỉ trùng với người nhận trong fixture đơn ký gửi để dropdown và đơn cũ
   nói cùng một chỗ giao.
   ========================================================= */

const createDeliveryAddressRecord = ({
  id,
  detailAddress,
  wardName,
  wardCode,
  districtName,
  districtCode,
  provinceName,
  provinceCode,
  isDefault = false,
  createdAt,
}) => {
  const fullAddress = [
    detailAddress,
    wardName,
    districtName,
    provinceName,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id,
    deliveryAddressId: id,
    addressId: id,

    /* Component đọc fullAddress trước, address sau — để cả hai cho chắc. */
    address: fullAddress,
    fullAddress,
    receiverAddress: fullAddress,

    detailAddress,
    wardCode,
    wardName,
    districtCode,
    districtName,
    provinceCode,
    provinceName,

    isDefault,
    createdAt,
    updatedAt: createdAt,
  };
};

const deliveryAddressStore = [
  createDeliveryAddressRecord({
    id: "0e1c4f7a-9b52-4d38-8a61-2f7c5d0e4b19",
    detailAddress: "Số 128 Trần Duy Hưng",
    wardName: "P. Trung Hoà",
    wardCode: "00619",
    districtName: "Q. Cầu Giấy",
    districtCode: "005",
    provinceName: "Hà Nội",
    provinceCode: "01",
    isDefault: true,
    createdAt: "2026-04-18T02:31:07.000Z",
  }),
  createDeliveryAddressRecord({
    id: "3b8d6a02-1c47-4e95-9f30-6d4b2a8e7c51",
    detailAddress: "45/7 Nguyễn Văn Trỗi",
    wardName: "P.12",
    wardCode: "27154",
    districtName: "Q. Phú Nhuận",
    districtCode: "768",
    provinceName: "TP. Hồ Chí Minh",
    provinceCode: "79",
    createdAt: "2026-05-06T09:12:44.000Z",
  }),
  createDeliveryAddressRecord({
    id: "7c2e9b45-8f13-4a60-b7d2-5e0a3c1f8d64",
    detailAddress: "Số 6 ngõ 82 Chùa Láng",
    wardName: "P. Láng Thượng",
    wardCode: "00358",
    districtName: "Q. Đống Đa",
    districtCode: "006",
    provinceName: "Hà Nội",
    provinceCode: "01",
    createdAt: "2026-05-21T04:48:12.000Z",
  }),
  createDeliveryAddressRecord({
    id: "a4f70d18-5e93-4b26-8c05-9b7d1e6a2f30",
    detailAddress: "212 Nguyễn Hữu Thọ",
    wardName: "P. Hoà Thuận Tây",
    wardCode: "20218",
    districtName: "Q. Hải Châu",
    districtCode: "492",
    provinceName: "Đà Nẵng",
    provinceCode: "48",
    createdAt: "2026-06-09T07:05:36.000Z",
  }),
  createDeliveryAddressRecord({
    id: "d6019b73-2a58-4c81-9e47-0f3b5d8c6a25",
    detailAddress: "Kho B2, KCN Sóng Thần 1",
    wardName: "P. Dĩ An",
    wardCode: "25891",
    districtName: "TP. Dĩ An",
    districtCode: "724",
    provinceName: "Bình Dương",
    provinceCode: "74",
    createdAt: "2026-07-02T01:57:20.000Z",
  }),
  createDeliveryAddressRecord({
    id: "f8532c60-7d41-49ba-a3e8-1c6f0b9d4e72",
    detailAddress: "Số 39 Lê Lợi",
    wardName: "P. Máy Tơ",
    wardCode: "11614",
    districtName: "Q. Ngô Quyền",
    districtCode: "305",
    provinceName: "Hải Phòng",
    provinceCode: "31",
    createdAt: "2026-07-28T08:23:51.000Z",
  }),
];

/* =========================================================
   CONSIGNMENT
   ========================================================= */

export const createConsignmentApi = async (
  payload,
  options = {}
) => {
  const requestPayload =
    buildCreateConsignmentRequest(payload);

  try {
    console.info(
      "[Consignment API — MOCK] POST /api/orders/consignments",
      requestPayload
    );

    /* API THẬT: axiosInstance.post("/api/orders/consignments", requestPayload, { signal }) */
    await delay(420, getSignal(options));

    const created = buildConsignmentRecord(requestPayload);

    /* Đơn mới lên đầu sổ để khách quay ra danh sách là thấy ngay. */
    consignmentStore.unshift(created);

    return deepClone(created);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi tạo đơn ký gửi:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentsApi = async (
  pageNumberOrOptions = {},
  pageSize,
  options = {}
) => {
  try {
    let opts = options;
    let page = 1;
    let size = 10;
    let extraParams = {};

    if (
      typeof pageNumberOrOptions === "number" ||
      typeof pageNumberOrOptions === "string"
    ) {
      page = Number(pageNumberOrOptions) || 1;
      size = Number(pageSize) || 10;
      opts = options || {};
      extraParams = opts.params || {};
    } else if (
      typeof pageNumberOrOptions === "object" &&
      pageNumberOrOptions !== null
    ) {
      opts = pageNumberOrOptions;
      extraParams = opts.params || {};
      page =
        Number(extraParams.pageNumber || opts.pageNumber) ||
        1;
      size =
        Number(extraParams.pageSize || opts.pageSize) ||
        10;
    }

    const mergedParams = {
      pageNumber: page,
      pageSize: size,
      ...extraParams,
    };

    /* API THẬT: axiosInstance.get("/api/orders/consignments", { params: mergedParams, signal }) */
    await delay(260, getSignal(opts));

    /*
     * Lọc lấy cả filter đặt thẳng trên opts: ReceiveGoods truyền
     * { pageNumber, pageSize, keyword, status } làm tham số đầu tiên,
     * không bọc trong params.
     */
    const filtered = filterConsignments(
      sortByNewest(consignmentStore),
      {
        ...(typeof opts === "object" && opts !== null ? opts : {}),
        ...extraParams,
      }
    );

    const pageData = paginate(filtered, {
      page: mergedParams.pageNumber,
      size: mergedParams.pageSize,
    });

    return {
      ...pageData,
      items: deepClone(pageData.items),
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentDetailApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    /* API THẬT: axiosInstance.get(`/api/orders/consignments/${id}`, { signal }) */
    await delay(280, getSignal(options));

    /* Vài màn điều hướng bằng mã đơn thay vì GUID, nên dò cả hai. */
    const consignment =
      findConsignmentById(id) || findConsignmentByCode(id);

    if (!consignment) {
      throw createApiError(
        404,
        "Không tìm thấy đơn ký gửi."
      );
    }

    return deepClone(consignment);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy chi tiết đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   DELIVERY ADDRESS
   ========================================================= */

export const getDeliveryAddressesApi = async (
  options = {}
) => {
  try {
    /* API THẬT: axiosInstance.get("/api/delivery-addresses", { signal }) */
    await delay(200, getSignal(options));

    return deepClone(deliveryAddressStore);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách địa chỉ:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const createDeliveryAddressApi = async (payload) => {
  const address = String(payload?.address || "").trim();

  if (!address) {
    throw new Error("Vui lòng nhập địa chỉ nhận hàng.");
  }

  try {
    /* API THẬT: axiosInstance.post("/api/delivery-addresses", { address }) */
    await delay(320);

    const createdAt = nowIso();
    const id = newUuid();

    /*
     * Giữ lại mọi field form gửi lên (tỉnh/huyện/xã) chứ không chỉ chuỗi
     * address: màn tạo đơn dựng lại địa chỉ vừa lưu từ chính payload này khi
     * bước tải lại danh sách lỗi.
     */
    const created = {
      ...payload,

      id,
      deliveryAddressId: id,
      addressId: id,

      address,
      fullAddress: String(
        payload?.fullAddress || address
      ).trim(),
      receiverAddress: String(
        payload?.receiverAddress || address
      ).trim(),

      provinceCode: String(payload?.provinceCode ?? "").trim(),
      districtCode: String(payload?.districtCode ?? "").trim(),
      wardCode: String(payload?.wardCode ?? "").trim(),

      isDefault: Boolean(payload?.isDefault),

      createdAt,
      updatedAt: createdAt,
    };

    deliveryAddressStore.push(created);

    return deepClone(created);
  } catch (error) {
    console.error(
      "Lỗi tạo địa chỉ nhận hàng:",
      error?.response?.data || error?.message
    );

    throw error;
  }
};

export const deleteDeliveryAddressApi = async (
  deliveryAddressId,
  options = {}
) => {
  const id = String(deliveryAddressId || "").trim();

  if (!id) {
    throw new Error("ID địa chỉ nhận hàng không hợp lệ.");
  }

  try {
    /* API THẬT: axiosInstance.delete(`/api/delivery-addresses/${id}`, { signal }) */
    await delay(240, getSignal(options));

    const index = deliveryAddressStore.findIndex(
      (item) =>
        String(item.deliveryAddressId) === id ||
        String(item.id) === id
    );

    if (index === -1) {
      throw createApiError(
        404,
        "Không tìm thấy địa chỉ nhận hàng."
      );
    }

    deliveryAddressStore.splice(index, 1);

    return {
      success: true,
      deliveryAddressId: id,
      message: "Đã xóa địa chỉ nhận hàng.",
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi xóa địa chỉ nhận hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   QUOTATION
   ========================================================= */

export const getOrderQuotationApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    /* API THẬT: axiosInstance.get(`/api/orders/${id}/quotation`, { signal }) */
    await delay(300, getSignal(options));

    const consignment =
      findConsignmentById(id) || findConsignmentByCode(id);

    if (!consignment) {
      throw createApiError(
        404,
        "Không tìm thấy đơn hàng cần xem báo giá."
      );
    }

    if (!consignment.quotation) {
      throw createApiError(
        404,
        "Đơn hàng này chưa có báo giá."
      );
    }

    return deepClone(consignment.quotation);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy báo giá đơn hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   ORDER OPTIONS
   ========================================================= */

/* Mức phí lưu kho lấy từ danh mục pricingRules duy nhất, không gõ số riêng ở đây. */
const findServiceFeeValue = (ruleCode, fallback) => {
  const rule = catalog?.findPricingRuleByCode?.(ruleCode);

  const value = Number(rule?.value);

  return rule && Number.isFinite(value) ? value : fallback;
};

/**
 * Bảng phí lưu kho tại kho VN, để khách cân nhắc trước khi tick "gửi lại kho".
 *
 * Trả về số ngày miễn phí, số ngày ân hạn, đơn giá và vài mốc ngày mẫu. Đây là bảng giá
 * chung chứ không gắn với đơn nào, nên gọi được ngay lúc đang tạo đơn.
 */
export const getStorageFeeEstimateApi = async (
  options = {}
) => {
  try {
    /* API THẬT: axiosInstance.get("/api/storage-fee/estimate", { signal }) */
    await delay(260, getSignal(options));

    const freeDays = findServiceFeeValue("FREE_STORAGE_DAYS", 7);
    const graceDays = 2;
    const totalFreeDays = freeDays + graceDays;

    /* Đơn giá lưu kho theo kiện/ngày: rule SUR_STORAGE (đã gộp phí cũ). */
    const unitPrice = findServiceFeeValue(
      "SUR_STORAGE",
      8000
    );

    const maxAmountPerParcel =
      Number(
        catalog?.findPricingRuleByCode?.("SUR_STORAGE")?.maxAmount
      ) || 1500000;

    /*
     * Mốc mẫu phải vượt qua ngưỡng miễn phí, nếu không bảng chỉ toàn số 0
     * và khách tưởng lưu kho không mất tiền.
     */
    const samples = [10, 15, 20, 30].map((days) => {
      const chargeableDays = Math.max(0, days - totalFreeDays);

      return {
        days,
        chargeableDays,
        amountPerParcel: Math.min(
          chargeableDays * unitPrice,
          maxAmountPerParcel
        ),
      };
    });

    return {
      freeDays,
      graceDays,
      totalFreeDays,
      unitPrice,
      currency: "VND",
      maxAmountPerParcel,
      samples,
      note: `Miễn phí ${freeDays} ngày đầu, ân hạn thêm ${graceDays} ngày. Từ ngày thứ ${
        totalFreeDays + 1
      } tính ${unitPrice.toLocaleString(
        "vi-VN"
      )}đ mỗi kiện mỗi ngày, tối đa ${maxAmountPerParcel.toLocaleString(
        "vi-VN"
      )}đ một kiện cho mỗi đợt lưu kho.`,
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy bảng phí lưu kho:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentRoutesApi = async (
  options = {}
) => {
  try {
    /* API THẬT: axiosInstance.get("/api/orders/consignments/routes", { signal }) */
    await delay(220, getSignal(options));

    return deepClone(catalog?.consignmentRoutes || []);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách tuyến hàng:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getConsignmentShippingOptionsApi = async (
  options = {}
) => {
  try {
    /* API THẬT: axiosInstance.get("/api/orders/consignments/shipping-options", { signal }) */
    await delay(220, getSignal(options));

    return deepClone(catalog?.shippingOptions || []);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy hình thức vận chuyển:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

export const getProductTypesApi = async (options = {}) => {
  try {
    /* API THẬT: axiosInstance.get("/api/product-types", { signal }) */
    await delay(220, getSignal(options));

    return deepClone(catalog?.productTypes || []);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách loại sản phẩm:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};
export const cancelConsignmentApi = async (
  orderId,
  cancelReason,
  options = {}
) => {
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedReason = String(cancelReason || "").trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID không hợp lệ.");
  }

  if (!normalizedReason) {
    throw new Error("Vui lòng nhập lý do hủy đơn.");
  }

  try {
    /* API THẬT: axiosInstance.put(`/api/orders/consignments/${id}/cancel`, { cancelReason }, { signal }) */
    await delay(360, getSignal(options));

    const consignment =
      findConsignmentById(normalizedOrderId) ||
      findConsignmentByCode(normalizedOrderId);

    if (!consignment) {
      throw createApiError(
        404,
        "Không tìm thấy đơn ký gửi cần hủy."
      );
    }

    const cancelledAt = nowIso();

    /*
     * Sửa thẳng trên fixture: màn chi tiết gọi lại API ngay sau khi hủy,
     * không cập nhật là nó tải về đúng trạng thái cũ.
     */
    consignment.status = "CANCELLED";
    consignment.cancelReason = normalizedReason;
    consignment.cancelledAt = cancelledAt;
    consignment.updatedAt = cancelledAt;
    consignment.statusUpdatedAt = cancelledAt;

    return {
      success: true,
      orderId: consignment.orderId,
      orderCode: consignment.orderCode,
      status: consignment.status,
      cancelReason: normalizedReason,
      cancelledAt,
      message: "Đơn ký gửi đã được hủy.",
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi hủy đơn ký gửi:",
        error?.response?.data || error?.message
      );
    }

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
    /* API THẬT: axiosInstance.post("/api/orders/consignments/validate-items", { items }, { signal }) */
    await delay(340, getSignal(options));

    /*
     * Bản mock luôn hợp lệ: mọi ràng buộc thật sự chặn khách đều đã chạy ở
     * vòng chuẩn hoá phía trên và ném lỗi kèm đúng câu tiếng Việt của form.
     */
    return {
      isValid: true,
      valid: true,
      errors: [],
      messages: [],
      items: normalizedItems,
    };
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi kiểm tra thông tin kiện hàng:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};


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
