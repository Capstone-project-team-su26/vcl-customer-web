import React, { useState } from "react";
import { Filter, Search } from "lucide-react";
import { KiGuiTrackingCard } from "./KiGuiTrackingCard";
import "../Shared/WarehouseShared.css";

export function KiGuiTrackingList({ consignments = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredItems = consignments.filter((item) => {
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
          <h3>Danh sách đơn ký gửi</h3>
          <p>{filteredItems.length} đơn ký gửi phù hợp với bộ lọc hiện tại</p>
        </div>

        <div className="warehouse-filter">
          <label>
            <Search size={17} />
            <input
              type="text"
              placeholder="Tìm mã đơn, mã kiện, sản phẩm..."
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
              <option value="ALL">Tất cả trạng thái kho</option>
              <option value="CHECKED_IN">Đã Check-in kho quốc tế</option>
              <option value="WAREHOUSE_RECEIVED">Kho quốc tế đã nhận hàng</option>
              <option value="IN_STORAGE">Đang lưu kho</option>
              <option value="CUSTOMS_REVIEW">Đang thông quan</option>
              <option value="IN_TRANSIT">Đang về Việt Nam</option>
            </select>

          </label>
        </div>
      </header>

      <div className="warehouse-shipment-list">
        {loading ? (
          <div className="warehouse-empty">
            <Search size={30} />
            <strong>Đang tải danh sách đơn ký gửi...</strong>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="warehouse-empty">
            <Search size={30} />
            <strong>Không tìm thấy đơn ký gửi phù hợp</strong>
            <p>Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái ký gửi.</p>
          </div>
        ) : (
          filteredItems.map((shipment, index) => (
            <KiGuiTrackingCard
              key={shipment.orderId || shipment.id || shipment.consignmentCode || `kigui-${index}`}
              shipment={shipment}
            />
          ))
        )}
      </div>
    </section>
  );
}
