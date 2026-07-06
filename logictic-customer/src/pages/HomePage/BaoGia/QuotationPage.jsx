import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightOutlined,
  BankOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileProtectOutlined,
  GiftOutlined,
  GlobalOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TruckOutlined,
} from "@ant-design/icons";

import Header from "../../../layouts/HeaderLayout/Headeer";
import "./QuotationPage.css";

const SERVICE_TYPES = [
  {
    key: "buyForMe",
    title: "Báo giá mua hộ",
    subtitle: "Gửi link sản phẩm, hệ thống ước tính chi phí mua hộ",
    icon: <ShoppingCartOutlined />,
  },
  {
    key: "consignment",
    title: "Báo giá ký gửi",
    subtitle: "Khai báo kiện hàng, hệ thống ước tính phí vận chuyển",
    icon: <TruckOutlined />,
  },
];

const COUNTRIES = [
  {
    value: "china",
    label: "Trung Quốc",
    currency: "CNY",
    rate: 3600,
    freightAir: 72000,
    freightRoad: 42000,
  },
  {
    value: "japan",
    label: "Nhật Bản",
    currency: "JPY",
    rate: 170,
    freightAir: 145000,
    freightRoad: 0,
  },
  {
    value: "korea",
    label: "Hàn Quốc",
    currency: "KRW",
    rate: 19,
    freightAir: 125000,
    freightRoad: 0,
  },
  {
    value: "us",
    label: "Mỹ / Châu Âu",
    currency: "USD",
    rate: 25500,
    freightAir: 185000,
    freightRoad: 0,
  },
];

const PRODUCT_TYPES = [
  "Thời trang",
  "Mỹ phẩm",
  "Phụ kiện",
  "Đồ điện tử",
  "Đồ gia dụng",
  "Hàng dễ vỡ",
  "Hàng có pin",
  "Khác",
];

const INITIAL_FORM = {
  serviceType: "buyForMe",

  country: "china",
  shippingMethod: "air",

  productLink: "",
  productName: "",
  productType: "Thời trang",
  productPrice: "",
  quantity: 1,
  domesticShipping: "",
  productNote: "",

  packageCode: "",
  packageCount: 1,
  weight: "",
  length: "",
  width: "",
  height: "",
  declaredValue: "",
  receiverName: "",
  receiverPhone: "",

  insurance: true,
  fullName: "",
  phone: "",
  email: "",
  note: "",
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const formatCurrency = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
};

const safeNumber = (value) => {
  const number = Number(value);

  if (Number.isNaN(number) || number < 0) {
    return 0;
  }

  return number;
};

const QuotationPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const currentCountry = useMemo(() => {
    return COUNTRIES.find((item) => item.value === formData.country) || COUNTRIES[0];
  }, [formData.country]);

  const quoteResult = useMemo(() => {
    const productPrice = safeNumber(formData.productPrice);
    const quantity = safeNumber(formData.quantity) || 1;
    const domesticShipping = safeNumber(formData.domesticShipping);
    const weight = safeNumber(formData.weight);
    const length = safeNumber(formData.length);
    const width = safeNumber(formData.width);
    const height = safeNumber(formData.height);
    const declaredValue = safeNumber(formData.declaredValue);

    const goodsValue =
      formData.serviceType === "buyForMe"
        ? productPrice * quantity * currentCountry.rate
        : declaredValue;

    const domesticFee =
      formData.serviceType === "buyForMe"
        ? domesticShipping * currentCountry.rate
        : 0;

    const volumetricWeight =
      length && width && height ? (length * width * height) / 6000 : 0;

    const chargeableWeight = Math.max(weight, volumetricWeight, 0.5);

    const freightRate =
      formData.shippingMethod === "road"
        ? currentCountry.freightRoad || currentCountry.freightAir
        : currentCountry.freightAir;

    const freightFee = Math.ceil(chargeableWeight * freightRate);

    const buyForMeServiceFee =
      formData.serviceType === "buyForMe"
        ? Math.max(goodsValue * 0.05, 30000)
        : 0;

    const consignmentServiceFee =
      formData.serviceType === "consignment"
        ? Math.max(chargeableWeight * 15000, 20000)
        : 0;

    const insuranceFee =
      formData.insurance && goodsValue > 0
        ? Math.max(goodsValue * 0.01, 15000)
        : 0;

    const handlingFee =
      formData.productType === "Hàng dễ vỡ" || formData.productType === "Hàng có pin"
        ? 35000
        : 0;

    const total =
      goodsValue +
      domesticFee +
      freightFee +
      buyForMeServiceFee +
      consignmentServiceFee +
      insuranceFee +
      handlingFee;

    return {
      goodsValue,
      domesticFee,
      chargeableWeight,
      volumetricWeight,
      freightFee,
      buyForMeServiceFee,
      consignmentServiceFee,
      insuranceFee,
      handlingFee,
      total,
    };
  }, [formData, currentCountry]);

  const updateField = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setSubmitted(false);
  };

  const changeServiceType = (serviceType) => {
    setFormData((prev) => ({
      ...prev,
      serviceType,
    }));

    setErrors({});
    setSubmitted(false);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (formData.serviceType === "buyForMe") {
      if (!formData.productLink.trim()) {
        nextErrors.productLink = "Vui lòng nhập link sản phẩm.";
      }

      if (!formData.productName.trim()) {
        nextErrors.productName = "Vui lòng nhập tên sản phẩm.";
      }

      if (!safeNumber(formData.productPrice)) {
        nextErrors.productPrice = "Vui lòng nhập giá sản phẩm.";
      }
    }

    if (formData.serviceType === "consignment") {
      if (!formData.packageCode.trim()) {
        nextErrors.packageCode = "Vui lòng nhập mã kiện hoặc mã tracking.";
      }

      if (!safeNumber(formData.weight)) {
        nextErrors.weight = "Vui lòng nhập cân nặng kiện hàng.";
      }

      if (!safeNumber(formData.declaredValue)) {
        nextErrors.declaredValue = "Vui lòng nhập giá trị hàng hóa.";
      }
    }

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Vui lòng nhập họ tên.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại.";
    } else if (!/^[0-9+\s.-]{8,15}$/.test(formData.phone.trim())) {
      nextErrors.phone = "Số điện thoại chưa hợp lệ.";
    }

    if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = "Email chưa hợp lệ.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submitQuotation = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitted(true);

    window.setTimeout(() => {
      document
        .getElementById("quotation-result")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <>
      <Header />

      <main className="quotation-page">
        <section className="quotation-hero">
          <div className="quotation-container quotation-hero__inner">
            <motion.div
              className="quotation-hero__content"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.65 }}
            >
              <span className="quotation-eyebrow">
                <CalculatorOutlined />
                Công cụ báo giá logistics
              </span>

              <h1>Báo giá mua hộ & ký gửi nhanh chóng</h1>

              <p>
                Nhập thông tin sản phẩm hoặc kiện hàng để hệ thống ước tính chi
                phí mua hộ, ký gửi, vận chuyển quốc tế, bảo hiểm và phụ phí phát
                sinh.
              </p>

              <div className="quotation-hero__actions">
                <button type="button" onClick={() => navigate("/dich-vu/mua-ho")}>
                  Dịch vụ mua hộ
                  <ShoppingCartOutlined />
                </button>

                <button type="button" onClick={() => navigate("/dich-vu/ky-gui")}>
                  Dịch vụ ký gửi
                  <TruckOutlined />
                </button>
              </div>

              <div className="quotation-hero__stats">
                <div>
                  <strong>2</strong>
                  <span>Loại báo giá</span>
                </div>
                <div>
                  <strong>5%</strong>
                  <span>Phí mua hộ từ</span>
                </div>
                <div>
                  <strong>24h</strong>
                  <span>Phản hồi báo giá</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="quotation-hero-card"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.65, delay: 0.12 }}
            >
              <span className="quotation-hero-card__icon">
                <RocketOutlined />
              </span>

              <h3>Quy trình báo giá</h3>

              <div className="quotation-process">
                <div>
                  <span>01</span>
                  <p>Chọn dịch vụ</p>
                </div>
                <div>
                  <span>02</span>
                  <p>Nhập thông tin</p>
                </div>
                <div>
                  <span>03</span>
                  <p>Xem tạm tính</p>
                </div>
                <div>
                  <span>04</span>
                  <p>Gửi yêu cầu</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="quotation-section">
          <div className="quotation-container">
            <div className="quotation-layout">
              <motion.form
                className="quotation-form-card"
                onSubmit={submitQuotation}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.16 }}
                transition={{ duration: 0.55 }}
              >
                <div className="quotation-card-head">
                  <span>
                    <FileProtectOutlined />
                  </span>

                  <div>
                    <small>Thông tin báo giá</small>
                    <h2>Chọn loại dịch vụ cần báo giá</h2>
                  </div>
                </div>

                <div className="quotation-tabs">
                  {SERVICE_TYPES.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={formData.serviceType === item.key ? "is-active" : ""}
                      onClick={() => changeServiceType(item.key)}
                    >
                      <span>{item.icon}</span>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>

                <div className="quotation-form-section">
                  <h3>
                    <GlobalOutlined />
                    Tuyến vận chuyển
                  </h3>

                  <div className="quotation-form-grid">
                    <label className="quotation-field">
                      <span>Quốc gia / thị trường</span>
                      <select
                        value={formData.country}
                        onChange={(event) => updateField("country", event.target.value)}
                      >
                        {COUNTRIES.map((country) => (
                          <option value={country.value} key={country.value}>
                            {country.label} - {country.currency}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="quotation-field">
                      <span>Phương thức vận chuyển</span>
                      <select
                        value={formData.shippingMethod}
                        onChange={(event) =>
                          updateField("shippingMethod", event.target.value)
                        }
                      >
                        <option value="air">Đường bay nhanh</option>
                        <option
                          value="road"
                          disabled={!currentCountry.freightRoad}
                        >
                          Đường bộ / tiết kiệm
                        </option>
                      </select>
                    </label>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {formData.serviceType === "buyForMe" ? (
                    <motion.div
                      key="buy-for-me"
                      className="quotation-form-section"
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <h3>
                        <ShoppingCartOutlined />
                        Thông tin mua hộ
                      </h3>

                      <div className="quotation-form-grid">
                        <label className="quotation-field quotation-field--full">
                          <span>Link sản phẩm *</span>
                          <div className={errors.productLink ? "is-error" : ""}>
                            <LinkOutlined />
                            <input
                              type="url"
                              placeholder="Dán link sản phẩm cần mua"
                              value={formData.productLink}
                              onChange={(event) =>
                                updateField("productLink", event.target.value)
                              }
                            />
                          </div>
                          {errors.productLink && <small>{errors.productLink}</small>}
                        </label>

                        <label className="quotation-field">
                          <span>Tên sản phẩm *</span>
                          <input
                            className={errors.productName ? "is-error" : ""}
                            type="text"
                            placeholder="Ví dụ: Áo khoác nam"
                            value={formData.productName}
                            onChange={(event) =>
                              updateField("productName", event.target.value)
                            }
                          />
                          {errors.productName && <small>{errors.productName}</small>}
                        </label>

                        <label className="quotation-field">
                          <span>Loại hàng</span>
                          <select
                            value={formData.productType}
                            onChange={(event) =>
                              updateField("productType", event.target.value)
                            }
                          >
                            {PRODUCT_TYPES.map((item) => (
                              <option value={item} key={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="quotation-field">
                          <span>Giá sản phẩm ({currentCountry.currency}) *</span>
                          <input
                            className={errors.productPrice ? "is-error" : ""}
                            type="number"
                            min="0"
                            placeholder="Nhập giá"
                            value={formData.productPrice}
                            onChange={(event) =>
                              updateField("productPrice", event.target.value)
                            }
                          />
                          {errors.productPrice && <small>{errors.productPrice}</small>}
                        </label>

                        <label className="quotation-field">
                          <span>Số lượng</span>
                          <input
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={(event) =>
                              updateField("quantity", event.target.value)
                            }
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Phí nội địa ({currentCountry.currency})</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Nếu có"
                            value={formData.domesticShipping}
                            onChange={(event) =>
                              updateField("domesticShipping", event.target.value)
                            }
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Cân nặng dự kiến kg</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Ví dụ: 2.5"
                            value={formData.weight}
                            onChange={(event) => updateField("weight", event.target.value)}
                          />
                        </label>

                        <label className="quotation-field quotation-field--full">
                          <span>Ghi chú sản phẩm</span>
                          <textarea
                            placeholder="Màu sắc, size, biến thể, yêu cầu kiểm hàng..."
                            value={formData.productNote}
                            onChange={(event) =>
                              updateField("productNote", event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="consignment"
                      className="quotation-form-section"
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <h3>
                        <TruckOutlined />
                        Thông tin ký gửi
                      </h3>

                      <div className="quotation-form-grid">
                        <label className="quotation-field">
                          <span>Mã kiện / mã tracking *</span>
                          <input
                            className={errors.packageCode ? "is-error" : ""}
                            type="text"
                            placeholder="Nhập mã kiện"
                            value={formData.packageCode}
                            onChange={(event) =>
                              updateField("packageCode", event.target.value)
                            }
                          />
                          {errors.packageCode && <small>{errors.packageCode}</small>}
                        </label>

                        <label className="quotation-field">
                          <span>Số kiện</span>
                          <input
                            type="number"
                            min="1"
                            value={formData.packageCount}
                            onChange={(event) =>
                              updateField("packageCount", event.target.value)
                            }
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Loại hàng</span>
                          <select
                            value={formData.productType}
                            onChange={(event) =>
                              updateField("productType", event.target.value)
                            }
                          >
                            {PRODUCT_TYPES.map((item) => (
                              <option value={item} key={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="quotation-field">
                          <span>Cân nặng kg *</span>
                          <input
                            className={errors.weight ? "is-error" : ""}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Ví dụ: 5"
                            value={formData.weight}
                            onChange={(event) => updateField("weight", event.target.value)}
                          />
                          {errors.weight && <small>{errors.weight}</small>}
                        </label>

                        <label className="quotation-field">
                          <span>Dài cm</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.length}
                            onChange={(event) => updateField("length", event.target.value)}
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Rộng cm</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.width}
                            onChange={(event) => updateField("width", event.target.value)}
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Cao cm</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.height}
                            onChange={(event) => updateField("height", event.target.value)}
                          />
                        </label>

                        <label className="quotation-field">
                          <span>Giá trị khai báo VNĐ *</span>
                          <input
                            className={errors.declaredValue ? "is-error" : ""}
                            type="number"
                            min="0"
                            placeholder="Nhập giá trị hàng"
                            value={formData.declaredValue}
                            onChange={(event) =>
                              updateField("declaredValue", event.target.value)
                            }
                          />
                          {errors.declaredValue && <small>{errors.declaredValue}</small>}
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="quotation-form-section">
                  <h3>
                    <HomeOutlined />
                    Thông tin khách hàng
                  </h3>

                  <div className="quotation-form-grid">
                    <label className="quotation-field">
                      <span>Họ và tên *</span>
                      <input
                        className={errors.fullName ? "is-error" : ""}
                        type="text"
                        placeholder="Nhập họ tên"
                        value={formData.fullName}
                        onChange={(event) =>
                          updateField("fullName", event.target.value)
                        }
                      />
                      {errors.fullName && <small>{errors.fullName}</small>}
                    </label>

                    <label className="quotation-field">
                      <span>Số điện thoại *</span>
                      <input
                        className={errors.phone ? "is-error" : ""}
                        type="tel"
                        placeholder="Nhập số điện thoại"
                        value={formData.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                      />
                      {errors.phone && <small>{errors.phone}</small>}
                    </label>

                    <label className="quotation-field quotation-field--full">
                      <span>Email</span>
                      <input
                        className={errors.email ? "is-error" : ""}
                        type="email"
                        placeholder="Nhập email nếu có"
                        value={formData.email}
                        onChange={(event) => updateField("email", event.target.value)}
                      />
                      {errors.email && <small>{errors.email}</small>}
                    </label>

                    <label className="quotation-switch quotation-field--full">
                      <input
                        type="checkbox"
                        checked={formData.insurance}
                        onChange={(event) =>
                          updateField("insurance", event.target.checked)
                        }
                      />

                      <span>
                        <SafetyCertificateOutlined />
                      </span>

                      <div>
                        <strong>Đăng ký bảo hiểm hàng hóa</strong>
                        <small>
                          Khuyến nghị cho hàng giá trị cao, hàng dễ vỡ hoặc hàng
                          khó thay thế.
                        </small>
                      </div>
                    </label>

                    <label className="quotation-field quotation-field--full">
                      <span>Ghi chú thêm</span>
                      <textarea
                        placeholder="Yêu cầu tư vấn thêm, thời gian nhận hàng mong muốn..."
                        value={formData.note}
                        onChange={(event) => updateField("note", event.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <button type="submit" className="quotation-submit-btn">
                  Gửi yêu cầu báo giá
                  <SendOutlined />
                </button>
              </motion.form>

              <motion.aside
                className="quotation-summary"
                id="quotation-result"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.16 }}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <div className="quotation-summary__sticky">
                  <div className="quotation-summary-card quotation-summary-card--total">
                    <span className="quotation-summary-card__icon">
                      <DollarOutlined />
                    </span>

                    <small>Chi phí tạm tính</small>
                    <strong>{formatCurrency(quoteResult.total)}</strong>

                    <p>
                      Đây là giá ước tính. Báo giá chính thức có thể thay đổi
                      theo tình trạng hàng, tuyến vận chuyển và phụ phí thực tế.
                    </p>
                  </div>

                  <div className="quotation-summary-card">
                    <h3>Chi tiết chi phí</h3>

                    <div className="quotation-cost-list">
                      <div>
                        <span>Giá trị hàng</span>
                        <strong>{formatCurrency(quoteResult.goodsValue)}</strong>
                      </div>

                      {formData.serviceType === "buyForMe" && (
                        <>
                          <div>
                            <span>Phí mua hộ</span>
                            <strong>
                              {formatCurrency(quoteResult.buyForMeServiceFee)}
                            </strong>
                          </div>

                          <div>
                            <span>Phí nội địa</span>
                            <strong>{formatCurrency(quoteResult.domesticFee)}</strong>
                          </div>
                        </>
                      )}

                      {formData.serviceType === "consignment" && (
                        <div>
                          <span>Phí xử lý ký gửi</span>
                          <strong>
                            {formatCurrency(quoteResult.consignmentServiceFee)}
                          </strong>
                        </div>
                      )}

                      <div>
                        <span>Phí vận chuyển quốc tế</span>
                        <strong>{formatCurrency(quoteResult.freightFee)}</strong>
                      </div>

                      <div>
                        <span>Bảo hiểm</span>
                        <strong>{formatCurrency(quoteResult.insuranceFee)}</strong>
                      </div>

                      <div>
                        <span>Phụ phí xử lý</span>
                        <strong>{formatCurrency(quoteResult.handlingFee)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="quotation-summary-card">
                    <h3>Thông số tính phí</h3>

                    <div className="quotation-info-list">
                      <div>
                        <span>Quốc gia</span>
                        <strong>{currentCountry.label}</strong>
                      </div>

                      <div>
                        <span>Tỷ giá tạm tính</span>
                        <strong>
                          1 {currentCountry.currency} ={" "}
                          {currentCountry.rate.toLocaleString("vi-VN")}đ
                        </strong>
                      </div>

                      <div>
                        <span>Khối lượng tính phí</span>
                        <strong>
                          {quoteResult.chargeableWeight.toFixed(2)} kg
                        </strong>
                      </div>

                      <div>
                        <span>Khối lượng quy đổi</span>
                        <strong>
                          {quoteResult.volumetricWeight.toFixed(2)} kg
                        </strong>
                      </div>
                    </div>
                  </div>

                  {submitted && (
                    <motion.div
                      className="quotation-success"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <CheckCircleOutlined />
                      <div>
                        <strong>Đã ghi nhận yêu cầu báo giá</strong>
                        <span>
                          Nhân viên sẽ kiểm tra thông tin và phản hồi báo giá
                          chính thức.
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div className="quotation-note">
                    <InfoCircleOutlined />
                    <span>
                      Giá tạm tính chưa bao gồm thuế, phí kiểm hóa, phí lưu kho
                      hoặc phụ phí đặc biệt nếu phát sinh.
                    </span>
                  </div>
                </div>
              </motion.aside>
            </div>
          </div>
        </section>

        <section className="quotation-benefits">
          <div className="quotation-container">
            <div className="quotation-benefits__head">
              <span className="quotation-eyebrow">
                <TagsOutlined />
                Lợi ích khi báo giá trước
              </span>
              <h2>Minh bạch chi phí trước khi xác nhận đơn</h2>
            </div>

            <div className="quotation-benefit-grid">
              {[
                {
                  icon: <ClockCircleOutlined />,
                  title: "Chủ động thời gian",
                  text: "Biết trước tuyến vận chuyển và thời gian xử lý dự kiến.",
                },
                {
                  icon: <BankOutlined />,
                  title: "Rõ ràng chi phí",
                  text: "Tách riêng tiền hàng, phí dịch vụ, vận chuyển và bảo hiểm.",
                },
                {
                  icon: <FileProtectOutlined />,
                  title: "Hạn chế rủi ro",
                  text: "Được tư vấn giấy tờ, bảo hiểm và lưu ý trước khi gửi hàng.",
                },
              ].map((item) => (
                <motion.article
                  className="quotation-benefit-card"
                  key={item.title}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <span>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default QuotationPage;