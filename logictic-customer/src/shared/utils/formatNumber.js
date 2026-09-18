/* =========================================================
   formatNumber.js — định dạng tiền / khối lượng kiểu Việt Nam.

   Nhiều thẻ mới (tất toán, phí lưu kho, giao hàng) cùng hiện tiền; gom một chỗ để
   cùng một số không chỗ ghi "160.200đ" chỗ ghi "160,200 VND".
   ========================================================= */

/** 160200 → "160.200đ"; số âm giữ dấu trừ (điều chỉnh cước giảm tiền). */
export const formatVnd = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

/** Điều chỉnh: "+60.000đ" / "-60.000đ" / "0đ". */
export const formatSignedVnd = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";
  if (number > 0) return `+${formatVnd(number)}`;

  return formatVnd(number);
};

/** 2.5 → "2,5 kg"; null → "—". */
export const formatKg = (value, digits = 3) => {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return `${number.toLocaleString("vi-VN", { maximumFractionDigits: digits })} kg`;
};

export const formatDecimal = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") return "—";

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("vi-VN", { maximumFractionDigits: digits })
    : "—";
};
