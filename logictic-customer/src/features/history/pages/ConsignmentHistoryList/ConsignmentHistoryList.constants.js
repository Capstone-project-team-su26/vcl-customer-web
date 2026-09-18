/*
 * Dữ liệu tĩnh của màn hình lịch sử ký gửi được tách khỏi component
 * vì bảng nhãn trạng thái vừa dùng cho dropdown lọc vừa dùng cho thẻ đơn,
 * chỉ nên tồn tại ở một nơi duy nhất để tránh lệch nhãn giữa hai chỗ.
 */

import { ORDER_STATUS_LABELS } from "@features/consignment";

export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 450;

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: "10 đơn/trang" },
  { value: 20, label: "20 đơn/trang" },
  { value: 50, label: "50 đơn/trang" },
  { value: 100, label: "100 đơn/trang" },
];

/**
 * Nhãn trạng thái ĐƠN KÝ GỬI lấy từ module dùng chung của feature consignment
 * (19 mã đích, nhãn thống nhất giữa các app). Giữ tên export cũ làm lớp bọc để
 * helper và component hiện có không phải đổi chỗ đọc.
 * Mã cũ còn sót được chuẩn hóa bằng normalizeOrderStatus trước khi tra bảng này.
 */
export const STATUS_FALLBACK_LABELS = ORDER_STATUS_LABELS;
