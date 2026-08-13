import React, { useState } from "react";
import { Filter, Inbox, PackageX, Search, ShoppingCart } from "lucide-react";
import { MuaHoTrackingCard } from "./MuaHoTrackingCard";
import "../Shared/WarehouseShared.css";

export function MuaHoTrackingList({ purchaseRequests = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredItems = purchaseRequests.filter((item) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      String(item.status).toUpperCase() === statusFilter;

    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      String(item.consignmentCode || "").toLowerCase().includes(query) ||
      String(item.receiverName || "").toLowerCase().includes(query) ||
      (item.items || []).some((pkg) =>
        String(pkg.productName || "").toLowerCase().includes(query)
      );

    return matchesStatus && matchesSearch;
  });

  return (
    <section className="warehouse-panel">
      <header className="warehouse-panel__header">
        <div>
          <h3>Danh sách đơn mua hộ trong kho</h3>
          <p>
            {filteredItems.length > 0
              ? `${filteredItems.length} đơn mua hộ đã nhập kho quốc tế`
              : "Dữ liệu được đồng bộ thời gian thực 100% từ API máy chủ"}
          </p>
        </div>

        <div className="warehouse-filter">
          <label>
            <Search size={17} />
            <input
              type="text"
              placeholder="Tìm mã đơn, người nhận, sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label className="warehouse-select">
            <Filter size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái kho mua hộ</option>
              <option value="CHECKED_IN">Đã Check-in kho quốc tế</option>
              <option value="WAREHOUSE_RECEIVED">Kho mua hộ đã nhận hàng</option>
              <option value="IN_STORAGE">Đang lưu kho mua hộ</option>
              <option value="CUSTOMS_REVIEW">Đang thông quan</option>
              <option value="IN_TRANSIT">Đang về Việt Nam</option>
            </select>
          </label>
        </div>
      </header>

      <div className="warehouse-shipment-list">
        {loading ? (
          <div className="warehouse-empty">
            <Search size={32} className="warehouse-empty__icon" style={{ color: "#ea580c" }} />
            <strong>Đang đồng bộ dữ liệu từ API mua hộ...</strong>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="warehouse-empty" style={{ padding: "48px 20px", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ea580c",
              }}
            >
              <ShoppingCart size={32} />
            </div>
            <strong style={{ fontSize: "16px", color: "#1e293b", display: "block", marginBottom: "6px" }}>
              Chưa có đơn mua hộ nào trong kho quốc tế
            </strong>
            <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "440px", margin: "0 auto" }}>
              Hệ thống đang hiển thị 100% dữ liệu thực từ API. Đơn mua hộ sẽ xuất hiện tại đây ngay khi kho quốc tế thực hiện <strong>Check-in nhập kho</strong>.
            </p>
          </div>
        ) : (
          filteredItems.map((request, index) => (
            <MuaHoTrackingCard
              key={request.id || request.purchaseRequestId || request.consignmentCode || `muaho-${index}`}
              request={request}
            />
          ))
        )}
      </div>
    </section>
  );
}
