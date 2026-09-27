import {
  useCallback,
  useState,
} from "react";

import { useLocation } from "react-router-dom";

import {
  HistoryOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

import {
  PAYMENT_SUBJECTS,
  resolvePaymentReturn,
} from "@features/payment/utils/pendingPaymentReturn";
import { ORDER_KINDS } from "@features/orders/constants/orderPaths";

import BuyOrderHistoryContent from "@features/history/components/BuyOrderHistoryContent/BuyOrderHistoryContent";
import ConsignmentHistoryContent from "@features/history/components/ConsignmentHistoryContent/ConsignmentHistoryContent";
import PaymentReturnBanner from "@features/history/components/PaymentReturnBanner/PaymentReturnBanner";

import "./TransactionHistoryTabs.css";

const TAB_KEYS = {
  BUY_ORDER: "BUY_ORDER",
  CONSIGNMENT: "CONSIGNMENT",
};

const ConsignmentIcon = ({
  className = "",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect
      x="1"
      y="3"
      width="15"
      height="13"
    />

    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />

    <circle
      cx="5.5"
      cy="18.5"
      r="2.5"
    />

    <circle
      cx="18.5"
      cy="18.5"
      r="2.5"
    />
  </svg>
);

export default function TransactionHistoryTabs() {
  const location = useLocation();

  /* Khách vừa thanh toán xong được đưa về đây (SePay/payOS → /history/* → /payment/lich-su
     ?loai=...). Đọc MỘT lần lúc mở trang: giao dịch nào vừa trả, của đơn nào, mở phần nào. */
  const [paymentReturn] = useState(() =>
    resolvePaymentReturn(location.search)
  );

  const [
    activeTab,
    setActiveTab,
  ] = useState(() =>
    paymentReturn.kind === ORDER_KINDS.consignment
      ? TAB_KEYS.CONSIGNMENT
      : TAB_KEYS.BUY_ORDER
  );

  /* Đơn của giao dịch vừa trả: danh sách bên dưới (luôn "Tất cả") tô đơn này. */
  const justPaid = paymentReturn.pending;
  const highlightPurchase =
    justPaid?.subject === PAYMENT_SUBJECTS.purchaseRequest
      ? justPaid
      : null;
  const highlightOrder =
    justPaid?.subject === PAYMENT_SUBJECTS.order
      ? justPaid
      : null;

  /* Tiền đã về: dựng lại danh sách để trạng thái đơn mới nhất hiện ngay. */
  const [listVersion, setListVersion] = useState(0);
  const handlePaid = useCallback(
    () => setListVersion((value) => value + 1),
    []
  );

  const isBuyOrder =
    activeTab ===
    TAB_KEYS.BUY_ORDER;

  const handleChangeTab = (
    tabKey
  ) => {
    setActiveTab(tabKey);
  };

  return (
    <div className="transaction-tabs-page">
      <section className="transaction-tabs-header">
        <div className="transaction-tabs-header__icon">
          <HistoryOutlined />
        </div>

        <div className="transaction-tabs-header__content">
          <span>
            QUẢN LÝ THANH TOÁN
          </span>

          <h1>
            LỊCH SỬ GIAO DỊCH
          </h1>

          <p>
            Theo dõi giao dịch Mua hộ và
            Ký gửi trong cùng một màn hình.
          </p>
        </div>
      </section>

      <PaymentReturnBanner
        context={paymentReturn}
        onPaid={handlePaid}
      />

      <section className="transaction-tabs-card">
        <div
          className="transaction-tabs-switch"
          role="tablist"
          aria-label="Loại lịch sử giao dịch"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              isBuyOrder
            }
            className={[
              "transaction-tab-button",
              "transaction-tab-button--buy",
              isBuyOrder &&
                "is-active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              handleChangeTab(
                TAB_KEYS.BUY_ORDER
              )
            }
          >
            <ShoppingOutlined />
            <span>MUA HỘ</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              !isBuyOrder
            }
            className={[
              "transaction-tab-button",
              "transaction-tab-button--consignment",
              !isBuyOrder &&
                "is-active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              handleChangeTab(
                TAB_KEYS.CONSIGNMENT
              )
            }
          >
            <ConsignmentIcon />
            <span>KÝ GỬI</span>
          </button>
        </div>

        <div
          className="transaction-tab-render-area"
          role="tabpanel"
        >
          {isBuyOrder ? (
            <BuyOrderHistoryContent
              key={listVersion}
              highlightRequestId={highlightPurchase?.targetId}
            />
          ) : (
            <ConsignmentHistoryContent
              key={listVersion}
              highlightOrderId={highlightOrder?.targetId}
            />
          )}
        </div>
      </section>
    </div>
  );
}
