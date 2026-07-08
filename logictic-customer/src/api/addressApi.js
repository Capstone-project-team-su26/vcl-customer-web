// src/api/addressApi.js

const DEFAULT_ADDRESS_API_URL = "https://provinces.open-api.vn/api/v1";

const ADDRESS_API_BASE_URL = (
  import.meta.env.VITE_API_ADDRESS_URL?.trim() ||
  DEFAULT_ADDRESS_API_URL
).replace(/\/+$/, "");

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_RETRY = 2;
const RETRY_DELAYS = [700, 1500];

const cache = new Map();

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const createCanceledError = (
  message = "Request lấy địa chỉ đã bị hủy."
) => {
  const error = new Error(message);
  error.name = "AbortError";
  error.code = "ERR_CANCELED";
  return error;
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
};

const getSafePath = (path) => {
  const value = String(path || "").trim();

  if (!value) {
    return "/";
  }

  return value.startsWith("/") ? value : `/${value}`;
};

const requestJsonOnce = async (url, options = {}) => {
  const {
    timeout = DEFAULT_TIMEOUT,
    signal,
  } = options;

  if (signal?.aborted) {
    throw createCanceledError();
  }

  const controller = new AbortController();
  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeout);

  const abortByExternalSignal = () => {
    controller.abort();
  };

  if (signal) {
    signal.addEventListener(
      "abort",
      abortByExternalSignal,
      { once: true }
    );
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Address API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (signal?.aborted) {
      throw createCanceledError();
    }

    if (error?.name === "AbortError") {
      if (didTimeout) {
        const timeoutError = new Error(
          "API địa chỉ phản hồi quá chậm. Vui lòng thử lại sau vài giây."
        );

        timeoutError.name = "AddressTimeoutError";
        timeoutError.code = "ADDRESS_TIMEOUT";

        throw timeoutError;
      }

      throw createCanceledError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);

    if (signal) {
      signal.removeEventListener(
        "abort",
        abortByExternalSignal
      );
    }
  }
};

const requestJson = async (path, params = {}, options = {}) => {
  const {
    useCache = true,
    retry = DEFAULT_RETRY,
    ...requestOptions
  } = options;

  const safePath = getSafePath(path);
  const queryString = buildQueryString(params);
  const url = `${ADDRESS_API_BASE_URL}${safePath}${queryString}`;
  const cacheKey = url;

  if (useCache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let lastError = null;

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    try {
      const data = await requestJsonOnce(url, requestOptions);

      if (useCache) {
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      lastError = error;

      const isCanceled =
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError" ||
        requestOptions.signal?.aborted;

      if (isCanceled) {
        throw error;
      }

      const canRetry = attempt < retry;

      if (canRetry) {
        await sleep(RETRY_DELAYS[attempt] || 1000);
        continue;
      }

      if (
        error?.code === "ADDRESS_TIMEOUT" ||
        error?.name === "AddressTimeoutError"
      ) {
        throw new Error(
          "Không tải được địa chỉ do API địa chỉ phản hồi chậm. Vui lòng bấm lại hoặc thử sau vài giây."
        );
      }

      throw error;
    }
  }

  throw lastError;
};

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
  const data = await requestJson(
    "/p/",
    {},
    options
  );

  return normalizeAddressOptions(data);
};

export const getProvinceByCode = async (
  provinceCode,
  options = {}
) => {
  if (!provinceCode) return null;

  const { depth = 1, ...requestOptions } = options;

  return requestJson(
    `/p/${provinceCode}`,
    { depth },
    requestOptions
  );
};

export const searchProvinces = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  const data = await requestJson(
    "/p/search/",
    {
      q: searchText,
    },
    options
  );

  return normalizeAddressOptions(data);
};

/* =========================================================
   DISTRICTS — QUẬN / HUYỆN
   ========================================================= */

export const getDistrictsByProvinceCode = async (
  provinceCode,
  options = {}
) => {
  if (!provinceCode) return [];

  const province = await requestJson(
    `/p/${provinceCode}`,
    {
      depth: 2,
    },
    options
  );

  return normalizeAddressOptions(province?.districts || []);
};

export const getDistrictByCode = async (
  districtCode,
  options = {}
) => {
  if (!districtCode) return null;

  const { depth = 1, ...requestOptions } = options;

  return requestJson(
    `/d/${districtCode}`,
    { depth },
    requestOptions
  );
};

export const searchDistricts = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  const data = await requestJson(
    "/d/search/",
    {
      q: searchText,
    },
    options
  );

  return normalizeAddressOptions(data);
};

/* =========================================================
   WARDS — PHƯỜNG / XÃ
   ========================================================= */

export const getWardsByDistrictCode = async (
  districtCode,
  options = {}
) => {
  if (!districtCode) return [];

  const district = await requestJson(
    `/d/${districtCode}`,
    {
      depth: 2,
    },
    options
  );

  return normalizeAddressOptions(district?.wards || []);
};

export const getWardByCode = async (
  wardCode,
  options = {}
) => {
  if (!wardCode) return null;

  return requestJson(
    `/w/${wardCode}`,
    {},
    options
  );
};

export const searchWards = async (
  keyword,
  options = {}
) => {
  const searchText = keyword?.trim();

  if (!searchText) return [];

  const data = await requestJson(
    "/w/search/",
    {
      q: searchText,
    },
    options
  );

  return normalizeAddressOptions(data);
};

/* =========================================================
   FULL ADDRESS HELPER
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