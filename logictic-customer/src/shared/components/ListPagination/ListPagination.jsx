import { Pagination } from "antd";

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  PAGINATION_LOCALE_VI,
  formatPageRange,
} from "@shared/utils/pagination";

import "./ListPagination.css";

/**
 * Thanh phân trang DÙNG CHUNG cho mọi danh sách của khách: câu "Hiển thị x–y / N" bên
 * trái, số trang + chọn cỡ trang (10/20/50) bên phải; màn hẹp thì xếp chồng.
 *
 * Không giữ state — nhận page/pageSize/total, báo onChange(page, pageSize). State nằm ở
 * shared/hooks/usePagination (rải `paginationProps` của hook vào đây). Dùng được cho cả
 * phân trang phía server (total = totalCount API trả) lẫn phía client.
 *
 * - total = 0 → không hiện gì (trang tự lo trạng thái rỗng).
 * - hideOnSinglePage → danh sách vừa một trang cỡ nhỏ nhất (≤ 10 dòng) thì ẩn hẳn; dùng
 *   cho khối phụ nhỏ (sự cố của một đơn, hội thoại...). Danh sách chính thì để false:
 *   luôn hiện câu tóm tắt.
 * - compact → bản gọn cho cột hẹp (sidebar hội thoại, panel thông báo): không chọn cỡ
 *   trang, nút nhỏ.
 *
 * @param {{ page: number, pageSize: number, total: number,
 *           onChange: (page: number, pageSize: number) => void,
 *           pageSizeOptions?: number[], unit?: string, hideOnSinglePage?: boolean,
 *           compact?: boolean, disabled?: boolean, className?: string,
 *           ariaLabel?: string }} props
 */
export default function ListPagination({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  total = 0,
  onChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  unit = "",
  hideOnSinglePage = false,
  compact = false,
  disabled = false,
  className = "",
  ariaLabel = "Phân trang",
}) {
  const count = Number(total) || 0;
  const smallestSize = pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE;

  if (count <= 0) return null;
  if (hideOnSinglePage && count <= smallestSize) return null;

  const classes = ["list-pagination", compact && "list-pagination--compact", className]
    .filter(Boolean)
    .join(" ");

  return (
    <nav className={classes} aria-label={ariaLabel}>
      <span className="list-pagination__summary" aria-live="polite">
        {formatPageRange({ page, pageSize, total: count, unit })}
      </span>

      <Pagination
        className="list-pagination__pager"
        current={page}
        pageSize={pageSize}
        total={count}
        disabled={disabled}
        size={compact ? "small" : undefined}
        showSizeChanger={!compact && count > smallestSize}
        pageSizeOptions={pageSizeOptions.map(String)}
        showLessItems
        locale={PAGINATION_LOCALE_VI}
        onChange={(nextPage, nextSize) => onChange?.(nextPage, nextSize)}
      />
    </nav>
  );
}
