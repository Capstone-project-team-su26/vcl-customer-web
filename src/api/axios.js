import axios from 'axios';

const axiosInstance = axios.create({
  // Import trực tiếp từ biến môi trường của Vite
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Tự động đính kèm Token từ localStorage vào Header của mọi request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Trả về trực tiếp data từ response để lúc gọi API không phải .data 2 lần
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      // window.location.href = '/login'; // Chuyển hướng nếu token hết hạn
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;