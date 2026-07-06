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
import "./OrderTrackingGuide.css";

const STEPS = [
  { number: "01", title: "Nhập mã đơn hoặc mã kiện", description: "Dùng mã đơn hàng, mã ký gửi hoặc số điện thoại để tra cứu thông tin trong hệ thống." },
  { number: "02", title: "Xem trạng thái hiện tại", description: "Kiểm tra đơn đang chờ báo giá, chờ thanh toán, đang vận chuyển, nhập kho hoặc giao hàng." },
  { number: "03", title: "Đọc ghi chú xử lý", description: "Theo dõi các ghi chú như yêu cầu bổ sung giấy tờ, cập nhật phí hoặc thông báo phát sinh." },
  { number: "04", title: "Nhận hàng và xác nhận", description: "Khi đơn giao thành công, kiểm tra hàng và phản hồi nếu có vấn đề cần xử lý." }
];

const INFO_CARDS = [
  { title: "Các trạng thái phổ biến", description: "Chờ tiếp nhận, chờ báo giá, chờ thanh toán, đang xử lý, đang vận chuyển, đã về kho, đang giao hàng." },
  { title: "Khi nào cần liên hệ?", description: "Khi trạng thái đứng lâu bất thường, có yêu cầu bổ sung thông tin hoặc thông tin đơn chưa chính xác." },
  { title: "Lưu mã tra cứu", description: "Mã đơn và mã kiện là thông tin quan trọng để hỗ trợ kiểm tra nhanh hơn." }
];

const TIPS = [
  "Kiểm tra trạng thái thường xuyên khi đơn đang vận chuyển.",
  "Đọc kỹ ghi chú của nhân viên kho hoặc bộ phận hỗ trợ.",
  "Chuẩn bị giấy tờ khi đơn báo cần bổ sung chứng từ.",
  "Liên hệ hỗ trợ nếu thông tin giao hàng hoặc số điện thoại bị sai."
];

const OrderTrackingGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="tracking-guide-page">
        <section className="tracking-guide-hero">
          <div className="tracking-guide-hero__grid" aria-hidden="true" />

          <div className="tracking-guide-container tracking-guide-hero__inner">
            <div className="tracking-guide-hero__content">
              <nav className="tracking-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn theo dõi đơn hàng</strong>
              </nav>

              <span className="tracking-guide-eyebrow">
                <BookOutlined />
                Theo dõi đơn hàng từ lúc tạo yêu cầu đến khi giao thành công
              </span>

              <h1>
                Hướng dẫn theo dõi đơn hàng
                <span>Kiểm tra trạng thái và hành trình đơn hàng</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng sử dụng mã đơn hoặc mã kiện để kiểm tra hành trình, trạng thái thanh toán, vận chuyển và giao nhận.</p>

              <div className="tracking-guide-hero__actions">
                <button
                  type="button"
                  className="tracking-guide-btn tracking-guide-btn--primary"
                  onClick={() => navigate("/tra-cuu")}
                >
                  Tra cứu đơn hàng
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="tracking-guide-btn tracking-guide-btn--secondary"
                  onClick={() => navigate("/lien-he")}
                >
                  Liên hệ hỗ trợ
                </button>
              </div>
            </div>

            <div className="tracking-guide-hero-card">
              <span className="tracking-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Theo dõi</strong>
              <p>Tra cứu trạng thái đơn, hiểu từng mốc xử lý và biết khi nào cần bổ sung thông tin.</p>

              <div className="tracking-guide-hero-card__meta">
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

        <section className="tracking-guide-section">
          <div className="tracking-guide-container">
            <div className="tracking-guide-heading tracking-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="tracking-guide-steps">
              {STEPS.map((step, index) => (
                <article className="tracking-guide-step-card" key={step.number}>
                  <div className="tracking-guide-step-card__top">
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

        <section className="tracking-guide-section tracking-guide-section--soft">
          <div className="tracking-guide-container tracking-guide-info-layout">
            <div className="tracking-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="tracking-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="tracking-guide-info-card" key={card.title}>
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

        <section className="tracking-guide-section">
          <div className="tracking-guide-container tracking-guide-tips-layout">
            <div className="tracking-guide-tips-card">
              <div>
                <span className="tracking-guide-tips-card__icon">
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

            <div className="tracking-guide-support-card">
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

        <section className="tracking-guide-cta">
          <div className="tracking-guide-container tracking-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="tracking-guide-cta__actions">
              <button
                type="button"
                className="tracking-guide-btn tracking-guide-btn--light"
                onClick={() => navigate("/tra-cuu")}
              >
                Tra cứu đơn hàng
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="tracking-guide-btn tracking-guide-btn--outline"
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

export default OrderTrackingGuide;
