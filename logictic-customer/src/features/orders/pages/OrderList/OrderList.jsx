import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Empty, Input, Spin, Tag } from "antd";
import {
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import { useUrlPagedRows } from "@shared/hooks/usePagination";
import { PAGE_QUERY_KEY } from "@shared/utils/pagination";
import ListPagination from "@shared/components/ListPagination/ListPagination";

import {
  ORDER_STAGES,
  ORDER_STAGE_CHIPS,
  PURCHASE_SETTLEMENT_TAB,
  buildOrderListSummary,
  countByStage,
  filterRows,
  isFilteredView,
  normalizeStage,
} from "./OrderList.helpers";
/* Cùng một nguồn với badge menu: tải MỌI trang, cùng định nghĩa "đang chờ bạn xử lý"
   (số đỏ) và "VCL đang xử lý" (số xám). */
import {
  loadOrderRows,
  publishOrderTodoCount,
  summarizeOrderCounts,
} from "@features/orders/data/orderTodoRows";
import {
  ORDER_KINDS,
  ORDER_TABS,
  orderDetailPath,
  purchaseRequestDetailPath,
  purchaseRequestQuotationPath,
  purchaseWarehouseOrderPath,
} from "@features/orders/constants/orderPaths";

/* Cùng class/màu với badge menu: số đỏ/xám trong câu tóm tắt trông y như trên menu. */
import "@shared/styles/countBadge.css";
import "./OrderList.css";

/* Tải hết đơn của khách một lượt (mọi trang) rồi lọc tại chỗ: đổi chip là hiện ngay,
   không phải chờ mạng sau mỗi lần bấm. */

const COPY = {
  [ORDER_KINDS.consignment]: {
    title: "Đơn ký gửi",
    subtitle:
      "Hàng bạn tự mua rồi gửi về kho VCL. Dòng nào ghi màu cam là đang chờ bạn làm một việc.",
    searchPlaceholder: "Tìm theo mã đơn (VCL-…)",
    empty: "Không có đơn ký gửi nào khớp bộ lọc này.",
    loadError: "Không tải được danh sách đơn ký gửi.",
  },
  [ORDER_KINDS.purchase]: {
    title: "Đơn mua hộ",
    subtitle:
      "Hàng VCL mua hộ bạn từ website nước ngoài. Dòng nào ghi màu cam là đang chờ bạn làm một việc.",
    searchPlaceholder: "Tìm theo mã đơn (PUR-…)",
    empty: "Không có đơn mua hộ nào khớp bộ lọc này.",
    loadError: "Không tải được danh sách đơn mua hộ.",
  },
};

const EMPTY_STATE = { key: null, rows: [], error: "" };

/**
 * MỘT component danh sách, dùng cho cả hai mục menu "Đơn ký gửi" và "Đơn mua hộ".
 *
 * Loại đơn do route khoá sẵn (`/orders/ky-gui`, `/orders/mua-ho`) nên trong trang không
 * còn chip chọn loại — khách đã chọn bằng menu rồi. Cái còn lại là thứ khách thật sự lọc:
 * giai đoạn đơn và mã đơn, cả hai nằm trên query (?stage=&q=) để gửi link vẫn giữ bộ lọc.
 *
 * Thay cho 8 mục menu cũ ("Đơn đang xử lý" ×2, "Kiện chờ báo giá" ×2, "Theo dõi đơn
 * hàng", "Lịch sử mua hàng" ×3). Mỗi dòng nói thẳng VIỆC KHÁCH CẦN LÀM và bấm vào là mở
 * đúng tab của đơn.
 *
 * @param {{ kind: "ky-gui" | "mua-ho" }} props
 */
export default function OrderList({ kind = ORDER_KINDS.consignment }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stage = normalizeStage(searchParams.get("stage"));
  const search = searchParams.get("q") || "";
  const copy = COPY[kind] || COPY[ORDER_KINDS.consignment];

  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState(EMPTY_STATE);

  /* Khoá yêu cầu thay cho cờ `loading` riêng: state chỉ đổi trong callback của promise,
     không setState thẳng trong thân effect. */
  const requestKey = `${kind}|${refreshKey}`;
  const loading = state.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    loadOrderRows(kind, { signal }).then(
      (rows) => {
        if (signal.aborted) return;

        setState({ key: requestKey, rows, error: "" });
        /* Badge menu nhận đúng hai con số của danh sách vừa tải — hai chỗ không lệch nhau. */
        publishOrderTodoCount(kind, summarizeOrderCounts(rows));
      },
      (error) => {
        if (signal.aborted || isCanceledError(error)) return;

        setState({
          key: requestKey,
          rows: [],
          error: getApiErrorMessage(error, copy.loadError),
        });
      },
    );

    return () => controller.abort();
  }, [requestKey, kind, copy.loadError]);

  /* Đổi chip / ô tìm kiếm = đổi query, không đổi state riêng: URL luôn là nguồn sự thật.
     Bộ lọc đổi thì về trang 1 (xoá ?page=); cỡ trang (?size=) giữ nguyên. */
  const updateQuery = (patch) => {
    const next = new URLSearchParams(searchParams);
    next.delete(PAGE_QUERY_KEY);

    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === ORDER_STAGES.all) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    setSearchParams(next, { replace: true });
  };

  const stageCounts = useMemo(() => countByStage(state.rows), [state.rows]);

  const visibleRows = useMemo(
    () => filterRows(state.rows, { stage, search }),
    [state.rows, stage, search],
  );

  /* Phân trang PHÍA CLIENT trên các dòng đã lọc: danh sách vẫn tải hết mọi trang API (để
     số trên chip, câu tóm tắt và badge menu đếm TOÀN BỘ đơn), chỉ phần hiển thị bị cắt.
     Trang nằm trên URL (?page=&size=) cạnh ?stage=&q=. */
  const listTopRef = useRef(null);
  const pagedRows = useUrlPagedRows(visibleRows);

  const changePage = (nextPage, nextSize) => {
    pagedRows.onChange(nextPage, nextSize);
    listTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  /* Đúng bộ số đã gửi cho badge menu (publishOrderTodoCount ở trên): tính trên TOÀN BỘ
     dòng, không phải dòng đang lọc. */
  const orderCounts = useMemo(() => summarizeOrderCounts(state.rows), [state.rows]);

  const summary = buildOrderListSummary({
    counts: orderCounts,
    visibleCount: visibleRows.length,
    filtered: isFilteredView({ stage, search }),
  });

  const openRow = (row) => {
    if (row.kind === ORDER_KINDS.purchase) {
      /* Chờ tất toán đơn kho PUR: một đơn thì mở thẳng tab Thanh toán của đơn đó; nhiều
         đơn thì về yêu cầu mua hộ, khối "Đơn mua nhà cung cấp" có nút cho từng đơn. */
      if (row.todo.tab === PURCHASE_SETTLEMENT_TAB) {
        const [only, ...rest] = row.settlements || [];

        navigate(
          only?.orderId && rest.length === 0
            ? purchaseWarehouseOrderPath(only.orderId, ORDER_TABS.payment, row.id)
            : purchaseRequestDetailPath(row.id),
        );
        return;
      }

      navigate(
        row.todo.tab === "quotation"
          ? purchaseRequestQuotationPath(row.id)
          : purchaseRequestDetailPath(row.id),
      );
      return;
    }

    navigate(orderDetailPath(row.id, row.todo.tab || ORDER_TABS.journey));
  };

  return (
    <div className="order-list" ref={listTopRef}>
      <header className="order-list__head">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>

        <button
          type="button"
          className="order-list__reload"
          onClick={() => setRefreshKey((key) => key + 1)}
        >
          <ReloadOutlined />
          Tải lại
        </button>
      </header>

      <div className="order-list__filters">
        <div
          className="order-list__chip-row"
          role="group"
          aria-label="Lọc theo giai đoạn đơn"
        >
          {ORDER_STAGE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`order-chip ${stage === chip.value ? "is-active" : ""}`}
              aria-pressed={stage === chip.value}
              onClick={() => updateQuery({ stage: chip.value })}
            >
              {chip.label}
              {stageCounts[chip.value] ? (
                <span className="order-chip__count">{stageCounts[chip.value]}</span>
              ) : null}
            </button>
          ))}
        </div>

        <Input
          allowClear
          className="order-list__search"
          prefix={<SearchOutlined />}
          placeholder={copy.searchPlaceholder}
          value={search}
          onChange={(event) => updateQuery({ q: event.target.value })}
        />
      </div>

      {state.error ? (
        <Alert type="error" showIcon message={state.error} className="order-list__alert" />
      ) : null}

      {loading ? (
        <div className="order-list__loading">
          <Spin size="large" />
        </div>
      ) : visibleRows.length === 0 ? (
        <Empty className="order-list__empty" description={copy.empty} />
      ) : (
        <>
          {summary.filtered ? (
            <p className="order-list__summary">
              Đang lọc: {summary.visibleCount} đơn
              <span className="order-list__summary-note">
                {` · số trên menu đếm toàn bộ ${summary.total} đơn`}
              </span>
            </p>
          ) : (
            <p className="order-list__summary">
              <span>{summary.total} đơn</span>
              {summary.parts.map((part) => (
                <span key={part.key} className="order-list__summary-part">
                  <span className="order-list__summary-sep" aria-hidden="true">
                    ·
                  </span>
                  {part.badge ? (
                    <span
                      className={`menu-badge${
                        part.badge === "progress" ? " menu-badge--progress" : ""
                      }`}
                    >
                      {part.count}
                    </span>
                  ) : (
                    <span>{part.count}</span>
                  )}
                  <span>{part.label}</span>
                </span>
              ))}
            </p>
          )}

          <ul className="order-list__rows">
            {pagedRows.items.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  className={`order-row order-row--${row.todo.tone}`}
                  onClick={() => openRow(row)}
                >
                  <span className="order-row__main">
                    <span className="order-row__code-line">
                      <strong>{row.code}</strong>
                      <Tag>{row.statusLabel}</Tag>
                    </span>

                    <span className={`order-row__todo order-row__todo--${row.todo.tone}`}>
                      {row.todo.text}
                    </span>

                    <span className="order-row__meta">
                      {row.route ? <span>{row.route}</span> : null}
                      {row.receiverName ? <span>Nhận: {row.receiverName}</span> : null}
                      {row.createdAt ? (
                        <span>Tạo lúc {formatVietnamDateTime(row.createdAt)}</span>
                      ) : null}
                    </span>
                  </span>

                  <RightOutlined className="order-row__arrow" />
                </button>
              </li>
            ))}
          </ul>

          <ListPagination
            {...pagedRows.paginationProps}
            onChange={changePage}
            unit="đơn"
            ariaLabel="Phân trang danh sách đơn"
          />
        </>
      )}
    </div>
  );
}
