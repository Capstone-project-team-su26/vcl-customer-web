import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Truck } from "lucide-react";

import { getOrderDeliveryTrackingApi } from "@features/delivery/api/deliveryTrackingApi";
/* Import sâu: barrel tracking kéo theo các trang (CSS toàn cục) — xem ARCHITECTURE mục 4. */
import { orderTrackingDetailPath } from "@features/tracking/constants/trackingPaths";
import { isCanceledError } from "@shared/utils/apiError";
import "./DeliveryTrackingCard.css";

/**
 * Khối tóm tắt chặng giao cuối (API thật GET /api/orders/{id}/delivery-tracking) + lối
 * vào màn "Theo dõi đơn" /tracking/:orderId — nơi đặt giao, trả phí giao lại, khiếu nại
 * và bấm "Đã nhận hàng" (màn cũ /warehouse/delivery/:orderId chạy dữ liệu mẫu đã bị xoá).
 *
 * Tự ẩn khi đơn chưa có phiếu giao nào, nên nơi dùng chỉ cần một dòng
 * `<DeliveryTrackingCard orderId={...} />`.
 */

const STATUS_HINT = {
  AWAITING_PICKUP: "Đơn vị vận chuyển sắp tới lấy hàng.",
  PICKING_UP: "Đơn vị vận chuyển đang tới kho lấy hàng.",
  PICKED_UP: "Hàng đã rời kho, đang trên đường tới bạn.",
  IN_TRANSIT: "Hàng đang trên đường tới bạn.",
  OUT_FOR_DELIVERY: "Shipper đang giao tới địa chỉ của bạn.",
  DELIVERED: "Hàng đã giao xong.",
  DELIVERY_FAILED: "Giao không thành công, nhân viên sẽ liên hệ với bạn.",
  RETURNING: "Kiện đang được chuyển hoàn về kho.",
  RETURNED: "Kiện đã chuyển hoàn về kho.",
};

export default function DeliveryTrackingCard({ orderId }) {
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    getOrderDeliveryTrackingApi(orderId, { signal: controller.signal })
      .then(setTracking)
      .catch((error) => {
        // Đơn chưa tới chặng giao thì không có gì để hiện, không phải lỗi cần báo.
        if (!isCanceledError(error)) setTracking(null);
      });

    return () => controller.abort();
  }, [orderId]);

  if (!tracking) return null;

  const deliveries = Array.isArray(tracking.deliveries) ? tracking.deliveries : [];
  if (deliveries.length === 0) return null;

  const parcels = Array.isArray(tracking.parcels) ? tracking.parcels : [];
  const parcelStatus = String(parcels[0]?.packageStatus || "").toUpperCase();
  const hint = STATUS_HINT[parcelStatus] || tracking.orderStatusText || "";
  const trackingCode = deliveries[deliveries.length - 1]?.carrierTrackingCode;
  const canConfirm =
    String(tracking.orderStatus || "").toUpperCase() === "DELIVERED" &&
    !tracking.isCustomerConfirmed;

  return (
    <section className="dtc-card">
      <header className="dtc-head">
        <div className="dtc-head__icon">
          <Truck size={20} />
        </div>
        <div className="dtc-head__text">
          <h3>Giao hàng tới bạn</h3>
          <p>{hint}</p>
        </div>
        {tracking.isCustomerConfirmed ? (
          <span className="dtc-pill dtc-pill--done">
            <CheckCircle2 size={14} /> Đã xác nhận
          </span>
        ) : null}
      </header>

      <div className="dtc-meta">
        <div className="dtc-meta__item">
          <span>Mã vận đơn</span>
          <strong>{trackingCode || "—"}</strong>
        </div>
        <div className="dtc-meta__item">
          <span>Số kiện</span>
          <strong>{parcels.length || deliveries.length}</strong>
        </div>
      </div>

      {/* Đã giao xong mà chưa xác nhận thì mời bấm ngay, đừng bắt khách tự đi tìm. */}
      {canConfirm ? (
        <div className="dtc-callout">
          <BadgeCheck size={16} />
          <span>Hàng đã giao xong. Xác nhận đã nhận đủ để chúng tôi chốt đơn.</span>
        </div>
      ) : null}

      <button
        type="button"
        className={`dtc-btn ${canConfirm ? "dtc-btn--primary" : ""}`}
        onClick={() => navigate(orderTrackingDetailPath(orderId))}
      >
        {canConfirm ? "Xác nhận đã nhận đủ hàng" : "Xem tiến trình giao hàng"}
      </button>
    </section>
  );
}
