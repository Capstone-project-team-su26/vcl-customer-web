/* =========================================================
   PaymentReturnBanner — "Giao dịch vừa thực hiện" ở đầu Thanh toán → Lịch sử giao dịch.

   Khách vừa trả xong (hoặc bấm Huỷ) ở trang QR SePay / payOS thì được đưa về đây, URL
   kèm `?orderCode=<mã>&status=success|cancelled` (xem pendingPaymentReturn.js).
   status=cancelled (hoặc payOS báo huỷ):
     - có bản ghi khớp mã → đưa khách về đúng chỗ trả tiền của đơn, kèm thông báo;
     - không có           → báo "Đã huỷ thanh toán" tại chỗ kèm mã giao dịch.
   Còn lại (status=success, hoặc URL cũ chỉ có bản ghi) hỏi GET /api/payments/status/{orderCode}:
     - PAID               → báo đã nhận tiền, "Xem đơn" về đúng chi tiết đơn (tô sẵn giao
                            dịch đó ở tab Thanh toán của đơn kho), làm mới danh sách bên dưới;
     - PENDING            → "Đang chờ ngân hàng xác nhận", tự hỏi lại mỗi 4 giây tối đa 2
                            phút (webhook SePay trễ vài giây–phút) — khách không tưởng mất tiền;
     - hết 2 phút vẫn chờ → nói rõ hai khả năng + nút "Kiểm tra lại" / "Quay lại đơn";
     - huỷ / thất bại     → đưa khách về đúng chỗ trả tiền của đơn, kèm thông báo.
   Xử lý xong thì dọn `orderCode`/`status` + query payOS khỏi URL (F5 không xử lý lại),
   giữ `?loai=`.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Space, Spin } from "antd";

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { formatVnd } from "@shared/utils/formatNumber";
import { getConsignmentPaymentStatusApi } from "@features/consignment/api/consignmentApi";
import {
  clearPendingConsignmentPayment,
  pollConsignmentPaymentStatus,
  stripPayOsReturnParams,
} from "@features/payment/utils/consignmentPaymentReturn";
import {
  clearPendingPayment,
  getPaymentPurposeLabel,
  getPendingPaymentOrderPath,
} from "@features/payment/utils/pendingPaymentReturn";

import "./PaymentReturnBanner.css";

const PHASES = Object.freeze({
  idle: "idle",
  checking: "checking",
  waiting: "waiting",
  timeout: "timeout",
  paid: "paid",
  failed: "failed",
  cancelled: "cancelled",
});

const forgetPending = () => {
  clearPendingPayment();
  clearPendingConsignmentPayment();
};

/**
 * @param {{ context: ReturnType<typeof import("@features/payment/utils/pendingPaymentReturn").resolvePaymentReturn>,
 *   onPaid?: () => void }} props
 */
export default function PaymentReturnBanner({ context, onPaid }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { pending, orderCode, cancelled, hasReturnParams, fromPaymentReturn } = context || {};

  const retryPath = getPendingPaymentOrderPath(pending, { retry: true });

  const [phase, setPhase] = useState(() => {
    if (!fromPaymentReturn) return PHASES.idle;

    /* Huỷ mà không biết đơn nào (không có bản ghi khớp mã): báo ngay tại đây. */
    if (cancelled) return retryPath ? PHASES.idle : PHASES.cancelled;

    return orderCode ? PHASES.checking : PHASES.idle;
  });
  const [payment, setPayment] = useState(null);
  const [pollRound, setPollRound] = useState(0);

  /* Vòng hỏi trạng thái sống qua nhiều lần render: đọc onPaid mới nhất qua ref. */
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const purposeLabel = getPaymentPurposeLabel(pending?.purpose);
  const orderLabel = pending?.code ? ` đơn ${pending.code}` : "";
  const amount = payment?.amount ?? pending?.amount;
  const amountLabel = Number(amount) > 0 ? ` ${formatVnd(amount)}` : "";
  const orderPath = getPendingPaymentOrderPath(pending);

  /* Dọn `orderCode`/`status` của backend + query payOS khỏi URL một lần (F5 không xử lý
     lại); giữ `?loai=`. Khi huỷ có bản ghi khớp thì effect dưới chuyển trang luôn. */
  useEffect(() => {
    if (!hasReturnParams || (cancelled && retryPath)) return;

    navigate(
      {
        pathname: location.pathname,
        search: stripPayOsReturnParams(location.search),
        hash: location.hash,
      },
      { replace: true, state: location.state },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lúc mở trang
  }, []);

  /* Khách bấm Huỷ ở trang thanh toán (status=cancelled / payOS cancel=true): có bản ghi
     khớp mã thì về đúng chỗ trả tiền của đơn; không thì banner báo huỷ tại chỗ. */
  useEffect(() => {
    if (!fromPaymentReturn || !cancelled || !retryPath) return;

    forgetPending();

    AuthNotify.info(
      "Đã huỷ thanh toán",
      `Bạn đã huỷ thanh toán ${purposeLabel}${orderLabel}. Bạn có thể thanh toán lại ngay trong đơn.`,
    );

    navigate(retryPath, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lúc mở trang
  }, []);

  useEffect(() => {
    if (!fromPaymentReturn || cancelled || !orderCode) return undefined;

    return pollConsignmentPaymentStatus({
      orderCode,
      fetchStatus: getConsignmentPaymentStatusApi,
      onTick: ({ outcome, payment: current }) => {
        setPayment(current || null);

        if (outcome === "pending") {
          setPhase(PHASES.waiting);
        }
      },
      onDone: ({ outcome, payment: current }) => {
        if (current) setPayment(current);

        if (outcome === "paid") {
          forgetPending();
          setPhase(PHASES.paid);

          AuthNotify.success(
            "Thanh toán thành công",
            `VCL đã nhận${amountLabel} (${purposeLabel}${orderLabel}).`,
          );

          onPaidRef.current?.();
          return;
        }

        if (outcome === "failed") {
          forgetPending();

          AuthNotify.warning(
            "Thanh toán chưa thành công",
            `Giao dịch ${purposeLabel}${orderLabel} không thành công hoặc đã bị huỷ. Vui lòng thanh toán lại trong đơn.`,
          );

          if (retryPath) {
            navigate(retryPath, { replace: true });
          } else {
            setPhase(PHASES.failed);
          }
          return;
        }

        if (outcome === "not_found") {
          forgetPending();
          setPhase(PHASES.idle);
          return;
        }

        /* Hết giờ mà vẫn PENDING: giữ khoản chờ để lần mở sau còn kiểm tiếp. */
        setPhase(PHASES.timeout);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chạy lại khi khách bấm "Kiểm tra lại"
  }, [pollRound]);

  const handleRecheck = useCallback(() => {
    setPhase(PHASES.checking);
    setPollRound((value) => value + 1);
  }, []);

  if (phase === PHASES.idle) return null;

  const viewOrderButton = orderPath ? (
    <Button type="primary" onClick={() => navigate(orderPath)}>
      Xem đơn
    </Button>
  ) : null;

  const retryButton = retryPath ? (
    <Button onClick={() => navigate(retryPath)}>Quay lại đơn để thanh toán</Button>
  ) : null;

  const transactionMeta = orderCode ? (
    <span className="payment-return-banner__meta">
      Mã giao dịch: <strong>{orderCode}</strong>
      {amountLabel ? (
        <>
          {" · "}Số tiền: <strong>{amountLabel.trim()}</strong>
        </>
      ) : null}
    </span>
  ) : null;

  const byPhase = {
    [PHASES.checking]: {
      type: "info",
      icon: <Spin size="small" />,
      title: `Đang kiểm tra giao dịch ${purposeLabel}${orderLabel}…`,
      description: transactionMeta,
      action: null,
    },
    [PHASES.waiting]: {
      type: "info",
      icon: <Spin size="small" />,
      title: `Đang chờ ngân hàng xác nhận ${purposeLabel}${orderLabel}`,
      description: (
        <>
          {transactionMeta}
          <span>
            Ngân hàng thường báo về trong vài giây đến vài phút. Nếu bạn đã chuyển khoản, tiền
            không mất — trang này tự cập nhật, bạn không cần chuyển lại.
          </span>
        </>
      ),
      action: (
        <Space orientation="vertical" size={6}>
          {viewOrderButton}
          {retryButton}
        </Space>
      ),
    },
    [PHASES.timeout]: {
      type: "warning",
      icon: undefined,
      title: `Chưa nhận được xác nhận ${purposeLabel}${orderLabel}`,
      description: (
        <>
          {transactionMeta}
          <span>
            Nếu bạn ĐÃ chuyển khoản: khoản này sẽ tự chuyển sang &quot;Đã thanh toán&quot; khi
            ngân hàng báo về, đừng chuyển lại. Nếu bạn CHƯA chuyển khoản: quay lại đơn để thanh
            toán.
          </span>
        </>
      ),
      action: (
        <Space orientation="vertical" size={6}>
          <Button type="primary" onClick={handleRecheck}>
            Kiểm tra lại
          </Button>
          {retryButton}
        </Space>
      ),
    },
    [PHASES.paid]: {
      type: "success",
      icon: undefined,
      title: `Đã thanh toán ${purposeLabel}${orderLabel}`,
      description: (
        <>
          {transactionMeta}
          <span>VCL đã nhận tiền. Trạng thái đơn đang được cập nhật.</span>
        </>
      ),
      action: viewOrderButton,
    },
    [PHASES.failed]: {
      type: "error",
      icon: undefined,
      title: `Thanh toán ${purposeLabel} chưa thành công`,
      description: transactionMeta,
      action: retryButton,
    },
    [PHASES.cancelled]: {
      type: "warning",
      icon: undefined,
      title: "Đã huỷ thanh toán",
      description: (
        <>
          {transactionMeta}
          <span>
            Bạn đã huỷ giao dịch này. Khi sẵn sàng, mở lại đơn trong danh sách bên dưới để
            thanh toán.
          </span>
        </>
      ),
      action: null,
    },
  };

  const view = byPhase[phase];

  return (
    <section
      className="payment-return-banner"
      aria-live="polite"
      data-phase={phase}
    >
      <span className="payment-return-banner__eyebrow">GIAO DỊCH VỪA THỰC HIỆN</span>
      <Alert
        showIcon
        type={view.type}
        icon={view.icon}
        title={view.title}
        description={<div className="payment-return-banner__body">{view.description}</div>}
        action={view.action}
      />
    </section>
  );
}
