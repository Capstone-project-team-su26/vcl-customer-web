export const WAREHOUSE_STATUS = Object.freeze({
  RECEIVED: "RECEIVED",
  IN_STORAGE: "IN_STORAGE",
  CUSTOMS_REVIEW: "CUSTOMS_REVIEW",
  CUSTOMS_CLEARED: "CUSTOMS_CLEARED",
  OUTBOUND_READY: "OUTBOUND_READY",
  RELEASED: "RELEASED",
  IN_TRANSIT: "IN_TRANSIT",
});

export const WAREHOUSE_STATUS_META = Object.freeze({
  RECEIVED: { label: "Đã nhập kho quốc tế", tone: "blue" },
  IN_STORAGE: { label: "Đang lưu kho", tone: "cyan" },
  CUSTOMS_REVIEW: { label: "Đang thông quan", tone: "amber" },
  CUSTOMS_CLEARED: { label: "Đã thông quan", tone: "green" },
  OUTBOUND_READY: { label: "Sẵn sàng xuất kho", tone: "violet" },
  RELEASED: { label: "Đã xuất kho", tone: "green" },
  IN_TRANSIT: { label: "Đang vận chuyển về Việt Nam", tone: "orange" },
});

const customer = {
  id: "77206b20-834f-409d-afbe-d5a23de71b25",
  customerId: "77206b20-834f-409d-afbe-d5a23de71b25",
  name: "Phong",
  fullName: "Phong",
  phone: "0833183077",
  email: "phongpvse161146@fpt.edu.vn",
};

const createTimeline = ({
  createdAt,
  receivedAt,
  storedAt,
  customsAt,
  releasedAt,
  transitAt,
  current,
  location,
  customsLabel = "Kiểm tra thông quan",
  releaseLabel = "Xuất kho quốc tế",
  transitLabel = "Vận chuyển về Việt Nam",
}) => {
  const order = ["created", "received", "stored", "customs", "released", "transit"];
  const currentIndex = order.indexOf(current);
  const event = (key, label, description, at) => ({
    key,
    label,
    description,
    at,
    state:
      order.indexOf(key) < currentIndex
        ? "complete"
        : key === current
          ? "current"
          : "upcoming",
  });

  return [
    event("created", "Tạo đơn hàng", "Đơn đã được xác nhận", createdAt),
    event("received", "Nhập kho quốc tế", "Kho đã kiểm nhận hàng", receivedAt),
    event("stored", "Lưu kho", location, storedAt),
    event("customs", customsLabel, customsAt ? "Đã có hồ sơ hải quan" : "Chưa tạo hồ sơ", customsAt),
    event(
      "released",
      releaseLabel,
      current === "released"
        ? "Phiếu WRO đã duyệt, sẵn sàng bàn giao"
        : releasedAt
          ? "Đã bàn giao vận chuyển"
          : "Chưa có lịch",
      releasedAt
    ),
    event("transit", transitLabel, transitAt ? "Hàng đang trên hành trình" : "Chưa bắt đầu", transitAt),
  ];
};

export const WAREHOUSE_SHIPMENTS = [
  {
    id: "shipment-765088",
    orderId: "6bd341b5-8324-4789-97f8-504cfd31ceb1",
    consignmentCode: "VCL-20260722133543-765088",
    consignmentType: "Standard",
    orderStatus: "DEPOSIT_PAID",
    orderType: "CONSIGNMENT",
    serviceName: "Ký gửi tiêu chuẩn",
    status: WAREHOUSE_STATUS.CUSTOMS_REVIEW,
    customer,
    route: "Trung Quốc → Việt Nam",
    apiRoute: "Trung quốc --> Việt Nam",
    note: "a. Yêu cầu đóng gói: WOOD_CRATE. Yêu cầu kiểm hàng",
    receiverName: "aa",
    receiverPhone: "0929090390",
    receiverAddress:
      "hezm 32, Xã Thượng Nông, Huyện Na Hang, Tỉnh Tuyên Quang",
    requiresInspection: true,
    createdAt: "2026-07-22T13:35:43.4308189Z",
    paymentConfirmedAt: "2026-07-22T13:36:33.964328Z",
    statusUpdatedAt: "2026-07-22T13:36:33.964328Z",
    pricingRuleIds: [
      "bf39c7ce-9fd7-4142-a260-016c27fd489f",
      "397a6b9a-4efd-4de7-9367-de60b5a65616",
    ],
    internationalWarehouse: {
      name: "Kho VCL Quảng Châu",
      address: "Bạch Vân, Quảng Châu, Trung Quốc",
      zone: "Zone A",
      binCode: "A1-02",
    },
    packageCount: 2,
    totalQuantity: 2,
    totalWeight: 2,
    totalVolume: 8,
    storageDays: 8,
    lastUpdatedAt: "2026-07-30T02:18:00Z",
    expectedVietnamAt: "2026-08-03T03:30:00Z",
    items: [
      {
        id: "2e578846-6f39-41cc-b66d-77b19ba13e55",
        packageCode: "PKG-20260722-0001",
        productName: "aa",
        productType: "11111111-0000-0000-0000-000000000003",
        configuration: "Medium Box (30 × 20 × 15 cm)",
        quantity: 2,
        weight: 2,
        width: 2,
        height: 2,
        length: 2,
        declaredValue: 2,
        referenceUrls: [
          "https://res.cloudinary.com/penyhvpn/image/upload/v1784727341/vcl/consignment-items/geeyzpepbn5tmu0nyfct.png",
        ],
        domesticTrackingCode: null,
        packageConfigurationId:
          "99999999-2222-2222-2222-222222222222",
        packageConfiguration: {
          id: "99999999-2222-2222-2222-222222222222",
          configCode: "MEDIUM",
          configName: "Medium Box",
          length: 30,
          width: 20,
          height: 15,
          maxWeight: 5,
          packageFee: 25000,
          status: "ACTIVE",
          estimatedFee: null,
        },
        volumetricWeight: 0.0016,
        declaredWeight: 2,
        actualWeight: 2.1,
        difference: 0.1,
      },
    ],
    inbound: {
      status: "RECEIVED",
      receiptId: "WR-20260722-00089",
      receivedAt: "2026-07-22T06:40:00Z",
      staffName: "Warehouse Staff A",
      packageCount: 2,
      actualWeight: 2.1,
      inspectionResult: "Đủ số lượng, bao bì nguyên vẹn",
      note: "Đã đối chiếu hàng thực tế với phiếu nhập kho.",
    },
    customs: {
      status: "CUSTOMS_REVIEW",
      declarationCode: "HQ-20260729-568645",
      channel: "Luồng vàng",
      submittedAt: "2026-07-29T04:15:00Z",
      clearedAt: null,
      note: "Hồ sơ đang được kiểm tra. Chưa cần bổ sung chứng từ.",
      documents: [
        { id: "DOC-001", name: "Commercial Invoice", fileName: "invoice_765088.pdf", status: "VALID" },
        { id: "DOC-002", name: "Packing List", fileName: "packing_list_765088.pdf", status: "VALID" },
        { id: "DOC-003", name: "Phiếu nhập kho", fileName: "WR-20260722-00089.pdf", status: "VALID" },
      ],
    },
    outbound: {
      status: "PENDING_CUSTOMS",
      wroCode: "WRO-20260730-0002",
      carrier: "VCL Cross-border",
      trackingCode: "VCLVN568645",
      expectedReleaseAt: "2026-07-31T02:00:00Z",
      releasedAt: null,
    },
    quotation: {
      quotationId: "c0f6fa72-ad39-4554-9262-270a0ed9646f",
      quoteType: "OFFICIAL",
      status: "ACCEPTED",
      estimatedFreightCharge: 10000,
      domesticShippingFee: 5000,
      serviceFee: 70000,
      taxAndDuty: 6800,
      totalVolume: 8,
      totalEstimatedCost: 91800,
      createdAt: "2026-07-22T13:36:01.5654111Z",
      expiredAt: "2026-07-29T13:36:01.3921088Z",
    },
    timeline: createTimeline({
      createdAt: "2026-07-22T06:36:33Z",
      receivedAt: "2026-07-22T06:40:00Z",
      storedAt: "2026-07-22T07:05:00Z",
      customsAt: "2026-07-29T04:15:00Z",
      current: "customs",
      location: "Zone A · Kệ A1-02",
    }),
  },
  {
    id: "shipment-267830",
    consignmentCode: "VCL-20260720140801-267830",
    orderType: "CONSIGNMENT",
    serviceName: "Ký gửi tiêu chuẩn",
    status: WAREHOUSE_STATUS.IN_STORAGE,
    customer,
    route: "Trung Quốc → Việt Nam",
    internationalWarehouse: {
      name: "Kho VCL Quảng Châu",
      address: "Bạch Vân, Quảng Châu, Trung Quốc",
      zone: "Zone B",
      binCode: "B3-06",
    },
    packageCount: 1,
    totalQuantity: 1,
    totalWeight: 1.45,
    totalVolume: 5.6,
    storageDays: 10,
    lastUpdatedAt: "2026-07-29T08:10:00Z",
    expectedVietnamAt: null,
    items: [
      {
        id: "item-chair-267830",
        packageCode: "PKG-20260720-0002",
        productName: "Ghế văn phòng",
        configuration: "Large Box (50 × 40 × 30 cm)",
        quantity: 1,
        declaredWeight: 1.5,
        actualWeight: 1.45,
        difference: -0.05,
      },
    ],
    inbound: {
      status: "RECEIVED",
      receiptId: "WR-20260720-00076",
      receivedAt: "2026-07-20T07:20:00Z",
      staffName: "Warehouse Staff B",
      packageCount: 1,
      actualWeight: 1.45,
      inspectionResult: "Đủ số lượng, kiện không móp",
      note: "Hàng đang chờ khách tạo yêu cầu xuất kho.",
    },
    customs: {
      status: "NOT_SUBMITTED",
      declarationCode: null,
      channel: null,
      submittedAt: null,
      clearedAt: null,
      note: "Hồ sơ thông quan được tạo sau khi có phiếu xuất kho.",
      documents: [
        { id: "DOC-004", name: "Phiếu nhập kho", fileName: "WR-20260720-00076.pdf", status: "VALID" },
      ],
    },
    outbound: {
      status: "NOT_CREATED",
      wroCode: null,
      carrier: null,
      trackingCode: null,
      expectedReleaseAt: null,
      releasedAt: null,
    },
    timeline: createTimeline({
      createdAt: "2026-07-20T05:08:01Z",
      receivedAt: "2026-07-20T07:20:00Z",
      storedAt: "2026-07-20T07:42:00Z",
      current: "stored",
      location: "Zone B · Kệ B3-06",
    }),
  },
  {
    id: "shipment-443219",
    consignmentCode: "VCL-20260718103112-443219",
    orderType: "BUY_FOR_ME",
    serviceName: "Mua hộ quốc tế",
    status: WAREHOUSE_STATUS.OUTBOUND_READY,
    customer,
    route: "Trung Quốc → Việt Nam",
    internationalWarehouse: {
      name: "Kho VCL Thâm Quyến",
      address: "Long Cương, Thâm Quyến, Trung Quốc",
      zone: "Zone C",
      binCode: "C2-11",
    },
    packageCount: 3,
    totalQuantity: 12,
    totalWeight: 8.65,
    totalVolume: 26,
    storageDays: 6,
    lastUpdatedAt: "2026-07-30T01:45:00Z",
    expectedVietnamAt: "2026-08-02T02:30:00Z",
    items: [
      {
        id: "item-tools-443219",
        packageCode: "PKG-20260724-0011",
        productName: "Bộ dụng cụ cầm tay",
        configuration: "3 thùng carton",
        quantity: 12,
        declaredWeight: 8.5,
        actualWeight: 8.65,
        difference: 0.15,
      },
    ],
    inbound: {
      status: "RECEIVED",
      receiptId: "WR-20260724-00112",
      receivedAt: "2026-07-24T03:30:00Z",
      staffName: "Warehouse Staff C",
      packageCount: 3,
      actualWeight: 8.65,
      inspectionResult: "Đạt yêu cầu",
      note: "Đã gộp 3 kiện theo yêu cầu khách hàng.",
    },
    customs: {
      status: "CUSTOMS_CLEARED",
      declarationCode: "HQ-20260728-443219",
      channel: "Luồng xanh",
      submittedAt: "2026-07-28T02:12:00Z",
      clearedAt: "2026-07-28T04:25:00Z",
      note: "Hồ sơ đã được thông quan.",
      documents: [
        { id: "DOC-005", name: "Commercial Invoice", fileName: "invoice_443219.pdf", status: "VALID" },
        { id: "DOC-006", name: "Packing List", fileName: "packing_list_443219.pdf", status: "VALID" },
      ],
    },
    outbound: {
      status: "READY",
      wroCode: "WRO-20260730-0001",
      carrier: "SF International",
      trackingCode: "SFVCL443219",
      expectedReleaseAt: "2026-07-30T09:30:00Z",
      releasedAt: null,
    },
    timeline: createTimeline({
      createdAt: "2026-07-18T03:31:12Z",
      receivedAt: "2026-07-24T03:30:00Z",
      storedAt: "2026-07-24T04:00:00Z",
      customsAt: "2026-07-28T04:25:00Z",
      releasedAt: "2026-07-30T01:45:00Z",
      current: "released",
      location: "Zone C · Kệ C2-11",
      customsLabel: "Đã thông quan",
      releaseLabel: "Sẵn sàng xuất kho",
    }),
  },
  {
    id: "shipment-891502",
    consignmentCode: "VCL-20260712162009-891502",
    orderType: "CONSIGNMENT",
    serviceName: "Ký gửi tiêu chuẩn",
    status: WAREHOUSE_STATUS.IN_TRANSIT,
    customer,
    route: "Trung Quốc → Việt Nam",
    internationalWarehouse: {
      name: "Kho VCL Quảng Châu",
      address: "Bạch Vân, Quảng Châu, Trung Quốc",
      zone: "Đã rời kho",
      binCode: "--",
    },
    packageCount: 2,
    totalQuantity: 4,
    totalWeight: 5.4,
    totalVolume: 18,
    storageDays: 11,
    lastUpdatedAt: "2026-07-30T03:20:00Z",
    expectedVietnamAt: "2026-07-31T10:00:00Z",
    items: [
      {
        id: "item-camera-891502",
        packageCode: "PKG-20260712-0008",
        productName: "Phụ kiện máy ảnh",
        configuration: "2 thùng carton",
        quantity: 4,
        declaredWeight: 5.3,
        actualWeight: 5.4,
        difference: 0.1,
      },
    ],
    inbound: {
      status: "RECEIVED",
      receiptId: "WR-20260715-00048",
      receivedAt: "2026-07-15T06:05:00Z",
      staffName: "Warehouse Staff A",
      packageCount: 2,
      actualWeight: 5.4,
      inspectionResult: "Đạt yêu cầu",
      note: "Đã hoàn thành nhập kho.",
    },
    customs: {
      status: "CUSTOMS_CLEARED",
      declarationCode: "HQ-20260726-891502",
      channel: "Luồng xanh",
      submittedAt: "2026-07-26T01:18:00Z",
      clearedAt: "2026-07-26T03:02:00Z",
      note: "Đã thông quan.",
      documents: [
        { id: "DOC-007", name: "Commercial Invoice", fileName: "invoice_891502.pdf", status: "VALID" },
        { id: "DOC-008", name: "Packing List", fileName: "packing_list_891502.pdf", status: "VALID" },
      ],
    },
    outbound: {
      status: "RELEASED",
      wroCode: "WRO-20260729-0007",
      carrier: "VCL Cross-border",
      trackingCode: "VCLVN891502",
      expectedReleaseAt: "2026-07-29T02:00:00Z",
      releasedAt: "2026-07-29T02:16:00Z",
    },
    timeline: createTimeline({
      createdAt: "2026-07-12T09:20:09Z",
      receivedAt: "2026-07-15T06:05:00Z",
      storedAt: "2026-07-15T06:30:00Z",
      customsAt: "2026-07-26T03:02:00Z",
      releasedAt: "2026-07-29T02:16:00Z",
      transitAt: "2026-07-29T03:10:00Z",
      current: "transit",
      location: "Đã lấy hàng khỏi vị trí",
      customsLabel: "Đã thông quan",
      releaseLabel: "Đã xuất kho",
      transitLabel: "Đang về Việt Nam",
    }),
  },
];

export const getWarehouseShipment = (shipmentId) =>
  WAREHOUSE_SHIPMENTS.find((shipment) => shipment.id === shipmentId) || null;

export const getWarehouseReceipt = (receiptId) => {
  const shipment = WAREHOUSE_SHIPMENTS.find(
    (item) => item.inbound.receiptId === receiptId
  );

  return shipment
    ? { id: receiptId, shipment, ...shipment.inbound }
    : null;
};
