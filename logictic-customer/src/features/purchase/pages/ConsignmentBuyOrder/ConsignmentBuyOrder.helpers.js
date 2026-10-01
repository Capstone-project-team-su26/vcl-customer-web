/*
 * Upload ảnh THẬT: POST /api/uploads/images (UploadsController) → { message, urls }.
 * Trước đây trỏ bản sao uploadImage.mock.js nên ảnh không lên server và đơn lưu URL
 * ảnh mẫu ngẫu nhiên (picsum) — khách up một ảnh, chi tiết đơn hiện ảnh khác.
 */
import { uploadImages } from "@shared/api/uploadImage";

import {
  getBrowserTimeInfo,
  getSyncedNowUtcIso,
} from "@shared/utils/timeUtc";

import { validateIntegerInRange } from "@shared/utils/integerInput";

import {
  GENERAL_NOTE_SEPARATOR,
  GENERAL_NOTE_SERVICE_SENTENCES,
  MAX_IMAGE_SIZE,
  PURCHASE_TEXT_LIMITS,
} from "./ConsignmentBuyOrder.constants";

/*
 * Nhóm hàm thuần (không đụng tới state/props/hook) của trang mua hộ.
 * Đặt riêng để component chỉ tập trung vào luồng dữ liệu và giao diện,
 * đồng thời các hàm chuẩn hóa dữ liệu API có thể đọc/soát lại độc lập.
 */

export const createUniqueId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createEmptyItem = () => ({
  id: createUniqueId(),
  productLink: "",
  sourceWebsite: "",
  productType: "",
  productName: "",
  quantity: "",
  attributes: "",
  note: "",
  images: [],

  // Giữ field image để tương thích component xác nhận/dịch vụ cũ.
  image: null,
});

export const createEmptyFormErrors = () => ({
  route: "",
  shippingOption: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  generalNote: "",
  /* Lỗi cấp danh sách (vượt số dòng Admin cho phép) — báo bằng toast, không gắn ô nào. */
  items: "",
});

export const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

export const getApiErrorMessage = (error, fallbackMessage = "Đã xảy ra lỗi.") => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    return Object.entries(validationErrors)
      .map(([field, value]) => {
        const messages = Array.isArray(value)
          ? value.join(", ")
          : String(value);

        return `${field}: ${messages}`;
      })
      .join(" | ");
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

export const getFieldClassName = (baseClassName, errorMessage) =>
  [baseClassName, errorMessage && "purchase-buy-input-has-error"]
    .filter(Boolean)
    .join(" ");

/*
 * `limits` dưới đây là nhánh `purchase` của giới hạn Admin cấu hình
 * ({ maxItems, maxItemQuantity }; null = không giới hạn / chưa tải được → không chặn,
 * backend vẫn kiểm và báo 400 nêu đúng giới hạn).
 */
const hasPurchaseLimit = (value) => Number.isFinite(value) && value > 0;

/** Câu báo lỗi dùng chung cho ô Số lượng (gõ sai, dán sai, bấm gửi). */
export const getPurchaseQuantityRangeMessage = (limits) =>
  hasPurchaseLimit(limits?.maxItemQuantity)
    ? `Số lượng từ 1 đến ${limits.maxItemQuantity}.`
    : "Số lượng phải là số nguyên từ 1 trở lên.";

/**
 * Kiểm ô Số lượng của MỘT sản phẩm — màn hình gọi lúc đang gõ, validateItem gọi lại lúc
 * bấm "Tiếp tục"/"Gửi", nên hai lúc luôn báo cùng một câu.
 */
export const validatePurchaseItemQuantity = (value, limits) =>
  validateIntegerInRange(value, {
    min: 1,
    max: hasPurchaseLimit(limits?.maxItemQuantity) ? limits.maxItemQuantity : undefined,
    emptyMessage: "Vui lòng nhập số lượng.",
    rangeMessage: getPurchaseQuantityRangeMessage(limits),
  });

/** "" nếu `value` không vượt `max` ký tự (tính sau khi trim), ngược lại là câu báo lỗi. */
const validateMaxLength = (value, max, label) =>
  String(value ?? "").trim().length > max
    ? `${label} tối đa ${max} ký tự.`
    : "";

/** Câu giải thích khi yêu cầu đã đủ số dòng sản phẩm tối đa ("" nếu không giới hạn). */
export const getPurchaseItemsLimitMessage = (limits) =>
  hasPurchaseLimit(limits?.maxItems)
    ? `Mỗi yêu cầu mua hộ tối đa ${limits.maxItems} sản phẩm. Cần mua thêm, vui lòng tạo yêu cầu mới.`
    : "";

/** Đã đủ số dòng sản phẩm Admin cho phép chưa. */
export const isPurchaseItemLimitReached = (count, limits) =>
  hasPurchaseLimit(limits?.maxItems) && count >= limits.maxItems;

/** Câu của các dịch vụ đang tick, đúng thứ tự backend ghép vào ghi chú chung. */
const getSelectedServiceSentences = (services) =>
  GENERAL_NOTE_SERVICE_SENTENCES.filter(({ key }) => Boolean(services?.[key])).map(
    ({ sentence }) => sentence,
  );

/**
 * Ghi chú chung đúng như backend sẽ lưu (BuildGeneralNote): ghi chú khách (đã trim) nối
 * bằng ". " với câu của từng dịch vụ đang tick; phần rỗng bị bỏ.
 */
export const buildPurchaseGeneralNote = (generalNote, services) =>
  [String(generalNote ?? "").trim(), ...getSelectedServiceSentences(services)]
    .filter(Boolean)
    .join(GENERAL_NOTE_SEPARATOR);

/**
 * Số ký tự tối đa khách được gõ vào "Ghi chú đơn hàng" với các dịch vụ đang tick: mỗi dịch
 * vụ chiếm câu của nó + ". " trong tổng PURCHASE_TEXT_LIMITS.generalNoteTotal.
 */
export const getGeneralNoteMaxLength = (services) =>
  Math.max(
    0,
    getSelectedServiceSentences(services).reduce(
      (remaining, sentence) =>
        remaining - sentence.length - GENERAL_NOTE_SEPARATOR.length,
      PURCHASE_TEXT_LIMITS.generalNoteTotal,
    ),
  );

/** "" nếu ghi chú chung sau khi ghép dịch vụ vẫn vừa giới hạn, ngược lại là câu báo lỗi. */
export const validatePurchaseGeneralNote = (generalNote, services) => {
  if (
    buildPurchaseGeneralNote(generalNote, services).length <=
    PURCHASE_TEXT_LIMITS.generalNoteTotal
  ) {
    return "";
  }

  const serviceCount = getSelectedServiceSentences(services).length;

  return serviceCount > 0
    ? `Ghi chú đơn hàng tối đa ${getGeneralNoteMaxLength(services)} ký tự khi chọn ${serviceCount} dịch vụ bổ sung (hệ thống tự ghi thêm tên dịch vụ vào ghi chú). Vui lòng rút gọn ghi chú.`
    : `Ghi chú đơn hàng tối đa ${PURCHASE_TEXT_LIMITS.generalNoteTotal} ký tự.`;
};

export const findArrayFromResult = (result, extraKeys = []) => {
  const candidates = [
    result,
    result?.data,
    result?.items,
    result?.results,
    result?.data?.items,
    result?.data?.results,
    ...extraKeys.flatMap((key) => [result?.[key], result?.data?.[key]]),
  ];

  return candidates.find(Array.isArray) || [];
};

export const normalizeOptionList = (result, extraKeys = []) =>
  findArrayFromResult(result, extraKeys)
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = String(item).trim();

        return {
          value,
          label: value,
        };
      }

      const value = String(
        item?.value ??
          item?.code ??
          item?.route ??
          item?.shippingOption ??
          item?.productType ??
          item?.routeId ??
          item?.shippingOptionId ??
          item?.productTypeId ??
          item?.id ??
          "",
      ).trim();

      const label = String(
        item?.label ??
          item?.name ??
          item?.displayName ??
          item?.routeName ??
          item?.shippingOptionName ??
          item?.productTypeName ??
          item?.description ??
          value,
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter((item) => item.value && item.label);

export const normalizeCode = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

export const getShippingOptionLabel = (value, label) => {
  const normalizedValues = [
    normalizeCode(value),
    normalizeCode(label),
  ];

  if (
    normalizedValues.some(
      (item) =>
        item === "EXPRESS" ||
        item === "HOA_TOC" ||
        item.includes("EXPRESS"),
    )
  ) {
    return "Hỏa tốc";
  }

  if (
    normalizedValues.some(
      (item) =>
        item === "STANDARD" ||
        item === "TIEU_CHUAN" ||
        item.includes("STANDARD"),
    )
  ) {
    return "Tiêu chuẩn";
  }

  if (
    normalizedValues.some(
      (item) =>
        item === "ECONOMY" ||
        item === "TIET_KIEM" ||
        item.includes("ECONOMY"),
    )
  ) {
    return "Tiết kiệm";
  }

  return String(label ?? "").trim() || String(value ?? "").trim() || "-";
};

export const normalizeShippingOptionList = (result) =>
  normalizeOptionList(result, ["shippingOptions"]).map((option) => ({
    ...option,
    label: getShippingOptionLabel(option.value, option.label),
  }));

export const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
};

export const normalizeDeliveryAddress = (item, index = 0) => {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    const address = item.trim();

    return address
      ? {
          id: `address-${index}`,
          apiId: "",
          address,
          fullAddress: address,
          detailAddress: "",
          provinceCode: "",
          provinceName: "",
          districtCode: "",
          districtName: "",
          wardCode: "",
          wardName: "",
          isDefault: false,
        }
      : null;
  }

  const address = String(
    item.address ||
      item.receiverAddress ||
      item.fullAddress ||
      item.deliveryAddress ||
      "",
  ).trim();

  if (!address) {
    return null;
  }

  const apiId = String(
    item.deliveryAddressId || item.addressId || item.id || "",
  ).trim();

  return {
    id: apiId || `address-${index}`,
    apiId,
    address,
    fullAddress: item.fullAddress || address,
    detailAddress: item.detailAddress || "",
    provinceCode: item.provinceCode || item.province_code || "",
    provinceName: item.provinceName || item.province_name || "",
    districtCode: item.districtCode || item.district_code || "",
    districtName: item.districtName || item.district_name || "",
    wardCode: item.wardCode || item.ward_code || "",
    wardName: item.wardName || item.ward_name || "",
    isDefault: Boolean(item.isDefault),
  };
};

export const normalizeDeliveryAddressList = (result) =>
  findArrayFromResult(result, ["addresses", "deliveryAddresses"])
    .map(normalizeDeliveryAddress)
    .filter(Boolean);

export const getItemImages = (item) => {
  if (Array.isArray(item?.images)) {
    return item.images.filter(Boolean);
  }

  return item?.image ? [item.image] : [];
};

export const isUploadedImageUrl = (value) => {
  const text = String(value ?? "").trim();

  return (
    /^https?:\/\//i.test(text) ||
    /^\//.test(text) ||
    /^data:image\//i.test(text)
  );
};

/*
 * UploadImage.js chỉ cần export uploadImages().
 * Helper này đặt tại trang mua hộ để đọc được nhiều kiểu response API:
 * - ["url-1", "url-2"]
 * - { urls: [] }
 * - { imageUrls: [] }
 * - { files: [{ url: "..." }] }
 * - { data: ... }
 * - text/plain chứa JSON
 */
export const extractUploadedImageUrls = (result) => {
  const collectedUrls = [];
  const visitedObjects = new Set();

  const appendUrl = (value) => {
    const url = String(value ?? "").trim();

    if (
      isUploadedImageUrl(url) &&
      !collectedUrls.includes(url)
    ) {
      collectedUrls.push(url);
    }
  };

  const walk = (value, depth = 0) => {
    if (
      value === null ||
      value === undefined ||
      depth > 8
    ) {
      return;
    }

    if (typeof value === "string") {
      const text = value.trim();

      if (
        (text.startsWith("[") && text.endsWith("]")) ||
        (text.startsWith("{") && text.endsWith("}"))
      ) {
        try {
          walk(JSON.parse(text), depth + 1);
          return;
        } catch {
          // Response không phải JSON, tiếp tục kiểm tra URL trực tiếp.
        }
      }

      appendUrl(text);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        walk(item, depth + 1);
      });

      return;
    }

    if (
      typeof value !== "object" ||
      visitedObjects.has(value)
    ) {
      return;
    }

    visitedObjects.add(value);

    [
      "url",
      "imageUrl",
      "fileUrl",
      "secureUrl",
      "path",
      "location",
    ].forEach((key) => {
      appendUrl(value?.[key]);
    });

    [
      "urls",
      "imageUrls",
      "fileUrls",
      "files",
      "images",
      "items",
      "results",
      "data",
    ].forEach((key) => {
      walk(value?.[key], depth + 1);
    });
  };

  walk(result);

  return collectedUrls;
};

export const getFileIdentity = (file) =>
  [file?.name, file?.size, file?.lastModified]
    .map((value) => String(value ?? ""))
    .join("::");

/*
 * Khớp UploadsController (backend): chỉ nhận image/jpeg, image/png, image/webp; mỗi ảnh
 * ≤ 5MB, file rỗng bị 400. Chặn ngay lúc chọn ảnh để khách không phải chờ tới lúc gửi đơn.
 */
const ACCEPTED_PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/*
 * Backend nối các URL ảnh của một sản phẩm bằng "|" và trả 400 nếu chuỗi vượt
 * PURCHASE_TEXT_LIMITS.imageUrls (1000). Ảnh Cloudinary ~110 ký tự nên 5 ảnh/sản phẩm
 * (~560 ký tự) vẫn dư, nhưng vẫn chặn trước phòng URL ảnh dài bất thường.
 */

export const validateProductImageFile = (file) => {
  if (!(file instanceof File)) {
    throw new Error("File ảnh không hợp lệ.");
  }

  if (!ACCEPTED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Ảnh "${file.name}" không phải JPG, PNG hoặc WEBP.`);
  }

  if (!file.size) {
    throw new Error(`Ảnh "${file.name}" rỗng, vui lòng chọn ảnh khác.`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Ảnh "${file.name}" vượt quá 5MB.`);
  }

  return file;
};

/*
 * URL đã upload của từng File (theo đúng object File khách chọn). Gửi đơn lỗi ở sản phẩm
 * thứ hai thì lần bấm lại không upload lại ảnh của sản phẩm đầu (tránh ảnh mồ côi trên
 * Cloudinary); bỏ ảnh / chọn ảnh khác là File khác nên vẫn upload mới.
 */
const uploadedUrlByFile = new WeakMap();

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(String(value ?? "").trim());

/*
 * Lỗi upload → câu tiếng Việt. 400 của UploadsController đã có message tiếng Việt nên giữ
 * nguyên; 413 hoặc trang lỗi HTML của proxy thì không đưa nguyên HTML lên toast.
 */
const toUploadError = (error, file) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const isHtmlBody = typeof data === "string" && /<html|<!doctype/i.test(data);

  if (status === 413 || isHtmlBody) {
    const friendly = new Error(
      status === 413
        ? `Ảnh "${file.name}" quá lớn để tải lên máy chủ. Vui lòng chọn ảnh nhỏ hơn.`
        : `Tải ảnh "${file.name}" lên máy chủ thất bại (lỗi ${status || "mạng"}). Vui lòng thử lại.`,
    );

    friendly.cause = error;

    return friendly;
  }

  if (!error?.response && error?.code !== "ERR_CANCELED" && error?.isAxiosError) {
    const friendly = new Error(
      `Không kết nối được máy chủ khi tải ảnh "${file.name}". Vui lòng thử lại.`,
    );

    friendly.cause = error;

    return friendly;
  }

  return error;
};

/**
 * Upload ảnh của MỘT sản phẩm, trả URL server theo đúng thứ tự file.
 * Bất kỳ ảnh nào lỗi / thiếu URL → ném lỗi tiếng Việt, trang không gửi đơn.
 */
export const uploadProductImages = async (
  imageFiles,
  onUploadProgress,
) => {
  const files = imageFiles.map(validateProductImageFile);
  const pendingFiles = files.filter((file) => !uploadedUrlByFile.has(file));
  const reportProgress = (percent) => {
    if (typeof onUploadProgress === "function") {
      onUploadProgress(Math.min(100, Math.max(0, Math.round(percent))));
    }
  };

  /*
   * Mỗi request MỘT ảnh (≤ 5MB), giống màn ký gửi đang chạy ổn trên production: gộp 5 ảnh
   * × 5MB vào một request dễ vượt giới hạn body của proxy/Kestrel (413).
   */
  for (let index = 0; index < pendingFiles.length; index += 1) {
    const file = pendingFiles[index];
    let uploadResult;

    try {
      uploadResult = await uploadImages([file], (percent) =>
        reportProgress(((index + percent / 100) / pendingFiles.length) * 100),
      );
    } catch (error) {
      throw toUploadError(error, file);
    }

    const [uploadedUrl] = extractUploadedImageUrls(uploadResult).filter(isAbsoluteHttpUrl);

    if (!uploadedUrl) {
      throw new Error(
        `Máy chủ không trả về đường dẫn cho ảnh "${file.name}". Vui lòng thử lại.`,
      );
    }

    uploadedUrlByFile.set(file, uploadedUrl);
  }

  reportProgress(100);

  const imageUrls = files.map((file) => uploadedUrlByFile.get(file));

  if (imageUrls.join("|").length > PURCHASE_TEXT_LIMITS.imageUrls) {
    throw new Error(
      "Đường dẫn ảnh của một sản phẩm quá dài để lưu. Vui lòng bớt số ảnh của sản phẩm đó.",
    );
  }

  return imageUrls;
};

export const isValidHttpUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());

    // Link sản phẩm luôn là tên miền thật (có dấu chấm): "https://abc" hay "http://" không qua.
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      /^[^.]+(\.[^.]+)+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
};

export const getSourceWebsiteFromLink = (value) => {
  try {
    const url = new URL(String(value || "").trim());

    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const getAddressOptionName = (options, value) => {
  return (
    options.find((option) => String(option.value) === String(value))?.label ||
    ""
  );
};

export const getClientTimePayload = () => {
  const browserTime = getBrowserTimeInfo();
  const utcNow = getSyncedNowUtcIso();

  return {
    submittedAtUtc: utcNow,
    clientSubmittedAtUtc: utcNow,
    clientTimeZone: browserTime.timeZone,
    clientUtcOffset: browserTime.utcOffsetText,
    clientUtcOffsetMinutes: browserTime.utcOffsetMinutes,
  };
};

export const validateItem = (item, limits) => {
  const errors = {};

  if (!item.productLink.trim()) {
    errors.productLink = "Vui lòng nhập liên kết sản phẩm.";
  } else if (!isValidHttpUrl(item.productLink)) {
    errors.productLink =
      "Liên kết sản phẩm không hợp lệ — cần là địa chỉ web đầy đủ, bắt đầu bằng http:// hoặc https://.";
  } else {
    errors.productLink = validateMaxLength(
      item.productLink,
      PURCHASE_TEXT_LIMITS.productLink,
      "Liên kết sản phẩm",
    );
  }

  if (!item.sourceWebsite.trim()) {
    errors.sourceWebsite = "Vui lòng nhập website nguồn.";
  } else {
    errors.sourceWebsite = validateMaxLength(
      item.sourceWebsite,
      PURCHASE_TEXT_LIMITS.sourceWebsite,
      "Website nguồn",
    );
  }

  if (!item.productType) {
    errors.productType = "Vui lòng chọn loại sản phẩm.";
  } else {
    errors.productType = validateMaxLength(
      item.productType,
      PURCHASE_TEXT_LIMITS.productType,
      "Loại sản phẩm",
    );
  }

  if (!item.productName.trim()) {
    errors.productName = "Vui lòng nhập tên sản phẩm.";
  } else {
    errors.productName = validateMaxLength(
      item.productName,
      PURCHASE_TEXT_LIMITS.productName,
      "Tên sản phẩm",
    );
  }

  errors.quantity = validatePurchaseItemQuantity(item.quantity, limits);

  if (!item.attributes.trim()) {
    errors.attributes = "Vui lòng nhập thuộc tính sản phẩm.";
  } else {
    errors.attributes = validateMaxLength(
      item.attributes,
      PURCHASE_TEXT_LIMITS.attributes,
      "Thuộc tính sản phẩm",
    );
  }

  errors.note = validateMaxLength(
    item.note,
    PURCHASE_TEXT_LIMITS.note,
    "Ghi chú sản phẩm",
  );

  if (!getItemImages(item).length) {
    errors.image = "Vui lòng tải ít nhất một ảnh sản phẩm.";
  }

  return errors;
};

export const validateBuyOrderForm = ({ form, items, limits }) => {
  const formErrors = createEmptyFormErrors();

  if (!form.route) {
    formErrors.route = "Vui lòng chọn tuyến hàng.";
  }

  if (!form.shippingOption) {
    formErrors.shippingOption =
      "Vui lòng chọn phương thức vận chuyển.";
  }

  if (!form.receiverName.trim()) {
    formErrors.receiverName = "Vui lòng nhập tên người nhận.";
  } else if (form.receiverName.trim().length < 2) {
    formErrors.receiverName = "Tên người nhận phải có ít nhất 2 ký tự.";
  } else {
    formErrors.receiverName = validateMaxLength(
      form.receiverName,
      PURCHASE_TEXT_LIMITS.receiverName,
      "Tên người nhận",
    );
  }

  if (!form.receiverPhone.trim()) {
    formErrors.receiverPhone = "Vui lòng nhập số điện thoại.";
  } else if (!/^0\d{9}$/.test(form.receiverPhone.trim())) {
    formErrors.receiverPhone =
      "Số điện thoại phải có 10 số và bắt đầu bằng số 0.";
  } else {
    formErrors.receiverPhone = validateMaxLength(
      form.receiverPhone,
      PURCHASE_TEXT_LIMITS.receiverPhone,
      "Số điện thoại",
    );
  }

  if (!form.selectedDeliveryAddress.trim()) {
    formErrors.selectedDeliveryAddress =
      "Vui lòng thêm và chọn địa chỉ nhận hàng.";
  } else {
    formErrors.selectedDeliveryAddress = validateMaxLength(
      form.selectedDeliveryAddress,
      PURCHASE_TEXT_LIMITS.receiverAddress,
      "Địa chỉ nhận hàng",
    );
  }

  formErrors.generalNote = validatePurchaseGeneralNote(
    form.generalNote,
    form.optionalServices,
  );

  formErrors.items =
    hasPurchaseLimit(limits?.maxItems) && items.length > limits.maxItems
      ? getPurchaseItemsLimitMessage(limits)
      : "";

  const itemErrors = Object.fromEntries(
    items.map((item) => [item.id, validateItem(item, limits)]),
  );

  const isValid =
    !Object.values(formErrors).some(Boolean) &&
    Object.values(itemErrors).every(
      (errors) => !Object.values(errors).some(Boolean),
    );

  return {
    isValid,
    formErrors,
    itemErrors,
  };
};
