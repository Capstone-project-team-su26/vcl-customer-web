import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// 1. Cho phép tất cả CORS từ mọi nguồn (Frontend localhost, logictic.site...)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Access-Token",
      "X-Customer-Token",
      "HTTP-Referer",
      "X-Title",
    ],
  })
);

app.use(express.json({ limit: "2mb" }));

// 2. Health check route
app.get(["/", "/api/chat"], (req, res) => {
  const apiKey =
    process.env.CODEX_API_KEY ||
    process.env.VITE_CODEX_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    "";

  const defaultModel =
    process.env.CODEX_MODEL ||
    process.env.VITE_CODEX_MODEL ||
    DEFAULT_MODEL;

  res.status(200).json({
    status: "online",
    service: "Vietnam Logistic AI Chatbot Proxy (Standalone)",
    configured: Boolean(apiKey),
    model: defaultModel,
    message: apiKey
      ? "AI Proxy đã sẵn sàng nhận tin nhắn từ chatbot."
      : "Cảnh báo: Chưa cấu hình CODEX_API_KEY trong file .env.",
  });
});

// 3. API Chat route (nhận từ Frontend và forward sang OpenRouter)
app.post(["/api/chat", "/"], async (req, res) => {
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

  if (!apiKey) {
    return res.status(500).json({
      error: {
        message:
          "Server chưa cấu hình CODEX_API_KEY trên biến môi trường (.env hoặc Vercel Settings).",
      },
    });
  }

  const { messages, model, temperature, max_tokens } = req.body || {};

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
});

// Chỉ listen port nếu không chạy dưới môi trường Serverless của Vercel
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🤖 AI Chat Proxy Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📡 Endpoint cho Frontend: http://localhost:${PORT}/api/chat`);
  });
}

export default app;
