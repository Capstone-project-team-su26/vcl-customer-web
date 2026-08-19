import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  Plane,
  ShieldCheck,
  Truck,
  Warehouse,
  Weight,
} from "lucide-react";
import { formatNumber, formatTime, StatusPill } from "../Shared/WarehouseSharedComponents";

/**
 * Đơn đã bước sang chặng giao cuối — lúc này khách có phiếu giao để theo dõi, và khi hãng báo
 * giao xong thì còn phải bấm xác nhận đã nhận đủ. Lọc bằng trạng thái đơn thay vì hỏi API cho
 * từng thẻ, vì danh sách này có thể dài.
 */
const DELIVERY_STAGE_STATUSES = Object.freeze([
  "ARRIVED_DESTINATION",
  "AT_DESTINATION_WAREHOUSE",
  "DELIVERING",
  "DELIVERED",
  "CUSTOMER_CONFIRMED",
  "COMPLETED",
]);

export function KiGuiTrackingCard({ shipment }) {
  const normStatus = String(shipment.status || "").toUpperCase();
  const orderId = shipment.orderId || shipment.id;
  const inDeliveryStage = DELIVERY_STAGE_STATUSES.includes(normStatus);
  const needsConfirm = normStatus === "DELIVERED";

  let stepLevel = 2; // Default checked-in
  if (normStatus.includes("STORAGE")) stepLevel = 3;
  else if (normStatus.includes("CUSTOMS")) stepLevel = 4;
  else if (normStatus.includes("RELEASED") || normStatus.includes("OUTBOUND")) stepLevel = 5;
  else if (normStatus.includes("TRANSIT") || normStatus.includes("DELIVERED") || normStatus.includes("COMPLETED")) stepLevel = 6;

  const steps = [
    { num: 1, label: "Tạo đơn hàng", icon: FileText },
    { num: 2, label: "Nhập kho quốc tế", icon: PackageCheck },
    { num: 3, label: "Lưu kho", icon: Warehouse },
    { num: 4, label: "Thông quan", icon: ShieldCheck },
    { num: 5, label: "Xuất kho", icon: Truck },
    { num: 6, label: "Về Việt Nam", icon: Plane },
  ];

  return (
    <article className="warehouse-shipment-card">
      <header>
        <div>
          <span className="warehouse-card-eyebrow">
            {shipment.consignmentType || "KÝ GỬI TIÊU CHUẨN"}
          </span>
          <h3>{shipment.consignmentCode}</h3>
        </div>
        <StatusPill status={shipment.status} />
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
        {steps.map((st, idx) => {
          const StepIcon = st.icon;
          const isDone = st.num < stepLevel;
          const isCurrent = st.num === stepLevel;
          const stepClass = isCurrent
            ? "is-current"
            : isDone
            ? "is-complete"
            : "";

          return (
            <React.Fragment key={st.num}>
              <div className={`warehouse-progress__step ${stepClass}`}>
                <div className="warehouse-progress__node">
                  <StepIcon size={14} />
                </div>
                <small>{st.label}</small>
              </div>
              {idx < steps.length - 1 && (
                <div className={`warehouse-progress__line ${st.num < stepLevel ? "is-complete" : st.num === stepLevel - 1 ? "is-current" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <footer className="warehouse-shipment-card__footer">
        <span>Cập nhật {formatTime(shipment.statusUpdatedAt || shipment.createdAt)}</span>
        <div className="warehouse-card-actions">
          {inDeliveryStage && (
            <Link
              to={"/warehouse/delivery/" + orderId}
              className={`warehouse-card-action ${
                needsConfirm ? "warehouse-card-action--confirm" : ""
              }`}
            >
              {needsConfirm ? (
                <>
                  <PackageCheck size={14} /> Xác nhận đã nhận hàng
                </>
              ) : (
                <>
                  <Truck size={14} /> Theo dõi giao hàng
                </>
              )}
            </Link>
          )}
          <Link to={"/warehouse/consignment-detail/" + orderId} className="warehouse-card-action">
            Xem chi tiết <ChevronRight size={14} />
          </Link>
        </div>
      </footer>
    </article>
  );
}
