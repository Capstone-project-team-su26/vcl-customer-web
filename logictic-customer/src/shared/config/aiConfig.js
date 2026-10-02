/**
 * Cấu hình cho trợ lý AI của khung chat (FloatingChat + CSKH).
 *
 * Khoá API chỉ được đọc từ biến môi trường. Bản gốc nhúng thẳng một khoá
 * thật vào source — khoá đó coi như đã lộ và cần được thu hồi; đừng đặt
 * lại giá trị mặc định ở đây, kể cả để "chạy tạm".
 *
 * Lưu ý: mọi biến VITE_* đều bị nhúng vào bundle và người dùng cuối đọc
 * được. Về lâu dài nên gọi AI qua backend proxy thay vì lộ khoá ra client.
 */
export const AI_CONFIG = {
  endpoint: import.meta.env.VITE_CODEX_ENDPOINT || "",
  apiKey: import.meta.env.VITE_CODEX_API_KEY || "",
  model: import.meta.env.VITE_CODEX_MODEL || "gpt-5.4-mini",
  maxTokens: 300,
  temperature: 0.3,
};

/** Có đủ cấu hình để gọi trợ lý AI hay không (hỗ trợ cả proxy server lẫn gọi trực tiếp). */
export const isAiConfigured = () => {
  if (!AI_CONFIG.endpoint) return false;
  const isExternal =
    /openrouter\.ai|openai\.com|anthropic\.com|groq\.com/i.test(AI_CONFIG.endpoint);
  return isExternal ? Boolean(AI_CONFIG.apiKey) : true;
};

export default AI_CONFIG;
