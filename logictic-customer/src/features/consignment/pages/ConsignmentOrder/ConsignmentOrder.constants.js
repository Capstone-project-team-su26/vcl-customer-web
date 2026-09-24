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
 * placeholder chỉ còn ví dụ số, còn giới hạn đưa lên `hint` cạnh nhãn để luôn đọc được.
 */
export const PACKAGE_NUMBER_FIELDS = [
  {
    field: "weight",
    label: "CÂN NẶNG (KG)",
    hint: "tối đa 3",
    tooltip: "Nhập tổng cân nặng của kiện hàng (tối đa 3 kg/kiện).",
    placeholder: "VD: 1.5",
  },
  {
    field: "length",
    label: "DÀI (CM)",
    hint: "tối đa 100",
    tooltip: "Nhập chiều dài của kiện hàng (tối đa 100 cm).",
    placeholder: "VD: 40",
  },
  {
    field: "width",
    label: "RỘNG (CM)",
    hint: "tối đa 200",
    tooltip: "Nhập chiều rộng của kiện hàng (tối đa 200 cm).",
    placeholder: "VD: 30",
  },
  {
    field: "height",
    label: "CAO (CM)",
    hint: "tối đa 50",
    tooltip: "Nhập chiều cao của kiện hàng (tối đa 50 cm).",
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
