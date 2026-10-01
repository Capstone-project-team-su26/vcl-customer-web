/* =========================================================
   orderLimitsApi — API thật.

   GET /api/system-settings/order-limits (cần đăng nhập, khách + nhân viên đều đọc được)
   → giới hạn tạo đơn ký gửi / mua hộ do Admin cấu hình:
     { message, data: { consignment: {...}, purchase: {...}, items: [...] } }

   Không còn số cứng ở web: giá trị null nghĩa là KHÔNG giới hạn. Tải lỗi thì trả
   NO_ORDER_LIMITS (mọi giới hạn = null) — form không chặn theo số cũ đã có thể lỗi
   thời, backend vẫn kiểm và trả 400 kèm câu tiếng Việt nêu đúng giới hạn hiện hành.
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

export const ORDER_LIMITS_ENDPOINT = "/api/system-settings/order-limits";

/** Không giới hạn gì — dùng khi chưa tải xong hoặc tải lỗi. */
export const NO_ORDER_LIMITS = Object.freeze({
  consignment: Object.freeze({
    maxParcelWeightKg: null,
    maxParcelLengthCm: null,
    maxParcelWidthCm: null,
    maxParcelHeightCm: null,
    maxParcelQuantity: null,
    maxItemDeclaredValue: null,
    maxTotalWeightKg: null,
    maxTotalDeclaredValue: null,
    maxPackages: null,
  }),
  purchase: Object.freeze({
    maxItems: null,
    maxItemQuantity: null,
  }),
});

/** Số dương hữu hạn thì giữ, còn lại (null, 0, âm, chữ) coi là không giới hạn. */
const toLimit = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const pickLimits = (source, template) =>
  Object.freeze(
    Object.fromEntries(Object.keys(template).map((key) => [key, toLimit(source?.[key])])),
  );

/** Chuẩn hoá body backend (có hoặc không bọc { data }) về đúng hình NO_ORDER_LIMITS. */
export const normalizeOrderLimits = (body) => {
  const payload =
    body && typeof body === "object" && body.data && typeof body.data === "object"
      ? body.data
      : body;

  return Object.freeze({
    consignment: pickLimits(payload?.consignment, NO_ORDER_LIMITS.consignment),
    purchase: pickLimits(payload?.purchase, NO_ORDER_LIMITS.purchase),
  });
};

/**
 * Đọc giới hạn đang áp dụng. Không bao giờ ném lỗi (trừ khi request bị huỷ):
 * lỗi mạng / 401 / 5xx → NO_ORDER_LIMITS kèm cờ loaded = false.
 */
export const getOrderLimitsApi = async (options = {}) => {
  try {
    const response = await httpClient.get(ORDER_LIMITS_ENDPOINT, {
      signal: options?.signal,
    });

    return { ...normalizeOrderLimits(response?.data), loaded: true };
  } catch (error) {
    if (isCanceledRequest(error)) throw error;

    console.warn(
      "Không tải được giới hạn tạo đơn, để backend kiểm:",
      error?.response?.data?.message || error?.message,
    );

    return { ...NO_ORDER_LIMITS, loaded: false };
  }
};
