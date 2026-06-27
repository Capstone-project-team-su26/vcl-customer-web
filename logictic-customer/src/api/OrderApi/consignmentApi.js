import axiosInstance from "../axios";

// 1. API Tạo mới lô hàng (POST) - Giữ nguyên từ code cũ của bạn
export const createConsignmentApi = async (payload) => {
  try {
    const response = await axiosInstance.post("/api/orders/consignments", payload);
    return response.data;
  } catch (error) {
    console.error("URL bị lỗi (POST):", error.config?.url);
    console.error("Headers thực tế gửi đi:", error.config?.headers);
    throw error;
  }
};

// 2. API Lấy danh sách lô hàng (GET) - Được chuyển đổi từ lệnh cURL của bạn
export const getConsignmentsApi = async (pageNumber = 1, pageSize = 10) => {
  try {
    const response = await axiosInstance.get("/api/orders/consignments", {
      params: {
        pageNumber,
        pageSize,
      },
    });
    return response.data;
  } catch (error) {
    console.error("URL bị lỗi (GET):", error.config?.url);
    console.error("Headers thực tế gửi đi:", error.config?.headers);
    throw error;
  }
};