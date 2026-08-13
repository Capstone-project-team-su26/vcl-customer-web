import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  Scale,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";

import { getConsignmentDetailApi } from "../../../../api/OrderApi/consignmentApi";
import { formatTime, presentValue, StatusPill } from "../Shared/WarehouseSharedComponents";
import "./KiGuiDetail.css";

function DetailRow({ label, value, accent = false }) {
  return (
    <div className="warehouse-detail-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: "13.5px" }}>{label}</span>
      <strong style={{ color: accent ? "#145bd7" : "#0f172a", fontSize: "14px", fontWeight: 700 }}>
        {presentValue(value)}
      </strong>
    </div>
  );
}

export function KiGuiDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getConsignmentDetailApi(id);
        const data = res?.data || res;
        if (isMounted) setDetail(data);
      } catch (err) {
        console.error("KiGuiDetail API fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="vcl-kigui-detail-page warehouse-tracking">
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          Đang kết nối API và tải thông tin chi tiết đơn ký gửi...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="vcl-kigui-detail-page warehouse-tracking">
        <div className="warehouse-empty">
          <strong>Không tìm thấy chi tiết đơn ký gửi này.</strong>
          <p>Mã đơn ký gửi không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <Link to="/warehouse/checkin" className="warehouse-primary-link" style={{ marginTop: "12px", display: "inline-block" }}>
            <ArrowLeft size={16} /> Quay lại Theo dõi kho
          </Link>
        </div>
      </div>
    );
  }

  const code = detail.consignmentCode || detail.trackingCode || id;
  const status = detail.status || "CHECKED_IN";
  const route = detail.route || "Trung Quốc --> Việt Nam";

  return (
    <div className="vcl-kigui-detail-page warehouse-tracking">
      <Link className="warehouse-back" to="/warehouse/checkin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", textDecoration: "none", marginBottom: "16px", fontWeight: 600 }}>
        <ArrowLeft size={17} /> Quay lại Theo dõi kho
      </Link>

      <section className="kigui-detail-hero">
        <div>
          <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#145bd7", letterSpacing: "0.08em" }}>
            CHI TIẾT ĐƠN KÝ GỬI KHO QUỐC TẾ
          </span>
          <h2 style={{ margin: "4px 0 6px", fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
            {code}
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            {detail.receiverName || "Khách hàng"} · {detail.receiverPhone || "--"} · {route}
          </p>
        </div>
        <StatusPill status={status} />
      </section>

      <section className="kigui-detail-grid">
        <article className="kigui-info-card">
          <header>
            <PackageCheck size={20} style={{ color: "#145bd7" }} />
            <div>
              <h3>Thông tin nhập kho</h3>
              <small style={{ color: "#64748b" }}>Biên bản nhập kho quốc tế</small>
            </div>
          </header>
          <DetailRow label="Mã đơn ký gửi" value={code} accent />
          <DetailRow label="Cập nhật trạng thái" value={formatTime(detail.statusUpdatedAt || detail.createdAt)} />
          <DetailRow label="Người nhận hàng" value={detail.receiverName} />
          <DetailRow label="Số điện thoại" value={detail.receiverPhone} />
          <DetailRow label="Địa chỉ nhận hàng" value={detail.receiverAddress} />
          {detail.receiptPdfUrl ? (
            <a href={detail.receiptPdfUrl} target="_blank" rel="noreferrer" style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#145bd7", fontWeight: 700, textDecoration: "none" }}>
              <FileText size={16} /> Tải biên nhận PDF &rarr;
            </a>
          ) : null}
        </article>

        <article className="kigui-info-card">
          <header>
            <Scale size={20} style={{ color: "#16a34a" }} />
            <div>
              <h3>Thông số khối lượng & Thể tích</h3>
              <small style={{ color: "#64748b" }}>Cân đo thực tế tại kho</small>
            </div>
          </header>
          <DetailRow label="Tổng trọng lượng" value={detail.totalWeight ? detail.totalWeight + " kg" : "Chưa cân"} />
          <DetailRow label="Tổng thể tích CBM" value={detail.totalVolume ? detail.totalVolume + " m³" : "Chưa đo"} />
          <DetailRow label="Hình thức vận chuyển" value={detail.consignmentType || "Tiêu chuẩn"} />
          <DetailRow label="Yêu cầu kiểm hóa" value={detail.requiresInspection ? "Có kiểm hóa" : "Không"} />
        </article>

        <article className="kigui-info-card">
          <header>
            <Box size={20} style={{ color: "#ea580c" }} />
            <div>
              <h3>Danh mục kiện hàng</h3>
              <small style={{ color: "#64748b" }}>Tên sản phẩm trong đơn</small>
            </div>
          </header>
          {Array.isArray(detail.itemNames) && detail.itemNames.length > 0 ? (
            <ul style={{ paddingLeft: "18px", margin: "8px 0", color: "#334155", fontSize: "14px", lineHeight: "1.6" }}>
              {detail.itemNames.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: "13.5px" }}>Không có danh mục chi tiết.</p>
          )}
        </article>
      </section>
    </div>
  );
}

export default KiGuiDetail;
