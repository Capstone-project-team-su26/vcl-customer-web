import axiosInstance from '../axios'; 

export const loginApi = async (email, password) => {
  try {
    // 1. Gửi request POST
    // THỬ NGHIỆM: Nếu vẫn 404, hãy thử đổi '/api/Auth/login' thành '/Auth/login' 
    // (vì rất có thể trong Base URL của file axiosInstance đã có sẵn chữ /api rồi)
    const response = await axiosInstance.post('/api/Auth/login', {
      email: email,
      password: password
    });

    // Axios trả về cả cụm response, dữ liệu thực tế từ Backend nằm trong response.data
    const resData = response.data;

    // 2. Kiểm tra token (Check kỹ Swagger xem là .token, .accessToken hay .data.token nhé)
    if (resData && resData.token) {
      localStorage.setItem('accessToken', resData.token);
    } else if (resData && resData.accessToken) {
      localStorage.setItem('accessToken', resData.accessToken);
    }

    return resData;
  } catch (error) {
    // Bổ sung log chi tiết config để xem Axios đang mò vào URL nào mà bị 404
    console.error('URL bị lỗi:', error.config?.url);
    console.error('Base URL hiện tại:', error.config?.baseURL);
    console.error('Đăng nhập thất bại:', error.response?.data || error.message);
    throw error; 
  }
};