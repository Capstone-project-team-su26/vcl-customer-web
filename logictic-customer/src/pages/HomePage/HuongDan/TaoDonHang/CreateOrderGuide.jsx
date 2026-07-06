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
import "./CreateOrderGuide.css";

const STEPS = [
  { number: "01", title: "Chọn loại dịch vụ", description: "Chọn mua hộ, ký gửi hoặc dịch vụ phù hợp với nhu cầu vận chuyển của bạn." },
  { number: "02", title: "Nhập thông tin hàng hóa", description: "Điền tên hàng, số lượng, giá trị, cân nặng, kích thước và ghi chú xử lý nếu có." },
  { number: "03", title: "Nhập thông tin nhận hàng", description: "Cung cấp họ tên, số điện thoại, địa chỉ nhận hàng và phương thức giao nhận mong muốn." },
  { number: "04", title: "Kiểm tra và gửi yêu cầu", description: "Rà soát toàn bộ thông tin, xác nhận điều khoản và gửi đơn để nhân viên tiếp nhận xử lý." }
];

const INFO_CARDS = [
  { title: "Thông tin bắt buộc", description: "Loại dịch vụ, thông tin hàng, tuyến vận chuyển, người nhận và địa chỉ giao hàng." },
  { title: "Trạng thái sau khi tạo", description: "Đơn có thể ở trạng thái chờ báo giá, chờ thanh toán, đang xử lý hoặc yêu cầu bổ sung thông tin." },
  { title: "Sửa thông tin đơn", description: "Một số thông tin có thể chỉnh trước khi đơn được xác nhận hoặc trước khi hàng xuất kho." }
];

const TIPS = [
  "Điền đầy đủ số điện thoại và địa chỉ để tránh lỗi giao hàng.",
  "Ảnh sản phẩm hoặc hóa đơn giúp nhân viên kiểm tra nhanh hơn.",
  "Không khai báo sai loại hàng hoặc giá trị hàng hóa.",
  "Lưu mã đơn để tra cứu trạng thái sau khi tạo yêu cầu."
];

const CreateOrderGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="create-order-guide-page">
        <section className="create-order-guide-hero">
          <div className="create-order-guide-hero__grid" aria-hidden="true" />

          <div className="create-order-guide-container create-order-guide-hero__inner">
            <div className="create-order-guide-hero__content">
              <nav className="create-order-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn tạo đơn hàng</strong>
              </nav>

              <span className="create-order-guide-eyebrow">
                <BookOutlined />
                Tạo đơn đúng thông tin để xử lý nhanh hơn
              </span>

              <h1>
                Hướng dẫn tạo đơn hàng
                <span>Quy trình tạo và xác nhận đơn hàng</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng tạo đơn, kiểm tra dữ liệu trước khi gửi yêu cầu và theo dõi quá trình xử lý sau khi đơn được tạo.</p>

              <div className="create-order-guide-hero__actions">
                <button
                  type="button"
                  className="create-order-guide-btn create-order-guide-btn--primary"
                  onClick={() => navigate("/bao-gia")}
                >
                  Tạo đơn hàng
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="create-order-guide-btn create-order-guide-btn--secondary"
                  onClick={() => navigate("/tra-cuu")}
                >
                  Tra cứu đơn
                </button>
              </div>
            </div>

            <div className="create-order-guide-hero-card">
              <span className="create-order-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Đơn hàng</strong>
              <p>Tạo đơn hàng rõ ràng từ thông tin sản phẩm, vận chuyển đến người nhận.</p>

              <div className="create-order-guide-hero-card__meta">
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

        <section className="create-order-guide-section">
          <div className="create-order-guide-container">
            <div className="create-order-guide-heading create-order-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="create-order-guide-steps">
              {STEPS.map((step, index) => (
                <article className="create-order-guide-step-card" key={step.number}>
                  <div className="create-order-guide-step-card__top">
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

        <section className="create-order-guide-section create-order-guide-section--soft">
          <div className="create-order-guide-container create-order-guide-info-layout">
            <div className="create-order-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="create-order-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="create-order-guide-info-card" key={card.title}>
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

        <section className="create-order-guide-section">
          <div className="create-order-guide-container create-order-guide-tips-layout">
            <div className="create-order-guide-tips-card">
              <div>
                <span className="create-order-guide-tips-card__icon">
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

            <div className="create-order-guide-support-card">
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

        <section className="create-order-guide-cta">
          <div className="create-order-guide-container create-order-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="create-order-guide-cta__actions">
              <button
                type="button"
                className="create-order-guide-btn create-order-guide-btn--light"
                onClick={() => navigate("/bao-gia")}
              >
                Tạo đơn hàng
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="create-order-guide-btn create-order-guide-btn--outline"
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

export default CreateOrderGuide;
