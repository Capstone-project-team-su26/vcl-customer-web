import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/HomePage/Home";
import Login from "../pages/LoginPage/Login";
import Register from "../pages/RegisterPage/Register";
import VerifyOtp from "../pages/OTPPage/VerifyOtp";
import NotFound from "../pages/NotFound";

// ⬇️ IMPORT CÁC COMPONENT LAYOUT VÀ MÀN HÌNH MỚI CỦA BẠN VÀO ĐÂY
import MainLayout from "../layouts/MainLayout"; // Bạn nhớ chỉnh lại đường dẫn file cho đúng cấu trúc folder của bạn nhé
import Dashboard from "../pages/DashboardPage/DashboardCusstomer/Dashboard";
import ProcessingOrders from "../pages/DashboardPage/ProcessingOrders";
import CreateOrder from "../pages/DashboardPage/CreateCustomer/CreateOrder";
import ConsigmentOrder from "../pages/DashboardPage/CreateCustomer/KiGuiHang/ConsignmentOrder";



const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= CÁC ROUTE CƠ BẢN (KHÔNG DÙNG SIDEBAR) ================= */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* ================= CÁC ROUTE KHÁCH HÀNG (SỬ DỤNG CHUNG SIDEBAR LAYOUT) ================= */}
        {/* Khi user vào các trang con, MainLayout sẽ được render cố định, phần ruột <Outlet /> bên phải sẽ tự thay đổi */}
        <Route element={<MainLayout />}>
          {/* Định nghĩa các URL con tương ứng với thẻ <NavLink to="..." /> ở Sidebar */}
          <Route path="/customer/dashboard" element={<Dashboard />} />
          <Route path="/processing-orders" element={<ProcessingOrders />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/create-order/consignment" element={<ConsigmentOrder />} />
          

    
          
          {/* Bạn có thể bổ sung thêm các màn hình khác vào đây tương tự:
          <Route path="/receive-goods" element={<ReceiveGoods />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/waiting-packages" element={<WaitingPackages />} />
          <Route path="/warehouse/inventory" element={<WarehouseInventory />} />
          <Route path="/warehouse/export" element={<WarehouseExport />} />
          <Route path="/history/buy-on-behalf" element={<BuyOnBehalfHistory />} />
          <Route path="/history/consignment" element={<ConsignmentHistory />} />
          */}
        </Route>

        {/* ================= ROUTE 404 ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;