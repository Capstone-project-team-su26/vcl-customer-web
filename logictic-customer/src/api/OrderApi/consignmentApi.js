import axiosInstance from "../axios";

export const createConsignmentApi = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/orders/consignments", payload);
    return response.data;
  } catch (error) {
    console.error("URL bị lỗi:", error.config?.url);
    console.error("Headers thực tế gửi đi:", error.config?.headers);
    throw error;
  }
};