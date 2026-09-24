import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Empty, Input, Spin, Tag } from "antd";
import {
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

/* Import sâu: chỉ cần hàm gọi danh sách, barrel kéo theo cả các trang (CSS toàn cục). */
import { getConsignmentsApi } from "@features/consignment/api/consignmentApi";
import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";
import { getAwaitingSettlementApi } from "@features/settlement/api/settlementApi";

import {
  ORDER_STAGES,
  ORDER_STAGE_CHIPS,
  countByStage,
  filterRows,
  normalizeStage,
  sortByNewest,
  toConsignmentRow,
  toPurchaseRow,
} from "./OrderList.helpers";
import {
  ORDER_KINDS,
  ORDER_TABS,
  orderDetailPath,
  purchaseRequestDetailPath,
  purchaseRequestQuotationPath,
} from "@features/orders/constants/orderPaths";

import "./OrderList.css";

/* Khách hiếm khi có hơn từng này đơn; lấy một lượt rồi lọc tại chỗ thì đổi chip là
   hiện ngay, không phải chờ mạng sau mỗi lần bấm. */
const PAGE_SIZE = 100;

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

const readItems = (response) => {
  const body = response?.data ?? response;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;

  return [];
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
  const isPurchase = kind === ORDER_KINDS.purchase;
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

    const load = isPurchase
      ? Promise.allSettled([getPurchaseRequestsApi(1, PAGE_SIZE, { signal })])
      : Promise.allSettled([
          getConsignmentsApi({
            params: { pageNumber: 1, pageSize: PAGE_SIZE },
            signal,
          }),
          /* Khoản đợt cuối Sale đã phát hành — để dòng đơn ghi rõ số tiền phải trả. */
          getAwaitingSettlementApi({ signal }),
        ]);

    load.then(([listResult, settlementResult]) => {
      if (signal.aborted) return;

      if (listResult.status === "rejected") {
        if (isCanceledError(listResult.reason)) return;

        setState({
          key: requestKey,
          rows: [],
          error: getApiErrorMessage(listResult.reason, copy.loadError),
        });
        return;
      }

      const items = readItems(listResult.value);

      if (isPurchase) {
        setState({ key: requestKey, rows: sortByNewest(items.map(toPurchaseRow)), error: "" });
        return;
      }

      const dueByOrderId = new Map(
        (settlementResult?.status === "fulfilled" ? settlementResult.value : []).map(
          (item) => [String(item?.orderId), item],
        ),
      );

      setState({
        key: requestKey,
        rows: sortByNewest(items.map((item) => toConsignmentRow(item, dueByOrderId))),
        error: "",
      });
    });

    return () => controller.abort();
  }, [requestKey, isPurchase, copy.loadError]);

  /* Đổi chip / ô tìm kiếm = đổi query, không đổi state riêng: URL luôn là nguồn sự thật. */
  const updateQuery = (patch) => {
    const next = new URLSearchParams(searchParams);

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

  const actionCount = visibleRows.filter((row) => row.todo.tone === "action").length;

  const openRow = (row) => {
    if (row.kind === ORDER_KINDS.purchase) {
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
    <div className="order-list">
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
          <p className="order-list__summary">
            {visibleRows.length} đơn
            {actionCount > 0 ? ` · ${actionCount} đơn đang chờ bạn xử lý` : ""}
          </p>

          <ul className="order-list__rows">
            {visibleRows.map((row) => (
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
        </>
      )}
    </div>
  );
}
