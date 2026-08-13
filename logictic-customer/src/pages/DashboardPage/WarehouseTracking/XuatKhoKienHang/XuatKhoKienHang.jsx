import React, { useEffect, useState } from "react";
import { FileCheck2, Plane, Scale, Truck } from "lucide-react";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { KiGuiTrackingList } from "../KiGui/KiGuiTrackingList";
import { MuaHoTrackingList } from "../MuaHo/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./XuatKhoKienHang.css";

export function XuatKhoKienHang() {
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

          const outboundStatuses = ["OUTBOUND_READY", "RELEASED", "IN_TRANSIT"];
          const filtered = allRawItems.filter((item) =>
            outboundStatuses.includes(String(item?.status || "").trim().toUpperCase())
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
        console.error("XuatKhoKienHang API fetch error:", err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalOutboundWeight = apiConsignments.reduce(
    (sum, item) => sum + (Number(item?.totalWeight) || Number(item?.actualWeight) || 0),
    0
  );

  return (
    <div className="vcl-export-page warehouse-tracking">
      <PageIntro
        eyebrow="WAREHOUSE RELEASE ORDER (WRO)"
        title="Xuất kho kiện hàng"
        description="Theo dõi danh sách đơn xuất kho, lịch lấy hàng của đơn vị vận chuyển và thời điểm xuất khỏi kho từ dữ liệu thực tế hệ thống."
        icon={Truck}
        action={
          <div className="warehouse-live">
            <Truck size={16} />
            <span>XUẤT KHO VẬN CHUYỂN</span>
          </div>
        }
      />

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={FileCheck2}
          label="Đơn ký gửi xuất kho"
          value={apiConsignments.length + " đơn"}
          note="Sẵn sàng hoặc đang giao"
          tone="blue"
        />
        <SummaryCard
          icon={Plane}
          label="Đơn mua hộ xuất kho"
          value={apiPurchaseRequests.length + " đơn"}
          note="Sẵn sàng xuất hàng"
          tone="purple"
        />
        <SummaryCard
          icon={Scale}
          label="Tổng khối lượng xuất"
          value={totalOutboundWeight > 0 ? totalOutboundWeight.toFixed(2) + " kg" : "Chưa có"}
          note="Tính theo đơn hiện tại"
          tone="green"
        />
        <SummaryCard
          icon={Truck}
          label="Tuyến vận chuyển"
          value="Trung Quốc -> Việt Nam"
          note="Đường bộ / Đường hàng không"
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
          📦 Đơn ký gửi xuất kho ({apiConsignments.length})
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
          🛒 Đơn mua hộ xuất kho ({apiPurchaseRequests.length})
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

export default XuatKhoKienHang;
