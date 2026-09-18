import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Empty, Input, Modal, Spin, Tag } from "antd";
import { ExclamationCircleOutlined, WarningOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import FilePickButton from "@shared/components/FilePickButton/FilePickButton";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVnd } from "@shared/utils/formatNumber";
import { formatVietnamDateTime, getSyncedNowDate } from "@shared/utils/timeUtc";
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ATTACHMENT_DOCUMENT_TYPES,
  ATTACHMENT_ENTITY_TYPES,
  uploadAttachmentApi,
  validateAttachmentFile,
} from "@shared/api/attachmentApi";
import {
  COMPLAINT_WINDOW_DAYS,
  INCIDENT_CHOICE_LABELS,
  INCIDENT_RESOLUTION_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  createOrderComplaintApi,
  getParcelIncidentsApi,
} from "@features/incidents/api/parcelIncidentApi";
import IncidentDetailModal from "@features/incidents/components/IncidentDetailModal/IncidentDetailModal";

import "./OrderIncidentsCard.css";

const STATUS_COLORS = { OPEN: "orange", CUSTOMER_RESPONDED: "blue", RESOLVED: "green" };

const COMPLAINT_ORDER_STATUSES = ["DELIVERED", "CUSTOMER_CONFIRMED"];

/**
 * Sự cố hàng hoá & khiếu nại của một đơn (tài liệu hàng về VN mục E, F).
 *
 * - Sự cố lúc kho VN tiếp nhận (hỏng, sai, thiếu, cân lệch): khách xem ảnh, chọn cách xử lý.
 * - Khiếu nại sau giao: mở được khi đơn DELIVERED / CUSTOMER_CONFIRMED và trong
 *   {COMPLAINT_WINDOW_DAYS} ngày kể từ khi giao (server kiểm lại, sai thì trả message).
 *   Ảnh đính kèm khiếu nại gửi dạng INCIDENT_PHOTO vào từng khiếu nại vừa tạo.
 *
 * Sự cố chưa xong CHẶN tất toán, đặt giao kiện đó và đóng đơn — nên thẻ tô cam khi còn mở.
 *
 * @param {{ orderId: string, orderStatus?: string, deliveredAt?: string|null,
 *           parcels?: Array<object>, refreshKey?: number, onChanged?: () => void }} props
 */
export default function OrderIncidentsCard({
  orderId,
  orderStatus,
  deliveredAt,
  parcels = [],
  refreshKey = 0,
  onChanged,
}) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaint, setComplaint] = useState({ parcelIds: [], description: "", photo: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getParcelIncidentsApi({ orderId, pageSize: 100 }, { signal: controller.signal })
      .then(({ items }) => setState({ loading: false, items, error: "" }))
      .catch((error) => {
        if (!isCanceledError(error)) {
          setState({ loading: false, items: [], error: getApiErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [orderId, refreshKey, reloadKey]);

  const deliveredParcels = useMemo(
    () => parcels.filter((parcel) => String(parcel.packageStatus).toUpperCase() === "DELIVERED"),
    [parcels],
  );

  /* Hạn khiếu nại tính theo mốc giao (nếu biết); server là nơi kiểm cuối cùng. */
  const complaintDeadline = deliveredAt
    ? new Date(new Date(deliveredAt).getTime() + COMPLAINT_WINDOW_DAYS * 24 * 3600 * 1000)
    : null;
  const withinWindow = !complaintDeadline || complaintDeadline > getSyncedNowDate();
  const canComplain =
    COMPLAINT_ORDER_STATUSES.includes(String(orderStatus || "").toUpperCase()) &&
    withinWindow &&
    deliveredParcels.length > 0;

  const openCount = state.items.filter(
    (incident) => String(incident.status).toUpperCase() !== "RESOLVED",
  ).length;

  const refresh = () => {
    setReloadKey((key) => key + 1);
    onChanged?.();
  };

  const openComplaint = () => {
    setComplaint({
      parcelIds: deliveredParcels.map((parcel) => parcel.parcelId),
      description: "",
      photo: null,
    });
    setComplaintOpen(true);
  };

  const handleSubmitComplaint = async () => {
    if (!complaint.description.trim()) {
      AuthNotify.warning("Thiếu mô tả", "Phải mô tả vấn đề khiếu nại.");
      return;
    }

    setSubmitting(true);

    try {
      const { incidents, message } = await createOrderComplaintApi(orderId, {
        parcelIds: complaint.parcelIds,
        description: complaint.description,
      });

      /* Ảnh gắn vào TỪNG khiếu nại (mỗi kiện một khiếu nại). Lỗi ảnh không huỷ khiếu nại. */
      if (complaint.photo) {
        const uploads = await Promise.allSettled(
          incidents.map((incident) =>
            uploadAttachmentApi({
              file: complaint.photo,
              entityType: ATTACHMENT_ENTITY_TYPES.INCIDENT,
              entityId: incident.id,
              documentType: ATTACHMENT_DOCUMENT_TYPES.INCIDENT_PHOTO,
            }),
          ),
        );
        const failed = uploads.find((result) => result.status === "rejected");

        if (failed) {
          AuthNotify.warning(
            "Chưa gửi được ảnh",
            `${getApiErrorMessage(failed.reason)} Bạn có thể gửi lại ảnh trong chi tiết khiếu nại.`,
          );
        }
      }

      AuthNotify.success(
        message || "Đã ghi nhận khiếu nại.",
        "Quản lý kho sẽ xem xét và phản hồi bạn.",
      );
      setComplaintOpen(false);
      refresh();
    } catch (error) {
      AuthNotify.error("Không gửi được khiếu nại", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!state.loading && !state.error && state.items.length === 0 && !canComplain) {
    return null;
  }

  return (
    <SectionCard
      icon={<WarningOutlined />}
      tone={openCount > 0 ? "warning" : "default"}
      title={openCount > 0 ? `Sự cố & khiếu nại (${openCount} đang mở)` : "Sự cố & khiếu nại"}
      subtitle={
        canComplain && complaintDeadline
          ? `Hàng có vấn đề? Bạn khiếu nại được tới ${formatVietnamDateTime(complaintDeadline)}.`
          : "Sự cố chưa xử lý xong sẽ tạm chặn tất toán, giao hàng và đóng đơn."
      }
      extra={
        canComplain ? (
          <Button danger icon={<ExclamationCircleOutlined />} onClick={openComplaint}>
            Khiếu nại
          </Button>
        ) : null
      }
    >
      {state.loading ? (
        <Spin />
      ) : state.error ? (
        <Alert type="error" showIcon title={state.error} />
      ) : state.items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Đơn chưa có sự cố nào." />
      ) : (
        <ul className="order-incidents">
          {state.items.map((incident) => {
            const status = String(incident.status).toUpperCase();
            const type = String(incident.incidentType).toUpperCase();
            const waitingForYou = incident.awaitsCustomerChoice && status === "OPEN";

            return (
              <li key={incident.id} className="order-incidents__item">
                <div className="order-incidents__main">
                  <div className="order-incidents__tags">
                    <strong>{incident.incidentCode}</strong>
                    <Tag color="volcano">
                      {incident.incidentTypeText || INCIDENT_TYPE_LABELS[type] || type}
                    </Tag>
                    <Tag color={STATUS_COLORS[status] || "default"}>
                      {INCIDENT_STATUS_LABELS[status] || status}
                    </Tag>
                  </div>
                  <span className="order-incidents__meta">
                    Kiện {incident.packageCode} ·{" "}
                    {incident.reportedAt ? formatVietnamDateTime(incident.reportedAt) : ""}
                  </span>
                  {incident.description ? <p>{incident.description}</p> : null}
                  {incident.customerChoice ? (
                    <span className="order-incidents__meta">
                      Bạn chọn: {INCIDENT_CHOICE_LABELS[incident.customerChoice] || incident.customerChoice}
                    </span>
                  ) : null}
                  {incident.resolution ? (
                    <span className="order-incidents__meta">
                      Kết quả: {INCIDENT_RESOLUTION_LABELS[incident.resolution] || incident.resolution}
                      {Number(incident.compensationAmount) > 0
                        ? ` · bồi thường ${formatVnd(incident.compensationAmount)}`
                        : ""}
                    </span>
                  ) : null}
                </div>

                <Button
                  type={waitingForYou ? "primary" : "default"}
                  onClick={() => setDetailId(incident.id)}
                >
                  {waitingForYou ? "Chọn cách xử lý" : "Xem chi tiết"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <IncidentDetailModal
        incidentId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={refresh}
      />

      <Modal
        open={complaintOpen}
        title="Khiếu nại sau khi nhận hàng"
        okText="Gửi khiếu nại"
        cancelText="Huỷ"
        confirmLoading={submitting}
        onOk={handleSubmitComplaint}
        onCancel={() => setComplaintOpen(false)}
        destroyOnHidden
      >
        <p className="order-incidents__label">Kiện bị ảnh hưởng</p>
        <Checkbox.Group
          value={complaint.parcelIds}
          options={deliveredParcels.map((parcel) => ({
            value: parcel.parcelId,
            label: `${parcel.packageCode}${parcel.productName ? ` — ${parcel.productName}` : ""}`,
          }))}
          onChange={(values) => setComplaint((current) => ({ ...current, parcelIds: values }))}
        />
        <p className="order-incidents__hint">Không chọn kiện nào = khiếu nại mọi kiện đã giao.</p>

        <p className="order-incidents__label">Mô tả vấn đề *</p>
        <Input.TextArea
          rows={4}
          maxLength={1000}
          showCount
          value={complaint.description}
          placeholder="Ví dụ: Thùng bị móp, sản phẩm bên trong vỡ màn hình"
          onChange={(event) =>
            setComplaint((current) => ({ ...current, description: event.target.value }))
          }
        />

        <p className="order-incidents__label">Ảnh hiện trạng (không bắt buộc)</p>
        <FilePickButton
          accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
          onSelect={(file) => {
            const invalid = validateAttachmentFile(file);

            if (invalid) {
              AuthNotify.warning("File không hợp lệ", invalid);
              return;
            }

            setComplaint((current) => ({ ...current, photo: file }));
          }}
        >
          {complaint.photo ? `Đã chọn: ${complaint.photo.name}` : "Chọn ảnh"}
        </FilePickButton>
      </Modal>
    </SectionCard>
  );
}
