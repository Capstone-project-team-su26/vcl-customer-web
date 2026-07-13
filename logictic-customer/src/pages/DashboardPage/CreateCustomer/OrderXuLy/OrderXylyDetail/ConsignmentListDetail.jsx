import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import axios from "axios";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Descriptions,
  Image,
  Modal,
  Table,
  Tag,
  Tooltip,
} from "antd";

import {
  Button,
  CircularProgress,
} from "@mui/material";
import AuthNotify from "../../../../../utils/AuthNotify";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import {
  getConsignmentDetailApi,
  getProductTypesApi,
  cancelConsignmentApi,
} from "../../../../../api/OrderApi/consignmentApi";
import { getConsignmentStatusesApi } from "../../../../../api/OrderApi/consignmentStatusApi";
import pricingRuleService from "../../../../../api/ServiceApi/pricingRuleService";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
} from "../../../../../utils/timeUtc";

import "./ConsignmentListDetail.css";



/* =========================================================
   LOẠI SẢN PHẨM
   ========================================================= */

const normalizeProductType = (productType) =>
  String(productType || "")
    .trim()
    .toLowerCase();

const normalizeProductTypeOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.productTypes,
    apiResult?.data?.items,
    apiResult?.data?.productTypes,
  ];

  const rawProductTypes =
    candidates.find(Array.isArray) || [];

  return rawProductTypes
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value = String(item).trim();

        return {
          value,
          label: value,
        };
      }

      const value = String(
        item?.value ||
          item?.code ||
          item?.productType ||
          item?.productTypeCode ||
          item?.productTypeId ||
          item?.id ||
          ""
      ).trim();

      const label = String(
        item?.label ||
          item?.name ||
          item?.displayName ||
          item?.productTypeName ||
          item?.description ||
          value
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter(
      (option) =>
        option.value &&
        option.label
    );
};

const toFiniteNumberOrNull = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

/* =========================================================
   QUY TẮC HỆ SỐ QUY ĐỔI THỂ TÍCH
   ========================================================= */

const normalizeVolumetricDivisorRule = (rule) => {
  if (
    !rule ||
    normalizeStatus(rule.ruleCode) !==
      "VOLUMETRIC_DIVISOR" ||
    normalizeStatus(rule.status) !==
      "ACTIVE"
  ) {
    return null;
  }

  const value = toFiniteNumberOrNull(
    rule.value
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return {
    ...rule,
    ruleCode: "VOLUMETRIC_DIVISOR",
    value,
  };
};

/* =========================================================
   TRẠNG THÁI ĐƠN HÀNG
   ========================================================= */

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

/* =========================================================
   HÀM XỬ LÝ
   ========================================================= */

const normalizeStatus = (status) => {
  return String(status || "")
    .trim()
    .toUpperCase();
};

const formatStatusCode = (status) => {
  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

const normalizeStatusOptions = (apiResult) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.statuses,
    apiResult?.data?.items,
    apiResult?.data?.statuses,
  ];

  const rawStatuses =
    candidates.find(Array.isArray) || [];

  return rawStatuses
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value = normalizeStatus(item);

        return {
          value,
          label: formatStatusCode(value),
        };
      }

      const value = normalizeStatus(
        item?.value ||
          item?.code ||
          item?.status ||
          item?.statusCode ||
          item?.id
      );

      const label = String(
        item?.label ||
          item?.name ||
          item?.displayName ||
          item?.statusName ||
          item?.description ||
          formatStatusCode(value)
      ).trim();

      return {
        value,
        label,
      };
    })
    .filter(
      (option) =>
        option.value &&
        option.label
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


const DIM_DECIMAL_PLACES = 2;
const MIN_DIM_WEIGHT = 0.01;

const roundDimWeightUp = (value) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  const multiplier =
    10 ** DIM_DECIMAL_PLACES;

  /*
   * Làm tròn LÊN đến 2 chữ số thập phân.
   * Ví dụ:
   * 0.001  -> 0.01
   * 0.011  -> 0.02
   * 1.231  -> 1.24
   */
  const roundedValue =
    Math.ceil(
      (number - 1e-10) *
        multiplier
    ) / multiplier;

  return Math.max(
    roundedValue,
    MIN_DIM_WEIGHT
  );
};

const calculateDimWeight = (
  length,
  width,
  height,
  volumetricDivisor
) => {
  const lengthValue = Number(length);
  const widthValue = Number(width);
  const heightValue = Number(height);
  const divisorValue = Number(
    volumetricDivisor
  );

  if (
    !Number.isFinite(lengthValue) ||
    !Number.isFinite(widthValue) ||
    !Number.isFinite(heightValue) ||
    !Number.isFinite(divisorValue) ||
    lengthValue <= 0 ||
    widthValue <= 0 ||
    heightValue <= 0 ||
    divisorValue <= 0
  ) {
    return null;
  }

  const rawDimWeight =
    (lengthValue *
      widthValue *
      heightValue) /
    divisorValue;

  return roundDimWeightUp(
    rawDimWeight
  );
};

const formatDimWeight = (value) => {
  const roundedValue =
    roundDimWeightUp(value);

  if (roundedValue === null) {
    return "-";
  }

  return roundedValue.toFixed(
    DIM_DECIMAL_PLACES
  );
};

/**
 * Định dạng trọng lượng theo kiểu Việt Nam.
 *
 * Ví dụ:
 * 0.5  => 0,5
 * 1    => 1
 * 1.25 => 1,25
 */
const formatWeight = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(number);
};

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-06-26T08:17:13.1382779
 * - 2026-06-26T08:17:13Z
 * - 2026-06-26T08:17:13+07:00
 *
 * Output luôn là UTC ISO chuẩn:
 * - 2026-06-26T08:17:13.138Z
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

/**
 * Gắn field UTC vào dữ liệu chi tiết để toàn màn hình dùng thống nhất.
 */
const normalizeConsignmentTime = (item) => {
  if (!item) {
    return item;
  }

  const quotation = item.quotation
    ? {
        ...item.quotation,
        createdAtUtc: normalizeApiTimeToUtc(item.quotation.createdAt),
        updatedAtUtc: normalizeApiTimeToUtc(item.quotation.updatedAt),
        expiredAtUtc: normalizeApiTimeToUtc(item.quotation.expiredAt),
      }
    : item.quotation;

  return {
    ...item,
    createdAtUtc: normalizeApiTimeToUtc(item.createdAt),
    updatedAtUtc: normalizeApiTimeToUtc(item.updatedAt),
    cancelledAtUtc: normalizeApiTimeToUtc(item.cancelledAt),
    quotation,
  };
};

/**
 * Hiển thị theo giờ Việt Nam, nhưng dữ liệu nguồn luôn convert từ UTC.
 */
const formatDateTime = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "-";
  }

  return formatVietnamDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  });
};

/**
 * Dùng cho title/tooltip để kiểm tra UTC gốc.
 */
const formatDateTimeUtcTitle = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "";
  }

  return `UTC: ${formatUtcDateTime(utcIso, {
    apiTimeMode: "utc",
    fallback: "-",
  })}`;
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
  const code =
    consignment?.consignmentCode ||
    consignment?.trackingCode ||
    consignment?.waybillCode ||
    consignment?.shipmentCode;

  return (
    String(code || "").trim() ||
    "Chưa được cấp mã"
  );
};





const copyTextToClipboard = async (text) => {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Không có nội dung để sao chép.");
  }

  if (
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");

  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Không thể sao chép mã vận đơn.");
  }
};

const getApiErrorMessage = (
  error,
  fallbackMessage = "Đã xảy ra lỗi."
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
   THẺ TỔNG QUAN HIỆN ĐẦY ĐỦ KHI RÊ CHUỘT
   ========================================================= */

const SummaryCard = ({
  label,
  value,
  suffix = "",
}) => {
  const labelRef = useRef(null);
  const valueRef = useRef(null);

  const [isOverflowing, setIsOverflowing] =
    useState(false);

  const displayValue =
    value === null ||
    value === undefined ||
    value === ""
      ? "-"
      : String(value);

  const fullValue = suffix
    ? `${displayValue} ${suffix}`
    : displayValue;

  const checkOverflow = useCallback(() => {
    const labelElement = labelRef.current;
    const valueElement = valueRef.current;

    const labelOverflow = Boolean(
      labelElement &&
        labelElement.scrollWidth >
          labelElement.clientWidth + 1
    );

    const valueOverflow = Boolean(
      valueElement &&
        valueElement.scrollWidth >
          valueElement.clientWidth + 1
    );

    setIsOverflowing(
      labelOverflow || valueOverflow
    );
  }, [displayValue, label, suffix]);

  useEffect(() => {
    const frameId =
      window.requestAnimationFrame(
        checkOverflow
      );

    let resizeObserver;

    if (
      typeof ResizeObserver !==
      "undefined"
    ) {
      resizeObserver = new ResizeObserver(
        checkOverflow
      );

      if (labelRef.current) {
        resizeObserver.observe(
          labelRef.current
        );
      }

      if (valueRef.current) {
        resizeObserver.observe(
          valueRef.current
        );
      }
    }

    window.addEventListener(
      "resize",
      checkOverflow
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener(
        "resize",
        checkOverflow
      );
    };
  }, [checkOverflow]);

  const tooltipContent = isOverflowing ? (
    <div
      style={{
        maxWidth: 420,
        lineHeight: 1.55,
        overflowWrap: "anywhere",
      }}
    >
      <div
        style={{
          marginBottom: 4,
          fontSize: 12,
          fontWeight: 600,
          opacity: 0.8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {fullValue}
      </div>
    </div>
  ) : null;

  return (
    <Tooltip
      title={tooltipContent}
      placement="top"
      mouseEnterDelay={0.12}
      mouseLeaveDelay={0.05}
      overlayStyle={{
        maxWidth: 440,
      }}
    >
      <div
        className="detail-summary-card"
        aria-label={`${label}: ${fullValue}`}
        style={{
          cursor: isOverflowing
            ? "help"
            : "default",
        }}
      >
        <span
          ref={labelRef}
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>

        <strong
          ref={valueRef}
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayValue}

          {suffix && (
            <>
              {" "}
              <small>{suffix}</small>
            </>
          )}
        </strong>
      </div>
    </Tooltip>
  );
};

/* =========================================================
   COMPONENT
   ========================================================= */

const ConsignmentListDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();

  /*
   * Có thể nhận dữ liệu tóm tắt từ trang danh sách.
   * Component vẫn gọi API để lấy đầy đủ customer,
   * items và quotation.
   */
  const summaryData =
    location.state?.consignment || null;

  const [consignment, setConsignment] =
    useState(null);

  const [
    copiedConsignmentCode,
    setCopiedConsignmentCode,
  ] = useState("");

  const copyResetTimerRef =
    useRef(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [statusOptions, setStatusOptions] =
    useState([]);

  const [
    productTypeOptions,
    setProductTypeOptions,
  ] = useState([]);

  const [
    volumetricDivisorRule,
    setVolumetricDivisorRule,
  ] = useState(null);

  const [
    volumetricRuleError,
    setVolumetricRuleError,
  ] = useState("");

  const [
    volumetricRuleLoading,
    setVolumetricRuleLoading,
  ] = useState(true);

  const [
    isCancelModalOpen,
    setIsCancelModalOpen,
  ] = useState(false);

  const [cancelReason, setCancelReason] =
    useState("");

  const [
    cancelReasonError,
    setCancelReasonError,
  ] = useState("");

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [
    fullTextPreview,
    setFullTextPreview,
  ] = useState({
    open: false,
    title: "",
    content: "",
  });

  /* =======================================================
     LẤY RIÊNG HỆ SỐ QUY ĐỔI THỂ TÍCH
     ======================================================= */

  const fetchVolumetricDivisorRule =
    useCallback(async (signal) => {
      try {
        setVolumetricRuleLoading(true);
        setVolumetricRuleError("");

        console.info(
          "[Consignment Detail] GET /api/pricing-rules → VOLUMETRIC_DIVISOR"
        );

        const result =
          await pricingRuleService.getVolumetricDivisorRule({
            signal,
          });

        const normalizedRule =
          normalizeVolumetricDivisorRule(
            result
          );

        if (!normalizedRule) {
          throw new Error(
            "Không tìm thấy quy tắc VOLUMETRIC_DIVISOR đang ACTIVE hoặc value không hợp lệ."
          );
        }

        setVolumetricDivisorRule(
          normalizedRule
        );

        console.info(
          "[Consignment Detail] VOLUMETRIC_DIVISOR đang áp dụng:",
          normalizedRule
        );
      } catch (error) {
        if (
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[Consignment Detail] Lỗi tải VOLUMETRIC_DIVISOR:",
          error
        );

        setVolumetricDivisorRule(null);
        setVolumetricRuleError(
          getApiErrorMessage(
            error,
            "Không thể tải hệ số quy đổi thể tích từ API."
          )
        );
      } finally {
        if (!signal?.aborted) {
          setVolumetricRuleLoading(false);
        }
      }
    }, []);

  /* =======================================================
     LẤY CHI TIẾT KÝ GỬI
     ======================================================= */

  const fetchConsignmentDetail = useCallback(
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

        const [
          detailResult,
          statusesResult,
          productTypesResult,
        ] = await Promise.allSettled([
          getConsignmentDetailApi(
            orderId,
            {
              signal,
            }
          ),
          getConsignmentStatusesApi({
            signal,
          }),
          getProductTypesApi({
            signal,
          }),
        ]);

        if (
          detailResult.status ===
          "rejected"
        ) {
          throw detailResult.reason;
        }

        const detailResponse =
          detailResult.value;

        const responseData =
          detailResponse?.data ||
          detailResponse;

        if (!responseData) {
          throw new Error(
            "API không trả về dữ liệu chi tiết lô hàng."
          );
        }

        setConsignment(normalizeConsignmentTime(responseData));

        if (
          statusesResult.status ===
          "fulfilled"
        ) {
          setStatusOptions(
            normalizeStatusOptions(
              statusesResult.value
            )
          );
        } else if (
          !axios.isCancel(
            statusesResult.reason
          ) &&
          statusesResult.reason?.code !==
            "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách trạng thái:",
            statusesResult.reason
          );
        }

        if (
          productTypesResult.status ===
          "fulfilled"
        ) {
          setProductTypeOptions(
            normalizeProductTypeOptions(
              productTypesResult.value
            )
          );
        } else if (
          !axios.isCancel(
            productTypesResult.reason
          ) &&
          productTypesResult.reason?.code !==
            "ERR_CANCELED"
        ) {
          console.error(
            "Lỗi khi lấy danh sách loại sản phẩm:",
            productTypesResult.reason
          );
        }

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
          error?.response?.data?.title ||
          error?.message ||
          "Không thể tải chi tiết lô hàng.";

        setErrorMessage(apiMessage);

        /*
         * Nếu API lỗi, dùng dữ liệu tóm tắt
         * từ trang danh sách làm dự phòng.
         */
        if (summaryData) {
          setConsignment(normalizeConsignmentTime(summaryData));
        } else {
          setConsignment(null);
        }

        AuthNotify.error(
          "Không tải được dữ liệu",
          apiMessage
        );
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

  useEffect(() => {
    const controller = new AbortController();

    fetchVolumetricDivisorRule(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [fetchVolumetricDivisorRule]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(
          copyResetTimerRef.current
        );
      }
    },
    []
  );

  const handleReload = () => {
    const detailController =
      new AbortController();
    const pricingController =
      new AbortController();

    fetchConsignmentDetail(
      detailController.signal
    );
    fetchVolumetricDivisorRule(
      pricingController.signal
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCopyConsignmentCode = async (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const consignmentCode =
      getDisplayCode(consignment);

    if (
      !consignmentCode ||
      consignmentCode ===
        "Chưa được cấp mã"
    ) {
      AuthNotify.warning(
        "Chưa có mã vận đơn",
        "Đơn ký gửi chưa được cấp mã vận đơn để sao chép."
      );
      return;
    }

    try {
      await copyTextToClipboard(
        consignmentCode
      );

      setCopiedConsignmentCode(
        consignmentCode
      );

      AuthNotify.success(
        "Sao chép thành công",
        `Đã sao chép mã vận đơn ${consignmentCode}.`
      );

      if (copyResetTimerRef.current) {
        window.clearTimeout(
          copyResetTimerRef.current
        );
      }

      copyResetTimerRef.current =
        window.setTimeout(() => {
          setCopiedConsignmentCode("");
        }, 1800);
    } catch (error) {
      console.error(
        "Không thể sao chép mã vận đơn:",
        error
      );

      AuthNotify.error(
        "Sao chép thất bại",
        "Không thể sao chép mã vận đơn. Vui lòng thử lại."
      );
    }
  };

  const handleOpenCancelModal = () => {
    if (!consignment || !orderId) {
      AuthNotify.error(
        "Không thể hủy đơn",
        "Không tìm thấy thông tin đơn hàng để hủy."
      );
      return;
    }

    if (
      normalizeStatus(
        consignment.status
      ) === "CANCELLED"
    ) {
      AuthNotify.warning(
        "Đơn đã được hủy",
        "Đơn ký gửi này đã được hủy trước đó."
      );
      return;
    }

    setCancelReason("");
    setCancelReasonError("");
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) {
      return;
    }

    setIsCancelModalOpen(false);
    setCancelReason("");
    setCancelReasonError("");
  };

  const handleCancelConsignment = async () => {
    const reason = cancelReason.trim();

    if (!reason) {
      const validationMessage =
        "Vui lòng nhập lý do hủy đơn.";

      setCancelReasonError(
        validationMessage
      );

      AuthNotify.warning(
        "Thiếu lý do hủy",
        validationMessage
      );

      return;
    }

    if (reason.length < 5) {
      const validationMessage =
        "Lý do hủy phải có ít nhất 5 ký tự.";

      setCancelReasonError(
        validationMessage
      );

      AuthNotify.warning(
        "Lý do chưa hợp lệ",
        validationMessage
      );

      return;
    }

    try {
      setIsCancelling(true);
      setCancelReasonError("");

      await cancelConsignmentApi(
        orderId,
        reason
      );

      setIsCancelModalOpen(false);
      setCancelReason("");

      AuthNotify.success(
        "Hủy đơn thành công",
        "Đơn ký gửi đã được hủy trên hệ thống."
      );

      const refreshController =
        new AbortController();

      await fetchConsignmentDetail(
        refreshController.signal
      );
    } catch (error) {
      if (
        axios.isCancel(error) ||
        error?.code === "ERR_CANCELED" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      const responseStatus =
        error?.response?.status;

      const apiMessage =
        getApiErrorMessage(
          error,
          "Không thể hủy đơn ký gửi."
        );

      setCancelReasonError(apiMessage);

      if (responseStatus === 401) {
        sessionStorage.removeItem(
          "accessToken"
        );
        localStorage.removeItem(
          "accessToken"
        );

        AuthNotify.error(
          "Phiên đăng nhập hết hạn",
          "Vui lòng đăng nhập lại để tiếp tục."
        );

        navigate("/login");
        return;
      }

      AuthNotify.error(
        "Hủy đơn thất bại",
        apiMessage
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map((option) => [
          normalizeStatus(option.value),
          option.label,
        ])
      ),
    [statusOptions]
  );

  const getStatusLabel = useCallback(
    (status) => {
      const normalizedStatus =
        normalizeStatus(status);

      return (
        statusLabelMap.get(
          normalizedStatus
        ) ||
        formatStatusCode(
          normalizedStatus
        ) ||
        "-"
      );
    },
    [statusLabelMap]
  );

  const productTypeLabelMap = useMemo(
    () =>
      new Map(
        productTypeOptions.map(
          (option) => [
            normalizeProductType(
              option.value
            ),
            option.label,
          ]
        )
      ),
    [productTypeOptions]
  );

  const getProductTypeLabel = useCallback(
    (productType) => {
      const normalizedProductType =
        normalizeProductType(
          productType
        );

      if (!normalizedProductType) {
        return "-";
      }

      return (
        productTypeLabelMap.get(
          normalizedProductType
        ) ||
        String(productType).trim()
      );
    },
    [productTypeLabelMap]
  );

  const volumetricDivisor = useMemo(
    () =>
      toFiniteNumberOrNull(
        volumetricDivisorRule?.value
      ),
    [volumetricDivisorRule]
  );

  const getRecordProductType = useCallback(
    (record) => {
      const productType =
        record?.productType;

      if (
        productType &&
        typeof productType === "object"
      ) {
        return (
          productType.value ||
          productType.code ||
          productType.productTypeCode ||
          productType.productTypeId ||
          productType.id ||
          productType.name ||
          productType.productTypeName ||
          ""
        );
      }

      return (
        productType ||
        record?.productTypeCode ||
        record?.productTypeId ||
        record?.productTypeName ||
        ""
      );
    },
    []
  );

  const handleOpenFullText = useCallback(
    (title, content) => {
      const normalizedContent =
        String(content ?? "").trim();

      if (
        !normalizedContent ||
        normalizedContent === "-"
      ) {
        return;
      }

      setFullTextPreview({
        open: true,
        title,
        content: normalizedContent,
      });
    },
    []
  );

  const handleCloseFullText = useCallback(
    () => {
      setFullTextPreview({
        open: false,
        title: "",
        content: "",
      });
    },
    []
  );

  /* =======================================================
     CỘT BẢNG SẢN PHẨM
     ======================================================= */

  const productColumns = useMemo(
    () => [
      {
        title: "STT",
        key: "index",
        width: 65,
        align: "center",
        render: (_, __, index) =>
          index + 1,
      },
      {
        title: "Hình ảnh",
        dataIndex: "referenceUrl",
        key: "referenceUrl",
        width: 95,
        align: "center",
        render: (
          referenceUrl,
          record
        ) => {
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
              alt={
                record.productName ||
                "Sản phẩm"
              }
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
        width: 210,
        render: (
          productName,
          record
        ) => {
          const displayProductName =
            productName ||
            record?.name ||
            record?.itemName ||
            record?.product?.name ||
            record?.product?.productName ||
            "-";

          return (
            <div className="detail-product-name-cell">
              <button
                type="button"
                className="detail-product-name-button"
                title="Bấm để xem đầy đủ"
                aria-label={`Xem đầy đủ tên sản phẩm ${displayProductName}`}
                onClick={() =>
                  handleOpenFullText(
                    "Tên sản phẩm",
                    displayProductName
                  )
                }
                style={{
                  display: "block",
                  width: "100%",
                  minWidth: 0,
                  padding: 0,
                  overflow: "hidden",
                  color: "inherit",
                  font: "inherit",
                  textAlign: "left",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                }}
              >
                <strong
                  className="detail-product-name"
                  style={{
                    display: "block",
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayProductName}
                </strong>
              </button>
            </div>
          );
        },
      },
      {
        title: "Loại sản phẩm",
        key: "productType",
        width: 170,
        align: "center",
        render: (_, record) => {
          const productTypeLabel =
            getProductTypeLabel(
              getRecordProductType(
                record
              )
            );

          if (
            !productTypeLabel ||
            productTypeLabel === "-"
          ) {
            return (
              <span className="detail-pending-value">
                Chưa cập nhật
              </span>
            );
          }

          return (
            <button
              type="button"
              title="Bấm để xem đầy đủ"
              aria-label={`Xem đầy đủ loại sản phẩm ${productTypeLabel}`}
              onClick={() =>
                handleOpenFullText(
                  "Loại sản phẩm",
                  productTypeLabel
                )
              }
              style={{
                maxWidth: "100%",
                padding: 0,
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              <Tag
                color="blue"
                className="detail-product-type-tag"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  marginInlineEnd: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {productTypeLabel}
              </Tag>
            </button>
          );
        },
      },
      {
        title: "Số lượng",
        dataIndex: "quantity",
        key: "quantity",
        width: 100,
        align: "center",
        render: (quantity) =>
          quantity ?? 0,
      },
      {
        title: "Trọng lượng",
        dataIndex: "weight",
        key: "weight",
        width: 130,
        align: "center",
        render: (weight) => (
          <strong className="detail-weight-value">
            {formatWeight(weight)} kg
          </strong>
        ),
      },
      {
        title: "Kích thước",
        key: "dimensions",
        width: 180,
        render: (_, record) => (
          <span className="detail-dimension-text">
            {record.length ?? 0} ×{" "}
            {record.width ?? 0} ×{" "}
            {record.height ?? 0} cm
          </span>
        ),
      },
      {
        title: volumetricDivisor
          ? `DIM = (Dài × Rộng × Cao) / ${formatWeight(
              volumetricDivisor
            )}`
          : "DIM (chưa có hệ số từ API)",
        key: "dimensionalWeight",
        width: 250,
        render: (_, record) => {
          if (!volumetricDivisor) {
            return (
              <span className="detail-pending-value">
                Chưa có hệ số DIM
              </span>
            );
          }

          const dimWeight =
            calculateDimWeight(
              record.length,
              record.width,
              record.height,
              volumetricDivisor
            );

          if (dimWeight === null) {
            return "-";
          }

          return (
            <span className="detail-dimension-text">
              {record.length} ×{" "}
              {record.width} ×{" "}
              {record.height} /{" "}
              {formatWeight(
                volumetricDivisor
              )}{" "}
              ={" "}
              <strong>
                {formatDimWeight(
                  dimWeight
                )}{" "}
                kg
              </strong>
            </span>
          );
        },
      },
      {
        title: "Giá trị sản phẩm",
        dataIndex: "declaredValue",
        key: "declaredValue",
        width: 155,
        align: "right",
        render: (declaredValue) => (
          <strong className="detail-money-value">
            {formatMoney(
              declaredValue
            )}
          </strong>
        ),
      },
      {
        title: "Mã vận đơn nội địa",
        dataIndex:
          "domesticTrackingCode",
        key: "domesticTrackingCode",
        width: 180,
        render: (trackingCode) => {
          const displayTrackingCode =
            trackingCode ||
            "Chưa cập nhật";

          if (!trackingCode) {
            return (
              <span className="detail-pending-value">
                {displayTrackingCode}
              </span>
            );
          }

          return (
            <button
              type="button"
              title="Bấm để xem đầy đủ"
              aria-label={`Xem đầy đủ mã vận đơn nội địa ${displayTrackingCode}`}
              onClick={() =>
                handleOpenFullText(
                  "Mã vận đơn nội địa",
                  displayTrackingCode
                )
              }
              style={{
                display: "block",
                width: "100%",
                padding: 0,
                overflow: "hidden",
                color: "inherit",
                font: "inherit",
                textAlign: "left",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            >
              {displayTrackingCode}
            </button>
          );
        },
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
              onClick={(event) =>
                event.stopPropagation()
              }
              aria-label="Mở liên kết sản phẩm"
            >
              <OpenInNewIcon fontSize="small" />
            </a>
          ) : null,
      },
    ],
    [
      getProductTypeLabel,
      getRecordProductType,
      handleOpenFullText,
      volumetricDivisor,
    ]
  );

  /* =======================================================
     TRẠNG THÁI LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="consignment-detail-page">
        <div className="detail-loading-container">
          <CircularProgress size={42} />

          <div>
            <strong>
              Đang tải chi tiết lô hàng
            </strong>

            <span>
              Vui lòng chờ trong giây
              lát...
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     TRẠNG THÁI KHÔNG CÓ DỮ LIỆU
     ======================================================= */

  if (!consignment) {
    return (
      <div className="consignment-detail-page">
        <div className="detail-error-container">
          <div className="detail-error-icon">
            📦
          </div>

          <h2>
            Không tìm thấy lô hàng
          </h2>

          <p>
            {errorMessage ||
              "Lô hàng không tồn tại hoặc đã bị xóa."}
          </p>

          <div className="detail-error-actions">
            <Button
              variant="outlined"
              color="inherit"
              startIcon={
                <ArrowBackIcon />
              }
              onClick={handleBack}
            >
              Quay lại
            </Button>

            <Button
              variant="contained"
              startIcon={
                <RefreshIcon />
              }
              onClick={handleReload}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     CHUẨN BỊ DỮ LIỆU HIỂN THỊ
     ======================================================= */

  const displayCode =
    getDisplayCode(consignment);

  const statusClass =
    getStatusClassName(
      consignment.status
    );

  const isAlreadyCancelled =
    normalizeStatus(
      consignment.status
    ) === "CANCELLED";

  const quotationStatusClass =
    getStatusClassName(
      consignment.quotation?.status
    );

  const items = Array.isArray(
    consignment.items
  )
    ? consignment.items
    : [];

  const customer =
    consignment.customer || {};

  const quotation =
    consignment.quotation || null;

  const totalProductQuantity =
    items.reduce(
      (total, item) =>
        total +
        (Number(item.quantity) || 0),
      0
    );


  const calculatedTotalDimWeight =
    volumetricDivisor
      ? items.reduce(
          (total, item) => {
            const dimWeight =
              calculateDimWeight(
                item.length,
                item.width,
                item.height,
                volumetricDivisor
              );

            return (
              total +
              (dimWeight ?? 0)
            );
          },
          0
        )
      : null;

  const apiVolumetricWeight =
    toFiniteNumberOrNull(
      consignment.volumetricWeight ??
        quotation?.volumetricWeight
    );

  const totalDimWeight =
    Number.isFinite(
      calculatedTotalDimWeight
    )
      ? calculatedTotalDimWeight
      : apiVolumetricWeight;

  /* =======================================================
     GIAO DIỆN CHÍNH
     ======================================================= */

  return (
    <div className="consignment-detail-page">
      {/* Điều hướng */}

      <div className="detail-navigation">
        <Button
          variant="outlined"
          color="inherit"
          startIcon={
            <ArrowBackIcon />
          }
          onClick={handleBack}
          className="detail-back-button"
        >
          Quay lại danh sách
        </Button>

        <span className="detail-navigation-text">
          Danh sách ký gửi / Chi tiết
        </span>

      </div>

      {/* Cảnh báo khi chỉ có dữ liệu tóm tắt */}

      {errorMessage && summaryData && (
        <div className="detail-warning-message">
          Không thể tải dữ liệu mới nhất.
          Đang hiển thị dữ liệu từ danh
          sách.
        </div>
      )}

      {volumetricRuleLoading && (
        <div className="detail-warning-message">
          Đang tải riêng quy tắc
          VOLUMETRIC_DIVISOR từ API
          /api/pricing-rules...
        </div>
      )}

      {volumetricRuleError && (
        <div className="detail-warning-message">
          {volumetricRuleError} Phần DIM
          không dùng hệ số cố định thay thế.
        </div>
      )}

      {/* Hero */}

      <section className="detail-hero-section">
        <div className="detail-hero-main">
          <div className="detail-main-icon">
            <Inventory2OutlinedIcon />
          </div>

          <div className="detail-hero-content">
            <div className="detail-title-row">
              <div className="detail-code-group">
                <span className="detail-code-label">
                  MÃ VẬN ĐƠN
                </span>

                <div className="detail-code-row">
                  <h1 title={displayCode}>
                    {displayCode}
                  </h1>

                  <button
                    type="button"
                    className={[
                      "detail-copy-code-button",
                      copiedConsignmentCode ===
                        displayCode &&
                        "is-copied",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={
                      handleCopyConsignmentCode
                    }
                    disabled={
                      displayCode ===
                      "Chưa được cấp mã"
                    }
                    aria-label={`Sao chép mã vận đơn ${displayCode}`}
                    title="Sao chép mã vận đơn"
                  >
                    {copiedConsignmentCode ===
                    displayCode ? (
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
                </div>
              </div>

              <span
                className={`detail-status-badge status-${statusClass}`}
              >
                {getStatusLabel(
                  consignment.status
                )}
              </span>
            </div>

            <div className="detail-order-metadata">
              <span>
                Mã đơn hàng:
                <strong>
                  {consignment.orderId ||
                    "-"}
                </strong>
              </span>

              <span>
                Loại đơn:
                <strong>
                  {consignment.orderType ===
                  "CONSIGNMENT"
                    ? "KÝ GỬI"
                    : consignment.orderType ||
                      "-"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="detail-created-time">
          <span>
            Ngày tạo yêu cầu
          </span>

          <strong
            title={formatDateTimeUtcTitle(
              consignment.createdAtUtc ||
                consignment.createdAt
            )}
          >
            {formatDateTime(
              consignment.createdAtUtc ||
                consignment.createdAt
            )}
          </strong>
        </div>
      </section>

      {/* Tổng quan */}

      <section className="detail-summary-grid">
        <SummaryCard
          label="Loại vận chuyển"
          value={getConsignmentTypeLabel(
            consignment.consignmentType
          )}
          onOpen={handleOpenFullText}
        />

        <SummaryCard
          label="Tuyến vận chuyển"
          value={consignment.route || "-"}
          onOpen={handleOpenFullText}
        />

        <SummaryCard
          label="Tổng trọng lượng"
          value={formatWeight(
            consignment.totalWeight
          )}
          suffix="kg"
          onOpen={handleOpenFullText}
        />

        <SummaryCard
          label="Tổng thể tích"
          value={
            consignment.totalVolume ?? 0
          }
          suffix="cm³"
          onOpen={handleOpenFullText}
        />

        <SummaryCard
          label="Số sản phẩm"
          value={totalProductQuantity}
          suffix="sản phẩm"
          onOpen={handleOpenFullText}
        />

        <SummaryCard
          label="Tổng khối lượng DIM"
          value={
            Number.isFinite(
              totalDimWeight
            )
              ? formatDimWeight(
                  totalDimWeight
                )
              : "-"
          }
          suffix={
            Number.isFinite(
              totalDimWeight
            )
              ? "kg"
              : ""
          }
          onOpen={handleOpenFullText}
        />
      </section>

      {/* Thông tin khách hàng và nhận hàng */}

      <div className="detail-information-grid">
        <section className="detail-section-card">
          <div className="detail-section-header">
            <div className="detail-section-icon customer">
              <PersonIcon />
            </div>

            <div>
              <h2>
                Thông tin khách hàng
              </h2>

              <p>
                Thông tin người gửi yêu
                cầu ký gửi
              </p>
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

            <Descriptions.Item label="Mã khách hàng">
              <span className="detail-id-value">
                {customer.customerId ||
                  "-"}
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
              <h2>
                Thông tin nhận hàng
              </h2>

              <p>
                Thông tin người nhận tại
                Việt Nam
              </p>
            </div>
          </div>

          <Descriptions
            bordered
            column={1}
            size="middle"
            className="detail-descriptions"
          >
            <Descriptions.Item label="Người nhận">
              {consignment.receiverName ||
                "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              {consignment.receiverPhone ? (
                <a
                  href={`tel:${consignment.receiverPhone}`}
                >
                  {
                    consignment.receiverPhone
                  }
                </a>
              ) : (
                "-"
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Địa chỉ nhận hàng">
              {consignment.receiverAddress ||
                "-"}
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

      {/* Danh sách sản phẩm */}

      <section className="detail-section-card detail-products-section">
        <div className="detail-section-header">
          <div className="detail-section-icon product">
            <Inventory2OutlinedIcon />
          </div>

          <div>
            <h2>
              Danh sách sản phẩm
            </h2>

            <p>
              Có {items.length} dòng sản
              phẩm trong lô hàng
            </p>
          </div>
        </div>

        <Table
          rowKey={(record) =>
            record.id ||
            record.itemId ||
            `${record.productName}-${record.referenceUrl}`
          }
          columns={productColumns}
          dataSource={items}
          pagination={false}
          scroll={{
            x: 1500,
          }}
          locale={{
            emptyText:
              "Chưa có sản phẩm trong lô hàng.",
          }}
          className="detail-product-table"
        />
      </section>

      {/* Thông tin vận chuyển và báo giá */}

      <div className="detail-bottom-grid">
        <section className="detail-section-card">
          <div className="detail-section-header">
            <div className="detail-section-icon shipping">
              <LocalShippingOutlinedIcon />
            </div>

            <div>
              <h2>
                Thông tin vận chuyển
              </h2>

              <p>
                Thông tin chung của yêu
                cầu ký gửi
              </p>
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
                {getStatusLabel(
                  consignment.status
                )}
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
              {consignment.note ||
                "Không có ghi chú"}
            </Descriptions.Item>
          </Descriptions>
        </section>

        <section className="detail-section-card quotation-card">
          <div className="detail-section-header">
            <div className="detail-section-icon quotation">
              <ReceiptLongOutlinedIcon />
            </div>

            <div>
              <h2>
                Thông tin báo giá
              </h2>

              <p>
                Chi phí dự kiến của lô
                hàng
              </p>
            </div>
          </div>

          {quotation ? (
            <>
              <div className="quotation-heading">
                <div>
                  <span>
                    Loại báo giá
                  </span>

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
                  <span>
                    Cước vận chuyển dự kiến
                  </span>

                  <strong>
                    {formatMoney(
                      quotation.estimatedFreightCharge
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Phí dịch vụ
                  </span>

                  <strong>
                    {formatMoney(
                      quotation.serviceFee
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Thuế và phí nhập khẩu
                  </span>

                  <strong>
                    {formatMoney(
                      quotation.taxAndDuty
                    )}
                  </strong>
                </div>

                <div className="quotation-total-row">
                  <span>
                    Tổng chi phí dự kiến
                  </span>

                  <strong>
                    {formatMoney(
                      quotation.totalEstimatedCost
                    )}
                  </strong>
                </div>
              </div>

              <div className="quotation-time-grid">
                <div>
                  <span>
                    Ngày tạo báo giá
                  </span>

                  <strong
                    title={formatDateTimeUtcTitle(
                      quotation.createdAtUtc ||
                        quotation.createdAt
                    )}
                  >
                    {formatDateTime(
                      quotation.createdAtUtc ||
                        quotation.createdAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Ngày hết hạn
                  </span>

                  <strong
                    title={formatDateTimeUtcTitle(
                      quotation.expiredAtUtc ||
                        quotation.expiredAt
                    )}
                  >
                    {formatDateTime(
                      quotation.expiredAtUtc ||
                        quotation.expiredAt
                    )}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="quotation-empty">
              Chưa có báo giá cho lô hàng
              này.
            </div>
          )}
        </section>
      </div>


      {/* Hủy đơn ở cuối trang */}
      <section className="detail-cancel-bottom-section">
        <div className="detail-cancel-bottom-content">
          <h3>Hủy yêu cầu ký gửi</h3>

          <p>
            Nhấn Hủy đơn, nhập lý do và xác nhận. Hệ thống sẽ
            hiển thị thông báo ngay sau khi Backend xử lý yêu cầu.
          </p>
        </div>

        <button
          type="button"
          className="detail-cancel-order-button"
          disabled={
            isCancelling ||
            isAlreadyCancelled
          }
          onClick={handleOpenCancelModal}
        >
          {isCancelling ? (
            <>
              <CircularProgress
                size={16}
                color="inherit"
              />
              Đang hủy...
            </>
          ) : isAlreadyCancelled ? (
            <>
              <CancelOutlinedIcon fontSize="small" />
              Đã hủy
            </>
          ) : (
            <>
              <CancelOutlinedIcon fontSize="small" />
              Hủy đơn
            </>
          )}
        </button>
      </section>

      <Modal
        open={fullTextPreview.open}
        title={fullTextPreview.title}
        onCancel={handleCloseFullText}
        footer={null}
        centered
        width={560}
      >
        <div
          style={{
            maxHeight: "55vh",
            padding: "8px 2px 4px",
            overflowY: "auto",
            color: "#172033",
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.7,
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
        >
          {fullTextPreview.content}
        </div>
      </Modal>

      {isCancelModalOpen && (
        <div
          className="cancel-order-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseCancelModal();
            }
          }}
        >
          <div
            className="cancel-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <div className="cancel-order-modal-icon">
              <CancelOutlinedIcon />
            </div>

            <div className="cancel-order-modal-content">
              <h2 id="cancel-order-title">
                Hủy đơn ký gửi
              </h2>

              <p>
                Đơn hàng sau khi hủy sẽ không
                thể tiếp tục xử lý. Vui lòng
                nhập lý do hủy.
              </p>

              <label
                htmlFor="cancel-reason"
                className="cancel-order-label"
              >
                Lý do hủy
              </label>

              <textarea
                id="cancel-reason"
                rows={4}
                maxLength={500}
                value={cancelReason}
                disabled={isCancelling}
                placeholder="Ví dụ: Tôi nhập sai thông tin đơn hàng..."
                className={[
                  "cancel-order-textarea",
                  cancelReasonError &&
                    "has-error",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onChange={(event) => {
                  setCancelReason(
                    event.target.value
                  );

                  if (cancelReasonError) {
                    setCancelReasonError("");
                  }
                }}
              />

              <div className="cancel-order-counter">
                {cancelReason.length}/500
              </div>

              {cancelReasonError && (
                <div className="cancel-order-error">
                  {cancelReasonError}
                </div>
              )}
            </div>

            <div className="cancel-order-modal-actions">
              <button
                type="button"
                className="cancel-order-close-button"
                disabled={isCancelling}
                onClick={handleCloseCancelModal}
              >
                Quay lại
              </button>

              <button
                type="button"
                className="cancel-order-confirm-button"
                disabled={
                  isCancelling ||
                  cancelReason.trim().length < 5
                }
                onClick={
                  handleCancelConsignment
                }
              >
                {isCancelling ? (
                  <>
                    <CircularProgress
                      size={16}
                      color="inherit"
                    />
                    Đang hủy...
                  </>
                ) : (
                  <>
                    <CancelOutlinedIcon fontSize="small" />
                    Xác nhận hủy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignmentListDetail;