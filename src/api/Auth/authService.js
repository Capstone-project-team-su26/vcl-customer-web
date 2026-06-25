import axiosInstance from '../axios'; // Đường dẫn tới file axiosInstance của bạn


export const loginApi = async (email, password) => {
  try {
    // 1. Gửi request POST lên endpoint '/api/Auth/login'
    // axiosInstance đã tự động lấy Base URL và set Content-Type: application/json rồi nhé
    const data = await axiosInstance.post('/api/Auth/login', {
      email: email,
      password: password
    });

    // 2. Nếu API trả về token thành công, lưu vào localStorage để các API sau tự động dùng
    // (Bạn cần check cấu trúc data trả về của Swagger để đổi tên biến cho đúng, ví dụ: data.token hoặc data.accessToken)
    if (data && data.token) {
      localStorage.setItem('accessToken', data.token);
    }

    return data;
  } catch (error) {
    console.error('Đăng nhập thất bại:', error.response?.data || error.message);
    throw error; // Đẩy lỗi ra ngoài để phía UI xử lý (hiển thị thông báo lỗi)
  }
};