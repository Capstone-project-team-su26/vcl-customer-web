import axiosInstance from '../axios'; 

export const loginApi = async (email, password) => {
  try {
    const response = await axiosInstance.post('/api/Auth/login', {
      email: email,
      password: password
    });

    const resData = response.data;

    if (resData && resData.token) {
      localStorage.setItem('accessToken', resData.token);
    } else if (resData && resData.accessToken) {
      localStorage.setItem('accessToken', resData.accessToken);
    }

    return resData;
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