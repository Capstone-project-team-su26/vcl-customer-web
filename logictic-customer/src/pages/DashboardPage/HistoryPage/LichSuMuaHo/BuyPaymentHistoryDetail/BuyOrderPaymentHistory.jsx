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
  Descriptions,
  Empty,
  Modal,
  Progress,
  Skeleton,
  Table,
  Tag,
  Tooltip,
} from "antd";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import MiscellaneousServicesRoundedIcon from "@mui/icons-material/MiscellaneousServicesRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

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
  return `${Math.round(number).toLocaleString("vi-VN")} đ`;
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
      return "Thanh toán toàn bộ";
    case "DEPOSIT":
      return "Đặt cọc đơn hàng";
    case "REMAINING":
    case "REST":
      return "Thanh toán còn lại";
    default:
      return type || "Thanh toán đơn hàng";
  }
};

const formatPaymentMethod = (method) => {
  const normalized = String(method || "").toUpperCase();
  switch (normalized) {
    case "SEPAY":
      return "Cổng SePay (VietQR)";
    case "PAYOS":
      return "Cổng PayOS";
    case "VNPAY":
      return "Cổng VNPAY";
    case "BANK_TRANSFER":
      return "Chuyển khoản ngân hàng";
    case "WALLET":
      return "Ví số dư tài khoản";
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
        <Tag color="success" className="boph-status-tag boph-status-success">
          <CheckRoundedIcon style={{ fontSize: 13 }} /> Thành công
        </Tag>
      );
    case "PENDING":
    case "WAITING":
    case "PROCESSING":
      return (
        <Tag color="warning" className="boph-status-tag boph-status-pending">
          Chờ thanh toán
        </Tag>
      );
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
    case "CANCELED":
      return (
        <Tag color="error" className="boph-status-tag boph-status-error">
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
    case "PAID":
    case "COMPLETED":
    case "APPROVED":
    case "CONFIRMED":
    case "ACCEPTED":
      return (
        <Tag className="boph-header-status-pill boph-status-pill-paid">
          <VerifiedRoundedIcon style={{ fontSize: 14 }} /> Đã thanh toán
        </Tag>
      );
    case "DEPOSIT_PAID":
    case "PARTIALLY_PAID":
      return (
        <Tag className="boph-header-status-pill boph-status-pill-deposit">
          Đã đặt cọc
        </Tag>
      );
    case "QUOTED":
    case "WAITING_PAYMENT":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return (
        <Tag className="boph-header-status-pill boph-status-pill-waiting">
          Chờ thanh toán / Đã báo giá
        </Tag>
      );
    case "PENDING_REVIEW":
    case "PENDING":
      return (
        <Tag className="boph-header-status-pill boph-status-pill-review">
          Chờ duyệt báo giá
        </Tag>
      );
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return (
        <Tag className="boph-header-status-pill boph-status-pill-cancel">
          Đã từ chối / Hủy
        </Tag>
      );
    default:
      return (
        <Tag className="boph-header-status-pill">
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

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

        // Unwrap response data if wrapped in { message, data }
        let historyObj = response;
        if (
          historyObj?.data &&
          typeof historyObj.data === "object" &&
          (historyObj.data.purchaseRequestId ||
            historyObj.data.purchaseCode ||
            Array.isArray(historyObj.data.payments))
        ) {
          historyObj = historyObj.data;
        } else if (
          historyObj?.data &&
          typeof historyObj.data === "object" &&
          historyObj.message
        ) {
          historyObj = historyObj.data;
        }

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

  // Calculate percentage paid
  const paymentProgressPercent = useMemo(() => {
    const total = Number(data?.totalBillAmount || 0);
    const paid = Number(data?.totalPaid || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 1000) / 10);
  }, [data]);

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
      title: "Mã đơn hàng & Giao dịch",
      key: "orderCode",
      width: 290,
      render: (_, record) => {
        const orderCodeStr = record.orderCode ? String(record.orderCode) : "";
        const isOrderCopied = copiedCode === orderCodeStr;
        const transactionCodeStr = record.transactionCode
          ? String(record.transactionCode)
          : "";
        const isTxCopied = copiedCode === transactionCodeStr;

        return (
          <div className="boph-code-col">
            {/* Primary Order Code Card */}
            <div className="boph-code-box">
              <div className="boph-code-box-header">
                <span className="boph-code-tag">MÃ THANH TOÁN</span>
              </div>
              <div className="boph-code-box-body">
                <strong className="boph-order-code">
                  {orderCodeStr || record.paymentId || "-"}
                </strong>
                {orderCodeStr && (
                  <button
                    type="button"
                    className={`boph-copy-btn ${isOrderCopied ? "is-copied" : ""}`}
                    onClick={() => handleCopy(orderCodeStr, "Mã thanh toán")}
                    title="Sao chép mã thanh toán"
                  >
                    {isOrderCopied ? (
                      <CheckCircleRoundedIcon fontSize="inherit" />
                    ) : (
                      <ContentCopyRoundedIcon fontSize="inherit" />
                    )}
                    <span>{isOrderCopied ? "Đã chép" : "Sao chép"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bank Transaction Code Box */}
            {transactionCodeStr && (
              <div className="boph-code-box bank">
                <div className="boph-code-box-header">
                  <span className="boph-code-tag blue">MÃ GIAO DỊCH NGÂN HÀNG (REF NH)</span>
                </div>
                <div className="boph-code-box-body">
                  <span className="boph-tx-code">{transactionCodeStr}</span>
                  <button
                    type="button"
                    className={`boph-copy-btn sm ${isTxCopied ? "is-copied" : ""}`}
                    onClick={() =>
                      handleCopy(transactionCodeStr, "Mã giao dịch ngân hàng")
                    }
                    title="Sao chép mã tham chiếu ngân hàng"
                  >
                    {isTxCopied ? (
                      <CheckCircleRoundedIcon fontSize="inherit" />
                    ) : (
                      <ContentCopyRoundedIcon fontSize="inherit" />
                    )}
                    <span>{isTxCopied ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              </div>
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
        <span className="boph-type-badge">{formatPaymentType(type)}</span>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method) => (
        <span className="boph-method-chip">{formatPaymentMethod(method)}</span>
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
      title: "Thời gian",
      key: "timestamps",
      render: (_, record) => (
        <div className="boph-time-col">
          <div className="boph-time-row">
            <ScheduleRoundedIcon className="boph-time-icon" />
            <span>Tạo: {formatDateDisplay(record.createdAt)}</span>
          </div>
          {record.paidAt && (
            <div className="boph-time-row paid">
              <CheckCircleRoundedIcon className="boph-time-icon paid" />
              <span>TT: {formatDateDisplay(record.paidAt)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 200,
      render: (_, record) => {
        const isPending =
          String(record.status).toUpperCase() === "PENDING";
        const hasCheckoutUrl = Boolean(record.checkoutUrl);

        return (
          <div className="boph-actions-group">
            {isPending && hasCheckoutUrl && (
              <a
                href={record.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="boph-pay-now-btn"
              >
                <CreditCardRoundedIcon fontSize="small" />
                <span>Thanh toán</span>
                <LaunchRoundedIcon fontSize="inherit" />
              </a>
            )}

            {!isPending && hasCheckoutUrl && (
              <a
                href={record.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="boph-receipt-btn"
                title="Xem hóa đơn thanh toán SePay"
              >
                <LaunchRoundedIcon fontSize="small" />
                <span>Hóa đơn</span>
              </a>
            )}

            <button
              type="button"
              className="boph-detail-btn"
              onClick={() => {
                setSelectedPayment(record);
                setDetailModalOpen(true);
              }}
              title="Xem chi tiết giao dịch"
            >
              <VisibilityRoundedIcon fontSize="small" />
              <span>Chi tiết</span>
            </button>
          </div>
        );
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
            title="Quay lại"
          >
            <ArrowBackRoundedIcon />
          </button>

          <div className="boph-header-titles">
            <div className="boph-eyebrow">
              <HistoryRoundedIcon fontSize="inherit" />
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
            startIcon={<AutorenewRoundedIcon />}
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
              <CreditCardRoundedIcon />
              <span>
                Thanh toán ngay ({formatPaymentMethod(pendingPayment.paymentMethod)})
              </span>
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
          {/* Top Overview Grid & Progress */}
          <section className="boph-overview-section">
            <div className="boph-metrics-grid">
              <div className="boph-metric-card total">
                <div className="boph-metric-icon">
                  <ReceiptLongRoundedIcon />
                </div>
                <div className="boph-metric-info">
                  <span>TỔNG TIỀN BÁO GIÁ</span>
                  <strong>{formatVndCurrency(data?.totalBillAmount)}</strong>
                </div>
              </div>

              <div className="boph-metric-card paid">
                <div className="boph-metric-icon">
                  <CheckCircleRoundedIcon />
                </div>
                <div className="boph-metric-info">
                  <span>ĐÃ THANH TOÁN</span>
                  <strong>{formatVndCurrency(data?.totalPaid)}</strong>
                </div>
              </div>

              <div className="boph-metric-card outstanding">
                <div className="boph-metric-icon">
                  <PaymentsRoundedIcon />
                </div>
                <div className="boph-metric-info">
                  <span>CÒN CẦN THANH TOÁN</span>
                  <strong>{formatVndCurrency(data?.outstanding)}</strong>
                </div>
              </div>
            </div>

            {/* Payment Completion Progress Bar */}
            {data?.totalBillAmount > 0 && (
              <div className="boph-progress-card">
                <div className="boph-progress-header">
                  <span className="boph-progress-title">
                    Tiến độ thanh toán đơn hàng
                  </span>
                  <span className="boph-progress-percent">
                    <strong>{paymentProgressPercent}%</strong> hoàn tất
                  </span>
                </div>
                <Progress
                  percent={paymentProgressPercent}
                  showInfo={false}
                  strokeColor={{
                    "0%": "#f97316",
                    "100%": "#10b981",
                  }}
                  trailColor="#e2e8f0"
                  strokeWidth={10}
                  className="boph-progress-bar"
                />
              </div>
            )}
          </section>

          {/* Breakdown / Subtotal Details Card */}
          {(data?.productsSubtotal !== undefined ||
            data?.servicesSubtotal !== undefined ||
            data?.depositAmount !== undefined) && (
            <Card className="boph-breakdown-card">
              <div className="boph-breakdown-header">
                <InfoRoundedIcon className="boph-breakdown-icon" />
                <span>Chi tiết cấu thành báo giá & Tiền cọc</span>
              </div>

              <div className="boph-breakdown-grid">
                {data?.productsSubtotal !== undefined && (
                  <div className="boph-breakdown-item">
                    <div className="boph-breakdown-item-label">
                      <ShoppingBagRoundedIcon fontSize="small" />
                      <span>Tiền hàng sản phẩm</span>
                    </div>
                    <strong>{formatVndCurrency(data.productsSubtotal)}</strong>
                  </div>
                )}

                {data?.servicesSubtotal !== undefined && (
                  <div className="boph-breakdown-item">
                    <div className="boph-breakdown-item-label">
                      <MiscellaneousServicesRoundedIcon fontSize="small" />
                      <span>Phí dịch vụ & Vận chuyển</span>
                    </div>
                    <strong>{formatVndCurrency(data.servicesSubtotal)}</strong>
                  </div>
                )}

                {data?.depositAmount !== undefined && (
                  <div className="boph-breakdown-item deposit-highlight">
                    <div className="boph-breakdown-item-label">
                      <AccountBalanceWalletRoundedIcon fontSize="small" />
                      <span>Mức cọc yêu cầu</span>
                    </div>
                    <strong>{formatVndCurrency(data.depositAmount)}</strong>
                  </div>
                )}
              </div>

              {data?.depositDescription && (
                <div className="boph-deposit-note">
                  <div className="boph-deposit-note-badge">Quy định đặt cọc</div>
                  <span>{data.depositDescription}</span>
                </div>
              )}
            </Card>
          )}

          {/* Payments Table Card */}
          <Card
            title={
              <div className="boph-table-card-header">
                <ReceiptLongRoundedIcon className="boph-table-title-icon" />
                <span>
                  Danh Sách Lịch Sử Giao Dịch ({data?.payments?.length || 0})
                </span>
              </div>
            }
            className="boph-table-card"
          >
            {Array.isArray(data?.payments) && data.payments.length > 0 ? (
              <Table
                dataSource={data.payments.map((p, idx) => ({
                  ...p,
                  key: p.paymentId || p.orderCode || idx,
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

      {/* Payment Detail Modal */}
      <Modal
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedPayment(null);
        }}
        footer={[
          <AntButton
            key="close"
            onClick={() => {
              setDetailModalOpen(false);
              setSelectedPayment(null);
            }}
          >
            Đóng
          </AntButton>,
          selectedPayment?.checkoutUrl && (
            <AntButton
              key="checkout"
              type="primary"
              href={selectedPayment.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              icon={<LaunchRoundedIcon style={{ fontSize: 15 }} />}
              style={{ background: "#ea580c", borderColor: "#ea580c" }}
            >
              Mở hóa đơn SePay
            </AntButton>
          ),
        ]}
        title={
          <div className="boph-modal-title">
            <ReceiptLongRoundedIcon style={{ color: "#ea580c" }} />
            <span>Chi Tiết Giao Dịch Thanh Toán</span>
          </div>
        }
        className="boph-detail-modal"
        width={580}
      >
        {selectedPayment && (
          <div className="boph-modal-body">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Mã yêu cầu mua hộ">
                <strong>{data?.purchaseCode || requestId}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Mã thanh toán">
                <span className="boph-order-code">
                  {selectedPayment.orderCode || selectedPayment.paymentId}
                </span>
              </Descriptions.Item>
              {selectedPayment.transactionCode && (
                <Descriptions.Item label="Mã giao dịch ngân hàng">
                  <span className="boph-tx-code">
                    {selectedPayment.transactionCode}
                  </span>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Loại thanh toán">
                {formatPaymentType(selectedPayment.paymentType)}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {formatPaymentMethod(selectedPayment.paymentMethod)}
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                <strong className="boph-amount-text">
                  {formatVndCurrency(selectedPayment.amount)}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {renderPaymentStatusTag(selectedPayment.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tạo">
                {formatDateDisplay(selectedPayment.createdAt)}
              </Descriptions.Item>
              {selectedPayment.paidAt && (
                <Descriptions.Item label="Thời gian thanh toán">
                  {formatDateDisplay(selectedPayment.paidAt)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BuyOrderPaymentHistory;



