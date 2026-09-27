import { Tag } from "antd";
import { CreditCardOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVnd } from "@shared/utils/formatNumber";

import "./TrackingMoneyCard.css";

/**
 * TIỀN CỦA ĐƠN ngay trên màn hành trình — khách theo dõi hàng thường hỏi luôn "đơn này bao
 * nhiêu, tôi trả chưa". Trước đây phải rời sang tab báo giá mới biết.
 *
 * Mọi con số đọc thẳng từ `tracking.money`; màn hình KHÔNG cộng trừ gì. Backend lấy từ báo giá
 * đã lưu (không tính lại theo bảng giá hiện tại) nên số ở đây luôn bằng số ở tab báo giá —
 * đó là lý do không tự cộng ở đây, cộng ở hai nơi là bắt đầu lệch.
 *
 * @param {{ money: object | null }} props
 */
export default function TrackingMoneyCard({ money }) {
  if (!money) return null;

  const status = String(money.paymentStatus || "").toUpperCase();
  const statusMeta =
    status === "PAID"
      ? { color: "green", text: "Đã thanh toán đủ" }
      : status === "PARTIALLY_PAID"
        ? { color: "orange", text: "Đã trả một phần" }
        : { color: "red", text: "Chưa thanh toán" };

  const rows = [
    { key: "freight", label: "Cước vận chuyển quốc tế", value: money.estimatedFreightCharge },
    { key: "service", label: "Phí dịch vụ và phụ phí", value: money.serviceFee },
    { key: "tax", label: "Thuế và phí hải quan", value: money.taxAndDuty },
  ].filter((row) => Number(row.value) > 0);

  return (
    <SectionCard
      icon={<CreditCardOutlined />}
      title="Tiền của đơn này"
      subtitle="Số lấy từ báo giá bạn đang xem, không đổi khi bảng giá thay đổi."
      extra={<Tag color={statusMeta.color}>{statusMeta.text}</Tag>}
    >
      <div className="tracking-money__totals">
        <div className="tracking-money__box is-total">
          <span>Tổng phải trả</span>
          <strong>{formatVnd(money.totalEstimatedCost)}</strong>
        </div>
        <div className="tracking-money__box is-paid">
          <span>Đã trả</span>
          <strong>{formatVnd(money.paidAmount)}</strong>
        </div>
        <div className="tracking-money__box is-due">
          <span>Còn phải trả</span>
          <strong>{formatVnd(money.outstandingAmount)}</strong>
        </div>
      </div>

      {rows.length ? (
        <ul className="tracking-money__lines">
          {rows.map((row) => (
            <li key={row.key}>
              <span>{row.label}</span>
              <b>{formatVnd(row.value)}</b>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
