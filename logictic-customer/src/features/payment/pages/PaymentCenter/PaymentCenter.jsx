import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Tabs } from "antd";
import { HistoryOutlined, WalletOutlined } from "@ant-design/icons";

import { SettlementList } from "@features/settlement";
import { TransactionHistoryTabs } from "@features/history";
/* Import sâu: barrel purchase kéo theo các trang mua hộ (thứ tự CSS). */
import PurchasePaymentsDue from "@features/purchase/components/PurchasePaymentsDue/PurchasePaymentsDue";

import {
  PAYMENT_TABS,
  paymentTabPath,
} from "@features/orders/constants/orderPaths";

import "./PaymentCenter.css";

const TAB_ITEMS = [
  { key: PAYMENT_TABS.due, icon: <WalletOutlined />, label: "Cần thanh toán" },
  { key: PAYMENT_TABS.history, icon: <HistoryOutlined />, label: "Lịch sử giao dịch" },
];

const TAB_KEYS = TAB_ITEMS.map((item) => item.key);

/* PayOS:ReturnUrl mặc định của backend (khoản do nhân viên phát hành, khách trả qua payOS)
   là /payment/success — về Lịch sử giao dịch, giữ query payOS để banner đọc kết quả. */
const PAYOS_DEFAULT_RETURN_TAB = "success";

/**
 * Trang Thanh toán — gộp "Thanh toán vận chuyển" và "Lịch sử giao dịch" cũ.
 *
 * Tiền của khách trước đây rải ở ba chỗ: màn tất toán, menu "Lịch sử giao dịch", và
 * mấy URL lịch sử thanh toán rời của từng đơn mua hộ. Giờ chỉ còn hai câu hỏi khách
 * thật sự hỏi: "tôi đang phải trả gì?" và "tôi đã trả những gì rồi?".
 *
 * "Cần thanh toán" = khoản mua hộ chờ trả (trả trước sau khi chấp nhận báo giá, phần
 * chênh giá đã đồng ý — PurchasePaymentsDue) + tất toán vận chuyển (SettlementList).
 *
 * Tab nằm trên URL (`/payment/can-thanh-toan` | `/payment/lich-su`) để link cũ chuyển
 * hướng về được và khách gửi link cho CSKH vẫn đúng chỗ.
 */
export default function PaymentCenter() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { tab } = useParams();

  if (tab === PAYOS_DEFAULT_RETURN_TAB) {
    return (
      <Navigate to={{ pathname: paymentTabPath(PAYMENT_TABS.history), search }} replace />
    );
  }

  if (!TAB_KEYS.includes(tab)) {
    return <Navigate to={paymentTabPath(PAYMENT_TABS.due)} replace />;
  }

  return (
    <div className="payment-center">
      <Tabs
        className="payment-center__tabs"
        activeKey={tab}
        items={TAB_ITEMS.map((item) => ({
          key: item.key,
          label: (
            <span className="payment-center__tab-label">
              {item.icon}
              {item.label}
            </span>
          ),
        }))}
        onChange={(key) => navigate(paymentTabPath(key))}
      />

      <div className="payment-center__panel">
        {tab === PAYMENT_TABS.history ? (
          <TransactionHistoryTabs />
        ) : (
          <>
            {/* Mọi khoản khách phải trả ở một chỗ: mua hộ (trả trước, chênh giá) + tất toán vận chuyển. */}
            <PurchasePaymentsDue />
            <SettlementList />
          </>
        )}
      </div>
    </div>
  );
}
