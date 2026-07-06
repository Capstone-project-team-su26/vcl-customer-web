import { useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import Header from "../../../layouts/HeaderLayout/Headeer";
import "./Contact.css";

const CONTACT_CHANNELS = [
  {
    icon: <PhoneOutlined />,
    label: "Hotline hỗ trợ",
    value: "1900 888 999",
    description: "Tư vấn mua hộ, ký gửi, vận chuyển và báo giá",
  },
  {
    icon: <MailOutlined />,
    label: "Email liên hệ",
    value: "support@vietnamlogistics.vn",
    description: "Tiếp nhận yêu cầu hỗ trợ và phản hồi trong giờ làm việc",
  },
  {
    icon: <EnvironmentOutlined />,
    label: "Văn phòng",
    value: "TP. Hồ Chí Minh, Việt Nam",
    description: "Hỗ trợ khách hàng toàn quốc qua hệ thống trực tuyến",
  },
  {
    icon: <ClockCircleOutlined />,
    label: "Giờ làm việc",
    value: "08:00 - 18:00",
    description: "Thứ 2 đến Thứ 7, nghỉ Chủ nhật và ngày lễ",
  },
];

const SUPPORT_TYPES = [
  "Tư vấn mua hộ",
  "Tư vấn ký gửi",
  "Báo giá vận chuyển",
  "Theo dõi đơn hàng",
  "Thanh toán",
  "Khiếu nại / hỗ trợ khác",
];

const FAQS = [
  {
    question: "Tôi gửi yêu cầu liên hệ thì bao lâu được phản hồi?",
    answer:
      "Thông thường bộ phận hỗ trợ sẽ phản hồi trong giờ làm việc. Với yêu cầu cần kiểm tra đơn hàng hoặc báo giá chi tiết, thời gian xử lý có thể lâu hơn.",
  },
  {
    question: "Tôi có thể hỏi báo giá qua form này không?",
    answer:
      "Có. Bạn chỉ cần chọn đúng nhu cầu, mô tả loại hàng, thị trường mua hàng, cân nặng hoặc link sản phẩm để nhân viên hỗ trợ nhanh hơn.",
  },
  {
    question: "Tôi cần cung cấp mã đơn hàng khi liên hệ không?",
    answer:
      "Nếu bạn đã có đơn hàng, hãy ghi mã đơn trong nội dung liên hệ để bộ phận hỗ trợ kiểm tra chính xác trạng thái đơn.",
  },
];

const INITIAL_FORM = {
  fullName: "",
  phone: "",
  email: "",
  supportType: SUPPORT_TYPES[0],
  orderCode: "",
  message: "",
};

const Contact = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSent, setIsSent] = useState(false);

  const completedFields = useMemo(() => {
    return Object.values(formData).filter((value) => String(value).trim())
      .length;
  }, [formData]);

  const updateField = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setIsSent(false);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^[0-9+\s.-]{8,15}$/.test(formData.phone.trim())) {
      nextErrors.phone = "Số điện thoại chưa hợp lệ.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = "Email chưa hợp lệ.";
    }

    if (!formData.message.trim()) {
      nextErrors.message = "Vui lòng nhập nội dung cần hỗ trợ.";
    } else if (formData.message.trim().length < 10) {
      nextErrors.message = "Nội dung cần ít nhất 10 ký tự.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSent(true);
    setFormData(INITIAL_FORM);
  };

  return (
    <>
      <Header />

      <main className="contact-page">
        <section className="contact-hero">
          <div className="contact-container contact-hero__inner">
            <div className="contact-hero__content">
              <span className="contact-eyebrow">
                <CustomerServiceOutlined />
                Trung tâm hỗ trợ khách hàng
              </span>

              <h1>Liên hệ với chúng tôi</h1>

              <p>
                Đội ngũ hỗ trợ luôn sẵn sàng tư vấn mua hộ, ký gửi, báo giá vận
                chuyển, thanh toán và xử lý các vấn đề phát sinh trong quá trình
                sử dụng dịch vụ.
              </p>

              <div className="contact-hero__actions">
                <a href="tel:1900888999" className="contact-btn contact-btn--primary">
                  Gọi hotline
                  <PhoneOutlined />
                </a>

                <a
                  href="mailto:support@vietnamlogistics.vn"
                  className="contact-btn contact-btn--ghost"
                >
                  Gửi email
                  <MailOutlined />
                </a>
              </div>

              <div className="contact-stats">
                <div>
                  <strong>24/7</strong>
                  <span>Tiếp nhận yêu cầu</span>
                </div>
                <div>
                  <strong>6+</strong>
                  <span>Nhóm hỗ trợ</span>
                </div>
                <div>
                  <strong>98%</strong>
                  <span>Phản hồi đúng hạn</span>
                </div>
              </div>
            </div>

            <div className="contact-hero-card">
              <span className="contact-hero-card__icon">
                <MessageOutlined />
              </span>

              <h3>Cần hỗ trợ nhanh?</h3>
              <p>
                Điền thông tin bên dưới, nhân viên phụ trách sẽ tiếp nhận và
                phản hồi theo đúng nhu cầu của bạn.
              </p>

              <div className="contact-progress">
                <div>
                  <span>Thông tin đã nhập</span>
                  <strong>{completedFields}/6</strong>
                </div>
                <div className="contact-progress__bar">
                  <span style={{ width: `${(completedFields / 6) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section">
          <div className="contact-container">
            <div className="contact-grid">
              <div className="contact-info">
                <span className="contact-section-label">Thông tin liên hệ</span>
                <h2>Kết nối với bộ phận hỗ trợ</h2>
                <p>
                  Chọn kênh liên hệ phù hợp để được hỗ trợ nhanh về đơn hàng,
                  báo giá, thanh toán hoặc các vấn đề vận chuyển.
                </p>

                <div className="contact-channel-list">
                  {CONTACT_CHANNELS.map((item) => (
                    <div className="contact-channel-card" key={item.label}>
                      <span className="contact-channel-card__icon">
                        {item.icon}
                      </span>

                      <div>
                        <small>{item.label}</small>
                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="contact-map-card">
                  <div className="contact-map-card__visual">
                    <EnvironmentOutlined />
                    <span>Vietnam Logistics Office</span>
                  </div>

                  <div className="contact-map-card__content">
                    <strong>Khu vực hỗ trợ</strong>
                    <p>
                      Hỗ trợ khách hàng toàn quốc, xử lý đơn hàng qua hệ thống
                      kho quốc tế và kho Việt Nam.
                    </p>
                  </div>
                </div>
              </div>

              <form className="contact-form-card" onSubmit={handleSubmit}>
                <div className="contact-form-card__head">
                  <span>
                    <SendOutlined />
                  </span>
                  <div>
                    <h2>Gửi yêu cầu liên hệ</h2>
                    <p>Điền thông tin để đội ngũ hỗ trợ liên hệ lại với bạn.</p>
                  </div>
                </div>

                {isSent && (
                  <div className="contact-success">
                    <CheckCircleOutlined />
                    <span>
                      Gửi yêu cầu thành công. Chúng tôi sẽ liên hệ lại sớm nhất.
                    </span>
                  </div>
                )}

                <div className="contact-form-grid">
                  <label className="contact-field">
                    <span>Họ và tên *</span>
                    <div className={errors.fullName ? "is-error" : ""}>
                      <UserOutlined />
                      <input
                        type="text"
                        placeholder="Nhập họ và tên"
                        value={formData.fullName}
                        onChange={(event) =>
                          updateField("fullName", event.target.value)
                        }
                      />
                    </div>
                    {errors.fullName && <small>{errors.fullName}</small>}
                  </label>

                  <label className="contact-field">
                    <span>Số điện thoại *</span>
                    <div className={errors.phone ? "is-error" : ""}>
                      <PhoneOutlined />
                      <input
                        type="tel"
                        placeholder="Nhập số điện thoại"
                        value={formData.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                      />
                    </div>
                    {errors.phone && <small>{errors.phone}</small>}
                  </label>

                  <label className="contact-field">
                    <span>Email *</span>
                    <div className={errors.email ? "is-error" : ""}>
                      <MailOutlined />
                      <input
                        type="email"
                        placeholder="Nhập email"
                        value={formData.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                      />
                    </div>
                    {errors.email && <small>{errors.email}</small>}
                  </label>

                  <label className="contact-field">
                    <span>Nhu cầu hỗ trợ</span>
                    <div>
                      <TeamOutlined />
                      <select
                        value={formData.supportType}
                        onChange={(event) =>
                          updateField("supportType", event.target.value)
                        }
                      >
                        {SUPPORT_TYPES.map((item) => (
                          <option value={item} key={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="contact-field contact-field--full">
                    <span>Mã đơn hàng</span>
                    <div>
                      <GlobalOutlined />
                      <input
                        type="text"
                        placeholder="Nhập mã đơn nếu có"
                        value={formData.orderCode}
                        onChange={(event) =>
                          updateField("orderCode", event.target.value)
                        }
                      />
                    </div>
                  </label>

                  <label className="contact-field contact-field--full">
                    <span>Nội dung cần hỗ trợ *</span>
                    <textarea
                      className={errors.message ? "is-error" : ""}
                      placeholder="Ví dụ: Tôi cần báo giá vận chuyển hàng từ Trung Quốc về Việt Nam, trọng lượng khoảng 3kg..."
                      value={formData.message}
                      onChange={(event) =>
                        updateField("message", event.target.value)
                      }
                    />
                    {errors.message && <small>{errors.message}</small>}
                  </label>
                </div>

                <button type="submit" className="contact-submit-btn">
                  Gửi yêu cầu
                  <ArrowRightOutlined />
                </button>

                <p className="contact-form-note">
                  <SafetyCertificateOutlined />
                  Thông tin của bạn chỉ được sử dụng để hỗ trợ yêu cầu liên hệ.
                </p>
              </form>
            </div>
          </div>
        </section>

        <section className="contact-faq-section">
          <div className="contact-container">
            <div className="contact-faq-head">
              <span className="contact-section-label">Câu hỏi thường gặp</span>
              <h2>Một số thông tin trước khi liên hệ</h2>
            </div>

            <div className="contact-faq-grid">
              {FAQS.map((item, index) => (
                <article className="contact-faq-card" key={item.question}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Contact;