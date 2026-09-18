/* =========================================================
   publicParcelTrackingApi — tra cứu công khai theo mã đơn (API THẬT).

   GET /api/public/parcels/tracking?code=VCL-...  (PublicTrackingController, AllowAnonymous)
   → { message, data: { consignmentCode, consignmentType, route, status, statusLabel,
        receiverName, itemCount, createdAt,
        parcels: [{ packageCode, packageStatus, checkInTime, putAwayTime }] } }
   404 { message } khi không có đơn; 400 { message } khi mã rỗng.

   Server CHỈ tìm theo mã đơn ký gửi (ConsignmentCode, không phân biệt hoa thường) và chỉ
   trả trạng thái — không có dòng thời gian, không lộ thông tin nhạy cảm. Hành trình chi
   tiết (chặng, chuyến, mã vận đơn hãng) cần đăng nhập: /tracking/:orderId.

   Giữ hợp đồng cũ của trang OrderLookup:
   - trả OBJECT đã bóc envelope; mỗi kiện có thêm alias parcelCode / status /
     statusLabel / updatedAt mà trang đang đọc.
   - lỗi là Error có message tiếng Việt (lấy nguyên `message` server); lỗi huỷ giữ
     nguyên để trang bỏ qua.
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";
import { getPackageStatusLabel } from "@features/tracking/constants/trackingStages";

const normalizeTrackingCode = (code) => String(code ?? "").trim().toUpperCase();

const validateTrackingCode = (code) => {
  const normalizedCode = normalizeTrackingCode(code);

  if (!normalizedCode) {
    throw new Error("Vui lòng nhập mã vận đơn.");
  }

  /* Mã đơn dạng VCL-20260917161921-540135: chữ, số, gạch ngang/gạch dưới. */
  if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
    throw new Error("Mã vận đơn không hợp lệ.");
  }

  return normalizedCode;
};

const toParcel = (parcel) => ({
  ...parcel,
  parcelCode: parcel?.packageCode ?? parcel?.parcelCode ?? "",
  status: parcel?.packageStatus ?? parcel?.status ?? "",
  statusLabel: getPackageStatusLabel(parcel?.packageStatus ?? parcel?.status),
  updatedAt: parcel?.putAwayTime || parcel?.checkInTime || "",
});

/**
 * Tra cứu công khai theo mã đơn.
 *
 * @param {string} code
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object>}
 */
export const getPublicParcelTrackingApi = async (code, options = {}) => {
  const trackingCode = validateTrackingCode(code);

  try {
    const response = await httpClient.get("/api/public/parcels/tracking", {
      params: { code: trackingCode },
      signal: options?.signal,
    });

    const body = response.data;
    const data =
      body && typeof body === "object" && "data" in body ? body.data : body;

    if (!data || typeof data !== "object") {
      throw new Error("Hệ thống không trả về dữ liệu vận đơn.");
    }

    return {
      ...data,
      parcels: Array.isArray(data.parcels) ? data.parcels.map(toParcel) : [],
    };
  } catch (error) {
    if (isCanceledRequest(error)) {
      throw error;
    }

    const status = error?.response?.status;
    const serverMessage = error?.response?.data?.message;

    console.error("Lỗi tra cứu vận đơn:", error?.response?.data || error?.message);

    /* Trang tra cứu hiện error.message: đưa câu server lên, 404 không có câu thì báo gọn. */
    throw new Error(
      serverMessage ||
        (status === 404
          ? "Không tìm thấy vận đơn."
          : error?.message || "Không tra cứu được vận đơn. Vui lòng thử lại."),
      { cause: error },
    );
  }
};

const publicParcelTrackingApi = {
  getTracking: getPublicParcelTrackingApi,
};

export default publicParcelTrackingApi;
