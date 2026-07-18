import axiosInstance from "../axios";

const PUBLIC_PARCEL_TRACKING_ENDPOINT =
  "/api/public/parcels/tracking";

const getResponseData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

const getErrorMessage = (
  error,
  fallbackMessage = "Không thể tra cứu vận đơn."
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData.trim();
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

/* =========================================================
   NORMALIZE
   ========================================================= */

const normalizeTrackingCode = (code) => {
  return String(code ?? "")
    .trim()
    .toUpperCase();
};

const validateTrackingCode = (code) => {
  const normalizedCode =
    normalizeTrackingCode(code);

  if (!normalizedCode) {
    throw new Error(
      "Vui lòng nhập mã vận đơn."
    );
  }

  /*
   * Cho phép chữ, số, dấu gạch ngang và gạch dưới.
   * Ví dụ:
   * VCL-20260712105447-295605
   */
  if (
    !/^[A-Z0-9_-]+$/.test(
      normalizedCode
    )
  ) {
    throw new Error(
      "Mã vận đơn không hợp lệ."
    );
  }

  return normalizedCode;
};


export const getPublicParcelTrackingApi =
  async (
    code,
    options = {}
  ) => {
    const { signal } = options;

    const trackingCode =
      validateTrackingCode(code);

    try {
      const response =
        await axiosInstance.get(
          PUBLIC_PARCEL_TRACKING_ENDPOINT,
          {
            signal,
            params: {
              code: trackingCode,
            },
            headers: {
              Accept: "*/*",
            },
          }
        );

      const data =
        getResponseData(response);

      if (!data) {
        throw new Error(
          "API không trả về dữ liệu vận đơn."
        );
      }

      return data;
    } catch (error) {
      if (isCanceledRequest(error)) {
        throw error;
      }

      const status =
        error?.response?.status;

      if (status === 400) {
        throw new Error(
          getErrorMessage(
            error,
            "Mã vận đơn không hợp lệ."
          )
        );
      }

      if (status === 401) {
        throw new Error(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      if (status === 403) {
        throw new Error(
          "Bạn không có quyền tra cứu vận đơn này."
        );
      }

      if (status === 404) {
        throw new Error(
          getErrorMessage(
            error,
            "Không tìm thấy vận đơn."
          )
        );
      }

      throw new Error(
        getErrorMessage(
          error,
          "Không thể tra cứu vận đơn. Vui lòng thử lại."
        )
      );
    }
  };

const publicParcelTrackingApi = {
  getTracking:
    getPublicParcelTrackingApi,
};

export default publicParcelTrackingApi;