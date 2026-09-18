import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, FileText, ShieldCheck, Truck } from "lucide-react";

import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";
/* Import sâu có chủ đích: barrel tracking kéo theo trang (thứ tự CSS — ARCHITECTURE mục 4). */
import { ORDER_TRACKING_LIST_PATH } from "@features/tracking/constants/trackingPaths";
import { MuaHoTrackingList } from "@features/warehouse/components/MuaHoTracking/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "@features/warehouse/components/shared/WarehouseSharedComponents";
import "./ThongQuanVn.css";

/**
 * Chỉ còn phần MUA HỘ (ngoài phạm vi đợt ghép API ký gửi → xuất kho → hàng về VN, vẫn đọc
 * dữ liệu mẫu qua purchaseRequestApi). Tab "Đơn ký gửi" cũ đọc bản mock consignmentApi.mock
 * đã bị gỡ — hành trình ký gửi thật ở màn Theo dõi đơn hàng.
 */
export function ThongQuanVn() {
  const [apiPurchaseRequests, setApiPurchaseRequests] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getPurchaseRequestsApi(1, 100)
      .then((response) => {
        if (!isMounted) return;

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
        setApiLoading(false);
      })
      .catch((err) => {
        console.error("ThongQuanVn API fetch error:", err);
        if (isMounted) setApiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="vcl-customs-page warehouse-tracking">
      <PageIntro
        eyebrow="THÔNG QUAN & KHO VIỆT NAM · MUA HỘ"
        title="Thông quan & kho Việt Nam — đơn mua hộ"
        description="Theo dõi tiến trình thông quan và đưa hàng mua hộ về kho trung tâm Việt Nam."
        icon={ShieldCheck}
        action={
          <span className="warehouse-security">
            <ShieldCheck size={15} /> Hồ sơ được bảo mật
          </span>
        }
      />

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={FileText}
          label="Đơn mua hộ thông quan"
          value={apiPurchaseRequests.length + " đơn"}
          note="Hồ sơ chứng từ hợp lệ"
          tone="green"
        />
        <SummaryCard
          icon={Truck}
          label="Tuyến trung chuyển"
          value="Biên giới -> Kho Việt Nam"
          note="Giao nhận kho tập kết"
          tone="amber"
        />
      </section>

      {/* Đơn ký gửi không còn theo dõi ở đây: màn này từng đọc dữ liệu mẫu. Hành trình ký gửi
          thật (kho nguồn → chuyến → kho VN → giao) nằm ở màn Theo dõi đơn hàng. */}
      <section className="warehouse-notice">
        <Compass size={21} />
        <div>
          <strong>Đơn ký gửi</strong>
          <p>
            Hành trình đơn ký gửi (kho nguồn, chuyến, mã vận đơn, kho Việt Nam, giao hàng) xem ở{" "}
            <Link to={ORDER_TRACKING_LIST_PATH}>Theo dõi đơn hàng</Link>.
          </p>
        </div>
      </section>

      <div className="warehouse-content-section">
        <MuaHoTrackingList
          purchaseRequests={apiPurchaseRequests}
          loading={apiLoading}
        />
      </div>
    </div>
  );
}

export default ThongQuanVn;
