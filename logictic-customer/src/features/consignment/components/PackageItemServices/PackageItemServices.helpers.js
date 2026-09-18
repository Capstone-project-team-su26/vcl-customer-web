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
