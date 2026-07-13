import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  CustomerServiceOutlined,
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
import AuthNotify from "../../../utils/AuthNotify";

import {
  apiToUtcIso,
  formatVietnamDateTime,
} from "../../../utils/timeUtc";

import {
  getPublicParcelTrackingApi,
} from "../../../api/ServiceApi/publicParcelTrackingApi";

import "./OrderLookup.css";

/* =========================================================
   STATUS
   ========================================================= */

const STATUS_STYLE = {
  PENDING_REVIEW: {
    className: "is-transit",
    icon: <ClockCircleOutlined />,
  },
  PENDING: {
    className: "is-transit",
    icon: <ClockCircleOutlined />,
  },
  QUOTATION_SENT: {
    className: "is-transit",
    icon: <ClockCircleOutlined />,
  },
  APPROVED: {
    className: "is-transit",
    icon: <CheckCircleOutlined />,
  },
  IN_TRANSIT: {
    className: "is-transit",
    icon: <TruckOutlined />,
  },
  INTERNATIONAL_WAREHOUSE: {
    className: "is-warehouse",
    icon: <GlobalOutlined />,
  },
  VN_WAREHOUSE: {
    className: "is-warehouse",
    icon: <HomeOutlined />,
  },
  VIETNAM_WAREHOUSE: {
    className: "is-warehouse",
    icon: <HomeOutlined />,
  },
  DELIVERED: {
    className: "is-completed",
    icon: <CheckCircleOutlined />,
  },
  COMPLETED: {
    className: "is-completed",
    icon: <CheckCircleOutlined />,
  },
  CANCELLED: {
    className: "is-cancelled",
    icon: <CloseCircleOutlined />,
  },
  CANCELED: {
    className: "is-cancelled",
    icon: <CloseCircleOutlined />,
  },
  REJECTED: {
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

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeStatus = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
};

const formatStatusCode = (value) => {
  const status = normalizeStatus(value);

  if (!status) {
    return "Chưa cập nhật";
  }

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /(^|\s)\S/g,
      (character) =>
        character.toUpperCase()
    );
};

const formatRoute = (route) => {
  const value = String(route ?? "").trim();

  if (!value) {
    return "Chưa cập nhật";
  }

  return value
    .replace(/\s*-\s*/g, " → ")
    .replace(/\s*_\s*/g, " → ");
};

const normalizeApiTimeToUtc = (value) => {
  return apiToUtcIso(value, {
    apiTimeMode: "utc",
  });
};

const formatDateTime = (value) => {
  const utcIso =
    normalizeApiTimeToUtc(value);

  if (!utcIso) {
    return "Chưa cập nhật";
  }

  return formatVietnamDateTime(
    utcIso,
    {
      apiTimeMode: "utc",
      fallback: "Chưa cập nhật",
    }
  );
};

const unwrapTrackingData = (result) => {
  return (
    result?.data?.data ??
    result?.data ??
    result ??
    null
  );
};

const normalizeParcel = (
  parcel,
  index
) => {
  const parcelCode =
    parcel?.parcelCode ||
    parcel?.trackingCode ||
    parcel?.domesticTrackingCode ||
    parcel?.code ||
    parcel?.id ||
    `Kiện ${index + 1}`;

  const status =
    parcel?.status ||
    parcel?.parcelStatus ||
    "";

  const statusLabel =
    parcel?.statusLabel ||
    parcel?.statusName ||
    formatStatusCode(status);

  const weightValue =
    parcel?.weight ??
    parcel?.totalWeight ??
    parcel?.actualWeight;

  const weight = Number(weightValue);

  return {
    ...parcel,
    parcelCode: String(
      parcelCode
    ).trim(),
    status,
    statusLabel,
    weight:
      Number.isFinite(weight)
        ? `${weight.toLocaleString(
            "vi-VN",
            {
              maximumFractionDigits: 3,
            }
          )} kg`
        : "",
    updatedAt:
      parcel?.updatedAt ||
      parcel?.lastUpdated ||
      parcel?.createdAt ||
      "",
  };
};

const extractHistory = (data) => {
  const candidates = [
    data?.timeline,
    data?.trackingHistory,
    data?.statusHistory,
    data?.histories,
    data?.events,
  ];

  const rawHistory =
    candidates.find(Array.isArray) ||
    [];

  return rawHistory.map(
    (item, index) => ({
      title:
        item?.title ||
        item?.statusLabel ||
        item?.statusName ||
        formatStatusCode(
          item?.status
        ) ||
        `Cập nhật ${index + 1}`,
      time: formatDateTime(
        item?.time ||
          item?.updatedAt ||
          item?.createdAt
      ),
      description:
        item?.description ||
        item?.note ||
        item?.message ||
        "Trạng thái được cập nhật từ hệ thống.",
      completed:
        item?.completed !== false,
      active:
        Boolean(item?.active) ||
        index ===
          rawHistory.length - 1,
    })
  );
};

const normalizeTrackingResult = (
  result
) => {
  const data =
    unwrapTrackingData(result);

  if (!data) {
    throw new Error(
      "Hệ thống không trả về dữ liệu vận đơn."
    );
  }

  const consignmentCode =
    String(
      data.consignmentCode ||
        data.trackingCode ||
        data.code ||
        ""
    ).trim();

  if (!consignmentCode) {
    throw new Error(
      "Dữ liệu tra cứu không có mã vận đơn."
    );
  }

  const status =
    normalizeStatus(data.status);

  const statusLabel =
    String(
      data.statusLabel ||
        data.statusName ||
        formatStatusCode(status)
    ).trim();

  const parcels = Array.isArray(
    data.parcels
  )
    ? data.parcels.map(
        normalizeParcel
      )
    : [];

  const apiHistory =
    extractHistory(data);

  const timeline =
    apiHistory.length > 0
      ? apiHistory
      : [
          {
            title:
              statusLabel ||
              "Trạng thái hiện tại",
            time: formatDateTime(
              data.updatedAt ||
                data.createdAt
            ),
            description:
              "Đây là trạng thái mới nhất được trả về từ hệ thống tra cứu vận đơn.",
            completed: true,
            active: true,
          },
        ];

  const itemCountNumber =
    Number(data.itemCount);

  return {
    raw: data,
    orderCode: consignmentCode,
    consignmentCode,
    consignmentType:
      data.consignmentType ||
      "Chưa cập nhật",
    route: formatRoute(data.route),
    status,
    statusText:
      statusLabel ||
      "Chưa cập nhật",
    receiverName:
      data.receiverName ||
      "Chưa cập nhật",
    itemCount:
      Number.isFinite(
        itemCountNumber
      )
        ? itemCountNumber
        : 0,
    totalPackages:
      parcels.length,
    createdAt:
      formatDateTime(
        data.createdAt
      ),
    lastUpdated:
      formatDateTime(
        data.updatedAt ||
          data.lastUpdated ||
          data.createdAt
      ),
    parcels,
    timeline,
    note:
      `Trạng thái hiện tại: ${
        statusLabel ||
        "Chưa cập nhật"
      }. Dữ liệu được lấy trực tiếp từ hệ thống tra cứu vận đơn.`,
  };
};

const copyTextToClipboard =
  async (text) => {
    const value =
      String(text ?? "").trim();

    if (!value) {
      return;
    }

    if (
      navigator.clipboard?.writeText &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        value
      );
      return;
    }

    const textArea =
      document.createElement(
        "textarea"
      );

    textArea.value = value;
    textArea.setAttribute(
      "readonly",
      ""
    );
    textArea.style.position =
      "fixed";
    textArea.style.top =
      "-9999px";
    textArea.style.opacity = "0";

    document.body.appendChild(
      textArea
    );
    textArea.select();

    const copied =
      document.execCommand("copy");

    document.body.removeChild(
      textArea
    );

    if (!copied) {
      throw new Error(
        "Không thể sao chép mã vận đơn."
      );
    }
  };

/* =========================================================
   COMPONENT
   ========================================================= */

const OrderLookup = () => {
  const [
    orderCode,
    setOrderCode,
  ] = useState("");

  const [
    searchedCode,
    setSearchedCode,
  ] = useState("");

  const [
    orderData,
    setOrderData,
  ] = useState(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [copied, setCopied] =
    useState(false);

  const lookupAbortRef =
    useRef(null);

  const copyTimerRef =
    useRef(null);

  const normalizedCode =
    useMemo(() => {
      return orderCode
        .trim()
        .toUpperCase();
    }, [orderCode]);

  const currentStatus =
    useMemo(() => {
      if (!orderData?.status) {
        return {
          className:
            "is-transit",
          icon: (
            <ClockCircleOutlined />
          ),
        };
      }

      return (
        STATUS_STYLE[
          orderData.status
        ] || {
          className:
            "is-transit",
          icon: (
            <ClockCircleOutlined />
          ),
        }
      );
    }, [orderData]);

  useEffect(
    () => () => {
      lookupAbortRef.current?.abort();

      if (copyTimerRef.current) {
        window.clearTimeout(
          copyTimerRef.current
        );
      }
    },
    []
  );

  const handleLookup = async (
    event
  ) => {
    event.preventDefault();

    if (!normalizedCode) {
      const message =
        "Vui lòng nhập mã vận đơn cần tra cứu.";

      setErrorMessage(message);
      setOrderData(null);

      AuthNotify.warning(
        "Thiếu mã vận đơn",
        message
      );

      return;
    }

    if (
      normalizedCode.length < 5
    ) {
      const message =
        "Mã vận đơn chưa hợp lệ.";

      setErrorMessage(message);
      setOrderData(null);

      AuthNotify.warning(
        "Mã vận đơn không hợp lệ",
        message
      );

      return;
    }

    lookupAbortRef.current?.abort();

    const controller =
      new AbortController();

    lookupAbortRef.current =
      controller;

    setErrorMessage("");
    setIsLoading(true);
    setOrderData(null);
    setCopied(false);
    setSearchedCode(
      normalizedCode
    );

    try {
      const result =
        await getPublicParcelTrackingApi(
          normalizedCode,
          {
            signal:
              controller.signal,
          }
        );

      if (
        controller.signal.aborted
      ) {
        return;
      }

      const normalizedResult =
        normalizeTrackingResult(
          result
        );

      setOrderData(
        normalizedResult
      );

      AuthNotify.success(
        "Tra cứu thành công",
        `Đã tìm thấy vận đơn ${normalizedResult.orderCode}.`
      );
    } catch (error) {
      if (
        error?.code ===
          "ERR_CANCELED" ||
        error?.name ===
          "CanceledError" ||
        error?.name ===
          "AbortError"
      ) {
        return;
      }

      const message =
        error?.message ||
        "Không tìm thấy vận đơn. Vui lòng kiểm tra lại mã vận đơn.";

      setOrderData(null);
      setErrorMessage(message);

      AuthNotify.error(
        "Tra cứu thất bại",
        message
      );
    } finally {
      if (
        !controller.signal.aborted
      ) {
        setIsLoading(false);
      }

      if (
        lookupAbortRef.current ===
        controller
      ) {
        lookupAbortRef.current =
          null;
      }
    }
  };

  const resetLookup = () => {
    lookupAbortRef.current?.abort();

    setOrderCode("");
    setSearchedCode("");
    setOrderData(null);
    setErrorMessage("");
    setIsLoading(false);
    setCopied(false);
  };

  const copyOrderCode =
    async () => {
      if (!orderData?.orderCode) {
        AuthNotify.warning(
          "Chưa có mã vận đơn",
          "Không có mã vận đơn để sao chép."
        );

        return;
      }

      try {
        await copyTextToClipboard(
          orderData.orderCode
        );

        setCopied(true);

        AuthNotify.success(
          "Sao chép thành công",
          `Đã sao chép mã vận đơn ${orderData.orderCode}.`
        );

        if (
          copyTimerRef.current
        ) {
          window.clearTimeout(
            copyTimerRef.current
          );
        }

        copyTimerRef.current =
          window.setTimeout(() => {
            setCopied(false);
          }, 1400);
      } catch (error) {
        setCopied(false);

        AuthNotify.error(
          "Sao chép thất bại",
          error?.message ||
            "Không thể sao chép mã vận đơn."
        );
      }
    };

  return (
    <>
      <Header />

      <main className="order-lookup-page">
        <section className="order-lookup-hero">
          <div
            className="order-lookup-hero__bg"
            aria-hidden="true"
          >
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
              transition={{
                duration: 0.55,
              }}
            >
              <span className="order-lookup-eyebrow">
                <FileSearchOutlined />
                Tra cứu trạng thái vận đơn
              </span>

              <h1>
                Theo dõi kiện hàng bằng
                mã vận đơn
              </h1>

              <p>
                Nhập mã vận đơn để kiểm tra trạng thái,
                loại vận chuyển, tuyến vận chuyển, người
                nhận và danh sách kiện hàng hiện tại.
              </p>

              <div className="order-lookup-sample">
                <span>Mã mẫu:</span>

                <button
                  type="button"
                  onClick={() =>
                    setOrderCode(
                      "VCL-20260712105447-295605"
                    )
                  }
                >
                  VCL-20260712105447-295605
                </button>
              </div>
            </motion.div>

            <motion.div
              className="order-lookup-search-card"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.55,
                delay: 0.12,
              }}
            >
              <div className="order-lookup-search-card__icon">
                <SearchOutlined />
              </div>

              <h2>Tra cứu nhanh</h2>

              <p>
                Vui lòng nhập chính xác mã vận đơn
                được hệ thống cung cấp.
              </p>

              <form
                onSubmit={handleLookup}
                className="order-lookup-form"
              >
                <label>
                  <span>Mã vận đơn</span>

                  <div
                    className={
                      errorMessage &&
                      !orderData
                        ? "is-error"
                        : ""
                    }
                  >
                    <FileSearchOutlined />

                    <input
                      type="text"
                      placeholder="Ví dụ: VCL-20260712105447-295605"
                      value={orderCode}
                      autoComplete="off"
                      onChange={(
                        event
                      ) => {
                        setOrderCode(
                          event.target.value.toUpperCase()
                        );
                        setErrorMessage(
                          ""
                        );
                      }}
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Đang tra cứu..."
                    : "Tra cứu vận đơn"}

                  {isLoading ? (
                    <span className="order-lookup-spinner" />
                  ) : (
                    <ArrowRightOutlined />
                  )}
                </button>
              </form>

              <button
                type="button"
                className="order-lookup-reset"
                onClick={
                  resetLookup
                }
              >
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
                  initial={{
                    opacity: 0,
                    y: 18,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -18,
                  }}
                >
                  <div className="order-lookup-loading__box">
                    <span />

                    <strong>
                      Đang kiểm tra mã
                      vận đơn
                    </strong>

                    <p>
                      Hệ thống đang truy xuất
                      trạng thái kiện hàng.
                    </p>
                  </div>
                </motion.div>
              )}

              {!isLoading &&
                errorMessage && (
                  <motion.div
                    className="order-lookup-error"
                    key="error"
                    initial={{
                      opacity: 0,
                      y: 18,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -18,
                    }}
                  >
                    <CloseCircleOutlined />

                    <div>
                      <h3>
                        Không thể tra cứu
                        vận đơn
                      </h3>

                      <p>
                        {errorMessage}
                      </p>

                      {searchedCode && (
                        <span>
                          Mã đã nhập:{" "}
                          {searchedCode}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

              {!isLoading &&
                orderData && (
                  <motion.div
                    className="order-lookup-result"
                    key={
                      orderData.orderCode
                    }
                    initial={{
                      opacity: 0,
                      y: 24,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -24,
                    }}
                    transition={{
                      duration: 0.42,
                    }}
                  >
                    <div className="order-lookup-result__top">
                      <div>
                        <span className="order-lookup-result__label">
                          Kết quả tra cứu
                        </span>

                        <h2>
                          {
                            orderData.orderCode
                          }
                        </h2>

                        <p>
                          Cập nhật gần nhất:{" "}
                          <strong>
                            {
                              orderData.lastUpdated
                            }
                          </strong>
                        </p>
                      </div>

                      <div
                        className={`order-lookup-status ${currentStatus.className}`}
                      >
                        {
                          currentStatus.icon
                        }

                        <span>
                          {
                            orderData.statusText
                          }
                        </span>
                      </div>
                    </div>

                    <div className="order-lookup-overview-grid">
                      <article>
                        <span>
                          <ShoppingCartOutlined />
                        </span>

                        <small>
                          Loại vận chuyển
                        </small>

                        <strong>
                          {
                            orderData.consignmentType
                          }
                        </strong>
                      </article>

                      <article>
                        <span>
                          <GlobalOutlined />
                        </span>

                        <small>
                          Tuyến vận chuyển
                        </small>

                        <strong>
                          {
                            orderData.route
                          }
                        </strong>
                      </article>

                      <article>
                        <span>
                          <ShoppingCartOutlined />
                        </span>

                        <small>
                          Số sản phẩm
                        </small>

                        <strong>
                          {
                            orderData.itemCount
                          }{" "}
                          sản phẩm
                        </strong>
                      </article>

                      <article>
                        <span>
                          <InboxOutlined />
                        </span>

                        <small>
                          Số kiện
                        </small>

                        <strong>
                          {
                            orderData.totalPackages
                          }{" "}
                          kiện
                        </strong>
                      </article>
                    </div>

                    <div className="order-lookup-detail-layout">
                      <div className="order-lookup-main-card">
                        <div className="order-lookup-card-head">
                          <span>
                            <ClockCircleOutlined />
                          </span>

                          <div>
                            <h3>
                              Lịch sử xử lý
                              vận đơn
                            </h3>

                            <p>
                              Theo dõi các mốc trạng
                              thái được hệ thống trả về.
                            </p>
                          </div>
                        </div>

                        <div className="order-lookup-timeline">
                          {orderData.timeline.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                className={`order-lookup-timeline-item ${
                                  item.completed
                                    ? "is-completed"
                                    : ""
                                } ${
                                  item.active
                                    ? "is-active"
                                    : ""
                                }`}
                                key={`${item.title}-${index}`}
                              >
                                <div className="order-lookup-timeline-item__dot">
                                  {item.completed ? (
                                    <CheckCircleOutlined />
                                  ) : (
                                    index +
                                    1
                                  )}
                                </div>

                                <div className="order-lookup-timeline-item__content">
                                  <div>
                                    <h4>
                                      {
                                        item.title
                                      }
                                    </h4>

                                    <time>
                                      {
                                        item.time
                                      }
                                    </time>
                                  </div>

                                  <p>
                                    {
                                      item.description
                                    }
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <aside className="order-lookup-side">
                        <div className="order-lookup-info-card">
                          <div className="order-lookup-card-head">
                            <span>
                              <InfoCircleOutlined />
                            </span>

                            <div>
                              <h3>
                                Thông tin vận đơn
                              </h3>

                              <p>
                                Thông tin tổng quan của vận đơn.
                              </p>
                            </div>
                          </div>

                          <div className="order-lookup-info-list">
                            <div>
                              <span>
                                Người nhận
                              </span>

                              <strong>
                                {
                                  orderData.receiverName
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Trạng thái
                              </span>

                              <strong>
                                {
                                  orderData.statusText
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Loại vận chuyển
                              </span>

                              <strong>
                                {
                                  orderData.consignmentType
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Tuyến
                              </span>

                              <strong>
                                {
                                  orderData.route
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Ngày tạo
                              </span>

                              <strong>
                                {
                                  orderData.createdAt
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Số sản phẩm
                              </span>

                              <strong>
                                {
                                  orderData.itemCount
                                }{" "}
                                sản phẩm
                              </strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="order-lookup-copy-btn"
                            onClick={
                              copyOrderCode
                            }
                          >
                            <CopyOutlined />

                            {copied
                              ? "Đã copy mã vận đơn"
                              : "Copy mã vận đơn"}
                          </button>
                        </div>

                        <div className="order-lookup-info-card">
                          <div className="order-lookup-card-head">
                            <span>
                              <InboxOutlined />
                            </span>

                            <div>
                              <h3>
                                Danh sách kiện hàng
                              </h3>

                              <p>
                                Thông tin các kiện hàng thuộc vận đơn.
                              </p>
                            </div>
                          </div>

                          <div className="order-lookup-items">
                            {orderData.parcels.length >
                            0 ? (
                              orderData.parcels.map(
                                (
                                  parcel,
                                  index
                                ) => (
                                  <div
                                    key={`${parcel.parcelCode}-${index}`}
                                  >
                                    <strong>
                                      {
                                        parcel.parcelCode
                                      }
                                    </strong>

                                    <span>
                                      {
                                        parcel.statusLabel
                                      }
                                      {parcel.weight
                                        ? ` · ${parcel.weight}`
                                        : ""}
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <div>
                                <strong>
                                  Chưa có kiện hàng
                                </strong>

                                <span>
                                  Hiện chưa có kiện hàng nào
                                  được cập nhật.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="order-lookup-note-card">
                          <SafetyCertificateOutlined />

                          <p>
                            {
                              orderData.note
                            }
                          </p>
                        </div>
                      </aside>
                    </div>
                  </motion.div>
                )}

              {!isLoading &&
                !orderData &&
                !errorMessage && (
                  <motion.div
                    className="order-lookup-empty"
                    key="empty"
                    initial={{
                      opacity: 0,
                      y: 18,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -18,
                    }}
                  >
                    <FileSearchOutlined />

                    <h3>
                      Nhập mã vận đơn để
                      bắt đầu tra cứu
                    </h3>

                    <p>
                      Mã vận đơn có dạng{" "}
                      <strong>
                        VCL-20260712105447-295605
                      </strong>
                      .
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

                <h2>
                  Không tìm thấy mã vận đơn?
                </h2>

                <p>
                  Kiểm tra lại mã trong thông báo
                  hoặc liên hệ bộ phận hỗ trợ để
                  được kiểm tra thủ công.
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
