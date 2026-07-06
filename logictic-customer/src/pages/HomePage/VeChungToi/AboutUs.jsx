import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  ArrowRightOutlined,
  AuditOutlined,
  BankOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  CompassOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  GlobalOutlined,
  HeartOutlined,
  HomeOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
  ShopOutlined,
  SmileOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TruckOutlined,
} from "@ant-design/icons";

import Header from "../../../layouts/HeaderLayout/Headeer";
import "./AboutUs.css";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const scaleIn = {
  hidden: {
    opacity: 0,
    scale: 0.92,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const STATS = [
  {
    label: "Đơn hàng đã xử lý",
    value: 12000,
    suffix: "+",
    icon: <ShopOutlined />,
  },
  {
    label: "Tuyến vận chuyển",
    value: 8,
    suffix: "+",
    icon: <GlobalOutlined />,
  },
  {
    label: "Tỷ lệ phản hồi đúng hạn",
    value: 98,
    suffix: "%",
    icon: <ClockCircleOutlined />,
  },
  {
    label: "Kho đối tác quốc tế",
    value: 5,
    suffix: "+",
    icon: <EnvironmentOutlined />,
  },
];

const VALUES = [
  {
    icon: <SafetyCertificateOutlined />,
    title: "Minh bạch",
    text: "Chi phí, trạng thái xử lý và các phụ phí được thể hiện rõ trước khi khách hàng xác nhận đơn.",
  },
  {
    icon: <ThunderboltOutlined />,
    title: "Nhanh chóng",
    text: "Quy trình tiếp nhận, báo giá và cập nhật đơn hàng được tối ưu để giảm thời gian chờ.",
  },
  {
    icon: <HeartOutlined />,
    title: "Tận tâm",
    text: "Đội ngũ hỗ trợ theo sát từng yêu cầu mua hộ, ký gửi, vận chuyển và khiếu nại phát sinh.",
  },
  {
    icon: <FileProtectOutlined />,
    title: "An toàn",
    text: "Hàng hóa được kiểm tra, phân loại và tư vấn bảo hiểm phù hợp với từng nhóm sản phẩm.",
  },
];

const SERVICES = [
  {
    icon: <ShopOutlined />,
    title: "Mua hộ quốc tế",
    desc: "Hỗ trợ đặt mua sản phẩm từ các sàn thương mại điện tử và nhà cung cấp nước ngoài.",
  },
  {
    icon: <TruckOutlined />,
    title: "Ký gửi hàng hóa",
    desc: "Tiếp nhận kiện hàng tại kho quốc tế, kiểm nhận, phân tuyến và vận chuyển về Việt Nam.",
  },
  {
    icon: <BankOutlined />,
    title: "Thanh toán hộ",
    desc: "Tư vấn chi phí, phí dịch vụ, tỷ giá và quy trình thanh toán rõ ràng cho từng đơn.",
  },
  {
    icon: <CustomerServiceOutlined />,
    title: "Chăm sóc khách hàng",
    desc: "Hỗ trợ theo dõi đơn, bổ sung chứng từ, xử lý phát sinh và tiếp nhận khiếu nại.",
  },
];

const TIMELINE = [
  {
    year: "2023",
    title: "Khởi tạo hệ thống dịch vụ",
    text: "Tập trung xây dựng quy trình mua hộ, ký gửi và quản lý đơn hàng quốc tế.",
  },
  {
    year: "2024",
    title: "Mở rộng kho và tuyến vận chuyển",
    text: "Kết nối thêm các tuyến Trung Quốc, Nhật Bản, Hàn Quốc, Mỹ và châu Âu.",
  },
  {
    year: "2025",
    title: "Chuẩn hóa vận hành",
    text: "Tách rõ vai trò Sales, kho quốc tế, kho Việt Nam và quản lý để tăng tốc xử lý.",
  },
  {
    year: "2026",
    title: "Tối ưu trải nghiệm số",
    text: "Nâng cấp giao diện, báo giá, theo dõi đơn và hệ thống thông báo cho khách hàng.",
  },
];

const WORKFLOW = [
  {
    icon: <ScanOutlined />,
    title: "Tiếp nhận yêu cầu",
    text: "Khách hàng tạo yêu cầu mua hộ hoặc ký gửi với thông tin hàng hóa, link sản phẩm và tuyến vận chuyển.",
  },
  {
    icon: <CalculatorOutlined />,
    title: "Kiểm tra và báo giá",
    text: "Sales kiểm tra thông tin, ước tính chi phí, phụ phí, bảo hiểm và gửi báo giá để khách xác nhận.",
  },
  {
    icon: <HomeOutlined />,
    title: "Kho xử lý kiện hàng",
    text: "Kho quốc tế tiếp nhận, kiểm đếm, phân loại, đóng gói và bàn giao cho tuyến vận chuyển phù hợp.",
  },
  {
    icon: <TruckOutlined />,
    title: "Vận chuyển về Việt Nam",
    text: "Hàng được cập nhật trạng thái theo từng mốc: xuất kho, vận chuyển, nhập kho Việt Nam và giao hàng.",
  },
];

const TEAMS = [
  {
    icon: <SolutionOutlined />,
    title: "Sales Staff",
    text: "Tư vấn dịch vụ, kiểm tra yêu cầu, tạo báo giá và hỗ trợ khách xác nhận đơn.",
  },
  {
    icon: <GlobalOutlined />,
    title: "International Warehouse Staff",
    text: "Tiếp nhận kiện hàng tại kho quốc tế, kiểm nhận, phân loại và cập nhật trạng thái xử lý.",
  },
  {
    icon: <TruckOutlined />,
    title: "Vietnam Warehouse Staff",
    text: "Nhập kho Việt Nam, đối soát kiện hàng, chuẩn bị giao hàng và xử lý phát sinh nội địa.",
  },
  {
    icon: <AuditOutlined />,
    title: "Manager & Administrator",
    text: "Theo dõi hiệu suất, phân quyền người dùng, quản lý quy trình và kiểm soát dữ liệu hệ thống.",
  },
];

const TECHNOLOGIES = [
  "Tracking realtime",
  "Báo giá tự động",
  "Quản lý kho",
  "Thông báo trạng thái",
  "Phân quyền vai trò",
  "Báo cáo vận hành",
];

const AnimatedNumber = ({ value = 0, duration = 1600 }) => {
  const [count, setCount] = useState(0);
  const numberRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = numberRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) {
          return;
        }

        hasAnimated.current = true;

        const startTime = performance.now();

        const animate = (currentTime) => {
          const progress = Math.min((currentTime - startTime) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          const nextValue = Math.floor(easedProgress * value);

          setCount(nextValue);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setCount(value);
          }
        };

        requestAnimationFrame(animate);
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value, duration]);

  return <span ref={numberRef}>{count.toLocaleString("vi-VN")}</span>;
};

const AboutUs = () => {
  const navigate = useNavigate();

  const heroParticles = useMemo(() => Array.from({ length: 18 }), []);

  return (
    <>
      <Header />

      <main className="about-page">
        <section className="about-hero">
          <div className="about-hero__particles" aria-hidden="true">
            {heroParticles.map((_, index) => (
              <span
                key={index}
                style={{
                  "--particle-left": `${8 + ((index * 13) % 86)}%`,
                  "--particle-delay": `${(index % 6) * 0.25}s`,
                  "--particle-size": `${6 + (index % 5) * 3}px`,
                }}
              />
            ))}
          </div>

          <div className="about-container about-hero__inner">
            <motion.div
              className="about-hero__content"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <nav className="about-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <strong>Về chúng tôi</strong>
              </nav>

              <span className="about-eyebrow">
                <CompassOutlined />
                Nền tảng logistics quốc tế
              </span>

              <h1>Kết nối mua hộ, ký gửi và vận chuyển quốc tế về Việt Nam</h1>

              <p>
                Chúng tôi xây dựng hệ sinh thái logistics giúp khách hàng cá nhân,
                chủ shop và doanh nghiệp nhỏ dễ dàng mua hàng, ký gửi, theo dõi
                kiện hàng và kiểm soát chi phí minh bạch từ nước ngoài về Việt Nam.
              </p>

              <div className="about-hero__actions">
                <button type="button" onClick={() => navigate("/bao-gia")}>
                  Nhận báo giá ngay
                  <ArrowRightOutlined />
                </button>

                <button type="button" onClick={() => navigate("/lien-he")}>
                  Liên hệ tư vấn
                  <CustomerServiceOutlined />
                </button>
              </div>
            </motion.div>

            <motion.div
              className="about-hero-card"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.12 }}
            >
              <div className="about-hero-card__orb" />

              <span className="about-hero-card__icon">
                <RocketOutlined />
              </span>

              <h3>Vận hành rõ ràng từ yêu cầu đến giao hàng</h3>

              <div className="about-hero-card__steps">
                <div>
                  <span>01</span>
                  <strong>Tạo yêu cầu</strong>
                </div>
                <div>
                  <span>02</span>
                  <strong>Báo giá</strong>
                </div>
                <div>
                  <span>03</span>
                  <strong>Xử lý kho</strong>
                </div>
                <div>
                  <span>04</span>
                  <strong>Giao hàng</strong>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="about-stats-section">
          <div className="about-container">
            <motion.div
              className="about-stats-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {STATS.map((item) => (
                <motion.article
                  className="about-stat-card"
                  key={item.label}
                  variants={fadeUp}
                >
                  <span>{item.icon}</span>

                  <strong>
                    <AnimatedNumber value={item.value} />
                    {item.suffix}
                  </strong>

                  <p>{item.label}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-section about-section--story">
          <div className="about-container about-story-layout">
            <motion.div
              className="about-section-copy"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
            >
              <span className="about-section-label">
                <StarOutlined />
                Câu chuyện thương hiệu
              </span>

              <h2>Được tạo ra để đơn giản hóa logistics quốc tế</h2>

              <p>
                Việc mua hàng và vận chuyển quốc tế thường phát sinh nhiều vấn đề:
                khó kiểm tra shop, chi phí không rõ, hàng bị giữ tại kho, thiếu
                chứng từ hoặc không biết trạng thái đơn hàng. Chúng tôi giải quyết
                các điểm đau đó bằng quy trình rõ ràng, giao diện dễ dùng và đội ngũ
                hỗ trợ theo sát từng bước.
              </p>

              <p>
                Mục tiêu của chúng tôi là giúp khách hàng hiểu rõ mình đang trả phí
                cho điều gì, hàng đang ở đâu, ai đang xử lý và bước tiếp theo cần làm
                là gì.
              </p>
            </motion.div>

            <motion.div
              className="about-mission-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <motion.article className="about-mission-card" variants={scaleIn}>
                <span>
                  <RocketOutlined />
                </span>
                <small>Sứ mệnh</small>
                <h3>Đưa logistics quốc tế trở nên dễ hiểu và dễ sử dụng hơn</h3>
                <p>
                  Tối ưu trải nghiệm mua hộ, ký gửi và vận chuyển để khách hàng chủ
                  động hơn trong từng quyết định.
                </p>
              </motion.article>

              <motion.article
                className="about-mission-card about-mission-card--dark"
                variants={scaleIn}
              >
                <span>
                  <GlobalOutlined />
                </span>
                <small>Tầm nhìn</small>
                <h3>Trở thành nền tảng logistics đáng tin cậy cho khách hàng Việt</h3>
                <p>
                  Kết nối hàng hóa từ nhiều thị trường quốc tế về Việt Nam bằng hệ
                  thống minh bạch và vận hành chuyên nghiệp.
                </p>
              </motion.article>
            </motion.div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-container">
            <motion.div
              className="about-section-head"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <span className="about-section-label">
                <HeartOutlined />
                Giá trị cốt lõi
              </span>

              <h2>Những nguyên tắc tạo nên chất lượng dịch vụ</h2>

              <p>
                Mỗi quyết định vận hành đều hướng tới sự rõ ràng, an toàn và trải
                nghiệm hỗ trợ tốt hơn cho khách hàng.
              </p>
            </motion.div>

            <motion.div
              className="about-value-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.18 }}
            >
              {VALUES.map((item) => (
                <motion.article
                  className="about-value-card"
                  key={item.title}
                  variants={fadeUp}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <span>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-section about-section--services">
          <div className="about-container">
            <motion.div
              className="about-section-head"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <span className="about-section-label">
                <ToolOutlined />
                Dịch vụ chính
              </span>

              <h2>Hệ sinh thái hỗ trợ từ mua hàng đến giao hàng</h2>
            </motion.div>

            <motion.div
              className="about-service-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.18 }}
            >
              {SERVICES.map((item) => (
                <motion.article
                  className="about-service-card"
                  key={item.title}
                  variants={fadeUp}
                >
                  <span>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-container about-workflow-layout">
            <motion.div
              className="about-section-copy"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
            >
              <span className="about-section-label">
                <ExperimentOutlined />
                Quy trình vận hành
              </span>

              <h2>Luồng xử lý rõ ràng cho từng đơn hàng</h2>

              <p>
                Quy trình được thiết kế để mỗi vai trò đều biết chính xác việc cần
                làm, giúp giảm sai sót, tăng tốc xử lý và cập nhật trạng thái minh
                bạch cho khách hàng.
              </p>
            </motion.div>

            <motion.div
              className="about-workflow-list"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {WORKFLOW.map((item, index) => (
                <motion.article
                  className="about-workflow-item"
                  key={item.title}
                  variants={fadeUp}
                >
                  <div className="about-workflow-item__number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <span>{item.icon}</span>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-section about-section--teams">
          <div className="about-container">
            <motion.div
              className="about-section-head"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <span className="about-section-label">
                <TeamOutlined />
                Đội ngũ vận hành
              </span>

              <h2>Mỗi bộ phận phụ trách một mắt xích quan trọng</h2>
            </motion.div>

            <motion.div
              className="about-team-grid"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {TEAMS.map((item) => (
                <motion.article
                  className="about-team-card"
                  key={item.title}
                  variants={scaleIn}
                >
                  <span>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-container about-tech-layout">
            <motion.div
              className="about-tech-card"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <span className="about-tech-card__icon">
                <CloudServerOutlined />
              </span>

              <h2>Công nghệ giúp vận hành chính xác hơn</h2>

              <p>
                Hệ thống được định hướng theo mô hình quản lý dữ liệu tập trung,
                phân quyền rõ ràng và tự động hóa những bước lặp lại để giảm thời
                gian xử lý thủ công.
              </p>

              <div className="about-tech-tags">
                {TECHNOLOGIES.map((item) => (
                  <span key={item}>
                    <CheckCircleOutlined />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="about-timeline"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {TIMELINE.map((item) => (
                <motion.article
                  className="about-timeline-item"
                  key={item.year}
                  variants={fadeUp}
                >
                  <strong>{item.year}</strong>

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="about-cta-section">
          <div className="about-container">
            <motion.div
              className="about-cta-card"
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
            >
              <span>
                <SmileOutlined />
              </span>

              <h2>Sẵn sàng bắt đầu đơn hàng quốc tế đầu tiên?</h2>

              <p>
                Tạo yêu cầu báo giá để được tư vấn tuyến vận chuyển, phí dịch vụ,
                bảo hiểm và các lưu ý cần chuẩn bị trước khi gửi hàng.
              </p>

              <div>
                <button type="button" onClick={() => navigate("/bao-gia")}>
                  Tạo báo giá
                  <ArrowRightOutlined />
                </button>

                <button type="button" onClick={() => navigate("/huong-dan")}>
                  Xem hướng dẫn
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
};

export default AboutUs;