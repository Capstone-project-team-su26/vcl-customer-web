import { useEffect, useMemo, useRef, useState } from "react";

import { getServicePricingById } from "../../../../api/ServiceApi/pricingRuleService";

import "../ServicePolicy.css";

const FIELD_LABELS = {
  serviceName: "Dịch vụ",
  serviceType: "Loại dịch vụ",
  originCountry: "Quốc gia gửi",
  destinationCountry: "Quốc gia nhận",
  unitType: "Đơn vị tính",
  price: "Đơn giá",
  currency: "Loại tiền",
  effectiveDate: "Ngày áp dụng",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  status: "Trạng thái",
};

const PRIORITY_FIELDS = [
  "serviceName",
  "serviceType",
  "originCountry",
  "destinationCountry",
  "price",
  "unitType",
  "currency",
  "effectiveDate",
  "status",
];

const HIDDEN_FIELDS = [
  "id",
  "servicePricingId",
  "pricingRule",
  "pricingRules",
  "pricingRuleIds",
  "boxPricingRule",
  "boxPricingRules",
  "carrierId",
  "serviceCode",
  "description",
  "unit",
];

const normalizeFieldKey = (value) => {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
};

const isHiddenField = (field) => {
  const normalizedField = normalizeFieldKey(field);

  return HIDDEN_FIELDS.some(
    (hiddenField) => normalizeFieldKey(hiddenField) === normalizedField,
  );
};

const STATUS_LABELS = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Ngừng áp dụng",
  PENDING: "Chờ áp dụng",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  EXPIRED: "Hết hiệu lực",
  DISABLED: "Tạm ngưng",
  DRAFT: "Bản nháp",
  DELETED: "Đã xóa",
};

const COUNTRY_LABELS = {
  VN: "Việt Nam",
  VIETNAM: "Việt Nam",
  JP: "Nhật Bản",
  JAPAN: "Nhật Bản",
  KR: "Hàn Quốc",
  KOREA: "Hàn Quốc",
  CN: "Trung Quốc",
  CHINA: "Trung Quốc",
  US: "Hoa Kỳ",
  USA: "Hoa Kỳ",
  UNITED_STATES: "Hoa Kỳ",
  ID: "Indonesia",
  INDONESIA: "Indonesia",
};

const SERVICE_TYPE_LABELS = {
  STANDARD: "Tiêu chuẩn",
  EXPRESS: "Hỏa tốc",
  FAST: "Nhanh",
};

const CLOSE_ANIMATION_TIME = 240;

const normalizeCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getPricingId = (pricing) => {
  return String(pricing?.id || pricing?.servicePricingId || "").trim();
};

const getFieldLabel = (field) => {
  if (FIELD_LABELS[field]) {
    return FIELD_LABELS[field];
  }

  return String(field || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim();
};

const getStatusLabel = (status) => {
  const normalizedStatus = normalizeCode(status);

  if (!normalizedStatus) {
    return "Chưa xác định";
  }

  return (
    STATUS_LABELS[normalizedStatus] ||
    normalizedStatus
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (character) => character.toUpperCase())
  );
};

const getStatusClassName = (status) => {
  const normalizedStatus = normalizeCode(status);

  if (["ACTIVE", "APPROVED"].includes(normalizedStatus)) {
    return "is-active";
  }

  if (["PENDING", "PENDING_REVIEW", "DRAFT"].includes(normalizedStatus)) {
    return "is-pending";
  }

  if (["REJECTED", "DELETED"].includes(normalizedStatus)) {
    return "is-danger";
  }

  if (["INACTIVE", "DISABLED", "EXPIRED"].includes(normalizedStatus)) {
    return "is-inactive";
  }

  return "is-neutral";
};

const getCountryLabel = (value) => {
  const normalizedValue = normalizeCode(value);

  return COUNTRY_LABELS[normalizedValue] || String(value || "-");
};

const getServiceTypeLabel = (value) => {
  const normalizedValue = normalizeCode(value);

  return SERVICE_TYPE_LABELS[normalizedValue] || String(value || "-");
};

const formatMoney = (value, currency = "VND") => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value ?? "-";
  }

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: String(currency || "VND").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(numericValue);
  } catch {
    return `${numericValue.toLocaleString("vi-VN")} ${currency || ""}`.trim();
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const renderValue = (key, value, pricing) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (key === "status") {
    return getStatusLabel(value);
  }

  if (key === "serviceType") {
    return getServiceTypeLabel(value);
  }

  if (key === "originCountry" || key === "destinationCountry") {
    return getCountryLabel(value);
  }

  if (key === "price") {
    return formatMoney(value, pricing?.currency);
  }

  if (["effectiveDate", "createdAt", "updatedAt"].includes(key)) {
    return formatDateTime(value);
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

export default function ServicePolicyDetail({ open, pricing, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [detail, setDetail] = useState(pricing);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMounted(true);
    setClosing(false);
    setDetail(pricing);
    setErrorMessage("");
  }, [open, pricing]);

  useEffect(() => {
    if (!open || !pricing) {
      return undefined;
    }

    const pricingId = getPricingId(pricing);

    if (!pricingId) {
      setErrorMessage(
        "Bảng giá này chưa có mã ID. Hệ thống đang hiển thị dữ liệu từ danh sách.",
      );
      return undefined;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await getServicePricingById(pricingId, {
          signal: controller.signal,
        });

        if (
          response &&
          typeof response === "object" &&
          !Array.isArray(response)
        ) {
          setDetail((current) => ({
            ...(current || {}),
            ...response,
          }));
        }
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        console.error("Lỗi tải chi tiết bảng giá:", error);

        setErrorMessage(
          error?.message ||
            "Không thể tải dữ liệu chi tiết. Hệ thống vẫn hiển thị dữ liệu từ danh sách.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      controller.abort();
    };
  }, [open, pricing]);

  useEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mounted]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const fields = useMemo(() => {
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
      return [];
    }

    const keys = Object.keys(detail).filter(
      (key) => !isHiddenField(key),
    );
    const orderedKeys = [
      ...PRIORITY_FIELDS.filter((key) => keys.includes(key)),
      ...keys.filter((key) => !PRIORITY_FIELDS.includes(key)),
    ];

    return orderedKeys.map((key) => ({
      key,
      label: getFieldLabel(key),
      value: renderValue(key, detail[key], detail),
    }));
  }, [detail]);

  const requestClose = () => {
    if (closing) {
      return;
    }

    setClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setDetail(null);
      setErrorMessage("");
      onClose?.();
    }, CLOSE_ANIMATION_TIME);
  };

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`service-policy-detail ${
        closing ? "is-closing" : "is-opening"
      }`}
      role="presentation"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        className="service-policy-detail__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-policy-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="service-policy-detail__header">
          <div>
            <span>CHI TIẾT BẢNG GIÁ</span>
            <h2 id="service-policy-detail-title">
              {getServiceTypeLabel(detail?.serviceType)}
            </h2>
            <p>
              {getCountryLabel(detail?.originCountry)} →{" "}
              {getCountryLabel(detail?.destinationCountry)}
            </p>
          </div>

          {/* <button
              type="button"
              className="service-policy-detail__close"
              onClick={requestClose}
              aria-label="Đóng cửa sổ chi tiết"
            >
              ×
            </button> */}
        </header>

        <div className="service-policy-detail__hero">
          <div>
            <span>Đơn giá áp dụng</span>
            <strong>{formatMoney(detail?.price, detail?.currency)}</strong>
            <small>Trên mỗi {detail?.unitType || "đơn vị"}</small>
          </div>

          <span
            className={`service-policy-detail__status ${getStatusClassName(
              detail?.status,
            )}`}
          >
            <i />
            {getStatusLabel(detail?.status)}
          </span>
        </div>

        {loading && (
          <div className="service-policy-detail__loading">
            <span className="policy-service__spinner" />
            <p>Đang cập nhật dữ liệu chi tiết...</p>
          </div>
        )}

        {errorMessage && (
          <div className="service-policy-detail__warning">
            <strong>Lưu ý</strong>
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="service-policy-detail__content">
          <div className="service-policy-detail__grid">
            {fields.map((field, index) => (
              <article
                key={field.key}
                className={`service-policy-detail__field ${
                  field.key === "carrierId" ? "is-wide" : ""
                }`}
                style={{
                  animationDelay: `${Math.min(index * 35, 280)}ms`,
                }}
              >
                <span>{field.label}</span>
                <strong title={field.value}>{field.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <footer className="service-policy-detail__footer">
          <button type="button" onClick={requestClose}>
            Đóng
          </button>
        </footer>
      </section>
    </div>
  );
}
