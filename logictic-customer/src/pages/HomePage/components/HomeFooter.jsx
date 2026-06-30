import { Link } from "react-router-dom";
import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";

import { BRAND } from "../data/homeData";
import "./HomeFooter.css";

const SERVICE_LINKS = [
  {
    label: "Mua hộ hàng quốc tế",
    to: "/dich-vu/mua-ho",
  },
  {
    label: "Mua hộ hàng Nhật Bản",
    to: "/dich-vu/mua-ho",
  },
  {
    label: "Mua hộ hàng Hàn Quốc",
    to: "/dich-vu/mua-ho",
  },
  {
    label: "Ký gửi hàng hóa",
    to: "/dich-vu/ky-gui",
  },
  {
    label: "Ký gửi kho quốc tế",
    to: "/dich-vu/ky-gui",
  },
];

const POLICY_LINKS = [
  {
    label: "Quy định chung",
    to: "/terms",
  },
  {
    label: "Chính sách mua hộ",
    to: "/policy/buy-for-you",
  },
  {
    label: "Chính sách ký gửi",
    to: "/policy/consignment",
  },
  {
    label: "Chính sách thanh toán",
    to: "/policy/payment",
  },
  {
    label: "Chính sách hủy đơn và hoàn tiền",
    to: "/policy/refund",
  },
  {
    label: "Chính sách bảo mật",
    to: "/privacy",
  },
];

const SYSTEM_LINKS = [
  {
    label: "Đăng nhập",
    to: "/login",
  },
  {
    label: "Đăng ký tài khoản",
    to: "/register",
  },
  {
    label: "Tạo đơn hàng",
    to: "/create-order",
  },
  {
    label: "Đơn hàng đang xử lý",
    to: "/processing-orders",
  },
  {
    label: "Theo dõi đơn hàng",
    to: "/tracking",
  },
];

function FooterLinkColumn({ title, links }) {
  return (
    <div className="home-footer__column">
      <h3 className="home-footer__column-title">
        {title}
      </h3>

      <ul className="home-footer__link-list">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              to={link.to}
              className="home-footer__link"
            >
              <ArrowRightOutlined />
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeFooter() {
  const currentYear = new Date().getFullYear();

  const phoneHref = `tel:${BRAND.hotline.replace(
    /[^+\d]/g,
    ""
  )}`;

  const whatsappNumber = BRAND.hotline.replace(/\D/g, "");

  const whatsappUrl =
    BRAND.whatsappUrl ||
    `https://wa.me/${whatsappNumber}`;

  const messengerUrl = BRAND.messengerUrl || "";

  return (
    <footer className="home-footer">
      <div
        className="home-footer__decoration home-footer__decoration--one"
        aria-hidden="true"
      />

      <div
        className="home-footer__decoration home-footer__decoration--two"
        aria-hidden="true"
      />

      <div className="home-footer__container">
        <div className="home-footer__top">
          <div className="home-footer__brand">
            <Link
              to="/"
              className="home-footer__logo"
              aria-label={`Về trang chủ ${BRAND.fullName}`}
            >
              <span className="home-footer__logo-icon">
                VL
              </span>

              <span className="home-footer__logo-text">
                <strong>{BRAND.fullName}</strong>
                <small>
                  Logistics &amp; Cross-border Services
                </small>
              </span>
            </Link>

            <p className="home-footer__tagline">
              {BRAND.tagline}
            </p>

            <p className="home-footer__description">
              Giải pháp mua hộ, ký gửi và vận chuyển hàng
              hóa quốc tế minh bạch, an toàn và thuận tiện
              dành cho khách hàng tại Việt Nam.
            </p>

            <div className="home-footer__contact-list">
              <a
                href={phoneHref}
                className="home-footer__contact-item"
              >
                <span className="home-footer__contact-icon">
                  <PhoneOutlined />
                </span>

                <span>
                  <small>Hotline hỗ trợ</small>
                  <strong>{BRAND.hotline}</strong>
                </span>
              </a>

              <a
                href={`mailto:${BRAND.email}`}
                className="home-footer__contact-item"
              >
                <span className="home-footer__contact-icon">
                  <MailOutlined />
                </span>

                <span>
                  <small>Email</small>
                  <strong>{BRAND.email}</strong>
                </span>
              </a>

              <div className="home-footer__contact-item">
                <span className="home-footer__contact-icon">
                  <EnvironmentOutlined />
                </span>

                <span>
                  <small>Trụ sở</small>
                  <strong>{BRAND.address}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="home-footer__navigation">
            <FooterLinkColumn
              title="Dịch vụ"
              links={SERVICE_LINKS}
            />

            <FooterLinkColumn
              title="Chính sách"
              links={POLICY_LINKS}
            />

            <FooterLinkColumn
              title="Hệ thống"
              links={SYSTEM_LINKS}
            />
          </div>
        </div>

        <div className="home-footer__support-banner">
          <div className="home-footer__support-content">
            <span className="home-footer__support-icon">
              <MessageOutlined />
            </span>

            <div>
              <span className="home-footer__support-label">
                CẦN HỖ TRỢ?
              </span>

              <h3>
                Đội ngũ {BRAND.fullName} luôn sẵn sàng
                đồng hành cùng bạn
              </h3>

              <p>
                Liên hệ ngay để được tư vấn về mua hộ, ký gửi
                và hành trình vận chuyển.
              </p>
            </div>
          </div>

          <div className="home-footer__chat-actions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer__chat-button home-footer__chat-button--whatsapp"
            >
              <WhatsAppOutlined />
              <span>Chat WhatsApp</span>
            </a>

            {messengerUrl ? (
              <a
                href={messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="home-footer__chat-button home-footer__chat-button--messenger"
              >
                <MessageOutlined />
                <span>Chat Messenger</span>
              </a>
            ) : (
              <Link
                to="/support"
                className="home-footer__chat-button home-footer__chat-button--messenger"
              >
                <MessageOutlined />
                <span>Trung tâm hỗ trợ</span>
              </Link>
            )}
          </div>
        </div>

        <div className="home-footer__bottom">
          <p className="home-footer__copyright">
            © {currentYear} {BRAND.fullName}. Bảo lưu mọi
            quyền.
          </p>

          <div className="home-footer__trust">
            <span>
              <SafetyCertificateOutlined />
              Giao dịch minh bạch
            </span>

            <span className="home-footer__separator">
              •
            </span>

            <span>
              Hỗ trợ khách hàng 24/7
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}