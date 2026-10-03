/**
 * TIỀN CỦA ĐƠN MUA HỘ — cùng khuôn "Tiền của đơn này" (TrackingMoneyCard) bên ký gửi.
 *
 * Trả lời "đơn này bao nhiêu, tôi đã trả bao nhiêu, còn gì phải trả, được hoàn bao nhiêu".
 * MỌI con số đọc thẳng từ backend, màn hình không cộng trừ:
 *   - báo giá: `quotation` trong GET /api/purchase-requests/{id} (PurchaseQuotationResponseDto —
 *     totalAmount, prepayAmount, estimatedLaterAmount, từng khoản phí; cách chia theo PurchasePrepayRule:
 *     trả trước = tiền hàng + phí mua hộ + ship nội địa + phụ phí + VAT phần phí; cước quốc tế, VAT cước
 *     và thuế nhập khẩu tạm tính, thu khi hàng về VN theo cân đo thật);
 *   - đã trả / còn thiếu / hoàn: GET /api/purchase-requests/{id}/payments (PurchasePaymentHistoryResponseDto).
 *
 * Thiếu phần nào thì ẩn phần đó (ví dụ chưa tải được lịch sử thanh toán) — không vẽ "0đ" giả,
 * vì "0đ" đọc ra là miễn phí chứ không phải "chưa biết".
 */
import { Alert, Button, Tag } from "antd";
import { WalletOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import { formatVnd } from "@shared/utils/formatNumber";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import {
  getPurchasePaymentLabel,
  isPurchaseRefund,
} from "@features/purchase/utils/purchasePayments";

import "./PurchaseMoneyCard.css";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const hasValue = (value) => value !== null && value !== undefined && value !== "";

const PAYMENT_STATUS_META = {
  PAID: { color: "green", text: "Đã thanh toán" },
  PENDING: { color: "orange", text: "Chờ thanh toán" },
  AWAITING_PAYMENT: { color: "orange", text: "Chờ thanh toán" },
  PENDING_RECONCILIATION: { color: "blue", text: "VCL đang đối soát" },
  PROCESSING: { color: "blue", text: "VCL đang đối soát" },
  CANCELLED: { color: "default", text: "Đã huỷ" },
  CANCELED: { color: "default", text: "Đã huỷ" },
  EXPIRED: { color: "default", text: "Hết hạn" },
  FAILED: { color: "red", text: "Không thành công" },
};

const paymentStatusMeta = (status) =>
  PAYMENT_STATUS_META[String(status || "").toUpperCase()] || { color: "default", text: "Đang xử lý" };

const formatTime = (value) =>
  value ? formatVietnamDateTime(value, { apiTimeMode: "utc", fallback: "" }) : "";

/**
 * @param {{ quotation: object|null, paymentHistory: object|null, paymentsError?: boolean,
 *   stopped?: boolean, onOpenQuotation?: () => void, onRetry?: () => void }} props
 *   stopped: đơn đã huỷ / bị từ chối — phần tạm tính thu ở VN không còn, không bày ra nữa.
 */
export default function PurchaseMoneyCard({
  quotation,
  paymentHistory,
  paymentsError = false,
  stopped = false,
  onOpenQuotation,
  onRetry,
}) {
  const payments = (paymentHistory?.payments || []).filter((payment) => !isPurchaseRefund(payment));
  const refunded = toNumber(paymentHistory?.totalRefunded);
  const pendingRefund = toNumber(paymentHistory?.totalPendingRefund);
  const legacy = Boolean(quotation?.isLegacy);

  if (!quotation && !paymentHistory) {
    return (
      <SectionCard
        icon={<WalletOutlined />}
        title="Tiền của đơn mua hộ"
        subtitle="Chưa có báo giá. VCL sẽ gửi báo giá sau khi xem yêu cầu của bạn."
      >
        {paymentsError ? (
          <Alert
            type="warning"
            showIcon
            title="Chưa tải được thông tin thanh toán"
            action={onRetry ? <Button size="small" onClick={onRetry}>Thử lại</Button> : null}
          />
        ) : null}
      </SectionCard>
    );
  }

  const outstanding = toNumber(paymentHistory?.outstanding);
  const statusTag = !paymentHistory
    ? null
    : outstanding > 0
      ? { color: "orange", text: "Còn phần trả trước chưa trả" }
      : toNumber(paymentHistory.totalPaid) > 0
        ? { color: "green", text: "Đã trả đủ phần trả trước" }
        : { color: "default", text: "Chưa thanh toán" };

  const boxes = [
    quotation && {
      key: "total",
      tone: "is-total",
      label: "Tổng dự kiến theo báo giá",
      value: quotation.totalAmount,
    },
    paymentHistory && {
      key: "paid",
      tone: "is-paid",
      label: "Bạn đã trả",
      value: paymentHistory.totalPaid,
    },
    paymentHistory && {
      key: "due",
      tone: outstanding > 0 ? "is-due" : "is-muted",
      label: "Còn phải trả trước",
      value: outstanding,
    },
    quotation &&
    !legacy &&
    !stopped && {
      key: "later",
      tone: "is-later",
      label: "Tạm tính, thu khi hàng về VN",
      value: quotation.estimatedLaterAmount,
    },
    quotation &&
    legacy && {
      key: "remaining",
      tone: "is-later",
      label: "Còn lại (báo giá cũ)",
      value: quotation.remainingAmount,
    },
    refunded > 0 && {
      key: "refund",
      tone: "is-refund",
      label: "VCL đã hoàn cho bạn",
      value: refunded,
      extra: pendingRefund > 0 ? `+ ${formatVnd(pendingRefund)} đang chờ hoàn` : "",
    },
    refunded <= 0 &&
    pendingRefund > 0 && {
      key: "refund-pending",
      tone: "is-refund",
      label: "VCL đang hoàn cho bạn",
      value: pendingRefund,
    },
  ].filter(Boolean);

  const additionalFees = Array.isArray(quotation?.additionalFees) ? quotation.additionalFees : [];

  const prepayLines = quotation
    ? [
      { key: "goods", label: "Tiền hàng", value: quotation.productsSubtotal },
      ...(additionalFees.length === 0
        ? [
            { key: "fee", label: "Phí mua hộ", value: quotation.purchaseFee },
            { key: "domestic", label: "Ship nội địa (người bán → kho VCL)", value: quotation.domesticShippingFee },
          ]
        : []),
      ...additionalFees.map((fee, index) => ({
        key: `extra-${fee?.id || index}`,
        label: fee?.feeName || "Phụ phí",
        value: fee?.amount,
      })),
    ].filter((line) => toNumber(line.value) !== 0)
    : [];

  const weightNote =
    hasValue(quotation?.estimatedWeight) && hasValue(quotation?.freightRatePerKg)
      ? ` (${toNumber(quotation.estimatedWeight).toLocaleString("vi-VN")} kg × ${formatVnd(quotation.freightRatePerKg)}/kg)`
      : "";

  const laterLines = quotation
    ? [
      { key: "freight", label: `Cước quốc tế tạm tính${weightNote}`, value: quotation.shippingFee },
      { key: "tax", label: "Thuế nhập khẩu tạm tính", value: quotation.importTax },
    ].filter((line) => toNumber(line.value) !== 0)
    : [];

  return (
    <SectionCard
      icon={<WalletOutlined />}
      title="Tiền của đơn mua hộ"
      subtitle="Số lấy từ báo giá và các khoản bạn đã trả, không đổi khi bảng giá thay đổi."
      extra={
        <>
          {statusTag ? <Tag color={statusTag.color}>{statusTag.text}</Tag> : null}
          {onOpenQuotation && quotation ? (
            <Button size="small" onClick={onOpenQuotation}>
              Xem báo giá chi tiết
            </Button>
          ) : null}
        </>
      }
    >
      <div className="purchase-money__totals">
        {boxes.map((box) => (
          <div key={box.key} className={`purchase-money__box ${box.tone}`}>
            <span>{box.label}</span>
            <strong>{formatVnd(box.value)}</strong>
            {box.extra ? <small>{box.extra}</small> : null}
          </div>
        ))}
      </div>

      {paymentsError ? (
        <Alert
          className="purchase-money__alert"
          type="warning"
          showIcon
          title="Chưa tải được các khoản bạn đã trả — số đã trả / còn phải trả tạm ẩn."
          action={onRetry ? <Button size="small" onClick={onRetry}>Thử lại</Button> : null}
        />
      ) : null}

      {quotation && !legacy ? (
        <div className={`purchase-money__groups${stopped ? " is-single" : ""}`}>
          <div className="purchase-money__group">
            <div className="purchase-money__group-head">
              <span>Trả trước khi VCL đặt hàng</span>
              <b>{formatVnd(quotation.prepayAmount)}</b>
            </div>
            <ul className="purchase-money__lines">
              {prepayLines.map((line) => (
                <li key={line.key}>
                  <span>{line.label}</span>
                  <b>{formatVnd(line.value)}</b>
                </li>
              ))}
            </ul>
          </div>

          {stopped ? null : (
            <div className="purchase-money__group is-later">
              <div className="purchase-money__group-head">
                <span>Thu khi hàng về Việt Nam (tạm tính)</span>
                <b>{formatVnd(quotation.estimatedLaterAmount)}</b>
              </div>
              <ul className="purchase-money__lines">
                {laterLines.length ? (
                  laterLines.map((line) => (
                    <li key={line.key}>
                      <span>{line.label}</span>
                      <b>{formatVnd(line.value)}</b>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Chưa có khoản tạm tính</span>
                    <b>—</b>
                  </li>
                )}
              </ul>
              <p className="purchase-money__note">
                Chốt lại theo cân đo thật tại kho Việt Nam — bạn trả phần này ở bước tất toán.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {stopped && quotation ? (
        <p className="purchase-money__note">
          Đơn đã dừng nên phần tạm tính (cước quốc tế, thuế nhập khẩu) không thu. Tiền bạn đã trả được
          hoàn theo mục Tiền hoàn bên dưới.
        </p>
      ) : null}

      {quotation && !stopped && toNumber(quotation.vat) > 0 ? (
        <p className="purchase-money__note">
          VAT {hasValue(quotation.vatRate) ? `${toNumber(quotation.vatRate)}% ` : ""}
          tổng cộng {formatVnd(quotation.vat)}, đã chia vào hai phần trên (phần phí trả trước, phần cước thu ở VN).
        </p>
      ) : null}

      {quotation?.depositDescription && legacy ? (
        <p className="purchase-money__note">{quotation.depositDescription}</p>
      ) : null}

      {payments.length ? (
        <div className="purchase-money__payments">
          <h4>Các khoản thanh toán</h4>
          <ul>
            {payments.map((payment, index) => {
              const meta = paymentStatusMeta(payment.status);
              const time = formatTime(payment.paidAt || payment.createdAt);

              return (
                <li key={payment.paymentId || payment.orderCode || index}>
                  <div className="purchase-money__payment-main">
                    <strong>{getPurchasePaymentLabel(payment.paymentType)}</strong>
                    <span>
                      {[payment.orderCode ? `Mã ${payment.orderCode}` : "", time].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="purchase-money__payment-side">
                    <b>{formatVnd(payment.amount)}</b>
                    <Tag color={meta.color}>{meta.text}</Tag>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}
