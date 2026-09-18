import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Result, Spin, Tag } from "antd";
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  ReloadOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

/* Trang nạp SAU CÙNG trong dashboardRoutes nên đi qua barrel không làm đổi thứ tự CSS. */
import { getConsignmentDetailApi, getOrderStatusLabel } from "@features/consignment";
import { OrderDeliveryCard, ParcelHandlingCard } from "@features/delivery";
import { SettlementPreviewCard, StorageFeeCard } from "@features/settlement";
import { OrderIncidentsCard } from "@features/incidents";

import { getOrderTrackingApi } from "@features/tracking/api/orderTrackingApi";
import TrackingStageBar from "@features/tracking/components/TrackingStageBar/TrackingStageBar";
import TrackingJourney from "@features/tracking/components/TrackingJourney/TrackingJourney";
import ExportHoldCard from "@features/tracking/components/ExportHoldCard/ExportHoldCard";
import OrderPermitCard from "@features/tracking/components/OrderPermitCard/OrderPermitCard";
import {
  getTrackingStageLabel,
  isVnStage,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";
import { ORDER_TRACKING_LIST_PATH } from "@features/tracking/constants/trackingPaths";

import "./OrderTrackingDetail.css";

/* Trạng thái đơn backend có mà bộ 19 mã đích của app chưa có — hiện đúng chữ server. */
const EXTRA_ORDER_STATUS_LABELS = {
  CUSTOMER_CONFIRMED: "Bạn đã xác nhận nhận hàng",
  WAREHOUSE_RECEIVED: "Đã lưu kho nguồn",
  CANCELLED_FORFEITED: "Huỷ do quá hạn thanh toán, mất cọc",
};

/**
 * Theo dõi & xử lý một đơn ký gửi sau khi hàng tới kho — màn "một cửa" của khách:
 *
 * - hành trình (GET /api/orders/consignments/{id}/tracking): thanh chặng, từng kiện, chuyến +
 *   mã vận đơn + hãng + ngày dự kiến, dòng thời gian;
 * - ở kho nguồn: giữ hàng (export-hold), giấy phép hàng hạn chế (attachments PERMIT);
 * - hàng về VN: chọn hướng từng kiện, xem trước + trả tất toán, phí lưu kho, đặt giao, phí
 *   giao lại, sự cố & khiếu nại, "Đã nhận hàng".
 *
 * Các thẻ tự tải dữ liệu của mình; thao tác ở thẻ này (ví dụ chọn xử lý sự cố) có thể đổi
 * thẻ khác (tất toán hết vướng, kiện sẵn sàng giao) nên mọi thẻ nhận chung `refreshKey` và
 * báo `onChanged` để cả trang tải lại một lượt.
 */
export default function OrderTrackingDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${orderId}|${refreshKey}`;
  const [result, setResult] = useState({ key: null, tracking: null, order: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled([
      getOrderTrackingApi(orderId, { signal }),
      /* Chi tiết đơn chỉ để lấy người nhận / địa chỉ điền sẵn form đặt giao — lỗi thì bỏ qua. */
      getConsignmentDetailApi(orderId, { signal }),
    ]).then(([trackingResult, orderResult]) => {
      if (signal.aborted) return;

      if (trackingResult.status === "rejected") {
        if (isCanceledError(trackingResult.reason)) return;

        setResult({
          key: requestKey,
          tracking: null,
          order: null,
          error: {
            status: trackingResult.reason?.response?.status,
            message: getApiErrorMessage(trackingResult.reason, "Không tải được hành trình đơn."),
          },
        });
        return;
      }

      setResult({
        key: requestKey,
        tracking: trackingResult.value,
        order: orderResult.status === "fulfilled" ? orderResult.value : null,
        error: null,
      });
    });

    return () => controller.abort();
  }, [orderId, requestKey]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  const { tracking, order, error } = result;
  const firstLoad = result.key === null;
  const reloading = result.key !== requestKey && !firstLoad;

  /* Mốc "đã giao" mới nhất trong dòng thời gian — tính hạn khiếu nại 3 ngày. */
  const deliveredAt = useMemo(() => {
    const times = (tracking?.events || [])
      .filter((event) => String(event.stage).toUpperCase() === "DELIVERED")
      .map((event) => event.time)
      .filter(Boolean)
      .sort();

    return times.length ? times[times.length - 1] : null;
  }, [tracking?.events]);

  if (firstLoad) {
    return (
      <div className="order-tracking-detail__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Result
        status={error.status === 403 ? "403" : error.status === 404 ? "404" : "warning"}
        title={error.status === 403 ? "Bạn không xem được đơn này" : "Không tải được hành trình"}
        subTitle={error.message}
        extra={
          <Button type="primary" onClick={() => navigate(ORDER_TRACKING_LIST_PATH)}>
            Về danh sách theo dõi
          </Button>
        }
      />
    );
  }

  const orderStatus = String(tracking.orderStatus || order?.status || "").toUpperCase();
  const orderStatusLabel = EXTRA_ORDER_STATUS_LABELS[orderStatus] || getOrderStatusLabel(orderStatus);

  /* Tới kho VN khi đơn — hoặc bất kỳ kiện nào (đơn tách chuyến) — đã ở chặng VN. */
  const atVn =
    isVnStage(tracking.currentStage) ||
    tracking.parcels.some((parcel) => isVnStage(parcel.stage));

  return (
    <div className="order-tracking-detail">
      <div className="order-tracking-detail__nav">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(ORDER_TRACKING_LIST_PATH)}>
          Danh sách theo dõi
        </Button>
        <div className="order-tracking-detail__nav-actions">
          <Button icon={<FileTextOutlined />} onClick={() => navigate(`/consignments/${orderId}`)}>
            Chi tiết đơn
          </Button>
          <Button
            icon={<WalletOutlined />}
            onClick={() => navigate(`/orders/${orderId}/payments/history`)}
          >
            Lịch sử thanh toán
          </Button>
          <Button icon={<ReloadOutlined />} loading={reloading} onClick={refresh}>
            Tải lại
          </Button>
        </div>
      </div>

      <section className="order-tracking-detail__hero">
        <div className="order-tracking-detail__hero-top">
          <div>
            <span className="order-tracking-detail__eyebrow">Đơn ký gửi</span>
            <h1>{tracking.consignmentCode}</h1>
            <p>
              {tracking.originWarehouseName || "Kho nguồn"} →{" "}
              {tracking.destinationWarehouseName || "Kho Việt Nam"}
            </p>
          </div>
          <div className="order-tracking-detail__hero-tags">
            <Tag color={isWarningStage(tracking.currentStage) ? "orange" : "blue"}>
              {getTrackingStageLabel(tracking.currentStage, tracking.currentStageText)}
            </Tag>
            {orderStatus ? <Tag>{orderStatusLabel}</Tag> : null}
            {tracking.exportHold ? <Tag color="orange">Đang giữ hàng</Tag> : null}
            {tracking.isSplitAcrossStages ? <Tag color="purple">Tách chuyến</Tag> : null}
          </div>
        </div>

        <TrackingStageBar stage={tracking.currentStage} stageText={tracking.currentStageText} />

        {tracking.estimatedArrivalDate ? (
          <p className="order-tracking-detail__eta">
            Dự kiến về: <strong>{formatVietnamDateTime(tracking.estimatedArrivalDate)}</strong>
          </p>
        ) : null}
      </section>

      <ExportHoldCard
        orderId={orderId}
        exportHold={tracking.exportHold}
        exportHoldReason={tracking.exportHoldReason}
        stage={tracking.currentStage}
        onChanged={refresh}
      />

      <OrderIncidentsCard
        orderId={orderId}
        orderStatus={orderStatus}
        deliveredAt={deliveredAt}
        parcels={tracking.parcels}
        refreshKey={refreshKey}
        onChanged={refresh}
      />

      <ParcelHandlingCard orderId={orderId} refreshKey={refreshKey} onChanged={refresh} />

      {atVn ? (
        <>
          <SettlementPreviewCard orderId={orderId} refreshKey={refreshKey} />
          <StorageFeeCard orderId={orderId} refreshKey={refreshKey} />
          <OrderDeliveryCard
            orderId={orderId}
            order={order}
            orderStatus={orderStatus}
            refreshKey={refreshKey}
            onChanged={refresh}
          />
        </>
      ) : null}

      <OrderPermitCard orderId={orderId} refreshKey={refreshKey} />

      <TrackingJourney tracking={tracking} />
    </div>
  );
}
