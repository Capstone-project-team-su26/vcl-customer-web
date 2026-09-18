/* =========================================================
   receivingNoteApi — phiếu nhập kho (WRN-) của đơn ký gửi, phía khách.

   GET /api/warehouse-receiving-notes/my-order/{orderId}
   → { message, data: ReceivingNoteDetail | null }
   Phiếu do Sale lập sau khi khách đặt cọc, quản lý kho duyệt (ACTIVE) thì mới có PDF.
   Backend không trả phiếu REJECTED cho khách; xem đơn người khác → 403.

   Màn "kho của khách" (WarehouseReceiptPage) còn chạy dữ liệu mẫu nên import
   bản sao receivingNoteApi.mock.js.
   ========================================================= */

import httpClient, {
  API_BASE_URL,
  isCanceledRequest,
} from "@shared/api/httpClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PUBLIC_RECEIPT_PATH = "/api/public/receipts/";

/**
 * Link PDF phiếu nhập kho, đổi host về base URL đang dùng.
 *
 * Server trả `receiptPdfUrl` theo cấu hình cũ (https://api-vcl.zushin.io.vn/...) — bản
 * deploy code cũ. Giữ nguyên path /api/public/receipts/{publicKey}, chỉ thay host.
 * Không cần đăng nhập; `download: true` thêm ?download=true để tải file thay vì xem.
 *
 * @param {string|null|undefined} url
 * @param {{ download?: boolean }} [options]
 * @returns {string|null}
 */
export const toPublicReceiptUrl = (url, { download = false } = {}) => {
  const raw = String(url || "").trim();

  if (!raw) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(raw, API_BASE_URL);
  } catch {
    return null;
  }

  const pathIndex = parsed.pathname.indexOf(PUBLIC_RECEIPT_PATH);

  if (pathIndex < 0) {
    return raw;
  }

  const result = new URL(parsed.pathname.slice(pathIndex), API_BASE_URL);

  if (download) {
    result.searchParams.set("download", "true");
  }

  return result.toString();
};

/**
 * Phiếu nhập kho của một đơn — phần khách được xem.
 * Không có phiếu (chưa cọc, đơn mua hộ, id không phải GUID) hoặc không có quyền → null,
 * để khối phiếu tự ẩn thay vì báo lỗi cho một thao tác khách không làm.
 *
 * @param {string} orderId
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function getMyReceivingNoteApi(orderId, options = {}) {
  const id = String(orderId || "").trim();

  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  try {
    const response = await httpClient.get(
      `/api/warehouse-receiving-notes/my-order/${encodeURIComponent(id)}`,
      { signal: options?.signal }
    );

    const body = response?.data;
    const note =
      body && typeof body === "object" && "data" in body ? body.data : null;

    return note && typeof note === "object" ? note : null;
  } catch (error) {
    if (isCanceledRequest(error)) {
      throw error;
    }

    console.error(
      "Lỗi lấy phiếu nhập kho:",
      error?.response?.data || error?.message
    );

    return null;
  }
}

export default { getMyReceivingNoteApi };
