/* =========================================================
   HELPERS
   =========================================================

   Các hàm thuần (chỉ phụ thuộc tham số + hằng số module) được
   tách khỏi ConsignmentListCheck.jsx để file trang chỉ còn
   phần state và render.
   ========================================================= */

import axios from "@shared/api/requestCancel";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "@shared/utils/timeUtc";

import { normalizeOrderStatus } from "@features/consignment/constants/orderStatus";

import { QUOTATION_SENT_STATUS_KEYWORDS } from "./ConsignmentListCheck.constants";

export const isCanceledRequest = (error) =>
  axios.isCancel(error) ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

export const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

export const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

export const formatStatusCode = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

/**
 * Đơn đang ở trạng thái "đã gửi báo giá"? So theo mã đích sau khi chuẩn hóa.
 */
export const isQuotationSentStatus = (status) =>
  QUOTATION_SENT_STATUS_KEYWORDS.includes(
    normalizeOrderStatus(status)
  );

export const findArrayFromResult = (
  result,
  extraKeys = []
) => {
  const candidates = [
    result,
    result?.data,
    result?.items,
    result?.results,
    result?.data?.items,
    result?.data?.results,
    ...extraKeys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
    ]),
  ];

  return (
    candidates.find(Array.isArray) || []
  );
};

export const normalizeStatusOptions = (
  result
) =>
  findArrayFromResult(result, [
    "statuses",
    "consignmentStatuses",
  ])
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value =
          normalizeStatus(item);

        return {
          value,
          label:
            formatStatusCode(value),
        };
      }

      const value = normalizeStatus(
        item?.value ??
          item?.code ??
          item?.status ??
          item?.statusCode ??
          item?.id ??
          ""
      );

      const label = String(
        item?.label ??
          item?.name ??
          item?.displayName ??
          item?.statusName ??
          item?.description ??
          formatStatusCode(value)
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter(
      (option) =>
        option.value &&
        option.label
    );


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
 * Lấy YYYY-MM-DD theo UTC để lọc ngày không bị lệch múi giờ.
 */
export const getUtcDateOnly = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return null;
  }

  return utcIso.slice(0, 10);
};

/**
 * Gắn field UTC vào item API.
 */
export const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(item.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(item.updatedAt),
    quotationCreatedAtUtc: normalizeApiTimeToUtc(
      item.quotationCreatedAt ||
        item?.quotation?.createdAt
    ),
    quotationExpiredAtUtc: normalizeApiTimeToUtc(
      item.quotationExpiredAt ||
        item?.quotation?.expiredAt
    ),
  };
};

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

export const extractConsignmentItems = (apiResult) => {
  const candidates = [
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

  return candidates.find(Array.isArray) || [];
};

export const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
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

export const getTrackingCode = (item) => {
  const code =
    item?.consignmentCode ||
    item?.trackingCode ||
    item?.waybillCode ||
    item?.shipmentCode ||
    item?.domesticTrackingCode;

  return (
    String(code || "").trim() ||
    "Chưa được cấp mã"
  );
};

export const getOrderCode = (item) => {
  const code =
    item?.orderCode ||
    item?.orderId;

  return (
    String(code || "").trim() ||
    "-"
  );
};


/**
 * Chuẩn hóa tên sản phẩm từ nhiều dạng dữ liệu API:
 * - Chuỗi: "Sản phẩm 1 và Sản phẩm 2"
 * - Chuỗi có dấu phẩy, dấu chấm phẩy, dấu | hoặc xuống dòng
 * - Mảng chuỗi / mảng object
 * - Chuỗi JSON
 */
export const extractProductNames = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(
      extractProductNames
    );
  }

  if (
    typeof value === "object"
  ) {
    const nestedCandidates = [
      value.productName,
      value.itemName,
      value.name,
      value.title,
      value.product?.productName,
      value.product?.name,
      value.items,
      value.products,
      value.productNames,
      value.itemNames,
    ];

    return nestedCandidates.flatMap(
      extractProductNames
    );
  }

  const text = String(value).trim();

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
      return extractProductNames(
        JSON.parse(text)
      );
    } catch {
      // Không phải JSON hợp lệ, xử lý như chuỗi thông thường.
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
  const candidates = [
    item?.items,
    item?.products,
    item?.productNames,
    item?.itemNames,
    item?.productName,
    item?.itemName,
  ];

  const names = candidates.flatMap(
    extractProductNames
  );

  const uniqueNames = [];
  const seenNames = new Set();

  names.forEach((name) => {
    const normalizedName =
      normalizeText(name);

    if (
      !normalizedName ||
      seenNames.has(normalizedName)
    ) {
      return;
    }

    seenNames.add(normalizedName);
    uniqueNames.push(name);
  });

  return uniqueNames;
};
