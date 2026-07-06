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
import "./CancellationRefundPolicy.css";

const HIGHLIGHTS = ["Yêu cầu có thể hủy dễ hơn khi chưa đặt mua hoặc chưa vận chuyển.",
  "Sau khi đơn đã thanh toán cho shop, việc hủy phụ thuộc chính sách bên bán.",
  "Phí dịch vụ đã phát sinh có thể không được hoàn trong một số trường hợp.",
  "Hoàn tiền cần thông tin tài khoản nhận tiền chính xác."];
const STATS = [["Trước xử lý", "Có thể hủy"],
  ["Sau đặt mua", "Theo shop"],
  ["3–7", "Ngày đối soát"],
  ["Rõ ràng", "Theo trạng thái"]];
const POLICY_SECTIONS = [{ title: "Điều kiện hủy yêu cầu", description: "Khách hàng có thể yêu cầu hủy khi đơn chưa được xử lý, chưa đặt mua hoặc kiện hàng chưa được chuyển tuyến.", items: ["Hủy trước khi xác nhận báo giá thường không phát sinh phí.",
  "Hủy sau khi đã xử lý có thể bị trừ chi phí đã phát sinh.",
  "Đơn đang vận chuyển có thể không hủy được ngay."] },
  { title: "Trường hợp hoàn tiền", description: "Hoàn tiền áp dụng khi khách hàng thanh toán thừa, shop hết hàng, đơn không thể xử lý hoặc yêu cầu được hủy hợp lệ.", items: ["Hoàn phần tiền hàng chưa sử dụng.",
  "Hoàn khoản chênh lệch nếu hệ thống xác nhận thanh toán thừa.",
  "Không hoàn các phí đã thanh toán cho bên thứ ba nếu không thu hồi được."] },
  { title: "Thời gian hoàn tiền", description: "Thời gian hoàn tiền phụ thuộc quá trình đối soát, phương thức thanh toán và ngân hàng nhận tiền.", items: ["Cần cung cấp đúng tên chủ tài khoản, số tài khoản và ngân hàng.",
  "Thời gian thường tính từ lúc yêu cầu hoàn tiền được duyệt.",
  "Trường hợp cần xác minh có thể kéo dài hơn dự kiến."] }];
const STEPS = [{ title: "Gửi yêu cầu hủy", description: "Khách hàng chọn đơn cần hủy và nêu lý do." },
  { title: "Kiểm tra trạng thái", description: "Hệ thống kiểm tra đơn đã xử lý đến bước nào." },
  { title: "Xác nhận khoản hoàn", description: "Tính phần tiền được hoàn hoặc chi phí đã phát sinh." },
  { title: "Hoàn tiền", description: "Thực hiện chuyển hoàn theo thông tin khách hàng cung cấp." }];
const FAQS = [{ question: "Đơn mua hộ đã đặt với shop có hủy được không?", answer: "Có thể hủy nếu shop cho phép. Nếu shop không hỗ trợ hủy, đơn sẽ tiếp tục xử lý hoặc xử lý theo chính sách của shop." },
  { question: "Phí dịch vụ có được hoàn không?", answer: "Phí dịch vụ có thể không hoàn nếu công việc xử lý đã phát sinh." },
  { question: "Hoàn tiền mất bao lâu?", answer: "Thông thường cần thời gian đối soát. Thời gian cụ thể phụ thuộc phương thức thanh toán và ngân hàng." }];

const CancellationRefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="refund-policy-page">
        <section className="refund-policy-hero">
          <div className="refund-policy-hero-grid" aria-hidden="true" />

          <div className="refund-policy-container refund-policy-hero-inner">
            <div className="refund-policy-hero-content">
              <nav className="refund-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Hủy đơn & Hoàn tiền</strong>
              </nav>

              <span className="refund-policy-eyebrow">
                <WarningOutlined />
                Hủy đơn & hoàn tiền
              </span>

              <h1>
                Chính sách Hủy đơn & Hoàn tiền
                <span>Điều kiện hủy đơn và xử lý hoàn tiền</span>
              </h1>

              <p className="refund-policy-hero-description">Chính sách này quy định các trường hợp được hủy yêu cầu, điều kiện hoàn tiền và thời gian xử lý hoàn tiền trong quá trình sử dụng dịch vụ.</p>

              <div className="refund-policy-hero-actions">
                <button type="button" className="refund-policy-btn refund-policy-btn-primary" onClick={() => navigate("/lien-he")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="refund-policy-btn refund-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="refund-policy-hero-card">
              <span className="refund-policy-hero-card-icon"><WarningOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Hủy đơn & Hoàn tiền</strong>
              <p>Điều kiện hủy đơn và xử lý hoàn tiền</p>

              <div className="refund-policy-hero-card-list">
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

        <section className="refund-policy-stats-section">
          <div className="refund-policy-container refund-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="refund-policy-section">
          <div className="refund-policy-container">
            <div className="refund-policy-section-heading refund-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="refund-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="refund-policy-section refund-policy-section-soft">
          <div className="refund-policy-container refund-policy-detail-layout">
            <div className="refund-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="refund-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="refund-policy-detail-card" key={section.title}>
                  <div className="refund-policy-detail-card-head">
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

        <section className="refund-policy-section">
          <div className="refund-policy-container">
            <div className="refund-policy-section-heading refund-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="refund-policy-process-grid">
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

        <section className="refund-policy-section refund-policy-faq-section">
          <div className="refund-policy-container refund-policy-faq-layout">
            <div className="refund-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Hủy đơn & Hoàn tiền</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="refund-policy-support-card">
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

            <div className="refund-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="refund-policy-cta">
          <div className="refund-policy-container refund-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="refund-policy-btn refund-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default CancellationRefundPolicy;
