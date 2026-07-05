import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalculatorOutlined,
  CarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HomeOutlined,
  InboxOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import "./ConsignmentService.css";
import Header from "../../../../layouts/HeaderLayout/Headeer";

const PROCESS_STEPS = [
  {
    number: "01",
    icon: <FileTextOutlined />,
    title: "Tạo yêu cầu ký gửi",
    description:
      "Khai báo tuyến vận chuyển, loại hàng, số kiện, giá trị hàng hóa và thông tin người nhận.",
  },
  {
    number: "02",
    icon: <HomeOutlined />,
    title: "Gửi hàng đến kho quốc tế",
    description:
      "Hệ thống cấp mã ký gửi và địa chỉ kho. Bạn gửi hàng đến kho, ghi đúng mã để tránh thất lạc.",
  },
  {
    number: "03",
    icon: <CarOutlined />,
    title: "Kho kiểm nhận và vận chuyển",
    description:
      "Kho đối chiếu mã kiện, cân đo, kiểm tra thông tin và sắp xếp phương án vận chuyển phù hợp.",
  },
  {
    number: "04",
    icon: <InboxOutlined />,
    title: "Nhận hàng tại Việt Nam",
    description:
      "Hàng về kho Việt Nam, hoàn tất đối soát và được giao tận nơi hoặc nhận trực tiếp tại kho.",
  },
];

const SERVICE_BENEFITS = [
  {
    icon: <GlobalOutlined />,
    title: "Nhiều tuyến vận chuyển",
    description:
      "Linh hoạt lựa chọn tuyến, phương thức và thời gian phù hợp với từng nhóm hàng.",
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Theo dõi từng trạng thái",
    description:
      "Kiểm tra hành trình kiện hàng từ lúc tiếp nhận tại kho quốc tế đến khi giao tại Việt Nam.",
  },
  {
    icon: <DollarOutlined />,
    title: "Chi phí rõ ràng",
    description:
      "Hiển thị khối lượng tính cước, phí vận chuyển, phí xử lý và bảo hiểm trước khi xác nhận.",
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: "Hỗ trợ bảo hiểm",
    description:
      "Có thể khai báo giá trị và đăng ký bảo hiểm theo chính sách áp dụng cho từng loại hàng.",
  },
];

const ROUTES = [
  {
    id: "china",
    name: "Trung Quốc → Việt Nam",
    time: "5–10 ngày dự kiến",
    tag: "Tuyến phổ biến",
    description:
      "Phù hợp hàng tiêu dùng, thời trang, phụ kiện, linh kiện và hàng thương mại phổ thông.",
    methods: [
      { id: "road", label: "Đường bộ", rate: 32000, factor: 6000 },
      { id: "air", label: "Hàng không", rate: 98000, factor: 5000 },
    ],
  },
  {
    id: "japan",
    name: "Nhật Bản → Việt Nam",
    time: "7–14 ngày dự kiến",
    tag: "Hàng cá nhân",
    description:
      "Phù hợp đồ gia dụng, mỹ phẩm đủ điều kiện, phụ kiện, đồ sưu tầm và hàng cá nhân.",
    methods: [
      { id: "air", label: "Hàng không", rate: 145000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 78000, factor: 6000 },
    ],
  },
  {
    id: "korea",
    name: "Hàn Quốc → Việt Nam",
    time: "7–12 ngày dự kiến",
    tag: "Thời trang & làm đẹp",
    description:
      "Phù hợp thời trang, phụ kiện, mỹ phẩm đủ điều kiện và linh kiện điện tử thông thường.",
    methods: [
      { id: "air", label: "Hàng không", rate: 125000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 72000, factor: 6000 },
    ],
  },
  {
    id: "western",
    name: "Mỹ / Châu Âu → Việt Nam",
    time: "10–25 ngày dự kiến",
    tag: "Hàng giá trị cao",
    description:
      "Phù hợp hàng cá nhân, hàng có giá trị, phụ kiện công nghệ và lô hàng kích thước lớn.",
    methods: [
      { id: "air", label: "Hàng không", rate: 225000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 118000, factor: 6000 },
    ],
  },
];

const ACCEPTED_GOODS = [
  "Quần áo, giày dép và phụ kiện thời trang",
  "Đồ gia dụng, đồ trang trí và vật dụng cá nhân",
  "Phụ kiện, linh kiện điện tử thông thường",
  "Hàng thương mại có hóa đơn và chứng từ phù hợp",
  "Mỹ phẩm, thực phẩm đóng gói khi đáp ứng quy định nhập khẩu",
];

const RESTRICTED_GOODS = [
  "Hàng có pin, chất lỏng, bột hoặc bình xịt cần được kiểm tra trước",
  "Hàng có thương hiệu cần chứng từ chứng minh nguồn gốc khi được yêu cầu",
  "Thực phẩm, mỹ phẩm và sản phẩm chuyên ngành có thể cần hồ sơ bổ sung",
  "Không tiếp nhận hàng cấm, hàng giả, hàng vi phạm pháp luật hoặc quyền sở hữu trí tuệ",
  "Không tiếp nhận vũ khí, chất cháy nổ, hóa chất nguy hiểm và chất cấm",
];

const FAQS = [
  {
    question: "Dịch vụ ký gửi phù hợp với ai?",
    answer:
      "Dịch vụ phù hợp với khách hàng đã tự mua hàng hoặc có sẵn nguồn hàng ở nước ngoài và chỉ cần hỗ trợ nhận hàng tại kho, vận chuyển quốc tế, xử lý chứng từ và giao hàng tại Việt Nam.",
  },
  {
    question: "Tôi cần làm gì trước khi gửi hàng đến kho?",
    answer:
      "Bạn cần tạo yêu cầu ký gửi để nhận mã kiện và địa chỉ kho. Mã ký gửi phải được ghi rõ trên kiện hàng hoặc phần thông tin người nhận để kho có thể đối chiếu chính xác.",
  },
  {
    question: "Khối lượng tính cước được xác định như thế nào?",
    answer:
      "Khối lượng tính cước thường là giá trị lớn hơn giữa khối lượng thực tế và khối lượng quy đổi theo kích thước. Công thức quy đổi có thể khác nhau tùy tuyến và phương thức vận chuyển.",
  },
  {
    question: "Khi hàng đến kho tôi có được thông báo không?",
    answer:
      "Có. Trạng thái sẽ được cập nhật khi kho tiếp nhận, cân đo, yêu cầu bổ sung thông tin, xuất kho quốc tế, nhập kho Việt Nam và hoàn tất giao hàng.",
  },
  {
    question: "Tôi có thể đăng ký bảo hiểm cho kiện hàng không?",
    answer:
      "Có. Bạn có thể khai báo giá trị hàng hóa và chọn bảo hiểm khi tạo yêu cầu. Phạm vi bảo hiểm và hồ sơ bồi thường được áp dụng theo chính sách tại thời điểm gửi hàng.",
  },
  {
    question: "Thời gian vận chuyển có luôn cố định không?",
    answer:
      "Không. Thời gian hiển thị là thời gian dự kiến và có thể thay đổi do lịch vận chuyển, loại hàng, thời gian kiểm tra chứng từ, thông quan, thời tiết hoặc các yếu tố khách quan khác.",
  },
];

const INITIAL_FORM = {
  route: "china",
  shippingMethod: "road",
  weight: "",
  length: "",
  width: "",
  height: "",
  quantity: "1",
  declaredValue: "",
  insurance: true,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const BLOCKED_NUMBER_KEYS = ["-", "+", "e", "E"];

const ConsignmentService = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [openFaq, setOpenFaq] = useState(0);

  const selectedRoute =
    ROUTES.find((route) => route.id === form.route) || ROUTES[0];

  const selectedMethod =
    selectedRoute.methods.find((method) => method.id === form.shippingMethod) ||
    selectedRoute.methods[0];

  const calculation = useMemo(() => {
    const actualWeightPerPackage = toPositiveNumber(form.weight);
    const quantity = Math.max(
      1,
      Math.floor(toPositiveNumber(form.quantity) || 1),
    );
    const length = toPositiveNumber(form.length);
    const width = toPositiveNumber(form.width);
    const height = toPositiveNumber(form.height);

    const hasFullDimensions = length > 0 && width > 0 && height > 0;
    const volumetricWeightPerPackage = hasFullDimensions
      ? (length * width * height) / selectedMethod.factor
      : 0;

    const chargeableWeightPerPackage = Math.max(
      actualWeightPerPackage,
      volumetricWeightPerPackage,
    );

    const totalChargeableWeight = chargeableWeightPerPackage * quantity;
    const freight = totalChargeableWeight
      ? Math.max(
          totalChargeableWeight * selectedMethod.rate,
          selectedMethod.rate,
        )
      : 0;

    const handlingFee = freight ? 30000 : 0;
    const declaredValue = toPositiveNumber(form.declaredValue);
    const insuranceFee = form.insurance ? declaredValue * 0.01 : 0;

    return {
      quantity,
      actualWeightPerPackage,
      volumetricWeightPerPackage,
      chargeableWeightPerPackage,
      totalChargeableWeight,
      freight,
      handlingFee,
      insuranceFee,
      total: freight + handlingFee + insuranceFee,
    };
  }, [form, selectedMethod]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRouteChange = (routeId) => {
    const nextRoute = ROUTES.find((route) => route.id === routeId) || ROUTES[0];

    setForm((current) => ({
      ...current,
      route: nextRoute.id,
      shippingMethod: nextRoute.methods[0].id,
    }));
  };

  const handleNumberChange = (field, value) => {
    if (value === "" || Number(value) >= 0) {
      updateField(field, value);
    }
  };

  const preventInvalidNumberKeys = (event) => {
    if (BLOCKED_NUMBER_KEYS.includes(event.key)) {
      event.preventDefault();
    }
  };

  const scrollToCalculator = () => {
    document
      .getElementById("consignment-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseRoute = (route) => {
    setForm((current) => ({
      ...current,
      route: route.id,
      shippingMethod: route.methods[0].id,
    }));

    window.setTimeout(scrollToCalculator, 50);
  };

  const createConsignmentRequest = () => {
    navigate("/login", {
      state: {
        estimate: {
          route: selectedRoute.name,
          shippingMethod: selectedMethod.label,
          quantity: calculation.quantity,
          weight: form.weight,
          length: form.length,
          width: form.width,
          height: form.height,
          declaredValue: form.declaredValue,
          insurance: form.insurance,
          estimatedTotal: calculation.total,
        },
      },
    });
  };

  return (
    <>
      {/* Xóa Header ở đây nếu dự án đã render Header trong App hoặc Layout chung. */}
      <Header />

      <main className="consignment-page">
        <section className="consignment-hero">
          <div className="consignment-hero__grid" aria-hidden="true" />
          <div className="consignment-hero__glow" aria-hidden="true" />

          <div className="consignment-container consignment-hero__inner">
            <div className="consignment-hero__content">
              <nav className="consignment-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/dich-vu")}>
                  Dịch vụ
                </button>
                <span>/</span>
                <strong>Ký gửi hàng hóa</strong>
              </nav>

              <span className="consignment-eyebrow">
                <SafetyCertificateOutlined />
                Dịch vụ vận chuyển quốc tế
              </span>

              <h1>
                Bạn tự mua hàng,
                <span> chúng tôi lo hành trình về Việt Nam.</span>
              </h1>

              <p className="consignment-hero__description">
                Gửi hàng đến kho quốc tế, theo dõi trạng thái minh bạch và nhận
                hàng tại Việt Nam. Phù hợp cho cả khách hàng cá nhân, chủ shop
                và doanh nghiệp có nguồn hàng riêng.
              </p>

              <div className="consignment-hero__actions">
                <button
                  type="button"
                  className="consignment-btn consignment-btn--primary"
                  onClick={createConsignmentRequest}
                >
                  Tạo yêu cầu ký gửi
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="consignment-btn consignment-btn--ghost"
                  onClick={scrollToCalculator}
                >
                  <CalculatorOutlined />
                  Tính cước dự kiến
                </button>
              </div>

              <div className="consignment-hero__trust">
                <span>
                  <CheckCircleFilled /> Cấp mã ký gửi riêng
                </span>
                <span>
                  <CheckCircleFilled /> Cập nhật trạng thái kiện
                </span>
                <span>
                  <CheckCircleFilled /> Hỗ trợ bảo hiểm
                </span>
              </div>
            </div>

            <div className="consignment-hero__visual">
              <div className="consignment-tracking-card">
                <div className="consignment-tracking-card__head">
                  <div className="consignment-tracking-card__code">
                    <span className="consignment-tracking-card__icon">
                      <InboxOutlined />
                    </span>
                    <div>
                      <small>Mã ký gửi</small>
                      <strong>VNL-CN-07128</strong>
                    </div>
                  </div>
                  <span className="consignment-status-pill">
                    Đang vận chuyển
                  </span>
                </div>

                <div className="consignment-tracking-route">
                  <div className="consignment-tracking-point is-complete">
                    <span>1</span>
                    <div>
                      <strong>Kho quốc tế</strong>
                      <small>Đã kiểm nhận</small>
                    </div>
                  </div>

                  <div className="consignment-tracking-line">
                    <span />
                    <CarOutlined />
                  </div>

                  <div className="consignment-tracking-point">
                    <span>2</span>
                    <div>
                      <strong>Kho Việt Nam</strong>
                      <small>Dự kiến 3 ngày</small>
                    </div>
                  </div>
                </div>

                <div className="consignment-progress">
                  <span />
                </div>

                <div className="consignment-tracking-meta">
                  <div>
                    <small>Khối lượng</small>
                    <strong>12,5 kg</strong>
                  </div>
                  <div>
                    <small>Phương thức</small>
                    <strong>Đường bộ</strong>
                  </div>
                  <div>
                    <small>Trạng thái</small>
                    <strong>Đang về Việt Nam</strong>
                  </div>
                </div>
              </div>

              <div className="consignment-floating-note consignment-floating-note--top">
                <SafetyCertificateOutlined />
                <div>
                  <strong>Bảo hiểm hàng hóa</strong>
                  <small>Theo giá trị khai báo</small>
                </div>
              </div>

              <div className="consignment-floating-note consignment-floating-note--bottom">
                <CustomerServiceOutlined />
                <div>
                  <strong>Hỗ trợ kiểm tra hàng</strong>
                  <small>Tư vấn tuyến và chứng từ</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="consignment-benefit-strip"
          aria-label="Lợi ích nổi bật"
        >
          <div className="consignment-container consignment-benefit-strip__grid">
            {SERVICE_BENEFITS.map((benefit) => (
              <article key={benefit.title}>
                <span>{benefit.icon}</span>
                <div>
                  <strong>{benefit.title}</strong>
                  <p>{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="consignment-section consignment-process-section">
          <div className="consignment-container">
            <div className="consignment-section-heading consignment-section-heading--center">
              <span className="consignment-section-kicker">
                Quy trình ký gửi
              </span>
              <h2>Đơn giản từ lúc gửi hàng đến khi nhận tại Việt Nam</h2>
              <p>
                Mỗi kiện hàng được gắn với một mã ký gửi để kho dễ dàng đối
                chiếu, cập nhật và xử lý xuyên suốt hành trình.
              </p>
            </div>

            <div className="consignment-process-grid">
              {PROCESS_STEPS.map((step, index) => (
                <article className="consignment-process-card" key={step.number}>
                  <div className="consignment-process-card__top">
                    <span className="consignment-process-card__icon">
                      {step.icon}
                    </span>
                    <span className="consignment-process-card__number">
                      {step.number}
                    </span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < PROCESS_STEPS.length - 1 && (
                    <span
                      className="consignment-process-card__connector"
                      aria-hidden="true"
                    >
                      <ArrowRightOutlined />
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="consignment-section consignment-route-section">
          <div className="consignment-container">
            <div className="consignment-section-heading consignment-section-heading--split">
              <div>
                <span className="consignment-section-kicker">
                  Tuyến vận chuyển
                </span>
                <h2>
                  Chọn phương án phù hợp với loại hàng và thời gian mong muốn
                </h2>
              </div>
              <p>
                Thời gian và đơn giá dưới đây chỉ là dữ liệu minh họa. Chi phí
                chính thức được xác nhận sau khi kho kiểm nhận kiện hàng.
              </p>
            </div>

            <div className="consignment-route-grid">
              {ROUTES.map((route) => (
                <article className="consignment-route-card" key={route.id}>
                  <div className="consignment-route-card__head">
                    <span className="consignment-route-card__icon">
                      <GlobalOutlined />
                    </span>
                    <span className="consignment-route-card__tag">
                      {route.tag}
                    </span>
                  </div>

                  <h3>{route.name}</h3>
                  <div className="consignment-route-card__time">
                    <ClockCircleOutlined /> {route.time}
                  </div>
                  <p>{route.description}</p>

                  <div className="consignment-route-card__methods">
                    {route.methods.map((method) => (
                      <span key={method.id}>{method.label}</span>
                    ))}
                  </div>

                  <button type="button" onClick={() => chooseRoute(route)}>
                    Tính thử tuyến này
                    <ArrowRightOutlined />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="consignment-section consignment-calculator-section"
          id="consignment-calculator"
        >
          <div className="consignment-container consignment-calculator-layout">
            <div className="consignment-calculator-copy">
              <span className="consignment-eyebrow consignment-eyebrow--light">
                <CalculatorOutlined />
                Công cụ ước tính
              </span>
              <h2>Tạm tính chi phí ký gửi</h2>
              <p>
                Nhập thông tin cơ bản để tham khảo khối lượng tính cước và tổng
                chi phí dự kiến trước khi tạo yêu cầu.
              </p>

              <div className="consignment-estimate-summary">
                <div>
                  <span>Tuyến đang chọn</span>
                  <strong>{selectedRoute.name}</strong>
                </div>
                <div>
                  <span>Phương thức</span>
                  <strong>{selectedMethod.label}</strong>
                </div>
                <div>
                  <span>Đơn giá minh họa</span>
                  <strong>{formatCurrency(selectedMethod.rate)}/kg</strong>
                </div>
              </div>

              <div className="consignment-calculator-note">
                <WarningOutlined />
                <div>
                  <strong>Kết quả mang tính tham khảo</strong>
                  <p>
                    Chi phí thực tế có thể thay đổi theo loại hàng, cách đóng
                    gói, phụ phí tuyến, tỷ giá, chính sách hải quan và kết quả
                    cân đo tại kho.
                  </p>
                </div>
              </div>
            </div>

            <div className="consignment-calculator-card">
              <div className="consignment-calculator-card__head">
                <div>
                  <span>Thông tin kiện hàng</span>
                  <h3>Ước tính nhanh chi phí</h3>
                </div>
                <button type="button" onClick={() => setForm(INITIAL_FORM)}>
                  <ReloadOutlined /> Đặt lại
                </button>
              </div>

              <div className="consignment-form-grid">
                <label className="consignment-field consignment-field--full">
                  <span>Tuyến vận chuyển</span>
                  <select
                    value={form.route}
                    onChange={(event) => handleRouteChange(event.target.value)}
                  >
                    {ROUTES.map((route) => (
                      <option value={route.id} key={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="consignment-field consignment-field--full">
                  <span>Phương thức vận chuyển</span>
                  <select
                    value={selectedMethod.id}
                    onChange={(event) =>
                      updateField("shippingMethod", event.target.value)
                    }
                  >
                    {selectedRoute.methods.map((method) => (
                      <option value={method.id} key={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="consignment-field">
                  <span>Khối lượng mỗi kiện (kg)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="Ví dụ: 5.5"
                    value={form.weight}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("weight", event.target.value)
                    }
                  />
                </label>

                <label className="consignment-field">
                  <span>Số kiện</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    placeholder="Ví dụ: 1"
                    value={form.quantity}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("quantity", event.target.value)
                    }
                  />
                </label>

                <label className="consignment-field">
                  <span>Chiều dài (cm)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Dài"
                    value={form.length}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("length", event.target.value)
                    }
                  />
                </label>

                <label className="consignment-field">
                  <span>Chiều rộng (cm)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Rộng"
                    value={form.width}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("width", event.target.value)
                    }
                  />
                </label>

                <label className="consignment-field">
                  <span>Chiều cao (cm)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder="Cao"
                    value={form.height}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("height", event.target.value)
                    }
                  />
                </label>

                <label className="consignment-field">
                  <span>Giá trị khai báo (VND)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Ví dụ: 5000000"
                    value={form.declaredValue}
                    onKeyDown={preventInvalidNumberKeys}
                    onChange={(event) =>
                      handleNumberChange("declaredValue", event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="consignment-insurance-option">
                <input
                  type="checkbox"
                  checked={form.insurance}
                  onChange={(event) =>
                    updateField("insurance", event.target.checked)
                  }
                />
                <span className="consignment-insurance-option__check" />
                <span>
                  <strong>Đăng ký bảo hiểm hàng hóa</strong>
                  <small>Phí minh họa: 1% giá trị khai báo.</small>
                </span>
              </label>

              <div className="consignment-result">
                <div className="consignment-result__row">
                  <span>Khối lượng quy đổi mỗi kiện</span>
                  <strong>
                    {calculation.volumetricWeightPerPackage.toFixed(2)} kg
                  </strong>
                </div>
                <div className="consignment-result__row">
                  <span>Khối lượng tính cước mỗi kiện</span>
                  <strong>
                    {calculation.chargeableWeightPerPackage.toFixed(2)} kg
                  </strong>
                </div>
                <div className="consignment-result__row">
                  <span>Tổng khối lượng tính cước</span>
                  <strong>
                    {calculation.totalChargeableWeight.toFixed(2)} kg
                  </strong>
                </div>
                <div className="consignment-result__row">
                  <span>Cước vận chuyển</span>
                  <strong>{formatCurrency(calculation.freight)}</strong>
                </div>
                <div className="consignment-result__row">
                  <span>Phí xử lý dự kiến</span>
                  <strong>{formatCurrency(calculation.handlingFee)}</strong>
                </div>
                <div className="consignment-result__row">
                  <span>Phí bảo hiểm</span>
                  <strong>{formatCurrency(calculation.insuranceFee)}</strong>
                </div>
                <div className="consignment-result__total">
                  <span>Tổng chi phí dự kiến</span>
                  <strong>{formatCurrency(calculation.total)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="consignment-btn consignment-btn--primary consignment-btn--full"
                onClick={createConsignmentRequest}
              >
                <SendOutlined />
                Tạo yêu cầu với thông tin này
              </button>
            </div>
          </div>
        </section>

        <section className="consignment-section consignment-goods-section">
          <div className="consignment-container">
            <div className="consignment-section-heading consignment-section-heading--center">
              <span className="consignment-section-kicker">
                Quy định hàng hóa
              </span>
              <h2>Kiểm tra loại hàng trước khi gửi đến kho</h2>
              <p>
                Một số nhóm hàng cần chứng từ hoặc phương án vận chuyển riêng.
                Hãy liên hệ trước nếu bạn chưa chắc kiện hàng có được tiếp nhận
                hay không.
              </p>
            </div>

            <div className="consignment-goods-grid">
              <article className="consignment-goods-card consignment-goods-card--accepted">
                <div className="consignment-goods-card__head">
                  <span>
                    <CheckCircleFilled />
                  </span>
                  <div>
                    <small>Nhóm hàng thông thường</small>
                    <h3>Có thể tiếp nhận</h3>
                  </div>
                </div>
                <ul>
                  {ACCEPTED_GOODS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="consignment-goods-card consignment-goods-card--restricted">
                <div className="consignment-goods-card__head">
                  <span>
                    <WarningOutlined />
                  </span>
                  <div>
                    <small>Nhóm hàng cần lưu ý</small>
                    <h3>Cần kiểm tra trước</h3>
                  </div>
                </div>
                <ul>
                  {RESTRICTED_GOODS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="consignment-section consignment-faq-section">
          <div className="consignment-container consignment-faq-layout">
            <div className="consignment-faq-copy">
              <span className="consignment-section-kicker">
                Câu hỏi thường gặp
              </span>
              <h2>Thông tin cần biết trước khi ký gửi</h2>
              <p>
                Những giải đáp cơ bản giúp bạn chuẩn bị đúng mã kiện, thông tin
                hàng hóa và chứng từ trước khi gửi đến kho.
              </p>

              <div className="consignment-support-card">
                <span className="consignment-support-card__icon">
                  <CustomerServiceOutlined />
                </span>
                <div>
                  <strong>Cần kiểm tra loại hàng?</strong>
                  <p>
                    Gửi thông tin sản phẩm cho đội ngũ hỗ trợ để được tư vấn
                    tuyến và giấy tờ cần chuẩn bị.
                  </p>
                  <div className="consignment-support-card__links">
                    <a href="tel:19001234">
                      <PhoneOutlined /> 1900 1234
                    </a>
                    <a href="mailto:support@vietnamlogistic.vn">
                      <MailOutlined /> support@vietnamlogistic.vn
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="consignment-faq-list">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                const contentId = `consignment-faq-content-${index}`;

                return (
                  <article
                    className={`consignment-faq-item ${isOpen ? "is-open" : ""}`}
                    key={faq.question}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={contentId}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      <span>{faq.question}</span>
                      <strong aria-hidden="true">{isOpen ? "−" : "+"}</strong>
                    </button>
                    <div
                      id={contentId}
                      className="consignment-faq-item__content"
                      hidden={!isOpen}
                    >
                      <p>{faq.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="consignment-cta">
          <div className="consignment-container consignment-cta__inner">
            <div>
              <span>Bắt đầu gửi hàng</span>
              <h2>Tạo yêu cầu ký gửi trong vài phút</h2>
              <p>
                Nhận mã ký gửi, địa chỉ kho và hướng dẫn đóng gói để bắt đầu
                hành trình vận chuyển về Việt Nam.
              </p>
            </div>

            <div className="consignment-cta__actions">
              <button
                type="button"
                className="consignment-btn consignment-btn--light"
                onClick={createConsignmentRequest}
              >
                Tạo yêu cầu ký gửi
                <ArrowRightOutlined />
              </button>
              <button
                type="button"
                className="consignment-btn consignment-btn--outline-light"
                onClick={() => navigate("/lien-he")}
              >
                <EnvironmentOutlined />
                Liên hệ tư vấn
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ConsignmentService;
