/* =========================================================
   PURE HELPERS
   =========================================================

   Hàm ở đây chỉ dựa vào tham số truyền vào cùng các hằng số
   và import cùng module, không đọc state/props/ref của
   component, nên tách khỏi QuotationDetail.jsx để file
   component chỉ còn phần dữ liệu và giao diện.
   ========================================================= */

import axios from "@shared/api/requestCancel";
import { API_BASE_URL } from "@shared/api/httpClient";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
  getSyncedNowDate,
} from "@shared/utils/timeUtc";

import { getPaymentCheckoutUrl } from "@features/purchase/api/purchaseRequestApi";

import {
  QUOTE_TYPE_LABELS,
  CONSIGNMENT_TYPE_LABELS,
  FEE_CODE_LABELS,
  FEE_TYPE_LABELS,
  CALCULATION_TYPE_LABELS,
  BASE_COST_FEE_CODES,
  SALES_NOTE_SERVICE_LABELS,
  EMPTY_UI_TEXT_VALUES,
} from "./QuotationDetail.constants";

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


const resolveItemConfigurationFee = (item, configuration) => {
  if (item?.configurationFee !== undefined && item?.configurationFee !== null) {
    const numericFee = Number(item.configurationFee);
    if (Number.isFinite(numericFee)) return numericFee;
  }

  if (configuration?.estimatedFee !== undefined && configuration?.estimatedFee !== null) {
    const numericEst = Number(configuration.estimatedFee);
    if (Number.isFinite(numericEst)) return numericEst;
  }

  const baseFee = toFiniteNumberOrNull(
    configuration?.packageFee ?? configuration?.fee ?? configuration?.price
  ) ?? 0;

  const configCode = String(
    item?.configurationCode || configuration?.configCode || configuration?.code || ""
  ).trim().toUpperCase();

  if (configCode === "CUSTOM") {
    const itemLength = toFiniteNumberOrNull(item?.length) ?? 0;
    const itemWidth = toFiniteNumberOrNull(item?.width) ?? 0;
    const itemHeight = toFiniteNumberOrNull(item?.height) ?? 0;
    const itemVolume =
      toFiniteNumberOrNull(item?.totalVolume) ??
      toFiniteNumberOrNull(item?.volume) ??
      (itemLength * itemWidth * itemHeight);

    const configLength = toFiniteNumberOrNull(configuration?.length);
    const configWidth = toFiniteNumberOrNull(configuration?.width);
    const configHeight = toFiniteNumberOrNull(configuration?.height);

    const hasConfigDimensions =
      configLength &&
      configWidth &&
      configHeight &&
      configLength < 9999 &&
      configWidth < 9999 &&
      configHeight < 9999;

    const configVolume = hasConfigDimensions
      ? configLength * configWidth * configHeight
      : 1000;

    const volumeUnits =
      itemVolume > 0 && configVolume > 0 ? itemVolume / configVolume : 0;

    if (volumeUnits > 0 && baseFee > 0) {
      return volumeUnits * baseFee;
    }
  }

  return baseFee;
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

  if (text.includes("\n")) {
    return text
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [text];
};

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

  // Volumetric weight hidden as per request

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

    quotationCreatedAtUtc:
      normalizeApiTimeToUtc(
        quotation.quotationCreatedAt ||
        quotation.createdAt ||
        quotation.updatedAt
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
     * Dòng WOOD_CRATE cũ (nếu báo giá còn trả về) là khoản tính cho toàn đơn.
     * Phí thùng gỗ hiện tính theo cỡ từng kiện (dòng PACKING_FEE).
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

/**
 * Nhóm phí theo kiện: dòng có orderItemId là phí thùng + dịch vụ của riêng kiện đó
 * (itemName là tên kiện); dòng không có là phí cả đơn. Báo giá cũ không có dòng nào
 * gắn kiện thì trả một nhóm duy nhất để màn hình hiện như trước.
 *
 * @returns {{ key: string, title: string|null, items: object[], subtotal: number }[]}
 */
const groupCostItemsByPackage = (costItems = []) => {
  const hasPackageFees = costItems.some((item) => item?.raw?.orderItemId);

  if (!hasPackageFees) {
    return [
      {
        key: "all",
        title: null,
        items: costItems,
        subtotal: getActiveCostTotal(costItems),
      },
    ];
  }

  const orderLevel = [];
  const byPackage = new Map();

  costItems.forEach((item) => {
    const orderItemId = item?.raw?.orderItemId;

    if (!orderItemId) {
      orderLevel.push(item);
      return;
    }

    if (!byPackage.has(orderItemId)) {
      byPackage.set(orderItemId, {
        key: orderItemId,
        title: "",
        items: [],
      });
    }

    const group = byPackage.get(orderItemId);
    group.title = group.title || String(item?.raw?.itemName || "").trim();
    group.items.push(item);
  });

  const packageGroups = Array.from(byPackage.values()).map((group, index) => ({
    ...group,
    title: `Kiện ${index + 1}${group.title ? ` · ${group.title}` : ""}`,
    subtotal: getActiveCostTotal(group.items),
  }));

  return [
    ...packageGroups,
    ...(orderLevel.length
      ? [
          {
            key: "order",
            title: "Phí cả đơn",
            items: orderLevel,
            subtotal: getActiveCostTotal(orderLevel),
          },
        ]
      : []),
  ];
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
 * Hàm này luôn chuyển kết quả thành URL tuyệt đối của API backend
 * (API_BASE_URL của httpClient), tránh điều hướng nhầm sang domain frontend.
 * Màn ký gửi hiện chỉ dùng payOS/chuyển khoản; hàm giữ lại cho tương thích.
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
    /* URL tương đối: ghép vào đúng base URL API mà httpClient đang dùng. */
    return new URL(rawCheckoutUrl, `${API_BASE_URL}/`).toString();
  }
};

export {
  normalizeStatus,
  formatStatusCode,
  resolveItemConfigurationFee,
  normalizeStatusOptions,
  getQuoteTypeLabel,
  getConsignmentTypeLabel,
  getStatusClassName,
  getBooleanLabel,
  translateSalesNoteService,
  parseSalesNote,
  toFiniteNumberOrNull,
  calculateItemVolume,
  splitItemNames,
  isPlaceholderText,
  normalizeOptionalText,
  isNonEmptyValue,
  getFirstValue,
  extractObjectData,
  normalizeObjectLabel,
  isGuidLike,
  normalizeLookupKey,
  hasUiValue,
  isValidExternalUrl,
  hasNumberValue,
  extractProductTypeItems,
  normalizeProductTypeOptions,
  buildProductTypeLabelMap,
  resolveProductTypeLabel,
  buildPackageConfigurationMap,
  normalizeItemImages,
  getItemArrayCandidates,
  normalizeOrderItem,
  getItemIdentity,
  mergeNormalizedItems,
  getQuotationOrderItems,
  buildOrderDisplayData,
  formatItemDimensions,
  hasCompleteDimensions,
  getVisibleProductFields,
  getVisibleFeeFields,
  normalizeApiTimeToUtc,
  normalizeAdditionalFeeTime,
  normalizeQuotationTime,
  formatDateTime,
  formatDateTimeUtcTitle,
  isExpiredUtc,
  formatMoney,
  formatNumber,
  formatWeightKg,
  formatVolumeCm3,
  formatFeeQuantity,
  formatFeePercent,
  copyTextToClipboard,
  getFeeCodeLabel,
  translateFeeLabelToVietnamese,
  getFeeLabel,
  getFeeTypeLabel,
  getFeeCalculationType,
  getFeeCalculationTypeLabel,
  getFeeAmount,
  isFeeEnabled,
  isFeeRequired,
  getFeeUnitDisplay,
  getAdditionalFees,
  normalizeFeeToCostItem,
  getCostItems,
  groupCostItemsByPackage,
  getActiveCostItems,
  getActiveCostTotal,
  getQuotationCostSummary,
  getConsignmentCode,
  extractQuotationData,
  getApiErrorMessage,
  isCanceledRequest,
  getActionResponseMessage,
  buildPaymentRedirectUrl,
  resolveSePayCheckoutUrl,
};
