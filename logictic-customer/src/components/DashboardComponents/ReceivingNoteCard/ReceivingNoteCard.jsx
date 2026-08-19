import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck,
  FileText,
  Printer,
  TriangleAlert,
  X,
} from "lucide-react";

import { getMyReceivingNoteApi } from "../../../api/OrderApi/receivingNoteApi";
import ReceivingNoteDocument, { getReceivingStatusMeta } from "./ReceivingNoteDocument";
import "./ReceivingNoteCard.css";

/**
 * Khối tóm tắt phiếu tiếp nhận kho + nút mở phiếu đầy đủ dạng dialog.
 *
 * Tự gọi API và tự ẩn khi đơn chưa có phiếu, nên nơi dùng chỉ cần một dòng
 * `<ReceivingNoteCard orderId={...} />`.
 *
 * Ngoài màn hình chỉ để lại đúng thứ khách liếc là hiểu — kho nào, tới đâu, có lệch không.
 * Bảng đối chiếu chi tiết nằm trong phiếu, mở ra khi cần chứ không đổ hết ra trang.
 */

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

const STATUS_DESC = {
  ACTIVE: "Kho đã có phiếu và đang chờ hàng của bạn tới nơi.",
  PARTIALLY_RECEIVED: "Một phần hàng đã tới kho, phần còn lại đang trên đường.",
  RECEIVED: "Kho đã cân đếm thực tế, đang chờ bộ phận vận hành duyệt.",
  APPROVED: "Hàng của bạn đã chính thức vào kho và được xếp lên kệ.",
};

export default function ReceivingNoteCard({ orderId }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await getMyReceivingNoteApi(orderId, { signal: controller.signal });
        if (mounted) setNote(data);
      } catch {
        // Request bị huỷ khi rời trang — không phải lỗi cần báo.
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [orderId]);

  // Mở dialog thì khoá cuộn nền, và cho phím Esc đóng như mọi hộp thoại khác.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handlePrint = useCallback(() => window.print(), []);

  if (loading || !note) return null;

  const meta = getReceivingStatusMeta(note.status);
  const desc = STATUS_DESC[String(note.status || "").toUpperCase()] || "";
  const checkedCount = Array.isArray(note.items) ? note.items.length : 0;
  const declaredCount = Array.isArray(note.expectedItems) ? note.expectedItems.length : 0;

  return (
    <>
      <section className="rnc-card">
        <header className="rnc-head">
          <div className="rnc-head__icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="rnc-head__text">
            <h3>Phiếu tiếp nhận kho</h3>
            <p>Hệ thống tự lập khi đơn của bạn được thanh toán</p>
          </div>
          <span className={`rnc-pill rnc-pill--${meta.tone}`}>{meta.label}</span>
        </header>

        <div className="rnc-meta">
          <div className="rnc-meta__item">
            <span>Mã phiếu</span>
            <strong>{note.receivingNoteCode || "—"}</strong>
          </div>
          <div className="rnc-meta__item">
            <span>Kho tiếp nhận</span>
            <strong>{note.warehouseName || "—"}</strong>
          </div>
          <div className="rnc-meta__item">
            <span>Lập lúc</span>
            <strong>{formatDateTime(note.createdAt)}</strong>
          </div>
          <div className="rnc-meta__item">
            <span>Dòng hàng</span>
            <strong>
              {checkedCount > 0
                ? `${checkedCount} dòng đã đối chiếu`
                : `${declaredCount} dòng khai báo`}
            </strong>
          </div>
        </div>

        {desc ? <p className="rnc-desc">{desc}</p> : null}

        {note.hasDiscrepancy ? (
          <div className="rnc-warn">
            <TriangleAlert size={16} />
            <span>
              Số kho đếm được có chênh lệch so với khai báo. Mở phiếu để xem chi tiết từng dòng
              hàng — nhân viên sẽ liên hệ với bạn trước khi xử lý tiếp.
            </span>
          </div>
        ) : null}

        <div className="rnc-actions">
          <button type="button" className="rnc-btn rnc-btn--primary" onClick={() => setOpen(true)}>
            <FileText size={16} /> Xem phiếu
          </button>
        </div>
      </section>

      {/* Bắt buộc render qua portal: layout dashboard đặt backdrop-filter lên <main>, mà thuộc
          tính đó tạo containing block mới cho position:fixed — để nguyên tại chỗ thì dialog bị
          giam trong cột nội dung thay vì phủ kín màn hình. */}
      {open
        ? createPortal(
        <div
          className="rnc-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Phiếu tiếp nhận kho"
          onMouseDown={(event) => {
            // Chỉ đóng khi bấm ra nền, không đóng khi kéo chọn chữ trong phiếu rồi nhả tay ngoài.
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="rnc-modal__box">
            <div className="rnc-modal__bar">
              <strong>Phiếu tiếp nhận kho</strong>
              <div className="rnc-modal__tools">
                <button type="button" className="rnc-btn" onClick={handlePrint}>
                  <Printer size={16} /> In phiếu
                </button>
                <button
                  type="button"
                  className="rnc-icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng phiếu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="rnc-modal__body">
              <ReceivingNoteDocument note={note} />
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}
