// src/api/PaymentApi/orderPaymentApi.js

import axiosInstance from "../axios";

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

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
    result?.payments,
    result?.histories,
    result?.paymentHistories,
    result?.data?.items,
    result?.data?.results,
    result?.data?.payments,
    result?.data?.histories,
    result?.data?.paymentHistories,
  ];

  return candidates.find(Array.isArray) || [];
};

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

const normalizeOrderId = (orderId) => {
  const normalizedOrderId =
    String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error(
      "Không tìm thấy mã đơn hàng."
    );
  }

  return normalizedOrderId;
};

const getRequestSignal = (options = {}) => {
  if (
    typeof options?.addEventListener ===
    "function"
  ) {
    return options;
  }

  return options?.signal;
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

/* =========================================================
   REQUEST HELPER
   ========================================================= */

const getOrderPaymentRequest = async (
  orderId,
  suffix = "",
  options = {}
) => {
  const normalizedOrderId =
    normalizeOrderId(orderId);

  const normalizedSuffix =
    String(suffix ?? "")
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

  const endpoint = normalizedSuffix
    ? `/api/orders/${encodeURIComponent(
        normalizedOrderId
      )}/payments/${normalizedSuffix}`
    : `/api/orders/${encodeURIComponent(
        normalizedOrderId
      )}/payments`;

  try {
    const response =
      await axiosInstance.get(
        endpoint,
        {
          signal:
            getRequestSignal(
              options
            ),

          params:
            options?.params,

          headers: {
            Accept: "*/*",
            ...(options?.headers || {}),
          },
        }
      );

    return getResponseData(response);
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        `[Order Payment API] GET ${endpoint} thất bại:`,
        error?.response?.data ||
          error?.message
      );
    }

    throw error;
  }
};

/* =========================================================
   GET /api/orders/{orderId}/payments
   ========================================================= */

export const getOrderPaymentsApi = async (
  orderId,
  options = {}
) => {
  return getOrderPaymentRequest(
    orderId,
    "",
    options
  );
};

export const getOrderPaymentListApi =
  async (
    orderId,
    options = {}
  ) => {
    const result =
      await getOrderPaymentsApi(
        orderId,
        options
      );

    return findArrayFromResult(result);
  };

/* =========================================================
   GET /api/orders/{orderId}/payments/history
   ========================================================= */

export const getOrderPaymentHistoryApi =
  async (
    orderId,
    options = {}
  ) => {
    return getOrderPaymentRequest(
      orderId,
      "history",
      options
    );
  };

export const getOrderPaymentHistoryListApi =
  async (
    orderId,
    options = {}
  ) => {
    const result =
      await getOrderPaymentHistoryApi(
        orderId,
        options
      );

    return findArrayFromResult(result);
  };

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

const orderPaymentApi = {
  getOrderPaymentsApi,
  getOrderPaymentListApi,
  getOrderPaymentHistoryApi,
  getOrderPaymentHistoryListApi,
};

export default orderPaymentApi;