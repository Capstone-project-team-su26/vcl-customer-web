/**
 * Component chuyển hướng cho các URL cũ CÓ THAM SỐ.
 *
 * `<Navigate to="..." />` đủ dùng cho URL tĩnh, nhưng `/quotations/:orderId` hay
 * `/warehouse/purchase-detail/:id` phải đọc tham số rồi mới ghép được địa chỉ mới —
 * nên cần component thật. Để riêng file: dashboardRoutes.jsx chỉ còn bảng route.
 */
import { Navigate, useLocation, useParams } from "react-router-dom";

import { DASHBOARD_ROUTES as D } from "./paths";

/** `/consignments/:orderId`, `/quotations/:orderId`... → đúng tab của `/orders/:orderId`. */
export const RedirectToOrderTab = ({ tab }) => {
  const { orderId } = useParams();

  return <Navigate to={D.orderDetail(orderId, tab)} replace />;
};

/** `/processing-orders/purchase-requests/:requestId`... → `/orders/mua-ho/:requestId`. */
export const RedirectToPurchaseRequest = ({ quotation = false }) => {
  const { requestId, id } = useParams();
  const purchaseRequestId = requestId ?? id;

  return (
    <Navigate
      to={
        quotation
          ? D.purchaseRequestQuotation(purchaseRequestId)
          : D.purchaseRequestDetail(purchaseRequestId)
      }
      replace
    />
  );
};

/**
 * Chuyển hướng GIỮ NGUYÊN query của URL cũ.
 *
 * `<Navigate to="/x" />` vứt hết query đi. Với `/history/consignment` thì không được:
 * payOS trả khách về đúng URL đó kèm `?code=&id=&cancel=&status=&orderCode=`, mất query
 * là vòng poll trạng thái tiền cọc không có gì để chạy và khách tưởng mất tiền.
 * (Đơn tạo từ bản mới đã trả về thẳng `/payment/lich-su`; cái này lo cho khoản đang dở.)
 */
export const RedirectKeepingQuery = ({ to }) => {
  const { search, hash } = useLocation();

  return <Navigate to={{ pathname: to, search, hash }} replace />;
};
