import axiosInstance from '../axios';

const getCleanData = (response) => (response?.data ? response.data : response);

const getAccessToken = () =>
  sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

export const loginApi = async (email, password) => {
  try {
    const response = await axiosInstance.post('/api/Auth/login', {
      email: email,
      password: password
    });

    // ================= SỬA LẠI ĐOẠN NÀY =================
    // Nếu response đã là data sạch (do interceptor bóc tách trước), hoặc là chuẩn của Axios
    const resData = response?.data ? response.data : response;

    if (resData && resData.token) {
      localStorage.setItem('accessToken', resData.token);
    } else if (resData && resData.accessToken) {
      localStorage.setItem('accessToken', resData.accessToken);
    }

    return resData; // Đảm bảo trả về đúng object chứa userId, fullName...
    // ====================================================
  } catch (error) {
    console.error('URL bị lỗi:', error.config?.url);
    console.error('Base URL hiện tại:', error.config?.baseURL);
    console.error('Đăng nhập thất bại:', error.response?.data || error.message);
    throw error; 
  }
};

export const registerApi = async (userData) => {
  try {
    const response = await axiosInstance.post('/api/Auth/customer/register', {
      fullName: userData.fullName,
      email: userData.email,
      password: userData.password,
      phone: userData.phone,
      country: userData.country,
      address: userData.address
    });

    return response.data;
  } catch (error) {
    console.error('Đăng ký thất bại:', error.response?.data || error.message);
    throw error; 
  }
};

// API xác thực mã OTP
export const verifyOtpApi = async (email, otp) => {
  try {
    const response = await axiosInstance.post('/api/Auth/customer/verify-otp', {
      email: email,
      otp: otp
    });

    return response.data;
  } catch (error) {
    console.error('Xác thực OTP thất bại:', error.response?.data || error.message);
    throw error; 
  }
};

// API gửi lại mã OTP (Mới thêm vào)
export const resendOtpApi = async (email) => {
  try {
    const response = await axiosInstance.post('/api/Auth/customer/resend-otp', {
      email: email
    });

    return response.data;
  } catch (error) {
    console.error('Gửi lại OTP thất bại:', error.response?.data || error.message);
    throw error; 
  }
};
// ================= API QUÊN MẬT KHẨU =================
export const forgotPasswordApi = async (email) => {
  try {
    const response = await axiosInstance.post("/api/Auth/forgot-password", {
      email,
    });
    return response.data;
  } catch (error) {
    console.error("Yêu cầu cấp lại mật khẩu thất bại:", error.response?.data || error.message);
    throw error;
  }
};

// ================= API ĐẶT LẠI MẬT KHẨU =================
export const resetPasswordApi = async (email, otp, newPassword) => {
  try {
    const response = await axiosInstance.post("/api/Auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  } catch (error) {
    console.error("Đặt lại mật khẩu thất bại:", error.response?.data || error.message);
    throw error;
  }
};
// ================= API LẤY THÔNG TIN CÁ NHÂN =================
export const getUserProfileApi = async (token = getAccessToken()) => {
  try {
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;

    const response = await axiosInstance.get('/api/User/profile', config);
    return getCleanData(response);
  } catch (error) {
    console.error('Lấy thông tin cá nhân thất bại:', error.response?.data || error.message);
    throw error;
  }
};

// ================= API CẬP NHẬT THÔNG TIN CÁ NHÂN =================
export const updateUserProfileApi = async (profileData, token = getAccessToken()) => {
  try {
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;

    const response = await axiosInstance.put(
      '/api/User/profile',
      {
        fullName: profileData.fullName,
        phone: profileData.phone,
        country: profileData.country,
        address: profileData.address,
      },
      config
    );

    return getCleanData(response);
  } catch (error) {
    console.error('Cập nhật thông tin cá nhân thất bại:', error.response?.data || error.message);
    throw error;
  }
};