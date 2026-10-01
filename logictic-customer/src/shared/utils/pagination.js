/* =========================================================
   pagination.js — quy ước phân trang DÙNG CHUNG cho mọi danh sách của khách.

   Thuần logic (không React, không DOM) để tools/verify-api.mjs nạp và kiểm được.
   Phần giao diện: shared/components/ListPagination; phần state: shared/hooks/usePagination.

   Quy ước:
     - trang đánh số từ 1 (khớp pageNumber của backend);
     - cỡ trang 10 / 20 / 50, mặc định 10;
     - câu tóm tắt "Hiển thị x–y / N";
     - đổi bộ lọc / ô tìm / tab → về trang 1 (hook lo, xem usePagination);
     - trang vượt quá số trang (vừa lọc bớt, vừa xoá dòng) → kẹp về trang cuối.
   ========================================================= */

export const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50]);

export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/* Khoá query mặc định khi trang giữ số trang trên URL (?page=&size=). */
export const PAGE_QUERY_KEY = "page";
export const PAGE_SIZE_QUERY_KEY = "size";

/*
 * Nhãn tiếng Việt cho antd Pagination / Table: app không nạp locale antd nên mặc định là
 * "10 / page", "Go to"... Truyền object này vào prop `locale` của Pagination.
 */
export const PAGINATION_LOCALE_VI = Object.freeze({
  items_per_page: "/ trang",
  jump_to: "Đến trang",
  jump_to_confirm: "xác nhận",
  page: "",
  page_size: "Số dòng mỗi trang",
  prev_page: "Trang trước",
  next_page: "Trang sau",
  prev_5: "Lùi 5 trang",
  next_5: "Tới 5 trang",
  prev_3: "Lùi 3 trang",
  next_3: "Tới 3 trang",
});

const toInt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : NaN;
};

/** Số trang hợp lệ (≥ 1); rác / âm / 0 → 1. */
export const normalizePage = (value) => {
  const page = toInt(value);
  return page >= 1 ? page : 1;
};

/**
 * Cỡ trang hợp lệ: phải nằm trong danh sách lựa chọn (URL bị sửa tay thành ?size=9999
 * không được kéo cả nghìn dòng ra một trang); ngoài danh sách → fallback.
 */
export const normalizePageSize = (
  value,
  options = PAGE_SIZE_OPTIONS,
  fallback = options[0] ?? DEFAULT_PAGE_SIZE,
) => {
  const size = toInt(value);
  return options.includes(size) ? size : fallback;
};

/** Tổng số trang, tối thiểu 1 (danh sách rỗng vẫn là "trang 1/1"). */
export const getTotalPages = (total, pageSize = DEFAULT_PAGE_SIZE) => {
  const count = Math.max(0, toInt(total) || 0);
  const size = Math.max(1, toInt(pageSize) || DEFAULT_PAGE_SIZE);
  return Math.max(1, Math.ceil(count / size));
};

/** Kẹp trang vào [1, tổng số trang]. */
export const clampPage = (page, total, pageSize = DEFAULT_PAGE_SIZE) =>
  Math.min(normalizePage(page), getTotalPages(total, pageSize));

/**
 * Vị trí dòng đầu / dòng cuối (đánh số từ 1) của trang đang xem. total = 0 → 0 / 0.
 * @returns {{ from: number, to: number }}
 */
export const getPageRange = ({ page, pageSize, total }) => {
  const count = Math.max(0, toInt(total) || 0);
  if (count === 0) return { from: 0, to: 0 };

  const size = Math.max(1, toInt(pageSize) || DEFAULT_PAGE_SIZE);
  const current = clampPage(page, count, size);
  const from = (current - 1) * size + 1;

  return { from, to: Math.min(count, from + size - 1) };
};

/**
 * "Hiển thị 11–20 / 57" (kèm đơn vị nếu có: "Hiển thị 11–20 / 57 đơn").
 * @param {{ page: number, pageSize: number, total: number, unit?: string }} args
 */
export const formatPageRange = ({ page, pageSize, total, unit = "" }) => {
  const count = Math.max(0, toInt(total) || 0);
  const { from, to } = getPageRange({ page, pageSize, total: count });
  const range = count === 0 ? "0" : `${from}–${to}`;
  const suffix = unit ? ` ${unit}` : "";

  return `Hiển thị ${range} / ${count}${suffix}`;
};

/**
 * Cắt một trang từ danh sách đã tải hết (phân trang phía client).
 * Trang vượt quá thì kẹp về trang cuối, không trả trang rỗng.
 *
 * @template T
 * @param {T[]} rows
 * @param {{ page?: number, pageSize?: number }} [options]
 * @returns {{ items: T[], page: number, pageSize: number, total: number, totalPages: number,
 *            from: number, to: number }}
 */
export const paginateRows = (rows, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  const size = Math.max(1, toInt(pageSize) || DEFAULT_PAGE_SIZE);
  const total = list.length;
  const current = clampPage(page, total, size);
  const start = (current - 1) * size;
  const { from, to } = getPageRange({ page: current, pageSize: size, total });

  return {
    items: list.slice(start, start + size),
    page: current,
    pageSize: size,
    total,
    totalPages: getTotalPages(total, size),
    from,
    to,
  };
};

/**
 * Đọc trang + cỡ trang từ query (?page=&size=). Thiếu / rác → trang 1, cỡ mặc định.
 * @param {URLSearchParams} searchParams
 */
export const readPageQuery = (
  searchParams,
  {
    pageKey = PAGE_QUERY_KEY,
    sizeKey = PAGE_SIZE_QUERY_KEY,
    pageSizeOptions = PAGE_SIZE_OPTIONS,
    defaultPageSize = pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE,
  } = {},
) => ({
  page: normalizePage(searchParams?.get?.(pageKey)),
  pageSize: normalizePageSize(searchParams?.get?.(sizeKey), pageSizeOptions, defaultPageSize),
});

/**
 * Ghi trang + cỡ trang vào một bản sao query. Giá trị mặc định (trang 1, cỡ mặc định) thì
 * XOÁ khoá đi để URL gọn và link cũ (không có ?page) vẫn là cùng một trang.
 *
 * @param {URLSearchParams} searchParams
 * @returns {URLSearchParams} bản sao mới
 */
export const writePageQuery = (
  searchParams,
  { page, pageSize },
  {
    pageKey = PAGE_QUERY_KEY,
    sizeKey = PAGE_SIZE_QUERY_KEY,
    defaultPageSize = DEFAULT_PAGE_SIZE,
  } = {},
) => {
  const next = new URLSearchParams(searchParams);

  if (page !== undefined) {
    const value = normalizePage(page);
    if (value === 1) next.delete(pageKey);
    else next.set(pageKey, String(value));
  }

  if (pageSize !== undefined) {
    const value = toInt(pageSize);
    if (!(value > 0) || value === defaultPageSize) next.delete(sizeKey);
    else next.set(sizeKey, String(value));
  }

  return next;
};

/**
 * Cấu hình `pagination` cho antd <Table> theo cùng quy ước (10/20/50, "Hiển thị x–y / N").
 * Bảng chi tiết nhỏ (vài dòng) thì hideOnSinglePage = true: ≤ 10 dòng không hiện thanh
 * phân trang; nhiều hơn mới hiện.
 *
 * @param {{ unit?: string, hideOnSinglePage?: boolean, pageSizeOptions?: number[] }} [options]
 */
export const buildTablePagination = ({
  unit = "",
  hideOnSinglePage = true,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
} = {}) => ({
  defaultPageSize: pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE,
  pageSizeOptions: pageSizeOptions.map(String),
  showSizeChanger: true,
  hideOnSinglePage,
  size: "small",
  locale: PAGINATION_LOCALE_VI,
  showTotal: (total, [from, to]) =>
    `Hiển thị ${total ? `${from}–${to}` : "0"} / ${total}${unit ? ` ${unit}` : ""}`,
});
