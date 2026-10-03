/*
 * Bảng giá vận chuyển cho khách — lớp hiển thị thuần (không gọi mạng).
 *
 * Đầu vào: các dòng đã qua normalizeServicePricing (cùng bản chuẩn hoá với màn admin
 * "Bảng giá vận chuyển", GET /api/service-pricings). Ở đây chỉ:
 *   1. chọn dòng khách được thấy — đúng cách QuotationService chọn bảng giá khi báo giá:
 *      cùng dịch vụ + tuyến + đơn vị tính (+ mức cân nếu có), dòng có ngày hiệu lực ≤ hiện
 *      tại và mới nhất là "Đang áp dụng"; dòng cũ hơn đã bị thay thế thì ẩn; dòng có ngày
 *      hiệu lực ở tương lai giữ lại, gắn nhãn "Sắp áp dụng"; dòng có status khác ACTIVE
 *      (nếu backend trả) hoặc isDeleted thì bỏ;
 *   2. định dạng: "32.000 đ/kg" (vi-VN, đơn vị lấy từ unitType), mức cân "0 – 5 kg";
 *   3. sắp xếp / gom nhóm: tuyến → dịch vụ → mức cân; phí không phải vận chuyển (lưu kho)
 *      xếp cuối và không tính vào số tuyến / loại dịch vụ.
 */

import { displayCode } from "@shared/utils/statusLabel";

const CURRENCY_CODES = new Set(["VND", "USD", "CNY", "RMB", "JPY", "KRW", "EUR"]);

/* Phí không phải phương án vận chuyển — khớp ServicePricingHelper.NonShippingServiceTypes. */
const NON_SHIPPING_SERVICE_TYPES = new Set(["STORAGE"]);

const SERVICE_LABELS = {
  EXPRESS: "Hỏa tốc",
  STANDARD: "Tiêu chuẩn",
  ECONOMY: "Tiết kiệm",
  FAST: "Nhanh",
  STORAGE: "Lưu kho",
};

const SERVICE_ORDER = ["EXPRESS", "FAST", "STANDARD", "ECONOMY"];

const COUNTRY_LABELS = {
  VN: "Việt Nam",
  CN: "Trung Quốc",
  KR: "Hàn Quốc",
  JP: "Nhật Bản",
  US: "Hoa Kỳ",
  ID: "Indonesia",
  TH: "Thái Lan",
  TW: "Đài Loan",
  HK: "Hồng Kông",
};

const UNIT_LABELS = {
  KG: "kg",
  KGS: "kg",
  KILOGRAM: "kg",
  M3: "m³",
  CBM: "m³",
  PACKAGE: "kiện",
  PARCEL: "kiện",
  PIECE: "kiện",
  PCS: "kiện",
  PARCEL_DAY: "kiện/ngày",
  PACKAGE_DAY: "kiện/ngày",
  ORDER: "đơn",
};

const WEIGHT_UNITS = new Set(["KG", "KGS", "KILOGRAM"]);

export const PRICE_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  UPCOMING: "UPCOMING",
});

export const PRICE_STATUS_META = Object.freeze({
  CURRENT: { label: "Đang áp dụng", tone: "is-active" },
  UPCOMING: { label: "Sắp áp dụng", tone: "is-pending" },
});

const upper = (value) => String(value ?? "").trim().toUpperCase();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toTime = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatNumber = (value, maximumFractionDigits = 2) =>
  Number(value).toLocaleString("vi-VN", { maximumFractionDigits });

/** "VND/KG" → "KG", "kg" → "KG", "PARCEL_DAY" giữ nguyên. */
export const getUnitCode = (unitType) => {
  const parts = upper(unitType)
    .split("/")
    .map((part) => part.trim().replace(/[\s-]+/g, "_"))
    .filter((part) => part && !CURRENCY_CODES.has(part));

  return parts.join("_");
};

export const getUnitLabel = (unitType) => {
  const code = getUnitCode(unitType);
  return UNIT_LABELS[code] || "đơn vị";
};

export const isWeightUnit = (unitType) => WEIGHT_UNITS.has(getUnitCode(unitType));

export const isShippingService = (serviceType) =>
  Boolean(upper(serviceType)) && !NON_SHIPPING_SERVICE_TYPES.has(upper(serviceType));

export const getServiceLabel = (serviceType) => {
  const code = upper(serviceType);
  if (!code) return "—";
  return SERVICE_LABELS[code] || displayCode(serviceType, null, { generic: "Dịch vụ khác" });
};

export const getCountryLabel = (country, fallback) => {
  const code = upper(country).replace(/[^A-Z]/g, "");
  if (COUNTRY_LABELS[code]) return COUNTRY_LABELS[code];
  if (fallback && upper(fallback) !== code) return fallback;
  return code || "—";
};

export const getRouteLabel = (pricing) => {
  const origin = getCountryLabel(pricing?.originCountry, pricing?.originCountryDisplayName);
  const destination = getCountryLabel(
    pricing?.destinationCountry,
    pricing?.destinationCountryDisplayName,
  );

  if (upper(pricing?.originCountry) && upper(pricing?.originCountry) === upper(pricing?.destinationCountry)) {
    return `Tại ${origin}`;
  }

  return `${origin} → ${destination}`;
};

/**
 * Đơn giá trên một dòng: "32.000 đ/kg", "1.500.000 đ/m³", "12,5 USD/kg".
 * Giá 0 / thiếu → "Liên hệ" (backend tạm tính cước 0 khi bảng giá chưa có giá).
 */
export const formatUnitPrice = (pricing) => {
  const price = toNumberOrNull(pricing?.price);
  if (price === null || price <= 0) return "Liên hệ";

  const currency = upper(pricing?.currency) || "VND";
  const amount =
    currency === "VND"
      ? `${formatNumber(Math.round(price), 0)} đ`
      : `${formatNumber(price)} ${currency}`;

  return `${amount}/${getUnitLabel(pricing?.unitType)}`;
};

export const getWeightRange = (pricing) => ({
  min: toNumberOrNull(pricing?.minWeight ?? pricing?.weightFrom),
  max: toNumberOrNull(pricing?.maxWeight ?? pricing?.weightTo),
});

/** "0 – 5 kg", "Trên 20 kg", "Đến 5 kg"; không có bậc cân → "Mọi mức cân"; đơn vị không phải kg → "—". */
export const formatWeightRange = (pricing) => {
  const { min, max } = getWeightRange(pricing);

  if (min !== null && max !== null) return `${formatNumber(min)} – ${formatNumber(max)} kg`;
  if (min !== null && min > 0) return `Trên ${formatNumber(min)} kg`;
  if (max !== null) return `0 – ${formatNumber(max)} kg`;

  return isWeightUnit(pricing?.unitType) ? "Mọi mức cân" : "—";
};

export const formatDate = (value) => {
  const time = toTime(value);
  if (time === null) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(time));
};

const isVisibleRecord = (pricing) => {
  if (!pricing || pricing.isDeleted === true) return false;
  if (pricing.isActive === false) return false;
  const status = upper(pricing.status);
  return !status || status === "ACTIVE";
};

const getTierKey = (pricing) => {
  const { min, max } = getWeightRange(pricing);
  return [
    upper(pricing?.serviceType),
    upper(pricing?.originCountry),
    upper(pricing?.destinationCountry),
    getUnitCode(pricing?.unitType),
    min ?? "",
    max ?? "",
  ].join("|");
};

const serviceRank = (serviceType) => {
  const code = upper(serviceType);
  if (!isShippingService(code)) return SERVICE_ORDER.length + 2;
  const index = SERVICE_ORDER.indexOf(code);
  return index >= 0 ? index : SERVICE_ORDER.length;
};

const collator = new Intl.Collator("vi", { sensitivity: "base" });

/**
 * Dựng bảng giá cho khách từ danh sách đã chuẩn hoá.
 *
 * @returns {{
 *   rows: Array, groups: Array<{ key, label, isShipping, rows }>,
 *   stats: { total, upcoming, routes, serviceTypes }, hiddenCount: number
 * }}
 */
export const buildCustomerPriceList = (pricings = [], { now = Date.now() } = {}) => {
  const input = Array.isArray(pricings) ? pricings : [];
  const records = input.filter(isVisibleRecord);
  const nowTime = typeof now === "number" ? now : new Date(now).getTime();

  /* Dòng đang áp dụng của mỗi bậc giá: ngày hiệu lực ≤ hiện tại, mới nhất (null cũ nhất). */
  const currentByTier = new Map();
  records.forEach((pricing) => {
    const time = toTime(pricing.effectiveDate);
    if (time !== null && time > nowTime) return;

    const key = getTierKey(pricing);
    const existing = currentByTier.get(key);
    const existingTime = existing ? toTime(existing.effectiveDate) : null;

    if (!existing || (time ?? -Infinity) > (existingTime ?? -Infinity)) {
      currentByTier.set(key, pricing);
    }
  });

  const rows = records
    .map((pricing) => {
      const time = toTime(pricing.effectiveDate);
      const isUpcoming = time !== null && time > nowTime;

      if (!isUpcoming && currentByTier.get(getTierKey(pricing)) !== pricing) {
        return null; // đã bị dòng mới hơn thay thế
      }

      const status = isUpcoming ? PRICE_STATUS.UPCOMING : PRICE_STATUS.CURRENT;
      const routeLabel = getRouteLabel(pricing);
      const serviceLabel = getServiceLabel(pricing.serviceType);
      const priceLabel = formatUnitPrice(pricing);
      const weightLabel = formatWeightRange(pricing);
      const effectiveLabel = formatDate(pricing.effectiveDate);
      const shipping = isShippingService(pricing.serviceType);

      return {
        ...pricing,
        view: {
          routeKey: shipping
            ? `${upper(pricing.originCountry)}-${upper(pricing.destinationCountry)}`
            : `OTHER-${upper(pricing.originCountry)}-${upper(pricing.destinationCountry)}`,
          routeLabel: shipping ? routeLabel : `Phí khác · ${routeLabel}`,
          serviceLabel,
          unitLabel: getUnitLabel(pricing.unitType),
          priceLabel,
          weightLabel,
          effectiveLabel,
          status,
          statusLabel: PRICE_STATUS_META[status].label,
          statusTone: PRICE_STATUS_META[status].tone,
          isShipping: shipping,
          searchText: [routeLabel, serviceLabel, priceLabel, weightLabel, effectiveLabel, PRICE_STATUS_META[status].label]
            .join(" ")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/đ/g, "d")
            .toLowerCase(),
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.view.isShipping !== b.view.isShipping) return a.view.isShipping ? -1 : 1;

      const route = collator.compare(a.view.routeLabel, b.view.routeLabel);
      if (route !== 0) return route;

      const service = serviceRank(a.serviceType) - serviceRank(b.serviceType);
      if (service !== 0) return service;
      if (a.view.serviceLabel !== b.view.serviceLabel) {
        return collator.compare(a.view.serviceLabel, b.view.serviceLabel);
      }

      const weight = (getWeightRange(a).min ?? -1) - (getWeightRange(b).min ?? -1);
      if (weight !== 0) return weight;

      return (toTime(a.effectiveDate) ?? 0) - (toTime(b.effectiveDate) ?? 0);
    });

  const groups = [];
  rows.forEach((row) => {
    const last = groups[groups.length - 1];
    if (last && last.key === row.view.routeKey) {
      last.rows.push(row);
    } else {
      groups.push({
        key: row.view.routeKey,
        label: row.view.routeLabel,
        isShipping: row.view.isShipping,
        rows: [row],
      });
    }
  });

  const currentShipping = rows.filter(
    (row) => row.view.status === PRICE_STATUS.CURRENT && row.view.isShipping,
  );

  return {
    rows,
    groups,
    stats: {
      total: rows.filter((row) => row.view.status === PRICE_STATUS.CURRENT).length,
      upcoming: rows.filter((row) => row.view.status === PRICE_STATUS.UPCOMING).length,
      routes: new Set(currentShipping.map((row) => row.view.routeKey)).size,
      serviceTypes: new Set(currentShipping.map((row) => upper(row.serviceType))).size,
    },
    /* Dòng bị ẩn: ngừng hoạt động / đã xoá + dòng đã bị bảng giá mới hơn thay thế. */
    hiddenCount: input.length - rows.length,
  };
};

/** Lọc theo ô tìm kiếm (không dấu), giữ thứ tự + nhóm. */
export const searchPriceList = (groups = [], keyword = "") => {
  const query = String(keyword ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();

  if (!query) return groups;

  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.view.searchText.includes(query)),
    }))
    .filter((group) => group.rows.length > 0);
};

/** Phụ phí đóng thùng (boxPricingRules ACTIVE backend gắn kèm) → dòng hiển thị cho khách. */
export const formatBoxRule = (rule) => {
  const name = String(rule?.ruleName || "").trim() || "Phụ phí đóng gói";
  const value = toNumberOrNull(rule?.value);
  const type = upper(rule?.calculationType);

  if (value === null) return { name, value: "Liên hệ" };
  if (type === "PERCENTAGE") return { name, value: `${formatNumber(value)}%` };

  const unit = { PER_KG: "/kg", PER_CBM: "/m³", PER_PRODUCT: "/sản phẩm" }[type] || "";
  return { name, value: `${formatNumber(Math.round(value), 0)} đ${unit}` };
};
