import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./PaymentGuide.css";

const STEPS = [
  { number: "01", title: "Kiểm tra báo giá", description: "Xem chi tiết tiền hàng, phí dịch vụ, vận chuyển, bảo hiểm và các phụ phí trước khi thanh toán." },
  { number: "02", title: "Chọn phương thức thanh toán", description: "Thanh toán qua phương thức được hệ thống hỗ trợ như chuyển khoản hoặc cổng thanh toán." },
  { number: "03", title: "Nhập đúng nội dung", description: "Ghi đúng mã đơn hoặc mã yêu cầu trong nội dung chuyển khoản để hệ thống đối soát." },
  { number: "04", title: "Chờ xác nhận giao dịch", description: "Sau khi hệ thống hoặc nhân viên xác nhận thanh toán, đơn được chuyển sang bước xử lý tiếp theo." }
];

const INFO_CARDS = [
  { title: "Nội dung chuyển khoản", description: "Nên ghi mã đơn, mã yêu cầu hoặc số điện thoại để dễ đối soát giao dịch." },
  { title: "Khi nào cần gửi ảnh giao dịch?", description: "Khi giao dịch chưa tự động ghi nhận hoặc nhân viên yêu cầu bổ sung chứng từ thanh toán." },
  { title: "Thanh toán thiếu hoặc dư", description: "Hệ thống sẽ thông báo để khách hàng bổ sung, cấn trừ hoặc xử lý hoàn theo chính sách." }
];

const TIPS = [
  "Không tự ý chuyển khoản nếu chưa có báo giá hoặc hướng dẫn thanh toán.",
  "Luôn kiểm tra đúng số tiền và thông tin người nhận.",
  "Lưu lại biên lai hoặc ảnh giao dịch để đối soát khi cần.",
  "Thời gian xác nhận có thể phụ thuộc ngân hàng hoặc cổng thanh toán."
];

const PaymentGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="payment-guide-page">
        <section className="payment-guide-hero">
          <div className="payment-guide-hero__grid" aria-hidden="true" />

          <div className="payment-guide-container payment-guide-hero__inner">
            <div className="payment-guide-hero__content">
              <nav className="payment-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn thanh toán</strong>
              </nav>

              <span className="payment-guide-eyebrow">
                <BookOutlined />
                Thanh toán đúng nội dung để hệ thống đối soát nhanh
              </span>

              <h1>
                Hướng dẫn thanh toán
                <span>Cách thanh toán và xác nhận giao dịch</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng thanh toán tiền hàng, phí dịch vụ, cước vận chuyển và cách gửi minh chứng giao dịch khi cần đối soát.</p>

              <div className="payment-guide-hero__actions">
                <button
                  type="button"
                  className="payment-guide-btn payment-guide-btn--primary"
                  onClick={() => navigate("/payment-policy")}
                >
                  Xem chính sách thanh toán
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="payment-guide-btn payment-guide-btn--secondary"
                  onClick={() => navigate("/lien-he")}
                >
                  Liên hệ hỗ trợ
                </button>
              </div>
            </div>

            <div className="payment-guide-hero-card">
              <span className="payment-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Thanh toán</strong>
              <p>Nắm rõ quy trình thanh toán, xác nhận giao dịch và xử lý khi cần bổ sung chứng từ.</p>

              <div className="payment-guide-hero-card__meta">
                <div>
                  <ClockCircleOutlined />
                  <span>4 bước chính</span>
                </div>
                <div>
                  <SafetyCertificateOutlined />
                  <span>Nội dung dễ hiểu</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="payment-guide-section">
          <div className="payment-guide-container">
            <div className="payment-guide-heading payment-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="payment-guide-steps">
              {STEPS.map((step, index) => (
                <article className="payment-guide-step-card" key={step.number}>
                  <div className="payment-guide-step-card__top">
                    <span>{step.number}</span>
                    <FileTextOutlined />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < STEPS.length - 1 && (
                    <i aria-hidden="true">
                      <ArrowRightOutlined />
                    </i>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="payment-guide-section payment-guide-section--soft">
          <div className="payment-guide-container payment-guide-info-layout">
            <div className="payment-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="payment-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="payment-guide-info-card" key={card.title}>
                  <span>
                    <InfoCircleOutlined />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="payment-guide-section">
          <div className="payment-guide-container payment-guide-tips-layout">
            <div className="payment-guide-tips-card">
              <div>
                <span className="payment-guide-tips-card__icon">
                  <CheckCircleFilled />
                </span>
                <div>
                  <small>Lưu ý khi sử dụng</small>
                  <h2>Checklist trước khi hoàn tất</h2>
                </div>
              </div>

              <ul>
                {TIPS.map((tip) => (
                  <li key={tip}>
                    <CheckCircleFilled />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="payment-guide-support-card">
              <CustomerServiceOutlined />
              <h3>Cần hỗ trợ thêm?</h3>
              <p>
                Nếu bạn chưa chắc bước nào cần thực hiện, hãy liên hệ bộ phận hỗ trợ
                để được kiểm tra thông tin trước khi gửi yêu cầu.
              </p>
              <button type="button" onClick={() => navigate("/lien-he")}>
                Liên hệ hỗ trợ
                <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="payment-guide-cta">
          <div className="payment-guide-container payment-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="payment-guide-cta__actions">
              <button
                type="button"
                className="payment-guide-btn payment-guide-btn--light"
                onClick={() => navigate("/payment-policy")}
              >
                Xem chính sách thanh toán
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="payment-guide-btn payment-guide-btn--outline"
                onClick={() => navigate("/huong-dan")}
              >
                <HomeOutlined />
                Về trung tâm hướng dẫn
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default PaymentGuide;
