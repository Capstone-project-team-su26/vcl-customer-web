import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LeftOutlined, 
  EnvironmentOutlined, 
  SafetyCertificateOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  CloudUploadOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { Switch } from "antd";
import "./ConsignmentOrder.css";

import AuthNotify from "../../../../utils/AuthNotify"; 
import { createConsignmentApi } from "../../../../api/OrderApi/consignmentApi";
import { uploadPackageImage } from "../../../../api/OrderApi/imageUploadApi";
import { compressImage } from "../../../../utils/compressImage";

const createEmptyPackage = () => ({
  id: Date.now() + Math.random(),
  productName: "",
  productType: "Electronics",
  quantity: "",
  weight: "",
  width: "",
  height: "",
  length: "",
  declaredValue: "",
  trackingCode: "",
  note: "",
  images: []
});

export default function ConsignmentOrder() {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});

  // Trạng thái hiển thị UI
  const [inspectPackage, setInspectPackage] = useState(true);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Thông tin người nhận & Địa chỉ
  const [receiverName, setReceiverName] = useState("Nguyen Van A");
  const [receiverPhone, setReceiverPhone] = useState("0901234567");
  const [addressList, setAddressList] = useState([
    "123 Le Loi, Quan 1, TP.HCM",
    "Số 45, Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"
  ]);
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState("123 Le Loi, Quan 1, TP.HCM");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");

  const [packages, setPackages] = useState([createEmptyPackage()]);

  const handleSaveAddress = () => {
    const trimmed = newAddressInput.trim();
    if (!trimmed) {
      AuthNotify.warning("Thiếu địa chỉ", "Vui lòng nhập địa chỉ nhận hàng.");
      return;
    }
    if (addressList.includes(trimmed)) {
      AuthNotify.warning("Trùng địa chỉ", "Địa chỉ này đã có trong danh sách.");
      return;
    }
    setAddressList((prev) => [...prev, trimmed]);
    setSelectedDeliveryAddress(trimmed);
    setNewAddressInput("");
    setIsAddingAddress(false);
    AuthNotify.success("Đã thêm địa chỉ", "Địa chỉ nhận hàng mới đã được lưu.");
  };

  const handleCancelAddAddress = () => {
    setNewAddressInput("");
    setIsAddingAddress(false);
  };

  const validateForm = () => {
    if (!receiverName.trim()) {
      AuthNotify.warning("Thiếu thông tin", "Vui lòng nhập tên người nhận.");
      return false;
    }

    const phone = receiverPhone.trim();
    if (!phone || !/^0\d{9}$/.test(phone)) {
      AuthNotify.warning("Thiếu thông tin", "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      return false;
    }

    if (!selectedDeliveryAddress) {
      AuthNotify.warning("Chưa chọn địa chỉ", "Vui lòng chọn hoặc thêm địa chỉ nhận hàng.");
      return false;
    }

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const label = `kiện ${i + 1}`;

      if (!pkg.productName.trim()) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập tên sản phẩm cho ${label}.`);
        return false;
      }
      if (!pkg.productType) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng chọn loại hàng hóa cho ${label}.`);
        return false;
      }
      if (!pkg.quantity || parseInt(pkg.quantity, 10) < 1) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập số lượng hợp lệ cho ${label}.`);
        return false;
      }
      if (pkg.declaredValue === "" || pkg.declaredValue === null || isNaN(parseFloat(pkg.declaredValue))) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập giá trị khai báo cho ${label}.`);
        return false;
      }
      if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập cân nặng cho ${label}.`);
        return false;
      }
      if (!pkg.length || parseFloat(pkg.length) <= 0) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập chiều dài cho ${label}.`);
        return false;
      }
      if (!pkg.width || parseFloat(pkg.width) <= 0) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập chiều rộng cho ${label}.`);
        return false;
      }
      if (!pkg.height || parseFloat(pkg.height) <= 0) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập chiều cao cho ${label}.`);
        return false;
      }
      if (!pkg.note.trim()) {
        AuthNotify.warning("Thiếu thông tin", `Vui lòng nhập ghi chú cho ${label}.`);
        return false;
      }
      if (pkg.images.length === 0) {
        AuthNotify.warning("Thiếu ảnh", `Vui lòng tải ảnh sản phẩm cho ${label}.`);
        return false;
      }
    }

    return true;
  };

  const handleDropzoneClick = (packageId) => {
    fileInputRefs.current[packageId]?.click();
  };

  const handleFileChange = (packageId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const oversized = files.filter((file) => file.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      AuthNotify.warning("Ảnh quá lớn", "Mỗi ảnh tối đa 5MB.");
      e.target.value = "";
      return;
    }

    const newImageObjects = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      fileObj: file,
      previewUrl: URL.createObjectURL(file)
    }));

    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, images: [...pkg.images, ...newImageObjects] }
          : pkg
      )
    );

    AuthNotify.success("Đã chọn ảnh", `Đã thêm ${files.length} ảnh cho kiện hàng.`);
    e.target.value = "";
  };

  const handleRemoveImage = (e, packageId, targetId, previewUrl) => {
    e.stopPropagation();
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, images: pkg.images.filter((img) => img.id !== targetId) }
          : pkg
      )
    );
    URL.revokeObjectURL(previewUrl);
  };

  const revokePackageImages = (pkg) => {
    pkg.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
  };

  const handleAddPackage = () => {
    setPackages((prev) => [...prev, createEmptyPackage()]);
  };

  const handleDeletePackage = (id) => {
    if (packages.length > 1) {
      const target = packages.find((pkg) => pkg.id === id);
      if (target) revokePackageImages(target);
      setPackages(packages.filter((pkg) => pkg.id !== id));
      delete fileInputRefs.current[id];
    } else {
      AuthNotify.warning("Không thể xóa", "Yêu cầu tối thiểu có 1 kiện hàng.");
    }
  };

  const handleInputChange = (id, field, value) => {
    setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, [field]: value } : pkg));
  };

  const handleCreateOrder = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const unifiedNote = packages
        .map((p) => p.note.trim() ? p.note.trim() : "")
        .filter(Boolean)
        .join(", ") || "Hang ky gui";

      const items = await Promise.all(
        packages.map(async (pkg, index) => {
          let referenceUrl = null;

          if (pkg.images.length > 0) {
            try {
              const compressedFile = await compressImage(pkg.images[0].fileObj);
              referenceUrl = await uploadPackageImage(compressedFile);
            } catch (uploadError) {
              console.error("Upload ảnh thất bại:", uploadError);
              throw new Error(
                `Không upload được ảnh kiện ${index + 1}. Vui lòng thử lại hoặc chọn ảnh nhỏ hơn.`
              );
            }
          }

          return {
            productName: pkg.productName.trim(),
            productType: pkg.productType,
            quantity: parseInt(pkg.quantity, 10) || 1,
            weight: parseFloat(pkg.weight) || 0,
            width: parseFloat(pkg.width) || 0,
            height: parseFloat(pkg.height) || 0,
            length: parseFloat(pkg.length) || 0,
            declaredValue: parseFloat(pkg.declaredValue) || 0,
            referenceUrl,
            domesticTrackingCode: pkg.trackingCode.trim() || null
          };
        })
      );

      const orderPayload = {
        route: "TQ-VN",
        shippingOption: "Express",
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        receiverAddress: selectedDeliveryAddress,
        requiresInspection: !!inspectPackage,
        note: unifiedNote,
        items
      };

      const result = await createConsignmentApi(orderPayload);
      
      if (result) {
        AuthNotify.success("Tạo đơn thành công", "Đơn hàng ký gửi đã được tiếp nhận.");
        navigate("/processing-orders");
      }
    } catch (error) {
      console.error("Lỗi tạo đơn ký gửi:", error);
      const backendErrors = error.response?.data?.errors;
      const status = error.response?.status;
      const msg = error.message?.includes("upload")
        ? error.message
        : backendErrors
        ? Object.entries(backendErrors).map(([key, val]) => `${key}: ${val}`).join(" | ")
        : error.response?.data?.message ||
          (status === 500
            ? "Máy chủ xử lý thất bại. Kiểm tra lại ảnh hoặc thử không đính kèm ảnh."
            : "Không thể tạo đơn ký gửi. Vui lòng thử lại.");

      AuthNotify.error("Giao dịch thất bại", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="consignment-container">
      
      <div className="back-navigation" onClick={() => navigate(-1)}>
        <LeftOutlined className="back-icon" />
        <span>QUAY LẠI</span>
      </div>

      <div className="consignment-layout-grid">
        
        {/* ================= CỘT TRÁI (THÔNG TIN ĐỊA CHỈ) ================= */}
        <div className="layout-left-fixed-sidebar">
          <div className="page-header-title-box">
            <div className="title-icon-orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div className="title-text-group">
              <h2>KÝ GỬI HÀNG HÓA</h2>
              <p>TẠO ĐƠN HÀNG MỚI</p>
            </div>
          </div>

          <div className="left-unified-wrapper-box">
            <div className="left-inner-section">
              <label className="field-label"><EnvironmentOutlined /> TUYẾN HÀNG</label>
              <div className="static-display-box font-bold-dark">Trung Quốc - Việt Nam (TQ-VN)</div>
            </div>

            <div className="left-inner-section border-top-dash">
              <label className="field-label"><EnvironmentOutlined /> HÌNH THỨC VẬN CHUYỂN</label>
              <div className="static-display-box font-bold-dark">Hỏa tốc (Express)</div>
            </div>

            <div className="left-inner-section border-top-dash">
              <div className="input-field-group" style={{ marginBottom: "12px" }}>
                <label className="field-label required-label">TÊN NGƯỜI NHẬN</label>
                <input type="text" className="custom-input" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
              </div>
              <div className="input-field-group">
                <label className="field-label required-label">SỐ ĐIỆN THOẠI</label>
                <input type="text" className="custom-input" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
              </div>
            </div>

            <div className="left-inner-section border-top-dash">
              <label className="field-label"><EnvironmentOutlined /> ĐỊA CHỈ ĐANG CHỌN</label>
              <div className="static-display-box address-received-highlight">{selectedDeliveryAddress}</div>
            </div>

            <div className="left-inner-section border-top-dash">
              <div className="inner-section-title required-label">CHỌN ĐỊA CHỈ NHẬN HÀNG</div>

              {!isAddingAddress ? (
                <>
                  <button
                    type="button"
                    className="btn-add-address"
                    onClick={() => setIsAddingAddress(true)}
                  >
                    <PlusOutlined /> THÊM ĐỊA CHỈ NHẬN HÀNG
                  </button>

                  <div className="address-scroll-container">
                    {addressList.map((addr, idx) => (
                      <div
                        key={idx}
                        className={`address-item-clickable ${selectedDeliveryAddress === addr ? "is-active" : ""}`}
                        onClick={() => setSelectedDeliveryAddress(addr)}
                      >
                        <span className="address-text-truncate">{addr}</span>
                        {selectedDeliveryAddress === addr && <CheckOutlined className="check-active-icon" />}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="add-address-inline-form">
                  <label className="field-label required-label">ĐỊA CHỈ NHẬN HÀNG MỚI</label>
                  <input
                    type="text"
                    className="custom-input small-input"
                    placeholder="Nhập địa chỉ nhận hàng..."
                    value={newAddressInput}
                    onChange={(e) => setNewAddressInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveAddress()}
                  />
                  <div className="inline-form-actions">
                    <button type="button" className="btn-inline-cancel" onClick={handleCancelAddAddress}>
                      Hủy
                    </button>
                    <button type="button" className="btn-inline-save" onClick={handleSaveAddress}>
                      <CheckOutlined /> Lưu địa chỉ
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="left-inner-section border-top-dash toggle-row">
              <div className="toggle-icon-box"><SafetyCertificateOutlined className="shield-icon" /></div>
              <div className="toggle-text-info">
                <h4>YÊU CẦU KIỂM HÀNG</h4>
                <p>Khai mở kiểm đếm số lượng thực tế tại kho.</p>
              </div>
              <Switch checked={inspectPackage} onChange={(val) => setInspectPackage(val)} />
            </div>
          </div>
        </div>

        {/* ================= CỘT PHẢI (FORM NHẬP KIỆN HÀNG & UPLOAD ẢNH) ================= */}
        <div className="layout-right-scrollable-form">
          <div className="scrollable-content-wrapper">
            
            {packages.map((pkg, index) => (
              <div className="form-main-card" key={pkg.id} style={{ marginBottom: "1.5rem" }}>
                <div className="form-step-header">
                  <div className="step-header-left">
                    <div className="step-number-circle">{index + 1}</div>
                    <h3>THÔNG TIN SẢN PHẨM KIỆN THỨ {index + 1}</h3>
                  </div>
                  {packages.length > 1 && (
                    <button type="button" className="btn-delete-package" onClick={() => handleDeletePackage(pkg.id)}>
                      <DeleteOutlined /> Xóa kiện
                    </button>
                  )}
                </div>

                <div className="form-row-2col">
                  <div className="input-field-group">
                    <label className="field-label required-label">TÊN SẢN PHẨM</label>
                    <input type="text" placeholder="Nhập tên sản phẩm..." className="custom-input" value={pkg.productName} onChange={(e) => handleInputChange(pkg.id, "productName", e.target.value)} />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">LOẠI HÀNG HÓA</label>
                    <select className="custom-select" value={pkg.productType} onChange={(e) => handleInputChange(pkg.id, "productType", e.target.value)}>
                      <option value="Electronics">Electronics (Thiết bị điện tử)</option>
                      <option value="Accessories">Accessories (Phụ kiện)</option>
                      <option value="Clothes">Clothes (Quần áo / Giày dép)</option>
                      <option value="Cosmetics">Cosmetics (Mỹ phẩm)</option>
                      <option value="Others">Others (Khác)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="input-field-group">
                    <label className="field-label required-label">SỐ LƯỢNG</label>
                    <input type="number" className="custom-input" placeholder="Nhập số lượng sản phẩm..." min={1} value={pkg.quantity} onChange={(e) => handleInputChange(pkg.id, "quantity", e.target.value)} />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">GIÁ TRỊ KHAI BÁO (VND)</label>
                    <input type="number" className="custom-input" placeholder="Nhập giá trị khai báo..." min={0} value={pkg.declaredValue} onChange={(e) => handleInputChange(pkg.id, "declaredValue", e.target.value)} />
                  </div>
                </div>

                <div className="form-row-4col">
                  <div className="input-field-group">
                    <label className="field-label required-label">CÂN NẶNG (KG)</label>
                    <input type="number" step="0.01" placeholder="Nhập cân nặng..." className="custom-input" min={0.01} value={pkg.weight} onChange={(e) => handleInputChange(pkg.id, "weight", e.target.value)} />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">DÀI (CM)</label>
                    <input type="number" className="custom-input" placeholder="Nhập chiều dài..." min={1} value={pkg.length} onChange={(e) => handleInputChange(pkg.id, "length", e.target.value)} />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">RỘNG (CM)</label>
                    <input type="number" className="custom-input" placeholder="Nhập chiều rộng..." min={1} value={pkg.width} onChange={(e) => handleInputChange(pkg.id, "width", e.target.value)} />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">CAO (CM)</label>
                    <input type="number" className="custom-input" placeholder="Nhập chiều cao..." min={1} value={pkg.height} onChange={(e) => handleInputChange(pkg.id, "height", e.target.value)} />
                  </div>
                </div>

                <div className="input-field-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="field-label">MÃ VẬN ĐƠN NỘI ĐỊA (DOMESTIC TRACKING CODE)</label>
                  <input type="text" placeholder="Bỏ trống nếu chưa có mã..." className="custom-input" value={pkg.trackingCode} onChange={(e) => handleInputChange(pkg.id, "trackingCode", e.target.value)} />
                </div>

                <div className="input-field-group">
                  <label className="field-label required-label">GHI CHÚ KIỆN HÀNG</label>
                  <textarea placeholder="Mô tả đặc điểm ghi chú bổ sung cho kiện hàng..." className="custom-textarea" rows={2} value={pkg.note} onChange={(e) => handleInputChange(pkg.id, "note", e.target.value)}></textarea>
                </div>

                <div className="input-field-group package-image-section">
                  <label className="field-label required-label">ẢNH SẢN PHẨM KIỆN {index + 1}</label>

                  <input
                    type="file"
                    ref={(el) => {
                      fileInputRefs.current[pkg.id] = el;
                    }}
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileChange(pkg.id, e)}
                  />

                  <div className="upload-dropzone-box-clickable" onClick={() => handleDropzoneClick(pkg.id)}>
                    <CloudUploadOutlined className="upload-big-icon" />
                    <span className="upload-main-text">Bấm để chọn ảnh cho kiện hàng này</span>
                    <span className="upload-sub-text">Hỗ trợ file ảnh JPG, PNG (tối đa 5MB/ảnh)</span>
                  </div>

                  {pkg.images.length > 0 && (
                    <div className="image-previews-grid animation-fade-in">
                      {pkg.images.map((img) => (
                        <div
                          key={img.id}
                          className="preview-image-item"
                          onClick={() => setActiveLightboxImg(img.previewUrl)}
                        >
                          <img src={img.previewUrl} alt={`Kiện ${index + 1}`} />
                          <button
                            type="button"
                            className="btn-remove-preview-img"
                            onClick={(e) => handleRemoveImage(e, pkg.id, img.id, img.previewUrl)}
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="add-package-dashed-trigger" onClick={handleAddPackage}>
              <PlusCircleOutlined className="plus-dashed-icon" />
              <span>THÊM KIỆN HÀNG MỚI</span>
            </div>

            <div className="sticky-action-notice-bar">
              <div className="notice-left-message">
                <InfoCircleOutlined className="info-notice-icon" />
                <p><strong>LƯU Ý:</strong> Đơn hàng sẽ được nhân viên VCL kiểm tra và xác nhận lại thông tin trước khi xử lý.</p>
              </div>
              <button
                type="button"
                className="btn-final-submit-order"
                onClick={handleCreateOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? "ĐANG TẠO ĐƠN..." : "TẠO ĐƠN HÀNG NGAY"}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL XEM ẢNH LỚN LIGHTBOX */}
      {activeLightboxImg && (
        <div className="lightbox-overlay-modal" onClick={() => setActiveLightboxImg(null)}>
          <div className="lightbox-content-box animate-zoom-in">
            <img src={activeLightboxImg} alt="Phóng to" className="lightbox-main-img" />
          </div>
          <span className="lightbox-hint-text">Bấm vào vùng trống để đóng cửa sổ</span>
        </div>
      )}

    </div>
  );
}