import React from "react";
import { BRAND } from "../data/homeData";

export default function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">{BRAND.fullName}</div>
          <div className="footer-tagline">{BRAND.tagline.toUpperCase()}</div>
          <p>Hotline: {BRAND.hotline}</p>
          <p>Email: {BRAND.email}</p>
          <p>Trụ sở: {BRAND.address}</p>
          <p>Dịch vụ: Mua hộ · Ký gửi hàng hóa</p>
        </div>
        <div className="footer-col">
          <h4>Dịch vụ</h4>
          <ul>
            <li><a href="#/">Mua hộ hàng quốc tế</a></li>
            <li><a href="#/">Mua hộ hàng Nhật Bản</a></li>
            <li><a href="#/">Mua hộ hàng Hàn Quốc</a></li>
            <li><a href="#/">Ký gửi hàng hóa</a></li>
            <li><a href="#/">Ký gửi kho quốc tế</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Chính sách</h4>
          <ul>
            <li><a href="#/">Quy định chung</a></li>
            <li><a href="#/">Chính sách Mua hộ</a></li>
            <li><a href="#/">Chính sách Ký gửi</a></li>
            <li><a href="#/">Chính sách Thanh toán</a></li>
            <li><a href="#/">Chính sách Hủy đơn & Hoàn tiền</a></li>
            <li><a href="#/">Chính sách Bảo mật</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Hệ thống</h4>
          <ul>
            <li><a href="/login">Đăng nhập</a></li>
            <li><a href="/register">Đăng ký tài khoản</a></li>
            <li><a href="/create-order">Tạo đơn hàng</a></li>
            <li><a href="/processing-orders">Đơn đang xử lý</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 {BRAND.fullName}. All rights reserved.</p>
        <div className="footer-chat">
          <button type="button" className="chat-btn">Chat WhatsApp</button>
          <button type="button" className="chat-btn">Chat Messenger</button>
        </div>
      </div>
    </footer>
  );
}
