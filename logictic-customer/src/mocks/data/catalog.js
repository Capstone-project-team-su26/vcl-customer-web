/* =========================================================
   CATALOG — DỮ LIỆU TRA CỨU DÙNG CHUNG CHO CÁC MOCK
   =========================================================

   Vì sao có file này:
   - Ba nhóm mock (pricing / consignment / purchase) cùng cần một bộ dữ liệu
     tham chiếu giống hệt nhau (tuyến hàng, loại sản phẩm, quy tắc tính phí,
     cấu hình thùng...). Nếu mỗi mock tự khai báo thì báo giá của đơn ký gửi
     sẽ lệch với bảng giá đang hiển thị trên màn hình dịch vụ.
   - Dữ liệu ở đây đã ở dạng ĐÃ CHUẨN HÓA sẵn (mã viết hoa, số là number,
     ngày là chuỗi ISO). Nhờ vậy màn hình vẫn đúng dù mock có chạy lại
     hàm normalize của service hay trả thẳng mảng này ra.

   Ràng buộc bắt buộc phải giữ khi sửa file:
   - `id` của pricingRules và packageConfigurations PHẢI là UUID hợp lệ và
     viết thường: consignmentApi kiểm tra `pricingRuleIds` và
     `packageConfigurationId` bằng regex UUID trước khi tạo đơn, sai định dạng
     là ném lỗi ngay trên form.
   - Phải luôn tồn tại rule VOLUMETRIC_DIVISOR đang ACTIVE và value > 0,
     nếu không getVolumetricDivisorRule sẽ ném lỗi và màn hình báo giá trắng.
   - Phải luôn tồn tại rule WOOD_CRATE đang ACTIVE: PackageOptionalServices
     coi đóng thùng gỗ là dịch vụ bắt buộc, thiếu nó thì bấm "Lưu lựa chọn"
     luôn báo lỗi và người dùng không đi tiếp được. Rule này KHÔNG có mức
     cố định theo đơn (calculationType BY_SIZE, value null): tiền thùng gỗ
     tính theo cỡ từng kiện trong packageConfigurations.
   - Phải luôn tồn tại rule DEPOSIT_RATE (PERCENTAGE) đang ACTIVE và
     0 <= value <= 100, nếu không getDepositRate phải dùng fallback 30%.
   - MỘT danh mục phí duy nhất: mọi tham số giá (cọc, hệ số thể tích, phụ phí,
     phí giao, phí hủy…) nằm trong pricingRules. Không khai lại ở collection
     khác (additionalServiceFees đã gộp vào đây).
   - packageConfigurations phải có đúng một cấu hình configCode "CUSTOM":
     giao diện tính phí thùng tùy chỉnh theo thể tích thực tế của kiện.
   ========================================================= */

/* =========================================================
   TUYẾN HÀNG
   =========================================================

   Màn hình đọc `value` (hoặc `code`) làm giá trị gửi lên và `label` để hiển
   thị; FloatingChat lại đọc `routeName` + `description`. Khai báo đủ cả ba
   nhóm field để mọi nơi cùng ra một tên tuyến, không chỗ nào rơi về "-".
   Mã tuyến giữ theo bảng ROUTE_LABELS của màn xác nhận đơn (CHINA_VIETNAM…)
   để phần tóm tắt đơn dịch được sang tiếng Việt.
   ========================================================= */

export const consignmentRoutes = [
  {
    id: "c5f7b107-620c-487a-929e-8962cce68252",
    code: "CHINA_VIETNAM",
    value: "CHINA_VIETNAM",
    name: "Trung Quốc → Việt Nam",
    routeName: "Trung Quốc → Việt Nam",
    label: "Trung Quốc → Việt Nam",
    originCountry: "CN",
    destinationCountry: "VN",
    description:
      "Tuyến chính qua cửa khẩu Hữu Nghị (Lạng Sơn), gom hàng tại kho Quảng Châu và Nghĩa Ô.",
    estimatedDays: "4 - 6 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
  {
    id: "79e7e9a6-fb9a-44dd-b2e6-733fc3d992bc",
    code: "CHINA_VIETNAM_LAOCAI",
    value: "CHINA_VIETNAM_LAOCAI",
    name: "Trung Quốc → Việt Nam (Lào Cai)",
    routeName: "Trung Quốc → Việt Nam (Lào Cai)",
    label: "Trung Quốc → Việt Nam (Lào Cai)",
    originCountry: "CN",
    destinationCountry: "VN",
    description:
      "Tuyến qua cửa khẩu Kim Thành - Lào Cai, phù hợp hàng gom từ Côn Minh và Hà Khẩu.",
    estimatedDays: "5 - 7 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
  {
    id: "58afc42a-d299-40e6-b9f9-6b14ab00c1ef",
    code: "CHINA_VIETNAM_MONGCAI",
    value: "CHINA_VIETNAM_MONGCAI",
    name: "Trung Quốc → Việt Nam (Móng Cái)",
    routeName: "Trung Quốc → Việt Nam (Móng Cái)",
    label: "Trung Quốc → Việt Nam (Móng Cái)",
    originCountry: "CN",
    destinationCountry: "VN",
    description:
      "Tuyến Đông Hưng - Móng Cái, ưu tiên hàng tiêu dùng và phụ kiện khối lượng nhỏ.",
    estimatedDays: "4 - 6 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
  {
    id: "12a47018-31ce-4053-a790-d05e0f5be2d3",
    code: "CHINA_VIETNAM_SEA",
    value: "CHINA_VIETNAM_SEA",
    name: "Trung Quốc → Việt Nam (đường biển)",
    routeName: "Trung Quốc → Việt Nam (đường biển)",
    label: "Trung Quốc → Việt Nam (đường biển)",
    originCountry: "CN",
    destinationCountry: "VN",
    description:
      "Tuyến biển Thâm Quyến - Hải Phòng, giá rẻ cho hàng nặng và hàng cồng kềnh.",
    estimatedDays: "10 - 14 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
  {
    id: "7f93bc5b-516d-4981-ab2b-06ca8eac60a7",
    code: "KOREA_VIETNAM",
    value: "KOREA_VIETNAM",
    name: "Hàn Quốc → Việt Nam",
    routeName: "Hàn Quốc → Việt Nam",
    label: "Hàn Quốc → Việt Nam",
    originCountry: "KR",
    destinationCountry: "VN",
    description:
      "Tuyến hàng không Incheon - Nội Bài, chủ yếu cho mỹ phẩm và thực phẩm chức năng.",
    estimatedDays: "3 - 5 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
  {
    id: "79027930-2ad1-4741-b4df-fb343dff5342",
    code: "JAPAN_VIETNAM",
    value: "JAPAN_VIETNAM",
    name: "Nhật Bản → Việt Nam",
    routeName: "Nhật Bản → Việt Nam",
    label: "Nhật Bản → Việt Nam",
    originCountry: "JP",
    destinationCountry: "VN",
    description:
      "Tuyến Osaka - Tân Sơn Nhất, gom hàng nội địa Nhật tại kho Sakai.",
    estimatedDays: "4 - 6 ngày",
    status: "ACTIVE",
    /* Giới hạn khai báo theo tuyến (Admin cấu hình). */
    maxItemsPerParcel: 5,
    maxParcelWeightKg: 3,
    maxParcelValue: 6000000,
    maxLengthCm: 100,
    maxWidthCm: 200,
    maxHeightCm: 50,
    maxOrderWeightKg: 5,
    maxOrderValue: 10000000,
  },
];

/* =========================================================
   HÌNH THỨC VẬN CHUYỂN
   =========================================================

   Giao diện tự dịch nhãn theo mã (EXPRESS → "Hỏa tốc", STANDARD → "Tiêu
   chuẩn", ECONOMY → "Tiết kiệm") nên `value` phải dùng đúng các mã đó,
   nếu không nhãn sẽ rơi về chuỗi thô.
   ========================================================= */

export const shippingOptions = [
  {
    id: "b6bb8893-5456-440d-af51-188d1db148bc",
    code: "STANDARD",
    value: "STANDARD",
    name: "Tiêu chuẩn",
    shippingOptionName: "Tiêu chuẩn",
    label: "Tiêu chuẩn",
    description:
      "Đi đường bộ ghép xe, thời gian 4 - 6 ngày kể từ khi hàng vào kho Trung Quốc.",
    estimatedDays: "4 - 6 ngày",
    status: "ACTIVE",
  },
  {
    id: "8a3ca9f3-0c10-46c5-909c-1d01be12026a",
    code: "EXPRESS",
    value: "EXPRESS",
    name: "Hỏa tốc",
    shippingOptionName: "Hỏa tốc",
    label: "Hỏa tốc",
    description:
      "Xe chạy thẳng ưu tiên thông quan, thời gian 2 - 3 ngày, phụ phí cao hơn 35%.",
    estimatedDays: "2 - 3 ngày",
    status: "ACTIVE",
  },
  {
    id: "c272a664-29d1-45cc-9f1a-0b119e82d547",
    code: "ECONOMY",
    value: "ECONOMY",
    name: "Tiết kiệm",
    shippingOptionName: "Tiết kiệm",
    label: "Tiết kiệm",
    description:
      "Chờ đủ chuyến mới xuất kho, thời gian 7 - 10 ngày, hợp với hàng không gấp.",
    estimatedDays: "7 - 10 ngày",
    status: "ACTIVE",
  },
  {
    id: "76946865-222b-4c57-bd4b-bc31fe8faf9c",
    code: "SEA",
    value: "SEA",
    name: "Đường biển",
    shippingOptionName: "Đường biển",
    label: "Đường biển",
    description:
      "Container ghép Thâm Quyến - Hải Phòng, tính cước theo mét khối, 10 - 14 ngày.",
    estimatedDays: "10 - 14 ngày",
    status: "ACTIVE",
  },
];

/* =========================================================
   LOẠI SẢN PHẨM
   =========================================================

   Các màn hình dò tên loại hàng bằng nhiều khóa khác nhau
   (productTypeId / productTypeCode / code / value / id). Đặt tất cả bằng
   CÙNG một mã để dù form lưu theo khóa nào thì bảng tra cứu vẫn tìm ra nhãn,
   tránh cảnh chi tiết đơn hiện mã thô thay vì tên tiếng Việt.
   Mã lấy theo bảng PRODUCT_TYPE_LABELS của màn xác nhận đơn.
   ========================================================= */

const createProductType = (code, label, description) => ({
  id: code,
  productTypeId: code,
  productTypeCode: code,
  code,
  value: code,
  name: label,
  productTypeName: label,
  label,
  description,
  status: "ACTIVE",
});

export const productTypes = [
  createProductType(
    "ELECTRONICS",
    "Điện tử và công nghệ",
    "Điện thoại, phụ kiện, thiết bị điện tử không kèm pin rời.",
  ),
  createProductType(
    "CLOTHING",
    "Quần áo",
    "Hàng may mặc, hàng thùng, đồ len không mùi hóa chất.",
  ),
  createProductType(
    "FASHION",
    "Thời trang",
    "Túi xách, thắt lưng, phụ kiện thời trang không nhái thương hiệu.",
  ),
  createProductType(
    "COSMETICS",
    "Mỹ phẩm",
    "Mỹ phẩm dạng kem và bột, không nhận dạng lỏng trên 100ml.",
  ),
  createProductType(
    "FOOD",
    "Thực phẩm",
    "Thực phẩm khô đóng gói còn hạn tối thiểu 6 tháng.",
  ),
  createProductType(
    "MEDICINE",
    "Dược phẩm",
    "Thực phẩm chức năng có nhãn mác rõ ràng, cần khai báo trước.",
  ),
  createProductType(
    "HOUSEHOLD",
    "Đồ gia dụng",
    "Nồi, chảo, đồ nhà bếp, đồ nhựa gia dụng.",
  ),
  createProductType(
    "HOME_APPLIANCE",
    "Thiết bị gia dụng",
    "Máy lọc không khí, quạt, máy hút bụi cỡ nhỏ.",
  ),
  createProductType(
    "ACCESSORIES",
    "Phụ kiện",
    "Phụ kiện điện thoại, đồng hồ, trang sức thời trang.",
  ),
  createProductType(
    "SHOES",
    "Giày dép",
    "Giày thể thao, dép, boot đóng hộp nguyên kiện.",
  ),
  createProductType(
    "BOOKS",
    "Sách và văn phòng phẩm",
    "Sách, sổ tay, dụng cụ học tập không chứa nội dung bị cấm.",
  ),
  createProductType(
    "TOYS",
    "Đồ chơi",
    "Đồ chơi trẻ em không dùng pin lithium rời.",
  ),
  createProductType(
    "FRAGILE",
    "Hàng dễ vỡ",
    "Gốm sứ, thủy tinh, đèn trang trí — bắt buộc đóng thùng gỗ.",
  ),
  createProductType(
    "OTHER",
    "Hàng hóa khác",
    "Các mặt hàng chưa có trong danh mục, nhân viên sẽ liên hệ xác nhận.",
  ),
];

/* =========================================================
   TRẠNG THÁI ĐƠN KÝ GỬI
   =========================================================

   Trang lịch sử gom trạng thái thành tab (chờ xử lý / báo giá / đang xử lý /
   vận chuyển / hoàn thành / đã hủy). Danh sách dưới đây cố ý trải đủ các
   nhóm đó để mọi tab đều có dữ liệu, không tab nào trống.
   `label` được đặt tường minh vì thứ tự dò nhãn là label → name → description.
   ========================================================= */

const createStatus = (code, label, description) => ({
  code,
  value: code,
  status: code,
  name: label,
  label,
  description,
});

/*
 * Đúng 19 mã đích của đơn ký gửi, theo thứ tự ORDER_STATUS_ORDER và nhãn
 * thống nhất 3 app (constants/orderStatus.js của feature consignment).
 * tools/verify-mocks.mjs kiểm danh sách này khớp tuyệt đối với module đó.
 */
export const consignmentStatuses = [
  createStatus(
    "PENDING_REVIEW",
    "Chờ duyệt",
    "Đơn vừa tạo, nhân viên đang đối chiếu thông tin kiện hàng.",
  ),
  createStatus(
    "NEED_MORE_INFO",
    "Cần bổ sung thông tin",
    "Nhân viên cần khách bổ sung hoặc sửa thông tin đơn trước khi báo giá.",
  ),
  createStatus(
    "REJECTED",
    "Đã từ chối",
    "Đơn bị từ chối do hàng nằm trong danh mục hạn chế.",
  ),
  createStatus(
    "QUOTATION_SENT",
    "Đã gửi báo giá",
    "Báo giá đã gửi cho khách, chờ khách xác nhận trong 48 giờ.",
  ),
  createStatus(
    "QUOTATION_REJECTED",
    "Khách từ chối báo giá",
    "Khách không đồng ý mức phí, đơn chờ báo giá lại.",
  ),
  createStatus(
    "WAITING_DEPOSIT",
    "Chờ đặt cọc",
    "Khách đã chấp nhận báo giá chính thức, chờ thanh toán tiền cọc.",
  ),
  createStatus(
    "DEPOSIT_PAID",
    "Đã đặt cọc",
    "Đã nhận tiền cọc, chờ nhân viên xác nhận đơn.",
  ),
  createStatus(
    "APPROVED",
    "Đã xác nhận",
    "Đơn đã được xác nhận, chờ kiện về kho gốc.",
  ),
  createStatus(
    "CHECKED_IN",
    "Đã nhập kho gốc",
    "Kho gốc đã nhận đủ kiện và phiếu nhập kho đã được duyệt.",
  ),
  createStatus(
    "IN_TRANSIT",
    "Đang vận chuyển quốc tế",
    "Hàng đang trên chặng vận chuyển quốc tế về Việt Nam.",
  ),
  createStatus(
    "ARRIVED_VN",
    "Đã về Việt Nam",
    "Lô hàng đã về tới Việt Nam.",
  ),
  createStatus(
    "ARRIVED_DESTINATION",
    "Đã tới kho VN",
    "Hàng đã tới kho Việt Nam, chờ kiểm đếm và chốt phụ phí.",
  ),
  createStatus(
    "WAITING_PAYMENT",
    "Chờ tất toán",
    "Chờ khách thanh toán phần còn lại cùng phụ phí phát sinh.",
  ),
  createStatus(
    "PAID",
    "Đã tất toán",
    "Đơn đã thanh toán đủ, sẵn sàng giao hoặc lưu kho.",
  ),
  createStatus(
    "STORED_AT_VN",
    "Đang lưu kho VN",
    "Hàng đang được lưu tại kho Việt Nam theo yêu cầu của khách.",
  ),
  createStatus(
    "DELIVERING",
    "Đang giao hàng",
    "Đơn vị giao hàng đang giao kiện tới địa chỉ người nhận.",
  ),
  createStatus(
    "DELIVERED",
    "Đã giao hàng",
    "Người nhận đã nhận đủ số kiện.",
  ),
  createStatus(
    "COMPLETED",
    "Hoàn tất",
    "Khách đã xác nhận nhận đủ hàng, đơn đóng hồ sơ.",
  ),
  createStatus(
    "CANCELLED",
    "Đã hủy",
    "Đơn bị hủy theo yêu cầu của khách hoặc nhân viên.",
  ),
];

/* =========================================================
   BẢNG GIÁ DỊCH VỤ (service pricings)
   =========================================================

   Màn "Chính sách dịch vụ" dựng cột bảng từ CHÍNH các key của object này
   (trừ vài key bị ẩn: id, servicePricingId, serviceCode, description, unit,
   unitType…). Vì vậy chỉ giữ đúng những field thật sự muốn thấy trên bảng,
   thêm field lạ là bảng mọc thêm cột khó hiểu.
   ========================================================= */

export const servicePricings = [
  {
    id: "802b0214-910f-4f37-9c78-871db543ada1",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    serviceCode: "CN_VN_STD_0_5",
    serviceName: "Ký gửi tiêu chuẩn Trung Quốc - Việt Nam (0 - 5kg)",
    description:
      "Cước đường bộ ghép xe qua cửa khẩu Hữu Nghị, áp dụng cho kiện dưới 5kg.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 5,
    price: 32000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-06-02T08:40:11.000Z",
  },
  {
    id: "f891c408-9340-4e48-9a3b-6ca0593f28c5",
    servicePricingId: "f891c408-9340-4e48-9a3b-6ca0593f28c5",
    serviceCode: "CN_VN_STD_5_20",
    serviceName: "Ký gửi tiêu chuẩn Trung Quốc - Việt Nam (5 - 20kg)",
    description:
      "Mức cước bậc thang cho kiện từ 5kg đến 20kg, đã gồm phí bốc xếp tại kho.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 5,
    maxWeight: 20,
    price: 27000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-06-02T08:40:11.000Z",
  },
  {
    id: "1eae4842-daa5-4948-aebe-38200de7c420",
    servicePricingId: "1eae4842-daa5-4948-aebe-38200de7c420",
    serviceCode: "CN_VN_STD_20_100",
    serviceName: "Ký gửi tiêu chuẩn Trung Quốc - Việt Nam (20 - 100kg)",
    description:
      "Mức cước cho lô hàng lớn, tính theo cân nặng thực tế hoặc cân quy đổi.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 20,
    maxWeight: 100,
    price: 23000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-06-02T08:40:11.000Z",
  },
  {
    id: "0406f890-8f9f-43f9-a256-5d5309494da6",
    servicePricingId: "0406f890-8f9f-43f9-a256-5d5309494da6",
    serviceCode: "CN_VN_STD_100_UP",
    serviceName: "Ký gửi tiêu chuẩn Trung Quốc - Việt Nam (trên 100kg)",
    description:
      "Giá dành cho khách sỉ, áp dụng khi tổng khối lượng một đơn vượt 100kg.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 100,
    maxWeight: 1000,
    price: 19500,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-06-02T08:40:11.000Z",
  },
  {
    id: "da966a76-49ad-41be-b8f2-3421abdd6803",
    servicePricingId: "da966a76-49ad-41be-b8f2-3421abdd6803",
    serviceCode: "CN_VN_EXP_0_5",
    serviceName: "Ký gửi hỏa tốc Trung Quốc - Việt Nam (0 - 5kg)",
    description:
      "Xe chạy thẳng ưu tiên thông quan, cam kết 2 - 3 ngày kể từ khi vào kho.",
    serviceType: "EXPRESS",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 5,
    price: 48000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-07-01T02:15:30.000Z",
  },
  {
    id: "31e31575-8b34-49f5-8cfd-df259f6bd43d",
    servicePricingId: "31e31575-8b34-49f5-8cfd-df259f6bd43d",
    serviceCode: "CN_VN_EXP_5_20",
    serviceName: "Ký gửi hỏa tốc Trung Quốc - Việt Nam (5 - 20kg)",
    description: "Cước hỏa tốc bậc 2, ưu tiên xếp xe trong ngày.",
    serviceType: "EXPRESS",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 5,
    maxWeight: 20,
    price: 42000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-07-01T02:15:30.000Z",
  },
  {
    id: "f19c4550-d1d8-4a47-86f2-052ba3eb2cc0",
    servicePricingId: "f19c4550-d1d8-4a47-86f2-052ba3eb2cc0",
    serviceCode: "CN_VN_EXP_20_UP",
    serviceName: "Ký gửi hỏa tốc Trung Quốc - Việt Nam (trên 20kg)",
    description: "Cước hỏa tốc cho lô lớn, cần đặt chỗ trước 24 giờ.",
    serviceType: "EXPRESS",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 20,
    maxWeight: 500,
    price: 37000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2025-12-18T03:12:44.000Z",
    updatedAt: "2026-07-01T02:15:30.000Z",
  },
  {
    id: "5ddcc545-3da7-42dc-865d-2ac1fd70115f",
    servicePricingId: "5ddcc545-3da7-42dc-865d-2ac1fd70115f",
    serviceCode: "CN_VN_SEA_CBM",
    serviceName: "Ký gửi đường biển Trung Quốc - Việt Nam (theo khối)",
    description:
      "Container ghép Thâm Quyến - Hải Phòng, tính theo mét khối, tối thiểu 0,5 m³.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 2000,
    price: 1850000,
    currency: "VND",
    unit: "m³",
    unitType: "VND/M3",
    effectiveDate: "2026-02-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2026-01-10T06:20:00.000Z",
    updatedAt: "2026-06-20T09:05:12.000Z",
  },
  {
    id: "096a7551-b4da-4099-adaf-cfd09f7103c4",
    servicePricingId: "096a7551-b4da-4099-adaf-cfd09f7103c4",
    serviceCode: "CN_VN_LAOCAI_STD",
    serviceName: "Ký gửi tiêu chuẩn tuyến Lào Cai",
    description: "Tuyến Hà Khẩu - Lào Cai, phù hợp hàng gom từ Côn Minh.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 300,
    price: 25500,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-03-01T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2026-02-14T04:30:00.000Z",
    updatedAt: "2026-06-20T09:05:12.000Z",
  },
  {
    id: "426fc811-e46c-4f40-86a0-24700ef91ae8",
    servicePricingId: "426fc811-e46c-4f40-86a0-24700ef91ae8",
    serviceCode: "KR_VN_AIR_STD",
    serviceName: "Ký gửi hàng không Hàn Quốc - Việt Nam",
    description:
      "Tuyến Incheon - Nội Bài, ưu tiên mỹ phẩm và thực phẩm chức năng.",
    serviceType: "EXPRESS",
    originCountry: "KR",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 100,
    price: 152000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-15T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2026-01-02T07:45:00.000Z",
    updatedAt: "2026-05-11T10:22:08.000Z",
  },
  {
    id: "76bcd8e0-93f8-4855-898e-21b6610184f2",
    servicePricingId: "76bcd8e0-93f8-4855-898e-21b6610184f2",
    serviceCode: "JP_VN_AIR_STD",
    serviceName: "Ký gửi hàng không Nhật Bản - Việt Nam",
    description: "Tuyến Osaka - Tân Sơn Nhất, gom hàng nội địa Nhật.",
    serviceType: "EXPRESS",
    originCountry: "JP",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 100,
    price: 178000,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2026-01-15T00:00:00.000Z",
    status: "ACTIVE",
    createdAt: "2026-01-02T07:45:00.000Z",
    updatedAt: "2026-05-11T10:22:08.000Z",
  },
  {
    id: "decf4b36-fb7e-425f-bb3b-194dfd8bdc50",
    servicePricingId: "decf4b36-fb7e-425f-bb3b-194dfd8bdc50",
    serviceCode: "CN_VN_STD_2025",
    serviceName: "Ký gửi tiêu chuẩn Trung Quốc - Việt Nam (biểu giá 2025)",
    description:
      "Biểu giá cũ giữ lại để đối chiếu công nợ các đơn phát sinh trước 2026.",
    serviceType: "STANDARD",
    originCountry: "CN",
    destinationCountry: "VN",
    minWeight: 0,
    maxWeight: 1000,
    price: 29500,
    currency: "VND",
    unit: "kg",
    unitType: "VND/KG",
    effectiveDate: "2025-01-01T00:00:00.000Z",
    status: "EXPIRED",
    createdAt: "2024-12-20T02:00:00.000Z",
    updatedAt: "2025-12-31T16:59:59.000Z",
  },
];

/* =========================================================
   QUY TẮC TÍNH PHÍ (pricing rules)
   =========================================================

   Đây là nguồn của bước "Dịch vụ bổ sung". Component lọc bỏ:
   - VOLUMETRIC_DIVISOR (chỉ dùng để tính cân quy đổi),
   - các mã/loại thuộc HIDDEN_RULE_CODES: DOMESTIC_FEE, PURCHASE_FEE*,
     SERVICE_PURCHASE_FEE, BUYING_FEE, VAT, IMPORT_TAX,
   - mọi mã chứa PURCHASE / VAT / IMPORT_TAX,
   - hai id bị ẩn cứng: 0385131b-… (DOMESTIC_FEE) và 35905dcf-… (PURCHASE_FEE).

   Nên danh sách dưới đây cố ý chia hai phần: nhóm HIỂN THỊ (khách chọn được)
   và nhóm BỊ ẨN (hệ thống tự tính). Thiếu nhóm hiển thị thì modal dịch vụ
   bổ sung trắng trơn, còn thiếu nhóm bị ẩn thì báo giá lại không có phí nội
   địa/thuế để đối chiếu.

   Lưu ý về isRequired: rule nào isRequired = true và KHÔNG phải thùng gỗ sẽ
   bị tự động tick và không bỏ được. Vì thế mọi dịch vụ khách được chọn ở
   nhóm hiển thị đều để isRequired = false.
   ========================================================= */

export const pricingRules = [
  /* ---------- NHÓM HIỂN THỊ CHO KHÁCH ---------- */

  {
    /*
     * Bắt buộc phải có và phải ACTIVE: PackageOptionalServices coi đóng thùng
     * gỗ là dịch vụ bắt buộc, không tìm thấy rule này là chặn nút lưu.
     *
     * KHÔNG còn mức cố định theo đơn: calculationType BY_SIZE, value null.
     * Tiền thùng gỗ lấy theo cỡ thùng khách chọn cho từng kiện trong
     * packageConfigurations (SMALL 180k … PALLET 750k, CUSTOM theo thể tích).
     */
    id: "4a447a9a-694c-43e5-8f69-bd5cf6af1f2c",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Đóng thùng gỗ bảo vệ",
    ruleCode: "WOOD_CRATE",
    ruleType: "WOOD_BOX",
    conditionType: "VND/kiện theo cỡ thùng",
    conditionValue: null,
    calculationType: "BY_SIZE",
    value: null,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "QUOTATION",
    description:
      "Tùy chọn cho từng kiện; phí tính theo cỡ thùng gỗ chọn cho kiện đó (bảng cấu hình thùng).",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    /*
     * Bảo hiểm có điều kiện MIN_DECLARED_VALUE: để mức 500.000đ cho thấp,
     * nếu để cao thì đơn mẫu không đủ điều kiện và ô chọn luôn bị khóa.
     */
    id: "f6a6cf58-2440-4feb-a6d2-bb9665eebd6d",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Bảo hiểm hàng hóa 3%",
    ruleCode: "SUR_INSURANCE_3PERCENT",
    ruleType: "INSURANCE",
    conditionType: "MIN_DECLARED_VALUE",
    conditionValue: "500000",
    calculationType: "PERCENTAGE",
    value: 3,
    minAmount: 50000,
    maxAmount: 5000000,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Bồi thường theo giá trị khai báo khi hàng mất hoặc hư hỏng trong quá trình vận chuyển.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "44735582-4783-4931-bd8d-b7fea27c211f",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Kiểm hàng chi tiết",
    ruleCode: "SUR_INSPECTION",
    ruleType: "INSPECTION",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "FIXED",
    value: 20000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Nhân viên mở kiện, đếm số lượng, chụp ảnh thực tế và gửi báo cáo trước khi đóng gói.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "46dcf4c5-518f-4c43-bc51-2175e3756a6e",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Đóng gói tăng cường",
    ruleCode: "SUR_PACKING",
    ruleType: "PACKING",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "FIXED",
    value: 25000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Quấn màng PE, chèn xốp và dán tem cảnh báo cho kiện hàng dễ móp méo.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "25044595-fb5d-4872-ae2a-3d38b89df4db",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Đóng gói lại theo yêu cầu",
    ruleCode: "SUR_REPACKING",
    ruleType: "PACKING",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "FIXED",
    value: 40000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Tháo bao bì gốc, gộp nhiều kiện nhỏ thành một kiện để giảm cân quy đổi.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "411f1de5-cbc3-473c-be52-f574ec8eda05",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Phụ phí hàng dễ vỡ",
    ruleCode: "SUR_FRAGILE",
    ruleType: "FRAGILE",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "FIXED",
    value: 55000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Xếp riêng trên sàn xe và bốc dỡ thủ công cho gốm sứ, thủy tinh, đèn trang trí.",
    createdAt: "2025-12-01T03:40:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "062ec5aa-b122-4b92-be81-7a73ec01ffaa",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Lưu kho quá thời gian miễn phí",
    ruleCode: "SUR_STORAGE",
    ruleType: "STORAGE",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "PER_UNIT",
    value: 8000,
    minAmount: null,
    maxAmount: 1500000,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Miễn phí 7 ngày đầu tại kho Việt Nam, từ ngày thứ 8 tính theo mỗi kiện mỗi ngày.",
    createdAt: "2025-12-01T03:40:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "8c6ccfb0-ca12-4608-83d3-01cc7ad9e8ff",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Hỗ trợ khai báo hải quan",
    ruleCode: "SUR_CUSTOMS",
    ruleType: "CUSTOMS",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 250000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    description:
      "Chuẩn bị hồ sơ và khai báo hải quan cho lô hàng cần chứng từ nhập khẩu chính ngạch.",
    createdAt: "2026-01-08T06:00:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    /*
     * Giữ một rule INACTIVE để giao diện có mẫu trạng thái "Ngừng áp dụng"
     * và ô chọn bị khóa — đúng như dữ liệu thật khi nghiệp vụ tạm dừng dịch vụ.
     */
    id: "9bc2513d-9bdd-4be0-9528-279c5d11e097",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Phụ phí hàng quá khổ",
    ruleCode: "SUR_OVERSIZE",
    ruleType: "OVERSIZE",
    conditionType: "VND/kiện",
    conditionValue: null,
    calculationType: "FIXED",
    value: 120000,
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "INACTIVE",
    description:
      "Áp dụng cho kiện có cạnh dài trên 150cm. Đang tạm ngưng để rà soát lại biểu phí.",
    createdAt: "2026-01-08T06:00:00.000Z",
    updatedAt: "2026-04-30T09:12:47.000Z",
  },

  /* ---------- NHÓM BỊ ẨN KHỎI DANH SÁCH DỊCH VỤ ---------- */

  {
    /*
     * ID này bị chặn cứng trong HIDDEN_RULE_IDS của cả hai component.
     * Giữ nguyên chuỗi id, đổi là rule lại lọt ra danh sách khách chọn.
     */
    id: "0385131b-214c-49b8-9de2-116d62f27111",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Phí vận chuyển nội địa Trung Quốc",
    ruleCode: "DOMESTIC_FEE",
    ruleType: "DOMESTIC_FEE",
    conditionType: "VND/kg",
    conditionValue: null,
    calculationType: "FIXED",
    value: 12000,
    minAmount: 15000,
    maxAmount: null,
    isRequired: true,
    status: "ACTIVE",
    description:
      "Phí shop nội địa gửi hàng về kho Quảng Châu, hệ thống tự cộng vào báo giá.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    /*
     * ID này bị chặn cứng trong HIDDEN_RULE_IDS của PackageOptionalServicesS1.
     */
    id: "35905dcf-4e55-4cc7-ab9a-2453e012fe74",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Phí dịch vụ mua hộ",
    ruleCode: "PURCHASE_FEE",
    ruleType: "PURCHASE_FEE",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 3,
    minAmount: 20000,
    maxAmount: 2000000,
    isRequired: true,
    status: "ACTIVE",
    description:
      "Tính trên tổng tiền hàng của đơn mua hộ, tối thiểu 20.000đ và tối đa 2.000.000đ.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "656055c6-2c08-44b8-8fc5-cf0412bb1773",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Phí mua hộ tối thiểu",
    ruleCode: "PURCHASE_FEE_FIXED",
    ruleType: "PURCHASE_FEE",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 20000,
    minAmount: null,
    maxAmount: null,
    isRequired: true,
    status: "ACTIVE",
    description:
      "Mức sàn phí mua hộ khi đơn có giá trị nhỏ, thay cho cách tính theo phần trăm.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "cc8b62e4-5907-40ed-bebf-0f5b6be63990",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Thuế giá trị gia tăng",
    ruleCode: "VAT",
    ruleType: "VAT",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 8,
    minAmount: null,
    maxAmount: null,
    isRequired: true,
    status: "ACTIVE",
    description:
      "VAT tính trên tổng phí dịch vụ, chỉ hiển thị ở phần chi tiết báo giá.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "054f4b8a-700d-4051-861a-584dee3a2fd4",
    servicePricingId: "802b0214-910f-4f37-9c78-871db543ada1",
    ruleName: "Thuế nhập khẩu ước tính",
    ruleCode: "IMPORT_TAX",
    ruleType: "IMPORT_TAX",
    conditionType: "MIN_DECLARED_VALUE",
    conditionValue: "1000000",
    calculationType: "PERCENTAGE",
    value: 10,
    minAmount: null,
    maxAmount: null,
    isRequired: true,
    status: "ACTIVE",
    description:
      "Ước tính cho lô hàng chính ngạch có giá trị khai báo từ 1.000.000đ trở lên.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    /*
     * Hệ số quy đổi thể tích. Không hiển thị trong danh sách dịch vụ nhưng
     * BẮT BUỘC phải còn ACTIVE và value > 0, vì getVolumetricDivisorRule ném
     * lỗi nếu không tìm thấy, kéo theo màn hình tính cước hỏng.
     */
    id: "adde2878-6b3c-4b4e-a0b5-7daaeca095c6",
    servicePricingId: null,
    ruleName: "Hệ số quy đổi thể tích",
    ruleCode: "VOLUMETRIC_DIVISOR",
    ruleType: "VOLUMETRIC_DIVISOR",
    conditionType: null,
    conditionValue: null,
    calculationType: "FORMULA",
    value: 6000,
    minAmount: null,
    maxAmount: null,
    isRequired: true,
    status: "ACTIVE",
    description:
      "Cân quy đổi = dài × rộng × cao (cm) / 6000. Lấy số lớn hơn giữa cân thực và cân quy đổi.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },

  /* ---------- THAM SỐ HỆ THỐNG & PHÍ KHI TẤT TOÁN ----------
   *
   * Gộp từ danh mục "phụ phí dịch vụ" cũ (additionalServiceFees) để chỉ còn
   * MỘT danh mục phí. Không phải dịch vụ khách tự chọn: ruleType
   * SYSTEM_PARAMETER / SETTLEMENT_FEE nằm trong HIDDEN_RULE_CODES của modal
   * dịch vụ bổ sung. `unit` giữ lại để getAdditionalServiceFees trả đúng
   * hình dạng cũ; `applyAt` cho biết áp khi báo giá hay khi tất toán.
   */

  {
    /*
     * Tỷ lệ cọc đơn ký gửi. Chỉ DUY NHẤT một rule mang mã này (mua hộ dùng
     * PURCHASE_DEPOSIT_RATE) vì getDepositRate dò bằng .find.
     */
    id: "2f6c9b31-7a48-4d15-9c02-8b3e6f1d7a90",
    servicePricingId: null,
    ruleName: "Tỷ lệ đặt cọc đơn ký gửi",
    ruleCode: "DEPOSIT_RATE",
    ruleType: "SYSTEM_PARAMETER",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 30,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "QUOTATION",
    description:
      "Khách đặt cọc 30% tổng báo giá khi chấp nhận báo giá chính thức.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "6a1f4c8d-92b7-4e30-8f56-1d7c3a0e9b42",
    servicePricingId: null,
    ruleName: "Tỷ lệ đặt cọc đơn mua hộ",
    ruleCode: "PURCHASE_DEPOSIT_RATE",
    ruleType: "SYSTEM_PARAMETER",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 70,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "QUOTATION",
    description:
      "Đơn mua hộ cọc 70% tiền hàng để nhân viên tiến hành đặt mua trên sàn.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    /* Số ngày miễn phí lưu kho VN; đơn giá sau đó là rule SUR_STORAGE. */
    id: "9d5e2a07-4b61-4c93-a7f8-0e2b5c1d6a83",
    servicePricingId: null,
    ruleName: "Số ngày lưu kho miễn phí",
    ruleCode: "FREE_STORAGE_DAYS",
    ruleType: "SYSTEM_PARAMETER",
    conditionType: null,
    conditionValue: null,
    calculationType: "FIXED",
    value: 7,
    unit: "ngày",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Hàng về kho Việt Nam được giữ miễn phí 7 ngày trước khi tính phí lưu kho.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "7e3a9d24-6f10-4b58-9c7d-2a5e8b1f4c06",
    servicePricingId: null,
    ruleName: "Phí xử lý đơn hàng",
    ruleCode: "HANDLING_FEE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 30000,
    unit: "VND/đơn",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Chi phí nhập liệu, dán mã và điều phối kiện hàng tại kho trung chuyển.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "1b6d4f83-5c27-49ea-8046-3f9a7c2b5e18",
    servicePricingId: null,
    ruleName: "Phí giao hàng nội thành",
    ruleCode: "DELIVERY_FEE_INNER_CITY",
    ruleType: "SETTLEMENT_FEE",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 35000,
    unit: "VND/đơn",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Giao trong nội thành Hà Nội và TP. Hồ Chí Minh cho kiện dưới 10kg.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "8f2c5e91-3a74-4d06-b8e2-6c1d9a4f0000",
    servicePricingId: null,
    ruleName: "Phí giao hàng liên tỉnh",
    ruleCode: "DELIVERY_FEE_PROVINCE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 65000,
    unit: "VND/đơn",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Giao tới các tỉnh ngoài Hà Nội và TP. Hồ Chí Minh, chưa gồm phí vùng sâu vùng xa.",
    createdAt: "2025-11-05T02:10:00.000Z",
    updatedAt: "2026-05-28T08:15:03.000Z",
  },
  {
    id: "3e7b1a58-9d42-4f6c-a015-8b2e6c4d7f39",
    servicePricingId: null,
    ruleName: "Phụ phí vùng xa",
    ruleCode: "REMOTE_AREA_FEE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: "VND/đơn",
    conditionValue: null,
    calculationType: "FIXED",
    value: 45000,
    unit: "VND/đơn",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Áp dụng cho địa chỉ thuộc huyện đảo và các xã miền núi ngoài tuyến giao thường.",
    createdAt: "2026-01-08T06:00:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "5a9c3d76-2e18-4b40-8f7a-1d6b5e2c9047",
    servicePricingId: null,
    ruleName: "Phí thu hộ COD",
    ruleCode: "COD_FEE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 1.5,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Tính trên số tiền thu hộ khi khách chọn thanh toán lúc nhận hàng.",
    createdAt: "2026-01-08T06:00:00.000Z",
    updatedAt: "2026-06-12T04:22:31.000Z",
  },
  {
    id: "6d4e8b02-7f51-4c39-a6b8-2e5c9a1d7f43",
    servicePricingId: null,
    ruleName: "Phụ phí nhiên liệu",
    ruleCode: "FUEL_SURCHARGE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 2,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "QUOTATION",
    description:
      "Điều chỉnh theo giá dầu, tính trên cước vận chuyển quốc tế của đơn.",
    createdAt: "2026-02-01T01:00:00.000Z",
    updatedAt: "2026-07-05T03:30:00.000Z",
  },
  {
    id: "9c1a6e30-8b47-4d52-9f03-7a2d5b8c1e64",
    servicePricingId: null,
    ruleName: "Phí hủy đơn sau khi đã đặt cọc",
    ruleCode: "CANCEL_FEE",
    ruleType: "SYSTEM_PARAMETER",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 5,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "ACTIVE",
    applyAt: "SETTLEMENT",
    description:
      "Khấu trừ khi khách hủy đơn sau khi đã đặt cọc (chỉ hủy được tới hết bước Đã xác nhận).",
    createdAt: "2026-02-01T01:00:00.000Z",
    updatedAt: "2026-07-05T03:30:00.000Z",
  },
  {
    /*
     * Một rule đã tắt để có mẫu dữ liệu cho tham số activeOnly: gọi
     * getAdditionalServiceFees({ activeOnly: true }) thì rule này bị loại.
     */
    id: "0b8d2f47-1c93-4a65-8e70-5d3a9c6b2f18",
    servicePricingId: null,
    ruleName: "Phụ phí cao điểm cuối năm",
    ruleCode: "PEAK_SEASON_FEE",
    ruleType: "SETTLEMENT_FEE",
    conditionType: null,
    conditionValue: null,
    calculationType: "PERCENTAGE",
    value: 10,
    unit: "%",
    minAmount: null,
    maxAmount: null,
    isRequired: false,
    status: "INACTIVE",
    applyAt: "QUOTATION",
    description:
      "Chỉ bật trong đợt cao điểm trước Tết Nguyên đán, hiện đang tắt.",
    createdAt: "2025-11-20T02:00:00.000Z",
    updatedAt: "2026-03-02T07:10:25.000Z",
  },
];

/* =========================================================
   CẤU HÌNH ĐÓNG THÙNG
   =========================================================

   `id` phải là UUID hợp lệ vì consignmentApi kiểm tra packageConfigurationId
   theo regex GUID trước khi gửi đơn.

   Đây cũng là bảng PHÍ THÙNG GỖ THEO CỠ (rule WOOD_CRATE không còn mức cố
   định theo đơn): SMALL 180k, MEDIUM 280k, LARGE 430k, EXTRA_LARGE 620k,
   LONG_BOX 540k, PALLET 750k, CUSTOM theo thể tích (pricing-rules.md).

   Riêng bản ghi CUSTOM: giao diện nhận diện qua configCode === "CUSTOM" và
   hiểu packageFee là ĐƠN GIÁ TRÊN 1.000 cm³ chứ không phải giá trọn gói,
   nên kích thước để 10×10×10 (đúng 1.000 cm³) và maxWeight để 0.
   ========================================================= */

export const packageConfigurations = [
  {
    id: "89c202fb-6fc3-4736-8c7c-7a93b1e05a5d",
    packageConfigurationId: "89c202fb-6fc3-4736-8c7c-7a93b1e05a5d",
    configCode: "SMALL",
    configName: "Thùng gỗ cỡ nhỏ",
    length: 40,
    width: 30,
    height: 30,
    maxWeight: 20,
    packageFee: 180000,
    status: "ACTIVE",
  },
  {
    id: "5dc817d3-dc70-46ae-8d23-e049b3abd7c4",
    packageConfigurationId: "5dc817d3-dc70-46ae-8d23-e049b3abd7c4",
    configCode: "MEDIUM",
    configName: "Thùng gỗ cỡ vừa",
    length: 60,
    width: 40,
    height: 40,
    maxWeight: 45,
    packageFee: 280000,
    status: "ACTIVE",
  },
  {
    id: "c3d072e9-04b7-4efd-8d7a-bdff97e66555",
    packageConfigurationId: "c3d072e9-04b7-4efd-8d7a-bdff97e66555",
    configCode: "LARGE",
    configName: "Thùng gỗ cỡ lớn",
    length: 80,
    width: 60,
    height: 50,
    maxWeight: 80,
    packageFee: 430000,
    status: "ACTIVE",
  },
  {
    id: "7b372f12-2fe7-4a19-9a68-88c6436639ba",
    packageConfigurationId: "7b372f12-2fe7-4a19-9a68-88c6436639ba",
    configCode: "EXTRA_LARGE",
    configName: "Thùng gỗ cỡ đại",
    length: 100,
    width: 80,
    height: 60,
    maxWeight: 120,
    packageFee: 620000,
    status: "ACTIVE",
  },
  {
    id: "5825b633-ecac-465b-9212-f5f0040b29c5",
    packageConfigurationId: "5825b633-ecac-465b-9212-f5f0040b29c5",
    configCode: "LONG_BOX",
    configName: "Thùng gỗ dạng dài",
    length: 150,
    width: 40,
    height: 40,
    maxWeight: 90,
    packageFee: 540000,
    status: "ACTIVE",
  },
  {
    id: "b1d4e0d7-3c62-4c8a-9a6f-2e5a71c40f18",
    packageConfigurationId: "b1d4e0d7-3c62-4c8a-9a6f-2e5a71c40f18",
    configCode: "PALLET",
    configName: "Đóng pallet gỗ",
    length: 120,
    width: 100,
    height: 15,
    maxWeight: 500,
    packageFee: 750000,
    status: "ACTIVE",
  },
  {
    id: "d3f8a2b6-5e41-4f7c-8b90-6c1a7d2e4f55",
    packageConfigurationId: "d3f8a2b6-5e41-4f7c-8b90-6c1a7d2e4f55",
    configCode: "CUSTOM",
    configName: "Thùng gỗ tùy chỉnh theo kiện",
    length: 10,
    width: 10,
    height: 10,
    maxWeight: 0,
    packageFee: 1200,
    status: "ACTIVE",
  },
];

/* =========================================================
   HÀNG HÓA HẠN CHẾ / BỊ CẤM
   =========================================================

   Tooltip cảnh báo dò tên theo restrictedItemName → itemName → name và mô tả
   theo description → reason, nên giữ đủ cả `restrictedItemName` lẫn `name`
   để không chỗ nào hiện "Mặt hàng hạn chế 1".
   ========================================================= */

const createRestrictedItem = (id, code, name, category, description) => ({
  id,
  restrictedItemId: id,
  code,
  restrictedItemName: name,
  name,
  category,
  description,
  status: "ACTIVE",
});

export const restrictedItems = [
  createRestrictedItem(
    "a1c3e5f7-2b48-4d69-9a01-3c5e7b9d1f24",
    "BATTERY_LITHIUM",
    "Pin và ắc quy lithium rời",
    "Hàng nguy hiểm",
    "Không nhận pin rời, cục sạc dự phòng và ắc quy chưa gắn trong thiết bị.",
  ),
  createRestrictedItem(
    "b2d4f608-3c59-4e70-8b12-4d6f8c0e2a35",
    "FLAMMABLE_LIQUID",
    "Chất lỏng dễ cháy",
    "Hàng nguy hiểm",
    "Xăng, cồn, dung môi, nước hoa dung tích lớn đều bị từ chối vận chuyển.",
  ),
  createRestrictedItem(
    "c3e50719-4d6a-4f81-9c23-5e7a9d1f3b46",
    "COMPRESSED_GAS",
    "Bình khí nén, bình gas",
    "Hàng nguy hiểm",
    "Bình cứu hỏa, bình gas mini, bình oxy không được đi đường bộ lẫn hàng không.",
  ),
  createRestrictedItem(
    "d4f6182a-5e7b-4092-8d34-6f8b0e2a4c57",
    "EXPLOSIVE",
    "Pháo và vật liệu nổ",
    "Hàng cấm",
    "Pháo hoa, pháo nổ, kíp nổ thuộc danh mục cấm tuyệt đối theo pháp luật Việt Nam.",
  ),
  createRestrictedItem(
    "e507293b-6f8c-41a3-9e45-708c1f3b5d68",
    "WEAPON",
    "Vũ khí và công cụ hỗ trợ",
    "Hàng cấm",
    "Súng, dao găm, roi điện, còng số 8 và các công cụ hỗ trợ đều bị cấm.",
  ),
  createRestrictedItem(
    "f618304c-708d-42b4-8f56-819d2a4c6e79",
    "NARCOTICS",
    "Ma túy và tiền chất",
    "Hàng cấm",
    "Mọi chất gây nghiện và tiền chất ma túy đều bị từ chối và báo cơ quan chức năng.",
  ),
  createRestrictedItem(
    "0729415d-819e-43c5-9067-92ae3b5d7f8a",
    "COUNTERFEIT_GOODS",
    "Hàng giả, hàng nhái thương hiệu",
    "Hàng cấm",
    "Hàng gắn logo thương hiệu không có giấy ủy quyền sẽ bị giữ lại tại cửa khẩu.",
  ),
  createRestrictedItem(
    "183a526e-92af-44d6-8178-a3bf4c6e809b",
    "CURRENCY",
    "Tiền mặt, vàng, ngoại tệ",
    "Hàng cấm",
    "Không nhận tiền mặt, vàng miếng, trang sức vàng và ngoại tệ dưới mọi hình thức.",
  ),
  createRestrictedItem(
    "294b637f-a3b0-45e7-9289-b4c05d7f91ac",
    "LIVE_ANIMAL",
    "Động vật sống và thực vật tươi",
    "Hàng cấm",
    "Động vật sống, cây giống, hạt giống chưa kiểm dịch không được vận chuyển.",
  ),
  createRestrictedItem(
    "3a5c748a-b4c1-46f8-839a-c5d16e8a02bd",
    "FRESH_FOOD",
    "Thực phẩm tươi sống",
    "Hàng hạn chế",
    "Thịt, hải sản, rau củ tươi không được nhận vì thời gian vận chuyển kéo dài.",
  ),
  createRestrictedItem(
    "4b6d859b-c5d2-4709-94ab-d6e27f9b13ce",
    "PRESCRIPTION_MEDICINE",
    "Thuốc kê đơn",
    "Hàng hạn chế",
    "Chỉ nhận thực phẩm chức năng có nhãn mác rõ ràng, không nhận thuốc kê đơn.",
  ),
  createRestrictedItem(
    "5c7e96ac-d6e3-481a-a5bc-e7f380ac24df",
    "COSMETIC_LIQUID",
    "Mỹ phẩm dạng lỏng trên 100ml",
    "Hàng hạn chế",
    "Nước hoa, toner, tinh dầu dung tích lớn cần khai báo trước và chỉ đi đường bộ.",
  ),
  createRestrictedItem(
    "6d80a7bd-e7f4-492b-b6cd-f804910d35e0",
    "MAGNETIC_GOODS",
    "Hàng có từ tính mạnh",
    "Hàng hạn chế",
    "Nam châm, loa công suất lớn phải bọc chống nhiễu mới được xếp lên xe.",
  ),
  createRestrictedItem(
    "7e91b8ce-f805-4a3c-87de-0915a21e46f1",
    "POWDER_GOODS",
    "Hàng dạng bột không nhãn mác",
    "Hàng hạn chế",
    "Bột không có bao bì và nhãn mác gốc sẽ bị hải quan giữ lại kiểm tra.",
  ),
  createRestrictedItem(
    "8f02c9df-0916-4b4d-98ef-1a26b32f5702",
    "BRANDED_ELECTRONICS",
    "Điện thoại và máy tính bảng nguyên chiếc",
    "Hàng hạn chế",
    "Cần hóa đơn thương mại và phải đi theo tuyến chính ngạch, phụ phí riêng.",
  ),
  createRestrictedItem(
    "9013dae0-1a27-4c5e-a9f0-2b37c4306813",
    "TOBACCO_ALCOHOL",
    "Rượu, bia và thuốc lá",
    "Hàng hạn chế",
    "Chỉ nhận theo lô có giấy phép nhập khẩu, không nhận hàng lẻ của khách cá nhân.",
  ),
  createRestrictedItem(
    "a124ebf1-2b38-4d6f-ba01-3c48d5417924",
    "SECOND_HAND_CLOTHES",
    "Quần áo đã qua sử dụng",
    "Hàng hạn chế",
    "Hàng thùng cần đóng kiện riêng, khai báo đúng loại và chịu phí kiểm hóa.",
  ),
  createRestrictedItem(
    "b235fc02-3c49-4e70-8b12-4d59e6528a35",
    "PUBLICATION",
    "Ấn phẩm văn hóa chưa kiểm duyệt",
    "Hàng hạn chế",
    "Sách, đĩa, tranh ảnh phải qua kiểm duyệt nội dung trước khi thông quan.",
  ),
];

/* =========================================================
   TIỆN ÍCH TRA CỨU NHANH
   =========================================================

   Ba mock đều cần tra ngược từ mã sang bản ghi. Đặt sẵn ở đây để không mỗi
   nơi tự viết một kiểu rồi lệch nhau khi dữ liệu đổi.
   ========================================================= */

export const findPricingRuleByCode = (ruleCode) => {
  const normalizedCode = String(ruleCode || "")
    .trim()
    .toUpperCase();

  return (
    pricingRules.find((rule) => rule.ruleCode === normalizedCode) || null
  );
};

export const findPricingRuleById = (ruleId) => {
  const normalizedId = String(ruleId || "")
    .trim()
    .toLowerCase();

  return (
    pricingRules.find(
      (rule) => rule.id.toLowerCase() === normalizedId,
    ) || null
  );
};

export const findPackageConfigurationById = (configurationId) => {
  const normalizedId = String(configurationId || "")
    .trim()
    .toLowerCase();

  return (
    packageConfigurations.find(
      (configuration) => configuration.id.toLowerCase() === normalizedId,
    ) || null
  );
};

export const findServicePricingById = (servicePricingId) => {
  const normalizedId = String(servicePricingId || "")
    .trim()
    .toLowerCase();

  return (
    servicePricings.find(
      (pricing) => pricing.id.toLowerCase() === normalizedId,
    ) || null
  );
};

export default {
  consignmentRoutes,
  shippingOptions,
  productTypes,
  consignmentStatuses,
  pricingRules,
  servicePricings,
  packageConfigurations,
  restrictedItems,
  findPricingRuleByCode,
  findPricingRuleById,
  findPackageConfigurationById,
  findServicePricingById,
};
