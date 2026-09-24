/**
 * Các trang của khách hàng sau khi đăng nhập — dùng chung MainLayout
 * (sidebar + header). Được lồng trong <Route element={<MainLayout />}>.
 *
 * Menu phẳng 8 mục (Bảng điều khiển · Tạo đơn · Đơn ký gửi · Đơn mua hộ · Thanh toán ·
 * Trò chuyện với CSKH · Cấu hình tài khoản · Chính sách dịch vụ), nên số trang thật cũng
 * gọn theo: một component danh sách dùng cho cả hai loại đơn, một trang chi tiết đơn chia
 * tab, một trang thanh toán hai tab. Phần cuối file là bảng CHUYỂN HƯỚNG cho toàn bộ URL
 * cũ — link trong email, thông báo đẩy và bookmark của khách không được chết.
 */
import { Navigate, Route } from "react-router-dom";

import {
  DASHBOARD_ROUTES as D,
  LEGACY_DASHBOARD_ROUTES as LEGACY,
  ORDER_DETAIL_TABS,
  ORDER_KINDS,
  PAYMENT_TABS,
  CREATE_ORDER_TABS,
} from "./paths";
import {
  RedirectKeepingQuery,
  RedirectToOrderTab,
  RedirectToPurchaseRequest,
} from "./redirects";

import Dashboard from "@features/dashboard/pages/Dashboard/Dashboard";

/* Đơn hàng: tạo đơn, danh sách gộp, chi tiết chia tab. */
import CreateOrder from "@features/orders/pages/CreateOrder/CreateOrder";
import OrderList from "@features/orders/pages/OrderList/OrderList";
import OrderDetail from "@features/orders/pages/OrderDetail/OrderDetail";

/* Mua hộ — hai màn chi tiết riêng, hiện còn đọc dữ liệu mẫu. */
import PurchaseRequestDetail from "@features/purchase/pages/PurchaseRequestDetail/PurchaseRequestDetail";
import BuyForMeQuotationListDetail from "@features/purchase/pages/BuyForMeQuotationListDetail/BuyForMeQuotationListDetail";

/* Thanh toán — "Cần thanh toán" + "Lịch sử giao dịch". */
import PaymentCenter from "@features/payment/pages/PaymentCenter/PaymentCenter";

/* Hỗ trợ & tài khoản */
import CustomerServiceChat from "@features/chat/pages/CustomerServiceChat/CustomerServiceChat";
import ProfileConfig from "@features/profile/pages/ProfileConfig/ProfileConfig";
import ServicePolicy from "@features/service-policy/pages/ServicePolicy/ServicePolicy";

/** Danh sách cũ → danh sách mới của đúng loại đơn, lọc sẵn theo giai đoạn nếu cần. */
const ordersOf = (kind, stage) => {
  const base = kind === ORDER_KINDS.purchase ? D.purchaseOrders : D.consignmentOrders;

  return stage ? `${base}?stage=${stage}` : base;
};

export const dashboardRoutes = (
  <>
    <Route path={D.dashboard} element={<Dashboard />} />

    {/* Tạo đơn — một trang, chuyển đổi Ký gửi / Mua hộ */}
    <Route
      path={D.createOrder}
      element={<Navigate to={D.createOrderTab(CREATE_ORDER_TABS.consignment)} replace />}
    />
    <Route path={D.createOrderTab()} element={<CreateOrder />} />

    {/* Đơn hàng — hai mục menu, hai danh sách, MỘT component (khoá sẵn loại đơn) */}
    <Route path={D.orders} element={<Navigate to={D.consignmentOrders} replace />} />
    <Route
      path={D.consignmentOrders}
      element={<OrderList kind={ORDER_KINDS.consignment} />}
    />
    <Route path={D.purchaseOrders} element={<OrderList kind={ORDER_KINDS.purchase} />} />
    <Route path={D.purchaseRequestDetail()} element={<PurchaseRequestDetail />} />
    <Route
      path={D.purchaseRequestQuotation()}
      element={<BuyForMeQuotationListDetail />}
    />
    <Route
      path={D.orderDetailRoot()}
      element={<RedirectToOrderTab tab={ORDER_DETAIL_TABS.journey} />}
    />
    <Route path={D.orderDetail(":orderId", ":tab")} element={<OrderDetail />} />

    {/* Thanh toán */}
    <Route
      path={D.payment}
      element={<Navigate to={D.paymentTab(PAYMENT_TABS.due)} replace />}
    />
    <Route path={D.paymentTab()} element={<PaymentCenter />} />

    {/* Hỗ trợ & tài khoản */}
    <Route path={D.customerServiceChat} element={<CustomerServiceChat />} />
    <Route path={D.profileConfig} element={<ProfileConfig />} />
    <Route path={D.servicePolicy} element={<ServicePolicy />} />

    {/* ---------------------------------------------------------------- *
     * URL CŨ — chỉ chuyển hướng, không còn trang riêng                   *
     * ---------------------------------------------------------------- */}

    {/* Năm trang rời của MỘT đơn → năm tab */}
    <Route
      path={LEGACY.consignmentDetail}
      element={<RedirectToOrderTab tab={ORDER_DETAIL_TABS.parcels} />}
    />
    <Route
      path={LEGACY.quotationDetail}
      element={<RedirectToOrderTab tab={ORDER_DETAIL_TABS.quotation} />}
    />
    <Route
      path={LEGACY.orderTrackingDetail}
      element={<RedirectToOrderTab tab={ORDER_DETAIL_TABS.journey} />}
    />
    <Route
      path={LEGACY.orderPaymentHistory}
      element={<RedirectToOrderTab tab={ORDER_DETAIL_TABS.payment} />}
    />

    {/* Bốn nhóm danh sách cũ → danh sách đơn duy nhất, lọc sẵn bằng chip */}
    <Route
      path={LEGACY.processingOrders}
      element={<Navigate to={ordersOf(ORDER_KINDS.consignment)} replace />}
    />
    <Route
      path={LEGACY.purchaseRequests}
      element={<Navigate to={ordersOf(ORDER_KINDS.purchase)} replace />}
    />
    <Route path={LEGACY.purchaseRequestDetail} element={<RedirectToPurchaseRequest />} />
    <Route
      path={LEGACY.checkOrders}
      element={
        <Navigate to={ordersOf(ORDER_KINDS.consignment, "cho-bao-gia")} replace />
      }
    />
    <Route
      path={LEGACY.buyForMeQuotations}
      element={
        <Navigate to={ordersOf(ORDER_KINDS.purchase, "cho-bao-gia")} replace />
      }
    />
    <Route
      path={LEGACY.buyForMeQuotationDetail}
      element={<RedirectToPurchaseRequest quotation />}
    />
    <Route
      path={LEGACY.orderTracking}
      element={<Navigate to={D.consignmentOrders} replace />}
    />
    {/* payOS trả khách về đây kèm query của nó (đơn tạo trước bản gộp IA) — phải giữ
        query thì vòng poll trạng thái cọc ở tab lịch sử mới chạy. */}
    <Route
      path={LEGACY.consignmentHistory}
      element={<RedirectKeepingQuery to={D.paymentTab(PAYMENT_TABS.history)} />}
    />
    <Route
      path={LEGACY.buyOnBehalfHistory}
      element={
        <Navigate to={ordersOf(ORDER_KINDS.purchase, "hoan-tat")} replace />
      }
    />
    <Route
      path={LEGACY.buyOrderHistory}
      element={
        <Navigate to={ordersOf(ORDER_KINDS.purchase, "hoan-tat")} replace />
      }
    />

    {/* Lịch sử thanh toán rời → tab "Lịch sử giao dịch" */}
    {[
      LEGACY.transactionHistory,
      LEGACY.buyOnBehalfPaymentHistory,
      LEGACY.buyOrderPaymentHistory,
      LEGACY.purchaseRequestPayments,
      LEGACY.purchaseRequestPaymentHistory,
    ].map((path) => (
      <Route
        key={path}
        path={path}
        element={<Navigate to={D.paymentTab(PAYMENT_TABS.history)} replace />}
      />
    ))}

    {/* Tạo đơn tách hai trang → một trang có nút chuyển đổi */}
    <Route
      path={LEGACY.createConsignmentOrder}
      element={<Navigate to={D.createOrderTab(CREATE_ORDER_TABS.consignment)} replace />}
    />
    <Route
      path={LEGACY.createBuyOrder}
      element={<Navigate to={D.createOrderTab(CREATE_ORDER_TABS.purchase)} replace />}
    />

    {/* Kho hàng mua hộ: khách không vận hành kho — thông tin kiện/kho nằm trong đơn */}
    {[LEGACY.warehouseCheckin, LEGACY.warehouseInventory, LEGACY.warehouseCustoms].map(
      (path) => (
        <Route
          key={path}
          path={path}
          element={<Navigate to={ordersOf(ORDER_KINDS.purchase)} replace />}
        />
      ),
    )}
    <Route
      path={LEGACY.warehousePurchaseDetail}
      element={<RedirectToPurchaseRequest />}
    />
  </>
);

export default dashboardRoutes;
