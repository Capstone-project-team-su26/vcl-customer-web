import { useCallback, useEffect, useMemo, useState } from "react";

import { getServicePricings } from "../../../api/ServiceApi/pricingRuleService";

import ServicePolicyDetail from "./ServicePoliDetail/ServicePolicyDetail";
import "./ServicePolicy.css";

const COLUMN_LABELS = {
  serviceType: "Loại dịch vụ",
  originCountry: "Quốc gia gửi",
  destinationCountry: "Quốc gia nhận",
  price: "Đơn giá",
  currency: "Loại tiền",
  effectiveDate: "Ngày áp dụng",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  status: "Trạng thái",
};

const PRIORITY_COLUMNS = [
  "serviceType",
  "originCountry",
  "destinationCountry",
  "price",
  "currency",
  "effectiveDate",
  "status",
];
const HIDDEN_COLUMNS = [
  "serviceCode",
  "servicePricingId",
  "pricingRule",
  "pricingRules",
  "pricingRuleIds",
  "boxPricingRule",
  "boxPricingRules",
  "description",
  "unit",
  "unitType",
  "carrierId",
  "id",
];

const normalizeFieldKey = (value) => {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
};

const isHiddenColumn = (column) => {
  const normalizedColumn = normalizeFieldKey(column);

  return HIDDEN_COLUMNS.some(
    (hiddenColumn) => normalizeFieldKey(hiddenColumn) === normalizedColumn,
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
  // STANDARD: "Tiêu chuẩn",
  EXPRESS: "Hỏa tốc",
  STANDARD: "Tiêu chuẩn",
};

const isCanceledRequest = (error) => {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
};

const normalizeCode = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
};

const normalizeSearchText = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const getRowKey = (item, index) => {
  return (
    item?.id ||
    item?.servicePricingId ||
    `${item?.carrierId || "bang-gia"}-${index}`
  );
};

const getColumnLabel = (column) => {
  if (COLUMN_LABELS[column]) {
    return COLUMN_LABELS[column];
  }

  return String(column || "")
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

const renderRawValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
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

const getDisplayValue = (column, value, item) => {
  if (column === "price") {
    return formatMoney(value, item?.currency);
  }

  if (column === "status") {
    return getStatusLabel(value);
  }

  if (column === "originCountry" || column === "destinationCountry") {
    return getCountryLabel(value);
  }

  if (column === "serviceType") {
    return getServiceTypeLabel(value);
  }

  if (["effectiveDate", "createdAt", "updatedAt"].includes(column)) {
    return formatDateTime(value);
  }

  return renderRawValue(value);
};

export default function ServicePolicy() {
  const [servicePricings, setServicePricings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchServicePricings = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getServicePricings({
        signal,
      });

      setServicePricings(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isCanceledRequest(error)) {
        return;
      }

      console.error("Lỗi tải bảng giá dịch vụ:", error);

      setServicePricings([]);
      setErrorMessage(error?.message || "Không thể tải bảng giá dịch vụ.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchServicePricings(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchServicePricings, reloadKey]);

  const columns = useMemo(() => {
    const columnSet = new Set();

    servicePricings.forEach((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.keys(item).forEach((key) => {
          if (!isHiddenColumn(key)) {
            columnSet.add(key);
          }
        });
      }
    });

    const allColumns = Array.from(columnSet);

    return [
      ...PRIORITY_COLUMNS.filter((column) => allColumns.includes(column)),
      ...allColumns.filter((column) => !PRIORITY_COLUMNS.includes(column)),
    ];
  }, [servicePricings]);

  const filteredServicePricings = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchInput);

    if (!normalizedSearch) {
      return servicePricings;
    }

    return servicePricings.filter((item) => {
      const searchableContent = Object.entries(item || {})
        .map(([key, value]) => getDisplayValue(key, value, item))
        .map(normalizeSearchText)
        .join(" ");

      return searchableContent.includes(normalizedSearch);
    });
  }, [servicePricings, searchInput]);

  const totalRoutes = useMemo(() => {
    const routes = new Set();

    servicePricings.forEach((item) => {
      const origin = String(item?.originCountry || "").trim();
      const destination = String(item?.destinationCountry || "").trim();

      if (origin || destination) {
        routes.add(`${origin}-${destination}`);
      }
    });

    return routes.size;
  }, [servicePricings]);

  const totalServiceTypes = useMemo(() => {
    const serviceTypes = new Set();

    servicePricings.forEach((item) => {
      const serviceType = String(item?.serviceType || "").trim();

      if (serviceType) {
        serviceTypes.add(serviceType);
      }
    });

    return serviceTypes.size;
  }, [servicePricings]);

  const handleOpenDetail = (item) => {
    setSelectedPricing(item);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
  };

  const handleRowKeyDown = (event, item) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenDetail(item);
    }
  };

  return (
    <main className="policy-service">
      <header className="policy-service__header">
        <div className="policy-service__header-content">
          <div className="policy-service__header-icon">₫</div>

          <div>
            <span className="policy-service__eyebrow">CHÍNH SÁCH DỊCH VỤ</span>

            <h1>BẢNG GIÁ VẬN CHUYỂN</h1>

            <p>Bấm vào từng bảng giá để xem đầy đủ thông tin chi tiết.</p>
          </div>
        </div>

        <button
          type="button"
          className="policy-service__reload-button"
          onClick={() => setReloadKey((previous) => previous + 1)}
          disabled={loading}
        >
          <span
            className={`policy-service__reload-icon ${
              loading ? "is-loading" : ""
            }`}
          >
            ↻
          </span>

          {loading ? "Đang cập nhật" : "Cập nhật dữ liệu"}
        </button>
      </header>

      <section className="policy-service__statistics">
        <article className="policy-service__stat-card">
          <span>Tổng bảng giá</span>
          <strong>{servicePricings.length}</strong>
          <small>Bảng giá trên hệ thống</small>
        </article>

        <article className="policy-service__stat-card">
          <span>Tuyến vận chuyển</span>
          <strong>{totalRoutes}</strong>
          <small>Tuyến đang có bảng giá</small>
        </article>

        <article className="policy-service__stat-card">
          <span>Loại dịch vụ</span>
          <strong>{totalServiceTypes}</strong>
          <small>Dịch vụ đang được áp dụng</small>
        </article>
      </section>

      <section className="policy-service__card">
        <div className="policy-service__card-header">
          <div>
            <h2>Danh sách bảng giá</h2>
            <p>Dữ liệu được cập nhật trực tiếp từ hệ thống</p>
          </div>

          <div className="policy-service__search-wrapper">
            <span>⌕</span>

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm tuyến, dịch vụ, trạng thái..."
              aria-label="Tìm kiếm bảng giá"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="policy-service__state">
            <span className="policy-service__spinner" />
            <h3>Đang tải bảng giá</h3>
            <p>Hệ thống đang lấy dữ liệu mới nhất.</p>
          </div>
        ) : errorMessage ? (
          <div className="policy-service__state is-error">
            <div className="policy-service__state-icon">!</div>
            <h3>Không tải được dữ liệu</h3>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="policy-service__retry-button"
              onClick={() => setReloadKey((previous) => previous + 1)}
            >
              Thử tải lại
            </button>
          </div>
        ) : filteredServicePricings.length === 0 ? (
          <div className="policy-service__state">
            <div className="policy-service__state-icon">0</div>
            <h3>Không có dữ liệu phù hợp</h3>
            <p>Hãy thử thay đổi từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="policy-service__mobile-list">
              {filteredServicePricings.map((item, index) => (
                <article
                  key={getRowKey(item, index)}
                  className="policy-service__pricing-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenDetail(item)}
                  onKeyDown={(event) => handleRowKeyDown(event, item)}
                >
                  <div className="policy-service__pricing-card-head">
                    <div>
                      <span>Loại dịch vụ</span>
                      <h3>{getServiceTypeLabel(item?.serviceType)}</h3>
                    </div>

                    <span
                      className={`policy-service__status ${getStatusClassName(
                        item?.status,
                      )}`}
                    >
                      {getStatusLabel(item?.status)}
                    </span>
                  </div>

                  <div className="policy-service__route">
                    <span>{getCountryLabel(item?.originCountry)}</span>
                    <b>→</b>
                    <span>{getCountryLabel(item?.destinationCountry)}</span>
                  </div>

                  <div className="policy-service__price-box">
                    <span>Đơn giá</span>
                    <strong>{formatMoney(item?.price, item?.currency)}</strong>
                  </div>

                  <div className="policy-service__card-action">
                    <span>Xem chi tiết</span>
                    <b>→</b>
                  </div>
                </article>
              ))}
            </div>

            <div className="policy-service__table-wrapper">
              <table className="policy-service__table">
                <thead>
                  <tr>
                    <th className="policy-service__index-column">STT</th>

                    {columns.map((column) => (
                      <th key={column}>{getColumnLabel(column)}</th>
                    ))}

                    <th className="policy-service__action-column">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredServicePricings.map((item, index) => (
                    <tr
                      key={getRowKey(item, index)}
                      tabIndex={0}
                      onClick={() => handleOpenDetail(item)}
                      onKeyDown={(event) => handleRowKeyDown(event, item)}
                    >
                      <td className="policy-service__index-cell">
                        {index + 1}
                      </td>

                      {columns.map((column) => (
                        <td key={`${getRowKey(item, index)}-${column}`}>
                          {column === "status" ? (
                            <span
                              className={`policy-service__status ${getStatusClassName(
                                item?.status,
                              )}`}
                            >
                              {getStatusLabel(item?.status)}
                            </span>
                          ) : column === "serviceType" ? (
                            <span className="policy-service__service-badge">
                              {getServiceTypeLabel(item?.serviceType)}
                            </span>
                          ) : column === "price" ? (
                            <strong className="policy-service__price-cell">
                              {formatMoney(item?.price, item?.currency)}
                            </strong>
                          ) : (
                            getDisplayValue(column, item?.[column], item)
                          )}
                        </td>
                      ))}

                      <td className="policy-service__action-cell">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetail(item);
                          }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ServicePolicyDetail
        open={detailOpen}
        pricing={selectedPricing}
        onClose={handleCloseDetail}
      />
    </main>
  );
}
