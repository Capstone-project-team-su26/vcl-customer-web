import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Tag } from "antd";
import { CompassOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import { getOrderTrackingApi } from "@features/tracking/api/orderTrackingApi";
import TrackingStageBar from "@features/tracking/components/TrackingStageBar/TrackingStageBar";
import { isWarningStage } from "@features/tracking/constants/trackingStages";
import { orderTrackingDetailPath } from "@features/tracking/constants/trackingPaths";

/**
 * Thẻ tóm tắt hành trình đặt trong chi tiết đơn ký gửi: chặng hiện tại, ngày dự kiến
 * về và lối vào màn "Theo dõi đơn" (nơi có giữ hàng, giấy phép, tất toán, giao hàng,
 * sự cố). Đơn chưa có hàng ở kho / không xem được thì tự ẩn — không phải lỗi cần báo.
 *
 * @param {{ orderId: string }} props
 */
export default function OrderJourneyCard({ orderId }) {
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    getOrderTrackingApi(orderId, { signal: controller.signal })
      .then(setTracking)
      .catch((error) => {
        if (!isCanceledError(error)) setTracking(null);
      });

    return () => controller.abort();
  }, [orderId]);

  if (!tracking) return null;

  /* Đơn chưa gửi hàng tới kho (còn báo giá / chờ cọc) thì chưa có hành trình để xem. */
  if (tracking.currentStage === "NOT_RECEIVED" && tracking.events.length === 0) return null;

  const eta = tracking.estimatedArrivalDate;
  const lastEvent = tracking.events?.[tracking.events.length - 1];

  return (
    <SectionCard
      icon={<CompassOutlined />}
      tone={isWarningStage(tracking.currentStage) ? "warning" : "default"}
      title="Hành trình đơn hàng"
      subtitle={
        eta
          ? `Dự kiến về: ${formatVietnamDateTime(eta)}`
          : "Theo dõi hàng từ kho nguồn tới tay bạn."
      }
      extra={
        <Button type="primary" onClick={() => navigate(orderTrackingDetailPath(orderId))}>
          Theo dõi & xử lý đơn
        </Button>
      }
    >
      <TrackingStageBar stage={tracking.currentStage} stageText={tracking.currentStageText} />

      {tracking.exportHold ? (
        <p className="section-card__hint">
          <Tag color="orange">Đang giữ hàng</Tag>
          {tracking.exportHoldReason || ""}
        </p>
      ) : null}

      {lastEvent ? (
        <p className="section-card__hint">
          Mốc mới nhất: <strong>{lastEvent.title}</strong> ·{" "}
          {formatVietnamDateTime(lastEvent.time)}
        </p>
      ) : null}
    </SectionCard>
  );
}
