const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const parseGeminiReply = (responseData) => {
  const candidates = responseData?.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "";
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => String(part?.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const getGeminiErrorMessage = ({
  status,
  responseData,
}) => {
  const serverMessage = String(
    responseData?.error?.message ||
      responseData?.message ||
      ""
  ).trim();

  if (status === 400) {
    return serverMessage || "Dữ liệu gửi đến Gemini không hợp lệ.";
  }

  if (status === 401 || status === 403) {
    return serverMessage || "Gemini API key không hợp lệ hoặc chưa được cấp quyền.";
  }

  if (status === 404) {
    return serverMessage || "Không tìm thấy model Gemini đang sử dụng.";
  }

  if (status === 429) {
    return serverMessage || "Gemini đã vượt giới hạn sử dụng. Vui lòng thử lại sau.";
  }

  if (status >= 500) {
    return serverMessage || "Máy chủ Gemini đang gặp sự cố. Vui lòng thử lại sau.";
  }

  return serverMessage || `Gemini phản hồi lỗi ${status}.`;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed.",
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "Server chưa cấu hình GEMINI_API_KEY.",
      });
    }

    const {
      systemInstruction,
      contents,
    } = req.body || {};

    if (
      !Array.isArray(contents) ||
      contents.length === 0
    ) {
      return res.status(400).json({
        message: "Thiếu nội dung trò chuyện.",
      });
    }

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: String(systemInstruction || "").trim(),
            },
          ],
        },

        contents,

        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
    });

    const responseText = await geminiResponse.text();

    let responseData = null;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = null;
    }

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", {
        status: geminiResponse.status,
        responseData,
        responseText,
      });

      return res.status(geminiResponse.status).json({
        message: getGeminiErrorMessage({
          status: geminiResponse.status,
          responseData,
        }),
      });
    }

    const reply = parseGeminiReply(responseData);

    if (!reply) {
      console.error("Gemini empty reply:", responseData);

      return res.status(502).json({
        message: "Gemini không trả về nội dung hợp lệ.",
      });
    }

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    console.error("Gemini proxy error:", error);

    return res.status(500).json({
      message: "Lỗi máy chủ khi gọi Gemini.",
    });
  }
}