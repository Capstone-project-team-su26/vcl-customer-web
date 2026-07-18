import React, {
  useMemo,
  useState,
} from "react";

import {
  CalendarOutlined,
  SearchOutlined,
  ShoppingOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import "./BuyOrderHistoryContent.css";

const BUY_ORDER_DEMO_DATA = [];

const formatMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 2,
    }
  ).format(number);
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(date);
};

const getStatusLabel = (status) => {
  const labels = {
    PENDING: "Chờ xử lý",
    WAITING_PAYMENT:
      "Chờ thanh toán",
    PAID: "Đã thanh toán",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    CANCELED: "Đã hủy",
  };

  const normalized =
    String(status || "")
      .trim()
      .toUpperCase();

  return (
    labels[normalized] ||
    normalized
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /(^|\s)\S/g,
        (letter) =>
          letter.toUpperCase()
      ) ||
    "-"
  );
};

const getStatusClassName = (
  status
) => {
  const normalized =
    String(status || "")
      .trim()
      .toUpperCase();

  if (
    [
      "PAID",
      "COMPLETED",
      "SUCCESS",
    ].includes(normalized)
  ) {
    return "success";
  }

  if (
    [
      "CANCELLED",
      "CANCELED",
      "FAILED",
    ].includes(normalized)
  ) {
    return "danger";
  }

  if (
    [
      "PENDING",
      "WAITING_PAYMENT",
    ].includes(normalized)
  ) {
    return "pending";
  }

  return "processing";
};

export default function BuyOrderHistoryContent() {
  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const filteredData = useMemo(() => {
    const keyword =
      searchValue
        .trim()
        .toLowerCase();

    if (!keyword) {
      return BUY_ORDER_DEMO_DATA;
    }

    return BUY_ORDER_DEMO_DATA.filter(
      (item) =>
        [
          item.orderCode,
          item.orderId,
          item.transactionType,
          item.paymentMethod,
          item.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword)
    );
  }, [searchValue]);

  return (
    <div className="buy-history-content">
      <div className="buy-history-toolbar">
        <div>
          <span className="buy-history-eyebrow">
            LỊCH SỬ MUA HỘ
          </span>

          <h2>
            Giao dịch mua hộ
          </h2>

          <p>
            Danh sách thanh toán phát sinh
            từ các yêu cầu mua hộ.
          </p>
        </div>

        <div className="buy-history-search">
          <SearchOutlined />

          <input
            type="text"
            value={searchValue}
            placeholder="Tìm mã đơn, trạng thái..."
            onChange={(event) =>
              setSearchValue(
                event.target.value
              )
            }
          />
        </div>
      </div>

      <div className="buy-history-panel">
        <div className="buy-history-summary">
          <div className="buy-history-summary__item">
            <div className="buy-history-summary__icon">
              <SwapOutlined />
            </div>

            <div>
              <span>
                Tổng giao dịch
              </span>

              <strong>
                {filteredData.length}
              </strong>
            </div>
          </div>

          <div className="buy-history-summary__item">
            <div className="buy-history-summary__icon">
              <CalendarOutlined />
            </div>

            <div>
              <span>
                Loại đơn
              </span>

              <strong>
                Mua hộ
              </strong>
            </div>
          </div>
        </div>

        {!filteredData.length ? (
          <div className="buy-history-empty">
            <div className="buy-history-empty__icon">
              <ShoppingOutlined />
            </div>

            <h3>
              Chưa có lịch sử giao dịch mua hộ
            </h3>

            <p>
              Các giao dịch thanh toán của
              yêu cầu mua hộ sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="buy-history-table-wrapper">
            <table className="buy-history-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>LOẠI GIAO DỊCH</th>
                  <th>SỐ TIỀN</th>
                  <th>PHƯƠNG THỨC</th>
                  <th>TRẠNG THÁI</th>
                  <th>THỜI GIAN</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map(
                  (item, index) => (
                    <tr
                      key={
                        item.id ||
                        item.orderId ||
                        index
                      }
                    >
                      <td>
                        <strong>
                          {item.orderCode ||
                            item.orderId ||
                            "-"}
                        </strong>
                      </td>

                      <td>
                        {item.transactionType ||
                          "-"}
                      </td>

                      <td className="buy-history-money">
                        {formatMoney(
                          item.amount
                        )}
                      </td>

                      <td>
                        {item.paymentMethod ||
                          "-"}
                      </td>

                      <td>
                        <span
                          className={`buy-history-status buy-history-status--${getStatusClassName(
                            item.status
                          )}`}
                        >
                          {getStatusLabel(
                            item.status
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDateTime(
                          item.createdAt
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
