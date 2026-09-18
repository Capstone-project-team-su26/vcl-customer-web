// Cổng vào duy nhất của module xác thực: đăng nhập, đăng ký, xác thực OTP và
// khôi phục mật khẩu. Router và các feature khác chỉ nên import từ đây để
// đường dẫn nội bộ của module còn tự do thay đổi mà không lan ra toàn dự án.

// Các trang xác thực, đặt tên theo đúng tên component để tra cứu ở router cho nhanh.
export { default as Login } from "./pages/Login/Login";
export { default as Register } from "./pages/Register/Register";
export { default as VerifyOtp } from "./pages/VerifyOtp/VerifyOtp";
export { default as ForgotPassword } from "./pages/ForgotPassword/ForgotPassword";
export { default as OTPForgot } from "./pages/OTPForgot/OTPForgot";

// Toàn bộ hàm gọi API xác thực đều là public: profile và thanh toán cũng dùng lại.
export * from "./api/authService";
