/*
 * Hằng số tra cứu của dịch vụ bổ sung đơn mua hộ (mã ẩn, bảng nhãn hiển thị,
 * giá trị rỗng mặc định). Tách khỏi component để khi nghiệp vụ đổi nhãn hoặc
 * thêm mã cần ẩn thì chỉ phải sửa đúng một chỗ.
 */

export const ACTIVE_STATUS = "ACTIVE";
export const VOLUMETRIC_DIVISOR_CODE = "VOLUMETRIC_DIVISOR";


export const HIDDEN_RULE_CODES = new Set([
  "DOMESTIC_FEE",
  "PURCHASE_FEE",
  "SERVICE_PURCHASE_FEE",
  "BUYING_FEE",
  /* Tham số hệ thống và phí khi tất toán đã gộp vào pricingRules (dò theo ruleType). */
  "SYSTEM_PARAMETER",
  "SETTLEMENT_FEE",
]);

export const HIDDEN_RULE_IDS = new Set([
  "0385131b-214c-49b8-9de2-116d62f27111", // DOMESTIC_FEE
  "35905dcf-4e55-4cc7-ab9a-2453e012fe74", // PURCHASE_FEE / Phí dịch vụ mua hộ
]);

export const STATUS_LABELS = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Ngừng áp dụng",
  PENDING: "Chờ áp dụng",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hiệu lực",
  DISABLED: "Tạm ngưng",
  DRAFT: "Bản nháp",
  DELETED: "Đã xóa",
};

export const CALCULATION_TYPE_LABELS = {
  FIXED: "Phí cố định",
  PERCENTAGE: "Tính theo phần trăm",
  PER_UNIT: "Tính theo đơn vị",
  RANGE: "Tính theo khoảng",
  FORMULA: "Tính theo công thức",
};

export const RULE_CODE_LABELS = {
  WOOD_CRATE: "Đóng thùng gỗ",
  DOMESTIC_FEE: "Phí vận chuyển nội địa",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm",
  PURCHASE_FEE: "Phí dịch vụ mua hộ",
};

export const RULE_TYPE_LABELS = {
  WOOD_BOX: "Thùng gỗ",
  DOMESTIC_FEE: "Vận chuyển nội địa",
  INSPECTION: "Kiểm hàng",
  INSURANCE: "Bảo hiểm hàng hóa",
  PACKING: "Đóng gói hàng hóa",
  PURCHASE_FEE: "Dịch vụ mua hộ",
};

export const CONDITION_TYPE_LABELS = {
  REQUIRES_INSPECTION: "Áp dụng khi yêu cầu kiểm hàng",
  MIN_DECLARED_VALUE: "Giá trị khai báo tối thiểu",
  MAX_DECLARED_VALUE: "Giá trị khai báo tối đa",
  REQUIRES_INSURANCE: "Áp dụng khi yêu cầu bảo hiểm",
};

export const LEGACY_RULE_KEYS = {
  WOOD_CRATE: "requiresWoodenCrate",
  SUR_INSURANCE_3PERCENT: "requiresInsurance",
  SUR_INSPECTION: "requiresInspection",
};

export const EMPTY_PACKAGE_SERVICES = {
  requiresPacking: false,
  requiresWoodenCrate: false,
  requiresInsurance: false,
  requiresInspection: false,
  selectedRuleCodes: [],
  selectedPricingRuleIds: [],
  packageConfigurationByPackageId: {},
  selectedPackageConfigurations: [],
  woodCratePackageCount: 0,
  woodCrateQuantity: 0,
  woodCrateUnitFee: 0,
  woodCrateBaseFeePerPackage: 0,
  woodCrateBaseFee: 0,
  woodCrateConfigurationFee: 0,
  woodCrateTotalFee: 0,
  woodCrateCompleted: false,
};
