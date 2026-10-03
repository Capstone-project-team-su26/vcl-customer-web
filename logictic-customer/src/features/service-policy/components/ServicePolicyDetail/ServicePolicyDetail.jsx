import { useEffect, useMemo, useRef, useState } from "react";

import { getServicePricingDetailApi } from "@features/pricing/api/servicePricingService";
import {
  PRICE_STATUS_META,
  formatBoxRule,
  formatDate,
  formatUnitPrice,
  formatWeightRange,
  getRouteLabel,
  getServiceLabel,
  getUnitLabel,
} from "@features/service-policy/utils/servicePricingTable";

import "@features/service-policy/pages/ServicePolicy/ServicePolicy.css";

/*
 * Chi tiết một dòng bảng giá — đọc lại GET /api/service-pricings/{id} (API thật, cùng
 * normalizeServicePricing với admin). Chỉ hiện trường dành cho khách; không in mã hãng
 * vận chuyển hay mã nội bộ. Lỗi tải chi tiết thì giữ dữ liệu từ danh sách.
 */

const CLOSE_ANIMATION_TIME = 240;

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const getPricingId = (pricing) => {
  return String(pricing?.id || "").trim();
};

const buildFields = (detail) => [
  { key: "service", label: "Dịch vụ", value: getServiceLabel(detail?.serviceType) },
  { key: "route", label: "Tuyến", value: getRouteLabel(detail) },
  { key: "unit", label: "Đơn vị tính", value: getUnitLabel(detail?.unitType) },
  { key: "weight", label: "Mức cân", value: formatWeightRange(detail) },
  { key: "price", label: "Đơn giá", value: formatUnitPrice(detail) },
  { key: "currency", label: "Loại tiền", value: detail?.currency || "VND" },
  { key: "effective", label: "Áp dụng từ", value: formatDate(detail?.effectiveDate) },
];

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

        const response = await getServicePricingDetailApi(pricingId, {
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
            /* Trạng thái hiệu lực tính trên cả danh sách — giữ của dòng đã bấm. */
            view: current?.view,
          }));
        }
      } catch (error) {
        if (isCanceledRequest(error)) {
          return;
        }

        console.error("Lỗi tải chi tiết bảng giá:", error);

        setErrorMessage(
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

  const fields = useMemo(() => (detail ? buildFields(detail) : []), [detail]);

  const boxRules = useMemo(
    () =>
      (Array.isArray(detail?.boxPricingRules) ? detail.boxPricingRules : [])
        .filter((rule) => !rule?.status || String(rule.status).toUpperCase() === "ACTIVE")
        .map(formatBoxRule),
    [detail],
  );

  const statusMeta = detail?.view
    ? { label: detail.view.statusLabel, tone: detail.view.statusTone }
    : PRICE_STATUS_META.CURRENT;

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
              {getServiceLabel(detail?.serviceType)}
            </h2>
            <p>{getRouteLabel(detail)}</p>
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
            <strong className="policy-service__price-text">
              {formatUnitPrice(detail)}
            </strong>
            <small>Áp dụng từ {formatDate(detail?.effectiveDate)}</small>
          </div>

          <span
            className={`service-policy-detail__status ${statusMeta.tone}`}
          >
            <i />
            {statusMeta.label}
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
                className="service-policy-detail__field"
                style={{
                  animationDelay: `${Math.min(index * 35, 280)}ms`,
                }}
              >
                <span>{field.label}</span>
                <strong title={field.value}>{field.value}</strong>
              </article>
            ))}
          </div>

          {boxRules.length > 0 && (
            <div className="service-policy-detail__box-rules">
              <h3>Phụ phí đóng gói áp dụng kèm</h3>
              <ul>
                {boxRules.map((rule, index) => (
                  <li key={`${rule.name}-${index}`}>
                    <span>{rule.name}</span>
                    <strong>{rule.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
