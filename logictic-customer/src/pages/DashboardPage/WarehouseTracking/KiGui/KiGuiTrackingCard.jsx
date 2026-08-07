import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  ChevronRight,
  Clock,
  MapPin,
  Warehouse,
  Weight,
} from "lucide-react";
import { formatVietnamDateTime } from "../../../../utils/timeUtc";

const formatTime = (value) =>
  value ? formatVietnamDateTime(value, { fallback: "--" }) : "--";

const formatNumber = (value, suffix = "") =>
  Number(value || 0).toLocaleString("vi-VN") + suffix;

export function KiGuiTrackingCard({ shipment }) {
  const normStatus = String(shipment.status || "").toUpperCase();
  const statusLabel =
    normStatus === "CHECKED_IN"
      ? "Đã Check-in kho quốc tế"
      : normStatus === "WAREHOUSE_RECEIVED" || normStatus === "RECEIVED"
      ? "Kho quốc tế đã nhận hàng"
      : normStatus === "IN_STORAGE"
      ? "Đang lưu kho"
      : normStatus === "CUSTOMS_REVIEW"
      ? "Đang thông quan"
      : normStatus === "IN_TRANSIT"
      ? "Đang vận chuyển về VN"
      : normStatus === "QUOTATION_SENT"
      ? "Đã báo giá"
      : shipment.status || "Đang lưu kho";

  const statusTone = normStatus.includes("CHECKED") || normStatus.includes("RECEIVED")
    ? "warehouse-status--blue"
    : normStatus.includes("STORAGE")
    ? "warehouse-status--cyan"
    : normStatus.includes("CUSTOMS")
    ? "warehouse-status--amber"
    : "warehouse-status--green";

  return (
    <article className="warehouse-shipment-card">
      <header>
        <div>
          <span className="warehouse-card-eyebrow">
            {shipment.consignmentType || "KÝ GỬI TIÊU CHUẨN"}
          </span>
          <h3>{shipment.consignmentCode}</h3>
        </div>
        <span className={`warehouse-status ${statusTone}`}>
          <i /> {statusLabel}
        </span>
      </header>

      <div className="warehouse-shipment-card__route">
        <span className="warehouse-route-point" />
        <div>
          <small>Hành trình quốc tế</small>
          <strong>{shipment.route || "Trung Quốc → Việt Nam"}</strong>
        </div>
        <ArrowRight size={16} />
        <div className="warehouse-location">
          <MapPin size={15} />
          <span>{shipment.internationalWarehouse?.name || "Kho VCL Quốc Tế"}</span>
        </div>
      </div>

      <div className="warehouse-shipment-card__metrics">
        <div>
          <Box size={17} />
          <span>
            Số kiện
            <strong>{shipment.packageCount || shipment.items?.length || 1} kiện</strong>
          </span>
        </div>
        <div>
          <Weight size={17} />
          <span>
            Khối lượng
            <strong>
              {formatNumber(
                shipment.inbound?.actualWeight ?? shipment.totalWeight ?? 0,
                " kg"
              )}
            </strong>
          </span>
        </div>
        <div>
          <Warehouse size={17} />
          <span>
            Vị trí
            <strong>{shipment.internationalWarehouse?.binCode || "A1-01"}</strong>
          </span>
        </div>
        <div>
          <Clock size={17} />
          <span>
            Lưu kho
            <strong>{shipment.storageDays || 1} ngày</strong>
          </span>
        </div>
      </div>

      <div className="warehouse-progress">
        <div className="warehouse-progress__step is-complete">
          <div className="warehouse-progress__node">1</div>
          <small>Tạo đơn hàng</small>
        </div>
        <div className="warehouse-progress__line is-complete" />
        <div className="warehouse-progress__step is-complete">
          <div className="warehouse-progress__node">2</div>
          <small>Nhập kho quốc tế</small>
        </div>
        <div className="warehouse-progress__line is-current" />
        <div className="warehouse-progress__step is-current">
          <div className="warehouse-progress__node">3</div>
          <small>Lưu kho</small>
        </div>
        <div className="warehouse-progress__line" />
        <div className="warehouse-progress__step">
          <div className="warehouse-progress__node">4</div>
          <small>Thông quan</small>
        </div>
        <div className="warehouse-progress__line" />
        <div className="warehouse-progress__step">
          <div className="warehouse-progress__node">5</div>
          <small>Xuất kho</small>
        </div>
        <div className="warehouse-progress__line" />
        <div className="warehouse-progress__step">
          <div className="warehouse-progress__node">6</div>
          <small>Về Việt Nam</small>
        </div>
      </div>

      <footer className="warehouse-shipment-card__footer">
        <span>Cập nhật {formatTime(shipment.statusUpdatedAt || shipment.createdAt)}</span>
        <Link to={`/check-orders`} className="warehouse-card-action">
          Xem chi tiết <ChevronRight size={14} />
        </Link>
      </footer>
    </article>
  );
}
