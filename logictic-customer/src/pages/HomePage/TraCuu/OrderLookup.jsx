import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  HomeOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from "@ant-design/icons";

import Header from "../../../layouts/HeaderLayout/Headeer";
import "./OrderLookup.css";

const MOCK_ORDERS = {
  "ORD-2026-0001": {
    orderCode: "ORD-2026-0001",
    serviceType: "Mua hộ",
    status: "IN_TRANSIT",
    statusText: "Đang vận chuyển về Việt Nam",
    customerName: "Nguyễn Văn An",
    route: "Trung Quốc → Việt Nam",
    warehouse: "Kho Quảng Châu",
    receiverAddress: "TP. Hồ Chí Minh, Việt Nam",
    totalWeight: "3.2 kg",
    totalPackages: 2,
    estimatedDelivery: "09/07/2026",
    totalCost: "1.280.000đ",
    createdAt: "01/07/2026 09:30",
    lastUpdated: "06/07/2026 14:20",
    note: "Đơn hàng đang trên tuyến vận chuyển quốc tế. Dự kiến nhập kho Việt Nam trong 2-3 ngày.",
    items: [
      {
        name: "Áo khoác nam",
        quantity: 1,
        price: "420.000đ",
      },
      {
        name: "Giày thể thao",
        quantity: 1,
        price: "690.000đ",
      },
    ],
    timeline: [
      {
        title: "Tạo yêu cầu mua hộ",
        time: "01/07/2026 09:30",
        description: "Khách hàng tạo yêu cầu mua hộ thành công.",
        completed: true,
      },
      {
        title: "Đã báo giá",
        time: "01/07/2026 10:15",
        description: "Sales đã gửi báo giá và chờ khách xác nhận.",
        completed: true,
      },
      {
        title: "Đã đặt mua",
        time: "02/07/2026 08:40",
        description: "Sản phẩm đã được đặt mua từ nhà cung cấp.",
        completed: true,
      },
      {
        title: "Kho quốc tế tiếp nhận",
        time: "04/07/2026 16:10",
        description: "Kiện hàng đã được tiếp nhận tại kho quốc tế.",
        completed: true,
      },
      {
        title: "Đang vận chuyển",
        time: "06/07/2026 14:20",
        description: "Hàng đang trên tuyến vận chuyển về Việt Nam.",
        completed: true,
        active: true,
      },
      {
        title: "Nhập kho Việt Nam",
        time: "Dự kiến",
        description: "Hàng sẽ được nhập kho Việt Nam và chuẩn bị giao.",
        completed: false,
      },
    ],
  },

  "KG-2026-0002": {
    orderCode: "KG-2026-0002",
    serviceType: "Ký gửi",
    status: "VN_WAREHOUSE",
    statusText: "Đã nhập kho Việt Nam",
    customerName: "Trần Minh Khoa",
    route: "Nhật Bản → Việt Nam",
    warehouse: "Kho Việt Nam",
    receiverAddress: "Đà Nẵng, Việt Nam",
    totalWeight: "5.8 kg",
    totalPackages: 1,
    estimatedDelivery: "08/07/2026",
    totalCost: "960.000đ",
    createdAt: "28/06/2026 13:05",
    lastUpdated: "06/07/2026 09:10",
    note: "Kiện hàng đã nhập kho Việt Nam. Nhân viên kho đang chuẩn bị bàn giao cho đơn vị giao hàng.",
    items: [
      {
        name: "Kiện hàng ký gửi",
        quantity: 1,
        price: "Đã khai báo",
      },
    ],
    timeline: [
      {
        title: "Tạo yêu cầu ký gửi",
        time: "28/06/2026 13:05",
        description: "Khách hàng tạo yêu cầu ký gửi thành công.",
        completed: true,
      },
      {
        title: "Kho quốc tế tiếp nhận",
        time: "30/06/2026 11:20",
        description: "Kho quốc tế đã tiếp nhận và kiểm tra kiện hàng.",
        completed: true,
      },
      {
        title: "Đã xuất kho quốc tế",
        time: "02/07/2026 17:00",
        description: "Kiện hàng đã rời kho quốc tế.",
        completed: true,
      },
      {
        title: "Nhập kho Việt Nam",
        time: "06/07/2026 09:10",
        description: "Hàng đã về kho Việt Nam.",
        completed: true,
        active: true,
      },
      {
        title: "Chờ giao hàng",
        time: "Dự kiến",
        description: "Kho Việt Nam chuẩn bị bàn giao cho đơn vị giao hàng.",
        completed: false,
      },
    ],
  },
};

const STATUS_STYLE = {
  IN_TRANSIT: {
    label: "Đang vận chuyển",
    className: "is-transit",
    icon: <TruckOutlined />,
  },
  VN_WAREHOUSE: {
    label: "Đã nhập kho Việt Nam",
    className: "is-warehouse",
    icon: <HomeOutlined />,
  },
  COMPLETED: {
    label: "Hoàn tất",
    className: "is-completed",
    icon: <CheckCircleOutlined />,
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "is-cancelled",
    icon: <CloseCircleOutlined />,
  },
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const OrderLookup = () => {
  const [orderCode, setOrderCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalizedCode = useMemo(() => {
    return orderCode.trim().toUpperCase();
  }, [orderCode]);

  const currentStatus = useMemo(() => {
    if (!orderData?.status) {
      return null;
    }

    return STATUS_STYLE[orderData.status] || STATUS_STYLE.IN_TRANSIT;
  }, [orderData]);

  const handleLookup = (event) => {
    event.preventDefault();

    if (!normalizedCode) {
      setErrorMessage("Vui lòng nhập mã đơn hàng cần tra cứu.");
      setOrderData(null);
      return;
    }

    if (normalizedCode.length < 5) {
      setErrorMessage("Mã đơn hàng chưa hợp lệ.");
      setOrderData(null);
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    setOrderData(null);
    setCopied(false);
    setSearchedCode(normalizedCode);

    window.setTimeout(() => {
      const result = MOCK_ORDERS[normalizedCode];

      if (!result) {
        setErrorMessage(
          "Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hoặc liên hệ bộ phận hỗ trợ.",
        );
        setOrderData(null);
      } else {
        setOrderData(result);
      }

      setIsLoading(false);
    }, 900);
  };

  const resetLookup = () => {
    setOrderCode("");
    setSearchedCode("");
    setOrderData(null);
    setErrorMessage("");
    setIsLoading(false);
    setCopied(false);
  };

  const copyOrderCode = async () => {
    if (!orderData?.orderCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderData.orderCode);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Header />

      <main className="order-lookup-page">
        <section className="order-lookup-hero">
          <div className="order-lookup-hero__bg" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="order-lookup-container order-lookup-hero__inner">
            <motion.div
              className="order-lookup-hero__content"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.55 }}
            >
              <span className="order-lookup-eyebrow">
                <FileSearchOutlined />
                Tra cứu trạng thái đơn hàng
              </span>

              <h1>Theo dõi đơn hàng bằng mã đơn</h1>

              <p>
                Nhập mã đơn hàng để kiểm tra trạng thái xử lý, tuyến vận chuyển,
                kho hiện tại, thời gian cập nhật và lịch sử di chuyển của kiện hàng.
              </p>

              <div className="order-lookup-sample">
                <span>Mã demo:</span>
                <button type="button" onClick={() => setOrderCode("ORD-2026-0001")}>
                  ORD-2026-0001
                </button>
                <button type="button" onClick={() => setOrderCode("KG-2026-0002")}>
                  KG-2026-0002
                </button>
              </div>
            </motion.div>

            <motion.div
              className="order-lookup-search-card"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              <div className="order-lookup-search-card__icon">
                <SearchOutlined />
              </div>

              <h2>Tra cứu nhanh</h2>
              <p>Vui lòng nhập chính xác mã đơn hàng được cung cấp khi tạo yêu cầu.</p>

              <form onSubmit={handleLookup} className="order-lookup-form">
                <label>
                  <span>Mã đơn hàng</span>

                  <div className={errorMessage && !orderData ? "is-error" : ""}>
                    <FileSearchOutlined />
                    <input
                      type="text"
                      placeholder="Ví dụ: ORD-2026-0001"
                      value={orderCode}
                      onChange={(event) => {
                        setOrderCode(event.target.value.toUpperCase());
                        setErrorMessage("");
                      }}
                    />
                  </div>
                </label>

                <button type="submit" disabled={isLoading}>
                  {isLoading ? "Đang tra cứu..." : "Tra cứu đơn hàng"}
                  {isLoading ? <span className="order-lookup-spinner" /> : <ArrowRightOutlined />}
                </button>
              </form>

              <button type="button" className="order-lookup-reset" onClick={resetLookup}>
                <ReloadOutlined />
                Làm mới tra cứu
              </button>
            </motion.div>
          </div>
        </section>

        <section className="order-lookup-result-section">
          <div className="order-lookup-container">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  className="order-lookup-loading"
                  key="loading"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                >
                  <div className="order-lookup-loading__box">
                    <span />
                    <strong>Đang kiểm tra mã đơn hàng</strong>
                    <p>Hệ thống đang truy xuất trạng thái và lịch sử vận chuyển.</p>
                  </div>
                </motion.div>
              )}

              {!isLoading && errorMessage && (
                <motion.div
                  className="order-lookup-error"
                  key="error"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                >
                  <CloseCircleOutlined />
                  <div>
                    <h3>Không thể tra cứu đơn hàng</h3>
                    <p>{errorMessage}</p>
                    {searchedCode && <span>Mã đã nhập: {searchedCode}</span>}
                  </div>
                </motion.div>
              )}

              {!isLoading && orderData && (
                <motion.div
                  className="order-lookup-result"
                  key={orderData.orderCode}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.42 }}
                >
                  <div className="order-lookup-result__top">
                    <div>
                      <span className="order-lookup-result__label">
                        Kết quả tra cứu
                      </span>

                      <h2>{orderData.orderCode}</h2>

                      <p>
                        Cập nhật gần nhất: <strong>{orderData.lastUpdated}</strong>
                      </p>
                    </div>

                    <div className={`order-lookup-status ${currentStatus.className}`}>
                      {currentStatus.icon}
                      <span>{orderData.statusText}</span>
                    </div>
                  </div>

                  <div className="order-lookup-overview-grid">
                    <article>
                      <span>
                        <ShoppingCartOutlined />
                      </span>
                      <small>Loại dịch vụ</small>
                      <strong>{orderData.serviceType}</strong>
                    </article>

                    <article>
                      <span>
                        <GlobalOutlined />
                      </span>
                      <small>Tuyến vận chuyển</small>
                      <strong>{orderData.route}</strong>
                    </article>

                    <article>
                      <span>
                        <InboxOutlined />
                      </span>
                      <small>Số kiện</small>
                      <strong>{orderData.totalPackages} kiện</strong>
                    </article>

                    <article>
                      <span>
                        <TruckOutlined />
                      </span>
                      <small>Khối lượng</small>
                      <strong>{orderData.totalWeight}</strong>
                    </article>
                  </div>

                  <div className="order-lookup-detail-layout">
                    <div className="order-lookup-main-card">
                      <div className="order-lookup-card-head">
                        <span>
                          <ClockCircleOutlined />
                        </span>
                        <div>
                          <h3>Lịch sử xử lý đơn hàng</h3>
                          <p>Theo dõi từng mốc trạng thái của đơn hàng.</p>
                        </div>
                      </div>

                      <div className="order-lookup-timeline">
                        {orderData.timeline.map((item, index) => (
                          <div
                            className={`order-lookup-timeline-item ${
                              item.completed ? "is-completed" : ""
                            } ${item.active ? "is-active" : ""}`}
                            key={`${item.title}-${index}`}
                          >
                            <div className="order-lookup-timeline-item__dot">
                              {item.completed ? <CheckCircleOutlined /> : index + 1}
                            </div>

                            <div className="order-lookup-timeline-item__content">
                              <div>
                                <h4>{item.title}</h4>
                                <time>{item.time}</time>
                              </div>

                              <p>{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <aside className="order-lookup-side">
                      <div className="order-lookup-info-card">
                        <div className="order-lookup-card-head">
                          <span>
                            <InfoCircleOutlined />
                          </span>
                          <div>
                            <h3>Thông tin đơn hàng</h3>
                            <p>Thông tin tổng quan của đơn.</p>
                          </div>
                        </div>

                        <div className="order-lookup-info-list">
                          <div>
                            <span>Khách hàng</span>
                            <strong>{orderData.customerName}</strong>
                          </div>

                          <div>
                            <span>Kho hiện tại</span>
                            <strong>{orderData.warehouse}</strong>
                          </div>

                          <div>
                            <span>Địa chỉ nhận</span>
                            <strong>{orderData.receiverAddress}</strong>
                          </div>

                          <div>
                            <span>Dự kiến giao</span>
                            <strong>{orderData.estimatedDelivery}</strong>
                          </div>

                          <div>
                            <span>Tổng chi phí</span>
                            <strong>{orderData.totalCost}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="order-lookup-copy-btn"
                          onClick={copyOrderCode}
                        >
                          <CopyOutlined />
                          {copied ? "Đã copy mã đơn" : "Copy mã đơn hàng"}
                        </button>
                      </div>

                      <div className="order-lookup-info-card">
                        <div className="order-lookup-card-head">
                          <span>
                            <InboxOutlined />
                          </span>
                          <div>
                            <h3>Hàng hóa</h3>
                            <p>Danh sách sản phẩm / kiện hàng.</p>
                          </div>
                        </div>

                        <div className="order-lookup-items">
                          {orderData.items.map((item, index) => (
                            <div key={`${item.name}-${index}`}>
                              <strong>{item.name}</strong>
                              <span>
                                SL: {item.quantity} · {item.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="order-lookup-note-card">
                        <SafetyCertificateOutlined />
                        <p>{orderData.note}</p>
                      </div>
                    </aside>
                  </div>
                </motion.div>
              )}

              {!isLoading && !orderData && !errorMessage && (
                <motion.div
                  className="order-lookup-empty"
                  key="empty"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                >
                  <FileSearchOutlined />
                  <h3>Nhập mã đơn hàng để bắt đầu tra cứu</h3>
                  <p>
                    Mã đơn thường có dạng <strong>ORD-2026-0001</strong> hoặc{" "}
                    <strong>KG-2026-0002</strong>.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="order-lookup-support-section">
          <div className="order-lookup-container">
            <div className="order-lookup-support-card">
              <div>
                <span>
                  <CustomerServiceOutlined />
                </span>
                <h2>Không tìm thấy mã đơn hàng?</h2>
                <p>
                  Kiểm tra lại mã đơn trong email, tin nhắn thông báo hoặc liên hệ
                  bộ phận hỗ trợ để được kiểm tra thủ công.
                </p>
              </div>

              <button type="button">
                Liên hệ hỗ trợ
                <ArrowRightOutlined />
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default OrderLookup;