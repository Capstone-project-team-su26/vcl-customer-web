import { useEffect, useState } from "react";
import { Alert, Button, Table } from "antd";
import { InboxOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { isCanceledError } from "@shared/utils/apiError";
import { formatVnd } from "@shared/utils/formatNumber";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
/* Import sâu có chủ đích: barrel payment kéo theo trang (thứ tự CSS). */
import {
  PAYMENT_INSTALLMENT_TYPES,
  findPayablePayment,
  getOrderPaymentsApi,
  getOrderStorageFeeApi,
} from "@features/payment/api/orderPaymentApi";
import { openCheckout } from "@features/payment/utils/openCheckout";
import {
  PAYMENT_PURPOSES,
  PAYMENT_SUBJECTS,
} from "@features/payment/utils/pendingPaymentReturn";
import { buildTablePagination } from "@shared/utils/pagination";

/* Bảng dài (nhiều kiện) thì phân trang 10/20/50; ≤ 10 dòng không hiện thanh phân trang. */
const PARCEL_TABLE_PAGINATION = buildTablePagination({ unit: "kiện" });

/**
 * Phí lưu kho tại kho VN của đơn (GET /api/orders/{id}/storage-fee, hàng về VN mục D1).
 *
 * Chỉ tính cho kiện khách chọn gửi kho, kể từ lúc lên kệ kho VN, có ngày miễn phí + ân hạn.
 * Khoản STORAGE_FEE do KHO chốt lúc xuất hàng (POST .../payments/storage-fee chỉ nhân viên
 * gọi được) — khách chỉ xem, và trả khi khoản đó xuất hiện (link trong danh sách thanh toán).
 * Đơn không có kiện nào từng lên kệ VN thì ẩn thẻ.
 *
 *
 * `paymentOwner` (tuỳ chọn): { orderType, purchaseRequestId, code } của đơn — ghi vào bản
 *   ghi thanh toán để khoản của đơn kho mua hộ (PUR-…-n) trả về phần Mua hộ của Lịch sử giao
 *   dịch và "Xem đơn" kèm `?yc=` (xem pendingPaymentReturn.js).
 *
 * @param {{ orderId: string, refreshKey?: number, paymentOwner?: object }} props
 */
export default function StorageFeeCard({ orderId, refreshKey = 0, paymentOwner }) {
  const [state, setState] = useState({ fee: null, payable: null });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled([
      getOrderStorageFeeApi(orderId, { signal }),
      getOrderPaymentsApi(orderId, { signal }),
    ]).then(([feeResult, paymentResult]) => {
      if (signal.aborted) return;

      if (feeResult.status === "rejected" && isCanceledError(feeResult.reason)) return;

      setState({
        fee: feeResult.status === "fulfilled" ? feeResult.value : null,
        payable:
          paymentResult.status === "fulfilled"
            ? findPayablePayment(paymentResult.value.payments, PAYMENT_INSTALLMENT_TYPES.STORAGE_FEE)
            : null,
      });
    });

    return () => controller.abort();
  }, [orderId, refreshKey]);

  const { fee, payable } = state;
  const storedParcels = (fee?.parcels || []).filter((parcel) => parcel.storedAt);

  if (!fee || (storedParcels.length === 0 && !payable)) return null;

  const columns = [
    { title: "Mã kiện", dataIndex: "packageCode", key: "packageCode" },
    { title: "Lên kệ lúc", dataIndex: "storedAt", key: "storedAt", render: (v) => (v ? formatVietnamDateTime(v) : "—") },
    { title: "Rời kệ lúc", dataIndex: "releasedAt", key: "releasedAt", render: (v) => (v ? formatVietnamDateTime(v) : "Đang lưu") },
    { title: "Số ngày lưu", dataIndex: "storedDays", key: "storedDays" },
    { title: "Ngày tính phí", dataIndex: "chargeableDays", key: "chargeableDays" },
    { title: "Thành tiền", dataIndex: "amount", key: "amount", render: (v) => formatVnd(v) },
  ];

  return (
    <SectionCard
      icon={<InboxOutlined />}
      title={`Phí lưu kho Việt Nam: ${formatVnd(fee.totalAmount)}`}
      subtitle={`Miễn phí ${fee.freeDays ?? 0} ngày, ân hạn thêm ${fee.graceDays ?? 0} ngày; sau đó ${formatVnd(
        fee.unitPrice,
      )}/kiện/ngày.`}
    >
      {payable ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Kho đã chốt phí lưu kho: ${formatVnd(payable.amount)}`}
          description="Thanh toán để kho xuất hàng cho bạn."
          action={
            <Button
              type="primary"
              onClick={() => {
                if (
                  !openCheckout(payable.checkoutUrl, {
                    ...paymentOwner,
                    subject: PAYMENT_SUBJECTS.order,
                    targetId: orderId,
                    purpose: PAYMENT_PURPOSES.storageFee,
                    orderCode: payable.orderCode,
                    amount: payable.amount,
                  })
                ) {
                  AuthNotify.error("Không mở được trang thanh toán", "Link thanh toán không hợp lệ.");
                }
              }}
            >
              Thanh toán
            </Button>
          }
        />
      ) : null}

      {fee.note ? <p className="section-card__hint">{fee.note}</p> : null}

      <Table
        size="small"
        rowKey={(row) => row.parcelId || row.packageCode}
        columns={columns}
        dataSource={storedParcels}
        pagination={PARCEL_TABLE_PAGINATION}
        scroll={{ x: 640 }}
        style={{ marginTop: 12 }}
      />
    </SectionCard>
  );
}
