/* =========================================================
   LABELS
   =========================================================

   Tách riêng các bảng nhãn tĩnh để phần hiển thị của
   QuotationDetail không bị trôi khi thêm mã phí hay
   trạng thái mới.
   ========================================================= */

import {
  CONSIGNMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
  QUOTE_TYPE_LABELS,
} from "@shared/utils/statusLabel";

/*
 * Trạng thái báo giá, trạng thái / phương thức khoản cọc, loại báo giá, loại vận chuyển:
 * MỘT bảng dùng chung cho cả app (shared/utils/statusLabel.js) — giữ tên cũ để màn này
 * không phải sửa theo. Trạng thái báo giá khách thấy (QuotationAcceptanceRules):
 * DRAFT = tạm tính hệ thống tự sinh, PENDING = chính thức chờ khách, ACCEPTED / REJECTED;
 * EXPIRED do FE suy ra từ expiredAt.
 */
const QUOTATION_STATUS_FALLBACK_LABELS = QUOTATION_STATUS_LABELS;

/* Trạng thái khoản cọc (lịch sử thanh toán backend đã chuẩn hoá + mã giữ nguyên). */
const DEPOSIT_PAYMENT_STATUS_LABELS = PAYMENT_STATUS_LABELS;

const DEPOSIT_PAYMENT_METHOD_LABELS = PAYMENT_METHOD_LABELS;

const FEE_CODE_LABELS = {
  MAIN_SERVICE: "Cước vận chuyển quốc tế",

  DOMESTIC_SHIPPING_FEE: "Phí vận chuyển nội địa",

  WOOD_CRATE: "Dịch vụ đóng thùng gỗ",

  PACKING_FEE: "Giá cấu hình thùng",

  SUR_INSPECTION: "Phụ phí kiểm hàng",

  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm",

  SERVICE_FEE: "Phí dịch vụ",

  TAX_DUTY: "Thuế / phí nhập khẩu",

  VAT: "Thuế giá trị gia tăng",

  IMPORT_TAX: "Thuế nhập khẩu",
};

const FEE_TYPE_LABELS = {
  MAIN_SERVICE: "Dịch vụ chính",

  DOMESTIC_SHIPPING_FEE: "Vận chuyển nội địa",

  SURCHARGE: "Phụ phí",

  PACKING_FEE: "Phí đóng gói",

  SERVICE_FEE: "Phí dịch vụ",

  TAX_DUTY: "Thuế / phí nhập khẩu",
};

const CALCULATION_TYPE_LABELS = {
  PER_KG: "Theo kg",
  FIXED: "Cố định",
  PERCENTAGE: "Phần trăm",
};

/*
 * Các khoản phí đã có field riêng trong báo giá.
 * Không cộng lại lần hai từ additionalFees.
 */
const BASE_COST_FEE_CODES = new Set([
  "MAIN_SERVICE",
  "SERVICE_FEE",
  "TAX_DUTY",
]);

const SALES_NOTE_SERVICE_LABELS = {
  WOOD_CRATE:
    "Đóng thùng gỗ",

  SUR_INSURANCE_3PERCENT:
    "Bảo hiểm hàng hóa 3%",

  SUR_INSPECTION:
    "Kiểm hàng",

  PACKING_FEE:
    "Phí đóng gói",
};

const EMPTY_UI_TEXT_VALUES = new Set([
  "undefined",
  "null",
  "n/a",
  "na",
  "none",
  "nil",
  "nan",
]);

export {
  QUOTATION_STATUS_FALLBACK_LABELS,
  DEPOSIT_PAYMENT_STATUS_LABELS,
  DEPOSIT_PAYMENT_METHOD_LABELS,
  QUOTE_TYPE_LABELS,
  CONSIGNMENT_TYPE_LABELS,
  FEE_CODE_LABELS,
  FEE_TYPE_LABELS,
  CALCULATION_TYPE_LABELS,
  BASE_COST_FEE_CODES,
  SALES_NOTE_SERVICE_LABELS,
  EMPTY_UI_TEXT_VALUES,
};
