import { EMPTY_PACKAGE_SERVICES } from "@features/purchase/components/PackageOptionalServicesS1/PackageOptionalServicesS1";

/*
 * Tách dữ liệu tĩnh của trang mua hộ ra khỏi component để phần JSX chỉ còn
 * phần hiển thị, đồng thời tránh khởi tạo lại các object mặc định mỗi lần render.
 */

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_ITEM = 5;

/*
 * TRẦN SỐ LƯỢNG MỖI SẢN PHẨM và SỐ DÒNG SẢN PHẨM của một yêu cầu mua hộ không còn ghi cứng:
 * Admin cấu hình (PURCHASE_MAX_ITEM_QUANTITY / PURCHASE_MAX_ITEMS), form đọc qua
 * GET /api/system-settings/order-limits (useOrderLimits → nhánh `purchase`).
 */

/*
 * ĐỘ DÀI TỐI ĐA — khớp kiểm tra của backend (POST /api/purchase-requests trả 400 kèm câu
 * tiếng Việt khi vượt) và cột DB của PURCHASE_REQUEST_ITEMS / PURCHASE_REQUESTS.
 * FE chặn trước để khách thấy lỗi ngay tại ô nhập. Đổi số ở đây là đổi cả maxLength,
 * bộ đếm ký tự lẫn câu báo lỗi.
 */
export const PURCHASE_TEXT_LIMITS = Object.freeze({
  productLink: 1000,
  sourceWebsite: 500,
  productType: 100,
  productName: 255,
  attributes: 500,
  note: 500,
  receiverName: 255,
  receiverPhone: 50,
  receiverAddress: 500,
  /* Các URL ảnh của MỘT sản phẩm nối bằng "|" (cột image_url). */
  imageUrls: 1000,
  /*
   * Ghi chú chung SAU KHI backend ghép (BuildGeneralNote): generalNote.trim() nối bằng ". "
   * với câu của từng dịch vụ khách tick (GENERAL_NOTE_SERVICE_SENTENCES). Số ký tự khách
   * được gõ vì thế thay đổi theo dịch vụ đang chọn — xem getGeneralNoteMaxLength.
   */
  generalNoteTotal: 1000,
});

/** Chuỗi nối các phần của ghi chú chung ở backend (BuildGeneralNote). */
export const GENERAL_NOTE_SEPARATOR = ". ";

/**
 * Câu backend tự thêm vào ghi chú chung cho mỗi dịch vụ khách tick — đúng thứ tự
 * và đúng chữ của BuildGeneralNote (độ dài quyết định số ký tự còn lại cho khách).
 */
export const GENERAL_NOTE_SERVICE_SENTENCES = Object.freeze([
  Object.freeze({ key: "requiresPacking", sentence: "Yêu cầu đóng gói lại" }),
  Object.freeze({ key: "requiresWoodenCrate", sentence: "Yêu cầu đóng thùng gỗ" }),
  Object.freeze({ key: "requiresInsurance", sentence: "Đăng ký bảo hiểm" }),
]);

export const INITIAL_FORM = {
  route: "",
  shippingOption: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  optionalServices: {
    ...EMPTY_PACKAGE_SERVICES,
  },
  generalNote: "",
};

export const INITIAL_ADDRESS_SELECT = {
  provinceCode: "",
  districtCode: "",
  wardCode: "",
};
