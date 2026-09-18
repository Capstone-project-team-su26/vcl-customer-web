import { useEffect, useState } from "react";
import { Alert, Button, Divider, Input, Modal, Radio, Spin, Tag } from "antd";

import AttachmentList from "@shared/components/AttachmentList/AttachmentList";
import FilePickButton from "@shared/components/FilePickButton/FilePickButton";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import { formatVnd } from "@shared/utils/formatNumber";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ATTACHMENT_DOCUMENT_TYPES,
  ATTACHMENT_ENTITY_TYPES,
  uploadAttachmentApi,
  validateAttachmentFile,
} from "@shared/api/attachmentApi";
import {
  INCIDENT_CHOICE_LABELS,
  INCIDENT_RESOLUTION_LABELS,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPE_LABELS,
  getAllowedIncidentChoices,
  getParcelIncidentDetailApi,
  respondParcelIncidentApi,
} from "@features/incidents/api/parcelIncidentApi";

import "./IncidentDetailModal.css";

const STATUS_COLORS = { OPEN: "orange", CUSTOMER_RESPONDED: "blue", RESOLVED: "green" };

/**
 * Chi tiết một sự cố: ảnh hiện trạng (tải Blob có token), lựa chọn của khách, kết quả
 * quản lý kho quyết và bồi thường. Khách chọn ACCEPT / COMPENSATE / DISPOSE khi
 * `awaitsCustomerChoice` (COMPLAINT không có DISPOSE), và gửi thêm ảnh INCIDENT_PHOTO cho
 * khiếu nại của mình.
 *
 * @param {{ incidentId: string|null, onClose: () => void, onChanged?: () => void }} props
 */
export default function IncidentDetailModal({ incidentId, onClose, onChanged }) {
  const [state, setState] = useState({ loading: true, incident: null, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!incidentId) return undefined;

    const controller = new AbortController();

    getParcelIncidentDetailApi(incidentId, { signal: controller.signal })
      .then((incident) => setState({ loading: false, incident, error: "" }))
      .catch((error) => {
        if (!isCanceledError(error)) {
          setState({ loading: false, incident: null, error: getApiErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [incidentId, reloadKey]);

  const incident = state.incident;
  const status = String(incident?.status || "").toUpperCase();
  const type = String(incident?.incidentType || "").toUpperCase();
  const canRespond = Boolean(incident?.awaitsCustomerChoice) && status !== "RESOLVED";
  const canUploadPhoto = type === "COMPLAINT" && status !== "RESOLVED";

  const handleRespond = async () => {
    setSubmitting(true);

    try {
      const result = await respondParcelIncidentApi(incidentId, {
        choice,
        note,
        incidentType: type,
      });

      AuthNotify.success(result?.message || "Đã ghi nhận lựa chọn của bạn.");
      setChoice("");
      setNote("");
      setReloadKey((key) => key + 1);
      onChanged?.();
    } catch (error) {
      AuthNotify.error("Không gửi được lựa chọn", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (file) => {
    const invalid = validateAttachmentFile(file);

    if (invalid) {
      AuthNotify.warning("File không hợp lệ", invalid);
      return;
    }

    setUploading(true);

    try {
      await uploadAttachmentApi({
        file,
        entityType: ATTACHMENT_ENTITY_TYPES.INCIDENT,
        entityId: incidentId,
        documentType: ATTACHMENT_DOCUMENT_TYPES.INCIDENT_PHOTO,
      });

      AuthNotify.success("Đã gửi ảnh hiện trạng", file.name);
      setReloadKey((key) => key + 1);
    } catch (error) {
      AuthNotify.error("Không gửi được ảnh", getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={Boolean(incidentId)}
      title={incident ? `Sự cố ${incident.incidentCode || ""}` : "Chi tiết sự cố"}
      footer={null}
      width={720}
      onCancel={onClose}
      destroyOnHidden
    >
      {state.loading ? (
        <Spin />
      ) : state.error ? (
        <Alert type="error" showIcon title={state.error} />
      ) : (
        <div className="incident-detail">
          <div className="incident-detail__tags">
            <Tag color="volcano">
              {incident.incidentTypeText || INCIDENT_TYPE_LABELS[type] || type}
            </Tag>
            <Tag color={STATUS_COLORS[status] || "default"}>
              {INCIDENT_STATUS_LABELS[status] || status}
            </Tag>
            <span>Kiện {incident.packageCode}</span>
          </div>

          <dl className="section-card__facts">
            <div>
              <dt>Ghi nhận lúc</dt>
              <dd>{incident.reportedAt ? formatVietnamDateTime(incident.reportedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Người ghi nhận</dt>
              <dd>{incident.reportedByName || "—"}</dd>
            </div>
            {incident.customerChoice ? (
              <div>
                <dt>Bạn đã chọn</dt>
                <dd>
                  {INCIDENT_CHOICE_LABELS[incident.customerChoice] || incident.customerChoice}
                  {incident.customerRespondedAt
                    ? ` · ${formatVietnamDateTime(incident.customerRespondedAt)}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {incident.resolution ? (
              <div>
                <dt>Kết quả xử lý</dt>
                <dd>
                  {INCIDENT_RESOLUTION_LABELS[incident.resolution] || incident.resolution}
                  {incident.resolvedAt ? ` · ${formatVietnamDateTime(incident.resolvedAt)}` : ""}
                </dd>
              </div>
            ) : null}
            {Number(incident.compensationAmount) > 0 ? (
              <div>
                <dt>Bồi thường</dt>
                <dd>
                  {formatVnd(incident.compensationAmount)}
                  {incident.compensationPaidAt
                    ? ` · đã chi ${formatVietnamDateTime(incident.compensationPaidAt)}`
                    : " · chờ chi"}
                </dd>
              </div>
            ) : null}
          </dl>

          {incident.description ? (
            <p className="incident-detail__text">
              <strong>Mô tả:</strong> {incident.description}
            </p>
          ) : null}
          {incident.customerNote ? (
            <p className="incident-detail__text">
              <strong>Ghi chú của bạn:</strong> {incident.customerNote}
            </p>
          ) : null}
          {incident.resolutionNote ? (
            <p className="incident-detail__text">
              <strong>Ghi chú xử lý:</strong> {incident.resolutionNote}
            </p>
          ) : null}

          <Divider titlePlacement="start">Ảnh hiện trạng</Divider>
          <AttachmentList
            attachments={incident.attachments}
            emptyText="Chưa có ảnh hiện trạng."
            showThumbnails
          />
          {canUploadPhoto ? (
            <div className="section-card__actions">
              <FilePickButton
                accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
                loading={uploading}
                onSelect={handleUpload}
              >
                Gửi thêm ảnh
              </FilePickButton>
            </div>
          ) : null}

          {canRespond ? (
            <>
              <Divider titlePlacement="start">Bạn muốn xử lý thế nào?</Divider>
              {status === "CUSTOMER_RESPONDED" ? (
                <p className="section-card__hint">
                  Bạn đã chọn — vẫn đổi được cho tới khi quản lý kho quyết định.
                </p>
              ) : null}
              <Radio.Group
                className="incident-detail__choices"
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                options={getAllowedIncidentChoices(type).map((value) => ({
                  value,
                  label: INCIDENT_CHOICE_LABELS[value],
                }))}
              />
              <Input.TextArea
                rows={2}
                maxLength={500}
                placeholder="Ghi chú thêm cho nhân viên (không bắt buộc)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                style={{ marginTop: 10 }}
              />
              <div className="section-card__actions">
                <Button
                  type="primary"
                  disabled={!choice}
                  loading={submitting}
                  onClick={handleRespond}
                >
                  Gửi lựa chọn
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
