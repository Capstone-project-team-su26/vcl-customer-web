/* =========================================================
   attachmentApi.js — giấy tờ đính kèm (API THẬT, AttachmentsController).

   - uploadAttachmentApi   -> POST /api/attachments (multipart/form-data:
                              file, entityType, entityId, documentType, note)
                              → { message, data: AttachmentDto }
   - getAttachmentsApi     -> GET  /api/attachments?entityType=&entityId=
                              → { message, data: AttachmentDto[] } (cũ → mới)
   - downloadAttachmentApi -> GET  /api/attachments/{id}/download → file nhị phân

   Quyền của KHÁCH (AttachmentService.EnsureCanAccessAsync):
   - entityType ORDER (đơn của mình): xem mọi giấy tờ, chỉ tải lên được PERMIT.
   - entityType INCIDENT (sự cố của đơn mình): xem ảnh, chỉ gửi được INCIDENT_PHOTO.
   - Loại khác → 403 "Chỉ nhân viên mới xem được giấy tờ...".

   Vì sao file ở shared/: đây là hạ tầng tải file dùng chung cho nhiều feature
   (giấy phép của đơn, ảnh sự cố), giống uploadImage.js — không chứa quy tắc
   nghiệp vụ nào ngoài giới hạn định dạng/dung lượng của server.

   File nằm riêng tư trên server, `downloadUrl` là đường dẫn TƯƠNG ĐỐI và bắt
   buộc có Authorization → luôn tải Blob qua httpClient (interceptor gắn token),
   không bao giờ đặt <a href> / <img src> trỏ thẳng API.
   ========================================================= */

import httpClient, {
  createHttpClient,
  isCanceledRequest,
} from "@shared/api/httpClient";

/* Upload có thể là ảnh chụp điện thoại vài MB — cho timeout dài như uploadImage.
   Export để tools/verify-api.mjs gắn adapter giả (giống uploadImage.uploadAxios). */
export const attachmentUploadClient = createHttpClient({ timeout: 120_000 });
const uploadClient = attachmentUploadClient;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** entityType server nhận (AttachmentEntityTypes). Khách chỉ dùng ORDER và INCIDENT. */
export const ATTACHMENT_ENTITY_TYPES = Object.freeze({
  ORDER: "ORDER",
  INCIDENT: "INCIDENT",
});

/** documentType khách được gửi (AttachmentDocumentTypes). */
export const ATTACHMENT_DOCUMENT_TYPES = Object.freeze({
  PERMIT: "PERMIT",
  INCIDENT_PHOTO: "INCIDENT_PHOTO",
});

/** Nhãn tiếng Việt cho mọi loại giấy tờ khách có thể THẤY (nhân viên up vào đơn / sự cố). */
export const ATTACHMENT_DOCUMENT_TYPE_LABELS = Object.freeze({
  PERMIT: "Giấy phép hàng hạn chế",
  INCIDENT_PHOTO: "Ảnh hiện trạng",
  COMPENSATION_RECEIPT: "Chứng từ chi bồi thường",
  DELIVERY_PROOF: "Ảnh ký nhận",
  OTHER: "Giấy tờ khác",
});

/* Khớp AttachmentService.AllowedContentTypes / MaxFileSize — kiểm trước khi gửi để
   khách biết ngay, không phải chờ tải hết 10 MB lên mới bị 400. */
export const ATTACHMENT_ACCEPTED_MIME_TYPES = Object.freeze([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ATTACHMENT_ACCEPT_ATTRIBUTE =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export const ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const getSignal = (options = {}) =>
  typeof options?.addEventListener === "function" ? options : options?.signal;

const unwrapData = (body) =>
  body && typeof body === "object" && !Array.isArray(body) && "data" in body
    ? body.data
    : body;

const logApiError = (label, error) => {
  if (!isCanceledRequest(error)) {
    console.error(label, error?.response?.data || error?.message);
  }
};

const requireGuid = (value, message) => {
  const id = String(value ?? "").trim();

  if (!UUID_PATTERN.test(id)) {
    throw new Error(message);
  }

  return id;
};

/* Trình duyệt đôi khi để trống type (file kéo từ app khác) — suy ra từ đuôi file
   để server (xét theo Content-Type) không từ chối oan một file PDF hợp lệ. */
const guessMimeType = (file) => {
  const type = String(file?.type || "").trim().toLowerCase();

  if (type) {
    return type === "image/jpg" ? "image/jpeg" : type;
  }

  const name = String(file?.name || "").toLowerCase();

  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";

  return type;
};

/**
 * Kiểm file trước khi tải lên. Trả câu lỗi (giống câu server) hoặc null nếu hợp lệ.
 * @param {File} file
 */
export const validateAttachmentFile = (file) => {
  if (!file || !file.size) {
    return "Chưa chọn file để tải lên.";
  }

  if (!ATTACHMENT_ACCEPTED_MIME_TYPES.includes(guessMimeType(file))) {
    return "Chỉ nhận file PDF, JPG, PNG hoặc WEBP.";
  }

  if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
    return "File vượt quá 10 MB.";
  }

  return null;
};

/**
 * Tải một giấy tờ lên.
 *
 * @param {{ file: File, entityType: string, entityId: string, documentType: string, note?: string }} payload
 * @param {{ signal?: AbortSignal, onUploadProgress?: (percent: number) => void }} [options]
 * @returns {Promise<object>} AttachmentDto (đã bóc envelope) kèm `message` của server
 */
export const uploadAttachmentApi = async (
  { file, entityType, entityId, documentType, note } = {},
  options = {},
) => {
  const invalid = validateAttachmentFile(file);

  if (invalid) {
    throw new Error(invalid);
  }

  const id = requireGuid(entityId, "Không xác định được đối tượng cần đính kèm.");
  const mimeType = guessMimeType(file);

  /* Server xét Content-Type của phần file: bọc lại khi trình duyệt để trống type. */
  const filePart =
    file.type === mimeType
      ? file
      : new File([file], file.name || "tai-lieu", { type: mimeType });

  const form = new FormData();
  form.append("file", filePart, filePart.name);
  form.append("entityType", String(entityType || "").trim().toUpperCase());
  form.append("entityId", id);
  form.append("documentType", String(documentType || "").trim().toUpperCase());

  if (note && String(note).trim()) {
    form.append("note", String(note).trim());
  }

  try {
    const response = await uploadClient.post("/api/attachments", form, {
      signal: getSignal(options),
      onUploadProgress: (event) => {
        if (typeof options?.onUploadProgress === "function" && event?.total) {
          options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });

    const data = unwrapData(response.data);

    return data && typeof data === "object"
      ? { ...data, message: response.data?.message }
      : data;
  } catch (error) {
    logApiError("Lỗi tải giấy tờ lên:", error);

    throw error;
  }
};

/**
 * Danh sách giấy tờ của một đối tượng, cũ → mới.
 *
 * @param {string} entityType
 * @param {string} entityId
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Array<object>>}
 */
export const getAttachmentsApi = async (entityType, entityId, options = {}) => {
  const id = requireGuid(entityId, "Không xác định được đối tượng cần xem giấy tờ.");

  try {
    const response = await httpClient.get("/api/attachments", {
      params: {
        entityType: String(entityType || "").trim().toUpperCase(),
        entityId: id,
      },
      signal: getSignal(options),
    });

    const data = unwrapData(response.data);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    logApiError("Lỗi lấy danh sách giấy tờ:", error);

    throw error;
  }
};

/* Content-Disposition: attachment; filename="a.pdf"; filename*=UTF-8''a%20b.pdf */
const readFileName = (headers, fallback) => {
  const raw =
    (typeof headers?.get === "function"
      ? headers.get("content-disposition")
      : headers?.["content-disposition"]) || "";

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(raw);

  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/"/g, ""));
    } catch {
      /* Tên mã hoá hỏng thì thử dạng thường bên dưới. */
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(raw);

  return plain ? plain[1].trim() : fallback;
};

/*
 * Tải file với responseType "blob" thì lỗi 403/404 cũng về dạng Blob — đọc lại
 * thành JSON để màn hình hiện được đúng `message` của server.
 */
const restoreJsonErrorBody = async (error) => {
  const data = error?.response?.data;

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const text = await data.text();
      error.response.data = text ? JSON.parse(text) : {};
    } catch {
      error.response.data = {};
    }
  }

  return error;
};

/**
 * Tải file về dạng Blob (có Authorization).
 *
 * Nhận id giấy tờ hoặc `downloadUrl` tương đối server trả (/api/attachments/{id}/download).
 *
 * @param {string | { id?: string, downloadUrl?: string, fileName?: string }} attachment
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ blob: Blob, fileName: string, contentType: string }>}
 */
export const downloadAttachmentApi = async (attachment, options = {}) => {
  const source = typeof attachment === "object" && attachment ? attachment : { id: attachment };
  const id = String(source.id ?? "").trim();

  /* Chỉ đi theo downloadUrl nếu đúng dạng /api/attachments/... — không gửi token sang host lạ. */
  const relativeUrl = String(source.downloadUrl ?? "").trim();
  const url = /^\/api\/attachments\/[0-9a-f-]{36}\/download$/i.test(relativeUrl)
    ? relativeUrl
    : `/api/attachments/${encodeURIComponent(
        requireGuid(id, "Không tìm thấy giấy tờ cần tải."),
      )}/download`;

  try {
    const response = await httpClient.get(url, {
      responseType: "blob",
      signal: getSignal(options),
    });

    const contentType =
      response.data?.type ||
      (typeof response.headers?.get === "function"
        ? response.headers.get("content-type")
        : response.headers?.["content-type"]) ||
      "application/octet-stream";

    return {
      blob: response.data,
      fileName: readFileName(response.headers, source.fileName || "tai-lieu"),
      contentType,
    };
  } catch (error) {
    await restoreJsonErrorBody(error);
    logApiError("Lỗi tải giấy tờ:", error);

    throw error;
  }
};

const attachmentApi = {
  uploadAttachmentApi,
  getAttachmentsApi,
  downloadAttachmentApi,
  validateAttachmentFile,
};

export default attachmentApi;
