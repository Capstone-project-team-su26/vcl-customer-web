/**
 * Khối "TIỀN HOÀN" trong màn chi tiết yêu cầu mua hộ của KHÁCH.
 *
 * Trả lời ba câu khách hay hỏi nhất về tiền đi ngược:
 *   1. Tôi đã trả bao nhiêu, đã được hoàn bao nhiêu, còn bao nhiêu đang chờ?
 *   2. Vì sao được hoàn (người bán hết hàng, giao thiếu, tôi huỷ đơn, chênh giá…)?
 *   3. Khoản đó tính thế nào — từng sản phẩm, từng thành phần, công thức?
 *
 * MỌI con số đọc thẳng từ GET /api/purchase-requests/{id}/refunds — khối này KHÔNG tự cộng trừ gì
 * (kể cả "đã trả − đã hoàn"): số trên màn khách phải trùng từng đồng với số kế toán đang thấy.
 *
 * Máy chủ chưa có API (production hiện tại, 404) hoặc chưa có khoản hoàn nào → khối tự ẩn hẳn,
 * không để lại tiêu đề rỗng.
 */
import { useEffect, useState } from "react";
import { Alert, Button, Tag } from "antd";

import { getPurchaseRefundsApi } from "@features/purchase/api/purchaseOrderApi";

import "./PurchaseRefundPanel.css";

const formatVnd = (value) => `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} ₫`;

const formatDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
};

/*
 * Thành phần của một dòng, chỉ hiện phần có tiền. Phí huỷ là khoản bị TRỪ (backend trả số dương
 * "đã trừ") nên hiện kèm dấu trừ — đó là cách viết, không phải phép tính.
 */
const lineParts = (line) =>
  [
    { key: "goods", label: "Tiền hàng", value: line.goodsAmount },
    { key: "diff", label: "Chênh giá", value: line.priceDifferenceAmount },
    { key: "fee", label: "Phí mua hộ", value: line.serviceFeeAmount },
    { key: "vat", label: "VAT phí mua hộ", value: line.vatAmount },
    {
      key: "tax",
      label: line.importTaxInRefund ? "Thuế NK trả lại" : "Thuế NK không thu",
      value: line.importTaxAdjustment,
    },
    { key: "cancel", label: "Phí huỷ (trừ)", value: line.cancelFeeAmount, minus: true },
  ].filter((part) => Number(part.value) !== 0);

function RefundLine({ line }) {
  const parts = lineParts(line);

  return (
    <div className="refund-line">
      <div className="refund-line__head">
        <span>
          <b>{line.productName || "Sản phẩm"}</b>
          {line.quantity ? ` · ${line.quantity} × ${formatVnd(line.unitPrice)}` : ""}
        </span>
        <b>{formatVnd(line.amount)}</b>
      </div>

      <span className="refund-line__reason">{line.reasonText}</span>

      {parts.length > 0 && (
        <ul className="refund-line__parts">
          {parts.map((part) => (
            <li key={part.key} className={part.minus ? "is-minus" : ""}>
              <span>{part.label}</span>
              <b>
                {part.minus ? "− " : ""}
                {formatVnd(part.value)}
              </b>
            </li>
          ))}
        </ul>
      )}

      {/* Thuế NK phần hàng không tới tay bạn: tuỳ lúc tất toán mà trả lại ngay hay trừ trên hoá đơn cuối. */}
      {Number(line.importTaxAdjustment) !== 0 && (
        <span className="refund-line__note">
          {line.importTaxInRefund
            ? "Bạn đã trả thuế nhập khẩu cho phần hàng này nên được trả lại trong khoản hoàn."
            : "Thuế nhập khẩu của phần hàng này sẽ không thu khi bạn thanh toán đợt cuối (không cộng vào số hoàn)."}
        </span>
      )}

      {line.formula && (
        <span className="refund-line__formula">Cách tính: {line.formula}</span>
      )}
    </div>
  );
}

function RefundCard({ refund }) {
  const meta = [
    refund.purchaseOrderCode ? `Đơn mua ${refund.purchaseOrderCode}` : "",
    refund.createdAt ? `Lập lúc ${formatDateTime(refund.createdAt)}` : "",
    refund.refundedAt ? `Chuyển lúc ${formatDateTime(refund.refundedAt)}` : "",
    refund.transactionCode ? `Mã giao dịch ${refund.transactionCode}` : "",
  ].filter(Boolean);

  return (
    <article className="refund-card">
      <header className="refund-card__head">
        <div className="refund-card__title">
          <strong>{refund.reasonText}</strong>
          {meta.length > 0 && <p className="refund-card__meta">{meta.join(" · ")}</p>}
        </div>

        <div className="refund-card__amount">
          <strong>{formatVnd(refund.amount)}</strong>
          <Tag color={refund.statusText.tone}>{refund.statusText.label}</Tag>
        </div>
      </header>

      {refund.lines.length > 0 ? (
        refund.lines.map((line, index) => <RefundLine key={line.lineId || index} line={line} />)
      ) : (
        <p className="refund-card__meta">
          Khoản hoàn này được lập trước khi hệ thống ghi chi tiết theo sản phẩm — chỉ có tổng tiền.
        </p>
      )}
    </article>
  );
}

export default function PurchaseRefundPanel({ purchaseRequestId }) {
  const [state, setState] = useState({ key: "", data: null, error: false });
  const [reloadSeq, setReloadSeq] = useState(0);
  const loadKey = `${purchaseRequestId || ""}:${reloadSeq}`;

  /* Chỉ đặt state trong callback của promise — đặt thẳng trong thân effect là thừa một lượt render. */
  useEffect(() => {
    if (!purchaseRequestId) return undefined;

    const controller = new AbortController();

    getPurchaseRefundsApi(purchaseRequestId, { signal: controller.signal }).then(
      (data) => setState({ key: loadKey, data, error: false }),
      (error) => {
        if (error?.code === "ERR_CANCELED") return;
        setState({ key: loadKey, data: null, error: true });
      }
    );

    return () => controller.abort();
  }, [purchaseRequestId, loadKey]);

  if (state.key !== loadKey) return null;

  if (state.error) {
    return (
      <section className="purchase-detail-products-section">
        <Alert
          type="warning"
          showIcon
          message="Chưa tải được thông tin tiền hoàn"
          action={
            <Button size="small" onClick={() => setReloadSeq((value) => value + 1)}>
              Thử lại
            </Button>
          }
        />
      </section>
    );
  }

  const data = state.data;

  /*
   * Khoản đã huỷ (ví dụ khoản chênh giá được thay bằng khoản huỷ đơn) không còn là tiền của bạn —
   * backend cũng không tính nó vào tổng đã hoàn / đang chờ — nên không bày ra cho khách rối.
   */
  const visibleRefunds = (data?.refunds || []).filter((refund) => refund.status !== "CANCELLED");

  if (!data || visibleRefunds.length === 0) return null;

  return (
    <section className="purchase-detail-products-section">
      <div className="purchase-detail-section-header">
        <div>
          <h2>Tiền hoàn</h2>

          <p>
            Các khoản VCL trả lại bạn cho yêu cầu này: vì sao được hoàn, từng sản phẩm và cách tính.
            Khoản "đang chờ chuyển" sẽ được chuyển khoản và báo lại cho bạn.
          </p>
        </div>
      </div>

      <div className="refund-panel">
        <div className="refund-panel__totals">
          <div className="refund-panel__total">
            <span>Bạn đã trả</span>
            <strong>{formatVnd(data.totalCollected)}</strong>
          </div>
          <div className="refund-panel__total is-done">
            <span>Đã hoàn cho bạn</span>
            <strong>{formatVnd(data.totalRefunded)}</strong>
          </div>
          <div className="refund-panel__total is-pending">
            <span>Đang chờ hoàn</span>
            <strong>{formatVnd(data.totalPendingRefund)}</strong>
          </div>
        </div>

        {visibleRefunds.map((refund, index) => (
          <RefundCard key={refund.refundId || index} refund={refund} />
        ))}
      </div>
    </section>
  );
}
