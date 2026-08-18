import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  Package,
  PackageCheck,
  Scale,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";

import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { formatTime, presentValue, StatusPill } from "../Shared/WarehouseSharedComponents";
import "./MuaHoDetail.css";

function DetailRow({ label, value, accent = false }) {
  return (
    <div className="warehouse-detail-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #f1f5f9" }}>
      <span style={{ color: "#64748b", fontSize: "13.5px" }}>{label}</span>
      <strong style={{ color: accent ? "#ea580c" : "#0f172a", fontSize: "14px", fontWeight: 700 }}>
        {presentValue(value)}
      </strong>
    </div>
  );
}

export function MuaHoDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
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
        const response = await getPurchaseRequestsApi(1, 10);
        const items = Array.isArray(response?.data?.items)
          ? response.data.items
          : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        const found = items.find(
          (item) => String(item.id) === String(id) || String(item.purchaseRequestId) === String(id)
        );

        if (isMounted) setRequest(found || items[0] || null);
      } catch (err) {
        console.error("MuaHoDetail API fetch error:", err);
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
      <div className="vcl-muaho-detail-page warehouse-tracking">
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          Đang kết nối API và tải thông tin chi tiết đơn mua hộ...
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="vcl-muaho-detail-page warehouse-tracking">
        <div className="warehouse-empty">
          <strong>Không tìm thấy chi tiết đơn mua hộ này.</strong>
          <p>Mã đơn mua hộ không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
          <Link to="/warehouse/checkin" className="warehouse-primary-link" style={{ marginTop: "12px", display: "inline-block" }}>
            <ArrowLeft size={16} /> Quay lại Theo dõi kho
          </Link>
        </div>
      </div>
    );
  }

  const code = request.consignmentCode || request.id || id;
  const status = request.status || "CHECKED_IN";
  const items = request.items || [];

  return (
    <div className="vcl-muaho-detail-page warehouse-tracking">
      <Link className="warehouse-back" to="/warehouse/checkin" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", textDecoration: "none", marginBottom: "16px", fontWeight: 600 }}>
        <ArrowLeft size={17} /> Quay lại Theo dõi kho
      </Link>

      <section className="muaho-detail-hero">
        <div>
          <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#ea580c", letterSpacing: "0.08em" }}>
            CHI TIẾT ĐƠN MUA HỘ KHO QUỐC TẾ
          </span>
          <h2 style={{ margin: "4px 0 6px", fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>
            {code}
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Khách hàng: {request.receiverName || "Khách hàng mua hộ"} · {request.receiverPhone || "--"}
          </p>
        </div>
        <StatusPill status={status} />
      </section>

      <section className="muaho-detail-grid">
        <article className="muaho-info-card">
          <header>
            <ShoppingCart size={20} style={{ color: "#ea580c" }} />
            <div>
              <h3>Thông tin đơn mua hộ</h3>
              <small style={{ color: "#64748b" }}>Order Purchase Info</small>
            </div>
          </header>
          <DetailRow label="Mã đơn mua hộ" value={code} accent />
          <DetailRow label="Thời gian mua hàng" value={formatTime(request.createdAt)} />
          <DetailRow label="Cập nhật kho" value={formatTime(request.statusUpdatedAt)} />
          <DetailRow label="Người nhận hàng" value={request.receiverName} />
          <DetailRow label="Địa chỉ giao" value={request.receiverAddress} />
        </article>

        <article className="muaho-info-card">
          <header>
            <Package size={20} style={{ color: "#0284c7" }} />
            <div>
              <h3>Danh sách sản phẩm mua hộ</h3>
              <small style={{ color: "#64748b" }}>Chi tiết mặt hàng</small>
            </div>
          </header>
          {items.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "13.5px" }}>Không có chi tiết sản phẩm.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {items.map((pkg, idx) => (
                <div key={pkg.id || idx} style={{ padding: "10px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: "13.5px" }}>
                    {pkg.productName || `Sản phẩm #${idx + 1}`}
                  </strong>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "12.5px", color: "#64748b" }}>
                    <span>Số lượng: {pkg.quantity || 1}</span>
                    <span>{pkg.declaredPrice ? Number(pkg.declaredPrice).toLocaleString() + " đ" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default MuaHoDetail;
