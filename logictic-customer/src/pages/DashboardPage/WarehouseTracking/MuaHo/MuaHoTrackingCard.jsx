import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  ChevronRight,
  Clock,
  MapPin,
  PackageCheck,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { formatVietnamDateTime } from "../../../../utils/timeUtc";

const formatTime = (value) =>
  value ? formatVietnamDateTime(value, { fallback: "--" }) : "--";

export function MuaHoTrackingCard({ request }) {
  const normStatus = String(request.status || "").toUpperCase();

  const statusLabel =
    normStatus === "CHECKED_IN"
      ? "Đã Check-in kho quốc tế"
      : normStatus === "WAREHOUSE_RECEIVED" || normStatus === "RECEIVED"
      ? "Kho mua hộ đã nhận hàng"
      : normStatus === "IN_STORAGE"
      ? "Đang lưu kho mua hộ"
      : normStatus === "CUSTOMS_REVIEW"
      ? "Đang thông quan"
      : normStatus === "IN_TRANSIT"
      ? "Đang vận chuyển về VN"
      : normStatus === "COMPLETED"
      ? "Đã nhập kho hoàn tất"
      : request.status || "Đang lưu kho";

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
          <span className="warehouse-card-eyebrow">ĐƠN MUA HỘ QUỐC TẾ</span>
          <h3>{request.consignmentCode}</h3>
        </div>
        <span className={`warehouse-status ${statusTone}`}>
          <PackageCheck size={13} /> {statusLabel}
        </span>
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
        <div className="warehouse-progress__step is-complete">
          <div className="warehouse-progress__node">1</div>
          <small>Tạo đơn mua hộ</small>
        </div>
        <div className="warehouse-progress__line is-complete" />
        <div className="warehouse-progress__step is-complete">
          <div className="warehouse-progress__node">2</div>
          <small>Đã Check-in kho</small>
        </div>
        <div className="warehouse-progress__line is-current" />
        <div className="warehouse-progress__step is-current">
          <div className="warehouse-progress__node">3</div>
          <small>Lưu kho mua hộ</small>
        </div>
        <div className="warehouse-progress__line" />
        <div className="warehouse-progress__step">
          <div className="warehouse-progress__node">4</div>
          <small>Thông quan</small>
        </div>
        <div className="warehouse-progress__line" />
        <div className="warehouse-progress__step">
          <div className="warehouse-progress__node">5</div>
          <small>Về Việt Nam</small>
        </div>
      </div>

      <footer className="warehouse-shipment-card__footer">
        <span>Cập nhật {formatTime(request.statusUpdatedAt || request.createdAt)}</span>
        <Link to={`/create-order/buy-orders`} className="warehouse-card-action">
          Xem chi tiết <ChevronRight size={14} />
        </Link>
      </footer>
    </article>
  );
}
