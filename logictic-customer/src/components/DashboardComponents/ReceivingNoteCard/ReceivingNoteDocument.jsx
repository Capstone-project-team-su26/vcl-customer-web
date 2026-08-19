import React from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";

import "./ReceivingNoteDocument.css";

/**
 * Phiếu tiếp nhận kho dựng theo dạng chứng từ giấy.
 *
 * Tách riêng khỏi dialog để dùng lại được ở cả trang phiếu độc lập lẫn bản in — `window.print()`
 * chỉ in đúng khối này nhờ `@media print` trong file CSS đi kèm.
 *
 * Nguồn dữ liệu là phiếu THẬT từ `/api/warehouse-receiving-notes/my-order/{orderId}`, không phải
 * suy từ đơn hàng — nên số liệu ở đây đúng bằng số kho cân đếm.
 */

const STATUS_META = {
  ACTIVE: { label: "Chờ kho nhận hàng", tone: "wait" },
  PARTIALLY_RECEIVED: { label: "Kho đã nhận một phần", tone: "progress" },
  RECEIVED: { label: "Kho đã kiểm đếm xong", tone: "progress" },
  APPROVED: { label: "Đã nhập kho", tone: "done" },
};

export const getReceivingStatusMeta = (status) =>
  STATUS_META[String(status || "").toUpperCase()] || {
    label: status || "Đang xử lý",
    tone: "wait",
  };

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

const formatNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("vi-VN") : "—";
};

function Diff({ value, suffix = "" }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) {
    return <span className="rnd-diff rnd-diff--none">—</span>;
  }
  return (
    <span className={`rnd-diff ${number < 0 ? "rnd-diff--short" : "rnd-diff--over"}`}>
      {number > 0 ? "+" : ""}
      {formatNumber(number)}
      {suffix}
    </span>
  );
}

export default function ReceivingNoteDocument({ note }) {
  if (!note) return null;

  const meta = getReceivingStatusMeta(note.status);
  const lines = Array.isArray(note.items) ? note.items : [];
  const expected = Array.isArray(note.expectedItems) ? note.expectedItems : [];
  const checked = lines.length > 0;

  const totalDeclared = checked
    ? lines.reduce((sum, i) => sum + (Number(i.declaredQuantity) || 0), 0)
    : expected.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const totalActual = lines.reduce((sum, i) => sum + (Number(i.actualQuantity) || 0), 0);
  const totalActualWeight = lines.reduce((sum, i) => sum + (Number(i.actualWeight) || 0), 0);

  return (
    <article className="rnd-doc" id="receiving-note-document">
      <header className="rnd-doc__head">
        <div className="rnd-brand">
          <span className="rnd-brand__mark">VCL</span>
          <div>
            <strong>VIETNAM LOGISTICS</strong>
            <small>Cross-border Warehouse System</small>
          </div>
        </div>
        <div className="rnd-title">
          <span>WAREHOUSE RECEIVING NOTE</span>
          <h2>PHIẾU TIẾP NHẬN KHO</h2>
          <strong>{note.receivingNoteCode || "—"}</strong>
        </div>
      </header>

      <div className="rnd-statusbar">
        <span className={`rnd-pill rnd-pill--${meta.tone}`}>{meta.label}</span>
        {note.hasDiscrepancy ? (
          <span className="rnd-pill rnd-pill--warn">
            <TriangleAlert size={13} /> Có chênh lệch so với khai báo
          </span>
        ) : null}
      </div>

      <section className="rnd-grid">
        <div>
          <span>Đơn ký gửi</span>
          <strong>{note.consignmentCode || "—"}</strong>
        </div>
        <div>
          <span>Kho tiếp nhận</span>
          <strong>{note.warehouseName || "—"}</strong>
        </div>
        <div>
          <span>Khách hàng</span>
          <strong>{note.customerName || "—"}</strong>
        </div>
        <div>
          <span>Điện thoại</span>
          <strong>{note.customerPhone || "—"}</strong>
        </div>
        <div>
          <span>Tuyến vận chuyển</span>
          <strong>{note.route || "—"}</strong>
        </div>
        <div>
          <span>Ngày lập phiếu</span>
          <strong>{formatDateTime(note.createdAt)}</strong>
        </div>
      </section>

      <h3 className="rnd-section-title">
        {checked ? "Biên bản đối chiếu khai báo với thực tế" : "Hàng hoá theo khai báo trên đơn"}
      </h3>

      <div className="rnd-table-wrap">
        {checked ? (
          <table className="rnd-table">
            <thead>
              <tr>
                <th className="rnd-col-idx">#</th>
                <th>Tên hàng</th>
                <th>Loại</th>
                <th className="rnd-num">SL khai</th>
                <th className="rnd-num">SL thực</th>
                <th className="rnd-num">Lệch</th>
                <th className="rnd-num">KG khai</th>
                <th className="rnd-num">KG thực</th>
                <th className="rnd-num">Lệch KG</th>
                <th>Ghi chú kho</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id || `${line.productName}-${index}`}>
                  <td className="rnd-col-idx">{index + 1}</td>
                  <td className="rnd-strong">{line.productName || "—"}</td>
                  <td>{line.productType || "—"}</td>
                  <td className="rnd-num">{formatNumber(line.declaredQuantity)}</td>
                  <td className="rnd-num rnd-strong">{formatNumber(line.actualQuantity)}</td>
                  <td className="rnd-num">
                    <Diff value={line.quantityDifference} />
                  </td>
                  <td className="rnd-num">{formatNumber(line.declaredWeight)}</td>
                  <td className="rnd-num">{formatNumber(line.actualWeight)}</td>
                  <td className="rnd-num">
                    <Diff value={line.weightDifference} suffix=" kg" />
                  </td>
                  <td className="rnd-note">{line.note || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Tổng cộng</td>
                <td className="rnd-num">{formatNumber(totalDeclared)}</td>
                <td className="rnd-num rnd-strong">{formatNumber(totalActual)}</td>
                <td className="rnd-num">
                  <Diff value={totalActual - totalDeclared} />
                </td>
                <td className="rnd-num">—</td>
                <td className="rnd-num rnd-strong">{formatNumber(totalActualWeight)}</td>
                <td className="rnd-num">—</td>
                <td />
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="rnd-table">
            <thead>
              <tr>
                <th className="rnd-col-idx">#</th>
                <th>Tên hàng</th>
                <th>Loại</th>
                <th className="rnd-num">Số lượng khai</th>
              </tr>
            </thead>
            <tbody>
              {expected.length === 0 ? (
                <tr>
                  <td colSpan={4} className="rnd-empty">
                    Đơn chưa có dòng hàng khai báo.
                  </td>
                </tr>
              ) : (
                expected.map((line, index) => (
                  <tr key={`${line.productName}-${index}`}>
                    <td className="rnd-col-idx">{index + 1}</td>
                    <td className="rnd-strong">{line.productName || "—"}</td>
                    <td>{line.productType || "—"}</td>
                    <td className="rnd-num">{formatNumber(line.quantity)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Tổng cộng</td>
                <td className="rnd-num rnd-strong">{formatNumber(totalDeclared)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {!checked ? (
        <div className="rnd-notice">
          <CircleAlert size={15} />
          <span>
            Kho chưa cân đếm. Khi hàng tới nơi, số thực tế và phần chênh lệch sẽ được điền vào
            chính phiếu này.
          </span>
        </div>
      ) : null}

      <section className="rnd-sign">
        <div>
          <span>Kho tiếp nhận</span>
          <em>{checked ? "Đã cân đếm và ký xác nhận" : "Chưa nhận hàng"}</em>
          <i />
        </div>
        <div>
          <span>Bộ phận vận hành duyệt</span>
          <em>
            {note.approvedByName
              ? `${note.approvedByName} · ${formatDateTime(note.approvedAt)}`
              : "Chưa duyệt"}
          </em>
          <i />
        </div>
      </section>

      <footer className="rnd-foot">
        Phiếu do hệ thống VCL tự lập khi đơn ký gửi được thanh toán. Mọi số liệu trên phiếu là số
        kho ghi nhận tại thời điểm tiếp nhận hàng.
      </footer>
    </article>
  );
}
