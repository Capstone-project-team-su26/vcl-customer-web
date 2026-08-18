import React, { useEffect, useState } from "react";
import { Box, PackageCheck, Scale, Warehouse } from "lucide-react";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { KiGuiTrackingList } from "../KiGui/KiGuiTrackingList";
import { MuaHoTrackingList } from "../MuaHo/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./CheckinNhapKho.css";

export function CheckinNhapKho() {
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
          getConsignmentsApi({ params: { pageNumber: 1, pageSize: 10 } }),
          getPurchaseRequestsApi(1, 10),
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

          const warehouseStatuses = [
            "CHECKED_IN",
            "WAREHOUSE_RECEIVED",
            "RECEIVED",
            "IN_STORAGE",
            "CUSTOMS_REVIEW",
            "CUSTOMS_CLEARED",
            "OUTBOUND_READY",
            "RELEASED",
            "IN_TRANSIT",
            "COMPLETED",
            "DELIVERED",
          ];

          const filtered = allRawItems.filter((item) =>
            warehouseStatuses.includes(String(item?.status || "").trim().toUpperCase())
          );

          setApiConsignments(filtered.length > 0 ? filtered : allRawItems);
        }

        if (purchaseRes.status === "fulfilled" && purchaseRes.value) {
          const response = purchaseRes.value;
          const allRawItems = Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          setApiPurchaseRequests(allRawItems);
        }
      } catch (err) {
        console.error("CheckinNhapKho API fetch error:", err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalActualWeight = apiConsignments.reduce(
    (sum, item) => sum + (Number(item?.totalWeight) || Number(item?.actualWeight) || 0),
    0
  );

  const totalVolumeCbm = apiConsignments.reduce(
    (sum, item) => sum + (Number(item?.totalVolume) || Number(item?.volumeCbm) || 0),
    0
  );

  return (
    <div className="vcl-checkin-page warehouse-tracking">
      <PageIntro
        eyebrow="NHẬP KHO QUỐC TẾ"
        title="Nhập kho nước ngoài"
        description="Theo dõi chính xác thời gian kiện hàng cập bến kho nước ngoài, kết quả đối chiếu số cân thực tế và kích thước thể tích CBM từ API thực tế."
        icon={Warehouse}
        action={
          <div className="warehouse-live">
            <span className="warehouse-live__dot" />
            <span>Dữ liệu thực tế hệ thống</span>
          </div>
        }
      />

      {/* Summary Cards section calculated from real API */}
      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={PackageCheck}
          label="Tổng đơn nhập kho"
          value={(apiConsignments.length + apiPurchaseRequests.length) + " đơn"}
          note="Đã xác nhận nhập kho"
          tone="blue"
        />
        <SummaryCard
          icon={Scale}
          label="Trọng lượng cân thực tế"
          value={totalActualWeight > 0 ? totalActualWeight.toFixed(2) + " kg" : "Chưa có"}
          note="Dữ liệu từ kho nhận"
          tone="green"
        />
        <SummaryCard
          icon={Box}
          label="Thể tích quy đổi CBM"
          value={totalVolumeCbm > 0 ? totalVolumeCbm.toFixed(3) + " m³" : "Chưa có"}
          note="Kích thước kiện hàng"
          tone="amber"
        />
        <SummaryCard
          icon={Warehouse}
          label="Đơn ký gửi / Mua hộ"
          value={`${apiConsignments.length} / ${apiPurchaseRequests.length}`}
          note="Tổng số đơn nhập kho"
          tone="purple"
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
          📦 Đơn ký gửi ({apiConsignments.length})
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
          🛒 Đơn mua hộ ({apiPurchaseRequests.length})
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

export default CheckinNhapKho;
