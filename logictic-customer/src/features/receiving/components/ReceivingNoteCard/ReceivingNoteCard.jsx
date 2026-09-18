import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Printer,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  getMyReceivingNoteApi,
  toPublicReceiptUrl,
} from "@features/receiving/api/receivingNoteApi";
import ReceivingNoteDocument, { getReceivingStatusMeta } from "@features/receiving/components/ReceivingNoteDocument/ReceivingNoteDocument";
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
  PENDING_APPROVAL:
    "Nhân viên kinh doanh đã lập phiếu, đang chờ quản lý kho duyệt. Duyệt xong bạn sẽ tải được phiếu PDF để mang tới kho.",
  ACTIVE: "Phiếu đã được duyệt. Tải phiếu, in hoặc lưu trên điện thoại rồi mang cùng hàng tới kho.",
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
  const isActive = String(note.status || "").toUpperCase() === "ACTIVE";
  /* Chỉ phiếu ACTIVE mới có PDF hợp lệ; link server trả còn host cũ nên phải đổi. */
  const pdfViewUrl = isActive ? toPublicReceiptUrl(note.receiptPdfUrl) : null;
  const pdfDownloadUrl = isActive
    ? toPublicReceiptUrl(note.receiptPdfUrl, { download: true })
    : null;

  return (
    <>
      <section className="rnc-card">
        <header className="rnc-head">
          <div className="rnc-head__icon">
            <ClipboardCheck size={20} />
          </div>
          <div className="rnc-head__text">
            <h3>Phiếu tiếp nhận kho</h3>
            <p>Mang phiếu này cùng hàng tới kho để kho nhận hàng</p>
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

        {isActive ? (
          <div className="rnc-guide">
            <strong>Mang phiếu + hàng tới: {note.warehouseName || "kho nhận hàng"}</strong>
            <span>
              Kho quét mã {note.receivingNoteCode || "WRN-"} trên phiếu để nhận hàng. Mỗi kiện cần
              đúng thùng gỗ và dịch vụ như đã khai trên đơn.
            </span>
          </div>
        ) : null}

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
          {pdfDownloadUrl ? (
            <a className="rnc-btn rnc-btn--primary" href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Download size={16} /> Tải phiếu nhập kho (PDF)
            </a>
          ) : null}
          {pdfViewUrl ? (
            <a className="rnc-btn" href={pdfViewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Mở PDF
            </a>
          ) : null}
          <button
            type="button"
            className={`rnc-btn${pdfDownloadUrl ? "" : " rnc-btn--primary"}`}
            onClick={() => setOpen(true)}
          >
            <FileText size={16} /> Xem chi tiết phiếu
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
