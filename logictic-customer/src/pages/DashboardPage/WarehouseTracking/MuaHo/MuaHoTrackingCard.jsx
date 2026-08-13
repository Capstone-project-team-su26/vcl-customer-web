import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  MapPin,
  PackageCheck,
  Plane,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { formatTime, StatusPill } from "../Shared/WarehouseSharedComponents";

export function MuaHoTrackingCard({ request }) {
  const normStatus = String(request.status || "").toUpperCase();

  let stepLevel = 2; // Default checked-in
  if (normStatus.includes("STORAGE")) stepLevel = 3;
  else if (normStatus.includes("CUSTOMS")) stepLevel = 4;
  else if (normStatus.includes("TRANSIT") || normStatus.includes("DELIVERED") || normStatus.includes("COMPLETED")) stepLevel = 5;

  const steps = [
    { num: 1, label: "Tạo đơn mua hộ", icon: ShoppingCart },
    { num: 2, label: "Đã Check-in kho", icon: PackageCheck },
    { num: 3, label: "Lưu kho mua hộ", icon: Warehouse },
    { num: 4, label: "Thông quan", icon: ShieldCheck },
    { num: 5, label: "Về Việt Nam", icon: Plane },
  ];

  return (
    <article className="warehouse-shipment-card">
      <header>
        <div>
          <span className="warehouse-card-eyebrow">
            ĐƠN MUA HỘ KHO QUỐC TẾ
          </span>
          <h3>{request.consignmentCode || request.id}</h3>
        </div>
        <StatusPill status={request.status} />
      </header>

      <div className="warehouse-shipment-card__route">
        <span className="warehouse-route-point" style={{ background: "#ea580c", boxShadow: "0 0 0 4px #ffedd5" }} />
        <div>
          <small>Hành trình mua hộ</small>
          <strong>{request.route || "Trung Quốc / Nhật Bản → Việt Nam"}</strong>
        </div>
        <ArrowRight size={16} />
        <div className="warehouse-location">
          <MapPin size={15} style={{ color: "#ea580c" }} />
          <span>{request.internationalWarehouse?.name || "Kho VCL Mua Hộ"}</span>
        </div>
      </div>

      <div className="warehouse-shipment-card__metrics">
        <div>
          <ShoppingCart size={17} style={{ color: "#ea580c" }} />
          <span>
            Mặt hàng
            <strong>{request.packageCount || request.items?.length || 1} sản phẩm</strong>
          </span>
        </div>
        <div>
          <Box size={17} />
          <span>
            Tổng số lượng
            <strong>{request.totalQuantity || 1} SP</strong>
          </span>
        </div>
        <div>
          <Warehouse size={17} />
          <span>
            Vị trí kho
            <strong>{request.internationalWarehouse?.binCode || "B2-05"}</strong>
          </span>
        </div>
        <div>
          <Clock size={17} />
          <span>
            Ngày nhận kho
            <strong>{formatTime(request.statusUpdatedAt || request.createdAt).split(" ")[0]}</strong>
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
        <span>Cập nhật {formatTime(request.statusUpdatedAt || request.createdAt)}</span>
        <Link to={"/warehouse/purchase-detail/" + (request.id || request.purchaseRequestId)} className="warehouse-card-action">
          Xem chi tiết <ChevronRight size={14} />
        </Link>
      </footer>
    </article>
  );
}
