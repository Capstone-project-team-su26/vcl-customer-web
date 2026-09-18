import { useEffect, useState } from "react";
import { Button, Empty, Image, Spin } from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";

import {
  ATTACHMENT_DOCUMENT_TYPE_LABELS,
  downloadAttachmentApi,
} from "@shared/api/attachmentApi";
import AuthNotify from "@shared/components/AuthNotify/AuthNotify";
import { getApiErrorMessage, isCanceledError } from "@shared/utils/apiError";
import {
  createObjectUrl,
  openBlobInNewTab,
  revokeObjectUrl,
  saveBlobAsFile,
} from "@shared/utils/fileDownload";
import { formatVietnamDateTime } from "@shared/utils/timeUtc";

import "./AttachmentList.css";

const isImage = (attachment) =>
  String(attachment?.contentType || "").toLowerCase().startsWith("image/");

const formatSize = (size) => {
  const bytes = Number(size);

  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Ảnh xem trước: tải Blob CÓ token rồi mới hiện — file riêng tư, <img src> trỏ thẳng
 * API sẽ bị 401 vì trình duyệt không gắn Authorization cho thẻ img.
 */
function AttachmentThumb({ attachment }) {
  const [state, setState] = useState({ url: null, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;

    downloadAttachmentApi(attachment, { signal: controller.signal })
      .then(({ blob }) => {
        objectUrl = createObjectUrl(blob);
        setState({ url: objectUrl, failed: !objectUrl });
      })
      .catch((error) => {
        if (!isCanceledError(error)) {
          setState({ url: null, failed: true });
        }
      });

    return () => {
      controller.abort();
      revokeObjectUrl(objectUrl);
    };
  }, [attachment]);

  if (state.failed) {
    return (
      <div className="attachment-list__thumb attachment-list__thumb--empty">
        <FileImageOutlined />
      </div>
    );
  }

  if (!state.url) {
    return (
      <div className="attachment-list__thumb attachment-list__thumb--empty">
        <Spin size="small" />
      </div>
    );
  }

  return (
    <Image
      className="attachment-list__thumb"
      src={state.url}
      alt={attachment?.fileName || "Ảnh đính kèm"}
      width={72}
      height={72}
    />
  );
}

/**
 * Danh sách giấy tờ đính kèm (AttachmentDto[]) — xem / tải về đều kèm Authorization.
 *
 * @param {{ attachments: object[], emptyText?: string, showThumbnails?: boolean }} props
 */
export default function AttachmentList({
  attachments = [],
  emptyText = "Chưa có giấy tờ nào.",
  showThumbnails = false,
}) {
  const [busyId, setBusyId] = useState(null);

  const handleOpen = async (attachment, mode) => {
    setBusyId(`${attachment.id}:${mode}`);

    try {
      const { blob, fileName } = await downloadAttachmentApi(attachment);

      if (mode === "view") {
        openBlobInNewTab(blob, fileName);
      } else {
        saveBlobAsFile(blob, fileName);
      }
    } catch (error) {
      AuthNotify.error("Không tải được giấy tờ", getApiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  if (!attachments.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }

  return (
    <ul className="attachment-list">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="attachment-list__item">
          {showThumbnails && isImage(attachment) ? (
            <AttachmentThumb attachment={attachment} />
          ) : (
            <div className="attachment-list__icon">
              {isImage(attachment) ? <FileImageOutlined /> : <FilePdfOutlined />}
            </div>
          )}

          <div className="attachment-list__meta">
            <strong title={attachment.fileName}>{attachment.fileName || "Tài liệu"}</strong>
            <span>
              {ATTACHMENT_DOCUMENT_TYPE_LABELS[attachment.documentType] ||
                attachment.documentType}
              {formatSize(attachment.size) ? ` · ${formatSize(attachment.size)}` : ""}
              {attachment.uploadedAt
                ? ` · ${formatVietnamDateTime(attachment.uploadedAt)}`
                : ""}
              {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
            </span>
            {attachment.note ? <em>{attachment.note}</em> : null}
          </div>

          <div className="attachment-list__actions">
            <Button
              size="small"
              icon={<EyeOutlined />}
              loading={busyId === `${attachment.id}:view`}
              onClick={() => handleOpen(attachment, "view")}
            >
              Xem
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={busyId === `${attachment.id}:save`}
              onClick={() => handleOpen(attachment, "save")}
            >
              Tải về
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
