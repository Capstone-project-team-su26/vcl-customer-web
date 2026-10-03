/*
 * Tách khỏi ConsignmentListDetailUI.jsx: bảng tra cứu tĩnh cho cấu hình đóng thùng,
 * không phụ thuộc state hay props nên để riêng cho dễ bổ sung mã cấu hình mới.
 */

/* Bảng tên/cỡ thùng theo mã: nguồn duy nhất ở @shared/utils/productTypeLabel. */
export { PACKAGE_CONFIGURATION_LABELS } from "@shared/utils/productTypeLabel";
