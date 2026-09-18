import { useRef } from "react";
import { Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";

/**
 * Nút chọn một file (ẩn thẻ input). Không tự tải lên — trả File cho nơi gọi để nơi gọi
 * kiểm định dạng/dung lượng và gọi đúng API của mình (giấy phép, ảnh sự cố...).
 *
 * @param {{ accept?: string, onSelect: (file: File) => void, loading?: boolean,
 *           disabled?: boolean, children?: import("react").ReactNode, type?: string }} props
 */
export default function FilePickButton({
  accept,
  onSelect,
  loading = false,
  disabled = false,
  children = "Chọn file",
  type = "default",
}) {
  const inputRef = useRef(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];

          /* Xoá giá trị để chọn lại đúng file đó (sau khi lỗi) vẫn bắn onChange. */
          event.target.value = "";

          if (file) onSelect?.(file);
        }}
      />
      <Button
        type={type}
        icon={<UploadOutlined />}
        loading={loading}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </Button>
    </>
  );
}
