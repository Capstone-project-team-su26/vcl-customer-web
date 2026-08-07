import React from "react";
import { Box, Warehouse, ShieldEllipsis, Weight } from "lucide-react";

const formatNumber = (value, suffix = "") =>
  Number(value || 0).toLocaleString("vi-VN") + suffix;

export function WarehouseSummaryCards({ shipments = [], isPurchase = false }) {
  const totalPackages = shipments.reduce(
    (acc, shipment) => acc + (shipment.packageCount || shipment.items?.length || 1),
    0
  );

  const totalWeight = shipments.reduce(
    (acc, shipment) => acc + (Number(shipment.totalWeight) || Number(shipment.inbound?.actualWeight) || 0),
    0
  );

  const inStorageCount = shipments.filter(
    (s) => String(s.status).toUpperCase().includes("STORAGE") || String(s.status).toUpperCase().includes("RECEIVED")
  ).length;

  const customsCount = shipments.filter(
    (s) => String(s.status).toUpperCase().includes("CUSTOMS")
  ).length;

  return (
    <section className="warehouse-summary-grid">
      <article className="warehouse-summary warehouse-summary--blue">
        <div className="warehouse-summary__icon">
          <Box size={22} />
        </div>
        <div>
          <span className="warehouse-summary__label">Tổng kiện đang theo dõi</span>
          <strong className="warehouse-summary__value">{formatNumber(totalPackages)} kiện</strong>
          <span className="warehouse-summary__note">Thuộc {shipments.length} đơn hàng</span>
        </div>
      </article>

      <article className="warehouse-summary warehouse-summary--cyan">
        <div className="warehouse-summary__icon">
          <Warehouse size={22} />
        </div>
        <div>
          <span className="warehouse-summary__label">Đang lưu kho quốc tế</span>
          <strong className="warehouse-summary__value">{inStorageCount} đơn</strong>
          <span className="warehouse-summary__note">
            {isPurchase ? "Kho mua hộ Quảng Châu & Tokyo" : "Kho ký gửi Quảng Châu & Thâm Quyến"}
          </span>
        </div>
      </article>

      <article className="warehouse-summary warehouse-summary--amber">
        <div className="warehouse-summary__icon">
          <ShieldEllipsis size={22} />
        </div>
        <div>
          <span className="warehouse-summary__label">Đang thông quan</span>
          <strong className="warehouse-summary__value">{customsCount} đơn</strong>
          <span className="warehouse-summary__note">Không có hồ sơ cần bổ sung</span>
        </div>
      </article>

      <article className="warehouse-summary warehouse-summary--violet">
        <div className="warehouse-summary__icon">
          <Weight size={22} />
        </div>
        <div>
          <span className="warehouse-summary__label">Tổng khối lượng</span>
          <strong className="warehouse-summary__value">
            {totalWeight > 0 ? formatNumber(totalWeight.toFixed(1), " kg") : "0 kg"}
          </strong>
          <span className="warehouse-summary__note">Khối lượng thực tế</span>
        </div>
      </article>
    </section>
  );
}
