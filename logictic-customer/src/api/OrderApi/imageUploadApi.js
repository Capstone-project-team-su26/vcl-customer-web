const UPLOAD_URL =
  import.meta.env.VITE_IMAGE_UPLOAD_URL || "/api/image-upload";

const MAX_REFERENCE_URL_LENGTH = 500;

export const uploadPackageImage = async (file) => {
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", file);

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload ảnh thất bại (HTTP ${response.status}).`);
  }

  const imageUrl = (await response.text()).trim();

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error("Máy chủ upload trả về URL không hợp lệ.");
  }

  if (imageUrl.length > MAX_REFERENCE_URL_LENGTH) {
    throw new Error("URL ảnh quá dài để lưu vào đơn hàng.");
  }

  return imageUrl;
};
