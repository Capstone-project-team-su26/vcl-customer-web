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
import "./ConsignmentGuide.css";

const STEPS = [
  { number: "01", title: "Khai báo kiện hàng", description: "Nhập tuyến vận chuyển, loại hàng, số kiện, cân nặng dự kiến, kích thước và giá trị khai báo." },
  { number: "02", title: "Nhận mã ký gửi", description: "Sau khi tạo yêu cầu, hệ thống cấp mã ký gửi và địa chỉ kho quốc tế để bạn gửi hàng." },
  { number: "03", title: "Gửi hàng đến kho", description: "Ghi đúng mã ký gửi trên kiện hàng hoặc thông tin người nhận để kho đối chiếu chính xác." },
  { number: "04", title: "Kho kiểm nhận và vận chuyển", description: "Kho cân đo, cập nhật trạng thái, yêu cầu bổ sung giấy tờ nếu cần và vận chuyển về Việt Nam." }
];

const INFO_CARDS = [
  { title: "Cần chuẩn bị gì?", description: "Thông tin hàng hóa, số kiện, ảnh sản phẩm nếu có, hóa đơn hoặc chứng từ khi hàng thuộc nhóm cần kiểm tra." },
  { title: "Mã ký gửi dùng để làm gì?", description: "Mã ký gửi giúp kho nhận diện đúng chủ hàng và tránh nhầm lẫn khi nhiều kiện cùng về kho." },
  { title: "Khi nào phát sinh phí?", description: "Phí phát sinh có thể đến từ cân quy đổi, đóng gói, bảo hiểm, lưu kho hoặc xử lý hàng đặc biệt." }
];

const TIPS = [
  "Không gửi hàng đến kho khi chưa có mã ký gửi.",
  "Ghi mã ký gửi rõ ràng trên kiện hàng và trong thông tin người nhận.",
  "Liên hệ trước nếu hàng có pin, chất lỏng, mỹ phẩm, thực phẩm hoặc thương hiệu.",
  "Theo dõi trạng thái thường xuyên để bổ sung thông tin kịp thời khi kho yêu cầu."
];

const ConsignmentGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="consign-guide-page">
        <section className="consign-guide-hero">
          <div className="consign-guide-hero__grid" aria-hidden="true" />

          <div className="consign-guide-container consign-guide-hero__inner">
            <div className="consign-guide-hero__content">
              <nav className="consign-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn ký gửi</strong>
              </nav>

              <span className="consign-guide-eyebrow">
                <BookOutlined />
                Dành cho khách hàng đã có hàng ở nước ngoài
              </span>

              <h1>
                Hướng dẫn ký gửi
                <span>Cách tạo yêu cầu ký gửi hàng hóa</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng tạo yêu cầu ký gửi, nhận mã kiện, gửi hàng đến kho và theo dõi quá trình vận chuyển về Việt Nam.</p>

              <div className="consign-guide-hero__actions">
                <button
                  type="button"
                  className="consign-guide-btn consign-guide-btn--primary"
                  onClick={() => navigate("/dich-vu/ky-gui")}
                >
                  Tạo yêu cầu ký gửi
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="consign-guide-btn consign-guide-btn--secondary"
                  onClick={() => navigate("/bang-gia/ky-gui")}
                >
                  Xem bảng giá
                </button>
              </div>
            </div>

            <div className="consign-guide-hero-card">
              <span className="consign-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Ký gửi</strong>
              <p>Khai báo kiện hàng, nhận mã ký gửi và gửi hàng đến kho quốc tế đúng quy trình.</p>

              <div className="consign-guide-hero-card__meta">
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

        <section className="consign-guide-section">
          <div className="consign-guide-container">
            <div className="consign-guide-heading consign-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="consign-guide-steps">
              {STEPS.map((step, index) => (
                <article className="consign-guide-step-card" key={step.number}>
                  <div className="consign-guide-step-card__top">
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

        <section className="consign-guide-section consign-guide-section--soft">
          <div className="consign-guide-container consign-guide-info-layout">
            <div className="consign-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="consign-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="consign-guide-info-card" key={card.title}>
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

        <section className="consign-guide-section">
          <div className="consign-guide-container consign-guide-tips-layout">
            <div className="consign-guide-tips-card">
              <div>
                <span className="consign-guide-tips-card__icon">
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

            <div className="consign-guide-support-card">
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

        <section className="consign-guide-cta">
          <div className="consign-guide-container consign-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="consign-guide-cta__actions">
              <button
                type="button"
                className="consign-guide-btn consign-guide-btn--light"
                onClick={() => navigate("/dich-vu/ky-gui")}
              >
                Tạo yêu cầu ký gửi
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="consign-guide-btn consign-guide-btn--outline"
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

export default ConsignmentGuide;
