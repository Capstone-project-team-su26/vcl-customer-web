import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Compass, PackageCheck, ShoppingCart, Warehouse } from "lucide-react";

import { getPurchaseRequestsApi } from "@features/purchase/api/purchaseRequestApi";
/* Import sâu có chủ đích: barrel tracking kéo theo trang (thứ tự CSS — ARCHITECTURE mục 4). */
import { ORDER_TRACKING_LIST_PATH } from "@features/tracking/constants/trackingPaths";
import { MuaHoTrackingList } from "@features/warehouse/components/MuaHoTracking/MuaHoTrackingList";
import { PageIntro, SummaryCard } from "@features/warehouse/components/shared/WarehouseSharedComponents";
import "./CheckinNhapKho.css";

/**
 * Chỉ còn phần MUA HỘ (ngoài phạm vi đợt ghép API ký gửi → xuất kho → hàng về VN, vẫn đọc
 * dữ liệu mẫu qua purchaseRequestApi). Tab "Đơn ký gửi" cũ đọc bản mock consignmentApi.mock
 * đã bị gỡ — hành trình ký gửi thật ở màn Theo dõi đơn hàng.
 */
export function CheckinNhapKho() {
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
        console.error("CheckinNhapKho API fetch error:", err);
        if (isMounted) setApiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="vcl-checkin-page warehouse-tracking">
      <PageIntro
        eyebrow="NHẬP KHO QUỐC TẾ · MUA HỘ"
        title="Nhập kho nước ngoài — đơn mua hộ"
        description="Theo dõi đơn mua hộ đã về kho nước ngoài, số cân và kích thước kiện."
        icon={Warehouse}
        action={
          <div className="warehouse-live">
            <span className="warehouse-live__dot" />
            <span>Đơn mua hộ</span>
          </div>
        }
      />

      <section className="warehouse-summary-grid">
        <SummaryCard
          icon={PackageCheck}
          label="Đơn mua hộ nhập kho"
          value={apiPurchaseRequests.length + " đơn"}
          note="Đã xác nhận nhập kho"
          tone="blue"
        />
        <SummaryCard
          icon={ShoppingCart}
          label="Loại đơn"
          value="Mua hộ"
          note="Đơn ký gửi xem ở Theo dõi đơn hàng"
          tone="purple"
        />
        <SummaryCard
          icon={Box}
          label="Nguồn dữ liệu"
          value="Yêu cầu mua hộ"
          note="Cập nhật theo tiến trình mua hộ"
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

export default CheckinNhapKho;
