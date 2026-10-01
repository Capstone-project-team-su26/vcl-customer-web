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
import { getConsignmentTypeLabel, getRouteLabel } from "@shared/utils/statusLabel";

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

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import {
  acceptQuotationApi,
  confirmAndPayQuotationApi,
  getPaymentCheckoutUrl,
  getPurchaseRequestDetailApi,
  getPurchaseRequestPaymentHistoryApi,
  getPurchaseRequestQuotationApi,
  rejectQuotationApi,
} from "@features/purchase/api/purchaseRequestApi";
import { resolvePrepayState } from "@features/purchase/utils/purchasePayments";
import { getPurchaseStatusLabel } from "@features/purchase/constants/purchaseStages";
import {
  formatUtcDateTime,
  formatVietnamDateTime,
} from "@shared/utils/timeUtc";

import QuotationCancelDialog from "@features/payment/components/QuotationCancelDialog/QuotationCancelDialog";
import QuotationPaymentConfirmDialog, {
  PAYMENT_METHODS,
} from "@features/payment/components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog";

import "./BuyForMeQuotationListDetail.css";
/* Import sâu: chỉ cần bảng đường dẫn, không kéo theo trang của feature orders. */
import {
  ORDER_KINDS,
  PURCHASE_ORDERS_PATH,
  purchaseRequestDetailPath,
} from "@features/orders/constants/orderPaths";
/* Import sâu: barrel payment kéo theo các trang (thứ tự CSS). */
import { openCheckout } from "@features/payment/utils/openCheckout";
import {
  PAYMENT_PURPOSES,
  PAYMENT_SUBJECTS,
  buildPaymentReturnUrls,
  savePendingPayment,
  withPaymentReturnUrls,
} from "@features/payment/utils/pendingPaymentReturn";

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

/* =========================================================
   SỐ TIỀN KHÁCH TRẢ KHI XÁC NHẬN — CHỈ LẤY TỪ BACKEND
   confirm-and-pay tạo khoản thu đúng quotation.prepayAmount (backend mới trả sẵn
   depositAmount / remainingAmount / depositDescription / canPayOnline). FE không tự tính
   cọc nữa: công thức cũ "100% tiền hàng + 50% phí" lệch với số SePay thật.
   ========================================================= */

const PREPAY_FIELDS = [
  "isLegacy",
  "prepayAmount",
  "estimatedLaterAmount",
  "depositAmount",
  "remainingAmount",
  "depositDescription",
  "canPayOnline",
  "domesticShippingFee",
  "freightRatePerKg",
  "estimatedWeight",
  "vatRate",
];

const DEFAULT_PREPAY_DESCRIPTION =
  "Trả trước 100% tiền hàng + phí mua hộ + ship nội địa + phụ phí (+ VAT phần phí). Cước quốc tế, VAT cước và thuế nhập khẩu là tạm tính, thu khi hàng về VN theo cân đo thật.";

const LEGACY_QUOTATION_MESSAGE =
  "Báo giá này lập theo cách tính cũ. Vui lòng liên hệ Sale để lập lại báo giá.";

const toMoneyOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/*
 * Chi tiết yêu cầu trên backend cũ chưa trả phần trả trước; GET .../quotation thì có.
 * Chỉ bổ sung các trường tiền còn thiếu, giữ nguyên danh sách phí của chi tiết.
 */
const hasPrepayFields = (quotation) =>
  quotation?.isLegacy !== undefined || quotation?.depositAmount !== undefined;

const mergePrepayFields = (quotation, source) => {
  if (!quotation || !source) return quotation;
  const merged = { ...quotation };
  PREPAY_FIELDS.forEach((key) => {
    if (merged[key] === undefined && source[key] !== undefined) {
      merged[key] = source[key];
    }
  });
  return merged;
};

const resolvePurchasePayable = (quotation) => {
  if (!quotation || !hasPrepayFields(quotation)) {
    return { known: false, canPayOnline: false, isLegacy: false, depositAmount: null, remainingAmount: null, description: "" };
  }

  const depositAmount =
    toMoneyOrNull(quotation.depositAmount) ?? toMoneyOrNull(quotation.prepayAmount) ?? 0;
  const remainingAmount =
    toMoneyOrNull(quotation.remainingAmount) ?? toMoneyOrNull(quotation.estimatedLaterAmount) ?? 0;
  const isLegacy = quotation.isLegacy === true;
  const canPayOnline =
    typeof quotation.canPayOnline === "boolean"
      ? quotation.canPayOnline
      : !isLegacy && depositAmount > 0;

  return {
    known: true,
    canPayOnline,
    isLegacy,
    depositAmount,
    remainingAmount,
    description:
      quotation.depositDescription ||
      (isLegacy ? LEGACY_QUOTATION_MESSAGE : DEFAULT_PREPAY_DESCRIPTION),
  };
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  return formatVietnamDateTime(value, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

const formatStatusTag = (status, displayName = "") => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "QUOTED":
    case "PENDING_CUSTOMER_CONFIRMATION":
      return <Tag color="gold">Đã báo giá</Tag>;
    case "PENDING_REVIEW":
      return <Tag color="blue">Chờ duyệt</Tag>;
    /* confirm-and-pay đẩy yêu cầu sang WAITING_PAYMENT (backend không có yêu cầu ACCEPTED). */
    case "ACCEPTED":
    case "WAITING_PAYMENT":
      return <Tag color="orange">Chờ thanh toán trả trước</Tag>;
    case "PAID":
      return <Tag color="green">Đã trả trước</Tag>;
    case "APPROVED":
    case "CONFIRMED":
      return <Tag color="green">Đã xác nhận</Tag>;
    case "REJECTED":
    case "QUOTATION_REJECTED":
    case "CANCELLED":
    case "CANCELED":
      return <Tag color="red">Đã từ chối</Tag>;
    default:
      /* Mã khác: bảng trạng thái mua hộ (chữ server chỉ khi đọc được) — không in mã thô. */
      return (
        <Tag color="default">
          {normalized ? getPurchaseStatusLabel(normalized, displayName) : "Chưa xác định"}
        </Tag>
      );
  }
};

/* Trang CSKH (DASHBOARD_ROUTES.customerServiceChat) — khoản trả trước đã huỷ chỉ CSKH mở lại được. */
const CUSTOMER_SERVICE_CHAT_PATH = "/customer-service-chat";

/*
 * Link của khoản đang chờ: link backend lưu lúc tạo khoản (SePay: trang QR của server;
 * payOS: link cổng). Chỉ khoản SePay mới dựng lại được từ orderCode — link payOS mất thì
 * không đoán.
 */
const getPendingCheckoutUrl = (payment) =>
  getPaymentCheckoutUrl({
    checkoutUrl: payment?.checkoutUrl,
    orderCode: payment?.paymentMethod === "PAYOS" ? "" : payment?.orderCode,
  });

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

  /* Khoản thu của yêu cầu (sau khi khách đã chấp nhận báo giá). key = lần tải ứng với dữ liệu. */
  const [paymentsState, setPaymentsState] = useState({ key: "", payments: null, error: false });
  const [paymentsTick, setPaymentsTick] = useState(0);

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
    async (signal, { silent = false } = {}) => {
      if (!requestId) return;

      try {
        if (!silent) setLoading(true);
        const result = await getPurchaseRequestDetailApi(requestId, { signal });
        let dataPayload = result?.data ?? result;

        if (dataPayload?.quotation && !hasPrepayFields(dataPayload.quotation)) {
          try {
            const quotationResult = await getPurchaseRequestQuotationApi(requestId, { signal });
            dataPayload = {
              ...dataPayload,
              quotation: mergePrepayFields(
                dataPayload.quotation,
                quotationResult?.data ?? quotationResult,
              ),
            };
          } catch (quotationError) {
            if (isCanceledRequest(quotationError)) return;
            /* Không lấy được số trả trước → màn chặn thanh toán online thay vì tự đoán số. */
            console.error("Lỗi tải phần trả trước của báo giá mua hộ:", quotationError);
          }
        }

        if (signal?.aborted) return;
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
        /* Trả xong / bấm Huỷ đều về "Thanh toán → Lịch sử giao dịch" phần Mua hộ; backend
           gắn `orderCode` + `status`, banner ở đó báo kết quả hoặc đưa khách về lại màn báo
           giá này khi huỷ (theo bản ghi savePendingPayment bên dưới). */
        const { returnUrl, cancelUrl } = buildPaymentReturnUrls(ORDER_KINDS.purchase);

        // confirmAndPayQuotationApi prefers purchaseRequestId, fallback to quotationId
        const targetPurchaseRequestId = purchaseRequestId || quotationId;
        const response = await confirmAndPayQuotationApi(targetPurchaseRequestId, {
          returnUrl,
          cancelUrl,
          paymentMethod: "SEPAY",
        });

        /* Gắn returnUrl/cancelUrl nếu backend chưa gắn sẵn trên link trang QR SePay. */
        const checkoutUrl = withPaymentReturnUrls(
          getPaymentCheckoutUrl(response),
          ORDER_KINDS.purchase,
        );

        AuthNotify.success(
          "Khởi tạo thanh toán thành công",
          "Hệ thống đang chuyển hướng sang trang thanh toán SePay..."
        );

        handleClosePaymentDialog();

        if (checkoutUrl) {
          /* Ghi khoản vừa tạo: khi SePay trả khách về Lịch sử giao dịch, trang đó biết
             giao dịch nào vừa trả để báo kết quả và dẫn về đúng yêu cầu này. */
          savePendingPayment({
            subject: PAYMENT_SUBJECTS.purchaseRequest,
            targetId: response?.purchaseRequestId || targetPurchaseRequestId,
            purpose: PAYMENT_PURPOSES.purchasePrepay,
            orderCode: response?.orderCode,
            checkoutUrl,
            code: response?.purchaseCode || detailData?.purchaseCode,
            amount: response?.amount,
          });

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

  /*
   * LUỒNG CHUẨN: báo giá tách làm hai phần, số do backend trả.
   *   depositAmount (= prepayAmount)          — khách trả NGAY, đúng số confirm-and-pay tạo khoản thu
   *   remainingAmount (= estimatedLaterAmount) — cước quốc tế + VAT cước + thuế NK, TẠM TÍNH, thu ở VN
   * Báo giá đời cũ (isLegacy): backend không cho thanh toán online → chỉ báo liên hệ Sale.
   */
  const payable = useMemo(() => resolvePurchasePayable(quotation), [quotation]);
  const isSplitQuotation = payable.known && !payable.isLegacy;

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

  const statusNormalized = String(requestInfo.status || "")
    .trim()
    .toUpperCase();
  const quotationStatusNormalized = String(quotation?.status || "")
    .trim()
    .toUpperCase();

  /*
   * KHOẢN TRẢ TRƯỚC SAU KHI CHẤP NHẬN — đọc GET /api/purchase-requests/{id}/payments.
   * confirm-and-pay chỉ chạy một lần (báo giá phải còn PENDING_CUSTOMER_CONFIRMATION); sau
   * đó yêu cầu là WAITING_PAYMENT và khoản PREPAYMENT nằm PENDING kèm link. Trước bản này
   * màn chỉ có thanh xác nhận cho QUOTED → khách bấm "Cần thanh toán" từ danh sách tới đây
   * mà không có gì để trả. Xem features/purchase/utils/purchasePayments.js.
   */
  const purchaseRequestId = requestInfo.purchaseRequestId || requestId;

  /* Lượt đầu (chưa có khoản thu) để biết có cần tải khoản thu không. */
  const needsPayments = ["loading", "unknown", "paid"].includes(
    resolvePrepayState({
      requestStatus: statusNormalized,
      quotationStatus: quotationStatusNormalized,
      hasQuotation: Boolean(quotation),
    }).view
  );

  const paymentsKey =
    !loading && needsPayments && purchaseRequestId
      ? `${purchaseRequestId}|${statusNormalized}|${paymentsTick}`
      : "";

  useEffect(() => {
    if (!paymentsKey) return undefined;

    const controller = new AbortController();

    getPurchaseRequestPaymentHistoryApi(purchaseRequestId, { signal: controller.signal })
      .then((history) => {
        if (controller.signal.aborted) return;
        setPaymentsState({ key: paymentsKey, payments: history?.payments ?? [], error: false });
      })
      .catch((error) => {
        if (controller.signal.aborted || isCanceledRequest(error)) return;
        console.error("Lỗi tải khoản thu của yêu cầu mua hộ:", error);
        setPaymentsState({ key: paymentsKey, payments: null, error: true });
      });

    return () => controller.abort();
  }, [paymentsKey, purchaseRequestId]);

  const paymentsReady = Boolean(paymentsKey) && paymentsState.key === paymentsKey;

  const prepay = resolvePrepayState({
    requestStatus: statusNormalized,
    quotationStatus: quotationStatusNormalized,
    hasQuotation: Boolean(quotation),
    payments: paymentsReady ? paymentsState.payments : null,
    paymentsError: paymentsReady && paymentsState.error,
  });

  const showQuotationActions = prepay.view === "quote" && Boolean(quotation);
  const showPrepayDock =
    !loading && Boolean(quotation) && prepay.view !== "quote" && prepay.view !== "none";

  /* Kiểm tra lại sau khi trả ở tab SePay: tải lại yêu cầu (trạng thái) + khoản thu, không che trang. */
  const refreshPrepay = useCallback(() => {
    setPaymentsTick((tick) => tick + 1);
    fetchDetail(undefined, { silent: true });
  }, [fetchDetail]);

  /* SePay mở ở TAB MỚI: khách quay lại tab này là tự kiểm tra lại. */
  const waitingForMoney = prepay.view === "awaitingPayment" || prepay.view === "verifying";

  useEffect(() => {
    if (!waitingForMoney) return undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshPrepay();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [waitingForMoney, refreshPrepay]);

  /* Mở lại ĐÚNG khoản đang chờ — không gọi confirm-and-pay (backend từ chối lần hai). */
  const handleContinuePayment = () => {
    const payment = prepay.payment;
    const opened = openCheckout(getPendingCheckoutUrl(payment), {
      subject: PAYMENT_SUBJECTS.purchaseRequest,
      targetId: purchaseRequestId,
      purpose: PAYMENT_PURPOSES.purchasePrepay,
      orderCode: payment?.orderCode,
      code: requestInfo.purchaseCode,
      amount: payment?.amount,
    });

    if (!opened) {
      AuthNotify.error(
        "Không mở được trang thanh toán",
        "Khoản trả trước chưa có link thanh toán. Vui lòng liên hệ CSKH để được hỗ trợ."
      );
      return;
    }

    AuthNotify.info(
      "Đã mở trang thanh toán",
      "Quét mã VietQR để trả. Trả xong quay lại đây, màn sẽ tự cập nhật."
    );
  };

  return (
    <div
      className={`quotation-detail-page ${
        showQuotationActions || showPrepayDock ? "has-action-dock" : ""
      }`}
    >
      {/* Top Navigation */}
      <nav className="quotation-navigation">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(PURCHASE_ORDERS_PATH)}
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

                      <div className="quotation-status-badge">
                        {formatStatusTag(requestInfo.status, requestInfo.statusDisplayName)}
                      </div>
                    </div>
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
                      {getRouteLabel(requestInfo.route, "Trung Quốc → Việt Nam")}
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
              {isSplitQuotation && (
                <div style={{ margin: "6px 0 2px", fontSize: "0.92rem", fontWeight: 700, color: "#38bdf8" }}>
                  Trả trước khi xác nhận: {formatVndCurrency(payable.depositAmount)}
                </div>
              )}
              <small>
                {!quotation
                  ? "Chờ nhân viên cập nhật báo giá"
                  : isSplitQuotation
                    ? `Phần còn lại tạm tính ${formatVndCurrency(payable.remainingAmount)}, thu khi hàng về VN`
                    : payable.isLegacy
                      ? LEGACY_QUOTATION_MESSAGE
                      : "Đang cập nhật phần trả trước"}
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
                {getRouteLabel(requestInfo.route, "Trung Quốc → Việt Nam")}
                <small>({getConsignmentTypeLabel(requestInfo.shippingOption || "STANDARD")})</small>
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
                    {getRouteLabel(requestInfo.route, "Trung Quốc → Việt Nam")} ({getConsignmentTypeLabel(requestInfo.shippingOption || "STANDARD")})
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
                          const uPrice = Number(qItem?.unitPrice || qItem?.price || product.unitPrice || product.price || 0);
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

                  {isSplitQuotation ? (
                    <div className="quotation-split">
                      <div className="quotation-split__part quotation-split__part--now">
                        <span className="quotation-split__label">TRẢ TRƯỚC HÔM NAY</span>
                        <strong>{formatVndCurrency(payable.depositAmount)}</strong>
                        <small>
                          Tiền hàng + phí mua hộ + ship nội địa của người bán (đã gồm VAT phần
                          phí). Công ty ứng tiền mua hàng nên phần này thu đủ trước khi đặt.
                        </small>
                      </div>

                      <div className="quotation-split__part quotation-split__part--later">
                        <span className="quotation-split__label">TẠM TÍNH, THU KHI HÀNG VỀ VN</span>
                        <strong>{formatVndCurrency(payable.remainingAmount)}</strong>
                        <small>
                          Cước quốc tế, VAT cước và thuế nhập khẩu. Đây là <b>số tạm tính</b> —
                          kho Việt Nam cân đo lại rồi mới chốt số thật, có thể cao hoặc thấp hơn.
                        </small>
                      </div>
                    </div>
                  ) : (
                    <div className="statement-line" style={{ background: "rgba(245, 158, 11, 0.10)", padding: "8px 10px", borderRadius: 8, margin: "8px 0" }}>
                      <span style={{ fontSize: "0.82rem", color: "#92400e" }}>
                        {payable.isLegacy
                          ? LEGACY_QUOTATION_MESSAGE
                          : "Chưa tải được phần trả trước của báo giá. Vui lòng tải lại trang."}
                      </span>
                    </div>
                  )}

                  <div className="statement-total-banner">
                    <div>
                      <span>TỔNG BÁO GIÁ ĐƠN HÀNG</span>
                      <small>
                        {isSplitQuotation
                          ? "Gồm phần trả trước và phần tạm tính thu ở Việt Nam — số cuối chốt theo cân đo thật"
                          : "Đã gồm tiền hàng, cước & thuế phí (Hệ thống tự động làm tròn giá tiền)"}
                      </small>
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
                  Tổng dự kiến: <b>{formatVndCurrency(computedTotalAmount)}</b>
                  <span style={{ margin: "0 6px", opacity: 0.5 }}>|</span>
                  {payable.canPayOnline ? (
                    <>
                      Trả trước: <b style={{ color: "#38bdf8" }}>{formatVndCurrency(payable.depositAmount)}</b>
                      <span style={{ marginLeft: 6, opacity: 0.85 }}>
                        (còn lại tạm tính {formatVndCurrency(payable.remainingAmount)} thu khi hàng về VN)
                      </span>
                    </>
                  ) : (
                    <span style={{ opacity: 0.85 }}>
                      {payable.isLegacy
                        ? LEGACY_QUOTATION_MESSAGE
                        : "Chưa tải được phần trả trước — chưa thể thanh toán online."}
                    </span>
                  )}
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
                  disabled={isActionLoading || !payable.canPayOnline}
                  className="quotation-payment-button"
                >
                  {quotationAction === "pay" || quotationAction === "accept"
                    ? "Đang xử lý..."
                    : "Chọn cách xác nhận"}
                </Button>
              </div>
            </aside>
          )}

          {/* Sau khi chấp nhận: khoản trả trước đang chờ / đã trả / cần CSKH mở lại */}
          {showPrepayDock && (
            <aside
              className={`quotation-action-dock is-payment quotation-prepay-dock is-${prepay.view}`}
              aria-live="polite"
            >
              <div className="quotation-action-dock-icon">
                {prepay.view === "paid" ? (
                  <TaskAltRoundedIcon />
                ) : prepay.view === "verifying" ? (
                  <AccessTimeOutlinedIcon />
                ) : prepay.view === "reissueNeeded" || prepay.view === "unknown" ? (
                  <InfoOutlinedIcon />
                ) : (
                  <PaymentRoundedIcon />
                )}
              </div>

              <div className="quotation-action-dock-content">
                {prepay.view === "awaitingPayment" && (
                  <>
                    <span>CHỜ BẠN THANH TOÁN TRẢ TRƯỚC</span>
                    <strong>{formatVndCurrency(prepay.amount)}</strong>
                    <small>
                      Bạn đã chấp nhận báo giá. Khoản trả trước
                      {prepay.payment?.orderCode ? <> (mã GD <b>{prepay.payment.orderCode}</b>)</> : null}{" "}
                      đang chờ tiền — bấm Tiếp tục thanh toán để mở lại đúng khoản này.
                    </small>
                  </>
                )}

                {prepay.view === "verifying" && (
                  <>
                    <span>ĐANG ĐỐI SOÁT KHOẢN TRẢ TRƯỚC</span>
                    <strong>{formatVndCurrency(prepay.amount)}</strong>
                    <small>VCL đang xác nhận tiền bạn đã chuyển. Không cần chuyển thêm.</small>
                  </>
                )}

                {prepay.view === "paid" && (
                  <>
                    <span>ĐÃ TRẢ TRƯỚC</span>
                    <strong>
                      {prepay.amount !== null
                        ? formatVndCurrency(prepay.amount)
                        : "VCL đã nhận khoản trả trước"}
                    </strong>
                    <small>VCL đang đặt mua hàng. Theo dõi tiến độ ở chi tiết đơn.</small>
                  </>
                )}

                {prepay.view === "reissueNeeded" && (
                  <>
                    <span>KHOẢN TRẢ TRƯỚC KHÔNG CÒN HIỆU LỰC</span>
                    <strong>Liên hệ CSKH để được cấp lại lần thanh toán</strong>
                    <small>
                      {prepay.payment
                        ? `Khoản ${formatVndCurrency(prepay.amount)}${prepay.payment.orderCode ? ` (mã GD ${prepay.payment.orderCode})` : ""} đã bị huỷ. `
                        : "Chưa có khoản trả trước nào đang chờ. "}
                      Báo giá đã được chấp nhận nên không tạo lại được trên web.
                    </small>
                  </>
                )}

                {prepay.view === "loading" && (
                  <>
                    <span>ĐÃ CHẤP NHẬN BÁO GIÁ</span>
                    <strong>Đang tải khoản trả trước…</strong>
                  </>
                )}

                {prepay.view === "unknown" && (
                  <>
                    <span>ĐÃ CHẤP NHẬN BÁO GIÁ</span>
                    <strong>Không tải được khoản trả trước</strong>
                    <small>Bấm Kiểm tra lại, hoặc xem ở Thanh toán → Cần thanh toán.</small>
                  </>
                )}
              </div>

              <div className="quotation-action-dock-buttons">
                {prepay.view === "paid" ? (
                  <Button
                    type="button"
                    variant="contained"
                    className="quotation-payment-button"
                    onClick={() => navigate(purchaseRequestDetailPath(purchaseRequestId))}
                  >
                    Xem chi tiết đơn
                  </Button>
                ) : (
                  <>
                    {prepay.view !== "reissueNeeded" && (
                      <Button
                        type="button"
                        variant="outlined"
                        startIcon={
                          prepay.view === "loading" ? (
                            <CircularProgress size={17} thickness={5} />
                          ) : (
                            <AutorenewIcon />
                          )
                        }
                        disabled={prepay.view === "loading"}
                        onClick={refreshPrepay}
                        className="quotation-refresh-button"
                      >
                        Kiểm tra lại
                      </Button>
                    )}

                    {prepay.view === "awaitingPayment" && (
                      <Button
                        type="button"
                        variant="contained"
                        startIcon={<PaymentRoundedIcon />}
                        onClick={handleContinuePayment}
                        className="quotation-payment-button"
                      >
                        Tiếp tục thanh toán
                      </Button>
                    )}

                    {prepay.view === "reissueNeeded" && (
                      <Button
                        type="button"
                        variant="contained"
                        onClick={() => navigate(CUSTOMER_SERVICE_CHAT_PATH)}
                        className="quotation-payment-button"
                      >
                        Liên hệ CSKH
                      </Button>
                    )}
                  </>
                )}
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
            customDepositAmount={payable.canPayOnline ? payable.depositAmount : null}
            customDepositDescription={payable.description}
            customRemainingAmount={payable.remainingAmount}
            remainingLabel="Phần tạm tính thu khi hàng về VN (theo cân đo thật)"
            depositBreakdown={[
              { label: "Trả trước hôm nay", amount: payable.depositAmount },
              { label: "Tạm tính, thu khi hàng về VN", amount: payable.remainingAmount },
            ]}
            depositLabel="Trả trước khi xác nhận"
            gatewayText="qua SePay (VietQR)."
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
