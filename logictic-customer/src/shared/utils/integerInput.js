/* =========================================================
   integerInput.js — ô nhập SỐ NGUYÊN DƯƠNG (số lượng, số kiện...).

   Phi nghiệp vụ: không biết "tối đa bao nhiêu" — trần (max) do từng feature truyền vào.
   Gom một chỗ để mọi ô số lượng chặn giống nhau ở ba cửa:
     1. gõ phím   → blockNonIntegerKeys   (chặn "-", "+", "e", ".", ",", chữ...)
     2. dán        → isIntegerPasteAllowed (dán "1.5", "1e3", "12abc" bị từ chối cả cụm,
                     KHÔNG lọc bỏ ký tự vì lọc sẽ biến "1.5" thành "15", "1e3" thành "13")
     3. onChange   → normalizeIntegerInput (kéo-thả / autofill lọt qua 2 cửa trên thì bỏ)
   và kiểm cùng MỘT hàm validateIntegerInRange lúc gõ lẫn lúc bấm gửi.
   ========================================================= */

const DIGITS_ONLY = /^\d+$/;

/** onKeyDown: chỉ cho phép phím số và phím điều khiển (Backspace, mũi tên, Tab, Ctrl+V...). */
export const blockNonIntegerKeys = (event) => {
  const { key } = event;

  if (event.ctrlKey || event.metaKey || event.altKey) return;

  // Phím điều khiển có tên dài hơn 1 ký tự ("Backspace", "ArrowLeft"...).
  if (typeof key === "string" && key.length === 1 && !/\d/.test(key)) {
    event.preventDefault();
  }
};

/** Chuỗi dán vào có phải toàn chữ số không (cho phép khoảng trắng hai đầu). */
export const isIntegerPasteAllowed = (text) =>
  DIGITS_ONLY.test(String(text ?? "").trim());

/**
 * onChange: trả về giá trị mới nếu chỉ gồm chữ số (bỏ số 0 thừa ở đầu, "007" → "7",
 * nhưng giữ "0" để ô báo lỗi thay vì im lặng xoá), ngược lại giữ nguyên giá trị cũ.
 */
export const normalizeIntegerInput = (nextValue, previousValue = "") => {
  const text = String(nextValue ?? "").trim();

  if (text === "") return "";
  if (!DIGITS_ONLY.test(text)) return String(previousValue ?? "");

  return text.replace(/^0+(?=\d)/, "");
};

/**
 * Kiểm một giá trị số nguyên trong [min, max]. Trả "" khi hợp lệ, ngược lại là câu báo lỗi.
 * Nhận chuỗi (từ ô nhập) hoặc số. Chuỗi phải toàn chữ số: "1.5", "1e3", "-1", "12abc" đều sai.
 */
export const validateIntegerInRange = (
  value,
  {
    min = 1,
    max,
    emptyMessage = "Vui lòng nhập số lượng.",
    rangeMessage,
    label = "Số lượng",
  } = {},
) => {
  const outOfRange =
    rangeMessage ||
    (Number.isFinite(max)
      ? `${label} phải là số nguyên từ ${min} đến ${max}.`
      : `${label} phải là số nguyên từ ${min} trở lên.`);

  if (value === null || value === undefined) return emptyMessage;

  const text = String(value).trim();

  if (text === "") return emptyMessage;
  if (typeof value === "string" && !DIGITS_ONLY.test(text)) return outOfRange;

  const number = Number(text);

  if (!Number.isSafeInteger(number)) return outOfRange;
  if (number < min) return outOfRange;
  if (Number.isFinite(max) && number > max) return outOfRange;

  return "";
};
