import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileText,
  Printer,
} from "lucide-react";

import { getConsignmentsApi } from "../../../../api/OrderApi/consignmentApi";
import { getMyReceivingNoteApi } from "../../../../api/OrderApi/receivingNoteApi";
import ReceivingNoteDocument from "../../../../components/DashboardComponents/ReceivingNoteCard/ReceivingNoteDocument";
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
          // Phiếu thật do kho lập, không phải dựng lại từ dữ liệu đơn — số liệu ở đây đúng
          // bằng số kho cân đếm được.
          const note = await getMyReceivingNoteApi(receiptId);
          if (isMounted) setReceiptDetail(note);
        } else {
          const response = await getConsignmentsApi({ params: { pageNumber: 1, pageSize: 100 } });
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
            <button type="button" className="is-primary" onClick={() => window.print()}>
              <Printer size={17} /> In phiếu
            </button>
          </div>
        </div>

        <ReceivingNoteDocument note={receiptDetail} />
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
