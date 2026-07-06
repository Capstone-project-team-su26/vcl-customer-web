import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRightOutlined,
  BankOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HeartOutlined,
  HomeOutlined,
  InboxOutlined,
  LinkOutlined,
  MailOutlined,
  PhoneOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  StarFilled,
  SyncOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./BuyForMeService.css";

const COUNTRIES = {
  china: {
    label: "Trung Quốc",
    route: "Trung Quốc → Việt Nam",
    currency: "CNY",
    exchangeRate: 3600,
    freightRate: 68000,
    serviceRate: 0.03,
    minServiceFee: 30000,
    methods: [
      { value: "standard", label: "Tiêu chuẩn", days: "5–10 ngày", multiplier: 1 },
      { value: "express", label: "Nhanh", days: "3–6 ngày", multiplier: 1.35 },
    ],
  },
  japan: {
    label: "Nhật Bản",
    route: "Nhật Bản → Việt Nam",
    currency: "JPY",
    exchangeRate: 180,
    freightRate: 155000,
    serviceRate: 0.04,
    minServiceFee: 50000,
    methods: [
      { value: "standard", label: "Tiêu chuẩn", days: "7–14 ngày", multiplier: 1 },
      { value: "express", label: "Nhanh", days: "5–8 ngày", multiplier: 1.3 },
      { value: "sea", label: "Tiết kiệm", days: "18–30 ngày", multiplier: 0.72 },
    ],
  },
  korea: {
    label: "Hàn Quốc",
    route: "Hàn Quốc → Việt Nam",
    currency: "KRW",
    exchangeRate: 19,
    freightRate: 135000,
    serviceRate: 0.04,
    minServiceFee: 50000,
    methods: [
      { value: "standard", label: "Tiêu chuẩn", days: "7–12 ngày", multiplier: 1 },
      { value: "express", label: "Nhanh", days: "4–7 ngày", multiplier: 1.28 },
    ],
  },
  usa: {
    label: "Mỹ / Châu Âu",
    route: "Mỹ / Châu Âu → Việt Nam",
    currency: "USD",
    exchangeRate: 26000,
    freightRate: 245000,
    serviceRate: 0.05,
    minServiceFee: 80000,
    methods: [
      { value: "standard", label: "Tiêu chuẩn", days: "10–18 ngày", multiplier: 1 },
      { value: "express", label: "Nhanh", days: "7–12 ngày", multiplier: 1.35 },
      { value: "sea", label: "Tiết kiệm", days: "25–45 ngày", multiplier: 0.68 },
    ],
  },
};

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Gửi link sản phẩm",
    description:
      "Bạn gửi link sản phẩm cần mua, số lượng, màu sắc, kích thước và ghi chú riêng nếu có.",
    icon: <LinkOutlined />,
  },
  {
    number: "02",
    title: "Kiểm tra và báo giá",
    description:
      "Nhân viên kiểm tra shop, phí nội địa, tồn kho, thời gian giao hàng và gửi báo giá chi tiết.",
    icon: <FileSearchOutlined />,
  },
  {
    number: "03",
    title: "Thanh toán đơn hàng",
    description:
      "Sau khi xác nhận báo giá, bạn thanh toán tiền hàng và phí dịch vụ để tiến hành đặt mua.",
    icon: <BankOutlined />,
  },
  {
    number: "04",
    title: "Nhận hàng tại Việt Nam",
    description:
      "Hàng được mua, nhận tại kho quốc tế, vận chuyển về Việt Nam và giao đến địa chỉ của bạn.",
    icon: <InboxOutlined />,
  },
];

const BENEFITS = [
  {
    icon: <SearchOutlined />,
    title: "Kiểm tra sản phẩm trước khi mua",
    description:
      "Hỗ trợ rà soát link, biến thể sản phẩm, độ uy tín của shop và các chi phí phát sinh.",
  },
  {
    icon: <DollarOutlined />,
    title: "Báo giá rõ ràng",
    description:
      "Tách riêng tiền hàng, phí mua hộ, phí vận chuyển, bảo hiểm và phụ phí nếu có.",
  },
  {
    icon: <ShoppingCartOutlined />,
    title: "Hỗ trợ đặt hàng nhanh",
    description:
      "Phù hợp khi bạn chưa có tài khoản thanh toán quốc tế hoặc không thể tự mua trên website nước ngoài.",
  },
  {
    icon: <SyncOutlined />,
    title: "Theo dõi trạng thái đơn",
    description:
      "Cập nhật tiến trình từ lúc tạo yêu cầu, đặt mua, hàng về kho đến khi giao thành công.",
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: "Hạn chế rủi ro mua sai",
    description:
      "Đội ngũ hỗ trợ xác nhận thông tin sản phẩm trước khi đặt để giảm nhầm size, màu hoặc mẫu.",
  },
  {
    icon: <CustomerServiceOutlined />,
    title: "Tư vấn 1:1",
    description:
      "Hỗ trợ khách hàng chọn phương án mua, vận chuyển và bảo hiểm phù hợp giá trị đơn hàng.",
  },
];

const POPULAR_CATEGORIES = [
  "Thời trang, giày dép, phụ kiện",
  "Mỹ phẩm, chăm sóc cá nhân",
  "Đồ gia dụng, đồ trang trí",
  "Linh kiện và phụ kiện điện tử",
  "Đồ chơi, mô hình, sưu tầm",
  "Hàng order theo yêu cầu cá nhân",
];

const CAUTION_ITEMS = [
  "Hàng có thương hiệu cần hóa đơn hoặc chứng từ rõ ràng",
  "Mỹ phẩm, thực phẩm, chất lỏng cần kiểm tra điều kiện vận chuyển",
  "Thiết bị có pin, nam châm hoặc linh kiện đặc thù cần khai báo trước",
  "Hàng dễ vỡ nên sử dụng đóng gói gia cố hoặc bảo hiểm",
  "Hàng cấm, hàng giả, hàng vi phạm pháp luật sẽ không được nhận mua hộ",
];

const FAQS = [
  {
    question: "Dịch vụ mua hộ là gì?",
    answer:
      "Mua hộ là dịch vụ hỗ trợ khách hàng đặt mua sản phẩm từ website, sàn thương mại điện tử hoặc shop nước ngoài. Đơn vị mua hộ sẽ kiểm tra link, báo giá, thanh toán, nhận hàng tại kho quốc tế và vận chuyển về Việt Nam.",
  },
  {
    question: "Tôi cần cung cấp thông tin gì khi tạo yêu cầu mua hộ?",
    answer:
      "Bạn cần cung cấp link sản phẩm, số lượng, màu sắc, kích thước, hình ảnh nếu có, quốc gia mua hàng và ghi chú đặc biệt. Với sản phẩm giá trị cao hoặc hàng đặc thù, nên cung cấp thêm thông tin shop và điều kiện bảo hành.",
  },
  {
    question: "Phí mua hộ được tính như thế nào?",
    answer:
      "Phí mua hộ thường được tính theo tỷ lệ phần trăm trên tiền hàng, có mức phí tối thiểu tùy quốc gia. Ngoài ra có thể phát sinh phí ship nội địa, phí vận chuyển quốc tế, bảo hiểm hoặc phụ phí hàng đặc biệt.",
  },
  {
    question: "Sau khi tạo yêu cầu có thể hủy không?",
    answer:
      "Bạn có thể hủy trước khi đơn được đặt mua. Sau khi đơn đã được thanh toán cho shop, việc hủy sẽ phụ thuộc vào chính sách của shop hoặc sàn thương mại điện tử nơi mua hàng.",
  },
  {
    question: "Tôi có được kiểm tra hàng khi về kho không?",
    answer:
      "Hệ thống sẽ cập nhật trạng thái khi hàng về kho. Tùy chính sách từng dịch vụ, kho có thể hỗ trợ kiểm đếm cơ bản hoặc chụp ảnh kiện hàng trước khi vận chuyển về Việt Nam.",
  },
];

const INITIAL_FORM = {
  country: "china",
  method: "standard",
  productPrice: "",
  domesticShipping: "",
  quantity: "1",
  weight: "",
  insurance: true,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatForeignMoney = (value, currency) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0) + ` ${currency}`;

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const preventInvalidNumberKey = (event) => {
  if (["e", "E", "+", "-"].includes(event.key)) {
    event.preventDefault();
  }
};

const BuyForMeService = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [openFaq, setOpenFaq] = useState(0);

  const countryConfig = COUNTRIES[form.country];
  const methodConfig =
    countryConfig.methods.find((item) => item.value === form.method) ||
    countryConfig.methods[0];

  const calculation = useMemo(() => {
    const country = COUNTRIES[form.country];
    const method =
      country.methods.find((item) => item.value === form.method) ||
      country.methods[0];

    const productPrice = safeNumber(form.productPrice);
    const domesticShipping = safeNumber(form.domesticShipping);
    const quantity = Math.max(1, Math.floor(safeNumber(form.quantity) || 1));
    const weight = safeNumber(form.weight);

    const goodsForeign = productPrice * quantity + domesticShipping;
    const goodsVnd = goodsForeign * country.exchangeRate;

    const serviceFee = goodsVnd
      ? Math.max(goodsVnd * country.serviceRate, country.minServiceFee)
      : 0;

    const internationalShipping = weight
      ? Math.max(weight * country.freightRate * method.multiplier, country.freightRate * 0.5)
      : 0;

    const insuranceFee = form.insurance && goodsVnd ? goodsVnd * 0.01 : 0;
    const estimatedTotal =
      goodsVnd + serviceFee + internationalShipping + insuranceFee;

    return {
      country,
      method,
      productPrice,
      domesticShipping,
      quantity,
      weight,
      goodsForeign,
      goodsVnd,
      serviceFee,
      internationalShipping,
      insuranceFee,
      estimatedTotal,
    };
  }, [form]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = (value) => {
    const nextCountry = COUNTRIES[value];
    setForm((current) => ({
      ...current,
      country: value,
      method: nextCountry.methods[0].value,
    }));
  };

  const handleNumberChange = (field, value) => {
    if (value === "" || Number(value) >= 0) {
      updateField(field, value);
    }
  };

  const scrollToCalculator = () => {
    document
      .getElementById("buyfor-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const chooseCountry = (countryKey) => {
    handleCountryChange(countryKey);
    setTimeout(scrollToCalculator, 80);
  };

  const handleCreateRequest = () => {
    navigate("/login", {
      state: {
        requestType: "BUY_FOR_ME",
        estimate: calculation,
        form,
      },
    });
  };

  return (
    <>
      <Header />

      <main className="buyfor-page">
        <section className="buyfor-hero">
          <div className="buyfor-hero__glow buyfor-hero__glow--one" />
          <div className="buyfor-hero__glow buyfor-hero__glow--two" />

          <div className="buyfor-container buyfor-hero__inner">
            <div className="buyfor-hero__content">
              <div className="buyfor-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/dich-vu")}>
                  Dịch vụ
                </button>
                <span>/</span>
                <strong>Mua hộ hàng quốc tế</strong>
              </div>

              <span className="buyfor-eyebrow">
                <ShoppingOutlined />
                Dịch vụ order hàng nước ngoài
              </span>

              <h1>
                Mua hộ hàng quốc tế
                <span> nhanh, rõ phí, dễ theo dõi</span>
              </h1>

              <p className="buyfor-hero__description">
                Gửi link sản phẩm bạn muốn mua, đội ngũ hỗ trợ sẽ kiểm tra shop,
                báo giá, đặt hàng, nhận hàng tại kho quốc tế và vận chuyển về
                Việt Nam theo quy trình minh bạch.
              </p>

              <div className="buyfor-hero__actions">
                <button
                  type="button"
                  className="buyfor-btn buyfor-btn--primary"
                  onClick={handleCreateRequest}
                >
                  Tạo yêu cầu mua hộ
                  <ArrowRightOutlined />
                </button>

                <button
                  type="button"
                  className="buyfor-btn buyfor-btn--secondary"
                  onClick={scrollToCalculator}
                >
                  <CalculatorOutlined />
                  Tính phí dự kiến
                </button>
              </div>

              <div className="buyfor-hero__trust">
                <span>
                  <CheckCircleFilled /> Kiểm tra link trước khi mua
                </span>
                <span>
                  <CheckCircleFilled /> Báo giá minh bạch
                </span>
                <span>
                  <CheckCircleFilled /> Theo dõi trạng thái đơn
                </span>
              </div>
            </div>

            <div className="buyfor-hero__visual">
              <div className="buyfor-order-card">
                <div className="buyfor-order-card__header">
                  <div>
                    <span>Đơn mua hộ</span>
                    <strong>BFM-2026-08215</strong>
                  </div>
                  <small>Đang báo giá</small>
                </div>

                <div className="buyfor-product-preview">
                  <div className="buyfor-product-preview__image">
                    <ShoppingCartOutlined />
                  </div>

                  <div>
                    <strong>Wireless Headphone Pro</strong>
                    <span>2 sản phẩm · China Mall</span>

                    <div className="buyfor-rating">
                      <StarFilled />
                      <StarFilled />
                      <StarFilled />
                      <StarFilled />
                      <StarFilled />
                      <small>Shop uy tín</small>
                    </div>
                  </div>
                </div>

                <div className="buyfor-order-timeline">
                  <div className="is-done">
                    <span />
                    <p>Đã nhận link</p>
                  </div>
                  <div className="is-active">
                    <span />
                    <p>Kiểm tra giá</p>
                  </div>
                  <div>
                    <span />
                    <p>Đặt mua</p>
                  </div>
                  <div>
                    <span />
                    <p>Vận chuyển</p>
                  </div>
                </div>

                <div className="buyfor-order-summary">
                  <article>
                    <small>Tiền hàng</small>
                    <strong>1.850.000đ</strong>
                  </article>
                  <article>
                    <small>Phí mua hộ</small>
                    <strong>55.500đ</strong>
                  </article>
                  <article>
                    <small>Dự kiến</small>
                    <strong>7–10 ngày</strong>
                  </article>
                </div>
              </div>

              <div className="buyfor-floating-card buyfor-floating-card--left">
                <ThunderboltOutlined />
                <div>
                  <strong>Báo giá nhanh</strong>
                  <small>Kiểm tra link và phí trước khi đặt</small>
                </div>
              </div>

              <div className="buyfor-floating-card buyfor-floating-card--right">
                <TruckOutlined />
                <div>
                  <strong>Giao về Việt Nam</strong>
                  <small>Theo dõi trạng thái từng chặng</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="buyfor-stats">
          <div className="buyfor-container buyfor-stats__grid">
            <article>
              <strong>4+</strong>
              <span>Thị trường hỗ trợ mua hộ</span>
            </article>
            <article>
              <strong>1:1</strong>
              <span>Nhân viên tư vấn đơn hàng</span>
            </article>
            <article>
              <strong>24/7</strong>
              <span>Tra cứu trạng thái đơn</span>
            </article>
            <article>
              <strong>100%</strong>
              <span>Chi phí hiển thị trước xác nhận</span>
            </article>
          </div>
        </section>

        <section className="buyfor-section">
          <div className="buyfor-container">
            <div className="buyfor-section-heading buyfor-section-heading--center">
              <span>Quy trình mua hộ</span>
              <h2>Order hàng quốc tế đơn giản trong 4 bước</h2>
              <p>
                Từ lúc gửi link sản phẩm đến khi nhận hàng tại Việt Nam, mọi
                trạng thái được cập nhật rõ ràng để bạn dễ theo dõi.
              </p>
            </div>

            <div className="buyfor-process-grid">
              {PROCESS_STEPS.map((step, index) => (
                <article className="buyfor-process-card" key={step.number}>
                  <div className="buyfor-process-card__top">
                    <span className="buyfor-process-card__icon">
                      {step.icon}
                    </span>
                    <strong>{step.number}</strong>
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>

                  {index < PROCESS_STEPS.length - 1 && (
                    <span className="buyfor-process-card__arrow">
                      <ArrowRightOutlined />
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyfor-section buyfor-section--soft">
          <div className="buyfor-container">
            <div className="buyfor-section-heading">
              <span>Vì sao nên dùng mua hộ?</span>
              <h2>Giải pháp phù hợp khi bạn muốn mua hàng nước ngoài an toàn hơn</h2>
              <p>
                Dịch vụ mua hộ giúp bạn giảm rủi ro khi tự đặt hàng, đặc biệt
                với website nước ngoài, shop chưa quen hoặc sản phẩm cần xác nhận
                thông tin kỹ trước khi mua.
              </p>
            </div>

            <div className="buyfor-benefit-grid">
              {BENEFITS.map((benefit) => (
                <article className="buyfor-benefit-card" key={benefit.title}>
                  <span>{benefit.icon}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyfor-section">
          <div className="buyfor-container">
            <div className="buyfor-section-heading buyfor-section-heading--center">
              <span>Thị trường hỗ trợ</span>
              <h2>Mua hàng từ nhiều quốc gia phổ biến</h2>
              <p>
                Bạn có thể tạo yêu cầu mua hộ từ các website, sàn thương mại điện
                tử hoặc shop quốc tế. Thời gian và phí sẽ phụ thuộc tuyến mua hàng.
              </p>
            </div>

            <div className="buyfor-country-grid">
              {Object.entries(COUNTRIES).map(([key, country]) => (
                <article className="buyfor-country-card" key={key}>
                  <div className="buyfor-country-card__icon">
                    <GlobalOutlined />
                  </div>

                  <div>
                    <h3>{country.route}</h3>
                    <p>
                      Tỷ giá tham khảo:{" "}
                      <strong>
                        1 {country.currency} ≈ {formatCurrency(country.exchangeRate)}
                      </strong>
                    </p>
                    <p>
                      Phí mua hộ từ{" "}
                      <strong>{Math.round(country.serviceRate * 100)}%</strong>{" "}
                      tiền hàng.
                    </p>
                  </div>

                  <button type="button" onClick={() => chooseCountry(key)}>
                    Tính phí tuyến này
                    <ArrowRightOutlined />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="buyfor-section buyfor-calculator-section"
          id="buyfor-calculator"
        >
          <div className="buyfor-container buyfor-calculator-layout">
            <div className="buyfor-calculator-copy">
              <span className="buyfor-eyebrow buyfor-eyebrow--light">
                <CalculatorOutlined />
                Công cụ ước tính
              </span>

              <h2>Tạm tính chi phí mua hộ</h2>

              <p>
                Nhập giá sản phẩm, số lượng, phí ship nội địa và cân nặng dự kiến
                để tham khảo chi phí trước khi tạo yêu cầu.
              </p>

              <div className="buyfor-note-card">
                <WarningOutlined />
                <div>
                  <strong>Lưu ý về chi phí</strong>
                  <p>
                    Kết quả chỉ là ước tính UI. Báo giá chính thức sẽ được xác nhận
                    sau khi nhân viên kiểm tra link sản phẩm, shop, phí nội địa và
                    điều kiện vận chuyển thực tế.
                  </p>
                </div>
              </div>

              <ul className="buyfor-check-list">
                <li>
                  <CheckCircleFilled /> Không cần tự thanh toán bằng thẻ quốc tế
                </li>
                <li>
                  <CheckCircleFilled /> Có báo giá trước khi đặt mua
                </li>
                <li>
                  <CheckCircleFilled /> Có thể mua nhiều link trong một yêu cầu
                </li>
              </ul>
            </div>

            <div className="buyfor-calculator-card">
              <div className="buyfor-calculator-card__title">
                <div>
                  <span>Thông tin đơn mua hộ</span>
                  <h3>Ước tính chi phí</h3>
                </div>

                <button type="button" onClick={() => setForm(INITIAL_FORM)}>
                  <ReloadOutlined />
                  Đặt lại
                </button>
              </div>

              <div className="buyfor-form-grid">
                <label className="buyfor-field buyfor-field--full">
                  <span>Quốc gia mua hàng</span>
                  <select
                    value={form.country}
                    onChange={(event) => handleCountryChange(event.target.value)}
                  >
                    <option value="china">Trung Quốc</option>
                    <option value="japan">Nhật Bản</option>
                    <option value="korea">Hàn Quốc</option>
                    <option value="usa">Mỹ / Châu Âu</option>
                  </select>
                </label>

                <label className="buyfor-field buyfor-field--full">
                  <span>Phương thức vận chuyển</span>
                  <select
                    value={form.method}
                    onChange={(event) => updateField("method", event.target.value)}
                  >
                    {countryConfig.methods.map((method) => (
                      <option value={method.value} key={method.value}>
                        {method.label} · {method.days}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="buyfor-field">
                  <span>
                    Giá sản phẩm / món ({countryConfig.currency})
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder={`Ví dụ: ${countryConfig.currency === "USD" ? "35" : "120"}`}
                    value={form.productPrice}
                    onKeyDown={preventInvalidNumberKey}
                    onWheel={(event) => event.currentTarget.blur()}
                    onChange={(event) =>
                      handleNumberChange("productPrice", event.target.value)
                    }
                  />
                </label>

                <label className="buyfor-field">
                  <span>Số lượng</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="Ví dụ: 2"
                    value={form.quantity}
                    onKeyDown={preventInvalidNumberKey}
                    onWheel={(event) => event.currentTarget.blur()}
                    onChange={(event) =>
                      handleNumberChange("quantity", event.target.value)
                    }
                  />
                </label>

                <label className="buyfor-field">
                  <span>
                    Ship nội địa ({countryConfig.currency})
                  </span>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    placeholder="Ví dụ: 15"
                    value={form.domesticShipping}
                    onKeyDown={preventInvalidNumberKey}
                    onWheel={(event) => event.currentTarget.blur()}
                    onChange={(event) =>
                      handleNumberChange("domesticShipping", event.target.value)
                    }
                  />
                </label>

                <label className="buyfor-field">
                  <span>Cân nặng dự kiến (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="Ví dụ: 1.5"
                    value={form.weight}
                    onKeyDown={preventInvalidNumberKey}
                    onWheel={(event) => event.currentTarget.blur()}
                    onChange={(event) =>
                      handleNumberChange("weight", event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="buyfor-insurance">
                <input
                  type="checkbox"
                  checked={form.insurance}
                  onChange={(event) => updateField("insurance", event.target.checked)}
                />
                <span>
                  <strong>Đăng ký bảo hiểm hàng hóa</strong>
                  <small>Phí tham khảo 1% trên giá trị hàng hóa quy đổi.</small>
                </span>
              </label>

              <div className="buyfor-current-route">
                <div>
                  <small>Tuyến đang chọn</small>
                  <strong>{countryConfig.route}</strong>
                </div>
                <div>
                  <small>Thời gian dự kiến</small>
                  <strong>{methodConfig.days}</strong>
                </div>
              </div>

              <div className="buyfor-result">
                <div className="buyfor-result__row">
                  <span>Giá trị hàng hóa</span>
                  <strong>
                    {formatForeignMoney(calculation.goodsForeign, countryConfig.currency)}
                  </strong>
                </div>

                <div className="buyfor-result__row">
                  <span>Tiền hàng quy đổi</span>
                  <strong>{formatCurrency(calculation.goodsVnd)}</strong>
                </div>

                <div className="buyfor-result__row">
                  <span>Phí mua hộ</span>
                  <strong>{formatCurrency(calculation.serviceFee)}</strong>
                </div>

                <div className="buyfor-result__row">
                  <span>Vận chuyển quốc tế</span>
                  <strong>{formatCurrency(calculation.internationalShipping)}</strong>
                </div>

                <div className="buyfor-result__row">
                  <span>Phí bảo hiểm</span>
                  <strong>{formatCurrency(calculation.insuranceFee)}</strong>
                </div>

                <div className="buyfor-result__total">
                  <span>Tổng chi phí dự kiến</span>
                  <strong>{formatCurrency(calculation.estimatedTotal)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="buyfor-btn buyfor-btn--primary buyfor-btn--full"
                onClick={handleCreateRequest}
              >
                <SendOutlined />
                Tạo yêu cầu với thông tin này
              </button>
            </div>
          </div>
        </section>

        <section className="buyfor-section">
          <div className="buyfor-container buyfor-policy-layout">
            <article className="buyfor-policy-card buyfor-policy-card--good">
              <span className="buyfor-policy-card__icon">
                <CheckCircleFilled />
              </span>

              <div>
                <span className="buyfor-policy-card__label">Nhóm hàng phổ biến</span>
                <h2>Các mặt hàng thường được mua hộ</h2>

                <ul>
                  {POPULAR_CATEGORIES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="buyfor-policy-card buyfor-policy-card--warning">
              <span className="buyfor-policy-card__icon">
                <WarningOutlined />
              </span>

              <div>
                <span className="buyfor-policy-card__label">
                  Cần kiểm tra trước khi mua
                </span>
                <h2>Một số nhóm hàng cần lưu ý</h2>

                <ul>
                  {CAUTION_ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section className="buyfor-section buyfor-section--soft">
          <div className="buyfor-container buyfor-faq-layout">
            <div className="buyfor-section-heading">
              <span>Giải đáp nhanh</span>
              <h2>Câu hỏi thường gặp về dịch vụ mua hộ</h2>
              <p>
                Những thông tin cơ bản giúp bạn hiểu rõ quy trình trước khi tạo
                yêu cầu mua hộ.
              </p>

              <div className="buyfor-support-box">
                <QuestionCircleOutlined />
                <div>
                  <strong>Cần kiểm tra link sản phẩm?</strong>
                  <p>
                    Gửi link cho đội ngũ hỗ trợ để được tư vấn giá, phí và khả năng
                    vận chuyển trước khi đặt.
                  </p>

                  <div>
                    <a href="tel:19001234">
                      <PhoneOutlined />
                      1900 1234
                    </a>
                    <a href="mailto:support@vietnamlogistic.vn">
                      <MailOutlined />
                      support@vietnamlogistic.vn
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="buyfor-faq-list">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <article
                    className={`buyfor-faq-item ${isOpen ? "is-open" : ""}`}
                    key={faq.question}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      <span>{faq.question}</span>
                      <strong>{isOpen ? "−" : "+"}</strong>
                    </button>

                    {isOpen && <p>{faq.answer}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="buyfor-cta">
          <div className="buyfor-container buyfor-cta__inner">
            <div>
              <span>Bắt đầu mua hàng quốc tế</span>
              <h2>Gửi link sản phẩm để nhận báo giá mua hộ</h2>
              <p>
                Tạo yêu cầu trong vài phút, nhận báo giá rõ ràng và theo dõi đơn
                hàng từ lúc đặt mua đến khi giao tại Việt Nam.
              </p>
            </div>

            <div className="buyfor-cta__actions">
              <button
                type="button"
                className="buyfor-btn buyfor-btn--light"
                onClick={handleCreateRequest}
              >
                Tạo yêu cầu mua hộ
                <ArrowRightOutlined />
              </button>

              <button
                type="button"
                className="buyfor-btn buyfor-btn--outline-light"
                onClick={() => navigate("/lien-he")}
              >
                Liên hệ tư vấn
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default BuyForMeService;