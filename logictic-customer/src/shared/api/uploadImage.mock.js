/* =========================================================
   ⚠ BẢN SAO MOCK TẠM THỜI — KHÔNG NỐI API THẬT VÀO FILE NÀY.

   File này là bản sao NGUYÊN VĂN bản mock của uploadImage.js (chụp trước khi
   uploadImage.js được nối API thật ở đợt A), chỉ dành cho các màn NGOÀI đợt A
   để chúng không trộn dữ liệu thật với dữ liệu mẫu.

   - Không làm theo hướng dẫn "CẮM / NỐI API THẬT" trong comment bên dưới:
     làm vậy là tạo ra module API thật thứ hai. API thật chỉ nằm ở uploadImage.js.
   - Khi các màn đang import file này tới đợt của mình, đổi import của chúng
     về uploadImage.js; không còn ai import thì XOÁ file này (và mục của nó trong
     tools/api-contract.json).
   ========================================================= */

/*
 * MOCK cho bản build UI-only: tầng HTTP thật đã bị gỡ, file này KHÔNG upload
 * lên server mà chỉ sinh URL ảnh mẫu (cùng "họ" ảnh với các fixture trong
 * "@/mocks/data") rồi trả về đúng hình dạng mà API cũ trả về.
 *
 * Ba màn đang dùng file này đều KHÔNG được sửa một dòng nào, nên hợp đồng phải
 * giữ nguyên tuyệt đối:
 * - uploadImages(files, onUploadProgress) và uploadImage(file, onUploadProgress)
 *   trả PHẦN THÂN response (tương đương `response.data` cũ), không phải object
 *   axios. Ở đây thân đó là mảng URL ảnh: ["https://...jpg", ...].
 * - Mỗi file phải ra MỘT URL KHÁC NHAU. Cả ba hàm bóc URL bên phía component
 *   (extractUploadUrls của chat, extractUploadedImageUrls của ký gửi và mua hộ)
 *   đều loại URL trùng, rồi so `urls.length` với `files.length` và ném lỗi
 *   "API chỉ trả về x/y URL ảnh" nếu thiếu. Trả cùng một URL cho nhiều ảnh là
 *   hỏng luôn luồng gửi ảnh.
 * - URL phải kết thúc bằng đuôi ảnh: khung chat chỉ render <img> khi
 *   isImageUrl(url) thấy đuôi .jpg/.png/... , không thì rơi xuống link chữ.
 *
 * CẮM LẠI API THẬT: dựng lại axios instance với UPLOAD_API_BASE_URL bên dưới,
 * POST multipart tới UPLOAD_ENDPOINT với field name "files" (bắt buộc là
 * "files", không phải "file"), rồi `return response.data`. Toàn bộ phần
 * chuẩn hoá / validate file phía dưới là logic thuần, giữ nguyên được.
 */

import { delay, nextId } from "@/mocks/mockUtils";

import catalog from "@/mocks/data/catalog";
import consignments from "@/mocks/data/consignments";
import purchaseRequests from "@/mocks/data/purchaseRequests";

/* ================= CONFIG ================= */

/* Giữ lại để biết chỗ cắm API thật trở lại. */
const UPLOAD_API_BASE_URL = "https://api-vcl.zushin.io.vn";
const UPLOAD_ENDPOINT = "/api/uploads/images";

/*
 * Upload thật mất vài trăm ms; chia nhỏ thành nhiều nhịp để thanh
 * "Đang upload ... %" bên trang mua hộ chạy được vài bước thay vì nhảy thẳng
 * từ 0 lên 100.
 */
const PROGRESS_STEPS = [12, 38, 64, 88, 100];
const PROGRESS_STEP_DELAY_MS = 60;

/* ================= NGUỒN ẢNH MẪU ================= */

/**
 * Gom URL ảnh có sẵn trong fixture đơn ký gửi và đơn mua hộ.
 *
 * Mục đích chỉ là lấy đúng host ảnh mà phần còn lại của app đang dùng, để ảnh
 * vừa "upload" không lạc quẻ so với ảnh của các đơn cũ.
 *
 * @returns {string[]}
 */
const collectFixtureImageUrls = () => {
  const urls = [];

  const pushUrl = (value) => {
    if (
      typeof value === "string" &&
      /^https?:\/\//i.test(value) &&
      !urls.includes(value)
    ) {
      urls.push(value);
    }
  };

  const collectFromOrders = (orders) => {
    (Array.isArray(orders) ? orders : []).forEach((order) => {
      (Array.isArray(order?.items) ? order.items : []).forEach(
        (item) => {
          [
            ...(Array.isArray(item?.referenceUrls)
              ? item.referenceUrls
              : []),
            ...(Array.isArray(item?.imageUrls)
              ? item.imageUrls
              : []),
          ].forEach(pushUrl);
        },
      );
    });
  };

  collectFromOrders(consignments);
  collectFromOrders(purchaseRequests);

  return urls;
};

const FIXTURE_IMAGE_URLS = collectFixtureImageUrls();

/* Cùng origin với ảnh fixture; fallback phòng khi fixture đổi cấu trúc. */
const UPLOAD_CDN_ORIGIN =
  FIXTURE_IMAGE_URLS[0]?.match(/^https?:\/\/[^/]+/i)?.[0] ||
  "https://picsum.photos";

const slugify = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/*
 * Ảnh chọn từ máy có thể không có tên (Blob dán từ clipboard), khi đó lấy tạm
 * tên nhóm hàng trong catalog để URL vẫn đọc ra được là ảnh gì.
 */
const FALLBACK_IMAGE_SLUGS = (catalog?.productTypes || [])
  .map((productType) => slugify(productType?.productTypeName))
  .filter(Boolean);

/**
 * Sinh URL cho một ảnh vừa "upload".
 *
 * nextId() bảo đảm token không bao giờ lặp trong một phiên, kể cả khi trang ký
 * gửi gọi uploadImage() song song cho nhiều kiện hàng cùng lúc.
 *
 * @param {File} file
 * @param {number} index
 * @returns {string}
 */
const buildUploadedImageUrl = (file, index) => {
  const token = nextId("upload-image");

  const nameSlug = slugify(
    String(file?.name || "").replace(/\.[^.]+$/, ""),
  );

  const fallbackSlug =
    FALLBACK_IMAGE_SLUGS.length > 0
      ? FALLBACK_IMAGE_SLUGS[index % FALLBACK_IMAGE_SLUGS.length]
      : "anh-san-pham";

  const slug = nameSlug || fallbackSlug;

  /* Đuôi .jpg là bắt buộc: khung chat dựa vào đuôi file để render <img>. */
  return `${UPLOAD_CDN_ORIGIN}/seed/${token}-${slug}/640/640.jpg`;
};

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

  return rawFiles.map((file, index) => {
    const normalizedFile = normalizeImageFile(file, index);

    if (!normalizedFile.type?.startsWith("image/")) {
      throw new Error(
        `File "${normalizedFile.name || index + 1}" không phải là hình ảnh.`,
      );
    }

    return normalizedFile;
  });
};

/* ================= UPLOAD MULTIPLE IMAGES ================= */

/**
 * Upload một hoặc nhiều ảnh.
 *
 * API thật:
 * - Endpoint: POST /api/uploads/images
 * - multipart field: files
 *
 * @param {File|Blob|FileList|Array<File|Blob>} inputFiles
 * @param {(percent: number) => void} onUploadProgress
 * @returns {Promise<string[]>} Dữ liệu gốc API trả về: danh sách URL ảnh.
 */
export const uploadImages = async (
  inputFiles,
  onUploadProgress,
) => {
  /* Ném lỗi tiếng Việt y như bản thật trước khi "gửi" đi. */
  const files = normalizeImageFiles(inputFiles);

  for (const percent of PROGRESS_STEPS) {
    await delay(PROGRESS_STEP_DELAY_MS);

    if (typeof onUploadProgress === "function") {
      onUploadProgress(percent);
    }
  }

  /* Mỗi file một URL riêng, giữ nguyên thứ tự file người dùng chọn. */
  const uploadedUrls = files.map((file, index) =>
    buildUploadedImageUrl(file, index),
  );

  console.info("[UploadImage][MOCK] Response:", uploadedUrls);

  return uploadedUrls;
};

/* ================= UPLOAD SINGLE IMAGE ================= */

/**
 * Upload một ảnh.
 *
 * Vẫn trả về MẢNG (một phần tử) đúng như bản thật, vì trang ký gửi bóc URL
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

/* ================= AXIOS INSTANCE (STUB) ================= */

const createInterceptorStub = () => ({
  use: () => 0,
  eject: () => {},
});

/*
 * Bản thật export instance axios này. Hiện không màn nào import nó, nhưng vẫn
 * phải còn tên export để không vỡ hợp đồng module; giữ luôn hình dạng axios
 * (defaults / interceptors / post trả { data }) phòng khi có chỗ dùng tới.
 */
export const uploadAxios = {
  defaults: {
    baseURL: UPLOAD_API_BASE_URL,
    timeout: 60_000,
    headers: {
      Accept: "text/plain, application/json, */*",
    },
  },

  interceptors: {
    request: createInterceptorStub(),
    response: createInterceptorStub(),
  },

  post: async (url = UPLOAD_ENDPOINT, formData, config = {}) => {
    const files =
      typeof formData?.getAll === "function"
        ? formData.getAll("files")
        : [];

    const data = await uploadImages(files, (percent) => {
      if (typeof config?.onUploadProgress === "function") {
        config.onUploadProgress({
          loaded: percent,
          total: 100,
        });
      }
    });

    return {
      data,
      status: 200,
      statusText: "OK",
      headers: {},
      config: { ...config, url },
    };
  },
};

export default uploadImage;
