/* =========================================================
   addressApi (MOCK — bản build UI-only)

   Bản gốc gọi thẳng provinces.open-api.vn bằng fetch (có timeout, retry,
   cache theo URL). Tầng HTTP đó đã được gỡ; file này trả dữ liệu mẫu ngay
   tại chỗ để 3 màn hình chọn địa chỉ vẫn chạy đủ chuỗi
   tỉnh -> quận/huyện -> phường/xã.

   CẮM API THẬT TRỞ LẠI:
   - Bỏ import từ @/mocks, dựng lại requestJson(path, params, options) gọi
     `${VITE_API_ADDRESS_URL}` (mặc định https://provinces.open-api.vn/api/v1).
   - Map lại đúng endpoint: "/p/", "/p/{code}?depth=", "/d/{code}?depth=",
     "/w/{code}", "/p/search/", "/d/search/", "/w/search/".
   - normalizeAddressOption / normalizeAddressOptions giữ nguyên, dùng lại được.

   GIỮ NGUYÊN HỢP ĐỒNG (component không được sửa một dòng nào):
   - getProvinces / getDistrictsByProvinceCode / getWardsByDistrictCode và 3 hàm
     search* trả về MẢNG ĐÃ NORMALIZE ({ value, label, code, name, ... }) —
     SelectField và thẻ <option> đọc option.value + option.label.
   - getProvinceByCode / getDistrictByCode / getWardByCode trả về OBJECT THÔ của
     API (name, code, division_type, districts/wards...) vì getFullAddressByCodes
     đọc province.name / district.name / ward.name.
   - getFullAddressByCodes trả object gộp, ConsignmentOrder và ConsignmentBuyOrder
     đọc result?.province?.name, result?.district?.name, result?.ward?.name và
     result?.fullAddress.
   - Mọi hàm nhận options có { signal } và phải ném lỗi huỷ đúng chữ ký
     (CanceledError / ERR_CANCELED) để isCanceledRequest nuốt lỗi, không bắn toast.
   ========================================================= */

import { deepClone, delay } from "@/mocks/mockUtils";
import { provinces as provinceTree } from "@/mocks/data/addresses";

/*
 * Dropdown địa chỉ nằm ngay trong form nhập liệu, nên để trễ ngắn hơn mặc định:
 * đủ để spinner "Đang tải dữ liệu..." của SelectField nhấp một nhịp,
 * nhưng không làm người dùng thấy khựng khi đổi tỉnh liên tục.
 */
const ADDRESS_DELAY_MS = 160;

/*
 * Cache giữ đúng vai trò của bản gốc: tránh dựng lại danh sách nhiều lần trong
 * một phiên. clearAddressCache() vẫn xoá sạch được như trước.
 */
const cache = new Map();

const readCache = (key, factory) => {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const value = factory();

  cache.set(key, value);

  return value;
};

/* =========================================================
   TRUY VẤN TRÊN FIXTURE
   ========================================================= */

const sameCode = (a, b) => String(a) === String(b);

/*
 * API thật ở endpoint danh sách KHÔNG trả kèm cấp con, nên phải cắt
 * districts/wards trước khi normalize.
 *
 * Viết thành hàm thay vì destructuring bỏ biến ({ districts, ...rest }) vì
 * biến bỏ đi đó bị eslint no-unused-vars báo lỗi trong cấu hình của dự án.
 */
const omitChild = (item, childKey) => {
  const copy = { ...item };

  delete copy[childKey];

  return copy;
};

/* Chỉ nhận 1 tham số để dùng thẳng trong .map() (index không lọt vào childKey). */
const stripDistricts = (province) => omitChild(province, "districts");

const stripWards = (district) => omitChild(district, "wards");

const findProvince = (provinceCode) =>
  provinceTree.find((province) =>
    sameCode(province.code, provinceCode)
  ) || null;

const findDistrict = (districtCode) => {
  for (const province of provinceTree) {
    const district = province.districts.find((item) =>
      sameCode(item.code, districtCode)
    );

    if (district) {
      return district;
    }
  }

  return null;
};

const findWard = (wardCode) => {
  for (const province of provinceTree) {
    for (const district of province.districts) {
      const ward = district.wards.find((item) =>
        sameCode(item.code, wardCode)
      );

      if (ward) {
        return ward;
      }
    }
  }

  return null;
};

/*
 * API thật cắt bớt dữ liệu lồng theo tham số depth:
 * depth 1 = chỉ bản thân đơn vị, 2 = kèm cấp con, 3 = kèm cả hai cấp con.
 * Giữ đúng hành vi này để getDistrictsByProvinceCode (depth 2) vẫn có districts
 * còn getProvinceByCode() mặc định (depth 1) trả object gọn như trước.
 */
const shapeProvinceByDepth = (province, depth) => {
  if (!province) return null;

  const { districts, ...rest } = province;

  const level = Number(depth) || 1;

  if (level <= 1) {
    return deepClone(rest);
  }

  return deepClone({
    ...rest,
    districts: districts.map((district) => {
      const { wards, ...districtRest } = district;

      return level >= 3
        ? { ...districtRest, wards }
        : districtRest;
    }),
  });
};

const shapeDistrictByDepth = (district, depth) => {
  if (!district) return null;

  const { wards, ...rest } = district;

  const level = Number(depth) || 1;

  if (level <= 1) {
    return deepClone(rest);
  }

  return deepClone({ ...rest, wards });
};

/*
 * Bỏ dấu + lowercase để search khớp cả khi người dùng gõ không dấu.
 *
 * Cờ "i" ở /đ/gi là bắt buộc: chữ Đ hoa KHÔNG tách dấu được bằng NFD, mà bước
 * này chạy trước .toLowerCase(), nên nếu chỉ bắt "đ" thường thì "Quận Ba Đình"
 * ra "quan ba đinh" và người dùng gõ "ba dinh" không khớp gì cả — search trả
 * mảng rỗng mà không có lỗi nào để lần ra.
 */
const normalizeKeyword = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();

const matchesName = (name, keyword) =>
  normalizeKeyword(name).includes(keyword);

/* =========================================================
   NORMALIZE — GIỮ NGUYÊN BẢN GỐC

   Đây là phần component gián tiếp phụ thuộc nhiều nhất:
   value/label nuôi thẻ <option>, code/name nuôi getAddressOptionName.
   ========================================================= */

export const normalizeAddressOption = (item) => {
  if (!item) return null;

  const code = item.code ?? item.id ?? item.value;
  const name = item.name ?? item.label ?? item.full_name ?? "";

  if (code === undefined || code === null || !String(name).trim()) {
    return null;
  }

  return {
    value: String(code),
    code,
    label: String(name).trim(),
    name: String(name).trim(),
    codename: item.codename,
    divisionType: item.division_type,
    phoneCode: item.phone_code,
    provinceCode: item.province_code,
    districtCode: item.district_code,
    raw: item,
  };
};

export const normalizeAddressOptions = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map(normalizeAddressOption)
    .filter(Boolean);
};

/* =========================================================
   PROVINCES — TỈNH / THÀNH PHỐ
   ========================================================= */

export const getProvinces = async (options = {}) => {
  await delay(ADDRESS_DELAY_MS, options);

  /*
   * Bản gốc gọi "/p/" (không depth) nên tỉnh trả về KHÔNG kèm districts;
   * bỏ districts ở đây cho option.raw nhẹ và giống hệt dữ liệu thật.
   */
  const rows = readCache("provinces", () =>
    provinceTree.map(stripDistricts)
  );

  return normalizeAddressOptions(deepClone(rows));
};

export const getProvinceByCode = async (
  provinceCode,
  options = {}
) => {
  if (!provinceCode) return null;

  const { depth = 1, ...requestOptions } = options;

  await delay(ADDRESS_DELAY_MS, requestOptions);

  return shapeProvinceByDepth(
    findProvince(provinceCode),
    depth
  );
};

export const searchProvinces = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  await delay(ADDRESS_DELAY_MS, options);

  const normalized = normalizeKeyword(searchText);

  const rows = provinceTree
    .filter((province) => matchesName(province.name, normalized))
    .map(stripDistricts);

  return normalizeAddressOptions(deepClone(rows));
};

/* =========================================================
   DISTRICTS — QUẬN / HUYỆN
   ========================================================= */

export const getDistrictsByProvinceCode = async (
  provinceCode,
  options = {}
) => {
  if (!provinceCode) return [];

  await delay(ADDRESS_DELAY_MS, options);

  const rows = readCache(`districts:${provinceCode}`, () => {
    const province = findProvince(provinceCode);

    /* Mã lạ -> mảng rỗng, y như API thật trả province null. */
    return (province?.districts || []).map(stripWards);
  });

  return normalizeAddressOptions(deepClone(rows));
};

export const getDistrictByCode = async (
  districtCode,
  options = {}
) => {
  if (!districtCode) return null;

  const { depth = 1, ...requestOptions } = options;

  await delay(ADDRESS_DELAY_MS, requestOptions);

  return shapeDistrictByDepth(
    findDistrict(districtCode),
    depth
  );
};

export const searchDistricts = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  await delay(ADDRESS_DELAY_MS, options);

  const normalized = normalizeKeyword(searchText);

  const rows = provinceTree
    .flatMap((province) => province.districts)
    .filter((district) => matchesName(district.name, normalized))
    .map(stripWards);

  return normalizeAddressOptions(deepClone(rows));
};

/* =========================================================
   WARDS — PHƯỜNG / XÃ
   ========================================================= */

export const getWardsByDistrictCode = async (
  districtCode,
  options = {}
) => {
  if (!districtCode) return [];

  await delay(ADDRESS_DELAY_MS, options);

  const rows = readCache(`wards:${districtCode}`, () => {
    const district = findDistrict(districtCode);

    return district?.wards || [];
  });

  return normalizeAddressOptions(deepClone(rows));
};

export const getWardByCode = async (
  wardCode,
  options = {}
) => {
  if (!wardCode) return null;

  await delay(ADDRESS_DELAY_MS, options);

  const ward = findWard(wardCode);

  return ward ? deepClone(ward) : null;
};

export const searchWards = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  await delay(ADDRESS_DELAY_MS, options);

  const normalized = normalizeKeyword(searchText);

  const rows = provinceTree
    .flatMap((province) => province.districts)
    .flatMap((district) => district.wards)
    .filter((ward) => matchesName(ward.name, normalized));

  return normalizeAddressOptions(deepClone(rows));
};

/* =========================================================
   FULL ADDRESS HELPER

   ConsignmentOrder / ConsignmentBuyOrder gọi hàm này lúc bấm "Lưu địa chỉ",
   rồi đọc province?.name, district?.name, ward?.name và fullAddress.
   Thiếu một trong các field đó là địa chỉ lưu ra bị cụt.
   ========================================================= */

export const getFullAddressByCodes = async ({
  provinceCode,
  districtCode,
  wardCode,
  detailAddress = "",
}) => {
  const [province, district, ward] = await Promise.all([
    provinceCode
      ? getProvinceByCode(provinceCode)
      : Promise.resolve(null),

    districtCode
      ? getDistrictByCode(districtCode)
      : Promise.resolve(null),

    wardCode
      ? getWardByCode(wardCode)
      : Promise.resolve(null),
  ]);

  const cleanDetailAddress = detailAddress?.trim() || "";

  const parts = [
    cleanDetailAddress,
    ward?.name,
    district?.name,
    province?.name,
  ].filter(Boolean);

  return {
    province,
    district,
    ward,

    provinceCode: province?.code ?? provinceCode ?? "",
    provinceName: province?.name ?? "",

    districtCode: district?.code ?? districtCode ?? "",
    districtName: district?.name ?? "",

    wardCode: ward?.code ?? wardCode ?? "",
    wardName: ward?.name ?? "",

    detailAddress: cleanDetailAddress,
    fullAddress: parts.join(", "),
  };
};

export const clearAddressCache = () => {
  cache.clear();
};

const addressApi = {
  getProvinces,
  getProvinceByCode,
  searchProvinces,

  getDistrictsByProvinceCode,
  getDistrictByCode,
  searchDistricts,

  getWardsByDistrictCode,
  getWardByCode,
  searchWards,

  getFullAddressByCodes,
  clearAddressCache,
};

export default addressApi;
