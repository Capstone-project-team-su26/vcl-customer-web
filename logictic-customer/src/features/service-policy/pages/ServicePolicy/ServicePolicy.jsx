import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { getServicePricingsApi } from "@features/pricing/api/servicePricingService";
import useWeightPricingParams from "@features/pricing/hooks/useWeightPricingParams";
import ServicePolicyDetail from "@features/service-policy/components/ServicePolicyDetail/ServicePolicyDetail";
import {
  buildCustomerPriceList,
  searchPriceList,
} from "@features/service-policy/utils/servicePricingTable";
import "./ServicePolicy.css";

/*
 * Bảng giá vận chuyển cho khách — CÙNG API với màn admin "Bảng giá vận chuyển"
 * (GET /api/service-pricings, cùng normalizeServicePricing). Chỉ hiện dòng đang áp dụng
 * và dòng sắp áp dụng (có nhãn); dòng đã bị bảng giá mới hơn thay thế bị ẩn.
 */

const TABLE_COLUMNS = [
  { key: "index", label: "STT", className: "policy-service__index-column" },
  { key: "service", label: "Dịch vụ" },
  { key: "weight", label: "Mức cân" },
  { key: "price", label: "Đơn giá", className: "is-right" },
  { key: "effective", label: "Áp dụng từ" },
  { key: "status", label: "Trạng thái" },
  { key: "action", label: "", className: "policy-service__action-column" },
];

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const formatKg = (value) =>
  Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export default function ServicePolicy() {
  const [servicePricings, setServicePricings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const weightParams = useWeightPricingParams();

  const fetchServicePricings = useCallback(async (signal) => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getServicePricingsApi({ signal });

      setServicePricings(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isCanceledRequest(error)) {
        return;
      }

      console.error("Lỗi tải bảng giá vận chuyển:", error);

      setServicePricings([]);
      setErrorMessage("Không thể tải bảng giá vận chuyển. Vui lòng thử lại.");
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

  const priceList = useMemo(
    () => buildCustomerPriceList(servicePricings),
    [servicePricings],
  );

  /* Lọc theo ô tìm kiếm rồi đánh STT liên tục qua các nhóm tuyến. */
  const visibleGroups = useMemo(
    () =>
      searchPriceList(priceList.groups, searchInput).reduce(
        (groups, group) => {
          const offset = groups.reduce((sum, item) => sum + item.rows.length, 0);

          return [
            ...groups,
            {
              ...group,
              rows: group.rows.map((row, index) => ({
                ...row,
                rowNumber: offset + index + 1,
              })),
            },
          ];
        },
        [],
      ),
    [priceList.groups, searchInput],
  );

  const visibleCount = visibleGroups.reduce(
    (sum, group) => sum + group.rows.length,
    0,
  );

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

  const { stats } = priceList;

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
          <strong>{loading ? "…" : stats.total}</strong>
          <small>
            {stats.upcoming > 0
              ? `Đang áp dụng · thêm ${stats.upcoming} bảng giá sắp áp dụng`
              : "Bảng giá đang áp dụng"}
          </small>
        </article>

        <article className="policy-service__stat-card">
          <span>Tuyến vận chuyển</span>
          <strong>{loading ? "…" : stats.routes}</strong>
          <small>Tuyến đang có bảng giá</small>
        </article>

        <article className="policy-service__stat-card">
          <span>Loại dịch vụ</span>
          <strong>{loading ? "…" : stats.serviceTypes}</strong>
          <small>Dịch vụ vận chuyển đang áp dụng</small>
        </article>
      </section>

      <section className="policy-service__card">
        <div className="policy-service__card-header">
          <div>
            <h2>Danh sách bảng giá</h2>
            <p>Theo tuyến, dịch vụ và mức cân — cập nhật trực tiếp từ hệ thống</p>
          </div>

          <div className="policy-service__search-wrapper">
            <span>⌕</span>

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm tuyến, dịch vụ, đơn giá..."
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

        {weightParams.status === "ready" && (
          <p className="policy-service__note">
            Cước tính theo cân tính cước = max(cân thực, cân quy đổi thể tích
            D×R×C/{weightParams.volumetricDivisor}), tối thiểu{" "}
            {formatKg(weightParams.minimumWeight)} kg. Đơn giá chưa gồm phụ phí
            dịch vụ (đóng gói, kiểm hàng, bảo hiểm…) và thuế.
          </p>
        )}

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
        ) : visibleCount === 0 ? (
          <div className="policy-service__state">
            <div className="policy-service__state-icon">0</div>
            <h3>
              {priceList.rows.length === 0
                ? "Chưa có bảng giá đang áp dụng"
                : "Không có dữ liệu phù hợp"}
            </h3>
            <p>
              {priceList.rows.length === 0
                ? "Vui lòng liên hệ CSKH để được báo giá."
                : "Hãy thử thay đổi từ khóa tìm kiếm."}
            </p>
          </div>
        ) : (
          <>
            <div className="policy-service__mobile-list">
              {visibleGroups.map((group) => (
                <section key={group.key} className="policy-service__mobile-group">
                  <h3 className="policy-service__mobile-group-title">
                    {group.label}
                  </h3>

                  {group.rows.map((item) => (
                    <article
                      key={item.id}
                      className="policy-service__pricing-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenDetail(item)}
                      onKeyDown={(event) => handleRowKeyDown(event, item)}
                    >
                      <div className="policy-service__pricing-card-head">
                        <div>
                          <span>Dịch vụ</span>
                          <h3>{item.view.serviceLabel}</h3>
                        </div>

                        <span
                          className={`policy-service__status ${item.view.statusTone}`}
                        >
                          {item.view.statusLabel}
                        </span>
                      </div>

                      <dl className="policy-service__pricing-card-meta">
                        <div>
                          <dt>Mức cân</dt>
                          <dd>{item.view.weightLabel}</dd>
                        </div>
                        <div>
                          <dt>Áp dụng từ</dt>
                          <dd>{item.view.effectiveLabel}</dd>
                        </div>
                      </dl>

                      <div className="policy-service__price-box">
                        <span>Đơn giá</span>
                        <strong className="policy-service__price-text">
                          {item.view.priceLabel}
                        </strong>
                      </div>
                    </article>
                  ))}
                </section>
              ))}
            </div>

            <div className="policy-service__table-wrapper">
              <table className="policy-service__table">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map((column) => (
                      <th key={column.key} className={column.className}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleGroups.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="policy-service__group-row">
                        <th colSpan={TABLE_COLUMNS.length} scope="rowgroup">
                          <span>{group.label}</span>
                          <small>{group.rows.length} bảng giá</small>
                        </th>
                      </tr>

                      {group.rows.map((item) => (
                          <tr
                            key={item.id}
                            className="policy-service__data-row"
                            tabIndex={0}
                            onClick={() => handleOpenDetail(item)}
                            onKeyDown={(event) => handleRowKeyDown(event, item)}
                          >
                            <td className="policy-service__index-cell">
                              {item.rowNumber}
                            </td>
                            <td>
                              <span className="policy-service__service-badge">
                                {item.view.serviceLabel}
                              </span>
                            </td>
                            <td className="policy-service__nowrap">
                              {item.view.weightLabel}
                            </td>
                            <td className="is-right">
                              <strong className="policy-service__price-text">
                                {item.view.priceLabel}
                              </strong>
                            </td>
                            <td className="policy-service__nowrap">
                              {item.view.effectiveLabel}
                            </td>
                            <td>
                              <span
                                className={`policy-service__status ${item.view.statusTone}`}
                              >
                                {item.view.statusLabel}
                              </span>
                            </td>
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
                    </Fragment>
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
