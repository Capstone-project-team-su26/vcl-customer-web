import React, {
  useState,
} from "react";

import {
  HistoryOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

import BuyOrderHistoryContent from "../../../../components/DashboardComponents/HistoryComponents/HistoryTransBuy/BuyOrderHistoryContent";
import ConsignmentHistoryContent from "../../../../components/DashboardComponents/HistoryComponents/HistoryTransOrder/ConsignmentHistoryContent";

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
  const [
    activeTab,
    setActiveTab,
  ] = useState(
    TAB_KEYS.BUY_ORDER
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
            <BuyOrderHistoryContent />
          ) : (
            <ConsignmentHistoryContent />
          )}
        </div>
      </section>
    </div>
  );
}
