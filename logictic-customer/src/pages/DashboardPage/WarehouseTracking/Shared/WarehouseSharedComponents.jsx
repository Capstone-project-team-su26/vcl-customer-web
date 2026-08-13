import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Box,
  Check,
  Clock3,
  MapPin,
  PackageCheck,
  Plane,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Truck,
  Warehouse,
  Weight,
} from "lucide-react";

import { formatVietnamDateTime } from "../../../../utils/timeUtc";

export const WAREHOUSE_STATUS_META = {
  RECEIVED: { label: "Đã nhận hàng", tone: "blue" },
  CHECKED_IN: { label: "Đã nhập kho", tone: "blue" },
  WAREHOUSE_RECEIVED: { label: "Đã vào kho", tone: "blue" },
  IN_STORAGE: { label: "Đang lưu kho", tone: "purple" },
  CUSTOMS_REVIEW: { label: "Đang kiểm hóa", tone: "yellow" },
  CUSTOMS_CLEARED: { label: "Đã thông quan", tone: "green" },
  OUTBOUND_READY: { label: "Sẵn sàng xuất", tone: "indigo" },
  RELEASED: { label: "Đã xuất kho", tone: "orange" },
  IN_TRANSIT: { label: "Đang vận chuyển", tone: "cyan" },
  COMPLETED: { label: "Hoàn tất", tone: "emerald" },
  DELIVERED: { label: "Đã giao hàng", tone: "emerald" },
};

export const formatTime = (value) =>
  value
    ? formatVietnamDateTime(value, { fallback: "--" }) + " (UTC+7)"
    : "--";

export const formatNumber = (value, suffix = "") =>
  Number(value || 0).toLocaleString("vi-VN") + suffix;

export const formatMoney = (value) =>
  value === null || value === undefined
    ? "Chưa có"
    : Number(value).toLocaleString("vi-VN") + " đ";

export const presentValue = (value, fallback = "Chưa có") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);

const statusIcons = {
  RECEIVED: PackageCheck,
  CHECKED_IN: PackageCheck,
  WAREHOUSE_RECEIVED: PackageCheck,
  IN_STORAGE: Warehouse,
  CUSTOMS_REVIEW: ShieldEllipsis,
  CUSTOMS_CLEARED: ShieldCheck,
  OUTBOUND_READY: Box,
  RELEASED: Truck,
  IN_TRANSIT: Plane,
  COMPLETED: Check,
  DELIVERED: Check,
};

export function StatusPill({ status }) {
  const normStatus = String(status || "").toUpperCase();
  const meta = WAREHOUSE_STATUS_META[normStatus] || {
    label: status || "Chưa cập nhật",
    tone: "neutral",
  };
  const Icon = statusIcons[normStatus] || Clock3;

  return (
    <span className={"warehouse-status warehouse-status--" + meta.tone} style={{ gap: "7px", padding: "6px 14px", display: "inline-flex", alignItems: "center" }}>
      <span className="vcl-status-dot" />
      <Icon size={15} />
      <span>{meta.label}</span>
    </span>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}) {
  return (
    <section className="warehouse-intro">
      <div className="warehouse-intro__icon">
        <Icon size={26} />
      </div>
      <div className="warehouse-intro__copy">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? (
        <div className="warehouse-intro__action">
          {action}
        </div>
      ) : null}
    </section>
  );
}

export function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}) {
  return (
    <article
      className={"warehouse-summary warehouse-summary--" + tone}
    >
      <div className="warehouse-summary__icon">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

export function ShipmentProgress({ shipment, compact = false }) {
  return (
    <div
      className={
        "warehouse-progress " +
        (compact ? "warehouse-progress--compact" : "")
      }
    >
      {shipment.timeline.map((event, index) => (
        <React.Fragment key={event.key}>
          <div
            className={
              "warehouse-progress__step warehouse-progress__step--" +
              event.state
            }
          >
            <span className="warehouse-progress__dot">
              {event.state === "complete" ? (
                <Check size={14} />
              ) : (
                index + 1
              )}
            </span>
            <div>
              <strong>{event.label}</strong>
              {!compact ? (
                <small>{event.description}</small>
              ) : null}
            </div>
          </div>
          {index < shipment.timeline.length - 1 ? (
            <span
              className={
                "warehouse-progress__line " +
                (event.state === "complete"
                  ? "warehouse-progress__line--complete"
                  : "")
              }
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ShipmentCard({ shipment }) {
  const navigate = useNavigate();

  return (
    <article
      className="warehouse-shipment-card"
      onClick={() =>
        navigate("/warehouse/inventory/" + shipment.id)
      }
    >
      <header>
        <div>
          <span className="warehouse-card-eyebrow">
            {shipment.serviceName}
          </span>
          <h3>{shipment.consignmentCode}</h3>
        </div>
        <StatusPill status={shipment.status} />
      </header>

      <div className="warehouse-shipment-card__route">
        <span className="warehouse-route-point" />
        <div>
          <small>Hành trình quốc tế</small>
          <strong>{shipment.route}</strong>
        </div>
        <ArrowRight size={18} />
        <div className="warehouse-location">
          <MapPin size={16} />
          <span>{shipment.internationalWarehouse.name}</span>
        </div>
      </div>

      <div className="warehouse-shipment-card__metrics">
        <div>
          <Box size={17} />
          <span>
            Số kiện
            <strong>{shipment.packageCount} kiện</strong>
          </span>
        </div>
        <div>
          <Weight size={17} />
          <span>
            Khối lượng
            <strong>
              {formatNumber(
                shipment.inbound?.actualWeight ??
                  shipment.totalWeight,
                " kg"
              )}
            </strong>
          </span>
        </div>
        <div>
          <Warehouse size={17} />
          <span>
            Vị trí
            <strong>
              {shipment.internationalWarehouse.binCode}
            </strong>
          </span>
        </div>
        <div>
          <Clock3 size={17} />
          <span>
            Lưu kho
            <strong>{shipment.storageDays} ngày</strong>
          </span>
        </div>
      </div>

      <ShipmentProgress shipment={shipment} compact />

      <footer>
        <span>
          Cập nhật {formatTime(shipment.lastUpdatedAt)}
        </span>
        <button type="button">
          Xem chi tiết &rarr;
        </button>
      </footer>
    </article>
  );
}

export function EmptyState({
  title = "Không có dữ liệu phù hợp",
}) {
  return (
    <div className="warehouse-empty">
      <Search size={30} />
      <strong>{title}</strong>
      <p>
        Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái.
      </p>
    </div>
  );
}
