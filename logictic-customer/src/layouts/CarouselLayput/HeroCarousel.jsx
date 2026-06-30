import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import "./HeroCarousel.css";

const AUTOPLAY_MS = 5000;

const slideData = [
  {
    id: "mua-ho",
    eyebrow: "DỊCH VỤ MUA HỘ QUỐC TẾ",
    title: "Mua hàng quốc tế",
    highlight: "dễ dàng và minh bạch",
    description:
      "Việt Nam Logistic hỗ trợ đặt mua hàng từ các website nước ngoài, báo giá trọn gói và vận chuyển an toàn về Việt Nam.",
    buttonText: "Khám phá dịch vụ",
    path: "/dich-vu/mua-ho",

    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Kho hàng phục vụ dịch vụ mua hộ quốc tế",

    gradient:
      "linear-gradient(135deg, #f8fbff 0%, #eaf4fb 48%, #dbeaf6 100%)",

    accent: "#1976b9",
    accentDark: "#075985",

    badge: "MUA HỘ QUỐC TẾ",
    featureOne: "Báo giá minh bạch",
    featureTwo: "Theo dõi đơn hàng 24/7",
  },

  {
    id: "ky-gui",
    eyebrow: "DỊCH VỤ KÝ GỬI HÀNG HÓA",
    title: "Ký gửi hàng hóa",
    highlight: "an toàn và nhanh chóng",
    description:
      "Bạn tự mua hàng và gửi về kho Việt Nam Logistic tại nước ngoài. Hệ thống hỗ trợ tiếp nhận, kiểm đếm, gom kiện và vận chuyển về Việt Nam.",
    buttonText: "Tìm hiểu ký gửi",
    path: "/dich-vu/ky-gui",

    image:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Container phục vụ dịch vụ ký gửi hàng hóa",

    gradient:
      "linear-gradient(135deg, #fffaf5 0%, #f9eee3 48%, #efddcc 100%)",

    accent: "#d97706",
    accentDark: "#9a5203",

    badge: "KÝ GỬI HÀNG HÓA",
    featureOne: "Kho hàng an toàn",
    featureTwo: "Kiểm đếm chính xác",
  },

  {
    id: "van-chuyen-quoc-te",
    eyebrow: "VẬN CHUYỂN QUỐC TẾ",
    title: "Vận chuyển hàng hóa",
    highlight: "kết nối toàn cầu",
    description:
      "Giải pháp vận chuyển hàng hóa quốc tế bằng đường biển, đường hàng không và đường bộ với quy trình rõ ràng.",
    buttonText: "Xem dịch vụ vận chuyển",
    path: "/dich-vu/van-chuyen-quoc-te",

    image:
      "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Tàu container vận chuyển hàng hóa quốc tế",

    gradient:
      "linear-gradient(135deg, #f3f9ff 0%, #dceeff 48%, #c9e1f5 100%)",

    accent: "#0f6da8",
    accentDark: "#07496f",

    badge: "VẬN CHUYỂN QUỐC TẾ",
    featureOne: "Đa phương thức",
    featureTwo: "Kết nối toàn cầu",
  },

  {
    id: "van-tai-duong-bien",
    eyebrow: "VẬN TẢI ĐƯỜNG BIỂN",
    title: "Vận chuyển đường biển",
    highlight: "tối ưu chi phí",
    description:
      "Nhận vận chuyển hàng nguyên container và hàng lẻ, phù hợp với các lô hàng có khối lượng lớn và thời gian linh hoạt.",
    buttonText: "Xem vận tải biển",
    path: "/dich-vu/duong-bien",

    image:
     "https://www.finlogistics.vn/wp-content/uploads/2025/12/van-chuyen-duong-bien.jpg",

    imageAlt:
      "Các container hàng hóa tại cảng biển",

    gradient:
      "linear-gradient(135deg, #f1fbff 0%, #d9f1f8 50%, #c4e5ef 100%)",

    accent: "#0891b2",
    accentDark: "#0e5f73",

    badge: "VẬN TẢI ĐƯỜNG BIỂN",
    featureOne: "Chi phí tối ưu",
    featureTwo: "Vận chuyển số lượng lớn",
  },

  {
    id: "van-tai-hang-khong",
    eyebrow: "VẬN TẢI HÀNG KHÔNG",
    title: "Vận chuyển hàng không",
    highlight: "nhanh chóng vượt trội",
    description:
      "Phù hợp với hàng hóa cần giao nhanh, hàng giá trị cao hoặc các đơn hàng có thời gian vận chuyển gấp.",
    buttonText: "Xem vận tải hàng không",
    path: "/dich-vu/hang-khong",

    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Máy bay phục vụ vận chuyển hàng hóa quốc tế",

    gradient:
      "linear-gradient(135deg, #f7f7ff 0%, #e8e7fb 48%, #d9daf4 100%)",

    accent: "#6366f1",
    accentDark: "#4338ca",

    badge: "VẬN TẢI HÀNG KHÔNG",
    featureOne: "Thời gian nhanh",
    featureTwo: "Lịch bay linh hoạt",
  },

  {
    id: "gom-hang",
    eyebrow: "DỊCH VỤ GOM HÀNG",
    title: "Gom nhiều kiện hàng",
    highlight: "tối ưu vận chuyển",
    description:
      "Hỗ trợ gom nhiều đơn hàng tại kho nước ngoài thành một lô duy nhất, giúp giảm chi phí và quản lý thuận tiện.",
    buttonText: "Đăng ký gom hàng",
    path: "/dich-vu/gom-hang",

    image:
      "https://thutucxuatnhapkhau.com/wp-content/uploads/2023/07/istockphoto-1398125156-612x612-1.jpg",

    imageAlt:
      "Các kiện hàng đang được gom và phân loại",

    gradient:
      "linear-gradient(135deg, #fffaf2 0%, #faebcf 48%, #f4dbb0 100%)",

    accent: "#e28a16",
    accentDark: "#a45b08",

    badge: "GOM HÀNG TẠI KHO",
    featureOne: "Giảm chi phí",
    featureTwo: "Quản lý tập trung",
  },

  {
    id: "kho-bai",
    eyebrow: "DỊCH VỤ KHO BÃI",
    title: "Quản lý kho hàng",
    highlight: "an toàn và chuyên nghiệp",
    description:
      "Hệ thống kho hỗ trợ tiếp nhận, kiểm đếm, phân loại, lưu trữ và quản lý hàng hóa theo từng khách hàng.",
    buttonText: "Tìm hiểu kho bãi",
    path: "/dich-vu/kho-bai",

    image:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Hệ thống kho bãi logistics hiện đại",

    gradient:
      "linear-gradient(135deg, #f7fff9 0%, #e3f5e8 48%, #ccead5 100%)",

    accent: "#16a34a",
    accentDark: "#166534",

    badge: "KHO BÃI LOGISTICS",
    featureOne: "Lưu kho an toàn",
    featureTwo: "Quản lý chính xác",
  },

  {
    id: "dong-goi",
    eyebrow: "DỊCH VỤ ĐÓNG GÓI",
    title: "Đóng gói hàng hóa",
    highlight: "bảo vệ tối đa",
    description:
      "Hàng hóa được kiểm tra và đóng gói phù hợp với từng loại sản phẩm trước khi đưa vào quá trình vận chuyển.",
    buttonText: "Xem dịch vụ đóng gói",
    path: "/dich-vu/dong-goi",
  
    image:
      "https://images.unsplash.com/photo-1700165644892-3dd6b67b25bc?auto=format&fit=crop&w=1600&q=85",
  
    imageAlt:
      "Các thùng carton dùng để đóng gói và bảo vệ hàng hóa",
  
    gradient:
      "linear-gradient(135deg, #fff8f2 0%, #f9e7d8 48%, #efd1b8 100%)",
  
    accent: "#ea580c",
    accentDark: "#9a3412",
  
    badge: "ĐÓNG GÓI HÀNG HÓA",
    featureOne: "Đóng gói chắc chắn",
    featureTwo: "Hạn chế hư hỏng",
  },
  {
    id: "container",
    eyebrow: "VẬN CHUYỂN CONTAINER",
    title: "Vận chuyển container",
    highlight: "ổn định và hiệu quả",
    description:
      "Cung cấp giải pháp vận chuyển container phù hợp với hàng thương mại, hàng số lượng lớn và nhu cầu xuất nhập khẩu.",
    buttonText: "Tìm hiểu container",
    path: "/dich-vu/container",

    image:
      "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Container hàng hóa tại cảng logistics",

    gradient:
      "linear-gradient(135deg, #f3f8fc 0%, #dfeaf2 48%, #cadbe7 100%)",

    accent: "#0369a1",
    accentDark: "#0c4a6e",

    badge: "VẬN CHUYỂN CONTAINER",
    featureOne: "Hàng nguyên container",
    featureTwo: "Quản lý hành trình",
  },

  {
    id: "theo-doi-don-hang",
    eyebrow: "THEO DÕI VẬN CHUYỂN",
    title: "Theo dõi đơn hàng",
    highlight: "trực tuyến mọi lúc",
    description:
      "Tra cứu hành trình, trạng thái xử lý, thông tin kiện hàng và lịch sử vận chuyển ngay trên hệ thống.",
    buttonText: "Theo dõi đơn hàng",
    path: "/tracking",

    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85",

    imageAlt:
      "Nhân viên quản lý và theo dõi hàng hóa trong kho",

    gradient:
      "linear-gradient(135deg, #f7f7ff 0%, #ebeafd 48%, #dbdaf8 100%)",

    accent: "#7c3aed",
    accentDark: "#5b21b6",

    badge: "THEO DÕI TRỰC TUYẾN",
    featureOne: "Cập nhật 24/7",
    featureTwo: "Tra cứu dễ dàng",
  },
];

export default function HeroCarousel() {
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index) => {
    setCurrent(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrent(
      (currentIndex) =>
        (currentIndex + 1) % slideData.length
    );
  }, []);

  const previousSlide = useCallback(() => {
    setCurrent(
      (currentIndex) =>
        (currentIndex - 1 + slideData.length) %
        slideData.length
    );
  }, []);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const timer = window.setInterval(
      nextSlide,
      AUTOPLAY_MS
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused, nextSlide]);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      previousSlide();
    }

    if (event.key === "ArrowRight") {
      nextSlide();
    }
  };

  return (
    <section
      className="hero-logistic"
      aria-label="Dịch vụ nổi bật của Việt Nam Logistic"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* Background chuyển màu */}
      {slideData.map((slide, index) => (
        <div
          key={`background-${slide.id}`}
          className={`hero-logistic__background ${
            index === current ? "is-active" : ""
          }`}
          style={{
            background: slide.gradient,
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className="hero-logistic__pattern"
        aria-hidden="true"
      />

      <div
        className="hero-logistic__glow hero-logistic__glow--one"
        aria-hidden="true"
      />

      <div
        className="hero-logistic__glow hero-logistic__glow--two"
        aria-hidden="true"
      />

      <div className="hero-logistic__container">
        <div className="hero-logistic__stage">
          {slideData.map((slide, index) => {
            const isActive = index === current;

            return (
              <article
                key={slide.id}
                className={`hero-logistic__slide ${
                  isActive ? "is-active" : ""
                }`}
                aria-hidden={!isActive}
                style={{
                  "--hero-accent": slide.accent,
                  "--hero-accent-dark":
                    slide.accentDark,
                }}
              >
                {/* Nội dung bên trái */}
                <div className="hero-logistic__content">
                  <div
                    className={`hero-logistic__brand ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    <span className="hero-logistic__brand-dot" />

                    <span>
                      VIỆT NAM LOGISTIC
                    </span>
                  </div>

                  <span
                    className={`hero-logistic__eyebrow ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    {slide.eyebrow}
                  </span>

                  <h1
                    className={`hero-logistic__title ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    <span>{slide.title}</span>

                    <strong>
                      {slide.highlight}
                    </strong>
                  </h1>

                  <p
                    className={`hero-logistic__description ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    {slide.description}
                  </p>

                  <div
                    className={`hero-logistic__features ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    <div className="hero-logistic__feature">
                      <span>✓</span>
                      {slide.featureOne}
                    </div>

                    <div className="hero-logistic__feature">
                      <span>✓</span>
                      {slide.featureTwo}
                    </div>
                  </div>

                  <div
                    className={`hero-logistic__actions ${
                      isActive ? "animate-in" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="hero-logistic__primary-button"
                      onClick={() =>
                        navigate(slide.path)
                      }
                    >
                      <span>
                        {slide.buttonText}
                      </span>

                      <ArrowRightOutlined />
                    </button>

                    <button
                      type="button"
                      className="hero-logistic__secondary-button"
                      onClick={() =>
                        navigate("/bao-gia")
                      }
                    >
                      Yêu cầu báo giá
                    </button>
                  </div>
                </div>

                {/* Hình ảnh bên phải */}
                <div
                  className={`hero-logistic__visual ${
                    isActive ? "animate-in" : ""
                  }`}
                >
                  <div
                    className="hero-logistic__visual-ring hero-logistic__visual-ring--outer"
                    aria-hidden="true"
                  />

                  <div
                    className="hero-logistic__visual-ring hero-logistic__visual-ring--inner"
                    aria-hidden="true"
                  />

                  <div className="hero-logistic__image-card">
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      className="hero-logistic__image"
                      loading={
                        index === 0
                          ? "eager"
                          : "lazy"
                      }
                      fetchPriority={
                        index === 0
                          ? "high"
                          : "auto"
                      }
                    />

                    <div className="hero-logistic__image-overlay" />

                    <div className="hero-logistic__image-brand">
                      <span className="hero-logistic__image-brand-icon">
                        VL
                      </span>

                      <span className="hero-logistic__image-brand-text">
                        <strong>
                          VIỆT NAM
                        </strong>

                        <small>
                          LOGISTIC
                        </small>
                      </span>
                    </div>

                    <div className="hero-logistic__image-label">
                      {slide.badge}
                    </div>
                  </div>

                  <div className="hero-logistic__floating-card hero-logistic__floating-card--top">
                    <span className="hero-logistic__floating-icon">
                      ✓
                    </span>

                    <span>
                      <strong>
                        Theo dõi trực tuyến
                      </strong>

                      <small>
                        Cập nhật hành trình 24/7
                      </small>
                    </span>
                  </div>

                  <div className="hero-logistic__floating-card hero-logistic__floating-card--bottom">
                    <span className="hero-logistic__floating-number">
                      99.9%
                    </span>

                    <span>
                      <strong>
                        An toàn
                      </strong>

                      <small>
                        Giao nhận ổn định
                      </small>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Điều khiển carousel */}
        <div className="hero-logistic__controls">
          <div
            className="hero-logistic__dots"
            role="tablist"
            aria-label="Chọn nội dung trình chiếu"
          >
            {slideData.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-label={`Chuyển đến ${
                  slide.eyebrow
                }`}
                aria-selected={
                  index === current
                }
                className={`hero-logistic__dot ${
                  index === current
                    ? "is-active"
                    : ""
                }`}
                style={{
                  "--dot-accent":
                    slideData[current].accent,
                }}
                onClick={() =>
                  goToSlide(index)
                }
              />
            ))}
          </div>

          <div className="hero-logistic__navigation">
            <button
              type="button"
              className="hero-logistic__nav-button"
              onClick={previousSlide}
              aria-label="Nội dung trước"
            >
              <ArrowLeftOutlined />
            </button>

            <span className="hero-logistic__counter">
              <strong>
                {String(current + 1).padStart(
                  2,
                  "0"
                )}
              </strong>

              <span>/</span>

              <span>
                {String(
                  slideData.length
                ).padStart(2, "0")}
              </span>
            </span>

            <button
              type="button"
              className="hero-logistic__nav-button"
              onClick={nextSlide}
              aria-label="Nội dung tiếp theo"
            >
              <ArrowRightOutlined />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}