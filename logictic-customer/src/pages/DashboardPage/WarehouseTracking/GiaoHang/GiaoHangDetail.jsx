import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Truck,
  RotateCcw,
  Wallet,
} from "lucide-react";

import {
  confirmOrderReceivedApi,
  getOrderDeliveryTrackingApi,
  getOrderParcelReturnsApi,
} from "../../../../api/OrderApi/deliveryTrackingApi";
import {
  EmptyState,
  PageIntro,
  SummaryCard,
  formatMoney,
  formatTime,
  presentValue,
} from "../Shared/WarehouseSharedComponents";
import "../Shared/WarehouseShared.css";
import "../WarehouseTracking.css";
import "./GiaoHang.css";

/** Màu nhãn theo trạng thái phiếu giao, dùng chung một bảng cho cả thẻ và dòng kiện. */
const DELIVERY_TONE = Object.freeze({
  DELIVERY_PENDING: "amber",
  DELIVERY_APPROVED: "blue",
  DELIVERY_DISPATCHED: "green",
  DELIVERY_REJECTED: "red",
});

const PARCEL_TONE = Object.freeze({
  DELIVERED: "green",
  PICKING_UP: "blue",
  AWAITING_PICKUP: "amber",
  STORED: "purple",
});

export function GiaoHangDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [tracking, setTracking] = useState(null);

  // Kiện giao hỏng đang quay về kho. Tải riêng vì API tiến trình giao không kèm.
  const [parcelReturns, setParcelReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchTracking = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const [trackingResult, returnResult] = await Promise.allSettled([
        getOrderDeliveryTrackingApi(orderId),
        getOrderParcelReturnsApi(orderId),
      ]);

      if (trackingResult.status === "rejected") {
        throw trackingResult.reason;
      }

      setTracking(trackingResult.value);

      // Phần hàng hoàn hỏng thì vẫn cho xem tiến trình giao, đừng chặn cả màn hình.
      setParcelReturns(
        returnResult.status === "fulfilled" ? returnResult.value : [],
      );
    } catch (error) {
      setErrorMessage(error?.message || "Không tải được tiến trình giao hàng.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setErrorMessage("");
    try {
      await confirmOrderReceivedApi(orderId);
      setSuccessMessage("Cảm ơn bạn đã xác nhận. Đơn hàng sẽ được chốt hoàn tất.");
      await fetchTracking();
    } catch (error) {
      setErrorMessage(error?.message || "Không gửi được xác nhận nhận hàng.");
    } finally {
      setConfirming(false);
    }
  }, [orderId, fetchTracking]);

  if (loading) {
    return (
      <div className="warehouse-page">
        <div className="warehouse-loading">Đang tải tiến trình giao hàng…</div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="warehouse-page">
        <PageIntro
          eyebrow="THEO DÕI GIAO HÀNG"
          title="Không xem được đơn này"
          description={errorMessage || "Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn."}
          icon={AlertCircle}
        />
        <EmptyState title="Chưa có dữ liệu giao hàng" />
      </div>
    );
  }

  const deliveries = tracking.deliveries || [];
  const parcels = tracking.parcels || [];
  const dispatched = deliveries.filter((d) => d.carrierTrackingCode).length;

  return (
    <div className="warehouse-page">
      <PageIntro
        eyebrow="THEO DÕI GIAO HÀNG"
        title={`Đơn ${tracking.orderCode}`}
        description={tracking.orderStatusText || "Đang theo dõi tiến trình giao hàng tới bạn."}
        icon={Truck}
        action={
          <button
            type="button"
            className="giaohang-back"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </button>
        }
      />

      {!!successMessage && (
        <div className="giaohang-banner giaohang-banner--success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {!!errorMessage && (
        <div className="giaohang-banner giaohang-banner--error">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={Package}
          label="Số kiện của đơn"
          value={parcels.length}
          note="Tổng kiện thuộc đơn này"
          tone="blue"
        />
        <SummaryCard
          icon={Truck}
          label="Phiếu đã đặt giao"
          value={`${dispatched}/${deliveries.length}`}
          note="Đơn vị giao đã nhận"
          tone="green"
        />
        <SummaryCard
          icon={Wallet}
          label="Phí lưu kho"
          value={formatMoney(tracking.storageFeeAmount || 0)}
          note={tracking.storageFeeAmount > 0 ? "Thanh toán khi nhận hàng" : "Chưa phát sinh"}
          tone={tracking.storageFeeAmount > 0 ? "amber" : "blue"}
        />
      </section>

      {/* Nút chỉ hiện khi hàng đã giao xong — BE cũng chặn nếu gọi sớm. */}
      {tracking.canConfirmReceipt && (
        <section className="giaohang-confirm">
          <div className="giaohang-confirm__copy">
            <BadgeCheck size={22} />
            <div>
              <strong>Bạn đã nhận đủ hàng chưa?</strong>
              <p>
                Xác nhận giúp chúng tôi chốt đơn. Nếu bạn chưa nhận đủ, vui lòng liên hệ nhân
                viên trước khi xác nhận.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="giaohang-confirm__btn"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Đang gửi…" : "Tôi đã nhận đủ hàng"}
          </button>
        </section>
      )}

      {tracking.isCustomerConfirmed && (
        <section className="giaohang-confirmed">
          <CheckCircle2 size={20} />
          <span>
            Bạn đã xác nhận nhận đủ hàng lúc {formatTime(tracking.customerConfirmedAt)}.
          </span>
        </section>
      )}

      {/*
        Giao hỏng là tin xấu nên đặt ngay trên danh sách phiếu giao, đừng để khách phải cuộn
        xuống cuối mới biết hàng của mình đang quay về kho.
      */}
      {parcelReturns.length > 0 && (
        <section className="giaohang-section">
          <h3>Kiện giao không thành công</h3>
          <div className="giaohang-list">
            {parcelReturns.map((item) => (
              <article
                key={item.returnId}
                className="giaohang-card giaohang-card--return"
              >
                <header>
                  <strong>{item.packageCode || item.returnCode}</strong>
                  <span className="giaohang-pill giaohang-pill--amber">
                    {item.statusText}
                  </span>
                </header>

                <div className="giaohang-card__row">
                  <RotateCcw size={15} />
                  <span>{item.reasonText}</span>
                </div>

                {!!item.carrierStatusText && (
                  <div className="giaohang-card__row">
                    <Truck size={15} />
                    <span>Đơn vị giao báo: {item.carrierStatusText}</span>
                  </div>
                )}

                {item.resolutionText ? (
                  <div className="giaohang-card__row">
                    <BadgeCheck size={15} />
                    <span>
                      Hướng xử lý: {item.resolutionText}
                      {item.waiveStorageFee ? " · đã miễn phí lưu kho" : ""}
                    </span>
                  </div>
                ) : (
                  <div className="giaohang-card__row">
                    <AlertCircle size={15} />
                    <span>
                      Chúng tôi đang xử lý và sẽ liên hệ với bạn. Bạn cũng có thể gọi nhân viên
                      kinh doanh để báo địa chỉ mới.
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="giaohang-section">
        <h3>Phiếu giao hàng</h3>
        {deliveries.length === 0 ? (
          <EmptyState title="Chưa có phiếu giao nào" />
        ) : (
          <div className="giaohang-list">
            {deliveries.map((item) => (
              <article key={item.deliveryRequestId} className="giaohang-card">
                <header>
                  <strong>{item.deliveryCode}</strong>
                  <span
                    className={`giaohang-pill giaohang-pill--${
                      DELIVERY_TONE[item.status] || "blue"
                    }`}
                  >
                    {item.statusText}
                  </span>
                </header>

                <div className="giaohang-card__row">
                  <MapPin size={15} />
                  <span>{presentValue(item.fullAddress)}</span>
                </div>

                <div className="giaohang-card__row">
                  <Truck size={15} />
                  <span>
                    {item.carrierTrackingCode
                      ? `Mã vận đơn: ${item.carrierTrackingCode}`
                      : "Chưa đặt đơn vị giao"}
                  </span>
                </div>

                <div className="giaohang-card__row">
                  <Clock3 size={15} />
                  <span>
                    {item.dispatchedAt
                      ? `Đã đặt giao lúc ${formatTime(item.dispatchedAt)}`
                      : item.scheduledDate
                        ? `Bạn hẹn nhận ngày ${formatTime(item.scheduledDate)}`
                        : "Chưa có lịch giao"}
                  </span>
                </div>

                <footer>{item.totalParcels} kiện trong phiếu này</footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="giaohang-section">
        <h3>Trạng thái từng kiện</h3>
        {parcels.length === 0 ? (
          <EmptyState title="Đơn chưa có kiện nào" />
        ) : (
          <div className="giaohang-parcels">
            {parcels.map((parcel) => (
              <article key={parcel.packageCode} className="giaohang-parcel">
                <div>
                  <strong>{parcel.packageCode}</strong>
                  {!!parcel.handlingText && <small>{parcel.handlingText}</small>}
                </div>
                <span
                  className={`giaohang-pill giaohang-pill--${
                    PARCEL_TONE[parcel.packageStatus] || "blue"
                  }`}
                >
                  {parcel.statusText}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default GiaoHangDetail;
