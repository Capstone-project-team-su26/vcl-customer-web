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
import "./CargoInsurancePolicy.css";

const HIGHLIGHTS = ["Khách hàng cần khai báo giá trị hàng hóa trung thực.",
  "Bảo hiểm chỉ áp dụng khi được đăng ký và xác nhận trước khi vận chuyển.",
  "Hồ sơ bồi thường cần chứng từ mua hàng, hình ảnh và biên bản liên quan.",
  "Một số rủi ro hoặc nhóm hàng có thể bị loại trừ khỏi phạm vi bảo hiểm."];
const STATS = [["1%", "Phí minh họa"],
  ["Có khai báo", "Giá trị hàng"],
  ["Theo hồ sơ", "Bồi thường"],
  ["Không áp dụng", "Hàng cấm"]];
const POLICY_SECTIONS = [{ title: "Điều kiện tham gia bảo hiểm", description: "Bảo hiểm cần được chọn khi tạo yêu cầu hoặc trước thời điểm kiện hàng được vận chuyển.", items: ["Khai báo đúng giá trị hàng hóa.",
  "Cung cấp hóa đơn, chứng từ hoặc link sản phẩm khi được yêu cầu.",
  "Hàng hóa không thuộc danh mục cấm hoặc loại trừ bảo hiểm."] },
  { title: "Phạm vi hỗ trợ", description: "Bảo hiểm có thể hỗ trợ khi hàng hóa mất mát hoặc hư hỏng trong quá trình vận chuyển nếu có đủ căn cứ xác minh.", items: ["Mất kiện trong phạm vi kiểm soát vận chuyển.",
  "Hư hỏng do sự cố vận chuyển được ghi nhận.",
  "Thiệt hại được chứng minh bằng hình ảnh, biên bản và hồ sơ hợp lệ."] },
  { title: "Hồ sơ bồi thường", description: "Khách hàng cần phối hợp cung cấp hồ sơ để xác minh thiệt hại và xử lý bồi thường theo quy định.", items: ["Mã đơn hoặc mã kiện.",
  "Hóa đơn, chứng từ giá trị hàng hóa.",
  "Hình ảnh kiện hàng, sản phẩm và tình trạng hư hỏng."] }];
const STEPS = [{ title: "Đăng ký", description: "Chọn bảo hiểm và khai báo giá trị." },
  { title: "Xác nhận", description: "Hệ thống xác nhận mức phí và phạm vi." },
  { title: "Xử lý sự cố", description: "Gửi hồ sơ khi phát sinh rủi ro." },
  { title: "Bồi thường", description: "Đối soát và xử lý theo chính sách." }];
const FAQS = [{ question: "Bảo hiểm có bắt buộc không?", answer: "Không bắt buộc, nhưng nên đăng ký với hàng giá trị cao hoặc hàng dễ hư hỏng." },
  { question: "Không khai báo giá trị có được bồi thường không?", answer: "Có thể không đủ cơ sở bồi thường hoặc mức hỗ trợ bị giới hạn." },
  { question: "Hàng dễ vỡ có được bảo hiểm không?", answer: "Có thể cần đóng gói gia cố và kiểm tra điều kiện riêng trước khi nhận bảo hiểm." }];

const CargoInsurancePolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="insurance-policy-page">
        <section className="insurance-policy-hero">
          <div className="insurance-policy-hero-grid" aria-hidden="true" />

          <div className="insurance-policy-container insurance-policy-hero-inner">
            <div className="insurance-policy-hero-content">
              <nav className="insurance-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Bảo hiểm Hàng hóa</strong>
              </nav>

              <span className="insurance-policy-eyebrow">
                <SafetyCertificateOutlined />
                Bảo vệ giá trị hàng
              </span>

              <h1>
                Chính sách Bảo hiểm Hàng hóa
                <span>Quyền lợi và phạm vi bảo hiểm hàng hóa</span>
              </h1>

              <p className="insurance-policy-hero-description">Bảo hiểm hàng hóa hỗ trợ giảm rủi ro tài chính khi kiện hàng xảy ra mất mát, hư hỏng hoặc sự cố thuộc phạm vi chính sách trong quá trình vận chuyển.</p>

              <div className="insurance-policy-hero-actions">
                <button type="button" className="insurance-policy-btn insurance-policy-btn-primary" onClick={() => navigate("/dich-vu/ky-gui")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="insurance-policy-btn insurance-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="insurance-policy-hero-card">
              <span className="insurance-policy-hero-card-icon"><SafetyCertificateOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Bảo hiểm Hàng hóa</strong>
              <p>Quyền lợi và phạm vi bảo hiểm hàng hóa</p>

              <div className="insurance-policy-hero-card-list">
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

        <section className="insurance-policy-stats-section">
          <div className="insurance-policy-container insurance-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="insurance-policy-section">
          <div className="insurance-policy-container">
            <div className="insurance-policy-section-heading insurance-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="insurance-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="insurance-policy-section insurance-policy-section-soft">
          <div className="insurance-policy-container insurance-policy-detail-layout">
            <div className="insurance-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="insurance-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="insurance-policy-detail-card" key={section.title}>
                  <div className="insurance-policy-detail-card-head">
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

        <section className="insurance-policy-section">
          <div className="insurance-policy-container">
            <div className="insurance-policy-section-heading insurance-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="insurance-policy-process-grid">
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

        <section className="insurance-policy-section insurance-policy-faq-section">
          <div className="insurance-policy-container insurance-policy-faq-layout">
            <div className="insurance-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Bảo hiểm Hàng hóa</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="insurance-policy-support-card">
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

            <div className="insurance-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="insurance-policy-cta">
          <div className="insurance-policy-container insurance-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="insurance-policy-btn insurance-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default CargoInsurancePolicy;
