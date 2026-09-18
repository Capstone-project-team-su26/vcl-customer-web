/**
 * Nhận biết lỗi "request bị huỷ" mà không cần axios.
 *
 * Bản gốc gọi `axios.isCancel(error)` ở 6 màn hình để phân biệt giữa "người dùng
 * rời trang / gõ tiếp ô tìm kiếm nên huỷ request cũ" và "lỗi thật cần báo đỏ".
 * Bản UI-only không còn axios, nhưng logic đó vẫn phải giữ: nếu không, mỗi lần
 * huỷ request là một toast lỗi hiện lên vô cớ.
 *
 * Hàm dưới nhận diện cả ba dạng: cờ __CANCEL__ của axios (phòng khi cắm lại API
 * thật), AbortError của fetch/AbortController, và CanceledError do
 * `@/mocks/mockUtils` ném ra khi signal bị abort.
 */
export const isCancel = (error) =>
  Boolean(
    error &&
      (error.__CANCEL__ === true ||
        error.name === "CanceledError" ||
        error.name === "AbortError" ||
        error.code === "ERR_CANCELED" ||
        error.message === "canceled")
  );

/** Giữ tên cũ để các module cần vẫn dùng được. */
export const isCanceledRequest = isCancel;

/**
 * Export mặc định có hình dạng `{ isCancel }` để 6 file đang viết
 * `axios.isCancel(...)` chỉ cần đổi đúng dòng import, không phải sửa thân hàm.
 */
export default { isCancel, isCanceledRequest };
