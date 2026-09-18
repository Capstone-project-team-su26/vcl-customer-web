/**
 * Kiểm tra tầng mock có giữ đúng hợp đồng của tầng API thật hay không.
 *
 * Bản UI-only thay toàn bộ module api/ bằng mock, nhưng KHÔNG sửa một dòng nào
 * trong component. Điều đó chỉ đúng nếu mỗi mock giữ nguyên: tên export, có/không
 * export default, và không còn gọi mạng. Module đã nối API thật (cờ "realApi" trong
 * api-contract.json — spec tích hợp API ký gửi đợt A) chỉ còn kiểm hợp đồng export;
 * hành vi HTTP của chúng do tools/verify-api.mjs kiểm offline. Bản sao *.mock.js của
 * chúng (màn ngoài đợt A dùng) vẫn bị quét mạng như mọi mock khác.
 * Script này kiểm ba điều đó một cách máy móc,
 * cộng thêm: mọi trạng thái cấp ĐƠN ký gửi trong mock thuộc 19 mã đích, và từng dòng
 * I/O matrix của story 1 (nhãn/chuẩn hoá mã đơn, tiền cọc) chạy thật.
 *
 *   node tools/verify-mocks.mjs
 *
 * Thoát mã 1 nếu có sai lệch, để cắm được vào CI.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTRACT =
  process.argv[2] || path.join(ROOT, "tools", "api-contract.json");

if (!CONTRACT || !fs.existsSync(CONTRACT)) {
  console.error("Không tìm thấy hợp đồng API: " + CONTRACT);
  process.exit(2);
}

const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
const problems = [];

/* ---- 1. Không còn dấu vết HTTP trong bất kỳ module api/ nào ---- */

/* Chỉ soi code thật: bỏ comment khối, comment dòng và nội dung chuỗi,
   nếu không thì chính phần "cắm API thật trở lại" trong comment sẽ bị báo nhầm. */
const stripNonCode = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');

const BANNED = [
  [/\bfrom\s*"axios"/, "import axios"],
  [/\brequire\(\s*""\s*\)/, "require() động"],
  [/\bhttpClient\b/, "dùng httpClient"],
  [/\baxiosInstance\b/, "dùng axiosInstance"],
  [/\bfetch\s*\(/, "gọi fetch()"],
  [/\bXMLHttpRequest\b/, "dùng XMLHttpRequest"],
  [/\bnavigator\.sendBeacon\b/, "dùng sendBeacon"],
  [/\bnew\s+WebSocket\b/, "mở WebSocket"],
  [/\bnew\s+EventSource\b/, "mở EventSource"],
];

/* Module đã nối API thật cố ý gọi httpClient: bỏ khỏi quét mạng, vẫn giữ ở mục 2
   để không ai lỡ tay đổi tên export. */
for (const [rel, want] of Object.entries(contract)) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    problems.push(`THIẾU FILE   ${rel}`);
    continue;
  }
  if (want.realApi) continue;
  const codeLines = stripNonCode(fs.readFileSync(file, "utf8")).split("\n");
  for (const [re, label] of BANNED) {
    const line = codeLines.findIndex((l) => re.test(l));
    if (line >= 0) problems.push(`CÒN MẠNG    ${rel}:${line + 1}  (${label})`);
  }
}

/* ---- 2. Export parity: nạp thật qua Vite để alias @/ hoạt động ---- */

const server = await createServer({
  configFile: path.join(ROOT, "vite.config.js"),
  root: ROOT,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});

let okModules = 0;
let checkedNames = 0;

for (const [rel, want] of Object.entries(contract)) {
  if (!fs.existsSync(path.join(ROOT, rel))) continue;
  let mod;
  try {
    mod = await server.ssrLoadModule("/" + rel);
  } catch (e) {
    problems.push(`KHÔNG NẠP ĐƯỢC ${rel}: ${String(e.message).split("\n")[0]}`);
    continue;
  }

  const got = Object.keys(mod).filter((k) => k !== "default").sort();
  const missing = want.named.filter((n) => !got.includes(n));
  const hasDefault = "default" in mod;

  checkedNames += want.named.length;
  if (missing.length) problems.push(`THIẾU EXPORT ${rel}: ${missing.join(", ")}`);
  if (want.hasDefault && !hasDefault) problems.push(`THIẾU DEFAULT ${rel}`);

  /* Mọi export phải gọi được và không được là undefined. */
  for (const n of want.named) {
    if (got.includes(n) && mod[n] === undefined)
      problems.push(`EXPORT UNDEFINED ${rel}.${n}`);
  }

  if (!missing.length && (!want.hasDefault || hasDefault)) okModules += 1;
}

/* ---- Bảng trạng thái đơn khớp ĐÚNG bảng chốt của spec, và 3 bản orderStatus.js giống hệt ----
 * orderStatus.js có ba bản chép tay (customer / admin / warehouse, repo tách rời). Chỉ kiểm
 * "mock thuộc 19 mã" thì một bản vẫn trôi nhãn/bí danh mà không ai biết, nên ở đây so từng
 * mục với MỘT bảng kỳ vọng (Design Notes + bảng chuẩn hóa state-machines.md §1), rồi so byte
 * với bản của hai app kia nếu repo đó nằm cạnh. */
const EXPECTED_ORDER_STATUS_TABLE = [
  ["PENDING_REVIEW", "Chờ duyệt"],
  ["NEED_MORE_INFO", "Cần bổ sung thông tin"],
  ["REJECTED", "Đã từ chối"],
  ["QUOTATION_SENT", "Đã gửi báo giá"],
  ["QUOTATION_REJECTED", "Khách từ chối báo giá"],
  ["WAITING_DEPOSIT", "Chờ đặt cọc"],
  ["DEPOSIT_PAID", "Đã đặt cọc"],
  ["APPROVED", "Đã xác nhận"],
  ["CHECKED_IN", "Đã nhập kho gốc"],
  ["IN_TRANSIT", "Đang vận chuyển quốc tế"],
  ["ARRIVED_VN", "Đã về Việt Nam"],
  ["ARRIVED_DESTINATION", "Đã tới kho VN"],
  ["WAITING_PAYMENT", "Chờ tất toán"],
  ["PAID", "Đã tất toán"],
  ["STORED_AT_VN", "Đang lưu kho VN"],
  ["DELIVERING", "Đang giao hàng"],
  ["DELIVERED", "Đã giao hàng"],
  ["COMPLETED", "Hoàn tất"],
  ["CANCELLED", "Đã hủy"],
];
const EXPECTED_LEGACY_ORDER_STATUS_MAP = {
  PENDING: "PENDING_REVIEW",
  WAITING_QUOTATION: "PENDING_REVIEW",
  ACCEPTED: "PENDING_REVIEW",
  QUOTATION_ACCEPTED: "WAITING_DEPOSIT",
  QUOTATION_CONFIRMED: "WAITING_DEPOSIT",
  CONFIRMED: "WAITING_DEPOSIT",
  PENDING_PAYMENT: "WAITING_PAYMENT",
  WAITING_FINAL_PAYMENT: "WAITING_PAYMENT",
  DEPOSITED: "DEPOSIT_PAID",
  PAYMENT_CONFIRMED: "DEPOSIT_PAID",
  PROCESSING: "APPROVED",
  WAITING_FOR_PARCEL: "APPROVED",
  WAITING_PARCEL: "APPROVED",
  ARRIVED_ORIGIN_WAREHOUSE: "CHECKED_IN",
  WAREHOUSE_RECEIVED: "CHECKED_IN",
  RECEIVED: "CHECKED_IN",
  WAITING_INSPECTION: "CHECKED_IN",
  INSPECTION_COMPLETED: "CHECKED_IN",
  WAITING_PACKING: "CHECKED_IN",
  PACKED: "CHECKED_IN",
  CUSTOMS_CLEARANCE: "IN_TRANSIT",
  WAITING_STORED: "ARRIVED_DESTINATION",
  STORED: "ARRIVED_DESTINATION",
  IN_WAREHOUSE: "ARRIVED_DESTINATION",
  READY_FOR_DELIVERY: "PAID",
  DELIVERY_FAILED: "DELIVERING",
  RETURNING: "DELIVERING",
};
const ORDER_STATUS_COPIES = [
  "vcl-customer-ui/src/features/consignment/constants/orderStatus.js",
  "vcl-admin-ui/src/features/consignment/constants/orderStatus.js",
  "vcl-warehouse-staff-ui/src/features/khoqt-parcel/constants/orderStatus.js",
];

const checkOrderStatusTable = (mod, selfRel) => {
  const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const wantOrder = EXPECTED_ORDER_STATUS_TABLE.map(([code]) => code);
  const wantLabels = Object.fromEntries(EXPECTED_ORDER_STATUS_TABLE);
  if (!sameJson([...(mod.ORDER_STATUS_ORDER ?? [])], wantOrder))
    problems.push(`BẢNG MÃ ĐƠN ${selfRel}: ORDER_STATUS_ORDER lệch bảng 19 mã của spec`);
  if (!sameJson({ ...(mod.ORDER_STATUS_LABELS ?? {}) }, wantLabels)) {
    const bad = wantOrder.filter((code) => mod.ORDER_STATUS_LABELS?.[code] !== wantLabels[code]);
    const extra = Object.keys(mod.ORDER_STATUS_LABELS ?? {}).filter((code) => !(code in wantLabels));
    problems.push(
      `BẢNG MÃ ĐƠN ${selfRel}: ORDER_STATUS_LABELS lệch Design Notes (${[...bad, ...extra].join(", ") || "thứ tự khóa"})`
    );
  }
  if (!sameJson({ ...(mod.LEGACY_ORDER_STATUS_MAP ?? {}) }, EXPECTED_LEGACY_ORDER_STATUS_MAP))
    problems.push(`BẢNG MÃ ĐƠN ${selfRel}: LEGACY_ORDER_STATUS_MAP lệch bảng chuẩn hóa`);

  const workspace = path.resolve(ROOT, "..");
  const selfFile = path.join(ROOT, selfRel);
  const selfBytes = fs.readFileSync(selfFile);
  for (const copy of ORDER_STATUS_COPIES) {
    const other = path.join(workspace, copy);
    if (path.resolve(other) === path.resolve(selfFile) || !fs.existsSync(other)) continue;
    if (!selfBytes.equals(fs.readFileSync(other)))
      problems.push(`BẢN SAO LỆCH ${selfRel} khác byte với ../${copy}`);
  }
};

/* ---- 3. Trạng thái ĐƠN ký gửi trong mock chỉ dùng 19 mã đích ----
 *
 * Nguồn mã: src/features/consignment/constants/orderStatus.js (nạp thật qua
 * Vite). Chỉ soi các trường trạng thái CẤP ĐƠN ký gửi; trạng thái kiện, báo
 * giá, phiếu giao, WRO, phiếu nhập và đơn mua hộ (PUR-) có máy trạng thái
 * riêng nên không kiểm ở đây.
 */

let checkedOrderStatuses = 0;

try {
  const { ORDER_STATUS_ORDER } = await server.ssrLoadModule(
    "/src/features/consignment/constants/orderStatus.js",
  );
  checkOrderStatusTable(
    await server.ssrLoadModule("/src/features/consignment/constants/orderStatus.js"),
    "src/features/consignment/constants/orderStatus.js",
  );
  const TARGET_CODES = new Set(ORDER_STATUS_ORDER);

    const checkCode = (file, where, code) => {
    checkedOrderStatuses += 1;
    if (!TARGET_CODES.has(code))
      problems.push(
        `MÃ ĐƠN SAI   ${file}  ${where}: "${code}" không thuộc 19 mã đích`,
      );
  };

  /* Mỗi mục: file mock, export, lọc bản ghi cấp đơn ký gửi, trường trạng thái. */
  const ORDER_STATUS_SOURCES = [
    {
      file: "src/mocks/data/consignments.js",
      exportName: "consignments",
      isOrder: () => true,
      field: "status",
    },
    /* payments.js, deliveryTracking.js, parcelTracking.js đã xoá cùng các module mock dùng
       chúng (tất toán, giao hàng, tra cứu công khai nay gọi API thật — đợt C). */
  ];

  for (const { file, exportName, isOrder, field } of ORDER_STATUS_SOURCES) {
    const mod = await server.ssrLoadModule("/" + file);
    const records = mod[exportName];
    if (!Array.isArray(records)) {
      problems.push(`THIẾU MOCK  ${file}: không có mảng ${exportName}`);
      continue;
    }
    records.forEach((record, index) => {
      if (!record || !isOrder(record)) return;
      const id = record.orderCode || record.consignmentCode || `#${index}`;
      checkCode(file, `${exportName}[${index}] ${id}.${field}`, record[field]);
    });
  }

  /* Danh mục trạng thái trong catalog phải ĐÚNG 19 mã, đúng thứ tự đích. */
  const catalogFile = "src/mocks/data/catalog.js";
  const { consignmentStatuses } = await server.ssrLoadModule("/" + catalogFile);
  const catalogCodes = (consignmentStatuses || []).map((item) => item?.code);
  catalogCodes.forEach((code, index) =>
    checkCode(catalogFile, `consignmentStatuses[${index}].code`, code),
  );
  if (catalogCodes.join(",") !== ORDER_STATUS_ORDER.join(","))
    problems.push(
      `MÃ ĐƠN SAI   ${catalogFile}  consignmentStatuses phải đúng 19 mã theo ORDER_STATUS_ORDER (đang có ${catalogCodes.length} mã)`,
    );
} catch (e) {
  problems.push(
    `KHÔNG KIỂM ĐƯỢC TRẠNG THÁI ĐƠN: ${String(e.message).split("\n")[0]}`,
  );
}

/* ---- 4. I/O matrix (spec-consignment-flow, story 1) ----
 *
 * Mỗi dòng matrix của story là MỘT phép kiểm chạy thật trên module sản phẩm (nạp qua
 * Vite), in PASS/FAIL theo tên kịch bản; FAIL đẩy vào `problems` để thoát mã 1.
 * Kịch bản nào tạm gỡ rule khỏi fixture đều trả lại trong `finally`.
 */

const matrixResults = [];

const checkMatrix = async (scenario, run) => {
  let detail;
  try {
    detail = await run();
  } catch (e) {
    detail = `ném lỗi: ${String(e?.message ?? e).split("\n")[0]}`;
  }
  const ok = detail === true;
  matrixResults.push({ scenario, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  I/O matrix · ${scenario}${ok ? "" : ` — ${detail}`}`);
  if (!ok) problems.push(`I/O MATRIX   ${scenario}: ${detail}`);
};

/** So kết quả thực tế với kỳ vọng; trả true hoặc câu mô tả chỗ lệch. */
const expectEqual = (label, got, want) =>
  Object.is(got, want) ? true : `${label} = ${JSON.stringify(got)} (cần ${JSON.stringify(want)})`;

const firstFailure = (...results) => results.find((r) => r !== true) ?? true;

/** Chạy fn trong lúc bắt console.warn; trả { value, warnings }. */
const captureWarn = async (fn) => {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(" "));
  try {
    return { value: await fn(), warnings };
  } finally {
    console.warn = original;
  }
};

/** Tạm gỡ rule `ruleCode` khỏi mảng pricingRules (cùng instance), chạy fn, rồi trả lại đúng chỗ. */
const withoutRule = async (rules, ruleCode, fn) => {
  const index = rules.findIndex((rule) => rule?.ruleCode === ruleCode);
  if (index < 0) throw new Error(`fixture không có rule ${ruleCode} để gỡ`);
  const [removed] = rules.splice(index, 1);
  try {
    return await fn();
  } finally {
    rules.splice(index, 0, removed);
  }
};

try {
  const { getOrderStatusLabel, normalizeOrderStatus } = await server.ssrLoadModule(
    "/src/features/consignment/constants/orderStatus.js"
  );

  await checkMatrix("Mã đích: getOrderStatusLabel(\"DEPOSIT_PAID\") → \"Đã đặt cọc\"", () =>
    expectEqual("nhãn", getOrderStatusLabel("DEPOSIT_PAID"), "Đã đặt cọc")
  );
  await checkMatrix("Mã cũ: normalizeOrderStatus(\"WAREHOUSE_RECEIVED\") → \"CHECKED_IN\"", () =>
    expectEqual("mã", normalizeOrderStatus("WAREHOUSE_RECEIVED"), "CHECKED_IN")
  );
  await checkMatrix("Mã lạ: normalizeOrderStatus(\"FOO\") → \"FOO\", nhãn \"FOO\", không throw", () =>
    firstFailure(
      expectEqual("mã", normalizeOrderStatus("FOO"), "FOO"),
      expectEqual("nhãn", getOrderStatusLabel("FOO"), "FOO")
    )
  );
  await checkMatrix("Rỗng: normalizeOrderStatus(null) → null, nhãn \"—\", không throw", () =>
    firstFailure(
      expectEqual("mã", normalizeOrderStatus(null), null),
      expectEqual("nhãn", getOrderStatusLabel(null), "—")
    )
  );

  /* pricingRuleService.js đã nối API thật: getPricingRules → getVolumetricDivisorRule (đợt A)
     và getDepositRate → GET /api/additional-service-fees (đợt B). Mọi ca giá / cọc dưới đây
     vì thế chỉ chạy trên bản sao mock mà màn mua hộ + trang giá đang dùng; hành vi HTTP của
     bản thật (tỷ lệ 30 → 30, thiếu cấu hình → 50) do tools/verify-api.mjs kiểm offline. */
  const PRICING_MOCK_MODULE = "/src/features/pricing/api/pricingRuleService.mock.js";
  const { pricingRules } = await server.ssrLoadModule("/src/mocks/data/catalog.js");

  /* Hộp thoại đặt cọc (QuotationPaymentConfirmDialog) tính cọc = tổng × (value / 100)
     từ kết quả getDepositRate; ở đây lặp lại đúng công thức đó trên kết quả chạy thật. */
  const TOTAL = 1_000_000;
  const depositOf = (rate) => TOTAL * (Number(rate?.value) / 100);

  for (const pricingModule of [PRICING_MOCK_MODULE]) {
    const { getDepositRate } = await server.ssrLoadModule(pricingModule);
    const where = path.basename(pricingModule);

    await checkMatrix(`Cọc (khách, ${where}): DEPOSIT_RATE 30, tổng 1.000.000 → cọc 300.000`, async () => {
      const { value: rate, warnings } = await captureWarn(() => getDepositRate());
      return firstFailure(
        expectEqual("getDepositRate().value", rate?.value, 30),
        expectEqual("getDepositRate().isFallback", rate?.isFallback, undefined),
        expectEqual("tiền cọc", depositOf(rate), 300000),
        warnings.length === 0 || `rule có sẵn mà vẫn console.warn: ${warnings[0]}`
      );
    });

    await checkMatrix(`Cọc (khách, ${where}): thiếu rule DEPOSIT_RATE → dùng 30 và console.warn`, async () => {
      const { value: rate, warnings } = await captureWarn(() =>
        withoutRule(pricingRules, "DEPOSIT_RATE", () => getDepositRate())
      );
      return firstFailure(
        expectEqual("getDepositRate().value", rate?.value, 30),
        expectEqual("tiền cọc", depositOf(rate), 300000),
        warnings.some((w) => w.includes("DEPOSIT_RATE")) || "không có console.warn nhắc DEPOSIT_RATE"
      );
    });
  }

  /* Kịch bản "cọc ở màn tất toán" đã bỏ: settlementApi nay gọi API thật
     (GET /api/orders/awaiting-settlement) — số tiền do server trả, FE không tự tính. */

  /* Tham số giá chốt ngày 2026-09-16: hệ số thể tích 6000, kiểm hàng 20.000. */
  const { getVolumetricDivisorRule } = await server.ssrLoadModule(PRICING_MOCK_MODULE);
  const { findPricingRuleByCode } = await server.ssrLoadModule("/src/mocks/data/catalog.js");

  await checkMatrix("Thể tích (khách): getVolumetricDivisorRule() → 6000, không warn", async () => {
    const { value: rule, warnings } = await captureWarn(() => getVolumetricDivisorRule());
    return firstFailure(
      expectEqual("getVolumetricDivisorRule().value", rule?.value, 6000),
      expectEqual("getVolumetricDivisorRule().isFallback", rule?.isFallback, undefined),
      warnings.length === 0 || `rule có sẵn mà vẫn console.warn: ${warnings[0]}`
    );
  });

  await checkMatrix("Thể tích (khách): thiếu rule VOLUMETRIC_DIVISOR → 6000 và console.warn", async () => {
    const { value: rule, warnings } = await captureWarn(() =>
      withoutRule(pricingRules, "VOLUMETRIC_DIVISOR", () => getVolumetricDivisorRule())
    );
    return firstFailure(
      expectEqual("getVolumetricDivisorRule().value", rule?.value, 6000),
      warnings.some((w) => w.includes("VOLUMETRIC_DIVISOR")) || "không có console.warn nhắc VOLUMETRIC_DIVISOR"
    );
  });

  await checkMatrix("Phụ phí (khách): SUR_INSPECTION = 20.000", () =>
    expectEqual('findPricingRuleByCode("SUR_INSPECTION").value', findPricingRuleByCode("SUR_INSPECTION")?.value, 20000)
  );
} catch (e) {
  problems.push(`KHÔNG CHẠY ĐƯỢC I/O MATRIX: ${String(e.message).split("\n")[0]}`);
}

await server.close();

/* ---- 5. Báo cáo ---- */

const total = Object.keys(contract).length;
console.log(`modules kiểm tra : ${total}`);
console.log(`đạt hợp đồng     : ${okModules}/${total}`);
console.log(`tên export soát  : ${checkedNames}`);
console.log(`trạng thái đơn   : ${checkedOrderStatuses}`);
console.log(`I/O matrix       : ${matrixResults.filter((r) => r.ok).length}/${matrixResults.length} kịch bản đạt`);

if (problems.length) {
  console.log(`\n${problems.length} VẤN ĐỀ:`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("\nTầng mock giữ đúng toàn bộ hợp đồng; module còn mock không có lời gọi mạng nào.");
