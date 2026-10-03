/* =========================================================
   productTypeApi — API thật, danh mục loại hàng dùng chung.

   GET /api/product-types (không cần đăng nhập) → { message, data: [{ id, name }] }
   (chỉ loại đang hoạt động).

   Dòng hàng của đơn lưu `productType` là ID loại hàng (GUID), còn dữ liệu cũ / mua hộ
   lưu thẳng tên. Mọi màn cần đổi ID → tên đọc danh mục này, nên nó nằm ở `shared`
   (ký gửi, mua hộ, phiếu tiếp nhận kho cùng dùng). `consignmentApi.getProductTypesApi`
   re-export đúng hàm này — chỉ có MỘT nơi khai báo endpoint.

   loadProductTypeCatalog(): một promise cấp module cho cả phiên — nhiều màn mở cùng lúc
   chỉ gọi mạng một lần. Thành công thì giữ; lỗi thì bỏ cache để lần sau gọi lại.
   ========================================================= */

import httpClient, { isCanceledRequest } from "@shared/api/httpClient";

export const PRODUCT_TYPES_ENDPOINT = "/api/product-types";

const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const unwrapData = (body) =>
  body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;

/** GET /api/product-types → mảng [{ id, name }] đã bóc envelope. Lỗi ném nguyên dạng axios. */
export const getProductTypesApi = async (options = {}) => {
  try {
    const response = await httpClient.get(PRODUCT_TYPES_ENDPOINT, {
      signal: getSignal(options),
    });
    const list = unwrapData(response.data);

    return Array.isArray(list) ? list : [];
  } catch (error) {
    if (!isCanceledRequest(error)) {
      console.error(
        "Lỗi lấy danh sách loại sản phẩm:",
        error?.response?.data || error?.message,
      );
    }

    throw error;
  }
};

let catalogPromise = null;

/**
 * Danh mục loại hàng, nạp MỘT lần cho cả phiên (không truyền signal: promise dùng chung
 * không được để một màn rời trang huỷ hộ màn khác). Lỗi → bỏ cache, ném lỗi.
 */
export const loadProductTypeCatalog = () => {
  if (!catalogPromise) {
    catalogPromise = getProductTypesApi().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }

  return catalogPromise;
};

/** Chỉ dùng cho kiểm thử / đăng xuất: quên danh mục đã nạp. */
export const clearProductTypeCatalogCache = () => {
  catalogPromise = null;
};
