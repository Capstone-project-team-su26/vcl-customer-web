import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleAlert,
  Download,
  FileCheck2,
  FileText,
  Printer,
} from "lucide-react";

import AuthNotify from "../../../../utils/AuthNotify";
import { getConsignmentDetailApi, getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { formatTime, PageIntro } from "../Shared/WarehouseSharedComponents";
import "./WarehouseReceiptPage.css";

export function WarehouseReceiptPage() {
  const { receiptId } = useParams();
  const [receiptDetail, setReceiptDetail] = useState(null);
  const [receiptList, setReceiptList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        if (receiptId) {
          const detail = await getConsignmentDetailApi(receiptId);
          if (isMounted) setReceiptDetail(detail);
        } else {
          const response = await getConsignmentsApi({ params: { pageNumber: 1, pageSize: 10 } });
          const items = Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.items)
            ? response.items
            : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];

          if (isMounted) setReceiptList(items);
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu phiếu nhập kho:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [receiptId]);

  if (loading) {
    return (
      <div className="warehouse-tracking">
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Đang tải dữ liệu phiếu nhập kho...
        </div>
      </div>
    );
  }

  if (receiptId && !receiptDetail) {
    return (
      <div className="warehouse-tracking">
        <div className="warehouse-empty warehouse-empty--page">
          <CircleAlert size={34} />
          <strong>Không tìm thấy phiếu nhập kho này.</strong>
          <p>Dữ liệu có thể đã được cập nhật hoặc đường dẫn không còn hợp lệ.</p>
          <Link className="warehouse-primary-link" to="/warehouse/checkin">
            Quay lại danh sách kho
          </Link>
        </div>
      </div>
    );
  }

  if (receiptDetail) {
    return (
      <div className="warehouse-tracking warehouse-receipt-page">
        <div className="warehouse-receipt-toolbar">
          <Link className="warehouse-back" to="/warehouse/receipts">
            <ArrowLeft size={17} /> Danh sách phiếu nhập kho
          </Link>
          <div>
            <button type="button" onClick={() => window.print()}>
              <Printer size={17} /> In phiếu
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() =>
                AuthNotify.success(
                  "Đã chọn tải phiếu",
                  "Hệ thống đang chuẩn bị bản in PDF."
                )
              }
            >
              <Download size={17} /> Tải PDF
            </button>
          </div>
        </div>

        <article className="warehouse-receipt-document">
          <header>
            <div className="warehouse-receipt-brand">
              <span>VCL</span>
              <div>
                <strong>VIETNAM LOGISTICS</strong>
                <small>International Warehouse System</small>
              </div>
            </div>
            <div className="warehouse-receipt-title">
              <span>WAREHOUSE RECEIPT (WR)</span>
              <h2>BIÊN BẢN NHẬP KHO</h2>
              <strong>{receiptDetail.consignmentCode || receiptId}</strong>
            </div>
          </header>

          <section className="warehouse-receipt-info-grid">
            <div>
              <span>Mã đơn ký gửi</span>
              <strong>{receiptDetail.consignmentCode || receiptId}</strong>
            </div>
            <div>
              <span>Thời gian nhập kho</span>
              <strong>{formatTime(receiptDetail.statusUpdatedAt || receiptDetail.createdAt)}</strong>
            </div>
            <div>
              <span>Người nhận</span>
              <strong>
                {receiptDetail.receiverName} ({receiptDetail.receiverPhone})
              </strong>
            </div>
            <div>
              <span>Địa chỉ</span>
              <strong>{receiptDetail.receiverAddress || "Chưa có"}</strong>
            </div>
            <div>
              <span>Loại đơn / Trạng thái</span>
              <strong>
                {receiptDetail.consignmentType || "Standard"} · {receiptDetail.status}
              </strong>
            </div>
            <div>
              <span>Tuyến vận chuyển</span>
              <strong>{receiptDetail.route || "TQ -> VN"}</strong>
            </div>
          </section>

          <div className="warehouse-receipt-official-note">
            <CircleAlert size={16} />
            <span>
              Biên bản chính thức được sinh từ hệ thống khi xác nhận nhập kho hoàn tất.
            </span>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="warehouse-tracking">
      <PageIntro
        eyebrow="WAREHOUSE RECEIPT"
        title="Phiếu nhập kho của bạn"
        description="Mỗi phiếu ghi nhận chính xác số kiện, khối lượng thực tế và kết quả kiểm nhận tại kho quốc tế."
        icon={FileText}
      />
      <section className="warehouse-panel">
        <header className="warehouse-panel__header">
          <div>
            <h3>Danh sách phiếu nhập kho</h3>
            <p>{receiptList.length} phiếu đã được ghi nhận</p>
          </div>
        </header>
        {receiptList.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Chưa có phiếu nhập kho nào.
          </div>
        ) : (
          <div className="warehouse-receipt-list">
            {receiptList.map((item, index) => {
              const code = item.consignmentCode || item.id || `WR-${index + 1}`;
              return (
                <Link key={item.id || index} to={"/warehouse/receipts/" + (item.orderId || item.id)}>
                  <span className="warehouse-receipt-list__icon">
                    <FileCheck2 size={22} />
                  </span>
                  <span>
                    <small>PHIẾU NHẬP KHO</small>
                    <strong>{code}</strong>
                    <em>{item.receiverName}</em>
                  </span>
                  <span>
                    <small>Trạng thái</small>
                    <strong>{item.status}</strong>
                    <em>{formatTime(item.statusUpdatedAt || item.createdAt)}</em>
                  </span>
                  <span>
                    <small>Thông số</small>
                    <strong>
                      {item.totalWeight ? item.totalWeight + " kg" : "Chưa cân"}
                    </strong>
                    <em>{item.route}</em>
                  </span>
                  <ChevronRight size={19} />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default WarehouseReceiptPage;
