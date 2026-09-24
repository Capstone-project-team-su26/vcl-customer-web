import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button, Result, Spin, Tabs, Tag } from "antd";
import {
  ArrowLeftOutlined,
  CompassOutlined,
  FileProtectOutlined,
  InboxOutlined,
  ReloadOutlined,
  SolutionOutlined,
  WalletOutlined,
} from "@ant-design/icons";

import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

import {
  ConsignmentListDetail,
  QuotationDetail,
  getConsignmentDetailApi,
  getOrderStatusLabel,
} from "@features/consignment";
import OrderTimelineCard from "@features/consignment/components/OrderTimelineCard/OrderTimelineCard";
import {
  DeliveryTrackingCard,
  OrderDeliveryCard,
  ParcelHandlingCard,
} from "@features/delivery";
import { SettlementPreviewCard, StorageFeeCard } from "@features/settlement";
import { OrderIncidentsCard } from "@features/incidents";
import { OrderPaymentHistory } from "@features/payment";

/* Import sâu vào tracking: barrel của nó kéo theo trang tra cứu công khai (CSS toàn cục),
   ở đây chỉ cần API, hai khối hành trình và bảng đường dẫn — xem ARCHITECTURE mục 4. */
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
import {
  CONSIGNMENT_ORDERS_PATH,
  ORDER_TABS,
  orderDetailPath,
} from "@features/orders/constants/orderPaths";

import "./OrderDetail.css";

/* Trạng thái đơn backend có mà bộ 19 mã đích của app chưa có — hiện đúng chữ server. */
const EXTRA_ORDER_STATUS_LABELS = {
  CUSTOMER_CONFIRMED: "Bạn đã xác nhận nhận hàng",
  WAREHOUSE_RECEIVED: "Đã lưu kho nguồn",
  CANCELLED_FORFEITED: "Huỷ do quá hạn thanh toán, mất cọc",
};

const TAB_ITEMS = [
  { key: ORDER_TABS.journey, icon: <CompassOutlined />, label: "Hành trình" },
  { key: ORDER_TABS.quotation, icon: <SolutionOutlined />, label: "Báo giá & chi phí" },
  { key: ORDER_TABS.payment, icon: <WalletOutlined />, label: "Thanh toán" },
  { key: ORDER_TABS.parcels, icon: <InboxOutlined />, label: "Kiện & kho" },
  { key: ORDER_TABS.incidents, icon: <FileProtectOutlined />, label: "Sự cố & giấy tờ" },
];

/* Tab chỉ có nghĩa khi đơn đã có hàng ở kho: chưa có hành trình thì cũng chưa có chặng,
   chưa có kiện để phát sinh sự cố hay phải nộp giấy phép. Ẩn hẳn còn hơn mở ra một tab
   rỗng rồi bắt khách tự hiểu vì sao. */
const TRACKING_ONLY_TABS = new Set([ORDER_TABS.journey, ORDER_TABS.incidents]);

const getVisibleTabs = (hasTracking) =>
  hasTracking ? TAB_ITEMS : TAB_ITEMS.filter((item) => !TRACKING_ONLY_TABS.has(item.key));

/**
 * MỘT đơn ký gửi = MỘT trang, năm tab.
 *
 * Trước đây khách phải đi qua 5 URL rời (chi tiết đơn, báo giá, theo dõi, lịch sử
 * thanh toán, tất toán) mới xem hết một đơn; giờ tất cả nằm ở `/orders/:orderId/:tab`
 * nên chia sẻ link, bấm Back và tải lại đều rơi đúng chỗ khách đang đứng.
 *
 * Trang này KHÔNG viết lại nghiệp vụ: mỗi tab lắp lại đúng component đã có (QuotationDetail,
 * ConsignmentListDetail, OrderPaymentHistory và các thẻ của delivery / settlement /
 * incidents / receiving). Riêng phần nạp hành trình chuyển từ màn Theo dõi đơn cũ sang đây
 * vì tiêu đề trang cần chặng hiện tại để vẽ thanh tiến trình.
 *
 * Các thẻ tự tải dữ liệu của mình; thao tác ở thẻ này (ví dụ chọn xử lý sự cố) có thể đổi
 * thẻ khác (tất toán hết vướng, kiện sẵn sàng giao) nên mọi thẻ nhận chung `refreshKey` và
 * báo `onChanged` để cả trang tải lại một lượt.
 */
export default function OrderDetail() {
  const { orderId, tab } = useParams();
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${orderId}|${refreshKey}`;
  const [result, setResult] = useState({
    key: null,
    tracking: null,
    order: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled([
      /* Hành trình: đơn chưa gửi hàng tới kho thì API trả lỗi — không phải lỗi chí mạng,
         các tab báo giá / thanh toán vẫn xem được. */
      getOrderTrackingApi(orderId, { signal }),
      getConsignmentDetailApi(orderId, { signal }),
    ]).then(([trackingResult, orderResult]) => {
      if (signal.aborted) return;

      const tracking =
        trackingResult.status === "fulfilled" ? trackingResult.value : null;
      const order = orderResult.status === "fulfilled" ? orderResult.value : null;

      if (tracking || order) {
        setResult({ key: requestKey, tracking, order, error: null });
        return;
      }

      /* Cả hai đều hỏng: nếu chỉ vì người dùng rời trang thì đừng vẽ màn lỗi. */
      const reason = orderResult.reason ?? trackingResult.reason;
      if (isCanceledError(reason)) return;

      setResult({
        key: requestKey,
        tracking: null,
        order: null,
        error: {
          status: reason?.response?.status,
          message: getApiErrorMessage(reason, "Không tải được đơn hàng."),
        },
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
      <div className="order-detail__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Result
        status={error.status === 403 ? "403" : error.status === 404 ? "404" : "warning"}
        title={error.status === 403 ? "Bạn không xem được đơn này" : "Không tải được đơn hàng"}
        subTitle={error.message}
        extra={
          <Button type="primary" onClick={() => navigate(CONSIGNMENT_ORDERS_PATH)}>
            Về danh sách đơn ký gửi
          </Button>
        }
      />
    );
  }

  const orderStatus = String(
    tracking?.orderStatus || order?.status || "",
  ).toUpperCase();
  const orderStatusLabel =
    EXTRA_ORDER_STATUS_LABELS[orderStatus] || getOrderStatusLabel(orderStatus);

  const orderCode =
    tracking?.consignmentCode || order?.consignmentCode || order?.orderCode || orderId;

  /* Tab lạ trên URL, hoặc tab không dùng được với đơn này (gõ tay, link cũ, thông báo
     dẫn tới tab hành trình của đơn chưa gửi hàng) → về tab đầu tiên còn hiện. */
  const visibleTabs = getVisibleTabs(Boolean(tracking));
  const defaultTab = visibleTabs[0].key;

  if (!visibleTabs.some((item) => item.key === tab)) {
    return <Navigate to={orderDetailPath(orderId, defaultTab)} replace />;
  }

  /* Tới kho VN khi đơn — hoặc bất kỳ kiện nào (đơn tách chuyến) — đã ở chặng VN. */
  const atVn =
    Boolean(tracking) &&
    (isVnStage(tracking.currentStage) ||
      tracking.parcels.some((parcel) => isVnStage(parcel.stage)));

  const renderJourneyTab = () => {
    return (
      <>
        <ExportHoldCard
          orderId={orderId}
          exportHold={tracking.exportHold}
          exportHoldReason={tracking.exportHoldReason}
          stage={tracking.currentStage}
          onChanged={refresh}
        />

        {atVn ? (
          <OrderDeliveryCard
            orderId={orderId}
            order={order}
            orderStatus={orderStatus}
            refreshKey={refreshKey}
            onChanged={refresh}
          />
        ) : null}

        {/* Chặng giao cuối: mã vận đơn, số kiện. Nút mở màn theo dõi bị ẩn vì đang đứng
            ở chính màn đó. */}
        <DeliveryTrackingCard orderId={orderId} showOpenButton={false} />

        <TrackingJourney tracking={tracking} />

        <OrderTimelineCard orderId={orderId} />
      </>
    );
  };

  const renderTab = () => {
    switch (tab) {
      case ORDER_TABS.quotation:
        /* Còn chờ khách duyệt thì chính trang này hiện nút xác nhận / từ chối. */
        return <QuotationDetail embedded />;

      case ORDER_TABS.payment:
        return (
          <>
            {atVn ? (
              <>
                <SettlementPreviewCard orderId={orderId} refreshKey={refreshKey} />
                <StorageFeeCard orderId={orderId} refreshKey={refreshKey} />
              </>
            ) : null}

            <OrderPaymentHistory embedded />
          </>
        );

      case ORDER_TABS.parcels:
        return (
          <>
            <ConsignmentListDetail embedded />
            <ParcelHandlingCard
              orderId={orderId}
              refreshKey={refreshKey}
              onChanged={refresh}
            />
          </>
        );

      case ORDER_TABS.incidents:
        return (
          <>
            <OrderIncidentsCard
              orderId={orderId}
              orderStatus={orderStatus}
              deliveredAt={deliveredAt}
              parcels={tracking?.parcels || []}
              refreshKey={refreshKey}
              onChanged={refresh}
            />
            <OrderPermitCard orderId={orderId} refreshKey={refreshKey} />
          </>
        );

      default:
        return renderJourneyTab();
    }
  };

  return (
    <div className="order-detail">
      <div className="order-detail__nav">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(CONSIGNMENT_ORDERS_PATH)}
        >
          Đơn ký gửi
        </Button>

        <Button icon={<ReloadOutlined />} loading={reloading} onClick={refresh}>
          Tải lại
        </Button>
      </div>

      <section className="order-detail__hero">
        <div className="order-detail__hero-top">
          <div>
            <span className="order-detail__eyebrow">Đơn ký gửi</span>
            <h1>{orderCode}</h1>
            <p>
              {tracking
                ? `${tracking.originWarehouseName || "Kho nguồn"} → ${
                    tracking.destinationWarehouseName || "Kho Việt Nam"
                  }`
                : order?.route || "Đơn đang chờ xử lý tại VCL"}
            </p>
          </div>

          <div className="order-detail__hero-tags">
            {tracking ? (
              <Tag color={isWarningStage(tracking.currentStage) ? "orange" : "blue"}>
                {getTrackingStageLabel(tracking.currentStage, tracking.currentStageText)}
              </Tag>
            ) : null}
            {orderStatus ? <Tag>{orderStatusLabel}</Tag> : null}
            {tracking?.exportHold ? <Tag color="orange">Đang giữ hàng</Tag> : null}
            {tracking?.isSplitAcrossStages ? <Tag color="purple">Tách chuyến</Tag> : null}
          </div>
        </div>

        {tracking ? (
          <TrackingStageBar
            stage={tracking.currentStage}
            stageText={tracking.currentStageText}
          />
        ) : null}

        {tracking?.estimatedArrivalDate ? (
          <p className="order-detail__eta">
            Dự kiến về: <strong>{formatVietnamDateTime(tracking.estimatedArrivalDate)}</strong>
          </p>
        ) : null}
      </section>

      <Tabs
        className="order-detail__tabs"
        activeKey={tab}
        items={visibleTabs.map((item) => ({
          key: item.key,
          label: (
            <span className="order-detail__tab-label">
              {item.icon}
              {item.label}
            </span>
          ),
        }))}
        onChange={(key) => navigate(orderDetailPath(orderId, key))}
      />

      <div className="order-detail__panel">{renderTab()}</div>
    </div>
  );
}
