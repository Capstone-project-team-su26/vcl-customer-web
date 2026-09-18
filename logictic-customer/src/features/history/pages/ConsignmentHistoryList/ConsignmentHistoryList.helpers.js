/*
 * Các hàm thuần (chỉ phụ thuộc tham số và hằng số module) được tách khỏi
 * component để phần render chỉ còn lo hiển thị, đồng thời có thể kiểm thử
 * riêng phần chuẩn hóa dữ liệu API vốn hay thay đổi theo backend.
 */

import {
  apiToUtcIso,
  formatVietnamDateTime,
  formatUtcDateTime,
} from "@shared/utils/timeUtc";

import { getOrderStatusLabel } from "@features/consignment";

import { DEFAULT_PAGE_SIZE } from "./ConsignmentHistoryList.constants";

export const normalizeText = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Chuẩn hóa tên sản phẩm từ nhiều kiểu dữ liệu API:
 * - "Sản phẩm 1\nSản phẩm 2"
 * - ["Sản phẩm 1", "Sản phẩm 2"]
 * - [{ productName: "Sản phẩm 1" }]
 * Giữ nguyên tên sản phẩm đầy đủ (không tự ý tách theo dấu phẩy)
 */
export const collectProductNames = (source) => {
  if (
    source === null ||
    source === undefined ||
    source === ""
  ) {
    return [];
  }

  if (Array.isArray(source)) {
    return source.flatMap(
      collectProductNames
    );
  }

  if (typeof source === "object") {
    const directName =
      source.productName ||
      source.itemName ||
      source.name ||
      source.title ||
      source.product?.productName ||
      source.product?.name;

    if (directName) {
      return collectProductNames(
        directName
      );
    }

    return collectProductNames(
      source.items ||
        source.productNames ||
        source.itemNames ||
        []
    );
  }

  const text = String(source).trim();

  if (!text) {
    return [];
  }

  if (
    (text.startsWith("[") &&
      text.endsWith("]")) ||
    (text.startsWith("{") &&
      text.endsWith("}"))
  ) {
    try {
      return collectProductNames(
        JSON.parse(text)
      );
    } catch {
      // Không phải JSON hợp lệ thì tiếp tục xử lý chuỗi thường.
    }
  }

  if (text.includes("\n")) {
    return text
      .split(/\r?\n+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [text];
};

export const getProductNames = (item) => {
  const rawNames =
    item?.itemNames ??
    item?.productNames ??
    item?.items ??
    [];

  return Array.from(
    new Set(
      collectProductNames(rawNames)
        .map((name) =>
          String(name).trim()
        )
        .filter(Boolean)
    )
  );
};

export const extractConsignmentPage = (apiResult, currentPageSize = 10) => {
  const candidates = [
    apiResult?.data?.data,
    apiResult?.data,
    apiResult,
  ];

  const pageData =
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate) &&
        (
          Array.isArray(candidate.items) ||
          Array.isArray(candidate.results)
        )
    ) || null;

  if (pageData) {
    const items = Array.isArray(
      pageData.items
    )
      ? pageData.items
      : Array.isArray(pageData.results)
        ? pageData.results
        : [];

    const totalCount =
      Number(pageData.totalCount) ||
      Number(pageData.total) ||
      items.length;

    const size =
      Number(pageData.pageSize) ||
      currentPageSize ||
      DEFAULT_PAGE_SIZE;

    const totalPages = Math.max(
      1,
      Number(pageData.totalPages) ||
        Math.ceil(totalCount / (size || 1))
    );

    return {
      items,
      totalCount,
      pageNumber:
        Number(pageData.pageNumber) ||
        1,
      pageSize: size,
      totalPages,
    };
  }

  const arrayCandidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.results,
    apiResult?.data?.items,
    apiResult?.data?.results,
    apiResult?.data?.data,
    apiResult?.data?.data?.items,
    apiResult?.data?.data?.results,
  ];

  const items =
    arrayCandidates.find(
      Array.isArray
    ) || [];

  const size = currentPageSize || DEFAULT_PAGE_SIZE;
  const totalCount = items.length;

  return {
    items,
    totalCount,
    pageNumber: 1,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(totalCount / (size || 1))),
  };
};

export const copyTextToClipboard = async (text) => {
  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");

  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Không thể sao chép mã vận đơn.");
  }
};

export const normalizeStatusKey = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

/* Lớp bọc giữ tên cũ: nhãn đơn ký gửi lấy từ module trạng thái dùng chung. */
export const getVietnameseStatusLabel = (status) =>
  getOrderStatusLabel(normalizeStatusKey(status));

export const formatStatusCode = (status) =>
  getVietnameseStatusLabel(status);

export const normalizeStatusOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.results,
    apiResult?.statuses,
    apiResult?.data?.items,
    apiResult?.data?.results,
    apiResult?.data?.statuses,
  ];

  const rawStatuses =
    candidates.find(Array.isArray) || [];

  const optionMap = new Map();

  rawStatuses.forEach((item) => {
    const value =
      typeof item === "string" ||
      typeof item === "number"
        ? String(item).trim()
        : String(
            item?.value ||
              item?.code ||
              item?.status ||
              item?.statusCode ||
              item?.id ||
              ""
          ).trim();

    const normalizedKey =
      normalizeStatusKey(value);

    if (!value || !normalizedKey) {
      return;
    }

    optionMap.set(normalizedKey, {
      value,
      label:
        getVietnameseStatusLabel(value),
    });
  });

  return Array.from(optionMap.values());
};

export const getItemStatus = (item) => {
  return String(
    item?.status ??
    item?.orderStatus ??
    item?.consignmentStatus ??
    item?.order?.status ??
    ""
  ).trim();
};

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-06-29T14:00:32.8526551
 * - 2026-06-29T14:00:32Z
 * - 2026-06-29T14:00:32+07:00
 *
 * Output luôn chuẩn:
 * - 2026-06-29T14:00:32.852Z
 */
export const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

/**
 * Lấy YYYY-MM-DD theo UTC để lọc ngày không lệch múi giờ.
 */
export const getUtcDateOnly = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};

/**
 * Gắn field UTC vào từng item lấy từ API.
 */
export const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  const createdAtUtc = normalizeApiTimeToUtc(item.createdAt);
  const updatedAtUtc = normalizeApiTimeToUtc(item.updatedAt);

  const resolvedStatus =
    getItemStatus(item);

  return {
    ...item,
    status: resolvedStatus,
    orderStatus:
      item.orderStatus ??
      resolvedStatus,
    createdAtUtc,
    updatedAtUtc,
  };
};

/**
 * Hiển thị thời gian cho user Việt Nam.
 */
export const formatDate = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

/**
 * Tooltip / title nếu cần xem UTC gốc.
 */
export const formatDateUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};
