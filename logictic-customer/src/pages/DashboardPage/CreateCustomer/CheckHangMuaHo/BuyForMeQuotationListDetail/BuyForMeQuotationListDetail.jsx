import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { Image, Tag } from "antd";

import {
  Button,
  CircularProgress,
} from "@mui/material";

import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";

import AuthNotify from "../../../../../utils/AuthNotify";
import {
  acceptQuotationApi,
  confirmAndPayQuotationApi,
  getPaymentCheckoutUrl,
  getPurchaseRequestDetailApi,
  rejectQuotationApi,
} from "../../../../../api/PurchaseAPI/purchaseRequestApi";
import {
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../../utils/timeUtc";

import QuotationCancelDialog from "../../../../../components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/CancelPayments/QuotationCancelDialog";
import QuotationPaymentConfirmDialog, {
  PAYMENT_METHODS,
} from "../../../../../components/DashboardComponents/CustomerKiguiComponents/QuotationPayments/ConfirmPayments/QuotationPaymentConfirmDialog";

import "./BuyForMeQuotationListDetail.css";

/* =========================================================
   HELPERS & FORMATTERS
   ========================================================= */

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getApiErrorMessage = (error, fallbackMessage) => {
  if (
    error?.message === "Network Error" ||
    error?.code === "ERR_NETWORK"
  ) {
    return "Lỗi kết nối máy chủ (Network Error). Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
  }

  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
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

const formatVndCurrency = (value) => {
  const number = Number(value || 0);
  return `${Math.round(number).toLocaleString("vi-VN")} đ`;
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  return formatVietnamDateTime(value, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatStatusTag = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return <Tag color="gold">Đã báo giá</Tag>;
    case "PENDING_REVIEW":
      return <Tag color="blue">Chờ duyệt</Tag>;
    case "APPROVED":
    case "CONFIRMED":
    case "ACCEPTED":
    case "PAID":
      return <Tag color="green">Đã xác nhận</Tag>;
    case "REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return <Tag color="red">Đã từ chối</Tag>;
    default:
      return <Tag color="default">{normalized || "Chưa xác định"}</Tag>;
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

  if (!copied) {
    throw new Error("Không thể sao chép mã.");
  }
};

/* =========================================================
   COMPONENT
   ========================================================= */

const BuyForMeQuotationListDetail = () => {
  const { requestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const copyTimerRef = useRef(null);

  // Read initial data from navigation state if present
  const initialData =
    location.state?.purchaseRequest || location.state?.orderSummary || null;

  const [detailData, setDetailData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [copiedCode, setCopiedCode] = useState("");

  // Dialog & Action States
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [quotationAction, setQuotationAction] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  /* =========================================================
     FETCH DATA
     ========================================================= */

  const fetchDetail = useCallback(
    async (signal) => {
      if (!requestId) return;

      try {
        setLoading(true);
        const result = await getPurchaseRequestDetailApi(requestId, { signal });
        const dataPayload = result?.data ?? result;
        setDetailData(dataPayload);
      } catch (error) {
        if (isCanceledRequest(error)) return;

        console.error("Lỗi tải chi tiết báo giá mua hộ:", error);
        AuthNotify.error(
          "Không tải được thông tin",
          getApiErrorMessage(error, "Không thể tải chi tiết yêu cầu mua hộ.")
        );
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
    fetchDetail(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchDetail]);

  /* =========================================================
     ACTIONS & DIALOG HANDLERS
     ========================================================= */

  const handleCopyCode = async (code) => {
    if (!code) return;
    try {
      await writeTextToClipboard(code);
      setCopiedCode(code);
      AuthNotify.success("Đã sao chép mã", code);

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCode("");
      }, 1800);
    } catch {
      AuthNotify.error("Sao chép thất bại", "Vui lòng sao chép thủ công.");
    }
  };

  const handleOpenRejectDialog = () => {
    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    if (isActionLoading) return;
    setRejectDialogOpen(false);
  };

  const handleOpenPaymentDialog = () => {
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    if (isActionLoading) return;
    setPaymentDialogOpen(false);
  };

  const handleConfirmRejectQuotation = async (reason) => {
    const quotationId =
      detailData?.quotation?.quotationId ||
      detailData?.quotationId ||
      detailData?.quotation?.id ||
      requestId ||
      detailData?.purchaseRequestId;

    if (!quotationId) {
      AuthNotify.error("Lỗi", "Không tìm thấy mã báo giá để từ chối.");
      return;
    }

    try {
      setIsActionLoading(true);
      setQuotationAction("reject");

      await rejectQuotationApi(quotationId, reason);

      AuthNotify.success(
        "Đã từ chối báo giá",
        "Hệ thống đã ghi nhận phản hồi từ chối của bạn."
      );

      handleCloseRejectDialog();
      fetchDetail();
    } catch (error) {
      console.error("Lỗi từ chối báo giá:", error);
      AuthNotify.error(
        "Từ chối thất bại",
        getApiErrorMessage(error, "Không thể gửi yêu cầu từ chối báo giá.")
      );
    } finally {
      setIsActionLoading(false);
      setQuotationAction("");
    }
  };

  const handleConfirmAndPay = async (selectedMethod) => {
    const quotationId =
      detailData?.quotation?.quotationId ||
      detailData?.quotationId ||
      detailData?.quotation?.id;

    const purchaseRequestId =
      requestId ||
      detailData?.purchaseRequestId ||
      detailData?.id ||
      quotationId;

    if (!purchaseRequestId && !quotationId) {
      AuthNotify.error(
        "Lỗi",
        "Không tìm thấy mã yêu cầu mua hộ để thao tác."
      );
      return;
    }

    try {
      setIsActionLoading(true);
      setQuotationAction(
        selectedMethod === PAYMENT_METHODS.ONLINE ? "pay" : "accept"
      );

      if (selectedMethod === PAYMENT_METHODS.OFFLINE) {
        // acceptQuotationApi prefers quotationId, fallback to purchaseRequestId
        const targetQuotationId = quotationId || purchaseRequestId;
        await acceptQuotationApi(targetQuotationId);

        AuthNotify.success(
          "Đã chấp nhận báo giá",
          "Hệ thống đã ghi nhận việc bạn chấp nhận báo giá."
        );
        handleClosePaymentDialog();
        fetchDetail();
        return;
      }

      if (selectedMethod === PAYMENT_METHODS.ONLINE) {
        const returnUrl = `${window.location.origin}/check-orders/buy-on-behalf/${requestId}?status=success`;
        const cancelUrl = `${window.location.origin}/check-orders/buy-on-behalf/${requestId}?status=cancel`;

        // confirmAndPayQuotationApi prefers purchaseRequestId, fallback to quotationId
        const targetPurchaseRequestId = purchaseRequestId || quotationId;
        const response = await confirmAndPayQuotationApi(targetPurchaseRequestId, {
          returnUrl,
          cancelUrl,
          paymentMethod: "SEPAY",
        });

        const checkoutUrl = getPaymentCheckoutUrl(response);

        AuthNotify.success(
          "Khởi tạo thanh toán thành công",
          "Hệ thống đang chuyển hướng sang trang thanh toán SePay..."
        );

        handleClosePaymentDialog();

        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          fetchDetail();
        }
      }
    } catch (error) {
      console.error("Lỗi xác nhận báo giá / thanh toán:", error);
      AuthNotify.error(
        "Thao tác thất bại",
        getApiErrorMessage(error, "Không thể hoàn tất xác nhận báo giá.")
      );
    } finally {
      setIsActionLoading(false);
      setQuotationAction("");
    }
  };

  /* =========================================================
     COMPUTED DATA
     ========================================================= */

  const requestInfo = detailData || {};
  const quotation = requestInfo.quotation || null;
  const itemsList = Array.isArray(requestInfo.items) ? requestInfo.items : [];
  const quotationItems = Array.isArray(quotation?.items) ? quotation.items : [];
  const additionalFees = Array.isArray(quotation?.additionalFees)
    ? quotation.additionalFees
    : [];

  const productsSubtotal = useMemo(() => {
    if (Number(quotation?.productsSubtotal) > 0) {
      return Number(quotation.productsSubtotal);
    }
    if (Number(quotation?.productsSubTotal) > 0) {
      return Number(quotation.productsSubTotal);
    }
    return quotationItems.reduce((acc, item) => {
      const lineTotal = Number(
        item.lineTotal ?? (Number(item.unitPrice || 0) * Number(item.quantity || 0))
      );
      return acc + lineTotal;
    }, 0);
  }, [quotation, quotationItems]);

  const additionalFeesTotal = useMemo(() => {
    return additionalFees.reduce((acc, fee) => {
      return acc + Number(fee?.amount ?? fee?.feeAmount ?? 0);
    }, 0);
  }, [additionalFees]);

  const serviceFee = useMemo(() => {
    const rawFee =
      quotation?.serviceFee ??
      quotation?.purchaseFee ??
      quotation?.serviceFeeAmount ??
      quotation?.purchaseFeeAmount;

    if (rawFee !== undefined && rawFee !== null && rawFee !== "" && !isNaN(Number(rawFee))) {
      return Number(rawFee);
    }
    return additionalFeesTotal;
  }, [quotation, additionalFeesTotal]);

  const shippingFee = useMemo(() => {
    return Number(
      quotation?.shippingFee ??
      quotation?.freightFee ??
      quotation?.estimatedFreightCharge ??
      0
    );
  }, [quotation]);

  const importTax = useMemo(() => {
    return Number(quotation?.importTax ?? 0);
  }, [quotation]);

  const vat = useMemo(() => {
    return Number(quotation?.vat ?? 0);
  }, [quotation]);

  const computedTotalAmount = useMemo(() => {
    if (additionalFees.length > 0) {
      return productsSubtotal + additionalFeesTotal;
    }
    if (Number(quotation?.totalAmount) > 0) {
      return Number(quotation.totalAmount);
    }
    if (Number(quotation?.totalEstimatedCost) > 0) {
      return Number(quotation.totalEstimatedCost);
    }
    return productsSubtotal + serviceFee + shippingFee + importTax + vat;
  }, [additionalFees.length, productsSubtotal, additionalFeesTotal, quotation, serviceFee, shippingFee, importTax, vat]);

  const servicesSubtotal = useMemo(() => {
    const pSub = Math.max(Number(productsSubtotal || 0), 0);
    const total = Math.max(Number(computedTotalAmount || 0), 0);
    return Math.max(total - pSub, 0);
  }, [productsSubtotal, computedTotalAmount]);

  const servicesDeposit = useMemo(() => {
    return Math.round(servicesSubtotal * 0.5);
  }, [servicesSubtotal]);

  const buyForMeDepositAmount = useMemo(() => {
    const pSub = Math.max(Number(productsSubtotal || 0), 0);
    return pSub + servicesDeposit;
  }, [productsSubtotal, servicesDeposit]);

  const statusNormalized = String(requestInfo.status || "")
    .trim()
    .toUpperCase();
  const quotationStatusNormalized = String(quotation?.status || "")
    .trim()
    .toUpperCase();

  const isQuoted =
    statusNormalized === "QUOTED" ||
    quotationStatusNormalized === "PENDING_CUSTOMER_CONFIRMATION";

  const showQuotationActions = isQuoted && Boolean(quotation);

  return (
    <div
      className={`quotation-detail-page ${
        showQuotationActions ? "has-action-dock" : ""
      }`}
    >
      {/* Top Navigation */}
      <nav className="quotation-navigation">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/check-orders/buy-on-behalf")}
          className="quotation-back-button"
        >
          Quay lại danh sách
        </Button>
        <span>
          Danh sách mua hộ / Chi tiết báo giá:{" "}
          <strong>{requestInfo.purchaseCode || requestId}</strong>
        </span>
      </nav>

      {loading ? (
        <div className="quotation-loading-box">
          <CircularProgress size={36} />
          <div>
            <strong>Đang tải chi tiết báo giá mua hộ...</strong>
            <span>Vui lòng chờ trong giây lát.</span>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <section className="quotation-hero">
            <div className="quotation-hero-main">
              <div className="quotation-hero-icon">
                <ShoppingBagOutlinedIcon fontSize="large" />
              </div>

              <div className="quotation-hero-content">
                <div className="quotation-title-row">
                  <div>
                    <span className="quotation-eyebrow">BÁO GIÁ MUA HỘ</span>
                    <div className="quotation-code-row">
                      <h1>{requestInfo.purchaseCode || "Đang cập nhật"}</h1>
                      {requestInfo.purchaseCode && (
                        <button
                          type="button"
                          className={`quotation-copy-code-button ${
                            copiedCode === requestInfo.purchaseCode
                              ? "is-copied"
                              : ""
                          }`}
                          onClick={() =>
                            handleCopyCode(requestInfo.purchaseCode)
                          }
                        >
                          {copiedCode === requestInfo.purchaseCode ? (
                            <CheckRoundedIcon fontSize="small" />
                          ) : (
                            <ContentCopyRoundedIcon fontSize="small" />
                          )}
                          <span>
                            {copiedCode === requestInfo.purchaseCode
                              ? "Đã sao chép"
                              : "Sao chép mã"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="quotation-status-badge">
                    {formatStatusTag(requestInfo.status)}
                  </div>
                </div>

                <div className="quotation-meta-row">
                  <span>
                    Khách hàng:{" "}
                    <strong>
                      {requestInfo.customerName ||
                        requestInfo.createdByName ||
                        "-"}
                    </strong>
                  </span>
                  <span>
                    Ngày tạo:{" "}
                    <strong>{formatDateDisplay(requestInfo.createdAt)}</strong>
                  </span>
                  <span>
                    Tuyến:{" "}
                    <strong>
                      {requestInfo.route || "Trung Quốc --> Việt Nam"}
                    </strong>
                  </span>
                  <span>
                    Số loại sản phẩm: <strong>{itemsList.length}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="quotation-hero-total">
              <span>TỔNG BÁO GIÁ ĐƠN HÀNG</span>
              <strong>
                {formatVndCurrency(computedTotalAmount)}
              </strong>
              {quotation && buyForMeDepositAmount > 0 && (
                <div style={{ margin: "6px 0 2px", fontSize: "0.92rem", fontWeight: 700, color: "#38bdf8" }}>
                  Tiền cọc online: {formatVndCurrency(buyForMeDepositAmount)}
                </div>
              )}
              <small>
                {quotation
                  ? "100% tiền hàng + 50% phí dịch vụ & cước (Tự động làm tròn)"
                  : "Chờ nhân viên cập nhật báo giá"}
              </small>
            </div>
          </section>

          {/* Summary Info Cards */}
          <section className="quotation-summary-grid">
            <div className="quotation-summary-card">
              <div className="quotation-summary-icon shipping">
                <PersonOutlinedIcon />
              </div>
              <span>Khách hàng</span>
              <strong>
                {requestInfo.customerName ||
                  requestInfo.createdByName ||
                  "Khách hàng"}
              </strong>
            </div>

            <div className="quotation-summary-card">
              <div className="quotation-summary-icon weight">
                <LocalShippingOutlinedIcon />
              </div>
              <span>Tuyến & Gói cước</span>
              <strong>
                {requestInfo.route || "Trung Quốc --> VN"}
                <small>({requestInfo.shippingOption || "Standard"})</small>
              </strong>
            </div>

            <div className="quotation-summary-card">
              <div className="quotation-summary-icon volume">
                <PhoneOutlinedIcon />
              </div>
              <span>Người nhận hàng</span>
              <strong>
                {requestInfo.receiverName || "-"}
                <small>({requestInfo.receiverPhone || "-"})</small>
              </strong>
            </div>

            <div className="quotation-summary-card highlighted">
              <div className="quotation-summary-icon chargeable">
                <ReceiptLongOutlinedIcon />
              </div>
              <span>Tổng sản phẩm</span>
              <strong>
                {requestInfo.totalQuantity ?? 0} <small>món</small>
              </strong>
            </div>
          </section>

          {/* Order Details: 3 Columns Layout (Col 1: Thông tin, Col 2: Dịch vụ chọn, Col 3: Ghi chú) */}
          <section className="quotation-order-summary-3cols">
            {/* Cột 1: Thông tin khách hàng & Giao hàng */}
            <div className="quotation-summary-col">
              <div className="col-header">
                <PersonOutlinedIcon className="col-header-icon" />
                <h3>Thông Tin Giao Hàng</h3>
              </div>
              <div className="col-content">
                <div className="summary-field">
                  <span>Khách hàng yêu cầu</span>
                  <strong>
                    {requestInfo.customerName || requestInfo.createdByName || "-"}
                  </strong>
                </div>
                <div className="summary-field">
                  <span>Người nhận & SĐT</span>
                  <strong>
                    {requestInfo.receiverName || "-"} ({requestInfo.receiverPhone || "-"})
                  </strong>
                </div>
                <div className="summary-field">
                  <span>Tuyến & Gói cước</span>
                  <strong>
                    {requestInfo.route || "Trung Quốc --> VN"} ({requestInfo.shippingOption || "Standard"})
                  </strong>
                </div>
                <div className="summary-field">
                  <span>Địa chỉ nhận hàng</span>
                  <strong>{requestInfo.receiverAddress || "-"}</strong>
                </div>
              </div>
            </div>

            {/* Cột 2: Dịch vụ khách chọn */}
            <div className="quotation-summary-col">
              <div className="col-header">
                <CheckCircleOutlinedIcon className="col-header-icon" />
                <h3>Dịch Vụ Khách Chọn</h3>
              </div>
              <div className="col-content">
                <div
                  className={`service-status-card ${
                    requestInfo.requiresPacking ? "is-active" : ""
                  }`}
                >
                  <span className="service-name">Đóng gói lại</span>
                  <strong className="service-tag">
                    {requestInfo.requiresPacking ? "✓ Đã đăng ký" : "Không yêu cầu"}
                  </strong>
                </div>
                <div
                  className={`service-status-card ${
                    requestInfo.requiresWoodenCrate ? "is-active" : ""
                  }`}
                >
                  <span className="service-name">Đóng thùng gỗ</span>
                  <strong className="service-tag">
                    {requestInfo.requiresWoodenCrate ? "✓ Đã đăng ký" : "Không yêu cầu"}
                  </strong>
                </div>
                <div
                  className={`service-status-card ${
                    requestInfo.requiresInsurance ? "is-active" : ""
                  }`}
                >
                  <span className="service-name">Bảo hiểm hàng hóa</span>
                  <strong className="service-tag">
                    {requestInfo.requiresInsurance ? "✓ Đã đăng ký" : "Không yêu cầu"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Cột 3: Ghi chú đơn hàng */}
            <div className="quotation-summary-col">
              <div className="col-header">
                <ReceiptLongOutlinedIcon className="col-header-icon" />
                <h3>Ghi Chú Đơn Hàng</h3>
              </div>
              <div className="col-content">
                <div className="note-card-box">
                  {requestInfo.generalNote ? (
                    <p>{requestInfo.generalNote}</p>
                  ) : (
                    <span className="no-note-text">
                      Không có ghi chú thêm từ khách hàng.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Products List Section */}
          <section className="quotation-products-section">
            <div className="quotation-card">
              <div className="quotation-section-header">
                <div className="quotation-section-icon product">
                  <ShoppingBagOutlinedIcon />
                </div>
                <div>
                  <h2>Danh sách sản phẩm mua hộ ({itemsList.length})</h2>
                  <p>Chi tiết các mặt hàng yêu cầu mua hộ</p>
                </div>
                <Tag color="orange" className="quotation-products-count">
                  Tổng SL: {requestInfo.totalQuantity ?? 0}
                </Tag>
              </div>

              <div className="quotation-products-grid">
                {itemsList.map((product, idx) => (
                  <article
                    className="product-row-card"
                    key={product.itemId || idx}
                  >
                    {/* Left: Image Gallery */}
                    <div className="product-left-gallery">
                      {Array.isArray(product.imageUrls) &&
                      product.imageUrls.length > 0 ? (
                        <Image.PreviewGroup>
                          <div className="main-image-box">
                            <Image
                              src={product.imageUrls[0]}
                              alt={product.productName}
                              className="main-product-img"
                            />
                            {product.imageUrls.length > 1 && (
                              <span className="img-count-badge">
                                +{product.imageUrls.length - 1} ảnh
                              </span>
                            )}
                          </div>
                          <div style={{ display: "none" }}>
                            {product.imageUrls.slice(1).map((url, imgIdx) => (
                              <Image
                                key={imgIdx}
                                src={url}
                                alt={`${product.productName} ${imgIdx + 2}`}
                              />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      ) : (
                        <div className="no-image-placeholder">🛒</div>
                      )}
                    </div>

                    {/* Right: Product Info */}
                    <div className="product-right-info">
                      <div className="product-header-line">
                        <div className="product-title-group">
                          <span className="product-idx-tag">#{idx + 1}</span>
                          <h3 className="product-title">
                            {(() => {
                              const name = product.productName || product.name || product.title || product.product_name;
                              if (!name || String(name).trim() === String(product.quantity)) {
                                return product.productType || product.categoryName || `Sản phẩm #${idx + 1}`;
                              }
                              return name;
                            })()}
                          </h3>
                        </div>

                        <div className="product-action-tags">
                          {(product.productType || product.categoryName) && (
                            <span className="product-type-pill">
                              {product.productType || product.categoryName}
                            </span>
                          )}
                          {(product.sourceWebsite || product.domain) && (
                            <span className="product-website-pill">
                              {product.sourceWebsite || product.domain}
                            </span>
                          )}
                          {(product.productLink || product.link) && (
                            <a
                              href={product.productLink || product.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="product-external-link"
                            >
                              <OpenInNewIcon fontSize="inherit" /> Link gốc
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="product-details-grid">
                        <div className="detail-item qty-item">
                          <span>SỐ LƯỢNG</span>
                          <strong>{product.quantity || product.qty || 1}</strong>
                        </div>
                        <div className="detail-item">
                          <span>PHẦN LOẠI HÀNG</span>
                          <strong>
                            {(() => {
                              const attr = product.attributes || product.variant || product.classification;
                              if (!attr || String(attr).trim() === String(product.quantity)) {
                                return "Mặc định";
                              }
                              return attr;
                            })()}
                          </strong>
                        </div>
                        <div className="detail-item">
                          <span>NGUỒN HÀNG</span>
                          <strong>{product.sourceWebsite || product.domain || "-"}</strong>
                        </div>

                        {(() => {
                          const qItem = quotationItems.find(
                            (qi) => qi.itemId === product.itemId || qi.itemId === product._id
                          ) || quotationItems[idx];
                          const uPrice = Number(qItem?.unitPrice ?? qItem?.price ?? product.unitPrice ?? product.price || 0);
                          const lTotal = Number(qItem?.lineTotal ?? (uPrice * Number(product.quantity || 1)));

                          if (uPrice <= 0 && lTotal <= 0) return null;

                          return (
                            <>
                              {uPrice > 0 && (
                                <div className="detail-item">
                                  <span>ĐƠN GIÁ BÁO GIÁ</span>
                                  <strong>{formatVndCurrency(uPrice)}</strong>
                                </div>
                              )}
                              {lTotal > 0 && (
                                <div className="detail-item qty-item">
                                  <span>TỔNG TIỀN HÀNG</span>
                                  <strong>{formatVndCurrency(lTotal)}</strong>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {product.note && String(product.note).trim() !== String(product.quantity) && (
                          <div className="detail-item full-row">
                            <span>GHI CHÚ SẢN PHẨM</span>
                            <strong>{product.note}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Fees Detail & Quotation Breakdown */}
          <section className="quotation-main-grid">
            {/* Left Box: Quotation items breakdown & fees table */}
            <div className="quotation-card">
              <div className="quotation-section-header">
                <div className="quotation-section-icon cost">
                  <ReceiptLongOutlinedIcon />
                </div>
                <div>
                  <h2>Bảng giá chi tiết theo báo giá</h2>
                  <p>Đơn giá sản phẩm & Các phụ phí dịch vụ</p>
                </div>
              </div>

              {quotation ? (
                <div className="quotation-breakdown-wrapper">
                  {/* Table Báo giá sản phẩm */}
                  {quotationItems.length > 0 && (
                    <div className="breakdown-block">
                      <div className="block-title">
                        <span>
                          Báo giá đơn hàng sản phẩm ({quotationItems.length})
                        </span>
                        <strong>
                          {formatVndCurrency(productsSubtotal)}
                        </strong>
                      </div>

                      <div className="compact-table-container">
                        <table className="compact-quotation-table">
                          <thead>
                            <tr>
                              <th style={{ width: 42 }}>#</th>
                              <th>Tên sản phẩm</th>
                              <th style={{ textAlign: "right" }}>Đơn giá</th>
                              <th style={{ textAlign: "center", width: 50 }}>
                                SL
                              </th>
                              <th style={{ textAlign: "right" }}>Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotationItems.map((qItem, qIdx) => (
                              <tr key={qItem.quotationItemId || qIdx}>
                                <td
                                  style={{ fontWeight: 800, color: "#94a3b8" }}
                                >
                                  {qIdx + 1}
                                </td>
                                <td>
                                  <strong className="item-name">
                                    {qItem.productName}
                                  </strong>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {formatVndCurrency(qItem.unitPrice)}
                                </td>
                                <td
                                  style={{
                                    textAlign: "center",
                                    fontWeight: 800,
                                  }}
                                >
                                  {qItem.quantity}
                                </td>
                                <td
                                  style={{ textAlign: "right" }}
                                  className="line-total-cell"
                                >
                                  {formatVndCurrency(qItem.lineTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Danh sách phụ phí dịch vụ */}
                  {additionalFees.length > 0 && (
                    <div className="breakdown-block" style={{ marginTop: 14 }}>
                      <div className="block-title">
                        <span>
                          Danh sách phụ phí & Thuế dịch vụ (
                          {additionalFees.length})
                        </span>
                      </div>

                      <div className="additional-fees-compact-grid">
                        {additionalFees.map((fee, fIdx) => (
                          <div className="fee-card-compact" key={fee.id || fIdx}>
                            <div className="fee-card-main">
                              <span className="fee-title">{fee.feeName}</span>
                              {fee.note && (
                                <span className="fee-subnote">{fee.note}</span>
                              )}
                            </div>
                            <strong className="fee-price-tag">
                              +{formatVndCurrency(fee.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="quotation-fee-empty">
                  Đơn hàng hiện chưa có báo giá chi tiết.
                </div>
              )}
            </div>

            {/* Right Box: Billing Summary Card */}
            <div className="quotation-card">
              <div className="quotation-section-header">
                <div className="quotation-section-icon info">
                  <PaymentsOutlinedIcon />
                </div>
                <div>
                  <h2>Tổng hợp chi phí</h2>
                  <p>Bảng kê quyết toán toàn bộ đơn hàng</p>
                </div>
              </div>

              {quotation ? (
                <div className="billing-statement-box">
                  <div className="statement-line">
                    <span>Tiền hàng sản phẩm</span>
                    <strong>
                      {formatVndCurrency(productsSubtotal)}
                    </strong>
                  </div>

                  {additionalFees.length > 0 ? (
                    additionalFees.map((fee, idx) => {
                      const feeAmt = Number(
                        fee?.amount ?? fee?.feeAmount ?? fee?.value ?? 0
                      );
                      if (feeAmt <= 0) return null;
                      return (
                        <div className="statement-line" key={fee.id || idx}>
                          <span>
                            {fee.feeName || fee.name || fee.title || "Phụ phí"}
                          </span>
                          <strong>{formatVndCurrency(feeAmt)}</strong>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {serviceFee > 0 && (
                        <div className="statement-line">
                          <span>Phí dịch vụ mua hộ</span>
                          <strong>{formatVndCurrency(serviceFee)}</strong>
                        </div>
                      )}

                      {shippingFee > 0 && (
                        <div className="statement-line">
                          <span>Phí vận chuyển</span>
                          <strong>{formatVndCurrency(shippingFee)}</strong>
                        </div>
                      )}

                      {importTax > 0 && (
                        <div className="statement-line">
                          <span>Thuế nhập khẩu</span>
                          <strong>
                            {formatVndCurrency(importTax)}
                          </strong>
                        </div>
                      )}

                      {vat > 0 && (
                        <div className="statement-line">
                          <span>Thuế VAT (8%)</span>
                          <strong>{formatVndCurrency(vat)}</strong>
                        </div>
                      )}
                    </>
                  )}

                  <div className="statement-divider" />

                  <div className="statement-line" style={{ background: "rgba(37, 99, 235, 0.07)", padding: "8px 10px", borderRadius: 8, margin: "8px 0", flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, color: "#1d4ed8", fontSize: "0.85rem" }}>
                        Tiền cọc khi thanh toán online
                      </span>
                      <strong style={{ fontSize: "1rem", color: "#1d4ed8", fontWeight: 800 }}>
                        {formatVndCurrency(buyForMeDepositAmount)}
                      </strong>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#475569", background: "rgba(255, 255, 255, 0.8)", padding: "4px 8px", borderRadius: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• Tiền hàng (100%):</span>
                        <strong style={{ color: "#0f172a" }}>{formatVndCurrency(productsSubtotal)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>• Phí dịch vụ & cước (50%):</span>
                        <strong style={{ color: "#0f172a" }}>{formatVndCurrency(servicesDeposit)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="statement-total-banner">
                    <div>
                      <span>TỔNG BÁO GIÁ ĐƠN HÀNG</span>
                      <small>Đã gồm tiền hàng, cước & thuế phí (Hệ thống tự động làm tròn giá tiền)</small>
                    </div>
                    <strong className="grand-price">
                      {formatVndCurrency(computedTotalAmount)}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="quotation-fee-empty">Chưa có thông tin.</div>
              )}
            </div>
          </section>

          {/* Bottom Fixed Action Dock */}
          {showQuotationActions && (
            <aside className="quotation-action-dock is-payment">
              <div className="quotation-action-dock-icon">
                <PaymentRoundedIcon />
              </div>

              <div className="quotation-action-dock-content">
                <span>BÁO GIÁ CHÍNH THỨC MUA HỘ</span>
                <strong>Xác nhận đơn hàng & Chọn phương thức thanh toán</strong>
                <small>
                  Tổng: <b>{formatVndCurrency(computedTotalAmount)}</b>
                  <span style={{ margin: "0 6px", opacity: 0.5 }}>|</span>
                  Cọc online: <b style={{ color: "#38bdf8" }}>{formatVndCurrency(buyForMeDepositAmount)}</b>
                  <span style={{ marginLeft: 6, opacity: 0.85 }}>
                    (100% tiền hàng + 50% phí dịch vụ & cước)
                  </span>
                </small>
              </div>

              <div className="quotation-action-dock-buttons">
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={
                    quotationAction === "reject" ? (
                      <CircularProgress size={17} thickness={5} />
                    ) : (
                      <CloseRoundedIcon />
                    )
                  }
                  onClick={handleOpenRejectDialog}
                  disabled={isActionLoading}
                  className="quotation-reject-button"
                >
                  {quotationAction === "reject" ? "Đang từ chối..." : "Từ chối"}
                </Button>

                <Button
                  type="button"
                  variant="contained"
                  startIcon={
                    quotationAction === "pay" || quotationAction === "accept" ? (
                      <CircularProgress size={17} thickness={5} />
                    ) : (
                      <PaymentRoundedIcon />
                    )
                  }
                  onClick={handleOpenPaymentDialog}
                  disabled={isActionLoading}
                  className="quotation-payment-button"
                >
                  {quotationAction === "pay" || quotationAction === "accept"
                    ? "Đang xử lý..."
                    : "Chọn cách xác nhận"}
                </Button>
              </div>
            </aside>
          )}

          {/* Cancel / Rejection Dialog */}
          <QuotationCancelDialog
            open={rejectDialogOpen}
            loading={quotationAction === "reject"}
            consignmentCode={requestInfo.purchaseCode || requestId}
            totalAmount={computedTotalAmount}
            formatMoney={formatVndCurrency}
            onClose={handleCloseRejectDialog}
            onConfirm={handleConfirmRejectQuotation}
          />

          {/* Payment Confirm Dialog (Offline / Online SePay VietQR) */}
          <QuotationPaymentConfirmDialog
            open={paymentDialogOpen}
            loading={quotationAction === "pay" || quotationAction === "accept"}
            consignmentCode={requestInfo.purchaseCode || requestId}
            totalAmount={computedTotalAmount}
            customDepositAmount={buyForMeDepositAmount}
            customDepositDescription="100% tiền hàng + 50% phí dịch vụ & cước"
            productsSubtotal={productsSubtotal}
            servicesSubtotal={servicesSubtotal}
            servicesDeposit={servicesDeposit}
            formatMoney={formatVndCurrency}
            onClose={handleClosePaymentDialog}
            onConfirm={handleConfirmAndPay}
          />
        </>
      )}
    </div>
  );
};

export default BuyForMeQuotationListDetail;
