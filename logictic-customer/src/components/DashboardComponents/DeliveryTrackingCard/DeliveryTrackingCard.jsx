import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CheckCircle2, Truck } from "lucide-react";

import { getOrderDeliveryTrackingApi } from "../../../api/OrderApi/deliveryTrackingApi";
import "./DeliveryTrackingCard.css";

/**
 * Khối tóm tắt chặng giao cuối + lối vào màn theo dõi và xác nhận nhận hàng.
 *
 * Màn `/warehouse/delivery/:orderId` vốn đã có nút "Tôi đã nhận đủ hàng" nhưng không chỗ nào
 * dẫn tới, khách chỉ vào được nếu tự gõ URL. Khối này là lối vào đó.
 *
 * Tự gọi API và tự ẩn khi đơn chưa có phiếu giao nào, nên nơi dùng chỉ cần một dòng
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await getOrderDeliveryTrackingApi(orderId);
        if (mounted) setTracking(data);
      } catch {
        // Đơn chưa tới chặng giao thì không có gì để hiện, không phải lỗi cần báo.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  if (loading || !tracking) return null;

  const deliveries = Array.isArray(tracking.deliveries) ? tracking.deliveries : [];
  if (deliveries.length === 0) return null;

  const parcels = Array.isArray(tracking.parcels) ? tracking.parcels : [];
  const parcelStatus = String(parcels[0]?.packageStatus || "").toUpperCase();
  const hint = STATUS_HINT[parcelStatus] || tracking.orderStatusText || "";
  const trackingCode = deliveries[0]?.carrierTrackingCode;

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

      {/* Chưa xác nhận và đã đủ điều kiện thì mời bấm ngay, đừng bắt khách tự đi tìm. */}
      {tracking.canConfirmReceipt && !tracking.isCustomerConfirmed ? (
        <div className="dtc-callout">
          <BadgeCheck size={16} />
          <span>Hàng đã giao xong. Xác nhận đã nhận đủ để chúng tôi chốt đơn.</span>
        </div>
      ) : null}

      <button
        type="button"
        className={`dtc-btn ${tracking.canConfirmReceipt ? "dtc-btn--primary" : ""}`}
        onClick={() => navigate(`/warehouse/delivery/${orderId}`)}
      >
        {tracking.canConfirmReceipt && !tracking.isCustomerConfirmed
          ? "Xác nhận đã nhận đủ hàng"
          : "Xem tiến trình giao hàng"}
      </button>
    </section>
  );
}
