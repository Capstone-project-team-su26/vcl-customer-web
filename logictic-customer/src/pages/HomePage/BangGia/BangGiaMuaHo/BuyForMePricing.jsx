import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalculatorOutlined,
  DollarOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  StarFilled,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./BuyForMePricing.css";

const COUNTRIES = [
  {
    id: "china",
    name: "Trung Quốc",
    route: "Trung Quốc → Việt Nam",
    currency: "CNY",
    exchangeRate: 3600,
    serviceRate: 0.03,
    minFee: 30000,
    freight: 68000,
    time: "5–10 ngày",
    popular: true,
  },
  {
    id: "japan",
    name: "Nhật Bản",
    route: "Nhật Bản → Việt Nam",
    currency: "JPY",
    exchangeRate: 180,
    serviceRate: 0.04,
    minFee: 50000,
    freight: 155000,
    time: "7–14 ngày",
  },
  {
    id: "korea",
    name: "Hàn Quốc",
    route: "Hàn Quốc → Việt Nam",
    currency: "KRW",
    exchangeRate: 19,
    serviceRate: 0.04,
    minFee: 50000,
    freight: 135000,
    time: "7–12 ngày",
  },
  {
    id: "usa",
    name: "Mỹ / Châu Âu",
    route: "Mỹ / Châu Âu → Việt Nam",
    currency: "USD",
    exchangeRate: 26000,
    serviceRate: 0.05,
    minFee: 80000,
    freight: 245000,
    time: "10–18 ngày",
  },
];

const NOTES = [
  "Bảng giá chỉ mang tính tham khảo, phí chính thức phụ thuộc link sản phẩm và phí nội địa.",
  "Hàng giá trị cao, hàng thương hiệu hoặc hàng đặc thù có thể cần kiểm tra riêng.",
  "Phí vận chuyển quốc tế được tính theo cân nặng thực tế hoặc cân quy đổi nếu có.",
  "Có thể phát sinh phí đóng gói, bảo hiểm hoặc phụ phí xử lý với một số nhóm hàng.",
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

const BuyForMePricing = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    country: "china",
    productPrice: "",
    quantity: "1",
    domesticShipping: "",
    weight: "",
    insurance: true,
  });

  const country =
    COUNTRIES.find((item) => item.id === form.country) || COUNTRIES[0];

  const calculation = useMemo(() => {
    const productPrice = safeNumber(form.productPrice);
    const quantity = Math.max(1, Math.floor(safeNumber(form.quantity) || 1));
    const domesticShipping = safeNumber(form.domesticShipping);
    const weight = safeNumber(form.weight);

    const goodsForeign = productPrice * quantity + domesticShipping;
    const goodsVnd = goodsForeign * country.exchangeRate;

    const serviceFee = goodsVnd
      ? Math.max(goodsVnd * country.serviceRate, country.minFee)
      : 0;

    const freightFee = weight
      ? Math.max(weight * country.freight, country.freight * 0.5)
      : 0;

    const insuranceFee = form.insurance && goodsVnd ? goodsVnd * 0.01 : 0;

    return {
      goodsVnd,
      serviceFee,
      freightFee,
      insuranceFee,
      total: goodsVnd + serviceFee + freightFee + insuranceFee,
    };
  }, [form, country]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
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
      .getElementById("buyfor-pricing-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header />

      <main className="buyfor-pricing-page">
        <section className="buyfor-pricing-hero">
          <div className="buyfor-pricing-container buyfor-pricing-hero__inner">
            <div>
              <div className="buyfor-pricing-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/bang-gia")}>
                  Bảng giá
                </button>
                <span>/</span>
                <strong>Bảng giá mua hộ</strong>
              </div>

              <span className="buyfor-pricing-eyebrow">
                <DollarOutlined />
                Bảng giá dịch vụ mua hộ
              </span>

              <h1>
                Chi phí mua hộ minh bạch
                <span> trước khi xác nhận đơn</span>
              </h1>

              <p>
                Tham khảo phí mua hộ theo từng thị trường, phí vận chuyển dự
                kiến và các khoản có thể phát sinh khi đặt hàng quốc tế về Việt
                Nam.
              </p>

              <div className="buyfor-pricing-hero__actions">
                <button
                  type="button"
                  className="buyfor-pricing-btn buyfor-pricing-btn--primary"
                  onClick={scrollToCalculator}
                >
                  Tính phí dự kiến
                  <CalculatorOutlined />
                </button>

                <button
                  type="button"
                  className="buyfor-pricing-btn buyfor-pricing-btn--secondary"
                  onClick={() => navigate("/dich-vu/mua-ho")}
                >
                  Xem dịch vụ mua hộ
                  <ArrowRightOutlined />
                </button>
              </div>
            </div>

            <div className="buyfor-pricing-hero__card">
              <div className="buyfor-pricing-card-top">
                <span>
                  <ShoppingCartOutlined />
                </span>
                <div>
                  <small>Ước tính đơn hàng</small>
                  <strong>Order quốc tế</strong>
                </div>
              </div>

              <div className="buyfor-pricing-preview">
                <div>
                  <span>Tiền hàng</span>
                  <strong>{formatCurrency(1850000)}</strong>
                </div>
                <div>
                  <span>Phí mua hộ từ</span>
                  <strong>3% - 5%</strong>
                </div>
                <div>
                  <span>Vận chuyển từ</span>
                  <strong>{formatCurrency(68000)}/kg</strong>
                </div>
              </div>

              <div className="buyfor-pricing-rating">
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <StarFilled />
                <span>Báo giá trước khi đặt mua</span>
              </div>
            </div>
          </div>
        </section>

        <section className="buyfor-pricing-section">
          <div className="buyfor-pricing-container">
            <div className="buyfor-pricing-heading">
              <span>Bảng phí theo thị trường</span>
              <h2>Phí mua hộ được tính theo giá trị hàng hóa</h2>
              <p>
                Mỗi quốc gia có tỷ giá, phí tối thiểu và đơn giá vận chuyển
                khác nhau. Bạn có thể chỉnh lại dữ liệu này theo bảng giá thật.
              </p>
            </div>

            <div className="buyfor-pricing-grid">
              {COUNTRIES.map((item) => (
                <article
                  className={`buyfor-pricing-country-card ${
                    item.popular ? "is-popular" : ""
                  }`}
                  key={item.id}
                >
                  {item.popular && (
                    <span className="popular-badge">Phổ biến</span>
                  )}

                  <div className="country-card-icon">
                    <GlobalOutlined />
                  </div>

                  <h3>{item.route}</h3>
                  <p>Thời gian dự kiến: {item.time}</p>

                  <div className="country-card-price">
                    <div>
                      <span>Phí mua hộ</span>
                      <strong>{Math.round(item.serviceRate * 100)}%</strong>
                    </div>
                    <div>
                      <span>Phí tối thiểu</span>
                      <strong>{formatCurrency(item.minFee)}</strong>
                    </div>
                    <div>
                      <span>Vận chuyển từ</span>
                      <strong>{formatCurrency(item.freight)}/kg</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateField("country", item.id);
                      setTimeout(scrollToCalculator, 60);
                    }}
                  >
                    Tính phí tuyến này
                    <ArrowRightOutlined />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="buyfor-pricing-section buyfor-pricing-calculator-section"
          id="buyfor-pricing-calculator"
        >
          <div className="buyfor-pricing-container buyfor-pricing-calculator-layout">
            <div className="calculator-copy">
              <span className="buyfor-pricing-eyebrow">
                <CalculatorOutlined />
                Công cụ ước tính
              </span>

              <h2>Tạm tính phí mua hộ</h2>

              <p>
                Nhập giá sản phẩm, số lượng, phí ship nội địa và cân nặng dự
                kiến để xem nhanh tổng chi phí tham khảo.
              </p>

              <div className="calculator-note">
                <WarningOutlined />
                <div>
                  <strong>Lưu ý</strong>
                  <p>
                    Kết quả chỉ là số ước tính. Báo giá chính thức phụ thuộc
                    link sản phẩm, phí shop, tình trạng hàng và quy định vận
                    chuyển thực tế.
                  </p>
                </div>
              </div>
            </div>

            <div className="calculator-card">
              <div className="calculator-card__head">
                <div>
                  <span>Thông tin đơn hàng</span>
                  <h3>Ước tính chi phí</h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      country: "china",
                      productPrice: "",
                      quantity: "1",
                      domesticShipping: "",
                      weight: "",
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
                  <span>Thị trường mua hàng</span>
                  <select
                    value={form.country}
                    onChange={(event) =>
                      updateField("country", event.target.value)
                    }
                  >
                    {COUNTRIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.currency}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="calculator-field">
                  <span>Giá sản phẩm / món ({country.currency})</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 120"
                    value={form.productPrice}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) =>
                      handleNumberChange("productPrice", event.target.value)
                    }
                  />
                </label>

                <label className="calculator-field">
                  <span>Số lượng</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ví dụ: 2"
                    value={form.quantity}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) =>
                      handleNumberChange("quantity", event.target.value)
                    }
                  />
                </label>

                <label className="calculator-field">
                  <span>Ship nội địa ({country.currency})</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 15"
                    value={form.domesticShipping}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) =>
                      handleNumberChange(
                        "domesticShipping",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="calculator-field">
                  <span>Cân nặng dự kiến (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ví dụ: 1.5"
                    value={form.weight}
                    onKeyDown={preventInvalidKey}
                    onChange={(event) =>
                      handleNumberChange("weight", event.target.value)
                    }
                  />
                </label>
              </div>

              <label className="calculator-insurance">
                <input
                  type="checkbox"
                  checked={form.insurance}
                  onChange={(event) =>
                    updateField("insurance", event.target.checked)
                  }
                />
                <span>
                  <strong>Đăng ký bảo hiểm hàng hóa</strong>
                  <small>
                    Phí tham khảo 1% trên giá trị hàng hóa quy đổi.
                  </small>
                </span>
              </label>

              <div className="calculator-result">
                <div>
                  <span>Tuyến đang chọn</span>
                  <strong>{country.route}</strong>
                </div>
                <div>
                  <span>Tiền hàng quy đổi</span>
                  <strong>{formatCurrency(calculation.goodsVnd)}</strong>
                </div>
                <div>
                  <span>Phí mua hộ</span>
                  <strong>{formatCurrency(calculation.serviceFee)}</strong>
                </div>
                <div>
                  <span>Phí vận chuyển</span>
                  <strong>{formatCurrency(calculation.freightFee)}</strong>
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
                className="buyfor-pricing-btn buyfor-pricing-btn--primary buyfor-pricing-btn--full"
                onClick={() => navigate("/dich-vu/mua-ho")}
              >
                Tạo yêu cầu mua hộ
                <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>

        <section className="buyfor-pricing-section">
          <div className="buyfor-pricing-container">
            <div className="buyfor-pricing-heading buyfor-pricing-heading--center">
              <span>Lưu ý bảng giá</span>
              <h2>Thông tin cần biết trước khi đặt mua hộ</h2>
            </div>

            <div className="buyfor-pricing-note-grid">
              {NOTES.map((note) => (
                <article key={note}>
                  <InfoCircleOutlined />
                  <p>{note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyfor-pricing-cta">
          <div className="buyfor-pricing-container buyfor-pricing-cta__inner">
            <div>
              <span>Sẵn sàng đặt hàng?</span>
              <h2>Gửi link sản phẩm để nhận báo giá mua hộ</h2>
              <p>
                Nhân viên sẽ kiểm tra link, phí nội địa, tồn kho và gửi báo giá
                rõ ràng trước khi bạn xác nhận thanh toán.
              </p>
            </div>

            <button
              type="button"
              className="buyfor-pricing-btn buyfor-pricing-btn--light"
              onClick={() => navigate("/dich-vu/mua-ho")}
            >
              Tạo yêu cầu mua hộ
              <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default BuyForMePricing;