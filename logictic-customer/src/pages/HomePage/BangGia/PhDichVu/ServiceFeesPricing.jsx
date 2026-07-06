import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalculatorOutlined,
  CheckCircleFilled,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TagsOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./ServiceFeesPricing.css";

const FEE_GROUPS = [
  {
    title: "Phí dịch vụ mua hộ",
    icon: <DollarOutlined />,
    description: "Áp dụng khi hệ thống hỗ trợ kiểm tra link, báo giá, thanh toán và đặt mua hàng quốc tế.",
    items: [
      { name: "Phí mua hộ Trung Quốc", value: "Từ 3% tiền hàng", note: "Tối thiểu 30.000đ / yêu cầu" },
      { name: "Phí mua hộ Nhật / Hàn", value: "Từ 4% tiền hàng", note: "Tối thiểu 50.000đ / yêu cầu" },
      { name: "Phí mua hộ Mỹ / Châu Âu", value: "Từ 5% tiền hàng", note: "Tối thiểu 80.000đ / yêu cầu" },
    ],
  },
  {
    title: "Phụ phí xử lý hàng",
    icon: <SettingOutlined />,
    description: "Áp dụng với các nhóm hàng cần kiểm tra thêm, đóng gói riêng hoặc xử lý chứng từ.",
    items: [
      { name: "Phí xử lý kiện ký gửi", value: "Từ 30.000đ / kiện", note: "Tùy loại hàng và số lượng kiện" },
      { name: "Đóng gói gia cố", value: "Theo thực tế", note: "Áp dụng cho hàng dễ vỡ, móp méo" },
      { name: "Kiểm đếm / chụp ảnh", value: "Theo yêu cầu", note: "Chỉ thực hiện khi khách hàng đăng ký" },
    ],
  },
  {
    title: "Bảo hiểm và lưu kho",
    icon: <SafetyCertificateOutlined />,
    description: "Giúp giảm rủi ro với hàng giá trị cao hoặc hàng cần lưu kho chờ xử lý.",
    items: [
      { name: "Bảo hiểm hàng hóa", value: "1% giá trị khai báo", note: "Phạm vi theo chính sách hiện hành" },
      { name: "Lưu kho miễn phí", value: "3–7 ngày", note: "Tùy kho quốc tế hoặc kho Việt Nam" },
      { name: "Phí lưu kho phát sinh", value: "Từ 10.000đ / ngày", note: "Áp dụng sau thời gian miễn phí" },
    ],
  },
];

const NOTES = [
  "Các mức phí là dữ liệu tham khảo để hiển thị UI, có thể thay bằng bảng giá thật từ API.",
  "Một số nhóm hàng đặc thù có thể cần phụ phí xử lý, chứng từ hoặc phương án vận chuyển riêng.",
  "Phí bảo hiểm chỉ áp dụng khi khách hàng khai báo giá trị hàng hóa và đăng ký trước khi vận chuyển.",
  "Chi phí cuối cùng được xác nhận sau khi kiểm tra link sản phẩm hoặc kho cân đo kiện hàng thực tế.",
];

const INITIAL_FORM = {
  orderValue: "",
  packageCount: "1",
  specialHandling: true,
  insurance: true,
  storageDays: "0",
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

const ServiceFeesPricing = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);

  const calculation = useMemo(() => {
    const orderValue = safeNumber(form.orderValue);
    const packageCount = Math.max(1, Math.floor(safeNumber(form.packageCount) || 1));
    const storageDays = Math.max(0, Math.floor(safeNumber(form.storageDays) || 0));

    const serviceFee = orderValue ? Math.max(orderValue * 0.03, 30000) : 0;
    const handlingFee = form.specialHandling ? packageCount * 30000 : 0;
    const insuranceFee = form.insurance && orderValue ? orderValue * 0.01 : 0;
    const storageFee = storageDays > 7 ? (storageDays - 7) * packageCount * 10000 : 0;

    return {
      orderValue,
      packageCount,
      serviceFee,
      handlingFee,
      insuranceFee,
      storageFee,
      total: serviceFee + handlingFee + insuranceFee + storageFee,
    };
  }, [form]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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
    document.getElementById("service-fee-calculator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header />

      <main className="service-fees-page">
        <section className="service-fees-hero">
          <div className="service-fees-container service-fees-hero__inner">
            <div>
              <div className="service-fees-breadcrumb">
                <button type="button" onClick={() => navigate("/")}>Trang chủ</button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/bang-gia")}>Bảng giá</button>
                <span>/</span>
                <strong>Phí dịch vụ & phụ phí</strong>
              </div>

              <span className="service-fees-eyebrow">
                <TagsOutlined /> Bảng phí phát sinh
              </span>

              <h1>
                Phí dịch vụ và phụ phí
                <span> được trình bày rõ trước khi xác nhận</span>
              </h1>

              <p>
                Tổng hợp các khoản phí thường gặp trong quá trình mua hộ, ký gửi, xử lý kiện hàng, bảo hiểm và lưu kho.
              </p>

              <div className="service-fees-hero__actions">
                <button type="button" className="service-fees-btn service-fees-btn--primary" onClick={scrollToCalculator}>
                  Tính phụ phí dự kiến <CalculatorOutlined />
                </button>
                <button type="button" className="service-fees-btn service-fees-btn--secondary" onClick={() => navigate("/lien-he")}>
                  Hỏi tư vấn phí <ArrowRightOutlined />
                </button>
              </div>
            </div>

            <div className="service-fees-hero__card">
              <span><FileTextOutlined /></span>
              <small>Minh bạch chi phí</small>
              <strong>Không ẩn phụ phí</strong>
              <p>Khách hàng có thể xem trước các khoản phí phổ biến trước khi gửi yêu cầu.</p>
            </div>
          </div>
        </section>

        <section className="service-fees-section">
          <div className="service-fees-container">
            <div className="service-fees-heading">
              <span>Danh mục phí</span>
              <h2>Các khoản phí thường gặp</h2>
              <p>Những khoản phí này có thể phát sinh tùy loại dịch vụ, loại hàng, yêu cầu xử lý và thời gian lưu kho.</p>
            </div>

            <div className="service-fees-grid">
              {FEE_GROUPS.map((group) => (
                <article className="service-fees-card" key={group.title}>
                  <div className="service-fees-card__head">
                    <span>{group.icon}</span>
                    <div>
                      <h3>{group.title}</h3>
                      <p>{group.description}</p>
                    </div>
                  </div>

                  <div className="service-fees-card__items">
                    {group.items.map((item) => (
                      <div key={item.name}>
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                        <small>{item.note}</small>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="service-fees-section service-fees-calculator-section" id="service-fee-calculator">
          <div className="service-fees-container service-fees-calculator-layout">
            <div className="service-fees-calculator-copy">
              <span className="service-fees-eyebrow"><CalculatorOutlined /> Công cụ ước tính</span>
              <h2>Tạm tính phí dịch vụ và phụ phí</h2>
              <p>Nhập giá trị đơn hàng, số kiện và số ngày lưu kho để xem các khoản phí tham khảo.</p>

              <div className="service-fees-note">
                <WarningOutlined />
                <p>Chi phí thực tế có thể thay đổi theo loại hàng, tuyến vận chuyển, chính sách kho và yêu cầu xử lý riêng.</p>
              </div>
            </div>

            <div className="service-fees-calculator-card">
              <div className="service-fees-calculator-card__head">
                <div>
                  <span>Thông tin ước tính</span>
                  <h3>Nhập dữ liệu phí</h3>
                </div>
                <button type="button" onClick={() => setForm(INITIAL_FORM)}>
                  <ReloadOutlined /> Đặt lại
                </button>
              </div>

              <div className="service-fees-form-grid">
                <label className="service-fees-field">
                  <span>Giá trị đơn hàng / khai báo (VND)</span>
                  <input type="number" min="0" placeholder="Ví dụ: 5000000" value={form.orderValue} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("orderValue", event.target.value)} />
                </label>
                <label className="service-fees-field">
                  <span>Số kiện</span>
                  <input type="number" min="1" placeholder="Ví dụ: 2" value={form.packageCount} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("packageCount", event.target.value)} />
                </label>
                <label className="service-fees-field service-fees-field--full">
                  <span>Số ngày lưu kho dự kiến</span>
                  <input type="number" min="0" placeholder="Miễn phí 7 ngày đầu" value={form.storageDays} onKeyDown={preventInvalidKey} onChange={(event) => handleNumberChange("storageDays", event.target.value)} />
                </label>
              </div>

              <div className="service-fees-options">
                <label>
                  <input type="checkbox" checked={form.specialHandling} onChange={(event) => updateField("specialHandling", event.target.checked)} />
                  <span><strong>Có xử lý kiện hàng</strong><small>Kiểm tra, phân loại hoặc xử lý theo yêu cầu.</small></span>
                </label>
                <label>
                  <input type="checkbox" checked={form.insurance} onChange={(event) => updateField("insurance", event.target.checked)} />
                  <span><strong>Đăng ký bảo hiểm</strong><small>Phí tham khảo 1% giá trị khai báo.</small></span>
                </label>
              </div>

              <div className="service-fees-result">
                <div><span>Phí dịch vụ tham khảo</span><strong>{formatCurrency(calculation.serviceFee)}</strong></div>
                <div><span>Phí xử lý kiện</span><strong>{formatCurrency(calculation.handlingFee)}</strong></div>
                <div><span>Phí bảo hiểm</span><strong>{formatCurrency(calculation.insuranceFee)}</strong></div>
                <div><span>Phí lưu kho phát sinh</span><strong>{formatCurrency(calculation.storageFee)}</strong></div>
                <div className="service-fees-result__total"><span>Tổng phụ phí dự kiến</span><strong>{formatCurrency(calculation.total)}</strong></div>
              </div>
            </div>
          </div>
        </section>

        <section className="service-fees-section">
          <div className="service-fees-container">
            <div className="service-fees-heading service-fees-heading--center">
              <span>Lưu ý</span>
              <h2>Thông tin cần biết về phụ phí</h2>
            </div>

            <div className="service-fees-note-grid">
              {NOTES.map((note) => (
                <article key={note}><InfoCircleOutlined /><p>{note}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="service-fees-cta">
          <div className="service-fees-container service-fees-cta__inner">
            <div>
              <span>Cần báo giá chính xác?</span>
              <h2>Gửi thông tin hàng hóa để được kiểm tra phụ phí</h2>
              <p>Đội ngũ hỗ trợ sẽ xác nhận loại hàng, tuyến vận chuyển và các khoản phí áp dụng trước khi xử lý.</p>
            </div>
            <button type="button" className="service-fees-btn service-fees-btn--light" onClick={() => navigate("/lien-he")}>
              Liên hệ tư vấn <ArrowRightOutlined />
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ServiceFeesPricing;
