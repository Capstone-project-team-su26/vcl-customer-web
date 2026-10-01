import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "@shared/api/requestCancel";
import {
  useNavigate,
  useParams,
  useSearchParams,
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
} from "@features/payment/api/orderPaymentApi";
import { openCheckout } from "@features/payment/utils/openCheckout";
import {
  PAYMENT_SUBJECTS,
  PAYMENT_TRANSACTION_QUERY_KEY,
  purposeFromInstallmentType,
} from "@features/payment/utils/pendingPaymentReturn";

import {
  ORDER_STATUS_LABELS as SHARED_ORDER_STATUS_LABELS,
  normalizeOrderStatus,
} from "@features/consignment";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import {
  INSTALLMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
  QUOTE_TYPE_LABELS,
  labelOf,
} from "@shared/utils/statusLabel";
import { usePagedRows } from "@shared/hooks/usePagination";
import ListPagination from "@shared/components/ListPagination/ListPagination";

import ReceivingNoteCard from "@features/receiving/components/ReceivingNoteCard/ReceivingNoteCard";
import DeliveryTrackingCard from "@features/delivery/components/DeliveryTrackingCard/DeliveryTrackingCard";
import "./OrderPaymentHistory.css";

/* =========================================================
   STATUS LABELS
   ========================================================= */

/*
 * Nhãn trạng thái đơn ký gửi: dùng thẳng module trạng thái dùng chung
 * (19 mã đích). orderStatus được chuẩn hóa bằng normalizeOrderStatus trước.
 */
const ORDER_STATUS_LABELS = SHARED_ORDER_STATUS_LABELS;

/* Báo giá, loại báo giá, khoản thanh toán, loại khoản, phương thức: MỘT bảng dùng chung
   (shared/utils/statusLabel.js) — cùng câu với các màn khác và web quản trị. */

const PAYMENT_FAILURE_LABELS = {
  PAYMENT_FAILED: "Giao dịch thanh toán không thành công.",
  TRANSACTION_FAILED: "Giao dịch không thành công.",
  TRANSACTION_NOT_FOUND: "Không tìm thấy giao dịch ngân hàng phù hợp.",
  AMOUNT_MISMATCH: "Số tiền chuyển khoản chưa khớp với yêu cầu.",
  INSUFFICIENT_AMOUNT: "Số tiền thanh toán chưa đủ.",
  EXPIRED: "Giao dịch đã hết thời gian thanh toán.",
  CANCELLED: "Giao dịch đã bị hủy.",
  CANCELED: "Giao dịch đã bị hủy.",
};

const getPaymentFailureMessage = (value) => {
  const normalized = normalizeStatus(value);

  return (
    PAYMENT_FAILURE_LABELS[normalized] ||
    "Giao dịch chưa được hoàn tất. Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ."
  );
};

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeStatus = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

/* Mã → nhãn tiếng Việt; mã lạ ra nhãn chung (không bao giờ in mã thô). */
const getVietnameseLabel = (
  labels,
  value,
  fallback = "Đang cập nhật"
) => {
  const key = normalizeStatus(value);
  return key ? labelOf(labels, key, { generic: fallback }) : fallback;
};

const getStatusClassName = (value) => {
  const normalized = normalizeStatus(value);

  if (
    [
      "DEPOSIT_PAID",
      "PARTIALLY_PAID",
    ].includes(normalized)
  ) {
    return "partial";
  }

  if (
    [
      "PAID",
      "FULLY_PAID",
      "SUCCESS",
      "COMPLETED",
      "ACCEPTED",
      "APPROVED",
      "DELIVERED",
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
      "PAYMENT_PENDING",
      "PENDING_REVIEW",
      "NEED_MORE_INFO",
      "QUOTATION_SENT",
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

/**
 * `embedded`: trang đang nằm trong tab "Thanh toán" của /orders/:orderId, nên bỏ thanh
 * "Quay lại / Làm mới" — khung trang chi tiết đơn đã có nút tải lại chung.
 * `paymentOwner` (tuỳ chọn): { orderType, purchaseRequestId, code } của đơn — ghi vào bản
 *   ghi thanh toán để khoản của đơn kho mua hộ (PUR-…-n) trả về phần Mua hộ của Lịch sử giao
 *   dịch và "Xem đơn" kèm `?yc=` (xem pendingPaymentReturn.js).
 */
const OrderPaymentHistory = ({ embedded = false, paymentOwner }) => {
  const navigate = useNavigate();
  const { orderId } = useParams();

  /* "Xem đơn" từ Lịch sử giao dịch gắn ?giao-dich={orderCode}: tô và cuộn tới đúng
     giao dịch vừa trả. */
  const [searchParams] = useSearchParams();
  const highlightOrderCode = String(
    searchParams.get(PAYMENT_TRANSACTION_QUERY_KEY) || "",
  ).trim();

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

  /* Giao dịch của một đơn: API trả hết một lượt → cắt trang phía client (≤ 10 thì ẩn thanh). */
  const pagedPayments = usePagedRows(payments);
  const { page: paymentPage, pageSize: paymentPageSize, onChange: changePaymentPage } =
    pagedPayments;

  /* Cuộn tới giao dịch được chỉ định trên URL, một lần khi danh sách đã có nó
     (nằm ở trang khác thì chuyển tới trang đó trước). */
  const scrolledOrderCodeRef = useRef("");

  useEffect(() => {
    const highlightIndex = highlightOrderCode
      ? payments.findIndex(
          (payment) =>
            String(payment.orderCode) === highlightOrderCode
        )
      : -1;

    if (
      highlightIndex === -1 ||
      scrolledOrderCodeRef.current === highlightOrderCode
    ) {
      return;
    }

    const targetPage =
      Math.floor(highlightIndex / paymentPageSize) + 1;

    if (targetPage !== paymentPage) {
      changePaymentPage(targetPage, paymentPageSize);
      return;
    }

    scrolledOrderCodeRef.current = highlightOrderCode;

    const card = document.querySelector(
      `.payment-transaction-card[data-order-code="${CSS.escape(
        highlightOrderCode
      )}"]`
    );

    card?.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
  }, [
    highlightOrderCode,
    payments,
    paymentPage,
    paymentPageSize,
    changePaymentPage,
  ]);

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
            {!embedded && (
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
            )}

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
    normalizeOrderStatus(
      normalizeStatus(
        paymentData.orderStatus
      )
    ) || "";

  const quotation =
    paymentData.quotation || {};

  const customer =
    paymentData.customer || {};

  return (
    <div className="payment-history-page">
      {!embedded && (
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
            Lịch sử thanh toán
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
      )}

      <section className="payment-history-hero">
        <div className="payment-history-hero__main">
          <div className="payment-history-hero__icon">
            <AccountBalanceWalletRoundedIcon />
          </div>

          <div className="payment-history-hero__content">
            <span className="payment-history-eyebrow">
              LỊCH SỬ THANH TOÁN
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
              <span className="payment-history-hero__status-label">
                Trạng thái đơn hàng
              </span>

              <Tag
                className={`payment-status-tag payment-status-tag--${getStatusClassName(
                  orderStatus
                )}`}
              >
                {getVietnameseLabel(
                  ORDER_STATUS_LABELS,
                  orderStatus,
                  "Đang xử lý"
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
            <Descriptions.Item label="Loại báo giá">
              <Tag className="payment-type-tag">
                {getVietnameseLabel(
                  QUOTE_TYPE_LABELS,
                  quotation.quoteType,
                  "Báo giá"
                )}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái báo giá">
              <Tag
                className={`payment-status-tag payment-status-tag--${getStatusClassName(
                  quotation.status
                )}`}
              >
                {getVietnameseLabel(
                  QUOTATION_STATUS_LABELS,
                  quotation.status,
                  "Đang xử lý"
                )}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Tổng báo giá">
              <strong className="payment-money-value">
                {formatMoney(
                  quotation.totalAmount ??
                    quotation.totalEstimatedCost ??
                    totalBillAmount
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
          <>
            <div className="payment-transaction-list">
              {pagedPayments.items.map(
                (payment, index) => {
                  const paymentStatus =
                    normalizeStatus(
                      payment.status
                    );

                  /*
                   * Backend chuẩn hoá trạng thái về PENDING | SUCCESS | FAILED |
                   * CANCELED; chỉ khoản PENDING còn link cổng thanh toán mới
                   * tiếp tục trả tiền được (PENDING_RECONCILIATION chờ Admin).
                   */
                  const canContinuePayment =
                    Boolean(
                      payment.checkoutUrl
                    ) &&
                    paymentStatus === "PENDING";

                  return (
                    <article
                      key={
                        payment.paymentId ||
                        `${payment.orderCode}-${index}`
                      }
                      className={`payment-transaction-card payment-transaction-card--${getStatusClassName(
                        paymentStatus
                      )}${
                        highlightOrderCode &&
                        String(payment.orderCode) === highlightOrderCode
                          ? " is-just-paid"
                          : ""
                      }`}
                      data-order-code={payment.orderCode || undefined}
                    >
                      <div className="payment-transaction-card__top">
                        <div>
                          <span className="payment-transaction-number">
                            Giao dịch {index + 1}
                          </span>

                          <h3>
                            {getVietnameseLabel(
                              INSTALLMENT_TYPE_LABELS,
                              payment.installmentType,
                              "Thanh toán đơn hàng"
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
                          {getVietnameseLabel(
                            PAYMENT_STATUS_LABELS,
                            paymentStatus,
                            "Đang xác nhận"
                          )}
                        </Tag>

                        <Tag className="payment-method-tag">
                          {getVietnameseLabel(
                            PAYMENT_METHOD_LABELS,
                            payment.paymentMethod,
                            "Thanh toán trực tuyến"
                          )}
                        </Tag>
                      </div>

                      <div className="payment-transaction-details">
                        <div>
                          <span>
                            Thời gian tạo giao dịch
                          </span>

                          <strong>
                            {formatDateTime(
                              payment.createdAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Thời gian hoàn tất
                          </span>

                          <strong>
                            {payment.paidAt
                              ? formatDateTime(
                                  payment.paidAt
                                )
                              : "Chưa hoàn tất"}
                          </strong>
                        </div>
                      </div>

                      {payment.failureReason && (
                        <div className="payment-failure-reason">
                          <ErrorOutlineRoundedIcon />

                          <span>
                            {getPaymentFailureMessage(
                              payment.failureReason
                            )}
                          </span>
                        </div>
                      )}

                      {canContinuePayment && (
                        <div className="payment-transaction-actions">
                          <Button
                            variant="contained"
                            endIcon={
                              <OpenInNewRoundedIcon />
                            }
                            onClick={() => {
                              const opened = openCheckout(
                                payment.checkoutUrl,
                                {
                                  ...paymentOwner,
                                  subject: PAYMENT_SUBJECTS.order,
                                  targetId: orderId,
                                  purpose: purposeFromInstallmentType(
                                    payment.installmentType
                                  ),
                                  orderCode: payment.orderCode,
                                  code:
                                    paymentData?.consignmentCode ||
                                    paymentOwner?.code,
                                  amount: payment.amount,
                                }
                              );

                              if (!opened) {
                                AuthNotify.error(
                                  "Không mở được trang thanh toán",
                                  "Link thanh toán không hợp lệ."
                                );
                              }
                            }}
                          >
                            Tiếp tục thanh toán
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>

            <ListPagination
              {...pagedPayments.paginationProps}
              hideOnSinglePage
              unit="giao dịch"
              className="payment-transaction-pager"
              ariaLabel="Phân trang giao dịch của đơn"
            />
          </>
        )}
      </section>

      {/* Khách vừa thấy tiền đã vào là muốn biết ngay "kho nhận hàng chưa" — để phiếu tiếp nhận
          ngay dưới lịch sử giao dịch, khỏi phải quay ra màn chi tiết đơn tìm. Khối tự ẩn nếu
          đơn chưa có phiếu. Trong tab "Thanh toán" thì bỏ: phiếu kho nằm ở tab "Kiện & kho",
          chặng giao nằm ở tab "Hành trình". */}
      {!embedded && (
        <>
          <ReceivingNoteCard orderId={orderId} />
          <DeliveryTrackingCard orderId={orderId} />
        </>
      )}

      <section className="payment-history-note">
        <ScheduleRoundedIcon />

        <div>
          <strong>
            Trạng thái thanh toán được đồng bộ tự động
          </strong>

          <span>
            Sau khi chuyển khoản, hệ thống sẽ ghi nhận giao dịch. Bạn có thể nhấn “Làm mới” để kiểm tra ngay.
          </span>
        </div>
      </section>
    </div>
  );
};

export default OrderPaymentHistory;
