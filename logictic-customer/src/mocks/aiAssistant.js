/**
 * Trợ lý AI giả lập cho khung chat nổi (FloatingChat).
 *
 * Bản UI-only không gọi mạng, nhưng khung chat là thứ khách nhìn thấy ngay ở
 * trang chủ — để nó báo "chưa cấu hình" thì phần demo coi như hỏng. File này
 * trả lời bằng kịch bản soạn sẵn, bám đúng nghiệp vụ mua hộ / ký gửi.
 *
 * Vẫn giữ nguyên đường cắm AI thật: nếu có VITE_CODEX_ENDPOINT và
 * VITE_CODEX_API_KEY thì FloatingChat gọi endpoint thật, chỉ khi thiếu cấu hình
 * mới rơi về đây.
 */
import { delay, normalizeText } from "./mockUtils";

/** Mỗi kịch bản: bắt theo từ khoá đã bỏ dấu, trả lời kèm gợi ý bước tiếp theo. */
const SCRIPTS = [
  {
    keywords: ["gia", "bao gia", "cuoc", "phi", "bao nhieu tien", "chi phi"],
    reply: `Cước được tính theo **khối lượng tính cước** = số lớn hơn giữa cân nặng thực và cân nặng quy đổi (dài × rộng × cao ÷ 6000).

Tham khảo nhanh tuyến Trung Quốc → Việt Nam:
• Đường bộ tiêu chuẩn: từ 32.000 đ/kg, 5–10 ngày
• Đường bộ nhanh: từ 42.000 đ/kg, 3–5 ngày
• Đường biển: từ 18.000 đ/kg, 15–22 ngày

Bạn xem chi tiết ở trang **Bảng giá ký gửi**, hoặc dùng **Công thức tính giá** để ước tính theo đúng kích thước kiện hàng của bạn.`,
  },
  {
    keywords: ["ky gui", "gui hang", "gui kien", "tao don ky gui"],
    reply: `Quy trình ký gửi gồm 4 bước:

1. Bạn tự mua hàng và gửi về kho VCL tại Trung Quốc
2. Khai báo đơn trong mục **Tạo đơn hàng → Ký gửi** (mã vận đơn, sản phẩm, người nhận)
3. Kho nhận kiện, cân đo thực tế rồi gửi báo giá — bạn xác nhận ở **Kiện chờ báo giá**
4. Thanh toán, hàng về kho Việt Nam và giao tận nơi

Bạn muốn mình hướng dẫn khai báo đơn đầu tiên không?`,
  },
  {
    keywords: ["mua ho", "order ho", "dat ho", "mua giup"],
    reply: `Với dịch vụ mua hộ, bạn chỉ cần gửi link sản phẩm (Taobao, 1688, Tmall…) trong mục **Tạo đơn hàng → Mua hộ**.

Sau đó: VCL báo giá tổng (tiền hàng + phí dịch vụ + cước vận chuyển) → bạn đặt cọc → VCL đặt mua, nhận hàng về kho và vận chuyển về Việt Nam.

Phí dịch vụ mua hộ tính theo % giá trị đơn, có mức tối thiểu. Chi tiết ở trang **Bảng giá mua hộ**.`,
  },
  {
    keywords: [
      "tra cuu", "kiem tra don", "theo doi", "van don",
      "o dau", "toi dau", "dau roi", "den dau", "tinh trang don",
    ],
    reply: `Bạn tra cứu theo mã vận đơn ở trang **Tra cứu** (dạng VCL-… hoặc PUR-…).

Nếu đã đăng nhập, vào **Đơn đang xử lý** để xem tiến độ từng kiện, hoặc **Theo dõi kho hàng** để biết kiện đang ở kho Trung Quốc, đang thông quan hay đã về kho Việt Nam.`,
  },
  {
    keywords: ["thanh toan", "chuyen khoan", "tra tien", "coc", "hoa don"],
    reply: `VCL thu tiền theo 2 mốc: đặt cọc khi xác nhận báo giá, và thanh toán phần còn lại khi hàng về kho Việt Nam trước lúc xuất kho.

Bạn thanh toán ở mục **Thanh toán vận chuyển**; lịch sử các lần trả nằm ở **Lịch sử giao dịch**. Hỗ trợ chuyển khoản ngân hàng và QR.`,
  },
  {
    keywords: ["cam", "hang cam", "khong nhan", "han che", "duoc gui khong"],
    reply: `VCL không nhận vận chuyển: hàng dễ cháy nổ, chất lỏng dễ bay hơi, pin rời dung lượng lớn, hàng giả nhãn hiệu, động thực vật sống, tiền và giấy tờ tuỳ thân.

Một số nhóm cần khai báo trước: mỹ phẩm, thực phẩm chức năng, thiết bị phát sóng. Bạn xem danh sách đầy đủ ở trang **Chính sách vận chuyển**.`,
  },
  {
    keywords: ["bao lau", "thoi gian", "may ngay", "khi nao ve"],
    reply: `Thời gian tham khảo tính từ lúc kiện vào kho Trung Quốc:

• Đường bộ nhanh: 3–5 ngày
• Đường bộ tiêu chuẩn: 5–10 ngày
• Đường biển: 15–22 ngày

Cộng thêm 1–2 ngày giao nội địa. Cao điểm lễ Tết hoặc lúc thông quan đông có thể chậm hơn vài ngày.`,
  },
  {
    keywords: ["den bu", "bao hiem", "mat hang", "vo", "hu hong", "that lac"],
    reply: `Bạn nên mua **bảo hiểm hàng hoá 3%** giá trị khai báo khi tạo đơn — khi có sự cố sẽ được đền theo giá trị đã khai.

Không mua bảo hiểm thì mức đền bù áp theo chính sách chung, tối đa 4 lần cước vận chuyển của kiện đó. Chi tiết ở **Chính sách bảo hiểm hàng hoá**.`,
  },
];

const FALLBACK = `Mình chưa chắc ý bạn hỏi. Bạn thử hỏi cụ thể hơn về một trong các mục sau nhé:

• Cước phí và cách tính giá
• Quy trình ký gửi hoặc mua hộ
• Tra cứu đơn, thời gian vận chuyển
• Thanh toán, đặt cọc
• Hàng cấm gửi, bảo hiểm hàng hoá

Hoặc bấm **Tạo cuộc trò chuyện** trong mục Chăm sóc khách hàng để gặp nhân viên hỗ trợ trực tiếp.`;

const GREETING_KEYWORDS = ["xin chao", "chao ban", "hello", "hi ", "alo", "co ai", "giup toi", "tu van"];

const GREETING = `Chào bạn! Mình là trợ lý của Việt Nam Logistic.

Mình hỗ trợ được về: cước phí, quy trình ký gửi và mua hộ, tra cứu đơn, thanh toán, hàng cấm gửi. Bạn cần hỏi gì ạ?`;

/**
 * normalizeText dùng NFD nên bỏ được dấu thanh, nhưng "đ" (U+0111) không phân rã
 * — "đền bù" sẽ ra "đen bu" và từ khoá "den bu" trượt. Đổi đ→d ở đây thay vì sửa
 * mockUtils, vì các mock khác đang so khớp mã đơn nên không cần biến đổi này.
 */
const fold = (value) => normalizeText(value).replace(/đ/g, "d");

/** Lấy nội dung câu hỏi cuối cùng của khách trong danh sách tin nhắn. */
const lastUserText = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m?.role === "user" || m?.sender === "user") return String(m.content ?? m.text ?? "");
  }
  return "";
};

/**
 * Trả lời một lượt chat. Cùng kiểu dữ liệu với hàm gọi AI thật: trả về chuỗi.
 * Có delay để hiệu ứng "đang soạn tin" vẫn chạy như khi gọi mạng thật.
 */
export const requestMockAssistantReply = async ({ messages = [], signal } = {}) => {
  await delay(700 + Math.floor(messages.length % 5) * 90, signal);

  const question = fold(lastUserText(messages));
  if (!question) return GREETING;

  /* Câu chào thì trả lời chào, đừng đẩy khách vào danh sách gợi ý. */
  if (GREETING_KEYWORDS.some((kw) => question.startsWith(kw.trim()) || question === kw.trim()))
    return GREETING;

  /* Ưu tiên kịch bản có từ khoá dài nhất khớp được, tránh "gia" nuốt "bao gia". */
  let best = null;
  let bestLen = 0;
  for (const script of SCRIPTS) {
    for (const kw of script.keywords) {
      if (question.includes(kw) && kw.length > bestLen) {
        best = script;
        bestLen = kw.length;
      }
    }
  }

  return best ? best.reply : FALLBACK;
};

export default requestMockAssistantReply;
