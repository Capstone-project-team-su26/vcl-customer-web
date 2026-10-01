/**
 * LỊCH SỬ ĐƠN MUA HỘ — cùng khuôn "Lịch sử đơn" (OrderTimelineCard) bên ký gửi, mới nhất ở trên.
 *
 * Nguồn: GET /api/purchase-requests/{id}/history (PurchaseRequestHistoryItemDto). Nhãn bước dùng bảng
 * nhãn khách của purchaseStages (không hiện mã thô); ảnh bằng chứng mua hàng (hoá đơn, màn hình đã
 * đặt) bấm để phóng to. Máy chủ chưa có API / chưa có dòng nào → hiện câu ngắn thay vì ẩn hẳn, để khách
 * biết khối này tồn tại.
 */
import { Alert, Button } from "antd";
import { HistoryOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import { getPurchaseStatusLabel } from "@features/purchase/constants/purchaseStages";

import "./PurchaseHistoryCard.css";

/**
 * @param {{ entries: object[], error?: boolean, createdAt?: string, onRetry?: () => void,
 *   onOpenImages?: (images: string[], index: number, alt: string) => void }} props
 */
export default function PurchaseHistoryCard({ entries = [], error = false, createdAt, onRetry, onOpenImages }) {
  const list = Array.isArray(entries) ? entries : [];

  return (
    <SectionCard
      icon={<HistoryOutlined />}
      title="Lịch sử đơn"
      subtitle="Các bước đơn đã đi qua, mới nhất ở trên."
    >
      {error ? (
        <Alert
          type="warning"
          showIcon
          title="Chưa tải được lịch sử đơn"
          action={onRetry ? <Button size="small" onClick={onRetry}>Thử lại</Button> : null}
        />
      ) : null}

      {!error && !list.length ? (
        <p className="purchase-history__empty">
          {createdAt
            ? `Bạn gửi yêu cầu lúc ${formatVietnamDateTime(createdAt, { apiTimeMode: "utc", fallback: "—" })}. Các bước tiếp theo sẽ hiện ở đây.`
            : "Chưa có bước nào được ghi nhận."}
        </p>
      ) : null}

      {list.length ? (
        <ol className="purchase-history">
          {list.map((entry, index) => {
            const label = getPurchaseStatusLabel(entry.toStatus, entry.toStatusDisplayName);
            const images = Array.isArray(entry.proofImages) ? entry.proofImages : [];

            return (
              <li
                key={entry.historyId || `${entry.toStatus}-${entry.createdAt}-${index}`}
                className={`purchase-history__item${index === 0 ? " is-latest" : ""}`}
              >
                <span className="purchase-history__dot" aria-hidden="true" />
                <div className="purchase-history__body">
                  <div className="purchase-history__row">
                    <strong>{label}</strong>
                    {entry.createdAt ? (
                      <time dateTime={entry.createdAt}>
                        {formatVietnamDateTime(entry.createdAt, { apiTimeMode: "utc", fallback: "—" })}
                      </time>
                    ) : null}
                  </div>

                  {entry.note ? <p className="purchase-history__note">{entry.note}</p> : null}

                  {images.length ? (
                    <div className="purchase-history__images">
                      {images.map((url, imageIndex) => (
                        <button
                          key={`${url}-${imageIndex}`}
                          type="button"
                          onClick={() => onOpenImages?.(images, imageIndex, `Ảnh bằng chứng · ${label}`)}
                          aria-label={`Xem ảnh bằng chứng ${imageIndex + 1}`}
                        >
                          <img src={url} alt={`Bằng chứng ${imageIndex + 1}`} loading="lazy" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <span className="purchase-history__actor">{entry.changedByName || "Hệ thống"}</span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </SectionCard>
  );
}
