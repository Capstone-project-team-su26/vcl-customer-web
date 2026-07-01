import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import axios from "axios";
  import dayjs from "dayjs";
  
  import {
    useLocation,
    useNavigate,
    useParams,
  } from "react-router-dom";
  
  import {
    Descriptions,
    Tag,
    message,
  } from "antd";
  
  import {
    Button,
    CircularProgress,
  } from "@mui/material";
  
  import ArrowBackIcon from "@mui/icons-material/ArrowBack";
  import AutorenewIcon from "@mui/icons-material/Autorenew";
  import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
  import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
  import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
  import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
  import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
  import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
  
  import { getOrderQuotationApi } from "../../../../api/OrderApi/consignmentApi";
  
  import "./QuotationDetail.css";
  
  /* =========================================================
     LABEL
     ========================================================= */
  
  const QUOTATION_STATUS_LABELS = {
    DRAFT: "BẢN NHÁP",
    PENDING: "CHỜ XÁC NHẬN",
    APPROVED: "ĐÃ DUYỆT",
    REJECTED: "ĐÃ TỪ CHỐI",
    EXPIRED: "HẾT HẠN",
    CANCELLED: "ĐÃ HỦY",
  };
  
  const QUOTE_TYPE_LABELS = {
    ESTIMATE: "BÁO GIÁ TẠM TÍNH",
    FINAL: "BÁO GIÁ CHÍNH THỨC",
  };
  
  const CONSIGNMENT_TYPE_LABELS = {
    EXPRESS: "HỎA TỐC",
    STANDARD: "TIÊU CHUẨN",
  };
  
  /* =========================================================
     HELPER
     ========================================================= */
  
  const normalizeStatus = (value) => {
    return String(value || "")
      .trim()
      .toUpperCase();
  };
  
  const getQuotationStatusLabel = (status) => {
    const normalizedStatus =
      normalizeStatus(status);
  
    return (
      QUOTATION_STATUS_LABELS[
        normalizedStatus
      ] ||
      normalizedStatus ||
      "-"
    );
  };
  
  const getQuoteTypeLabel = (quoteType) => {
    const normalizedType =
      normalizeStatus(quoteType);
  
    return (
      QUOTE_TYPE_LABELS[
        normalizedType
      ] ||
      normalizedType ||
      "-"
    );
  };
  
  const getConsignmentTypeLabel = (
    consignmentType
  ) => {
    const normalizedType =
      normalizeStatus(consignmentType);
  
    return (
      CONSIGNMENT_TYPE_LABELS[
        normalizedType
      ] ||
      consignmentType ||
      "-"
    );
  };
  
  const getStatusClassName = (status) => {
    return String(status || "unknown")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-");
  };
  
  const parseApiDateTime = (dateString) => {
    if (!dateString) {
      return null;
    }
  
    const normalizedDate = String(
      dateString
    ).replace(
      /(\.\d{3})\d+/,
      "$1"
    );
  
    const date = dayjs(
      normalizedDate
    );
  
    return date.isValid()
      ? date
      : null;
  };
  
  const formatDateTime = (dateString) => {
    const date =
      parseApiDateTime(dateString);
  
    if (!date) {
      return "-";
    }
  
    return date.format(
      "HH:mm DD/MM/YYYY"
    );
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
        maximumFractionDigits: 0,
      }
    ).format(number);
  };
  
  const formatNumber = (
    value,
    maximumFractionDigits = 2
  ) => {
    const number = Number(value);
  
    if (!Number.isFinite(number)) {
      return "0";
    }
  
    return new Intl.NumberFormat(
      "vi-VN",
      {
        maximumFractionDigits,
      }
    ).format(number);
  };
  
  const getShortId = (
    value,
    prefix = ""
  ) => {
    if (!value) {
      return "-";
    }
  
    const normalizedValue =
      String(value);
  
    return `${prefix}${normalizedValue
      .slice(0, 8)
      .toUpperCase()}`;
  };
  
  const extractQuotationData = (
    response
  ) => {
    if (!response) {
      return null;
    }
  
    if (
      response?.data &&
      !Array.isArray(response.data)
    ) {
      return response.data;
    }
  
    return response;
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
  
  /* =========================================================
     COMPONENT
     ========================================================= */
  
  const QuotationDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { orderId } = useParams();
  
    const orderSummary =
      location.state?.orderSummary ||
      location.state?.consignment ||
      null;
  
    const [
      quotation,
      setQuotation,
    ] = useState(null);
  
    const [
      loading,
      setLoading,
    ] = useState(true);
  
    const [
      errorMessage,
      setErrorMessage,
    ] = useState("");
  
    const fetchQuotation =
      useCallback(
        async (signal) => {
          if (!orderId) {
            setErrorMessage(
              "Không tìm thấy mã đơn hàng."
            );
  
            setLoading(false);
  
            return;
          }
  
          try {
            setLoading(true);
            setErrorMessage("");
  
            const response =
              await getOrderQuotationApi(
                orderId,
                {
                  signal,
                }
              );
  
            const quotationData =
              extractQuotationData(
                response
              );
  
            if (!quotationData) {
              throw new Error(
                "API không trả về dữ liệu báo giá."
              );
            }
  
            setQuotation(
              quotationData
            );
          } catch (error) {
            if (
              axios.isCancel(error) ||
              error?.code ===
                "ERR_CANCELED" ||
              error?.name ===
                "CanceledError" ||
              error?.name ===
                "AbortError"
            ) {
              return;
            }
  
            console.error(
              "Lỗi lấy chi tiết báo giá:",
              error
            );
  
            const apiMessage =
              getApiErrorMessage(
                error,
                "Không thể tải thông tin báo giá."
              );
  
            setErrorMessage(
              apiMessage
            );
  
            setQuotation(null);
  
            message.error(
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
  
      fetchQuotation(
        controller.signal
      );
  
      return () => {
        controller.abort();
      };
    }, [fetchQuotation]);
  
    const handleReload = () => {
      const controller =
        new AbortController();
  
      fetchQuotation(
        controller.signal
      );
    };
  
    const handleBack = () => {
      navigate(-1);
    };
  
    const costItems = useMemo(
      () => {
        if (!quotation) {
          return [];
        }
  
        return [
          {
            key: "freight",
            label:
              "Cước vận chuyển dự kiến",
            value:
              quotation.estimatedFreightCharge,
          },
          {
            key: "service",
            label: "Phí dịch vụ",
            value:
              quotation.serviceFee,
          },
          {
            key: "tax",
            label:
              "Thuế và phí nhập khẩu",
            value:
              quotation.taxAndDuty,
          },
        ];
      },
      [quotation]
    );
  
    if (loading) {
      return (
        <div className="quotation-detail-page">
          <div className="quotation-loading-box">
            <CircularProgress
              size={42}
            />
  
            <div>
              <strong>
                Đang tải thông tin báo giá
              </strong>
  
              <span>
                Vui lòng chờ trong giây lát...
              </span>
            </div>
          </div>
        </div>
      );
    }
  
    if (!quotation) {
      return (
        <div className="quotation-detail-page">
          <div className="quotation-error-box">
            <div className="quotation-error-icon">
              📄
            </div>
  
            <h2>
              Không tìm thấy báo giá
            </h2>
  
            <p>
              {errorMessage ||
                "Đơn hàng chưa có báo giá hoặc báo giá không tồn tại."}
            </p>
  
            <div className="quotation-error-actions">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={
                  <ArrowBackIcon />
                }
                onClick={
                  handleBack
                }
              >
                Quay lại
              </Button>
  
              <Button
                variant="contained"
                startIcon={
                  <AutorenewIcon />
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
  
    const statusClass =
      getStatusClassName(
        quotation.status
      );
  
    const hasExpired =
      parseApiDateTime(
        quotation.expiredAt
      )?.isBefore(dayjs()) ||
      false;
  
    const effectiveStatus =
      hasExpired &&
      normalizeStatus(
        quotation.status
      ) !== "APPROVED"
        ? "EXPIRED"
        : quotation.status;
  
    const effectiveStatusClass =
      getStatusClassName(
        effectiveStatus
      );
  
    return (
      <div className="quotation-detail-page">
        <div className="quotation-navigation">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={
              <ArrowBackIcon />
            }
            onClick={handleBack}
            className="quotation-back-button"
          >
            Quay lại danh sách
          </Button>
  
          <span>
            Theo dõi báo giá / Chi tiết
          </span>
        </div>
  
        <section className="quotation-hero">
          <div className="quotation-hero-main">
            <div className="quotation-hero-icon">
              <ReceiptLongOutlinedIcon />
            </div>
  
            <div className="quotation-hero-content">
              <div className="quotation-title-row">
                <div>
                  <span className="quotation-eyebrow">
                    MÃ BÁO GIÁ
                  </span>
  
                  <h1>
                    {getShortId(
                      quotation.quotationId,
                      "BG-"
                    )}
                  </h1>
                </div>
  
                <span
                  className={`quotation-status-badge status-${effectiveStatusClass}`}
                >
                  {getQuotationStatusLabel(
                    effectiveStatus
                  )}
                </span>
              </div>
  
              <div className="quotation-meta-row">
                <span>
                  Mã đơn hàng:
                  <strong>
                    {quotation.orderId ||
                      orderId ||
                      "-"}
                  </strong>
                </span>
  
                <span>
                  Loại báo giá:
                  <strong>
                    {getQuoteTypeLabel(
                      quotation.quoteType
                    )}
                  </strong>
                </span>
              </div>
            </div>
          </div>
  
          <div className="quotation-hero-total">
            <span>
              Tổng chi phí dự kiến
            </span>
  
            <strong>
              {formatMoney(
                quotation.totalEstimatedCost
              )}
            </strong>
  
            <small>
              Báo giá có hiệu lực đến{" "}
              {formatDateTime(
                quotation.expiredAt
              )}
            </small>
          </div>
        </section>
  
        <section className="quotation-summary-grid">
          <div className="quotation-summary-card">
            <div className="quotation-summary-icon shipping">
              <LocalShippingOutlinedIcon />
            </div>
  
            <span>
              Loại vận chuyển
            </span>
  
            <strong>
              {getConsignmentTypeLabel(
                quotation.consignmentType
              )}
            </strong>
          </div>
  
          <div className="quotation-summary-card">
            <div className="quotation-summary-icon weight">
              <ScaleOutlinedIcon />
            </div>
  
            <span>
              Trọng lượng thực
            </span>
  
            <strong>
              {formatNumber(
                quotation.totalWeight
              )}
              <small>kg</small>
            </strong>
          </div>
  
          <div className="quotation-summary-card">
            <div className="quotation-summary-icon volume">
              <Inventory2OutlinedIcon />
            </div>
  
            <span>
              Trọng lượng quy đổi
            </span>
  
            <strong>
              {formatNumber(
                quotation.volumetricWeight
              )}
              <small>kg</small>
            </strong>
          </div>
  
          <div className="quotation-summary-card highlighted">
            <div className="quotation-summary-icon chargeable">
              <PaymentsOutlinedIcon />
            </div>
  
            <span>
              Trọng lượng tính cước
            </span>
  
            <strong>
              {formatNumber(
                quotation.chargeableWeight
              )}
              <small>kg</small>
            </strong>
          </div>
        </section>
  
        <div className="quotation-main-grid">
          <section className="quotation-card quotation-cost-card">
            <div className="quotation-section-header">
              <div className="quotation-section-icon cost">
                <PaymentsOutlinedIcon />
              </div>
  
              <div>
                <h2>
                  Chi tiết chi phí
                </h2>
  
                <p>
                  Các khoản phí dự kiến của đơn hàng
                </p>
              </div>
            </div>
  
            <div className="quotation-cost-list">
              {costItems.map(
                (item) => (
                  <div
                    key={item.key}
                    className="quotation-cost-row"
                  >
                    <span>
                      {item.label}
                    </span>
  
                    <strong>
                      {formatMoney(
                        item.value
                      )}
                    </strong>
                  </div>
                )
              )}
  
              <div className="quotation-cost-total">
                <div>
                  <span>
                    TỔNG CHI PHÍ DỰ KIẾN
                  </span>
  
                  <small>
                    Có thể thay đổi sau khi kiểm tra thực tế
                  </small>
                </div>
  
                <strong>
                  {formatMoney(
                    quotation.totalEstimatedCost
                  )}
                </strong>
              </div>
            </div>
          </section>
  
          <section className="quotation-card">
            <div className="quotation-section-header">
              <div className="quotation-section-icon info">
                <ReceiptLongOutlinedIcon />
              </div>
  
              <div>
                <h2>
                  Thông tin báo giá
                </h2>
  
                <p>
                  Chi tiết trạng thái và thông số
                </p>
              </div>
            </div>
  
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="quotation-descriptions"
            >
              <Descriptions.Item label="Mã báo giá">
                <span className="quotation-id-text">
                  {quotation.quotationId ||
                    "-"}
                </span>
              </Descriptions.Item>
  
              <Descriptions.Item label="Mã đơn hàng">
                <span className="quotation-id-text">
                  {quotation.orderId ||
                    orderId ||
                    "-"}
                </span>
              </Descriptions.Item>
  
              <Descriptions.Item label="Loại báo giá">
                <Tag color="blue">
                  {getQuoteTypeLabel(
                    quotation.quoteType
                  )}
                </Tag>
              </Descriptions.Item>
  
              <Descriptions.Item label="Trạng thái">
                <span
                  className={`quotation-inline-status status-${statusClass}`}
                >
                  {getQuotationStatusLabel(
                    quotation.status
                  )}
                </span>
              </Descriptions.Item>
  
              <Descriptions.Item label="Loại vận chuyển">
                {getConsignmentTypeLabel(
                  quotation.consignmentType
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Tổng thể tích">
                {formatNumber(
                  quotation.totalVolume
                )}{" "}
                cm³
              </Descriptions.Item>
            </Descriptions>
          </section>
        </div>
  
        <div className="quotation-bottom-grid">
          <section className="quotation-card">
            <div className="quotation-section-header">
              <div className="quotation-section-icon time">
                <AccessTimeOutlinedIcon />
              </div>
  
              <div>
                <h2>
                  Thời gian hiệu lực
                </h2>
  
                <p>
                  Thời điểm tạo và hết hạn báo giá
                </p>
              </div>
            </div>
  
            <div className="quotation-time-line">
              <div className="quotation-time-item">
                <span className="quotation-time-dot created" />
  
                <div>
                  <span>
                    Ngày tạo báo giá
                  </span>
  
                  <strong>
                    {formatDateTime(
                      quotation.createdAt
                    )}
                  </strong>
                </div>
              </div>
  
              <div className="quotation-time-connector" />
  
              <div className="quotation-time-item">
                <span
                  className={`quotation-time-dot ${
                    hasExpired
                      ? "expired"
                      : "active"
                  }`}
                />
  
                <div>
                  <span>
                    Ngày hết hạn
                  </span>
  
                  <strong>
                    {formatDateTime(
                      quotation.expiredAt
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>
  
          <section className="quotation-card">
            <div className="quotation-section-header">
              <div className="quotation-section-icon note">
                <ReceiptLongOutlinedIcon />
              </div>
  
              <div>
                <h2>
                  Ghi chú từ nhân viên
                </h2>
  
                <p>
                  Thông tin bổ sung của bộ phận báo giá
                </p>
              </div>
            </div>
  
            <div
              className={[
                "quotation-sales-note",
                quotation.salesNote
                  ? "has-note"
                  : "is-empty",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {quotation.salesNote ||
                "Chưa có ghi chú từ nhân viên phụ trách."}
            </div>
          </section>
        </div>
  
        {orderSummary && (
          <section className="quotation-order-summary">
            <div>
              <span>
                Thông tin từ danh sách đơn hàng
              </span>
  
              <strong>
                {orderSummary.itemNames ||
                  "Đơn ký gửi"}
              </strong>
            </div>
  
            <div>
              <span>
                Người nhận
              </span>
  
              <strong>
                {orderSummary.receiverName ||
                  "-"}
              </strong>
            </div>
  
            <div>
              <span>
                Địa chỉ nhận
              </span>
  
              <strong>
                {orderSummary.receiverAddress ||
                  "-"}
              </strong>
            </div>
          </section>
        )}
      </div>
    );
  };
  
  export default QuotationDetail;
  