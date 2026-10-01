/**
 * Soát nhãn tiếng Việt cho MỌI mã trạng thái / chặng / mốc / loại / vai trò backend có thể trả
 * về web khách hàng. Luật: khách KHÔNG BAO GIỜ thấy mã thô (RECEIVED_AT_DESTINATION, PENDING…)
 * hay chữ tiếng Anh (Draft, N/A…).
 *
 *   node tools/verify-status-labels.mjs     (hoặc npm run verify:status-labels)
 *
 * Kiểm ba lớp:
 *   (a) lưới an toàn: mọi mã trong tools/status-codes.json (kể cả mã cũ `legacy`) qua
 *       `labelOf(null, code)` ra nhãn không phải mã, và không mã nào rơi xuống nhãn chung
 *       (`getUnlabelledCodes()` rỗng);
 *   (b) từng họ mã có bảng / getter riêng trong app: mọi mã HIỆN HÀNH của họ phải có trong bảng
 *       của họ, và getter thật trả chữ tiếng Việt (không phải mã, không phải nhãn chung);
 *   (c) vài ca I/O cố định (mốc RECEIVED_AT_DESTINATION server trả mã làm title, mã lạ FOO_BAR…).
 *
 * Nạp module sản phẩm qua Vite SSR (alias @shared/ @features/ chạy như trong app). Không gọi mạng.
 * Thoát mã 1 nếu có sai lệch.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CODES_FILE = path.join(ROOT, "tools", "status-codes.json");

if (!fs.existsSync(CODES_FILE)) {
  console.error("Không tìm thấy danh sách mã backend: " + CODES_FILE);
  process.exit(2);
}

const { families } = JSON.parse(fs.readFileSync(CODES_FILE, "utf8"));
const problems = [];
let checked = 0;

const server = await createServer({
  configFile: path.join(ROOT, "vite.config.js"),
  root: ROOT,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, ws: false },
});

const load = (rel) => server.ssrLoadModule(rel);

/* Nhãn mã lạ in cảnh báo dev (cố ý) — gom lại, không để lẫn vào báo cáo. */
const originalWarn = console.warn;
const warnings = [];
console.warn = (...args) => warnings.push(args.map(String).join(" "));

try {
  const S = await load("/src/shared/utils/statusLabel.js");
  const tracking = await load("/src/features/tracking/constants/trackingStages.js");
  const orderStatus = await load("/src/features/consignment/constants/orderStatus.js");
  const purchase = await load("/src/features/purchase/constants/purchaseStages.js");
  const purchaseOrder = await load("/src/features/purchase/api/purchaseOrderApi.js");
  const incident = await load("/src/features/incidents/api/parcelIncidentApi.js");
  const delivery = await load("/src/features/delivery/api/deliveryRequestApi.js");
  const handling = await load("/src/features/delivery/api/destinationHandlingApi.js");
  const settlement = await load("/src/features/settlement/api/settlementApi.js");
  const attachment = await load("/src/shared/api/attachmentApi.js");
  const orderPayment = await load("/src/features/payment/api/orderPaymentApi.js");
  const timeline = await load("/src/features/consignment/components/OrderTimelineCard/OrderTimelineCard.helpers.js");
  const receiving = await load("/src/features/receiving/components/ReceivingNoteDocument/ReceivingNoteDocument.jsx");

  const { isCodeLike, labelOf, GENERIC_STATUS_LABEL, EMPTY_LABEL } = S;

  /* Nhãn trùng chữ với mã nhưng là tên riêng viết đúng kiểu (VNPay) hoặc từ đã Việt hoá (Pallet). */
  const SAME_AS_CODE_OK = new Set(["VNPay", "Pallet"]);

  /** Lỗi của một nhãn, "" nếu ổn. */
  const badLabel = (label, code) => {
    const text = String(label ?? "").trim();
    if (!text || text === EMPTY_LABEL) return "rỗng";
    if (text.toUpperCase() === String(code).toUpperCase() && !SAME_AS_CODE_OK.has(text)) {
      return "in nguyên mã";
    }
    if (isCodeLike(text)) return `trông như mã / chữ trạng thái tiếng Anh ("${text}")`;
    if (text.includes("_")) return `còn gạch dưới ("${text}")`;
    return "";
  };

  const codesOf = (family, { legacy = false } = {}) => {
    const entry = families[family];
    if (!entry) {
      problems.push(`HỌ MÃ LẠ ${family}: không có trong tools/status-codes.json`);
      return [];
    }
    return [...entry.codes, ...(legacy ? entry.legacy || [] : [])];
  };

  /* ---- (a) Lưới an toàn: mọi mã backend ---- */
  for (const [family, entry] of Object.entries(families)) {
    for (const code of [...entry.codes, ...(entry.legacy || [])]) {
      checked += 1;
      const why = badLabel(labelOf(null, code), code);
      if (why) problems.push(`(a) ${family}.${code}: labelOf(null) ${why}`);
    }
  }
  const unlabelled = S.getUnlabelledCodes();
  if (unlabelled.length) problems.push(`(a) mã rơi xuống nhãn chung: ${unlabelled.join(", ")}`);

  /* ---- (b) Họ mã có bảng + getter riêng ---- */
  const hasKey = (map, code) => {
    if (Array.isArray(map)) return map.some((item) => String(item?.value ?? item?.key) === code);
    return Object.prototype.hasOwnProperty.call(map, code);
  };

  /**
   * @param {string} name     tên hiển thị trong báo cáo
   * @param {string[]} families họ mã trong status-codes.json
   * @param {object|null} map  bảng nhãn của họ (null = chỉ kiểm getter)
   * @param {(code: string) => string} getter getter thật màn hình dùng
   * @param {{ legacy?: boolean, keyOf?: (code: string) => string, allowGeneric?: boolean }} [opts]
   */
  const checkFamily = (name, familyNames, map, getter, opts = {}) => {
    const { legacy = false, keyOf = (code) => code } = opts;
    const codes = [...new Set(familyNames.flatMap((family) => codesOf(family, { legacy })))];
    for (const code of codes) {
      checked += 1;
      if (map && !hasKey(map, keyOf(code))) problems.push(`(b) ${name}: bảng thiếu mã ${code}`);
      let label;
      try {
        label = getter(code);
      } catch (e) {
        problems.push(`(b) ${name}.${code}: getter lỗi ${e.message}`);
        continue;
      }
      const why = badLabel(label, code);
      if (why) problems.push(`(b) ${name}.${code}: getter ${why}`);
      else if (label === GENERIC_STATUS_LABEL) problems.push(`(b) ${name}.${code}: getter ra nhãn chung`);
    }
  };

  checkFamily(
    "Chặng hành trình (TRACKING_STAGE_LABELS)",
    ["trackingStage", "customerTrackingEvent", "shipmentEvent"],
    tracking.TRACKING_STAGE_LABELS,
    (code) => tracking.getTrackingStageLabel(code),
  );
  checkFamily(
    "Chặng hành trình — server trả chính mã làm chữ",
    ["trackingStage", "customerTrackingEvent", "shipmentEvent"],
    null,
    (code) => tracking.getTrackingStageLabel(code, code),
  );
  checkFamily(
    "Trạng thái chuyến (thẻ chuyến dùng TRACKING_STAGE_LABELS)",
    ["shipmentStatus"],
    tracking.TRACKING_STAGE_LABELS,
    (code) => tracking.getTrackingStageLabel(code),
  );
  checkFamily(
    "Điểm dừng lộ trình (TRACKING_ROUTE_STOP_LABELS)",
    ["trackingRouteStop"],
    tracking.TRACKING_ROUTE_STOP_LABELS,
    (code) => tracking.getTrackingRouteStopLabel(code, code),
  );
  checkFamily(
    "Trạng thái kiện (PACKAGE_STATUS_LABELS)",
    ["parcelStatus"],
    tracking.PACKAGE_STATUS_LABELS,
    (code) => tracking.getPackageStatusLabel(code, code),
  );
  checkFamily(
    "Trạng thái đơn (getOrderStatusLabel)",
    ["orderStatus"],
    null,
    (code) => orderStatus.getOrderStatusLabel(code),
    { legacy: true },
  );
  checkFamily(
    "Lịch sử đơn (ORDER_HISTORY_EVENT_LABELS)",
    ["orderHistoryEvent"],
    timeline.ORDER_HISTORY_EVENT_LABELS,
    (code) => timeline.getTimelineEventLabel({ event: code }),
  );
  checkFamily(
    "Yêu cầu mua hộ (PURCHASE_REQUEST_STATUS_LABELS)",
    ["purchaseRequestStatus"],
    purchase.PURCHASE_REQUEST_STATUS_LABELS,
    (code) => purchase.getPurchaseStatusLabel(code, code),
    { legacy: true },
  );
  checkFamily(
    "Đơn mua NCC (SUPPLIER_ORDER_STEPS)",
    ["purchaseOrderStatus"],
    purchaseOrder.SUPPLIER_ORDER_STEPS,
    (code) => purchaseOrder.getSupplierOrderStep(code).label,
  );
  checkFamily(
    "Trạng thái khoản hoàn (REFUND_STATUS_TEXT)",
    ["refundStatus"],
    purchaseOrder.REFUND_STATUS_TEXT,
    (code) => purchaseOrder.getRefundStatusText(code).label,
  );
  checkFamily(
    "Lý do dòng hoàn (REFUND_LINE_REASON_TEXT)",
    ["refundReason"],
    purchaseOrder.REFUND_LINE_REASON_TEXT,
    (code) => purchaseOrder.getRefundLineReasonText(code),
  );
  checkFamily(
    "Loại khoản thu (INSTALLMENT_TYPE_LABELS)",
    ["installmentType", "purchasePaymentType"],
    S.INSTALLMENT_TYPE_LABELS,
    (code) => S.getInstallmentTypeLabel(code, code),
  );
  checkFamily(
    "Trạng thái thanh toán (PAYMENT_STATUS_LABELS)",
    ["paymentStatus", "aggregatePaymentStatus", "invoiceStatus"],
    S.PAYMENT_STATUS_LABELS,
    (code) => S.getPaymentStatusLabel(code, code),
  );
  checkFamily(
    "Phương thức thanh toán (PAYMENT_METHOD_LABELS)",
    ["paymentMethod"],
    S.PAYMENT_METHOD_LABELS,
    (code) => S.getPaymentMethodLabel(code, code),
  );
  checkFamily(
    "Trạng thái báo giá (QUOTATION_STATUS_LABELS)",
    ["quotationStatus", "purchaseQuotationStatus"],
    S.QUOTATION_STATUS_LABELS,
    (code) => S.getQuotationStatusLabel(code, code),
  );
  checkFamily(
    "Loại báo giá (QUOTE_TYPE_LABELS)",
    ["quoteType"],
    S.QUOTE_TYPE_LABELS,
    (code) => S.getQuoteTypeLabel(code),
  );
  checkFamily(
    "Loại vận chuyển (CONSIGNMENT_TYPE_LABELS)",
    ["serviceTier"],
    S.CONSIGNMENT_TYPE_LABELS,
    (code) => S.getConsignmentTypeLabel(code),
  );
  checkFamily(
    "Vai trò (ROLE_LABELS)",
    ["role"],
    S.ROLE_LABELS,
    (code) => S.getRoleLabel(code),
    { keyOf: (code) => code.replace(/[\s_-]+/g, "") },
  );
  checkFamily(
    "Loại sự cố (INCIDENT_TYPE_LABELS)",
    ["incidentType"],
    incident.INCIDENT_TYPE_LABELS,
    (code) => incident.getIncidentTypeLabel(code, code),
  );
  checkFamily(
    "Trạng thái sự cố (INCIDENT_STATUS_LABELS)",
    ["incidentStatus"],
    incident.INCIDENT_STATUS_LABELS,
    (code) => incident.getIncidentStatusLabel(code, code),
  );
  checkFamily(
    "Kết quả xử lý sự cố (INCIDENT_RESOLUTION_LABELS)",
    ["incidentResolution"],
    incident.INCIDENT_RESOLUTION_LABELS,
    (code) => incident.getIncidentResolutionLabel(code, code),
  );
  checkFamily(
    "Lựa chọn của khách (INCIDENT_CHOICE_LABELS)",
    ["incidentResolution"],
    incident.INCIDENT_CHOICE_LABELS,
    (code) => incident.getIncidentChoiceLabel(code),
  );
  checkFamily(
    "Giai đoạn sự cố (INCIDENT_STAGE_LABELS)",
    ["incidentStage"],
    incident.INCIDENT_STAGE_LABELS,
    (code) => incident.getIncidentStageLabel(code),
  );
  checkFamily(
    "Phiếu giao (DELIVERY_REQUEST_STATUS_LABELS)",
    ["deliveryStatus"],
    delivery.DELIVERY_REQUEST_STATUS_LABELS,
    (code) => delivery.getDeliveryRequestStatusLabel(code, code),
  );
  checkFamily(
    "Hướng xử lý kiện (PARCEL_HANDLING_LABELS)",
    ["destinationHandling"],
    handling.PARCEL_HANDLING_LABELS,
    (code) => handling.getParcelHandlingLabel(code, code),
  );
  checkFamily(
    "Vướng mắc tất toán (SETTLEMENT_BLOCKER_LABELS)",
    ["settlementBlocker"],
    settlement.SETTLEMENT_BLOCKER_LABELS,
    (code) => settlement.getSettlementBlockerLabel(code, code),
  );
  checkFamily(
    "Loại giấy tờ (ATTACHMENT_DOCUMENT_TYPE_LABELS)",
    ["documentType"],
    attachment.ATTACHMENT_DOCUMENT_TYPE_LABELS,
    (code) => attachment.getAttachmentDocumentTypeLabel(code),
  );
  /* Phiếu nhập kho: bảng nằm trong component, getter trả đúng bản ghi của bảng (cùng tham chiếu). */
  checkFamily(
    "Phiếu nhập kho (getReceivingStatusMeta)",
    ["wrnStatus"],
    null,
    (code) => {
      const meta = receiving.getReceivingStatusMeta(code);
      if (meta !== receiving.getReceivingStatusMeta(code)) {
        problems.push(`(b) Phiếu nhập kho: bảng thiếu mã ${code}`);
      }
      return meta.label;
    },
  );

  /* Bảng cũ còn giữ tên export phải trỏ về đúng một bảng chung. */
  if (orderPayment.PAYMENT_INSTALLMENT_LABELS !== S.INSTALLMENT_TYPE_LABELS) {
    problems.push("(b) PAYMENT_INSTALLMENT_LABELS (orderPaymentApi) không trỏ về INSTALLMENT_TYPE_LABELS");
  }

  /* Câu phương thức thanh toán phải giống hệt web quản trị. */
  const PAYMENT_METHOD_EXPECTED = {
    SEPAY: "Chuyển khoản SePay",
    PAYOS: "Chuyển khoản payOS",
    MANUAL: "Thủ công (kế toán ghi nhận)",
    PREPAID: "Trừ vào khoản trả trước",
    OFFLINE: "Tiền mặt",
    CASH: "Tiền mặt",
    BANK_TRANSFER: "Chuyển khoản ngân hàng",
    WALLET: "Ví điện tử",
    VNPAY: "VNPay",
    MOMO: "Ví MoMo",
  };
  for (const [code, want] of Object.entries(PAYMENT_METHOD_EXPECTED)) {
    checked += 1;
    const got = S.getPaymentMethodLabel(code);
    if (got !== want) problems.push(`(b) phương thức ${code}: "${got}" ≠ "${want}" (lệch web quản trị)`);
  }

  /* ---- (c) I/O matrix ---- */
  const unknownSafe = (label, raw = "FOO") =>
    badLabel(label, raw) || (String(label).includes(raw) ? `còn chữ "${raw}"` : "");

  const matrix = [
    [
      'getTrackingStageLabel("RECEIVED_AT_DESTINATION", "RECEIVED_AT_DESTINATION")',
      () => tracking.getTrackingStageLabel("RECEIVED_AT_DESTINATION", "RECEIVED_AT_DESTINATION"),
      (v) => (v === "Kho Việt Nam đã nhận và kiểm hàng" ? "" : `ra "${v}"`),
    ],
    [
      'getTrackingStageLabel("ARRIVED_DESTINATION", "Hàng đã về kho Việt Nam") giữ chữ server',
      () => tracking.getTrackingStageLabel("ARRIVED_DESTINATION", "Hàng đã về kho Việt Nam"),
      (v) => (v === "Hàng đã về kho Việt Nam" ? "" : `ra "${v}"`),
    ],
    ['labelOf(null, "FOO_BAR")', () => labelOf(null, "FOO_BAR"), (v) => unknownSafe(v)],
    ['getTrackingStageLabel("FOO_BAR", "FOO_BAR")', () => tracking.getTrackingStageLabel("FOO_BAR", "FOO_BAR"), (v) => unknownSafe(v)],
    ['getPackageStatusLabel("FOO_BAR")', () => tracking.getPackageStatusLabel("FOO_BAR"), (v) => unknownSafe(v)],
    ['getOrderStatusLabel("FOO")', () => orderStatus.getOrderStatusLabel("FOO"), (v) => (v === GENERIC_STATUS_LABEL ? "" : `ra "${v}"`)],
    ['getPurchaseStatusLabel("FOO_BAR", "FOO_BAR")', () => purchase.getPurchaseStatusLabel("FOO_BAR", "FOO_BAR"), (v) => unknownSafe(v)],
    ['getPurchaseStatusLabel("FOO_BAR", "Pending review")', () => purchase.getPurchaseStatusLabel("FOO_BAR", "Pending review"), (v) => unknownSafe(v, "Pending")],
    ['getSupplierOrderStep("FOO_BAR").label', () => purchaseOrder.getSupplierOrderStep("FOO_BAR").label, (v) => unknownSafe(v)],
    ['getRefundReasonText("FOO_BAR")', () => purchaseOrder.getRefundReasonText("FOO_BAR"), (v) => unknownSafe(v)],
    ['getRefundStatusText("FOO_BAR").label', () => purchaseOrder.getRefundStatusText("FOO_BAR").label, (v) => unknownSafe(v)],
    ['getIncidentTypeLabel("FOO_BAR", "FOO_BAR")', () => incident.getIncidentTypeLabel("FOO_BAR", "FOO_BAR"), (v) => unknownSafe(v)],
    ['getDeliveryRequestStatusLabel("FOO_BAR", "FOO_BAR")', () => delivery.getDeliveryRequestStatusLabel("FOO_BAR", "FOO_BAR"), (v) => unknownSafe(v)],
    ['getSettlementBlockerLabel("FOO_BAR")', () => settlement.getSettlementBlockerLabel("FOO_BAR"), (v) => unknownSafe(v)],
    ['getAttachmentDocumentTypeLabel("FOO_BAR")', () => attachment.getAttachmentDocumentTypeLabel("FOO_BAR"), (v) => unknownSafe(v)],
    ['getReceivingStatusMeta("FOO_BAR").label', () => receiving.getReceivingStatusMeta("FOO_BAR").label, (v) => unknownSafe(v)],
    ['getTimelineEventLabel({ event: "FOO_BAR" })', () => timeline.getTimelineEventLabel({ event: "FOO_BAR" }), (v) => unknownSafe(v)],
    ['getPaymentMethodLabel("FOO_BAR")', () => S.getPaymentMethodLabel("FOO_BAR"), (v) => unknownSafe(v)],
    ['getRoleLabel("WarehouseStaff")', () => S.getRoleLabel("WarehouseStaff"), (v) => (v === "Nhân viên kho" ? "" : `ra "${v}"`)],
    ['textOr("PENDING", "")', () => S.textOr("PENDING", ""), (v) => unknownSafe(v, "PENDING")],
    ['textOr("Draft", "Tạm tính")', () => S.textOr("Draft", "Tạm tính"), (v) => (v === "Tạm tính" ? "" : `ra "${v}"`)],
    ['displayCode("N/A")', () => S.displayCode("N/A"), (v) => unknownSafe(v, "N/A")],
    ['displayCode("VCL-20260917161921-540135") giữ mã đơn', () => S.displayCode("VCL-20260917161921-540135"), (v) => (v === "VCL-20260917161921-540135" ? "" : `ra "${v}"`)],
    [
      "translateCodesInText(thông báo chèn RECEIVED_AT_DESTINATION)",
      () => S.translateCodesInText("Đơn VCL-1 chuyển sang RECEIVED_AT_DESTINATION", tracking.TRACKING_STAGE_LABELS),
      (v) =>
        v.includes("RECEIVED_AT_DESTINATION") || !v.includes("Kho Việt Nam đã nhận và kiểm hàng") || !v.includes("VCL-1")
          ? `ra "${v}"`
          : "",
    ],
  ];

  for (const [name, run, verdict] of matrix) {
    checked += 1;
    let why;
    try {
      why = verdict(run());
    } catch (e) {
      why = `lỗi ${e.message}`;
    }
    if (why) problems.push(`(c) ${name}: ${why}`);
  }
} catch (e) {
  problems.push(`KHÔNG NẠP ĐƯỢC MODULE: ${String(e.message).split("\n")[0]}`);
} finally {
  console.warn = originalWarn;
  await server.close();
}

console.log(`họ mã backend    : ${Object.keys(families).length}`);
console.log(`ca đã soát       : ${checked}`);
console.log(`cảnh báo mã lạ   : ${warnings.length} (ca cố ý ở mục c)`);

if (problems.length) {
  console.log(`\n${problems.length} VẤN ĐỀ:`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("\nMọi mã backend đều ra nhãn tiếng Việt; không đường hiển thị nào in mã thô.");
process.exit(0);
