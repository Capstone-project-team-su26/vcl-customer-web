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
import "./ComplaintGuide.css";

const STEPS = [
  { number: "01", title: "Chuẩn bị thông tin đơn", description: "Chuẩn bị mã đơn, mã kiện, hình ảnh hàng hóa, hóa đơn và mô tả vấn đề cần xử lý." },
  { number: "02", title: "Gửi yêu cầu khiếu nại", description: "Chọn đúng nhóm vấn đề và gửi đầy đủ nội dung để bộ phận hỗ trợ tiếp nhận." },
  { number: "03", title: "Chờ kiểm tra và đối soát", description: "Nhân viên kiểm tra dữ liệu hệ thống, thông tin kho, vận chuyển và chứng từ liên quan." },
  { number: "04", title: "Nhận kết quả xử lý", description: "Kết quả có thể là giải thích, hỗ trợ bổ sung, hoàn phí, bồi thường hoặc hướng xử lý khác theo chính sách." }
];

const INFO_CARDS = [
  { title: "Trường hợp nên khiếu nại", description: "Hàng hư hỏng, thiếu kiện, sai thông tin, chậm xử lý bất thường hoặc giao dịch chưa được xác nhận." },
  { title: "Bằng chứng cần có", description: "Ảnh kiện hàng, video mở hàng, hóa đơn, mã vận đơn, mã đơn và nội dung trao đổi với shop nếu có." },
  { title: "Thời gian phản hồi", description: "Thời gian xử lý phụ thuộc mức độ phức tạp, dữ liệu cần đối soát và phản hồi từ đơn vị vận chuyển hoặc kho." }
];

const TIPS = [
  "Gửi khiếu nại càng sớm càng tốt sau khi phát hiện vấn đề.",
  "Không vứt bỏ bao bì, tem nhãn hoặc mã kiện khi đang chờ xử lý.",
  "Cung cấp hình ảnh rõ ràng để quá trình xác minh nhanh hơn.",
  "Một số trường hợp sẽ xử lý theo chính sách miễn trừ trách nhiệm và bảo hiểm hàng hóa."
];

const ComplaintGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="complaint-guide-page">
        <section className="complaint-guide-hero">
          <div className="complaint-guide-hero__grid" aria-hidden="true" />

          <div className="complaint-guide-container complaint-guide-hero__inner">
            <div className="complaint-guide-hero__content">
              <nav className="complaint-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn khiếu nại</strong>
              </nav>

              <span className="complaint-guide-eyebrow">
                <BookOutlined />
                Hỗ trợ xử lý vấn đề phát sinh sau mua hộ hoặc ký gửi
              </span>

              <h1>
                Hướng dẫn khiếu nại
                <span>Quy trình gửi và xử lý yêu cầu khiếu nại</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng tạo yêu cầu khiếu nại khi có vấn đề về đơn hàng, vận chuyển, thanh toán, giao nhận hoặc tình trạng hàng hóa.</p>

              <div className="complaint-guide-hero__actions">
                <button
                  type="button"
                  className="complaint-guide-btn complaint-guide-btn--primary"
                  onClick={() => navigate("/lien-he")}
                >
                  Gửi yêu cầu hỗ trợ
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="complaint-guide-btn complaint-guide-btn--secondary"
                  onClick={() => navigate("/liability-disclaimer-policy")}
                >
                  Xem chính sách liên quan
                </button>
              </div>
            </div>

            <div className="complaint-guide-hero-card">
              <span className="complaint-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Khiếu nại</strong>
              <p>Gửi khiếu nại đúng thông tin để được kiểm tra và phản hồi nhanh chóng.</p>

              <div className="complaint-guide-hero-card__meta">
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

        <section className="complaint-guide-section">
          <div className="complaint-guide-container">
            <div className="complaint-guide-heading complaint-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="complaint-guide-steps">
              {STEPS.map((step, index) => (
                <article className="complaint-guide-step-card" key={step.number}>
                  <div className="complaint-guide-step-card__top">
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

        <section className="complaint-guide-section complaint-guide-section--soft">
          <div className="complaint-guide-container complaint-guide-info-layout">
            <div className="complaint-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="complaint-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="complaint-guide-info-card" key={card.title}>
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

        <section className="complaint-guide-section">
          <div className="complaint-guide-container complaint-guide-tips-layout">
            <div className="complaint-guide-tips-card">
              <div>
                <span className="complaint-guide-tips-card__icon">
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

            <div className="complaint-guide-support-card">
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

        <section className="complaint-guide-cta">
          <div className="complaint-guide-container complaint-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="complaint-guide-cta__actions">
              <button
                type="button"
                className="complaint-guide-btn complaint-guide-btn--light"
                onClick={() => navigate("/lien-he")}
              >
                Gửi yêu cầu hỗ trợ
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="complaint-guide-btn complaint-guide-btn--outline"
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

export default ComplaintGuide;
