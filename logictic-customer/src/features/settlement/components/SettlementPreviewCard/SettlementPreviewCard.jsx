import { useEffect, useState } from "react";
import { Alert, Button, Spin, Table, Tag } from "antd";
import { CalculatorOutlined, CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatDecimal, formatKg, formatSignedVnd, formatVnd } from "@shared/utils/formatNumber";
import {
  SETTLEMENT_BLOCKER_LABELS,
  getSettlementPreviewApi,
} from "@features/settlement/api/settlementApi";
/* Import sâu có chủ đích: barrel payment / tracking kéo theo trang (thứ tự CSS). */
import {
  PAYMENT_INSTALLMENT_TYPES,
  findPayablePayment,
  getOrderPaymentsApi,
} from "@features/payment/api/orderPaymentApi";
import { openCheckout } from "@features/payment/utils/openCheckout";
import { getPackageStatusLabel } from "@features/tracking/constants/trackingStages";

import "./SettlementPreviewCard.css";

/**
 * Xem trước tất toán theo cân đo tại kho VN (tài liệu hàng về VN mục C) + trả đợt cuối.
 *
 * - Bảng cân đo VN từng kiện, công thức cước, điều chỉnh (+/−), VAT, phí lưu kho, số dự
 *   kiến. Mọi con số lấy từ server — FE không tự tính tiền.
 * - Còn `blockers` thì hiện lý do THAY cho nút trả tiền.
 * - Khoản FINAL_PAYMENT do Sale phát hành: đọc GET /api/orders/{id}/payments, khoản đang
 *   PENDING có checkoutUrl thì cho khách trả — cùng cách màn cọc đang làm.
 *
 * @param {{ orderId: string, refreshKey?: number }} props
 */
export default function SettlementPreviewCard({ orderId, refreshKey = 0 }) {
  const [state, setState] = useState({ loading: true, preview: null, finalPayment: null, error: "" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.allSettled([
      getSettlementPreviewApi(orderId, { signal }),
      getOrderPaymentsApi(orderId, { signal }),
    ]).then(([previewResult, paymentResult]) => {
      if (signal.aborted) return;

      if (previewResult.status === "rejected") {
        if (!isCanceledError(previewResult.reason)) {
          setState({
            loading: false,
            preview: null,
            finalPayment: null,
            error: getApiErrorMessage(previewResult.reason),
          });
        }
        return;
      }

      setState({
        loading: false,
        preview: previewResult.value,
        finalPayment:
          paymentResult.status === "fulfilled"
            ? findPayablePayment(
                paymentResult.value.payments,
                PAYMENT_INSTALLMENT_TYPES.FINAL_PAYMENT,
              )
            : null,
        error: "",
      });
    });

    return () => controller.abort();
  }, [orderId, refreshKey, reloadKey]);

  const { preview, finalPayment } = state;
  const blockers = preview?.blockers || [];
  const settled = blockers.some((blocker) => blocker.code === "ALREADY_SETTLED");
  const openBlockers = blockers.filter((blocker) => blocker.code !== "ALREADY_SETTLED");

  const handlePay = () => {
    if (!openCheckout(finalPayment?.checkoutUrl)) {
      AuthNotify.error("Không mở được trang thanh toán", "Link thanh toán không hợp lệ.");
    }
  };

  const columns = [
    {
      title: "Mã kiện",
      dataIndex: "packageCode",
      key: "packageCode",
      render: (value, row) => (
        <>
          <strong>{value}</strong>
          {row.isDisposed ? <Tag color="default" style={{ marginLeft: 6 }}>Đã huỷ — không tính</Tag> : null}
        </>
      ),
    },
    { title: "Trạng thái", dataIndex: "packageStatus", key: "packageStatus", render: (v) => getPackageStatusLabel(v) },
    { title: "Cân kho nguồn", dataIndex: "originWeight", key: "originWeight", render: (v) => formatKg(v) },
    { title: "Cân kho VN", dataIndex: "vnWeight", key: "vnWeight", render: (v) => formatKg(v) },
    {
      title: "Dài × rộng × cao (cm)",
      key: "dims",
      render: (_, row) =>
        row.vnLength
          ? `${formatDecimal(row.vnLength)} × ${formatDecimal(row.vnWidth)} × ${formatDecimal(row.vnHeight)}`
          : "—",
    },
    { title: "Cân quy đổi", dataIndex: "volumetricWeight", key: "volumetricWeight", render: (v) => formatKg(v) },
    { title: "Cân tính cước", dataIndex: "chargeableWeight", key: "chargeableWeight", render: (v) => <strong>{formatKg(v)}</strong> },
  ];

  return (
    <SectionCard
      icon={<CalculatorOutlined />}
      tone={finalPayment ? "warning" : settled ? "success" : "default"}
      title="Tất toán theo cân đo tại Việt Nam"
      subtitle="Cước được tính lại theo số cân đo của kho Việt Nam, dùng đúng đơn giá và VAT của báo giá bạn đã chấp nhận."
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((key) => key + 1)}>
          Tải lại
        </Button>
      }
    >
      {state.loading ? (
        <Spin />
      ) : state.error ? (
        <Alert type="info" showIcon title={state.error} />
      ) : (
        <>
          {settled ? (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              title="Đơn đã tất toán xong"
              className="settlement-preview__block"
            />
          ) : finalPayment ? (
            <Alert
              type="warning"
              showIcon
              className="settlement-preview__block"
              title={`Nhân viên đã phát hành đợt tất toán: ${formatVnd(finalPayment.amount)}`}
              description="Thanh toán để kho Việt Nam giao hàng / nhập kho cho bạn."
              action={
                <Button type="primary" onClick={handlePay}>
                  Thanh toán
                </Button>
              }
            />
          ) : openBlockers.length > 0 ? (
            <Alert
              type="info"
              showIcon
              className="settlement-preview__block"
              title="Chưa tất toán được"
              description={
                <ul className="settlement-preview__blockers">
                  {openBlockers.map((blocker) => (
                    <li key={`${blocker.code}-${blocker.message}`}>
                      {blocker.message || SETTLEMENT_BLOCKER_LABELS[blocker.code] || blocker.code}
                    </li>
                  ))}
                </ul>
              }
            />
          ) : (
            <Alert
              type="info"
              showIcon
              className="settlement-preview__block"
              title="Đủ điều kiện tất toán"
              description="Nhân viên sẽ phát hành đợt tất toán; nút thanh toán hiện ở đây ngay khi có."
            />
          )}

          {preview.adjustmentNote ? (
            <Alert
              type="info"
              showIcon
              className="settlement-preview__block"
              title="Giữ nguyên cước đã báo"
              description={preview.adjustmentNote}
            />
          ) : null}

          <dl className="section-card__facts">
            <div>
              <dt>Cước đã báo</dt>
              <dd>{formatVnd(preview.quotedFreight)}</dd>
            </div>
            <div>
              <dt>Cân tính cước tại VN</dt>
              <dd>{formatKg(preview.vnChargeableWeight)}</dd>
            </div>
            <div>
              <dt>Cước theo cân đo VN</dt>
              <dd>{formatVnd(preview.vnFreight)}</dd>
            </div>
            <div>
              <dt>Điều chỉnh cước</dt>
              <dd className={Number(preview.freightAdjustment) < 0 ? "is-down" : Number(preview.freightAdjustment) > 0 ? "is-up" : ""}>
                {formatSignedVnd(preview.freightAdjustment)}
              </dd>
            </div>
            <div>
              <dt>VAT điều chỉnh ({formatDecimal(preview.vatRatePercent)}%)</dt>
              <dd>{formatSignedVnd(preview.vatAdjustment)}</dd>
            </div>
            <div>
              <dt>Phí lưu kho</dt>
              <dd>{formatVnd(preview.storageFee)}</dd>
            </div>
            <div>
              <dt>Tổng hoá đơn hiện tại</dt>
              <dd>{formatVnd(preview.invoiceTotalBefore)}</dd>
            </div>
            <div>
              <dt>Đã cọc</dt>
              <dd>{formatVnd(preview.depositPaid)}</dd>
            </div>
            <div className="settlement-preview__total">
              <dt>Số tiền đợt cuối dự kiến</dt>
              <dd>{formatVnd(preview.estimatedFinalAmount)}</dd>
            </div>
          </dl>

          <p className="section-card__hint">
            Công thức: mỗi kiện lấy <strong>max(cân VN, dài × rộng × cao ÷ {formatDecimal(preview.volumetricDivisor, 0)})</strong>;
            cộng các kiện còn hiệu lực (kiện huỷ theo sự cố không tính), tối thiểu{" "}
            {formatKg(preview.minimumWeight)} → cân tính cước × đơn giá {formatVnd(preview.freightRate)}/kg.
            Điều chỉnh = cước theo cân VN − cước đã báo (âm là giảm tiền cho bạn). Số dự kiến chưa gồm
            phụ phí nhân viên nhập thêm khi phát hành.
          </p>

          <Table
            size="small"
            rowKey="parcelId"
            columns={columns}
            dataSource={preview.parcels}
            pagination={false}
            scroll={{ x: 760 }}
            style={{ marginTop: 12 }}
          />
        </>
      )}
    </SectionCard>
  );
}
