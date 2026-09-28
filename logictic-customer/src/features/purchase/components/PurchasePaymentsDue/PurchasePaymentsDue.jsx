/**
 * "Thanh toán → Cần thanh toán", phần MUA HỘ: khoản trả trước và phần chênh giá đang chờ khách.
 *
 * Trước đây tab này chỉ có tất toán vận chuyển (đơn kho) — khách đã chấp nhận báo giá mua
 * hộ mà chưa trả, hoặc đã đồng ý phần chênh giá, không thấy khoản đó ở chỗ "tôi đang phải
 * trả gì". Dữ liệu thật, không tự tính:
 *   GET /api/customers/me/dashboard          → danh sách khoản mua hộ chưa trả (PAYMENT_DUE)
 *   GET /api/purchase-requests/{id}/payments → link + mã giao dịch của đúng khoản đang chờ
 * "Thanh toán ngay" mở lại link của khoản đó (openCheckout), không tạo khoản mới.
 * Không có khoản nào thì khối ẩn hẳn.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@mui/material";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";

/* Import sâu có chủ đích: barrel kéo theo các trang (thứ tự CSS). */
import {
  ACTION_KEYS,
  ITEM_KINDS,
  getCustomerDashboardApi,
} from "@features/dashboard/api/dashboardApi";
import {
  getPaymentCheckoutUrl,
  getPurchaseRequestPaymentHistoryApi,
} from "@features/purchase/api/purchaseRequestApi";
import {
  PURCHASE_PAYMENT_TYPES,
  buildPurchaseDueRows,
} from "@features/purchase/utils/purchasePayments";
import { openCheckout } from "@features/payment/utils/openCheckout";
import {
  PAYMENT_PURPOSES,
  PAYMENT_SUBJECTS,
} from "@features/payment/utils/pendingPaymentReturn";
import {
  PURCHASE_ORDERS_PATH,
  purchaseRequestDetailPath,
  purchaseRequestQuotationPath,
} from "@features/orders/constants/orderPaths";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";

import "./PurchasePaymentsDue.css";

const formatMoney = (value) => `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
};

const isPrepay = (row) =>
  row.paymentType === PURCHASE_PAYMENT_TYPES.prepayment ||
  row.paymentType === PURCHASE_PAYMENT_TYPES.legacyDeposit ||
  row.paymentType === PURCHASE_PAYMENT_TYPES.legacyFull;

/* Khoản trả trước nằm ở màn báo giá; phần chênh nằm ở khối "Đơn mua NCC" của chi tiết đơn. */
const rowPath = (row) =>
  isPrepay(row) ? purchaseRequestQuotationPath(row.requestId) : purchaseRequestDetailPath(row.requestId);

const checkoutUrlOf = (payment) =>
  getPaymentCheckoutUrl({
    checkoutUrl: payment?.checkoutUrl,
    orderCode: payment?.paymentMethod === "PAYOS" ? "" : payment?.orderCode,
  });

const EMPTY = { key: -1, rows: [], hiddenCount: 0, error: "" };

const RELOAD_MIN_GAP_MS = 10 * 1000;

const loadPurchaseDue = async (signal) => {
  const board = await getCustomerDashboardApi({ signal });
  const action = board.actions.find((item) => item.key === ACTION_KEYS.paymentDue);
  const purchaseItems = (action?.items || []).filter((item) => item.kind === ITEM_KINDS.purchase);
  /*
   * Tất toán vận chuyển của đơn kho PUR-xxx-n cũng là kind PURCHASE (có warehouseOrderId) nhưng trả
   * theo luồng tất toán đơn kho ở khối riêng — khối này chỉ lo trả trước / phần chênh của yêu cầu.
   */
  const dueItems = purchaseItems.filter((item) => !item.warehouseOrderId);

  const requestIds = [...new Set(dueItems.map((item) => item.id).filter(Boolean))];
  const histories = await Promise.allSettled(
    requestIds.map((id) => getPurchaseRequestPaymentHistoryApi(id, { signal })),
  );

  const historyByRequestId = new Map(
    requestIds.map((id, index) => [
      id,
      histories[index].status === "fulfilled" ? histories[index].value : null,
    ]),
  );

  return {
    rows: buildPurchaseDueRows(dueItems, historyByRequestId),
    /* Bảng việc chỉ trả vài dòng mẫu mỗi việc: còn khoản mua hộ nữa thì chỉ lối sang danh sách. */
    hiddenCount: Math.max(0, (action?.purchaseCount || 0) - purchaseItems.length),
  };
};

export default function PurchasePaymentsDue() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState(EMPTY);
  const lastLoadAtRef = useRef(0);

  const loading = state.key !== reloadKey;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    loadPurchaseDue(signal)
      .then(({ rows, hiddenCount }) => {
        if (signal.aborted) return;
        lastLoadAtRef.current = Date.now();
        setState({ key: reloadKey, rows, hiddenCount, error: "" });
      })
      .catch((error) => {
        if (signal.aborted || isCanceledError(error)) return;
        setState({
          key: reloadKey,
          rows: [],
          hiddenCount: 0,
          error: getApiErrorMessage(error, "Không tải được khoản mua hộ chờ thanh toán."),
        });
      });

    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  /* Trả ở tab SePay xong quay lại tab này → tải lại để khoản vừa trả biến mất
     (bảng việc đọc nhiều bảng — không tải lại dồn dập khi khách chuyển tab liên tục). */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadAtRef.current < RELOAD_MIN_GAP_MS) return;
      reload();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const pay = (row) => {
    const opened = openCheckout(checkoutUrlOf(row.payment), {
      subject: PAYMENT_SUBJECTS.purchaseRequest,
      targetId: row.requestId,
      purpose: isPrepay(row)
        ? PAYMENT_PURPOSES.purchasePrepay
        : PAYMENT_PURPOSES.purchasePriceDifference,
      orderCode: row.payment?.orderCode,
      code: row.code,
      amount: row.amount,
    });

    if (!opened) {
      AuthNotify.error(
        "Không mở được trang thanh toán",
        "Khoản này chưa có link thanh toán. Mở đơn để xem chi tiết hoặc liên hệ CSKH.",
      );
    }
  };

  if (loading || (!state.error && state.rows.length === 0 && state.hiddenCount === 0)) {
    return null;
  }

  if (state.error) {
    return (
      <section className="purchase-due purchase-due--error">
        <span>{state.error}</span>
        <Button size="small" variant="outlined" onClick={reload}>
          Tải lại
        </Button>
      </section>
    );
  }

  return (
    <section className="purchase-due" aria-labelledby="purchase-due-title">
      <header className="purchase-due__head">
        <h2 id="purchase-due-title">Đơn mua hộ chờ bạn thanh toán</h2>
        <p>Khoản trả trước sau khi chấp nhận báo giá và phần chênh giá bạn đã đồng ý.</p>
      </header>

      <div className="purchase-due__list">
        {state.rows.map((row) => {
          const checkoutUrl = row.payment ? checkoutUrlOf(row.payment) : "";
          const canPay = !row.verifying && Boolean(checkoutUrl);

          return (
            <article key={row.key} className="purchase-due__card">
              <div className="purchase-due__top">
                <div>
                  <span className="purchase-due__kind">Đơn mua hộ · {row.label}</span>
                  <strong>{row.code || "—"}</strong>
                </div>
                <span className={`purchase-due__badge ${row.verifying ? "" : "is-due"}`}>
                  {row.verifying ? "VCL đang đối soát" : "Chờ bạn thanh toán"}
                </span>
              </div>

              {row.payment?.orderCode || row.createdAt ? (
                <p className="purchase-due__meta">
                  {row.payment?.orderCode ? <>Mã GD {row.payment.orderCode}</> : null}
                  {row.payment?.orderCode && row.createdAt ? " · " : null}
                  {row.createdAt ? `tạo lúc ${formatDateTime(row.createdAt)}` : null}
                </p>
              ) : null}

              <div className="purchase-due__foot">
                <div className="purchase-due__amount">
                  <span>{row.verifying ? "Đã báo chuyển" : "Cần trả"}</span>
                  <strong>{formatMoney(row.amount)}</strong>
                </div>

                <div className="purchase-due__actions">
                  <Button variant="outlined" onClick={() => navigate(rowPath(row))}>
                    Xem đơn
                  </Button>
                  {canPay && (
                    <Button
                      variant="contained"
                      startIcon={<PaidRoundedIcon />}
                      onClick={() => pay(row)}
                    >
                      Thanh toán ngay
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {state.hiddenCount > 0 && (
        <p className="purchase-due__more">
          Còn {state.hiddenCount} khoản mua hộ khác chờ thanh toán.{" "}
          <button
            type="button"
            onClick={() => navigate(PURCHASE_ORDERS_PATH)}
          >
            Xem danh sách đơn mua hộ
          </button>
        </p>
      )}
    </section>
  );
}
