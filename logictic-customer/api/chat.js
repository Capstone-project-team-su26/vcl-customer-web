/**
 * Vercel Serverless Function: AI Chatbot Proxy cho Vietnam Logistic.
 *
 * Proxy này nhận yêu cầu từ Frontend, đính kèm API Key từ biến môi trường
 * phía Server (CODEX_API_KEY hoặc VITE_CODEX_API_KEY) rồi chuyển tiếp đến OpenRouter.
 *
 * Lợi ích:
 * 1. KHÔNG lộ API Key ra phía Client (DevTools / Network / Bundle).
 * 2. Giải quyết triệt để lỗi CORS ("Failed to fetch") khi gọi trực tiếp từ trình duyệt.
 * 3. Tự động xử lý retry khi OpenRouter bị quá tải (concurrency / rate limit).
 */

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Access-Token, X-Customer-Token, HTTP-Referer, X-Title"
  );
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // 1. Xử lý CORS Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 2. Health check route (GET /api/chat) để kiểm tra trạng thái
  const apiKey =
    process.env.CODEX_API_KEY ||
    process.env.VITE_CODEX_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const defaultModel =
    process.env.CODEX_MODEL ||
    process.env.VITE_CODEX_MODEL ||
    DEFAULT_MODEL;

  const endpoint =
    process.env.CODEX_UPSTREAM_ENDPOINT ||
    process.env.CODEX_ENDPOINT ||
    DEFAULT_ENDPOINT;

  if (req.method === "GET") {
    return res.status(200).json({
      status: "online",
      service: "Vietnam Logistic AI Chatbot Proxy",
      configured: Boolean(apiKey),
      model: defaultModel,
      message: apiKey
        ? "AI Proxy đã sẵn sàng nhận tin nhắn từ chatbot."
        : "Cảnh báo: Chưa cấu hình CODEX_API_KEY trên biến môi trường Vercel.",
    });
  }

  // 3. Chỉ chấp nhận phương thức POST cho chat
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: `Phương thức ${req.method} không được hỗ trợ. Hãy gửi POST.` },
    });
  }

  // 4. Kiểm tra API Key trên server
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message:
          "Server chưa cấu hình CODEX_API_KEY (hoặc VITE_CODEX_API_KEY) trên Vercel Environment Variables.",
      },
    });
  }

  // 5. Đọc body request
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error: { message: "Dữ liệu JSON gửi lên không hợp lệ." },
      });
    }
  }

  const { messages, model, temperature, max_tokens } = body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: { message: "Danh sách messages là bắt buộc và không được rỗng." },
    });
  }

  const payload = {
    model: model || defaultModel,
    messages,
    temperature: typeof temperature === "number" ? temperature : 0.3,
    max_tokens: typeof max_tokens === "number" ? max_tokens : 300,
  };

  const upstreamHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer":
      process.env.SITE_URL ||
      (req.headers?.origin ? req.headers.origin : "https://logictic.site"),
    "X-Title": "Vietnam Logistic Assistant",
  };

  // 6. Gửi request đến OpenRouter (hỗ trợ retry 1 lần nếu gặp rate limit/concurrency)
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: { message: responseText } };
      }

      if (!response.ok) {
        const errorMsg =
          responseData?.error?.message || `Lỗi từ nhà cung cấp AI (${response.status})`;

        const lower = errorMsg.toLowerCase();
        // Nếu bị quá tải concurrency / rate limit thì thử lại ở vòng lặp sau
        if (
          (response.status === 429 ||
            lower.includes("rate limit") ||
            lower.includes("concurrency")) &&
          attempt === 0
        ) {
          continue;
        }

        return res.status(response.status).json({
          error: { message: errorMsg },
        });
      }

      const content = responseData?.choices?.[0]?.message?.content || "";

      // Trả về định dạng chuẩn OpenAI tương thích trực tiếp với FE
      return res.status(200).json({
        id: responseData.id,
        reply: content,
        choices: responseData.choices,
        usage: responseData.usage,
      });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).json({
    error: {
      message:
        lastError?.message || "Không thể kết nối đến nhà cung cấp AI sau nhiều lần thử.",
    },
  });
}
