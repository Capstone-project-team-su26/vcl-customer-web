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
import "./OrderingPolicy.css";

const HIGHLIGHTS = ["Đơn mua hộ cần link sản phẩm, số lượng, biến thể và ghi chú rõ ràng.",
  "Đơn ký gửi cần tuyến, loại hàng, số kiện, giá trị và thông tin người nhận.",
  "Báo giá có thể thay đổi nếu shop đổi giá, hết hàng hoặc phí nội địa thay đổi.",
  "Đơn chỉ được xử lý khi khách hàng xác nhận đầy đủ thông tin và thanh toán nếu cần."];
const STATS = [["Link sản phẩm", "Cần rõ ràng"],
  ["Biến thể", "Size, màu, mẫu"],
  ["Báo giá", "Trước xác nhận"],
  ["Theo dõi", "Từng trạng thái"]];
const POLICY_SECTIONS = [{ title: "Tạo yêu cầu mua hộ", description: "Khách hàng gửi link sản phẩm và thông tin cần mua để nhân viên kiểm tra shop, giá, phí nội địa và điều kiện vận chuyển.", items: ["Cung cấp link sản phẩm chính xác.",
  "Ghi rõ màu sắc, kích thước, số lượng và ghi chú.",
  "Kiểm tra báo giá trước khi thanh toán."] },
  { title: "Tạo yêu cầu ký gửi", description: "Khách hàng khai báo thông tin kiện hàng để nhận mã ký gửi và địa chỉ kho phù hợp.", items: ["Khai báo đúng tuyến, loại hàng và số kiện.",
  "Ghi mã ký gửi trên kiện hàng khi gửi đến kho.",
  "Cung cấp chứng từ nếu hàng thuộc nhóm cần kiểm tra."] },
  { title: "Xác nhận và xử lý", description: "Yêu cầu được chuyển sang xử lý sau khi thông tin đầy đủ và khách hàng xác nhận báo giá hoặc điều kiện dịch vụ.", items: ["Theo dõi trạng thái đơn trên hệ thống.",
  "Phản hồi khi hệ thống yêu cầu bổ sung thông tin.",
  "Kiểm tra thông tin người nhận trước khi hàng được giao."] }];
const STEPS = [{ title: "Nhập thông tin", description: "Tạo yêu cầu mua hộ hoặc ký gửi." },
  { title: "Nhận báo giá", description: "Nhân viên kiểm tra và gửi chi phí." },
  { title: "Xác nhận", description: "Khách hàng xác nhận thông tin và thanh toán." },
  { title: "Theo dõi", description: "Đơn được cập nhật đến khi hoàn tất." }];
const FAQS = [{ question: "Đặt hàng cần những thông tin gì?", answer: "Đơn mua hộ cần link sản phẩm, số lượng, biến thể và ghi chú. Đơn ký gửi cần thông tin hàng, tuyến, số kiện và người nhận." },
  { question: "Giá có thay đổi sau khi báo giá không?", answer: "Có thể thay đổi nếu shop đổi giá, hết hàng, phí nội địa thay đổi hoặc hàng thực tế khác khai báo." },
  { question: "Tôi có thể đặt nhiều link trong một yêu cầu không?", answer: "Có thể, miễn là thông tin từng sản phẩm rõ ràng để nhân viên kiểm tra và báo giá." }];

const OrderingPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="ordering-policy-page">
        <section className="ordering-policy-hero">
          <div className="ordering-policy-hero-grid" aria-hidden="true" />

          <div className="ordering-policy-container ordering-policy-hero-inner">
            <div className="ordering-policy-hero-content">
              <nav className="ordering-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Đặt hàng</strong>
              </nav>

              <span className="ordering-policy-eyebrow">
                <FileTextOutlined />
                Tạo đơn đúng quy trình
              </span>

              <h1>
                Chính sách Đặt hàng
                <span>Quy trình và điều kiện tạo đơn hàng</span>
              </h1>

              <p className="ordering-policy-hero-description">Chính sách đặt hàng hướng dẫn khách hàng tạo yêu cầu mua hộ hoặc ký gửi đúng thông tin, xác nhận báo giá và theo dõi tiến trình xử lý đơn hàng.</p>

              <div className="ordering-policy-hero-actions">
                <button type="button" className="ordering-policy-btn ordering-policy-btn-primary" onClick={() => navigate("/dich-vu/mua-ho")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="ordering-policy-btn ordering-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="ordering-policy-hero-card">
              <span className="ordering-policy-hero-card-icon"><FileTextOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Đặt hàng</strong>
              <p>Quy trình và điều kiện tạo đơn hàng</p>

              <div className="ordering-policy-hero-card-list">
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

        <section className="ordering-policy-stats-section">
          <div className="ordering-policy-container ordering-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="ordering-policy-section">
          <div className="ordering-policy-container">
            <div className="ordering-policy-section-heading ordering-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="ordering-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ordering-policy-section ordering-policy-section-soft">
          <div className="ordering-policy-container ordering-policy-detail-layout">
            <div className="ordering-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="ordering-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="ordering-policy-detail-card" key={section.title}>
                  <div className="ordering-policy-detail-card-head">
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

        <section className="ordering-policy-section">
          <div className="ordering-policy-container">
            <div className="ordering-policy-section-heading ordering-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="ordering-policy-process-grid">
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

        <section className="ordering-policy-section ordering-policy-faq-section">
          <div className="ordering-policy-container ordering-policy-faq-layout">
            <div className="ordering-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Đặt hàng</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="ordering-policy-support-card">
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

            <div className="ordering-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ordering-policy-cta">
          <div className="ordering-policy-container ordering-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="ordering-policy-btn ordering-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default OrderingPolicy;
