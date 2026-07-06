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
  InboxOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./ConsignmentPricing.css";

const ROUTES = [
  {
    id: "china",
    name: "Trung Quốc → Việt Nam",
    time: "5–10 ngày",
    tag: "Phổ biến",
    methods: [
      { id: "road", label: "Đường bộ", rate: 32000, factor: 6000 },
      { id: "air", label: "Hàng không", rate: 98000, factor: 5000 },
    ],
  },
  {
    id: "japan",
    name: "Nhật Bản → Việt Nam",
    time: "7–14 ngày",
    tag: "Hàng cá nhân",
    methods: [
      { id: "air", label: "Hàng không", rate: 145000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 78000, factor: 6000 },
    ],
  },
  {
    id: "korea",
    name: "Hàn Quốc → Việt Nam",
    time: "7–12 ngày",
    tag: "Thời trang",
    methods: [
      { id: "air", label: "Hàng không", rate: 125000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 72000, factor: 6000 },
    ],
  },
  {
    id: "western",
    name: "Mỹ / Châu Âu → Việt Nam",
    time: "10–25 ngày",
    tag: "Hàng giá trị cao",
    methods: [
      { id: "air", label: "Hàng không", rate: 225000, factor: 5000 },
      { id: "sea", label: "Đường biển", rate: 118000, factor: 6000 },
    ],
  },
];

const NOTES = [
  "Cước ký gửi được tính theo khối lượng thực tế hoặc khối lượng quy đổi, chọn giá trị lớn hơn.",
  "Đơn giá có thể thay đổi theo tuyến, loại hàng, thời điểm vận chuyển và chính sách kho.",
  "Hàng có pin, chất lỏng, mỹ phẩm, thực phẩm hoặc thương hiệu cần kiểm tra trước khi gửi.",
  "Chi phí chính thức được xác nhận sau khi kho tiếp nhận, cân đo và kiểm tra kiện hàng.",
];

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

const ConsignmentPricing = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    route: "china",
    method: "road",
    weight: "",
    length: "",
    width: "",
    height: "",
    quantity: "1",
    declaredValue: "",
    insurance: true,
  });

  const selectedRoute = ROUTES.find((item) => item.id === form.route) || ROUTES[0];

  const selectedMethod =
    selectedRoute.methods.find((item) => item.id === form.method) ||
    selectedRoute.methods[0];

  const calculation = useMemo(() => {
    const weight = safeNumber(form.weight);
    const length = safeNumber(form.length);
    const width = safeNumber(form.width);
    const height = safeNumber(form.height);
    const quantity = Math.max(1, Math.floor(safeNumber(form.quantity) || 1));
    const declaredValue = safeNumber(form.declaredValue);

    const hasSize = length > 0 && width > 0 && height > 0;
    const volumetricWeight = hasSize ? (length * width * height) / selectedMethod.factor : 0;
    const chargeableWeightPerBox = Math.max(weight, volumetricWeight);
    const totalChargeableWeight = chargeableWeightPerBox * quantity;

    const freight = totalChargeableWeight
      ? Math.max(totalChargeableWeight * selectedMethod.rate, selectedMethod.rate)
      : 0;

    const handlingFee = freight ? 30000 : 0;
    const insuranceFee = form.insurance && declaredValue ? declaredValue * 0.01 : 0;

    return {
      volumetricWeight,
      chargeableWeightPerBox,
      totalChargeableWeight,
      freight,
      handlingFee,
      insuranceFee,
      total: freight + handlingFee + insuranceFee,
    };
  }, [form, selectedMethod]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRouteChange = (routeId) => {
    const route = ROUTES.find((item) => item.id === routeId) || ROUTES[0];

    setForm((current) => ({
      ...current,
      route: route.id,
      method: route.methods[0].id,
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

  const scrollToCalculator = () => {
    document
      .getElementById("consignment-pricing-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header />

      <main className="consignment-pricing-page">
        <section className="consignment-pricing-hero">
          <div className="consignment-pricing-container consignment-pricing-hero__inner">
            <div>
              <div className="consignment-pricing-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/bang-gia")}>
                  Bảng giá
                </button>
                <span>/</span>
                <strong>Bảng giá ký gửi</strong>
              </div>

              <span className="consignment-pricing-eyebrow">
                <DollarOutlined />
                Bảng giá dịch vụ ký gửi
              </span>

              <h1>
                Bảng giá ký gửi hàng hóa
                <span> rõ tuyến, rõ cân, rõ chi phí</span>
              </h1>

              <p>
                Tham khảo đơn giá ký gửi theo tuyến vận chuyển, phương thức gửi
                hàng, khối lượng thực tế và khối lượng quy đổi của kiện hàng.
              </p>

              <div className="consignment-pricing-hero__actions">
                <button
                  type="button"
                  className="consignment-pricing-btn consignment-pricing-btn--primary"
                  onClick={scrollToCalculator}
                >
                  Tính cước dự kiến
                  <CalculatorOutlined />
                </button>

                <button
                  type="button"
                  className="consignment-pricing-btn consignment-pricing-btn--secondary"
                  onClick={() => navigate("/dich-vu/ky-gui")}
                >
                  Xem dịch vụ ký gửi
                  <ArrowRightOutlined />
                </button>
              </div>
            </div>

            <div className="consignment-pricing-hero__card">
              <div className="consignment-pricing-card-top">
                <span>
                  <InboxOutlined />
                </span>
                <div>
                  <small>Ước tính kiện hàng</small>
                  <strong>Ký gửi quốc tế</strong>
                </div>
              </div>

              <div className="consignment-pricing-preview">
                <div>
                  <span>Tuyến phổ biến</span>
                  <strong>Trung Quốc → Việt Nam</strong>
                </div>
                <div>
                  <span>Cước từ</span>
                  <strong>{formatCurrency(32000)}/kg</strong>
                </div>
                <div>
                  <span>Thời gian</span>
                  <strong>5–10 ngày</strong>
                </div>
              </div>

              <div className="consignment-pricing-trust">
                <CheckCircleFilled />
                <span>Tính theo khối lượng lớn hơn giữa thực tế và quy đổi</span>
              </div>
            </div>
          </div>
        </section>

        <section className="consignment-pricing-section">
          <div className="consignment-pricing-container">
            <div className="consignment-pricing-heading">
              <span>Bảng cước theo tuyến</span>
              <h2>Đơn giá tham khảo cho từng phương thức vận chuyển</h2>
              <p>
                Bạn có thể thay các mức giá này bằng bảng giá thật từ hệ thống
                hoặc API khi hoàn thiện nghiệp vụ.
              </p>
            </div>

            <div className="consignment-pricing-grid">
              {ROUTES.map((route) => (
                <article className="consignment-route-price-card" key={route.id}>
                  <div className="route-price-card__head">
                    <span>
                      <GlobalOutlined />
                    </span>
                    <strong>{route.tag}</strong>
                  </div>

                  <h3>{route.name}</h3>

                  <p>
                    <ClockCircleOutlined /> Thời gian dự kiến: {route.time}
                  </p>

                  <div className="route-price-methods">
                    {route.methods.map((method) => (
                      <div key={method.id}>
                        <span>{method.label}</span>
                        <strong>{formatCurrency(method.rate)}/kg</strong>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleRouteChange(route.id);
                      setTimeout(scrollToCalculator, 60);
                    }}
                  >
                    Tính cước tuyến này
                    <ArrowRightOutlined />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="consignment-pricing-section consignment-pricing-calculator-section"
          id="consignment-pricing-calculator"
        >
          <div className="consignment-pricing-container consignment-pricing-calculator-layout">
            <div className="calculator-copy">
              <span className="consignment-pricing-eyebrow">
                <CalculatorOutlined />
                Công cụ ước tính
              </span>

              <h2>Tạm tính cước ký gửi</h2>

              <p>
                Nhập cân nặng, kích thước và giá trị khai báo để xem nhanh cước
                vận chuyển dự kiến trước khi tạo yêu cầu.
              </p>

              <div className="calculator-note">
                <WarningOutlined />
                <div>
                  <strong>Lưu ý</strong>
                  <p>
                    Kết quả chỉ là số tham khảo. Chi phí cuối cùng được xác nhận
                    sau khi kho cân đo, kiểm tra hàng hóa và chứng từ liên quan.
                  </p>
                </div>
              </div>
            </div>

            <div className="calculator-card">
              <div className="calculator-card__head">
                <div>
                  <span>Thông tin kiện hàng</span>
                  <h3>Ước tính chi phí</h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      route: "china",
                      method: "road",
                      weight: "",
                      length: "",
                      width: "",
                      height: "",
                      quantity: "1",
                      declaredValue: "",
                      insurance: true,
                    })
                  }
                >
                  <ReloadOutlined />
                  Đặt lại
                </button>
              </div>

              <div className="calculator-form-grid">
                <label className="calculator-field calculator-field--full">
                  <span>Tuyến vận chuyển</span>
                  <select
                    value={form.route}
                    onChange={(event) => handleRouteChange(event.target.value)}
                  >
                    {ROUTES.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="calculator-field calculator-field--full">
                  <span>Phương thức vận chuyển</span>
                  <select
                    value={selectedMethod.id}
                    onChange={(event) => updateField("method", event.target.value)}
                  >
                    {selectedRoute.methods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label} - {formatCurrency(method.rate)}/kg
                      </option>
                    ))}
                  </select>
                </label>

                <label className="calculator-field">
                  <span>Khối lượng mỗi kiện (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ví dụ: 5.5"
                    value={form.weight}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) => handleNumberChange("weight", event.target.value)}
                  />
                </label>

                <label className="calculator-field">
                  <span>Số kiện</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ví dụ: 2"
                    value={form.quantity}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) => handleNumberChange("quantity", event.target.value)}
                  />
                </label>

                <label className="calculator-field">
                  <span>Dài (cm)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Dài"
                    value={form.length}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) => handleNumberChange("length", event.target.value)}
                  />
                </label>

                <label className="calculator-field">
                  <span>Rộng (cm)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Rộng"
                    value={form.width}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) => handleNumberChange("width", event.target.value)}
                  />
                </label>

                <label className="calculator-field">
                  <span>Cao (cm)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Cao"
                    value={form.height}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) => handleNumberChange("height", event.target.value)}
                  />
                </label>

                <label className="calculator-field">
                  <span>Giá trị khai báo (VND)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 5000000"
                    value={form.declaredValue}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) =>
                      handleNumberChange("declaredValue", event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="calculator-insurance">
                <input
                  type="checkbox"
                  checked={form.insurance}
                  onChange={(event) => updateField("insurance", event.target.checked)}
                />
                <span>
                  <strong>Đăng ký bảo hiểm hàng hóa</strong>
                  <small>Phí tham khảo 1% trên giá trị khai báo.</small>
                </span>
              </label>

              <div className="calculator-result">
                <div>
                  <span>Tuyến đang chọn</span>
                  <strong>{selectedRoute.name}</strong>
                </div>
                <div>
                  <span>Khối lượng quy đổi / kiện</span>
                  <strong>{calculation.volumetricWeight.toFixed(2)} kg</strong>
                </div>
                <div>
                  <span>Khối lượng tính cước / kiện</span>
                  <strong>{calculation.chargeableWeightPerBox.toFixed(2)} kg</strong>
                </div>
                <div>
                  <span>Tổng khối lượng tính cước</span>
                  <strong>{calculation.totalChargeableWeight.toFixed(2)} kg</strong>
                </div>
                <div>
                  <span>Cước vận chuyển</span>
                  <strong>{formatCurrency(calculation.freight)}</strong>
                </div>
                <div>
                  <span>Phí xử lý</span>
                  <strong>{formatCurrency(calculation.handlingFee)}</strong>
                </div>
                <div>
                  <span>Phí bảo hiểm</span>
                  <strong>{formatCurrency(calculation.insuranceFee)}</strong>
                </div>
                <div className="calculator-result__total">
                  <span>Tổng chi phí dự kiến</span>
                  <strong>{formatCurrency(calculation.total)}</strong>
                </div>
              </div>

              <button
                type="button"
                className="consignment-pricing-btn consignment-pricing-btn--primary consignment-pricing-btn--full"
                onClick={() => navigate("/dich-vu/ky-gui")}
              >
                Tạo yêu cầu ký gửi
                <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="consignment-pricing-section">
          <div className="consignment-pricing-container">
            <div className="consignment-pricing-heading consignment-pricing-heading--center">
              <span>Lưu ý bảng giá</span>
              <h2>Thông tin cần biết trước khi ký gửi</h2>
            </div>

            <div className="consignment-pricing-note-grid">
              {NOTES.map((note) => (
                <article key={note}>
                  <InfoCircleOutlined />
                  <p>{note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="consignment-pricing-cta">
          <div className="consignment-pricing-container consignment-pricing-cta__inner">
            <div>
              <span>Sẵn sàng gửi hàng?</span>
              <h2>Tạo yêu cầu ký gửi để nhận mã kiện và địa chỉ kho</h2>
              <p>
                Khai báo thông tin kiện hàng, tuyến vận chuyển và giá trị hàng
                hóa để được hỗ trợ kiểm tra trước khi gửi đến kho.
              </p>
            </div>

            <button
              type="button"
              className="consignment-pricing-btn consignment-pricing-btn--light"
              onClick={() => navigate("/dich-vu/ky-gui")}
            >
              Tạo yêu cầu ký gửi
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ConsignmentPricing;