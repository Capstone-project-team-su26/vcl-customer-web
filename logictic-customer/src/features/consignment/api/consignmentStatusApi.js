/* =========================================================
   consignmentStatusApi — API thật.

   GET /api/orders/consignments/statuses (không cần đăng nhập)
   → { message, data: [{ code, label }] }.

   Giữ NGUYÊN tên export và kiểu trả về của bản mock: MẢNG THUẦN, mỗi phần tử
   mang đủ bộ alias (value/code/status/statusCode + label/name/displayName/
   statusName) mà 4 hàm normalizeStatusOptions phía component dò theo thứ tự.

   Quy tắc nhãn và thứ tự (một mã chỉ có một nhãn trong toàn app):
   - Mã giữ nguyên như backend trả, vì đó cũng là giá trị gửi lại khi lọc danh sách.
   - Mã chuẩn (khoá của ORDER_STATUS_LABELS) dùng nhãn thống nhất trong
     orderStatus.js — cùng nhãn với chip trạng thái — và xếp theo ORDER_STATUS_ORDER.
   - Mã lạ giữ nhãn backend, xếp cuối theo đúng thứ tự backend trả.
   ========================================================= */

import httpClient from "@shared/api/httpClient";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_ORDER,
} from "@features/consignment/constants/orderStatus";

/* Component truyền signal theo hai kiểu: AbortSignal trần hoặc { signal }. */
const getSignal = (options = {}) => {
  if (typeof options?.addEventListener === "function") {
    return options;
  }

  return options?.signal;
};

const isStandardCode = (code) =>
  Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABELS, code);

/*
 * Mọi normalizeStatusOptions ở phía component đều dò field theo thứ tự
 * value → code → status → statusCode → id và label → name → displayName →
 * statusName → description. Giữ đủ bộ field để không màn nào phải đoán.
 */
const createStatusOption = (raw) => {
  const source =
    raw && typeof raw === "object" ? raw : { code: raw };

  const code = String(
    source.code ?? source.value ?? source.status ?? ""
  )
    .trim()
    .toUpperCase();

  const backendLabel = String(
    source.label ?? source.name ?? ""
  ).trim();

  const label = isStandardCode(code)
    ? ORDER_STATUS_LABELS[code]
    : backendLabel || code;

  return {
    code,
    value: code,
    status: code,
    statusCode: code,
    name: label,
    label,
    displayName: label,
    statusName: label,
    description: String(source.description ?? "").trim(),
  };
};

const orderIndex = (code) => {
  const index = ORDER_STATUS_ORDER.indexOf(code);

  return index === -1 ? ORDER_STATUS_ORDER.length : index;
};

/**
 * Lấy danh sách trạng thái đơn ký gửi.
 *
 * @param {AbortSignal | { signal?: AbortSignal }} [options]
 * @returns {Promise<Array<object>>}
 */
export const getConsignmentStatusesApi = async (
  options = {}
) => {
  const response = await httpClient.get(
    "/api/orders/consignments/statuses",
    {
      headers: { Accept: "text/plain, application/json" },
      signal: getSignal(options),
    }
  );

  const body = response.data;
  const list = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : [];

  const optionMap = new Map();

  list.map(createStatusOption).forEach((option) => {
    if (option.code && !optionMap.has(option.code)) {
      optionMap.set(option.code, option);
    }
  });

  /* Array.prototype.sort ổn định: mã lạ cùng hạng giữ thứ tự backend. */
  return Array.from(optionMap.values()).sort(
    (a, b) => orderIndex(a.code) - orderIndex(b.code)
  );
};
