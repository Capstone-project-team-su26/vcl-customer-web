import React, { useEffect, useState } from "react";
import { CircleAlert, FileText, Scale, ShieldCheck, Truck } from "lucide-react";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getPurchaseRequestsApi } from "../../../../api/PurchaseAPI/purchaseRequestApi";
import { KiGuiTrackingList } from "../KiGui/KiGuiTrackingList";
import { MuaHoTrackingList } from "../MuaHo/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "../Shared/WarehouseSharedComponents";
import "./ThongQuanVn.css";

export function ThongQuanVn() {
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

          const customsStatuses = ["CUSTOMS_REVIEW", "CUSTOMS_CLEARED", "IN_TRANSIT", "COMPLETED", "DELIVERED"];
          const filtered = allRawItems.filter((item) =>
            customsStatuses.includes(String(item?.status || "").trim().toUpperCase())
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
        console.error("ThongQuanVn API fetch error:", err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCustomsWeight = apiConsignments.reduce(
    (sum, item) => sum + (Number(item?.totalWeight) || Number(item?.actualWeight) || 0),
    0
  );

  return (
    <div className="vcl-customs-page warehouse-tracking">
      <PageIntro
        eyebrow="CUSTOMS CLEARANCE & KHO VIỆT NAM"
        title="Thông quan & kho Việt Nam"
        description="Theo dõi tiến trình kiểm hóa tờ khai hải quan, chứng từ xuất nhập khẩu và lịch trình xe/máy bay đưa hàng về kho trung tâm Việt Nam từ dữ liệu thực tế hệ thống."
        icon={ShieldCheck}
        action={
          <span className="warehouse-security">
            <ShieldCheck size={15} /> Hồ sơ được bảo mật
          </span>
        }
      />

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={ShieldCheck}
          label="Đơn ký gửi thông quan"
          value={apiConsignments.length + " đơn"}
          note="Đang làm thủ tục / vận chuyển"
          tone="blue"
        />
        <SummaryCard
          icon={FileText}
          label="Đơn mua hộ thông quan"
          value={apiPurchaseRequests.length + " đơn"}
          note="Hồ sơ chứng từ hợp lệ"
          tone="green"
        />
        <SummaryCard
          icon={Scale}
          label="Tổng khối lượng thông quan"
          value={totalCustomsWeight > 0 ? totalCustomsWeight.toFixed(2) + " kg" : "Chưa có"}
          note="Tính theo đơn hiện tại"
          tone="purple"
        />
        <SummaryCard
          icon={Truck}
          label="Tuyển trung chuyển"
          value="Biên giới -> Kho Việt Nam"
          note="Giao nhận kho tập kết"
          tone="amber"
        />
      </section>

      <section className="warehouse-notice">
        <CircleAlert size={21} />
        <div>
          <strong>Thông báo tiến trình thông quan</strong>
          <p>
            Hệ thống tự động cập nhật trạng thái tờ khai và thời gian hàng cập bến kho Việt Nam trực tiếp từ API.
          </p>
        </div>
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
          📦 Ký gửi thông quan ({apiConsignments.length})
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
          🛒 Mua hộ thông quan ({apiPurchaseRequests.length})
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

export default ThongQuanVn;
