/* =========================================================
   mockUtils.js

   Tiện ích dùng chung cho toàn bộ tầng mock (UI-only build).

   Tầng HTTP thật đã bị gỡ, nhưng component KHÔNG được sửa một dòng nào.
   Vì vậy mọi mock phải giữ nguyên hành vi mà component đang trông đợi:
   có độ trễ để spinner kịp hiện, huỷ được bằng AbortSignal, và phân trang
   đúng quy ước 1-based của backend cũ.
   ========================================================= */

/*
 * 220ms: đủ để CircularProgress kịp render một nhịp,
 * nhưng chưa đủ lâu để người dùng thấy màn hình "đứng".
 */
const DEFAULT_DELAY_MS = 220;

const DEFAULT_PAGE_SIZE = 10;

/* =========================================================
   HỦY REQUEST
   ========================================================= */

/**
 * Tạo lỗi huỷ đúng "chữ ký" mà component đang dò.
 *
 * Các trang đều kiểm tra theo axios: error.name === "CanceledError"
 * hoặc error.code === "ERR_CANCELED". Thiếu một trong hai là màn hình
 * sẽ bắn toast lỗi đỏ mỗi lần user rời trang giữa chừng.
 *
 * @param {string} [message]
 * @returns {Error}
 */
export const createCanceledError = (
  message = "Yêu cầu đã bị hủy."
) => {
  const error = new Error(message);

  error.name = "CanceledError";
  error.code = "ERR_CANCELED";

  return error;
};

/**
 * Nhận diện lỗi huỷ, dùng lại đúng logic của tầng api cũ.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export const isCanceledError = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

/*
 * Component truyền signal theo hai kiểu khác nhau:
 * - getConsignmentsApi({ signal })
 * - getConsignmentStatusesApi(controller.signal)
 * Nên helper phải chấp nhận cả AbortSignal trần lẫn options bọc ngoài.
 */
const resolveSignal = (input) => {
  if (!input || typeof input !== "object") {
    return null;
  }

  if (typeof input.addEventListener === "function") {
    return input;
  }

  const signal = input.signal;

  return signal &&
    typeof signal.addEventListener === "function"
    ? signal
    : null;
};

/**
 * Chờ một nhịp ngắn rồi resolve; reject ngay nếu request đã bị huỷ.
 *
 * @param {number} [ms]
 * @param {AbortSignal | { signal?: AbortSignal }} [signalOrOptions]
 * @returns {Promise<void>}
 */
export const delay = (
  ms = DEFAULT_DELAY_MS,
  signalOrOptions
) =>
  new Promise((resolve, reject) => {
    /* Cho phép gọi tắt delay({ signal }) mà vẫn dùng độ trễ mặc định. */
    const duration =
      typeof ms === "number" && Number.isFinite(ms)
        ? Math.max(0, ms)
        : DEFAULT_DELAY_MS;

    const signal =
      resolveSignal(signalOrOptions) ??
      (typeof ms === "object" ? resolveSignal(ms) : null);

    if (signal?.aborted) {
      reject(createCanceledError());

      return;
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = () => {
      cleanup();
      clearTimeout(timer);
      reject(createCanceledError());
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, duration);

    if (signal) {
      signal.addEventListener("abort", onAbort);
    }
  });

/* =========================================================
   PHÂN TRANG
   ========================================================= */

/**
 * Phân trang theo đúng quy ước của backend cũ: pageNumber bắt đầu từ 1.
 *
 * Đã đối chiếu getConsignmentsApi / getPurchaseRequestsApi (mặc định page = 1)
 * và các trang danh sách (MUI Pagination cũng đánh số từ 1, slice bằng
 * (pageNumber - 1) * pageSize). Trả về 0-based là lệch nguyên một trang.
 *
 * Object trả về mang cả tên rút gọn (page/size/total) lẫn tên đúng envelope
 * của API (pageNumber/pageSize/totalCount) vì extractConsignmentPage và
 * Dashboard đọc theo tên API.
 *
 * @param {Array} rows
 * @param {{ page?: number, pageNumber?: number, size?: number, pageSize?: number }} [options]
 */
export const paginate = (rows, options = {}) => {
  const list = Array.isArray(rows) ? rows : [];

  const rawSize = Number(
    options?.size ?? options?.pageSize ?? DEFAULT_PAGE_SIZE
  );

  const size =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.floor(rawSize)
      : DEFAULT_PAGE_SIZE;

  const total = list.length;

  const totalPages = Math.max(1, Math.ceil(total / size));

  const rawPage = Number(
    options?.page ?? options?.pageNumber ?? 1
  );

  const page = Math.min(
    Math.max(
      Number.isFinite(rawPage) && rawPage >= 1
        ? Math.floor(rawPage)
        : 1,
      1
    ),
    totalPages
  );

  const startIndex = (page - 1) * size;

  return {
    items: list.slice(startIndex, startIndex + size),
    total,
    page,
    size,
    totalPages,

    /* Alias đúng tên field của API cũ. */
    totalCount: total,
    pageNumber: page,
    pageSize: size,
  };
};

/* =========================================================
   BẢN SAO DỮ LIỆU
   ========================================================= */

/**
 * Trả bản sao sâu để component có mutate thoải mái cũng không
 * làm hỏng fixture gốc — fixture là singleton dùng chung cả phiên.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export const deepClone = (value) => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

/* =========================================================
   SINH ID / MÃ ĐƠN
   ========================================================= */

const idCounters = new Map();

/**
 * ID tăng dần cho bản ghi mới tạo trong phiên làm việc.
 *
 * @param {string} [prefix]
 * @returns {string}
 */
export const nextId = (prefix = "mock") => {
  const nextValue = (idCounters.get(prefix) || 0) + 1;

  idCounters.set(prefix, nextValue);

  return `${prefix}-${String(nextValue).padStart(4, "0")}`;
};

/**
 * GUID ngẫu nhiên cho bản ghi mới (backend cũ dùng GUID cho mọi khoá chính).
 *
 * @returns {string}
 */
export const newUuid = () => {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
};

/**
 * GUID tất định sinh từ một chuỗi seed.
 *
 * Đây là cách các file fixture khác nhau tham chiếu chung một bản ghi mà
 * không phải copy tay GUID: cùng seed thì luôn ra cùng GUID.
 * Ví dụ: stableUuid("consignment-order-01") ở mọi module đều bằng nhau.
 *
 * @param {string} seed
 * @returns {string}
 */
export const stableUuid = (seed) => {
  const text = String(seed ?? "");

  /* FNV-1a 32-bit để lấy hạt giống, rồi xorshift để trải đều các byte. */
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  let state = hash || 0x9e3779b9;

  const nextByte = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;

    return state & 0xff;
  };

  const bytes = Array.from({ length: 16 }, nextByte);

  /* Ép về đúng định dạng UUID v4 để qua được các regex kiểm tra GUID. */
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.map((byte) =>
    byte.toString(16).padStart(2, "0")
  );

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

const pad = (value, length = 2) =>
  String(value).padStart(length, "0");

/**
 * Mã đơn theo đúng format backend: PREFIX-yyyyMMddHHmmss-nnnnnn.
 *
 * Ví dụ: VCL-20260712105447-295805 / PUR-20260712105447-295805.
 *
 * @param {string} prefix
 * @param {string | number | Date} [createdAt] thời điểm tạo (UTC)
 * @param {string | number} [suffix] 6 số cuối, để trống thì sinh ngẫu nhiên
 * @returns {string}
 */
export const makeOrderCode = (
  prefix,
  createdAt = new Date(),
  suffix
) => {
  const date = new Date(createdAt);

  const safeDate = Number.isNaN(date.getTime())
    ? new Date()
    : date;

  const timePart = [
    safeDate.getUTCFullYear(),
    pad(safeDate.getUTCMonth() + 1),
    pad(safeDate.getUTCDate()),
    pad(safeDate.getUTCHours()),
    pad(safeDate.getUTCMinutes()),
    pad(safeDate.getUTCSeconds()),
  ].join("");

  const randomPart =
    suffix === undefined || suffix === null || suffix === ""
      ? Math.floor(100000 + Math.random() * 900000)
      : suffix;

  return `${String(prefix).toUpperCase()}-${timePart}-${pad(
    randomPart,
    6
  )}`;
};

/* =========================================================
   THỜI GIAN
   ========================================================= */

/**
 * Thời điểm hiện tại dạng ISO UTC, dùng cho bản ghi vừa tạo.
 *
 * @returns {string}
 */
export const nowIso = () => new Date().toISOString();

/**
 * ISO UTC lùi/tiến so với hiện tại — dùng cho bản ghi sinh lúc runtime.
 * Fixture tĩnh nên viết ngày cứng để mã đơn và ngày tạo luôn khớp nhau.
 *
 * @param {number} [days] số ngày lùi về quá khứ (âm là tương lai)
 * @param {number} [hours] số giờ lùi thêm
 * @returns {string}
 */
export const isoDaysAgo = (days = 0, hours = 0) => {
  const timestamp =
    Date.now() -
    days * 24 * 60 * 60 * 1000 -
    hours * 60 * 60 * 1000;

  return new Date(timestamp).toISOString();
};

/* =========================================================
   TÌM KIẾM / LỌC
   ========================================================= */

/**
 * Bỏ dấu + lowercase, khớp đúng cách các trang danh sách đang chuẩn hoá
 * từ khoá tìm kiếm.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Chuẩn hoá mã trạng thái: trim + UPPER_SNAKE.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const normalizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

/**
 * Kiểm tra một bản ghi có khớp từ khoá hay không.
 *
 * @param {object} row
 * @param {string} keyword
 * @param {string[]} fields danh sách field được đưa vào chuỗi tìm kiếm
 * @returns {boolean}
 */
export const matchesKeyword = (row, keyword, fields = []) => {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  const haystack = fields
    .map((field) => row?.[field])
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== ""
    )
    .map(normalizeText)
    .join(" ");

  return haystack.includes(normalizedKeyword);
};

export default {
  createCanceledError,
  deepClone,
  delay,
  isCanceledError,
  isoDaysAgo,
  makeOrderCode,
  matchesKeyword,
  newUuid,
  nextId,
  normalizeStatus,
  normalizeText,
  nowIso,
  paginate,
  stableUuid,
};
