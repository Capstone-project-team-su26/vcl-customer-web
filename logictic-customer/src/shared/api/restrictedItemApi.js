/* =========================================================
   restrictedItemApi — API thật.

   GET /api/restricted-items (cần token) → mảng trần danh mục hàng cấm / hạn chế,
   dùng cho popover cảnh báo trong FieldLabelTooltip và phần "ngữ cảnh hàng cấm"
   của FloatingChat.

   Chưa có token (khách vãng lai) thì trả mảng rỗng, không gọi mạng. FloatingChat
   (màn ngoài đợt A) import bản sao restrictedItemApi.mock.js.

   Giữ nguyên findArrayFromResult bên dưới: nó là lớp chống lệch envelope
   giữa backend và UI (data / items / results / restrictedItems).

   Giữ NGUYÊN tên export, thứ tự tham số và kiểu trả về — component không được
   sửa một dòng:
   - getRestrictedItemsApi(options)     → payload đã unwrap (mảng)
   - getRestrictedItemListApi(options)  → LUÔN là mảng để .map() thẳng trong UI
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

/* =========================
   REQUEST HELPER
========================= */

/*
 * Component truyền signal theo dạng options bọc ngoài
 * (FieldLabelTooltip: getRestrictedItemListApi({ signal })),
 * nhưng vẫn giữ nhánh AbortSignal trần cho đúng hành vi cũ.
 */
const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

/*
 * Endpoint cần đăng nhập. Khách vãng lai mở khung chat nổi ở trang chủ cũng gọi
 * hàm này; gọi khi chưa có token sẽ nhận 401 body rỗng và httpClient đá sang
 * /login. Chưa có token thì coi như danh mục rỗng, không gọi mạng.
 */
const hasAccessToken = () => {
  for (const name of ["sessionStorage", "localStorage"]) {
    try {
      if (globalThis[name]?.getItem("accessToken")) {
        return true;
      }
    } catch {
      /* Storage bị chặn thì thử storage kế tiếp. */
    }
  }

  return false;
};

/* =========================
   RESPONSE HELPER
========================= */

/* Bóc envelope { message, data } nếu backend có bọc; mảng trần thì trả nguyên. */
const getResponseData = (response) => {
  const body = response?.data;

  return body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;
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
  if (!hasAccessToken()) {
    return [];
  }

  try {
    const response = await httpClient.get("/api/restricted-items", {
      headers: { Accept: "*/*" },
      signal: getSignal(options),
    });

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
