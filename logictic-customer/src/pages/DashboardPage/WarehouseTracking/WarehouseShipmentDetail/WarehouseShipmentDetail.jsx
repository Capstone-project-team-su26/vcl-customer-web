import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { getConsignmentDetailApi } from "../../../../api/OrderApi/consignmentApi";
import {
  formatTime,
  presentValue,
  StatusPill,
} from "../Shared/WarehouseSharedComponents";
import "./WarehouseShipmentDetail.css";

function DetailRow({ label, value, accent = false }) {
  return (
    <div className="warehouse-detail-row">
      <span>{label}</span>
      <strong className={accent ? "is-accent" : ""}>{presentValue(value)}</strong>
    </div>
  );
}

function WarehouseNotFound() {
  return (
    <div className="warehouse-tracking">
      <div className="warehouse-empty warehouse-empty--page">
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Không tìm thấy kiện hàng</h2>
        <p style={{ color: "#64748b", marginBottom: "16px" }}>Mã kiện hàng không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <Link to="/warehouse/checkin" className="warehouse-primary-link">
          <ArrowLeft size={16} /> Quay lại danh sách kho
        </Link>
      </div>
    </div>
  );
}

export function WarehouseShipmentDetail() {
  const { shipmentId } = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      if (!shipmentId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getConsignmentDetailApi(shipmentId);
        if (isMounted && data) {
          setShipment(data);
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết đơn hàng:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [shipmentId]);

  if (loading) {
    return (
      <div className="warehouse-tracking">
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Đang tải thông tin chi tiết kiện hàng...
        </div>
      </div>
    );
  }

  if (!shipment) {
    return <WarehouseNotFound />;
  }

  const code = shipment.consignmentCode || shipment.trackingCode || shipmentId;
  const customerName = shipment.customerName || shipment.customer?.name || "Khách hàng";
  const customerPhone = shipment.receiverPhone || shipment.customer?.phone || "--";
  const route = shipment.route || "Trung Quốc --> Việt Nam";
  const status = shipment.status || "RECEIVED";

  return (
    <div className="warehouse-tracking">
      <Link className="warehouse-back" to="/warehouse/checkin">
        <ArrowLeft size={17} /> Quay lại danh sách kho
      </Link>

      <section className="warehouse-detail-hero">
        <div>
          <span className="warehouse-card-eyebrow">
            ĐƠN KÝ GỬI KHO QUỐC TẾ
          </span>
          <h2>{code}</h2>
          <p>
            {customerName} · {customerPhone} · {route}
          </p>
        </div>
        <StatusPill status={status} />
      </section>

      <section className="warehouse-detail-grid">
        <article className="warehouse-info-card">
          <header>
            <PackageCheck size={20} />
            <div>
              <h3>Thông tin nhập kho</h3>
              <p>Warehouse Receipt (WR)</p>
            </div>
          </header>
          <DetailRow
            label="Mã đơn ký gửi"
            value={code}
            accent
          />
          <DetailRow
            label="Thời gian cập nhật"
            value={formatTime(shipment.statusUpdatedAt || shipment.createdAt)}
          />
          <DetailRow
            label="Địa chỉ giao"
            value={shipment.receiverAddress}
          />
          <DetailRow
            label="Người nhận"
            value={shipment.receiverName}
          />
          <DetailRow
            label="Số điện thoại"
            value={shipment.receiverPhone}
          />
          {shipment.receiptPdfUrl ? (
            <a
              href={shipment.receiptPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="warehouse-card-action"
            >
              <FileText size={16} /> Xem hóa đơn PDF chứng từ &rarr;
            </a>
          ) : null}
        </article>

        <article className="warehouse-info-card">
          <header>
            <ShieldCheck size={20} />
            <div>
              <h3>Thông tin thông quan</h3>
              <p>Customs clearance</p>
            </div>
          </header>
          <DetailRow
            label="Trạng thái"
            value={
              status === "CUSTOMS_CLEARED"
                ? "Đã thông quan"
                : status === "CUSTOMS_REVIEW"
                ? "Đang kiểm tra"
                : "Chờ kiểm hóa"
            }
            accent
          />
          <DetailRow
            label="Kiểm tra hàng hóa"
            value={shipment.requiresInspection ? "Yêu cầu kiểm hóa" : "Thông quan thường"}
          />
          <DetailRow
            label="Cập nhật lần cuối"
            value={formatTime(shipment.statusUpdatedAt)}
          />
          <Link className="warehouse-card-action" to="/warehouse/customs">
            Xem hồ sơ thông quan <ChevronRight size={16} />
          </Link>
        </article>

        <article className="warehouse-info-card">
          <header>
            <Truck size={20} />
            <div>
              <h3>Thông tin xuất kho</h3>
              <p>Warehouse Release Order (WRO)</p>
            </div>
          </header>
          <DetailRow
            label="Tuyến vận chuyển"
            value={route}
            accent
          />
          <DetailRow
            label="Hình thức vận chuyển"
            value={shipment.consignmentType || "Standard"}
          />
          <DetailRow
            label="Trạng thái xuất"
            value={status}
          />
          <Link className="warehouse-card-action" to="/warehouse/export">
            Xem tiến độ xuất kho <ChevronRight size={16} />
          </Link>
        </article>

        <article className="warehouse-info-card">
          <header>
            <MapPin size={20} />
            <div>
              <h3>Thông số hàng hóa</h3>
              <p>Đối chiếu thực tế</p>
            </div>
          </header>
          <DetailRow
            label="Tổng trọng lượng"
            value={shipment.totalWeight ? shipment.totalWeight + " kg" : "Chưa có"}
          />
          <DetailRow
            label="Tổng thể tích"
            value={shipment.totalVolume ? shipment.totalVolume + " m³" : "Chưa có"}
          />
          <DetailRow
            label="Tên sản phẩm"
            value={
              Array.isArray(shipment.itemNames) && shipment.itemNames.length > 0
                ? shipment.itemNames.join(", ")
                : "Hàng hóa ký gửi"
            }
          />
        </article>
      </section>
    </div>
  );
}

export default WarehouseShipmentDetail;
