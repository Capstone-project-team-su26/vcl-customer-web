/**
 * ĐƠN VẬN CHUYỂN của yêu cầu mua hộ — "hàng của tôi đang ở đâu".
 *
 * Khi VCL đặt nhà cung cấp, backend sinh một đơn kho `PUR-…-n` cho mỗi đơn mua. Từ đó hàng đi y
 * như đơn ký gửi, nên mỗi đơn kho hiện đúng những thứ trang ký gửi hiện: chặng hiện tại, thanh chặng
 * 7 bậc (TrackingStageBar), kho đi → kho đến, ngày dự kiến về, tiền còn phải tất toán, và lối sang
 * trang chi tiết đơn kho (tab Hành trình / Thanh toán).
 *
 * Dữ liệu: `warehouseOrderId/Code/Status` của đơn mua NCC + GET /api/orders/consignments/{id}/tracking
 * + dòng chờ tất toán (GET /api/orders/awaiting-settlement). Đơn chưa có hàng ở kho thì API hành trình
 * báo lỗi — không phải lỗi của khách, chỉ hiện "kho chưa nhận hàng".
 *
 * Đơn đời cũ (chưa có đơn mua NCC): hiện `shipments` (lô vận chuyển) có sẵn trong chi tiết yêu cầu.
 */
import { Button, Empty, Tag } from "antd";
import { CompassOutlined, RocketOutlined, WalletOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVnd } from "@shared/utils/formatNumber";
import { apiToDate, formatVietnamDateTime } from "@shared/utils/timeUtc";
/* Import sâu: barrel tracking kéo theo trang tra cứu công khai (CSS toàn cục) — xem ARCHITECTURE mục 4. */
import TrackingStageBar from "@features/tracking/components/TrackingStageBar/TrackingStageBar";
import {
  getPackageStatusLabel,
  getTrackingStageLabel,
  isVnStage,
  isWarningStage,
} from "@features/tracking/constants/trackingStages";
/* Import sâu: chỉ cần bảng nhãn, barrel consignment kéo theo các trang. */
import { getOrderStatusLabel } from "@features/consignment/constants/orderStatus";

import "./PurchaseShipmentsCard.css";

const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatDate = (value) => {
  const date = value ? apiToDate(value, { apiTimeMode: "utc" }) : null;
  return date ? DATE_FORMAT.format(date) : "";
};

/* Trạng thái đơn kho đáng hiện thêm cạnh chặng (tiền / giao / đóng); trạng thái sớm như APPROVED
   ("Đã xác nhận") chỉ làm khách rối khi hàng còn chưa tới kho. */
const INFORMATIVE_ORDER_STATUSES = new Set([
  "WAITING_PAYMENT",
  "PAID",
  "STORED_AT_VN",
  "DELIVERING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

const FINISHED_STAGES = new Set(["DELIVERED", "DISPOSED"]);
const FINISHED_ORDER_STATUSES = new Set(["DELIVERED", "COMPLETED", "CUSTOMER_CONFIRMED", "CANCELLED"]);

const formatDateTime = (value) =>
  value ? formatVietnamDateTime(value, { apiTimeMode: "utc", fallback: "" }) : "";

function WarehouseOrderItem({ order, onOpen }) {
  const tracking = order.tracking;
  const stage = String(tracking?.currentStage || "").toUpperCase();
  const due = Number(order.dueAmount) || 0;
  const atVn =
    Boolean(tracking) &&
    (isVnStage(stage) || (tracking.parcels || []).some((parcel) => isVnStage(parcel?.stage)));
  const status = String(order.status || tracking?.orderStatus || "").toUpperCase();
  const finished = FINISHED_STAGES.has(stage) || FINISHED_ORDER_STATUSES.has(status);
  const settle = !finished && (due > 0 || status === "WAITING_PAYMENT" || atVn);
  const money = tracking?.money || null;
  const moneyDue = Number(money?.outstandingAmount) || 0;

  const facts = [
    tracking && {
      key: "route",
      label: "Tuyến",
      value: `${tracking.originWarehouseName || "Kho quốc tế"} → ${tracking.destinationWarehouseName || "Kho Việt Nam"}`,
    },
    tracking?.estimatedArrivalDate && !finished && {
      key: "eta",
      label: "Dự kiến về",
      value: formatDate(tracking.estimatedArrivalDate),
    },
    tracking && {
      key: "parcels",
      label: "Số kiện",
      value: `${(tracking.parcels || []).length} kiện`,
    },
    due > 0 && { key: "due", label: "Cần tất toán", value: formatVnd(due), tone: "is-due" },
    /* Chưa tới lượt tất toán: tiền của đơn vận chuyển theo báo giá (cước quốc tế + thuế tạm tính). */
    !due && money && {
      key: "money",
      label: moneyDue > 0 ? "Còn phải trả (tạm tính)" : "Tiền vận chuyển",
      value: moneyDue > 0 ? formatVnd(moneyDue) : `Đã trả ${formatVnd(money.paidAmount)}`,
      tone: moneyDue > 0 ? "is-pending" : "is-paid",
    },
  ].filter(Boolean);

  const lastEvent = Array.isArray(tracking?.events) && tracking.events.length
    ? tracking.events[tracking.events.length - 1]
    : null;

  return (
    <article className="purchase-shipment">
      <header className="purchase-shipment__head">
        <div className="purchase-shipment__title">
          <strong>{order.orderCode || "Đơn vận chuyển"}</strong>
          <span>
            {[order.supplierOrderCode ? `Đơn mua ${order.supplierOrderCode}` : "", order.supplierName]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        <div className="purchase-shipment__tags">
          {tracking ? (
            <Tag color={isWarningStage(stage) ? "orange" : stage === "DELIVERED" ? "green" : "blue"}>
              {getTrackingStageLabel(stage, tracking.currentStageText)}
            </Tag>
          ) : (
            <Tag>Kho quốc tế chưa nhận hàng</Tag>
          )}
          {INFORMATIVE_ORDER_STATUSES.has(status) ? (
            <Tag color={status === "WAITING_PAYMENT" ? "orange" : undefined}>{getOrderStatusLabel(status)}</Tag>
          ) : null}
          {tracking?.isSplitAcrossStages ? <Tag color="purple">Tách chuyến</Tag> : null}
        </div>
      </header>

      {tracking ? (
        <TrackingStageBar stage={stage} stageText={tracking.currentStageText} compact />
      ) : (
        <p className="purchase-shipment__hint">
          Người bán đang gửi hàng tới kho VCL ở nước ngoài. Kho nhận hàng xong, hành trình sẽ hiện ở đây.
        </p>
      )}

      {facts.length ? (
        <dl className="purchase-shipment__facts">
          {facts.map((fact) => (
            <div key={fact.key} className={fact.tone || ""}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {lastEvent ? (
        <p className="purchase-shipment__event">
          {/* Server có mốc trả chính mã làm `title` (vd. RECEIVED_AT_DESTINATION) → dịch lại. */}
          <b>{getTrackingStageLabel(lastEvent.stage || lastEvent.status, lastEvent.title)}</b>
          {lastEvent.location ? ` · ${lastEvent.location}` : ""}
          {lastEvent.time ? <time> · {formatDateTime(lastEvent.time)}</time> : null}
        </p>
      ) : null}

      {order.orderId ? (
        <div className="purchase-shipment__actions">
          <Button icon={<CompassOutlined />} onClick={() => onOpen?.(order.orderId, "journey")}>
            {tracking ? "Xem hành trình" : "Xem đơn vận chuyển"}
          </Button>
          {settle ? (
            <Button
              type={due > 0 ? "primary" : "default"}
              icon={<WalletOutlined />}
              onClick={() => onOpen?.(order.orderId, "payment")}
            >
              Thanh toán tất toán
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function LegacyShipment({ shipment }) {
  const parcels = Array.isArray(shipment?.parcels) ? shipment.parcels : [];

  return (
    <article className="purchase-shipment">
      <header className="purchase-shipment__head">
        <div className="purchase-shipment__title">
          <strong>{shipment.shipmentCode || "Lô vận chuyển"}</strong>
          <span>
            {[
              shipment.originWarehouseName && shipment.destinationWarehouseName
                ? `${shipment.originWarehouseName} → ${shipment.destinationWarehouseName}`
                : "",
              shipment.carrierTrackingCode ? `Mã vận đơn ${shipment.carrierTrackingCode}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {shipment.statusText || shipment.status ? (
          <Tag color="blue">{getTrackingStageLabel(shipment.status, shipment.statusText)}</Tag>
        ) : null}
      </header>

      {parcels.length ? (
        <ul className="purchase-shipment__parcels">
          {parcels.map((parcel, index) => (
            <li key={parcel.parcelId || parcel.packageCode || index}>
              <span>{parcel.packageCode || `Kiện ${index + 1}`}</span>
              <b>{getPackageStatusLabel(parcel.status || parcel.packageStatus, parcel.statusText)}</b>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="purchase-shipment__event">
        {[
          shipment.shippedAt ? `Khởi hành ${formatDate(shipment.shippedAt)}` : "",
          shipment.deliveredAt ? `Tới nơi ${formatDate(shipment.deliveredAt)}` : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Chưa có mốc khởi hành."}
      </p>
    </article>
  );
}

/**
 * @param {{ warehouseOrders: object[], legacyShipments?: object[], legacyOrderCode?: string,
 *   loading?: boolean, onOpen?: (orderId: string, tab: "journey"|"payment") => void }} props
 */
export default function PurchaseShipmentsCard({
  warehouseOrders = [],
  legacyShipments = [],
  legacyOrderCode = "",
  onOpen,
}) {
  const orders = Array.isArray(warehouseOrders) ? warehouseOrders : [];
  /* Lô vận chuyển của chi tiết yêu cầu chỉ hiện khi không có đơn kho — tránh kể một chuyến hai lần. */
  const shipments = !orders.length && Array.isArray(legacyShipments) ? legacyShipments : [];
  const empty = !orders.length && !shipments.length;

  return (
    <SectionCard
      icon={<RocketOutlined />}
      title="Vận chuyển về Việt Nam"
      subtitle={
        orders.length
          ? "Mỗi đơn mua có một đơn vận chuyển (mã PUR-…-n) — theo dõi hành trình và tất toán như đơn ký gửi."
          : "Hàng đi theo lô nào, đã tới đâu."
      }
      extra={orders.length > 1 ? <Tag color="purple">{orders.length} đơn vận chuyển</Tag> : null}
    >
      {empty ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            legacyOrderCode
              ? `Đơn kho ${legacyOrderCode} chưa lên lô vận chuyển nào.`
              : "Chưa có đơn vận chuyển. Khi VCL đặt hàng với người bán, bạn sẽ theo dõi hàng ở đây."
          }
        />
      ) : (
        <div className="purchase-shipments">
          {orders.map((order) => (
            <WarehouseOrderItem key={order.orderId || order.orderCode} order={order} onOpen={onOpen} />
          ))}
          {shipments.map((shipment, index) => (
            <LegacyShipment key={shipment.shipmentId || shipment.shipmentCode || index} shipment={shipment} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
