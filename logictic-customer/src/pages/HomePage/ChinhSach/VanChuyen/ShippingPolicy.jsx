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
import "./ShippingPolicy.css";

const HIGHLIGHTS = ["Hàng phải có mã ký gửi hoặc mã đơn hàng để kho đối chiếu.",
  "Cước vận chuyển có thể tính theo cân thực tế hoặc cân quy đổi.",
  "Thời gian vận chuyển là thời gian dự kiến, không phải cam kết tuyệt đối.",
  "Một số nhóm hàng cần kiểm tra điều kiện vận chuyển trước khi nhận."];
const STATS = [["5–10", "Ngày tuyến phổ biến"],
  ["24/7", "Theo dõi trạng thái"],
  ["2", "Cách tính cân"],
  ["100%", "Cần mã kiện"]];
const POLICY_SECTIONS = [{ title: "Tiếp nhận tại kho", description: "Kho chỉ tiếp nhận kiện hàng có thông tin nhận diện phù hợp với yêu cầu đã tạo trên hệ thống.", items: ["Ghi đúng mã ký gửi hoặc mã đơn hàng trên kiện.",
  "Kiện hàng cần được đóng gói phù hợp với tính chất sản phẩm.",
  "Kho có quyền yêu cầu bổ sung thông tin khi kiện hàng chưa rõ nguồn gốc."] },
  { title: "Cân đo và tính cước", description: "Khối lượng tính cước thường là giá trị lớn hơn giữa khối lượng thực tế và khối lượng quy đổi theo kích thước.", items: ["Cân thực tế dựa trên trọng lượng kiện hàng sau đóng gói.",
  "Cân quy đổi áp dụng cho hàng cồng kềnh hoặc chiếm nhiều thể tích.",
  "Đơn giá phụ thuộc tuyến, phương thức và loại hàng."] },
  { title: "Thời gian vận chuyển", description: "Thời gian hiển thị là dự kiến và có thể thay đổi do lịch vận chuyển, thông quan hoặc điều kiện khách quan.", items: ["Có thể chậm do kiểm tra hải quan, thời tiết hoặc lịch bay/tàu.",
  "Hàng cần chứng từ có thể phát sinh thêm thời gian xử lý.",
  "Khách hàng nên theo dõi trạng thái thường xuyên trên hệ thống."] }];
const STEPS = [{ title: "Nhận hàng tại kho", description: "Kho xác nhận kiện hàng và mã vận đơn." },
  { title: "Cân đo", description: "Cập nhật trọng lượng, kích thước và loại hàng." },
  { title: "Xuất kho quốc tế", description: "Sắp xếp tuyến và phương thức vận chuyển." },
  { title: "Giao tại Việt Nam", description: "Nhập kho Việt Nam và bàn giao cho người nhận." }];
const FAQS = [{ question: "Tại sao cước tính theo cân quy đổi?", answer: "Hàng cồng kềnh chiếm nhiều thể tích trên phương tiện vận chuyển nên có thể được tính theo cân quy đổi thay vì cân thực tế." },
  { question: "Thời gian vận chuyển có cố định không?", answer: "Không. Thời gian là dự kiến và có thể thay đổi theo tuyến, loại hàng, thông quan và điều kiện thực tế." },
  { question: "Nếu hàng đến kho không có mã thì sao?", answer: "Kho có thể tạm giữ để xác minh. Khách hàng cần cung cấp thông tin để đối chiếu trước khi xử lý tiếp." }];

const ShippingPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="shipping-policy-page">
        <section className="shipping-policy-hero">
          <div className="shipping-policy-hero-grid" aria-hidden="true" />

          <div className="shipping-policy-container shipping-policy-hero-inner">
            <div className="shipping-policy-hero-content">
              <nav className="shipping-policy-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/chinh-sach")}>Chính sách</button>
                <span>/</span>
                <strong>Chính sách Vận chuyển</strong>
              </nav>

              <span className="shipping-policy-eyebrow">
                <GlobalOutlined />
                Vận chuyển quốc tế
              </span>

              <h1>
                Chính sách Vận chuyển
                <span>Quy định về tiếp nhận và vận chuyển hàng hóa</span>
              </h1>

              <p className="shipping-policy-hero-description">Chính sách này mô tả quy trình tiếp nhận hàng tại kho, phân loại, cân đo, vận chuyển quốc tế, nhập kho Việt Nam và bàn giao cho người nhận.</p>

              <div className="shipping-policy-hero-actions">
                <button type="button" className="shipping-policy-btn shipping-policy-btn-primary" onClick={() => navigate("/dich-vu/ky-gui")}>
                  Bắt đầu sử dụng dịch vụ
                  <ArrowRightOutlined />
                </button>

                <button type="button" className="shipping-policy-btn shipping-policy-btn-secondary" onClick={() => navigate("/chinh-sach")}>
                  Xem tất cả chính sách
                </button>
              </div>
            </div>

            <div className="shipping-policy-hero-card">
              <span className="shipping-policy-hero-card-icon"><GlobalOutlined /></span>
              <small>Chính sách áp dụng</small>
              <strong>Chính sách Vận chuyển</strong>
              <p>Quy định về tiếp nhận và vận chuyển hàng hóa</p>

              <div className="shipping-policy-hero-card-list">
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

        <section className="shipping-policy-stats-section">
          <div className="shipping-policy-container shipping-policy-stats-grid">
            {STATS.map((item) => (
              <article key={item[0]}>
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="shipping-policy-section">
          <div className="shipping-policy-container">
            <div className="shipping-policy-section-heading shipping-policy-section-heading-center">
              <span>Nội dung chính</span>
              <h2>Những điểm quan trọng cần nắm</h2>
              <p>Các nội dung dưới đây giúp khách hàng hiểu rõ phạm vi áp dụng, trách nhiệm và cách xử lý trong từng trường hợp cụ thể.</p>
            </div>

            <div className="shipping-policy-highlight-grid">
              {HIGHLIGHTS.map((item) => (
                <article key={item}>
                  <CheckCircleFilled />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shipping-policy-section shipping-policy-section-soft">
          <div className="shipping-policy-container shipping-policy-detail-layout">
            <div className="shipping-policy-section-heading">
              <span>Chi tiết chính sách</span>
              <h2>Quy định được trình bày theo từng nhóm nội dung</h2>
              <p>Bạn có thể chỉnh sửa các nội dung này theo nghiệp vụ thật của hệ thống, hoặc thay bằng dữ liệu từ API sau này.</p>
            </div>

            <div className="shipping-policy-detail-list">
              {POLICY_SECTIONS.map((section, index) => (
                <article className="shipping-policy-detail-card" key={section.title}>
                  <div className="shipping-policy-detail-card-head">
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

        <section className="shipping-policy-section">
          <div className="shipping-policy-container">
            <div className="shipping-policy-section-heading shipping-policy-section-heading-center">
              <span>Quy trình xử lý</span>
              <h2>Cách hệ thống xử lý theo từng bước</h2>
            </div>

            <div className="shipping-policy-process-grid">
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

        <section className="shipping-policy-section shipping-policy-faq-section">
          <div className="shipping-policy-container shipping-policy-faq-layout">
            <div className="shipping-policy-faq-copy">
              <span>Câu hỏi thường gặp</span>
              <h2>Thông tin cần biết về Chính sách Vận chuyển</h2>
              <p>Một số câu hỏi phổ biến giúp khách hàng hiểu nhanh cách chính sách được áp dụng trong quá trình sử dụng dịch vụ.</p>

              <div className="shipping-policy-support-card">
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

            <div className="shipping-policy-faq-list">
              {FAQS.map((faq) => (
                <article key={faq.question}>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="shipping-policy-cta">
          <div className="shipping-policy-container shipping-policy-cta-inner">
            <div>
              <span>Cần áp dụng chính sách?</span>
              <h2>Đọc kỹ điều khoản trước khi tạo yêu cầu dịch vụ</h2>
              <p>Nếu có trường hợp đặc biệt, hãy liên hệ nhân viên hỗ trợ để được kiểm tra trước khi thanh toán hoặc gửi hàng đến kho.</p>
            </div>

            <button type="button" className="shipping-policy-btn shipping-policy-btn-light" onClick={() => navigate("/lien-he")}>
              Liên hệ hỗ trợ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ShippingPolicy;
