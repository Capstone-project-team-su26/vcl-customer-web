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
   LABEL
   ========================================================= */

const QUOTATION_STATUS_FALLBACK_LABELS = {
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

const formatStatusCode = (status) => {
  const normalizedStatus =
    normalizeStatus(status);

  if (!normalizedStatus) {
    return "-";
  }

  return normalizedStatus
    .replaceAll("_", " ")
    .replaceAll("-", " ");
};

const normalizeStatusOptions = (
  apiResult
) => {
  const candidates = [
    apiResult,
    apiResult?.data,
    apiResult?.items,
    apiResult?.statuses,
    apiResult?.quotationStatuses,
    apiResult?.data?.items,
    apiResult?.data?.statuses,
    apiResult?.data?.quotationStatuses,
  ];

  const rawStatuses =
    candidates.find(Array.isArray) || [];

  return rawStatuses
    .map((item) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        const value =
          normalizeStatus(item);

        return {
          value,
          label:
            formatStatusCode(value),
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

/* =========================================================
   UTC TIME HELPERS
   ========================================================= */

/**
 * Chuẩn hóa thời gian API về UTC ISO.
 *
 * API có thể trả:
 * - 2026-07-01T04:26:34.9714508
 * - 2026-07-01T04:26:34Z
 * - 2026-07-01T04:26:34+07:00
 *
 * Output luôn là UTC ISO chuẩn:
 * - 2026-07-01T04:26:34.971Z
 */
const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
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
  };
};

/**
 * Hiển thị cho user Việt Nam, dữ liệu gốc luôn parse qua UTC trước.
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
 * Tooltip hiển thị UTC gốc để kiểm tra khi cần.
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

/**
 * Check hết hạn bằng giờ đã sync server nếu timeUtc.js đã sync,
 * tránh lệch khi máy người dùng sai giờ.
 */
const isExpiredUtc = (value) => {
  const utcIso = normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return false;
  }

  const expiredTime = new Date(utcIso).getTime();
  const nowTime = getSyncedNowDate().getTime();

  return expiredTime < nowTime;
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

const getQuotationCode = (
  quotation
) => {
  const code =
    quotation?.quotationCode ||
    quotation?.quoteCode ||
    quotation?.quotationId;

  return (
    String(code || "").trim() ||
    "-"
  );
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
            !axios.isCancel(
              statusesResult.reason
            ) &&
            statusesResult.reason?.code !==
              "ERR_CANCELED" &&
            statusesResult.reason?.name !==
              "CanceledError" &&
            statusesResult.reason?.name !==
              "AbortError"
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
              "Thông tin báo giá và trạng thái đã được cập nhật."
            );
          }

          return true;
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

  const statusClass =
    effectiveStatusClass;

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

          <small
            title={formatDateTimeUtcTitle(
              quotation.expiredAtUtc ||
                quotation.expiredAt
            )}
          >
            Báo giá có hiệu lực đến{" "}
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
                  effectiveStatus
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
