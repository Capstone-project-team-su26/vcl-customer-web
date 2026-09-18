import { useEffect, useState } from "react";
import { Alert, Spin } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";

import SectionCard from "@shared/components/SectionCard/SectionCard";
import AttachmentList from "@shared/components/AttachmentList/AttachmentList";
import FilePickButton from "@shared/components/FilePickButton/FilePickButton";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import {
  ATTACHMENT_ACCEPT_ATTRIBUTE,
  ATTACHMENT_DOCUMENT_TYPES,
  ATTACHMENT_ENTITY_TYPES,
  getAttachmentsApi,
  uploadAttachmentApi,
  validateAttachmentFile,
} from "@shared/api/attachmentApi";

/**
 * Giấy phép hàng hạn chế của đơn (tài liệu xuất kho mục J).
 *
 * Kiện có hàng hạn chế mà đơn chưa có PERMIT thì kho KHÔNG xuất được (lý do
 * RESTRICTED_NO_PERMIT) — khách tự tải giấy phép lên đây để khỏi phải gửi qua Zalo/email.
 * Khách chỉ tải lên được PERMIT; giấy tờ không có API xoá, sai thì tải bản đúng bổ sung.
 *
 * @param {{ orderId: string, refreshKey?: number }} props
 */
export default function OrderPermitCard({ orderId, refreshKey = 0 }) {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [uploading, setUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getAttachmentsApi(ATTACHMENT_ENTITY_TYPES.ORDER, orderId, { signal: controller.signal })
      .then((items) => setState({ loading: false, items, error: "" }))
      .catch((error) => {
        if (!isCanceledError(error)) {
          setState({ loading: false, items: [], error: getApiErrorMessage(error) });
        }
      });

    return () => controller.abort();
  }, [orderId, refreshKey, reloadKey]);

  const handleSelect = async (file) => {
    const invalid = validateAttachmentFile(file);

    if (invalid) {
      AuthNotify.warning("File không hợp lệ", invalid);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadAttachmentApi({
        file,
        entityType: ATTACHMENT_ENTITY_TYPES.ORDER,
        entityId: orderId,
        documentType: ATTACHMENT_DOCUMENT_TYPES.PERMIT,
      });

      AuthNotify.success(result?.message || "Tải giấy tờ lên thành công.", file.name);
      setReloadKey((key) => key + 1);
    } catch (error) {
      AuthNotify.error("Không tải được giấy phép", getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SectionCard
      icon={<SafetyCertificateOutlined />}
      title="Giấy phép hàng hạn chế"
      subtitle="Đơn có hàng thuộc danh mục hạn chế cần giấy phép thì kho mới xuất được. PDF, JPG, PNG, WEBP — tối đa 10 MB."
      extra={
        <FilePickButton
          type="primary"
          accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
          loading={uploading}
          onSelect={handleSelect}
        >
          Tải giấy phép lên
        </FilePickButton>
      }
    >
      {state.loading ? (
        <Spin />
      ) : state.error ? (
        <Alert type="error" showIcon title={state.error} />
      ) : (
        <AttachmentList
          attachments={state.items}
          emptyText="Đơn chưa có giấy tờ nào."
        />
      )}
    </SectionCard>
  );
}
