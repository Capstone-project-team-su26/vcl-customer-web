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
import "./PrivacyPolicy.css";

const HIGHLIGHTS = ["Thông tin được sử dụng để xử lý yêu cầu, báo giá, giao nhận và chăm sóc khách hàng.",
  "Không chia sẻ dữ liệu trái mục đích nếu không có căn cứ hợp lệ.",
  "Một số thông tin cần chia sẻ cho kho, vận chuyển hoặc bên liên quan để hoàn tất dịch vụ.",
  "Khách hàng có thể yêu cầu cập nhật hoặc kiểm tra thông tin cá nhân."];
const STATS = [["Dữ liệu", "Được bảo vệ"],
  ["Mục đích", "Rõ ràng"],
  ["Truy cập", "Có kiểm soát"],
  ["Hỗ trợ", "Khi cần chỉnh sửa"]];
const POLICY_SECTIONS = [{ title: "Thông tin thu thập", description: "Hệ thống có thể thu thập thông tin tài khoản, liên hệ, địa chỉ, thông tin đơn hàng, lịch sử giao dịch và dữ liệu hỗ trợ.", items: ["Họ tên, số điện thoại, email và địa chỉ nhận hàng.",
  "Thông tin hàng hóa, giá trị khai báo, link sản phẩm và chứng từ.",
  "Lịch sử thanh toán, trạng thái đơn hàng và nội dung hỗ trợ."] },
  { title: "Mục đích sử dụng", description: "Dữ liệu được dùng để cung cấp dịch vụ, xác minh giao dịch, vận chuyển, chăm sóc khách hàng và cải thiện hệ thống.", items: ["Tạo mã yêu cầu, báo giá và xử lý đơn hàng.",
  "Liên hệ khi cần bổ sung thông tin hoặc cập nhật trạng thái.",
  "Đối soát thanh toán, khiếu nại hoặc hoàn tiền."] },
  { title: "Chia sẻ dữ liệu", description: "Một số dữ liệu cần được chia sẻ với kho, đơn vị vận chuyển, thanh toán hoặc cơ quan có thẩm quyền khi cần thiết.", items: ["Chỉ chia sẻ thông tin cần thiết để hoàn tất dịch vụ.",
  "Không bán dữ liệu khách hàng cho bên thứ ba.",
  "Tuân thủ yêu cầu hợp pháp từ cơ quan chức năng nếu có."] }];
const STEPS = [{ title: "Thu thập", description: "Nhận thông tin khi khách hàng tạo yêu cầu." },
  { title: "Sử dụng", description: "Xử lý đơn hàng, thanh toán và giao nhận." },
  { title: "Bảo vệ", description: "Giới hạn quyền truy cập và lưu trữ an toàn." },
  { title: "Cập nhật", description: "Hỗ trợ chỉnh sửa khi khách hàng yêu cầu hợp lệ." }];
const FAQS = [{ question: "Thông tin của tôi dùng để làm gì?", answer: "Dùng để xử lý yêu cầu, báo giá, thanh toán, vận chuyển, giao nhận và hỗ trợ khách hàng." },
  { question: "Dữ liệu có chia sẻ cho bên thứ ba không?", answer: "Có thể chia sẻ cho kho, vận chuyển hoặc thanh toán trong phạm vi cần thiết để hoàn tất dịch vụ." },
  { question: "Tôi có thể yêu cầu sửa thông tin không?", answer: "Có. Bạn có thể liên hệ hỗ trợ để cập nhật thông tin khi cần thiết." }];

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="privacy-policy-page">
        <section className="privacy-policy-hero">
          <div className="privacy-policy-hero-grid" aria-hidden="true" />

          <div className="privacy-policy-container privacy-policy-hero-inner">
            <div className="privacy-policy-hero-content">
              <nav className="privacy-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Bảo mật</strong>
              </nav>

              <span className="privacy-policy-eyebrow">
                <SafetyCertificateOutlined />
                Bảo mật dữ liệu
              </span>

              <h1>
                Chính sách Bảo mật
                <span>Quy định thu thập và bảo vệ dữ liệu khách hàng</span>
              </h1>

              <p className="privacy-policy-hero-description">Chính sách bảo mật giải thích cách hệ thống thu thập, sử dụng, lưu trữ và bảo vệ thông tin khách hàng trong quá trình cung cấp dịch vụ logistics.</p>

              <div className="privacy-policy-hero-actions">
                <button type="button" className="privacy-policy-btn privacy-policy-btn-primary" onClick={() => navigate("/lien-he")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="privacy-policy-btn privacy-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="privacy-policy-hero-card">
              <span className="privacy-policy-hero-card-icon"><SafetyCertificateOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Bảo mật</strong>
              <p>Quy định thu thập và bảo vệ dữ liệu khách hàng</p>

              <div className="privacy-policy-hero-card-list">
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

        <section className="privacy-policy-stats-section">
          <div className="privacy-policy-container privacy-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="privacy-policy-section">
          <div className="privacy-policy-container">
            <div className="privacy-policy-section-heading privacy-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="privacy-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="privacy-policy-section privacy-policy-section-soft">
          <div className="privacy-policy-container privacy-policy-detail-layout">
            <div className="privacy-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="privacy-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="privacy-policy-detail-card" key={section.title}>
                  <div className="privacy-policy-detail-card-head">
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

        <section className="privacy-policy-section">
          <div className="privacy-policy-container">
            <div className="privacy-policy-section-heading privacy-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="privacy-policy-process-grid">
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

        <section className="privacy-policy-section privacy-policy-faq-section">
          <div className="privacy-policy-container privacy-policy-faq-layout">
            <div className="privacy-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Bảo mật</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="privacy-policy-support-card">
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

            <div className="privacy-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="privacy-policy-cta">
          <div className="privacy-policy-container privacy-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="privacy-policy-btn privacy-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default PrivacyPolicy;
