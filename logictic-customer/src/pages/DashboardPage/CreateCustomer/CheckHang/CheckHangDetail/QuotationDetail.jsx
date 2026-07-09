import React, {
  useCallback,
  useEffect,
  useMemo,
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
  Tag,
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
import AuthNotify from "../../../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatUtcDateTime,
  formatVietnamDateTime,
  getSyncedNowDate,
} from "../../../../../utils/timeUtc";

import { getConsignmentStatusesApi } from "../../../../../api/OrderApi/consignmentStatusApi";
import { getOrderQuotationApi } from "../../../../../api/OrderApi/consignmentApi";

import "./QuotationDetail.css";

/* =========================================================
   LABELS
   ========================================================= */

const QUOTATION_STATUS_FALLBACK_LABELS = {
  DRAFT: "BẢN NHÁP",
  PENDING: "CHỜ XÁC NHẬN",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "ĐÃ TỪ CHỐI",
  EXPIRED: "HẾT HẠN",
  CANCELLED: "ĐÃ HỦY",
  CANCELED: "ĐÃ HỦY",
};

const QUOTE_TYPE_LABELS = {
  ESTIMATE: "BÁO GIÁ TẠM TÍNH",
  OFFICIAL: "BÁO GIÁ CHÍNH THỨC",
  FINAL: "BÁO GIÁ CHÍNH THỨC",
};

const CONSIGNMENT_TYPE_LABELS = {
  EXPRESS: "HỎA TỐC",
  "HỎA TỐC": "HỎA TỐC",
  "HOA TOC": "HỎA TỐC",
  STANDARD: "TIÊU CHUẨN",
  "TIÊU CHUẨN": "TIÊU CHUẨN",
  "TIEU CHUAN": "TIÊU CHUẨN",
};

const FEE_CODE_LABELS = {
  MAIN_SERVICE: "Cước vận chuyển quốc tế",
  WOOD_CRATE: "Đóng thùng gỗ",
  SUR_INSPECTION: "Phụ phí kiểm hàng",
  SUR_INSURANCE_3PERCENT: "Phụ phí bảo hiểm",
  SERVICE_FEE: "Phí dịch vụ",
  TAX_DUTY: "Thuế / phí nhập khẩu",
};

const FEE_TYPE_LABELS = {
  MAIN_SERVICE: "Dịch vụ chính",
  SURCHARGE: "Phụ phí",
  SERVICE_FEE: "Phí dịch vụ",
  TAX_DUTY: "Thuế / phí nhập khẩu",
};

const CALCULATION_TYPE_LABELS = {
  PER_KG: "Theo kg",
  FIXED: "Cố định",
  PERCENTAGE: "Phần trăm",
};

/* =========================================================
   COMMON HELPERS
   ========================================================= */

const normalizeStatus = (value) => {
  return String(value ?? "")
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
    apiResult?.quotationStatuses,
    apiResult?.data?.items,
    apiResult?.data?.statuses,
    apiResult?.data?.quotationStatuses,
    apiResult?.data?.data,
    apiResult?.data?.data?.items,
    apiResult?.data?.data?.statuses,
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

const getQuoteTypeLabel = (quoteType) => {
  const normalizedType = normalizeStatus(quoteType);

  return (
    QUOTE_TYPE_LABELS[normalizedType] ||
    normalizedType ||
    "-"
  );
};

const getConsignmentTypeLabel = (consignmentType) => {
  const rawValue = String(consignmentType ?? "").trim();
  const normalizedType = normalizeStatus(rawValue);

  return (
    CONSIGNMENT_TYPE_LABELS[normalizedType] ||
    rawValue ||
    "-"
  );
};

const getStatusClassName = (status) => {
  return String(status || "unknown")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
};

const getSafeText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();

  return text || fallback;
};

const getBooleanLabel = (value) => {
  return value ? "Có" : "Không";
};

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-07-09T09:34:49.1217925
 * - 2026-07-09T09:37:26.3885142Z
 * - 2026-07-09T09:34:49+07:00
 *
 * Output luôn là UTC ISO chuẩn để hiển thị và so sánh.
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const normalizeAdditionalFeeTime = (fee) => {
  if (!fee) {
    return fee;
  }

  return {
    ...fee,
    createdAtUtc: normalizeApiTimeToUtc(
      fee.createdAt
    ),
    updatedAtUtc: normalizeApiTimeToUtc(
      fee.updatedAt
    ),
  };
};

const normalizeQuotationTime = (quotation) => {
  if (!quotation) {
    return quotation;
  }

  return {
    ...quotation,
    createdAtUtc: normalizeApiTimeToUtc(
      quotation.createdAt
    ),
    updatedAtUtc: normalizeApiTimeToUtc(
      quotation.updatedAt
    ),
    expiredAtUtc: normalizeApiTimeToUtc(
      quotation.expiredAt
    ),
    additionalFees: Array.isArray(
      quotation.additionalFees
    )
      ? quotation.additionalFees.map(
          normalizeAdditionalFeeTime
        )
      : [],
  };
};

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

const isExpiredUtc = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return false;
  }

  const expiredTime = new Date(utcIso).getTime();
  const nowTime = getSyncedNowDate().getTime();

  return expiredTime < nowTime;
};

/* =========================================================
   FORMATTERS
   ========================================================= */

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

const formatFeeQuantity = (quantity) => {
  if (
    quantity === null ||
    quantity === undefined ||
    quantity === ""
  ) {
    return "-";
  }

  return formatNumber(quantity, 2);
};

const formatFeePercent = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return `${formatNumber(number, 2)}%`;
};

/* =========================================================
   FEE HELPERS
   ========================================================= */

const getFeeCodeLabel = (code) => {
  const normalizedCode = normalizeStatus(code);

  if (!normalizedCode) {
    return "";
  }

  return (
    FEE_CODE_LABELS[normalizedCode] ||
    formatStatusCode(normalizedCode)
  );
};

const getFeeLabel = (fee) => {
  return (
    fee?.label ||
    fee?.feeName ||
    getFeeCodeLabel(fee?.code) ||
    "Phí phát sinh"
  );
};

const getFeeTypeLabel = (fee) => {
  const type = normalizeStatus(
    fee?.feeType ||
      fee?.type ||
      fee?.code
  );

  return (
    FEE_TYPE_LABELS[type] ||
    formatStatusCode(type)
  );
};

const getFeeCalculationType = (fee) => {
  return normalizeStatus(
    fee?.feeCalculationType ||
      fee?.calculationType
  );
};

const getFeeCalculationTypeLabel = (fee) => {
  const type = getFeeCalculationType(fee);

  return (
    CALCULATION_TYPE_LABELS[type] ||
    formatStatusCode(type)
  );
};

/**
 * Ưu tiên amount vì đây là số tiền thật API đã tính.
 * value có thể là giá trị cấu hình như 3% nên chỉ dùng sau cùng.
 */
const getFeeAmount = (fee) => {
  const amount =
    fee?.amount ??
    fee?.totalAmount ??
    fee?.price ??
    fee?.value ??
    0;

  const number = Number(amount);

  return Number.isFinite(number)
    ? number
    : 0;
};

const isFeeEnabled = (fee) => {
  return fee?.enabled !== false;
};

const isFeeRequired = (fee) => {
  return Boolean(fee?.isRequired);
};

const getAdditionalFees = (quotation) => {
  return Array.isArray(
    quotation?.additionalFees
  )
    ? quotation.additionalFees
    : [];
};

const getFallbackCostItems = (quotation) => {
  return [
    {
      key: "freight",
      label: "Cước vận chuyển quốc tế",
      value:
        quotation?.estimatedFreightCharge ??
        0,
      enabled: true,
      required: true,
      meta: "Dịch vụ chính",
      calculationType: "Theo báo giá",
      note: "Cước vận chuyển chính của đơn hàng.",
      raw: null,
    },
    {
      key: "service",
      label: "Phí dịch vụ",
      value: quotation?.serviceFee ?? 0,
      enabled: true,
      required: false,
      meta: "Phí dịch vụ",
      calculationType: "Theo báo giá",
      note: "Phí dịch vụ phát sinh nếu có.",
      raw: null,
    },
    {
      key: "tax",
      label: "Thuế và phí nhập khẩu",
      value: quotation?.taxAndDuty ?? 0,
      enabled: true,
      required: false,
      meta: "Thuế / phí nhập khẩu",
      calculationType: "Theo báo giá",
      note: "Thuế và phí nhập khẩu phát sinh nếu có.",
      raw: null,
    },
  ];
};

const normalizeFeeToCostItem = (
  fee,
  index
) => {
  const enabled = isFeeEnabled(fee);
  const calculationType =
    getFeeCalculationTypeLabel(fee);

  return {
    key:
      fee?.id ||
      fee?.feeId ||
      fee?.pricingRuleId ||
      `${fee?.code || "fee"}-${index}`,
    id: fee?.id,
    pricingRuleId: fee?.pricingRuleId,
    feeId: fee?.feeId,
    code: fee?.code,
    codeLabel: getFeeCodeLabel(fee?.code),
    label: getFeeLabel(fee),
    value: getFeeAmount(fee),
    enabled,
    required: isFeeRequired(fee),
    feeType: getFeeTypeLabel(fee),
    calculationType,
    rawCalculationType:
      fee?.feeCalculationType ||
      fee?.calculationType,
    unitPrice: fee?.unitPrice,
    quantity: fee?.quantity,
    unitNoun: fee?.unitNoun,
    configValue: fee?.value,
    note: fee?.note,
    createdAtUtc: fee?.createdAtUtc,
    createdAt: fee?.createdAt,
    raw: fee,
  };
};

const getCostItems = (quotation) => {
  const additionalFees =
    getAdditionalFees(quotation);

  if (additionalFees.length > 0) {
    return additionalFees.map(
      normalizeFeeToCostItem
    );
  }

  return getFallbackCostItems(
    quotation
  );
};

const getActiveCostItems = (
  costItems = []
) => {
  return costItems.filter(
    (item) => item.enabled
  );
};

const getActiveCostTotal = (
  costItems = []
) => {
  return getActiveCostItems(costItems)
    .reduce(
      (total, item) =>
        total + Number(item.value || 0),
      0
    );
};

const getDisplayTotalCost = (
  quotation,
  costItems = []
) => {
  const apiTotal = Number(
    quotation?.totalEstimatedCost
  );

  if (Number.isFinite(apiTotal)) {
    return apiTotal;
  }

  return getActiveCostTotal(costItems);
};

const getQuotationCode = (quotation) => {
  const code =
    quotation?.consignmentCode ||
    quotation?.quotationCode ||
    quotation?.quoteCode ||
    quotation?.quotationId;

  return (
    String(code || "").trim() ||
    "-"
  );
};


const extractQuotationData = (response) => {
  if (!response) {
    return null;
  }

  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ];

  return (
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        (
          item.quotationId ||
          item.quotationCode ||
          item.quoteCode ||
          item.orderId ||
          item.quoteType ||
          item.additionalFees 
        )
    ) || null
  );
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

  const [
    statusOptions,
    setStatusOptions,
  ] = useState([]);

  const fetchQuotation =
    useCallback(
      async (
        signal,
        {
          showSuccessNotification = false,
        } = {}
      ) => {
        if (!orderId) {
          const missingOrderMessage =
            "Không tìm thấy mã đơn hàng.";

          setErrorMessage(
            missingOrderMessage
          );

          setQuotation(null);
          setLoading(false);

          AuthNotify.error(
            "Không thể tải báo giá",
            missingOrderMessage
          );

          return false;
        }

        try {
          setLoading(true);
          setErrorMessage("");

          const [
            quotationResult,
            statusesResult,
          ] = await Promise.allSettled([
            getOrderQuotationApi(
              orderId,
              {
                signal,
              }
            ),
            getConsignmentStatusesApi({
              signal,
            }),
          ]);

          if (
            quotationResult.status ===
            "rejected"
          ) {
            throw quotationResult.reason;
          }

          const quotationData =
            extractQuotationData(
              quotationResult.value
            );

          if (!quotationData) {
            throw new Error(
              "API không trả về dữ liệu báo giá."
            );
          }

          setQuotation(
            normalizeQuotationTime(
              quotationData
            )
          );

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
            !isCanceledRequest(
              statusesResult.reason
            )
          ) {
            console.error(
              "Lỗi lấy danh sách trạng thái:",
              statusesResult.reason
            );

            AuthNotify.warning(
              "Không tải được trạng thái",
              getApiErrorMessage(
                statusesResult.reason,
                "Báo giá vẫn được hiển thị nhưng tên trạng thái có thể chưa được cập nhật."
              )
            );
          }

          if (
            showSuccessNotification
          ) {
            AuthNotify.success(
              "Làm mới thành công",
              "Thông tin báo giá đã được cập nhật."
            );
          }

          return true;
        } catch (error) {
          if (
            isCanceledRequest(error)
          ) {
            return false;
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

          AuthNotify.error(
            "Không thể tải báo giá",
            apiMessage
          );

          return false;
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
      controller.signal,
      {
        showSuccessNotification: true,
      }
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  const statusLabelMap = useMemo(
    () =>
      new Map(
        statusOptions.map(
          (option) => [
            normalizeStatus(
              option.value
            ),
            option.label,
          ]
        )
      ),
    [statusOptions]
  );

  const getQuotationStatusLabel =
    useCallback(
      (status) => {
        const normalizedStatus =
          normalizeStatus(status);

        return (
          statusLabelMap.get(
            normalizedStatus
          ) ||
          QUOTATION_STATUS_FALLBACK_LABELS[
            normalizedStatus
          ] ||
          formatStatusCode(
            normalizedStatus
          ) ||
          "-"
        );
      },
      [statusLabelMap]
    );

  const costItems = useMemo(
    () => {
      if (!quotation) {
        return [];
      }

      return getCostItems(
        quotation
      );
    },
    [quotation]
  );

  const activeCostItems = useMemo(
    () => getActiveCostItems(costItems),
    [costItems]
  );

  const activeCostTotal = useMemo(
    () => getActiveCostTotal(costItems),
    [costItems]
  );

  const displayTotalCost = useMemo(
    () =>
      getDisplayTotalCost(
        quotation,
        costItems
      ),
    [quotation, costItems]
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

  const hasExpired =
    isExpiredUtc(
      quotation.expiredAtUtc ||
        quotation.expiredAt
    );

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
                  {getQuotationCode(
                    quotation
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

              <span>
                Ngày tạo:
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
              </span>
            </div>
          </div>
        </div>

        <div className="quotation-hero-total">
          <span>
            Tổng chi phí theo báo giá
          </span>

          <strong>
            {formatMoney(
              displayTotalCost
            )}
          </strong>

          <small
            title={formatDateTimeUtcTitle(
              quotation.expiredAtUtc ||
                quotation.expiredAt
            )}
          >
            Có hiệu lực đến{" "}
            {formatDateTime(
              quotation.expiredAtUtc ||
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
                Hiển thị đầy đủ các khoản phí
              </p>
            </div>
          </div>

          <div className="quotation-base-cost-grid">
            <div>
              <span>Cước vận chuyển</span>
              <strong>
                {formatMoney(
                  quotation.estimatedFreightCharge
                )}
              </strong>
            </div>

            <div>
              <span>Phí dịch vụ</span>
              <strong>
                {formatMoney(
                  quotation.serviceFee
                )}
              </strong>
            </div>

            <div>
              <span>Thuế / phí nhập khẩu</span>
              <strong>
                {formatMoney(
                  quotation.taxAndDuty
                )}
              </strong>
            </div>
          </div>

          <div className="quotation-cost-list">
            {costItems.length === 0 ? (
              <div className="quotation-cost-row">
                <span>
                  <span>
                    Chưa có khoản phí
                  </span>

                  <small>
                    API chưa trả về danh sách khoản phí
                  </small>
                </span>

                <strong>
                  {formatMoney(0)}
                </strong>
              </div>
            ) : (
              costItems.map(
                (item) => (
                  <div
                    key={item.key}
                    className={[
                      "quotation-cost-row",
                      !item.enabled &&
                        "quotation-cost-row--disabled",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>
                      <span>
                        {item.label}
                      </span>

                      <small>
                        {item.calculationType ||
                          item.meta ||
                          "Khoản phí"}
                        {item.required
                          ? " • Bắt buộc"
                          : " • Tùy chọn"}
                        {!item.enabled
                          ? " • Chưa áp dụng"
                          : ""}
                      </small>

                      {item.note && (
                        <em>
                          {item.note}
                        </em>
                      )}
                    </span>

                    <strong>
                      {formatMoney(
                        item.value
                      )}
                    </strong>
                  </div>
                )
              )
            )}

            {activeCostTotal !== displayTotalCost && (
              <div className="quotation-cost-row quotation-cost-row--sub-total">
                <span>
                  <span>
                    Tổng các phí đang bật
                  </span>

                  <small>
                    Dòng này dùng để đối chiếu với tổng tiền báo giá từ hệ thống
                  </small>
                </span>

                <strong>
                  {formatMoney(
                    activeCostTotal
                  )}
                </strong>
              </div>
            )}

            <div className="quotation-cost-total">
              <div>
                <span>
                  TỔNG CHI PHÍ THEO BÁO GIÁ
                </span>

               
              </div>

              <strong>
                {formatMoney(
                  displayTotalCost
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
                Hiển thị đầy đủ thông tin báo giá
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
                {quotation.consignmentCode ||
                  quotation.quotationCode ||
                  quotation.quoteCode ||
                  quotation.quotationId ||
                  "-"}
              </span>
            </Descriptions.Item>

            <Descriptions.Item label="Mã định danh báo giá">
              <span className="quotation-id-text">
                {quotation.quotationId || "-"}
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
                className={`quotation-inline-status status-${effectiveStatusClass}`}
              >
                {getQuotationStatusLabel(
                  effectiveStatus
                )}
              </span>
            </Descriptions.Item>

            <Descriptions.Item label="Loại vận chuyển">
              {getConsignmentTypeLabel(
                quotation.consignmentType
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Tổng trọng lượng">
              {formatNumber(
                quotation.totalWeight
              )}{" "}
              kg
            </Descriptions.Item>

            <Descriptions.Item label="Tổng thể tích">
              {formatNumber(
                quotation.totalVolume
              )}{" "}
              cm³
            </Descriptions.Item>

            <Descriptions.Item label="Trọng lượng quy đổi">
              {formatNumber(
                quotation.volumetricWeight
              )}{" "}
              kg
            </Descriptions.Item>

            <Descriptions.Item label="Trọng lượng tính cước">
              {formatNumber(
                quotation.chargeableWeight
              )}{" "}
              kg
            </Descriptions.Item>

            <Descriptions.Item label="Cước vận chuyển">
              <strong className="quotation-info-money">
                {formatMoney(
                  quotation.estimatedFreightCharge
                )}
              </strong>
            </Descriptions.Item>

            <Descriptions.Item label="Phí dịch vụ">
              <strong className="quotation-info-money">
                {formatMoney(
                  quotation.serviceFee
                )}
              </strong>
            </Descriptions.Item>

            <Descriptions.Item label="Thuế / phí nhập khẩu">
              <strong className="quotation-info-money">
                {formatMoney(
                  quotation.taxAndDuty
                )}
              </strong>
            </Descriptions.Item>

            <Descriptions.Item label="Tổng báo giá">
              <strong className="quotation-info-money is-total">
                {formatMoney(
                  displayTotalCost
                )}
              </strong>
            </Descriptions.Item>

            <Descriptions.Item label="Số khoản phí">
              {costItems.length} khoản
            </Descriptions.Item>

            <Descriptions.Item label="Phí đang áp dụng">
              {activeCostItems.length} khoản
            </Descriptions.Item>
          </Descriptions>
        </section>
      </div>

      <section className="quotation-card quotation-fees-detail-section">
        <div className="quotation-section-header">
          <div className="quotation-section-icon cost">
            <PaymentsOutlinedIcon />
          </div>

          <div>
            <h2>
              Danh sách phụ phí 
            </h2>

            <p>
              Hiển thị đầy đủ tên phí, loại phí, cách tính, số lượng và ghi chú
            </p>
          </div>
        </div>

        {costItems.length === 0 ? (
          <div className="quotation-fee-empty">
            Hệ thống chưa trả về danh sách khoản phí.
          </div>
        ) : (
          <div className="quotation-fees-detail-grid">
            {costItems.map(
              (fee) => (
                <article
                  key={fee.key}
                  className={[
                    "quotation-fee-detail-card",
                    !fee.enabled &&
                      "is-disabled",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="quotation-fee-detail-header">
                    <div>
                      <span className="quotation-fee-code">
                        {getSafeText(
                          fee.codeLabel,
                          fee.label
                        )}
                      </span>

                      <h3>
                        {fee.label}
                      </h3>
                    </div>

                    <strong>
                      {formatMoney(
                        fee.value
                      )}
                    </strong>
                  </div>

                  <div className="quotation-fee-tags">
                    <Tag
                      color={
                        fee.enabled
                          ? "green"
                          : "default"
                      }
                    >
                      {fee.enabled
                        ? "Đang áp dụng"
                        : "Chưa áp dụng"}
                    </Tag>

                    <Tag
                      color={
                        fee.required
                          ? "red"
                          : "blue"
                      }
                    >
                      {fee.required
                        ? "Bắt buộc"
                        : "Tùy chọn"}
                    </Tag>

                    <Tag color="gold">
                      {fee.calculationType}
                    </Tag>
                  </div>

                  <div className="quotation-fee-detail-grid-inner">
                    <div>
                      <span>Loại phí</span>
                      <strong>
                        {getSafeText(
                          fee.feeType
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Đơn giá</span>
                      <strong>
                        {getFeeCalculationType(fee.raw) ===
                        "PERCENTAGE"
                          ? formatFeePercent(
                              fee.unitPrice ??
                                fee.configValue
                            )
                          : formatMoney(
                              fee.unitPrice
                            )}
                      </strong>
                    </div>

                    <div>
                      <span>Số lượng</span>
                      <strong>
                        {formatFeeQuantity(
                          fee.quantity
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Đơn vị</span>
                      <strong>
                        {getSafeText(
                          fee.unitNoun
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Trạng thái áp dụng</span>
                      <strong>
                        {fee.enabled
                          ? "Đang áp dụng"
                          : "Chưa áp dụng"}
                      </strong>
                    </div>

                    <div>
                      <span>Tính chất phí</span>
                      <strong>
                        {fee.required
                          ? "Bắt buộc"
                          : "Tùy chọn"}
                      </strong>
                    </div>

                    <div>
                      <span>Mã định danh phí</span>
                      <strong className="quotation-id-text">
                        {getSafeText(
                          fee.feeId
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Mã quy tắc giá</span>
                      <strong className="quotation-id-text">
                        {getSafeText(
                          fee.pricingRuleId
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Ngày tạo phí</span>
                      <strong
                        title={formatDateTimeUtcTitle(
                          fee.createdAtUtc ||
                            fee.createdAt
                        )}
                      >
                        {formatDateTime(
                          fee.createdAtUtc ||
                            fee.createdAt
                        )}
                      </strong>
                    </div>
                  </div>

                  {fee.note && (
                    <p className="quotation-fee-note">
                      {fee.note}
                    </p>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>

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

  
    </div>
  );
};

export default QuotationDetail;
