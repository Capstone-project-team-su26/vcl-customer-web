/* =========================================================
   apiError.js — rút câu báo lỗi hiển thị được từ lỗi axios / Error thường.

   Backend luôn trả { message } tiếng Việt (README ghép API mục 2) — đó là câu
   phải hiện nguyên cho khách, vì nó nói đúng vướng mắc nghiệp vụ ("Bật giữ hàng
   phải ghi lý do...", "Đã quá 3 ngày kể từ khi giao hàng..."). Chỉ khi server
   không trả gì (mất mạng, timeout) mới rơi về câu mặc định của màn hình.

   Không biết gì về nghiệp vụ nên được phép nằm ở shared/.
   ========================================================= */

import { isCancel } from "@shared/api/requestCancel";

/** Lỗi do người dùng rời trang / huỷ request — không được báo đỏ. */
export const isCanceledError = (error) => isCancel(error);

/**
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export const getApiErrorMessage = (
  error,
  fallback = "Có lỗi xảy ra. Vui lòng thử lại.",
) => {
  const data = error?.response?.data;

  if (data && typeof data === "object") {
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }

    /* ValidationProblemDetails của ASP.NET: { title, errors: { Field: [msg] } }. */
    if (data.errors && typeof data.errors === "object") {
      const first = Object.values(data.errors).flat().find(Boolean);

      if (first) {
        return String(first);
      }
    }

    if (typeof data.title === "string" && data.title.trim()) {
      return data.title.trim();
    }
  }

  if (typeof data === "string" && data.trim() && data.length < 300) {
    return data.trim();
  }

  if (error?.code === "ECONNABORTED") {
    return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
  }

  if (error?.message && !error?.response && error?.code === "ERR_NETWORK") {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }

  return error?.message || fallback;
};

export default getApiErrorMessage;
