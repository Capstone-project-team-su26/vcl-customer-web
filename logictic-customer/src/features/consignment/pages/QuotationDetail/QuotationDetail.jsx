import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Descriptions, Image, Tag } from "antd";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";

import { getConsignmentStatusesApi } from "@features/consignment/api/consignmentStatusApi";
import {
  CONSIGNMENT_PAYMENT_METHODS,
  confirmAndPayConsignmentQuotationApi,
  getConsignmentDetailApi,
  getOrderQuotationApi,
  getProductTypesApi,
  rejectConsignmentQuotationApi,
} from "@features/consignment/api/consignmentApi";

import pricingRuleService from "@features/pricing/api/pricingRuleService";
import { getOrderPaymentHistoryApi } from "@features/payment/api/orderPaymentApi";
import { savePendingConsignmentPayment } from "@features/payment/utils/consignmentPaymentReturn";
import { isSessionExpiredError } from "@shared/api/httpClient";

import QuotationCancelDialog from "@features/payment/components/QuotationCancelDialog/QuotationCancelDialog";
import QuotationPaymentConfirmDialog from "@features/payment/components/QuotationPaymentConfirmDialog/QuotationPaymentConfirmDialog";

/*
 * Nhãn tĩnh và hàm thuần nằm ở file cùng thư mục để phần
 * component bên dưới chỉ còn phần dữ liệu và giao diện.
 */
import {
  QUOTATION_STATUS_FALLBACK_LABELS,
  DEPOSIT_PAYMENT_STATUS_LABELS,
  DEPOSIT_PAYMENT_METHOD_LABELS,
} from "./QuotationDetail.constants";

import {
  normalizeStatus,
  formatStatusCode,
  resolveItemConfigurationFee,
  normalizeStatusOptions,
  getQuoteTypeLabel,
  getConsignmentTypeLabel,
  getStatusClassName,
  getBooleanLabel,
  parseSalesNote,
  normalizeOptionalText,
  getFirstValue,
  extractObjectData,
  normalizeLookupKey,
  hasUiValue,
  isValidExternalUrl,
  resolveSePayCheckoutUrl,
  hasNumberValue,
  normalizeProductTypeOptions,
  buildProductTypeLabelMap,
  resolveProductTypeLabel,
  buildPackageConfigurationMap,
  getQuotationOrderItems,
  buildOrderDisplayData,
  formatItemDimensions,
  getVisibleProductFields,
  getVisibleFeeFields,
  normalizeQuotationTime,
  formatDateTime,
  formatDateTimeUtcTitle,
  isExpiredUtc,
  formatMoney,
  formatNumber,
  formatWeightKg,
  copyTextToClipboard,
  getCostItems,
  groupCostItemsByPackage,
  getQuotationCostSummary,
  getConsignmentCode,
  extractQuotationData,
  getApiErrorMessage,
  isCanceledRequest,
  getActionResponseMessage,
} from "./QuotationDetail.helpers";

import "./QuotationDetail.css";

/* =========================================================
   SUB COMPONENTS
   ========================================================= */

const ProductInfoGrid = ({ item }) => {
  const fields = getVisibleProductFields(item);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="quotation-product-info-grid">
      {fields.map((field) => (
        <div key={field.key} className={field.className || undefined}>
          <span>{field.label}</span>
          <strong>{field.value}</strong>
        </div>
      ))}
    </div>
  );
};

const FeeDetailGrid = ({ fee }) => {
  const fields = getVisibleFeeFields(fee);

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="quotation-fee-detail-grid-inner">
      {fields.map((field) => (
        <div key={field.key}>
          <span>{field.label}</span>
          <strong title={field.title || undefined}>{field.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* =========================================================
   CÁCH TRẢ CỌC — chỉ payOS và chuyển khoản tay (SePay production chưa có khoá webhook)
   ========================================================= */

const formatPercent = (value) =>
  value === null || value === undefined ? "theo cấu hình" : `${value}%`;

const CONSIGNMENT_PAYMENT_OPTIONS = [
  {
    value: CONSIGNMENT_PAYMENT_METHODS.SEPAY,
    title: "Thanh toán online qua SePay",
    subtitle: "Quét VietQR SePay bằng ứng dụng ngân hàng để thanh toán tiền cọc.",
    badge: "SePay",
    icon: CreditCardRoundedIcon,
    requiresDepositRate: false,
    selectedLabel: "Thanh toán online qua SePay",
    confirmLabel: "Xác nhận và thanh toán qua SePay",
    getNoteTitle: ({ depositPercent }) =>
      `Thanh toán cọc ${formatPercent(depositPercent)} qua SePay`,
    getNoteText: () =>
      "Báo giá được xác nhận ngay khi bấm. Hệ thống sẽ mở trang quét VietQR SePay để bạn thanh toán tiền cọc.",
  },
  {
    value: CONSIGNMENT_PAYMENT_METHODS.PAYOS,
    title: "Thanh toán online qua payOS",
    subtitle: "Quét VietQR hoặc dùng ứng dụng ngân hàng trên cổng payOS.",
    badge: "payOS",
    icon: CreditCardRoundedIcon,
    requiresDepositRate: false,
    selectedLabel: "Thanh toán online qua payOS",
    confirmLabel: "Xác nhận và thanh toán qua payOS",
    getNoteTitle: ({ depositPercent }) =>
      `Thanh toán cọc ${formatPercent(depositPercent)} qua payOS`,
    getNoteText: () =>
      "Báo giá được xác nhận ngay khi bấm. Hệ thống tính số tiền cọc chính xác rồi chuyển bạn sang payOS; sau khi thanh toán bạn được đưa về Lịch sử ký gửi.",
  },
  {
    value: CONSIGNMENT_PAYMENT_METHODS.OFFLINE,
    title: "Chuyển khoản ngân hàng",
    subtitle: "Tự chuyển khoản tiền cọc, Admin đối soát rồi xác nhận.",
    badge: "Chuyển khoản",
    icon: AccountBalanceRoundedIcon,
    requiresDepositRate: false,
    selectedLabel: "Chuyển khoản ngân hàng",
    confirmLabel: "Xác nhận và chuyển khoản",
    getNoteTitle: () => "Chuyển khoản tiền cọc",
    getNoteText: () =>
      "Báo giá được xác nhận ngay khi bấm. Hệ thống sẽ hiện số tiền cọc và nội dung chuyển khoản; đơn cập nhật sau khi Admin xác nhận đã nhận tiền.",
  },
];

/* =========================================================
   COMPONENT
   ========================================================= */

const QuotationDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  const locationState = location.state || {};

  const orderSummary =
    locationState?.orderSummary ||
    locationState?.consignment ||
    locationState?.orderDetail ||
    locationState?.order ||
    locationState?.data ||
    null;

  const [quotation, setQuotation] = useState(null);

  const [consignmentDetail, setConsignmentDetail] = useState(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /* 404 "chưa có báo giá": không phải lỗi, hiện màn thông báo nhẹ. */
  const [noQuotationMessage, setNoQuotationMessage] = useState("");

  /* Lịch sử thanh toán (backend) để hiện thông tin cọc sau khi đã xác nhận. */
  const [paymentSummary, setPaymentSummary] = useState(null);

  /* Kết quả confirm-and-pay OFFLINE: hướng dẫn chuyển khoản. */
  const [offlineInstruction, setOfflineInstruction] = useState(null);

  const [, setStatusOptions] = useState([]);

  const [productTypeOptions, setProductTypeOptions] = useState([]);

  const [packageConfigurations, setPackageConfigurations] = useState([]);

  const [copiedConsignmentCode, setCopiedConsignmentCode] = useState("");

  const [quotationAction, setQuotationAction] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const copyResetTimerRef = useRef(null);

  /*
   * Giá trị hiển thị được tạo ngay trong component để mọi handler
   * và phần JSX đều dùng chung một nguồn, không còn lỗi biến ngoài scope.
   */
  const orderDisplayData = useMemo(
    () =>
      buildOrderDisplayData({
        quotation,
        orderSummary,
        consignmentDetail,
        locationState,
      }),
    [quotation, orderSummary, consignmentDetail, locationState],
  );

  const displayConsignmentCode = getConsignmentCode({
    ...orderDisplayData,
    ...quotation,

    consignmentCode:
      quotation?.consignmentCode ||
      orderDisplayData?.consignmentCode,
  });

  /* Mã VCL- thật (không phải chữ "Chưa được cấp mã") cho nội dung chuyển khoản / khoản chờ payOS. */
  const realConsignmentCodeForAction =
    quotation?.consignmentCode ||
    orderDisplayData?.consignmentCode ||
    "";

  const displaySalesNote =
    normalizeOptionalText(
      getFirstValue(
        quotation?.salesNote,
        quotation?.saleNote,
        quotation?.sales_note,
        quotation?.noteFromSales,
        orderDisplayData?.salesNote,
        orderSummary?.salesNote,
        consignmentDetail?.salesNote,
        locationState?.salesNote,
        locationState?.quotation
          ?.salesNote,
        locationState?.data?.salesNote,
        ""
      )
    );

  const fetchQuotation = useCallback(
    async (signal, { showSuccessNotification = false } = {}) => {
      if (!orderId) {
        const missingOrderMessage = "Không tìm thấy mã đơn hàng.";

        setErrorMessage(missingOrderMessage);

        setQuotation(null);
        setLoading(false);

        AuthNotify.error("Không thể tải báo giá", missingOrderMessage);

        return false;
      }

      try {
        setLoading(true);
        setErrorMessage("");
        setNoQuotationMessage("");

        const [
          quotationResult,
          consignmentResult,
          statusesResult,
          productTypesResult,
          packageConfigurationsResult,
        ] = await Promise.allSettled([
          getOrderQuotationApi(orderId, {
            signal,
          }),
          getConsignmentDetailApi(orderId, {
            signal,
          }),
          getConsignmentStatusesApi({
            signal,
          }),

          getProductTypesApi({
            signal,
          }),

          pricingRuleService.getPackageConfigurations({
            signal,
            onlyActive: true,
          }),
        ]);

        if (
          quotationResult.status === "rejected" &&
          quotationResult.reason?.response?.status === 404
        ) {
          /* Đơn chưa có báo giá khách được xem: không bắn toast lỗi. */
          setQuotation(null);
          setConsignmentDetail(null);
          setPaymentSummary(null);
          setNoQuotationMessage(
            getApiErrorMessage(
              quotationResult.reason,
              "Đơn hàng này chưa có báo giá.",
            ),
          );

          return false;
        }

        if (quotationResult.status === "rejected") {
          throw quotationResult.reason;
        }

        const quotationData = extractQuotationData(quotationResult.value);

        if (!quotationData) {
          throw new Error("API không trả về dữ liệu báo giá.");
        }

        setQuotation(normalizeQuotationTime(quotationData));

        /* Đã xác nhận: lấy thông tin cọc do backend tính (không tự tính ở FE). */
        if (normalizeStatus(quotationData.status) === "ACCEPTED") {
          try {
            setPaymentSummary(
              await getOrderPaymentHistoryApi(orderId, { signal }),
            );
          } catch (paymentError) {
            if (isCanceledRequest(paymentError)) {
              throw paymentError;
            }

            console.error("Lỗi lấy thông tin thanh toán cọc:", paymentError);
            setPaymentSummary(null);
          }
        } else {
          setPaymentSummary(null);
        }

        if (consignmentResult.status === "fulfilled") {
          setConsignmentDetail(extractObjectData(consignmentResult.value));
        } else if (!isCanceledRequest(consignmentResult.reason)) {
          console.error(
            "Lỗi lấy đầy đủ dữ liệu đơn ký gửi:",
            consignmentResult.reason,
          );

          setConsignmentDetail(null);

          AuthNotify.warning(
            "Thiếu dữ liệu chi tiết đơn",
            getApiErrorMessage(
              consignmentResult.reason,
              "Báo giá vẫn hiển thị, nhưng một số thông tin sản phẩm có thể chỉ lấy được từ dữ liệu chuyển trang.",
            ),
          );
        }

        if (statusesResult.status === "fulfilled") {
          setStatusOptions(normalizeStatusOptions(statusesResult.value));
        } else if (!isCanceledRequest(statusesResult.reason)) {
          console.error("Lỗi lấy danh sách trạng thái:", statusesResult.reason);

          AuthNotify.warning(
            "Không tải được trạng thái",
            getApiErrorMessage(
              statusesResult.reason,
              "Báo giá vẫn được hiển thị nhưng tên trạng thái có thể chưa được cập nhật.",
            ),
          );
        }

        if (productTypesResult.status === "fulfilled") {
          setProductTypeOptions(
            normalizeProductTypeOptions(productTypesResult.value),
          );
        } else if (!isCanceledRequest(productTypesResult.reason)) {
          console.error("Lỗi lấy loại sản phẩm:", productTypesResult.reason);

          setProductTypeOptions([]);
        }

        if (packageConfigurationsResult.status === "fulfilled") {
          setPackageConfigurations(
            Array.isArray(packageConfigurationsResult.value)
              ? packageConfigurationsResult.value
              : [],
          );
        } else if (!isCanceledRequest(packageConfigurationsResult.reason)) {
          console.error(
            "Lỗi lấy cấu hình thùng:",
            packageConfigurationsResult.reason,
          );

          setPackageConfigurations([]);
        }

        if (showSuccessNotification) {
          AuthNotify.success(
            "Làm mới thành công",
            "Thông tin báo giá đã được cập nhật.",
          );
        }

        return true;
      } catch (error) {
        if (isCanceledRequest(error)) {
          return false;
        }

        console.error("Lỗi lấy chi tiết báo giá:", error);

        const apiMessage = getApiErrorMessage(
          error,
          "Không thể tải thông tin báo giá.",
        );

        setErrorMessage(apiMessage);

        setQuotation(null);
        setConsignmentDetail(null);

        AuthNotify.error("Không thể tải báo giá", apiMessage);

        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchQuotation(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchQuotation]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    },
    [],
  );

  const handleReload = () => {
    const controller = new AbortController();

    fetchQuotation(controller.signal, {
      showSuccessNotification: true,
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCopyConsignmentCode = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      !displayConsignmentCode ||
      displayConsignmentCode === "Chưa được cấp mã"
    ) {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Báo giá chưa có mã vận đơn để sao chép.",
      );
      return;
    }

    try {
      await copyTextToClipboard(displayConsignmentCode);

      setCopiedConsignmentCode(displayConsignmentCode);

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${displayConsignmentCode}.`,
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedConsignmentCode("");
      }, 1800);
    } catch (error) {
      console.error("Không thể sao chép mã vận đơn:", error);

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại.",
      );
    }
  };

  const handleQuotationActionError = (error, title, fallbackMessage) => {
    if (isCanceledRequest(error)) {
      return;
    }

    console.error(title, error);

    const apiMessage = getApiErrorMessage(error, fallbackMessage);

    /*
     * Chỉ 401 body rỗng mới là hết phiên — httpClient đã dọn phiên và chuyển /login.
     * 401/403 có { message } là lỗi nghiệp vụ (ví dụ không phải chủ đơn): hiện message.
     */
    if (isSessionExpiredError(error)) {
      AuthNotify.error(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
      );
      return;
    }

    AuthNotify.error(title, apiMessage);
  };

  const reloadQuotationAfterAction = async () => {
    const refreshController = new AbortController();

    await fetchQuotation(refreshController.signal);
  };

  const handleOpenRejectDialog = () => {
    if (!quotation?.quotationId) {
      AuthNotify.error(
        "Không thể từ chối báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    setRejectDialogOpen(true);
  };

  const handleCloseRejectDialog = () => {
    if (quotationAction === "reject") {
      return;
    }

    setRejectDialogOpen(false);
  };

  const handleConfirmRejectQuotation = async (reasonValue) => {
    const quotationId = quotation?.quotationId;
    const reason = String(reasonValue || "").trim();

    if (!quotationId) {
      AuthNotify.error(
        "Không thể từ chối báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    if (reason.length < 3) {
      AuthNotify.warning(
        "Lý do chưa hợp lệ",
        "Lý do từ chối phải có ít nhất 3 ký tự.",
      );
      return;
    }

    try {
      setQuotationAction("reject");

      const result = await rejectConsignmentQuotationApi(quotationId, reason);

      setRejectDialogOpen(false);

      AuthNotify.success(
        "Từ chối báo giá thành công",
        getActionResponseMessage(
          result,
          "Báo giá đã được từ chối trên hệ thống.",
        ),
      );

      navigate("/history/consignment", {
        replace: true,
        state: {
          quotationRejected: true,
          quotationId,
        },
      });
    } catch (error) {
      handleQuotationActionError(
        error,
        "Từ chối báo giá thất bại",
        "Không thể từ chối báo giá. Vui lòng thử lại.",
      );
    } finally {
      setQuotationAction("");
    }
  };

  const handleOpenPaymentDialog = () => {
    if (!quotation?.quotationId) {
      AuthNotify.error(
        "Không thể xác nhận thanh toán",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    if (quotationAction === "pay") {
      return;
    }

    setPaymentDialogOpen(false);
  };

  const handleConfirmAndPay = async (paymentMethodValue) => {
    const quotationId = quotation?.quotationId;
    const paymentMethod = String(paymentMethodValue || "")
      .trim()
      .toUpperCase();

    if (!quotationId) {
      AuthNotify.error(
        "Không thể xác nhận báo giá",
        "Không tìm thấy mã định danh báo giá.",
      );
      return;
    }

    if (!Object.values(CONSIGNMENT_PAYMENT_METHODS).includes(paymentMethod)) {
      AuthNotify.warning(
        "Chưa chọn phương thức",
        "Vui lòng chọn thanh toán qua payOS hoặc chuyển khoản ngân hàng.",
      );
      return;
    }

    const isOfflinePayment =
      paymentMethod === CONSIGNMENT_PAYMENT_METHODS.OFFLINE;

    try {
      setQuotationAction("pay");

      /* payOS quay về Lịch sử ký gửi; backend tự chọn domain theo returnUrl. */
      const redirectUrl = `${window.location.origin}/history/consignment`;

      const result = await confirmAndPayConsignmentQuotationApi(quotationId, {
        paymentMethod,
        returnUrl: redirectUrl,
        cancelUrl: redirectUrl,
      });

      setPaymentDialogOpen(false);

      const paymentStatus = normalizeStatus(result?.paymentStatus);

      /* Tỷ lệ cọc 0%: backend xác nhận luôn, không có link thanh toán. */
      if (paymentStatus === "PAID") {
        AuthNotify.success(
          "Xác nhận báo giá thành công",
          "Đơn không cần đặt cọc trước. Nhân viên sẽ tiếp tục xử lý đơn.",
        );

        await reloadQuotationAfterAction();
        return;
      }

      if (isOfflinePayment) {
        AuthNotify.success(
          "Đã xác nhận báo giá",
          "Vui lòng chuyển khoản tiền cọc theo hướng dẫn. Đơn được cập nhật sau khi Admin xác nhận.",
        );

        /* Tải lại trước rồi mới mở hướng dẫn: màn "đang tải" không nuốt hộp thoại. */
        await reloadQuotationAfterAction();

        setOfflineInstruction({
          ...result,
          consignmentCode:
            result?.consignmentCode || realConsignmentCodeForAction,
        });

        return;
      }

      const rawCheckoutUrl =
        resolveSePayCheckoutUrl(result) ||
        String(result?.checkoutUrl || "").trim();
      const checkoutUrl = isValidExternalUrl(rawCheckoutUrl)
        ? rawCheckoutUrl
        : "";

      if (!checkoutUrl) {
        /* Báo giá đã ACCEPTED ở backend: không ném lỗi "thất bại", chỉ hướng dẫn tiếp. */
        AuthNotify.warning(
          "Chưa mở được trang thanh toán",
          "Báo giá đã được xác nhận nhưng hệ thống chưa trả link thanh toán. Vui lòng mở Lịch sử thanh toán của đơn để tiếp tục.",
        );

        await reloadQuotationAfterAction();
        return;
      }

      savePendingConsignmentPayment({
        orderCode: result?.orderCode,
        orderId: result?.orderId || orderId,
        consignmentCode:
          result?.consignmentCode || realConsignmentCodeForAction,
        amount: result?.amount,
      });

      const gatewayLabel =
        paymentMethod === CONSIGNMENT_PAYMENT_METHODS.SEPAY
          ? "SePay"
          : "payOS";

      AuthNotify.success(
        "Đã tạo thanh toán cọc",
        `Đang chuyển sang ${gatewayLabel} để thanh toán ${formatMoney(result?.amount)}.`,
      );

      window.location.assign(checkoutUrl);
    } catch (error) {
      const isSepay = paymentMethod === CONSIGNMENT_PAYMENT_METHODS.SEPAY;
      const gatewayName = isSepay ? "SePay" : "payOS";

      handleQuotationActionError(
        error,
        isOfflinePayment
          ? "Xác nhận báo giá thất bại"
          : `Khởi tạo thanh toán ${gatewayName} thất bại`,
        isOfflinePayment
          ? "Không thể xác nhận báo giá. Vui lòng thử lại."
          : `Không thể mở trang thanh toán ${gatewayName}. Vui lòng thử lại.`,
      );
    } finally {
      setQuotationAction("");
    }
  };

  /*
   * Nhãn trạng thái BÁO GIÁ. Không trộn danh sách trạng thái ĐƠN vào đây:
   * trạng thái đơn đã có module dùng chung riêng (constants/orderStatus).
   */
  const getQuotationStatusLabel = useCallback(
    (status) => {
      const normalizedStatus = normalizeStatus(status);

      return (
        QUOTATION_STATUS_FALLBACK_LABELS[normalizedStatus] ||
        formatStatusCode(normalizedStatus) ||
        "-"
      );
    },
    [],
  );

  const costItems = useMemo(() => {
    if (!quotation) {
      return [];
    }

    return getCostItems(quotation);
  }, [quotation]);

  const costSummary = useMemo(
    () => getQuotationCostSummary(quotation, costItems),
    [quotation, costItems],
  );

  /*
   * additionalFees là chi tiết của serviceFee.
   * Mỗi dòng đã được tính trong Phí dịch vụ,
   * không cộng lại vào tổng báo giá.
   */
  const reconciledCostItems = useMemo(
    () =>
      costItems.map((item) => ({
        ...item,

        includedInTotal: Boolean(item?.enabled),

        reconciliationStatus: item?.enabled
          ? "included-in-service"
          : "disabled",

        reconciliationNote: item?.enabled
          ? "Khoản phí này đã được tổng hợp trong trường Phí dịch vụ của báo giá."
          : "Khoản phí hiện chưa được áp dụng.",
      })),
    [costItems],
  );

  const appliedCostItems = useMemo(
    () => reconciledCostItems.filter((item) => item.enabled),
    [reconciledCostItems],
  );

  /* Phí thùng + dịch vụ theo từng kiện, rồi phí cả đơn (additionalFees[].orderItemId). */
  const appliedCostGroups = useMemo(
    () => groupCostItemsByPackage(appliedCostItems),
    [appliedCostItems],
  );

  const activeCostTotal = costSummary.serviceFee;

  const baseCostTotal =
    costSummary.freight +
    costSummary.domesticShippingFee +
    costSummary.taxAndDuty;

  const displayTotalCost =
    costSummary.displayTotal;

  /* Tiền cọc không tính ở FE: số thật do backend trả khi xác nhận / trong lịch sử thanh toán. */

  const productTypeLabelMap = useMemo(
    () => buildProductTypeLabelMap(productTypeOptions),
    [productTypeOptions],
  );

  const packageConfigurationMap = useMemo(
    () => buildPackageConfigurationMap(packageConfigurations),
    [packageConfigurations],
  );

  const rawQuotationOrderItems = useMemo(
    () =>
      getQuotationOrderItems(
        quotation,
        orderSummary,
        consignmentDetail,
        locationState,
      ),
    [quotation, orderSummary, consignmentDetail, locationState],
  );

  const quotationOrderItems = useMemo(
    () =>
      rawQuotationOrderItems.map((item) => {
        const configuration =
          packageConfigurationMap.get(
            normalizeLookupKey(item?.configurationId),
          ) ||
          packageConfigurationMap.get(
            normalizeLookupKey(item?.configurationCode),
          ) ||
          null;

        return {
          ...item,

          productTypeLabel: resolveProductTypeLabel(item, productTypeLabelMap),

          configurationName:
            item?.configurationName ||
            configuration?.configName ||
            configuration?.name ||
            "",

          configurationCode:
            item?.configurationCode ||
            configuration?.configCode ||
            configuration?.code ||
            "",

          configurationFee: resolveItemConfigurationFee(item, configuration),
          isCustomConfig: String(
            item?.configurationCode || configuration?.configCode || configuration?.code || ""
          ).trim().toUpperCase() === "CUSTOM",
        };
      }),
    [rawQuotationOrderItems, productTypeLabelMap, packageConfigurationMap],
  );

  const orderSummaryFields = useMemo(() => {
    const fields = [];

    const add = (key, label, value, className = "") => {
      if (!hasUiValue(value)) {
        return;
      }

      fields.push({
        key,
        label,
        value,
        className,
      });
    };

    if (quotationOrderItems.length > 0) {
      add(
        "productCount",
        "Số sản phẩm",
        `${quotationOrderItems.length} sản phẩm`,
      );
    }

    add("receiverName", "Người nhận", orderDisplayData.receiverName);

    add("receiverPhone", "Số điện thoại", orderDisplayData.receiverPhone);

    add("route", "Tuyến vận chuyển", orderDisplayData.route);

    if (hasUiValue(orderDisplayData.shippingOption)) {
      add(
        "shippingOption",
        "Hình thức vận chuyển",
        getConsignmentTypeLabel(orderDisplayData.shippingOption),
      );
    }

    if (typeof orderDisplayData.requiresInspection === "boolean") {
      add(
        "inspection",
        "Yêu cầu kiểm hàng",
        getBooleanLabel(orderDisplayData.requiresInspection),
      );
    }

    add(
      "receiverAddress",
      "Địa chỉ nhận hàng",
      orderDisplayData.receiverAddress,
      "is-address",
    );

    return fields;
  }, [quotationOrderItems.length, orderDisplayData]);

  if (loading) {
    return (
      <div className="quotation-detail-page">
        <div className="quotation-loading-box">
          <CircularProgress size={42} />

          <div>
            <strong>Đang tải thông tin báo giá</strong>

            <span>Vui lòng chờ trong giây lát...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation && noQuotationMessage) {
    return (
      <div className="quotation-detail-page">
        <div className="quotation-error-box">
          <div className="quotation-error-icon">📄</div>

          <h2>Chưa có báo giá</h2>

          <p>
            {noQuotationMessage} Nhân viên sẽ gửi báo giá sau khi kiểm tra đơn;
            bạn có thể quay lại sau.
          </p>

          <div className="quotation-error-actions">
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
              startIcon={<AutorenewIcon />}
              onClick={handleReload}
            >
              Tải lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="quotation-detail-page">
        <div className="quotation-error-box">
          <div className="quotation-error-icon">📄</div>

          <h2>Không tìm thấy báo giá</h2>

          <p>
            {errorMessage ||
              "Đơn hàng chưa có báo giá hoặc báo giá không tồn tại."}
          </p>

          <div className="quotation-error-actions">
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
              startIcon={<AutorenewIcon />}
              onClick={handleReload}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasExpired = isExpiredUtc(
    quotation.expiredAtUtc || quotation.expiredAt,
  );

  const quotationStatus = normalizeStatus(quotation.status);

  const completedStatuses = [
    "APPROVED",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "CANCELED",
    "PAID",
  ];

  const effectiveStatus =
    hasExpired && !completedStatuses.includes(quotationStatus)
      ? "EXPIRED"
      : quotation.status;

  const effectiveStatusClass = getStatusClassName(effectiveStatus);

  /*
   * Nút "Xác nhận & thanh toán" chỉ theo cờ canCustomerAccept của backend
   * (báo giá chính thức đã gửi, còn hiệu lực, không chờ duyệt giá).
   * Báo giá tạm tính (DRAFT) chỉ để xem. Từ chối: backend chỉ nhận báo giá PENDING.
   */
  const canConfirmAndPay =
    quotation.canCustomerAccept === true &&
    Boolean(quotation.quotationId);

  const canRejectQuotation =
    quotationStatus === "PENDING" &&
    !hasExpired &&
    Boolean(quotation.quotationId);

  const showQuotationActions = canConfirmAndPay || canRejectQuotation;

  const isEstimateOnly = quotationStatus === "DRAFT";

  const depositPayments = (
    Array.isArray(paymentSummary?.payments) ? paymentSummary.payments : []
  ).filter(
    (payment) => normalizeStatus(payment?.installmentType) === "DEPOSIT",
  );

  const isActionLoading = Boolean(quotationAction);

  /*
   * Không dùng hook tại đây vì phía trên có các nhánh
   * return cho loading và lỗi. Dùng hàm thuần giúp số lượng
   * hook luôn giống nhau giữa mọi lần render.
   */
  const saleNoteData =
    parseSalesNote(
      displaySalesNote
    );

  const summaryCards = [
    hasUiValue(quotation.consignmentType) && {
      key: "shipping",
      label: "Loại vận chuyển",
      value: getConsignmentTypeLabel(quotation.consignmentType),
      iconClass: "shipping",
      icon: <LocalShippingOutlinedIcon />,
    },

    hasNumberValue(quotation.totalWeight) && {
      key: "weight",
      label: "Trọng lượng thực",
      value: (
        <>
          {formatWeightKg(quotation.totalWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "weight",
      icon: <ScaleOutlinedIcon />,
    },

    hasNumberValue(quotation.volumetricWeight) && {
      key: "volume",
      label: "Trọng lượng quy đổi",
      value: (
        <>
          {formatWeightKg(quotation.volumetricWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "volume",
      icon: <Inventory2OutlinedIcon />,
    },

    hasNumberValue(quotation.chargeableWeight) && {
      key: "chargeable",
      label: "Trọng lượng tính cước",
      value: (
        <>
          {formatWeightKg(quotation.chargeableWeight)}
          <small> kg</small>
        </>
      ),
      iconClass: "chargeable",
      highlighted: true,
      icon: <PaymentsOutlinedIcon />,
    },
  ].filter(Boolean);

  const descriptionRows = [];

  const addDescription = (key, label, visible, content) => {
    if (!visible) {
      return;
    }

    descriptionRows.push({
      key,
      label,
      content,
    });
  };

  const realConsignmentCode = getFirstValue(
    quotation?.consignmentCode,
    orderDisplayData?.consignmentCode,
  );

  addDescription(
    "consignmentCode",
    "Mã vận đơn",
    hasUiValue(realConsignmentCode),
    <div className="quotation-description-code">
      <span className="quotation-id-text">{realConsignmentCode}</span>

      <button
        type="button"
        className={[
          "quotation-inline-copy-button",
          copiedConsignmentCode === displayConsignmentCode && "is-copied",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleCopyConsignmentCode}
        aria-label={`Sao chép mã vận đơn ${displayConsignmentCode}`}
      >
        {copiedConsignmentCode === displayConsignmentCode ? (
          <CheckRoundedIcon />
        ) : (
          <ContentCopyRoundedIcon />
        )}
      </button>
    </div>,
  );

  addDescription(
    "quoteType",
    "Loại báo giá",
    hasUiValue(quotation.quoteType),
    <Tag color="blue">{getQuoteTypeLabel(quotation.quoteType)}</Tag>,
  );

  addDescription(
    "status",
    "Trạng thái",
    hasUiValue(effectiveStatus),
    <span className={`quotation-inline-status status-${effectiveStatusClass}`}>
      {getQuotationStatusLabel(effectiveStatus)}
    </span>,
  );

  [
    [
      "consignmentType",
      "Loại vận chuyển",
      quotation.consignmentType,
      hasUiValue(quotation.consignmentType)
        ? getConsignmentTypeLabel(quotation.consignmentType)
        : "",
    ],
    [
      "route",
      "Tuyến vận chuyển",
      orderDisplayData.route,
      orderDisplayData.route,
    ],
    [
      "receiverName",
      "Người nhận",
      orderDisplayData.receiverName,
      orderDisplayData.receiverName,
    ],
    [
      "receiverPhone",
      "Số điện thoại người nhận",
      orderDisplayData.receiverPhone,
      orderDisplayData.receiverPhone,
    ],
    [
      "customerName",
      "Khách hàng",
      orderDisplayData.customerName,
      orderDisplayData.customerName,
    ],
    [
      "customerEmail",
      "Email khách hàng",
      orderDisplayData.customerEmail,
      orderDisplayData.customerEmail,
    ],
    [
      "customerPhone",
      "Số điện thoại khách hàng",
      orderDisplayData.customerPhone,
      orderDisplayData.customerPhone,
    ],
  ].forEach(([key, label, rawValue, content]) => {
    addDescription(key, label, hasUiValue(rawValue), content);
  });

  addDescription(
    "receiverAddress",
    "Địa chỉ nhận hàng",
    hasUiValue(orderDisplayData.receiverAddress),
    <span className="quotation-description-full-text">
      {orderDisplayData.receiverAddress}
    </span>,
  );

  addDescription(
    "inspection",
    "Yêu cầu kiểm hàng",
    typeof orderDisplayData
      .requiresInspection ===
    "boolean",
    getBooleanLabel(
      orderDisplayData
        .requiresInspection
    ),
  );





  const costOverviewItems = [
    {
      key: "freight",
      className: "is-freight",
      label: "Cước vận chuyển quốc tế",
      value: costSummary.freight,
      rawValue: quotation.estimatedFreightCharge,
      description: "Cước vận chuyển chính của đơn hàng",
    },
    {
      key: "domestic",
      className: "is-domestic",
      label: "Phí vận chuyển nội địa",
      value: costSummary.domesticShippingFee,
      rawValue: quotation.domesticShippingFee,
      description: "Chi phí giao nhận trong nước",
    },
    {
      key: "service",
      className: "is-service",
      label: "Phí dịch vụ và phụ phí",
      value: costSummary.serviceFee,
      rawValue: quotation.serviceFee,
      description: "Tổng các dịch vụ bổ sung",
    },
    {
      key: "tax",
      className: "is-tax",
      label: "Thuế và phí nhập khẩu",
      value: costSummary.taxAndDuty,
      rawValue: quotation.taxAndDuty,
      description: "Bao gồm VAT và thuế nhập khẩu",
    },
  ].filter((item) => hasNumberValue(item.rawValue));

  const taxBreakdownItems = [

  ].filter((item) => hasNumberValue(item.rawValue));

  const timeItems = [
    {
      key: "created",
      label: "Ngày tạo đơn",
      value:
        consignmentDetail?.createdAtUtc ||
        consignmentDetail?.createdAt,
      dotClass: "created",
    },
    {
      key: "quotationCreated",
      label: "Ngày báo giá",
      value:
        quotation.quotationCreatedAtUtc ||
        quotation.quotationCreatedAt ||
        quotation.createdAtUtc ||
        quotation.createdAt,
      dotClass: "active",
    },
    {
      key: "expired",
      label: "Ngày hết hạn",
      value: quotation.expiredAtUtc || quotation.expiredAt,
      dotClass: hasExpired ? "expired" : "active",
    },
  ].filter((item) => hasUiValue(item.value));


  return (
    <div
      className={[
        "quotation-detail-page",
        showQuotationActions && "has-action-dock",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="quotation-navigation">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          className="quotation-back-button"
        >
          Quay lại danh sách
        </Button>

        <span>Theo dõi báo giá / Chi tiết</span>
      </div>

      <section className="quotation-hero" aria-label="Tổng quan báo giá">
        <div className="quotation-hero-main">
          <div className="quotation-hero-icon">
            <ReceiptLongOutlinedIcon />
          </div>

          <div className="quotation-hero-content">
            <div className="quotation-title-row">
              <div className="quotation-code-group">
                <span className="quotation-eyebrow">Mã vận đơn</span>

                <div className="quotation-code-row">
                  <h1 title={displayConsignmentCode}>
                    {displayConsignmentCode}
                  </h1>

                  <button
                    type="button"
                    className={[
                      "quotation-copy-code-button",
                      copiedConsignmentCode === displayConsignmentCode &&
                      "is-copied",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={displayConsignmentCode === "Chưa được cấp mã"}
                    onClick={handleCopyConsignmentCode}
                    title="Sao chép mã vận đơn"
                    aria-label={`Sao chép mã vận đơn ${displayConsignmentCode}`}
                  >
                    {copiedConsignmentCode === displayConsignmentCode ? (
                      <>
                        <CheckRoundedIcon />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <ContentCopyRoundedIcon />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>

                  <span
                    className={`quotation-status-badge status-${effectiveStatusClass}`}
                  >
                    {getQuotationStatusLabel(effectiveStatus)}
                  </span>
                </div>
              </div>
            </div>


            {(hasUiValue(quotation.quoteType) ||
              hasUiValue(quotation.quotationCreatedAtUtc || quotation.quotationCreatedAt || quotation.createdAtUtc || quotation.createdAt)) && (
                <div className="quotation-meta-row">
                  {hasUiValue(quotation.quoteType) && (
                    <span>
                      Loại báo giá
                      <strong>{getQuoteTypeLabel(quotation.quoteType)}</strong>
                    </span>
                  )}

                  {hasUiValue(quotation.quotationCreatedAtUtc || quotation.quotationCreatedAt || quotation.createdAtUtc || quotation.createdAt) && (
                    <span>
                      Ngày báo giá
                      <strong
                        title={formatDateTimeUtcTitle(
                          quotation.quotationCreatedAtUtc || quotation.quotationCreatedAt || quotation.createdAtUtc || quotation.createdAt,
                        )}
                      >
                        {formatDateTime(
                          quotation.quotationCreatedAtUtc || quotation.quotationCreatedAt || quotation.createdAtUtc || quotation.createdAt,
                        )}
                      </strong>
                    </span>
                  )}

                  {hasUiValue(consignmentDetail?.createdAtUtc || consignmentDetail?.createdAt) && (
                    <span>
                      Ngày tạo đơn
                      <strong
                        title={formatDateTimeUtcTitle(
                          consignmentDetail?.createdAtUtc || consignmentDetail?.createdAt,
                        )}
                      >
                        {formatDateTime(
                          consignmentDetail?.createdAtUtc || consignmentDetail?.createdAt,
                        )}
                      </strong>
                    </span>
                  )}
                </div>
              )}
          </div>
        </div>

        <div className="quotation-hero-total">
          <span>Tổng chi phí theo báo giá</span>

          <strong>{formatMoney(displayTotalCost)}</strong>

          {hasUiValue(quotation.expiredAtUtc || quotation.expiredAt) && (
            <small
              title={formatDateTimeUtcTitle(
                quotation.expiredAtUtc || quotation.expiredAt,
              )}
            >
              Có hiệu lực đến{" "}
              {formatDateTime(quotation.expiredAtUtc || quotation.expiredAt)}
            </small>
          )}
        </div>
      </section>

      {summaryCards.length > 0 && (
        <section
          className="quotation-summary-grid"
          style={{
            "--summary-count": summaryCards.length,
          }}
        >
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className={[
                "quotation-summary-card",
                card.highlighted && "highlighted",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={`quotation-summary-icon ${card.iconClass}`}>
                {card.icon}
              </div>

              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </section>
      )}
      {orderSummaryFields.length > 0 && (
        <section className="quotation-order-summary is-full-data">
          {orderSummaryFields.map((field) => (
            <div key={field.key} className={field.className || undefined}>
              <span>{field.label}</span>
              <strong>{field.value}</strong>
            </div>
          ))}
        </section>
      )}

      {isEstimateOnly && (
        <section className="quotation-card" aria-label="Báo giá tạm tính">
          <div className="quotation-section-header">
            <div className="quotation-section-icon info">
              <InfoOutlinedIcon />
            </div>

            <div>
              <h2>Báo giá tạm tính</h2>

              <p>
                Số liệu chỉ để tham khảo. Nhân viên sẽ kiểm tra đơn và gửi báo giá
                chính thức; khi đó bạn mới xác nhận và đặt cọc được.
              </p>
            </div>
          </div>
        </section>
      )}

      {quotationStatus === "ACCEPTED" && (
        <section className="quotation-card" aria-label="Thông tin đặt cọc">
          <div className="quotation-section-header">
            <div className="quotation-section-icon cost">
              <PaymentsOutlinedIcon />
            </div>

            <div>
              <h2>Thông tin đặt cọc</h2>

              <p>
                {paymentSummary
                  ? "Số tiền do hệ thống tính khi bạn xác nhận báo giá."
                  : "Báo giá đã được xác nhận. Xem chi tiết các khoản thanh toán trong lịch sử thanh toán."}
              </p>
            </div>

            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/orders/${orderId}/payments/history`)}
            >
              Lịch sử thanh toán
            </Button>
          </div>

          {paymentSummary && (
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="quotation-descriptions"
            >
              <Descriptions.Item label="Tổng hoá đơn">
                {formatMoney(paymentSummary.totalBillAmount)}
              </Descriptions.Item>

              {depositPayments.map((payment, index) => (
                <Descriptions.Item
                  key={payment.paymentId || `deposit-${index}`}
                  label={
                    depositPayments.length > 1
                      ? `Tiền cọc (lần ${index + 1})`
                      : "Tiền cọc"
                  }
                >
                  <strong>{formatMoney(payment.amount)}</strong>
                  {" · "}
                  {DEPOSIT_PAYMENT_METHOD_LABELS[
                    normalizeStatus(payment.paymentMethod)
                  ] || formatStatusCode(payment.paymentMethod)}
                  {" · "}
                  {DEPOSIT_PAYMENT_STATUS_LABELS[
                    normalizeStatus(payment.status)
                  ] || formatStatusCode(payment.status)}
                </Descriptions.Item>
              ))}

              <Descriptions.Item label="Đã thanh toán">
                {formatMoney(paymentSummary.totalPaid)}
              </Descriptions.Item>

              <Descriptions.Item label="Còn lại">
                {formatMoney(paymentSummary.remaining)}
              </Descriptions.Item>
            </Descriptions>
          )}
        </section>
      )}

      {quotationOrderItems.length > 0 && (
        <section
          className="quotation-card quotation-products-section"
          aria-label="Danh sách sản phẩm"
        >
          <div className="quotation-section-header">
            <div className="quotation-section-icon product">
              <Inventory2OutlinedIcon />
            </div>

            <div>
              <h2>Thông tin danh sách sản phẩm</h2>

              <p>
                Mỗi sản phẩm hiển thị nguyên một hàng ngang, đầy đủ số lượng,
                cân nặng, kích thước, giá trị và mã vận đơn.
              </p>
            </div>

            <Tag color="blue" className="quotation-products-count">
              {quotationOrderItems.length} sản phẩm
            </Tag>
          </div>

          <div className="quotation-products-table-wrapper">
            <table className="quotation-products-table">
              <thead>
                <tr>
                  <th style={{ width: "55px", textAlign: "center" }}>STT</th>
                  <th style={{ width: "70px", textAlign: "center" }}>Ảnh</th>
                  <th style={{ textAlign: "left", paddingLeft: "16px" }}>
                    Tên sản phẩm & Danh mục
                  </th>
                  <th style={{ width: "95px", textAlign: "center" }}>Số lượng</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Trọng lượng</th>
                  <th style={{ width: "135px", textAlign: "center" }}>Kích thước</th>
                  <th style={{ width: "135px", textAlign: "right" }}>Giá trị khai báo</th>
                  <th style={{ width: "160px", textAlign: "left", paddingLeft: "14px" }}>
                    Cấu hình đóng gói
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotationOrderItems.map((item, index) => (
                  <tr key={item.id || `product-${index + 1}`}>
                    <td style={{ textAlign: "center" }}>
                      <span className="product-table-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.images && item.images.length > 0 ? (
                        <Image.PreviewGroup>
                          <div className="product-table-image-box">
                            <Image
                              src={item.images[0].url}
                              width={44}
                              height={44}
                              alt={item.productName}
                              style={{ objectFit: "cover", borderRadius: 8 }}
                              preview={{ mask: "Xem" }}
                            />
                            {item.images.length > 1 && (
                              <span className="product-table-img-badge">
                                +{item.images.length - 1}
                              </span>
                            )}
                          </div>
                        </Image.PreviewGroup>
                      ) : (
                        <div className="product-table-no-img">N/A</div>
                      )}
                    </td>
                    <td style={{ textAlign: "left", paddingLeft: "16px" }}>
                      <div className="product-table-name-group">
                        <strong className="product-table-title">
                          {item.productName}
                        </strong>


                        {hasUiValue(item.productTypeLabel) && (
                          <span className="product-table-category">
                            {item.productTypeLabel}
                          </span>
                        )}

                        {isValidExternalUrl(item.productUrl) && (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="product-table-link"
                          >
                            Link sản phẩm ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="product-table-badge">
                        {item.quantity ? `${item.quantity} cái` : "-"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{formatNumber(item.weight)} kg</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span>
                        {formatItemDimensions(item) || "-"}
                      </span>
                      {hasUiValue(item.volumeCbm) && (
                        <small className="product-table-sub">
                          {item.volumeCbm} cm³
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong className="product-table-price">
                        {formatMoney(item.declaredValue)}
                      </strong>
                    </td>
                    <td>
                      {item.configurationName || item.configurationCode ? (
                        <div className="product-table-config-tag">
                          <span>
                            {item.configurationName ||
                              formatStatusCode(item.configurationCode)}
                          </span>
                          {item.configurationFee !== null && (
                            <small>
                              +{formatMoney(item.configurationFee)}
                              {item.isCustomConfig && (
                                <span style={{ fontSize: "10px", display: "block", color: "#8c8c8c", fontWeight: 400 }}>
                                  (tính theo thể tích)
                                </span>
                              )}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="product-table-empty">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </section>
      )}
      <div
        className="quotation-main-grid"
        aria-label="Chi phí và thông tin báo giá"
      >
        <section className="quotation-card quotation-cost-card">
          <div className="quotation-section-header">
            <div className="quotation-section-icon cost">
              <PaymentsOutlinedIcon />
            </div>

            <div>
              <h2>Chi tiết chi phí</h2>

              <p>Các khoản chi phí được trình bày rõ ràng và đồng nhất</p>
            </div>
          </div>

          {costOverviewItems.length > 0 && (
            <div className="quotation-base-cost-grid is-complete-api">
              {costOverviewItems.map((item) => (
                <div key={item.key} className={item.className}>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          )}

          {taxBreakdownItems.length > 0 && (
            <div className="quotation-tax-breakdown">
              {taxBreakdownItems.map((item) => (
                <div key={item.key} className={item.className || undefined}>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          )}

          <div className="quotation-cost-list">
            <div className="quotation-cost-list-heading">
              <div>
                <strong>Chi tiết phí dịch vụ</strong>
                <span>
                  {appliedCostItems.length} khoản đã tính trong phí dịch vụ
                </span>
              </div>

              <strong>{formatMoney(activeCostTotal)}</strong>
            </div>

            {appliedCostItems.length === 0 ? (
              <div className="quotation-cost-row">
                <span>
                  <span>Không có phụ phí</span>

                  <small>API hiện không có chi tiết dịch vụ bổ sung.</small>
                </span>

                <strong>{formatMoney(0)}</strong>
              </div>
            ) : (
              appliedCostGroups.map((group) => (
                <div key={group.key} className="quotation-cost-group">
                  {group.title ? (
                    <div className="quotation-cost-group-heading">
                      <span>{group.title}</span>
                      <strong>{formatMoney(group.subtotal)}</strong>
                    </div>
                  ) : null}

                  {group.items.map((item) => (
                <div
                  key={item.key}
                  className={[
                    "quotation-cost-row",
                    !item.enabled && "quotation-cost-row--disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>
                    <span>{item.label}</span>

                    <small>
                      {item.calculationType || item.meta || "Khoản phí"}
                      {item.required ? " • Bắt buộc" : " • Tùy chọn"}
                      {item.enabled
                        ? " • Đã tính trong phí dịch vụ"
                        : " • Chưa áp dụng"}
                    </small>
                  </span>

                  <strong>{formatMoney(item.value)}</strong>
                </div>
                  ))}
                </div>
              ))
            )}

            <div className="quotation-cost-total">
              <div>
                <span>Tổng chi phí theo báo giá</span>

                <small>
                  {formatMoney(costSummary.freight)} cước quốc tế
                  {" + "}
                  {formatMoney(costSummary.domesticShippingFee)} nội địa
                  {" + "}
                  {formatMoney(costSummary.serviceFee)} dịch vụ
                  {" + "}
                  {formatMoney(costSummary.taxAndDuty)} thuế
                </small>
              </div>

              <strong>{formatMoney(displayTotalCost)}</strong>
            </div>
          </div>
        </section>

        <section className="quotation-card">
          <div className="quotation-section-header">
            <div className="quotation-section-icon info">
              <ReceiptLongOutlinedIcon />
            </div>

            <div>
              <h2>Thông tin báo giá</h2>

              <p>Thông tin được sắp xếp theo từng nhóm dữ liệu</p>
            </div>
          </div>

          {descriptionRows.length > 0 && (
            <Descriptions
              bordered
              column={1}
              size="middle"
              className="quotation-descriptions"
            >
              {descriptionRows.map((row) => (
                <Descriptions.Item key={row.key} label={row.label}>
                  {row.content}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </section>
      </div>

      {/* HIDDEN: Danh sách phụ phí — ẩn theo yêu cầu
      <section className="quotation-card quotation-fees-detail-section">
        ...
      </section>
      */}


      {(timeItems.length > 0 ||
        hasUiValue(
          displaySalesNote
        )) && (
          <div className="quotation-bottom-grid">
            {timeItems.length > 0 && (
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
                  {timeItems.map(
                    (item, index) => (
                      <React.Fragment
                        key={item.key}
                      >
                        {index > 0 && (
                          <div className="quotation-time-connector" />
                        )}

                        <div className="quotation-time-item">
                          <span
                            className={`quotation-time-dot ${item.dotClass}`}
                          />

                          <div>
                            <span>
                              {item.label}
                            </span>

                            <strong
                              title={formatDateTimeUtcTitle(
                                item.value
                              )}
                            >
                              {formatDateTime(
                                item.value
                              )}
                            </strong>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  )}
                </div>
              </section>
            )}

            {hasUiValue(
              displaySalesNote
            ) && (
                <section className="quotation-card quotation-sale-note-card">
                  <div className="quotation-section-header">
                    <div className="quotation-section-icon note">
                      <ReceiptLongOutlinedIcon />
                    </div>

                    <div>
                      <h2>
                        Ghi chú từ nhân viên Sale
                      </h2>

                      <p>
                        Thông tin bổ sung từ bộ phận báo giá
                      </p>
                    </div>
                  </div>

                  <div className="quotation-sales-note">
                    {hasUiValue(
                      saleNoteData.summary
                    ) && (
                        <div className="quotation-sales-note__summary">
                          <span>
                            Nội dung từ Sale
                          </span>

                          <p>
                            {saleNoteData.summary}
                          </p>
                        </div>
                      )}

                    {saleNoteData
                      .requirements.length >
                      0 && (
                        <div className="quotation-sales-note__requirements">
                          {saleNoteData.requirements.map(
                            (requirement) => (
                              <div
                                key={
                                  requirement.key
                                }
                                className={`quotation-sales-note__item is-${requirement.type}`}
                              >
                                <span className="quotation-sales-note__dot" />

                                <div>
                                  <small>
                                    {
                                      requirement.label
                                    }
                                  </small>

                                  <strong>
                                    {
                                      requirement.value
                                    }
                                  </strong>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </section>
              )}
          </div>
        )}
      {showQuotationActions && (
        <aside
          className={[
            "quotation-action-dock",
            canConfirmAndPay ? "is-payment" : "is-estimate",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Thao tác báo giá"
        >
          <div className="quotation-action-dock-icon">
            {canConfirmAndPay ? <PaymentRoundedIcon /> : <TaskAltRoundedIcon />}
          </div>

          <div className="quotation-action-dock-content">
            <span>Báo giá chính thức</span>

            <strong>
              {canConfirmAndPay
                ? "Xác nhận báo giá và đặt cọc"
                : "Báo giá đang chờ bạn phản hồi"}
            </strong>

            <small>
              Tổng báo giá: <b>{formatMoney(displayTotalCost)}</b>
              {canConfirmAndPay &&
                " · Tiền cọc do hệ thống tính khi xác nhận"}
            </small>
          </div>

          <div className="quotation-action-dock-buttons">
            {canRejectQuotation && (
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
            )}

            {canConfirmAndPay && (
              <Button
                type="button"
                variant="contained"
                startIcon={
                  quotationAction === "pay" ? (
                    <CircularProgress size={17} thickness={5} />
                  ) : (
                    <PaymentRoundedIcon />
                  )
                }
                onClick={handleOpenPaymentDialog}
                disabled={isActionLoading}
                className="quotation-payment-button"
              >
                {quotationAction === "pay"
                  ? "Đang xác nhận..."
                  : "Xác nhận & thanh toán"}
              </Button>
            )}
          </div>
        </aside>
      )}
      <QuotationCancelDialog
        open={rejectDialogOpen}
        loading={quotationAction === "reject"}
        consignmentCode={displayConsignmentCode}
        totalAmount={displayTotalCost}
        formatMoney={formatMoney}
        onClose={handleCloseRejectDialog}
        onConfirm={handleConfirmRejectQuotation}
      />

      <QuotationPaymentConfirmDialog
        open={paymentDialogOpen}
        loading={quotationAction === "pay"}
        consignmentCode={displayConsignmentCode}
        totalAmount={displayTotalCost}
        formatMoney={formatMoney}
        onClose={handleClosePaymentDialog}
        onConfirm={handleConfirmAndPay}
        paymentMethodOptions={CONSIGNMENT_PAYMENT_OPTIONS}
        defaultMethod={CONSIGNMENT_PAYMENT_METHODS.SEPAY}
        loadDepositRate={pricingRuleService.getDepositRate}
        gatewayText="(tạm tính; số tiền chính xác do hệ thống tính khi xác nhận)."
        depositLabel="Tiền cọc dự kiến"
      />

      <Dialog
        open={Boolean(offlineInstruction)}
        onClose={() => setOfflineInstruction(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Hướng dẫn chuyển khoản tiền cọc</DialogTitle>

        <DialogContent dividers>
          {offlineInstruction && (
            <Descriptions bordered column={1} size="middle">
              <Descriptions.Item label="Số tiền cọc">
                <strong>{formatMoney(offlineInstruction.amount)}</strong>
                {hasNumberValue(offlineInstruction.depositRate) &&
                  ` (${offlineInstruction.depositRate}% tổng hoá đơn)`}
              </Descriptions.Item>

              {hasNumberValue(offlineInstruction.totalBillAmount) && (
                <Descriptions.Item label="Tổng hoá đơn">
                  {formatMoney(offlineInstruction.totalBillAmount)}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Nội dung chuyển khoản">
                <strong>
                  {`Coc ${offlineInstruction.consignmentCode || ""}`.trim()}
                </strong>
              </Descriptions.Item>

              {hasUiValue(offlineInstruction.invoiceNo) && (
                <Descriptions.Item label="Số hoá đơn">
                  {offlineInstruction.invoiceNo}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Trạng thái">
                {DEPOSIT_PAYMENT_STATUS_LABELS[
                  normalizeStatus(offlineInstruction.paymentStatus)
                ] || formatStatusCode(offlineInstruction.paymentStatus)}
                {" — chờ Admin xác nhận đã nhận tiền"}
              </Descriptions.Item>
            </Descriptions>
          )}

          <p style={{ marginTop: 12, marginBottom: 0 }}>
            Ghi đúng mã vận đơn trong nội dung chuyển khoản. Liên hệ nhân viên Sale
            phụ trách để nhận thông tin tài khoản nhận tiền. Đơn chuyển sang
            &quot;Đã đặt cọc&quot; sau khi Admin đối soát và xác nhận.
          </p>
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setOfflineInstruction(null)}
          >
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QuotationDetail;
