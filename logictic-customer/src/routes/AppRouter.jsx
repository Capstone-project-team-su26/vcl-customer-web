import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/HomePage/Home";
import Login from "../pages/LoginPage/Login";
import Register from "../pages/RegisterPage/Register";
import VerifyOtp from "../pages/OTPPage/VerifyOtp";
import NotFound from "../pages/NotFound";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;