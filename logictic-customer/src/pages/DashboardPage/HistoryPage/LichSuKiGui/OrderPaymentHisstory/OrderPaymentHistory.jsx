import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Descriptions,
  Tag,
  Tooltip,
} from "antd";

import {
  Button,
  CircularProgress,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import {
  getOrderPaymentHistoryApi,
} from "../../../../../api/PaymentApi/orderPaymentApi";

import AuthNotify from "../../../../../utils/AuthNotify";

import "./OrderPaymentHistory.css";

/* =========================================================
   STATUS LABELS
   ========================================================= */

const ORDER_STATUS_LABELS = {
  WAITING_DEPOSIT: "CHỜ ĐẶT CỌC",
  DEPOSIT_PENDING: "CHỜ ĐẶT CỌC",
  PENDING_DEPOSIT: "CHỜ ĐẶT CỌC",
  WAITING_PAYMENT: "CHỜ THANH TOÁN",
  PENDING_PAYMENT: "CHỜ THANH TOÁN",
  PAYMENT_PENDING: "CHỜ THANH TOÁN",
  PROCESSING: "ĐANG XỬ LÝ",
  COMPLETED: "HOÀN THÀNH",
  PAID: "ĐÃ THANH TOÁN",
  CANCELLED: "ĐÃ HỦY",
  CANCELED: "ĐÃ HỦY",
};

const QUOTATION_STATUS_LABELS = {
  DRAFT: "BẢN NHÁP",
  PENDING: "CHỜ XÁC NHẬN",
  ACCEPTED: "ĐÃ CHẤP NHẬN",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  EXPIRED: "HẾT HẠN",
};

const QUOTE_TYPE_LABELS = {
  ESTIMATE: "BÁO GIÁ TẠM TÍNH",
  OFFICIAL: "BÁO GIÁ CHÍNH THỨC",
  FINAL: "BÁO GIÁ CHÍNH THỨC",
};

const PAYMENT_STATUS_LABELS = {
  PENDING: "CHỜ THANH TOÁN",
  PROCESSING: "ĐANG XỬ LÝ",
  PAID: "ĐÃ THANH TOÁN",
  SUCCESS: "THÀNH CÔNG",
  COMPLETED: "HOÀN THÀNH",
  FAILED: "THẤT BẠI",
  CANCELLED: "ĐÃ HỦY",
  CANCELED: "ĐÃ HỦY",
  EXPIRED: "HẾT HẠN",
};

const INSTALLMENT_TYPE_LABELS = {
  DEPOSIT: "ĐẶT CỌC",
  REMAINING: "THANH TOÁN PHẦN CÒN LẠI",
  FULL_PAYMENT: "THANH TOÁN TOÀN BỘ",
  FINAL_PAYMENT: "THANH TOÁN CUỐI",
};

const PAYMENT_METHOD_LABELS = {
  PAYOS: "PayOS",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  CASH: "Tiền mặt",
};

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeStatus = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (value) => {
  const normalized =
    normalizeStatus(value);

  if (!normalized) {
    return "-";
  }

  return normalized
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

const getStatusClassName = (value) => {
  const normalized =
    normalizeStatus(value);

  if (
    [
      "PAID",
      "SUCCESS",
      "COMPLETED",
      "ACCEPTED",
      "APPROVED",
    ].includes(normalized)
  ) {
    return "success";
  }

  if (
    [
      "FAILED",
      "CANCELLED",
      "CANCELED",
      "REJECTED",
      "EXPIRED",
    ].includes(normalized)
  ) {
    return "danger";
  }

  if (
    [
      "PENDING",
      "WAITING_DEPOSIT",
      "DEPOSIT_PENDING",
      "PENDING_DEPOSIT",
      "WAITING_PAYMENT",
      "PENDING_PAYMENT",
      "PAYMENT_PENDING",
    ].includes(normalized)
  ) {
    return "pending";
  }

  return "processing";
};

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(number);
};

const normalizeUtcTime = (value) => {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return null;
  }

  if (
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(
      text
    )
  ) {
    return text;
  }

  return `${text}Z`;
};

const formatDateTime = (value) => {
  const normalized =
    normalizeUtcTime(value);

  if (!normalized) {
    return "-";
  }

  const date =
    new Date(normalized);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(date);
};

const getApiErrorMessage = (
  error,
  fallbackMessage
) => {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData === "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.title ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const isCanceledRequest = (error) => {
  return (
    axios.isCancel(error) ||
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const copyTextToClipboard = async (
  value
) => {
  const text =
    String(value ?? "").trim();

  if (!text) {
    throw new Error(
      "Không có nội dung để sao chép."
    );
  }

  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(
      text
    );

    return;
  }

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value = text;
  textarea.setAttribute(
    "readonly",
    ""
  );
  textarea.style.position =
    "fixed";
  textarea.style.top =
    "-9999px";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  const copied =
    document.execCommand(
      "copy"
    );

  document.body.removeChild(
    textarea
  );

  if (!copied) {
    throw new Error(
      "Không thể sao chép."
    );
  }
};

/* =========================================================
   SUMMARY CARD
   ========================================================= */

const PaymentSummaryCard = ({
  icon,
  label,
  value,
  helper,
  variant = "",
}) => {
  return (
    <article
      className={[
        "payment-summary-card",
        variant &&
          `payment-summary-card--${variant}`,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="payment-summary-card__icon">
        {icon}
      </div>

      <div className="payment-summary-card__content">
        <span>{label}</span>

        <strong>{value}</strong>

        {helper && (
          <small>{helper}</small>
        )}
      </div>
    </article>
  );
};

/* =========================================================
   COMPONENT
   ========================================================= */

const OrderPaymentHistory = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const [
    paymentData,
    setPaymentData,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    copiedValue,
    setCopiedValue,
  ] = useState("");

  const copyTimerRef =
    useRef(null);

  const fetchPaymentHistory =
    useCallback(
      async (
        signal,
        {
          showSuccess = false,
        } = {}
      ) => {
        if (!orderId) {
          const message =
            "Không tìm thấy mã đơn hàng.";

          setErrorMessage(message);
          setPaymentData(null);
          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const result =
            await getOrderPaymentHistoryApi(
              orderId,
              {
                signal,
              }
            );

          if (
            !result ||
            typeof result !==
              "object"
          ) {
            throw new Error(
              "API không trả về dữ liệu lịch sử thanh toán."
            );
          }

          setPaymentData(result);

          if (showSuccess) {
            AuthNotify.success(
              "Làm mới thành công",
              "Lịch sử thanh toán đã được cập nhật."
            );
          }
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return;
          }

          const apiMessage =
            getApiErrorMessage(
              error,
              "Không thể tải lịch sử thanh toán."
            );

          setErrorMessage(
            apiMessage
          );

          setPaymentData(null);

          AuthNotify.error(
            "Không tải được lịch sử thanh toán",
            apiMessage
          );
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [orderId]
    );

  useEffect(() => {
    const controller =
      new AbortController();

    fetchPaymentHistory(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [fetchPaymentHistory]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }
    },
    []
  );

  const handleReload = () => {
    const controller =
      new AbortController();

    fetchPaymentHistory(
      controller.signal,
      {
        showSuccess: true,
      }
    );
  };

  const handleCopy = async (
    value,
    successMessage
  ) => {
    try {
      await copyTextToClipboard(
        value
      );

      setCopiedValue(
        String(value)
      );

      AuthNotify.success(
        "Sao chép thành công",
        successMessage
      );

      if (copyTimerRef.current) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }

      copyTimerRef.current =
        window.setTimeout(() => {
          setCopiedValue("");
        }, 1800);
    } catch (error) {
      AuthNotify.error(
        "Sao chép thất bại",
        error?.message ||
          "Không thể sao chép nội dung."
      );
    }
  };

  const payments = useMemo(
    () =>
      Array.isArray(
        paymentData?.payments
      )
        ? paymentData.payments
        : [],
    [paymentData]
  );

  const totalBillAmount =
    Number(
      paymentData?.totalBillAmount
    ) || 0;

  const totalPaid =
    Number(
      paymentData?.totalPaid
    ) || 0;

  const remaining =
    Number(
      paymentData?.remaining
    ) || 0;

  const paymentPercent =
    totalBillAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              totalPaid /
              totalBillAmount
            ) * 100
          )
        )
      : 0;

  if (loading) {
    return (
      <div className="payment-history-page">
        <div className="payment-history-loading">
          <CircularProgress
            size={42}
          />

          <div>
            <strong>
              Đang tải lịch sử thanh toán
            </strong>

            <span>
              Vui lòng chờ trong giây lát...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="payment-history-page">
        <div className="payment-history-error">
          <ErrorOutlineRoundedIcon />

          <h2>
            Không thể tải lịch sử thanh toán
          </h2>

          <p>
            {errorMessage ||
              "Không tìm thấy dữ liệu thanh toán của đơn hàng."}
          </p>

          <div className="payment-history-error__actions">
            <Button
              variant="outlined"
              color="inherit"
              startIcon={
                <ArrowBackRoundedIcon />
              }
              onClick={() =>
                navigate(-1)
              }
            >
              Quay lại
            </Button>

            <Button
              variant="contained"
              startIcon={
                <AutorenewRoundedIcon />
              }
              onClick={
                handleReload
              }
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const orderStatus =
    normalizeStatus(
      paymentData.orderStatus
    );

  const quotation =
    paymentData.quotation || {};

  const customer =
    paymentData.customer || {};

  return (
    <div className="payment-history-page">
      <div className="payment-history-navigation">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={
            <ArrowBackRoundedIcon />
          }
          onClick={() =>
            navigate(-1)
          }
        >
          Quay lại
        </Button>

        <span>
          Thanh toán / Lịch sử giao dịch
        </span>

        <Button
          variant="text"
          startIcon={
            <AutorenewRoundedIcon />
          }
          onClick={
            handleReload
          }
        >
          Làm mới
        </Button>
      </div>

      <section className="payment-history-hero">
        <div className="payment-history-hero__main">
          <div className="payment-history-hero__icon">
            <AccountBalanceWalletRoundedIcon />
          </div>

          <div className="payment-history-hero__content">
            <span className="payment-history-eyebrow">
              MÃ VẬN ĐƠN
            </span>

            <div className="payment-history-code-row">
              <h1>
                {paymentData.consignmentCode ||
                  "Chưa có mã vận đơn"}
              </h1>

              {paymentData.consignmentCode && (
                <Tooltip
                  title="Sao chép mã vận đơn"
                >
                  <button
                    type="button"
                    className={[
                      "payment-copy-button",
                      copiedValue ===
                        paymentData.consignmentCode &&
                        "is-copied",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      handleCopy(
                        paymentData.consignmentCode,
                        "Đã sao chép mã vận đơn."
                      )
                    }
                  >
                    {copiedValue ===
                    paymentData.consignmentCode ? (
                      <CheckRoundedIcon />
                    ) : (
                      <ContentCopyRoundedIcon />
                    )}
                  </button>
                </Tooltip>
              )}
            </div>

            <div className="payment-history-hero__meta">
              <span>
                Mã đơn:
                <strong>
                  {paymentData.orderId ||
                    "-"}
                </strong>
              </span>

              <Tag
                className={`payment-status-tag payment-status-tag--${getStatusClassName(
                  orderStatus
                )}`}
              >
                {ORDER_STATUS_LABELS[
                  orderStatus
                ] ||
                  formatStatusCode(
                    orderStatus
                  )}
              </Tag>
            </div>
          </div>
        </div>

        <div className="payment-history-hero__amount">
          <span>
            Số tiền còn lại
          </span>

          <strong>
            {formatMoney(
              remaining
            )}
          </strong>

          <small>
            Tổng hóa đơn{" "}
            {formatMoney(
              totalBillAmount
            )}
          </small>
        </div>
      </section>

      <section className="payment-summary-grid">
        <PaymentSummaryCard
          icon={
            <ReceiptLongRoundedIcon />
          }
          label="Tổng hóa đơn"
          value={formatMoney(
            totalBillAmount
          )}
          helper="Tổng số tiền cần thanh toán"
        />

        <PaymentSummaryCard
          icon={
            <PaymentsRoundedIcon />
          }
          label="Đã thanh toán"
          value={formatMoney(
            totalPaid
          )}
          helper={`${paymentPercent.toFixed(
            1
          )}% tổng hóa đơn`}
          variant="success"
        />

        <PaymentSummaryCard
          icon={
            <AccountBalanceWalletRoundedIcon />
          }
          label="Còn lại"
          value={formatMoney(
            remaining
          )}
          helper={
            remaining > 0
              ? "Chưa hoàn tất thanh toán"
              : "Đã thanh toán đầy đủ"
          }
          variant={
            remaining > 0
              ? "warning"
              : "success"
          }
        />
      </section>

      <section className="payment-progress-card">
        <div className="payment-progress-card__header">
          <div>
            <span>
              Tiến độ thanh toán
            </span>

            <strong>
              {formatMoney(
                totalPaid
              )}{" "}
              /{" "}
              {formatMoney(
                totalBillAmount
              )}
            </strong>
          </div>

          <b>
            {paymentPercent.toFixed(
              1
            )}
            %
          </b>
        </div>

        <div className="payment-progress-track">
          <div
            className="payment-progress-value"
            style={{
              width: `${paymentPercent}%`,
            }}
          />
        </div>
      </section>

      <div className="payment-information-grid">
        <section className="payment-section-card">
          <div className="payment-section-header">
            <div className="payment-section-header__icon customer">
              <PersonRoundedIcon />
            </div>

            <div>
              <h2>
                Thông tin khách hàng
              </h2>

              <p>
                Người thực hiện thanh toán
              </p>
            </div>
          </div>

          <Descriptions
            bordered
            column={1}
            size="middle"
            className="payment-descriptions"
          >
            <Descriptions.Item label="Họ và tên">
              {customer.fullName ||
                "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Mã khách hàng">
              {customer.customerCode ||
                "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Email">
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                >
                  {customer.email}
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                >
                  {customer.phone}
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section className="payment-section-card">
          <div className="payment-section-header">
            <div className="payment-section-header__icon quotation">
              <ReceiptLongRoundedIcon />
            </div>

            <div>
              <h2>
                Thông tin báo giá
              </h2>

              <p>
                Báo giá gắn với đơn hàng
              </p>
            </div>
          </div>

          <Descriptions
            bordered
            column={1}
            size="middle"
            className="payment-descriptions"
          >
            <Descriptions.Item label="Mã báo giá">
              {quotation.quotationId ||
                "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Loại báo giá">
              <Tag color="blue">
                {QUOTE_TYPE_LABELS[
                  normalizeStatus(
                    quotation.quoteType
                  )
                ] ||
                  formatStatusCode(
                    quotation.quoteType
                  )}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <Tag
                color={
                  normalizeStatus(
                    quotation.status
                  ) === "ACCEPTED"
                    ? "green"
                    : "gold"
                }
              >
                {QUOTATION_STATUS_LABELS[
                  normalizeStatus(
                    quotation.status
                  )
                ] ||
                  formatStatusCode(
                    quotation.status
                  )}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Tổng báo giá">
              <strong className="payment-money-value">
                {formatMoney(
                  quotation.totalAmount
                )}
              </strong>
            </Descriptions.Item>
          </Descriptions>
        </section>
      </div>

      <section className="payment-section-card payment-transactions-section">
        <div className="payment-section-header">
          <div className="payment-section-header__icon transaction">
            <PaymentsRoundedIcon />
          </div>

          <div>
            <h2>
              Lịch sử giao dịch
            </h2>

            <p>
              Có {payments.length} giao dịch thanh toán
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="payment-empty-state">
            <PaymentsRoundedIcon />

            <strong>
              Chưa có giao dịch
            </strong>

            <span>
              Đơn hàng chưa phát sinh giao dịch thanh toán.
            </span>
          </div>
        ) : (
          <div className="payment-transaction-list">
            {payments.map(
              (payment, index) => {
                const paymentStatus =
                  normalizeStatus(
                    payment.status
                  );

                const canContinuePayment =
                  Boolean(
                    payment.checkoutUrl
                  ) &&
                  [
                    "PENDING",
                    "PROCESSING",
                  ].includes(
                    paymentStatus
                  );

                return (
                  <article
                    key={
                      payment.paymentId ||
                      `${payment.orderCode}-${index}`
                    }
                    className="payment-transaction-card"
                  >
                    <div className="payment-transaction-card__top">
                      <div>
                        <span className="payment-transaction-number">
                          GIAO DỊCH #{index + 1}
                        </span>

                        <h3>
                          {INSTALLMENT_TYPE_LABELS[
                            normalizeStatus(
                              payment.installmentType
                            )
                          ] ||
                            formatStatusCode(
                              payment.installmentType
                            )}
                        </h3>
                      </div>

                      <strong className="payment-transaction-amount">
                        {formatMoney(
                          payment.amount
                        )}
                      </strong>
                    </div>

                    <div className="payment-transaction-tags">
                      <Tag
                        className={`payment-status-tag payment-status-tag--${getStatusClassName(
                          paymentStatus
                        )}`}
                      >
                        {PAYMENT_STATUS_LABELS[
                          paymentStatus
                        ] ||
                          formatStatusCode(
                            paymentStatus
                          )}
                      </Tag>

                      <Tag color="blue">
                        {PAYMENT_METHOD_LABELS[
                          normalizeStatus(
                            payment.paymentMethod
                          )
                        ] ||
                          payment.paymentMethod ||
                          "-"}
                      </Tag>
                    </div>

                    <div className="payment-transaction-details">
                      <div>
                        <span>
                          Mã đơn PayOS
                        </span>

                        <strong>
                          {payment.orderCode ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Mã giao dịch
                        </span>

                        <strong>
                          {payment.transactionCode ||
                            "Chưa có"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Thời gian tạo
                        </span>

                        <strong>
                          {formatDateTime(
                            payment.createdAt
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Thời gian thanh toán
                        </span>

                        <strong>
                          {payment.paidAt
                            ? formatDateTime(
                                payment.paidAt
                              )
                            : "Chưa thanh toán"}
                        </strong>
                      </div>
                    </div>

                    {payment.failureReason && (
                      <div className="payment-failure-reason">
                        <ErrorOutlineRoundedIcon />

                        <span>
                          {payment.failureReason}
                        </span>
                      </div>
                    )}

                    <div className="payment-transaction-actions">
                      <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={
                          copiedValue ===
                          String(
                            payment.orderCode
                          ) ? (
                            <CheckRoundedIcon />
                          ) : (
                            <ContentCopyRoundedIcon />
                          )
                        }
                        onClick={() =>
                          handleCopy(
                            payment.orderCode,
                            "Đã sao chép mã đơn PayOS."
                          )
                        }
                      >
                        Sao chép mã
                      </Button>

                      {canContinuePayment && (
                        <Button
                          variant="contained"
                          endIcon={
                            <OpenInNewRoundedIcon />
                          }
                          onClick={() =>
                            window.location.assign(
                              payment.checkoutUrl
                            )
                          }
                        >
                          Tiếp tục thanh toán
                        </Button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="payment-history-note">
        <ScheduleRoundedIcon />

        <div>
          <strong>
            Trạng thái thanh toán được cập nhật từ hệ thống PayOS
          </strong>

          <span>
            Nhấn “Làm mới” sau khi hoàn tất thanh toán để cập nhật dữ liệu mới nhất.
          </span>
        </div>
      </section>
    </div>
  );
};

export default OrderPaymentHistory;
