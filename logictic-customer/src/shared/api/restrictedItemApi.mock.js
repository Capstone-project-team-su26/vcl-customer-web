/* =========================================================
   ⚠ BẢN SAO MOCK TẠM THỜI — KHÔNG NỐI API THẬT VÀO FILE NÀY.

   File này là bản sao NGUYÊN VĂN bản mock của restrictedItemApi.js (chụp trước khi
   restrictedItemApi.js được nối API thật ở đợt A), chỉ dành cho các màn NGOÀI đợt A
   để chúng không trộn dữ liệu thật với dữ liệu mẫu.

   - Không làm theo hướng dẫn "CẮM / NỐI API THẬT" trong comment bên dưới:
     làm vậy là tạo ra module API thật thứ hai. API thật chỉ nằm ở restrictedItemApi.js.
   - Khi các màn đang import file này tới đợt của mình, đổi import của chúng
     về restrictedItemApi.js; không còn ai import thì XOÁ file này (và mục của nó trong
     tools/api-contract.json).
   ========================================================= */

/* =========================================================
   restrictedItemApi (MOCK — bản build UI-only)

   Tầng HTTP thật đã được gỡ; danh mục hàng cấm / hàng hạn chế lấy thẳng từ
   fixture @/mocks/data/catalog để popover cảnh báo trong FieldLabelTooltip và
   phần "ngữ cảnh hàng cấm" của FloatingChat vẫn có dữ liệu để render.

   CẮM API THẬT TRỞ LẠI:
   - Bỏ import từ @/mocks, import lại axiosInstance từ "./httpClient".
   - Gọi lại GET /api/restricted-items với header Accept nhận mọi kiểu và
     signal: getSignal(options), rồi trả về getResponseData(response) như cũ.
   - Giữ nguyên findArrayFromResult bên dưới: nó là lớp chống lệch envelope
     giữa backend và UI (data / items / results / restrictedItems).

   Giữ NGUYÊN tên export, thứ tự tham số và kiểu trả về — component không được
   sửa một dòng:
   - getRestrictedItemsApi(options)     → payload đã unwrap (ở đây là mảng)
   - getRestrictedItemListApi(options)  → LUÔN là mảng để .map() thẳng trong UI
   ========================================================= */

import { delay, deepClone } from "@/mocks/mockUtils";

import { restrictedItems as restrictedItemFixtures } from "@/mocks/data/catalog";

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

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

/* =========================
   RESPONSE HELPER
========================= */

/*
 * Danh mục hàng cấm gần như không đổi trong một phiên làm việc, nhưng vẫn
 * clone để một component lỡ sort/mutate danh sách cũng không làm hỏng fixture
 * dùng chung cho các mock khác.
 */
const getRestrictedItemRows = () => deepClone(restrictedItemFixtures);

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
    /* Có delay thì spinner "Đang tải danh sách..." của popover mới kịp hiện. */
    await delay(undefined, getSignal(options));

    return getRestrictedItemRows();
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
