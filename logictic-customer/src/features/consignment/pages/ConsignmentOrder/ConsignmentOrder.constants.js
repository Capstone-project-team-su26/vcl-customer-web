/*
 * Tách khỏi ConsignmentOrder.jsx để dữ liệu tĩnh của màn ký gửi (giới hạn upload,
 * cấu hình ô nhập kích thước, state khởi tạo của form) nằm một chỗ,
 * tránh phải đọc hết file component mỗi khi cần chỉnh một con số nghiệp vụ.
 */

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_PACKAGE = 5;


export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/*
 * Bốn ô số nằm cùng một hàng nên ô rất hẹp: placeholder dài kiểu "Nhập chiều rộng (tối đa
 * 200 cm)..." bị cắt giữa chừng, khách đọc được mỗi "Nhập chiều rộng (tối đ". Vì vậy
 * placeholder chỉ còn ví dụ số, còn giới hạn đưa lên gợi ý cạnh nhãn để luôn đọc được.
 * Con số giới hạn KHÔNG ghi cứng ở đây: `limitKey` trỏ vào giới hạn Admin cấu hình
 * (GET /api/system-settings/order-limits), màn hình tự dựng câu gợi ý / tooltip.
 */
export const PACKAGE_NUMBER_FIELDS = [
  {
    field: "weight",
    label: "CÂN NẶNG (KG)",
    limitKey: "maxParcelWeightKg",
    unit: "kg",
    hintSuffix: " / kiện",
    tooltip: "Nhập tổng cân nặng của kiện hàng",
    placeholder: "VD: 1.5",
  },
  {
    field: "length",
    label: "DÀI (CM)",
    limitKey: "maxParcelLengthCm",
    unit: "cm",
    hintSuffix: "",
    tooltip: "Nhập chiều dài của kiện hàng",
    placeholder: "VD: 40",
  },
  {
    field: "width",
    label: "RỘNG (CM)",
    limitKey: "maxParcelWidthCm",
    unit: "cm",
    hintSuffix: "",
    tooltip: "Nhập chiều rộng của kiện hàng",
    placeholder: "VD: 30",
  },
  {
    field: "height",
    label: "CAO (CM)",
    limitKey: "maxParcelHeightCm",
    unit: "cm",
    hintSuffix: "",
    tooltip: "Nhập chiều cao của kiện hàng",
    placeholder: "VD: 20",
  },
];


export const INITIAL_FORM = {
  route: "",
  shippingOption: "",
  receiverName: "",
  receiverPhone: "",
  selectedDeliveryAddress: "",
  note: "",

  /*
   * Khách muốn hàng về VN thì giao ngay hay gửi lại kho.
   * Để rỗng là "chưa quyết định" — hợp lệ, lúc hàng về kho mặc định giao ngay.
   */
  defaultDestinationHandling: "",

  inspectPackage: true,
  optionalServices: {
    requiresPacking: false,
    requiresWoodenCrate: false,
    requiresInsurance: false,
    requiresInspection: false,

    // Giữ lại dữ liệu rule đã chọn để tương thích component dịch vụ động.
    selectedRuleCodes: [],
    selectedPricingRuleIds: [],
    packageConfigurationByPackageId: {},
    selectedPackageConfigurations: [],
    woodCrateBaseFeePerPackage: 0,
    woodCrateOrderFee: 0,
    woodCrateBaseFee: 0,
    woodCrateConfigurationFee: 0,
    woodCrateTotalFee: 0,
    woodCrateCompleted: false,
  },
};

/*
 * Các key mà API upload ảnh có thể trả về. Giữ nguyên danh sách vì backend
 * chưa thống nhất tên field, frontend phải dò theo thứ tự ưu tiên này.
 */
export const UPLOAD_URL_KEYS = [
  "url",
  "imageUrl",
  "imageURL",
  "fileUrl",
  "fileURL",
  "secureUrl",
  "secureURL",
  "downloadUrl",
  "downloadURL",
  "location",
  "path",
];

export const UPLOAD_CONTAINER_KEYS = [
  "urls",
  "imageUrls",
  "imageURLs",
  "fileUrls",
  "fileURLs",
  "paths",
  "files",
  "images",
  "items",
  "result",
  "results",
  "data",
];
