import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Descriptions, Image, Tag } from "antd";

import {
  Button,
  CircularProgress,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AuthNotify from "../../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
  getSyncedNowDate,
} from "../../../../../utils/timeUtc";

import { getConsignmentStatusesApi } from "../../../../../api/OrderApi/consignmentStatusApi";
import {
  getConsignmentDetailApi,
  getOrderQuotationApi,
  getProductTypesApi,
} from "../../../../../api/OrderApi/consignmentApi";

import pricingRuleService from "../../../../../api/ServiceApi/pricingRuleService";
import {
  acceptQuotationApi,
  rejectQuotationApi,
  confirmAndPayQuotationApi,
  getPaymentCheckoutUrl,
} from "../../../../../api/PurchaseAPI/purchaseRequestApi";

import QuotationCancelDialog from "../../../../../components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/CancelPayments/QuotationCancelDialog";
import QuotationPaymentConfirmDialog, {
  PAYMENT_METHODS,
} from "../../../../../components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/ConfirmPayments/QuotationPaymentConfirmDialog";

import "./QuotationDetail.css";

/* =========================================================
   LABELS
   ========================================================= */

const QUOTATION_STATUS_FALLBACK_LABELS = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ xác nhận",
  APPROVED: "Đã duyệt",
  ACCEPTED: "Đã chấp nhận",
  PAID: "Đã thanh toán",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
};

const QUOTE_TYPE_LABELS = {
  ESTIMATE: "Báo giá tạm tính",
  OFFICIAL: "Báo giá chính thức",
  FINAL: "Báo giá chính thức",
};

const CONSIGNMENT_TYPE_LABELS = {
  EXPRESS: "Hỏa tốc",
  "HỎA TỐC": "Hỏa tốc",
  "HOA TOC": "Hỏa tốc",
  STANDARD: "Tiêu chuẩn",
  "TIÊU CHUẨN": "Tiêu chuẩn",
  "TIEU CHUAN": "Tiêu chuẩn",
};

const FEE_CODE_LABELS = {
  MAIN_SERVICE: "Cước vận chuyển quốc tế",

  DOMESTIC_SHIPPING_FEE: "Phí vận chuyển nội địa",

  WOOD_CRATE: "Dịch vụ đóng thùng gỗ",

  PACKING_FEE: "Giá cấu hình thùng",

  SUR_INSPECTION: "Phụ phí kiểm hàng",

  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm",

  SERVICE_FEE: "Phí dịch vụ",

  TAX_DUTY: "Thuế / phí nhập khẩu",

  VAT: "Thuế giá trị gia tăng",

  IMPORT_TAX: "Thuế nhập khẩu",
};

const FEE_TYPE_LABELS = {
  MAIN_SERVICE: "Dịch vụ chính",

  DOMESTIC_SHIPPING_FEE: "Vận chuyển nội địa",

  SURCHARGE: "Phụ phí",

  PACKING_FEE: "Phí đóng gói",

  SERVICE_FEE: "Phí dịch vụ",

  TAX_DUTY: "Thuế / phí nhập khẩu",
};

const CALCULATION_TYPE_LABELS = {
  PER_KG: "Theo kg",
  FIXED: "Cố định",
  PERCENTAGE: "Phần trăm",
};

/*
 * Các khoản phí đã có field riêng trong báo giá.
 * Không cộng lại lần hai từ additionalFees.
 */
const BASE_COST_FEE_CODES = new Set([
  "MAIN_SERVICE",
  "SERVICE_FEE",
  "TAX_DUTY",
]);

/* =========================================================
   COMMON HELPERS
   ========================================================= */

const normalizeStatus = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus.replaceAll("_", " ").replaceAll("-", " ");
};

const normalizeStatusOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.statuses,
    apiResult?.quotationStatuses,
    apiResult?.data?.items,
    apiResult?.data?.statuses,
    apiResult?.data?.quotationStatuses,
    apiResult?.data?.data,
    apiResult?.data?.data?.items,
    apiResult?.data?.data?.statuses,
  ];

  const rawStatuses = candidates.find(Array.isArray) || [];

  return rawStatuses
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = normalizeStatus(item);

        return {
          value,
          label: formatStatusCode(value),
        };
      }

      const value = normalizeStatus(
        item?.value ||
          item?.code ||
          item?.status ||
          item?.statusCode ||
          item?.id,
      );

      const label = String(
        item?.label ||
          item?.name ||
          item?.displayName ||
          item?.statusName ||
          item?.description ||
          formatStatusCode(value),
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter((option) => option.value && option.label);
};

const getQuoteTypeLabel = (quoteType) => {
  const normalizedType = normalizeStatus(quoteType);

  return QUOTE_TYPE_LABELS[normalizedType] || normalizedType || "-";
};

const getConsignmentTypeLabel = (consignmentType) => {
  const rawValue = String(consignmentType ?? "").trim();
  const normalizedType = normalizeStatus(rawValue);

  return CONSIGNMENT_TYPE_LABELS[normalizedType] || rawValue || "-";
};

const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

const getBooleanLabel = (value) => {
  return value ? "Có" : "Không";
};


const SALES_NOTE_SERVICE_LABELS = {
  WOOD_CRATE:
    "Đóng thùng gỗ",

  SUR_INSURANCE_3PERCENT:
    "Bảo hiểm hàng hóa 3%",

  SUR_INSPECTION:
    "Kiểm hàng",

  PACKING_FEE:
    "Phí đóng gói",
};

const translateSalesNoteService = (
  value
) => {
  const rawValue =
    String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const normalizedCode =
    normalizeStatus(rawValue);

  return (
    SALES_NOTE_SERVICE_LABELS[
      normalizedCode
    ] ||
    translateFeeLabelToVietnamese(
      rawValue
    ) ||
    rawValue
  );
};

const parseSalesNote = (value) => {
  const text =
    normalizeOptionalText(value);

  if (!text) {
    return {
      summary: "",
      requirements: [],
    };
  }

  const requirements = [];
  const summaryParts = [];

  text
    .split(/(?:\.\s*|\n+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const packingMatch =
        part.match(
          /^Yêu cầu đóng gói\s*:\s*(.+)$/i
        );

      if (packingMatch) {
        requirements.push({
          key: "packing",
          label:
            "Yêu cầu đóng gói",
          value:
            packingMatch[1]
              .split(/[,;|]+/)
              .map(
                translateSalesNoteService
              )
              .filter(Boolean)
              .join(", "),
          type: "packing",
        });

        return;
      }

      const serviceMatch =
        part.match(
          /^Dịch vụ khác\s*:\s*(.+)$/i
        );

      if (serviceMatch) {
        requirements.push({
          key:
            "additional-service",
          label:
            "Dịch vụ bổ sung",
          value:
            serviceMatch[1]
              .split(/[,;|]+/)
              .map(
                translateSalesNoteService
              )
              .filter(Boolean)
              .join(", "),
          type: "service",
        });

        return;
      }

      if (
        /^Yêu cầu kiểm hàng$/i.test(
          part
        ) ||
        /^Kiểm hàng$/i.test(part)
      ) {
        requirements.push({
          key: "inspection",
          label:
            "Yêu cầu kiểm hàng",
          value:
            "Có kiểm tra hàng hóa",
          type: "inspection",
        });

        return;
      }

      summaryParts.push(part);
    });

  return {
    summary:
      summaryParts.join(". "),
    requirements,
  };
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const calculateItemVolume = (item = {}) => {
  const length = toFiniteNumberOrNull(item?.length);

  const width = toFiniteNumberOrNull(item?.width);

  const height = toFiniteNumberOrNull(item?.height);

  if (
    length === null ||
    width === null ||
    height === null ||
    length <= 0 ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return length * width * height;
};

const splitItemNames = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(splitItemNames).filter(Boolean);
  }

  const text = String(value || "").trim();

  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n|;|\||,(?=\s*[^\d])/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const EMPTY_UI_TEXT_VALUES = new Set([
  "undefined",
  "null",
  "n/a",
  "na",
  "none",
  "nil",
  "nan",
]);

const isPlaceholderText = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return EMPTY_UI_TEXT_VALUES.has(value.trim().toLowerCase());
};

const normalizeOptionalText = (value) => {
  const text = String(value ?? "").trim();

  if (!text || isPlaceholderText(text)) {
    return "";
  }

  return text;
};

const isNonEmptyValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(normalizeOptionalText(value));
  }

  return true;
};

const getFirstValue = (...values) => {
  return values.find(isNonEmptyValue);
};

const extractObjectData = (response) => {
  if (!response) {
    return null;
  }

  const candidates = [response?.data?.data, response?.data, response];

  return (
    candidates.find(
      (item) => item && typeof item === "object" && !Array.isArray(item),
    ) || null
  );
};

const normalizeObjectLabel = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String(
      value?.label ||
        value?.name ||
        value?.displayName ||
        value?.productTypeName ||
        value?.productTypeCode ||
        value?.code ||
        value?.value ||
        value?.id ||
        "",
    ).trim();
  }

  return String(value || "").trim();
};

const isGuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );

const normalizeLookupKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const hasUiValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(normalizeOptionalText(value));
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

const isValidExternalUrl = (value) => {
  const text = normalizeOptionalText(value);

  if (!text) {
    return false;
  }

  try {
    const parsedUrl = new URL(text);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const hasNumberValue = (value) =>
  hasUiValue(value) && Number.isFinite(Number(value));

const extractProductTypeItems = (result) => {
  const candidates = [
    result,
    result?.items,
    result?.productTypes,
    result?.types,
    result?.data,
    result?.data?.items,
    result?.data?.productTypes,
    result?.data?.types,
    result?.data?.data,
    result?.data?.data?.items,
    result?.data?.data?.productTypes,
  ];

  return candidates.find(Array.isArray) || [];
};

const normalizeProductTypeOptions = (result) =>
  extractProductTypeItems(result)
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const text = String(item).trim();

        return {
          id: "",
          code: text,
          value: text,
          label: text,
        };
      }

      return {
        ...item,
        id: String(item?.id || item?.productTypeId || "").trim(),
        code: String(item?.code || item?.productTypeCode || "").trim(),
        value: String(item?.value || item?.id || item?.code || "").trim(),
        label: String(
          item?.label ||
            item?.name ||
            item?.displayName ||
            item?.productTypeName ||
            item?.description ||
            item?.code ||
            "",
        ).trim(),
      };
    })
    .filter((item) => hasUiValue(item.label));

const buildProductTypeLabelMap = (options = []) => {
  const map = new Map();

  options.forEach((option) => {
    [
      option?.id,
      option?.code,
      option?.value,
      option?.label,
      option?.name,
      option?.productTypeId,
      option?.productTypeCode,
    ].forEach((key) => {
      const normalizedKey = normalizeLookupKey(key);

      if (normalizedKey && hasUiValue(option?.label)) {
        map.set(normalizedKey, option.label);
      }
    });
  });

  return map;
};

const resolveProductTypeLabel = (item, productTypeLabelMap) => {
  const candidates = [
    item?.productTypeId,
    item?.productTypeCode,
    item?.productTypeRaw,
    item?.productType,
  ];

  for (const value of candidates) {
    const key = normalizeLookupKey(value);

    if (key && productTypeLabelMap.has(key)) {
      return productTypeLabelMap.get(key);
    }
  }

  const currentLabel = String(item?.productType || "").trim();

  return currentLabel && !isGuidLike(currentLabel) ? currentLabel : "";
};

const buildPackageConfigurationMap = (configurations = []) => {
  const map = new Map();

  configurations.forEach((configuration) => {
    [
      configuration?.id,
      configuration?.packageConfigurationId,
      configuration?.configCode,
      configuration?.code,
    ].forEach((key) => {
      const normalizedKey = normalizeLookupKey(key);

      if (normalizedKey) {
        map.set(normalizedKey, configuration);
      }
    });
  });

  return map;
};

const normalizeItemImages = (source, itemIndex) => {
  const result = [];

  const append = (image, index) => {
    const url =
      typeof image === "string"
        ? image
        : image?.previewUrl ||
          image?.url ||
          image?.imageUrl ||
          image?.referenceUrl ||
          image?.fileUrl ||
          image?.src;

    const normalizedUrl = String(url || "").trim();

    if (normalizedUrl && !result.some((item) => item.url === normalizedUrl)) {
      result.push({
        id: image?.id || `product-${itemIndex + 1}-image-${index + 1}`,
        url: normalizedUrl,
      });
    }
  };

  [
    source?.images,
    source?.referenceUrls,
    source?.imageUrls,
    source?.photos,
    source?.attachments,
  ].forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.forEach(append);
    }
  });

  [source?.imageUrl, source?.referenceUrl, source?.photoUrl].forEach(
    (image) => {
      if (image) {
        append(image, result.length);
      }
    },
  );

  return result;
};

const getItemArrayCandidates = (
  quotation,
  orderSummary,
  consignmentDetail,
  locationState,
) => [
  consignmentDetail?.items,
  consignmentDetail?.orderItems,
  consignmentDetail?.consignmentItems,
  consignmentDetail?.packages,
  consignmentDetail?.parcels,
  consignmentDetail?.products,
  consignmentDetail?.order?.items,
  consignmentDetail?.order?.packages,

  quotation?.items,
  quotation?.orderItems,
  quotation?.consignmentItems,
  quotation?.packages,
  quotation?.parcels,
  quotation?.products,
  quotation?.order?.items,
  quotation?.order?.orderItems,
  quotation?.order?.packages,
  quotation?.consignment?.items,
  quotation?.consignment?.packages,

  orderSummary?.items,
  orderSummary?.orderItems,
  orderSummary?.consignmentItems,
  orderSummary?.packages,
  orderSummary?.parcels,
  orderSummary?.products,
  orderSummary?.order?.items,
  orderSummary?.order?.packages,

  locationState?.items,
  locationState?.orderItems,
  locationState?.packages,
  locationState?.parcels,
  locationState?.products,
  locationState?.form?.packages,
];

const normalizeOrderItem = (item, index) => {
  const source =
    item && typeof item === "object"
      ? item
      : {
          productName: item,
        };

  const dimensions =
    source?.dimensions ||
    source?.dimension ||
    source?.packageDimensions ||
    source?.size ||
    {};

  const packageConfiguration =
    source?.packageConfiguration ||
    source?.configuration ||
    source?.boxConfiguration ||
    source?.selectedPackageConfiguration ||
    {};

  const length = toFiniteNumberOrNull(
    getFirstValue(
      source?.length,
      source?.packageLength,
      dimensions?.length,
      dimensions?.long,
    ),
  );

  const width = toFiniteNumberOrNull(
    getFirstValue(
      source?.width,
      source?.packageWidth,
      dimensions?.width,
      dimensions?.wide,
    ),
  );

  const height = toFiniteNumberOrNull(
    getFirstValue(
      source?.height,
      source?.packageHeight,
      dimensions?.height,
      dimensions?.high,
    ),
  );

  const productTypeRaw = getFirstValue(
    source?.productTypeName,
    source?.productType,
    source?.productTypeCode,
    source?.categoryName,
    source?.category,
    source?.type,
  );

  const normalizedItem = {
    id: String(
      getFirstValue(
        source?.id,
        source?.itemId,
        source?.packageId,
        source?.parcelId,
        source?.productId,
        `product-${index + 1}`,
      ),
    ).trim(),

    productName: String(
      getFirstValue(
        source?.productName,
        source?.itemName,
        source?.name,
        source?.goodsName,
        source?.title,
        source?.description,
        `Sản phẩm ${index + 1}`,
      ),
    ).trim(),

    productTypeId: String(
      getFirstValue(
        source?.productTypeId,
        source?.productType?.id,
        source?.productType?.productTypeId,
        "",
      ) || "",
    ).trim(),

    productTypeCode: String(
      getFirstValue(
        source?.productTypeCode,
        source?.productType?.code,
        source?.productType?.productTypeCode,
        source?.productType?.value,
        "",
      ) || "",
    ).trim(),

    productTypeRaw: normalizeObjectLabel(productTypeRaw),

    productType: (() => {
      const label = normalizeObjectLabel(productTypeRaw);

      return label && !isGuidLike(label) ? label : "";
    })(),

    quantity: toFiniteNumberOrNull(
      getFirstValue(
        source?.quantity,
        source?.productQuantity,
        source?.count,
        source?.totalQuantity,
      ),
    ),

    unitPrice: toFiniteNumberOrNull(
      getFirstValue(source?.unitPrice, source?.price, source?.productPrice),
    ),

    weight: toFiniteNumberOrNull(
      getFirstValue(
        source?.weight,
        source?.actualWeight,
        source?.totalWeight,
        source?.grossWeight,
      ),
    ),

    volumetricWeight: toFiniteNumberOrNull(
      getFirstValue(
        source?.volumetricWeight,
        source?.dimWeight,
        source?.dimensionWeight,
      ),
    ),

    chargeableWeight: toFiniteNumberOrNull(
      getFirstValue(source?.chargeableWeight, source?.billingWeight),
    ),

    length,
    width,
    height,

    volume: toFiniteNumberOrNull(
      getFirstValue(source?.volume, source?.totalVolume, source?.packageVolume),
    ),

    declaredValue: toFiniteNumberOrNull(
      getFirstValue(
        source?.declaredValue,
        source?.productValue,
        source?.totalValue,
        source?.totalProductValue,
        source?.value,
      ),
    ),

    trackingCode: normalizeOptionalText(
      getFirstValue(
        source?.trackingCode,
        source?.domesticTrackingCode,
        source?.localTrackingCode,
        source?.packageCode,
        source?.waybillCode,
        source?.parcelCode,
        "",
      ),
    ),

    productUrl: normalizeOptionalText(
      getFirstValue(
        source?.productUrl,
        source?.sourceUrl,
        source?.websiteUrl,
        source?.website,
        source?.url,
        "",
      ),
    ),

    note: normalizeOptionalText(
      getFirstValue(
        source?.note,
        source?.generalNote,
        source?.itemNote,
        source?.remark,
        "",
      ),
    ),

    configurationId: String(
      getFirstValue(
        packageConfiguration?.id,
        packageConfiguration?.packageConfigurationId,
        source?.packageConfigurationId,
        source?.configurationId,
        "",
      ),
    ).trim(),

    configurationName: String(
      getFirstValue(
        packageConfiguration?.configName,
        packageConfiguration?.name,
        packageConfiguration?.displayName,
        source?.packageConfigurationName,
        source?.configName,
        "",
      ),
    ).trim(),

    configurationCode: String(
      getFirstValue(
        packageConfiguration?.configCode,
        packageConfiguration?.code,
        source?.packageConfigurationCode,
        source?.configCode,
        "",
      ),
    ).trim(),

    configurationFee: toFiniteNumberOrNull(
      getFirstValue(
        packageConfiguration?.packageFee,
        packageConfiguration?.estimatedFee,
        packageConfiguration?.fee,
        source?.packageFee,
        source?.configurationFee,
      ),
    ),

    images: normalizeItemImages(source, index),
  };

  return {
    ...normalizedItem,
    volume: normalizedItem.volume ?? calculateItemVolume(normalizedItem),
  };
};

const getItemIdentity = (item) => {
  if (item?.id && !String(item.id).startsWith("product-")) {
    return `id:${item.id}`;
  }

  return [
    item?.productName,
    item?.trackingCode,
    item?.length,
    item?.width,
    item?.height,
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    )
    .join("|");
};

const mergeNormalizedItems = (current, incoming) => {
  const mergeValue = (oldValue, newValue) =>
    isNonEmptyValue(oldValue) ? oldValue : newValue;

  return {
    ...incoming,
    ...current,
    productName: mergeValue(current?.productName, incoming?.productName),
    productType: mergeValue(current?.productType, incoming?.productType),
    productTypeId: mergeValue(current?.productTypeId, incoming?.productTypeId),
    productTypeCode: mergeValue(
      current?.productTypeCode,
      incoming?.productTypeCode,
    ),
    productTypeRaw: mergeValue(
      current?.productTypeRaw,
      incoming?.productTypeRaw,
    ),
    quantity: mergeValue(current?.quantity, incoming?.quantity),
    unitPrice: mergeValue(current?.unitPrice, incoming?.unitPrice),
    weight: mergeValue(current?.weight, incoming?.weight),
    volumetricWeight: mergeValue(
      current?.volumetricWeight,
      incoming?.volumetricWeight,
    ),
    chargeableWeight: mergeValue(
      current?.chargeableWeight,
      incoming?.chargeableWeight,
    ),
    length: mergeValue(current?.length, incoming?.length),
    width: mergeValue(current?.width, incoming?.width),
    height: mergeValue(current?.height, incoming?.height),
    volume: mergeValue(current?.volume, incoming?.volume),
    declaredValue: mergeValue(current?.declaredValue, incoming?.declaredValue),
    trackingCode: mergeValue(current?.trackingCode, incoming?.trackingCode),
    productUrl: mergeValue(current?.productUrl, incoming?.productUrl),
    note: mergeValue(current?.note, incoming?.note),
    configurationId: mergeValue(
      current?.configurationId,
      incoming?.configurationId,
    ),
    configurationName: mergeValue(
      current?.configurationName,
      incoming?.configurationName,
    ),
    configurationCode: mergeValue(
      current?.configurationCode,
      incoming?.configurationCode,
    ),
    configurationFee: mergeValue(
      current?.configurationFee,
      incoming?.configurationFee,
    ),
    images: [...(current?.images || []), ...(incoming?.images || [])].filter(
      (image, index, array) =>
        array.findIndex((candidate) => candidate.url === image.url) === index,
    ),
  };
};

const getQuotationOrderItems = (
  quotation,
  orderSummary,
  consignmentDetail,
  locationState,
) => {
  const itemMap = new Map();

  getItemArrayCandidates(
    quotation,
    orderSummary,
    consignmentDetail,
    locationState,
  )
    .filter(Array.isArray)
    .forEach((collection) => {
      collection.forEach((rawItem) => {
        const normalizedItem = normalizeOrderItem(rawItem, itemMap.size);

        const identity = getItemIdentity(normalizedItem);

        const existing = itemMap.get(identity);

        itemMap.set(
          identity,
          existing
            ? mergeNormalizedItems(existing, normalizedItem)
            : normalizedItem,
        );
      });
    });

  if (itemMap.size > 0) {
    return Array.from(itemMap.values());
  }

  const fallbackNames = splitItemNames(
    getFirstValue(
      orderSummary?.itemNames,
      consignmentDetail?.itemNames,
      quotation?.itemNames,
      quotation?.productNames,
      quotation?.itemsName,
      locationState?.itemNames,
    ),
  );

  return fallbackNames.map((productName, index) =>
    normalizeOrderItem(
      {
        productName,
      },
      index,
    ),
  );
};

const buildOrderDisplayData = ({
  quotation,
  orderSummary,
  consignmentDetail,
  locationState,
}) => {
  const customer =
    consignmentDetail?.customer ||
    quotation?.customer ||
    orderSummary?.customer ||
    locationState?.customer ||
    {};

  return {
    orderId: getFirstValue(
      consignmentDetail?.orderId,
      quotation?.orderId,
      orderSummary?.orderId,
      locationState?.orderId,
    ),

    consignmentCode: getFirstValue(
      consignmentDetail?.consignmentCode,
      quotation?.consignmentCode,
      orderSummary?.consignmentCode,
      orderSummary?.trackingCode,
    ),

    route: getFirstValue(
      consignmentDetail?.route,
      quotation?.route,
      orderSummary?.route,
      locationState?.route,
    ),

    shippingOption: getFirstValue(
      consignmentDetail?.shippingOption,
      consignmentDetail?.consignmentType,
      quotation?.shippingOption,
      quotation?.consignmentType,
      orderSummary?.shippingOption,
      orderSummary?.consignmentType,
    ),

    receiverName: getFirstValue(
      consignmentDetail?.receiverName,
      quotation?.receiverName,
      orderSummary?.receiverName,
      locationState?.receiverName,
    ),

    receiverPhone: getFirstValue(
      consignmentDetail?.receiverPhone,
      quotation?.receiverPhone,
      orderSummary?.receiverPhone,
      locationState?.receiverPhone,
    ),

    receiverAddress: getFirstValue(
      consignmentDetail?.receiverAddress,
      consignmentDetail?.deliveryAddress,
      consignmentDetail?.fullAddress,
      quotation?.receiverAddress,
      quotation?.deliveryAddress,
      orderSummary?.receiverAddress,
      orderSummary?.deliveryAddress,
      orderSummary?.fullAddress,
      locationState?.receiverAddress,
    ),

    customerName: getFirstValue(
      customer?.fullName,
      customer?.customerName,
      customer?.name,
      consignmentDetail?.customerName,
      quotation?.customerName,
    ),

    customerPhone: getFirstValue(
      customer?.phone,
      customer?.customerPhone,
      consignmentDetail?.customerPhone,
      quotation?.customerPhone,
    ),

    customerEmail: getFirstValue(
      customer?.email,
      customer?.customerEmail,
      consignmentDetail?.customerEmail,
      quotation?.customerEmail,
    ),

    note: getFirstValue(
      consignmentDetail?.note,
      consignmentDetail?.generalNote,
      quotation?.note,
      quotation?.generalNote,
      orderSummary?.note,
      locationState?.note,
    ),

    requiresInspection: Boolean(
      getFirstValue(
        consignmentDetail?.requiresInspection,
        consignmentDetail?.inspectPackage,
        quotation?.requiresInspection,
        orderSummary?.requiresInspection,
        orderSummary?.inspectPackage,
        false,
      ),
    ),

    createdAt: getFirstValue(
      consignmentDetail?.createdAt,
      quotation?.createdAt,
      orderSummary?.createdAt,
    ),
  };
};

const formatItemDimensions = (item) => {
  const dimensions = [item?.length, item?.width, item?.height];

  if (dimensions.some((value) => toFiniteNumberOrNull(value) === null)) {
    return "";
  }

  return `${formatNumber(item.length)} × ${formatNumber(
    item.width,
  )} × ${formatNumber(item.height)} cm`;
};

const hasCompleteDimensions = (item) =>
  [item?.length, item?.width, item?.height].every(hasNumberValue);

const getVisibleProductFields = (item) => {
  const fields = [];

  const add = (
    key,
    label,
    value,
    { visible = hasUiValue(value), className = "" } = {},
  ) => {
    if (!visible) {
      return;
    }

    fields.push({
      key,
      label,
      value,
      className,
    });
  };

  add(
    "quantity",
    "Số lượng",
    hasNumberValue(item?.quantity) ? formatNumber(item.quantity) : "",
    {
      visible: hasNumberValue(item?.quantity),
    },
  );

  add(
    "weight",
    "Cân nặng",
    hasNumberValue(item?.weight) ? `${formatNumber(item.weight, 4)} kg` : "",
    {
      visible: hasNumberValue(item?.weight),
    },
  );

  add(
    "dimensions",
    "Kích thước kiện",
    hasCompleteDimensions(item) ? formatItemDimensions(item) : "",
    {
      visible: hasCompleteDimensions(item),
      className: "is-dimension",
    },
  );

  add(
    "volume",
    "Thể tích",
    hasNumberValue(item?.volume) ? `${formatNumber(item.volume, 4)} cm³` : "",
    {
      visible: hasNumberValue(item?.volume),
    },
  );

  add(
    "declaredValue",
    "Giá trị khai báo",
    hasNumberValue(item?.declaredValue) ? formatMoney(item.declaredValue) : "",
    {
      visible: hasNumberValue(item?.declaredValue),
      className: "is-value",
    },
  );

  add(
    "unitPrice",
    "Đơn giá sản phẩm",
    hasNumberValue(item?.unitPrice) ? formatMoney(item.unitPrice) : "",
    {
      visible: hasNumberValue(item?.unitPrice),
    },
  );

  add(
    "volumetricWeight",
    "Khối lượng DIM",
    hasNumberValue(item?.volumetricWeight)
      ? `${formatNumber(item.volumetricWeight, 4)} kg`
      : "",
    {
      visible: hasNumberValue(item?.volumetricWeight),
    },
  );

  add(
    "chargeableWeight",
    "Khối lượng tính cước",
    hasNumberValue(item?.chargeableWeight)
      ? `${formatNumber(item.chargeableWeight, 4)} kg`
      : "",
    {
      visible: hasNumberValue(item?.chargeableWeight),
    },
  );

  add("trackingCode", "Mã vận đơn nội địa", item?.trackingCode, {
    className: "is-tracking",
  });

  return fields;
};

const getVisibleFeeFields = (fee) =>
  [
    {
      key: "feeType",
      label: "Loại phí",
      value: fee.feeType,
      visible: hasUiValue(fee.feeType),
    },
    {
      key: "unitPrice",
      label: "Đơn giá",
      value:
        getFeeCalculationType(fee.raw) === "PERCENTAGE"
          ? formatFeePercent(fee.unitPrice ?? fee.configValue)
          : formatMoney(fee.unitPrice ?? fee.configValue),
      visible: hasNumberValue(fee.unitPrice ?? fee.configValue),
    },
    {
      key: "quantity",
      label: "Số lượng",
      value: formatFeeQuantity(fee.quantity),
      visible: hasNumberValue(fee.quantity),
    },
    {
      key: "unit",
      label: "Đơn vị",
      value: fee.unitNoun,
      visible: hasUiValue(fee.unitNoun) && fee.unitNoun !== "-",
    },
    {
      key: "status",
      label: "Trạng thái áp dụng",
      value: fee.enabled ? "Đã tính trong phí dịch vụ" : "Chưa áp dụng",
      visible: true,
    },
    {
      key: "required",
      label: "Tính chất phí",
      value: fee.required ? "Bắt buộc" : "Tùy chọn",
      visible: true,
    },
    {
      key: "createdAt",
      label: "Ngày tạo phí",
      value: formatDateTime(fee.createdAtUtc || fee.createdAt),
      title: formatDateTimeUtcTitle(fee.createdAtUtc || fee.createdAt),
      visible: hasUiValue(fee.createdAtUtc || fee.createdAt),
    },
  ].filter((field) => field.visible);

const ProductInfoGrid = ({ item }) => {
  const fields = getVisibleProductFields(item);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="quotation-product-info-grid">
      {fields.map((field) => (
        <div key={field.key} className={field.className || undefined}>
          <span>{field.label}</span>
          <strong>{field.value}</strong>
        </div>
      ))}
    </div>
  );
};

const FeeDetailGrid = ({ fee }) => {
  const fields = getVisibleFeeFields(fee);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="quotation-fee-detail-grid-inner">
      {fields.map((field) => (
        <div key={field.key}>
          <span>{field.label}</span>
          <strong title={field.title || undefined}>{field.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-07-09T09:34:49.1217925
 * - 2026-07-09T09:37:26.3885142Z
 * - 2026-07-09T09:34:49+07:00
 *
 * Output luôn là UTC ISO chuẩn để hiển thị và so sánh.
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const normalizeAdditionalFeeTime = (fee) => {
  if (!fee) {
    return fee;
  }

  return {
    ...fee,
    createdAtUtc: normalizeApiTimeToUtc(fee.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(fee.updatedAt),
  };
};

const normalizeQuotationTime = (quotation) => {
  if (!quotation) {
    return quotation;
  }

  return {
    ...quotation,

    salesNote:
      normalizeOptionalText(
        getFirstValue(
          quotation?.salesNote,
          quotation?.saleNote,
          quotation?.sales_note,
          quotation?.noteFromSales,
          quotation?.sales?.note,
          ""
        )
      ),

    createdAtUtc:
      normalizeApiTimeToUtc(
        quotation.createdAt
      ),

    updatedAtUtc:
      normalizeApiTimeToUtc(
        quotation.updatedAt
      ),

    expiredAtUtc:
      normalizeApiTimeToUtc(
        quotation.expiredAt
      ),

    additionalFees:
      Array.isArray(
        quotation.additionalFees
      )
        ? quotation.additionalFees.map(
            normalizeAdditionalFeeTime
          )
        : [],
  };
};

const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatDateTimeUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
};

const isExpiredUtc = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return false;
  }

  const expiredTime = new Date(utcIso).getTime();
  const nowTime = getSyncedNowDate().getTime();

  return expiredTime < nowTime;
};

/* =========================================================
   FORMATTERS
   ========================================================= */

const formatMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value, maximumFractionDigits = 2) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
  }).format(number);
};

const formatWeightKg = (value) => {
  return formatNumber(value, 4);
};

const formatVolumeCm3 = (value) => {
  return formatNumber(value, 4);
};

const formatFeeQuantity = (quantity) => {
  if (quantity === null || quantity === undefined || quantity === "") {
    return "-";
  }

  return formatNumber(quantity, 2);
};

const formatFeePercent = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return `${formatNumber(number, 2)}%`;
};

const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (navigator.clipboard?.writeText && window.isSecureContext) {
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

/* =========================================================
   FEE HELPERS
   ========================================================= */

const getFeeCodeLabel = (code) => {
  const normalizedCode = normalizeStatus(code);

  if (!normalizedCode) {
    return "";
  }

  return FEE_CODE_LABELS[normalizedCode] || formatStatusCode(normalizedCode);
};

const translateFeeLabelToVietnamese = (value) => {
  return String(value || "")
    .replace(/large\s*box/gi, "Thùng cỡ lớn")
    .replace(/medium\s*box/gi, "Thùng cỡ vừa")
    .replace(/small\s*box/gi, "Thùng cỡ nhỏ")
    .replace(/custom\s*box/gi, "Thùng tùy chỉnh")
    .replace(/wood\s*crate/gi, "Đóng thùng gỗ")
    .replace(/packing\s*fee/gi, "Phí đóng gói")
    .trim();
};

const getFeeLabel = (fee) => {
  const apiLabel = fee?.label || fee?.feeName || "";

  return (
    translateFeeLabelToVietnamese(apiLabel) ||
    getFeeCodeLabel(fee?.code) ||
    "Phí phát sinh"
  );
};

const getFeeTypeLabel = (fee) => {
  const type = normalizeStatus(fee?.feeType || fee?.type || fee?.code);

  return FEE_TYPE_LABELS[type] || formatStatusCode(type);
};

const getFeeCalculationType = (fee) => {
  return normalizeStatus(fee?.feeCalculationType || fee?.calculationType);
};

const getFeeCalculationTypeLabel = (fee) => {
  const type = getFeeCalculationType(fee);

  return CALCULATION_TYPE_LABELS[type] || formatStatusCode(type);
};

/**
 * Ưu tiên amount vì đây là số tiền thật API đã tính.
 * value có thể là giá trị cấu hình như 3% nên chỉ dùng sau cùng.
 */
const getFeeAmount = (fee) => {
  const amount =
    fee?.amount ?? fee?.totalAmount ?? fee?.price ?? fee?.value ?? 0;

  const number = Number(amount);

  return Number.isFinite(number) ? number : 0;
};

const isFeeEnabled = (fee) => {
  return fee?.enabled !== false;
};

const isFeeRequired = (fee) => {
  return Boolean(fee?.isRequired);
};

const getFeeUnitDisplay = (fee) => {
  const code = normalizeStatus(fee?.code);

  const calculationType = getFeeCalculationType(fee);

  if (code === "WOOD_CRATE") {
    /*
     * Nghiệp vụ:
     * 35.000đ tính một lần cho toàn bộ đơn.
     */
    return "toàn đơn";
  }

  if (code === "PACKING_FEE") {
    return "kiện";
  }

  if (code === "SUR_INSPECTION") {
    return "lần";
  }

  if (code === "SUR_INSURANCE_3PERCENT" || calculationType === "PERCENTAGE") {
    return "giá trị khai báo";
  }

  return String(fee?.unitNoun || "").trim() || "-";
};

const getAdditionalFees = (quotation) => {
  return Array.isArray(quotation?.additionalFees)
    ? quotation.additionalFees
    : [];
};

const normalizeFeeToCostItem = (fee, index) => {
  const enabled = isFeeEnabled(fee);
  const calculationType = getFeeCalculationTypeLabel(fee);

  return {
    key:
      fee?.id ||
      fee?.feeId ||
      fee?.pricingRuleId ||
      `${fee?.code || "fee"}-${index}`,
    id: fee?.id,
    pricingRuleId: fee?.pricingRuleId,
    feeId: fee?.feeId,
    code: fee?.code,
    codeLabel: getFeeCodeLabel(fee?.code),
    label: getFeeLabel(fee),
    value: getFeeAmount(fee),
    enabled,
    required: isFeeRequired(fee),
    feeType: getFeeTypeLabel(fee),
    calculationType,
    rawCalculationType: fee?.feeCalculationType || fee?.calculationType,
    unitPrice: fee?.unitPrice,
    quantity: fee?.quantity,
    unitNoun: getFeeUnitDisplay(fee),
    configValue: fee?.value,
    note: fee?.note,
    createdAtUtc: fee?.createdAtUtc,
    createdAt: fee?.createdAt,
    raw: fee,
  };
};

const getCostItems = (quotation) => {
  return getAdditionalFees(quotation)
    .map(normalizeFeeToCostItem)
    .filter((item) => {
      const normalizedCode = normalizeStatus(item?.code);

      /*
       * MAIN_SERVICE đã nằm trong estimatedFreightCharge.
       * SERVICE_FEE đã nằm trong serviceFee.
       * TAX_DUTY đã nằm trong taxAndDuty.
       *
       * Chỉ giữ lại các phụ phí thật như:
       * WOOD_CRATE, SUR_INSPECTION,
       * SUR_INSURANCE_3PERCENT...
       */
      return !BASE_COST_FEE_CODES.has(normalizedCode);
    });
};

const getActiveCostItems = (costItems = []) => {
  return costItems.filter((item) => item.enabled);
};

const getActiveCostTotal = (costItems = []) => {
  return getActiveCostItems(costItems).reduce(
    (total, item) => total + Number(item.value || 0),
    0,
  );
};

const getQuotationCostSummary = (quotation, costItems = []) => {
  const toAmount = (value) => {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  };

  const freight = toAmount(quotation?.estimatedFreightCharge);

  const domesticShippingFee = toAmount(quotation?.domesticShippingFee);

  const additionalFeesTotal = getActiveCostTotal(costItems);

  /*
   * serviceFee là field tổng phí dịch vụ
   * do API trả về.
   *
   * Trong response hiện tại:
   * 35k + 50k + 10k + 10k = 105k.
   */
  const rawServiceFee = Number(quotation?.serviceFee);

  const serviceFee = Number.isFinite(rawServiceFee)
    ? rawServiceFee
    : additionalFeesTotal;

  const vat = toAmount(quotation?.vat);

  const importTax = toAmount(quotation?.importTax);

  const rawTaxAndDuty = Number(quotation?.taxAndDuty);

  /*
   * taxAndDuty là tổng thuế cuối cùng.
   * VAT và importTax chỉ là chi tiết,
   * không cộng lại lần thứ hai.
   */
  const taxAndDuty = Number.isFinite(rawTaxAndDuty)
    ? rawTaxAndDuty
    : vat + importTax;

  const calculatedTotal =
    freight + domesticShippingFee + serviceFee + taxAndDuty;

  const rawApiTotal = Number(quotation?.totalEstimatedCost);

  const apiTotal = Number.isFinite(rawApiTotal) ? rawApiTotal : null;

  const displayTotal = apiTotal ?? calculatedTotal;

  return {
    freight,
    domesticShippingFee,
    serviceFee,
    additionalFeesTotal,
    vat,
    importTax,
    taxAndDuty,
    calculatedTotal,
    apiTotal,
    displayTotal,

    serviceFeeDifference: serviceFee - additionalFeesTotal,

    totalDifference: displayTotal - calculatedTotal,

    serviceBreakdownMatches: Math.abs(serviceFee - additionalFeesTotal) < 1,

    totalMatches: Math.abs(displayTotal - calculatedTotal) < 1,
  };
};

const getConsignmentCode = (quotation) => {
  const code =
    quotation?.consignmentCode ||
    quotation?.trackingCode ||
    quotation?.waybillCode ||
    quotation?.shipmentCode;

  return String(code || "").trim() || "Chưa được cấp mã";
};

const extractQuotationData = (response) => {
  if (!response) {
    return null;
  }

  const candidates = [response?.data?.data, response?.data, response];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (item.quotationId ||
          item.quotationCode ||
          item.quoteCode ||
          item.orderId ||
          item.quoteType ||
          item.additionalFees),
    ) || null
  );
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
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

const isCanceledRequest = (error) => {
  return (
    axios.isCancel(error) ||
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getActionResponseMessage = (apiResult, fallbackMessage) => {
  if (typeof apiResult === "string" && apiResult.trim()) {
    return apiResult.trim();
  }

  return (
    apiResult?.message ||
    apiResult?.data?.message ||
    apiResult?.data?.data?.message ||
    fallbackMessage
  );
};

const buildPaymentRedirectUrl = (paymentStatus, quotationId) => {
  const redirectUrl = new URL(window.location.href);

  redirectUrl.search = "";
  redirectUrl.hash = "";

  redirectUrl.searchParams.set("payment", paymentStatus);
  redirectUrl.searchParams.set("quotationId", quotationId);

  return redirectUrl.toString();
};

/**
 * Backend SePay có thể trả về:
 * - URL tuyệt đối: https://api-vcl.../api/payments/sepay/checkout/{orderCode}
 * - URL tương đối: /api/payments/sepay/checkout/{orderCode}
 *
 * Hàm này luôn chuyển kết quả thành URL tuyệt đối của API backend,
 * tránh điều hướng nhầm sang domain của frontend.
 */
const resolveSePayCheckoutUrl = (apiResult) => {
  const rawCheckoutUrl = String(
    getPaymentCheckoutUrl(apiResult) || "",
  ).trim();

  if (!rawCheckoutUrl) {
    return "";
  }

  try {
    return new URL(rawCheckoutUrl).toString();
  } catch {
    const configuredApiBase = String(
      import.meta.env.VITE_API_BASE_URL ||
        "https://api-vcl.zushin.io.vn",
    ).trim();

    let apiOrigin = "https://api-vcl.zushin.io.vn";

    try {
      apiOrigin = new URL(
        configuredApiBase,
        window.location.origin,
      ).origin;
    } catch {
      // Dùng domain API mặc định khi biến môi trường không hợp lệ.
    }

    return new URL(rawCheckoutUrl, `${apiOrigin}/`).toString();
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

const QuotationDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  const locationState = location.state || {};

  const orderSummary =
    locationState?.orderSummary ||
    locationState?.consignment ||
    locationState?.orderDetail ||
    locationState?.order ||
    locationState?.data ||
    null;

  const [quotation, setQuotation] = useState(null);

  const [consignmentDetail, setConsignmentDetail] = useState(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [statusOptions, setStatusOptions] = useState([]);

  const [productTypeOptions, setProductTypeOptions] = useState([]);

  const [packageConfigurations, setPackageConfigurations] = useState([]);

  const [copiedConsignmentCode, setCopiedConsignmentCode] = useState("");

  const [quotationAction, setQuotationAction] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const copyResetTimerRef = useRef(null);

  /*
   * Giá trị hiển thị được tạo ngay trong component để mọi handler
   * và phần JSX đều dùng chung một nguồn, không còn lỗi biến ngoài scope.
   */
  const orderDisplayData = useMemo(
    () =>
      buildOrderDisplayData({
        quotation,
        orderSummary,
        consignmentDetail,
        locationState,
      }),
    [quotation, orderSummary, consignmentDetail, locationState],
  );

  const displayConsignmentCode = getConsignmentCode({
    ...orderDisplayData,
    ...quotation,

    consignmentCode:
      quotation?.consignmentCode ||
      orderDisplayData?.consignmentCode,
  });

  const displaySalesNote =
    normalizeOptionalText(
      getFirstValue(
        quotation?.salesNote,
        quotation?.saleNote,
        quotation?.sales_note,
        quotation?.noteFromSales,
        orderDisplayData?.salesNote,
        orderSummary?.salesNote,
        consignmentDetail?.salesNote,
        locationState?.salesNote,
        locationState?.quotation
          ?.salesNote,
        locationState?.data?.salesNote,
        ""
      )
    );

  const fetchQuotation = useCallback(
    async (signal, { showSuccessNotification = false } = {}) => {
      if (!orderId) {
        const missingOrderMessage = "Không tìm thấy mã đơn hàng.";

        setErrorMessage(missingOrderMessage);

        setQuotation(null);
        setLoading(false);

        AuthNotify.error("Không thể tải báo giá", missingOrderMessage);

        return false;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const [
          quotationResult,
          consignmentResult,
          statusesResult,
          productTypesResult,
          packageConfigurationsResult,
        ] = await Promise.allSettled([
          getOrderQuotationApi(orderId, {
            signal,
          }),
          getConsignmentDetailApi(orderId, {
            signal,
          }),
          getConsignmentStatusesApi({
            signal,
          }),

          getProductTypesApi({
            signal,
          }),

          pricingRuleService.getPackageConfigurations({
            signal,
            onlyActive: true,
          }),
        ]);

        if (quotationResult.status === "rejected") {
          throw quotationResult.reason;
        }

        const quotationData = extractQuotationData(quotationResult.value);

        if (!quotationData) {
          throw new Error("API không trả về dữ liệu báo giá.");
        }

        setQuotation(normalizeQuotationTime(quotationData));

        if (consignmentResult.status === "fulfilled") {
          setConsignmentDetail(extractObjectData(consignmentResult.value));
        } else if (!isCanceledRequest(consignmentResult.reason)) {
          console.error(
            "Lỗi lấy đầy đủ dữ liệu đơn ký gửi:",
            consignmentResult.reason,
          );

          setConsignmentDetail(null);

          AuthNotify.warning(
            "Thiếu dữ liệu chi tiết đơn",
            getApiErrorMessage(
              consignmentResult.reason,
              "Báo giá vẫn hiển thị, nhưng một số thông tin sản phẩm có thể chỉ lấy được từ dữ liệu chuyển trang.",
            ),
          );
        }

        if (statusesResult.status === "fulfilled") {
          setStatusOptions(normalizeStatusOptions(statusesResult.value));
        } else if (!isCanceledRequest(statusesResult.reason)) {
          console.error("Lỗi lấy danh sách trạng thái:", statusesResult.reason);

          AuthNotify.warning(
            "Không tải được trạng thái",
            getApiErrorMessage(
              statusesResult.reason,
              "Báo giá vẫn được hiển thị nhưng tên trạng thái có thể chưa được cập nhật.",
            ),
          );
        }

        if (productTypesResult.status === "fulfilled") {
          setProductTypeOptions(
            normalizeProductTypeOptions(productTypesResult.value),
          );
        } else if (!isCanceledRequest(productTypesResult.reason)) {
          console.error("Lỗi lấy loại sản phẩm:", productTypesResult.reason);

          setProductTypeOptions([]);
        }

        if (packageConfigurationsResult.status === "fulfilled") {
          setPackageConfigurations(
            Array.isArray(packageConfigurationsResult.value)
              ? packageConfigurationsResult.value
              : [],
          );
        } else if (!isCanceledRequest(packageConfigurationsResult.reason)) {
          console.error(
            "Lỗi lấy cấu hình thùng:",
            packageConfigurationsResult.reason,
          );

          setPackageConfigurations([]);
        }

        if (showSuccessNotification) {
          AuthNotify.success(
            "Làm mới thành công",
            "Thông tin báo giá đã được cập nhật.",
          );
        }

        return true;
      } catch (error) {
        if (isCanceledRequest(error)) {
          return false;
        }

        console.error("Lỗi lấy chi tiết báo giá:", error);

        const apiMessage = getApiErrorMessage(
          error,
          "Không thể tải thông tin báo giá.",
        );

        setErrorMessage(apiMessage);

        setQuotation(null);
        setConsignmentDetail(null);

        AuthNotify.error("Không thể tải báo giá", apiMessage);

        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchQuotation(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchQuotation]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );

  const handleReload = () => {
    const controller = new AbortController();

    fetchQuotation(controller.signal, {
      showSuccessNotification: true,
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCopyConsignmentCode = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      !displayConsignmentCode ||
      displayConsignmentCode === "Chưa được cấp mã"
    ) {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Báo giá chưa có mã vận đơn để sao chép.",
      );
      return;
    }

    try {
      await copyTextToClipboard(displayConsignmentCode);

      setCopiedConsignmentCode(displayConsignmentCode);

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${displayConsignmentCode}.`,
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedConsignmentCode("");
      }, 1800);
    } catch (error) {
      console.error("Không thể sao chép mã vận đơn:", error);

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại.",
      );
    }
  };

  const handleQuotationActionError = (error, title, fallbackMessage) => {
    if (isCanceledRequest(error)) {
      return;
    }

    console.error(title, error);

    const responseStatus = error?.response?.status;

    const apiMessage = getApiErrorMessage(error, fallbackMessage);

    if (responseStatus === 401) {
      sessionStorage.removeItem("accessToken");

      localStorage.removeItem("accessToken");

      AuthNotify.error(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
      );

      navigate("/login");
      return;
    }

    AuthNotify.error(title, apiMessage);
  };

  const reloadQuotationAfterAction = async () => {
    const refreshController = new AbortController();

    await fetchQuotation(refreshController.signal);
  };

  const handleOpenRejectDialog = () => {
    if (!quotation?.quotationId) {
      AuthNotify.error(
        "Không thể từ chối báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    if (quotationAction === "reject") {
      return;
    }

    setRejectDialogOpen(false);
  };

  const handleConfirmRejectQuotation = async (reasonValue) => {
    const quotationId = quotation?.quotationId;
    const reason = String(reasonValue || "").trim();

    if (!quotationId) {
      AuthNotify.error(
        "Không thể từ chối báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    if (reason.length < 3) {
      AuthNotify.warning(
        "Lý do chưa hợp lệ",
        "Lý do từ chối phải có ít nhất 3 ký tự.",
      );
      return;
    }

    try {
      setQuotationAction("reject");

      const result = await rejectQuotationApi(quotationId, reason);

      setRejectDialogOpen(false);

      AuthNotify.success(
        "Từ chối báo giá thành công",
        getActionResponseMessage(
          result,
          "Báo giá đã được từ chối trên hệ thống.",
        ),
      );

      navigate("/history/consignment", {
        replace: true,
        state: {
          quotationRejected: true,
          quotationId,
        },
      });
    } catch (error) {
      handleQuotationActionError(
        error,
        "Từ chối báo giá thất bại",
        "Không thể từ chối báo giá. Vui lòng thử lại.",
      );
    } finally {
      setQuotationAction("");
    }
  };

  const handleAcceptQuotation = async () => {
    const quotationId = quotation?.quotationId;

    if (!quotationId) {
      AuthNotify.error(
        "Không thể chấp nhận báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn chấp nhận báo giá tạm tính này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setQuotationAction("accept");

      const result = await acceptQuotationApi(quotationId);

      AuthNotify.success(
        "Chấp nhận báo giá thành công",
        getActionResponseMessage(result, "Báo giá tạm tính đã được chấp nhận."),
      );

      await reloadQuotationAfterAction();
    } catch (error) {
      handleQuotationActionError(
        error,
        "Chấp nhận báo giá thất bại",
        "Không thể chấp nhận báo giá. Vui lòng thử lại.",
      );
    } finally {
      setQuotationAction("");
    }
  };

  const handleOpenPaymentDialog = () => {
    if (!quotation?.quotationId) {
      AuthNotify.error(
        "Không thể xác nhận thanh toán",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    if (quotationAction === "pay") {
      return;
    }

    setPaymentDialogOpen(false);
  };

  const handleConfirmAndPay = async (paymentMethodValue) => {
    const quotationId = quotation?.quotationId;
    const paymentMethod = String(paymentMethodValue || "")
      .trim()
      .toUpperCase();

    if (!quotationId) {
      AuthNotify.error(
        "Không thể xác nhận báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      AuthNotify.warning(
        "Chưa chọn phương thức",
        "Vui lòng chọn xác nhận offline hoặc thanh toán online qua SePay.",
      );
      return;
    }

    try {
      setQuotationAction("pay");

      /*
       * OFFLINE:
       * Chỉ xác nhận/chấp nhận báo giá thủ công.
       * Không tạo giao dịch, không tạo checkout URL và không gọi SePay.
       */
      if (paymentMethod === PAYMENT_METHODS.OFFLINE) {
        const result = await acceptQuotationApi(quotationId);

        setPaymentDialogOpen(false);

        AuthNotify.success(
          "Xác nhận báo giá offline thành công",
          getActionResponseMessage(
            result,
            "Báo giá đã được xác nhận. Bộ phận phụ trách sẽ liên hệ để xử lý thanh toán thủ công.",
          ),
        );

        await reloadQuotationAfterAction();
        return;
      }

      /*
       * ONLINE:
       * Backend chỉ nhận đúng paymentMethod = "SEPAY".
       * Frontend nhận checkout URL rồi chuyển sang trang VietQR của backend.
       */
      const result = await confirmAndPayQuotationApi(quotationId, {
        returnUrl: buildPaymentRedirectUrl("success", quotationId),
        cancelUrl: buildPaymentRedirectUrl("cancel", quotationId),
        paymentMethod: "SEPAY",
      });

      const checkoutUrl = resolveSePayCheckoutUrl(result);

      if (!checkoutUrl) {
        throw new Error(
          "API không trả về đường dẫn checkout thanh toán SePay.",
        );
      }

      setPaymentDialogOpen(false);

      AuthNotify.success(
        "Khởi tạo thanh toán SePay thành công",
        "Đang chuyển đến trang quét VietQR để thanh toán tiền cọc 50%.",
      );

      window.location.assign(checkoutUrl);
    } catch (error) {
      handleQuotationActionError(
        error,
        paymentMethod === PAYMENT_METHODS.OFFLINE
          ? "Xác nhận báo giá offline thất bại"
          : "Khởi tạo thanh toán SePay thất bại",
        paymentMethod === PAYMENT_METHODS.OFFLINE
          ? "Không thể xác nhận báo giá. Vui lòng thử lại."
          : "Không thể mở trang thanh toán SePay. Vui lòng thử lại.",
      );
    } finally {
      setQuotationAction("");
    }
  };

  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [
          normalizeStatus(option.value),
          option.label,
        ]),
      ),
    [statusOptions],
  );

  const getQuotationStatusLabel = useCallback(
    (status) => {
      const normalizedStatus = normalizeStatus(status);

      return (
        statusLabelMap.get(normalizedStatus) ||
        QUOTATION_STATUS_FALLBACK_LABELS[normalizedStatus] ||
        formatStatusCode(normalizedStatus) ||
        "-"
      );
    },
    [statusLabelMap],
  );

  const costItems = useMemo(() => {
    if (!quotation) {
      return [];
    }

    return getCostItems(quotation);
  }, [quotation]);

  const costSummary = useMemo(
    () => getQuotationCostSummary(quotation, costItems),
    [quotation, costItems],
  );

  /*
   * additionalFees là chi tiết của serviceFee.
   * Mỗi dòng đã được tính trong Phí dịch vụ,
   * không cộng lại vào tổng báo giá.
   */
  const reconciledCostItems = useMemo(
    () =>
      costItems.map((item) => ({
        ...item,

        includedInTotal: Boolean(item?.enabled),

        reconciliationStatus: item?.enabled
          ? "included-in-service"
          : "disabled",

        reconciliationNote: item?.enabled
          ? "Khoản phí này đã được tổng hợp trong trường Phí dịch vụ của báo giá."
          : "Khoản phí hiện chưa được áp dụng.",
      })),
    [costItems],
  );

  const appliedCostItems = useMemo(
    () => reconciledCostItems.filter((item) => item.enabled),
    [reconciledCostItems],
  );

  const activeCostTotal = costSummary.serviceFee;

  const baseCostTotal =
    costSummary.freight +
    costSummary.domesticShippingFee +
    costSummary.taxAndDuty;

  const displayTotalCost =
    costSummary.displayTotal;

  const depositRate = 0.5;

  const depositAmount =
    Number.isFinite(
      Number(displayTotalCost)
    )
      ? Number(displayTotalCost) *
        depositRate
      : 0;

  const remainingAmount =
    Math.max(
      Number(displayTotalCost) -
        depositAmount,
      0,
    );

  const productTypeLabelMap = useMemo(
    () => buildProductTypeLabelMap(productTypeOptions),
    [productTypeOptions],
  );

  const packageConfigurationMap = useMemo(
    () => buildPackageConfigurationMap(packageConfigurations),
    [packageConfigurations],
  );

  const rawQuotationOrderItems = useMemo(
    () =>
      getQuotationOrderItems(
        quotation,
        orderSummary,
        consignmentDetail,
        locationState,
      ),
    [quotation, orderSummary, consignmentDetail, locationState],
  );

  const quotationOrderItems = useMemo(
    () =>
      rawQuotationOrderItems.map((item) => {
        const configuration =
          packageConfigurationMap.get(
            normalizeLookupKey(item?.configurationId),
          ) ||
          packageConfigurationMap.get(
            normalizeLookupKey(item?.configurationCode),
          ) ||
          null;

        return {
          ...item,

          productTypeLabel: resolveProductTypeLabel(item, productTypeLabelMap),

          configurationName:
            item?.configurationName ||
            configuration?.configName ||
            configuration?.name ||
            "",

          configurationCode:
            item?.configurationCode ||
            configuration?.configCode ||
            configuration?.code ||
            "",

          configurationFee:
            item?.configurationFee ??
            configuration?.packageFee ??
            configuration?.fee ??
            null,
        };
      }),
    [rawQuotationOrderItems, productTypeLabelMap, packageConfigurationMap],
  );

  const orderSummaryFields = useMemo(() => {
    const fields = [];

    const add = (key, label, value, className = "") => {
      if (!hasUiValue(value)) {
        return;
      }

      fields.push({
        key,
        label,
        value,
        className,
      });
    };

    if (quotationOrderItems.length > 0) {
      add(
        "productCount",
        "Số sản phẩm",
        `${quotationOrderItems.length} sản phẩm`,
      );
    }

    add("receiverName", "Người nhận", orderDisplayData.receiverName);

    add("receiverPhone", "Số điện thoại", orderDisplayData.receiverPhone);

    add("route", "Tuyến vận chuyển", orderDisplayData.route);

    if (hasUiValue(orderDisplayData.shippingOption)) {
      add(
        "shippingOption",
        "Hình thức vận chuyển",
        getConsignmentTypeLabel(orderDisplayData.shippingOption),
      );
    }

    if (typeof orderDisplayData.requiresInspection === "boolean") {
      add(
        "inspection",
        "Yêu cầu kiểm hàng",
        getBooleanLabel(orderDisplayData.requiresInspection),
      );
    }

    add(
      "receiverAddress",
      "Địa chỉ nhận hàng",
      orderDisplayData.receiverAddress,
      "is-address",
    );

    return fields;
  }, [quotationOrderItems.length, orderDisplayData]);

  if (loading) {
    return (
      <div className="quotation-detail-page">
        <div className="quotation-loading-box">
          <CircularProgress size={42} />

          <div>
            <strong>Đang tải thông tin báo giá</strong>

            <span>Vui lòng chờ trong giây lát...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="quotation-detail-page">
        <div className="quotation-error-box">
          <div className="quotation-error-icon">📄</div>

          <h2>Không tìm thấy báo giá</h2>

          <p>
            {errorMessage ||
              "Đơn hàng chưa có báo giá hoặc báo giá không tồn tại."}
          </p>

          <div className="quotation-error-actions">
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Quay lại
            </Button>

            <Button
              variant="contained"
              startIcon={<AutorenewIcon />}
              onClick={handleReload}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasExpired = isExpiredUtc(
    quotation.expiredAtUtc || quotation.expiredAt,
  );

  const quotationStatus = normalizeStatus(quotation.status);

  const completedStatuses = [
    "APPROVED",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "CANCELED",
    "PAID",
  ];

  const effectiveStatus =
    hasExpired && !completedStatuses.includes(quotationStatus)
      ? "EXPIRED"
      : quotation.status;

  const effectiveStatusClass = getStatusClassName(effectiveStatus);

  const normalizedQuoteType = normalizeStatus(quotation.quoteType);

  const canManageQuotation =
    normalizeStatus(effectiveStatus) === "PENDING" &&
    !hasExpired &&
    Boolean(quotation.quotationId);

  const canAcceptEstimate =
    canManageQuotation && normalizedQuoteType === "ESTIMATE";

  const canConfirmAndPay =
    canManageQuotation && ["OFFICIAL", "FINAL"].includes(normalizedQuoteType);

  const showQuotationActions =
    canManageQuotation && (canAcceptEstimate || canConfirmAndPay);

  const isActionLoading = Boolean(quotationAction);

  /*
   * Không dùng hook tại đây vì phía trên có các nhánh
   * return cho loading và lỗi. Dùng hàm thuần giúp số lượng
   * hook luôn giống nhau giữa mọi lần render.
   */
  const saleNoteData =
    parseSalesNote(
      displaySalesNote
    );

  const summaryCards = [
    hasUiValue(quotation.consignmentType) && {
      key: "shipping",
      label: "Loại vận chuyển",
      value: getConsignmentTypeLabel(quotation.consignmentType),
      iconClass: "shipping",
      icon: <LocalShippingOutlinedIcon />,
    },

    hasNumberValue(quotation.totalWeight) && {
      key: "weight",
      label: "Trọng lượng thực",
      value: (
        <>
          {formatWeightKg(quotation.totalWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "weight",
      icon: <ScaleOutlinedIcon />,
    },

    hasNumberValue(quotation.volumetricWeight) && {
      key: "volume",
      label: "Trọng lượng quy đổi",
      value: (
        <>
          {formatWeightKg(quotation.volumetricWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "volume",
      icon: <Inventory2OutlinedIcon />,
    },

    hasNumberValue(quotation.chargeableWeight) && {
      key: "chargeable",
      label: "Trọng lượng tính cước",
      value: (
        <>
          {formatWeightKg(quotation.chargeableWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "chargeable",
      highlighted: true,
      icon: <PaymentsOutlinedIcon />,
    },
  ].filter(Boolean);

  const descriptionRows = [];

  const addDescription = (key, label, visible, content) => {
    if (!visible) {
      return;
    }

    descriptionRows.push({
      key,
      label,
      content,
    });
  };

  const realConsignmentCode = getFirstValue(
    quotation?.consignmentCode,
    orderDisplayData?.consignmentCode,
  );

  addDescription(
    "consignmentCode",
    "Mã vận đơn",
    hasUiValue(realConsignmentCode),
    <div className="quotation-description-code">
      <span className="quotation-id-text">{realConsignmentCode}</span>

      <button
        type="button"
        className={[
          "quotation-inline-copy-button",
          copiedConsignmentCode === displayConsignmentCode && "is-copied",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleCopyConsignmentCode}
        aria-label={`Sao chép mã vận đơn ${displayConsignmentCode}`}
      >
        {copiedConsignmentCode === displayConsignmentCode ? (
          <CheckRoundedIcon />
        ) : (
          <ContentCopyRoundedIcon />
        )}
      </button>
    </div>,
  );

  addDescription(
    "quoteType",
    "Loại báo giá",
    hasUiValue(quotation.quoteType),
    <Tag color="blue">{getQuoteTypeLabel(quotation.quoteType)}</Tag>,
  );

  addDescription(
    "status",
    "Trạng thái",
    hasUiValue(effectiveStatus),
    <span className={`quotation-inline-status status-${effectiveStatusClass}`}>
      {getQuotationStatusLabel(effectiveStatus)}
    </span>,
  );

  [
    [
      "consignmentType",
      "Loại vận chuyển",
      quotation.consignmentType,
      hasUiValue(quotation.consignmentType)
        ? getConsignmentTypeLabel(quotation.consignmentType)
        : "",
    ],
    [
      "route",
      "Tuyến vận chuyển",
      orderDisplayData.route,
      orderDisplayData.route,
    ],
    [
      "receiverName",
      "Người nhận",
      orderDisplayData.receiverName,
      orderDisplayData.receiverName,
    ],
    [
      "receiverPhone",
      "Số điện thoại người nhận",
      orderDisplayData.receiverPhone,
      orderDisplayData.receiverPhone,
    ],
    [
      "customerName",
      "Khách hàng",
      orderDisplayData.customerName,
      orderDisplayData.customerName,
    ],
    [
      "customerEmail",
      "Email khách hàng",
      orderDisplayData.customerEmail,
      orderDisplayData.customerEmail,
    ],
    [
      "customerPhone",
      "Số điện thoại khách hàng",
      orderDisplayData.customerPhone,
      orderDisplayData.customerPhone,
    ],
  ].forEach(([key, label, rawValue, content]) => {
    addDescription(key, label, hasUiValue(rawValue), content);
  });

  addDescription(
    "receiverAddress",
    "Địa chỉ nhận hàng",
    hasUiValue(orderDisplayData.receiverAddress),
    <span className="quotation-description-full-text">
      {orderDisplayData.receiverAddress}
    </span>,
  );

  addDescription(
    "inspection",
    "Yêu cầu kiểm hàng",
    typeof orderDisplayData
      .requiresInspection ===
      "boolean",
    getBooleanLabel(
      orderDisplayData
        .requiresInspection
    ),
  );





  const costOverviewItems = [
    {
      key: "freight",
      className: "is-freight",
      label: "Cước vận chuyển quốc tế",
      value: costSummary.freight,
      rawValue: quotation.estimatedFreightCharge,
      description: "Cước vận chuyển chính của đơn hàng",
    },
    {
      key: "domestic",
      className: "is-domestic",
      label: "Phí vận chuyển nội địa",
      value: costSummary.domesticShippingFee,
      rawValue: quotation.domesticShippingFee,
      description: "Chi phí giao nhận trong nước",
    },
    {
      key: "service",
      className: "is-service",
      label: "Phí dịch vụ và phụ phí",
      value: costSummary.serviceFee,
      rawValue: quotation.serviceFee,
      description: "Tổng các dịch vụ bổ sung",
    },
    {
      key: "tax",
      className: "is-tax",
      label: "Thuế và phí nhập khẩu",
      value: costSummary.taxAndDuty,
      rawValue: quotation.taxAndDuty,
      description: "Bao gồm VAT và thuế nhập khẩu",
    },
  ].filter((item) => hasNumberValue(item.rawValue));

  const taxBreakdownItems = [

  ].filter((item) => hasNumberValue(item.rawValue));

  const timeItems = [
    {
      key: "created",
      label: "Ngày tạo báo giá",
      value: quotation.createdAtUtc || quotation.createdAt,
      dotClass: "created",
    },
    {
      key: "expired",
      label: "Ngày hết hạn",
      value: quotation.expiredAtUtc || quotation.expiredAt,
      dotClass: hasExpired ? "expired" : "active",
    },
  ].filter((item) => hasUiValue(item.value));

  return (
    <div
      className={[
        "quotation-detail-page",
        showQuotationActions && "has-action-dock",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="quotation-navigation">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          className="quotation-back-button"
        >
          Quay lại danh sách
        </Button>

        <span>Theo dõi báo giá / Chi tiết</span>
      </div>

      <section className="quotation-hero" aria-label="Tổng quan báo giá">
        <div className="quotation-hero-main">
          <div className="quotation-hero-icon">
            <ReceiptLongOutlinedIcon />
          </div>

          <div className="quotation-hero-content">
            <div className="quotation-title-row">
              <div className="quotation-code-group">
                <span className="quotation-eyebrow">Mã vận đơn</span>

                <div className="quotation-code-row">
                  <h1 title={displayConsignmentCode}>
                    {displayConsignmentCode}
                  </h1>

                  <button
                    type="button"
                    className={[
                      "quotation-copy-code-button",
                      copiedConsignmentCode === displayConsignmentCode &&
                        "is-copied",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={displayConsignmentCode === "Chưa được cấp mã"}
                    onClick={handleCopyConsignmentCode}
                    title="Sao chép mã vận đơn"
                    aria-label={`Sao chép mã vận đơn ${displayConsignmentCode}`}
                  >
                    {copiedConsignmentCode === displayConsignmentCode ? (
                      <>
                        <CheckRoundedIcon />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <ContentCopyRoundedIcon />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <span
                className={`quotation-status-badge status-${effectiveStatusClass}`}
              >
                {getQuotationStatusLabel(effectiveStatus)}
              </span>
            </div>

            {(hasUiValue(quotation.quoteType) ||
              hasUiValue(quotation.createdAtUtc || quotation.createdAt)) && (
              <div className="quotation-meta-row">
                {hasUiValue(quotation.quoteType) && (
                  <span>
                    Loại báo giá
                    <strong>{getQuoteTypeLabel(quotation.quoteType)}</strong>
                  </span>
                )}

                {hasUiValue(quotation.createdAtUtc || quotation.createdAt) && (
                  <span>
                    Ngày tạo
                    <strong
                      title={formatDateTimeUtcTitle(
                        quotation.createdAtUtc || quotation.createdAt,
                      )}
                    >
                      {formatDateTime(
                        quotation.createdAtUtc || quotation.createdAt,
                      )}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="quotation-hero-total">
          <span>Tổng chi phí theo báo giá</span>

          <strong>{formatMoney(displayTotalCost)}</strong>

          {hasUiValue(quotation.expiredAtUtc || quotation.expiredAt) && (
            <small
              title={formatDateTimeUtcTitle(
                quotation.expiredAtUtc || quotation.expiredAt,
              )}
            >
              Có hiệu lực đến{" "}
              {formatDateTime(quotation.expiredAtUtc || quotation.expiredAt)}
            </small>
          )}
        </div>
      </section>

      {summaryCards.length > 0 && (
        <section
          className="quotation-summary-grid"
          style={{
            "--summary-count": summaryCards.length,
          }}
        >
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className={[
                "quotation-summary-card",
                card.highlighted && "highlighted",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={`quotation-summary-icon ${card.iconClass}`}>
                {card.icon}
              </div>

              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </section>
      )}
      {orderSummaryFields.length > 0 && (
        <section className="quotation-order-summary is-full-data">
          {orderSummaryFields.map((field) => (
            <div key={field.key} className={field.className || undefined}>
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
        </section>
      )}

      {quotationOrderItems.length > 0 && (
        <section
          className="quotation-card quotation-products-section"
          aria-label="Danh sách sản phẩm"
        >
          <div className="quotation-section-header">
            <div className="quotation-section-icon product">
              <Inventory2OutlinedIcon />
            </div>

            <div>
              <h2>Thông tin danh sách sản phẩm</h2>

              <p>
                Mỗi sản phẩm hiển thị nguyên một hàng ngang, đầy đủ số lượng,
                cân nặng, kích thước, giá trị và mã vận đơn.
              </p>
            </div>

            <Tag color="blue" className="quotation-products-count">
              {quotationOrderItems.length} sản phẩm
            </Tag>
          </div>

          <div className="quotation-products-grid">
            {quotationOrderItems.map((item, index) => (
              <article
                key={item.id || `product-${index + 1}`}
                className="quotation-product-card"
              >
                <header className="quotation-product-card-header">
                  <span className="quotation-product-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <small>Sản phẩm {index + 1}</small>

                    <h3>{item.productName}</h3>

                    {hasUiValue(item.productTypeLabel) && (
                      <p>{item.productTypeLabel}</p>
                    )}
                  </div>

                  {hasUiValue(item.configurationName) && (
                    <Tag color="geekblue">{item.configurationName}</Tag>
                  )}
                </header>

                <ProductInfoGrid item={item} />

                {isValidExternalUrl(item.productUrl) && (
                  <div className="quotation-product-extra">
                    <div>
                      <span>Website nguồn</span>

                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.productUrl}
                      </a>
                    </div>
                  </div>
                )}

                {item.images.length > 0 && (
                  <div className="quotation-product-images">
                    <div className="quotation-product-images-title">
                      <span>Hình ảnh sản phẩm</span>

                      <strong>{item.images.length} ảnh</strong>
                    </div>

                    <Image.PreviewGroup>
                      <div className="quotation-product-images-grid">
                        {item.images.map((image, imageIndex) => (
                          <Image
                            key={image.id}
                            src={image.url}
                            alt={`Sản phẩm ${index + 1} - ảnh ${imageIndex + 1}`}
                            className="quotation-product-image"
                            preview={{
                              mask: "Xem ảnh",
                            }}
                          />
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  </div>
                )}

                {(item.configurationName || item.configurationCode) && (
                  <div className="quotation-product-configuration">
                    <span>Cấu hình đóng gói</span>

                    <div>
                      <strong>
                        {item.configurationName ||
                          formatStatusCode(item.configurationCode)}
                      </strong>

                      {item.configurationFee !== null && (
                        <small>
                          Giá cấu hình: {formatMoney(item.configurationFee)}
                        </small>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div
        className="quotation-main-grid"
        aria-label="Chi phí và thông tin báo giá"
      >
        <section className="quotation-card quotation-cost-card">
          <div className="quotation-section-header">
            <div className="quotation-section-icon cost">
              <PaymentsOutlinedIcon />
            </div>

            <div>
              <h2>Chi tiết chi phí</h2>

              <p>Các khoản chi phí được trình bày rõ ràng và đồng nhất</p>
            </div>
          </div>

          {costOverviewItems.length > 0 && (
            <div className="quotation-base-cost-grid is-complete-api">
              {costOverviewItems.map((item) => (
                <div key={item.key} className={item.className}>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          )}

          {taxBreakdownItems.length > 0 && (
            <div className="quotation-tax-breakdown">
              {taxBreakdownItems.map((item) => (
                <div key={item.key} className={item.className || undefined}>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          )}

          <div className="quotation-cost-list">
            <div className="quotation-cost-list-heading">
              <div>
                <strong>Chi tiết phí dịch vụ</strong>
                <span>
                  {appliedCostItems.length} khoản đã tính trong phí dịch vụ
                </span>
              </div>

              <strong>{formatMoney(activeCostTotal)}</strong>
            </div>

            {appliedCostItems.length === 0 ? (
              <div className="quotation-cost-row">
                <span>
                  <span>Không có phụ phí</span>

                  <small>API hiện không có chi tiết dịch vụ bổ sung.</small>
                </span>

                <strong>{formatMoney(0)}</strong>
              </div>
            ) : (
              appliedCostItems.map((item) => (
                <div
                  key={item.key}
                  className={[
                    "quotation-cost-row",
                    !item.enabled && "quotation-cost-row--disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>
                    <span>{item.label}</span>

                    <small>
                      {item.calculationType || item.meta || "Khoản phí"}
                      {item.required ? " • Bắt buộc" : " • Tùy chọn"}
                      {item.enabled
                        ? " • Đã tính trong phí dịch vụ"
                        : " • Chưa áp dụng"}
                    </small>
                  </span>

                  <strong>{formatMoney(item.value)}</strong>
                </div>
              ))
            )}

            <div className="quotation-cost-total">
              <div>
                <span>Tổng chi phí theo báo giá</span>

                <small>
                  {formatMoney(costSummary.freight)} cước quốc tế
                  {" + "}
                  {formatMoney(costSummary.domesticShippingFee)} nội địa
                  {" + "}
                  {formatMoney(costSummary.serviceFee)} dịch vụ
                  {" + "}
                  {formatMoney(costSummary.taxAndDuty)} thuế
                </small>
              </div>

              <strong>{formatMoney(displayTotalCost)}</strong>
            </div>
          </div>
        </section>

        <section className="quotation-card">
          <div className="quotation-section-header">
            <div className="quotation-section-icon info">
              <ReceiptLongOutlinedIcon />
            </div>

            <div>
              <h2>Thông tin báo giá</h2>

              <p>Thông tin được sắp xếp theo từng nhóm dữ liệu</p>
            </div>
          </div>

          {descriptionRows.length > 0 && (
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="quotation-descriptions"
            >
              {descriptionRows.map((row) => (
                <Descriptions.Item key={row.key} label={row.label}>
                  {row.content}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </section>
      </div>

      <section className="quotation-card quotation-fees-detail-section">
        <div className="quotation-section-header">
          <div className="quotation-section-icon cost">
            <PaymentsOutlinedIcon />
          </div>

          <div>
            <h2>Danh sách phụ phí</h2>

            <p>Tên phí, cách tính, số lượng và trạng thái áp dụng</p>
          </div>
        </div>

        {(!costSummary.serviceBreakdownMatches ||
          !costSummary.totalMatches) && (
          <div className="quotation-reconciliation-notice is-warning">
            <InfoOutlinedIcon />

            <div>
              <strong>Dữ liệu chi phí chưa khớp</strong>

              <span>
                Phí dịch vụ API: {formatMoney(costSummary.serviceFee)}. Tổng chi
                tiết dịch vụ: {formatMoney(costSummary.additionalFeesTotal)}.
              </span>
            </div>
          </div>
        )}

        {reconciledCostItems.length === 0 ? (
          <div className="quotation-fee-empty">
            Báo giá hiện tại không có phụ phí.
          </div>
        ) : (
          <div className="quotation-fees-detail-grid">
            {reconciledCostItems.map((fee) => (
              <article
                key={fee.key}
                className={[
                  "quotation-fee-detail-card",
                  !fee.enabled && "is-disabled",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="quotation-fee-detail-header">
                  <div>
                    <span className="quotation-fee-code">
                      {getFeeCodeLabel(fee.code)}
                    </span>

                    <h3>{getFeeLabel(fee.raw || fee)}</h3>
                  </div>

                  <strong>{formatMoney(fee.value)}</strong>
                </div>

                <div className="quotation-fee-tags">
                  <Tag color={fee.enabled ? "green" : "default"}>
                    {fee.enabled ? "Đã tính trong phí dịch vụ" : "Chưa áp dụng"}
                  </Tag>

                  <Tag color={fee.required ? "red" : "blue"}>
                    {fee.required ? "Bắt buộc" : "Tùy chọn"}
                  </Tag>

                  <Tag color="gold">{fee.calculationType}</Tag>
                </div>

                <FeeDetailGrid fee={fee} />
              </article>
            ))}
          </div>
        )}
      </section>

      {(timeItems.length > 0 ||
        hasUiValue(
          displaySalesNote
        )) && (
        <div className="quotation-bottom-grid">
          {timeItems.length > 0 && (
            <section className="quotation-card">
              <div className="quotation-section-header">
                <div className="quotation-section-icon time">
                  <AccessTimeOutlinedIcon />
                </div>

                <div>
                  <h2>
                    Thời gian hiệu lực
                  </h2>

                  <p>
                    Thời điểm tạo và hết hạn báo giá
                  </p>
                </div>
              </div>

              <div className="quotation-time-line">
                {timeItems.map(
                  (item, index) => (
                    <React.Fragment
                      key={item.key}
                    >
                      {index > 0 && (
                        <div className="quotation-time-connector" />
                      )}

                      <div className="quotation-time-item">
                        <span
                          className={`quotation-time-dot ${item.dotClass}`}
                        />

                        <div>
                          <span>
                            {item.label}
                          </span>

                          <strong
                            title={formatDateTimeUtcTitle(
                              item.value
                            )}
                          >
                            {formatDateTime(
                              item.value
                            )}
                          </strong>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                )}
              </div>
            </section>
          )}

          {hasUiValue(
            displaySalesNote
          ) && (
            <section className="quotation-card quotation-sale-note-card">
              <div className="quotation-section-header">
                <div className="quotation-section-icon note">
                  <ReceiptLongOutlinedIcon />
                </div>

                <div>
                  <h2>
                    Ghi chú từ nhân viên Sale
                  </h2>

                  <p>
                    Thông tin bổ sung từ bộ phận báo giá
                  </p>
                </div>
              </div>

              <div className="quotation-sales-note">
                {hasUiValue(
                  saleNoteData.summary
                ) && (
                  <div className="quotation-sales-note__summary">
                    <span>
                      Nội dung từ Sale
                    </span>

                    <p>
                      {saleNoteData.summary}
                    </p>
                  </div>
                )}

                {saleNoteData
                  .requirements.length >
                  0 && (
                  <div className="quotation-sales-note__requirements">
                    {saleNoteData.requirements.map(
                      (requirement) => (
                        <div
                          key={
                            requirement.key
                          }
                          className={`quotation-sales-note__item is-${requirement.type}`}
                        >
                          <span className="quotation-sales-note__dot" />

                          <div>
                            <small>
                              {
                                requirement.label
                              }
                            </small>

                            <strong>
                              {
                                requirement.value
                              }
                            </strong>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
      {showQuotationActions && (
        <aside
          className={[
            "quotation-action-dock",
            canConfirmAndPay ? "is-payment" : "is-estimate",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Thao tác báo giá"
        >
          <div className="quotation-action-dock-icon">
            {canConfirmAndPay ? <PaymentRoundedIcon /> : <TaskAltRoundedIcon />}
          </div>

          <div className="quotation-action-dock-content">
            <span>
              {canConfirmAndPay ? "Báo giá chính thức" : "Báo giá tạm tính"}
            </span>

            <strong>
              {canConfirmAndPay
                ? "Chọn xác nhận offline hoặc thanh toán SePay"
                : "Xác nhận lựa chọn của bạn"}
            </strong>

            <small>
              {canConfirmAndPay ? (
                <>
                  Tổng báo giá: <b>{formatMoney(displayTotalCost)}</b>
                  {" · "}
                  Tiền cọc: <b>{formatMoney(depositAmount)}</b>
                </>
              ) : (
                <>
                  Tổng báo giá: <b>{formatMoney(displayTotalCost)}</b>
                </>
              )}
            </small>
          </div>

          <div className="quotation-action-dock-buttons">
            <Button
              type="button"
              variant="outlined"
              startIcon={
                quotationAction === "reject" ? (
                  <CircularProgress size={17} thickness={5} />
                ) : (
                  <CloseRoundedIcon />
                )
              }
              onClick={handleOpenRejectDialog}
              disabled={isActionLoading}
              className="quotation-reject-button"
            >
              {quotationAction === "reject" ? "Đang từ chối..." : "Từ chối"}
            </Button>

            {canAcceptEstimate && (
              <Button
                type="button"
                variant="contained"
                startIcon={
                  quotationAction === "accept" ? (
                    <CircularProgress size={17} thickness={5} />
                  ) : (
                    <TaskAltRoundedIcon />
                  )
                }
                onClick={handleAcceptQuotation}
                disabled={isActionLoading}
                className="quotation-accept-button"
              >
                {quotationAction === "accept"
                  ? "Đang xác nhận..."
                  : "Chấp nhận báo giá"}
              </Button>
            )}

            {canConfirmAndPay && (
              <Button
                type="button"
                variant="contained"
                startIcon={
                  quotationAction === "pay" ? (
                    <CircularProgress size={17} thickness={5} />
                  ) : (
                    <PaymentRoundedIcon />
                  )
                }
                onClick={handleOpenPaymentDialog}
                disabled={isActionLoading}
                className="quotation-payment-button"
              >
                {quotationAction === "pay"
                  ? "Đang xác nhận..."
                  : "Chọn cách xác nhận"}
              </Button>
            )}
          </div>
        </aside>
      )}
      <QuotationCancelDialog
        open={rejectDialogOpen}
        loading={quotationAction === "reject"}
        consignmentCode={displayConsignmentCode}
        totalAmount={displayTotalCost}
        formatMoney={formatMoney}
        onClose={handleCloseRejectDialog}
        onConfirm={handleConfirmRejectQuotation}
      />

      <QuotationPaymentConfirmDialog
        open={paymentDialogOpen}
        loading={quotationAction === "pay"}
        consignmentCode={displayConsignmentCode}
        totalAmount={displayTotalCost}
        depositRate={depositRate}
        formatMoney={formatMoney}
        onClose={handleClosePaymentDialog}
        onConfirm={handleConfirmAndPay}
      />
    </div>
  );
};

export default QuotationDetail;
