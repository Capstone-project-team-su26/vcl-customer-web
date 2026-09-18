import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { getConsignmentTimelineApi } from "@features/consignment/api/consignmentApi";
import { isCanceledRequest } from "@shared/api/httpClient";
import { getTimelineEventLabel } from "./OrderTimelineCard.helpers";
import "./OrderTimelineCard.css";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

/**
 * Lịch sử đơn (GET /api/orders/consignments/{orderId}/timeline), mới nhất ở trên.
 * Tự ẩn khi đơn chưa có sự kiện nào hoặc khách không có quyền xem.
 */
export default function OrderTimelineCard({ orderId }) {
  const [state, setState] = useState({ loading: true, entries: [], error: "" });

  useEffect(() => {
    const controller = new AbortController();

    getConsignmentTimelineApi(orderId, { signal: controller.signal })
      .then((entries) => {
        setState({ loading: false, entries: [...entries].reverse(), error: "" });
      })
      .catch((error) => {
        if (isCanceledRequest(error)) return;

        const status = error?.response?.status;
        setState({
          loading: false,
          entries: [],
          /* 403/404: đơn không thuộc khách hoặc không tồn tại → ẩn khối, không báo lỗi. */
          error:
            status === 403 || status === 404
              ? ""
              : error?.response?.data?.message || "Không tải được lịch sử đơn.",
        });
      });

    return () => controller.abort();
  }, [orderId]);

  if (state.loading || (!state.entries.length && !state.error)) {
    return null;
  }

  return (
    <section className="otl-card">
      <header className="otl-head">
        <span className="otl-head__icon">
          <History size={20} />
        </span>
        <div>
          <h3>Lịch sử đơn</h3>
          <p>Các bước đơn đã đi qua, mới nhất ở trên</p>
        </div>
      </header>

      {state.error ? (
        <p className="otl-error">{state.error}</p>
      ) : (
        <ol className="otl-list">
          {state.entries.map((entry, index) => (
            <li key={`${entry.event}-${entry.at}-${index}`} className="otl-item">
              <span className="otl-dot" aria-hidden="true" />
              <div className="otl-body">
                <div className="otl-row">
                  <strong>{getTimelineEventLabel(entry)}</strong>
                  <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                </div>
                {entry.note ? <p className="otl-note">{entry.note}</p> : null}
                <span className="otl-actor">{entry.actorName || "Hệ thống"}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
