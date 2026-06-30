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
    Image,
    Table,
    Tag,
    message,
  } from "antd";
  
  import {
    Button,
    CircularProgress,
  } from "@mui/material";
  
  import ArrowBackIcon from "@mui/icons-material/ArrowBack";
  import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
  import PersonIcon from "@mui/icons-material/Person";
  import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
  import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
  import OpenInNewIcon from "@mui/icons-material/OpenInNew";
  import RefreshIcon from "@mui/icons-material/Refresh";
  
  import { getConsignmentDetailApi } from "../../../../../api/OrderApi/consignmentApi";
  
  import "./ConsignmentListDetail.css";
  
  const STATUS_LABELS = {
    PENDING_REVIEW: "CHỜ XÁC NHẬN",
    APPROVED: "ĐÃ DUYỆT",
    REJECTED: "ĐÃ TỪ CHỐI",
    CANCELLED: "ĐÃ HỦY",
    IN_TRANSIT: "ĐANG VẬN CHUYỂN",
    DELIVERED: "ĐÃ GIAO",
  };
  
  const QUOTATION_STATUS_LABELS = {
    DRAFT: "BẢN NHÁP",
    PENDING: "CHỜ XÁC NHẬN",
    APPROVED: "ĐÃ DUYỆT",
    REJECTED: "ĐÃ TỪ CHỐI",
    EXPIRED: "HẾT HẠN",
  };
  
  const QUOTE_TYPE_LABELS = {
    ESTIMATE: "BÁO GIÁ TẠM TÍNH",
    FINAL: "BÁO GIÁ CHÍNH THỨC",
  };
  
  const normalizeStatus = (status) => {
    return String(status || "")
      .trim()
      .toUpperCase();
  };
  
  const getStatusLabel = (status) => {
    const normalizedStatus = normalizeStatus(status);
  
    return (
      STATUS_LABELS[normalizedStatus] ||
      normalizedStatus ||
      "-"
    );
  };
  
  const getQuotationStatusLabel = (status) => {
    const normalizedStatus = normalizeStatus(status);
  
    return (
      QUOTATION_STATUS_LABELS[normalizedStatus] ||
      normalizedStatus ||
      "-"
    );
  };
  
  const getQuoteTypeLabel = (type) => {
    const normalizedType = normalizeStatus(type);
  
    return (
      QUOTE_TYPE_LABELS[normalizedType] ||
      normalizedType ||
      "-"
    );
  };
  
  const getConsignmentTypeLabel = (type) => {
    const normalizedType = normalizeStatus(type);
  
    if (normalizedType === "EXPRESS") {
      return "HỎA TỐC";
    }
  
    if (normalizedType === "STANDARD") {
      return "TIÊU CHUẨN";
    }
  
    return type || "-";
  };
  
  const getStatusClassName = (status) => {
    return String(status || "unknown")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-");
  };
  
  /**
   * API trả thời gian có thể có 7 chữ số mili-giây:
   * 2026-06-26T08:17:13.1382779
   *
   * Chuẩn hóa còn 3 chữ số để trình duyệt đọc ổn định.
   */
  const parseApiDateTime = (dateString) => {
    if (!dateString) {
      return null;
    }
  
    const normalizedDateString = String(dateString).replace(
      /(\.\d{3})\d+/,
      "$1"
    );
  
    const date = dayjs(normalizedDateString);
  
    return date.isValid() ? date : null;
  };
  
  const formatDateTime = (dateString) => {
    const date = parseApiDateTime(dateString);
  
    if (!date) {
      return "-";
    }
  
    return date.format("HH:mm DD/MM/YYYY");
  };
  
  const formatMoney = (value) => {
    const number = Number(value);
  
    if (!Number.isFinite(number)) {
      return "0 ₫";
    }
  
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(number);
  };
  
  const getDisplayCode = (consignment) => {
    if (consignment?.consignmentCode?.trim()) {
      return consignment.consignmentCode.trim();
    }
  
    const shortOrderId = consignment?.orderId
      ? consignment.orderId.slice(0, 8).toUpperCase()
      : "UNKNOWN";
  
    return `KG-${shortOrderId}`;
  };
  
  const ConsignmentListDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { orderId } = useParams();
  
    /*
     * Có thể nhận dữ liệu tóm tắt từ ConsignmentList.
     * Tuy nhiên component vẫn gọi API để lấy đầy đủ customer,
     * items và quotation.
     */
    const summaryData = location.state?.consignment || null;
  
    const [consignment, setConsignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
  
    const fetchConsignmentDetail = useCallback(
      async (signal) => {
        if (!orderId) {
          setErrorMessage("Không tìm thấy mã đơn hàng.");
          setLoading(false);
          return;
        }
  
        try {
          setLoading(true);
          setErrorMessage("");
  
          const response = await getConsignmentDetailApi(
            orderId,
            {
              signal,
            }
          );
  
          const responseData = response?.data;
  
          if (!responseData) {
            throw new Error(
              "API không trả về dữ liệu chi tiết lô hàng."
            );
          }
  
          setConsignment(responseData);
        } catch (error) {
          if (
            axios.isCancel(error) ||
            error?.code === "ERR_CANCELED"
          ) {
            return;
          }
  
          console.error(
            "Lỗi khi lấy chi tiết ký gửi:",
            error
          );
  
          const apiMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Không thể tải chi tiết lô hàng.";
  
          setErrorMessage(apiMessage);
  
          /*
           * Dùng dữ liệu tóm tắt làm phương án dự phòng.
           */
          if (summaryData) {
            setConsignment(summaryData);
          } else {
            setConsignment(null);
          }
  
          message.error(apiMessage);
        } finally {
          if (!signal?.aborted) {
            setLoading(false);
          }
        }
      },
      [orderId, summaryData]
    );
  
    useEffect(() => {
      const controller = new AbortController();
  
      fetchConsignmentDetail(controller.signal);
  
      return () => {
        controller.abort();
      };
    }, [fetchConsignmentDetail]);
  
    const handleReload = () => {
      const controller = new AbortController();
      fetchConsignmentDetail(controller.signal);
    };
  
    const handleBack = () => {
      navigate(-1);
    };
  
    const productColumns = useMemo(
      () => [
        {
          title: "STT",
          key: "index",
          width: 65,
          align: "center",
          render: (_, __, index) => index + 1,
        },
        {
          title: "Hình ảnh",
          dataIndex: "referenceUrl",
          key: "referenceUrl",
          width: 95,
          align: "center",
          render: (referenceUrl, record) => {
            if (!referenceUrl) {
              return (
                <div className="detail-no-image">
                  <Inventory2OutlinedIcon />
                </div>
              );
            }
  
            return (
              <Image
                src={referenceUrl}
                alt={record.productName || "Sản phẩm"}
                width={58}
                height={58}
                className="detail-product-image"
                fallback=""
                preview={{
                  mask: "Xem",
                }}
              />
            );
          },
        },
        {
          title: "Sản phẩm",
          dataIndex: "productName",
          key: "productName",
          minWidth: 180,
          render: (productName, record) => (
            <div className="detail-product-name-cell">
              <strong>{productName || "-"}</strong>
  
              <span>{record.productType || "-"}</span>
            </div>
          ),
        },
        {
          title: "Số lượng",
          dataIndex: "quantity",
          key: "quantity",
          width: 100,
          align: "center",
          render: (quantity) => quantity ?? 0,
        },
        {
          title: "Trọng lượng",
          dataIndex: "weight",
          key: "weight",
          width: 125,
          render: (weight) => `${weight ?? 0} kg`,
        },
        {
          title: "Kích thước",
          key: "dimensions",
          width: 180,
          render: (_, record) => (
            <span className="detail-dimension-text">
              {record.length ?? 0} × {record.width ?? 0} ×{" "}
              {record.height ?? 0} cm
            </span>
          ),
        },
        {
          title: "Giá trị khai báo",
          dataIndex: "declaredValue",
          key: "declaredValue",
          width: 155,
          align: "right",
          render: (declaredValue) => (
            <strong className="detail-money-value">
              {formatMoney(declaredValue)}
            </strong>
          ),
        },
        {
          title: "Mã vận đơn nội địa",
          dataIndex: "domesticTrackingCode",
          key: "domesticTrackingCode",
          width: 180,
          render: (trackingCode) =>
            trackingCode || "Chưa cập nhật",
        },
        {
          title: "",
          key: "action",
          width: 70,
          align: "center",
          render: (_, record) =>
            record.referenceUrl ? (
              <a
                href={record.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="detail-product-link"
                onClick={(event) => event.stopPropagation()}
                aria-label="Mở liên kết sản phẩm"
              >
                <OpenInNewIcon fontSize="small" />
              </a>
            ) : null,
        },
      ],
      []
    );
  
    if (loading) {
      return (
        <div className="consignment-detail-page">
          <div className="detail-loading-container">
            <CircularProgress size={42} />
  
            <div>
              <strong>Đang tải chi tiết lô hàng</strong>
              <span>Vui lòng chờ trong giây lát...</span>
            </div>
          </div>
        </div>
      );
    }
  
    if (!consignment) {
      return (
        <div className="consignment-detail-page">
          <div className="detail-error-container">
            <div className="detail-error-icon">📦</div>
  
            <h2>Không tìm thấy lô hàng</h2>
  
            <p>
              {errorMessage ||
                "Lô hàng không tồn tại hoặc đã bị xóa."}
            </p>
  
            <div className="detail-error-actions">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
              >
                Quay lại
              </Button>
  
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleReload}
              >
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      );
    }
  
    const statusClass = getStatusClassName(
      consignment.status
    );
  
    const quotationStatusClass = getStatusClassName(
      consignment.quotation?.status
    );
  
    const items = Array.isArray(consignment.items)
      ? consignment.items
      : [];
  
    const customer = consignment.customer || {};
    const quotation = consignment.quotation || null;
  
    return (
      <div className="consignment-detail-page">
        <div className="detail-navigation">
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            className="detail-back-button"
          >
            Quay lại danh sách
          </Button>
  
          <span className="detail-navigation-text">
            Danh sách ký gửi / Chi tiết
          </span>
        </div>
  
        {errorMessage && summaryData && (
          <div className="detail-warning-message">
            Không thể tải dữ liệu mới nhất. Đang hiển thị dữ
            liệu từ danh sách.
          </div>
        )}
  
        <section className="detail-hero-section">
          <div className="detail-hero-main">
            <div className="detail-main-icon">
              <Inventory2OutlinedIcon />
            </div>
  
            <div className="detail-hero-content">
              <div className="detail-title-row">
                <h1>{getDisplayCode(consignment)}</h1>
  
                <span
                  className={`detail-status-badge status-${statusClass}`}
                >
                  {getStatusLabel(consignment.status)}
                </span>
              </div>
  
              <div className="detail-order-metadata">
                <span>
                  Mã đơn hàng:
                  <strong>{consignment.orderId || "-"}</strong>
                </span>
  
                <span>
                  Loại đơn:
                  <strong>
                    {consignment.orderType === "CONSIGNMENT"
                      ? "KÝ GỬI"
                      : consignment.orderType || "-"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
  
          <div className="detail-created-time">
            <span>Ngày tạo yêu cầu</span>
  
            <strong>
              {formatDateTime(consignment.createdAt)}
            </strong>
          </div>
        </section>
  
        <section className="detail-summary-grid">
          <div className="detail-summary-card">
            <span>Loại vận chuyển</span>
  
            <strong>
              {getConsignmentTypeLabel(
                consignment.consignmentType
              )}
            </strong>
          </div>
  
          <div className="detail-summary-card">
            <span>Tuyến vận chuyển</span>
            <strong>{consignment.route || "-"}</strong>
          </div>
  
          <div className="detail-summary-card">
            <span>Tổng trọng lượng</span>
  
            <strong>
              {consignment.totalWeight ?? 0}
              <small>kg</small>
            </strong>
          </div>
  
          <div className="detail-summary-card">
            <span>Tổng thể tích</span>
  
            <strong>
              {consignment.totalVolume ?? 0}
              <small>cm³</small>
            </strong>
          </div>
  
          <div className="detail-summary-card">
            <span>Số sản phẩm</span>
  
            <strong>
              {items.reduce(
                (total, item) =>
                  total + (Number(item.quantity) || 0),
                0
              )}
              <small>sản phẩm</small>
            </strong>
          </div>
        </section>
  
        <div className="detail-information-grid">
          <section className="detail-section-card">
            <div className="detail-section-header">
              <div className="detail-section-icon customer">
              <PersonIcon />
              </div>
  
              <div>
                <h2>Thông tin khách hàng</h2>
  
                <p>Thông tin người gửi yêu cầu ký gửi</p>
              </div>
            </div>
  
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="detail-descriptions"
            >
              <Descriptions.Item label="Họ và tên">
                {customer.fullName || "-"}
              </Descriptions.Item>
  
              <Descriptions.Item label="Email">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`}>
                    {customer.email}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Số điện thoại">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`}>
                    {customer.phone}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Mã khách hàng">
                <span className="detail-id-value">
                  {customer.customerId || "-"}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </section>
  
          <section className="detail-section-card">
            <div className="detail-section-header">
              <div className="detail-section-icon receiver">
                <LocalShippingOutlinedIcon />
              </div>
  
              <div>
                <h2>Thông tin nhận hàng</h2>
  
                <p>Thông tin người nhận tại Việt Nam</p>
              </div>
            </div>
  
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="detail-descriptions"
            >
              <Descriptions.Item label="Người nhận">
                {consignment.receiverName || "-"}
              </Descriptions.Item>
  
              <Descriptions.Item label="Số điện thoại">
                {consignment.receiverPhone ? (
                  <a
                    href={`tel:${consignment.receiverPhone}`}
                  >
                    {consignment.receiverPhone}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Địa chỉ nhận">
                {consignment.receiverAddress || "-"}
              </Descriptions.Item>
  
              <Descriptions.Item label="Kiểm hàng">
                <Tag
                  color={
                    consignment.requiresInspection
                      ? "green"
                      : "default"
                  }
                >
                  {consignment.requiresInspection
                    ? "CÓ KIỂM HÀNG"
                    : "KHÔNG KIỂM HÀNG"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </section>
        </div>
  
        <section className="detail-section-card detail-products-section">
          <div className="detail-section-header">
            <div className="detail-section-icon product">
              <Inventory2OutlinedIcon />
            </div>
  
            <div>
              <h2>Danh sách sản phẩm</h2>
  
              <p>
                Có {items.length} dòng sản phẩm trong lô hàng
              </p>
            </div>
          </div>
  
          <Table
            rowKey={(record) => record.id}
            columns={productColumns}
            dataSource={items}
            pagination={false}
            scroll={{
              x: 1150,
            }}
            locale={{
              emptyText: "Chưa có sản phẩm trong lô hàng.",
            }}
            className="detail-product-table"
          />
        </section>
  
        <div className="detail-bottom-grid">
          <section className="detail-section-card">
            <div className="detail-section-header">
              <div className="detail-section-icon shipping">
                <LocalShippingOutlinedIcon />
              </div>
  
              <div>
                <h2>Thông tin vận chuyển</h2>
  
                <p>Thông tin chung của yêu cầu ký gửi</p>
              </div>
            </div>
  
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="detail-descriptions"
            >
              <Descriptions.Item label="Mã ký gửi">
                {consignment.consignmentCode?.trim() ? (
                  consignment.consignmentCode
                ) : (
                  <span className="detail-pending-value">
                    Chưa được cấp mã
                  </span>
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Trạng thái">
                <span
                  className={`detail-inline-status status-${statusClass}`}
                >
                  {getStatusLabel(consignment.status)}
                </span>
              </Descriptions.Item>
  
              <Descriptions.Item label="Loại vận chuyển">
                {getConsignmentTypeLabel(
                  consignment.consignmentType
                )}
              </Descriptions.Item>
  
              <Descriptions.Item label="Tuyến">
                {consignment.route || "-"}
              </Descriptions.Item>
  
              <Descriptions.Item label="Ghi chú">
                {consignment.note || "Không có ghi chú"}
              </Descriptions.Item>
            </Descriptions>
          </section>
  
          <section className="detail-section-card quotation-card">
            <div className="detail-section-header">
              <div className="detail-section-icon quotation">
                <ReceiptLongOutlinedIcon />
              </div>
  
              <div>
                <h2>Thông tin báo giá</h2>
  
                <p>Chi phí dự kiến của lô hàng</p>
              </div>
            </div>
  
            {quotation ? (
              <>
                <div className="quotation-heading">
                  <div>
                    <span>Loại báo giá</span>
  
                    <strong>
                      {getQuoteTypeLabel(
                        quotation.quoteType
                      )}
                    </strong>
                  </div>
  
                  <span
                    className={`quotation-status status-${quotationStatusClass}`}
                  >
                    {getQuotationStatusLabel(
                      quotation.status
                    )}
                  </span>
                </div>
  
                <div className="quotation-price-list">
                  <div>
                    <span>Cước vận chuyển dự kiến</span>
  
                    <strong>
                      {formatMoney(
                        quotation.estimatedFreightCharge
                      )}
                    </strong>
                  </div>
  
                  <div>
                    <span>Phí dịch vụ</span>
  
                    <strong>
                      {formatMoney(quotation.serviceFee)}
                    </strong>
                  </div>
  
                  <div>
                    <span>Thuế và phí nhập khẩu</span>
  
                    <strong>
                      {formatMoney(quotation.taxAndDuty)}
                    </strong>
                  </div>
  
                  <div className="quotation-total-row">
                    <span>Tổng chi phí dự kiến</span>
  
                    <strong>
                      {formatMoney(
                        quotation.totalEstimatedCost
                      )}
                    </strong>
                  </div>
                </div>
  
                <div className="quotation-time-grid">
                  <div>
                    <span>Ngày tạo báo giá</span>
  
                    <strong>
                      {formatDateTime(
                        quotation.createdAt
                      )}
                    </strong>
                  </div>
  
                  <div>
                    <span>Ngày hết hạn</span>
  
                    <strong>
                      {formatDateTime(
                        quotation.expiredAt
                      )}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="quotation-empty">
                Chưa có báo giá cho lô hàng này.
              </div>
            )}
          </section>
        </div>
      </div>
    );
  };
  
  export default ConsignmentListDetail;