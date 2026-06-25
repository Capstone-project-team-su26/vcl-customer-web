import React, { useState } from "react";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";


export default function CreateOrder() {
  const [links, setLinks] = useState([{ id: 1, url: "", name: "", quantity: 1, note: "" }]);

  const addMoreLink = () => {
    setLinks([...links, { id: Date.now(), url: "", name: "", quantity: 1, note: "" }]);
  };

  const removeLink = (id) => {
    if (links.length > 1) {
      setLinks(links.filter(item => item.id !== id));
    }
  };

  return (
    <div className="create-order-page">
      <div className="page-header">
        <h2>Tạo đơn hàng mua hộ</h2>
        <p>Nhập liên kết sản phẩm (Taobao, 1688, Tmall...) để chúng tôi tiến hành mua hộ cho bạn.</p>
      </div>

      <div className="order-form-container">
        {/* Chọn kho nhận hàng */}
        <div className="form-section">
          <h4>1. Chọn kho nhận hàng</h4>
          <div className="form-group">
            <label>Kho đích nhận hàng <span className="required">*</span></label>
            <select className="form-select">
              <option value="HN">Kho Hà Nội</option>
              <option value="SG">Kho TP. Hồ Chí Minh</option>
              <option value="DN">Kho Đà Nẵng</option>
            </select>
          </div>
        </div>

        {/* Danh sách link sản phẩm */}
        <div className="form-section">
          <h4>2. Danh sách link sản phẩm mua hộ</h4>
          
          {links.map((link, index) => (
            <div className="product-link-row" key={link.id}>
              <span className="row-number">#{index + 1}</span>
              
              <div className="row-inputs">
                <div className="form-group flex-2">
                  <input type="text" placeholder="Dán link sản phẩm tại đây..." className="form-input" />
                </div>
                <div className="form-group flex-1">
                  <input type="text" placeholder="Tên/Màu sắc/Kích cỡ" className="form-input" />
                </div>
                <div className="form-group quantity-input">
                  <input type="number" min="1" defaultValue={link.quantity} className="form-input" />
                </div>
                <div className="form-group flex-1">
                  <input type="text" placeholder="Ghi chú thêm..." className="form-input" />
                </div>
              </div>

              {links.length > 1 && (
                <button className="delete-row-btn" onClick={() => removeLink(link.id)}>
                  <DeleteOutlined />
                </button>
              )}
            </div>
          ))}

          <button className="add-link-btn" onClick={addMoreLink}>
            <PlusOutlined /> Thêm sản phẩm khác
          </button>
        </div>

        {/* Nút gửi đơn */}
        <div className="form-actions">
          <button className="btn-submit-order">Gửi yêu cầu mua hộ</button>
        </div>
      </div>
    </div>
  );
}