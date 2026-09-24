/**
 * Khối "Đơn mua nhà cung cấp" trong màn chi tiết yêu cầu mua hộ của KHÁCH.
 *
 * Làm đúng hai việc khách cần:
 *   1. Khi giá mua thực vượt giá đã báo quá ngưỡng, hiện rõ chênh bao nhiêu, vì sao, và hai
 *      nút Đồng ý / Từ chối. Đồng ý xong hiện nút trả phần chênh.
 *   2. Theo dõi tiến độ người bán: đã đặt → người bán xác nhận → người bán gửi hàng
 *      (kèm mã vận đơn nội địa để khách tự tra).
 *
 * Không bày bất cứ thao tác nội bộ nào (lập đơn, duyệt ngân sách, đặt NCC) — đó là việc
 * của nhân viên và backend cũng chặn theo vai trò.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Spin, Tag, Typography } from "antd";

import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import {
  SUPPLIER_TIMELINE,
  decideSupplierOrderApi,
  getSupplierOrdersApi,
} from "@features/purchase/api/purchaseOrderApi";
import { getPaymentCheckoutUrl } from "@features/purchase/api/purchaseRequestApi";

import "./SupplierOrderPanel.css";

const { Text } = Typography;

const formatVnd = (value) => `${Math.round(Number(value) || 0).toLocaleString("vi-VN")} ₫`;

const formatDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
};

export default function SupplierOrderPanel({ purchaseRequestId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(purchaseRequestId));
  const [busyId, setBusyId] = useState("");

  /* Đổi số này là tải lại — dùng sau mỗi thao tác của khách. */
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => setReloadKey((key) => key + 1), []);

  /*
   * Chỉ đặt state trong callback của promise, không đặt thẳng trong thân effect: đặt thẳng
   * sẽ kéo theo một lượt render thừa ngay sau lượt đầu.
   */
  useEffect(() => {
    if (!purchaseRequestId) {
      return undefined;
    }

    let alive = true;

    getSupplierOrdersApi(purchaseRequestId)
      .then((rows) => {
        if (alive) setOrders(rows);
      })
      .catch(() => {
        /* Không chặn cả màn vì một khối phụ: lỗi ở đây chỉ làm khối rỗng. */
        if (alive) setOrders([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [purchaseRequestId, reloadKey]);

  const decide = async (order, accept, reason = "") => {
    setBusyId(order.purchaseOrderId);

    try {
      const result = await decideSupplierOrderApi(order.purchaseOrderId, {
        accept,
        reason,
        returnUrl: window.location.href,
      });

      if (accept) {
        const checkoutUrl = getPaymentCheckoutUrl(result?.priceDifferencePayment || result || {});

        AuthNotify.success(
          "Đã ghi nhận",
          checkoutUrl
            ? "Mở trang thanh toán để trả phần chênh giá."
            : "VCL sẽ tiếp tục xử lý đơn mua."
        );

        if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener");
      } else {
        AuthNotify.success("Đã gửi", "VCL sẽ liên hệ lại với bạn về đơn mua này.");
      }

      load();
    } catch (error) {
      AuthNotify.error(
        "Không gửi được",
        error?.response?.data?.message || error?.message || "Vui lòng thử lại."
      );
    } finally {
      setBusyId("");
    }
  };

  const askReject = (order) => {
    let reason = "";

    Modal.confirm({
      title: "Từ chối phần chênh giá",
      content: (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            Cho VCL biết lý do để nhân viên tìm nhà cung cấp khác hoặc điều chỉnh đơn.
          </Text>
          <Input.TextArea
            rows={3}
            style={{ marginTop: 8 }}
            placeholder="Lý do từ chối"
            onChange={(event) => {
              reason = event.target.value;
            }}
          />
        </div>
      ),
      okText: "Gửi từ chối",
      okButtonProps: { danger: true },
      cancelText: "Đóng",
      onOk: () => decide(order, false, reason),
    });
  };

  if (loading) {
    return (
      <div className="supplier-panel supplier-panel--loading">
        <Spin />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="supplier-panel">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có đơn mua nào. VCL sẽ đặt hàng sau khi bạn trả phần trả trước."
        />
      </div>
    );
  }

  return (
    <div className="supplier-panel">
      {orders.map((order) => {
        const busy = busyId === order.purchaseOrderId;
        const needsDecision = order.status === "AWAITING_CUSTOMER";
        const needsPayment = order.status === "AWAITING_CUSTOMER_PAYMENT";
        const checkoutUrl = order.priceDifferenceCheckoutUrl;

        return (
          <article key={order.purchaseOrderId} className="supplier-card">
            <header className="supplier-card__head">
              <div>
                <strong>{order.purchaseOrderCode}</strong>
                {order.supplierName && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {order.supplierName}
                  </Text>
                )}
              </div>

              <Tag color={order.step.tone}>{order.step.label}</Tag>
            </header>

            {order.step.hint && <p className="supplier-card__hint">{order.step.hint}</p>}

            {(needsDecision || needsPayment) && order.priceDifferenceAmount > 0 && (
              <Alert
                type="warning"
                showIcon
                className="supplier-card__diff"
                message={`Phần chênh giá: ${formatVnd(order.priceDifferenceAmount)}`}
                description={
                  <>
                    <div>
                      Giá đã báo bạn: <b>{formatVnd(order.quotedGoodsAmount)}</b> · Giá mua thực:{" "}
                      <b>{formatVnd(order.totalAmount)}</b>
                    </div>
                    <div className="supplier-card__diff-note">
                      Người bán tăng giá so với lúc báo giá. Bạn chỉ trả thêm đúng phần chênh
                      tiền hàng, VCL không tính thêm phí dịch vụ trên phần này.
                    </div>
                  </>
                }
              />
            )}

            {needsDecision && (
              <div className="supplier-card__actions">
                <Button type="primary" loading={busy} onClick={() => decide(order, true)}>
                  Đồng ý và trả phần chênh
                </Button>
                <Button danger disabled={busy} onClick={() => askReject(order)}>
                  Từ chối
                </Button>
              </div>
            )}

            {needsPayment && (
              <div className="supplier-card__actions">
                <Button
                  type="primary"
                  disabled={!checkoutUrl}
                  onClick={() => window.open(checkoutUrl, "_blank", "noopener")}
                >
                  {checkoutUrl ? "Trả phần chênh giá" : "Đang tạo lần thu…"}
                </Button>
              </div>
            )}

            <ol className="supplier-timeline">
              {SUPPLIER_TIMELINE.map((step) => {
                const at = order[step.at];
                const done = Boolean(at);

                return (
                  <li
                    key={step.status}
                    className={`supplier-timeline__item${done ? " is-done" : ""}`}
                  >
                    <span className="supplier-timeline__dot" />
                    <span className="supplier-timeline__label">{step.label}</span>
                    <span className="supplier-timeline__time">
                      {done ? formatDateTime(at) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>

            {order.domesticTrackingCode && (
              <p className="supplier-card__tracking">
                Mã vận đơn nội địa: <b>{order.domesticTrackingCode}</b>
                {order.domesticCarrier ? ` · ${order.domesticCarrier}` : ""}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
