import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Spin,
  Tag,
} from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  TruckOutlined,
} from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVnd } from "@shared/utils/formatNumber";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

import { createDeliveryRequestApi, getDeliveryRequestByIdApi } from "@features/delivery/api/deliveryRequestApi";
import {
  confirmOrderReceivedApi,
  getOrderDeliveryTrackingApi,
} from "@features/delivery/api/deliveryTrackingApi";
import { getParcelHandlingApi } from "@features/delivery/api/destinationHandlingApi";

/* Import sâu có chủ đích (không qua barrel): barrel consignment / payment / tracking kéo
   theo các trang của chúng, đổi thứ tự nạp CSS toàn app (ARCHITECTURE mục 4). Chỉ lấy
   đúng module api / util cần dùng. */
import { getDeliveryAddressesApi } from "@features/consignment/api/consignmentApi";
import {
  PAYMENT_INSTALLMENT_TYPES,
  findPayablePayment,
  getOrderPaymentsApi,
} from "@features/payment/api/orderPaymentApi";
import { openCheckout } from "@features/payment/utils/openCheckout";
import { getParcelIncidentsApi } from "@features/incidents/api/parcelIncidentApi";

import {
  getAwaitingStorageParcels,
  getReadyToDeliverParcels,
  splitAddress,
} from "./OrderDeliveryCard.helpers";
import "./OrderDeliveryCard.css";

const EMPTY_FORM = {
  parcelIds: [],
  receiverName: "",
  receiverPhone: "",
  addressDetail: "",
  ward: "",
  district: "",
  province: "",
  scheduledDate: "",
  note: "",
};

const DELIVERY_TAG_COLORS = {
  DELIVERY_PENDING: "gold",
  DELIVERY_APPROVED: "blue",
  DELIVERY_REJECTED: "red",
  DELIVERY_DISPATCHED: "green",
  DELIVERY_RETURNED: "orange",
};

const EMPTY_DATA = {
  tracking: null,
  handlingRows: [],
  openIncidentParcelIds: new Set(),
  redeliveryPayment: null,
  deliveryDetails: {},
};

/**
 * Giao hàng nội địa phía khách (tài liệu hàng về VN mục D2–D4, F):
 * - xem phiếu giao của đơn (GET /api/orders/{id}/delivery-tracking),
 * - tự đặt giao cho kiện sẵn sàng (POST /api/delivery-requests) — địa chỉ lấy nhanh từ
 *   sổ địa chỉ /api/delivery-addresses,
 * - trả phí giao lại khi Sale báo phí (redeliveryFeeCheckoutUrl / khoản REDELIVERY_FEE),
 * - bấm "Đã nhận hàng" khi đơn DELIVERED (PUT .../customer-confirm).
 *
 * @param {{ orderId: string, order?: object, orderStatus?: string, refreshKey?: number,
 *           onChanged?: () => void }} props
 */
export default function OrderDeliveryCard({
  orderId,
  order,
  orderStatus,
  refreshKey = 0,
  onChanged,
}) {
  const [data, setData] = useState({ loading: true, error: "", ...EMPTY_DATA });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addresses, setAddresses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      /* Bốn nguồn độc lập: nguồn phụ lỗi (sự cố, thanh toán) không được làm mất cả thẻ. */
      const [trackingResult, handlingResult, incidentResult, paymentResult] =
        await Promise.allSettled([
          getOrderDeliveryTrackingApi(orderId, { signal }),
          getParcelHandlingApi(orderId, { signal }),
          getParcelIncidentsApi({ orderId, pageSize: 100 }, { signal }),
          getOrderPaymentsApi(orderId, { signal }),
        ]);

      if (signal.aborted) return;

      if (trackingResult.status === "rejected") {
        if (isCanceledError(trackingResult.reason)) return;

        setData({
          loading: false,
          error: getApiErrorMessage(trackingResult.reason),
          ...EMPTY_DATA,
        });
        return;
      }

      const tracking = trackingResult.value;

      const openIncidentParcelIds = new Set(
        incidentResult.status === "fulfilled"
          ? incidentResult.value.items
              .filter((incident) => String(incident.status).toUpperCase() !== "RESOLVED")
              .map((incident) => incident.parcelId)
          : [],
      );

      /* Phiếu giao lại có phí: chi tiết phiếu mới có redeliveryFee + link trả phí. */
      const detailResults = await Promise.allSettled(
        tracking.deliveries.map((delivery) =>
          getDeliveryRequestByIdApi(delivery.deliveryRequestId, { signal }),
        ),
      );

      if (signal.aborted) return;

      const deliveryDetails = {};
      detailResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.deliveryRequestId) {
          deliveryDetails[result.value.deliveryRequestId] = result.value;
        }
      });

      setData({
        loading: false,
        error: "",
        tracking,
        handlingRows: handlingResult.status === "fulfilled" ? handlingResult.value : [],
        openIncidentParcelIds,
        redeliveryPayment:
          paymentResult.status === "fulfilled"
            ? findPayablePayment(
                paymentResult.value.payments,
                PAYMENT_INSTALLMENT_TYPES.REDELIVERY_FEE,
              )
            : null,
        deliveryDetails,
      });
    })();

    return () => controller.abort();
  }, [orderId, refreshKey]);

  const readyParcels = useMemo(
    () => getReadyToDeliverParcels(data.handlingRows, data.openIncidentParcelIds),
    [data.handlingRows, data.openIncidentParcelIds],
  );

  const awaitingStorage = useMemo(
    () => getAwaitingStorageParcels(data.handlingRows),
    [data.handlingRows],
  );

  const tracking = data.tracking;
  const deliveries = tracking?.deliveries || [];
  const status = String(orderStatus || tracking?.orderStatus || "").toUpperCase();
  const canConfirm = status === "DELIVERED" && !tracking?.isCustomerConfirmed;

  const pendingRedelivery = Object.values(data.deliveryDetails).find(
    (detail) =>
      Number(detail.redeliveryFee) > 0 &&
      String(detail.redeliveryFeePaymentStatus || "").toUpperCase() === "PENDING" &&
      detail.redeliveryFeeCheckoutUrl,
  );
  const redeliveryCheckoutUrl =
    pendingRedelivery?.redeliveryFeeCheckoutUrl || data.redeliveryPayment?.checkoutUrl;
  const redeliveryAmount =
    pendingRedelivery?.redeliveryFee ?? data.redeliveryPayment?.amount;

  const openCreateModal = async () => {
    const fromOrder = splitAddress(order?.receiverAddress);

    setForm({
      ...EMPTY_FORM,
      ...fromOrder,
      parcelIds: readyParcels.map((parcel) => parcel.parcelId),
      receiverName: order?.receiverName || "",
      receiverPhone: order?.receiverPhone || "",
    });
    setModalOpen(true);

    try {
      setAddresses(await getDeliveryAddressesApi());
    } catch {
      /* Không có sổ địa chỉ thì khách tự gõ — không chặn việc đặt giao. */
      setAddresses([]);
    }
  };

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleCreate = async () => {
    if (form.parcelIds.length === 0) {
      AuthNotify.warning("Chưa chọn kiện", "Vui lòng chọn ít nhất một kiện cần giao.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createDeliveryRequestApi({
        orderId,
        ...form,
        /* Ngày hẹn chỉ có ngày — gửi 00:00 giờ VN để server không lệch sang hôm trước. */
        scheduledDate: form.scheduledDate ? `${form.scheduledDate}T00:00:00+07:00` : null,
      });

      AuthNotify.success(
        result?.message || "Lập yêu cầu giao hàng thành công.",
        result?.deliveryCode
          ? `Mã phiếu ${result.deliveryCode} — chờ quản lý kho duyệt.`
          : "Yêu cầu đang chờ quản lý kho duyệt.",
      );
      setModalOpen(false);
      onChanged?.();
    } catch (error) {
      AuthNotify.error("Không đặt giao được", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);

    try {
      const result = await confirmOrderReceivedApi(orderId);
      const completed = String(result?.status).toUpperCase() === "COMPLETED";

      AuthNotify.success(
        result?.message || "Đã ghi nhận xác nhận nhận hàng.",
        completed
          ? "Đơn đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ."
          : "Đơn sẽ tự đóng khi các vướng mắc (sự cố, khiếu nại, khoản thu còn treo) được xử lý xong.",
      );
      onChanged?.();
    } catch (error) {
      AuthNotify.error("Không xác nhận được", getApiErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  };

  const handlePayRedelivery = () => {
    if (!openCheckout(redeliveryCheckoutUrl)) {
      AuthNotify.error("Không mở được trang thanh toán", "Link thanh toán không hợp lệ.");
    }
  };

  return (
    <SectionCard
      icon={<TruckOutlined />}
      tone={canConfirm ? "success" : "default"}
      title="Giao hàng tới bạn"
      subtitle={
        tracking?.orderStatusText ||
        "Đặt giao cho các kiện đã sẵn sàng, theo dõi phiếu giao và xác nhận khi nhận đủ hàng."
      }
      extra={
        <>
          {readyParcels.length > 0 ? (
            <Button type="primary" onClick={openCreateModal}>
              Đặt giao {readyParcels.length} kiện
            </Button>
          ) : null}
          {canConfirm ? (
            <Popconfirm
              title="Xác nhận bạn đã nhận đủ hàng?"
              description="Sau khi xác nhận, đơn sẽ được hoàn thành (nếu không còn vướng mắc)."
              okText="Đã nhận hàng"
              cancelText="Huỷ"
              onConfirm={handleConfirm}
            >
              <Button type="primary" icon={<CheckCircleOutlined />} loading={confirming}>
                Đã nhận hàng
              </Button>
            </Popconfirm>
          ) : null}
        </>
      }
    >
      {data.loading ? (
        <Spin />
      ) : data.error ? (
        <Alert type="info" showIcon title={data.error} />
      ) : (
        <>
          {tracking?.isCustomerConfirmed ? (
            <Alert
              type="success"
              showIcon
              title="Bạn đã xác nhận nhận hàng"
              description={
                tracking.customerConfirmedAt
                  ? `Lúc ${formatVietnamDateTime(tracking.customerConfirmedAt)}`
                  : undefined
              }
            />
          ) : null}

          {redeliveryCheckoutUrl ? (
            <Alert
              type="warning"
              showIcon
              className="order-delivery__alert"
              icon={<DollarOutlined />}
              title={`Phí giao lại: ${formatVnd(redeliveryAmount)}`}
              description="Lần giao trước không thành công. Kho chỉ đặt giao lại sau khi bạn thanh toán phí này."
              action={
                <Button type="primary" onClick={handlePayRedelivery}>
                  Thanh toán
                </Button>
              }
            />
          ) : null}

          {awaitingStorage.length > 0 ? (
            <p className="section-card__hint">
              {awaitingStorage.length} kiện bạn chọn gửi kho đang chờ kho Việt Nam nhập kho và
              xếp kệ — sau đó mới đặt giao được.
            </p>
          ) : null}

          {Number(tracking?.storageFeeAmount) > 0 ? (
            <p className="section-card__hint">
              Phí lưu kho đang phát sinh: <strong>{formatVnd(tracking.storageFeeAmount)}</strong>
              {tracking.storageFeeNote ? ` — ${tracking.storageFeeNote}` : ""}
            </p>
          ) : null}

          {deliveries.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                readyParcels.length > 0
                  ? "Chưa có phiếu giao nào. Bấm \"Đặt giao\" để hẹn giao các kiện đã sẵn sàng."
                  : "Chưa có kiện nào sẵn sàng giao (cần tất toán xong và kho Việt Nam kiểm hàng)."
              }
            />
          ) : (
            <div className="order-delivery__list">
              {deliveries.map((delivery) => {
                const detail = data.deliveryDetails[delivery.deliveryRequestId];

                return (
                  <article key={delivery.deliveryRequestId} className="order-delivery__item">
                    <div className="order-delivery__item-top">
                      <strong>{delivery.deliveryCode}</strong>
                      <Tag color={DELIVERY_TAG_COLORS[delivery.status] || "default"}>
                        {delivery.statusText || delivery.status}
                      </Tag>
                    </div>

                    <dl className="section-card__facts">
                      <div>
                        <dt>Người nhận</dt>
                        <dd>{delivery.receiverName || "—"}</dd>
                      </div>
                      <div>
                        <dt>Địa chỉ</dt>
                        <dd>{delivery.fullAddress || "—"}</dd>
                      </div>
                      <div>
                        <dt>Mã vận đơn nội địa</dt>
                        <dd>{delivery.carrierTrackingCode || "Chưa có"}</dd>
                      </div>
                      <div>
                        <dt>Số kiện</dt>
                        <dd>{delivery.totalParcels}</dd>
                      </div>
                      {delivery.scheduledDate ? (
                        <div>
                          <dt>Ngày hẹn</dt>
                          <dd>{formatVietnamDateTime(delivery.scheduledDate)}</dd>
                        </div>
                      ) : null}
                      {delivery.dispatchedAt ? (
                        <div>
                          <dt>Đã gửi hãng lúc</dt>
                          <dd>{formatVietnamDateTime(delivery.dispatchedAt)}</dd>
                        </div>
                      ) : null}
                      {detail?.returnedAt ? (
                        <div>
                          <dt>Hàng hoàn về kho lúc</dt>
                          <dd>{formatVietnamDateTime(detail.returnedAt)}</dd>
                        </div>
                      ) : null}
                      {detail?.proofReceivedBy ? (
                        <div>
                          <dt>Người ký nhận</dt>
                          <dd>{detail.proofReceivedBy}</dd>
                        </div>
                      ) : null}
                      {Number(detail?.redeliveryFee) > 0 ? (
                        <div>
                          <dt>Phí giao lại</dt>
                          <dd>
                            {formatVnd(detail.redeliveryFee)}
                            {detail.redeliveryFeePaymentStatus
                              ? ` (${detail.redeliveryFeePaymentStatus === "PAID" ? "đã trả" : detail.redeliveryFeePaymentStatus === "PENDING" ? "chờ trả" : detail.redeliveryFeePaymentStatus})`
                              : ""}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    {detail?.rejectionReason ? (
                      <p className="section-card__hint">Lý do từ chối: {detail.rejectionReason}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {tracking?.parcels?.length ? (
            <div className="order-delivery__parcels">
              {tracking.parcels.map((parcel) => (
                <Tag key={parcel.packageCode}>
                  {parcel.packageCode}: {parcel.statusText || parcel.packageStatus}
                  {parcel.handlingText ? ` · ${parcel.handlingText}` : ""}
                </Tag>
              ))}
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={modalOpen}
        title="Đặt giao hàng"
        okText="Gửi yêu cầu giao"
        cancelText="Huỷ"
        width={680}
        confirmLoading={submitting}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <p className="order-delivery__label">Kiện cần giao</p>
        <Checkbox.Group
          className="order-delivery__checks"
          value={form.parcelIds}
          options={readyParcels.map((parcel) => ({
            value: parcel.parcelId,
            label: parcel.packageCode,
          }))}
          onChange={(values) => updateForm({ parcelIds: values })}
        />

        {addresses.length > 0 ? (
          <>
            <p className="order-delivery__label">Lấy từ sổ địa chỉ</p>
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn một địa chỉ đã lưu"
              options={addresses.map((address) => ({
                value: address.id,
                label: address.address,
              }))}
              onChange={(value) => {
                const picked = addresses.find((address) => address.id === value);
                if (picked) updateForm(splitAddress(picked.address));
              }}
            />
          </>
        ) : null}

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <p className="order-delivery__label">Tên người nhận *</p>
            <Input
              maxLength={150}
              value={form.receiverName}
              onChange={(event) => updateForm({ receiverName: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={12}>
            <p className="order-delivery__label">Số điện thoại *</p>
            <Input
              maxLength={30}
              value={form.receiverPhone}
              onChange={(event) => updateForm({ receiverPhone: event.target.value })}
            />
          </Col>
          <Col span={24}>
            <p className="order-delivery__label">Địa chỉ chi tiết (số nhà, tên đường) *</p>
            <Input
              maxLength={300}
              value={form.addressDetail}
              onChange={(event) => updateForm({ addressDetail: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={8}>
            <p className="order-delivery__label">Phường/xã *</p>
            <Input
              maxLength={100}
              value={form.ward}
              onChange={(event) => updateForm({ ward: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={8}>
            <p className="order-delivery__label">Quận/huyện *</p>
            <Input
              maxLength={100}
              value={form.district}
              onChange={(event) => updateForm({ district: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={8}>
            <p className="order-delivery__label">Tỉnh/thành phố *</p>
            <Input
              maxLength={100}
              value={form.province}
              onChange={(event) => updateForm({ province: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={8}>
            <p className="order-delivery__label">Ngày hẹn giao</p>
            <Input
              type="date"
              value={form.scheduledDate}
              onChange={(event) => updateForm({ scheduledDate: event.target.value })}
            />
          </Col>
          <Col xs={24} sm={16}>
            <p className="order-delivery__label">Ghi chú</p>
            <Input
              maxLength={500}
              value={form.note}
              onChange={(event) => updateForm({ note: event.target.value })}
            />
          </Col>
        </Row>
      </Modal>
    </SectionCard>
  );
}
