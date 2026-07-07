import axiosInstance from "../axios";

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getSignal = (options = {}) => {
  return options?.signal;
};

const normalizeText = (value) => {
  return String(value ?? "").trim();
};

const validatePurchaseRequest = (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Dữ liệu yêu cầu mua hộ không hợp lệ.");
  }

  if (!normalizeText(payload.route)) {
    throw new Error("Vui lòng chọn tuyến vận chuyển.");
  }

  if (!normalizeText(payload.receiverName)) {
    throw new Error("Vui lòng nhập tên người nhận.");
  }

  if (!normalizeText(payload.receiverPhone)) {
    throw new Error("Vui lòng nhập số điện thoại người nhận.");
  }

  if (!normalizeText(payload.receiverAddress)) {
    throw new Error("Vui lòng nhập địa chỉ nhận hàng.");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Yêu cầu mua hộ phải có ít nhất một sản phẩm.");
  }

  payload.items.forEach((item, index) => {
    const productNumber = index + 1;
    const quantity = Number(item?.quantity);

    if (!normalizeText(item?.productLink)) {
      throw new Error(
        `Sản phẩm ${productNumber}: Vui lòng nhập liên kết sản phẩm.`
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

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng phải là số nguyên lớn hơn 0.`
      );
    }

    if (quantity > 2147483647) {
      throw new Error(
        `Sản phẩm ${productNumber}: Số lượng vượt quá giới hạn cho phép.`
      );
    }
  });
};

const buildPurchaseRequestPayload = (payload) => {
  return {
    route: normalizeText(payload.route),

    receiverName: normalizeText(payload.receiverName),

    receiverPhone: normalizeText(payload.receiverPhone),

    receiverAddress: normalizeText(payload.receiverAddress),

    requiresInspection: Boolean(payload.requiresInspection),

    requiresQuantityCheck: Boolean(payload.requiresQuantityCheck),

    generalNote: normalizeText(payload.generalNote),

    items: payload.items.map((item) => ({
      productLink: normalizeText(item.productLink),

      sourceWebsite: normalizeText(item.sourceWebsite),

      productType: normalizeText(item.productType),

      productName: normalizeText(item.productName),

      quantity: Number(item.quantity),

      attributes: normalizeText(item.attributes),

      note: normalizeText(item.note),

      imageUrl: normalizeText(item.imageUrl),
    })),
  };
};

/**
 * Tạo yêu cầu mua hộ.
 *
 * POST /api/purchase-requests
 */
export const createPurchaseRequestApi = async (payload, options = {}) => {
  validatePurchaseRequest(payload);

  const requestPayload = buildPurchaseRequestPayload(payload);

  try {
    const response = await axiosInstance.post(
      "/api/purchase-requests",
      requestPayload,
      {
        signal: getSignal(options),

        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi tạo yêu cầu mua hộ:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};

/**
 * Lấy danh sách yêu cầu mua hộ.
 *
 * GET /api/purchase-requests
 */
export const getPurchaseRequestsApi = async (options = {}) => {
  try {
    const response = await axiosInstance.get("/api/purchase-requests", {
      signal: getSignal(options),

      headers: {
        Accept: "*/*",
      },
    });

    return response.data;
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách yêu cầu mua hộ:",
        error?.response?.data || error?.message
      );
    }

    throw error;
  }
};


export const getPurchaseRequestDetailApi = async (
  purchaseRequestId,
  options = {}
) => {
  const id = normalizeText(purchaseRequestId);

  if (!id) {
    throw new Error("Không tìm thấy mã yêu cầu mua hộ.");
  }

  try {
    const response = await axiosInstance.get(
      `/api/purchase-requests/${id}`,
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
        "Lỗi lấy chi tiết yêu cầu mua hộ:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

export default createPurchaseRequestApi;