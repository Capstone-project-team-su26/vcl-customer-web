/**
 * Nhãn loại hàng và tên cấu hình thùng — NGUỒN DUY NHẤT trên web khách hàng.
 *
 * Luật: không bao giờ in GUID ra làm nhãn.
 *
 * - Dòng hàng của đơn lưu `productType` là ID loại hàng (GUID). ID seed kiểu
 *   `11111111-0000-0000-0000-000000000001` KHÔNG đúng chuẩn RFC 4122, nên nhận diện GUID
 *   phải dùng mẫu "lỏng" (8-4-4-4-12 hex), không kiểm version/variant.
 * - Dữ liệu cũ và mua hộ lưu thẳng TÊN trong `productType` — tên đó đi thẳng ra màn hình.
 * - Backend gửi kèm `productTypeName` (chi tiết đơn, kiện, phiếu tiếp nhận, mua hộ) và
 *   `packageConfiguration.displayName` (tên thùng tiếng Việt). FE vẫn là lưới an toàn khi
 *   thiếu: tra danh mục GET /api/product-types (Map id → tên, khoá chữ thường), vẫn không ra
 *   thì "Chưa phân loại".
 *
 * File thuần (không React, không mạng) để `tools/verify-api.mjs` nạp thẳng qua Vite SSR.
 * Phần nạp danh mục: `@shared/api/productTypeApi` + hook `@shared/hooks/useProductTypeNames`.
 */

export const UNCLASSIFIED_PRODUCT_TYPE_LABEL = "Chưa phân loại";

export const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chuỗi có dạng GUID (mẫu lỏng, nhận cả ID seed không chuẩn RFC 4122). */
export const isGuidLike = (value) =>
  (typeof value === "string" || typeof value === "number") &&
  GUID_PATTERN.test(String(value).trim());

/** Chữ hiển thị được: không rỗng và không phải GUID; ngược lại trả `fallback`. */
export const textWithoutGuid = (value, fallback = "") => {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  return text && !isGuidLike(text) ? text : fallback;
};

const toLookupKey = (value) =>
  value === null || value === undefined ? "" : String(value).trim().toLowerCase();

const firstName = (...values) => {
  for (const value of values) {
    const text = textWithoutGuid(value);
    if (text) return text;
  }
  return "";
};

/**
 * Map khoá chữ thường → tên, dựng từ danh mục loại hàng ở mọi hình dạng app đang có:
 * [{ id, name }] của API, option { value, label } của dropdown, hay bản ghi có
 * productTypeId / productTypeName. Tên là GUID thì bỏ (không có tên thì không tra).
 */
export const buildProductTypeNameMap = (list) => {
  const map = new Map();

  (Array.isArray(list) ? list : []).forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const name = firstName(entry.name, entry.productTypeName, entry.label, entry.displayName);
    if (!name) return;

    [entry.id, entry.productTypeId, entry.value, entry.code, entry.productTypeCode].forEach(
      (key) => {
        const lookupKey = toLookupKey(key);
        if (lookupKey && !map.has(lookupKey)) map.set(lookupKey, name);
      },
    );
  });

  return map;
};

const lookupName = (nameById, key) => {
  const lookupKey = toLookupKey(key);
  if (!lookupKey || !nameById || typeof nameById.get !== "function") return "";
  return textWithoutGuid(nameById.get(lookupKey) ?? nameById.get(String(key).trim()));
};

/** Giá trị thô (ID hoặc tên cũ) của loại hàng trên một dòng hàng. */
const getRawProductTypeValues = (item) => {
  const productType = item?.productType;

  if (productType && typeof productType === "object") {
    return [
      productType.id,
      productType.productTypeId,
      productType.value,
      productType.code,
      item?.productTypeId,
      item?.categoryId,
    ];
  }

  return [productType, item?.productTypeId, item?.categoryId];
};

const hasValue = (value) =>
  (typeof value === "string" || typeof value === "number") && String(value).trim() !== "";

/**
 * Nhãn loại hàng của một dòng hàng. KHÔNG BAO GIỜ trả GUID.
 *
 * (a) tên backend gửi sẵn: `productTypeName` / `categoryName` / `productCategoryName`
 *     (bỏ qua nếu chính nó là GUID);
 * (b) giá trị thô `productType` / `productTypeId` / `categoryId`: chuỗi không phải GUID →
 *     tên cũ, trả nguyên; GUID → tra `nameById` (Map khoá chữ thường) ra tên;
 * (c) còn lại "Chưa phân loại".
 *
 * `item` có thể là chuỗi (coi như `productType`). `options.emptyLabel` thay nhãn khi dòng
 * hàng KHÔNG có thông tin loại hàng nào (mặc định cũng "Chưa phân loại"); GUID không tra
 * được luôn ra "Chưa phân loại".
 */
export const resolveProductTypeLabel = (item, nameById, options = {}) => {
  const { emptyLabel = UNCLASSIFIED_PRODUCT_TYPE_LABEL } = options;
  const source =
    typeof item === "string" || typeof item === "number" ? { productType: item } : item || {};

  const productTypeObject =
    source.productType && typeof source.productType === "object" ? source.productType : null;

  const directName = firstName(
    source.productTypeName,
    source.categoryName,
    source.productCategoryName,
    productTypeObject?.productTypeName,
    productTypeObject?.name,
    productTypeObject?.label,
  );
  if (directName) return directName;

  const rawValues = getRawProductTypeValues(source).filter(hasValue);

  for (const raw of rawValues) {
    const text = String(raw).trim();
    if (!isGuidLike(text)) {
      /* Mã/khoá có trong danh mục thì lấy tên danh mục, còn lại là tên cũ. */
      return lookupName(nameById, text) || text;
    }

    const name = lookupName(nameById, text);
    if (name) return name;
  }

  return rawValues.length > 0 ? UNCLASSIFIED_PRODUCT_TYPE_LABEL : emptyLabel;
};

/**
 * Có dòng hàng nào CHỈ có GUID loại hàng (không tên) không — tức là cần nạp danh mục.
 * Màn dùng để khỏi gọi GET /api/product-types khi dữ liệu đã đủ tên.
 */
export const needsProductTypeCatalog = (items) =>
  (Array.isArray(items) ? items : []).some((item) => {
    if (!item || typeof item !== "object") return isGuidLike(item);
    const resolvedWithoutCatalog = resolveProductTypeLabel(item, null, { emptyLabel: "" });
    return (
      resolvedWithoutCatalog === UNCLASSIFIED_PRODUCT_TYPE_LABEL &&
      getRawProductTypeValues(item).some(isGuidLike)
    );
  });

/* =========================================================
   CẤU HÌNH THÙNG (packageConfiguration)
   ========================================================= */

/** Tên + cỡ tiếng Việt theo mã cấu hình thùng. Các bảng PACKAGE_CONFIGURATION_LABELS
    của màn ký gửi re-export đúng bảng này. */
export const PACKAGE_CONFIGURATION_LABELS = Object.freeze({
  SMALL: Object.freeze({ name: "Thùng cỡ nhỏ", size: "CỠ NHỎ" }),
  MEDIUM: Object.freeze({ name: "Thùng cỡ vừa", size: "CỠ VỪA" }),
  LARGE: Object.freeze({ name: "Thùng cỡ lớn", size: "CỠ LỚN" }),
  CUSTOM: Object.freeze({ name: "Thùng tùy chỉnh", size: "TÙY CHỈNH" }),
});

const normalizeConfigCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

/** Dịch tên thùng tiếng Anh trong DB ("Medium Box", "Wood crate"…) sang tiếng Việt. */
export const translatePackageConfigurationText = (value) =>
  String(value ?? "")
    .replace(/large\s*box/gi, "Thùng cỡ lớn")
    .replace(/medium\s*box/gi, "Thùng cỡ vừa")
    .replace(/small\s*box/gi, "Thùng cỡ nhỏ")
    .replace(/custom\s*box/gi, "Thùng tùy chỉnh")
    .replace(/wood(en)?\s*crate/gi, "Đóng thùng gỗ")
    .replace(/packing\s*fee/gi, "Phí đóng gói")
    .trim();

/**
 * Tên thùng cho khách:
 * mã SMALL/MEDIUM/LARGE/CUSTOM → tên tiếng Việt cố định; không thì `displayName` (backend);
 * không thì `configName` / `name` (tên tiếng Anh dịch sang tiếng Việt); không thì mã.
 * `options.fallback` (nếu truyền) thay cho mã thô ở bước cuối.
 */
export const formatPackageConfigurationName = (config, options = {}) => {
  const { fallback } = options;
  const configuration = config && typeof config === "object" ? config : {};
  const code = normalizeConfigCode(configuration.configCode ?? configuration.code);

  const known = PACKAGE_CONFIGURATION_LABELS[code]?.name;
  if (known) return known;

  const named = firstName(
    translatePackageConfigurationText(configuration.displayName),
    translatePackageConfigurationText(configuration.configName),
    translatePackageConfigurationText(configuration.name),
  );
  if (named) return named;

  if (fallback !== undefined) return fallback;

  return textWithoutGuid(configuration.configCode ?? configuration.code);
};
