import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  DollarOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./PricingCalculator.css";

const SERVICE_TYPES = {
  buyForMe: {
    label: "Mua hộ",
    description: "Tính tiền hàng quy đổi, phí mua hộ, vận chuyển và bảo hiểm.",
    requestPath: "/dich-vu/mua-ho",
  },
  consignment: {
    label: "Ký gửi",
    description: "Tính cước theo khối lượng thực tế hoặc khối lượng quy đổi.",
    requestPath: "/dich-vu/ky-gui",
  },
};

const COUNTRIES = {
  china: {
    name: "Trung Quốc",
    route: "Trung Quốc → Việt Nam",
    currency: "CNY",
    exchangeRate: 3600,
    buyFeeRate: 0.03,
    minBuyFee: 30000,
    methods: [
      { id: "road", label: "Đường bộ", rate: 68000, factor: 6000, time: "5–10 ngày" },
      { id: "air", label: "Hàng không", rate: 98000, factor: 5000, time: "3–6 ngày" },
    ],
  },
  japan: {
    name: "Nhật Bản",
    route: "Nhật Bản → Việt Nam",
    currency: "JPY",
    exchangeRate: 180,
    buyFeeRate: 0.04,
    minBuyFee: 50000,
    methods: [
      { id: "air", label: "Hàng không", rate: 145000, factor: 5000, time: "7–14 ngày" },
      { id: "sea", label: "Đường biển", rate: 78000, factor: 6000, time: "18–30 ngày" },
    ],
  },
  korea: {
    name: "Hàn Quốc",
    route: "Hàn Quốc → Việt Nam",
    currency: "KRW",
    exchangeRate: 19,
    buyFeeRate: 0.04,
    minBuyFee: 50000,
    methods: [
      { id: "air", label: "Hàng không", rate: 125000, factor: 5000, time: "7–12 ngày" },
      { id: "sea", label: "Đường biển", rate: 72000, factor: 6000, time: "18–28 ngày" },
    ],
  },
  western: {
    name: "Mỹ / Châu Âu",
    route: "Mỹ / Châu Âu → Việt Nam",
    currency: "USD",
    exchangeRate: 26000,
    buyFeeRate: 0.05,
    minBuyFee: 80000,
    methods: [
      { id: "air", label: "Hàng không", rate: 225000, factor: 5000, time: "10–18 ngày" },
      { id: "sea", label: "Đường biển", rate: 118000, factor: 6000, time: "25–45 ngày" },
    ],
  },
};

const INITIAL_FORM = {
  serviceType: "buyForMe",
  country: "china",
  method: "road",
  productPrice: "",
  quantity: "1",
  domesticShipping: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  declaredValue: "",
  insurance: true,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const PricingCalculator = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);

  const country = COUNTRIES[form.country];
  const method = country.methods.find((item) => item.id === form.method) || country.methods[0];
  const service = SERVICE_TYPES[form.serviceType];

  const calculation = useMemo(() => {
    const quantity = Math.max(1, Math.floor(safeNumber(form.quantity) || 1));
    const productPrice = safeNumber(form.productPrice);
    const domesticShipping = safeNumber(form.domesticShipping);
    const declaredValue = safeNumber(form.declaredValue);
    const actualWeight = safeNumber(form.weight);
    const length = safeNumber(form.length);
    const width = safeNumber(form.width);
    const height = safeNumber(form.height);

    const goodsForeign = productPrice * quantity + domesticShipping;
    const goodsVnd = goodsForeign * country.exchangeRate;

    const buyForMeFee =
      form.serviceType === "buyForMe" && goodsVnd
        ? Math.max(goodsVnd * country.buyFeeRate, country.minBuyFee)
        : 0;

    const volumetricWeight = length && width && height ? (length * width * height) / method.factor : 0;
    const chargeableWeightPerBox = Math.max(actualWeight, volumetricWeight);
    const totalChargeableWeight = chargeableWeightPerBox * quantity;
    const freight = totalChargeableWeight
      ? Math.max(totalChargeableWeight * method.rate, method.rate * 0.5)
      : 0;

    const protectionBase = form.serviceType === "buyForMe" ? goodsVnd : declaredValue;
    const insuranceFee = form.insurance && protectionBase ? protectionBase * 0.01 : 0;
    const handlingFee = form.serviceType === "consignment" && freight ? 30000 : 0;

    return {
      quantity,
      goodsForeign,
      goodsVnd,
      buyForMeFee,
      volumetricWeight,
      chargeableWeightPerBox,
      totalChargeableWeight,
      freight,
      handlingFee,
      insuranceFee,
      total: goodsVnd + buyForMeFee + freight + handlingFee + insuranceFee,
    };
  }, [form, country, method]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = (countryId) => {
    const nextCountry = COUNTRIES[countryId];
    setForm((current) => ({
      ...current,
      country: countryId,
      method: nextCountry.methods[0].id,
    }));
  };

  const handleNumberChange = (field, value) => {
    if (value === "" || Number(value) >= 0) {
      updateField(field, value);
    }
  };

  const preventInvalidKey = (event) => {
    if (["e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <>
      <Header />

      <main className="pricing-calculator-page">
        <section className="pricing-calculator-hero">
          <div className="pricing-calculator-container pricing-calculator-hero__inner">
            <div>
              <div className="pricing-calculator-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/bang-gia")}>Bảng giá</button>
                <span>/</span>
                <strong>Công cụ tính giá</strong>
              </div>

              <span className="pricing-calculator-eyebrow">
                <CalculatorOutlined /> Công cụ ước tính chi phí
              </span>

              <h1>
                Tính nhanh chi phí
                <span> mua hộ và ký gửi hàng hóa</span>
              </h1>

              <p>
                Nhập thông tin đơn hàng hoặc kiện hàng để tham khảo tổng chi phí trước khi tạo yêu cầu chính thức.
              </p>
            </div>

            <div className="pricing-calculator-summary-card">
              <span><DollarOutlined /></span>
              <small>Tổng chi phí dự kiến</small>
              <strong>{formatCurrency(calculation.total)}</strong>
              <p>{service.description}</p>
            </div>
          </div>
        </section>

        <section className="pricing-calculator-section">
          <div className="pricing-calculator-container pricing-calculator-layout">
            <div className="pricing-calculator-copy">
              <span className="pricing-calculator-kicker">Thiết lập nhanh</span>
              <h2>Chọn loại dịch vụ và tuyến vận chuyển</h2>
              <p>
                Các mức giá bên dưới là dữ liệu minh họa cho UI. Khi nối API, bạn chỉ cần thay bảng giá theo cấu hình thật.
              </p>

              <div className="pricing-calculator-service-tabs">
                {Object.entries(SERVICE_TYPES).map(([key, item]) => (
                  <button
                    type="button"
                    key={key}
                    className={form.serviceType === key ? "is-active" : ""}
                    onClick={() => updateField("serviceType", key)}
                  >
                    <CheckCircleFilled />
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>

              <div className="pricing-calculator-note">
                <WarningOutlined />
                <p>
                  Kết quả chỉ mang tính tham khảo. Chi phí chính thức được xác nhận sau khi nhân viên kiểm tra link sản phẩm hoặc kho cân đo kiện hàng.
                </p>
              </div>
            </div>

            <div className="pricing-calculator-card">
              <div className="pricing-calculator-card__head">
                <div>
                  <span>Thông tin tính giá</span>
                  <h3>Nhập dữ liệu ước tính</h3>
                </div>
                <button type="button" onClick={() => setForm(INITIAL_FORM)}>
                  <ReloadOutlined /> Đặt lại
                </button>
              </div>

              <div className="pricing-calculator-form-grid">
                <label className="pricing-calculator-field pricing-calculator-field--full">
                  <span>Quốc gia / tuyến vận chuyển</span>
                  <select value={form.country} onChange={(event) => handleCountryChange(event.target.value)}>
                    {Object.entries(COUNTRIES).map(([key, item]) => (
                      <option key={key} value={key}>{item.route}</option>
                    ))}
                  </select>
                </label>

                <label className="pricing-calculator-field pricing-calculator-field--full">
                  <span>Phương thức vận chuyển</span>
                  <select value={form.method} onChange={(event) => updateField("method", event.target.value)}>
                    {country.methods.map((item) => (
                      <option key={item.id} value={item.id}>{item.label} · {item.time} · {formatCurrency(item.rate)}/kg</option>
                    ))}
                  </select>
                </label>

                {form.serviceType === "buyForMe" && (
                  <>
                    <label className="pricing-calculator-field">
                      <span>Giá sản phẩm / món ({country.currency})</span>
                      <input type="number" min="0" placeholder="Ví dụ: 120" value={form.productPrice} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("productPrice", event.target.value)} />
                    </label>
                    <label className="pricing-calculator-field">
                      <span>Ship nội địa ({country.currency})</span>
                      <input type="number" min="0" placeholder="Ví dụ: 15" value={form.domesticShipping} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("domesticShipping", event.target.value)} />
                    </label>
                  </>
                )}

                <label className="pricing-calculator-field">
                  <span>Số lượng / số kiện</span>
                  <input type="number" min="1" placeholder="Ví dụ: 2" value={form.quantity} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("quantity", event.target.value)} />
                </label>

                <label className="pricing-calculator-field">
                  <span>Khối lượng mỗi kiện (kg)</span>
                  <input type="number" min="0" step="0.1" placeholder="Ví dụ: 1.5" value={form.weight} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("weight", event.target.value)} />
                </label>

                <label className="pricing-calculator-field">
                  <span>Dài (cm)</span>
                  <input type="number" min="0" placeholder="Dài" value={form.length} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("length", event.target.value)} />
                </label>

                <label className="pricing-calculator-field">
                  <span>Rộng (cm)</span>
                  <input type="number" min="0" placeholder="Rộng" value={form.width} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("width", event.target.value)} />
                </label>

                <label className="pricing-calculator-field">
                  <span>Cao (cm)</span>
                  <input type="number" min="0" placeholder="Cao" value={form.height} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("height", event.target.value)} />
                </label>

                {form.serviceType === "consignment" && (
                  <label className="pricing-calculator-field">
                    <span>Giá trị khai báo (VND)</span>
                    <input type="number" min="0" placeholder="Ví dụ: 5000000" value={form.declaredValue} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("declaredValue", event.target.value)} />
                  </label>
                )}
              </div>

              <label className="pricing-calculator-insurance">
                <input type="checkbox" checked={form.insurance} onChange={(event) => updateField("insurance", event.target.checked)} />
                <span>
                  <strong>Đăng ký bảo hiểm hàng hóa</strong>
                  <small>Phí tham khảo 1% theo giá trị hàng hóa hoặc giá trị khai báo.</small>
                </span>
              </label>

              <div className="pricing-calculator-result">
                <div><span>Tuyến đang chọn</span><strong>{country.route}</strong></div>
                {form.serviceType === "buyForMe" && <div><span>Tiền hàng quy đổi</span><strong>{formatCurrency(calculation.goodsVnd)}</strong></div>}
                {form.serviceType === "buyForMe" && <div><span>Phí mua hộ</span><strong>{formatCurrency(calculation.buyForMeFee)}</strong></div>}
                <div><span>Khối lượng quy đổi / kiện</span><strong>{calculation.volumetricWeight.toFixed(2)} kg</strong></div>
                <div><span>Tổng khối lượng tính cước</span><strong>{calculation.totalChargeableWeight.toFixed(2)} kg</strong></div>
                <div><span>Phí vận chuyển</span><strong>{formatCurrency(calculation.freight)}</strong></div>
                {form.serviceType === "consignment" && <div><span>Phí xử lý</span><strong>{formatCurrency(calculation.handlingFee)}</strong></div>}
                <div><span>Phí bảo hiểm</span><strong>{formatCurrency(calculation.insuranceFee)}</strong></div>
                <div className="pricing-calculator-result__total"><span>Tổng chi phí dự kiến</span><strong>{formatCurrency(calculation.total)}</strong></div>
              </div>

              <button type="button" className="pricing-calculator-btn pricing-calculator-btn--primary pricing-calculator-btn--full" onClick={() => navigate(service.requestPath)}>
                <SendOutlined /> Tạo yêu cầu {service.label.toLowerCase()} <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="pricing-calculator-tips">
          <div className="pricing-calculator-container pricing-calculator-tips__grid">
            <article><InfoCircleOutlined /><strong>Giá chỉ tham khảo</strong><p>Chi phí thực tế cần xác nhận theo đơn hàng, tuyến, kho và loại hàng.</p></article>
            <article><GlobalOutlined /><strong>Nhiều tuyến quốc tế</strong><p>Hỗ trợ Trung Quốc, Nhật Bản, Hàn Quốc, Mỹ và Châu Âu.</p></article>
            <article><SafetyCertificateOutlined /><strong>Có bảo hiểm</strong><p>Phù hợp với kiện hàng giá trị cao hoặc cần giảm rủi ro khi vận chuyển.</p></article>
          </div>
        </section>
      </main>
    </>
  );
};

export default PricingCalculator;
