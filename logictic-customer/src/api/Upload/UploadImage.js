import axios from "axios";

/* ================= CONFIG ================= */

const DEFAULT_API_BASE_URL = "https://api-vcl.zushin.io.vn";

const getEnvValue = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const UPLOAD_API_BASE_URL =
  getEnvValue(import.meta.env.VITE_UPLOAD_API_BASE_URL) ||
  getEnvValue(import.meta.env.VITE_API_BASE_URL) ||
  DEFAULT_API_BASE_URL;

console.log("UPLOAD API BASE URL:", UPLOAD_API_BASE_URL);

/* ================= AXIOS INSTANCE ================= */

const uploadAxios = axios.create({
  baseURL: UPLOAD_API_BASE_URL,
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

/* ================= REQUEST INTERCEPTOR ================= */

uploadAxios.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("accessToken");

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
     * Không set Content-Type khi gửi FormData.
     * Browser sẽ tự tạo multipart/form-data kèm boundary.
     */
    if (typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
      config.headers.delete("content-type");
    } else {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    console.log("====== UPLOAD IMAGE REQUEST ======");
    console.log("BASE URL:", config.baseURL);
    console.log("URL:", `${config.baseURL}${config.url}`);
    console.log("METHOD:", config.method?.toUpperCase());
    console.log("TOKEN:", token ? "Đã có token" : "Chưa có token");

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */

uploadAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("UPLOAD API ERROR:", error?.response || error);

    const status = error?.response?.status;

    if (status === 401) {
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("accessToken");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

/* ================= HELPER ================= */

const normalizeImageFile = (inputFile) => {
  if (!inputFile) {
    throw new Error("Vui lòng chọn ảnh.");
  }

  if (typeof File !== "undefined" && inputFile instanceof File) {
    return inputFile;
  }

  if (typeof Blob !== "undefined" && inputFile instanceof Blob) {
    const mimeType = inputFile.type || "image/jpeg";

    let extension = "jpg";

    if (mimeType === "image/png") {
      extension = "png";
    } else if (mimeType === "image/webp") {
      extension = "webp";
    } else if (mimeType === "image/gif") {
      extension = "gif";
    }

    return new File([inputFile], `image-${Date.now()}.${extension}`, {
      type: mimeType,
    });
  }

  throw new Error("File ảnh không hợp lệ.");
};

const getUploadErrorMessage = (error) => {
  const status = error?.response?.status;
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (typeof responseData?.title === "string") {
    return responseData.title;
  }

  if (status === 400) {
    return "Dữ liệu ảnh gửi lên không hợp lệ.";
  }

  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (status === 403) {
    return "Bạn không có quyền tải ảnh lên.";
  }

  if (status === 404) {
    return "Không tìm thấy API upload ảnh. Vui lòng kiểm tra lại endpoint.";
  }

  if (status === 413) {
    return "Dung lượng ảnh vượt quá giới hạn cho phép.";
  }

  if (status === 415) {
    return "Máy chủ không hỗ trợ định dạng file hoặc request upload chưa đúng.";
  }

  if (status === 500) {
    return "Máy chủ gặp lỗi khi xử lý ảnh.";
  }

  return error?.message || "Tải ảnh lên thất bại.";
};

/* ================= UPLOAD IMAGE API ================= */

/**
 * Upload một ảnh lên máy chủ.
 *
 * @param {File|Blob} inputFile File hoặc Blob ảnh cần upload.
 * @param {(percent: number) => void} onUploadProgress Hàm nhận tiến trình upload.
 * @returns {Promise<any>} Dữ liệu API trả về.
 */
export const uploadImage = async (inputFile, onUploadProgress) => {
  const file = normalizeImageFile(inputFile);

  if (!file.type?.startsWith("image/")) {
    throw new Error("File được chọn không phải là hình ảnh.");
  }

  const formData = new FormData();

  formData.append("file", file, file.name || `image-${Date.now()}.jpg`);

  try {
    const response = await uploadAxios.post("/api/uploads/image", formData, {
      onUploadProgress: (progressEvent) => {
        if (
          typeof onUploadProgress !== "function" ||
          !progressEvent.total
        ) {
          return;
        }

        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );

        onUploadProgress(percent);
      },
    });

    console.log("UPLOAD IMAGE RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.error("UPLOAD IMAGE ERROR:", error);
    console.error("STATUS:", error?.response?.status);
    console.error("RESPONSE DATA:", error?.response?.data);

    throw new Error(getUploadErrorMessage(error));
  }
};

export { uploadAxios };

export default uploadImage;