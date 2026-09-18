/* =========================================================
   data/purchaseRequests.js

   Bộ dữ liệu yêu cầu MUA HỘ (purchase request).

   Dùng chung cho mock purchase, history mua hộ, payment và dashboard,
   nên purchaseRequestId / purchaseCode phải cố định tuyệt đối.

   Shape bám theo đúng thứ component đang đọc:
   - PurchaseRequestPendingList và BuyForMeQuotationList đọc: purchaseRequestId,
     purchaseCode, receiverName, itemCount, status, generalNote, createdAt,
     updatedAt, statusUpdatedAt, quotationCreatedAt và items[].productName /
     items[].quantity.
   - PurchaseRequestDetail đọc thêm: customerName, createdByName, receiverPhone,
     receiverAddress, route, shippingOption, requiresPacking /
     requiresWoodenCrate / requiresInsurance, reason, totalQuantity và từng item
     (itemId, productLink, sourceWebsite, productType, attributes, note,
     imageUrls).
   - BuyForMeQuotationListDetail đọc quotation{items[], additionalFees[],
     productsSubtotal, serviceFee, shippingFee, importTax, vat, totalAmount}.

   Khách hàng lấy lại từ dataset ký gửi, loại sản phẩm lấy từ catalog, để cả
   app chỉ có một danh tính khách hàng và một bộ danh mục duy nhất.
   ========================================================= */

import { isoDaysAgo, stableUuid } from "../mockUtils";
import catalog from "./catalog";
import { MOCK_CUSTOMER } from "./consignments";

/* Loại sản phẩm thuộc catalog; ở đây chỉ tra lại theo mã. */
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
 * Mức phí đọc thẳng từ pricing rule trong catalog.
 *
 * Trang bảng giá hiển thị đúng mấy rule này, nên fixture không được gõ số
 * riêng — nếu không khách sẽ thấy bảng giá nói 3% mà báo giá tính 5%.
 */
const ruleValueOf = (ruleCode, fallback) => {
  const value = Number(
    catalog?.findPricingRuleByCode?.(ruleCode)?.value
  );

  return Number.isFinite(value) ? value : fallback;
};

const SERVICE_FEE_PERCENT = ruleValueOf("PURCHASE_FEE", 3);
const SERVICE_FEE_RATE = SERVICE_FEE_PERCENT / 100;

const VAT_PERCENT = ruleValueOf("VAT", 8);
const VAT_RATE = VAT_PERCENT / 100;

const INSURANCE_PERCENT = ruleValueOf("SUR_INSURANCE_3PERCENT", 3);
const INSURANCE_RATE = INSURANCE_PERCENT / 100;

const IMPORT_TAX_RATE = ruleValueOf("IMPORT_TAX", 10) / 100;

const WOOD_CRATE_ORDER_FEE = ruleValueOf("WOOD_CRATE", 150000);

/*
 * Báo giá còn chờ khách xác nhận phải chưa hết hạn thì khu vực nút
 * "Chấp nhận" / "Thanh toán" mới hiện ra, nên hạn tính theo lúc chạy
 * thay vì ghi ngày cứng (ngày cứng sẽ tự hết hạn sau vài tuần).
 */
const ACTIVE_QUOTATION_EXPIRES_AT = isoDaysAgo(-10);

/* =========================================================
   FACTORY
   ========================================================= */

const buildImageUrls = (seed, count = 2) =>
  Array.from(
    { length: count },
    (_, index) =>
      `https://picsum.photos/seed/pur-${seed}-${index + 1}/640/640`
  );

/**
 * Một sản phẩm khách nhờ mua hộ.
 *
 * unitPrice ở đây là giá khách tự khai lúc gửi yêu cầu; giá chốt nằm bên
 * quotation.items — hai chỗ có thể lệch nhau, đúng như nghiệp vụ thật.
 */
const createItem = ({
  seed,
  productName,
  productTypeCode,
  productLink,
  quantity,
  unitPrice,
  attributes = "",
  note = "",
  imageCount = 2,
}) => {
  const itemId = stableUuid(`purchase-item-${seed}`);

  const productType = productTypeByCode.get(productTypeCode);

  const imageUrls = buildImageUrls(seed, imageCount);

  /* sourceWebsite phải là hostname của chính productLink, API validate điều này. */
  const sourceWebsite = new URL(productLink).hostname;

  return {
    id: itemId,
    itemId,
    purchaseRequestItemId: itemId,

    productLink,
    sourceWebsite,

    productName,

    productType: productType?.productTypeName || "Hàng hoá tổng hợp",
    productTypeCode: productType?.productTypeCode || null,
    productTypeName:
      productType?.productTypeName || "Hàng hoá tổng hợp",
    productTypeId: productType?.productTypeId || null,

    quantity,
    unitPrice,

    attributes,
    note,

    imageUrls,
    imageUrl: imageUrls[0],
    referenceUrls: imageUrls,
  };
};

/**
 * Báo giá của một yêu cầu mua hộ.
 *
 * Màn chi tiết tính tổng bằng productsSubtotal + tổng additionalFees, nên
 * totalAmount phải đúng bằng phép cộng đó — lệch là bảng quyết toán và banner
 * tổng tiền nói hai số khác nhau.
 */
const createQuotation = ({
  seed,
  purchaseRequestId,
  purchaseCode,
  items,
  status = "APPROVED",
  priceMultiplier = 1,
  shippingFee,
  importTaxRate = IMPORT_TAX_RATE,
  woodCrateFee = 0,
  withInsurance = false,
  createdAt,
  expiredAt,
  note = "",
}) => {
  const quotationId = stableUuid(`purchase-quotation-${seed}`);

  /*
   * Giá chốt = giá khách khai × hệ số (tỷ giá/biến động giá tại nguồn).
   * Làm tròn tới nghìn đồng cho giống báo giá thật.
   */
  const quotationItems = items.map((item, index) => {
    const unitPrice =
      Math.round((item.unitPrice * priceMultiplier) / 1000) * 1000;

    return {
      quotationItemId: stableUuid(
        `purchase-quotation-item-${seed}-${index}`
      ),
      itemId: item.itemId,
      productName: item.productName,
      productLink: item.productLink,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const productsSubtotal = quotationItems.reduce(
    (total, item) => total + item.lineTotal,
    0
  );

  const serviceFee = Math.round(
    productsSubtotal * SERVICE_FEE_RATE
  );

  const insuranceFee = withInsurance
    ? Math.round(productsSubtotal * INSURANCE_RATE)
    : 0;

  const importTax = Math.round(productsSubtotal * importTaxRate);

  const vat = Math.round((serviceFee + shippingFee) * VAT_RATE);

  const additionalFees = [
    {
      id: stableUuid(`purchase-fee-${seed}-service`),
      code: "SERVICE_FEE",
      feeName: `Phí dịch vụ mua hộ (${SERVICE_FEE_PERCENT}%)`,
      amount: serviceFee,
      note: "Tính trên tổng tiền hàng.",
    },
    {
      id: stableUuid(`purchase-fee-${seed}-shipping`),
      code: "MAIN_SERVICE",
      feeName: "Cước vận chuyển quốc tế dự kiến",
      amount: shippingFee,
      note: "Ước tính theo khối lượng dự kiến của lô hàng.",
    },

    ...(woodCrateFee > 0
      ? [
          {
            id: stableUuid(`purchase-fee-${seed}-wood`),
            code: "WOOD_CRATE",
            feeName: "Dịch vụ đóng thùng gỗ",
            amount: woodCrateFee,
            note: "Tính một lần cho toàn bộ đơn.",
          },
        ]
      : []),

    ...(insuranceFee > 0
      ? [
          {
            id: stableUuid(`purchase-fee-${seed}-insurance`),
            code: "SUR_INSURANCE_3PERCENT",
            feeName: `Phụ phí bảo hiểm ${INSURANCE_PERCENT}%`,
            amount: insuranceFee,
            note: `${INSURANCE_PERCENT}% trên tổng tiền hàng.`,
          },
        ]
      : []),

    {
      id: stableUuid(`purchase-fee-${seed}-import-tax`),
      code: "IMPORT_TAX",
      feeName: "Thuế nhập khẩu",
      amount: importTax,
      note: `${Math.round(importTaxRate * 100)}% trên tổng tiền hàng.`,
    },
    {
      id: stableUuid(`purchase-fee-${seed}-vat`),
      code: "VAT",
      feeName: `Thuế VAT dịch vụ logistics (${VAT_PERCENT}%)`,
      amount: vat,
      note: "Tính trên phí dịch vụ và cước vận chuyển.",
    },
  ];

  const additionalFeesTotal = additionalFees.reduce(
    (total, fee) => total + fee.amount,
    0
  );

  const totalAmount = productsSubtotal + additionalFeesTotal;

  return {
    quotationId,
    quotationCode: `BG-${purchaseCode.replace("PUR-", "")}`,
    purchaseRequestId,
    purchaseCode,

    status,

    items: quotationItems,
    additionalFees,

    productsSubtotal,
    serviceFee,
    shippingFee,
    importTax,
    vat,

    totalAmount,
    /* Alias: vài màn dùng chung component với báo giá ký gửi. */
    totalEstimatedCost: totalAmount,

    note,

    createdAt,
    updatedAt: createdAt,
    expiredAt,
  };
};

/**
 * Một yêu cầu mua hộ hoàn chỉnh (dữ liệu list + detail chung một object).
 */
const createPurchaseRequest = ({
  seed,
  code,
  status,
  route,
  shippingOption,
  receiver,
  items,
  createdAt,
  updatedAt = createdAt,
  statusUpdatedAt = updatedAt,
  requiresPacking = false,
  requiresWoodenCrate = false,
  requiresInsurance = false,
  generalNote = "",
  reason = "",
  quotation = null,
  approvedAt = null,
  rejectedAt = null,
  cancelledAt = null,
}) => {
  const purchaseRequestId = stableUuid(
    `purchase-request-${seed}`
  );

  const totalQuantity = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const resolvedQuotation = quotation
    ? createQuotation({
        seed,
        purchaseRequestId,
        purchaseCode: code,
        items,
        woodCrateFee: requiresWoodenCrate ? WOOD_CRATE_ORDER_FEE : 0,
        withInsurance: requiresInsurance,
        ...quotation,
      })
    : null;

  return {
    purchaseRequestId,
    /* Một vài màn dùng chung component với đơn ký gửi nên đọc id/orderId. */
    id: purchaseRequestId,
    purchaseCode: code,
    orderCode: code,
    orderType: "PURCHASE_REQUEST",

    status,

    route,
    shippingOption,

    receiverName: receiver.name,
    receiverPhone: receiver.phone,
    receiverAddress: receiver.address,
    /*
     * ReceiveGoods đọc fullAddress (normalizePurchaseItem), thiếu là thẻ và
     * bảng giao nhận in chữ mặc định "Địa chỉ nhận hàng" thay cho địa chỉ thật.
     */
    fullAddress: receiver.address,

    customerId: MOCK_CUSTOMER.customerId,
    customerName: MOCK_CUSTOMER.fullName,
    customerPhone: MOCK_CUSTOMER.phone,
    customerEmail: MOCK_CUSTOMER.email,
    createdByName: MOCK_CUSTOMER.fullName,

    requiresPacking,
    requiresWoodenCrate,
    requiresInsurance,

    optionalServices: {
      requiresPacking,
      requiresWoodenCrate,
      requiresInsurance,
    },

    generalNote,
    note: generalNote,
    reason,

    itemCount: items.length,
    totalQuantity,
    items,

    quotation: resolvedQuotation,
    quotationId: resolvedQuotation?.quotationId || null,

    createdAt,
    updatedAt,
    submittedAt: createdAt,
    statusUpdatedAt,
    quotationCreatedAt: resolvedQuotation?.createdAt || null,

    approvedAt,
    rejectedAt,
    cancelledAt,
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

/* =========================================================
   DỮ LIỆU
   ========================================================= */

/**
 * 20 yêu cầu mua hộ phủ đủ các trạng thái UI đang lọc:
 * PENDING_REVIEW (màn chờ duyệt), QUOTED và QUOTATION_SENT (màn báo giá
 * mua hộ), APPROVED, PAID, PROCESSING, COMPLETED, REJECTED, CANCELLED.
 *
 * @type {Array<object>}
 */
export const purchaseRequests = [
  /* ---------- CHỜ DUYỆT ---------- */
  createPurchaseRequest({
    seed: "01",
    code: "PUR-20260901072218-604318",
    status: "PENDING_REVIEW",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-09-01T07:22:18Z",
    generalNote: "Nhờ shop kiểm màu giúp em trước khi gửi kho.",
    items: [
      createItem({
        seed: "01a",
        productName: "Áo hoodie nỉ bông form rộng unisex",
        productTypeCode: "CLOTHING",
        productLink:
          "https://item.taobao.com/item.htm?id=735298410276",
        quantity: 12,
        unitPrice: 268000,
        attributes: "Màu: Kem; Size: L",
        note: "Lấy đúng màu kem, không lấy màu be.",
      }),
      createItem({
        seed: "01b",
        productName: "Quần jogger nam vải nỉ da cá",
        productTypeCode: "CLOTHING",
        productLink:
          "https://item.taobao.com/item.htm?id=735298410299",
        quantity: 10,
        unitPrice: 215000,
        attributes: "Màu: Đen; Size: XL",
      }),
    ],
  }),

  createPurchaseRequest({
    seed: "02",
    code: "PUR-20260831023944-118750",
    status: "PENDING_REVIEW",
    route: ROUTES.mongcai,
    shippingOption: "EXPRESS",
    receiver: RECEIVERS.hung,
    createdAt: "2026-08-31T02:39:44Z",
    requiresInsurance: true,
    generalNote: "Hàng điện tử, nhờ mua bảo hiểm.",
    items: [
      createItem({
        seed: "02a",
        productName: "Tai nghe bluetooth chụp tai Edifier W820NB",
        productTypeCode: "ELECTRONICS",
        productLink:
          "https://detail.tmall.com/item.htm?id=684120397751",
        quantity: 8,
        unitPrice: 985000,
        attributes: "Màu: Xanh navy",
      }),
    ],
  }),

  createPurchaseRequest({
    seed: "03",
    code: "PUR-20260830061407-472069",
    status: "PENDING_REVIEW",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-30T06:14:07Z",
    requiresPacking: true,
    generalNote: "Nhờ đóng gói lại gọn giúp em, hàng lẻ nhiều.",
    items: [
      createItem({
        seed: "03a",
        productName: "Ốp lưng điện thoại silicon (combo 20 cái)",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/778451203964.html",
        quantity: 15,
        unitPrice: 142000,
        attributes: "Phân loại: Mix mẫu ngẫu nhiên",
      }),
      createItem({
        seed: "03b",
        productName: "Kính râm chống UV400 gọng kim loại",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/778451204118.html",
        quantity: 20,
        unitPrice: 78000,
        attributes: "Màu gọng: Vàng đồng",
      }),
      createItem({
        seed: "03c",
        productName: "Dây đeo điện thoại vải dệt",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/778451204255.html",
        quantity: 30,
        unitPrice: 32000,
      }),
    ],
  }),

  createPurchaseRequest({
    seed: "04",
    code: "PUR-20260829015236-935214",
    status: "PENDING_REVIEW",
    route: ROUTES.sea,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-29T01:52:36Z",
    requiresWoodenCrate: true,
    generalNote: "Hàng cồng kềnh, nhờ đóng thùng gỗ.",
    items: [
      createItem({
        seed: "04a",
        productName: "Kệ để giày 5 tầng bằng thép",
        productTypeCode: "HOUSEHOLD",
        productLink:
          "https://detail.1688.com/offer/669120458733.html",
        quantity: 6,
        unitPrice: 420000,
        attributes: "Màu: Đen nhám",
      }),
    ],
  }),

  createPurchaseRequest({
    seed: "05",
    code: "PUR-20260828080751-260487",
    status: "PENDING_REVIEW",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.chi,
    createdAt: "2026-08-28T08:07:51Z",
    items: [
      createItem({
        seed: "05a",
        productName: "Vải thun cotton 4 chiều (cuộn 20kg)",
        productTypeCode: "OTHER",
        productLink:
          "https://detail.1688.com/offer/551204873966.html",
        quantity: 4,
        unitPrice: 1850000,
        attributes: "Màu: Trắng kem; Khổ 1m6",
        note: "Cần đúng loại 4 chiều, không lấy 2 chiều.",
      }),
    ],
  }),

  /* ---------- ĐÃ BÁO GIÁ (QUOTED) ---------- */
  createPurchaseRequest({
    seed: "06",
    code: "PUR-20260827034429-517063",
    status: "QUOTED",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-27T03:44:29Z",
    updatedAt: "2026-08-28T04:10:53Z",
    requiresPacking: true,
    generalNote: "Chốt giúp em sớm, khách bên em đang chờ hàng.",
    items: [
      createItem({
        seed: "06a",
        productName: "Giày sneaker da lộn cổ thấp",
        productTypeCode: "SHOES",
        productLink:
          "https://item.taobao.com/item.htm?id=712045893310",
        quantity: 18,
        unitPrice: 385000,
        attributes: "Size: 38-42; Màu: Xám",
      }),
      createItem({
        seed: "06b",
        productName: "Dép quai ngang chống trượt (thùng 60 đôi)",
        productTypeCode: "SHOES",
        productLink:
          "https://detail.1688.com/offer/443128907715.html",
        quantity: 3,
        unitPrice: 1250000,
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.06,
      shippingFee: 1250000,
      createdAt: "2026-08-28T04:10:53Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      note: "Giá đã cập nhật theo tỷ giá ngày 28/08.",
    },
  }),

  createPurchaseRequest({
    seed: "07",
    code: "PUR-20260826091852-843926",
    status: "QUOTED",
    route: ROUTES.mongcai,
    shippingOption: "EXPRESS",
    receiver: RECEIVERS.khoa,
    createdAt: "2026-08-26T09:18:52Z",
    updatedAt: "2026-08-27T02:33:41Z",
    requiresInsurance: true,
    generalNote: "Hàng công nghệ, cần bảo hiểm đầy đủ.",
    items: [
      createItem({
        seed: "07a",
        productName: "Đồng hồ thông minh Amazfit GTS 4 Mini",
        productTypeCode: "ELECTRONICS",
        productLink:
          "https://detail.tmall.com/item.htm?id=690451237788",
        quantity: 10,
        unitPrice: 1420000,
        attributes: "Màu: Đen",
      }),
      createItem({
        seed: "07b",
        productName: "Chuột không dây Logitech M330 (hộp 20 cái)",
        productTypeCode: "ELECTRONICS",
        productLink:
          "https://detail.1688.com/offer/885012347790.html",
        quantity: 2,
        unitPrice: 4650000,
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.04,
      shippingFee: 1680000,
      createdAt: "2026-08-27T02:33:41Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      note: "Đã gồm bảo hiểm 3% giá trị hàng.",
    },
  }),

  createPurchaseRequest({
    seed: "08",
    code: "PUR-20260825053114-379145",
    status: "QUOTED",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-25T05:31:14Z",
    updatedAt: "2026-08-26T03:07:29Z",
    items: [
      createItem({
        seed: "08a",
        productName: "Bộ đồ chơi lắp ráp 1200 chi tiết",
        productTypeCode: "TOYS",
        productLink:
          "https://detail.1688.com/offer/330458971264.html",
        quantity: 24,
        unitPrice: 195000,
        attributes: "Phân loại: Bản có hộp đựng",
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.05,
      shippingFee: 940000,
      createdAt: "2026-08-26T03:07:29Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
    },
  }),

  /* ---------- ĐÃ GỬI BÁO GIÁ (QUOTATION_SENT) ---------- */
  createPurchaseRequest({
    seed: "09",
    code: "PUR-20260824022640-701582",
    status: "QUOTATION_SENT",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-24T02:26:40Z",
    updatedAt: "2026-08-25T01:48:16Z",
    requiresWoodenCrate: true,
    generalNote: "Nồi chiên dễ móp, nhờ đóng thùng gỗ.",
    items: [
      createItem({
        seed: "09a",
        productName: "Nồi chiên không dầu 5.5L",
        productTypeCode: "HOUSEHOLD",
        productLink:
          "https://detail.tmall.com/item.htm?id=671209384455",
        quantity: 9,
        unitPrice: 1180000,
        attributes: "Màu: Trắng; Điện áp 220V",
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.03,
      shippingFee: 1420000,
      createdAt: "2026-08-25T01:48:16Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
      note: "Đã gồm phí đóng thùng gỗ cho toàn đơn.",
    },
  }),

  createPurchaseRequest({
    seed: "10",
    code: "PUR-20260823074905-264730",
    status: "QUOTATION_SENT",
    route: ROUTES.sea,
    shippingOption: "EXPRESS",
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-23T07:49:05Z",
    updatedAt: "2026-08-24T06:22:38Z",
    items: [
      createItem({
        seed: "10a",
        productName: "Máy massage cổ vai gáy cầm tay",
        productTypeCode: "HOUSEHOLD",
        productLink:
          "https://item.taobao.com/item.htm?id=748120359966",
        quantity: 14,
        unitPrice: 465000,
        attributes: "Màu: Xám bạc",
      }),
      createItem({
        seed: "10b",
        productName: "Đèn ngủ để bàn cảm ứng 3 chế độ",
        productTypeCode: "HOME_APPLIANCE",
        productLink:
          "https://item.taobao.com/item.htm?id=748120360014",
        quantity: 20,
        unitPrice: 138000,
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.07,
      shippingFee: 1310000,
      createdAt: "2026-08-24T06:22:38Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
    },
  }),

  createPurchaseRequest({
    seed: "11",
    code: "PUR-20260822040327-590817",
    status: "QUOTATION_SENT",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.chi,
    createdAt: "2026-08-22T04:03:27Z",
    updatedAt: "2026-08-23T02:55:12Z",
    requiresPacking: true,
    requiresInsurance: true,
    items: [
      createItem({
        seed: "11a",
        productName: "Balo laptop chống nước 15.6 inch",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/226709451188.html",
        quantity: 25,
        unitPrice: 268000,
        attributes: "Màu: Xám đậm",
      }),
    ],
    quotation: {
      status: "PENDING_CUSTOMER_CONFIRMATION",
      priceMultiplier: 1.05,
      shippingFee: 860000,
      createdAt: "2026-08-23T02:55:12Z",
      expiredAt: ACTIVE_QUOTATION_EXPIRES_AT,
    },
  }),

  /* ---------- ĐÃ DUYỆT / ĐÃ THANH TOÁN ---------- */
  createPurchaseRequest({
    seed: "12",
    code: "PUR-20260820063512-148396",
    status: "APPROVED",
    route: ROUTES.mongcai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.hung,
    createdAt: "2026-08-20T06:35:12Z",
    updatedAt: "2026-08-21T03:19:44Z",
    approvedAt: "2026-08-21T03:19:44Z",
    items: [
      createItem({
        seed: "12a",
        productName: "Áo khoác gió nam 2 lớp",
        productTypeCode: "CLOTHING",
        productLink:
          "https://item.taobao.com/item.htm?id=759012348871",
        quantity: 30,
        unitPrice: 312000,
        attributes: "Màu: Xanh rêu; Size: L-XXL",
      }),
    ],
    quotation: {
      status: "APPROVED",
      priceMultiplier: 1.05,
      shippingFee: 1120000,
      createdAt: "2026-08-21T03:19:44Z",
      expiredAt: "2026-09-04T16:59:59Z",
    },
  }),

  createPurchaseRequest({
    seed: "13",
    code: "PUR-20260818021148-736251",
    status: "PAID",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-08-18T02:11:48Z",
    updatedAt: "2026-08-19T08:04:27Z",
    approvedAt: "2026-08-19T02:41:09Z",
    items: [
      createItem({
        seed: "13a",
        productName: "Bình đun siêu tốc thủy tinh 1.8L",
        productTypeCode: "HOUSEHOLD",
        productLink:
          "https://detail.tmall.com/item.htm?id=612340987755",
        quantity: 16,
        unitPrice: 385000,
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.04,
      shippingFee: 980000,
      createdAt: "2026-08-19T02:41:09Z",
      expiredAt: "2026-09-02T16:59:59Z",
    },
  }),

  createPurchaseRequest({
    seed: "14",
    code: "PUR-20260815092733-402968",
    status: "PAID",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.linh,
    createdAt: "2026-08-15T09:27:33Z",
    updatedAt: "2026-08-17T04:36:50Z",
    approvedAt: "2026-08-16T03:22:14Z",
    requiresInsurance: true,
    items: [
      createItem({
        seed: "14a",
        productName: "Váy hai dây lụa satin",
        productTypeCode: "CLOTHING",
        productLink:
          "https://item.taobao.com/item.htm?id=703451298866",
        quantity: 40,
        unitPrice: 178000,
        attributes: "Màu: Đỏ đô, Đen; Size: S-M",
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.06,
      shippingFee: 760000,
      createdAt: "2026-08-16T03:22:14Z",
      expiredAt: "2026-08-30T16:59:59Z",
    },
  }),

  /* ---------- ĐANG XỬ LÝ ---------- */
  createPurchaseRequest({
    seed: "15",
    code: "PUR-20260812054419-857130",
    status: "PROCESSING",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.trang,
    createdAt: "2026-08-12T05:44:19Z",
    updatedAt: "2026-08-20T07:12:35Z",
    approvedAt: "2026-08-13T02:18:44Z",
    generalNote: "Đã đặt hàng tại nguồn, chờ shop giao về kho TQ.",
    items: [
      createItem({
        seed: "15a",
        productName: "Bộ dụng cụ sửa xe đạp 16 món",
        productTypeCode: "OTHER",
        productLink:
          "https://detail.1688.com/offer/914502367781.html",
        quantity: 22,
        unitPrice: 165000,
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.05,
      shippingFee: 690000,
      createdAt: "2026-08-13T02:18:44Z",
      expiredAt: "2026-08-27T16:59:59Z",
    },
  }),

  createPurchaseRequest({
    seed: "16",
    code: "PUR-20260808011652-329604",
    status: "PROCESSING",
    route: ROUTES.sea,
    shippingOption: "EXPRESS",
    receiver: RECEIVERS.nam,
    createdAt: "2026-08-08T01:16:52Z",
    updatedAt: "2026-08-19T02:44:08Z",
    approvedAt: "2026-08-09T06:30:21Z",
    requiresWoodenCrate: true,
    items: [
      createItem({
        seed: "16a",
        productName: "Xe cân bằng trẻ em 12 inch",
        productTypeCode: "TOYS",
        productLink:
          "https://detail.1688.com/offer/128904567712.html",
        quantity: 8,
        unitPrice: 720000,
        attributes: "Màu: Hồng, Xanh mint",
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.03,
      shippingFee: 1560000,
      createdAt: "2026-08-09T06:30:21Z",
      expiredAt: "2026-08-23T16:59:59Z",
    },
  }),

  /* ---------- HOÀN TẤT ---------- */
  createPurchaseRequest({
    seed: "17",
    code: "PUR-20260730085326-671249",
    status: "COMPLETED",
    route: ROUTES.main,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.ngoc,
    createdAt: "2026-07-30T08:53:26Z",
    updatedAt: "2026-08-18T09:41:02Z",
    approvedAt: "2026-07-31T02:26:37Z",
    generalNote: "Đơn mẫu đã giao xong, dùng để đối chiếu lịch sử.",
    items: [
      createItem({
        seed: "17a",
        productName: "Tai nghe bluetooth chụp tai Edifier W820NB",
        productTypeCode: "ELECTRONICS",
        productLink:
          "https://detail.tmall.com/item.htm?id=684120397751",
        quantity: 12,
        unitPrice: 985000,
      }),
      createItem({
        seed: "17b",
        productName: "Ốp lưng điện thoại silicon (combo 20 cái)",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/778451203964.html",
        quantity: 10,
        unitPrice: 142000,
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.05,
      shippingFee: 1340000,
      createdAt: "2026-07-31T02:26:37Z",
      expiredAt: "2026-08-14T16:59:59Z",
    },
  }),

  createPurchaseRequest({
    seed: "18",
    code: "PUR-20260716042057-983512",
    status: "COMPLETED",
    route: ROUTES.mongcai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.khoa,
    createdAt: "2026-07-16T04:20:57Z",
    updatedAt: "2026-08-06T03:28:19Z",
    approvedAt: "2026-07-17T01:52:40Z",
    items: [
      createItem({
        seed: "18a",
        productName: "Kệ để giày 5 tầng bằng thép",
        productTypeCode: "HOUSEHOLD",
        productLink:
          "https://detail.1688.com/offer/669120458733.html",
        quantity: 10,
        unitPrice: 420000,
      }),
    ],
    quotation: {
      status: "PAID",
      priceMultiplier: 1.04,
      shippingFee: 1480000,
      createdAt: "2026-07-17T01:52:40Z",
      expiredAt: "2026-07-31T16:59:59Z",
    },
  }),

  /* ---------- TỪ CHỐI / HUỶ ---------- */
  createPurchaseRequest({
    seed: "19",
    code: "PUR-20260702024811-205876",
    status: "REJECTED",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.chi,
    createdAt: "2026-07-02T02:48:11Z",
    updatedAt: "2026-07-03T07:15:26Z",
    rejectedAt: "2026-07-03T07:15:26Z",
    reason:
      "Mặt hàng chứa pin lithium rời, không nhận vận chuyển đường bộ.",
    generalNote: "Khách khai báo pin sạc dự phòng dung lượng lớn.",
    items: [
      createItem({
        seed: "19a",
        productName: "Pin sạc dự phòng 20000mAh",
        productTypeCode: "ELECTRONICS",
        productLink:
          "https://detail.1688.com/offer/450912337781.html",
        quantity: 20,
        unitPrice: 295000,
      }),
    ],
  }),

  createPurchaseRequest({
    seed: "20",
    code: "PUR-20260624090538-514063",
    status: "CANCELLED",
    route: ROUTES.laocai,
    shippingOption: "STANDARD",
    receiver: RECEIVERS.linh,
    createdAt: "2026-06-24T09:05:38Z",
    updatedAt: "2026-06-26T02:33:47Z",
    cancelledAt: "2026-06-26T02:33:47Z",
    reason: "Khách tự huỷ do tìm được nguồn hàng trong nước.",
    items: [
      createItem({
        seed: "20a",
        productName: "Kính râm chống UV400 gọng kim loại",
        productTypeCode: "ACCESSORIES",
        productLink:
          "https://detail.1688.com/offer/778451204118.html",
        quantity: 40,
        unitPrice: 78000,
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
 * Tìm yêu cầu mua hộ theo purchaseRequestId.
 *
 * Trả về THAM CHIẾU tới fixture gốc — module mock phải deepClone trước khi
 * trả về cho component.
 *
 * @param {string} purchaseRequestId
 * @returns {object | null}
 */
export const findPurchaseRequestById = (purchaseRequestId) => {
  const key = normalizeKey(purchaseRequestId);

  if (!key) {
    return null;
  }

  return (
    purchaseRequests.find(
      (request) =>
        normalizeKey(request.purchaseRequestId) === key
    ) || null
  );
};

/**
 * Tìm yêu cầu mua hộ theo purchaseCode.
 *
 * @param {string} code
 * @returns {object | null}
 */
export const findPurchaseRequestByCode = (code) => {
  const key = normalizeKey(code);

  if (!key) {
    return null;
  }

  return (
    purchaseRequests.find(
      (request) => normalizeKey(request.purchaseCode) === key
    ) || null
  );
};

/**
 * Lọc theo trạng thái. Nhận một mã hoặc một mảng mã.
 *
 * @param {string | string[]} status
 * @returns {Array<object>}
 */
export const findPurchaseRequestsByStatus = (status) => {
  const wanted = (Array.isArray(status) ? status : [status])
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (wanted.length === 0) {
    return [...purchaseRequests];
  }

  return purchaseRequests.filter((request) =>
    wanted.includes(request.status)
  );
};

export default purchaseRequests;
