/* =========================================================
   data/consignments.js

   Bộ dữ liệu đơn KÝ GỬI (consignment) dùng chung cho cả app UI-only.

   Đây là nguồn dữ liệu liên tính năng: mock của consignment, warehouse,
   history, payment, receiving, delivery và settlement đều đọc lại file này.
   Vì vậy orderId / consignmentCode phải cố định tuyệt đối — module khác
   tham chiếu tới đơn hàng bằng đúng mấy chuỗi đó.

   Shape của từng bản ghi bám theo những gì component thực sự đọc:
   - ConsignmentList / ConsignmentListCheck / ConsignmentHistoryList
     đọc: orderId, orderCode, consignmentCode, trackingCode, status, route,
     consignmentType, receiverName/Phone/Address, requiresInspection,
     totalWeight, totalVolume, itemNames, createdAt, updatedAt.
   - ConsignmentListDetail + ConsignmentListDetailUI đọc thêm: orderType,
     customer{fullName,email,phone}, items[], quotation{}, pricingRuleIds,
     note, defaultDestinationHandlingText, packageConfiguration của từng kiện.
   - QuotationDetail đọc quotation{quotationId, quoteType, status,
     estimatedFreightCharge, domesticShippingFee, serviceFee, taxAndDuty,
     vat, importTax, totalEstimatedCost, additionalFees[], expiredAt...}.

   Một bản ghi ở đây là bản ghi ĐẦY ĐỦ (list + detail). Mock danh sách cứ
   trả nguyên object, các trang danh sách chỉ đọc phần field tóm tắt của nó.
   ========================================================= */

import { isoDaysAgo, stableUuid } from "../mockUtils";
import catalog from "./catalog";

/* =========================================================
   HẰNG SỐ DÙNG CHUNG
   ========================================================= */

/** Khách hàng đang đăng nhập trong bản demo. Mock auth/profile nên dùng lại. */
export const MOCK_CUSTOMER = Object.freeze({
  customerId: stableUuid("customer-main"),
  fullName: "Nguyễn Thanh Hà",
  email: "thanhha.nguyen@vcl-demo.vn",
  phone: "0906214778",
});

/**
 * GUID của các pricing rule, lấy thẳng từ catalog theo ruleCode.
 *
 * KHÔNG tự sinh GUID riêng ở đây: màn chi tiết ký gửi tra dịch vụ bổ sung
 * theo pricingRuleId trước, ID không khớp danh mục là nó đẻ thêm một dòng
 * "Dịch vụ chưa xác định" nằm cạnh dòng đúng.
 */
const ruleIdOf = (ruleCode) =>
  catalog?.findPricingRuleByCode?.(ruleCode)?.id ||
  /* Fallback tất định, phòng khi catalog đổi hoặc thiếu mã. */
  stableUuid(`pricing-rule-${ruleCode}`);

export const PRICING_RULE_IDS = Object.freeze({
  WOOD_CRATE: ruleIdOf("WOOD_CRATE"),
  SUR_PACKING: ruleIdOf("SUR_PACKING"),
  SUR_INSPECTION: ruleIdOf("SUR_INSPECTION"),
  SUR_INSURANCE_3PERCENT: ruleIdOf("SUR_INSURANCE_3PERCENT"),
  DOMESTIC_FEE: ruleIdOf("DOMESTIC_FEE"),
  VAT: ruleIdOf("VAT"),
  IMPORT_TAX: ruleIdOf("IMPORT_TAX"),
  VOLUMETRIC_DIVISOR: ruleIdOf("VOLUMETRIC_DIVISOR"),
});

/*
 * Cấu hình thùng gỗ và loại sản phẩm đều thuộc catalog. Fixture chỉ tra lại
 * theo mã, để cả app chỉ có một danh mục duy nhất.
 */
const packageConfigByCode = new Map(
  (catalog?.packageConfigurations || []).map((configuration) => [
    configuration.configCode,
    configuration,
  ])
);

const productTypeByCode = new Map(
  (catalog?.productTypes || []).map((type) => [
    type.productTypeCode,
    type,
  ])
);

/* Tên tuyến lấy đúng theo catalog để trùng với dropdown chọn tuyến. */
const ROUTES = {
  main: "Trung Quốc → Việt Nam",
  laocai: "Trung Quốc → Việt Nam (Lào Cai)",
  mongcai: "Trung Quốc → Việt Nam (Móng Cái)",
  sea: "Trung Quốc → Việt Nam (đường biển)",
};

/**
 * Mọi mức phí/hệ số đều đọc từ pricing rule trong catalog.
 *
 * Màn chi tiết hiển thị % thuế và phí thùng gỗ lấy thẳng từ bảng giá, nên nếu
 * fixture gõ số riêng thì hai panel trên cùng một trang sẽ nói hai con số khác
 * nhau. Có fallback để dữ liệu vẫn dựng được khi catalog thiếu mã.
 */
const ruleValueOf = (ruleCode, fallback) => {
  const value = Number(
    catalog?.findPricingRuleByCode?.(ruleCode)?.value
  );

  return Number.isFinite(value) ? value : fallback;
};

/* cm³ / 6000 = kg quy đổi. */
const VOLUMETRIC_DIVISOR = ruleValueOf("VOLUMETRIC_DIVISOR", 6000);

/* VAT dịch vụ logistics = (cước + phí dịch vụ) × 8%, đúng như tooltip trên UI. */
const VAT_RATE = ruleValueOf("VAT", 8) / 100;

const IMPORT_TAX_RATE = ruleValueOf("IMPORT_TAX", 10) / 100;

const INSPECTION_UNIT_FEE = ruleValueOf("SUR_INSPECTION", 20000);
const PACKING_UNIT_FEE = ruleValueOf("SUR_PACKING", 25000);
const INSURANCE_PERCENT = ruleValueOf("SUR_INSURANCE_3PERCENT", 3);

/*
 * Hạn hiệu lực của báo giá còn chờ khách xác nhận phải nằm ở TƯƠNG LAI:
 * QuotationDetail chỉ hiện nút "Chấp nhận báo giá" / "Xác nhận & thanh toán"
 * khi báo giá chưa hết hạn. Ngày cứng sẽ tự hết hạn sau vài tuần và làm mất
 * luôn nút bấm, nên hạn của mấy đơn này được tính theo thời điểm chạy.
 */
const ACTIVE_QUOTATION_EXPIRES_AT = isoDaysAgo(-10);

/* =========================================================
   FACTORY
   ========================================================= */

const round = (value, digits = 4) => {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
};

const buildImageUrls = (seed, count = 2) =>
  Array.from(
    { length: count },
    (_, index) =>
      `https://picsum.photos/seed/vcl-${seed}-${index + 1}/640/640`
  );

/**
 * Một kiện hàng trong đơn ký gửi.
 *
 * declaredValue là giá trị khai báo của CẢ DÒNG (đã nhân số lượng),
 * khớp cách cột "Giá trị kiện hàng" trên bảng chi tiết đang hiển thị.
 */
const createItem = ({
  seed,
  productName,
  productTypeCode,
  quantity,
  weight,
  length,
  width,
  height,
  declaredValue,
  domesticTrackingCode = null,
  packageConfigCode = null,
  note = "",
  imageCount = 2,
}) => {
  const itemId = stableUuid(`consignment-item-${seed}`);

  const productType = productTypeByCode.get(productTypeCode);

  const packageConfiguration = packageConfigCode
    ? packageConfigByCode.get(packageConfigCode) || null
    : null;

  const referenceUrls = buildImageUrls(seed, imageCount);

  return {
    /* id và itemId cùng giá trị: rowKey của bảng dò id trước, itemId sau. */
    id: itemId,
    itemId,
    orderItemId: itemId,

    productName,

    productType: productType?.productTypeName || "Hàng hoá tổng hợp",
    productTypeCode: productType?.productTypeCode || null,
    productTypeName:
      productType?.productTypeName || "Hàng hoá tổng hợp",
    productTypeId: productType?.productTypeId || null,

    quantity,
    weight,
    length,
    width,
    height,
    declaredValue,

    /* Luôn là string[] — API tạo đơn từ chối mọi kiểu dữ liệu khác. */
    referenceUrls,
    referenceUrl: referenceUrls[0],
    imageUrls: referenceUrls,

    domesticTrackingCode,

    packageConfigurationId: packageConfiguration?.id || null,
    packageConfiguration,

    note,
  };
};

/**
 * Báo giá của một đơn ký gửi.
 *
 * Mọi con số đều được TÍNH RA từ khối lượng và giá trị khai báo của chính đơn,
 * không gõ tay: màn chi tiết báo giá đối chiếu chéo các khoản với nhau
 * (serviceFee phải bằng tổng phụ phí, totalEstimatedCost phải bằng tổng các
 * khoản cộng lại) và bật cảnh báo "số liệu lệch" nếu sai quá 1đ.
 */
const createQuotation = ({
  seed,
  orderId,
  consignmentCode,
  consignmentType,
  totalWeight,
  volumetricWeight,
  chargeableWeight,
  declaredValue,
  status = "APPROVED",
  quoteType = "ESTIMATE",
  freightUnitPrice,
  domesticShippingFee,
  importTaxRate = IMPORT_TAX_RATE,
  surcharges = [],
  createdAt,
  expiredAt,
  salesNote = "",
}) => {
  const quotationId = stableUuid(`consignment-quotation-${seed}`);

  const estimatedFreightCharge = Math.round(
    chargeableWeight * freightUnitPrice
  );

  /* Phụ phí theo % được quy ra tiền tại đây để UI không phải tự nhân lại. */
  const resolvedSurcharges = surcharges.map((fee) => ({
    ...fee,
    amount:
      fee.amount ??
      Math.round((declaredValue * fee.percentOfDeclared) / 100),
  }));

  const serviceFee = resolvedSurcharges.reduce(
    (total, fee) => total + fee.amount,
    0
  );

  const importTax = Math.round(declaredValue * importTaxRate);

  const vat = Math.round(
    (estimatedFreightCharge + serviceFee) * VAT_RATE
  );

  const taxAndDuty = importTax + vat;

  const totalEstimatedCost =
    estimatedFreightCharge +
    domesticShippingFee +
    serviceFee +
    taxAndDuty;

  /*
   * additionalFees chỉ chứa: dịch vụ chính, các phụ phí thật, rồi hai dòng
   * tổng SERVICE_FEE và TAX_DUTY. Không đưa DOMESTIC_SHIPPING_FEE / VAT /
   * IMPORT_TAX vào đây: chúng không nằm trong BASE_COST_FEE_CODES nên sẽ bị
   * đếm thêm một lần nữa vào tổng phụ phí và làm lệch bảng đối chiếu.
   */
  const additionalFees = [
    {
      id: stableUuid(`consignment-fee-${seed}-main`),
      pricingRuleId: PRICING_RULE_IDS.MAIN_SERVICE,
      code: "MAIN_SERVICE",
      feeName: "Cước vận chuyển quốc tế",
      feeType: "MAIN_SERVICE",
      feeCalculationType: "PER_KG",
      unitPrice: freightUnitPrice,
      quantity: chargeableWeight,
      unitNoun: "kg",
      amount: estimatedFreightCharge,
      value: freightUnitPrice,
      isRequired: true,
      enabled: true,
      note: `Đơn giá theo tuyến, tính trên ${chargeableWeight} kg tính cước.`,
      createdAt,
    },

    ...resolvedSurcharges.map((fee, index) => ({
      id: stableUuid(`consignment-fee-${seed}-${index}`),
      pricingRuleId: PRICING_RULE_IDS[fee.code] || null,
      code: fee.code,
      feeName: fee.feeName,
      feeType: fee.feeType || "SURCHARGE",
      feeCalculationType:
        fee.feeCalculationType ||
        (fee.percentOfDeclared ? "PERCENTAGE" : "FIXED"),
      unitPrice: fee.unitPrice ?? fee.percentOfDeclared ?? fee.amount,
      quantity: fee.quantity ?? 1,
      unitNoun: fee.unitNoun || "",
      amount: fee.amount,
      value: fee.percentOfDeclared ?? fee.amount,
      isRequired: Boolean(fee.isRequired),
      enabled: true,
      note: fee.note || "",
      createdAt,
    })),

    {
      id: stableUuid(`consignment-fee-${seed}-service`),
      pricingRuleId: null,
      code: "SERVICE_FEE",
      feeName: "Tổng phí dịch vụ",
      feeType: "SERVICE_FEE",
      feeCalculationType: "FIXED",
      unitPrice: serviceFee,
      quantity: 1,
      unitNoun: "đơn",
      amount: serviceFee,
      value: serviceFee,
      isRequired: true,
      enabled: true,
      note: "Tổng các dịch vụ bổ sung đã chọn.",
      createdAt,
    },

    {
      id: stableUuid(`consignment-fee-${seed}-tax`),
      pricingRuleId: null,
      code: "TAX_DUTY",
      feeName: "Thuế và phí nhập khẩu",
      feeType: "TAX_DUTY",
      feeCalculationType: "PERCENTAGE",
      unitPrice: null,
      quantity: 1,
      unitNoun: "đơn",
      amount: taxAndDuty,
      value: taxAndDuty,
      isRequired: true,
      enabled: true,
      note: "Gồm thuế nhập khẩu và VAT dịch vụ logistics.",
      createdAt,
    },
  ];

  return {
    quotationId,
    quotationCode: `BG-${consignmentCode.replace("VCL-", "")}`,
    orderId,
    consignmentCode,
    consignmentType,

    quoteType,
    status,

    totalWeight,
    volumetricWeight,
    chargeableWeight,

    estimatedFreightCharge,
    domesticShippingFee,
    serviceFee,
    importTax,
    vat,
    taxAndDuty,
    totalEstimatedCost,

    additionalFees,

    salesNote,

    createdAt,
    updatedAt: createdAt,
    expiredAt,
  };
};

/**
 * Một đơn ký gửi hoàn chỉnh (dữ liệu list + detail nằm chung một object).
 *
 * Tổng khối lượng, thể tích và khối lượng quy đổi được cộng từ items, và
 * chính mấy con số đó được truyền tiếp vào báo giá — để bảng "Thông tin lô
 * hàng" và bảng báo giá không bao giờ nói hai con số khác nhau.
 */
const createConsignment = ({
  seed,
  code,
  status,
  consignmentType,
  route,
  receiver,
  items,
  createdAt,
  updatedAt = createdAt,
  statusUpdatedAt = updatedAt,
  requiresInspection = false,
  requiresPacking = false,
  requiresWoodenCrate = false,
  requiresInsurance = false,
  destinationHandling = "DIRECT_DELIVERY",
  note = "",
  trackingCode = null,
  quotation = null,
  cancelledAt = null,
  cancelReason = null,
  rejectionReason = null,
}) => {
  const orderId = stableUuid(`consignment-order-${seed}`);

  const totalWeight = round(
    items.reduce(
      (total, item) => total + item.weight * item.quantity,
      0
    ),
    2
  );

  const totalVolume = items.reduce(
    (total, item) =>
      total +
      item.length * item.width * item.height * item.quantity,
    0
  );

  const volumetricWeight = round(totalVolume / VOLUMETRIC_DIVISOR);

  /* Cước tính theo số lớn hơn giữa cân thật và cân quy đổi. */
  const chargeableWeight = round(
    Math.max(totalWeight, volumetricWeight)
  );

  const declaredValue = items.reduce(
    (total, item) => total + item.declaredValue,
    0
  );

  const pricingRuleIds = [
    requiresWoodenCrate && PRICING_RULE_IDS.WOOD_CRATE,
    requiresPacking && PRICING_RULE_IDS.SUR_PACKING,
    requiresInspection && PRICING_RULE_IDS.SUR_INSPECTION,
    requiresInsurance && PRICING_RULE_IDS.SUR_INSURANCE_3PERCENT,
  ].filter(Boolean);

  const pricingRuleCodes = [
    requiresWoodenCrate && "WOOD_CRATE",
    requiresPacking && "SUR_PACKING",
    requiresInspection && "SUR_INSPECTION",
    requiresInsurance && "SUR_INSURANCE_3PERCENT",
  ].filter(Boolean);

  const resolvedQuotation = quotation
    ? createQuotation({
        seed,
        orderId,
        consignmentCode: code,
        consignmentType,
        totalWeight,
        volumetricWeight,
        chargeableWeight,
        declaredValue,
        ...quotation,
      })
    : null;

  return {
    orderId,
    /* Trang danh sách tìm kiếm cả orderCode lẫn consignmentCode. */
    orderCode: code,
    consignmentCode: code,
    trackingCode: trackingCode || code,
    orderType: "CONSIGNMENT",

    status,
    consignmentType,
    shippingOption: consignmentType,
    route,

    receiverName: receiver.name,
    receiverPhone: receiver.phone,
    receiverAddress: receiver.address,

    customer: { ...MOCK_CUSTOMER },
    customerName: MOCK_CUSTOMER.fullName,
    customerPhone: MOCK_CUSTOMER.phone,
    customerEmail: MOCK_CUSTOMER.email,

    requiresInspection,
    requiresPacking,
    requiresWoodenCrate,
    requiresInsurance,

    optionalServices: {
      requiresInspection,
      requiresPacking,
      requiresWoodenCrate,
      requiresInsurance,
      selectedPricingRuleIds: pricingRuleIds,
      selectedRuleCodes: pricingRuleCodes,
    },

    pricingRuleIds,
    pricingRuleCodes,

    defaultDestinationHandling: destinationHandling,
    defaultDestinationHandlingText:
      destinationHandling === "STORE_AT_VN"
        ? "Gửi lại kho Việt Nam chờ ghép đơn"
        : "Giao thẳng tới địa chỉ người nhận",

    note,

    totalWeight,
    totalVolume,
    volumetricWeight,
    chargeableWeight,
    declaredValue,

    itemCount: items.length,
    itemNames: items.map((item) => item.productName),
    items,

    quotation: resolvedQuotation,

    createdAt,
    updatedAt,
    statusUpdatedAt,
    quotationCreatedAt: resolvedQuotation?.createdAt || null,

    cancelledAt,
    cancelReason,
    rejectionReason,
  };
};

/* =========================================================
   NGƯỜI NHẬN
   ========================================================= */

const RECEIVERS = {
  ngoc: {
    name: "Nguyễn Thị Bích Ngọc",
    phone: "0912447305",
    address:
      "Số 128 Trần Duy Hưng, P. Trung Hoà, Q. Cầu Giấy, Hà Nội",
  },
  hung: {
    name: "Trần Quốc Hưng",
    phone: "0938512664",
    address:
      "45/7 Nguyễn Văn Trỗi, P.12, Q. Phú Nhuận, TP. Hồ Chí Minh",
  },
  tuan: {
    name: "Lê Minh Tuấn",
    phone: "0975330218",
    address:
      "Kho B2, KCN Sóng Thần 1, P. Dĩ An, TP. Dĩ An, Bình Dương",
  },
  trang: {
    name: "Phạm Thu Trang",
    phone: "0903774129",
    address:
      "Số 6 ngõ 82 Chùa Láng, P. Láng Thượng, Q. Đống Đa, Hà Nội",
  },
  nam: {
    name: "Võ Hoàng Nam",
    phone: "0982640517",
    address:
      "212 Nguyễn Hữu Thọ, P. Hoà Thuận Tây, Q. Hải Châu, Đà Nẵng",
  },
  chi: {
    name: "Đặng Kim Chi",
    phone: "0961285470",
    address: "Số 39 Lê Lợi, P. Máy Tơ, Q. Ngô Quyền, Hải Phòng",
  },
  khoa: {
    name: "Bùi Anh Khoa",
    phone: "0918236905",
    address:
      "Lô 12 KCN Tân Bình, P. Tây Thạnh, Q. Tân Phú, TP. Hồ Chí Minh",
  },
  linh: {
    name: "Hoàng Diệu Linh",
    phone: "0947118362",
    address:
      "Số 27 Nguyễn Trãi, P. Bến Thành, Q.1, TP. Hồ Chí Minh",
  },
};

/* Phụ phí hay dùng, khai một lần cho khỏi lệch tên/tiền giữa các đơn. */
const inspectionFee = (packageCount = 1) => ({
  code: "SUR_INSPECTION",
  feeName: "Phụ phí kiểm hàng",
  amount: INSPECTION_UNIT_FEE * packageCount,
  unitPrice: INSPECTION_UNIT_FEE,
  quantity: packageCount,
  unitNoun: "kiện",
});

const INSURANCE_FEE = {
  code: "SUR_INSURANCE_3PERCENT",
  feeName: `Phụ phí bảo hiểm ${INSURANCE_PERCENT}%`,
  percentOfDeclared: INSURANCE_PERCENT,
  unitNoun: "giá trị khai báo",
};

/*
 * Tiền thùng gỗ THEO CỠ của từng kiện: lấy đúng đơn giá cấu hình trong catalog,
 * không gõ lại. Không còn khoản thùng gỗ cố định cho cả đơn.
 */
const packingConfigFee = (configCode, quantity = 1) => {
  const configuration = packageConfigByCode.get(configCode);

  const configName = configuration?.configName || "cấu hình thùng";
  const packageFee = configuration?.packageFee ?? 0;

  return {
    code: "PACKING_FEE",
    feeName: `Giá ${configName.toLowerCase()}`,
    feeType: "PACKING_FEE",
    amount: packageFee * quantity,
    unitPrice: packageFee,
    quantity,
    unitNoun: "kiện",
  };
};

const packingFee = (packageCount) => ({
  code: "SUR_PACKING",
  feeName: "Phí đóng gói hàng hoá",
  feeType: "SURCHARGE",
  amount: PACKING_UNIT_FEE * packageCount,
  unitPrice: PACKING_UNIT_FEE,
  quantity: packageCount,
  unitNoun: "kiện",
});

/* =========================================================
   DỮ LIỆU
   ========================================================= */

/**
 * 25 đơn ký gửi phủ vòng đời trạng thái đơn, chỉ dùng 19 mã đích
 * (state-machines.md §1; tools/verify-mocks.mjs kiểm): PENDING_REVIEW,
 * QUOTATION_SENT, WAITING_DEPOSIT, DEPOSIT_PAID, APPROVED, PAID, CHECKED_IN,
 * IN_TRANSIT, ARRIVED_VN, ARRIVED_DESTINATION, DELIVERING, DELIVERED,
 * COMPLETED, CANCELLED, REJECTED.
 *
 * @type {Array<object>}
 */
export const consignments = [
  /* ---------- CHỜ DUYỆT ---------- */
  createConsignment({
    seed: "01",
    code: "VCL-20260901021433-418209",
    status: "PENDING_REVIEW",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-09-01T02:14:33Z",
    requiresInspection: true,
    note: "Kiểm giúp em xem hàng có bị móp thùng không.",
    items: [
      createItem({
        seed: "01a",
        productName: "Robot hút bụi Xiaomi S20+",
        productTypeCode: "ELECTRONICS",
        quantity: 2,
        weight: 6.4,
        length: 42,
        width: 42,
        height: 12,
        declaredValue: 7200000,
        domesticTrackingCode: "SF1284470931552",
      }),
      createItem({
        seed: "01b",
        productName: "Bình giữ nhiệt Xiaomi 500ml (thùng 24 cái)",
        productTypeCode: "HOUSEHOLD",
        quantity: 1,
        weight: 9.8,
        length: 50,
        width: 38,
        height: 30,
        declaredValue: 3600000,
        domesticTrackingCode: "SF1284470931553",
      }),
    ],
  }),

  createConsignment({
    seed: "02",
    code: "VCL-20260831084712-330715",
    status: "PENDING_REVIEW",
    consignmentType: "EXPRESS",
    route: ROUTES.mongcai,
    receiver: RECEIVERS.hung,
    createdAt: "2026-08-31T08:47:12Z",
    requiresInspection: true,
    requiresInsurance: true,
    note: "Hàng dễ vỡ, ưu tiên đi hoả tốc.",
    items: [
      createItem({
        seed: "02a",
        productName: "Màn hình máy tính AOC 24 inch",
        productTypeCode: "ELECTRONICS",
        quantity: 4,
        weight: 4.2,
        length: 60,
        width: 18,
        height: 40,
        declaredValue: 9600000,
        domesticTrackingCode: "YT7845120963001",
      }),
    ],
  }),

  createConsignment({
    seed: "03",
    code: "VCL-20260830012258-905143",
    status: "PENDING_REVIEW",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-30T01:22:58Z",
    requiresPacking: true,
    destinationHandling: "STORE_AT_VN",
    note: "Gửi lại kho chờ ghép với lô tuần sau.",
    items: [
      createItem({
        seed: "03a",
        productName: "Phụ kiện điện thoại Baseus (combo 50 món)",
        productTypeCode: "ACCESSORIES",
        quantity: 6,
        weight: 3.1,
        length: 40,
        width: 30,
        height: 22,
        declaredValue: 5400000,
      }),
      createItem({
        seed: "03b",
        productName: "Cáp sạc nhanh Type-C 100W (hộp 100 sợi)",
        productTypeCode: "ACCESSORIES",
        quantity: 3,
        weight: 2.4,
        length: 36,
        width: 26,
        height: 18,
        declaredValue: 2700000,
      }),
    ],
  }),

  createConsignment({
    seed: "04",
    code: "VCL-20260829090541-274860",
    status: "PENDING_REVIEW",
    consignmentType: "STANDARD",
    route: ROUTES.sea,
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-29T09:05:41Z",
    requiresWoodenCrate: true,
    requiresInsurance: true,
    note: "Máy nặng, nhờ đóng thùng gỗ giúp em.",
    items: [
      createItem({
        seed: "04a",
        productName: "Máy hàn mini Zhongkai 250A",
        productTypeCode: "OTHER",
        quantity: 2,
        weight: 14.5,
        length: 55,
        width: 35,
        height: 32,
        declaredValue: 8800000,
        packageConfigCode: "MEDIUM",
        domesticTrackingCode: "JD0091254478210",
      }),
    ],
  }),

  createConsignment({
    seed: "05",
    code: "VCL-20260828033609-661032",
    status: "PENDING_REVIEW",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.chi,
    createdAt: "2026-08-28T03:36:09Z",
    items: [
      createItem({
        seed: "05a",
        productName: "Chăn lông cừu 2m x 2m2 (kiện 10 chiếc)",
        productTypeCode: "HOUSEHOLD",
        quantity: 2,
        weight: 18,
        length: 70,
        width: 55,
        height: 45,
        declaredValue: 6200000,
      }),
    ],
  }),

  /* ---------- ĐÃ GỬI BÁO GIÁ (chờ khách xác nhận) ---------- */
  createConsignment({
    seed: "06",
    code: "VCL-20260827041826-538471",
    status: "QUOTATION_SENT",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-27T04:18:26Z",
    updatedAt: "2026-08-28T02:40:11Z",
    requiresInspection: true,
    requiresWoodenCrate: true,
    trackingCode: "VCLTQ-2026-000106",
    note: "Đóng thùng gỗ cho kiện ghế, kiểm hàng trước khi đóng.",
    items: [
      createItem({
        seed: "06a",
        productName: "Ghế công thái học Sihoo M57",
        productTypeCode: "HOUSEHOLD",
        quantity: 3,
        weight: 16.2,
        length: 72,
        width: 48,
        height: 42,
        declaredValue: 12600000,
        packageConfigCode: "LARGE",
        domesticTrackingCode: "SF1284471120088",
      }),
      createItem({
        seed: "06b",
        productName: "Kệ sắt lắp ghép 5 tầng",
        productTypeCode: "HOUSEHOLD",
        quantity: 2,
        weight: 11.4,
        length: 90,
        width: 42,
        height: 18,
        declaredValue: 3400000,
      }),
    ],
    /* Báo giá tạm tính đang chờ khách bấm "Chấp nhận báo giá". */
    quotation: {
      status: "PENDING",
      quoteType: "ESTIMATE",
      freightUnitPrice: 32000,
      domesticShippingFee: 450000,
      createdAt: "2026-08-28T02:40:11Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      salesNote:
        "Đã áp dụng đóng thùng gỗ cho kiện ghế và kiểm hàng trước khi xuất kho.",
      surcharges: [
        packingConfigFee("LARGE"),
        inspectionFee(2),
      ],
    },
  }),

  createConsignment({
    seed: "07",
    code: "VCL-20260826075214-192730",
    status: "QUOTATION_SENT",
    consignmentType: "EXPRESS",
    route: ROUTES.mongcai,
    receiver: RECEIVERS.khoa,
    createdAt: "2026-08-26T07:52:14Z",
    updatedAt: "2026-08-27T03:15:44Z",
    requiresInsurance: true,
    trackingCode: "VCLTQ-2026-000107",
    note: "Hàng điện tử, mua bảo hiểm giúp em.",
    items: [
      createItem({
        seed: "07a",
        productName: "Loa bluetooth Edifier M60",
        productTypeCode: "ELECTRONICS",
        quantity: 12,
        weight: 1.6,
        length: 24,
        width: 20,
        height: 18,
        declaredValue: 14400000,
        domesticTrackingCode: "YT7845121450770",
      }),
      createItem({
        seed: "07b",
        productName: "Bàn phím cơ Akko 3068B",
        productTypeCode: "ELECTRONICS",
        quantity: 20,
        weight: 1.1,
        length: 38,
        width: 16,
        height: 8,
        declaredValue: 18000000,
        domesticTrackingCode: "YT7845121450771",
      }),
    ],
    /* Báo giá chính thức: màn chi tiết sẽ hiện nút "Xác nhận & thanh toán". */
    quotation: {
      status: "PENDING",
      quoteType: "FINAL",
      freightUnitPrice: 46000,
      domesticShippingFee: 380000,
      createdAt: "2026-08-27T03:15:44Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      salesNote:
        "Báo giá chính thức, đã gồm bảo hiểm 3% giá trị khai báo.",
      surcharges: [INSURANCE_FEE],
    },
  }),

  createConsignment({
    seed: "08",
    code: "VCL-20260825024105-847619",
    status: "QUOTATION_SENT",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-25T02:41:05Z",
    updatedAt: "2026-08-26T01:58:30Z",
    requiresPacking: true,
    requiresInspection: true,
    trackingCode: "VCLTQ-2026-000108",
    items: [
      createItem({
        seed: "08a",
        productName: "Áo khoác phao nữ lông vũ 90% (kiện 40 chiếc)",
        productTypeCode: "CLOTHING",
        quantity: 3,
        weight: 12.6,
        length: 60,
        width: 45,
        height: 40,
        declaredValue: 21600000,
      }),
      createItem({
        seed: "08b",
        productName: "Giày thể thao Li-Ning Ultra Light 20",
        productTypeCode: "SHOES",
        quantity: 5,
        weight: 7.5,
        length: 55,
        width: 35,
        height: 35,
        declaredValue: 11000000,
      }),
    ],
    quotation: {
      status: "PENDING",
      quoteType: "ESTIMATE",
      freightUnitPrice: 29000,
      domesticShippingFee: 320000,
      createdAt: "2026-08-26T01:58:30Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      salesNote:
        "Hàng thời trang, đã tính phí đóng gói lại và kiểm hàng.",
      surcharges: [packingFee(8), inspectionFee(2)],
    },
  }),

  createConsignment({
    seed: "09",
    code: "VCL-20260824100937-406358",
    status: "QUOTATION_SENT",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.chi,
    createdAt: "2026-08-24T10:09:37Z",
    updatedAt: "2026-08-24T11:02:19Z",
    requiresInspection: true,
    trackingCode: "VCLTQ-2026-000109",
    note: "Khách chưa phản hồi, báo giá đã quá hạn.",
    items: [
      createItem({
        seed: "09a",
        productName: "Vải dạ tweed khổ 1m5 (cuộn 30m)",
        productTypeCode: "OTHER",
        quantity: 4,
        weight: 22,
        length: 155,
        width: 30,
        height: 30,
        declaredValue: 15200000,
      }),
    ],
    /* Hạn cứng trong quá khứ để màn báo giá luôn có một ca EXPIRED để xem. */
    quotation: {
      status: "PENDING",
      quoteType: "ESTIMATE",
      freightUnitPrice: 27000,
      domesticShippingFee: 410000,
      createdAt: "2026-08-24T11:02:19Z",
      expiredAt: "2026-08-31T16:59:59Z",
      salesNote: "Báo giá có hiệu lực 7 ngày kể từ ngày gửi.",
      surcharges: [inspectionFee(1)],
    },
  }),

  /* ---------- CHỜ THANH TOÁN ---------- */
  createConsignment({
    seed: "10",
    code: "VCL-20260822032744-713925",
    status: "WAITING_DEPOSIT",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-22T03:27:44Z",
    updatedAt: "2026-08-23T07:12:08Z",
    requiresInspection: true,
    trackingCode: "VCLTQ-2026-000110",
    items: [
      createItem({
        seed: "10a",
        productName: "Máy ép chậm Joyoung Z8-V82",
        productTypeCode: "HOUSEHOLD",
        quantity: 6,
        weight: 5.8,
        length: 45,
        width: 28,
        height: 42,
        declaredValue: 16800000,
        domesticTrackingCode: "SF1284471998204",
      }),
    ],
    quotation: {
      status: "ACCEPTED",
      quoteType: "FINAL",
      freightUnitPrice: 31000,
      domesticShippingFee: 300000,
      createdAt: "2026-08-23T07:12:08Z",
      expiredAt: "2026-09-06T16:59:59Z",
      salesNote: "Khách đã chấp nhận báo giá, chờ thanh toán.",
      surcharges: [inspectionFee(1)],
    },
  }),

  createConsignment({
    seed: "11",
    code: "VCL-20260821061152-259084",
    status: "WAITING_DEPOSIT",
    consignmentType: "EXPRESS",
    route: ROUTES.sea,
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-21T06:11:52Z",
    updatedAt: "2026-08-22T02:44:37Z",
    requiresInsurance: true,
    trackingCode: "VCLTQ-2026-000111",
    items: [
      createItem({
        seed: "11a",
        productName: "Máy pha cà phê Donlim DL-KF7001",
        productTypeCode: "HOUSEHOLD",
        quantity: 8,
        weight: 4.4,
        length: 38,
        width: 26,
        height: 34,
        declaredValue: 15200000,
      }),
    ],
    quotation: {
      status: "ACCEPTED",
      quoteType: "FINAL",
      freightUnitPrice: 48000,
      domesticShippingFee: 360000,
      createdAt: "2026-08-22T02:44:37Z",
      expiredAt: "2026-09-05T16:59:59Z",
      surcharges: [INSURANCE_FEE],
    },
  }),

  /* ---------- ĐÃ THANH TOÁN / ĐANG XỬ LÝ ---------- */
  createConsignment({
    seed: "12",
    code: "VCL-20260819083320-580216",
    status: "PAID",
    consignmentType: "STANDARD",
    route: ROUTES.mongcai,
    receiver: RECEIVERS.hung,
    createdAt: "2026-08-19T08:33:20Z",
    updatedAt: "2026-08-20T09:26:14Z",
    trackingCode: "VCLTQ-2026-000112",
    items: [
      createItem({
        seed: "12a",
        productName: "Đèn LED âm trần Opple 12W (thùng 20 bóng)",
        productTypeCode: "HOME_APPLIANCE",
        quantity: 10,
        weight: 6.2,
        length: 42,
        width: 32,
        height: 24,
        declaredValue: 9800000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 28000,
      domesticShippingFee: 340000,
      createdAt: "2026-08-20T09:26:14Z",
      expiredAt: "2026-09-03T16:59:59Z",
      surcharges: [],
    },
  }),

  createConsignment({
    seed: "13",
    code: "VCL-20260818014706-937451",
    status: "DEPOSIT_PAID",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.linh,
    createdAt: "2026-08-18T01:47:06Z",
    updatedAt: "2026-08-19T04:03:52Z",
    requiresPacking: true,
    trackingCode: "VCLTQ-2026-000113",
    items: [
      createItem({
        seed: "13a",
        productName: "Túi xách nữ da PU thời trang Quảng Châu",
        productTypeCode: "CLOTHING",
        quantity: 15,
        weight: 1.8,
        length: 34,
        width: 16,
        height: 26,
        declaredValue: 10500000,
      }),
    ],
    quotation: {
      status: "APPROVED",
      quoteType: "FINAL",
      freightUnitPrice: 30000,
      domesticShippingFee: 280000,
      createdAt: "2026-08-19T04:03:52Z",
      expiredAt: "2026-09-02T16:59:59Z",
      surcharges: [packingFee(15)],
    },
  }),

  createConsignment({
    seed: "14",
    code: "VCL-20260815052948-146802",
    status: "APPROVED",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-15T05:29:48Z",
    updatedAt: "2026-08-17T02:18:05Z",
    requiresInspection: true,
    trackingCode: "VCLTQ-2026-000114",
    items: [
      createItem({
        seed: "14a",
        productName: "Máy khoan pin Dongcheng 21V",
        productTypeCode: "OTHER",
        quantity: 9,
        weight: 3.4,
        length: 36,
        width: 12,
        height: 28,
        declaredValue: 8100000,
        domesticTrackingCode: "ZTO88451203669",
      }),
    ],
    quotation: {
      status: "APPROVED",
      quoteType: "FINAL",
      freightUnitPrice: 32000,
      domesticShippingFee: 260000,
      createdAt: "2026-08-17T02:18:05Z",
      expiredAt: "2026-08-31T16:59:59Z",
      surcharges: [inspectionFee(1)],
    },
  }),

  /* ---------- ĐÃ NHẬP KHO ---------- */
  createConsignment({
    seed: "15",
    code: "VCL-20260812025831-620973",
    status: "CHECKED_IN",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-12T02:58:31Z",
    updatedAt: "2026-08-16T08:41:20Z",
    requiresWoodenCrate: true,
    trackingCode: "VCLTQ-2026-000115",
    items: [
      createItem({
        seed: "15a",
        productName: "Bộ nồi inox 5 đáy Supor 4 món",
        productTypeCode: "HOUSEHOLD",
        quantity: 12,
        weight: 5.2,
        length: 44,
        width: 44,
        height: 26,
        declaredValue: 13200000,
        packageConfigCode: "MEDIUM",
        domesticTrackingCode: "SF1284470554417",
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 27000,
      domesticShippingFee: 350000,
      createdAt: "2026-08-13T03:11:47Z",
      expiredAt: "2026-08-27T16:59:59Z",
      surcharges: [packingConfigFee("MEDIUM")],
    },
  }),

  createConsignment({
    seed: "16",
    code: "VCL-20260810091407-385140",
    status: "CHECKED_IN",
    consignmentType: "EXPRESS",
    route: ROUTES.sea,
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-10T09:14:07Z",
    updatedAt: "2026-08-14T06:22:35Z",
    destinationHandling: "STORE_AT_VN",
    trackingCode: "VCLTQ-2026-000116",
    note: "Gửi lại kho VN, khách sẽ tự sắp lịch giao.",
    items: [
      createItem({
        seed: "16a",
        productName: "Xe đạp trẻ em gấp gọn 16 inch",
        productTypeCode: "TOYS",
        quantity: 5,
        weight: 9.6,
        length: 86,
        width: 24,
        height: 48,
        declaredValue: 11500000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 45000,
      domesticShippingFee: 420000,
      createdAt: "2026-08-11T02:34:52Z",
      expiredAt: "2026-08-25T16:59:59Z",
      surcharges: [],
    },
  }),

  /* ---------- ĐANG VỀ VIỆT NAM ---------- */
  createConsignment({
    seed: "17",
    code: "VCL-20260806042219-071564",
    status: "IN_TRANSIT",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.chi,
    createdAt: "2026-08-06T04:22:19Z",
    updatedAt: "2026-08-18T10:05:44Z",
    trackingCode: "VCLTQ-2026-000117",
    items: [
      createItem({
        seed: "17a",
        productName: "Kệ sắt lắp ghép 5 tầng",
        productTypeCode: "HOUSEHOLD",
        quantity: 8,
        weight: 11.4,
        length: 90,
        width: 42,
        height: 18,
        declaredValue: 13600000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 26000,
      domesticShippingFee: 390000,
      createdAt: "2026-08-07T03:40:12Z",
      expiredAt: "2026-08-21T16:59:59Z",
      surcharges: [],
    },
  }),

  createConsignment({
    seed: "18",
    code: "VCL-20260802074153-492308",
    status: "ARRIVED_VN",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.linh,
    createdAt: "2026-08-02T07:41:53Z",
    updatedAt: "2026-08-20T02:58:16Z",
    requiresInspection: true,
    trackingCode: "VCLTQ-2026-000118",
    items: [
      createItem({
        seed: "18a",
        productName: "Robot hút bụi Xiaomi S20+",
        productTypeCode: "ELECTRONICS",
        quantity: 6,
        weight: 6.4,
        length: 42,
        width: 42,
        height: 12,
        declaredValue: 21600000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 31000,
      domesticShippingFee: 300000,
      createdAt: "2026-08-03T04:12:38Z",
      expiredAt: "2026-08-17T16:59:59Z",
      surcharges: [inspectionFee(1)],
    },
  }),

  createConsignment({
    seed: "19",
    code: "VCL-20260729031640-758261",
    status: "ARRIVED_DESTINATION",
    consignmentType: "STANDARD",
    route: ROUTES.mongcai,
    receiver: RECEIVERS.khoa,
    createdAt: "2026-07-29T03:16:40Z",
    updatedAt: "2026-08-19T09:33:07Z",
    trackingCode: "VCLTQ-2026-000119",
    items: [
      createItem({
        seed: "19a",
        productName: "Phụ kiện điện thoại Baseus (combo 50 món)",
        productTypeCode: "ACCESSORIES",
        quantity: 14,
        weight: 3.1,
        length: 40,
        width: 30,
        height: 22,
        declaredValue: 12600000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 29000,
      domesticShippingFee: 310000,
      createdAt: "2026-07-30T02:05:19Z",
      expiredAt: "2026-08-13T16:59:59Z",
      surcharges: [],
    },
  }),

  /* ---------- GIAO HÀNG ---------- */
  createConsignment({
    seed: "20",
    code: "VCL-20260724080512-314697",
    status: "DELIVERING",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.trang,
    createdAt: "2026-07-24T08:05:12Z",
    updatedAt: "2026-08-21T01:47:22Z",
    trackingCode: "VCLTQ-2026-000120",
    items: [
      createItem({
        seed: "20a",
        productName: "Chăn lông cừu 2m x 2m2 (kiện 10 chiếc)",
        productTypeCode: "HOUSEHOLD",
        quantity: 4,
        weight: 18,
        length: 70,
        width: 55,
        height: 45,
        declaredValue: 12400000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 26000,
      domesticShippingFee: 380000,
      createdAt: "2026-07-25T03:22:41Z",
      expiredAt: "2026-08-08T16:59:59Z",
      surcharges: [],
    },
  }),

  createConsignment({
    seed: "21",
    code: "VCL-20260719023758-869025",
    status: "DELIVERED",
    consignmentType: "EXPRESS",
    route: ROUTES.sea,
    receiver: RECEIVERS.nam,
    createdAt: "2026-07-19T02:37:58Z",
    updatedAt: "2026-08-12T07:14:03Z",
    trackingCode: "VCLTQ-2026-000121",
    items: [
      createItem({
        seed: "21a",
        productName: "Màn hình máy tính AOC 24 inch",
        productTypeCode: "ELECTRONICS",
        quantity: 10,
        weight: 4.2,
        length: 60,
        width: 18,
        height: 40,
        declaredValue: 24000000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 44000,
      domesticShippingFee: 400000,
      createdAt: "2026-07-20T04:09:55Z",
      expiredAt: "2026-08-03T16:59:59Z",
      surcharges: [],
    },
  }),

  /* ---------- HOÀN THÀNH ---------- */
  createConsignment({
    seed: "22",
    code: "VCL-20260712105447-295805",
    status: "COMPLETED",
    consignmentType: "STANDARD",
    route: ROUTES.main,
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-07-12T10:54:47Z",
    updatedAt: "2026-08-05T09:20:31Z",
    requiresInspection: true,
    requiresWoodenCrate: true,
    trackingCode: "VCLTQ-2026-000122",
    note: "Đơn mẫu đã hoàn tất, dùng để đối chiếu lịch sử.",
    items: [
      createItem({
        seed: "22a",
        productName: "Ghế công thái học Sihoo M57",
        productTypeCode: "HOUSEHOLD",
        quantity: 4,
        weight: 16.2,
        length: 72,
        width: 48,
        height: 42,
        declaredValue: 16800000,
        packageConfigCode: "LARGE",
      }),
      createItem({
        seed: "22b",
        productName: "Đèn LED âm trần Opple 12W (thùng 20 bóng)",
        productTypeCode: "HOME_APPLIANCE",
        quantity: 6,
        weight: 6.2,
        length: 42,
        width: 32,
        height: 24,
        declaredValue: 5880000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 27000,
      domesticShippingFee: 420000,
      createdAt: "2026-07-13T02:41:18Z",
      expiredAt: "2026-07-27T16:59:59Z",
      salesNote:
        "Đơn đã hoàn tất, thùng gỗ cỡ lớn cho kiện ghế công thái học.",
      surcharges: [
        packingConfigFee("LARGE"),
        inspectionFee(2),
      ],
    },
  }),

  createConsignment({
    seed: "23",
    code: "VCL-20260628064823-503719",
    status: "COMPLETED",
    consignmentType: "STANDARD",
    route: ROUTES.mongcai,
    receiver: RECEIVERS.hung,
    createdAt: "2026-06-28T06:48:23Z",
    updatedAt: "2026-07-22T03:55:40Z",
    trackingCode: "VCLTQ-2026-000123",
    items: [
      createItem({
        seed: "23a",
        productName: "Giày thể thao Li-Ning Ultra Light 20",
        productTypeCode: "SHOES",
        quantity: 9,
        weight: 7.5,
        length: 55,
        width: 35,
        height: 35,
        declaredValue: 19800000,
      }),
    ],
    quotation: {
      status: "PAID",
      quoteType: "FINAL",
      freightUnitPrice: 28000,
      domesticShippingFee: 330000,
      createdAt: "2026-06-29T02:16:09Z",
      expiredAt: "2026-07-13T16:59:59Z",
      surcharges: [],
    },
  }),

  /* ---------- HUỶ / TỪ CHỐI ---------- */
  createConsignment({
    seed: "24",
    code: "VCL-20260620093116-628470",
    status: "CANCELLED",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.linh,
    createdAt: "2026-06-20T09:31:16Z",
    updatedAt: "2026-06-22T02:07:49Z",
    cancelledAt: "2026-06-22T02:07:49Z",
    cancelReason:
      "Nhà cung cấp Trung Quốc báo hết hàng, khách huỷ đơn.",
    items: [
      createItem({
        seed: "24a",
        productName: "Bàn phím cơ Akko 3068B",
        productTypeCode: "ELECTRONICS",
        quantity: 10,
        weight: 1.1,
        length: 38,
        width: 16,
        height: 8,
        declaredValue: 9000000,
      }),
    ],
  }),

  createConsignment({
    seed: "25",
    code: "VCL-20260610041235-174936",
    status: "REJECTED",
    consignmentType: "STANDARD",
    route: ROUTES.laocai,
    receiver: RECEIVERS.tuan,
    createdAt: "2026-06-10T04:12:35Z",
    updatedAt: "2026-06-11T08:29:54Z",
    rejectionReason:
      "Mặt hàng nằm trong danh mục hạn chế vận chuyển đường bộ.",
    note: "Khách khai báo pin rời, tuyến bộ không nhận.",
    items: [
      createItem({
        seed: "25a",
        productName: "Pin sạc dự phòng 20000mAh (thùng 30 cái)",
        productTypeCode: "ELECTRONICS",
        quantity: 2,
        weight: 12,
        length: 46,
        width: 34,
        height: 28,
        declaredValue: 7200000,
      }),
    ],
  }),
];

/* =========================================================
   SELECTOR
   ========================================================= */

const normalizeKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/**
 * Tìm đơn ký gửi theo orderId.
 *
 * Trả về THAM CHIẾU tới fixture gốc, không phải bản sao — module mock phải
 * tự deepClone trước khi trả cho component.
 *
 * @param {string} orderId
 * @returns {object | null}
 */
export const findConsignmentById = (orderId) => {
  const key = normalizeKey(orderId);

  if (!key) {
    return null;
  }

  return (
    consignments.find(
      (consignment) => normalizeKey(consignment.orderId) === key
    ) || null
  );
};

/**
 * Tìm đơn ký gửi theo mã: consignmentCode, orderCode hoặc trackingCode.
 *
 * @param {string} code
 * @returns {object | null}
 */
export const findConsignmentByCode = (code) => {
  const key = normalizeKey(code);

  if (!key) {
    return null;
  }

  return (
    consignments.find(
      (consignment) =>
        normalizeKey(consignment.consignmentCode) === key ||
        normalizeKey(consignment.orderCode) === key ||
        normalizeKey(consignment.trackingCode) === key
    ) || null
  );
};

/**
 * Lọc theo trạng thái. Nhận một mã hoặc một mảng mã.
 *
 * @param {string | string[]} status
 * @returns {Array<object>}
 */
export const findConsignmentsByStatus = (status) => {
  const wanted = (Array.isArray(status) ? status : [status])
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (wanted.length === 0) {
    return [...consignments];
  }

  return consignments.filter((consignment) =>
    wanted.includes(consignment.status)
  );
};

export default consignments;
