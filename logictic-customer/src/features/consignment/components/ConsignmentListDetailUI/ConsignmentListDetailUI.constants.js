/*
 * Tách khỏi ConsignmentListDetailUI.jsx: bảng tra cứu tĩnh cho cấu hình đóng thùng,
 * không phụ thuộc state hay props nên để riêng cho dễ bổ sung mã cấu hình mới.
 */

export const PACKAGE_CONFIGURATION_LABELS = {
  SMALL: {
    name: "Thùng cỡ nhỏ",
    size: "CỠ NHỎ",
  },
  MEDIUM: {
    name: "Thùng cỡ vừa",
    size: "CỠ VỪA",
  },
  LARGE: {
    name: "Thùng cỡ lớn",
    size: "CỠ LỚN",
  },
  CUSTOM: {
    name: "Thùng tùy chỉnh",
    size: "TÙY CHỈNH",
  },
};
