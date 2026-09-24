const formatVnd = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(
    Number(value) || 0,
  );

const normalizeCalculationType = (service) =>
  String(service?.calculationType || "").trim().toUpperCase();

/** Dịch vụ tính theo % giá trị hàng: backend bắt kiện phải có declaredValue > 0. */
export const isPercentageItemService = (service) =>
  normalizeCalculationType(service) === "PERCENTAGE";

/** Nhãn mức phí của một dịch vụ theo kiện, theo cách backend tính (ItemServiceRules). */
export const formatItemServiceFee = (service) => {
  const value = Number(service?.value) || 0;

  const base = {
    FIXED: `${formatVnd(value)}/kiện`,
    PERCENTAGE: `${formatNumber(value)}% giá trị kiện`,
    PER_KG: `${formatVnd(value)}/kg`,
    PER_CBM: `${formatVnd(value)}/m³`,
    PER_PRODUCT: `${formatVnd(value)}/sản phẩm`,
  }[normalizeCalculationType(service)] || formatVnd(value);

  const limits = [
    service?.minAmount != null && `tối thiểu ${formatVnd(service.minAmount)}`,
    service?.maxAmount != null && `tối đa ${formatVnd(service.maxAmount)}`,
  ].filter(Boolean);

  return limits.length ? `${base} (${limits.join(", ")})` : base;
};

/*
 * TÍNH THỬ PHÍ NGAY TRÊN MÀN — chép đúng công thức backend
 * (VCL_BLL/Helpers/ItemServiceRules.CalculateAmount):
 *
 *   FIXED       -> value
 *   PERCENTAGE  -> declaredValue * value / 100
 *   PER_KG      -> cân nặng * value        (kho cân xong thì dùng cân nặng tính cước thật)
 *   PER_CBM     -> dài*rộng*cao/1.000.000 * value
 *   PER_PRODUCT -> số lượng * value
 *   sau đó kẹp minAmount / maxAmount rồi làm tròn về đồng.
 *
 * Mục đích: khách (và người duyệt) nhìn thấy CON SỐ và CÁCH RA CON SỐ ngay lúc khai, thay vì
 * chỉ thấy "3% giá trị kiện" rồi đợi báo giá mới biết mình phải trả bao nhiêu. Đây là số TẠM
 * TÍNH theo khai báo; số chính thức nằm trong báo giá do nhân viên phát hành, và nếu kho cân
 * đo lại lệch thì dịch vụ tính theo cân nặng/thể tích sẽ đổi theo số đo thật.
 */

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Các đại lượng của kiện mà công thức cần; thiếu cái nào thì coi như chưa tính được. */
const getBasisValue = (service, pkg = {}) => {
  switch (normalizeCalculationType(service)) {
    case "FIXED":
      return { ready: true, basis: 1, label: "" };

    case "PERCENTAGE":
      return {
        ready: toNumber(pkg.declaredValue) > 0,
        basis: toNumber(pkg.declaredValue),
        label: "giá trị kiện",
        missing: "giá trị kiện hàng",
      };

    case "PER_KG":
      return {
        ready: toNumber(pkg.weight) > 0,
        basis: toNumber(pkg.weight),
        label: "cân nặng",
        missing: "cân nặng",
      };

    case "PER_CBM": {
      const cbm =
        (toNumber(pkg.length) * toNumber(pkg.width) * toNumber(pkg.height)) /
        1000000;

      return {
        ready: cbm > 0,
        basis: cbm,
        label: "thể tích",
        missing: "kích thước (dài, rộng, cao)",
      };
    }

    case "PER_PRODUCT":
      return {
        ready: toNumber(pkg.quantity) > 0,
        basis: toNumber(pkg.quantity),
        label: "số lượng",
        missing: "số lượng sản phẩm",
      };

    default:
      return { ready: true, basis: 1, label: "" };
  }
};

/**
 * Phí tạm tính của một dịch vụ cho một kiện.
 *
 * @returns {{ ready: boolean, amount: number, formula: string, clamped: ""|"min"|"max",
 *   missing: string }}
 */
export const estimateItemServiceFee = (service, pkg = {}) => {
  const type = normalizeCalculationType(service);
  const rate = toNumber(service?.value);
  const { ready, basis, label, missing } = getBasisValue(service, pkg);

  if (!ready) {
    return { ready: false, amount: 0, formula: "", clamped: "", missing: missing || "" };
  }

  const raw =
    type === "PERCENTAGE"
      ? (basis * rate) / 100
      : type === "FIXED"
        ? rate
        : basis * rate;

  const min = service?.minAmount != null ? toNumber(service.minAmount) : null;
  const max = service?.maxAmount != null ? toNumber(service.maxAmount) : null;

  let amount = raw;
  let clamped = "";

  if (min != null && amount < min) {
    amount = min;
    clamped = "min";
  }

  if (max != null && amount > max) {
    amount = max;
    clamped = "max";
  }

  amount = Math.round(amount);

  const formula =
    type === "FIXED"
      ? `Phí cố định ${formatVnd(rate)}`
      : type === "PERCENTAGE"
        ? `${formatNumber(rate)}% × ${formatVnd(basis)} = ${formatVnd(Math.round(raw))}`
        : `${formatNumber(basis)} ${
            { PER_KG: "kg", PER_CBM: "m³", PER_PRODUCT: "sản phẩm" }[type] || ""
          } × ${formatVnd(rate)} = ${formatVnd(Math.round(raw))}`;

  return { ready: true, amount, formula, clamped, missing: "", basisLabel: label };
};

/** Tổng phí tạm tính của những dịch vụ kiện này đang chọn. */
export const sumSelectedItemServiceFees = (services = [], selectedIds = [], pkg = {}) => {
  const selected = new Set(selectedIds);

  return services
    .filter((service) => selected.has(service?.pricingRuleId))
    .reduce((total, service) => {
      const { ready, amount } = estimateItemServiceFee(service, pkg);

      return total + (ready ? amount : 0);
    }, 0);
};

export const formatItemServiceAmount = (amount) => formatVnd(amount);

/*
 * ĐIỀU KIỆN ĐƯỢC CHỌN DỊCH VỤ — lấy từ PRICING_RULES.condition_type/condition_value mà API
 * trả kèm (conditionType / conditionValue).
 *
 * Hiện chỉ có MIN_DECLARED_VALUE: bảo hiểm 3% chỉ áp cho kiện khai giá từ 5.000.000 đ trở lên.
 * API cũ chưa trả hai trường này, nên thiếu thì coi như không có điều kiện — màn hình vẫn chạy
 * bình thường với bản backend chưa cập nhật.
 */
export const getItemServiceCondition = (service) => {
  const type = String(service?.conditionType || "").trim().toUpperCase();

  if (type !== "MIN_DECLARED_VALUE") {
    return null;
  }

  const threshold = Number(String(service?.conditionValue || "").trim());

  if (!Number.isFinite(threshold) || threshold <= 0) {
    return null;
  }

  return {
    type,
    threshold,
    text: `Chỉ áp dụng cho kiện khai giá từ ${formatVnd(threshold)} trở lên.`,
  };
};

/** Kiện này có đủ điều kiện chọn dịch vụ không. */
export const meetsItemServiceCondition = (service, pkg = {}) => {
  const condition = getItemServiceCondition(service);

  if (!condition) {
    return true;
  }

  return Number(pkg?.declaredValue) >= condition.threshold;
};
