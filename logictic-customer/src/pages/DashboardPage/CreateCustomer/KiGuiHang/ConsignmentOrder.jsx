import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LeftOutlined, 
  EnvironmentOutlined, 
  PlusOutlined, 
  PictureOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusCircleOutlined
} from "@ant-design/icons";
import { Switch } from "antd";
import "./ConsignmentOrder.css";

export default function ConsignmentOrder() {
  const navigate = useNavigate();
  const [inspectPackage, setInspectPackage] = useState(false);

  // 1. State quản lý địa chỉ
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [savedAddress, setSavedAddress] = useState("");

  // 2. State quản lý DANH SÁCH KIỆN HÀNG bên cột phải
  const [packages, setPackages] = useState([
    { id: Date.now(), productName: "", productType: "", quantity: 1, trackingCode: "", otherFee: "", surcharge: "" }
  ]);

  // Hàm xử lý lưu địa chỉ
  const handleSaveAddress = () => {
    if (newAddressInput.trim() !== "") {
      setSavedAddress(newAddressInput.trim());
      setIsAddingAddress(false);
      setNewAddressInput("");
    }
  };

  // Hàm thêm một form kiện hàng mới
  const handleAddPackage = () => {
    const newPkg = {
      id: Date.now(), // Tạo key định danh duy nhất
      productName: "",
      productType: "",
      quantity: 1,
      trackingCode: "",
      otherFee: "",
      surcharge: ""
    };
    setPackages([...packages, newPkg]);
  };

  // Hàm xóa kiện hàng theo ID (Chỉ cho xóa nếu danh sách có nhiều hơn 1 kiện)
  const handleDeletePackage = (id) => {
    if (packages.length > 1) {
      setPackages(packages.filter(pkg => pkg.id !== id));
    } else {
      alert("Đơn hàng ký gửi phải có ít nhất 1 kiện hàng!");
    }
  };

  // Hàm cập nhật dữ liệu khi gõ vào từng ô input của từng kiện hàng cụ thể
  const handleInputChange = (id, field, value) => {
    setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, [field]: value } : pkg));
  };

  const handleCreateOrder = () => {
    console.log("Dữ liệu gửi đi:", { savedAddress, inspectPackage, packages });
    alert("Tiến hành tạo đơn hàng thành công!");
  };

  return (
    <div className="consignment-container">
      
      {/* NÚT QUAY LẠI TRÊN CÙNG */}
      <div className="back-navigation" onClick={() => navigate(-1)}>
        <LeftOutlined className="back-icon" />
        <span>QUAY LẠI</span>
      </div>

      {/* KHU VỰC CHÍNH CHIA LÀM 2 BÊN CHUẨN UX */}
      <div className="consignment-layout-grid">
        
        {/* ================= BÊN TRÁI: KHỐI CỐ ĐỊNH (KHÔNG CUỘN) ================= */}
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
              <div className="input-field-group">
                <label className="field-label yellow-label"><EnvironmentOutlined /> TUYẾN HÀNG</label>
                <select className="custom-select">
                  <option value="cn-vn">Trung Quốc - Việt Nam</option>
                </select>
              </div>

              <div className="input-field-group" style={{ marginTop: "1rem" }}>
                <label className="field-label yellow-label"><EnvironmentOutlined /> ĐỊA CHỈ NHẬN HÀNG</label>
                <select 
                  className={`custom-select ${!savedAddress ? "select-disabled-bold" : ""}`} 
                  disabled={!savedAddress}
                >
                  {savedAddress ? (
                    <option value="saved">{savedAddress}</option>
                  ) : (
                    <option value="">CHƯA CÓ ĐỊA CHỈ - VUI LÒNG THÊM MỚI</option>
                  )}
                </select>
              </div>
            </div>

            <div className="left-inner-section border-top-dash">
              <div className="inner-section-title">QUẢN LÝ ĐỊA CHỈ GIAO HÀNG</div>
              {!isAddingAddress ? (
                <button className="btn-add-address" onClick={() => setIsAddingAddress(true)}>
                  <PlusOutlined /> THÊM ĐỊA CHỈ MỚI
                </button>
              ) : (
                <div className="add-address-inline-form">
                  <input 
                    type="text" 
                    placeholder="Nhập địa chỉ nhận hàng chi tiết..." 
                    className="custom-input small-input"
                    value={newAddressInput}
                    onChange={(e) => setNewAddressInput(e.target.value)}
                  />
                  <div className="inline-form-actions">
                    <button className="btn-inline-save" onClick={handleSaveAddress}>
                      <CheckOutlined /> Xác nhận
                    </button>
                    <button className="btn-inline-cancel" onClick={() => setIsAddingAddress(false)}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {savedAddress && (
              <div className="left-inner-section border-top-dash animation-fade-in">
                <div className="inner-section-title">CHỌN ĐỊA CHỈ GIAO HÀNG</div>
                <p className="sub-helper-text"><EnvironmentOutlined /> Nhấn vào địa chỉ để chọn</p>
                <div className="address-item-selected">
                  {savedAddress}
                </div>
              </div>
            )}

            <div className="left-inner-section border-top-dash toggle-row">
              <div className="toggle-icon-box">
                <SafetyCertificateOutlined className="shield-icon" />
              </div>
              <div className="toggle-text-info">
                <h4>YÊU CẦU KIỂM HÀNG</h4>
                <p>TixiMax sẽ mở kiện hàng để kiểm tra số lượng và tình trạng.</p>
              </div>
              <div className="toggle-action">
                <Switch checked={inspectPackage} onChange={(val) => setInspectPackage(val)} />
              </div>
            </div>
          </div>
        </div>

        {/* ================= BÊN PHẢI: KHỐI CUỘN ĐỘC LẬP CHỨA HOÀN TOÀN CÁC KIỆN ================= */}
        <div className="layout-right-scrollable-form">
          <div className="scrollable-content-wrapper">
            
            {/* Lặp danh sách các kiện hàng từ State */}
            {packages.map((pkg, index) => (
              <div className="form-main-card animation-fade-in" key={pkg.id} style={{ marginBottom: "1.5rem" }}>
                
                {/* Tiêu đề kiện hàng + Nút xóa bên phải */}
                <div className="form-step-header">
                  <div className="step-header-left">
                    <div className="step-number-circle">{index + 1}</div>
                    <h3>THÔNG TIN KIỆN KÝ GỬI THỨ {index + 1}</h3>
                  </div>
                  
                  {/* Icon Thùng rác xóa kiện (Chỉ hiện khi tổng số kiện > 1) */}
                  {packages.length > 1 && (
                    <button className="btn-delete-package" onClick={() => handleDeletePackage(pkg.id)} title="Xóa kiện hàng này">
                      <DeleteOutlined /> Xóa kiện
                    </button>
                  )}
                </div>

                {/* Hàng 1 */}
                <div className="form-row-2col">
                  <div className="input-field-group">
                    <label className="field-label required-label">TÊN SẢN PHẨM</label>
                    <input 
                      type="text" 
                      placeholder="Nhập tên sản phẩm..." 
                      className="custom-input"
                      value={pkg.productName}
                      onChange={(e) => handleInputChange(pkg.id, "productName", e.target.value)}
                    />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label required-label">LOẠI HÀNG HÓA</label>
                    <select 
                      className="custom-select"
                      value={pkg.productType}
                      onChange={(e) => handleInputChange(pkg.id, "productType", e.target.value)}
                    >
                      <option value="">Chọn loại sản phẩm...</option>
                      <option value="electronics">Thiết bị điện tử</option>
                      <option value="clothes">Quần áo / Giày dép</option>
                    </select>
                  </div>
                </div>

                {/* Hàng 2 */}
                <div className="form-row-2col">
                  <div className="input-field-group">
                    <label className="field-label required-label">SỐ LƯỢNG</label>
                    <input 
                      type="number" 
                      className="custom-input" 
                      min={1} 
                      value={pkg.quantity}
                      onChange={(e) => handleInputChange(pkg.id, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label">MÃ VẬN ĐƠN</label>
                    <input 
                      type="text" 
                      placeholder="Mã vận đơn (nếu có)..." 
                      className="custom-input"
                      value={pkg.trackingCode}
                      onChange={(e) => handleInputChange(pkg.id, "trackingCode", e.target.value)}
                    />
                  </div>
                </div>

                {/* Hàng 3 */}
                <div className="form-row-2col">
                  <div className="input-field-group">
                    <label className="field-label">PHÍ KHÁC</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="custom-input"
                      value={pkg.otherFee}
                      onChange={(e) => handleInputChange(pkg.id, "otherFee", e.target.value)}
                    />
                  </div>
                  <div className="input-field-group">
                    <label className="field-label">PHỤ THU</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="custom-input"
                      value={pkg.surcharge}
                      onChange={(e) => handleInputChange(pkg.id, "surcharge", e.target.value)}
                    />
                  </div>
                </div>

                {/* Vùng Upload Ảnh */}
                <div className="input-field-group" style={{ marginTop: "1rem" }}>
                  <label className="field-label">ẢNH SẢN PHẨM</label>
                  <div className="upload-dropzone-box">
                    <PictureOutlined className="upload-big-icon" />
                    <span className="upload-main-text">Tải ảnh sản phẩm</span>
                    <span className="upload-sub-text">Chọn ảnh để upload (tối đa 5MB)</span>
                  </div>
                  <button className="btn-trigger-upload">Chọn ảnh</button>
                </div>
              </div>
            ))}

            {/* NÚT THÊM KIỆN HÀNG (VIỀN NÉT ĐỨT KHÔNG KHÍ TRONG ẢNH MẪU) */}
            <div className="add-package-dashed-trigger" onClick={handleAddPackage}>
              <PlusCircleOutlined className="plus-dashed-icon" />
              <span>THÊM KIỆN HÀNG</span>
            </div>

            {/* THANH LƯU Ý CỐ ĐỊNH KÈM NÚT TẠO ĐƠN Ở ĐÁY FILE */}
            <div className="sticky-action-notice-bar">
              <div className="notice-left-message">
                <InfoCircleOutlined className="info-notice-icon" />
                <p>
                  <strong>LƯU Ý:</strong> ĐƠN HÀNG SẼ ĐƯỢC NHÂN VIÊN VCL KIỂM TRA VÀ XÁC NHẬN LẠI THÔNG TIN TRƯỚC KHI THỰC HIỆN MUA HÀNG HOẶC XỬ LÝ.
                </p>
              </div>
              <button className="btn-final-submit-order" onClick={handleCreateOrder}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginRight: '6px'}}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                TẠO ĐƠN HÀNG
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}