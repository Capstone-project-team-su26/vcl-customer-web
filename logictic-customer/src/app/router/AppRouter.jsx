import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "@layouts/MainLayout/MainLayout";
import NotFound from "@app/pages/NotFound/NotFound";

import publicRoutes from "./publicRoutes";
import dashboardRoutes from "./dashboardRoutes";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang công khai — không sidebar */}
        {publicRoutes}

        {/* Trang khách hàng — dùng chung sidebar + header */}
        <Route element={<MainLayout />}>{dashboardRoutes}</Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
