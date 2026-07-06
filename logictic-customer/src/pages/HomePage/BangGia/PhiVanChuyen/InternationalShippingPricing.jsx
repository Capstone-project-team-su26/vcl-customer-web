import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./InternationalShippingPricing.css";

const ROUTES = [
  {
    id: "china",
    name: "Trung Quốc → Việt Nam",
    description: "Tuyến phổ biến cho hàng thương mại, phụ kiện, thời trang và hàng tiêu dùng.",
    methods: [
      { id: "road", label: "Đường bộ", rate: 32000, factor: 6000, time: "5–10 ngày" },
      { id: "air", label: "Hàng không", rate: 98000, factor: 5000, time: "3–6 ngày" },
    ],
  },
  {
    id: "japan",
    name: "Nhật Bản → Việt Nam",
    description: "Phù hợp hàng cá nhân, đồ gia dụng, mỹ phẩm đủ điều kiện và đồ sưu tầm.",
    methods: [
      { id: "air", label: "Hàng không", rate: 145000, factor: 5000, time: "7–14 ngày" },
      { id: "sea", label: "Đường biển", rate: 78000, factor: 6000, time: "18–30 ngày" },
    ],
  },
  {
    id: "korea",
    name: "Hàn Quốc → Việt Nam",
    description: "Phù hợp thời trang, mỹ phẩm đủ điều kiện, phụ kiện và linh kiện thông thường.",
    methods: [
      { id: "air", label: "Hàng không", rate: 125000, factor: 5000, time: "7–12 ngày" },
      { id: "sea", label: "Đường biển", rate: 72000, factor: 6000, time: "18–28 ngày" },
    ],
  },
  {
    id: "western",
    name: "Mỹ / Châu Âu → Việt Nam",
    description: "Phù hợp hàng giá trị cao, hàng cá nhân hoặc lô hàng kích thước lớn.",
    methods: [
      { id: "air", label: "Hàng không", rate: 225000, factor: 5000, time: "10–18 ngày" },
      { id: "sea", label: "Đường biển", rate: 118000, factor: 6000, time: "25–45 ngày" },
    ],
  },
];

const NOTES = [
  "Cước vận chuyển quốc tế được tính theo khối lượng thực tế hoặc khối lượng quy đổi, lấy giá trị lớn hơn.",
  "Thời gian vận chuyển có thể thay đổi do lịch chuyến, hải quan, thời tiết hoặc giai đoạn cao điểm.",
  "Hàng dễ vỡ, hàng có pin, chất lỏng, mỹ phẩm hoặc thực phẩm cần kiểm tra điều kiện vận chuyển trước.",
  "Đơn giá trong màn hình là dữ liệu minh họa UI, có thể thay bằng bảng giá thật từ backend.",
];

const INITIAL_FORM = {
  route: "china",
  method: "road",
  weight: "",
  length: "",
  width: "",
  height: "",
  quantity: "1",
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

const InternationalShippingPricing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);

  const selectedRoute = ROUTES.find((item) => item.id === form.route) || ROUTES[0];
  const selectedMethod = selectedRoute.methods.find((item) => item.id === form.method) || selectedRoute.methods[0];

  const calculation = useMemo(() => {
    const weight = safeNumber(form.weight);
    const length = safeNumber(form.length);
    const width = safeNumber(form.width);
    const height = safeNumber(form.height);
    const quantity = Math.max(1, Math.floor(safeNumber(form.quantity) || 1));
    const volumetricWeight = length && width && height ? (length * width * height) / selectedMethod.factor : 0;
    const chargeableWeightPerBox = Math.max(weight, volumetricWeight);
    const totalChargeableWeight = chargeableWeightPerBox * quantity;
    const freight = totalChargeableWeight ? Math.max(totalChargeableWeight * selectedMethod.rate, selectedMethod.rate * 0.5) : 0;

    return {
      quantity,
      volumetricWeight,
      chargeableWeightPerBox,
      totalChargeableWeight,
      freight,
    };
  }, [form, selectedMethod]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleRouteChange = (routeId) => {
    const route = ROUTES.find((item) => item.id === routeId) || ROUTES[0];
    setForm((current) => ({ ...current, route: route.id, method: route.methods[0].id }));
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

  const scrollToCalculator = () => {
    document.getElementById("international-shipping-calculator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header />

      <main className="international-shipping-page">
        <section className="international-shipping-hero">
          <div className="international-shipping-container international-shipping-hero__inner">
            <div>
              <div className="international-shipping-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/bang-gia")}>Bảng giá</button>
                <span>/</span>
                <strong>Phí vận chuyển quốc tế</strong>
              </div>

              <span className="international-shipping-eyebrow">
                <GlobalOutlined /> Bảng cước vận chuyển quốc tế
              </span>

              <h1>
                Phí vận chuyển quốc tế
                <span> theo tuyến và phương thức gửi hàng</span>
              </h1>

              <p>
                Tham khảo đơn giá vận chuyển từ các thị trường phổ biến về Việt Nam, bao gồm đường bộ, hàng không và đường biển.
              </p>

              <div className="international-shipping-hero__actions">
                <button type="button" className="international-shipping-btn international-shipping-btn--primary" onClick={scrollToCalculator}>
                  Tính cước dự kiến <CalculatorOutlined />
                </button>
                <button type="button" className="international-shipping-btn international-shipping-btn--secondary" onClick={() => navigate("/dich-vu/ky-gui")}>
                  Tạo yêu cầu vận chuyển <ArrowRightOutlined />
                </button>
              </div>
            </div>

            <div className="international-shipping-hero__card">
              <span><RocketOutlined /></span>
              <small>Tuyến quốc tế</small>
              <strong>Air · Sea · Road</strong>
              <p>Theo dõi tuyến, thời gian dự kiến và cước theo kg cho từng phương thức vận chuyển.</p>
            </div>
          </div>
        </section>

        <section className="international-shipping-section">
          <div className="international-shipping-container">
            <div className="international-shipping-heading">
              <span>Bảng cước tuyến</span>
              <h2>Đơn giá vận chuyển theo từng quốc gia</h2>
              <p>Chọn tuyến phù hợp với loại hàng, ngân sách và thời gian mong muốn.</p>
            </div>

            <div className="international-shipping-grid">
              {ROUTES.map((route) => (
                <article className="international-route-card" key={route.id}>
                  <div className="international-route-card__head">
                    <span><GlobalOutlined /></span>
                    <strong>{route.methods.length} phương thức</strong>
                  </div>
                  <h3>{route.name}</h3>
                  <p>{route.description}</p>
                  <div className="international-route-methods">
                    {route.methods.map((method) => (
                      <div key={method.id}>
                        <span>{method.label}</span>
                        <strong>{formatCurrency(method.rate)}/kg</strong>
                        <small><ClockCircleOutlined /> {method.time}</small>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => { handleRouteChange(route.id); setTimeout(scrollToCalculator, 60); }}>
                    Tính cước tuyến này <ArrowRightOutlined />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="international-shipping-section international-shipping-calculator-section" id="international-shipping-calculator">
          <div className="international-shipping-container international-shipping-calculator-layout">
            <div className="international-shipping-calculator-copy">
              <span className="international-shipping-eyebrow"><CalculatorOutlined /> Công cụ ước tính</span>
              <h2>Tạm tính cước vận chuyển quốc tế</h2>
              <p>Nhập cân nặng và kích thước kiện hàng để hệ thống tính khối lượng quy đổi và cước dự kiến.</p>

              <div className="international-shipping-note">
                <WarningOutlined />
                <p>Chi phí cuối cùng có thể thay đổi sau khi kho cân đo, kiểm tra loại hàng và xác nhận tuyến vận chuyển thực tế.</p>
              </div>
            </div>

            <div className="international-shipping-calculator-card">
              <div className="international-shipping-calculator-card__head">
                <div>
                  <span>Thông tin kiện hàng</span>
                  <h3>Ước tính cước</h3>
                </div>
                <button type="button" onClick={() => setForm(INITIAL_FORM)}><ReloadOutlined /> Đặt lại</button>
              </div>

              <div className="international-shipping-form-grid">
                <label className="international-shipping-field international-shipping-field--full">
                  <span>Tuyến vận chuyển</span>
                  <select value={form.route} onChange={(event) => handleRouteChange(event.target.value)}>
                    {ROUTES.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                  </select>
                </label>
                <label className="international-shipping-field international-shipping-field--full">
                  <span>Phương thức</span>
                  <select value={selectedMethod.id} onChange={(event) => updateField("method", event.target.value)}>
                    {selectedRoute.methods.map((method) => <option key={method.id} value={method.id}>{method.label} · {method.time} · {formatCurrency(method.rate)}/kg</option>)}
                  </select>
                </label>
                <label className="international-shipping-field">
                  <span>Khối lượng mỗi kiện (kg)</span>
                  <input type="number" min="0" step="0.1" placeholder="Ví dụ: 5.5" value={form.weight} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("weight", event.target.value)} />
                </label>
                <label className="international-shipping-field">
                  <span>Số kiện</span>
                  <input type="number" min="1" placeholder="Ví dụ: 2" value={form.quantity} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("quantity", event.target.value)} />
                </label>
                <label className="international-shipping-field">
                  <span>Dài (cm)</span>
                  <input type="number" min="0" placeholder="Dài" value={form.length} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("length", event.target.value)} />
                </label>
                <label className="international-shipping-field">
                  <span>Rộng (cm)</span>
                  <input type="number" min="0" placeholder="Rộng" value={form.width} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("width", event.target.value)} />
                </label>
                <label className="international-shipping-field international-shipping-field--full">
                  <span>Cao (cm)</span>
                  <input type="number" min="0" placeholder="Cao" value={form.height} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("height", event.target.value)} />
                </label>
              </div>

              <div className="international-shipping-result">
                <div><span>Tuyến đang chọn</span><strong>{selectedRoute.name}</strong></div>
                <div><span>Phương thức</span><strong>{selectedMethod.label}</strong></div>
                <div><span>Khối lượng quy đổi / kiện</span><strong>{calculation.volumetricWeight.toFixed(2)} kg</strong></div>
                <div><span>Khối lượng tính cước / kiện</span><strong>{calculation.chargeableWeightPerBox.toFixed(2)} kg</strong></div>
                <div><span>Tổng khối lượng tính cước</span><strong>{calculation.totalChargeableWeight.toFixed(2)} kg</strong></div>
                <div className="international-shipping-result__total"><span>Cước vận chuyển dự kiến</span><strong>{formatCurrency(calculation.freight)}</strong></div>
              </div>

              <button type="button" className="international-shipping-btn international-shipping-btn--primary international-shipping-btn--full" onClick={() => navigate("/dich-vu/ky-gui")}>
                <SendOutlined /> Tạo yêu cầu vận chuyển <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="international-shipping-section">
          <div className="international-shipping-container">
            <div className="international-shipping-heading international-shipping-heading--center">
              <span>Lưu ý bảng giá</span>
              <h2>Thông tin cần biết về vận chuyển quốc tế</h2>
            </div>
            <div className="international-shipping-note-grid">
              {NOTES.map((note) => <article key={note}><InfoCircleOutlined /><p>{note}</p></article>)}
            </div>
          </div>
        </section>

        <section className="international-shipping-cta">
          <div className="international-shipping-container international-shipping-cta__inner">
            <div>
              <span>Cần kiểm tra tuyến?</span>
              <h2>Gửi thông tin hàng hóa để được tư vấn phương thức phù hợp</h2>
              <p>Đội ngũ hỗ trợ sẽ kiểm tra loại hàng, thời gian mong muốn và đề xuất tuyến vận chuyển tối ưu.</p>
            </div>
            <button type="button" className="international-shipping-btn international-shipping-btn--light" onClick={() => navigate("/lien-he")}>
              Liên hệ tư vấn <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default InternationalShippingPricing;
