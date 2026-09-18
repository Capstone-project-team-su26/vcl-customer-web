import { useState } from "react";
import { Alert, Button, Input, Modal, Tag } from "antd";
import { PauseCircleOutlined, PlayCircleOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage } from "@shared/utils/apiError";
import { setExportHoldApi } from "@features/tracking/api/orderTrackingApi";
import { isOriginStage } from "@features/tracking/constants/trackingStages";

/**
 * Giữ hàng tại kho nguồn (tài liệu xuất kho mục K).
 *
 * Hàng ký gửi mặc định đi chuyến gần nhất; bật giữ hàng thì kho không đưa kiện của đơn
 * vào phiếu xuất MỚI. Kiện đã nằm trong phiếu xuất đã duyệt thì cờ này không kéo lại
 * được — server trả danh sách `parcelsAlreadyInApprovedRelease` và ta PHẢI hiện cho
 * khách, kẻo khách tưởng đã dừng được hàng.
 *
 * @param {{ orderId: string, exportHold: boolean, exportHoldReason?: string,
 *           stage?: string, onChanged?: () => void }} props
 */
export default function ExportHoldCard({
  orderId,
  exportHold,
  exportHoldReason,
  stage,
  onChanged,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [lockedParcels, setLockedParcels] = useState([]);

  /* Hàng đã rời kho nguồn thì giữ hàng không còn ý nghĩa — chỉ cho TẮT nếu đang bật. */
  const canEnable = isOriginStage(stage);

  const submit = async (hold) => {
    setSaving(true);

    try {
      const result = await setExportHoldApi(orderId, { hold, reason });

      setLockedParcels(result.parcelsAlreadyInApprovedRelease);
      setModalOpen(false);
      setReason("");

      AuthNotify.success(
        result.message || (hold ? "Đã bật giữ hàng." : "Đã tắt giữ hàng."),
        hold
          ? "Kho sẽ không đưa hàng của đơn vào phiếu xuất mới cho tới khi bạn tắt giữ hàng."
          : "Hàng sẽ được xếp lên chuyến gần nhất.",
      );

      onChanged?.();
    } catch (error) {
      AuthNotify.error(
        hold ? "Không bật được giữ hàng" : "Không tắt được giữ hàng",
        getApiErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!exportHold && !canEnable && lockedParcels.length === 0) {
    return null;
  }

  return (
    <SectionCard
      icon={exportHold ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
      tone={exportHold ? "warning" : "default"}
      title="Giữ hàng tại kho nguồn"
      subtitle={
        exportHold
          ? "Hàng của đơn đang được giữ lại, chưa lên chuyến."
          : "Muốn gộp chuyến sau hoặc chờ thêm hàng? Bật giữ hàng để kho chưa xuất đơn này."
      }
      extra={
        exportHold ? (
          <Button loading={saving} onClick={() => submit(false)}>
            Tắt giữ hàng
          </Button>
        ) : (
          <Button type="primary" disabled={!canEnable} onClick={() => setModalOpen(true)}>
            Bật giữ hàng
          </Button>
        )
      }
    >
      {exportHold ? (
        <p className="section-card__hint">
          <Tag color="orange">Đang giữ hàng</Tag>
          Lý do: {exportHoldReason || "—"}
        </p>
      ) : null}

      {lockedParcels.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          title="Một số kiện vẫn sẽ đi theo chuyến đã lên lịch"
          description={
            <>
              Các kiện sau đã nằm trong phiếu xuất kho đã được duyệt nên giữ hàng không dừng
              được: <strong>{lockedParcels.join(", ")}</strong>. Nếu cần dừng hẳn, vui lòng liên
              hệ nhân viên để kho bỏ kiện khỏi phiếu.
            </>
          }
        />
      ) : null}

      <Modal
        open={modalOpen}
        title="Bật giữ hàng tại kho nguồn"
        okText="Bật giữ hàng"
        cancelText="Huỷ"
        confirmLoading={saving}
        onOk={() => submit(true)}
        onCancel={() => setModalOpen(false)}
        okButtonProps={{ disabled: !reason.trim() }}
        destroyOnHidden
      >
        <p>Ghi lý do để kho biết vì sao hàng không lên chuyến (bắt buộc).</p>
        <Input.TextArea
          rows={3}
          maxLength={500}
          showCount
          value={reason}
          placeholder="Ví dụ: Tôi muốn gộp chuyến sau với đơn khác"
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </SectionCard>
  );
}
