/**
 * AI Service Configuration - Optimized for Maximum Speed
 */

export const AI_CONFIG = {
  endpoint:
    import.meta.env.VITE_CODEX_ENDPOINT ||
    "https://codex.hungnguyen.codes/v1/chat/completions",
  apiKey:
    import.meta.env.VITE_CODEX_API_KEY ||
    "sk-bUiazPpchR5Bx8yFpk6MKfKNcE5KrGurGBdQ2kDud0KLPous",
  model: import.meta.env.VITE_CODEX_MODEL || "gpt-5.4-mini",
  maxTokens: 300,
  temperature: 0.3,
};
