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
import "./BuyForMeGuide.css";

const STEPS = [
  { number: "01", title: "Chuẩn bị link sản phẩm", description: "Sao chép link sản phẩm từ website hoặc sàn thương mại điện tử, kiểm tra đúng màu sắc, kích thước và số lượng." },
  { number: "02", title: "Điền thông tin yêu cầu", description: "Nhập link, quốc gia mua hàng, số lượng, ghi chú sản phẩm và thông tin nhận hàng tại Việt Nam." },
  { number: "03", title: "Chờ kiểm tra và báo giá", description: "Nhân viên kiểm tra tồn kho, phí nội địa, phí mua hộ và gửi báo giá chi tiết để bạn xác nhận." },
  { number: "04", title: "Thanh toán và theo dõi đơn", description: "Sau khi thanh toán, đơn được đặt mua và cập nhật trạng thái từ shop đến kho quốc tế và Việt Nam." }
];

const INFO_CARDS = [
  { title: "Thông tin cần nhập", description: "Link sản phẩm, tên hàng, thuộc tính sản phẩm, số lượng, ghi chú riêng và địa chỉ nhận hàng." },
  { title: "Khi nào đơn được đặt mua?", description: "Đơn chỉ được đặt sau khi khách hàng xác nhận báo giá và hoàn tất thanh toán theo hướng dẫn." },
  { title: "Lưu ý quan trọng", description: "Không gửi link hàng cấm, hàng giả, hàng vi phạm pháp luật hoặc hàng chưa rõ nguồn gốc." }
];

const TIPS = [
  "Kiểm tra kỹ màu sắc, size, mẫu mã trước khi gửi yêu cầu.",
  "Có thể thêm nhiều link sản phẩm trong cùng một yêu cầu nếu hệ thống hỗ trợ.",
  "Nên ghi chú rõ yêu cầu đóng gói hoặc kiểm hàng nếu sản phẩm dễ vỡ.",
  "Báo giá chính thức có thể thay đổi theo phí shop và tỷ giá tại thời điểm xử lý."
];

const BuyForMeGuide = () => {
  const navigate = useNavigate();

  return (
    <>
      <Header />

      <main className="buyfor-guide-page">
        <section className="buyfor-guide-hero">
          <div className="buyfor-guide-hero__grid" aria-hidden="true" />

          <div className="buyfor-guide-container buyfor-guide-hero__inner">
            <div className="buyfor-guide-hero__content">
              <nav className="buyfor-guide-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Hướng dẫn
                </button>
                <span>/</span>
                <strong>Hướng dẫn mua hộ</strong>
              </nav>

              <span className="buyfor-guide-eyebrow">
                <BookOutlined />
                Dành cho khách hàng muốn order hàng quốc tế
              </span>

              <h1>
                Hướng dẫn mua hộ
                <span>Các bước tạo yêu cầu mua hộ hàng hóa</span>
              </h1>

              <p>Màn hình này hướng dẫn khách hàng gửi link sản phẩm, chọn thuộc tính, ghi chú yêu cầu và xác nhận báo giá trước khi hệ thống tiến hành đặt mua.</p>

              <div className="buyfor-guide-hero__actions">
                <button
                  type="button"
                  className="buyfor-guide-btn buyfor-guide-btn--primary"
                  onClick={() => navigate("/dich-vu/mua-ho")}
                >
                  Tạo yêu cầu mua hộ
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="buyfor-guide-btn buyfor-guide-btn--secondary"
                  onClick={() => navigate("/bang-gia/mua-ho")}
                >
                  Xem bảng giá
                </button>
              </div>
            </div>

            <div className="buyfor-guide-hero-card">
              <span className="buyfor-guide-hero-card__icon">
                <FileTextOutlined />
              </span>
              <small>Trung tâm hướng dẫn</small>
              <strong>Mua hộ</strong>
              <p>Tạo yêu cầu mua hộ nhanh chóng, rõ thông tin sản phẩm và dễ theo dõi báo giá.</p>

              <div className="buyfor-guide-hero-card__meta">
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

        <section className="buyfor-guide-section">
          <div className="buyfor-guide-container">
            <div className="buyfor-guide-heading buyfor-guide-heading--center">
              <span>Quy trình thực hiện</span>
              <h2>Làm theo từng bước để thao tác chính xác hơn</h2>
              <p>
                Các bước được viết theo quy trình thực tế, giúp khách hàng hạn chế
                nhập sai thông tin và rút ngắn thời gian xử lý yêu cầu.
              </p>
            </div>

            <div className="buyfor-guide-steps">
              {STEPS.map((step, index) => (
                <article className="buyfor-guide-step-card" key={step.number}>
                  <div className="buyfor-guide-step-card__top">
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

        <section className="buyfor-guide-section buyfor-guide-section--soft">
          <div className="buyfor-guide-container buyfor-guide-info-layout">
            <div className="buyfor-guide-heading">
              <span>Thông tin cần biết</span>
              <h2>Những điểm quan trọng trước khi thao tác</h2>
              <p>
                Nội dung bên dưới giúp khách hàng chuẩn bị đúng dữ liệu, hiểu rõ
                thời điểm xử lý và tránh các lỗi thường gặp khi sử dụng dịch vụ.
              </p>
            </div>

            <div className="buyfor-guide-info-grid">
              {INFO_CARDS.map((card) => (
                <article className="buyfor-guide-info-card" key={card.title}>
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

        <section className="buyfor-guide-section">
          <div className="buyfor-guide-container buyfor-guide-tips-layout">
            <div className="buyfor-guide-tips-card">
              <div>
                <span className="buyfor-guide-tips-card__icon">
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

            <div className="buyfor-guide-support-card">
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

        <section className="buyfor-guide-cta">
          <div className="buyfor-guide-container buyfor-guide-cta__inner">
            <div>
              <span>Hoàn tất hướng dẫn</span>
              <h2>Sẵn sàng thực hiện bước tiếp theo?</h2>
              <p>
                Sau khi nắm rõ quy trình, bạn có thể tạo yêu cầu hoặc liên hệ tư vấn
                để được hỗ trợ chi tiết hơn.
              </p>
            </div>

            <div className="buyfor-guide-cta__actions">
              <button
                type="button"
                className="buyfor-guide-btn buyfor-guide-btn--light"
                onClick={() => navigate("/dich-vu/mua-ho")}
              >
                Tạo yêu cầu mua hộ
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="buyfor-guide-btn buyfor-guide-btn--outline"
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

export default BuyForMeGuide;
