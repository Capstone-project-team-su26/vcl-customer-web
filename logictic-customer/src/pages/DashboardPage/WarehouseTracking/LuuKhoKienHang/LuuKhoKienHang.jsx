import React, { useEffect, useState } from "react";
import { Box, Clock3, MapPin, Scale, Warehouse } from "lucide-react";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { KiGuiTrackingList } from "../KiGui/KiGuiTrackingList";
import { MuaHoTrackingList } from "../MuaHo/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./LuuKhoKienHang.css";

export function LuuKhoKienHang() {
  const [search, setSearch] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("CONSIGNMENT");
  const [apiConsignments, setApiConsignments] = useState([]);
  const [apiPurchaseRequests, setApiPurchaseRequests] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchApiData = async () => {
      try {
        setApiLoading(true);
        const [consignmentsRes, purchaseRes] = await Promise.allSettled([
          getConsignmentsApi({ params: { pageNumber: 1, pageSize: 100 } }),
          getPurchaseRequestsApi(1, 100),
        ]);

        if (!isMounted) return;

        if (consignmentsRes.status === "fulfilled" && consignmentsRes.value) {
          const response = consignmentsRes.value;
          const allRawItems = Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          const storageStatuses = ["IN_STORAGE", "CHECKED_IN", "WAREHOUSE_RECEIVED", "RECEIVED"];
          const filtered = allRawItems.filter((item) =>
            storageStatuses.includes(String(item?.status || "").trim().toUpperCase())
          );

          setApiConsignments(filtered.length > 0 ? filtered : allRawItems);
        }

        if (purchaseRes.status === "fulfilled" && purchaseRes.value) {
          const response = purchaseRes.value;
          const rawItems = Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          setApiPurchaseRequests(rawItems);
        }
      } catch (err) {
        console.error("LuuKhoKienHang API fetch error:", err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalStorageWeight = apiConsignments.reduce(
    (sum, item) => sum + (Number(item?.totalWeight) || Number(item?.actualWeight) || 0),
    0
  );

  return (
    <div className="vcl-storage-page warehouse-tracking">
      <PageIntro
        eyebrow="QUẢN LÝ LƯU KHO QUỐC TẾ"
        title="Lưu kho kiện hàng"
        description="Theo dõi vị trí lưu kệ kho, thời gian lưu kho của từng kiện hàng và quản lý hạn lưu kho từ dữ liệu thực tế hệ thống."
        icon={Box}
        action={
          <div className="warehouse-live">
            <MapPin size={16} />
            <span>KHO BÃI THỰC TẾ</span>
          </div>
        }
      />

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={Warehouse}
          label="Đơn ký gửi lưu kho"
          value={apiConsignments.length + " đơn"}
          note="Hiện có trong kho"
          tone="blue"
        />
        <SummaryCard
          icon={Clock3}
          label="Đơn mua hộ lưu kho"
          value={apiPurchaseRequests.length + " đơn"}
          note="Chờ xuất hàng"
          tone="green"
        />
        <SummaryCard
          icon={Scale}
          label="Tổng khối lượng lưu kho"
          value={totalStorageWeight > 0 ? totalStorageWeight.toFixed(2) + " kg" : "Chưa có"}
          note="Tính theo đơn hiện có"
          tone="purple"
        />
        <SummaryCard
          icon={MapPin}
          label="Hạn miễn phí lưu kho"
          value="7 ngày đầu"
          note="Theo chính sách dịch vụ"
          tone="amber"
        />
      </section>

      {/* Category Tab Switcher */}
      <div className="vcl-category-tabs warehouse-category-tabs">
        <button
          type="button"
          className={
            "vcl-category-tab warehouse-category-tab " +
            (activeCategoryTab === "CONSIGNMENT"
              ? "vcl-category-tab--active warehouse-category-tab--active"
              : "")
          }
          onClick={() => setActiveCategoryTab("CONSIGNMENT")}
        >
          📦 Ký gửi lưu kho ({apiConsignments.length})
        </button>
        <button
          type="button"
          className={
            "vcl-category-tab warehouse-category-tab " +
            (activeCategoryTab === "PURCHASE"
              ? "vcl-category-tab--active warehouse-category-tab--active"
              : "")
          }
          onClick={() => setActiveCategoryTab("PURCHASE")}
        >
          🛒 Mua hộ lưu kho ({apiPurchaseRequests.length})
        </button>
      </div>

      <div className="warehouse-content-section">
        {activeCategoryTab === "CONSIGNMENT" ? (
          <KiGuiTrackingList
            consignments={apiConsignments}
            loading={apiLoading}
            searchKeyword={search}
            setSearchKeyword={setSearch}
          />
        ) : (
          <MuaHoTrackingList
            purchaseRequests={apiPurchaseRequests}
            loading={apiLoading}
            searchKeyword={search}
            setSearchKeyword={setSearch}
          />
        )}
      </div>
    </div>
  );
}

export default LuuKhoKienHang;
