import React, {
  useMemo,
  useState,
} from "react";

import {
  CalendarOutlined,
  SearchOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import "./ConsignmentHistoryContent.css";

const ConsignmentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
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

const CONSIGNMENT_DEMO_DATA = [];

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
    WAITING_DEPOSIT:
      "Chờ đặt cọc",
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
      "WAITING_DEPOSIT",
      "WAITING_PAYMENT",
    ].includes(normalized)
  ) {
    return "pending";
  }

  return "processing";
};

export default function ConsignmentHistoryContent() {
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
      return CONSIGNMENT_DEMO_DATA;
    }

    return CONSIGNMENT_DEMO_DATA.filter(
      (item) =>
        [
          item.consignmentCode,
          item.orderId,
          item.installmentType,
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
    <div className="consignment-history-content">
      <div className="consignment-history-toolbar">
        <div>
          <span className="consignment-history-eyebrow">
            LỊCH SỬ KÝ GỬI
          </span>

          <h2>
            Giao dịch ký gửi
          </h2>

          <p>
            Danh sách đặt cọc và thanh toán
            phát sinh từ các đơn ký gửi.
          </p>
        </div>

        <div className="consignment-history-search">
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

      <div className="consignment-history-panel">
        <div className="consignment-history-summary">
          <div className="consignment-history-summary__item">
            <div className="consignment-history-summary__icon">
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

          <div className="consignment-history-summary__item">
            <div className="consignment-history-summary__icon">
              <CalendarOutlined />
            </div>

            <div>
              <span>
                Loại đơn
              </span>

              <strong>
                Ký gửi
              </strong>
            </div>
          </div>
        </div>

        {!filteredData.length ? (
          <div className="consignment-history-empty">
            <div className="consignment-history-empty__icon">
              <ConsignmentIcon />
            </div>

            <h3>
              Chưa có lịch sử giao dịch ký gửi
            </h3>

            <p>
              Các giao dịch đặt cọc và thanh toán
              của đơn ký gửi sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="consignment-history-table-wrapper">
            <table className="consignment-history-table">
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
                          {item.consignmentCode ||
                            item.orderId ||
                            "-"}
                        </strong>
                      </td>

                      <td>
                        {item.installmentType ||
                          "-"}
                      </td>

                      <td className="consignment-history-money">
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
                          className={`consignment-history-status consignment-history-status--${getStatusClassName(
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
