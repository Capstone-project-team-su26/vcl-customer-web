import axiosInstance from "../axios";

/* =========================
   REQUEST HELPER
========================= */

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

/* =========================
   RESPONSE HELPER
========================= */

const getResponseData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const findArrayFromResult = (result) => {
  const candidates = [
    result,
    result?.data,
    result?.items,
    result?.results,
    result?.data?.items,
    result?.data?.results,
    result?.restrictedItems,
    result?.data?.restrictedItems,
  ];

  return candidates.find(Array.isArray) || [];
};

/* =========================
   RESTRICTED ITEMS
========================= */

export const getRestrictedItemsApi = async (
  options = {}
) => {
  try {
    const response = await axiosInstance.get(
      "/api/restricted-items",
      {
        signal: getSignal(options),
        headers: {
          Accept: "*/*",
        },
      }
    );

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách hàng hóa bị hạn chế:",
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/**
 * Luôn trả về array để dùng trực tiếp trong UI.
 */
export const getRestrictedItemListApi = async (
  options = {}
) => {
  const result = await getRestrictedItemsApi(options);

  return findArrayFromResult(result);
};

export default {
  getRestrictedItemsApi,
  getRestrictedItemListApi,
};