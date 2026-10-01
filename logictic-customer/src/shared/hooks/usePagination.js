import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  DEFAULT_PAGE_SIZE,
  PAGE_QUERY_KEY,
  PAGE_SIZE_OPTIONS,
  PAGE_SIZE_QUERY_KEY,
  clampPage,
  normalizePage,
  normalizePageSize,
  paginateRows,
  readPageQuery,
  writePageQuery,
} from "@shared/utils/pagination";

/*
 * Hook phân trang dùng chung. Hai kiểu giữ state:
 *   - usePagination / usePagedRows      : state trong component;
 *   - useUrlPagination / useUrlPagedRows: trang nằm trên URL (?page=&size=) — dùng ở trang
 *     vốn đã để bộ lọc trên query (danh sách đơn), để gửi link / F5 / Back vẫn đúng trang.
 *
 * Cả hai trả CÙNG một shape; `paginationProps` rải thẳng vào <ListPagination {...} />.
 *
 * "Đổi bộ lọc → về trang 1":
 *   - kiểu state: truyền `resetKey` (chuỗi ghép từ bộ lọc / tab / ô tìm). resetKey đổi thì
 *     trang tự về 1 — tính ngay trong render, không cần effect, không nháy trang cũ;
 *   - kiểu URL: chỗ đổi bộ lọc xoá luôn khoá `page` khỏi query (xem OrderList.updateQuery).
 * Trang vượt quá số trang (vừa lọc bớt) luôn được kẹp về trang cuối.
 *
 * Không useCallback/useMemo thủ công: React Compiler (eslint react-hooks) tự ghi nhớ.
 */

const EMPTY_ROWS = Object.freeze([]);

const buildResult = ({ page, pageSize, total, onChange, pageSizeOptions }) => ({
  page,
  pageSize,
  total,
  onChange,
  paginationProps: { page, pageSize, total, onChange, pageSizeOptions },
});

/**
 * Phân trang giữ trong state của component.
 *
 * @param {{ total: number, resetKey?: string, defaultPageSize?: number,
 *           pageSizeOptions?: number[] }} options
 */
export const usePagination = ({
  total = 0,
  resetKey = "",
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE,
} = {}) => {
  const [state, setState] = useState(() => ({
    key: resetKey,
    page: 1,
    pageSize: normalizePageSize(defaultPageSize, pageSizeOptions, DEFAULT_PAGE_SIZE),
  }));

  /* Bộ lọc vừa đổi (resetKey khác lúc lưu trang) → trang 1; cỡ trang giữ nguyên. */
  const rawPage = state.key === resetKey ? state.page : 1;
  const page = clampPage(rawPage, total, state.pageSize);

  const onChange = (nextPage, nextSize) => {
    setState((current) => {
      const size = normalizePageSize(
        nextSize ?? current.pageSize,
        pageSizeOptions,
        current.pageSize,
      );
      /* Đổi cỡ trang → về trang 1 (vị trí cũ không còn nghĩa). */
      const pageValue = size !== current.pageSize ? 1 : normalizePage(nextPage);

      return { key: resetKey, page: pageValue, pageSize: size };
    });
  };

  return buildResult({ page, pageSize: state.pageSize, total, onChange, pageSizeOptions });
};

/**
 * Phân trang giữ trên URL (?page=&size=). Giá trị mặc định không ghi lên URL.
 *
 * @param {{ total: number, pageKey?: string, sizeKey?: string, pageSizeOptions?: number[],
 *           defaultPageSize?: number }} options
 */
export const useUrlPagination = ({
  total = 0,
  pageKey = PAGE_QUERY_KEY,
  sizeKey = PAGE_SIZE_QUERY_KEY,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE,
} = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readPageQuery(searchParams, {
    pageKey,
    sizeKey,
    pageSizeOptions,
    defaultPageSize,
  });
  const page = clampPage(query.page, total, query.pageSize);

  const onChange = (nextPage, nextSize) => {
    setSearchParams(
      (current) => {
        const { pageSize: currentSize } = readPageQuery(current, {
          pageKey,
          sizeKey,
          pageSizeOptions,
          defaultPageSize,
        });
        const size = normalizePageSize(nextSize ?? currentSize, pageSizeOptions, currentSize);

        return writePageQuery(
          current,
          { page: size !== currentSize ? 1 : nextPage, pageSize: size },
          { pageKey, sizeKey, defaultPageSize },
        );
      },
      { replace: true },
    );
  };

  return buildResult({ page, pageSize: query.pageSize, total, onChange, pageSizeOptions });
};

/**
 * Phân trang phía client trên một mảng đã tải hết: usePagination + cắt trang.
 * @template T
 * @param {T[]} rows
 * @param {Parameters<typeof usePagination>[0]} [options] (total tự lấy từ rows)
 */
export const usePagedRows = (rows, options = {}) => {
  const list = Array.isArray(rows) ? rows : EMPTY_ROWS;
  const pagination = usePagination({ ...options, total: list.length });
  const { items } = paginateRows(list, pagination);

  return { ...pagination, items };
};

/**
 * Như usePagedRows nhưng trang nằm trên URL.
 * @template T
 * @param {T[]} rows
 * @param {Parameters<typeof useUrlPagination>[0]} [options]
 */
export const useUrlPagedRows = (rows, options = {}) => {
  const list = Array.isArray(rows) ? rows : EMPTY_ROWS;
  const pagination = useUrlPagination({ ...options, total: list.length });
  const { items } = paginateRows(list, pagination);

  return { ...pagination, items };
};

export default usePagination;
