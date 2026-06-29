import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/HomePage/Home";
import Login from "../pages/LoginPage/Login";
import Register from "../pages/RegisterPage/Register";
import VerifyOtp from "../pages/OTPPage/VerifyOtp";
import ForgotPassword from "../pages/ForgotPasswordPage/ForgotPassword";
import OTPForgot from "../pages/OTPForgotPage/OTPForgot";
import NotFound from "../pages/NotFound";

// ⬇️ IMPORT CÁC COMPONENT LAYOUT VÀ MÀN HÌNH MỚI CỦA BẠN VÀO ĐÂY
import MainLayout from "../layouts/MainLayout"; // Bạn nhớ chỉnh lại đường dẫn file cho đúng cấu trúc folder của bạn nhé
import Dashboard from "../pages/DashboardPage/DashboardCusstomer/Dashboard";
import CreateOrder from "../pages/DashboardPage/CreateCustomer/CreateOrder";
import ConsigmentOrder from "../pages/DashboardPage/CreateCustomer/KiGuiHang/ConsignmentOrder";
import ConsignmentList from "../pages/DashboardPage/CreateCustomer/OrderXuLy/ConsignmentList"; // Import



const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= CÁC ROUTE CƠ BẢN (KHÔNG DÙNG SIDEBAR) ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-forgot" element={<OTPForgot />} />

        {/* ================= CÁC ROUTE KHÁCH HÀNG (SỬ DỤNG CHUNG SIDEBAR LAYOUT) ================= */}
     
        <Route element={<MainLayout />}>
          {/* Định nghĩa các URL con tương ứng với thẻ <NavLink to="..." /> ở Sidebar */}
          <Route path="/customer/dashboard" element={<Dashboard />} />
   
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/create-order/consignment" element={<ConsigmentOrder />} />
          <Route path="/processing-orders" element={<ConsignmentList />} /> 
        </Route>

        {/* ================= ROUTE 404 ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;