/* =========================================================
   LABELS
   =========================================================

   Tách riêng các bảng nhãn tĩnh để phần hiển thị của
   QuotationDetail không bị trôi khi thêm mã phí hay
   trạng thái mới.
   ========================================================= */

/*
 * Trạng thái báo giá khách thấy (QuotationAcceptanceRules của backend):
 * DRAFT = tạm tính hệ thống tự sinh, PENDING = chính thức chờ khách,
 * ACCEPTED / REJECTED; EXPIRED do FE suy ra từ expiredAt.
 */
const QUOTATION_STATUS_FALLBACK_LABELS = {
  DRAFT: "Tạm tính",
  PENDING: "Chờ bạn xác nhận",
  APPROVED: "Đã duyệt",
  ACCEPTED: "Đã chấp nhận",
  PAID: "Đã thanh toán",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
};

/* Trạng thái khoản cọc (lịch sử thanh toán backend đã chuẩn hoá + mã giữ nguyên). */
const DEPOSIT_PAYMENT_STATUS_LABELS = {
  PENDING: "Chờ thanh toán",
  SUCCESS: "Đã thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  CANCELED: "Đã hủy",
  CANCELLED: "Đã hủy",
  PENDING_RECONCILIATION: "Chờ đối soát",
  RECEIVED_UNALLOCATED: "Đã nhận, chưa phân bổ",
};

const DEPOSIT_PAYMENT_METHOD_LABELS = {
  PAYOS: "payOS",
  OFFLINE: "Chuyển khoản ngân hàng",
  SEPAY: "SePay",
};

const QUOTE_TYPE_LABELS = {
  ESTIMATE: "Báo giá tạm tính",
  OFFICIAL: "Báo giá chính thức",
  FINAL: "Báo giá chính thức",
};

const CONSIGNMENT_TYPE_LABELS = {
  EXPRESS: "Hỏa tốc",
  "HỎA TỐC": "Hỏa tốc",
  "HOA TOC": "Hỏa tốc",
  STANDARD: "Tiêu chuẩn",
  "TIÊU CHUẨN": "Tiêu chuẩn",
  "TIEU CHUAN": "Tiêu chuẩn",
};

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
