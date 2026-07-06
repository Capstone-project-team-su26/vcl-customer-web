import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./GeneralRulesPolicy.css";

const HIGHLIGHTS = ["Khách hàng cần cung cấp thông tin chính xác khi tạo yêu cầu.",
  "Mỗi đơn hàng hoặc kiện hàng phải có mã theo dõi rõ ràng.",
  "Hàng hóa phải tuân thủ quy định vận chuyển, nhập khẩu và pháp luật liên quan.",
  "Chi phí chính thức được xác nhận sau khi kiểm tra đủ thông tin cần thiết."];
const STATS = [["01", "Tài khoản & thông tin"],
  ["02", "Hàng hóa & chứng từ"],
  ["03", "Thanh toán & xác nhận"],
  ["04", "Trách nhiệm hai bên"]];
const POLICY_SECTIONS = [{ title: "Thông tin khách hàng", description: "Khách hàng chịu trách nhiệm về tính chính xác của thông tin tài khoản, người nhận, số điện thoại, địa chỉ giao hàng và thông tin liên hệ.", items: ["Sử dụng đúng họ tên, số điện thoại và địa chỉ nhận hàng.",
  "Thông báo kịp thời khi cần thay đổi thông tin giao nhận.",
  "Không sử dụng thông tin của người khác khi chưa được cho phép."] },
  { title: "Thông tin hàng hóa", description: "Mọi hàng hóa cần được khai báo đúng tên hàng, số lượng, giá trị, tình trạng và các đặc điểm đặc biệt nếu có.", items: ["Khai báo rõ hàng có pin, chất lỏng, thương hiệu, thực phẩm hoặc mỹ phẩm.",
  "Cung cấp hóa đơn, link sản phẩm hoặc chứng từ khi được yêu cầu.",
  "Không gửi hàng cấm, hàng giả hoặc hàng vi phạm pháp luật."] },
  { title: "Xác nhận dịch vụ", description: "Yêu cầu chỉ được xử lý khi thông tin cần thiết đã đầy đủ và khách hàng xác nhận phương án chi phí, tuyến vận chuyển hoặc báo giá.", items: ["Kiểm tra kỹ báo giá trước khi thanh toán.",
  "Theo dõi trạng thái xử lý trên hệ thống.",
  "Phản hồi yêu cầu bổ sung trong thời gian quy định."] }];
const STEPS = [{ title: "Tạo yêu cầu", description: "Nhập thông tin dịch vụ và hàng hóa." },
  { title: "Kiểm tra", description: "Nhân viên xác minh thông tin và điều kiện tiếp nhận." },
  { title: "Xác nhận", description: "Khách hàng xác nhận chi phí, tuyến và điều khoản." },
  { title: "Theo dõi", description: "Hệ thống cập nhật trạng thái đến khi hoàn tất." }];
const FAQS = [{ question: "Quy định chung áp dụng cho những dịch vụ nào?", answer: "Áp dụng cho các dịch vụ mua hộ, ký gửi, vận chuyển quốc tế, báo giá, thanh toán và giao nhận liên quan đến hệ thống." },
  { question: "Nếu thông tin khai báo sai thì xử lý thế nào?", answer: "Đơn hàng có thể bị tạm giữ để xác minh, yêu cầu bổ sung thông tin hoặc phát sinh chi phí xử lý tùy mức độ sai lệch." },
  { question: "Tôi có thể thay đổi thông tin sau khi tạo yêu cầu không?", answer: "Có thể thay đổi trước khi yêu cầu được xử lý hoặc vận chuyển. Sau khi đã xác nhận, việc thay đổi phụ thuộc vào trạng thái thực tế." }];

const GeneralRulesPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="general-policy-page">
        <section className="general-policy-hero">
          <div className="general-policy-hero-grid" aria-hidden="true" />

          <div className="general-policy-container general-policy-hero-inner">
            <div className="general-policy-hero-content">
              <nav className="general-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Quy định chung</strong>
              </nav>

              <span className="general-policy-eyebrow">
                <SafetyCertificateOutlined />
                Quy định nền tảng
              </span>

              <h1>
                Quy định chung
                <span>Các quy định áp dụng khi sử dụng dịch vụ</span>
              </h1>

              <p className="general-policy-hero-description">Tổng hợp các nguyên tắc chung khi khách hàng sử dụng dịch vụ mua hộ, ký gửi, vận chuyển quốc tế và giao nhận tại Việt Nam.</p>

              <div className="general-policy-hero-actions">
                <button type="button" className="general-policy-btn general-policy-btn-primary" onClick={() => navigate("/lien-he")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="general-policy-btn general-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="general-policy-hero-card">
              <span className="general-policy-hero-card-icon"><SafetyCertificateOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Quy định chung</strong>
              <p>Các quy định áp dụng khi sử dụng dịch vụ</p>

              <div className="general-policy-hero-card-list">
                {HIGHLIGHTS.slice(0, 3).map((item) => (
                  <span key={item}>
                    <CheckCircleFilled />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="general-policy-stats-section">
          <div className="general-policy-container general-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="general-policy-section">
          <div className="general-policy-container">
            <div className="general-policy-section-heading general-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="general-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="general-policy-section general-policy-section-soft">
          <div className="general-policy-container general-policy-detail-layout">
            <div className="general-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="general-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="general-policy-detail-card" key={section.title}>
                  <div className="general-policy-detail-card-head">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{section.title}</h3>
                      <p>{section.description}</p>
                    </div>
                  </div>

                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="general-policy-section">
          <div className="general-policy-container">
            <div className="general-policy-section-heading general-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="general-policy-process-grid">
              {STEPS.map((step, index) => (
                <article key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="general-policy-section general-policy-faq-section">
          <div className="general-policy-container general-policy-faq-layout">
            <div className="general-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Quy định chung</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="general-policy-support-card">
                <QuestionCircleOutlined />
                <div>
                  <strong>Cần hỗ trợ thêm?</strong>
                  <p>Liên hệ bộ phận hỗ trợ để được kiểm tra trường hợp cụ thể.</p>
                  <button type="button" onClick={() => navigate("/lien-he")}>
                    Liên hệ tư vấn <ArrowRightOutlined />
                  </button>
                </div>
              </div>
            </div>

            <div className="general-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="general-policy-cta">
          <div className="general-policy-container general-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="general-policy-btn general-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default GeneralRulesPolicy;
