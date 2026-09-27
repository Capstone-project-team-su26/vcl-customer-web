/*
 * Tách riêng dữ liệu tĩnh của màn hình CSKH để phần component chỉ còn
 * luồng xử lý, tránh phải cuộn qua hàng trăm dòng bảng tra khi sửa UI.
 */

/* Mã liên kết phải là id THẬT: backend tra RelatedId trong bảng Order / PurchaseRequest. */
import { getConsignmentsApi } from "@features/consignment/api/consignmentApi";
import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";

export const RELATED_TYPE_OPTIONS = [
  {
    value: "",
    label: "Không liên kết",
  },
  {
    value: "PURCHASE_REQUEST",
    label: "Yêu cầu mua hộ",
  },
  {
    value: "CONSIGNMENT",
    label: "Yêu cầu ký gửi",
  },
];

export const RELATED_TYPE_LABELS = {
  PURCHASE_REQUEST: "Yêu cầu mua hộ",
  PURCHASEREQUEST: "Yêu cầu mua hộ",
  BUY_FOR_ME: "Yêu cầu mua hộ",
  BUYFORME: "Yêu cầu mua hộ",
  CONSIGNMENT: "Yêu cầu ký gửi",
  CONSIGNMENT_REQUEST: "Yêu cầu ký gửi",
  CONSIGNMENTREQUEST: "Yêu cầu ký gửi",
  QUOTATION: "Báo giá",
  SUPPORT: "Hỗ trợ chung",
};

export const STATUS_LABELS = {
  /* Trạng thái phòng chat của backend (ConversationService). */
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  PENDING: "Đang chờ xử lý",
  PENDING_REVIEW: "Đang chờ duyệt",
  PROCESSING: "Đang xử lý",
  IN_PROGRESS: "Đang xử lý",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  CANCELED: "Đã hủy",
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  QUOTATION_SENT: "Đã gửi báo giá",
};

export const RELATED_TYPE_LOADERS = {
  PURCHASE_REQUEST: getPurchaseRequestsApi,
  /* 50 đơn ký gửi gần nhất (API thật tự lọc orderType=CONSIGNMENT); mặc định chỉ 10. */
  CONSIGNMENT: () => getConsignmentsApi(1, 50),
};

export const INITIAL_CREATE_FORM = {
  relatedType: "",
  relatedId: "",
  message: "",
};

export const INITIAL_MESSAGE_FORM = {
  content: "",
};

/*
 * Ảnh chat upload qua POST /api/uploads/images (UploadsController): JPG/PNG/WEBP,
 * mỗi ảnh ≤ 5MB. Mỗi tin nhắn backend chỉ lưu MỘT attachmentUrl (≤ 500 ký tự).
 */
export const MAX_IMAGE_COUNT = 1;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const ACCEPTED_CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MESSAGE_POLL_INTERVAL_MS = 2500;
