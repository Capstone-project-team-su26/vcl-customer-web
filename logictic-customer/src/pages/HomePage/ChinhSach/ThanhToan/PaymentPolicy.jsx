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
import "./PaymentPolicy.css";

const HIGHLIGHTS = ["Khách hàng cần kiểm tra kỹ báo giá trước khi thanh toán.",
  "Nội dung thanh toán nên ghi đúng mã yêu cầu để đối soát nhanh.",
  "Dịch vụ chỉ được xử lý sau khi thanh toán hoặc xác nhận theo quy định.",
  "Các khoản phát sinh sẽ được thông báo trước khi thu thêm."];
const STATS = [["100%", "Báo giá trước"],
  ["01", "Mã yêu cầu"],
  ["24h", "Thời hạn thường dùng"],
  ["0đ", "Tạo yêu cầu"]];
const POLICY_SECTIONS = [{ title: "Phương thức thanh toán", description: "Hệ thống có thể hỗ trợ chuyển khoản ngân hàng, ví điện tử hoặc các phương thức khác tùy cấu hình thực tế.", items: ["Thanh toán đúng số tiền theo báo giá hoặc thông báo hệ thống.",
  "Ghi rõ mã yêu cầu, số điện thoại hoặc tên khách hàng.",
  "Lưu lại biên lai để hỗ trợ đối soát khi cần."] },
  { title: "Thời hạn thanh toán", description: "Báo giá có thể có thời hạn hiệu lực do tỷ giá, giá sản phẩm, phí vận chuyển hoặc tình trạng hàng thay đổi.", items: ["Thanh toán trong thời hạn báo giá để giữ mức phí đã xác nhận.",
  "Quá thời hạn, hệ thống có thể yêu cầu báo giá lại.",
  "Đơn chưa thanh toán có thể chưa được đặt mua hoặc vận chuyển."] },
  { title: "Chi phí phát sinh", description: "Một số khoản có thể phát sinh sau khi hàng được kiểm tra thực tế như phụ phí hàng đặc biệt, đóng gói, bảo hiểm hoặc chênh lệch cân nặng.", items: ["Khoản phát sinh cần được thông báo rõ ràng.",
  "Khách hàng xác nhận trước khi tiếp tục xử lý.",
  "Chi phí cuối cùng dựa trên kết quả kiểm tra thực tế."] }];
const STEPS = [{ title: "Nhận báo giá", description: "Hệ thống hoặc nhân viên gửi chi tiết chi phí." },
  { title: "Kiểm tra", description: "Khách hàng rà soát tuyến, số lượng và phí." },
  { title: "Thanh toán", description: "Chuyển khoản hoặc thanh toán theo hướng dẫn." },
  { title: "Đối soát", description: "Hệ thống xác nhận và chuyển sang bước xử lý." }];
const FAQS = [{ question: "Tạo yêu cầu có cần thanh toán ngay không?", answer: "Không nhất thiết. Tùy dịch vụ, khách hàng có thể tạo yêu cầu trước và thanh toán sau khi nhận báo giá." },
  { question: "Chuyển khoản sai nội dung thì sao?", answer: "Bạn nên gửi biên lai cho bộ phận hỗ trợ để đối soát thủ công." },
  { question: "Khi nào phát sinh thêm phí?", answer: "Phí có thể phát sinh khi hàng thực tế khác khai báo, cần đóng gói thêm, có phụ phí tuyến hoặc cần xử lý chứng từ." }];

const PaymentPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="payment-policy-page">
        <section className="payment-policy-hero">
          <div className="payment-policy-hero-grid" aria-hidden="true" />

          <div className="payment-policy-container payment-policy-hero-inner">
            <div className="payment-policy-hero-content">
              <nav className="payment-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Thanh toán</strong>
              </nav>

              <span className="payment-policy-eyebrow">
                <DollarOutlined />
                Thanh toán minh bạch
              </span>

              <h1>
                Chính sách Thanh toán
                <span>Phương thức, thời hạn và quy trình thanh toán</span>
              </h1>

              <p className="payment-policy-hero-description">Chính sách thanh toán quy định cách xác nhận báo giá, thời điểm thanh toán, nội dung chuyển khoản và xử lý các khoản phát sinh trong quá trình cung cấp dịch vụ.</p>

              <div className="payment-policy-hero-actions">
                <button type="button" className="payment-policy-btn payment-policy-btn-primary" onClick={() => navigate("/bang-gia")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="payment-policy-btn payment-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="payment-policy-hero-card">
              <span className="payment-policy-hero-card-icon"><DollarOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Thanh toán</strong>
              <p>Phương thức, thời hạn và quy trình thanh toán</p>

              <div className="payment-policy-hero-card-list">
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

        <section className="payment-policy-stats-section">
          <div className="payment-policy-container payment-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="payment-policy-section">
          <div className="payment-policy-container">
            <div className="payment-policy-section-heading payment-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="payment-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="payment-policy-section payment-policy-section-soft">
          <div className="payment-policy-container payment-policy-detail-layout">
            <div className="payment-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="payment-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="payment-policy-detail-card" key={section.title}>
                  <div className="payment-policy-detail-card-head">
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

        <section className="payment-policy-section">
          <div className="payment-policy-container">
            <div className="payment-policy-section-heading payment-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="payment-policy-process-grid">
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

        <section className="payment-policy-section payment-policy-faq-section">
          <div className="payment-policy-container payment-policy-faq-layout">
            <div className="payment-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Thanh toán</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="payment-policy-support-card">
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

            <div className="payment-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="payment-policy-cta">
          <div className="payment-policy-container payment-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="payment-policy-btn payment-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default PaymentPolicy;
