/**
 * Các trang của khách hàng sau khi đăng nhập — dùng chung MainLayout
 * (sidebar + header). Được lồng trong <Route element={<MainLayout />}>.
 */
import { Route } from "react-router-dom";

import { DASHBOARD_ROUTES as D } from "./paths";

import Dashboard from "@features/dashboard/pages/Dashboard/Dashboard";
import CreateOrder from "@features/orders/pages/CreateOrder/CreateOrder";

/* Ký gửi */
import ConsignmentOrder from "@features/consignment/pages/ConsignmentOrder/ConsignmentOrder";
import ConsignmentList from "@features/consignment/pages/ConsignmentList/ConsignmentList";
import ConsignmentListDetail from "@features/consignment/pages/ConsignmentListDetail/ConsignmentListDetail";
import ConsignmentListCheck from "@features/consignment/pages/ConsignmentListCheck/ConsignmentListCheck";
import QuotationDetail from "@features/consignment/pages/QuotationDetail/QuotationDetail";

/* Mua hộ */
import ConsignmentBuyOrder from "@features/purchase/pages/ConsignmentBuyOrder/ConsignmentBuyOrder";
import PurchaseRequestPendingList from "@features/purchase/pages/PurchaseRequestPendingList/PurchaseRequestPendingList";
import PurchaseRequestDetail from "@features/purchase/pages/PurchaseRequestDetail/PurchaseRequestDetail";
import BuyForMeQuotationList from "@features/purchase/pages/BuyForMeQuotationList/BuyForMeQuotationList";
import BuyForMeQuotationListDetail from "@features/purchase/pages/BuyForMeQuotationListDetail/BuyForMeQuotationListDetail";

/* Lịch sử & thanh toán */
import ConsignmentHistoryList from "@features/history/pages/ConsignmentHistoryList/ConsignmentHistoryList";
import BuyOrderHistoryList from "@features/history/pages/BuyOrderHistoryList/BuyOrderHistoryList";
import TransactionHistoryTabs from "@features/history/pages/TransactionHistoryTabs/TransactionHistoryTabs";
import OrderPaymentHistory from "@features/payment/pages/OrderPaymentHistory/OrderPaymentHistory";
import BuyOrderPaymentHistory from "@features/payment/pages/BuyOrderPaymentHistory/BuyOrderPaymentHistory";
import SettlementList from "@features/settlement/pages/SettlementList/SettlementList";

/* CSKH, cài đặt */
import CustomerServiceChat from "@features/chat/pages/CustomerServiceChat/CustomerServiceChat";
import ProfileConfig from "@features/profile/pages/ProfileConfig/ProfileConfig";
import ServicePolicy from "@features/service-policy/pages/ServicePolicy/ServicePolicy";

/* Kho (chỉ còn phần mua hộ) */
import { CheckinNhapKho, ThongQuanVn } from "@features/warehouse/pages";
import { MuaHoDetail } from "@features/warehouse/pages/MuaHoDetail/MuaHoDetail";

/* Theo dõi đơn ký gửi — thêm vào CUỐI nhóm import để không đổi thứ tự nạp CSS cũ. */
import { OrderTrackingList, OrderTrackingDetail } from "@features/tracking";

export const dashboardRoutes = (
  <>
    <Route path={D.dashboard} element={<Dashboard />} />

    {/* Tạo đơn */}
    <Route path={D.createOrder} element={<CreateOrder />} />
    <Route path={D.createConsignmentOrder} element={<ConsignmentOrder />} />
    <Route path={D.createBuyOrder} element={<ConsignmentBuyOrder />} />

    {/* Đơn đang xử lý */}
    <Route path={D.processingOrders} element={<ConsignmentList />} />
    <Route path={D.consignmentDetail()} element={<ConsignmentListDetail />} />
    <Route path={D.purchaseRequests} element={<PurchaseRequestPendingList />} />
    <Route path={D.purchaseRequestDetail()} element={<PurchaseRequestDetail />} />

    {/* Chờ báo giá */}
    <Route path={D.checkOrders} element={<ConsignmentListCheck />} />
    <Route path={D.quotationDetail()} element={<QuotationDetail />} />
    <Route path={D.buyForMeQuotations} element={<BuyForMeQuotationList />} />
    <Route
      path={D.buyForMeQuotationDetail()}
      element={<BuyForMeQuotationListDetail />}
    />

    {/* Theo dõi đơn & thanh toán vận chuyển */}
    <Route path={D.orderTracking} element={<OrderTrackingList />} />
    <Route path={D.orderTrackingDetail()} element={<OrderTrackingDetail />} />
    <Route path={D.payment} element={<SettlementList />} />

    {/* Lịch sử */}
    <Route path={D.consignmentHistory} element={<ConsignmentHistoryList />} />
    <Route path={D.buyOnBehalfHistory} element={<BuyOrderHistoryList />} />
    <Route path={D.buyOrderHistory} element={<BuyOrderHistoryList />} />
    <Route path={D.transactionHistory} element={<TransactionHistoryTabs />} />
    <Route path={D.orderPaymentHistory()} element={<OrderPaymentHistory />} />
    <Route
      path={D.buyOnBehalfPaymentHistory()}
      element={<BuyOrderPaymentHistory />}
    />
    <Route
      path={D.buyOrderPaymentHistory()}
      element={<BuyOrderPaymentHistory />}
    />
    <Route
      path={D.purchaseRequestPaymentHistory()}
      element={<BuyOrderPaymentHistory />}
    />
    <Route
      path={D.purchaseRequestPayments()}
      element={<BuyOrderPaymentHistory />}
    />

    {/* Kho hàng (mua hộ) */}
    <Route path={D.warehouseCheckin} element={<CheckinNhapKho />} />
    <Route path={D.warehouseInventory} element={<CheckinNhapKho />} />
    <Route path={D.warehousePurchaseDetail()} element={<MuaHoDetail />} />
    <Route path={D.warehouseCustoms} element={<ThongQuanVn />} />

    {/* CSKH & cài đặt */}
    <Route path={D.customerServiceChat} element={<CustomerServiceChat />} />
    <Route path={D.profileConfig} element={<ProfileConfig />} />
    <Route path={D.servicePolicy} element={<ServicePolicy />} />
  </>
);

export default dashboardRoutes;
