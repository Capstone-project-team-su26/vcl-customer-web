/**
 * BẢNG GIÁ VẬN CHUYỂN — API THẬT, CÙNG NGUỒN VỚI MÀN ADMIN "Bảng giá vận chuyển".
 *
 * Bản sao phía khách của vcl-admin-ui/src/features/pricing/api/servicePricingService.js
 * (repo tách rời nên không import chéo được). Giữ NGUYÊN normalizeServicePricing và
 * filterServicePricings của admin để hai bên đọc cùng một dòng giá ra cùng một hình dạng;
 * sửa logic chuẩn hoá thì sửa cả hai bản.
 *
 * - GET /api/service-pricings        → MẢNG TRẦN các dòng giá ([AllowAnonymous], khách gọi được)
 * - GET /api/service-pricings/{id}   → object trần
 *
 * Backend (ServicePricingService.GetAllAsync) chỉ trả dòng chưa xoá mềm, gồm:
 * { id, carrierId, serviceType, originCountry, destinationCountry, unitType, price,
 *   currency, effectiveDate, boxPricingRules[] (chỉ rule ACTIVE) }. Không có giá vốn hay
 * ghi chú nội bộ. Dòng chưa tới ngày hiệu lực / đã bị dòng mới hơn thay thế được lọc
 * ở tầng hiển thị (features/service-policy/utils/servicePricingTable.js), đúng cách
 * QuotationService chọn bảng giá khi báo giá.
 */

import httpClient from "@shared/api/httpClient";

export const SERVICE_PRICINGS_ENDPOINT = "/api/service-pricings";

/* Bóc envelope { message, data } nếu có; endpoint này trả mảng / object trần. */
const getResponseData = (response) => {
  const body = response?.data;

  return body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;
};

const getArrayItems = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

/* =========================
   NORMALIZE HELPERS (giống admin)
========================= */

const normalizeText = (value) =>
  String(value ?? "").trim();

const normalizeUpperText = (value) =>
  normalizeText(value).toUpperCase();

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const COUNTRY_LABELS = {
  VN: "Việt Nam",
  VIETNAM: "Việt Nam",
  CN: "Trung Quốc",
  CHINA: "Trung Quốc",
  KR: "Hàn Quốc",
  KOREA: "Hàn Quốc",
  SOUTHKOREA: "Hàn Quốc",
  JP: "Nhật Bản",
  JAPAN: "Nhật Bản",
};

const SERVICE_TYPE_LABELS = {
  EXPRESS: "Hỏa tốc",
  STANDARD: "Tiêu chuẩn",
  ECONOMY: "Tiết kiệm",
};

const getCountryDisplayName = (value) => {
  const normalized = normalizeUpperText(value).replace(
    /[^A-Z0-9]/g,
    ""
  );
  return COUNTRY_LABELS[normalized] || normalizeText(value) || "—";
};

const getServiceTypeDisplayName = (value) => {
  const normalized = normalizeUpperText(value);
  return SERVICE_TYPE_LABELS[normalized] || normalizeText(value) || "—";
};

const formatEffectiveDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalizeText(value) || "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatVnd = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(normalizeNumber(value, 0));

/* =========================
   NORMALIZE SERVICE PRICING (giống admin)
========================= */

export const normalizeServicePricing = (
  pricing = {}
) => {
  const serviceType = normalizeUpperText(pricing?.serviceType);
  const originCountry = normalizeUpperText(pricing?.originCountry);
  const destinationCountry = normalizeUpperText(pricing?.destinationCountry);
  const currency = normalizeUpperText(pricing?.currency) || "VND";
  const price = normalizeNumber(pricing?.price, 0);
  const effectiveDate = pricing?.effectiveDate || null;

  return {
    ...pricing,
    id: normalizeText(pricing?.id),
    carrierId: normalizeText(pricing?.carrierId) || null,
    serviceType,
    serviceTypeDisplayName: getServiceTypeDisplayName(serviceType),
    originCountry,
    originCountryDisplayName: getCountryDisplayName(originCountry),
    destinationCountry,
    destinationCountryDisplayName: getCountryDisplayName(destinationCountry),
    routeDisplayName:
      `${getCountryDisplayName(originCountry)} → ` +
      getCountryDisplayName(destinationCountry),
    unitType: normalizeUpperText(pricing?.unitType),
    price,
    formattedPrice:
      currency === "VND"
        ? formatVnd(price)
        : `${price.toLocaleString("vi-VN")} ${currency}`,
    currency,
    effectiveDate,
    effectiveDateDisplay: formatEffectiveDate(effectiveDate),
    boxPricingRules: Array.isArray(pricing?.boxPricingRules)
      ? pricing.boxPricingRules
      : [],
  };
};

/* =========================
   FILTER (giống admin)
========================= */

export const filterServicePricings = (
  servicePricings = [],
  filters = {}
) => {
  if (!Array.isArray(servicePricings)) {
    return [];
  }

  const serviceType = normalizeUpperText(filters?.serviceType);
  const originCountry = normalizeUpperText(filters?.originCountry);
  const destinationCountry = normalizeUpperText(filters?.destinationCountry);
  const unitType = normalizeUpperText(filters?.unitType);
  const carrierId = normalizeText(filters?.carrierId);

  return servicePricings.filter((pricing) => {
    if (serviceType && pricing.serviceType !== serviceType) return false;
    if (originCountry && pricing.originCountry !== originCountry) return false;
    if (destinationCountry && pricing.destinationCountry !== destinationCountry) return false;
    if (unitType && pricing.unitType !== unitType) return false;
    if (carrierId && pricing.carrierId !== carrierId) return false;
    return true;
  });
};

/* =========================
   GET SERVICE PRICINGS
========================= */

export const getServicePricingsApi = async (
  filters = {}
) => {
  const response = await httpClient.get(
    SERVICE_PRICINGS_ENDPOINT,
    { signal: filters?.signal }
  );

  const normalized = getArrayItems(
    getResponseData(response)
  )
    .map(normalizeServicePricing)
    .filter((pricing) => Boolean(pricing.id));

  /* Backend không nhận bộ lọc qua query string: lọc tại chỗ như admin. */
  return filterServicePricings(normalized, {
    serviceType: filters?.serviceType,
    originCountry: filters?.originCountry,
    destinationCountry: filters?.destinationCountry,
    unitType: filters?.unitType,
    carrierId: filters?.carrierId,
  });
};

export const getServicePricingDetailApi = async (
  servicePricingId,
  options = {}
) => {
  const id = normalizeText(servicePricingId);

  if (!id) {
    throw new Error("Không tìm thấy mã bảng giá dịch vụ.");
  }

  const response = await httpClient.get(
    `${SERVICE_PRICINGS_ENDPOINT}/${encodeURIComponent(id)}`,
    { signal: options?.signal }
  );

  return normalizeServicePricing(
    getResponseData(response) || {}
  );
};

const servicePricingService = {
  normalizeServicePricing,
  getServicePricingsApi,
  getServicePricingDetailApi,
  formatVnd,
  filterServicePricings,
};

export default servicePricingService;
