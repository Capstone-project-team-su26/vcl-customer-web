/* Hàm thuần của thẻ giao hàng — tách ra để thân component chỉ còn phần hiển thị. */

import { LOCKED_BY_DELIVERY_REASON } from "@features/delivery/api/destinationHandlingApi";

/**
 * Tách địa chỉ một dòng của sổ địa chỉ thành 4 phần yêu cầu giao cần.
 *
 * Sổ địa chỉ (/api/delivery-addresses) chỉ lưu MỘT chuỗi; màn tạo đơn ghép theo thứ tự
 * "chi tiết, phường/xã, quận/huyện, tỉnh/thành" (ConsignmentOrder). Tách ngược lại theo
 * dấu phẩy từ cuối — phần dư dồn vào địa chỉ chi tiết. Không đủ 4 phần thì để khách tự
 * sửa trong form, không đoán bừa.
 */
export const splitAddress = (address) => {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 4) {
    return { addressDetail: parts.join(", "), ward: "", district: "", province: "" };
  }

  const province = parts.pop();
  const district = parts.pop();
  const ward = parts.pop();

  return { addressDetail: parts.join(", "), ward, district, province };
};

/**
 * Kiện đặt giao được — cùng luật DeliveryRequestService.IsReadyToDeliver:
 * STORED, hoặc RECEIVED_AT_DESTINATION + DIRECT_DELIVERY; chưa nằm trong yêu cầu giao còn
 * hiệu lực; không vướng sự cố chưa xử lý. Lọc trước ở FE để khách không bấm rồi mới bị 400.
 *
 * @param {Array<object>} handlingRows kết quả getParcelHandlingApi
 * @param {Set<string>} parcelIdsWithOpenIncident
 */
export const getReadyToDeliverParcels = (handlingRows, parcelIdsWithOpenIncident) =>
  (Array.isArray(handlingRows) ? handlingRows : []).filter((row) => {
    const status = String(row?.packageStatus ?? "").toUpperCase();
    const ready =
      status === "STORED" ||
      (status === "RECEIVED_AT_DESTINATION" && row.handling === "DIRECT_DELIVERY");

    return (
      ready &&
      row.lockedReason !== LOCKED_BY_DELIVERY_REASON &&
      !parcelIdsWithOpenIncident.has(row.parcelId)
    );
  });

/** Kiện "gửi kho" còn nằm ở khu nhận: phải chờ kho lập phiếu nhập + xếp kệ mới giao được. */
export const getAwaitingStorageParcels = (handlingRows) =>
  (Array.isArray(handlingRows) ? handlingRows : []).filter(
    (row) =>
      String(row?.packageStatus ?? "").toUpperCase() === "RECEIVED_AT_DESTINATION" &&
      row.handling === "STORE_AT_VN",
  );
