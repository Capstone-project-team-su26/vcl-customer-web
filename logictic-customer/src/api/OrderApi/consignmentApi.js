import axiosInstance from "../axios";

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

/* ==================== CONSIGNMENT ==================== */

export const createConsignmentApi = async (
  payload,
  options = {}
) => {
  const requestPayload =
    buildCreateConsignmentRequest(payload);

  try {
    console.info(
      "[Consignment API] POST /api/orders/consignments",
      requestPayload
    );

    const response = await axiosInstance.post(
      "/api/orders/consignments",
      requestPayload,
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
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

export const getConsignmentsApi = async (options = {}) => {
  try {
    const response = await axiosInstance.get(
      "/api/orders/consignments",
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.get(
      `/api/orders/consignments/${encodeURIComponent(id)}`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
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

/* ==================== DELIVERY ADDRESS ==================== */

export const getDeliveryAddressesApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/delivery-addresses",
      {
        signal: getSignal(options),
        headers: {
          Accept: "*/*",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.post(
      "/api/delivery-addresses",
      {
        address,
      },
      {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.delete(
      `/api/delivery-addresses/${encodeURIComponent(id)}`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "*/*",
        },
      }
    );

    return response.data;
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

/* ==================== QUOTATION ==================== */

export const getOrderQuotationApi = async (
  orderId,
  options = {}
) => {
  const id = String(orderId || "").trim();

  if (!id) {
    throw new Error("Order ID không hợp lệ.");
  }

  try {
    const response = await axiosInstance.get(
      `/api/orders/${encodeURIComponent(id)}/quotation`,
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain",
        },
      }
    );

    return response.data;
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

/* ==================== ORDER OPTIONS ==================== */

export const getConsignmentRoutesApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/orders/consignments/routes",
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.get(
      "/api/orders/consignments/shipping-options",
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.get(
      "/api/product-types",
      {
        signal: getSignal(options),
        headers: {
          Accept: "*/*",
        },
      }
    );

    return response.data;
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
    const response = await axiosInstance.put(
      `/api/orders/consignments/${encodeURIComponent(
        normalizedOrderId
      )}/cancel`,
      {
        cancelReason: normalizedReason,
      },
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
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

/* ==================== VALIDATE CONSIGNMENT ITEMS ==================== */

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
    const response = await axiosInstance.post(
      "/api/orders/consignments/validate-items",
      {
        items: normalizedItems,
      },
      {
        signal: getSignal(options),
        headers: {
          Accept: "text/plain, application/json",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
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
    const response =
      await axiosInstance.put(
        `/api/orders/consignments/${encodeURIComponent(
          normalizedOrderId
        )}/status`,
        {
          status: normalizedStatus,
          rejectionReason:
            normalizedStatus === "REJECTED"
              ? normalizedRejectionReason
              : "",
        },
        {
          signal: getSignal(options),
          headers: {
            Accept:
              "text/plain, application/json",
            "Content-Type":
              "application/json",
          },
        }
      );

    return response.data;
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