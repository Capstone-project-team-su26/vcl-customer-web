/*
 * Bảng tra cứu tĩnh của màn hình chi tiết ký gửi.
 *
 * Tách riêng để nhãn tiếng Việt và mã quy tắc giá được sửa ở một chỗ,
 * thay vì lẫn giữa hàng nghìn dòng logic hiển thị.
 */

import { ORDER_STATUS_LABELS as SHARED_ORDER_STATUS_LABELS } from "@features/consignment/constants/orderStatus";

export const HIDDEN_ADDITIONAL_SERVICE_CODES = new Set([
  "VOLUMETRIC_DIVISOR",
  "VAT",
  "IMPORT_TAX",
  "DOMESTIC_FEE",
]);

export const WOOD_CRATE_RULE_CODE = "WOOD_CRATE";
export const VAT_RULE_CODE = "VAT";
export const IMPORT_TAX_RULE_CODE = "IMPORT_TAX";

export const PRICING_RULE_VI_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  WOOD_BOX: "Đóng thùng gỗ",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  INSPECTION: "Kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm 3%",
  INSURANCE: "Bảo hiểm hàng hóa",
  PACKING: "Đóng gói hàng hóa",
};

/* =========================================================
   TRẠNG THÁI ĐƠN HÀNG
   ========================================================= */

export const QUOTATION_STATUS_LABELS = {
  DRAFT: "TẠM TÍNH",
  PENDING: "CHỜ XÁC NHẬN",
  ACCEPTED: "ĐÃ CHẤP NHẬN",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  EXPIRED: "HẾT HẠN",
};

export const QUOTE_TYPE_LABELS = {
  ESTIMATE: "BÁO GIÁ TẠM TÍNH",
  FINAL: "BÁO GIÁ CHÍNH THỨC",
};


/*
 * Nhãn trạng thái đơn: lớp bọc giữ tên export cũ, dữ liệu lấy từ module
 * trạng thái dùng chung (19 mã đích). Mã cũ phải qua normalizeOrderStatus.
 */
export const ORDER_STATUS_LABELS = SHARED_ORDER_STATUS_LABELS;

export const DIM_DECIMAL_PLACES = 4;
export const MIN_DIM_WEIGHT = 0.0001;
export const DIM_ROUNDING_EPSILON = 1e-12;
