import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Alert,
  Breadcrumb,
  Button as AntButton,
  Card,
  Empty,
  Skeleton,
  Table,
  Tag,
} from "antd";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import HistoryIcon from "@mui/icons-material/History";
import LaunchIcon from "@mui/icons-material/Launch";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import { Button as MuiButton } from "@mui/material";

import AuthNotify from "../../../../../utils/AuthNotify";
import { getPurchaseRequestPaymentHistoryApi } from "../../../../../api/PurchaseAPI/purchaseRequestApi";
import { formatVietnamDateTime } from "../../../../../utils/timeUtc";

import "./BuyOrderPaymentHistory.css";

/* =========================================================
   HELPER FORMATTERS
   ========================================================= */

const formatVndCurrency = (amount) => {
  const number = Number(amount || 0);
  return `${number.toLocaleString("vi-VN")} đ`;
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return "-";
  return formatVietnamDateTime(dateString, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatPaymentType = (type) => {
  const normalized = String(type || "").toUpperCase();
  switch (normalized) {
    case "FULL_PAYMENT":
    case "FULL":
      return "Thanh toán toàn bộ (100%)";
    case "DEPOSIT":
      return "Đặt cọc (70%)";
    case "REMAINING":
    case "REST":
      return "Thanh toán còn lại (30%)";
    default:
      return type || "Thanh toán đơn hàng";
  }
};

const formatPaymentMethod = (method) => {
  const normalized = String(method || "").toUpperCase();
  switch (normalized) {
    case "PAYOS":
      return "Cổng thanh toán PayOS";
    case "VNPAY":
      return "Cổng VNPAY";
    case "BANK_TRANSFER":
      return "Chuyển khoản ngân hàng";
    case "WALLET":
      return "Ví dư tài khoản";
    default:
      return method || "Thanh toán trực tuyến";
  }
};

const renderPaymentStatusTag = (status) => {
  const normalized = String(status || "").toUpperCase();
  switch (normalized) {
    case "PAID":
    case "SUCCESS":
    case "COMPLETED":
    case "SUCCEEDED":
      return (
        <Tag color="success" className="boph-status-tag">
          Thành công
        </Tag>
      );
    case "PENDING":
    case "WAITING":
    case "PROCESSING":
      return (
        <Tag color="warning" className="boph-status-tag">
          Chờ thanh toán
        </Tag>
      );
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
    case "CANCELED":
      return (
        <Tag color="error" className="boph-status-tag">
          Thất bại / Hủy
        </Tag>
      );
    default:
      return (
        <Tag color="default" className="boph-status-tag">
          {status || "Chưa xác định"}
        </Tag>
      );
  }
};

const renderRequestStatusTag = (status) => {
  const normalized = String(status || "").toUpperCase();
  switch (normalized) {
    case "QUOTED":
    case "WAITING_PAYMENT":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return (
        <Tag color="gold" className="boph-header-status-pill">
          Chờ thanh toán / Đã báo giá
        </Tag>
      );
    case "ACCEPTED":
    case "PAID":
    case "CONFIRMED":
    case "APPROVED":
      return (
        <Tag color="green" className="boph-header-status-pill">
          Đã xác nhận / Đã thanh toán
        </Tag>
      );
    case "PENDING_REVIEW":
    case "PENDING":
      return (
        <Tag color="blue" className="boph-header-status-pill">
          Chờ duyệt báo giá
        </Tag>
      );
    case "REJECTED":
    case "CANCELLED":
      return (
        <Tag color="red" className="boph-header-status-pill">
          Đã từ chối / Hủy
        </Tag>
      );
    default:
      return (
        <Tag color="default" className="boph-header-status-pill">
          {status || "Đang xử lý"}
        </Tag>
      );
  }
};

const writeTextToClipboard = async (text) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Không thể sao chép");
};

/* =========================================================
   MAIN COMPONENT: BuyOrderPaymentHistory
   ========================================================= */

const BuyOrderPaymentHistory = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [copiedCode, setCopiedCode] = useState("");
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const fetchHistory = useCallback(
    async (signal, { showNotify = false } = {}) => {
      if (!requestId) {
        setErrorMessage("Không tìm thấy mã yêu cầu mua hộ (requestId).");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await getPurchaseRequestPaymentHistoryApi(requestId, {
          signal,
        });

        const historyObj = response?.data || response;
        if (!historyObj || typeof historyObj !== "object") {
          throw new Error("Không nhận được dữ liệu lịch sử thanh toán.");
        }

        setData(historyObj);

        if (showNotify) {
          AuthNotify.success(
            "Cập nhật thành công",
            "Lịch sử thanh toán đã được làm mới."
          );
        }
      } catch (error) {
        if (
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError" ||
          error?.name === "AbortError"
        ) {
          return;
        }

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Không thể lấy lịch sử thanh toán mua hộ.";

        setErrorMessage(message);
        AuthNotify.error("Lỗi tải lịch sử thanh toán", message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [requestId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchHistory]);

  const handleCopy = async (val, label = "mã") => {
    if (!val) return;
    try {
      await writeTextToClipboard(String(val));
      setCopiedCode(String(val));
      AuthNotify.success("Đã sao chép", `${label}: ${val}`);

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCode("");
      }, 1800);
    } catch {
      AuthNotify.error("Sao chép thất bại", "Vui lòng chọn sao chép thủ công.");
    }
  };

  const handleRefresh = () => {
    const controller = new AbortController();
    fetchHistory(controller.signal, { showNotify: true });
  };

  // Find latest pending payment link if any
  const pendingPayment = useMemo(() => {
    if (!Array.isArray(data?.payments)) return null;
    return data.payments.find(
      (p) =>
        String(p?.status).toUpperCase() === "PENDING" && Boolean(p?.checkoutUrl)
    );
  }, [data]);

  /* Table Columns */
  const columns = [
    {
      title: "Mã giao dịch / Order Code",
      dataIndex: "orderCode",
      key: "orderCode",
      render: (orderCode, record) => {
        const isCopied = copiedCode === String(orderCode);
        return (
          <div className="boph-code-col">
            <strong className="boph-order-code">
              {orderCode || record.paymentId || "-"}
            </strong>
            {orderCode && (
              <button
                type="button"
                className={`boph-copy-btn ${isCopied ? "is-copied" : ""}`}
                onClick={() => handleCopy(orderCode, "Mã giao dịch")}
              >
                {isCopied ? (
                  <CheckCircleOutlinedIcon fontSize="inherit" />
                ) : (
                  <ContentCopyIcon fontSize="inherit" />
                )}
                <span>{isCopied ? "Đã chép" : "Sao chép"}</span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      title: "Loại thanh toán",
      dataIndex: "paymentType",
      key: "paymentType",
      render: (type) => (
        <span className="boph-type-text">{formatPaymentType(type)}</span>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method) => (
        <span className="boph-method-text">{formatPaymentMethod(method)}</span>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (amount) => (
        <strong className="boph-amount-text">
          {formatVndCurrency(amount)}
        </strong>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => renderPaymentStatusTag(status),
    },
    {
      title: "Thời gian tạo / Thanh toán",
      key: "timestamps",
      render: (_, record) => (
        <div className="boph-time-col">
          <span>Tạo: {formatDateDisplay(record.createdAt)}</span>
          {record.paidAt && (
            <small>TT: {formatDateDisplay(record.paidAt)}</small>
          )}
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      render: (_, record) => {
        const isPending =
          String(record.status).toUpperCase() === "PENDING" &&
          Boolean(record.checkoutUrl);

        if (isPending) {
          return (
            <a
              href={record.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="boph-pay-now-btn"
            >
              <CreditCardIcon fontSize="small" />
              <span>Thanh toán ngay</span>
              <LaunchIcon fontSize="inherit" />
            </a>
          );
        }

        return <span className="boph-muted-text">-</span>;
      },
    },
  ];

  return (
    <div className="buy-order-payment-history-page">
      {/* Breadcrumb Navigation */}
      <nav className="boph-breadcrumb-container">
        <Breadcrumb
          items={[
            {
              title: (
                <span
                  className="boph-breadcrumb-link"
                  onClick={() => navigate("/history/buy-on-behalf")}
                >
                  Lịch Sử Mua Hộ
                </span>
              ),
            },
            {
              title: (
                <span
                  className="boph-breadcrumb-link"
                  onClick={() =>
                    navigate(`/check-orders/buy-on-behalf/${requestId}`)
                  }
                >
                  Chi tiết báo giá
                </span>
              ),
            },
            {
              title: "Lịch sử thanh toán",
            },
          ]}
        />
      </nav>

      {/* Header Banner */}
      <header className="boph-header-card">
        <div className="boph-header-left">
          <button
            type="button"
            className="boph-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowBackIcon />
          </button>

          <div className="boph-header-titles">
            <div className="boph-eyebrow">
              <HistoryIcon fontSize="inherit" />
              <span>LỊCH SỬ GIAO DỊCH MUA HỘ</span>
            </div>
            <h1>Lịch Sử Thanh Toán Mua Hộ</h1>
            <p>
              Mã yêu cầu:{" "}
              <strong>{data?.purchaseCode || requestId || "..."}</strong>
            </p>
          </div>
        </div>

        <div className="boph-header-right">
          {data?.requestStatus && renderRequestStatusTag(data.requestStatus)}

          <MuiButton
            variant="outlined"
            startIcon={<AutorenewIcon />}
            onClick={handleRefresh}
            disabled={loading}
            className="boph-refresh-btn"
          >
            Làm mới
          </MuiButton>

          {pendingPayment && (
            <a
              href={pendingPayment.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="boph-header-pay-btn"
            >
              <CreditCardIcon />
              <span>Thanh toán ngay (PayOS)</span>
            </a>
          )}
        </div>
      </header>

      {/* Error Alert if any */}
      {errorMessage && (
        <Alert
          type="error"
          message="Không thể lấy lịch sử thanh toán"
          description={errorMessage}
          showIcon
          className="boph-error-alert"
          action={
            <AntButton size="small" type="primary" onClick={handleRefresh}>
              Thử lại
            </AntButton>
          }
        />
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <Card className="boph-loading-card">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <section className="boph-metrics-grid">
            <div className="boph-metric-card total">
              <div className="boph-metric-icon">
                <ReceiptLongIcon />
              </div>
              <div className="boph-metric-info">
                <span>TỔNG TIỀN BÁO GIÁ</span>
                <strong>{formatVndCurrency(data?.totalBillAmount)}</strong>
              </div>
            </div>

            <div className="boph-metric-card paid">
              <div className="boph-metric-icon">
                <CheckCircleOutlinedIcon />
              </div>
              <div className="boph-metric-info">
                <span>ĐÃ THANH TOÁN</span>
                <strong>{formatVndCurrency(data?.totalPaid)}</strong>
              </div>
            </div>

            <div className="boph-metric-card outstanding">
              <div className="boph-metric-icon">
                <PaymentIcon />
              </div>
              <div className="boph-metric-info">
                <span>CÒN CẦN THANH TOÁN</span>
                <strong>{formatVndCurrency(data?.outstanding)}</strong>
              </div>
            </div>
          </section>

          {/* Payments Table Card */}
          <Card
            title={
              <div className="boph-table-card-header">
                <span>Danh Sách Lịch Sử Giao Dịch ({data?.payments?.length || 0})</span>
              </div>
            }
            className="boph-table-card"
          >
            {Array.isArray(data?.payments) && data.payments.length > 0 ? (
              <Table
                dataSource={data.payments.map((p, idx) => ({
                  ...p,
                  key: p.paymentId || idx,
                }))}
                columns={columns}
                pagination={false}
                className="boph-table"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có giao dịch thanh toán nào được ghi nhận."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default BuyOrderPaymentHistory;
