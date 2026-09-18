/*
 * Upload ảnh — API thật.
 *
 * POST /api/uploads/images (cần token), multipart field BẮT BUỘC là "files"
 * (không phải "file"), tối đa 10 ảnh JPG/PNG/WEBP ≤ 5MB mỗi lần
 * → { message, urls: string[] } theo đúng thứ tự file gửi lên.
 *
 * Hợp đồng giữ nguyên với bản mock, vì ba màn (chat, ký gửi, mua hộ) không được sửa:
 * - uploadImages(files, onUploadProgress) và uploadImage(file, onUploadProgress)
 *   trả MẢNG URL ảnh (đã bóc { message, urls }), không phải object axios.
 * - onUploadProgress nhận phần trăm 0..100.
 *
 * Dùng axios instance RIÊNG (timeout dài hơn instance chung vì ảnh chụp điện thoại
 * nặng) nhưng tạo qua createHttpClient nên vẫn cùng baseURL, token và quy tắc 401.
 *
 * Giới hạn của backend (UploadsController) được kiểm TRƯỚC khi gửi, để ảnh HEIC
 * hay ảnh điện thoại > 5MB báo lỗi tiếng Việt ngay thay vì tải lên xong mới bị 400.
 *
 * Màn ngoài đợt A (chat CSKH, mua hộ) import bản sao uploadImage.mock.js.
 */

import { createHttpClient } from "@shared/api/httpClient";

/* ================= CONFIG ================= */

const UPLOAD_ENDPOINT = "/api/uploads/images";

const UPLOAD_TIMEOUT_MS = 120_000;

/* Khớp UploadsController.AllowedContentTypes / MaxFileSizeBytes / MaxFilesPerRequest. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const MAX_FILES_PER_REQUEST = 10;

/* ================= FILE HELPERS ================= */

const getExtensionFromMimeType = (mimeType) => {
  const normalizedMimeType = String(mimeType || "")
    .trim()
    .toLowerCase();

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
  };

  return extensionMap[normalizedMimeType] || "jpg";
};

const normalizeImageFile = (inputFile, index = 0) => {
  if (!inputFile) {
    throw new Error("Vui lòng chọn ảnh.");
  }

  if (
    typeof File !== "undefined" &&
    inputFile instanceof File
  ) {
    return inputFile;
  }

  if (
    typeof Blob !== "undefined" &&
    inputFile instanceof Blob
  ) {
    const mimeType = inputFile.type || "image/jpeg";
    const extension = getExtensionFromMimeType(mimeType);

    return new File(
      [inputFile],
      `image-${Date.now()}-${index + 1}.${extension}`,
      {
        type: mimeType,
      },
    );
  }

  throw new Error("File ảnh không hợp lệ.");
};

const normalizeImageFiles = (inputFiles) => {
  let rawFiles = [];

  if (
    typeof FileList !== "undefined" &&
    inputFiles instanceof FileList
  ) {
    rawFiles = Array.from(inputFiles);
  } else if (Array.isArray(inputFiles)) {
    rawFiles = inputFiles;
  } else if (inputFiles) {
    rawFiles = [inputFiles];
  }

  if (!rawFiles.length) {
    throw new Error("Vui lòng chọn ít nhất một ảnh.");
  }

  if (rawFiles.length > MAX_FILES_PER_REQUEST) {
    throw new Error(
      `Chỉ được upload tối đa ${MAX_FILES_PER_REQUEST} ảnh mỗi lần.`,
    );
  }

  return rawFiles.map((file, index) => {
    const normalizedFile = normalizeImageFile(file, index);
    const fileLabel = normalizedFile.name || index + 1;
    const mimeType = String(normalizedFile.type || "").trim().toLowerCase();

    if (!mimeType.startsWith("image/")) {
      throw new Error(
        `File "${fileLabel}" không phải là hình ảnh.`,
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(
        `File "${fileLabel}": chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.`,
      );
    }

    if (Number(normalizedFile.size) > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File "${fileLabel}": vượt quá dung lượng tối đa 5MB.`,
      );
    }

    return normalizedFile;
  });
};

/* ================= AXIOS INSTANCE ================= */

export const uploadAxios = createHttpClient({
  timeout: UPLOAD_TIMEOUT_MS,
  headers: {
    Accept: "text/plain, application/json, */*",
  },
});

/** Backend trả { message, urls }; chấp nhận thêm mảng trần / { url } cho chắc. */
const extractUrls = (body) => {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.urls)) {
    return body.urls;
  }

  if (Array.isArray(body?.data?.urls)) {
    return body.data.urls;
  }

  if (typeof body?.url === "string" && body.url) {
    return [body.url];
  }

  return [];
};

/* ================= UPLOAD MULTIPLE IMAGES ================= */

/**
 * Upload một hoặc nhiều ảnh.
 *
 * @param {File|Blob|FileList|Array<File|Blob>} inputFiles
 * @param {(percent: number) => void} onUploadProgress
 * @returns {Promise<string[]>} Danh sách URL ảnh theo thứ tự file.
 */
export const uploadImages = async (
  inputFiles,
  onUploadProgress,
) => {
  /* Ném lỗi tiếng Việt trước khi gửi đi. */
  const files = normalizeImageFiles(inputFiles);

  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file, file.name);
  });

  const response = await uploadAxios.post(UPLOAD_ENDPOINT, formData, {
    onUploadProgress: (event) => {
      if (typeof onUploadProgress !== "function") {
        return;
      }

      const total = Number(event?.total);
      const loaded = Number(event?.loaded);

      if (Number.isFinite(total) && total > 0 && Number.isFinite(loaded)) {
        onUploadProgress(Math.min(100, Math.round((loaded * 100) / total)));
      }
    },
  });

  return extractUrls(response.data);
};

/* ================= UPLOAD SINGLE IMAGE ================= */

/**
 * Upload một ảnh.
 *
 * Vẫn trả về MẢNG (một phần tử) đúng như bản cũ, vì trang ký gửi bóc URL
 * bằng extractUploadedImageUrl(result) rồi mới lấy phần tử đầu.
 *
 * @param {File|Blob} inputFile
 * @param {(percent: number) => void} onUploadProgress
 * @returns {Promise<string[]>}
 */
export const uploadImage = async (
  inputFile,
  onUploadProgress,
) => {
  return uploadImages(
    [inputFile],
    onUploadProgress,
  );
};

export default uploadImage;
