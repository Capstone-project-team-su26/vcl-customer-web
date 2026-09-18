/* =========================================================
   fileDownload.js — lưu / mở một Blob đã tải về.

   Giấy tờ đính kèm (giấy phép, ảnh hiện trạng sự cố) nằm riêng tư trên máy
   chủ, không có link công khai: phải tải kèm Authorization rồi mới hiển thị.
   Vì vậy không dùng <a href> trỏ thẳng API được — tải Blob qua httpClient, rồi
   dùng object URL ở đây.
   ========================================================= */

/** Tạo object URL cho Blob; nhớ gọi revokeObjectUrl khi không dùng nữa. */
export const createObjectUrl = (blob) => {
  try {
    return blob ? globalThis.URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
};

export const revokeObjectUrl = (url) => {
  if (!url) return;

  try {
    globalThis.URL.revokeObjectURL(url);
  } catch {
    /* Trình duyệt đã thu hồi rồi thì thôi. */
  }
};

/** Kích hoạt lưu file về máy với đúng tên gốc. */
export const saveBlobAsFile = (blob, fileName = "tai-lieu") => {
  const url = createObjectUrl(blob);

  if (!url) return;

  const link = globalThis.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();

  /* Để trình duyệt kịp bắt đầu tải rồi mới thu hồi URL. */
  globalThis.setTimeout(() => revokeObjectUrl(url), 30_000);
};

/**
 * Mở Blob ở tab mới (PDF / ảnh xem được ngay). Trình duyệt chặn popup thì lưu
 * file về máy thay vì im lặng không làm gì.
 */
export const openBlobInNewTab = (blob, fileName = "tai-lieu") => {
  const url = createObjectUrl(blob);

  if (!url) return;

  const opened = globalThis.window?.open(url, "_blank", "noopener");

  if (!opened) {
    revokeObjectUrl(url);
    saveBlobAsFile(blob, fileName);
    return;
  }

  globalThis.setTimeout(() => revokeObjectUrl(url), 60_000);
};
