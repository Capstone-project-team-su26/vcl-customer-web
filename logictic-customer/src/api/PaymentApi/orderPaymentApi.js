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
    result?.items,
    result?.results,
    result?.payments,
    result?.histories,
    result?.paymentHistories,

    result?.data,
    result?.data?.items,
    result?.data?.results,
    result?.data?.payments,
    result?.data?.histories,
    result?.data?.paymentHistories,
  ];

  return (
    candidates.find(
      Array.isArray,
    ) || []
  );
};

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

const normalizeOrderId = (orderId) => {
  const normalizedOrderId =
    String(orderId ?? "").trim();

  if (!normalizedOrderId) {
    throw new Error(
      "Không tìm thấy mã đơn hàng.",
    );
  }

  return normalizedOrderId;
};

const getRequestSignal = (
  options = {},
) => {
  // Trường hợp truyền trực tiếp AbortSignal
  if (
    options &&
    typeof options.addEventListener ===
      "function"
  ) {
    return options;
  }

  // Trường hợp truyền { signal }
  return options?.signal;
};

const isCanceledRequest = (
  error,
) => {
  return (
    error?.code ===
      "ERR_CANCELED" ||
    error?.name ===
      "CanceledError" ||
    error?.name ===
      "AbortError"
  );
};

/* =========================================================
   REQUEST HELPER
   ========================================================= */

const getOrderPaymentRequest =
  async (
    orderId,
    suffix = "",
    options = {},
  ) => {
    const normalizedOrderId =
      normalizeOrderId(orderId);

    const normalizedSuffix =
      String(suffix ?? "")
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

    const encodedOrderId =
      encodeURIComponent(
        normalizedOrderId,
      );

    const endpoint =
      normalizedSuffix
        ? `/api/orders/${encodedOrderId}/payments/${normalizedSuffix}`
        : `/api/orders/${encodedOrderId}/payments`;

    const signal =
      getRequestSignal(options);

    const requestConfig = {
      params: options?.params,
      headers: {
        Accept:
          "application/json",
        ...(options?.headers ||
          {}),
      },
    };

    if (signal) {
      requestConfig.signal =
        signal;
    }

    try {
      const response =
        await axiosInstance.get(
          endpoint,
          requestConfig,
        );

      return getResponseData(
        response,
      );
    } catch (error) {
      if (
        !isCanceledRequest(error)
      ) {
        console.error(
          `[Order Payment API] GET ${endpoint} thất bại:`,
          {
            status:
              error?.response
                ?.status,
            data:
              error?.response
                ?.data,
            message:
              error?.message,
            orderId:
              normalizedOrderId,
          },
        );
      }

      throw error;
    }
  };

/* =========================================================
   GET /api/orders/{orderId}/payments
   ========================================================= */

export const getOrderPaymentsApi =
  async (
    orderId,
    options = {},
  ) => {
    return getOrderPaymentRequest(
      orderId,
      "",
      options,
    );
  };

export const getOrderPaymentListApi =
  async (
    orderId,
    options = {},
  ) => {
    const result =
      await getOrderPaymentsApi(
        orderId,
        options,
      );

    return findArrayFromResult(
      result,
    );
  };

/* =========================================================
   GET /api/orders/{orderId}/payments/history
   ========================================================= */

export const getOrderPaymentHistoryApi =
  async (
    orderId,
    options = {},
  ) => {
    return getOrderPaymentRequest(
      orderId,
      "history",
      options,
    );
  };

export const getOrderPaymentHistoryListApi =
  async (
    orderId,
    options = {},
  ) => {
    const result =
      await getOrderPaymentHistoryApi(
        orderId,
        options,
      );

    return findArrayFromResult(
      result,
    );
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