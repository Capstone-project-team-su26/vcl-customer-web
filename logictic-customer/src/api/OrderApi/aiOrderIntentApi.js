import axiosInstance from "../axios";

/**
 * Trích xuất ý định tạo đơn hàng (Ký gửi hoặc Mua hộ) bằng AI Agent
 * Endpoint: POST /api/ai/customer/extract-order-intent
 */
export const extractOrderIntentApi = async (
  message,
  preferredShippingRoute = "CN-VN-ROAD"
) => {
  try {
    const userStr =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    let customerId = undefined;

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        customerId = user.userId || user.id || user.customerId;
      } catch {
        // ignore JSON parse error
      }
    }

    const payload = {
      message: String(message || "").trim(),
      ...(customerId ? { customerId } : {}),
      ...(preferredShippingRoute ? { preferredShippingRoute } : {}),
    };

    const response = await axiosInstance.post(
      "/api/ai/customer/extract-order-intent",
      payload
    );

    return response?.data ? response.data : response;
  } catch (error) {
    console.error("Lỗi bóc tách ý định tạo đơn hàng bằng AI:", error);
    throw error;
  }
};
