import {
  Box,
  Check,
  Clock3,
  PackageCheck,
  Plane,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Truck,
  Warehouse,
} from "lucide-react";

import { formatVietnamDateTime } from "@shared/utils/timeUtc";

export const WAREHOUSE_STATUS_META = {
  RECEIVED: { label: "Đã nhận hàng", tone: "blue" },
  CHECKED_IN: { label: "Đã nhập kho", tone: "blue" },
  WAREHOUSE_RECEIVED: { label: "Đã vào kho", tone: "blue" },
  IN_STORAGE: { label: "Đang lưu kho", tone: "purple" },
  CUSTOMS_REVIEW: { label: "Đang kiểm hóa", tone: "yellow" },
  CUSTOMS_CLEARED: { label: "Đã thông quan", tone: "green" },
  OUTBOUND_READY: { label: "Sẵn sàng xuất", tone: "indigo" },
  RELEASED: { label: "Đã xuất kho", tone: "orange" },
  IN_TRANSIT: { label: "Đang chuyển về Việt Nam", tone: "cyan" },

  // Mốc lô sau khi luồng được chuẩn hoá: khách theo dõi bằng đúng những chữ này.
  READY_TO_SHIP: { label: "Sẵn sàng rời kho", tone: "indigo" },
  ARRIVED_VN: { label: "Đã về Việt Nam", tone: "green" },
  ARRIVED_DESTINATION: { label: "Đã về tới kho VN", tone: "green" },
  RECEIVED_AT_DESTINATION: { label: "Kho VN đã kiểm đếm", tone: "green" },
  AWAITING_PICKUP: { label: "Chờ đơn vị giao lấy hàng", tone: "orange" },
  OUT_FOR_DELIVERY: { label: "Đang giao tới bạn", tone: "cyan" },
  STORED: { label: "Đang gửi tại kho VN", tone: "purple" },

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
  READY_TO_SHIP: Box,
  ARRIVED_VN: PackageCheck,
  ARRIVED_DESTINATION: Warehouse,
  RECEIVED_AT_DESTINATION: PackageCheck,
  AWAITING_PICKUP: Truck,
  OUT_FOR_DELIVERY: Truck,
  STORED: Warehouse,
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

/* ShipmentProgress / ShipmentCard (thẻ lô ký gửi dẫn tới /warehouse/inventory/:id) đã bỏ cùng
   các màn kho ký gửi chạy dữ liệu mẫu — hành trình ký gửi nay ở module tracking. */

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
