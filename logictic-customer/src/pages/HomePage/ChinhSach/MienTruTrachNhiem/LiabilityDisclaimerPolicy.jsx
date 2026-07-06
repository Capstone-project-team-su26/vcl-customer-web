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
import "./LiabilityDisclaimerPolicy.css";

const HIGHLIGHTS = ["Không chịu trách nhiệm với hàng hóa khai báo sai hoặc thuộc danh mục cấm.",
  "Không đảm bảo thời gian tuyệt đối khi có sự kiện bất khả kháng.",
  "Một số rủi ro do shop, sàn thương mại điện tử hoặc hãng vận chuyển thứ ba xử lý theo chính sách riêng.",
  "Khách hàng cần cung cấp thông tin và chứng từ kịp thời khi được yêu cầu."];
const STATS = [["Bất khả kháng", "Sự kiện khách quan"],
  ["Sai khai báo", "Khách hàng chịu trách nhiệm"],
  ["Bên thứ ba", "Theo chính sách riêng"],
  ["Hàng cấm", "Không tiếp nhận"]];
const POLICY_SECTIONS = [{ title: "Sự kiện bất khả kháng", description: "Các sự kiện ngoài khả năng kiểm soát có thể ảnh hưởng đến thời gian vận chuyển hoặc xử lý đơn hàng.", items: ["Thiên tai, dịch bệnh, chiến tranh, đình công hoặc thay đổi chính sách hải quan.",
  "Sự cố hệ thống, gián đoạn tuyến vận chuyển hoặc hạn chế khai thác.",
  "Yêu cầu kiểm tra đặc biệt từ cơ quan chức năng."] },
  { title: "Thông tin khai báo sai", description: "Khách hàng chịu trách nhiệm khi khai báo sai tên hàng, giá trị, số lượng, tính chất hàng hóa hoặc địa chỉ nhận.", items: ["Hàng có thể bị tạm giữ, trả lại hoặc phát sinh phí xử lý.",
  "Không bồi thường cho thiệt hại do khai báo sai.",
  "Có thể từ chối xử lý nếu phát hiện vi phạm nghiêm trọng."] },
  { title: "Rủi ro từ bên thứ ba", description: "Một số khâu phụ thuộc shop, sàn thương mại điện tử, hãng vận chuyển nội địa hoặc đơn vị giao hàng cuối.", items: ["Shop giao sai, thiếu hoặc hàng lỗi theo chính sách của shop.",
  "Hãng vận chuyển nội địa nước ngoài chậm giao hoặc thất lạc.",
  "Ngân hàng hoặc cổng thanh toán xử lý chậm giao dịch."] }];
const STEPS = [{ title: "Xác minh", description: "Kiểm tra nguyên nhân sự cố." },
  { title: "Đối chiếu", description: "So sánh với khai báo và trạng thái xử lý." },
  { title: "Phân loại", description: "Xác định trách nhiệm thuộc bên nào." },
  { title: "Thông báo", description: "Gửi kết quả và phương án xử lý cho khách hàng." }];
const FAQS = [{ question: "Miễn trừ trách nhiệm có nghĩa là không hỗ trợ khách hàng không?", answer: "Không. Hệ thống vẫn hỗ trợ xác minh và xử lý, nhưng trách nhiệm bồi thường có thể không phát sinh trong các trường hợp được miễn trừ." },
  { question: "Shop giao sai hàng thì ai chịu?", answer: "Việc đổi trả hoặc hoàn tiền phụ thuộc chính sách của shop hoặc sàn nơi mua hàng." },
  { question: "Khai sai loại hàng có ảnh hưởng không?", answer: "Có. Khai sai có thể làm hàng bị giữ, phát sinh phí hoặc bị từ chối vận chuyển." }];

const LiabilityDisclaimerPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="liability-policy-page">
        <section className="liability-policy-hero">
          <div className="liability-policy-hero-grid" aria-hidden="true" />

          <div className="liability-policy-container liability-policy-hero-inner">
            <div className="liability-policy-hero-content">
              <nav className="liability-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Miễn trừ Trách nhiệm</strong>
              </nav>

              <span className="liability-policy-eyebrow">
                <InfoCircleOutlined />
                Phạm vi trách nhiệm
              </span>

              <h1>
                Chính sách Miễn trừ Trách nhiệm
                <span>Các trường hợp được miễn trừ trách nhiệm</span>
              </h1>

              <p className="liability-policy-hero-description">Chính sách này nêu rõ các trường hợp hệ thống hoặc đơn vị vận chuyển có thể được miễn trừ trách nhiệm khi sự cố phát sinh ngoài phạm vi kiểm soát hợp lý.</p>

              <div className="liability-policy-hero-actions">
                <button type="button" className="liability-policy-btn liability-policy-btn-primary" onClick={() => navigate("/lien-he")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="liability-policy-btn liability-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="liability-policy-hero-card">
              <span className="liability-policy-hero-card-icon"><InfoCircleOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Miễn trừ Trách nhiệm</strong>
              <p>Các trường hợp được miễn trừ trách nhiệm</p>

              <div className="liability-policy-hero-card-list">
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

        <section className="liability-policy-stats-section">
          <div className="liability-policy-container liability-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="liability-policy-section">
          <div className="liability-policy-container">
            <div className="liability-policy-section-heading liability-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="liability-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="liability-policy-section liability-policy-section-soft">
          <div className="liability-policy-container liability-policy-detail-layout">
            <div className="liability-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="liability-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="liability-policy-detail-card" key={section.title}>
                  <div className="liability-policy-detail-card-head">
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

        <section className="liability-policy-section">
          <div className="liability-policy-container">
            <div className="liability-policy-section-heading liability-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="liability-policy-process-grid">
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

        <section className="liability-policy-section liability-policy-faq-section">
          <div className="liability-policy-container liability-policy-faq-layout">
            <div className="liability-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Miễn trừ Trách nhiệm</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="liability-policy-support-card">
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

            <div className="liability-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="liability-policy-cta">
          <div className="liability-policy-container liability-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="liability-policy-btn liability-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default LiabilityDisclaimerPolicy;
