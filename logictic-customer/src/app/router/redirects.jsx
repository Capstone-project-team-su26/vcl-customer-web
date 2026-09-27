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
 * backend trả khách về đúng URL đó (returnUrl mặc định) kèm `?orderCode=&status=`, payOS nối
 * thêm `&code=&id=&cancel=&status=&orderCode=`; mất query là banner không biết giao dịch nào
 * vừa trả và khách tưởng mất tiền.
 *
 * Hai URL cũ /history/consignment (khoản của đơn kho) và /history/buy-on-behalf (khoản của
 * yêu cầu mua hộ) về "Thanh toán → Lịch sử giao dịch" kèm `?loai=` để mở đúng phần.
 * URLSearchParams giữ nguyên thứ tự và khoá trùng tên (`status`/`orderCode` của ta đứng
 * trước của payOS), nên `get()` ở trang đích vẫn đọc đúng giá trị backend gắn.
 */
export const RedirectKeepingQuery = ({ to, params }) => {
  const { search, hash } = useLocation();

  /* `params`: khoá thêm vào query (không đè khoá URL cũ đã có). */
  const query = new URLSearchParams(search);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (!query.has(key)) query.set(key, value);
  });

  const nextSearch = query.toString();

  return (
    <Navigate
      to={{ pathname: to, search: nextSearch ? `?${nextSearch}` : "", hash }}
      replace
    />
  );
};
